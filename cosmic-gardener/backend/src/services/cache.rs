//! Redis キャッシングサービス

use redis::{AsyncCommands, Client, RedisResult};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid::Uuid;
use anyhow::Result;
use tracing::{instrument, warn, debug};

use crate::models::game::PlayerState;
use crate::models::user::User;
use crate::game::celestial_bodies::CelestialBody;

/// キャッシュTTL設定
#[derive(Debug, Clone)]
pub struct CacheTtlConfig {
    pub player_state: Duration,
    pub user_session: Duration,
    pub celestial_bodies: Duration,
    pub game_stats: Duration,
    pub leaderboard: Duration,
}

impl Default for CacheTtlConfig {
    fn default() -> Self {
        Self {
            player_state: Duration::from_secs(300),      // 5分
            user_session: Duration::from_secs(3600),     // 1時間
            celestial_bodies: Duration::from_secs(60),   // 1分
            game_stats: Duration::from_secs(600),        // 10分
            leaderboard: Duration::from_secs(1800),      // 30分
        }
    }
}

/// キャッシュキーのプリフィックス
pub struct CacheKeys;

impl CacheKeys {
    pub const PLAYER_STATE: &'static str = "player_state";
    pub const USER_SESSION: &'static str = "user_session";
    pub const CELESTIAL_BODIES: &'static str = "celestial_bodies";
    pub const GAME_STATS: &'static str = "game_stats";
    pub const LEADERBOARD: &'static str = "leaderboard";
    pub const PHYSICS_STATE: &'static str = "physics_state";
}

/// Redis キャッシングサービス
#[derive(Clone)]
pub struct CacheService {
    client: Client,
    ttl_config: CacheTtlConfig,
}

impl CacheService {
    /// 新しいキャッシュサービスを作成
    pub fn new(redis_url: &str) -> Result<Self> {
        let client = Client::open(redis_url)?;
        Ok(Self {
            client,
            ttl_config: CacheTtlConfig::default(),
        })
    }

    /// TTL設定を更新
    pub fn with_ttl_config(mut self, ttl_config: CacheTtlConfig) -> Self {
        self.ttl_config = ttl_config;
        self
    }

    /// Redis接続を取得
    async fn get_connection(&self) -> RedisResult<redis::aio::Connection> {
        self.client.get_async_connection().await
    }

    /// キャッシュキーを生成
    fn cache_key(&self, prefix: &str, id: &str) -> String {
        format!("cosmic_gardener:{}:{}", prefix, id)
    }

    /// プレイヤー状態をキャッシュから取得
    #[instrument(skip(self), fields(player_id = %player_id))]
    pub async fn get_player_state(&self, player_id: Uuid) -> Result<Option<PlayerState>> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::PLAYER_STATE, &player_id.to_string());
        
        let cached_data: Option<String> = conn.get(&key).await?;
        
        if let Some(data) = cached_data {
            match serde_json::from_str::<PlayerState>(&data) {
                Ok(state) => {
                    debug!("Player state cache hit for {}", player_id);
                    Ok(Some(state))
                }
                Err(e) => {
                    warn!("Failed to deserialize cached player state: {}", e);
                    // 壊れたキャッシュを削除
                    let _: () = conn.del(&key).await?;
                    Ok(None)
                }
            }
        } else {
            debug!("Player state cache miss for {}", player_id);
            Ok(None)
        }
    }

    /// プレイヤー状態をキャッシュに保存
    #[instrument(skip(self, state), fields(player_id = %player_id))]
    pub async fn set_player_state(&self, player_id: Uuid, state: &PlayerState) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::PLAYER_STATE, &player_id.to_string());
        let serialized = serde_json::to_string(state)?;
        
        let ttl_secs = self.ttl_config.player_state.as_secs();
        let _: () = conn.setex(&key, ttl_secs, serialized).await?;
        
        debug!("Cached player state for {} (TTL: {}s)", player_id, ttl_secs);
        Ok(())
    }

    /// ユーザーセッションをキャッシュから取得
    #[instrument(skip(self), fields(session_id = %session_id))]
    pub async fn get_user_session(&self, session_id: &str) -> Result<Option<User>> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::USER_SESSION, session_id);
        
        let cached_data: Option<String> = conn.get(&key).await?;
        
        if let Some(data) = cached_data {
            match serde_json::from_str::<User>(&data) {
                Ok(user) => {
                    debug!("User session cache hit for {}", session_id);
                    Ok(Some(user))
                }
                Err(e) => {
                    warn!("Failed to deserialize cached user session: {}", e);
                    let _: () = conn.del(&key).await?;
                    Ok(None)
                }
            }
        } else {
            debug!("User session cache miss for {}", session_id);
            Ok(None)
        }
    }

    /// ユーザーセッションをキャッシュに保存
    #[instrument(skip(self, user), fields(session_id = %session_id))]
    pub async fn set_user_session(&self, session_id: &str, user: &User) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::USER_SESSION, session_id);
        let serialized = serde_json::to_string(user)?;
        
        let ttl_secs = self.ttl_config.user_session.as_secs();
        let _: () = conn.setex(&key, ttl_secs, serialized).await?;
        
        debug!("Cached user session for {} (TTL: {}s)", session_id, ttl_secs);
        Ok(())
    }

    /// セッションを無効化
    #[instrument(skip(self), fields(session_id = %session_id))]
    pub async fn invalidate_session(&self, session_id: &str) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::USER_SESSION, session_id);
        let _: () = conn.del(&key).await?;
        
        debug!("Invalidated session {}", session_id);
        Ok(())
    }

    /// 天体データをキャッシュから取得
    #[instrument(skip(self), fields(player_id = %player_id))]
    pub async fn get_celestial_bodies(&self, player_id: Uuid) -> Result<Option<Vec<CelestialBody>>> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::CELESTIAL_BODIES, &player_id.to_string());
        
        let cached_data: Option<String> = conn.get(&key).await?;
        
        if let Some(data) = cached_data {
            match serde_json::from_str::<Vec<CelestialBody>>(&data) {
                Ok(bodies) => {
                    debug!("Celestial bodies cache hit for {}", player_id);
                    Ok(Some(bodies))
                }
                Err(e) => {
                    warn!("Failed to deserialize cached celestial bodies: {}", e);
                    let _: () = conn.del(&key).await?;
                    Ok(None)
                }
            }
        } else {
            debug!("Celestial bodies cache miss for {}", player_id);
            Ok(None)
        }
    }

    /// 天体データをキャッシュに保存
    #[instrument(skip(self, bodies), fields(player_id = %player_id, body_count = bodies.len()))]
    pub async fn set_celestial_bodies(&self, player_id: Uuid, bodies: &[CelestialBody]) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::CELESTIAL_BODIES, &player_id.to_string());
        let serialized = serde_json::to_string(bodies)?;
        
        let ttl_secs = self.ttl_config.celestial_bodies.as_secs();
        let _: () = conn.setex(&key, ttl_secs, serialized).await?;
        
        debug!("Cached {} celestial bodies for {} (TTL: {}s)", bodies.len(), player_id, ttl_secs);
        Ok(())
    }

    /// ゲーム統計をキャッシュから取得
    #[instrument(skip(self))]
    pub async fn get_game_stats(&self) -> Result<Option<serde_json::Value>> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::GAME_STATS, "global");
        
        let cached_data: Option<String> = conn.get(&key).await?;
        
        if let Some(data) = cached_data {
            match serde_json::from_str::<serde_json::Value>(&data) {
                Ok(stats) => {
                    debug!("Game stats cache hit");
                    Ok(Some(stats))
                }
                Err(e) => {
                    warn!("Failed to deserialize cached game stats: {}", e);
                    let _: () = conn.del(&key).await?;
                    Ok(None)
                }
            }
        } else {
            debug!("Game stats cache miss");
            Ok(None)
        }
    }

    /// ゲーム統計をキャッシュに保存
    #[instrument(skip(self, stats))]
    pub async fn set_game_stats(&self, stats: &serde_json::Value) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::GAME_STATS, "global");
        let serialized = serde_json::to_string(stats)?;
        
        let ttl_secs = self.ttl_config.game_stats.as_secs();
        let _: () = conn.setex(&key, ttl_secs, serialized).await?;
        
        debug!("Cached game stats (TTL: {}s)", ttl_secs);
        Ok(())
    }

    /// リーダーボードをキャッシュから取得
    #[instrument(skip(self), fields(category = %category))]
    pub async fn get_leaderboard(&self, category: &str) -> Result<Option<serde_json::Value>> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::LEADERBOARD, category);
        
        let cached_data: Option<String> = conn.get(&key).await?;
        
        if let Some(data) = cached_data {
            match serde_json::from_str::<serde_json::Value>(&data) {
                Ok(leaderboard) => {
                    debug!("Leaderboard cache hit for {}", category);
                    Ok(Some(leaderboard))
                }
                Err(e) => {
                    warn!("Failed to deserialize cached leaderboard: {}", e);
                    let _: () = conn.del(&key).await?;
                    Ok(None)
                }
            }
        } else {
            debug!("Leaderboard cache miss for {}", category);
            Ok(None)
        }
    }

    /// リーダーボードをキャッシュに保存
    #[instrument(skip(self, leaderboard), fields(category = %category))]
    pub async fn set_leaderboard(&self, category: &str, leaderboard: &serde_json::Value) -> Result<()> {
        let mut conn = self.get_connection().await?;
        let key = self.cache_key(CacheKeys::LEADERBOARD, category);
        let serialized = serde_json::to_string(leaderboard)?;
        
        let ttl_secs = self.ttl_config.leaderboard.as_secs();
        let _: () = conn.setex(&key, ttl_secs, serialized).await?;
        
        debug!("Cached leaderboard for {} (TTL: {}s)", category, ttl_secs);
        Ok(())
    }

    /// 複数のキーを一括削除
    #[instrument(skip(self, keys))]
    pub async fn invalidate_keys(&self, keys: &[String]) -> Result<()> {
        if keys.is_empty() {
            return Ok(());
        }

        let mut conn = self.get_connection().await?;
        let _: () = conn.del(keys).await?;
        
        debug!("Invalidated {} cache keys", keys.len());
        Ok(())
    }

    /// プレイヤー関連のキャッシュを一括無効化
    #[instrument(skip(self), fields(player_id = %player_id))]
    pub async fn invalidate_player_cache(&self, player_id: Uuid) -> Result<()> {
        let keys = vec![
            self.cache_key(CacheKeys::PLAYER_STATE, &player_id.to_string()),
            self.cache_key(CacheKeys::CELESTIAL_BODIES, &player_id.to_string()),
        ];
        
        self.invalidate_keys(&keys).await?;
        debug!("Invalidated all cache for player {}", player_id);
        Ok(())
    }

    /// キャッシュ統計を取得
    #[instrument(skip(self))]
    pub async fn get_cache_stats(&self) -> Result<CacheStats> {
        let mut conn = self.get_connection().await?;
        
        let info: String = redis::cmd("INFO")
            .arg("stats")
            .query_async(&mut conn)
            .await?;
            
        let memory_info: String = redis::cmd("INFO")
            .arg("memory")
            .query_async(&mut conn)
            .await?;
        
        Ok(CacheStats::parse_from_redis_info(&info, &memory_info))
    }

    /// 接続をテスト
    #[instrument(skip(self))]
    pub async fn health_check(&self) -> Result<bool> {
        let mut conn = self.get_connection().await?;
        let response: String = redis::cmd("PING").query_async(&mut conn).await?;
        Ok(response == "PONG")
    }
}

/// キャッシュ統計情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub keyspace_hits: u64,
    pub keyspace_misses: u64,
    pub hit_rate: f64,
    pub used_memory_bytes: u64,
    pub used_memory_human: String,
    pub connected_clients: u32,
}

impl CacheStats {
    fn parse_from_redis_info(stats_info: &str, memory_info: &str) -> Self {
        let mut keyspace_hits = 0u64;
        let mut keyspace_misses = 0u64;
        let mut used_memory_bytes = 0u64;
        let mut used_memory_human = String::new();
        let mut connected_clients = 0u32;

        // 統計情報をパース
        for line in stats_info.lines() {
            if line.starts_with("keyspace_hits:") {
                keyspace_hits = line.split(':').nth(1).unwrap_or("0").parse().unwrap_or(0);
            } else if line.starts_with("keyspace_misses:") {
                keyspace_misses = line.split(':').nth(1).unwrap_or("0").parse().unwrap_or(0);
            } else if line.starts_with("connected_clients:") {
                connected_clients = line.split(':').nth(1).unwrap_or("0").parse().unwrap_or(0);
            }
        }

        // メモリ情報をパース
        for line in memory_info.lines() {
            if line.starts_with("used_memory:") {
                used_memory_bytes = line.split(':').nth(1).unwrap_or("0").parse().unwrap_or(0);
            } else if line.starts_with("used_memory_human:") {
                used_memory_human = line.split(':').nth(1).unwrap_or("").to_string();
            }
        }

        let total_requests = keyspace_hits + keyspace_misses;
        let hit_rate = if total_requests > 0 {
            keyspace_hits as f64 / total_requests as f64
        } else {
            0.0
        };

        Self {
            keyspace_hits,
            keyspace_misses,
            hit_rate,
            used_memory_bytes,
            used_memory_human,
            connected_clients,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_cache_stats_parsing() {
        let stats_info = r#"
# Stats
keyspace_hits:1000
keyspace_misses:200
connected_clients:5
"#;
        
        let memory_info = r#"
# Memory
used_memory:1048576
used_memory_human:1.00M
"#;

        let stats = CacheStats::parse_from_redis_info(stats_info, memory_info);
        
        assert_eq!(stats.keyspace_hits, 1000);
        assert_eq!(stats.keyspace_misses, 200);
        assert_eq!(stats.connected_clients, 5);
        assert_eq!(stats.used_memory_bytes, 1048576);
        assert_eq!(stats.used_memory_human, "1.00M");
        assert!((stats.hit_rate - 0.8333333333333334).abs() < f64::EPSILON);
    }
}