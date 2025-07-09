use std::collections::HashMap;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;
use chrono::Utc;
use serial_test::serial;
use sqlx::PgPool;

use cosmic_gardener_backend::game::{
    resources::{ResourceManager, Resources, ResourceType, UpgradeType, fixed},
    celestial_bodies::{CelestialBodyManager, CelestialType, Vec3Fixed},
    physics::PhysicsEngine,
    validation::ValidationEngine,
    persistence::{PersistenceManager, PersistenceConfig, GameStateSnapshot},
    game_loop::{GameLoop, GameLoopConfig, GameCommand},
    migration::{MigrationManager, DataMigration},
};
use cosmic_gardener_backend::errors::GameError;

/// テスト用のデータベース接続を取得
async fn get_test_db() -> PgPool {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:password@localhost/cosmic_gardener_test".to_string());
    
    PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to test database")
}

/// テストデータのクリーンアップ
async fn cleanup_test_data(pool: &PgPool) {
    let _ = sqlx::query("DELETE FROM game_snapshots").execute(pool).await;
    let _ = sqlx::query("DELETE FROM game_deltas").execute(pool).await;
    let _ = sqlx::query("DELETE FROM celestial_bodies").execute(pool).await;
    let _ = sqlx::query("DELETE FROM game_leaderboards").execute(pool).await;
    let _ = sqlx::query("DELETE FROM player_upgrades").execute(pool).await;
    let _ = sqlx::query("DELETE FROM player_achievements").execute(pool).await;
    let _ = sqlx::query("DELETE FROM player_statistics").execute(pool).await;
}

#[tokio::test]
#[serial]
async fn test_resource_manager_integration() {
    let mut resource_manager = ResourceManager::new(50); // 50ms tick
    
    // 初期状態の確認
    let initial_state = resource_manager.get_game_state();
    assert_eq!(initial_state.resources.cosmic_dust, 0);
    assert_eq!(initial_state.resources.energy, 0);
    
    // リソース蓄積のテスト
    resource_manager.accumulate_resources(1000); // 1秒 = 20ティック
    let after_accumulation = resource_manager.get_game_state();
    assert!(after_accumulation.resources.cosmic_dust > 0);
    
    // アップグレードのテスト
    let mut resources = Resources::default();
    resources.cosmic_dust = 1000;
    resource_manager.get_game_state().resources = resources;
    
    let result = resource_manager.apply_upgrade(UpgradeType::DustProduction);
    assert!(result.is_ok());
    
    let after_upgrade = resource_manager.get_game_state();
    assert_eq!(after_upgrade.upgrade_levels.get_level(UpgradeType::DustProduction), 1);
    assert!(after_upgrade.resources.cosmic_dust < 1000); // コストが引かれている
}

#[tokio::test]
#[serial]
async fn test_celestial_body_manager_integration() {
    let mut celestial_manager = CelestialBodyManager::new(50);
    let mut resources = Resources::default();
    resources.cosmic_dust = 10000;
    
    // 天体作成のテスト
    let position = Vec3Fixed::new(fixed::from_f64(100.0), fixed::from_f64(200.0), fixed::from_f64(300.0));
    let result = celestial_manager.create_body(CelestialType::Asteroid, position, &mut resources);
    assert!(result.is_ok());
    
    let body_id = result.unwrap();
    assert_eq!(celestial_manager.get_body_count(), 1);
    assert_eq!(resources.cosmic_dust, 9900); // 100コスト
    
    // 天体の取得
    let body = celestial_manager.get_body(body_id);
    assert!(body.is_some());
    
    let body = body.unwrap();
    assert_eq!(body.physics.position, position);
    assert_eq!(body.physics.mass, fixed::from_f64(1e15));
    
    // 生命システムの更新テスト
    celestial_manager.update_life_systems(60000); // 1分
    
    // 天体削除のテスト
    let result = celestial_manager.remove_body(body_id);
    assert!(result.is_ok());
    assert_eq!(celestial_manager.get_body_count(), 0);
}

#[tokio::test]
#[serial]
async fn test_physics_engine_integration() {
    let mut physics_engine = PhysicsEngine::new();
    let mut bodies = HashMap::new();
    
    // 2つの天体を作成
    let body1_id = Uuid::new_v4();
    let body2_id = Uuid::new_v4();
    
    let body1 = cosmic_gardener_backend::game::celestial_bodies::CelestialBody::new(
        body1_id,
        CelestialType::Asteroid,
        Vec3Fixed::new(fixed::from_f64(0.0), fixed::from_f64(0.0), fixed::from_f64(0.0)),
        fixed::from_f64(1000.0),
        fixed::from_f64(1.0),
    );
    
    let body2 = cosmic_gardener_backend::game::celestial_bodies::CelestialBody::new(
        body2_id,
        CelestialType::Asteroid,
        Vec3Fixed::new(fixed::from_f64(10.0), fixed::from_f64(0.0), fixed::from_f64(0.0)),
        fixed::from_f64(1000.0),
        fixed::from_f64(1.0),
    );
    
    bodies.insert(body1_id, body1);
    bodies.insert(body2_id, body2);
    
    // 物理演算の実行
    let result = physics_engine.update(&mut bodies, 0.05);
    assert!(result.is_ok());
    
    // 重力により速度が変化していることを確認
    let body1_after = bodies.get(&body1_id).unwrap();
    let body2_after = bodies.get(&body2_id).unwrap();
    
    assert_ne!(body1_after.physics.velocity.magnitude(), 0);
    assert_ne!(body2_after.physics.velocity.magnitude(), 0);
    
    // 運動量保存の確認
    let total_momentum = body1_after.physics.velocity * body1_after.physics.mass + 
                        body2_after.physics.velocity * body2_after.physics.mass;
    assert!(total_momentum.magnitude() < fixed::from_f64(0.001)); // 数値誤差を考慮
}

#[tokio::test]
#[serial]
async fn test_validation_engine_integration() {
    let mut validation_engine = ValidationEngine::new();
    let player_id = Uuid::new_v4();
    
    // リソース検証のテスト
    let valid_resources = Resources {
        cosmic_dust: 1000,
        energy: 500,
        ..Default::default()
    };
    assert!(validation_engine.validate_resources(&valid_resources).is_ok());
    
    let invalid_resources = Resources {
        cosmic_dust: u64::MAX,
        ..Default::default()
    };
    assert!(validation_engine.validate_resources(&invalid_resources).is_err());
    
    // 天体作成のレート制限テスト
    let position = Vec3Fixed::new(fixed::from_f64(100.0), fixed::from_f64(200.0), fixed::from_f64(300.0));
    let bodies = HashMap::new();
    
    // 最初の10回は成功
    for _ in 0..10 {
        let result = validation_engine.validate_body_creation(
            player_id,
            &CelestialType::Asteroid,
            &position,
            &bodies,
        );
        assert!(result.is_ok());
    }
    
    // 11回目は失敗（レート制限）
    let result = validation_engine.validate_body_creation(
        player_id,
        &CelestialType::Asteroid,
        &position,
        &bodies,
    );
    assert!(result.is_err());
    
    // 異常検出のテスト
    let anomalies = validation_engine.detect_anomalies(player_id);
    assert!(!anomalies.is_empty()); // レート制限違反が検出される
}

#[tokio::test]
#[serial]
async fn test_persistence_manager_integration() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    let config = PersistenceConfig::default();
    let mut persistence_manager = PersistenceManager::new(pool.clone(), config);
    
    // スナップショットの作成
    let player_id = Uuid::new_v4();
    let snapshot = GameStateSnapshot::new(
        player_id,
        1000,
        Resources {
            cosmic_dust: 5000,
            energy: 2500,
            ..Default::default()
        },
        cosmic_gardener_backend::game::resources::ProductionRates::default(),
        cosmic_gardener_backend::game::resources::ResourceAccumulators::default(),
        cosmic_gardener_backend::game::resources::UpgradeLevels::default(),
        HashMap::new(),
        cosmic_gardener_backend::game::physics::PhysicsState::new(),
    );
    
    // 保存テスト
    let result = persistence_manager.save_snapshot(snapshot.clone()).await;
    assert!(result.is_ok());
    
    // 読み込みテスト
    let loaded = persistence_manager.load_snapshot(player_id, Some(1000)).await;
    assert!(loaded.is_ok());
    
    let loaded_snapshot = loaded.unwrap();
    assert!(loaded_snapshot.is_some());
    
    let loaded_snapshot = loaded_snapshot.unwrap();
    assert_eq!(loaded_snapshot.player_id, player_id);
    assert_eq!(loaded_snapshot.tick, 1000);
    assert_eq!(loaded_snapshot.resources.cosmic_dust, 5000);
    assert_eq!(loaded_snapshot.resources.energy, 2500);
    assert!(loaded_snapshot.verify_checksum());
    
    cleanup_test_data(&pool).await;
}

#[tokio::test]
#[serial]
async fn test_migration_integration() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    let migration_manager = MigrationManager::new(pool.clone());
    
    // マイグレーションの実行
    let result = migration_manager.migrate().await;
    assert!(result.is_ok());
    
    // 現在のバージョンを確認
    let current_version = migration_manager.current_version().await;
    assert!(current_version.is_ok());
    
    let version = current_version.unwrap();
    assert!(version.is_some());
    assert_eq!(version.unwrap().0, 2);
    
    // データ整合性チェック
    let integrity_result = migration_manager.verify_integrity().await;
    assert!(integrity_result.is_ok());
    
    cleanup_test_data(&pool).await;
}

#[tokio::test]
#[serial]
async fn test_complete_game_flow_integration() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    // システムの初期化
    let persistence_manager = PersistenceManager::new(pool.clone(), PersistenceConfig::default());
    let (command_sender, command_receiver) = tokio::sync::mpsc::channel(100);
    let (event_sender, mut event_receiver) = tokio::sync::mpsc::channel(100);
    
    let mut game_loop = GameLoop::new(
        GameLoopConfig::default(),
        persistence_manager,
        command_receiver,
        event_sender,
    );
    
    let player_id = Uuid::new_v4();
    game_loop.add_player(player_id).await.unwrap();
    
    // ゲームループを別タスクで開始
    let game_loop_handle = tokio::spawn(async move {
        game_loop.start().await
    });
    
    // 短時間待機
    sleep(Duration::from_millis(100)).await;
    
    // 天体作成コマンドの送信
    let position = Vec3Fixed::new(fixed::from_f64(100.0), fixed::from_f64(200.0), fixed::from_f64(300.0));
    let create_command = GameCommand::CreateCelestialBody {
        player_id,
        body_type: CelestialType::Asteroid,
        position,
    };
    
    command_sender.send(create_command).await.unwrap();
    
    // イベントの受信を待機
    let event = tokio::time::timeout(Duration::from_secs(1), event_receiver.recv()).await;
    assert!(event.is_ok());
    
    let event = event.unwrap();
    assert!(event.is_some());
    
    // アップグレード購入コマンドの送信
    let upgrade_command = GameCommand::PurchaseUpgrade {
        player_id,
        upgrade_type: UpgradeType::DustProduction,
    };
    
    command_sender.send(upgrade_command).await.unwrap();
    
    // 更なるイベントの受信
    let event = tokio::time::timeout(Duration::from_secs(1), event_receiver.recv()).await;
    assert!(event.is_ok());
    
    // ゲーム状態の取得
    let (response_sender, response_receiver) = tokio::sync::oneshot::channel();
    let get_state_command = GameCommand::GetState {
        player_id,
        response_sender,
    };
    
    command_sender.send(get_state_command).await.unwrap();
    
    let state_result = tokio::time::timeout(Duration::from_secs(1), response_receiver).await;
    assert!(state_result.is_ok());
    
    let state = state_result.unwrap().unwrap();
    assert!(state.is_ok());
    
    let game_state = state.unwrap();
    assert_eq!(game_state.player_id, player_id);
    assert!(game_state.resources.cosmic_dust > 0);
    
    // ゲームループを停止
    drop(command_sender);
    
    let _ = tokio::time::timeout(Duration::from_secs(1), game_loop_handle).await;
    
    cleanup_test_data(&pool).await;
}

#[tokio::test]
#[serial]
async fn test_performance_under_load() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    let mut resource_manager = ResourceManager::new(50);
    let mut celestial_manager = CelestialBodyManager::new(50);
    let mut physics_engine = PhysicsEngine::new();
    
    // 大量の天体を作成
    const NUM_BODIES: usize = 1000;
    let mut resources = Resources::default();
    resources.cosmic_dust = 100000;
    
    let start_time = std::time::Instant::now();
    
    for i in 0..NUM_BODIES {
        let position = Vec3Fixed::new(
            fixed::from_f64(i as f64 * 10.0),
            fixed::from_f64(i as f64 * 10.0),
            fixed::from_f64(i as f64 * 10.0),
        );
        
        let result = celestial_manager.create_body(CelestialType::Asteroid, position, &mut resources);
        assert!(result.is_ok());
    }
    
    let creation_time = start_time.elapsed();
    println!("Created {} bodies in {:?}", NUM_BODIES, creation_time);
    
    // 物理演算の性能テスト
    let start_time = std::time::Instant::now();
    
    for _ in 0..10 {
        let result = physics_engine.update(celestial_manager.get_all_bodies_mut(), 0.05);
        assert!(result.is_ok());
    }
    
    let physics_time = start_time.elapsed();
    println!("Physics simulation for {} bodies (10 ticks) in {:?}", NUM_BODIES, physics_time);
    
    // リソース計算の性能テスト
    let start_time = std::time::Instant::now();
    
    for _ in 0..100 {
        resource_manager.accumulate_resources(50);
    }
    
    let resource_time = start_time.elapsed();
    println!("Resource accumulation (100 ticks) in {:?}", resource_time);
    
    // 性能要件の確認
    assert!(creation_time.as_millis() < 5000); // 5秒以内
    assert!(physics_time.as_millis() < 1000); // 1秒以内
    assert!(resource_time.as_millis() < 100); // 100ms以内
    
    cleanup_test_data(&pool).await;
}

#[tokio::test]
#[serial]
async fn test_data_consistency() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    let mut persistence_manager = PersistenceManager::new(pool.clone(), PersistenceConfig::default());
    let player_id = Uuid::new_v4();
    
    // 初期スナップショットの作成
    let mut snapshot = GameStateSnapshot::new(
        player_id,
        1000,
        Resources {
            cosmic_dust: 1000,
            energy: 500,
            ..Default::default()
        },
        cosmic_gardener_backend::game::resources::ProductionRates::default(),
        cosmic_gardener_backend::game::resources::ResourceAccumulators::default(),
        cosmic_gardener_backend::game::resources::UpgradeLevels::default(),
        HashMap::new(),
        cosmic_gardener_backend::game::physics::PhysicsState::new(),
    );
    
    // 保存
    persistence_manager.save_snapshot(snapshot.clone()).await.unwrap();
    
    // 差分の作成と適用
    let mut delta = cosmic_gardener_backend::game::persistence::GameStateDelta::new(player_id, 1000, 1001);
    delta.resource_changes = Some(Resources {
        cosmic_dust: 1500,
        energy: 750,
        ..Default::default()
    });
    
    persistence_manager.save_delta(delta.clone()).await.unwrap();
    
    // 状態の復元
    let restored = persistence_manager.restore_state(player_id, 1001).await.unwrap();
    assert!(restored.is_some());
    
    let restored_snapshot = restored.unwrap();
    assert_eq!(restored_snapshot.tick, 1001);
    assert_eq!(restored_snapshot.resources.cosmic_dust, 1500);
    assert_eq!(restored_snapshot.resources.energy, 750);
    assert!(restored_snapshot.verify_checksum());
    
    cleanup_test_data(&pool).await;
}

#[tokio::test]
#[serial]
async fn test_concurrent_access() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    let persistence_manager = PersistenceManager::new(pool.clone(), PersistenceConfig::default());
    let persistence_manager = std::sync::Arc::new(tokio::sync::Mutex::new(persistence_manager));
    
    let mut handles = Vec::new();
    
    // 複数のプレイヤーが同時にアクセス
    for i in 0..10 {
        let persistence_manager = persistence_manager.clone();
        
        let handle = tokio::spawn(async move {
            let player_id = Uuid::new_v4();
            let snapshot = GameStateSnapshot::new(
                player_id,
                1000 + i,
                Resources {
                    cosmic_dust: 1000 + i as u64,
                    energy: 500 + i as u64,
                    ..Default::default()
                },
                cosmic_gardener_backend::game::resources::ProductionRates::default(),
                cosmic_gardener_backend::game::resources::ResourceAccumulators::default(),
                cosmic_gardener_backend::game::resources::UpgradeLevels::default(),
                HashMap::new(),
                cosmic_gardener_backend::game::physics::PhysicsState::new(),
            );
            
            let mut manager = persistence_manager.lock().await;
            manager.save_snapshot(snapshot.clone()).await.unwrap();
            
            let loaded = manager.load_snapshot(player_id, Some(1000 + i)).await.unwrap();
            assert!(loaded.is_some());
            
            let loaded_snapshot = loaded.unwrap();
            assert_eq!(loaded_snapshot.resources.cosmic_dust, 1000 + i as u64);
            assert_eq!(loaded_snapshot.resources.energy, 500 + i as u64);
        });
        
        handles.push(handle);
    }
    
    // 全てのタスクの完了を待機
    for handle in handles {
        handle.await.unwrap();
    }
    
    cleanup_test_data(&pool).await;
}

#[tokio::test]
#[serial]
async fn test_error_handling() {
    let mut resource_manager = ResourceManager::new(50);
    let mut celestial_manager = CelestialBodyManager::new(50);
    let mut validation_engine = ValidationEngine::new();
    
    // 不正なリソース値
    let invalid_resources = Resources {
        cosmic_dust: u64::MAX,
        ..Default::default()
    };
    assert!(validation_engine.validate_resources(&invalid_resources).is_err());
    
    // 不足リソースでのアップグレード
    let result = resource_manager.apply_upgrade(UpgradeType::DustProduction);
    assert!(result.is_err());
    
    // 境界外の位置での天体作成
    let mut resources = Resources::default();
    resources.cosmic_dust = 10000;
    
    let far_position = Vec3Fixed::new(fixed::from_f64(200000.0), fixed::from_f64(0.0), fixed::from_f64(0.0));
    let result = celestial_manager.create_body(CelestialType::Asteroid, far_position, &mut resources);
    assert!(result.is_err());
    
    // 存在しない天体の削除
    let non_existent_id = Uuid::new_v4();
    let result = celestial_manager.remove_body(non_existent_id);
    assert!(result.is_err());
}

#[tokio::test]
#[serial]
async fn test_system_recovery() {
    let pool = get_test_db().await;
    cleanup_test_data(&pool).await;
    
    let migration_manager = MigrationManager::new(pool.clone());
    
    // マイグレーションの実行
    migration_manager.migrate().await.unwrap();
    
    // データ整合性チェック
    let result = DataMigration::verify_data_integrity(&pool).await;
    assert!(result.is_ok());
    
    // 統計の再計算
    let result = DataMigration::recalculate_statistics(&pool).await;
    assert!(result.is_ok());
    
    cleanup_test_data(&pool).await;
}