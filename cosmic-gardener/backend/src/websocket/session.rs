//! WebSocketセッション管理
//!
//! ユーザーごとのWebSocket接続を管理します

use actix::{Actor, ActorContext, AsyncContext, StreamHandler};
use actix_web::web;
use actix_web_actors::ws;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::models::AuthenticatedUser;
use crate::services::JwtService;
use crate::websocket::messages::{ClientMessage, ServerMessage};

/// WebSocketセッション
pub struct WsSession {
    /// セッションID
    id: Uuid,
    /// 認証済みユーザー
    user: Option<AuthenticatedUser>,
    /// ハートビート時刻
    heartbeat: Instant,
    /// データベースプール
    pool: web::Data<PgPool>,
    /// JWT サービス
    jwt_service: Arc<JwtService>,
    /// セッションマネージャー
    session_manager: Arc<RwLock<SessionManager>>,
}

/// セッションマネージャー
pub struct SessionManager {
    /// アクティブなセッション
    sessions: HashMap<Uuid, SessionInfo>,
    /// ユーザーごとのセッション
    user_sessions: HashMap<Uuid, Vec<Uuid>>,
}

/// セッション情報
#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub user_id: Option<Uuid>,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            user_sessions: HashMap::new(),
        }
    }

    /// セッションを追加
    pub fn add_session(&mut self, session_id: Uuid) {
        let info = SessionInfo {
            user_id: None,
            connected_at: Utc::now(),
            last_activity: Utc::now(),
        };
        self.sessions.insert(session_id, info);
    }

    /// セッションを認証
    pub fn authenticate_session(&mut self, session_id: Uuid, user_id: Uuid) {
        if let Some(info) = self.sessions.get_mut(&session_id) {
            info.user_id = Some(user_id);
            info.last_activity = Utc::now();
            
            self.user_sessions
                .entry(user_id)
                .or_insert_with(Vec::new)
                .push(session_id);
        }
    }

    /// セッションを削除
    pub fn remove_session(&mut self, session_id: Uuid) {
        if let Some(info) = self.sessions.remove(&session_id) {
            if let Some(user_id) = info.user_id {
                if let Some(sessions) = self.user_sessions.get_mut(&user_id) {
                    sessions.retain(|&id| id != session_id);
                    if sessions.is_empty() {
                        self.user_sessions.remove(&user_id);
                    }
                }
            }
        }
    }

    /// ユーザーのセッション数を取得
    pub fn get_user_session_count(&self, user_id: Uuid) -> usize {
        self.user_sessions.get(&user_id).map_or(0, |s| s.len())
    }

    /// アクティブなセッション数
    pub fn active_session_count(&self) -> usize {
        self.sessions.len()
    }
}

impl WsSession {
    /// 新しいセッションを作成
    pub fn new(
        pool: web::Data<PgPool>,
        jwt_service: Arc<JwtService>,
        session_manager: Arc<RwLock<SessionManager>>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            user: None,
            heartbeat: Instant::now(),
            pool,
            jwt_service,
            session_manager,
        }
    }

    /// ハートビートを開始
    fn start_heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(Duration::from_secs(30), |act, ctx| {
            if Instant::now().duration_since(act.heartbeat) > Duration::from_secs(60) {
                log::warn!("WebSocket heartbeat timeout for session {}", act.id);
                ctx.stop();
                return;
            }
            ctx.ping(b"");
        });
    }

    /// クライアントメッセージを処理
    fn handle_client_message(&mut self, msg: ClientMessage, ctx: &mut ws::WebsocketContext<Self>) {
        // 認証チェック（GetStateとHeartbeat以外）
        if !matches!(msg, ClientMessage::GetState | ClientMessage::Heartbeat) {
            if self.user.is_none() {
                self.send_message(ctx, ServerMessage::error("AUTH_REQUIRED", "認証が必要です"));
                return;
            }
        }

        match msg {
            ClientMessage::GetState => {
                self.handle_get_state(ctx);
            }
            ClientMessage::CreateCelestialBody { body_type, position } => {
                self.handle_create_celestial_body(body_type, position, ctx);
            }
            ClientMessage::SaveGame { state } => {
                self.handle_save_game(state, ctx);
            }
            ClientMessage::Heartbeat => {
                self.send_message(ctx, ServerMessage::Heartbeat);
            }
        }
    }

    /// 状態取得処理
    fn handle_get_state(&mut self, ctx: &mut ws::WebsocketContext<Self>) {
        if let Some(user) = &self.user {
            // TODO: データベースから状態を取得
            let state_data = crate::websocket::messages::StateData {
                game_state: crate::websocket::messages::GameState {
                    resources: serde_json::json!({}),
                    celestial_bodies: vec![],
                    research: serde_json::json!({}),
                    statistics: serde_json::json!({}),
                },
                timestamp: Utc::now(),
            };

            self.send_message(ctx, ServerMessage::StateUpdate {
                full: true,
                data: state_data,
            });
        } else {
            self.send_message(ctx, ServerMessage::error("AUTH_REQUIRED", "認証が必要です"));
        }
    }

    /// 天体作成処理
    fn handle_create_celestial_body(
        &mut self,
        body_type: String,
        position: crate::websocket::messages::Vec3,
        ctx: &mut ws::WebsocketContext<Self>,
    ) {
        log::info!("Creating celestial body: {} at {:?}", body_type, position);
        
        // TODO: 天体作成ロジック
        self.send_message(ctx, ServerMessage::success(&format!(
            "天体「{}」を作成しました",
            body_type
        )));
    }

    /// ゲーム保存処理
    fn handle_save_game(
        &mut self,
        state: crate::websocket::messages::GameState,
        ctx: &mut ws::WebsocketContext<Self>,
    ) {
        log::info!("Saving game state for user {:?}", self.user.as_ref().map(|u| u.id));
        
        // TODO: データベースに保存
        self.send_message(ctx, ServerMessage::success("ゲームを保存しました"));
    }

    /// メッセージ送信
    fn send_message(&self, ctx: &mut ws::WebsocketContext<Self>, msg: ServerMessage) {
        match serde_json::to_string(&msg) {
            Ok(text) => ctx.text(text),
            Err(e) => {
                log::error!("Failed to serialize message: {}", e);
                ctx.text(r#"{"type":"Error","data":{"code":"SERIALIZE_ERROR","message":"メッセージの送信に失敗しました"}}"#);
            }
        }
    }
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        self.start_heartbeat(ctx);
        
        // セッションマネージャーに追加
        let session_manager = self.session_manager.clone();
        let session_id = self.id;
        
        ctx.spawn(async move {
            session_manager.write().await.add_session(session_id);
        }.into_actor(self));
        
        log::info!("WebSocket session {} started", self.id);
    }

    fn stopped(&mut self, _: &mut Self::Context) {
        // セッションマネージャーから削除
        let session_manager = self.session_manager.clone();
        let session_id = self.id;
        
        tokio::spawn(async move {
            session_manager.write().await.remove_session(session_id);
        });
        
        log::info!("WebSocket session {} stopped", self.id);
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                self.heartbeat = Instant::now();
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                self.heartbeat = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                self.heartbeat = Instant::now();
                match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(client_msg) => {
                        self.handle_client_message(client_msg, ctx);
                    }
                    Err(e) => {
                        log::warn!("Invalid message format: {}", e);
                        self.send_message(ctx, ServerMessage::error(
                            "INVALID_FORMAT",
                            "メッセージフォーマットが正しくありません"
                        ));
                    }
                }
            }
            Ok(ws::Message::Binary(_)) => {
                log::warn!("Binary messages not supported");
                self.send_message(ctx, ServerMessage::error(
                    "BINARY_NOT_SUPPORTED",
                    "バイナリメッセージはサポートされていません"
                ));
            }
            Ok(ws::Message::Close(reason)) => {
                log::info!("WebSocket closing: {:?}", reason);
                ctx.stop();
            }
            _ => (),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_manager() {
        let mut manager = SessionManager::new();
        let session_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        
        // セッション追加
        manager.add_session(session_id);
        assert_eq!(manager.active_session_count(), 1);
        
        // セッション認証
        manager.authenticate_session(session_id, user_id);
        assert_eq!(manager.get_user_session_count(user_id), 1);
        
        // セッション削除
        manager.remove_session(session_id);
        assert_eq!(manager.active_session_count(), 0);
        assert_eq!(manager.get_user_session_count(user_id), 0);
    }
}