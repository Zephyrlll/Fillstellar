import * as THREE from 'three';
import { scene } from './threeSetup.js';
import { GALAXY_BOUNDARY } from './constants.js';

export class BackgroundGalaxies {
    private galaxyMesh: THREE.Mesh | null = null;
    private galaxyGroup: THREE.Group;
    private displayMode: 'none' | 'skybox' | 'sprites' | 'mixed' = 'mixed';
    private nebulaeGroup: THREE.Group;
    private rotationSpeed: number = 0.00005; // ゆっくり回転
    
    constructor() {
        this.galaxyGroup = new THREE.Group();
        this.galaxyGroup.name = 'backgroundGalaxies';
        this.nebulaeGroup = new THREE.Group();
        this.nebulaeGroup.name = 'nebulae';
        scene.add(this.galaxyGroup);
        scene.add(this.nebulaeGroup);
    }
    
    setDisplayMode(mode: 'none' | 'skybox' | 'sprites' | 'mixed'): void {
        console.log('[BACKGROUND] Setting display mode to:', mode);
        this.displayMode = mode;
        this.clearGalaxies();
        
        switch (mode) {
            case 'skybox':
                this.createSkyboxGalaxy();
                console.log('[BACKGROUND] Created skybox galaxy');
                break;
            case 'sprites':
                this.createSpriteGalaxies();
                console.log('[BACKGROUND] Created sprite galaxies');
                break;
            case 'mixed':
                this.createMixedGalaxies();
                console.log('[BACKGROUND] Created mixed galaxies');
                break;
        }
        
        console.log('[BACKGROUND] Galaxy group children:', this.galaxyGroup.children.length);
        console.log('[BACKGROUND] Nebulae group children:', this.nebulaeGroup.children.length);
    }
    
    private clearGalaxies(): void {
        // 銀河グループをクリア
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
        // 星雲グループをクリア
        while (this.nebulaeGroup.children.length > 0) {
            const child = this.nebulaeGroup.children[0];
            this.nebulaeGroup.remove(child);
            if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
                if ('geometry' in child) child.geometry.dispose();
                if ('material' in child && child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        }
    }
    
    private createSkyboxGalaxy(): void {
        // 渦巻銀河の形状を作成
        this.createSpiralGalaxy();
        
        // 遠方の銀河を追加
        this.createDistantGalaxies();
    }
    
    private createSpiralGalaxy(): void {
        // 銀河の中心バルジを作成
        this.createGalacticBulge();
        
        // 渦巻腕を作成
        this.createSpiralArms();
        
        // ハロー星を追加
        this.createHaloStars();
    }
    
    private createGalacticBulge(): void {
        // 銀河中心の明るい球状部分
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const bulgeStars = 2000; // 減らした
        const bulgeRadius = GALAXY_BOUNDARY * 0.3;
        
        for (let i = 0; i < bulgeStars; i++) {
            // 中心に向かって密度が高くなる分布
            const r = Math.pow(Math.random(), 0.5) * bulgeRadius;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.5; // 扁平な形状
            
            const x = r * Math.cos(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * 0.3; // より扁平に
            const z = r * Math.cos(phi) * Math.sin(theta);
            
            positions.push(x, y, z);
            
            // 中心部はより明るく、黄色っぽい古い星
            const brightness = 1.2 - (r / bulgeRadius) * 0.5;
            const temp = 0.9 + Math.random() * 0.1; // 黄色〜オレンジ
            const color = new THREE.Color(1.0, temp, temp * 0.7);
            
            colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
            sizes.push(0.5 + Math.random() * 0.5);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1.2,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const bulge = new THREE.Points(geometry, material);
        bulge.name = 'galacticBulge';
        bulge.frustumCulled = false;
        bulge.renderOrder = -2000;
        this.galaxyGroup.add(bulge);
    }
    
    private createSpiralArms(): void {
        // 4本の渦巻腕を作成
        const armCount = 4;
        const particlesPerArm = 1500; // 減らした
        const galaxyRadius = GALAXY_BOUNDARY * 0.8;
        
        for (let arm = 0; arm < armCount; arm++) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            const armAngle = (arm / armCount) * Math.PI * 2;
            
            for (let i = 0; i < particlesPerArm; i++) {
                // 渦巻の方程式
                const t = i / particlesPerArm;
                const radius = t * galaxyRadius;
                const spiralAngle = armAngle + t * Math.PI * 2.5; // 2.5回転
                
                // 腕の幅の変化
                const armWidth = (1 - t) * galaxyRadius * 0.15;
                const widthOffset = (Math.random() - 0.5) * armWidth;
                const heightOffset = (Math.random() - 0.5) * galaxyRadius * 0.02; // 薄い円盤
                
                // 位置計算
                const x = (radius + widthOffset) * Math.cos(spiralAngle);
                const y = heightOffset;
                const z = (radius + widthOffset) * Math.sin(spiralAngle);
                
                positions.push(x, y, z);
                
                // 腕の星の色（若い青い星が多い）
                const colorType = Math.random();
                let color;
                if (colorType < 0.4) {
                    // 青い若い星
                    color = new THREE.Color(0.7, 0.8, 1.0);
                } else if (colorType < 0.6) {
                    // 白い星
                    color = new THREE.Color(1.0, 1.0, 1.0);
                } else {
                    // 黄色い星
                    color = new THREE.Color(1.0, 0.9, 0.7);
                }
                
                // 外側に行くほど暗くなる
                const brightness = 0.8 - t * 0.5;
                colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
                
                // サイズバリエーション
                sizes.push(0.3 + Math.random() * 0.7);
            }
            
            // ダストレーンを追加（暗い領域）
            const dustParticles = 300; // 減らした
            for (let i = 0; i < dustParticles; i++) {
                const t = Math.random();
                const radius = t * galaxyRadius * 0.9;
                const spiralAngle = armAngle + t * Math.PI * 2.5 - 0.1; // 少しずらす
                
                const dustWidth = (1 - t) * galaxyRadius * 0.08;
                const widthOffset = (Math.random() - 0.5) * dustWidth;
                
                const x = (radius + widthOffset) * Math.cos(spiralAngle);
                const y = (Math.random() - 0.5) * galaxyRadius * 0.01;
                const z = (radius + widthOffset) * Math.sin(spiralAngle);
                
                positions.push(x, y, z);
                
                // ダストは赤みがかった暗い色
                const dustColor = new THREE.Color(0.3, 0.2, 0.1);
                colors.push(dustColor.r, dustColor.g, dustColor.b);
                sizes.push(0.8 + Math.random() * 0.5);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                size: 1.0,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const spiralArm = new THREE.Points(geometry, material);
            spiralArm.name = `spiralArm_${arm}`;
            spiralArm.frustumCulled = false;
            spiralArm.renderOrder = -1999;
            this.galaxyGroup.add(spiralArm);
        }
    }
    
    private createHaloStars(): void {
        // 銀河ハローの古い星
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const haloStars = 800; // 減らした
        const haloRadius = GALAXY_BOUNDARY * 1.2;
        
        for (let i = 0; i < haloStars; i++) {
            // 球状分布
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.7) * haloRadius;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi) * 0.8; // 少し扁平
            const z = r * Math.sin(phi) * Math.sin(theta);
            
            positions.push(x, y, z);
            
            // ハローの星は古いので赤っぽい
            const temp = 0.7 + Math.random() * 0.2;
            const color = new THREE.Color(1.0, temp, temp * 0.6);
            const brightness = 0.3 + Math.random() * 0.3;
            
            colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
            sizes.push(0.2 + Math.random() * 0.3);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.8,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const halo = new THREE.Points(geometry, material);
        halo.name = 'galacticHalo';
        halo.frustumCulled = false;
        halo.renderOrder = -2001;
        this.galaxyGroup.add(halo);
    }
    
    private createDistantGalaxies(): void {
        // 遠方の小さな銀河
        const galaxyCount = 10; // 減らした
        
        for (let i = 0; i < galaxyCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            // 各銀河は50-100個の星で表現
            const starCount = 50 + Math.floor(Math.random() * 50); // 減らした
            
            // ランダムな位置に配置
            const distance = GALAXY_BOUNDARY * (1.5 + Math.random() * 1.0);
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.8;
            
            const centerX = distance * Math.cos(phi) * Math.cos(theta);
            const centerY = distance * Math.sin(phi);
            const centerZ = distance * Math.cos(phi) * Math.sin(theta);
            
            // 銀河のサイズ
            const galaxySize = 500 + Math.random() * 1000;
            
            for (let j = 0; j < starCount; j++) {
                // 小さな楕円形の分布
                const r = Math.pow(Math.random(), 0.5) * galaxySize;
                const a = Math.random() * Math.PI * 2;
                const b = (Math.random() - 0.5) * Math.PI * 0.2;
                
                const x = centerX + r * Math.cos(b) * Math.cos(a);
                const y = centerY + r * Math.sin(b) * 0.3;
                const z = centerZ + r * Math.cos(b) * Math.sin(a);
                
                positions.push(x, y, z);
                
                // 遠方銀河の色（少し赤方偏移）
                const color = new THREE.Color(1.0, 0.9, 0.8);
                const brightness = 0.5 + Math.random() * 0.3;
                
                colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
                sizes.push(0.3 + Math.random() * 0.2);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                size: 0.5,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const distantGalaxy = new THREE.Points(geometry, material);
            distantGalaxy.name = `distantGalaxy_${i}`;
            distantGalaxy.frustumCulled = false;
            distantGalaxy.renderOrder = -2002;
            this.galaxyGroup.add(distantGalaxy);
        }
    }
    
    private createRealisticStarfield(): void {
        // パフォーマンスモードの取得（将来的にグラフィック設定と連動）
        const qualityMultiplier = 1.0; // TODO: graphicsEngine.getQualityMultiplier();
        
        // 3つの距離層で星を配置（パフォーマンス重視）
        const layers = [
            { count: Math.floor(3000 * qualityMultiplier), size: 0.8, distance: GALAXY_BOUNDARY * 1.5, brightness: 0.8 },   // 近い星（明るく大きい）
            { count: Math.floor(5000 * qualityMultiplier), size: 0.5, distance: GALAXY_BOUNDARY * 2.0, brightness: 0.5 },   // 中距離
            { count: Math.floor(7000 * qualityMultiplier), size: 0.3, distance: GALAXY_BOUNDARY * 2.5, brightness: 0.3 }    // 遠い星（小さく暗い）
        ];
        
        layers.forEach((layer, layerIndex) => {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            for (let i = 0; i < layer.count; i++) {
                // 球面上にランダム配置
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = layer.distance;
                
                const x = r * Math.sin(phi) * Math.cos(theta);
                const y = r * Math.sin(phi) * Math.sin(theta);
                const z = r * Math.cos(phi);
                
                positions.push(x, y, z);
                
                // 星の色（実際の恒星の色温度を模倣）
                const colorType = Math.random();
                let color;
                if (colorType < 0.15) {
                    // 赤色巨星（15%）
                    color = new THREE.Color(1.0, 0.7, 0.5);
                } else if (colorType < 0.30) {
                    // 青白い星（15%）
                    color = new THREE.Color(0.8, 0.9, 1.0);
                } else {
                    // 白〜黄色の星（70%）
                    const temp = 0.8 + Math.random() * 0.2;
                    color = new THREE.Color(1.0, temp, temp * 0.8);
                }
                
                // 明るさの変化
                const brightness = layer.brightness * (0.5 + Math.random() * 0.5);
                colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
                
                // サイズの変化
                sizes.push(layer.size * (0.5 + Math.random() * 1.5));
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                size: 1,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const stars = new THREE.Points(geometry, material);
            stars.name = `starLayer_${layerIndex}`;
            stars.frustumCulled = false;
            stars.renderOrder = -2000 - layerIndex;
            this.galaxyGroup.add(stars);
        });
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
                opacity: Math.random() * 0.5 + 0.3,
                fog: false,
                depthTest: false,
                depthWrite: false
            });
            
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // 遠景にランダム配置（より近くに）
            const distance = GALAXY_BOUNDARY * 1.1 + Math.random() * GALAXY_BOUNDARY * 0.3;
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
        // 渦巻銀河と星雲の組み合わせ
        this.createSkyboxGalaxy();
        this.createNebulae();
    }
    
    private createNebulae(): void {
        // 星雲エフェクトを追加
        const nebulaCount = 8;
        
        for (let i = 0; i < nebulaCount; i++) {
            // ポイントクラウドで星雲を表現
            const particleCount = 1000;
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            // 星雲の中心位置（より近くに）
            const centerAngle = (i / nebulaCount) * Math.PI * 2;
            const centerRadius = GALAXY_BOUNDARY * 1.0;
            const centerX = Math.cos(centerAngle) * centerRadius;
            const centerZ = Math.sin(centerAngle) * centerRadius;
            const centerY = (Math.random() - 0.5) * GALAXY_BOUNDARY;
            
            // パーティクルを生成
            for (let j = 0; j < particleCount; j++) {
                // ガウス分布風の配置
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const radius = Math.random() * Math.random() * 2000; // 二乗で中心に集中、より小さく
                
                const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
                const y = centerY + radius * Math.cos(phi);
                const z = centerZ + radius * Math.sin(phi) * Math.sin(theta);
                
                positions.push(x, y, z);
                
                // 色のバリエーション（青紫系）
                const hue = 0.6 + Math.random() * 0.2;
                const saturation = 0.5 + Math.random() * 0.5;
                const lightness = 0.3 + Math.random() * 0.4;
                const color = new THREE.Color().setHSL(hue, saturation, lightness);
                colors.push(color.r, color.g, color.b);
                
                // サイズのバリエーション
                sizes.push(Math.random() * 30 + 10);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            
            // バウンディングスフィアを計算
            geometry.computeBoundingSphere();
            
            const material = new THREE.PointsMaterial({
                size: 20,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false,
                depthTest: false
            });
            
            const nebula = new THREE.Points(geometry, material);
            nebula.name = `nebula_${i}`;
            this.nebulaeGroup.add(nebula);
        }
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
    
    // 不要なメソッドを削除
    
    getDisplayMode(): string {
        return this.displayMode;
    }
    
    update(deltaTime: number): void {
        // 銀河全体をゆっくり回転（反時計回り）
        this.galaxyGroup.rotation.y -= this.rotationSpeed * deltaTime * 60; // 60fpsベース
        
        // 星雲も少し違う速度で回転
        this.nebulaeGroup.rotation.y += this.rotationSpeed * 0.3 * deltaTime * 60;
        
        // 各スパイラルアームを個別に少し動かす
        for (let i = 0; i < 4; i++) {
            const arm = this.galaxyGroup.getObjectByName(`spiralArm_${i}`);
            if (arm) {
                // 渦巻きの中心に向かって少し回転
                arm.rotation.y -= this.rotationSpeed * 0.2 * deltaTime * 60 * (i + 1);
            }
        }
        
        // バルジとハローは異なる速度で回転（差動回転）
        const bulge = this.galaxyGroup.getObjectByName('galacticBulge');
        if (bulge) {
            bulge.rotation.y -= this.rotationSpeed * 1.5 * deltaTime * 60;
        }
        
        const halo = this.galaxyGroup.getObjectByName('galacticHalo');
        if (halo) {
            halo.rotation.y += this.rotationSpeed * 0.1 * deltaTime * 60;
        }
    }
}

// シングルトンインスタンス
export const backgroundGalaxies = new BackgroundGalaxies();