//! # Seed Data Binary
//!
//! 開発用シードデータを投入するためのバイナリ

use cosmic_gardener_backend::{
    shared::{config::Config, errors::Result},
    infrastructure::database::DatabaseService,
};
use sqlx::PgPool;
use std::env;
use tokio;
use tracing::{info, warn, error};

#[tokio::main]
async fn main() -> Result<()> {
    // ログの初期化
    tracing_subscriber::fmt::init();
    
    info!("Starting seed data process...");
    
    // 設定の読み込み
    let config = Config::load()?;
    
    // データベース接続
    let db_service = DatabaseService::new(&config).await?;
    let pool = db_service.pool();
    
    // コマンドライン引数のチェック
    let args: Vec<String> = env::args().collect();
    let seed_type = args.get(1).map(|s| s.as_str()).unwrap_or("all");
    
    match seed_type {
        "master" => {
            info!("Loading master data...");
            load_master_data(pool).await?;
        }
        "dev" => {
            info!("Loading development data...");
            load_dev_data(pool).await?;
        }
        "all" => {
            info!("Loading all seed data...");
            load_master_data(pool).await?;
            load_dev_data(pool).await?;
        }
        "clean" => {
            warn!("Cleaning all data...");
            clean_all_data(pool).await?;
        }
        _ => {
            error!("Unknown seed type: {}", seed_type);
            print_usage();
            std::process::exit(1);
        }
    }
    
    info!("Seed data process completed successfully!");
    Ok(())
}

/// マスターデータの投入
async fn load_master_data(pool: &PgPool) -> Result<()> {
    info!("Loading master data...");
    
    let master_data_sql = include_str!("../../scripts/seed/master_data.sql");
    
    // トランザクション内で実行
    let mut tx = pool.begin().await?;
    
    // SQLを分割して実行（複数のINSERT文が含まれているため）
    for statement in master_data_sql.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() && !statement.starts_with("--") {
            sqlx::query(statement).execute(&mut *tx).await.map_err(|e| {
                error!("Failed to execute statement: {}", statement);
                e
            })?;
        }
    }
    
    tx.commit().await?;
    info!("Master data loaded successfully");
    Ok(())
}

/// 開発用データの投入
async fn load_dev_data(pool: &PgPool) -> Result<()> {
    info!("Loading development data...");
    
    let dev_data_sql = include_str!("../../scripts/seed/dev_data.sql");
    
    // トランザクション内で実行
    let mut tx = pool.begin().await?;
    
    // SQLを分割して実行
    for statement in dev_data_sql.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() && !statement.starts_with("--") {
            sqlx::query(statement).execute(&mut *tx).await.map_err(|e| {
                error!("Failed to execute statement: {}", statement);
                e
            })?;
        }
    }
    
    tx.commit().await?;
    info!("Development data loaded successfully");
    Ok(())
}

/// 全データのクリーンアップ
async fn clean_all_data(pool: &PgPool) -> Result<()> {
    warn!("Cleaning all data...");
    
    let mut tx = pool.begin().await?;
    
    // 外部キー制約を無効にして削除
    sqlx::query("SET session_replication_role = replica").execute(&mut *tx).await?;
    
    // 順序を考慮してテーブルをクリア
    let tables = vec![
        "event_logs",
        "player_achievements",
        "life_evolution_history",
        "life_forms",
        "celestial_body_events",
        "celestial_body_relations",
        "celestial_bodies",
        "save_research",
        "save_resources",
        "save_metadata",
        "game_saves",
        "player_sessions",
        "player_statistics",
        "players",
        "achievement_types",
        "research_types",
        "resource_types",
    ];
    
    for table in tables {
        sqlx::query(&format!("TRUNCATE {} RESTART IDENTITY CASCADE", table))
            .execute(&mut *tx)
            .await?;
        info!("Cleared table: {}", table);
    }
    
    // 外部キー制約を再有効化
    sqlx::query("SET session_replication_role = DEFAULT").execute(&mut *tx).await?;
    
    tx.commit().await?;
    warn!("All data cleaned");
    Ok(())
}

/// 使用法の表示
fn print_usage() {
    println!("Usage: cargo run --bin seed [TYPE]");
    println!();
    println!("Types:");
    println!("  master  - Load master data only");
    println!("  dev     - Load development data only"); 
    println!("  all     - Load all data (default)");
    println!("  clean   - Clean all data");
    println!();
    println!("Examples:");
    println!("  cargo run --bin seed");
    println!("  cargo run --bin seed master");
    println!("  cargo run --bin seed dev");
    println!("  cargo run --bin seed clean");
}