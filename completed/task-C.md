天体システム 
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

作業時間より質重視！