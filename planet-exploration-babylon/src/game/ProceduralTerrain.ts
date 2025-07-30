import * as BABYLON from '@babylonjs/core';
import { PlanetData } from './PlanetExploration';
import { SphericalTerrain } from './SphericalTerrain';

export class ProceduralTerrain {
    private scene: BABYLON.Scene;
    private terrain: BABYLON.Mesh | null = null;
    private sphericalTerrain: SphericalTerrain;
    private modifications: Map<string, any> = new Map();
    private useSphericalTerrain: boolean = true; // 球体地形を使用するかどうか
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.sphericalTerrain = new SphericalTerrain(scene);
    }
    
    generatePlanet(planet: PlanetData): void {
        if (this.useSphericalTerrain) {
            // 球体地形を使用
            this.sphericalTerrain.generatePlanet(planet);
            return;
        }
        
        // 以下は既存の平面地形コード（フォールバック用）
        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        
        // 惑星タイプに基づいて地形を調整
        switch (planet.type) {
            case 'forest':
                groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.1);
                break;
            case 'desert':
                groundMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.3);
                break;
            case 'ocean':
                groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.6);
                break;
            case 'ice':
                groundMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1.0);
                break;
            case 'volcanic':
                groundMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.1, 0.1);
                groundMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0);
                break;
            case 'alien':
                groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.2, 0.7);
                break;
        }
        
        // 基本的な地形メッシュ（シンプルな平面から始める）
        this.terrain = BABYLON.MeshBuilder.CreateGround(
            "terrain",
            {
                width: 500,
                height: 500,
                subdivisions: 50
            },
            this.scene
        );
        
        this.terrain.material = groundMaterial;
        this.terrain.receiveShadows = true;
        
        // 地形に起伏を追加（プロシージャル）
        const positions = this.terrain.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (positions) {
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const z = positions[i + 2];
                
                // 簡単なノイズ関数で高さを生成
                let height = 0;
                switch (planet.type) {
                    case 'forest':
                        height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 5 + Math.random() * 2;
                        break;
                    case 'desert':
                        height = Math.sin(x * 0.03) * 8 + Math.random() * 1;
                        break;
                    case 'ocean':
                        height = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
                        break;
                    case 'ice':
                        height = Math.abs(Math.sin(x * 0.02) * Math.cos(z * 0.02)) * 10 + Math.random() * 3;
                        break;
                    case 'volcanic':
                        height = Math.abs(Math.sin(x * 0.01)) * 20 + Math.random() * 5;
                        break;
                    case 'alien':
                        height = Math.sin(x * 0.05 + Math.cos(z * 0.1)) * 15;
                        break;
                }
                
                positions[i + 1] = height;
            }
            
            this.terrain.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            this.terrain.createNormals(true);
        }
    }
    
    getSpawnPoint(): BABYLON.Vector3 {
        if (this.useSphericalTerrain) {
            // 球体地形のスポーン地点
            return this.sphericalTerrain.getSpawnPoint();
        }
        
        // 平面地形のスポーン地点（既存のコード）
        const x = 0;
        const z = 0;
        let y = 5; // デフォルトの高さ
        
        // 地形の高さを取得
        if (this.terrain) {
            const positions = this.terrain.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            if (positions) {
                // 中心付近の頂点を見つけて高さを取得
                for (let i = 0; i < positions.length; i += 3) {
                    if (Math.abs(positions[i] - x) < 1 && Math.abs(positions[i + 2] - z) < 1) {
                        y = positions[i + 1] + 2; // 地形の高さ + 2メートル
                        break;
                    }
                }
            }
        }
        
        return new BABYLON.Vector3(x, y, z);
    }
    
    update(playerPosition: BABYLON.Vector3): void {
        // 動的なLOD更新や地形生成をここで行う
    }
    
    getModifications(): any {
        return Array.from(this.modifications.entries());
    }
    
    // 球体地形用のメソッド
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        if (this.useSphericalTerrain) {
            return this.sphericalTerrain.getUpVector(position);
        }
        // 平面地形の場合は常に上向き
        return BABYLON.Vector3.Up();
    }
    
    getSurfaceHeight(position: BABYLON.Vector3): number {
        if (this.useSphericalTerrain) {
            return this.sphericalTerrain.getSurfaceHeight(position);
        }
        // 平面地形の場合は0
        return 0;
    }
    
    getPlanetRadius(): number {
        if (this.useSphericalTerrain) {
            return this.sphericalTerrain.getRadius();
        }
        return 0;
    }
    
    isSpherical(): boolean {
        return this.useSphericalTerrain;
    }
    
    getPlanetMesh(): BABYLON.Mesh | null {
        if (this.useSphericalTerrain) {
            return this.sphericalTerrain.getPlanetMesh();
        }
        return this.terrain;
    }
    
    dispose(): void {
        if (this.sphericalTerrain) {
            this.sphericalTerrain.dispose();
        }
        if (this.terrain) {
            this.terrain.dispose();
        }
        this.modifications.clear();
    }
}