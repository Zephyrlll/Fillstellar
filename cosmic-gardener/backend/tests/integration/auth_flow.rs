//! # 認証フロー統合テスト
//!
//! 正常系の認証フローを包括的にテストする

use actix_web::http::StatusCode;
use serde_json::json;
use crate::integration::{
    helpers::{
        TestUser, RequestHelper, AssertHelper, DbHelper, PerformanceHelper
    },
    setup_test_db, cleanup_test_data, create_test_app, init_test_env,
};
use cosmic_gardener_backend::services::JwtService;

/// 完全な認証フローテスト
/// 
/// 1. ユーザー登録
/// 2. ログイン（アクセストークン取得）
/// 3. 認証が必要なAPI呼び出し
/// 4. トークンリフレッシュ
/// 5. ログアウト
#[actix_web::test]
async fn test_complete_auth_flow() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("auth_flow");
    
    // 1. ユーザー登録
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let user = AssertHelper::assert_register_success(&body, status);
    assert_eq!(user.email, test_user.email);
    assert_eq!(user.username, test_user.username);
    
    // データベースでユーザー作成を確認
    assert!(DbHelper::user_exists(&pool, &test_user.email).await);
    
    // 2. ログイン
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, status);
    let access_token = &auth_response.access_token;
    
    // 3. 認証が必要なAPI呼び出し（プロフィール取得）
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some(access_token),
    ).await;
    
    assert_eq!(status, StatusCode::OK);
    let profile = AssertHelper::extract_json_field(&body, "email")
        .expect("Profile response missing email");
    assert_eq!(profile.as_str().unwrap(), test_user.email);
    
    // 4. ゲームデータの保存テスト
    let game_save = json!({
        "save_name": "test_save_auth_flow",
        "game_data": {
            "version": "1.6-accumulator",
            "resources": {
                "cosmicDust": 1500,
                "energy": 750
            }
        },
        "version": "1.6-accumulator"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &game_save,
        Some(access_token),
    ).await;
    
    assert_eq!(status, StatusCode::OK);
    assert!(AssertHelper::extract_json_field(&body, "save_name").is_some());
    
    // 5. ゲームデータの読み込みテスト
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/state?save_name=test_save_auth_flow",
        Some(access_token),
    ).await;
    
    AssertHelper::assert_game_data_response(&body, status);
    
    // 6. 統計情報の取得テスト
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/statistics",
        Some(access_token),
    ).await;
    
    assert_eq!(status, StatusCode::OK);
    let stats = serde_json::from_slice::<serde_json::Value>(&body)
        .expect("Failed to parse statistics response");
    assert!(stats.is_array());
    
    // 7. リーダーボードの取得テスト
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/leaderboard?metric=total_dust_collected&limit=10",
        Some(access_token),
    ).await;
    
    assert_eq!(status, StatusCode::OK);
    let leaderboard = serde_json::from_slice::<serde_json::Value>(&body)
        .expect("Failed to parse leaderboard response");
    assert!(leaderboard.is_array());
    
    cleanup_test_data(&pool).await;
}

/// トークンリフレッシュフローテスト
#[actix_web::test]
async fn test_token_refresh_flow() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("refresh_flow");
    
    // ユーザー登録とログイン
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, status);
    let refresh_token = AssertHelper::extract_json_field(&body, "refresh_token")
        .expect("Login response missing refresh_token")
        .as_str()
        .unwrap()
        .to_string();
    
    // トークンリフレッシュ
    let refresh_request = json!({
        "refresh_token": refresh_token
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/refresh",
        &refresh_request,
        None,
    ).await;
    
    let new_auth_response = AssertHelper::assert_auth_success(&body, status);
    
    // 新しいアクセストークンが異なることを確認
    assert_ne!(auth_response.access_token, new_auth_response.access_token);
    
    // 新しいトークンで認証が必要なAPIを呼び出し
    let (status, _body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some(&new_auth_response.access_token),
    ).await;
    
    assert_eq!(status, StatusCode::OK);
    
    cleanup_test_data(&pool).await;
}

/// ログアウトフローテスト
#[actix_web::test]
async fn test_logout_flow() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("logout_flow");
    
    // ユーザー登録とログイン
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, status);
    let refresh_token = AssertHelper::extract_json_field(&body, "refresh_token")
        .expect("Login response missing refresh_token")
        .as_str()
        .unwrap()
        .to_string();
    
    // ログアウト前にトークンが有効であることを確認
    let (status, _body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some(&auth_response.access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // ログアウト
    let logout_request = json!({
        "refresh_token": refresh_token
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/logout",
        &logout_request,
        None,
    ).await;
    
    assert_eq!(status, StatusCode::OK);
    
    // ログアウト後はリフレッシュトークンで新しいアクセストークンを取得できない
    let refresh_request = json!({
        "refresh_token": refresh_token
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/refresh",
        &refresh_request,
        None,
    ).await;
    
    AssertHelper::assert_error_response(&body, "AUTH_003", status);
    
    cleanup_test_data(&pool).await;
}

/// 複数セッション管理テスト
#[actix_web::test]
async fn test_multiple_sessions() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("multi_session");
    
    // ユーザー登録
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    // 最初のログイン
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth1 = AssertHelper::assert_auth_success(&body, status);
    
    // 2回目のログイン（別セッション）
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth2 = AssertHelper::assert_auth_success(&body, status);
    
    // 両方のトークンが有効であることを確認
    let (status, _body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some(&auth1.access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    let (status, _body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some(&auth2.access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // 異なるアクセストークンが発行されていることを確認
    assert_ne!(auth1.access_token, auth2.access_token);
    
    cleanup_test_data(&pool).await;
}

/// パフォーマンステスト - 認証フローの応答時間
#[actix_web::test]
async fn test_auth_flow_performance() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("performance");
    
    // ユーザー登録の応答時間測定
    let (response, duration) = PerformanceHelper::measure_request(|| async {
        RequestHelper::post(
            &mut app,
            "/api/auth/register",
            &test_user.to_register_request(),
            None,
        ).await
    }).await;
    
    assert_eq!(response.0, StatusCode::CREATED);
    PerformanceHelper::assert_response_time(duration, 2000); // 2秒以内
    
    // ログインの応答時間測定
    let (response, duration) = PerformanceHelper::measure_request(|| async {
        RequestHelper::post(
            &mut app,
            "/api/auth/login",
            &test_user.to_login_request(),
            None,
        ).await
    }).await;
    
    assert_eq!(response.0, StatusCode::OK);
    PerformanceHelper::assert_response_time(duration, 1000); // 1秒以内
    
    let auth_response = AssertHelper::assert_auth_success(&response.1, response.0);
    
    // 認証API呼び出しの応答時間測定
    let (response, duration) = PerformanceHelper::measure_request(|| async {
        RequestHelper::get(
            &mut app,
            "/api/users/me",
            Some(&auth_response.access_token),
        ).await
    }).await;
    
    assert_eq!(response.0, StatusCode::OK);
    PerformanceHelper::assert_response_time(duration, 500); // 500ms以内
    
    cleanup_test_data(&pool).await;
}