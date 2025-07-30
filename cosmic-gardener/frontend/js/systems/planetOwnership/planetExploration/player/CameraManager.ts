/**
 * Camera Manager
 * 視点切り替えとカメラ制御を管理
 */

import * as THREE from 'three';
import { SphericalWorld } from '../core/SphericalWorld.js';
import { FirstPersonController } from './FirstPersonController.js';
import { ThirdPersonController } from './ThirdPersonController.js';

export type ViewMode = 'first-person' | 'third-person';

export class CameraManager {
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    private scene: THREE.Scene;
    private sphericalWorld: SphericalWorld;
    
    // コントローラー
    private firstPersonController: FirstPersonController;
    private thirdPersonController: ThirdPersonController;
    private currentController: FirstPersonController | ThirdPersonController;
    
    // 状態
    private viewMode: ViewMode = 'first-person';
    private isTransitioning = false;
    private transitionDuration = 0.5; // 秒
    
    constructor(
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement,
        scene: THREE.Scene,
        sphericalWorld: SphericalWorld
    ) {
        this.camera = camera;
        this.canvas = canvas;
        this.scene = scene;
        this.sphericalWorld = sphericalWorld;
        
        // コントローラーを作成
        this.firstPersonController = new FirstPersonController(
            camera,
            canvas,
            sphericalWorld,
            scene
        );
        
        this.thirdPersonController = new ThirdPersonController(
            camera,
            canvas,
            sphericalWorld,
            scene
        );
        
        // 初期はFPSモード
        this.currentController = this.firstPersonController;
        
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        document.addEventListener('keydown', this.onKeyDown);
    }
    
    /**
     * キー押下処理
     */
    private onKeyDown = (event: KeyboardEvent): void => {
        // Vキーで視点切り替え
        if (event.code === 'KeyV' && !this.isTransitioning) {
            this.toggleViewMode();
        }
    };
    
    /**
     * 初期位置を設定
     */
    async setInitialPosition(position: THREE.Vector3): Promise<void> {
        // 両方のコントローラーを初期化
        await this.firstPersonController.setPosition(position);
        await this.thirdPersonController.setPosition(position);
    }
    
    /**
     * 視点モードを切り替え
     */
    async toggleViewMode(): Promise<void> {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        const newMode: ViewMode = this.viewMode === 'first-person' ? 'third-person' : 'first-person';
        const currentPosition = this.currentController.getPosition();
        
        console.log(`[CAMERA] Switching to ${newMode} view`);
        
        // 視点切り替えのアニメーション
        await this.animateTransition(newMode, currentPosition);
        
        // モードを更新
        this.viewMode = newMode;
        
        // コントローラーを切り替え
        if (newMode === 'first-person') {
            this.currentController = this.firstPersonController;
            
            // FPSモードではアバターを非表示
            const avatarController = this.firstPersonController.getAvatarController();
            if (avatarController) {
                avatarController.setVisible(false);
            }
        } else {
            this.currentController = this.thirdPersonController;
            
            // TPSモードではアバターを表示
            const avatarController = this.thirdPersonController.getAvatarController();
            avatarController.setVisible(true);
        }
        
        this.isTransitioning = false;
        
        // UI更新用のイベントを発火
        this.dispatchViewModeChangeEvent(newMode);
    }
    
    /**
     * 視点切り替えアニメーション
     */
    private async animateTransition(
        newMode: ViewMode,
        position: THREE.Vector3
    ): Promise<void> {
        // 現在のカメラ位置と向きを保存
        const startPosition = this.camera.position.clone();
        const startQuaternion = this.camera.quaternion.clone();
        
        // ターゲット位置を計算
        let targetPosition: THREE.Vector3;
        let targetQuaternion: THREE.Quaternion;
        
        if (newMode === 'first-person') {
            // FPS視点の位置
            targetPosition = position.clone();
            targetQuaternion = this.camera.quaternion.clone(); // 現在の向きを維持
        } else {
            // TPS視点の位置（一時的に計算）
            const tempCamera = this.camera.clone();
            this.thirdPersonController.update(0); // カメラ位置を更新
            targetPosition = this.camera.position.clone();
            targetQuaternion = this.camera.quaternion.clone();
            
            // カメラを元に戻す
            this.camera.position.copy(startPosition);
            this.camera.quaternion.copy(startQuaternion);
        }
        
        // アニメーション
        const startTime = performance.now();
        
        return new Promise<void>((resolve) => {
            const animate = () => {
                const elapsed = (performance.now() - startTime) / 1000;
                const progress = Math.min(elapsed / this.transitionDuration, 1);
                
                // イージング関数（ease-in-out）
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                // 位置と回転を補間
                this.camera.position.lerpVectors(startPosition, targetPosition, eased);
                this.camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, eased);
                
                if (progress >= 1) {
                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        });
    }
    
    /**
     * 視点モード変更イベントを発火
     */
    private dispatchViewModeChangeEvent(mode: ViewMode): void {
        const event = new CustomEvent('viewModeChange', {
            detail: { mode }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * 現在の視点モードを取得
     */
    getViewMode(): ViewMode {
        return this.viewMode;
    }
    
    /**
     * 現在のコントローラーを取得
     */
    getCurrentController(): FirstPersonController | ThirdPersonController {
        return this.currentController;
    }
    
    /**
     * 位置を取得
     */
    getPosition(): THREE.Vector3 {
        return this.currentController.getPosition();
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        if (!this.isTransitioning) {
            this.currentController.update(deltaTime);
        }
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        
        this.firstPersonController.dispose();
        this.thirdPersonController.dispose();
    }
}