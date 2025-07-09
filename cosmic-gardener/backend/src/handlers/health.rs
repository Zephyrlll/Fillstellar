use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::config::Config;
use crate::services::cache::CacheService;
use crate::services::database::DatabaseService;
use crate::services::metrics::MetricsService;
use crate::services::database_pool::EnhancedDatabasePool;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub version: String,
    pub uptime: f64,
    pub environment: String,
    pub checks: HashMap<String, HealthCheck>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub status: String,
    pub message: String,
    pub response_time_ms: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedHealthStatus {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub version: String,
    pub uptime: f64,
    pub environment: String,
    pub system: SystemHealth,
    pub services: HashMap<String, ServiceHealth>,
    pub metrics: HealthMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealth {
    pub memory_usage: f64,
    pub cpu_usage: f64,
    pub disk_usage: f64,
    pub network_status: String,
    pub process_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub status: String,
    pub response_time_ms: u64,
    pub error_rate: f64,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub details: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetrics {
    pub total_requests: u64,
    pub active_connections: u32,
    pub error_count: u64,
    pub cache_hit_rate: f64,
    pub database_pool_usage: f64,
}

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

pub fn init_health_system() {
    START_TIME.set(Instant::now()).unwrap_or_else(|_| {
        tracing::warn!("Health system already initialized");
    });
}

pub fn get_uptime() -> f64 {
    START_TIME.get().map(|start| start.elapsed().as_secs_f64()).unwrap_or(0.0)
}

/// Basic health check endpoint
pub async fn health_check(config: web::Data<Config>) -> Result<HttpResponse> {
    let status = HealthStatus {
        status: "healthy".to_string(),
        timestamp: chrono::Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: get_uptime(),
        environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "unknown".to_string()),
        checks: HashMap::new(),
    };

    Ok(HttpResponse::Ok().json(status))
}

/// Detailed health check endpoint
pub async fn detailed_health_check(
    config: web::Data<Config>,
    cache_service: web::Data<Arc<CacheService>>,
    database_service: web::Data<Arc<DatabaseService>>,
    db_pool: web::Data<Arc<EnhancedDatabasePool>>,
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    let mut checks = HashMap::new();
    let mut overall_status = "healthy";

    // Check database connectivity
    let db_check = check_database_health(db_pool.as_ref()).await;
    if db_check.status != "healthy" {
        overall_status = "unhealthy";
    }
    checks.insert("database".to_string(), db_check);

    // Check cache connectivity
    let cache_check = check_cache_health(cache_service.as_ref()).await;
    if cache_check.status != "healthy" {
        overall_status = "degraded";
    }
    checks.insert("cache".to_string(), cache_check);

    // Check metrics system
    let metrics_check = check_metrics_health(metrics_service.as_ref()).await;
    if metrics_check.status != "healthy" {
        overall_status = "degraded";
    }
    checks.insert("metrics".to_string(), metrics_check);

    // Check system resources
    let system_check = check_system_health().await;
    if system_check.status != "healthy" {
        overall_status = "degraded";
    }
    checks.insert("system".to_string(), system_check);

    let status = HealthStatus {
        status: overall_status.to_string(),
        timestamp: chrono::Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: get_uptime(),
        environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "unknown".to_string()),
        checks,
    };

    let response = match overall_status {
        "healthy" => HttpResponse::Ok().json(status),
        "degraded" => HttpResponse::Ok().json(status),
        _ => HttpResponse::ServiceUnavailable().json(status),
    };

    Ok(response)
}

/// Readiness check endpoint
pub async fn readiness_check(
    config: web::Data<Config>,
    db_pool: web::Data<Arc<EnhancedDatabasePool>>,
) -> Result<HttpResponse> {
    let mut checks = HashMap::new();
    let mut overall_status = "ready";

    // Check database connectivity (critical for readiness)
    let db_check = check_database_health(db_pool.as_ref()).await;
    if db_check.status != "healthy" {
        overall_status = "not_ready";
    }
    checks.insert("database".to_string(), db_check);

    let status = HealthStatus {
        status: overall_status.to_string(),
        timestamp: chrono::Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: get_uptime(),
        environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "unknown".to_string()),
        checks,
    };

    let response = match overall_status {
        "ready" => HttpResponse::Ok().json(status),
        _ => HttpResponse::ServiceUnavailable().json(status),
    };

    Ok(response)
}

/// Liveness check endpoint
pub async fn liveness_check() -> Result<HttpResponse> {
    // Simple liveness check - if we can respond, we're alive
    let status = serde_json::json!({
        "status": "alive",
        "timestamp": chrono::Utc::now(),
        "uptime": get_uptime()
    });

    Ok(HttpResponse::Ok().json(status))
}

async fn check_database_health(db_pool: &Arc<EnhancedDatabasePool>) -> HealthCheck {
    let start_time = Instant::now();
    
    match db_pool.get_connection().await {
        Ok(_) => {
            // Try to execute a simple query
            match db_pool.execute_query::<()>("SELECT 1", &[]).await {
                Ok(_) => HealthCheck {
                    status: "healthy".to_string(),
                    message: "Database connection successful".to_string(),
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    timestamp: chrono::Utc::now(),
                    details: Some(serde_json::json!({
                        "pool_size": db_pool.get_pool_size(),
                        "active_connections": db_pool.get_active_connections()
                    })),
                },
                Err(e) => HealthCheck {
                    status: "unhealthy".to_string(),
                    message: format!("Database query failed: {}", e),
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    timestamp: chrono::Utc::now(),
                    details: None,
                },
            }
        }
        Err(e) => HealthCheck {
            status: "unhealthy".to_string(),
            message: format!("Database connection failed: {}", e),
            response_time_ms: start_time.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now(),
            details: None,
        },
    }
}

async fn check_cache_health(cache_service: &Arc<CacheService>) -> HealthCheck {
    let start_time = Instant::now();
    
    match cache_service.health_check().await {
        Ok(is_healthy) => {
            if is_healthy {
                HealthCheck {
                    status: "healthy".to_string(),
                    message: "Cache connection successful".to_string(),
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    timestamp: chrono::Utc::now(),
                    details: Some(serde_json::json!({
                        "cache_stats": cache_service.get_stats().await.unwrap_or_default()
                    })),
                }
            } else {
                HealthCheck {
                    status: "unhealthy".to_string(),
                    message: "Cache health check failed".to_string(),
                    response_time_ms: start_time.elapsed().as_millis() as u64,
                    timestamp: chrono::Utc::now(),
                    details: None,
                }
            }
        }
        Err(e) => HealthCheck {
            status: "unhealthy".to_string(),
            message: format!("Cache connection failed: {}", e),
            response_time_ms: start_time.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now(),
            details: None,
        },
    }
}

async fn check_metrics_health(metrics_service: &Arc<MetricsService>) -> HealthCheck {
    let start_time = Instant::now();
    
    match metrics_service.export_metrics() {
        Ok(_) => HealthCheck {
            status: "healthy".to_string(),
            message: "Metrics system operational".to_string(),
            response_time_ms: start_time.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now(),
            details: Some(serde_json::json!({
                "metrics_endpoint": "/metrics",
                "namespace": "cosmic_gardener"
            })),
        },
        Err(e) => HealthCheck {
            status: "unhealthy".to_string(),
            message: format!("Metrics system failed: {}", e),
            response_time_ms: start_time.elapsed().as_millis() as u64,
            timestamp: chrono::Utc::now(),
            details: None,
        },
    }
}

async fn check_system_health() -> HealthCheck {
    let start_time = Instant::now();
    
    // Basic system health checks
    let memory_info = get_memory_info();
    let cpu_info = get_cpu_info();
    let disk_info = get_disk_info();
    
    let mut status = "healthy";
    let mut messages = Vec::new();
    
    // Check memory usage
    if memory_info.usage_percent > 90.0 {
        status = "unhealthy";
        messages.push("High memory usage detected".to_string());
    } else if memory_info.usage_percent > 80.0 {
        status = "degraded";
        messages.push("Elevated memory usage".to_string());
    }
    
    // Check disk space
    if disk_info.usage_percent > 95.0 {
        status = "unhealthy";
        messages.push("Critical disk space".to_string());
    } else if disk_info.usage_percent > 85.0 {
        status = "degraded";
        messages.push("Low disk space".to_string());
    }
    
    let message = if messages.is_empty() {
        "System resources within normal limits".to_string()
    } else {
        messages.join("; ")
    };
    
    HealthCheck {
        status: status.to_string(),
        message,
        response_time_ms: start_time.elapsed().as_millis() as u64,
        timestamp: chrono::Utc::now(),
        details: Some(serde_json::json!({
            "memory": memory_info,
            "cpu": cpu_info,
            "disk": disk_info
        })),
    }
}

#[derive(Debug, Clone, Serialize)]
struct MemoryInfo {
    total_mb: u64,
    available_mb: u64,
    used_mb: u64,
    usage_percent: f64,
}

#[derive(Debug, Clone, Serialize)]
struct CpuInfo {
    cores: u32,
    usage_percent: f64,
}

#[derive(Debug, Clone, Serialize)]
struct DiskInfo {
    total_gb: u64,
    available_gb: u64,
    used_gb: u64,
    usage_percent: f64,
}

fn get_memory_info() -> MemoryInfo {
    // Basic memory information (simplified)
    // In a real implementation, you'd use system APIs
    MemoryInfo {
        total_mb: 1024,
        available_mb: 512,
        used_mb: 512,
        usage_percent: 50.0,
    }
}

fn get_cpu_info() -> CpuInfo {
    // Basic CPU information (simplified)
    // In a real implementation, you'd use system APIs
    CpuInfo {
        cores: num_cpus::get() as u32,
        usage_percent: 25.0,
    }
}

fn get_disk_info() -> DiskInfo {
    // Basic disk information (simplified)
    // In a real implementation, you'd use system APIs
    DiskInfo {
        total_gb: 100,
        available_gb: 75,
        used_gb: 25,
        usage_percent: 25.0,
    }
}

pub fn configure_health_routes(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/health", web::get().to(health_check))
        .route("/health/detailed", web::get().to(detailed_health_check))
        .route("/health/ready", web::get().to(readiness_check))
        .route("/health/live", web::get().to(liveness_check));
}