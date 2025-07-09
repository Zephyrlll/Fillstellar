use std::collections::HashMap;
use chrono::{DateTime, Utc};
use nalgebra::{Vector3, Point3};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::GameError;
use crate::game::resources::{Resources, ProductionRates, ResourceType, Fixed, fixed};

/// 天体のID
pub type BodyId = Uuid;

/// 3D位置ベクトル（固定小数点）
pub type Vec3Fixed = Vector3<Fixed>;

/// 3D位置座標（固定小数点）
pub type Point3Fixed = Point3<Fixed>;

/// 天体の種類
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CelestialType {
    Star(StarData),
    Planet(PlanetData),
    BlackHole(BlackHoleData),
    Asteroid,
    Comet,
    Moon,
    DwarfPlanet,
}

/// 恒星データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StarData {
    pub spectral_type: SpectralType,
    pub temperature: u32,
    pub luminosity: Fixed,
    pub age: u64,
    pub lifespan: u64,
}

/// スペクトル型
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SpectralType {
    O, B, A, F, G, K, M
}

impl SpectralType {
    pub fn temperature_range(&self) -> (u32, u32) {
        match self {
            SpectralType::O => (30000, 60000),
            SpectralType::B => (10000, 30000),
            SpectralType::A => (7500, 10000),
            SpectralType::F => (6000, 7500),
            SpectralType::G => (5200, 6000),
            SpectralType::K => (3700, 5200),
            SpectralType::M => (2400, 3700),
        }
    }
    
    pub fn mass_range(&self) -> (f64, f64) {
        match self {
            SpectralType::O => (15.0, 90.0),
            SpectralType::B => (2.1, 16.0),
            SpectralType::A => (1.4, 2.1),
            SpectralType::F => (1.04, 1.4),
            SpectralType::G => (0.8, 1.04),
            SpectralType::K => (0.45, 0.8),
            SpectralType::M => (0.08, 0.45),
        }
    }
}

/// 惑星データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanetData {
    pub planet_type: PlanetType,
    pub atmosphere: AtmosphereType,
    pub water_coverage: u8, // 0-100
    pub temperature_range: (i16, i16),
    pub habitability: u8, // 0-100
}

/// 惑星タイプ
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlanetType {
    Rocky,
    GasGiant,
    IceGiant,
    Lava,
    Desert,
    Ocean,
    Frozen,
}

/// 大気タイプ
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AtmosphereType {
    None,
    Thin,
    Thick,
    Toxic,
    Oxygen,
    Methane,
    Co2,
}

/// ブラックホールデータ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlackHoleData {
    pub schwarzschild_radius: Fixed,
    pub accretion_rate: Fixed,
    pub formation_time: DateTime<Utc>,
}

/// 物理データ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicsData {
    pub position: Vec3Fixed,
    pub velocity: Vec3Fixed,
    pub mass: Fixed,
    pub radius: Fixed,
    pub angular_velocity: Vec3Fixed,
}

impl PhysicsData {
    pub fn new(position: Vec3Fixed, mass: Fixed, radius: Fixed) -> Self {
        Self {
            position,
            velocity: Vec3Fixed::zeros(),
            mass,
            radius,
            angular_velocity: Vec3Fixed::zeros(),
        }
    }
}

/// 生命段階
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LifeStage {
    None,
    Microbial {
        diversity: u32,
        evolution_pressure: Fixed,
    },
    Plant {
        coverage: u8, // 0-100
        oxygen_production: Fixed,
    },
    Animal {
        species_count: u32,
        food_chain_complexity: u8,
    },
    Intelligent {
        tech_level: u32,
        unity: u8, // 0-100
        knowledge_rate: Fixed,
    },
}

/// ライフサイクルデータ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleData {
    pub age: u64, // ティック数
    pub lifespan: Option<u64>,
    pub life_stage: LifeStage,
    pub population: u64,
    pub evolution_timer: u64,
}

impl LifecycleData {
    pub fn new() -> Self {
        Self {
            age: 0,
            lifespan: None,
            life_stage: LifeStage::None,
            population: 0,
            evolution_timer: 0,
        }
    }
}

/// 天体のリソース生成
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BodyResources {
    pub production_rates: ProductionRates,
    pub resource_multiplier: Fixed,
    pub efficiency: Fixed,
}

impl BodyResources {
    pub fn new() -> Self {
        Self {
            production_rates: ProductionRates::new(),
            resource_multiplier: fixed::from_f64(1.0),
            efficiency: fixed::from_f64(1.0),
        }
    }
}

/// 天体の構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CelestialBody {
    pub id: BodyId,
    pub body_type: CelestialType,
    pub physics: PhysicsData,
    pub lifecycle: LifecycleData,
    pub resources: BodyResources,
    pub created_at: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
}

impl CelestialBody {
    pub fn new(
        id: BodyId,
        body_type: CelestialType,
        position: Vec3Fixed,
        mass: Fixed,
        radius: Fixed,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            body_type,
            physics: PhysicsData::new(position, mass, radius),
            lifecycle: LifecycleData::new(),
            resources: BodyResources::new(),
            created_at: now,
            last_updated: now,
        }
    }
}

/// 天体作成の制限
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreationLimits {
    pub max_bodies: usize,
    pub max_bodies_per_type: HashMap<CelestialType, usize>,
    pub min_separation: Fixed,
    pub max_position: Fixed,
    pub creation_costs: HashMap<CelestialType, Resources>,
}

impl Default for CreationLimits {
    fn default() -> Self {
        let mut max_bodies_per_type = HashMap::new();
        max_bodies_per_type.insert(CelestialType::Star(StarData {
            spectral_type: SpectralType::G,
            temperature: 5778,
            luminosity: fixed::from_f64(1.0),
            age: 0,
            lifespan: 10_000_000,
        }), 50);
        max_bodies_per_type.insert(CelestialType::Planet(PlanetData {
            planet_type: PlanetType::Rocky,
            atmosphere: AtmosphereType::None,
            water_coverage: 0,
            temperature_range: (0, 0),
            habitability: 0,
        }), 200);
        max_bodies_per_type.insert(CelestialType::BlackHole(BlackHoleData {
            schwarzschild_radius: fixed::from_f64(1.0),
            accretion_rate: fixed::from_f64(0.1),
            formation_time: Utc::now(),
        }), 10);
        max_bodies_per_type.insert(CelestialType::Asteroid, 1000);
        max_bodies_per_type.insert(CelestialType::Comet, 1000);
        max_bodies_per_type.insert(CelestialType::Moon, 500);
        max_bodies_per_type.insert(CelestialType::DwarfPlanet, 100);
        
        let mut creation_costs = HashMap::new();
        creation_costs.insert(CelestialType::Asteroid, Resources {
            cosmic_dust: 100,
            ..Default::default()
        });
        creation_costs.insert(CelestialType::Comet, Resources {
            cosmic_dust: 500,
            ..Default::default()
        });
        creation_costs.insert(CelestialType::Moon, Resources {
            cosmic_dust: 1000,
            ..Default::default()
        });
        creation_costs.insert(CelestialType::DwarfPlanet, Resources {
            cosmic_dust: 2500,
            ..Default::default()
        });
        
        Self {
            max_bodies: 10000,
            max_bodies_per_type,
            min_separation: fixed::from_f64(10.0),
            max_position: fixed::from_f64(100000.0),
            creation_costs,
        }
    }
}

/// 天体管理システム
pub struct CelestialBodyManager {
    pub bodies: HashMap<BodyId, CelestialBody>,
    pub limits: CreationLimits,
    pub tick_duration_ms: u64,
}

impl CelestialBodyManager {
    pub fn new(tick_duration_ms: u64) -> Self {
        Self {
            bodies: HashMap::new(),
            limits: CreationLimits::default(),
            tick_duration_ms,
        }
    }
    
    /// 天体の作成
    pub fn create_body(
        &mut self,
        body_type: CelestialType,
        position: Vec3Fixed,
        resources: &mut Resources,
    ) -> Result<BodyId, GameError> {
        // 制限チェック
        self.validate_creation(&body_type, &position)?;
        
        // コストチェック
        if let Some(cost) = self.limits.creation_costs.get(&body_type) {
            if !resources.can_afford(cost) {
                return Err(GameError::InsufficientResources);
            }
            resources.spend(cost)?;
        }
        
        // 天体の作成
        let id = Uuid::new_v4();
        let (mass, radius) = self.calculate_body_properties(&body_type);
        
        let mut body = CelestialBody::new(id, body_type.clone(), position, mass, radius);
        
        // 初期化
        self.initialize_body(&mut body);
        
        self.bodies.insert(id, body);
        
        Ok(id)
    }
    
    /// 天体の削除
    pub fn remove_body(&mut self, id: BodyId) -> Result<(), GameError> {
        if self.bodies.remove(&id).is_some() {
            Ok(())
        } else {
            Err(GameError::BodyNotFound)
        }
    }
    
    /// 天体の取得
    pub fn get_body(&self, id: BodyId) -> Option<&CelestialBody> {
        self.bodies.get(&id)
    }
    
    /// 天体の更新
    pub fn update_body(&mut self, id: BodyId, mut updater: impl FnMut(&mut CelestialBody)) -> Result<(), GameError> {
        if let Some(body) = self.bodies.get_mut(&id) {
            updater(body);
            body.last_updated = Utc::now();
            Ok(())
        } else {
            Err(GameError::BodyNotFound)
        }
    }
    
    /// 生命システムの更新
    pub fn update_life_systems(&mut self, delta_time_ms: u64) {
        let time_factor = delta_time_ms as f64 / self.tick_duration_ms as f64;
        
        for body in self.bodies.values_mut() {
            body.lifecycle.age += delta_time_ms / self.tick_duration_ms;
            
            // 生命進化の更新
            if let CelestialType::Planet(planet_data) = &body.body_type {
                if planet_data.habitability > 50 {
                    self.update_life_evolution(body, time_factor);
                }
            }
            
            // リソース生成の更新
            self.update_resource_production(body, time_factor);
        }
    }
    
    /// 生命進化の更新
    fn update_life_evolution(&mut self, body: &mut CelestialBody, time_factor: f64) {
        body.lifecycle.evolution_timer += (time_factor * 1000.0) as u64;
        
        match &body.lifecycle.life_stage {
            LifeStage::None => {
                if body.lifecycle.evolution_timer > 1000 && body.lifecycle.population == 0 {
                    // 微生物の発生
                    body.lifecycle.life_stage = LifeStage::Microbial {
                        diversity: 1,
                        evolution_pressure: fixed::from_f64(0.1),
                    };
                    body.lifecycle.population = 1000;
                    body.lifecycle.evolution_timer = 0;
                }
            },
            LifeStage::Microbial { diversity, .. } => {
                // 人口成長
                body.lifecycle.population = (body.lifecycle.population as f64 * 1.01) as u64;
                
                // 植物への進化
                if body.lifecycle.evolution_timer > 5000 && body.lifecycle.population > 100000 {
                    body.lifecycle.life_stage = LifeStage::Plant {
                        coverage: 10,
                        oxygen_production: fixed::from_f64(0.1),
                    };
                    body.lifecycle.evolution_timer = 0;
                }
            },
            LifeStage::Plant { coverage, .. } => {
                // 人口成長
                body.lifecycle.population = (body.lifecycle.population as f64 * 1.05) as u64;
                
                // 動物への進化
                if body.lifecycle.evolution_timer > 10000 && body.lifecycle.population > 1000000 {
                    body.lifecycle.life_stage = LifeStage::Animal {
                        species_count: 10,
                        food_chain_complexity: 1,
                    };
                    body.lifecycle.evolution_timer = 0;
                }
            },
            LifeStage::Animal { species_count, .. } => {
                // 人口成長
                body.lifecycle.population = (body.lifecycle.population as f64 * 1.1) as u64;
                
                // 知的生命への進化
                if body.lifecycle.evolution_timer > 20000 && body.lifecycle.population > 10000000 {
                    body.lifecycle.life_stage = LifeStage::Intelligent {
                        tech_level: 1,
                        unity: 50,
                        knowledge_rate: fixed::from_f64(0.5),
                    };
                    body.lifecycle.evolution_timer = 0;
                }
            },
            LifeStage::Intelligent { tech_level, .. } => {
                // 人口成長（減速）
                body.lifecycle.population = (body.lifecycle.population as f64 * 1.02) as u64;
                
                // 技術進歩
                if body.lifecycle.evolution_timer > 30000 {
                    // 技術レベルアップのロジック
                    body.lifecycle.evolution_timer = 0;
                }
            },
        }
    }
    
    /// リソース生成の更新
    fn update_resource_production(&mut self, body: &mut CelestialBody, time_factor: f64) {
        match &body.body_type {
            CelestialType::Star(star_data) => {
                // 恒星からエネルギー生成
                let energy_rate = fixed::from_f64(fixed::to_f64(body.physics.mass) / 1000.0);
                body.resources.production_rates.energy_per_tick = energy_rate;
            },
            CelestialType::Planet(planet_data) => {
                // 惑星からの生命ベースリソース
                match &body.lifecycle.life_stage {
                    LifeStage::Plant { coverage, .. } => {
                        body.resources.production_rates.organic_per_tick = fixed::from_f64(0.5);
                        body.resources.production_rates.biomass_per_tick = fixed::from_f64(0.1);
                    },
                    LifeStage::Animal { .. } => {
                        body.resources.production_rates.organic_per_tick = fixed::from_f64(0.8);
                        body.resources.production_rates.biomass_per_tick = fixed::from_f64(0.3);
                    },
                    LifeStage::Intelligent { .. } => {
                        body.resources.production_rates.organic_per_tick = fixed::from_f64(1.0);
                        body.resources.production_rates.biomass_per_tick = fixed::from_f64(0.5);
                        let thought_rate = fixed::from_f64((body.lifecycle.population as f64 / 1000000.0) * 0.1);
                        body.resources.production_rates.thought_per_tick = thought_rate;
                    },
                    _ => {},
                }
            },
            CelestialType::Asteroid => {
                // 小惑星からダスト生成
                body.resources.production_rates.dust_per_tick = fixed::from_f64(0.5);
            },
            CelestialType::Comet => {
                // 彗星からダスト生成
                body.resources.production_rates.dust_per_tick = fixed::from_f64(0.5);
            },
            CelestialType::BlackHole(black_hole_data) => {
                // ブラックホールからダークマター生成
                let dark_rate = fixed::from_f64(fixed::to_f64(black_hole_data.accretion_rate) * 0.1);
                body.resources.production_rates.dark_per_tick = dark_rate;
            },
            _ => {},
        }
    }
    
    /// 作成の検証
    fn validate_creation(&self, body_type: &CelestialType, position: &Vec3Fixed) -> Result<(), GameError> {
        // 総数制限
        if self.bodies.len() >= self.limits.max_bodies {
            return Err(GameError::BodyLimitReached);
        }
        
        // 型別制限
        let type_key = std::mem::discriminant(body_type);
        let current_count = self.bodies.values()
            .filter(|b| std::mem::discriminant(&b.body_type) == type_key)
            .count();
        
        // 境界チェック
        if position.magnitude() > self.limits.max_position {
            return Err(GameError::OutOfBounds);
        }
        
        // 最小分離距離チェック
        for body in self.bodies.values() {
            let distance = (position - body.physics.position).magnitude();
            let min_distance = body.physics.radius + self.limits.min_separation;
            if distance < min_distance {
                return Err(GameError::TooClose);
            }
        }
        
        Ok(())
    }
    
    /// 天体プロパティの計算
    fn calculate_body_properties(&self, body_type: &CelestialType) -> (Fixed, Fixed) {
        match body_type {
            CelestialType::Star(star_data) => {
                let (min_mass, max_mass) = star_data.spectral_type.mass_range();
                let mass = fixed::from_f64(min_mass + (max_mass - min_mass) * 0.5);
                let radius = fixed::from_f64(fixed::to_f64(mass).sqrt() * 696340.0); // 太陽半径基準
                (mass, radius)
            },
            CelestialType::Planet(_) => {
                let mass = fixed::from_f64(5.972e24); // 地球質量
                let radius = fixed::from_f64(6371.0); // 地球半径
                (mass, radius)
            },
            CelestialType::BlackHole(_) => {
                let mass = fixed::from_f64(3.0 * 1.989e30); // 太陽質量の3倍
                let radius = fixed::from_f64(8.86); // シュヴァルツシルト半径
                (mass, radius)
            },
            CelestialType::Asteroid => {
                let mass = fixed::from_f64(1e15); // 1km級小惑星
                let radius = fixed::from_f64(0.5);
                (mass, radius)
            },
            CelestialType::Comet => {
                let mass = fixed::from_f64(1e12); // 典型的彗星
                let radius = fixed::from_f64(0.5);
                (mass, radius)
            },
            CelestialType::Moon => {
                let mass = fixed::from_f64(7.342e22); // 月質量
                let radius = fixed::from_f64(1737.4); // 月半径
                (mass, radius)
            },
            CelestialType::DwarfPlanet => {
                let mass = fixed::from_f64(1.309e22); // 冥王星質量
                let radius = fixed::from_f64(1188.3); // 冥王星半径
                (mass, radius)
            },
        }
    }
    
    /// 天体の初期化
    fn initialize_body(&self, body: &mut CelestialBody) {
        // 初期生命条件チェック
        if let CelestialType::Planet(planet_data) = &body.body_type {
            if planet_data.habitability > 30 {
                // 生命発生の可能性
                body.lifecycle.evolution_timer = 0;
            }
        }
        
        // 初期リソース生成設定
        match &body.body_type {
            CelestialType::Asteroid | CelestialType::Comet => {
                body.resources.production_rates.dust_per_tick = fixed::from_f64(0.5);
            },
            _ => {},
        }
    }
    
    /// 天体数の取得
    pub fn get_body_count(&self) -> usize {
        self.bodies.len()
    }
    
    /// 型別天体数の取得
    pub fn get_body_count_by_type(&self, body_type: &CelestialType) -> usize {
        let type_key = std::mem::discriminant(body_type);
        self.bodies.values()
            .filter(|b| std::mem::discriminant(&b.body_type) == type_key)
            .count()
    }
    
    /// 全天体の取得
    pub fn get_all_bodies(&self) -> &HashMap<BodyId, CelestialBody> {
        &self.bodies
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_spectral_type_ranges() {
        let g_type = SpectralType::G;
        let (min_temp, max_temp) = g_type.temperature_range();
        assert_eq!(min_temp, 5200);
        assert_eq!(max_temp, 6000);
        
        let (min_mass, max_mass) = g_type.mass_range();
        assert_eq!(min_mass, 0.8);
        assert_eq!(max_mass, 1.04);
    }
    
    #[test]
    fn test_body_creation() {
        let mut manager = CelestialBodyManager::new(50);
        let mut resources = Resources::new();
        resources.cosmic_dust = 1000;
        
        let position = Vec3Fixed::new(fixed::from_f64(10.0), fixed::from_f64(20.0), fixed::from_f64(30.0));
        let result = manager.create_body(CelestialType::Asteroid, position, &mut resources);
        
        assert!(result.is_ok());
        let body_id = result.unwrap();
        
        let body = manager.get_body(body_id).unwrap();
        assert_eq!(body.physics.position, position);
        assert_eq!(resources.cosmic_dust, 900); // 100消費
    }
    
    #[test]
    fn test_position_validation() {
        let manager = CelestialBodyManager::new(50);
        let far_position = Vec3Fixed::new(fixed::from_f64(200000.0), fixed::from_f64(0.0), fixed::from_f64(0.0));
        
        let result = manager.validate_creation(&CelestialType::Asteroid, &far_position);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), GameError::OutOfBounds);
    }
    
    #[test]
    fn test_life_evolution_microbial() {
        let mut manager = CelestialBodyManager::new(50);
        let mut resources = Resources::new();
        resources.cosmic_dust = 10000;
        
        let planet_data = PlanetData {
            planet_type: PlanetType::Rocky,
            atmosphere: AtmosphereType::Oxygen,
            water_coverage: 70,
            temperature_range: (15, 25),
            habitability: 80,
        };
        
        let position = Vec3Fixed::new(fixed::from_f64(0.0), fixed::from_f64(0.0), fixed::from_f64(0.0));
        let body_id = manager.create_body(CelestialType::Planet(planet_data), position, &mut resources).unwrap();
        
        // 生命進化をシミュレート
        manager.update_life_systems(60000); // 1分 = 1200ティック
        
        let body = manager.get_body(body_id).unwrap();
        // 進化が発生していることを確認
        assert!(body.lifecycle.evolution_timer > 0);
    }
}