use actix_web::{web, HttpResponse};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use sqlx::PgPool;
use validator::Validate;

use crate::error::{AppError, Result};
use crate::models::{
    User, UserResponse, UpdateUserRequest, AuthenticatedUser,
};

pub async fn get_me(
    pool: web::Data<PgPool>,
    user: web::ReqData<AuthenticatedUser>,
) -> Result<HttpResponse> {
    let user_data = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        user.id
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(HttpResponse::Ok().json(UserResponse::from(user_data)))
}

pub async fn update_me(
    pool: web::Data<PgPool>,
    user: web::ReqData<AuthenticatedUser>,
    update_data: web::Json<UpdateUserRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    update_data.validate()?;

    // 現在のユーザー情報を取得
    let current_user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        user.id
    )
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // パスワード変更の場合、現在のパスワードを検証
    if update_data.new_password.is_some() {
        let current_password = update_data
            .current_password
            .as_ref()
            .ok_or_else(|| AppError::BadRequest("Current password is required".to_string()))?;

        let argon2 = Argon2::default();
        let parsed_hash = PasswordHash::new(&current_user.password_hash)?;
        
        if argon2
            .verify_password(current_password.as_bytes(), &parsed_hash)
            .is_err()
        {
            return Err(AppError::AuthenticationError("Invalid current password".to_string()));
        }
    }

    // ユーザー名の重複チェック
    if let Some(ref new_username) = update_data.username {
        if new_username != &current_user.username {
            let existing_user = sqlx::query!(
                "SELECT id FROM users WHERE username = $1 AND id != $2",
                new_username,
                user.id
            )
            .fetch_optional(pool.get_ref())
            .await?;

            if existing_user.is_some() {
                return Err(AppError::Conflict("Username already exists".to_string()));
            }
        }
    }

    // 更新する値を準備
    let new_username = update_data
        .username
        .as_ref()
        .unwrap_or(&current_user.username);

    let new_password_hash = if let Some(ref new_password) = update_data.new_password {
        let argon2 = Argon2::default();
        let salt = SaltString::generate(&mut OsRng);
        Some(argon2
            .hash_password(new_password.as_bytes(), &salt)?
            .to_string())
    } else {
        None
    };

    // データベース更新
    let updated_user = if let Some(password_hash) = new_password_hash {
        sqlx::query_as!(
            User,
            r#"
            UPDATE users 
            SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, email, username, password_hash, is_active, created_at, updated_at, last_login
            "#,
            new_username,
            password_hash,
            user.id
        )
        .fetch_one(pool.get_ref())
        .await?
    } else {
        sqlx::query_as!(
            User,
            r#"
            UPDATE users 
            SET username = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, email, username, password_hash, is_active, created_at, updated_at, last_login
            "#,
            new_username,
            user.id
        )
        .fetch_one(pool.get_ref())
        .await?
    };

    Ok(HttpResponse::Ok().json(UserResponse::from(updated_user)))
}

pub async fn delete_me(
    pool: web::Data<PgPool>,
    user: web::ReqData<AuthenticatedUser>,
) -> Result<HttpResponse> {
    // ユーザーを非アクティブ化（完全削除ではなく）
    sqlx::query!(
        "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        user.id
    )
    .execute(pool.get_ref())
    .await?;

    // 関連するリフレッシュトークンを無効化
    sqlx::query!(
        "UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1",
        user.id
    )
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Account deactivated successfully"
    })))
}