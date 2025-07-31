import * as BABYLON from '@babylonjs/core';
import { CurvedTerrainSystem } from './systems/CurvedTerrainSystem';
import { SandboxCharacterController } from './controllers/SandboxCharacterController';
import { SandboxCameraController } from './controllers/SandboxCameraController';
import { BuildingSystem } from './systems/BuildingSystem';
import { ResourceGatheringSystem } from './systems/ResourceGatheringSystem';
import { UISystem } from './ui/UISystem';

export class PlanetExplorationSandbox {
    private canvas: HTMLCanvasElement;
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    
    // ゲームシステム
    private terrain: CurvedTerrainSystem;
    private character: SandboxCharacterController;
    private cameraController: SandboxCameraController;
    private buildingSystem: BuildingSystem;
    private resourceSystem: ResourceGatheringSystem;
    private uiSystem: UISystem;
    
    // ゲーム設定
    private readonly WORLD_SIZE = 300; // 300m x 300m
    private readonly BOUNDARY_RADIUS = 140; // 移動可能範囲
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });
        
        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
    
    async initialize(): Promise<void> {
        console.log('[SANDBOX] Initializing game systems...');
        
        // シーン作成
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.6, 0.8, 1.0, 1.0); // 空色
        
        // ライティング設定
        this.setupLighting();
        
        // 地形システム
        this.terrain = new CurvedTerrainSystem(this.scene, this.WORLD_SIZE);
        await this.terrain.initialize();
        
        // キャラクターコントローラー
        this.character = new SandboxCharacterController(this.scene);
        await this.character.initialize();
        
        // カメラコントローラー
        this.cameraController = new SandboxCameraController(
            this.scene,
            this.canvas,
            this.character.getCharacterMesh()
        );
        this.cameraController.initialize();
        
        // 建設システム
        this.buildingSystem = new BuildingSystem(this.scene);
        await this.buildingSystem.initialize();
        
        // リソースシステム
        this.resourceSystem = new ResourceGatheringSystem(this.scene);
        await this.resourceSystem.initialize();
        
        // UIシステム
        this.uiSystem = new UISystem(
            this.scene,
            this.buildingSystem,
            this.resourceSystem
        );
        this.uiSystem.initialize();
        
        // レンダリングループ
        this.engine.runRenderLoop(() => {
            this.update();
            this.scene.render();
        });
        
        console.log('[SANDBOX] Initialization complete');
    }
    
    private setupLighting(): void {
        // 太陽光
        const sunLight = new BABYLON.DirectionalLight(
            'sunLight',
            new BABYLON.Vector3(-0.5, -1, 0.5),
            this.scene
        );
        sunLight.intensity = 1.5;
        sunLight.shadowEnabled = true;
        
        // 環境光
        const ambientLight = new BABYLON.HemisphericLight(
            'ambientLight',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.5;
        ambientLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.4);
    }
    
    private update(): void {
        const deltaTime = this.engine.getDeltaTime() / 1000;
        
        // 各システムの更新
        this.character.update(deltaTime);
        this.cameraController.update(deltaTime);
        
        // 地形の高さにキャラクターを配置
        const charPos = this.character.getPosition();
        const terrainHeight = this.terrain.getHeightAtPosition(charPos.x, charPos.z);
        this.character.setGroundHeight(terrainHeight);
        
        // 境界チェック
        this.checkBoundaries();
        
        // 建設とリソースシステムの更新
        this.buildingSystem.update(deltaTime);
        this.resourceSystem.update(deltaTime);
        
        // UI更新
        this.uiSystem.update(deltaTime);
    }
    
    private checkBoundaries(): void {
        const position = this.character.getPosition();
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        
        if (distance > this.BOUNDARY_RADIUS) {
            // 境界外にいる場合は押し戻す
            const normalized = position.normalize();
            const newPos = normalized.scale(this.BOUNDARY_RADIUS * 0.95);
            newPos.y = position.y; // Y座標は維持
            this.character.setPosition(newPos);
            
            // 警告表示
            this.uiSystem.showBoundaryWarning();
        }
    }
    
    async start(): Promise<void> {
        console.log('[SANDBOX] Starting game...');
        
        // 初期のリソースノードを配置
        this.resourceSystem.generateResourceNodes(20);
        
        // キャラクターの初期位置
        const spawnPosition = new BABYLON.Vector3(0, 5, 0);
        this.character.spawn(spawnPosition);
        
        // 操作説明を表示
        this.createControlsUI();
        
        console.log('[SANDBOX] Game started');
    }
    
    private createControlsUI(): void {
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        
        controls.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">操作方法</h3>
            <p style="margin: 2px 0;">WASD: 移動</p>
            <p style="margin: 2px 0;">スペース: ジャンプ</p>
            <p style="margin: 2px 0;">Shift: 走る</p>
            <p style="margin: 2px 0;">マウス: 視点操作</p>
            <p style="margin: 2px 0;">ホイール: ズーム</p>
            <p style="margin: 2px 0;">B: 建設メニュー</p>
            <p style="margin: 2px 0;">E: リソース採取</p>
            <p style="margin: 2px 0;">ESC: マウスロック解除</p>
        `;
        
        document.body.appendChild(controls);
    }
    
    dispose(): void {
        // 各システムのクリーンアップ
        if (this.terrain) this.terrain.dispose();
        if (this.character) this.character.dispose();
        if (this.cameraController) this.cameraController.dispose();
        if (this.buildingSystem) this.buildingSystem.dispose();
        if (this.resourceSystem) this.resourceSystem.dispose();
        if (this.uiSystem) this.uiSystem.dispose();
        
        this.scene.dispose();
        this.engine.dispose();
        
        console.log('[SANDBOX] Disposed');
    }
}