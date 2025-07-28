/**
 * Planet Exploration Game
 * 惑星探索・住居ゲームのメインクラス
 */

import * as THREE from 'three';
import { OwnedPlanet } from '../../planetShop.js';
import { SphericalWorld } from './SphericalWorld.js';
import { FirstPersonController } from '../player/FirstPersonController.js';
import { TerrainGenerator } from '../terrain/TerrainGenerator.js';
import { BuildingSystem } from '../building/BuildingSystem.js';
import { ResourceSystem } from '../resources/ResourceSystem.js';
import { ExplorationUI } from '../ui/ExplorationUI.js';
import { ChunkManager } from './ChunkManager.js';

export class PlanetExplorationGame {
    private static instance: PlanetExplorationGame;
    
    // Core components
    private container: HTMLDivElement | null = null;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    
    // Game systems
    private sphericalWorld: SphericalWorld;
    private playerController: FirstPersonController;
    private terrainGenerator: TerrainGenerator;
    private chunkManager: ChunkManager;
    private buildingSystem: BuildingSystem;
    private resourceSystem: ResourceSystem;
    private ui: ExplorationUI;
    
    // State
    private planet: OwnedPlanet;
    private isRunning = false;
    private animationId: number | null = null;
    
    private constructor() {
        this.clock = new THREE.Clock();
    }
    
    static getInstance(): PlanetExplorationGame {
        if (!PlanetExplorationGame.instance) {
            PlanetExplorationGame.instance = new PlanetExplorationGame();
        }
        return PlanetExplorationGame.instance;
    }
    
    /**
     * ゲームを開始
     */
    async start(planet: OwnedPlanet): Promise<void> {
        if (this.isRunning) {
            this.stop();
        }
        
        this.planet = planet;
        
        // UI作成
        this.createContainer();
        
        // Three.js初期化
        await this.initializeThreeJS();
        
        // ゲームシステム初期化
        await this.initializeSystems();
        
        // ゲーム開始
        this.isRunning = true;
        this.animate();
    }
    
    /**
     * ゲームを停止
     */
    stop(): void {
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // システムのクリーンアップ
        if (this.playerController) this.playerController.dispose();
        if (this.chunkManager) this.chunkManager.dispose();
        if (this.buildingSystem) this.buildingSystem.dispose();
        if (this.resourceSystem) this.resourceSystem.dispose();
        if (this.ui) this.ui.dispose();
        
        // Three.jsのクリーンアップ
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // コンテナ削除
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
    
    /**
     * コンテナを作成
     */
    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.id = 'planet-exploration-game';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 30000;
            background: #000;
        `;
        
        document.body.appendChild(this.container);
    }
    
    /**
     * Three.jsを初期化
     */
    private async initializeThreeJS(): Promise<void> {
        // シーン
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 2000);
        
        // カメラ
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        
        // レンダラー
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container!.appendChild(this.renderer.domElement);
        
        // ライティング
        this.setupLighting();
        
        // リサイズ対応
        window.addEventListener('resize', this.handleResize);
    }
    
    /**
     * ライティングを設定
     */
    private setupLighting(): void {
        // 太陽光
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(100, 200, 100);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -500;
        sunLight.shadow.camera.right = 500;
        sunLight.shadow.camera.top = 500;
        sunLight.shadow.camera.bottom = -500;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 1000;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
        
        // 環境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // 半球光
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x545454, 0.4);
        this.scene.add(hemiLight);
    }
    
    /**
     * ゲームシステムを初期化
     */
    private async initializeSystems(): Promise<void> {
        // 球面世界
        this.sphericalWorld = new SphericalWorld(this.planet);
        
        // 地形生成
        this.terrainGenerator = new TerrainGenerator(
            this.sphericalWorld,
            this.planet.type
        );
        
        // チャンク管理
        this.chunkManager = new ChunkManager(
            this.scene,
            this.sphericalWorld,
            this.terrainGenerator
        );
        
        // プレイヤーコントローラー
        this.playerController = new FirstPersonController(
            this.camera,
            this.renderer.domElement,
            this.sphericalWorld
        );
        
        // 初期位置に配置
        const spawnPosition = this.sphericalWorld.getSpawnPosition();
        this.playerController.setPosition(spawnPosition);
        
        // 建築システム
        this.buildingSystem = new BuildingSystem(
            this.scene,
            this.camera,
            this.sphericalWorld
        );
        
        // リソースシステム
        this.resourceSystem = new ResourceSystem(
            this.scene,
            this.sphericalWorld,
            this.chunkManager
        );
        
        // UI
        this.ui = new ExplorationUI(
            this.container!,
            this.playerController,
            this.buildingSystem,
            this.resourceSystem
        );
        
        // 初期チャンクを生成
        await this.chunkManager.initialize(spawnPosition);
        
        // チャンク生成後にリソースを配置
        const playerChunk = this.sphericalWorld.getChunkCoordinates(spawnPosition);
        const viewDistance = this.sphericalWorld.getSettings().viewDistance;
        
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dz = -viewDistance; dz <= viewDistance; dz++) {
                this.resourceSystem.generateResourcesForChunk(
                    playerChunk.x + dx,
                    playerChunk.z + dz
                );
            }
        }
    }
    
    /**
     * アニメーションループ
     */
    private animate = (): void => {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(this.animate);
        
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // システム更新
        this.playerController.update(deltaTime);
        this.chunkManager.update(this.playerController.getPosition());
        this.buildingSystem.update(deltaTime);
        this.resourceSystem.update(deltaTime);
        this.ui.update(deltaTime);
        
        // スカイボックス更新（昼夜サイクル）
        this.updateSkybox(elapsedTime);
        
        // レンダリング
        this.renderer.render(this.scene, this.camera);
    };
    
    /**
     * スカイボックスを更新
     */
    private updateSkybox(elapsedTime: number): void {
        // 簡易的な昼夜サイクル
        const dayDuration = 300; // 5分で1日
        const timeOfDay = (elapsedTime % dayDuration) / dayDuration;
        
        // 霧の色を時間に応じて変更
        const fogColor = new THREE.Color();
        if (timeOfDay < 0.25 || timeOfDay > 0.75) {
            // 夜
            fogColor.setHex(0x001133);
        } else {
            // 昼
            fogColor.setHex(0x87CEEB);
        }
        
        this.scene.fog = new THREE.Fog(fogColor, 100, 2000);
        this.renderer.setClearColor(fogColor);
    }
    
    /**
     * リサイズハンドラー
     */
    private handleResize = (): void => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
}