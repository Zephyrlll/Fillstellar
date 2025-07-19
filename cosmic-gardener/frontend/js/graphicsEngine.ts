import * as THREE from 'three';
import { gameState, gameStateManager, GraphicsState, GRAPHICS_PRESETS, applyGraphicsPreset } from './state.js';
import { scene, camera, renderer, composer, ambientLight, bloomPass } from './threeSetup.js';
import { performanceMonitor } from './performanceMonitor.js';
import { starfieldOptimizer } from './starfieldOptimizer.js';
import { isMobileDevice } from './deviceDetection.js';

export class GraphicsEngine {
    private previousSettings: Partial<GraphicsState> = {};
    private frameRateLimiter: FrameRateLimiter;
    private lodSystems: Map<THREE.Object3D, LODSystem> = new Map();
    private dynamicQualityEnabled: boolean = false;
    private qualityAdjustmentCooldown: number = 0;
    private postProcessingEnabled: boolean = true;
    
    constructor() {
        this.frameRateLimiter = new FrameRateLimiter();
        // Don't apply settings in constructor - wait for explicit initialization
        console.log('🎮 Graphics engine created (settings will be applied on first update)');
        
        // ポストプロセッシングの初期状態を設定
        const initialGraphics = gameStateManager.getState().graphics;
        this.postProcessingEnabled = initialGraphics.postProcessing !== 'off';
        console.log(`🎮 Post-processing initial state: ${this.postProcessingEnabled} (${initialGraphics.postProcessing})`);
        
        // モバイルデバイスの自動検出と設定
        this.initializeMobileOptimizations();
    }
    
    // Apply all current graphics settings
    applyAllSettings(): void {
        console.log('[GraphicsEngine] applyAllSettings() called');
        const graphics = gameStateManager.getState().graphics;
        
        this.applyResolutionScale(graphics.resolutionScale);
        this.applyAntiAliasing(graphics.antiAliasing);
        this.applyShadowQuality(graphics.shadowQuality);
        this.applyPostProcessing(graphics.postProcessing);
        this.applyViewDistance(graphics.viewDistance);
        this.applyLightingQuality(graphics.lightingQuality);
        this.applyFogEffect(graphics.fogEffect);
        this.applyRenderPrecision(graphics.renderPrecision);
        this.applyUIAnimations(graphics.uiAnimations);
        this.applyParticleDensity(graphics.particleDensity); // 追加！
        this.applyTextureQuality(graphics.textureQuality);
        this.applyObjectDetail(graphics.objectDetail);
        this.applyBackgroundDetail(graphics.backgroundDetail);
        
        // Update frame rate limiter
        this.frameRateLimiter.setTargetFPS(graphics.frameRateLimit);
        // console.log(`🎯 Frame rate limit set to: ${graphics.frameRateLimit} FPS`);
        
        // Store current settings for change detection
        this.previousSettings = { ...graphics };
        
        // console.log(`🎨 Graphics settings applied: ${graphics.preset} preset`);
    }
    
    // Check for setting changes and apply only what's needed
    update(): void {
        const graphics = gameStateManager.getState().graphics;
        
        // Debug: Log current graphics state periodically
        if (Math.random() < 0.001) { // Log occasionally to avoid spam
            console.log('[GraphicsEngine.update] Current graphics state:', graphics);
            console.log('[GraphicsEngine.update] Previous settings:', this.previousSettings);
        }
        
        // If this is the first update, apply all settings
        if (Object.keys(this.previousSettings).length === 0) {
            console.log('🎮 Graphics engine first update - applying all settings');
            console.log('🎮 Initial postProcessing setting:', graphics.postProcessing);
            this.applyAllSettings();
            return;
        }
        
        // Debug log
        if (this.previousSettings.resolutionScale !== graphics.resolutionScale) {
            console.log(`[GraphicsEngine.update] Previous: ${this.previousSettings.resolutionScale}, Current: ${graphics.resolutionScale}`);
        }
        
        // Check for preset changes
        if (this.previousSettings.preset !== graphics.preset && graphics.preset !== 'custom') {
            this.applyPreset(graphics.preset as keyof typeof GRAPHICS_PRESETS);
            return;
        }
        
        // Check individual setting changes
        if (this.previousSettings.resolutionScale !== graphics.resolutionScale) {
            console.log(`[GraphicsEngine] Resolution scale changed: ${this.previousSettings.resolutionScale} -> ${graphics.resolutionScale}`);
            this.applyResolutionScale(graphics.resolutionScale);
        }
        
        if (this.previousSettings.antiAliasing !== graphics.antiAliasing) {
            this.applyAntiAliasing(graphics.antiAliasing);
        }
        
        if (this.previousSettings.shadowQuality !== graphics.shadowQuality) {
            this.applyShadowQuality(graphics.shadowQuality);
        }
        
        if (this.previousSettings.postProcessing !== graphics.postProcessing) {
            this.applyPostProcessing(graphics.postProcessing);
        }
        
        if (this.previousSettings.viewDistance !== graphics.viewDistance) {
            this.applyViewDistance(graphics.viewDistance);
        }
        
        if (this.previousSettings.lightingQuality !== graphics.lightingQuality) {
            this.applyLightingQuality(graphics.lightingQuality);
        }
        
        if (this.previousSettings.fogEffect !== graphics.fogEffect) {
            this.applyFogEffect(graphics.fogEffect);
        }
        
        if (this.previousSettings.frameRateLimit !== graphics.frameRateLimit) {
            this.frameRateLimiter.setTargetFPS(graphics.frameRateLimit);
        }
        
        if (this.previousSettings.particleDensity !== graphics.particleDensity) {
            console.log('[GraphicsEngine] Particle density changed from', this.previousSettings.particleDensity, 'to', graphics.particleDensity);
            this.applyParticleDensity(graphics.particleDensity);
        }
        
        if (this.previousSettings.textureQuality !== graphics.textureQuality) {
            this.applyTextureQuality(graphics.textureQuality);
        }
        
        if (this.previousSettings.objectDetail !== graphics.objectDetail) {
            this.applyObjectDetail(graphics.objectDetail);
        }
        
        if (this.previousSettings.backgroundDetail !== graphics.backgroundDetail) {
            this.applyBackgroundDetail(graphics.backgroundDetail);
        }
        
        // Update LOD systems
        this.updateLODSystems();
        
        // Handle dynamic quality adjustment
        if (this.dynamicQualityEnabled) {
            this.handleDynamicQuality();
        }
        
        // Store current settings
        this.previousSettings = { ...graphics };
    }
    
    // Apply a graphics preset
    applyPreset(presetName: keyof typeof GRAPHICS_PRESETS): void {
        const currentState = gameStateManager.getState();
        const newGraphics = applyGraphicsPreset(currentState.graphics, presetName);
        
        // Update the state with the new graphics settings
        gameStateManager.updateState(state => ({
            ...state,
            graphics: newGraphics
        }));
        
        this.applyAllSettings();
        performanceMonitor.resetHistory();
        console.log(`🎨 Applied graphics preset: ${presetName}`);
    }
    
    // Resolution scaling
    applyResolutionScale(scale: number): void {
        console.log(`[GraphicsEngine] Applying resolution scale: ${scale}`);
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio || 1;
        
        // 表示サイズ（常に画面いっぱい）
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        // 内部レンダリング解像度（品質に影響）
        const renderWidth = Math.round(displayWidth * scale);
        const renderHeight = Math.round(displayHeight * scale);
        
        // === レンダラー設定更新 ===
        // 第3引数false = CSS自動更新を無効化（手動制御）
        renderer.setSize(renderWidth, renderHeight, false);
        renderer.setPixelRatio(pixelRatio); // デバイスピクセル比は固定
        
        // === CSS表示サイズを強制設定 ===
        // 解像度スケールに関係なく常に画面いっぱいに表示
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // === ポストプロセッシング対応 ===
        if (composer) {
            composer.setSize(renderWidth, renderHeight);
        }
        
        // === カメラ設定更新 ===
        // アスペクト比は表示サイズ基準（内部解像度ではない）
        if (camera) {
            camera.aspect = displayWidth / displayHeight;
            camera.updateProjectionMatrix();
        }
        
        console.log(`📏 Resolution scale: ${Math.round(scale * 100)}% (${renderWidth}x${renderHeight} → ${displayWidth}x${displayHeight})`);
    }
    
    // Anti-aliasing settings
    private applyAntiAliasing(type: string): void {
        console.log(`🔧 Anti-aliasing setting: ${type}`);
        
        // アンチエイリアシングの設定を保存
        (renderer as any).__requestedAntialiasing = type;
        
        // FXAAの場合はポストプロセッシングで処理
        if (type === 'fxaa' && composer) {
            // FXAAパスを追加（将来的な実装用）
            console.log('🔧 FXAA will be applied via post-processing');
        } else if (type === 'off') {
            // アンチエイリアシングを無効化
            renderer.setPixelRatio(1);
        } else if (type.includes('msaa')) {
            // MSAAはレンダラー再作成が必要
            console.log(`🔧 ${type} requires renderer recreation. Will be applied on next reload.`);
            // 一時的にピクセル比を調整して滑らかさを補完
            const pixelRatio = window.devicePixelRatio || 1;
            if (type === 'msaa8x') {
                renderer.setPixelRatio(Math.min(pixelRatio * 1.5, 2));
            } else if (type === 'msaa4x') {
                renderer.setPixelRatio(Math.min(pixelRatio * 1.25, 2));
            } else {
                renderer.setPixelRatio(pixelRatio);
            }
        }
        
        // 設定をローカルストレージに保存して次回起動時に適用
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('requestedAntialiasing', type);
        }
    }
    
    // Shadow quality settings
    private applyShadowQuality(quality: string): void {
        renderer.shadowMap.enabled = quality !== 'off';
        
        if (quality !== 'off') {
            switch (quality) {
                case 'ultra':
                    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                    break;
                case 'high':
                    renderer.shadowMap.type = THREE.PCFShadowMap;
                    break;
                case 'medium':
                    renderer.shadowMap.type = THREE.BasicShadowMap;
                    break;
                case 'low':
                    renderer.shadowMap.type = THREE.BasicShadowMap;
                    break;
            }
            
            // Update shadow map size based on quality
            const shadowMapSize = this.getShadowMapSize(quality);
            scene.traverse((object) => {
                if (object instanceof THREE.Light && object.shadow) {
                    object.shadow.mapSize.width = shadowMapSize;
                    object.shadow.mapSize.height = shadowMapSize;
                    object.shadow.map = null; // Force recreation
                }
            });
        }
        
        console.log(`☀️ Shadow quality set to: ${quality}`);
    }
    
    private getShadowMapSize(quality: string): number {
        switch (quality) {
            case 'ultra': return 4096;
            case 'high': return 2048;
            case 'medium': return 1024;
            case 'low': return 512;
            default: return 1024;
        }
    }
    
    // Post-processing effects
    private applyPostProcessing(quality: string): void {
        if (!composer) {
            console.warn('[GRAPHICS] Composer not available for post-processing');
            return;
        }
        
        // Bloomパスを直接使用
        if (!bloomPass) {
            console.error('[GRAPHICS] BloomPass not available');
            return;
        }
        
        if (quality === 'off') {
            // ポストプロセッシングを完全に無効化
            this.postProcessingEnabled = false;
            if (bloomPass) {
                bloomPass.enabled = false;
            }
        } else {
            // ポストプロセッシングを有効化
            this.postProcessingEnabled = true;
            
            if (bloomPass) {
                bloomPass.enabled = true;
                
                // 品質に応じてBloomの強度を調整
                switch (quality) {
                case 'ultra':
                    bloomPass.strength = 4.5;  // 超強力な光
                    bloomPass.threshold = 0.0001;  // 高とほぼ同じ（エッジを防ぐ）
                    bloomPass.radius = 0.9;  // 高より少し大きい
                    break;
                case 'high':
                    bloomPass.strength = 2.0;
                    bloomPass.threshold = 0.5;
                    bloomPass.radius = 0.8;
                    break;
                case 'medium':
                    bloomPass.strength = 1.5;
                    bloomPass.threshold = 0.6;
                    bloomPass.radius = 0.5;
                    break;
                case 'low':
                    bloomPass.strength = 1.0;  // 控えめな効果
                    bloomPass.threshold = 0.7;  // 非常に明るい部分のみ
                    bloomPass.radius = 0.3;  // 小さなグロー
                    break;
            }
            
                // Bloomパスの解像度も調整
                const resolution = this.getPostProcessingResolution(quality);
                if (bloomPass.resolution) {
                    bloomPass.resolution.set(resolution.x, resolution.y);
                }
                
                // Bloomパスの更新を強制
                if (bloomPass.uniforms) {
                    // uniformsを更新
                    bloomPass.needsUpdate = true;
                }
                
                // デバッグ: 実際の設定値を確認
                console.log(`✨ Bloom settings applied - strength: ${bloomPass.strength}, threshold: ${bloomPass.threshold}, radius: ${bloomPass.radius}, resolution: ${resolution.x}x${resolution.y}`);
            }
        }
        
        console.log(`✨ Post-processing set to: ${quality}, enabled: ${this.postProcessingEnabled}`);
    }
    
    // ポストプロセッシングの解像度を取得
    private getPostProcessingResolution(quality: string): THREE.Vector2 {
        const baseWidth = window.innerWidth;
        const baseHeight = window.innerHeight;
        
        switch (quality) {
            case 'ultra':
                return new THREE.Vector2(baseWidth, baseHeight);  // フル解像度
            case 'high':
                return new THREE.Vector2(baseWidth * 0.8, baseHeight * 0.8);
            case 'medium':
                return new THREE.Vector2(baseWidth * 0.5, baseHeight * 0.5);
            case 'low':
                return new THREE.Vector2(baseWidth * 0.3, baseHeight * 0.3);  // 低解像度
            default:
                return new THREE.Vector2(baseWidth * 0.5, baseHeight * 0.5);
        }
    }
    
    // View distance (camera far plane)
    private applyViewDistance(distance: string): void {
        let farPlane: number;
        
        switch (distance) {
            case 'unlimited':
                farPlane = 50000;
                break;
            case 'far':
                farPlane = 30000;
                break;
            case 'medium':
                farPlane = 20000;
                break;
            case 'near':
                farPlane = 15000;
                break;
            case 'minimal':
                farPlane = 10000;
                break;
            default:
                farPlane = 20000;
        }
        
        camera.far = farPlane;
        camera.updateProjectionMatrix();
        
        // Update fog far distance to match
        if (scene.fog && scene.fog instanceof THREE.Fog) {
            scene.fog.far = farPlane * 0.8;
        }
        
        console.log(`👁️ View distance set to: ${distance} (${farPlane})`);
    }
    
    // Lighting quality
    private applyLightingQuality(quality: string): void {
        // Adjust ambient light based on quality
        switch (quality) {
            case 'ultra':
                ambientLight.intensity = 0.3;
                break;
            case 'high':
                ambientLight.intensity = 0.4;
                break;
            case 'medium':
                ambientLight.intensity = 0.5;
                break;
            case 'low':
                ambientLight.intensity = 0.6;
                break;
        }
        
        // In a full implementation, you would also adjust the number and complexity of lights
        console.log(`💡 Lighting quality set to: ${quality}`);
    }
    
    // Fog effects
    private applyFogEffect(effect: string): void {
        switch (effect) {
            case 'off':
                scene.fog = null;
                break;
            case 'simple':
                scene.fog = new THREE.Fog(0x000011, 5000, 15000);
                break;
            case 'standard':
                scene.fog = new THREE.Fog(0x000011, 3000, camera.far * 0.8);
                break;
            case 'high':
                scene.fog = new THREE.FogExp2(0x000011, 0.00008);
                break;
        }
        
        console.log(`🌫️ Fog effect set to: ${effect}`);
    }
    
    // Render precision
    private applyRenderPrecision(precision: string): void {
        // Note: Three.js WebGLRenderer doesn't have a direct precision property
        // This would need to be set during renderer creation via constructor options
        // For now, we'll log the change and store it for future renderer recreation
        (renderer as any).__requestedPrecision = precision;
        
        console.log(`🎯 Render precision set to: ${precision}`);
    }
    
    // Particle density
    private applyParticleDensity(density: number): void {
        console.log(`✨ Particle density set to: ${Math.round(density * 100)}%`);
        
        // Find and update the starfield
        const starfield = scene.getObjectByName('starfield');
        console.log('✨ Scene children:', scene.children.map(c => c.name || c.type));
        console.log('✨ Starfield object:', starfield);
        
        if (starfield && starfield instanceof THREE.Points) {
            console.log('✨ Starfield found and is Points object');
            const geometry = starfield.geometry as THREE.BufferGeometry;
            const positionAttribute = geometry.getAttribute('position');
            
            console.log('✨ Starfield userData:', starfield.userData);
            console.log('✨ Position attribute:', positionAttribute);
            
            if (positionAttribute && starfield.userData.originalPositions) {
                // Use cached original positions
                const originalPositions = starfield.userData.originalPositions;
                const totalPoints = originalPositions.length / 3;
                const visiblePoints = Math.max(1, Math.floor(totalPoints * density)); // At least 1 star
                
                console.log(`✨ Original points: ${totalPoints}, Visible points: ${visiblePoints}`);
                
                // Create new position array with visible points
                const newPositions = new Float32Array(visiblePoints * 3);
                for (let i = 0; i < visiblePoints * 3; i++) {
                    newPositions[i] = originalPositions[i];
                }
                
                // Update geometry
                geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
                geometry.attributes.position.needsUpdate = true;
                
                // Recompute bounding sphere to avoid NaN errors
                geometry.computeBoundingSphere();
                
                console.log(`✨ Starfield updated: ${visiblePoints}/${totalPoints} stars visible`);
            } else {
                console.warn('✨ Missing position attribute or originalPositions');
                console.warn('✨ positionAttribute:', !!positionAttribute);
                console.warn('✨ originalPositions:', !!starfield.userData.originalPositions);
            }
        } else {
            console.warn('✨ Starfield not found or not Points object');
            console.warn('✨ starfield:', starfield);
            console.warn('✨ instanceof Points:', starfield instanceof THREE.Points);
        }
    }
    
    // Texture quality settings
    private applyTextureQuality(quality: string): void {
        console.log(`🎨 Texture quality set to: ${quality}`);
        
        // テクスチャ解像度の倍率を設定
        let textureScale = 1.0;
        switch (quality) {
            case 'ultra':
                textureScale = 2.0;
                break;
            case 'high':
                textureScale = 1.0;
                break;
            case 'medium':
                textureScale = 0.5;
                break;
            case 'low':
                textureScale = 0.25;
                break;
        }
        
        // 天体のテクスチャ品質を更新
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.userData && object.userData.type) {
                const material = object.material as THREE.MeshStandardMaterial;
                if (material && material.map && material.map instanceof THREE.CanvasTexture) {
                    const texture = material.map;
                    const canvas = texture.image as HTMLCanvasElement;
                    if (canvas && canvas.width && canvas.height) {
                        // オリジナルのサイズを保存
                        if (!object.userData.originalTextureSize) {
                            object.userData.originalTextureSize = {
                                width: canvas.width,
                                height: canvas.height
                            };
                        }
                        
                        // 新しいサイズを計算
                        const originalSize = object.userData.originalTextureSize;
                        const newWidth = Math.max(32, Math.round(originalSize.width * textureScale));
                        const newHeight = Math.max(32, Math.round(originalSize.height * textureScale));
                        
                        // テクスチャのサイズが変わる場合のみ更新
                        if (canvas.width !== newWidth || canvas.height !== newHeight) {
                            console.log(`[TEXTURE] Updating ${object.userData.type} texture: ${canvas.width}x${canvas.height} -> ${newWidth}x${newHeight}`);
                            // 注意: 実際のテクスチャリサイズは別途実装が必要
                            // ここではサイズ情報の更新のみ
                            object.userData.currentTextureSize = {
                                width: newWidth,
                                height: newHeight
                            };
                        }
                    }
                }
            }
        });
        
        // 背景銀河のテクスチャ品質も調整（将来的な実装用）
        const backgroundGalaxy = scene.getObjectByName('backgroundGalaxies');
        if (backgroundGalaxy) {
            backgroundGalaxy.userData.textureQuality = quality;
        }
    }
    
    // Object detail (LOD) settings
    private applyObjectDetail(detail: string): void {
        console.log(`🔲 Object detail set to: ${detail}`);
        
        // 球体のセグメント数を設定
        let segments = 32;
        switch (detail) {
            case 'ultra':
                segments = 64;
                break;
            case 'high':
                segments = 32;
                break;
            case 'medium':
                segments = 16;
                break;
            case 'low':
                segments = 8;
                break;
        }
        
        // 既存の天体の詳細度を更新
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.userData && object.userData.type) {
                const celestialType = object.userData.type;
                
                // 天体のメッシュを見つける（通常は最初の子要素）
                let meshToUpdate: THREE.Mesh | null = null;
                if (object.children.length > 0 && object.children[0] instanceof THREE.Mesh) {
                    meshToUpdate = object.children[0] as THREE.Mesh;
                } else if (object.geometry) {
                    meshToUpdate = object;
                }
                
                if (meshToUpdate && meshToUpdate.geometry instanceof THREE.SphereGeometry) {
                    // 現在のスケールとマテリアルを保存
                    const currentScale = meshToUpdate.scale.clone();
                    const currentMaterial = meshToUpdate.material;
                    
                    // 新しいジオメトリを作成
                    const radius = 1; // デフォルト半径（スケールで調整）
                    const newGeometry = new THREE.SphereGeometry(radius, segments, segments);
                    
                    // ジオメトリを置き換え
                    meshToUpdate.geometry.dispose();
                    meshToUpdate.geometry = newGeometry;
                    
                    console.log(`[DETAIL] Updated ${celestialType} mesh with ${segments} segments`);
                }
            }
        });
        
        // LODシステムの距離調整
        for (const [object, lodSystem] of this.lodSystems) {
            lodSystem.update(camera, detail);
        }
    }
    
    // Background detail settings
    private applyBackgroundDetail(detail: string): void {
        console.log(`🌌 Background detail set to: ${detail}`);
        
        // 背景銀河グループを探す
        const galaxyGroup = scene.getObjectByName('backgroundGalaxies');
        const nebulaGroup = scene.getObjectByName('nebulae');
        
        if (galaxyGroup) {
            switch (detail) {
                case 'off':
                    galaxyGroup.visible = false;
                    if (nebulaGroup) nebulaGroup.visible = false;
                    break;
                    
                case 'simple':
                    galaxyGroup.visible = true;
                    if (nebulaGroup) nebulaGroup.visible = false;
                    // 基本的な星のみ表示
                    galaxyGroup.traverse((child) => {
                        if (child instanceof THREE.Points) {
                            const name = child.name;
                            // バルジとハローのみ表示
                            child.visible = name === 'galacticBulge' || name === 'haloStars';
                            
                            // パーティクル数を削減
                            if (child.visible && child.geometry.attributes.position) {
                                const positions = child.geometry.attributes.position;
                                const originalCount = positions.count;
                                const reducedCount = Math.floor(originalCount * 0.5);
                                child.userData.visibleCount = reducedCount;
                                child.geometry.setDrawRange(0, reducedCount);
                            }
                        }
                    });
                    break;
                    
                case 'standard':
                    galaxyGroup.visible = true;
                    if (nebulaGroup) nebulaGroup.visible = true;
                    // 標準的な表示
                    galaxyGroup.traverse((child) => {
                        if (child instanceof THREE.Points) {
                            child.visible = true;
                            // 通常のパーティクル数
                            if (child.geometry.attributes.position) {
                                const positions = child.geometry.attributes.position;
                                const originalCount = positions.count;
                                const standardCount = Math.floor(originalCount * 0.75);
                                child.userData.visibleCount = standardCount;
                                child.geometry.setDrawRange(0, standardCount);
                            }
                        }
                    });
                    break;
                    
                case 'high':
                    galaxyGroup.visible = true;
                    if (nebulaGroup) nebulaGroup.visible = true;
                    // 全ての詳細を表示
                    galaxyGroup.traverse((child) => {
                        if (child instanceof THREE.Points) {
                            child.visible = true;
                            // 全てのパーティクルを表示
                            if (child.geometry.attributes.position) {
                                const positions = child.geometry.attributes.position;
                                child.geometry.setDrawRange(0, positions.count);
                                child.userData.visibleCount = positions.count;
                            }
                        }
                    });
                    break;
            }
            
            // 星雲の詳細度も調整
            if (nebulaGroup) {
                nebulaGroup.traverse((child) => {
                    if (child instanceof THREE.Sprite || child instanceof THREE.Mesh) {
                        // 詳細度に応じて星雲の表示を調整
                        if (detail === 'high') {
                            child.visible = true;
                            if ('material' in child && child.material) {
                                (child.material as THREE.SpriteMaterial).opacity = 0.6;
                            }
                        } else if (detail === 'standard') {
                            child.visible = Math.random() < 0.7; // 70%の星雲を表示
                            if ('material' in child && child.material) {
                                (child.material as THREE.SpriteMaterial).opacity = 0.4;
                            }
                        }
                    }
                });
            }
        }
    }
    
    // UI animations
    private applyUIAnimations(level: string): void {
        const rootElement = document.documentElement;
        
        // Add CSS class to control animation performance
        rootElement.classList.remove('ui-animations-off', 'ui-animations-simple', 'ui-animations-standard', 'ui-animations-smooth');
        
        switch (level) {
            case 'off':
                rootElement.classList.add('ui-animations-off');
                break;
            case 'simple':
                rootElement.classList.add('ui-animations-simple');
                break;
            case 'standard':
                rootElement.classList.add('ui-animations-standard');
                break;
            case 'smooth':
                rootElement.classList.add('ui-animations-smooth');
                break;
        }
        
        console.log(`🎭 UI animations set to: ${level}`);
    }
    
    // LOD (Level of Detail) management
    private updateLODSystems(): void {
        const objectDetail = gameStateManager.getState().graphics.objectDetail;
        
        // Update existing LOD systems
        for (const [object, lodSystem] of this.lodSystems) {
            lodSystem.update(camera, objectDetail);
        }
    }
    
    // Add LOD system to an object
    addLODSystem(object: THREE.Object3D, highDetail: THREE.Object3D, mediumDetail: THREE.Object3D, lowDetail: THREE.Object3D): void {
        const lodSystem = new LODSystem(object, highDetail, mediumDetail, lowDetail);
        this.lodSystems.set(object, lodSystem);
    }
    
    // Dynamic quality adjustment
    enableDynamicQuality(enabled: boolean): void {
        this.dynamicQualityEnabled = enabled;
        console.log(`🔄 Dynamic quality adjustment: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    private handleDynamicQuality(): void {
        if (this.qualityAdjustmentCooldown > 0) {
            this.qualityAdjustmentCooldown--;
            return;
        }
        
        const targetFPS = 30;
        const currentFPS = performanceMonitor.getCurrentFPS();
        
        if (currentFPS < targetFPS * 0.8) {
            // Performance is poor, reduce quality
            this.reduceQuality();
            this.qualityAdjustmentCooldown = 300; // 5 seconds at 60fps
        } else if (currentFPS > targetFPS * 1.2) {
            // Performance is good, can increase quality
            this.increaseQuality();
            this.qualityAdjustmentCooldown = 300;
        }
    }
    
    private reduceQuality(): void {
        const graphics = gameStateManager.getState().graphics;
        let changed = false;
        
        // Reduce settings in order of performance impact
        if (graphics.resolutionScale > 0.5) {
            graphics.resolutionScale = Math.max(0.5, graphics.resolutionScale - 0.25);
            changed = true;
        } else if (graphics.shadowQuality !== 'off') {
            graphics.shadowQuality = 'off';
            changed = true;
        } else if (graphics.particleDensity > 0.1) {
            graphics.particleDensity = Math.max(0.1, graphics.particleDensity - 0.25);
            changed = true;
        }
        
        if (changed) {
            graphics.preset = 'custom';
            console.log('📉 Dynamic quality reduction applied');
        }
    }
    
    private increaseQuality(): void {
        // Implementation for increasing quality when performance allows
        // This would be the reverse of reduceQuality
        console.log('📈 Dynamic quality could be increased');
    }
    
    // Get frame rate limiter
    getFrameRateLimiter(): FrameRateLimiter {
        return this.frameRateLimiter;
    }
    
    // Check if post-processing is enabled
    isPostProcessingEnabled(): boolean {
        return this.postProcessingEnabled;
    }
    
    // Initialize mobile optimizations
    private initializeMobileOptimizations(): void {
        if (isMobileDevice()) {
            console.log('📱 Mobile device detected - applying optimized settings');
            
            // モバイル用のデフォルト設定を適用
            setTimeout(() => {
                const currentState = gameStateManager.getState();
                const isMobileOptimized = currentState.graphics.preset === 'mobile' || 
                                         currentState.graphics.preset === 'performance';
                
                if (!isMobileOptimized) {
                    console.log('📱 Applying mobile optimized graphics preset');
                    this.applyPreset('mobile');
                }
            }, 100); // 初期化完了後に適用
        }
    }
    
    // Apply mobile-specific optimizations
    applyMobileOptimizations(): void {
        if (!isMobileDevice()) return;
        
        console.log('📱 Applying mobile-specific optimizations');
        const graphics = gameStateManager.getState().graphics;
        
        // モバイル用の推奨設定
        const mobileSettings: Partial<GraphicsState> = {
            resolutionScale: Math.min(graphics.resolutionScale, 0.75),
            antiAliasing: 'off',
            shadowQuality: 'low',
            postProcessing: 'low',
            viewDistance: 'medium',
            lightingQuality: 'medium',
            fogEffect: 'simple',
            textureQuality: 'medium',
            objectDetail: 'medium',
            backgroundDetail: 'simple',
            particleDensity: Math.min(graphics.particleDensity, 0.5),
            uiAnimations: 'simple',
            frameRateLimit: 30
        };
        
        // 現在の設定と比較して、より低い設定のみ適用
        const updatedSettings = { ...graphics };
        let hasChanges = false;
        
        // 解像度スケール
        if (mobileSettings.resolutionScale! < graphics.resolutionScale) {
            updatedSettings.resolutionScale = mobileSettings.resolutionScale!;
            hasChanges = true;
        }
        
        // 品質設定の比較と適用
        const qualityLevels = ['off', 'low', 'medium', 'high', 'ultra'];
        const compareQuality = (current: string, recommended: string): string => {
            const currentIndex = qualityLevels.indexOf(current);
            const recommendedIndex = qualityLevels.indexOf(recommended);
            return currentIndex > recommendedIndex ? recommended : current;
        };
        
        // 各設定の適用
        Object.keys(mobileSettings).forEach(key => {
            if (key === 'resolutionScale' || key === 'particleDensity' || key === 'frameRateLimit') {
                return; // 既に処理済みまたは数値型
            }
            
            const currentValue = graphics[key as keyof GraphicsState];
            const recommendedValue = mobileSettings[key as keyof GraphicsState];
            
            if (typeof currentValue === 'string' && typeof recommendedValue === 'string') {
                const newValue = compareQuality(currentValue, recommendedValue);
                if (newValue !== currentValue) {
                    (updatedSettings as any)[key] = newValue;
                    hasChanges = true;
                }
            }
        });
        
        // フレームレート制限
        if (graphics.frameRateLimit > mobileSettings.frameRateLimit!) {
            updatedSettings.frameRateLimit = mobileSettings.frameRateLimit!;
            hasChanges = true;
        }
        
        if (hasChanges) {
            updatedSettings.preset = 'custom';
            gameStateManager.updateState(state => ({
                ...state,
                graphics: updatedSettings
            }));
            
            console.log('📱 Mobile optimizations applied:', updatedSettings);
        }
    }
}

// Frame rate limiting utility
class FrameRateLimiter {
    private targetFPS: number = -1; // -1 means unlimited
    private lastFrameTime: number = 0;
    private frameInterval: number = 0;
    
    setTargetFPS(fps: number): void {
        this.targetFPS = fps;
        this.frameInterval = fps > 0 ? 1000 / fps : 0;
        console.log(`🎮 Frame rate limiter: Target ${fps} FPS, interval ${this.frameInterval.toFixed(1)}ms`);
    }
    
    shouldRender(): boolean {
        if (this.targetFPS <= 0) return true; // Unlimited
        
        const now = performance.now();
        
        // 初回フレームの処理
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = now;
            return true;
        }
        
        const timeSinceLastFrame = now - this.lastFrameTime;
        
        if (timeSinceLastFrame >= this.frameInterval) {
            // 次のフレームタイミングを計算（より正確なFPS制限）
            this.lastFrameTime = now - (timeSinceLastFrame % this.frameInterval);
            return true;
        }
        
        return false;
    }
}

// LOD (Level of Detail) system
class LODSystem {
    private levels: { distance: number; object: THREE.Object3D }[] = [];
    private currentLevel: number = -1;
    
    constructor(
        private parentObject: THREE.Object3D,
        highDetail: THREE.Object3D,
        mediumDetail: THREE.Object3D,
        lowDetail: THREE.Object3D
    ) {
        this.levels = [
            { distance: 0, object: highDetail },
            { distance: 500, object: mediumDetail },
            { distance: 2000, object: lowDetail }
        ];
        
        // Initially show high detail
        this.setLevel(0);
    }
    
    update(camera: THREE.Camera, qualitySetting: string): void {
        const distance = this.parentObject.position.distanceTo(camera.position);
        
        // Adjust distances based on quality setting
        const multiplier = this.getDistanceMultiplier(qualitySetting);
        
        let targetLevel = this.levels.length - 1;
        for (let i = 0; i < this.levels.length; i++) {
            if (distance < this.levels[i].distance * multiplier) {
                targetLevel = i;
                break;
            }
        }
        
        if (targetLevel !== this.currentLevel) {
            this.setLevel(targetLevel);
        }
    }
    
    private setLevel(level: number): void {
        // Hide current level
        if (this.currentLevel >= 0) {
            this.levels[this.currentLevel].object.visible = false;
        }
        
        // Show new level
        this.currentLevel = level;
        this.levels[level].object.visible = true;
    }
    
    private getDistanceMultiplier(quality: string): number {
        switch (quality) {
            case 'ultra': return 2.0;
            case 'high': return 1.5;
            case 'medium': return 1.0;
            case 'low': return 0.7;
            default: return 1.0;
        }
    }
    
    // Force resolution update (used by resize workaround)
    forceResolutionUpdate(): void {
        console.log('🔧 Force resolution update called');
        if ((window as any).graphicsEngine) {
            (window as any).graphicsEngine.applyResolutionScale(gameStateManager.getState().graphics.resolutionScale);
        }
    }
    
    // Reset camera for initialization (used during startup)
    resetCameraForInitialization(): void {
        console.log('📹 Camera reset for initialization called');
        // This is a placeholder - actual camera reset logic would go here
        // For now, we'll just ensure resolution is applied
        if ((window as any).graphicsEngine) {
            (window as any).graphicsEngine.applyResolutionScale(gameStateManager.getState().graphics.resolutionScale);
        }
    }

    private updateStarfieldsForResolution(resolutionScale: number, devicePixelRatio: number): void {
        console.log(`[GraphicsEngine] Updating starfields for resolution scale: ${resolutionScale}`);
        
        // Update main starfield
        const mainStarfield = scene.getObjectByName('starfield');
        if (mainStarfield && mainStarfield instanceof THREE.Points) {
            const material = mainStarfield.material as THREE.PointsMaterial;
            const baseSize = mainStarfield.userData.baseStarSize || 0.8;
            
            starfieldOptimizer.updateStarfieldMaterial(material, {
                resolutionScale,
                devicePixelRatio,
                baseStarSize: baseSize,
                starCount: 8000
            });
        }
        
        // Update background galaxy starfields
        scene.traverse((child) => {
            if (child instanceof THREE.Points && child.userData.isBackgroundStarfield) {
                const material = child.material as THREE.PointsMaterial;
                const baseSize = child.userData.baseSize || 0.5;
                const layerDistance = child.userData.layerDistance || 5000;
                
                starfieldOptimizer.updateStarfieldMaterial(material, {
                    resolutionScale,
                    devicePixelRatio,
                    baseStarSize: baseSize,
                    starCount: 5000
                });
                
                starfieldOptimizer.optimizeBackgroundGalaxyMaterial(
                    material,
                    layerDistance,
                    resolutionScale
                );
            }
        });
    }
}

// Create global instance
export const graphicsEngine = new GraphicsEngine();