/**
 * Offline Production UI
 * オフライン生産報告UI
 */

import { formatNumber } from '../../utils.js';
import { PlanetAutomation, OfflineProduction } from './PlanetAutomation.js';

export class OfflineProductionUI {
    private static instance: OfflineProductionUI;
    private container: HTMLDivElement | null = null;
    private productions: OfflineProduction[] = [];
    private isOpen = false;
    
    private constructor() {}
    
    static getInstance(): OfflineProductionUI {
        if (!OfflineProductionUI.instance) {
            OfflineProductionUI.instance = new OfflineProductionUI();
        }
        return OfflineProductionUI.instance;
    }
    
    /**
     * オフライン生産をチェックして表示
     */
    checkAndShow(): void {
        const automation = PlanetAutomation.getInstance();
        const productions = automation.calculateAllOfflineProduction();
        
        if (productions.length === 0) return;
        
        this.productions = productions;
        this.show();
    }
    
    /**
     * UIを表示
     */
    private show(): void {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.createUI();
    }
    
    /**
     * UIを閉じる
     */
    private close(): void {
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
        this.container.id = 'offline-production-ui';
        this.container.innerHTML = `
            <style>
                #offline-production-ui {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #4CAF50;
                    border-radius: 15px;
                    padding: 30px;
                    min-width: 700px;
                    max-width: 900px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 100000;
                    box-shadow: 0 0 30px rgba(76, 175, 80, 0.4);
                    animation: slideIn 0.5s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -40%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                
                .production-header {
                    text-align: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #4CAF50;
                }
                
                .production-title {
                    font-size: 28px;
                    color: #4CAF50;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                .production-subtitle {
                    font-size: 16px;
                    color: #AAA;
                }
                
                .total-summary {
                    background: rgba(76, 175, 80, 0.1);
                    border: 1px solid #4CAF50;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                
                .summary-title {
                    font-size: 20px;
                    color: #4CAF50;
                    margin-bottom: 15px;
                    text-align: center;
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                }
                
                .summary-item {
                    text-align: center;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 15px;
                    border-radius: 8px;
                }
                
                .summary-icon {
                    font-size: 24px;
                    margin-bottom: 5px;
                }
                
                .summary-value {
                    font-size: 20px;
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .summary-label {
                    font-size: 12px;
                    color: #888;
                    margin-top: 5px;
                }
                
                .planet-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .planet-production {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid #444;
                    border-radius: 10px;
                    padding: 20px;
                    transition: all 0.3s;
                }
                
                .planet-production:hover {
                    border-color: #4CAF50;
                    transform: translateY(-2px);
                }
                
                .planet-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .planet-name {
                    font-size: 18px;
                    color: #FFD700;
                    font-weight: bold;
                }
                
                .production-time {
                    font-size: 14px;
                    color: #888;
                }
                
                .production-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 10px;
                    margin-bottom: 10px;
                }
                
                .resource-item {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 10px;
                    border-radius: 5px;
                    text-align: center;
                }
                
                .resource-icon {
                    font-size: 20px;
                    margin-bottom: 5px;
                }
                
                .resource-amount {
                    font-size: 16px;
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .production-stats {
                    display: flex;
                    gap: 20px;
                    font-size: 12px;
                    color: #888;
                    padding-top: 10px;
                    border-top: 1px solid #333;
                }
                
                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .efficiency-low {
                    color: #ff6666;
                }
                
                .efficiency-medium {
                    color: #ffaa66;
                }
                
                .efficiency-high {
                    color: #4CAF50;
                }
                
                .collect-button {
                    display: block;
                    width: 100%;
                    padding: 15px;
                    background: #4CAF50;
                    border: none;
                    border-radius: 5px;
                    color: black;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .collect-button:hover {
                    background: #45a049;
                    transform: scale(1.02);
                }
                
                .collect-button:active {
                    transform: scale(0.98);
                }
            </style>
            
            <div class="production-header">
                <div class="production-title">📦 オフライン生産報告</div>
                <div class="production-subtitle">
                    不在中も惑星は生産を続けていました！
                </div>
            </div>
            
            <div class="total-summary">
                <div class="summary-title">🎁 総生産量</div>
                <div class="summary-grid" id="summary-grid">
                    <!-- 総生産量がここに表示される -->
                </div>
            </div>
            
            <div class="planet-list" id="planet-list">
                <!-- 惑星ごとの生産がここに表示される -->
            </div>
            
            <button class="collect-button" id="collect-button">
                🎉 すべて回収する
            </button>
        `;
        
        document.body.appendChild(this.container);
        
        // コンテンツを生成
        this.updateContent();
        
        // イベントリスナー
        const collectBtn = document.getElementById('collect-button');
        if (collectBtn) {
            collectBtn.addEventListener('click', () => this.collectAll());
        }
    }
    
    /**
     * コンテンツを更新
     */
    private updateContent(): void {
        // 総生産量を計算
        const totalProduction = {
            cosmicDust: 0,
            energy: 0,
            thoughtPoints: 0
        };
        
        const conversionRates = {
            minerals: 10,
            energy: 5,
            parts: 50
        };
        
        this.productions.forEach(prod => {
            totalProduction.cosmicDust += prod.resources.minerals * conversionRates.minerals;
            totalProduction.energy += prod.resources.energy * conversionRates.energy;
            totalProduction.thoughtPoints += prod.resources.parts * conversionRates.parts;
            if (prod.resources.thoughtPoints) {
                totalProduction.thoughtPoints += prod.resources.thoughtPoints * 100;
            }
        });
        
        // 総生産量を表示
        const summaryGrid = document.getElementById('summary-grid');
        if (summaryGrid) {
            summaryGrid.innerHTML = `
                <div class="summary-item">
                    <div class="summary-icon">💎</div>
                    <div class="summary-value">${formatNumber(totalProduction.cosmicDust)}</div>
                    <div class="summary-label">宇宙の塵</div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">⚡</div>
                    <div class="summary-value">${formatNumber(totalProduction.energy)}</div>
                    <div class="summary-label">エネルギー</div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon">🧠</div>
                    <div class="summary-value">${formatNumber(totalProduction.thoughtPoints)}</div>
                    <div class="summary-label">思考ポイント</div>
                </div>
            `;
        }
        
        // 惑星リストを表示
        const planetList = document.getElementById('planet-list');
        if (planetList) {
            planetList.innerHTML = this.productions.map(prod => {
                const efficiencyClass = prod.efficiency >= 0.8 ? 'efficiency-high' :
                                       prod.efficiency >= 0.5 ? 'efficiency-medium' : 'efficiency-low';
                
                return `
                    <div class="planet-production">
                        <div class="planet-header">
                            <div class="planet-name">${prod.planetName}</div>
                            <div class="production-time">${this.formatDuration(prod.duration)}</div>
                        </div>
                        
                        <div class="production-details">
                            ${prod.resources.minerals > 0 ? `
                                <div class="resource-item">
                                    <div class="resource-icon">⛏️</div>
                                    <div class="resource-amount">+${formatNumber(prod.resources.minerals)}</div>
                                </div>
                            ` : ''}
                            ${prod.resources.energy > 0 ? `
                                <div class="resource-item">
                                    <div class="resource-icon">⚡</div>
                                    <div class="resource-amount">+${formatNumber(prod.resources.energy)}</div>
                                </div>
                            ` : ''}
                            ${prod.resources.parts > 0 ? `
                                <div class="resource-item">
                                    <div class="resource-icon">🔧</div>
                                    <div class="resource-amount">+${formatNumber(prod.resources.parts)}</div>
                                </div>
                            ` : ''}
                            ${prod.resources.thoughtPoints && prod.resources.thoughtPoints > 0 ? `
                                <div class="resource-item">
                                    <div class="resource-icon">🧠</div>
                                    <div class="resource-amount">+${formatNumber(prod.resources.thoughtPoints)}</div>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="production-stats">
                            <div class="stat-item">
                                <span>🏗️</span>
                                <span>建物: ${prod.buildingsActive}個</span>
                            </div>
                            <div class="stat-item">
                                <span>⚡</span>
                                <span>電力: ${prod.powerBalance >= 0 ? '+' : ''}${prod.powerBalance}</span>
                            </div>
                            <div class="stat-item">
                                <span>📊</span>
                                <span class="${efficiencyClass}">効率: ${Math.round(prod.efficiency * 100)}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    /**
     * すべて回収
     */
    private collectAll(): void {
        const automation = PlanetAutomation.getInstance();
        automation.applyOfflineProduction(this.productions);
        
        // アニメーション
        const button = document.getElementById('collect-button') as HTMLButtonElement;
        if (button) {
            button.textContent = '✅ 回収完了！';
            button.disabled = true;
        }
        
        setTimeout(() => {
            this.close();
        }, 1500);
    }
    
    /**
     * 時間をフォーマット
     */
    private formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}時間${minutes}分`;
        } else {
            return `${minutes}分`;
        }
    }
}