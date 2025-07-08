//! WebSocketハンドラー
//!
//! JWT認証とメッセージ処理を行います

use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::services::JwtService;
use crate::websocket::session::{WsSession, SessionManager};

/// WebSocketハンドラー
pub struct WebSocketHandler {
    pub pool: web::Data<PgPool>,
    pub jwt_service: Arc<JwtService>,
    pub session_manager: Arc<RwLock<SessionManager>>,
}

impl WebSocketHandler {
    /// 新しいハンドラーを作成
    pub fn new(
        pool: web::Data<PgPool>,
        jwt_service: Arc<JwtService>,
        session_manager: Arc<RwLock<SessionManager>>,
    ) -> Self {
        Self {
            pool,
            jwt_service,
            session_manager,
        }
    }

    /// WebSocket接続を処理
    pub async fn handle_connection(
        &self,
        req: HttpRequest,
        stream: web::Payload,
    ) -> Result<HttpResponse, Error> {
        // JWT認証をクエリパラメーターから取得
        let token = match self.extract_token(&req) {
            Ok(token) => token,
            Err(e) => {
                log::warn!("WebSocket authentication failed: {}", e);
                return Ok(HttpResponse::Unauthorized().json(serde_json::json!({
                    "error": "認証が必要です"
                })));
            }
        };

        // JWTトークンを検証
        match self.jwt_service.validate_access_token(&token) {
            Ok(claims) => {
                log::info!("WebSocket connection authenticated for user: {}", claims.sub);
                
                let session = WsSession::new(
                    self.pool.clone(),
                    self.jwt_service.clone(),
                    self.session_manager.clone(),
                );
                
                ws::start(session, &req, stream)
            }
            Err(e) => {
                log::warn!("Invalid JWT token: {}", e);
                Ok(HttpResponse::Unauthorized().json(serde_json::json!({
                    "error": "無効なトークンです"
                })))
            }
        }
    }

    /// リクエストからJWTトークンを抽出
    fn extract_token(&self, req: &HttpRequest) -> Result<String, &'static str> {
        // クエリパラメーターから取得
        if let Some(token) = req.query_string()
            .split('&')
            .find_map(|param| {
                let mut parts = param.splitn(2, '=');
                if parts.next() == Some("token") {
                    parts.next()
                } else {
                    None
                }
            }) {
            return Ok(token.to_string());
        }

        // Authorizationヘッダーから取得
        if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                if let Some(token) = auth_str.strip_prefix("Bearer ") {
                    return Ok(token.to_string());
                }
            }
        }

        Err("認証トークンが見つかりません")
    }
}

/// WebSocket統計情報
#[derive(Debug, serde::Serialize)]
pub struct WebSocketStats {
    pub active_sessions: usize,
    pub total_users: usize,
    pub uptime_seconds: u64,
}

impl WebSocketHandler {
    /// 統計情報を取得
    pub async fn get_stats(&self) -> WebSocketStats {
        let session_manager = self.session_manager.read().await;
        
        WebSocketStats {
            active_sessions: session_manager.active_session_count(),
            total_users: session_manager.user_sessions.len(),
            uptime_seconds: 0, // TODO: 実際の稼働時間
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test;

    #[test]
    fn test_token_extraction() {
        // テスト用のJWTサービス
        let jwt_service = Arc::new(JwtService::new("test_secret".to_string()));
        let session_manager = Arc::new(RwLock::new(SessionManager::new()));
        let pool = web::Data::new(
            sqlx::PgPool::connect("postgresql://test").await.unwrap()
        );
        
        let handler = WebSocketHandler::new(pool, jwt_service, session_manager);
        
        // クエリパラメーターのテスト
        let req = test::TestRequest::get()
            .uri("/ws?token=test_token")
            .to_http_request();
        
        assert_eq!(handler.extract_token(&req).unwrap(), "test_token");
        
        // Authorizationヘッダーのテスト
        let req = test::TestRequest::get()
            .uri("/ws")
            .insert_header(("Authorization", "Bearer header_token"))
            .to_http_request();
        
        assert_eq!(handler.extract_token(&req).unwrap(), "header_token");
    }
}