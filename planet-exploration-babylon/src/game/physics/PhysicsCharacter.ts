import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Physics/physicsEngineComponent'; // Physics拡張をインポート
import { GravityController } from './GravityController';

/**
 * 物理エンジンベースのキャラクター制御
 * 責任:
 * - 物理的な移動制御
 * - ジャンプと地面判定
 * - 重力に合わせた回転
 */
export interface MovementInput {
    forward: number;    // -1 to 1
    strafe: number;     // -1 to 1
    jump: boolean;
    sprint: boolean;
}

export class PhysicsCharacter {
    private scene: BABYLON.Scene;
    private character: BABYLON.Mesh;
    private physicsAggregate: BABYLON.PhysicsAggregate | null = null;
    private physicsBody: BABYLON.PhysicsBody | null = null;
    private gravityController: GravityController;
    
    // 移動パラメータ
    private walkSpeed: number = 5.0;
    private runSpeed: number = 10.0;
    private jumpForce: number = 7.0;
    private rotationSpeed: number = 0.1;
    
    // 状態
    private isGrounded: boolean = false;
    private groundCheckDistance: number = 0.5; // より寛容な地面判定
    private currentVelocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    
    // コライダー設定
    private capsuleHeight: number = 1.8;
    private capsuleRadius: number = 0.4;
    
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
        
        // キャラクターの初期位置を設定
        this.character.position = position.clone();
        
        // 物理インポスターを設定
        this.setupPhysicsImpostor();
        
        // 重力コントローラーのイベントを監視
        this.gravityController.on('gravityUpdated', (data: any) => {
            this.alignToGravity();
        });
        
        console.log('[PHYSICS_CHARACTER] Initialized at:', position);
    }
    
    /**
     * 物理インポスターの設定（Physics V2 API使用）
     */
    private setupPhysicsImpostor(): void {
        // 物理エンジンが有効か確認
        const physicsEngine = this.scene.getPhysicsEngine();
        if (!physicsEngine) {
            console.warn('[PHYSICS_CHARACTER] Physics engine not initialized, skipping physics body creation');
            return;
        }
        
        try {
            // Physics V2 API: PhysicsAggregateを使用
            this.physicsAggregate = new BABYLON.PhysicsAggregate(
                this.character,
                BABYLON.PhysicsShapeType.CAPSULE,
                {
                    mass: 70, // 70kg
                    friction: 0.5,
                    restitution: 0.0
                },
                this.scene
            );
            
            // PhysicsBodyを取得
            this.physicsBody = this.physicsAggregate.body;
            
            // Havok特有の設定：回転を無効化
            this.physicsBody.disablePreStep = false;
            this.physicsBody.setMassProperties({ 
                inertia: BABYLON.Vector3.ZeroReadOnly 
            });
            
            // 初期位置を物理ボディに同期
            const currentPos = this.character.position.clone();
            this.physicsBody.setLinearVelocity(BABYLON.Vector3.Zero());
            this.physicsBody.setAngularVelocity(BABYLON.Vector3.Zero());
            
            // 重要：物理ボディの位置を明示的に設定
            this.physicsAggregate.transformNode.position = currentPos;
            
            console.log('[PHYSICS_CHARACTER] Physics body created with V2 API at position:', currentPos);
        } catch (error) {
            console.error('[PHYSICS_CHARACTER] Failed to create physics body:', error);
            // フォールバック：物理なしでの位置ベース移動を継続
        }
    }
    
    /**
     * 移動入力を処理
     */
    handleMovementInput(input: MovementInput, cameraForward: BABYLON.Vector3, cameraRight: BABYLON.Vector3): void {
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
            
            // 球面上での移動：回転として処理（地面にいる時も空中でも）
            const currentPos = this.character.position;
            const planetCenter = BABYLON.Vector3.Zero();
            const fromCenter = currentPos.subtract(planetCenter);
            const radius = fromCenter.length();
            
            // 移動方向に対する回転軸を計算
            const rotationAxis = BABYLON.Vector3.Cross(up, moveVector);
            if (rotationAxis.length() > 0.001) {
                rotationAxis.normalize();
                
                // 角速度を計算（ラジアン/秒）
                // 空中では速度を半減
                const effectiveSpeed = this.isGrounded ? speed : speed * 0.5;
                const angularSpeed = effectiveSpeed / radius;
                const angle = angularSpeed * this.scene.getEngine().getDeltaTime() / 1000;
                
                // 回転を適用
                const rotation = BABYLON.Quaternion.RotationAxis(rotationAxis, angle);
                const newFromCenter = fromCenter.applyRotationQuaternion(rotation);
                const newPosition = planetCenter.add(newFromCenter);
                
                if (this.physicsBody && this.physicsAggregate) {
                    // 物理ボディの位置を直接設定
                    this.physicsAggregate.transformNode.position = newPosition;
                    this.character.position = newPosition;
                    
                    // 速度を0にリセット（位置ベースの移動のため）
                    this.physicsBody.setLinearVelocity(BABYLON.Vector3.Zero());
                } else {
                    this.character.position = newPosition;
                }
            }
            
            // キャラクターの向きを更新
            this.rotateTowardsMovement(moveVector);
            
            // 移動イベントを発火
            this.emit('moved', { 
                position: this.character.position,
                velocity: moveVector.scale(speed),
                isRunning: input.sprint
            });
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
        
        const up = this.gravityController.getUpDirection(this.character.position);
        const jumpVelocity = up.scale(this.jumpForce);
        
        if (this.physicsBody) {
            // Physics V2 API: 現在の速度を取得してジャンプ力を追加
            const currentVel = this.physicsBody.getLinearVelocity();
            const newVelocity = currentVel.add(jumpVelocity);
            this.physicsBody.setLinearVelocity(newVelocity);
        } else {
            // フォールバック：物理なしでのジャンプ
            this.currentVelocity = this.currentVelocity.add(jumpVelocity);
        }
        
        this.isGrounded = false;
        
        console.log('[PHYSICS_CHARACTER] Jump executed');
        this.emit('jumped', { force: this.jumpForce });
    }
    
    /**
     * 地面との接触判定
     */
    checkGrounded(): void {
        const position = this.character.position;
        const down = this.gravityController.getGravityDirection(position);
        
        // レイキャストで地面を検出（少し上から開始）
        const rayStart = position.add(down.scale(-this.capsuleHeight * 0.4));
        const ray = new BABYLON.Ray(
            rayStart,
            down,
            this.capsuleHeight + this.groundCheckDistance
        );
        
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.character && mesh.isPickable && mesh.name === 'planet';
        });
        
        const wasGrounded = this.isGrounded;
        
        // 地面判定（惑星の半径も考慮）
        if (hit && hit.hit) {
            const distanceFromCenter = position.length();
            const planetRadius = this.gravityController.getPlanetRadius();
            const expectedDistance = planetRadius + this.capsuleHeight / 2;
            
            // 許容範囲内なら接地とみなす
            this.isGrounded = Math.abs(distanceFromCenter - expectedDistance) < this.groundCheckDistance * 2;
        } else {
            // レイキャストが失敗した場合は距離で判定
            const distanceFromCenter = position.length();
            const planetRadius = this.gravityController.getPlanetRadius();
            const expectedDistance = planetRadius + this.capsuleHeight / 2;
            
            this.isGrounded = Math.abs(distanceFromCenter - expectedDistance) < this.groundCheckDistance;
        }
        
        // 着地イベント
        if (!wasGrounded && this.isGrounded) {
            console.log('[PHYSICS_CHARACTER] Landed');
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
        
        // スムーズに補間
        if (this.character.rotationQuaternion) {
            this.character.rotationQuaternion = BABYLON.Quaternion.Slerp(
                this.character.rotationQuaternion,
                targetRotation,
                this.rotationSpeed
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
                this.rotationSpeed * 2 // 移動時は速く回転
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
        
        // ジャンプ処理（重力と高さ管理）
        if (!this.isGrounded) {
            // 落下処理
            const currentPos = this.character.position;
            const planetCenter = BABYLON.Vector3.Zero();
            const fromCenter = currentPos.subtract(planetCenter);
            const currentRadius = fromCenter.length();
            const targetRadius = this.gravityController.getPlanetRadius() + this.capsuleHeight / 2;
            
            // 重力による落下
            const fallSpeed = 9.8 * deltaTime;
            const newRadius = Math.max(targetRadius, currentRadius - fallSpeed);
            
            if (newRadius !== currentRadius) {
                const newPosition = fromCenter.normalize().scale(newRadius).add(planetCenter);
                
                if (this.physicsBody && this.physicsAggregate) {
                    this.physicsAggregate.transformNode.position = newPosition;
                    this.character.position = newPosition;
                } else {
                    this.character.position = newPosition;
                }
            }
        } else if (this.currentVelocity.length() > 0.1) {
            // ジャンプ中の上昇処理
            const currentPos = this.character.position;
            const planetCenter = BABYLON.Vector3.Zero();
            const fromCenter = currentPos.subtract(planetCenter);
            const currentRadius = fromCenter.length();
            
            // 上昇速度を適用
            const upSpeed = this.currentVelocity.length() * deltaTime;
            const newRadius = currentRadius + upSpeed;
            
            const newPosition = fromCenter.normalize().scale(newRadius).add(planetCenter);
            
            if (this.physicsBody && this.physicsAggregate) {
                this.physicsAggregate.transformNode.position = newPosition;
                this.character.position = newPosition;
            } else {
                this.character.position = newPosition;
            }
            
            // 速度を減衰
            this.currentVelocity = this.currentVelocity.scale(0.95);
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
    } {
        const velocity = this.physicsBody 
            ? this.physicsBody.getLinearVelocity().clone()
            : this.currentVelocity.clone();
        const altitude = this.gravityController.getAltitude(this.character.position);
        
        return {
            position: this.character.position.clone(),
            velocity: velocity,
            isGrounded: this.isGrounded,
            altitude: altitude
        };
    }
    
    /**
     * 位置を強制的に設定（テレポートなど）
     */
    setPosition(position: BABYLON.Vector3): void {
        this.character.position = position.clone();
        this.currentVelocity = BABYLON.Vector3.Zero();
        
        // 物理ボディの位置も更新
        if (this.physicsBody && this.physicsAggregate) {
            this.physicsBody.setLinearVelocity(BABYLON.Vector3.Zero());
            this.physicsBody.setAngularVelocity(BABYLON.Vector3.Zero());
            this.physicsAggregate.transformNode.position = position.clone();
        }
        
        // 重力方向を即座に更新
        this.alignToGravity();
        
        console.log('[PHYSICS_CHARACTER] Position set to:', position);
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
        
        console.log('[PHYSICS_CHARACTER] Parameters updated:', params);
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.physicsAggregate) {
            this.physicsAggregate.dispose();
            this.physicsAggregate = null;
            this.physicsBody = null;
        }
        this.eventHandlers.clear();
        
        console.log('[PHYSICS_CHARACTER] Disposed');
    }
}