# Cosmic Gardener (Fillstellar)

宇宙の塵から始まり、星や生命を育てる3D宇宙シミュレーション・アイドルゲーム

## 🌟 特徴

- **3D宇宙シミュレーション**: Three.jsを使用したリアルタイム3D物理エンジン
- **高度な資源システム**: 6つの基本資源と30種類以上の派生資源
- **品質システム**: 粗悪〜伝説まで5段階の品質とビジュアルエフェクト
- **資源変換エンジン**: 20種類以上の変換レシピと自動化システム
- **生命進化**: 微生物→植物→動物→知的生命の進化シミュレーション
- **パフォーマンス最適化**: オブジェクトプーリング、Fixed Timestep物理演算
- **マルチプレイヤー対応**: Rust製バックエンド（Axum）によるWebSocketリアルタイム同期
- **銀河マップ**: インタラクティブな3D銀河ビュー
- **モバイル対応**: タッチ操作とレスポンシブUI

## 🚀 クイックスタート

### フロントエンド（シングルプレイヤー）

```bash
cd cosmic-gardener/frontend
npm install              # 依存関係のインストール
npm run build           # TypeScriptのビルド

# 開発サーバー起動
npm run serve           # または ./起動.bat (Windows)
# または
python -m http.server 8000

# ブラウザで http://localhost:8000 を開く
```

### フルスタック（マルチプレイヤー）

```bash
# Dockerを使用
cd cosmic-gardener
make dev                 # Docker環境での開発

# ローカル開発
cd cosmic-gardener/backend
cargo run               # バックエンド起動

# 別ターミナルで
cd cosmic-gardener/frontend
npm run serve           # フロントエンド起動
```

## 📁 プロジェクト構造

```
Fillstellar/
├── cosmic-gardener/           # メインプロジェクト
│   ├── frontend/              # TypeScript/Three.js フロントエンド
│   │   ├── js/               # ゲームロジック (TypeScript)
│   │   │   ├── main.ts              # エントリーポイント
│   │   │   ├── state.ts             # 状態管理
│   │   │   ├── physics.ts           # 物理演算エンジン
│   │   │   ├── celestialBody.ts     # 天体システム
│   │   │   ├── resourceSystem.ts    # 資源システム
│   │   │   ├── conversionEngine.ts  # 変換エンジン
│   │   │   ├── productionUI.ts      # 生産UI
│   │   │   ├── ui.ts                # UIシステム
│   │   │   └── types/               # TypeScript型定義
│   │   ├── icon/              # アイコンアセット
│   │   ├── index.html
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backend/               # Rust製バックエンド (Axum)
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── handlers/      # APIハンドラー
│   │   │   ├── models/        # データモデル
│   │   │   ├── services/      # ビジネスロジック
│   │   │   └── errors/        # エラー処理
│   │   ├── Cargo.toml
│   │   └── Dockerfile
│   ├── database/              # PostgreSQLスキーマ
│   ├── docs/                  # プロジェクトドキュメント
│   └── infra/                 # インフラ設定 (Terraform)
├── CLAUDE.md                  # AI開発ガイド
└── README.md                  # このファイル
```

## 🎮 ゲームプレイ

### 基本サイクル
1. **宇宙の塵**を収集
2. **エネルギー**を使って資源を変換
3. **高度な資源**を生産
4. **天体**を創造して宇宙を拡張
5. **生命**を育てて思考ポイントを獲得

### 資源システム
- **基本資源**: 宇宙の塵、エネルギー、有機物、バイオマス、ダークマター、思考ポイント
- **派生資源**: 各基本資源の4つのサブタイプ
  - 塵: 鉄質塵、炭素塵、珪素塵、希土類塵
  - エネルギー: 熱エネルギー、電気エネルギー、核エネルギー、量子エネルギー
  - 有機物: 単純有機物、複合有機物、生体分子、遺伝物質
- **加工資源**: 加工金属、シリコン、合金、ナノマテリアル、バイオ材料
- **品質システム**: 
  - 粗悪 (50% 効率) - グレー
  - 標準 (100% 効率) - 白
  - 高品質 (150% 効率) - 緑
  - 完璧 (200% 効率) - 青
  - 伝説 (300% 効率) - 金色 + パーティクルエフェクト

### 変換レシピ例
- 宇宙の塵 + エネルギー → 加工金属
- 炭素塵 + 有機物 + エネルギー → 複合有機物
- 電気エネルギー + 加工金属 → 核エネルギー
- 珪素塵 + 電気エネルギー → シリコン
- 生体分子 + 量子エネルギー → 遺伝物質

## 🛠️ 開発

### 必要な環境
- **フロントエンド**: Node.js 18+, TypeScript 4.5+
- **バックエンド**: Rust 1.70+, PostgreSQL 15+, Redis 6+

### 開発コマンド

```bash
# フロントエンド
cd cosmic-gardener/frontend
npm install              # 依存関係インストール
npm run build           # TypeScriptビルド
npm run watch           # ファイル監視モード
npm run serve           # 開発サーバー起動

# バックエンド
cd cosmic-gardener/backend
cargo build             # デバッグビルド
cargo run              # 開発サーバー起動
cargo test             # テスト実行
cargo build --release  # リリースビルド

# Docker開発環境
cd cosmic-gardener
make dev               # 全スタック起動
make test              # テスト実行
make logs              # ログ確認
make deploy-staging    # ステージング環境デプロイ
```

## 📊 技術スタック

### フロントエンド
- **TypeScript** - 型安全なJavaScript
- **Three.js** - 3Dグラフィックス
- **ES6 Modules** - モジュラーアーキテクチャ
- **Web Audio API** - 空間オーディオ

### バックエンド
- **Rust** - 高性能・安全なシステム言語
- **Axum** - 非同期Webフレームワーク
- **PostgreSQL** - ゲーム状態とユーザーデータ
- **Redis** - セッション・キャッシュ管理
- **WebSocket** - リアルタイム通信
- **JWT** - 認証トークン

### インフラ
- **Docker** - コンテナ化
- **Terraform** - インフラ管理
- **Grafana/Prometheus** - 監視・メトリクス

## 📈 ロードマップ

### Phase 1: 基本システム ✅
- 基本的な資源システム
- 天体創造と物理シミュレーション
- 生命進化システム
- セーブ/ロード機能

### Phase 2: 高度な資源システム ✅
- 資源細分化（30種類以上）
- 品質システム（5段階）
- 変換エンジンと生産チェーン
- 視覚エフェクトとパーティクルシステム
- パフォーマンス最適化

### Phase 3: マルチプレイヤー 🚧
- Rust/Axumバックエンド実装
- WebSocketリアルタイム同期
- ユーザー認証（JWT）
- プレイヤー間取引
- 協力・競争要素

### Phase 4: 高度な機能 📋
- 銀河マップの拡張
- 地域特性システム
- 希少資源とイベント
- 実績システム
- モバイルアプリ版

## 🤝 コントリビューション

1. Fork このリポジトリ
2. Feature ブランチを作成
3. 変更をコミット
4. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

## 🙏 謝辞

- **Three.js** - 3Dグラフィックスライブラリ
- **Rust Community** - 高品質なライブラリエコシステム
- **Axum Framework** - 高性能Webフレームワーク
- **Claude** - AI開発アシスタント

## 📞 お問い合わせ

- **Issues**: [GitHub Issues](https://github.com/yourusername/fillstellar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/fillstellar/discussions)