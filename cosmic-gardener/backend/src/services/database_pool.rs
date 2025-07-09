//! 高性能データベース接続プール管理

use deadpool_postgres::{Config as PoolConfig, Pool, Runtime};
use tokio_postgres::{Config as PgConfig, NoTls};
use std::time::{Duration, Instant};
use std::sync::Arc;
use anyhow::{Result, anyhow};
use tracing::{info, warn, error, debug, instrument};
use serde::{Serialize, Deserialize};

use crate::services::metrics::MetricsService;
use crate::middleware::metrics::DatabaseMetricsRecorder;

/// データベースプール設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabasePoolConfig {
    pub max_size: usize,
    pub timeouts: TimeoutConfig,
    pub health_check: HealthCheckConfig,
    pub connection_params: ConnectionParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutConfig {
    pub wait_for_connection_secs: u64,
    pub connection_timeout_secs: u64,
    pub idle_timeout_secs: u64,
    pub max_lifetime_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    pub enabled: bool,
    pub interval_secs: u64,
    pub timeout_secs: u64,
    pub failure_threshold: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionParams {
    pub statement_timeout_secs: u64,
    pub lock_timeout_secs: u64,
    pub idle_in_transaction_session_timeout_secs: u64,
    pub tcp_keepalives_idle_secs: u64,
    pub tcp_keepalives_interval_secs: u64,
    pub tcp_keepalives_count: u32,
}

impl Default for DatabasePoolConfig {
    fn default() -> Self {
        Self {
            max_size: 20,
            timeouts: TimeoutConfig {
                wait_for_connection_secs: 30,
                connection_timeout_secs: 5,
                idle_timeout_secs: 600,
                max_lifetime_secs: 3600,
            },
            health_check: HealthCheckConfig {
                enabled: true,
                interval_secs: 30,
                timeout_secs: 5,
                failure_threshold: 3,
            },
            connection_params: ConnectionParams {
                statement_timeout_secs: 60,
                lock_timeout_secs: 30,
                idle_in_transaction_session_timeout_secs: 60,
                tcp_keepalives_idle_secs: 600,
                tcp_keepalives_interval_secs: 60,
                tcp_keepalives_count: 3,
            },
        }
    }
}

/// 接続プール統計
#[derive(Debug, Clone, Serialize)]
pub struct PoolStats {
    pub size: usize,
    pub available: usize,
    pub waiting: usize,
    pub total_connections_created: u64,
    pub total_connections_closed: u64,
    pub total_queries_executed: u64,
    pub average_query_time_ms: f64,
    pub health_check_status: HealthStatus,
    pub last_health_check: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// 拡張データベースプールマネージャー
pub struct EnhancedDatabasePool {
    pool: Pool,
    config: DatabasePoolConfig,
    metrics_recorder: DatabaseMetricsRecorder,
    stats: Arc<tokio::sync::Mutex<PoolStats>>,
    health_status: Arc<tokio::sync::RwLock<HealthStatus>>,
}

impl EnhancedDatabasePool {
    /// 新しいプールを作成
    #[instrument(skip(database_url, metrics_service))]
    pub async fn new(
        database_url: &str,
        config: DatabasePoolConfig,
        metrics_service: Arc<MetricsService>,
    ) -> Result<Self> {
        info!("Creating enhanced database pool with max_size: {}", config.max_size);

        // PostgreSQL設定を構築
        let mut pg_config: PgConfig = database_url.parse()?;
        
        // 接続パラメータを設定
        pg_config
            .connect_timeout(Duration::from_secs(config.timeouts.connection_timeout_secs))
            .keepalives(true)
            .keepalives_idle(Duration::from_secs(config.connection_params.tcp_keepalives_idle_secs))
            .keepalives_interval(Duration::from_secs(config.connection_params.tcp_keepalives_interval_secs))
            .keepalives_retries(config.connection_params.tcp_keepalives_count);

        // プール設定を構築
        let mut pool_config = PoolConfig::new();
        pool_config.max_size = config.max_size;
        pool_config.timeouts.wait = Some(Duration::from_secs(config.timeouts.wait_for_connection_secs));
        pool_config.timeouts.create = Some(Duration::from_secs(config.timeouts.connection_timeout_secs));
        pool_config.timeouts.recycle = Some(Duration::from_secs(config.timeouts.idle_timeout_secs));

        // プールを作成
        let pool = pool_config.create_pool(Some(Runtime::Tokio1), NoTls)?;

        let metrics_recorder = DatabaseMetricsRecorder::new(metrics_service);
        
        let stats = Arc::new(tokio::sync::Mutex::new(PoolStats {
            size: 0,
            available: 0,
            waiting: 0,
            total_connections_created: 0,
            total_connections_closed: 0,
            total_queries_executed: 0,
            average_query_time_ms: 0.0,
            health_check_status: HealthStatus::Healthy,
            last_health_check: None,
        }));

        let health_status = Arc::new(tokio::sync::RwLock::new(HealthStatus::Healthy));

        let pool_manager = Self {
            pool,
            config,
            metrics_recorder,
            stats,
            health_status,
        };

        // 初期接続テスト
        pool_manager.test_connection().await?;
        
        // ヘルスチェックタスクを開始
        if pool_manager.config.health_check.enabled {
            pool_manager.start_health_check_task().await;
        }

        // メトリクス更新タスクを開始
        pool_manager.start_metrics_update_task().await;

        info!("Enhanced database pool created successfully");
        Ok(pool_manager)
    }

    /// 接続をテスト
    #[instrument(skip(self))]
    async fn test_connection(&self) -> Result<()> {
        debug!("Testing database connection");
        let timer_id = self.metrics_recorder.start_timer();
        
        let result = async {
            let client = self.pool.get().await?;
            let rows = client.query("SELECT 1", &[]).await?;
            
            if rows.len() != 1 {
                return Err(anyhow!("Unexpected result from connection test"));
            }
            
            Ok::<(), anyhow::Error>(())
        }.await;

        let duration = self.metrics_recorder.end_timer(&timer_id);
        
        match result {
            Ok(_) => {
                debug!("Database connection test passed in {:.3}ms", duration * 1000.0);
                Ok(())
            }
            Err(e) => {
                error!("Database connection test failed: {}", e);
                Err(e)
            }
        }
    }

    /// ヘルスチェックタスクを開始
    async fn start_health_check_task(&self) {
        let pool = self.pool.clone();
        let config = self.config.clone();
        let health_status = self.health_status.clone();
        let stats = self.stats.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(config.health_check.interval_secs));
            let mut failure_count = 0;
            
            loop {
                interval.tick().await;
                
                let start_time = Instant::now();
                let health_result = tokio::time::timeout(
                    Duration::from_secs(config.health_check.timeout_secs),
                    async {
                        let client = pool.get().await?;
                        client.query("SELECT 1", &[]).await?;
                        Ok::<(), anyhow::Error>(())
                    }
                ).await;
                
                let duration = start_time.elapsed();
                
                match health_result {
                    Ok(Ok(_)) => {
                        failure_count = 0;
                        let mut status = health_status.write().await;
                        *status = HealthStatus::Healthy;
                        
                        let mut stats_lock = stats.lock().await;
                        stats_lock.health_check_status = HealthStatus::Healthy;
                        stats_lock.last_health_check = Some(chrono::Utc::now());
                        
                        debug!("Health check passed in {:?}", duration);
                    }
                    Ok(Err(e)) | Err(_) => {
                        failure_count += 1;
                        warn!("Health check failed (attempt {}): {:?}", failure_count, health_result);
                        
                        let new_status = if failure_count >= config.health_check.failure_threshold {
                            HealthStatus::Unhealthy
                        } else {
                            HealthStatus::Degraded
                        };
                        
                        let mut status = health_status.write().await;
                        *status = new_status.clone();
                        
                        let mut stats_lock = stats.lock().await;
                        stats_lock.health_check_status = new_status;
                        stats_lock.last_health_check = Some(chrono::Utc::now());
                    }
                }
            }
        });
    }

    /// メトリクス更新タスクを開始
    async fn start_metrics_update_task(&self) {
        let stats = self.stats.clone();
        let metrics_recorder = self.metrics_recorder.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(10));
            
            loop {
                interval.tick().await;
                
                let stats_lock = stats.lock().await;
                metrics_recorder.record_pool_state(stats_lock.available, stats_lock.size);
            }
        });
    }

    /// 接続を取得
    #[instrument(skip(self))]
    pub async fn get_connection(&self) -> Result<deadpool_postgres::Object> {
        let start_time = Instant::now();
        
        // 統計を更新
        {
            let mut stats = self.stats.lock().await;
            stats.waiting += 1;
        }
        
        let result = self.pool.get().await;
        let duration = start_time.elapsed();
        
        // 統計を更新
        {
            let mut stats = self.stats.lock().await;
            stats.waiting = stats.waiting.saturating_sub(1);
            
            if result.is_ok() {
                stats.total_connections_created += 1;
            }
        }
        
        if duration > Duration::from_secs(5) {
            warn!("Slow database connection acquisition: {:?}", duration);
        }
        
        result.map_err(|e| anyhow!("Failed to get database connection: {}", e))
    }

    /// クエリを実行（メトリクス付き）
    #[instrument(skip(self, query, params))]
    pub async fn execute_query<T>(&self, query: &str, params: &[&(dyn tokio_postgres::types::ToSql + Sync)]) -> Result<Vec<tokio_postgres::Row>>
    where
        T: std::fmt::Debug,
    {
        let timer_id = self.metrics_recorder.start_timer();
        let client = self.get_connection().await?;
        
        let result = client.query(query, params).await;
        let duration = self.metrics_recorder.end_timer(&timer_id);
        
        // 統計を更新
        {
            let mut stats = self.stats.lock().await;
            stats.total_queries_executed += 1;
            
            // 移動平均でクエリ時間を計算
            let query_time_ms = duration * 1000.0;
            if stats.average_query_time_ms == 0.0 {
                stats.average_query_time_ms = query_time_ms;
            } else {
                stats.average_query_time_ms = stats.average_query_time_ms * 0.9 + query_time_ms * 0.1;
            }
        }
        
        match result {
            Ok(rows) => {
                debug!("Query executed successfully in {:.3}ms: {} rows", duration * 1000.0, rows.len());
                Ok(rows)
            }
            Err(e) => {
                error!("Query failed after {:.3}ms: {}", duration * 1000.0, e);
                Err(anyhow!("Database query failed: {}", e))
            }
        }
    }

    /// トランザクションを実行
    #[instrument(skip(self, operation))]
    pub async fn execute_transaction<F, R>(&self, operation: F) -> Result<R>
    where
        F: for<'a> std::future::Future<Output = Result<R>> + Send + 'static,
        R: Send + 'static,
    {
        let timer_id = self.metrics_recorder.start_timer();
        let client = self.get_connection().await?;
        
        let transaction = client.transaction().await?;
        
        let result = async {
            let result = operation.await?;
            transaction.commit().await?;
            Ok(result)
        }.await;
        
        if result.is_err() {
            let _ = transaction.rollback().await;
        }
        
        let duration = self.metrics_recorder.end_timer(&timer_id);
        
        match &result {
            Ok(_) => debug!("Transaction completed successfully in {:.3}ms", duration * 1000.0),
            Err(e) => error!("Transaction failed after {:.3}ms: {}", duration * 1000.0, e),
        }
        
        result
    }

    /// プール統計を取得
    pub async fn get_stats(&self) -> PoolStats {
        let mut stats = self.stats.lock().await;
        
        // 現在のプール状態を更新
        let pool_status = self.pool.status();
        stats.size = pool_status.size;
        stats.available = pool_status.available;
        
        stats.clone()
    }

    /// プールの健全性チェック
    pub async fn is_healthy(&self) -> bool {
        let status = self.health_status.read().await;
        matches!(*status, HealthStatus::Healthy)
    }

    /// プール設定を取得
    pub fn get_config(&self) -> &DatabasePoolConfig {
        &self.config
    }

    /// プールを閉じる
    #[instrument(skip(self))]
    pub async fn close(&self) {
        info!("Closing database pool");
        self.pool.close();
    }
}

impl Drop for EnhancedDatabasePool {
    fn drop(&mut self) {
        info!("Enhanced database pool dropped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    
    // 注意: 実際のデータベース接続が必要なため、統合テスト環境でのみ実行
    
    #[tokio::test]
    #[ignore = "requires database connection"]
    async fn test_enhanced_pool_creation() {
        let config = DatabasePoolConfig::default();
        let metrics_config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(metrics_config).unwrap());
        
        let database_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://test:test@localhost/test".to_string());
            
        let pool = EnhancedDatabasePool::new(&database_url, config, metrics_service).await;
        assert!(pool.is_ok());
    }
    
    #[test]
    fn test_pool_config_default() {
        let config = DatabasePoolConfig::default();
        assert_eq!(config.max_size, 20);
        assert_eq!(config.timeouts.wait_for_connection_secs, 30);
        assert!(config.health_check.enabled);
    }
    
    #[test]
    fn test_health_status_serialization() {
        let status = HealthStatus::Healthy;
        let serialized = serde_json::to_string(&status).unwrap();
        assert!(serialized.contains("Healthy"));
    }
}