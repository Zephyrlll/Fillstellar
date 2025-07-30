/**
 * Third Person Controller
 * 球面世界での三人称視点コントローラー
 */

import * as THREE from 'three';
import { SphericalWorld } from '../core/SphericalWorld.js';
import { AvatarController } from './AvatarController.js';

export interface ThirdPersonCameraConfig {
    distance: number;          // アバターからの距離
    height: number;           // アバターからの高さ
    lookAtHeight: number;     // 注視点の高さオフセット
    minDistance: number;      // 最小距離
    maxDistance: number;      // 最大距離
    collisionPadding: number; // 衝突判定の余白
}

export class ThirdPersonController {
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    private sphericalWorld: SphericalWorld;
    private avatarController: AvatarController;
    
    // カメラ設定
    private cameraConfig: ThirdPersonCameraConfig = {
        distance: 5,
        height: 2,
        lookAtHeight: 1.5,
        minDistance: 2,
        maxDistance: 10,
        collisionPadding: 0.5
    };
    
    // 位置と向き
    private position: THREE.Vector3;
    private velocity: THREE.Vector3;
    private yaw = 0;
    private pitch = 0;
    
    // カメラ制御
    private currentDistance: number;
    private targetDistance: number;
    private cameraCollisionRaycaster: THREE.Raycaster;
    
    // 移動フラグ
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private isJumping = false;
    
    // マウス制御
    private isPointerLocked = false;
    private mouseSensitivity = 0.002;
    private isMouseDown = false;
    private mouseX = 0;
    private mouseY = 0;
    
    // 物理パラメータ
    private moveSpeed = 10;
    private runSpeed = 20;
    private jumpForce = 8;
    private isRunning = false;
    private isGrounded = true;
    private playerHeight = 2;  // プレイヤーの目線の高さ
    
    constructor(
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement,
        sphericalWorld: SphericalWorld,
        scene: THREE.Scene
    ) {
        this.camera = camera;
        this.canvas = canvas;
        this.sphericalWorld = sphericalWorld;
        
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.cameraCollisionRaycaster = new THREE.Raycaster();
        
        this.currentDistance = this.cameraConfig.distance;
        this.targetDistance = this.cameraConfig.distance;
        
        // アバターコントローラーを作成
        this.avatarController = new AvatarController(scene, sphericalWorld);
        
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // キーボード
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        
        // マウス
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('mousemove', this.onMouseMove);
        
        // マウスホイール（ズーム）
        this.canvas.addEventListener('wheel', this.onWheel);
        
        // タッチ操作（モバイル対応）
        this.canvas.addEventListener('touchstart', this.onTouchStart);
        this.canvas.addEventListener('touchmove', this.onTouchMove);
        this.canvas.addEventListener('touchend', this.onTouchEnd);
    }
    
    /**
     * キー押下
     */
    private onKeyDown = (event: KeyboardEvent): void => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
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
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = false;
                break;
        }
    };
    
    /**
     * マウスボタン押下
     */
    private onMouseDown = (event: MouseEvent): void => {
        if (event.button === 0 || event.button === 2) { // 左クリックまたは右クリック
            this.isMouseDown = true;
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
            
            // 右クリックメニューを無効化
            if (event.button === 2) {
                event.preventDefault();
            }
        }
    };
    
    /**
     * マウスボタン解放
     */
    private onMouseUp = (): void => {
        this.isMouseDown = false;
    };
    
    /**
     * マウス移動
     */
    private onMouseMove = (event: MouseEvent): void => {
        if (!this.isMouseDown) return;
        
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;
        
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        
        // カメラの回転
        this.yaw -= deltaX * this.mouseSensitivity;
        this.pitch -= deltaY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    };
    
    /**
     * マウスホイール
     */
    private onWheel = (event: WheelEvent): void => {
        event.preventDefault();
        
        // ズームイン/アウト
        const zoomSpeed = 0.1;
        this.targetDistance += event.deltaY * zoomSpeed * 0.01;
        this.targetDistance = Math.max(
            this.cameraConfig.minDistance,
            Math.min(this.cameraConfig.maxDistance, this.targetDistance)
        );
    };
    
    /**
     * タッチ開始
     */
    private onTouchStart = (event: TouchEvent): void => {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.isMouseDown = true;
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
        }
    };
    
    /**
     * タッチ移動
     */
    private onTouchMove = (event: TouchEvent): void => {
        if (event.touches.length === 1 && this.isMouseDown) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.mouseX;
            const deltaY = touch.clientY - this.mouseY;
            
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
            
            // カメラの回転
            this.yaw -= deltaX * this.mouseSensitivity * 2;
            this.pitch -= deltaY * this.mouseSensitivity * 2;
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
        }
    };
    
    /**
     * タッチ終了
     */
    private onTouchEnd = (): void => {
        this.isMouseDown = false;
    };
    
    /**
     * 位置を設定
     */
    async setPosition(position: THREE.Vector3): Promise<void> {
        this.position.copy(position);
        
        // アバターを初期化
        await this.avatarController.initialize(position);
        this.avatarController.setVisible(true);
        
        // カメラ位置を更新
        this.updateCameraPosition();
    }
    
    /**
     * 現在位置を取得
     */
    getPosition(): THREE.Vector3 {
        return this.position.clone();
    }
    
    /**
     * アバターコントローラーを取得
     */
    getAvatarController(): AvatarController {
        return this.avatarController;
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        // 現在位置の座標系を取得
        const up = this.sphericalWorld.getUpVector(this.position);
        const forward = this.sphericalWorld.getForwardVector(this.position);
        const right = this.sphericalWorld.getRightVector(this.position);
        
        // カメラのヨー回転を適用した前方向と右方向
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, this.yaw);
        const cameraForward = forward.clone().applyQuaternion(yawQuat);
        const cameraRight = right.clone().applyQuaternion(yawQuat);
        
        // 移動方向を計算（地面に平行）
        const moveForwardDir = cameraForward.clone().sub(up.clone().multiplyScalar(cameraForward.dot(up))).normalize();
        const moveRightDir = cameraRight.clone().sub(up.clone().multiplyScalar(cameraRight.dot(up))).normalize();
        
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
        
        // ジャンプ処理
        if (this.isJumping && this.isGrounded) {
            this.velocity.copy(up.clone().multiplyScalar(this.jumpForce));
            this.isGrounded = false;
            this.isJumping = false;
            this.avatarController.jump();
        }
        
        // 重力を適用
        const gravity = this.sphericalWorld.getGravity();
        this.velocity.add(up.clone().multiplyScalar(-gravity * deltaTime));
        
        // 速度を位置に適用
        this.position.add(moveVector);
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // 地面との衝突判定
        this.checkGroundCollision();
        
        // アバターを更新
        this.avatarController.setPosition(this.position);
        this.avatarController.setMovementDirection(moveVector, this.isRunning);
        this.avatarController.updateState({
            position: this.position,
            velocity: this.velocity,
            isGrounded: this.isGrounded,
            isJumping: this.isJumping
        });
        this.avatarController.update(deltaTime);
        
        // カメラ距離を滑らかに補間
        this.currentDistance = THREE.MathUtils.lerp(
            this.currentDistance,
            this.targetDistance,
            10 * deltaTime
        );
        
        // カメラ位置を更新
        this.updateCameraPosition();
    }
    
    /**
     * カメラ位置を更新
     */
    private updateCameraPosition(): void {
        const up = this.sphericalWorld.getUpVector(this.position);
        const forward = this.sphericalWorld.getForwardVector(this.position);
        const right = this.sphericalWorld.getRightVector(this.position);
        
        // カメラの向きを計算
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, this.yaw);
        const pitchAxis = right.clone().applyQuaternion(yawQuat);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(pitchAxis, this.pitch);
        
        const cameraQuat = new THREE.Quaternion();
        cameraQuat.multiplyQuaternions(yawQuat, pitchQuat);
        
        // カメラ位置を計算（アバターの後方上方）
        const cameraOffset = forward.clone()
            .applyQuaternion(cameraQuat)
            .multiplyScalar(-this.currentDistance);
        
        const heightOffset = up.clone().multiplyScalar(this.cameraConfig.height);
        const targetCameraPos = this.position.clone()
            .add(cameraOffset)
            .add(heightOffset);
        
        // カメラの衝突検出
        const collisionDistance = this.checkCameraCollision(
            this.position.clone().add(heightOffset),
            targetCameraPos
        );
        
        if (collisionDistance < this.currentDistance) {
            // 壁に当たった場合はカメラを近づける
            const adjustedOffset = cameraOffset.normalize()
                .multiplyScalar(-collisionDistance);
            targetCameraPos.copy(this.position)
                .add(adjustedOffset)
                .add(heightOffset);
        }
        
        // カメラを配置（スムーズな移動）
        this.camera.position.lerp(targetCameraPos, 0.1);
        
        // カメラの上方向を固定（反転を防ぐ）
        const currentUp = this.camera.up.clone();
        const targetUp = up.clone();
        
        // 上方向の急激な変化を防ぐ
        if (currentUp.dot(targetUp) < 0.5) {
            this.camera.up.lerp(targetUp, 0.1);
        } else {
            this.camera.up.copy(targetUp);
        }
        
        // アバターの少し上を見る
        const lookAtHeight = up.clone().multiplyScalar(this.cameraConfig.lookAtHeight);
        const lookAtTarget = this.position.clone().add(lookAtHeight);
        this.camera.lookAt(lookAtTarget);
    }
    
    /**
     * カメラの衝突検出
     */
    private checkCameraCollision(origin: THREE.Vector3, target: THREE.Vector3): number {
        const direction = target.clone().sub(origin).normalize();
        const distance = origin.distanceTo(target);
        
        this.cameraCollisionRaycaster.set(origin, direction);
        this.cameraCollisionRaycaster.far = distance;
        
        // TODO: 地形メッシュとの衝突判定を実装
        // const intersects = this.cameraCollisionRaycaster.intersectObjects(terrainObjects);
        // if (intersects.length > 0) {
        //     return Math.max(0, intersects[0].distance - this.cameraConfig.collisionPadding);
        // }
        
        return distance;
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
     * カメラ設定を変更
     */
    setCameraConfig(config: Partial<ThirdPersonCameraConfig>): void {
        Object.assign(this.cameraConfig, config);
        this.targetDistance = Math.max(
            this.cameraConfig.minDistance,
            Math.min(this.cameraConfig.maxDistance, this.targetDistance)
        );
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        
        this.avatarController.dispose();
    }
}