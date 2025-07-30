import * as BABYLON from '@babylonjs/core';

export class SpaceSkybox {
    private scene: BABYLON.Scene;
    private skybox: BABYLON.Mesh | null = null;
    private starField: BABYLON.ParticleSystem | null = null;
    private nebulaMesh: BABYLON.Mesh | null = null;
    private distantPlanets: BABYLON.Mesh[] = [];
    private sun: BABYLON.Mesh | null = null;
    private sunLight: BABYLON.DirectionalLight | null = null;
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }
    
    create(): void {
        console.log('[SPACE_SKYBOX] Creating space environment...');
        
        // 1. スカイボックスの作成
        this.createSkybox();
        
        // 2. 星空のパーティクルシステム
        this.createStarField();
        
        // 3. 遠くの星雲
        this.createNebula();
        
        // 4. 太陽
        this.createSun();
        
        // 5. 遠くの惑星
        this.createDistantPlanets();
        
        console.log('[SPACE_SKYBOX] Space environment created');
    }
    
    private createSkybox(): void {
        // 巨大なボックスを作成
        this.skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 5000 }, this.scene);
        
        // スカイボックスマテリアル
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.disableLighting = true;
        
        // 宇宙の暗い背景色
        skyboxMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        
        this.skybox.material = skyboxMaterial;
        this.skybox.infiniteDistance = true; // カメラから常に同じ距離に見える
        
        // 簡単な星のテクスチャを生成（プロシージャル）
        const starTexture = this.createStarTexture();
        skyboxMaterial.emissiveTexture = starTexture;
        skyboxMaterial.emissiveTexture.coordinatesMode = BABYLON.Texture.FIXED_EQUIRECTANGULAR_MODE;
    }
    
    private createStarTexture(): BABYLON.DynamicTexture {
        const textureSize = 2048;
        const dynamicTexture = new BABYLON.DynamicTexture("starTexture", textureSize, this.scene);
        const context = dynamicTexture.getContext();
        
        // 背景を暗い紫がかった黒に
        context.fillStyle = "#050510";
        context.fillRect(0, 0, textureSize, textureSize);
        
        // ランダムな星を描画
        const starCount = 1000;
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const size = Math.random() * 2;
            const brightness = Math.random();
            
            context.beginPath();
            context.arc(x, y, size, 0, 2 * Math.PI);
            
            // 星の色（白、青白、オレンジがかった白）
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                context.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            } else if (colorChoice < 0.9) {
                context.fillStyle = `rgba(200, 220, 255, ${brightness})`;
            } else {
                context.fillStyle = `rgba(255, 240, 200, ${brightness})`;
            }
            
            context.fill();
        }
        
        // 星雲のような雲を追加
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * textureSize;
            const y = Math.random() * textureSize;
            const radius = 100 + Math.random() * 200;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, "rgba(100, 50, 150, 0.1)");
            gradient.addColorStop(0.5, "rgba(50, 30, 100, 0.05)");
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
            
            context.fillStyle = gradient;
            context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        dynamicTexture.update();
        return dynamicTexture;
    }
    
    private createStarField(): void {
        // 近い星のパーティクルシステム
        const particleSystem = new BABYLON.ParticleSystem("stars", 2000, this.scene);
        
        // テクスチャ（小さな光点）
        particleSystem.particleTexture = this.createParticleTexture();
        
        // エミッター設定
        particleSystem.emitter = BABYLON.Vector3.Zero();
        particleSystem.minEmitBox = new BABYLON.Vector3(-1000, -1000, -1000);
        particleSystem.maxEmitBox = new BABYLON.Vector3(1000, 1000, 1000);
        
        // パーティクル設定
        particleSystem.minSize = 0.5;
        particleSystem.maxSize = 2;
        particleSystem.minLifeTime = Number.MAX_VALUE;
        particleSystem.maxLifeTime = Number.MAX_VALUE;
        
        // 色
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        particleSystem.color2 = new BABYLON.Color4(0.8, 0.9, 1, 1);
        
        // エミッションレート
        particleSystem.emitRate = 0; // 一度に全て生成
        particleSystem.manualEmitCount = particleSystem.getCapacity();
        
        // 重力なし
        particleSystem.gravity = BABYLON.Vector3.Zero();
        
        // ブレンドモード
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.start();
        this.starField = particleSystem;
    }
    
    private createParticleTexture(): BABYLON.Texture {
        const size = 64;
        const dynamicTexture = new BABYLON.DynamicTexture("starParticle", size, this.scene);
        const context = dynamicTexture.getContext();
        
        // 中心が明るく、外側に向かって暗くなる円
        const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        dynamicTexture.update();
        return dynamicTexture;
    }
    
    private createNebula(): void {
        // 遠くの星雲（半透明の雲）
        const nebula = BABYLON.MeshBuilder.CreateSphere("nebula", {
            diameter: 800,
            segments: 32
        }, this.scene);
        
        nebula.position = new BABYLON.Vector3(1500, 500, -1000);
        
        const nebulaMaterial = new BABYLON.StandardMaterial("nebulaMat", this.scene);
        nebulaMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0.8);
        nebulaMaterial.alpha = 0.1;
        nebulaMaterial.backFaceCulling = false;
        
        nebula.material = nebulaMaterial;
        nebula.scaling = new BABYLON.Vector3(2, 1, 1.5); // 楕円形に
        
        this.nebulaMesh = nebula;
    }
    
    private createSun(): void {
        // 太陽の作成
        this.sun = BABYLON.MeshBuilder.CreateSphere("sun", {
            diameter: 200,
            segments: 32
        }, this.scene);
        
        this.sun.position = new BABYLON.Vector3(-1000, 800, 1000);
        
        // 太陽のマテリアル
        const sunMaterial = new BABYLON.StandardMaterial("sunMat", this.scene);
        sunMaterial.emissiveColor = new BABYLON.Color3(1, 0.9, 0.7);
        sunMaterial.disableLighting = true;
        
        // グローエフェクトのためのフレネル
        sunMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
        sunMaterial.emissiveFresnelParameters.bias = 0.6;
        sunMaterial.emissiveFresnelParameters.power = 4;
        sunMaterial.emissiveFresnelParameters.leftColor = BABYLON.Color3.White();
        sunMaterial.emissiveFresnelParameters.rightColor = new BABYLON.Color3(1, 0.8, 0);
        
        this.sun.material = sunMaterial;
        
        // 太陽光の更新
        const existingLight = this.scene.getLightByName("sunLight");
        if (existingLight && existingLight instanceof BABYLON.DirectionalLight) {
            this.sunLight = existingLight;
            // 太陽の位置から惑星中心への方向
            const direction = BABYLON.Vector3.Zero().subtract(this.sun.position).normalize();
            this.sunLight.direction = direction;
            this.sunLight.intensity = 2.5;
        }
    }
    
    private createDistantPlanets(): void {
        // 遠くに見える他の惑星
        const planetData = [
            { position: new BABYLON.Vector3(800, -200, 1200), size: 80, color: new BABYLON.Color3(0.8, 0.4, 0.2) }, // 火星っぽい
            { position: new BABYLON.Vector3(-1200, 300, -800), size: 120, color: new BABYLON.Color3(0.6, 0.7, 0.8) }, // 氷の惑星
            { position: new BABYLON.Vector3(400, 600, -1500), size: 60, color: new BABYLON.Color3(0.4, 0.3, 0.5) }  // 紫の惑星
        ];
        
        planetData.forEach((data, index) => {
            const planet = BABYLON.MeshBuilder.CreateSphere(`distantPlanet${index}`, {
                diameter: data.size,
                segments: 16
            }, this.scene);
            
            planet.position = data.position;
            
            const material = new BABYLON.StandardMaterial(`distantPlanetMat${index}`, this.scene);
            material.diffuseColor = data.color;
            material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            material.emissiveColor = data.color.scale(0.1);
            
            planet.material = material;
            this.distantPlanets.push(planet);
        });
    }
    
    update(deltaTime: number): void {
        // ゆっくりと回転する星空
        if (this.skybox) {
            this.skybox.rotation.y += deltaTime * 0.001;
        }
        
        // 星雲の微妙な動き
        if (this.nebulaMesh) {
            this.nebulaMesh.rotation.y += deltaTime * 0.0005;
            this.nebulaMesh.rotation.z = Math.sin(Date.now() * 0.0001) * 0.1;
        }
        
        // 太陽の脈動
        if (this.sun) {
            const scale = 1 + Math.sin(Date.now() * 0.001) * 0.05;
            this.sun.scaling = new BABYLON.Vector3(scale, scale, scale);
        }
    }
    
    dispose(): void {
        if (this.skybox) this.skybox.dispose();
        if (this.starField) this.starField.dispose();
        if (this.nebulaMesh) this.nebulaMesh.dispose();
        if (this.sun) this.sun.dispose();
        this.distantPlanets.forEach(planet => planet.dispose());
    }
}