//! WebSocket統合テスト
//!
//! WebSocketの各機能を統合的にテストします

use actix_web::{test, web, App};
use actix_web_actors::ws;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_tungstenite::{connect_async, tungstenite::Message};

use cosmic_gardener_backend::websocket::{
    configure_websocket_routes, SessionManager, ClientMessage, ServerMessage
};
use cosmic_gardener_backend::services::JwtService;

/// WebSocket統合テストセット
#[cfg(test)]
mod websocket_integration_tests {
    use super::*;

    /// テスト用のアプリケーションを作成
    async fn create_test_app() -> test::TestServer {
        let pool = web::Data::new(create_test_pool().await);
        let jwt_service = web::Data::new(JwtService::new("test_secret".to_string()));
        let session_manager = web::Data::new(Arc::new(RwLock::new(SessionManager::new())));

        test::init_service(
            App::new()
                .app_data(pool)
                .app_data(jwt_service)
                .app_data(session_manager)
                .configure(configure_websocket_routes)
        ).await
    }

    /// テスト用のDBプールを作成
    async fn create_test_pool() -> sqlx::PgPool {
        sqlx::PgPool::connect("postgresql://test:test@localhost/test_cosmic_gardener")
            .await
            .expect("Failed to connect to test database")
    }

    /// テスト用のJWTトークンを生成
    fn create_test_token() -> String {
        let jwt_service = JwtService::new("test_secret".to_string());
        let user = cosmic_gardener_backend::models::User {
            id: uuid::Uuid::new_v4(),
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password_hash: "hash".to_string(),
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            last_login: None,
        };
        
        jwt_service.generate_access_token(&user).unwrap()
    }

    #[actix_web::test]
    async fn test_websocket_connection_with_valid_token() {
        let app = create_test_app().await;
        let token = create_test_token();
        
        // WebSocket接続をテスト
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        // 接続成功の確認
        if let Some(msg) = ws_stream.next().await {
            assert!(msg.is_ok());
        }
        
        // 接続を閉じる
        ws_stream.close(None).await.unwrap();
    }

    #[actix_web::test]
    async fn test_websocket_connection_without_token() {
        let app = create_test_app().await;
        
        // トークンなしの接続は失敗するはず
        let result = connect_async("ws://localhost:8080/api/ws").await;
        assert!(result.is_err());
    }

    #[actix_web::test]
    async fn test_websocket_message_handling() {
        let app = create_test_app().await;
        let token = create_test_token();
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        // GetStateメッセージを送信
        let get_state_msg = json!({
            "type": "GetState"
        });
        
        ws_stream.send(Message::Text(get_state_msg.to_string())).await.unwrap();
        
        // レスポンスを確認
        if let Some(msg) = ws_stream.next().await {
            let msg = msg.unwrap();
            if let Message::Text(text) = msg {
                let response: serde_json::Value = serde_json::from_str(&text).unwrap();
                assert_eq!(response["type"], "StateUpdate");
            }
        }
        
        ws_stream.close(None).await.unwrap();
    }

    #[actix_web::test]
    async fn test_websocket_celestial_body_creation() {
        let app = create_test_app().await;
        let token = create_test_token();
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        // 天体作成メッセージを送信
        let create_msg = json!({
            "type": "CreateCelestialBody",
            "data": {
                "body_type": "Planet",
                "position": { "x": 100.0, "y": 200.0, "z": 0.0 }
            }
        });
        
        ws_stream.send(Message::Text(create_msg.to_string())).await.unwrap();
        
        // ActionResultレスポンスを確認
        if let Some(msg) = ws_stream.next().await {
            let msg = msg.unwrap();
            if let Message::Text(text) = msg {
                let response: serde_json::Value = serde_json::from_str(&text).unwrap();
                assert_eq!(response["type"], "ActionResult");
                assert_eq!(response["data"]["success"], true);
            }
        }
        
        ws_stream.close(None).await.unwrap();
    }

    #[actix_web::test]
    async fn test_websocket_heartbeat() {
        let app = create_test_app().await;
        let token = create_test_token();
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        // ハートビートメッセージを送信
        let heartbeat_msg = json!({
            "type": "Heartbeat"
        });
        
        ws_stream.send(Message::Text(heartbeat_msg.to_string())).await.unwrap();
        
        // ハートビートレスポンスを確認
        if let Some(msg) = ws_stream.next().await {
            let msg = msg.unwrap();
            if let Message::Text(text) = msg {
                let response: serde_json::Value = serde_json::from_str(&text).unwrap();
                assert_eq!(response["type"], "Heartbeat");
            }
        }
        
        ws_stream.close(None).await.unwrap();
    }

    #[actix_web::test]
    async fn test_websocket_save_game() {
        let app = create_test_app().await;
        let token = create_test_token();
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        // SaveGameメッセージを送信
        let save_msg = json!({
            "type": "SaveGame",
            "data": {
                "state": {
                    "resources": { "cosmicDust": 1000.0 },
                    "celestial_bodies": [],
                    "research": {},
                    "statistics": {}
                }
            }
        });
        
        ws_stream.send(Message::Text(save_msg.to_string())).await.unwrap();
        
        // 保存成功のレスポンスを確認
        if let Some(msg) = ws_stream.next().await {
            let msg = msg.unwrap();
            if let Message::Text(text) = msg {
                let response: serde_json::Value = serde_json::from_str(&text).unwrap();
                assert_eq!(response["type"], "ActionResult");
                assert_eq!(response["data"]["success"], true);
            }
        }
        
        ws_stream.close(None).await.unwrap();
    }

    #[actix_web::test]
    async fn test_websocket_invalid_message() {
        let app = create_test_app().await;
        let token = create_test_token();
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        // 無効なメッセージを送信
        ws_stream.send(Message::Text("invalid json".to_string())).await.unwrap();
        
        // エラーレスポンスを確認
        if let Some(msg) = ws_stream.next().await {
            let msg = msg.unwrap();
            if let Message::Text(text) = msg {
                let response: serde_json::Value = serde_json::from_str(&text).unwrap();
                assert_eq!(response["type"], "Error");
                assert_eq!(response["data"]["code"], "INVALID_FORMAT");
            }
        }
        
        ws_stream.close(None).await.unwrap();
    }
}

/// 負荷テストセット
#[cfg(test)]
mod websocket_load_tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::time::{sleep, timeout};

    #[tokio::test]
    async fn test_concurrent_connections() {
        let connection_count = 10;
        let success_count = Arc::new(AtomicUsize::new(0));
        let token = create_test_token();
        
        let mut handles = Vec::new();
        
        for i in 0..connection_count {
            let token = token.clone();
            let success_count = success_count.clone();
            
            let handle = tokio::spawn(async move {
                match connect_async(format!("ws://localhost:8080/api/ws?token={}", token)).await {
                    Ok((mut ws_stream, _)) => {
                        // 簡単なメッセージのやり取り
                        let msg = json!({ "type": "Heartbeat" });
                        if ws_stream.send(Message::Text(msg.to_string())).await.is_ok() {
                            success_count.fetch_add(1, Ordering::Relaxed);
                        }
                        ws_stream.close(None).await.ok();
                    }
                    Err(e) => {
                        eprintln!("Connection {} failed: {}", i, e);
                    }
                }
            });
            
            handles.push(handle);
        }
        
        // 全ての接続が完了するまで待機
        for handle in handles {
            handle.await.unwrap();
        }
        
        let successful_connections = success_count.load(Ordering::Relaxed);
        println!("Successful connections: {}/{}", successful_connections, connection_count);
        
        // 80%以上の接続が成功すれば OK
        assert!(successful_connections >= connection_count * 8 / 10);
    }

    #[tokio::test]
    async fn test_message_throughput() {
        let token = create_test_token();
        let message_count = 100;
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        let start_time = std::time::Instant::now();
        
        // メッセージを連続送信
        for i in 0..message_count {
            let msg = json!({
                "type": "CreateCelestialBody",
                "data": {
                    "body_type": "Planet",
                    "position": { "x": i as f64, "y": 0.0, "z": 0.0 }
                }
            });
            
            ws_stream.send(Message::Text(msg.to_string())).await.unwrap();
        }
        
        // レスポンスを受信
        let mut received_count = 0;
        while received_count < message_count {
            if let Some(msg) = timeout(Duration::from_millis(100), ws_stream.next()).await.ok() {
                if let Some(Ok(Message::Text(_))) = msg {
                    received_count += 1;
                }
            } else {
                break;
            }
        }
        
        let elapsed = start_time.elapsed();
        let throughput = received_count as f64 / elapsed.as_secs_f64();
        
        println!("Message throughput: {:.2} messages/second", throughput);
        println!("Received: {}/{} messages", received_count, message_count);
        
        // 最低限のスループットを確認
        assert!(throughput > 10.0); // 10 messages/second以上
        assert!(received_count >= message_count * 8 / 10); // 80%以上受信
        
        ws_stream.close(None).await.unwrap();
    }

    #[tokio::test]
    async fn test_connection_stability() {
        let token = create_test_token();
        let duration = Duration::from_secs(30);
        
        let (mut ws_stream, _) = connect_async(
            format!("ws://localhost:8080/api/ws?token={}", token)
        ).await.expect("Failed to connect");

        let start_time = std::time::Instant::now();
        let mut message_count = 0;
        
        // 30秒間継続的にメッセージを送信
        while start_time.elapsed() < duration {
            let msg = json!({ "type": "Heartbeat" });
            
            if ws_stream.send(Message::Text(msg.to_string())).await.is_ok() {
                message_count += 1;
            }
            
            // レスポンスを受信
            if let Some(Ok(Message::Text(_))) = ws_stream.next().await {
                // レスポンス受信成功
            }
            
            sleep(Duration::from_millis(100)).await;
        }
        
        println!("Sent {} messages over {} seconds", message_count, duration.as_secs());
        
        // 最低限のメッセージ数を確認
        assert!(message_count > 200); // 30秒で200メッセージ以上
        
        ws_stream.close(None).await.unwrap();
    }
}

/// パフォーマンステストヘルパー
#[cfg(test)]
mod performance_helpers {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::time::{sleep, Instant};

    /// メモリ使用量を測定
    pub fn measure_memory_usage() -> usize {
        // プラットフォーム依存の実装が必要
        // 簡略化のため、固定値を返す
        1024 * 1024 // 1MB
    }

    /// CPU使用率を測定
    pub fn measure_cpu_usage() -> f64 {
        // プラットフォーム依存の実装が必要
        // 簡略化のため、固定値を返す
        10.0 // 10%
    }

    /// 接続性能のベンチマーク
    pub async fn benchmark_connections(connection_count: usize) -> BenchmarkResult {
        let token = create_test_token();
        let start_time = Instant::now();
        let success_count = Arc::new(AtomicUsize::new(0));
        let error_count = Arc::new(AtomicUsize::new(0));
        
        let mut handles = Vec::new();
        
        for _ in 0..connection_count {
            let token = token.clone();
            let success_count = success_count.clone();
            let error_count = error_count.clone();
            
            let handle = tokio::spawn(async move {
                match connect_async(format!("ws://localhost:8080/api/ws?token={}", token)).await {
                    Ok((mut ws_stream, _)) => {
                        success_count.fetch_add(1, Ordering::Relaxed);
                        ws_stream.close(None).await.ok();
                    }
                    Err(_) => {
                        error_count.fetch_add(1, Ordering::Relaxed);
                    }
                }
            });
            
            handles.push(handle);
        }
        
        for handle in handles {
            handle.await.unwrap();
        }
        
        let elapsed = start_time.elapsed();
        
        BenchmarkResult {
            total_connections: connection_count,
            successful_connections: success_count.load(Ordering::Relaxed),
            failed_connections: error_count.load(Ordering::Relaxed),
            duration: elapsed,
            connections_per_second: connection_count as f64 / elapsed.as_secs_f64(),
        }
    }

    #[derive(Debug)]
    pub struct BenchmarkResult {
        pub total_connections: usize,
        pub successful_connections: usize,
        pub failed_connections: usize,
        pub duration: Duration,
        pub connections_per_second: f64,
    }
}

/// 負荷テストの実行
#[cfg(test)]
mod load_test_runner {
    use super::*;
    use performance_helpers::*;

    #[tokio::test]
    async fn run_comprehensive_load_test() {
        println!("=== WebSocket Load Test ===");
        
        // 段階的に接続数を増やしてテスト
        let test_cases = vec![10, 50, 100, 200];
        
        for connection_count in test_cases {
            println!("\n--- Testing {} concurrent connections ---", connection_count);
            
            let result = benchmark_connections(connection_count).await;
            
            println!("Results:");
            println!("  Total: {}", result.total_connections);
            println!("  Successful: {}", result.successful_connections);
            println!("  Failed: {}", result.failed_connections);
            println!("  Duration: {:?}", result.duration);
            println!("  Rate: {:.2} connections/sec", result.connections_per_second);
            
            let success_rate = result.successful_connections as f64 / result.total_connections as f64;
            println!("  Success rate: {:.1}%", success_rate * 100.0);
            
            // 成功率が80%以上であることを確認
            assert!(success_rate >= 0.8, "Success rate too low: {:.1}%", success_rate * 100.0);
        }
    }
}

// テストユーティリティ関数
fn create_test_token() -> String {
    // 実際のテスト環境では適切なトークンを生成
    "test_token_123456".to_string()
}