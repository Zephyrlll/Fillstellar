//! # Shared Layer
//!
//! 共有レイヤーは、アプリケーション全体で使用される
//! 共通の機能とユーティリティを提供します。
//!
//! ## 構成
//!
//! - **config**: 設定管理
//! - **errors**: エラーハンドリング
//! - **types**: 共通型定義
//! - **utils**: ユーティリティ関数
//! - **constants**: 定数定義

pub mod config;
pub mod constants;
pub mod errors;
pub mod logging;
pub mod types;
pub mod utils;

// Re-exports
pub use config::*;
pub use constants::*;
pub use errors::*;
pub use types::*;
pub use utils::*;