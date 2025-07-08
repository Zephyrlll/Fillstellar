use actix_web::{test, web, App, http::StatusCode};
use serde_json::json;
use uuid::Uuid;

use cosmic_gardener_backend::{
    errors::{ApiError, ErrorCode, ErrorResponse},
    routes::configure_routes,
    models::RegisterRequest,
};

#[actix_web::test]
async fn test_validation_error_response() {
    let app = test::init_service(
        App::new().configure(configure_routes)
    ).await;

    // 無効なデータでユーザー登録を試行
    let invalid_data = json!({
        "email": "invalid-email",  // 無効なメール形式
        "username": "ab",          // 短すぎるユーザー名
        "password": "short"        // 短すぎるパスワード
    });

    let req = test::TestRequest::post()
        .uri("/api/auth/register")
        .set_json(&invalid_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    
    let body: ErrorResponse = test::read_body_json(resp).await;
    assert_eq!(body.error, "ValidationError");
    assert_eq!(body.error_code, "VALIDATION_MULTIPLE_ERRORS");
    assert!(body.details.is_some());
    assert!(body.request_id.len() > 0);
}

#[actix_web::test]
async fn test_not_found_error_response() {
    let app = test::init_service(
        App::new().configure(configure_routes)
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/nonexistent")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

#[actix_web::test]
async fn test_unauthorized_error_response() {
    let app = test::init_service(
        App::new().configure(configure_routes)
    ).await;

    // 認証なしで保護されたエンドポイントにアクセス
    let req = test::TestRequest::get()
        .uri("/api/users/me")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    
    let body: ErrorResponse = test::read_body_json(resp).await;
    assert_eq!(body.error, "Unauthorized");
    assert!(body.error_code.starts_with("AUTH_"));
}

#[actix_web::test]
async fn test_error_code_categories() {
    use cosmic_gardener_backend::errors::{ErrorCode, ErrorCategory};

    assert_eq!(ErrorCode::AUTH_INVALID_CREDENTIALS.category(), ErrorCategory::Authentication);
    assert_eq!(ErrorCode::VALIDATION_INVALID_EMAIL.category(), ErrorCategory::Validation);
    assert_eq!(ErrorCode::RESOURCE_NOT_FOUND.category(), ErrorCategory::Resource);
    assert_eq!(ErrorCode::DB_CONNECTION_ERROR.category(), ErrorCategory::Database);
    assert_eq!(ErrorCode::SYSTEM_INTERNAL_ERROR.category(), ErrorCategory::System);
}

#[actix_web::test]
async fn test_error_user_messages() {
    use cosmic_gardener_backend::errors::ErrorCode;

    assert_eq!(
        ErrorCode::AUTH_INVALID_CREDENTIALS.user_message(),
        "メールアドレスまたはパスワードが正しくありません"
    );
    assert_eq!(
        ErrorCode::VALIDATION_INVALID_EMAIL.user_message(),
        "メールアドレスの形式が正しくありません"
    );
    assert_eq!(
        ErrorCode::RESOURCE_NOT_FOUND.user_message(),
        "指定されたリソースが見つかりません"
    );
}

#[test]
fn test_error_severity() {
    use cosmic_gardener_backend::errors::{ApiError, ErrorCode, ErrorSeverity};

    let critical_error = ApiError::InternalServerError {
        code: ErrorCode::SYSTEM_INTERNAL_ERROR,
        message: "Critical failure".to_string(),
        source: None,
    };
    assert_eq!(critical_error.severity(), ErrorSeverity::Critical);

    let info_error = ApiError::BadRequest {
        code: ErrorCode::REQUEST_INVALID,
        message: "Bad request".to_string(),
        field: None,
    };
    assert_eq!(info_error.severity(), ErrorSeverity::Info);
}

#[test]
fn test_error_retryable() {
    use cosmic_gardener_backend::errors::{ApiError, ErrorCode};

    let retryable_error = ApiError::ServiceUnavailable {
        code: ErrorCode::SYSTEM_SERVICE_UNAVAILABLE,
        message: "Service unavailable".to_string(),
        retry_after: Some(60),
    };
    assert!(retryable_error.is_retryable());

    let non_retryable_error = ApiError::BadRequest {
        code: ErrorCode::REQUEST_INVALID,
        message: "Bad request".to_string(),
        field: None,
    };
    assert!(!non_retryable_error.is_retryable());
}

#[test]
fn test_error_macros() {
    use cosmic_gardener_backend::{
        auth_error, 
        not_found_error, 
        conflict_error, 
        bad_request_error,
        errors::ErrorCode
    };

    let auth_err = auth_error!(ErrorCode::AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    match auth_err {
        ApiError::Unauthorized { code, message, .. } => {
            assert_eq!(code, ErrorCode::AUTH_INVALID_CREDENTIALS);
            assert_eq!(message, "Invalid credentials");
        }
        _ => panic!("Expected Unauthorized error"),
    }

    let not_found_err = not_found_error!(ErrorCode::RESOURCE_NOT_FOUND, "Resource not found");
    match not_found_err {
        ApiError::NotFound { code, message, .. } => {
            assert_eq!(code, ErrorCode::RESOURCE_NOT_FOUND);
            assert_eq!(message, "Resource not found");
        }
        _ => panic!("Expected NotFound error"),
    }
}

#[test]
fn test_sqlx_error_conversion() {
    use cosmic_gardener_backend::errors::{ApiError, ErrorCode};
    use sqlx::Error as SqlxError;

    // データベース接続エラーのテスト
    let sqlx_error = SqlxError::PoolTimedOut;
    let api_error: ApiError = sqlx_error.into();
    
    match api_error {
        ApiError::DatabaseConnectionError { code, .. } => {
            assert_eq!(code, ErrorCode::DB_TIMEOUT);
        }
        _ => panic!("Expected DatabaseConnectionError"),
    }
}

#[test]
fn test_jwt_error_conversion() {
    use cosmic_gardener_backend::errors::{ApiError, ErrorCode};
    use jsonwebtoken::errors::{Error as JwtError, ErrorKind};

    let jwt_error = JwtError::from(ErrorKind::ExpiredSignature);
    let api_error: ApiError = jwt_error.into();
    
    match api_error {
        ApiError::TokenExpired { code, .. } => {
            assert_eq!(code, ErrorCode::AUTH_TOKEN_EXPIRED);
        }
        _ => panic!("Expected TokenExpired error"),
    }
}

#[test]
fn test_validation_error_conversion() {
    use cosmic_gardener_backend::errors::{ApiError, ErrorCode};
    use validator::{Validate, ValidationErrors};

    #[derive(Validate)]
    struct TestData {
        #[validate(email)]
        email: String,
        #[validate(length(min = 3))]
        username: String,
    }

    let test_data = TestData {
        email: "invalid-email".to_string(),
        username: "ab".to_string(),
    };

    let validation_errors = test_data.validate().unwrap_err();
    let api_error: ApiError = validation_errors.into();
    
    match api_error {
        ApiError::ValidationError { code, .. } => {
            assert_eq!(code, ErrorCode::VALIDATION_MULTIPLE_ERRORS);
        }
        _ => panic!("Expected ValidationError"),
    }
}

#[test]
fn test_error_response_serialization() {
    use cosmic_gardener_backend::errors::{ErrorResponse, ErrorCode};
    use chrono::Utc;

    let error_response = ErrorResponse {
        error: "BadRequest".to_string(),
        error_code: ErrorCode::REQUEST_INVALID.to_string(),
        message: "Invalid request data".to_string(),
        request_id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        details: Some(json!({"field": "email"})),
        trace_id: Some("trace-123".to_string()),
    };

    let serialized = serde_json::to_string(&error_response).unwrap();
    let deserialized: ErrorResponse = serde_json::from_str(&serialized).unwrap();
    
    assert_eq!(error_response.error, deserialized.error);
    assert_eq!(error_response.error_code, deserialized.error_code);
    assert_eq!(error_response.message, deserialized.message);
    assert_eq!(error_response.request_id, deserialized.request_id);
}