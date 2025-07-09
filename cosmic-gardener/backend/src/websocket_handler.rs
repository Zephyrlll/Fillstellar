use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::interval;
use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_ws::{Message, Session, MessageStream};
use futures::StreamExt;
use serde_json;

use crate::game::{ResourceManager, CelestialBodyManager, PhysicsEngine};
use crate::websocket_messages::{ClientMessage, ServerMessage, CelestialBodyInfo};

/// ゲーム状態を管理する構造体
#[derive(Clone)]
pub struct GameState {
    pub resource_manager: Arc<Mutex<ResourceManager>>,
    pub celestial_manager: Arc<Mutex<CelestialBodyManager>>,
    pub physics_engine: Arc<Mutex<PhysicsEngine>>,
    pub is_running: Arc<Mutex<bool>>,
    pub tick: Arc<Mutex<u64>>,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            resource_manager: Arc::new(Mutex::new(ResourceManager::new(50))),
            celestial_manager: Arc::new(Mutex::new(CelestialBodyManager::new(50))),
            physics_engine: Arc::new(Mutex::new(PhysicsEngine::new())),
            is_running: Arc::new(Mutex::new(false)),
            tick: Arc::new(Mutex::new(0)),
        }
    }
}

/// WebSocketハンドラー
pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    data: web::Data<GameState>,
) -> Result<HttpResponse, Error> {
    let (response, session, stream) = actix_ws::handle(&req, stream)?;
    
    // セッションを別タスクで処理
    let game_state = data.get_ref().clone();
    actix_web::rt::spawn(handle_websocket_session(session, stream, game_state));
    
    Ok(response)
}

async fn handle_websocket_session(
    mut session: Session,
    mut stream: MessageStream,
    game_state: GameState,
) {
    // 接続確認メッセージを送信
    let ping_msg = ServerMessage::Ping;
    if let Ok(msg) = serde_json::to_string(&ping_msg) {
        let _ = session.text(msg).await;
    }
    
    // 初期ゲーム状態を送信
    send_game_state(&mut session, &game_state).await;
    
    // メッセージループ
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                    handle_client_message(&mut session, client_msg, &game_state).await;
                }
            }
            Ok(Message::Close(_)) => break,
            _ => {}
        }
    }
}

async fn handle_client_message(
    session: &mut Session,
    message: ClientMessage,
    game_state: &GameState,
) {
    match message {
        ClientMessage::GetGameState => {
            send_game_state(session, game_state).await;
        }
        
        ClientMessage::CreateBody { body_type, position } => {
            let mut resource_manager = game_state.resource_manager.lock().await;
            let mut celestial_manager = game_state.celestial_manager.lock().await;
            
            let resources = resource_manager.get_resources_mut();
            let position_vec = nalgebra::Vector3::new(position[0], position[1], position[2]);
            
            match celestial_manager.create_body(body_type, position_vec, resources) {
                Ok(body_id) => {
                    let response = ServerMessage::BodyCreated {
                        body_id,
                        success: true,
                        error: None,
                    };
                    if let Ok(msg) = serde_json::to_string(&response) {
                        let _ = session.text(msg).await;
                    }
                    
                    // 更新されたゲーム状態を送信
                    drop(resource_manager);
                    drop(celestial_manager);
                    send_game_state(session, game_state).await;
                }
                Err(e) => {
                    let response = ServerMessage::BodyCreated {
                        body_id: uuid::Uuid::new_v4(),
                        success: false,
                        error: Some(format!("{:?}", e)),
                    };
                    if let Ok(msg) = serde_json::to_string(&response) {
                        let _ = session.text(msg).await;
                    }
                }
            }
        }
        
        ClientMessage::RemoveBody { body_id } => {
            let mut celestial_manager = game_state.celestial_manager.lock().await;
            let success = celestial_manager.remove_body(body_id).is_ok();
            
            let response = ServerMessage::BodyRemoved { body_id, success };
            if let Ok(msg) = serde_json::to_string(&response) {
                let _ = session.text(msg).await;
            }
            
            if success {
                drop(celestial_manager);
                send_game_state(session, game_state).await;
            }
        }
        
        ClientMessage::SpendResources { cosmic_dust, energy } => {
            let mut resource_manager = game_state.resource_manager.lock().await;
            let resources = resource_manager.get_resources_mut();
            
            if resources.cosmic_dust >= cosmic_dust && resources.energy >= energy {
                resources.cosmic_dust -= cosmic_dust;
                resources.energy -= energy;
                
                drop(resource_manager);
                send_game_state(session, game_state).await;
            } else {
                let response = ServerMessage::Error {
                    message: "Insufficient resources".to_string(),
                };
                if let Ok(msg) = serde_json::to_string(&response) {
                    let _ = session.text(msg).await;
                }
            }
        }
        
        ClientMessage::SetGameRunning { running } => {
            let mut is_running = game_state.is_running.lock().await;
            *is_running = running;
        }
    }
}

async fn send_game_state(session: &mut Session, game_state: &GameState) {
    let resource_manager = game_state.resource_manager.lock().await;
    let celestial_manager = game_state.celestial_manager.lock().await;
    let tick = game_state.tick.lock().await;
    
    let resources = resource_manager.get_resources().clone();
    let bodies: Vec<CelestialBodyInfo> = celestial_manager
        .get_all_bodies()
        .values()
        .map(|body| body.into())
        .collect();
    
    let message = ServerMessage::GameState {
        resources,
        bodies,
        tick: *tick,
    };
    
    if let Ok(msg) = serde_json::to_string(&message) {
        let _ = session.text(msg).await;
    }
}

/// ゲームループを実行する関数
pub async fn run_game_loop(game_state: GameState) {
    let mut interval = interval(Duration::from_millis(50)); // 20Hz
    
    loop {
        interval.tick().await;
        
        let is_running = *game_state.is_running.lock().await;
        if !is_running {
            continue;
        }
        
        // 物理演算の更新
        {
            let mut physics_engine = game_state.physics_engine.lock().await;
            let mut celestial_manager = game_state.celestial_manager.lock().await;
            
            if let Err(e) = physics_engine.update(celestial_manager.get_all_bodies_mut(), 0.05) {
                eprintln!("Physics update error: {:?}", e);
            }
        }
        
        // 生命システムの更新
        {
            let mut celestial_manager = game_state.celestial_manager.lock().await;
            celestial_manager.update_life_systems(50);
        }
        
        // リソースの蓄積
        {
            let mut resource_manager = game_state.resource_manager.lock().await;
            resource_manager.accumulate_resources(50);
        }
        
        // ティック数の更新
        {
            let mut tick = game_state.tick.lock().await;
            *tick += 1;
        }
    }
}