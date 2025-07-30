import * as BABYLON from '@babylonjs/core';

/**
 * 最もシンプルな球面移動
 * 球面座標系を直接操作
 */
export class SphericalMovementSimplest {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    constructor(center: BABYLON.Vector3, radius: number) {
        this.planetCenter = center;
        this.planetRadius = radius;
    }
    
    /**
     * 球面上での移動（球面座標系を直接操作）
     */
    moveOnSphere(
        currentPos: BABYLON.Vector3,
        inputX: number,  // 左右入力 (-1 ~ 1)
        inputZ: number,  // 前後入力 (-1 ~ 1) 
        cameraAlpha: number, // カメラの水平角度
        deltaTime: number
    ): BABYLON.Vector3 {
        if (Math.abs(inputX) < 0.01 && Math.abs(inputZ) < 0.01) {
            return currentPos;
        }
        
        // 現在位置を球面座標に変換
        const offset = currentPos.subtract(this.planetCenter);
        const r = this.planetRadius; // 半径は固定
        
        // 球面座標（数学的な定義）
        // θ (theta) = 経度（XZ平面での角度）
        // φ (phi) = 緯度（Y軸からの角度、0=北極、π=南極）
        let theta = Math.atan2(offset.z, offset.x);
        let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / r))); // クランプして安全に
        
        // カメラの向きを考慮した移動
        const moveSpeed = 0.5 * deltaTime; // 速度を下げて安定性を優先
        
        // カメラの向きに基づいて入力を回転
        const rotatedX = inputX * Math.cos(cameraAlpha) - inputZ * Math.sin(cameraAlpha);
        const rotatedZ = inputX * Math.sin(cameraAlpha) + inputZ * Math.cos(cameraAlpha);
        
        // 球面座標での移動
        theta += rotatedX * moveSpeed;
        phi -= rotatedZ * moveSpeed; // 北向きが正
        
        // φの範囲制限を緩める（ほぼ完全な球面移動）
        // 極点での特異点を避けるため、非常に小さなマージンを設ける
        phi = Math.max(0.001, Math.min(Math.PI - 0.001, phi));
        
        // 球面座標から直交座標に変換
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        
        // NaNチェック
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            console.error('[SPHERICAL] NaN detected!', { x, y, z, theta, phi });
            return currentPos; // 現在位置を返す
        }
        
        return this.planetCenter.add(new BABYLON.Vector3(x, y, z));
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
    calculateRotation(position: BABYLON.Vector3, inputX: number, inputZ: number, cameraAlpha: number): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        // デフォルトの前方向（北向き）
        let forward = new BABYLON.Vector3(0, 0, -1);
        
        if (Math.abs(inputX) > 0.01 || Math.abs(inputZ) > 0.01) {
            // カメラの向きに基づいて前方向を計算
            const angle = cameraAlpha;
            forward = new BABYLON.Vector3(
                Math.sin(angle) * inputZ,
                0,
                Math.cos(angle) * inputZ
            );
            
            const right = new BABYLON.Vector3(
                Math.cos(angle) * inputX,
                0,
                -Math.sin(angle) * inputX
            );
            
            forward = forward.add(right);
        }
        
        // 接平面に投影
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        if (forward.length() > 0.001) {
            forward.normalize();
        } else {
            // フォールバック
            forward = new BABYLON.Vector3(1, 0, 0);
            forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
            forward.normalize();
        }
        
        // 右ベクトル
        const right = BABYLON.Vector3.Cross(up, forward).normalize();
        
        // 前方向を再計算
        forward = BABYLON.Vector3.Cross(right, up).normalize();
        
        // 回転行列
        const rotMatrix = BABYLON.Matrix.Identity();
        rotMatrix.m[0] = right.x; rotMatrix.m[1] = right.y; rotMatrix.m[2] = right.z;
        rotMatrix.m[4] = up.x; rotMatrix.m[5] = up.y; rotMatrix.m[6] = up.z;
        rotMatrix.m[8] = forward.x; rotMatrix.m[9] = forward.y; rotMatrix.m[10] = forward.z;
        
        return BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
    }
}