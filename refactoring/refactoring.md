#  リファクタリング

## 🎨 Frontend リファクタリング



### Phase 2: 

### Phase 3:

### Phase 4: 

## ⚙️ Backend リファクタリング

### Phase 1: 

### Phase 2: API層の型安全化 
**対象ファイル**: `src/handlers/`, `src/routes/`
```rust
// 型安全なAPIハンドラー
#[utoipa::path(
    post,
    path = "/api/celestial-bodies",
    request_body = CreateCelestialBodyRequest,
    responses(
        (status = 201, description = "Created", body = CelestialBody),
        (status = 400, description = "Bad Request", body = ErrorResponse)
    )
)]
pub async fn create_celestial_body(
    req: web::Json<CreateCelestialBodyRequest>,
) -> Result<HttpResponse> {
    // 型安全な実装
}
```

**作業内容:**
- [ ] リクエスト/レスポンス型の厳密化
- [ ] バリデーションロジックの統一
- [ ] OpenAPI仕様の完全対応

### Phase 3: データベース層 
**対象ファイル**: `src/models/`, `src/services/`
```rust
// 型安全なデータベース操作
impl CelestialBodyRepository {
    async fn create(&self, body: &CreateCelestialBodyRequest) -> Result<CelestialBody> {
        // 型安全なクエリ実装
    }
}
```

**作業内容:**
- [ ] SQLクエリの型安全化
- [ ] リポジトリパターンの統一
- [ ] トランザクション管理の改善

### Phase 4: WebSocket層 
**対象ファイル**: `src/handlers/websocket.rs`
```rust
// 型安全なWebSocketメッセージ
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    GameStateUpdate(GameStateUpdate),
    CreateCelestialBody(CreateCelestialBodyRequest),
    Error(ErrorResponse),
}

統一するポイント：
- Result型の使用
- エラーハンドリング
- ログ出力形式」
```

## 🚨 リスク要因と対策

### 主要リスク
1. **Three.js型定義の複雑さ** → 段階的アプローチ
2. **WebSocket型の不整合** → フロント・バック同時修正
3. **既存バグの顕在化** → 最低限の修正に留める
4. **テストの破綻** → 各段階で動作確認


### 理想開発効率向上
- **AIコード生成品質**: 50% → 90%
- **デバッグ時間**: 50%削減
- **新機能追加速度**: 2-3倍向上

### 理想技術的安定性
- **Runtime Error**: 80%削減
- **型エラー**: 95%削減
- **保守性**: 大幅向上

---

**絶対**: 時間より質を求めて！！僕は無限に待つ