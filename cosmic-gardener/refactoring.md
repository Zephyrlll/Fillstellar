#  リファクタリング

## 🎨 Frontend リファクタリング

### Phase 1: 型定義整備 (60-90分)
**対象ファイル**: `types/`ディレクトリ新規作成
```typescript
// 新規作成・整備が必要なファイル
types/
├── game.d.ts           # GameState関連 (20分)
├── celestial.d.ts      # 天体関連 (20分)
├── ui.d.ts             # UI関連 (15分)
├── websocket.d.ts      # WebSocket関連 (15分)
└── three-extensions.d.ts # Three.js拡張 (10分)
```

**作業内容:**
- [ ] 全`any`型の具体化
- [ ] Union型での列挙値定義
- [ ] Three.jsオブジェクト拡張の型安全化
- [ ] null/undefined安全性の確保

### Phase 2: 状態管理リファクタリング 
**対象ファイル**: `state.ts`, `main.ts`
```typescript
// Before: グローバル変数
let gameState = { ... };

// After: 型安全な状態管理
class GameStateManager {
  private state: Readonly<GameState>;
  updateState(updater: StateUpdater<GameState>): void;
}
```

**作業内容:**
- [ ] Immutable状態管理への移行
- [ ] 型安全な状態更新システム
- [ ] 状態変更の一元化



### Phase 3: 天体システム 
**対象ファイル**: `celestialBody.ts`, `physics.ts`
```typescript
// 統一されたファクトリーパターン
class CelestialBodyFactory {
  static create(type: CelestialType, config: CelestialConfig): Result<CelestialBody, Error>
}
```

**作業内容:**
- [ ] ファクトリーパターンの導入
- [ ] 型安全なパラメータ検証
- [ ] エラーハンドリングの統一

### Phase 4: エラーハンドリング統一
**対象ファイル**: 全TypeScriptファイル
```typescript
// カスタムエラー型とResult型の導入
export type Result<T, E = GameError> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

## ⚙️ Backend リファクタリング

### Phase 1: 型定義とエラーハンドリング (60-90分)
**対象ファイル**: `src/errors/`, `src/models/`
```rust
// 統一エラーシステム
#[derive(Debug, thiserror::Error)]
pub enum GameError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    // ...
}

pub type Result<T> = std::result::Result<T, GameError>;
```

**作業内容:**
- [ ] エラー型の統一
- [ ] Result型の全面導入
- [ ] 適切なエラー伝播

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