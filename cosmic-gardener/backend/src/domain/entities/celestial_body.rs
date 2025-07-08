//! # 天体エンティティ
//!
//! 宇宙空間の天体オブジェクトを表現するドメインエンティティ

use crate::domain::value_objects::{Mass, Position3D, Velocity3D};
use crate::shared::types::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 天体の種類
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CelestialBodyType {
    BlackHole,
    Star,
    Planet,
    Moon,
    Asteroid,
    Comet,
    DustCloud,
}

/// 天体エンティティ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CelestialBody {
    /// 一意識別子
    pub id: Uuid,
    /// 所属するセーブデータID
    pub save_id: Uuid,
    /// 親天体ID（軌道関係）
    pub parent_id: Option<Uuid>,
    /// 天体の種類
    pub body_type: CelestialBodyType,
    /// 天体の名前
    pub name: String,
    /// 3D位置
    pub position: Position3D,
    /// 3D速度
    pub velocity: Velocity3D,
    /// 質量
    pub mass: Mass,
    /// 半径
    pub radius: f64,
    /// 表面温度
    pub temperature: Option<f64>,
    /// 回転速度
    pub rotation_speed: f64,
    /// レベル
    pub level: u32,
    /// 経験値
    pub experience_points: u64,
    /// 破壊されているか
    pub is_destroyed: bool,
    /// 作成日時
    pub created_at: DateTime<Utc>,
    /// 更新日時
    pub updated_at: DateTime<Utc>,
    /// カスタムプロパティ
    pub custom_properties: serde_json::Value,
}

impl CelestialBody {
    /// 新しい天体を作成
    pub fn new(
        save_id: Uuid,
        body_type: CelestialBodyType,
        name: String,
        position: Position3D,
        mass: Mass,
        radius: f64,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            save_id,
            parent_id: None,
            body_type,
            name,
            position,
            velocity: Velocity3D::zero(),
            mass,
            radius,
            temperature: None,
            rotation_speed: 0.0,
            level: 1,
            experience_points: 0,
            is_destroyed: false,
            created_at: now,
            updated_at: now,
            custom_properties: serde_json::Value::Null,
        }
    }

    /// 天体を破壊
    pub fn destroy(&mut self) {
        self.is_destroyed = true;
        self.updated_at = Utc::now();
    }

    /// 位置を更新
    pub fn update_position(&mut self, new_position: Position3D) {
        self.position = new_position;
        self.updated_at = Utc::now();
    }

    /// 速度を更新
    pub fn update_velocity(&mut self, new_velocity: Velocity3D) {
        self.velocity = new_velocity;
        self.updated_at = Utc::now();
    }

    /// 経験値を追加
    pub fn add_experience(&mut self, exp: u64) {
        self.experience_points += exp;
        self.updated_at = Utc::now();
        
        // レベルアップ判定
        self.check_level_up();
    }

    /// レベルアップ判定
    fn check_level_up(&mut self) {
        let required_exp = self.calculate_required_exp(self.level + 1);
        if self.experience_points >= required_exp {
            self.level += 1;
            // レベルアップ時の処理
            self.on_level_up();
        }
    }

    /// 必要経験値の計算
    fn calculate_required_exp(&self, level: u32) -> u64 {
        // 指数関数的な成長
        (level as f64).powf(2.5) as u64 * 1000
    }

    /// レベルアップ時の処理
    fn on_level_up(&mut self) {
        // 質量の増加
        self.mass = Mass::new(self.mass.value() * 1.1);
        
        // 半径の増加
        self.radius *= 1.05;
        
        // 天体種類の進化判定
        self.check_evolution();
    }

    /// 天体の進化判定
    fn check_evolution(&mut self) {
        match self.body_type {
            CelestialBodyType::DustCloud => {
                if self.level >= 10 {
                    self.body_type = CelestialBodyType::Asteroid;
                }
            }
            CelestialBodyType::Asteroid => {
                if self.level >= 25 {
                    self.body_type = CelestialBodyType::Moon;
                }
            }
            CelestialBodyType::Moon => {
                if self.level >= 50 {
                    self.body_type = CelestialBodyType::Planet;
                }
            }
            CelestialBodyType::Planet => {
                if self.level >= 100 {
                    self.body_type = CelestialBodyType::Star;
                }
            }
            CelestialBodyType::Star => {
                if self.level >= 500 {
                    self.body_type = CelestialBodyType::BlackHole;
                }
            }
            CelestialBodyType::BlackHole => {
                // ブラックホールは最終形態
            }
            _ => {}
        }
    }

    /// 重力の強さを計算
    pub fn gravitational_strength(&self) -> f64 {
        const G: f64 = 6.67430e-11; // 重力定数
        G * self.mass.value()
    }

    /// 脱出速度を計算
    pub fn escape_velocity(&self) -> f64 {
        const G: f64 = 6.67430e-11;
        (2.0 * G * self.mass.value() / self.radius).sqrt()
    }

    /// 表面重力を計算
    pub fn surface_gravity(&self) -> f64 {
        const G: f64 = 6.67430e-11;
        G * self.mass.value() / (self.radius * self.radius)
    }

    /// 他の天体との距離を計算
    pub fn distance_to(&self, other: &CelestialBody) -> f64 {
        self.position.distance_to(&other.position)
    }

    /// 軌道半径を計算（親天体がある場合）
    pub fn orbital_radius(&self, parent: &CelestialBody) -> f64 {
        self.distance_to(parent)
    }

    /// 天体のハッシュ値を計算（物理計算最適化用）
    pub fn spatial_hash(&self) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        
        // 位置を離散化してハッシュ
        let grid_size = 1000.0; // グリッドサイズ
        let grid_x = (self.position.x / grid_size).floor() as i64;
        let grid_y = (self.position.y / grid_size).floor() as i64;
        let grid_z = (self.position.z / grid_size).floor() as i64;
        
        grid_x.hash(&mut hasher);
        grid_y.hash(&mut hasher);
        grid_z.hash(&mut hasher);
        
        hasher.finish()
    }
}

/// 天体の物理的プロパティ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CelestialBodyPhysics {
    /// 角運動量
    pub angular_momentum: f64,
    /// 磁場強度
    pub magnetic_field_strength: f64,
    /// 大気圧
    pub atmospheric_pressure: Option<f64>,
    /// 放射量
    pub luminosity: f64,
}

impl CelestialBodyPhysics {
    /// 新しい物理プロパティを作成
    pub fn new(body_type: CelestialBodyType, mass: f64) -> Self {
        match body_type {
            CelestialBodyType::Star => Self {
                angular_momentum: mass * 0.1,
                magnetic_field_strength: mass * 0.05,
                atmospheric_pressure: None,
                luminosity: mass * 0.001,
            },
            CelestialBodyType::Planet => Self {
                angular_momentum: mass * 0.01,
                magnetic_field_strength: mass * 0.001,
                atmospheric_pressure: Some(1.0),
                luminosity: 0.0,
            },
            _ => Self {
                angular_momentum: 0.0,
                magnetic_field_strength: 0.0,
                atmospheric_pressure: None,
                luminosity: 0.0,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::value_objects::*;

    #[test]
    fn test_celestial_body_creation() {
        let save_id = Uuid::new_v4();
        let position = Position3D::new(0.0, 0.0, 0.0);
        let mass = Mass::new(1.0e30);
        
        let body = CelestialBody::new(
            save_id,
            CelestialBodyType::Star,
            "Test Star".to_string(),
            position,
            mass,
            696340.0,
        );
        
        assert_eq!(body.save_id, save_id);
        assert_eq!(body.body_type, CelestialBodyType::Star);
        assert_eq!(body.name, "Test Star");
        assert_eq!(body.level, 1);
        assert!(!body.is_destroyed);
    }

    #[test]
    fn test_experience_and_level_up() {
        let save_id = Uuid::new_v4();
        let position = Position3D::new(0.0, 0.0, 0.0);
        let mass = Mass::new(1.0e30);
        
        let mut body = CelestialBody::new(
            save_id,
            CelestialBodyType::Star,
            "Test Star".to_string(),
            position,
            mass,
            696340.0,
        );
        
        // 経験値を追加
        body.add_experience(10000);
        
        // レベルアップしているか確認
        assert!(body.level > 1);
        assert_eq!(body.experience_points, 10000);
    }

    #[test]
    fn test_gravitational_calculations() {
        let save_id = Uuid::new_v4();
        let position = Position3D::new(0.0, 0.0, 0.0);
        let mass = Mass::new(1.989e30); // 太陽質量
        
        let star = CelestialBody::new(
            save_id,
            CelestialBodyType::Star,
            "Sun".to_string(),
            position,
            mass,
            696340000.0, // 太陽半径（メートル）
        );
        
        // 脱出速度の計算
        let escape_vel = star.escape_velocity();
        assert!(escape_vel > 600000.0); // 太陽の脱出速度は約617km/s
        
        // 表面重力の計算
        let surface_g = star.surface_gravity();
        assert!(surface_g > 270.0); // 太陽の表面重力は約274m/s²
    }
}