# 🌌 Fillstellar (Cosmic Gardener) - AI開発ガイド

## 🎯 プロジェクト概要
宇宙の塵から始まり、星や生命を育てる3D宇宙シミュレーション・アイドルゲーム「Cosmic Gardener (Fillstellar)」の開発プロジェクト。

**技術スタック:**
- **Frontend**: TypeScript 5.8+ + Three.js + Vite (モダンビルドシステム)
- **Backend**: Rust (Axum) + PostgreSQL + WebSocket
- **テスト**: Vitest (ユニット) + Playwright (E2E)
- **コード品質**: ESLint + Prettier + Git hooks

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

## 🏗️ **プロジェクト構造**

### 全体アーキテクチャ
```
Fillstellar/
├── cosmic-gardener/                    # メインプロジェクト
│   ├── frontend/                      # TypeScript/Three.js フロントエンド
│   │   ├── js/                       # ゲームロジック (TypeScript)
│   │   │   ├── main.ts              # エントリーポイント
│   │   │   ├── state.ts             # 状態管理
│   │   │   ├── physics.ts           # 物理演算エンジン
│   │   │   ├── celestialBody.ts     # 天体システム
│   │   │   ├── resourceSystem.ts    # 資源システム
│   │   │   ├── conversionEngine.ts  # 変換エンジン
│   │   │   ├── ui.ts                # UIシステム
│   │   │   └── types/               # TypeScript型定義
│   │   ├── tests/                   # テストファイル
│   │   ├── vite.config.ts           # Vite設定
│   │   ├── package.json             # 依存関係
│   │   └── ...                      # 設定ファイル群
│   ├── backend/                     # Rust製バックエンド (Axum)
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── handlers/            # APIハンドラー
│   │   │   ├── models/              # データモデル
│   │   │   ├── services/            # ビジネスロジック
│   │   │   └── errors/              # エラー処理
│   │   └── Cargo.toml
│   └── database/                    # PostgreSQLスキーマ
├── CLAUDE.md                        # このファイル (AI開発ガイド)
├── README.md                        # プロジェクト概要
└── プロジェクト進化ロードマップ.md      # 将来計画
```

### 🚀 モダン開発環境 (Phase 1完了)
```bash
# 開発サーバー起動（最重要コマンド）
cd cosmic-gardener/frontend
npm run dev              # Viteで即座にホットリロード開始

# その他の重要コマンド
npm run build           # プロダクションビルド
npm run test            # Vitestでユニットテスト
npm run lint            # ESLintでコード品質チェック
npm run format          # Prettierでコードフォーマット
```

### 重要な型定義
```typescript
// ゲーム状態 (state.ts)
interface GameState {
  celestialBodies: CelestialBody[];       # 天体配列
  resources: {                           # 6種類の基本資源
    cosmicDust: number;
    energy: number;
    organicMatter: number;
    biomass: number;
    darkMatter: number;
    thoughtPoints: number;
  };
  research: ResearchState;               # 研究進捗
  statistics: StatisticsData;            # 統計データ
  saveVersion: string;                   # セーブバージョン
}

// 天体オブジェクト (celestialBody.ts)
interface CelestialBody extends THREE.Mesh {
  userData: {
    id: string;
    type: 'star' | 'planet' | 'moon' | 'asteroid' | 'black_hole' | 'comet';
    mass: number;
    velocity: THREE.Vector3;
    lifeStage?: 'microbial' | 'plant' | 'animal' | 'intelligent';
    createdAt: number;
  };
}

// 資源システム (resourceSystem.ts)
interface Resource {
  id: string;
  name: string;
  amount: number;
  rate: number;                          # 生成レート
  quality: 'poor' | 'standard' | 'high' | 'perfect' | 'legendary';
}
```

## 🎮 **ゲームシステム詳細**

### 1. 天体管理システム (`celestialBody.ts`)
- **天体創造**: 小惑星 → 彗星 → 惑星 → 恒星 → ブラックホール
- **N体物理演算**: リアルタイム重力シミュレーション (`physics.ts`)
- **生命進化**: 微生物 → 植物 → 動物 → 知的生命
- **軌道力学**: 楕円軌道、安定性判定、衝突検出

### 2. 高度な資源システム (`resourceSystem.ts`, `conversionEngine.ts`)
- **基本資源**: 宇宙の塵、エネルギー、有機物、バイオマス、ダークマター、思考ポイント
- **派生資源**: 各基本資源の4つのサブタイプ（30種類以上）
- **品質システム**: 粗悪(50%) → 標準(100%) → 高品質(150%) → 完璧(200%) → 伝説(300%)
- **変換エンジン**: 20種類以上の変換レシピと自動化システム

### 3. パフォーマンス最適化
- **オブジェクトプーリング**: `utils.ts`のVectorPool
- **UIスロットリング**: 0.1秒間隔での更新
- **Fixed Timestep**: 安定した物理演算
- **空間グリッド**: 効率的な衝突判定

### 4. WebSocket通信 (バックエンド統合用)
- **リアルタイム同期**: ゲーム状態の双方向同期
- **楽観的更新**: レスポンシブなUX
- **エラーリカバリ**: 接続断時の自動復旧

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

## 🎯 **現在の開発状況 (2025年1月17日)**

### ✅ 完了済み - Phase 1: 開発環境現代化
- **Vite.js ビルドシステム**: ホットリロード対応
- **TypeScript 5.8**: 厳格な型チェック
- **ESLint + Prettier**: 自動コード品質管理
- **Vitest + Playwright**: テスト環境構築
- **モダンワークフロー**: `npm run dev` だけで開発開始

### 🚧 現在の開発フェーズ: フロントエンド機能強化
1. **Phase 2**: UX革命 (モバイル対応、現代的UI)
2. **Phase 3**: ゲームプレイ拡張 (セーブシステム、実績)
3. **Phase 4**: 自動化システム (将来)
4. **バックエンド統合**: Phase 3完了後に実装予定

### 開発優先順位
1. **型安全性 > 機能追加** - any使用率 < 1%
2. **パフォーマンス維持** - 60fps維持
3. **コード品質** - ESLint/Prettier準拠
4. **テストカバレッジ** - > 80%
5. **可読性 > 簡潔性**

## 🚀 **AI指示テンプレート集**

### 新機能実装テンプレート
```
このプロジェクトのCLAUDE.md規約に従って[機能名]を実装してください：

## 要件
- [具体的な要件]

## 開発環境
- cosmic-gardener/frontend/ ディレクトリで作業
- npm run dev でVite開発サーバーを使用
- js/ ディレクトリ内のTypeScriptファイルを編集

## 必須チェック項目
- [ ] 型安全性（any使用禁止）
- [ ] エラーハンドリング
- [ ] null安全チェック  
- [ ] 統一ログ形式 [MODULE] message
- [ ] ESLint/Prettier準拠
- [ ] @/ パスエイリアス使用

## 期待する実装
```typescript
[期待する関数シグネチャやインターフェース]
```

## テスト要件
- tests/ ディレクトリにVitest用テストファイル作成
- npm run test で実行確認
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

## 💡 **AI開発協働のベストプラクティス**

### 効果的な指示の出し方
1. **「Fillstellar/CLAUDE.md規約に従って」** を毎回明示
2. **作業ディレクトリを明確に**: `cosmic-gardener/frontend/` または `cosmic-gardener/backend/`
3. **完全なエラーログをコピペ**: ファイル名、行番号含む
4. **関連型定義を一緒に提示**: インターフェースや型情報
5. **期待する結果を具体的に**: 関数シグネチャ、期待する動作

### モダン開発環境の活用
1. **開発開始**: `npm run dev` で即座にホットリロード環境
2. **コード品質**: `npm run lint && npm run format` で自動修正
3. **テスト**: `npm run test` で継続的品質確保
4. **パスエイリアス**: `@/` でクリーンなインポート
5. **型安全性**: TypeScript strictモード活用

### 品質指標目標
- **型安全性**: any使用率 < 1%
- **エラーハンドリング**: カバー率 > 95%
- **コード品質**: ESLint準拠率 100%
- **テストカバレッジ**: > 80%
- **パフォーマンス**: 60fps維持

---

**重要**: このガイドは生きた文書です。プロジェクトの成長と共に更新し、常に最新の開発方針を反映してください。