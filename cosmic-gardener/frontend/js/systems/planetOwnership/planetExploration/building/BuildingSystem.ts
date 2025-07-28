/**
 * Building System
 * 建築システムの管理
 */

import * as THREE from 'three';
import { SphericalWorld } from '../core/SphericalWorld.js';

// 建物の種類
export enum BuildingType {
    SHELTER = 'shelter',
    STORAGE = 'storage',
    GENERATOR = 'generator',
    EXTRACTOR = 'extractor',
    WORKSHOP = 'workshop'
}

// 建物データ
interface BuildingData {
    type: BuildingType;
    name: string;
    size: THREE.Vector3;
    cost: Record<string, number>;
    description: string;
}

// 配置済み建物
interface PlacedBuilding {
    id: string;
    type: BuildingType;
    position: THREE.Vector3;
    rotation: number;
    mesh: THREE.Mesh;
    level: number;
}

export class BuildingSystem {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private sphericalWorld: SphericalWorld;
    
    // 建物定義
    private buildingDefinitions: Map<BuildingType, BuildingData>;
    
    // 配置済み建物
    private buildings: Map<string, PlacedBuilding> = new Map();
    
    // 建築モード
    private buildMode = false;
    private currentBuildingType: BuildingType | null = null;
    private previewMesh: THREE.Mesh | null = null;
    private validPlacement = false;
    
    // レイキャスター
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    
    constructor(
        scene: THREE.Scene,
        camera: THREE.Camera,
        sphericalWorld: SphericalWorld
    ) {
        this.scene = scene;
        this.camera = camera;
        this.sphericalWorld = sphericalWorld;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.initializeBuildingDefinitions();
        this.setupEventListeners();
    }
    
    /**
     * 建物定義を初期化
     */
    private initializeBuildingDefinitions(): void {
        this.buildingDefinitions = new Map([
            [BuildingType.SHELTER, {
                type: BuildingType.SHELTER,
                name: 'シェルター',
                size: new THREE.Vector3(4, 3, 4),
                cost: { cosmicDust: 100, energy: 50 },
                description: '基本的な居住施設'
            }],
            [BuildingType.STORAGE, {
                type: BuildingType.STORAGE,
                name: '貯蔵庫',
                size: new THREE.Vector3(3, 2.5, 3),
                cost: { cosmicDust: 80, organicMatter: 30 },
                description: 'リソースを保管'
            }],
            [BuildingType.GENERATOR, {
                type: BuildingType.GENERATOR,
                name: '発電機',
                size: new THREE.Vector3(2, 3, 2),
                cost: { cosmicDust: 150, energy: 100 },
                description: 'エネルギーを生成'
            }],
            [BuildingType.EXTRACTOR, {
                type: BuildingType.EXTRACTOR,
                name: '採掘機',
                size: new THREE.Vector3(3, 4, 3),
                cost: { cosmicDust: 200, energy: 150 },
                description: 'リソースを自動採掘'
            }],
            [BuildingType.WORKSHOP, {
                type: BuildingType.WORKSHOP,
                name: 'ワークショップ',
                size: new THREE.Vector3(5, 3, 5),
                cost: { cosmicDust: 300, organicMatter: 100, energy: 200 },
                description: 'アイテムをクラフト'
            }]
        ]);
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('click', this.onClick);
        window.addEventListener('keydown', this.onKeyDown);
    }
    
    /**
     * マウス移動時
     */
    private onMouseMove = (event: MouseEvent): void => {
        // マウス座標を正規化
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        if (this.buildMode && this.previewMesh) {
            this.updatePreviewPosition();
        }
    };
    
    /**
     * クリック時
     */
    private onClick = (): void => {
        if (this.buildMode && this.validPlacement && this.currentBuildingType) {
            this.placeBuilding();
        }
    };
    
    /**
     * キー押下時
     */
    private onKeyDown = (event: KeyboardEvent): void => {
        if (this.buildMode) {
            switch (event.key) {
                case 'Escape':
                    this.exitBuildMode();
                    break;
                case 'r':
                case 'R':
                    this.rotatePreview();
                    break;
            }
        }
    };
    
    /**
     * 建築モードに入る
     */
    enterBuildMode(buildingType: BuildingType): void {
        this.buildMode = true;
        this.currentBuildingType = buildingType;
        
        // プレビューメッシュを作成
        const definition = this.buildingDefinitions.get(buildingType);
        if (definition) {
            this.previewMesh = this.createBuildingMesh(buildingType, true);
            this.scene.add(this.previewMesh);
        }
    }
    
    /**
     * 建築モードを終了
     */
    exitBuildMode(): void {
        this.buildMode = false;
        this.currentBuildingType = null;
        
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
            this.previewMesh.geometry.dispose();
            if (this.previewMesh.material instanceof THREE.Material) {
                this.previewMesh.material.dispose();
            }
            this.previewMesh = null;
        }
    }
    
    /**
     * プレビューを回転
     */
    private rotatePreview(): void {
        if (this.previewMesh) {
            this.previewMesh.rotateY(Math.PI / 4);
        }
    }
    
    /**
     * プレビュー位置を更新
     */
    private updatePreviewPosition(): void {
        if (!this.previewMesh) return;
        
        // レイキャスト
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 地形との交差を検出（簡易版：球面に配置）
        const intersectPoint = this.getTerrainIntersection();
        
        if (intersectPoint) {
            // 球面上の位置に配置
            this.previewMesh.position.copy(intersectPoint);
            
            // 法線方向に向きを合わせる
            const normal = this.sphericalWorld.getNormal(intersectPoint);
            this.alignToNormal(this.previewMesh, normal);
            
            // 配置可能かチェック
            this.validPlacement = this.checkValidPlacement(intersectPoint);
            
            // 色を変更
            if (this.previewMesh.material instanceof THREE.MeshStandardMaterial) {
                this.previewMesh.material.color.setHex(
                    this.validPlacement ? 0x00ff00 : 0xff0000
                );
                this.previewMesh.material.opacity = 0.7;
            }
        }
    }
    
    /**
     * 地形との交差点を取得
     */
    private getTerrainIntersection(): THREE.Vector3 | null {
        // 簡易版：レイと球面の交差を計算
        const ray = this.raycaster.ray;
        const sphereRadius = this.sphericalWorld.getRadius() + 2; // 地表から少し上
        
        // レイと球の交差を計算
        const oc = ray.origin.clone().sub(new THREE.Vector3(0, 0, 0));
        const a = ray.direction.dot(ray.direction);
        const b = 2.0 * oc.dot(ray.direction);
        const c = oc.dot(oc) - sphereRadius * sphereRadius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return null;
        }
        
        const t = (-b - Math.sqrt(discriminant)) / (2.0 * a);
        if (t < 0) {
            return null;
        }
        
        return ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));
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
     * 配置可能かチェック
     */
    private checkValidPlacement(position: THREE.Vector3): boolean {
        if (!this.currentBuildingType) return false;
        
        const definition = this.buildingDefinitions.get(this.currentBuildingType);
        if (!definition) return false;
        
        // 他の建物との衝突チェック
        for (const building of this.buildings.values()) {
            const distance = position.distanceTo(building.position);
            if (distance < 5) { // 最小距離
                return false;
            }
        }
        
        // TODO: 地形の傾斜チェック
        // TODO: リソースコストチェック
        
        return true;
    }
    
    /**
     * 建物を配置
     */
    private placeBuilding(): void {
        if (!this.previewMesh || !this.currentBuildingType) return;
        
        const id = `building_${Date.now()}`;
        const mesh = this.createBuildingMesh(this.currentBuildingType, false);
        
        // プレビューの位置と回転をコピー
        mesh.position.copy(this.previewMesh.position);
        mesh.quaternion.copy(this.previewMesh.quaternion);
        
        // 建物データを作成
        const building: PlacedBuilding = {
            id,
            type: this.currentBuildingType,
            position: mesh.position.clone(),
            rotation: mesh.rotation.y,
            mesh,
            level: 1
        };
        
        // 保存とシーンに追加
        this.buildings.set(id, building);
        this.scene.add(mesh);
        
        // TODO: リソースを消費
        // TODO: 建築効果音
        
        console.log('[BUILD] Placed building:', this.currentBuildingType, 'at', mesh.position);
        
        // 建築モードを終了
        this.exitBuildMode();
    }
    
    /**
     * 建物メッシュを作成
     */
    private createBuildingMesh(type: BuildingType, isPreview: boolean): THREE.Mesh {
        const definition = this.buildingDefinitions.get(type);
        if (!definition) {
            throw new Error(`Unknown building type: ${type}`);
        }
        
        // ジオメトリを作成
        const geometry = this.createBuildingGeometry(type);
        
        // マテリアルを作成
        const material = new THREE.MeshStandardMaterial({
            color: this.getBuildingColor(type),
            transparent: isPreview,
            opacity: isPreview ? 0.7 : 1.0,
            metalness: 0.3,
            roughness: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    /**
     * 建物のジオメトリを作成
     */
    private createBuildingGeometry(type: BuildingType): THREE.BufferGeometry {
        const definition = this.buildingDefinitions.get(type);
        if (!definition) {
            return new THREE.BoxGeometry(1, 1, 1);
        }
        
        const { size } = definition;
        
        switch (type) {
            case BuildingType.SHELTER:
                // 家の形状
                const house = new THREE.Group();
                const base = new THREE.BoxGeometry(size.x, size.y * 0.7, size.z);
                const roof = new THREE.ConeGeometry(size.x * 0.7, size.y * 0.3, 4);
                // TODO: ジオメトリを結合
                return base;
                
            case BuildingType.STORAGE:
                return new THREE.BoxGeometry(size.x, size.y, size.z);
                
            case BuildingType.GENERATOR:
                return new THREE.CylinderGeometry(size.x / 2, size.x / 2, size.y, 8);
                
            case BuildingType.EXTRACTOR:
                const extractor = new THREE.CylinderGeometry(size.x / 3, size.x / 2, size.y, 6);
                return extractor;
                
            case BuildingType.WORKSHOP:
                return new THREE.BoxGeometry(size.x, size.y, size.z);
                
            default:
                return new THREE.BoxGeometry(size.x, size.y, size.z);
        }
    }
    
    /**
     * 建物の色を取得
     */
    private getBuildingColor(type: BuildingType): number {
        const colors: Record<BuildingType, number> = {
            [BuildingType.SHELTER]: 0x8B7355,
            [BuildingType.STORAGE]: 0x708090,
            [BuildingType.GENERATOR]: 0x4682B4,
            [BuildingType.EXTRACTOR]: 0xFF8C00,
            [BuildingType.WORKSHOP]: 0x8B4513
        };
        
        return colors[type] || 0x808080;
    }
    
    /**
     * 建物を取得
     */
    getBuilding(id: string): PlacedBuilding | undefined {
        return this.buildings.get(id);
    }
    
    /**
     * 全建物を取得
     */
    getAllBuildings(): PlacedBuilding[] {
        return Array.from(this.buildings.values());
    }
    
    /**
     * 建物をアップグレード
     */
    upgradeBuilding(id: string): boolean {
        const building = this.buildings.get(id);
        if (!building) return false;
        
        // TODO: アップグレードコストチェック
        // TODO: アップグレード処理
        
        building.level++;
        console.log('[BUILD] Upgraded building:', id, 'to level', building.level);
        
        return true;
    }
    
    /**
     * 建物を削除
     */
    removeBuilding(id: string): boolean {
        const building = this.buildings.get(id);
        if (!building) return false;
        
        // シーンから削除
        this.scene.remove(building.mesh);
        building.mesh.geometry.dispose();
        if (building.mesh.material instanceof THREE.Material) {
            building.mesh.material.dispose();
        }
        
        // マップから削除
        this.buildings.delete(id);
        
        // TODO: リソースの一部を返却
        
        console.log('[BUILD] Removed building:', id);
        return true;
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        // TODO: 建物の動作を更新（発電、採掘など）
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        // イベントリスナーを削除
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('click', this.onClick);
        window.removeEventListener('keydown', this.onKeyDown);
        
        // 建築モードを終了
        this.exitBuildMode();
        
        // 全建物を削除
        for (const id of this.buildings.keys()) {
            this.removeBuilding(id);
        }
    }
}