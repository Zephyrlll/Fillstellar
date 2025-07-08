//! # 統合テストモジュール
//!
//! Cosmic Gardener Backend APIの統合テストスイート
//!
//! ## テストカテゴリ
//!
//! 1. **正常系フロー** - 通常の使用シナリオ
//! 2. **異常系** - エラーハンドリングとセキュリティ
//! 3. **境界値** - パラメータの限界値テスト
//! 4. **並行性** - 複数同時リクエストとレースコンディション
//!
//! ## テスト設計原則
//!
//! - **現実的なシナリオ**: 実際のユーザー行動を模倣
//! - **完全な分離**: 各テストは独立して実行可能
//! - **包括的なカバレッジ**: 全エンドポイントとエラーケース
//! - **パフォーマンス考慮**: レスポンス時間とリソース使用量の検証

pub mod auth_flow;
pub mod error_handling;
pub mod boundary_tests;
pub mod concurrency;
pub mod helpers;

use actix_web::{test, web, App};
use sqlx::{PgPool, Pool, Postgres};
use cosmic_gardener_backend::{
    Config,
    services::JwtService,
    routes::configure_routes,
};

/// テスト用アプリケーションファクトリ
/// 
/// 統合テストで使用する Actix Web アプリケーションを作成する
/// 
/// # 引数
/// * `pool` - データベース接続プール
/// * `jwt_service` - JWT認証サービス
/// 
/// # 戻り値
/// テスト用に設定された Actix Web アプリケーション
pub fn create_test_app(
    pool: PgPool,
    jwt_service: JwtService,
) -> actix_web::dev::TestServer {
    test::start(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(jwt_service.clone()))
            .configure(configure_routes)
    })
}

/// テスト用データベースセットアップ
/// 
/// 各テストで使用する独立したテストデータベースを作成
/// 
/// # 戻り値
/// テスト用データベース接続プール
pub async fn setup_test_db() -> PgPool {
    // 環境変数から設定を読み込み
    let config = Config::from_env().expect("Failed to load test configuration");
    
    // テスト用データベースURL（通常は別のDB名を使用）
    let test_db_url = format!("{}_test", config.database_url);
    
    // データベース接続プールを作成
    let pool = PgPool::connect(&test_db_url)
        .await
        .expect("Failed to connect to test database");
    
    // マイグレーションを実行
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    
    pool
}

/// テストデータのクリーンアップ
/// 
/// テスト完了後にデータベースをクリーンな状態に戻す
/// 
/// # 引数
/// * `pool` - データベース接続プール
pub async fn cleanup_test_data(pool: &PgPool) {
    // 外部キー制約を考慮した順序でテーブルをクリア
    let tables = [
        "user_sessions",
        "refresh_tokens",
        "game_statistics",
        "game_saves",
        "users",
    ];
    
    for table in &tables {
        sqlx::query(&format!("TRUNCATE TABLE {} CASCADE", table))
            .execute(pool)
            .await
            .expect(&format!("Failed to truncate table {}", table));
    }
}

/// テスト環境の初期化
/// 
/// ログレベルの設定とその他のテスト前準備
pub fn init_test_env() {
    // テスト用ログレベルを設定（一度だけ実行）
    std::sync::Once::new().call_once(|| {
        env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
            .init();
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    
    /// 基本的なテスト環境のセットアップ検証
    #[actix_web::test]
    async fn test_basic_setup() {
        init_test_env();
        
        let pool = setup_test_db().await;
        
        // データベース接続の確認
        let result = sqlx::query("SELECT 1 as test")
            .fetch_one(&pool)
            .await;
        
        assert!(result.is_ok());
        
        cleanup_test_data(&pool).await;
    }
    
    /// JWT サービスの基本機能テスト
    #[actix_web::test]
    async fn test_jwt_service_setup() {
        init_test_env();
        
        let jwt_service = JwtService::new("test_secret_key_for_testing_purposes_only".to_string());
        
        // トークン生成のテスト
        let user_id = uuid::Uuid::new_v4();
        let token = jwt_service.generate_access_token(user_id).await;
        
        assert!(token.is_ok());
        
        // トークン検証のテスト
        let token_str = token.unwrap();
        let decoded = jwt_service.verify_access_token(&token_str).await;
        
        assert!(decoded.is_ok());
        assert_eq!(decoded.unwrap().user_id, user_id);
    }
}