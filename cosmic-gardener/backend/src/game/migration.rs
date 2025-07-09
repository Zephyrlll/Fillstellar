use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use tracing::{info, warn, error};

use crate::errors::GameError;
use crate::game::persistence::{GameStateSnapshot, PersistenceManager};
use crate::game::resources::Resources;
use crate::game::celestial_bodies::{CelestialBody, BodyId};

/// マイグレーションのバージョン
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct MigrationVersion(pub u32);

/// マイグレーションエラー
#[derive(Debug, thiserror::Error)]
pub enum MigrationError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Version mismatch: expected {expected}, found {found}")]
    VersionMismatch { expected: u32, found: u32 },
    
    #[error("Data corruption detected: {0}")]
    DataCorruption(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("Migration already applied: {0}")]
    AlreadyApplied(u32),
    
    #[error("Migration not found: {0}")]
    NotFound(u32),
}

/// マイグレーション定義
#[derive(Debug, Clone)]
pub struct Migration {
    pub version: MigrationVersion,
    pub description: String,
    pub up_sql: Vec<String>,
    pub down_sql: Vec<String>,
    pub data_migration: Option<Box<dyn Fn(&PgPool) -> Result<(), MigrationError> + Send + Sync>>,
}

/// 古いゲーム状態フォーマット（V1）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateV1 {
    pub player_id: Uuid,
    pub resources: Resources,
    pub bodies: HashMap<BodyId, CelestialBody>,
    pub timestamp: DateTime<Utc>,
}

/// 現在のゲーム状態フォーマット（V2）
pub type GameStateV2 = GameStateSnapshot;

/// データマイグレーション関数
pub struct DataMigration;

impl DataMigration {
    /// V1からV2への移行
    pub async fn migrate_v1_to_v2(pool: &PgPool) -> Result<(), MigrationError> {
        info!("Starting migration from V1 to V2");
        
        // 既存のgame_savesテーブルからデータを読み取り
        let rows = sqlx::query(r#"
            SELECT player_id, save_data, created_at 
            FROM game_saves 
            WHERE version = 1
        "#)
        .fetch_all(pool)
        .await?;
        
        let mut migrated_count = 0;
        let mut error_count = 0;
        
        for row in rows {
            let player_id: Uuid = row.get("player_id");
            let save_data: serde_json::Value = row.get("save_data");
            let created_at: DateTime<Utc> = row.get("created_at");
            
            match Self::convert_v1_to_v2(player_id, save_data, created_at) {
                Ok(v2_snapshot) => {
                    // 新しいフォーマットで保存
                    if let Err(e) = Self::save_v2_snapshot(pool, &v2_snapshot).await {
                        error!("Failed to save migrated data for player {}: {}", player_id, e);
                        error_count += 1;
                    } else {
                        migrated_count += 1;
                    }
                }
                Err(e) => {
                    error!("Failed to convert data for player {}: {}", player_id, e);
                    error_count += 1;
                }
            }
        }
        
        info!("Migration completed: {} migrated, {} errors", migrated_count, error_count);
        
        if error_count > 0 {
            warn!("Migration completed with {} errors", error_count);
        }
        
        Ok(())
    }
    
    /// V1データをV2フォーマットに変換
    fn convert_v1_to_v2(
        player_id: Uuid,
        save_data: serde_json::Value,
        timestamp: DateTime<Utc>
    ) -> Result<GameStateV2, MigrationError> {
        // V1データをパース
        let v1_state: GameStateV1 = serde_json::from_value(save_data)
            .map_err(|e| MigrationError::Serialization(e.to_string()))?;
        
        // V2フォーマットに変換
        let v2_snapshot = GameStateV2 {
            version: 2,
            player_id,
            timestamp,
            tick: 0, // V1にはtick情報がないため0で初期化
            resources: v1_state.resources,
            production_rates: crate::game::resources::ProductionRates::default(),
            accumulators: crate::game::resources::ResourceAccumulators::default(),
            upgrade_levels: crate::game::resources::UpgradeLevels::default(),
            bodies: v1_state.bodies,
            physics_state: crate::game::physics::PhysicsState::new(),
            checksum: 0, // 後で計算
        };
        
        Ok(v2_snapshot)
    }
    
    /// V2スナップショットを保存
    async fn save_v2_snapshot(pool: &PgPool, snapshot: &GameStateV2) -> Result<(), MigrationError> {
        let compressed = crate::game::persistence::CompressedData::compress(
            snapshot,
            crate::game::persistence::CompressionType::Zstd,
            crate::game::persistence::SerializationFormat::MessagePack,
        ).map_err(|e| MigrationError::Serialization(e.to_string()))?;
        
        sqlx::query(r#"
            INSERT INTO game_snapshots (
                player_id, tick, version, timestamp, 
                data, compression_type, serialization_format,
                original_size, compressed_size, checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (player_id, tick) DO NOTHING
        "#)
        .bind(snapshot.player_id)
        .bind(snapshot.tick as i64)
        .bind(snapshot.version as i32)
        .bind(snapshot.timestamp)
        .bind(compressed.data)
        .bind(serde_json::to_string(&compressed.compression_type).unwrap())
        .bind(serde_json::to_string(&compressed.serialization_format).unwrap())
        .bind(compressed.original_size as i32)
        .bind(compressed.compressed_size as i32)
        .bind(snapshot.checksum as i64)
        .execute(pool)
        .await?;
        
        Ok(())
    }
    
    /// 天体データの移行
    pub async fn migrate_celestial_bodies(pool: &PgPool) -> Result<(), MigrationError> {
        info!("Migrating celestial bodies data");
        
        // 最新のスナップショットから天体データを抽出
        let snapshots = sqlx::query(r#"
            SELECT DISTINCT ON (player_id) player_id, data, compression_type, serialization_format
            FROM game_snapshots
            ORDER BY player_id, tick DESC
        "#)
        .fetch_all(pool)
        .await?;
        
        for row in snapshots {
            let player_id: Uuid = row.get("player_id");
            let data: Vec<u8> = row.get("data");
            let compression_type: String = row.get("compression_type");
            let serialization_format: String = row.get("serialization_format");
            
            let compressed = crate::game::persistence::CompressedData {
                data,
                compression_type: serde_json::from_str(&compression_type).unwrap(),
                serialization_format: serde_json::from_str(&serialization_format).unwrap(),
                original_size: 0,
                compressed_size: 0,
            };
            
            match compressed.decompress::<GameStateV2>() {
                Ok(snapshot) => {
                    if let Err(e) = Self::save_celestial_bodies(pool, player_id, &snapshot.bodies).await {
                        warn!("Failed to save celestial bodies for player {}: {}", player_id, e);
                    }
                }
                Err(e) => {
                    warn!("Failed to decompress snapshot for player {}: {}", player_id, e);
                }
            }
        }
        
        Ok(())
    }
    
    /// 天体データの保存
    async fn save_celestial_bodies(
        pool: &PgPool,
        player_id: Uuid,
        bodies: &HashMap<BodyId, CelestialBody>
    ) -> Result<(), MigrationError> {
        // 既存のデータを削除
        sqlx::query("DELETE FROM celestial_bodies WHERE player_id = $1")
            .bind(player_id)
            .execute(pool)
            .await?;
        
        // 新しいデータを挿入
        for (id, body) in bodies {
            sqlx::query(r#"
                INSERT INTO celestial_bodies (
                    id, player_id, body_type,
                    position_x, position_y, position_z,
                    velocity_x, velocity_y, velocity_z,
                    mass, radius, created_at, last_updated
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#)
            .bind(id)
            .bind(player_id)
            .bind(format!("{:?}", body.body_type))
            .bind(body.physics.position.x)
            .bind(body.physics.position.y)
            .bind(body.physics.position.z)
            .bind(body.physics.velocity.x)
            .bind(body.physics.velocity.y)
            .bind(body.physics.velocity.z)
            .bind(body.physics.mass)
            .bind(body.physics.radius)
            .bind(body.created_at)
            .bind(body.last_updated)
            .execute(pool)
            .await?;
        }
        
        Ok(())
    }
    
    /// データ整合性チェック
    pub async fn verify_data_integrity(pool: &PgPool) -> Result<(), MigrationError> {
        info!("Verifying data integrity");
        
        // チェックサムの検証
        let invalid_checksums = sqlx::query(r#"
            SELECT player_id, tick, checksum
            FROM game_snapshots
            WHERE checksum = 0 OR checksum IS NULL
        "#)
        .fetch_all(pool)
        .await?;
        
        if !invalid_checksums.is_empty() {
            warn!("Found {} snapshots with invalid checksums", invalid_checksums.len());
            
            for row in invalid_checksums {
                let player_id: Uuid = row.get("player_id");
                let tick: i64 = row.get("tick");
                warn!("Invalid checksum for player {} at tick {}", player_id, tick);
            }
        }
        
        // 孤立した天体データの検出
        let orphaned_bodies = sqlx::query(r#"
            SELECT cb.id, cb.player_id
            FROM celestial_bodies cb
            LEFT JOIN game_snapshots gs ON cb.player_id = gs.player_id
            WHERE gs.player_id IS NULL
        "#)
        .fetch_all(pool)
        .await?;
        
        if !orphaned_bodies.is_empty() {
            warn!("Found {} orphaned celestial bodies", orphaned_bodies.len());
            
            // 孤立した天体を削除
            sqlx::query(r#"
                DELETE FROM celestial_bodies
                WHERE player_id NOT IN (SELECT DISTINCT player_id FROM game_snapshots)
            "#)
            .execute(pool)
            .await?;
        }
        
        // 重複データの検出
        let duplicates = sqlx::query(r#"
            SELECT player_id, tick, COUNT(*) as count
            FROM game_snapshots
            GROUP BY player_id, tick
            HAVING COUNT(*) > 1
        "#)
        .fetch_all(pool)
        .await?;
        
        if !duplicates.is_empty() {
            warn!("Found {} duplicate snapshots", duplicates.len());
            
            // 重複を削除（最新のものを保持）
            sqlx::query(r#"
                DELETE FROM game_snapshots
                WHERE id NOT IN (
                    SELECT DISTINCT ON (player_id, tick) id
                    FROM game_snapshots
                    ORDER BY player_id, tick, timestamp DESC
                )
            "#)
            .execute(pool)
            .await?;
        }
        
        info!("Data integrity verification completed");
        Ok(())
    }
    
    /// 統計データの再計算
    pub async fn recalculate_statistics(pool: &PgPool) -> Result<(), MigrationError> {
        info!("Recalculating player statistics");
        
        // 全プレイヤーの統計を再計算
        let players = sqlx::query(r#"
            SELECT DISTINCT player_id FROM game_snapshots
        "#)
        .fetch_all(pool)
        .await?;
        
        for row in players {
            let player_id: Uuid = row.get("player_id");
            
            // 天体作成統計
            let body_stats = sqlx::query(r#"
                SELECT 
                    body_type,
                    COUNT(*) as count
                FROM celestial_bodies
                WHERE player_id = $1
                GROUP BY body_type
            "#)
            .bind(player_id)
            .fetch_all(pool)
            .await?;
            
            let mut asteroids = 0;
            let mut comets = 0;
            let mut moons = 0;
            let mut dwarf_planets = 0;
            let mut planets = 0;
            let mut stars = 0;
            let mut black_holes = 0;
            
            for stat in body_stats {
                let body_type: String = stat.get("body_type");
                let count: i64 = stat.get("count");
                
                match body_type.as_str() {
                    "Asteroid" => asteroids = count as i32,
                    "Comet" => comets = count as i32,
                    "Moon" => moons = count as i32,
                    "DwarfPlanet" => dwarf_planets = count as i32,
                    "Planet" => planets = count as i32,
                    "Star" => stars = count as i32,
                    "BlackHole" => black_holes = count as i32,
                    _ => {}
                }
            }
            
            // 統計データを更新
            sqlx::query(r#"
                INSERT INTO player_statistics (
                    player_id, asteroids_created, comets_created, moons_created,
                    dwarf_planets_created, planets_created, stars_created, black_holes_created,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (player_id) DO UPDATE SET
                    asteroids_created = EXCLUDED.asteroids_created,
                    comets_created = EXCLUDED.comets_created,
                    moons_created = EXCLUDED.moons_created,
                    dwarf_planets_created = EXCLUDED.dwarf_planets_created,
                    planets_created = EXCLUDED.planets_created,
                    stars_created = EXCLUDED.stars_created,
                    black_holes_created = EXCLUDED.black_holes_created,
                    updated_at = NOW()
            "#)
            .bind(player_id)
            .bind(asteroids)
            .bind(comets)
            .bind(moons)
            .bind(dwarf_planets)
            .bind(planets)
            .bind(stars)
            .bind(black_holes)
            .execute(pool)
            .await?;
        }
        
        info!("Statistics recalculation completed");
        Ok(())
    }
}

/// マイグレーション管理システム
pub struct MigrationManager {
    pool: PgPool,
    migrations: Vec<Migration>,
}

impl MigrationManager {
    pub fn new(pool: PgPool) -> Self {
        let migrations = vec![
            Migration {
                version: MigrationVersion(1),
                description: "Initial game state tables".to_string(),
                up_sql: vec![
                    include_str!("../../migrations/001_initial.sql").to_string(),
                ],
                down_sql: vec![
                    "DROP TABLE IF EXISTS game_saves CASCADE;".to_string(),
                ],
                data_migration: None,
            },
            Migration {
                version: MigrationVersion(2),
                description: "Server-side game logic tables".to_string(),
                up_sql: vec![
                    include_str!("../../migrations/002_game_state_tables.sql").to_string(),
                ],
                down_sql: vec![
                    "DROP TABLE IF EXISTS game_snapshots CASCADE;".to_string(),
                    "DROP TABLE IF EXISTS game_deltas CASCADE;".to_string(),
                    "DROP TABLE IF EXISTS celestial_bodies CASCADE;".to_string(),
                    "DROP TABLE IF EXISTS game_leaderboards CASCADE;".to_string(),
                    "DROP TABLE IF EXISTS player_upgrades CASCADE;".to_string(),
                    "DROP TABLE IF EXISTS player_achievements CASCADE;".to_string(),
                    "DROP TABLE IF EXISTS player_statistics CASCADE;".to_string(),
                ],
                data_migration: Some(Box::new(|pool| {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            DataMigration::migrate_v1_to_v2(pool).await?;
                            DataMigration::migrate_celestial_bodies(pool).await?;
                            DataMigration::recalculate_statistics(pool).await?;
                            Ok(())
                        })
                    })
                })),
            },
        ];
        
        Self { pool, migrations }
    }
    
    /// マイグレーションテーブルの初期化
    pub async fn init(&self) -> Result<(), MigrationError> {
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                description TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    /// 現在のバージョンを取得
    pub async fn current_version(&self) -> Result<Option<MigrationVersion>, MigrationError> {
        let row = sqlx::query(r#"
            SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
        "#)
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(row.map(|r| MigrationVersion(r.get::<i32, _>("version") as u32)))
    }
    
    /// 保留中のマイグレーションを取得
    pub async fn pending_migrations(&self) -> Result<Vec<&Migration>, MigrationError> {
        let current = self.current_version().await?.unwrap_or(MigrationVersion(0));
        
        Ok(self.migrations.iter()
            .filter(|m| m.version > current)
            .collect())
    }
    
    /// 単一のマイグレーションを実行
    pub async fn run_migration(&self, migration: &Migration) -> Result<(), MigrationError> {
        info!("Running migration {}: {}", migration.version.0, migration.description);
        
        let mut tx = self.pool.begin().await?;
        
        // SQLマイグレーションを実行
        for sql in &migration.up_sql {
            sqlx::query(sql).execute(&mut *tx).await?;
        }
        
        // データマイグレーションを実行
        if let Some(data_migration) = &migration.data_migration {
            data_migration(&self.pool)?;
        }
        
        // マイグレーション記録を挿入
        sqlx::query(r#"
            INSERT INTO schema_migrations (version, description) VALUES ($1, $2)
        "#)
        .bind(migration.version.0 as i32)
        .bind(&migration.description)
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        
        info!("Migration {} completed successfully", migration.version.0);
        Ok(())
    }
    
    /// 全てのマイグレーションを実行
    pub async fn migrate(&self) -> Result<(), MigrationError> {
        self.init().await?;
        
        let pending = self.pending_migrations().await?;
        
        if pending.is_empty() {
            info!("No pending migrations");
            return Ok(());
        }
        
        info!("Running {} pending migrations", pending.len());
        
        for migration in pending {
            self.run_migration(migration).await?;
        }
        
        info!("All migrations completed successfully");
        Ok(())
    }
    
    /// マイグレーションのロールバック
    pub async fn rollback(&self, target_version: MigrationVersion) -> Result<(), MigrationError> {
        let current = self.current_version().await?.unwrap_or(MigrationVersion(0));
        
        if target_version >= current {
            return Ok(());
        }
        
        let rollback_migrations: Vec<_> = self.migrations.iter()
            .filter(|m| m.version > target_version && m.version <= current)
            .collect();
        
        info!("Rolling back {} migrations", rollback_migrations.len());
        
        for migration in rollback_migrations.iter().rev() {
            info!("Rolling back migration {}: {}", migration.version.0, migration.description);
            
            let mut tx = self.pool.begin().await?;
            
            // ロールバックSQLを実行
            for sql in &migration.down_sql {
                sqlx::query(sql).execute(&mut *tx).await?;
            }
            
            // マイグレーション記録を削除
            sqlx::query(r#"
                DELETE FROM schema_migrations WHERE version = $1
            "#)
            .bind(migration.version.0 as i32)
            .execute(&mut *tx)
            .await?;
            
            tx.commit().await?;
        }
        
        info!("Rollback completed successfully");
        Ok(())
    }
    
    /// データ整合性チェック
    pub async fn verify_integrity(&self) -> Result<(), MigrationError> {
        DataMigration::verify_data_integrity(&self.pool).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_migration_version_ordering() {
        let v1 = MigrationVersion(1);
        let v2 = MigrationVersion(2);
        
        assert!(v1 < v2);
        assert!(v2 > v1);
    }
    
    #[test]
    fn test_v1_to_v2_conversion() {
        let player_id = Uuid::new_v4();
        let timestamp = Utc::now();
        
        let v1_data = serde_json::json!({
            "player_id": player_id,
            "resources": {
                "cosmic_dust": 1000,
                "energy": 500,
                "organic_matter": 0,
                "biomass": 0,
                "dark_matter": 0,
                "thought_points": 0
            },
            "bodies": {},
            "timestamp": timestamp
        });
        
        let result = DataMigration::convert_v1_to_v2(player_id, v1_data, timestamp);
        assert!(result.is_ok());
        
        let v2_state = result.unwrap();
        assert_eq!(v2_state.version, 2);
        assert_eq!(v2_state.player_id, player_id);
        assert_eq!(v2_state.resources.cosmic_dust, 1000);
        assert_eq!(v2_state.resources.energy, 500);
    }
}