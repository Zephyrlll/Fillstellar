use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::game::celestial_bodies::{CelestialType, CelestialBody};
use crate::game::resources::Resources;

/// クライアントからサーバーへのメッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    /// ゲーム状態の要求
    GetGameState,
    
    /// 天体の作成
    CreateBody {
        body_type: CelestialType,
        position: [f64; 3],
    },
    
    /// 天体の削除
    RemoveBody {
        body_id: Uuid,
    },
    
    /// リソースの使用
    SpendResources {
        cosmic_dust: u64,
        energy: u64,
    },
    
    /// ゲームループの開始/停止
    SetGameRunning {
        running: bool,
    },
}

/// サーバーからクライアントへのメッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    /// ゲーム状態の更新
    GameState {
        resources: Resources,
        bodies: Vec<CelestialBodyInfo>,
        tick: u64,
    },
    
    /// 天体作成の結果
    BodyCreated {
        body_id: Uuid,
        success: bool,
        error: Option<String>,
    },
    
    /// 天体削除の結果
    BodyRemoved {
        body_id: Uuid,
        success: bool,
    },
    
    /// エラーメッセージ
    Error {
        message: String,
    },
    
    /// 接続確認
    Ping,
}

/// フロントエンド用の天体情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CelestialBodyInfo {
    pub id: Uuid,
    pub body_type: CelestialType,
    pub position: [f64; 3],
    pub velocity: [f64; 3],
    pub mass: f64,
    pub radius: f64,
    pub age: u64,
    pub population: u64,
}

impl From<&CelestialBody> for CelestialBodyInfo {
    fn from(body: &CelestialBody) -> Self {
        Self {
            id: body.id,
            body_type: body.body_type.clone(),
            position: [body.physics.position.x, body.physics.position.y, body.physics.position.z],
            velocity: [body.physics.velocity.x, body.physics.velocity.y, body.physics.velocity.z],
            mass: crate::game::resources::fixed::to_f64(body.physics.mass),
            radius: crate::game::resources::fixed::to_f64(body.physics.radius),
            age: body.lifecycle.age,
            population: body.lifecycle.population,
        }
    }
}