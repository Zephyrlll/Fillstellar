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
        this.galaxyGroup.position.set(0, 0, 0); // 原点に固定
        this.nebulaeGroup = new THREE.Group();
        this.nebulaeGroup.name = 'nebulae';
        this.nebulaeGroup.position.set(0, 0, 0); // 原点に固定
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
        
        const bulgeStars = 1400; // 30%削減（2000 → 1400）
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
        // 2本の渦巻腕を作成（より現実的）
        const armCount = 2;
        const particlesPerArm = 2100; // 30%削減（3000 → 2100）
        const galaxyRadius = GALAXY_BOUNDARY * 0.8;
        
        for (let arm = 0; arm < armCount; arm++) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            const armAngle = (arm / armCount) * Math.PI * 2; // 180度離れた位置から開始
            
            for (let i = 0; i < particlesPerArm; i++) {
                // 渦巻の方程式
                const t = i / particlesPerArm;
                const radius = t * galaxyRadius;
                const spiralAngle = armAngle + t * Math.PI * 3; // 3回転でよりタイトな渦巻き
                
                // 腕の幅の変化（2本なのでより太く）
                const armWidth = (1 - t) * galaxyRadius * 0.25;
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
            const dustParticles = 420; // 30%削減（600 → 420）
            for (let i = 0; i < dustParticles; i++) {
                const t = Math.random();
                const radius = t * galaxyRadius * 0.9;
                const spiralAngle = armAngle + t * Math.PI * 3 - 0.1; // 少しずらす
                
                const dustWidth = (1 - t) * galaxyRadius * 0.12;
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
        
        const haloStars = 560; // 30%削減（800 → 560）
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
        const galaxyCount = 7; // 30%削減（10 → 7）
        
        for (let i = 0; i < galaxyCount; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            // 各銀河は50-100個の星で表現
            const starCount = 35 + Math.floor(Math.random() * 35); // 30%削減
            
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
            // レイヤーマスクを設定して常に描画
            distantGalaxy.layers.set(0);
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
        // より多様な銀河タイプを追加
        const galaxyTypes = [
            'spiral', 'barred_spiral', 'elliptical', 'lenticular', 
            'irregular', 'ring', 'dwarf_elliptical', 'edge_on_spiral'
        ];
        const galaxyCount = 8; // 30%削減（12 → 8）
        
        for (let i = 0; i < galaxyCount; i++) {
            const galaxyType = galaxyTypes[i % galaxyTypes.length];
            const group = new THREE.Group();
            
            // 銀河の位置を設定
            const angle = (i / galaxyCount) * Math.PI * 2 + Math.PI / 6;
            const distance = GALAXY_BOUNDARY * (0.8 + Math.random() * 0.4);
            const height = (Math.random() - 0.5) * GALAXY_BOUNDARY * 0.5;
            
            group.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );
            
            // ランダムな傾きを追加
            group.rotation.x = (Math.random() - 0.5) * Math.PI * 0.6;
            group.rotation.z = (Math.random() - 0.5) * Math.PI * 0.3;
            
            // 各銀河タイプに応じて作成
            switch (galaxyType) {
                case 'spiral':
                    this.createPurpleSpiralGalaxy(group);
                    break;
                case 'barred_spiral':
                    this.createPurpleBarredSpiralGalaxy(group);
                    break;
                case 'elliptical':
                    this.createPurpleEllipticalGalaxy(group);
                    break;
                case 'lenticular':
                    this.createPurpleLenticularGalaxy(group);
                    break;
                case 'ring':
                    this.createPurpleRingGalaxy(group);
                    break;
                case 'dwarf_elliptical':
                    this.createPurpleDwarfEllipticalGalaxy(group);
                    break;
                case 'edge_on_spiral':
                    this.createPurpleEdgeOnSpiralGalaxy(group);
                    break;
                case 'irregular':
                default:
                    this.createPurpleIrregularGalaxy(group);
                    break;
            }
            
            group.name = `purpleGalaxy_${i}`;
            // フラスタムカリングを無効化
            group.traverse((child) => {
                child.frustumCulled = false;
                if (child instanceof THREE.Points) {
                    child.renderOrder = -1500 - i;
                }
            });
            this.nebulaeGroup.add(group);
        }
    }
    
    private createPurpleSpiralGalaxy(parent: THREE.Group): void {
        // 中心バルジ
        const bulgeGeometry = new THREE.BufferGeometry();
        const bulgePositions = [];
        const bulgeColors = [];
        const bulgeSizes = [];
        
        const bulgeStars = 210; // 30%削減
        for (let i = 0; i < bulgeStars; i++) {
            const r = Math.pow(Math.random(), 0.5) * 300;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.3;
            
            bulgePositions.push(
                r * Math.cos(phi) * Math.cos(theta),
                r * Math.sin(phi) * 0.3,
                r * Math.cos(phi) * Math.sin(theta)
            );
            
            // 紫系の色
            const brightness = 1.2 - (r / 300) * 0.5;
            bulgeColors.push(0.7 * brightness, 0.3 * brightness, 1.0 * brightness);
            bulgeSizes.push(0.3 + Math.random() * 0.3);
        }
        
        bulgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bulgePositions, 3));
        bulgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bulgeColors, 3));
        bulgeGeometry.setAttribute('size', new THREE.Float32BufferAttribute(bulgeSizes, 1));
        
        const bulgeMaterial = new THREE.PointsMaterial({
            size: 0.8,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const bulge = new THREE.Points(bulgeGeometry, bulgeMaterial);
        parent.add(bulge);
        
        // 渦巻き腕（2本）
        for (let arm = 0; arm < 2; arm++) {
            const armGeometry = new THREE.BufferGeometry();
            const armPositions = [];
            const armColors = [];
            const armSizes = [];
            
            const armStars = 280; // 30%削減
            const armAngle = arm * Math.PI;
            
            for (let i = 0; i < armStars; i++) {
                const t = i / armStars;
                const radius = t * 800;
                const spiralAngle = armAngle + t * Math.PI * 1.5;
                const spread = (1 - t) * 150;
                const offset = (Math.random() - 0.5) * spread;
                
                armPositions.push(
                    (radius + offset) * Math.cos(spiralAngle),
                    (Math.random() - 0.5) * 50,
                    (radius + offset) * Math.sin(spiralAngle)
                );
                
                // 外側に行くほど青紫に
                const brightness = 0.9 - t * 0.4;
                const blueShift = t * 0.3;
                armColors.push(
                    (0.6 + blueShift) * brightness,
                    0.4 * brightness,
                    1.0 * brightness
                );
                armSizes.push(0.2 + Math.random() * 0.4);
            }
            
            armGeometry.setAttribute('position', new THREE.Float32BufferAttribute(armPositions, 3));
            armGeometry.setAttribute('color', new THREE.Float32BufferAttribute(armColors, 3));
            armGeometry.setAttribute('size', new THREE.Float32BufferAttribute(armSizes, 1));
            
            const armMaterial = new THREE.PointsMaterial({
                size: 0.6,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const spiralArm = new THREE.Points(armGeometry, armMaterial);
            parent.add(spiralArm);
        }
    }
    
    private createPurpleEllipticalGalaxy(parent: THREE.Group): void {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const starCount = 560; // 30%削減
        for (let i = 0; i < starCount; i++) {
            // 楕円形の分布
            const r = Math.pow(Math.random(), 0.6) * 600;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = r * Math.sin(phi) * Math.cos(theta) * 1.5; // 横に伸ばす
            const y = r * Math.cos(phi) * 0.6; // 縦に圧縮
            const z = r * Math.sin(phi) * Math.sin(theta);
            
            positions.push(x, y, z);
            
            // 中心ほど明るい紫
            const brightness = 1.0 - (r / 600) * 0.6;
            colors.push(0.8 * brightness, 0.4 * brightness, 1.0 * brightness);
            sizes.push(0.25 + Math.random() * 0.35);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.7,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const elliptical = new THREE.Points(geometry, material);
        parent.add(elliptical);
    }
    
    private createPurpleIrregularGalaxy(parent: THREE.Group): void {
        // 不規則銀河（複数の星団）
        const clusterCount = 3 + Math.floor(Math.random() * 3);
        
        for (let c = 0; c < clusterCount; c++) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const sizes = [];
            
            // 各星団の中心
            const clusterX = (Math.random() - 0.5) * 400;
            const clusterY = (Math.random() - 0.5) * 200;
            const clusterZ = (Math.random() - 0.5) * 400;
            
            const starsInCluster = 140 + Math.floor(Math.random() * 140); // 30%削減
            
            for (let i = 0; i < starsInCluster; i++) {
                // 不規則な分布
                const r = Math.random() * Math.random() * 300;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                positions.push(
                    clusterX + r * Math.sin(phi) * Math.cos(theta),
                    clusterY + r * Math.cos(phi) * 0.7,
                    clusterZ + r * Math.sin(phi) * Math.sin(theta)
                );
                
                // ランダムな紫のバリエーション
                const hue = 0.75 + Math.random() * 0.1;
                const saturation = 0.7 + Math.random() * 0.3;
                const lightness = 0.5 + Math.random() * 0.3;
                const color = new THREE.Color().setHSL(hue, saturation, lightness);
                
                colors.push(color.r, color.g, color.b);
                sizes.push(0.2 + Math.random() * 0.5);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                size: 0.6,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.65,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const cluster = new THREE.Points(geometry, material);
            parent.add(cluster);
        }
    }
    
    private createPurpleBarredSpiralGalaxy(parent: THREE.Group): void {
        // 棒渦巻銀河（中心に棒状構造）
        // 中心の棒構造
        const barGeometry = new THREE.BufferGeometry();
        const barPositions = [];
        const barColors = [];
        const barSizes = [];
        
        const barStars = 280; // 30%削減
        for (let i = 0; i < barStars; i++) {
            // 棒状の分布
            const t = (Math.random() - 0.5) * 2;
            const x = t * 400;
            const y = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 100 * (1 - Math.abs(t));
            
            barPositions.push(x, y, z);
            
            const brightness = 1.0 - Math.abs(t) * 0.3;
            barColors.push(0.8 * brightness, 0.5 * brightness, 1.0 * brightness);
            barSizes.push(0.4 + Math.random() * 0.4);
        }
        
        barGeometry.setAttribute('position', new THREE.Float32BufferAttribute(barPositions, 3));
        barGeometry.setAttribute('color', new THREE.Float32BufferAttribute(barColors, 3));
        barGeometry.setAttribute('size', new THREE.Float32BufferAttribute(barSizes, 1));
        
        const barMaterial = new THREE.PointsMaterial({
            size: 0.8,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const bar = new THREE.Points(barGeometry, barMaterial);
        parent.add(bar);
        
        // 棒の端から伸びる渦巻き腕
        for (let arm = 0; arm < 2; arm++) {
            const armGeometry = new THREE.BufferGeometry();
            const armPositions = [];
            const armColors = [];
            const armSizes = [];
            
            const armStars = 210; // 30%削減
            const startX = arm === 0 ? 400 : -400;
            
            for (let i = 0; i < armStars; i++) {
                const t = i / armStars;
                const radius = t * 600;
                const spiralAngle = t * Math.PI * 1.2;
                const spread = (1 - t) * 100;
                
                const x = startX + radius * Math.cos(spiralAngle) * (arm === 0 ? 1 : -1);
                const y = (Math.random() - 0.5) * 40;
                const z = radius * Math.sin(spiralAngle);
                
                armPositions.push(
                    x + (Math.random() - 0.5) * spread,
                    y,
                    z + (Math.random() - 0.5) * spread
                );
                
                const brightness = 0.8 - t * 0.4;
                armColors.push(0.6 * brightness, 0.4 * brightness, 1.0 * brightness);
                armSizes.push(0.2 + Math.random() * 0.3);
            }
            
            armGeometry.setAttribute('position', new THREE.Float32BufferAttribute(armPositions, 3));
            armGeometry.setAttribute('color', new THREE.Float32BufferAttribute(armColors, 3));
            armGeometry.setAttribute('size', new THREE.Float32BufferAttribute(armSizes, 1));
            
            const armMaterial = new THREE.PointsMaterial({
                size: 0.6,
                sizeAttenuation: true,
                vertexColors: true,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            
            const spiralArm = new THREE.Points(armGeometry, armMaterial);
            parent.add(spiralArm);
        }
    }
    
    private createPurpleLenticularGalaxy(parent: THREE.Group): void {
        // レンズ状銀河（楕円と渦巻きの中間）
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const starCount = 700; // 30%削減
        for (let i = 0; i < starCount; i++) {
            // レンズ状の分布（中心が厚く、端が薄い）
            const r = Math.pow(Math.random(), 0.5) * 700;
            const theta = Math.random() * Math.PI * 2;
            const heightScale = Math.exp(-r / 200); // 指数関数的に薄くなる
            
            const x = r * Math.cos(theta);
            const y = (Math.random() - 0.5) * 100 * heightScale;
            const z = r * Math.sin(theta);
            
            positions.push(x, y, z);
            
            // 中心は明るく、端に行くほど赤方偏移
            const brightness = 1.0 - (r / 700) * 0.7;
            const redshift = r / 700 * 0.2;
            colors.push(
                (0.7 + redshift) * brightness,
                0.4 * brightness,
                (1.0 - redshift) * brightness
            );
            sizes.push(0.3 + Math.random() * 0.3);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.7,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const lenticular = new THREE.Points(geometry, material);
        parent.add(lenticular);
    }
    
    private createPurpleRingGalaxy(parent: THREE.Group): void {
        // リング銀河（中心部とリング構造）
        // 中心核
        const coreGeometry = new THREE.BufferGeometry();
        const corePositions = [];
        const coreColors = [];
        const coreSizes = [];
        
        const coreStars = 140; // 30%削減
        for (let i = 0; i < coreStars; i++) {
            const r = Math.pow(Math.random(), 0.8) * 150;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            corePositions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi) * 0.5,
                r * Math.sin(phi) * Math.sin(theta)
            );
            
            const brightness = 1.2 - (r / 150) * 0.4;
            coreColors.push(0.9 * brightness, 0.6 * brightness, 1.0 * brightness);
            coreSizes.push(0.3 + Math.random() * 0.3);
        }
        
        coreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(corePositions, 3));
        coreGeometry.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));
        coreGeometry.setAttribute('size', new THREE.Float32BufferAttribute(coreSizes, 1));
        
        const coreMaterial = new THREE.PointsMaterial({
            size: 0.8,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const core = new THREE.Points(coreGeometry, coreMaterial);
        parent.add(core);
        
        // リング構造
        const ringGeometry = new THREE.BufferGeometry();
        const ringPositions = [];
        const ringColors = [];
        const ringSizes = [];
        
        const ringStars = 560; // 30%削減
        const innerRadius = 400;
        const ringWidth = 150;
        
        for (let i = 0; i < ringStars; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = innerRadius + Math.random() * ringWidth;
            const y = (Math.random() - 0.5) * 30;
            
            ringPositions.push(
                r * Math.cos(theta),
                y,
                r * Math.sin(theta)
            );
            
            // リングは青い若い星が多い
            const brightness = 0.8 + Math.random() * 0.2;
            ringColors.push(0.5 * brightness, 0.6 * brightness, 1.0 * brightness);
            ringSizes.push(0.25 + Math.random() * 0.35);
        }
        
        ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ringPositions, 3));
        ringGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ringColors, 3));
        ringGeometry.setAttribute('size', new THREE.Float32BufferAttribute(ringSizes, 1));
        
        const ringMaterial = new THREE.PointsMaterial({
            size: 0.7,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const ring = new THREE.Points(ringGeometry, ringMaterial);
        parent.add(ring);
    }
    
    private createPurpleDwarfEllipticalGalaxy(parent: THREE.Group): void {
        // 矮小楕円銀河（小さく、暗い）
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const starCount = 210; // 30%削減
        for (let i = 0; i < starCount; i++) {
            const r = Math.pow(Math.random(), 0.4) * 250; // 小さい
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi) * 0.8,
                r * Math.sin(phi) * Math.sin(theta)
            );
            
            // 全体的に暗め
            const brightness = 0.6 - (r / 250) * 0.3;
            colors.push(0.8 * brightness, 0.5 * brightness, 0.9 * brightness);
            sizes.push(0.2 + Math.random() * 0.2);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const dwarf = new THREE.Points(geometry, material);
        parent.add(dwarf);
    }
    
    private createPurpleEdgeOnSpiralGalaxy(parent: THREE.Group): void {
        // エッジオン渦巻銀河（横から見た渦巻銀河）
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const starCount = 840; // 30%削減
        for (let i = 0; i < starCount; i++) {
            // 薄い円盤状の分布
            const x = (Math.random() - 0.5) * 1600;
            const distFromCenter = Math.abs(x);
            const thickness = 50 * Math.exp(-distFromCenter / 400); // 中心ほど厚い
            const y = (Math.random() - 0.5) * thickness;
            const z = (Math.random() - 0.5) * 200 * Math.exp(-distFromCenter / 300);
            
            positions.push(x, y, z);
            
            // ダストレーンを表現（中心線は暗い）
            const dustLane = Math.abs(y) < 10 ? 0.5 : 1.0;
            const brightness = (0.9 - distFromCenter / 1600 * 0.5) * dustLane;
            
            // 中心は黄色っぽく、外側は青っぽく
            const colorMix = distFromCenter / 800;
            colors.push(
                (0.8 - colorMix * 0.2) * brightness,
                (0.5 - colorMix * 0.1) * brightness,
                (0.9 + colorMix * 0.1) * brightness
            );
            sizes.push(0.2 + Math.random() * 0.3);
        }
        
        // ダストレーン（暗い帯）
        const dustCount = 210; // 30%削減
        for (let i = 0; i < dustCount; i++) {
            const x = (Math.random() - 0.5) * 1400;
            const y = (Math.random() - 0.5) * 5; // 非常に薄い
            const z = (Math.random() - 0.5) * 150 * Math.exp(-Math.abs(x) / 400);
            
            positions.push(x, y, z);
            
            // 暗い茶色っぽい色
            colors.push(0.2, 0.1, 0.15);
            sizes.push(0.4 + Math.random() * 0.4);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.6,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        
        const edgeOn = new THREE.Points(geometry, material);
        parent.add(edgeOn);
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
    
    update(deltaTime: number, cameraPosition?: THREE.Vector3): void {
        // カメラ追従を削除 - 固定位置に配置
        
        // 銀河全体をゆっくり回転（反時計回り）
        this.galaxyGroup.rotation.y -= this.rotationSpeed * deltaTime * 60; // 60fpsベース
        
        // 星雲も少し違う速度で回転
        this.nebulaeGroup.rotation.y += this.rotationSpeed * 0.3 * deltaTime * 60;
        
        // 各スパイラルアームを個別に少し動かす（2本）
        for (let i = 0; i < 2; i++) {
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