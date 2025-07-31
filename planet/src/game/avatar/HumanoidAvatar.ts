import * as BABYLON from '@babylonjs/core';

export interface AvatarCustomization {
    height: number;
    bodyType: 'slim' | 'normal' | 'athletic';
    skinColor: BABYLON.Color3;
    hairColor: BABYLON.Color3;
    clothingColor: BABYLON.Color3;
}

export class HumanoidAvatar {
    private scene: BABYLON.Scene;
    private rootMesh: BABYLON.Mesh;
    private bodyParts: Map<string, BABYLON.Mesh> = new Map();
    private bones: Map<string, BABYLON.TransformNode> = new Map();
    private customization: AvatarCustomization;
    
    // ボーン名の定義
    private readonly BONE_NAMES = {
        ROOT: 'root',
        SPINE: 'spine',
        CHEST: 'chest',
        NECK: 'neck',
        HEAD: 'head',
        LEFT_SHOULDER: 'leftShoulder',
        LEFT_UPPER_ARM: 'leftUpperArm',
        LEFT_LOWER_ARM: 'leftLowerArm',
        LEFT_HAND: 'leftHand',
        RIGHT_SHOULDER: 'rightShoulder',
        RIGHT_UPPER_ARM: 'rightUpperArm',
        RIGHT_LOWER_ARM: 'rightLowerArm',
        RIGHT_HAND: 'rightHand',
        PELVIS: 'pelvis',
        LEFT_UPPER_LEG: 'leftUpperLeg',
        LEFT_LOWER_LEG: 'leftLowerLeg',
        LEFT_FOOT: 'leftFoot',
        RIGHT_UPPER_LEG: 'rightUpperLeg',
        RIGHT_LOWER_LEG: 'rightLowerLeg',
        RIGHT_FOOT: 'rightFoot'
    };
    
    constructor(scene: BABYLON.Scene, customization?: AvatarCustomization) {
        this.scene = scene;
        this.customization = customization || {
            height: 1.75,
            bodyType: 'normal',
            skinColor: new BABYLON.Color3(0.96, 0.82, 0.69),
            hairColor: new BABYLON.Color3(0.2, 0.15, 0.1),
            clothingColor: new BABYLON.Color3(0.2, 0.3, 0.5)
        };
        
        this.createAvatar();
    }
    
    private createAvatar(): void {
        // ルートノード
        this.rootMesh = new BABYLON.Mesh('avatarRoot', this.scene);
        this.rootMesh.position.y = 0;
        
        // ボーン構造を作成
        this.createBoneStructure();
        
        // 体のパーツを作成
        this.createHead();
        this.createTorso();
        this.createArms();
        this.createLegs();
        
        // スケールを適用
        this.rootMesh.scaling.scaleInPlace(this.customization.height / 1.75);
    }
    
    private createBoneStructure(): void {
        // ルートボーン
        const root = new BABYLON.TransformNode(this.BONE_NAMES.ROOT, this.scene);
        root.parent = this.rootMesh;
        this.bones.set(this.BONE_NAMES.ROOT, root);
        
        // 骨盤
        const pelvis = new BABYLON.TransformNode(this.BONE_NAMES.PELVIS, this.scene);
        pelvis.parent = root;
        pelvis.position.y = 0.9;
        this.bones.set(this.BONE_NAMES.PELVIS, pelvis);
        
        // 背骨
        const spine = new BABYLON.TransformNode(this.BONE_NAMES.SPINE, this.scene);
        spine.parent = pelvis;
        spine.position.y = 0.2;
        this.bones.set(this.BONE_NAMES.SPINE, spine);
        
        // 胸
        const chest = new BABYLON.TransformNode(this.BONE_NAMES.CHEST, this.scene);
        chest.parent = spine;
        chest.position.y = 0.3;
        this.bones.set(this.BONE_NAMES.CHEST, chest);
        
        // 首
        const neck = new BABYLON.TransformNode(this.BONE_NAMES.NECK, this.scene);
        neck.parent = chest;
        neck.position.y = 0.2;
        this.bones.set(this.BONE_NAMES.NECK, neck);
        
        // 頭
        const head = new BABYLON.TransformNode(this.BONE_NAMES.HEAD, this.scene);
        head.parent = neck;
        head.position.y = 0.1;
        this.bones.set(this.BONE_NAMES.HEAD, head);
        
        // 腕のボーンを作成
        this.createArmBones(chest, 'left', -0.2);
        this.createArmBones(chest, 'right', 0.2);
        
        // 脚のボーンを作成
        this.createLegBones(pelvis, 'left', -0.1);
        this.createLegBones(pelvis, 'right', 0.1);
    }
    
    private createArmBones(parent: BABYLON.TransformNode, side: 'left' | 'right', xOffset: number): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        
        // 肩
        const shoulder = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_SHOULDER`], this.scene);
        shoulder.parent = parent;
        shoulder.position.set(xOffset, 0.1, 0);
        this.bones.set(this.BONE_NAMES[`${prefix}_SHOULDER`], shoulder);
        
        // 上腕
        const upperArm = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_UPPER_ARM`], this.scene);
        upperArm.parent = shoulder;
        upperArm.position.set(xOffset * 0.5, -0.05, 0);
        this.bones.set(this.BONE_NAMES[`${prefix}_UPPER_ARM`], upperArm);
        
        // 前腕
        const lowerArm = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_LOWER_ARM`], this.scene);
        lowerArm.parent = upperArm;
        lowerArm.position.set(0, -0.3, 0);
        this.bones.set(this.BONE_NAMES[`${prefix}_LOWER_ARM`], lowerArm);
        
        // 手
        const hand = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_HAND`], this.scene);
        hand.parent = lowerArm;
        hand.position.set(0, -0.3, 0);
        this.bones.set(this.BONE_NAMES[`${prefix}_HAND`], hand);
    }
    
    private createLegBones(parent: BABYLON.TransformNode, side: 'left' | 'right', xOffset: number): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        
        // 太もも
        const upperLeg = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_UPPER_LEG`], this.scene);
        upperLeg.parent = parent;
        upperLeg.position.set(xOffset, -0.1, 0);
        this.bones.set(this.BONE_NAMES[`${prefix}_UPPER_LEG`], upperLeg);
        
        // すね
        const lowerLeg = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_LOWER_LEG`], this.scene);
        lowerLeg.parent = upperLeg;
        lowerLeg.position.set(0, -0.4, 0);
        this.bones.set(this.BONE_NAMES[`${prefix}_LOWER_LEG`], lowerLeg);
        
        // 足
        const foot = new BABYLON.TransformNode(this.BONE_NAMES[`${prefix}_FOOT`], this.scene);
        foot.parent = lowerLeg;
        foot.position.set(0, -0.4, 0.05);
        this.bones.set(this.BONE_NAMES[`${prefix}_FOOT`], foot);
    }
    
    private createHead(): void {
        // 頭部
        const head = BABYLON.MeshBuilder.CreateSphere('head', {
            diameter: 0.25,
            segments: 16
        }, this.scene);
        head.parent = this.bones.get(this.BONE_NAMES.HEAD);
        head.position.y = 0.15;
        
        // 首
        const neck = BABYLON.MeshBuilder.CreateCylinder('neck', {
            height: 0.15,
            diameterTop: 0.08,
            diameterBottom: 0.1,
            tessellation: 12
        }, this.scene);
        neck.parent = this.bones.get(this.BONE_NAMES.NECK);
        neck.position.y = 0.05;
        
        // 髪の毛（簡易版）
        const hair = BABYLON.MeshBuilder.CreateSphere('hair', {
            diameter: 0.27,
            segments: 12
        }, this.scene);
        hair.parent = head;
        hair.position.y = 0.05;
        hair.scaling.y = 0.8;
        
        // マテリアル設定
        const skinMat = new BABYLON.StandardMaterial('skinMat', this.scene);
        skinMat.diffuseColor = this.customization.skinColor;
        head.material = skinMat;
        neck.material = skinMat;
        
        const hairMat = new BABYLON.StandardMaterial('hairMat', this.scene);
        hairMat.diffuseColor = this.customization.hairColor;
        hair.material = hairMat;
        
        this.bodyParts.set('head', head);
        this.bodyParts.set('neck', neck);
        this.bodyParts.set('hair', hair);
    }
    
    private createTorso(): void {
        // 胸部
        const chest = BABYLON.MeshBuilder.CreateBox('chest', {
            width: 0.35,
            height: 0.4,
            depth: 0.2
        }, this.scene);
        chest.parent = this.bones.get(this.BONE_NAMES.CHEST);
        chest.position.y = -0.1;
        
        // 腹部
        const abdomen = BABYLON.MeshBuilder.CreateBox('abdomen', {
            width: 0.3,
            height: 0.3,
            depth: 0.18
        }, this.scene);
        abdomen.parent = this.bones.get(this.BONE_NAMES.SPINE);
        abdomen.position.y = -0.1;
        
        // 骨盤
        const pelvis = BABYLON.MeshBuilder.CreateBox('pelvis', {
            width: 0.32,
            height: 0.2,
            depth: 0.2
        }, this.scene);
        pelvis.parent = this.bones.get(this.BONE_NAMES.PELVIS);
        pelvis.position.y = -0.05;
        
        // 服のマテリアル
        const clothingMat = new BABYLON.StandardMaterial('clothingMat', this.scene);
        clothingMat.diffuseColor = this.customization.clothingColor;
        
        chest.material = clothingMat;
        abdomen.material = clothingMat;
        pelvis.material = clothingMat;
        
        this.bodyParts.set('chest', chest);
        this.bodyParts.set('abdomen', abdomen);
        this.bodyParts.set('pelvis', pelvis);
    }
    
    private createArms(): void {
        this.createArm('left');
        this.createArm('right');
    }
    
    private createArm(side: 'left' | 'right'): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        
        // 上腕
        const upperArm = BABYLON.MeshBuilder.CreateCylinder(`${side}UpperArm`, {
            height: 0.3,
            diameterTop: 0.08,
            diameterBottom: 0.06,
            tessellation: 12
        }, this.scene);
        upperArm.parent = this.bones.get(this.BONE_NAMES[`${prefix}_UPPER_ARM`]);
        upperArm.position.y = -0.15;
        
        // 前腕
        const lowerArm = BABYLON.MeshBuilder.CreateCylinder(`${side}LowerArm`, {
            height: 0.28,
            diameterTop: 0.06,
            diameterBottom: 0.05,
            tessellation: 12
        }, this.scene);
        lowerArm.parent = this.bones.get(this.BONE_NAMES[`${prefix}_LOWER_ARM`]);
        lowerArm.position.y = -0.14;
        
        // 手
        const hand = BABYLON.MeshBuilder.CreateSphere(`${side}Hand`, {
            diameter: 0.08,
            segments: 8
        }, this.scene);
        hand.parent = this.bones.get(this.BONE_NAMES[`${prefix}_HAND`]);
        hand.position.y = -0.04;
        
        // マテリアル設定
        const skinMat = new BABYLON.StandardMaterial(`${side}ArmSkinMat`, this.scene);
        skinMat.diffuseColor = this.customization.skinColor;
        
        const clothingMat = new BABYLON.StandardMaterial(`${side}ArmClothingMat`, this.scene);
        clothingMat.diffuseColor = this.customization.clothingColor;
        
        upperArm.material = clothingMat;
        lowerArm.material = skinMat;
        hand.material = skinMat;
        
        this.bodyParts.set(`${side}UpperArm`, upperArm);
        this.bodyParts.set(`${side}LowerArm`, lowerArm);
        this.bodyParts.set(`${side}Hand`, hand);
    }
    
    private createLegs(): void {
        this.createLeg('left');
        this.createLeg('right');
    }
    
    private createLeg(side: 'left' | 'right'): void {
        const prefix = side === 'left' ? 'LEFT' : 'RIGHT';
        
        // 太もも
        const upperLeg = BABYLON.MeshBuilder.CreateCylinder(`${side}UpperLeg`, {
            height: 0.4,
            diameterTop: 0.12,
            diameterBottom: 0.08,
            tessellation: 12
        }, this.scene);
        upperLeg.parent = this.bones.get(this.BONE_NAMES[`${prefix}_UPPER_LEG`]);
        upperLeg.position.y = -0.2;
        
        // すね
        const lowerLeg = BABYLON.MeshBuilder.CreateCylinder(`${side}LowerLeg`, {
            height: 0.38,
            diameterTop: 0.08,
            diameterBottom: 0.06,
            tessellation: 12
        }, this.scene);
        lowerLeg.parent = this.bones.get(this.BONE_NAMES[`${prefix}_LOWER_LEG`]);
        lowerLeg.position.y = -0.19;
        
        // 足
        const foot = BABYLON.MeshBuilder.CreateBox(`${side}Foot`, {
            width: 0.08,
            height: 0.05,
            depth: 0.2
        }, this.scene);
        foot.parent = this.bones.get(this.BONE_NAMES[`${prefix}_FOOT`]);
        foot.position.y = -0.025;
        foot.position.z = 0.05;
        
        // マテリアル設定
        const clothingMat = new BABYLON.StandardMaterial(`${side}LegClothingMat`, this.scene);
        clothingMat.diffuseColor = this.customization.clothingColor;
        
        const shoeMat = new BABYLON.StandardMaterial(`${side}ShoeMat`, this.scene);
        shoeMat.diffuseColor = new BABYLON.Color3(0.2, 0.1, 0.05);
        
        upperLeg.material = clothingMat;
        lowerLeg.material = clothingMat;
        foot.material = shoeMat;
        
        this.bodyParts.set(`${side}UpperLeg`, upperLeg);
        this.bodyParts.set(`${side}LowerLeg`, lowerLeg);
        this.bodyParts.set(`${side}Foot`, foot);
    }
    
    public getRootMesh(): BABYLON.Mesh {
        return this.rootMesh;
    }
    
    public getBone(boneName: string): BABYLON.TransformNode | undefined {
        return this.bones.get(boneName);
    }
    
    public getBodyPart(partName: string): BABYLON.Mesh | undefined {
        return this.bodyParts.get(partName);
    }
    
    public setPosition(position: BABYLON.Vector3): void {
        this.rootMesh.position = position;
    }
    
    public setRotation(rotation: BABYLON.Vector3): void {
        this.rootMesh.rotation = rotation;
    }
    
    public dispose(): void {
        this.bodyParts.forEach(part => part.dispose());
        this.bones.forEach(bone => bone.dispose());
        this.rootMesh.dispose();
    }
}