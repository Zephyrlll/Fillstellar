/**
 * Planet Automation System
 * 惑星の自動化とオフライン生産
 */

import { OwnedPlanet } from './planetShop.js';
import { PlanetPersistence, BuildingData } from './PlanetPersistence.js';
import { gameState } from '../../state.js';
import { showMessage } from '../../ui.js';
import { addTimelineLog } from '../../timeline.js';

// 自動化可能な建物タイプ
export const AUTOMATION_BUILDINGS = {
    miner: {
        name: '採掘施設',
        baseProduction: {
            minerals: 10,
            energy: 0,
            parts: 0
        },
        upgradeMultiplier: 1.5,
        powerConsumption: 5
    },
    energyPlant: {
        name: 'エネルギープラント',
        baseProduction: {
            minerals: 0,
            energy: 20,
            parts: 0
        },
        upgradeMultiplier: 1.5,
        powerConsumption: 0 // 自己発電
    },
    factory: {
        name: '部品工場',
        baseProduction: {
            minerals: -5, // 消費
            energy: -10,  // 消費
            parts: 15
        },
        upgradeMultiplier: 1.8,
        powerConsumption: 10
    },
    researchLab: {
        name: '研究施設',
        baseProduction: {
            minerals: 0,
            energy: -15,
            parts: 0,
            thoughtPoints: 1 // 特殊生産
        },
        upgradeMultiplier: 2.0,
        powerConsumption: 20
    }
};

// オフライン生産結果
export interface OfflineProduction {
    planetId: string;
    planetName: string;
    duration: number; // 秒
    resources: {
        minerals: number;
        energy: number;
        parts: number;
        thoughtPoints?: number;
    };
    efficiency: number; // 効率率 (0-1)
    buildingsActive: number;
    powerBalance: number;
}

export class PlanetAutomation {
    private static instance: PlanetAutomation;
    private persistence: PlanetPersistence;
    private readonly MAX_OFFLINE_HOURS = 24; // 最大24時間分
    private readonly OFFLINE_EFFICIENCY = 0.5; // オフライン時の効率50%
    
    private constructor() {
        this.persistence = PlanetPersistence.getInstance();
    }
    
    static getInstance(): PlanetAutomation {
        if (!PlanetAutomation.instance) {
            PlanetAutomation.instance = new PlanetAutomation();
        }
        return PlanetAutomation.instance;
    }
    
    /**
     * 全惑星のオフライン生産を計算
     */
    calculateAllOfflineProduction(): OfflineProduction[] {
        const ownedPlanets = (gameState as any).ownedPlanets || [];
        const results: OfflineProduction[] = [];
        
        for (const planet of ownedPlanets) {
            const result = this.calculatePlanetOfflineProduction(planet);
            if (result && result.duration > 60) { // 1分以上のみ
                results.push(result);
            }
        }
        
        return results;
    }
    
    /**
     * 惑星のオフライン生産を計算
     */
    calculatePlanetOfflineProduction(planet: OwnedPlanet): OfflineProduction | null {
        const persistentData = this.persistence.loadPlanetData(planet.id);
        if (!persistentData || persistentData.buildings.length === 0) {
            return null;
        }
        
        const now = Date.now();
        const lastVisited = persistentData.exploration.lastVisited;
        const offlineSeconds = Math.floor((now - lastVisited) / 1000);
        
        // 最大時間制限
        const maxSeconds = this.MAX_OFFLINE_HOURS * 3600;
        const actualSeconds = Math.min(offlineSeconds, maxSeconds);
        
        if (actualSeconds <= 0) return null;
        
        // 建物ごとの生産を計算
        const production = {
            minerals: 0,
            energy: 0,
            parts: 0,
            thoughtPoints: 0
        };
        
        let totalPowerConsumption = 0;
        let totalPowerGeneration = 0;
        let activeBuildings = 0;
        
        for (const building of persistentData.buildings) {
            const buildingType = AUTOMATION_BUILDINGS[building.type as keyof typeof AUTOMATION_BUILDINGS];
            if (!buildingType) continue;
            
            const level = building.level || 1;
            const multiplier = Math.pow(buildingType.upgradeMultiplier, level - 1);
            
            // 電力計算
            if (building.type === 'energyPlant') {
                totalPowerGeneration += buildingType.baseProduction.energy * multiplier;
            } else {
                totalPowerConsumption += buildingType.powerConsumption;
            }
            
            // 生産計算
            if (buildingType.baseProduction.minerals) {
                production.minerals += buildingType.baseProduction.minerals * multiplier;
            }
            if (buildingType.baseProduction.energy && building.type !== 'energyPlant') {
                production.energy += buildingType.baseProduction.energy * multiplier;
            }
            if (buildingType.baseProduction.parts) {
                production.parts += buildingType.baseProduction.parts * multiplier;
            }
            if ((buildingType.baseProduction as any).thoughtPoints) {
                production.thoughtPoints += (buildingType.baseProduction as any).thoughtPoints * multiplier;
            }
            
            activeBuildings++;
        }
        
        // 電力バランスチェック
        const powerBalance = totalPowerGeneration - totalPowerConsumption;
        let efficiency = this.OFFLINE_EFFICIENCY;
        
        if (powerBalance < 0) {
            // 電力不足の場合、効率低下
            efficiency *= Math.max(0.1, 1 + (powerBalance / totalPowerConsumption));
        }
        
        // 時間経過分の生産を計算
        const timeMultiplier = actualSeconds / 3600; // 時間単位に変換
        
        const finalProduction = {
            minerals: Math.floor(production.minerals * timeMultiplier * efficiency),
            energy: Math.floor((production.energy + totalPowerGeneration) * timeMultiplier * efficiency),
            parts: Math.floor(production.parts * timeMultiplier * efficiency),
            thoughtPoints: Math.floor(production.thoughtPoints * timeMultiplier * efficiency)
        };
        
        // 負の値は0に
        Object.keys(finalProduction).forEach(key => {
            finalProduction[key as keyof typeof finalProduction] = Math.max(0, finalProduction[key as keyof typeof finalProduction]);
        });
        
        return {
            planetId: planet.id,
            planetName: planet.name,
            duration: actualSeconds,
            resources: finalProduction,
            efficiency,
            buildingsActive: activeBuildings,
            powerBalance
        };
    }
    
    /**
     * オフライン生産を適用
     */
    applyOfflineProduction(productions: OfflineProduction[]): void {
        let totalResources = {
            cosmicDust: 0,
            energy: 0,
            thoughtPoints: 0,
            organicMatter: 0
        };
        
        productions.forEach(production => {
            // リソース変換レートを適用
            const conversionRates = {
                minerals: 10,  // 鉱物 → 宇宙の塵
                energy: 5,     // エネルギー → エネルギー
                parts: 50,     // パーツ → 思考ポイント
            };
            
            totalResources.cosmicDust += production.resources.minerals * conversionRates.minerals;
            totalResources.energy += production.resources.energy * conversionRates.energy;
            totalResources.thoughtPoints += production.resources.parts * conversionRates.parts;
            
            if (production.resources.thoughtPoints) {
                totalResources.thoughtPoints += production.resources.thoughtPoints * 100;
            }
            
            // 惑星の統計を更新
            this.persistence.updateStatistics(production.planetId, {
                resourcesCollected: production.resources
            });
        });
        
        // ゲーム状態に追加
        gameState.resources.cosmicDust += totalResources.cosmicDust;
        gameState.resources.energy += totalResources.energy;
        gameState.resources.thoughtPoints += totalResources.thoughtPoints;
        
        // ログ出力
        if (productions.length > 0) {
            const totalHours = Math.floor(productions.reduce((sum, p) => sum + p.duration, 0) / 3600);
            addTimelineLog(
                `オフライン生産報告: ${productions.length}個の惑星から${totalHours}時間分のリソースを回収`
            );
        }
    }
    
    /**
     * 自動化建物をアップグレード
     */
    upgradeBuilding(planetId: string, buildingId: string): boolean {
        const persistentData = this.persistence.loadPlanetData(planetId);
        if (!persistentData) return false;
        
        const building = persistentData.buildings.find(b => b.id === buildingId);
        if (!building) return false;
        
        const buildingType = AUTOMATION_BUILDINGS[building.type as keyof typeof AUTOMATION_BUILDINGS];
        if (!buildingType) return false;
        
        const currentLevel = building.level || 1;
        const upgradeCost = this.getUpgradeCost(building.type, currentLevel);
        
        // コストチェック
        if (!this.canAffordUpgrade(upgradeCost)) {
            showMessage('アップグレードに必要なリソースが不足しています', 'error');
            return false;
        }
        
        // コストを消費
        this.consumeUpgradeCost(upgradeCost);
        
        // レベルアップ
        building.level = currentLevel + 1;
        this.persistence.addBuilding(planetId, building);
        
        showMessage(`${buildingType.name} Lv.${building.level}にアップグレードしました！`, 'success');
        
        return true;
    }
    
    /**
     * アップグレードコストを取得
     */
    getUpgradeCost(buildingType: string, currentLevel: number): Record<string, number> {
        const baseCosts: Record<string, Record<string, number>> = {
            miner: { cosmicDust: 1000, energy: 500 },
            energyPlant: { cosmicDust: 2000, energy: 1000 },
            factory: { cosmicDust: 3000, energy: 2000, organicMatter: 1000 },
            researchLab: { cosmicDust: 5000, energy: 3000, thoughtPoints: 100 }
        };
        
        const base = baseCosts[buildingType] || { cosmicDust: 1000 };
        const multiplier = Math.pow(2, currentLevel - 1);
        
        const cost: Record<string, number> = {};
        Object.entries(base).forEach(([resource, amount]) => {
            cost[resource] = Math.floor(amount * multiplier);
        });
        
        return cost;
    }
    
    /**
     * アップグレードコストを支払えるかチェック
     */
    private canAffordUpgrade(cost: Record<string, number>): boolean {
        for (const [resource, amount] of Object.entries(cost)) {
            if ((gameState.resources as any)[resource] < amount) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * アップグレードコストを消費
     */
    private consumeUpgradeCost(cost: Record<string, number>): void {
        for (const [resource, amount] of Object.entries(cost)) {
            (gameState.resources as any)[resource] -= amount;
        }
    }
    
    /**
     * 自動化統計を取得
     */
    getAutomationStats(planetId: string): {
        totalProduction: Record<string, number>;
        powerBalance: number;
        efficiency: number;
        activeBuildings: number;
    } | null {
        const persistentData = this.persistence.loadPlanetData(planetId);
        if (!persistentData) return null;
        
        const totalProduction: Record<string, number> = {
            minerals: 0,
            energy: 0,
            parts: 0,
            thoughtPoints: 0
        };
        
        let totalPowerConsumption = 0;
        let totalPowerGeneration = 0;
        let activeBuildings = 0;
        
        for (const building of persistentData.buildings) {
            const buildingType = AUTOMATION_BUILDINGS[building.type as keyof typeof AUTOMATION_BUILDINGS];
            if (!buildingType) continue;
            
            const level = building.level || 1;
            const multiplier = Math.pow(buildingType.upgradeMultiplier, level - 1);
            
            // 電力計算
            if (building.type === 'energyPlant') {
                totalPowerGeneration += buildingType.baseProduction.energy * multiplier;
            } else {
                totalPowerConsumption += buildingType.powerConsumption;
            }
            
            // 生産計算
            Object.entries(buildingType.baseProduction).forEach(([resource, amount]) => {
                if (resource !== 'energy' || building.type !== 'energyPlant') {
                    totalProduction[resource] = (totalProduction[resource] || 0) + amount * multiplier;
                }
            });
            
            activeBuildings++;
        }
        
        // 電力を生産に追加
        totalProduction.energy += totalPowerGeneration;
        
        const powerBalance = totalPowerGeneration - totalPowerConsumption;
        const efficiency = powerBalance >= 0 ? 1.0 : Math.max(0.1, 1 + (powerBalance / totalPowerConsumption));
        
        return {
            totalProduction,
            powerBalance,
            efficiency,
            activeBuildings
        };
    }
}