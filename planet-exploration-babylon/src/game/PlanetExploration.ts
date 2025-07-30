import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
// Havokのインポートを別の方法で試す
import HavokPhysics from '@babylonjs/havok';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { ProceduralTerrain } from './ProceduralTerrain';
import { CharacterController } from './CharacterController'; // 一時的に元に戻す
import { CharacterControllerNew } from './CharacterControllerNew';
import { ExplorationSystem } from './ExplorationSystem';
import { ResourceScanner } from './ResourceScanner';
import { AtmosphereEffects } from './AtmosphereEffects';
import { DebugTracker } from './DebugTracker';
import { SpaceSkybox } from './SpaceSkybox';
import { PlanetPhysics } from './physics/PlanetPhysics';
import { PlanetGridSystem } from './grid/PlanetGridSystem';

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
    private characterNew: CharacterControllerNew | null = null; // 新システム（テスト用）
    private exploration: ExplorationSystem;
    private scanner: ResourceScanner;
    private atmosphere: AtmosphereEffects;
    private spaceSkybox: SpaceSkybox;
    private planetPhysics: PlanetPhysics | null = null;
    private gridSystem: PlanetGridSystem | null = null;
    
    // 物理エンジン
    private havokInstance: any = null;
    private useNewSystem: boolean = false; // 一旦無効にして確認
    
    // UIアップデート用
    private frameCounter: number = 0;
    
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
        console.log('[BABYLON] useNewSystem:', this.useNewSystem);
        
        // シーン作成
        this.scene = new BABYLON.Scene(this.engine);
        console.log('[BABYLON] Scene created');
        
        // シーンの重力を無効化（物理エンジンで管理）
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
        
        // 旧システムを常に初期化
        this.character = new CharacterController(this.scene, this.camera, this.canvas);
        this.character.setTerrain(this.terrain);
        
        // 新システムも初期化（物理エンジンが有効な場合は常に準備）
        console.log('[BABYLON] Checking physics engine:', !!this.scene.getPhysicsEngine());
        if (this.scene.getPhysicsEngine()) {
            this.characterNew = new CharacterControllerNew(this.scene, this.camera, this.canvas);
            this.characterNew.setTerrain(this.terrain);
            console.log('[BABYLON] New character controller initialized (ready for switching)');
        } else {
            console.log('[BABYLON] New character controller NOT initialized - physics engine not available');
        }
        
        // テスト用オブジェクトは削除済み
        
        this.exploration = new ExplorationSystem(this.scene);
        this.scanner = new ResourceScanner(this.scene);
        this.atmosphere = new AtmosphereEffects(this.scene);
        this.spaceSkybox = new SpaceSkybox(this.scene);
        
        // スカイボックスを作成
        this.spaceSkybox.create();
        
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
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // 完全な黒（スカイボックスが背景になるため）
    }
    
    private async setupPhysics(): Promise<void> {
        console.log('[BABYLON] Setting up physics...');
        
        // 常に物理エンジンを初期化（後で切り替えられるように）
        try {
            console.log('[BABYLON] Loading Havok physics...');
            console.log('[BABYLON] HavokPhysics type:', typeof HavokPhysics);
            
            if (!HavokPhysics) {
                throw new Error('HavokPhysics module not loaded');
            }
            
            // WASMファイルのパスを指定してHavokを初期化
            const havokOptions = {
                locateFile: (path: string) => {
                    // publicディレクトリからWASMファイルを読み込む
                    if (path.endsWith('.wasm')) {
                        return `/HavokPhysics.wasm`;
                    }
                    return path;
                }
            };
            
            this.havokInstance = await HavokPhysics(havokOptions);
            console.log('[BABYLON] Havok instance created:', !!this.havokInstance);
            
            const havokPlugin = new HavokPlugin(true, this.havokInstance);
            console.log('[BABYLON] HavokPlugin created');
            
            this.scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), havokPlugin);
            console.log('[BABYLON] Physics engine enabled');
            
            // 重力は個別に管理するため、グローバル重力を無効化
            const physicsEngine = this.scene.getPhysicsEngine();
            if (physicsEngine) {
                physicsEngine.setGravity(new BABYLON.Vector3(0, 0, 0));
                console.log('[BABYLON] Gravity set to zero');
            }
            
            console.log('[BABYLON] Physics setup complete!');
        } catch (error) {
            console.error('[BABYLON] Failed to initialize physics:', error);
            console.error('[BABYLON] Error details:', {
                message: error.message,
                stack: error.stack
            });
            console.warn('[BABYLON] Continuing without physics engine');
            // 物理エンジンが失敗してもゲームは続行
        }
    }
    
    private update(): void {
        const deltaTime = this.engine.getDeltaTime() / 1000;
        const tracker = DebugTracker.getInstance();
        
        
        // 各システムの更新
        if (this.useNewSystem && this.characterNew) {
            this.characterNew.update(deltaTime);
            this.terrain.update(this.characterNew.getPosition());
        } else {
            this.character.update(deltaTime);
            this.terrain.update(this.character.getPosition());
        }
        
        this.exploration.update(deltaTime);
        this.scanner.update(deltaTime);
        this.atmosphere.update(deltaTime);
        this.spaceSkybox.update(deltaTime);
        
        // 位置情報をUIに更新（毎秒更新）
        const fps = this.engine.getFps();
        if (fps > 0 && this.scene.getAnimationRatio() > 0) {
            // フレームカウンターを使用（約1秒ごと）
            if (!this.frameCounter) this.frameCounter = 0;
            this.frameCounter++;
            
            if (this.frameCounter >= fps) {
                this.updatePositionUI();
                this.frameCounter = 0;
            }
        }
    }
    
    async start(planet: PlanetData): Promise<void> {
        console.log('[PLANET_EXPLORATION] Starting exploration for:', planet.name);
        console.log('[PLANET_EXPLORATION] Planet type:', planet.type);
        console.log('[PLANET_EXPLORATION] Planet radius:', planet.radius);
        
        // 惑星の特性に基づいて環境を設定
        this.terrain.generatePlanet(planet);
        this.atmosphere.setPlanetType(planet);
        
        // 物理エンジンが有効な場合、物理システムとグリッドシステムを初期化（切り替え用に準備）
        console.log('[PLANET_EXPLORATION] Checking physics before start:', !!this.scene.getPhysicsEngine());
        if (this.scene.getPhysicsEngine()) {
            this.planetPhysics = new PlanetPhysics(this.scene, BABYLON.Vector3.Zero(), planet.radius);
            
            // 惑星メッシュに物理を設定
            const planetMesh = this.terrain.getPlanetMesh();
            if (planetMesh) {
                console.log('[PLANET_EXPLORATION] Setting up planet physics for mesh:', planetMesh.name);
                this.planetPhysics.createPlanetPhysics(planetMesh, planet.radius, true);
            } else {
                console.warn('[PLANET_EXPLORATION] No planet mesh found for physics');
            }
            
            this.gridSystem = new PlanetGridSystem(this.scene, BABYLON.Vector3.Zero(), planet.radius);
            console.log('[PLANET_EXPLORATION] Physics and grid systems initialized (ready for use)');
        } else {
            console.log('[PLANET_EXPLORATION] Physics engine not available at start');
        }
        
        // キャラクターのterrainが確実に設定されていることを確認
        if (!this.character['terrain']) {
            console.warn('[PLANET_EXPLORATION] Character terrain not set, setting now');
            this.character.setTerrain(this.terrain);
        }
        
        // キャラクターを配置（即座に実行）
        const tracker = DebugTracker.getInstance();
        
        // setTimeout(() => {
            tracker.log('PLANET_EXPLORATION', 'Starting character spawn sequence');
            
            // テスト：惑星の半径に基づいてスポーン位置を計算
            const planetRadius = this.terrain.getPlanetRadius();
            const spawnHeight = planetRadius + 2; // 地表から2m上（アバターの高さを考慮）
            const fixedSpawnPoint = new BABYLON.Vector3(0, spawnHeight, 0); // Y軸上
            
            console.log('[PLANET_EXPLORATION] Spawn calculation:');
            console.log(`  - Planet radius: ${planetRadius}`);
            console.log(`  - Spawn height: ${spawnHeight}`);
            console.log(`  - Spawn point: ${fixedSpawnPoint} (distance: ${fixedSpawnPoint.length()})`);
            
            tracker.log('PLANET_EXPLORATION', `Using calculated spawn point: ${fixedSpawnPoint} (distance: ${fixedSpawnPoint.length()})`);
            tracker.log('PLANET_EXPLORATION', `Is spherical: ${this.terrain.isSpherical()}, radius: ${planetRadius}`);
            
            // spawn前の位置確認
            if (this.useNewSystem && this.characterNew) {
                console.log('[PLANET_EXPLORATION] Using NEW system for spawn');
                console.log('[PLANET_EXPLORATION] Avatar position BEFORE spawn:', this.characterNew.getPosition());
                
                // 新システムは非同期spawn
                await this.characterNew.spawn(fixedSpawnPoint);
                console.log('[PLANET_EXPLORATION] New system spawn complete');
            } else {
                console.log('[PLANET_EXPLORATION] Using OLD system for spawn');
                console.log('[PLANET_EXPLORATION] Avatar position BEFORE spawn:', this.character.getPosition());
                
                this.character.spawn(fixedSpawnPoint);
                
                // 新システムも準備しておく（切り替え時のため）
                if (this.characterNew) {
                    console.log('[PLANET_EXPLORATION] Preparing new system for future use...');
                    await this.characterNew.spawn(fixedSpawnPoint);
                    console.log('[PLANET_EXPLORATION] New system prepared');
                }
            }
            
            // spawn直後に複数回チェック
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const characterPos = this.useNewSystem && this.characterNew 
                        ? this.characterNew.getPosition() 
                        : this.character.getPosition();
                    console.log(`[PLANET_EXPLORATION] Position check ${i} after ${i*100}ms:`, characterPos, `distance: ${characterPos.length()}`);
                }, i * 100);
            }
            
            // カメラの初期位置をデバッグ
            console.log('[PLANET_EXPLORATION] Camera position after spawn:', this.camera.position);
        // }, 500); // 0.5秒後に実行
        
        // 探索システムを開始
        this.exploration.startExploration(planet);
        this.scanner.enable();
        
        // 初期のシステム状態をUIに反映
        const systemModeElement = document.getElementById('systemMode');
        if (systemModeElement) {
            systemModeElement.textContent = this.useNewSystem ? '新システム（物理）' : '旧システム';
            systemModeElement.style.color = this.useNewSystem ? '#FF5722' : '#4CAF50';
        }
        
        // デバッグ用：キーイベント
        window.addEventListener('keydown', (e) => {
            console.log('[PLANET_EXPLORATION] Key pressed:', e.key);
            
            if (e.key.toLowerCase() === 'g') {
                this.camera.position = new BABYLON.Vector3(0, 300, -400); // もっと遠くから見る
                this.camera.setTarget(BABYLON.Vector3.Zero());
                this.camera.upVector = BABYLON.Vector3.Up(); // カメラの上方向をリセット
                
                // キャラクターの現在位置をログ
                const charPos = this.useNewSystem && this.characterNew 
                    ? this.characterNew.getPosition() 
                    : this.character.getPosition();
                console.log('[PLANET_EXPLORATION] Debug camera view');
                console.log('[PLANET_EXPLORATION] Character position:', charPos);
                console.log('[PLANET_EXPLORATION] Character distance from center:', charPos.length());
                console.log('[PLANET_EXPLORATION] Current system:', this.useNewSystem ? 'NEW' : 'OLD');
                
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
            
            // Nキーで新旧システムを切り替え
            if (e.key.toLowerCase() === 'n') {
                console.log('[PLANET_EXPLORATION] N key detected');
                console.log('[PLANET_EXPLORATION] Physics engine:', !!this.scene.getPhysicsEngine());
                console.log('[PLANET_EXPLORATION] CharacterNew:', !!this.characterNew);
                
                // 物理エンジンと新システムが初期化されているか確認
                if (this.scene.getPhysicsEngine() && this.characterNew) {
                    this.useNewSystem = !this.useNewSystem;
                    console.log('[PLANET_EXPLORATION] System switched to:', this.useNewSystem ? 'NEW' : 'OLD');
                    
                    // UIを更新
                    const systemModeElement = document.getElementById('systemMode');
                    if (systemModeElement) {
                        systemModeElement.textContent = this.useNewSystem ? '新システム（物理）' : '旧システム';
                        systemModeElement.style.color = this.useNewSystem ? '#FF5722' : '#4CAF50';
                    }
                    
                    // 切り替え時に位置を同期
                    if (this.useNewSystem) {
                        const pos = this.character.getPosition();
                        // 新システムがまだspawnされていない場合は初回spawn
                        if (!this.characterNew['isInitialized']) {
                            console.log('[PLANET_EXPLORATION] New system not initialized, spawning...');
                            this.characterNew.spawn(pos).then(() => {
                                console.log('[PLANET_EXPLORATION] New system spawn complete');
                            });
                        } else {
                            this.characterNew.setPosition(pos);
                        }
                        console.log('[PLANET_EXPLORATION] Position synced to new system:', pos);
                    } else {
                        const pos = this.characterNew.getPosition();
                        this.character.setPosition(pos);
                        console.log('[PLANET_EXPLORATION] Position synced to old system:', pos);
                    }
                } else {
                    console.warn('[PLANET_EXPLORATION] Cannot switch systems:');
                    console.warn('[PLANET_EXPLORATION] - Physics engine:', !!this.scene.getPhysicsEngine());
                    console.warn('[PLANET_EXPLORATION] - CharacterNew:', !!this.characterNew);
                }
            }
            
            // Pキーでグリッドデバッグ表示（新システムのみ）
            if (e.key.toLowerCase() === 'p') {
                console.log('[PLANET_EXPLORATION] P key detected');
                console.log('[PLANET_EXPLORATION] GridSystem:', !!this.gridSystem);
                
                if (this.gridSystem) {
                    const currentDebug = (this.gridSystem as any).debugEnabled || false;
                    this.gridSystem.setDebugEnabled(!currentDebug);
                    console.log('[PLANET_EXPLORATION] Grid debug toggled to:', !currentDebug);
                } else {
                    console.log('[PLANET_EXPLORATION] GridSystem not initialized');
                }
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
    
    /**
     * 位置情報をUIに更新
     */
    private updatePositionUI(): void {
        const positionElement = document.getElementById('playerPosition');
        if (!positionElement) return;
        
        try {
            if (this.useNewSystem && this.characterNew) {
                const physicsChar = (this.characterNew as any).getPhysicsCharacter?.();
                if (physicsChar) {
                    const state = physicsChar.getState();
                    if (state && state.latLong) {
                        const lat = state.latLong.latitude.toFixed(1);
                        const lon = state.latLong.longitude.toFixed(1);
                        positionElement.textContent = `緯度: ${lat}°, 経度: ${lon}°`;
                        
                        // 制限エリア外の警告
                        if (Math.abs(state.latLong.latitude) > 70) {
                            positionElement.style.color = '#FF5722';
                            positionElement.textContent += ' (制限エリア付近)';
                        } else {
                            positionElement.style.color = 'inherit';
                        }
                    }
                }
            }
        } catch (error) {
            // エラーは無視
        }
    }
    
    dispose(): void {
        // システムのクリーンアップ
        if (this.character) this.character.dispose();
        if (this.characterNew) this.characterNew.dispose();
        if (this.planetPhysics) this.planetPhysics.dispose();
        if (this.gridSystem) this.gridSystem.dispose();
        if (this.terrain) this.terrain.dispose();
        if (this.exploration) this.exploration.dispose();
        if (this.scanner) this.scanner.dispose();
        if (this.atmosphere) this.atmosphere.dispose();
        if (this.spaceSkybox) this.spaceSkybox.dispose();
        
        this.scene.dispose();
        this.engine.dispose();
        
        console.log('[PLANET_EXPLORATION] Disposed');
    }
}