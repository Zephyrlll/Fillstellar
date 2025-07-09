//! Cosmic Gardener Backend
//! 
//! A high-performance backend for the Cosmic Gardener idle game.

pub mod game;
pub mod errors;
pub mod websocket_messages;
pub mod websocket_handler;

pub use game::*;
pub use errors::*;
pub use websocket_messages::*;
pub use websocket_handler::*;

/// Application version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Application name
pub const APP_NAME: &str = env!("CARGO_PKG_NAME");

/// Application description
pub const APP_DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");