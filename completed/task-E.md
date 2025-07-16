型定義とエラーハンドリング 
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

作業時間より質重視！