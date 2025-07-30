import * as BABYLON from '@babylonjs/core';
import { AnimatedAvatar } from './AnimatedAvatar';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { FirstPersonCamera } from './FirstPersonCamera';
// import { SphericalMovement } from './SphericalMovement';
// import { SphericalMovementSimple } from './SphericalMovementSimple';
// import { SphericalMovementFixed } from './SphericalMovementFixed';
// import { SphericalMovementWorking } from './SphericalMovementWorking';
// import { SphericalMovementFinal } from './SphericalMovementFinal';
// import { SphericalMovementSimplest } from './SphericalMovementSimplest';
import { ProceduralTerrain } from './ProceduralTerrain';
import { DebugTracker } from './DebugTracker';

export class CharacterController {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    private avatar: AnimatedAvatar | null = null;
    private thirdPersonCamera: ThirdPersonCamera | null = null;
    private firstPersonCamera: FirstPersonCamera | null = null;
    // private sphericalMovement: SphericalMovement;
    // private sphericalMovementSimple: SphericalMovementSimple | null = null;
    // private sphericalMovementFixed: SphericalMovementFixed | null = null;
    // private sphericalMovementWorking: SphericalMovementWorking | null = null;
    // private sphericalMovementFinal: SphericalMovementFinal | null = null;
    // private sphericalMovementSimplest: SphericalMovementSimplest | null = null;
    private planetCenter: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private planetRadius: number = 100;
    private terrain: ProceduralTerrain | null = null;
    
    // 移動制御
    private jumpSpeed: number = 5;  // ジャンプ速度を調整
    private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private isGrounded: boolean = true;
    private gravity: number = -9.8; // 重力加速度
    
    // 入力状態
    private keys: { [key: string]: boolean } = {};
    
    // ビューモード
    private isFirstPerson: boolean = false;
    private fpsCameraOffset: BABYLON.Vector3 = new BABYLON.Vector3(0, 1.6, 0); // 頭の位置
    private forwardVector: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 1); // キャラクターの前方ベクトルを保持
    
    // デバッグ用
    private isFirstUpdate: boolean = true;
    private updateCount: number = 0;
    private initialPosition: BABYLON.Vector3 | null = null;
    private hasSpawned: boolean = false;
    
    constructor(scene: BABYLON.Scene, camera: BABYLON.UniversalCamera, canvas: HTMLCanvasElement) {
        const tracker = DebugTracker.getInstance();
        tracker.log('CHARACTER', 'Constructor called');
        
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        
        // アバターは作成しない（spawnで作成する）
        
        // 球体移動システムを設定
        // this.sphericalMovement = new SphericalMovement(scene);
        // デフォルトの惑星データを設定
        // this.sphericalMovement.setPlanetData(BABYLON.Vector3.Zero(), 100);
        
        this.setupControls();
        
        // デバッグ: 位置監視を開始
        this.startPositionMonitoring();
    }
    
    private startPositionMonitoring(): void {
        // 1秒ごとにアバターの位置を監視
        setInterval(() => {
            if (this.avatar && this.initialPosition) {
                const pos = this.avatar.getRootMesh().position;
                const distance = pos.length();
                if (distance < 10) {
                    console.error(`[CHARACTER] CRITICAL: Avatar at origin! Position: ${pos}, Distance: ${distance}`);
                    // 緊急リセット
                    console.error('[CHARACTER] EMERGENCY RESET TO INITIAL POSITION!');
                    this.avatar.getRootMesh().position.copyFrom(this.initialPosition);
                } else if (distance < 50) {
                    console.warn(`[CHARACTER] WARNING: Avatar too close to origin! Position: ${pos}, Distance: ${distance}`);
                }
            }
        }, 1000);
    }
    
    private setupControls(): void {
        // キーボードイベント
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // スペースキーでジャンプ
            if (e.key === ' ' && this.isGrounded) {
                console.log('[CHARACTER] Jump initiated!');
                if (this.terrain && this.terrain.isSpherical() && this.avatar) {
                    // 球体地形：上方向にジャンプ
                    const jumpVel = this.applyJump(
                        this.avatar.getRootMesh().position,
                        this.jumpSpeed
                    );
                    this.velocity = jumpVel;
                } else {
                    // 平面地形：Y軸にジャンプ
                    this.velocity.y = this.jumpSpeed;
                }
                this.isGrounded = false;
                e.preventDefault(); // スペースキーのデフォルト動作を防ぐ
            }
            
            // Vキーで視点切り替え
            if (e.key.toLowerCase() === 'v') {
                this.toggleViewMode();
            }
            
            // Gキーでデバッグビュー
            if (e.key.toLowerCase() === 'g') {
                console.log('[CHARACTER] Debug View Activated');
                console.log(`[CHARACTER] Avatar position: ${this.avatar?.getRootMesh().position}`);
                console.log(`[CHARACTER] Avatar distance from center: ${this.avatar?.getRootMesh().position.length()}`);
                console.log(`[CHARACTER] Camera position: ${this.camera.position}`);
                console.log(`[CHARACTER] Is spherical terrain: ${this.terrain?.isSpherical()}`);
                console.log(`[CHARACTER] Planet radius: ${this.terrain?.getPlanetRadius()}`);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    spawn(position: BABYLON.Vector3): void {
        const tracker = DebugTracker.getInstance();
        tracker.log('CHARACTER', `spawn() called with position: ${position} (distance: ${position.length()})`);
        tracker.trackAvatarPosition(position, 'CharacterController.spawn(input)');
        
        // ポジションの検証
        if (position.length() < 10) {
            console.error('[CHARACTER] INVALID SPAWN POSITION! Too close to origin:', position);
            // 強制的に適切な位置に修正
            const planetRadius = this.terrain ? this.terrain.getPlanetRadius() : 100;
            position = new BABYLON.Vector3(0, planetRadius + 5, 0);
            console.warn('[CHARACTER] Corrected spawn position to:', position);
        }
        
        // 既存のアバターがあれば削除
        if (this.avatar) {
            this.avatar.dispose();
            this.avatar = null;
        }
        
        // アニメーション付きアバターを作成
        this.avatar = new AnimatedAvatar(this.scene, position.clone());
        console.log(`[CHARACTER] AnimatedAvatar created at: ${this.avatar.getPosition()}`);
        
        // カメラシステムを設定
        if (this.avatar) {
            this.thirdPersonCamera = new ThirdPersonCamera(this.scene, this.camera, this.canvas, this.avatar.getRootMesh());
            this.firstPersonCamera = new FirstPersonCamera(this.scene, this.camera, this.canvas);
        }
        
        // 初期状態を設定（必ずcloneする）
        this.initialPosition = position.clone();
        this.hasSpawned = true;
        this.velocity = BABYLON.Vector3.Zero();
        this.isGrounded = false;
        
        // 球体地形の場合、位置を確実に球の外側に調整
        if (this.terrain && this.terrain.isSpherical()) {
            const planetRadius = this.terrain.getPlanetRadius();
            console.log(`[CHARACTER] Planet radius: ${planetRadius}`);
            
            // 球体移動システムに惑星データを設定
            // this.sphericalMovement.setPlanetData(BABYLON.Vector3.Zero(), planetRadius);
            // this.sphericalMovementSimple = new SphericalMovementSimple(BABYLON.Vector3.Zero(), planetRadius);
            // this.sphericalMovementFixed = new SphericalMovementFixed(BABYLON.Vector3.Zero(), planetRadius);
            // this.sphericalMovementWorking = new SphericalMovementWorking(this.scene, BABYLON.Vector3.Zero(), planetRadius);
            // this.sphericalMovementFinal = new SphericalMovementFinal(BABYLON.Vector3.Zero(), planetRadius);
            // this.sphericalMovementSimplest = new SphericalMovementSimplest(BABYLON.Vector3.Zero(), planetRadius);
            console.log(`[CHARACTER] Set planet data with radius: ${planetRadius}`);
            this.planetRadius = planetRadius;
            
            // 位置がすでに正しい半径にあるか確認
            const currentDistance = position.length();
            console.log(`[CHARACTER] Current spawn distance from center: ${currentDistance}`);
            
            // 即座に位置を確認
            const immediateCheck = this.avatar.getRootMesh().position;
            console.log(`[CHARACTER] IMMEDIATE position check: ${immediateCheck} (distance: ${immediateCheck.length()})`);
            
            // 設定直徎の位置を確認
            const actualPos = this.avatar.getRootMesh().position;
            tracker.log('CHARACTER', `Position verification - Expected: ${position}, Actual: ${actualPos}`);
            tracker.trackAvatarPosition(actualPos, 'CharacterController.spawn(after setPosition)');
            
            // 上方向を取得
            const up = this.terrain.getUpVector(position);
            console.log(`[CHARACTER] Up vector: ${up}`);
            
            // キャラクターの回転を設定
            const rotation = this.calculateCharacterRotation(
                position,
                BABYLON.Vector3.Zero(),
                this.forwardVector // ★修正：初期の前方ベクトルを使用
            );
            this.avatar.getRootMesh().rotationQuaternion = rotation;
            this.forwardVector = this.avatar.getRootMesh().forward; // ★追加：前方ベクトルを更新
            
            // カメラを適切な位置に配置
            // キャラクターの後ろ斜め上から見下ろす位置
            const cameraDistance = 15;
            const cameraHeight = 8;
            
            // カメラの初期方向（赤道での南向き）
            let cameraDirection = new BABYLON.Vector3(0, 0, -1);
            // 球面に投影
            cameraDirection = cameraDirection.subtract(up.scale(BABYLON.Vector3.Dot(cameraDirection, up)));
            cameraDirection.normalize();
            
            const cameraOffset = up.scale(cameraHeight).subtract(cameraDirection.scale(cameraDistance));
            this.camera.position = position.add(cameraOffset);
            
            // カメラの上方向を設定
            this.camera.upVector = up;
            
            console.log(`[CHARACTER] Final character position: ${this.avatar.getRootMesh().position}`);
            console.log(`[CHARACTER] Final camera position: ${this.camera.position}`);
            
            
            
            // 初期速度をゼロに
            this.velocity = BABYLON.Vector3.Zero();
            this.isGrounded = false; // 空中からスタート
        } else {
            // 平面地形の場合
            console.log(`[CHARACTER] Not spherical terrain, position already set at: ${position}`);
            this.camera.position = position.add(new BABYLON.Vector3(0, 3, -8));
        }
        
        // 最終確認
        const finalPos = this.avatar.getRootMesh().position;
        console.log(`[CHARACTER] END OF SPAWN - Final position: ${finalPos} (distance: ${finalPos.length()})`);
        if (finalPos.length() < 1) {
            console.error(`[CHARACTER] CRITICAL: Avatar still at origin after spawn!`);
        }
    }
    
    update(deltaTime: number): void {
        // スポーンされるまで、またはアバターがない場合はupdateを実行しない
        if (!this.hasSpawned || !this.avatar) {
            return;
        }
        
        this.updateCount++;
        
        const currentPos = this.avatar.getRootMesh().position.clone();
        const isSpherical = this.terrain && this.terrain.isSpherical();
        
        // 球体地形の場合の処理
        if (isSpherical) {
            const planetRadius = this.terrain!.getPlanetRadius();
            const characterHeight = 0.9; // キャラクターの足元から重心までの高さ（脚の半分）
            const targetRadius = planetRadius + characterHeight;
            
            // 位置が原点に近すぎる場合は初期位置を使用
            if (currentPos.length() < 1) {
                console.warn('[CHARACTER] Position too close to origin, using initial position');
                if (this.initialPosition) {
                    currentPos.copyFrom(this.initialPosition);
                    this.avatar.getRootMesh().position.copyFrom(this.initialPosition);
                } else {
                    // 緊急用：Y軸上の位置に設定
                    currentPos.set(0, targetRadius, 0);
                    this.avatar.getRootMesh().position.copyFrom(currentPos);
                }
            }
            
            // 現在の位置から上方向を計算
            const up = this.getUpVector(currentPos);
            
            // 重力を適用（球体の中心に向かって）
            if (!this.isGrounded) {
                this.velocity = this.applyGravity(
                    currentPos,
                    this.velocity,
                    this.gravity,
                    deltaTime
                );
            }
            
            // ジャンプによる移動を適用
            if (this.velocity.length() > 0.01) {  // 小さな値は無視
                const jumpMovement = this.velocity.scale(deltaTime);
                currentPos.addInPlace(jumpMovement);
                this.avatar.getRootMesh().position.copyFrom(currentPos);
                
                // ジャンプ/落下アニメーション
                const upVelocity = BABYLON.Vector3.Dot(this.velocity, up);
                if (upVelocity > 0.5) {
                    this.avatar.setState('jump');
                } else if (!this.isGrounded) {
                    this.avatar.setState('fall');
                }
                
                // デバッグ出力
                if (this.updateCount % 10 === 0) {  // 10フレームごと
                    console.log(`[CHARACTER] Jump - Velocity: ${this.velocity.length().toFixed(2)}, Height: ${(currentPos.length() - planetRadius).toFixed(2)}`);
                }
            }
            
            // 地面との衝突判定
            const currentDistance = currentPos.length();
            const groundTolerance = 0.1; // 地面判定の許容誤差
            
            if (currentDistance <= targetRadius + groundTolerance) {
                // 地面に接触または近い
                if (currentDistance < targetRadius) {
                    // 地面の下にいる場合は押し上げる
                    const correctedPos = currentPos.clone().normalize().scale(targetRadius);
                    this.avatar.getRootMesh().position.copyFrom(correctedPos);
                    currentPos.copyFrom(correctedPos);
                }
                
                // 下向きの速度がある場合のみ着地とみなす
                const downwardVelocity = BABYLON.Vector3.Dot(this.velocity, currentPos.clone().normalize().scale(-1));
                if (downwardVelocity > 0) {
                    this.velocity = BABYLON.Vector3.Zero();
                    this.isGrounded = true;
                    this.avatar.setState('land'); // 着地アニメーション
                    console.log('[CHARACTER] Landed on ground');
                } else if (Math.abs(currentDistance - targetRadius) < groundTolerance) {
                    this.isGrounded = true;
                }
            } else {
                this.isGrounded = false;
            }
            
            // 移動入力を取得（速度を調整）
            const baseSpeed = 5.0; // 移動速度を上げる
            const runMultiplier = this.keys['shift'] ? 2.0 : 1.0; // Shiftで2倍速
            const moveSpeed = baseSpeed * runMultiplier;
            let movement = BABYLON.Vector3.Zero();
            
            if (this.keys['w']) movement.z = moveSpeed * deltaTime;   // 前進
            if (this.keys['s']) movement.z = -moveSpeed * deltaTime;  // 後退
            if (this.keys['a']) movement.x = -moveSpeed * deltaTime;  // 左
            if (this.keys['d']) movement.x = moveSpeed * deltaTime;   // 右
            
            // 移動がある場合
            if (movement.length() > 0 && this.thirdPersonCamera) {
                // シンプルな実装：カメラ方向を基準に移動
                const cameraForward = this.thirdPersonCamera.getCameraDirection();
                const cameraRight = this.thirdPersonCamera.getCameraRight();
                
                // 入力に基づいて移動ベクトルを計算
                let moveVector = BABYLON.Vector3.Zero();
                if (this.keys['w']) moveVector.addInPlace(cameraForward);
                if (this.keys['s']) moveVector.subtractInPlace(cameraForward);
                if (this.keys['a']) moveVector.subtractInPlace(cameraRight);
                if (this.keys['d']) moveVector.addInPlace(cameraRight);
                
                if (moveVector.length() > 0.001) {
                    moveVector.normalize();
                    
                    // 現在位置の法線（上方向）
                    const fromCenter = currentPos.subtract(this.planetCenter);
                    const up = fromCenter.normalize();
                    
                    // 移動ベクトルを接平面に投影
                    const tangentMove = moveVector.subtract(up.scale(BABYLON.Vector3.Dot(moveVector, up)));
                    tangentMove.normalize();
                    
                    // 回転軸を計算（現在位置ベクトルと移動方向の外積）
                    const axis = BABYLON.Vector3.Cross(fromCenter, tangentMove);
                    axis.normalize();
                    
                    // 角速度
                    const angle = moveSpeed * deltaTime / planetRadius;
                    
                    // 回転を適用（惑星中心を基準に）
                    const rotation = BABYLON.Quaternion.RotationAxis(axis, angle);
                    let newFromCenter = fromCenter.clone();
                    newFromCenter = newFromCenter.applyRotationQuaternion(rotation);
                    
                    // 半径を維持
                    newFromCenter.normalize();
                    newFromCenter.scaleInPlace(targetRadius);
                    
                    // 最終位置（惑星中心を加算）
                    const newPos = this.planetCenter.add(newFromCenter);
                    this.avatar.getRootMesh().position = newPos;
                }
                
                // キャラクターの回転を更新（地面に垂直に立つ）
                const avatarPos = this.avatar.getRootMesh().position;
                const avatarUp = avatarPos.subtract(this.planetCenter).normalize();
                
                // 移動方向またはカメラ方向を前方向に
                let forward = moveVector.length() > 0.001 ? moveVector : cameraForward;
                forward = forward.subtract(avatarUp.scale(BABYLON.Vector3.Dot(forward, avatarUp)));
                if (forward.length() > 0.001) {
                    forward.normalize();
                    
                    const right = BABYLON.Vector3.Cross(avatarUp, forward);
                    const lookAt = BABYLON.Matrix.LookAtLH(BABYLON.Vector3.Zero(), forward, avatarUp);
                    lookAt.invert();
                    
                    this.avatar.getRootMesh().rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(lookAt);
                }
                
                // 移動アニメーションの設定
                if (this.isGrounded) {
                    if (this.keys['shift']) {
                        this.avatar.setState('run', moveSpeed);
                    } else {
                        this.avatar.setState('walk', moveSpeed);
                    }
                }
            } else {
                // 移動していない場合でも地面にいる時のみ高さを維持
                if (this.isGrounded && currentPos.length() > 0.1) {
                    const currentDistance = currentPos.length();
                    const distanceDiff = targetRadius - currentDistance;
                    
                    // 大きな差がある場合のみ調整（より寛容に）
                    if (Math.abs(distanceDiff) > 0.5) {
                        // Lerpを使ってスムーズに調整
                        const adjustedPos = currentPos.clone().normalize().scale(targetRadius);
                        const lerpFactor = 0.02; // より遅い補間（0.02）
                        this.avatar.getRootMesh().position = BABYLON.Vector3.Lerp(
                            this.avatar.getRootMesh().position,
                            adjustedPos,
                            lerpFactor
                        );
                    }
                    
                    // アイドルアニメーション
                    if (!this.avatar['currentState'] || this.avatar['currentState'] === 'walk' || this.avatar['currentState'] === 'run') {
                        this.avatar.setState('idle');
                    }
                }
                
                // 移動していない場合でも、常に地面に対して垂直になるように回転を更新
                const avatarPos = this.avatar.getRootMesh().position;
                const avatarUp = avatarPos.subtract(this.planetCenter).normalize();
                
                // 現在の前方向を維持、または初期値を使用
                let forward = this.forwardVector || new BABYLON.Vector3(0, 0, 1);
                forward = forward.subtract(avatarUp.scale(BABYLON.Vector3.Dot(forward, avatarUp)));
                if (forward.length() > 0.001) {
                    forward.normalize();
                    
                    const lookAt = BABYLON.Matrix.LookAtLH(BABYLON.Vector3.Zero(), forward, avatarUp);
                    lookAt.invert();
                    
                    this.avatar.getRootMesh().rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(lookAt);
                }
            }
            
            // 定期的なステータス出力
            if (this.updateCount % 60 === 0) {
                const pos = this.avatar.getRootMesh().position;
                const distance = pos.length();
                const lat = Math.asin(pos.y / distance) * 180 / Math.PI;
                const lon = Math.atan2(pos.z, pos.x) * 180 / Math.PI;
                console.log(`[CHARACTER] Pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
                console.log(`[CHARACTER] Distance: ${distance.toFixed(2)}, Lat: ${lat.toFixed(1)}°, Lon: ${lon.toFixed(1)}°`);
                const theta = Math.atan2(pos.z, pos.x) * 180 / Math.PI;
                const phi = Math.acos(pos.y / pos.length()) * 180 / Math.PI;
                console.log(`[CHARACTER] Spherical: theta=${theta.toFixed(1)}°, phi=${phi.toFixed(1)}° (0°=North Pole, 90°=Equator)`);
            }
        } else {
            // 平面地形の場合（既存の処理）
            const moveSpeed = 10;
            let simpleMovement = BABYLON.Vector3.Zero();
            
            if (this.keys['w']) simpleMovement.z = moveSpeed * deltaTime;   // 前進
            if (this.keys['s']) simpleMovement.z = -moveSpeed * deltaTime;  // 後退
            if (this.keys['a']) simpleMovement.x = -moveSpeed * deltaTime;  // 左
            if (this.keys['d']) simpleMovement.x = moveSpeed * deltaTime;   // 右
            
            if (simpleMovement.length() > 0 && this.thirdPersonCamera) {
                const cameraForward = this.thirdPersonCamera.getCameraDirection();
                const cameraRight = this.thirdPersonCamera.getCameraRight();
                const worldMovement = cameraForward.scale(simpleMovement.z).add(cameraRight.scale(simpleMovement.x));
                
                const newPos = currentPos.add(worldMovement);
                this.avatar.getRootMesh().position = newPos;
            }
        }
        
        // アバターのアニメーション更新
        if (this.avatar) {
            this.avatar.update(deltaTime);
        }
        
        // カメラの更新
        if (this.isFirstPerson && this.firstPersonCamera) {
            // FPSモード：カメラをアバターの頭の位置に固定
            const headPosition = this.avatar.getRootMesh().position.add(this.fpsCameraOffset);
            this.camera.position = headPosition;
            
            // FPSカメラコントローラーで向きを制御
            this.firstPersonCamera.update();
            
            // カメラの上方向を設定（球体の場合）
            if (isSpherical) {
                const up = this.terrain!.getUpVector(headPosition);
                this.camera.upVector = up;
            }
        } else if (this.thirdPersonCamera) {
            // TPSモード
            this.thirdPersonCamera.update();
        }
    }
    
    getPosition(): BABYLON.Vector3 {
        if (!this.avatar) {
            console.log('[CHARACTER] getPosition called but avatar is null');
            return new BABYLON.Vector3(0, 0, 0);
        }
        const pos = this.avatar.getPosition();
        console.log(`[CHARACTER] getPosition returning: ${pos}`);
        return pos;
    }
    
    setPosition(position: BABYLON.Vector3): void {
        if (this.avatar) {
            this.avatar.setPosition(position);
        }
    }
    
    setTerrain(terrain: ProceduralTerrain): void {
        this.terrain = terrain;
        // サードパーソンカメラにも地形情報を渡す
        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.setTerrain(terrain);
        }
    }
    
    // ビューモード切り替え
    toggleViewMode(): void {
        this.isFirstPerson = !this.isFirstPerson;
        
        if (this.isFirstPerson) {
            this.setFirstPerson();
        } else {
            this.setThirdPerson();
        }
        
        console.log(`[CHARACTER] View mode changed to: ${this.isFirstPerson ? 'First Person' : 'Third Person'}`);
        
        // UI更新
        const viewModeElement = document.getElementById('viewMode');
        if (viewModeElement) {
            viewModeElement.textContent = this.isFirstPerson ? 'First Person' : 'Third Person';
        }
    }
    
    setFirstPerson(): void {
        // FPSモードの実装
        this.isFirstPerson = true;
        // アバターのメッシュを非表示（自分の体が見えないように）
        if (this.avatar) {
            this.avatar.getRootMesh().getChildMeshes().forEach(mesh => {
                mesh.isVisible = false;
            });
        }
    }
    
    setThirdPerson(): void {
        // TPSモードの実装
        this.isFirstPerson = false;
        // アバターのメッシュを表示
        if (this.avatar) {
            this.avatar.getRootMesh().getChildMeshes().forEach(mesh => {
                mesh.isVisible = true;
            });
        }
    }
    
    // 簡易的な球面移動メソッド
    private getUpVector(position: BABYLON.Vector3): BABYLON.Vector3 {
        return position.subtract(this.planetCenter).normalize();
    }
    
    private applyJump(position: BABYLON.Vector3, jumpSpeed: number): BABYLON.Vector3 {
        const up = this.getUpVector(position);
        return up.scale(jumpSpeed);
    }
    
    private applyGravity(position: BABYLON.Vector3, velocity: BABYLON.Vector3, gravity: number, deltaTime: number): BABYLON.Vector3 {
        const up = this.getUpVector(position);
        const gravityForce = up.scale(gravity * deltaTime);
        return velocity.add(gravityForce);
    }
    
    private calculateCharacterRotation(position: BABYLON.Vector3, center: BABYLON.Vector3, forward: BABYLON.Vector3): BABYLON.Quaternion {
        const up = this.getUpVector(position);
        
        // 前方向を接平面に投影
        let projectedForward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
        if (projectedForward.length() < 0.001) {
            projectedForward = new BABYLON.Vector3(0, 0, 1);
            projectedForward = projectedForward.subtract(up.scale(BABYLON.Vector3.Dot(projectedForward, up)));
        }
        projectedForward.normalize();
        
        // 右方向を計算
        const right = BABYLON.Vector3.Cross(up, projectedForward);
        
        // 回転行列を作成
        const rotMatrix = BABYLON.Matrix.Identity();
        rotMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
        rotMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
        rotMatrix.setRow(2, new BABYLON.Vector4(-projectedForward.x, -projectedForward.y, -projectedForward.z, 0));
        
        return BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
    }
}
