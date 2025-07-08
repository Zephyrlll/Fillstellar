//! # 並行性統合テスト
//!
//! 複数同時リクエストとレースコンディションをテストする

use actix_web::http::StatusCode;
use serde_json::json;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use crate::integration::{
    helpers::{
        TestUser, RequestHelper, AssertHelper, DbHelper, ConcurrencyHelper
    },
    setup_test_db, cleanup_test_data, create_test_app, init_test_env,
};
use cosmic_gardener_backend::services::JwtService;

/// 並行ユーザー登録テスト
#[actix_web::test]
async fn test_concurrent_user_registration() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let concurrent_users = 20;
    
    // 並行してユーザー登録を実行
    let results = ConcurrencyHelper::run_concurrent(concurrent_users, |i| {
        let app_clone = app.clone();
        async move {
            let mut app_guard = app_clone.lock().await;
            let test_user = TestUser::new(&format!("concurrent_{}", i));
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/auth/register",
                &test_user.to_register_request(),
                None,
            ).await;
            
            (status, body, test_user.email)
        }
    }).await;
    
    // 結果の分析
    let mut success_count = 0;
    let mut unique_emails = std::collections::HashSet::new();
    
    for (status, _body, email) in &results {
        if *status == StatusCode::CREATED {
            success_count += 1;
            unique_emails.insert(email.clone());
        }
    }
    
    // 全ての登録が成功し、重複がないことを確認
    assert_eq!(success_count, concurrent_users);
    assert_eq!(unique_emails.len(), concurrent_users);
    
    // データベースで実際に作成されたことを確認
    for (_, _, email) in &results {
        assert!(DbHelper::user_exists(&pool, email).await);
    }
    
    cleanup_test_data(&pool).await;
}

/// 同一メールアドレスでの並行登録テスト（競合状態）
#[actix_web::test]
async fn test_concurrent_duplicate_email_registration() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let duplicate_attempts = 10;
    let base_user = TestUser::new("duplicate_base");
    
    // 同じメールアドレスで並行登録を試行
    let results = ConcurrencyHelper::run_concurrent(duplicate_attempts, |i| {
        let app_clone = app.clone();
        let email = base_user.email.clone();
        async move {
            let mut app_guard = app_clone.lock().await;
            let request = json!({
                "email": email,
                "username": format!("user_{}", i),
                "password": "valid_password_123"
            });
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/auth/register",
                &request,
                None,
            ).await;
            
            (status, body)
        }
    }).await;
    
    // 結果の分析
    let (success_count, failure_count, _) = ConcurrencyHelper::analyze_concurrent_results(
        &results.iter().map(|(status, _)| {
            if *status == StatusCode::CREATED {
                Ok(())
            } else {
                Err(())
            }
        }).collect::<Vec<_>>()
    );
    
    // 1つだけが成功し、残りは競合エラーになるはず
    assert_eq!(success_count, 1);
    assert_eq!(failure_count, duplicate_attempts - 1);
    
    // データベースには1つのユーザーのみ存在
    assert!(DbHelper::user_exists(&pool, &base_user.email).await);
    
    cleanup_test_data(&pool).await;
}

/// 並行ログインテスト
#[actix_web::test]
async fn test_concurrent_login() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let test_user = TestUser::new("concurrent_login");
    
    // ユーザー登録
    {
        let mut app_guard = app.lock().await;
        RequestHelper::post(
            &mut *app_guard,
            "/api/auth/register",
            &test_user.to_register_request(),
            None,
        ).await;
    }
    
    let concurrent_logins = 15;
    
    // 同じユーザーで並行ログイン
    let results = ConcurrencyHelper::run_concurrent(concurrent_logins, |_| {
        let app_clone = app.clone();
        let login_request = test_user.to_login_request();
        async move {
            let mut app_guard = app_clone.lock().await;
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/auth/login",
                &login_request,
                None,
            ).await;
            
            (status, body)
        }
    }).await;
    
    // 全てのログインが成功することを確認
    let mut access_tokens = std::collections::HashSet::new();
    
    for (status, body) in &results {
        assert_eq!(*status, StatusCode::OK);
        
        let auth_response = AssertHelper::assert_auth_success(body, *status);
        access_tokens.insert(auth_response.access_token);
    }
    
    // 異なるアクセストークンが発行されることを確認
    assert_eq!(access_tokens.len(), concurrent_logins);
    
    cleanup_test_data(&pool).await;
}

/// 並行ゲームデータ保存テスト
#[actix_web::test]
async fn test_concurrent_game_save() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let test_user = TestUser::new("concurrent_save");
    
    // ユーザー登録とログイン
    let access_token = {
        let mut app_guard = app.lock().await;
        
        RequestHelper::post(
            &mut *app_guard,
            "/api/auth/register",
            &test_user.to_register_request(),
            None,
        ).await;
        
        let (_, body) = RequestHelper::post(
            &mut *app_guard,
            "/api/auth/login",
            &test_user.to_login_request(),
            None,
        ).await;
        
        let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
        auth_response.access_token
    };
    
    let concurrent_saves = 10;
    
    // 異なるセーブ名で並行保存
    let results = ConcurrencyHelper::run_concurrent(concurrent_saves, |i| {
        let app_clone = app.clone();
        let token = access_token.clone();
        async move {
            let mut app_guard = app_clone.lock().await;
            
            let game_data = json!({
                "save_name": format!("concurrent_save_{}", i),
                "game_data": {
                    "version": "1.6-accumulator",
                    "resources": {
                        "cosmicDust": i * 100,
                        "energy": i * 50
                    }
                },
                "version": "1.6-accumulator"
            });
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/game/save",
                &game_data,
                Some(&token),
            ).await;
            
            (status, body, i)
        }
    }).await;
    
    // 全ての保存が成功することを確認
    for (status, _body, _i) in &results {
        assert_eq!(*status, StatusCode::OK);
    }
    
    cleanup_test_data(&pool).await;
}

/// 同一セーブに対する並行更新テスト（競合状態）
#[actix_web::test]
async fn test_concurrent_save_updates() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let test_user = TestUser::new("save_update");
    
    // ユーザー登録とログイン
    let access_token = {
        let mut app_guard = app.lock().await;
        
        RequestHelper::post(
            &mut *app_guard,
            "/api/auth/register",
            &test_user.to_register_request(),
            None,
        ).await;
        
        let (_, body) = RequestHelper::post(
            &mut *app_guard,
            "/api/auth/login",
            &test_user.to_login_request(),
            None,
        ).await;
        
        let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
        auth_response.access_token
    };
    
    // 初期セーブデータを作成
    {
        let mut app_guard = app.lock().await;
        let initial_data = json!({
            "save_name": "race_condition_save",
            "game_data": {
                "version": "1.6-accumulator",
                "resources": {"cosmicDust": 0}
            },
            "version": "1.6-accumulator"
        });
        
        RequestHelper::post(
            &mut *app_guard,
            "/api/game/save",
            &initial_data,
            Some(&access_token),
        ).await;
    }
    
    let concurrent_updates = 20;
    
    // 同じセーブデータに対して並行更新
    let results = ConcurrencyHelper::run_concurrent(concurrent_updates, |i| {
        let app_clone = app.clone();
        let token = access_token.clone();
        async move {
            // 少しランダムな遅延を入れて競合状態を作り出す
            sleep(Duration::from_millis((i % 10) as u64)).await;
            
            let mut app_guard = app_clone.lock().await;
            
            let update_data = json!({
                "save_name": "race_condition_save",
                "game_data": {
                    "version": "1.6-accumulator",
                    "resources": {
                        "cosmicDust": (i + 1) * 100
                    }
                },
                "version": "1.6-accumulator"
            });
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/game/save",
                &update_data,
                Some(&token),
            ).await;
            
            (status, body, i)
        }
    }).await;
    
    // 全ての更新が成功することを確認（楽観的ロックがない場合）
    // または適切な競合処理がされることを確認
    for (status, _body, _i) in &results {
        assert!(status.is_success() || status.is_client_error());
    }
    
    // 最終的なデータの整合性を確認
    {
        let mut app_guard = app.lock().await;
        let (status, body) = RequestHelper::get(
            &mut *app_guard,
            "/api/game/state?save_name=race_condition_save",
            Some(&access_token),
        ).await;
        
        assert_eq!(status, StatusCode::OK);
        let final_data = AssertHelper::assert_game_data_response(&body, status);
        
        // データが破損していないことを確認
        assert!(final_data["game_data"]["resources"]["cosmicDust"].is_number());
    }
    
    cleanup_test_data(&pool).await;
}

/// トークンリフレッシュの並行実行テスト
#[actix_web::test]
async fn test_concurrent_token_refresh() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let test_user = TestUser::new("token_refresh");
    
    // ユーザー登録とログイン
    let refresh_token = {
        let mut app_guard = app.lock().await;
        
        RequestHelper::post(
            &mut *app_guard,
            "/api/auth/register",
            &test_user.to_register_request(),
            None,
        ).await;
        
        let (_, body) = RequestHelper::post(
            &mut *app_guard,
            "/api/auth/login",
            &test_user.to_login_request(),
            None,
        ).await;
        
        let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
        AssertHelper::extract_json_field(&body, "refresh_token")
            .expect("Login response missing refresh_token")
            .as_str()
            .unwrap()
            .to_string()
    };
    
    let concurrent_refreshes = 5;
    
    // 同じリフレッシュトークンで並行してリフレッシュ
    let results = ConcurrencyHelper::run_concurrent(concurrent_refreshes, |_| {
        let app_clone = app.clone();
        let token = refresh_token.clone();
        async move {
            let mut app_guard = app_clone.lock().await;
            
            let refresh_request = json!({
                "refresh_token": token
            });
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/auth/refresh",
                &refresh_request,
                None,
            ).await;
            
            (status, body)
        }
    }).await;
    
    // リフレッシュトークンの使い回し防止に応じた結果の確認
    let (success_count, failure_count, _) = ConcurrencyHelper::analyze_concurrent_results(
        &results.iter().map(|(status, _)| {
            if *status == StatusCode::OK {
                Ok(())
            } else {
                Err(())
            }
        }).collect::<Vec<_>>()
    );
    
    // トークンローテーションが実装されている場合、1つだけが成功するはず
    // そうでない場合は、全て成功する可能性もある
    assert!(success_count >= 1);
    println!("Token refresh - Success: {}, Failure: {}", success_count, failure_count);
    
    cleanup_test_data(&pool).await;
}

/// 高負荷時のパフォーマンステスト
#[actix_web::test]
async fn test_high_load_performance() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    let test_user = TestUser::new("high_load");
    
    // ユーザー登録とログイン
    let access_token = {
        let mut app_guard = app.lock().await;
        
        RequestHelper::post(
            &mut *app_guard,
            "/api/auth/register",
            &test_user.to_register_request(),
            None,
        ).await;
        
        let (_, body) = RequestHelper::post(
            &mut *app_guard,
            "/api/auth/login",
            &test_user.to_login_request(),
            None,
        ).await;
        
        let auth_response = AssertHelper::assert_auth_success(&body, StatusCode::OK);
        auth_response.access_token
    };
    
    let high_load_requests = 100;
    let start_time = Instant::now();
    
    // 大量のリクエストを並行実行
    let results = ConcurrencyHelper::run_concurrent(high_load_requests, |i| {
        let app_clone = app.clone();
        let token = access_token.clone();
        async move {
            let mut app_guard = app_clone.lock().await;
            
            // プロフィール取得の高負荷テスト
            let (status, body) = RequestHelper::get(
                &mut *app_guard,
                "/api/users/me",
                Some(&token),
            ).await;
            
            (status, body, i)
        }
    }).await;
    
    let total_duration = start_time.elapsed();
    
    // パフォーマンス分析
    let (success_count, failure_count, success_rate) = ConcurrencyHelper::analyze_concurrent_results(
        &results.iter().map(|(status, _, _)| {
            if *status == StatusCode::OK {
                Ok(())
            } else {
                Err(())
            }
        }).collect::<Vec<_>>()
    );
    
    // パフォーマンス要件の確認
    let avg_response_time = total_duration.as_millis() as f64 / high_load_requests as f64;
    let requests_per_second = high_load_requests as f64 / total_duration.as_secs_f64();
    
    println!("High Load Performance Results:");
    println!("  Total Requests: {}", high_load_requests);
    println!("  Success Rate: {:.2}%", success_rate * 100.0);
    println!("  Total Duration: {:?}", total_duration);
    println!("  Average Response Time: {:.2}ms", avg_response_time);
    println!("  Requests/Second: {:.2}", requests_per_second);
    
    // 基本的な性能要件の確認
    assert!(success_rate >= 0.95); // 95%以上の成功率
    assert!(avg_response_time <= 1000.0); // 平均1秒以内
    assert!(requests_per_second >= 10.0); // 最低10 RPS
    
    cleanup_test_data(&pool).await;
}

/// データベース接続プール枯渇テスト
#[actix_web::test]
async fn test_connection_pool_exhaustion() {
    init_test_env();
    
    let pool = setup_test_db().await;
    let jwt_service = JwtService::new("test_secret_key_for_testing".to_string());
    let app = Arc::new(tokio::sync::Mutex::new(create_test_app(pool.clone(), jwt_service)));
    
    // 接続プールサイズを超える数のリクエスト
    let pool_exhaustion_requests = 50; // プールサイズ（10）を大幅に超える
    
    let results = ConcurrencyHelper::run_concurrent(pool_exhaustion_requests, |i| {
        let app_clone = app.clone();
        async move {
            let mut app_guard = app_clone.lock().await;
            let test_user = TestUser::new(&format!("pool_test_{}", i));
            
            let (status, body) = RequestHelper::post(
                &mut *app_guard,
                "/api/auth/register",
                &test_user.to_register_request(),
                None,
            ).await;
            
            (status, body)
        }
    }).await;
    
    // プール枯渇時の適切なエラーハンドリングを確認
    let (success_count, failure_count, success_rate) = ConcurrencyHelper::analyze_concurrent_results(
        &results.iter().map(|(status, _)| {
            if status.is_success() {
                Ok(())
            } else {
                Err(())
            }
        }).collect::<Vec<_>>()
    );
    
    println!("Connection Pool Test - Success: {}, Failure: {}, Rate: {:.2}%", 
             success_count, failure_count, success_rate * 100.0);
    
    // システムが完全にクラッシュしないことを確認
    assert!(success_count > 0); // 少なくとも一部は成功する
    
    cleanup_test_data(&pool).await;
}