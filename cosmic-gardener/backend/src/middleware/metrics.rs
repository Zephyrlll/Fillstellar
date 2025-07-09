//! メトリクス収集ミドルウェア

use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
    sync::Arc,
    time::Instant,
};

use crate::services::metrics::MetricsService;

/// メトリクス収集ミドルウェア
pub struct MetricsMiddleware {
    metrics_service: Arc<MetricsService>,
}

impl MetricsMiddleware {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }
}

impl<S, B> Transform<S, ServiceRequest> for MetricsMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = MetricsMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(MetricsMiddlewareService {
            service: Rc::new(service),
            metrics_service: self.metrics_service.clone(),
        }))
    }
}

pub struct MetricsMiddlewareService<S> {
    service: Rc<S>,
    metrics_service: Arc<MetricsService>,
}

impl<S, B> Service<ServiceRequest> for MetricsMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let start_time = Instant::now();
        let service = self.service.clone();
        let metrics_service = self.metrics_service.clone();

        // リクエスト開始をメトリクスに記録
        metrics_service.record_http_request_start();

        Box::pin(async move {
            let result = service.call(req).await;
            let duration = start_time.elapsed().as_secs_f64();

            match result {
                Ok(response) => {
                    // レスポンス完了をメトリクスに記録
                    metrics_service.record_http_request_end(duration);
                    Ok(response)
                }
                Err(error) => {
                    // エラーの場合もメトリクスに記録
                    metrics_service.record_http_request_end(duration);
                    Err(error)
                }
            }
        })
    }
}

/// WebSocketメトリクス記録ヘルパー
pub struct WebSocketMetricsRecorder {
    metrics_service: Arc<MetricsService>,
}

impl WebSocketMetricsRecorder {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }

    /// WebSocket接続開始を記録
    pub fn record_connection_opened(&self) {
        self.metrics_service.record_websocket_connection_change(1);
    }

    /// WebSocket接続終了を記録
    pub fn record_connection_closed(&self) {
        self.metrics_service.record_websocket_connection_change(-1);
    }

    /// WebSocketメッセージ送信を記録
    pub fn record_message_sent(&self, compressed: bool, original_size: usize, final_size: usize) {
        self.metrics_service.record_websocket_message(true, compressed, original_size, final_size);
    }

    /// WebSocketメッセージ受信を記録
    pub fn record_message_received(&self, compressed: bool, original_size: usize, final_size: usize) {
        self.metrics_service.record_websocket_message(false, compressed, original_size, final_size);
    }
}

/// 物理演算メトリクス記録ヘルパー
pub struct PhysicsMetricsRecorder {
    metrics_service: Arc<MetricsService>,
}

impl PhysicsMetricsRecorder {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }

    /// 物理演算実行を記録
    pub fn record_physics_calculation(&self, duration_secs: f64, body_count: usize, collision_checks: usize) {
        self.metrics_service.record_physics_calculation(duration_secs, body_count, collision_checks);
    }

    /// タイマーを開始
    pub fn start_timer(&self) -> String {
        self.metrics_service.start_timer("physics")
    }

    /// タイマーを終了して結果を記録
    pub fn end_timer(&self, timer_id: &str, body_count: usize, collision_checks: usize) -> f64 {
        let duration = self.metrics_service.end_timer(timer_id, &self.metrics_service.metrics().physics_calculation_duration);
        self.metrics_service.record_physics_calculation(duration, body_count, collision_checks);
        duration
    }
}

/// データベースメトリクス記録ヘルパー
pub struct DatabaseMetricsRecorder {
    metrics_service: Arc<MetricsService>,
}

impl DatabaseMetricsRecorder {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }

    /// データベースクエリ実行を記録
    pub fn record_query(&self, duration_secs: f64) {
        self.metrics_service.record_database_query(duration_secs);
    }

    /// データベース接続プール状態を記録
    pub fn record_pool_state(&self, active_connections: usize, pool_size: usize) {
        self.metrics_service.record_database_pool_state(active_connections, pool_size);
    }

    /// タイマーを開始
    pub fn start_timer(&self) -> String {
        self.metrics_service.start_timer("database")
    }

    /// タイマーを終了して結果を記録
    pub fn end_timer(&self, timer_id: &str) -> f64 {
        self.metrics_service.end_timer(timer_id, &self.metrics_service.metrics().database_query_duration)
    }
}

/// キャッシュメトリクス記録ヘルパー
pub struct CacheMetricsRecorder {
    metrics_service: Arc<MetricsService>,
}

impl CacheMetricsRecorder {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }

    /// キャッシュ操作を記録
    pub fn record_operation(&self, hit: bool, cache_size_bytes: usize) {
        self.metrics_service.record_cache_operation(hit, cache_size_bytes);
    }

    /// キャッシュヒットを記録
    pub fn record_hit(&self, cache_size_bytes: usize) {
        self.record_operation(true, cache_size_bytes);
    }

    /// キャッシュミスを記録
    pub fn record_miss(&self, cache_size_bytes: usize) {
        self.record_operation(false, cache_size_bytes);
    }
}

/// ゲームメトリクス記録ヘルパー
pub struct GameMetricsRecorder {
    metrics_service: Arc<MetricsService>,
}

impl GameMetricsRecorder {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }

    /// ゲーム状態を記録
    pub fn record_game_state(&self, active_players: usize, celestial_bodies: usize, resource_rate: f64) {
        self.metrics_service.record_game_state(active_players, celestial_bodies, resource_rate);
    }

    /// ゲームティックを記録
    pub fn record_game_tick(&self) {
        self.metrics_service.metrics().game_ticks_total.inc();
    }

    /// プレイヤー数を更新
    pub fn update_active_players(&self, count: usize) {
        self.metrics_service.metrics().active_players.set(count as i64);
    }

    /// 天体数を更新
    pub fn update_celestial_bodies(&self, count: usize) {
        self.metrics_service.metrics().celestial_bodies_total.set(count as i64);
    }
}

/// システムメトリクス記録ヘルパー
pub struct SystemMetricsRecorder {
    metrics_service: Arc<MetricsService>,
}

impl SystemMetricsRecorder {
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self { metrics_service }
    }

    /// システムリソース使用量を記録
    pub fn record_system_resources(&self, memory_bytes: usize, cpu_percent: f64) {
        self.metrics_service.record_system_resources(memory_bytes, cpu_percent);
    }

    /// メモリ使用量を取得・記録
    pub fn update_memory_usage(&self) {
        #[cfg(target_os = "linux")]
        {
            if let Ok(memory) = Self::get_memory_usage() {
                self.metrics_service.metrics().memory_usage_bytes.set(memory as i64);
            }
        }
    }

    /// CPU使用率を取得・記録
    pub fn update_cpu_usage(&self, cpu_percent: f64) {
        self.metrics_service.metrics().cpu_usage_percent.set(cpu_percent);
    }

    #[cfg(target_os = "linux")]
    fn get_memory_usage() -> Result<usize, std::io::Error> {
        use std::fs;
        
        let status = fs::read_to_string("/proc/self/status")?;
        for line in status.lines() {
            if line.starts_with("VmRSS:") {
                if let Some(kb_str) = line.split_whitespace().nth(1) {
                    if let Ok(kb) = kb_str.parse::<usize>() {
                        return Ok(kb * 1024); // KBからバイトに変換
                    }
                }
            }
        }
        Ok(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};
    
    async fn test_handler() -> actix_web::Result<HttpResponse> {
        Ok(HttpResponse::Ok().json("test"))
    }

    #[actix_web::test]
    async fn test_metrics_middleware() {
        let config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(config).unwrap());

        let app = test::init_service(
            App::new()
                .wrap(MetricsMiddleware::new(metrics_service.clone()))
                .route("/test", web::get().to(test_handler))
        ).await;

        let req = test::TestRequest::get().uri("/test").to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
        
        // メトリクスが記録されているかチェック
        let summary = metrics_service.get_metrics_summary();
        assert!(summary.http_requests_total > 0);
    }

    #[test]
    fn test_metrics_recorders() {
        let config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(config).unwrap());

        // WebSocketレコーダーのテスト
        let ws_recorder = WebSocketMetricsRecorder::new(metrics_service.clone());
        ws_recorder.record_connection_opened();
        ws_recorder.record_message_sent(true, 1000, 500);

        // 物理演算レコーダーのテスト
        let physics_recorder = PhysicsMetricsRecorder::new(metrics_service.clone());
        physics_recorder.record_physics_calculation(0.05, 100, 200);

        // データベースレコーダーのテスト
        let db_recorder = DatabaseMetricsRecorder::new(metrics_service.clone());
        db_recorder.record_query(0.02);

        // キャッシュレコーダーのテスト
        let cache_recorder = CacheMetricsRecorder::new(metrics_service.clone());
        cache_recorder.record_hit(1024);
        cache_recorder.record_miss(1024);

        // ゲームレコーダーのテスト
        let game_recorder = GameMetricsRecorder::new(metrics_service.clone());
        game_recorder.record_game_state(10, 50, 100.5);

        let summary = metrics_service.get_metrics_summary();
        assert!(summary.physics_calculations_total > 0);
        assert!(summary.database_queries_total > 0);
        assert!(summary.websocket_connections > 0);
        assert_eq!(summary.active_players, 10);
        assert_eq!(summary.celestial_bodies, 50);
    }
}