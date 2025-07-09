//! Prometheusメトリクス統合サービス

use prometheus::{
    Counter, Gauge, Histogram, IntCounter, IntGauge, 
    Opts, Registry, TextEncoder, Encoder,
    register_counter, register_int_counter, register_gauge, 
    register_int_gauge, register_histogram,
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use anyhow::Result;
use instant::Instant;
use uuid::Uuid;
use tracing::{info, warn, error};

/// メトリクス設定
#[derive(Debug, Clone)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub namespace: String,
    pub endpoint_path: String,
    pub collection_interval_secs: u64,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            namespace: "cosmic_gardener".to_string(),
            endpoint_path: "/metrics".to_string(),
            collection_interval_secs: 15,
        }
    }
}

/// パフォーマンスメトリクス
pub struct PerformanceMetrics {
    // HTTP リクエスト
    pub http_requests_total: IntCounter,
    pub http_request_duration: Histogram,
    pub http_requests_in_flight: IntGauge,
    
    // WebSocket
    pub websocket_connections_total: IntGauge,
    pub websocket_messages_sent: IntCounter,
    pub websocket_messages_received: IntCounter,
    pub websocket_compression_ratio: Gauge,
    
    // 物理演算
    pub physics_calculations_total: IntCounter,
    pub physics_calculation_duration: Histogram,
    pub physics_bodies_count: IntGauge,
    pub physics_collision_checks: IntCounter,
    
    // データベース
    pub database_queries_total: IntCounter,
    pub database_query_duration: Histogram,
    pub database_connections_active: IntGauge,
    pub database_pool_size: IntGauge,
    
    // キャッシュ
    pub cache_operations_total: IntCounter,
    pub cache_hits_total: IntCounter,
    pub cache_misses_total: IntCounter,
    pub cache_size_bytes: IntGauge,
    
    // ゲーム
    pub active_players: IntGauge,
    pub celestial_bodies_total: IntGauge,
    pub resource_generation_rate: Gauge,
    pub game_ticks_total: IntCounter,
    
    // システム
    pub memory_usage_bytes: IntGauge,
    pub cpu_usage_percent: Gauge,
    pub goroutines_count: IntGauge,
}

/// メトリクス時系列データ
#[derive(Debug, Clone)]
pub struct MetricsTimeSeries {
    pub timestamp: u64,
    pub values: HashMap<String, f64>,
}

/// メトリクスサービス
pub struct MetricsService {
    config: MetricsConfig,
    registry: Registry,
    metrics: PerformanceMetrics,
    timers: Arc<Mutex<HashMap<String, Instant>>>,
}

impl MetricsService {
    /// 新しいメトリクスサービスを作成
    pub fn new(config: MetricsConfig) -> Result<Self> {
        let registry = Registry::new();
        let namespace = &config.namespace;
        
        // HTTP メトリクス
        let http_requests_total = IntCounter::with_opts(
            Opts::new("http_requests_total", "Total number of HTTP requests")
                .namespace(namespace)
        )?;
        registry.register(Box::new(http_requests_total.clone()))?;
        
        let http_request_duration = Histogram::with_opts(
            prometheus::HistogramOpts::new("http_request_duration_seconds", "HTTP request duration")
                .namespace(namespace)
                .buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0])
        )?;
        registry.register(Box::new(http_request_duration.clone()))?;
        
        let http_requests_in_flight = IntGauge::with_opts(
            Opts::new("http_requests_in_flight", "Number of HTTP requests currently being processed")
                .namespace(namespace)
        )?;
        registry.register(Box::new(http_requests_in_flight.clone()))?;
        
        // WebSocket メトリクス
        let websocket_connections_total = IntGauge::with_opts(
            Opts::new("websocket_connections_total", "Total number of active WebSocket connections")
                .namespace(namespace)
        )?;
        registry.register(Box::new(websocket_connections_total.clone()))?;
        
        let websocket_messages_sent = IntCounter::with_opts(
            Opts::new("websocket_messages_sent_total", "Total number of WebSocket messages sent")
                .namespace(namespace)
        )?;
        registry.register(Box::new(websocket_messages_sent.clone()))?;
        
        let websocket_messages_received = IntCounter::with_opts(
            Opts::new("websocket_messages_received_total", "Total number of WebSocket messages received")
                .namespace(namespace)
        )?;
        registry.register(Box::new(websocket_messages_received.clone()))?;
        
        let websocket_compression_ratio = Gauge::with_opts(
            Opts::new("websocket_compression_ratio", "WebSocket message compression ratio")
                .namespace(namespace)
        )?;
        registry.register(Box::new(websocket_compression_ratio.clone()))?;
        
        // 物理演算メトリクス
        let physics_calculations_total = IntCounter::with_opts(
            Opts::new("physics_calculations_total", "Total number of physics calculations")
                .namespace(namespace)
        )?;
        registry.register(Box::new(physics_calculations_total.clone()))?;
        
        let physics_calculation_duration = Histogram::with_opts(
            prometheus::HistogramOpts::new("physics_calculation_duration_seconds", "Physics calculation duration")
                .namespace(namespace)
                .buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0])
        )?;
        registry.register(Box::new(physics_calculation_duration.clone()))?;
        
        let physics_bodies_count = IntGauge::with_opts(
            Opts::new("physics_bodies_count", "Number of celestial bodies in physics simulation")
                .namespace(namespace)
        )?;
        registry.register(Box::new(physics_bodies_count.clone()))?;
        
        let physics_collision_checks = IntCounter::with_opts(
            Opts::new("physics_collision_checks_total", "Total number of collision checks performed")
                .namespace(namespace)
        )?;
        registry.register(Box::new(physics_collision_checks.clone()))?;
        
        // データベースメトリクス
        let database_queries_total = IntCounter::with_opts(
            Opts::new("database_queries_total", "Total number of database queries")
                .namespace(namespace)
        )?;
        registry.register(Box::new(database_queries_total.clone()))?;
        
        let database_query_duration = Histogram::with_opts(
            prometheus::HistogramOpts::new("database_query_duration_seconds", "Database query duration")
                .namespace(namespace)
                .buckets(vec![0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0])
        )?;
        registry.register(Box::new(database_query_duration.clone()))?;
        
        let database_connections_active = IntGauge::with_opts(
            Opts::new("database_connections_active", "Number of active database connections")
                .namespace(namespace)
        )?;
        registry.register(Box::new(database_connections_active.clone()))?;
        
        let database_pool_size = IntGauge::with_opts(
            Opts::new("database_pool_size", "Size of database connection pool")
                .namespace(namespace)
        )?;
        registry.register(Box::new(database_pool_size.clone()))?;
        
        // キャッシュメトリクス
        let cache_operations_total = IntCounter::with_opts(
            Opts::new("cache_operations_total", "Total number of cache operations")
                .namespace(namespace)
        )?;
        registry.register(Box::new(cache_operations_total.clone()))?;
        
        let cache_hits_total = IntCounter::with_opts(
            Opts::new("cache_hits_total", "Total number of cache hits")
                .namespace(namespace)
        )?;
        registry.register(Box::new(cache_hits_total.clone()))?;
        
        let cache_misses_total = IntCounter::with_opts(
            Opts::new("cache_misses_total", "Total number of cache misses")
                .namespace(namespace)
        )?;
        registry.register(Box::new(cache_misses_total.clone()))?;
        
        let cache_size_bytes = IntGauge::with_opts(
            Opts::new("cache_size_bytes", "Current cache size in bytes")
                .namespace(namespace)
        )?;
        registry.register(Box::new(cache_size_bytes.clone()))?;
        
        // ゲームメトリクス
        let active_players = IntGauge::with_opts(
            Opts::new("active_players", "Number of active players")
                .namespace(namespace)
        )?;
        registry.register(Box::new(active_players.clone()))?;
        
        let celestial_bodies_total = IntGauge::with_opts(
            Opts::new("celestial_bodies_total", "Total number of celestial bodies")
                .namespace(namespace)
        )?;
        registry.register(Box::new(celestial_bodies_total.clone()))?;
        
        let resource_generation_rate = Gauge::with_opts(
            Opts::new("resource_generation_rate", "Resource generation rate per second")
                .namespace(namespace)
        )?;
        registry.register(Box::new(resource_generation_rate.clone()))?;
        
        let game_ticks_total = IntCounter::with_opts(
            Opts::new("game_ticks_total", "Total number of game ticks processed")
                .namespace(namespace)
        )?;
        registry.register(Box::new(game_ticks_total.clone()))?;
        
        // システムメトリクス
        let memory_usage_bytes = IntGauge::with_opts(
            Opts::new("memory_usage_bytes", "Current memory usage in bytes")
                .namespace(namespace)
        )?;
        registry.register(Box::new(memory_usage_bytes.clone()))?;
        
        let cpu_usage_percent = Gauge::with_opts(
            Opts::new("cpu_usage_percent", "Current CPU usage percentage")
                .namespace(namespace)
        )?;
        registry.register(Box::new(cpu_usage_percent.clone()))?;
        
        let goroutines_count = IntGauge::with_opts(
            Opts::new("goroutines_count", "Number of active goroutines")
                .namespace(namespace)
        )?;
        registry.register(Box::new(goroutines_count.clone()))?;
        
        let metrics = PerformanceMetrics {
            http_requests_total,
            http_request_duration,
            http_requests_in_flight,
            websocket_connections_total,
            websocket_messages_sent,
            websocket_messages_received,
            websocket_compression_ratio,
            physics_calculations_total,
            physics_calculation_duration,
            physics_bodies_count,
            physics_collision_checks,
            database_queries_total,
            database_query_duration,
            database_connections_active,
            database_pool_size,
            cache_operations_total,
            cache_hits_total,
            cache_misses_total,
            cache_size_bytes,
            active_players,
            celestial_bodies_total,
            resource_generation_rate,
            game_ticks_total,
            memory_usage_bytes,
            cpu_usage_percent,
            goroutines_count,
        };
        
        info!("Metrics service initialized with namespace: {}", namespace);
        
        Ok(Self {
            config,
            registry,
            metrics,
            timers: Arc::new(Mutex::new(HashMap::new())),
        })
    }
    
    /// タイマーを開始
    pub fn start_timer(&self, name: &str) -> String {
        let timer_id = format!("{}_{}", name, Uuid::new_v4());
        if let Ok(mut timers) = self.timers.lock() {
            timers.insert(timer_id.clone(), Instant::now());
        }
        timer_id
    }
    
    /// タイマーを終了して期間を記録
    pub fn end_timer(&self, timer_id: &str, histogram: &Histogram) -> f64 {
        if let Ok(mut timers) = self.timers.lock() {
            if let Some(start_time) = timers.remove(timer_id) {
                let duration = start_time.elapsed().as_secs_f64();
                histogram.observe(duration);
                return duration;
            }
        }
        0.0
    }
    
    /// HTTPリクエスト開始を記録
    pub fn record_http_request_start(&self) {
        self.metrics.http_requests_total.inc();
        self.metrics.http_requests_in_flight.inc();
    }
    
    /// HTTPリクエスト完了を記録
    pub fn record_http_request_end(&self, duration_secs: f64) {
        self.metrics.http_request_duration.observe(duration_secs);
        self.metrics.http_requests_in_flight.dec();
    }
    
    /// WebSocket接続変更を記録
    pub fn record_websocket_connection_change(&self, delta: i64) {
        if delta > 0 {
            self.metrics.websocket_connections_total.add(delta);
        } else {
            self.metrics.websocket_connections_total.sub(-delta);
        }
    }
    
    /// WebSocketメッセージを記録
    pub fn record_websocket_message(&self, sent: bool, compressed: bool, original_size: usize, final_size: usize) {
        if sent {
            self.metrics.websocket_messages_sent.inc();
        } else {
            self.metrics.websocket_messages_received.inc();
        }
        
        if compressed && original_size > 0 {
            let ratio = final_size as f64 / original_size as f64;
            self.metrics.websocket_compression_ratio.set(ratio);
        }
    }
    
    /// 物理演算を記録
    pub fn record_physics_calculation(&self, duration_secs: f64, body_count: usize, collision_checks: usize) {
        self.metrics.physics_calculations_total.inc();
        self.metrics.physics_calculation_duration.observe(duration_secs);
        self.metrics.physics_bodies_count.set(body_count as i64);
        self.metrics.physics_collision_checks.add(collision_checks as u64);
    }
    
    /// データベースクエリを記録
    pub fn record_database_query(&self, duration_secs: f64) {
        self.metrics.database_queries_total.inc();
        self.metrics.database_query_duration.observe(duration_secs);
    }
    
    /// データベース接続プール状態を記録
    pub fn record_database_pool_state(&self, active_connections: usize, pool_size: usize) {
        self.metrics.database_connections_active.set(active_connections as i64);
        self.metrics.database_pool_size.set(pool_size as i64);
    }
    
    /// キャッシュ操作を記録
    pub fn record_cache_operation(&self, hit: bool, cache_size_bytes: usize) {
        self.metrics.cache_operations_total.inc();
        if hit {
            self.metrics.cache_hits_total.inc();
        } else {
            self.metrics.cache_misses_total.inc();
        }
        self.metrics.cache_size_bytes.set(cache_size_bytes as i64);
    }
    
    /// ゲーム状態を記録
    pub fn record_game_state(&self, active_players: usize, celestial_bodies: usize, resource_rate: f64) {
        self.metrics.active_players.set(active_players as i64);
        self.metrics.celestial_bodies_total.set(celestial_bodies as i64);
        self.metrics.resource_generation_rate.set(resource_rate);
        self.metrics.game_ticks_total.inc();
    }
    
    /// システムリソースを記録
    pub fn record_system_resources(&self, memory_bytes: usize, cpu_percent: f64) {
        self.metrics.memory_usage_bytes.set(memory_bytes as i64);
        self.metrics.cpu_usage_percent.set(cpu_percent);
    }
    
    /// メトリクスを文字列として出力
    pub fn export_metrics(&self) -> Result<String> {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();
        encoder.encode(&metric_families, &mut buffer)?;
        Ok(String::from_utf8(buffer)?)
    }
    
    /// メトリクス統計サマリーを取得
    pub fn get_metrics_summary(&self) -> MetricsSummary {
        MetricsSummary {
            http_requests_total: self.metrics.http_requests_total.get(),
            websocket_connections: self.metrics.websocket_connections_total.get(),
            physics_calculations_total: self.metrics.physics_calculations_total.get(),
            database_queries_total: self.metrics.database_queries_total.get(),
            cache_hit_rate: self.calculate_cache_hit_rate(),
            active_players: self.metrics.active_players.get(),
            celestial_bodies: self.metrics.celestial_bodies_total.get(),
            memory_usage_mb: self.metrics.memory_usage_bytes.get() as f64 / 1024.0 / 1024.0,
            cpu_usage_percent: self.metrics.cpu_usage_percent.get(),
        }
    }
    
    /// キャッシュヒット率を計算
    fn calculate_cache_hit_rate(&self) -> f64 {
        let hits = self.metrics.cache_hits_total.get() as f64;
        let misses = self.metrics.cache_misses_total.get() as f64;
        let total = hits + misses;
        
        if total > 0.0 {
            hits / total
        } else {
            0.0
        }
    }
    
    /// メトリクスサービスへの参照を取得
    pub fn metrics(&self) -> &PerformanceMetrics {
        &self.metrics
    }
    
    /// 設定を取得
    pub fn config(&self) -> &MetricsConfig {
        &self.config
    }
}

/// メトリクス統計サマリー
#[derive(Debug, Clone, serde::Serialize)]
pub struct MetricsSummary {
    pub http_requests_total: u64,
    pub websocket_connections: i64,
    pub physics_calculations_total: u64,
    pub database_queries_total: u64,
    pub cache_hit_rate: f64,
    pub active_players: i64,
    pub celestial_bodies: i64,
    pub memory_usage_mb: f64,
    pub cpu_usage_percent: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_metrics_service_creation() {
        let config = MetricsConfig::default();
        let service = MetricsService::new(config).unwrap();
        
        // 基本的なメトリクス記録をテスト
        service.record_http_request_start();
        service.record_http_request_end(0.1);
        
        service.record_websocket_connection_change(1);
        service.record_websocket_message(true, true, 1000, 500);
        
        service.record_physics_calculation(0.05, 100, 200);
        service.record_database_query(0.02);
        service.record_cache_operation(true, 1024);
        
        // メトリクス出力をテスト
        let metrics_output = service.export_metrics().unwrap();
        assert!(metrics_output.contains("cosmic_gardener"));
    }
    
    #[test]
    fn test_timer_functionality() {
        let config = MetricsConfig::default();
        let service = MetricsService::new(config).unwrap();
        
        let timer_id = service.start_timer("test");
        std::thread::sleep(std::time::Duration::from_millis(10));
        let duration = service.end_timer(&timer_id, &service.metrics.http_request_duration);
        
        assert!(duration > 0.0);
    }
    
    #[test]
    fn test_cache_hit_rate_calculation() {
        let config = MetricsConfig::default();
        let service = MetricsService::new(config).unwrap();
        
        // キャッシュヒット率のテスト
        service.record_cache_operation(true, 1024);   // hit
        service.record_cache_operation(true, 1024);   // hit  
        service.record_cache_operation(false, 1024);  // miss
        
        let summary = service.get_metrics_summary();
        assert!((summary.cache_hit_rate - 0.6666666666666666).abs() < f64::EPSILON);
    }
}