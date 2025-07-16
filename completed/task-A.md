型定義整備

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


作業時間より質重視！