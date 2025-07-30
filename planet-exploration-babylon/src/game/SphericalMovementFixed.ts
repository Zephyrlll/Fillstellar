import * as BABYLON from '@babylonjs/core';

/**
 * 実績のある球面移動システム
 * 参考：Three.js/Babylon.jsの球面ゲーム実装例
 */
export class SphericalMovementFixed {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    constructor(center: BABYLON.Vector3, radius: number) {
        this.planetCenter = center;
        this.planetRadius = radius;
    }
    
    /**
     * 球面上での移動を計算
     * @param currentPos 現在位置
     * @param horizontalInput 水平入力 (-1 ~ 1)
     * @param verticalInput 垂直入力 (-1 ~ 1)
     * @param deltaTime フレーム時間
     * @returns 新しい位置
     */
    moveOnSphere(
        currentPos: BABYLON.Vector3,
        horizontalInput: number,
        verticalInput: number,
        deltaTime: number
    ): BABYLON.Vector3 {
        // 球面座標に変換
        const offset = currentPos.subtract(this.planetCenter);
        const r = offset.length();
        
        // 現在の球面座標を取得
        let theta = Math.atan2(offset.x, offset.z); // 経度
        let phi = Math.acos(offset.y / r); // 緯度（0 = 北極, π = 南極）
        
        // 移動速度（角速度）を大幅に減らす
        const angularSpeed = 0.3 * deltaTime; // ラジアン/秒（2.0から0.3に減少）
        
        // 球面座標での移動
        theta += horizontalInput * angularSpeed;
        phi += verticalInput * angularSpeed;
        
        // phiの範囲を制限（極点を少し避ける）
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        
        // 球面座標から直交座標に変換
        const x = this.planetRadius * Math.sin(phi) * Math.sin(theta);
        const y = this.planetRadius * Math.cos(phi);
        const z = this.planetRadius * Math.sin(phi) * Math.cos(theta);
        
        return this.planetCenter.add(new BABYLON.Vector3(x, y, z));
    }
    
    /**
     * カメラ相対の移動
     */
    moveWithCamera(
        currentPos: BABYLON.Vector3,
        inputX: number,
        inputZ: number,
        cameraAlpha: number,
        deltaTime: number
    ): BABYLON.Vector3 {
        // カメラの角度を考慮した入力変換
        const rotatedX = inputX * Math.cos(cameraAlpha) - inputZ * Math.sin(cameraAlpha);
        const rotatedZ = inputX * Math.sin(cameraAlpha) + inputZ * Math.cos(cameraAlpha);
        
        return this.moveOnSphere(currentPos, rotatedX, rotatedZ, deltaTime);
    }
    
    /**
     * 上方向ベクトルを取得
     */
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.subtract(this.planetCenter).normalize();
    }
    
    /**
     * キャラクターの回転を計算（地面に対して垂直に立つ）
     */
    calculateRotation(position: BABYLON.Vector3, moveDirection: BABYLON.Vector3, currentForward?: BABYLON.Vector3): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        // 前方向を決定
        let forward: BABYLON.Vector3;
        
        if (moveDirection && moveDirection.length() > 0.01) {
            // 移動方向を接平面に投影
            forward = moveDirection.subtract(up.scale(BABYLON.Vector3.Dot(moveDirection, up)));
            if (forward.length() < 0.001) {
                forward = currentForward || new BABYLON.Vector3(0, 0, 1);
            }
        } else {
            // 現在の前方向を維持
            forward = currentForward || new BABYLON.Vector3(0, 0, 1);
        }
        
        // 前方向を接平面に投影して正規化
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        forward.normalize();
        
        // LookAt行列を作成
        const lookAtMatrix = BABYLON.Matrix.LookAtLH(
            BABYLON.Vector3.Zero(),
            forward,
            up
        );
        lookAtMatrix.invert();
        
        return BABYLON.Quaternion.FromRotationMatrix(lookAtMatrix);
    }
}