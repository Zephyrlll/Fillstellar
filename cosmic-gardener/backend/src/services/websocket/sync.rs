//! 状態同期エンジン
//!
//! ゲーム状態の効率的な同期とコンフリクト解決を行います。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, VecDeque};
use uuid::Uuid;

use crate::domain::entities::celestial_body::CelestialBodyType;
use crate::domain::value_objects::{Position3D, Velocity3D};
use crate::models::websocket::{CelestialBodyData, CelestialBodyUpdates, StateDelta};

/// 状態同期エンジン
pub struct StateSyncEngine {
    /// 同期戦略
    strategy: SyncStrategy,
    /// 差分追跡システム
    delta_tracker: DeltaTracker,
    /// 優先度付きタスクキュー
    priority_queue: BinaryHeap<SyncTask>,
    /// 帯域幅推定器
    bandwidth_estimator: BandwidthEstimator,
}

/// 同期戦略
#[derive(Debug, Clone)]
pub enum SyncStrategy {
    /// 即時同期（低レイテンシ）
    Immediate,
    /// バッチ同期（効率重視）
    Batched {
        window_ms: u64,
        max_batch_size: usize,
    },
    /// 適応的同期（ネットワーク状況に応じて）
    Adaptive {
        latency_threshold_ms: u64,
        bandwidth_threshold_kbps: u64,
    },
}

impl Default for SyncStrategy {
    fn default() -> Self {
        Self::Adaptive {
            latency_threshold_ms: 100,
            bandwidth_threshold_kbps: 1000,
        }
    }
}

/// 差分追跡システム
pub struct DeltaTracker {
    /// オペレーショナル変換用のバージョンベクトル
    version_vector: HashMap<Uuid, u64>,
    /// 保留中の差分
    pending_deltas: VecDeque<TimestampedDelta>,
    /// 確認済みの差分（循環バッファ）
    confirmed_deltas: CircularBuffer<ConfirmedDelta>,
    /// エンティティごとの最新状態スナップショット
    snapshots: HashMap<Uuid, EntitySnapshot>,
}

/// タイムスタンプ付き差分
#[derive(Debug, Clone)]
pub struct TimestampedDelta {
    pub id: Uuid,
    pub delta: StateDelta,
    pub timestamp: DateTime<Utc>,
    pub sequence: u64,
}

/// 確認済み差分
#[derive(Debug, Clone)]
pub struct ConfirmedDelta {
    pub delta: TimestampedDelta,
    pub confirmed_at: DateTime<Utc>,
    pub client_ids: Vec<Uuid>,
}

/// エンティティスナップショット
#[derive(Debug, Clone)]
pub struct EntitySnapshot {
    pub entity_id: Uuid,
    pub version: u64,
    pub state: CelestialBodyData,
    pub last_update: DateTime<Utc>,
}

/// 循環バッファ
pub struct CircularBuffer<T> {
    buffer: Vec<Option<T>>,
    head: usize,
    tail: usize,
    size: usize,
    capacity: usize,
}

impl<T> CircularBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            buffer: vec![None; capacity],
            head: 0,
            tail: 0,
            size: 0,
            capacity,
        }
    }

    pub fn push(&mut self, item: T) {
        self.buffer[self.tail] = Some(item);
        self.tail = (self.tail + 1) % self.capacity;
        
        if self.size < self.capacity {
            self.size += 1;
        } else {
            self.head = (self.head + 1) % self.capacity;
        }
    }

    pub fn iter(&self) -> CircularBufferIter<T> {
        CircularBufferIter {
            buffer: &self.buffer,
            current: self.head,
            remaining: self.size,
            capacity: self.capacity,
        }
    }
}

/// 循環バッファイテレータ
pub struct CircularBufferIter<'a, T> {
    buffer: &'a Vec<Option<T>>,
    current: usize,
    remaining: usize,
    capacity: usize,
}

impl<'a, T> Iterator for CircularBufferIter<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        if self.remaining == 0 {
            return None;
        }

        let item = self.buffer[self.current].as_ref();
        self.current = (self.current + 1) % self.capacity;
        self.remaining -= 1;
        
        item
    }
}

/// 同期タスク
#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SyncTask {
    pub priority: SyncPriority,
    pub entity_id: Uuid,
    pub operation: SyncOperation,
    pub timestamp: DateTime<Utc>,
}

/// 同期優先度
#[derive(Debug, Clone, Copy, Eq, PartialEq, Ord, PartialOrd)]
pub enum SyncPriority {
    /// クリティカル（プレイヤーの直接操作）
    Critical = 0,
    /// 高（視界内の重要な更新）
    High = 1,
    /// 通常（一般的な状態更新）
    Normal = 2,
    /// 低（バックグラウンド同期）
    Low = 3,
}

/// 同期オペレーション
#[derive(Debug, Clone)]
pub enum SyncOperation {
    Create(CelestialBodyData),
    Update(CelestialBodyUpdates),
    Delete(Uuid),
    BatchUpdate(Vec<CelestialBodyUpdates>),
}

impl Ord for SyncTask {
    fn cmp(&self, other: &Self) -> Ordering {
        // 優先度が高い順（値が小さい方が優先）
        self.priority.cmp(&other.priority)
            .then_with(|| other.timestamp.cmp(&self.timestamp))
    }
}

impl PartialOrd for SyncTask {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// 帯域幅推定器
pub struct BandwidthEstimator {
    /// 送信バイト数履歴
    sent_bytes_history: VecDeque<(DateTime<Utc>, usize)>,
    /// 現在の推定帯域幅（bps）
    estimated_bandwidth: f64,
    /// 測定ウィンドウ
    window_duration: chrono::Duration,
}

impl BandwidthEstimator {
    pub fn new() -> Self {
        Self {
            sent_bytes_history: VecDeque::with_capacity(100),
            estimated_bandwidth: 1_000_000.0, // 初期値 1Mbps
            window_duration: chrono::Duration::seconds(5),
        }
    }

    /// バイト送信を記録
    pub fn record_sent(&mut self, bytes: usize) {
        let now = Utc::now();
        self.sent_bytes_history.push_back((now, bytes));
        
        // 古いエントリを削除
        let cutoff = now - self.window_duration;
        while let Some((timestamp, _)) = self.sent_bytes_history.front() {
            if *timestamp < cutoff {
                self.sent_bytes_history.pop_front();
            } else {
                break;
            }
        }
        
        // 帯域幅を再計算
        self.update_estimate();
    }

    /// 帯域幅推定値を更新
    fn update_estimate(&mut self) {
        if self.sent_bytes_history.len() < 2 {
            return;
        }

        let total_bytes: usize = self.sent_bytes_history.iter().map(|(_, bytes)| bytes).sum();
        let duration = self.sent_bytes_history.back().unwrap().0
            - self.sent_bytes_history.front().unwrap().0;
        
        if duration.num_milliseconds() > 0 {
            // bps = bytes * 8 / seconds
            self.estimated_bandwidth = 
                (total_bytes as f64 * 8.0) / (duration.num_milliseconds() as f64 / 1000.0);
        }
    }

    /// 現在の推定帯域幅を取得（bps）
    pub fn get_bandwidth_bps(&self) -> f64 {
        self.estimated_bandwidth
    }

    /// 指定サイズのデータ送信にかかる推定時間
    pub fn estimate_transfer_time(&self, bytes: usize) -> Duration {
        let seconds = (bytes as f64 * 8.0) / self.estimated_bandwidth;
        Duration::from_secs_f64(seconds)
    }
}

impl StateSyncEngine {
    /// 新しい同期エンジンを作成
    pub fn new(strategy: SyncStrategy) -> Self {
        Self {
            strategy,
            delta_tracker: DeltaTracker::new(),
            priority_queue: BinaryHeap::new(),
            bandwidth_estimator: BandwidthEstimator::new(),
        }
    }

    /// 同期タスクを追加
    pub fn add_task(&mut self, task: SyncTask) {
        self.priority_queue.push(task);
    }

    /// 次の同期バッチを取得
    pub fn get_next_batch(&mut self) -> Vec<SyncTask> {
        match &self.strategy {
            SyncStrategy::Immediate => {
                // 即時モード：最優先タスクのみ
                self.priority_queue.pop().into_iter().collect()
            }
            SyncStrategy::Batched { max_batch_size, .. } => {
                // バッチモード：指定サイズまで取得
                let mut batch = Vec::with_capacity(*max_batch_size);
                for _ in 0..*max_batch_size {
                    if let Some(task) = self.priority_queue.pop() {
                        batch.push(task);
                    } else {
                        break;
                    }
                }
                batch
            }
            SyncStrategy::Adaptive { .. } => {
                // 適応モード：帯域幅に基づいて動的に決定
                self.get_adaptive_batch()
            }
        }
    }

    /// 適応的バッチ取得
    fn get_adaptive_batch(&mut self) -> Vec<SyncTask> {
        let bandwidth_kbps = self.bandwidth_estimator.get_bandwidth_bps() / 1000.0;
        
        // 帯域幅に基づいてバッチサイズを決定
        let max_batch_size = if bandwidth_kbps > 5000.0 {
            20
        } else if bandwidth_kbps > 1000.0 {
            10
        } else if bandwidth_kbps > 500.0 {
            5
        } else {
            3
        };

        let mut batch = Vec::with_capacity(max_batch_size);
        let mut estimated_size = 0;
        
        while let Some(task) = self.priority_queue.peek() {
            let task_size = self.estimate_task_size(task);
            
            // 推定転送時間が100ms以下なら追加
            let transfer_time = self.bandwidth_estimator.estimate_transfer_time(estimated_size + task_size);
            if transfer_time.as_millis() <= 100 || batch.is_empty() {
                batch.push(self.priority_queue.pop().unwrap());
                estimated_size += task_size;
            } else {
                break;
            }
        }
        
        batch
    }

    /// タスクのサイズを推定（バイト）
    fn estimate_task_size(&self, task: &SyncTask) -> usize {
        match &task.operation {
            SyncOperation::Create(_) => 512,  // 新規作成は大きめ
            SyncOperation::Update(_) => 128,  // 更新は小さめ
            SyncOperation::Delete(_) => 64,   // 削除は最小
            SyncOperation::BatchUpdate(updates) => 128 * updates.len(),
        }
    }

    /// 差分を適用
    pub fn apply_delta(&mut self, delta: StateDelta, entity_id: Uuid) -> Result<(), SyncError> {
        let timestamp = Utc::now();
        let sequence = self.delta_tracker.get_next_sequence(entity_id);
        
        let timestamped = TimestampedDelta {
            id: entity_id,
            delta: delta.clone(),
            timestamp,
            sequence,
        };
        
        // 保留中の差分に追加
        self.delta_tracker.pending_deltas.push_back(timestamped.clone());
        
        // スナップショットを更新
        match &delta {
            StateDelta::CelestialBodyCreated { body } => {
                self.delta_tracker.snapshots.insert(
                    body.id,
                    EntitySnapshot {
                        entity_id: body.id,
                        version: sequence,
                        state: body.clone(),
                        last_update: timestamp,
                    },
                );
            }
            StateDelta::CelestialBodyUpdated { id, updates } => {
                if let Some(snapshot) = self.delta_tracker.snapshots.get_mut(id) {
                    self.apply_updates_to_snapshot(snapshot, updates);
                    snapshot.version = sequence;
                    snapshot.last_update = timestamp;
                }
            }
            StateDelta::CelestialBodyDestroyed { id, .. } => {
                self.delta_tracker.snapshots.remove(id);
            }
            _ => {}
        }
        
        Ok(())
    }

    /// スナップショットに更新を適用
    fn apply_updates_to_snapshot(&self, snapshot: &mut EntitySnapshot, updates: &CelestialBodyUpdates) {
        if let Some(pos) = &updates.position {
            snapshot.state.position = pos.clone();
        }
        if let Some(vel) = &updates.velocity {
            snapshot.state.velocity = vel.clone();
        }
        if let Some(mass) = updates.mass {
            snapshot.state.mass = mass;
        }
        if let Some(level) = updates.level {
            snapshot.state.level = level;
        }
        if let Some(props) = &updates.custom_properties {
            snapshot.state.custom_properties = props.clone();
        }
    }

    /// コンフリクトを解決
    pub fn resolve_conflict(
        &self,
        local: &CelestialBodyData,
        remote: &CelestialBodyData,
    ) -> CelestialBodyData {
        // Last Write Wins戦略（シンプルな実装）
        // TODO: より高度なCRDTベースの解決を実装
        remote.clone()
    }

    /// 同期状態をリセット
    pub fn reset(&mut self) {
        self.delta_tracker = DeltaTracker::new();
        self.priority_queue.clear();
    }
}

impl DeltaTracker {
    pub fn new() -> Self {
        Self {
            version_vector: HashMap::new(),
            pending_deltas: VecDeque::with_capacity(1000),
            confirmed_deltas: CircularBuffer::new(10000),
            snapshots: HashMap::new(),
        }
    }

    /// 次のシーケンス番号を取得
    pub fn get_next_sequence(&mut self, entity_id: Uuid) -> u64 {
        let sequence = self.version_vector.get(&entity_id).copied().unwrap_or(0) + 1;
        self.version_vector.insert(entity_id, sequence);
        sequence
    }

    /// 保留中の差分を確認済みに移動
    pub fn confirm_delta(&mut self, delta_id: Uuid, client_ids: Vec<Uuid>) {
        if let Some(pos) = self.pending_deltas.iter().position(|d| d.id == delta_id) {
            if let Some(delta) = self.pending_deltas.remove(pos) {
                self.confirmed_deltas.push(ConfirmedDelta {
                    delta,
                    confirmed_at: Utc::now(),
                    client_ids,
                });
            }
        }
    }

    /// エンティティの最新状態を取得
    pub fn get_latest_state(&self, entity_id: Uuid) -> Option<&CelestialBodyData> {
        self.snapshots.get(&entity_id).map(|s| &s.state)
    }

    /// 指定時点以降の差分を取得
    pub fn get_deltas_since(&self, since: DateTime<Utc>) -> Vec<&TimestampedDelta> {
        let mut deltas = Vec::new();
        
        // 保留中の差分から
        for delta in &self.pending_deltas {
            if delta.timestamp > since {
                deltas.push(delta);
            }
        }
        
        // 確認済みの差分から
        for confirmed in self.confirmed_deltas.iter() {
            if confirmed.delta.timestamp > since {
                deltas.push(&confirmed.delta);
            }
        }
        
        // タイムスタンプでソート
        deltas.sort_by_key(|d| d.timestamp);
        deltas
    }
}

/// 同期エラー
#[derive(Debug, thiserror::Error)]
pub enum SyncError {
    #[error("Version conflict")]
    VersionConflict,
    
    #[error("Entity not found")]
    EntityNotFound,
    
    #[error("Invalid operation")]
    InvalidOperation,
    
    #[error("Sync timeout")]
    Timeout,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_priority_ordering() {
        let mut heap = BinaryHeap::new();
        
        let task1 = SyncTask {
            priority: SyncPriority::Low,
            entity_id: Uuid::new_v4(),
            operation: SyncOperation::Delete(Uuid::new_v4()),
            timestamp: Utc::now(),
        };
        
        let task2 = SyncTask {
            priority: SyncPriority::Critical,
            entity_id: Uuid::new_v4(),
            operation: SyncOperation::Delete(Uuid::new_v4()),
            timestamp: Utc::now(),
        };
        
        let task3 = SyncTask {
            priority: SyncPriority::Normal,
            entity_id: Uuid::new_v4(),
            operation: SyncOperation::Delete(Uuid::new_v4()),
            timestamp: Utc::now(),
        };
        
        heap.push(task1.clone());
        heap.push(task2.clone());
        heap.push(task3.clone());
        
        // Critical が最初に来るべき
        assert_eq!(heap.pop().unwrap().priority, SyncPriority::Critical);
        assert_eq!(heap.pop().unwrap().priority, SyncPriority::Normal);
        assert_eq!(heap.pop().unwrap().priority, SyncPriority::Low);
    }

    #[test]
    fn test_circular_buffer() {
        let mut buffer = CircularBuffer::new(3);
        
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);
        buffer.push(4); // 1を上書き
        
        let items: Vec<_> = buffer.iter().copied().collect();
        assert_eq!(items, vec![2, 3, 4]);
    }

    #[test]
    fn test_bandwidth_estimator() {
        let mut estimator = BandwidthEstimator::new();
        
        // 1秒間に1000バイト送信
        estimator.record_sent(1000);
        
        // 帯域幅は約8000bps（1000 * 8）
        let bandwidth = estimator.get_bandwidth_bps();
        assert!(bandwidth > 0.0);
        
        // 1000バイトの転送時間は約1秒
        let transfer_time = estimator.estimate_transfer_time(1000);
        assert!(transfer_time.as_secs() >= 0);
    }
}