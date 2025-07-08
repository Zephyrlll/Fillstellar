use actix_web::{web, App, HttpServer};

use crate::handlers::{auth, user, game};
use crate::middleware::{AuthenticationMiddleware, RateLimitMiddleware, RateLimitConfig};
use crate::websocket::configure_websocket_routes;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        // 認証関連のルート（レート制限あり）
        .service(
            web::scope("/api/auth")
                .wrap(RateLimitMiddleware::new(RateLimitConfig {
                    requests_per_minute: 30,
                    burst_size: 5,
                }))
                .route("/register", web::post().to(auth::register))
                .route("/login", web::post().to(auth::login))
                .route("/refresh", web::post().to(auth::refresh_token))
                .route("/logout", web::post().to(auth::logout))
        )
        // ユーザー管理（認証必須）
        .service(
            web::scope("/api/users")
                .wrap(AuthenticationMiddleware)
                .route("/me", web::get().to(user::get_me))
                .route("/me", web::put().to(user::update_me))
                .route("/me", web::delete().to(user::delete_me))
        )
        // ゲーム関連（認証必須）
        .service(
            web::scope("/api/game")
                .wrap(AuthenticationMiddleware)
                .wrap(RateLimitMiddleware::new(RateLimitConfig {
                    requests_per_minute: 120,
                    burst_size: 20,
                }))
                .route("/state", web::get().to(game::get_game_state))
                .route("/save", web::post().to(game::save_game_state))
                .route("/statistics", web::get().to(game::get_statistics))
                .route("/leaderboard", web::get().to(game::get_leaderboard))
        )
        // WebSocket接続
        .configure(configure_websocket_routes);
}