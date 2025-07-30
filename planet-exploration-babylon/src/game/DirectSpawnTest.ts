import * as BABYLON from '@babylonjs/core';

export class DirectSpawnTest {
    static test(scene: BABYLON.Scene, position: BABYLON.Vector3): void {
        console.log(`[DIRECT_TEST] Testing spawn at position: ${position}`);
        
        // 1. 最も単純な方法：CreateAndPlace
        const sphere1 = BABYLON.MeshBuilder.CreateSphere("directTest1", { diameter: 10 }, scene);
        sphere1.position.set(position.x, position.y, position.z);
        const mat1 = new BABYLON.StandardMaterial("mat1", scene);
        mat1.emissiveColor = new BABYLON.Color3(1, 0, 0);
        sphere1.material = mat1;
        console.log(`[DIRECT_TEST] Sphere1 position after set: ${sphere1.position}`);
        
        // 2. setAbsolutePosition を使用
        const sphere2 = BABYLON.MeshBuilder.CreateSphere("directTest2", { diameter: 8 }, scene);
        sphere2.setAbsolutePosition(position.add(new BABYLON.Vector3(15, 0, 0)));
        const mat2 = new BABYLON.StandardMaterial("mat2", scene);
        mat2.emissiveColor = new BABYLON.Color3(0, 1, 0);
        sphere2.material = mat2;
        console.log(`[DIRECT_TEST] Sphere2 absolute position: ${sphere2.getAbsolutePosition()}`);
        
        // 3. 作成時に親を設定しない
        const sphere3 = BABYLON.MeshBuilder.CreateSphere("directTest3", { diameter: 6 }, scene);
        sphere3.parent = null;
        sphere3.position = position.add(new BABYLON.Vector3(-15, 0, 0));
        const mat3 = new BABYLON.StandardMaterial("mat3", scene);
        mat3.emissiveColor = new BABYLON.Color3(0, 0, 1);
        sphere3.material = mat3;
        console.log(`[DIRECT_TEST] Sphere3 position: ${sphere3.position}`);
        
        // 4. TransformNodeを使用しない純粋なメッシュ
        const box = BABYLON.MeshBuilder.CreateBox("directTestBox", { size: 10 }, scene);
        box.position.x = position.x;
        box.position.y = position.y + 15;
        box.position.z = position.z;
        const mat4 = new BABYLON.StandardMaterial("mat4", scene);
        mat4.emissiveColor = new BABYLON.Color3(1, 1, 0);
        box.material = mat4;
        console.log(`[DIRECT_TEST] Box position: ${box.position}`);
        
        // 5. フレーム後の位置確認
        scene.registerAfterRender(() => {
            if (sphere1.position.length() < 10) {
                console.error(`[DIRECT_TEST] ERROR: Sphere1 moved to origin!`);
            }
        });
        
        // 全メッシュの位置を1秒後に確認
        setTimeout(() => {
            console.log("[DIRECT_TEST] === 1 second check ===");
            console.log(`Sphere1: ${sphere1.position}`);
            console.log(`Sphere2: ${sphere2.position}`);
            console.log(`Sphere3: ${sphere3.position}`);
            console.log(`Box: ${box.position}`);
            
            // シーン内の全メッシュをチェック
            scene.meshes.forEach(mesh => {
                if (mesh.name.includes("directTest")) {
                    console.log(`[DIRECT_TEST] ${mesh.name} at ${mesh.position} (length: ${mesh.position.length()})`);
                }
            });
        }, 1000);
    }
}