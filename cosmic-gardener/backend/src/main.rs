//! # Cosmic Gardener Backend Server
//!
//! メインサーバーアプリケーション

use actix_web::{middleware::Logger, web, App, HttpServer};
use cosmic_gardener_backend::{
    application::services::AppState,
    presentation::routes,
    shared::config::Config,
    Error, Result,
};
use std::io;
use tracing::{info, warn};
use tracing_actix_web::TracingLogger;

#[actix_web::main]
async fn main() -> io::Result<()> {
    // アプリケーションの初期化
    if let Err(e) = cosmic_gardener_backend::initialize().await {
        eprintln!("Failed to initialize application: {}", e);
        return Err(io::Error::new(io::ErrorKind::Other, e));
    }

    // 設定の読み込み
    let config = Config::load().map_err(|e| {
        eprintln!("Failed to load configuration: {}", e);
        io::Error::new(io::ErrorKind::Other, e)
    })?;

    // アプリケーション状態の初期化
    let app_state = AppState::new().await.map_err(|e| {
        eprintln!("Failed to initialize application state: {}", e);
        io::Error::new(io::ErrorKind::Other, e)
    })?;

    let server_config = config.server.clone();
    let bind_address = format!("{}:{}", server_config.host, server_config.port);

    info!(
        host = %server_config.host,
        port = server_config.port,
        "Starting Cosmic Gardener Backend Server"
    );

    // HTTPサーバーの起動
    let server = HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .wrap(TracingLogger::default())
            .wrap(Logger::default())
            .configure(routes::configure)
    })
    .bind(&bind_address)?
    .workers(server_config.workers)
    .run();

    // グレースフルシャットダウンの設定
    let server_handle = server.handle();
    
    // SIGTERM/SIGINTハンドラ
    tokio::spawn(async move {
        let mut sigterm = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to create SIGTERM signal handler");
        let mut sigint = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::interrupt())
            .expect("Failed to create SIGINT signal handler");

        tokio::select! {
            _ = sigterm.recv() => {
                info!("Received SIGTERM signal");
            }
            _ = sigint.recv() => {
                info!("Received SIGINT signal");
            }
        }

        warn!("Shutting down server gracefully...");
        server_handle.stop(true).await;
        
        // アプリケーションのクリーンアップ
        if let Err(e) = cosmic_gardener_backend::cleanup().await {
            eprintln!("Error during cleanup: {}", e);
        }
    });

    info!(address = %bind_address, "Server started successfully");

    // サーバーの実行
    server.await
}

/// エラーハンドリングのヘルパー関数
fn handle_startup_error(error: Error) -> io::Error {
    eprintln!("Startup error: {}", error);
    io::Error::new(io::ErrorKind::Other, error)
}