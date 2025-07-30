import * as BABYLON from '@babylonjs/core';

export class FixedAvatar {
    private scene: BABYLON.Scene;
    private meshes: BABYLON.Mesh[] = [];
    private position: BABYLON.Vector3;
    private dummyRoot: BABYLON.Mesh | null = null;
    
    // アニメーション用
    private walkCycle: number = 0;
    private isWalking: boolean = false;
    
    constructor(scene: BABYLON.Scene, position: BABYLON.Vector3) {
        this.scene = scene;
        this.position = position.clone();
        
        console.log(`[FIXED_AVATAR] Creating at position: ${position}`);
        
        this.createAstronaut();
    }
    
    private createAstronaut(): void {
        const scale = 1;
        
        // 各パーツを独立したメッシュとして作成（親子関係なし）
        
        // 体（胴体）
        const body = BABYLON.MeshBuilder.CreateCylinder("fixedBody", {
            height: 0.8 * scale,
            diameterTop: 0.4 * scale,
            diameterBottom: 0.45 * scale,
            tessellation: 12
        }, this.scene);
        body.position = this.position.add(new BABYLON.Vector3(0, 0.7 * scale, 0));
        this.meshes.push(body);
        
        // 頭部（ヘルメット）
        const head = BABYLON.MeshBuilder.CreateSphere("fixedHead", {
            diameter: 0.4 * scale,
            segments: 16
        }, this.scene);
        head.position = this.position.add(new BABYLON.Vector3(0, 1.3 * scale, 0));
        this.meshes.push(head);
        
        // バイザー
        const visor = BABYLON.MeshBuilder.CreateSphere("fixedVisor", {
            diameter: 0.35 * scale,
            segments: 16,
            arc: 0.5,
            slice: 0.5
        }, this.scene);
        visor.position = this.position.add(new BABYLON.Vector3(0, 1.3 * scale, 0.1 * scale));
        visor.rotation.y = Math.PI;
        this.meshes.push(visor);
        
        // 左腕
        const leftArm = BABYLON.MeshBuilder.CreateCylinder("fixedLeftArm", {
            height: 0.6 * scale,
            diameter: 0.15 * scale,
            tessellation: 8
        }, this.scene);
        leftArm.position = this.position.add(new BABYLON.Vector3(-0.3 * scale, 0.7 * scale, 0));
        leftArm.rotation.z = Math.PI / 8;
        this.meshes.push(leftArm);
        
        // 右腕
        const rightArm = BABYLON.MeshBuilder.CreateCylinder("fixedRightArm", {
            height: 0.6 * scale,
            diameter: 0.15 * scale,
            tessellation: 8
        }, this.scene);
        rightArm.position = this.position.add(new BABYLON.Vector3(0.3 * scale, 0.7 * scale, 0));
        rightArm.rotation.z = -Math.PI / 8;
        this.meshes.push(rightArm);
        
        // 左脚
        const leftLeg = BABYLON.MeshBuilder.CreateCylinder("fixedLeftLeg", {
            height: 0.7 * scale,
            diameter: 0.18 * scale,
            tessellation: 8
        }, this.scene);
        leftLeg.position = this.position.add(new BABYLON.Vector3(-0.15 * scale, 0.35 * scale, 0));
        this.meshes.push(leftLeg);
        
        // 右脚
        const rightLeg = BABYLON.MeshBuilder.CreateCylinder("fixedRightLeg", {
            height: 0.7 * scale,
            diameter: 0.18 * scale,
            tessellation: 8
        }, this.scene);
        rightLeg.position = this.position.add(new BABYLON.Vector3(0.15 * scale, 0.35 * scale, 0));
        this.meshes.push(rightLeg);
        
        // マテリアルを適用
        this.applyMaterials();
        
        console.log(`[FIXED_AVATAR] Created with ${this.meshes.length} meshes`);
        console.log(`[FIXED_AVATAR] Body position: ${body.position}`);
    }
    
    private applyMaterials(): void {
        // ボディマテリアル（宇宙服）
        const bodyMaterial = new BABYLON.StandardMaterial("fixedBodyMat", this.scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        bodyMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // ヘルメットマテリアル
        const helmetMaterial = new BABYLON.StandardMaterial("fixedHelmetMat", this.scene);
        helmetMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        helmetMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        helmetMaterial.specularPower = 32;
        
        // バイザーマテリアル（半透明）
        const visorMaterial = new BABYLON.StandardMaterial("fixedVisorMat", this.scene);
        visorMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.7);
        visorMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        visorMaterial.alpha = 0.7;
        visorMaterial.specularPower = 64;
        
        // マテリアルを適用
        if (this.meshes[0]) this.meshes[0].material = bodyMaterial; // body
        if (this.meshes[1]) this.meshes[1].material = helmetMaterial; // head
        if (this.meshes[2]) this.meshes[2].material = visorMaterial; // visor
        if (this.meshes[3]) this.meshes[3].material = bodyMaterial; // leftArm
        if (this.meshes[4]) this.meshes[4].material = bodyMaterial; // rightArm
        if (this.meshes[5]) this.meshes[5].material = bodyMaterial; // leftLeg
        if (this.meshes[6]) this.meshes[6].material = bodyMaterial; // rightLeg
    }
    
    public getPosition(): BABYLON.Vector3 {
        return this.position.clone();
    }
    
    public setPosition(newPosition: BABYLON.Vector3): void {
        const delta = newPosition.subtract(this.position);
        this.position = newPosition.clone();
        
        // すべてのメッシュを移動
        this.meshes.forEach(mesh => {
            mesh.position = mesh.position.add(delta);
        });
    }
    
    public setRotation(rotation: BABYLON.Vector3): void {
        // 回転は簡略化（Y軸回転のみ対応）
        const rotationY = rotation.y;
        const center = this.position;
        
        this.meshes.forEach((mesh, index) => {
            if (index > 0) { // bodyは基準位置なのでスキップ
                // 中心からの相対位置を計算
                const relativePos = mesh.position.subtract(center);
                
                // Y軸周りに回転
                const rotatedX = relativePos.x * Math.cos(rotationY) - relativePos.z * Math.sin(rotationY);
                const rotatedZ = relativePos.x * Math.sin(rotationY) + relativePos.z * Math.cos(rotationY);
                
                // 新しい位置を設定
                mesh.position.x = center.x + rotatedX;
                mesh.position.z = center.z + rotatedZ;
            }
            
            // メッシュ自体も回転
            mesh.rotation.y = rotationY;
        });
    }
    
    public startWalking(): void {
        this.isWalking = true;
    }
    
    public stopWalking(): void {
        this.isWalking = false;
    }
    
    public update(deltaTime: number): void {
        if (this.isWalking) {
            this.walkCycle += deltaTime * 5;
            
            // 簡単なアニメーション（腕と脚の振り）
            if (this.meshes[3] && this.meshes[4]) { // arms
                this.meshes[3].rotation.x = Math.sin(this.walkCycle) * 0.3;
                this.meshes[4].rotation.x = -Math.sin(this.walkCycle) * 0.3;
            }
            
            if (this.meshes[5] && this.meshes[6]) { // legs
                this.meshes[5].rotation.x = -Math.sin(this.walkCycle) * 0.4;
                this.meshes[6].rotation.x = Math.sin(this.walkCycle) * 0.4;
            }
        }
    }
    
    public dispose(): void {
        this.meshes.forEach(mesh => mesh.dispose());
        if (this.dummyRoot) {
            this.dummyRoot.dispose();
            this.dummyRoot = null;
        }
    }
    
    // 互換性のためのメソッド
    public getRootMesh(): BABYLON.Mesh {
        // ダミーメッシュを作成して現在の位置を返す
        if (!this.dummyRoot) {
            this.dummyRoot = BABYLON.MeshBuilder.CreateBox("dummyRoot", { size: 0.01 }, this.scene);
            this.dummyRoot.visibility = 0;
            this.dummyRoot.position = this.position.clone();
        }
        // 常に現在の位置を更新
        this.dummyRoot.position.copyFrom(this.position);
        return this.dummyRoot;
    }
}