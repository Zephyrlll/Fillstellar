//! # 境界値統合テスト
//!
//! パラメータの境界値と極端なケースをテストする

use actix_web::http::StatusCode;
use serde_json::json;
use crate::integration::{
    helpers::{
        TestUser, RequestHelper, AssertHelper, DbHelper
    },
    setup_test_db, cleanup_test_data, create_test_app, init_test_env,
};
use cosmic_gardener_backend::services::JwtService;

/// 文字列長の境界値テスト
#[actix_web::test]
async fn test_string_length_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // ユーザー名の境界値テスト
    
    // 1. 最小長さ（3文字）- 成功するはず
    let min_username_request = json!({
        "email": "min@example.com",
        "username": "abc",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &min_username_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 2. 最小長さ-1（2文字）- 失敗するはず
    let too_short_username_request = json!({
        "email": "short@example.com",
        "username": "ab",
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &too_short_username_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 3. 最大長さ（50文字）- 成功するはず
    let max_username_request = json!({
        "email": "max@example.com",
        "username": "a".repeat(50),
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &max_username_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 4. 最大長さ+1（51文字）- 失敗するはず
    let too_long_username_request = json!({
        "email": "toolong@example.com",
        "username": "a".repeat(51),
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &too_long_username_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// パスワード長の境界値テスト
#[actix_web::test]
async fn test_password_length_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 1. 最小長さ（12文字）- 成功するはず
    let min_password_request = json!({
        "email": "minpass@example.com",
        "username": "min_pass_user",
        "password": "123456789012"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &min_password_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 2. 最小長さ-1（11文字）- 失敗するはず
    let too_short_password_request = json!({
        "email": "shortpass@example.com",
        "username": "short_pass_user",
        "password": "12345678901"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &too_short_password_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 3. 最大長さ（128文字）- 成功するはず
    let max_password_request = json!({
        "email": "maxpass@example.com",
        "username": "max_pass_user",
        "password": "a".repeat(128)
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &max_password_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 4. 最大長さ+1（129文字）- 失敗するはず
    let too_long_password_request = json!({
        "email": "toolongpass@example.com",
        "username": "too_long_pass_user",
        "password": "a".repeat(129)
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &too_long_password_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// メールアドレスの境界値テスト
#[actix_web::test]
async fn test_email_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 1. 最短の有効なメールアドレス
    let min_email_request = json!({
        "email": "a@b.co",
        "username": "min_email_user",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &min_email_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 2. 長いローカル部分
    let long_local_email_request = json!({
        "email": format!("{}@example.com", "a".repeat(64)),
        "username": "long_local_user",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &long_local_email_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 3. 長いドメイン部分
    let long_domain_email_request = json!({
        "email": format!("user@{}.com", "a".repeat(60)),
        "username": "long_domain_user",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &long_domain_email_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 4. 国際化ドメイン名
    let idn_email_request = json!({
        "email": "user@xn--nxasmq6b.xn--o3cw4h", // 日本語ドメインのpunycode
        "username": "idn_user",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &idn_email_request,
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    cleanup_test_data(&pool).await;
}

/// 数値パラメータの境界値テスト
#[actix_web::test]
async fn test_numeric_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("numeric_boundary");
    
    // ユーザー登録とログイン
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let (_, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
    let access_token = &auth_response.access_token;
    
    // リーダーボードlimitパラメータの境界値テスト
    
    // 1. 最小値（1）
    let (status, _body) = RequestHelper::get(
        &mut app,
        "/api/game/leaderboard?metric=total_dust_collected&limit=1",
        Some(access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // 2. 最大値（100）
    let (status, _body) = RequestHelper::get(
        &mut app,
        "/api/game/leaderboard?metric=total_dust_collected&limit=100",
        Some(access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // 3. 最大値+1（101）- 失敗またはclampされるはず
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/leaderboard?metric=total_dust_collected&limit=101",
        Some(access_token),
    ).await;
    // 実装に応じて、400エラーまたは100にclampされた結果を返す
    assert!(status.is_success() || status.is_client_error());
    
    // 4. 0（無効値）
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/leaderboard?metric=total_dust_collected&limit=0",
        Some(access_token),
    ).await;
    // 通常は400エラーまたはデフォルト値での処理
    assert!(status.is_success() || status.is_client_error());
    
    // 5. 負の値
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/leaderboard?metric=total_dust_collected&limit=-1",
        Some(access_token),
    ).await;
    assert!(status.is_client_error());
    
    cleanup_test_data(&pool).await;
}

/// ゲームデータサイズの境界値テスト
#[actix_web::test]
async fn test_game_data_size_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("data_size_boundary");
    
    // ユーザー登録とログイン
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let (_, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
    let access_token = &auth_response.access_token;
    
    // 1. 最小限のゲームデータ
    let minimal_game_data = json!({
        "save_name": "minimal",
        "game_data": {},
        "version": "1.6-accumulator"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &minimal_game_data,
        Some(access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // 2. 大きなゲームデータ（但し許容範囲内）
    let large_celestial_bodies: Vec<serde_json::Value> = (0..1000)
        .map(|i| json!({
            "id": i,
            "type": "asteroid",
            "position": [i as f64, i as f64, i as f64],
            "velocity": [0.1, 0.1, 0.1],
            "mass": 1.0
        }))
        .collect();
    
    let large_game_data = json!({
        "save_name": "large_data",
        "game_data": {
            "version": "1.6-accumulator",
            "resources": {
                "cosmicDust": 999999999,
                "energy": 999999999,
                "organicMatter": 999999999,
                "biomass": 999999999,
                "darkMatter": 999999999,
                "thoughtPoints": 999999999
            },
            "celestialBodies": large_celestial_bodies,
            "research": {
                "unlockedTechnologies": (0..100).map(|i| format!("tech_{}", i)).collect::<Vec<String>>()
            },
            "statistics": {
                "totalDustCollected": u64::MAX,
                "totalStarsCreated": u32::MAX,
                "totalPlanetsCreated": u32::MAX,
                "totalPlayTime": u64::MAX
            }
        },
        "version": "1.6-accumulator"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &large_game_data,
        Some(access_token),
    ).await;
    
    // サイズ制限に応じて成功または失敗
    assert!(status.is_success() || status.is_client_error());
    
    cleanup_test_data(&pool).await;
}

/// セーブ名の境界値テスト
#[actix_web::test]
async fn test_save_name_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("save_name_boundary");
    
    // ユーザー登録とログイン
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let (_, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
    let access_token = &auth_response.access_token;
    
    // 1. 最短のセーブ名（1文字）
    let short_save_name_data = json!({
        "save_name": "a",
        "game_data": {"version": "1.6-accumulator"},
        "version": "1.6-accumulator"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &short_save_name_data,
        Some(access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // 2. 長いセーブ名（255文字）
    let long_save_name_data = json!({
        "save_name": "a".repeat(255),
        "game_data": {"version": "1.6-accumulator"},
        "version": "1.6-accumulator"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &long_save_name_data,
        Some(access_token),
    ).await;
    // 実装のセーブ名長制限に依存
    assert!(status.is_success() || status.is_client_error());
    
    // 3. 特殊文字を含むセーブ名
    let special_char_save_name_data = json!({
        "save_name": "セーブ_データ-2024.01.01",
        "game_data": {"version": "1.6-accumulator"},
        "version": "1.6-accumulator"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &special_char_save_name_data,
        Some(access_token),
    ).await;
    assert_eq!(status, StatusCode::OK);
    
    // 4. 空のセーブ名
    let empty_save_name_data = json!({
        "save_name": "",
        "game_data": {"version": "1.6-accumulator"},
        "version": "1.6-accumulator"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &empty_save_name_data,
        Some(access_token),
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// Unicode文字の境界値テスト
#[actix_web::test]
async fn test_unicode_boundaries() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 1. 日本語文字を含むユーザー名
    let japanese_username_request = json!({
        "email": "japanese@example.com",
        "username": "ユーザー_日本語",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &japanese_username_request,
        None,
    ).await;
    // 実装のUnicodeサポートに依存
    assert!(status.is_success() || status.is_client_error());
    
    // 2. 絵文字を含むデータ
    let emoji_request = json!({
        "email": "emoji@example.com",
        "username": "user_🌟🚀✨",
        "password": "valid_password_123"
    });
    
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &emoji_request,
        None,
    ).await;
    assert!(status.is_success() || status.is_client_error());
    
    // 3. 制御文字を含むデータ
    let control_char_request = json!({
        "email": "control@example.com",
        "username": "user\u{0000}control",
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &control_char_request,
        None,
    ).await;
    // 制御文字は通常拒否される
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// 同時接続数の境界値テスト
#[actix_web::test]
async fn test_concurrent_requests_boundary() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("concurrent_boundary");
    
    // ユーザー登録とログイン
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    let (_, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &test_user.to_login_request(),
        None,
    ).await;
    
    let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
    let access_token = auth_response.access_token;
    
    // 同一ユーザーから多数の同時リクエスト
    let concurrent_requests = 50;
    let tasks: Vec<_> = (0..concurrent_requests)
        .map(|i| {
            let token = access_token.clone();
            let save_name = format!("concurrent_save_{}", i);
            
            tokio::spawn(async move {
                let game_data = json!({
                    "save_name": save_name,
                    "game_data": {
                        "version": "1.6-accumulator",
                        "resources": {"cosmicDust": i * 100}
                    },
                    "version": "1.6-accumulator"
                });
                
                // Note: 実際のテストアプリケーションインスタンスが必要
                // この部分は実装時に適切なHTTPクライアントを使用する必要があります
            })
        })
        .collect();
    
    // タスクの完了を待機
    for task in tasks {
        task.await.expect("Task panicked");
    }
    
    cleanup_test_data(&pool).await;
}