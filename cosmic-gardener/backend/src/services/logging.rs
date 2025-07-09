//! 構造化ログサービス

use tracing::{info, warn, error, debug, Level};
use tracing_subscriber::{
    fmt::{format::FmtSpan, layer},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter, Registry,
};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use anyhow::Result;

/// ログレベル設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: LogFormat,
    pub output: LogOutput,
    pub include_location: bool,
    pub include_targets: Vec<String>,
    pub exclude_targets: Vec<String>,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            format: LogFormat::Json,
            output: LogOutput::Stdout,
            include_location: true,
            include_targets: vec![
                "cosmic_gardener_backend".to_string(),
                "actix_web".to_string(),
            ],
            exclude_targets: vec![
                "hyper".to_string(),
                "mio".to_string(),
            ],
        }
    }
}

/// ログ出力形式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogFormat {
    Json,
    Pretty,
    Compact,
}

/// ログ出力先
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogOutput {
    Stdout,
    File(String),
    Both(String),
}

/// リクエストコンテキスト
#[derive(Debug, Clone, Serialize)]
pub struct RequestContext {
    pub request_id: Uuid,
    pub user_id: Option<Uuid>,
    pub session_id: Option<Uuid>,
    pub method: Option<String>,
    pub path: Option<String>,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub started_at: u64,
}

impl RequestContext {
    pub fn new() -> Self {
        Self {
            request_id: Uuid::new_v4(),
            user_id: None,
            session_id: None,
            method: None,
            path: None,
            user_agent: None,
            ip_address: None,
            started_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }

    pub fn with_user(mut self, user_id: Uuid) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_session(mut self, session_id: Uuid) -> Self {
        self.session_id = Some(session_id);
        self
    }

    pub fn with_request(mut self, method: String, path: String) -> Self {
        self.method = Some(method);
        self.path = Some(path);
        self
    }

    pub fn with_client_info(mut self, user_agent: Option<String>, ip_address: Option<String>) -> Self {
        self.user_agent = user_agent;
        self.ip_address = ip_address;
        self
    }

    pub fn elapsed_ms(&self) -> u64 {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        now.saturating_sub(self.started_at)
    }
}

/// パフォーマンスメトリクス
#[derive(Debug, Clone, Serialize)]
pub struct PerformanceMetrics {
    pub duration_ms: u64,
    pub memory_used_mb: Option<f64>,
    pub cpu_usage_percent: Option<f64>,
    pub database_queries: Option<usize>,
    pub cache_hits: Option<usize>,
    pub cache_misses: Option<usize>,
}

impl PerformanceMetrics {
    pub fn new(duration_ms: u64) -> Self {
        Self {
            duration_ms,
            memory_used_mb: None,
            cpu_usage_percent: None,
            database_queries: None,
            cache_hits: None,
            cache_misses: None,
        }
    }

    pub fn with_memory(mut self, memory_mb: f64) -> Self {
        self.memory_used_mb = Some(memory_mb);
        self
    }

    pub fn with_cpu(mut self, cpu_percent: f64) -> Self {
        self.cpu_usage_percent = Some(cpu_percent);
        self
    }

    pub fn with_database(mut self, queries: usize) -> Self {
        self.database_queries = Some(queries);
        self
    }

    pub fn with_cache(mut self, hits: usize, misses: usize) -> Self {
        self.cache_hits = Some(hits);
        self.cache_misses = Some(misses);
        self
    }
}

/// エラーコンテキスト
#[derive(Debug, Clone, Serialize)]
pub struct ErrorContext {
    pub error_type: String,
    pub error_message: String,
    pub stack_trace: Option<String>,
    pub additional_data: HashMap<String, serde_json::Value>,
}

impl ErrorContext {
    pub fn new(error_type: String, error_message: String) -> Self {
        Self {
            error_type,
            error_message,
            stack_trace: None,
            additional_data: HashMap::new(),
        }
    }

    pub fn with_stack_trace(mut self, stack_trace: String) -> Self {
        self.stack_trace = Some(stack_trace);
        self
    }

    pub fn with_data(mut self, key: String, value: serde_json::Value) -> Self {
        self.additional_data.insert(key, value);
        self
    }
}

/// ログサービス
pub struct LoggingService;

impl LoggingService {
    /// ログシステムを初期化
    pub fn init(config: LoggingConfig) -> Result<()> {
        let env_filter = Self::build_env_filter(&config)?;
        
        let registry = Registry::default().with(env_filter);

        match config.format {
            LogFormat::Json => {
                let layer = layer()
                    .json()
                    .with_span_events(FmtSpan::CLOSE)
                    .with_current_span(false)
                    .with_target(true);

                match config.output {
                    LogOutput::Stdout => {
                        registry.with(layer).init();
                    }
                    LogOutput::File(path) => {
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&path)?;
                        let layer = layer.with_writer(file);
                        registry.with(layer).init();
                    }
                    LogOutput::Both(path) => {
                        let stdout_layer = layer.clone();
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&path)?;
                        let file_layer = layer.with_writer(file);
                        registry.with(stdout_layer).with(file_layer).init();
                    }
                }
            }
            LogFormat::Pretty => {
                let layer = layer()
                    .pretty()
                    .with_span_events(FmtSpan::CLOSE)
                    .with_target(config.include_location);

                match config.output {
                    LogOutput::Stdout => {
                        registry.with(layer).init();
                    }
                    LogOutput::File(path) => {
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&path)?;
                        let layer = layer.with_writer(file);
                        registry.with(layer).init();
                    }
                    LogOutput::Both(path) => {
                        let stdout_layer = layer.clone();
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&path)?;
                        let file_layer = layer.with_writer(file);
                        registry.with(stdout_layer).with(file_layer).init();
                    }
                }
            }
            LogFormat::Compact => {
                let layer = layer()
                    .compact()
                    .with_span_events(FmtSpan::NONE)
                    .with_target(false);

                match config.output {
                    LogOutput::Stdout => {
                        registry.with(layer).init();
                    }
                    LogOutput::File(path) => {
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&path)?;
                        let layer = layer.with_writer(file);
                        registry.with(layer).init();
                    }
                    LogOutput::Both(path) => {
                        let stdout_layer = layer.clone();
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&path)?;
                        let file_layer = layer.with_writer(file);
                        registry.with(stdout_layer).with(file_layer).init();
                    }
                }
            }
        }

        info!("Logging system initialized with config: {:?}", config);
        Ok(())
    }

    fn build_env_filter(config: &LoggingConfig) -> Result<EnvFilter> {
        let mut filter = EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new(&config.level));

        // 含めるターゲットを追加
        for target in &config.include_targets {
            filter = filter.add_directive(
                format!("{}={}", target, config.level).parse()?
            );
        }

        // 除外するターゲットを設定
        for target in &config.exclude_targets {
            filter = filter.add_directive(
                format!("{}=off", target).parse()?
            );
        }

        Ok(filter)
    }

    /// リクエスト開始をログ
    pub fn log_request_start(ctx: &RequestContext) {
        info!(
            request_id = %ctx.request_id,
            user_id = ?ctx.user_id,
            session_id = ?ctx.session_id,
            method = ?ctx.method,
            path = ?ctx.path,
            user_agent = ?ctx.user_agent,
            ip_address = ?ctx.ip_address,
            "Request started"
        );
    }

    /// リクエスト完了をログ
    pub fn log_request_end(ctx: &RequestContext, status_code: u16, metrics: &PerformanceMetrics) {
        let level = if status_code >= 500 {
            Level::ERROR
        } else if status_code >= 400 {
            Level::WARN
        } else {
            Level::INFO
        };

        match level {
            Level::ERROR => error!(
                request_id = %ctx.request_id,
                user_id = ?ctx.user_id,
                status_code = status_code,
                duration_ms = metrics.duration_ms,
                memory_used_mb = ?metrics.memory_used_mb,
                cpu_usage_percent = ?metrics.cpu_usage_percent,
                database_queries = ?metrics.database_queries,
                cache_hits = ?metrics.cache_hits,
                cache_misses = ?metrics.cache_misses,
                "Request completed with error"
            ),
            Level::WARN => warn!(
                request_id = %ctx.request_id,
                user_id = ?ctx.user_id,
                status_code = status_code,
                duration_ms = metrics.duration_ms,
                "Request completed with warning"
            ),
            _ => info!(
                request_id = %ctx.request_id,
                user_id = ?ctx.user_id,
                status_code = status_code,
                duration_ms = metrics.duration_ms,
                memory_used_mb = ?metrics.memory_used_mb,
                database_queries = ?metrics.database_queries,
                cache_hits = ?metrics.cache_hits,
                cache_misses = ?metrics.cache_misses,
                "Request completed successfully"
            ),
        }
    }

    /// エラーをログ
    pub fn log_error(ctx: &RequestContext, error_ctx: &ErrorContext) {
        error!(
            request_id = %ctx.request_id,
            user_id = ?ctx.user_id,
            error_type = %error_ctx.error_type,
            error_message = %error_ctx.error_message,
            stack_trace = ?error_ctx.stack_trace,
            additional_data = ?error_ctx.additional_data,
            "Error occurred"
        );
    }

    /// WebSocketイベントをログ
    pub fn log_websocket_event(
        session_id: Uuid,
        user_id: Option<Uuid>,
        event_type: &str,
        data: Option<serde_json::Value>,
    ) {
        info!(
            session_id = %session_id,
            user_id = ?user_id,
            event_type = event_type,
            data = ?data,
            "WebSocket event"
        );
    }

    /// データベースクエリをログ
    pub fn log_database_query(
        ctx: &RequestContext,
        query_type: &str,
        duration_ms: u64,
        affected_rows: Option<u64>,
    ) {
        debug!(
            request_id = %ctx.request_id,
            query_type = query_type,
            duration_ms = duration_ms,
            affected_rows = ?affected_rows,
            "Database query executed"
        );
    }

    /// キャッシュ操作をログ
    pub fn log_cache_operation(
        ctx: &RequestContext,
        operation: &str,
        key: &str,
        hit: bool,
        duration_ms: u64,
    ) {
        debug!(
            request_id = %ctx.request_id,
            operation = operation,
            key = key,
            hit = hit,
            duration_ms = duration_ms,
            "Cache operation"
        );
    }

    /// 物理演算のパフォーマンスをログ
    pub fn log_physics_performance(
        body_count: usize,
        algorithm: &str,
        duration_ms: u64,
        memory_usage_mb: Option<f64>,
    ) {
        info!(
            body_count = body_count,
            algorithm = algorithm,
            duration_ms = duration_ms,
            memory_usage_mb = ?memory_usage_mb,
            "Physics calculation completed"
        );
    }

    /// セキュリティイベントをログ
    pub fn log_security_event(
        event_type: &str,
        user_id: Option<Uuid>,
        ip_address: Option<&str>,
        details: HashMap<String, serde_json::Value>,
    ) {
        warn!(
            event_type = event_type,
            user_id = ?user_id,
            ip_address = ?ip_address,
            details = ?details,
            "Security event detected"
        );
    }

    /// ビジネスロジックイベントをログ
    pub fn log_business_event(
        ctx: &RequestContext,
        event_type: &str,
        entity_type: &str,
        entity_id: Uuid,
        action: &str,
        result: &str,
    ) {
        info!(
            request_id = %ctx.request_id,
            user_id = ?ctx.user_id,
            event_type = event_type,
            entity_type = entity_type,
            entity_id = %entity_id,
            action = action,
            result = result,
            "Business event"
        );
    }
}

/// ログマクロ用のヘルパー
#[macro_export]
macro_rules! log_with_context {
    ($level:ident, $ctx:expr, $($key:ident = $value:expr),* $(,)? ; $msg:expr) => {
        tracing::$level!(
            request_id = %$ctx.request_id,
            user_id = ?$ctx.user_id,
            $($key = $value,)*
            $msg
        );
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io;

    #[test]
    fn test_request_context_creation() {
        let ctx = RequestContext::new()
            .with_user(Uuid::new_v4())
            .with_session(Uuid::new_v4())
            .with_request("GET".to_string(), "/api/test".to_string())
            .with_client_info(
                Some("TestAgent/1.0".to_string()),
                Some("127.0.0.1".to_string()),
            );

        assert!(ctx.user_id.is_some());
        assert!(ctx.session_id.is_some());
        assert_eq!(ctx.method, Some("GET".to_string()));
        assert_eq!(ctx.path, Some("/api/test".to_string()));
    }

    #[test]
    fn test_performance_metrics() {
        let metrics = PerformanceMetrics::new(100)
            .with_memory(256.5)
            .with_cpu(45.2)
            .with_database(3)
            .with_cache(10, 2);

        assert_eq!(metrics.duration_ms, 100);
        assert_eq!(metrics.memory_used_mb, Some(256.5));
        assert_eq!(metrics.cpu_usage_percent, Some(45.2));
        assert_eq!(metrics.database_queries, Some(3));
        assert_eq!(metrics.cache_hits, Some(10));
        assert_eq!(metrics.cache_misses, Some(2));
    }

    #[test]
    fn test_error_context() {
        let mut error_ctx = ErrorContext::new(
            "ValidationError".to_string(),
            "Invalid input data".to_string(),
        )
        .with_stack_trace("stack trace here".to_string())
        .with_data("field".to_string(), serde_json::json!("email"));

        assert_eq!(error_ctx.error_type, "ValidationError");
        assert_eq!(error_ctx.error_message, "Invalid input data");
        assert!(error_ctx.stack_trace.is_some());
        assert_eq!(error_ctx.additional_data.len(), 1);
    }

    #[test]
    fn test_logging_config_default() {
        let config = LoggingConfig::default();
        assert_eq!(config.level, "info");
        assert!(matches!(config.format, LogFormat::Json));
        assert!(matches!(config.output, LogOutput::Stdout));
        assert!(config.include_location);
    }
}