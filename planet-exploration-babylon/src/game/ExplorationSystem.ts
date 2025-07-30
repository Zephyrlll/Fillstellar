import * as BABYLON from '@babylonjs/core';
import { PlanetData } from './PlanetExploration';

export class ExplorationSystem {
    private scene: BABYLON.Scene;
    private discoveries: Set<string> = new Set();
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    startExploration(planet: PlanetData): void {
        console.log(`探索開始: ${planet.name}`);
        // 探索要素の初期化
    }
    
    update(deltaTime: number): void {
        // 探索システムの更新
    }
    
    getDiscoveries(): string[] {
        return Array.from(this.discoveries);
    }
    
    importDiscoveries(discoveries: string[]): void {
        this.discoveries = new Set(discoveries);
    }
    
    dispose(): void {
        this.discoveries.clear();
        console.log('[EXPLORATION_SYSTEM] Disposed');
    }
}