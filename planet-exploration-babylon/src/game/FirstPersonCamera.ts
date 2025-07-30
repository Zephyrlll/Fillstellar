import * as BABYLON from '@babylonjs/core';

export class FirstPersonCamera {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    
    // マウス感度
    private mouseSensitivity: number = 0.002;
    private isPointerLocked: boolean = false;
    
    // カメラの向き
    private rotationX: number = 0;
    private rotationY: number = 0;
    
    constructor(scene: BABYLON.Scene, camera: BABYLON.UniversalCamera, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        
        this.setupControls();
    }
    
    private setupControls(): void {
        // カメラの基本設定を解除（手動制御のため）
        this.camera.detachControl();
        
        // マウスクリックでポインターロック
        this.canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
        });
        
        // ポインターロックの状態変更を監視
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });
        
        // マウス移動イベント
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.handleMouseMove(e);
            }
        });
    }
    
    private handleMouseMove(e: MouseEvent): void {
        // マウスの移動量に基づいてカメラを回転
        this.rotationY -= e.movementX * this.mouseSensitivity;
        this.rotationX -= e.movementY * this.mouseSensitivity;
        
        // 垂直角度の制限（上下90度まで）
        this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX));
    }
    
    public update(): void {
        // カメラの回転を適用
        this.camera.rotation.x = this.rotationX;
        this.camera.rotation.y = this.rotationY;
    }
    
    public getDirection(): BABYLON.Vector3 {
        // カメラの向いている方向を取得
        const forward = new BABYLON.Vector3(
            Math.sin(this.rotationY) * Math.cos(this.rotationX),
            Math.sin(this.rotationX),
            Math.cos(this.rotationY) * Math.cos(this.rotationX)
        );
        return forward.normalize();
    }
    
    public getRight(): BABYLON.Vector3 {
        // カメラの右方向を取得
        const forward = this.getDirection();
        return BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), forward).normalize();
    }
    
    public setRotation(rotationY: number): void {
        // 外部からY軸回転を設定（キャラクターの向きと同期用）
        this.rotationY = rotationY;
    }
    
    public getRotationY(): number {
        return this.rotationY;
    }
    
    public resetView(): void {
        this.rotationX = 0;
        this.rotationY = 0;
    }
}