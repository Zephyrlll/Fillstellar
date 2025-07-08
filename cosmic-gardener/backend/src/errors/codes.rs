use serde::{Deserialize, Serialize};
use std::fmt;

/// システム全体で使用するエラーコード
/// 
/// エラーコードの命名規則:
/// - 大文字のスネークケース
/// - プレフィックスで分類（AUTH_, VALIDATION_, DB_, etc.）
/// - 具体的で分かりやすい名前
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCode {
    // === 認証・認可エラー (AUTH_*) ===
    /// 認証情報が無効
    AUTH_INVALID_CREDENTIALS,
    /// 認証が必要
    AUTH_REQUIRED,
    /// トークンが無効
    AUTH_INVALID_TOKEN,
    /// トークンが期限切れ
    AUTH_TOKEN_EXPIRED,
    /// リフレッシュトークンが無効
    AUTH_INVALID_REFRESH_TOKEN,
    /// 権限が不足
    AUTH_INSUFFICIENT_PERMISSION,
    /// アカウントが無効化されている
    AUTH_ACCOUNT_DISABLED,
    /// アカウントがロックされている
    AUTH_ACCOUNT_LOCKED,
    /// セッションが無効
    AUTH_INVALID_SESSION,

    // === バリデーションエラー (VALIDATION_*) ===
    /// 必須フィールドが欠如
    VALIDATION_REQUIRED_FIELD_MISSING,
    /// フィールドの形式が無効
    VALIDATION_INVALID_FORMAT,
    /// 値が範囲外
    VALIDATION_VALUE_OUT_OF_RANGE,
    /// 文字列が長すぎる
    VALIDATION_STRING_TOO_LONG,
    /// 文字列が短すぎる
    VALIDATION_STRING_TOO_SHORT,
    /// 無効なメールアドレス形式
    VALIDATION_INVALID_EMAIL,
    /// 無効なパスワード形式
    VALIDATION_INVALID_PASSWORD,
    /// 無効なユーザー名形式
    VALIDATION_INVALID_USERNAME,
    /// 複数のバリデーションエラー
    VALIDATION_MULTIPLE_ERRORS,

    // === リソースエラー (RESOURCE_*) ===
    /// リソースが見つからない
    RESOURCE_NOT_FOUND,
    /// ユーザーが見つからない
    RESOURCE_USER_NOT_FOUND,
    /// ゲーム状態が見つからない
    RESOURCE_GAME_STATE_NOT_FOUND,
    /// セーブデータが見つからない
    RESOURCE_SAVE_DATA_NOT_FOUND,
    /// リソースがすでに存在
    RESOURCE_ALREADY_EXISTS,
    /// ユーザー名がすでに使用されている
    RESOURCE_USERNAME_TAKEN,
    /// メールアドレスがすでに使用されている
    RESOURCE_EMAIL_TAKEN,

    // === リクエストエラー (REQUEST_*) ===
    /// 不正なリクエスト
    REQUEST_INVALID,
    /// リクエストボディが無効
    REQUEST_INVALID_BODY,
    /// コンテンツタイプが無効
    REQUEST_INVALID_CONTENT_TYPE,
    /// ペイロードが大きすぎる
    REQUEST_PAYLOAD_TOO_LARGE,
    /// 不正なクエリパラメータ
    REQUEST_INVALID_QUERY_PARAM,
    /// 不正なパスパラメータ
    REQUEST_INVALID_PATH_PARAM,

    // === レート制限エラー (RATE_LIMIT_*) ===
    /// レート制限に達した
    RATE_LIMIT_EXCEEDED,
    /// IP アドレスの制限に達した
    RATE_LIMIT_IP_EXCEEDED,
    /// ユーザー固有の制限に達した
    RATE_LIMIT_USER_EXCEEDED,
    /// API エンドポイント固有の制限に達した
    RATE_LIMIT_ENDPOINT_EXCEEDED,

    // === データベースエラー (DB_*) ===
    /// データベース接続エラー
    DB_CONNECTION_ERROR,
    /// データベースクエリエラー
    DB_QUERY_ERROR,
    /// データベーストランザクションエラー
    DB_TRANSACTION_ERROR,
    /// データベース制約違反
    DB_CONSTRAINT_VIOLATION,
    /// 外部キー制約違反
    DB_FOREIGN_KEY_VIOLATION,
    /// 一意制約違反
    DB_UNIQUE_VIOLATION,
    /// データベースタイムアウト
    DB_TIMEOUT,
    /// データベースが利用不可
    DB_UNAVAILABLE,

    // === 外部サービスエラー (EXTERNAL_*) ===
    /// 外部サービスが利用不可
    EXTERNAL_SERVICE_UNAVAILABLE,
    /// 外部API呼び出しエラー
    EXTERNAL_API_ERROR,
    /// 外部サービスタイムアウト
    EXTERNAL_SERVICE_TIMEOUT,
    /// 外部サービス認証エラー
    EXTERNAL_AUTH_ERROR,
    /// 外部サービスレート制限
    EXTERNAL_RATE_LIMIT,

    // === ゲーム固有エラー (GAME_*) ===
    /// ゲーム状態が無効
    GAME_INVALID_STATE,
    /// ゲームアクションが無効
    GAME_INVALID_ACTION,
    /// リソースが不足
    GAME_INSUFFICIENT_RESOURCES,
    /// ゲームルール違反
    GAME_RULE_VIOLATION,
    /// セーブデータが破損
    GAME_SAVE_CORRUPTED,
    /// バージョン不一致
    GAME_VERSION_MISMATCH,
    /// 最大制限に達した
    GAME_LIMIT_REACHED,

    // === ビジネスロジックエラー (BUSINESS_*) ===
    /// ビジネスルール違反
    BUSINESS_RULE_VIOLATION,
    /// 操作が許可されていない
    BUSINESS_OPERATION_NOT_ALLOWED,
    /// 条件が満たされていない
    BUSINESS_CONDITION_NOT_MET,
    /// 状態遷移が無効
    BUSINESS_INVALID_STATE_TRANSITION,

    // === システムエラー (SYSTEM_*) ===
    /// 内部サーバーエラー
    SYSTEM_INTERNAL_ERROR,
    /// 設定エラー
    SYSTEM_CONFIGURATION_ERROR,
    /// サービス利用不可
    SYSTEM_SERVICE_UNAVAILABLE,
    /// メンテナンス中
    SYSTEM_MAINTENANCE,
    /// 容量不足
    SYSTEM_INSUFFICIENT_CAPACITY,
    /// タイムアウト
    SYSTEM_TIMEOUT,

    // === ファイル・ストレージエラー (STORAGE_*) ===
    /// ファイルが見つからない
    STORAGE_FILE_NOT_FOUND,
    /// ファイルアクセスエラー
    STORAGE_ACCESS_ERROR,
    /// ストレージ容量不足
    STORAGE_INSUFFICIENT_SPACE,
    /// ファイル形式が無効
    STORAGE_INVALID_FILE_FORMAT,
    /// ファイルサイズ制限超過
    STORAGE_FILE_TOO_LARGE,

    // === 暗号化・セキュリティエラー (SECURITY_*) ===
    /// 暗号化エラー
    SECURITY_ENCRYPTION_ERROR,
    /// 復号化エラー
    SECURITY_DECRYPTION_ERROR,
    /// 署名検証エラー
    SECURITY_SIGNATURE_VERIFICATION_ERROR,
    /// セキュリティポリシー違反
    SECURITY_POLICY_VIOLATION,
    /// 不審なアクティビティ
    SECURITY_SUSPICIOUS_ACTIVITY,
}

impl ErrorCode {
    /// エラーコードのカテゴリを取得
    pub fn category(&self) -> ErrorCategory {
        match self {
            ErrorCode::AUTH_INVALID_CREDENTIALS |
            ErrorCode::AUTH_REQUIRED |
            ErrorCode::AUTH_INVALID_TOKEN |
            ErrorCode::AUTH_TOKEN_EXPIRED |
            ErrorCode::AUTH_INVALID_REFRESH_TOKEN |
            ErrorCode::AUTH_INSUFFICIENT_PERMISSION |
            ErrorCode::AUTH_ACCOUNT_DISABLED |
            ErrorCode::AUTH_ACCOUNT_LOCKED |
            ErrorCode::AUTH_INVALID_SESSION => ErrorCategory::Authentication,

            ErrorCode::VALIDATION_REQUIRED_FIELD_MISSING |
            ErrorCode::VALIDATION_INVALID_FORMAT |
            ErrorCode::VALIDATION_VALUE_OUT_OF_RANGE |
            ErrorCode::VALIDATION_STRING_TOO_LONG |
            ErrorCode::VALIDATION_STRING_TOO_SHORT |
            ErrorCode::VALIDATION_INVALID_EMAIL |
            ErrorCode::VALIDATION_INVALID_PASSWORD |
            ErrorCode::VALIDATION_INVALID_USERNAME |
            ErrorCode::VALIDATION_MULTIPLE_ERRORS => ErrorCategory::Validation,

            ErrorCode::RESOURCE_NOT_FOUND |
            ErrorCode::RESOURCE_USER_NOT_FOUND |
            ErrorCode::RESOURCE_GAME_STATE_NOT_FOUND |
            ErrorCode::RESOURCE_SAVE_DATA_NOT_FOUND |
            ErrorCode::RESOURCE_ALREADY_EXISTS |
            ErrorCode::RESOURCE_USERNAME_TAKEN |
            ErrorCode::RESOURCE_EMAIL_TAKEN => ErrorCategory::Resource,

            ErrorCode::REQUEST_INVALID |
            ErrorCode::REQUEST_INVALID_BODY |
            ErrorCode::REQUEST_INVALID_CONTENT_TYPE |
            ErrorCode::REQUEST_PAYLOAD_TOO_LARGE |
            ErrorCode::REQUEST_INVALID_QUERY_PARAM |
            ErrorCode::REQUEST_INVALID_PATH_PARAM => ErrorCategory::Request,

            ErrorCode::RATE_LIMIT_EXCEEDED |
            ErrorCode::RATE_LIMIT_IP_EXCEEDED |
            ErrorCode::RATE_LIMIT_USER_EXCEEDED |
            ErrorCode::RATE_LIMIT_ENDPOINT_EXCEEDED => ErrorCategory::RateLimit,

            ErrorCode::DB_CONNECTION_ERROR |
            ErrorCode::DB_QUERY_ERROR |
            ErrorCode::DB_TRANSACTION_ERROR |
            ErrorCode::DB_CONSTRAINT_VIOLATION |
            ErrorCode::DB_FOREIGN_KEY_VIOLATION |
            ErrorCode::DB_UNIQUE_VIOLATION |
            ErrorCode::DB_TIMEOUT |
            ErrorCode::DB_UNAVAILABLE => ErrorCategory::Database,

            ErrorCode::EXTERNAL_SERVICE_UNAVAILABLE |
            ErrorCode::EXTERNAL_API_ERROR |
            ErrorCode::EXTERNAL_SERVICE_TIMEOUT |
            ErrorCode::EXTERNAL_AUTH_ERROR |
            ErrorCode::EXTERNAL_RATE_LIMIT => ErrorCategory::External,

            ErrorCode::GAME_INVALID_STATE |
            ErrorCode::GAME_INVALID_ACTION |
            ErrorCode::GAME_INSUFFICIENT_RESOURCES |
            ErrorCode::GAME_RULE_VIOLATION |
            ErrorCode::GAME_SAVE_CORRUPTED |
            ErrorCode::GAME_VERSION_MISMATCH |
            ErrorCode::GAME_LIMIT_REACHED => ErrorCategory::Game,

            ErrorCode::BUSINESS_RULE_VIOLATION |
            ErrorCode::BUSINESS_OPERATION_NOT_ALLOWED |
            ErrorCode::BUSINESS_CONDITION_NOT_MET |
            ErrorCode::BUSINESS_INVALID_STATE_TRANSITION => ErrorCategory::Business,

            ErrorCode::SYSTEM_INTERNAL_ERROR |
            ErrorCode::SYSTEM_CONFIGURATION_ERROR |
            ErrorCode::SYSTEM_SERVICE_UNAVAILABLE |
            ErrorCode::SYSTEM_MAINTENANCE |
            ErrorCode::SYSTEM_INSUFFICIENT_CAPACITY |
            ErrorCode::SYSTEM_TIMEOUT => ErrorCategory::System,

            ErrorCode::STORAGE_FILE_NOT_FOUND |
            ErrorCode::STORAGE_ACCESS_ERROR |
            ErrorCode::STORAGE_INSUFFICIENT_SPACE |
            ErrorCode::STORAGE_INVALID_FILE_FORMAT |
            ErrorCode::STORAGE_FILE_TOO_LARGE => ErrorCategory::Storage,

            ErrorCode::SECURITY_ENCRYPTION_ERROR |
            ErrorCode::SECURITY_DECRYPTION_ERROR |
            ErrorCode::SECURITY_SIGNATURE_VERIFICATION_ERROR |
            ErrorCode::SECURITY_POLICY_VIOLATION |
            ErrorCode::SECURITY_SUSPICIOUS_ACTIVITY => ErrorCategory::Security,
        }
    }

    /// ユーザー向けメッセージを取得
    pub fn user_message(&self) -> &'static str {
        match self {
            // 認証エラー
            ErrorCode::AUTH_INVALID_CREDENTIALS => "メールアドレスまたはパスワードが正しくありません",
            ErrorCode::AUTH_REQUIRED => "認証が必要です",
            ErrorCode::AUTH_INVALID_TOKEN => "認証トークンが無効です",
            ErrorCode::AUTH_TOKEN_EXPIRED => "認証トークンの有効期限が切れています",
            ErrorCode::AUTH_INVALID_REFRESH_TOKEN => "リフレッシュトークンが無効です",
            ErrorCode::AUTH_INSUFFICIENT_PERMISSION => "この操作を実行する権限がありません",
            ErrorCode::AUTH_ACCOUNT_DISABLED => "アカウントが無効化されています",
            ErrorCode::AUTH_ACCOUNT_LOCKED => "アカウントがロックされています",
            ErrorCode::AUTH_INVALID_SESSION => "セッションが無効です",

            // バリデーションエラー
            ErrorCode::VALIDATION_REQUIRED_FIELD_MISSING => "必須フィールドが入力されていません",
            ErrorCode::VALIDATION_INVALID_FORMAT => "入力形式が正しくありません",
            ErrorCode::VALIDATION_VALUE_OUT_OF_RANGE => "値が有効な範囲を超えています",
            ErrorCode::VALIDATION_STRING_TOO_LONG => "入力文字数が上限を超えています",
            ErrorCode::VALIDATION_STRING_TOO_SHORT => "入力文字数が不足しています",
            ErrorCode::VALIDATION_INVALID_EMAIL => "メールアドレスの形式が正しくありません",
            ErrorCode::VALIDATION_INVALID_PASSWORD => "パスワードの形式が正しくありません",
            ErrorCode::VALIDATION_INVALID_USERNAME => "ユーザー名の形式が正しくありません",
            ErrorCode::VALIDATION_MULTIPLE_ERRORS => "複数の入力エラーがあります",

            // リソースエラー
            ErrorCode::RESOURCE_NOT_FOUND => "指定されたリソースが見つかりません",
            ErrorCode::RESOURCE_USER_NOT_FOUND => "ユーザーが見つかりません",
            ErrorCode::RESOURCE_GAME_STATE_NOT_FOUND => "ゲーム状態が見つかりません",
            ErrorCode::RESOURCE_SAVE_DATA_NOT_FOUND => "セーブデータが見つかりません",
            ErrorCode::RESOURCE_ALREADY_EXISTS => "指定されたリソースは既に存在します",
            ErrorCode::RESOURCE_USERNAME_TAKEN => "このユーザー名は既に使用されています",
            ErrorCode::RESOURCE_EMAIL_TAKEN => "このメールアドレスは既に使用されています",

            // リクエストエラー
            ErrorCode::REQUEST_INVALID => "リクエストが無効です",
            ErrorCode::REQUEST_INVALID_BODY => "リクエストボディが無効です",
            ErrorCode::REQUEST_INVALID_CONTENT_TYPE => "コンテンツタイプが無効です",
            ErrorCode::REQUEST_PAYLOAD_TOO_LARGE => "送信データが大きすぎます",
            ErrorCode::REQUEST_INVALID_QUERY_PARAM => "クエリパラメータが無効です",
            ErrorCode::REQUEST_INVALID_PATH_PARAM => "パスパラメータが無効です",

            // レート制限エラー
            ErrorCode::RATE_LIMIT_EXCEEDED => "アクセス頻度が制限を超えています。しばらく待ってから再試行してください",
            ErrorCode::RATE_LIMIT_IP_EXCEEDED => "IPアドレスのアクセス制限に達しています",
            ErrorCode::RATE_LIMIT_USER_EXCEEDED => "ユーザーのアクセス制限に達しています",
            ErrorCode::RATE_LIMIT_ENDPOINT_EXCEEDED => "このAPIのアクセス制限に達しています",

            // データベースエラー
            ErrorCode::DB_CONNECTION_ERROR => "データベース接続エラーが発生しました",
            ErrorCode::DB_QUERY_ERROR => "データベース操作でエラーが発生しました",
            ErrorCode::DB_TRANSACTION_ERROR => "トランザクション処理でエラーが発生しました",
            ErrorCode::DB_CONSTRAINT_VIOLATION => "データ整合性エラーが発生しました",
            ErrorCode::DB_FOREIGN_KEY_VIOLATION => "参照整合性エラーが発生しました",
            ErrorCode::DB_UNIQUE_VIOLATION => "重複データエラーが発生しました",
            ErrorCode::DB_TIMEOUT => "データベース処理がタイムアウトしました",
            ErrorCode::DB_UNAVAILABLE => "データベースが利用できません",

            // 外部サービスエラー
            ErrorCode::EXTERNAL_SERVICE_UNAVAILABLE => "外部サービスが利用できません",
            ErrorCode::EXTERNAL_API_ERROR => "外部API呼び出しでエラーが発生しました",
            ErrorCode::EXTERNAL_SERVICE_TIMEOUT => "外部サービスへの接続がタイムアウトしました",
            ErrorCode::EXTERNAL_AUTH_ERROR => "外部サービスの認証でエラーが発生しました",
            ErrorCode::EXTERNAL_RATE_LIMIT => "外部サービスのレート制限に達しました",

            // ゲーム固有エラー
            ErrorCode::GAME_INVALID_STATE => "ゲーム状態が無効です",
            ErrorCode::GAME_INVALID_ACTION => "無効なゲームアクションです",
            ErrorCode::GAME_INSUFFICIENT_RESOURCES => "リソースが不足しています",
            ErrorCode::GAME_RULE_VIOLATION => "ゲームルールに違反しています",
            ErrorCode::GAME_SAVE_CORRUPTED => "セーブデータが破損しています",
            ErrorCode::GAME_VERSION_MISMATCH => "ゲームバージョンが一致しません",
            ErrorCode::GAME_LIMIT_REACHED => "制限に達しています",

            // ビジネスロジックエラー
            ErrorCode::BUSINESS_RULE_VIOLATION => "ビジネスルールに違反しています",
            ErrorCode::BUSINESS_OPERATION_NOT_ALLOWED => "この操作は許可されていません",
            ErrorCode::BUSINESS_CONDITION_NOT_MET => "実行条件が満たされていません",
            ErrorCode::BUSINESS_INVALID_STATE_TRANSITION => "無効な状態遷移です",

            // システムエラー
            ErrorCode::SYSTEM_INTERNAL_ERROR => "内部サーバーエラーが発生しました",
            ErrorCode::SYSTEM_CONFIGURATION_ERROR => "システム設定エラーが発生しました",
            ErrorCode::SYSTEM_SERVICE_UNAVAILABLE => "サービスが一時的に利用できません",
            ErrorCode::SYSTEM_MAINTENANCE => "システムメンテナンス中です",
            ErrorCode::SYSTEM_INSUFFICIENT_CAPACITY => "システム容量が不足しています",
            ErrorCode::SYSTEM_TIMEOUT => "処理がタイムアウトしました",

            // ストレージエラー
            ErrorCode::STORAGE_FILE_NOT_FOUND => "ファイルが見つかりません",
            ErrorCode::STORAGE_ACCESS_ERROR => "ファイルアクセスエラーが発生しました",
            ErrorCode::STORAGE_INSUFFICIENT_SPACE => "ストレージ容量が不足しています",
            ErrorCode::STORAGE_INVALID_FILE_FORMAT => "ファイル形式が無効です",
            ErrorCode::STORAGE_FILE_TOO_LARGE => "ファイルサイズが制限を超えています",

            // セキュリティエラー
            ErrorCode::SECURITY_ENCRYPTION_ERROR => "暗号化処理でエラーが発生しました",
            ErrorCode::SECURITY_DECRYPTION_ERROR => "復号化処理でエラーが発生しました",
            ErrorCode::SECURITY_SIGNATURE_VERIFICATION_ERROR => "署名検証でエラーが発生しました",
            ErrorCode::SECURITY_POLICY_VIOLATION => "セキュリティポリシーに違反しています",
            ErrorCode::SECURITY_SUSPICIOUS_ACTIVITY => "不審なアクティビティが検出されました",
        }
    }

    /// 技術的な詳細メッセージを取得（開発者向け）
    pub fn technical_message(&self) -> &'static str {
        match self {
            ErrorCode::AUTH_INVALID_CREDENTIALS => "Authentication failed: invalid email or password",
            ErrorCode::DB_CONNECTION_ERROR => "Database connection failed: unable to establish connection",
            ErrorCode::SYSTEM_INTERNAL_ERROR => "Internal server error: unexpected system failure",
            // 他のエラーコードも同様に定義...
            _ => "Technical details not available",
        }
    }
}

/// エラーカテゴリ
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorCategory {
    Authentication,
    Validation,
    Resource,
    Request,
    RateLimit,
    Database,
    External,
    Game,
    Business,
    System,
    Storage,
    Security,
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}