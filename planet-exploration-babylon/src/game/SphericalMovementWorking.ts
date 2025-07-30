import * as BABYLON from '@babylonjs/core';

/**
 * 動作確認済みの球面移動システム
 * カメラ相対移動を正しく実装
 */
export class SphericalMovementWorking {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    private scene: BABYLON.Scene;
    
    constructor(scene: BABYLON.Scene, center: BABYLON.Vector3, radius: number) {
        this.scene = scene;
        this.planetCenter = center;
        this.planetRadius = radius;
    }
    
    /**
     * 球面上での移動（カメラ相対）
     */
    moveOnSphere(
        currentPos: BABYLON.Vector3,
        inputX: number,  // A/D入力 (-1 ~ 1)
        inputZ: number,  // W/S入力 (-1 ~ 1)
        cameraForward: BABYLON.Vector3,
        cameraRight: BABYLON.Vector3,
        deltaTime: number
    ): BABYLON.Vector3 {
        if (Math.abs(inputX) < 0.01 && Math.abs(inputZ) < 0.01) {
            return currentPos;
        }
        
        // 現在の上方向（重力の逆）
        const up = currentPos.subtract(this.planetCenter).normalize();
        
        // カメラの方向を接平面に投影
        let projectedForward = cameraForward.subtract(up.scale(BABYLON.Vector3.Dot(cameraForward, up)));
        let projectedRight = cameraRight.subtract(up.scale(BABYLON.Vector3.Dot(cameraRight, up)));
        
        // 正規化
        if (projectedForward.length() > 0.001) {
            projectedForward.normalize();
        } else {
            // カメラが真上/真下を向いている場合のフォールバック
            projectedForward = new BABYLON.Vector3(1, 0, 0);
            projectedForward = projectedForward.subtract(up.scale(BABYLON.Vector3.Dot(projectedForward, up)));
            projectedForward.normalize();
        }
        
        if (projectedRight.length() > 0.001) {
            projectedRight.normalize();
        } else {
            projectedRight = BABYLON.Vector3.Cross(up, projectedForward).normalize();
        }
        
        // 入力に基づいて移動方向を計算
        const moveDirection = projectedForward.scale(inputZ).add(projectedRight.scale(inputX));
        
        if (moveDirection.length() < 0.001) {
            return currentPos;
        }
        
        moveDirection.normalize();
        
        // 移動速度（角速度）
        const angularSpeed = 1.0 * deltaTime; // 速度を上げる
        
        // 回転軸（現在位置と移動方向の外積）
        // 重要：upではなく、現在位置ベクトルと移動方向の外積を使う
        const fromCenter = currentPos.subtract(this.planetCenter);
        const rotationAxis = BABYLON.Vector3.Cross(fromCenter, moveDirection);
        
        if (rotationAxis.length() < 0.001) {
            // 移動方向が動径方向の場合
            return currentPos;
        }
        rotationAxis.normalize();
        
        // 回転角度
        const angle = angularSpeed;
        
        // 回転を適用
        const rotation = BABYLON.Quaternion.RotationAxis(rotationAxis, angle);
        let newPos = fromCenter.applyRotationQuaternion(rotation);
        newPos = newPos.add(this.planetCenter);
        
        // 半径を維持
        const newFromCenter = newPos.subtract(this.planetCenter);
        const currentRadius = newFromCenter.length();
        if (Math.abs(currentRadius - this.planetRadius) > 0.01) {
            newPos = this.planetCenter.add(newFromCenter.normalize().scale(this.planetRadius));
        }
        
        return newPos;
    }
    
    /**
     * 上方向ベクトルを取得
     */
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.subtract(this.planetCenter).normalize();
    }
    
    /**
     * キャラクターの回転を計算（地面に垂直に立つ）
     */
    calculateRotation(
        position: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        cameraForward: BABYLON.Vector3
    ): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        let forward: BABYLON.Vector3;
        
        if (moveDirection && moveDirection.length() > 0.01) {
            // 移動方向を前方向とする
            forward = moveDirection.clone();
        } else {
            // 移動していない場合はカメラの向きを使用
            forward = cameraForward.clone();
        }
        
        // 接平面に投影
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        
        if (forward.length() < 0.001) {
            // フォールバック
            forward = new BABYLON.Vector3(0, 0, 1);
            forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        }
        
        forward.normalize();
        
        // 右方向を計算
        const right = BABYLON.Vector3.Cross(up, forward).normalize();
        
        // 回転行列を構築
        const rotMatrix = BABYLON.Matrix.Identity();
        rotMatrix.m[0] = right.x; rotMatrix.m[1] = right.y; rotMatrix.m[2] = right.z;
        rotMatrix.m[4] = up.x; rotMatrix.m[5] = up.y; rotMatrix.m[6] = up.z;
        rotMatrix.m[8] = -forward.x; rotMatrix.m[9] = -forward.y; rotMatrix.m[10] = -forward.z;
        
        return BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
    }
}