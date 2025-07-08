# API ドキュメント ガイド

Cosmic Gardener API のドキュメントの使用方法と開発者向けの情報です。

## 📖 ドキュメントの種類

### 1. Swagger UI（推奨）
**URL**: `http://localhost:8080/swagger-ui/`

**特徴:**
- インタラクティブなAPI探索
- リアルタイムでAPIテスト可能
- 自動生成されたサンプルリクエスト
- レスポンススキーマの詳細表示

**使用方法:**
1. サーバーを起動: `cargo run`
2. ブラウザで `http://localhost:8080/swagger-ui/` にアクセス
3. 「Try it out」ボタンでAPIを直接テスト

### 2. OpenAPI JSON仕様
**URL**: `http://localhost:8080/api-docs/openapi.json`

**用途:**
- API仕様の機械可読形式
- コード生成ツールでの利用
- 他のドキュメント生成ツールとの連携

### 3. README.md
**場所**: `backend/README.md`

**内容:**
- API概要とクイックスタート
- 主要エンドポイント一覧
- 認証方法の説明
- curlでの使用例

### 4. エラーコード一覧
**場所**: `backend/docs/error-codes.md`

**内容:**
- 全エラーコードの詳細説明
- 各エラーの対処方法
- トラブルシューティング

### 5. Postmanコレクション
**場所**: `backend/docs/Cosmic_Gardener_API.postman_collection.json`

**用途:**
- Postmanでの即座にAPIテスト
- チーム間での API 仕様共有
- 自動テストの実行

## 🚀 クイックスタート

### 1. Swagger UIでAPIを探索

```bash
# サーバー起動
cd cosmic-gardener/backend
cargo run

# ブラウザでアクセス
open http://localhost:8080/swagger-ui/
```

### 2. Postmanでテスト

1. Postmanを開く
2. Import → File → `docs/Cosmic_Gardener_API.postman_collection.json`
3. Environment → Import → `docs/Cosmic_Gardener_API.postman_environment.json`
4. 「User Registration」→「User Login」の順で実行
5. 他のAPIをテスト

### 3. curlでテスト

```bash
# 1. ユーザー登録
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "test_user",
    "password": "test_password_123"
  }'

# 2. ログイン（アクセストークン取得）
ACCESS_TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test_password_123"
  }' | jq -r '.access_token')

# 3. 認証が必要なAPIを呼び出し
curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## 🔧 開発者向け情報

### ドキュメントの更新

#### 1. エンドポイントの追加

新しいエンドポイントを追加する場合：

```rust
/// エンドポイントの説明
#[utoipa::path(
    post,
    path = "/api/new/endpoint",
    tag = "new",
    summary = "新しいエンドポイント",
    description = "詳細な説明",
    request_body(
        content = RequestType,
        description = "リクエストの説明"
    ),
    responses(
        (status = 200, description = "成功", body = ResponseType),
        (status = 400, description = "バリデーションエラー", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn new_endpoint() -> Result<HttpResponse> {
    // 実装
}
```

#### 2. スキーマの追加

新しいデータ構造を追加する場合：

```rust
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(
    description = "データ構造の説明",
    example = json!({
        "field": "example_value"
    })
)]
pub struct NewStruct {
    #[schema(description = "フィールドの説明")]
    pub field: String,
}
```

#### 3. APIDoc の更新

`src/docs/mod.rs` の `ApiDoc` に追加：

```rust
#[derive(OpenApi)]
#[openapi(
    paths(
        // 既存のパス...
        new_endpoint,  // 新しいエンドポイントを追加
    ),
    components(
        schemas(
            // 既存のスキーマ...
            NewStruct,  // 新しいスキーマを追加
        )
    ),
    // その他の設定...
)]
pub struct ApiDoc;
```

### ベストプラクティス

#### 1. 説明の書き方

```rust
/// 短い概要（1行）
/// 
/// より詳しい説明をここに書く。
/// 複数行にわたって詳細を説明できる。
/// 
/// ## 使用例
/// 具体的な使用例を示す
/// 
/// ## 注意事項
/// 重要な注意点があれば記載
#[utoipa::path(
    // path設定...
)]
```

#### 2. レスポンス例の設定

```rust
#[schema(
    example = json!({
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Example Name",
        "created_at": "2024-01-01T00:00:00Z"
    })
)]
```

#### 3. バリデーションの文書化

```rust
#[validate(length(min = 3, max = 50))]
#[schema(
    description = "ユーザー名（3-50文字）",
    min_length = 3,
    max_length = 50,
    pattern = "^[a-zA-Z0-9_]+$"
)]
pub username: String,
```

### 自動生成の仕組み

1. **utoipa**: RustのコードからOpenAPI仕様を生成
2. **utoipa-swagger-ui**: Swagger UIの埋め込み
3. **マクロ**: `#[utoipa::path]` と `#[derive(ToSchema)]`で自動文書化

### デプロイ時の考慮事項

#### 本番環境
- Swagger UIを無効化する場合がある
- OpenAPI JSONは公開可能
- セキュリティ情報の漏洩に注意

#### 設定例
```rust
#[cfg(debug_assertions)]
{
    // 開発環境のみSwagger UIを有効化
    app = app.service(SwaggerUi::new("/swagger-ui/{_:.*}"));
}
```

## 📊 メトリクス

### ドキュメントの品質指標

- **カバレッジ**: 全エンドポイントが文書化されているか
- **正確性**: 実装とドキュメントが一致しているか
- **使いやすさ**: 例や説明が十分か

### 自動チェック

```bash
# スキーマの検証
cargo test --test api_documentation_tests

# OpenAPI仕様の妥当性チェック
npx @apidevtools/swagger-parser validate docs/openapi.json
```

## 🤝 チーム協力

### ドキュメント更新フロー

1. 機能実装
2. utoipa属性の追加
3. 例とテストの更新
4. Postmanコレクションの更新
5. README.mdの必要に応じた更新

### レビューポイント

- [ ] 新しいエンドポイントが文書化されている
- [ ] エラーレスポンスが適切に定義されている
- [ ] 例が実用的で理解しやすい
- [ ] セキュリティ要件が明記されている

## 🛠️ トラブルシューティング

### よくある問題

#### 1. Swagger UIでエラーが表示される
```bash
# サーバーログを確認
cargo run 2>&1 | grep -i error

# OpenAPI仕様の妥当性をチェック
curl http://localhost:8080/api-docs/openapi.json | jq .
```

#### 2. スキーマが表示されない
- `#[derive(ToSchema)]` が追加されているか確認
- `ApiDoc` の `components.schemas` に追加されているか確認

#### 3. 認証が動作しない
- `security` フィールドが正しく設定されているか確認
- JWTトークンが有効か確認

### デバッグ方法

```bash
# 詳細ログの有効化
RUST_LOG=debug cargo run

# OpenAPI仕様の出力
curl -s http://localhost:8080/api-docs/openapi.json | jq . > openapi_debug.json
```

## 📝 関連リソース

- [utoipa Documentation](https://docs.rs/utoipa/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)
- [Postman Documentation](https://learning.postman.com/docs/)