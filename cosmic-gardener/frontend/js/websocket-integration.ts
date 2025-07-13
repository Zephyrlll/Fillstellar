/**
 * WebSocketとゲーム状態の統合
 * 
 * WebSocketクライアントをゲームの状態管理システムと統合します
 */

import { gameState } from './state.js';
import { updateUI } from './ui.js';
import { showMessage } from './ui.js';
import { CosmicGardenerWebSocket, createWebSocketClient, GameState, Vec3 } from './websocket.js';

/**
 * WebSocket統合マネージャー
 */
export class WebSocketIntegration {
    private ws: CosmicGardenerWebSocket;
    private syncInterval: number | null = null;
    private lastSyncTime: number = 0;
    private pendingActions: Map<string, any> = new Map();
    
    constructor() {
        this.ws = createWebSocketClient({
            url: this.getWebSocketUrl(),
            maxRetries: 3,
            retryDelay: 2000,
            heartbeatInterval: 30000,
            reconnectOnClose: true
        });
        
        this.setupEventHandlers();
    }

    /**
     * WebSocketに接続
     */
    public async connect(token: string): Promise<void> {
        try {
            await this.ws.connect(token);
            this.startPeriodicSync();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            showMessage('サーバーに接続できませんでした', 'error');
            throw error;
        }
    }

    /**
     * 接続を切断
     */
    public disconnect(): void {
        this.stopPeriodicSync();
        this.ws.disconnect();
    }

    /**
     * 天体を作成
     */
    public createCelestialBody(bodyType: string, position: Vec3): void {
        // 楽観的更新：即座にローカル状態を更新
        this.optimisticUpdate('createCelestialBody', { bodyType, position });
        
        // サーバーにリクエスト送信
        this.ws.createCelestialBody(bodyType, position);
    }

    /**
     * ゲーム状態を保存
     */
    public saveGame(): void {
        const state = this.convertGameStateToWebSocket();
        this.ws.saveGame(state);
    }

    /**
     * 接続状態を取得
     */
    public isConnected(): boolean {
        return this.ws.isConnected();
    }

    /**
     * 手動で状態を同期
     */
    public syncState(): void {
        if (this.ws.isConnected()) {
            this.ws.getState();
        }
    }

    // プライベートメソッド

    private getWebSocketUrl(): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/api/ws`;
    }

    private setupEventHandlers(): void {
        this.ws.on('connected', () => {
            console.log('WebSocket connected');
            showMessage('サーバーに接続しました', 'success');
            this.syncState(); // 接続後即座に状態を同期
        });

        this.ws.on('disconnected', (data) => {
            console.log('WebSocket disconnected:', data);
            showMessage('サーバーから切断されました', 'warning');
            this.stopPeriodicSync();
        });

        this.ws.on('stateUpdate', (data) => {
            this.handleStateUpdate(data);
        });

        this.ws.on('actionResult', (data) => {
            this.handleActionResult(data);
        });

        this.ws.on('serverError', (error) => {
            this.handleServerError(error);
        });

        this.ws.on('stateChange', (data) => {
            this.handleConnectionStateChange(data);
        });
    }

    private handleStateUpdate(data: any): void {
        if (data.full) {
            // 完全な状態更新
            this.applyFullStateUpdate(data.data);
        } else {
            // 差分更新
            this.applyDeltaUpdate(data.data);
        }
        
        // UIを更新
        updateUI();
        this.lastSyncTime = Date.now();
    }

    private handleActionResult(data: any): void {
        if (data.success) {
            showMessage(data.message, 'success');
        } else {
            showMessage(data.message, 'error');
            // 失敗した場合は楽観的更新を元に戻す
            this.revertOptimisticUpdate();
        }
    }

    private handleServerError(error: any): void {
        console.error('Server error:', error);
        showMessage(`サーバーエラー: ${error.message}`, 'error');
        
        // 認証エラーの場合は再ログインを促す
        if (error.code === 'AUTH_REQUIRED') {
            this.handleAuthenticationRequired();
        }
    }

    private handleConnectionStateChange(data: any): void {
        console.log('Connection state changed:', data);
        
        // 接続状態に応じてUIを更新
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = data.to;
            statusElement.className = `connection-status ${data.to}`;
        }
    }

    private applyFullStateUpdate(serverState: any): void {
        try {
            // サーバーからの状態をローカル状態に反映
            const state = serverState.game_state;
            
            // リソース更新
            if (state.resources) {
                gameState.resources.cosmicDust = state.resources.cosmicDust as number;
                gameState.resources.energy = state.resources.energy as number;
                gameState.resources.organicMatter = state.resources.organicMatter as number;
                gameState.resources.biomass = state.resources.biomass as number;
                gameState.resources.darkMatter = state.resources.darkMatter as number;
                gameState.resources.thoughtPoints = state.resources.thoughtPoints as number;
            }
            
            // 天体データ更新
            if (state.celestial_bodies) {
                // TODO: 天体データの更新処理
                console.log('Updating celestial bodies:', state.celestial_bodies);
            }
            
            // 研究データ更新
            if (state.research) {
                // TODO: 研究データの更新処理
                console.log('Updating research:', state.research);
            }
            
            // 統計データ更新
            if (state.statistics) {
                // TODO: 統計データの更新処理
                console.log('Updating statistics:', state.statistics);
            }
            
        } catch (error) {
            console.error('Failed to apply state update:', error);
        }
    }

    private applyDeltaUpdate(deltaData: any): void {
        // TODO: 差分更新の実装
        console.log('Applying delta update:', deltaData);
    }

    private convertGameStateToWebSocket(): GameState {
        return {
            resources: {
                cosmicDust: gameState.cosmicDust,
                energy: gameState.energy,
                organicMatter: gameState.organicMatter,
                biomass: gameState.biomass,
                darkMatter: gameState.darkMatter,
                thoughtPoints: gameState.thoughtPoints
            },
            celestial_bodies: gameState.stars.map(star => ({
                // TODO: 天体データの変換
                id: star.uuid,
                type: star.userData.type,
                position: star.position,
                // その他のプロパティ
            })),
            research: {
                // TODO: 研究データの変換
                enhancedDust: gameState.researchEnhancedDust,
                advancedEnergy: gameState.researchAdvancedEnergy,
            },
            statistics: {
                // TODO: 統計データの変換
                gameYear: gameState.gameYear,
                totalDust: gameState.cosmicDust,
            }
        };
    }

    private optimisticUpdate(action: string, data: any): void {
        const updateId = crypto.randomUUID();
        this.pendingActions.set(updateId, { action, data, timestamp: Date.now() });
        
        // 楽観的更新の実行
        switch (action) {
            case 'createCelestialBody':
                this.optimisticCreateCelestialBody(data);
                break;
            // 他のアクションも実装
        }
    }

    private optimisticCreateCelestialBody(data: any): void {
        // TODO: 楽観的な天体作成
        console.log('Optimistic celestial body creation:', data);
    }

    private revertOptimisticUpdate(): void {
        // TODO: 楽観的更新の取り消し
        console.log('Reverting optimistic update');
        this.pendingActions.clear();
    }

    private startPeriodicSync(): void {
        // 5秒ごとに自動同期
        this.syncInterval = window.setInterval(() => {
            if (this.ws.isConnected()) {
                this.syncState();
            }
        }, 5000);
    }

    private stopPeriodicSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    private handleAuthenticationRequired(): void {
        this.disconnect();
        showMessage('認証が必要です。再ログインしてください', 'error');
        
        // TODO: ログイン画面に遷移
        // window.location.href = '/login';
    }
}

// グローバルなWebSocket統合インスタンス
export const wsIntegration = new WebSocketIntegration();

// 自動接続の設定
export function setupWebSocketIntegration(): void {
    // ページ読み込み時に自動接続を試行
    const token = localStorage.getItem('access_token');
    if (token) {
        wsIntegration.connect(token).catch(error => {
            console.error('Auto-connect failed:', error);
        });
    }
    
    // ページの閉じる前に切断
    window.addEventListener('beforeunload', () => {
        wsIntegration.disconnect();
    });
    
    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
        if (!wsIntegration.isConnected()) {
            const token = localStorage.getItem('access_token');
            if (token) {
                wsIntegration.connect(token);
            }
        }
    });
    
    window.addEventListener('offline', () => {
        wsIntegration.disconnect();
    });
}

// 使用例
export function exampleIntegration() {
    // WebSocket統合の初期化
    setupWebSocketIntegration();
    
    // 天体作成のテスト
    document.getElementById('create-planet')?.addEventListener('click', () => {
        wsIntegration.createCelestialBody('Planet', { x: 100, y: 200, z: 0 });
    });
    
    // 手動保存のテスト
    document.getElementById('save-game')?.addEventListener('click', () => {
        wsIntegration.saveGame();
    });
    
    // 接続状態の表示
    const statusElement = document.createElement('div');
    statusElement.id = 'connection-status';
    statusElement.textContent = 'disconnected';
    document.body.appendChild(statusElement);
}