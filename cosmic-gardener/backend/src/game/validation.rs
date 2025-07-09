use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::GameError;
use crate::game::resources::{Resources, ResourceType, Fixed, fixed};
use crate::game::celestial_bodies::{CelestialBody, CelestialType, BodyId, Vec3Fixed};

/// プレイヤーID
pub type PlayerId = Uuid;

/// バリデーションエラー
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Insufficient resources: {0}")]
    InsufficientResources(String),
    
    #[error("Invalid resource value")]
    InvalidResourceValue,
    
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
    
    #[error("Body limit reached")]
    BodyLimitReached,
    
    #[error("Position out of bounds")]
    OutOfBounds,
    
    #[error("Objects too close")]
    TooClose,
    
    #[error("Invalid velocity")]
    InvalidVelocity,
    
    #[error("Invalid mass")]
    InvalidMass,
    
    #[error("Impossible state transition")]
    ImpossibleStateTransition,
    
    #[error("Suspicious activity detected")]
    SuspiciousActivity,
    
    #[error("Energy conservation violated")]
    EnergyConservationViolated,
}

/// 違反の種類
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ViolationType {
    MinorDesync,
    RateLimit,
    ImpossibleState,
    ConfirmedCheating,
}

/// プレイヤーのアクション履歴
#[derive(Debug, Clone)]
pub struct ActionHistory {
    pub action_type: ActionType,
    pub timestamp: DateTime<Utc>,
    pub position: Option<Vec3Fixed>,
    pub resource_change: Option<Resources>,
}

/// アクションタイプ
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionType {
    CreateBody,
    DeleteBody,
    ResourceSpend,
    ResourceGain,
    Upgrade,
    Move,
}

/// 作成履歴
#[derive(Debug, Clone)]
pub struct CreationHistory {
    pub timestamps: VecDeque<DateTime<Utc>>,
    pub burst_count: u32,
    pub total_today: u32,
    pub last_reset: DateTime<Utc>,
}

impl CreationHistory {
    pub fn new() -> Self {
        Self {
            timestamps: VecDeque::new(),
            burst_count: 0,
            total_today: 0,
            last_reset: Utc::now(),
        }
    }
}

/// プレイヤーの行動パターン
#[derive(Debug, Clone)]
pub struct PlayerPattern {
    pub avg_apm: f32, // Actions per minute
    pub creation_distribution: HashMap<CelestialType, u32>,
    pub position_heatmap: HashMap<(i32, i32, i32), u32>,
    pub suspicious_score: f32,
    pub last_action: Option<DateTime<Utc>>,
    pub action_intervals: VecDeque<Duration>,
}

impl PlayerPattern {
    pub fn new() -> Self {
        Self {
            avg_apm: 0.0,
            creation_distribution: HashMap::new(),
            position_heatmap: HashMap::new(),
            suspicious_score: 0.0,
            last_action: None,
            action_intervals: VecDeque::new(),
        }
    }
    
    /// APMの更新
    pub fn update_apm(&mut self, timestamp: DateTime<Utc>) {
        if let Some(last_action) = self.last_action {
            let interval = timestamp.signed_duration_since(last_action);
            if let Ok(duration) = interval.to_std() {
                self.action_intervals.push_back(duration);
                if self.action_intervals.len() > 100 {
                    self.action_intervals.pop_front();
                }
                
                // 平均APMを計算
                let total_time: Duration = self.action_intervals.iter().sum();
                if !total_time.is_zero() {
                    self.avg_apm = (self.action_intervals.len() as f32 * 60.0) / total_time.as_secs_f32();
                }
            }
        }
        self.last_action = Some(timestamp);
    }
    
    /// 位置の記録
    pub fn record_position(&mut self, position: Vec3Fixed) {
        let grid_pos = (
            (fixed::to_f64(position.x) / 100.0) as i32,
            (fixed::to_f64(position.y) / 100.0) as i32,
            (fixed::to_f64(position.z) / 100.0) as i32,
        );
        
        *self.position_heatmap.entry(grid_pos).or_insert(0) += 1;
    }
    
    /// 規則性の検出
    pub fn detect_regularity(&self) -> bool {
        if self.action_intervals.len() < 10 {
            return false;
        }
        
        // 間隔の標準偏差を計算
        let mean: f32 = self.action_intervals.iter().map(|d| d.as_secs_f32()).sum::<f32>() / self.action_intervals.len() as f32;
        let variance: f32 = self.action_intervals.iter()
            .map(|d| (d.as_secs_f32() - mean).powi(2))
            .sum::<f32>() / self.action_intervals.len() as f32;
        
        let std_dev = variance.sqrt();
        
        // 標準偏差が非常に小さい場合は規則的
        std_dev < 0.1 && mean > 0.1
    }
    
    /// 異常な精度の検出
    pub fn has_suspicious_precision(&self, position: Vec3Fixed) -> bool {
        // 座標の小数点以下が不自然に規則的
        let x_frac = fixed::to_f64(position.x) % 1.0;
        let y_frac = fixed::to_f64(position.y) % 1.0;
        let z_frac = fixed::to_f64(position.z) % 1.0;
        
        // 完全に整数値または0.5など単純な値
        (x_frac == 0.0 || x_frac == 0.5) &&
        (y_frac == 0.0 || y_frac == 0.5) &&
        (z_frac == 0.0 || z_frac == 0.5)
    }
}

/// レート制限設定
#[derive(Debug, Clone)]
pub struct RateLimit {
    pub max_per_minute: u32,
    pub max_per_hour: u32,
    pub max_per_day: u32,
    pub burst_size: u32,
}

impl Default for RateLimit {
    fn default() -> Self {
        Self {
            max_per_minute: 10,
            max_per_hour: 300,
            max_per_day: 1000,
            burst_size: 3,
        }
    }
}

/// バリデーションエンジン
pub struct ValidationEngine {
    creation_history: HashMap<PlayerId, CreationHistory>,
    player_patterns: HashMap<PlayerId, PlayerPattern>,
    rate_limits: RateLimit,
    max_resource_value: u64,
    max_velocity: Fixed,
    max_position: Fixed,
    energy_tolerance: Fixed,
}

impl ValidationEngine {
    pub fn new() -> Self {
        Self {
            creation_history: HashMap::new(),
            player_patterns: HashMap::new(),
            rate_limits: RateLimit::default(),
            max_resource_value: u64::MAX / 2,
            max_velocity: fixed::from_f64(299792458.0 * 0.1), // 光速の10%
            max_position: fixed::from_f64(100000.0),
            energy_tolerance: fixed::from_f64(0.001),
        }
    }
    
    /// リソース検証
    pub fn validate_resources(&self, resources: &Resources) -> Result<(), ValidationError> {
        for resource_type in ResourceType::all() {
            let value = resources.get(resource_type);
            if value > self.max_resource_value {
                return Err(ValidationError::InvalidResourceValue);
            }
        }
        Ok(())
    }
    
    /// リソース支出の検証
    pub fn validate_resource_spending(&self, current: &Resources, cost: &Resources) -> Result<(), ValidationError> {
        for resource_type in ResourceType::all() {
            let current_value = current.get(resource_type);
            let cost_value = cost.get(resource_type);
            
            if current_value < cost_value {
                return Err(ValidationError::InsufficientResources(format!("{:?}", resource_type)));
            }
        }
        Ok(())
    }
    
    /// 天体作成の検証
    pub fn validate_body_creation(
        &mut self,
        player_id: PlayerId,
        body_type: &CelestialType,
        position: &Vec3Fixed,
        existing_bodies: &HashMap<BodyId, CelestialBody>,
    ) -> Result<(), ValidationError> {
        // レート制限チェック
        self.check_creation_rate_limit(player_id)?;
        
        // 位置の検証
        self.validate_position(position, existing_bodies)?;
        
        // 行動パターンの記録
        self.record_action(player_id, ActionType::CreateBody, Some(*position), None);
        
        Ok(())
    }
    
    /// 位置の検証
    fn validate_position(&self, position: &Vec3Fixed, existing_bodies: &HashMap<BodyId, CelestialBody>) -> Result<(), ValidationError> {
        // 境界チェック
        if position.magnitude() > self.max_position {
            return Err(ValidationError::OutOfBounds);
        }
        
        // 最小分離距離チェック
        const MIN_SEPARATION: f64 = 10.0;
        for body in existing_bodies.values() {
            let distance = (position - body.physics.position).magnitude();
            let min_dist = body.physics.radius + fixed::from_f64(MIN_SEPARATION);
            if distance < min_dist {
                return Err(ValidationError::TooClose);
            }
        }
        
        Ok(())
    }
    
    /// 速度の検証
    pub fn validate_velocity(&self, velocity: &Vec3Fixed, mass: Fixed) -> Result<(), ValidationError> {
        if velocity.magnitude() > self.max_velocity {
            return Err(ValidationError::InvalidVelocity);
        }
        
        // 質量が大きいほど速度制限が厳しい
        let mass_factor = fixed::to_f64(mass) / 1000.0;
        let adjusted_max = fixed::from_f64(fixed::to_f64(self.max_velocity) / (1.0 + mass_factor));
        
        if velocity.magnitude() > adjusted_max {
            return Err(ValidationError::InvalidVelocity);
        }
        
        Ok(())
    }
    
    /// 質量の検証
    pub fn validate_mass(&self, mass: Fixed, body_type: &CelestialType) -> Result<(), ValidationError> {
        let (min_mass, max_mass) = match body_type {
            CelestialType::Star(_) => (fixed::from_f64(1.989e30 * 0.1), fixed::from_f64(1.989e30 * 100.0)),
            CelestialType::Planet(_) => (fixed::from_f64(5.972e24 * 0.1), fixed::from_f64(5.972e24 * 300.0)),
            CelestialType::BlackHole(_) => (fixed::from_f64(1.989e30 * 3.0), fixed::from_f64(1.989e30 * 1000.0)),
            _ => (fixed::from_f64(1.0), fixed::from_f64(5.972e24)),
        };
        
        if mass < min_mass || mass > max_mass {
            return Err(ValidationError::InvalidMass);
        }
        
        Ok(())
    }
    
    /// 作成レート制限チェック
    fn check_creation_rate_limit(&mut self, player_id: PlayerId) -> Result<(), ValidationError> {
        let now = Utc::now();
        let history = self.creation_history.entry(player_id).or_insert_with(CreationHistory::new);
        
        // 日次リセット
        if now.signed_duration_since(history.last_reset).num_days() >= 1 {
            history.total_today = 0;
            history.last_reset = now;
        }
        
        // 1分間の制限
        history.timestamps.retain(|&timestamp| {
            now.signed_duration_since(timestamp).num_seconds() < 60
        });
        
        if history.timestamps.len() >= self.rate_limits.max_per_minute as usize {
            return Err(ValidationError::RateLimitExceeded);
        }
        
        // バースト制限
        let recent_actions = history.timestamps.iter()
            .filter(|&&timestamp| now.signed_duration_since(timestamp).num_seconds() < 10)
            .count();
        
        if recent_actions >= self.rate_limits.burst_size as usize {
            return Err(ValidationError::RateLimitExceeded);
        }
        
        // 日次制限
        if history.total_today >= self.rate_limits.max_per_day {
            return Err(ValidationError::RateLimitExceeded);
        }
        
        // 記録の更新
        history.timestamps.push_back(now);
        history.total_today += 1;
        
        Ok(())
    }
    
    /// 行動の記録
    fn record_action(&mut self, player_id: PlayerId, action_type: ActionType, position: Option<Vec3Fixed>, resource_change: Option<Resources>) {
        let now = Utc::now();
        let pattern = self.player_patterns.entry(player_id).or_insert_with(PlayerPattern::new);
        
        // APMの更新
        pattern.update_apm(now);
        
        // 位置の記録
        if let Some(pos) = position {
            pattern.record_position(pos);
            
            // 異常な精度の検出
            if pattern.has_suspicious_precision(pos) {
                pattern.suspicious_score += 5.0;
            }
        }
        
        // 作成分布の記録
        if action_type == ActionType::CreateBody {
            // 天体タイプの分布を記録（実際の実装では引数として渡す）
        }
        
        // 履歴の追加
        let action = ActionHistory {
            action_type,
            timestamp: now,
            position,
            resource_change,
        };
    }
    
    /// 異常検出
    pub fn detect_anomalies(&mut self, player_id: PlayerId) -> Vec<ValidationError> {
        let mut anomalies = Vec::new();
        
        if let Some(pattern) = self.player_patterns.get_mut(&player_id) {
            // 超人的APMの検出
            if pattern.avg_apm > 300.0 {
                pattern.suspicious_score += 10.0;
                anomalies.push(ValidationError::SuspiciousActivity);
            }
            
            // 行動の規則性検出
            if pattern.detect_regularity() {
                pattern.suspicious_score += 15.0;
                anomalies.push(ValidationError::SuspiciousActivity);
            }
            
            // 疑わしいスコアの閾値チェック
            if pattern.suspicious_score > 50.0 {
                anomalies.push(ValidationError::SuspiciousActivity);
            }
        }
        
        anomalies
    }
    
    /// 状態遷移の検証
    pub fn validate_state_transition(
        &self,
        old_resources: &Resources,
        new_resources: &Resources,
        delta_time: Duration,
        max_production_rate: &Resources,
    ) -> Result<(), ValidationError> {
        for resource_type in ResourceType::all() {
            let old_value = old_resources.get(resource_type);
            let new_value = new_resources.get(resource_type);
            let max_rate = max_production_rate.get(resource_type);
            
            if new_value > old_value {
                // 生産量の上限チェック
                let time_factor = delta_time.as_secs_f64();
                let max_increase = (max_rate as f64 * time_factor) as u64;
                
                if new_value - old_value > max_increase {
                    return Err(ValidationError::ImpossibleStateTransition);
                }
            }
        }
        
        Ok(())
    }
    
    /// エネルギー保存の検証
    pub fn validate_energy_conservation(&self, old_energy: Fixed, new_energy: Fixed) -> Result<(), ValidationError> {
        let energy_diff = (new_energy - old_energy).abs();
        if energy_diff > self.energy_tolerance {
            return Err(ValidationError::EnergyConservationViolated);
        }
        Ok(())
    }
    
    /// チェックサムの生成
    pub fn generate_checksum(&self, resources: &Resources, bodies: &HashMap<BodyId, CelestialBody>) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        resources.cosmic_dust.hash(&mut hasher);
        resources.energy.hash(&mut hasher);
        resources.organic_matter.hash(&mut hasher);
        resources.biomass.hash(&mut hasher);
        resources.dark_matter.hash(&mut hasher);
        resources.thought_points.hash(&mut hasher);
        
        // 天体のハッシュも含める
        for (id, body) in bodies {
            id.hash(&mut hasher);
            body.physics.mass.hash(&mut hasher);
            body.physics.position.x.hash(&mut hasher);
            body.physics.position.y.hash(&mut hasher);
            body.physics.position.z.hash(&mut hasher);
        }
        
        hasher.finish()
    }
    
    /// チェックサムの検証
    pub fn validate_checksum(&self, expected: u64, actual: u64) -> Result<(), ValidationError> {
        if expected != actual {
            return Err(ValidationError::ImpossibleStateTransition);
        }
        Ok(())
    }
    
    /// 設定の更新
    pub fn update_rate_limits(&mut self, limits: RateLimit) {
        self.rate_limits = limits;
    }
    
    /// プレイヤー統計の取得
    pub fn get_player_stats(&self, player_id: PlayerId) -> Option<&PlayerPattern> {
        self.player_patterns.get(&player_id)
    }
    
    /// 疑わしいスコアのリセット
    pub fn reset_suspicious_score(&mut self, player_id: PlayerId) {
        if let Some(pattern) = self.player_patterns.get_mut(&player_id) {
            pattern.suspicious_score = 0.0;
        }
    }
}

/// ペナルティ管理
pub struct PenaltyManager {
    violations: HashMap<PlayerId, Vec<(ViolationType, DateTime<Utc>)>>,
    banned_players: HashMap<PlayerId, DateTime<Utc>>,
}

impl PenaltyManager {
    pub fn new() -> Self {
        Self {
            violations: HashMap::new(),
            banned_players: HashMap::new(),
        }
    }
    
    /// 違反の記録
    pub fn record_violation(&mut self, player_id: PlayerId, violation_type: ViolationType) {
        let now = Utc::now();
        self.violations.entry(player_id)
            .or_insert_with(Vec::new)
            .push((violation_type, now));
    }
    
    /// ペナルティの適用
    pub fn apply_penalty(&mut self, player_id: PlayerId, violation_type: ViolationType) -> Option<Duration> {
        match violation_type {
            ViolationType::MinorDesync => {
                // 警告のみ
                None
            },
            ViolationType::RateLimit => {
                // 5分間のクールダウン
                Some(Duration::from_secs(300))
            },
            ViolationType::ImpossibleState => {
                // 1時間の一時停止
                Some(Duration::from_secs(3600))
            },
            ViolationType::ConfirmedCheating => {
                // 永久停止
                self.banned_players.insert(player_id, Utc::now());
                None
            },
        }
    }
    
    /// 停止状態の確認
    pub fn is_banned(&self, player_id: PlayerId) -> bool {
        self.banned_players.contains_key(&player_id)
    }
    
    /// 違反履歴の取得
    pub fn get_violations(&self, player_id: PlayerId) -> Option<&Vec<(ViolationType, DateTime<Utc>)>> {
        self.violations.get(&player_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_resource_validation() {
        let validator = ValidationEngine::new();
        
        let valid_resources = Resources {
            cosmic_dust: 1000,
            energy: 500,
            ..Default::default()
        };
        
        assert!(validator.validate_resources(&valid_resources).is_ok());
        
        let invalid_resources = Resources {
            cosmic_dust: u64::MAX,
            ..Default::default()
        };
        
        assert!(validator.validate_resources(&invalid_resources).is_err());
    }
    
    #[test]
    fn test_rate_limiting() {
        let mut validator = ValidationEngine::new();
        let player_id = Uuid::new_v4();
        
        // 最初の作成は成功
        for _ in 0..10 {
            assert!(validator.check_creation_rate_limit(player_id).is_ok());
        }
        
        // 制限を超える
        assert!(validator.check_creation_rate_limit(player_id).is_err());
    }
    
    #[test]
    fn test_position_validation() {
        let validator = ValidationEngine::new();
        let bodies = HashMap::new();
        
        // 境界内の位置
        let valid_pos = Vec3Fixed::new(fixed::from_f64(100.0), fixed::from_f64(200.0), fixed::from_f64(300.0));
        assert!(validator.validate_position(&valid_pos, &bodies).is_ok());
        
        // 境界外の位置
        let invalid_pos = Vec3Fixed::new(fixed::from_f64(200000.0), fixed::from_f64(0.0), fixed::from_f64(0.0));
        assert!(validator.validate_position(&invalid_pos, &bodies).is_err());
    }
    
    #[test]
    fn test_pattern_detection() {
        let mut pattern = PlayerPattern::new();
        
        // 規則的な間隔でアクションを記録
        let base_time = Utc::now();
        for i in 0..20 {
            let time = base_time + chrono::Duration::seconds(i * 5); // 5秒間隔
            pattern.update_apm(time);
        }
        
        // 規則性が検出されるはず
        assert!(pattern.detect_regularity());
        
        // 異常な精度の検出
        let precise_pos = Vec3Fixed::new(fixed::from_f64(100.0), fixed::from_f64(200.0), fixed::from_f64(300.0));
        assert!(pattern.has_suspicious_precision(precise_pos));
    }
    
    #[test]
    fn test_penalty_system() {
        let mut manager = PenaltyManager::new();
        let player_id = Uuid::new_v4();
        
        // 違反の記録
        manager.record_violation(player_id, ViolationType::RateLimit);
        
        // ペナルティの適用
        let penalty = manager.apply_penalty(player_id, ViolationType::RateLimit);
        assert!(penalty.is_some());
        assert_eq!(penalty.unwrap().as_secs(), 300);
        
        // 永久停止の確認
        manager.apply_penalty(player_id, ViolationType::ConfirmedCheating);
        assert!(manager.is_banned(player_id));
    }
}