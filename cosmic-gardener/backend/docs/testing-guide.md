# 統合テストガイド

Cosmic Gardener Backend の統合テストシステムの使用方法と設計について説明します。

## 📁 テスト構造

```
backend/tests/
├── lib.rs                    # テストエントリーポイント
├── test_runner.rs            # カスタムテストランナー
└── integration/              # 統合テストモジュール
    ├── mod.rs               # 共通セットアップ
    ├── helpers.rs           # テストユーティリティ
    ├── auth_flow.rs         # 正常系認証フロー
    ├── error_handling.rs    # 異常系エラーハンドリング
    ├── boundary_tests.rs    # 境界値テスト
    └── concurrency.rs       # 並行性テスト
```

## 🧪 テストカテゴリ

### 1. 正常系フローテスト (`auth_flow.rs`)

**目的**: 通常の使用シナリオでシステムが正しく動作することを確認

**テスト内容**:
- ユーザー登録 → ログイン → API使用 → ログアウトの完全フロー
- トークンリフレッシュ機能
- 複数セッション管理
- ゲームデータの保存・読み込み
- 統計情報とリーダーボード

**実行例**:
```bash
cargo test --test lib auth_flow
```

### 2. 異常系テスト (`error_handling.rs`)

**目的**: エラー状況での適切なハンドリングを検証

**テスト内容**:
- 認証エラー（無効トークン、期限切れ等）
- バリデーションエラー（不正入力値）
- リソースエラー（存在しないデータ）
- 競合エラー（重複登録等）
- 大量データエラー

**実行例**:
```bash
cargo test --test lib error_handling
```

### 3. 境界値テスト (`boundary_tests.rs`)

**目的**: パラメータの限界値と極端なケースをテスト

**テスト内容**:
- 文字列長の境界値（最小/最大長）
- 数値パラメータの境界値
- ゲームデータサイズの境界
- Unicode文字の処理
- セーブ名の特殊文字

**実行例**:
```bash
cargo test --test lib boundary_tests
```

### 4. 並行性テスト (`concurrency.rs`)

**目的**: 複数同時リクエストでの動作を検証

**テスト内容**:
- 並行ユーザー登録
- 競合状態での重複チェック
- 並行ログインとトークン発行
- ゲームデータの並行更新
- 高負荷時のパフォーマンス

**実行例**:
```bash
cargo test --test lib concurrency
```

## 🛠️ テストユーティリティ (`helpers.rs`)

### TestUser
テスト用ユーザーデータの生成と管理
```rust
let test_user = TestUser::new("unique_suffix");
let register_request = test_user.to_register_request();
```

### RequestHelper
HTTP リクエストの簡単な送信
```rust
let (status, body) = RequestHelper::post(
    &mut app,
    "/api/auth/login", 
    &login_data,
    Some(&access_token)
).await;
```

### AssertHelper
レスポンスの検証とアサーション
```rust
AssertHelper::assert_auth_success(&body, status);
AssertHelper::assert_error_response(&body, "AUTH_001", status);
```

### ConcurrencyHelper
並行実行テストのサポート
```rust
let results = ConcurrencyHelper::run_concurrent(10, |i| async move {
    // 並行実行するタスク
}).await;
```

## 🚀 テスト実行方法

### 1. 基本的な実行

```bash
# 全統合テストを実行
cargo test --test lib

# 特定のテストモジュールを実行
cargo test --test lib auth_flow

# 特定のテストケースを実行
cargo test --test lib test_complete_auth_flow

# 詳細な出力で実行
cargo test --test lib -- --nocapture
```

### 2. カスタムテストランナーの使用

```bash
# 全テストを順序立てて実行
cargo run --bin test_runner

# CI環境での実行
cargo run --bin test_runner --features ci
```

### 3. 並行実行の制御

```bash
# シングルスレッドで実行（データベース競合を避ける）
cargo test --test lib -- --test-threads=1

# 特定のテスト数で並行実行
cargo test --test lib -- --test-threads=4
```

## 🗄️ データベースセットアップ

### 前提条件
- PostgreSQL サーバーが起動していること
- `cosmic_gardener_test` データベースが作成可能であること

### 自動セットアップ
テストランナーが自動的に以下を実行：
```bash
# テストデータベース作成
createdb cosmic_gardener_test

# マイグレーション実行
sqlx migrate run --database-url postgresql://localhost/cosmic_gardener_test
```

### 手動セットアップ
```bash
# データベース作成
createdb cosmic_gardener_test

# 環境変数設定
export DATABASE_URL=postgresql://localhost/cosmic_gardener_test

# マイグレーション実行
cd cosmic-gardener/backend
sqlx migrate run
```

## 📊 テスト結果とレポート

### コンソール出力
```
🚀 Starting Cosmic Gardener Backend Integration Tests
============================================================
🧪 Running test suite: Authentication Flow
✅ Authentication Flow completed in 1.23s
🧪 Running test suite: Error Handling
✅ Error Handling completed in 0.85s
...

📊 Test Results Summary
============================================================
Total Tests:     15
Passed:          15 (100%)
Failed:          0 (0%)
Total Duration:  12.34s
Average Time:    0.82s

🎉 All tests passed!
```

### JUnit レポート（CI環境）
CI環境では `test-results.xml` が生成されます：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="cosmic-gardener-backend" tests="15" failures="0">
  <testcase name="Authentication Flow" time="1.230"/>
  <testcase name="Error Handling" time="0.850"/>
  ...
</testsuite>
```

## 🔧 設定とカスタマイズ

### 環境変数
```bash
# ログレベル
export RUST_LOG=debug

# データベースURL
export DATABASE_URL=postgresql://localhost/cosmic_gardener_test

# CI環境フラグ
export CI=true
```

### テスト用設定ファイル
`tests/.env`:
```
DATABASE_URL=postgresql://localhost/cosmic_gardener_test
JWT_SECRET=test_secret_key_for_testing_purposes_only
RUST_LOG=info
```

## 🧹 テストデータの管理

### 自動クリーンアップ
各テストは独立して実行され、完了後にデータが自動的にクリーンアップされます：

```rust
// テスト完了後に自動実行
cleanup_test_data(&pool).await;
```

### 手動クリーンアップ
```rust
// 全テーブルをクリア
DbHelper::cleanup_all_tables(&pool).await;

// 特定ユーザーのデータを削除
DbHelper::delete_user(&pool, "test@example.com").await;
```

## 📈 パフォーマンス測定

### レスポンス時間の測定
```rust
let (result, duration) = PerformanceHelper::measure_request(|| async {
    RequestHelper::post(&mut app, "/api/auth/login", &data, None).await
}).await;

PerformanceHelper::assert_response_time(duration, 1000); // 1秒以内
```

### 高負荷テスト
```rust
// 100並行リクエストでのパフォーマンステスト
let results = ConcurrencyHelper::run_concurrent(100, |_| async {
    // 各リクエストの処理
}).await;

let (success_count, failure_count, success_rate) = 
    ConcurrencyHelper::analyze_concurrent_results(&results);
```

## 🚨 トラブルシューティング

### よくある問題

#### 1. データベース接続エラー
```
Error: Failed to connect to test database
```
**解決方法**:
- PostgreSQL が起動していることを確認
- データベース `cosmic_gardener_test` が存在することを確認
- 接続権限を確認

#### 2. マイグレーションエラー
```
Error: Failed to run migrations
```
**解決方法**:
```bash
# sqlx-cli をインストール
cargo install sqlx-cli

# マイグレーションを手動実行
sqlx migrate run --database-url postgresql://localhost/cosmic_gardener_test
```

#### 3. 並行テストでの競合
```
Error: Test failed due to database conflict
```
**解決方法**:
```bash
# シングルスレッドで実行
cargo test --test lib -- --test-threads=1
```

#### 4. メモリ不足
```
Error: Failed to allocate memory
```
**解決方法**:
- 並行実行数を減らす
- より多くのメモリを確保
- 不要なテストデータを削除

### デバッグオプション

```bash
# 詳細ログ出力
RUST_LOG=debug cargo test --test lib -- --nocapture

# 特定テストのみ実行
cargo test --test lib test_complete_auth_flow -- --nocapture

# バックトレース出力
RUST_BACKTRACE=1 cargo test --test lib
```

## 📚 ベストプラクティス

### 1. テストの独立性
- 各テストは他のテストに依存しない
- テスト間でデータを共有しない
- 完了後は必ずクリーンアップ

### 2. 現実的なシナリオ
- 実際のユーザー行動を模倣
- エッジケースも含める
- パフォーマンス要件を考慮

### 3. エラーハンドリング
- 全てのエラーケースをテスト
- 適切なエラーコードとメッセージを確認
- セキュリティ関連のエラーも検証

### 4. 並行性の考慮
- 複数ユーザーでの同時利用をテスト
- レースコンディションを検出
- データ整合性を確認

### 5. 継続的改善
- テストカバレッジを定期的に確認
- 新機能追加時にテストも追加
- パフォーマンス劣化を監視

## 🔗 関連ドキュメント

- [API Documentation Guide](./API_Documentation_Guide.md)
- [Error Codes Reference](./error-codes.md)
- [Development Setup](../README.md#開発環境のセットアップ)
- [Contributing Guidelines](../CONTRIBUTING.md)