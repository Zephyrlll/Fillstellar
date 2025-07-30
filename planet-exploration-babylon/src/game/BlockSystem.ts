import * as BABYLON from '@babylonjs/core';
import { VoxelTerrain } from './VoxelTerrain';

export class BlockSystem {
    private scene: BABYLON.Scene;
    private terrain: VoxelTerrain;
    
    constructor(scene: BABYLON.Scene, terrain: VoxelTerrain) {
        this.scene = scene;
        this.terrain = terrain;
    }
    
    enable(): void {
        // 後で実装
    }
}