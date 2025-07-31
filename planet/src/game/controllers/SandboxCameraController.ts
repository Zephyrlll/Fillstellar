import * as BABYLON from '@babylonjs/core';

export class SandboxCameraController {
    private scene: BABYLON.Scene;
    private canvas: HTMLCanvasElement;
    private camera: BABYLON.UniversalCamera;
    private target: BABYLON.Mesh;
    
    // カメラ設定
    private distance: number = 10;
    private height: number = 5;
    private rotationSpeed: number = 0.005;
    private zoomSpeed: number = 1;
    private minDistance: number = 5;
    private maxDistance: number = 30;
    
    // カメラ状態
    private alpha: number = 0; // 水平回転
    private beta: number = 0.5; // 垂直回転
    private isPointerLocked: boolean = false;
    
    constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, target: BABYLON.Mesh) {
        this.scene = scene;
        this.canvas = canvas;
        this.target = target;
    }
    
    initialize(): void {
        console.log('[CAMERA] Initializing camera controller...');
        
        // カメラを作成
        this.camera = new BABYLON.UniversalCamera('camera', BABYLON.Vector3.Zero(), this.scene);
        this.camera.minZ = 0.1;
        this.camera.maxZ = 1000;
        this.camera.fov = 1.0472; // 60度
        
        // カメラをアクティブに
        this.scene.activeCamera = this.camera;
        this.camera.attachControl(this.canvas, false);
        
        // カメラの入力を無効化（自前で制御）
        this.camera.inputs.clear();
        
        // 入力設定
        this.setupInput();
        
        // 初期位置
        this.updateCameraPosition();
        
        console.log('[CAMERA] Camera controller initialized');
    }
    
    private setupInput(): void {
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
        document.addEventListener('mousemove', (event) => {
            if (!this.isPointerLocked) return;
            
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // 水平回転
            this.alpha -= movementX * this.rotationSpeed;
            
            // 垂直回転（制限付き）
            this.beta -= movementY * this.rotationSpeed;
            this.beta = Math.max(0.1, Math.min(1.5, this.beta)); // 約6度〜86度
        });
        
        // マウスホイール（ズーム）
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            
            const delta = Math.sign(event.deltaY) * this.zoomSpeed;
            this.distance += delta;
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        });
    }
    
    update(deltaTime: number): void {
        this.updateCameraPosition();
    }
    
    private updateCameraPosition(): void {
        if (!this.target) return;
        
        const targetPosition = this.target.position;
        
        // 球面座標からデカルト座標へ
        const x = targetPosition.x + this.distance * Math.sin(this.beta) * Math.sin(this.alpha);
        const y = targetPosition.y + this.height + this.distance * Math.cos(this.beta);
        const z = targetPosition.z + this.distance * Math.sin(this.beta) * Math.cos(this.alpha);
        
        // カメラ位置を設定
        this.camera.position.set(x, y, z);
        
        // ターゲットを見る
        this.camera.setTarget(targetPosition.add(new BABYLON.Vector3(0, 1, 0)));
    }
    
    setTarget(target: BABYLON.Mesh): void {
        this.target = target;
    }
    
    setDistance(distance: number): void {
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
    }
    
    getCamera(): BABYLON.UniversalCamera {
        return this.camera;
    }
    
    dispose(): void {
        this.camera.dispose();
        console.log('[CAMERA] Disposed');
    }
}