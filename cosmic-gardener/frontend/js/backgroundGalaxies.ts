import * as THREE from 'three';
import { scene } from './threeSetup.js';
import { GALAXY_BOUNDARY } from './constants.js';

export class BackgroundGalaxies {
    private galaxyMesh: THREE.Mesh | null = null;
    private galaxyGroup: THREE.Group;
    private displayMode: 'none' | 'skybox' | 'sprites' | 'mixed' = 'mixed';
    
    constructor() {
        this.galaxyGroup = new THREE.Group();
        this.galaxyGroup.name = 'backgroundGalaxies';
        scene.add(this.galaxyGroup);
    }
    
    setDisplayMode(mode: 'none' | 'skybox' | 'sprites' | 'mixed'): void {
        this.displayMode = mode;
        this.clearGalaxies();
        
        switch (mode) {
            case 'skybox':
                this.createSkyboxGalaxy();
                break;
            case 'sprites':
                this.createSpriteGalaxies();
                break;
            case 'mixed':
                this.createMixedGalaxies();
                break;
        }
    }
    
    private clearGalaxies(): void {
        while (this.galaxyGroup.children.length > 0) {
            const child = this.galaxyGroup.children[0];
            this.galaxyGroup.remove(child);
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        }
    }
    
    private createSkyboxGalaxy(): void {
        // 天球として巨大な球体を作成
        const geometry = new THREE.SphereGeometry(GALAXY_BOUNDARY * 5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.8
        });
        
        this.galaxyMesh = new THREE.Mesh(geometry, material);
        this.galaxyMesh.name = 'skyboxGalaxy';
        this.galaxyGroup.add(this.galaxyMesh);
        
        // 簡単な銀河テクスチャを追加（グラデーション）
        this.addGalaxyTexture(material);
    }
    
    private createSpriteGalaxies(): void {
        // 遠景に複数の銀河スプライトを配置
        const galaxyCount = 20;
        const spriteMap = this.createGalaxySprite();
        
        for (let i = 0; i < galaxyCount; i++) {
            const spriteMaterial = new THREE.SpriteMaterial({
                map: spriteMap,
                color: 0xffffff,
                blending: THREE.AdditiveBlending,
                opacity: Math.random() * 0.5 + 0.3
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // 遠景にランダム配置
            const distance = GALAXY_BOUNDARY * 2 + Math.random() * GALAXY_BOUNDARY;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            sprite.position.set(
                distance * Math.sin(phi) * Math.cos(theta),
                distance * Math.cos(phi),
                distance * Math.sin(phi) * Math.sin(theta)
            );
            
            sprite.scale.setScalar(5000 + Math.random() * 10000);
            this.galaxyGroup.add(sprite);
        }
    }
    
    private createMixedGalaxies(): void {
        // スカイボックスとスプライトの組み合わせ
        this.createSkyboxGalaxy();
        this.createSpriteGalaxies();
    }
    
    private createGalaxySprite(): THREE.Texture {
        // キャンバスで簡単な銀河テクスチャを生成
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        
        // 放射状グラデーション
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(200, 200, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(150, 150, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 100, 200, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // ノイズを追加
        const imageData = ctx.getImageData(0, 0, 256, 256);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * 30;
            imageData.data[i] += noise;
            imageData.data[i + 1] += noise;
            imageData.data[i + 2] += noise * 1.5;
        }
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    private addGalaxyTexture(material: THREE.MeshBasicMaterial): void {
        // シェーダーで銀河風のテクスチャを追加
        material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                vec3 galaxyColor = vec3(0.1, 0.1, 0.3);
                float noise = sin(vUv.x * 50.0) * cos(vUv.y * 50.0) * 0.1;
                diffuseColor.rgb = mix(diffuseColor.rgb, galaxyColor, noise + 0.5);
                `
            );
        };
    }
    
    getDisplayMode(): string {
        return this.displayMode;
    }
}

// シングルトンインスタンス
export const backgroundGalaxies = new BackgroundGalaxies();