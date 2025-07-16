# 🧪 Cosmic Gardener バックエンド テスト方法 (Windows版)

## 📋 前提条件

このテストを実行するために必要なものを確認してください：

### 1. **必要なソフトウェア**
- **Rust**: 1.70以上
- **PostgreSQL**: 15以上
- **Git**: 最新版
- **Visual Studio Build Tools**: 2019以上（C++コンパイラ）

### 2. **推奨パッケージマネージャー**
- **winget** (Windows 10/11標準)
- **Chocolatey** (サードパーティ)
- **Scoop** (開発者向け)

## 🛠️ ソフトウェアのインストール方法 (Windows)

### 🔧 **Visual Studio Build Tools のインストール**（最初にインストール必須）

#### **方法1: winget使用（推奨）**
```powershell
# PowerShellを管理者権限で実行
winget install Microsoft.VisualStudio.2022.BuildTools

# インストール後、追加のワークロードをインストール
# Visual Studio Installer を開いて以下を選択：
# - C++ build tools
# - Windows 10/11 SDK
```

#### **方法2: 手動ダウンロード**
```powershell
# 公式サイトからダウンロード
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
# 
# インストール時に以下のワークロードを選択：
# ✅ C++ build tools
# ✅ Windows 10/11 SDK (最新版)
# ✅ CMake tools for C++
```

#### **方法3: Chocolatey使用**
```powershell
# Chocolateyをインストール（未インストールの場合）
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Build Toolsをインストール
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
```

---

### 🦀 **Rust のインストール**

#### **方法1: winget使用（推奨）**
```powershell
# PowerShellで実行
winget install Rustlang.Rust.MSVC

# 環境変数を更新
refreshenv

# 確認
rustc --version
cargo --version
```

#### **方法2: 公式インストーラー**
```powershell
# PowerShellで実行
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
& "$env:TEMP\rustup-init.exe"

# インストール後、新しいPowerShellを開いて確認
rustc --version
cargo --version
```

#### **方法3: Chocolatey使用**
```powershell
choco install rust

# 確認
refreshenv
rustc --version
cargo --version
```

#### **方法4: Scoop使用**
```powershell
# Scoopをインストール（未インストールの場合）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Rustをインストール
scoop install rust

# 確認
rustc --version
cargo --version
```

---

### 🐘 **PostgreSQL のインストール**

#### **方法1: winget使用（推奨）**
```powershell
# PostgreSQL 15をインストール
winget install PostgreSQL.PostgreSQL.15

# サービスの開始
net start postgresql-x64-15

# 確認
psql --version
```

#### **方法2: 公式インストーラー**
```powershell
# 公式サイトからダウンロード
# https://www.postgresql.org/download/windows/
# 
# インストール時の設定：
# - Port: 5432 (デフォルト)
# - Superuser password: postgres（覚えておく）
# - Locale: Japanese, Japan（日本語環境の場合）

# インストール後の確認
psql --version
```

#### **方法3: Chocolatey使用**
```powershell
choco install postgresql15 --params '/Password:postgres'

# サービスの開始
net start postgresql-x64-15

# 確認
psql --version
```

#### **PostgreSQL環境変数の設定**
```powershell
# PowerShellで実行
$env:PATH += ";C:\Program Files\PostgreSQL\15\bin"

# 永続的に設定
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Program Files\PostgreSQL\15\bin", "Machine")
```

---

### 🔄 **Git のインストール**

#### **方法1: winget使用（推奨）**
```powershell
winget install Git.Git

# 確認
refreshenv
git --version
```

#### **方法2: 公式インストーラー**
```powershell
# 公式サイトからダウンロード
# https://git-scm.com/download/win
# 
# インストール時の推奨設定：
# - Use Git from the command line and also from 3rd-party software
# - Use the OpenSSL library
# - Checkout Windows-style, commit Unix-style line endings
# - Use Windows' default console window
```

#### **方法3: Chocolatey使用**
```powershell
choco install git

# 確認
refreshenv
git --version
```

---

## 🔧 **Windows環境構築自動化スクリプト**

### **完全自動インストールスクリプト**
```powershell
# setup-cosmic-gardener-windows.ps1
param(
    [switch]$UseChocolatey,
    [switch]$UseWinget
)

Write-Host "🚀 Cosmic Gardener Windows環境構築を開始します..." -ForegroundColor Green

# 管理者権限チェック
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ 管理者権限で実行してください" -ForegroundColor Red
    Write-Host "PowerShellを右クリック → '管理者として実行' を選択してください" -ForegroundColor Yellow
    exit 1
}

if ($UseWinget) {
    Write-Host "📦 wingetを使用してインストールします..." -ForegroundColor Blue
    
    # wingetの確認
    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host "❌ wingetが見つかりません。Windows 10/11の最新版に更新してください" -ForegroundColor Red
        exit 1
    }
    
    # Visual Studio Build Tools
    Write-Host "🔨 Visual Studio Build Toolsをインストールしています..."
    winget install Microsoft.VisualStudio.2022.BuildTools --silent
    
    # Rust
    Write-Host "🦀 Rustをインストールしています..."
    winget install Rustlang.Rust.MSVC --silent
    
    # PostgreSQL
    Write-Host "🐘 PostgreSQLをインストールしています..."
    winget install PostgreSQL.PostgreSQL.15 --silent
    
    # Git
    Write-Host "🔄 Gitをインストールしています..."
    winget install Git.Git --silent
    
} elseif ($UseChocolatey) {
    Write-Host "🍫 Chocolateyを使用してインストールします..." -ForegroundColor Blue
    
    # Chocolateyのインストール確認
    if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "🍫 Chocolateyをインストールしています..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # パッケージインストール
    Write-Host "📦 必要なソフトウェアをインストールしています..."
    choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools" -y
    choco install rust -y
    choco install postgresql15 --params '/Password:postgres' -y
    choco install git -y
    
} else {
    Write-Host "❌ インストール方法を選択してください:" -ForegroundColor Red
    Write-Host "  -UseWinget   : wingetを使用（Windows 10/11推奨）" -ForegroundColor Yellow
    Write-Host "  -UseChocolatey : Chocolateyを使用" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "例: .\setup-cosmic-gardener-windows.ps1 -UseWinget" -ForegroundColor Cyan
    exit 1
}

# 環境変数の更新
Write-Host "🔧 環境変数を更新しています..."
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
refreshenv

# PostgreSQLサービスの開始
Write-Host "🚀 PostgreSQLサービスを開始しています..."
try {
    net start postgresql-x64-15
} catch {
    Write-Host "⚠️ PostgreSQLサービスの開始に失敗しました。手動で開始してください。" -ForegroundColor Yellow
}

# データベースとユーザーの作成
Write-Host "🗄️ テスト用データベースを作成しています..."
Start-Sleep -Seconds 5  # PostgreSQLの起動を待つ

try {
    $env:PGPASSWORD = "postgres"
    & psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE cosmic_gardener_test;" 2>$null
    & psql -U postgres -h localhost -p 5432 -c "CREATE USER cosmic_gardener_app WITH PASSWORD 'password';" 2>$null
    & psql -U postgres -h localhost -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;" 2>$null
    
    Write-Host "✅ データベース作成完了" -ForegroundColor Green
} catch {
    Write-Host "⚠️ データベース作成をスキップしました。後で手動で作成してください。" -ForegroundColor Yellow
}

# 環境変数の設定
Write-Host "🌍 環境変数を設定しています..."
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")

# インストール確認
Write-Host "🔍 インストール確認中..." -ForegroundColor Blue
Write-Host ""

try {
    $rustVersion = & rustc --version 2>$null
    Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust: インストールされていません" -ForegroundColor Red
}

try {
    $psqlVersion = & psql --version 2>$null
    Write-Host "✅ PostgreSQL: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL: インストールされていません" -ForegroundColor Red
}

try {
    $gitVersion = & git --version 2>$null
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git: インストールされていません" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 環境構築が完了しました！" -ForegroundColor Green
Write-Host "新しいPowerShellを開いてテストを実行してください。" -ForegroundColor Cyan
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "1. 新しいPowerShellを開く" -ForegroundColor White
Write-Host "2. プロジェクトディレクトリに移動: cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend" -ForegroundColor White
Write-Host "3. テスト実行: cargo test" -ForegroundColor White
```

### **スクリプトの使用方法**

#### **Step 1: PowerShellの準備**
```powershell
# PowerShellを管理者権限で開く
# スタートメニュー → PowerShell を右クリック → 「管理者として実行」

# 実行ポリシーを設定
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### **Step 2: スクリプトの実行**
```powershell
# スクリプトファイルを作成（メモ帳やVSCodeで）
# ファイル名: setup-cosmic-gardener-windows.ps1

# wingetを使用する場合（Windows 10/11推奨）
.\setup-cosmic-gardener-windows.ps1 -UseWinget

# Chocolateyを使用する場合
.\setup-cosmic-gardener-windows.ps1 -UseChocolatey
```

---

### **手動インストール確認**
```powershell
# 各ソフトウェアのバージョン確認
rustc --version
cargo --version
psql --version
git --version

# 環境変数確認
echo $env:DATABASE_URL
echo $env:TEST_DATABASE_URL

# PostgreSQLサービス状態確認
Get-Service postgresql-x64-15
```

### **インストール後のトラブルシューティング（Windows特有）**

#### **Rustが認識されない場合**
```powershell
# 環境変数を再読み込み
refreshenv

# 手動でPATHに追加
$env:PATH += ";$env:USERPROFILE\.cargo\bin"

# 永続的に設定
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$env:USERPROFILE\.cargo\bin", "User")
```

#### **PostgreSQLに接続できない場合**
```powershell
# サービス状態確認
Get-Service postgresql-x64-15

# サービス開始
net start postgresql-x64-15

# 接続テスト
psql -U postgres -h localhost -p 5432

# ファイアウォール確認
netsh advfirewall firewall show rule name="PostgreSQL"
```

#### **Visual C++エラーが出る場合**
```powershell
# Build Toolsが正しくインストールされているか確認
where cl.exe

# 環境変数を確認
echo $env:VCINSTALLDIR
echo $env:WindowsSDKDir

# Visual Studio Installerで追加コンポーネントをインストール
# - MSVC v143 - VS 2022 C++ x64/x86 build tools
# - Windows 10 SDK or Windows 11 SDK
```

#### **権限エラーが出る場合**
```powershell
# PostgreSQL設定ファイルの場所確認
psql -U postgres -c "SHOW config_file;"

# pg_hba.confの編集（管理者権限必要）
# 場所: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# 変更例: md5 → trust（開発環境のみ）
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```

---

## 🚀 Step 1: 環境セットアップ

### 1.1 データベースの準備
```powershell
# PostgreSQLにログイン
psql -U postgres

# テスト用データベースを作成
CREATE DATABASE cosmic_gardener_test;
CREATE USER cosmic_gardener_app WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;

# 終了
\q
```

### 1.2 環境変数の設定（PowerShell）
```powershell
# 一時的な設定
$env:TEST_DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"

# 永続的な設定
[Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
[Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test", "User")
```

### 1.3 プロジェクトディレクトリに移動
```powershell
cd C:\AIagent\Space_Idle_Game\cosmic-gardener\backend
```

## 🔧 Step 2: 依存関係のインストール

### 2.1 Rustの依存関係をインストール
```powershell
# Cargo.tomlに基づいて全ての依存関係をインストール
cargo build

# 時間がかかる場合があります（初回は5-10分程度）
```

### 2.2 エラーが出た場合の対処
```powershell
# Cargoのキャッシュをクリア
cargo clean

# 再ビルド
cargo build

# より詳細なエラー情報
cargo build --verbose
```

## 🧪 Step 3: テスト実行

### 3.1 **単体テスト**（各モジュールの個別テスト）
```powershell
# 全ての単体テストを実行
cargo test --lib

# 特定のモジュールのテストを実行
cargo test --lib resources
cargo test --lib celestial_bodies
cargo test --lib physics
cargo test --lib validation
cargo test --lib persistence
```

### 3.2 **統合テスト**（システム全体のテスト）
```powershell
# 全ての統合テストを実行（時間がかかります）
cargo test --test integration

# 特定のテストを実行
cargo test --test integration test_resource_manager_integration
cargo test --test integration test_physics_engine_integration
cargo test --test integration test_complete_game_flow_integration
```

### 3.3 **性能テスト**
```powershell
# 性能テストを実行
cargo test --test integration test_performance_under_load --release
```

## 📊 Step 4: テスト結果の確認

### 4.1 **成功パターン**
```
running 15 tests
test test_resource_manager_integration ... ok
test test_celestial_body_manager_integration ... ok
test test_physics_engine_integration ... ok
test test_validation_engine_integration ... ok
test test_persistence_manager_integration ... ok
test test_complete_game_flow_integration ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 4.2 **エラーパターンと対処法**

#### **データベース接続エラー**
```
Error: Database connection failed
```
**対処法:**
1. PostgreSQLが起動しているか確認
2. データベース名・ユーザー名・パスワードを再確認
3. 環境変数が正しく設定されているか確認

#### **依存関係エラー**
```
Error: could not find crate `nalgebra`
```
**対処法:**
```powershell
cargo clean
cargo build
```

#### **コンパイルエラー**
```
Error: cannot find function `create_body` in module
```
**対処法:**
これは実装の問題です。以下のコマンドで詳細を確認：
```powershell
cargo check
```

## 🎯 Step 5: 簡単な動作確認

### 5.1 **リソース管理システム**のテスト
```powershell
# リソース管理だけをテスト
cargo test --lib test_resources_can_afford

# 成功すると以下のように表示されます
test test_resources_can_afford ... ok
```

### 5.2 **天体管理システム**のテスト
```powershell
# 天体作成のテスト
cargo test --lib test_body_creation

# 成功すると以下のように表示されます
test test_body_creation ... ok
```

### 5.3 **物理演算エンジン**のテスト
```powershell
# 物理演算のテスト
cargo test --lib test_physics_engine_update

# 成功すると以下のように表示されます
test test_physics_engine_update ... ok
```

## 🔍 Step 6: 詳細なテスト実行

### 6.1 **詳細出力でテスト実行**
```powershell
# より詳細な出力でテストを実行
cargo test -- --nocapture

# 特定のテストの詳細出力
cargo test test_complete_game_flow_integration -- --nocapture
```

### 6.2 **並列実行を無効にして実行**
```powershell
# テストを1つずつ実行（データベースの競合を避ける）
cargo test -- --test-threads=1
```

## 🚨 Windows特有のトラブルシューティング

### **問題1: "linker 'link.exe' not found"**
```powershell
# Visual Studio Build Toolsが正しくインストールされているか確認
where link.exe

# 見つからない場合、Build Toolsを再インストール
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **問題2: "error: Microsoft Visual C++ 14.0 is required"**
```powershell
# C++ Build Toolsを追加インストール
# Visual Studio Installer を開いて以下を選択：
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 10 SDK or Windows 11 SDK
```

### **問題3: PostgreSQLサービスが開始しない**
```powershell
# サービスの詳細状態を確認
Get-Service postgresql-x64-15 | Format-List

# イベントログを確認
Get-EventLog -LogName Application -Source postgresql* -Newest 10

# 手動でサービスを開始
Start-Service postgresql-x64-15
```

### **問題4: ポート5432が使用中**
```powershell
# ポート使用状況を確認
netstat -an | findstr 5432

# プロセスを確認
Get-Process -Name postgres*

# 別のポートでPostgreSQLを起動（必要な場合）
# postgresql.confでportを変更
```

### **問題5: 環境変数が反映されない**
```powershell
# 現在の環境変数を確認
Get-ChildItem Env: | Where-Object {$_.Name -like "*DATABASE*"}

# システム環境変数を確認
[Environment]::GetEnvironmentVariable("DATABASE_URL", "User")
[Environment]::GetEnvironmentVariable("DATABASE_URL", "Machine")

# PowerShellプロファイルに追加（永続化）
echo '$env:DATABASE_URL = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"' >> $PROFILE
```
