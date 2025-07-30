import * as BABYLON from '@babylonjs/core';
import { ProceduralTerrain } from './ProceduralTerrain';
import { SphericalMovement } from './SphericalMovement';

export class ThirdPersonCamera {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    private target: BABYLON.TransformNode;
    private terrain: ProceduralTerrain | null = null;
    private sphericalMovement: SphericalMovement | null = null;
    
    // カメラ設定
    private distance: number = 12;
    private height: number = 5;
    private rotationSpeed: number = 0.005;
    private followSpeed: number = 0.1;
    
    // マウス制御
    private isPointerLocked: boolean = false;
    private cameraAlpha: number = 0;
    private cameraBeta: number = Math.PI / 8;
    
    constructor(
        scene: BABYLON.Scene,
        camera: BABYLON.UniversalCamera,
        canvas: HTMLCanvasElement,
        target: BABYLON.TransformNode
    ) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.target = target;
        
        this.setupControls();
    }
    
    setTerrain(terrain: ProceduralTerrain): void {
        this.terrain = terrain;
        if (terrain.isSpherical()) {
            this.sphericalMovement = new SphericalMovement(this.scene);
            this.sphericalMovement.setPlanetData(BABYLON.Vector3.Zero(), terrain.getPlanetRadius());
        }
    }
    
    private setupControls(): void {
        // カメラの基本設定を解除（手動制御のため）
        this.camera.detachControl();
        
        // マウスクリックでポインターロック
        this.canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.canvas.requestPointerLock();
            }
        });
        
        // ポインターロックの状態変更を監視
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });
        
        // マウス移動イベント
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.handleMouseMove(e);
            }
        });
        
        // マウスホイールでズーム
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.distance = Math.max(3, Math.min(20, this.distance + e.deltaY * 0.01));
        });
        
        // ESCでポインターロック解除
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isPointerLocked) {
                document.exitPointerLock();
            }
        });
    }
    
    private handleMouseMove(e: MouseEvent): void {
        // マウスの移動量に基づいてカメラを回転
        this.cameraAlpha -= e.movementX * this.rotationSpeed;
        this.cameraBeta -= e.movementY * this.rotationSpeed;
        
        // 垂直角度の制限
        this.cameraBeta = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraBeta));
    }
    
    public update(): void {
        if (!this.target) return;
        
        // ターゲットの位置を取得
        const targetPosition = this.target.position.clone();
        
        if (this.terrain && this.terrain.isSpherical() && this.sphericalMovement) {
            // 球体地形での処理
            const up = this.sphericalMovement.getUpVector(targetPosition);
            
            // カメラのローカル座標系を構築
            // 前方向を現在のカメラ角度から計算
            let forward = new BABYLON.Vector3(
                Math.sin(this.cameraAlpha),
                0,
                Math.cos(this.cameraAlpha)
            );
            
            // 前方向を球面に投影
            forward = this.sphericalMovement.getForwardVector(targetPosition, forward);
            
            // 右方向を計算
            const right = this.sphericalMovement.getRightVector(targetPosition, forward);
            
            // カメラの相対位置を計算
            let cameraOffset = BABYLON.Vector3.Zero();
            
            // 水平方向のオフセット（後ろと横）
            cameraOffset = cameraOffset.add(forward.scale(-this.distance * Math.cos(this.cameraBeta)));
            
            // 垂直方向のオフセット（上）
            cameraOffset = cameraOffset.add(up.scale(this.height + this.distance * Math.sin(this.cameraBeta)));
            
            // カメラの目標位置
            const targetCameraPos = targetPosition.add(cameraOffset);
            
            // カメラ位置をスムーズに追従
            this.camera.position = BABYLON.Vector3.Lerp(
                this.camera.position,
                targetCameraPos,
                this.followSpeed
            );
            
            // カメラの向きを設定（ターゲットを見る）
            const lookAtTarget = targetPosition.add(up.scale(this.height * 0.5));
            this.camera.setTarget(lookAtTarget);
            
            // カメラの上方向を球体の法線に合わせる
            this.camera.upVector = up;
        } else {
            // 平面地形での処理（既存のコード）
            const x = targetPosition.x + this.distance * Math.sin(this.cameraAlpha) * Math.cos(this.cameraBeta);
            const y = targetPosition.y + this.height + this.distance * Math.sin(this.cameraBeta);
            const z = targetPosition.z + this.distance * Math.cos(this.cameraAlpha) * Math.cos(this.cameraBeta);
            
            const targetCameraPos = new BABYLON.Vector3(x, y, z);
            
            // カメラ位置をスムーズに追従
            this.camera.position = BABYLON.Vector3.Lerp(
                this.camera.position,
                targetCameraPos,
                this.followSpeed
            );
            
            // カメラをターゲットに向ける
            const lookAtTarget = targetPosition.add(new BABYLON.Vector3(0, this.height * 0.5, 0));
            this.camera.setTarget(lookAtTarget);
            
            // 平面地形では上方向をリセット
            this.camera.upVector = BABYLON.Vector3.Up();
        }
    }
    
    public setDistance(distance: number): void {
        this.distance = Math.max(3, Math.min(20, distance));
    }
    
    public getRotation(): BABYLON.Vector3 {
        // キャラクターの向きを計算（カメラの向きに基づく）
        return new BABYLON.Vector3(0, this.cameraAlpha, 0);
    }
    
    public getCameraDirection(): BABYLON.Vector3 {
        // カメラの前方向ベクトルを取得
        const forward = this.camera.getTarget().subtract(this.camera.position);
        
        if (this.terrain && this.terrain.isSpherical() && this.sphericalMovement) {
            // 球体地形では、上方向成分を除去して水平方向のみを取得
            const up = this.sphericalMovement.getUpVector(this.target.position);
            const upComponent = up.scale(BABYLON.Vector3.Dot(forward, up));
            const tangentForward = forward.subtract(upComponent);
            tangentForward.normalize();
            return tangentForward;
        } else {
            // 平面地形では、Y成分を除去
            forward.y = 0;
            forward.normalize();
            return forward;
        }
    }
    
    public getCameraRight(): BABYLON.Vector3 {
        // カメラの右方向ベクトルを取得
        const forward = this.getCameraDirection();
        
        if (this.terrain && this.terrain.isSpherical() && this.sphericalMovement) {
            // 球体地形では、球面に沿った右方向を計算
            const up = this.sphericalMovement.getUpVector(this.target.position);
            return BABYLON.Vector3.Cross(forward, up).normalize();
        } else {
            // 平面地形では、通常の右方向
            return BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), forward);
        }
    }
    
    public resetCamera(): void {
        this.cameraAlpha = 0;
        this.cameraBeta = Math.PI / 8;
        this.distance = 8;
    }
    
    public setTarget(target: BABYLON.TransformNode): void {
        this.target = target;
    }
}