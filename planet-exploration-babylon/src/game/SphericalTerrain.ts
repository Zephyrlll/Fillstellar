import * as BABYLON from '@babylonjs/core';
import { PlanetData } from './PlanetExploration';

export class SphericalTerrain {
    private scene: BABYLON.Scene;
    private planetMesh: BABYLON.Mesh | null = null;
    private radius: number = 100; // 惑星の半径（メートル）
    private subdivisions: number = 64; // 球体の細分化レベル
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        console.log(`[SPHERICAL_TERRAIN] Constructor - initial radius: ${this.radius}`);
    }
    
    generatePlanet(planet: PlanetData): void {
        // 既存の惑星を削除
        if (this.planetMesh) {
            this.planetMesh.dispose();
        }
        
        // 惑星のサイズを設定（タイプによって変更可能）
        this.radius = planet.radius || 100;
        console.log(`[SPHERICAL_TERRAIN] Setting planet radius to: ${this.radius}`);
        
        // 基本的な球体メッシュを作成
        const diameter = this.radius * 2;
        console.log(`[SPHERICAL_TERRAIN] Creating sphere with diameter: ${diameter} (radius: ${this.radius})`);
        
        this.planetMesh = BABYLON.MeshBuilder.CreateSphere(
            "planet",
            {
                diameter: diameter,
                segments: this.subdivisions
            },
            this.scene
        );
        
        // 作成後の球体の実際のサイズを確認
        const bounds = this.planetMesh.getBoundingInfo();
        console.log(`[SPHERICAL_TERRAIN] Created sphere bounding radius: ${bounds.boundingSphere.radius}`);
        console.log(`[SPHERICAL_TERRAIN] Created sphere min: ${bounds.minimum}, max: ${bounds.maximum}`);
        
        // 地形の起伏を追加（一時的に無効化）
        // this.addTerrainNoise(planet.type);
        console.log('[SPHERICAL_TERRAIN] Terrain noise disabled for debugging');
        
        // マテリアルを適用
        this.applyPlanetMaterial(planet);
        
        // 惑星を原点に配置
        this.planetMesh.position = BABYLON.Vector3.Zero();
        
        console.log(`[SPHERICAL_TERRAIN] Generated ${planet.type} planet with radius ${this.radius}m`);
        console.log(`[SPHERICAL_TERRAIN] Planet mesh position:`, this.planetMesh.position);
        console.log(`[SPHERICAL_TERRAIN] Planet mesh bounding info:`, this.planetMesh.getBoundingInfo().boundingSphere.radius);
    }
    
    private addTerrainNoise(planetType: PlanetData['type']): void {
        if (!this.planetMesh) return;
        
        const positions = this.planetMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (!positions) return;
        
        // 各頂点に対してノイズを適用
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // 頂点の位置から球面座標を計算
            const length = Math.sqrt(x * x + y * y + z * z);
            const theta = Math.atan2(z, x);
            const phi = Math.acos(y / length);
            
            // 惑星タイプに応じたノイズの強度
            let noiseStrength = 0;
            switch (planetType) {
                case 'forest':
                    noiseStrength = 5; // 穏やかな丘陵
                    break;
                case 'desert':
                    noiseStrength = 8; // 砂丘
                    break;
                case 'ocean':
                    noiseStrength = 2; // ほぼ平坦
                    break;
                case 'ice':
                    noiseStrength = 10; // 氷河と山
                    break;
                case 'volcanic':
                    noiseStrength = 15; // 激しい地形
                    break;
                case 'alien':
                    noiseStrength = 12; // 奇妙な地形
                    break;
            }
            
            // シンプルなノイズ関数（後で改良可能）
            const noise = this.generateNoise(theta, phi, planetType);
            const heightVariation = noise * noiseStrength;
            
            // 新しい半径を計算
            const newRadius = this.radius + heightVariation;
            
            // 球面座標から直交座標に変換
            positions[i] = newRadius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = newRadius * Math.cos(phi);
            positions[i + 2] = newRadius * Math.sin(phi) * Math.sin(theta);
        }
        
        // 頂点データを更新
        this.planetMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        
        // 法線を再計算
        this.planetMesh.createNormals(true);
    }
    
    private generateNoise(theta: number, phi: number, planetType: string): number {
        // 複数の周波数を組み合わせたノイズ
        let noise = 0;
        
        // 基本的な地形パターン
        noise += Math.sin(theta * 4) * Math.cos(phi * 4) * 0.5;
        noise += Math.sin(theta * 8 + 1) * Math.cos(phi * 8 + 1) * 0.25;
        noise += Math.sin(theta * 16 + 2) * Math.cos(phi * 16 + 2) * 0.125;
        
        // 惑星タイプ固有のパターン
        switch (planetType) {
            case 'desert':
                // 砂丘のような波状パターン
                noise += Math.sin(theta * 6) * 0.3;
                break;
            case 'ice':
                // 鋭い山岳地形
                noise = Math.abs(noise) * 1.5;
                break;
            case 'volcanic':
                // クレーターのような凹凸
                const crater = Math.sin(theta * 3) * Math.sin(phi * 3);
                noise += crater > 0.5 ? -crater : crater;
                break;
            case 'alien':
                // 奇妙な周期的パターン
                noise += Math.sin(theta * 7 + Math.cos(phi * 5)) * 0.4;
                break;
        }
        
        return noise;
    }
    
    private applyPlanetMaterial(planet: PlanetData): void {
        if (!this.planetMesh) return;
        
        const material = new BABYLON.StandardMaterial("planetMaterial", this.scene);
        
        // 惑星タイプに応じた色設定
        switch (planet.type) {
            case 'forest':
                material.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.1);
                material.specularColor = new BABYLON.Color3(0.1, 0.2, 0.05);
                break;
            case 'desert':
                material.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.3);
                material.specularColor = new BABYLON.Color3(0.3, 0.2, 0.1);
                break;
            case 'ocean':
                material.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.6);
                material.specularColor = new BABYLON.Color3(0.3, 0.5, 0.8);
                material.specularPower = 64;
                break;
            case 'ice':
                material.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1.0);
                material.specularColor = new BABYLON.Color3(0.9, 0.95, 1.0);
                material.specularPower = 128;
                break;
            case 'volcanic':
                material.diffuseColor = new BABYLON.Color3(0.3, 0.1, 0.1);
                material.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0);
                material.specularColor = new BABYLON.Color3(0.1, 0.05, 0.05);
                break;
            case 'alien':
                material.diffuseColor = new BABYLON.Color3(0.5, 0.2, 0.7);
                material.emissiveColor = new BABYLON.Color3(0.1, 0.05, 0.15);
                material.specularColor = new BABYLON.Color3(0.7, 0.4, 0.9);
                break;
        }
        
        this.planetMesh.material = material;
        
        // デバッグ用：Wキーでワイヤーフレーム表示を切り替え
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'f' && this.planetMesh && this.planetMesh.material) {
                (this.planetMesh.material as BABYLON.StandardMaterial).wireframe = 
                    !(this.planetMesh.material as BABYLON.StandardMaterial).wireframe;
                console.log('[SPHERICAL_TERRAIN] Wireframe:', 
                    (this.planetMesh.material as BABYLON.StandardMaterial).wireframe);
            }
        });
    }
    
    getRadius(): number {
        return this.radius;
    }
    
    getPlanetMesh(): BABYLON.Mesh | null {
        return this.planetMesh;
    }
    
    // 球面上のランダムなスポーン地点を取得
    getSpawnPoint(): BABYLON.Vector3 {
        console.log(`[SPHERICAL_TERRAIN] getSpawnPoint called, current radius: ${this.radius}`);
        
        // 球体メッシュが存在するか確認
        if (!this.planetMesh) {
            console.error('[SPHERICAL_TERRAIN] No planet mesh! Creating default spawn point.');
            return new BABYLON.Vector3(0, 110, 0);
        }
        
        // 高い位置からスポーンして落下させる
        const spawnRadius = this.radius + 50; // 地表から50m上（十分高い位置）
        
        // 直接座標を指定（Y軸の正の方向）
        const x = 0;
        const y = spawnRadius; // 球の上部
        const z = 0;
        
        const spawnPoint = new BABYLON.Vector3(x, y, z);
        console.log(`[SPHERICAL_TERRAIN] Spawn point calculated:`);
        console.log(`  - Planet radius: ${this.radius}`);
        console.log(`  - Spawn radius: ${spawnRadius}`);
        console.log(`  - Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        console.log(`  - Distance from origin: ${spawnPoint.length()}`);
        
        
        return spawnPoint;
    }
    
    // 指定位置での地表の高さを取得
    getSurfaceHeight(position: BABYLON.Vector3): number {
        // 簡易実装：現在は球の半径を返す
        // TODO: 実際の地形の高さを計算
        return this.radius;
    }
    
    // 指定位置での「上」方向を取得（重力の逆方向）
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.normalize();
    }
    
    dispose(): void {
        if (this.planetMesh) {
            this.planetMesh.dispose();
            this.planetMesh = null;
        }
    }
}