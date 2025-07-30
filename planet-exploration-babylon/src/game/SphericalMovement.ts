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
    
    // 球体表面での移動を計算（Unity風 RotateAround方式）
    moveOnSphere(
        currentPosition: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        distance: number
    ): BABYLON.Vector3 {
        if (moveDirection.length() === 0 || distance === 0) {
            return currentPosition;
        }
        
        // 現在位置から惑星中心へのベクトル
        const toCenter = this.planetCenter.subtract(currentPosition);
        const radius = toCenter.length();
        
        if (radius < 0.001) {
            console.error('[SPHERICAL] Position too close to center!');
            return currentPosition;
        }
        
        // 現在の上方向（重力の逆）
        const up = currentPosition.subtract(this.planetCenter).normalize();
        
        // 移動方向を接平面に投影して正規化
        const tangentMove = moveDirection.subtract(
            up.scale(BABYLON.Vector3.Dot(moveDirection, up))
        );
        
        if (tangentMove.length() < 0.001) {
            return currentPosition;
        }
        tangentMove.normalize();
        
        // Unity風の実装：2軸の回転を別々に計算
        let newPosition = currentPosition.clone();
        
        // 前後移動（Forward/Backward）
        const forward = tangentMove;
        const forwardAmount = BABYLON.Vector3.Dot(moveDirection, forward) * distance;
        if (Math.abs(forwardAmount) > 0.001) {
            // 回転軸は右方向（forward × up）
            const rightAxis = BABYLON.Vector3.Cross(up, forward).normalize();
            const forwardAngle = forwardAmount / radius;
            
            // 惑星中心を軸に回転
            const rotationQuat = BABYLON.Quaternion.RotationAxis(rightAxis, forwardAngle);
            newPosition = newPosition.subtract(this.planetCenter);
            newPosition = newPosition.rotateByQuaternionToRef(rotationQuat, newPosition);
            newPosition = newPosition.add(this.planetCenter);
        }
        
        // 左右移動（Strafe）
        const right = BABYLON.Vector3.Cross(forward, up).normalize();
        const rightAmount = BABYLON.Vector3.Dot(moveDirection, right) * distance;
        if (Math.abs(rightAmount) > 0.001) {
            // 回転軸は前方向
            const strafeAngle = rightAmount / radius;
            
            // 惑星中心を軸に回転
            const rotationQuat = BABYLON.Quaternion.RotationAxis(forward, -strafeAngle);
            newPosition = newPosition.subtract(this.planetCenter);
            newPosition = newPosition.rotateByQuaternionToRef(rotationQuat, newPosition);
            newPosition = newPosition.add(this.planetCenter);
        }
        
        // 半径を確実に維持
        const finalFromCenter = newPosition.subtract(this.planetCenter);
        const finalRadius = finalFromCenter.length();
        if (Math.abs(finalRadius - radius) > 0.001) {
            finalFromCenter.scaleInPlace(radius / finalRadius);
            newPosition = this.planetCenter.add(finalFromCenter);
        }
        
        // デバッグ
        if (Math.abs(up.y) < 0.5) { // 赤道付近
            const newUp = newPosition.subtract(this.planetCenter).normalize();
            const oldLat = Math.asin(up.y) * 180 / Math.PI;
            const newLat = Math.asin(newUp.y) * 180 / Math.PI;
            console.log(`[SPHERICAL-UNITY] Lat: ${oldLat.toFixed(1)}° -> ${newLat.toFixed(1)}°`);
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
        const gravityDirection = up.scale(-1);
        // gravityの絶対値を使用して、常に下向きの力にする
        return velocity.add(gravityDirection.scale(Math.abs(gravity) * deltaTime));
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
    
    // キャラクターの向きを計算（前方ベクトル維持方式）
    calculateCharacterRotation(
        position: BABYLON.Vector3,
        moveDirection: BABYLON.Vector3,
        currentForward: BABYLON.Vector3 // 前のフレームのforwardベクトルを受け取る
    ): BABYLON.Quaternion {
        const up = this.getUpVector(position);

        let forward: BABYLON.Vector3;

        if (moveDirection.length() > 0.01) {
            // 移動方向がある場合、それを新しい前方ベクトルとする
            forward = moveDirection.clone();
        } else {
            // 移動していない場合、現在の前方ベクトルを維持する
            forward = currentForward.clone();
        }

        // 前方ベクトルを地面（接平面）に投影して正規化
        forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up))).normalize();

        if (forward.length() < 0.001) {
            // まれに前方ベクトルが上方向と完全に一致した場合のフォールバック
            // 現在の右ベクトルを計算
            const right = BABYLON.Vector3.Cross(up, currentForward).normalize();
            // 新しい前方ベクトルを再計算
            forward = BABYLON.Vector3.Cross(right, up).normalize();
        }

        // LookAt行列からクォータニオンを生成
        const matrix = BABYLON.Matrix.LookAtLH(
            BABYLON.Vector3.Zero(),
            forward,
            up
        );
        matrix.invert();

        return BABYLON.Quaternion.FromRotationMatrix(matrix);
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