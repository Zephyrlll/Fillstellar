/**
 * Building Persistence Hooks
 * SimplePlanetGameに建物の永続性を追加するためのフック
 */

import { PlanetPersistence, BuildingData, TerrainModification } from '../PlanetPersistence.js';

export class BuildingPersistenceHooks {
    private planetId: string;
    private persistence: PlanetPersistence;
    private originalFunctions: Map<string, Function> = new Map();
    
    constructor(planetId: string) {
        this.planetId = planetId;
        this.persistence = PlanetPersistence.getInstance();
    }
    
    /**
     * SimplePlanetGameインスタンスにフックを適用
     */
    applyHooks(gameInstance: any): void {
        console.log('[PERSISTENCE_HOOKS] Applying hooks to game instance');
        
        // 建物配置フックを追加
        this.hookBuildingPlacement(gameInstance);
        
        // 建物削除フックを追加
        this.hookBuildingRemoval(gameInstance);
        
        // 地形変更フックを追加
        this.hookTerrainModification(gameInstance);
        
        // リソース採取フックを追加
        this.hookResourceGathering(gameInstance);
        
        // エリア発見フックを追加
        this.hookAreaDiscovery(gameInstance);
    }
    
    /**
     * 建物配置をフック
     */
    private hookBuildingPlacement(gameInstance: any): void {
        // buildingSystemが存在する場合
        if (gameInstance.buildingSystem) {
            const original = gameInstance.buildingSystem.placeBuilding;
            if (original) {
                this.originalFunctions.set('placeBuilding', original);
                
                gameInstance.buildingSystem.placeBuilding = (type: string, position: any, ...args: any[]) => {
                    // オリジナルの処理を実行
                    const result = original.call(gameInstance.buildingSystem, type, position, ...args);
                    
                    // 成功した場合、永続化
                    if (result) {
                        const buildingData: BuildingData = {
                            id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            type: type,
                            position: {
                                x: position.x || 0,
                                y: position.y || 0,
                                z: position.z || 0
                            },
                            rotation: 0,
                            level: 1,
                            health: 100,
                            constructedAt: Date.now()
                        };
                        
                        this.persistence.addBuilding(this.planetId, buildingData);
                        console.log('[PERSISTENCE_HOOKS] Building placed and saved:', buildingData);
                    }
                    
                    return result;
                };
            }
        }
        
        // 別の方法で建物が作成される場合のフック
        if (gameInstance.createBuilding) {
            const original = gameInstance.createBuilding;
            this.originalFunctions.set('createBuilding', original);
            
            gameInstance.createBuilding = (buildingInfo: any, ...args: any[]) => {
                const result = original.call(gameInstance, buildingInfo, ...args);
                
                if (result) {
                    const buildingData: BuildingData = {
                        id: result.id || `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: buildingInfo.type || 'unknown',
                        position: {
                            x: buildingInfo.position?.x || 0,
                            y: buildingInfo.position?.y || 0,
                            z: buildingInfo.position?.z || 0
                        },
                        rotation: buildingInfo.rotation || 0,
                        level: 1,
                        health: 100,
                        constructedAt: Date.now(),
                        metadata: buildingInfo
                    };
                    
                    this.persistence.addBuilding(this.planetId, buildingData);
                    console.log('[PERSISTENCE_HOOKS] Building created and saved:', buildingData);
                }
                
                return result;
            };
        }
    }
    
    /**
     * 建物削除をフック
     */
    private hookBuildingRemoval(gameInstance: any): void {
        if (gameInstance.buildingSystem && gameInstance.buildingSystem.removeBuilding) {
            const original = gameInstance.buildingSystem.removeBuilding;
            this.originalFunctions.set('removeBuilding', original);
            
            gameInstance.buildingSystem.removeBuilding = (buildingId: string, ...args: any[]) => {
                const result = original.call(gameInstance.buildingSystem, buildingId, ...args);
                
                if (result) {
                    this.persistence.removeBuilding(this.planetId, buildingId);
                    console.log('[PERSISTENCE_HOOKS] Building removed:', buildingId);
                }
                
                return result;
            };
        }
    }
    
    /**
     * 地形変更をフック
     */
    private hookTerrainModification(gameInstance: any): void {
        if (gameInstance.terrainSystem) {
            const hookTerrainMethod = (methodName: string, type: TerrainModification['type']) => {
                const original = gameInstance.terrainSystem[methodName];
                if (original) {
                    this.originalFunctions.set(methodName, original);
                    
                    gameInstance.terrainSystem[methodName] = (position: any, radius: number, intensity: number, ...args: any[]) => {
                        const result = original.call(gameInstance.terrainSystem, position, radius, intensity, ...args);
                        
                        const modification: TerrainModification = {
                            id: `terrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            type: type,
                            position: {
                                x: position.x || 0,
                                z: position.z || 0
                            },
                            radius: radius || 5,
                            intensity: intensity || 1,
                            timestamp: Date.now()
                        };
                        
                        this.persistence.addTerrainModification(this.planetId, modification);
                        console.log('[PERSISTENCE_HOOKS] Terrain modified:', modification);
                        
                        return result;
                    };
                }
            };
            
            hookTerrainMethod('flatten', 'flatten');
            hookTerrainMethod('raise', 'raise');
            hookTerrainMethod('lower', 'lower');
            hookTerrainMethod('smooth', 'smooth');
        }
    }
    
    /**
     * リソース採取をフック
     */
    private hookResourceGathering(gameInstance: any): void {
        // リソース更新をモニタリング
        if (gameInstance.resources) {
            // Proxyを使用してリソースの変更を監視
            const resourceProxy = new Proxy(gameInstance.resources, {
                set: (target, property, value) => {
                    const oldValue = target[property];
                    target[property] = value;
                    
                    // リソースが増加した場合
                    if (typeof value === 'number' && typeof oldValue === 'number' && value > oldValue) {
                        const collected: any = {};
                        collected[property as string] = value - oldValue;
                        
                        this.persistence.updateStatistics(this.planetId, {
                            resourcesCollected: collected
                        });
                        
                        console.log('[PERSISTENCE_HOOKS] Resource collected:', property, value - oldValue);
                    }
                    
                    return true;
                }
            });
            
            gameInstance.resources = resourceProxy;
        }
    }
    
    /**
     * エリア発見をフック
     */
    private hookAreaDiscovery(gameInstance: any): void {
        if (gameInstance.explorationSystem) {
            const original = gameInstance.explorationSystem.discoverArea;
            if (original) {
                this.originalFunctions.set('discoverArea', original);
                
                gameInstance.explorationSystem.discoverArea = (areaId: string, ...args: any[]) => {
                    const result = original.call(gameInstance.explorationSystem, areaId, ...args);
                    
                    this.persistence.discoverArea(this.planetId, areaId);
                    console.log('[PERSISTENCE_HOOKS] Area discovered:', areaId);
                    
                    return result;
                };
            }
        }
    }
    
    /**
     * 保存された建物を復元
     */
    restoreBuildings(gameInstance: any, buildings: BuildingData[]): void {
        console.log('[PERSISTENCE_HOOKS] Restoring buildings:', buildings.length);
        
        buildings.forEach(building => {
            try {
                // buildingSystemを使用して復元
                if (gameInstance.buildingSystem && gameInstance.buildingSystem.restoreBuilding) {
                    gameInstance.buildingSystem.restoreBuilding(building);
                } else if (gameInstance.createBuildingFromData) {
                    // 別の復元メソッドがある場合
                    gameInstance.createBuildingFromData(building);
                } else {
                    // フォールバック: 通常の配置メソッドを使用
                    if (gameInstance.buildingSystem && gameInstance.buildingSystem.placeBuilding) {
                        // フックを一時的に無効化
                        const temp = gameInstance.buildingSystem.placeBuilding;
                        gameInstance.buildingSystem.placeBuilding = this.originalFunctions.get('placeBuilding') || temp;
                        
                        gameInstance.buildingSystem.placeBuilding(
                            building.type,
                            building.position,
                            { skipSave: true, buildingId: building.id }
                        );
                        
                        // フックを再有効化
                        gameInstance.buildingSystem.placeBuilding = temp;
                    }
                }
                
                console.log('[PERSISTENCE_HOOKS] Building restored:', building.id);
            } catch (error) {
                console.error('[PERSISTENCE_HOOKS] Failed to restore building:', building, error);
            }
        });
    }
    
    /**
     * 地形変更を復元
     */
    restoreTerrainModifications(gameInstance: any, modifications: TerrainModification[]): void {
        if (!gameInstance.terrainSystem) return;
        
        console.log('[PERSISTENCE_HOOKS] Restoring terrain modifications:', modifications.length);
        
        // 時系列順にソート（古い順）
        const sortedMods = [...modifications].sort((a, b) => a.timestamp - b.timestamp);
        
        sortedMods.forEach(mod => {
            try {
                const method = gameInstance.terrainSystem[mod.type];
                if (method) {
                    // フックを一時的に無効化
                    const temp = gameInstance.terrainSystem[mod.type];
                    gameInstance.terrainSystem[mod.type] = this.originalFunctions.get(mod.type) || temp;
                    
                    method.call(
                        gameInstance.terrainSystem,
                        mod.position,
                        mod.radius,
                        mod.intensity,
                        { skipSave: true }
                    );
                    
                    // フックを再有効化
                    gameInstance.terrainSystem[mod.type] = temp;
                    
                    console.log('[PERSISTENCE_HOOKS] Terrain modification restored:', mod.type);
                }
            } catch (error) {
                console.error('[PERSISTENCE_HOOKS] Failed to restore terrain modification:', mod, error);
            }
        });
    }
    
    /**
     * フックを削除
     */
    removeHooks(gameInstance: any): void {
        // オリジナルの関数を復元
        this.originalFunctions.forEach((original, name) => {
            if (gameInstance.buildingSystem && gameInstance.buildingSystem[name]) {
                gameInstance.buildingSystem[name] = original;
            }
            if (gameInstance.terrainSystem && gameInstance.terrainSystem[name]) {
                gameInstance.terrainSystem[name] = original;
            }
            if (gameInstance.explorationSystem && gameInstance.explorationSystem[name]) {
                gameInstance.explorationSystem[name] = original;
            }
            if (gameInstance[name]) {
                gameInstance[name] = original;
            }
        });
        
        console.log('[PERSISTENCE_HOOKS] Hooks removed');
    }
}