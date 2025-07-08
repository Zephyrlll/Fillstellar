# Cosmic Gardener Backend API

Cosmic Gardenerの認証システムとゲーム状態管理を提供するRust製バックエンドAPI

## 概要

Cosmic Gardenerは、プレイヤーが宇宙塵から始めて星や惑星、さらには生命を育成する3D宇宙シミュレーションゲームです。このバックエンドAPIは、ユーザー認証、ゲーム状態の永続化、統計情報の管理を提供します。

## 🚀 主要機能

- **JWT認証システム**: セキュアなユーザー認証とセッション管理
- **ゲーム状態管理**: セーブデータの永続化と読み込み
- **統計システム**: プレイヤーの進捗と実績の追跡
- **セキュリティ**: Argon2パスワードハッシュ化、レート制限
- **REST API**: 明確でシンプルなAPI設計

## 🏗️ 技術スタック

- **言語**: Rust 1.70+
- **Webフレームワーク**: Actix Web 4.4
- **データベース**: PostgreSQL 12+
- **認証**: JWT (jsonwebtoken)
- **パスワードハッシュ**: Argon2
- **バリデーション**: validator
- **テスト**: Cargo test

## 🚀 クイックスタート

### 前提条件

- Rust 1.70+
- PostgreSQL 12+
- Redis 6+ (オプション)

### セットアップ

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd cosmic-gardener/backend
   ```

2. **環境変数の設定**
   ```bash
   cp .env.example .env
   # .envファイルを編集してデータベース接続情報等を設定
   ```

3. **データベースの作成**
   ```bash
   createdb cosmic_gardener
   createdb cosmic_gardener_test  # テスト用
   ```

4. **マイグレーションの実行**
   ```bash
   cargo install sqlx-cli
   sqlx migrate run
   ```

5. **サーバーの起動**
   ```bash
   cargo run
   ```

## 📚 API ドキュメント

### Swagger UI

APIドキュメントはSwagger UIで確認できます：

```
http://localhost:8080/swagger-ui/
```

### エンドポイント一覧

| エンドポイント | メソッド | 認証 | 説明 |
|-------------|--------|------|-----|
| `/api/auth/register` | POST | 不要 | ユーザー登録 |
| `/api/auth/login` | POST | 不要 | ログイン |
| `/api/auth/refresh` | POST | 不要 | トークンリフレッシュ |
| `/api/auth/logout` | POST | 不要 | ログアウト |
| `/api/users/me` | GET | 必要 | 現在のユーザー情報取得 |
| `/api/users/me` | PUT | 必要 | ユーザー情報更新 |
| `/api/users/me` | DELETE | 必要 | アカウント削除 |
| `/api/game/state` | GET | 必要 | ゲーム状態取得 |
| `/api/game/save` | POST | 必要 | ゲーム状態保存 |
| `/api/game/statistics` | GET | 必要 | 統計情報取得 |
| `/api/game/leaderboard` | GET | 必要 | リーダーボード取得 |

### 認証方法

APIは **JWT Bearer Token** 認証を使用します：

```bash
# ヘッダーに含める
Authorization: Bearer <access_token>
```

#### 認証フロー

1. **ユーザー登録** または **ログイン** でアクセストークンを取得
2. **リクエストヘッダー** にトークンを含めてAPIを呼び出し
3. **トークン期限切れ** 時はリフレッシュトークンで更新

### 使用例（curl）

#### 1. ユーザー登録

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "cosmic_player",
    "password": "secure_password_123"
  }'
```

**レスポンス:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "cosmic_player",
  "created_at": "2024-01-01T00:00:00Z",
  "last_login": null
}
```

#### 2. ログイン

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password_123"
  }'
```

**レスポンス:**
```json
{
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
}
```

#### 3. ユーザー情報取得（認証必要）

```bash
curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer <access_token>"
```

#### 4. ゲーム状態保存

```bash
curl -X POST http://localhost:8080/api/game/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
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
  }'
```

#### 5. ゲーム状態取得

```bash
curl -X GET "http://localhost:8080/api/game/state?save_name=my_game" \
  -H "Authorization: Bearer <access_token>"
```

#### 6. 統計情報取得

```bash
curl -X GET http://localhost:8080/api/game/statistics \
  -H "Authorization: Bearer <access_token>"
```

### エラーレスポンス

全てのエラーは統一された形式で返されます：

```json
{
  "error": "Unauthorized",
  "error_code": "AUTH_INVALID_CREDENTIALS",
  "message": "メールアドレスまたはパスワードが正しくありません",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-01T00:00:00Z",
  "details": {
    "field": "password"
  }
}
```

### 主要エラーコード

| エラーコード | HTTPステータス | 説明 |
|-------------|---------------|-----|
| `AUTH_INVALID_CREDENTIALS` | 401 | メールアドレスまたはパスワードが無効 |
| `AUTH_TOKEN_EXPIRED` | 401 | アクセストークンの有効期限切れ |
| `AUTH_INVALID_REFRESH_TOKEN` | 401 | リフレッシュトークンが無効 |
| `VALIDATION_MULTIPLE_ERRORS` | 400 | バリデーションエラー |
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない |
| `RESOURCE_ALREADY_EXISTS` | 409 | リソースが既に存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `SYSTEM_INTERNAL_ERROR` | 500 | 内部サーバーエラー |

### レート制限

| エンドポイント | 制限 |
|-------------|-----|
| `/api/auth/*` | 30リクエスト/分 |
| `/api/game/*` | 120リクエスト/分 |
| その他 | 100リクエスト/分 |

### バリデーション

#### ユーザー登録
- **メール**: RFC 5322準拠
- **ユーザー名**: 3-50文字、英数字とアンダースコアのみ
- **パスワード**: 12-128文字

#### ゲームデータ
- **セーブ名**: 1-100文字
- **バージョン**: 1-20文字
- **ゲームデータ**: 有効なJSON形式

## 設定

### 環境変数

主要な環境変数：

- `DATABASE_URL`: PostgreSQLデータベースURL
- `REDIS_URL`: RedisキャッシュURL
- `JWT_SECRET`: JWT署名用の秘密鍵
- `SERVER_PORT`: サーバーポート（デフォルト: 8080）
- `LOG_LEVEL`: ログレベル（debug, info, warn, error）

詳細は `.env.example` を参照してください。

### 設定ファイル

YAML形式の設定ファイルもサポート：

```yaml
# config/default.yaml
server:
  host: "0.0.0.0"
  port: 8080
  workers: 4

database:
  url: "postgresql://postgres:password@localhost/cosmic_gardener"
  max_connections: 20

# その他の設定...
```

## API ドキュメント

### REST API

- `GET /health` - ヘルスチェック
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/register` - ユーザー登録
- `GET /api/v1/players/{id}` - プレイヤー情報取得
- `GET /api/v1/celestial-bodies` - 天体一覧取得
- `POST /api/v1/celestial-bodies` - 天体作成

### WebSocket API

```javascript
// WebSocket接続
const ws = new WebSocket('ws://localhost:8080/ws/game');

// 天体作成
ws.send(JSON.stringify({
  type: 'create_celestial_body',
  data: {
    body_type: 'star',
    position: [0, 0, 0],
    mass: 1.989e30
  }
}));
```

## 開発

### コードスタイル

```bash
# フォーマット
cargo fmt

# Linting
cargo clippy

# テスト
cargo test
```

### ベンチマーク

```bash
# 物理シミュレーションのベンチマーク
cargo bench --bench physics_benchmark

# データベースのベンチマーク
cargo bench --bench database_benchmark
```

### プロファイリング

```bash
# CPU プロファイリング
cargo install flamegraph
cargo flamegraph --bin cosmic-gardener-server

# メモリプロファイリング
cargo install valgrind
valgrind --tool=massif target/release/cosmic-gardener-server
```

## テスト

### 単体テスト

```bash
cargo test
```

### 統合テスト

```bash
cargo test --test integration
```

### パフォーマンステスト

```bash
cargo test --test performance --release
```

## デプロイメント

### Docker

```dockerfile
# Dockerfile使用
docker build -t cosmic-gardener-backend .
docker run -p 8080:8080 cosmic-gardener-backend
```

### Kubernetes

```bash
# Helm Chart使用
helm install cosmic-gardener ./charts/cosmic-gardener
```

### 本番環境での設定

本番環境では以下の環境変数を必ず設定：

- `JWT_SECRET`: 強力な秘密鍵
- `DATABASE_URL`: 本番データベースURL
- `REDIS_URL`: 本番RedisURL
- `RUST_LOG`: warnまたはerror

## 監視

### メトリクス

Prometheusメトリクスは `/metrics` エンドポイントで利用可能：

- `http_requests_total`: HTTPリクエスト数
- `physics_simulation_duration_seconds`: 物理シミュレーション時間
- `database_query_duration_seconds`: データベースクエリ時間
- `websocket_connections_active`: アクティブなWebSocket接続数

### ログ

構造化ログをJSON形式で出力：

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO",
  "message": "Server started",
  "fields": {
    "port": 8080,
    "workers": 4
  }
}
```

### 分散トレーシング

Jaegerを使用した分散トレーシング対応。

## 貢献

1. Forkしてfeatureブランチを作成
2. 変更を実装
3. テストを追加・実行
4. Pull Requestを作成

### コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## サポート

- **Issues**: [GitHub Issues](https://github.com/cosmic-gardener/backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cosmic-gardener/backend/discussions)
- **Email**: support@cosmic-gardener.com

## パフォーマンス目標

- **レスポンス時間**: 95%ile < 100ms
- **スループット**: 10,000 req/sec
- **物理シミュレーション**: 1,000天体で60FPS
- **WebSocket**: 10,000同時接続
- **可用性**: 99.9%

## ロードマップ

- [ ] GraphQL API対応
- [ ] マルチリージョン対応
- [ ] AI プレイヤー（NPC）
- [ ] リアルタイム協力モード
- [ ] VR/AR対応
- [ ] ブロックチェーン統合