//! 帯域幅最適化サービス
//!
//! データ圧縮、デルタエンコーディング、ビューカリングを実装します。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::domain::value_objects::{Position3D, Velocity3D};
use crate::models::websocket::CelestialBodyData;

/// 帯域幅最適化マネージャー
pub struct BandwidthOptimizer {
    /// 現在の帯域幅推定値（bps）
    estimated_bandwidth: f64,
    /// 圧縮戦略
    compression_strategy: CompressionStrategy,
    /// デルタエンコーダー
    delta_encoder: DeltaEncoder,
    /// ビューカラー
    view_culler: ViewCuller,
}

/// 圧縮戦略
#[derive(Debug, Clone)]
pub enum CompressionStrategy {
    /// 圧縮なし
    None,
    /// LZ4（高速、低圧縮率）
    Lz4 {
        level: u32,
    },
    /// Zstd（バランス型）
    Zstd {
        level: i32,
    },
    /// Brotli（高圧縮率）
    Brotli {
        quality: u32,
    },
    /// 動的選択
    Dynamic {
        size_threshold: usize,
        latency_threshold_ms: u64,
    },
}

impl Default for CompressionStrategy {
    fn default() -> Self {
        Self::Dynamic {
            size_threshold: 1024,  // 1KB以上で圧縮
            latency_threshold_ms: 50,
        }
    }
}

/// デルタエンコーダー
pub struct DeltaEncoder {
    /// 前回の状態スナップショット
    previous_states: HashMap<Uuid, CelestialBodySnapshot>,
    /// 圧縮可能なフィールド
    compressible_fields: HashSet<String>,
    /// 予測モデル
    predictor: OrbitPredictor,
}

/// 天体スナップショット
#[derive(Debug, Clone)]
pub struct CelestialBodySnapshot {
    pub id: Uuid,
    pub position: Position3D,
    pub velocity: Velocity3D,
    pub mass: f64,
    pub level: u32,
    pub timestamp: DateTime<Utc>,
}

/// 圧縮された差分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedDelta {
    pub body_id: Uuid,
    pub fields: Vec<DeltaField>,
    pub timestamp: DateTime<Utc>,
}

/// 差分フィールド
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeltaField {
    /// 位置差分（量子化済み）
    PositionDelta {
        dx: i16,  // ミリメートル単位
        dy: i16,
        dz: i16,
    },
    /// 速度差分（量子化済み）
    VelocityDelta {
        dvx: i16,  // mm/s単位
        dvy: i16,
        dvz: i16,
    },
    /// 質量変化率
    MassRatio(f32),  // 前回の質量に対する比率
    /// レベル差分
    LevelDelta(i8),
}

impl CompressedDelta {
    pub fn new(body_id: Uuid) -> Self {
        Self {
            body_id,
            fields: Vec::new(),
            timestamp: Utc::now(),
        }
    }

    pub fn add_position_delta(&mut self, dx: f64, dy: f64, dz: f64) {
        // メートルをミリメートルに変換して量子化
        self.fields.push(DeltaField::PositionDelta {
            dx: (dx * 1000.0) as i16,
            dy: (dy * 1000.0) as i16,
            dz: (dz * 1000.0) as i16,
        });
    }

    pub fn add_velocity_delta(&mut self, dvx: f64, dvy: f64, dvz: f64) {
        // m/sをmm/sに変換して量子化
        self.fields.push(DeltaField::VelocityDelta {
            dvx: (dvx * 1000.0) as i16,
            dvy: (dvy * 1000.0) as i16,
            dvz: (dvz * 1000.0) as i16,
        });
    }
}

/// 量子化された速度差分
#[derive(Debug, Clone)]
pub struct QuantizedVelocityDelta {
    pub dvx: i16,
    pub dvy: i16,
    pub dvz: i16,
}

impl QuantizedVelocityDelta {
    pub fn is_significant(&self) -> bool {
        // 1 mm/s 以上の変化を有意とする
        self.dvx.abs() > 1 || self.dvy.abs() > 1 || self.dvz.abs() > 1
    }
}

/// 軌道予測器
pub struct OrbitPredictor {
    /// 重力定数
    g: f64,
    /// 予測精度しきい値
    accuracy_threshold: f64,
}

impl OrbitPredictor {
    pub fn new() -> Self {
        Self {
            g: 6.67430e-11,
            accuracy_threshold: 0.01,  // 1%の誤差まで許容
        }
    }

    /// ケプラー軌道要素から位置を予測
    pub fn predict_position(
        &self,
        orbital_elements: &OrbitalElements,
        time_delta: f64,
    ) -> Position3D {
        // 簡易版：円軌道を仮定
        let mean_motion = (self.g * orbital_elements.central_mass / 
                          orbital_elements.semi_major_axis.powi(3)).sqrt();
        let angle_delta = mean_motion * time_delta;
        
        let new_angle = orbital_elements.true_anomaly + angle_delta;
        let r = orbital_elements.semi_major_axis;
        
        Position3D::new(
            r * new_angle.cos(),
            r * new_angle.sin(),
            0.0,  // 2D平面上の軌道を仮定
        )
    }
}

/// ケプラー軌道要素
#[derive(Debug, Clone)]
pub struct OrbitalElements {
    pub semi_major_axis: f64,
    pub eccentricity: f64,
    pub inclination: f64,
    pub true_anomaly: f64,
    pub central_mass: f64,
}

impl DeltaEncoder {
    pub fn new() -> Self {
        let mut compressible_fields = HashSet::new();
        compressible_fields.insert("position".to_string());
        compressible_fields.insert("velocity".to_string());
        compressible_fields.insert("mass".to_string());
        compressible_fields.insert("level".to_string());

        Self {
            previous_states: HashMap::new(),
            compressible_fields,
            predictor: OrbitPredictor::new(),
        }
    }

    /// 天体の差分を計算
    pub fn encode_celestial_delta(
        &mut self,
        body_id: Uuid,
        current: &CelestialBodyData,
    ) -> Option<CompressedDelta> {
        if let Some(previous) = self.previous_states.get(&body_id) {
            let mut delta = CompressedDelta::new(body_id);
            
            // 位置の差分（予測可能な軌道は省略）
            if !self.is_predictable_orbit(&previous.position, &current.position) {
                delta.add_position_delta(
                    current.position.x - previous.position.x,
                    current.position.y - previous.position.y,
                    current.position.z - previous.position.z,
                );
            }
            
            // 速度の差分
            let velocity_delta = self.quantize_velocity_delta(
                &previous.velocity,
                &current.velocity,
            );
            if velocity_delta.is_significant() {
                delta.fields.push(DeltaField::VelocityDelta {
                    dvx: velocity_delta.dvx,
                    dvy: velocity_delta.dvy,
                    dvz: velocity_delta.dvz,
                });
            }
            
            // 質量の変化
            if (current.mass - previous.mass).abs() > 0.001 {
                let mass_ratio = current.mass / previous.mass;
                delta.fields.push(DeltaField::MassRatio(mass_ratio as f32));
            }
            
            // レベルの変化
            if current.level != previous.level {
                let level_delta = (current.level as i32 - previous.level as i32) as i8;
                delta.fields.push(DeltaField::LevelDelta(level_delta));
            }
            
            // スナップショットを更新
            self.update_snapshot(body_id, current);
            
            if delta.fields.is_empty() {
                None
            } else {
                Some(delta)
            }
        } else {
            // 初回は完全なデータを送信
            self.update_snapshot(body_id, current);
            None
        }
    }

    /// スナップショットを更新
    fn update_snapshot(&mut self, body_id: Uuid, data: &CelestialBodyData) {
        self.previous_states.insert(
            body_id,
            CelestialBodySnapshot {
                id: body_id,
                position: data.position,
                velocity: data.velocity,
                mass: data.mass,
                level: data.level,
                timestamp: Utc::now(),
            },
        );
    }

    /// 軌道が予測可能かチェック
    fn is_predictable_orbit(
        &self,
        _previous: &Position3D,
        _current: &Position3D,
    ) -> bool {
        // TODO: ケプラー軌道要素から予測可能性を判定
        false
    }

    /// 速度差分を量子化
    fn quantize_velocity_delta(
        &self,
        previous: &Velocity3D,
        current: &Velocity3D,
    ) -> QuantizedVelocityDelta {
        QuantizedVelocityDelta {
            dvx: ((current.vx - previous.vx) * 1000.0) as i16,
            dvy: ((current.vy - previous.vy) * 1000.0) as i16,
            dvz: ((current.vz - previous.vz) * 1000.0) as i16,
        }
    }

    /// エンティティのスナップショットをクリア
    pub fn clear_snapshot(&mut self, body_id: Uuid) {
        self.previous_states.remove(&body_id);
    }

    /// 全スナップショットをクリア
    pub fn clear_all_snapshots(&mut self) {
        self.previous_states.clear();
    }
}

/// ビューカリングシステム
pub struct ViewCuller {
    /// プレイヤーの視界範囲
    view_distance: f64,
    /// LOD（Level of Detail）距離設定
    lod_distances: Vec<f64>,
    /// 重要度スコアリング
    importance_scorer: ImportanceScorer,
}

/// カリング済み天体
#[derive(Debug, Clone)]
pub struct CulledBody {
    pub data: CelestialBodyData,
    pub lod: LevelOfDetail,
    pub update_frequency: UpdateFrequency,
}

/// 詳細レベル
#[derive(Debug, Clone, Copy)]
pub enum LevelOfDetail {
    /// 完全な詳細
    Full,
    /// 中程度の詳細
    Medium,
    /// 低詳細
    Low,
    /// 最小情報のみ
    Minimal,
}

/// 更新頻度
#[derive(Debug, Clone, Copy)]
pub enum UpdateFrequency {
    /// リアルタイム（毎フレーム）
    Realtime,
    /// 高頻度（1秒ごと）
    High,
    /// 通常（5秒ごと）
    Normal,
    /// 低頻度（30秒ごと）
    Low,
}

/// 重要度スコアリング
pub struct ImportanceScorer {
    /// 質量の重み
    mass_weight: f32,
    /// レベルの重み
    level_weight: f32,
    /// 速度の重み
    velocity_weight: f32,
}

impl ImportanceScorer {
    pub fn new() -> Self {
        Self {
            mass_weight: 0.4,
            level_weight: 0.3,
            velocity_weight: 0.3,
        }
    }

    /// 天体の重要度スコアを計算
    pub fn score(&self, body: &CelestialBodyData) -> f32 {
        let mass_score = (body.mass.log10() / 30.0).min(1.0) as f32;
        let level_score = (body.level as f32 / 100.0).min(1.0);
        let velocity_score = (body.velocity.magnitude() / 1000.0).min(1.0) as f32;
        
        mass_score * self.mass_weight +
        level_score * self.level_weight +
        velocity_score * self.velocity_weight
    }
}

impl ViewCuller {
    pub fn new() -> Self {
        Self {
            view_distance: 10000.0,  // 10km
            lod_distances: vec![100.0, 500.0, 2000.0, 5000.0],
            importance_scorer: ImportanceScorer::new(),
        }
    }

    /// 送信すべき天体をフィルタリング
    pub fn cull_celestial_bodies(
        &self,
        player_position: &Position3D,
        bodies: &[CelestialBodyData],
    ) -> Vec<CulledBody> {
        bodies.iter()
            .filter_map(|body| {
                let distance = body.position.distance_to(player_position);
                
                if distance > self.view_distance {
                    return None;
                }
                
                let lod = self.calculate_lod(distance);
                let importance = self.importance_scorer.score(body);
                
                Some(CulledBody {
                    data: body.clone(),
                    lod,
                    update_frequency: self.calculate_update_frequency(
                        distance,
                        importance,
                    ),
                })
            })
            .collect()
    }

    /// LODを計算
    fn calculate_lod(&self, distance: f64) -> LevelOfDetail {
        if distance < self.lod_distances[0] {
            LevelOfDetail::Full
        } else if distance < self.lod_distances[1] {
            LevelOfDetail::Medium
        } else if distance < self.lod_distances[2] {
            LevelOfDetail::Low
        } else {
            LevelOfDetail::Minimal
        }
    }

    /// 更新頻度を計算
    fn calculate_update_frequency(&self, distance: f64, importance: f32) -> UpdateFrequency {
        let distance_factor = 1.0 - (distance / self.view_distance);
        let combined_score = distance_factor * importance as f64;
        
        if combined_score > 0.8 {
            UpdateFrequency::Realtime
        } else if combined_score > 0.5 {
            UpdateFrequency::High
        } else if combined_score > 0.2 {
            UpdateFrequency::Normal
        } else {
            UpdateFrequency::Low
        }
    }
}

impl BandwidthOptimizer {
    pub fn new() -> Self {
        Self {
            estimated_bandwidth: 1_000_000.0,  // 1Mbps default
            compression_strategy: CompressionStrategy::default(),
            delta_encoder: DeltaEncoder::new(),
            view_culler: ViewCuller::new(),
        }
    }

    /// データを最適化
    pub fn optimize_data(
        &mut self,
        bodies: &[CelestialBodyData],
        player_position: &Position3D,
    ) -> OptimizedData {
        // ビューカリング
        let culled_bodies = self.view_culler.cull_celestial_bodies(player_position, bodies);
        
        // デルタエンコーディング
        let mut deltas = Vec::new();
        let mut full_updates = Vec::new();
        
        for culled in &culled_bodies {
            if let Some(delta) = self.delta_encoder.encode_celestial_delta(
                culled.data.id,
                &culled.data,
            ) {
                deltas.push(delta);
            } else {
                full_updates.push(culled.data.clone());
            }
        }
        
        OptimizedData {
            deltas,
            full_updates,
            culled_count: bodies.len() - culled_bodies.len(),
        }
    }

    /// 圧縮戦略を更新
    pub fn update_compression_strategy(&mut self, bandwidth_bps: f64, latency_ms: u64) {
        self.estimated_bandwidth = bandwidth_bps;
        
        if bandwidth_bps < 500_000.0 {  // 500kbps以下
            self.compression_strategy = CompressionStrategy::Brotli { quality: 6 };
        } else if latency_ms > 100 {  // 高レイテンシ
            self.compression_strategy = CompressionStrategy::Zstd { level: 3 };
        } else {  // 通常
            self.compression_strategy = CompressionStrategy::Lz4 { level: 1 };
        }
    }
}

/// 最適化されたデータ
#[derive(Debug)]
pub struct OptimizedData {
    pub deltas: Vec<CompressedDelta>,
    pub full_updates: Vec<CelestialBodyData>,
    pub culled_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::celestial_body::CelestialBodyType;

    fn create_test_body(id: Uuid, x: f64, y: f64, z: f64) -> CelestialBodyData {
        CelestialBodyData {
            id,
            parent_id: None,
            body_type: CelestialBodyType::Planet,
            name: "Test Planet".to_string(),
            position: Position3D::new(x, y, z),
            velocity: Velocity3D::new(0.0, 0.0, 0.0),
            mass: 1e24,
            radius: 6371000.0,
            level: 1,
            experience_points: 0,
            custom_properties: serde_json::json!({}),
        }
    }

    #[test]
    fn test_delta_encoding() {
        let mut encoder = DeltaEncoder::new();
        let body_id = Uuid::new_v4();
        
        let body1 = create_test_body(body_id, 0.0, 0.0, 0.0);
        let body2 = create_test_body(body_id, 1.0, 0.0, 0.0);
        
        // 初回はNone
        assert!(encoder.encode_celestial_delta(body_id, &body1).is_none());
        
        // 2回目は差分
        let delta = encoder.encode_celestial_delta(body_id, &body2).unwrap();
        assert_eq!(delta.body_id, body_id);
        assert!(!delta.fields.is_empty());
    }

    #[test]
    fn test_view_culling() {
        let culler = ViewCuller::new();
        let player_pos = Position3D::new(0.0, 0.0, 0.0);
        
        let bodies = vec![
            create_test_body(Uuid::new_v4(), 50.0, 0.0, 0.0),    // 近い
            create_test_body(Uuid::new_v4(), 5000.0, 0.0, 0.0),  // 遠い
            create_test_body(Uuid::new_v4(), 20000.0, 0.0, 0.0), // 視界外
        ];
        
        let culled = culler.cull_celestial_bodies(&player_pos, &bodies);
        assert_eq!(culled.len(), 2); // 視界外の1つは除外
    }
}