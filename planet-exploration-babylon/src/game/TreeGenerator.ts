import * as BABYLON from '@babylonjs/core';
import { PlanetData } from './PlanetExploration';

export interface TreeType {
    name: string;
    trunkColor: BABYLON.Color3;
    leafColor: BABYLON.Color3;
    leafEmissive?: BABYLON.Color3;
    trunkHeight: number;
    trunkRadius: number;
    canopyRadius: number;
    canopyShape: 'sphere' | 'cone' | 'cylinder' | 'custom';
    hasLeaves: boolean;
}

export class TreeGenerator {
    private scene: BABYLON.Scene;
    private treeTypes: Map<PlanetData['type'], TreeType[]> = new Map();
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.initializeTreeTypes();
    }
    
    private initializeTreeTypes(): void {
        // 森林惑星の木
        this.treeTypes.set('forest', [
            {
                name: 'oak',
                trunkColor: new BABYLON.Color3(0.4, 0.3, 0.2),
                leafColor: new BABYLON.Color3(0.2, 0.5, 0.1),
                trunkHeight: 4,
                trunkRadius: 0.5,
                canopyRadius: 3,
                canopyShape: 'sphere',
                hasLeaves: true
            },
            {
                name: 'pine',
                trunkColor: new BABYLON.Color3(0.3, 0.2, 0.1),
                leafColor: new BABYLON.Color3(0.1, 0.3, 0.1),
                trunkHeight: 6,
                trunkRadius: 0.4,
                canopyRadius: 2,
                canopyShape: 'cone',
                hasLeaves: true
            },
            {
                name: 'birch',
                trunkColor: new BABYLON.Color3(0.9, 0.9, 0.8),
                leafColor: new BABYLON.Color3(0.3, 0.6, 0.2),
                trunkHeight: 5,
                trunkRadius: 0.3,
                canopyRadius: 2.5,
                canopyShape: 'sphere',
                hasLeaves: true
            }
        ]);
        
        // 砂漠惑星の植物
        this.treeTypes.set('desert', [
            {
                name: 'cactus',
                trunkColor: new BABYLON.Color3(0.2, 0.4, 0.2),
                leafColor: new BABYLON.Color3(0.2, 0.4, 0.2),
                trunkHeight: 3,
                trunkRadius: 0.6,
                canopyRadius: 0,
                canopyShape: 'custom',
                hasLeaves: false
            },
            {
                name: 'palm',
                trunkColor: new BABYLON.Color3(0.5, 0.4, 0.3),
                leafColor: new BABYLON.Color3(0.3, 0.5, 0.2),
                trunkHeight: 4,
                trunkRadius: 0.3,
                canopyRadius: 2,
                canopyShape: 'custom',
                hasLeaves: true
            }
        ]);
        
        // 氷惑星の植物
        this.treeTypes.set('ice', [
            {
                name: 'crystal_tree',
                trunkColor: new BABYLON.Color3(0.7, 0.8, 0.9),
                leafColor: new BABYLON.Color3(0.8, 0.9, 1.0),
                leafEmissive: new BABYLON.Color3(0.1, 0.2, 0.3),
                trunkHeight: 3,
                trunkRadius: 0.4,
                canopyRadius: 2,
                canopyShape: 'custom',
                hasLeaves: true
            }
        ]);
        
        // エイリアン惑星の植物
        this.treeTypes.set('alien', [
            {
                name: 'mushroom_tree',
                trunkColor: new BABYLON.Color3(0.5, 0.3, 0.6),
                leafColor: new BABYLON.Color3(0.8, 0.3, 0.9),
                leafEmissive: new BABYLON.Color3(0.3, 0.1, 0.4),
                trunkHeight: 2,
                trunkRadius: 0.8,
                canopyRadius: 3,
                canopyShape: 'sphere',
                hasLeaves: true
            },
            {
                name: 'tentacle_tree',
                trunkColor: new BABYLON.Color3(0.3, 0.5, 0.4),
                leafColor: new BABYLON.Color3(0.6, 0.3, 0.8),
                leafEmissive: new BABYLON.Color3(0.2, 0.1, 0.3),
                trunkHeight: 4,
                trunkRadius: 0.5,
                canopyRadius: 2,
                canopyShape: 'custom',
                hasLeaves: true
            }
        ]);
        
        // 火山惑星の植物（熱に強い）
        this.treeTypes.set('volcanic', [
            {
                name: 'obsidian_spike',
                trunkColor: new BABYLON.Color3(0.1, 0.1, 0.1),
                leafColor: new BABYLON.Color3(0.8, 0.2, 0.1),
                leafEmissive: new BABYLON.Color3(0.5, 0.1, 0.0),
                trunkHeight: 3,
                trunkRadius: 0.3,
                canopyRadius: 0,
                canopyShape: 'custom',
                hasLeaves: false
            }
        ]);
        
        // 海洋惑星の植物（島に生える）
        this.treeTypes.set('ocean', [
            {
                name: 'coral_tree',
                trunkColor: new BABYLON.Color3(0.9, 0.6, 0.5),
                leafColor: new BABYLON.Color3(0.2, 0.6, 0.7),
                trunkHeight: 2,
                trunkRadius: 0.4,
                canopyRadius: 1.5,
                canopyShape: 'custom',
                hasLeaves: true
            }
        ]);
    }
    
    createTree(planetType: PlanetData['type'], position: BABYLON.Vector3, normal: BABYLON.Vector3): BABYLON.Mesh | null {
        const treeTypesForPlanet = this.treeTypes.get(planetType);
        if (!treeTypesForPlanet || treeTypesForPlanet.length === 0) {
            return null;
        }
        
        // ランダムに木のタイプを選択
        const treeType = treeTypesForPlanet[Math.floor(Math.random() * treeTypesForPlanet.length)];
        
        // ルートメッシュ
        const treeMesh = new BABYLON.Mesh(`tree_${treeType.name}`, this.scene);
        treeMesh.position = position.clone();
        
        // 法線方向に向ける
        const rotationMatrix = this.getRotationMatrixFromNormal(normal);
        treeMesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
        
        // 幹を作成
        const trunk = this.createTrunk(treeType);
        trunk.parent = treeMesh;
        
        // 葉を作成
        if (treeType.hasLeaves) {
            const canopy = this.createCanopy(treeType);
            canopy.parent = treeMesh;
        }
        
        // 特殊な木の追加要素
        if (treeType.name === 'cactus') {
            this.addCactusArms(treeMesh, treeType);
        } else if (treeType.name === 'palm') {
            this.addPalmLeaves(treeMesh, treeType);
        } else if (treeType.name === 'crystal_tree') {
            this.addCrystalBranches(treeMesh, treeType);
        } else if (treeType.name === 'tentacle_tree') {
            this.addTentacles(treeMesh, treeType);
        }
        
        return treeMesh;
    }
    
    private createTrunk(treeType: TreeType): BABYLON.Mesh {
        let trunk: BABYLON.Mesh;
        
        if (treeType.name === 'cactus') {
            // サボテンは円柱を変形
            trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', {
                height: treeType.trunkHeight,
                diameterTop: treeType.trunkRadius * 1.8,
                diameterBottom: treeType.trunkRadius * 2,
                tessellation: 8
            }, this.scene);
        } else {
            // 通常の木は円錐台
            trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', {
                height: treeType.trunkHeight,
                diameterTop: treeType.trunkRadius * 1.5,
                diameterBottom: treeType.trunkRadius * 2,
                tessellation: 16
            }, this.scene);
        }
        
        trunk.position.y = treeType.trunkHeight / 2;
        
        // マテリアル
        const trunkMat = new BABYLON.StandardMaterial(`trunk_mat_${treeType.name}`, this.scene);
        trunkMat.diffuseColor = treeType.trunkColor;
        trunkMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        trunk.material = trunkMat;
        
        return trunk;
    }
    
    private createCanopy(treeType: TreeType): BABYLON.Mesh {
        let canopy: BABYLON.Mesh;
        
        switch (treeType.canopyShape) {
            case 'sphere':
                canopy = BABYLON.MeshBuilder.CreateSphere('canopy', {
                    diameter: treeType.canopyRadius * 2,
                    segments: 16
                }, this.scene);
                canopy.position.y = treeType.trunkHeight + treeType.canopyRadius * 0.8;
                break;
                
            case 'cone':
                canopy = BABYLON.MeshBuilder.CreateCylinder('canopy', {
                    height: treeType.canopyRadius * 2,
                    diameterTop: 0,
                    diameterBottom: treeType.canopyRadius * 2,
                    tessellation: 16
                }, this.scene);
                canopy.position.y = treeType.trunkHeight + treeType.canopyRadius;
                break;
                
            case 'cylinder':
                canopy = BABYLON.MeshBuilder.CreateCylinder('canopy', {
                    height: treeType.canopyRadius,
                    diameter: treeType.canopyRadius * 2,
                    tessellation: 16
                }, this.scene);
                canopy.position.y = treeType.trunkHeight + treeType.canopyRadius / 2;
                break;
                
            default:
                // カスタム形状はそれぞれの木で個別に処理
                canopy = new BABYLON.Mesh('canopy', this.scene);
                break;
        }
        
        // マテリアル
        const canopyMat = new BABYLON.StandardMaterial(`canopy_mat_${treeType.name}`, this.scene);
        canopyMat.diffuseColor = treeType.leafColor;
        if (treeType.leafEmissive) {
            canopyMat.emissiveColor = treeType.leafEmissive;
        }
        canopy.material = canopyMat;
        
        return canopy;
    }
    
    private addCactusArms(parent: BABYLON.Mesh, treeType: TreeType): void {
        // サボテンの腕を追加
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
            const arm = BABYLON.MeshBuilder.CreateCylinder('cactus_arm', {
                height: treeType.trunkHeight * 0.5,
                diameter: treeType.trunkRadius,
                tessellation: 8
            }, this.scene);
            
            const angle = Math.random() * Math.PI * 2;
            const height = 0.3 + Math.random() * 0.4;
            
            arm.position.x = Math.cos(angle) * treeType.trunkRadius;
            arm.position.y = treeType.trunkHeight * height;
            arm.position.z = Math.sin(angle) * treeType.trunkRadius;
            arm.rotation.z = Math.cos(angle) * 0.5;
            arm.rotation.x = Math.sin(angle) * 0.5;
            
            arm.material = parent.getChildMeshes()[0].material;
            arm.parent = parent;
        }
    }
    
    private addPalmLeaves(parent: BABYLON.Mesh, treeType: TreeType): void {
        // ヤシの葉を追加
        const leafCount = 6 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < leafCount; i++) {
            const leaf = BABYLON.MeshBuilder.CreatePlane('palm_leaf', {
                width: 3,
                height: 1
            }, this.scene);
            
            const angle = (i / leafCount) * Math.PI * 2;
            leaf.position.x = Math.cos(angle) * 0.5;
            leaf.position.y = treeType.trunkHeight;
            leaf.position.z = Math.sin(angle) * 0.5;
            
            leaf.rotation.y = angle;
            leaf.rotation.z = -0.3 - Math.random() * 0.3;
            
            // 葉のマテリアル
            const leafMat = new BABYLON.StandardMaterial('palm_leaf_mat', this.scene);
            leafMat.diffuseColor = treeType.leafColor;
            leafMat.backFaceCulling = false;
            leaf.material = leafMat;
            
            leaf.parent = parent;
        }
    }
    
    private addCrystalBranches(parent: BABYLON.Mesh, treeType: TreeType): void {
        // 結晶の枝を追加
        for (let i = 0; i < 5; i++) {
            const crystal = BABYLON.MeshBuilder.CreateCylinder('crystal', {
                height: 1 + Math.random(),
                diameterTop: 0,
                diameterBottom: 0.3,
                tessellation: 6
            }, this.scene);
            
            const angle = Math.random() * Math.PI * 2;
            const height = 0.3 + Math.random() * 0.6;
            
            crystal.position.x = Math.cos(angle) * treeType.trunkRadius * 2;
            crystal.position.y = treeType.trunkHeight * height;
            crystal.position.z = Math.sin(angle) * treeType.trunkRadius * 2;
            
            crystal.rotation.x = (Math.random() - 0.5) * 0.5;
            crystal.rotation.z = (Math.random() - 0.5) * 0.5;
            
            // 結晶のマテリアル
            const crystalMat = new BABYLON.StandardMaterial('crystal_mat', this.scene);
            crystalMat.diffuseColor = treeType.leafColor;
            crystalMat.emissiveColor = treeType.leafEmissive || new BABYLON.Color3(0, 0, 0);
            crystalMat.specularColor = new BABYLON.Color3(1, 1, 1);
            crystalMat.specularPower = 128;
            crystal.material = crystalMat;
            
            crystal.parent = parent;
        }
    }
    
    private addTentacles(parent: BABYLON.Mesh, treeType: TreeType): void {
        // 触手を追加
        for (let i = 0; i < 4; i++) {
            const tentacle = BABYLON.MeshBuilder.CreateTube('tentacle', {
                path: this.createTentaclePath(treeType.trunkHeight),
                radius: 0.2,
                tessellation: 16,
                updatable: false
            }, this.scene);
            
            tentacle.rotation.y = (i / 4) * Math.PI * 2;
            
            // 触手のマテリアル
            const tentacleMat = new BABYLON.StandardMaterial('tentacle_mat', this.scene);
            tentacleMat.diffuseColor = treeType.leafColor;
            tentacleMat.emissiveColor = treeType.leafEmissive || new BABYLON.Color3(0, 0, 0);
            tentacle.material = tentacleMat;
            
            tentacle.parent = parent;
        }
    }
    
    private createTentaclePath(baseHeight: number): BABYLON.Vector3[] {
        const path: BABYLON.Vector3[] = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const height = baseHeight * 0.8 + t * baseHeight * 0.5;
            const radius = t * 2;
            const angle = t * Math.PI * 2;
            
            path.push(new BABYLON.Vector3(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            ));
        }
        
        return path;
    }
    
    private getRotationMatrixFromNormal(normal: BABYLON.Vector3): BABYLON.Matrix {
        const up = BABYLON.Vector3.Up();
        let right = BABYLON.Vector3.Cross(up, normal);
        
        if (right.length() < 0.001) {
            right = BABYLON.Vector3.Cross(BABYLON.Vector3.Forward(), normal);
        }
        
        right.normalize();
        const forward = BABYLON.Vector3.Cross(normal, right);
        
        return BABYLON.Matrix.FromValues(
            right.x, right.y, right.z, 0,
            normal.x, normal.y, normal.z, 0,
            forward.x, forward.y, forward.z, 0,
            0, 0, 0, 1
        );
    }
}
