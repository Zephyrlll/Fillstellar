//! 並行データ構造を使用した高性能ゲームループ

use dashmap::DashMap;
use std::sync::{Arc, atomic::{AtomicBool, AtomicU64, Ordering}};
use std::time::{Duration, Instant};
use tokio::time::{interval, sleep};
use uuid::Uuid;
use anyhow::Result;
use tracing::{info, warn, error, debug, instrument};

use crate::game::celestial_bodies::{CelestialBody, BodyId, CelestialBodyManager};
use crate::game::resources::ResourceManager;
use crate::game::physics_simd::SimdPhysicsEngine;
use crate::services::metrics::MetricsService;
use crate::middleware::metrics::{PhysicsMetricsRecorder, GameMetricsRecorder};

/// 並行ゲーム状態
#[derive(Debug)]
pub struct ConcurrentGameState {
    /// 天体データ（並行アクセス対応）
    pub celestial_bodies: Arc<DashMap<BodyId, CelestialBody>>,
    /// プレイヤー別リソース管理
    pub player_resources: Arc<DashMap<Uuid, ResourceManager>>,
    /// アクティブプレイヤー
    pub active_players: Arc<DashMap<Uuid, PlayerSession>>,
    /// ゲームティック
    pub game_tick: AtomicU64,
    /// 実行中フラグ
    pub running: AtomicBool,
    /// 物理演算エンジン
    pub physics_engine: Arc<tokio::sync::RwLock<SimdPhysicsEngine>>,
    /// メトリクス記録
    pub metrics_recorder: GameMetricsRecorder,
}

/// プレイヤーセッション情報
#[derive(Debug, Clone)]
pub struct PlayerSession {
    pub player_id: Uuid,
    pub connected_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub websocket_session_id: Option<Uuid>,
}

/// ゲームループ設定
#[derive(Debug, Clone)]
pub struct GameLoopConfig {
    pub target_tps: u32, // Target Ticks Per Second
    pub physics_update_interval: Duration,
    pub resource_update_interval: Duration,
    pub metrics_update_interval: Duration,
    pub player_timeout: Duration,
    pub max_celestial_bodies: usize,
    pub auto_save_interval: Duration,
}

impl Default for GameLoopConfig {
    fn default() -> Self {
        Self {
            target_tps: 60,
            physics_update_interval: Duration::from_millis(16), // ~60 FPS
            resource_update_interval: Duration::from_millis(100), // 10 Hz
            metrics_update_interval: Duration::from_secs(5),
            player_timeout: Duration::from_secs(300), // 5分
            max_celestial_bodies: 10000,
            auto_save_interval: Duration::from_secs(30),
        }
    }
}

impl ConcurrentGameState {
    /// 新しい並行ゲーム状態を作成
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        let physics_engine = Arc::new(tokio::sync::RwLock::new(
            SimdPhysicsEngine::new(metrics_service.clone())
        ));
        let metrics_recorder = GameMetricsRecorder::new(metrics_service);

        Self {
            celestial_bodies: Arc::new(DashMap::new()),
            player_resources: Arc::new(DashMap::new()),
            active_players: Arc::new(DashMap::new()),
            game_tick: AtomicU64::new(0),
            running: AtomicBool::new(false),
            physics_engine,
            metrics_recorder,
        }
    }

    /// プレイヤーを追加
    pub fn add_player(&self, player_id: Uuid, websocket_session_id: Option<Uuid>) {
        let session = PlayerSession {
            player_id,
            connected_at: chrono::Utc::now(),
            last_activity: chrono::Utc::now(),
            websocket_session_id,
        };
        
        self.active_players.insert(player_id, session);
        
        // プレイヤー用リソースマネージャーを作成
        if !self.player_resources.contains_key(&player_id) {
            self.player_resources.insert(player_id, ResourceManager::new());
        }
        
        info!("Player {} added to game", player_id);
        self.update_player_metrics();
    }

    /// プレイヤーを削除
    pub fn remove_player(&self, player_id: &Uuid) {
        self.active_players.remove(player_id);
        info!("Player {} removed from game", player_id);
        self.update_player_metrics();
    }

    /// プレイヤーの最終活動時刻を更新
    pub fn update_player_activity(&self, player_id: &Uuid) {
        if let Some(mut session) = self.active_players.get_mut(player_id) {
            session.last_activity = chrono::Utc::now();
        }
    }

    /// 天体を追加
    pub fn add_celestial_body(&self, body: CelestialBody) -> Result<()> {
        if self.celestial_bodies.len() >= 10000 { // 制限チェック
            return Err(anyhow::anyhow!("Maximum celestial bodies limit reached"));
        }
        
        self.celestial_bodies.insert(body.id, body);
        debug!("Celestial body added, total count: {}", self.celestial_bodies.len());
        self.update_celestial_body_metrics();
        Ok(())
    }

    /// 天体を削除
    pub fn remove_celestial_body(&self, body_id: &BodyId) -> Option<CelestialBody> {
        let removed = self.celestial_bodies.remove(body_id);
        if removed.is_some() {
            debug!("Celestial body removed, total count: {}", self.celestial_bodies.len());
            self.update_celestial_body_metrics();
        }
        removed.map(|(_, body)| body)
    }

    /// 天体データを取得
    pub fn get_celestial_body(&self, body_id: &BodyId) -> Option<CelestialBody> {
        self.celestial_bodies.get(body_id).map(|entry| entry.value().clone())
    }

    /// 全天体数を取得
    pub fn celestial_body_count(&self) -> usize {
        self.celestial_bodies.len()
    }

    /// アクティブプレイヤー数を取得
    pub fn active_player_count(&self) -> usize {
        self.active_players.len()
    }

    /// ゲームティックを取得
    pub fn get_game_tick(&self) -> u64 {
        self.game_tick.load(Ordering::Relaxed)
    }

    /// ゲームティックを増加
    pub fn increment_tick(&self) {
        self.game_tick.fetch_add(1, Ordering::Relaxed);
        self.metrics_recorder.record_game_tick();
    }

    /// 実行状態を設定
    pub fn set_running(&self, running: bool) {
        self.running.store(running, Ordering::Relaxed);
    }

    /// 実行状態を取得
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::Relaxed)
    }

    /// メトリクスを更新
    fn update_player_metrics(&self) {
        self.metrics_recorder.update_active_players(self.active_player_count());
    }

    fn update_celestial_body_metrics(&self) {
        self.metrics_recorder.update_celestial_bodies(self.celestial_body_count());
    }

    /// 非アクティブプレイヤーをクリーンアップ
    pub fn cleanup_inactive_players(&self, timeout: Duration) {
        let now = chrono::Utc::now();
        let mut removed_players = Vec::new();

        self.active_players.retain(|player_id, session| {
            let inactive_duration = now - session.last_activity;
            let is_active = inactive_duration < chrono::Duration::from_std(timeout).unwrap();
            
            if !is_active {
                removed_players.push(*player_id);
            }
            
            is_active
        });

        if !removed_players.is_empty() {
            info!("Cleaned up {} inactive players", removed_players.len());
            self.update_player_metrics();
        }
    }

    /// ゲーム状態のスナップショットを作成
    pub fn create_snapshot(&self) -> GameStateSnapshot {
        GameStateSnapshot {
            tick: self.get_game_tick(),
            celestial_body_count: self.celestial_body_count(),
            active_player_count: self.active_player_count(),
            timestamp: chrono::Utc::now(),
        }
    }
}

/// ゲーム状態のスナップショット
#[derive(Debug, Clone, serde::Serialize)]
pub struct GameStateSnapshot {
    pub tick: u64,
    pub celestial_body_count: usize,
    pub active_player_count: usize,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// 並行ゲームループ
pub struct ConcurrentGameLoop {
    state: Arc<ConcurrentGameState>,
    config: GameLoopConfig,
    physics_metrics: PhysicsMetricsRecorder,
}

impl ConcurrentGameLoop {
    /// 新しいゲームループを作成
    pub fn new(metrics_service: Arc<MetricsService>, config: GameLoopConfig) -> Self {
        let state = Arc::new(ConcurrentGameState::new(metrics_service.clone()));
        let physics_metrics = PhysicsMetricsRecorder::new(metrics_service);

        Self {
            state,
            config,
            physics_metrics,
        }
    }

    /// ゲームループを開始
    #[instrument(skip(self))]
    pub async fn start(&mut self) -> Result<()> {
        info!("Starting concurrent game loop with target TPS: {}", self.config.target_tps);
        
        self.state.set_running(true);

        // 複数のタスクを並行実行
        let physics_task = self.start_physics_loop();
        let resource_task = self.start_resource_loop();
        let metrics_task = self.start_metrics_loop();
        let cleanup_task = self.start_cleanup_loop();

        // 全てのタスクを並行実行
        tokio::try_join!(physics_task, resource_task, metrics_task, cleanup_task)?;

        Ok(())
    }

    /// 物理演算ループ
    async fn start_physics_loop(&self) -> Result<()> {
        let mut interval = interval(self.config.physics_update_interval);
        
        info!("Physics loop started with interval: {:?}", self.config.physics_update_interval);
        
        while self.state.is_running() {
            interval.tick().await;
            
            let start_time = Instant::now();
            
            // 物理演算を実行
            let result = self.update_physics().await;
            
            let duration = start_time.elapsed();
            
            match result {
                Ok(collision_checks) => {
                    self.physics_metrics.record_physics_calculation(
                        duration.as_secs_f64(),
                        self.state.celestial_body_count(),
                        collision_checks,
                    );
                }
                Err(e) => {
                    error!("Physics update failed: {}", e);
                }
            }
            
            self.state.increment_tick();
        }
        
        Ok(())
    }

    /// リソース更新ループ
    async fn start_resource_loop(&self) -> Result<()> {
        let mut interval = interval(self.config.resource_update_interval);
        
        info!("Resource loop started with interval: {:?}", self.config.resource_update_interval);
        
        while self.state.is_running() {
            interval.tick().await;
            
            self.update_resources().await;
        }
        
        Ok(())
    }

    /// メトリクス更新ループ
    async fn start_metrics_loop(&self) -> Result<()> {
        let mut interval = interval(self.config.metrics_update_interval);
        
        info!("Metrics loop started with interval: {:?}", self.config.metrics_update_interval);
        
        while self.state.is_running() {
            interval.tick().await;
            
            self.update_metrics().await;
        }
        
        Ok(())
    }

    /// クリーンアップループ
    async fn start_cleanup_loop(&self) -> Result<()> {
        let mut interval = interval(Duration::from_secs(60)); // 1分間隔
        
        info!("Cleanup loop started");
        
        while self.state.is_running() {
            interval.tick().await;
            
            self.state.cleanup_inactive_players(self.config.player_timeout);
        }
        
        Ok(())
    }

    /// 物理演算を更新
    async fn update_physics(&self) -> Result<usize> {
        let celestial_bodies = &self.state.celestial_bodies;
        
        if celestial_bodies.is_empty() {
            return Ok(0);
        }

        // DashMapから標準HashMapに変換（物理演算用）
        let mut bodies_map = std::collections::HashMap::new();
        for entry in celestial_bodies.iter() {
            bodies_map.insert(*entry.key(), entry.value().clone());
        }

        // 物理演算を実行
        let mut physics_engine = self.state.physics_engine.write().await;
        physics_engine.update_optimized(&mut bodies_map, self.config.physics_update_interval.as_secs_f64())?;

        // 結果をDashMapに書き戻し
        let mut collision_checks = 0;
        for (id, updated_body) in bodies_map {
            if let Some(mut entry) = celestial_bodies.get_mut(&id) {
                *entry = updated_body;
                collision_checks += 1;
            }
        }

        Ok(collision_checks)
    }

    /// リソースを更新
    async fn update_resources(&self) {
        let mut total_generation_rate = 0.0;
        
        for mut entry in self.state.player_resources.iter_mut() {
            let resource_manager = entry.value_mut();
            
            // リソース生成率を計算
            let generation_rate = resource_manager.calculate_generation_rate();
            total_generation_rate += generation_rate;
            
            // リソースを更新
            resource_manager.update_resources(self.config.resource_update_interval.as_secs_f64());
        }
        
        // メトリクスを更新
        self.state.metrics_recorder.record_game_state(
            self.state.active_player_count(),
            self.state.celestial_body_count(),
            total_generation_rate,
        );
    }

    /// メトリクスを更新
    async fn update_metrics(&self) {
        let snapshot = self.state.create_snapshot();
        
        debug!("Game state snapshot: tick={}, bodies={}, players={}", 
               snapshot.tick, snapshot.celestial_body_count, snapshot.active_player_count);
        
        // 追加のメトリクス更新があればここで実行
    }

    /// ゲームループを停止
    pub async fn stop(&self) {
        info!("Stopping concurrent game loop");
        self.state.set_running(false);
    }

    /// ゲーム状態への参照を取得
    pub fn get_state(&self) -> &Arc<ConcurrentGameState> {
        &self.state
    }

    /// 設定を取得
    pub fn get_config(&self) -> &GameLoopConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    
    #[tokio::test]
    async fn test_concurrent_game_state_creation() {
        let metrics_config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(metrics_config).unwrap());
        
        let state = ConcurrentGameState::new(metrics_service);
        
        assert_eq!(state.celestial_body_count(), 0);
        assert_eq!(state.active_player_count(), 0);
        assert_eq!(state.get_game_tick(), 0);
        assert!(!state.is_running());
    }

    #[tokio::test]
    async fn test_player_management() {
        let metrics_config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(metrics_config).unwrap());
        
        let state = ConcurrentGameState::new(metrics_service);
        let player_id = Uuid::new_v4();
        
        // プレイヤーを追加
        state.add_player(player_id, None);
        assert_eq!(state.active_player_count(), 1);
        
        // 活動時刻を更新
        state.update_player_activity(&player_id);
        
        // プレイヤーを削除
        state.remove_player(&player_id);
        assert_eq!(state.active_player_count(), 0);
    }

    #[tokio::test]
    async fn test_concurrent_game_loop_creation() {
        let metrics_config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(metrics_config).unwrap());
        
        let config = GameLoopConfig::default();
        let game_loop = ConcurrentGameLoop::new(metrics_service, config);
        
        assert_eq!(game_loop.get_state().celestial_body_count(), 0);
        assert_eq!(game_loop.get_config().target_tps, 60);
    }

    #[test]
    fn test_game_loop_config_default() {
        let config = GameLoopConfig::default();
        assert_eq!(config.target_tps, 60);
        assert_eq!(config.physics_update_interval, Duration::from_millis(16));
        assert_eq!(config.max_celestial_bodies, 10000);
    }

    #[tokio::test]
    async fn test_concurrent_celestial_body_operations() {
        let metrics_config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(metrics_config).unwrap());
        
        let state = ConcurrentGameState::new(metrics_service);
        let body_id = Uuid::new_v4();
        
        let body = crate::game::celestial_bodies::CelestialBody::new(
            body_id,
            crate::game::celestial_bodies::CelestialType::Asteroid,
            nalgebra::Vector3::new(0.0, 0.0, 0.0),
            crate::game::resources::fixed::from_f64(1000.0),
            crate::game::resources::fixed::from_f64(1.0),
        );
        
        // 天体を追加
        state.add_celestial_body(body.clone()).unwrap();
        assert_eq!(state.celestial_body_count(), 1);
        
        // 天体を取得
        let retrieved = state.get_celestial_body(&body_id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().id, body_id);
        
        // 天体を削除
        let removed = state.remove_celestial_body(&body_id);
        assert!(removed.is_some());
        assert_eq!(state.celestial_body_count(), 0);
    }
}