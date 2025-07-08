use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tokio::sync::RwLock;

use cosmic_gardener_backend::{
    Config, 
    services::JwtService, 
    routes::configure_routes,
    websocket::SessionManager,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 環境変数の読み込み
    dotenv::dotenv().ok();
    
    // ログの初期化
    env_logger::init();

    // 設定の読み込み
    let config = Config::from_env().expect("Failed to load configuration");

    // データベース接続プールの作成
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // JWT サービスの初期化
    let jwt_service = web::Data::new(JwtService::new(config.jwt_secret.clone()));

    // WebSocketセッションマネージャーの初期化
    let session_manager = web::Data::new(Arc::new(RwLock::new(SessionManager::new())));

    log::info!("Starting Cosmic Gardener Backend server on {}:{}", 
              config.server_host, config.server_port);

    // HTTPサーバーの起動
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _req_head| {
                config.cors_allowed_origins.iter()
                    .any(|allowed| origin.as_bytes() == allowed.as_bytes())
            })
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(jwt_service.clone())
            .app_data(session_manager.clone())
            .wrap(cors)
            .wrap(Logger::default())
            .configure(configure_routes)
    })
    .bind(format!("{}:{}", config.server_host, config.server_port))?
    .run()
    .await
}