/// エラー作成用のマクロ定義

/// 認証エラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! auth_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::Unauthorized {
            code: $code,
            message: $msg.to_string(),
            details: None,
        }
    };
    ($code:expr, $msg:expr, $details:expr) => {
        $crate::errors::ApiError::Unauthorized {
            code: $code,
            message: $msg.to_string(),
            details: Some(serde_json::to_value($details).unwrap_or_default()),
        }
    };
}

/// 権限エラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! forbidden_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::Forbidden {
            code: $code,
            message: $msg.to_string(),
            required_permission: None,
        }
    };
    ($code:expr, $msg:expr, $permission:expr) => {
        $crate::errors::ApiError::Forbidden {
            code: $code,
            message: $msg.to_string(),
            required_permission: Some($permission.to_string()),
        }
    };
}

/// バリデーションエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! validation_error {
    ($code:expr, $msg:expr, $errors:expr) => {
        $crate::errors::ApiError::ValidationError {
            code: $code,
            message: $msg.to_string(),
            errors: $errors,
        }
    };
}

/// リソースが見つからないエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! not_found_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::NotFound {
            code: $code,
            message: $msg.to_string(),
            resource: None,
        }
    };
    ($code:expr, $msg:expr, $resource:expr) => {
        $crate::errors::ApiError::NotFound {
            code: $code,
            message: $msg.to_string(),
            resource: Some($resource.to_string()),
        }
    };
}

/// 競合エラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! conflict_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::Conflict {
            code: $code,
            message: $msg.to_string(),
            conflicting_field: None,
        }
    };
    ($code:expr, $msg:expr, $field:expr) => {
        $crate::errors::ApiError::Conflict {
            code: $code,
            message: $msg.to_string(),
            conflicting_field: Some($field.to_string()),
        }
    };
}

/// 不正なリクエストエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! bad_request_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::BadRequest {
            code: $code,
            message: $msg.to_string(),
            field: None,
        }
    };
    ($code:expr, $msg:expr, $field:expr) => {
        $crate::errors::ApiError::BadRequest {
            code: $code,
            message: $msg.to_string(),
            field: Some($field.to_string()),
        }
    };
}

/// レート制限エラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! rate_limit_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::RateLimitExceeded {
            code: $code,
            message: $msg.to_string(),
            retry_after: None,
            limit_type: None,
        }
    };
    ($code:expr, $msg:expr, $retry_after:expr) => {
        $crate::errors::ApiError::RateLimitExceeded {
            code: $code,
            message: $msg.to_string(),
            retry_after: Some($retry_after),
            limit_type: None,
        }
    };
    ($code:expr, $msg:expr, $retry_after:expr, $limit_type:expr) => {
        $crate::errors::ApiError::RateLimitExceeded {
            code: $code,
            message: $msg.to_string(),
            retry_after: Some($retry_after),
            limit_type: Some($limit_type.to_string()),
        }
    };
}

/// データベースエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! db_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::DatabaseConnectionError {
            code: $code,
            message: $msg.to_string(),
        }
    };
}

/// ゲームエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! game_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::GameError {
            code: $code,
            message: $msg.to_string(),
            game_state: None,
        }
    };
    ($code:expr, $msg:expr, $state:expr) => {
        $crate::errors::ApiError::GameError {
            code: $code,
            message: $msg.to_string(),
            game_state: Some($state.to_string()),
        }
    };
}

/// 内部サーバーエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! internal_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::InternalServerError {
            code: $code,
            message: $msg.to_string(),
            source: None,
        }
    };
    ($code:expr, $msg:expr, $source:expr) => {
        $crate::errors::ApiError::InternalServerError {
            code: $code,
            message: $msg.to_string(),
            source: Some(Box::new($source)),
        }
    };
}

/// 外部サービスエラーを簡潔に作成するマクロ
#[macro_export]
macro_rules! external_error {
    ($code:expr, $msg:expr) => {
        $crate::errors::ApiError::ExternalServiceError {
            code: $code,
            message: $msg.to_string(),
            service: None,
            status_code: None,
        }
    };
    ($code:expr, $msg:expr, $service:expr) => {
        $crate::errors::ApiError::ExternalServiceError {
            code: $code,
            message: $msg.to_string(),
            service: Some($service.to_string()),
            status_code: None,
        }
    };
    ($code:expr, $msg:expr, $service:expr, $status:expr) => {
        $crate::errors::ApiError::ExternalServiceError {
            code: $code,
            message: $msg.to_string(),
            service: Some($service.to_string()),
            status_code: Some($status),
        }
    };
}