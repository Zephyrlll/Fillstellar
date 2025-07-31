import { CrossGameResourceManager } from '../crossgame/CrossGameResourceManager';

export class ResourceTransferUI {
    private container: HTMLDivElement;
    private resourceManager: CrossGameResourceManager;
    private onResourceConverted: (type: string, amount: number) => void;
    
    constructor(
        resourceManager: CrossGameResourceManager,
        onResourceConverted: (type: string, amount: number) => void
    ) {
        this.resourceManager = resourceManager;
        this.onResourceConverted = onResourceConverted;
        this.createUI();
    }
    
    private createUI(): void {
        // メインコンテナ
        this.container = document.createElement('div');
        this.container.id = 'resourceTransferUI';
        this.container.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid rgba(100, 200, 255, 0.5);
            border-radius: 10px;
            color: white;
            font-family: Arial;
            display: none;
            overflow: hidden;
        `;
        
        // ヘッダー
        const header = document.createElement('div');
        header.style.cssText = `
            background: rgba(100, 200, 255, 0.2);
            padding: 15px 20px;
            border-bottom: 1px solid rgba(100, 200, 255, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h2 style="margin: 0;">クロスゲームリソース転送</h2>
            <button id="closeTransferUI" style="
                background: transparent;
                border: 1px solid white;
                color: white;
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">✕</button>
        `;
        
        // コンテンツエリア
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            max-height: calc(80vh - 100px);
            overflow-y: auto;
        `;
        
        // タブ
        const tabs = document.createElement('div');
        tabs.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid rgba(100, 200, 255, 0.3);
        `;
        tabs.innerHTML = `
            <button class="tab-button active" data-tab="import">インポート</button>
            <button class="tab-button" data-tab="connections">接続</button>
            <button class="tab-button" data-tab="history">履歴</button>
        `;
        
        // タブコンテンツ
        const tabContent = document.createElement('div');
        tabContent.id = 'tabContent';
        
        this.container.appendChild(header);
        content.appendChild(tabs);
        content.appendChild(tabContent);
        this.container.appendChild(content);
        document.body.appendChild(this.container);
        
        // イベントリスナー
        this.setupEventListeners();
        
        // 初期表示
        this.showImportTab();
    }
    
    private setupEventListeners(): void {
        // 閉じるボタン
        document.getElementById('closeTransferUI')?.addEventListener('click', () => {
            this.hide();
        });
        
        // タブ切り替え
        this.container.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLButtonElement;
                const tab = target.dataset.tab;
                
                // アクティブタブの更新
                this.container.querySelectorAll('.tab-button').forEach(b => {
                    b.classList.remove('active');
                });
                target.classList.add('active');
                
                // コンテンツ表示
                switch (tab) {
                    case 'import':
                        this.showImportTab();
                        break;
                    case 'connections':
                        this.showConnectionsTab();
                        break;
                    case 'history':
                        this.showHistoryTab();
                        break;
                }
            });
        });
        
        // スタイル追加
        const style = document.createElement('style');
        style.textContent = `
            .tab-button {
                background: transparent;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                padding: 10px 20px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
                border-bottom: 2px solid transparent;
            }
            
            .tab-button:hover {
                color: white;
            }
            
            .tab-button.active {
                color: white;
                border-bottom-color: rgba(100, 200, 255, 0.8);
            }
            
            .resource-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
            }
            
            .resource-item:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(100, 200, 255, 0.5);
            }
            
            .convert-button {
                background: rgba(100, 200, 255, 0.3);
                border: 1px solid rgba(100, 200, 255, 0.5);
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .convert-button:hover {
                background: rgba(100, 200, 255, 0.5);
                border-color: rgba(100, 200, 255, 0.8);
            }
            
            .connect-button {
                background: rgba(50, 200, 50, 0.3);
                border: 1px solid rgba(50, 200, 50, 0.5);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                width: 100%;
                margin-top: 10px;
                transition: all 0.3s ease;
            }
            
            .connect-button:hover {
                background: rgba(50, 200, 50, 0.5);
            }
        `;
        document.head.appendChild(style);
    }
    
    private showImportTab(): void {
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        const resources = this.resourceManager.getAvailableResources();
        const rules = this.resourceManager.getConversionRules();
        
        let html = '<h3>利用可能なリソース</h3>';
        
        if (resources.length === 0) {
            html += '<p style="color: #888;">インポート可能なリソースがありません。他のゲームと接続してください。</p>';
        } else {
            resources.forEach(resource => {
                // このリソースに適用可能な変換ルールを探す
                const applicableRules = rules.filter(
                    rule => (rule.fromGame === resource.sourceGame || rule.fromGame === 'generic') &&
                            rule.fromResource === resource.name
                );
                
                html += `
                    <div class="resource-item">
                        <div>
                            <strong>${resource.name}</strong>
                            <br>
                            <small style="color: #888;">
                                数量: ${resource.amount} | ソース: ${resource.sourceGame}
                            </small>
                        </div>
                        <div>
                `;
                
                if (applicableRules.length > 0) {
                    applicableRules.forEach(rule => {
                        const convertedAmount = Math.floor(resource.amount * rule.rate);
                        html += `
                            <button class="convert-button" 
                                onclick="window.convertResource('${resource.id}', '${rule.toResource}')">
                                → ${convertedAmount} ${rule.toResource}
                            </button>
                        `;
                    });
                } else {
                    html += '<small style="color: #666;">変換不可</small>';
                }
                
                html += `
                        </div>
                    </div>
                `;
            });
        }
        
        tabContent.innerHTML = html;
        
        // グローバル関数として変換処理を登録
        (window as any).convertResource = (resourceId: string, targetType: string) => {
            const result = this.resourceManager.convertResource(resourceId, targetType);
            if (result.success && result.amount) {
                this.onResourceConverted(targetType, result.amount);
                this.showImportTab(); // リフレッシュ
                
                // 通知を表示
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(50, 200, 50, 0.9);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 5px;
                    z-index: 10000;
                `;
                notification.textContent = result.message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
        };
    }
    
    private showConnectionsTab(): void {
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        const connections = this.resourceManager.getConnectedGames();
        
        let html = '<h3>ゲーム接続</h3>';
        
        // 接続済みゲーム
        if (connections.length > 0) {
            html += '<h4>接続済み</h4>';
            connections.forEach(conn => {
                html += `
                    <div class="resource-item">
                        <div>
                            <strong>${conn.gameName}</strong>
                            <br>
                            <small style="color: #888;">
                                最終同期: ${conn.lastSync ? new Date(conn.lastSync).toLocaleString() : '未同期'}
                            </small>
                        </div>
                        <div>
                            <span style="color: #4f4;">● 接続中</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // 接続可能なゲーム
        html += '<h4>接続可能なゲーム</h4>';
        
        // Cosmic Gardenerとの接続
        if (!connections.find(c => c.gameId === 'cosmic-gardener')) {
            html += `
                <div class="resource-item">
                    <div>
                        <strong>Cosmic Gardener (Fillstellar)</strong>
                        <br>
                        <small style="color: #888;">
                            宇宙の塵から始まる宇宙シミュレーション
                        </small>
                    </div>
                </div>
                <button class="connect-button" onclick="window.connectToCosmicGardener()">
                    接続する
                </button>
            `;
        }
        
        tabContent.innerHTML = html;
        
        // グローバル関数として接続処理を登録
        (window as any).connectToCosmicGardener = () => {
            const success = this.resourceManager.connectToGame(
                'cosmic-gardener',
                'Cosmic Gardener',
                'localStorage'
            );
            
            if (success) {
                this.showConnectionsTab(); // リフレッシュ
            }
        };
    }
    
    private showHistoryTab(): void {
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        const history = this.resourceManager.getExportHistory();
        
        let html = '<h3>転送履歴</h3>';
        
        if (history.length === 0) {
            html += '<p style="color: #888;">転送履歴はまだありません。</p>';
        } else {
            history.reverse().forEach(entry => {
                html += `
                    <div class="resource-item">
                        <div>
                            <strong>${entry.amount} ${entry.resource}</strong>
                            <br>
                            <small style="color: #888;">
                                ${new Date(entry.timestamp).toLocaleString()} → ${entry.toGame}
                            </small>
                        </div>
                    </div>
                `;
            });
        }
        
        tabContent.innerHTML = html;
    }
    
    public show(): void {
        this.container.style.display = 'block';
        this.showImportTab(); // 最新の状態を表示
    }
    
    public hide(): void {
        this.container.style.display = 'none';
    }
    
    public toggle(): void {
        if (this.container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }
}