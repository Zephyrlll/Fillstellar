import * as BABYLON from '@babylonjs/core';

export class SimpleAvatar {
    private scene: BABYLON.Scene;
    private root: BABYLON.TransformNode;
    private meshes: BABYLON.Mesh[] = [];
    
    constructor(scene: BABYLON.Scene, position: BABYLON.Vector3) {
        this.scene = scene;
        
        console.log(`[SIMPLE_AVATAR] Creating at position: ${position}`);
        
        // TransformNodeを作成（メッシュではない）
        this.root = new BABYLON.TransformNode("simpleAvatarRoot", scene);
        this.root.position = position.clone();
        console.log(`[SIMPLE_AVATAR] Root TransformNode position: ${this.root.position}`);
        
        // メッシュを作成して配列に保存（大きめのサイズ）
        const body = BABYLON.MeshBuilder.CreateCylinder("simpleBody", {
            height: 3,  // 大きくする
            diameterTop: 1.5,
            diameterBottom: 2
        }, scene);
        body.parent = this.root;
        body.position.y = 2;
        this.meshes.push(body);
        
        const head = BABYLON.MeshBuilder.CreateSphere("simpleHead", {
            diameter: 2  // 大きくする
        }, scene);
        head.parent = this.root;
        head.position.y = 4;
        this.meshes.push(head);
        
        // 緑色のマテリアル（明るく光る）
        const material = new BABYLON.StandardMaterial("simpleAvatarMat", scene);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // 緑色
        material.emissiveColor = new BABYLON.Color3(0, 0.8, 0); // 明るく光らせる
        
        this.meshes.forEach(mesh => {
            mesh.material = material;
        });
        
        // 位置を確認
        console.log(`[SIMPLE_AVATAR] After creation - root position: ${this.root.position}`);
        console.log(`[SIMPLE_AVATAR] Body absolute position: ${body.getAbsolutePosition()}`);
    }
    
    getPosition(): BABYLON.Vector3 {
        return this.root.position.clone();
    }
    
    setPosition(position: BABYLON.Vector3): void {
        this.root.position = position.clone();
    }
    
    getRoot(): BABYLON.TransformNode {
        return this.root;
    }
    
    dispose(): void {
        this.meshes.forEach(mesh => mesh.dispose());
        this.root.dispose();
    }
}