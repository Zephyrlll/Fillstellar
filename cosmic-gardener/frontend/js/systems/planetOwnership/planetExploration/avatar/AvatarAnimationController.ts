import * as BABYLON from '@babylonjs/core';
import { HumanoidAvatar } from './HumanoidAvatar';

export enum AnimationState {
    IDLE = 'idle',
    WALK = 'walk',
    RUN = 'run',
    JUMP = 'jump',
    FALLING = 'falling',
    LAND = 'land',
    COLLECT = 'collect',
    BUILD = 'build',
    SCAN = 'scan'
}

export class AvatarAnimationController {
    private avatar: HumanoidAvatar;
    private scene: BABYLON.Scene;
    private currentState: AnimationState = AnimationState.IDLE;
    private animationTime: number = 0;
    private transitionTime: number = 0;
    private previousState: AnimationState = AnimationState.IDLE;
    private isTransitioning: boolean = false;
    
    // アニメーションパラメータ
    private walkSpeed: number = 1.0;
    private runSpeed: number = 1.5;
    private animationSpeed: number = 1.0;
    
    constructor(avatar: HumanoidAvatar, scene: BABYLON.Scene) {
        this.avatar = avatar;
        this.scene = scene;
    }
    
    public update(deltaTime: number): void {
        this.animationTime += deltaTime * this.animationSpeed;
        
        if (this.isTransitioning) {
            this.transitionTime += deltaTime * 4; // 0.25秒でトランジション
            if (this.transitionTime >= 1) {
                this.isTransitioning = false;
                this.previousState = this.currentState;
                this.transitionTime = 0;
            }
        }
        
        // 現在の状態に応じてアニメーションを適用
        switch (this.currentState) {
            case AnimationState.IDLE:
                this.applyIdleAnimation();
                break;
            case AnimationState.WALK:
                this.applyWalkAnimation();
                break;
            case AnimationState.RUN:
                this.applyRunAnimation();
                break;
            case AnimationState.JUMP:
                this.applyJumpAnimation();
                break;
            case AnimationState.FALLING:
                this.applyFallingAnimation();
                break;
            case AnimationState.LAND:
                this.applyLandAnimation();
                break;
            case AnimationState.COLLECT:
                this.applyCollectAnimation();
                break;
            case AnimationState.BUILD:
                this.applyBuildAnimation();
                break;
            case AnimationState.SCAN:
                this.applyScanAnimation();
                break;
        }
    }
    
    public setState(newState: AnimationState): void {
        if (newState !== this.currentState) {
            this.previousState = this.currentState;
            this.currentState = newState;
            this.isTransitioning = true;
            this.transitionTime = 0;
            
            // 状態に応じたアニメーション速度を設定
            switch (newState) {
                case AnimationState.RUN:
                    this.animationSpeed = this.runSpeed;
                    break;
                case AnimationState.WALK:
                    this.animationSpeed = this.walkSpeed;
                    break;
                default:
                    this.animationSpeed = 1.0;
            }
        }
    }
    
    private applyIdleAnimation(): void {
        const breathingAmplitude = 0.01;
        const breathingSpeed = 2;
        
        // 呼吸アニメーション
        const chest = this.avatar.getBone('chest');
        if (chest) {
            chest.scaling.y = 1 + Math.sin(this.animationTime * breathingSpeed) * breathingAmplitude;
        }
        
        // 軽い揺れ
        const spine = this.avatar.getBone('spine');
        if (spine) {
            spine.rotation.z = Math.sin(this.animationTime * 0.5) * 0.02;
        }
        
        // 腕の自然な揺れ
        this.applyArmIdleAnimation('left');
        this.applyArmIdleAnimation('right');
    }
    
    private applyArmIdleAnimation(side: 'left' | 'right'): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        const upperArm = this.avatar.getBone(`${side}UpperArm`);
        const lowerArm = this.avatar.getBone(`${side}LowerArm`);
        
        if (upperArm) {
            upperArm.rotation.z = (side === 'left' ? -0.1 : 0.1) + Math.sin(this.animationTime * 0.8) * 0.05;
            upperArm.rotation.x = Math.sin(this.animationTime * 0.6 + (side === 'left' ? 0 : Math.PI)) * 0.03;
        }
        
        if (lowerArm) {
            lowerArm.rotation.x = -0.1 + Math.sin(this.animationTime * 0.7) * 0.02;
        }
    }
    
    private applyWalkAnimation(): void {
        const walkCycle = this.animationTime * 2;
        const stepHeight = 0.05;
        const strideLength = 0.3;
        const armSwing = 0.4;
        const torsoRotation = 0.05;
        
        // 腰の上下動
        const pelvis = this.avatar.getBone('pelvis');
        if (pelvis) {
            pelvis.position.y = 0.9 + Math.abs(Math.sin(walkCycle * 2)) * stepHeight;
        }
        
        // 胴体の回転
        const spine = this.avatar.getBone('spine');
        if (spine) {
            spine.rotation.y = Math.sin(walkCycle) * torsoRotation;
        }
        
        // 脚のアニメーション
        this.applyLegWalkAnimation('left', walkCycle, strideLength);
        this.applyLegWalkAnimation('right', walkCycle + Math.PI, strideLength);
        
        // 腕のアニメーション
        this.applyArmWalkAnimation('left', walkCycle + Math.PI, armSwing);
        this.applyArmWalkAnimation('right', walkCycle, armSwing);
    }
    
    private applyLegWalkAnimation(side: 'left' | 'right', phase: number, strideLength: number): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        const upperLeg = this.avatar.getBone(`${side}UpperLeg`);
        const lowerLeg = this.avatar.getBone(`${side}LowerLeg`);
        const foot = this.avatar.getBone(`${side}Foot`);
        
        if (upperLeg) {
            upperLeg.rotation.x = Math.sin(phase) * strideLength;
        }
        
        if (lowerLeg) {
            const kneeAngle = Math.max(0, -Math.sin(phase)) * 0.8;
            lowerLeg.rotation.x = -kneeAngle;
        }
        
        if (foot) {
            foot.rotation.x = Math.sin(phase + Math.PI / 4) * 0.2;
        }
    }
    
    private applyArmWalkAnimation(side: 'left' | 'right', phase: number, swingAmount: number): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        const shoulder = this.avatar.getBone(`${side}Shoulder`);
        const upperArm = this.avatar.getBone(`${side}UpperArm`);
        const lowerArm = this.avatar.getBone(`${side}LowerArm`);
        
        if (shoulder) {
            shoulder.rotation.x = Math.sin(phase) * swingAmount * 0.3;
        }
        
        if (upperArm) {
            upperArm.rotation.x = Math.sin(phase) * swingAmount;
            upperArm.rotation.z = side === 'left' ? -0.2 : 0.2;
        }
        
        if (lowerArm) {
            lowerArm.rotation.x = -0.3 + Math.sin(phase - Math.PI / 4) * 0.2;
        }
    }
    
    private applyRunAnimation(): void {
        const runCycle = this.animationTime * 3;
        const stepHeight = 0.1;
        const strideLength = 0.6;
        const armSwing = 0.8;
        const torsoLean = 0.2;
        
        // 前傾姿勢
        const spine = this.avatar.getBone('spine');
        if (spine) {
            spine.rotation.x = torsoLean;
            spine.rotation.y = Math.sin(runCycle) * 0.1;
        }
        
        // 腰の動き
        const pelvis = this.avatar.getBone('pelvis');
        if (pelvis) {
            pelvis.position.y = 0.9 + Math.abs(Math.sin(runCycle * 2)) * stepHeight;
        }
        
        // 脚のアニメーション（より大きな動き）
        this.applyLegRunAnimation('left', runCycle, strideLength);
        this.applyLegRunAnimation('right', runCycle + Math.PI, strideLength);
        
        // 腕のアニメーション（より激しい振り）
        this.applyArmRunAnimation('left', runCycle + Math.PI, armSwing);
        this.applyArmRunAnimation('right', runCycle, armSwing);
    }
    
    private applyLegRunAnimation(side: 'left' | 'right', phase: number, strideLength: number): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        const upperLeg = this.avatar.getBone(`${side}UpperLeg`);
        const lowerLeg = this.avatar.getBone(`${side}LowerLeg`);
        const foot = this.avatar.getBone(`${side}Foot`);
        
        if (upperLeg) {
            upperLeg.rotation.x = Math.sin(phase) * strideLength;
        }
        
        if (lowerLeg) {
            const kneeAngle = Math.max(0, -Math.sin(phase)) * 1.2;
            lowerLeg.rotation.x = -kneeAngle;
        }
        
        if (foot) {
            foot.rotation.x = Math.sin(phase + Math.PI / 4) * 0.3;
        }
    }
    
    private applyArmRunAnimation(side: 'left' | 'right', phase: number, swingAmount: number): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        const upperArm = this.avatar.getBone(`${side}UpperArm`);
        const lowerArm = this.avatar.getBone(`${side}LowerArm`);
        
        if (upperArm) {
            upperArm.rotation.x = Math.sin(phase) * swingAmount;
            upperArm.rotation.z = side === 'left' ? -0.3 : 0.3;
        }
        
        if (lowerArm) {
            lowerArm.rotation.x = -0.9; // 肘を曲げた状態
        }
    }
    
    private applyJumpAnimation(): void {
        const jumpProgress = Math.min(1, this.animationTime * 3);
        
        // 腕を上げる
        const leftUpperArm = this.avatar.getBone('leftUpperArm');
        const rightUpperArm = this.avatar.getBone('rightUpperArm');
        
        if (leftUpperArm) {
            leftUpperArm.rotation.x = -jumpProgress * 2.5;
            leftUpperArm.rotation.z = -jumpProgress * 0.5;
        }
        
        if (rightUpperArm) {
            rightUpperArm.rotation.x = -jumpProgress * 2.5;
            rightUpperArm.rotation.z = jumpProgress * 0.5;
        }
        
        // 脚を曲げる
        this.applyJumpLegAnimation('left', jumpProgress);
        this.applyJumpLegAnimation('right', jumpProgress);
    }
    
    private applyJumpLegAnimation(side: 'left' | 'right', progress: number): void {
        const upperLeg = this.avatar.getBone(`${side}UpperLeg`);
        const lowerLeg = this.avatar.getBone(`${side}LowerLeg`);
        
        if (upperLeg) {
            upperLeg.rotation.x = -progress * 0.8;
        }
        
        if (lowerLeg) {
            lowerLeg.rotation.x = -progress * 1.2;
        }
    }
    
    private applyFallingAnimation(): void {
        // 腕を広げる
        const leftUpperArm = this.avatar.getBone('leftUpperArm');
        const rightUpperArm = this.avatar.getBone('rightUpperArm');
        
        if (leftUpperArm) {
            leftUpperArm.rotation.x = -0.5;
            leftUpperArm.rotation.z = -1.5;
        }
        
        if (rightUpperArm) {
            rightUpperArm.rotation.x = -0.5;
            rightUpperArm.rotation.z = 1.5;
        }
        
        // 脚を少し開く
        const leftUpperLeg = this.avatar.getBone('leftUpperLeg');
        const rightUpperLeg = this.avatar.getBone('rightUpperLeg');
        
        if (leftUpperLeg) {
            leftUpperLeg.rotation.z = -0.2;
        }
        
        if (rightUpperLeg) {
            rightUpperLeg.rotation.z = 0.2;
        }
    }
    
    private applyLandAnimation(): void {
        const landProgress = Math.min(1, this.animationTime * 4);
        const squashAmount = 1 - landProgress;
        
        // しゃがみ込む動作
        const pelvis = this.avatar.getBone('pelvis');
        if (pelvis) {
            pelvis.position.y = 0.9 - squashAmount * 0.3;
        }
        
        // 膝を曲げる
        const leftLowerLeg = this.avatar.getBone('leftLowerLeg');
        const rightLowerLeg = this.avatar.getBone('rightLowerLeg');
        
        if (leftLowerLeg) {
            leftLowerLeg.rotation.x = -squashAmount * 1.5;
        }
        
        if (rightLowerLeg) {
            rightLowerLeg.rotation.x = -squashAmount * 1.5;
        }
    }
    
    private applyCollectAnimation(): void {
        const collectCycle = Math.sin(this.animationTime * 2);
        
        // 前かがみになる
        const spine = this.avatar.getBone('spine');
        if (spine) {
            spine.rotation.x = 0.5;
        }
        
        // 右手を伸ばす
        const rightUpperArm = this.avatar.getBone('rightUpperArm');
        const rightLowerArm = this.avatar.getBone('rightLowerArm');
        
        if (rightUpperArm) {
            rightUpperArm.rotation.x = 0.8 + collectCycle * 0.1;
            rightUpperArm.rotation.z = 0.3;
        }
        
        if (rightLowerArm) {
            rightLowerArm.rotation.x = -0.5;
        }
        
        // 左手でバランスを取る
        const leftUpperArm = this.avatar.getBone('leftUpperArm');
        if (leftUpperArm) {
            leftUpperArm.rotation.x = -0.3;
            leftUpperArm.rotation.z = -0.8;
        }
    }
    
    private applyBuildAnimation(): void {
        const buildCycle = this.animationTime * 1.5;
        
        // ハンマーを振るような動き
        const rightUpperArm = this.avatar.getBone('rightUpperArm');
        const rightLowerArm = this.avatar.getBone('rightLowerArm');
        
        if (rightUpperArm) {
            rightUpperArm.rotation.x = -1.5 + Math.sin(buildCycle) * 1.2;
            rightUpperArm.rotation.z = 0.5;
        }
        
        if (rightLowerArm) {
            rightLowerArm.rotation.x = -0.8 + Math.sin(buildCycle - Math.PI / 4) * 0.5;
        }
        
        // 左手で支える
        const leftUpperArm = this.avatar.getBone('leftUpperArm');
        const leftLowerArm = this.avatar.getBone('leftLowerArm');
        
        if (leftUpperArm) {
            leftUpperArm.rotation.x = 0.5;
            leftUpperArm.rotation.z = -0.3;
        }
        
        if (leftLowerArm) {
            leftLowerArm.rotation.x = -0.7;
        }
    }
    
    private applyScanAnimation(): void {
        const scanCycle = this.animationTime * 2;
        
        // スキャナーを持つポーズ
        const rightUpperArm = this.avatar.getBone('rightUpperArm');
        const rightLowerArm = this.avatar.getBone('rightLowerArm');
        const rightHand = this.avatar.getBone('rightHand');
        
        if (rightUpperArm) {
            rightUpperArm.rotation.x = -0.3;
            rightUpperArm.rotation.z = 0.4;
        }
        
        if (rightLowerArm) {
            rightLowerArm.rotation.x = -1.2;
        }
        
        if (rightHand) {
            // スキャナーを左右に振る
            rightHand.rotation.y = Math.sin(scanCycle) * 0.5;
        }
        
        // 左手を腰に
        const leftUpperArm = this.avatar.getBone('leftUpperArm');
        const leftLowerArm = this.avatar.getBone('leftLowerArm');
        
        if (leftUpperArm) {
            leftUpperArm.rotation.x = 0.3;
            leftUpperArm.rotation.z = -0.8;
        }
        
        if (leftLowerArm) {
            leftLowerArm.rotation.x = -1.5;
        }
        
        // 頭を左右に振る
        const head = this.avatar.getBone('head');
        if (head) {
            head.rotation.y = Math.sin(scanCycle * 0.7) * 0.3;
        }
    }
    
    public resetAnimation(): void {
        // すべてのボーンをリセット
        const bones = [
            'spine', 'chest', 'neck', 'head',
            'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
        ];
        
        bones.forEach(boneName => {
            const bone = this.avatar.getBone(boneName);
            if (bone) {
                bone.rotation = BABYLON.Vector3.Zero();
                bone.scaling = BABYLON.Vector3.One();
            }
        });
        
        // 骨盤の位置をリセット
        const pelvis = this.avatar.getBone('pelvis');
        if (pelvis) {
            pelvis.position.y = 0.9;
        }
    }
    
    public getState(): AnimationState {
        return this.currentState;
    }
    
    public setWalkSpeed(speed: number): void {
        this.walkSpeed = speed;
    }
    
    public setRunSpeed(speed: number): void {
        this.runSpeed = speed;
    }
}