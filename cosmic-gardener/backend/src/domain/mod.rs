//! # Domain Layer
//!
//! ドメイン層はビジネスロジックの中核を担います。
//! 外部の技術的な詳細に依存しない純粋なビジネスルールを定義します。
//!
//! ## 構成
//!
//! - **entities**: ドメインオブジェクトの定義
//! - **services**: ドメインサービスの実装
//! - **repositories**: データアクセスのインターフェース
//! - **value_objects**: 値オブジェクトの定義
//! - **events**: ドメインイベントの定義

pub mod entities;
pub mod events;
pub mod repositories;
pub mod services;
pub mod value_objects;

// Re-exports for convenience
pub use entities::*;
pub use events::*;
pub use repositories::*;
pub use services::*;
pub use value_objects::*;