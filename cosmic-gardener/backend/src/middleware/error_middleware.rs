use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    http::header,
    Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
};
use uuid::Uuid;

use crate::errors::ErrorResponse;

/// エラーハンドリングミドルウェア
/// 
/// 全ての HTTP レスポンスに対して：
/// - リクエストIDの追加
/// - エラーレスポンスの統一
/// - ログの記録
pub struct ErrorHandlingMiddleware;

impl<S, B> Transform<S, ServiceRequest> for ErrorHandlingMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = ErrorHandlingMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ErrorHandlingMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct ErrorHandlingMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for ErrorHandlingMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();

        Box::pin(async move {
            // リクエストIDを生成してextensionsに保存
            let request_id = Uuid::new_v4().to_string();
            req.extensions_mut().insert(request_id.clone());

            // リクエストの開始時刻を記録
            let start_time = std::time::Instant::now();

            // サービスを呼び出し
            let result = service.call(req).await;

            // レスポンス時間を計算
            let duration = start_time.elapsed();

            match result {
                Ok(mut res) => {
                    // 成功レスポンスにもX-Request-IDヘッダーを追加
                    res.headers_mut().insert(
                        header::HeaderName::from_static("x-request-id"),
                        header::HeaderValue::from_str(&request_id).unwrap(),
                    );

                    // アクセスログを記録
                    log::info!(
                        target: "cosmic_gardener::access",
                        "HTTP {} {} {} {}ms (request_id: {})",
                        res.response().status().as_u16(),
                        res.request().method(),
                        res.request().path(),
                        duration.as_millis(),
                        request_id
                    );

                    Ok(res)
                }
                Err(err) => {
                    // エラーレスポンスの場合
                    log::error!(
                        target: "cosmic_gardener::error",
                        "HTTP error: {} {}ms (request_id: {}) - {}",
                        err,
                        duration.as_millis(),
                        request_id,
                        err
                    );

                    Err(err)
                }
            }
        })
    }
}

/// リクエストIDを取得するヘルパー関数
pub fn get_request_id(req: &ServiceRequest) -> Option<String> {
    req.extensions().get::<String>().cloned()
}

/// エラーログを記録するヘルパー関数
pub fn log_error_details(
    error: &crate::errors::ApiError,
    request_id: &str,
    path: &str,
    method: &str,
) {
    let severity = error.severity();
    let category = match error {
        crate::errors::ApiError::Unauthorized { .. } => "auth",
        crate::errors::ApiError::ValidationError { .. } => "validation",
        crate::errors::ApiError::DatabaseConnectionError { .. } => "database",
        crate::errors::ApiError::ExternalServiceError { .. } => "external",
        _ => "general",
    };

    match severity {
        crate::errors::ErrorSeverity::Critical => {
            log::error!(
                target: "cosmic_gardener::error_detail",
                "CRITICAL: {} {} - {} (request_id: {}, category: {})",
                method, path, error, request_id, category
            );
        }
        crate::errors::ErrorSeverity::High => {
            log::error!(
                target: "cosmic_gardener::error_detail",
                "HIGH: {} {} - {} (request_id: {}, category: {})",
                method, path, error, request_id, category
            );
        }
        crate::errors::ErrorSeverity::Medium => {
            log::warn!(
                target: "cosmic_gardener::error_detail",
                "MEDIUM: {} {} - {} (request_id: {}, category: {})",
                method, path, error, request_id, category
            );
        }
        crate::errors::ErrorSeverity::Low => {
            log::info!(
                target: "cosmic_gardener::error_detail",
                "LOW: {} {} - {} (request_id: {}, category: {})",
                method, path, error, request_id, category
            );
        }
        crate::errors::ErrorSeverity::Info => {
            log::debug!(
                target: "cosmic_gardener::error_detail",
                "INFO: {} {} - {} (request_id: {}, category: {})",
                method, path, error, request_id, category
            );
        }
    }
}

/// パニックをエラーレスポンスに変換するハンドラー
pub fn create_panic_handler() -> Box<dyn Fn(&std::panic::PanicInfo<'_>) + Send + Sync> {
    Box::new(|panic_info| {
        let location = panic_info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column())).unwrap_or_else(|| "unknown".to_string());
        let message = panic_info.payload().downcast_ref::<&str>().unwrap_or(&"unknown panic");
        
        log::error!(
            target: "cosmic_gardener::panic",
            "PANIC: {} at {} (request_id: {})",
            message,
            location,
            Uuid::new_v4()
        );
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};

    async fn test_handler() -> Result<HttpResponse, Error> {
        Ok(HttpResponse::Ok().json(serde_json::json!({"message": "success"})))
    }

    async fn error_handler() -> Result<HttpResponse, Error> {
        Err(actix_web::error::ErrorBadRequest("test error"))
    }

    #[actix_web::test]
    async fn test_error_middleware_success() {
        let app = test::init_service(
            App::new()
                .wrap(ErrorHandlingMiddleware)
                .route("/test", web::get().to(test_handler))
        ).await;

        let req = test::TestRequest::get().uri("/test").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        assert!(resp.headers().get("x-request-id").is_some());
    }

    #[actix_web::test]
    async fn test_error_middleware_error() {
        let app = test::init_service(
            App::new()
                .wrap(ErrorHandlingMiddleware)
                .route("/error", web::get().to(error_handler))
        ).await;

        let req = test::TestRequest::get().uri("/error").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_client_error());
    }
}