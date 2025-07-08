//! WebSocket通信用のメッセージ型定義
//!
//! Cosmic Gardenerのリアルタイム通信プロトコルを定義します。
//! クライアント・サーバー間の双方向通信をサポートし、
//! ゲーム状態の同期、天体操作、リソース管理を行います。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::entities::celestial_body::CelestialBodyType;
use crate::domain::value_objects::{Position3D, Velocity3D};

/// WebSocketメッセージのベース型
///
/// タグ付きEnumを使用してタイプセーフなメッセージングを実現
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsMessage {
    // === クライアント → サーバー ===
    /// 認証リクエスト
    Authenticate(AuthenticateRequest),
    /// ゲーム状態の同期リクエスト
    SyncGameState(SyncGameStateRequest),
    /// 天体の作成
    CreateCelestialBody(CreateCelestialBodyRequest),
    /// 天体の更新（位置、速度など）
    UpdateCelestialBody(UpdateCelestialBodyRequest),
    /// 天体の削除
    DestroyCelestialBody(DestroyCelestialBodyRequest),
    /// リソースの更新
    UpdateResources(UpdateResourcesRequest),
    /// ハートビート
    Heartbeat(HeartbeatRequest),
    /// 部分的な状態要求
    RequestPartialState(PartialStateRequest),
    
    // === サーバー → クライアント ===
    /// 認証結果
    AuthenticateResponse(AuthenticateResponse),
    /// 完全な状態同期
    FullStateSync(FullStateSyncResponse),
    /// 差分更新
    StateDelta(StateDeltaResponse),
    /// 天体イベント（作成、削除、衝突など）
    CelestialEvent(CelestialEventResponse),
    /// リソース更新通知
    ResourceUpdate(ResourceUpdateResponse),
    /// エラー通知
    Error(ErrorResponse),
    /// ハートビート応答
    HeartbeatAck(HeartbeatAckResponse),
    /// 他プレイヤーのアクション通知（将来的な機能）
    PlayerAction(PlayerActionResponse),
}

// === リクエスト型定義 ===

/// 認証リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticateRequest {
    /// JWTアクセストークン
    pub access_token: String,
    /// デバイス識別子（オプション）
    pub device_id: Option<String>,
    /// クライアントバージョン
    pub client_version: String,
}

/// 同期リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncGameStateRequest {
    /// セーブデータID
    pub save_id: Uuid,
    /// 最後の同期タイムスタンプ
    pub last_sync_timestamp: DateTime<Utc>,
    /// クライアント側の状態チェックサム
    pub client_checksum: String,
}

/// 天体作成リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCelestialBodyRequest {
    /// 親天体ID（軌道の中心）
    pub parent_id: Option<Uuid>,
    /// 天体の種類
    pub body_type: CelestialBodyType,
    /// 初期位置
    pub position: Position3D,
    /// 初期速度（オプション）
    pub velocity: Option<Velocity3D>,
    /// カスタム名（オプション）
    pub name: Option<String>,
}

/// 天体更新リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCelestialBodyRequest {
    /// 天体ID
    pub id: Uuid,
    /// 更新内容
    pub updates: CelestialBodyUpdates,
    /// クライアントタイムスタンプ
    pub timestamp: DateTime<Utc>,
}

/// 更新可能なフィールド
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CelestialBodyUpdates {
    pub position: Option<Position3D>,
    pub velocity: Option<Velocity3D>,
    pub mass: Option<f64>,
    pub level: Option<u32>,
    pub custom_properties: Option<serde_json::Value>,
}

/// 天体削除リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DestroyCelestialBodyRequest {
    /// 削除する天体のID
    pub id: Uuid,
    /// 削除理由（オプション）
    pub reason: Option<String>,
}

/// リソース更新リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateResourcesRequest {
    /// 更新するリソース
    pub resources: ResourceUpdates,
    /// タイムスタンプ
    pub timestamp: DateTime<Utc>,
}

/// リソース更新データ
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResourceUpdates {
    pub cosmic_dust: Option<f64>,
    pub energy: Option<f64>,
    pub organic_matter: Option<f64>,
    pub biomass: Option<f64>,
    pub dark_matter: Option<f64>,
    pub thought_points: Option<f64>,
}

/// ハートビートリクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatRequest {
    /// シーケンス番号
    pub sequence: u64,
    /// クライアントタイムスタンプ
    pub timestamp: DateTime<Utc>,
}

/// 部分状態リクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartialStateRequest {
    /// 要求する天体のID（空の場合は全て）
    pub celestial_body_ids: Vec<Uuid>,
    /// リソース情報を含めるか
    pub include_resources: bool,
    /// 統計情報を含めるか
    pub include_statistics: bool,
}

// === レスポンス型定義 ===

/// 認証レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticateResponse {
    /// 認証成功
    pub success: bool,
    /// ユーザーID
    pub user_id: Option<Uuid>,
    /// セッションID
    pub session_id: Option<Uuid>,
    /// エラーメッセージ
    pub error: Option<String>,
}

/// 完全状態同期レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullStateSyncResponse {
    /// セーブデータID
    pub save_id: Uuid,
    /// サーバータイムスタンプ
    pub timestamp: DateTime<Utc>,
    /// リソース状態
    pub resources: GameResources,
    /// 全天体データ
    pub celestial_bodies: Vec<CelestialBodyData>,
    /// 研究状態
    pub research: ResearchState,
    /// 統計情報
    pub statistics: GameStatistics,
    /// サーバー側チェックサム
    pub server_checksum: String,
}

/// ゲームリソース
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameResources {
    pub cosmic_dust: f64,
    pub energy: f64,
    pub organic_matter: f64,
    pub biomass: f64,
    pub dark_matter: f64,
    pub thought_points: f64,
}

/// 天体データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CelestialBodyData {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub body_type: CelestialBodyType,
    pub name: String,
    pub position: Position3D,
    pub velocity: Velocity3D,
    pub mass: f64,
    pub radius: f64,
    pub level: u32,
    pub experience_points: u64,
    pub custom_properties: serde_json::Value,
}

/// 研究状態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchState {
    pub unlocked_technologies: Vec<String>,
    pub research_points: u64,
    pub active_research: Option<String>,
}

/// ゲーム統計
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStatistics {
    pub total_play_time: i64,
    pub total_dust_collected: i64,
    pub total_stars_created: i32,
    pub total_planets_created: i32,
    pub highest_energy: i64,
}

/// 差分更新レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateDeltaResponse {
    /// タイムスタンプ
    pub timestamp: DateTime<Utc>,
    /// シーケンス番号（順序保証用）
    pub sequence_number: u64,
    /// 差分リスト
    pub deltas: Vec<StateDelta>,
}

/// 状態の差分
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "delta_type")]
pub enum StateDelta {
    /// リソース変更
    ResourceDelta {
        resource_type: ResourceType,
        old_value: f64,
        new_value: f64,
    },
    /// 天体作成
    CelestialBodyCreated {
        body: CelestialBodyData,
    },
    /// 天体更新
    CelestialBodyUpdated {
        id: Uuid,
        updates: CelestialBodyUpdates,
    },
    /// 天体破壊
    CelestialBodyDestroyed {
        id: Uuid,
        reason: DestructionReason,
    },
    /// 研究アンロック
    ResearchUnlocked {
        research_id: String,
    },
}

/// リソースタイプ
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ResourceType {
    CosmicDust,
    Energy,
    OrganicMatter,
    Biomass,
    DarkMatter,
    ThoughtPoints,
}

/// 破壊理由
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DestructionReason {
    /// 衝突
    Collision,
    /// ブラックホールに吸収
    BlackHoleAbsorption,
    /// 手動削除
    ManualDestruction,
    /// 寿命切れ
    LifespanExpired,
}

/// 天体イベントレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CelestialEventResponse {
    /// イベントタイプ
    pub event_type: CelestialEventType,
    /// 関連する天体ID
    pub celestial_body_ids: Vec<Uuid>,
    /// イベントデータ
    pub event_data: serde_json::Value,
    /// タイムスタンプ
    pub timestamp: DateTime<Utc>,
}

/// 天体イベントタイプ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CelestialEventType {
    /// 衝突
    Collision,
    /// 軌道変更
    OrbitChanged,
    /// レベルアップ
    LevelUp,
    /// 進化
    Evolution,
    /// 生命誕生
    LifeEmergence,
}

/// リソース更新レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUpdateResponse {
    /// 更新されたリソース
    pub resources: GameResources,
    /// 差分情報
    pub deltas: ResourceUpdates,
    /// タイムスタンプ
    pub timestamp: DateTime<Utc>,
}

/// エラーレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    /// エラーコード
    pub code: String,
    /// エラーメッセージ
    pub message: String,
    /// 詳細情報（オプション）
    pub details: Option<serde_json::Value>,
    /// リカバリ可能か
    pub recoverable: bool,
}

/// ハートビート応答
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatAckResponse {
    /// リクエストのシーケンス番号
    pub sequence: u64,
    /// サーバータイムスタンプ
    pub server_timestamp: DateTime<Utc>,
    /// レイテンシ（ミリ秒）
    pub latency_ms: u64,
}

/// プレイヤーアクションレスポンス（将来の拡張用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerActionResponse {
    /// プレイヤーID
    pub player_id: Uuid,
    /// アクションタイプ
    pub action_type: String,
    /// アクションデータ
    pub action_data: serde_json::Value,
    /// タイムスタンプ
    pub timestamp: DateTime<Utc>,
}

// === ヘルパー実装 ===

impl WsMessage {
    /// メッセージが重要（クリティカル）かどうか
    pub fn is_critical(&self) -> bool {
        matches!(
            self,
            WsMessage::Authenticate(_)
                | WsMessage::CreateCelestialBody(_)
                | WsMessage::DestroyCelestialBody(_)
                | WsMessage::Error(_)
        )
    }

    /// メッセージが結合可能かどうか
    pub fn is_coalescable(&self) -> bool {
        matches!(
            self,
            WsMessage::UpdateCelestialBody(_) | WsMessage::UpdateResources(_)
        )
    }

    /// メッセージタイプ名を取得
    pub fn message_type(&self) -> &'static str {
        match self {
            WsMessage::Authenticate(_) => "Authenticate",
            WsMessage::SyncGameState(_) => "SyncGameState",
            WsMessage::CreateCelestialBody(_) => "CreateCelestialBody",
            WsMessage::UpdateCelestialBody(_) => "UpdateCelestialBody",
            WsMessage::DestroyCelestialBody(_) => "DestroyCelestialBody",
            WsMessage::UpdateResources(_) => "UpdateResources",
            WsMessage::Heartbeat(_) => "Heartbeat",
            WsMessage::RequestPartialState(_) => "RequestPartialState",
            WsMessage::AuthenticateResponse(_) => "AuthenticateResponse",
            WsMessage::FullStateSync(_) => "FullStateSync",
            WsMessage::StateDelta(_) => "StateDelta",
            WsMessage::CelestialEvent(_) => "CelestialEvent",
            WsMessage::ResourceUpdate(_) => "ResourceUpdate",
            WsMessage::Error(_) => "Error",
            WsMessage::HeartbeatAck(_) => "HeartbeatAck",
            WsMessage::PlayerAction(_) => "PlayerAction",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_serialization() {
        let msg = WsMessage::Heartbeat(HeartbeatRequest {
            sequence: 1,
            timestamp: Utc::now(),
        });

        let json = serde_json::to_string(&msg).unwrap();
        let deserialized: WsMessage = serde_json::from_str(&json).unwrap();

        assert!(matches!(deserialized, WsMessage::Heartbeat(_)));
    }

    #[test]
    fn test_message_criticality() {
        let auth_msg = WsMessage::Authenticate(AuthenticateRequest {
            access_token: "test".to_string(),
            device_id: None,
            client_version: "1.0.0".to_string(),
        });

        assert!(auth_msg.is_critical());

        let heartbeat_msg = WsMessage::Heartbeat(HeartbeatRequest {
            sequence: 1,
            timestamp: Utc::now(),
        });

        assert!(!heartbeat_msg.is_critical());
    }
}