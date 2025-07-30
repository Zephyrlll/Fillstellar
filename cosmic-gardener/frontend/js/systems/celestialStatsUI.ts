/**
 * Celestial Statistics UI
 * 天体統計画面の実装
 */

import { gameState, CelestialBody } from '../state.js';
import { formatNumber } from '../utils.js';
import { animationSystem } from './simpleAnimations.js';

export class CelestialStatsUI {
    private static instance: CelestialStatsUI;
    private container: HTMLDivElement | null = null;
    private overlay: HTMLDivElement | null = null;
    private isOpen: boolean = false;
    private updateInterval: number | null = null;
    
    private constructor() {}
    
    static getInstance(): CelestialStatsUI {
        if (!CelestialStatsUI.instance) {
            CelestialStatsUI.instance = new CelestialStatsUI();
        }
        return CelestialStatsUI.instance;
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
        this.overlay.className = 'celestial-stats-overlay';
        this.overlay.addEventListener('click', () => this.close());
        
        // コンテナ
        this.container = document.createElement('div');
        this.container.className = 'celestial-stats-container';
        this.container.addEventListener('click', (e) => e.stopPropagation());
        
        // スタイル
        const style = document.createElement('style');
        style.textContent = `
            .celestial-stats-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                opacity: 0;
            }
            
            .celestial-stats-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
                border: 2px solid #6a5acd;
                border-radius: 15px;
                padding: 30px;
                min-width: 900px;
                max-width: 1100px;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 0 40px rgba(106, 90, 205, 0.4);
                opacity: 0;
            }
            
            .celestial-stats-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #6a5acd;
            }
            
            .celestial-stats-title {
                font-size: 32px;
                color: #9d4edd;
                font-weight: bold;
                text-shadow: 0 0 15px rgba(157, 78, 221, 0.6);
            }
            
            .celestial-stats-close {
                background: none;
                border: 2px solid #9d4edd;
                color: #9d4edd;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .celestial-stats-close:hover {
                background: #9d4edd;
                color: #fff;
                transform: rotate(90deg);
            }
            
            .celestial-summary {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .summary-card {
                background: rgba(157, 78, 221, 0.1);
                border: 1px solid #6a5acd;
                border-radius: 10px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .summary-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(157, 78, 221, 0.3);
            }
            
            .summary-icon {
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .summary-label {
                font-size: 14px;
                color: #b8b8d1;
                margin-bottom: 5px;
            }
            
            .summary-value {
                font-size: 24px;
                color: #fff;
                font-weight: bold;
            }
            
            .celestial-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid #6a5acd;
                padding-bottom: 10px;
            }
            
            .celestial-tab {
                background: none;
                border: none;
                color: #b8b8d1;
                font-size: 16px;
                padding: 10px 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                border-radius: 5px 5px 0 0;
            }
            
            .celestial-tab:hover {
                background: rgba(157, 78, 221, 0.1);
                color: #fff;
            }
            
            .celestial-tab.active {
                background: rgba(157, 78, 221, 0.2);
                color: #9d4edd;
                border-bottom: 2px solid #9d4edd;
            }
            
            .celestial-content {
                display: none;
            }
            
            .celestial-content.active {
                display: block;
            }
            
            .celestial-list {
                display: grid;
                gap: 10px;
            }
            
            .celestial-item {
                background: rgba(106, 90, 205, 0.1);
                border: 1px solid #6a5acd;
                border-radius: 8px;
                padding: 15px;
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 15px;
                align-items: center;
                transition: all 0.3s ease;
            }
            
            .celestial-item:hover {
                background: rgba(106, 90, 205, 0.2);
                transform: translateX(5px);
            }
            
            .celestial-type-icon {
                font-size: 32px;
            }
            
            .celestial-info {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            
            .celestial-detail {
                font-size: 14px;
            }
            
            .celestial-detail-label {
                color: #b8b8d1;
            }
            
            .celestial-detail-value {
                color: #fff;
                font-weight: bold;
            }
            
            .celestial-actions {
                display: flex;
                gap: 10px;
            }
            
            .celestial-action-btn {
                background: rgba(157, 78, 221, 0.2);
                border: 1px solid #9d4edd;
                color: #9d4edd;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            
            .celestial-action-btn:hover {
                background: #9d4edd;
                color: #fff;
            }
            
            .life-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                background: #4caf50;
                border-radius: 50%;
                margin-left: 5px;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .celestial-chart {
                background: rgba(106, 90, 205, 0.1);
                border: 1px solid #6a5acd;
                border-radius: 10px;
                padding: 20px;
                margin-top: 20px;
                text-align: center;
                color: #b8b8d1;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
        
        this.updateContent();
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.container);
    }
    
    private updateContent(): void {
        if (!this.container) return;
        
        // 天体の統計情報を計算
        const celestialStats = this.calculateCelestialStats();
        
        this.container.innerHTML = `
            <div class="celestial-stats-header">
                <h2 class="celestial-stats-title">🌌 天体統計</h2>
                <button class="celestial-stats-close">×</button>
            </div>
            
            <div class="celestial-summary">
                <div class="summary-card">
                    <div class="summary-icon">⭐</div>
                    <div class="summary-label">恒星</div>
                    <div class="summary-value">${celestialStats.stars}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">🪐</div>
                    <div class="summary-label">惑星</div>
                    <div class="summary-value">${celestialStats.planets}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">🌙</div>
                    <div class="summary-label">衛星</div>
                    <div class="summary-value">${celestialStats.moons}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">☄️</div>
                    <div class="summary-label">その他</div>
                    <div class="summary-value">${celestialStats.others}</div>
                </div>
            </div>
            
            <div class="celestial-tabs">
                <button class="celestial-tab active" data-tab="overview">概要</button>
                <button class="celestial-tab" data-tab="stars">恒星</button>
                <button class="celestial-tab" data-tab="planets">惑星</button>
                <button class="celestial-tab" data-tab="life">生命</button>
            </div>
            
            <div class="celestial-content active" data-content="overview">
                ${this.renderOverview(celestialStats)}
            </div>
            
            <div class="celestial-content" data-content="stars">
                ${this.renderStars()}
            </div>
            
            <div class="celestial-content" data-content="planets">
                ${this.renderPlanets()}
            </div>
            
            <div class="celestial-content" data-content="life">
                ${this.renderLife()}
            </div>
        `;
        
        // イベントリスナー
        const closeBtn = this.container.querySelector('.celestial-stats-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // タブ切り替え
        const tabs = this.container.querySelectorAll('.celestial-tab');
        const contents = this.container.querySelectorAll('.celestial-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = this.container?.querySelector(`[data-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
        
        // アクションボタン
        const focusButtons = this.container.querySelectorAll('.focus-btn');
        focusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const bodyId = btn.getAttribute('data-id');
                const body = gameState.stars.find(s => s.userData.id === bodyId);
                if (body) {
                    this.focusOnCelestialBody(body);
                }
            });
        });
    }
    
    private calculateCelestialStats(): any {
        let stars = 0, planets = 0, moons = 0, others = 0;
        let totalMass = 0, totalLife = 0;
        let lifeStages = { microbial: 0, plant: 0, animal: 0, intelligent: 0 };
        
        gameState.stars.forEach(body => {
            totalMass += body.userData.mass || 0;
            
            switch (body.userData.type) {
                case 'star':
                    stars++;
                    break;
                case 'planet':
                    planets++;
                    if (body.userData.hasLife) {
                        totalLife++;
                        const stage = body.userData.lifeStage;
                        if (stage && stage in lifeStages) {
                            lifeStages[stage as keyof typeof lifeStages]++;
                        }
                    }
                    break;
                case 'moon':
                    moons++;
                    break;
                default:
                    others++;
                    break;
            }
        });
        
        return {
            stars,
            planets,
            moons,
            others,
            total: gameState.stars.length,
            totalMass,
            totalLife,
            lifeStages,
            averageAge: gameState.gameYear / Math.max(1, gameState.stars.length)
        };
    }
    
    private renderOverview(stats: any): string {
        return `
            <div class="celestial-list">
                <div class="celestial-item">
                    <div class="celestial-type-icon">🌟</div>
                    <div class="celestial-info">
                        <div class="celestial-detail">
                            <span class="celestial-detail-label">総天体数:</span>
                            <span class="celestial-detail-value">${stats.total}</span>
                        </div>
                        <div class="celestial-detail">
                            <span class="celestial-detail-label">総質量:</span>
                            <span class="celestial-detail-value">${formatNumber(stats.totalMass)} kg</span>
                        </div>
                        <div class="celestial-detail">
                            <span class="celestial-detail-label">平均年齢:</span>
                            <span class="celestial-detail-value">${formatNumber(stats.averageAge)} 年</span>
                        </div>
                    </div>
                    <div></div>
                </div>
                
                <div class="celestial-item">
                    <div class="celestial-type-icon">🌿</div>
                    <div class="celestial-info">
                        <div class="celestial-detail">
                            <span class="celestial-detail-label">生命保有惑星:</span>
                            <span class="celestial-detail-value">${stats.totalLife}</span>
                        </div>
                        <div class="celestial-detail">
                            <span class="celestial-detail-label">知的生命:</span>
                            <span class="celestial-detail-value">${stats.lifeStages.intelligent}</span>
                        </div>
                        <div class="celestial-detail">
                            <span class="celestial-detail-label">総人口:</span>
                            <span class="celestial-detail-value">${formatNumber(gameState.cachedTotalPopulation || 0)}</span>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
            
            <div class="celestial-chart">
                ⚠️ グラフ表示機能は開発中です
            </div>
        `;
    }
    
    private renderStars(): string {
        const stars = gameState.stars.filter(body => body.userData.type === 'star');
        
        if (stars.length === 0) {
            return '<div class="celestial-list"><p style="text-align: center; color: #b8b8d1;">恒星がありません</p></div>';
        }
        
        return `
            <div class="celestial-list">
                ${stars.map(star => `
                    <div class="celestial-item">
                        <div class="celestial-type-icon">⭐</div>
                        <div class="celestial-info">
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">名前:</span>
                                <span class="celestial-detail-value">${star.userData.name}</span>
                            </div>
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">質量:</span>
                                <span class="celestial-detail-value">${formatNumber(star.userData.mass)} kg</span>
                            </div>
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">温度:</span>
                                <span class="celestial-detail-value">${formatNumber(star.userData.temperature || 5000)} K</span>
                            </div>
                        </div>
                        <div class="celestial-actions">
                            <button class="celestial-action-btn focus-btn" data-id="${star.userData.id}">フォーカス</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    private renderPlanets(): string {
        const planets = gameState.stars.filter(body => body.userData.type === 'planet');
        
        if (planets.length === 0) {
            return '<div class="celestial-list"><p style="text-align: center; color: #b8b8d1;">惑星がありません</p></div>';
        }
        
        return `
            <div class="celestial-list">
                ${planets.map(planet => `
                    <div class="celestial-item">
                        <div class="celestial-type-icon">🪐</div>
                        <div class="celestial-info">
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">名前:</span>
                                <span class="celestial-detail-value">
                                    ${planet.userData.name}
                                    ${planet.userData.hasLife ? '<span class="life-indicator"></span>' : ''}
                                </span>
                            </div>
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">タイプ:</span>
                                <span class="celestial-detail-value">${planet.userData.planetType || 'Unknown'}</span>
                            </div>
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">居住性:</span>
                                <span class="celestial-detail-value">${planet.userData.habitability || 0}%</span>
                            </div>
                        </div>
                        <div class="celestial-actions">
                            <button class="celestial-action-btn focus-btn" data-id="${planet.userData.id}">フォーカス</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    private renderLife(): string {
        const lifePlanets = gameState.stars.filter(body => 
            body.userData.type === 'planet' && body.userData.hasLife
        );
        
        if (lifePlanets.length === 0) {
            return '<div class="celestial-list"><p style="text-align: center; color: #b8b8d1;">生命が存在する惑星がありません</p></div>';
        }
        
        const lifeStageNames: { [key: string]: string } = {
            'microbial': '微生物',
            'plant': '植物',
            'animal': '動物',
            'intelligent': '知的生命'
        };
        
        return `
            <div class="celestial-list">
                ${lifePlanets.map(planet => `
                    <div class="celestial-item">
                        <div class="celestial-type-icon">🌿</div>
                        <div class="celestial-info">
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">惑星:</span>
                                <span class="celestial-detail-value">${planet.userData.name}</span>
                            </div>
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">生命段階:</span>
                                <span class="celestial-detail-value">${lifeStageNames[planet.userData.lifeStage || 'microbial']}</span>
                            </div>
                            <div class="celestial-detail">
                                <span class="celestial-detail-label">人口:</span>
                                <span class="celestial-detail-value">${formatNumber(planet.userData.population || 0)}</span>
                            </div>
                        </div>
                        <div class="celestial-actions">
                            <button class="celestial-action-btn focus-btn" data-id="${planet.userData.id}">フォーカス</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    private focusOnCelestialBody(body: CelestialBody): void {
        // カメラを天体にフォーカス
        const camera = (window as any).camera;
        const controls = (window as any).controls;
        
        if (camera && controls) {
            controls.target.copy(body.position);
            const distance = (body.userData.radius || 100) * 5;
            camera.position.set(
                body.position.x + distance,
                body.position.y + distance * 0.5,
                body.position.z + distance
            );
            
            // UIを閉じる
            this.close();
        }
    }
    
    private startUpdating(): void {
        this.updateInterval = window.setInterval(() => {
            this.updateContent();
        }, 2000);
    }
    
    private stopUpdating(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// グローバルに公開
(window as any).celestialStatsUI = CelestialStatsUI.getInstance();