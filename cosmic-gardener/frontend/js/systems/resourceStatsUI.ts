/**
 * Resource Statistics UI
 * リソース統計画面の実装
 */

import { gameState, gameStateManager } from '../state.js';
import { formatNumber } from '../utils.js';
import { animationSystem } from './simpleAnimations.js';

export class ResourceStatsUI {
    private static instance: ResourceStatsUI;
    private container: HTMLDivElement | null = null;
    private overlay: HTMLDivElement | null = null;
    private isOpen: boolean = false;
    private updateInterval: number | null = null;
    
    private constructor() {}
    
    static getInstance(): ResourceStatsUI {
        if (!ResourceStatsUI.instance) {
            ResourceStatsUI.instance = new ResourceStatsUI();
        }
        return ResourceStatsUI.instance;
    }
    
    open(): void {
        if (this.isOpen) return;
        
        this.createUI();
        this.isOpen = true;
        this.startUpdating();
        
        // アニメーション
        if (this.overlay && this.container) {
            animationSystem.fadeIn(this.overlay);
            animationSystem.scaleIn(this.container);
        }
    }
    
    close(): void {
        if (!this.isOpen) return;
        
        this.stopUpdating();
        
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
        this.overlay.className = 'resource-stats-overlay';
        this.overlay.addEventListener('click', () => this.close());
        
        // コンテナ
        this.container = document.createElement('div');
        this.container.className = 'resource-stats-container';
        this.container.addEventListener('click', (e) => e.stopPropagation());
        
        // スタイル
        const style = document.createElement('style');
        style.textContent = `
            .resource-stats-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                opacity: 0;
            }
            
            .resource-stats-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #0f4c75;
                border-radius: 15px;
                padding: 30px;
                min-width: 800px;
                max-width: 1000px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(15, 76, 117, 0.5);
                opacity: 0;
            }
            
            .resource-stats-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #0f4c75;
            }
            
            .resource-stats-title {
                font-size: 32px;
                color: #3282b8;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(50, 130, 184, 0.5);
            }
            
            .resource-stats-close {
                background: none;
                border: 2px solid #3282b8;
                color: #3282b8;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .resource-stats-close:hover {
                background: #3282b8;
                color: #fff;
                transform: rotate(90deg);
            }
            
            .resource-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .resource-card {
                background: rgba(50, 130, 184, 0.1);
                border: 1px solid #3282b8;
                border-radius: 10px;
                padding: 20px;
                transition: all 0.3s ease;
            }
            
            .resource-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 5px 20px rgba(50, 130, 184, 0.3);
            }
            
            .resource-name {
                font-size: 20px;
                color: #bbe1fa;
                margin-bottom: 15px;
                font-weight: bold;
            }
            
            .resource-value {
                font-size: 28px;
                color: #fff;
                margin-bottom: 10px;
            }
            
            .resource-rate {
                font-size: 16px;
                color: #3282b8;
                margin-bottom: 5px;
            }
            
            .resource-rate.positive {
                color: #4caf50;
            }
            
            .resource-rate.negative {
                color: #f44336;
            }
            
            .resource-details {
                font-size: 14px;
                color: #8892b0;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(50, 130, 184, 0.3);
            }
            
            .resource-detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            
            .summary-section {
                background: rgba(15, 76, 117, 0.2);
                border: 1px solid #0f4c75;
                border-radius: 10px;
                padding: 20px;
                margin-top: 20px;
            }
            
            .summary-title {
                font-size: 24px;
                color: #3282b8;
                margin-bottom: 15px;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }
            
            .summary-item {
                text-align: center;
            }
            
            .summary-label {
                font-size: 14px;
                color: #8892b0;
                margin-bottom: 5px;
            }
            
            .summary-value {
                font-size: 20px;
                color: #bbe1fa;
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
        
        const stats = gameState.statistics;
        const resources = gameState.resources;
        
        // 各資源の詳細情報を計算
        const resourceDetails = {
            cosmicDust: {
                name: '宇宙の塵',
                icon: '✨',
                total: resources.cosmicDust,
                rate: stats.resources.cosmicDust.perSecond,
                sources: {
                    '基本生成': gameState.currentDustRate || 0,
                    '小惑星/彗星': gameState.stars.filter(s => s.userData.type === 'asteroid' || s.userData.type === 'comet').length * 0.5,
                    '所有惑星': ((gameState as any).ownedPlanets || []).reduce((sum: number, p: any) => sum + p.baseProduction.cosmicDust * p.productionMultiplier, 0)
                }
            },
            energy: {
                name: 'エネルギー',
                icon: '⚡',
                total: resources.energy,
                rate: stats.resources.energy.perSecond,
                sources: {
                    '恒星': gameState.stars.filter(s => s.userData.type === 'star').length * 0.1,
                    '研究ボーナス': gameState.researchAdvancedEnergy ? 1.0 : 0,
                    '所有惑星': ((gameState as any).ownedPlanets || []).reduce((sum: number, p: any) => sum + p.baseProduction.energy * p.productionMultiplier, 0)
                }
            },
            organicMatter: {
                name: '有機物',
                icon: '🌿',
                total: resources.organicMatter,
                rate: stats.resources.organicMatter.perSecond,
                sources: {
                    '微生物': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'microbial').length * 0.01,
                    '植物': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'plant').length * 0.05,
                    '動物': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'animal').length * 0.1,
                    '知的生命': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'intelligent').length * 0.2
                }
            },
            biomass: {
                name: 'バイオマス',
                icon: '🌱',
                total: resources.biomass,
                rate: stats.resources.biomass.perSecond,
                sources: {
                    '植物生命': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'plant').length * 0.02,
                    '動物生命': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'animal').length * 0.05,
                    '知的生命': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'intelligent').length * 0.1
                }
            },
            darkMatter: {
                name: 'ダークマター',
                icon: '🌑',
                total: resources.darkMatter,
                rate: stats.resources.darkMatter.perSecond,
                sources: {
                    'ブラックホール': gameState.stars.filter(s => s.userData.type === 'black_hole').length * 0.01,
                    '変換器': gameState.darkMatterConverterLevel * 0.1
                }
            },
            thoughtPoints: {
                name: '思考ポイント',
                icon: '🧠',
                total: resources.thoughtPoints,
                rate: stats.resources.thoughtPoints.perSecond,
                sources: {
                    '知的生命': gameState.planets.filter(p => p.userData.hasLife && p.userData.lifeStage === 'intelligent').length * 0.1,
                    '人口ボーナス': Math.log10(gameState.cachedTotalPopulation + 1) * 0.01
                }
            }
        };
        
        this.container.innerHTML = `
            <div class="resource-stats-header">
                <h2 class="resource-stats-title">📊 リソース統計</h2>
                <button class="resource-stats-close">×</button>
            </div>
            
            <div class="resource-grid">
                ${Object.entries(resourceDetails).map(([key, resource]) => `
                    <div class="resource-card">
                        <div class="resource-name">${resource.icon} ${resource.name}</div>
                        <div class="resource-value">${formatNumber(resource.total)}</div>
                        <div class="resource-rate ${resource.rate >= 0 ? 'positive' : 'negative'}">
                            ${resource.rate >= 0 ? '+' : ''}${formatNumber(resource.rate)}/秒
                        </div>
                        <div class="resource-details">
                            ${Object.entries(resource.sources).map(([source, value]) => `
                                <div class="resource-detail-row">
                                    <span>${source}:</span>
                                    <span>${formatNumber(value as number)}/秒</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="summary-section">
                <h3 class="summary-title">📈 全体統計</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">総資源価値</div>
                        <div class="summary-value">${formatNumber(
                            resources.cosmicDust + 
                            resources.energy * 10 + 
                            resources.organicMatter * 100 + 
                            resources.biomass * 500 + 
                            resources.darkMatter * 1000 + 
                            resources.thoughtPoints * 10000
                        )}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">経過時間</div>
                        <div class="summary-value">${Math.floor(gameState.gameYear)} 年</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">効率スコア</div>
                        <div class="summary-value">${Math.floor(
                            (stats.resources.cosmicDust.perSecond + 
                            stats.resources.energy.perSecond * 10 + 
                            stats.resources.organicMatter.perSecond * 100) / 
                            Math.max(1, gameState.gameYear) * 1000
                        )}</div>
                    </div>
                </div>
            </div>
        `;
        
        // イベントリスナー
        const closeBtn = this.container.querySelector('.resource-stats-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    private startUpdating(): void {
        this.updateInterval = window.setInterval(() => {
            this.updateContent();
        }, 1000);
    }
    
    private stopUpdating(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// グローバルに公開
(window as any).resourceStatsUI = ResourceStatsUI.getInstance();