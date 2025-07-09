//! データベースサービス（キャッシング統合）

use sqlx::{PgPool, Row};
use uuid::Uuid;
use anyhow::Result;
use tracing::{instrument, debug, warn};
use std::time::Instant;

use crate::models::game::PlayerState;
use crate::models::user::User;
use crate::game::celestial_bodies::CelestialBody;
use crate::services::cache::CacheService;
use crate::services::database_pool::EnhancedDatabasePool;

/// キャッシング統合データベースサービス
#[derive(Clone)]
pub struct DatabaseService {
    pool: PgPool,
    enhanced_pool: Option<Arc<EnhancedDatabasePool>>,
    cache: CacheService,
}

impl DatabaseService {
    /// 新しいデータベースサービスを作成
    pub fn new(pool: PgPool, cache: CacheService) -> Self {
        Self { pool, enhanced_pool: None, cache }
    }

    /// 拡張プール付きのデータベースサービスを作成
    pub fn with_enhanced_pool(pool: PgPool, enhanced_pool: Arc<EnhancedDatabasePool>, cache: CacheService) -> Self {
        Self { pool, enhanced_pool: Some(enhanced_pool), cache }
    }

    /// プレイヤー状態を取得（キャッシュ優先）
    #[instrument(skip(self), fields(player_id = %player_id))]
    pub async fn get_player_state(&self, player_id: Uuid) -> Result<Option<PlayerState>> {
        let start = Instant::now();

        // L1: キャッシュから取得を試行
        match self.cache.get_player_state(player_id).await {
            Ok(Some(cached_state)) => {
                debug!("Player state served from cache in {:?}", start.elapsed());
                return Ok(Some(cached_state));
            }
            Ok(None) => {
                debug!("Player state cache miss, querying database");
            }
            Err(e) => {
                warn!("Cache error, falling back to database: {}", e);
            }
        }

        // L2: データベースから取得
        let state = self.fetch_player_state_from_db(player_id).await?;
        
        // キャッシュに保存（非同期）
        if let Some(ref state) = state {
            if let Err(e) = self.cache.set_player_state(player_id, state).await {
                warn!("Failed to cache player state: {}", e);
            }
        }

        debug!("Player state served from database in {:?}", start.elapsed());
        Ok(state)
    }

    /// プレイヤー状態をデータベースから直接取得
    async fn fetch_player_state_from_db(&self, player_id: Uuid) -> Result<Option<PlayerState>> {
        let row = sqlx::query!(
            r#"
            SELECT 
                player_id,
                resources_cosmic_dust,
                resources_energy,
                resources_organic_matter,
                resources_biomass,
                resources_dark_matter,
                resources_thought_points,
                level,
                experience,
                last_active,
                created_at,
                updated_at
            FROM player_states 
            WHERE player_id = $1
            "#,
            player_id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(PlayerState {
                player_id: row.player_id,
                resources: crate::models::game::Resources {
                    cosmic_dust: row.resources_cosmic_dust.unwrap_or(0) as u64,
                    energy: row.resources_energy.unwrap_or(0) as u64,
                    organic_matter: row.resources_organic_matter.unwrap_or(0) as u64,
                    biomass: row.resources_biomass.unwrap_or(0) as u64,
                    dark_matter: row.resources_dark_matter.unwrap_or(0) as u64,
                    thought_points: row.resources_thought_points.unwrap_or(0) as u64,
                },
                level: row.level.unwrap_or(1) as u32,
                experience: row.experience.unwrap_or(0) as u64,
                last_active: row.last_active,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    /// プレイヤー状態を更新（キャッシュも更新）
    #[instrument(skip(self, state), fields(player_id = %player_id))]
    pub async fn update_player_state(&self, player_id: Uuid, state: &PlayerState) -> Result<()> {
        let start = Instant::now();

        // データベースを更新
        sqlx::query!(
            r#"
            INSERT INTO player_states (
                player_id,
                resources_cosmic_dust,
                resources_energy,
                resources_organic_matter,
                resources_biomass,
                resources_dark_matter,
                resources_thought_points,
                level,
                experience,
                last_active,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (player_id) 
            DO UPDATE SET
                resources_cosmic_dust = EXCLUDED.resources_cosmic_dust,
                resources_energy = EXCLUDED.resources_energy,
                resources_organic_matter = EXCLUDED.resources_organic_matter,
                resources_biomass = EXCLUDED.resources_biomass,
                resources_dark_matter = EXCLUDED.resources_dark_matter,
                resources_thought_points = EXCLUDED.resources_thought_points,
                level = EXCLUDED.level,
                experience = EXCLUDED.experience,
                last_active = EXCLUDED.last_active,
                updated_at = NOW()
            "#,
            player_id,
            state.resources.cosmic_dust as i64,
            state.resources.energy as i64,
            state.resources.organic_matter as i64,
            state.resources.biomass as i64,
            state.resources.dark_matter as i64,
            state.resources.thought_points as i64,
            state.level as i32,
            state.experience as i64,
            state.last_active
        )
        .execute(&self.pool)
        .await?;

        // キャッシュを更新
        if let Err(e) = self.cache.set_player_state(player_id, state).await {
            warn!("Failed to update cache after database write: {}", e);
        }

        debug!("Player state updated in {:?}", start.elapsed());
        Ok(())
    }

    /// 天体データを取得（キャッシュ優先）
    #[instrument(skip(self), fields(player_id = %player_id))]
    pub async fn get_celestial_bodies(&self, player_id: Uuid) -> Result<Vec<CelestialBody>> {
        let start = Instant::now();

        // L1: キャッシュから取得を試行
        match self.cache.get_celestial_bodies(player_id).await {
            Ok(Some(cached_bodies)) => {
                debug!("Celestial bodies served from cache in {:?}", start.elapsed());
                return Ok(cached_bodies);
            }
            Ok(None) => {
                debug!("Celestial bodies cache miss, querying database");
            }
            Err(e) => {
                warn!("Cache error, falling back to database: {}", e);
            }
        }

        // L2: データベースから取得
        let bodies = self.fetch_celestial_bodies_from_db(player_id).await?;
        
        // キャッシュに保存（非同期）
        if let Err(e) = self.cache.set_celestial_bodies(player_id, &bodies).await {
            warn!("Failed to cache celestial bodies: {}", e);
        }

        debug!("Celestial bodies served from database in {:?}", start.elapsed());
        Ok(bodies)
    }

    /// 天体データをデータベースから直接取得
    async fn fetch_celestial_bodies_from_db(&self, player_id: Uuid) -> Result<Vec<CelestialBody>> {
        let rows = sqlx::query!(
            r#"
            SELECT 
                id,
                player_id,
                celestial_type,
                position_x,
                position_y,
                position_z,
                velocity_x,
                velocity_y,
                velocity_z,
                mass,
                radius,
                temperature,
                luminosity,
                resource_generation_rate,
                created_at,
                updated_at
            FROM celestial_bodies 
            WHERE player_id = $1
            ORDER BY created_at
            "#,
            player_id
        )
        .fetch_all(&self.pool)
        .await?;

        let mut bodies = Vec::new();
        for row in rows {
            // CelestialBodyの構築（実際の実装に合わせて調整が必要）
            // これは簡略化した例です
            let body = CelestialBody::new(
                row.id,
                serde_json::from_str(&row.celestial_type.unwrap_or_default())
                    .unwrap_or_default(),
                nalgebra::Vector3::new(
                    row.position_x.unwrap_or(0.0),
                    row.position_y.unwrap_or(0.0), 
                    row.position_z.unwrap_or(0.0)
                ),
                crate::game::resources::fixed::from_f64(row.mass.unwrap_or(1.0)),
                crate::game::resources::fixed::from_f64(row.radius.unwrap_or(1.0)),
            );
            bodies.push(body);
        }

        Ok(bodies)
    }

    /// ユーザーセッションを取得（キャッシュ優先）
    #[instrument(skip(self), fields(session_id = %session_id))]
    pub async fn get_user_by_session(&self, session_id: &str) -> Result<Option<User>> {
        let start = Instant::now();

        // L1: キャッシュから取得を試行
        match self.cache.get_user_session(session_id).await {
            Ok(Some(cached_user)) => {
                debug!("User session served from cache in {:?}", start.elapsed());
                return Ok(Some(cached_user));
            }
            Ok(None) => {
                debug!("User session cache miss, querying database");
            }
            Err(e) => {
                warn!("Cache error, falling back to database: {}", e);
            }
        }

        // L2: データベースから取得（実際の実装に合わせて調整）
        let user = self.fetch_user_by_session_from_db(session_id).await?;
        
        // キャッシュに保存
        if let Some(ref user) = user {
            if let Err(e) = self.cache.set_user_session(session_id, user).await {
                warn!("Failed to cache user session: {}", e);
            }
        }

        debug!("User session served from database in {:?}", start.elapsed());
        Ok(user)
    }

    /// ユーザーセッションをデータベースから直接取得
    async fn fetch_user_by_session_from_db(&self, session_id: &str) -> Result<Option<User>> {
        // セッション管理の実装に依存するため、簡略化した例
        let row = sqlx::query!(
            r#"
            SELECT u.id, u.email, u.username, u.created_at, u.updated_at
            FROM users u
            JOIN sessions s ON u.id = s.user_id
            WHERE s.session_token = $1 AND s.expires_at > NOW()
            "#,
            session_id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(User {
                id: row.id,
                email: row.email,
                username: row.username,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    /// ゲーム統計を取得（キャッシュ優先）
    #[instrument(skip(self))]
    pub async fn get_game_stats(&self) -> Result<serde_json::Value> {
        let start = Instant::now();

        // L1: キャッシュから取得を試行
        match self.cache.get_game_stats().await {
            Ok(Some(cached_stats)) => {
                debug!("Game stats served from cache in {:?}", start.elapsed());
                return Ok(cached_stats);
            }
            Ok(None) => {
                debug!("Game stats cache miss, calculating from database");
            }
            Err(e) => {
                warn!("Cache error, falling back to database: {}", e);
            }
        }

        // L2: データベースから統計を計算
        let stats = self.calculate_game_stats_from_db().await?;
        
        // キャッシュに保存
        if let Err(e) = self.cache.set_game_stats(&stats).await {
            warn!("Failed to cache game stats: {}", e);
        }

        debug!("Game stats calculated from database in {:?}", start.elapsed());
        Ok(stats)
    }

    /// ゲーム統計をデータベースから計算
    async fn calculate_game_stats_from_db(&self) -> Result<serde_json::Value> {
        let stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(DISTINCT player_id) as total_players,
                COUNT(*) as total_celestial_bodies,
                AVG(mass) as avg_mass,
                SUM(mass) as total_mass
            FROM celestial_bodies
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(serde_json::json!({
            "total_players": stats.total_players.unwrap_or(0),
            "total_celestial_bodies": stats.total_celestial_bodies.unwrap_or(0),
            "average_mass": stats.avg_mass.unwrap_or(0.0),
            "total_mass": stats.total_mass.unwrap_or(0.0),
            "calculated_at": chrono::Utc::now()
        }))
    }

    /// プレイヤーのキャッシュを無効化
    #[instrument(skip(self), fields(player_id = %player_id))]
    pub async fn invalidate_player_cache(&self, player_id: Uuid) -> Result<()> {
        self.cache.invalidate_player_cache(player_id).await
    }

    /// セッションを無効化
    #[instrument(skip(self), fields(session_id = %session_id))]
    pub async fn invalidate_session(&self, session_id: &str) -> Result<()> {
        self.cache.invalidate_session(session_id).await
    }

    /// データベース接続の健全性チェック
    #[instrument(skip(self))]
    pub async fn health_check(&self) -> Result<bool> {
        // データベース接続をテスト
        let db_ok = sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .is_ok();

        // キャッシュ接続をテスト
        let cache_ok = self.cache.health_check().await.unwrap_or(false);

        Ok(db_ok && cache_ok)
    }

    /// データベースプールの参照を取得
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// キャッシュサービスの参照を取得
    pub fn cache(&self) -> &CacheService {
        &self.cache
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    // テストケースは実際のデータベーススキーマに合わせて実装
}