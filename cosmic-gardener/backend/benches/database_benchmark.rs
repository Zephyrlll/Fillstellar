//! データベース操作パフォーマンスベンチマーク

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId, Throughput};
use std::sync::Arc;
use uuid::Uuid;
use tokio::runtime::Runtime;

use cosmic_gardener_backend::services::cache::{CacheService, CacheTtlConfig};
use cosmic_gardener_backend::services::database::DatabaseService;
use cosmic_gardener_backend::services::database_pool::{EnhancedDatabasePool, DatabasePoolConfig};
use cosmic_gardener_backend::services::metrics::{MetricsService, MetricsConfig};
use cosmic_gardener_backend::models::game::PlayerState;

/// テスト用のプレイヤー状態を生成
fn generate_test_player_state(player_id: Uuid) -> PlayerState {
    PlayerState {
        player_id,
        resources: cosmic_gardener_backend::models::game::Resources {
            cosmic_dust: 1000 + (player_id.as_u128() % 5000) as u64,
            energy: 500 + (player_id.as_u128() % 2000) as u64,
            organic_matter: 100 + (player_id.as_u128() % 1000) as u64,
            biomass: 50 + (player_id.as_u128() % 500) as u64,
            dark_matter: 10 + (player_id.as_u128() % 100) as u64,
            thought_points: 5 + (player_id.as_u128() % 50) as u64,
        },
        level: 1 + (player_id.as_u128() % 50) as u32,
        experience: (player_id.as_u128() % 10000) as u64,
        last_active: chrono::Utc::now(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    }
}

/// Redis キャッシュのベンチマーク
fn bench_redis_cache(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("redis_cache");
    
    // Redis接続をセットアップ（テスト環境でのみ）
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let cache_service = rt.block_on(async {
        CacheService::new(&redis_url).expect("Failed to create cache service")
    });
    
    // テストデータ
    let test_players: Vec<Uuid> = (0..1000).map(|_| Uuid::new_v4()).collect();
    let test_states: Vec<PlayerState> = test_players.iter().map(|&id| generate_test_player_state(id)).collect();
    
    // キャッシュ書き込みベンチマーク
    group.bench_function("cache_write", |b| {
        b.to_async(&rt).iter(|| async {
            for (player_id, state) in test_players.iter().zip(test_states.iter()) {
                let _ = cache_service.set_player_state(*player_id, black_box(state)).await;
            }
        })
    });
    
    // キャッシュ読み取りベンチマーク
    group.bench_function("cache_read", |b| {
        b.to_async(&rt).iter(|| async {
            for player_id in test_players.iter() {
                let _ = cache_service.get_player_state(*player_id).await;
            }
        })
    });
    
    // キャッシュヒット率テスト
    group.bench_function("cache_hit_rate", |b| {
        b.to_async(&rt).iter(|| async {
            for player_id in test_players.iter().take(100) {
                let _ = cache_service.get_player_state(*player_id).await;
            }
        })
    });
    
    group.finish();
}

/// データベース接続プールのベンチマーク
fn bench_database_pool(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("database_pool");
    
    // データベース接続をセットアップ（テスト環境でのみ）
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgresql://test:test@localhost/test".to_string());
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    let pool_config = DatabasePoolConfig::default();
    let enhanced_pool = rt.block_on(async {
        EnhancedDatabasePool::new(&database_url, pool_config, metrics_service)
            .await
            .expect("Failed to create database pool")
    });
    
    // 接続取得ベンチマーク
    group.bench_function("connection_acquisition", |b| {
        b.to_async(&rt).iter(|| async {
            let _conn = enhanced_pool.get_connection().await;
        })
    });
    
    // 並行接続テスト
    for concurrency in [1, 5, 10, 20].iter() {
        group.bench_with_input(
            BenchmarkId::new("concurrent_connections", concurrency),
            concurrency,
            |b, &concurrency| {
                b.to_async(&rt).iter(|| async {
                    let mut handles = Vec::new();
                    for _ in 0..concurrency {
                        let pool = &enhanced_pool;
                        handles.push(tokio::spawn(async move {
                            let _conn = pool.get_connection().await;
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

/// データベースクエリパフォーマンス
fn bench_database_queries(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("database_queries");
    
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgresql://test:test@localhost/test".to_string());
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    let pool_config = DatabasePoolConfig::default();
    let enhanced_pool = rt.block_on(async {
        EnhancedDatabasePool::new(&database_url, pool_config, metrics_service)
            .await
            .expect("Failed to create database pool")
    });
    
    // シンプルなクエリ
    group.bench_function("simple_query", |b| {
        b.to_async(&rt).iter(|| async {
            let _ = enhanced_pool.execute_query::<()>("SELECT 1", &[]).await;
        })
    });
    
    // 複雑なクエリ
    group.bench_function("complex_query", |b| {
        b.to_async(&rt).iter(|| async {
            let query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'";
            let _ = enhanced_pool.execute_query::<()>(query, &[]).await;
        })
    });
    
    // バッチクエリ
    group.bench_function("batch_queries", |b| {
        b.to_async(&rt).iter(|| async {
            for _ in 0..10 {
                let _ = enhanced_pool.execute_query::<()>("SELECT 1", &[]).await;
            }
        })
    });
    
    group.finish();
}

/// キャッシュ vs データベース比較
fn bench_cache_vs_database(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("cache_vs_database");
    
    // セットアップ
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgresql://test:test@localhost/test".to_string());
    
    let cache_service = rt.block_on(async {
        CacheService::new(&redis_url).expect("Failed to create cache service")
    });
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    let pool_config = DatabasePoolConfig::default();
    let enhanced_pool = rt.block_on(async {
        EnhancedDatabasePool::new(&database_url, pool_config, metrics_service)
            .await
            .expect("Failed to create database pool")
    });
    
    let database_service = DatabaseService::with_enhanced_pool(
        sqlx::PgPool::connect(&database_url).await.unwrap(),
        Arc::new(enhanced_pool),
        cache_service.clone(),
    );
    
    let test_player_id = Uuid::new_v4();
    let test_state = generate_test_player_state(test_player_id);
    
    // テストデータを事前に設定
    rt.block_on(async {
        let _ = cache_service.set_player_state(test_player_id, &test_state).await;
    });
    
    // キャッシュからの読み取り
    group.bench_function("cache_read", |b| {
        b.to_async(&rt).iter(|| async {
            let _ = cache_service.get_player_state(black_box(test_player_id)).await;
        })
    });
    
    // データベースからの読み取り（キャッシュなし）
    group.bench_function("database_read", |b| {
        b.to_async(&rt).iter(|| async {
            let _ = database_service.get_player_state(black_box(test_player_id)).await;
        })
    });
    
    group.finish();
}

/// 大量データ処理ベンチマーク
fn bench_bulk_operations(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("bulk_operations");
    
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let cache_service = rt.block_on(async {
        CacheService::new(&redis_url).expect("Failed to create cache service")
    });
    
    // バルク書き込み
    for size in [100, 500, 1000, 5000].iter() {
        let test_data: Vec<(Uuid, PlayerState)> = (0..*size)
            .map(|_| {
                let id = Uuid::new_v4();
                (id, generate_test_player_state(id))
            })
            .collect();
        
        group.throughput(Throughput::Elements(*size as u64));
        group.bench_with_input(
            BenchmarkId::new("bulk_write", size),
            size,
            |b, &size| {
                b.to_async(&rt).iter(|| async {
                    for (player_id, state) in test_data.iter() {
                        let _ = cache_service.set_player_state(*player_id, black_box(state)).await;
                    }
                })
            },
        );
    }
    
    group.finish();
}

/// メモリ使用量ベンチマーク
fn bench_memory_usage(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("memory_usage");
    
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    
    group.bench_function("cache_creation", |b| {
        b.to_async(&rt).iter(|| async {
            let cache = CacheService::new(&redis_url).expect("Failed to create cache service");
            black_box(cache);
        })
    });
    
    group.bench_function("large_data_caching", |b| {
        b.to_async(&rt).iter(|| async {
            let cache = CacheService::new(&redis_url).expect("Failed to create cache service");
            
            // 大量データをキャッシュ
            for i in 0..1000 {
                let player_id = Uuid::new_v4();
                let state = generate_test_player_state(player_id);
                let _ = cache.set_player_state(player_id, black_box(&state)).await;
            }
        })
    });
    
    group.finish();
}

/// 接続プールパフォーマンス詳細分析
fn bench_connection_pool_details(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let mut group = c.benchmark_group("connection_pool_details");
    
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgresql://test:test@localhost/test".to_string());
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    // 異なるプールサイズでテスト
    for pool_size in [5, 10, 20, 50].iter() {
        let mut pool_config = DatabasePoolConfig::default();
        pool_config.max_size = *pool_size;
        
        let enhanced_pool = rt.block_on(async {
            EnhancedDatabasePool::new(&database_url, pool_config, metrics_service.clone())
                .await
                .expect("Failed to create database pool")
        });
        
        group.bench_with_input(
            BenchmarkId::new("pool_size", pool_size),
            pool_size,
            |b, &pool_size| {
                b.to_async(&rt).iter(|| async {
                    let mut handles = Vec::new();
                    for _ in 0..pool_size {
                        let pool = &enhanced_pool;
                        handles.push(tokio::spawn(async move {
                            let conn = pool.get_connection().await.unwrap();
                            let _ = pool.execute_query::<()>("SELECT 1", &[]).await;
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

criterion_group!(
    benches,
    bench_redis_cache,
    bench_database_pool,
    bench_database_queries,
    bench_cache_vs_database,
    bench_bulk_operations,
    bench_memory_usage,
    bench_connection_pool_details
);

criterion_main!(benches);