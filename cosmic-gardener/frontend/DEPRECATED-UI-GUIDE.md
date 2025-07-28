# ⚠️ 廃止予定UI要素ガイド

## 🚨 重要：新規開発者の方へ

このプロジェクトは**デュアルビューシステム**への移行中です。  
以下の要素は**使用しないでください**：

### ❌ 使用禁止の要素

| 要素ID/クラス | 状態 | 代替 |
|--------------|------|------|
| `#ui-area` | 削除済み | デュアルビューシステム |
| `#tab-buttons` | 削除済み | TabManager (`tabManager.ts`) |
| `.tab-content` | 削除済み | view-content クラス |
| `#floating-controls` | 非表示 | デュアルビュー内に統合 |
| `#game-container-legacy` | 削除予定 | `#game-container` |

### ✅ 現在使用中の要素

| 要素ID | 用途 | ファイル |
|--------|------|----------|
| `#game-container` | メインゲームビュー | `dualViewSystem.ts` |
| `#dual-view-container` | デュアルビューコンテナ | `dualViewSystem.ts` |
| `#primary-view` | プライマリビュー | `dualViewSystem.ts` |

### 🔍 混乱しやすいポイント

1. **天体数表示**
   - ❌ 旧: `#celestialBodyCount` 
   - ✅ 新: スタッツパネル内で管理

2. **タブシステム**
   - ❌ 旧: `switchTab()` 関数
   - ✅ 新: `tabManager.activateTab()`

3. **フローティングボタン**
   - ❌ 旧: `#floating-controls` 内のボタン
   - ✅ 新: デュアルビューのツールバー

### 📝 移行状況

- **2025年1月**: 旧UIシステムを`display: none`で非表示化 ✅
- **2025年2月**: `legacy-ui.css`を削除予定
- **2025年3月**: 残存する旧HTML要素を完全削除予定

### 🚀 新規機能の追加方法

```typescript
// ❌ 間違い：旧UIシステムに追加
document.getElementById('ui-area')?.appendChild(newElement);

// ✅ 正解：デュアルビューシステムを使用
import { dualViewSystem } from './systems/dualViewSystem.js';
// 適切なビューコンテナに追加
```

### 💡 デバッグ時の注意

URLに`?legacy=true`を追加すると旧UIスタイルが読み込まれますが、  
これは**デバッグ専用**です。本番環境では使用しないでください。

---

最終更新: 2025年1月