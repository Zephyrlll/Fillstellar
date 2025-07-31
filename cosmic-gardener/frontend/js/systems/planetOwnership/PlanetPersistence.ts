/**
 * Planet Persistence System
 * 惑星の永続性データ管理
 */

import { OwnedPlanet } from './planetShop.js';

// 建物データ
export interface BuildingData {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    level: number;
    health: number;
    constructedAt: number;
    metadata?: Record<string, any>;
}

// 地形変更データ
export interface TerrainModification {
    id: string;
    type: 'flatten' | 'raise' | 'lower' | 'smooth';
    position: { x: number; z: number };
    radius: number;
    intensity: number;
    timestamp: number;
}

// 探索進捗データ
export interface ExplorationProgress {
    areasDiscovered: string[];
    secretsFound: string[];
    landmarksVisited: string[];
    totalDistanceTraveled: number;
    totalTimeSpent: number;
    lastVisited: number;
}

// リソースノードデータ
export interface ResourceNode {
    id: string;
    type: 'mineral' | 'energy' | 'rare';
    position: { x: number; y: number; z: number };
    remainingAmount: number;
    maxAmount: number;
    depleted: boolean;
}

// 惑星の永続データ
export interface PlanetPersistentData {
    planetId: string;
    version: string;
    lastSaved: number;
    buildings: BuildingData[];
    terrainModifications: TerrainModification[];
    exploration: ExplorationProgress;
    resourceNodes: ResourceNode[];
    inventory: {
        items: Array<{ id: string; count: number }>;
        resources: {
            minerals: number;
            energy: number;
            parts: number;
        };
    };
    statistics: {
        totalVisits: number;
        totalResourcesCollected: {
            minerals: number;
            energy: number;
            parts: number;
        };
        buildingsConstructed: number;
        achievementsUnlocked: string[];
    };
}

export class PlanetPersistence {
    private static instance: PlanetPersistence;
    private readonly STORAGE_PREFIX = 'planet_data_';
    private readonly CURRENT_VERSION = '1.0.0';
    
    private constructor() {}
    
    static getInstance(): PlanetPersistence {
        if (!PlanetPersistence.instance) {
            PlanetPersistence.instance = new PlanetPersistence();
        }
        return PlanetPersistence.instance;
    }
    
    /**
     * 惑星データを保存
     */
    savePlanetData(planetId: string, data: Partial<PlanetPersistentData>): void {
        const existingData = this.loadPlanetData(planetId);
        
        const updatedData: PlanetPersistentData = {
            ...this.createDefaultData(planetId),
            ...existingData,
            ...data,
            planetId,
            version: this.CURRENT_VERSION,
            lastSaved: Date.now()
        };
        
        try {
            localStorage.setItem(
                this.STORAGE_PREFIX + planetId,
                JSON.stringify(updatedData)
            );
            console.log('[PERSISTENCE] Planet data saved:', planetId);
        } catch (error) {
            console.error('[PERSISTENCE] Failed to save planet data:', error);
        }
    }
    
    /**
     * 惑星データを読み込み
     */
    loadPlanetData(planetId: string): PlanetPersistentData | null {
        try {
            const saved = localStorage.getItem(this.STORAGE_PREFIX + planetId);
            if (!saved) return null;
            
            const data = JSON.parse(saved) as PlanetPersistentData;
            
            // バージョンチェック
            if (data.version !== this.CURRENT_VERSION) {
                console.log('[PERSISTENCE] Migrating planet data from version:', data.version);
                return this.migrateData(data);
            }
            
            return data;
        } catch (error) {
            console.error('[PERSISTENCE] Failed to load planet data:', error);
            return null;
        }
    }
    
    /**
     * 建物を追加
     */
    addBuilding(planetId: string, building: BuildingData): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        // 重複チェック
        const existingIndex = data.buildings.findIndex(b => b.id === building.id);
        if (existingIndex >= 0) {
            data.buildings[existingIndex] = building;
        } else {
            data.buildings.push(building);
        }
        
        // 統計を更新
        data.statistics.buildingsConstructed = data.buildings.length;
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * 建物を削除
     */
    removeBuilding(planetId: string, buildingId: string): void {
        const data = this.loadPlanetData(planetId);
        if (!data) return;
        
        data.buildings = data.buildings.filter(b => b.id !== buildingId);
        data.statistics.buildingsConstructed = data.buildings.length;
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * 地形変更を記録
     */
    addTerrainModification(planetId: string, modification: TerrainModification): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        data.terrainModifications.push(modification);
        
        // 古い変更を削除（最大100件まで保持）
        if (data.terrainModifications.length > 100) {
            data.terrainModifications = data.terrainModifications
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 100);
        }
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * 探索進捗を更新
     */
    updateExplorationProgress(
        planetId: string, 
        progress: Partial<ExplorationProgress>
    ): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        data.exploration = {
            ...data.exploration,
            ...progress,
            lastVisited: Date.now()
        };
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * エリアを発見
     */
    discoverArea(planetId: string, areaId: string): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        if (!data.exploration.areasDiscovered.includes(areaId)) {
            data.exploration.areasDiscovered.push(areaId);
            this.savePlanetData(planetId, data);
        }
    }
    
    /**
     * リソースノードを更新
     */
    updateResourceNode(planetId: string, node: ResourceNode): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        const existingIndex = data.resourceNodes.findIndex(n => n.id === node.id);
        if (existingIndex >= 0) {
            data.resourceNodes[existingIndex] = node;
        } else {
            data.resourceNodes.push(node);
        }
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * インベントリを更新
     */
    updateInventory(
        planetId: string, 
        items?: Array<{ id: string; count: number }>,
        resources?: { minerals: number; energy: number; parts: number }
    ): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        if (items) {
            data.inventory.items = items;
        }
        if (resources) {
            data.inventory.resources = resources;
        }
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * 統計を更新
     */
    updateStatistics(
        planetId: string,
        updates: {
            visit?: boolean;
            resourcesCollected?: { minerals?: number; energy?: number; parts?: number };
            achievementUnlocked?: string;
        }
    ): void {
        const data = this.loadPlanetData(planetId) || this.createDefaultData(planetId);
        
        if (updates.visit) {
            data.statistics.totalVisits++;
        }
        
        if (updates.resourcesCollected) {
            const collected = updates.resourcesCollected;
            if (collected.minerals) {
                data.statistics.totalResourcesCollected.minerals += collected.minerals;
            }
            if (collected.energy) {
                data.statistics.totalResourcesCollected.energy += collected.energy;
            }
            if (collected.parts) {
                data.statistics.totalResourcesCollected.parts += collected.parts;
            }
        }
        
        if (updates.achievementUnlocked && 
            !data.statistics.achievementsUnlocked.includes(updates.achievementUnlocked)) {
            data.statistics.achievementsUnlocked.push(updates.achievementUnlocked);
        }
        
        this.savePlanetData(planetId, data);
    }
    
    /**
     * すべての惑星データを取得
     */
    getAllPlanetData(): Map<string, PlanetPersistentData> {
        const allData = new Map<string, PlanetPersistentData>();
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.STORAGE_PREFIX)) {
                const planetId = key.substring(this.STORAGE_PREFIX.length);
                const data = this.loadPlanetData(planetId);
                if (data) {
                    allData.set(planetId, data);
                }
            }
        }
        
        return allData;
    }
    
    /**
     * 惑星データを削除
     */
    deletePlanetData(planetId: string): void {
        localStorage.removeItem(this.STORAGE_PREFIX + planetId);
        console.log('[PERSISTENCE] Planet data deleted:', planetId);
    }
    
    /**
     * デフォルトデータを作成
     */
    private createDefaultData(planetId: string): PlanetPersistentData {
        return {
            planetId,
            version: this.CURRENT_VERSION,
            lastSaved: Date.now(),
            buildings: [],
            terrainModifications: [],
            exploration: {
                areasDiscovered: [],
                secretsFound: [],
                landmarksVisited: [],
                totalDistanceTraveled: 0,
                totalTimeSpent: 0,
                lastVisited: Date.now()
            },
            resourceNodes: [],
            inventory: {
                items: [],
                resources: {
                    minerals: 0,
                    energy: 0,
                    parts: 0
                }
            },
            statistics: {
                totalVisits: 0,
                totalResourcesCollected: {
                    minerals: 0,
                    energy: 0,
                    parts: 0
                },
                buildingsConstructed: 0,
                achievementsUnlocked: []
            }
        };
    }
    
    /**
     * データマイグレーション
     */
    private migrateData(oldData: any): PlanetPersistentData {
        // 将来のバージョンアップに備えて
        console.log('[PERSISTENCE] Migrating from version:', oldData.version);
        
        // 現在のバージョンのデフォルトデータを作成
        const newData = this.createDefaultData(oldData.planetId);
        
        // 既存のデータをコピー
        return {
            ...newData,
            ...oldData,
            version: this.CURRENT_VERSION
        };
    }
    
    /**
     * ストレージ使用量を取得
     */
    getStorageInfo(): { used: number; count: number } {
        let totalSize = 0;
        let count = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.STORAGE_PREFIX)) {
                count++;
                const value = localStorage.getItem(key);
                if (value) {
                    totalSize += value.length;
                }
            }
        }
        
        return {
            used: totalSize,
            count
        };
    }
}