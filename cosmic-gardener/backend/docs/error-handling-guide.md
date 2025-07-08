# エラーハンドリングシステム ガイド

## 概要

Cosmic Gardener バックエンドの統一的なエラーハンドリングシステムの使用方法とベストプラクティスについて説明します。

## エラー型の構造

### 1. ApiError 列挙型

すべてのAPIエラーは `ApiError` 型で表現されます：

```rust
use cosmic_gardener_backend::errors::{ApiError, ErrorCode};

// 認証エラーの例
let auth_error = ApiError::Unauthorized {
    code: ErrorCode::AUTH_INVALID_CREDENTIALS,
    message: "Invalid email or password".to_string(),
    details: None,
};
```

### 2. ErrorResponse 構造体

HTTP応答として返されるエラーの形式：

```json
{
  "error": "Unauthorized",
  "error_code": "AUTH_INVALID_CREDENTIALS", 
  "message": "メールアドレスまたはパスワードが正しくありません",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-01T00:00:00Z",
  "details": {
    "field": "password"
  },
  "trace_id": "trace-123"
}
```

## エラーコードの体系

### カテゴリ別分類

| カテゴリ | プレフィックス | 例 |
|---------|---------------|-----|
| 認証・認可 | `AUTH_` | `AUTH_INVALID_CREDENTIALS` |
| バリデーション | `VALIDATION_` | `VALIDATION_INVALID_EMAIL` |
| リソース | `RESOURCE_` | `RESOURCE_NOT_FOUND` |
| リクエスト | `REQUEST_` | `REQUEST_INVALID_BODY` |
| レート制限 | `RATE_LIMIT_` | `RATE_LIMIT_EXCEEDED` |
| データベース | `DB_` | `DB_CONNECTION_ERROR` |
| 外部サービス | `EXTERNAL_` | `EXTERNAL_SERVICE_UNAVAILABLE` |
| ゲーム | `GAME_` | `GAME_INVALID_STATE` |
| ビジネスロジック | `BUSINESS_` | `BUSINESS_RULE_VIOLATION` |
| システム | `SYSTEM_` | `SYSTEM_INTERNAL_ERROR` |

## 使用方法

### 1. マクロを使用した簡潔なエラー作成

```rust
use cosmic_gardener_backend::{
    auth_error, not_found_error, conflict_error, bad_request_error,
    errors::ErrorCode
};

// 認証エラー
let error = auth_error!(ErrorCode::AUTH_INVALID_CREDENTIALS, "Invalid credentials");

// リソースが見つからない
let error = not_found_error!(
    ErrorCode::RESOURCE_USER_NOT_FOUND, 
    "User not found", 
    "user"
);

// 競合エラー
let error = conflict_error!(
    ErrorCode::RESOURCE_EMAIL_TAKEN, 
    "Email already exists",
    "email"
);
```

### 2. ハンドラーでの使用例

```rust
use actix_web::{web, HttpResponse};
use cosmic_gardener_backend::errors::{ApiError, ErrorCode, Result};

pub async fn get_user(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let user_id = path.into_inner().parse::<Uuid>()
        .map_err(|_| bad_request_error!(
            ErrorCode::REQUEST_INVALID_PATH_PARAM,
            "Invalid user ID format",
            "user_id"
        ))?;

    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", user_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| not_found_error!(
            ErrorCode::RESOURCE_USER_NOT_FOUND,
            "User not found"
        ))?;

    Ok(HttpResponse::Ok().json(user))
}
```

### 3. 自動変換の活用

一般的なライブラリのエラーは自動的に `ApiError` に変換されます：

```rust
// SQLxエラーの自動変換
let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", user_id)
    .fetch_one(pool.get_ref())
    .await?; // SQLxエラーが自動的にApiErrorに変換される

// バリデーションエラーの自動変換
user_data.validate()?; // ValidationErrorsがApiErrorに変換される

// JWTエラーの自動変換
let claims = jwt_service.validate_token(&token)?; // JWTエラーが自動変換される
```

## エラーの重要度とログレベル

### 重要度の分類

```rust
use cosmic_gardener_backend::errors::ErrorSeverity;

match error.severity() {
    ErrorSeverity::Critical => // システム停止レベル（log::error!）
    ErrorSeverity::High => // サービス影響あり（log::error!）
    ErrorSeverity::Medium => // 部分的な機能停止（log::warn!）
    ErrorSeverity::Low => // 軽微な影響（log::info!）
    ErrorSeverity::Info => // 情報レベル（log::debug!）
}
```

### 自動ログ出力

エラーは重要度に応じて自動的にログに記録されます：

```
2024-01-01T00:00:00Z ERROR cosmic_gardener::api_error: Critical error occurred: Database connection failed (request_id: 550e8400-e29b-41d4-a716-446655440000)
```

## ベストプラクティス

### 1. 適切なエラーコードの選択

```rust
// ❌ 汎用的すぎる
return Err(internal_error!(ErrorCode::SYSTEM_INTERNAL_ERROR, "Error occurred"));

// ✅ 具体的で意味のある
return Err(auth_error!(ErrorCode::AUTH_INVALID_CREDENTIALS, "Invalid email or password"));
```

### 2. ユーザーフレンドリーなメッセージ

```rust
// ❌ 技術的すぎる
let error = db_error!(ErrorCode::DB_QUERY_ERROR, "SQLState: 23505");

// ✅ ユーザーが理解しやすい
let error = conflict_error!(
    ErrorCode::RESOURCE_EMAIL_TAKEN, 
    "このメールアドレスは既に使用されています"
);
```

### 3. 適切な詳細情報の提供

```rust
// 開発時のみ詳細情報を含める
let error = ApiError::ValidationError {
    code: ErrorCode::VALIDATION_MULTIPLE_ERRORS,
    message: "Validation failed".to_string(),
    errors: validation_errors, // 具体的なバリデーションエラー
};
```

### 4. セキュリティ考慮

```rust
// ❌ 内部情報を漏洩
return Err(internal_error!(
    ErrorCode::SYSTEM_INTERNAL_ERROR, 
    "Database connection string: postgres://user:pass@host/db"
));

// ✅ 安全な情報のみ
return Err(internal_error!(
    ErrorCode::DB_CONNECTION_ERROR, 
    "Database connection failed"
));
```

## テストでの使用

### 1. エラーレスポンスのテスト

```rust
#[actix_web::test]
async fn test_invalid_credentials() {
    let app = test::init_service(App::new().configure(routes)).await;
    
    let req = test::TestRequest::post()
        .uri("/api/auth/login")
        .set_json(&json!({"email": "invalid", "password": "wrong"}))
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    
    let body: ErrorResponse = test::read_body_json(resp).await;
    assert_eq!(body.error_code, "AUTH_INVALID_CREDENTIALS");
}
```

### 2. エラー変換のテスト

```rust
#[test]
fn test_sqlx_error_conversion() {
    let sqlx_error = sqlx::Error::RowNotFound;
    let api_error: ApiError = sqlx_error.into();
    
    match api_error {
        ApiError::NotFound { code, .. } => {
            assert_eq!(code, ErrorCode::RESOURCE_NOT_FOUND);
        }
        _ => panic!("Expected NotFound error"),
    }
}
```

## ミドルウェアの設定

### エラーハンドリングミドルウェアの有効化

```rust
use cosmic_gardener_backend::middleware::ErrorHandlingMiddleware;

let app = App::new()
    .wrap(ErrorHandlingMiddleware) // 全てのリクエストでエラー処理
    .configure(routes);
```

## 監視とアラート

### メトリクス収集

- エラー発生率の監視
- エラーカテゴリ別の統計
- 重要度別のアラート設定

### ログ解析

```bash
# 重要度がCriticalのエラーを検索
grep "CRITICAL" /var/log/cosmic-gardener/app.log

# 特定のエラーコードを検索
grep "AUTH_INVALID_CREDENTIALS" /var/log/cosmic-gardener/app.log

# リクエストIDで追跡
grep "550e8400-e29b-41d4-a716-446655440000" /var/log/cosmic-gardener/app.log
```

## カスタムエラーの追加

新しいエラータイプが必要な場合：

1. `ErrorCode` 列挙型に新しいコードを追加
2. `ApiError` 列挙型に新しいバリアントを追加
3. 適切な変換関数を実装
4. テストを作成

```rust
// 1. ErrorCodeに追加
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCode {
    // ... 既存のコード
    CUSTOM_NEW_ERROR,
}

// 2. ApiErrorに追加
pub enum ApiError {
    // ... 既存のバリアント
    CustomError {
        code: ErrorCode,
        message: String,
        custom_field: Option<String>,
    },
}
```