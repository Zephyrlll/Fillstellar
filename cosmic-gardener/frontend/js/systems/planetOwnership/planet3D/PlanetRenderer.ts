/**
 * Planet Renderer
 * 惑星の3Dレンダリング
 */

import * as THREE from 'three';
import { OwnedPlanet } from '../planetShop.js';
import { PlanetMaterials } from './PlanetMaterials.js';

export class PlanetRenderer {
    private scene: THREE.Scene;
    private planet: OwnedPlanet;
    private planetMesh: THREE.Mesh | null = null;
    private atmosphereMesh: THREE.Mesh | null = null;
    private cloudsMesh: THREE.Mesh | null = null;
    private rotationSpeed = 0.001;
    public radius = 1000;
    
    constructor(scene: THREE.Scene, planet: OwnedPlanet) {
        this.scene = scene;
        this.planet = planet;
    }
    
    /**
     * 惑星を作成
     */
    create(): void {
        console.log('[PlanetRenderer] Creating planet:', this.planet.type);
        
        // 惑星の球体（大きくする）
        const geometry = new THREE.SphereGeometry(this.radius, 128, 64);
        
        // 惑星タイプに応じたマテリアルを取得
        const material = PlanetMaterials.getMaterial(this.planet.type);
        
        this.planetMesh = new THREE.Mesh(geometry, material);
        this.planetMesh.castShadow = true;
        this.planetMesh.receiveShadow = true;
        this.planetMesh.position.set(0, 0, 0);
        this.scene.add(this.planetMesh);
        
        console.log('[PlanetRenderer] Planet mesh created and added to scene');
        
        // 惑星タイプに応じた追加要素
        switch (this.planet.type) {
            case 'ocean':
                this.addOceanEffects(this.radius);
                break;
            case 'forest':
                this.addForestEffects(this.radius);
                break;
            case 'ice':
                this.addIceEffects(this.radius);
                break;
            case 'volcanic':
                this.addVolcanicEffects(this.radius);
                break;
            case 'gas':
                this.addGasEffects(this.radius);
                break;
            case 'desert':
                this.addDesertEffects(this.radius);
                break;
        }
        
        // 大気圏を追加（ガス惑星以外）
        if (this.planet.type !== 'gas') {
            this.addAtmosphere(this.radius);
        }
    }
    
    /**
     * 大気圏を追加
     */
    private addAtmosphere(radius: number): void {
        const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.1, 32, 32);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: this.getAtmosphereColor(),
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        
        this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(this.atmosphereMesh);
    }
    
    /**
     * 海洋惑星のエフェクト
     */
    private addOceanEffects(radius: number): void {
        // 雲の層
        const cloudsGeometry = new THREE.SphereGeometry(radius * 1.02, 32, 32);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
            map: this.generateCloudsTexture(),
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
        
        this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        this.scene.add(this.cloudsMesh);
    }
    
    /**
     * 森林惑星のエフェクト
     */
    private addForestEffects(radius: number): void {
        // 薄い雲
        const cloudsGeometry = new THREE.SphereGeometry(radius * 1.01, 32, 32);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
            map: this.generateCloudsTexture(),
            transparent: true,
            opacity: 0.3,
            depthWrite: false
        });
        
        this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        this.scene.add(this.cloudsMesh);
    }
    
    /**
     * 氷惑星のエフェクト
     */
    private addIceEffects(radius: number): void {
        // オーロラ効果（将来実装）
    }
    
    /**
     * 火山惑星のエフェクト
     */
    private addVolcanicEffects(radius: number): void {
        // 火山の噴煙パーティクル（将来実装）
    }
    
    /**
     * ガス惑星のエフェクト
     */
    private addGasEffects(radius: number): void {
        // 渦巻く雲の層
        for (let i = 0; i < 3; i++) {
            const layerRadius = radius * (1.02 + i * 0.02);
            const layerGeometry = new THREE.SphereGeometry(layerRadius, 32, 32);
            const layerMaterial = new THREE.MeshPhongMaterial({
                map: this.generateGasLayerTexture(i),
                transparent: true,
                opacity: 0.3 - i * 0.05,
                depthWrite: false
            });
            
            const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
            this.scene.add(layerMesh);
        }
    }
    
    /**
     * 砂漠惑星のエフェクト
     */
    private addDesertEffects(radius: number): void {
        // 砂嵐効果（将来実装）
    }
    
    /**
     * 大気圏の色を取得
     */
    private getAtmosphereColor(): THREE.Color {
        const colors: Record<string, THREE.Color> = {
            desert: new THREE.Color(0xFFAA44),
            ocean: new THREE.Color(0x44AAFF),
            forest: new THREE.Color(0x44FF44),
            ice: new THREE.Color(0xAADDFF),
            volcanic: new THREE.Color(0xFF4444),
            gas: new THREE.Color(0xFFFFAA)
        };
        return colors[this.planet.type] || new THREE.Color(0xFFFFFF);
    }
    
    /**
     * 雲のテクスチャを生成
     */
    private generateCloudsTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        // グラデーションで雲を表現
        context.fillStyle = 'rgba(255, 255, 255, 0)';
        context.fillRect(0, 0, 512, 256);
        
        // ランダムな雲を描画
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 256;
            const radius = Math.random() * 30 + 10;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            context.fillStyle = gradient;
            context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    /**
     * ガス層のテクスチャを生成
     */
    private generateGasLayerTexture(layer: number): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        // 層ごとに色を変える
        const colors = [
            ['#FFE4B5', '#FFA500'],
            ['#FFB6C1', '#FF69B4'],
            ['#E6E6FA', '#9370DB']
        ];
        
        const [color1, color2] = colors[layer % colors.length];
        
        // 横縞パターン
        for (let y = 0; y < 256; y += 10) {
            const gradient = context.createLinearGradient(0, y, 512, y);
            gradient.addColorStop(0, y % 20 === 0 ? color1 : color2);
            gradient.addColorStop(0.5, y % 20 === 0 ? color2 : color1);
            gradient.addColorStop(1, y % 20 === 0 ? color1 : color2);
            
            context.fillStyle = gradient;
            context.fillRect(0, y, 512, 10);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    /**
     * 更新
     */
    update(): void {
        // 惑星の自転
        if (this.planetMesh) {
            this.planetMesh.rotation.y += this.rotationSpeed;
        }
        
        // 雲の回転
        if (this.cloudsMesh) {
            this.cloudsMesh.rotation.y += this.rotationSpeed * 1.2;
        }
        
        // 大気圏の脈動
        if (this.atmosphereMesh) {
            const scale = 1 + Math.sin(Date.now() * 0.001) * 0.01;
            this.atmosphereMesh.scale.setScalar(scale);
        }
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.planetMesh) {
            this.planetMesh.geometry.dispose();
            if (Array.isArray(this.planetMesh.material)) {
                this.planetMesh.material.forEach(m => m.dispose());
            } else {
                this.planetMesh.material.dispose();
            }
            this.scene.remove(this.planetMesh);
        }
        
        if (this.atmosphereMesh) {
            this.atmosphereMesh.geometry.dispose();
            if (Array.isArray(this.atmosphereMesh.material)) {
                this.atmosphereMesh.material.forEach(m => m.dispose());
            } else {
                this.atmosphereMesh.material.dispose();
            }
            this.scene.remove(this.atmosphereMesh);
        }
        
        if (this.cloudsMesh) {
            this.cloudsMesh.geometry.dispose();
            if (Array.isArray(this.cloudsMesh.material)) {
                this.cloudsMesh.material.forEach(m => m.dispose());
            } else {
                this.cloudsMesh.material.dispose();
            }
            this.scene.remove(this.cloudsMesh);
        }
    }
}