/**
 * Conversion Rate Settings
 * 惑星探索リソースの変換レート調整UI
 */

import { showMessage } from '../../ui.js';

// 変換レート設定
export interface ConversionRates {
    minerals: number;      // 鉱物 → 宇宙の塵
    energy: number;        // エネルギー → エネルギー
    parts: number;         // パーツ → 思考ポイント
    biomatter: number;     // バイオマター → 有機物
    crystals: number;      // クリスタル → ダークマター
}

// デフォルト変換レート
export const DEFAULT_CONVERSION_RATES: ConversionRates = {
    minerals: 10,      // 鉱物1 = 宇宙の塵10
    energy: 5,         // エネルギー1 = エネルギー5
    parts: 50,         // パーツ1 = 思考ポイント50
    biomatter: 20,     // バイオマター1 = 有機物20
    crystals: 1        // クリスタル1 = ダークマター1
};

export class ConversionRateSettings {
    private static instance: ConversionRateSettings;
    private container: HTMLDivElement | null = null;
    private currentRates: ConversionRates;
    private isOpen = false;
    
    private constructor() {
        this.currentRates = this.loadRates();
    }
    
    static getInstance(): ConversionRateSettings {
        if (!ConversionRateSettings.instance) {
            ConversionRateSettings.instance = new ConversionRateSettings();
        }
        return ConversionRateSettings.instance;
    }
    
    /**
     * 現在の変換レートを取得
     */
    getRates(): ConversionRates {
        return { ...this.currentRates };
    }
    
    /**
     * 設定UIを開く
     */
    open(): void {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.createUI();
    }
    
    /**
     * 設定UIを閉じる
     */
    close(): void {
        if (!this.isOpen) return;
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isOpen = false;
    }
    
    /**
     * UIを作成
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'conversion-rate-settings';
        this.container.innerHTML = `
            <style>
                #conversion-rate-settings {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #4CAF50;
                    border-radius: 15px;
                    padding: 30px;
                    min-width: 600px;
                    max-width: 800px;
                    z-index: 10000;
                    box-shadow: 0 0 30px rgba(76, 175, 80, 0.3);
                }
                
                .settings-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #4CAF50;
                }
                
                .settings-title {
                    font-size: 24px;
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .settings-close {
                    background: none;
                    border: 1px solid #4CAF50;
                    color: #4CAF50;
                    font-size: 20px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .settings-close:hover {
                    background: #4CAF50;
                    color: black;
                }
                
                .settings-info {
                    background: rgba(76, 175, 80, 0.1);
                    border: 1px solid #4CAF50;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    color: #AAA;
                }
                
                .conversion-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    margin-bottom: 25px;
                }
                
                .conversion-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: all 0.3s;
                }
                
                .conversion-item:hover {
                    border-color: #4CAF50;
                    background: rgba(76, 175, 80, 0.05);
                }
                
                .resource-info {
                    flex: 1;
                }
                
                .resource-name {
                    font-size: 18px;
                    color: #4CAF50;
                    margin-bottom: 5px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .resource-icon {
                    font-size: 24px;
                }
                
                .conversion-formula {
                    font-size: 14px;
                    color: #888;
                }
                
                .rate-control {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .rate-input {
                    width: 80px;
                    padding: 8px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid #666;
                    border-radius: 5px;
                    color: white;
                    text-align: center;
                    font-size: 16px;
                }
                
                .rate-input:focus {
                    outline: none;
                    border-color: #4CAF50;
                }
                
                .rate-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .rate-button {
                    background: rgba(76, 175, 80, 0.3);
                    border: 1px solid #4CAF50;
                    color: #4CAF50;
                    width: 30px;
                    height: 20px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .rate-button:hover {
                    background: #4CAF50;
                    color: black;
                }
                
                .settings-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 25px;
                }
                
                .action-button {
                    padding: 12px 30px;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .save-button {
                    background: #4CAF50;
                    color: black;
                }
                
                .save-button:hover {
                    background: #45a049;
                    transform: scale(1.05);
                }
                
                .reset-button {
                    background: rgba(255, 152, 0, 0.8);
                    color: white;
                }
                
                .reset-button:hover {
                    background: #FF9800;
                }
                
                .preview-text {
                    font-size: 12px;
                    color: #AAA;
                    margin-top: 5px;
                }
                
                .rate-multiplier {
                    font-size: 14px;
                    color: #FFD700;
                    margin-left: 10px;
                }
            </style>
            
            <div class="settings-header">
                <div class="settings-title">⚙️ 変換レート設定</div>
                <button class="settings-close" id="close-settings">×</button>
            </div>
            
            <div class="settings-info">
                惑星探索で入手したリソースをメインゲームのリソースに変換する際のレートを調整できます。
                レートが高いほど、より多くのリソースを獲得できます。
            </div>
            
            <div class="conversion-list">
                ${this.createConversionItem('minerals', '💎', '鉱物', '宇宙の塵')}
                ${this.createConversionItem('energy', '⚡', 'エネルギー', 'エネルギー')}
                ${this.createConversionItem('parts', '🔧', 'パーツ', '思考ポイント')}
                ${this.createConversionItem('biomatter', '🌿', 'バイオマター', '有機物')}
                ${this.createConversionItem('crystals', '💠', 'クリスタル', 'ダークマター')}
            </div>
            
            <div class="settings-actions">
                <button class="action-button reset-button" id="reset-rates">
                    デフォルトに戻す
                </button>
                <button class="action-button save-button" id="save-rates">
                    保存する
                </button>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 現在の値を表示
        this.updateInputValues();
    }
    
    /**
     * 変換アイテムのHTMLを生成
     */
    private createConversionItem(
        resourceId: keyof ConversionRates,
        icon: string,
        fromName: string,
        toName: string
    ): string {
        const rate = this.currentRates[resourceId];
        const defaultRate = DEFAULT_CONVERSION_RATES[resourceId];
        const multiplier = rate / defaultRate;
        
        return `
            <div class="conversion-item">
                <div class="resource-info">
                    <div class="resource-name">
                        <span class="resource-icon">${icon}</span>
                        ${fromName} → ${toName}
                    </div>
                    <div class="conversion-formula">
                        ${fromName} 1個 = ${toName} <span id="rate-display-${resourceId}">${rate}</span>個
                        ${multiplier !== 1 ? `<span class="rate-multiplier">(×${multiplier.toFixed(1)})</span>` : ''}
                    </div>
                    <div class="preview-text" id="preview-${resourceId}">
                        例: ${fromName} 100個 → ${toName} ${100 * rate}個
                    </div>
                </div>
                <div class="rate-control">
                    <input type="number" 
                           class="rate-input" 
                           id="rate-${resourceId}" 
                           value="${rate}"
                           min="1"
                           max="1000"
                           data-resource="${resourceId}">
                    <div class="rate-buttons">
                        <button class="rate-button" data-resource="${resourceId}" data-action="increase">▲</button>
                        <button class="rate-button" data-resource="${resourceId}" data-action="decrease">▼</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 閉じるボタン
        const closeBtn = document.getElementById('close-settings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // 保存ボタン
        const saveBtn = document.getElementById('save-rates');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveRates());
        }
        
        // リセットボタン
        const resetBtn = document.getElementById('reset-rates');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetRates());
        }
        
        // レート入力
        document.querySelectorAll('.rate-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const resource = target.dataset.resource as keyof ConversionRates;
                this.updatePreview(resource, parseInt(target.value) || 1);
            });
        });
        
        // 増減ボタン
        document.querySelectorAll('.rate-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLButtonElement;
                const resource = target.dataset.resource as keyof ConversionRates;
                const action = target.dataset.action;
                this.adjustRate(resource, action === 'increase' ? 1 : -1);
            });
        });
    }
    
    /**
     * レートを調整
     */
    private adjustRate(resource: keyof ConversionRates, delta: number): void {
        const input = document.getElementById(`rate-${resource}`) as HTMLInputElement;
        if (!input) return;
        
        const currentValue = parseInt(input.value) || 1;
        const newValue = Math.max(1, Math.min(1000, currentValue + delta * 5));
        input.value = newValue.toString();
        
        this.updatePreview(resource, newValue);
    }
    
    /**
     * プレビューを更新
     */
    private updatePreview(resource: keyof ConversionRates, rate: number): void {
        // レート表示を更新
        const display = document.getElementById(`rate-display-${resource}`);
        if (display) {
            display.textContent = rate.toString();
        }
        
        // プレビューテキストを更新
        const preview = document.getElementById(`preview-${resource}`);
        if (preview) {
            const resourceNames: Record<string, [string, string]> = {
                minerals: ['鉱物', '宇宙の塵'],
                energy: ['エネルギー', 'エネルギー'],
                parts: ['パーツ', '思考ポイント'],
                biomatter: ['バイオマター', '有機物'],
                crystals: ['クリスタル', 'ダークマター']
            };
            
            const [from, to] = resourceNames[resource];
            preview.textContent = `例: ${from} 100個 → ${to} ${100 * rate}個`;
        }
    }
    
    /**
     * 入力値を更新
     */
    private updateInputValues(): void {
        Object.entries(this.currentRates).forEach(([resource, rate]) => {
            const input = document.getElementById(`rate-${resource}`) as HTMLInputElement;
            if (input) {
                input.value = rate.toString();
            }
        });
    }
    
    /**
     * レートを保存
     */
    private saveRates(): void {
        const newRates: ConversionRates = { ...DEFAULT_CONVERSION_RATES };
        
        Object.keys(newRates).forEach(resource => {
            const input = document.getElementById(`rate-${resource}`) as HTMLInputElement;
            if (input) {
                const value = parseInt(input.value) || DEFAULT_CONVERSION_RATES[resource as keyof ConversionRates];
                newRates[resource as keyof ConversionRates] = Math.max(1, Math.min(1000, value));
            }
        });
        
        this.currentRates = newRates;
        localStorage.setItem('conversionRates', JSON.stringify(newRates));
        
        showMessage('変換レートを保存しました', 'success');
        this.close();
    }
    
    /**
     * レートをリセット
     */
    private resetRates(): void {
        this.currentRates = { ...DEFAULT_CONVERSION_RATES };
        this.updateInputValues();
        
        // プレビューも更新
        Object.keys(this.currentRates).forEach(resource => {
            this.updatePreview(
                resource as keyof ConversionRates,
                this.currentRates[resource as keyof ConversionRates]
            );
        });
        
        showMessage('変換レートをデフォルトに戻しました', 'info');
    }
    
    /**
     * レートを読み込み
     */
    private loadRates(): ConversionRates {
        const saved = localStorage.getItem('conversionRates');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('[CONVERSION_RATES] Failed to load rates:', e);
            }
        }
        return { ...DEFAULT_CONVERSION_RATES };
    }
}