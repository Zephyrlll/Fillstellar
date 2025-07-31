import * as BABYLON from '@babylonjs/core';

// シンプルなテスト
export async function runSimpleTest() {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    // エンジンとシーンの作成
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    
    // カメラ
    const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);
    
    // ライト
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    
    // 地面
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene);
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.2);
    ground.material = groundMaterial;
    
    // ボックス
    const box = BABYLON.MeshBuilder.CreateBox('box', { size: 2 }, scene);
    box.position.y = 1;
    const boxMaterial = new BABYLON.StandardMaterial('boxMat', scene);
    boxMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.2, 0.8);
    box.material = boxMaterial;
    
    // 背景色
    scene.clearColor = new BABYLON.Color4(0.5, 0.7, 0.9, 1);
    
    // レンダリングループ
    engine.runRenderLoop(() => {
        box.rotation.y += 0.01;
        scene.render();
    });
    
    // リサイズ対応
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    console.log('Simple test scene created successfully!');
}