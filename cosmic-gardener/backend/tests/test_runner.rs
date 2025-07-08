//! # テスト実行スクリプト
//!
//! 統合テストを順序立てて実行するためのテストランナー

use std::process::Command;
use std::time::Instant;

/// テストスイートの実行結果
#[derive(Debug)]
struct TestResult {
    name: String,
    passed: bool,
    duration: std::time::Duration,
    output: String,
}

/// 統合テストランナー
struct IntegrationTestRunner {
    results: Vec<TestResult>,
}

impl IntegrationTestRunner {
    fn new() -> Self {
        Self {
            results: Vec::new(),
        }
    }
    
    /// 個別のテストを実行
    async fn run_test(&mut self, test_name: &str, test_filter: &str) {
        println!("🧪 Running test suite: {}", test_name);
        let start = Instant::now();
        
        let output = Command::new("cargo")
            .args(&["test", "--test", "lib", test_filter, "--", "--nocapture"])
            .output()
            .expect("Failed to execute test command");
        
        let duration = start.elapsed();
        let success = output.status.success();
        let output_str = String::from_utf8_lossy(&output.stdout).to_string() + 
                        &String::from_utf8_lossy(&output.stderr).to_string();
        
        let result = TestResult {
            name: test_name.to_string(),
            passed: success,
            duration,
            output: output_str,
        };
        
        if success {
            println!("✅ {} completed in {:?}", test_name, duration);
        } else {
            println!("❌ {} failed in {:?}", test_name, duration);
        }
        
        self.results.push(result);
    }
    
    /// 全テストスイートを実行
    async fn run_all_tests(&mut self) {
        println!("🚀 Starting Cosmic Gardener Backend Integration Tests");
        println!("=" .repeat(60));
        
        // 基本セットアップテスト
        self.run_test("Basic Setup", "test_basic_setup").await;
        
        // 正常系フローテスト
        self.run_test("Authentication Flow", "test_complete_auth_flow").await;
        self.run_test("Token Refresh Flow", "test_token_refresh_flow").await;
        self.run_test("Logout Flow", "test_logout_flow").await;
        self.run_test("Multiple Sessions", "test_multiple_sessions").await;
        
        // エラーハンドリングテスト
        self.run_test("Authentication Errors", "test_authentication_errors").await;
        self.run_test("Validation Errors", "test_validation_errors").await;
        self.run_test("Resource Errors", "test_resource_errors").await;
        self.run_test("Conflict Errors", "test_conflict_errors").await;
        self.run_test("Login Failure Errors", "test_login_failure_errors").await;
        
        // 境界値テスト
        self.run_test("String Length Boundaries", "test_string_length_boundaries").await;
        self.run_test("Password Length Boundaries", "test_password_length_boundaries").await;
        self.run_test("Email Boundaries", "test_email_boundaries").await;
        self.run_test("Numeric Boundaries", "test_numeric_boundaries").await;
        self.run_test("Unicode Boundaries", "test_unicode_boundaries").await;
        
        // 並行性テスト
        self.run_test("Concurrent User Registration", "test_concurrent_user_registration").await;
        self.run_test("Concurrent Duplicate Registration", "test_concurrent_duplicate_email_registration").await;
        self.run_test("Concurrent Login", "test_concurrent_login").await;
        self.run_test("Concurrent Game Save", "test_concurrent_game_save").await;
        self.run_test("High Load Performance", "test_high_load_performance").await;
        
        // パフォーマンステスト
        self.run_test("Auth Flow Performance", "test_auth_flow_performance").await;
    }
    
    /// テスト結果のサマリーを表示
    fn print_summary(&self) {
        println!("\n" + &"=" .repeat(60));
        println!("📊 Test Results Summary");
        println!("=" .repeat(60));
        
        let total_tests = self.results.len();
        let passed_tests = self.results.iter().filter(|r| r.passed).count();
        let failed_tests = total_tests - passed_tests;
        let total_duration: std::time::Duration = self.results.iter().map(|r| r.duration).sum();
        
        println!("Total Tests:     {}", total_tests);
        println!("Passed:          {} ({}%)", passed_tests, (passed_tests * 100) / total_tests);
        println!("Failed:          {} ({}%)", failed_tests, (failed_tests * 100) / total_tests);
        println!("Total Duration:  {:?}", total_duration);
        println!("Average Time:    {:?}", total_duration / total_tests as u32);
        
        if failed_tests > 0 {
            println!("\n❌ Failed Tests:");
            for result in &self.results {
                if !result.passed {
                    println!("  • {} ({:?})", result.name, result.duration);
                }
            }
        }
        
        if passed_tests == total_tests {
            println!("\n🎉 All tests passed!");
        } else {
            println!("\n⚠️  Some tests failed. Check the output above for details.");
        }
    }
}

/// メイン実行関数
#[tokio::main]
async fn main() {
    // 環境変数の設定
    std::env::set_var("RUST_LOG", "info");
    std::env::set_var("DATABASE_URL", "postgresql://localhost/cosmic_gardener_test");
    
    let mut runner = IntegrationTestRunner::new();
    
    println!("🔧 Setting up test environment...");
    
    // データベースのセットアップ（必要に応じて）
    setup_test_database().await;
    
    // 全テストを実行
    runner.run_all_tests().await;
    
    // 結果のサマリーを表示
    runner.print_summary();
    
    // テスト後のクリーンアップ
    cleanup_test_environment().await;
    
    // 失敗したテストがある場合は非ゼロ終了コード
    let failed_count = runner.results.iter().filter(|r| !r.passed).count();
    if failed_count > 0 {
        std::process::exit(1);
    }
}

/// テストデータベースのセットアップ
async fn setup_test_database() {
    println!("🗄️  Setting up test database...");
    
    // データベース作成（存在しない場合）
    let output = Command::new("createdb")
        .args(&["cosmic_gardener_test"])
        .output();
    
    match output {
        Ok(output) => {
            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr);
                if !error.contains("already exists") {
                    println!("⚠️  Database creation warning: {}", error);
                }
            }
        }
        Err(e) => {
            println!("⚠️  Could not create test database: {}", e);
            println!("    Make sure PostgreSQL is running and createdb is available");
        }
    }
    
    // マイグレーション実行
    let output = Command::new("sqlx")
        .args(&["migrate", "run", "--database-url", "postgresql://localhost/cosmic_gardener_test"])
        .current_dir(".")
        .output();
    
    match output {
        Ok(output) => {
            if output.status.success() {
                println!("✅ Database migrations completed");
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                println!("❌ Migration failed: {}", error);
            }
        }
        Err(e) => {
            println!("⚠️  Could not run migrations: {}", e);
            println!("    Make sure sqlx-cli is installed: cargo install sqlx-cli");
        }
    }
}

/// テスト環境のクリーンアップ
async fn cleanup_test_environment() {
    println!("🧹 Cleaning up test environment...");
    
    // テストデータベースのクリーンアップ
    let _output = Command::new("dropdb")
        .args(&["--if-exists", "cosmic_gardener_test"])
        .output();
    
    println!("✅ Test environment cleanup completed");
}

/// CI/CD環境での実行のためのヘルパー
#[cfg(feature = "ci")]
mod ci_helpers {
    use super::*;
    
    /// CI環境用のテスト実行
    pub async fn run_ci_tests() {
        // CI環境特有の設定
        std::env::set_var("RUST_LOG", "warn"); // ログレベルを下げる
        std::env::set_var("CI", "true");
        
        let mut runner = IntegrationTestRunner::new();
        runner.run_all_tests().await;
        
        // JUnit形式のレポート生成（オプション）
        generate_junit_report(&runner.results);
        
        runner.print_summary();
        
        let failed_count = runner.results.iter().filter(|r| !r.passed).count();
        if failed_count > 0 {
            std::process::exit(1);
        }
    }
    
    /// JUnit形式のテストレポートを生成
    fn generate_junit_report(results: &[TestResult]) {
        use std::fs::File;
        use std::io::Write;
        
        let mut file = File::create("test-results.xml").expect("Failed to create test report");
        
        writeln!(file, r#"<?xml version="1.0" encoding="UTF-8"?>"#).unwrap();
        writeln!(file, r#"<testsuite name="cosmic-gardener-backend" tests="{}" failures="{}">"#, 
                results.len(), 
                results.iter().filter(|r| !r.passed).count()).unwrap();
        
        for result in results {
            if result.passed {
                writeln!(file, r#"  <testcase name="{}" time="{:.3}"/>"#, 
                        result.name, result.duration.as_secs_f64()).unwrap();
            } else {
                writeln!(file, r#"  <testcase name="{}" time="{:.3}">"#, 
                        result.name, result.duration.as_secs_f64()).unwrap();
                writeln!(file, r#"    <failure message="Test failed">{}</failure>"#, 
                        html_escape::encode_text(&result.output)).unwrap();
                writeln!(file, r#"  </testcase>"#).unwrap();
            }
        }
        
        writeln!(file, r#"</testsuite>"#).unwrap();
    }
}