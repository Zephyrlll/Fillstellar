//! # エラーハンドリング統合テスト
//!
//! 異常系のエラーハンドリングを包括的にテストする

use actix_web::http::StatusCode;
use serde_json::json;
use crate::integration::{
    helpers::{
        TestUser, RequestHelper, AssertHelper, DbHelper
    },
    setup_test_db, cleanup_test_data, create_test_app, init_test_env,
};
use cosmic_gardener_backend::services::JwtService;

/// 認証エラーテスト
#[actix_web::test]
async fn test_authentication_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 1. 認証ヘッダーなしでのアクセス
    let (status, body) = RequestHelper::get(&mut app, "/api/users/me", None).await;
    AssertHelper::assert_error_response(&body, "AUTH_001", status);
    
    // 2. 無効なトークン形式
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some("invalid_token_format"),
    ).await;
    AssertHelper::assert_error_response(&body, "AUTH_002", status);
    
    // 3. 偽造されたトークン
    let fake_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.invalid_signature";
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/users/me",
        Some(fake_token),
    ).await;
    AssertHelper::assert_error_response(&body, "AUTH_002", status);
    
    // 4. 期限切れトークンのテスト（実装上は短期間のトークンを作成）
    // Note: 実際の期限切れテストは時間制御が必要なため、別途専用テストを作成
    
    cleanup_test_data(&pool).await;
}

/// バリデーションエラーテスト
#[actix_web::test]
async fn test_validation_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 1. 無効なメールアドレス
    let invalid_email_request = json!({
        "email": "not_an_email",
        "username": "valid_user",
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &invalid_email_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 2. 短すぎるユーザー名
    let short_username_request = json!({
        "email": "valid@example.com",
        "username": "ab",
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &short_username_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 3. 短すぎるパスワード
    let short_password_request = json!({
        "email": "valid@example.com",
        "username": "valid_user",
        "password": "short"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &short_password_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 4. 長すぎるユーザー名
    let long_username_request = json!({
        "email": "valid@example.com",
        "username": "a".repeat(51),
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &long_username_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 5. 必須フィールドの欠落
    let missing_fields_request = json!({
        "email": "valid@example.com"
        // username と password が欠落
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &missing_fields_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 6. 空の文字列
    let empty_fields_request = json!({
        "email": "",
        "username": "",
        "password": ""
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &empty_fields_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// リソースエラーテスト
#[actix_web::test]
async fn test_resource_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("resource_error");
    
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
    
    // 1. 存在しないゲームセーブの取得
    let (status, body) = RequestHelper::get(
        &mut app,
        "/api/game/state?save_name=nonexistent_save",
        Some(access_token),
    ).await;
    AssertHelper::assert_error_response(&body, "RESOURCE_001", status);
    
    // 2. 存在しないユーザーの統計情報取得（別ユーザーのIDを使用）
    let fake_user_id = uuid::Uuid::new_v4();
    let (status, body) = RequestHelper::get(
        &mut app,
        &format!("/api/users/{}/statistics", fake_user_id),
        Some(access_token),
    ).await;
    // このエンドポイントは認可エラーか404エラーになるはず
    assert!(status.is_client_error());
    
    cleanup_test_data(&pool).await;
}

/// 競合エラーテスト
#[actix_web::test]
async fn test_conflict_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("conflict_error");
    
    // 最初のユーザー登録
    let (status, _body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    assert_eq!(status, StatusCode::CREATED);
    
    // 1. 同じメールアドレスでの再登録
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "RESOURCE_002", status);
    
    // 2. 同じユーザー名での再登録（異なるメールアドレス）
    let duplicate_username_request = json!({
        "email": "different@example.com",
        "username": test_user.username,
        "password": "valid_password_123"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &duplicate_username_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "RESOURCE_002", status);
    
    cleanup_test_data(&pool).await;
}

/// 認可エラーテスト
#[actix_web::test]
async fn test_authorization_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let user1 = TestUser::new("auth_user1");
    let user2 = TestUser::new("auth_user2");
    
    // 2人のユーザーを登録
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &user1.to_register_request(),
        None,
    ).await;
    
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &user2.to_register_request(),
        None,
    ).await;
    
    // user1でログイン
    let (_, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &user1.to_login_request(),
        None,
    ).await;
    
    let auth1 = AssertHelper::assert_auth_success(&body, StatusCode::OK);
    
    // user2でログイン
    let (_, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &user2.to_login_request(),
        None,
    ).await;
    
    let auth2 = AssertHelper::assert_auth_success(&body, StatusCode::OK);
    
    // user1でゲームデータを保存
    let game_save = json!({
        "save_name": "user1_private_save",
        "game_data": {
            "version": "1.6-accumulator",
            "resources": { "cosmicDust": 1000 }
        },
        "version": "1.6-accumulator"
    });
    
    RequestHelper::post(
        &mut app,
        "/api/game/save",
        &game_save,
        Some(&auth1.access_token),
    ).await;
    
    // user2がuser1のゲームデータにアクセスしようとする
    // Note: 現在のAPI設計では、save_nameによるアクセス制御は実装されていない可能性があります
    // 実際の実装に合わせて調整が必要
    
    cleanup_test_data(&pool).await;
}

/// 無効なリフレッシュトークンテスト
#[actix_web::test]
async fn test_invalid_refresh_token_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 1. 存在しないリフレッシュトークン
    let invalid_refresh_request = json!({
        "refresh_token": "nonexistent_refresh_token"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/refresh",
        &invalid_refresh_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "AUTH_003", status);
    
    // 2. 空のリフレッシュトークン
    let empty_refresh_request = json!({
        "refresh_token": ""
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/refresh",
        &empty_refresh_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    // 3. リフレッシュトークンフィールドの欠落
    let missing_refresh_request = json!({});
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/refresh",
        &missing_refresh_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// ログイン失敗テスト
#[actix_web::test]
async fn test_login_failure_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("login_fail");
    
    // ユーザー登録
    RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &test_user.to_register_request(),
        None,
    ).await;
    
    // 1. 存在しないメールアドレスでのログイン
    let nonexistent_user_request = json!({
        "email": "nonexistent@example.com",
        "password": "any_password"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &nonexistent_user_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "AUTH_004", status);
    
    // 2. 間違ったパスワードでのログイン
    let wrong_password_request = json!({
        "email": test_user.email,
        "password": "wrong_password"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &wrong_password_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "AUTH_004", status);
    
    // 3. 空のパスワードでのログイン
    let empty_password_request = json!({
        "email": test_user.email,
        "password": ""
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/login",
        &empty_password_request,
        None,
    ).await;
    AssertHelper::assert_error_response(&body, "VALIDATION_001", status);
    
    cleanup_test_data(&pool).await;
}

/// 大量データエラーテスト
#[actix_web::test]
async fn test_large_data_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    let test_user = TestUser::new("large_data");
    
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
    
    // 極端に大きなゲームデータの保存試行
    let huge_game_data = json!({
        "save_name": "huge_save",
        "game_data": {
            "version": "1.6-accumulator",
            "resources": {
                "cosmicDust": 1000,
                "huge_field": "x".repeat(10_000_000) // 10MB の文字列
            }
        },
        "version": "1.6-accumulator"
    });
    
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/game/save",
        &huge_game_data,
        Some(access_token),
    ).await;
    
    // ペイロードサイズ制限によるエラー
    assert!(status.is_client_error());
    
    cleanup_test_data(&pool).await;
}

/// JSONパースエラーテスト
#[actix_web::test]
async fn test_json_parse_errors() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let mut app = create_test_app(pool.clone(), jwt_service);
    
    // 無効なJSONの送信
    let (status, body) = RequestHelper::post(
        &mut app,
        "/api/auth/register",
        &"{ invalid json",
        None,
    ).await;
    
    // JSONパースエラー
    assert!(status.is_client_error());
    
    cleanup_test_data(&pool).await;
}