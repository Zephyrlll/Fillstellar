/**
 * First Person Controller
 * 球面世界での一人称視点コントローラー
 */

import * as THREE from 'three';
import { SphericalWorld } from '../core/SphericalWorld.js';
import { AvatarController } from './AvatarController.js';

export class FirstPersonController {
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    private sphericalWorld: SphericalWorld;
    private avatarController: AvatarController | null = null;
    
    // 位置と向き
    private position: THREE.Vector3;
    private velocity: THREE.Vector3;
    private yaw = 0; // 水平回転
    private pitch = 0; // 垂直回転
    
    // 移動フラグ
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private isJumping = false;
    
    // マウス制御
    private isPointerLocked = false;
    private mouseSensitivity = 0.003;  // より高感度に
    
    // 物理パラメータ（マインクラフト風に調整）
    private moveSpeed = 4.3;  // 通常歩行速度
    private runSpeed = 5.6;   // 走る速度
    private jumpForce = 6.5;  // ジャンプ力
    private isRunning = false;
    private isGrounded = true;
    private playerHeight = 1.8;  // プレイヤーの目線の高さ（スティーブの高さ）
    
    // 衝突検出
    private raycaster: THREE.Raycaster;
    private groundCheckDistance = 2.5;
    
    constructor(
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement,
        sphericalWorld: SphericalWorld,
        scene?: THREE.Scene
    ) {
        this.camera = camera;
        this.canvas = canvas;
        this.sphericalWorld = sphericalWorld;
        
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        
        // シーンが提供されている場合はアバターコントローラーを作成
        if (scene) {
            this.avatarController = new AvatarController(scene, sphericalWorld);
        }
        
        this.setupEventListeners();
        this.setupPointerLock();
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // キーボード
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        
        // マウス
        document.addEventListener('mousemove', this.onMouseMove);
        
        // ポインターロック
        this.canvas.addEventListener('click', this.requestPointerLock);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        document.addEventListener('pointerlockerror', this.onPointerLockError);
    }
    
    /**
     * ポインターロックを設定
     */
    private setupPointerLock(): void {
        // ポインターロックの説明を表示
        const instructions = document.createElement('div');
        instructions.id = 'pointer-lock-instructions';
        instructions.innerHTML = `
            <h2>クリックして開始</h2>
            <p>WASD - 移動 | マウス - 視点移動 | SPACE - ジャンプ | SHIFT - 走る | ESC - メニュー</p>
        `;
        instructions.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: white;
            font-family: Arial, sans-serif;
            background: rgba(0, 0, 0, 0.7);
            padding: 30px;
            border-radius: 10px;
            pointer-events: none;
            transition: opacity 0.3s;
        `;
        this.canvas.parentElement?.appendChild(instructions);
    }
    
    /**
     * ポインターロックをリクエスト
     */
    private requestPointerLock = (): void => {
        this.canvas.requestPointerLock();
    };
    
    /**
     * ポインターロック変更時
     */
    private onPointerLockChange = (): void => {
        this.isPointerLocked = document.pointerLockElement === this.canvas;
        
        const instructions = document.getElementById('pointer-lock-instructions');
        if (instructions) {
            instructions.style.opacity = this.isPointerLocked ? '0' : '1';
        }
    };
    
    /**
     * ポインターロックエラー時
     */
    private onPointerLockError = (): void => {
        console.error('[PLAYER] Pointer lock error');
    };
    
    /**
     * キー押下
     */
    private onKeyDown = (event: KeyboardEvent): void => {
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space':
                if (this.isGrounded) {
                    this.isJumping = true;
                }
                event.preventDefault();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = true;
                break;
        }
    };
    
    /**
     * キー解放
     */
    private onKeyUp = (event: KeyboardEvent): void => {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = false;
                break;
        }
    };
    
    /**
     * マウス移動
     */
    private onMouseMove = (event: MouseEvent): void => {
        if (!this.isPointerLocked) return;
        
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // ヨー（水平回転）
        this.yaw -= movementX * this.mouseSensitivity;
        
        // ピッチ（垂直回転）
        this.pitch -= movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    };
    
    /**
     * 位置を設定
     */
    async setPosition(position: THREE.Vector3): Promise<void> {
        this.position.copy(position);
        this.camera.position.copy(position);
        
        // 初期向きを設定（北向き）
        const up = this.sphericalWorld.getUpVector(position);
        const forward = this.sphericalWorld.getForwardVector(position);
        
        // カメラの向きを計算
        this.camera.up.copy(up);
        const lookAt = position.clone().add(forward);
        this.camera.lookAt(lookAt);
        
        // アバターコントローラーがある場合は初期化
        if (this.avatarController) {
            await this.avatarController.initialize(position);
            // FPSモードではアバターを非表示
            this.avatarController.setVisible(false);
        }
    }
    
    /**
     * 現在位置を取得
     */
    getPosition(): THREE.Vector3 {
        return this.position.clone();
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        if (!this.isPointerLocked) return;
        
        // 現在位置の座標系を取得
        const up = this.sphericalWorld.getUpVector(this.position);
        const forward = this.sphericalWorld.getForwardVector(this.position);
        const right = this.sphericalWorld.getRightVector(this.position);
        
        // カメラの向きを計算（ヨーとピッチを適用）
        const quaternion = new THREE.Quaternion();
        
        // ヨー回転（上方向軸周り）
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, this.yaw);
        
        // ピッチ回転（右方向軸周り）
        const pitchAxis = right.clone().applyQuaternion(yawQuat);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(pitchAxis, this.pitch);
        
        quaternion.multiplyQuaternions(yawQuat, pitchQuat);
        
        // 視線方向を計算
        const viewForward = forward.clone().applyQuaternion(quaternion);
        const viewRight = right.clone().applyQuaternion(quaternion);
        
        // 移動方向を計算（地面に平行）
        const moveForwardDir = viewForward.clone().sub(up.clone().multiplyScalar(viewForward.dot(up))).normalize();
        const moveRightDir = viewRight.clone().sub(up.clone().multiplyScalar(viewRight.dot(up))).normalize();
        
        // 移動速度
        const currentSpeed = this.isRunning ? this.runSpeed : this.moveSpeed;
        
        // 移動ベクトルを計算
        const moveVector = new THREE.Vector3();
        
        if (this.moveForward) moveVector.add(moveForwardDir);
        if (this.moveBackward) moveVector.sub(moveForwardDir);
        if (this.moveRight) moveVector.add(moveRightDir);
        if (this.moveLeft) moveVector.sub(moveRightDir);
        
        if (moveVector.length() > 0) {
            moveVector.normalize().multiplyScalar(currentSpeed * deltaTime);
        }
        
        // ジャンプ処理（マインクラフト風）
        if (this.isJumping && this.isGrounded) {
            // 瞬間的な上向きの速度を与える
            this.velocity.copy(up.clone().multiplyScalar(this.jumpForce));
            this.isGrounded = false;
            this.isJumping = false;
        }
        
        // 重力を適用
        const gravity = this.sphericalWorld.getGravity();
        this.velocity.add(up.clone().multiplyScalar(-gravity * deltaTime));
        
        // 速度を位置に適用
        this.position.add(moveVector);
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // 地面との衝突判定
        this.checkGroundCollision();
        
        // カメラの位置と向きを更新
        this.camera.position.copy(this.position);
        this.camera.up.copy(up);
        
        const lookAtTarget = this.position.clone().add(viewForward);
        this.camera.lookAt(lookAtTarget);
        
        // アバターコントローラーを更新
        if (this.avatarController) {
            // アバターの位置を更新
            this.avatarController.setPosition(this.position);
            
            // 移動状態を更新
            const movementDirection = new THREE.Vector3();
            if (this.moveForward) movementDirection.add(moveForwardDir);
            if (this.moveBackward) movementDirection.sub(moveForwardDir);
            if (this.moveRight) movementDirection.add(moveRightDir);
            if (this.moveLeft) movementDirection.sub(moveRightDir);
            
            this.avatarController.setMovementDirection(movementDirection, this.isRunning);
            
            // ジャンプ状態を更新
            if (this.isJumping) {
                this.avatarController.jump();
            }
            
            // アバターの状態を更新
            this.avatarController.updateState({
                position: this.position,
                velocity: this.velocity,
                isGrounded: this.isGrounded,
                isJumping: this.isJumping
            });
            
            // アバターを更新
            this.avatarController.update(deltaTime);
        }
    }
    
    /**
     * 地面との衝突判定
     */
    private checkGroundCollision(): void {
        // 球面座標を取得
        const coords = this.sphericalWorld.cartesianToSpherical(this.position);
        
        // 目標高度（地表 + プレイヤーの高さ）
        const targetAltitude = this.playerHeight;
        
        if (coords.altitude <= targetAltitude) {
            // 地面に接触
            this.position.copy(
                this.sphericalWorld.sphericalToCartesian(coords.lat, coords.lon, targetAltitude)
            );
            
            // 垂直速度をリセット
            const up = this.sphericalWorld.getUpVector(this.position);
            const verticalSpeed = this.velocity.dot(up);
            if (verticalSpeed < 0) {
                this.velocity.sub(up.clone().multiplyScalar(verticalSpeed));
            }
            
            this.isGrounded = true;
        } else if (coords.altitude > targetAltitude + 0.1) {
            this.isGrounded = false;
        }
    }
    
    /**
     * アバターコントローラーを取得
     */
    getAvatarController(): AvatarController | null {
        return this.avatarController;
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.onPointerLockError);
        
        this.canvas.removeEventListener('click', this.requestPointerLock);
        
        // ポインターロックを解除
        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
        
        // 指示UIを削除
        const instructions = document.getElementById('pointer-lock-instructions');
        instructions?.remove();
        
        // アバターコントローラーをクリーンアップ
        if (this.avatarController) {
            this.avatarController.dispose();
            this.avatarController = null;
        }
    }
}