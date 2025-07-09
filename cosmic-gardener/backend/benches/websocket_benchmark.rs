//! WebSocketパフォーマンスベンチマーク

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId, Throughput};
use std::sync::Arc;
use tokio::runtime::Runtime;

use cosmic_gardener_backend::services::websocket::compression::{
    CompressionService, CompressionConfig, CompressionAlgorithm
};
use cosmic_gardener_backend::websocket::messages::{ClientMessage, ServerMessage, GameState};
use cosmic_gardener_backend::services::metrics::{MetricsService, MetricsConfig};

/// テスト用のメッセージを生成
fn generate_test_messages(count: usize) -> Vec<Vec<u8>> {
    let mut messages = Vec::new();
    
    for i in 0..count {
        let message = match i % 4 {
            0 => {
                let client_msg = ClientMessage::GetState;
                serde_json::to_vec(&client_msg).unwrap()
            }
            1 => {
                let client_msg = ClientMessage::CreateCelestialBody {
                    body_type: format!("asteroid_{}", i),
                    position: cosmic_gardener_backend::websocket::messages::Vec3 {
                        x: i as f64,
                        y: (i * 2) as f64,
                        z: (i * 3) as f64,
                    },
                };
                serde_json::to_vec(&client_msg).unwrap()
            }
            2 => {
                let server_msg = ServerMessage::ActionResult {
                    success: true,
                    message: format!("Action {} completed successfully", i),
                };
                serde_json::to_vec(&server_msg).unwrap()
            }
            3 => {
                let game_state = GameState {
                    resources: serde_json::json!({
                        "cosmic_dust": i * 100,
                        "energy": i * 50,
                        "organic_matter": i * 25,
                    }),
                    celestial_bodies: vec![
                        serde_json::json!({
                            "id": format!("body_{}", i),
                            "type": "asteroid",
                            "position": [i as f64, (i * 2) as f64, (i * 3) as f64],
                            "mass": i as f64 * 1000.0,
                        })
                    ],
                    research: serde_json::json!({
                        "completed": vec![format!("tech_{}", i % 10)],
                    }),
                    statistics: serde_json::json!({
                        "total_bodies": i,
                        "total_resources": i * 175,
                    }),
                };
                let server_msg = ServerMessage::StateUpdate {
                    full: true,
                    data: cosmic_gardener_backend::websocket::messages::StateData {
                        game_state,
                        timestamp: chrono::Utc::now(),
                    },
                };
                serde_json::to_vec(&server_msg).unwrap()
            }
            _ => unreachable!(),
        };
        
        messages.push(message);
    }
    
    messages
}

/// 大きなメッセージを生成（圧縮テスト用）
fn generate_large_message(size_kb: usize) -> Vec<u8> {
    let mut large_data = Vec::new();
    let base_size = 1024; // 1KB
    
    for i in 0..(size_kb) {
        let chunk = format!(
            "{{\"chunk_id\": {}, \"data\": \"{}\"}}",
            i,
            "x".repeat(base_size - 50) // JSON構造分を差し引く
        );
        large_data.extend_from_slice(chunk.as_bytes());
    }
    
    large_data
}

/// WebSocketメッセージシリアライゼーション
fn bench_message_serialization(c: &mut Criterion) {
    let mut group = c.benchmark_group("message_serialization");
    
    // 異なるメッセージタイプでのシリアライゼーション
    let client_msg = ClientMessage::GetState;
    let server_msg = ServerMessage::ActionResult {
        success: true,
        message: "Test message".to_string(),
    };
    
    group.bench_function("client_message", |b| {
        b.iter(|| {
            let _ = serde_json::to_vec(black_box(&client_msg));
        })
    });
    
    group.bench_function("server_message", |b| {
        b.iter(|| {
            let _ = serde_json::to_vec(black_box(&server_msg));
        })
    });
    
    // 大きな状態更新メッセージ
    let large_game_state = GameState {
        resources: serde_json::json!({
            "cosmic_dust": 1000000,
            "energy": 500000,
            "organic_matter": 250000,
        }),
        celestial_bodies: (0..100).map(|i| {
            serde_json::json!({
                "id": format!("body_{}", i),
                "type": "asteroid",
                "position": [i as f64, (i * 2) as f64, (i * 3) as f64],
                "mass": i as f64 * 1000.0,
            })
        }).collect(),
        research: serde_json::json!({
            "completed": (0..50).map(|i| format!("tech_{}", i)).collect::<Vec<_>>(),
        }),
        statistics: serde_json::json!({
            "total_bodies": 100,
            "total_resources": 1750000,
        }),
    };
    
    let large_server_msg = ServerMessage::StateUpdate {
        full: true,
        data: cosmic_gardener_backend::websocket::messages::StateData {
            game_state: large_game_state,
            timestamp: chrono::Utc::now(),
        },
    };
    
    group.bench_function("large_state_update", |b| {
        b.iter(|| {
            let _ = serde_json::to_vec(black_box(&large_server_msg));
        })
    });
    
    group.finish();
}

/// WebSocket圧縮アルゴリズム比較
fn bench_compression_algorithms(c: &mut Criterion) {
    let mut group = c.benchmark_group("compression_algorithms");
    
    let test_messages = generate_test_messages(1000);
    let large_message = generate_large_message(10); // 10KB
    
    // 各圧縮アルゴリズムでテスト
    let algorithms = [
        CompressionAlgorithm::None,
        CompressionAlgorithm::Lz4,
        CompressionAlgorithm::Zlib,
    ];
    
    for algorithm in algorithms.iter() {
        let config = CompressionConfig {
            algorithm: *algorithm,
            min_size_threshold: 100,
            ..Default::default()
        };
        let compression_service = CompressionService::new(config);
        
        group.bench_with_input(
            BenchmarkId::new("small_messages", format!("{:?}", algorithm)),
            algorithm,
            |b, &algorithm| {
                b.iter(|| {
                    for message in test_messages.iter().take(100) {
                        let _ = compression_service.compress(black_box(message));
                    }
                })
            },
        );
        
        group.bench_with_input(
            BenchmarkId::new("large_message", format!("{:?}", algorithm)),
            algorithm,
            |b, &algorithm| {
                b.iter(|| {
                    let _ = compression_service.compress(black_box(&large_message));
                })
            },
        );
    }
    
    group.finish();
}

/// 圧縮率 vs 速度トレードオフ
fn bench_compression_tradeoffs(c: &mut Criterion) {
    let mut group = c.benchmark_group("compression_tradeoffs");
    
    let test_data_sizes = [1, 5, 10, 50, 100]; // KB
    
    for size_kb in test_data_sizes.iter() {
        let test_data = generate_large_message(*size_kb);
        
        // LZ4 (高速、低圧縮率)
        let lz4_config = CompressionConfig {
            algorithm: CompressionAlgorithm::Lz4,
            min_size_threshold: 0,
            ..Default::default()
        };
        let lz4_service = CompressionService::new(lz4_config);
        
        // Zlib (低速、高圧縮率)
        let zlib_config = CompressionConfig {
            algorithm: CompressionAlgorithm::Zlib,
            min_size_threshold: 0,
            ..Default::default()
        };
        let zlib_service = CompressionService::new(zlib_config);
        
        group.throughput(Throughput::Bytes(*size_kb as u64 * 1024));
        
        group.bench_with_input(
            BenchmarkId::new("lz4", format!("{}KB", size_kb)),
            size_kb,
            |b, &size_kb| {
                b.iter(|| {
                    let compressed = lz4_service.compress(black_box(&test_data)).unwrap();
                    let _ = lz4_service.decompress(black_box(&compressed));
                })
            },
        );
        
        group.bench_with_input(
            BenchmarkId::new("zlib", format!("{}KB", size_kb)),
            size_kb,
            |b, &size_kb| {
                b.iter(|| {
                    let compressed = zlib_service.compress(black_box(&test_data)).unwrap();
                    let _ = zlib_service.decompress(black_box(&compressed));
                })
            },
        );
    }
    
    group.finish();
}

/// 適応的圧縮ベンチマーク
fn bench_adaptive_compression(c: &mut Criterion) {
    let mut group = c.benchmark_group("adaptive_compression");
    
    let config = CompressionConfig {
        algorithm: CompressionAlgorithm::Lz4,
        min_size_threshold: 1024,
        enable_adaptive: true,
        max_compression_ratio: 0.8,
        ..Default::default()
    };
    let compression_service = CompressionService::new(config);
    
    // 圧縮効果の高いデータ
    let compressible_data = "A".repeat(10000).into_bytes();
    
    // 圧縮効果の低いデータ（ランダム）
    let random_data: Vec<u8> = (0..10000).map(|i| (i * 7 + 13) as u8).collect();
    
    group.bench_function("compressible_data", |b| {
        b.iter(|| {
            let _ = compression_service.compress(black_box(&compressible_data));
        })
    });
    
    group.bench_function("random_data", |b| {
        b.iter(|| {
            let _ = compression_service.compress(black_box(&random_data));
        })
    });
    
    group.finish();
}

/// バッチ処理ベンチマーク
fn bench_batch_processing(c: &mut Criterion) {
    let mut group = c.benchmark_group("batch_processing");
    
    let config = CompressionConfig {
        algorithm: CompressionAlgorithm::Lz4,
        min_size_threshold: 100,
        ..Default::default()
    };
    let compression_service = CompressionService::new(config);
    
    for batch_size in [10, 50, 100, 500].iter() {
        let test_messages = generate_test_messages(*batch_size);
        
        group.throughput(Throughput::Elements(*batch_size as u64));
        group.bench_with_input(
            BenchmarkId::new("batch_compression", batch_size),
            batch_size,
            |b, &batch_size| {
                b.iter(|| {
                    for message in test_messages.iter() {
                        let _ = compression_service.compress(black_box(message));
                    }
                })
            },
        );
    }
    
    group.finish();
}

/// 並行圧縮処理ベンチマーク
fn bench_concurrent_compression(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("concurrent_compression");
    
    let config = CompressionConfig {
        algorithm: CompressionAlgorithm::Lz4,
        min_size_threshold: 100,
        ..Default::default()
    };
    let compression_service = Arc::new(CompressionService::new(config));
    
    for concurrency in [1, 2, 4, 8].iter() {
        let test_messages = generate_test_messages(100);
        
        group.bench_with_input(
            BenchmarkId::new("concurrent_compression", concurrency),
            concurrency,
            |b, &concurrency| {
                b.to_async(&rt).iter(|| async {
                    let mut handles = Vec::new();
                    
                    for chunk in test_messages.chunks(test_messages.len() / concurrency) {
                        let service = compression_service.clone();
                        let chunk = chunk.to_vec();
                        
                        handles.push(tokio::spawn(async move {
                            for message in chunk {
                                let _ = service.compress(black_box(&message));
                            }
                        }));
                    }
                    
                    for handle in handles {
                        let _ = handle.await;
                    }
                })
            },
        );
    }
    
    group.finish();
}

/// メモリ効率ベンチマーク
fn bench_memory_efficiency(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_efficiency");
    
    let config = CompressionConfig {
        algorithm: CompressionAlgorithm::Lz4,
        min_size_threshold: 100,
        ..Default::default()
    };
    let compression_service = CompressionService::new(config);
    
    // メモリ割り当て/解放の頻度をテスト
    group.bench_function("memory_allocation", |b| {
        b.iter(|| {
            let messages = generate_test_messages(black_box(100));
            for message in messages {
                let compressed = compression_service.compress(black_box(&message)).unwrap();
                let _ = compression_service.decompress(black_box(&compressed));
            }
        })
    });
    
    // 大量データでのメモリ使用量
    group.bench_function("large_data_memory", |b| {
        b.iter(|| {
            let large_data = generate_large_message(black_box(100)); // 100KB
            let compressed = compression_service.compress(black_box(&large_data)).unwrap();
            let _ = compression_service.decompress(black_box(&compressed));
        })
    });
    
    group.finish();
}

/// リアルタイム性能ベンチマーク
fn bench_realtime_performance(c: &mut Criterion) {
    let mut group = c.benchmark_group("realtime_performance");
    group.sample_size(100);
    
    let config = CompressionConfig {
        algorithm: CompressionAlgorithm::Lz4,
        min_size_threshold: 100,
        ..Default::default()
    };
    let compression_service = CompressionService::new(config);
    
    // 60 FPSでのメッセージ処理 (16.67ms間隔)
    let frame_messages = generate_test_messages(10); // フレーム当たり10メッセージ
    
    group.bench_function("60fps_simulation", |b| {
        b.iter(|| {
            for message in frame_messages.iter() {
                let compressed = compression_service.compress(black_box(message)).unwrap();
                let _ = compression_service.decompress(black_box(&compressed));
            }
        })
    });
    
    // 異なるメッセージ頻度でのテスト
    for msg_per_second in [60, 120, 240, 480].iter() {
        let messages = generate_test_messages(*msg_per_second);
        
        group.bench_with_input(
            BenchmarkId::new("messages_per_second", msg_per_second),
            msg_per_second,
            |b, &msg_per_second| {
                b.iter(|| {
                    for message in messages.iter() {
                        let _ = compression_service.compress(black_box(message));
                    }
                })
            },
        );
    }
    
    group.finish();
}

criterion_group!(
    benches,
    bench_message_serialization,
    bench_compression_algorithms,
    bench_compression_tradeoffs,
    bench_adaptive_compression,
    bench_batch_processing,
    bench_concurrent_compression,
    bench_memory_efficiency,
    bench_realtime_performance
);

criterion_main!(benches);