use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use sqlx::postgres::PgPoolOptions;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use cosmic_gardener_backend::{
    Config, 
    services::JwtService, 
    routes::configure_routes,
    docs::ApiDoc,
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

    // OpenAPI仕様書の生成
    let openapi = ApiDoc::openapi();

    log::info!(
        "Starting Cosmic Gardener Backend server on {}:{}",
        config.server_host, 
        config.server_port
    );
    log::info!(
        "Swagger UI available at: http://{}:{}/swagger-ui/",
        config.server_host,
        config.server_port
    );

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
            .wrap(cors)
            .wrap(Logger::default())
            // Swagger UI の設定
            .service(
                SwaggerUi::new("/swagger-ui/{_:.*}")
                    .url("/api-docs/openapi.json", openapi.clone())
                    .config(utoipa_swagger_ui::Config::default()
                        .try_it_out_enabled(true)
                        .filter(true)
                        .display_request_duration(true)
                    )
            )
            // OpenAPI JSON エンドポイント
            .route("/api-docs/openapi.json", 
                web::get().to(|| async move {
                    web::Json(openapi.clone())
                })
            )
            // API ルートの設定
            .configure(configure_routes)
    })
    .bind(format!("{}:{}", config.server_host, config.server_port))?
    .run()
    .await
}