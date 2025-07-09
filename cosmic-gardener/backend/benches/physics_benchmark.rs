//! 物理演算パフォーマンスベンチマーク

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId, Throughput};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use cosmic_gardener_backend::game::celestial_bodies::{CelestialBody, CelestialType};
use cosmic_gardener_backend::game::physics::PhysicsEngine;
use cosmic_gardener_backend::game::physics_simd::SimdPhysicsEngine;
use cosmic_gardener_backend::game::resources::fixed;
use cosmic_gardener_backend::services::metrics::{MetricsService, MetricsConfig};

/// テスト用の天体データを生成
fn generate_test_bodies(count: usize) -> HashMap<Uuid, CelestialBody> {
    let mut bodies = HashMap::new();
    let mut rng = rand::thread_rng();
    
    for i in 0..count {
        let id = Uuid::new_v4();
        let angle = (i as f64 * 2.0 * std::f64::consts::PI) / count as f64;
        let radius = 10.0 + (i as f64 % 100.0);
        
        let position = nalgebra::Vector3::new(
            radius * angle.cos(),
            radius * angle.sin(),
            (i as f64 % 10.0) - 5.0,
        );
        
        let mass = fixed::from_f64(1000.0 + (i as f64 % 5000.0));
        let body_radius = fixed::from_f64(1.0 + (i as f64 % 10.0));
        
        let body = CelestialBody::new(id, CelestialType::Asteroid, position, mass, body_radius);
        bodies.insert(id, body);
    }
    
    bodies
}

/// 従来の物理演算ベンチマーク
fn bench_traditional_physics(c: &mut Criterion) {
    let mut group = c.benchmark_group("traditional_physics");
    
    for body_count in [10, 50, 100, 500, 1000].iter() {
        let mut bodies = generate_test_bodies(*body_count);
        let mut physics_engine = PhysicsEngine::new();
        
        group.throughput(Throughput::Elements(*body_count as u64));
        group.bench_with_input(
            BenchmarkId::new("direct_gravity", body_count),
            body_count,
            |b, &body_count| {
                b.iter(|| {
                    let _ = physics_engine.update(black_box(&mut bodies), black_box(0.016));
                })
            },
        );
    }
    
    group.finish();
}

/// SIMD物理演算ベンチマーク
fn bench_simd_physics(c: &mut Criterion) {
    let mut group = c.benchmark_group("simd_physics");
    
    // メトリクスサービスを作成
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    for body_count in [10, 50, 100, 500, 1000].iter() {
        let mut bodies = generate_test_bodies(*body_count);
        let mut simd_engine = SimdPhysicsEngine::new(metrics_service.clone());
        
        group.throughput(Throughput::Elements(*body_count as u64));
        group.bench_with_input(
            BenchmarkId::new("simd_optimized", body_count),
            body_count,
            |b, &body_count| {
                b.iter(|| {
                    let _ = simd_engine.update_optimized(black_box(&mut bodies), black_box(0.016));
                })
            },
        );
    }
    
    group.finish();
}

/// 物理演算アルゴリズム比較
fn bench_physics_algorithms(c: &mut Criterion) {
    let mut group = c.benchmark_group("physics_algorithms");
    group.sample_size(30);
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    // 中規模シミュレーション (500体) での比較
    let body_count = 500;
    let mut bodies_traditional = generate_test_bodies(body_count);
    let mut bodies_simd = bodies_traditional.clone();
    
    let mut traditional_engine = PhysicsEngine::new();
    let mut simd_engine = SimdPhysicsEngine::new(metrics_service);
    
    group.throughput(Throughput::Elements(body_count as u64));
    
    group.bench_function("traditional_500", |b| {
        b.iter(|| {
            let _ = traditional_engine.update(black_box(&mut bodies_traditional), black_box(0.016));
        })
    });
    
    group.bench_function("simd_500", |b| {
        b.iter(|| {
            let _ = simd_engine.update_optimized(black_box(&mut bodies_simd), black_box(0.016));
        })
    });
    
    group.finish();
}

/// 大規模シミュレーションベンチマーク
fn bench_large_scale_physics(c: &mut Criterion) {
    let mut group = c.benchmark_group("large_scale_physics");
    group.sample_size(10);
    group.measurement_time(std::time::Duration::from_secs(30));
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    for body_count in [2000, 5000, 10000].iter() {
        let mut bodies = generate_test_bodies(*body_count);
        let mut simd_engine = SimdPhysicsEngine::new(metrics_service.clone());
        
        group.throughput(Throughput::Elements(*body_count as u64));
        group.bench_with_input(
            BenchmarkId::new("large_scale", body_count),
            body_count,
            |b, &body_count| {
                b.iter(|| {
                    let _ = simd_engine.update_optimized(black_box(&mut bodies), black_box(0.016));
                })
            },
        );
    }
    
    group.finish();
}

/// メモリ効率ベンチマーク
fn bench_memory_efficiency(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_efficiency");
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    let body_count = 1000;
    let mut simd_engine = SimdPhysicsEngine::new(metrics_service);
    
    group.bench_function("memory_allocation", |b| {
        b.iter(|| {
            let bodies = generate_test_bodies(black_box(body_count));
            black_box(bodies);
        })
    });
    
    group.bench_function("memory_with_physics", |b| {
        b.iter(|| {
            let mut bodies = generate_test_bodies(black_box(body_count));
            let _ = simd_engine.update_optimized(black_box(&mut bodies), black_box(0.016));
            black_box(bodies);
        })
    });
    
    group.finish();
}

/// 並列処理スケーラビリティテスト
fn bench_parallel_scalability(c: &mut Criterion) {
    let mut group = c.benchmark_group("parallel_scalability");
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    let body_count = 2000;
    let mut bodies = generate_test_bodies(body_count);
    
    // 異なる並列度でテスト
    for thread_count in [1, 2, 4, 8].iter() {
        let mut simd_engine = SimdPhysicsEngine::new(metrics_service.clone());
        
        group.bench_with_input(
            BenchmarkId::new("threads", thread_count),
            thread_count,
            |b, &thread_count| {
                // スレッドプールサイズを設定
                rayon::ThreadPoolBuilder::new()
                    .num_threads(thread_count)
                    .build_global()
                    .unwrap();
                
                b.iter(|| {
                    let _ = simd_engine.update_optimized(black_box(&mut bodies), black_box(0.016));
                })
            },
        );
    }
    
    group.finish();
}

/// 精度 vs パフォーマンス比較
fn bench_accuracy_vs_performance(c: &mut Criterion) {
    let mut group = c.benchmark_group("accuracy_vs_performance");
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    let body_count = 500;
    let mut bodies = generate_test_bodies(body_count);
    
    // 異なる精度設定でテスト
    let precision_configs = [
        ("high_precision", 0.1, 1e-6),
        ("medium_precision", 0.5, 1e-4),
        ("low_precision", 1.0, 1e-3),
    ];
    
    for (name, theta, softening) in precision_configs.iter() {
        let mut simd_engine = SimdPhysicsEngine::new(metrics_service.clone());
        
        // 精度パラメータを設定
        let config = cosmic_gardener_backend::game::physics_simd::SimdPhysicsConfig {
            simd_threshold: 16,
            direct_threshold: 1000,
            gravitational_constant: 6.67430e-11,
            softening_factor: *softening,
            max_velocity: 0.1 * 299792458.0,
        };
        simd_engine.configure(config);
        
        group.bench_function(name, |b| {
            b.iter(|| {
                let _ = simd_engine.update_optimized(black_box(&mut bodies), black_box(0.016));
            })
        });
    }
    
    group.finish();
}

/// リアルタイム性能テスト
fn bench_realtime_performance(c: &mut Criterion) {
    let mut group = c.benchmark_group("realtime_performance");
    group.sample_size(100);
    
    let metrics_config = MetricsConfig::default();
    let metrics_service = Arc::new(MetricsService::new(metrics_config).unwrap());
    
    // 60FPSターゲット (16.67ms)
    let target_frame_time = 0.0167;
    
    let mut simd_engine = SimdPhysicsEngine::new(metrics_service);
    
    // 60FPSを維持できる最大天体数を測定
    for body_count in [100, 200, 500, 1000, 2000].iter() {
        let mut bodies = generate_test_bodies(*body_count);
        
        group.bench_with_input(
            BenchmarkId::new("realtime_60fps", body_count),
            body_count,
            |b, &body_count| {
                b.iter(|| {
                    let _ = simd_engine.update_optimized(black_box(&mut bodies), black_box(target_frame_time));
                })
            },
        );
    }
    
    group.finish();
}

criterion_group!(
    benches,
    bench_traditional_physics,
    bench_simd_physics,
    bench_physics_algorithms,
    bench_large_scale_physics,
    bench_memory_efficiency,
    bench_parallel_scalability,
    bench_accuracy_vs_performance,
    bench_realtime_performance
);

criterion_main!(benches);