import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import { ProceduralTerrain } from './ProceduralTerrain';
import { CharacterController } from './CharacterController';
import { ExplorationSystem } from './ExplorationSystem';
import { ResourceScanner } from './ResourceScanner';
import { AtmosphereEffects } from './AtmosphereEffects';
import { DebugTracker } from './DebugTracker';
import { DirectSpawnTest } from './DirectSpawnTest';

export interface PlanetData {
    id: string;
    name: string;
    type: 'forest' | 'desert' | 'ocean' | 'ice' | 'volcanic' | 'alien';
    radius: number;
    atmosphere?: {
        density: number;
        color: BABYLON.Color3;
        hasStorms: boolean;
    };
}

export class PlanetExploration {
    private canvas: HTMLCanvasElement;
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    
    // ゲームシステム
    private terrain: ProceduralTerrain;
    private character: CharacterController;
    private exploration: ExplorationSystem;
    private scanner: ResourceScanner;
    private atmosphere: AtmosphereEffects;
    
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
        console.log('[BABYLON] Initializing PlanetExploration...');
        
        // シーン作成
        this.scene = new BABYLON.Scene(this.engine);
        console.log('[BABYLON] Scene created');
        
        // シーンの重力を無効化（念のため）
        this.scene.gravity = new BABYLON.Vector3(0, 0, 0);
        this.scene.collisionsEnabled = false;
        console.log('[BABYLON] Scene gravity disabled');
        
        // カメラ設定（三人称視点）
        this.camera = new BABYLON.UniversalCamera(
            'camera',
            new BABYLON.Vector3(0, 150, -200), // 初期位置を遠くに
            this.scene
        );
        this.camera.fov = 1.0472; // 60度
        this.camera.minZ = 0.1;
        this.camera.maxZ = 2000; // 遠景まで見える
        this.camera.setTarget(new BABYLON.Vector3(0, 100, 0)); // 少し上を見る
        
        // カメラの親がいないことを確認
        this.camera.parent = null;
        console.log('[BABYLON] Camera created');
        console.log('[BABYLON] Camera position:', this.camera.position);
        console.log('[BABYLON] Camera target:', this.camera.getTarget());
        
        // ポストプロセス効果
        this.setupPostProcessing();
        
        // ライティング
        this.setupLighting();
        
        // 物理エンジン
        await this.setupPhysics();
        
        // 各システムを初期化
        this.terrain = new ProceduralTerrain(this.scene);
        this.character = new CharacterController(this.scene, this.camera, this.canvas);
        this.character.setTerrain(this.terrain); // terrainを設定
        
        // デバッグ：即座にダミーアバターを作成
        const dummyAvatar = BABYLON.MeshBuilder.CreateBox("dummyAvatar", { size: 5 }, this.scene);
        dummyAvatar.position = new BABYLON.Vector3(0, 120, 0);
        const dummyMat = new BABYLON.StandardMaterial("dummyMat", this.scene);
        dummyMat.emissiveColor = new BABYLON.Color3(1, 0, 1); // マゼンタ
        dummyAvatar.material = dummyMat;
        console.log('[PLANET_EXPLORATION] Dummy avatar created at:', dummyAvatar.position);
        
        this.exploration = new ExplorationSystem(this.scene);
        this.scanner = new ResourceScanner(this.scene);
        this.atmosphere = new AtmosphereEffects(this.scene);
        
        // デバッグ用のインスペクター（一時的に無効化）
        // if (import.meta.env.DEV) {
        //     // F1キーでデバッグレイヤーを表示
        //     window.addEventListener('keydown', (e) => {
        //         if (e.key === 'F1') {
        //             if (this.scene.debugLayer.isVisible()) {
        //                 this.scene.debugLayer.hide();
        //             } else {
        //                 this.scene.debugLayer.show();
        //             }
        //         }
        //     });
        // }
        
        // カスタムレンダリングループ
        let frameCount = 0;
        this.engine.runRenderLoop(() => {
            frameCount++;
            
            // 最初の10フレームで位置を確認
            if (frameCount <= 10) {
                if (!this.character) {
                    console.log(`[RENDER_LOOP] Frame ${frameCount}: Character is null`);
                } else {
                    const pos = this.character.getPosition();
                    console.log(`[RENDER_LOOP] Frame ${frameCount}: Character position: ${pos} (distance: ${pos.length()})`);
                }
            }
            
            this.update();
            this.scene.render();
        });
        
        console.log('[BABYLON] Initialization complete');
        
        // デバッグ: シーンの設定を確認
        console.log('[BABYLON] Scene debug info:', {
            gravity: this.scene.gravity,
            collisionsEnabled: this.scene.collisionsEnabled,
            meshes: this.scene.meshes.length,
            activeCameras: this.scene.activeCameras.length
        });
    }
    
    private setupPostProcessing(): void {
        // 後で実装（パフォーマンスのため一旦無効化）
        console.log('[BABYLON] Post processing will be implemented later');
    }
    
    private setupLighting(): void {
        // 惑星の太陽
        const sunLight = new BABYLON.DirectionalLight(
            'sunLight',
            new BABYLON.Vector3(-0.5, -1, 0.5),
            this.scene
        );
        sunLight.intensity = 2;
        sunLight.shadowEnabled = true;
        
        // シャドウマップの設定（後で有効化）
        // const shadowGenerator = new BABYLON.ShadowGenerator(2048, sunLight);
        // shadowGenerator.useBlurExponentialShadowMap = true;
        // shadowGenerator.blurKernel = 32;
        // shadowGenerator.setDarkness(0.3);
        
        // 環境光（宇宙からの反射光）
        const ambientLight = new BABYLON.HemisphericLight(
            'ambientLight',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.3;
        ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        ambientLight.specular = new BABYLON.Color3(0, 0, 0);
        
        // 環境色を設定（HDRテクスチャの代わり）
        this.scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.4);
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1); // 暗い宇宙の背景
    }
    
    private async setupPhysics(): Promise<void> {
        // 物理エンジンを一時的に無効化（後で実装）
        console.log('[BABYLON] Physics will be implemented later');
    }
    
    private update(): void {
        const deltaTime = this.engine.getDeltaTime() / 1000;
        const tracker = DebugTracker.getInstance();
        
        
        // 各システムの更新
        this.character.update(deltaTime);
        this.terrain.update(this.character.getPosition());
        this.exploration.update(deltaTime);
        this.scanner.update(deltaTime);
        this.atmosphere.update(deltaTime);
    }
    
    start(planet: PlanetData): void {
        console.log('[PLANET_EXPLORATION] Starting exploration for:', planet.name);
        console.log('[PLANET_EXPLORATION] Planet type:', planet.type);
        console.log('[PLANET_EXPLORATION] Planet radius:', planet.radius);
        
        // 惑星の特性に基づいて環境を設定
        this.terrain.generatePlanet(planet);
        this.atmosphere.setPlanetType(planet);
        
        // キャラクターを配置（即座に実行）
        const tracker = DebugTracker.getInstance();
        
        // setTimeout(() => {
            tracker.log('PLANET_EXPLORATION', 'Starting character spawn sequence');
            
            // テスト：固定位置にスポーン
            const fixedSpawnPoint = new BABYLON.Vector3(0, 120, 0); // Y軸上、半径120
            tracker.log('PLANET_EXPLORATION', `Using FIXED spawn point: ${fixedSpawnPoint} (distance: ${fixedSpawnPoint.length()})`);
            tracker.log('PLANET_EXPLORATION', `Is spherical: ${this.terrain.isSpherical()}, radius: ${this.terrain.getPlanetRadius()}`);
            
            // spawn前の位置確認
            console.log('[PLANET_EXPLORATION] Avatar position BEFORE spawn:', this.character.getPosition());
            
            // 直接スポーンテスト
            DirectSpawnTest.test(this.scene, fixedSpawnPoint);
            
            this.character.spawn(fixedSpawnPoint);
            
            // spawn直後に複数回チェック
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const characterPos = this.character.getPosition();
                    console.log(`[PLANET_EXPLORATION] Position check ${i} after ${i*100}ms:`, characterPos, `distance: ${characterPos.length()}`);
                }, i * 100);
            }
            
            // カメラの初期位置をデバッグ
            console.log('[PLANET_EXPLORATION] Camera position after spawn:', this.camera.position);
        // }, 500); // 0.5秒後に実行
        
        // 探索システムを開始
        this.exploration.startExploration(planet);
        this.scanner.enable();
        
        // デバッグ用：Gキーで惑星全体を見渡せるようにカメラを移動
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'g') {
                this.camera.position = new BABYLON.Vector3(0, 300, -400); // もっと遠くから見る
                this.camera.setTarget(BABYLON.Vector3.Zero());
                this.camera.upVector = BABYLON.Vector3.Up(); // カメラの上方向をリセット
                
                // キャラクターの現在位置をログ
                const charPos = this.character.getPosition();
                console.log('[PLANET_EXPLORATION] Debug camera view');
                console.log('[PLANET_EXPLORATION] Character position:', charPos);
                console.log('[PLANET_EXPLORATION] Character distance from center:', charPos.length());
                
                // 球体のメッシュ情報を取得
                this.scene.meshes.forEach(mesh => {
                    if (mesh.name === 'planet') {
                        const bounds = mesh.getBoundingInfo();
                        console.log('[PLANET_EXPLORATION] Planet mesh found:');
                        console.log('  - Position:', mesh.position);
                        console.log('  - Bounding radius:', bounds.boundingSphere.radius);
                        console.log('  - Min:', bounds.minimum);
                        console.log('  - Max:', bounds.maximum);
                    }
                });
                
                // デバッグサマリーを表示
                tracker.printSummary();
            }
        });
    }
    
    // メインアプリとの統合用API
    async exportProgress(): Promise<any> {
        return {
            playerPosition: this.character.getPosition(),
            discoveries: this.exploration.getDiscoveries(),
            resources: this.scanner.getScannedResources(),
            terrainModifications: this.terrain.getModifications()
        };
    }
    
    async importProgress(data: any): Promise<void> {
        if (data.playerPosition) {
            this.character.setPosition(data.playerPosition);
        }
        if (data.discoveries) {
            this.exploration.importDiscoveries(data.discoveries);
        }
        // 他のデータも同様にインポート
    }
    
    dispose(): void {
        this.scene.dispose();
        this.engine.dispose();
    }
}