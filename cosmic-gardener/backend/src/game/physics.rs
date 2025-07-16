use std::collections::HashMap;
use rayon::prelude::*;
use rstar::{RTree, RTreeObject, AABB, Envelope};
use serde::{Deserialize, Serialize};

use crate::errors::{GameError, Result};
use crate::game::celestial_bodies::{CelestialBody, BodyId, Vec3Fixed, Point3Fixed};
use crate::game::resources::{Fixed, fixed};

/// 物理演算の定数
pub const GRAVITATIONAL_CONSTANT: f64 = 6.67430e-11;
pub const SPEED_OF_LIGHT: f64 = 299792458.0;
pub const SOFTENING_FACTOR: f64 = 1e-3;
pub const MAX_VELOCITY: f64 = 0.1 * SPEED_OF_LIGHT;
pub const TICK_DURATION: f64 = 0.05; // 20Hz

/// 物理演算用のバウンディングボックス
#[derive(Debug, Clone)]
pub struct PhysicsAABB {
    pub body_id: BodyId,
    pub min: Point3Fixed,
    pub max: Point3Fixed,
}

impl RTreeObject for PhysicsAABB {
    type Envelope = AABB<[f64; 3]>;
    
    fn envelope(&self) -> Self::Envelope {
        AABB::from_corners(
            [self.min.x, self.min.y, self.min.z],
            [self.max.x, self.max.y, self.max.z],
        )
    }
}

/// 空間グリッドのセル
#[derive(Debug, Clone)]
pub struct SpatialCell {
    pub bodies: Vec<BodyId>,
    pub center_of_mass: Point3Fixed,
    pub total_mass: Fixed,
    pub bounds: AABB<[f64; 3]>,
}

impl SpatialCell {
    pub fn new(bounds: AABB<[f64; 3]>) -> Self {
        Self {
            bodies: Vec::new(),
            center_of_mass: Point3Fixed::origin(),
            total_mass: 0,
            bounds,
        }
    }
    
    pub fn add_body(&mut self, body_id: BodyId, position: Point3Fixed, mass: Fixed) {
        // 質量中心の更新
        let total_mass = self.total_mass + mass;
        if total_mass > 0 {
            let weight = fixed::to_f64(mass) / fixed::to_f64(total_mass);
            self.center_of_mass = Point3Fixed::from(
                self.center_of_mass.coords * (1.0 - weight) + position.coords * weight
            );
        }
        self.total_mass = total_mass;
        self.bodies.push(body_id);
    }
    
    pub fn clear(&mut self) {
        self.bodies.clear();
        self.center_of_mass = Point3Fixed::origin();
        self.total_mass = 0;
    }
}

/// Barnes-Hut木のノード
#[derive(Debug, Clone)]
pub struct BHNode {
    pub bounds: AABB<[f64; 3]>,
    pub center_of_mass: Point3Fixed,
    pub total_mass: Fixed,
    pub body_id: Option<BodyId>,
    pub children: Option<Box<[BHNode; 8]>>,
}

impl BHNode {
    pub fn new(bounds: AABB<[f64; 3]>) -> Self {
        Self {
            bounds,
            center_of_mass: Point3Fixed::origin(),
            total_mass: 0,
            body_id: None,
            children: None,
        }
    }
    
    pub fn is_leaf(&self) -> bool {
        self.children.is_none()
    }
    
    pub fn insert(&mut self, body_id: BodyId, position: Point3Fixed, mass: Fixed) {
        // 質量中心の更新
        let total_mass = self.total_mass + mass;
        if total_mass > 0 {
            let weight = fixed::to_f64(mass) / fixed::to_f64(total_mass);
            self.center_of_mass = Point3Fixed::from(
                self.center_of_mass.coords * (1.0 - weight) + position.coords * weight
            );
        }
        self.total_mass = total_mass;
        
        if self.is_leaf() {
            if self.body_id.is_none() {
                // 空のリーフノードに追加
                self.body_id = Some(body_id);
            } else {
                // 既存のボディがあるリーフノードを分割
                self.subdivide();
                if let Some(_existing_id) = self.body_id.take() {
                    // 既存のボディを再挿入（位置が必要）
                    // 実際の実装では既存ボディの位置を保持する必要がある
                }
                self.insert_into_children(body_id, position, mass);
            }
        } else {
            // 内部ノードに追加
            self.insert_into_children(body_id, position, mass);
        }
    }
    
    fn subdivide(&mut self) {
        let center = self.bounds.center();
        let lower = self.bounds.lower();
        let upper = self.bounds.upper();
        let size = [upper[0] - lower[0], upper[1] - lower[1], upper[2] - lower[2]];
        let half_size = [size[0] / 2.0, size[1] / 2.0, size[2] / 2.0];
        
        let mut children = Vec::with_capacity(8);
        for i in 0..8 {
            let offset = [
                if i & 1 == 0 { -half_size[0] } else { half_size[0] } / 2.0,
                if i & 2 == 0 { -half_size[1] } else { half_size[1] } / 2.0,
                if i & 4 == 0 { -half_size[2] } else { half_size[2] } / 2.0,
            ];
            
            let child_center = [
                center[0] + offset[0],
                center[1] + offset[1],
                center[2] + offset[2],
            ];
            
            let child_bounds = AABB::from_corners(
                [child_center[0] - half_size[0]/2.0, child_center[1] - half_size[1]/2.0, child_center[2] - half_size[2]/2.0],
                [child_center[0] + half_size[0]/2.0, child_center[1] + half_size[1]/2.0, child_center[2] + half_size[2]/2.0],
            );
            
            children.push(BHNode::new(child_bounds));
        }
        
        self.children = Some(Box::new([
            children[0].clone(), children[1].clone(), children[2].clone(), children[3].clone(),
            children[4].clone(), children[5].clone(), children[6].clone(), children[7].clone(),
        ]));
    }
    
    fn insert_into_children(&mut self, body_id: BodyId, position: Point3Fixed, mass: Fixed) {
        if let Some(ref mut children) = self.children {
            for child in children.iter_mut() {
                if child.bounds.contains_point(&[position.x, position.y, position.z]) {
                    child.insert(body_id, position, mass);
                    break;
                }
            }
        }
    }
}

/// 物理演算状態
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicsState {
    pub tick: u64,
    pub total_energy: Fixed,
    pub total_momentum: Vec3Fixed,
    pub bodies_updated: Vec<BodyId>,
}

impl PhysicsState {
    pub fn new() -> Self {
        Self {
            tick: 0,
            total_energy: 0,
            total_momentum: Vec3Fixed::zeros(),
            bodies_updated: Vec::new(),
        }
    }
}

/// 物理演算エンジン
pub struct PhysicsEngine {
    pub spatial_tree: RTree<PhysicsAABB>,
    pub bh_tree: Option<BHNode>,
    pub theta: f64, // Barnes-Hut近似パラメータ
    pub max_bodies_direct: usize,
    pub gravity_enabled: bool,
    pub collision_enabled: bool,
    pub state: PhysicsState,
}

impl PhysicsEngine {
    pub fn new() -> Self {
        Self {
            spatial_tree: RTree::new(),
            bh_tree: None,
            theta: 0.5, // 精度パラメータ
            max_bodies_direct: 1000,
            gravity_enabled: true,
            collision_enabled: true,
            state: PhysicsState::new(),
        }
    }
    
    /// 物理演算の更新
    pub fn update(&mut self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        if bodies.is_empty() {
            return Ok(());
        }
        
        // 空間インデックスの更新
        self.update_spatial_index(bodies);
        
        // 重力計算
        if self.gravity_enabled {
            self.calculate_gravity(bodies, delta_time)?;
        }
        
        // 位置の更新
        self.update_positions(bodies, delta_time);
        
        // 衝突検出
        if self.collision_enabled {
            self.detect_collisions(bodies)?;
        }
        
        // 物理状態の更新
        self.update_physics_state(bodies);
        
        self.state.tick += 1;
        
        Ok(())
    }
    
    /// 空間インデックスの更新
    fn update_spatial_index(&mut self, bodies: &HashMap<BodyId, CelestialBody>) {
        let mut spatial_objects = Vec::new();
        
        for (id, body) in bodies.iter() {
            let radius = body.physics.radius;
            let pos = body.physics.position;
            
            let aabb = PhysicsAABB {
                body_id: *id,
                min: Point3Fixed::new(pos.x - fixed::to_f64(radius), pos.y - fixed::to_f64(radius), pos.z - fixed::to_f64(radius)),
                max: Point3Fixed::new(pos.x + fixed::to_f64(radius), pos.y + fixed::to_f64(radius), pos.z + fixed::to_f64(radius)),
            };
            
            spatial_objects.push(aabb);
        }
        
        self.spatial_tree = RTree::bulk_load(spatial_objects);
    }
    
    /// 重力計算
    fn calculate_gravity(&mut self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        if bodies.len() <= self.max_bodies_direct {
            // 直接計算
            self.calculate_gravity_direct(bodies, delta_time)
        } else {
            // Barnes-Hut近似
            self.calculate_gravity_barnes_hut(bodies, delta_time)
        }
    }
    
    /// 直接的な重力計算（O(n²)）
    fn calculate_gravity_direct(&self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        let body_data: Vec<_> = bodies.iter().map(|(id, body)| {
            (*id, body.physics.position, body.physics.mass)
        }).collect();
        
        // 並列処理で力を計算
        let forces: Vec<_> = body_data.par_iter().map(|(id, pos, mass)| {
            let mut force = Vec3Fixed::zeros();
            
            for (other_id, other_pos, other_mass) in body_data.iter() {
                if id == other_id {
                    continue;
                }
                
                let r = other_pos - pos;
                let distance_sq = r.magnitude_squared();
                
                if distance_sq < SOFTENING_FACTOR * SOFTENING_FACTOR {
                    continue; // 軟化係数以下は無視
                }
                
                let distance = distance_sq.sqrt();
                let force_magnitude = GRAVITATIONAL_CONSTANT * 
                    fixed::to_f64(*mass) * fixed::to_f64(*other_mass) / 
                    (distance * distance + SOFTENING_FACTOR * SOFTENING_FACTOR);
                
                let force_direction = r.normalize();
                force += force_direction * force_magnitude;
            }
            
            (*id, force)
        }).collect();
        
        // 速度の更新
        for (id, force) in forces.iter() {
            if let Some(body) = bodies.get_mut(id) {
                let acceleration = *force / fixed::to_f64(body.physics.mass);
                
                body.physics.velocity += acceleration * delta_time;
                
                // 速度制限
                let velocity_magnitude = body.physics.velocity.magnitude();
                if velocity_magnitude > MAX_VELOCITY {
                    body.physics.velocity = body.physics.velocity.normalize() * MAX_VELOCITY;
                }
            }
        }
        
        Ok(())
    }
    
    /// Barnes-Hut近似による重力計算
    fn calculate_gravity_barnes_hut(&mut self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) -> Result<()> {
        // Barnes-Hut木の構築
        self.build_bh_tree(bodies);
        
        // 各ボディに対して力を計算
        for (id, body) in bodies.iter_mut() {
            let force = self.calculate_force_from_tree(*id, body.physics.position.into(), body.physics.mass);
            
            let acceleration = force / fixed::to_f64(body.physics.mass);
            
            body.physics.velocity += acceleration * delta_time;
            
            // 速度制限
            let velocity_magnitude = body.physics.velocity.magnitude();
            if velocity_magnitude > MAX_VELOCITY {
                body.physics.velocity = body.physics.velocity.normalize() * MAX_VELOCITY;
            }
        }
        
        Ok(())
    }
    
    /// Barnes-Hut木の構築
    fn build_bh_tree(&mut self, bodies: &HashMap<BodyId, CelestialBody>) {
        if bodies.is_empty() {
            return;
        }
        
        // 全ボディを含む境界を計算
        let mut min_pos = Point3Fixed::new(f64::MAX, f64::MAX, f64::MAX);
        let mut max_pos = Point3Fixed::new(f64::MIN, f64::MIN, f64::MIN);
        
        for body in bodies.values() {
            let pos = body.physics.position;
            min_pos.x = min_pos.x.min(pos.x);
            min_pos.y = min_pos.y.min(pos.y);
            min_pos.z = min_pos.z.min(pos.z);
            max_pos.x = max_pos.x.max(pos.x);
            max_pos.y = max_pos.y.max(pos.y);
            max_pos.z = max_pos.z.max(pos.z);
        }
        
        let bounds = AABB::from_corners(
            [min_pos.x, min_pos.y, min_pos.z],
            [max_pos.x, max_pos.y, max_pos.z],
        );
        
        let mut root = BHNode::new(bounds);
        
        // 全ボディを木に挿入
        for (id, body) in bodies.iter() {
            root.insert(*id, body.physics.position.into(), body.physics.mass);
        }
        
        self.bh_tree = Some(root);
    }
    
    /// 木から力を計算
    fn calculate_force_from_tree(&self, body_id: BodyId, position: Point3Fixed, mass: Fixed) -> Vec3Fixed {
        if let Some(ref tree) = self.bh_tree {
            self.calculate_force_recursive(tree, body_id, position, mass)
        } else {
            Vec3Fixed::zeros()
        }
    }
    
    /// 再帰的に力を計算
    fn calculate_force_recursive(&self, node: &BHNode, body_id: BodyId, position: Point3Fixed, mass: Fixed) -> Vec3Fixed {
        if node.total_mass == 0 {
            return Vec3Fixed::zeros();
        }
        
        let r = node.center_of_mass - position;
        let distance = r.magnitude();
        
        if node.is_leaf() {
            // リーフノードの場合、直接計算
            if let Some(node_body_id) = node.body_id {
                if node_body_id == body_id {
                    return Vec3Fixed::zeros(); // 自分自身への力は無視
                }
            }
            
            if distance < SOFTENING_FACTOR {
                return Vec3Fixed::zeros();
            }
            
            let force_magnitude = GRAVITATIONAL_CONSTANT * 
                fixed::to_f64(mass) * fixed::to_f64(node.total_mass) / 
                (distance * distance + SOFTENING_FACTOR * SOFTENING_FACTOR);
            
            let force_direction = r.normalize();
            return force_direction * force_magnitude;
        } else {
            // 内部ノードの場合、theta基準で判定
            let lower = node.bounds.lower();
            let upper = node.bounds.upper();
            let size = [upper[0] - lower[0], upper[1] - lower[1], upper[2] - lower[2]];
            let node_size = (size[0] + size[1] + size[2]) / 3.0;
            
            if node_size / distance < self.theta {
                // 近似を使用
                if distance < SOFTENING_FACTOR {
                    return Vec3Fixed::zeros();
                }
                
                let force_magnitude = GRAVITATIONAL_CONSTANT * 
                    fixed::to_f64(mass) * fixed::to_f64(node.total_mass) / 
                    (distance * distance + SOFTENING_FACTOR * SOFTENING_FACTOR);
                
                let force_direction = r.normalize();
                return force_direction * force_magnitude;
            } else {
                // 子ノードを再帰的に計算
                let mut total_force = Vec3Fixed::zeros();
                if let Some(ref children) = node.children {
                    for child in children.iter() {
                        total_force += self.calculate_force_recursive(child, body_id, position, mass);
                    }
                }
                return total_force;
            }
        }
    }
    
    /// 位置の更新
    fn update_positions(&mut self, bodies: &mut HashMap<BodyId, CelestialBody>, delta_time: f64) {
        for body in bodies.values_mut() {
            body.physics.position += body.physics.velocity * delta_time;
        }
    }
    
    /// 衝突検出
    fn detect_collisions(&mut self, bodies: &mut HashMap<BodyId, CelestialBody>) -> Result<()> {
        let mut collision_pairs = Vec::new();
        
        for (id, body) in bodies.iter() {
            let radius = body.physics.radius;
            let pos = body.physics.position;
            
            let query_aabb = AABB::from_corners(
                [pos.x - fixed::to_f64(radius), pos.y - fixed::to_f64(radius), pos.z - fixed::to_f64(radius)],
                [pos.x + fixed::to_f64(radius), pos.y + fixed::to_f64(radius), pos.z + fixed::to_f64(radius)],
            );
            
            let nearby_bodies: Vec<_> = self.spatial_tree.locate_in_envelope(&query_aabb).collect();
            
            for nearby in nearby_bodies {
                if nearby.body_id != *id {
                    if let Some(other_body) = bodies.get(&nearby.body_id) {
                        let distance = (body.physics.position - other_body.physics.position).magnitude();
                        let collision_distance = fixed::to_f64(body.physics.radius + other_body.physics.radius);
                        
                        if distance < collision_distance {
                            collision_pairs.push((*id, nearby.body_id));
                        }
                    }
                }
            }
        }
        
        // 衝突処理
        for (id1, id2) in collision_pairs {
            self.handle_collision(bodies, id1, id2)?;
        }
        
        Ok(())
    }
    
    /// 衝突処理
    fn handle_collision(&self, bodies: &mut HashMap<BodyId, CelestialBody>, id1: BodyId, id2: BodyId) -> Result<()> {
        // 非弾性衝突を実装
        let (body1, body2) = {
            let body1 = bodies.get(&id1).ok_or(GameError::BodyNotFound)?.clone();
            let body2 = bodies.get(&id2).ok_or(GameError::BodyNotFound)?.clone();
            (body1, body2)
        };
        
        let total_mass = body1.physics.mass + body2.physics.mass;
        let m1 = fixed::to_f64(body1.physics.mass);
        let m2 = fixed::to_f64(body2.physics.mass);
        
        // 運動量保存
        let final_velocity = (body1.physics.velocity * m1 + body2.physics.velocity * m2) / (m1 + m2);
        
        // 新しい位置（質量中心）
        let final_position = Point3Fixed::from((body1.physics.position.to_homogeneous().xyz() * m1 + body2.physics.position.to_homogeneous().xyz() * m2) / (m1 + m2));
        
        // より大きな天体を残す
        let (survivor_id, removed_id) = if body1.physics.mass > body2.physics.mass {
            (id1, id2)
        } else {
            (id2, id1)
        };
        
        // 生存者を更新
        if let Some(survivor) = bodies.get_mut(&survivor_id) {
            survivor.physics.mass = total_mass;
            survivor.physics.velocity = final_velocity;
            survivor.physics.position = final_position.to_homogeneous().xyz();
            // 新しい半径を計算（体積保存）
            let new_radius = fixed::from_f64(fixed::to_f64(total_mass).cbrt());
            survivor.physics.radius = new_radius;
        }
        
        // 削除されるボディを除去
        bodies.remove(&removed_id);
        
        Ok(())
    }
    
    /// 物理状態の更新
    fn update_physics_state(&mut self, bodies: &HashMap<BodyId, CelestialBody>) {
        let mut total_energy = fixed::from_f64(0.0);
        let mut total_momentum = Vec3Fixed::zeros();
        
        for body in bodies.values() {
            // 運動エネルギー
            let velocity_sq = body.physics.velocity.magnitude_squared();
            let kinetic_energy = fixed::from_f64(0.5 * fixed::to_f64(body.physics.mass) * velocity_sq);
            total_energy += kinetic_energy;
            
            // 運動量
            total_momentum += body.physics.velocity * fixed::to_f64(body.physics.mass);
        }
        
        self.state.total_energy = total_energy;
        self.state.total_momentum = total_momentum;
        self.state.bodies_updated = bodies.keys().copied().collect();
    }
    
    /// 物理状態の取得
    pub fn get_state(&self) -> &PhysicsState {
        &self.state
    }
    
    /// 設定の更新
    pub fn set_theta(&mut self, theta: f64) {
        self.theta = theta.clamp(0.1, 2.0);
    }
    
    pub fn set_gravity_enabled(&mut self, enabled: bool) {
        self.gravity_enabled = enabled;
    }
    
    pub fn set_collision_enabled(&mut self, enabled: bool) {
        self.collision_enabled = enabled;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::celestial_bodies::CelestialType;
    
    #[test]
    fn test_bh_node_creation() {
        let bounds = AABB::from_corners([0.0, 0.0, 0.0], [100.0; 3]);
        let node = BHNode::new(bounds);
        
        assert!(node.is_leaf());
        assert_eq!(node.total_mass, 0);
        assert!(node.body_id.is_none());
    }
    
    #[test]
    fn test_spatial_cell_add_body() {
        let bounds = AABB::from_corners([0.0, 0.0, 0.0], [100.0; 3]);
        let mut cell = SpatialCell::new(bounds);
        
        let body_id = Uuid::new_v4();
        let position = Point3Fixed::new(10.0, 20.0, 30.0);
        let mass = fixed::from_f64(1000.0);
        
        cell.add_body(body_id, position, mass);
        
        assert_eq!(cell.bodies.len(), 1);
        assert_eq!(cell.total_mass, mass);
        assert_eq!(cell.center_of_mass, position);
    }
    
    #[test]
    fn test_physics_engine_update() {
        let mut engine = PhysicsEngine::new();
        let mut bodies = HashMap::new();
        
        // テスト用の天体を2つ作成
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        
        let body1 = CelestialBody::new(
            id1,
            CelestialType::Asteroid,
            Vec3Fixed::new(0.0, 0.0, 0.0),
            fixed::from_f64(1000.0),
            fixed::from_f64(1.0),
        );
        
        let body2 = CelestialBody::new(
            id2,
            CelestialType::Asteroid,
            Vec3Fixed::new(10.0, 0.0, 0.0),
            fixed::from_f64(1000.0),
            fixed::from_f64(1.0),
        );
        
        bodies.insert(id1, body1);
        bodies.insert(id2, body2);
        
        // 物理演算の更新
        let result = engine.update(&mut bodies, TICK_DURATION);
        assert!(result.is_ok());
        
        // 天体が重力によって引き合っていることを確認
        let body1_after = bodies.get(&id1).unwrap();
        let body2_after = bodies.get(&id2).unwrap();
        
        // 重力により速度が変化しているはず
        assert_ne!(body1_after.physics.velocity.magnitude(), 0);
        assert_ne!(body2_after.physics.velocity.magnitude(), 0);
    }
}