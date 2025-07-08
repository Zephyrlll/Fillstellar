use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::ErrorUnauthorized,
    http::header,
    web, Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
};

use crate::models::AuthenticatedUser;
use crate::services::JwtService;

pub struct AuthenticationMiddleware;

impl<S, B> Transform<S, ServiceRequest> for AuthenticationMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthenticationMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthenticationMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct AuthenticationMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuthenticationMiddlewareService<S>
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
            // Authorization ヘッダーを取得
            let auth_header = req
                .headers()
                .get(header::AUTHORIZATION)
                .and_then(|h| h.to_str().ok());

            if let Some(auth_str) = auth_header {
                if let Some(token) = auth_str.strip_prefix("Bearer ") {
                    // JwtService を取得
                    if let Some(jwt_service) = req.app_data::<web::Data<JwtService>>() {
                        match jwt_service.validate_access_token(token) {
                            Ok(claims) => {
                                // 認証成功：ユーザー情報をリクエストに挿入
                                let user = AuthenticatedUser::from(claims);
                                req.extensions_mut().insert(user);
                                return service.call(req).await;
                            }
                            Err(_) => {
                                return Err(ErrorUnauthorized("Invalid token"));
                            }
                        }
                    }
                }
            }

            Err(ErrorUnauthorized("Missing or invalid authorization header"))
        })
    }
}

// 認証が必要なエンドポイント用のエクストラクター
use actix_web::{FromRequest, HttpRequest};
use std::future::Future;
use std::pin::Pin;

impl FromRequest for AuthenticatedUser {
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self, Self::Error>>>>;

    fn from_request(req: &HttpRequest, _: &mut actix_web::dev::Payload) -> Self::Future {
        let req = req.clone();
        Box::pin(async move {
            req.extensions()
                .get::<AuthenticatedUser>()
                .cloned()
                .ok_or_else(|| ErrorUnauthorized("User not authenticated"))
        })
    }
}