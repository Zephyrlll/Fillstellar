import * as BABYLON from '@babylonjs/core';
import { PlanetData } from './PlanetExploration';

export class AtmosphereEffects {
    private scene: BABYLON.Scene;
    private skybox: BABYLON.Mesh | null = null;
    private fogColor: BABYLON.Color3 = new BABYLON.Color3(0.8, 0.8, 0.9);
    private atmosphereSphere: BABYLON.Mesh | null = null;
    private particleSystem: BABYLON.ParticleSystem | null = null;
    private planetData: PlanetData | null = null;
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.setupBasicAtmosphere();
    }
    
    private setupBasicAtmosphere(): void {
        // スカイボックスの作成
        this.skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 2000 }, this.scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.disableLighting = true;
        this.skybox.material = skyboxMaterial;
        
        // デフォルトのフォグ設定
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.001;
        this.scene.fogColor = this.fogColor;
        
        // 大気の球体（惑星を包む半透明の層）
        this.atmosphereSphere = BABYLON.MeshBuilder.CreateSphere(
            "atmosphere", 
            { diameter: 600, segments: 32 }, 
            this.scene
        );
        const atmosphereMaterial = new BABYLON.StandardMaterial("atmosphereMat", this.scene);
        atmosphereMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.7, 1);
        atmosphereMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        atmosphereMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
        atmosphereMaterial.alpha = 0.1;
        atmosphereMaterial.backFaceCulling = false;
        this.atmosphereSphere.material = atmosphereMaterial;
        this.atmosphereSphere.position.y = 300; // 高い位置に配置
        this.atmosphereSphere.isPickable = false; // クリック判定を無効化
    }
    
    setPlanetType(planet: PlanetData): void {
        this.planetData = planet;
        
        // 惑星タイプに応じた大気の設定
        switch (planet.type) {
            case 'forest':
                this.setForestAtmosphere();
                break;
            case 'desert':
                this.setDesertAtmosphere();
                break;
            case 'ocean':
                this.setOceanAtmosphere();
                break;
            case 'ice':
                this.setIceAtmosphere();
                break;
            case 'volcanic':
                this.setVolcanicAtmosphere();
                break;
            case 'alien':
                this.setAlienAtmosphere();
                break;
        }
        
        // カスタム大気設定がある場合
        if (planet.atmosphere) {
            this.applyCustomAtmosphere(planet.atmosphere);
        }
    }
    
    private setForestAtmosphere(): void {
        // 森林惑星：澄んだ青空、軽い霧
        this.fogColor = new BABYLON.Color3(0.7, 0.85, 1);
        this.scene.fogColor = this.fogColor;
        this.scene.fogDensity = 0.0008;
        
        if (this.skybox?.material) {
            const mat = this.skybox.material as BABYLON.StandardMaterial;
            mat.emissiveColor = new BABYLON.Color3(0.4, 0.6, 0.9);
        }
        
        // 花粉や胞子のパーティクル効果
        this.createPollenEffect();
    }
    
    private setDesertAtmosphere(): void {
        // 砂漠惑星：砂嵐、黄褐色の空
        this.fogColor = new BABYLON.Color3(0.9, 0.7, 0.5);
        this.scene.fogColor = this.fogColor;
        this.scene.fogDensity = 0.002;
        
        if (this.skybox?.material) {
            const mat = this.skybox.material as BABYLON.StandardMaterial;
            mat.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.4);
        }
        
        // 砂嵐のパーティクル効果
        this.createSandstormEffect();
    }
    
    private setOceanAtmosphere(): void {
        // 海洋惑星：湿度の高い大気、霧
        this.fogColor = new BABYLON.Color3(0.6, 0.75, 0.85);
        this.scene.fogColor = this.fogColor;
        this.scene.fogDensity = 0.0015;
        
        if (this.skybox?.material) {
            const mat = this.skybox.material as BABYLON.StandardMaterial;
            mat.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.7);
        }
    }
    
    private setIceAtmosphere(): void {
        // 氷惑星：澄んだ大気、オーロラ効果
        this.fogColor = new BABYLON.Color3(0.85, 0.9, 0.95);
        this.scene.fogColor = this.fogColor;
        this.scene.fogDensity = 0.0005;
        
        if (this.skybox?.material) {
            const mat = this.skybox.material as BABYLON.StandardMaterial;
            mat.emissiveColor = new BABYLON.Color3(0.7, 0.8, 0.9);
        }
        
        // 雪のパーティクル効果
        this.createSnowEffect();
    }
    
    private setVolcanicAtmosphere(): void {
        // 火山惑星：有毒ガス、赤い空
        this.fogColor = new BABYLON.Color3(0.6, 0.3, 0.2);
        this.scene.fogColor = this.fogColor;
        this.scene.fogDensity = 0.003;
        
        if (this.skybox?.material) {
            const mat = this.skybox.material as BABYLON.StandardMaterial;
            mat.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0.1);
        }
        
        // 火山灰のパーティクル効果
        this.createAshEffect();
    }
    
    private setAlienAtmosphere(): void {
        // エイリアン惑星：奇妙な色の大気
        this.fogColor = new BABYLON.Color3(0.6, 0.3, 0.8);
        this.scene.fogColor = this.fogColor;
        this.scene.fogDensity = 0.0012;
        
        if (this.skybox?.material) {
            const mat = this.skybox.material as BABYLON.StandardMaterial;
            mat.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0.7);
        }
        
        // 謎の粒子効果
        this.createAlienParticles();
    }
    
    private applyCustomAtmosphere(atmosphere: PlanetData['atmosphere']): void {
        if (!atmosphere) return;
        
        this.scene.fogDensity = atmosphere.density * 0.002;
        this.scene.fogColor = atmosphere.color;
        this.fogColor = atmosphere.color;
        
        if (atmosphere.hasStorms) {
            this.createStormEffect();
        }
    }
    
    private createPollenEffect(): void {
        this.cleanupParticles();
        
        const particleSystem = new BABYLON.ParticleSystem("pollen", 500, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        particleSystem.emitter = new BABYLON.Vector3(0, 10, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-100, 0, -100);
        particleSystem.maxEmitBox = new BABYLON.Vector3(100, 50, 100);
        
        particleSystem.color1 = new BABYLON.Color4(1, 1, 0.8, 0.3);
        particleSystem.color2 = new BABYLON.Color4(0.9, 0.9, 0.6, 0.1);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        
        particleSystem.minLifeTime = 10;
        particleSystem.maxLifeTime = 20;
        
        particleSystem.emitRate = 20;
        
        particleSystem.gravity = new BABYLON.Vector3(0, -0.05, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-0.5, 0, -0.5);
        particleSystem.direction2 = new BABYLON.Vector3(0.5, 0.2, 0.5);
        
        particleSystem.minEmitPower = 0.1;
        particleSystem.maxEmitPower = 0.3;
        
        particleSystem.start();
        this.particleSystem = particleSystem;
    }
    
    private createSandstormEffect(): void {
        this.cleanupParticles();
        
        const particleSystem = new BABYLON.ParticleSystem("sandstorm", 2000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        particleSystem.emitter = new BABYLON.Vector3(0, 5, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-200, -10, -200);
        particleSystem.maxEmitBox = new BABYLON.Vector3(200, 30, 200);
        
        particleSystem.color1 = new BABYLON.Color4(0.8, 0.6, 0.3, 0.4);
        particleSystem.color2 = new BABYLON.Color4(0.6, 0.4, 0.2, 0.2);
        
        particleSystem.minSize = 0.5;
        particleSystem.maxSize = 2;
        
        particleSystem.minLifeTime = 3;
        particleSystem.maxLifeTime = 6;
        
        particleSystem.emitRate = 200;
        
        particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-3, 0, -3);
        particleSystem.direction2 = new BABYLON.Vector3(3, 1, 3);
        
        particleSystem.minEmitPower = 2;
        particleSystem.maxEmitPower = 5;
        
        particleSystem.start();
        this.particleSystem = particleSystem;
    }
    
    private createSnowEffect(): void {
        this.cleanupParticles();
        
        const particleSystem = new BABYLON.ParticleSystem("snow", 1000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        particleSystem.emitter = new BABYLON.Vector3(0, 50, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-100, 0, -100);
        particleSystem.maxEmitBox = new BABYLON.Vector3(100, 0, 100);
        
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
        particleSystem.color2 = new BABYLON.Color4(0.9, 0.9, 1, 0.6);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        
        particleSystem.minLifeTime = 5;
        particleSystem.maxLifeTime = 10;
        
        particleSystem.emitRate = 50;
        
        particleSystem.gravity = new BABYLON.Vector3(0, -1, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-0.5, -1, -0.5);
        particleSystem.direction2 = new BABYLON.Vector3(0.5, -1, 0.5);
        
        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 1;
        
        particleSystem.start();
        this.particleSystem = particleSystem;
    }
    
    private createAshEffect(): void {
        this.cleanupParticles();
        
        const particleSystem = new BABYLON.ParticleSystem("ash", 800, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        particleSystem.emitter = new BABYLON.Vector3(0, 30, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-150, -20, -150);
        particleSystem.maxEmitBox = new BABYLON.Vector3(150, 20, 150);
        
        particleSystem.color1 = new BABYLON.Color4(0.3, 0.3, 0.3, 0.6);
        particleSystem.color2 = new BABYLON.Color4(0.1, 0.1, 0.1, 0.3);
        
        particleSystem.minSize = 0.3;
        particleSystem.maxSize = 1.5;
        
        particleSystem.minLifeTime = 4;
        particleSystem.maxLifeTime = 8;
        
        particleSystem.emitRate = 80;
        
        particleSystem.gravity = new BABYLON.Vector3(0, -0.3, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-1, -0.5, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 0.5, 1);
        
        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 2;
        
        particleSystem.start();
        this.particleSystem = particleSystem;
    }
    
    private createAlienParticles(): void {
        this.cleanupParticles();
        
        const particleSystem = new BABYLON.ParticleSystem("alien", 300, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        particleSystem.emitter = new BABYLON.Vector3(0, 20, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-80, -30, -80);
        particleSystem.maxEmitBox = new BABYLON.Vector3(80, 30, 80);
        
        particleSystem.color1 = new BABYLON.Color4(0.8, 0.3, 1, 0.5);
        particleSystem.color2 = new BABYLON.Color4(0.5, 0.1, 0.8, 0.2);
        
        particleSystem.minSize = 0.5;
        particleSystem.maxSize = 2;
        
        particleSystem.minLifeTime = 3;
        particleSystem.maxLifeTime = 10;
        
        particleSystem.emitRate = 30;
        
        particleSystem.gravity = new BABYLON.Vector3(0, 0.1, 0); // 上昇する粒子
        particleSystem.direction1 = new BABYLON.Vector3(-0.3, 0.5, -0.3);
        particleSystem.direction2 = new BABYLON.Vector3(0.3, 1, 0.3);
        
        particleSystem.minEmitPower = 0.2;
        particleSystem.maxEmitPower = 1;
        
        // エイリアンらしい動き
        particleSystem.updateFunction = (particles) => {
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (particle.age < particle.lifeTime) {
                    // 螺旋状の動き
                    const time = particle.age * 0.5;
                    particle.position.x += Math.sin(time) * 0.1;
                    particle.position.z += Math.cos(time) * 0.1;
                }
            }
        };
        
        particleSystem.start();
        this.particleSystem = particleSystem;
    }
    
    private createStormEffect(): void {
        // 嵐の効果（稲妻など）は後で実装
        console.log('[ATMOSPHERE] Storm effects will be implemented');
    }
    
    private cleanupParticles(): void {
        if (this.particleSystem) {
            this.particleSystem.stop();
            this.particleSystem.dispose();
            this.particleSystem = null;
        }
    }
    
    update(deltaTime: number): void {
        // 大気効果のアニメーション更新
        if (this.atmosphereSphere) {
            this.atmosphereSphere.rotation.y += deltaTime * 0.01;
        }
        
        // 天候の変化（将来的に実装）
        if (this.planetData?.atmosphere?.hasStorms) {
            // 嵐の強度を時間で変化させる
        }
    }
    
    dispose(): void {
        this.cleanupParticles();
        
        if (this.skybox) {
            this.skybox.dispose();
        }
        
        if (this.atmosphereSphere) {
            this.atmosphereSphere.dispose();
        }
    }
}