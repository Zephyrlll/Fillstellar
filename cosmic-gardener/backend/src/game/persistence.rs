use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use zstd::bulk::{compress, decompress};
use bincode;
use rmp_serde as rmps;
use sqlx::{PgPool, Row};
use tokio::time::{interval, Duration};

use crate::errors::GameError;
use crate::game::resources::{Resources, ProductionRates, ResourceAccumulators, UpgradeLevels};
use crate::game::celestial_bodies::{CelestialBody, BodyId};
use crate::game::physics::PhysicsState;

/// ゲームセーブのバージョン
pub const SAVE_VERSION: u32 = 1;

/// 圧縮タイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompressionType {
    None,
    Zstd,
    Bincode,
    MessagePack,
}

/// シリアライゼーション形式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SerializationFormat {
    Json,
    Bincode,
    MessagePack,
}

/// ゲーム状態の完全なスナップショット
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateSnapshot {
    pub version: u32,
    pub player_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub tick: u64,
    pub resources: Resources,
    pub production_rates: ProductionRates,
    pub accumulators: ResourceAccumulators,
    pub upgrade_levels: UpgradeLevels,
    pub bodies: HashMap<BodyId, CelestialBody>,
    pub physics_state: PhysicsState,
    pub checksum: u64,
}

impl GameStateSnapshot {
    pub fn new(
        player_id: Uuid,
        tick: u64,
        resources: Resources,
        production_rates: ProductionRates,
        accumulators: ResourceAccumulators,
        upgrade_levels: UpgradeLevels,
        bodies: HashMap<BodyId, CelestialBody>,
        physics_state: PhysicsState,
    ) -> Self {
        let mut snapshot = Self {
            version: SAVE_VERSION,
            player_id,
            timestamp: Utc::now(),
            tick,
            resources,
            production_rates,
            accumulators,
            upgrade_levels,
            bodies,
            physics_state,
            checksum: 0,
        };
        
        // チェックサムの計算
        snapshot.checksum = snapshot.calculate_checksum();
        snapshot
    }
    
    /// チェックサムの計算
    fn calculate_checksum(&self) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        self.version.hash(&mut hasher);
        self.player_id.hash(&mut hasher);
        self.tick.hash(&mut hasher);
        self.resources.cosmic_dust.hash(&mut hasher);
        self.resources.energy.hash(&mut hasher);
        self.resources.organic_matter.hash(&mut hasher);
        self.resources.biomass.hash(&mut hasher);
        self.resources.dark_matter.hash(&mut hasher);
        self.resources.thought_points.hash(&mut hasher);
        
        // 天体のハッシュ
        for (id, body) in &self.bodies {
            id.hash(&mut hasher);
            body.physics.mass.hash(&mut hasher);
            body.physics.position.x.hash(&mut hasher);
            body.physics.position.y.hash(&mut hasher);
            body.physics.position.z.hash(&mut hasher);
        }
        
        hasher.finish()
    }
    
    /// チェックサムの検証
    pub fn verify_checksum(&self) -> bool {
        let calculated = self.calculate_checksum();
        self.checksum == calculated
    }
}

/// 差分データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateDelta {
    pub from_tick: u64,
    pub to_tick: u64,
    pub player_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub resource_changes: Option<Resources>,
    pub production_changes: Option<ProductionRates>,
    pub body_changes: HashMap<BodyId, CelestialBody>,
    pub body_removals: Vec<BodyId>,
    pub upgrade_changes: Option<UpgradeLevels>,
    pub physics_changes: Option<PhysicsState>,
}

impl GameStateDelta {
    pub fn new(player_id: Uuid, from_tick: u64, to_tick: u64) -> Self {
        Self {
            from_tick,
            to_tick,
            player_id,
            timestamp: Utc::now(),
            resource_changes: None,
            production_changes: None,
            body_changes: HashMap::new(),
            body_removals: Vec::new(),
            upgrade_changes: None,
            physics_changes: None,
        }
    }
    
    /// 差分の適用
    pub fn apply_to_snapshot(&self, snapshot: &mut GameStateSnapshot) {
        snapshot.tick = self.to_tick;
        snapshot.timestamp = self.timestamp;
        
        if let Some(ref resources) = self.resource_changes {
            snapshot.resources = resources.clone();
        }
        
        if let Some(ref production) = self.production_changes {
            snapshot.production_rates = production.clone();
        }
        
        if let Some(ref upgrades) = self.upgrade_changes {
            snapshot.upgrade_levels = upgrades.clone();
        }
        
        if let Some(ref physics) = self.physics_changes {
            snapshot.physics_state = physics.clone();
        }
        
        // 天体の変更
        for (id, body) in &self.body_changes {
            snapshot.bodies.insert(*id, body.clone());
        }
        
        // 天体の削除
        for id in &self.body_removals {
            snapshot.bodies.remove(id);
        }
        
        // チェックサムの再計算
        snapshot.checksum = snapshot.calculate_checksum();
    }
}

/// 圧縮されたデータ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedData {
    pub data: Vec<u8>,
    pub compression_type: CompressionType,
    pub serialization_format: SerializationFormat,
    pub original_size: usize,
    pub compressed_size: usize,
}

impl CompressedData {
    /// データの圧縮
    pub fn compress<T: Serialize>(
        data: &T,
        compression_type: CompressionType,
        serialization_format: SerializationFormat,
    ) -> Result<Self, GameError> {
        // シリアライゼーション
        let serialized = match serialization_format {
            SerializationFormat::Json => {
                serde_json::to_vec(data).map_err(|e| GameError::SerializationError(e.to_string()))?
            },
            SerializationFormat::Bincode => {
                bincode::serialize(data).map_err(|e| GameError::SerializationError(e.to_string()))?
            },
            SerializationFormat::MessagePack => {
                rmps::to_vec(data).map_err(|e| GameError::SerializationError(e.to_string()))?
            },
        };
        
        let original_size = serialized.len();
        
        // 圧縮
        let compressed = match compression_type {
            CompressionType::None => serialized,
            CompressionType::Zstd => {
                compress(&serialized, 3).map_err(|e| GameError::CompressionError(e.to_string()))?
            },
            CompressionType::Bincode => {
                bincode::serialize(&serialized).map_err(|e| GameError::CompressionError(e.to_string()))?
            },
            CompressionType::MessagePack => {
                rmps::to_vec(&serialized).map_err(|e| GameError::CompressionError(e.to_string()))?
            },
        };
        
        let compressed_size = compressed.len();
        
        Ok(CompressedData {
            data: compressed,
            compression_type,
            serialization_format,
            original_size,
            compressed_size,
        })
    }
    
    /// データの展開
    pub fn decompress<T: for<'de> Deserialize<'de>>(&self) -> Result<T, GameError> {
        // 展開
        let decompressed = match self.compression_type {
            CompressionType::None => self.data.clone(),
            CompressionType::Zstd => {
                decompress(&self.data, self.original_size)
                    .map_err(|e| GameError::DecompressionError(e.to_string()))?
            },
            CompressionType::Bincode => {
                bincode::deserialize::<Vec<u8>>(&self.data)
                    .map_err(|e| GameError::DecompressionError(e.to_string()))?
            },
            CompressionType::MessagePack => {
                rmps::from_slice::<Vec<u8>>(&self.data)
                    .map_err(|e| GameError::DecompressionError(e.to_string()))?
            },
        };
        
        // デシリアライゼーション
        let result = match self.serialization_format {
            SerializationFormat::Json => {
                serde_json::from_slice(&decompressed)
                    .map_err(|e| GameError::DeserializationError(e.to_string()))?
            },
            SerializationFormat::Bincode => {
                bincode::deserialize(&decompressed)
                    .map_err(|e| GameError::DeserializationError(e.to_string()))?
            },
            SerializationFormat::MessagePack => {
                rmps::from_slice(&decompressed)
                    .map_err(|e| GameError::DeserializationError(e.to_string()))?
            },
        };
        
        Ok(result)
    }
    
    /// 圧縮率の取得
    pub fn compression_ratio(&self) -> f64 {
        if self.original_size == 0 {
            return 0.0;
        }
        self.compressed_size as f64 / self.original_size as f64
    }
}

/// 永続化設定
#[derive(Debug, Clone)]
pub struct PersistenceConfig {
    pub auto_save_interval: Duration,
    pub max_snapshots: usize,
    pub max_deltas: usize,
    pub compression_type: CompressionType,
    pub serialization_format: SerializationFormat,
    pub cleanup_interval: Duration,
}

impl Default for PersistenceConfig {
    fn default() -> Self {
        Self {
            auto_save_interval: Duration::from_secs(300), // 5分
            max_snapshots: 10,
            max_deltas: 100,
            compression_type: CompressionType::Zstd,
            serialization_format: SerializationFormat::MessagePack,
            cleanup_interval: Duration::from_secs(3600), // 1時間
        }
    }
}

/// 永続化管理システム
pub struct PersistenceManager {
    db_pool: PgPool,
    config: PersistenceConfig,
    last_snapshots: HashMap<Uuid, (u64, GameStateSnapshot)>,
}

impl PersistenceManager {
    pub fn new(db_pool: PgPool, config: PersistenceConfig) -> Self {
        Self {
            db_pool,
            config,
            last_snapshots: HashMap::new(),
        }
    }
    
    /// 完全なスナップショットの保存
    pub async fn save_snapshot(&mut self, snapshot: GameStateSnapshot) -> Result<(), GameError> {
        if !snapshot.verify_checksum() {
            return Err(GameError::ChecksumMismatch);
        }
        
        let compressed = CompressedData::compress(
            &snapshot,
            self.config.compression_type,
            self.config.serialization_format,
        )?;
        
        let query = r#"
            INSERT INTO game_snapshots (
                player_id, tick, version, timestamp, 
                data, compression_type, serialization_format,
                original_size, compressed_size, checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (player_id, tick) 
            DO UPDATE SET
                data = EXCLUDED.data,
                timestamp = EXCLUDED.timestamp,
                checksum = EXCLUDED.checksum
        "#;
        
        sqlx::query(query)
            .bind(snapshot.player_id)
            .bind(snapshot.tick as i64)
            .bind(snapshot.version as i32)
            .bind(snapshot.timestamp)
            .bind(compressed.data)
            .bind(serde_json::to_string(&compressed.compression_type)?)
            .bind(serde_json::to_string(&compressed.serialization_format)?)
            .bind(compressed.original_size as i32)
            .bind(compressed.compressed_size as i32)
            .bind(snapshot.checksum as i64)
            .execute(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        // キャッシュの更新
        self.last_snapshots.insert(snapshot.player_id, (snapshot.tick, snapshot));
        
        Ok(())
    }
    
    /// 差分の保存
    pub async fn save_delta(&self, delta: GameStateDelta) -> Result<(), GameError> {
        let compressed = CompressedData::compress(
            &delta,
            self.config.compression_type,
            self.config.serialization_format,
        )?;
        
        let query = r#"
            INSERT INTO game_deltas (
                player_id, from_tick, to_tick, timestamp,
                data, compression_type, serialization_format,
                original_size, compressed_size
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#;
        
        sqlx::query(query)
            .bind(delta.player_id)
            .bind(delta.from_tick as i64)
            .bind(delta.to_tick as i64)
            .bind(delta.timestamp)
            .bind(compressed.data)
            .bind(serde_json::to_string(&compressed.compression_type)?)
            .bind(serde_json::to_string(&compressed.serialization_format)?)
            .bind(compressed.original_size as i32)
            .bind(compressed.compressed_size as i32)
            .execute(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        Ok(())
    }
    
    /// スナップショットの読み込み
    pub async fn load_snapshot(&mut self, player_id: Uuid, tick: Option<u64>) -> Result<Option<GameStateSnapshot>, GameError> {
        // キャッシュから確認
        if let Some((cached_tick, cached_snapshot)) = self.last_snapshots.get(&player_id) {
            if tick.map_or(true, |t| t == *cached_tick) {
                return Ok(Some(cached_snapshot.clone()));
            }
        }
        
        let query = if let Some(tick) = tick {
            sqlx::query(r#"
                SELECT data, compression_type, serialization_format, checksum
                FROM game_snapshots 
                WHERE player_id = $1 AND tick = $2
                ORDER BY timestamp DESC
                LIMIT 1
            "#)
            .bind(player_id)
            .bind(tick as i64)
        } else {
            sqlx::query(r#"
                SELECT data, compression_type, serialization_format, checksum
                FROM game_snapshots 
                WHERE player_id = $1 
                ORDER BY tick DESC
                LIMIT 1
            "#)
            .bind(player_id)
        };
        
        let row = query.fetch_optional(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        if let Some(row) = row {
            let data: Vec<u8> = row.get("data");
            let compression_type: String = row.get("compression_type");
            let serialization_format: String = row.get("serialization_format");
            let stored_checksum: i64 = row.get("checksum");
            
            let compressed = CompressedData {
                data,
                compression_type: serde_json::from_str(&compression_type)?,
                serialization_format: serde_json::from_str(&serialization_format)?,
                original_size: 0, // 復元時は不要
                compressed_size: 0, // 復元時は不要
            };
            
            let snapshot: GameStateSnapshot = compressed.decompress()?;
            
            // チェックサムの検証
            if !snapshot.verify_checksum() {
                return Err(GameError::ChecksumMismatch);
            }
            
            if snapshot.checksum != stored_checksum as u64 {
                return Err(GameError::ChecksumMismatch);
            }
            
            // キャッシュの更新
            self.last_snapshots.insert(player_id, (snapshot.tick, snapshot.clone()));
            
            Ok(Some(snapshot))
        } else {
            Ok(None)
        }
    }
    
    /// 差分の読み込み
    pub async fn load_deltas(&self, player_id: Uuid, from_tick: u64, to_tick: u64) -> Result<Vec<GameStateDelta>, GameError> {
        let query = r#"
            SELECT data, compression_type, serialization_format
            FROM game_deltas
            WHERE player_id = $1 AND from_tick >= $2 AND to_tick <= $3
            ORDER BY from_tick ASC
        "#;
        
        let rows = sqlx::query(query)
            .bind(player_id)
            .bind(from_tick as i64)
            .bind(to_tick as i64)
            .fetch_all(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        let mut deltas = Vec::new();
        
        for row in rows {
            let data: Vec<u8> = row.get("data");
            let compression_type: String = row.get("compression_type");
            let serialization_format: String = row.get("serialization_format");
            
            let compressed = CompressedData {
                data,
                compression_type: serde_json::from_str(&compression_type)?,
                serialization_format: serde_json::from_str(&serialization_format)?,
                original_size: 0,
                compressed_size: 0,
            };
            
            let delta: GameStateDelta = compressed.decompress()?;
            deltas.push(delta);
        }
        
        Ok(deltas)
    }
    
    /// 差分を適用したスナップショットの復元
    pub async fn restore_state(&mut self, player_id: Uuid, target_tick: u64) -> Result<Option<GameStateSnapshot>, GameError> {
        // 最新のスナップショットを取得
        let mut snapshot = if let Some(snapshot) = self.load_snapshot(player_id, None).await? {
            snapshot
        } else {
            return Ok(None);
        };
        
        if snapshot.tick >= target_tick {
            return Ok(Some(snapshot));
        }
        
        // 差分を取得して適用
        let deltas = self.load_deltas(player_id, snapshot.tick, target_tick).await?;
        
        for delta in deltas {
            if delta.to_tick <= target_tick {
                delta.apply_to_snapshot(&mut snapshot);
            }
        }
        
        Ok(Some(snapshot))
    }
    
    /// 自動保存の開始
    pub async fn start_auto_save(&self) -> Result<(), GameError> {
        let mut interval = interval(self.config.auto_save_interval);
        
        loop {
            interval.tick().await;
            // 自動保存のロジック
            // 実際の実装では、ゲーム状態を取得して保存する
            // self.save_all_active_games().await?;
        }
    }
    
    /// 古いデータのクリーンアップ
    pub async fn cleanup_old_data(&self) -> Result<(), GameError> {
        let cutoff_time = Utc::now() - chrono::Duration::days(30); // 30日前
        
        // 古いスナップショットの削除
        let query = r#"
            DELETE FROM game_snapshots
            WHERE timestamp < $1
            AND tick NOT IN (
                SELECT DISTINCT tick FROM (
                    SELECT tick, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY tick DESC) as rn
                    FROM game_snapshots
                    WHERE timestamp >= $1
                ) t WHERE rn <= $2
            )
        "#;
        
        sqlx::query(query)
            .bind(cutoff_time)
            .bind(self.config.max_snapshots as i64)
            .execute(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        // 古い差分の削除
        let query = r#"
            DELETE FROM game_deltas
            WHERE timestamp < $1
        "#;
        
        sqlx::query(query)
            .bind(cutoff_time)
            .execute(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        Ok(())
    }
    
    /// 統計情報の取得
    pub async fn get_statistics(&self) -> Result<PersistenceStatistics, GameError> {
        let query = r#"
            SELECT 
                COUNT(*) as total_snapshots,
                AVG(compressed_size) as avg_compressed_size,
                AVG(original_size) as avg_original_size,
                AVG(compressed_size::float / original_size::float) as avg_compression_ratio
            FROM game_snapshots
        "#;
        
        let row = sqlx::query(query)
            .fetch_one(&self.db_pool)
            .await
            .map_err(|e| GameError::DatabaseError(e.to_string()))?;
        
        Ok(PersistenceStatistics {
            total_snapshots: row.get::<i64, _>("total_snapshots") as u64,
            avg_compressed_size: row.get::<Option<f64>, _>("avg_compressed_size").unwrap_or(0.0) as u64,
            avg_original_size: row.get::<Option<f64>, _>("avg_original_size").unwrap_or(0.0) as u64,
            avg_compression_ratio: row.get::<Option<f64>, _>("avg_compression_ratio").unwrap_or(1.0),
        })
    }
}

/// 永続化統計情報
#[derive(Debug, Clone)]
pub struct PersistenceStatistics {
    pub total_snapshots: u64,
    pub avg_compressed_size: u64,
    pub avg_original_size: u64,
    pub avg_compression_ratio: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::celestial_bodies::CelestialType;
    
    #[test]
    fn test_compression() {
        let snapshot = GameStateSnapshot::new(
            Uuid::new_v4(),
            1000,
            Resources::default(),
            ProductionRates::default(),
            ResourceAccumulators::default(),
            UpgradeLevels::default(),
            HashMap::new(),
            PhysicsState::new(),
        );
        
        let compressed = CompressedData::compress(
            &snapshot,
            CompressionType::Zstd,
            SerializationFormat::MessagePack,
        ).unwrap();
        
        let decompressed: GameStateSnapshot = compressed.decompress().unwrap();
        
        assert_eq!(snapshot.player_id, decompressed.player_id);
        assert_eq!(snapshot.tick, decompressed.tick);
        assert!(compressed.compression_ratio() < 1.0);
    }
    
    #[test]
    fn test_checksum_validation() {
        let snapshot = GameStateSnapshot::new(
            Uuid::new_v4(),
            1000,
            Resources::default(),
            ProductionRates::default(),
            ResourceAccumulators::default(),
            UpgradeLevels::default(),
            HashMap::new(),
            PhysicsState::new(),
        );
        
        assert!(snapshot.verify_checksum());
        
        let mut corrupted = snapshot.clone();
        corrupted.resources.cosmic_dust = 999999;
        
        assert!(!corrupted.verify_checksum());
    }
    
    #[test]
    fn test_delta_application() {
        let mut snapshot = GameStateSnapshot::new(
            Uuid::new_v4(),
            1000,
            Resources::default(),
            ProductionRates::default(),
            ResourceAccumulators::default(),
            UpgradeLevels::default(),
            HashMap::new(),
            PhysicsState::new(),
        );
        
        let mut delta = GameStateDelta::new(snapshot.player_id, 1000, 1001);
        delta.resource_changes = Some(Resources {
            cosmic_dust: 500,
            energy: 250,
            ..Default::default()
        });
        
        delta.apply_to_snapshot(&mut snapshot);
        
        assert_eq!(snapshot.tick, 1001);
        assert_eq!(snapshot.resources.cosmic_dust, 500);
        assert_eq!(snapshot.resources.energy, 250);
    }
}