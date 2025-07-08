use utoipa::OpenApi;

use crate::{
    handlers::{auth, user, game},
    models::{
        User, UserResponse, RegisterRequest, LoginRequest, LoginResponse,
        UpdateUserRequest, RefreshTokenRequest, RefreshTokenResponse,
        GameSave, GameStateResponse, SaveGameRequest, StatisticsResponse,
        GameStatistics, Achievement,
    },
    errors::{ErrorResponse, ErrorCode},
};

/// OpenAPI 仕様の定義
#[derive(OpenApi)]
#[openapi(
    paths(
        // 認証エンドポイント
        auth::register,
        auth::login,
        auth::refresh_token,
        auth::logout,
        
        // ユーザー管理エンドポイント
        user::get_me,
        user::update_me,
        user::delete_me,
        
        // ゲーム状態エンドポイント
        game::get_game_state,
        game::save_game_state,
        game::get_statistics,
        game::get_leaderboard,
    ),
    components(
        schemas(
            // ユーザー関連
            User,
            UserResponse,
            RegisterRequest,
            LoginRequest,
            LoginResponse,
            UpdateUserRequest,
            RefreshTokenRequest,
            RefreshTokenResponse,
            
            // ゲーム関連
            GameSave,
            GameStateResponse,
            SaveGameRequest,
            StatisticsResponse,
            GameStatistics,
            Achievement,
            
            // エラー関連
            ErrorResponse,
            ErrorCode,
        )
    ),
    tags(
        (name = "auth", description = "認証・認可 API"),
        (name = "user", description = "ユーザー管理 API"),
        (name = "game", description = "ゲーム状態管理 API"),
    ),
    info(
        title = "Cosmic Gardener API",
        description = "3D宇宙シミュレーションゲーム Cosmic Gardener のバックエンド API",
        version = "1.0.0",
        contact(
            name = "Cosmic Gardener Team",
            email = "support@cosmic-gardener.com",
            url = "https://cosmic-gardener.com"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        ),
    ),
    servers(
        (url = "http://localhost:8080", description = "開発環境"),
        (url = "https://api.cosmic-gardener.com", description = "本番環境"),
    ),
    external_docs(
        url = "https://docs.cosmic-gardener.com",
        description = "詳細なドキュメント"
    ),
)]
pub struct ApiDoc;

/// セキュリティスキーマの定義
pub fn security_addon() -> utoipa::openapi::security::SecurityScheme {
    use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
    
    SecurityScheme::Http(
        HttpBuilder::new()
            .scheme(HttpAuthScheme::Bearer)
            .bearer_format("JWT")
            .description(Some("JWT Bearer トークンによる認証"))
            .build(),
    )
}