import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { GravityController } from './GravityController';
import { StableSphericalMovement } from './StableSphericalMovement';

/**
 * 物理エンジンベースのキャラクター制御 V2
 * 安定した球面移動を実現
 */
export interface MovementInput {
    forward: number;    // -1 to 1
    strafe: number;     // -1 to 1
    jump: boolean;
    sprint: boolean;
}

export class PhysicsCharacterV2 {
    private scene: BABYLON.Scene;
    private character: BABYLON.Mesh;
    private gravityController: GravityController;
    private sphericalMovement: StableSphericalMovement;
    
    // 移動パラメータ
    private walkSpeed: number = 5.0;
    private runSpeed: number = 10.0;
    private jumpForce: number = 7.0;
    private rotationSpeed: number = 0.2; // スムーズな回転のため値を増加
    
    // 状態
    private isGrounded: boolean = true;
    private jumpVelocity: number = 0;
    private groundCheckDistance: number = 0.5;
    private currentVelocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private lastMoveVector: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    
    // コライダー設定
    private capsuleHeight: number = 1.8;
    private characterHeight: number = 1.8; // キャラクターの高さ（地面からの高さ）
    
    // イベントシステム
    private eventHandlers: Map<string, Function[]> = new Map();
    
    constructor(
        scene: BABYLON.Scene,
        character: BABYLON.Mesh,
        gravityController: GravityController,
        position: BABYLON.Vector3
    ) {
        this.scene = scene;
        this.character = character;
        this.gravityController = gravityController;
        
        // 球面移動システムを初期化
        this.sphericalMovement = new StableSphericalMovement(
            BABYLON.Vector3.Zero(), // 惑星中心
            gravityController.getPlanetRadius()
        );
        
        // キャラクターの初期位置を設定
        this.setPosition(position);
        
        // 重力コントローラーのイベントを監視
        this.gravityController.on('gravityUpdated', (data: any) => {
            this.alignToGravity();
        });
        
        console.log('[PHYSICS_CHARACTER_V2] Initialized at:', position);
        
        // デバッグ：初期の高さを確認
        const initialHeight = position.length() - gravityController.getPlanetRadius();
        console.log('[PHYSICS_CHARACTER_V2] Initial height above surface:', initialHeight);
    }
    
    /**
     * 移動入力を処理
     */
    handleMovementInput(input: MovementInput, cameraForward: BABYLON.Vector3, cameraRight: BABYLON.Vector3): void {
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        
        // 現在の上方向を取得
        const up = this.gravityController.getUpDirection(this.character.position);
        
        // カメラ方向を接平面に投影
        let forward = cameraForward.subtract(up.scale(BABYLON.Vector3.Dot(cameraForward, up)));
        let right = cameraRight.subtract(up.scale(BABYLON.Vector3.Dot(cameraRight, up)));
        
        if (forward.length() > 0.001) forward.normalize();
        if (right.length() > 0.001) right.normalize();
        
        // 移動ベクトルを計算
        const moveVector = forward.scale(input.forward).add(right.scale(input.strafe));
        if (moveVector.length() > 0.001) {
            moveVector.normalize();
            
            // 移動速度を決定
            const speed = input.sprint ? this.runSpeed : this.walkSpeed;
            const moveDistance = speed * deltaTime;
            
            // 安定した球面移動を実行
            const newPosition = this.sphericalMovement.moveOnSphere(
                this.character.position,
                moveVector,
                moveDistance
            );
            
            // 高さを調整（地面に沿わせる）
            if (this.isGrounded) {
                // 地面にいる場合は少し浮かせる
                this.character.position = this.sphericalMovement.adjustHeight(newPosition, 0.1);
            } else if (this.jumpVelocity !== 0) {
                // ジャンプ中の高さを考慮
                const currentHeight = this.character.position.length() - this.gravityController.getPlanetRadius();
                const newHeight = currentHeight + this.jumpVelocity * deltaTime;
                this.character.position = this.sphericalMovement.adjustHeight(newPosition, newHeight);
            } else {
                this.character.position = newPosition;
            }
            
            // キャラクターの向きを更新
            this.rotateTowardsMovement(moveVector);
            
            // 現在の速度を記録
            this.currentVelocity = moveVector.scale(speed);
            this.lastMoveVector = moveVector.clone();
            
            // 移動イベントを発火
            this.emit('moved', { 
                position: this.character.position,
                velocity: this.currentVelocity,
                isRunning: input.sprint
            });
        } else {
            // 移動していない場合は速度をクリア
            this.currentVelocity = BABYLON.Vector3.Zero();
        }
        
        // ジャンプ処理
        if (input.jump && this.isGrounded) {
            this.jump();
        }
    }
    
    /**
     * ジャンプを実行
     */
    jump(): void {
        if (!this.isGrounded) return;
        
        this.jumpVelocity = this.jumpForce;
        this.isGrounded = false;
        
        console.log('[PHYSICS_CHARACTER_V2] Jump executed');
        this.emit('jumped', { force: this.jumpForce });
    }
    
    /**
     * 地面との接触判定
     */
    checkGrounded(): void {
        const position = this.character.position;
        const currentHeight = position.length() - this.gravityController.getPlanetRadius();
        
        const wasGrounded = this.isGrounded;
        
        // シンプルな高さベースの判定
        // キャラクターの足元の高さを考慮
        const footHeight = 0.1; // 足元の余裕
        this.isGrounded = currentHeight <= footHeight + this.groundCheckDistance;
        
        // 着地イベント
        if (!wasGrounded && this.isGrounded) {
            console.log('[PHYSICS_CHARACTER_V2] Landed');
            this.jumpVelocity = 0;
            
            // 地面の高さに調整（少し浮かせる）
            this.character.position = this.sphericalMovement.adjustHeight(
                this.character.position,
                0.1 // 地面から少し浮かせる
            );
            
            this.emit('landed', { position: position });
        }
    }
    
    /**
     * キャラクターの向きを重力に合わせて調整
     */
    alignToGravity(): void {
        const up = this.gravityController.getUpDirection(this.character.position);
        
        // 現在の前方向を取得（または初期値）
        let forward = this.character.forward || new BABYLON.Vector3(0, 0, 1);
        
        // 前方向を接平面に投影
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        if (forward.length() > 0.001) {
            forward.normalize();
        } else {
            // フォールバック
            forward = new BABYLON.Vector3(1, 0, 0);
            forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
            forward.normalize();
        }
        
        // 右方向を計算
        const right = BABYLON.Vector3.Cross(up, forward);
        
        // 回転行列を作成
        const rotMatrix = BABYLON.Matrix.Identity();
        rotMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
        rotMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
        rotMatrix.setRow(2, new BABYLON.Vector4(-forward.x, -forward.y, -forward.z, 0));
        
        // クォータニオンに変換して適用
        const targetRotation = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
        
        // スムーズに補間（より高い補間率でスムーズに）
        if (this.character.rotationQuaternion) {
            this.character.rotationQuaternion = BABYLON.Quaternion.Slerp(
                this.character.rotationQuaternion,
                targetRotation,
                Math.min(1.0, this.rotationSpeed * 2) // 補間を速くしてガクガクを軽減
            );
        } else {
            this.character.rotationQuaternion = targetRotation;
        }
    }
    
    /**
     * 移動方向に向かって回転
     */
    private rotateTowardsMovement(moveDirection: BABYLON.Vector3): void {
        if (moveDirection.length() < 0.001) return;
        
        const up = this.gravityController.getUpDirection(this.character.position);
        
        // 移動方向を前方向として使用
        let forward = moveDirection.clone();
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        forward.normalize();
        
        // 右方向を計算
        const right = BABYLON.Vector3.Cross(up, forward);
        
        // 回転行列を作成
        const rotMatrix = BABYLON.Matrix.Identity();
        rotMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
        rotMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
        rotMatrix.setRow(2, new BABYLON.Vector4(-forward.x, -forward.y, -forward.z, 0));
        
        const targetRotation = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
        
        // スムーズに補間
        if (this.character.rotationQuaternion) {
            this.character.rotationQuaternion = BABYLON.Quaternion.Slerp(
                this.character.rotationQuaternion,
                targetRotation,
                Math.min(1.0, this.rotationSpeed * 3) // 移動時はより速く回転
            );
        }
    }
    
    /**
     * フレーム更新
     */
    update(deltaTime: number): void {
        // 重力を更新
        this.gravityController.updatePhysicsGravity(this.character.position);
        
        // 地面判定
        this.checkGrounded();
        
        // 重力に合わせて回転を調整
        this.alignToGravity();
        
        // ジャンプ中の処理
        if (!this.isGrounded) {
            // 重力による減速
            this.jumpVelocity -= 9.8 * deltaTime;
            
            // 高さを更新
            const currentHeight = this.character.position.length() - this.gravityController.getPlanetRadius();
            const newHeight = Math.max(0.1, currentHeight + this.jumpVelocity * deltaTime); // 最低0.1の高さを維持
            
            this.character.position = this.sphericalMovement.adjustHeight(
                this.character.position,
                newHeight
            );
        }
        
        // デバッグ情報
        if (this.scene.getEngine().getFps() < 30) {
            const latLong = this.sphericalMovement.getLatLong(this.character.position);
            console.log('[PHYSICS_CHARACTER_V2] Position:', latLong);
        }
    }
    
    /**
     * イベントリスナーの登録
     */
    on(event: string, handler: Function): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
    }
    
    /**
     * イベントの発火
     */
    private emit(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }
    
    /**
     * 現在の状態を取得
     */
    getState(): {
        position: BABYLON.Vector3;
        velocity: BABYLON.Vector3;
        isGrounded: boolean;
        altitude: number;
        latLong: { latitude: number; longitude: number };
    } {
        const altitude = this.gravityController.getAltitude(this.character.position);
        const latLong = this.sphericalMovement.getLatLong(this.character.position);
        
        return {
            position: this.character.position.clone(),
            velocity: this.currentVelocity || BABYLON.Vector3.Zero(),
            isGrounded: this.isGrounded,
            altitude: altitude,
            latLong: latLong
        };
    }
    
    /**
     * 位置を強制的に設定（テレポートなど）
     */
    setPosition(position: BABYLON.Vector3): void {
        // 有効な位置かチェック
        if (!this.sphericalMovement.isValidPosition(position)) {
            console.warn('[PHYSICS_CHARACTER_V2] Invalid position, adjusting to valid range');
            // 赤道上の位置に調整
            const radius = position.length();
            position = new BABYLON.Vector3(0, 0, radius);
        }
        
        // 高さを調整（地面から少し浮かせる）
        const adjustedPosition = this.sphericalMovement.adjustHeight(position, 0.1);
        this.character.position = adjustedPosition;
        this.jumpVelocity = 0;
        this.isGrounded = true;
        
        // 重力方向を即座に更新
        this.alignToGravity();
        
        console.log('[PHYSICS_CHARACTER_V2] Position set to:', position);
    }
    
    /**
     * パラメータの更新
     */
    updateParameters(params: {
        walkSpeed?: number;
        runSpeed?: number;
        jumpForce?: number;
        rotationSpeed?: number;
    }): void {
        if (params.walkSpeed !== undefined) this.walkSpeed = params.walkSpeed;
        if (params.runSpeed !== undefined) this.runSpeed = params.runSpeed;
        if (params.jumpForce !== undefined) this.jumpForce = params.jumpForce;
        if (params.rotationSpeed !== undefined) this.rotationSpeed = params.rotationSpeed;
        
        console.log('[PHYSICS_CHARACTER_V2] Parameters updated:', params);
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        this.eventHandlers.clear();
        console.log('[PHYSICS_CHARACTER_V2] Disposed');
    }
}