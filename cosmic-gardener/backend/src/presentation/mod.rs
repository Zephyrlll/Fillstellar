//! # Presentation Layer
//!
//! プレゼンテーション層は、外部とのインターフェースを担います。
//! HTTP API、WebSocket、GraphQLなどの通信プロトコルを実装します。
//!
//! ## 構成
//!
//! - **controllers**: HTTPコントローラー
//! - **middleware**: ミドルウェア
//! - **websocket_handlers**: WebSocketハンドラー
//! - **routes**: ルーティング設定

pub mod controllers;
pub mod middleware;
pub mod routes;
pub mod websocket_handlers;

// Re-exports
pub use controllers::*;
pub use middleware::*;
pub use routes::*;
pub use websocket_handlers::*;