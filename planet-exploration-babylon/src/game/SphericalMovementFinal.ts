import * as BABYLON from '@babylonjs/core';

/**
 * 最終版：シンプルで確実な球面移動
 */
export class SphericalMovementFinal {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    constructor(center: BABYLON.Vector3, radius: number) {
        this.planetCenter = center;
        this.planetRadius = radius;
    }
    
    /**
     * 球面上での移動
     * ポイント：2軸の回転を独立して計算することで、確実に全方向に移動可能にする
     */
    moveOnSphere(
        currentPos: BABYLON.Vector3,
        inputX: number,  // 左右入力 (-1 ~ 1)
        inputZ: number,  // 前後入力 (-1 ~ 1)
        cameraForward: BABYLON.Vector3,
        cameraRight: BABYLON.Vector3,
        deltaTime: number
    ): BABYLON.Vector3 {
        if (Math.abs(inputX) < 0.01 && Math.abs(inputZ) < 0.01) {
            return currentPos;
        }
        
        const moveSpeed = 1.5 * deltaTime; // 移動速度
        
        // 現在位置（中心からのベクトル）
        let position = currentPos.subtract(this.planetCenter);
        
        // 前後移動（Z軸入力）
        if (Math.abs(inputZ) > 0.01) {
            // カメラの前方向を基準に回転軸を計算
            const forwardAxis = BABYLON.Vector3.Cross(position, cameraForward);
            if (forwardAxis.length() > 0.001) {
                forwardAxis.normalize();
                const forwardRotation = BABYLON.Quaternion.RotationAxis(forwardAxis, -inputZ * moveSpeed);
                position = position.applyRotationQuaternion(forwardRotation);
            }
        }
        
        // 左右移動（X軸入力）
        if (Math.abs(inputX) > 0.01) {
            // カメラの右方向を基準に回転軸を計算
            const rightAxis = BABYLON.Vector3.Cross(position, cameraRight);
            if (rightAxis.length() > 0.001) {
                rightAxis.normalize();
                const rightRotation = BABYLON.Quaternion.RotationAxis(rightAxis, inputX * moveSpeed);
                position = position.applyRotationQuaternion(rightRotation);
            }
        }
        
        // 半径を確実に維持
        position = position.normalize().scale(this.planetRadius);
        
        return this.planetCenter.add(position);
    }
    
    /**
     * 上方向ベクトルを取得
     */
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.subtract(this.planetCenter).normalize();
    }
    
    /**
     * キャラクターの向きを計算
     */
    calculateRotation(
        position: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        lastForward: BABYLON.Vector3
    ): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        let forward: BABYLON.Vector3;
        
        if (moveDirection && moveDirection.length() > 0.01) {
            // 移動方向を接平面に投影
            forward = moveDirection.subtract(up.scale(BABYLON.Vector3.Dot(moveDirection, up)));
            if (forward.length() < 0.001) {
                forward = lastForward;
            }
        } else {
            forward = lastForward;
        }
        
        // 接平面に確実に投影
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        if (forward.length() > 0.001) {
            forward.normalize();
        } else {
            // 最終的なフォールバック
            const tempForward = new BABYLON.Vector3(1, 0, 0);
            forward = tempForward.subtract(up.scale(BABYLON.Vector3.Dot(tempForward, up)));
            forward.normalize();
        }
        
        // 右ベクトルを計算
        const right = BABYLON.Vector3.Cross(up, forward).normalize();
        
        // 前方向を再計算（確実に直交させる）
        forward = BABYLON.Vector3.Cross(right, up).normalize();
        
        // 回転行列からクォータニオンを作成
        const rotMatrix = new BABYLON.Matrix();
        rotMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
        rotMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
        rotMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
        rotMatrix.setRow(3, new BABYLON.Vector4(0, 0, 0, 1));
        
        return BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
    }
}