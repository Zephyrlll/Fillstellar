import * as BABYLON from '@babylonjs/core';

// 最もシンプルな実装：位置を変更しない静的アバター
export class StaticAvatar {
    private scene: BABYLON.Scene;
    private rootMesh: BABYLON.Mesh;
    private initialPosition: BABYLON.Vector3;
    
    constructor(scene: BABYLON.Scene, position: BABYLON.Vector3) {
        this.scene = scene;
        this.initialPosition = position.clone();
        
        console.log(`[STATIC_AVATAR] Creating at position: ${position}`);
        
        // ルートメッシュ（体の中心 - 足元を基準とする）
        this.rootMesh = new BABYLON.Mesh("staticAvatar", scene);
        
        // ルートメッシュのピボットポイントを調整（足元が基準）
        this.rootMesh.setPivotMatrix(BABYLON.Matrix.Translation(0, 0, 0));
        
        // 胴体
        const torso = BABYLON.MeshBuilder.CreateBox("torso", {
            height: 1.2,
            width: 0.8,
            depth: 0.4
        }, scene);
        torso.position.y = 0.9;
        torso.parent = this.rootMesh;
        
        // 頭
        const head = BABYLON.MeshBuilder.CreateSphere("head", {
            diameter: 0.5,
            segments: 16
        }, scene);
        head.position.y = 1.8;
        head.parent = this.rootMesh;
        
        // 左腕
        const leftArm = BABYLON.MeshBuilder.CreateCylinder("leftArm", {
            height: 1.0,
            diameter: 0.2
        }, scene);
        leftArm.position.set(-0.5, 0.9, 0);
        leftArm.rotation.z = Math.PI / 8;
        leftArm.parent = this.rootMesh;
        
        // 右腕
        const rightArm = BABYLON.MeshBuilder.CreateCylinder("rightArm", {
            height: 1.0,
            diameter: 0.2
        }, scene);
        rightArm.position.set(0.5, 0.9, 0);
        rightArm.rotation.z = -Math.PI / 8;
        rightArm.parent = this.rootMesh;
        
        // 左脚
        const leftLeg = BABYLON.MeshBuilder.CreateCylinder("leftLeg", {
            height: 1.2,
            diameter: 0.25
        }, scene);
        leftLeg.position.set(-0.2, -0.3, 0);
        leftLeg.parent = this.rootMesh;
        
        // 右脚
        const rightLeg = BABYLON.MeshBuilder.CreateCylinder("rightLeg", {
            height: 1.2,
            diameter: 0.25
        }, scene);
        rightLeg.position.set(0.2, -0.3, 0);
        rightLeg.parent = this.rootMesh;
        
        // 位置を設定（複数の方法を試す）
        this.rootMesh.position = position.clone();
        console.log(`[STATIC_AVATAR] After position assignment: ${this.rootMesh.position}`);
        
        // 絶対位置も設定
        this.rootMesh.setAbsolutePosition(position);
        console.log(`[STATIC_AVATAR] After setAbsolutePosition: ${this.rootMesh.getAbsolutePosition()}`);
        
        // 個別に設定
        this.rootMesh.position.x = position.x;
        this.rootMesh.position.y = position.y;
        this.rootMesh.position.z = position.z;
        console.log(`[STATIC_AVATAR] After individual assignment: ${this.rootMesh.position}`);
        
        // 親がないことを確認
        if (this.rootMesh.parent) {
            console.error('[STATIC_AVATAR] WARNING: Mesh has a parent! This might affect positioning.');
            console.error(`[STATIC_AVATAR] Parent: ${this.rootMesh.parent.name}`);
        }
        
        // マテリアル設定
        // 体のマテリアル（宇宙服風）
        const bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.95);
        bodyMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        bodyMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        
        // 頭のマテリアル（ヘルメット風）
        const headMaterial = new BABYLON.StandardMaterial("headMat", scene);
        headMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        headMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        headMaterial.specularPower = 32;
        headMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        
        // マテリアルを適用
        torso.material = bodyMaterial;
        head.material = headMaterial;
        leftArm.material = bodyMaterial;
        rightArm.material = bodyMaterial;
        leftLeg.material = bodyMaterial;
        rightLeg.material = bodyMaterial;
        
        // 上方向を示すビーコンを追加（デバッグ用）
        const beacon = BABYLON.MeshBuilder.CreateCylinder("beacon", {
            height: 5,
            diameterTop: 0.05,
            diameterBottom: 0.2
        }, scene);
        beacon.parent = this.rootMesh;
        beacon.position.y = 4; // アバターの上に配置
        const beaconMat = new BABYLON.StandardMaterial("beaconMat", scene);
        beaconMat.emissiveColor = new BABYLON.Color3(1, 1, 0); // 黄色に光る
        beacon.material = beaconMat;
        
        console.log(`[STATIC_AVATAR] Final position: ${this.rootMesh.position}`);
        
        // 1秒ごとに位置を確認（デバッグ用、自動リセットは無効）
        // setInterval(() => {
        //     if (this.rootMesh.position.length() < 10) {
        //         console.error(`[STATIC_AVATAR] ERROR: Moved to origin! Resetting...`);
        //         this.rootMesh.position = this.initialPosition.clone();
        //     }
        // }, 1000);
    }
    
    getPosition(): BABYLON.Vector3 {
        return this.rootMesh.position.clone();
    }
    
    setPosition(position: BABYLON.Vector3): void {
        console.log(`[STATIC_AVATAR] setPosition called with: ${position}`);
        // 球体移動システムで位置が更新されるようになったので、実際に位置を更新する
        this.rootMesh.position.copyFrom(position);
    }
    
    getRootMesh(): BABYLON.Mesh {
        return this.rootMesh;
    }
    
    dispose(): void {
        this.rootMesh.dispose();
    }
    
    // ダミーメソッド（互換性のため）
    setRotation(rotation: BABYLON.Vector3): void {}
    startWalking(): void {}
    stopWalking(): void {}
    update(deltaTime: number): void {}
}