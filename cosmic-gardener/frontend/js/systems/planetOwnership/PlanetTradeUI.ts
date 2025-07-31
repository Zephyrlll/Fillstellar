/**
 * Planet Trade UI
 * 惑星間貿易管理UI
 */

import { formatNumber } from '../../utils.js';
import { PlanetTradeSystem, TradeRoute, PLANET_SPECIALTIES } from './PlanetTradeSystem.js';
import { OwnedPlanet } from './planetShop.js';
import { gameState } from '../../state.js';

export class PlanetTradeUI {
    private static instance: PlanetTradeUI;
    private container: HTMLDivElement | null = null;
    private isOpen = false;
    private tradeSystem: PlanetTradeSystem;
    private selectedFromPlanet: OwnedPlanet | null = null;
    private selectedToPlanet: OwnedPlanet | null = null;
    private selectedResourceType: 'minerals' | 'energy' | 'parts' | 'mixed' = 'mixed';
    
    private constructor() {
        this.tradeSystem = PlanetTradeSystem.getInstance();
    }
    
    static getInstance(): PlanetTradeUI {
        if (!PlanetTradeUI.instance) {
            PlanetTradeUI.instance = new PlanetTradeUI();
        }
        return PlanetTradeUI.instance;
    }
    
    /**
     * UIを開く
     */
    open(): void {
        if (this.isOpen) return;
        
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
    }
    
    /**
     * UIを作成
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'planet-trade-ui';
        this.container.innerHTML = `
            <style>
                #planet-trade-ui {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #FF9800;
                    border-radius: 15px;
                    padding: 30px;
                    min-width: 900px;
                    max-width: 1100px;
                    max-height: 85vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 0 30px rgba(255, 152, 0, 0.4);
                }
                
                .trade-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #FF9800;
                }
                
                .trade-title {
                    font-size: 32px;
                    color: #FF9800;
                    font-weight: bold;
                }
                
                .trade-close {
                    background: none;
                    border: 1px solid #FF9800;
                    color: #FF9800;
                    font-size: 20px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .trade-close:hover {
                    background: #FF9800;
                    color: black;
                }
                
                .trade-stats {
                    background: rgba(255, 152, 0, 0.1);
                    border: 1px solid #FF9800;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 25px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                
                .stat-box {
                    text-align: center;
                }
                
                .stat-label {
                    font-size: 14px;
                    color: #888;
                    margin-bottom: 5px;
                }
                
                .stat-value {
                    font-size: 24px;
                    color: #FF9800;
                    font-weight: bold;
                }
                
                .route-creator {
                    background: rgba(76, 175, 80, 0.1);
                    border: 1px solid #4CAF50;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 25px;
                }
                
                .creator-title {
                    font-size: 20px;
                    color: #4CAF50;
                    margin-bottom: 15px;
                }
                
                .planet-selector {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    gap: 20px;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .planet-select {
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid #666;
                    border-radius: 5px;
                    padding: 10px;
                    color: white;
                    font-size: 16px;
                }
                
                .arrow {
                    font-size: 24px;
                    color: #FF9800;
                }
                
                .resource-selector {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                .resource-option {
                    padding: 10px 20px;
                    background: rgba(255, 152, 0, 0.2);
                    border: 1px solid #FF9800;
                    border-radius: 5px;
                    color: #FF9800;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .resource-option:hover {
                    background: rgba(255, 152, 0, 0.4);
                }
                
                .resource-option.selected {
                    background: #FF9800;
                    color: black;
                }
                
                .route-cost {
                    text-align: center;
                    margin-bottom: 15px;
                    font-size: 14px;
                    color: #888;
                }
                
                .create-route-button {
                    display: block;
                    margin: 0 auto;
                    padding: 12px 30px;
                    background: #4CAF50;
                    border: none;
                    border-radius: 5px;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .create-route-button:hover {
                    background: #45a049;
                    transform: scale(1.05);
                }
                
                .create-route-button:disabled {
                    background: #666;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .routes-section {
                    margin-top: 25px;
                }
                
                .section-title {
                    font-size: 24px;
                    color: #FF9800;
                    margin-bottom: 15px;
                }
                
                .routes-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .route-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid #444;
                    border-radius: 10px;
                    padding: 20px;
                    transition: all 0.3s;
                }
                
                .route-card:hover {
                    border-color: #FF9800;
                    transform: translateY(-2px);
                }
                
                .route-card.inactive {
                    opacity: 0.5;
                }
                
                .route-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .route-path {
                    font-size: 18px;
                    color: #FFD700;
                    font-weight: bold;
                }
                
                .route-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .route-button {
                    padding: 6px 12px;
                    background: none;
                    border: 1px solid #666;
                    border-radius: 5px;
                    color: #AAA;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 14px;
                }
                
                .route-button:hover {
                    border-color: #FF9800;
                    color: #FF9800;
                }
                
                .route-button.toggle {
                    border-color: #4CAF50;
                    color: #4CAF50;
                }
                
                .route-button.toggle:hover {
                    background: #4CAF50;
                    color: black;
                }
                
                .route-button.delete {
                    border-color: #f44336;
                    color: #f44336;
                }
                
                .route-button.delete:hover {
                    background: #f44336;
                    color: white;
                }
                
                .route-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                }
                
                .route-detail {
                    text-align: center;
                    background: rgba(0, 0, 0, 0.3);
                    padding: 10px;
                    border-radius: 5px;
                }
                
                .detail-label {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 5px;
                }
                
                .detail-value {
                    font-size: 16px;
                    color: #FF9800;
                    font-weight: bold;
                }
                
                .no-routes {
                    text-align: center;
                    color: #888;
                    padding: 40px;
                    font-size: 16px;
                }
                
                .planet-specialty {
                    font-size: 12px;
                    color: #4CAF50;
                    margin-top: 5px;
                }
            </style>
            
            <div class="trade-header">
                <div class="trade-title">🚢 惑星間貿易</div>
                <button class="trade-close" id="close-trade">×</button>
            </div>
            
            <div class="trade-stats" id="trade-stats">
                <!-- 貿易統計がここに表示される -->
            </div>
            
            <div class="route-creator">
                <div class="creator-title">📍 新しい貿易ルートを確立</div>
                
                <div class="planet-selector">
                    <select class="planet-select" id="from-planet-select">
                        <option value="">出発惑星を選択</option>
                    </select>
                    <div class="arrow">→</div>
                    <select class="planet-select" id="to-planet-select">
                        <option value="">到着惑星を選択</option>
                    </select>
                </div>
                
                <div class="resource-selector" id="resource-selector">
                    <div class="resource-option selected" data-type="mixed">🔄 混合貿易</div>
                    <div class="resource-option" data-type="minerals">💎 鉱物</div>
                    <div class="resource-option" data-type="energy">⚡ エネルギー</div>
                    <div class="resource-option" data-type="parts">🔧 パーツ</div>
                </div>
                
                <div class="route-cost">
                    確立コスト: 宇宙の塵 50,000 / エネルギー 20,000 / 思考ポイント 500
                </div>
                
                <button class="create-route-button" id="create-route-button">
                    貿易ルートを確立
                </button>
            </div>
            
            <div class="routes-section">
                <div class="section-title">📊 既存の貿易ルート</div>
                <div class="routes-list" id="routes-list">
                    <!-- 貿易ルートがここに表示される -->
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー設定
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 閉じるボタン
        const closeBtn = document.getElementById('close-trade');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // 惑星選択
        const fromSelect = document.getElementById('from-planet-select') as HTMLSelectElement;
        const toSelect = document.getElementById('to-planet-select') as HTMLSelectElement;
        
        if (fromSelect) {
            fromSelect.addEventListener('change', (e) => {
                const planetId = (e.target as HTMLSelectElement).value;
                this.selectedFromPlanet = this.getPlanetById(planetId);
                this.updateCreateButton();
            });
        }
        
        if (toSelect) {
            toSelect.addEventListener('change', (e) => {
                const planetId = (e.target as HTMLSelectElement).value;
                this.selectedToPlanet = this.getPlanetById(planetId);
                this.updateCreateButton();
            });
        }
        
        // リソースタイプ選択
        const resourceOptions = document.querySelectorAll('.resource-option');
        resourceOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                resourceOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedResourceType = (option as HTMLElement).dataset.type as any;
            });
        });
        
        // ルート作成ボタン
        const createBtn = document.getElementById('create-route-button');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createRoute());
        }
    }
    
    /**
     * コンテンツを更新
     */
    private updateContent(): void {
        this.updateStats();
        this.updatePlanetSelectors();
        this.updateRoutesList();
    }
    
    /**
     * 統計を更新
     */
    private updateStats(): void {
        const statsContainer = document.getElementById('trade-stats');
        if (!statsContainer) return;
        
        const stats = this.tradeSystem.getTradeStatistics();
        const ownedPlanets = (gameState as any).ownedPlanets || [];
        
        statsContainer.innerHTML = `
            <div class="stat-box">
                <div class="stat-label">所有惑星</div>
                <div class="stat-value">${ownedPlanets.length}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">貿易ルート</div>
                <div class="stat-value">${stats.activeRoutes}/${stats.totalRoutes}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">総取引量</div>
                <div class="stat-value">${formatNumber(
                    stats.totalVolume.minerals + stats.totalVolume.energy + stats.totalVolume.parts
                )}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">総利益</div>
                <div class="stat-value">${formatNumber(stats.totalProfit)}</div>
            </div>
        `;
    }
    
    /**
     * 惑星セレクターを更新
     */
    private updatePlanetSelectors(): void {
        const ownedPlanets = (gameState as any).ownedPlanets || [];
        const fromSelect = document.getElementById('from-planet-select') as HTMLSelectElement;
        const toSelect = document.getElementById('to-planet-select') as HTMLSelectElement;
        
        if (!fromSelect || !toSelect) return;
        
        const createOptions = (planets: OwnedPlanet[]) => {
            return `
                <option value="">惑星を選択</option>
                ${planets.map(planet => {
                    const specialty = PLANET_SPECIALTIES[planet.type];
                    return `
                        <option value="${planet.id}">
                            ${planet.name} (${this.getTypeName(planet.type)})
                            ${specialty ? ` - ${this.getResourceName(specialty.resource)}特産` : ''}
                        </option>
                    `;
                }).join('')}
            `;
        };
        
        fromSelect.innerHTML = createOptions(ownedPlanets);
        toSelect.innerHTML = createOptions(ownedPlanets);
    }
    
    /**
     * ルートリストを更新
     */
    private updateRoutesList(): void {
        const routesList = document.getElementById('routes-list');
        if (!routesList) return;
        
        const routes = this.tradeSystem.getAllRoutes();
        
        if (routes.length === 0) {
            routesList.innerHTML = `
                <div class="no-routes">
                    まだ貿易ルートが確立されていません
                </div>
            `;
            return;
        }
        
        routesList.innerHTML = routes.map(route => {
            const fromPlanet = this.getPlanetById(route.fromPlanetId);
            const toPlanet = this.getPlanetById(route.toPlanetId);
            
            if (!fromPlanet || !toPlanet) return '';
            
            return `
                <div class="route-card ${route.active ? '' : 'inactive'}">
                    <div class="route-header">
                        <div class="route-path">
                            ${fromPlanet.name} → ${toPlanet.name}
                        </div>
                        <div class="route-actions">
                            <button class="route-button toggle" onclick="window.toggleTradeRoute('${route.id}')">
                                ${route.active ? '⏸️ 一時停止' : '▶️ 再開'}
                            </button>
                            <button class="route-button delete" onclick="window.deleteTradeRoute('${route.id}')">
                                🗑️ 削除
                            </button>
                        </div>
                    </div>
                    
                    <div class="route-details">
                        <div class="route-detail">
                            <div class="detail-label">貿易品</div>
                            <div class="detail-value">${this.getResourceTypeName(route.resourceType)}</div>
                        </div>
                        <div class="route-detail">
                            <div class="detail-label">取引量/回</div>
                            <div class="detail-value">${formatNumber(route.tradeAmount)}</div>
                        </div>
                        <div class="route-detail">
                            <div class="detail-label">頻度</div>
                            <div class="detail-value">${route.frequency}回/時</div>
                        </div>
                        <div class="route-detail">
                            <div class="detail-label">効率</div>
                            <div class="detail-value">${Math.round(route.efficiency * 100)}%</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // グローバル関数設定
        (window as any).toggleTradeRoute = (routeId: string) => {
            this.tradeSystem.toggleRoute(routeId);
            this.updateContent();
        };
        
        (window as any).deleteTradeRoute = (routeId: string) => {
            if (confirm('この貿易ルートを削除しますか？')) {
                this.tradeSystem.removeRoute(routeId);
                this.updateContent();
            }
        };
    }
    
    /**
     * ルート作成ボタンを更新
     */
    private updateCreateButton(): void {
        const button = document.getElementById('create-route-button') as HTMLButtonElement;
        if (!button) return;
        
        const canCreate = this.selectedFromPlanet && this.selectedToPlanet && 
                         this.selectedFromPlanet.id !== this.selectedToPlanet.id;
        
        button.disabled = !canCreate;
    }
    
    /**
     * ルートを作成
     */
    private createRoute(): void {
        if (!this.selectedFromPlanet || !this.selectedToPlanet) return;
        
        if (this.tradeSystem.establishRoute(
            this.selectedFromPlanet,
            this.selectedToPlanet,
            this.selectedResourceType
        )) {
            // 選択をリセット
            this.selectedFromPlanet = null;
            this.selectedToPlanet = null;
            this.selectedResourceType = 'mixed';
            
            // UIを更新
            const fromSelect = document.getElementById('from-planet-select') as HTMLSelectElement;
            const toSelect = document.getElementById('to-planet-select') as HTMLSelectElement;
            if (fromSelect) fromSelect.value = '';
            if (toSelect) toSelect.value = '';
            
            this.updateContent();
        }
    }
    
    /**
     * 惑星IDから惑星を取得
     */
    private getPlanetById(planetId: string): OwnedPlanet | null {
        if (!planetId) return null;
        const ownedPlanets = (gameState as any).ownedPlanets || [];
        return ownedPlanets.find((p: OwnedPlanet) => p.id === planetId) || null;
    }
    
    /**
     * 惑星タイプの表示名を取得
     */
    private getTypeName(type: string): string {
        const typeNames: Record<string, string> = {
            desert: '砂漠',
            ocean: '海洋',
            forest: '森林',
            ice: '氷',
            volcanic: '火山',
            gas: 'ガス'
        };
        return typeNames[type] || type;
    }
    
    /**
     * リソースの表示名を取得
     */
    private getResourceName(resource: string): string {
        const resourceNames: Record<string, string> = {
            minerals: '鉱物',
            energy: 'エネルギー',
            parts: 'パーツ'
        };
        return resourceNames[resource] || resource;
    }
    
    /**
     * リソースタイプの表示名を取得
     */
    private getResourceTypeName(type: string): string {
        const typeNames: Record<string, string> = {
            minerals: '💎 鉱物',
            energy: '⚡ エネルギー',
            parts: '🔧 パーツ',
            mixed: '🔄 混合'
        };
        return typeNames[type] || type;
    }
}