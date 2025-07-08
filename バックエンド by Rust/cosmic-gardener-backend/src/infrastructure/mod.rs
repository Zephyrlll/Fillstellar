//! # Infrastructure Layer
//!
//! インフラストラクチャ層は、外部システムとの連携を担います。
//! データベース、キャッシュ、外部API、WebSocketなどの技術的詳細を実装します。
//!
//! ## 構成
//!
//! - **database**: データベースアクセス
//! - **cache**: キャッシュサービス
//! - **websocket**: WebSocket通信
//! - **external_apis**: 外部API連携
//! - **messaging**: メッセージング
//! - **monitoring**: 監視・メトリクス

use crate::shared::Result;

pub mod cache;
pub mod database;
pub mod external_apis;
pub mod messaging;
pub mod monitoring;
pub mod websocket;

/// インフラストラクチャの初期化
pub async fn initialize() -> Result<()> {
    // データベースの初期化
    database::initialize().await?;
    
    // キャッシュの初期化
    cache::initialize().await?;
    
    // WebSocketサービスの初期化
    websocket::initialize().await?;
    
    // 監視システムの初期化
    monitoring::initialize().await?;
    
    tracing::info!("Infrastructure layer initialized successfully");
    Ok(())
}

/// インフラストラクチャのクリーンアップ
pub async fn cleanup() -> Result<()> {
    // 各サービスのクリーンアップ
    database::cleanup().await?;
    cache::cleanup().await?;
    websocket::cleanup().await?;
    monitoring::cleanup().await?;
    
    tracing::info!("Infrastructure layer cleanup completed");
    Ok(())
}