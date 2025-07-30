import * as BABYLON from '@babylonjs/core';

export class SphericalMovementSimple {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    constructor(center: BABYLON.Vector3, radius: number) {
        this.planetCenter = center;
        this.planetRadius = radius;
    }
    
    // シンプルな球面移動
    moveOnSphere(
        currentPosition: BABYLON.Vector3,
        inputX: number, // 左右入力 (-1 ~ 1)
        inputZ: number, // 前後入力 (-1 ~ 1)
        speed: number,
        cameraForward: BABYLON.Vector3
    ): BABYLON.Vector3 {
        // 現在位置から中心へのベクトル
        const toCenter = this.planetCenter.subtract(currentPosition);
        const currentRadius = toCenter.length();
        
        if (currentRadius < 0.1) {
            return currentPosition;
        }
        
        // 現在の上方向（重力の逆）
        const up = toCenter.scale(-1).normalize();
        
        // カメラの前方向を接平面に投影
        let forward = cameraForward.subtract(up.scale(BABYLON.Vector3.Dot(cameraForward, up)));
        if (forward.length() < 0.001) {
            // カメラが真上/真下を向いている場合のフォールバック
            forward = new BABYLON.Vector3(1, 0, 0);
            forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        }
        forward.normalize();
        
        // 右方向
        const right = BABYLON.Vector3.Cross(forward, up).normalize();
        
        // 移動方向を計算
        const moveDir = forward.scale(inputZ).add(right.scale(inputX));
        
        if (moveDir.length() < 0.001) {
            return currentPosition;
        }
        
        // 角速度（ラジアン）
        const angleSpeed = speed / this.planetRadius;
        
        // 移動方向周りに回転
        const rotationAxis = BABYLON.Vector3.Cross(up, moveDir.normalize());
        if (rotationAxis.length() > 0.001) {
            rotationAxis.normalize();
            
            // クォータニオンで回転
            const rotation = BABYLON.Quaternion.RotationAxis(rotationAxis, angleSpeed);
            
            // 現在位置を原点周りに回転
            let newPos = currentPosition.subtract(this.planetCenter);
            newPos = newPos.rotateByQuaternionToRef(rotation, newPos);
            newPos = newPos.add(this.planetCenter);
            
            // 半径を維持
            const newToCenter = this.planetCenter.subtract(newPos);
            const newRadius = newToCenter.length();
            if (Math.abs(newRadius - this.planetRadius) > 0.1) {
                newPos = this.planetCenter.subtract(newToCenter.normalize().scale(this.planetRadius));
            }
            
            return newPos;
        }
        
        return currentPosition;
    }
    
    // 上方向を取得
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.subtract(this.planetCenter).normalize();
    }
    
    // キャラクターの回転を計算
    calculateRotation(position: BABYLON.Vector3, moveDirection: BABYLON.Vector3): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        let forward = moveDirection;
        if (forward.length() < 0.001) {
            // デフォルトの前方向
            forward = new BABYLON.Vector3(0, 0, 1);
        }
        
        // 接平面に投影
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        if (forward.length() > 0.001) {
            forward.normalize();
        } else {
            forward = new BABYLON.Vector3(1, 0, 0);
            forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
            forward.normalize();
        }
        
        const matrix = BABYLON.Matrix.LookAtLH(
            BABYLON.Vector3.Zero(),
            forward,
            up
        );
        matrix.invert();
        
        return BABYLON.Quaternion.FromRotationMatrix(matrix);
    }
}