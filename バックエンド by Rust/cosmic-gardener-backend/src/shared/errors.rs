//! # Error Handling
//!
//! アプリケーション全体のエラーハンドリングを統一します。

use actix_web::{HttpResponse, ResponseError};
use std::fmt;

/// アプリケーションの結果型
pub type Result<T> = std::result::Result<T, Error>;

/// アプリケーションエラー
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Cache error: {0}")]
    Cache(#[from] redis::RedisError),
    
    #[error("Configuration error: {0}")]
    Configuration(#[from] config::ConfigError),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Authentication error: {0}")]
    Authentication(String),
    
    #[error("Authorization error: {0}")]
    Authorization(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Business logic error: {0}")]
    BusinessLogic(String),
    
    #[error("Physics simulation error: {0}")]
    PhysicsSimulation(String),
    
    #[error("WebSocket error: {0}")]
    WebSocket(String),
    
    #[error("External API error: {0}")]
    ExternalApi(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Internal server error: {0}")]
    Internal(String),
}

impl ResponseError for Error {
    fn error_response(&self) -> HttpResponse {
        match self {
            Error::Validation(msg) => {
                HttpResponse::BadRequest().json(ErrorResponse {
                    error: "validation_error".to_string(),
                    message: msg.clone(),
                    details: None,
                })
            }
            Error::Authentication(msg) => {
                HttpResponse::Unauthorized().json(ErrorResponse {
                    error: "authentication_error".to_string(),
                    message: msg.clone(),
                    details: None,
                })
            }
            Error::Authorization(msg) => {
                HttpResponse::Forbidden().json(ErrorResponse {
                    error: "authorization_error".to_string(),
                    message: msg.clone(),
                    details: None,
                })
            }
            Error::NotFound(msg) => {
                HttpResponse::NotFound().json(ErrorResponse {
                    error: "not_found".to_string(),
                    message: msg.clone(),
                    details: None,
                })
            }
            Error::Conflict(msg) => {
                HttpResponse::Conflict().json(ErrorResponse {
                    error: "conflict".to_string(),
                    message: msg.clone(),
                    details: None,
                })
            }
            Error::BusinessLogic(msg) => {
                HttpResponse::UnprocessableEntity().json(ErrorResponse {
                    error: "business_logic_error".to_string(),
                    message: msg.clone(),
                    details: None,
                })
            }
            _ => {
                tracing::error!("Internal server error: {:?}", self);
                HttpResponse::InternalServerError().json(ErrorResponse {
                    error: "internal_server_error".to_string(),
                    message: "An internal server error occurred".to_string(),
                    details: None,
                })
            }
        }
    }
}

/// エラーレスポンス
#[derive(Debug, serde::Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

/// バリデーションエラーの詳細
#[derive(Debug, serde::Serialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

/// 複数のバリデーションエラー
#[derive(Debug, serde::Serialize)]
pub struct ValidationErrors {
    pub errors: Vec<ValidationError>,
}

impl Error {
    /// バリデーションエラーを作成
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }
    
    /// 認証エラーを作成
    pub fn authentication(message: impl Into<String>) -> Self {
        Self::Authentication(message.into())
    }
    
    /// 認可エラーを作成
    pub fn authorization(message: impl Into<String>) -> Self {
        Self::Authorization(message.into())
    }
    
    /// 見つからないエラーを作成
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }
    
    /// 競合エラーを作成
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::Conflict(message.into())
    }
    
    /// ビジネスロジックエラーを作成
    pub fn business_logic(message: impl Into<String>) -> Self {
        Self::BusinessLogic(message.into())
    }
    
    /// 物理シミュレーションエラーを作成
    pub fn physics_simulation(message: impl Into<String>) -> Self {
        Self::PhysicsSimulation(message.into())
    }
    
    /// WebSocketエラーを作成
    pub fn websocket(message: impl Into<String>) -> Self {
        Self::WebSocket(message.into())
    }
    
    /// 内部エラーを作成
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_error_creation() {
        let error = Error::validation("Invalid input");
        assert!(matches!(error, Error::Validation(_)));
        
        let error = Error::not_found("Resource not found");
        assert!(matches!(error, Error::NotFound(_)));
    }
    
    #[test]
    fn test_error_response() {
        let error = Error::validation("Invalid input");
        let response = error.error_response();
        assert_eq!(response.status(), 400);
    }
}