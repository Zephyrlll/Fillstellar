//! # Database Infrastructure
//!
//! PostgreSQL + PostGIS を使用したデータベースアクセス層

use crate::shared::{config::Config, Result};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::sync::Arc;
use std::time::Duration;

pub mod migrations;
pub mod models;
pub mod repositories;

/// データベースサービス
#[derive(Clone)]
pub struct DatabaseService {
    pool: Arc<Pool<Postgres>>,
}

impl DatabaseService {
    /// 新しいデータベースサービスを作成
    pub async fn new(config: &Config) -> Result<Self> {
        let database_url = &config.database.url;
        
        let pool = PgPoolOptions::new()
            .max_connections(config.database.max_connections)
            .min_connections(config.database.min_connections)
            .max_lifetime(Some(Duration::from_secs(config.database.max_lifetime)))
            .idle_timeout(Some(Duration::from_secs(config.database.idle_timeout)))
            .connect(database_url)
            .await?;
        
        tracing::info!("Database connection pool created successfully");
        
        Ok(Self {
            pool: Arc::new(pool),
        })
    }
    
    /// データベースプールの参照を取得
    pub fn pool(&self) -> &Pool<Postgres> {
        &self.pool
    }
    
    /// ヘルスチェック
    pub async fn health_check(&self) -> Result<()> {
        sqlx::query("SELECT 1")
            .execute(&*self.pool)
            .await?;
        Ok(())
    }
    
    /// テスト用のセットアップ
    #[cfg(test)]
    pub async fn setup_test() -> Result<()> {
        // テスト用の設定
        Ok(())
    }
    
    /// テスト用のクリーンアップ
    #[cfg(test)]
    pub async fn cleanup_test() -> Result<()> {
        // テスト用のクリーンアップ
        Ok(())
    }
}

/// データベースの初期化
pub async fn initialize() -> Result<()> {
    tracing::info!("Initializing database infrastructure");
    
    // マイグレーションの実行
    migrations::run_migrations().await?;
    
    Ok(())
}

/// データベースのクリーンアップ
pub async fn cleanup() -> Result<()> {
    tracing::info!("Cleaning up database infrastructure");
    Ok(())
}