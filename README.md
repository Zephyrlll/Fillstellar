# Cosmic Gardener

宇宙の塵から始まり、星や生命を育てる3D宇宙シミュレーション・アイドルゲーム

## 🌟 特徴

- **3D宇宙シミュレーション**: Three.jsを使用したリアルタイム3D物理エンジン
- **複雑な資源システム**: 6つの基本資源と27種類の高度な資源
- **品質システム**: 粗悪〜伝説まで5段階の品質とビジュアルエフェクト
- **資源変換**: 15種類以上の変換レシピと自動化システム
- **生命進化**: 微生物→植物→動物→知的生命の進化シミュレーション
- **マルチプレイヤー対応**: Rust製バックエンドによるリアルタイム同期

## 🚀 クイックスタート

### フロントエンド（シングルプレイヤー）

```bash
cd cosmic-gardener/frontend
./start-server.bat       # Windows
# または
python -m http.server 8000

# ブラウザで http://localhost:8000 を開く
```

### フルスタック（マルチプレイヤー）

```bash
cd cosmic-gardener
make dev                 # Docker環境での開発
# または
make dev-local          # ローカル環境での開発
```

## 📁 プロジェクト構造

```
Space_Idle_Game/
├── cosmic-gardener/           # メインプロジェクト
│   ├── frontend/              # TypeScript/Three.js フロントエンド
│   │   ├── js/               # ゲームロジック
│   │   │   ├── resourceSystem.ts    # 資源システム
│   │   │   ├── conversionEngine.ts  # 変換エンジン
│   │   │   ├── productionUI.ts      # 生産UI
│   │   │   └── ...
│   │   ├── index.html
│   │   └── start-server.bat
│   ├── backend/               # Rust製バックエンド
│   │   ├── src/
│   │   ├── Cargo.toml
│   │   └── Makefile
│   ├── database/              # データベース設計
│   ├── docs/                  # ドキュメント
│   └── infra/                 # インフラ設定
├── docs/                      # プロジェクト全体のドキュメント
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
- **高度な資源**: 各基本資源の4つのサブタイプ（例：鉄質塵、炭素塵、珪素塵、希土類塵）
- **加工資源**: 加工金属、シリコン、合金
- **品質システム**: 粗悪(50%) → 標準(100%) → 高品質(150%) → 完璧(200%) → 伝説(300%)

### 変換レシピ例
- 宇宙の塵 + エネルギー → 加工金属
- 炭素塵 + 有機物 + エネルギー → 複合有機物
- 電気エネルギー + 加工金属 → 核エネルギー

## 🛠️ 開発

### 必要な環境
- **フロントエンド**: Node.js 18+, TypeScript 4.5+
- **バックエンド**: Rust 1.70+, PostgreSQL 15+, Redis 6+

### 開発コマンド

```bash
# フロントエンド
cd cosmic-gardener/frontend
npx tsc                  # TypeScriptコンパイル
./start-server.bat       # 開発サーバー起動

# バックエンド
cd cosmic-gardener/backend
make dev                 # 開発環境起動
make test               # テスト実行
make build-release      # プロダクションビルド

# 全体
cd cosmic-gardener
make dev                # Docker Compose開発環境
make deploy-staging     # ステージング環境デプロイ
```

## 📊 技術スタック

### フロントエンド
- **TypeScript** - 型安全なJavaScript
- **Three.js** - 3Dグラフィックス
- **ES6 Modules** - モジュラーアーキテクチャ
- **Web Audio API** - 空間オーディオ

### バックエンド
- **Rust** - 高性能・安全なシステム言語
- **Actix Web** - 非同期Webフレームワーク
- **PostgreSQL** - PostGIS拡張による空間データ
- **Redis** - セッション・キャッシュ管理
- **WebSocket** - リアルタイム通信

### インフラ
- **Docker** - コンテナ化
- **Terraform** - インフラ管理
- **Grafana/Prometheus** - 監視・メトリクス

## 📈 ロードマップ

### Phase 1: 基本システム ✅
- 基本的な資源システム
- 天体創造と物理シミュレーション
- 生命進化システム

### Phase 2: 高度な資源システム ✅
- 資源細分化と品質システム
- 変換エンジンと生産チェーン
- 視覚エフェクトとパーティクルシステム

### Phase 3: マルチプレイヤー 🚧
- リアルタイム同期
- プレイヤー間取引
- 協力・競争要素

### Phase 4: 高度な機能 📋
- 地域特性システム
- 希少資源とイベント
- AIアシスタント

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
- **Claude** - AI開発アシスタント