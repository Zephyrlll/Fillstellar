use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_cors::Cors;
use std::sync::Arc;
use cosmic_gardener_backend::*;
use cosmic_gardener_backend::config::Config;
use cosmic_gardener_backend::services::logging::{LoggingService, LoggingConfig};
use cosmic_gardener_backend::services::metrics::{MetricsService, MetricsConfig};
use cosmic_gardener_backend::services::cache::CacheService;
use cosmic_gardener_backend::services::database::DatabaseService;
use cosmic_gardener_backend::services::database_pool::EnhancedDatabasePool;
use cosmic_gardener_backend::services::websocket::compression::CompressionService;
use cosmic_gardener_backend::game::physics_simd::SimdPhysicsEngine;
use cosmic_gardener_backend::game::concurrent_game_loop::ConcurrentGameLoop;
use cosmic_gardener_backend::middleware::LoggingMiddleware;
use cosmic_gardener_backend::handlers::health::{init_health_system, configure_health_routes};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration
    let mut config = if let Ok(config_path) = std::env::var("CONFIG_FILE") {
        Config::from_file(&config_path)?
    } else {
        match std::env::var("ENVIRONMENT").as_deref() {
            Ok("production") => Config::production(),
            Ok("test") => Config::test(),
            _ => Config::development(),
        }
    };
    
    // Override with environment variables
    config.override_with_env();
    
    // Validate configuration
    config.validate()?;
    
    // Initialize logging system
    LoggingService::init(config.logging.clone())?;
    
    // Initialize health system
    init_health_system();
    
    tracing::info!("Starting {} v{}", APP_NAME, VERSION);
    tracing::info!("{}", APP_DESCRIPTION);
    tracing::info!("Configuration loaded: {:?}", config);
    
    // Initialize metrics service
    let metrics_service = Arc::new(MetricsService::new(config.metrics.clone())?); 
    tracing::info!("Metrics service initialized");
    
    // Initialize cache service
    let cache_service = Arc::new(CacheService::new(&config.redis_url).await?);
    tracing::info!("Cache service initialized");
    
    // Initialize enhanced database pool
    let db_pool = Arc::new(
        EnhancedDatabasePool::new(
            &config.database_url,
            config.database_pool.clone(),
            metrics_service.clone(),
        )
        .await?
    );
    tracing::info!("Enhanced database pool initialized");
    
    // Initialize regular database pool for DatabaseService
    let sqlx_pool = sqlx::PgPool::connect(&config.database_url).await?;
    
    // Initialize database service
    let database_service = Arc::new(DatabaseService::with_enhanced_pool(
        sqlx_pool,
        db_pool.clone(),
        cache_service.clone(),
    ));
    tracing::info!("Database service initialized");
    
    // Initialize compression service
    let compression_service = Arc::new(CompressionService::new(config.compression.clone()));
    tracing::info!("Compression service initialized");
    
    // Initialize SIMD physics engine
    let physics_engine = Arc::new(SimdPhysicsEngine::new(metrics_service.clone()));
    tracing::info!("SIMD physics engine initialized");
    
    // Initialize concurrent game loop
    let concurrent_game_loop = Arc::new(ConcurrentGameLoop::new(
        config.game_loop.clone(),
        physics_engine.clone(),
        database_service.clone(),
        metrics_service.clone(),
    ));
    tracing::info!("Concurrent game loop initialized");
    
    // Start concurrent game loop
    concurrent_game_loop.start().await?;
    tracing::info!("Game loop started");
    
    // Initialize legacy game state for backwards compatibility
    let game_state = websocket_handler::GameState::new();
    
    // Add initial resources for testing
    {
        let mut resource_manager = game_state.resource_manager.lock().await;
        let resources = resource_manager.get_resources_mut();
        resources.cosmic_dust = 1000;
        resources.energy = 500;
    }
    
    tracing::info!("Game systems initialized successfully!");
    tracing::info!("Starting HTTP server on http://{}:{}", config.server_host, config.server_port);
    
    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default();
        let cors = config.cors_allowed_origins.iter().fold(cors, |cors, origin| {
            cors.allowed_origin(origin)
        });
        
        App::new()
            .app_data(web::Data::new(game_state.clone()))
            .app_data(web::Data::new(metrics_service.clone()))
            .app_data(web::Data::new(cache_service.clone()))
            .app_data(web::Data::new(database_service.clone()))
            .app_data(web::Data::new(compression_service.clone()))
            .app_data(web::Data::new(physics_engine.clone()))
            .app_data(web::Data::new(concurrent_game_loop.clone()))
            .app_data(web::Data::new(db_pool.clone()))
            .app_data(web::Data::new(config.clone()))
            .wrap(LoggingMiddleware)
            .wrap(Logger::default())
            .wrap(cors.allow_any_method().allow_any_header().supports_credentials())
            .route("/ws", web::get().to(websocket_handler))
            .configure(configure_health_routes)
            .route(&config.metrics_endpoint, web::get().to(metrics_handler))
    })
    .bind(format!("{}:{}", config.server_host, config.server_port))?
    .run()
    .await?;
    
    Ok(())
}


async fn metrics_handler(
    metrics_service: web::Data<Arc<MetricsService>>,
) -> actix_web::Result<String> {
    match metrics_service.export_metrics() {
        Ok(metrics) => Ok(metrics),
        Err(e) => {
            tracing::error!("Failed to export metrics: {}", e);
            Err(actix_web::error::ErrorInternalServerError("Failed to export metrics"))
        }
    }
}