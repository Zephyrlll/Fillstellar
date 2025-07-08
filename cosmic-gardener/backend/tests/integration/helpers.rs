//! # テスト用ヘルパーモジュール
//!
//! 統合テストで共通して使用するユーティリティ関数

use actix_web::{test, web::Bytes, http::StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;
use cosmic_gardener_backend::{
    models::{User, CreateUserRequest, LoginRequest},
    services::JwtService,
};

/// テスト用ユーザーデータ
#[derive(Debug, Clone)]
pub struct TestUser {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub password: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
}

impl TestUser {
    /// 新しいテストユーザーを作成
    pub fn new(suffix: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            email: format!("test_user_{}@example.com", suffix),
            username: format!("test_user_{}", suffix),
            password: "test_password_123456".to_string(),
            access_token: None,
            refresh_token: None,
        }
    }
    
    /// ユーザー登録リクエストデータを作成
    pub fn to_register_request(&self) -> CreateUserRequest {
        CreateUserRequest {
            email: self.email.clone(),
            username: self.username.clone(),
            password: self.password.clone(),
        }
    }
    
    /// ログインリクエストデータを作成
    pub fn to_login_request(&self) -> LoginRequest {
        LoginRequest {
            email: self.email.clone(),
            password: self.password.clone(),
        }
    }
}

/// APIレスポンスの共通構造
#[derive(Debug, Deserialize)]
pub struct ApiResponse<T> {
    pub data: Option<T>,
    pub error: Option<ApiError>,
}

#[derive(Debug, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub details: Option<Value>,
}

/// 認証レスポンス
#[derive(Debug, Deserialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub user: User,
}

/// ゲームセーブデータ
#[derive(Debug, Serialize, Deserialize)]
pub struct TestGameSave {
    pub save_name: String,
    pub game_data: Value,
    pub version: String,
}

impl Default for TestGameSave {
    fn default() -> Self {
        Self {
            save_name: "test_save".to_string(),
            game_data: json!({
                "version": "1.6-accumulator",
                "resources": {
                    "cosmicDust": 1000,
                    "energy": 500,
                    "organicMatter": 0,
                    "biomass": 0,
                    "darkMatter": 0,
                    "thoughtPoints": 0
                },
                "celestialBodies": [],
                "research": {
                    "unlockedTechnologies": []
                },
                "statistics": {
                    "totalDustCollected": 1000,
                    "totalStarsCreated": 0,
                    "totalPlanetsCreated": 0,
                    "totalPlayTime": 300
                }
            }),
            version: "1.6-accumulator".to_string(),
        }
    }
}

/// HTTPリクエストヘルパー
pub struct RequestHelper;

impl RequestHelper {
    /// GETリクエストを送信
    pub async fn get(
        app: &mut actix_web::dev::TestServer,
        path: &str,
        token: Option<&str>,
    ) -> (StatusCode, Bytes) {
        let mut req = test::TestRequest::get().uri(path);
        
        if let Some(token) = token {
            req = req.insert_header(("Authorization", format!("Bearer {}", token)));
        }
        
        let req = req.to_request();
        let resp = test::call_service(app, req).await;
        let status = resp.status();
        let body = test::read_body(resp).await;
        
        (status, body)
    }
    
    /// POSTリクエストを送信
    pub async fn post<T: Serialize>(
        app: &mut actix_web::dev::TestServer,
        path: &str,
        data: &T,
        token: Option<&str>,
    ) -> (StatusCode, Bytes) {
        let mut req = test::TestRequest::post()
            .uri(path)
            .set_json(data);
        
        if let Some(token) = token {
            req = req.insert_header(("Authorization", format!("Bearer {}", token)));
        }
        
        let req = req.to_request();
        let resp = test::call_service(app, req).await;
        let status = resp.status();
        let body = test::read_body(resp).await;
        
        (status, body)
    }
    
    /// PUTリクエストを送信
    pub async fn put<T: Serialize>(
        app: &mut actix_web::dev::TestServer,
        path: &str,
        data: &T,
        token: Option<&str>,
    ) -> (StatusCode, Bytes) {
        let mut req = test::TestRequest::put()
            .uri(path)
            .set_json(data);
        
        if let Some(token) = token {
            req = req.insert_header(("Authorization", format!("Bearer {}", token)));
        }
        
        let req = req.to_request();
        let resp = test::call_service(app, req).await;
        let status = resp.status();
        let body = test::read_body(resp).await;
        
        (status, body)
    }
    
    /// DELETEリクエストを送信
    pub async fn delete(
        app: &mut actix_web::dev::TestServer,
        path: &str,
        token: Option<&str>,
    ) -> (StatusCode, Bytes) {
        let mut req = test::TestRequest::delete().uri(path);
        
        if let Some(token) = token {
            req = req.insert_header(("Authorization", format!("Bearer {}", token)));
        }
        
        let req = req.to_request();
        let resp = test::call_service(app, req).await;
        let status = resp.status();
        let body = test::read_body(resp).await;
        
        (status, body)
    }
}

/// アサーションヘルパー
pub struct AssertHelper;

impl AssertHelper {
    /// JSONレスポンスから特定のフィールドを抽出
    pub fn extract_json_field(body: &Bytes, field: &str) -> Option<Value> {
        let json: Value = serde_json::from_slice(body).ok()?;
        json.get(field).cloned()
    }
    
    /// エラーレスポンスの検証
    pub fn assert_error_response(
        body: &Bytes,
        expected_code: &str,
        status: StatusCode,
    ) {
        let json: Value = serde_json::from_slice(body)
            .expect("Failed to parse error response as JSON");
        
        assert_eq!(status.is_client_error() || status.is_server_error(), true);
        
        let error_code = json["error"]["code"].as_str()
            .expect("Error response missing code field");
        assert_eq!(error_code, expected_code);
        
        let message = json["error"]["message"].as_str()
            .expect("Error response missing message field");
        assert!(!message.is_empty());
    }
    
    /// 認証成功レスポンスの検証
    pub fn assert_auth_success(body: &Bytes, status: StatusCode) -> AuthResponse {
        assert_eq!(status, StatusCode::OK);
        
        let auth_response: AuthResponse = serde_json::from_slice(body)
            .expect("Failed to parse auth response");
        
        assert!(!auth_response.access_token.is_empty());
        assert_eq!(auth_response.token_type, "Bearer");
        assert!(auth_response.expires_in > 0);
        assert!(!auth_response.user.id.to_string().is_empty());
        
        auth_response
    }
    
    /// ユーザー登録成功レスポンスの検証
    pub fn assert_register_success(body: &Bytes, status: StatusCode) -> User {
        assert_eq!(status, StatusCode::CREATED);
        
        let user: User = serde_json::from_slice(body)
            .expect("Failed to parse user response");
        
        assert!(!user.id.to_string().is_empty());
        assert!(!user.email.is_empty());
        assert!(!user.username.is_empty());
        assert!(user.created_at.is_some());
        
        user
    }
    
    /// ゲームデータレスポンスの検証
    pub fn assert_game_data_response(body: &Bytes, status: StatusCode) -> Value {
        assert_eq!(status, StatusCode::OK);
        
        let response: Value = serde_json::from_slice(body)
            .expect("Failed to parse game data response");
        
        assert!(response["save_name"].is_string());
        assert!(response["game_data"].is_object());
        assert!(response["version"].is_string());
        assert!(response["created_at"].is_string());
        assert!(response["updated_at"].is_string());
        
        response
    }
}

/// データベースヘルパー
pub struct DbHelper;

impl DbHelper {
    /// ユーザーが存在するかチェック
    pub async fn user_exists(pool: &PgPool, email: &str) -> bool {
        let result = sqlx::query!("SELECT id FROM users WHERE email = $1", email)
            .fetch_optional(pool)
            .await;
        
        result.unwrap_or(None).is_some()
    }
    
    /// ユーザーを削除
    pub async fn delete_user(pool: &PgPool, email: &str) {
        sqlx::query!("DELETE FROM users WHERE email = $1", email)
            .execute(pool)
            .await
            .expect("Failed to delete test user");
    }
    
    /// ゲームセーブの数を取得
    pub async fn count_game_saves(pool: &PgPool, user_id: Uuid) -> i64 {
        let result = sqlx::query!(
            "SELECT COUNT(*) as count FROM game_saves WHERE user_id = $1",
            user_id
        )
        .fetch_one(pool)
        .await
        .expect("Failed to count game saves");
        
        result.count.unwrap_or(0)
    }
    
    /// リフレッシュトークンが存在するかチェック
    pub async fn refresh_token_exists(pool: &PgPool, token_hash: &str) -> bool {
        let result = sqlx::query!(
            "SELECT id FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL",
            token_hash
        )
        .fetch_optional(pool)
        .await;
        
        result.unwrap_or(None).is_some()
    }
}

/// パフォーマンス測定ヘルパー
pub struct PerformanceHelper;

impl PerformanceHelper {
    /// リクエストの実行時間を測定
    pub async fn measure_request<F, Fut, R>(operation: F) -> (R, std::time::Duration)
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = R>,
    {
        let start = std::time::Instant::now();
        let result = operation().await;
        let duration = start.elapsed();
        (result, duration)
    }
    
    /// レスポンス時間をアサート（ミリ秒）
    pub fn assert_response_time(duration: std::time::Duration, max_ms: u64) {
        assert!(
            duration.as_millis() <= max_ms as u128,
            "Response time {}ms exceeded maximum {}ms",
            duration.as_millis(),
            max_ms
        );
    }
}

/// 並行性テスト用ヘルパー
pub struct ConcurrencyHelper;

impl ConcurrencyHelper {
    /// 複数の非同期タスクを並行実行
    pub async fn run_concurrent<F, Fut, R>(
        count: usize,
        task_factory: F,
    ) -> Vec<R>
    where
        F: Fn(usize) -> Fut,
        Fut: std::future::Future<Output = R>,
        R: Send + 'static,
    {
        let tasks: Vec<_> = (0..count)
            .map(|i| tokio::spawn(task_factory(i)))
            .collect();
        
        let mut results = Vec::new();
        for task in tasks {
            results.push(task.await.expect("Task panicked"));
        }
        
        results
    }
    
    /// 並行実行の成功/失敗率を分析
    pub fn analyze_concurrent_results<T, E>(
        results: &[Result<T, E>],
    ) -> (usize, usize, f64) {
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let failure_count = results.len() - success_count;
        let success_rate = success_count as f64 / results.len() as f64;
        
        (success_count, failure_count, success_rate)
    }
}