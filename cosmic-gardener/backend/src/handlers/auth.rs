use actix_web::{web, HttpResponse};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use sqlx::PgPool;
use tracing::{error, warn};
use uuid::Uuid;
use validator::Validate;

use crate::errors::{GameError, Result};
use crate::models::{
    User, RegisterRequest, LoginRequest, LoginResponse, UserResponse,
    RefreshTokenRequest, RefreshTokenResponse, RefreshToken, JwtClaims,
    UserClaims, SessionClaims,
};
use crate::services::jwt::JwtService;

pub async fn register(
    pool: web::Data<PgPool>,
    user_data: web::Json<RegisterRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    user_data.validate()?;

    // メールアドレスとユーザー名の重複チェック
    let existing_user = sqlx::query!(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        user_data.email,
        user_data.username
    )
    .fetch_optional(pool.get_ref())
    .await?;

    if existing_user.is_some() {
        error!("[AUTH] Email or username already exists for: {} / {}", user_data.email, user_data.username);
        return Err(GameError::conflict("Email or username already exists"));
    }

    // パスワードハッシュ化
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2
        .hash_password(user_data.password.as_bytes(), &salt)?
        .to_string();

    // ユーザー作成
    let user_id = Uuid::new_v4();
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

    Ok(HttpResponse::Created().json(UserResponse::from(user)))
}

pub async fn login(
    pool: web::Data<PgPool>,
    jwt_service: web::Data<JwtService>,
    login_data: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    login_data.validate()?;

    // ユーザー検索
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
        login_data.email
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| {
        warn!("[AUTH] User not found for email: {}", login_data.email);
        GameError::authentication("Invalid credentials")
    })?;

    // パスワード検証
    let argon2 = Argon2::default();
    let parsed_hash = PasswordHash::new(&user.password_hash)?;
    
    if argon2
        .verify_password(login_data.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        warn!("[AUTH] Invalid password for email: {}", login_data.email);
        return Err(GameError::authentication("Invalid credentials"));
    }

    // JWTトークン生成
    let access_token = jwt_service.generate_access_token(&user)?;
    let refresh_token = jwt_service.generate_refresh_token(&user).await?;

    // リフレッシュトークンをデータベースに保存
    let token_family = Uuid::new_v4();
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
    refresh_data.validate()?;

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
    .ok_or_else(|| {
        warn!("[AUTH] Invalid refresh token");
        GameError::authentication("Invalid refresh token")
    })?;

    // ユーザー検索
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        refresh_token.user_id
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| {
        error!("[AUTH] User not found for refresh token: {}", refresh_token.user_id);
        GameError::authentication("User not found")
    })?;

    // 新しいトークン生成
    let new_access_token = jwt_service.generate_access_token(&user)?;
    let new_refresh_token = jwt_service.generate_refresh_token(&user).await?;

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
        
        sqlx::query!(
            "UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1",
            token_hash
        )
        .execute(pool.get_ref())
        .await?;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Logged out successfully"
    })))
}