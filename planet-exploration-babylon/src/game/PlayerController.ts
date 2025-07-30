import * as BABYLON from '@babylonjs/core';
import { SphericalMovement } from './SphericalMovement';

export class PlayerController {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    private sphericalMovement: SphericalMovement; // 追加

    constructor(scene: BABYLON.Scene, camera: BABYLON.UniversalCamera, canvas: HTMLCanvasElement, sphericalMovement: SphericalMovement) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.sphericalMovement = sphericalMovement; // 追加
    }

    // 毎フレーム呼び出す更新処理
    update(): void {
        // 現在のプレイヤーの位置から「上」方向を取得
        const currentUp = this.sphericalMovement.getUpVector(this.camera.position);
        
        // カメラの上方向ベクトルを更新
        this.camera.upVector = currentUp;
    }
    
    spawn(position: BABYLON.Vector3): void {
        this.camera.position = position;
    }
    
    getPosition(): BABYLON.Vector3 {
        return this.camera.position.clone();
    }
    
    setPosition(position: BABYLON.Vector3): void {
        this.camera.position = position;
    }
}