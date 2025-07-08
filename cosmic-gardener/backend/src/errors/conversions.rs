use crate::errors::{ApiError, ErrorCode};

/// SQLxエラーからApiErrorへの変換
impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::Database(db_err) => {
                // PostgreSQL固有のエラーコードを解析
                if let Some(code) = db_err.code() {
                    match code.as_ref() {
                        // 一意制約違反
                        "23505" => ApiError::DatabaseConstraintViolation {
                            code: ErrorCode::DB_UNIQUE_VIOLATION,
                            message: "Unique constraint violation".to_string(),
                            constraint: db_err.constraint(),
                        },
                        // 外部キー制約違反
                        "23503" => ApiError::DatabaseConstraintViolation {
                            code: ErrorCode::DB_FOREIGN_KEY_VIOLATION,
                            message: "Foreign key constraint violation".to_string(),
                            constraint: db_err.constraint(),
                        },
                        // NOT NULL制約違反
                        "23502" => ApiError::DatabaseConstraintViolation {
                            code: ErrorCode::DB_CONSTRAINT_VIOLATION,
                            message: "Not null constraint violation".to_string(),
                            constraint: db_err.constraint(),
                        },
                        // その他のデータベースエラー
                        _ => ApiError::DatabaseConnectionError {
                            code: ErrorCode::DB_QUERY_ERROR,
                            message: format!("Database error: {}", db_err.message()),
                        },
                    }
                } else {
                    ApiError::DatabaseConnectionError {
                        code: ErrorCode::DB_QUERY_ERROR,
                        message: format!("Database error: {}", db_err.message()),
                    }
                }
            }
            sqlx::Error::PoolTimedOut => ApiError::DatabaseConnectionError {
                code: ErrorCode::DB_TIMEOUT,
                message: "Database connection pool timeout".to_string(),
            },
            sqlx::Error::Io(_) => ApiError::DatabaseConnectionError {
                code: ErrorCode::DB_CONNECTION_ERROR,
                message: "Database I/O error".to_string(),
            },
            sqlx::Error::Tls(_) => ApiError::DatabaseConnectionError {
                code: ErrorCode::DB_CONNECTION_ERROR,
                message: "Database TLS error".to_string(),
            },
            sqlx::Error::Protocol(_) => ApiError::DatabaseConnectionError {
                code: ErrorCode::DB_CONNECTION_ERROR,
                message: "Database protocol error".to_string(),
            },
            sqlx::Error::RowNotFound => ApiError::NotFound {
                code: ErrorCode::RESOURCE_NOT_FOUND,
                message: "Requested resource not found".to_string(),
                resource: None,
            },
            sqlx::Error::TypeNotFound { type_name } => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_CONFIGURATION_ERROR,
                message: format!("Database type not found: {}", type_name),
                source: Some(Box::new(err)),
            },
            sqlx::Error::ColumnIndexOutOfBounds { index, len } => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_INTERNAL_ERROR,
                message: format!("Column index {} out of bounds (len: {})", index, len),
                source: Some(Box::new(err)),
            },
            sqlx::Error::ColumnNotFound(column) => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_INTERNAL_ERROR,
                message: format!("Column not found: {}", column),
                source: Some(Box::new(err)),
            },
            sqlx::Error::ColumnDecode { index, source: _ } => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_INTERNAL_ERROR,
                message: format!("Failed to decode column at index {}", index),
                source: Some(Box::new(err)),
            },
            sqlx::Error::Decode(_) => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_INTERNAL_ERROR,
                message: "Failed to decode database value".to_string(),
                source: Some(Box::new(err)),
            },
            _ => ApiError::DatabaseConnectionError {
                code: ErrorCode::DB_CONNECTION_ERROR,
                message: format!("Unexpected database error: {}", err),
            },
        }
    }
}

/// Validatorエラーからの変換
impl From<validator::ValidationErrors> for ApiError {
    fn from(errors: validator::ValidationErrors) -> Self {
        ApiError::ValidationError {
            code: ErrorCode::VALIDATION_MULTIPLE_ERRORS,
            message: "Validation failed".to_string(),
            errors,
        }
    }
}

/// JSONWebTokenエラーからの変換
impl From<jsonwebtoken::errors::Error> for ApiError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        match &err.kind() {
            jsonwebtoken::errors::ErrorKind::InvalidToken => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "Invalid JWT token".to_string(),
                token_type: None,
            },
            jsonwebtoken::errors::ErrorKind::InvalidSignature => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "Invalid JWT signature".to_string(),
                token_type: None,
            },
            jsonwebtoken::errors::ErrorKind::InvalidEcdsaKey => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_CONFIGURATION_ERROR,
                message: "Invalid ECDSA key configuration".to_string(),
                source: Some(Box::new(err)),
            },
            jsonwebtoken::errors::ErrorKind::InvalidRsaKey(_) => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_CONFIGURATION_ERROR,
                message: "Invalid RSA key configuration".to_string(),
                source: Some(Box::new(err)),
            },
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => ApiError::TokenExpired {
                code: ErrorCode::AUTH_TOKEN_EXPIRED,
                message: "JWT token has expired".to_string(),
                expired_at: None,
            },
            jsonwebtoken::errors::ErrorKind::InvalidIssuer => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "Invalid JWT issuer".to_string(),
                token_type: None,
            },
            jsonwebtoken::errors::ErrorKind::InvalidAudience => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "Invalid JWT audience".to_string(),
                token_type: None,
            },
            jsonwebtoken::errors::ErrorKind::InvalidSubject => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "Invalid JWT subject".to_string(),
                token_type: None,
            },
            jsonwebtoken::errors::ErrorKind::ImmatureSignature => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "JWT token not yet valid".to_string(),
                token_type: None,
            },
            jsonwebtoken::errors::ErrorKind::InvalidKeyFormat => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_CONFIGURATION_ERROR,
                message: "Invalid JWT key format".to_string(),
                source: Some(Box::new(err)),
            },
            _ => ApiError::InvalidToken {
                code: ErrorCode::AUTH_INVALID_TOKEN,
                message: "JWT token validation failed".to_string(),
                token_type: None,
            },
        }
    }
}

/// Argon2エラーからの変換
impl From<argon2::password_hash::Error> for ApiError {
    fn from(err: argon2::password_hash::Error) -> Self {
        match err {
            argon2::password_hash::Error::Password => ApiError::Unauthorized {
                code: ErrorCode::AUTH_INVALID_CREDENTIALS,
                message: "Invalid password".to_string(),
                details: None,
            },
            _ => ApiError::InternalServerError {
                code: ErrorCode::SYSTEM_INTERNAL_ERROR,
                message: "Password hashing error".to_string(),
                source: Some(Box::new(err)),
            },
        }
    }
}

/// SerdeJSONエラーからの変換
impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::BadRequest {
            code: ErrorCode::REQUEST_INVALID_BODY,
            message: format!("JSON parsing error: {}", err),
            field: None,
        }
    }
}

/// UUID解析エラーからの変換
impl From<uuid::Error> for ApiError {
    fn from(_err: uuid::Error) -> Self {
        ApiError::BadRequest {
            code: ErrorCode::REQUEST_INVALID_PATH_PARAM,
            message: "Invalid UUID format".to_string(),
            field: Some("id".to_string()),
        }
    }
}

/// std::env::VarErrorからの変換（設定エラー）
impl From<std::env::VarError> for ApiError {
    fn from(err: std::env::VarError) -> Self {
        ApiError::ConfigurationError {
            code: ErrorCode::SYSTEM_CONFIGURATION_ERROR,
            message: format!("Environment variable error: {}", err),
            config_key: None,
        }
    }
}

/// Actix-webのエラーからの変換
impl From<actix_web::error::PayloadError> for ApiError {
    fn from(err: actix_web::error::PayloadError) -> Self {
        match err {
            actix_web::error::PayloadError::Overflow => ApiError::PayloadTooLarge {
                code: ErrorCode::REQUEST_PAYLOAD_TOO_LARGE,
                message: "Request payload too large".to_string(),
                max_size: None,
            },
            actix_web::error::PayloadError::EncodingCorrupted => ApiError::BadRequest {
                code: ErrorCode::REQUEST_INVALID_BODY,
                message: "Request payload encoding corrupted".to_string(),
                field: None,
            },
            actix_web::error::PayloadError::Incomplete(_) => ApiError::BadRequest {
                code: ErrorCode::REQUEST_INVALID_BODY,
                message: "Incomplete request payload".to_string(),
                field: None,
            },
            _ => ApiError::BadRequest {
                code: ErrorCode::REQUEST_INVALID_BODY,
                message: format!("Payload error: {}", err),
                field: None,
            },
        }
    }
}

/// HTTPリクエスト解析エラーからの変換
impl From<actix_web::error::UrlencodedError> for ApiError {
    fn from(err: actix_web::error::UrlencodedError) -> Self {
        match err {
            actix_web::error::UrlencodedError::Overflow { limit, .. } => ApiError::PayloadTooLarge {
                code: ErrorCode::REQUEST_PAYLOAD_TOO_LARGE,
                message: "Form data too large".to_string(),
                max_size: Some(limit),
            },
            actix_web::error::UrlencodedError::UnknownLength => ApiError::BadRequest {
                code: ErrorCode::REQUEST_INVALID_BODY,
                message: "Unknown content length".to_string(),
                field: None,
            },
            actix_web::error::UrlencodedError::ContentType => ApiError::BadRequest {
                code: ErrorCode::REQUEST_INVALID_CONTENT_TYPE,
                message: "Invalid content type for form data".to_string(),
                field: None,
            },
            _ => ApiError::BadRequest {
                code: ErrorCode::REQUEST_INVALID_BODY,
                message: format!("URL encoded form error: {}", err),
                field: None,
            },
        }
    }
}

/// Reqliteエラーからの変換（Redis/Cache関連）
#[cfg(feature = "redis")]
impl From<redis::RedisError> for ApiError {
    fn from(err: redis::RedisError) -> Self {
        match err.kind() {
            redis::ErrorKind::AuthenticationFailed => ApiError::ExternalServiceError {
                code: ErrorCode::EXTERNAL_AUTH_ERROR,
                message: "Redis authentication failed".to_string(),
                service: Some("Redis".to_string()),
                status_code: None,
            },
            redis::ErrorKind::IoError => ApiError::ExternalServiceError {
                code: ErrorCode::EXTERNAL_SERVICE_UNAVAILABLE,
                message: "Redis connection error".to_string(),
                service: Some("Redis".to_string()),
                status_code: None,
            },
            redis::ErrorKind::ResponseError => ApiError::ExternalServiceError {
                code: ErrorCode::EXTERNAL_API_ERROR,
                message: format!("Redis response error: {}", err),
                service: Some("Redis".to_string()),
                status_code: None,
            },
            _ => ApiError::ExternalServiceError {
                code: ErrorCode::EXTERNAL_SERVICE_UNAVAILABLE,
                message: format!("Redis error: {}", err),
                service: Some("Redis".to_string()),
                status_code: None,
            },
        }
    }
}

/// タイムアウトエラーからの変換
impl From<tokio::time::error::Elapsed> for ApiError {
    fn from(_err: tokio::time::error::Elapsed) -> Self {
        ApiError::TimeoutError {
            code: ErrorCode::SYSTEM_TIMEOUT,
            message: "Operation timed out".to_string(),
            timeout_duration: None,
        }
    }
}