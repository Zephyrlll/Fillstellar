/**
 * Avatar Controller
 * アバターの動作制御クラス
 */

import * as THREE from 'three';
import { AvatarModel, AvatarConfig } from './AvatarModel.js';
import { SphericalWorld } from '../core/SphericalWorld.js';

export interface AvatarState {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    velocity: THREE.Vector3;
    isMoving: boolean;
    isRunning: boolean;
    isJumping: boolean;
    isGrounded: boolean;
}

export class AvatarController {
    private avatarModel: AvatarModel;
    private sphericalWorld: SphericalWorld;
    private scene: THREE.Scene;
    
    // 状態
    private state: AvatarState;
    private targetRotation = 0;
    private currentRotation = 0;
    
    // アニメーション状態
    private currentAnimationState: 'idle' | 'walk' | 'run' | 'jump' = 'idle';
    
    constructor(
        scene: THREE.Scene,
        sphericalWorld: SphericalWorld,
        config?: AvatarConfig
    ) {
        this.scene = scene;
        this.sphericalWorld = sphericalWorld;
        this.avatarModel = new AvatarModel(config);
        
        this.state = {
            position: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            velocity: new THREE.Vector3(),
            isMoving: false,
            isRunning: false,
            isJumping: false,
            isGrounded: true
        };
    }
    
    /**
     * アバターを初期化
     */
    async initialize(position: THREE.Vector3): Promise<void> {
        const avatarGroup = await this.avatarModel.initialize();
        this.scene.add(avatarGroup);
        
        console.log('[AVATAR] Avatar initialized and added to scene');
        
        // 初期位置を設定
        this.setPosition(position);
    }
    
    /**
     * 位置を設定
     */
    setPosition(position: THREE.Vector3): void {
        this.state.position.copy(position);
        const avatarGroup = this.avatarModel.getGroup();
        avatarGroup.position.copy(position);
        
        // 球面上での向きを設定
        const up = this.sphericalWorld.getUpVector(position);
        const forward = this.sphericalWorld.getForwardVector(position);
        
        avatarGroup.up.copy(up);
        avatarGroup.lookAt(position.clone().add(forward));
    }
    
    /**
     * 現在位置を取得
     */
    getPosition(): THREE.Vector3 {
        return this.state.position.clone();
    }
    
    /**
     * 移動方向を設定
     */
    setMovementDirection(direction: THREE.Vector3, isRunning = false): void {
        if (direction.length() > 0) {
            this.state.isMoving = true;
            this.state.isRunning = isRunning;
            
            // 移動方向に向かって回転
            const angle = Math.atan2(direction.x, direction.z);
            this.targetRotation = angle;
        } else {
            this.state.isMoving = false;
            this.state.isRunning = false;
        }
    }
    
    /**
     * ジャンプ
     */
    jump(): void {
        if (this.state.isGrounded) {
            this.state.isJumping = true;
            this.state.isGrounded = false;
        }
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        const avatarGroup = this.avatarModel.getGroup();
        
        // アバターの回転を滑らかに補間
        if (this.state.isMoving) {
            const rotationSpeed = 10 * deltaTime;
            this.currentRotation = THREE.MathUtils.lerp(
                this.currentRotation,
                this.targetRotation,
                rotationSpeed
            );
            
            avatarGroup.rotation.y = this.currentRotation;
        }
        
        // アニメーション状態を更新
        this.updateAnimationState();
        
        // アバターモデルを更新（アニメーション）
        this.avatarModel.update(deltaTime);
        
        // 位置をアバターグループに反映
        avatarGroup.position.copy(this.state.position);
        
        // 球面上での向きを維持
        const up = this.sphericalWorld.getUpVector(this.state.position);
        avatarGroup.up.copy(up);
    }
    
    /**
     * アニメーション状態を更新
     */
    private updateAnimationState(): void {
        let newState: typeof this.currentAnimationState = 'idle';
        
        if (this.state.isJumping) {
            newState = 'jump';
        } else if (this.state.isMoving) {
            newState = this.state.isRunning ? 'run' : 'walk';
        }
        
        // 状態が変わった場合のみアニメーションを変更
        if (newState !== this.currentAnimationState) {
            this.currentAnimationState = newState;
            
            switch (newState) {
                case 'idle':
                    this.avatarModel.playAnimation('idle', true);
                    break;
                case 'walk':
                    this.avatarModel.playAnimation('walk', true);
                    break;
                case 'run':
                    this.avatarModel.playAnimation('run', true);
                    break;
                case 'jump':
                    this.avatarModel.playAnimation('jump', false);
                    break;
            }
        }
    }
    
    /**
     * 状態を更新
     */
    updateState(updates: Partial<AvatarState>): void {
        Object.assign(this.state, updates);
    }
    
    /**
     * 状態を取得
     */
    getState(): Readonly<AvatarState> {
        return this.state;
    }
    
    /**
     * アバターの色を変更
     */
    setColors(colors: Parameters<AvatarModel['setColors']>[0]): void {
        this.avatarModel.setColors(colors);
    }
    
    /**
     * アバターを表示/非表示
     */
    setVisible(visible: boolean): void {
        this.avatarModel.getGroup().visible = visible;
        console.log('[AVATAR] Setting visibility:', visible);
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        const avatarGroup = this.avatarModel.getGroup();
        this.scene.remove(avatarGroup);
        this.avatarModel.dispose();
    }
}