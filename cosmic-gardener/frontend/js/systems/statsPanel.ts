// 統計パネルシステム
import { gameState } from '../state';
import { formatNumber } from '../utils';

export interface StatsPanelConfig {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
    scale: number;
    items: {
        [key: string]: {
            enabled: boolean;
            order: number;
            label?: string;
        };
    };
}

const defaultConfig: StatsPanelConfig = {
    position: 'bottom-right',
    opacity: 0.8,
    scale: 1.0,
    items: {
        cosmicDust: { enabled: true, order: 1, label: '塵' },
        energy: { enabled: true, order: 2, label: 'エネルギー' },
        celestialBodies: { enabled: true, order: 3, label: '天体' },
        thoughtPoints: { enabled: true, order: 4, label: 'TP' },
        cosmicActivity: { enabled: true, order: 5, label: '活発度' },
        population: { enabled: true, order: 6, label: '人口' },
        // 通貨セクション
        currencyDust: { enabled: false, order: 7, label: '💫' },
        currencyGalactic: { enabled: false, order: 8, label: '💎' },
        currencyAncient: { enabled: false, order: 9, label: '🏺' },
        // 追加統計
        organicMatter: { enabled: false, order: 10, label: '有機物' },
        biomass: { enabled: false, order: 11, label: 'バイオマス' },
        darkMatter: { enabled: false, order: 12, label: 'ダーク' },
        fps: { enabled: false, order: 13, label: 'FPS' },
        year: { enabled: false, order: 14, label: '年' }
    }
};

class StatsPanel {
    private config: StatsPanelConfig;
    private container: HTMLElement | null = null;
    private updateInterval: number | null = null;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): StatsPanelConfig {
        const saved = localStorage.getItem('statsPanelConfig');
        if (saved) {
            try {
                return { ...defaultConfig, ...JSON.parse(saved) };
            } catch (e) {
                console.error('[STATS] Failed to load config:', e);
            }
        }
        return { ...defaultConfig };
    }

    public saveConfig() {
        localStorage.setItem('statsPanelConfig', JSON.stringify(this.config));
    }

    public initialize() {
        this.createPanel();
        this.applyConfig();
        this.startUpdating();
    }

    private createPanel() {
        // 既存のパネルがあれば削除
        if (this.container) {
            this.container.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'stats-panel';
        this.container.className = 'stats-panel modern-panel';
        
        // ヘッダー
        const header = document.createElement('div');
        header.className = 'stats-panel-header';
        header.innerHTML = `
            <span class="stats-title">📊 統計</span>
            <button class="stats-settings-btn" title="設定">⚙️</button>
        `;

        // コンテンツ
        const content = document.createElement('div');
        content.className = 'stats-panel-content';
        content.id = 'stats-panel-content';

        this.container.appendChild(header);
        this.container.appendChild(content);
        
        // game-containerに追加
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.container);
        }

        // 設定ボタンのイベント
        const settingsBtn = header.querySelector('.stats-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
    }

    private applyConfig() {
        if (!this.container) return;

        // 位置の適用
        this.container.className = `stats-panel modern-panel ${this.config.position}`;
        
        // 透明度とスケールの適用
        this.container.style.opacity = this.config.opacity.toString();
        this.container.style.transform = `scale(${this.config.scale})`;
        
        // transform-originを位置に応じて設定
        switch (this.config.position) {
            case 'top-left':
                this.container.style.transformOrigin = 'top left';
                break;
            case 'top-right':
                this.container.style.transformOrigin = 'top right';
                break;
            case 'bottom-left':
                this.container.style.transformOrigin = 'bottom left';
                break;
            case 'bottom-right':
                this.container.style.transformOrigin = 'bottom right';
                break;
        }
    }

    private startUpdating() {
        // 既存のインターバルをクリア
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // 即座に更新
        this.updateContent();

        // 定期更新（0.5秒ごと）
        this.updateInterval = window.setInterval(() => {
            this.updateContent();
        }, 500);
    }

    private updateContent() {
        const content = document.getElementById('stats-panel-content');
        if (!content) return;

        // 有効なアイテムを順序でソート
        const enabledItems = Object.entries(this.config.items)
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => a[1].order - b[1].order);

        const items: string[] = [];
        let hasCurrency = false;

        for (const [key, config] of enabledItems) {
            const value = this.getStatValue(key);
            if (value !== null) {
                if (key.startsWith('currency')) {
                    if (!hasCurrency) {
                        items.push('<hr class="stats-divider">');
                        hasCurrency = true;
                    }
                }
                items.push(`
                    <div class="stat-item" data-key="${key}">
                        <span class="stat-label">${config.label || key}:</span>
                        <span class="stat-value">${value}</span>
                    </div>
                `);
            }
        }

        content.innerHTML = items.join('');
    }

    private getStatValue(key: string): string | null {
        switch (key) {
            case 'cosmicDust':
                // 塵の生成レートを計算（天体数に基づく簡易計算）
                const dustRate = (gameState.celestialBodies?.length || 0) * 0.1;
                return `${formatNumber(gameState.resources?.cosmicDust || 0)} <span class="resource-rate">(+${formatNumber(dustRate)}/s)</span>`;
            case 'energy':
                return formatNumber(gameState.resources?.energy || 0);
            case 'celestialBodies':
                return (gameState.celestialBodies?.length || 0).toString();
            case 'thoughtPoints':
                return formatNumber(gameState.resources?.thoughtPoints || 0);
            case 'cosmicActivity':
                return formatNumber(gameState.statistics?.cosmicActivity || 0);
            case 'population':
                return formatNumber(typeof gameState.getTotalPopulation === 'function' ? gameState.getTotalPopulation() : 0);
            case 'organicMatter':
                return formatNumber(gameState.resources?.organicMatter || 0);
            case 'biomass':
                return formatNumber(gameState.resources?.biomass || 0);
            case 'darkMatter':
                return formatNumber(gameState.resources?.darkMatter || 0);
            case 'year':
                return Math.floor(gameState.currentYear || 0).toString();
            case 'fps':
                return Math.round((window as any).currentFPS || 60).toString();
            // 通貨（未実装の場合は0）
            case 'currencyDust':
            case 'currencyGalactic':
            case 'currencyAncient':
                return '0';
            default:
                return null;
        }
    }

    private showSettings() {
        // 設定モーダルの作成
        const modal = document.createElement('div');
        modal.className = 'stats-settings-modal';
        modal.innerHTML = `
            <div class="stats-settings-content">
                <h3>統計パネル設定</h3>
                
                <div class="settings-section">
                    <label>位置:</label>
                    <select id="stats-position">
                        <option value="top-left">左上</option>
                        <option value="top-right">右上</option>
                        <option value="bottom-left">左下</option>
                        <option value="bottom-right">右下</option>
                    </select>
                </div>
                
                <div class="settings-section">
                    <label>透明度: <span id="opacity-value">${Math.round(this.config.opacity * 100)}%</span></label>
                    <input type="range" id="stats-opacity" min="20" max="100" value="${this.config.opacity * 100}" step="5">
                </div>
                
                <div class="settings-section">
                    <label>スケール: <span id="scale-value">${Math.round(this.config.scale * 100)}%</span></label>
                    <input type="range" id="stats-scale" min="50" max="150" value="${this.config.scale * 100}" step="10">
                </div>
                
                <div class="settings-section">
                    <h4>表示項目</h4>
                    <div class="stats-items-list">
                        ${this.renderItemsList()}
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn-save">保存</button>
                    <button class="btn-cancel">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー
        this.setupSettingsListeners(modal);
    }

    private renderItemsList(): string {
        return Object.entries(this.config.items)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([key, config]) => `
                <div class="stat-item-config">
                    <label>
                        <input type="checkbox" data-key="${key}" ${config.enabled ? 'checked' : ''}>
                        ${config.label || key}
                    </label>
                </div>
            `).join('');
    }

    private setupSettingsListeners(modal: HTMLElement) {
        // 位置選択
        const positionSelect = modal.querySelector('#stats-position') as HTMLSelectElement;
        if (positionSelect) {
            positionSelect.value = this.config.position;
            positionSelect.addEventListener('change', () => {
                this.config.position = positionSelect.value as any;
                this.applyConfig();
            });
        }

        // 透明度
        const opacityInput = modal.querySelector('#stats-opacity') as HTMLInputElement;
        const opacityValue = modal.querySelector('#opacity-value');
        if (opacityInput && opacityValue) {
            opacityInput.addEventListener('input', () => {
                const value = parseInt(opacityInput.value) / 100;
                this.config.opacity = value;
                opacityValue.textContent = `${opacityInput.value}%`;
                this.applyConfig();
            });
        }

        // スケール
        const scaleInput = modal.querySelector('#stats-scale') as HTMLInputElement;
        const scaleValue = modal.querySelector('#scale-value');
        if (scaleInput && scaleValue) {
            scaleInput.addEventListener('input', () => {
                const value = parseInt(scaleInput.value) / 100;
                this.config.scale = value;
                scaleValue.textContent = `${scaleInput.value}%`;
                this.applyConfig();
            });
        }

        // 表示項目のチェックボックス
        modal.querySelectorAll('.stat-item-config input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const key = target.dataset.key;
                if (key && this.config.items[key]) {
                    this.config.items[key].enabled = target.checked;
                    this.updateContent();
                }
            });
        });

        // 保存ボタン
        const saveBtn = modal.querySelector('.btn-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveConfig();
                modal.remove();
            });
        }

        // キャンセルボタン
        const cancelBtn = modal.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // 設定を復元
                this.config = this.loadConfig();
                this.applyConfig();
                this.updateContent();
                modal.remove();
            });
        }

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    public destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    // 設定の取得・設定用のpublicメソッド
    public getConfig(): StatsPanelConfig {
        return { ...this.config };
    }

    public setConfig(config: Partial<StatsPanelConfig>) {
        this.config = { ...this.config, ...config };
        this.applyConfig();
        this.updateContent();
        this.saveConfig();
    }
}

export const statsPanel = new StatsPanel();