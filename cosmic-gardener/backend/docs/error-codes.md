# エラーコード一覧

Cosmic Gardener API の全エラーコードと対応方法について説明します。

## エラーレスポンス形式

```json
{
  "error": "エラータイプ",
  "error_code": "ERROR_CODE",
  "message": "ユーザー向けメッセージ",
  "request_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "details": {},
  "trace_id": "trace-123"
}
```

## 認証・認可エラー (AUTH_*)

### AUTH_INVALID_CREDENTIALS
- **HTTPステータス**: 401 Unauthorized
- **説明**: メールアドレスまたはパスワードが正しくない
- **対処法**: 正しい認証情報を入力してください

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "wrong@example.com", "password": "wrong"}'
```

### AUTH_REQUIRED
- **HTTPステータス**: 401 Unauthorized
- **説明**: 認証が必要なエンドポイントに未認証でアクセス
- **対処法**: Authorization ヘッダーにJWTトークンを含めてください

```bash
curl -X GET http://localhost:8080/api/users/me
# ❌ Authorization ヘッダーなし

curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer <access_token>"
# ✅ 正しい認証
```

### AUTH_INVALID_TOKEN
- **HTTPステータス**: 401 Unauthorized
- **説明**: JWTトークンが無効または形式が不正
- **対処法**: 有効なJWTトークンを使用してください

### AUTH_TOKEN_EXPIRED
- **HTTPステータス**: 401 Unauthorized
- **説明**: JWTトークンの有効期限が切れている
- **対処法**: リフレッシュトークンで新しいアクセストークンを取得してください

```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

### AUTH_INVALID_REFRESH_TOKEN
- **HTTPステータス**: 401 Unauthorized
- **説明**: リフレッシュトークンが無効または期限切れ
- **対処法**: 再度ログインしてください

### AUTH_INSUFFICIENT_PERMISSION
- **HTTPステータス**: 403 Forbidden
- **説明**: 操作に必要な権限がない
- **対処法**: 適切な権限を持つアカウントでアクセスしてください

## バリデーションエラー (VALIDATION_*)

### VALIDATION_MULTIPLE_ERRORS
- **HTTPステータス**: 400 Bad Request
- **説明**: 複数のフィールドにバリデーションエラー
- **対処法**: details フィールドで具体的なエラーを確認してください

```json
{
  "error": "ValidationError",
  "error_code": "VALIDATION_MULTIPLE_ERRORS",
  "message": "バリデーションに失敗しました",
  "details": {
    "email": ["有効なメールアドレスを入力してください"],
    "password": ["パスワードは12文字以上である必要があります"]
  }
}
```

### VALIDATION_INVALID_EMAIL
- **HTTPステータス**: 400 Bad Request
- **説明**: メールアドレスの形式が無効
- **対処法**: RFC 5322準拠のメールアドレスを入力してください

### VALIDATION_INVALID_PASSWORD
- **HTTPステータス**: 400 Bad Request
- **説明**: パスワードの形式が無効
- **対処法**: 12-128文字のパスワードを設定してください

### VALIDATION_INVALID_USERNAME
- **HTTPステータス**: 400 Bad Request
- **説明**: ユーザー名の形式が無効
- **対処法**: 3-50文字の英数字とアンダースコアのみを使用してください

## リソースエラー (RESOURCE_*)

### RESOURCE_NOT_FOUND
- **HTTPステータス**: 404 Not Found
- **説明**: 指定されたリソースが見つからない
- **対処法**: 正しいリソースIDを指定してください

### RESOURCE_USER_NOT_FOUND
- **HTTPステータス**: 404 Not Found
- **説明**: ユーザーが見つからない
- **対処法**: 有効なユーザーIDを指定してください

### RESOURCE_GAME_STATE_NOT_FOUND
- **HTTPステータス**: 404 Not Found
- **説明**: ゲーム状態が見つからない
- **対処法**: 存在するセーブ名を指定するか、新しいゲームを開始してください

### RESOURCE_ALREADY_EXISTS
- **HTTPステータス**: 409 Conflict
- **説明**: リソースが既に存在している
- **対処法**: 異なる名前やIDを使用してください

### RESOURCE_USERNAME_TAKEN
- **HTTPステータス**: 409 Conflict
- **説明**: ユーザー名が既に使用されている
- **対処法**: 別のユーザー名を選択してください

### RESOURCE_EMAIL_TAKEN
- **HTTPステータス**: 409 Conflict
- **説明**: メールアドレスが既に使用されている
- **対処法**: 別のメールアドレスを使用してください

## リクエストエラー (REQUEST_*)

### REQUEST_INVALID
- **HTTPステータス**: 400 Bad Request
- **説明**: リクエストが無効
- **対処法**: リクエストの形式を確認してください

### REQUEST_INVALID_BODY
- **HTTPステータス**: 400 Bad Request
- **説明**: リクエストボディが無効
- **対処法**: 有効なJSON形式でデータを送信してください

```bash
# ❌ 無効なJSON
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{invalid json}'

# ✅ 有効なJSON
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "username": "user", "password": "password123"}'
```

### REQUEST_PAYLOAD_TOO_LARGE
- **HTTPステータス**: 413 Payload Too Large
- **説明**: リクエストペイロードが大きすぎる
- **対処法**: ペイロードサイズを制限内に収めてください

## レート制限エラー (RATE_LIMIT_*)

### RATE_LIMIT_EXCEEDED
- **HTTPステータス**: 429 Too Many Requests
- **説明**: レート制限に達している
- **対処法**: しばらく待ってから再試行してください

```json
{
  "error": "RateLimitExceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "message": "アクセス頻度が制限を超えています",
  "details": {
    "retry_after": 60,
    "limit_type": "endpoint"
  }
}
```

## データベースエラー (DB_*)

### DB_CONNECTION_ERROR
- **HTTPステータス**: 500 Internal Server Error
- **説明**: データベース接続エラー
- **対処法**: しばらく待ってから再試行してください

### DB_CONSTRAINT_VIOLATION
- **HTTPステータス**: 409 Conflict
- **説明**: データベース制約違反
- **対処法**: 入力データを確認してください

## ゲーム固有エラー (GAME_*)

### GAME_INVALID_STATE
- **HTTPステータス**: 422 Unprocessable Entity
- **説明**: ゲーム状態が無効
- **対処法**: 有効なゲームデータを送信してください

### GAME_VERSION_MISMATCH
- **HTTPステータス**: 422 Unprocessable Entity
- **説明**: ゲームバージョンが一致しない
- **対処法**: 最新のクライアントバージョンを使用してください

### GAME_SAVE_CORRUPTED
- **HTTPステータス**: 422 Unprocessable Entity
- **説明**: セーブデータが破損している
- **対処法**: 別のセーブデータを使用するか、新しいゲームを開始してください

## システムエラー (SYSTEM_*)

### SYSTEM_INTERNAL_ERROR
- **HTTPステータス**: 500 Internal Server Error
- **説明**: 内部サーバーエラー
- **対処法**: しばらく待ってから再試行してください。問題が続く場合はサポートに連絡してください

### SYSTEM_SERVICE_UNAVAILABLE
- **HTTPステータス**: 503 Service Unavailable
- **説明**: サービスが一時的に利用できない
- **対処法**: しばらく待ってから再試行してください

### SYSTEM_MAINTENANCE
- **HTTPステータス**: 503 Service Unavailable
- **説明**: システムメンテナンス中
- **対処法**: メンテナンス終了まで待ってください

## トラブルシューティング

### 1. 認証エラーの解決

```bash
# 1. 新しいアクセストークンを取得
ACCESS_TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  | jq -r '.access_token')

# 2. トークンを使用してAPIを呼び出し
curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 2. バリデーションエラーの解決

```bash
# エラーレスポンスの details フィールドを確認
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid", "username": "ab", "password": "short"}' \
  | jq '.details'
```

### 3. レート制限の回避

```bash
# Retry-After ヘッダーまたは details.retry_after を確認
curl -I -X POST http://localhost:8080/api/auth/login

# 指定された時間待ってから再試行
sleep 60
curl -X POST http://localhost:8080/api/auth/login ...
```

### 4. リクエストIDでログ追跡

エラーレスポンスの `request_id` を使用してサーバーログを検索できます：

```bash
grep "550e8400-e29b-41d4-a716-446655440000" /var/log/cosmic-gardener/app.log
```

## サポート

問題が解決しない場合は、以下の情報と共にサポートに連絡してください：

- エラーコード
- リクエストID
- 実行したcurlコマンド
- エラーが発生した時刻