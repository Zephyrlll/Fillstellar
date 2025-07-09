//! ログミドルウェア

use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
    time::Instant,
};
use uuid::Uuid;

use crate::services::logging::{LoggingService, RequestContext, PerformanceMetrics};

/// ログミドルウェア
pub struct LoggingMiddleware;

impl<S, B> Transform<S, ServiceRequest> for LoggingMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = LoggingMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(LoggingMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct LoggingMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for LoggingMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let start_time = Instant::now();
        let service = self.service.clone();

        // リクエストコンテキストを作成
        let mut ctx = RequestContext::new()
            .with_request(
                req.method().to_string(),
                req.path().to_string(),
            )
            .with_client_info(
                req.headers()
                    .get("user-agent")
                    .and_then(|h| h.to_str().ok())
                    .map(|s| s.to_string()),
                Self::get_client_ip(&req),
            );

        // ユーザー情報をヘッダーまたは拡張から取得（実装に依存）
        if let Some(user_id_header) = req.headers().get("x-user-id") {
            if let Ok(user_id_str) = user_id_header.to_str() {
                if let Ok(user_id) = user_id_str.parse::<Uuid>() {
                    ctx = ctx.with_user(user_id);
                }
            }
        }

        // セッション情報をヘッダーから取得
        if let Some(session_id_header) = req.headers().get("x-session-id") {
            if let Ok(session_id_str) = session_id_header.to_str() {
                if let Ok(session_id) = session_id_str.parse::<Uuid>() {
                    ctx = ctx.with_session(session_id);
                }
            }
        }

        // リクエスト開始をログ
        LoggingService::log_request_start(&ctx);

        // リクエストにコンテキストを追加
        req.extensions_mut().insert(ctx.clone());

        Box::pin(async move {
            let result = service.call(req).await;

            let duration = start_time.elapsed();
            let metrics = PerformanceMetrics::new(duration.as_millis() as u64);

            match result {
                Ok(response) => {
                    let status = response.status();
                    LoggingService::log_request_end(&ctx, status.as_u16(), &metrics);
                    Ok(response)
                }
                Err(error) => {
                    LoggingService::log_request_end(&ctx, 500, &metrics);
                    
                    // エラーの詳細をログ
                    let error_ctx = crate::services::logging::ErrorContext::new(
                        "InternalServerError".to_string(),
                        error.to_string(),
                    );
                    LoggingService::log_error(&ctx, &error_ctx);
                    
                    Err(error)
                }
            }
        })
    }
}

impl<S> LoggingMiddlewareService<S> {
    fn get_client_ip(req: &ServiceRequest) -> Option<String> {
        // X-Forwarded-For ヘッダーから取得
        if let Some(forwarded_for) = req.headers().get("x-forwarded-for") {
            if let Ok(forwarded_str) = forwarded_for.to_str() {
                // 最初のIPアドレスを取得
                if let Some(ip) = forwarded_str.split(',').next() {
                    return Some(ip.trim().to_string());
                }
            }
        }

        // X-Real-IP ヘッダーから取得
        if let Some(real_ip) = req.headers().get("x-real-ip") {
            if let Ok(ip_str) = real_ip.to_str() {
                return Some(ip_str.to_string());
            }
        }

        // 接続情報から取得
        if let Some(peer_addr) = req.peer_addr() {
            return Some(peer_addr.ip().to_string());
        }

        None
    }
}

/// リクエストコンテキスト取得ヘルパー
pub trait RequestContextExt {
    fn get_request_context(&self) -> Option<&RequestContext>;
}

impl RequestContextExt for ServiceRequest {
    fn get_request_context(&self) -> Option<&RequestContext> {
        self.extensions().get::<RequestContext>()
    }
}

impl RequestContextExt for actix_web::HttpRequest {
    fn get_request_context(&self) -> Option<&RequestContext> {
        self.extensions().get::<RequestContext>()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};

    async fn test_handler() -> HttpResponse {
        HttpResponse::Ok().json("test")
    }

    #[actix_web::test]
    async fn test_logging_middleware() {
        let app = test::init_service(
            App::new()
                .wrap(LoggingMiddleware)
                .route("/test", web::get().to(test_handler))
        ).await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("user-agent", "test-agent"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}