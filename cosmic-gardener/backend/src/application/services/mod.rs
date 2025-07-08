//! # Application Services
//!
//! アプリケーションサービスは、複数のドメインサービスを
//! 協調させて、ユースケースを実現します。

use crate::infrastructure::{
    cache::CacheService,
    database::DatabaseService,
    websocket::WebSocketService,
};
use crate::shared::{config::Config, Result};
use std::sync::Arc;

pub mod celestial_body_service;
pub mod game_session_service;
pub mod physics_service;
pub mod player_service;

// Re-exports
pub use celestial_body_service::*;
pub use game_session_service::*;
pub use physics_service::*;
pub use player_service::*;

/// アプリケーション全体の状態を管理
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub database: Arc<DatabaseService>,
    pub cache: Arc<CacheService>,
    pub websocket: Arc<WebSocketService>,
    pub physics: Arc<PhysicsService>,
    pub player_service: Arc<PlayerService>,
    pub celestial_body_service: Arc<CelestialBodyService>,
    pub game_session_service: Arc<GameSessionService>,
}

impl AppState {
    /// 新しいアプリケーション状態を作成
    pub async fn new() -> Result<Self> {
        let config = Arc::new(Config::load()?);
        
        // インフラストラクチャサービスの初期化
        let database = Arc::new(DatabaseService::new(&config).await?);
        let cache = Arc::new(CacheService::new(&config).await?);
        let websocket = Arc::new(WebSocketService::new(&config).await?);
        
        // アプリケーションサービスの初期化
        let physics = Arc::new(PhysicsService::new(&config)?);
        let player_service = Arc::new(PlayerService::new(
            database.clone(),
            cache.clone(),
        )?);
        let celestial_body_service = Arc::new(CelestialBodyService::new(
            database.clone(),
            cache.clone(),
            physics.clone(),
        )?);
        let game_session_service = Arc::new(GameSessionService::new(
            database.clone(),
            cache.clone(),
            websocket.clone(),
            physics.clone(),
        )?);
        
        Ok(Self {
            config,
            database,
            cache,
            websocket,
            physics,
            player_service,
            celestial_body_service,
            game_session_service,
        })
    }
    
    /// ヘルスチェック
    pub async fn health_check(&self) -> Result<()> {
        // データベースの接続確認
        self.database.health_check().await?;
        
        // キャッシュの接続確認
        self.cache.health_check().await?;
        
        // WebSocketサービスの確認
        self.websocket.health_check().await?;
        
        Ok(())
    }
}