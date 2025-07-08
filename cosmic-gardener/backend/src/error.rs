use actix_web::{HttpResponse, ResponseError};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub request_id: Option<String>,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug)]
pub enum AppError {
    DatabaseError(sqlx::Error),
    ValidationError(validator::ValidationErrors),
    AuthenticationError(String),
    AuthorizationError(String),
    NotFound(String),
    Conflict(String),
    BadRequest(String),
    InternalServerError(String),
    RateLimitExceeded(String),
    TokenError(jsonwebtoken::errors::Error),
    PasswordHashError(argon2::password_hash::Error),
    SerializationError(serde_json::Error),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::DatabaseError(e) => write!(f, "Database error: {}", e),
            AppError::ValidationError(e) => write!(f, "Validation error: {}", e),
            AppError::AuthenticationError(msg) => write!(f, "Authentication error: {}", msg),
            AppError::AuthorizationError(msg) => write!(f, "Authorization error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            AppError::InternalServerError(msg) => write!(f, "Internal server error: {}", msg),
            AppError::RateLimitExceeded(msg) => write!(f, "Rate limit exceeded: {}", msg),
            AppError::TokenError(e) => write!(f, "Token error: {}", e),
            AppError::PasswordHashError(e) => write!(f, "Password hash error: {}", e),
            AppError::SerializationError(e) => write!(f, "Serialization error: {}", e),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status_code, error_code, message) = match self {
            AppError::DatabaseError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "Internal server error",
            ),
            AppError::ValidationError(errors) => {
                let details = serde_json::to_value(errors).unwrap_or_default();
                return HttpResponse::BadRequest().json(ApiError {
                    code: "VALIDATION_ERROR".to_string(),
                    message: "Validation failed".to_string(),
                    timestamp: chrono::Utc::now(),
                    request_id: None,
                    details: Some(details),
                });
            }
            AppError::AuthenticationError(_) => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "AUTH_INVALID_CREDENTIALS",
                "Invalid email or password",
            ),
            AppError::AuthorizationError(_) => (
                actix_web::http::StatusCode::FORBIDDEN,
                "AUTH_INSUFFICIENT_PERMISSION",
                "Insufficient permissions",
            ),
            AppError::NotFound(_) => (
                actix_web::http::StatusCode::NOT_FOUND,
                "RESOURCE_NOT_FOUND",
                "Resource not found",
            ),
            AppError::Conflict(_) => (
                actix_web::http::StatusCode::CONFLICT,
                "RESOURCE_CONFLICT",
                "Resource already exists",
            ),
            AppError::BadRequest(_) => (
                actix_web::http::StatusCode::BAD_REQUEST,
                "BAD_REQUEST",
                "Bad request",
            ),
            AppError::InternalServerError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                "Internal server error",
            ),
            AppError::RateLimitExceeded(_) => (
                actix_web::http::StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMIT_EXCEEDED",
                "Rate limit exceeded",
            ),
            AppError::TokenError(_) => (
                actix_web::http::StatusCode::UNAUTHORIZED,
                "AUTH_TOKEN_INVALID",
                "Invalid token",
            ),
            AppError::PasswordHashError(_) => (
                actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                "Internal server error",
            ),
            AppError::SerializationError(_) => (
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

// From implementations for error conversion
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::DatabaseError(err)
    }
}

impl From<validator::ValidationErrors> for AppError {
    fn from(err: validator::ValidationErrors) -> Self {
        AppError::ValidationError(err)
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        AppError::TokenError(err)
    }
}

impl From<argon2::password_hash::Error> for AppError {
    fn from(err: argon2::password_hash::Error) -> Self {
        AppError::PasswordHashError(err)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err)
    }
}

pub type Result<T> = std::result::Result<T, AppError>;