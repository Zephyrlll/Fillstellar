/**
 * Planet Ranking UI
 * 惑星ランキングと統計表示UI
 */

import { formatNumber } from '../../utils.js';
import { PlanetPersistence, PlanetPersistentData } from './PlanetPersistence.js';
import { OwnedPlanet } from './planetShop.js';

// ランキングカテゴリ
type RankingCategory = 'resources' | 'buildings' | 'exploration' | 'visits' | 'efficiency';

// ランキングデータ
interface RankingEntry {
    planetId: string;
    planetName: string;
    planetType: string;
    value: number;
    rank: number;
}

export class PlanetRankingUI {
    private static instance: PlanetRankingUI;
    private container: HTMLDivElement | null = null;
    private isOpen = false;
    private currentCategory: RankingCategory = 'resources';
    
    private constructor() {}
    
    static getInstance(): PlanetRankingUI {
        if (!PlanetRankingUI.instance) {
            PlanetRankingUI.instance = new PlanetRankingUI();
        }
        return PlanetRankingUI.instance;
    }
    
    /**
     * UIを開く
     */
    open(): void {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.createUI();
        this.updateRankings();
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
        this.container.id = 'planet-ranking-ui';
        this.container.innerHTML = `
            <style>
                #planet-ranking-ui {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #FFD700;
                    border-radius: 15px;
                    padding: 30px;
                    min-width: 800px;
                    max-width: 1000px;
                    max-height: 85vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
                }
                
                .ranking-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #FFD700;
                }
                
                .ranking-title {
                    font-size: 32px;
                    color: #FFD700;
                    font-weight: bold;
                    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                }
                
                .ranking-close {
                    background: none;
                    border: 1px solid #FFD700;
                    color: #FFD700;
                    font-size: 20px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .ranking-close:hover {
                    background: #FFD700;
                    color: black;
                }
                
                .category-tabs {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 25px;
                    justify-content: center;
                }
                
                .category-tab {
                    padding: 12px 25px;
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid #FFD700;
                    border-radius: 25px;
                    color: #FFD700;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .category-tab:hover {
                    background: rgba(255, 215, 0, 0.2);
                    transform: scale(1.05);
                }
                
                .category-tab.active {
                    background: #FFD700;
                    color: black;
                }
                
                .ranking-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .ranking-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid #444;
                    border-radius: 10px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: all 0.3s;
                    position: relative;
                    overflow: hidden;
                }
                
                .ranking-item.rank-1 {
                    background: rgba(255, 215, 0, 0.15);
                    border-color: #FFD700;
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
                }
                
                .ranking-item.rank-2 {
                    background: rgba(192, 192, 192, 0.15);
                    border-color: #C0C0C0;
                }
                
                .ranking-item.rank-3 {
                    background: rgba(205, 127, 50, 0.15);
                    border-color: #CD7F32;
                }
                
                .ranking-item:hover {
                    transform: translateX(5px);
                    border-color: #FFD700;
                }
                
                .rank-number {
                    font-size: 36px;
                    font-weight: bold;
                    color: #FFD700;
                    min-width: 60px;
                    text-align: center;
                }
                
                .rank-1 .rank-number {
                    color: #FFD700;
                    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                }
                
                .rank-2 .rank-number {
                    color: #C0C0C0;
                }
                
                .rank-3 .rank-number {
                    color: #CD7F32;
                }
                
                .planet-info {
                    flex: 1;
                }
                
                .planet-name {
                    font-size: 20px;
                    color: #FFD700;
                    margin-bottom: 5px;
                }
                
                .planet-type {
                    font-size: 14px;
                    color: #888;
                }
                
                .rank-value {
                    font-size: 24px;
                    color: #4CAF50;
                    font-weight: bold;
                    text-align: right;
                }
                
                .rank-label {
                    font-size: 12px;
                    color: #888;
                    text-align: right;
                    margin-top: 5px;
                }
                
                .medal {
                    position: absolute;
                    right: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 48px;
                    opacity: 0.2;
                }
                
                .rank-1 .medal {
                    opacity: 0.4;
                }
                
                .empty-state {
                    text-align: center;
                    color: #888;
                    padding: 60px;
                    font-size: 18px;
                }
                
                .stats-summary {
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid #FFD700;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 25px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                
                .summary-item {
                    text-align: center;
                }
                
                .summary-label {
                    font-size: 14px;
                    color: #888;
                    margin-bottom: 5px;
                }
                
                .summary-value {
                    font-size: 24px;
                    color: #FFD700;
                    font-weight: bold;
                }
            </style>
            
            <div class="ranking-header">
                <div class="ranking-title">🏆 惑星ランキング</div>
                <button class="ranking-close" id="close-ranking">×</button>
            </div>
            
            <div class="stats-summary" id="stats-summary">
                <!-- 統計サマリーがここに表示される -->
            </div>
            
            <div class="category-tabs">
                <button class="category-tab active" data-category="resources">
                    💎 総資源採取量
                </button>
                <button class="category-tab" data-category="buildings">
                    🏗️ 建設数
                </button>
                <button class="category-tab" data-category="exploration">
                    🗺️ 探索進捗
                </button>
                <button class="category-tab" data-category="visits">
                    🚀 訪問回数
                </button>
                <button class="category-tab" data-category="efficiency">
                    ⚡ 効率性
                </button>
            </div>
            
            <div class="ranking-list" id="ranking-list">
                <!-- ランキングがここに表示される -->
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー
        const closeBtn = document.getElementById('close-ranking');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // カテゴリタブ
        const tabs = document.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = (e.target as HTMLElement).dataset.category as RankingCategory;
                this.switchCategory(category);
            });
        });
    }
    
    /**
     * カテゴリを切り替え
     */
    private switchCategory(category: RankingCategory): void {
        this.currentCategory = category;
        
        // タブのアクティブ状態を更新
        document.querySelectorAll('.category-tab').forEach(tab => {
            if (tab.getAttribute('data-category') === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        this.updateRankings();
    }
    
    /**
     * ランキングを更新
     */
    private updateRankings(): void {
        const ownedPlanets = (gameState as any).ownedPlanets || [];
        const persistence = PlanetPersistence.getInstance();
        
        // 各惑星のデータを収集
        const planetData: Array<{
            planet: OwnedPlanet;
            persistentData: PlanetPersistentData | null;
        }> = ownedPlanets.map((planet: OwnedPlanet) => ({
            planet,
            persistentData: persistence.loadPlanetData(planet.id)
        }));
        
        // カテゴリに応じたランキングを生成
        let rankings: RankingEntry[] = [];
        
        switch (this.currentCategory) {
            case 'resources':
                rankings = this.generateResourceRanking(planetData);
                break;
            case 'buildings':
                rankings = this.generateBuildingRanking(planetData);
                break;
            case 'exploration':
                rankings = this.generateExplorationRanking(planetData);
                break;
            case 'visits':
                rankings = this.generateVisitRanking(planetData);
                break;
            case 'efficiency':
                rankings = this.generateEfficiencyRanking(planetData);
                break;
        }
        
        // 統計サマリーを更新
        this.updateStatsSummary(planetData);
        
        // ランキングリストを更新
        this.updateRankingList(rankings);
    }
    
    /**
     * 資源採取ランキングを生成
     */
    private generateResourceRanking(planetData: Array<{ planet: OwnedPlanet; persistentData: PlanetPersistentData | null }>): RankingEntry[] {
        return planetData
            .map(({ planet, persistentData }) => {
                const totalResources = persistentData
                    ? persistentData.statistics.totalResourcesCollected.minerals +
                      persistentData.statistics.totalResourcesCollected.energy +
                      persistentData.statistics.totalResourcesCollected.parts
                    : 0;
                
                return {
                    planetId: planet.id,
                    planetName: planet.name,
                    planetType: this.getTypeName(planet.type),
                    value: totalResources,
                    rank: 0
                };
            })
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    
    /**
     * 建設数ランキングを生成
     */
    private generateBuildingRanking(planetData: Array<{ planet: OwnedPlanet; persistentData: PlanetPersistentData | null }>): RankingEntry[] {
        return planetData
            .map(({ planet, persistentData }) => ({
                planetId: planet.id,
                planetName: planet.name,
                planetType: this.getTypeName(planet.type),
                value: persistentData ? persistentData.buildings.length : 0,
                rank: 0
            }))
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    
    /**
     * 探索進捗ランキングを生成
     */
    private generateExplorationRanking(planetData: Array<{ planet: OwnedPlanet; persistentData: PlanetPersistentData | null }>): RankingEntry[] {
        return planetData
            .map(({ planet, persistentData }) => {
                const progress = persistentData
                    ? persistentData.exploration.areasDiscovered.length +
                      persistentData.exploration.secretsFound.length +
                      persistentData.exploration.landmarksVisited.length
                    : 0;
                
                return {
                    planetId: planet.id,
                    planetName: planet.name,
                    planetType: this.getTypeName(planet.type),
                    value: progress,
                    rank: 0
                };
            })
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    
    /**
     * 訪問回数ランキングを生成
     */
    private generateVisitRanking(planetData: Array<{ planet: OwnedPlanet; persistentData: PlanetPersistentData | null }>): RankingEntry[] {
        return planetData
            .map(({ planet, persistentData }) => ({
                planetId: planet.id,
                planetName: planet.name,
                planetType: this.getTypeName(planet.type),
                value: persistentData ? persistentData.statistics.totalVisits : 0,
                rank: 0
            }))
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    
    /**
     * 効率性ランキングを生成（訪問あたりの資源採取量）
     */
    private generateEfficiencyRanking(planetData: Array<{ planet: OwnedPlanet; persistentData: PlanetPersistentData | null }>): RankingEntry[] {
        return planetData
            .map(({ planet, persistentData }) => {
                if (!persistentData || persistentData.statistics.totalVisits === 0) {
                    return {
                        planetId: planet.id,
                        planetName: planet.name,
                        planetType: this.getTypeName(planet.type),
                        value: 0,
                        rank: 0
                    };
                }
                
                const totalResources = 
                    persistentData.statistics.totalResourcesCollected.minerals +
                    persistentData.statistics.totalResourcesCollected.energy +
                    persistentData.statistics.totalResourcesCollected.parts;
                
                const efficiency = totalResources / persistentData.statistics.totalVisits;
                
                return {
                    planetId: planet.id,
                    planetName: planet.name,
                    planetType: this.getTypeName(planet.type),
                    value: Math.round(efficiency),
                    rank: 0
                };
            })
            .sort((a, b) => b.value - a.value)
            .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
    
    /**
     * 統計サマリーを更新
     */
    private updateStatsSummary(planetData: Array<{ planet: OwnedPlanet; persistentData: PlanetPersistentData | null }>): void {
        const summaryContainer = document.getElementById('stats-summary');
        if (!summaryContainer) return;
        
        // 集計
        let totalPlanets = planetData.length;
        let totalVisits = 0;
        let totalBuildings = 0;
        let totalResources = 0;
        let totalAreas = 0;
        
        planetData.forEach(({ persistentData }) => {
            if (persistentData) {
                totalVisits += persistentData.statistics.totalVisits;
                totalBuildings += persistentData.buildings.length;
                totalResources += 
                    persistentData.statistics.totalResourcesCollected.minerals +
                    persistentData.statistics.totalResourcesCollected.energy +
                    persistentData.statistics.totalResourcesCollected.parts;
                totalAreas += persistentData.exploration.areasDiscovered.length;
            }
        });
        
        summaryContainer.innerHTML = `
            <div class="summary-item">
                <div class="summary-label">所有惑星</div>
                <div class="summary-value">${totalPlanets}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">総訪問回数</div>
                <div class="summary-value">${totalVisits}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">総建物数</div>
                <div class="summary-value">${totalBuildings}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">総資源採取</div>
                <div class="summary-value">${formatNumber(totalResources)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">発見エリア</div>
                <div class="summary-value">${totalAreas}</div>
            </div>
        `;
    }
    
    /**
     * ランキングリストを更新
     */
    private updateRankingList(rankings: RankingEntry[]): void {
        const listContainer = document.getElementById('ranking-list');
        if (!listContainer) return;
        
        if (rankings.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    まだランキングデータがありません
                </div>
            `;
            return;
        }
        
        const categoryLabels: Record<RankingCategory, string> = {
            resources: '総資源',
            buildings: '建物',
            exploration: '発見',
            visits: '回',
            efficiency: '資源/回'
        };
        
        listContainer.innerHTML = rankings.map((entry, index) => {
            const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';
            
            return `
                <div class="ranking-item rank-${entry.rank}">
                    <div class="rank-number">${entry.rank}</div>
                    <div class="planet-info">
                        <div class="planet-name">${entry.planetName}</div>
                        <div class="planet-type">${entry.planetType}</div>
                    </div>
                    <div>
                        <div class="rank-value">${formatNumber(entry.value)}</div>
                        <div class="rank-label">${categoryLabels[this.currentCategory]}</div>
                    </div>
                    ${medal ? `<div class="medal">${medal}</div>` : ''}
                </div>
            `;
        }).join('');
    }
    
    /**
     * 惑星タイプの表示名を取得
     */
    private getTypeName(type: string): string {
        const typeNames: Record<string, string> = {
            desert: '砂漠惑星',
            ocean: '海洋惑星',
            forest: '森林惑星',
            ice: '氷惑星',
            volcanic: '火山惑星',
            gas: 'ガス惑星'
        };
        return typeNames[type] || type;
    }
    
    /**
     * トグル
     */
    toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}