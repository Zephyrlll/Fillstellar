import * as BABYLON from '@babylonjs/core';

export type AnimationState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land';

export class AnimatedAvatar {
    private scene: BABYLON.Scene;
    private rootMesh: BABYLON.Mesh;
    
    // 体のパーツ
    private torso: BABYLON.Mesh;
    private head: BABYLON.Mesh;
    private leftArm: BABYLON.Mesh;
    private rightArm: BABYLON.Mesh;
    private leftLeg: BABYLON.Mesh;
    private rightLeg: BABYLON.Mesh;
    
    // アニメーション状態
    private currentState: AnimationState = 'idle';
    private animationTime: number = 0;
    private transitionTime: number = 0;
    private previousState: AnimationState = 'idle';
    
    // アニメーションパラメータ
    private walkSpeed: number = 1.0;
    private runSpeed: number = 1.5;
    
    constructor(scene: BABYLON.Scene, position: BABYLON.Vector3) {
        this.scene = scene;
        
        // ルートメッシュ（体の中心 - 足元を基準とする）
        this.rootMesh = new BABYLON.Mesh("animatedAvatar", scene);
        this.rootMesh.position = position.clone();
        
        // 胴体
        this.torso = BABYLON.MeshBuilder.CreateBox("torso", {
            height: 1.2,
            width: 0.8,
            depth: 0.4
        }, scene);
        this.torso.position.y = 0.9;
        this.torso.parent = this.rootMesh;
        
        // 頭
        this.head = BABYLON.MeshBuilder.CreateSphere("head", {
            diameter: 0.5,
            segments: 16
        }, scene);
        this.head.position.y = 1.8;
        this.head.parent = this.rootMesh;
        
        // 左腕
        this.leftArm = BABYLON.MeshBuilder.CreateCylinder("leftArm", {
            height: 1.0,
            diameter: 0.2
        }, scene);
        this.leftArm.position.set(-0.5, 0.9, 0);
        this.leftArm.setPivotPoint(new BABYLON.Vector3(0, 0.5, 0)); // 肩を回転軸に
        this.leftArm.parent = this.rootMesh;
        
        // 右腕
        this.rightArm = BABYLON.MeshBuilder.CreateCylinder("rightArm", {
            height: 1.0,
            diameter: 0.2
        }, scene);
        this.rightArm.position.set(0.5, 0.9, 0);
        this.rightArm.setPivotPoint(new BABYLON.Vector3(0, 0.5, 0));
        this.rightArm.parent = this.rootMesh;
        
        // 左脚
        this.leftLeg = BABYLON.MeshBuilder.CreateCylinder("leftLeg", {
            height: 1.2,
            diameter: 0.25
        }, scene);
        this.leftLeg.position.set(-0.2, -0.3, 0);
        this.leftLeg.setPivotPoint(new BABYLON.Vector3(0, 0.6, 0)); // 股関節を回転軸に
        this.leftLeg.parent = this.rootMesh;
        
        // 右脚
        this.rightLeg = BABYLON.MeshBuilder.CreateCylinder("rightLeg", {
            height: 1.2,
            diameter: 0.25
        }, scene);
        this.rightLeg.position.set(0.2, -0.3, 0);
        this.rightLeg.setPivotPoint(new BABYLON.Vector3(0, 0.6, 0));
        this.rightLeg.parent = this.rootMesh;
        
        // マテリアル設定
        this.applyMaterials();
        
        // デバッグビーコン（コメントアウト）
        // this.createDebugBeacon();
    }
    
    private applyMaterials(): void {
        // 体のマテリアル（宇宙服風）
        const bodyMaterial = new BABYLON.StandardMaterial("bodyMat", this.scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.95);
        bodyMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        bodyMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        
        // 頭のマテリアル（ヘルメット風）
        const headMaterial = new BABYLON.StandardMaterial("headMat", this.scene);
        headMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        headMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        headMaterial.specularPower = 32;
        headMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        
        // マテリアルを適用
        this.torso.material = bodyMaterial;
        this.head.material = headMaterial;
        this.leftArm.material = bodyMaterial;
        this.rightArm.material = bodyMaterial;
        this.leftLeg.material = bodyMaterial;
        this.rightLeg.material = bodyMaterial;
    }
    
    private createDebugBeacon(): void {
        // 上方向を示すビーコン（デバッグ用）
        const beacon = BABYLON.MeshBuilder.CreateCylinder("beacon", {
            height: 5,
            diameterTop: 0.05,
            diameterBottom: 0.2
        }, this.scene);
        beacon.parent = this.rootMesh;
        beacon.position.y = 4;
        const beaconMat = new BABYLON.StandardMaterial("beaconMat", this.scene);
        beaconMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
        beacon.material = beaconMat;
    }
    
    setState(state: AnimationState, speed: number = 1.0): void {
        if (this.currentState !== state) {
            this.previousState = this.currentState;
            this.currentState = state;
            this.transitionTime = 0;
            
            // 速度パラメータの設定
            if (state === 'walk') {
                this.walkSpeed = speed;
            } else if (state === 'run') {
                this.runSpeed = speed;
            }
            
            console.log(`[ANIMATED_AVATAR] State changed: ${this.previousState} -> ${state}`);
        }
    }
    
    update(deltaTime: number): void {
        this.animationTime += deltaTime;
        this.transitionTime += deltaTime * 3; // 遷移速度
        
        const t = Math.min(this.transitionTime, 1); // 0-1にクランプ
        
        switch (this.currentState) {
            case 'idle':
                this.animateIdle(deltaTime, t);
                break;
            case 'walk':
                this.animateWalk(deltaTime, t);
                break;
            case 'run':
                this.animateRun(deltaTime, t);
                break;
            case 'jump':
                this.animateJump(deltaTime, t);
                break;
            case 'fall':
                this.animateFall(deltaTime, t);
                break;
            case 'land':
                this.animateLand(deltaTime, t);
                break;
        }
    }
    
    private animateIdle(deltaTime: number, transition: number): void {
        // 呼吸のアニメーション
        const breathTime = this.animationTime * 0.5;
        const breathAmount = Math.sin(breathTime) * 0.02;
        
        // 胴体の微妙な上下
        this.torso.position.y = 0.9 + breathAmount;
        
        // 腕をニュートラル位置に戻す
        this.leftArm.rotation.x = BABYLON.Scalar.Lerp(this.leftArm.rotation.x, 0, transition * 0.1);
        this.rightArm.rotation.x = BABYLON.Scalar.Lerp(this.rightArm.rotation.x, 0, transition * 0.1);
        this.leftArm.rotation.z = BABYLON.Scalar.Lerp(this.leftArm.rotation.z, Math.PI / 8, transition * 0.1);
        this.rightArm.rotation.z = BABYLON.Scalar.Lerp(this.rightArm.rotation.z, -Math.PI / 8, transition * 0.1);
        
        // 脚をまっすぐに
        this.leftLeg.rotation.x = BABYLON.Scalar.Lerp(this.leftLeg.rotation.x, 0, transition * 0.1);
        this.rightLeg.rotation.x = BABYLON.Scalar.Lerp(this.rightLeg.rotation.x, 0, transition * 0.1);
    }
    
    private animateWalk(deltaTime: number, transition: number): void {
        const walkCycle = this.animationTime * 2; // walkSpeedを直接掛けない（速度は移動速度であってアニメーション速度ではない）
        const legSwing = Math.sin(walkCycle) * 0.4; // 脚の振り幅
        const armSwing = Math.sin(walkCycle + Math.PI) * 0.3; // 腕の振り（逆位相）
        const bodyBob = Math.abs(Math.sin(walkCycle * 2)) * 0.03; // 体の上下動
        
        // 体の上下動
        this.torso.position.y = 0.9 + bodyBob;
        
        // 脚のアニメーション
        this.leftLeg.rotation.x = BABYLON.Scalar.Lerp(this.leftLeg.rotation.x, legSwing, transition);
        this.rightLeg.rotation.x = BABYLON.Scalar.Lerp(this.rightLeg.rotation.x, -legSwing, transition);
        
        // 腕のアニメーション
        this.leftArm.rotation.x = BABYLON.Scalar.Lerp(this.leftArm.rotation.x, armSwing, transition);
        this.rightArm.rotation.x = BABYLON.Scalar.Lerp(this.rightArm.rotation.x, -armSwing, transition);
        
        // 腕の自然な角度
        this.leftArm.rotation.z = BABYLON.Scalar.Lerp(this.leftArm.rotation.z, Math.PI / 12, transition);
        this.rightArm.rotation.z = BABYLON.Scalar.Lerp(this.rightArm.rotation.z, -Math.PI / 12, transition);
    }
    
    private animateRun(deltaTime: number, transition: number): void {
        const runCycle = this.animationTime * 3; // runSpeedを直接掛けない
        const legSwing = Math.sin(runCycle) * 0.6; // より大きな脚の振り
        const armSwing = Math.sin(runCycle + Math.PI) * 0.5; // より大きな腕の振り
        const bodyBob = Math.abs(Math.sin(runCycle * 2)) * 0.05; // より大きな体の動き
        const bodyLean = 0.15; // 前傾
        
        // 体の上下動と前傾
        this.torso.position.y = 0.9 + bodyBob;
        this.torso.rotation.x = BABYLON.Scalar.Lerp(this.torso.rotation.x, bodyLean, transition);
        
        // 脚のアニメーション（より大きく）
        this.leftLeg.rotation.x = BABYLON.Scalar.Lerp(this.leftLeg.rotation.x, legSwing, transition);
        this.rightLeg.rotation.x = BABYLON.Scalar.Lerp(this.rightLeg.rotation.x, -legSwing, transition);
        
        // 腕のアニメーション（より大きく）
        this.leftArm.rotation.x = BABYLON.Scalar.Lerp(this.leftArm.rotation.x, armSwing, transition);
        this.rightArm.rotation.x = BABYLON.Scalar.Lerp(this.rightArm.rotation.x, -armSwing, transition);
        
        // 腕をより体に近づける
        this.leftArm.rotation.z = BABYLON.Scalar.Lerp(this.leftArm.rotation.z, Math.PI / 16, transition);
        this.rightArm.rotation.z = BABYLON.Scalar.Lerp(this.rightArm.rotation.z, -Math.PI / 16, transition);
    }
    
    private animateJump(deltaTime: number, transition: number): void {
        // ジャンプの準備姿勢
        const squat = 0.2; // しゃがみ込み
        
        // 体を低くする
        this.torso.position.y = BABYLON.Scalar.Lerp(this.torso.position.y, 0.7, transition);
        
        // 腕を振り上げる
        this.leftArm.rotation.x = BABYLON.Scalar.Lerp(this.leftArm.rotation.x, -Math.PI / 3, transition);
        this.rightArm.rotation.x = BABYLON.Scalar.Lerp(this.rightArm.rotation.x, -Math.PI / 3, transition);
        this.leftArm.rotation.z = BABYLON.Scalar.Lerp(this.leftArm.rotation.z, Math.PI / 6, transition);
        this.rightArm.rotation.z = BABYLON.Scalar.Lerp(this.rightArm.rotation.z, -Math.PI / 6, transition);
        
        // 脚を曲げる
        this.leftLeg.rotation.x = BABYLON.Scalar.Lerp(this.leftLeg.rotation.x, -squat, transition);
        this.rightLeg.rotation.x = BABYLON.Scalar.Lerp(this.rightLeg.rotation.x, -squat, transition);
    }
    
    private animateFall(deltaTime: number, transition: number): void {
        // 落下中の姿勢
        
        // 体を伸ばす
        this.torso.position.y = BABYLON.Scalar.Lerp(this.torso.position.y, 0.9, transition);
        
        // 腕を広げる
        this.leftArm.rotation.x = BABYLON.Scalar.Lerp(this.leftArm.rotation.x, 0, transition);
        this.rightArm.rotation.x = BABYLON.Scalar.Lerp(this.rightArm.rotation.x, 0, transition);
        this.leftArm.rotation.z = BABYLON.Scalar.Lerp(this.leftArm.rotation.z, Math.PI / 2, transition);
        this.rightArm.rotation.z = BABYLON.Scalar.Lerp(this.rightArm.rotation.z, -Math.PI / 2, transition);
        
        // 脚を少し広げる
        this.leftLeg.rotation.x = BABYLON.Scalar.Lerp(this.leftLeg.rotation.x, 0.1, transition);
        this.rightLeg.rotation.x = BABYLON.Scalar.Lerp(this.rightLeg.rotation.x, -0.1, transition);
    }
    
    private animateLand(deltaTime: number, transition: number): void {
        // 着地の衝撃吸収
        const impact = 1 - transition; // 時間とともに減少
        const squat = impact * 0.3;
        
        // 体を低くする（衝撃吸収）
        this.torso.position.y = 0.9 - squat * 0.5;
        
        // 腕を下げる
        this.leftArm.rotation.x = BABYLON.Scalar.Lerp(this.leftArm.rotation.x, 0.2, transition);
        this.rightArm.rotation.x = BABYLON.Scalar.Lerp(this.rightArm.rotation.x, 0.2, transition);
        
        // 脚を曲げる（衝撃吸収）
        this.leftLeg.rotation.x = BABYLON.Scalar.Lerp(this.leftLeg.rotation.x, -squat, transition * 0.5);
        this.rightLeg.rotation.x = BABYLON.Scalar.Lerp(this.rightLeg.rotation.x, -squat, transition * 0.5);
        
        // 1秒後にアイドル状態に自動遷移
        if (this.transitionTime > 1) {
            this.setState('idle');
        }
    }
    
    // StaticAvatarとの互換性のためのメソッド
    getPosition(): BABYLON.Vector3 {
        return this.rootMesh.position.clone();
    }
    
    setPosition(position: BABYLON.Vector3): void {
        this.rootMesh.position.copyFrom(position);
    }
    
    getRootMesh(): BABYLON.Mesh {
        return this.rootMesh;
    }
    
    dispose(): void {
        this.rootMesh.dispose();
    }
    
    setRotation(rotation: BABYLON.Vector3): void {
        this.rootMesh.rotation = rotation;
        // スケールが変更されていないことを確認
        if (this.rootMesh.scaling.x !== 1 || this.rootMesh.scaling.y !== 1 || this.rootMesh.scaling.z !== 1) {
            console.warn('[ANIMATED_AVATAR] Scale has been modified, resetting to 1');
            this.rootMesh.scaling = BABYLON.Vector3.One();
        }
    }
    
    startWalking(): void {
        this.setState('walk');
    }
    
    stopWalking(): void {
        this.setState('idle');
    }
}