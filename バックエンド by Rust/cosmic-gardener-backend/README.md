# Cosmic Gardener Backend

高性能な3D宇宙アイドルゲームのバックエンドサーバー

## 概要

Cosmic Gardenerは、プレイヤーが宇宙塵から始めて星や惑星、さらには生命を育成する3D宇宙シミュレーションゲームです。このバックエンドは、リアルタイムの物理シミュレーション、大規模なデータ管理、マルチプレイヤー対応を提供します。

## 主要機能

- **高性能物理シミュレーション**: N体問題の最適化実装
- **リアルタイム通信**: WebSocketによる双方向通信
- **スケーラブルアーキテクチャ**: 水平スケーリング対応
- **空間データ最適化**: PostGIS + R-tree索引
- **チート検出**: 統計的異常検知
- **モニタリング**: OpenTelemetry + Prometheus

## アーキテクチャ

```text
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Controllers   │  │   Middleware    │  │   WebSocket     │ │
│  │                 │  │                 │  │   Handlers      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Commands     │  │    Queries      │  │    Services     │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Entities     │  │    Services     │  │  Repositories   │ │
│  │                 │  │                 │  │  (Interfaces)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Database     │  │     Cache       │  │   External      │ │
│  │                 │  │                 │  │     APIs        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 技術スタック

- **言語**: Rust 1.70+
- **Webフレームワーク**: Actix Web 4.4
- **データベース**: PostgreSQL 15+ with PostGIS
- **キャッシュ**: Redis 7.0+
- **通信**: WebSocket, REST API
- **監視**: OpenTelemetry, Prometheus, Jaeger
- **テスト**: Cargo test, Criterion benchmarks

## クイックスタート

### 前提条件

- Rust 1.70以上
- PostgreSQL 15以上（PostGIS拡張付き）
- Redis 7.0以上
- Docker & Docker Compose（開発環境用）

### 開発環境のセットアップ

1. **リポジトリのクローン**
```bash
git clone https://github.com/cosmic-gardener/backend.git
cd cosmic-gardener-backend
```

2. **環境変数の設定**
```bash
cp .env.example .env
# .envファイルを編集して必要な設定を行う
```

3. **データベースとキャッシュの起動（Docker）**
```bash
docker-compose up -d postgres redis
```

4. **データベースのセットアップ**
```bash
cargo run --bin cosmic-gardener-migrate
```

5. **開発サーバーの起動**
```bash
cargo run
```

### Docker Composeでの起動

```bash
docker-compose up -d
```

## 設定

### 環境変数

主要な環境変数：

- `DATABASE_URL`: PostgreSQLデータベースURL
- `REDIS_URL`: RedisキャッシュURL
- `JWT_SECRET`: JWT署名用の秘密鍵
- `SERVER_PORT`: サーバーポート（デフォルト: 8080）
- `LOG_LEVEL`: ログレベル（debug, info, warn, error）

詳細は `.env.example` を参照してください。

### 設定ファイル

YAML形式の設定ファイルもサポート：

```yaml
# config/default.yaml
server:
  host: "0.0.0.0"
  port: 8080
  workers: 4

database:
  url: "postgresql://postgres:password@localhost/cosmic_gardener"
  max_connections: 20

# その他の設定...
```

## API ドキュメント

### REST API

- `GET /health` - ヘルスチェック
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/register` - ユーザー登録
- `GET /api/v1/players/{id}` - プレイヤー情報取得
- `GET /api/v1/celestial-bodies` - 天体一覧取得
- `POST /api/v1/celestial-bodies` - 天体作成

### WebSocket API

```javascript
// WebSocket接続
const ws = new WebSocket('ws://localhost:8080/ws/game');

// 天体作成
ws.send(JSON.stringify({
  type: 'create_celestial_body',
  data: {
    body_type: 'star',
    position: [0, 0, 0],
    mass: 1.989e30
  }
}));
```

## 開発

### コードスタイル

```bash
# フォーマット
cargo fmt

# Linting
cargo clippy

# テスト
cargo test
```

### ベンチマーク

```bash
# 物理シミュレーションのベンチマーク
cargo bench --bench physics_benchmark

# データベースのベンチマーク
cargo bench --bench database_benchmark
```

### プロファイリング

```bash
# CPU プロファイリング
cargo install flamegraph
cargo flamegraph --bin cosmic-gardener-server

# メモリプロファイリング
cargo install valgrind
valgrind --tool=massif target/release/cosmic-gardener-server
```

## テスト

### 単体テスト

```bash
cargo test
```

### 統合テスト

```bash
cargo test --test integration
```

### パフォーマンステスト

```bash
cargo test --test performance --release
```

## デプロイメント

### Docker

```dockerfile
# Dockerfile使用
docker build -t cosmic-gardener-backend .
docker run -p 8080:8080 cosmic-gardener-backend
```

### Kubernetes

```bash
# Helm Chart使用
helm install cosmic-gardener ./charts/cosmic-gardener
```

### 本番環境での設定

本番環境では以下の環境変数を必ず設定：

- `JWT_SECRET`: 強力な秘密鍵
- `DATABASE_URL`: 本番データベースURL
- `REDIS_URL`: 本番RedisURL
- `RUST_LOG`: warnまたはerror

## 監視

### メトリクス

Prometheusメトリクスは `/metrics` エンドポイントで利用可能：

- `http_requests_total`: HTTPリクエスト数
- `physics_simulation_duration_seconds`: 物理シミュレーション時間
- `database_query_duration_seconds`: データベースクエリ時間
- `websocket_connections_active`: アクティブなWebSocket接続数

### ログ

構造化ログをJSON形式で出力：

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO",
  "message": "Server started",
  "fields": {
    "port": 8080,
    "workers": 4
  }
}
```

### 分散トレーシング

Jaegerを使用した分散トレーシング対応。

## 貢献

1. Forkしてfeatureブランチを作成
2. 変更を実装
3. テストを追加・実行
4. Pull Requestを作成

### コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## サポート

- **Issues**: [GitHub Issues](https://github.com/cosmic-gardener/backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cosmic-gardener/backend/discussions)
- **Email**: support@cosmic-gardener.com

## パフォーマンス目標

- **レスポンス時間**: 95%ile < 100ms
- **スループット**: 10,000 req/sec
- **物理シミュレーション**: 1,000天体で60FPS
- **WebSocket**: 10,000同時接続
- **可用性**: 99.9%

## ロードマップ

- [ ] GraphQL API対応
- [ ] マルチリージョン対応
- [ ] AI プレイヤー（NPC）
- [ ] リアルタイム協力モード
- [ ] VR/AR対応
- [ ] ブロックチェーン統合