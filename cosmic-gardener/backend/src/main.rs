use actix_web::{web, App, HttpServer, middleware::Logger};
use actix_cors::Cors;
use cosmic_gardener_backend::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting {} v{}", APP_NAME, VERSION);
    println!("{}", APP_DESCRIPTION);
    
    // Initialize game state
    let game_state = websocket_handler::GameState::new();
    
    // Start game loop in background
    let game_loop_state = game_state.clone();
    tokio::spawn(async move {
        run_game_loop(game_loop_state).await;
    });
    
    // Add initial resources for testing
    {
        let mut resource_manager = game_state.resource_manager.lock().await;
        let resources = resource_manager.get_resources_mut();
        resources.cosmic_dust = 1000;
        resources.energy = 500;
    }
    
    println!("Game systems initialized successfully!");
    println!("Starting HTTP server on http://localhost:8080");
    
    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(game_state.clone()))
            .wrap(Logger::default())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
                    .supports_credentials()
            )
            .route("/ws", web::get().to(websocket_handler))
            .route("/health", web::get().to(health_check))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await?;
    
    Ok(())
}

async fn health_check() -> actix_web::Result<String> {
    Ok("OK".to_string())
}