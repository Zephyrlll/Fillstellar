use actix_web::{test, web, App};
use serde_json::json;
use sqlx::{PgPool, postgres::PgPoolOptions};
use uuid::Uuid;

use cosmic_gardener_backend::{
    routes::configure_routes,
    services::JwtService,
    models::{RegisterRequest, LoginRequest, SaveGameRequest},
};

// テスト用のデータベース設定
async fn setup_test_db() -> PgPool {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:password@localhost/cosmic_gardener_test".to_string());
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database");

    // マイグレーションの実行
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

// テスト用のアプリケーションセットアップ
async fn setup_test_app() -> (
    impl actix_web::dev::Service<
        actix_web::dev::ServiceRequest,
        Response = actix_web::dev::ServiceResponse,
        Error = actix_web::Error,
    >,
    PgPool,
) {
    let pool = setup_test_db().await;
    let jwt_service = web::Data::new(JwtService::new("test_secret".to_string()));

    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(jwt_service)
            .configure(configure_routes)
    ).await;

    (app, pool)
}

#[actix_web::test]
async fn test_user_registration_and_login() {
    let (app, _pool) = setup_test_app().await;

    // ユーザー登録
    let register_data = RegisterRequest {
        email: "test@example.com".to_string(),
        username: "testuser".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/register")
        .set_json(&register_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    // ログイン
    let login_data = LoginRequest {
        email: "test@example.com".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/login")
        .set_json(&login_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["access_token"].is_string());
    assert_eq!(body["token_type"], "Bearer");
}

#[actix_web::test]
async fn test_invalid_login() {
    let (app, _pool) = setup_test_app().await;

    let login_data = LoginRequest {
        email: "nonexistent@example.com".to_string(),
        password: "wrong_password".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/login")
        .set_json(&login_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_web::test]
async fn test_protected_endpoint_without_auth() {
    let (app, _pool) = setup_test_app().await;

    let req = test::TestRequest::get()
        .uri("/api/users/me")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 401);
}

#[actix_web::test]
async fn test_protected_endpoint_with_auth() {
    let (app, _pool) = setup_test_app().await;

    // ユーザー登録
    let register_data = RegisterRequest {
        email: "test2@example.com".to_string(),
        username: "testuser2".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/register")
        .set_json(&register_data)
        .to_request();

    test::call_service(&app, req).await;

    // ログイン
    let login_data = LoginRequest {
        email: "test2@example.com".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/login")
        .set_json(&login_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let access_token = body["access_token"].as_str().unwrap();

    // 保護されたエンドポイントにアクセス
    let req = test::TestRequest::get()
        .uri("/api/users/me")
        .insert_header(("Authorization", format!("Bearer {}", access_token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["email"], "test2@example.com");
    assert_eq!(body["username"], "testuser2");
}

#[actix_web::test]
async fn test_game_save_and_load() {
    let (app, _pool) = setup_test_app().await;

    // ユーザー登録とログイン
    let register_data = RegisterRequest {
        email: "gamer@example.com".to_string(),
        username: "gamer".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/register")
        .set_json(&register_data)
        .to_request();

    test::call_service(&app, req).await;

    let login_data = LoginRequest {
        email: "gamer@example.com".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/login")
        .set_json(&login_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let access_token = body["access_token"].as_str().unwrap();

    // ゲーム状態の保存
    let game_data = json!({
        "version": "1.6-accumulator",
        "resources": {
            "cosmicDust": 1000,
            "energy": 500
        },
        "celestialBodies": [],
        "statistics": {
            "totalDustCollected": 1000,
            "totalStarsCreated": 1
        }
    });

    let save_data = SaveGameRequest {
        save_name: Some("test_save".to_string()),
        game_data: game_data.clone(),
        version: "1.6-accumulator".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/game/save")
        .insert_header(("Authorization", format!("Bearer {}", access_token)))
        .set_json(&save_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    // ゲーム状態の読み込み
    let req = test::TestRequest::get()
        .uri("/api/game/state?save_name=test_save")
        .insert_header(("Authorization", format!("Bearer {}", access_token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["save_name"], "test_save");
    assert_eq!(body["version"], "1.6-accumulator");
    assert_eq!(body["game_data"]["resources"]["cosmicDust"], 1000);
}

#[actix_web::test]
async fn test_statistics_endpoint() {
    let (app, _pool) = setup_test_app().await;

    // ユーザー登録とログイン
    let register_data = RegisterRequest {
        email: "stats@example.com".to_string(),
        username: "stats_user".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/register")
        .set_json(&register_data)
        .to_request();

    test::call_service(&app, req).await;

    let login_data = LoginRequest {
        email: "stats@example.com".to_string(),
        password: "test_password_123".to_string(),
    };

    let req = test::TestRequest::post()
        .uri("/api/auth/login")
        .set_json(&login_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    let body: serde_json::Value = test::read_body_json(resp).await;
    let access_token = body["access_token"].as_str().unwrap();

    // 統計の取得
    let req = test::TestRequest::get()
        .uri("/api/game/statistics")
        .insert_header(("Authorization", format!("Bearer {}", access_token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["total_dust_collected"], 0);
    assert_eq!(body["total_stars_created"], 0);
    assert!(body["achievements"].is_array());
}

#[actix_web::test]
async fn test_validation_errors() {
    let (app, _pool) = setup_test_app().await;

    // 無効なメールアドレスでの登録
    let invalid_register_data = json!({
        "email": "invalid-email",
        "username": "test",
        "password": "short"
    });

    let req = test::TestRequest::post()
        .uri("/api/auth/register")
        .set_json(&invalid_register_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), 400);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["code"], "VALIDATION_ERROR");
}

// クリーンアップ用のヘルパー関数
async fn cleanup_test_data(pool: &PgPool, email: &str) {
    sqlx::query!("DELETE FROM users WHERE email = $1", email)
        .execute(pool)
        .await
        .ok();
}