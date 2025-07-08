//! バックプレッシャー管理サービス
//!
//! WebSocket接続の負荷制御とフロー制御を実装します。

use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tokio::time::Instant;

use crate::models::websocket::WsMessage;

/// バックプレッシャー管理
pub struct BackpressureManager {
    /// 送信キューのサイズ
    queue_size: AtomicUsize,
    /// 最大キューサイズ
    max_queue_size: usize,
    /// 現在の戦略
    current_strategy: RwLock<BackpressureStrategy>,
    /// メトリクス
    metrics: BackpressureMetrics,
    /// レート制限器
    rate_limiter: RateLimiter,
}

/// バックプレッシャー戦略
#[derive(Debug, Clone)]
pub enum BackpressureStrategy {
    /// 古いメッセージをドロップ
    DropOldest {
        keep_critical: bool,
    },
    /// 送信レートを制限
    RateLimit {
        messages_per_second: u32,
        burst_size: u32,
    },
    /// メッセージを結合
    Coalesce {
        window_ms: u64,
        max_coalesced_size: usize,
    },
    /// 動的適応
    Adaptive {
        min_rate: u32,
        max_rate: u32,
        target_queue_usage: f32,
    },
}

impl Default for BackpressureStrategy {
    fn default() -> Self {
        Self::Adaptive {
            min_rate: 10,
            max_rate: 100,
            target_queue_usage: 0.5,
        }
    }
}

/// 送信判定
#[derive(Debug)]
pub enum SendDecision {
    /// 送信可能
    Send,
    /// 優先送信
    SendWithPriority,
    /// ドロップ
    Drop,
    /// 遅延送信
    Delay(Duration),
    /// 結合対象
    Coalesce,
}

/// バックプレッシャーメトリクス
pub struct BackpressureMetrics {
    /// ドロップされたメッセージ数
    dropped_messages: AtomicU64,
    /// 結合されたメッセージ数
    coalesced_messages: AtomicU64,
    /// 遅延されたメッセージ数
    delayed_messages: AtomicU64,
    /// 最大キュー使用率
    max_queue_usage: AtomicU64,
    /// 最後の更新時刻
    last_update: RwLock<DateTime<Utc>>,
}

impl BackpressureMetrics {
    fn new() -> Self {
        Self {
            dropped_messages: AtomicU64::new(0),
            coalesced_messages: AtomicU64::new(0),
            delayed_messages: AtomicU64::new(0),
            max_queue_usage: AtomicU64::new(0),
            last_update: RwLock::new(Utc::now()),
        }
    }

    /// メトリクスを記録
    pub fn record_drop(&self) {
        self.dropped_messages.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_coalesce(&self) {
        self.coalesced_messages.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_delay(&self) {
        self.delayed_messages.fetch_add(1, Ordering::Relaxed);
    }

    /// スナップショットを取得
    pub async fn snapshot(&self) -> MetricsSnapshot {
        MetricsSnapshot {
            dropped_messages: self.dropped_messages.load(Ordering::Relaxed),
            coalesced_messages: self.coalesced_messages.load(Ordering::Relaxed),
            delayed_messages: self.delayed_messages.load(Ordering::Relaxed),
            max_queue_usage: self.max_queue_usage.load(Ordering::Relaxed),
            last_update: *self.last_update.read().await,
        }
    }
}

/// メトリクススナップショット
#[derive(Debug, Clone)]
pub struct MetricsSnapshot {
    pub dropped_messages: u64,
    pub coalesced_messages: u64,
    pub delayed_messages: u64,
    pub max_queue_usage: u64,
    pub last_update: DateTime<Utc>,
}

/// レート制限器
pub struct RateLimiter {
    /// トークンバケット
    tokens: AtomicU64,
    /// 最大トークン数
    max_tokens: u64,
    /// トークン補充レート（秒あたり）
    refill_rate: u64,
    /// 最後の補充時刻
    last_refill: RwLock<Instant>,
}

impl RateLimiter {
    pub fn new(rate: u64, burst_size: u64) -> Self {
        Self {
            tokens: AtomicU64::new(burst_size),
            max_tokens: burst_size,
            refill_rate: rate,
            last_refill: RwLock::new(Instant::now()),
        }
    }

    /// トークンを消費
    pub async fn try_consume(&self, count: u64) -> bool {
        // トークンを補充
        self.refill().await;
        
        // トークンを消費
        let mut current = self.tokens.load(Ordering::Relaxed);
        loop {
            if current < count {
                return false;
            }
            
            match self.tokens.compare_exchange(
                current,
                current - count,
                Ordering::SeqCst,
                Ordering::Relaxed,
            ) {
                Ok(_) => return true,
                Err(actual) => current = actual,
            }
        }
    }

    /// トークンを補充
    async fn refill(&self) {
        let mut last_refill = self.last_refill.write().await;
        let now = Instant::now();
        let elapsed = now.duration_since(*last_refill);
        
        if elapsed.as_millis() > 0 {
            let tokens_to_add = (elapsed.as_secs_f64() * self.refill_rate as f64) as u64;
            if tokens_to_add > 0 {
                let current = self.tokens.load(Ordering::Relaxed);
                let new_tokens = (current + tokens_to_add).min(self.max_tokens);
                self.tokens.store(new_tokens, Ordering::Relaxed);
                *last_refill = now;
            }
        }
    }

    /// 次のトークンが利用可能になるまでの時間
    pub async fn time_until_available(&self, count: u64) -> Duration {
        let current_tokens = self.tokens.load(Ordering::Relaxed);
        if current_tokens >= count {
            return Duration::from_secs(0);
        }
        
        let needed_tokens = count - current_tokens;
        let seconds_needed = needed_tokens as f64 / self.refill_rate as f64;
        Duration::from_secs_f64(seconds_needed)
    }
}

/// メッセージ結合器
pub struct MessageCoalescer {
    /// 結合ウィンドウ
    window_duration: Duration,
    /// 最大結合サイズ
    max_size: usize,
    /// 保留中のメッセージ
    pending_messages: RwLock<VecDeque<CoalescibleMessage>>,
}

/// 結合可能メッセージ
struct CoalescibleMessage {
    message: WsMessage,
    received_at: Instant,
}

impl MessageCoalescer {
    pub fn new(window_ms: u64, max_size: usize) -> Self {
        Self {
            window_duration: Duration::from_millis(window_ms),
            max_size,
            pending_messages: RwLock::new(VecDeque::new()),
        }
    }

    /// メッセージを追加
    pub async fn add_message(&self, message: WsMessage) {
        let mut pending = self.pending_messages.write().await;
        
        // 古いメッセージを削除
        let cutoff = Instant::now() - self.window_duration;
        pending.retain(|m| m.received_at > cutoff);
        
        // 新しいメッセージを追加
        if pending.len() < self.max_size {
            pending.push_back(CoalescibleMessage {
                message,
                received_at: Instant::now(),
            });
        }
    }

    /// 結合されたメッセージを取得
    pub async fn get_coalesced(&self) -> Option<Vec<WsMessage>> {
        let mut pending = self.pending_messages.write().await;
        
        if pending.is_empty() {
            return None;
        }
        
        let messages: Vec<WsMessage> = pending
            .drain(..)
            .map(|cm| cm.message)
            .collect();
        
        Some(messages)
    }
}

impl BackpressureManager {
    /// 新しいバックプレッシャーマネージャーを作成
    pub fn new(max_queue_size: usize) -> Self {
        Self {
            queue_size: AtomicUsize::new(0),
            max_queue_size,
            current_strategy: RwLock::new(BackpressureStrategy::default()),
            metrics: BackpressureMetrics::new(),
            rate_limiter: RateLimiter::new(60, 10),  // 60 msg/s, burst 10
        }
    }

    /// メッセージ送信の可否を判定
    pub async fn can_send(&self, message: &WsMessage) -> SendDecision {
        let queue_size = self.queue_size.load(Ordering::Relaxed);
        let queue_usage = queue_size as f32 / self.max_queue_size as f32;
        
        // 最大使用率を更新
        let usage_percent = (queue_usage * 100.0) as u64;
        self.metrics.max_queue_usage.fetch_max(usage_percent, Ordering::Relaxed);
        
        let strategy = self.current_strategy.read().await;
        
        match &*strategy {
            BackpressureStrategy::DropOldest { keep_critical } => {
                if queue_size >= self.max_queue_size {
                    if *keep_critical && message.is_critical() {
                        SendDecision::SendWithPriority
                    } else {
                        self.metrics.record_drop();
                        SendDecision::Drop
                    }
                } else {
                    SendDecision::Send
                }
            }
            
            BackpressureStrategy::RateLimit { messages_per_second, .. } => {
                if self.rate_limiter.try_consume(1).await {
                    SendDecision::Send
                } else {
                    let delay = self.rate_limiter.time_until_available(1).await;
                    self.metrics.record_delay();
                    SendDecision::Delay(delay)
                }
            }
            
            BackpressureStrategy::Coalesce { .. } => {
                if message.is_coalescable() {
                    self.metrics.record_coalesce();
                    SendDecision::Coalesce
                } else {
                    SendDecision::Send
                }
            }
            
            BackpressureStrategy::Adaptive { min_rate, max_rate, target_queue_usage } => {
                self.adaptive_decision(queue_usage, *min_rate, *max_rate, *target_queue_usage, message).await
            }
        }
    }

    /// 適応的判定
    async fn adaptive_decision(
        &self,
        queue_usage: f32,
        min_rate: u32,
        max_rate: u32,
        target_usage: f32,
        message: &WsMessage,
    ) -> SendDecision {
        // キュー使用率に基づいてレートを調整
        let rate = if queue_usage < target_usage {
            // キューに余裕がある場合は高レート
            max_rate
        } else {
            // キューが混雑している場合は低レート
            let scale = (1.0 - queue_usage) / (1.0 - target_usage);
            let scaled_rate = min_rate as f32 + (max_rate - min_rate) as f32 * scale;
            scaled_rate.max(min_rate as f32) as u32
        };

        // 重要なメッセージは常に送信
        if message.is_critical() {
            return SendDecision::SendWithPriority;
        }

        // レート制限チェック
        if self.rate_limiter.try_consume(1).await {
            SendDecision::Send
        } else if queue_usage > 0.9 {
            // キューがほぼ満杯の場合はドロップ
            self.metrics.record_drop();
            SendDecision::Drop
        } else if message.is_coalescable() {
            // 結合可能なメッセージは結合
            self.metrics.record_coalesce();
            SendDecision::Coalesce
        } else {
            // それ以外は遅延
            let delay = self.rate_limiter.time_until_available(1).await;
            self.metrics.record_delay();
            SendDecision::Delay(delay)
        }
    }

    /// キュー使用率に基づいて戦略を調整
    pub async fn adjust_strategy(&self) {
        let usage = self.calculate_queue_usage();
        let mut strategy = self.current_strategy.write().await;
        
        *strategy = if usage > 0.8 {
            // 高負荷時：積極的な制御
            BackpressureStrategy::Coalesce {
                window_ms: 100,
                max_coalesced_size: 1024,
            }
        } else if usage > 0.5 {
            // 中負荷時：レート制限
            BackpressureStrategy::RateLimit {
                messages_per_second: 30,
                burst_size: 5,
            }
        } else {
            // 低負荷時：適応的制御
            BackpressureStrategy::Adaptive {
                min_rate: 10,
                max_rate: 100,
                target_queue_usage: 0.5,
            }
        };
    }

    /// キューサイズをインクリメント
    pub fn increment_queue_size(&self) {
        self.queue_size.fetch_add(1, Ordering::Relaxed);
    }

    /// キューサイズをデクリメント
    pub fn decrement_queue_size(&self) {
        self.queue_size.fetch_sub(1, Ordering::Relaxed);
    }

    /// キュー使用率を計算
    fn calculate_queue_usage(&self) -> f32 {
        let size = self.queue_size.load(Ordering::Relaxed);
        size as f32 / self.max_queue_size as f32
    }

    /// メトリクスを取得
    pub async fn get_metrics(&self) -> MetricsSnapshot {
        self.metrics.snapshot().await
    }
}

/// バックプレッシャー対応送信キュー
pub struct BackpressuredQueue {
    /// 送信チャネル
    sender: mpsc::Sender<QueuedMessage>,
    /// バックプレッシャーマネージャー
    backpressure: BackpressureManager,
    /// メッセージ結合器
    coalescer: MessageCoalescer,
}

/// キューに入れられたメッセージ
struct QueuedMessage {
    message: WsMessage,
    priority: MessagePriority,
    queued_at: Instant,
}

/// メッセージ優先度
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum MessagePriority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
}

impl BackpressuredQueue {
    /// 新しいキューを作成
    pub fn new(capacity: usize) -> (Self, mpsc::Receiver<QueuedMessage>) {
        let (sender, receiver) = mpsc::channel(capacity);
        
        let queue = Self {
            sender,
            backpressure: BackpressureManager::new(capacity),
            coalescer: MessageCoalescer::new(100, 20),
        };
        
        (queue, receiver)
    }

    /// メッセージを送信
    pub async fn send(&self, message: WsMessage) -> Result<(), SendError> {
        let decision = self.backpressure.can_send(&message).await;
        
        match decision {
            SendDecision::Send => {
                self.send_immediately(message, MessagePriority::Normal).await
            }
            SendDecision::SendWithPriority => {
                self.send_immediately(message, MessagePriority::Critical).await
            }
            SendDecision::Drop => {
                Err(SendError::Dropped)
            }
            SendDecision::Delay(duration) => {
                tokio::time::sleep(duration).await;
                self.send_immediately(message, MessagePriority::Normal).await
            }
            SendDecision::Coalesce => {
                self.coalescer.add_message(message).await;
                Ok(())
            }
        }
    }

    /// 即座に送信
    async fn send_immediately(
        &self,
        message: WsMessage,
        priority: MessagePriority,
    ) -> Result<(), SendError> {
        let queued = QueuedMessage {
            message,
            priority,
            queued_at: Instant::now(),
        };
        
        self.backpressure.increment_queue_size();
        
        match self.sender.try_send(queued) {
            Ok(_) => Ok(()),
            Err(mpsc::error::TrySendError::Full(_)) => {
                self.backpressure.decrement_queue_size();
                Err(SendError::QueueFull)
            }
            Err(mpsc::error::TrySendError::Closed(_)) => {
                self.backpressure.decrement_queue_size();
                Err(SendError::Closed)
            }
        }
    }

    /// 結合されたメッセージを送信
    pub async fn flush_coalesced(&self) -> Result<(), SendError> {
        if let Some(messages) = self.coalescer.get_coalesced().await {
            for message in messages {
                self.send_immediately(message, MessagePriority::Low).await?;
            }
        }
        Ok(())
    }
}

/// 送信エラー
#[derive(Debug, thiserror::Error)]
pub enum SendError {
    #[error("Message was dropped")]
    Dropped,
    
    #[error("Queue is full")]
    QueueFull,
    
    #[error("Channel is closed")]
    Closed,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter() {
        let limiter = RateLimiter::new(10, 5); // 10/s, burst 5
        
        // バースト内は成功
        for _ in 0..5 {
            assert!(limiter.try_consume(1).await);
        }
        
        // バーストを超えると失敗
        assert!(!limiter.try_consume(1).await);
        
        // 時間経過でトークン補充
        tokio::time::sleep(Duration::from_millis(200)).await;
        assert!(limiter.try_consume(1).await);
    }

    #[tokio::test]
    async fn test_backpressure_adaptive() {
        let manager = BackpressureManager::new(100);
        
        // 低使用率では送信可能
        let msg = WsMessage::Heartbeat(crate::models::websocket::HeartbeatRequest {
            sequence: 1,
            timestamp: Utc::now(),
        });
        
        matches!(manager.can_send(&msg).await, SendDecision::Send);
        
        // キューサイズを増やす
        for _ in 0..80 {
            manager.increment_queue_size();
        }
        
        // 高使用率では制限される可能性
        let decision = manager.can_send(&msg).await;
        assert!(matches!(
            decision,
            SendDecision::Send | SendDecision::Delay(_) | SendDecision::Coalesce
        ));
    }
}