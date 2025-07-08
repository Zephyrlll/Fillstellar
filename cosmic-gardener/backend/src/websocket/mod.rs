//! WebSocket通信モジュール
//!
//! Cosmic Gardenerのリアルタイム通信を管理します

pub mod handler;
pub mod session;
pub mod messages;
pub mod broadcaster;

pub use handler::*;
pub use session::*;
pub use messages::*;
pub use broadcaster::*;

use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::services::JwtService;

/// WebSocket接続エンドポイント
/// GET /api/ws
pub async fn websocket_endpoint(
    req: HttpRequest,
    stream: web::Payload,
    pool: web::Data<PgPool>,
    jwt_service: web::Data<JwtService>,
    session_manager: web::Data<Arc<RwLock<SessionManager>>>,
) -> Result<HttpResponse, Error> {
    let ws_session = WsSession::new(
        pool,
        jwt_service.into_inner(),
        session_manager.get_ref().clone(),
    );
    
    ws::start(ws_session, &req, stream)
}

/// WebSocketルート設定
pub fn configure_websocket_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/ws")
            .route(web::get().to(websocket_endpoint))
    );
}