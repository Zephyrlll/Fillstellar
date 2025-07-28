/**
 * Resource System
 * リソースの配置と採集管理
 */

import * as THREE from 'three';
import { SphericalWorld } from '../core/SphericalWorld.js';
import { ChunkManager } from '../core/ChunkManager.js';

// リソースタイプ
export enum ResourceType {
    CRYSTAL = 'crystal',
    METAL = 'metal',
    ORGANIC = 'organic',
    ENERGY = 'energy',
    RARE = 'rare'
}

// リソースノード
interface ResourceNode {
    id: string;
    type: ResourceType;
    position: THREE.Vector3;
    amount: number;
    maxAmount: number;
    mesh: THREE.Mesh;
    respawnTime: number;
    lastHarvested: number;
}

// リソース定義
interface ResourceDefinition {
    type: ResourceType;
    name: string;
    color: number;
    baseAmount: number;
    respawnTime: number;
    rarity: number; // 0-1, 低いほどレア
}

export class ResourceSystem {
    private scene: THREE.Scene;
    private sphericalWorld: SphericalWorld;
    private chunkManager: ChunkManager;
    
    // リソース定義
    private resourceDefinitions: Map<ResourceType, ResourceDefinition>;
    
    // 配置済みリソース
    private resources: Map<string, ResourceNode> = new Map();
    
    // プレイヤーのインベントリ（簡易版）
    private inventory: Map<ResourceType, number> = new Map();
    
    // 採集関連
    private harvestRange = 5;
    private harvestCooldown = 1;
    private lastHarvestTime = 0;
    
    constructor(
        scene: THREE.Scene,
        sphericalWorld: SphericalWorld,
        chunkManager: ChunkManager
    ) {
        this.scene = scene;
        this.sphericalWorld = sphericalWorld;
        this.chunkManager = chunkManager;
        
        this.initializeResourceDefinitions();
        this.initializeInventory();
    }
    
    /**
     * リソース定義を初期化
     */
    private initializeResourceDefinitions(): void {
        this.resourceDefinitions = new Map([
            [ResourceType.CRYSTAL, {
                type: ResourceType.CRYSTAL,
                name: 'クリスタル',
                color: 0x00FFFF,
                baseAmount: 100,
                respawnTime: 300, // 5分
                rarity: 0.7
            }],
            [ResourceType.METAL, {
                type: ResourceType.METAL,
                name: '金属鉱石',
                color: 0x808080,
                baseAmount: 150,
                respawnTime: 240, // 4分
                rarity: 0.8
            }],
            [ResourceType.ORGANIC, {
                type: ResourceType.ORGANIC,
                name: '有機物',
                color: 0x00FF00,
                baseAmount: 80,
                respawnTime: 180, // 3分
                rarity: 0.9
            }],
            [ResourceType.ENERGY, {
                type: ResourceType.ENERGY,
                name: 'エネルギー結晶',
                color: 0xFFFF00,
                baseAmount: 50,
                respawnTime: 360, // 6分
                rarity: 0.5
            }],
            [ResourceType.RARE, {
                type: ResourceType.RARE,
                name: 'レア元素',
                color: 0xFF00FF,
                baseAmount: 30,
                respawnTime: 600, // 10分
                rarity: 0.2
            }]
        ]);
    }
    
    /**
     * インベントリを初期化
     */
    private initializeInventory(): void {
        for (const type of Object.values(ResourceType)) {
            this.inventory.set(type as ResourceType, 0);
        }
    }
    
    /**
     * チャンクにリソースを生成
     */
    generateResourcesForChunk(chunkX: number, chunkZ: number): void {
        const seed = chunkX * 1000 + chunkZ;
        const random = this.seededRandom(seed);
        
        // チャンクごとのリソース数
        const resourceCount = Math.floor(random() * 5) + 3;
        
        for (let i = 0; i < resourceCount; i++) {
            // リソースタイプを選択
            const type = this.selectResourceType(random);
            if (!type) continue;
            
            // 位置を決定
            const position = this.getRandomPositionInChunk(chunkX, chunkZ, random);
            
            // リソースノードを作成
            this.createResourceNode(type, position);
        }
    }
    
    /**
     * シード付き乱数生成器
     */
    private seededRandom(seed: number): () => number {
        return () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
    }
    
    /**
     * リソースタイプを選択
     */
    private selectResourceType(random: () => number): ResourceType | null {
        const roll = random();
        
        for (const [type, definition] of this.resourceDefinitions.entries()) {
            if (roll < definition.rarity) {
                return type;
            }
        }
        
        return null;
    }
    
    /**
     * チャンク内のランダムな位置を取得
     */
    private getRandomPositionInChunk(
        chunkX: number,
        chunkZ: number,
        random: () => number
    ): THREE.Vector3 {
        const settings = this.sphericalWorld.getSettings();
        const size = settings.chunkSize;
        
        const localX = (random() - 0.5) * size * 0.8; // 端を避ける
        const localZ = (random() - 0.5) * size * 0.8;
        
        const lon = ((chunkX + localX / size) / 100) * 2 * Math.PI - Math.PI;
        const lat = ((chunkZ + localZ / size) / 50) * Math.PI;
        
        // 地形の高さを取得
        const terrainHeight = this.chunkManager.getTerrainHeightAt(
            this.sphericalWorld.sphericalToCartesian(lat, lon, 0)
        );
        
        return this.sphericalWorld.sphericalToCartesian(lat, lon, terrainHeight + 1);
    }
    
    /**
     * リソースノードを作成
     */
    private createResourceNode(type: ResourceType, position: THREE.Vector3): void {
        const definition = this.resourceDefinitions.get(type);
        if (!definition) return;
        
        const id = `resource_${Date.now()}_${Math.random()}`;
        
        // メッシュを作成
        const mesh = this.createResourceMesh(type);
        mesh.position.copy(position);
        
        // 法線方向に整列
        const normal = this.sphericalWorld.getNormal(position);
        this.alignToNormal(mesh, normal);
        
        // リソースノードを作成
        const node: ResourceNode = {
            id,
            type,
            position: position.clone(),
            amount: definition.baseAmount,
            maxAmount: definition.baseAmount,
            mesh,
            respawnTime: definition.respawnTime,
            lastHarvested: 0
        };
        
        // 保存とシーンに追加
        this.resources.set(id, node);
        this.scene.add(mesh);
    }
    
    /**
     * リソースメッシュを作成
     */
    private createResourceMesh(type: ResourceType): THREE.Mesh {
        const definition = this.resourceDefinitions.get(type);
        if (!definition) {
            throw new Error(`Unknown resource type: ${type}`);
        }
        
        let geometry: THREE.BufferGeometry;
        
        switch (type) {
            case ResourceType.CRYSTAL:
                geometry = new THREE.OctahedronGeometry(0.5);
                break;
            case ResourceType.METAL:
                geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
                break;
            case ResourceType.ORGANIC:
                geometry = new THREE.SphereGeometry(0.4, 8, 6);
                break;
            case ResourceType.ENERGY:
                geometry = new THREE.TetrahedronGeometry(0.6);
                break;
            case ResourceType.RARE:
                geometry = new THREE.IcosahedronGeometry(0.4);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: definition.color,
            emissive: definition.color,
            emissiveIntensity: 0.2,
            metalness: type === ResourceType.METAL ? 0.8 : 0.3,
            roughness: type === ResourceType.CRYSTAL ? 0.2 : 0.6
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // 浮遊アニメーション用のユーザーデータ
        mesh.userData.floatOffset = Math.random() * Math.PI * 2;
        
        return mesh;
    }
    
    /**
     * 法線方向に整列
     */
    private alignToNormal(mesh: THREE.Mesh, normal: THREE.Vector3): void {
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
        mesh.quaternion.copy(quaternion);
    }
    
    /**
     * プレイヤー位置の近くのリソースを採集
     */
    harvestNearbyResources(playerPosition: THREE.Vector3): number {
        const currentTime = Date.now() / 1000;
        
        // クールダウンチェック
        if (currentTime - this.lastHarvestTime < this.harvestCooldown) {
            return 0;
        }
        
        let harvestedCount = 0;
        
        for (const node of this.resources.values()) {
            // 距離チェック
            const distance = playerPosition.distanceTo(node.position);
            if (distance > this.harvestRange) continue;
            
            // 採集可能かチェック
            if (node.amount <= 0) continue;
            
            // 採集
            const harvestAmount = Math.min(10, node.amount);
            node.amount -= harvestAmount;
            
            // インベントリに追加
            const current = this.inventory.get(node.type) || 0;
            this.inventory.set(node.type, current + harvestAmount);
            
            // エフェクト
            this.playHarvestEffect(node);
            
            harvestedCount++;
            node.lastHarvested = currentTime;
            
            // メッシュを更新
            this.updateResourceMesh(node);
            
            console.log('[RESOURCE] Harvested', harvestAmount, node.type, 'from', node.id);
        }
        
        if (harvestedCount > 0) {
            this.lastHarvestTime = currentTime;
        }
        
        return harvestedCount;
    }
    
    /**
     * 採集エフェクト
     */
    private playHarvestEffect(node: ResourceNode): void {
        // 簡易的なスケールアニメーション
        const originalScale = node.mesh.scale.clone();
        node.mesh.scale.multiplyScalar(0.8);
        
        // 元に戻す
        setTimeout(() => {
            if (node.mesh) {
                node.mesh.scale.copy(originalScale);
            }
        }, 200);
    }
    
    /**
     * リソースメッシュを更新
     */
    private updateResourceMesh(node: ResourceNode): void {
        if (node.amount <= 0) {
            // 枯渇したら非表示
            node.mesh.visible = false;
        } else {
            // 量に応じてスケール調整
            const scale = node.amount / node.maxAmount;
            node.mesh.scale.setScalar(0.5 + scale * 0.5);
        }
    }
    
    /**
     * インベントリを取得
     */
    getInventory(): Map<ResourceType, number> {
        return new Map(this.inventory);
    }
    
    /**
     * 特定のリソース量を取得
     */
    getResourceAmount(type: ResourceType): number {
        return this.inventory.get(type) || 0;
    }
    
    /**
     * リソースを消費
     */
    consumeResource(type: ResourceType, amount: number): boolean {
        const current = this.inventory.get(type) || 0;
        if (current < amount) return false;
        
        this.inventory.set(type, current - amount);
        return true;
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        const currentTime = Date.now() / 1000;
        
        // リソースの再生成
        for (const node of this.resources.values()) {
            if (node.amount < node.maxAmount) {
                const timeSinceHarvest = currentTime - node.lastHarvested;
                if (timeSinceHarvest >= node.respawnTime) {
                    // 再生成
                    node.amount = node.maxAmount;
                    node.mesh.visible = true;
                    this.updateResourceMesh(node);
                    console.log('[RESOURCE] Respawned', node.type, node.id);
                }
            }
        }
        
        // 浮遊アニメーション
        for (const node of this.resources.values()) {
            if (node.mesh.visible) {
                const floatOffset = node.mesh.userData.floatOffset || 0;
                const floatHeight = Math.sin(currentTime + floatOffset) * 0.1;
                
                // 元の位置から浮遊
                const normal = this.sphericalWorld.getNormal(node.position);
                const floatPosition = node.position.clone().add(
                    normal.multiplyScalar(floatHeight)
                );
                node.mesh.position.copy(floatPosition);
                
                // 回転
                node.mesh.rotateY(deltaTime * 0.5);
            }
        }
    }
    
    /**
     * デバッグ情報を取得
     */
    getDebugInfo(): string {
        const resourceCount = this.resources.size;
        const inventoryInfo = Array.from(this.inventory.entries())
            .map(([type, amount]) => `${type}: ${amount}`)
            .join(', ');
        
        return `Resources: ${resourceCount} nodes | Inventory: ${inventoryInfo}`;
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        // 全リソースを削除
        for (const node of this.resources.values()) {
            this.scene.remove(node.mesh);
            node.mesh.geometry.dispose();
            if (node.mesh.material instanceof THREE.Material) {
                node.mesh.material.dispose();
            }
        }
        
        this.resources.clear();
    }
}