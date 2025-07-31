/**
 * Planet Automation UI
 * 惑星の自動化管理UI
 */

import { formatNumber } from '../../utils.js';
import { PlanetAutomation, AUTOMATION_BUILDINGS } from './PlanetAutomation.js';
import { PlanetPersistence } from './PlanetPersistence.js';
import { OwnedPlanet } from './planetShop.js';
import { showMessage } from '../../ui.js';

export class PlanetAutomationUI {
    private static instance: PlanetAutomationUI;
    private container: HTMLDivElement | null = null;
    private currentPlanet: OwnedPlanet | null = null;
    private isOpen = false;
    private automation: PlanetAutomation;
    private persistence: PlanetPersistence;
    
    private constructor() {
        this.automation = PlanetAutomation.getInstance();
        this.persistence = PlanetPersistence.getInstance();
    }
    
    static getInstance(): PlanetAutomationUI {
        if (!PlanetAutomationUI.instance) {
            PlanetAutomationUI.instance = new PlanetAutomationUI();
        }
        return PlanetAutomationUI.instance;
    }
    
    /**
     * UIを開く
     */
    open(planet: OwnedPlanet): void {
        if (this.isOpen) return;
        
        this.currentPlanet = planet;
        this.isOpen = true;
        this.createUI();
        this.updateContent();
    }
    
    /**
     * UIを閉じる
     */
    close(): void {
        if (!this.isOpen) return;
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isOpen = false;
        this.currentPlanet = null;
    }
    
    /**
     * UIを作成
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'planet-automation-ui';
        this.container.innerHTML = `
            <style>
                #planet-automation-ui {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #2196F3;
                    border-radius: 15px;
                    padding: 30px;
                    min-width: 800px;
                    max-width: 1000px;
                    max-height: 85vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 0 30px rgba(33, 150, 243, 0.4);
                }
                
                .automation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #2196F3;
                }
                
                .automation-title {
                    font-size: 28px;
                    color: #2196F3;
                    font-weight: bold;
                }
                
                .planet-name {
                    font-size: 20px;
                    color: #FFD700;
                    margin-top: 5px;
                }
                
                .automation-close {
                    background: none;
                    border: 1px solid #2196F3;
                    color: #2196F3;
                    font-size: 20px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .automation-close:hover {
                    background: #2196F3;
                    color: black;
                }
                
                .stats-overview {
                    background: rgba(33, 150, 243, 0.1);
                    border: 1px solid #2196F3;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 25px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                
                .stat-item {
                    text-align: center;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 15px;
                    border-radius: 8px;
                }
                
                .stat-label {
                    font-size: 14px;
                    color: #888;
                    margin-bottom: 5px;
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                
                .stat-value.positive {
                    color: #4CAF50;
                }
                
                .stat-value.negative {
                    color: #ff6666;
                }
                
                .stat-value.neutral {
                    color: #2196F3;
                }
                
                .buildings-section {
                    margin-bottom: 25px;
                }
                
                .section-title {
                    font-size: 22px;
                    color: #2196F3;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .buildings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                }
                
                .building-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid #444;
                    border-radius: 10px;
                    padding: 20px;
                    transition: all 0.3s;
                }
                
                .building-card:hover {
                    border-color: #2196F3;
                    transform: translateY(-2px);
                }
                
                .building-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .building-name {
                    font-size: 18px;
                    color: #2196F3;
                    font-weight: bold;
                }
                
                .building-level {
                    background: rgba(33, 150, 243, 0.2);
                    padding: 4px 8px;
                    border-radius: 15px;
                    font-size: 14px;
                    color: #2196F3;
                }
                
                .building-production {
                    margin-bottom: 15px;
                }
                
                .production-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                    font-size: 14px;
                }
                
                .production-resource {
                    color: #AAA;
                }
                
                .production-value {
                    font-weight: bold;
                }
                
                .production-value.positive {
                    color: #4CAF50;
                }
                
                .production-value.negative {
                    color: #ff6666;
                }
                
                .building-power {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 10px;
                }
                
                .upgrade-section {
                    border-top: 1px solid #333;
                    padding-top: 10px;
                }
                
                .upgrade-cost {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 10px;
                }
                
                .upgrade-button {
                    width: 100%;
                    padding: 8px;
                    background: #2196F3;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .upgrade-button:hover {
                    background: #1976D2;
                    transform: scale(1.02);
                }
                
                .upgrade-button:disabled {
                    background: #666;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .available-buildings {
                    background: rgba(76, 175, 80, 0.1);
                    border: 1px solid #4CAF50;
                    border-radius: 10px;
                    padding: 20px;
                    margin-top: 25px;
                }
                
                .available-title {
                    font-size: 20px;
                    color: #4CAF50;
                    margin-bottom: 15px;
                }
                
                .build-new-button {
                    padding: 12px 24px;
                    background: #4CAF50;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .build-new-button:hover {
                    background: #45a049;
                    transform: scale(1.05);
                }
                
                .efficiency-warning {
                    background: rgba(255, 152, 0, 0.1);
                    border: 1px solid #FF9800;
                    border-radius: 5px;
                    padding: 10px;
                    margin-top: 15px;
                    font-size: 14px;
                    color: #FFA726;
                }
            </style>
            
            <div class="automation-header">
                <div>
                    <div class="automation-title">🤖 自動化管理</div>
                    <div class="planet-name">${this.currentPlanet?.name || '不明な惑星'}</div>
                </div>
                <button class="automation-close" id="close-automation">×</button>
            </div>
            
            <div class="stats-overview">
                <div class="stats-grid" id="stats-grid">
                    <!-- 統計がここに表示される -->
                </div>
            </div>
            
            <div class="buildings-section">
                <div class="section-title">
                    <span>🏭</span>
                    <span>稼働中の自動化施設</span>
                </div>
                <div class="buildings-grid" id="buildings-grid">
                    <!-- 建物がここに表示される -->
                </div>
            </div>
            
            <div class="available-buildings" id="available-buildings">
                <!-- 建設可能な建物がここに表示される -->
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー
        const closeBtn = document.getElementById('close-automation');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    /**
     * コンテンツを更新
     */
    private updateContent(): void {
        if (!this.currentPlanet) return;
        
        const stats = this.automation.getAutomationStats(this.currentPlanet.id);
        const persistentData = this.persistence.loadPlanetData(this.currentPlanet.id);
        
        // 統計を更新
        this.updateStats(stats);
        
        // 建物リストを更新
        this.updateBuildings(persistentData?.buildings || []);
        
        // 建設可能な建物を更新
        this.updateAvailableBuildings();
    }
    
    /**
     * 統計を更新
     */
    private updateStats(stats: ReturnType<PlanetAutomation['getAutomationStats']>): void {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid || !stats) return;
        
        const efficiency = Math.round(stats.efficiency * 100);
        const efficiencyClass = efficiency >= 80 ? 'positive' : efficiency >= 50 ? 'neutral' : 'negative';
        
        statsGrid.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">稼働施設</div>
                <div class="stat-value neutral">${stats.activeBuildings}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">電力バランス</div>
                <div class="stat-value ${stats.powerBalance >= 0 ? 'positive' : 'negative'}">
                    ${stats.powerBalance >= 0 ? '+' : ''}${stats.powerBalance}
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">効率</div>
                <div class="stat-value ${efficiencyClass}">${efficiency}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">鉱物生産/h</div>
                <div class="stat-value ${stats.totalProduction.minerals >= 0 ? 'positive' : 'negative'}">
                    ${stats.totalProduction.minerals >= 0 ? '+' : ''}${formatNumber(stats.totalProduction.minerals)}
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">エネルギー生産/h</div>
                <div class="stat-value ${stats.totalProduction.energy >= 0 ? 'positive' : 'negative'}">
                    ${stats.totalProduction.energy >= 0 ? '+' : ''}${formatNumber(stats.totalProduction.energy)}
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">パーツ生産/h</div>
                <div class="stat-value ${stats.totalProduction.parts >= 0 ? 'positive' : 'negative'}">
                    ${stats.totalProduction.parts >= 0 ? '+' : ''}${formatNumber(stats.totalProduction.parts)}
                </div>
            </div>
        `;
        
        // 効率が低い場合の警告
        if (efficiency < 50) {
            const warning = document.createElement('div');
            warning.className = 'efficiency-warning';
            warning.innerHTML = '⚠️ 電力不足により生産効率が低下しています。エネルギープラントの建設を検討してください。';
            statsGrid.appendChild(warning);
        }
    }
    
    /**
     * 建物リストを更新
     */
    private updateBuildings(buildings: any[]): void {
        const buildingsGrid = document.getElementById('buildings-grid');
        if (!buildingsGrid) return;
        
        const automationBuildings = buildings.filter(b => 
            Object.keys(AUTOMATION_BUILDINGS).includes(b.type)
        );
        
        if (automationBuildings.length === 0) {
            buildingsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">
                    自動化施設がまだ建設されていません
                </div>
            `;
            return;
        }
        
        buildingsGrid.innerHTML = automationBuildings.map(building => {
            const buildingType = AUTOMATION_BUILDINGS[building.type as keyof typeof AUTOMATION_BUILDINGS];
            if (!buildingType) return '';
            
            const level = building.level || 1;
            const multiplier = Math.pow(buildingType.upgradeMultiplier, level - 1);
            const upgradeCost = this.automation.getUpgradeCost(building.type, level);
            
            return `
                <div class="building-card">
                    <div class="building-header">
                        <div class="building-name">${buildingType.name}</div>
                        <div class="building-level">Lv.${level}</div>
                    </div>
                    
                    <div class="building-production">
                        ${Object.entries(buildingType.baseProduction).map(([resource, amount]) => {
                            const production = amount * multiplier;
                            if (production === 0) return '';
                            
                            const resourceNames: Record<string, string> = {
                                minerals: '鉱物',
                                energy: 'エネルギー',
                                parts: 'パーツ',
                                thoughtPoints: '思考ポイント'
                            };
                            
                            return `
                                <div class="production-item">
                                    <span class="production-resource">${resourceNames[resource] || resource}</span>
                                    <span class="production-value ${production > 0 ? 'positive' : 'negative'}">
                                        ${production > 0 ? '+' : ''}${formatNumber(production)}/h
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${building.type !== 'energyPlant' ? `
                        <div class="building-power">
                            電力消費: ${buildingType.powerConsumption}
                        </div>
                    ` : ''}
                    
                    <div class="upgrade-section">
                        <div class="upgrade-cost">
                            アップグレードコスト: ${this.formatUpgradeCost(upgradeCost)}
                        </div>
                        <button class="upgrade-button" onclick="window.upgradeAutomationBuilding('${this.currentPlanet?.id}', '${building.id}')">
                            レベル ${level + 1} にアップグレード
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // グローバル関数を設定
        (window as any).upgradeAutomationBuilding = (planetId: string, buildingId: string) => {
            if (this.automation.upgradeBuilding(planetId, buildingId)) {
                this.updateContent();
            }
        };
    }
    
    /**
     * 建設可能な建物を更新
     */
    private updateAvailableBuildings(): void {
        const container = document.getElementById('available-buildings');
        if (!container) return;
        
        container.innerHTML = `
            <div class="available-title">🏗️ 新しい自動化施設を建設</div>
            <div style="text-align: center; color: #888; padding: 20px;">
                惑星探索モードで建設できます
            </div>
            <div style="text-align: center;">
                <button class="build-new-button" onclick="window.startPlanetExploration()">
                    惑星を探索する
                </button>
            </div>
        `;
        
        // グローバル関数を設定
        (window as any).startPlanetExploration = () => {
            this.close();
            // 惑星探索を開始
            import('./PlanetExplorationShop.js').then(({ PlanetExplorationShop }) => {
                if (this.currentPlanet) {
                    PlanetExplorationShop.getInstance().open(this.currentPlanet);
                }
            });
        };
    }
    
    /**
     * アップグレードコストをフォーマット
     */
    private formatUpgradeCost(cost: Record<string, number>): string {
        const resourceNames: Record<string, string> = {
            cosmicDust: '宇宙の塵',
            energy: 'エネルギー',
            organicMatter: '有機物',
            thoughtPoints: '思考ポイント'
        };
        
        return Object.entries(cost)
            .map(([resource, amount]) => `${resourceNames[resource] || resource} ${formatNumber(amount)}`)
            .join(', ');
    }
}