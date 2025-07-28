/**
 * Camera Controller
 * WASDキーとマウスによるカメラ制御
 */

import * as THREE from 'three';

export class CameraController {
    private camera: THREE.Camera;
    private canvas: HTMLCanvasElement;
    private planetRadius: number;
    
    // 移動関連
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private moveUp = false;
    private moveDown = false;
    
    // 回転関連
    private isMouseDown = false;
    private mouseX = 0;
    private mouseY = 0;
    private targetRotationX = 0;
    private targetRotationY = 0;
    private rotationX = 0;
    private rotationY = 0;
    
    // 設定
    private moveSpeed = 5;
    private rotateSpeed = 0.002;
    private jumpForce = 10;
    private gravity = -20;
    private velocity = new THREE.Vector3();
    private isGrounded = true;
    private height = 2;
    
    // ベクトル（再利用）
    private moveVector = new THREE.Vector3();
    private rightVector = new THREE.Vector3();
    private forwardVector = new THREE.Vector3();
    
    constructor(camera: THREE.Camera, canvas: HTMLCanvasElement, planetRadius: number) {
        this.camera = camera;
        this.canvas = canvas;
        this.planetRadius = planetRadius;
        this.setupEventListeners();
        
        // 初期回転を設定
        this.rotationY = Math.PI;
        
        // カーソルスタイルを設定
        this.canvas.style.cursor = 'grab';
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // キーボードイベント
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        
        // マウスイベント
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        
        
        // タッチイベント（モバイル対応）
        this.canvas.addEventListener('touchstart', this.onTouchStart);
        document.addEventListener('touchmove', this.onTouchMove);
        document.addEventListener('touchend', this.onTouchEnd);
    }
    
    /**
     * キー押下
     */
    private onKeyDown = (event: KeyboardEvent): void => {
        switch (event.key.toLowerCase()) {
            case 'w': this.moveForward = true; break;
            case 's': this.moveBackward = true; break;
            case 'a': this.moveLeft = true; break;
            case 'd': this.moveRight = true; break;
            case ' ': // スペースキーでジャンプ
                if (this.isGrounded) {
                    this.velocity.y = this.jumpForce;
                    this.isGrounded = false;
                }
                break;
        }
    };
    
    /**
     * キー解放
     */
    private onKeyUp = (event: KeyboardEvent): void => {
        switch (event.key.toLowerCase()) {
            case 'w': this.moveForward = false; break;
            case 's': this.moveBackward = false; break;
            case 'a': this.moveLeft = false; break;
            case 'd': this.moveRight = false; break;
            case 'q': this.moveUp = false; break;
            case 'e': this.moveDown = false; break;
        }
    };
    
    /**
     * マウス押下
     */
    private onMouseDown = (event: MouseEvent): void => {
        this.isMouseDown = true;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        this.canvas.style.cursor = 'grabbing';
    };
    
    /**
     * マウス移動
     */
    private onMouseMove = (event: MouseEvent): void => {
        if (!this.isMouseDown) return;
        
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;
        
        this.targetRotationY -= deltaX * this.rotateSpeed;
        this.targetRotationX -= deltaY * this.rotateSpeed;
        
        // 垂直回転の制限
        this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
        
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    };
    
    /**
     * マウス解放
     */
    private onMouseUp = (): void => {
        this.isMouseDown = false;
        this.canvas.style.cursor = 'grab';
    };
    
    
    /**
     * タッチ開始
     */
    private onTouchStart = (event: TouchEvent): void => {
        if (event.touches.length === 1) {
            this.isMouseDown = true;
            this.mouseX = event.touches[0].clientX;
            this.mouseY = event.touches[0].clientY;
        }
    };
    
    /**
     * タッチ移動
     */
    private onTouchMove = (event: TouchEvent): void => {
        if (!this.isMouseDown || event.touches.length !== 1) return;
        
        const deltaX = event.touches[0].clientX - this.mouseX;
        const deltaY = event.touches[0].clientY - this.mouseY;
        
        this.targetRotationY -= deltaX * this.rotateSpeed;
        this.targetRotationX -= deltaY * this.rotateSpeed;
        
        this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
        
        this.mouseX = event.touches[0].clientX;
        this.mouseY = event.touches[0].clientY;
    };
    
    /**
     * タッチ終了
     */
    private onTouchEnd = (): void => {
        this.isMouseDown = false;
    };
    
    /**
     * 更新
     */
    update(deltaTime: number = 0.016): void {
        // 回転の補間
        this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;
        this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;
        
        // カメラの向きベクトルを計算
        this.forwardVector.set(
            Math.sin(this.rotationY) * Math.cos(this.rotationX),
            0,
            Math.cos(this.rotationY) * Math.cos(this.rotationX)
        ).normalize();
        
        this.rightVector.crossVectors(this.forwardVector, new THREE.Vector3(0, 1, 0)).normalize();
        
        // 移動ベクトルを計算（惑星表面に沿って）
        this.moveVector.set(0, 0, 0);
        
        if (this.moveForward) {
            this.moveVector.add(this.forwardVector);
        }
        if (this.moveBackward) {
            this.moveVector.sub(this.forwardVector);
        }
        if (this.moveLeft) {
            this.moveVector.sub(this.rightVector);
        }
        if (this.moveRight) {
            this.moveVector.add(this.rightVector);
        }
        
        // 水平移動を適用
        if (this.moveVector.length() > 0) {
            this.moveVector.normalize().multiplyScalar(this.moveSpeed);
            this.camera.position.add(this.moveVector);
        }
        
        // 重力と垂直速度を適用
        this.velocity.y += this.gravity * deltaTime;
        this.camera.position.y += this.velocity.y * deltaTime;
        
        // 惑星中心からの距離を計算
        const distanceFromCenter = this.camera.position.length();
        const targetDistance = this.planetRadius + this.height;
        
        // 地面との衝突判定
        if (distanceFromCenter <= targetDistance) {
            // カメラを惑星表面に配置
            this.camera.position.normalize().multiplyScalar(targetDistance);
            this.velocity.y = 0;
            this.isGrounded = true;
        }
        
        // カメラの向きを設定（前方を見る）
        const lookAtPoint = this.camera.position.clone().add(this.forwardVector.multiplyScalar(10));
        this.camera.lookAt(lookAtPoint);
        
        // カメラのアップベクトルを惑星の法線に合わせる
        const up = this.camera.position.clone().normalize();
        this.camera.up.copy(up);
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('touchend', this.onTouchEnd);
        
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
    }
}