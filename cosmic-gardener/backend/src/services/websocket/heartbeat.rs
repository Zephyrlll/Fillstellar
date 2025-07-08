//! ハートビート管理サービス
//!
//! WebSocket接続の死活監視とレイテンシ測定を行います。

use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use tokio::time::{interval, Duration};

/// ハートビート設定
#[derive(Debug, Clone)]
pub struct HeartbeatConfig {
    /// ハートビート間隔
    pub interval: Duration,
    /// タイムアウト時間
    pub timeout: Duration,
    /// 最大失敗回数
    pub max_failures: u32,
    /// アダプティブ調整を有効にするか
    pub adaptive: bool,
}

impl Default for HeartbeatConfig {
    fn default() -> Self {
        Self {
            interval: Duration::from_secs(30),
            timeout: Duration::from_secs(10),
            max_failures: 3,
            adaptive: true,
        }
    }
}

/// ハートビートマネージャー
pub struct HeartbeatManager {
    /// 設定
    config: HeartbeatConfig,
    /// 最後のPing送信時刻
    last_ping: DateTime<Utc>,
    /// 最後のPong受信時刻
    last_pong: DateTime<Utc>,
    /// レイテンシ履歴
    latency_history: VecDeque<Duration>,
    /// 連続失敗回数
    consecutive_failures: u32,
    /// 現在のステータス
    status: HeartbeatStatus,
}

/// ハートビートステータス
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HeartbeatStatus {
    /// 正常
    Healthy,
    /// 警告（レイテンシが高い）
    Warning,
    /// エラー（タイムアウト）
    Error,
    /// 切断
    Disconnected,
}

impl HeartbeatManager {
    /// 新しいハートビートマネージャーを作成
    pub fn new(config: HeartbeatConfig) -> Self {
        let now = Utc::now();
        Self {
            config,
            last_ping: now,
            last_pong: now,
            latency_history: VecDeque::with_capacity(10),
            consecutive_failures: 0,
            status: HeartbeatStatus::Healthy,
        }
    }

    /// Pingを送信
    pub fn send_ping(&mut self) -> DateTime<Utc> {
        self.last_ping = Utc::now();
        self.last_ping
    }

    /// Pongを受信
    pub fn receive_pong(&mut self, ping_timestamp: DateTime<Utc>) {
        self.last_pong = Utc::now();
        self.consecutive_failures = 0;
        
        // レイテンシを計算
        let latency = self.last_pong.signed_duration_since(ping_timestamp);
        if latency.num_milliseconds() >= 0 {
            let latency_duration = Duration::from_millis(latency.num_milliseconds() as u64);
            self.add_latency_sample(latency_duration);
            
            // ステータスを更新
            self.update_status();
            
            // アダプティブ調整
            if self.config.adaptive {
                self.adjust_interval();
            }
        }
    }

    /// タイムアウトをチェック
    pub fn check_timeout(&mut self) -> bool {
        let elapsed = Utc::now().signed_duration_since(self.last_ping);
        
        if elapsed.to_std().unwrap_or(Duration::from_secs(0)) > self.config.timeout {
            self.consecutive_failures += 1;
            
            if self.consecutive_failures >= self.config.max_failures {
                self.status = HeartbeatStatus::Disconnected;
                return true;
            } else {
                self.status = HeartbeatStatus::Error;
            }
        }
        
        false
    }

    /// レイテンシサンプルを追加
    fn add_latency_sample(&mut self, latency: Duration) {
        self.latency_history.push_back(latency);
        
        // 履歴サイズを制限
        if self.latency_history.len() > 10 {
            self.latency_history.pop_front();
        }
    }

    /// 平均レイテンシを計算
    pub fn average_latency(&self) -> Duration {
        if self.latency_history.is_empty() {
            return Duration::from_secs(0);
        }
        
        let total: Duration = self.latency_history.iter().sum();
        total / self.latency_history.len() as u32
    }

    /// 最大レイテンシを取得
    pub fn max_latency(&self) -> Duration {
        self.latency_history
            .iter()
            .max()
            .copied()
            .unwrap_or(Duration::from_secs(0))
    }

    /// 最小レイテンシを取得
    pub fn min_latency(&self) -> Duration {
        self.latency_history
            .iter()
            .min()
            .copied()
            .unwrap_or(Duration::from_secs(0))
    }

    /// レイテンシに基づいて間隔を調整
    pub fn adjust_interval(&mut self) {
        if !self.config.adaptive {
            return;
        }

        let avg_latency = self.average_latency();
        
        // 高レイテンシ環境では間隔を長くする
        if avg_latency > Duration::from_millis(500) {
            self.config.interval = Duration::from_secs(45);
        } else if avg_latency > Duration::from_millis(200) {
            self.config.interval = Duration::from_secs(30);
        } else if avg_latency < Duration::from_millis(100) {
            self.config.interval = Duration::from_secs(20);
        } else {
            self.config.interval = Duration::from_secs(25);
        }
    }

    /// ステータスを更新
    fn update_status(&mut self) {
        let avg_latency = self.average_latency();
        
        if self.consecutive_failures > 0 {
            self.status = HeartbeatStatus::Error;
        } else if avg_latency > Duration::from_millis(300) {
            self.status = HeartbeatStatus::Warning;
        } else {
            self.status = HeartbeatStatus::Healthy;
        }
    }

    /// 現在のステータスを取得
    pub fn status(&self) -> HeartbeatStatus {
        self.status
    }

    /// 接続の健全性スコアを計算（0.0 - 1.0）
    pub fn health_score(&self) -> f64 {
        match self.status {
            HeartbeatStatus::Healthy => {
                // レイテンシに基づいてスコアを調整
                let avg_latency = self.average_latency();
                if avg_latency < Duration::from_millis(50) {
                    1.0
                } else if avg_latency < Duration::from_millis(100) {
                    0.9
                } else if avg_latency < Duration::from_millis(200) {
                    0.8
                } else {
                    0.7
                }
            }
            HeartbeatStatus::Warning => 0.5,
            HeartbeatStatus::Error => 0.2,
            HeartbeatStatus::Disconnected => 0.0,
        }
    }

    /// メトリクスを取得
    pub fn metrics(&self) -> HeartbeatMetrics {
        HeartbeatMetrics {
            status: self.status,
            consecutive_failures: self.consecutive_failures,
            average_latency: self.average_latency(),
            max_latency: self.max_latency(),
            min_latency: self.min_latency(),
            health_score: self.health_score(),
            last_ping: self.last_ping,
            last_pong: self.last_pong,
        }
    }
}

/// ハートビートメトリクス
#[derive(Debug, Clone)]
pub struct HeartbeatMetrics {
    pub status: HeartbeatStatus,
    pub consecutive_failures: u32,
    pub average_latency: Duration,
    pub max_latency: Duration,
    pub min_latency: Duration,
    pub health_score: f64,
    pub last_ping: DateTime<Utc>,
    pub last_pong: DateTime<Utc>,
}

/// ハートビートタスク
pub async fn heartbeat_task(
    mut manager: HeartbeatManager,
    mut ping_sender: tokio::sync::mpsc::Sender<DateTime<Utc>>,
    mut pong_receiver: tokio::sync::mpsc::Receiver<DateTime<Utc>>,
) {
    let mut interval = interval(manager.config.interval);
    
    loop {
        tokio::select! {
            _ = interval.tick() => {
                // Pingを送信
                let ping_time = manager.send_ping();
                if ping_sender.send(ping_time).await.is_err() {
                    break;
                }
                
                // タイムアウトチェック
                if manager.check_timeout() {
                    log::warn!("Heartbeat timeout detected");
                    break;
                }
            }
            
            Some(ping_timestamp) = pong_receiver.recv() => {
                // Pongを受信
                manager.receive_pong(ping_timestamp);
                
                // アダプティブ調整後、インターバルを更新
                if manager.config.adaptive {
                    interval = interval::interval(manager.config.interval);
                }
            }
        }
    }
    
    log::info!("Heartbeat task ended with metrics: {:?}", manager.metrics());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_heartbeat_manager() {
        let config = HeartbeatConfig::default();
        let mut manager = HeartbeatManager::new(config);
        
        // 初期状態
        assert_eq!(manager.status(), HeartbeatStatus::Healthy);
        assert_eq!(manager.consecutive_failures, 0);
        
        // Ping送信
        let ping_time = manager.send_ping();
        
        // Pong受信（低レイテンシ）
        std::thread::sleep(std::time::Duration::from_millis(50));
        manager.receive_pong(ping_time);
        
        assert_eq!(manager.status(), HeartbeatStatus::Healthy);
        assert_eq!(manager.consecutive_failures, 0);
        assert!(manager.average_latency() < Duration::from_millis(100));
    }

    #[test]
    fn test_timeout_detection() {
        let mut config = HeartbeatConfig::default();
        config.timeout = Duration::from_millis(100);
        config.max_failures = 2;
        
        let mut manager = HeartbeatManager::new(config);
        
        // Ping送信
        manager.send_ping();
        
        // タイムアウト待機
        std::thread::sleep(std::time::Duration::from_millis(150));
        
        // 1回目のタイムアウト
        assert!(!manager.check_timeout());
        assert_eq!(manager.consecutive_failures, 1);
        assert_eq!(manager.status(), HeartbeatStatus::Error);
        
        // 2回目のタイムアウト
        assert!(manager.check_timeout());
        assert_eq!(manager.consecutive_failures, 2);
        assert_eq!(manager.status(), HeartbeatStatus::Disconnected);
    }

    #[test]
    fn test_adaptive_interval() {
        let mut config = HeartbeatConfig::default();
        config.adaptive = true;
        
        let mut manager = HeartbeatManager::new(config);
        
        // 高レイテンシをシミュレート
        for _ in 0..5 {
            manager.add_latency_sample(Duration::from_millis(600));
        }
        
        manager.adjust_interval();
        assert_eq!(manager.config.interval, Duration::from_secs(45));
        
        // 低レイテンシをシミュレート
        manager.latency_history.clear();
        for _ in 0..5 {
            manager.add_latency_sample(Duration::from_millis(50));
        }
        
        manager.adjust_interval();
        assert_eq!(manager.config.interval, Duration::from_secs(20));
    }
}