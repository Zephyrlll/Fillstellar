//! # Cosmic Gardener Backend
//!
//! 高性能な3D宇宙アイドルゲームのバックエンドサーバー
//!
//! ## アーキテクチャ
//!
//! このプロジェクトはクリーンアーキテクチャに基づいて設計されています：
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                    Presentation Layer                        │
//! │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
//! │  │   Controllers   │  │   Middleware    │  │   WebSocket     │ │
//! │  │                 │  │                 │  │   Handlers      │ │
//! │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
//! └─────────────────────────────────────────────────────────────┘
//! ┌─────────────────────────────────────────────────────────────┐
//! │                    Application Layer                         │
//! │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
//! │  │    Commands     │  │    Queries      │  │    Services     │ │
//! │  │                 │  │                 │  │                 │ │
//! │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
//! └─────────────────────────────────────────────────────────────┘
//! ┌─────────────────────────────────────────────────────────────┐
//! │                     Domain Layer                            │
//! │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
//! │  │    Entities     │  │    Services     │  │  Repositories   │ │
//! │  │                 │  │                 │  │  (Interfaces)   │ │
//! │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
//! └─────────────────────────────────────────────────────────────┘
//! ┌─────────────────────────────────────────────────────────────┐
//! │                   Infrastructure Layer                       │
//! │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
//! │  │    Database     │  │     Cache       │  │   External      │ │
//! │  │                 │  │                 │  │     APIs        │ │
//! │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
//! └─────────────────────────────────────────────────────────────┘
//! ```
//!
//! ## 主要機能
//!
//! - **高性能物理シミュレーション**: N体問題の最適化実装
//! - **リアルタイム通信**: WebSocketによる双方向通信
//! - **スケーラブルアーキテクチャ**: 水平スケーリング対応
//! - **空間データ最適化**: PostGIS + R-tree索引
//! - **チート検出**: 統計的異常検知
//! - **モニタリング**: OpenTelemetry + Prometheus

pub mod application;
pub mod background;
pub mod domain;
pub mod infrastructure;
pub mod presentation;
pub mod shared;

// Re-exports for convenience
pub use shared::{
    config::Config,
    errors::{Error, Result},
    types::*,
};

/// アプリケーションのバージョン情報
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// アプリケーションの名前
pub const APP_NAME: &str = env!("CARGO_PKG_NAME");

/// アプリケーションの説明
pub const APP_DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");

/// アプリケーションの初期化
pub async fn initialize() -> Result<()> {
    // ログの初期化
    shared::logging::init_logging()?;
    
    // 設定の読み込み
    let _config = Config::load()?;
    
    // データベースの初期化
    infrastructure::database::initialize().await?;
    
    // キャッシュの初期化
    infrastructure::cache::initialize().await?;
    
    // メトリクスの初期化
    infrastructure::monitoring::initialize().await?;
    
    tracing::info!(
        version = VERSION,
        app_name = APP_NAME,
        "Cosmic Gardener Backend initialized successfully"
    );
    
    Ok(())
}

/// アプリケーションのクリーンアップ
pub async fn cleanup() -> Result<()> {
    tracing::info!("Shutting down Cosmic Gardener Backend");
    
    // データベース接続のクリーンアップ
    infrastructure::database::cleanup().await?;
    
    // キャッシュのクリーンアップ
    infrastructure::cache::cleanup().await?;
    
    // バックグラウンドタスクの停止
    background::shutdown().await?;
    
    tracing::info!("Cosmic Gardener Backend shutdown completed");
    
    Ok(())
}

/// テスト用のセットアップ
#[cfg(test)]
pub mod test_utils {
    use super::*;
    
    /// テスト用のアプリケーション初期化
    pub async fn setup_test_app() -> Result<()> {
        // テスト用のログ設定
        let _ = tracing_subscriber::fmt::try_init();
        
        // テスト用のデータベース設定
        infrastructure::database::setup_test().await?;
        
        Ok(())
    }
    
    /// テスト用のクリーンアップ
    pub async fn cleanup_test_app() -> Result<()> {
        infrastructure::database::cleanup_test().await?;
        Ok(())
    }
}