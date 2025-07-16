use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::errors::{GameError, Result};
use crate::models::{User, JwtClaims, UserClaims, SessionClaims};

#[derive(Clone)]
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    issuer: String,
    audience: Vec<String>,
}

impl JwtService {
    pub fn new(secret: String) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            issuer: "cosmic-gardener-api".to_string(),
            audience: vec!["cosmic-gardener-web".to_string(), "cosmic-gardener-mobile".to_string()],
        }
    }

    pub fn generate_access_token(&self, user: &User) -> Result<String> {
        let now = Utc::now();
        let exp = now + Duration::hours(1);

        let claims = JwtClaims {
            sub: user.id.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            nbf: now.timestamp(),
            jti: Uuid::new_v4().to_string(),
            iss: self.issuer.clone(),
            aud: self.audience.clone(),
            user: UserClaims {
                id: user.id.to_string(),
                email: user.email.clone(),
                username: user.username.clone(),
                roles: vec!["player".to_string()],
                permissions: vec![
                    "game:play".to_string(),
                    "stats:view".to_string(),
                    "save:write".to_string(),
                ],
            },
            session: SessionClaims {
                id: Uuid::new_v4().to_string(),
                ip: "hashed_ip".to_string(), // TODO: 実際のIPハッシュ
                device_id: "device_fingerprint".to_string(), // TODO: デバイスフィンガープリント
            },
        };

        let header = Header::default();
        encode(&header, &claims, &self.encoding_key)
            .map_err(AppError::TokenError)
    }

    pub async fn generate_refresh_token(&self, user: &User) -> Result<String> {
        // リフレッシュトークンは単純なUUIDベースの文字列
        // セキュリティ上、JWTではなく不透明なトークンを使用
        Ok(format!("{}_{}", user.id, Uuid::new_v4()))
    }

    pub fn validate_access_token(&self, token: &str) -> Result<JwtClaims> {
        let mut validation = Validation::default();
        validation.set_issuer(&[&self.issuer]);
        validation.set_audience(&self.audience);

        let token_data = decode::<JwtClaims>(token, &self.decoding_key, &validation)
            .map_err(AppError::TokenError)?;

        Ok(token_data.claims)
    }

    pub fn hash_token(&self, token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_user() -> User {
        User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password_hash: "hash".to_string(),
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_login: None,
        }
    }

    #[test]
    fn test_jwt_generation_and_validation() {
        let jwt_service = JwtService::new("test_secret".to_string());
        let user = create_test_user();

        let token = jwt_service.generate_access_token(&user).unwrap();
        let claims = jwt_service.validate_access_token(&token).unwrap();

        assert_eq!(claims.user.id, user.id.to_string());
        assert_eq!(claims.user.email, user.email);
        assert_eq!(claims.user.username, user.username);
    }

    #[test]
    fn test_token_hashing() {
        let jwt_service = JwtService::new("test_secret".to_string());
        let token = "test_token";
        
        let hash1 = jwt_service.hash_token(token);
        let hash2 = jwt_service.hash_token(token);
        
        assert_eq!(hash1, hash2); // 同じトークンは同じハッシュ
        assert_ne!(hash1, token); // ハッシュは元のトークンと異なる
    }
}