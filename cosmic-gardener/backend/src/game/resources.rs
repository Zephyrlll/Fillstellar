use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::GameError;

/// 固定小数点数（32.32フォーマット）
pub type Fixed = i64;
pub const FIXED_SCALE: i64 = 1 << 32;

/// 固定小数点数のヘルパー関数
pub mod fixed {
    use super::Fixed;
    
    pub fn from_f64(value: f64) -> Fixed {
        (value * super::FIXED_SCALE as f64) as Fixed
    }
    
    pub fn to_f64(value: Fixed) -> f64 {
        value as f64 / super::FIXED_SCALE as f64
    }
}

/// リソースの種類
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ResourceType {
    CosmicDust,
    Energy,
    OrganicMatter,
    Biomass,
    DarkMatter,
    ThoughtPoints,
}

impl ResourceType {
    pub fn all() -> Vec<Self> {
        vec![
            Self::CosmicDust,
            Self::Energy,
            Self::OrganicMatter,
            Self::Biomass,
            Self::DarkMatter,
            Self::ThoughtPoints,
        ]
    }
}

/// リソースの保存構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resources {
    pub cosmic_dust: u64,
    pub energy: u64,
    pub organic_matter: u64,
    pub biomass: u64,
    pub dark_matter: u64,
    pub thought_points: u64,
}

impl Default for Resources {
    fn default() -> Self {
        Self {
            cosmic_dust: 0,
            energy: 0,
            organic_matter: 0,
            biomass: 0,
            dark_matter: 0,
            thought_points: 0,
        }
    }
}

impl Resources {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn get(&self, resource_type: ResourceType) -> u64 {
        match resource_type {
            ResourceType::CosmicDust => self.cosmic_dust,
            ResourceType::Energy => self.energy,
            ResourceType::OrganicMatter => self.organic_matter,
            ResourceType::Biomass => self.biomass,
            ResourceType::DarkMatter => self.dark_matter,
            ResourceType::ThoughtPoints => self.thought_points,
        }
    }
    
    pub fn set(&mut self, resource_type: ResourceType, value: u64) {
        match resource_type {
            ResourceType::CosmicDust => self.cosmic_dust = value,
            ResourceType::Energy => self.energy = value,
            ResourceType::OrganicMatter => self.organic_matter = value,
            ResourceType::Biomass => self.biomass = value,
            ResourceType::DarkMatter => self.dark_matter = value,
            ResourceType::ThoughtPoints => self.thought_points = value,
        }
    }
    
    pub fn add(&mut self, resource_type: ResourceType, amount: u64) {
        let current = self.get(resource_type);
        self.set(resource_type, current.saturating_add(amount));
    }
    
    pub fn subtract(&mut self, resource_type: ResourceType, amount: u64) -> Result<(), GameError> {
        let current = self.get(resource_type);
        if current < amount {
            return Err(GameError::InsufficientResources);
        }
        self.set(resource_type, current - amount);
        Ok(())
    }
    
    pub fn can_afford(&self, cost: &Resources) -> bool {
        self.cosmic_dust >= cost.cosmic_dust &&
        self.energy >= cost.energy &&
        self.organic_matter >= cost.organic_matter &&
        self.biomass >= cost.biomass &&
        self.dark_matter >= cost.dark_matter &&
        self.thought_points >= cost.thought_points
    }
    
    pub fn spend(&mut self, cost: &Resources) -> Result<(), GameError> {
        if !self.can_afford(cost) {
            return Err(GameError::InsufficientResources);
        }
        
        self.cosmic_dust -= cost.cosmic_dust;
        self.energy -= cost.energy;
        self.organic_matter -= cost.organic_matter;
        self.biomass -= cost.biomass;
        self.dark_matter -= cost.dark_matter;
        self.thought_points -= cost.thought_points;
        
        Ok(())
    }
}

/// リソースの生産レート（固定小数点数）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionRates {
    pub dust_per_tick: Fixed,
    pub energy_per_tick: Fixed,
    pub organic_per_tick: Fixed,
    pub biomass_per_tick: Fixed,
    pub dark_per_tick: Fixed,
    pub thought_per_tick: Fixed,
}

impl Default for ProductionRates {
    fn default() -> Self {
        Self {
            dust_per_tick: 0,
            energy_per_tick: 0,
            organic_per_tick: 0,
            biomass_per_tick: 0,
            dark_per_tick: 0,
            thought_per_tick: 0,
        }
    }
}

impl ProductionRates {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn get(&self, resource_type: ResourceType) -> Fixed {
        match resource_type {
            ResourceType::CosmicDust => self.dust_per_tick,
            ResourceType::Energy => self.energy_per_tick,
            ResourceType::OrganicMatter => self.organic_per_tick,
            ResourceType::Biomass => self.biomass_per_tick,
            ResourceType::DarkMatter => self.dark_per_tick,
            ResourceType::ThoughtPoints => self.thought_per_tick,
        }
    }
    
    pub fn set(&mut self, resource_type: ResourceType, rate: Fixed) {
        match resource_type {
            ResourceType::CosmicDust => self.dust_per_tick = rate,
            ResourceType::Energy => self.energy_per_tick = rate,
            ResourceType::OrganicMatter => self.organic_per_tick = rate,
            ResourceType::Biomass => self.biomass_per_tick = rate,
            ResourceType::DarkMatter => self.dark_per_tick = rate,
            ResourceType::ThoughtPoints => self.thought_per_tick = rate,
        }
    }
    
    pub fn add(&mut self, resource_type: ResourceType, rate: Fixed) {
        let current = self.get(resource_type);
        self.set(resource_type, current + rate);
    }
}

/// リソースの累積値（小数点以下の精度を保持）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceAccumulators {
    pub dust: Fixed,
    pub energy: Fixed,
    pub organic: Fixed,
    pub biomass: Fixed,
    pub dark: Fixed,
    pub thought: Fixed,
}

impl Default for ResourceAccumulators {
    fn default() -> Self {
        Self {
            dust: 0,
            energy: 0,
            organic: 0,
            biomass: 0,
            dark: 0,
            thought: 0,
        }
    }
}

impl ResourceAccumulators {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn get(&self, resource_type: ResourceType) -> Fixed {
        match resource_type {
            ResourceType::CosmicDust => self.dust,
            ResourceType::Energy => self.energy,
            ResourceType::OrganicMatter => self.organic,
            ResourceType::Biomass => self.biomass,
            ResourceType::DarkMatter => self.dark,
            ResourceType::ThoughtPoints => self.thought,
        }
    }
    
    pub fn set(&mut self, resource_type: ResourceType, value: Fixed) {
        match resource_type {
            ResourceType::CosmicDust => self.dust = value,
            ResourceType::Energy => self.energy = value,
            ResourceType::OrganicMatter => self.organic = value,
            ResourceType::Biomass => self.biomass = value,
            ResourceType::DarkMatter => self.dark = value,
            ResourceType::ThoughtPoints => self.thought = value,
        }
    }
    
    pub fn add(&mut self, resource_type: ResourceType, amount: Fixed) {
        let current = self.get(resource_type);
        self.set(resource_type, current + amount);
    }
}

/// アップグレードの種類
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum UpgradeType {
    DustProduction,
    EnergyEfficiency,
    OrganicGrowth,
    BiomassConversion,
    DarkMatterCollection,
    ThoughtAcceleration,
}

impl UpgradeType {
    pub fn base_cost(&self) -> Resources {
        match self {
            Self::DustProduction => Resources {
                cosmic_dust: 100,
                ..Default::default()
            },
            Self::EnergyEfficiency => Resources {
                energy: 50,
                ..Default::default()
            },
            Self::OrganicGrowth => Resources {
                organic_matter: 25,
                ..Default::default()
            },
            Self::BiomassConversion => Resources {
                biomass: 10,
                ..Default::default()
            },
            Self::DarkMatterCollection => Resources {
                dark_matter: 5,
                ..Default::default()
            },
            Self::ThoughtAcceleration => Resources {
                thought_points: 1,
                ..Default::default()
            },
        }
    }
    
    pub fn cost_multiplier(&self) -> f64 {
        match self {
            Self::DustProduction => 1.5,
            Self::EnergyEfficiency => 1.8,
            Self::OrganicGrowth => 2.0,
            Self::BiomassConversion => 2.2,
            Self::DarkMatterCollection => 2.5,
            Self::ThoughtAcceleration => 3.0,
        }
    }
}

/// アップグレードレベル
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeLevels {
    levels: HashMap<UpgradeType, u32>,
}

impl Default for UpgradeLevels {
    fn default() -> Self {
        Self {
            levels: HashMap::new(),
        }
    }
}

impl UpgradeLevels {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn get_level(&self, upgrade_type: UpgradeType) -> u32 {
        self.levels.get(&upgrade_type).copied().unwrap_or(0)
    }
    
    pub fn set_level(&mut self, upgrade_type: UpgradeType, level: u32) {
        self.levels.insert(upgrade_type, level);
    }
    
    pub fn upgrade(&mut self, upgrade_type: UpgradeType) -> u32 {
        let current_level = self.get_level(upgrade_type);
        let new_level = current_level + 1;
        self.set_level(upgrade_type, new_level);
        new_level
    }
    
    pub fn calculate_cost(&self, upgrade_type: UpgradeType) -> Resources {
        let base_cost = upgrade_type.base_cost();
        let current_level = self.get_level(upgrade_type);
        let multiplier = upgrade_type.cost_multiplier().powi(current_level as i32);
        
        Resources {
            cosmic_dust: (base_cost.cosmic_dust as f64 * multiplier) as u64,
            energy: (base_cost.energy as f64 * multiplier) as u64,
            organic_matter: (base_cost.organic_matter as f64 * multiplier) as u64,
            biomass: (base_cost.biomass as f64 * multiplier) as u64,
            dark_matter: (base_cost.dark_matter as f64 * multiplier) as u64,
            thought_points: (base_cost.thought_points as f64 * multiplier) as u64,
        }
    }
}

/// ゲーム状態の前方宣言
pub struct GameState {
    pub resources: Resources,
    pub production_rates: ProductionRates,
    pub accumulators: ResourceAccumulators,
    pub upgrade_levels: UpgradeLevels,
    pub last_update: DateTime<Utc>,
}

/// リソース管理システム
pub struct ResourceManager {
    game_state: GameState,
    tick_duration_ms: u64,
}

impl ResourceManager {
    pub fn new(tick_duration_ms: u64) -> Self {
        Self {
            game_state: GameState {
                resources: Resources::new(),
                production_rates: ProductionRates::new(),
                accumulators: ResourceAccumulators::new(),
                upgrade_levels: UpgradeLevels::new(),
                last_update: Utc::now(),
            },
            tick_duration_ms,
        }
    }
    
    /// 生産レートの計算
    pub fn calculate_production_rates(&self, game_state: &GameState) -> ProductionRates {
        let mut rates = ProductionRates::new();
        
        // ベース生産率
        rates.dust_per_tick = fixed::from_f64(1.0);
        
        // アップグレードボーナス
        let dust_upgrade = game_state.upgrade_levels.get_level(UpgradeType::DustProduction);
        let dust_multiplier = 1.0 + (dust_upgrade as f64 * 0.5);
        rates.dust_per_tick = fixed::from_f64(fixed::to_f64(rates.dust_per_tick) * dust_multiplier);
        
        let energy_upgrade = game_state.upgrade_levels.get_level(UpgradeType::EnergyEfficiency);
        let energy_multiplier = 1.0 + (energy_upgrade as f64 * 0.3);
        rates.energy_per_tick = fixed::from_f64(0.5 * energy_multiplier);
        
        let organic_upgrade = game_state.upgrade_levels.get_level(UpgradeType::OrganicGrowth);
        let organic_multiplier = 1.0 + (organic_upgrade as f64 * 0.2);
        rates.organic_per_tick = fixed::from_f64(0.1 * organic_multiplier);
        
        let biomass_upgrade = game_state.upgrade_levels.get_level(UpgradeType::BiomassConversion);
        let biomass_multiplier = 1.0 + (biomass_upgrade as f64 * 0.15);
        rates.biomass_per_tick = fixed::from_f64(0.05 * biomass_multiplier);
        
        let dark_upgrade = game_state.upgrade_levels.get_level(UpgradeType::DarkMatterCollection);
        let dark_multiplier = 1.0 + (dark_upgrade as f64 * 0.1);
        rates.dark_per_tick = fixed::from_f64(0.01 * dark_multiplier);
        
        let thought_upgrade = game_state.upgrade_levels.get_level(UpgradeType::ThoughtAcceleration);
        let thought_multiplier = 1.0 + (thought_upgrade as f64 * 0.05);
        rates.thought_per_tick = fixed::from_f64(0.001 * thought_multiplier);
        
        rates
    }
    
    /// アップグレードの適用
    pub fn apply_upgrade(&mut self, upgrade_type: UpgradeType) -> Result<(), GameError> {
        let cost = self.game_state.upgrade_levels.calculate_cost(upgrade_type);
        
        // コストの検証
        if !self.game_state.resources.can_afford(&cost) {
            return Err(GameError::InsufficientResources);
        }
        
        // リソースの消費
        self.game_state.resources.spend(&cost)?;
        
        // アップグレード適用
        self.game_state.upgrade_levels.upgrade(upgrade_type);
        
        // 生産レートの再計算
        self.game_state.production_rates = self.calculate_production_rates(&self.game_state);
        
        Ok(())
    }
    
    /// リソースの蓄積処理
    pub fn accumulate_resources(&mut self, delta_time_ms: u64) {
        let time_factor = delta_time_ms as f64 / self.tick_duration_ms as f64;
        
        for resource_type in ResourceType::all() {
            let rate = self.game_state.production_rates.get(resource_type);
            let production = fixed::from_f64(fixed::to_f64(rate) * time_factor);
            
            // 累積値に加算
            self.game_state.accumulators.add(resource_type, production);
            
            // 整数部分をリソースに追加
            let accumulated = self.game_state.accumulators.get(resource_type);
            let whole_amount = accumulated / FIXED_SCALE;
            let remainder = accumulated % FIXED_SCALE;
            
            if whole_amount > 0 {
                self.game_state.resources.add(resource_type, whole_amount as u64);
                self.game_state.accumulators.set(resource_type, remainder);
            }
        }
        
        self.game_state.last_update = Utc::now();
    }
    
    /// ゲーム状態の取得
    pub fn get_game_state(&self) -> &GameState {
        &self.game_state
    }
    
    /// ゲーム状態の設定
    pub fn set_game_state(&mut self, state: GameState) {
        self.game_state = state;
    }
    
    /// リソースの取得
    pub fn get_resources(&self) -> &Resources {
        &self.game_state.resources
    }
    
    /// リソースの可変参照取得
    pub fn get_resources_mut(&mut self) -> &mut Resources {
        &mut self.game_state.resources
    }
    
    /// リソースの検証
    pub fn validate_resources(&self, resources: &Resources) -> Result<(), GameError> {
        const MAX_RESOURCE_VALUE: u64 = u64::MAX / 2; // オーバーフロー防止
        
        if resources.cosmic_dust > MAX_RESOURCE_VALUE ||
           resources.energy > MAX_RESOURCE_VALUE ||
           resources.organic_matter > MAX_RESOURCE_VALUE ||
           resources.biomass > MAX_RESOURCE_VALUE ||
           resources.dark_matter > MAX_RESOURCE_VALUE ||
           resources.thought_points > MAX_RESOURCE_VALUE {
            return Err(GameError::InvalidResourceValue);
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_fixed_point_conversion() {
        let value = 123.456;
        let fixed = fixed::from_f64(value);
        let converted = fixed::to_f64(fixed);
        assert!((value - converted).abs() < 0.0001);
    }
    
    #[test]
    fn test_resources_can_afford() {
        let mut resources = Resources::new();
        resources.cosmic_dust = 100;
        resources.energy = 50;
        
        let cost = Resources {
            cosmic_dust: 50,
            energy: 25,
            ..Default::default()
        };
        
        assert!(resources.can_afford(&cost));
        
        let expensive_cost = Resources {
            cosmic_dust: 150,
            ..Default::default()
        };
        
        assert!(!resources.can_afford(&expensive_cost));
    }
    
    #[test]
    fn test_upgrade_cost_calculation() {
        let mut upgrades = UpgradeLevels::new();
        
        // レベル0の場合
        let cost_0 = upgrades.calculate_cost(UpgradeType::DustProduction);
        assert_eq!(cost_0.cosmic_dust, 100);
        
        // レベル1の場合
        upgrades.upgrade(UpgradeType::DustProduction);
        let cost_1 = upgrades.calculate_cost(UpgradeType::DustProduction);
        assert_eq!(cost_1.cosmic_dust, 150); // 100 * 1.5
    }
    
    #[test]
    fn test_resource_accumulation() {
        let mut manager = ResourceManager::new(50); // 50msティック
        
        // 生産レート設定
        manager.game_state.production_rates.dust_per_tick = fixed::from_f64(1.0);
        
        // 100ms分の蓄積（2ティック分）
        manager.accumulate_resources(100);
        
        // 2つのダストが生成されるはず
        assert_eq!(manager.game_state.resources.cosmic_dust, 2);
    }
}