エラーハンドリング統一
**対象ファイル**: 全TypeScriptファイル
```typescript
// カスタムエラー型とResult型の導入
export type Result<T, E = GameError> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

作業時間より質重視！