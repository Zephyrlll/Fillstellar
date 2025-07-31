import * as BABYLON from '@babylonjs/core';

export interface ResourceNode {
    id: string;
    type: 'mineral' | 'energy' | 'organic';
    amount: number;
    mesh: BABYLON.Mesh;
    position: BABYLON.Vector3;
    isHarvestable: boolean;
}

export interface ResourceInventory {
    mineral: number;
    energy: number;
    organic: number;
}

export class ResourceGatheringSystem {
    private scene: BABYLON.Scene;
    private resourceNodes: Map<string, ResourceNode> = new Map();
    private inventory: ResourceInventory = {
        mineral: 100, // 初期資源
        energy: 50,
        organic: 25
    };
    
    private gatherRange: number = 5; // 採取可能範囲
    private gatheringSpeed: number = 10; // 毎秒の採取量
    private currentTarget: ResourceNode | null = null;
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    async initialize(): Promise<void> {
        console.log('[RESOURCE] Initializing resource gathering system...');
        
        // インタラクション設定
        this.setupInteraction();
        
        console.log('[RESOURCE] Resource system initialized');
    }
    
    private setupInteraction(): void {
        // Eキーで採取
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && 
                kbInfo.event.key.toLowerCase() === 'e') {
                this.tryGatherResource();
            }
        });
    }
    
    generateResourceNodes(count: number): void {
        console.log(`[RESOURCE] Generating ${count} resource nodes...`);
        
        for (let i = 0; i < count; i++) {
            const type = this.getRandomResourceType();
            const position = this.getRandomPosition();
            
            this.createResourceNode(type, position);
        }
    }
    
    private getRandomResourceType(): 'mineral' | 'energy' | 'organic' {
        const types: ('mineral' | 'energy' | 'organic')[] = ['mineral', 'energy', 'organic'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    private getRandomPosition(): BABYLON.Vector3 {
        const radius = 120; // 境界内に配置
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        
        return new BABYLON.Vector3(
            Math.sin(angle) * distance,
            0,
            Math.cos(angle) * distance
        );
    }
    
    private createResourceNode(type: 'mineral' | 'energy' | 'organic', position: BABYLON.Vector3): void {
        let mesh: BABYLON.Mesh;
        let material: BABYLON.StandardMaterial;
        
        switch (type) {
            case 'mineral':
                mesh = BABYLON.MeshBuilder.CreateBox('mineral', { size: 1.5 }, this.scene);
                material = new BABYLON.StandardMaterial('mineralMat', this.scene);
                material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.7);
                material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;
                
            case 'energy':
                mesh = BABYLON.MeshBuilder.CreateSphere('energy', { diameter: 1.5 }, this.scene);
                material = new BABYLON.StandardMaterial('energyMat', this.scene);
                material.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
                material.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.1);
                break;
                
            case 'organic':
                mesh = BABYLON.MeshBuilder.CreateCylinder('organic', { 
                    height: 2, 
                    diameter: 1 
                }, this.scene);
                material = new BABYLON.StandardMaterial('organicMat', this.scene);
                material.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
                material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.1);
                break;
        }
        
        mesh.material = material;
        mesh.position = position.clone();
        mesh.position.y = 1; // 地面から少し浮かせる
        
        // アニメーション
        const animationY = new BABYLON.Animation(
            'bobbing',
            'position.y',
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const keys = [
            { frame: 0, value: 1 },
            { frame: 30, value: 1.5 },
            { frame: 60, value: 1 }
        ];
        
        animationY.setKeys(keys);
        mesh.animations.push(animationY);
        this.scene.beginAnimation(mesh, 0, 60, true);
        
        // リソースノードとして登録
        const nodeId = `resource_${Date.now()}_${Math.random()}`;
        const resourceNode: ResourceNode = {
            id: nodeId,
            type: type,
            amount: 50 + Math.floor(Math.random() * 50),
            mesh: mesh,
            position: position,
            isHarvestable: true
        };
        
        this.resourceNodes.set(nodeId, resourceNode);
    }
    
    private tryGatherResource(): void {
        const nearestNode = this.findNearestResourceNode();
        
        if (nearestNode) {
            this.currentTarget = nearestNode;
            console.log(`[RESOURCE] Started gathering ${nearestNode.type}`);
        }
    }
    
    private findNearestResourceNode(): ResourceNode | null {
        // プレイヤーの位置を取得（仮実装）
        const playerPosition = BABYLON.Vector3.Zero(); // TODO: 実際のプレイヤー位置を取得
        
        let nearestNode: ResourceNode | null = null;
        let nearestDistance = Infinity;
        
        for (const [id, node] of this.resourceNodes) {
            if (!node.isHarvestable) continue;
            
            const distance = BABYLON.Vector3.Distance(playerPosition, node.position);
            if (distance < this.gatherRange && distance < nearestDistance) {
                nearestDistance = distance;
                nearestNode = node;
            }
        }
        
        return nearestNode;
    }
    
    update(deltaTime: number): void {
        // 採取中の処理
        if (this.currentTarget && this.currentTarget.isHarvestable) {
            const gatherAmount = Math.min(
                this.gatheringSpeed * deltaTime,
                this.currentTarget.amount
            );
            
            this.currentTarget.amount -= gatherAmount;
            this.inventory[this.currentTarget.type] += gatherAmount;
            
            // リソースが枯渇したら削除
            if (this.currentTarget.amount <= 0) {
                this.currentTarget.isHarvestable = false;
                this.currentTarget.mesh.dispose();
                this.resourceNodes.delete(this.currentTarget.id);
                console.log(`[RESOURCE] Resource node depleted: ${this.currentTarget.type}`);
                this.currentTarget = null;
            }
        }
        
        // ビジュアルエフェクトの更新
        for (const [id, node] of this.resourceNodes) {
            if (node.mesh) {
                // 回転アニメーション
                node.mesh.rotation.y += deltaTime * 0.5;
            }
        }
    }
    
    getInventory(): ResourceInventory {
        return { ...this.inventory };
    }
    
    consumeResource(type: keyof ResourceInventory, amount: number): boolean {
        if (this.inventory[type] >= amount) {
            this.inventory[type] -= amount;
            return true;
        }
        return false;
    }
    
    dispose(): void {
        for (const [id, node] of this.resourceNodes) {
            if (node.mesh) {
                node.mesh.dispose();
            }
        }
        this.resourceNodes.clear();
        
        console.log('[RESOURCE] Disposed');
    }
}