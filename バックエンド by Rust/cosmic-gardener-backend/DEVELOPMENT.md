# 🛠️ Cosmic Gardener Backend - 開発環境セットアップ

このドキュメントでは、Cosmic Gardener Backendの開発環境をセットアップする手順を説明します。

## 📋 前提条件

- **OS**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **メモリ**: 8GB以上推奨（Docker使用時）
- **ストレージ**: 10GB以上の空き容量
- **ネットワーク**: インターネット接続（依存関係のダウンロード用）

## 🚀 クイックスタート

```bash
# 1. リポジトリクローン
git clone https://github.com/cosmic-gardener/backend.git
cd cosmic-gardener-backend

# 2. 開発環境起動（Docker使用）
make dev-up

# 3. 別ターミナルで開発サーバー起動
make dev
```

5分程度で開発環境が立ち上がります！

## 📦 詳細なセットアップ手順

### 1. Rustのインストール

#### 1.1 Rustupのインストール

```bash
# Unix系（Linux/macOS）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows（PowerShell）
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
./rustup-init.exe
```

#### 1.2 Rustの設定

```bash
# シェルの再読み込み
source ~/.cargo/env  # または新しいターミナルを開く

# 最新安定版の使用
rustup default stable

# 必要なコンポーネントの追加
rustup component add rustfmt clippy llvm-tools-preview

# ターゲットの追加（クロスコンパイル用）
rustup target add x86_64-unknown-linux-musl
```

#### 1.3 開発ツールのインストール

```bash
# 必須開発ツール
cargo install cargo-watch          # ファイル変更の監視
cargo install sqlx-cli             # データベースマイグレーション
cargo install cargo-audit          # セキュリティ監査
cargo install cargo-tarpaulin      # コードカバレッジ
cargo install cargo-deny           # 依存関係管理
cargo install cargo-expand         # マクロ展開
cargo install cargo-udeps          # 未使用依存関係検出

# 追加の便利ツール
cargo install cargo-edit           # Cargo.toml編集
cargo install cargo-outdated       # 古い依存関係チェック
cargo install cargo-tree           # 依存関係ツリー表示
cargo install flamegraph           # パフォーマンス分析
```

### 2. データベースのセットアップ

#### 2.1 PostgreSQL（ローカルインストール）

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib postgis

# PostgreSQL起動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# ユーザー作成
sudo -u postgres createuser --interactive --pwprompt cosmic_dev
sudo -u postgres createdb -O cosmic_dev cosmic_gardener_dev
```

**macOS（Homebrew）:**
```bash
brew install postgresql postgis

# PostgreSQL起動
brew services start postgresql

# データベース作成
createdb cosmic_gardener_dev
```

**Windows:**
1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からダウンロード
2. PostGIS拡張も一緒にインストール
3. pgAdminでデータベース作成

#### 2.2 Redis（ローカルインストール）

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
```bash
# WSLを使用するか、Docker版を推奨
```

### 3. Docker環境での開発（推奨）

#### 3.1 Docker/Docker Composeのインストール

**Windows/macOS:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop)をインストール

**Ubuntu:**
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose
sudo apt install docker-compose

# ログアウト/ログインして権限反映
```

#### 3.2 開発環境の起動

```bash
# 環境変数設定
cp .env.example .env
# .envファイルを編集（必要に応じて）

# 開発環境起動
make dev-up

# ログ確認
make logs

# 開発サーバー起動（ホットリロード付き）
make dev
```

### 4. IDE設定

#### 4.1 Visual Studio Code

**必須拡張機能:**
```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "vadimcn.vscode-lldb",
    "serayuzgur.crates",
    "tamasfe.even-better-toml",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers"
  ]
}
```

**推奨設定（.vscode/settings.json）:**
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.loadOutDirsFromCheck": true,
  "rust-analyzer.procMacro.enable": true,
  "editor.formatOnSave": true,
  "editor.rulers": [100],
  "files.trimTrailingWhitespace": true,
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

#### 4.2 IntelliJ IDEA / CLion

**必要なプラグイン:**
- Rust
- TOML
- Database Tools and SQL

**設定手順:**
1. File → Settings → Languages & Frameworks → Rust
2. Toolchain pathを設定（`~/.cargo/bin`）
3. Standard library pathを設定

### 5. 環境変数の設定

#### 5.1 .envファイルの作成

```bash
cp .env.example .env
```

#### 5.2 開発用設定例

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cosmic_gardener_dev
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/cosmic_gardener_test

# Cache
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET=dev-secret-key-change-in-production

# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=8080

# Logging
RUST_LOG=cosmic_gardener_backend=debug,info
RUST_BACKTRACE=1

# Development
ENVIRONMENT=development
HOT_RELOAD=true
```

### 6. データベースの初期化

```bash
# マイグレーション実行
make migrate

# 開発用データ投入
make seed

# リセット（完全初期化）
make db-reset
```

## 🔧 開発ワークフロー

### 日常的な開発作業

```bash
# 1. 依存関係更新チェック
make deps-check

# 2. 開発サーバー起動（ホットリロード）
make dev

# 3. テスト実行
make test

# 4. コード品質チェック
make lint

# 5. フォーマット
make fmt
```

### 新機能開発

```bash
# 1. 新しいブランチ作成
git checkout -b feature/new-feature

# 2. 開発作業...

# 3. テスト実行
make test-all

# 4. 静的解析
make lint

# 5. セキュリティチェック
make security-check

# 6. コミット前チェック
make pre-commit
```

### データベース操作

```bash
# マイグレーション作成
make migration-create name=create_new_table

# マイグレーション実行
make migrate

# マイグレーション取り消し
make migrate-down

# データベースリセット
make db-reset

# シードデータ投入
make seed
```

## 🧪 テスト

### テストの種類と実行方法

```bash
# 単体テスト
make test-unit

# 統合テスト
make test-integration

# 全テスト
make test-all

# カバレッジ付きテスト
make test-coverage

# 特定のテスト実行
cargo test test_name

# テストデータベース用
make test-db-setup
```

### パフォーマンステスト

```bash
# ベンチマーク実行
make bench

# 負荷テスト
make load-test

# プロファイリング
make profile
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. Rustコンパイルエラー

```bash
# キャッシュクリア
cargo clean

# 依存関係再取得
rm Cargo.lock
cargo build

# Rustツールチェーン更新
rustup update
```

#### 2. データベース接続エラー

```bash
# PostgreSQL状態確認
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# 接続テスト
psql -h localhost -U postgres -d cosmic_gardener_dev

# 権限確認
sudo -u postgres psql
\l  # データベース一覧
\du  # ユーザー一覧
```

#### 3. Docker関連

```bash
# Docker状態確認
docker --version
docker-compose --version

# コンテナ状態確認
docker ps -a

# ログ確認
docker-compose logs backend

# 完全リセット
make docker-clean
```

#### 4. ポート競合

```bash
# ポート使用状況確認
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# ポート変更
export SERVER_PORT=8081
# または .envファイルで変更
```

### パフォーマンス最適化

#### 開発時のビルド高速化

```bash
# .cargo/config.tomlを作成
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << 'EOF'
[build]
rustc-wrapper = "sccache"  # キャッシュ有効化（要sccacheインストール）

[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[net]
git-fetch-with-cli = true
EOF

# sccacheインストール
cargo install sccache
```

### 環境固有の設定

#### WSL2（Windows）

```bash
# WSL2での開発推奨設定
echo 'export DOCKER_HOST=unix:///var/run/docker.sock' >> ~/.bashrc
echo 'export DISPLAY=:0.0' >> ~/.bashrc

# ファイルシステム監視制限増加
echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### macOS

```bash
# ファイル監視制限増加
echo 'kern.maxfiles=65536' | sudo tee -a /etc/sysctl.conf
echo 'kern.maxfilesperproc=65536' | sudo tee -a /etc/sysctl.conf

# Dockerメモリ設定
# Docker Desktop → Preferences → Resources → Memory: 4GB以上推奨
```

## 📚 追加リソース

### ドキュメント
- [Rust Book](https://doc.rust-lang.org/book/)
- [Actix Web ガイド](https://actix.rs/)
- [SQLx ドキュメント](https://docs.rs/sqlx/latest/sqlx/)
- [PostgreSQL ドキュメント](https://www.postgresql.org/docs/)

### 便利なツール
- [Rust Playground](https://play.rust-lang.org/)
- [Crate Registry](https://crates.io/)
- [DB Browser for SQLite](https://sqlitebrowser.org/)（開発用）
- [Postman](https://www.postman.com/)（API テスト）

### コミュニティ
- [Rust Users Forum](https://users.rust-lang.org/)
- [r/rust](https://www.reddit.com/r/rust/)
- [Rust Discord](https://discord.gg/rust-lang)

## 🎯 次のステップ

開発環境が構築できたら：

1. [アーキテクチャドキュメント](./docs/architecture.md)を読む
2. [API ドキュメント](./docs/api.md)を確認
3. [コントリビューションガイド](./CONTRIBUTING.md)を読む
4. [初心者向けタスク](https://github.com/cosmic-gardener/backend/labels/good%20first%20issue)に挑戦

---

何か問題があれば、[Issues](https://github.com/cosmic-gardener/backend/issues)で報告してください！