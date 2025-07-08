//! WebSocketブロードキャスター
//!
//! 複数のクライアントに効率的にメッセージを送信します

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::websocket::messages::ServerMessage;
use crate::websocket::session::SessionManager;

/// ブロードキャスター
pub struct WebSocketBroadcaster {
    session_manager: Arc<RwLock<SessionManager>>,
    message_queue: Arc<RwLock<Vec<BroadcastMessage>>>,
}

/// ブロードキャストメッセージ
#[derive(Debug, Clone)]
pub struct BroadcastMessage {
    pub target: BroadcastTarget,
    pub message: ServerMessage,
    pub priority: MessagePriority,
}

/// ブロードキャスト対象
#[derive(Debug, Clone)]
pub enum BroadcastTarget {
    /// 全体
    All,
    /// 特定のユーザー
    User(Uuid),
    /// 複数のユーザー
    Users(Vec<Uuid>),
}

/// メッセージ優先度
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum MessagePriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

impl WebSocketBroadcaster {
    /// 新しいブロードキャスターを作成
    pub fn new(session_manager: Arc<RwLock<SessionManager>>) -> Self {
        Self {
            session_manager,
            message_queue: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// メッセージをキューに追加
    pub async fn queue_message(&self, message: BroadcastMessage) {
        let mut queue = self.message_queue.write().await;
        queue.push(message);
        
        // 優先度でソート
        queue.sort_by(|a, b| b.priority.cmp(&a.priority));
    }

    /// 全ユーザーにブロードキャスト
    pub async fn broadcast_to_all(&self, message: ServerMessage) {
        self.queue_message(BroadcastMessage {
            target: BroadcastTarget::All,
            message,
            priority: MessagePriority::Normal,
        }).await;
    }

    /// 特定のユーザーに送信
    pub async fn send_to_user(&self, user_id: Uuid, message: ServerMessage) {
        self.queue_message(BroadcastMessage {
            target: BroadcastTarget::User(user_id),
            message,
            priority: MessagePriority::Normal,
        }).await;
    }

    /// 複数のユーザーに送信
    pub async fn send_to_users(&self, user_ids: Vec<Uuid>, message: ServerMessage) {
        self.queue_message(BroadcastMessage {
            target: BroadcastTarget::Users(user_ids),
            message,
            priority: MessagePriority::Normal,
        }).await;
    }

    /// 高優先度メッセージを送信
    pub async fn send_urgent(&self, target: BroadcastTarget, message: ServerMessage) {
        self.queue_message(BroadcastMessage {
            target,
            message,
            priority: MessagePriority::High,
        }).await;
    }

    /// キューからメッセージを処理
    pub async fn process_queue(&self) -> usize {
        let mut queue = self.message_queue.write().await;
        let message_count = queue.len();
        
        // TODO: 実際のWebSocket送信処理
        // 現在はログ出力のみ
        for msg in queue.drain(..) {
            match msg.target {
                BroadcastTarget::All => {
                    log::info!("Broadcasting to all users: {:?}", msg.message);
                }
                BroadcastTarget::User(user_id) => {
                    log::info!("Sending to user {}: {:?}", user_id, msg.message);
                }
                BroadcastTarget::Users(user_ids) => {
                    log::info!("Sending to {} users: {:?}", user_ids.len(), msg.message);
                }
            }
        }
        
        message_count
    }

    /// 送信統計を取得
    pub async fn get_stats(&self) -> BroadcastStats {
        let queue = self.message_queue.read().await;
        let session_manager = self.session_manager.read().await;
        
        BroadcastStats {
            queued_messages: queue.len(),
            active_sessions: session_manager.active_session_count(),
            total_users: session_manager.user_sessions.len(),
        }
    }
}

/// ブロードキャスト統計
#[derive(Debug, serde::Serialize)]
pub struct BroadcastStats {
    pub queued_messages: usize,
    pub active_sessions: usize,
    pub total_users: usize,
}

/// 定期的なブロードキャスト処理
pub async fn broadcast_worker(broadcaster: Arc<WebSocketBroadcaster>) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(100));
    
    loop {
        interval.tick().await;
        
        let processed = broadcaster.process_queue().await;
        if processed > 0 {
            log::debug!("Processed {} broadcast messages", processed);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::websocket::session::SessionManager;

    #[tokio::test]
    async fn test_broadcaster() {
        let session_manager = Arc::new(RwLock::new(SessionManager::new()));
        let broadcaster = WebSocketBroadcaster::new(session_manager);
        
        // メッセージをキューに追加
        broadcaster.broadcast_to_all(ServerMessage::Heartbeat).await;
        
        let stats = broadcaster.get_stats().await;
        assert_eq!(stats.queued_messages, 1);
        
        // キューを処理
        let processed = broadcaster.process_queue().await;
        assert_eq!(processed, 1);
        
        let stats = broadcaster.get_stats().await;
        assert_eq!(stats.queued_messages, 0);
    }

    #[tokio::test]
    async fn test_priority_ordering() {
        let session_manager = Arc::new(RwLock::new(SessionManager::new()));
        let broadcaster = WebSocketBroadcaster::new(session_manager);
        
        // 異なる優先度のメッセージを追加
        broadcaster.queue_message(BroadcastMessage {
            target: BroadcastTarget::All,
            message: ServerMessage::Heartbeat,
            priority: MessagePriority::Low,
        }).await;
        
        broadcaster.queue_message(BroadcastMessage {
            target: BroadcastTarget::All,
            message: ServerMessage::Heartbeat,
            priority: MessagePriority::Critical,
        }).await;
        
        broadcaster.queue_message(BroadcastMessage {
            target: BroadcastTarget::All,
            message: ServerMessage::Heartbeat,
            priority: MessagePriority::Normal,
        }).await;
        
        let queue = broadcaster.message_queue.read().await;
        
        // 優先度順にソートされているか確認
        assert_eq!(queue[0].priority, MessagePriority::Critical);
        assert_eq!(queue[1].priority, MessagePriority::Normal);
        assert_eq!(queue[2].priority, MessagePriority::Low);
    }
}