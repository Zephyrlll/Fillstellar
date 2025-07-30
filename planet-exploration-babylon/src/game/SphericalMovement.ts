import * as BABYLON from '@babylonjs/core';

export class SphericalMovement {
    private scene: BABYLON.Scene;
    private planetCenter: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private planetRadius: number = 100; // デフォルト値を設定
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    setPlanetData(center: BABYLON.Vector3, radius: number): void {
        this.planetCenter = center;
        this.planetRadius = radius;
    }
    
    // 位置から「上」方向を計算（惑星の中心から外向き）
    getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.subtract(this.planetCenter).normalize();
    }
    
    // 位置から「前」方向を計算（現在の向きと上方向に垂直）
    getForwardVector(position: BABYLON.Vector3, currentForward: BABYLON.Vector3): BABYLON.Vector3 {
        const up = this.getUpVector(position);
        // 前方向を上方向に垂直になるように調整
        let forward = currentForward.subtract(up.scale(BABYLON.Vector3.Dot(currentForward, up)));
        forward.normalize();
        return forward;
    }
    
    // 位置から「右」方向を計算
    getRightVector(position: BABYLON.Vector3, forward: BABYLON.Vector3): BABYLON.Vector3 {
        const up = this.getUpVector(position);
        return BABYLON.Vector3.Cross(forward, up).normalize();
    }
    
    // 球体表面での移動を計算
    moveOnSphere(
        currentPosition: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        distance: number
    ): BABYLON.Vector3 {
        if (moveDirection.length() === 0) {
            return currentPosition;
        }
        
        // デバッグ: 惑星半径が0の場合は警告
        if (this.planetRadius === 0) {
            console.error('[SPHERICAL_MOVEMENT] Planet radius is 0! This will cause problems.');
            return currentPosition;
        }
        
        // 現在の位置での座標系を取得
        const up = this.getUpVector(currentPosition);
        
        // 移動方向を球面に沿うように調整（上方向成分を除去）
        let tangentMove = moveDirection.subtract(up.scale(BABYLON.Vector3.Dot(moveDirection, up)));
        if (tangentMove.length() > 0) {
            tangentMove.normalize();
            tangentMove.scaleInPlace(distance);
        }
        
        // 球面上を移動
        const newPosition = currentPosition.add(tangentMove);
        
        // 惑星の中心からの距離を維持（球面に投影）
        const fromCenter = newPosition.subtract(this.planetCenter);
        const currentDistance = fromCenter.length();
        
        if (currentDistance > 0) {
            // 現在の高さを維持
            const currentHeight = currentPosition.subtract(this.planetCenter).length();
            
            // 正規化して現在の高さに調整
            fromCenter.normalize();
            return this.planetCenter.add(fromCenter.scale(currentHeight));
        }
        
        return newPosition;
    }
    
    // ジャンプの処理（球体の中心から離れる方向）
    applyJump(position: BABYLON.Vector3, jumpVelocity: number): BABYLON.Vector3 {
        const up = this.getUpVector(position);
        return up.scale(jumpVelocity);
    }
    
    // 重力の適用（球体の中心に向かう）
    applyGravity(
        position: BABYLON.Vector3,
        velocity: BABYLON.Vector3,
        gravity: number,
        deltaTime: number
    ): BABYLON.Vector3 {
        const up = this.getUpVector(position);
        // 重力は「上」の逆方向（中心に向かう）
        // gravityは負の値（-20）なので、-upを使って下向きにする
        const gravityDirection = up.scale(-1);
        return velocity.add(gravityDirection.scale(gravity * deltaTime));
    }
    
    // 地面との衝突判定
    checkGroundCollision(position: BABYLON.Vector3, surfaceHeight: number): {
        isGrounded: boolean;
        correctedPosition: BABYLON.Vector3;
    } {
        const fromCenter = position.subtract(this.planetCenter);
        const currentDistance = fromCenter.length();
        
        // 最小許容距離（地表の高さ）
        const minDistance = surfaceHeight;
        
        if (currentDistance <= minDistance) {
            // 地面に接触している
            const correctedPosition = this.planetCenter.add(fromCenter.normalize().scale(minDistance));
            return {
                isGrounded: true,
                correctedPosition: correctedPosition
            };
        }
        
        return {
            isGrounded: false,
            correctedPosition: position
        };
    }
    
    // キャラクターの向きを計算（球面に沿った回転）
    calculateCharacterRotation(
        position: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        currentRotation: BABYLON.Vector3
    ): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        // 基本の向き（上方向に合わせる）
        const defaultUp = BABYLON.Vector3.Up();
        let rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(defaultUp, up, new BABYLON.Quaternion());
        
        // 移動方向に基づく追加の回転
        if (moveDirection.length() > 0) {
            // 移動方向を球面に投影
            const tangentMove = moveDirection.subtract(up.scale(BABYLON.Vector3.Dot(moveDirection, up)));
            if (tangentMove.length() > 0) {
                tangentMove.normalize();
                
                // Y軸周りの回転角度を計算
                const angle = Math.atan2(tangentMove.x, tangentMove.z);
                const yRotation = BABYLON.Quaternion.RotationAxis(up, angle);
                
                // 回転を合成
                rotationQuaternion = rotationQuaternion.multiply(yRotation);
            }
        }
        
        return rotationQuaternion;
    }
    
    // 球面座標系での方向転換
    rotateDirectionAroundUp(
        direction: BABYLON.Vector3,
        up: BABYLON.Vector3,
        angle: number
    ): BABYLON.Vector3 {
        const rotation = BABYLON.Quaternion.RotationAxis(up, angle);
        return direction.rotateByQuaternionToRef(rotation, new BABYLON.Vector3());
    }
}