/**
 * Cosmic Gardener WebSocket Client
 * 
 * リアルタイム通信を管理するWebSocketクライアント
 */

// メッセージ型定義
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface GameState {
    resources: any;
    celestial_bodies: any[];
    research: any;
    statistics: any;
}

export interface StateData {
    game_state: GameState;
    timestamp: string;
}

// クライアントメッセージ
export type ClientMessage = 
    | { type: 'GetState' }
    | { type: 'CreateCelestialBody'; data: { body_type: string; position: Vec3 } }
    | { type: 'SaveGame'; data: { state: GameState } }
    | { type: 'Heartbeat' };

// サーバーメッセージ
export type ServerMessage =
    | { type: 'StateUpdate'; data: { full: boolean; data: StateData } }
    | { type: 'ActionResult'; data: { success: boolean; message: string } }
    | { type: 'Error'; data: { code: string; message: string } }
    | { type: 'Heartbeat' };

// 接続状態
export enum ConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Failed = 'failed'
}

// WebSocketクライアント設定
export interface WebSocketConfig {
    url: string;
    token: string;
    maxRetries: number;
    retryDelay: number;
    heartbeatInterval: number;
    reconnectOnClose: boolean;
}

// イベントハンドラー型
export type EventHandler<T = any> = (data: T) => void;

/**
 * WebSocketクライアント
 */
export class CosmicGardenerWebSocket {
    private ws: WebSocket | null = null;
    private config: WebSocketConfig;
    private state: ConnectionState = ConnectionState.Disconnected;
    private retryCount = 0;
    private heartbeatTimer: number | null = null;
    private reconnectTimer: number | null = null;
    
    // イベントハンドラー
    private eventHandlers: Map<string, Set<EventHandler>> = new Map();
    
    constructor(config: Partial<WebSocketConfig> = {}) {
        this.config = {
            url: 'ws://localhost:8080/api/ws',
            token: '',
            maxRetries: 5,
            retryDelay: 1000,
            heartbeatInterval: 30000,
            reconnectOnClose: true,
            ...config
        };
    }

    /**
     * WebSocket接続を開始
     */
    public async connect(token?: string): Promise<void> {
        if (token) {
            this.config.token = token;
        }

        if (!this.config.token) {
            throw new Error('認証トークンが設定されていません');
        }

        if (this.state === ConnectionState.Connected) {
            console.warn('WebSocket is already connected');
            return;
        }

        this.setState(ConnectionState.Connecting);
        
        try {
            const wsUrl = `${this.config.url}?token=${encodeURIComponent(this.config.token)}`;
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = this.onOpen.bind(this);
            this.ws.onmessage = this.onMessage.bind(this);
            this.ws.onclose = this.onClose.bind(this);
            this.ws.onerror = this.onError.bind(this);
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.setState(ConnectionState.Failed);
            throw error;
        }
    }

    /**
     * WebSocket接続を切断
     */
    public disconnect(): void {
        this.config.reconnectOnClose = false;
        this.clearTimers();
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.setState(ConnectionState.Disconnected);
    }

    /**
     * メッセージを送信
     */
    public send(message: ClientMessage): void {
        if (this.state !== ConnectionState.Connected || !this.ws) {
            console.warn('WebSocket is not connected');
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    /**
     * ゲーム状態を取得
     */
    public getState(): void {
        this.send({ type: 'GetState' });
    }

    /**
     * 天体を作成
     */
    public createCelestialBody(bodyType: string, position: Vec3): void {
        this.send({
            type: 'CreateCelestialBody',
            data: { body_type: bodyType, position }
        });
    }

    /**
     * ゲームを保存
     */
    public saveGame(state: GameState): void {
        this.send({
            type: 'SaveGame',
            data: { state }
        });
    }

    /**
     * イベントハンドラーを登録
     */
    public on(event: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
    }

    /**
     * イベントハンドラーを削除
     */
    public off(event: string, handler: EventHandler): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * 現在の接続状態を取得
     */
    public getState(): ConnectionState {
        return this.state;
    }

    /**
     * 接続されているかチェック
     */
    public isConnected(): boolean {
        return this.state === ConnectionState.Connected;
    }

    // プライベートメソッド

    private onOpen(): void {
        console.log('WebSocket connected');
        this.setState(ConnectionState.Connected);
        this.retryCount = 0;
        this.startHeartbeat();
        this.emit('connected');
    }

    private onMessage(event: MessageEvent): void {
        try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    private onClose(event: CloseEvent): void {
        console.log('WebSocket closed:', event.code, event.reason);
        this.clearTimers();
        this.setState(ConnectionState.Disconnected);
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        if (this.config.reconnectOnClose && event.code !== 1000) {
            this.scheduleReconnect();
        }
    }

    private onError(error: Event): void {
        console.error('WebSocket error:', error);
        this.emit('error', error);
    }

    private handleServerMessage(message: ServerMessage): void {
        switch (message.type) {
            case 'StateUpdate':
                this.emit('stateUpdate', message.data);
                break;
            
            case 'ActionResult':
                this.emit('actionResult', message.data);
                if (message.data.success) {
                    this.emit('success', message.data.message);
                } else {
                    this.emit('error', message.data.message);
                }
                break;
            
            case 'Error':
                this.emit('serverError', message.data);
                console.error('Server error:', message.data.code, message.data.message);
                break;
            
            case 'Heartbeat':
                // ハートビート応答は何もしない
                break;
        }
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = window.setInterval(() => {
            this.send({ type: 'Heartbeat' });
        }, this.config.heartbeatInterval);
    }

    private scheduleReconnect(): void {
        if (this.retryCount >= this.config.maxRetries) {
            console.error('Max retry attempts reached');
            this.setState(ConnectionState.Failed);
            return;
        }

        this.setState(ConnectionState.Reconnecting);
        this.retryCount++;
        
        const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);
        
        this.reconnectTimer = window.setTimeout(() => {
            this.connect();
        }, delay);
    }

    private clearTimers(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private setState(newState: ConnectionState): void {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.emit('stateChange', { from: oldState, to: newState });
        }
    }

    private emit(event: string, data?: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
}

/**
 * WebSocketクライアントのファクトリー関数
 */
export function createWebSocketClient(config?: Partial<WebSocketConfig>): CosmicGardenerWebSocket {
    return new CosmicGardenerWebSocket(config);
}

/**
 * 使用例
 */
export function exampleUsage() {
    const ws = createWebSocketClient({
        url: 'ws://localhost:8080/api/ws',
        token: 'your-jwt-token'
    });

    // イベントハンドラーを登録
    ws.on('connected', () => {
        console.log('Connected to server');
        ws.getState(); // 接続後に状態を取得
    });

    ws.on('stateUpdate', (data) => {
        console.log('State updated:', data);
        // UIを更新する処理
    });

    ws.on('actionResult', (data) => {
        if (data.success) {
            console.log('Action succeeded:', data.message);
        } else {
            console.error('Action failed:', data.message);
        }
    });

    ws.on('serverError', (error) => {
        console.error('Server error:', error);
    });

    ws.on('disconnected', (data) => {
        console.log('Disconnected:', data);
    });

    // 接続開始
    ws.connect();

    // 使用例
    setTimeout(() => {
        ws.createCelestialBody('Planet', { x: 100, y: 200, z: 0 });
    }, 1000);
}