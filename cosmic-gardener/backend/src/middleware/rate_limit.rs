use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::ErrorTooManyRequests,
    web, Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::{
    collections::HashMap,
    future::{ready, Ready},
    rc::Rc,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

#[derive(Clone)]
pub struct RateLimitConfig {
    pub requests_per_minute: u32,
    pub burst_size: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_minute: 60,
            burst_size: 10,
        }
    }
}

pub struct RateLimitMiddleware {
    config: RateLimitConfig,
}

impl RateLimitMiddleware {
    pub fn new(config: RateLimitConfig) -> Self {
        Self { config }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RateLimitMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimitMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RateLimitMiddlewareService {
            service: Rc::new(service),
            config: self.config.clone(),
            store: Arc::new(Mutex::new(HashMap::new())),
        }))
    }
}

pub struct RateLimitMiddlewareService<S> {
    service: Rc<S>,
    config: RateLimitConfig,
    store: Arc<Mutex<HashMap<String, ClientState>>>,
}

#[derive(Debug, Clone)]
struct ClientState {
    tokens: u32,
    last_refill: Instant,
    blocked_until: Option<Instant>,
}

impl<S, B> Service<ServiceRequest> for RateLimitMiddlewareService<S>
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
        let config = self.config.clone();
        let store = self.store.clone();

        Box::pin(async move {
            // クライアント識別子を取得（IPアドレス）
            let client_id = get_client_identifier(&req);

            // レート制限チェック
            let is_allowed = {
                let mut store = store.lock().unwrap();
                check_rate_limit(&mut store, &client_id, &config)
            };

            if !is_allowed {
                return Err(ErrorTooManyRequests("Rate limit exceeded"));
            }

            service.call(req).await
        })
    }
}

fn get_client_identifier(req: &ServiceRequest) -> String {
    // IPアドレスを取得（プロキシ経由の場合はX-Forwarded-Forを優先）
    if let Some(forwarded_for) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_for_str) = forwarded_for.to_str() {
            if let Some(ip) = forwarded_for_str.split(',').next() {
                return ip.trim().to_string();
            }
        }
    }

    req.connection_info()
        .peer_addr()
        .unwrap_or("unknown")
        .to_string()
}

fn check_rate_limit(
    store: &mut HashMap<String, ClientState>,
    client_id: &str,
    config: &RateLimitConfig,
) -> bool {
    let now = Instant::now();

    let state = store.entry(client_id.to_string()).or_insert(ClientState {
        tokens: config.burst_size,
        last_refill: now,
        blocked_until: None,
    });

    // ブロック期間中かチェック
    if let Some(blocked_until) = state.blocked_until {
        if now < blocked_until {
            return false;
        } else {
            state.blocked_until = None;
        }
    }

    // トークンの補充（Token Bucket Algorithm）
    let time_passed = now.duration_since(state.last_refill);
    let tokens_to_add = (time_passed.as_secs_f64() * config.requests_per_minute as f64 / 60.0) as u32;
    
    if tokens_to_add > 0 {
        state.tokens = (state.tokens + tokens_to_add).min(config.burst_size);
        state.last_refill = now;
    }

    // トークンが利用可能かチェック
    if state.tokens > 0 {
        state.tokens -= 1;
        true
    } else {
        // レート制限に達した場合、短時間ブロック
        state.blocked_until = Some(now + Duration::from_secs(60));
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limit_logic() {
        let mut store = HashMap::new();
        let config = RateLimitConfig {
            requests_per_minute: 60,
            burst_size: 10,
        };

        // 最初の10リクエストは成功
        for _ in 0..10 {
            assert!(check_rate_limit(&mut store, "test_client", &config));
        }

        // 11番目のリクエストは失敗
        assert!(!check_rate_limit(&mut store, "test_client", &config));
    }
}