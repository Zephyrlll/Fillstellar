import * as BABYLON from '@babylonjs/core';

/**
 * 安定した球面移動システム
 * マルチプレイヤー対応を考慮した絶対座標系での実装
 */
export class StableSphericalMovement {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    // 移動制限（極付近の不安定さを回避）
    private maxLatitude: number = 75; // 度単位（±75度まで移動可能）
    
    constructor(planetCenter: BABYLON.Vector3, planetRadius: number) {
        this.planetCenter = planetCenter;
        this.planetRadius = planetRadius;
    }
    
    /**
     * 安定した球面上の移動を計算
     * @param currentPosition 現在位置
     * @param moveDirection 移動方向（接平面上の単位ベクトル）
     * @param distance 移動距離
     * @returns 新しい位置
     */
    moveOnSphere(
        currentPosition: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        distance: number
    ): BABYLON.Vector3 {
        // 現在位置から中心へのベクトル
        const fromCenter = currentPosition.subtract(this.planetCenter);
        const currentRadius = fromCenter.length();
        
        // 現在の緯度を計算
        const normalizedPos = fromCenter.normalize();
        const latitude = Math.asin(normalizedPos.y) * 180 / Math.PI;
        
        // 極付近では移動を制限
        if (Math.abs(latitude) > this.maxLatitude) {
            // 極から離れる方向への移動のみ許可
            const awayFromPole = new BABYLON.Vector3(normalizedPos.x, 0, normalizedPos.z).normalize();
            const dot = BABYLON.Vector3.Dot(moveDirection, awayFromPole);
            if (dot < 0) {
                // 極に向かう移動は禁止
                return currentPosition;
            }
        }
        
        // 接平面での移動を球面に投影
        // より安定したアルゴリズムを使用
        const up = fromCenter.normalize();
        const rotationAxis = BABYLON.Vector3.Cross(up, moveDirection);
        
        if (rotationAxis.length() < 0.001) {
            // 移動方向が上向きまたは下向きの場合
            return currentPosition;
        }
        
        rotationAxis.normalize();
        
        // 角度を計算（小さな角度で安定性を保つ）
        const angle = distance / currentRadius;
        const safeAngle = Math.min(angle, 0.1); // 適度な角度制限に戻す
        
        // クォータニオンで回転
        const rotation = BABYLON.Quaternion.RotationAxis(rotationAxis, safeAngle);
        const newFromCenter = fromCenter.applyRotationQuaternion(rotation);
        
        // 半径を維持
        const newPosition = this.planetCenter.add(newFromCenter.normalize().scale(currentRadius));
        
        // 新しい位置の緯度をチェック
        const newNormalizedPos = newFromCenter.normalize();
        const newLatitude = Math.asin(newNormalizedPos.y) * 180 / Math.PI;
        
        if (Math.abs(newLatitude) > this.maxLatitude) {
            // 制限を超えた場合は元の位置を返す
            return currentPosition;
        }
        
        return newPosition;
    }
    
    /**
     * 高さを調整（地形に沿わせる）
     */
    adjustHeight(position: BABYLON.Vector3, targetHeight: number): BABYLON.Vector3 {
        const fromCenter = position.subtract(this.planetCenter);
        const direction = fromCenter.normalize();
        const targetRadius = this.planetRadius + targetHeight;
        
        return this.planetCenter.add(direction.scale(targetRadius));
    }
    
    /**
     * 位置が移動可能範囲内かチェック
     */
    isValidPosition(position: BABYLON.Vector3): boolean {
        const fromCenter = position.subtract(this.planetCenter);
        const normalizedPos = fromCenter.normalize();
        const latitude = Math.asin(normalizedPos.y) * 180 / Math.PI;
        
        return Math.abs(latitude) <= this.maxLatitude;
    }
    
    /**
     * デバッグ用：現在の緯度経度を取得
     */
    getLatLong(position: BABYLON.Vector3): { latitude: number; longitude: number } {
        const fromCenter = position.subtract(this.planetCenter);
        const normalizedPos = fromCenter.normalize();
        
        const latitude = Math.asin(normalizedPos.y) * 180 / Math.PI;
        const longitude = Math.atan2(normalizedPos.x, normalizedPos.z) * 180 / Math.PI;
        
        return { latitude, longitude };
    }
}