//! # Domain Entities
//!
//! ドメインエンティティは、ビジネスの中核となるオブジェクトです。
//! 一意の識別子を持ち、ライフサイクルを通じて追跡されます。

pub mod celestial_body;
pub mod game_save;
pub mod life_form;
pub mod player;
pub mod research;
pub mod resource;

// Re-exports
pub use celestial_body::*;
pub use game_save::*;
pub use life_form::*;
pub use player::*;
pub use research::*;
pub use resource::*;