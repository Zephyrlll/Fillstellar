import * as BABYLON from '@babylonjs/core';

export class SandboxCharacterController {
    private scene: BABYLON.Scene;
    private characterMesh: BABYLON.Mesh;
    
    // 移動パラメータ
    private walkSpeed: number = 8.0;
    private runSpeed: number = 15.0;
    private jumpForce: number = 10.0;
    private gravity: number = -20.0;
    
    // 状態
    private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private isGrounded: boolean = true;
    private groundHeight: number = 0;
    
    // 入力
    private keys: { [key: string]: boolean } = {};
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    async initialize(): Promise<void> {
        console.log('[CHARACTER] Initializing character controller...');
        
        // キャラクターメッシュを作成（カプセル形状）
        this.createCharacterMesh();
        
        // 入力設定
        this.setupInput();
        
        console.log('[CHARACTER] Character controller initialized');
    }
    
    private createCharacterMesh(): void {
        // カプセル形状のキャラクター
        const capsule = BABYLON.MeshBuilder.CreateCapsule('character', {
            height: 2,
            radius: 0.5,
            tessellation: 16,
            subdivisions: 1
        }, this.scene);
        
        // マテリアル
        const material = new BABYLON.StandardMaterial('characterMaterial', this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        capsule.material = material;
        
        // 初期位置
        capsule.position = new BABYLON.Vector3(0, 1, 0);
        
        // コリジョン設定
        capsule.checkCollisions = true;
        capsule.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
        
        this.characterMesh = capsule;
    }
    
    private setupInput(): void {
        // キーボード入力
        this.scene.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            this.keys[key] = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
        });
    }
    
    update(deltaTime: number): void {
        // 移動入力を処理
        this.handleMovement(deltaTime);
        
        // 物理演算
        this.applyPhysics(deltaTime);
        
        // 位置を更新
        this.updatePosition(deltaTime);
    }
    
    private handleMovement(deltaTime: number): void {
        if (!this.isGrounded) return;
        
        let moveX = 0;
        let moveZ = 0;
        
        // WASD入力
        if (this.keys['w']) moveZ = 1;
        if (this.keys['s']) moveZ = -1;
        if (this.keys['a']) moveX = -1;
        if (this.keys['d']) moveX = 1;
        
        // 移動ベクトルを正規化
        const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (moveLength > 0) {
            moveX /= moveLength;
            moveZ /= moveLength;
        } else {
            // 摩擦を適用
            this.velocity.x *= 0.85;
            this.velocity.z *= 0.85;
            return;
        }
        
        // 速度を決定
        const speed = this.keys['shift'] ? this.runSpeed : this.walkSpeed;
        
        // 世界座標での移動方向（カメラの向きに相対的）
        const forward = new BABYLON.Vector3(0, 0, speed);
        const right = new BABYLON.Vector3(speed, 0, 0);
        
        // 移動速度を設定
        this.velocity.x = moveX * right.x + moveZ * forward.x;
        this.velocity.z = moveX * right.z + moveZ * forward.z;
        
        // ジャンプ
        if (this.keys[' '] && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
        
        // キャラクターの向きを移動方向に向ける
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            this.characterMesh.rotation.y = BABYLON.Scalar.LerpAngle(
                this.characterMesh.rotation.y,
                targetRotation,
                0.1
            );
        }
    }
    
    private applyPhysics(deltaTime: number): void {
        // 重力を適用
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // 速度制限
        const maxVelocity = 50;
        if (this.velocity.length() > maxVelocity) {
            this.velocity.normalize().scaleInPlace(maxVelocity);
        }
    }
    
    private updatePosition(deltaTime: number): void {
        // 新しい位置を計算
        const movement = this.velocity.scale(deltaTime);
        const newPosition = this.characterMesh.position.add(movement);
        
        // 地面との衝突判定
        const characterHeight = 1.0; // カプセルの半分の高さ
        if (newPosition.y <= this.groundHeight + characterHeight) {
            newPosition.y = this.groundHeight + characterHeight;
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        } else {
            this.isGrounded = false;
        }
        
        // 位置を適用
        this.characterMesh.position = newPosition;
    }
    
    spawn(position: BABYLON.Vector3): void {
        this.characterMesh.position = position.clone();
        this.velocity = BABYLON.Vector3.Zero();
        this.isGrounded = false;
        console.log('[CHARACTER] Spawned at:', position);
    }
    
    setPosition(position: BABYLON.Vector3): void {
        this.characterMesh.position = position.clone();
        this.velocity = BABYLON.Vector3.Zero();
    }
    
    getPosition(): BABYLON.Vector3 {
        return this.characterMesh.position.clone();
    }
    
    getCharacterMesh(): BABYLON.Mesh {
        return this.characterMesh;
    }
    
    setGroundHeight(height: number): void {
        this.groundHeight = height;
    }
    
    dispose(): void {
        if (this.characterMesh) {
            this.characterMesh.dispose();
        }
        console.log('[CHARACTER] Disposed');
    }
}