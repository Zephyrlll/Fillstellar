import * as THREE from 'three';

export interface BillboardConfig {
    size: number;
    color: THREE.Color;
    opacity: number;
    texture?: THREE.Texture;
    blending?: THREE.Blending;
}

export class CelestialBillboardSystem {
    private static instance: CelestialBillboardSystem;
    private billboardPool: THREE.Sprite[] = [];
    private activeBillboards: Map<string, THREE.Sprite> = new Map();
    private textureLoader: THREE.TextureLoader;
    
    // テクスチャキャッシュ
    private textures: {
        star?: THREE.Texture;
        planet?: THREE.Texture;
        moon?: THREE.Texture;
        asteroid?: THREE.Texture;
        comet?: THREE.Texture;
        blackHole?: THREE.Texture;
        glow?: THREE.Texture;
    } = {};

    private constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.loadTextures();
        this.initializeBillboardPool(100); // 初期プールサイズ
    }

    static getInstance(): CelestialBillboardSystem {
        if (!CelestialBillboardSystem.instance) {
            CelestialBillboardSystem.instance = new CelestialBillboardSystem();
        }
        return CelestialBillboardSystem.instance;
    }

    private loadTextures(): void {
        // グラデーション円形テクスチャを生成
        this.textures.glow = this.createGlowTexture();
        
        // 天体タイプ別のテクスチャも生成可能
        this.textures.star = this.createStarTexture();
        this.textures.planet = this.createPlanetTexture();
        this.textures.blackHole = this.createBlackHoleTexture();
    }

    private createGlowTexture(): THREE.Texture {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        
        // 放射状グラデーション
        const gradient = context.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private createStarTexture(): THREE.Texture {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        
        // コア（明るい中心）
        const coreGradient = context.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 3
        );
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        coreGradient.addColorStop(0.5, 'rgba(255, 240, 200, 0.9)');
        coreGradient.addColorStop(1, 'rgba(255, 220, 150, 0.6)');
        
        context.fillStyle = coreGradient;
        context.fillRect(0, 0, size, size);
        
        // 外側のグロー
        const glowGradient = context.createRadialGradient(
            size / 2, size / 2, size / 3,
            size / 2, size / 2, size / 2
        );
        glowGradient.addColorStop(0, 'rgba(255, 220, 150, 0.6)');
        glowGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 180, 50, 0)');
        
        context.fillStyle = glowGradient;
        context.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private createPlanetTexture(): THREE.Texture {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        
        // 惑星の円形シルエット
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        context.fillStyle = 'rgba(150, 150, 150, 1)';
        context.fill();
        
        // エッジのソフトネス
        const edgeGradient = context.createRadialGradient(
            size / 2, size / 2, size / 2 - 20,
            size / 2, size / 2, size / 2
        );
        edgeGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        edgeGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.2)');
        edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        context.globalCompositeOperation = 'destination-out';
        context.fillStyle = edgeGradient;
        context.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private createBlackHoleTexture(): THREE.Texture {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        
        // ブラックホールの暗い中心
        const gradient = context.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );
        
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.3, 'rgba(10, 0, 20, 0.9)');
        gradient.addColorStop(0.6, 'rgba(50, 0, 100, 0.5)');
        gradient.addColorStop(0.8, 'rgba(100, 50, 200, 0.3)');
        gradient.addColorStop(1, 'rgba(150, 100, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private initializeBillboardPool(size: number): void {
        for (let i = 0; i < size; i++) {
            const sprite = new THREE.Sprite();
            sprite.visible = false;
            this.billboardPool.push(sprite);
        }
    }

    getBillboard(bodyId: string, config: BillboardConfig): THREE.Sprite {
        // 既存のビルボードをチェック
        let billboard = this.activeBillboards.get(bodyId);
        
        if (!billboard) {
            // プールから取得
            billboard = this.billboardPool.pop();
            
            if (!billboard) {
                // プールが空の場合は新規作成
                billboard = new THREE.Sprite();
            }
            
            this.activeBillboards.set(bodyId, billboard);
        }
        
        // ビルボードの設定を更新
        this.updateBillboard(billboard, config);
        billboard.visible = true;
        
        return billboard;
    }

    private updateBillboard(billboard: THREE.Sprite, config: BillboardConfig): void {
        // マテリアルの作成または更新
        if (!billboard.material || billboard.material.map !== config.texture) {
            billboard.material = new THREE.SpriteMaterial({
                map: config.texture || this.textures.glow,
                color: config.color,
                opacity: config.opacity,
                transparent: true,
                blending: config.blending || THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
        } else {
            // 既存マテリアルの更新
            billboard.material.color = config.color;
            billboard.material.opacity = config.opacity;
        }
        
        // サイズの設定
        billboard.scale.set(config.size, config.size, 1);
    }

    releaseBillboard(bodyId: string): void {
        const billboard = this.activeBillboards.get(bodyId);
        if (billboard) {
            billboard.visible = false;
            this.activeBillboards.delete(bodyId);
            this.billboardPool.push(billboard);
        }
    }

    // 天体タイプに基づいたビルボード設定を生成
    createBillboardConfig(bodyType: string, bodyData: any): BillboardConfig {
        switch (bodyType) {
            case 'star':
                return {
                    size: bodyData.radius * 10 || 100,
                    color: this.getStarColor(bodyData.temperature || 5000),
                    opacity: 0.9,
                    texture: this.textures.star,
                    blending: THREE.AdditiveBlending
                };
                
            case 'planet':
                return {
                    size: bodyData.radius * 5 || 50,
                    color: new THREE.Color(0x8888aa),
                    opacity: 0.8,
                    texture: this.textures.planet,
                    blending: THREE.NormalBlending
                };
                
            case 'black_hole':
                return {
                    size: bodyData.radius * 15 || 150,
                    color: new THREE.Color(0x4400ff),
                    opacity: 0.7,
                    texture: this.textures.blackHole,
                    blending: THREE.AdditiveBlending
                };
                
            default:
                return {
                    size: 30,
                    color: new THREE.Color(0xffffff),
                    opacity: 0.5,
                    texture: this.textures.glow,
                    blending: THREE.AdditiveBlending
                };
        }
    }

    private getStarColor(temperature: number): THREE.Color {
        // 温度に基づいた恒星の色
        if (temperature > 30000) return new THREE.Color(0x9bb0ff); // O型（青）
        if (temperature > 10000) return new THREE.Color(0xaabfff); // B型（青白）
        if (temperature > 7500) return new THREE.Color(0xcad7ff);  // A型（白）
        if (temperature > 6000) return new THREE.Color(0xf8f7ff);  // F型（黄白）
        if (temperature > 5200) return new THREE.Color(0xfff4ea);  // G型（黄）
        if (temperature > 3700) return new THREE.Color(0xffd2a1);  // K型（橙）
        return new THREE.Color(0xffcc6f); // M型（赤）
    }

    // すべてのビルボードをクリア
    clearAll(): void {
        this.activeBillboards.forEach((billboard, bodyId) => {
            this.releaseBillboard(bodyId);
        });
    }

    getActiveCount(): number {
        return this.activeBillboards.size;
    }

    getPoolSize(): number {
        return this.billboardPool.length;
    }
}