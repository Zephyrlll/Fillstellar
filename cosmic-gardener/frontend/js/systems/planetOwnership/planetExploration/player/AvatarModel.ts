/**
 * Avatar Model
 * アバターの3Dモデル管理クラス
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AvatarConfig {
    modelPath?: string;
    scale?: number;
    bodyColor?: string;
    hairColor?: string;
    clothingColor?: string;
}

export class AvatarModel {
    private group: THREE.Group;
    private mixer: THREE.AnimationMixer | null = null;
    private animations: Map<string, THREE.AnimationClip> = new Map();
    private currentAnimation: THREE.AnimationAction | null = null;
    private config: AvatarConfig;
    
    // デフォルトモデル用のジオメトリ
    private static readonly DEFAULT_SCALE = 1.0;
    private static readonly PLAYER_HEIGHT = 1.8;
    
    constructor(config: AvatarConfig = {}) {
        this.group = new THREE.Group();
        this.config = {
            scale: config.scale || AvatarModel.DEFAULT_SCALE,
            bodyColor: config.bodyColor || '#4a90e2',
            hairColor: config.hairColor || '#333333',
            clothingColor: config.clothingColor || '#2c3e50',
            modelPath: config.modelPath
        };
    }
    
    /**
     * アバターを初期化
     */
    async initialize(): Promise<THREE.Group> {
        if (this.config.modelPath) {
            // カスタムモデルをロード
            await this.loadGLTFModel(this.config.modelPath);
        } else {
            // デフォルトの簡易モデルを作成
            this.createDefaultModel();
        }
        
        return this.group;
    }
    
    /**
     * デフォルトの簡易アバターモデルを作成
     */
    private createDefaultModel(): void {
        const scale = this.config.scale!;
        
        console.log('[AVATAR] Creating default avatar model with scale:', scale);
        
        // 体（シリンダーで代用）
        const bodyGeometry = new THREE.CylinderGeometry(
            0.3 * scale, // 上部半径
            0.35 * scale, // 下部半径
            1.2 * scale, // 高さ
            8 // セグメント数
        );
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: this.config.bodyColor,
            shininess: 30
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.7 * scale;
        body.castShadow = true;
        body.receiveShadow = true;
        this.group.add(body);
        
        // 頭
        const headGeometry = new THREE.SphereGeometry(0.25 * scale, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: '#f4c2a1',
            shininess: 20
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5 * scale;
        head.castShadow = true;
        head.receiveShadow = true;
        this.group.add(head);
        
        // 髪
        const hairGeometry = new THREE.SphereGeometry(0.28 * scale, 16, 16);
        const hairMaterial = new THREE.MeshPhongMaterial({ 
            color: this.config.hairColor
        });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 1.55 * scale;
        hair.scale.y = 0.7;
        this.group.add(hair);
        
        // 腕（シリンダーで代用）
        const armGeometry = new THREE.CylinderGeometry(
            0.08 * scale,
            0.08 * scale,
            0.5 * scale,
            6
        );
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: '#f4c2a1'
        });
        
        // 左腕
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.35 * scale, 0.9 * scale, 0);
        leftArm.rotation.z = Math.PI / 8;
        leftArm.castShadow = true;
        this.group.add(leftArm);
        
        // 右腕
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.35 * scale, 0.9 * scale, 0);
        rightArm.rotation.z = -Math.PI / 8;
        rightArm.castShadow = true;
        this.group.add(rightArm);
        
        // 脚（シリンダーで代用）
        const legGeometry = new THREE.CylinderGeometry(
            0.1 * scale,
            0.1 * scale,
            0.6 * scale,
            6
        );
        const legMaterial = new THREE.MeshPhongMaterial({ 
            color: this.config.clothingColor
        });
        
        // 左脚
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15 * scale, 0.25 * scale, 0);
        leftLeg.castShadow = true;
        this.group.add(leftLeg);
        
        // 右脚
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15 * scale, 0.25 * scale, 0);
        rightLeg.castShadow = true;
        this.group.add(rightLeg);
        
        // 目
        const eyeGeometry = new THREE.SphereGeometry(0.03 * scale, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: '#000000' });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08 * scale, 1.5 * scale, 0.22 * scale);
        this.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08 * scale, 1.5 * scale, 0.22 * scale);
        this.group.add(rightEye);
    }
    
    /**
     * GLTFモデルをロード
     */
    private async loadGLTFModel(modelPath: string): Promise<void> {
        const loader = new GLTFLoader();
        
        try {
            const gltf = await loader.loadAsync(modelPath);
            
            // モデルをグループに追加
            this.group.add(gltf.scene);
            
            // スケール調整
            gltf.scene.scale.multiplyScalar(this.config.scale!);
            
            // アニメーションがある場合は保存
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(gltf.scene);
                
                gltf.animations.forEach(clip => {
                    this.animations.set(clip.name, clip);
                });
            }
            
            // 影の設定
            gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            console.log('[AVATAR] Custom model loaded:', modelPath);
        } catch (error) {
            console.error('[AVATAR] Failed to load model:', error);
            // フォールバック: デフォルトモデルを作成
            this.createDefaultModel();
        }
    }
    
    /**
     * アニメーションを再生
     */
    playAnimation(name: string, loop = true): void {
        if (!this.mixer || !this.animations.has(name)) {
            return;
        }
        
        // 現在のアニメーションを停止
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(0.2);
        }
        
        // 新しいアニメーションを開始
        const clip = this.animations.get(name)!;
        this.currentAnimation = this.mixer.clipAction(clip);
        this.currentAnimation.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
        this.currentAnimation.clampWhenFinished = !loop;
        this.currentAnimation.fadeIn(0.2);
        this.currentAnimation.play();
    }
    
    /**
     * アニメーションを停止
     */
    stopAnimation(): void {
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(0.2);
            this.currentAnimation = null;
        }
    }
    
    /**
     * アニメーションミキサーを更新
     */
    update(deltaTime: number): void {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
    
    /**
     * アバターの色を変更
     */
    setColors(colors: Partial<Pick<AvatarConfig, 'bodyColor' | 'hairColor' | 'clothingColor'>>): void {
        Object.assign(this.config, colors);
        
        // デフォルトモデルの場合のみ色を更新
        if (!this.config.modelPath) {
            this.group.clear();
            this.createDefaultModel();
        }
    }
    
    /**
     * アバターグループを取得
     */
    getGroup(): THREE.Group {
        return this.group;
    }
    
    /**
     * アバターの高さを取得
     */
    getHeight(): number {
        return AvatarModel.PLAYER_HEIGHT * this.config.scale!;
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        this.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        });
        
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
        
        this.animations.clear();
        this.group.clear();
    }
}