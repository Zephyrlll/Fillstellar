import * as BABYLON from '@babylonjs/core';

export class PlayerController {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    
    constructor(scene: BABYLON.Scene, camera: BABYLON.UniversalCamera, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
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