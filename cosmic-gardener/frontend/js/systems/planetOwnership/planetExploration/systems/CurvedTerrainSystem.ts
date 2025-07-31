import * as BABYLON from '@babylonjs/core';

export class CurvedTerrainSystem {
    private scene: BABYLON.Scene;
    private terrainMesh: BABYLON.Mesh | null = null;
    private material: BABYLON.StandardMaterial | null = null;
    
    // 地形パラメータ
    private worldSize: number;
    private resolution: number = 100; // 頂点解像度
    private curvatureRadius: number = 1000; // 曲率半径
    private maxHeight: number = 10; // 最大高さ変化
    
    constructor(scene: BABYLON.Scene, worldSize: number = 300) {
        this.scene = scene;
        this.worldSize = worldSize;
    }
    
    async initialize(): Promise<void> {
        console.log('[TERRAIN] Initializing curved terrain system...');
        
        // 地形メッシュを生成
        this.createTerrainMesh();
        
        // マテリアルを設定
        this.createTerrainMaterial();
        
        console.log('[TERRAIN] Terrain system initialized');
    }
    
    private createTerrainMesh(): void {
        // カスタム頂点データ
        const positions: number[] = [];
        const indices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        
        const halfSize = this.worldSize / 2;
        
        // 頂点を生成
        for (let z = 0; z <= this.resolution; z++) {
            for (let x = 0; x <= this.resolution; x++) {
                // 正規化座標
                const nx = (x / this.resolution) * 2 - 1;
                const nz = (z / this.resolution) * 2 - 1;
                
                // ワールド座標
                const worldX = nx * halfSize;
                const worldZ = nz * halfSize;
                
                // 湾曲の計算
                const distance = Math.sqrt(worldX * worldX + worldZ * worldZ);
                const curvatureHeight = -(distance * distance) / (2 * this.curvatureRadius);
                
                // 地形のノイズ
                const noiseHeight = this.generateTerrainNoise(worldX, worldZ);
                const finalHeight = curvatureHeight + noiseHeight;
                
                positions.push(worldX, finalHeight, worldZ);
                uvs.push(x / this.resolution, z / this.resolution);
            }
        }
        
        // インデックスを生成
        for (let z = 0; z < this.resolution; z++) {
            for (let x = 0; x < this.resolution; x++) {
                const i = z * (this.resolution + 1) + x;
                
                // 2つの三角形でクアッドを作成
                indices.push(i, i + 1, i + this.resolution + 1);
                indices.push(i + 1, i + this.resolution + 2, i + this.resolution + 1);
            }
        }
        
        // メッシュを作成
        this.terrainMesh = new BABYLON.Mesh('terrain', this.scene);
        
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.uvs = uvs;
        
        // 法線を計算
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        vertexData.normals = normals;
        
        vertexData.applyToMesh(this.terrainMesh);
        
        // コリジョン設定
        this.terrainMesh.checkCollisions = true;
    }
    
    private generateTerrainNoise(x: number, z: number): number {
        let height = 0;
        let amplitude = this.maxHeight;
        let frequency = 0.01;
        
        // 複数のオクターブでノイズを生成
        for (let i = 0; i < 4; i++) {
            height += this.simplex2D(x * frequency, z * frequency) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return height;
    }
    
    private simplex2D(x: number, z: number): number {
        // シンプルな擬似ノイズ関数
        const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }
    
    private createTerrainMaterial(): void {
        this.material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);
        
        // 草原風の色
        this.material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.2);
        this.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.material.specularPower = 32;
        
        // プロシージャルテクスチャ（草地）
        const grassTexture = new BABYLON.DynamicTexture('grassTexture', 512, this.scene);
        const context = grassTexture.getContext();
        
        // グラデーションで草地を表現
        const gradient = context.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#4a7c2e');
        gradient.addColorStop(0.5, '#5a8c3e');
        gradient.addColorStop(1, '#3a6c1e');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        
        // ノイズパターンを追加
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 3;
            const opacity = Math.random() * 0.3;
            
            context.fillStyle = `rgba(100, 150, 50, ${opacity})`;
            context.fillRect(x, y, size, size);
        }
        
        grassTexture.update();
        this.material.diffuseTexture = grassTexture;
        
        if (this.terrainMesh) {
            this.terrainMesh.material = this.material;
        }
    }
    
    getHeightAtPosition(x: number, z: number): number {
        // 範囲チェック
        const halfSize = this.worldSize / 2;
        if (Math.abs(x) > halfSize || Math.abs(z) > halfSize) {
            return 0;
        }
        
        // 湾曲の高さ
        const distance = Math.sqrt(x * x + z * z);
        const curvatureHeight = -(distance * distance) / (2 * this.curvatureRadius);
        
        // ノイズの高さ
        const noiseHeight = this.generateTerrainNoise(x, z);
        
        return curvatureHeight + noiseHeight;
    }
    
    isWithinBounds(x: number, z: number): boolean {
        const halfSize = this.worldSize / 2;
        return Math.abs(x) <= halfSize && Math.abs(z) <= halfSize;
    }
    
    getWorldSize(): number {
        return this.worldSize;
    }
    
    dispose(): void {
        if (this.terrainMesh) {
            this.terrainMesh.dispose();
            this.terrainMesh = null;
        }
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        console.log('[TERRAIN] Disposed');
    }
}