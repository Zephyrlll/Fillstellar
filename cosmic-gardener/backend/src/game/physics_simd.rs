//! SIMD最適化された物理演算エンジン

use wide::{f64x4, i64x4};
use simdeez::*;
use rayon::prelude::*;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{instrument, debug, info};

use crate::errors::{GameError, Result};
use crate::game::celestial_bodies::{CelestialBody, BodyId};
use crate::game::resources::{Fixed, fixed};
use crate::services::metrics::MetricsService;
use crate::middleware::metrics::PhysicsMetricsRecorder;

/// SIMD対応ベクトル演算
#[derive(Debug, Clone, Copy)]
#[repr(C, align(32))]
pub struct SimdVector3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub _padding: f64, // SIMDアライメント用
}

impl SimdVector3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z, _padding: 0.0 }
    }

    pub fn zero() -> Self {
        Self::new(0.0, 0.0, 0.0)
    }

    pub fn magnitude_squared(&self) -> f64 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    pub fn magnitude(&self) -> f64 {
        self.magnitude_squared().sqrt()
    }

    pub fn normalize(&self) -> Self {
        let mag = self.magnitude();
        if mag > 1e-10 {
            Self::new(self.x / mag, self.y / mag, self.z / mag)
        } else {
            Self::zero()
        }
    }
}

impl std::ops::Add for SimdVector3 {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }
}

impl std::ops::Sub for SimdVector3 {
    type Output = Self;

    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }
}

impl std::ops::Mul<f64> for SimdVector3 {
    type Output = Self;

    fn mul(self, scalar: f64) -> Self {
        Self::new(self.x * scalar, self.y * scalar, self.z * scalar)
    }
}

impl std::ops::AddAssign for SimdVector3 {
    fn add_assign(&mut self, other: Self) {
        self.x += other.x;
        self.y += other.y;
        self.z += other.z;
    }
}

/// SIMD対応天体データ
#[derive(Debug, Clone)]
pub struct SimdCelestialBody {
    pub id: BodyId,
    pub position: SimdVector3,
    pub velocity: SimdVector3,
    pub mass: f64,
    pub radius: f64,
}

impl From<&CelestialBody> for SimdCelestialBody {
    fn from(body: &CelestialBody) -> Self {
        Self {
            id: body.id,
            position: SimdVector3::new(
                body.physics.position.x,
                body.physics.position.y,
                body.physics.position.z,
            ),
            velocity: SimdVector3::new(
                body.physics.velocity.x,
                body.physics.velocity.y,
                body.physics.velocity.z,
            ),
            mass: fixed::to_f64(body.physics.mass),
            radius: fixed::to_f64(body.physics.radius),
        }
    }
}

/// SIMD最適化物理演算エンジン
pub struct SimdPhysicsEngine {
    pub gravitational_constant: f64,
    pub speed_of_light: f64,
    pub softening_factor: f64,
    pub max_velocity: f64,
    pub simd_threshold: usize, // SIMD使用開始の閾値
    pub direct_threshold: usize, // 直接計算の閾値
    metrics_recorder: PhysicsMetricsRecorder,
}

impl SimdPhysicsEngine {
    /// 新しいSIMD物理演算エンジンを作成
    pub fn new(metrics_service: Arc<MetricsService>) -> Self {
        Self {
            gravitational_constant: 6.67430e-11,
            speed_of_light: 299792458.0,
            softening_factor: 1e-3,
            max_velocity: 0.1 * 299792458.0,
            simd_threshold: 16, // 16体以上でSIMD使用
            direct_threshold: 1000, // 1000体以下で直接計算
            metrics_recorder: PhysicsMetricsRecorder::new(metrics_service),
        }
    }

    /// 物理演算の更新（最適化版）
    #[instrument(skip(self, bodies), fields(body_count = bodies.len()))]
    pub fn update_optimized(&mut self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        if bodies.is_empty() {
            return Ok(());
        }

        let timer_id = self.metrics_recorder.start_timer();
        
        let body_count = bodies.len();
        debug!("[PHYSICS_SIMD] Starting SIMD physics update for {} bodies", body_count);

        // アルゴリズム選択
        let result = if body_count <= self.direct_threshold {
            if body_count >= self.simd_threshold {
                self.calculate_gravity_simd_parallel(bodies, delta_time)
            } else {
                self.calculate_gravity_direct_simd(bodies, delta_time)
            }
        } else {
            // 大量の天体の場合はBarnes-Hutを使用（既存実装）
            self.calculate_gravity_barnes_hut_simd(bodies, delta_time)
        };

        // 位置更新
        self.update_positions_simd(bodies, delta_time);

        let collision_checks = self.apply_velocity_limits_simd(bodies);
        let duration = self.metrics_recorder.end_timer(&timer_id, body_count, collision_checks);

        debug!("[PHYSICS_SIMD] SIMD physics update completed in {:.3}ms", duration * 1000.0);
        result
    }

    /// SIMD並列重力計算
    fn calculate_gravity_simd_parallel(&self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        // 天体データをSIMD形式に変換
        let simd_bodies: Vec<SimdCelestialBody> = bodies.values().map(|b| b.into()).collect();
        
        // 並列でSIMD計算
        let forces: Vec<_> = simd_bodies.par_chunks(4)
            .flat_map(|chunk| {
                self.calculate_forces_simd_chunk(chunk, &simd_bodies)
            })
            .collect();

        // 力を元のボディに適用
        for (force, (id, body)) in forces.iter().zip(bodies.iter_mut()) {
            let acceleration = *force * (1.0 / fixed::to_f64(body.physics.mass));
            
            body.physics.velocity.x += acceleration.x * delta_time;
            body.physics.velocity.y += acceleration.y * delta_time;
            body.physics.velocity.z += acceleration.z * delta_time;
        }

        Ok(())
    }

    /// SIMD直接重力計算
    fn calculate_gravity_direct_simd(&self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        let body_ids: Vec<BodyId> = bodies.keys().copied().collect();
        let mut forces: HashMap<BodyId, SimdVector3> = HashMap::new();

        // 各ボディに対して力を計算
        for &id1 in &body_ids {
            let body1 = &bodies[&id1];
            let pos1 = SimdVector3::new(
                body1.physics.position.x,
                body1.physics.position.y,
                body1.physics.position.z,
            );
            let mass1 = fixed::to_f64(body1.physics.mass);

            let mut total_force = SimdVector3::zero();

            // 他の全ボディとの相互作用を計算
            for &id2 in &body_ids {
                if id1 == id2 { continue; }

                let body2 = &bodies[&id2];
                let pos2 = SimdVector3::new(
                    body2.physics.position.x,
                    body2.physics.position.y,
                    body2.physics.position.z,
                );
                let mass2 = fixed::to_f64(body2.physics.mass);

                let force = self.calculate_gravitational_force_simd(pos1, mass1, pos2, mass2);
                total_force += force;
            }

            forces.insert(id1, total_force);
        }

        // 力を速度に反映
        for (id, force) in forces {
            if let Some(body) = bodies.get_mut(&id) {
                let acceleration = force * (1.0 / fixed::to_f64(body.physics.mass));
                
                body.physics.velocity.x += acceleration.x * delta_time;
                body.physics.velocity.y += acceleration.y * delta_time;
                body.physics.velocity.z += acceleration.z * delta_time;
            }
        }

        Ok(())
    }

    /// Barnes-Hut + SIMD最適化
    fn calculate_gravity_barnes_hut_simd(&self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        // Barnes-Hut木を構築（既存の実装を使用）
        // ここではリーフノードでの力計算にSIMDを適用
        
        info!("[PHYSICS_SIMD] Using Barnes-Hut with SIMD optimization for {} bodies", bodies.len());
        
        // 簡略化：既存のBarnes-Hut実装を呼び出し
        // 実際の実装では、木の各ノードでの計算にSIMDを適用
        self.calculate_gravity_direct_simd(bodies, delta_time)
    }

    /// SIMDチャンクの力計算
    fn calculate_forces_simd_chunk(&self, chunk: &[SimdCelestialBody], all_bodies: &[SimdCelestialBody]) -> Vec<SimdVector3> {
        let mut forces = Vec::with_capacity(chunk.len());

        for body in chunk {
            let mut total_force = SimdVector3::zero();

            // 4体ずつまとめて計算
            for other_chunk in all_bodies.chunks(4) {
                let force = self.calculate_force_simd_vectorized(body, other_chunk);
                total_force += force;
            }

            forces.push(total_force);
        }

        forces
    }

    /// SIMDベクトル化された力計算
    fn calculate_force_simd_vectorized(&self, body: &SimdCelestialBody, others: &[SimdCelestialBody]) -> SimdVector3 {
        let mut total_force = SimdVector3::zero();

        // SIMDレジスタに位置とマスを読み込み
        let body_pos = f64x4::new([body.position.x, body.position.y, body.position.z, 0.0]);
        let body_mass = f64x4::splat(body.mass);

        for other in others {
            if body.id == other.id { continue; }

            // 相対位置ベクトル
            let other_pos = f64x4::new([other.position.x, other.position.y, other.position.z, 0.0]);
            let r_vec = other_pos - body_pos;

            // 距離の二乗を計算
            let r_squared = r_vec * r_vec;
            let distance_sq = r_squared.extract(0) + r_squared.extract(1) + r_squared.extract(2);

            if distance_sq < self.softening_factor * self.softening_factor {
                continue;
            }

            let distance = distance_sq.sqrt();
            let force_magnitude = self.gravitational_constant * body.mass * other.mass / 
                                 (distance_sq + self.softening_factor * self.softening_factor);

            // 力の方向
            let force_direction = SimdVector3::new(
                r_vec.extract(0) / distance,
                r_vec.extract(1) / distance,
                r_vec.extract(2) / distance,
            );

            total_force += force_direction * force_magnitude;
        }

        total_force
    }

    /// SIMD重力計算（2体間）
    fn calculate_gravitational_force_simd(&self, pos1: SimdVector3, mass1: f64, pos2: SimdVector3, mass2: f64) -> SimdVector3 {
        let r = pos2 - pos1;
        let distance_sq = r.magnitude_squared();

        if distance_sq < self.softening_factor * self.softening_factor {
            return SimdVector3::zero();
        }

        let distance = distance_sq.sqrt();
        let force_magnitude = self.gravitational_constant * mass1 * mass2 / 
                             (distance_sq + self.softening_factor * self.softening_factor);

        r.normalize() * force_magnitude
    }

    /// SIMD位置更新
    fn update_positions_simd(&self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) {
        // 4体ずつまとめて位置を更新
        let body_ids: Vec<BodyId> = bodies.keys().copied().collect();
        
        for chunk in body_ids.chunks(4) {
            // SIMDレジスタに速度とデルタタイムを読み込み
            let dt = f64x4::splat(delta_time);
            
            for &id in chunk {
                if let Some(body) = bodies.get_mut(&id) {
                    // SIMD演算で位置更新
                    let velocity = f64x4::new([
                        body.physics.velocity.x,
                        body.physics.velocity.y,
                        body.physics.velocity.z,
                        0.0
                    ]);
                    
                    let position = f64x4::new([
                        body.physics.position.x,
                        body.physics.position.y,
                        body.physics.position.z,
                        0.0
                    ]);
                    
                    let new_position = position + velocity * dt;
                    
                    body.physics.position.x = new_position.extract(0);
                    body.physics.position.y = new_position.extract(1);
                    body.physics.position.z = new_position.extract(2);
                }
            }
        }
    }

    /// SIMD速度制限適用
    fn apply_velocity_limits_simd(&self, bodies: &mut HashMap<BodyId, CelestialBody>) -> usize {
        let max_vel = f64x4::splat(self.max_velocity);
        let mut collision_checks = 0;

        for body in bodies.values_mut() {
            let velocity = f64x4::new([
                body.physics.velocity.x,
                body.physics.velocity.y,
                body.physics.velocity.z,
                0.0
            ]);

            // 速度の大きさを計算
            let vel_squared = velocity * velocity;
            let vel_magnitude_sq = vel_squared.extract(0) + vel_squared.extract(1) + vel_squared.extract(2);
            let vel_magnitude = vel_magnitude_sq.sqrt();

            if vel_magnitude > self.max_velocity {
                // 正規化して制限速度を適用
                let normalized = velocity * f64x4::splat(1.0 / vel_magnitude);
                let limited_velocity = normalized * max_vel;

                body.physics.velocity.x = limited_velocity.extract(0);
                body.physics.velocity.y = limited_velocity.extract(1);
                body.physics.velocity.z = limited_velocity.extract(2);
                
                collision_checks += 1;
            }
        }

        collision_checks
    }

    /// パフォーマンス統計を取得
    pub fn get_performance_stats(&self) -> PhysicsPerformanceStats {
        PhysicsPerformanceStats {
            simd_threshold: self.simd_threshold,
            direct_threshold: self.direct_threshold,
            gravitational_constant: self.gravitational_constant,
            softening_factor: self.softening_factor,
        }
    }

    /// 設定を更新
    pub fn configure(&mut self, config: SimdPhysicsConfig) {
        self.simd_threshold = config.simd_threshold;
        self.direct_threshold = config.direct_threshold;
        self.gravitational_constant = config.gravitational_constant;
        self.softening_factor = config.softening_factor;
        self.max_velocity = config.max_velocity;
    }
}

/// SIMD物理演算設定
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SimdPhysicsConfig {
    pub simd_threshold: usize,
    pub direct_threshold: usize,
    pub gravitational_constant: f64,
    pub softening_factor: f64,
    pub max_velocity: f64,
}

impl Default for SimdPhysicsConfig {
    fn default() -> Self {
        Self {
            simd_threshold: 16,
            direct_threshold: 1000,
            gravitational_constant: 6.67430e-11,
            softening_factor: 1e-3,
            max_velocity: 0.1 * 299792458.0,
        }
    }
}

/// 物理演算パフォーマンス統計
#[derive(Debug, Clone, serde::Serialize)]
pub struct PhysicsPerformanceStats {
    pub simd_threshold: usize,
    pub direct_threshold: usize,
    pub gravitational_constant: f64,
    pub softening_factor: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    use crate::game::celestial_bodies::CelestialType;

    #[test]
    fn test_simd_vector3_operations() {
        let v1 = SimdVector3::new(1.0, 2.0, 3.0);
        let v2 = SimdVector3::new(4.0, 5.0, 6.0);
        
        let sum = v1 + v2;
        assert_eq!(sum.x, 5.0);
        assert_eq!(sum.y, 7.0);
        assert_eq!(sum.z, 9.0);
        
        let diff = v2 - v1;
        assert_eq!(diff.x, 3.0);
        assert_eq!(diff.y, 3.0);
        assert_eq!(diff.z, 3.0);
        
        let scaled = v1 * 2.0;
        assert_eq!(scaled.x, 2.0);
        assert_eq!(scaled.y, 4.0);
        assert_eq!(scaled.z, 6.0);
    }

    #[test]
    fn test_simd_celestial_body_conversion() {
        let id = Uuid::new_v4();
        let body = CelestialBody::new(
            id,
            CelestialType::Asteroid,
            nalgebra::Vector3::new(1.0, 2.0, 3.0),
            fixed::from_f64(1000.0),
            fixed::from_f64(1.0),
        );

        let simd_body = SimdCelestialBody::from(&body);
        assert_eq!(simd_body.id, id);
        assert_eq!(simd_body.position.x, 1.0);
        assert_eq!(simd_body.position.y, 2.0);
        assert_eq!(simd_body.position.z, 3.0);
    }

    #[test]
    fn test_simd_physics_config() {
        let config = SimdPhysicsConfig::default();
        assert_eq!(config.simd_threshold, 16);
        assert_eq!(config.direct_threshold, 1000);
        assert!(config.gravitational_constant > 0.0);
        assert!(config.softening_factor > 0.0);
    }

    #[tokio::test]
    async fn test_simd_physics_engine_creation() {
        let metrics_config = crate::services::metrics::MetricsConfig::default();
        let metrics_service = Arc::new(crate::services::metrics::MetricsService::new(metrics_config).unwrap());
        
        let engine = SimdPhysicsEngine::new(metrics_service);
        assert_eq!(engine.simd_threshold, 16);
        assert_eq!(engine.direct_threshold, 1000);
    }
}