import * as BABYLON from '@babylonjs/core';
import { GravityController } from '../physics/GravityController';

/**
 * 惑星表面でのカメラ制御
 * 責任:
 * - 重力に応じたカメラの向き調整
 * - スムーズな追従
 * - 一人称/三人称の切り替え
 */
export class PlanetCameraController {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    private target: BABYLON.TransformNode;
    private gravityController: GravityController;
    
    // カメラモード
    private isFirstPerson: boolean = false;
    
    // 三人称カメラ設定
    private distance: number = 10;
    private height: number = 4;
    private minDistance: number = 3;
    private maxDistance: number = 20;
    private followSpeed: number = 0.15; // カメラ追従を少し速く
    private rotationSpeed: number = 0.003;
    
    // 一人称カメラ設定
    private firstPersonOffset: BABYLON.Vector3 = new BABYLON.Vector3(0, 1.6, 0);
    
    // マウス制御
    private isPointerLocked: boolean = false;
    private cameraAlpha: number = 0;
    private cameraBeta: number = Math.PI / 8;
    
    // スムージング
    private currentCameraPosition: BABYLON.Vector3;
    private currentUpVector: BABYLON.Vector3;
    
    constructor(
        scene: BABYLON.Scene,
        camera: BABYLON.UniversalCamera,
        canvas: HTMLCanvasElement,
        target: BABYLON.TransformNode,
        gravityController: GravityController
    ) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.target = target;
        this.gravityController = gravityController;
        
        this.currentCameraPosition = camera.position.clone();
        this.currentUpVector = BABYLON.Vector3.Up();
        
        this.setupControls();
        
        console.log('[PLANET_CAMERA] Initialized');
    }
    
    /**
     * コントロールのセットアップ
     */
    private setupControls(): void {
        // カメラのデフォルト制御を無効化
        this.camera.detachControl();
        
        // ポインターロック
        this.canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });
        
        // マウス移動
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.handleMouseMove(e.movementX, e.movementY);
            }
        });
        
        // マウスホイールでズーム
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e.deltaY);
        });
        
        // ESCでポインターロック解除
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isPointerLocked) {
                document.exitPointerLock();
            }
        });
    }
    
    /**
     * マウス移動の処理
     */
    private handleMouseMove(deltaX: number, deltaY: number): void {
        this.cameraAlpha += deltaX * this.rotationSpeed;
        this.cameraBeta += deltaY * this.rotationSpeed;
        
        // 垂直角度の制限
        this.cameraBeta = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraBeta));
    }
    
    /**
     * ズーム処理
     */
    private handleZoom(delta: number): void {
        if (!this.isFirstPerson) {
            this.distance += delta * 0.01;
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        }
    }
    
    /**
     * カメラ位置の更新
     */
    update(deltaTime: number): void {
        const targetPosition = this.target.position;
        const up = this.gravityController.getUpDirection(targetPosition);
        
        if (this.isFirstPerson) {
            this.updateFirstPerson(targetPosition, up);
        } else {
            this.updateThirdPerson(targetPosition, up);
        }
        
        // 上方向をスムーズに更新
        this.currentUpVector = BABYLON.Vector3.Lerp(
            this.currentUpVector,
            up,
            this.followSpeed * 2
        );
        this.camera.upVector = this.currentUpVector;
    }
    
    /**
     * 一人称視点の更新
     */
    private updateFirstPerson(targetPosition: BABYLON.Vector3, up: BABYLON.Vector3): void {
        // キャラクターの頭の位置
        const headPosition = targetPosition.add(
            up.scale(this.firstPersonOffset.y)
        );
        
        // カメラ位置を即座に更新
        this.camera.position = headPosition;
        
        // カメラの向きを計算
        const forward = this.calculateCameraForward(up);
        const lookAt = headPosition.add(forward);
        
        this.camera.setTarget(lookAt);
    }
    
    /**
     * 三人称視点の更新
     */
    private updateThirdPerson(targetPosition: BABYLON.Vector3, up: BABYLON.Vector3): void {
        // 球面座標系でのカメラオフセット
        const sinBeta = Math.sin(this.cameraBeta);
        const cosBeta = Math.cos(this.cameraBeta);
        const sinAlpha = Math.sin(this.cameraAlpha);
        const cosAlpha = Math.cos(this.cameraAlpha);
        
        // ローカル座標系での位置
        const localOffset = new BABYLON.Vector3(
            sinAlpha * cosBeta * this.distance,
            sinBeta * this.distance + this.height,
            cosAlpha * cosBeta * this.distance
        );
        
        // ワールド座標系に変換
        const forward = this.calculateCameraForward(up);
        const right = BABYLON.Vector3.Cross(up, forward);
        
        const worldOffset = right.scale(localOffset.x)
            .add(up.scale(localOffset.y))
            .add(forward.scale(-localOffset.z));
        
        // 目標位置
        const targetCameraPos = targetPosition.add(worldOffset);
        
        // スムーズに追従（デルタタイムを考慮）
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        const lerpFactor = 1 - Math.pow(1 - this.followSpeed, deltaTime * 60); // 60FPS基準
        this.currentCameraPosition = BABYLON.Vector3.Lerp(
            this.currentCameraPosition,
            targetCameraPos,
            lerpFactor
        );
        
        this.camera.position = this.currentCameraPosition;
        
        // ターゲットを見る
        const lookAtTarget = targetPosition.add(up.scale(this.height * 0.5));
        this.camera.setTarget(lookAtTarget);
    }
    
    /**
     * カメラの前方向を計算
     */
    private calculateCameraForward(up: BABYLON.Vector3): BABYLON.Vector3 {
        // 基準となる前方向（北向き）
        let forward = new BABYLON.Vector3(
            Math.sin(this.cameraAlpha),
            0,
            Math.cos(this.cameraAlpha)
        );
        
        // 接平面に投影
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        
        if (forward.length() < 0.001) {
            // フォールバック
            forward = new BABYLON.Vector3(1, 0, 0);
            forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        }
        
        return forward.normalize();
    }
    
    /**
     * ビューモードの切り替え
     */
    toggleViewMode(): void {
        this.isFirstPerson = !this.isFirstPerson;
        
        console.log('[PLANET_CAMERA] View mode:', this.isFirstPerson ? 'First Person' : 'Third Person');
        
        // カメラ位置を即座に更新
        if (this.isFirstPerson) {
            this.currentCameraPosition = this.target.position.add(
                this.gravityController.getUpDirection(this.target.position).scale(this.firstPersonOffset.y)
            );
        }
    }
    
    /**
     * カメラの向きをリセット
     */
    resetCamera(): void {
        this.cameraAlpha = 0;
        this.cameraBeta = Math.PI / 8;
        this.distance = 10;
        
        console.log('[PLANET_CAMERA] Camera reset');
    }
    
    /**
     * カメラの前方向を取得（キャラクター移動用）
     */
    getCameraForward(): BABYLON.Vector3 {
        const targetPos = this.target.position;
        const up = this.gravityController.getUpDirection(targetPos);
        
        return this.calculateCameraForward(up);
    }
    
    /**
     * カメラの右方向を取得（キャラクター移動用）
     */
    getCameraRight(): BABYLON.Vector3 {
        const forward = this.getCameraForward();
        const up = this.gravityController.getUpDirection(this.target.position);
        
        return BABYLON.Vector3.Cross(up, forward).normalize();
    }
    
    /**
     * カメラパラメータの取得
     */
    getCameraState(): {
        alpha: number;
        beta: number;
        distance: number;
        isFirstPerson: boolean;
    } {
        return {
            alpha: this.cameraAlpha,
            beta: this.cameraBeta,
            distance: this.distance,
            isFirstPerson: this.isFirstPerson
        };
    }
    
    /**
     * カメラパラメータの設定
     */
    setCameraState(state: {
        alpha?: number;
        beta?: number;
        distance?: number;
        isFirstPerson?: boolean;
    }): void {
        if (state.alpha !== undefined) this.cameraAlpha = state.alpha;
        if (state.beta !== undefined) this.cameraBeta = state.beta;
        if (state.distance !== undefined) {
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, state.distance));
        }
        if (state.isFirstPerson !== undefined) this.isFirstPerson = state.isFirstPerson;
    }
    
    /**
     * ターゲットの変更
     */
    setTarget(target: BABYLON.TransformNode): void {
        this.target = target;
        this.currentCameraPosition = this.camera.position.clone();
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        this.camera.attachControl();
        console.log('[PLANET_CAMERA] Disposed');
    }
}