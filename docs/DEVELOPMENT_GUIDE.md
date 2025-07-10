# Cosmic Gardener - 開発ガイド

## プロジェクト概要

Cosmic Gardenerは、宇宙の塵から星や生命を育てる3D宇宙シミュレーション・アイドルゲームです。

## 技術スタック

### フロントエンド
- **TypeScript** - 型安全なJavaScript
- **Three.js** - 3Dグラフィックス（WebGL）
- **ES6 Modules** - モジュラーアーキテクチャ
- **Web Audio API** - 空間オーディオ

### バックエンド（計画中）
- **Rust** - 高性能・安全なシステム言語
- **Actix Web** - 非同期Webフレームワーク
- **PostgreSQL** - PostGIS拡張による空間データ
- **Redis** - セッション・キャッシュ管理
- **WebSocket** - リアルタイム通信

### インフラ（計画中）
- **Amazon Lightsail** - VPSホスティング
- **Nginx** - リバースプロキシ・静的ファイル配信
- **Let's Encrypt** - SSL証明書

## 開発環境セットアップ

### 必要な環境
- **Node.js** 18以上
- **TypeScript** 4.5以上
- **Python** 3.8以上（開発サーバー用）

### クイックスタート

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd Space_Idle_Game
```

2. **フロントエンド開発環境起動**
```bash
cd cosmic-gardener/frontend
./start-server.bat       # Windows
# または
python -m http.server 8000

# ブラウザで http://localhost:8000 を開く
```

3. **TypeScriptコンパイル**
```bash
npx tsc                  # 一回のみ
npx tsc --watch          # 監視モード
```

## ディレクトリ構造

```
Space_Idle_Game/
├── cosmic-gardener/           # メインプロジェクト
│   ├── frontend/              # TypeScript/Three.js フロントエンド
│   │   ├── js/               # ゲームロジック
│   │   │   ├── resourceSystem.ts    # 資源システム
│   │   │   ├── conversionEngine.ts  # 変換エンジン
│   │   │   ├── productionUI.ts      # 生産UI
│   │   │   ├── main.ts              # メイン（エントリーポイント）
│   │   │   ├── state.ts             # ゲーム状態管理
│   │   │   ├── physics.ts           # 物理エンジン
│   │   │   ├── celestialBody.ts     # 天体システム
│   │   │   ├── ui.ts                # UI管理
│   │   │   └── sound.ts             # サウンドシステム
│   │   ├── icon/                    # リソースアイコン
│   │   ├── index.html               # メインHTML
│   │   ├── style.css                # スタイルシート
│   │   ├── start-server.bat         # 開発サーバー起動
│   │   └── tsconfig.json            # TypeScript設定
│   ├── backend/               # Rust製バックエンド（開発中）
│   ├── database/              # データベース設計
│   ├── docs/                  # プロジェクト固有ドキュメント
│   └── infra/                 # インフラ設定
├── docs/                      # プロジェクト全体のドキュメント
├── README.md                  # プロジェクト概要
└── LICENSE                    # ライセンス
```

## 開発ワークフロー

### 日常的な開発
1. TypeScriptファイルを編集
2. `npx tsc` でコンパイル（または `--watch` モードで自動コンパイル）
3. ブラウザでゲームをテスト
4. 変更をコミット

### 新機能開発
1. 機能仕様を検討
2. 関連するTypeScriptモジュールを特定
3. 型定義を追加/更新
4. 実装とテスト
5. UI統合（必要に応じて）

## アーキテクチャ概要

### ゲーム状態管理（state.ts）
- 中央集権的な状態管理
- localStorage自動保存
- 統計データ追跡

### 物理エンジン（physics.ts）
- N体重力シミュレーション
- 空間グリッド最適化
- オブジェクトプーリング

### 資源システム（resourceSystem.ts）
- 6基本資源 + 27高度資源
- 品質システム（5段階）
- 変換レシピとオートメーション

### 天体システム（celestialBody.ts）
- 階層構造（ブラックホール→星→惑星等）
- 生命進化シミュレーション
- 軌道力学

### UI システム（ui.ts）
- タブベースインターフェース
- 折りたたみセクション
- パフォーマンス最適化（更新頻度調整）

## パフォーマンス考慮事項

- UI更新は0.1秒間隔に制限
- オブジェクトプーリングによるメモリ管理
- 固定時間ステップ物理演算
- ダーティチェックによるDOM更新最小化

## コーディング規約

### TypeScript
- 厳密モード有効
- ES6モジュール使用
- インターフェース定義を活用
- async/await パターン推奨

### 命名規則
- **関数**: camelCase（例：`createCelestialBody`）
- **変数**: camelCase（例：`gameState`）
- **定数**: UPPER_SNAKE_CASE（例：`RESOURCE_TYPE`）
- **ファイル**: camelCase.ts（例：`resourceSystem.ts`）

### モジュール分割指針
- 機能別モジュール分割
- 循環依存の回避
- 明確な責務境界

## デバッグとテスト

### デバッグツール
- ブラウザ開発者ツール
- コンソールログ出力
- ゲーム内デバッグオプション

### テスト方針
- 手動テスト中心
- リグレッション防止重視
- パフォーマンステスト

## 既知の課題

1. **ES6モジュール要件**: ローカルHTTPサーバーが必要
2. **TypeScriptコンパイル**: 手動実行が必要
3. **マルチプレイヤー**: バックエンド実装待ち

## トラブルシューティング

### よくある問題

**Q: ゲームが読み込まれない**
A: HTTPサーバーが起動していることを確認。`file://` プロトコルではES6モジュールが動作しません。

**Q: TypeScriptエラーが発生**
A: `npx tsc` でコンパイル実行。エラーメッセージを確認して型定義を修正。

**Q: 音が出ない**
A: ブラウザの自動再生ポリシーにより、ユーザー操作が必要な場合があります。

## 貢献ガイドライン

1. 新機能は機能ブランチで開発
2. TypeScriptコンパイルエラーなし
3. 既存機能への影響確認
4. 適切なコミットメッセージ

## リソース

- [Three.js ドキュメント](https://threejs.org/docs/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/)
- [Actix Web ガイド](https://actix.rs/docs/)（バックエンド開発時）

## ライセンス

MIT License - 詳細は [LICENSE](../LICENSE) を参照