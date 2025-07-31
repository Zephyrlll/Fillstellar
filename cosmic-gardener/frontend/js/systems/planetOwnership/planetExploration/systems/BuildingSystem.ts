import * as BABYLON from '@babylonjs/core';

export interface BuildingType {
    id: string;
    name: string;
    cost: { [key: string]: number };
    model: () => BABYLON.Mesh;
    size: BABYLON.Vector2; // グリッドサイズ
}

export class BuildingSystem {
    private scene: BABYLON.Scene;
    private buildings: Map<string, BABYLON.Mesh> = new Map();
    private previewMesh: BABYLON.Mesh | null = null;
    private gridSize: number = 2; // 2mグリッド
    private isPlacingMode: boolean = false;
    private selectedBuildingType: BuildingType | null = null;
    
    // 建物タイプ定義
    private buildingTypes: BuildingType[] = [
        {
            id: 'base',
            name: '基地',
            cost: { mineral: 50, energy: 20 },
            model: () => this.createBaseModel(),
            size: new BABYLON.Vector2(4, 4)
        },
        {
            id: 'miner',
            name: '採掘機',
            cost: { mineral: 30, energy: 10 },
            model: () => this.createMinerModel(),
            size: new BABYLON.Vector2(2, 2)
        },
        {
            id: 'storage',
            name: 'ストレージ',
            cost: { mineral: 20, energy: 5 },
            model: () => this.createStorageModel(),
            size: new BABYLON.Vector2(3, 3)
        }
    ];
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    async initialize(): Promise<void> {
        console.log('[BUILDING] Initializing building system...');
        
        // レイキャスト用の地面検出設定
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (this.isPlacingMode && pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.updatePreviewPosition(pointerInfo);
            } else if (this.isPlacingMode && pointerInfo.type === BABYLON.PointerEventTypes.POINTERTAP) {
                this.placeBuilding();
            }
        });
        
        console.log('[BUILDING] Building system initialized');
    }
    
    private createBaseModel(): BABYLON.Mesh {
        const base = BABYLON.MeshBuilder.CreateBox('base', { size: 4 }, this.scene);
        base.scaling.y = 0.5;
        
        const material = new BABYLON.StandardMaterial('baseMaterial', this.scene);
        material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.6);
        base.material = material;
        
        return base;
    }
    
    private createMinerModel(): BABYLON.Mesh {
        const miner = BABYLON.MeshBuilder.CreateCylinder('miner', {
            height: 3,
            diameter: 2
        }, this.scene);
        
        const material = new BABYLON.StandardMaterial('minerMaterial', this.scene);
        material.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.2);
        miner.material = material;
        
        return miner;
    }
    
    private createStorageModel(): BABYLON.Mesh {
        const storage = BABYLON.MeshBuilder.CreateBox('storage', { size: 3 }, this.scene);
        
        const material = new BABYLON.StandardMaterial('storageMaterial', this.scene);
        material.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3);
        storage.material = material;
        
        return storage;
    }
    
    startPlacement(buildingTypeId: string): void {
        const buildingType = this.buildingTypes.find(b => b.id === buildingTypeId);
        if (!buildingType) return;
        
        this.selectedBuildingType = buildingType;
        this.isPlacingMode = true;
        
        // プレビューメッシュを作成
        if (this.previewMesh) {
            this.previewMesh.dispose();
        }
        
        this.previewMesh = buildingType.model();
        this.previewMesh.isPickable = false;
        
        // 半透明にする
        const material = this.previewMesh.material as BABYLON.StandardMaterial;
        if (material) {
            material.alpha = 0.5;
        }
        
        console.log('[BUILDING] Started placement mode for:', buildingTypeId);
    }
    
    cancelPlacement(): void {
        this.isPlacingMode = false;
        this.selectedBuildingType = null;
        
        if (this.previewMesh) {
            this.previewMesh.dispose();
            this.previewMesh = null;
        }
        
        console.log('[BUILDING] Cancelled placement mode');
    }
    
    private updatePreviewPosition(pointerInfo: BABYLON.PointerInfo): void {
        if (!this.previewMesh) return;
        
        const pickResult = this.scene.pick(
            pointerInfo.event.clientX,
            pointerInfo.event.clientY,
            (mesh) => mesh.name === 'terrain'
        );
        
        if (pickResult && pickResult.hit && pickResult.pickedPoint) {
            // グリッドにスナップ
            const snappedPos = this.snapToGrid(pickResult.pickedPoint);
            this.previewMesh.position = snappedPos;
            
            // 配置可能かチェック
            const canPlace = this.canPlaceBuilding(snappedPos);
            const material = this.previewMesh.material as BABYLON.StandardMaterial;
            if (material) {
                material.emissiveColor = canPlace ? 
                    new BABYLON.Color3(0, 0.3, 0) : 
                    new BABYLON.Color3(0.3, 0, 0);
            }
        }
    }
    
    private snapToGrid(position: BABYLON.Vector3): BABYLON.Vector3 {
        return new BABYLON.Vector3(
            Math.round(position.x / this.gridSize) * this.gridSize,
            position.y,
            Math.round(position.z / this.gridSize) * this.gridSize
        );
    }
    
    private canPlaceBuilding(position: BABYLON.Vector3): boolean {
        if (!this.selectedBuildingType) return false;
        
        // 他の建物との衝突チェック
        for (const [id, building] of this.buildings) {
            const distance = BABYLON.Vector3.Distance(position, building.position);
            if (distance < this.gridSize * 2) {
                return false;
            }
        }
        
        return true;
    }
    
    private placeBuilding(): void {
        if (!this.previewMesh || !this.selectedBuildingType) return;
        
        const position = this.previewMesh.position;
        if (!this.canPlaceBuilding(position)) {
            console.log('[BUILDING] Cannot place building at this location');
            return;
        }
        
        // 建物を配置
        const building = this.selectedBuildingType.model();
        building.position = position.clone();
        
        const buildingId = `${this.selectedBuildingType.id}_${Date.now()}`;
        this.buildings.set(buildingId, building);
        
        console.log('[BUILDING] Placed building:', buildingId);
        
        // 配置モードを終了
        this.cancelPlacement();
    }
    
    getBuildingTypes(): BuildingType[] {
        return this.buildingTypes;
    }
    
    update(deltaTime: number): void {
        // 建物のアニメーションなどをここで更新
    }
    
    dispose(): void {
        for (const [id, building] of this.buildings) {
            building.dispose();
        }
        this.buildings.clear();
        
        if (this.previewMesh) {
            this.previewMesh.dispose();
        }
        
        console.log('[BUILDING] Disposed');
    }
}