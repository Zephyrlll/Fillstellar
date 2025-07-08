use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub token_family: Uuid,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub is_revoked: bool,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct RefreshTokenRequest {
    #[validate(length(min = 1, message = "Refresh token is required"))]
    pub refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshTokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,      // user_id
    pub iat: i64,         // issued at
    pub exp: i64,         // expires at
    pub nbf: i64,         // not before
    pub jti: String,      // JWT ID
    pub iss: String,      // issuer
    pub aud: Vec<String>, // audience
    pub user: UserClaims,
    pub session: SessionClaims,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserClaims {
    pub id: String,
    pub email: String,
    pub username: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionClaims {
    pub id: String,
    pub ip: String,
    pub device_id: String,
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub session_id: Uuid,
}

impl From<JwtClaims> for AuthenticatedUser {
    fn from(claims: JwtClaims) -> Self {
        Self {
            id: Uuid::parse_str(&claims.user.id).unwrap_or_default(),
            email: claims.user.email,
            username: claims.user.username,
            roles: claims.user.roles,
            permissions: claims.user.permissions,
            session_id: Uuid::parse_str(&claims.session.id).unwrap_or_default(),
        }
    }
}