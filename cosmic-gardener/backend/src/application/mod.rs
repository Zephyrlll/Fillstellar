//! # Application Layer
//!
//! アプリケーション層は、ユースケースの実装を担います。
//! ドメインロジックを調整し、外部システムとの連携を管理します。
//!
//! ## 構成
//!
//! - **commands**: コマンドハンドラー（書き込み操作）
//! - **queries**: クエリハンドラー（読み取り操作）
//! - **services**: アプリケーションサービス
//! - **dtos**: データ転送オブジェクト
//! - **handlers**: 統合ハンドラー

pub mod commands;
pub mod dtos;
pub mod handlers;
pub mod queries;
pub mod services;

// Re-exports
pub use commands::*;
pub use dtos::*;
pub use handlers::*;
pub use queries::*;
pub use services::*;