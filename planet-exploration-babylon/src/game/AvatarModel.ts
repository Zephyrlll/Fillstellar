import * as BABYLON from '@babylonjs/core';
import { DebugTracker } from './DebugTracker';

export interface AvatarConfig {
    height?: number;
    bodyColor?: BABYLON.Color3;
    visorColor?: BABYLON.Color3;
    scale?: number;
}

export class AvatarModel {
    private scene: BABYLON.Scene;
    private rootMesh: BABYLON.Mesh;
    private bodyMesh: BABYLON.Mesh;
    private headMesh: BABYLON.Mesh;
    private visorMesh: BABYLON.Mesh;
    private leftArmMesh: BABYLON.Mesh;
    private rightArmMesh: BABYLON.Mesh;
    private leftLegMesh: BABYLON.Mesh;
    private rightLegMesh: BABYLON.Mesh;
    private config: Required<AvatarConfig>;
    
    // アニメーション用
    private walkCycle: number = 0;
    private isWalking: boolean = false;
    private initialPosition: BABYLON.Vector3;
    
    constructor(scene: BABYLON.Scene, config?: AvatarConfig, initialPosition?: BABYLON.Vector3) {
        this.scene = scene;
        this.config = {
            height: config?.height ?? 1.8,
            bodyColor: config?.bodyColor ?? new BABYLON.Color3(0.9, 0.9, 0.9),
            visorColor: config?.visorColor ?? new BABYLON.Color3(0.2, 0.4, 0.8),
            scale: config?.scale ?? 1
        };
        this.initialPosition = initialPosition || new BABYLON.Vector3(0, 0, 0);
        
        this.createAstronaut();
    }
    
    private createAstronaut(): void {
        // ルートメッシュ（透明な箱）
        this.rootMesh = BABYLON.MeshBuilder.CreateBox("avatar", { size: 0.01 }, this.scene);
        this.rootMesh.visibility = 0; // 透明にする
        this.rootMesh.position = this.initialPosition.clone(); // 初期位置を設定
        this.rootMesh.scaling = new BABYLON.Vector3(this.config.scale, this.config.scale, this.config.scale);
        
        // 重要: 親子関係と物理演算を無効化
        this.rootMesh.parent = null;
        this.rootMesh.physicsImpostor = null;
        this.rootMesh.checkCollisions = false;
        
        console.log(`[AVATAR] Created at initial position: ${this.initialPosition} (actual: ${this.rootMesh.position})`);
        
        const scale = this.config.scale;
        
        // 体（胴体）
        this.bodyMesh = BABYLON.MeshBuilder.CreateCylinder("body", {
            height: 0.8 * scale,
            diameterTop: 0.4 * scale,
            diameterBottom: 0.45 * scale,
            tessellation: 12
        }, this.scene);
        
        // 親子関係をデバッグ
        console.log(`[AVATAR] Before parenting body - position: ${this.bodyMesh.position}`);
        this.bodyMesh.parent = this.rootMesh;
        console.log(`[AVATAR] After parenting body - position: ${this.bodyMesh.position}`);
        console.log(`[AVATAR] Body absolute position: ${this.bodyMesh.getAbsolutePosition()}`);
        
        this.bodyMesh.position.y = 0.7 * scale;
        
        // 頭部（ヘルメット）
        this.headMesh = BABYLON.MeshBuilder.CreateSphere("head", {
            diameter: 0.4 * scale,
            segments: 16
        }, this.scene);
        this.headMesh.parent = this.rootMesh;
        this.headMesh.position.y = 1.3 * scale;
        
        // バイザー（ヘルメットの前面）
        this.visorMesh = BABYLON.MeshBuilder.CreateSphere("visor", {
            diameter: 0.35 * scale,
            segments: 16,
            arc: 0.5,
            slice: 0.5
        }, this.scene);
        this.visorMesh.parent = this.headMesh;
        this.visorMesh.position.z = 0.1 * scale;
        this.visorMesh.rotation.y = Math.PI;
        
        // 左腕
        this.leftArmMesh = BABYLON.MeshBuilder.CreateCylinder("leftArm", {
            height: 0.6 * scale,
            diameter: 0.15 * scale,
            tessellation: 8
        }, this.scene);
        this.leftArmMesh.parent = this.rootMesh;
        this.leftArmMesh.position.set(-0.3 * scale, 0.7 * scale, 0);
        this.leftArmMesh.rotation.z = Math.PI / 8;
        
        // 右腕
        this.rightArmMesh = BABYLON.MeshBuilder.CreateCylinder("rightArm", {
            height: 0.6 * scale,
            diameter: 0.15 * scale,
            tessellation: 8
        }, this.scene);
        this.rightArmMesh.parent = this.rootMesh;
        this.rightArmMesh.position.set(0.3 * scale, 0.7 * scale, 0);
        this.rightArmMesh.rotation.z = -Math.PI / 8;
        
        // 左脚
        this.leftLegMesh = BABYLON.MeshBuilder.CreateCylinder("leftLeg", {
            height: 0.7 * scale,
            diameter: 0.18 * scale,
            tessellation: 8
        }, this.scene);
        this.leftLegMesh.parent = this.rootMesh;
        this.leftLegMesh.position.set(-0.15 * scale, 0.35 * scale, 0);
        
        // 右脚
        this.rightLegMesh = BABYLON.MeshBuilder.CreateCylinder("rightLeg", {
            height: 0.7 * scale,
            diameter: 0.18 * scale,
            tessellation: 8
        }, this.scene);
        this.rightLegMesh.parent = this.rootMesh;
        this.rightLegMesh.position.set(0.15 * scale, 0.35 * scale, 0);
        
        // マテリアルを適用
        this.applyMaterials();
    }
    
    private applyMaterials(): void {
        // ボディマテリアル（宇宙服）
        const bodyMaterial = new BABYLON.StandardMaterial("avatarBodyMat", this.scene);
        bodyMaterial.diffuseColor = this.config.bodyColor;
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        bodyMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // ヘルメットマテリアル
        const helmetMaterial = new BABYLON.StandardMaterial("avatarHelmetMat", this.scene);
        helmetMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        helmetMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        helmetMaterial.specularPower = 32;
        
        // バイザーマテリアル（半透明）
        const visorMaterial = new BABYLON.StandardMaterial("avatarVisorMat", this.scene);
        visorMaterial.diffuseColor = this.config.visorColor;
        visorMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        visorMaterial.alpha = 0.7;
        visorMaterial.specularPower = 64;
        
        // マテリアルを適用
        this.bodyMesh.material = bodyMaterial;
        this.headMesh.material = helmetMaterial;
        this.visorMesh.material = visorMaterial;
        this.leftArmMesh.material = bodyMaterial;
        this.rightArmMesh.material = bodyMaterial;
        this.leftLegMesh.material = bodyMaterial;
        this.rightLegMesh.material = bodyMaterial;
    }
    
    public getRootMesh(): BABYLON.Mesh {
        return this.rootMesh;
    }
    
    public setPosition(position: BABYLON.Vector3): void {
        const tracker = DebugTracker.getInstance();
        tracker.log('AVATAR', `setPosition called with: ${position} (distance: ${position.length()})`);
        
        // シンプルに位置を設定
        this.rootMesh.position = position.clone();
        
        // 設定後の確認
        tracker.log('AVATAR', `After setting - rootMesh.position: ${this.rootMesh.position} (distance: ${this.rootMesh.position.length()})`);
    }
    
    public setRotation(rotation: BABYLON.Vector3): void {
        this.rootMesh.rotation = rotation;
    }
    
    public startWalking(): void {
        this.isWalking = true;
    }
    
    public stopWalking(): void {
        this.isWalking = false;
        this.resetPose();
    }
    
    private resetPose(): void {
        // 元のポーズに戻す
        this.leftArmMesh.rotation.x = 0;
        this.rightArmMesh.rotation.x = 0;
        this.leftLegMesh.rotation.x = 0;
        this.rightLegMesh.rotation.x = 0;
    }
    
    public update(deltaTime: number): void {
        if (this.isWalking) {
            this.walkCycle += deltaTime * 5; // 歩行速度
            
            // 腕の振り
            this.leftArmMesh.rotation.x = Math.sin(this.walkCycle) * 0.3;
            this.rightArmMesh.rotation.x = -Math.sin(this.walkCycle) * 0.3;
            
            // 脚の動き
            this.leftLegMesh.rotation.x = -Math.sin(this.walkCycle) * 0.4;
            this.rightLegMesh.rotation.x = Math.sin(this.walkCycle) * 0.4;
            
            // 体の上下動（一時的に無効化）
            // this.rootMesh.position.y = Math.abs(Math.sin(this.walkCycle * 2)) * 0.03;
            // TODO: 球体地形に対応した上下動を実装
        }
    }
    
    public dispose(): void {
        this.rootMesh.dispose();
    }
}