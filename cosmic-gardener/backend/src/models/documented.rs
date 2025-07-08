use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

/// ユーザー情報
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
#[schema(
    description = "ユーザーの基本情報",
    example = json!({
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "username": "cosmic_player",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-01T12:00:00Z"
    })
)]
pub struct User {
    /// ユーザーID（UUID）
    #[schema(description = "ユーザーの一意識別子", format = "uuid")]
    pub id: Uuid,
    
    /// メールアドレス
    #[schema(description = "ユーザーのメールアドレス", format = "email")]
    pub email: String,
    
    /// ユーザー名
    #[schema(description = "表示用のユーザー名", min_length = 3, max_length = 50)]
    pub username: String,
    
    /// パスワードハッシュ（レスポンスには含まれない）
    #[serde(skip_serializing)]
    #[schema(skip)]
    pub password_hash: String,
    
    /// アカウントの有効性
    #[schema(description = "アカウントが有効かどうか")]
    pub is_active: bool,
    
    /// 作成日時
    #[schema(description = "アカウント作成日時", format = "date-time")]
    pub created_at: DateTime<Utc>,
    
    /// 更新日時
    #[schema(description = "最終更新日時", format = "date-time")]
    pub updated_at: DateTime<Utc>,
    
    /// 最終ログイン日時
    #[schema(description = "最終ログイン日時", format = "date-time", nullable = true)]
    pub last_login: Option<DateTime<Utc>>,
}

/// ユーザー登録リクエスト
#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
#[schema(
    description = "新規ユーザー登録のリクエストデータ",
    example = json!({
        "email": "user@example.com",
        "username": "cosmic_player",
        "password": "secure_password_123"
    })
)]
pub struct RegisterRequest {
    /// メールアドレス（RFC 5322準拠）
    #[validate(email(message = "有効なメールアドレスを入力してください"))]
    #[schema(description = "ユーザーのメールアドレス", format = "email")]
    pub email: String,
    
    /// ユーザー名（3-50文字、英数字とアンダースコアのみ）
    #[validate(length(
        min = 3,
        max = 50,
        message = "ユーザー名は3文字以上50文字以下である必要があります"
    ))]
    #[validate(regex(
        path = "USERNAME_REGEX",
        message = "ユーザー名は英数字とアンダースコアのみ使用できます"
    ))]
    #[schema(description = "表示用のユーザー名", min_length = 3, max_length = 50, pattern = "^[a-zA-Z0-9_]+$")]
    pub username: String,
    
    /// パスワード（12-128文字）
    #[validate(length(
        min = 12,
        max = 128,
        message = "パスワードは12文字以上128文字以下である必要があります"
    ))]
    #[schema(description = "パスワード", min_length = 12, max_length = 128, format = "password")]
    pub password: String,
}

/// ログインリクエスト
#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
#[schema(
    description = "ユーザーログインのリクエストデータ",
    example = json!({
        "email": "user@example.com",
        "password": "secure_password_123"
    })
)]
pub struct LoginRequest {
    /// メールアドレス
    #[validate(email(message = "有効なメールアドレスを入力してください"))]
    #[schema(description = "登録済みのメールアドレス", format = "email")]
    pub email: String,
    
    /// パスワード
    #[validate(length(min = 1, message = "パスワードを入力してください"))]
    #[schema(description = "パスワード", format = "password")]
    pub password: String,
}

/// ログインレスポンス
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(
    description = "ログイン成功時のレスポンスデータ",
    example = json!({
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "token_type": "Bearer",
        "expires_in": 3600,
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "user@example.com",
            "username": "cosmic_player",
            "created_at": "2024-01-01T00:00:00Z",
            "last_login": "2024-01-01T12:00:00Z"
        }
    })
)]
pub struct LoginResponse {
    /// JWTアクセストークン
    #[schema(description = "JWT形式のアクセストークン")]
    pub access_token: String,
    
    /// トークンタイプ（常に \"Bearer\"）
    #[schema(description = "トークンタイプ", example = "Bearer")]
    pub token_type: String,
    
    /// トークンの有効期限（秒）
    #[schema(description = "アクセストークンの有効期限（秒）", example = 3600)]
    pub expires_in: i64,
    
    /// ユーザー情報
    #[schema(description = "ログインしたユーザーの情報")]
    pub user: UserResponse,
}

/// ユーザーレスポンス（パスワードハッシュを除外）
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(
    description = "APIレスポンス用のユーザー情報（機密情報を除外）",
    example = json!({
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "username": "cosmic_player",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-01T12:00:00Z"
    })
)]
pub struct UserResponse {
    /// ユーザーID
    #[schema(description = "ユーザーの一意識別子", format = "uuid")]
    pub id: Uuid,
    
    /// メールアドレス
    #[schema(description = "ユーザーのメールアドレス", format = "email")]
    pub email: String,
    
    /// ユーザー名
    #[schema(description = "表示用のユーザー名")]
    pub username: String,
    
    /// 作成日時
    #[schema(description = "アカウント作成日時", format = "date-time")]
    pub created_at: DateTime<Utc>,
    
    /// 最終ログイン日時
    #[schema(description = "最終ログイン日時", format = "date-time", nullable = true)]
    pub last_login: Option<DateTime<Utc>>,
}

/// リフレッシュトークンリクエスト
#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
#[schema(
    description = "トークンリフレッシュのリクエストデータ",
    example = json!({
        "refresh_token": "refresh_token_string_here"
    })
)]
pub struct RefreshTokenRequest {
    /// リフレッシュトークン
    #[validate(length(min = 1, message = "リフレッシュトークンを入力してください"))]
    #[schema(description = "有効なリフレッシュトークン")]
    pub refresh_token: String,
}

/// リフレッシュトークンレスポンス
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(
    description = "トークンリフレッシュ成功時のレスポンスデータ",
    example = json!({
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "refresh_token": "new_refresh_token_string_here",
        "token_type": "Bearer",
        "expires_in": 3600
    })
)]
pub struct RefreshTokenResponse {
    /// 新しいJWTアクセストークン
    #[schema(description = "新しいJWT形式のアクセストークン")]
    pub access_token: String,
    
    /// 新しいリフレッシュトークン
    #[schema(description = "新しいリフレッシュトークン")]
    pub refresh_token: String,
    
    /// トークンタイプ
    #[schema(description = "トークンタイプ", example = "Bearer")]
    pub token_type: String,
    
    /// アクセストークンの有効期限（秒）
    #[schema(description = "新しいアクセストークンの有効期限（秒）", example = 3600)]
    pub expires_in: i64,
}

/// ユーザー情報更新リクエスト
#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
#[schema(
    description = "ユーザー情報更新のリクエストデータ",
    example = json!({
        "username": "new_username",
        "new_password": "new_secure_password_123",
        "current_password": "current_password_123"
    })
)]
pub struct UpdateUserRequest {
    /// 新しいユーザー名（任意）
    #[validate(length(
        min = 3,
        max = 50,
        message = "ユーザー名は3文字以上50文字以下である必要があります"
    ))]
    #[validate(regex(
        path = "USERNAME_REGEX",
        message = "ユーザー名は英数字とアンダースコアのみ使用できます"
    ))]
    #[schema(description = "新しいユーザー名", min_length = 3, max_length = 50, pattern = "^[a-zA-Z0-9_]+$", nullable = true)]
    pub username: Option<String>,
    
    /// 新しいパスワード（任意）
    #[validate(length(
        min = 12,
        max = 128,
        message = "パスワードは12文字以上128文字以下である必要があります"
    ))]
    #[schema(description = "新しいパスワード", min_length = 12, max_length = 128, format = "password", nullable = true)]
    pub new_password: Option<String>,
    
    /// 現在のパスワード（パスワード変更時は必須）
    #[validate(length(min = 1, message = "現在のパスワードを入力してください"))]
    #[schema(description = "現在のパスワード（パスワード変更時に必要）", format = "password", nullable = true)]
    pub current_password: Option<String>,
}

/// ゲーム状態保存リクエスト
#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
#[schema(
    description = "ゲーム状態保存のリクエストデータ",
    example = json!({
        "save_name": "my_game",
        "game_data": {
            "version": "1.6-accumulator",
            "resources": {
                "cosmicDust": 1000,
                "energy": 500
            },
            "celestialBodies": []
        },
        "version": "1.6-accumulator"
    })
)]
pub struct SaveGameRequest {
    /// セーブデータ名（任意、デフォルト: "default"）
    #[validate(length(
        min = 1,
        max = 100,
        message = "セーブ名は1文字以上100文字以下である必要があります"
    ))]
    #[schema(description = "セーブデータの名前", min_length = 1, max_length = 100, nullable = true)]
    pub save_name: Option<String>,
    
    /// ゲームデータ（JSON形式）
    #[schema(description = "ゲームの状態データ（JSON形式）")]
    pub game_data: serde_json::Value,
    
    /// ゲームバージョン
    #[validate(length(
        min = 1,
        max = 20,
        message = "バージョンは1文字以上20文字以下である必要があります"
    ))]
    #[schema(description = "ゲームクライアントのバージョン", min_length = 1, max_length = 20)]
    pub version: String,
}

/// ゲーム状態レスポンス
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(
    description = "ゲーム状態取得のレスポンスデータ",
    example = json!({
        "save_name": "my_game",
        "game_data": {
            "version": "1.6-accumulator",
            "resources": {
                "cosmicDust": 1000,
                "energy": 500
            },
            "celestialBodies": []
        },
        "version": "1.6-accumulator",
        "last_saved": "2024-01-01T12:00:00Z"
    })
)]
pub struct GameStateResponse {
    /// セーブデータ名
    #[schema(description = "セーブデータの名前")]
    pub save_name: String,
    
    /// ゲームデータ
    #[schema(description = "ゲームの状態データ")]
    pub game_data: serde_json::Value,
    
    /// ゲームバージョン
    #[schema(description = "ゲームクライアントのバージョン")]
    pub version: String,
    
    /// 最終保存日時
    #[schema(description = "最後に保存された日時", format = "date-time")]
    pub last_saved: DateTime<Utc>,
}

/// 統計情報レスポンス
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(
    description = "プレイヤーの統計情報",
    example = json!({
        "total_play_time": 3600,
        "total_dust_collected": 1000000,
        "total_stars_created": 5,
        "total_planets_created": 15,
        "highest_energy": 50000,
        "achievements": [
            {
                "id": "first_star",
                "name": "最初の星",
                "description": "初めて星を作成した",
                "unlocked_at": "2024-01-01T12:00:00Z",
                "progress": 1.0
            }
        ],
        "last_updated": "2024-01-01T12:00:00Z"
    })
)]
pub struct StatisticsResponse {
    /// 総プレイ時間（秒）
    #[schema(description = "総プレイ時間（秒）", example = 3600)]
    pub total_play_time: i64,
    
    /// 総宇宙塵収集量
    #[schema(description = "収集した宇宙塵の総量", example = 1000000)]
    pub total_dust_collected: i64,
    
    /// 作成した星の総数
    #[schema(description = "作成した星の総数", example = 5)]
    pub total_stars_created: i32,
    
    /// 作成した惑星の総数
    #[schema(description = "作成した惑星の総数", example = 15)]
    pub total_planets_created: i32,
    
    /// 最高エネルギー値
    #[schema(description = "達成した最高エネルギー値", example = 50000)]
    pub highest_energy: i64,
    
    /// 実績リスト
    #[schema(description = "獲得した実績のリスト")]
    pub achievements: Vec<Achievement>,
    
    /// 最終更新日時
    #[schema(description = "統計が最後に更新された日時", format = "date-time")]
    pub last_updated: DateTime<Utc>,
}

/// 実績データ
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[schema(
    description = "ゲーム内の実績情報",
    example = json!({
        "id": "first_star",
        "name": "最初の星",
        "description": "初めて星を作成した",
        "unlocked_at": "2024-01-01T12:00:00Z",
        "progress": 1.0
    })
)]
pub struct Achievement {
    /// 実績ID
    #[schema(description = "実績の一意識別子")]
    pub id: String,
    
    /// 実績名
    #[schema(description = "実績の表示名")]
    pub name: String,
    
    /// 実績の説明
    #[schema(description = "実績の達成条件や説明")]
    pub description: String,
    
    /// アンロック日時（未取得の場合はnull）
    #[schema(description = "実績を獲得した日時", format = "date-time", nullable = true)]
    pub unlocked_at: Option<DateTime<Utc>>,
    
    /// 進捗度（0.0-1.0、未取得の場合は部分的な進捗）
    #[schema(description = "実績の進捗度（0.0から1.0）", minimum = 0.0, maximum = 1.0, nullable = true)]
    pub progress: Option<f64>,
}

// バリデーション用の正規表現
use regex::Regex;
use once_cell::sync::Lazy;

static USERNAME_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z0-9_]+$").unwrap()
});

// 変換実装
impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            username: user.username,
            created_at: user.created_at,
            last_login: user.last_login,
        }
    }
}