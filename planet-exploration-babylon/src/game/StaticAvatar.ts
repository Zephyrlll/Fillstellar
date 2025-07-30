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
        
        // 単一のメッシュを作成（大きめ）
        this.rootMesh = BABYLON.MeshBuilder.CreateCylinder("staticAvatar", {
            height: 5,  // 大きくする
            diameterTop: 2,
            diameterBottom: 2.5
        }, scene);
        
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
        
        // マテリアル（明るく光る）
        const material = new BABYLON.StandardMaterial("staticAvatarMat", scene);
        material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.7); // 明るく光らせる
        this.rootMesh.material = material;
        
        // 上方向を示すビーコンを追加（デバッグ用）
        const beacon = BABYLON.MeshBuilder.CreateCylinder("beacon", {
            height: 20,
            diameterTop: 0.1,
            diameterBottom: 0.5
        }, scene);
        beacon.parent = this.rootMesh;
        beacon.position.y = 12; // アバターの上に配置
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