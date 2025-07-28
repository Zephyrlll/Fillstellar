/**
 * Chunk Manager
 * 地形チャンクの管理とLOD制御
 */

import * as THREE from 'three';
import { SphericalWorld } from './SphericalWorld.js';
import { TerrainGenerator } from '../terrain/TerrainGenerator.js';

interface Chunk {
    x: number;
    z: number;
    mesh: THREE.Mesh;
    decorations: THREE.Object3D[];
    distance: number;
    loaded: boolean;
}

export class ChunkManager {
    private scene: THREE.Scene;
    private sphericalWorld: SphericalWorld;
    private terrainGenerator: TerrainGenerator;
    
    private chunks: Map<string, Chunk> = new Map();
    private loadingChunks: Set<string> = new Set();
    
    private settings: any;
    private playerPosition: THREE.Vector3;
    
    constructor(
        scene: THREE.Scene,
        sphericalWorld: SphericalWorld,
        terrainGenerator: TerrainGenerator
    ) {
        this.scene = scene;
        this.sphericalWorld = sphericalWorld;
        this.terrainGenerator = terrainGenerator;
        this.settings = sphericalWorld.getSettings();
        this.playerPosition = new THREE.Vector3();
    }
    
    /**
     * 初期化
     */
    async initialize(playerPosition: THREE.Vector3): Promise<void> {
        this.playerPosition.copy(playerPosition);
        await this.updateChunks(playerPosition);
    }
    
    /**
     * チャンクを更新
     */
    async update(playerPosition: THREE.Vector3): Promise<void> {
        this.playerPosition.copy(playerPosition);
        await this.updateChunks(playerPosition);
    }
    
    /**
     * プレイヤー位置に基づいてチャンクを更新
     */
    private async updateChunks(playerPosition: THREE.Vector3): Promise<void> {
        const { x: playerChunkX, z: playerChunkZ } = this.sphericalWorld.getChunkCoordinates(playerPosition);
        const viewDistance = this.settings.viewDistance;
        
        // 必要なチャンクを収集
        const requiredChunks = new Set<string>();
        
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dz = -viewDistance; dz <= viewDistance; dz++) {
                const chunkX = playerChunkX + dx;
                const chunkZ = playerChunkZ + dz;
                const key = this.getChunkKey(chunkX, chunkZ);
                requiredChunks.add(key);
            }
        }
        
        // 不要なチャンクを削除
        for (const [key, chunk] of this.chunks) {
            if (!requiredChunks.has(key)) {
                this.unloadChunk(key);
            }
        }
        
        // 新しいチャンクを読み込み
        const loadPromises: Promise<void>[] = [];
        
        for (const key of requiredChunks) {
            if (!this.chunks.has(key) && !this.loadingChunks.has(key)) {
                const [x, z] = this.parseChunkKey(key);
                loadPromises.push(this.loadChunk(x, z));
            }
        }
        
        // 並列で読み込み
        await Promise.all(loadPromises);
        
        // チャンクの距離を更新してLODを調整
        this.updateChunkDistances(playerPosition);
    }
    
    /**
     * チャンクを読み込み
     */
    private async loadChunk(x: number, z: number): Promise<void> {
        const key = this.getChunkKey(x, z);
        this.loadingChunks.add(key);
        
        try {
            // 地形メッシュを生成
            const mesh = await this.generateChunkMesh(x, z);
            
            // 装飾オブジェクトを生成
            const decorations = this.terrainGenerator.generateDecorations(x, z);
            
            // チャンクを作成
            const chunk: Chunk = {
                x,
                z,
                mesh,
                decorations,
                distance: 0,
                loaded: true
            };
            
            // シーンに追加
            this.scene.add(mesh);
            decorations.forEach(obj => this.scene.add(obj));
            
            // チャンクを保存
            this.chunks.set(key, chunk);
            
        } catch (error) {
            console.error('[CHUNK] Failed to load chunk:', key, error);
        } finally {
            this.loadingChunks.delete(key);
        }
    }
    
    /**
     * チャンクメッシュを生成
     */
    private async generateChunkMesh(x: number, z: number): Promise<THREE.Mesh> {
        // 非同期で生成（重い処理を想定）
        return new Promise((resolve) => {
            // 次のフレームで実行
            requestAnimationFrame(() => {
                const mesh = this.terrainGenerator.generateChunkMesh(x, z);
                resolve(mesh);
            });
        });
    }
    
    /**
     * チャンクをアンロード
     */
    private unloadChunk(key: string): void {
        const chunk = this.chunks.get(key);
        if (!chunk) return;
        
        // シーンから削除
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        if (chunk.mesh.material instanceof THREE.Material) {
            chunk.mesh.material.dispose();
        }
        
        // 装飾も削除
        chunk.decorations.forEach(obj => {
            this.scene.remove(obj);
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (obj.material instanceof THREE.Material) {
                    obj.material.dispose();
                }
            }
        });
        
        // マップから削除
        this.chunks.delete(key);
    }
    
    /**
     * チャンクの距離を更新
     */
    private updateChunkDistances(playerPosition: THREE.Vector3): void {
        for (const chunk of this.chunks.values()) {
            const chunkCenter = this.sphericalWorld.getChunkCenter(chunk.x, chunk.z);
            chunk.distance = this.sphericalWorld.getDistance(playerPosition, chunkCenter);
            
            // LODを更新
            this.updateChunkLOD(chunk);
        }
    }
    
    /**
     * チャンクのLODを更新
     */
    private updateChunkLOD(chunk: Chunk): void {
        // 距離に基づいてLODを設定
        if (chunk.distance < 100) {
            // 高品質
            chunk.mesh.visible = true;
            chunk.decorations.forEach(obj => obj.visible = true);
        } else if (chunk.distance < 200) {
            // 中品質（装飾なし）
            chunk.mesh.visible = true;
            chunk.decorations.forEach(obj => obj.visible = false);
        } else {
            // 低品質（簡略化）
            chunk.mesh.visible = true;
            chunk.decorations.forEach(obj => obj.visible = false);
        }
    }
    
    /**
     * チャンクキーを生成
     */
    private getChunkKey(x: number, z: number): string {
        return `${x}_${z}`;
    }
    
    /**
     * チャンクキーを解析
     */
    private parseChunkKey(key: string): [number, number] {
        const [x, z] = key.split('_').map(Number);
        return [x, z];
    }
    
    /**
     * 指定位置の地形高さを取得
     */
    getTerrainHeightAt(position: THREE.Vector3): number {
        const coords = this.sphericalWorld.cartesianToSpherical(position);
        return this.terrainGenerator.getHeightAt(coords.lat, coords.lon);
    }
    
    /**
     * レイキャストで地形との交差を検出
     */
    raycastTerrain(origin: THREE.Vector3, direction: THREE.Vector3): THREE.Intersection | null {
        const raycaster = new THREE.Raycaster(origin, direction);
        
        // 全チャンクのメッシュに対してレイキャスト
        const meshes = Array.from(this.chunks.values()).map(chunk => chunk.mesh);
        const intersections = raycaster.intersectObjects(meshes);
        
        return intersections.length > 0 ? intersections[0] : null;
    }
    
    /**
     * デバッグ情報を取得
     */
    getDebugInfo(): string {
        return `Chunks: ${this.chunks.size} loaded, ${this.loadingChunks.size} loading`;
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        // 全チャンクをアンロード
        for (const key of this.chunks.keys()) {
            this.unloadChunk(key);
        }
        
        this.chunks.clear();
        this.loadingChunks.clear();
    }
}