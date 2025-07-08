//! # Configuration Management
//!
//! アプリケーション設定の管理を行います。

use serde::{Deserialize, Serialize};
use std::env;

/// アプリケーション設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub cache: CacheConfig,
    pub logging: LoggingConfig,
    pub physics: PhysicsConfig,
    pub websocket: WebSocketConfig,
    pub security: SecurityConfig,
    pub monitoring: MonitoringConfig,
}

/// サーバー設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: usize,
    pub keep_alive: u64,
    pub client_timeout: u64,
    pub max_payload_size: usize,
}

/// データベース設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub max_lifetime: u64,
    pub idle_timeout: u64,
    pub slow_query_threshold: u64,
}

/// キャッシュ設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub redis_url: String,
    pub max_connections: u32,
    pub connection_timeout: u64,
    pub default_ttl: u64,
    pub max_pool_size: usize,
}

/// ログ設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
    pub output: String,
    pub file_path: Option<String>,
    pub max_file_size: Option<u64>,
    pub max_files: Option<u32>,
}

/// 物理シミュレーション設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicsConfig {
    pub gravity_constant: f64,
    pub time_step: f64,
    pub max_bodies_per_simulation: usize,
    pub spatial_grid_size: f64,
    pub collision_detection_enabled: bool,
    pub n_body_optimization: bool,
}

/// WebSocket設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub max_connections: usize,
    pub heartbeat_interval: u64,
    pub client_timeout: u64,
    pub message_size_limit: usize,
    pub rate_limit: u32,
}

/// セキュリティ設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub jwt_secret: String,
    pub jwt_expiration: u64,
    pub bcrypt_cost: u32,
    pub rate_limit_requests: u32,
    pub rate_limit_window: u64,
    pub cors_origins: Vec<String>,
}

/// 監視設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub metrics_enabled: bool,
    pub metrics_port: u16,
    pub tracing_enabled: bool,
    pub jaeger_endpoint: Option<String>,
    pub prometheus_endpoint: Option<String>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
                workers: num_cpus::get(),
                keep_alive: 30,
                client_timeout: 60,
                max_payload_size: 4 * 1024 * 1024, // 4MB
            },
            database: DatabaseConfig {
                url: "postgresql://postgres:password@localhost/cosmic_gardener".to_string(),
                max_connections: 10,
                min_connections: 1,
                max_lifetime: 3600,
                idle_timeout: 600,
                slow_query_threshold: 1000,
            },
            cache: CacheConfig {
                redis_url: "redis://localhost:6379".to_string(),
                max_connections: 10,
                connection_timeout: 5,
                default_ttl: 3600,
                max_pool_size: 20,
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                format: "json".to_string(),
                output: "stdout".to_string(),
                file_path: None,
                max_file_size: Some(100 * 1024 * 1024), // 100MB
                max_files: Some(5),
            },
            physics: PhysicsConfig {
                gravity_constant: 6.67430e-11,
                time_step: 0.016, // 60 FPS
                max_bodies_per_simulation: 10000,
                spatial_grid_size: 1000.0,
                collision_detection_enabled: true,
                n_body_optimization: true,
            },
            websocket: WebSocketConfig {
                max_connections: 10000,
                heartbeat_interval: 30,
                client_timeout: 60,
                message_size_limit: 64 * 1024, // 64KB
                rate_limit: 100,
            },
            security: SecurityConfig {
                jwt_secret: "your-secret-key-here".to_string(),
                jwt_expiration: 86400, // 24 hours
                bcrypt_cost: 12,
                rate_limit_requests: 100,
                rate_limit_window: 60,
                cors_origins: vec!["http://localhost:3000".to_string()],
            },
            monitoring: MonitoringConfig {
                metrics_enabled: true,
                metrics_port: 9090,
                tracing_enabled: true,
                jaeger_endpoint: Some("http://localhost:14268".to_string()),
                prometheus_endpoint: Some("http://localhost:9090".to_string()),
            },
        }
    }
}

impl Config {
    /// 設定を読み込み
    pub fn load() -> Result<Self, config::ConfigError> {
        let mut settings = config::Config::builder()
            .add_source(config::File::with_name("config/default").required(false))
            .add_source(config::File::with_name("config/local").required(false))
            .add_source(config::Environment::with_prefix("COSMIC_GARDENER"))
            .build()?;
        
        // 環境変数から設定を上書き
        if let Ok(database_url) = env::var("DATABASE_URL") {
            settings.set("database.url", database_url)?;
        }
        
        if let Ok(redis_url) = env::var("REDIS_URL") {
            settings.set("cache.redis_url", redis_url)?;
        }
        
        if let Ok(jwt_secret) = env::var("JWT_SECRET") {
            settings.set("security.jwt_secret", jwt_secret)?;
        }
        
        if let Ok(port) = env::var("PORT") {
            if let Ok(port_num) = port.parse::<u16>() {
                settings.set("server.port", port_num)?;
            }
        }
        
        settings.try_deserialize()
    }
    
    /// 設定をファイルに保存
    pub fn save_to_file(&self, path: &str) -> Result<(), std::io::Error> {
        let yaml = serde_yaml::to_string(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        std::fs::write(path, yaml)
    }
    
    /// 開発環境用の設定を取得
    #[cfg(debug_assertions)]
    pub fn development() -> Self {
        Self {
            logging: LoggingConfig {
                level: "debug".to_string(),
                format: "pretty".to_string(),
                ..Default::default().logging
            },
            security: SecurityConfig {
                jwt_secret: "dev-secret-key".to_string(),
                cors_origins: vec!["*".to_string()],
                ..Default::default().security
            },
            ..Default::default()
        }
    }
    
    /// 本番環境用の設定を取得
    #[cfg(not(debug_assertions))]
    pub fn production() -> Self {
        Self {
            logging: LoggingConfig {
                level: "warn".to_string(),
                format: "json".to_string(),
                output: "file".to_string(),
                file_path: Some("/var/log/cosmic-gardener/app.log".to_string()),
                ..Default::default().logging
            },
            server: ServerConfig {
                workers: num_cpus::get() * 2,
                ..Default::default().server
            },
            database: DatabaseConfig {
                max_connections: 50,
                ..Default::default().database
            },
            ..Default::default()
        }
    }
    
    /// 設定の妥当性をチェック
    pub fn validate(&self) -> Result<(), String> {
        if self.server.port == 0 {
            return Err("Server port cannot be 0".to_string());
        }
        
        if self.database.max_connections == 0 {
            return Err("Database max_connections cannot be 0".to_string());
        }
        
        if self.security.jwt_secret.is_empty() {
            return Err("JWT secret cannot be empty".to_string());
        }
        
        if self.security.jwt_secret == "your-secret-key-here" {
            return Err("JWT secret must be changed from default".to_string());
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.database.max_connections, 10);
    }
    
    #[test]
    fn test_config_validation() {
        let mut config = Config::default();
        assert!(config.validate().is_err()); // デフォルトのJWT秘密鍵
        
        config.security.jwt_secret = "test-secret-key".to_string();
        assert!(config.validate().is_ok());
    }
    
    #[test]
    fn test_config_serialization() {
        let config = Config::default();
        let yaml = serde_yaml::to_string(&config).unwrap();
        let _deserialized: Config = serde_yaml::from_str(&yaml).unwrap();
    }
}