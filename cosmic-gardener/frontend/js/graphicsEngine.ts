import * as THREE from 'three';
import { gameState, GraphicsState, GRAPHICS_PRESETS, applyGraphicsPreset } from './state.js';
import { scene, camera, renderer, composer, ambientLight } from './threeSetup.js';
import { performanceMonitor } from './performanceMonitor.js';

export class GraphicsEngine {
    private previousSettings: Partial<GraphicsState> = {};
    private frameRateLimiter: FrameRateLimiter;
    private lodSystems: Map<THREE.Object3D, LODSystem> = new Map();
    private dynamicQualityEnabled: boolean = false;
    private qualityAdjustmentCooldown: number = 0;
    
    constructor() {
        this.frameRateLimiter = new FrameRateLimiter();
        this.applyAllSettings();
    }
    
    // Apply all current graphics settings
    applyAllSettings(): void {
        const graphics = gameState.graphics;
        
        this.applyResolutionScale(graphics.resolutionScale);
        this.applyAntiAliasing(graphics.antiAliasing);
        this.applyShadowQuality(graphics.shadowQuality);
        this.applyPostProcessing(graphics.postProcessing);
        this.applyViewDistance(graphics.viewDistance);
        this.applyLightingQuality(graphics.lightingQuality);
        this.applyFogEffect(graphics.fogEffect);
        this.applyRenderPrecision(graphics.renderPrecision);
        this.applyUIAnimations(graphics.uiAnimations);
        
        // Update frame rate limiter
        this.frameRateLimiter.setTargetFPS(graphics.frameRateLimit);
        console.log(`🎯 Frame rate limit set to: ${graphics.frameRateLimit} FPS`);
        
        // Store current settings for change detection
        this.previousSettings = { ...graphics };
        
        console.log(`🎨 Graphics settings applied: ${graphics.preset} preset`);
    }
    
    // Check for setting changes and apply only what's needed
    update(): void {
        const graphics = gameState.graphics;
        
        // Check for preset changes
        if (this.previousSettings.preset !== graphics.preset && graphics.preset !== 'custom') {
            this.applyPreset(graphics.preset as keyof typeof GRAPHICS_PRESETS);
            return;
        }
        
        // Check individual setting changes
        if (this.previousSettings.resolutionScale !== graphics.resolutionScale) {
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
            this.applyParticleDensity(graphics.particleDensity);
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
        applyGraphicsPreset(gameState.graphics, presetName);
        this.applyAllSettings();
        performanceMonitor.resetHistory();
        console.log(`🎨 Applied graphics preset: ${presetName}`);
    }
    
    // Resolution scaling
    private applyResolutionScale(scale: number): void {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        renderer.setSize(width * scale, height * scale);
        renderer.setPixelRatio(pixelRatio * scale);
        
        if (composer) {
            composer.setSize(width * scale, height * scale);
        }
        
        console.log(`📏 Resolution scale set to ${Math.round(scale * 100)}%`);
    }
    
    // Anti-aliasing settings
    private applyAntiAliasing(type: string): void {
        // Note: Changing antialiasing requires renderer recreation in Three.js
        // For now, we'll log the change and apply it on next reload
        console.log(`🔧 Anti-aliasing setting: ${type} (requires reload)`);
        
        // Store setting for renderer recreation
        (renderer as any).__requestedAntialiasing = type;
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
        if (!composer) return;
        
        // This is a simplified implementation
        // In a full implementation, you would add/remove specific passes
        const bloomPass = composer.passes.find(pass => pass.constructor.name === 'UnrealBloomPass');
        
        if (bloomPass && quality !== 'off') {
            bloomPass.enabled = true;
            
            // Adjust bloom intensity based on quality
            switch (quality) {
                case 'ultra':
                    (bloomPass as any).strength = 2.0;
                    (bloomPass as any).threshold = 0.1;
                    break;
                case 'high':
                    (bloomPass as any).strength = 1.8;
                    (bloomPass as any).threshold = 0.2;
                    break;
                case 'medium':
                    (bloomPass as any).strength = 1.5;
                    (bloomPass as any).threshold = 0.3;
                    break;
                case 'low':
                    (bloomPass as any).strength = 1.0;
                    (bloomPass as any).threshold = 0.5;
                    break;
            }
        } else if (bloomPass) {
            bloomPass.enabled = false;
        }
        
        console.log(`✨ Post-processing set to: ${quality}`);
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
        // This would be implemented with your particle system
        // For now, just log the change
        console.log(`✨ Particle density set to: ${Math.round(density * 100)}%`);
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
        const objectDetail = gameState.graphics.objectDetail;
        
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
        const graphics = gameState.graphics;
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
        const timeSinceLastFrame = now - this.lastFrameTime;
        
        if (timeSinceLastFrame >= this.frameInterval) {
            this.lastFrameTime = now;
            return true;
        }
        
        // Occasional debug output (every 60 skipped frames)
        if (Math.random() < 0.016) { // ~1/60 chance
            console.log(`⏱️ Frame skipped: ${timeSinceLastFrame.toFixed(1)}ms < ${this.frameInterval.toFixed(1)}ms (${this.targetFPS} FPS target)`);
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
}

// Create global instance
export const graphicsEngine = new GraphicsEngine();