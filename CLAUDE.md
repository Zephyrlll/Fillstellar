# 🌌 Fillstellar - AI開発ガイド

## 🎯 プロジェクト概要
宇宙シミュレーションゲーム「Fillstellar」の開発プロジェクト。
TypeScript + Three.js (Frontend) + Rust + PostgreSQL (Backend)

## 🚨 **必須守則（AI指示時は常に適用）**

### 1. 型安全性最優先
```typescript
// ✅ 必須
function createStar(position: Vector3, mass: number): CelestialBody | null
// ❌ 禁止
function createStar(data: any): any
```

### 2. エラーハンドリング必須
```typescript
// ✅ 必須パターン
try {
  const result = riskyOperation();
  return result;
} catch (error) {
  console.error('[CONTEXT] Operation failed:', error);
  return null; // または適切なフォールバック
}
```

### 3. null安全チェック
```typescript
// ✅ 必須
const body = gameState.stars.find(s => s.id === id);
if (!body) {
  console.warn('[GAME] CelestialBody not found:', id);
  return null;
}
```

### 4. 統一ログ形式
```typescript
console.log('[CONTEXT] message', data);
console.error('[CONTEXT] error:', error);
console.warn('[CONTEXT] warning:', warning);
```

## 🏗️ **アーキテクチャ**

### Frontend構造
```
src/frontend/
├── types/           # 型定義（最重要）
├── engine/          # ゲームエンジン
├── ui/              # UIシステム  
└── utils/           # ユーティリティ
```

### 重要な型定義
```typescript
interface GameState {
  stars: CelestialBody[];
  cosmicDust: number;
  energy: number;
  // ...
}

interface CelestialBody extends THREE.Mesh {
  userData: {
    id: string;
    type: 'star' | 'planet' | 'asteroid' | 'black_hole';
    mass: number;
    velocity: Vector3;
  };
}
```

### Backend構造
```
src/backend/
├── handlers/        # APIエンドポイント
├── services/        # ビジネスロジック
├── models/          # データモデル
└── game/           # ゲームロジック
```

## 🎮 **主要システム**

### 1. 天体管理システム
- 天体の作成・削除・更新
- 物理演算（重力、衝突）
- 3D描画とアニメーション

### 2. リソース管理
- 6種類のリソース（塵、エネルギー、有機物、バイオマス、ダークマター、思考ポイント）
- リアルタイム生成・消費
- バランス調整

### 3. WebSocket通信
- フロント⇔バック間のリアルタイム同期
- 楽観的更新による UX向上

## 📋 **AI実装指示ルール**

### コード生成時の必須チェック
1. **型定義は明確か？**
2. **エラーハンドリングはあるか？**
3. **null/undefinedチェックはあるか？**
4. **ログ出力は統一形式か？**
5. **命名規約に従っているか？**

### 関数設計原則
```typescript
// ✅ 理想的な関数
function processGameAction(
  action: GameAction,
  currentState: GameState
): Result<GameState, GameError> {
  // 1. 入力検証
  if (!isValidAction(action)) {
    return Err(new GameError('INVALID_ACTION', 'Action validation failed'));
  }
  
  try {
    // 2. 処理実行
    const newState = applyAction(action, currentState);
    
    // 3. ログ出力
    console.log('[GAME] Action processed:', action.type);
    
    return Ok(newState);
  } catch (error) {
    console.error('[GAME] Action processing failed:', error);
    return Err(new GameError('PROCESSING_FAILED', error.message));
  }
}
```

## 🔄 **WebSocket メッセージ形式**

```typescript
interface WSMessage<T = unknown> {
  type: MessageType;
  timestamp: number;
  requestId?: string;
  data: T;
}

// 使用例
const message: WSMessage<CreateStarRequest> = {
  type: 'CREATE_CELESTIAL_BODY',
  timestamp: Date.now(),
  requestId: crypto.randomUUID(),
  data: { type: 'star', position: [0, 0, 0], mass: 1.989e30 }
};
```

## 🐛 **デバッグ支援**

### エラー報告時に必要な情報
1. **ファイル名と行番号**
2. **完全なエラーメッセージ**
3. **実行コンテキスト**（どの機能実行中か）
4. **関連する型定義**

### トラブルシューティング用ログ
```typescript
// 問題調査用の詳細ログ
function debugLog(category: string, message: string, data?: any) {
  if (DEBUG_MODE) {
    console.log(`[DEBUG:${category}] ${message}`, data);
  }
}
```

## 🎯 **開発優先順位**

### 現在の開発フェーズ: バックエンド統合
1. **WebSocket実装完了** (TODO削除)
2. **フロント⇔バック連携**
3. **エラー修正** (カメラバグ等)
4. **ゲームバランス調整**

### コード品質重視項目
1. 型安全性 > 機能追加
2. エラーハンドリング > パフォーマンス  
3. 可読性 > 簡潔性

## 🚀 **AI指示テンプレート集**

### 新機能実装
```
この規約に従って[機能名]を実装してください：

## 要件
- [具体的な要件]

## 必須チェック項目
- [ ] 型安全性（any禁止）
- [ ] エラーハンドリング
- [ ] null安全チェック  
- [ ] 統一ログ形式
- [ ] 命名規約準拠

## 期待する形
```typescript
[期待する関数シグネチャ]
```
```

### コードレビュー
```
以下のコードをCLAUDE.mdの規約でレビューし、問題があれば修正版を提示してください：

[コードを貼付]

特に以下をチェック：
- 型安全性
- エラーハンドリング
- null安全性
- ログ形式
```

### バグ修正
```
以下のエラーを規約に従って修正してください：

**エラー内容:**
[完全なエラーメッセージ]

**関連コード:**
[問題のあるコード]

**期待する動作:**
[期待する動作]
```

## 💡 **AIとの協働のコツ**

1. **「規約に従って」** を毎回明示
2. **具体的なコンテキスト** を提供
3. **完全なエラーログ** をコピペ
4. **関連型定義** を一緒に提示
5. **期待する結果** を明確に

## 📊 **品質指標**

- **型安全性**: any使用率 < 1%
- **エラーハンドリング**: カバー率 > 95%
- **命名規約**: 準拠率 100%
- **テストカバレッジ**: > 80%

---

**重要**: このガイドは生きた文書です。プロジェクトの成長と共に更新し、常に最新の開発方針を反映してください。