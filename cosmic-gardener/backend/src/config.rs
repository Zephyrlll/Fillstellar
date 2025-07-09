use serde::{Deserialize, Serialize};
use std::env;
use std::time::Duration;

use crate::services::metrics::MetricsConfig;
use crate::services::cache::CacheTtlConfig;
use crate::services::database_pool::DatabasePoolConfig;
use crate::services::logging::LoggingConfig;
use crate::services::websocket::compression::CompressionConfig;
use crate::services::secrets::{SecretsConfig, SecretsProvider, load_production_config, load_development_config};
use crate::game::physics_simd::SimdPhysicsConfig;
use crate::game::concurrent_game_loop::GameLoopConfig;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    // 基本設定
    pub database_url: String,
    pub jwt_secret: String,
    pub server_host: String,
    pub server_port: u16,
    pub cors_allowed_origins: Vec<String>,
    
    // Redis設定
    pub redis_url: String,
    pub redis_pool_size: u32,
    pub cache_enabled: bool,
    
    // メトリクス設定
    pub metrics_enabled: bool,
    pub metrics_namespace: String,
    pub metrics_endpoint: String,
    
    // 詳細設定
    pub metrics: MetricsConfig,
    pub cache: CacheTtlConfig,
    pub database_pool: DatabasePoolConfig,
    pub logging: LoggingConfig,
    pub compression: CompressionConfig,
    pub physics: SimdPhysicsConfig,
    pub game_loop: GameLoopConfig,
    pub secrets: SecretsConfig,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        Ok(Self {
            // 基本設定
            database_url: env::var("DATABASE_URL")?,
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| {
                "your-secret-key-here-change-in-production".to_string()
            }),
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .unwrap_or(8080),
            cors_allowed_origins: env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:3000,http://localhost:8000".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
            
            // Redis設定
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            redis_pool_size: env::var("REDIS_POOL_SIZE")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .unwrap_or(10),
            cache_enabled: env::var("CACHE_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            
            // メトリクス設定
            metrics_enabled: env::var("METRICS_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            metrics_namespace: env::var("METRICS_NAMESPACE")
                .unwrap_or_else(|_| "cosmic_gardener".to_string()),
            metrics_endpoint: env::var("METRICS_ENDPOINT")
                .unwrap_or_else(|_| "/metrics".to_string()),
            
            // 詳細設定（デフォルト値使用）
            metrics: MetricsConfig::default(),
            cache: CacheTtlConfig::default(),
            database_pool: DatabasePoolConfig::default(),
            logging: LoggingConfig::default(),
            compression: CompressionConfig::default(),
            physics: SimdPhysicsConfig::default(),
            game_loop: GameLoopConfig::default(),
            secrets: SecretsConfig::default(),
        })
    }

    /// 設定ファイルから読み込み
    pub fn from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Self = toml::from_str(&content)?;
        Ok(config)
    }

    /// 設定ファイルに保存
    pub fn save_to_file(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let content = toml::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// セキュアな設定ローダー（本番環境用）
    pub async fn load_secure() -> Result<Self, Box<dyn std::error::Error>> {
        let environment = env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string());
        
        match environment.as_str() {
            "production" => {
                let secrets = load_production_config().await?;
                Self::from_secrets(secrets)
            }
            "development" => {
                let secrets = load_development_config().await?;
                Self::from_secrets(secrets)
            }
            _ => {
                // Fallback to environment variables
                Ok(Self::from_env()?)
            }
        }
    }

    /// シークレットマップから設定を生成
    fn from_secrets(secrets: std::collections::HashMap<String, String>) -> Result<Self, Box<dyn std::error::Error>> {
        // 環境変数を一時的に設定
        for (key, value) in &secrets {
            env::set_var(key, value);
        }
        
        // 通常の設定読み込み
        let config = Self::from_env()?;
        
        // 機密情報をログに出力しないよう注意
        tracing::info!("Configuration loaded from secure sources");
        
        Ok(config)
    }

    /// 環境変数で設定を上書き
    pub fn override_with_env(&mut self) {
        // 物理演算設定
        if let Ok(simd_threshold) = env::var("PHYSICS_SIMD_THRESHOLD") {
            if let Ok(val) = simd_threshold.parse() {
                self.physics.simd_threshold = val;
            }
        }
        
        if let Ok(direct_threshold) = env::var("PHYSICS_DIRECT_THRESHOLD") {
            if let Ok(val) = direct_threshold.parse() {
                self.physics.direct_threshold = val;
            }
        }
        
        // ゲームループ設定
        if let Ok(target_tps) = env::var("GAME_LOOP_TARGET_TPS") {
            if let Ok(val) = target_tps.parse() {
                self.game_loop.target_tps = val;
            }
        }
        
        if let Ok(max_bodies) = env::var("GAME_LOOP_MAX_BODIES") {
            if let Ok(val) = max_bodies.parse() {
                self.game_loop.max_celestial_bodies = val;
            }
        }
        
        // データベースプール設定
        if let Ok(pool_size) = env::var("DB_POOL_MAX_SIZE") {
            if let Ok(val) = pool_size.parse() {
                self.database_pool.max_size = val;
            }
        }
        
        if let Ok(timeout) = env::var("DB_POOL_TIMEOUT") {
            if let Ok(val) = timeout.parse() {
                self.database_pool.timeouts.wait_for_connection_secs = val;
            }
        }
        
        // 圧縮設定
        if let Ok(algorithm) = env::var("COMPRESSION_ALGORITHM") {
            self.compression.algorithm = match algorithm.to_lowercase().as_str() {
                "lz4" => crate::services::websocket::compression::CompressionAlgorithm::Lz4,
                "zlib" => crate::services::websocket::compression::CompressionAlgorithm::Zlib,
                "none" => crate::services::websocket::compression::CompressionAlgorithm::None,
                _ => self.compression.algorithm,
            };
        }
        
        if let Ok(threshold) = env::var("COMPRESSION_THRESHOLD") {
            if let Ok(val) = threshold.parse() {
                self.compression.min_size_threshold = val;
            }
        }
        
        // ログ設定
        if let Ok(log_level) = env::var("LOG_LEVEL") {
            self.logging.level = log_level;
        }
        
        if let Ok(log_format) = env::var("LOG_FORMAT") {
            self.logging.format = match log_format.to_lowercase().as_str() {
                "json" => crate::services::logging::LogFormat::Json,
                "pretty" => crate::services::logging::LogFormat::Pretty,
                "compact" => crate::services::logging::LogFormat::Compact,
                _ => self.logging.format,
            };
        }
    }

    /// 設定の妥当性チェック
    pub fn validate(&self) -> Result<(), ConfigValidationError> {
        // 基本設定の検証
        if self.database_url.is_empty() {
            return Err(ConfigValidationError::InvalidDatabaseUrl);
        }
        
        if self.jwt_secret.len() < 32 {
            return Err(ConfigValidationError::WeakJwtSecret);
        }
        
        if self.server_port == 0 {
            return Err(ConfigValidationError::InvalidPort);
        }
        
        // データベースプール設定の検証
        if self.database_pool.max_size == 0 {
            return Err(ConfigValidationError::InvalidPoolSize);
        }
        
        if self.database_pool.timeouts.wait_for_connection_secs == 0 {
            return Err(ConfigValidationError::InvalidTimeout);
        }
        
        // 物理演算設定の検証
        if self.physics.simd_threshold > self.physics.direct_threshold {
            return Err(ConfigValidationError::InvalidPhysicsThreshold);
        }
        
        // ゲームループ設定の検証
        if self.game_loop.target_tps == 0 {
            return Err(ConfigValidationError::InvalidTargetTps);
        }
        
        if self.game_loop.max_celestial_bodies == 0 {
            return Err(ConfigValidationError::InvalidMaxBodies);
        }
        
        Ok(())
    }

    /// 開発環境用設定を取得
    pub fn development() -> Self {
        let mut config = Self::from_env().unwrap_or_else(|_| {
            Self {
                database_url: "postgresql://dev:dev@localhost:5432/cosmic_gardener_dev".to_string(),
                jwt_secret: "development-jwt-secret-key-32-chars-long".to_string(),
                server_host: "127.0.0.1".to_string(),
                server_port: 8080,
                cors_allowed_origins: vec![
                    "http://localhost:3000".to_string(),
                    "http://localhost:8000".to_string(),
                ],
                redis_url: "redis://localhost:6379".to_string(),
                redis_pool_size: 10,
                cache_enabled: true,
                metrics_enabled: true,
                metrics_namespace: "cosmic_gardener_dev".to_string(),
                metrics_endpoint: "/metrics".to_string(),
                metrics: MetricsConfig::default(),
                cache: CacheTtlConfig::default(),
                database_pool: DatabasePoolConfig::default(),
                logging: LoggingConfig::default(),
                compression: CompressionConfig::default(),
                physics: SimdPhysicsConfig::default(),
                game_loop: GameLoopConfig::default(),
                secrets: SecretsConfig::default(),
            }
        });
        
        // 開発環境向けの調整
        config.logging.level = "debug".to_string();
        config.game_loop.target_tps = 60;
        config.physics.simd_threshold = 8; // 開発環境では低く設定
        config.database_pool.max_size = 5; // 開発環境では少なく設定
        
        config
    }

    /// 本番環境用設定を取得
    pub fn production() -> Self {
        let mut config = Self::from_env().expect("Production environment variables not set");
        
        // 本番環境向けの調整
        config.logging.level = "info".to_string();
        config.game_loop.target_tps = 60;
        config.physics.simd_threshold = 16;
        config.database_pool.max_size = 20;
        config.compression.enable_adaptive = true;
        config.secrets.provider = SecretsProvider::Mixed;
        
        config
    }

    /// テスト環境用設定を取得
    pub fn test() -> Self {
        Self {
            database_url: "postgresql://test:test@localhost:5432/cosmic_gardener_test".to_string(),
            jwt_secret: "test-jwt-secret-key-32-characters-long".to_string(),
            server_host: "127.0.0.1".to_string(),
            server_port: 0, // テストでは動的ポート
            cors_allowed_origins: vec!["http://localhost:3000".to_string()],
            redis_url: "redis://localhost:6379/1".to_string(), // テスト用DB
            redis_pool_size: 5,
            cache_enabled: true,
            metrics_enabled: false, // テストではメトリクス無効
            metrics_namespace: "cosmic_gardener_test".to_string(),
            metrics_endpoint: "/metrics".to_string(),
            metrics: MetricsConfig::default(),
            cache: CacheTtlConfig::default(),
            database_pool: DatabasePoolConfig::default(),
            logging: LoggingConfig::default(),
            compression: CompressionConfig::default(),
            physics: SimdPhysicsConfig::default(),
            game_loop: GameLoopConfig::default(),
            secrets: SecretsConfig::default(),
        }
    }
}

/// 設定検証エラー
#[derive(Debug, thiserror::Error)]
pub enum ConfigValidationError {
    #[error("Invalid database URL")]
    InvalidDatabaseUrl,
    
    #[error("JWT secret is too weak (must be at least 32 characters)")]
    WeakJwtSecret,
    
    #[error("Invalid server port")]
    InvalidPort,
    
    #[error("Invalid database pool size")]
    InvalidPoolSize,
    
    #[error("Invalid timeout configuration")]
    InvalidTimeout,
    
    #[error("Invalid physics threshold configuration")]
    InvalidPhysicsThreshold,
    
    #[error("Invalid target TPS")]
    InvalidTargetTps,
    
    #[error("Invalid maximum celestial bodies")]
    InvalidMaxBodies,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_validation_valid() {
        let config = Config::test();
        assert!(config.validate().is_ok());
    }
    
    #[test]
    fn test_config_validation_weak_jwt() {
        let mut config = Config::test();
        config.jwt_secret = "weak".to_string();
        
        let result = config.validate();
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ConfigValidationError::WeakJwtSecret));
    }
    
    #[test]
    fn test_config_validation_invalid_pool_size() {
        let mut config = Config::test();
        config.database_pool.max_size = 0;
        
        let result = config.validate();
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ConfigValidationError::InvalidPoolSize));
    }
    
    #[test]
    fn test_config_validation_invalid_physics_threshold() {
        let mut config = Config::test();
        config.physics.simd_threshold = 100;
        config.physics.direct_threshold = 50;
        
        let result = config.validate();
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ConfigValidationError::InvalidPhysicsThreshold));
    }
    
    #[test]
    fn test_config_from_env_override() {
        let mut config = Config::test();
        
        // 環境変数をモック
        std::env::set_var("PHYSICS_SIMD_THRESHOLD", "32");
        std::env::set_var("GAME_LOOP_TARGET_TPS", "120");
        std::env::set_var("DB_POOL_MAX_SIZE", "50");
        std::env::set_var("COMPRESSION_ALGORITHM", "zlib");
        std::env::set_var("LOG_LEVEL", "warn");
        
        config.override_with_env();
        
        assert_eq!(config.physics.simd_threshold, 32);
        assert_eq!(config.game_loop.target_tps, 120);
        assert_eq!(config.database_pool.max_size, 50);
        assert!(matches!(config.compression.algorithm, crate::services::websocket::compression::CompressionAlgorithm::Zlib));
        assert_eq!(config.logging.level, "warn");
        
        // 環境変数をクリア
        std::env::remove_var("PHYSICS_SIMD_THRESHOLD");
        std::env::remove_var("GAME_LOOP_TARGET_TPS");
        std::env::remove_var("DB_POOL_MAX_SIZE");
        std::env::remove_var("COMPRESSION_ALGORITHM");
        std::env::remove_var("LOG_LEVEL");
    }
    
    #[test]
    fn test_config_environments() {
        let dev_config = Config::development();
        assert_eq!(dev_config.logging.level, "debug");
        assert_eq!(dev_config.physics.simd_threshold, 8);
        assert_eq!(dev_config.database_pool.max_size, 5);
        
        let prod_config = Config::production();
        assert_eq!(prod_config.logging.level, "info");
        assert_eq!(prod_config.physics.simd_threshold, 16);
        assert_eq!(prod_config.database_pool.max_size, 20);
        assert!(prod_config.compression.enable_adaptive);
        
        let test_config = Config::test();
        assert_eq!(test_config.server_port, 0);
        assert!(!test_config.metrics_enabled);
        assert!(test_config.redis_url.ends_with("/1"));
    }
}
}