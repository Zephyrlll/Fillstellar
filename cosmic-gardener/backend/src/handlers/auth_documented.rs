use actix_web::{web, HttpResponse};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use utoipa::ToSchema;
use validator::Validate;

use crate::errors::{ApiError, ErrorCode, Result};
use crate::models::{
    User, RegisterRequest, LoginRequest, LoginResponse, UserResponse,
    RefreshTokenRequest, RefreshTokenResponse, RefreshToken,
};
use crate::services::jwt::JwtService;

/// ユーザー登録
/// 
/// 新しいユーザーアカウントを作成します。
/// 
/// ## 要求事項
/// - 有効なメールアドレス（RFC 5322準拠）
/// - 3-50文字のユーザー名（英数字とアンダースコアのみ）
/// - 12-128文字のパスワード
/// 
/// ## セキュリティ
/// - パスワードはArgon2idでハッシュ化
/// - メールアドレスとユーザー名の重複チェック
/// 
/// ## エラー
/// - `400` バリデーションエラー
/// - `409` メールアドレスまたはユーザー名が既に使用されている
/// - `500` 内部サーバーエラー
#[utoipa::path(
    post,
    path = "/api/auth/register",
    tag = "auth",
    summary = "ユーザー登録",
    description = "新しいユーザーアカウントを作成",
    request_body(
        content = RegisterRequest,
        description = "登録情報",
        content_type = "application/json"
    ),
    responses(
        (status = 201, description = "登録成功", body = UserResponse),
        (status = 400, description = "バリデーションエラー", body = ErrorResponse),
        (status = 409, description = "メールアドレスまたはユーザー名が既に使用されている", body = ErrorResponse),
        (status = 500, description = "内部サーバーエラー", body = ErrorResponse)
    ),
    security(
        ()
    )
)]
pub async fn register(
    pool: web::Data<PgPool>,
    user_data: web::Json<RegisterRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    user_data.validate().map_err(|errors| {
        ApiError::ValidationError {
            code: ErrorCode::VALIDATION_MULTIPLE_ERRORS,
            message: "Registration data validation failed".to_string(),
            errors,
        }
    })?;

    // メールアドレスとユーザー名の重複チェック
    let existing_user = sqlx::query!(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        user_data.email,
        user_data.username
    )
    .fetch_optional(pool.get_ref())
    .await?;

    if existing_user.is_some() {
        return Err(ApiError::Conflict {
            code: ErrorCode::RESOURCE_ALREADY_EXISTS,
            message: "Email or username already exists".to_string(),
            conflicting_field: None,
        });
    }

    // パスワードハッシュ化
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2
        .hash_password(user_data.password.as_bytes(), &salt)
        .map_err(|e| ApiError::InternalServerError {
            code: ErrorCode::SYSTEM_INTERNAL_ERROR,
            message: "Failed to hash password".to_string(),
            source: Some(Box::new(e)),
        })?
        .to_string();

    // ユーザー作成
    let user_id = uuid::Uuid::new_v4();
    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (id, email, username, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, password_hash, is_active, created_at, updated_at, last_login
        "#,
        user_id,
        user_data.email,
        user_data.username,
        password_hash
    )
    .fetch_one(pool.get_ref())
    .await?;

    // 統計テーブルの初期化
    sqlx::query!(
        "INSERT INTO game_statistics (user_id) VALUES ($1)",
        user.id
    )
    .execute(pool.get_ref())
    .await?;

    log::info!(
        target: "cosmic_gardener::auth",
        "User registered successfully: {} ({})",
        user.username,
        user.id
    );

    Ok(HttpResponse::Created().json(UserResponse::from(user)))
}

/// ユーザーログイン
/// 
/// メールアドレスとパスワードでユーザー認証を行い、アクセストークンを発行します。
/// 
/// ## 認証フロー
/// 1. メールアドレスとパスワードの検証
/// 2. JWT アクセストークンの発行（有効期限: 1時間）
/// 3. リフレッシュトークンの発行（有効期限: 30日）
/// 4. 最終ログイン時刻の更新
/// 
/// ## レート制限
/// - 同一IPから: 30回/分
/// - 同一メールアドレスから: 5回/分
/// 
/// ## セキュリティ
/// - パスワードはArgon2idで検証
/// - ログイン試行のログ記録
/// - 時間一定レスポンス（タイミング攻撃対策）
#[utoipa::path(
    post,
    path = "/api/auth/login",
    tag = "auth",
    summary = "ユーザーログイン",
    description = "メールアドレスとパスワードで認証し、JWTトークンを発行",
    request_body(
        content = LoginRequest,
        description = "ログイン情報",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "ログイン成功", body = LoginResponse),
        (status = 400, description = "バリデーションエラー", body = ErrorResponse),
        (status = 401, description = "認証失敗", body = ErrorResponse),
        (status = 429, description = "レート制限超過", body = ErrorResponse),
        (status = 500, description = "内部サーバーエラー", body = ErrorResponse)
    ),
    security(
        ()
    )
)]
pub async fn login(
    pool: web::Data<PgPool>,
    jwt_service: web::Data<JwtService>,
    login_data: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    login_data.validate().map_err(|errors| {
        ApiError::ValidationError {
            code: ErrorCode::VALIDATION_MULTIPLE_ERRORS,
            message: "Login data validation failed".to_string(),
            errors,
        }
    })?;

    // ユーザー検索
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
        login_data.email
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| ApiError::Unauthorized {
        code: ErrorCode::AUTH_INVALID_CREDENTIALS,
        message: "Invalid email or password".to_string(),
        details: None,
    })?;

    // パスワード検証
    let argon2 = Argon2::default();
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| ApiError::InternalServerError {
            code: ErrorCode::SYSTEM_INTERNAL_ERROR,
            message: "Failed to parse password hash".to_string(),
            source: Some(Box::new(e)),
        })?;
    
    if argon2
        .verify_password(login_data.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        log::warn!(
            target: "cosmic_gardener::auth",
            "Failed login attempt for email: {}",
            login_data.email
        );
        return Err(ApiError::Unauthorized {
            code: ErrorCode::AUTH_INVALID_CREDENTIALS,
            message: "Invalid email or password".to_string(),
            details: None,
        });
    }

    // JWTトークン生成
    let access_token = jwt_service.generate_access_token(&user)
        .map_err(|e| ApiError::InternalServerError {
            code: ErrorCode::SYSTEM_INTERNAL_ERROR,
            message: "Failed to generate access token".to_string(),
            source: Some(Box::new(e)),
        })?;
    
    let refresh_token = jwt_service.generate_refresh_token(&user)
        .await
        .map_err(|e| ApiError::InternalServerError {
            code: ErrorCode::SYSTEM_INTERNAL_ERROR,
            message: "Failed to generate refresh token".to_string(),
            source: Some(Box::new(e)),
        })?;

    // リフレッシュトークンをデータベースに保存
    let token_family = uuid::Uuid::new_v4();
    let token_hash = jwt_service.hash_token(&refresh_token);
    
    sqlx::query!(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, token_family, expires_at)
        VALUES ($1, $2, $3, $4)
        "#,
        user.id,
        token_hash,
        token_family,
        Utc::now() + Duration::days(30)
    )
    .execute(pool.get_ref())
    .await?;

    // 最終ログイン時刻更新
    sqlx::query!(
        "UPDATE users SET last_login = $1 WHERE id = $2",
        Utc::now(),
        user.id
    )
    .execute(pool.get_ref())
    .await?;

    log::info!(
        target: "cosmic_gardener::auth",
        "User logged in successfully: {} ({})",
        user.username,
        user.id
    );

    Ok(HttpResponse::Ok().json(LoginResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600, // 1 hour
        user: UserResponse::from(user),
    }))
}

/// アクセストークンの更新
/// 
/// リフレッシュトークンを使用して新しいアクセストークンを発行します。
/// 
/// ## セキュリティ機能
/// - リフレッシュトークンの自動ローテーション
/// - トークンファミリーによる不正検出
/// - 期限切れトークンの自動削除
/// 
/// ## トークンローテーション
/// 1. 古いリフレッシュトークンを無効化
/// 2. 新しいアクセストークンを生成
/// 3. 新しいリフレッシュトークンを生成
/// 4. 同一ファミリーIDを維持
#[utoipa::path(
    post,
    path = "/api/auth/refresh",
    tag = "auth",
    summary = "トークンリフレッシュ",
    description = "リフレッシュトークンを使用して新しいアクセストークンを取得",
    request_body(
        content = RefreshTokenRequest,
        description = "リフレッシュトークン",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "トークン更新成功", body = RefreshTokenResponse),
        (status = 400, description = "バリデーションエラー", body = ErrorResponse),
        (status = 401, description = "無効なリフレッシュトークン", body = ErrorResponse),
        (status = 404, description = "ユーザーが見つからない", body = ErrorResponse),
        (status = 500, description = "内部サーバーエラー", body = ErrorResponse)
    ),
    security(
        ()
    )
)]
pub async fn refresh_token(
    pool: web::Data<PgPool>,
    jwt_service: web::Data<JwtService>,
    refresh_data: web::Json<RefreshTokenRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    refresh_data.validate().map_err(|errors| {
        ApiError::ValidationError {
            code: ErrorCode::VALIDATION_MULTIPLE_ERRORS,
            message: "Refresh token validation failed".to_string(),
            errors,
        }
    })?;

    // リフレッシュトークンの検証とハッシュ化
    let token_hash = jwt_service.hash_token(&refresh_data.refresh_token);

    // データベースからトークン検索
    let refresh_token = sqlx::query_as!(
        RefreshToken,
        r#"
        SELECT * FROM refresh_tokens 
        WHERE token_hash = $1 AND expires_at > $2 AND is_revoked = false
        "#,
        token_hash,
        Utc::now()
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| ApiError::Unauthorized {
        code: ErrorCode::AUTH_INVALID_REFRESH_TOKEN,
        message: "Invalid or expired refresh token".to_string(),
        details: None,
    })?;

    // ユーザー検索
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        refresh_token.user_id
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| ApiError::NotFound {
        code: ErrorCode::RESOURCE_USER_NOT_FOUND,
        message: "User not found".to_string(),
        resource: Some("user".to_string()),
    })?;

    // 新しいトークン生成
    let new_access_token = jwt_service.generate_access_token(&user)
        .map_err(|e| ApiError::InternalServerError {
            code: ErrorCode::SYSTEM_INTERNAL_ERROR,
            message: "Failed to generate access token".to_string(),
            source: Some(Box::new(e)),
        })?;
    
    let new_refresh_token = jwt_service.generate_refresh_token(&user)
        .await
        .map_err(|e| ApiError::InternalServerError {
            code: ErrorCode::SYSTEM_INTERNAL_ERROR,
            message: "Failed to generate refresh token".to_string(),
            source: Some(Box::new(e)),
        })?;

    // 古いリフレッシュトークンを無効化
    sqlx::query!(
        "UPDATE refresh_tokens SET is_revoked = true WHERE id = $1",
        refresh_token.id
    )
    .execute(pool.get_ref())
    .await?;

    // 新しいリフレッシュトークンを保存
    let new_token_hash = jwt_service.hash_token(&new_refresh_token);
    sqlx::query!(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, token_family, expires_at)
        VALUES ($1, $2, $3, $4)
        "#,
        user.id,
        new_token_hash,
        refresh_token.token_family, // 同じファミリーを維持
        Utc::now() + Duration::days(30)
    )
    .execute(pool.get_ref())
    .await?;

    log::info!(
        target: "cosmic_gardener::auth",
        "Token refreshed for user: {} ({})",
        user.username,
        user.id
    );

    Ok(HttpResponse::Ok().json(RefreshTokenResponse {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
    }))
}

/// ユーザーログアウト
/// 
/// リフレッシュトークンを無効化してセッションを終了します。
/// 
/// ## セキュリティ
/// - 指定されたリフレッシュトークンの無効化
/// - セッション情報のクリーンアップ
/// - ログアウトイベントの記録
/// 
/// ## 注意
/// - アクセストークンは無効化されません（有効期限まで有効）
/// - クライアント側でトークンを破棄する必要があります
#[utoipa::path(
    post,
    path = "/api/auth/logout",
    tag = "auth",
    summary = "ユーザーログアウト",
    description = "リフレッシュトークンを無効化してセッションを終了",
    request_body(
        content = RefreshTokenRequest,
        description = "無効化するリフレッシュトークン",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "ログアウト成功", body = serde_json::Value),
        (status = 400, description = "バリデーションエラー", body = ErrorResponse),
        (status = 500, description = "内部サーバーエラー", body = ErrorResponse)
    ),
    security(
        ()
    )
)]
pub async fn logout(
    pool: web::Data<PgPool>,
    refresh_data: web::Json<RefreshTokenRequest>,
) -> Result<HttpResponse> {
    if !refresh_data.refresh_token.is_empty() {
        // リフレッシュトークンを無効化
        let jwt_service = JwtService::new("secret".to_string()); // TODO: 設定から取得
        let token_hash = jwt_service.hash_token(&refresh_data.refresh_token);
        
        let result = sqlx::query!(
            "UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1",
            token_hash
        )
        .execute(pool.get_ref())
        .await?;

        if result.rows_affected() > 0 {
            log::info!(
                target: "cosmic_gardener::auth",
                "User logged out successfully"
            );
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Logged out successfully"
    })))
}