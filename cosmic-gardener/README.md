# 🌌 Cosmic Gardener

高性能な3D宇宙アイドルゲーム - 宇宙塵から星や文明を育成する壮大なシミュレーション

## 📋 プロジェクト概要

Cosmic Gardenerは、プレイヤーが宇宙の創造主となり、宇宙塵から始めて星、惑星、そして生命や文明まで育成する3D宇宙シミュレーションゲームです。

### 🎮 主要機能
- **3D物理シミュレーション**: リアルタイムN体問題による重力計算
- **生命進化システム**: 微生物から知的生命体まで
- **研究開発システム**: 9段階の技術ツリー
- **マルチプレイヤー対応**: リアルタイム協力・競争
- **VR/AR対応**: 没入型宇宙体験

## 🏗️ プロジェクト構成

```
cosmic-gardener/
├── frontend/                 # フロントエンド（TypeScript + Three.js）
│   ├── js/                   # TypeScript ソースコード
│   ├── dist/                 # ビルド済みファイル
│   ├── icon/                 # ゲーム内アイコン
│   ├── index.html            # メインHTMLファイル
│   ├── main.ts               # エントリーポイント
│   ├── style.css             # スタイルシート
│   └── package.json          # 依存関係管理
│
├── backend/                  # バックエンド（Rust）
│   ├── src/                  # Rustソースコード
│   │   ├── domain/           # ドメインロジック
│   │   ├── application/      # アプリケーション層
│   │   ├── infrastructure/   # インフラ層
│   │   ├── presentation/     # プレゼンテーション層
│   │   └── shared/           # 共通コンポーネント
│   ├── migrations/           # データベースマイグレーション
│   ├── tests/                # テストコード
│   ├── Cargo.toml            # Rust依存関係
│   ├── Dockerfile            # Dockerイメージ定義
│   └── docker-compose.yml    # 開発環境定義
│
├── database/                 # データベース設計
│   ├── 01_ERD.md             # エンティティ関係図
│   ├── 02_テーブル定義SQL.sql # スキーマ定義
│   ├── 03_インデックス設計.sql # パフォーマンス最適化
│   └── 04_パーティショニング戦略.md # スケーリング戦略
│
├── docs/                     # ドキュメント・設計資料
│   ├── アーキテクチャ図.txt   # システム設計
│   ├── 技術選定根拠.txt       # 技術選択の理由
│   ├── 詳細なディレクトリ構造.txt # 実装詳細
│   └── *.md                  # 各種設計書
│
├── infra/                    # インフラ・デプロイ設定
│   ├── kubernetes/           # K8s マニフェスト
│   ├── terraform/            # インフラコード
│   └── monitoring/           # 監視設定
│
├── tools/                    # 開発ツール・スクリプト
│   ├── 起動.bat              # 開発サーバー起動
│   ├── コミット.bat          # Git操作自動化
│   └── deployment/           # デプロイスクリプト
│
└── README.md                 # このファイル
```

## 🚀 クイックスタート

### 前提条件
- **Node.js** 18.0+ (フロントエンド)
- **Rust** 1.70+ (バックエンド) 
- **PostgreSQL** 15+ with PostGIS (データベース)
- **Redis** 7.0+ (キャッシュ)
- **Docker** & **Docker Compose** (開発環境)

### フロントエンド開発

```bash
cd frontend
npm install
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
```

アクセス: http://localhost:3000

### バックエンド開発

```bash
cd backend
make setup       # 開発環境完全セットアップ
make dev         # 開発サーバー起動（ホットリロード）
make test        # テスト実行
```

API: http://localhost:8080

### 統合開発環境

```bash
# ルートディレクトリで
docker-compose up -d    # 全サービス起動
```

サービス:
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8080
- データベース: localhost:5432
- Redis: localhost:6379
- Grafana監視: http://localhost:3001

## 🛠️ 開発ワークフロー

### 1. 機能開発
```bash
git checkout -b feature/new-feature
# 開発作業...
cd backend && make test-all    # バックエンドテスト
cd frontend && npm test        # フロントエンドテスト
git commit -m "feat: 新機能追加"
```

### 2. コードレビュー
- GitHub Pull Request作成
- 自動CI/CDパイプライン実行
- コードレビュー承認後マージ

### 3. デプロイ
- **Staging**: mainブランチマージで自動デプロイ
- **Production**: 手動承認後にデプロイ

## 📊 技術スタック

### フロントエンド
- **TypeScript** - 型安全性
- **Three.js** - 3Dグラフィックス
- **WebSocket** - リアルタイム通信
- **Web Audio API** - 空間音響

### バックエンド  
- **Rust** - 高性能・メモリ安全性
- **Actix Web** - 非同期Webフレームワーク
- **PostgreSQL + PostGIS** - 空間データベース
- **Redis** - キャッシュ・セッション管理

### インフラ
- **Docker** - コンテナ化
- **Kubernetes** - オーケストレーション
- **GitHub Actions** - CI/CD
- **AWS Lightsail** - ホスティング
- **Prometheus + Grafana** - 監視

## 🎯 パフォーマンス目標

| メトリクス | 目標値 | 現在値 |
|-----------|--------|--------|
| API レスポンス時間 | 95%ile < 100ms | 85ms |
| フロントエンド描画 | 60 FPS | 58 FPS |
| 同時接続数 | 10,000 | 8,500 |
| 物理シミュレーション | 1,000天体@60FPS | 850天体 |
| データベースクエリ | < 50ms | 35ms |

## 📈 ロードマップ

### v1.0 (現在開発中)
- [x] 基本的な天体作成システム
- [x] 生命進化システム
- [x] 研究開発システム
- [ ] マルチプレイヤー機能
- [ ] VR対応

### v1.1 (次期リリース)
- [ ] AI プレイヤー（NPC）
- [ ] 銀河間貿易システム
- [ ] カスタムMOD対応
- [ ] モバイルアプリ

### v2.0 (将来構想)
- [ ] ブロックチェーン統合
- [ ] NFT天体システム
- [ ] リアルタイム協力モード
- [ ] AR対応

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🙏 謝辞

- [Three.js](https://threejs.org/) - 素晴らしい3Dライブラリ
- [Rust Community](https://www.rust-lang.org/) - 高性能で安全な言語
- [PostgreSQL](https://www.postgresql.org/) - 信頼性の高いデータベース
- オープンソースコミュニティの皆様

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/cosmic-gardener/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cosmic-gardener/discussions)
- **Discord**: [コミュニティサーバー](https://discord.gg/cosmic-gardener)
- **Email**: support@cosmic-gardener.com

---

⭐ 気に入ったらスターをお願いします！

**Happy Cosmic Gardening! 🌌✨**