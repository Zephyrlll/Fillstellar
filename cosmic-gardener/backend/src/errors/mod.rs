use actix_web::{HttpResponse, ResponseError};
use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;

/// Unified error type for the entire application
#[derive(Debug, Error)]
pub enum GameError {
    // Database errors
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    // Cache errors
    #[error("Cache error: {0}")]
    Cache(#[from] redis::RedisError),
    
    // Configuration errors
    #[error("Configuration error: {0}")]
    Configuration(#[from] config::ConfigError),
    
    // Serialization errors
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    // Authentication and Authorization
    #[error("Authentication error: {0}")]
    Authentication(String),
    
    #[error("Authorization error: {0}")]
    Authorization(String),
    
    #[error("Token error: {0}")]
    TokenError(#[from] jsonwebtoken::errors::Error),
    
    #[error("Password hash error: {0}")]
    PasswordHashError(#[from] argon2::password_hash::Error),
    
    // Validation errors
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Validation errors: {0}")]
    ValidationErrors(#[from] validator::ValidationErrors),
    
    // Resource errors
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    // Game-specific errors
    #[error("Invalid resource value: {0}")]
    InvalidResource(String),
    
    #[error("Insufficient resources")]
    InsufficientResources,
    
    #[error("Celestial body not found")]
    BodyNotFound,
    
    #[error("Maximum number of bodies reached")]
    BodyLimitReached,
    
    #[error("Position is out of bounds")]
    OutOfBounds,
    
    #[error("Objects are too close together")]
    TooClose,
    
    // Physics and simulation errors
    #[error("Physics calculation error: {0}")]
    PhysicsError(String),
    
    #[error("Physics simulation error: {0}")]
    PhysicsSimulation(String),
    
    // Business logic errors
    #[error("Business logic error: {0}")]
    BusinessLogic(String),
    
    // WebSocket errors
    #[error("WebSocket error: {0}")]
    WebSocket(String),
    
    // Rate limiting
    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),
    
    // External API errors
    #[error("External API error: {0}")]
    ExternalApi(String),
    
    // System errors
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("System error: {0}")]
    SystemError(String),
    
    #[error("Internal server error: {0}")]
    InternalServerError(String),
}

/// Type alias for Result with GameError
pub type Result<T> = std::result::Result<T, GameError>;

/// API error response structure
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub request_id: Option<String>,
    pub details: Option<serde_json::Value>,
}

impl ResponseError for GameError {
    fn error_response(&self) -> HttpResponse {
        let (status_code, error_code, message) = match self {
            // Database and system errors
            GameError::Database(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "Internal server error",
            ),
            GameError::Cache(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "CACHE_ERROR",
                "Internal server error",
            ),
            GameError::Configuration(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "CONFIG_ERROR",
                "Internal server error",
            ),
            GameError::Io(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "IO_ERROR",
                "Internal server error",
            ),
            GameError::SystemError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "SYSTEM_ERROR",
                "Internal server error",
            ),
            GameError::InternalServerError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                "Internal server error",
            ),
            
            // Authentication and authorization
            GameError::Authentication(_) => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "AUTH_INVALID_CREDENTIALS",
                "Invalid email or password",
            ),
            GameError::Authorization(_) => (
                actix_web::http::StatusCode::FORBIDDEN,
                "AUTH_INSUFFICIENT_PERMISSION",
                "Insufficient permissions",
            ),
            GameError::TokenError(_) => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "AUTH_TOKEN_INVALID",
                "Invalid token",
            ),
            GameError::PasswordHashError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "PASSWORD_HASH_ERROR",
                "Internal server error",
            ),
            
            // Validation errors
            GameError::Validation(msg) => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
                msg,
            ),
            GameError::ValidationErrors(errors) => {
                let details = serde_json::to_value(errors).unwrap_or_default();
                return HttpResponse::BadRequest().json(ApiError {
                    code: "VALIDATION_ERROR".to_string(),
                    message: "Validation failed".to_string(),
                    timestamp: chrono::Utc::now(),
                    request_id: None,
                    details: Some(details),
                });
            }
            GameError::BadRequest(msg) => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "BAD_REQUEST",
                msg,
            ),
            
            // Resource errors
            GameError::NotFound(msg) => (
                actix_web::http::StatusCode::NOT_FOUND,
                "RESOURCE_NOT_FOUND",
                msg,
            ),
            GameError::Conflict(msg) => (
                actix_web::http::StatusCode::CONFLICT,
                "RESOURCE_CONFLICT",
                msg,
            ),
            
            // Game-specific errors
            GameError::InvalidResource(msg) => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "INVALID_RESOURCE",
                msg,
            ),
            GameError::InsufficientResources => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "INSUFFICIENT_RESOURCES",
                "Insufficient resources",
            ),
            GameError::BodyNotFound => (
                actix_web::http::StatusCode::NOT_FOUND,
                "BODY_NOT_FOUND",
                "Celestial body not found",
            ),
            GameError::BodyLimitReached => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "BODY_LIMIT_REACHED",
                "Maximum number of bodies reached",
            ),
            GameError::OutOfBounds => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "OUT_OF_BOUNDS",
                "Position is out of bounds",
            ),
            GameError::TooClose => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "TOO_CLOSE",
                "Objects are too close together",
            ),
            
            // Physics and business logic
            GameError::PhysicsError(msg) | GameError::PhysicsSimulation(msg) => (
                actix_web::http::StatusCode::UNPROCESSABLE_ENTITY,
                "PHYSICS_ERROR",
                msg,
            ),
            GameError::BusinessLogic(msg) => (
                actix_web::http::StatusCode::UNPROCESSABLE_ENTITY,
                "BUSINESS_LOGIC_ERROR",
                msg,
            ),
            
            // Other errors
            GameError::RateLimitExceeded(msg) => (
                actix_web::http::StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMIT_EXCEEDED",
                msg,
            ),
            GameError::WebSocket(msg) => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "WEBSOCKET_ERROR",
                msg,
            ),
            GameError::ExternalApi(msg) => (
                actix_web::http::StatusCode::BAD_GATEWAY,
                "EXTERNAL_API_ERROR",
                msg,
            ),
            GameError::Serialization(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "SERIALIZATION_ERROR",
                "Serialization error",
            ),
        };

        HttpResponse::build(status_code).json(ApiError {
            code: error_code.to_string(),
            message: message.to_string(),
            timestamp: chrono::Utc::now(),
            request_id: None,
            details: None,
        })
    }
}

impl GameError {
    /// Create a validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }
    
    /// Create an authentication error
    pub fn authentication(message: impl Into<String>) -> Self {
        Self::Authentication(message.into())
    }
    
    /// Create an authorization error
    pub fn authorization(message: impl Into<String>) -> Self {
        Self::Authorization(message.into())
    }
    
    /// Create a not found error
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }
    
    /// Create a conflict error
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::Conflict(message.into())
    }
    
    /// Create a bad request error
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::BadRequest(message.into())
    }
    
    /// Create a business logic error
    pub fn business_logic(message: impl Into<String>) -> Self {
        Self::BusinessLogic(message.into())
    }
    
    /// Create a physics simulation error
    pub fn physics_simulation(message: impl Into<String>) -> Self {
        Self::PhysicsSimulation(message.into())
    }
    
    /// Create a WebSocket error
    pub fn websocket(message: impl Into<String>) -> Self {
        Self::WebSocket(message.into())
    }
    
    /// Create an internal error
    pub fn internal(message: impl Into<String>) -> Self {
        Self::InternalServerError(message.into())
    }
}

/// WebSocket error codes
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WsErrorCode {
    InternalError,
    InvalidMessage,
    AuthenticationFailed,
    RateLimitExceeded,
    ValidationFailed,
}

/// Error response structure for API endpoints
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_error_creation() {
        let error = GameError::validation("Invalid input");
        assert!(matches!(error, GameError::Validation(_)));
        
        let error = GameError::not_found("Resource not found");
        assert!(matches!(error, GameError::NotFound(_)));
    }
    
    #[test]
    fn test_error_response() {
        let error = GameError::validation("Invalid input");
        let response = error.error_response();
        assert_eq!(response.status(), 400);
        
        let error = GameError::not_found("Resource not found");
        let response = error.error_response();
        assert_eq!(response.status(), 404);
    }
}