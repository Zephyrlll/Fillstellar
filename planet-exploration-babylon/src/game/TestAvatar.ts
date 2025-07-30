import * as BABYLON from '@babylonjs/core';

export class TestAvatar {
    private scene: BABYLON.Scene;
    private mesh: BABYLON.Mesh;
    
    constructor(scene: BABYLON.Scene, position: BABYLON.Vector3) {
        this.scene = scene;
        
        // 単純な球体を作成
        this.mesh = BABYLON.MeshBuilder.CreateSphere("testAvatar", { diameter: 5 }, scene);
        
        // マテリアルを設定
        const material = new BABYLON.StandardMaterial("testAvatarMat", scene);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0); // 赤色
        material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        this.mesh.material = material;
        
        // 位置を設定（3つの方法を試す）
        console.log(`[TEST_AVATAR] Creating at position: ${position}`);
        
        // 方法1: 直接設定
        this.mesh.position = position.clone();
        console.log(`[TEST_AVATAR] After direct assignment: ${this.mesh.position}`);
        
        // 方法2: copyFrom
        this.mesh.position.copyFrom(position);
        console.log(`[TEST_AVATAR] After copyFrom: ${this.mesh.position}`);
        
        // 方法3: 個別に設定
        this.mesh.position.x = position.x;
        this.mesh.position.y = position.y;
        this.mesh.position.z = position.z;
        console.log(`[TEST_AVATAR] After individual assignment: ${this.mesh.position}`);
        
        // ワールド行列を更新
        this.mesh.computeWorldMatrix(true);
        console.log(`[TEST_AVATAR] After computeWorldMatrix: ${this.mesh.position}`);
        
        // 絶対位置を確認
        const absPos = this.mesh.getAbsolutePosition();
        console.log(`[TEST_AVATAR] Absolute position: ${absPos}`);
        
        // 1秒後に位置を再確認
        setTimeout(() => {
            console.log(`[TEST_AVATAR] Position after 1 second: ${this.mesh.position}`);
            console.log(`[TEST_AVATAR] Absolute position after 1 second: ${this.mesh.getAbsolutePosition()}`);
        }, 1000);
    }
    
    getPosition(): BABYLON.Vector3 {
        return this.mesh.position.clone();
    }
    
    getMesh(): BABYLON.Mesh {
        return this.mesh;
    }
}