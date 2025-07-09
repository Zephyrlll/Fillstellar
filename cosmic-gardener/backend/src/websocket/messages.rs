//! WebSocketメッセージ定義
//!
//! 要件に基づいたシンプルなメッセージ型定義

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 3D位置ベクトル
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// ゲーム状態（簡略版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub resources: serde_json::Value,
    pub celestial_bodies: Vec<serde_json::Value>,
    pub research: serde_json::Value,
    pub statistics: serde_json::Value,
}

/// 状態データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateData {
    pub game_state: GameState,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// クライアントからのメッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ClientMessage {
    /// 状態取得リクエスト
    GetState,
    /// 天体作成
    CreateCelestialBody { 
        body_type: String, 
        position: Vec3 
    },
    /// ゲーム保存
    SaveGame { 
        state: GameState 
    },
    /// ハートビート
    Heartbeat,
    /// 圧縮有効化
    EnableCompression,
}

/// サーバーからのメッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMessage {
    /// 状態更新
    StateUpdate { 
        full: bool, 
        data: StateData 
    },
    /// アクション結果
    ActionResult { 
        success: bool, 
        message: String 
    },
    /// エラー
    Error { 
        code: String, 
        message: String 
    },
    /// ハートビート応答
    Heartbeat,
}

impl ClientMessage {
    /// メッセージが重要かどうか
    pub fn is_critical(&self) -> bool {
        matches!(self, ClientMessage::SaveGame { .. })
    }
}

impl ServerMessage {
    /// エラーメッセージを作成
    pub fn error(code: &str, message: &str) -> Self {
        Self::Error {
            code: code.to_string(),
            message: message.to_string(),
        }
    }
    
    /// 成功メッセージを作成
    pub fn success(message: &str) -> Self {
        Self::ActionResult {
            success: true,
            message: message.to_string(),
        }
    }
    
    /// 失敗メッセージを作成
    pub fn failure(message: &str) -> Self {
        Self::ActionResult {
            success: false,
            message: message.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_serialization() {
        let msg = ClientMessage::GetState;
        let json = serde_json::to_string(&msg).unwrap();
        let deserialized: ClientMessage = serde_json::from_str(&json).unwrap();
        
        assert!(matches!(deserialized, ClientMessage::GetState));
    }

    #[test]
    fn test_server_message_helpers() {
        let error_msg = ServerMessage::error("ERR_001", "Test error");
        assert!(matches!(error_msg, ServerMessage::Error { .. }));
        
        let success_msg = ServerMessage::success("Operation completed");
        assert!(matches!(success_msg, ServerMessage::ActionResult { success: true, .. }));
    }
}