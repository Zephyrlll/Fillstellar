//! WebSocket通信用のエラー定義
//!
//! WebSocket固有のエラーコードと処理戦略を定義します。

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::time::Duration;

use crate::errors::{ApiError, ErrorCode};

/// WebSocketエラーコード
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum WsErrorCode {
    // === 認証エラー (WS_AUTH_xxx) ===
    /// 認証失敗
    AuthenticationFailed,
    /// トークン期限切れ
    TokenExpired,
    /// 無効なデバイス
    InvalidDevice,
    /// セッション無効
    InvalidSession,
    
    // === 同期エラー (WS_SYNC_xxx) ===
    /// 同期コンフリクト
    SyncConflict,
    /// チェックサム不一致
    ChecksumMismatch,
    /// 状態破損
    StateCorrupted,
    /// バージョン不一致
    VersionMismatch,
    
    // === レート制限 (WS_RATE_xxx) ===
    /// レート制限超過
    RateLimitExceeded,
    /// メッセージサイズ超過
    MessageTooLarge,
    /// 接続数超過
    TooManyConnections,
    
    // === プロトコルエラー (WS_PROTO_xxx) ===
    /// 無効なメッセージフォーマット
    InvalidMessageFormat,
    /// サポートされないバージョン
    UnsupportedVersion,
    /// プロトコル違反
    ProtocolViolation,
    /// 無効なシーケンス番号
    InvalidSequenceNumber,
    
    // === ゲームロジックエラー (WS_GAME_xxx) ===
    /// 無効な天体データ
    InvalidCelestialBody,
    /// リソース不足
    InsufficientResources,
    /// 物理法則違反
    PhysicsViolation,
    /// 操作権限なし
    UnauthorizedOperation,
    
    // === 接続エラー (WS_CONN_xxx) ===
    /// 接続タイムアウト
    ConnectionTimeout,
    /// ハートビートタイムアウト
    HeartbeatTimeout,
    /// 予期しない切断
    UnexpectedDisconnect,
    /// 再接続失敗
    ReconnectionFailed,
}

impl WsErrorCode {
    /// エラーコード文字列を取得
    pub fn as_str(&self) -> &'static str {
        match self {
            // 認証エラー
            Self::AuthenticationFailed => "WS_AUTH_001",
            Self::TokenExpired => "WS_AUTH_002",
            Self::InvalidDevice => "WS_AUTH_003",
            Self::InvalidSession => "WS_AUTH_004",
            
            // 同期エラー
            Self::SyncConflict => "WS_SYNC_001",
            Self::ChecksumMismatch => "WS_SYNC_002",
            Self::StateCorrupted => "WS_SYNC_003",
            Self::VersionMismatch => "WS_SYNC_004",
            
            // レート制限
            Self::RateLimitExceeded => "WS_RATE_001",
            Self::MessageTooLarge => "WS_RATE_002",
            Self::TooManyConnections => "WS_RATE_003",
            
            // プロトコルエラー
            Self::InvalidMessageFormat => "WS_PROTO_001",
            Self::UnsupportedVersion => "WS_PROTO_002",
            Self::ProtocolViolation => "WS_PROTO_003",
            Self::InvalidSequenceNumber => "WS_PROTO_004",
            
            // ゲームロジックエラー
            Self::InvalidCelestialBody => "WS_GAME_001",
            Self::InsufficientResources => "WS_GAME_002",
            Self::PhysicsViolation => "WS_GAME_003",
            Self::UnauthorizedOperation => "WS_GAME_004",
            
            // 接続エラー
            Self::ConnectionTimeout => "WS_CONN_001",
            Self::HeartbeatTimeout => "WS_CONN_002",
            Self::UnexpectedDisconnect => "WS_CONN_003",
            Self::ReconnectionFailed => "WS_CONN_004",
        }
    }
    
    /// エラーメッセージを取得
    pub fn message(&self) -> &'static str {
        match self {
            // 認証エラー
            Self::AuthenticationFailed => "WebSocket認証に失敗しました",
            Self::TokenExpired => "認証トークンの有効期限が切れています",
            Self::InvalidDevice => "無効なデバイスIDです",
            Self::InvalidSession => "セッションが無効または期限切れです",
            
            // 同期エラー
            Self::SyncConflict => "同期コンフリクトが発生しました",
            Self::ChecksumMismatch => "データの整合性チェックに失敗しました",
            Self::StateCorrupted => "ゲーム状態が破損しています",
            Self::VersionMismatch => "クライアントバージョンが不一致です",
            
            // レート制限
            Self::RateLimitExceeded => "リクエスト頻度が制限を超えています",
            Self::MessageTooLarge => "メッセージサイズが大きすぎます",
            Self::TooManyConnections => "接続数が上限に達しています",
            
            // プロトコルエラー
            Self::InvalidMessageFormat => "無効なメッセージフォーマットです",
            Self::UnsupportedVersion => "サポートされていないプロトコルバージョンです",
            Self::ProtocolViolation => "プロトコル違反が検出されました",
            Self::InvalidSequenceNumber => "シーケンス番号が不正です",
            
            // ゲームロジックエラー
            Self::InvalidCelestialBody => "無効な天体データです",
            Self::InsufficientResources => "リソースが不足しています",
            Self::PhysicsViolation => "物理演算エラーが発生しました",
            Self::UnauthorizedOperation => "この操作を実行する権限がありません",
            
            // 接続エラー
            Self::ConnectionTimeout => "接続がタイムアウトしました",
            Self::HeartbeatTimeout => "ハートビートがタイムアウトしました",
            Self::UnexpectedDisconnect => "予期しない切断が発生しました",
            Self::ReconnectionFailed => "再接続に失敗しました",
        }
    }
    
    /// リトライ可能なエラーかどうか
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::ConnectionTimeout
                | Self::HeartbeatTimeout
                | Self::UnexpectedDisconnect
                | Self::RateLimitExceeded
                | Self::SyncConflict
        )
    }
    
    /// HTTPステータスコードを取得
    pub fn http_status(&self) -> u16 {
        match self {
            // 認証エラー → 401
            Self::AuthenticationFailed | Self::TokenExpired | Self::InvalidSession => 401,
            
            // 権限エラー → 403
            Self::InvalidDevice | Self::UnauthorizedOperation => 403,
            
            // バリデーションエラー → 400
            Self::InvalidMessageFormat
            | Self::InvalidCelestialBody
            | Self::InsufficientResources
            | Self::PhysicsViolation
            | Self::InvalidSequenceNumber => 400,
            
            // レート制限 → 429
            Self::RateLimitExceeded | Self::TooManyConnections => 429,
            
            // ペイロードサイズ → 413
            Self::MessageTooLarge => 413,
            
            // バージョン不一致 → 426
            Self::UnsupportedVersion | Self::VersionMismatch => 426,
            
            // サーバーエラー → 500
            Self::StateCorrupted | Self::ChecksumMismatch => 500,
            
            // その他 → 503
            _ => 503,
        }
    }
}

/// エラー処理戦略
#[derive(Debug, Clone)]
pub struct ErrorHandler {
    /// リトライ可能なエラーのセット
    retryable_errors: HashSet<WsErrorCode>,
    /// 最大リトライ回数
    max_retries: u32,
    /// バックオフ戦略
    backoff_strategy: BackoffStrategy,
}

impl Default for ErrorHandler {
    fn default() -> Self {
        let mut retryable_errors = HashSet::new();
        retryable_errors.insert(WsErrorCode::ConnectionTimeout);
        retryable_errors.insert(WsErrorCode::HeartbeatTimeout);
        retryable_errors.insert(WsErrorCode::UnexpectedDisconnect);
        retryable_errors.insert(WsErrorCode::RateLimitExceeded);
        retryable_errors.insert(WsErrorCode::SyncConflict);

        Self {
            retryable_errors,
            max_retries: 3,
            backoff_strategy: BackoffStrategy::default(),
        }
    }
}

impl ErrorHandler {
    /// エラーがリトライ可能かチェック
    pub fn is_retryable(&self, error: &WsErrorCode) -> bool {
        self.retryable_errors.contains(error)
    }
    
    /// 次のリトライまでの待機時間を計算
    pub fn calculate_retry_delay(&self, attempt: u32) -> Duration {
        self.backoff_strategy.calculate_delay(attempt)
    }
}

/// バックオフ戦略
#[derive(Debug, Clone)]
pub enum BackoffStrategy {
    /// 固定間隔
    Fixed {
        delay_ms: u64,
    },
    /// 指数バックオフ
    Exponential {
        initial_ms: u64,
        max_ms: u64,
        multiplier: f64,
    },
    /// ジッター付き指数バックオフ
    ExponentialJitter {
        initial_ms: u64,
        max_ms: u64,
        multiplier: f64,
        jitter_factor: f64,
    },
}

impl Default for BackoffStrategy {
    fn default() -> Self {
        Self::ExponentialJitter {
            initial_ms: 1000,
            max_ms: 30000,
            multiplier: 2.0,
            jitter_factor: 0.1,
        }
    }
}

impl BackoffStrategy {
    /// リトライ遅延を計算
    pub fn calculate_delay(&self, attempt: u32) -> Duration {
        match self {
            Self::Fixed { delay_ms } => Duration::from_millis(*delay_ms),
            
            Self::Exponential {
                initial_ms,
                max_ms,
                multiplier,
            } => {
                let delay = (*initial_ms as f64) * multiplier.powf((attempt - 1) as f64);
                let delay = delay.min(*max_ms as f64) as u64;
                Duration::from_millis(delay)
            }
            
            Self::ExponentialJitter {
                initial_ms,
                max_ms,
                multiplier,
                jitter_factor,
            } => {
                let base_delay = (*initial_ms as f64) * multiplier.powf((attempt - 1) as f64);
                let base_delay = base_delay.min(*max_ms as f64);
                
                // ジッターを追加
                let jitter = base_delay * jitter_factor;
                let random_factor = 1.0 + (rand::random::<f64>() - 0.5) * 2.0 * jitter_factor;
                let final_delay = (base_delay * random_factor) as u64;
                
                Duration::from_millis(final_delay)
            }
        }
    }
}

/// WebSocketエラーからApiErrorへの変換
impl From<WsErrorCode> for crate::errors::ApiError {
    fn from(ws_error: WsErrorCode) -> Self {
        crate::errors::ApiError {
            code: crate::errors::ErrorCode::Custom(ws_error.as_str().to_string()),
            message: ws_error.message().to_string(),
            details: None,
            status_code: ws_error.http_status(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_retryability() {
        let handler = ErrorHandler::default();
        
        assert!(handler.is_retryable(&WsErrorCode::ConnectionTimeout));
        assert!(handler.is_retryable(&WsErrorCode::RateLimitExceeded));
        assert!(!handler.is_retryable(&WsErrorCode::InvalidMessageFormat));
        assert!(!handler.is_retryable(&WsErrorCode::AuthenticationFailed));
    }

    #[test]
    fn test_exponential_backoff() {
        let strategy = BackoffStrategy::Exponential {
            initial_ms: 1000,
            max_ms: 10000,
            multiplier: 2.0,
        };

        assert_eq!(strategy.calculate_delay(1), Duration::from_millis(1000));
        assert_eq!(strategy.calculate_delay(2), Duration::from_millis(2000));
        assert_eq!(strategy.calculate_delay(3), Duration::from_millis(4000));
        assert_eq!(strategy.calculate_delay(4), Duration::from_millis(8000));
        assert_eq!(strategy.calculate_delay(5), Duration::from_millis(10000)); // max
    }

    #[test]
    fn test_ws_error_to_api_error() {
        let ws_error = WsErrorCode::AuthenticationFailed;
        let api_error: crate::errors::ApiError = ws_error.into();
        
        assert_eq!(api_error.status_code, 401);
        assert!(api_error.message.contains("認証"));
    }
}