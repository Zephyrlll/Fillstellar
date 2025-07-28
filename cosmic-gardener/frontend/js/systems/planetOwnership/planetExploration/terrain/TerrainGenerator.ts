/**
 * Terrain Generator
 * プロシージャル地形生成
 */

import * as THREE from 'three';
import { SphericalWorld } from '../core/SphericalWorld.js';

// Perlinノイズの簡易実装
class PerlinNoise {
    private permutation: number[];
    
    constructor(seed: number = Math.random()) {
        this.permutation = [];
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        
        // シャッフル
        for (let i = 255; i > 0; i--) {
            const j = Math.floor((seed * 1000 + i) % (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        
        // 複製して512要素に
        for (let i = 0; i < 256; i++) {
            this.permutation[i + 256] = this.permutation[i];
        }
    }
    
    fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }
    
    grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    noise(x: number, y: number, z: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A] + Z;
        const AB = this.permutation[A + 1] + Z;
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B] + Z;
        const BB = this.permutation[B + 1] + Z;
        
        return this.lerp(w,
            this.lerp(v,
                this.lerp(u, this.grad(this.permutation[AA], x, y, z),
                          this.grad(this.permutation[BA], x - 1, y, z)),
                this.lerp(u, this.grad(this.permutation[AB], x, y - 1, z),
                          this.grad(this.permutation[BB], x - 1, y - 1, z))),
            this.lerp(v,
                this.lerp(u, this.grad(this.permutation[AA + 1], x, y, z - 1),
                          this.grad(this.permutation[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.permutation[AB + 1], x, y - 1, z - 1),
                          this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1)))
        );
    }
    
    octaveNoise(x: number, y: number, z: number, octaves: number, persistence: number): number {
        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return total / maxValue;
    }
}

export class TerrainGenerator {
    private sphericalWorld: SphericalWorld;
    private planetType: string;
    private noise: PerlinNoise;
    private settings: any;
    
    constructor(sphericalWorld: SphericalWorld, planetType: string) {
        this.sphericalWorld = sphericalWorld;
        this.planetType = planetType;
        this.noise = new PerlinNoise(Date.now());
        this.settings = this.sphericalWorld.getSettings();
    }
    
    /**
     * チャンクの地形メッシュを生成
     */
    generateChunkMesh(chunkX: number, chunkZ: number): THREE.Mesh {
        const geometry = this.generateChunkGeometry(chunkX, chunkZ);
        const material = this.getPlanetMaterial();
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    /**
     * チャンクのジオメトリを生成
     */
    private generateChunkGeometry(chunkX: number, chunkZ: number): THREE.BufferGeometry {
        const size = this.settings.chunkSize;
        const segments = 32; // チャンクの分割数
        const segmentSize = size / segments;
        
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        
        // 頂点を生成
        for (let z = 0; z <= segments; z++) {
            for (let x = 0; x <= segments; x++) {
                // チャンク内の位置を計算
                const localX = x * segmentSize - size / 2;
                const localZ = z * segmentSize - size / 2;
                
                // 球面座標を計算
                const lon = ((chunkX + localX / size) / 100) * 2 * Math.PI - Math.PI;
                const lat = ((chunkZ + localZ / size) / 50) * Math.PI;
                
                // 高さを計算
                const height = this.getHeightAt(lat, lon);
                
                // 球面上の位置を計算
                const position = this.sphericalWorld.sphericalToCartesian(lat, lon, height);
                positions.push(position.x, position.y, position.z);
                
                // 法線を計算
                const normal = this.sphericalWorld.getNormal(position);
                normals.push(normal.x, normal.y, normal.z);
                
                // UV座標
                uvs.push(x / segments, z / segments);
            }
        }
        
        // インデックスを生成
        for (let z = 0; z < segments; z++) {
            for (let x = 0; x < segments; x++) {
                const a = x + z * (segments + 1);
                const b = x + 1 + z * (segments + 1);
                const c = x + (z + 1) * (segments + 1);
                const d = x + 1 + (z + 1) * (segments + 1);
                
                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        return geometry;
    }
    
    /**
     * 指定位置の高さを取得
     */
    getHeightAt(lat: number, lon: number): number {
        // ノイズベースの高さ生成
        const x = lon * 10;
        const y = lat * 10;
        const z = 0;
        
        let height = 0;
        
        switch (this.planetType) {
            case 'desert':
                height = this.generateDesertHeight(x, y, z);
                break;
            case 'ocean':
                height = this.generateOceanHeight(x, y, z);
                break;
            case 'forest':
                height = this.generateForestHeight(x, y, z);
                break;
            case 'ice':
                height = this.generateIceHeight(x, y, z);
                break;
            case 'volcanic':
                height = this.generateVolcanicHeight(x, y, z);
                break;
            case 'gas':
                height = 0; // ガス惑星は平坦
                break;
            default:
                height = this.noise.octaveNoise(x, y, z, 4, 0.5) * 10;
        }
        
        return height;
    }
    
    /**
     * 砂漠の高さ生成
     */
    private generateDesertHeight(x: number, y: number, z: number): number {
        // 砂丘
        const dunes = this.noise.octaveNoise(x * 0.1, y * 0.1, z, 3, 0.6) * 20;
        
        // 岩石地帯
        const rocks = Math.max(0, this.noise.octaveNoise(x * 0.3, y * 0.3, z, 2, 0.4) - 0.3) * 40;
        
        return dunes + rocks;
    }
    
    /**
     * 海洋の高さ生成
     */
    private generateOceanHeight(x: number, y: number, z: number): number {
        // 基本は海面下
        let height = -5;
        
        // 島
        const island = this.noise.octaveNoise(x * 0.05, y * 0.05, z, 4, 0.5);
        if (island > 0.3) {
            height = (island - 0.3) * 50;
        }
        
        return height;
    }
    
    /**
     * 森林の高さ生成
     */
    private generateForestHeight(x: number, y: number, z: number): number {
        // なだらかな丘陵
        const hills = this.noise.octaveNoise(x * 0.05, y * 0.05, z, 4, 0.6) * 30;
        
        // 山脈
        const mountains = Math.max(0, this.noise.octaveNoise(x * 0.02, y * 0.02, z, 3, 0.5) - 0.4) * 80;
        
        return hills + mountains + 10;
    }
    
    /**
     * 氷の高さ生成
     */
    private generateIceHeight(x: number, y: number, z: number): number {
        // 氷河
        const glaciers = this.noise.octaveNoise(x * 0.08, y * 0.08, z, 3, 0.5) * 15;
        
        // クレバス
        const crevasses = Math.abs(this.noise.noise(x * 0.5, y * 0.5, z)) * -10;
        
        return glaciers + crevasses + 5;
    }
    
    /**
     * 火山の高さ生成
     */
    private generateVolcanicHeight(x: number, y: number, z: number): number {
        // 火山錐
        const volcano = Math.max(0, 0.7 - Math.sqrt(x * x + y * y) * 0.05) * 100;
        
        // 溶岩流
        const lava = this.noise.octaveNoise(x * 0.2, y * 0.2, z, 2, 0.3) * 10;
        
        // 荒れた地形
        const rough = this.noise.octaveNoise(x * 0.3, y * 0.3, z, 3, 0.7) * 20;
        
        return volcano + lava + rough;
    }
    
    /**
     * 惑星タイプに応じたマテリアルを取得
     */
    private getPlanetMaterial(): THREE.Material {
        const baseColors: Record<string, number> = {
            'desert': 0xC19A6B,
            'ocean': 0x006994,
            'forest': 0x228B22,
            'ice': 0xE0FFFF,
            'volcanic': 0x8B4513,
            'gas': 0xFFE4B5
        };
        
        const color = baseColors[this.planetType] || 0x808080;
        
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.2,
            flatShading: false,
            vertexColors: false
        });
    }
    
    /**
     * 装飾オブジェクトを生成
     */
    generateDecorations(chunkX: number, chunkZ: number): THREE.Object3D[] {
        const decorations: THREE.Object3D[] = [];
        
        // 惑星タイプに応じた装飾を生成
        switch (this.planetType) {
            case 'forest':
                // 木を配置
                for (let i = 0; i < 20; i++) {
                    const tree = this.createTree();
                    const pos = this.getRandomPositionInChunk(chunkX, chunkZ);
                    tree.position.copy(pos);
                    decorations.push(tree);
                }
                break;
                
            case 'desert':
                // 岩を配置
                for (let i = 0; i < 10; i++) {
                    const rock = this.createRock();
                    const pos = this.getRandomPositionInChunk(chunkX, chunkZ);
                    rock.position.copy(pos);
                    decorations.push(rock);
                }
                break;
        }
        
        return decorations;
    }
    
    /**
     * 木を作成
     */
    private createTree(): THREE.Object3D {
        const tree = new THREE.Group();
        
        // 幹
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        tree.add(trunk);
        
        // 葉
        const leavesGeometry = new THREE.SphereGeometry(2, 8, 6);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 6;
        tree.add(leaves);
        
        return tree;
    }
    
    /**
     * 岩を作成
     */
    private createRock(): THREE.Object3D {
        const geometry = new THREE.DodecahedronGeometry(Math.random() * 2 + 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 1
        });
        const rock = new THREE.Mesh(geometry, material);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        return rock;
    }
    
    /**
     * チャンク内のランダムな位置を取得
     */
    private getRandomPositionInChunk(chunkX: number, chunkZ: number): THREE.Vector3 {
        const size = this.settings.chunkSize;
        const localX = (Math.random() - 0.5) * size;
        const localZ = (Math.random() - 0.5) * size;
        
        const lon = ((chunkX + localX / size) / 100) * 2 * Math.PI - Math.PI;
        const lat = ((chunkZ + localZ / size) / 50) * Math.PI;
        
        const height = this.getHeightAt(lat, lon);
        return this.sphericalWorld.sphericalToCartesian(lat, lon, height);
    }
}