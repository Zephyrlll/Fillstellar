import * as BABYLON from '@babylonjs/core';
import { ProceduralTerrain } from './ProceduralTerrain';
// import { SphericalMovement } from './SphericalMovement';

export class ThirdPersonCamera {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    private target: BABYLON.TransformNode;
    private terrain: ProceduralTerrain | null = null;
    // private sphericalMovement: SphericalMovement | null = null;
    private planetRadius: number = 100;
    
    // カメラ設定
    private distance: number = 12;
    private height: number = 5;
    private rotationSpeed: number = 0.003; // マウス感度を下げる（0.005 -> 0.003）
    private followSpeed: number = 0.15; // カメラ追従速度を上げる（アバターに追いつくため）
    
    // マウス制御
    private isPointerLocked: boolean = false;
    public cameraAlpha: number = 0;
    public cameraBeta: number = Math.PI / 8;
    private lastMovementX: number = 0;
    private lastMovementY: number = 0;
    
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
            // this.sphericalMovement = new SphericalMovement(this.scene);
            // this.sphericalMovement.setPlanetData(BABYLON.Vector3.Zero(), terrain.getPlanetRadius());
            this.planetRadius = terrain.getPlanetRadius();
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
        // 球面モード用に移動量を蓄積
        this.lastMovementX += e.movementX;
        this.lastMovementY += e.movementY;

        // 平面モード用に角度を更新（既存の処理）
        this.cameraAlpha += e.movementX * this.rotationSpeed;
        this.cameraBeta += e.movementY * this.rotationSpeed;
        
        // 垂直角度の制限
        this.cameraBeta = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraBeta));
    }
    
    public update(): void {
        if (!this.target) return;

        const targetPosition = this.target.position.clone();

        if (this.terrain && this.terrain.isSpherical()) {
            const up = this.getUpVector(targetPosition);

            // マウスの動きでカメラを回転
            const yaw = -this.lastMovementX * this.rotationSpeed;
            const pitch = -this.lastMovementY * this.rotationSpeed;

            // 現在のカメラオフセットを取得
            let currentOffset = this.camera.position.subtract(targetPosition);

            // 垂直回転（ピッチ）
            const right = BABYLON.Vector3.Cross(up, currentOffset).normalize();
            let rotation = BABYLON.Quaternion.RotationAxis(right, pitch);
            currentOffset = currentOffset.applyRotationQuaternion(rotation);

            // 水平回転（ヨー）
            rotation = BABYLON.Quaternion.RotationAxis(up, yaw);
            currentOffset = currentOffset.applyRotationQuaternion(rotation);
            
            // 最終的なカメラ位置を計算
            const desiredPosition = targetPosition.add(currentOffset);

            // カメラ位置をスムーズに追従
            this.camera.position = BABYLON.Vector3.Lerp(
                this.camera.position,
                desiredPosition,
                this.followSpeed
            );

            // カメラの向きと上方向を設定
            this.camera.setTarget(targetPosition.add(up.scale(this.height * 0.5)));
            this.camera.upVector = up;

            // マウス移動量をリセット
            this.lastMovementX = 0;
            this.lastMovementY = 0;
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
        // カメラのワールドマトリックスからZ軸（前方）を取得
        const forward = this.camera.getWorldMatrix().getRotationMatrix().getRow(2).toVector3();
        
        if (this.terrain && this.terrain.isSpherical()) {
            const targetPos = this.target.position;
            const up = this.getUpVector(targetPos);
            
            // ワールドの前方ベクトルを接平面に投影
            const tangentDir = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
            
            if (tangentDir.length() > 0.001) {
                return tangentDir.normalize();
            }
            
            // 投影が失敗した場合（カメラが真上/真下を向いている場合）のフォールバック
            // カメラの右ベクトルを使って前方を再計算
            const right = this.camera.getWorldMatrix().getRotationMatrix().getRow(0).toVector3();
            const tangentForward = BABYLON.Vector3.Cross(up, right);
            return tangentForward.normalize();
        } else {
            forward.y = 0;
            return forward.normalize();
        }
    }
    
    public getCameraRight(): BABYLON.Vector3 {
        // カメラのワールドマトリックスからX軸（右方）を取得
        const right = this.camera.getWorldMatrix().getRotationMatrix().getRow(0).toVector3();

        if (this.terrain && this.terrain.isSpherical()) {
            const targetPos = this.target.position;
            const up = this.getUpVector(targetPos);

            // ワールドの右ベクトルを接平面に投影
            const tangentRight = right.subtract(up.scale(BABYLON.Vector3.Dot(right, up)));
            
            if (tangentRight.length() > 0.001) {
                return tangentRight.normalize();
            }

            // 投影が失敗した場合のフォールバック
            const forward = this.getCameraDirection(); // 修正された前方ベクトルを利用
            const tangentRightFallback = BABYLON.Vector3.Cross(up, forward);
            return tangentRightFallback.normalize();
        } else {
            return right.normalize();
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
    
    // 簡易的な球面用メソッド
    private getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.normalize();
    }
}