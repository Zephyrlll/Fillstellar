use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::{interval, Instant};
use tokio::sync::{RwLock, mpsc};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tracing::{info, warn, error, debug};

use crate::errors::GameError;
use crate::game::resources::{ResourceManager, Resources};
use crate::game::celestial_bodies::{CelestialBodyManager, CelestialBody, BodyId};
use crate::game::physics::PhysicsEngine;
use crate::game::validation::{ValidationEngine, PlayerId};
use crate::game::persistence::{PersistenceManager, GameStateSnapshot, GameStateDelta};

/// ゲームループの設定
#[derive(Debug, Clone)]
pub struct GameLoopConfig {
    pub tick_rate: u32,        // Hz
    pub max_delta_time: Duration,
    pub save_interval: Duration,
    pub cleanup_interval: Duration,
    pub max_players: usize,
    pub performance_monitoring: bool,
}

impl Default for GameLoopConfig {
    fn default() -> Self {
        Self {
            tick_rate: 20,           // 20Hz
            max_delta_time: Duration::from_millis(100),
            save_interval: Duration::from_secs(300),  // 5分
            cleanup_interval: Duration::from_secs(3600), // 1時間
            max_players: 1000,
            performance_monitoring: true,
        }
    }
}

/// ゲームコマンド
#[derive(Debug, Clone)]
pub enum GameCommand {
    CreateCelestialBody {
        player_id: PlayerId,
        body_type: crate::game::celestial_bodies::CelestialType,
        position: crate::game::celestial_bodies::Vec3Fixed,
    },
    RemoveCelestialBody {
        player_id: PlayerId,
        body_id: BodyId,
    },
    PurchaseUpgrade {
        player_id: PlayerId,
        upgrade_type: crate::game::resources::UpgradeType,
    },
    SaveGame {
        player_id: PlayerId,
    },
    LoadGame {
        player_id: PlayerId,
    },
    GetState {
        player_id: PlayerId,
        response_sender: tokio::sync::oneshot::Sender<Result<GameStateSnapshot, GameError>>,
    },
}

/// ゲームイベント
#[derive(Debug, Clone)]
pub enum GameEvent {
    CelestialBodyCreated {
        player_id: PlayerId,
        body_id: BodyId,
        body_type: crate::game::celestial_bodies::CelestialType,
    },
    CelestialBodyDestroyed {
        player_id: PlayerId,
        body_id: BodyId,
    },
    LifeEvolved {
        player_id: PlayerId,
        body_id: BodyId,
        new_stage: crate::game::celestial_bodies::LifeStage,
    },
    UpgradePurchased {
        player_id: PlayerId,
        upgrade_type: crate::game::resources::UpgradeType,
    },
    CollisionDetected {
        player_id: PlayerId,
        body1_id: BodyId,
        body2_id: BodyId,
    },
    GameSaved {
        player_id: PlayerId,
        tick: u64,
    },
    GameLoaded {
        player_id: PlayerId,
        tick: u64,
    },
}

/// プレイヤーの状態
#[derive(Debug)]
pub struct PlayerState {
    pub player_id: PlayerId,
    pub resource_manager: ResourceManager,
    pub celestial_manager: CelestialBodyManager,
    pub physics_engine: PhysicsEngine,
    pub last_save_tick: u64,
    pub active: bool,
    pub last_activity: DateTime<Utc>,
}

impl PlayerState {
    pub fn new(player_id: PlayerId, tick_duration_ms: u64) -> Self {
        Self {
            player_id,
            resource_manager: ResourceManager::new(tick_duration_ms),
            celestial_manager: CelestialBodyManager::new(tick_duration_ms),
            physics_engine: PhysicsEngine::new(),
            last_save_tick: 0,
            active: true,
            last_activity: Utc::now(),
        }
    }
    
    /// プレイヤー状態の更新
    pub fn update(&mut self, delta_time_ms: u64) -> Result<Vec<GameEvent>, GameError> {
        let mut events = Vec::new();
        
        // リソースの蓄積
        self.resource_manager.accumulate_resources(delta_time_ms);
        
        // 天体システムの更新
        self.celestial_manager.update_life_systems(delta_time_ms);
        
        // 物理演算の更新
        let physics_delta = delta_time_ms as f64 / 1000.0;
        self.physics_engine.update(self.celestial_manager.get_all_bodies_mut(), physics_delta)?;
        
        // 最終活動時間の更新
        self.last_activity = Utc::now();
        
        Ok(events)
    }
    
    /// ゲーム状態のスナップショット作成
    pub fn create_snapshot(&self, tick: u64) -> GameStateSnapshot {
        GameStateSnapshot::new(
            self.player_id,
            tick,
            self.resource_manager.get_game_state().resources.clone(),
            self.resource_manager.get_game_state().production_rates.clone(),
            self.resource_manager.get_game_state().accumulators.clone(),
            self.resource_manager.get_game_state().upgrade_levels.clone(),
            self.celestial_manager.get_all_bodies().clone(),
            self.physics_engine.get_state().clone(),
        )
    }
    
    /// スナップショットから状態を復元
    pub fn restore_from_snapshot(&mut self, snapshot: &GameStateSnapshot) -> Result<(), GameError> {
        // リソースマネージャーの復元
        let mut game_state = crate::game::resources::GameState {
            resources: snapshot.resources.clone(),
            production_rates: snapshot.production_rates.clone(),
            accumulators: snapshot.accumulators.clone(),
            upgrade_levels: snapshot.upgrade_levels.clone(),
            last_update: snapshot.timestamp,
        };
        self.resource_manager.set_game_state(game_state);
        
        // 天体マネージャーの復元
        self.celestial_manager.bodies = snapshot.bodies.clone();
        
        // 物理エンジンの復元
        self.physics_engine.state = snapshot.physics_state.clone();
        
        self.last_save_tick = snapshot.tick;
        
        Ok(())
    }
}

/// パフォーマンスメトリクス
#[derive(Debug, Clone)]
pub struct PerformanceMetrics {
    pub tick_duration: Duration,
    pub average_tick_duration: Duration,
    pub max_tick_duration: Duration,
    pub active_players: usize,
    pub total_bodies: usize,
    pub physics_calculation_time: Duration,
    pub resource_calculation_time: Duration,
    pub save_operations: u64,
    pub load_operations: u64,
}

impl PerformanceMetrics {
    pub fn new() -> Self {
        Self {
            tick_duration: Duration::ZERO,
            average_tick_duration: Duration::ZERO,
            max_tick_duration: Duration::ZERO,
            active_players: 0,
            total_bodies: 0,
            physics_calculation_time: Duration::ZERO,
            resource_calculation_time: Duration::ZERO,
            save_operations: 0,
            load_operations: 0,
        }
    }
}

/// ゲームループ
pub struct GameLoop {
    config: GameLoopConfig,
    players: Arc<RwLock<HashMap<PlayerId, PlayerState>>>,
    validation_engine: ValidationEngine,
    persistence_manager: PersistenceManager,
    command_receiver: mpsc::Receiver<GameCommand>,
    event_sender: mpsc::Sender<GameEvent>,
    current_tick: u64,
    tick_duration: Duration,
    performance_metrics: PerformanceMetrics,
    running: bool,
}

impl GameLoop {
    pub fn new(
        config: GameLoopConfig,
        persistence_manager: PersistenceManager,
        command_receiver: mpsc::Receiver<GameCommand>,
        event_sender: mpsc::Sender<GameEvent>,
    ) -> Self {
        let tick_duration = Duration::from_millis(1000 / config.tick_rate as u64);
        
        Self {
            config,
            players: Arc::new(RwLock::new(HashMap::new())),
            validation_engine: ValidationEngine::new(),
            persistence_manager,
            command_receiver,
            event_sender,
            current_tick: 0,
            tick_duration,
            performance_metrics: PerformanceMetrics::new(),
            running: false,
        }
    }
    
    /// ゲームループの開始
    pub async fn start(&mut self) -> Result<(), GameError> {
        info!("Starting game loop with tick rate: {} Hz", self.config.tick_rate);
        
        self.running = true;
        let mut ticker = interval(self.tick_duration);
        let mut save_ticker = interval(self.config.save_interval);
        let mut cleanup_ticker = interval(self.config.cleanup_interval);
        
        while self.running {
            tokio::select! {
                _ = ticker.tick() => {
                    if let Err(e) = self.tick().await {
                        error!("Error in game tick: {}", e);
                    }
                }
                _ = save_ticker.tick() => {
                    if let Err(e) = self.auto_save().await {
                        error!("Error in auto save: {}", e);
                    }
                }
                _ = cleanup_ticker.tick() => {
                    if let Err(e) = self.cleanup().await {
                        error!("Error in cleanup: {}", e);
                    }
                }
                Some(command) = self.command_receiver.recv() => {
                    if let Err(e) = self.handle_command(command).await {
                        error!("Error handling command: {}", e);
                    }
                }
            }
        }
        
        info!("Game loop stopped");
        Ok(())
    }
    
    /// ゲームループの停止
    pub fn stop(&mut self) {
        info!("Stopping game loop");
        self.running = false;
    }
    
    /// 1ティックの処理
    async fn tick(&mut self) -> Result<(), GameError> {
        let tick_start = Instant::now();
        
        // プレイヤー状態の更新
        let mut players = self.players.write().await;
        let mut events = Vec::new();
        let mut total_bodies = 0;
        
        for (player_id, player_state) in players.iter_mut() {
            if !player_state.active {
                continue;
            }
            
            // 非アクティブプレイヤーの検出
            let inactive_duration = Utc::now().signed_duration_since(player_state.last_activity);
            if inactive_duration.num_minutes() > 60 {
                player_state.active = false;
                continue;
            }
            
            let delta_time_ms = self.tick_duration.as_millis() as u64;
            
            // プレイヤー状態の更新
            match player_state.update(delta_time_ms) {
                Ok(player_events) => {
                    events.extend(player_events);
                    total_bodies += player_state.celestial_manager.get_body_count();
                }
                Err(e) => {
                    warn!("Error updating player {}: {}", player_id, e);
                }
            }
        }
        
        // イベントの送信
        for event in events {
            if let Err(e) = self.event_sender.send(event).await {
                warn!("Failed to send event: {}", e);
            }
        }
        
        // パフォーマンスメトリクスの更新
        let tick_duration = tick_start.elapsed();
        self.performance_metrics.tick_duration = tick_duration;
        self.performance_metrics.active_players = players.len();
        self.performance_metrics.total_bodies = total_bodies;
        
        if tick_duration > self.performance_metrics.max_tick_duration {
            self.performance_metrics.max_tick_duration = tick_duration;
        }
        
        // 平均ティック時間の更新
        let alpha = 0.1; // 指数移動平均の重み
        self.performance_metrics.average_tick_duration = Duration::from_secs_f64(
            self.performance_metrics.average_tick_duration.as_secs_f64() * (1.0 - alpha) +
            tick_duration.as_secs_f64() * alpha
        );
        
        // パフォーマンス警告
        if tick_duration > self.config.max_delta_time {
            warn!("Tick duration exceeded limit: {:?} > {:?}", tick_duration, self.config.max_delta_time);
        }
        
        if self.config.performance_monitoring && self.current_tick % 200 == 0 {
            info!("Performance: tick={}, duration={:?}, avg={:?}, players={}, bodies={}",
                self.current_tick,
                tick_duration,
                self.performance_metrics.average_tick_duration,
                self.performance_metrics.active_players,
                self.performance_metrics.total_bodies
            );
        }
        
        self.current_tick += 1;
        
        Ok(())
    }
    
    /// コマンドの処理
    async fn handle_command(&mut self, command: GameCommand) -> Result<(), GameError> {
        match command {
            GameCommand::CreateCelestialBody { player_id, body_type, position } => {
                self.handle_create_body(player_id, body_type, position).await?;
            }
            GameCommand::RemoveCelestialBody { player_id, body_id } => {
                self.handle_remove_body(player_id, body_id).await?;
            }
            GameCommand::PurchaseUpgrade { player_id, upgrade_type } => {
                self.handle_purchase_upgrade(player_id, upgrade_type).await?;
            }
            GameCommand::SaveGame { player_id } => {
                self.handle_save_game(player_id).await?;
            }
            GameCommand::LoadGame { player_id } => {
                self.handle_load_game(player_id).await?;
            }
            GameCommand::GetState { player_id, response_sender } => {
                let result = self.handle_get_state(player_id).await;
                let _ = response_sender.send(result);
            }
        }
        Ok(())
    }
    
    /// 天体作成の処理
    async fn handle_create_body(
        &mut self,
        player_id: PlayerId,
        body_type: crate::game::celestial_bodies::CelestialType,
        position: crate::game::celestial_bodies::Vec3Fixed,
    ) -> Result<(), GameError> {
        let mut players = self.players.write().await;
        
        // プレイヤーの確認
        let player = players.get_mut(&player_id).ok_or(GameError::PlayerNotFound)?;
        
        // バリデーション
        self.validation_engine.validate_body_creation(
            player_id,
            &body_type,
            &position,
            player.celestial_manager.get_all_bodies(),
        )?;
        
        // 天体の作成
        let body_id = player.celestial_manager.create_body(
            body_type.clone(),
            position,
            &mut player.resource_manager.get_game_state().resources,
        )?;
        
        // イベントの送信
        let event = GameEvent::CelestialBodyCreated {
            player_id,
            body_id,
            body_type,
        };
        
        if let Err(e) = self.event_sender.send(event).await {
            warn!("Failed to send event: {}", e);
        }
        
        Ok(())
    }
    
    /// 天体削除の処理
    async fn handle_remove_body(&mut self, player_id: PlayerId, body_id: BodyId) -> Result<(), GameError> {
        let mut players = self.players.write().await;
        
        let player = players.get_mut(&player_id).ok_or(GameError::PlayerNotFound)?;
        
        player.celestial_manager.remove_body(body_id)?;
        
        let event = GameEvent::CelestialBodyDestroyed {
            player_id,
            body_id,
        };
        
        if let Err(e) = self.event_sender.send(event).await {
            warn!("Failed to send event: {}", e);
        }
        
        Ok(())
    }
    
    /// アップグレード購入の処理
    async fn handle_purchase_upgrade(
        &mut self,
        player_id: PlayerId,
        upgrade_type: crate::game::resources::UpgradeType,
    ) -> Result<(), GameError> {
        let mut players = self.players.write().await;
        
        let player = players.get_mut(&player_id).ok_or(GameError::PlayerNotFound)?;
        
        player.resource_manager.apply_upgrade(upgrade_type)?;
        
        let event = GameEvent::UpgradePurchased {
            player_id,
            upgrade_type,
        };
        
        if let Err(e) = self.event_sender.send(event).await {
            warn!("Failed to send event: {}", e);
        }
        
        Ok(())
    }
    
    /// ゲーム保存の処理
    async fn handle_save_game(&mut self, player_id: PlayerId) -> Result<(), GameError> {
        let players = self.players.read().await;
        
        let player = players.get(&player_id).ok_or(GameError::PlayerNotFound)?;
        
        let snapshot = player.create_snapshot(self.current_tick);
        self.persistence_manager.save_snapshot(snapshot).await?;
        
        let event = GameEvent::GameSaved {
            player_id,
            tick: self.current_tick,
        };
        
        if let Err(e) = self.event_sender.send(event).await {
            warn!("Failed to send event: {}", e);
        }
        
        self.performance_metrics.save_operations += 1;
        
        Ok(())
    }
    
    /// ゲーム読み込みの処理
    async fn handle_load_game(&mut self, player_id: PlayerId) -> Result<(), GameError> {
        let snapshot = self.persistence_manager.load_snapshot(player_id, None).await?;
        
        if let Some(snapshot) = snapshot {
            let mut players = self.players.write().await;
            
            let player = players.entry(player_id).or_insert_with(|| {
                PlayerState::new(player_id, self.tick_duration.as_millis() as u64)
            });
            
            player.restore_from_snapshot(&snapshot)?;
            
            let event = GameEvent::GameLoaded {
                player_id,
                tick: snapshot.tick,
            };
            
            if let Err(e) = self.event_sender.send(event).await {
                warn!("Failed to send event: {}", e);
            }
            
            self.performance_metrics.load_operations += 1;
        }
        
        Ok(())
    }
    
    /// ゲーム状態取得の処理
    async fn handle_get_state(&self, player_id: PlayerId) -> Result<GameStateSnapshot, GameError> {
        let players = self.players.read().await;
        
        let player = players.get(&player_id).ok_or(GameError::PlayerNotFound)?;
        
        Ok(player.create_snapshot(self.current_tick))
    }
    
    /// 自動保存
    async fn auto_save(&mut self) -> Result<(), GameError> {
        let players = self.players.read().await;
        
        for (player_id, player_state) in players.iter() {
            if !player_state.active {
                continue;
            }
            
            let snapshot = player_state.create_snapshot(self.current_tick);
            
            if let Err(e) = self.persistence_manager.save_snapshot(snapshot).await {
                warn!("Failed to auto save for player {}: {}", player_id, e);
            }
        }
        
        Ok(())
    }
    
    /// クリーンアップ
    async fn cleanup(&mut self) -> Result<(), GameError> {
        // 非アクティブプレイヤーの削除
        let mut players = self.players.write().await;
        let inactive_cutoff = Utc::now() - chrono::Duration::hours(24);
        
        players.retain(|_, player_state| {
            player_state.active && player_state.last_activity > inactive_cutoff
        });
        
        // 古いデータのクリーンアップ
        if let Err(e) = self.persistence_manager.cleanup_old_data().await {
            warn!("Failed to cleanup old data: {}", e);
        }
        
        Ok(())
    }
    
    /// プレイヤーの追加
    pub async fn add_player(&mut self, player_id: PlayerId) -> Result<(), GameError> {
        let mut players = self.players.write().await;
        
        if players.len() >= self.config.max_players {
            return Err(GameError::PlayerLimitReached);
        }
        
        let player_state = PlayerState::new(player_id, self.tick_duration.as_millis() as u64);
        players.insert(player_id, player_state);
        
        Ok(())
    }
    
    /// プレイヤーの削除
    pub async fn remove_player(&mut self, player_id: PlayerId) -> Result<(), GameError> {
        let mut players = self.players.write().await;
        
        if let Some(player_state) = players.remove(&player_id) {
            // 最終保存
            let snapshot = player_state.create_snapshot(self.current_tick);
            if let Err(e) = self.persistence_manager.save_snapshot(snapshot).await {
                warn!("Failed to save final state for player {}: {}", player_id, e);
            }
        }
        
        Ok(())
    }
    
    /// パフォーマンス統計の取得
    pub fn get_performance_metrics(&self) -> &PerformanceMetrics {
        &self.performance_metrics
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;
    
    #[tokio::test]
    async fn test_player_state_update() {
        let player_id = Uuid::new_v4();
        let mut player_state = PlayerState::new(player_id, 50);
        
        let result = player_state.update(100).await;
        assert!(result.is_ok());
        
        let events = result.unwrap();
        // 初期状態では特別なイベントは発生しない
        assert_eq!(events.len(), 0);
    }
    
    #[tokio::test]
    async fn test_snapshot_creation_and_restoration() {
        let player_id = Uuid::new_v4();
        let mut player_state = PlayerState::new(player_id, 50);
        
        // 初期状態のスナップショット
        let snapshot = player_state.create_snapshot(1000);
        assert_eq!(snapshot.tick, 1000);
        assert_eq!(snapshot.player_id, player_id);
        
        // 状態の復元
        let result = player_state.restore_from_snapshot(&snapshot);
        assert!(result.is_ok());
        assert_eq!(player_state.last_save_tick, 1000);
    }
}