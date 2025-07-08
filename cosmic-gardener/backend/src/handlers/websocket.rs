//! WebSocketハンドラー実装
//!
//! Actix-WSを使用したリアルタイム通信の処理を実装します。

use actix::{Actor, ActorContext, AsyncContext, Handler, StreamHandler};
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::errors::{ApiError, WsErrorCode};
use crate::models::websocket::*;
use crate::models::AuthenticatedUser;
use crate::services::jwt::JwtService;

/// WebSocketセッション
pub struct WsSession {
    /// セッションID
    id: Uuid,
    /// 認証済みユーザー情報
    user: Option<AuthenticatedUser>,
    /// ハートビート管理
    heartbeat: Instant,
    /// データベース接続プール
    pool: web::Data<PgPool>,
    /// JWT サービス
    jwt_service: Arc<JwtService>,
    /// セッションマネージャー
    session_manager: Arc<RwLock<SessionManager>>,
    /// 現在のセーブデータID
    current_save_id: Option<Uuid>,
    /// 最後の同期タイムスタンプ
    last_sync: DateTime<Utc>,
    /// メッセージシーケンス番号
    sequence_number: u64,
}

/// WebSocketセッション設定
#[derive(Clone)]
pub struct WsConfig {
    /// ハートビート間隔
    pub heartbeat_interval: Duration,
    /// クライアントタイムアウト
    pub client_timeout: Duration,
    /// 最大メッセージサイズ
    pub max_message_size: usize,
    /// メッセージレート制限（秒あたり）
    pub rate_limit: u32,
}

impl Default for WsConfig {
    fn default() -> Self {
        Self {
            heartbeat_interval: Duration::from_secs(30),
            client_timeout: Duration::from_secs(60),
            max_message_size: 1024 * 1024, // 1MB
            rate_limit: 60, // 60 messages per second
        }
    }
}

/// セッションマネージャー
pub struct SessionManager {
    /// アクティブなセッション
    sessions: HashMap<Uuid, SessionInfo>,
    /// ユーザーごとのセッション
    user_sessions: HashMap<Uuid, Vec<Uuid>>,
}

/// セッション情報
struct SessionInfo {
    user_id: Option<Uuid>,
    connected_at: DateTime<Utc>,
    last_activity: DateTime<Utc>,
    save_id: Option<Uuid>,
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
            save_id: None,
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
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        // ハートビートを開始
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

/// WebSocketメッセージハンドラー
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
                // JSONメッセージとして処理
                match serde_json::from_str::<WsMessage>(&text) {
                    Ok(message) => self.handle_ws_message(message, ctx),
                    Err(e) => {
                        log::warn!("Invalid WebSocket message: {}", e);
                        self.send_error(
                            ctx,
                            WsErrorCode::InvalidMessageFormat,
                            Some(serde_json::json!({ "error": e.to_string() })),
                        );
                    }
                }
            }
            Ok(ws::Message::Binary(bin)) => {
                // MessagePackメッセージとして処理
                match rmp_serde::from_slice::<WsMessage>(&bin) {
                    Ok(message) => self.handle_ws_message(message, ctx),
                    Err(e) => {
                        log::warn!("Invalid MessagePack message: {}", e);
                        self.send_error(
                            ctx,
                            WsErrorCode::InvalidMessageFormat,
                            Some(serde_json::json!({ "error": e.to_string() })),
                        );
                    }
                }
            }
            Ok(ws::Message::Close(reason)) => {
                log::info!("WebSocket closing: {:?}", reason);
                ctx.stop();
            }
            _ => (),
        }
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
            current_save_id: None,
            last_sync: Utc::now(),
            sequence_number: 0,
        }
    }

    /// ハートビートを開始
    fn start_heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) {
        let config = WsConfig::default();
        
        ctx.run_interval(config.heartbeat_interval, |act, ctx| {
            if Instant::now().duration_since(act.heartbeat) > config.client_timeout {
                log::warn!("WebSocket client heartbeat timeout");
                ctx.stop();
                return;
            }
            
            ctx.ping(b"");
        });
    }

    /// WebSocketメッセージを処理
    fn handle_ws_message(&mut self, msg: WsMessage, ctx: &mut ws::WebsocketContext<Self>) {
        // ハートビートを更新
        self.heartbeat = Instant::now();
        
        match msg {
            WsMessage::Authenticate(req) => self.handle_authenticate(req, ctx),
            WsMessage::SyncGameState(req) => self.handle_sync_game_state(req, ctx),
            WsMessage::CreateCelestialBody(req) => self.handle_create_celestial_body(req, ctx),
            WsMessage::UpdateCelestialBody(req) => self.handle_update_celestial_body(req, ctx),
            WsMessage::DestroyCelestialBody(req) => self.handle_destroy_celestial_body(req, ctx),
            WsMessage::UpdateResources(req) => self.handle_update_resources(req, ctx),
            WsMessage::Heartbeat(req) => self.handle_heartbeat(req, ctx),
            WsMessage::RequestPartialState(req) => self.handle_request_partial_state(req, ctx),
            _ => {
                self.send_error(
                    ctx,
                    WsErrorCode::InvalidMessageFormat,
                    Some(serde_json::json!({ "message": "Unexpected message type" })),
                );
            }
        }
    }

    /// 認証処理
    fn handle_authenticate(&mut self, req: AuthenticateRequest, ctx: &mut ws::WebsocketContext<Self>) {
        let jwt_service = self.jwt_service.clone();
        let session_manager = self.session_manager.clone();
        let session_id = self.id;
        
        let fut = async move {
            // JWTトークンを検証
            match jwt_service.validate_access_token(&req.access_token) {
                Ok(claims) => {
                    let user = AuthenticatedUser {
                        id: Uuid::parse_str(&claims.sub).unwrap_or_default(),
                        username: claims.user.username,
                        device_id: req.device_id,
                    };
                    
                    // セッションマネージャーに登録
                    session_manager.write().await.authenticate_session(session_id, user.id);
                    
                    Ok(user)
                }
                Err(e) => {
                    log::warn!("WebSocket authentication failed: {}", e);
                    Err(WsErrorCode::AuthenticationFailed)
                }
            }
        };
        
        fut.into_actor(self)
            .then(|result, act, ctx| {
                match result {
                    Ok(user) => {
                        act.user = Some(user.clone());
                        
                        let response = WsMessage::AuthenticateResponse(AuthenticateResponse {
                            success: true,
                            user_id: Some(user.id),
                            session_id: Some(act.id),
                            error: None,
                        });
                        
                        act.send_message(ctx, response);
                    }
                    Err(error_code) => {
                        let response = WsMessage::AuthenticateResponse(AuthenticateResponse {
                            success: false,
                            user_id: None,
                            session_id: None,
                            error: Some(error_code.message().to_string()),
                        });
                        
                        act.send_message(ctx, response);
                    }
                }
                
                actix::fut::ready(())
            })
            .wait(ctx);
    }

    /// ゲーム状態同期処理
    fn handle_sync_game_state(&mut self, req: SyncGameStateRequest, ctx: &mut ws::WebsocketContext<Self>) {
        if !self.is_authenticated() {
            self.send_error(ctx, WsErrorCode::AuthenticationFailed, None);
            return;
        }

        let pool = self.pool.clone();
        let user_id = self.user.as_ref().unwrap().id;
        
        let fut = async move {
            // データベースから最新の状態を取得
            sqlx::query!(
                r#"
                SELECT game_data, version, updated_at
                FROM game_saves
                WHERE user_id = $1 AND id = $2
                "#,
                user_id,
                req.save_id
            )
            .fetch_optional(pool.get_ref())
            .await
        };
        
        fut.into_actor(self)
            .then(move |result, act, ctx| {
                match result {
                    Ok(Some(save)) => {
                        // チェックサムを計算して比較
                        let server_checksum = act.calculate_checksum(&save.game_data);
                        
                        if server_checksum == req.client_checksum {
                            // 差分のみを送信
                            act.send_state_delta(ctx, req.last_sync_timestamp, &save);
                        } else {
                            // 完全な状態を送信
                            act.send_full_state_sync(ctx, req.save_id, save);
                        }
                        
                        act.current_save_id = Some(req.save_id);
                        act.last_sync = Utc::now();
                    }
                    Ok(None) => {
                        act.send_error(
                            ctx,
                            WsErrorCode::InvalidCelestialBody,
                            Some(serde_json::json!({ "save_id": req.save_id })),
                        );
                    }
                    Err(e) => {
                        log::error!("Database error: {}", e);
                        act.send_error(ctx, WsErrorCode::StateCorrupted, None);
                    }
                }
                
                actix::fut::ready(())
            })
            .wait(ctx);
    }

    /// ハートビート処理
    fn handle_heartbeat(&mut self, req: HeartbeatRequest, ctx: &mut ws::WebsocketContext<Self>) {
        let latency = Utc::now()
            .signed_duration_since(req.timestamp)
            .num_milliseconds() as u64;
        
        let response = WsMessage::HeartbeatAck(HeartbeatAckResponse {
            sequence: req.sequence,
            server_timestamp: Utc::now(),
            latency_ms: latency,
        });
        
        self.send_message(ctx, response);
    }

    /// メッセージ送信ヘルパー
    fn send_message(&mut self, ctx: &mut ws::WebsocketContext<Self>, msg: WsMessage) {
        self.sequence_number += 1;
        
        // JSON形式で送信（開発環境）
        // TODO: 本番環境ではMessagePackを使用
        match serde_json::to_string(&msg) {
            Ok(text) => ctx.text(text),
            Err(e) => log::error!("Failed to serialize message: {}", e),
        }
    }

    /// エラーメッセージ送信
    fn send_error(
        &mut self,
        ctx: &mut ws::WebsocketContext<Self>,
        code: WsErrorCode,
        details: Option<serde_json::Value>,
    ) {
        let error_msg = WsMessage::Error(ErrorResponse {
            code: code.as_str().to_string(),
            message: code.message().to_string(),
            details,
            recoverable: code.is_retryable(),
        });
        
        self.send_message(ctx, error_msg);
    }

    /// 認証済みかチェック
    fn is_authenticated(&self) -> bool {
        self.user.is_some()
    }

    /// チェックサム計算（簡易版）
    fn calculate_checksum(&self, data: &serde_json::Value) -> String {
        use sha2::{Digest, Sha256};
        
        let serialized = serde_json::to_string(data).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(serialized.as_bytes());
        
        format!("{:x}", hasher.finalize())
    }

    /// 天体作成処理（実装は省略）
    fn handle_create_celestial_body(&mut self, _req: CreateCelestialBodyRequest, ctx: &mut ws::WebsocketContext<Self>) {
        if !self.is_authenticated() {
            self.send_error(ctx, WsErrorCode::AuthenticationFailed, None);
            return;
        }
        
        // TODO: 実装
    }

    /// 天体更新処理（実装は省略）
    fn handle_update_celestial_body(&mut self, _req: UpdateCelestialBodyRequest, ctx: &mut ws::WebsocketContext<Self>) {
        if !self.is_authenticated() {
            self.send_error(ctx, WsErrorCode::AuthenticationFailed, None);
            return;
        }
        
        // TODO: 実装
    }

    /// 天体削除処理（実装は省略）
    fn handle_destroy_celestial_body(&mut self, _req: DestroyCelestialBodyRequest, ctx: &mut ws::WebsocketContext<Self>) {
        if !self.is_authenticated() {
            self.send_error(ctx, WsErrorCode::AuthenticationFailed, None);
            return;
        }
        
        // TODO: 実装
    }

    /// リソース更新処理（実装は省略）
    fn handle_update_resources(&mut self, _req: UpdateResourcesRequest, ctx: &mut ws::WebsocketContext<Self>) {
        if !self.is_authenticated() {
            self.send_error(ctx, WsErrorCode::AuthenticationFailed, None);
            return;
        }
        
        // TODO: 実装
    }

    /// 部分状態リクエスト処理（実装は省略）
    fn handle_request_partial_state(&mut self, _req: PartialStateRequest, ctx: &mut ws::WebsocketContext<Self>) {
        if !self.is_authenticated() {
            self.send_error(ctx, WsErrorCode::AuthenticationFailed, None);
            return;
        }
        
        // TODO: 実装
    }

    /// 差分送信（実装は省略）
    fn send_state_delta(
        &mut self,
        ctx: &mut ws::WebsocketContext<Self>,
        _last_sync: DateTime<Utc>,
        _save: &sqlx::postgres::PgRow,
    ) {
        // TODO: 実装
        let response = WsMessage::StateDelta(StateDeltaResponse {
            timestamp: Utc::now(),
            sequence_number: self.sequence_number,
            deltas: vec![],
        });
        
        self.send_message(ctx, response);
    }

    /// 完全状態同期送信（実装は省略）
    fn send_full_state_sync(
        &mut self,
        ctx: &mut ws::WebsocketContext<Self>,
        save_id: Uuid,
        _save: sqlx::postgres::PgRow,
    ) {
        // TODO: 実装
        let response = WsMessage::FullStateSync(FullStateSyncResponse {
            save_id,
            timestamp: Utc::now(),
            resources: GameResources {
                cosmic_dust: 0.0,
                energy: 0.0,
                organic_matter: 0.0,
                biomass: 0.0,
                dark_matter: 0.0,
                thought_points: 0.0,
            },
            celestial_bodies: vec![],
            research: ResearchState {
                unlocked_technologies: vec![],
                research_points: 0,
                active_research: None,
            },
            statistics: GameStatistics {
                total_play_time: 0,
                total_dust_collected: 0,
                total_stars_created: 0,
                total_planets_created: 0,
                highest_energy: 0,
            },
            server_checksum: self.calculate_checksum(&serde_json::json!({})),
        });
        
        self.send_message(ctx, response);
    }
}

/// WebSocketエンドポイント
pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    pool: web::Data<PgPool>,
    jwt_service: web::Data<JwtService>,
    session_manager: web::Data<Arc<RwLock<SessionManager>>>,
) -> Result<HttpResponse, Error> {
    let session = WsSession::new(
        pool,
        jwt_service.into_inner(),
        session_manager.get_ref().clone(),
    );
    
    ws::start(session, &req, stream)
}

/// WebSocketルート設定
pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/ws")
            .route(web::get().to(websocket_handler))
    );
}