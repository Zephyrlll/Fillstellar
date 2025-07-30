import * as BABYLON from '@babylonjs/core';
import { StaticAvatar } from './StaticAvatar';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { FirstPersonCamera } from './FirstPersonCamera';
import { SphericalMovement } from './SphericalMovement';
import { ProceduralTerrain } from './ProceduralTerrain';
import { DebugTracker } from './DebugTracker';

export class CharacterController {
    private scene: BABYLON.Scene;
    private camera: BABYLON.UniversalCamera;
    private canvas: HTMLCanvasElement;
    private avatar: StaticAvatar | null = null;
    private thirdPersonCamera: ThirdPersonCamera | null = null;
    private firstPersonCamera: FirstPersonCamera | null = null;
    private sphericalMovement: SphericalMovement;
    private terrain: ProceduralTerrain | null = null;
    
    // 移動制御
    private jumpSpeed: number = 8;
    private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private isGrounded: boolean = true;
    
    // 入力状態
    private keys: { [key: string]: boolean } = {};
    
    // ビューモード
    private isFirstPerson: boolean = false;
    private fpsCameraOffset: BABYLON.Vector3 = new BABYLON.Vector3(0, 1.6, 0); // 頭の位置
    
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
        this.sphericalMovement = new SphericalMovement(scene);
        // デフォルトの惑星データを設定
        this.sphericalMovement.setPlanetData(BABYLON.Vector3.Zero(), 100);
        
        this.setupControls();
    }
    
    private setupControls(): void {
        // キーボードイベント
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // スペースキーでジャンプ
            if (e.key === ' ' && this.isGrounded) {
                if (this.terrain && this.terrain.isSpherical()) {
                    // 球体地形：上方向にジャンプ
                    const jumpVel = this.sphericalMovement.applyJump(
                        this.avatar.getRootMesh().position,
                        this.jumpSpeed
                    );
                    this.velocity = jumpVel;
                } else {
                    // 平面地形：Y軸にジャンプ
                    this.velocity.y = this.jumpSpeed;
                }
                this.isGrounded = false;
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
        
        // 既存のアバターがあれば削除
        if (this.avatar) {
            this.avatar.dispose();
            this.avatar = null;
        }
        
        // 静的アバターを作成
        this.avatar = new StaticAvatar(this.scene, position);
        console.log(`[CHARACTER] StaticAvatar created at: ${this.avatar.getPosition()}`);
        
        // カメラシステムを設定
        if (this.avatar) {
            this.thirdPersonCamera = new ThirdPersonCamera(this.scene, this.camera, this.canvas, this.avatar.getRootMesh());
            this.firstPersonCamera = new FirstPersonCamera(this.scene, this.camera, this.canvas);
        }
        
        // 初期状態を設定
        this.initialPosition = position.clone();
        this.hasSpawned = true;
        this.velocity = BABYLON.Vector3.Zero();
        this.isGrounded = false;
        
        // 球体地形の場合、位置を確実に球の外側に調整
        if (this.terrain && this.terrain.isSpherical()) {
            const planetRadius = this.terrain.getPlanetRadius();
            console.log(`[CHARACTER] Planet radius: ${planetRadius}`);
            
            // 球体移動システムに惑星データを設定
            this.sphericalMovement.setPlanetData(BABYLON.Vector3.Zero(), planetRadius);
            console.log(`[CHARACTER] Set planet data in sphericalMovement with radius: ${planetRadius}`);
            
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
            const rotation = this.sphericalMovement.calculateCharacterRotation(
                position,
                BABYLON.Vector3.Zero(),
                this.avatar.getRootMesh().rotation
            );
            this.avatar.getRootMesh().rotationQuaternion = rotation;
            
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
            const characterHeight = 2; // キャラクターの高さ
            const targetRadius = planetRadius + characterHeight;
            
            // 現在の位置から上方向を計算
            const up = currentPos.length() > 0.001 ? currentPos.normalize() : new BABYLON.Vector3(0, 1, 0);
            
            // 移動入力を取得
            const moveSpeed = 5; // 速度を調整
            let movement = BABYLON.Vector3.Zero();
            
            if (this.keys['w']) movement.z = moveSpeed * deltaTime;
            if (this.keys['s']) movement.z = -moveSpeed * deltaTime;
            if (this.keys['a']) movement.x = -moveSpeed * deltaTime;
            if (this.keys['d']) movement.x = moveSpeed * deltaTime;
            
            // 移動がある場合
            if (movement.length() > 0 && this.thirdPersonCamera) {
                // カメラの向きを取得
                const cameraForward = this.thirdPersonCamera.getCameraDirection();
                const cameraRight = this.thirdPersonCamera.getCameraRight();
                
                // 球面に沿った移動ベクトルを計算
                const tangentMovement = cameraForward.scale(movement.z).add(cameraRight.scale(movement.x));
                
                // 球面上での移動を適用
                const newPos = this.sphericalMovement.moveOnSphere(
                    currentPos,
                    tangentMovement,
                    tangentMovement.length()
                );
                
                // 高さを調整（球の表面に固定）
                const adjustedPos = newPos.normalize().scale(targetRadius);
                this.avatar.getRootMesh().position = adjustedPos;
                
                // キャラクターの回転を更新
                const rotation = this.sphericalMovement.calculateCharacterRotation(
                    adjustedPos,
                    tangentMovement,
                    this.avatar.getRootMesh().rotation
                );
                this.avatar.getRootMesh().rotationQuaternion = rotation;
            } else {
                // 移動していない場合でも高さを維持
                const adjustedPos = currentPos.normalize().scale(targetRadius);
                if (adjustedPos.subtract(currentPos).length() > 0.01) {
                    this.avatar.getRootMesh().position = adjustedPos;
                }
            }
            
            // 定期的なステータス出力
            if (this.updateCount % 60 === 0) {
                const pos = this.avatar.getRootMesh().position;
                console.log(`[CHARACTER] Status - Position: ${pos.toString()}, Distance: ${pos.length().toFixed(2)}, Target: ${targetRadius.toFixed(2)}`);
            }
        } else {
            // 平面地形の場合（既存の処理）
            const moveSpeed = 10;
            let simpleMovement = BABYLON.Vector3.Zero();
            
            if (this.keys['w']) simpleMovement.z = moveSpeed * deltaTime;
            if (this.keys['s']) simpleMovement.z = -moveSpeed * deltaTime;
            if (this.keys['a']) simpleMovement.x = -moveSpeed * deltaTime;
            if (this.keys['d']) simpleMovement.x = moveSpeed * deltaTime;
            
            if (simpleMovement.length() > 0 && this.thirdPersonCamera) {
                const cameraForward = this.thirdPersonCamera.getCameraDirection();
                const cameraRight = this.thirdPersonCamera.getCameraRight();
                const worldMovement = cameraForward.scale(simpleMovement.z).add(cameraRight.scale(simpleMovement.x));
                
                const newPos = currentPos.add(worldMovement);
                this.avatar.getRootMesh().position = newPos;
            }
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
}
