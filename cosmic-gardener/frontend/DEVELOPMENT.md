# 開発ガイド - Cosmic Gardener Frontend

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 18以上
- npm 9以上

### 初回セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/Zephyrlll/Space_Idle_Game.git
cd Space_Idle_Game/cosmic-gardener/frontend

# 依存関係のインストール
npm install

# Git hooksのセットアップ（自動フォーマット用）
npm run prepare

# 開発サーバーの起動
npm run dev
```

## 🛠️ 開発ワークフロー

### 1. コード編集
- VSCode推奨（拡張機能: ESLint, Prettier, TypeScript）
- ファイル保存時に自動的にホットリロード
- TypeScriptのパスエイリアス: `@/` → `js/`

### 2. コード品質の維持

```bash
# TypeScript型チェック
npm run typecheck

# ESLintによるコード品質チェック
npm run lint

# Prettierによるコードフォーマット
npm run format

# すべてのチェックを実行
npm run lint && npm run typecheck && npm run format:check
```

### 3. テストの実行

```bash
# ユニットテスト
npm run test

# テストUI（ブラウザで結果確認）
npm run test:ui

# カバレッジレポート付きテスト
npm run test -- --coverage

# E2Eテスト
npm run test:e2e
```

### 4. ビルドとデプロイ

```bash
# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# ビルドサイズの確認
npx vite-bundle-visualizer
```

## 📂 プロジェクト構造

```
frontend/
├── js/                    # TypeScriptソースコード
│   ├── main.ts           # エントリーポイント
│   ├── state.ts          # 状態管理
│   ├── physics.ts        # 物理演算
│   ├── celestialBody.ts  # 天体システム
│   ├── ui.ts             # UIコンポーネント
│   └── types/            # 型定義
├── tests/                 # テストファイル
│   ├── unit/             # ユニットテスト
│   └── e2e/              # E2Eテスト
├── dist/                  # ビルド出力（gitignore）
├── vite.config.ts         # Vite設定
├── tsconfig.json          # TypeScript設定
├── .eslintrc.json         # ESLint設定
└── .prettierrc            # Prettier設定
```

## 🔧 設定ファイル

### Vite設定 (`vite.config.ts`)
- ポート: 8000
- ホットリロード有効
- Three.jsの最適化
- コード分割設定

### TypeScript設定 (`tsconfig.json`)
- Strict mode有効
- パスエイリアス設定
- ES modules対応

### ESLint設定 (`.eslintrc.json`)
- TypeScript推奨ルール
- import順序の自動整理
- 未使用変数の検出

### Prettier設定 (`.prettierrc`)
- シングルクォート使用
- セミコロン必須
- 行幅: 100文字

## 🐛 トラブルシューティング

### npm installが失敗する
```bash
# キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Viteが起動しない
```bash
# ポートが使用中の場合
npx kill-port 8000
npm run dev
```

### TypeScriptエラーが出る
```bash
# 型定義の再インストール
npm install --save-dev @types/three @types/node
npm run typecheck
```

### ESLintエラーの自動修正
```bash
npm run lint:fix
```

## 💡 開発のヒント

### パフォーマンス最適化
1. **オブジェクトプーリング**: `utils.ts`の`VectorPool`を活用
2. **UIアップデート**: 0.1秒間隔でスロットリング
3. **物理演算**: Fixed timestepで安定化

### Three.jsの使用
1. **メモリリーク防止**: 不要なオブジェクトは必ず`dispose()`
2. **テクスチャ最適化**: 適切なサイズとフォーマット使用
3. **レンダリング最適化**: LODシステムの活用

### 状態管理
1. **イミュータブル更新**: `gameStateManager`を使用
2. **バッチ更新**: 複数の状態変更をまとめて実行
3. **ローカルストレージ**: 自動保存機能の活用

## 📚 参考資料

- [Vite公式ドキュメント](https://vitejs.dev/)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [Three.js公式ドキュメント](https://threejs.org/docs/)
- [Vitest公式ドキュメント](https://vitest.dev/)
- [Playwright公式ドキュメント](https://playwright.dev/)

## 🤝 コントリビューション

1. featureブランチを作成
2. コードを変更（テスト追加も忘れずに）
3. `npm run lint && npm run test`でチェック
4. コミット（自動フォーマット適用）
5. プルリクエストを作成