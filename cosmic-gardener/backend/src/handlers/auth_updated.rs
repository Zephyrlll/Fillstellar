use actix_web::{web, HttpResponse};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use validator::Validate;

use crate::errors::{ApiError, ErrorCode, Result};
use crate::models::{
    User, RegisterRequest, LoginRequest, LoginResponse, UserResponse,
    RefreshTokenRequest, RefreshTokenResponse, RefreshToken,
};
use crate::services::jwt::JwtService;
use crate::{auth_error, conflict_error, not_found_error, internal_error};

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
        return Err(conflict_error!(
            ErrorCode::RESOURCE_ALREADY_EXISTS,
            "Email or username already exists"
        ));
    }

    // パスワードハッシュ化
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2
        .hash_password(user_data.password.as_bytes(), &salt)
        .map_err(|e| internal_error!(
            ErrorCode::SYSTEM_INTERNAL_ERROR,
            "Failed to hash password",
            e
        ))?
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
    .ok_or_else(|| auth_error!(
        ErrorCode::AUTH_INVALID_CREDENTIALS,
        "Invalid email or password"
    ))?;

    // パスワード検証
    let argon2 = Argon2::default();
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| internal_error!(
            ErrorCode::SYSTEM_INTERNAL_ERROR,
            "Failed to parse password hash",
            e
        ))?;
    
    if argon2
        .verify_password(login_data.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        log::warn!(
            target: "cosmic_gardener::auth",
            "Failed login attempt for email: {}",
            login_data.email
        );
        return Err(auth_error!(
            ErrorCode::AUTH_INVALID_CREDENTIALS,
            "Invalid email or password"
        ));
    }

    // JWTトークン生成
    let access_token = jwt_service.generate_access_token(&user)
        .map_err(|e| internal_error!(
            ErrorCode::SYSTEM_INTERNAL_ERROR,
            "Failed to generate access token",
            e
        ))?;
    
    let refresh_token = jwt_service.generate_refresh_token(&user)
        .await
        .map_err(|e| internal_error!(
            ErrorCode::SYSTEM_INTERNAL_ERROR,
            "Failed to generate refresh token",
            e
        ))?;

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
    .ok_or_else(|| auth_error!(
        ErrorCode::AUTH_INVALID_REFRESH_TOKEN,
        "Invalid or expired refresh token"
    ))?;

    // ユーザー検索
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        refresh_token.user_id
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| not_found_error!(
        ErrorCode::RESOURCE_USER_NOT_FOUND,
        "User not found"
    ))?;

    // 新しいトークン生成
    let new_access_token = jwt_service.generate_access_token(&user)
        .map_err(|e| internal_error!(
            ErrorCode::SYSTEM_INTERNAL_ERROR,
            "Failed to generate access token",
            e
        ))?;
    
    let new_refresh_token = jwt_service.generate_refresh_token(&user)
        .await
        .map_err(|e| internal_error!(
            ErrorCode::SYSTEM_INTERNAL_ERROR,
            "Failed to generate refresh token",
            e
        ))?;

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