//! 値オブジェクト定義

use serde::{Deserialize, Serialize};

/// 3D位置
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Position3D {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Position3D {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub fn zero() -> Self {
        Self::new(0.0, 0.0, 0.0)
    }

    /// 他の位置との距離を計算
    pub fn distance_to(&self, other: &Position3D) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        let dz = self.z - other.z;
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

/// 3D速度
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Velocity3D {
    pub vx: f64,
    pub vy: f64,
    pub vz: f64,
}

impl Velocity3D {
    pub fn new(vx: f64, vy: f64, vz: f64) -> Self {
        Self { vx, vy, vz }
    }

    pub fn zero() -> Self {
        Self::new(0.0, 0.0, 0.0)
    }

    /// 速度の大きさ（スカラー）を取得
    pub fn magnitude(&self) -> f64 {
        (self.vx * self.vx + self.vy * self.vy + self.vz * self.vz).sqrt()
    }
}

/// 質量
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Mass {
    value: f64,
}

impl Mass {
    pub fn new(value: f64) -> Self {
        assert!(value >= 0.0, "Mass cannot be negative");
        Self { value }
    }

    pub fn value(&self) -> f64 {
        self.value
    }
}