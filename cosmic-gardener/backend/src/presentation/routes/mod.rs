//! # Routes Configuration
//!
//! APIルートの設定を行います。

use actix_web::{web, HttpResponse, Result};
use crate::application::services::AppState;

pub mod auth;
pub mod celestial_bodies;
pub mod game_sessions;
pub mod players;
pub mod websocket;

/// ルートの設定
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        // ヘルスチェック
        .route("/health", web::get().to(health_check))
        // API v1
        .service(
            web::scope("/api/v1")
                .configure(auth::configure)
                .configure(players::configure)
                .configure(celestial_bodies::configure)
                .configure(game_sessions::configure)
        )
        // WebSocket
        .service(
            web::scope("/ws")
                .configure(websocket::configure)
        );
}

/// ヘルスチェックエンドポイント
async fn health_check(app_state: web::Data<AppState>) -> Result<HttpResponse> {
    match app_state.health_check().await {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "status": "healthy",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "version": env!("CARGO_PKG_VERSION")
        }))),
        Err(e) => Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "status": "unhealthy",
            "error": e.to_string(),
            "timestamp": chrono::Utc::now().to_rfc3339()
        })))
    }
}