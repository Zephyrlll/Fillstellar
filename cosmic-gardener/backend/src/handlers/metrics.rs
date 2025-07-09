//! メトリクス関連のHTTPハンドラー

use actix_web::{web, HttpResponse, Result};
use std::sync::Arc;
use tracing::{instrument, error};

use crate::services::metrics::{MetricsService, MetricsSummary};

/// Prometheusメトリクスエンドポイント
/// GET /metrics
#[instrument(skip(metrics_service))]
pub async fn prometheus_metrics(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    match metrics_service.export_metrics() {
        Ok(metrics_text) => {
            Ok(HttpResponse::Ok()
                .content_type("text/plain; version=0.0.4; charset=utf-8")
                .body(metrics_text))
        }
        Err(e) => {
            error!("Failed to export metrics: {}", e);
            Ok(HttpResponse::InternalServerError()
                .json(serde_json::json!({
                    "error": "Failed to export metrics",
                    "message": e.to_string()
                })))
        }
    }
}

/// メトリクス統計サマリーエンドポイント
/// GET /api/metrics/summary
#[instrument(skip(metrics_service))]
pub async fn metrics_summary(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    let summary = metrics_service.get_metrics_summary();
    Ok(HttpResponse::Ok().json(summary))
}

/// ヘルスチェック（拡張版）
/// GET /api/health/detailed
#[instrument(skip(metrics_service))]
pub async fn health_detailed(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    let summary = metrics_service.get_metrics_summary();
    
    // ヘルス判定ロジック
    let is_healthy = summary.memory_usage_mb < 1024.0 && // 1GB未満
                    summary.cpu_usage_percent < 80.0 &&   // CPU使用率80%未満
                    summary.cache_hit_rate > 0.5;         // キャッシュヒット率50%以上
    
    let status = if is_healthy { "healthy" } else { "degraded" };
    
    let response = serde_json::json!({
        "status": status,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "metrics": summary,
        "checks": {
            "memory_ok": summary.memory_usage_mb < 1024.0,
            "cpu_ok": summary.cpu_usage_percent < 80.0,
            "cache_ok": summary.cache_hit_rate > 0.5,
        }
    });
    
    let http_status = if is_healthy {
        HttpResponse::Ok()
    } else {
        HttpResponse::ServiceUnavailable()
    };
    
    Ok(http_status.json(response))
}

/// ライブネスプローブ
/// GET /api/health/live
#[instrument]
pub async fn health_live() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "alive",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

/// レディネスプローブ
/// GET /api/health/ready
#[instrument(skip(metrics_service))]
pub async fn health_ready(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    // 基本的な依存関係チェック
    let summary = metrics_service.get_metrics_summary();
    
    // サービスが準備完了かどうかの判定
    let is_ready = summary.http_requests_total >= 0; // 基本的な動作確認
    
    let status = if is_ready { "ready" } else { "not_ready" };
    
    let response = serde_json::json!({
        "status": status,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "dependencies": {
            "metrics": "ok",
            // 他の依存関係チェックを追加可能
        }
    });
    
    let http_status = if is_ready {
        HttpResponse::Ok()
    } else {
        HttpResponse::ServiceUnavailable()
    };
    
    Ok(http_status.json(response))
}

/// メトリクス設定情報
/// GET /api/metrics/config
#[instrument(skip(metrics_service))]
pub async fn metrics_config(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    let config = metrics_service.config();
    
    let response = serde_json::json!({
        "enabled": config.enabled,
        "namespace": config.namespace,
        "endpoint_path": config.endpoint_path,
        "collection_interval_secs": config.collection_interval_secs,
    });
    
    Ok(HttpResponse::Ok().json(response))
}

/// メトリクス収集状態のリセット（開発・テスト用）
/// POST /api/metrics/reset
#[cfg(debug_assertions)]
#[instrument(skip(metrics_service))]
pub async fn reset_metrics(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> Result<HttpResponse> {
    // 注意: これは開発環境でのみ有効
    // 本番環境では無効化される
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Metrics reset is only available in debug builds",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

/// メトリクス関連ルートの設定
pub fn configure_metrics_routes(cfg: &mut web::ServiceConfig) {
    cfg
        // Prometheusメトリクス
        .route("/metrics", web::get().to(prometheus_metrics))
        
        // API v1 メトリクス
        .service(
            web::scope("/api/metrics")
                .route("/summary", web::get().to(metrics_summary))
                .route("/config", web::get().to(metrics_config))
                // デバッグビルドでのみリセット機能を有効化
                .route("/reset", web::post().to(reset_metrics))
        )
        
        // ヘルスチェック
        .service(
            web::scope("/api/health")
                .route("/live", web::get().to(health_live))
                .route("/ready", web::get().to(health_ready))
                .route("/detailed", web::get().to(health_detailed))
        );
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use std::sync::Arc;
    
    #[actix_web::test]
    async fn test_metrics_endpoints() {
        let config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(MetricsService::new(config).unwrap());
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(metrics_service.clone()))
                .configure(configure_metrics_routes)
        ).await;

        // Prometheusメトリクステスト
        let req = test::TestRequest::get().uri("/metrics").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        // サマリーエンドポイントテスト
        let req = test::TestRequest::get().uri("/api/metrics/summary").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());

        // ヘルスチェックテスト
        let req = test::TestRequest::get().uri("/api/health/live").to_request();
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}