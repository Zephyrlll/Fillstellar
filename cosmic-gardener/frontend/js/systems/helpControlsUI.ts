/**
 * Help & Controls UI
 * ヘルプとコントロール画面の実装
 */

import { animationSystem } from './simpleAnimations.js';

export class HelpControlsUI {
    private static instance: HelpControlsUI;
    private container: HTMLDivElement | null = null;
    private overlay: HTMLDivElement | null = null;
    private isOpen: boolean = false;
    private currentTab: 'controls' | 'tips' | 'shortcuts' = 'controls';
    
    private constructor() {}
    
    static getInstance(): HelpControlsUI {
        if (!HelpControlsUI.instance) {
            HelpControlsUI.instance = new HelpControlsUI();
        }
        return HelpControlsUI.instance;
    }
    
    open(tab?: 'controls' | 'tips' | 'shortcuts'): void {
        if (this.isOpen) return;
        
        if (tab) {
            this.currentTab = tab;
        }
        
        this.createUI();
        this.isOpen = true;
        
        // アニメーション
        if (this.overlay && this.container) {
            animationSystem.fadeIn(this.overlay);
            animationSystem.scaleIn(this.container);
        }
    }
    
    close(): void {
        if (!this.isOpen) return;
        
        if (this.overlay && this.container) {
            animationSystem.fadeOut(this.overlay, () => {
                this.overlay?.remove();
                this.overlay = null;
            });
            
            animationSystem.scaleOut(this.container, () => {
                this.container?.remove();
                this.container = null;
            });
        }
        
        this.isOpen = false;
    }
    
    private createUI(): void {
        // オーバーレイ
        this.overlay = document.createElement('div');
        this.overlay.className = 'help-controls-overlay';
        this.overlay.addEventListener('click', () => this.close());
        
        // コンテナ
        this.container = document.createElement('div');
        this.container.className = 'help-controls-container';
        this.container.addEventListener('click', (e) => e.stopPropagation());
        
        // スタイル
        const style = document.createElement('style');
        style.textContent = `
            .help-controls-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                opacity: 0;
            }
            
            .help-controls-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                border: 2px solid #5ca9fb;
                border-radius: 15px;
                padding: 30px;
                width: 800px;
                max-width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(92, 169, 251, 0.4);
                opacity: 0;
            }
            
            .help-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #5ca9fb;
            }
            
            .help-title {
                font-size: 28px;
                color: #5ca9fb;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(92, 169, 251, 0.5);
            }
            
            .help-close {
                background: none;
                border: 2px solid #5ca9fb;
                color: #5ca9fb;
                font-size: 20px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .help-close:hover {
                background: #5ca9fb;
                color: #1e3c72;
                transform: rotate(90deg);
            }
            
            .help-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .help-tab {
                background: rgba(92, 169, 251, 0.1);
                border: 1px solid #5ca9fb;
                color: #5ca9fb;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
            }
            
            .help-tab:hover {
                background: rgba(92, 169, 251, 0.2);
            }
            
            .help-tab.active {
                background: #5ca9fb;
                color: #1e3c72;
            }
            
            .help-content {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                padding: 20px;
            }
            
            .control-section {
                margin-bottom: 25px;
            }
            
            .control-section-title {
                font-size: 20px;
                color: #5ca9fb;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(92, 169, 251, 0.3);
            }
            
            .control-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(92, 169, 251, 0.05);
                border-radius: 5px;
                transition: all 0.3s ease;
            }
            
            .control-item:hover {
                background: rgba(92, 169, 251, 0.1);
                transform: translateX(5px);
            }
            
            .control-action {
                color: #fff;
                font-size: 16px;
            }
            
            .control-key {
                background: rgba(92, 169, 251, 0.2);
                border: 1px solid #5ca9fb;
                color: #5ca9fb;
                padding: 5px 15px;
                border-radius: 5px;
                font-family: monospace;
                font-weight: bold;
            }
            
            .tip-card {
                background: rgba(92, 169, 251, 0.1);
                border: 1px solid #5ca9fb;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 15px;
                transition: all 0.3s ease;
            }
            
            .tip-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(92, 169, 251, 0.3);
            }
            
            .tip-icon {
                font-size: 24px;
                margin-bottom: 10px;
            }
            
            .tip-title {
                font-size: 18px;
                color: #5ca9fb;
                margin-bottom: 10px;
                font-weight: bold;
            }
            
            .tip-description {
                color: #e0e0e0;
                line-height: 1.6;
            }
            
            .shortcut-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            
            .shortcut-category {
                background: rgba(92, 169, 251, 0.05);
                border-radius: 8px;
                padding: 15px;
            }
            
            .shortcut-category-title {
                font-size: 18px;
                color: #5ca9fb;
                margin-bottom: 10px;
                font-weight: bold;
            }
            
            .shortcut-list {
                display: grid;
                gap: 8px;
            }
            
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .shortcut-description {
                color: #e0e0e0;
                font-size: 14px;
            }
            
            .shortcut-keys {
                display: flex;
                gap: 5px;
            }
            
            .key {
                background: rgba(92, 169, 251, 0.2);
                border: 1px solid #5ca9fb;
                color: #5ca9fb;
                padding: 3px 8px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 12px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
        
        this.updateContent();
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.container);
    }
    
    private updateContent(): void {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="help-header">
                <h2 class="help-title">❓ ヘルプ & コントロール</h2>
                <button class="help-close">×</button>
            </div>
            
            <div class="help-tabs">
                <button class="help-tab ${this.currentTab === 'controls' ? 'active' : ''}" data-tab="controls">
                    操作方法
                </button>
                <button class="help-tab ${this.currentTab === 'tips' ? 'active' : ''}" data-tab="tips">
                    ゲームのヒント
                </button>
                <button class="help-tab ${this.currentTab === 'shortcuts' ? 'active' : ''}" data-tab="shortcuts">
                    ショートカット
                </button>
            </div>
            
            <div class="help-content">
                ${this.renderTabContent()}
            </div>
        `;
        
        // イベントリスナー
        const closeBtn = this.container.querySelector('.help-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // タブ切り替え
        const tabs = this.container.querySelectorAll('.help-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-tab') as 'controls' | 'tips' | 'shortcuts';
                if (tabType) {
                    this.currentTab = tabType;
                    this.updateContent();
                }
            });
        });
    }
    
    private renderTabContent(): string {
        switch (this.currentTab) {
            case 'controls':
                return this.renderControls();
            case 'tips':
                return this.renderTips();
            case 'shortcuts':
                return this.renderShortcuts();
            default:
                return '';
        }
    }
    
    private renderControls(): string {
        return `
            <div class="control-section">
                <h3 class="control-section-title">🖱️ マウス操作</h3>
                <div class="control-item">
                    <span class="control-action">カメラ回転</span>
                    <span class="control-key">左ドラッグ</span>
                </div>
                <div class="control-item">
                    <span class="control-action">カメラ移動</span>
                    <span class="control-key">右ドラッグ</span>
                </div>
                <div class="control-item">
                    <span class="control-action">ズーム</span>
                    <span class="control-key">スクロール</span>
                </div>
                <div class="control-item">
                    <span class="control-action">天体選択</span>
                    <span class="control-key">左クリック</span>
                </div>
                <div class="control-item">
                    <span class="control-action">天体情報</span>
                    <span class="control-key">右クリック</span>
                </div>
            </div>
            
            <div class="control-section">
                <h3 class="control-section-title">⌨️ キーボード操作</h3>
                <div class="control-item">
                    <span class="control-action">一時停止/再開</span>
                    <span class="control-key">Space</span>
                </div>
                <div class="control-item">
                    <span class="control-action">速度変更</span>
                    <span class="control-key">1-5</span>
                </div>
                <div class="control-item">
                    <span class="control-action">セーブ</span>
                    <span class="control-key">Ctrl + S</span>
                </div>
                <div class="control-item">
                    <span class="control-action">ロード</span>
                    <span class="control-key">Ctrl + L</span>
                </div>
                <div class="control-item">
                    <span class="control-action">全画面</span>
                    <span class="control-key">F11</span>
                </div>
            </div>
            
            <div class="control-section">
                <h3 class="control-section-title">📱 タッチ操作（モバイル）</h3>
                <div class="control-item">
                    <span class="control-action">カメラ回転</span>
                    <span class="control-key">1本指スワイプ</span>
                </div>
                <div class="control-item">
                    <span class="control-action">ズーム</span>
                    <span class="control-key">ピンチ</span>
                </div>
                <div class="control-item">
                    <span class="control-action">天体選択</span>
                    <span class="control-key">タップ</span>
                </div>
            </div>
        `;
    }
    
    private renderTips(): string {
        const tips = [
            {
                icon: '💫',
                title: '効率的な資源生成',
                description: '恒星は温度が高いほどエネルギーを多く生成します。研究を進めることで生成効率を向上できます。'
            },
            {
                icon: '🌱',
                title: '生命の誕生',
                description: '居住可能性が70%以上の惑星でのみ生命が誕生します。海洋惑星と地球型惑星が最適です。'
            },
            {
                icon: '🔬',
                title: '研究の優先順位',
                description: '基礎研究から始めて、徐々に高度な研究にアンロックしていきましょう。「強化された塵生成」は序盤の必須研究です。'
            },
            {
                icon: '⚡',
                title: 'エネルギー管理',
                description: 'エネルギーは多くのアップグレードに必要です。恒星を複数作成して安定供給を確保しましょう。'
            },
            {
                icon: '🌌',
                title: '天体配置のコツ',
                description: '天体同士が近すぎると衝突する可能性があります。適度な距離を保って配置しましょう。'
            },
            {
                icon: '💰',
                title: '資源変換',
                description: '変換エンジンを使って低級資源を高級資源に変換できます。効率的な変換チェーンを構築しましょう。'
            },
            {
                icon: '🏆',
                title: '実績システム',
                description: '様々な実績を達成することでボーナスが得られます。実績画面で進捗を確認しましょう。'
            },
            {
                icon: '🚀',
                title: '自動化の活用',
                description: '研究が進むと様々な自動化機能がアンロックされます。退屈な作業を自動化して効率を上げましょう。'
            }
        ];
        
        return tips.map(tip => `
            <div class="tip-card">
                <div class="tip-icon">${tip.icon}</div>
                <div class="tip-title">${tip.title}</div>
                <div class="tip-description">${tip.description}</div>
            </div>
        `).join('');
    }
    
    private renderShortcuts(): string {
        return `
            <div class="shortcut-grid">
                <div class="shortcut-category">
                    <h4 class="shortcut-category-title">🎮 ゲーム操作</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <span class="shortcut-description">一時停止</span>
                            <div class="shortcut-keys">
                                <span class="key">Space</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">速度x1</span>
                            <div class="shortcut-keys">
                                <span class="key">1</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">速度x2</span>
                            <div class="shortcut-keys">
                                <span class="key">2</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">速度x5</span>
                            <div class="shortcut-keys">
                                <span class="key">5</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="shortcut-category">
                    <h4 class="shortcut-category-title">💾 ファイル操作</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <span class="shortcut-description">セーブ</span>
                            <div class="shortcut-keys">
                                <span class="key">Ctrl</span>
                                <span class="key">S</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">ロード</span>
                            <div class="shortcut-keys">
                                <span class="key">Ctrl</span>
                                <span class="key">L</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">エクスポート</span>
                            <div class="shortcut-keys">
                                <span class="key">Ctrl</span>
                                <span class="key">E</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="shortcut-category">
                    <h4 class="shortcut-category-title">🎨 表示操作</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <span class="shortcut-description">全画面</span>
                            <div class="shortcut-keys">
                                <span class="key">F11</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">UI表示切替</span>
                            <div class="shortcut-keys">
                                <span class="key">H</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">統計表示</span>
                            <div class="shortcut-keys">
                                <span class="key">Tab</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="shortcut-category">
                    <h4 class="shortcut-category-title">🔧 デバッグ</h4>
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <span class="shortcut-description">コンソール</span>
                            <div class="shortcut-keys">
                                <span class="key">F12</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">FPS表示</span>
                            <div class="shortcut-keys">
                                <span class="key">Shift</span>
                                <span class="key">F</span>
                            </div>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-description">パフォーマンス</span>
                            <div class="shortcut-keys">
                                <span class="key">Shift</span>
                                <span class="key">P</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// グローバルに公開
(window as any).helpControlsUI = HelpControlsUI.getInstance();