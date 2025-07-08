use actix_web::{HttpResponse, ResponseError};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

pub mod codes;
pub mod macros;
pub mod conversions;

pub use codes::{ErrorCode, ErrorCategory};

/// 統一的なエラーレスポンス構造体
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    /// エラーの種類
    pub error: String,
    /// システム内部でのエラーコード
    pub error_code: String,
    /// ユーザー向けメッセージ
    pub message: String,
    /// リクエストID（トレーシング用）
    pub request_id: String,
    /// エラー発生時刻
    pub timestamp: DateTime<Utc>,
    /// 詳細情報（開発時のみ）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
    /// トレースID（分散トレーシング用）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}

/// メインのエラー型
#[derive(Debug)]
pub enum ApiError {
    // === 認証・認可エラー ===
    /// 認証が必要
    Unauthorized { 
        code: ErrorCode, 
        message: String,
        details: Option<serde_json::Value>,
    },
    /// 権限不足
    Forbidden { 
        code: ErrorCode, 
        message: String,
        required_permission: Option<String>,
    },
    /// 無効なトークン
    InvalidToken { 
        code: ErrorCode, 
        message: String,
        token_type: Option<String>,
    },
    /// トークン期限切れ
    TokenExpired { 
        code: ErrorCode, 
        message: String,
        expired_at: Option<DateTime<Utc>>,
    },

    // === リクエストエラー ===
    /// 不正なリクエスト
    BadRequest { 
        code: ErrorCode, 
        message: String,
        field: Option<String>,
    },
    /// バリデーションエラー
    ValidationError { 
        code: ErrorCode, 
        message: String,
        errors: validator::ValidationErrors,
    },
    /// リソースが見つからない
    NotFound { 
        code: ErrorCode, 
        message: String,
        resource: Option<String>,
    },
    /// リソースの競合
    Conflict { 
        code: ErrorCode, 
        message: String,
        conflicting_field: Option<String>,
    },
    /// ペイロードが大きすぎる
    PayloadTooLarge { 
        code: ErrorCode, 
        message: String,
        max_size: Option<usize>,
    },

    // === レート制限・制約エラー ===
    /// レート制限に達した
    RateLimitExceeded { 
        code: ErrorCode, 
        message: String,
        retry_after: Option<u64>,
        limit_type: Option<String>,
    },
    /// サービス利用不可
    ServiceUnavailable { 
        code: ErrorCode, 
        message: String,
        retry_after: Option<u64>,
    },

    // === データベースエラー ===
    /// データベース接続エラー
    DatabaseConnectionError { 
        code: ErrorCode, 
        message: String,
    },
    /// データベース制約違反
    DatabaseConstraintViolation { 
        code: ErrorCode, 
        message: String,
        constraint: Option<String>,
    },
    /// データベーストランザクションエラー
    DatabaseTransactionError { 
        code: ErrorCode, 
        message: String,
    },

    // === 外部サービスエラー ===
    /// 外部API呼び出しエラー
    ExternalServiceError { 
        code: ErrorCode, 
        message: String,
        service: Option<String>,
        status_code: Option<u16>,
    },
    /// タイムアウト
    TimeoutError { 
        code: ErrorCode, 
        message: String,
        timeout_duration: Option<u64>,
    },

    // === ビジネスロジックエラー ===
    /// ビジネスルール違反
    BusinessRuleViolation { 
        code: ErrorCode, 
        message: String,
        rule: Option<String>,
    },
    /// ゲーム固有のエラー
    GameError { 
        code: ErrorCode, 
        message: String,
        game_state: Option<String>,
    },

    // === システムエラー ===
    /// 内部サーバーエラー
    InternalServerError { 
        code: ErrorCode, 
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    /// 設定エラー
    ConfigurationError { 
        code: ErrorCode, 
        message: String,
        config_key: Option<String>,
    },
}

impl ApiError {
    /// エラーの重要度を返す
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            ApiError::InternalServerError { .. } | 
            ApiError::DatabaseConnectionError { .. } |
            ApiError::ConfigurationError { .. } => ErrorSeverity::Critical,
            
            ApiError::ExternalServiceError { .. } |
            ApiError::DatabaseTransactionError { .. } |
            ApiError::ServiceUnavailable { .. } => ErrorSeverity::High,
            
            ApiError::TimeoutError { .. } |
            ApiError::DatabaseConstraintViolation { .. } |
            ApiError::BusinessRuleViolation { .. } => ErrorSeverity::Medium,
            
            ApiError::RateLimitExceeded { .. } |
            ApiError::GameError { .. } |
            ApiError::Conflict { .. } => ErrorSeverity::Low,
            
            _ => ErrorSeverity::Info,
        }
    }

    /// エラーがリトライ可能かどうか
    pub fn is_retryable(&self) -> bool {
        matches!(self,
            ApiError::ServiceUnavailable { .. } |
            ApiError::TimeoutError { .. } |
            ApiError::DatabaseConnectionError { .. } |
            ApiError::ExternalServiceError { .. }
        )
    }

    /// エラーを詳細情報と共に作成
    pub fn with_details<T: Serialize>(mut self, details: T) -> Self {
        let details_value = serde_json::to_value(details).ok();
        match &mut self {
            ApiError::Unauthorized { details: d, .. } |
            ApiError::BadRequest { .. } => {
                // 詳細情報をフィールドに設定する処理は省略
                // 実際の実装では各バリアントに詳細フィールドを追加
            }
            _ => {}
        }
        self
    }

    /// リクエストIDを設定
    pub fn with_request_id(self, _request_id: String) -> Self {
        // 実装は省略（ミドルウェアで設定）
        self
    }
}

/// エラーの重要度
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorSeverity {
    Critical,  // システム停止レベル
    High,      // サービス影響あり
    Medium,    // 部分的な機能停止
    Low,       // ユーザー体験に軽微な影響
    Info,      // 情報レベル
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::Unauthorized { message, .. } => write!(f, "Unauthorized: {}", message),
            ApiError::Forbidden { message, .. } => write!(f, "Forbidden: {}", message),
            ApiError::InvalidToken { message, .. } => write!(f, "Invalid Token: {}", message),
            ApiError::TokenExpired { message, .. } => write!(f, "Token Expired: {}", message),
            ApiError::BadRequest { message, .. } => write!(f, "Bad Request: {}", message),
            ApiError::ValidationError { message, .. } => write!(f, "Validation Error: {}", message),
            ApiError::NotFound { message, .. } => write!(f, "Not Found: {}", message),
            ApiError::Conflict { message, .. } => write!(f, "Conflict: {}", message),
            ApiError::PayloadTooLarge { message, .. } => write!(f, "Payload Too Large: {}", message),
            ApiError::RateLimitExceeded { message, .. } => write!(f, "Rate Limit Exceeded: {}", message),
            ApiError::ServiceUnavailable { message, .. } => write!(f, "Service Unavailable: {}", message),
            ApiError::DatabaseConnectionError { message, .. } => write!(f, "Database Connection Error: {}", message),
            ApiError::DatabaseConstraintViolation { message, .. } => write!(f, "Database Constraint Violation: {}", message),
            ApiError::DatabaseTransactionError { message, .. } => write!(f, "Database Transaction Error: {}", message),
            ApiError::ExternalServiceError { message, .. } => write!(f, "External Service Error: {}", message),
            ApiError::TimeoutError { message, .. } => write!(f, "Timeout Error: {}", message),
            ApiError::BusinessRuleViolation { message, .. } => write!(f, "Business Rule Violation: {}", message),
            ApiError::GameError { message, .. } => write!(f, "Game Error: {}", message),
            ApiError::InternalServerError { message, .. } => write!(f, "Internal Server Error: {}", message),
            ApiError::ConfigurationError { message, .. } => write!(f, "Configuration Error: {}", message),
        }
    }
}

impl std::error::Error for ApiError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ApiError::InternalServerError { source, .. } => {
                source.as_ref().map(|e| e.as_ref() as &(dyn std::error::Error + 'static))
            }
            _ => None,
        }
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        let request_id = Uuid::new_v4().to_string();
        let timestamp = Utc::now();

        // ログ出力
        self.log_error(&request_id);

        let (status_code, error_code) = self.get_status_and_code();
        let error_response = self.to_error_response(request_id, timestamp, error_code.clone());

        HttpResponse::build(status_code)
            .insert_header(("X-Request-ID", error_response.request_id.clone()))
            .json(error_response)
    }

    fn status_code(&self) -> actix_web::http::StatusCode {
        self.get_status_and_code().0
    }
}

impl ApiError {
    /// HTTPステータスコードとエラーコードを取得
    fn get_status_and_code(&self) -> (actix_web::http::StatusCode, ErrorCode) {
        use actix_web::http::StatusCode;
        
        match self {
            ApiError::Unauthorized { code, .. } => (StatusCode::UNAUTHORIZED, *code),
            ApiError::Forbidden { code, .. } => (StatusCode::FORBIDDEN, *code),
            ApiError::InvalidToken { code, .. } => (StatusCode::UNAUTHORIZED, *code),
            ApiError::TokenExpired { code, .. } => (StatusCode::UNAUTHORIZED, *code),
            ApiError::BadRequest { code, .. } => (StatusCode::BAD_REQUEST, *code),
            ApiError::ValidationError { code, .. } => (StatusCode::BAD_REQUEST, *code),
            ApiError::NotFound { code, .. } => (StatusCode::NOT_FOUND, *code),
            ApiError::Conflict { code, .. } => (StatusCode::CONFLICT, *code),
            ApiError::PayloadTooLarge { code, .. } => (StatusCode::PAYLOAD_TOO_LARGE, *code),
            ApiError::RateLimitExceeded { code, .. } => (StatusCode::TOO_MANY_REQUESTS, *code),
            ApiError::ServiceUnavailable { code, .. } => (StatusCode::SERVICE_UNAVAILABLE, *code),
            ApiError::DatabaseConnectionError { code, .. } => (StatusCode::INTERNAL_SERVER_ERROR, *code),
            ApiError::DatabaseConstraintViolation { code, .. } => (StatusCode::CONFLICT, *code),
            ApiError::DatabaseTransactionError { code, .. } => (StatusCode::INTERNAL_SERVER_ERROR, *code),
            ApiError::ExternalServiceError { code, .. } => (StatusCode::BAD_GATEWAY, *code),
            ApiError::TimeoutError { code, .. } => (StatusCode::GATEWAY_TIMEOUT, *code),
            ApiError::BusinessRuleViolation { code, .. } => (StatusCode::UNPROCESSABLE_ENTITY, *code),
            ApiError::GameError { code, .. } => (StatusCode::UNPROCESSABLE_ENTITY, *code),
            ApiError::InternalServerError { code, .. } => (StatusCode::INTERNAL_SERVER_ERROR, *code),
            ApiError::ConfigurationError { code, .. } => (StatusCode::INTERNAL_SERVER_ERROR, *code),
        }
    }

    /// ErrorResponseに変換
    fn to_error_response(&self, request_id: String, timestamp: DateTime<Utc>, error_code: ErrorCode) -> ErrorResponse {
        let (error_type, message, details) = match self {
            ApiError::Unauthorized { message, details, .. } => ("Unauthorized", message.clone(), details.clone()),
            ApiError::Forbidden { message, required_permission, .. } => {
                let details = required_permission.as_ref().map(|p| serde_json::json!({"required_permission": p}));
                ("Forbidden", message.clone(), details)
            }
            ApiError::InvalidToken { message, token_type, .. } => {
                let details = token_type.as_ref().map(|t| serde_json::json!({"token_type": t}));
                ("InvalidToken", message.clone(), details)
            }
            ApiError::TokenExpired { message, expired_at, .. } => {
                let details = expired_at.as_ref().map(|e| serde_json::json!({"expired_at": e}));
                ("TokenExpired", message.clone(), details)
            }
            ApiError::BadRequest { message, field, .. } => {
                let details = field.as_ref().map(|f| serde_json::json!({"field": f}));
                ("BadRequest", message.clone(), details)
            }
            ApiError::ValidationError { message, errors, .. } => {
                let details = serde_json::to_value(errors).ok();
                ("ValidationError", message.clone(), details)
            }
            ApiError::NotFound { message, resource, .. } => {
                let details = resource.as_ref().map(|r| serde_json::json!({"resource": r}));
                ("NotFound", message.clone(), details)
            }
            ApiError::Conflict { message, conflicting_field, .. } => {
                let details = conflicting_field.as_ref().map(|f| serde_json::json!({"conflicting_field": f}));
                ("Conflict", message.clone(), details)
            }
            ApiError::PayloadTooLarge { message, max_size, .. } => {
                let details = max_size.as_ref().map(|s| serde_json::json!({"max_size": s}));
                ("PayloadTooLarge", message.clone(), details)
            }
            ApiError::RateLimitExceeded { message, retry_after, limit_type, .. } => {
                let mut details_obj = serde_json::Map::new();
                if let Some(retry) = retry_after {
                    details_obj.insert("retry_after".to_string(), serde_json::Value::Number((*retry).into()));
                }
                if let Some(limit) = limit_type {
                    details_obj.insert("limit_type".to_string(), serde_json::Value::String(limit.clone()));
                }
                let details = if details_obj.is_empty() { None } else { Some(serde_json::Value::Object(details_obj)) };
                ("RateLimitExceeded", message.clone(), details)
            }
            ApiError::ServiceUnavailable { message, retry_after, .. } => {
                let details = retry_after.as_ref().map(|r| serde_json::json!({"retry_after": r}));
                ("ServiceUnavailable", message.clone(), details)
            }
            ApiError::DatabaseConnectionError { message, .. } => ("DatabaseConnectionError", message.clone(), None),
            ApiError::DatabaseConstraintViolation { message, constraint, .. } => {
                let details = constraint.as_ref().map(|c| serde_json::json!({"constraint": c}));
                ("DatabaseConstraintViolation", message.clone(), details)
            }
            ApiError::DatabaseTransactionError { message, .. } => ("DatabaseTransactionError", message.clone(), None),
            ApiError::ExternalServiceError { message, service, status_code, .. } => {
                let mut details_obj = serde_json::Map::new();
                if let Some(svc) = service {
                    details_obj.insert("service".to_string(), serde_json::Value::String(svc.clone()));
                }
                if let Some(code) = status_code {
                    details_obj.insert("status_code".to_string(), serde_json::Value::Number((*code).into()));
                }
                let details = if details_obj.is_empty() { None } else { Some(serde_json::Value::Object(details_obj)) };
                ("ExternalServiceError", message.clone(), details)
            }
            ApiError::TimeoutError { message, timeout_duration, .. } => {
                let details = timeout_duration.as_ref().map(|t| serde_json::json!({"timeout_duration": t}));
                ("TimeoutError", message.clone(), details)
            }
            ApiError::BusinessRuleViolation { message, rule, .. } => {
                let details = rule.as_ref().map(|r| serde_json::json!({"rule": r}));
                ("BusinessRuleViolation", message.clone(), details)
            }
            ApiError::GameError { message, game_state, .. } => {
                let details = game_state.as_ref().map(|g| serde_json::json!({"game_state": g}));
                ("GameError", message.clone(), details)
            }
            ApiError::InternalServerError { message, .. } => ("InternalServerError", message.clone(), None),
            ApiError::ConfigurationError { message, config_key, .. } => {
                let details = config_key.as_ref().map(|k| serde_json::json!({"config_key": k}));
                ("ConfigurationError", message.clone(), details)
            }
        };

        ErrorResponse {
            error: error_type.to_string(),
            error_code: error_code.to_string(),
            message,
            request_id,
            timestamp,
            details,
            trace_id: None, // トレーシングシステムから取得
        }
    }

    /// エラーログを出力
    fn log_error(&self, request_id: &str) {
        match self.severity() {
            ErrorSeverity::Critical => {
                log::error!(
                    target: "cosmic_gardener::api_error",
                    "Critical error occurred: {} (request_id: {})",
                    self,
                    request_id
                );
            }
            ErrorSeverity::High => {
                log::error!(
                    target: "cosmic_gardener::api_error",
                    "High severity error: {} (request_id: {})",
                    self,
                    request_id
                );
            }
            ErrorSeverity::Medium => {
                log::warn!(
                    target: "cosmic_gardener::api_error",
                    "Medium severity error: {} (request_id: {})",
                    self,
                    request_id
                );
            }
            ErrorSeverity::Low => {
                log::info!(
                    target: "cosmic_gardener::api_error",
                    "Low severity error: {} (request_id: {})",
                    self,
                    request_id
                );
            }
            ErrorSeverity::Info => {
                log::debug!(
                    target: "cosmic_gardener::api_error",
                    "Info level error: {} (request_id: {})",
                    self,
                    request_id
                );
            }
        }
    }
}

/// Result型のエイリアス
pub type Result<T> = std::result::Result<T, ApiError>;