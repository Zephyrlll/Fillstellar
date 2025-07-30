import * as BABYLON from '@babylonjs/core';
import { AnimatedAvatar } from './AnimatedAvatar';
import { GravityController } from './physics/GravityController';
import { PhysicsCharacter, MovementInput } from './physics/PhysicsCharacter';
import { PhysicsCharacterV2 } from './physics/PhysicsCharacterV2';
import { PlanetCameraController } from './camera/PlanetCameraController';
import { ProceduralTerrain } from './ProceduralTerrain';

/**
 * 新しいキャラクターコントローラー
 * 物理ベースのシンプルな実装
 */
export class CharacterControllerNew {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    
    // コンポーネント
    private avatar: AnimatedAvatar | null = null;
    private gravityController: GravityController | null = null;
    private physicsCharacter: PhysicsCharacter | PhysicsCharacterV2 | null = null;
    private cameraController: PlanetCameraController | null = null;
    private terrain: ProceduralTerrain | null = null;
    
    // V2を使用するかどうか
    private useV2Physics: boolean = true;
    
    // 入力状態
    private keys: { [key: string]: boolean } = {};
    
    // 初期化フラグ
    private isInitialized: boolean = false;
    
    constructor(scene: BABYLON.Scene, camera: BABYLON.UniversalCamera, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        
        this.setupControls();
        
        console.log('[CHARACTER_CONTROLLER_NEW] Created');
    }
    
    /**
     * 入力制御のセットアップ
     */
    private setupControls(): void {
        // キーボードイベント
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // 特殊キーの処理
            if (e.key === ' ') {
                e.preventDefault(); // スペースキーのデフォルト動作を防ぐ
            }
            
            // Vキーで視点切り替え
            if (e.key.toLowerCase() === 'v' && this.cameraController) {
                this.cameraController.toggleViewMode();
            }
            
            // Rキーでカメラリセット
            if (e.key.toLowerCase() === 'r' && this.cameraController) {
                this.cameraController.resetCamera();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    /**
     * 地形を設定
     */
    setTerrain(terrain: ProceduralTerrain): void {
        this.terrain = terrain;
        console.log('[CHARACTER_CONTROLLER_NEW] Terrain set');
    }
    
    /**
     * キャラクターをスポーン
     */
    async spawn(position: BABYLON.Vector3): Promise<void> {
        console.log('[CHARACTER_CONTROLLER_NEW] Spawning at:', position);
        
        // 物理エンジンが有効か確認
        if (!this.scene.getPhysicsEngine()) {
            console.error('[CHARACTER_CONTROLLER_NEW] Physics engine not enabled!');
            return;
        }
        
        // 既存のアバターを削除
        if (this.avatar) {
            this.avatar.dispose();
            this.avatar = null;
        }
        
        // アバターを作成
        this.avatar = new AnimatedAvatar(this.scene, position);
        
        // 重力コントローラーを作成
        const planetRadius = this.terrain?.getPlanetRadius() || 100;
        this.gravityController = new GravityController(
            this.scene,
            BABYLON.Vector3.Zero(), // 惑星中心
            planetRadius,
            9.81
        );
        
        // 物理キャラクターを作成（V2またはV1を選択）
        if (this.useV2Physics) {
            console.log('[CHARACTER_CONTROLLER_NEW] Using PhysicsCharacterV2 (stable spherical movement)');
            this.physicsCharacter = new PhysicsCharacterV2(
                this.scene,
                this.avatar.getRootMesh(),
                this.gravityController,
                position
            );
        } else {
            console.log('[CHARACTER_CONTROLLER_NEW] Using PhysicsCharacter V1');
            this.physicsCharacter = new PhysicsCharacter(
                this.scene,
                this.avatar.getRootMesh(),
                this.gravityController,
                position
            );
        }
        
        // カメラコントローラーを作成
        this.cameraController = new PlanetCameraController(
            this.scene,
            this.camera,
            this.canvas,
            this.avatar.getRootMesh(),
            this.gravityController
        );
        
        // 物理キャラクターのイベントを監視
        this.physicsCharacter.on('moved', (data: any) => {
            // アニメーション状態を更新
            if (this.avatar) {
                if (data.isRunning) {
                    this.avatar.setState('run', data.velocity.length());
                } else {
                    this.avatar.setState('walk', data.velocity.length());
                }
            }
        });
        
        this.physicsCharacter.on('jumped', () => {
            if (this.avatar) {
                this.avatar.setState('jump');
            }
        });
        
        this.physicsCharacter.on('landed', () => {
            if (this.avatar) {
                this.avatar.setState('land');
            }
        });
        
        this.isInitialized = true;
        
        console.log('[CHARACTER_CONTROLLER_NEW] Spawn complete');
    }
    
    /**
     * フレーム更新
     */
    update(deltaTime: number): void {
        if (!this.isInitialized || !this.physicsCharacter || !this.cameraController || !this.avatar) {
            // 初期化されていない場合は何もしない（エラーを防ぐ）
            return;
        }
        
        // 入力を処理
        const input: MovementInput = {
            forward: 0,
            strafe: 0,
            jump: this.keys[' '] || false,
            sprint: this.keys['shift'] || false
        };
        
        // WASD入力
        if (this.keys['w']) input.forward = 1;
        if (this.keys['s']) input.forward = -1;
        if (this.keys['a']) input.strafe = -1;
        if (this.keys['d']) input.strafe = 1;
        
        // 入力を正規化
        const inputLength = Math.sqrt(input.forward * input.forward + input.strafe * input.strafe);
        if (inputLength > 1) {
            input.forward /= inputLength;
            input.strafe /= inputLength;
        }
        
        // カメラ方向を取得
        const cameraForward = this.cameraController.getCameraForward();
        const cameraRight = this.cameraController.getCameraRight();
        
        // 物理キャラクターに入力を渡す
        this.physicsCharacter.handleMovementInput(input, cameraForward, cameraRight);
        
        // 各コンポーネントを更新
        this.physicsCharacter.update(deltaTime);
        this.cameraController.update(deltaTime);
        this.avatar.update(deltaTime);
        
        // アニメーション状態を更新
        const state = this.physicsCharacter.getState();
        if (state.velocity.length() < 0.1) {
            this.avatar.setState('idle');
        }
    }
    
    /**
     * 現在位置を取得
     */
    getPosition(): BABYLON.Vector3 {
        if (this.physicsCharacter) {
            return this.physicsCharacter.getState().position;
        }
        return BABYLON.Vector3.Zero();
    }
    
    /**
     * 位置を設定（テレポート）
     */
    setPosition(position: BABYLON.Vector3): void {
        if (this.physicsCharacter) {
            this.physicsCharacter.setPosition(position);
        }
    }
    
    /**
     * デバッグ表示の切り替え
     */
    setDebugEnabled(enabled: boolean): void {
        if (this.gravityController) {
            this.gravityController.setDebugEnabled(enabled);
        }
    }
    
    /**
     * キャラクターパラメータの更新
     */
    updateCharacterParameters(params: {
        walkSpeed?: number;
        runSpeed?: number;
        jumpForce?: number;
    }): void {
        if (this.physicsCharacter) {
            this.physicsCharacter.updateParameters(params);
        }
    }
    
    /**
     * カメラの状態を取得
     */
    getCameraState() {
        return this.cameraController?.getCameraState();
    }
    
    /**
     * 物理キャラクターを取得（デバッグ用）
     */
    getPhysicsCharacter() {
        return this.physicsCharacter;
    }
    
    /**
     * カメラの状態を設定
     */
    setCameraState(state: any): void {
        this.cameraController?.setCameraState(state);
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.avatar) {
            this.avatar.dispose();
        }
        if (this.physicsCharacter) {
            this.physicsCharacter.dispose();
        }
        if (this.cameraController) {
            this.cameraController.dispose();
        }
        
        this.isInitialized = false;
        
        console.log('[CHARACTER_CONTROLLER_NEW] Disposed');
    }
}