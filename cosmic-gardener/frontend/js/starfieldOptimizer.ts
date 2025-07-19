import * as THREE from 'three';

export interface StarfieldOptimizationConfig {
    resolutionScale: number;
    devicePixelRatio: number;
    baseStarSize: number;
    starCount: number;
}

export class StarfieldOptimizer {
    private static instance: StarfieldOptimizer;
    
    private constructor() {}
    
    static getInstance(): StarfieldOptimizer {
        if (!StarfieldOptimizer.instance) {
            StarfieldOptimizer.instance = new StarfieldOptimizer();
        }
        return StarfieldOptimizer.instance;
    }
    
    getOptimizedAlphaTest(resolutionScale: number): number {
        // シンプルで安定した設定
        if (resolutionScale <= 0.75) {
            return 0.01;  // 50-75%
        } else if (resolutionScale <= 1.0) {
            return 0.015; // 100%
        } else if (resolutionScale <= 1.25) {
            return 0.02;  // 125%
        } else {
            return 0.05;  // 200%
        }
    }
    
    getOptimizedStarSize(config: StarfieldOptimizationConfig): number {
        const { resolutionScale, devicePixelRatio, baseStarSize } = config;
        
        // 全解像度で一定のサイズを維持（視覚的一貫性）
        const adjustedSize = baseStarSize;
        const minSize = 0.8 / devicePixelRatio;
        
        return Math.max(adjustedSize, minSize);
    }
    
    shouldUseSizeAttenuation(resolutionScale: number): boolean {
        // 常に有効（距離感を保つため）
        return true;
    }
    
    getOptimizedBlending(resolutionScale: number): THREE.Blending {
        // 高解像度では常にNormalBlendingで安定性を優先
        return THREE.NormalBlending;
    }
    
    createOptimizedStarfieldMaterial(config: StarfieldOptimizationConfig): THREE.PointsMaterial {
        const { resolutionScale, baseStarSize } = config;
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: this.getOptimizedStarSize(config),
            sizeAttenuation: this.shouldUseSizeAttenuation(resolutionScale),
            transparent: true,
            alphaTest: this.getOptimizedAlphaTest(resolutionScale),
            opacity: 1.0,
            depthWrite: false,
            blending: this.getOptimizedBlending(resolutionScale),
            vertexColors: false
        });
        
        console.log(`[StarfieldOptimizer] Created material for scale ${resolutionScale}:`, {
            size: material.size,
            alphaTest: material.alphaTest,
            sizeAttenuation: material.sizeAttenuation,
            blending: material.blending === THREE.AdditiveBlending ? 'Additive' : 'Normal'
        });
        
        return material;
    }
    
    updateStarfieldMaterial(
        material: THREE.PointsMaterial,
        config: StarfieldOptimizationConfig
    ): void {
        const { resolutionScale } = config;
        
        material.size = this.getOptimizedStarSize(config);
        material.alphaTest = this.getOptimizedAlphaTest(resolutionScale);
        material.sizeAttenuation = this.shouldUseSizeAttenuation(resolutionScale);
        material.blending = this.getOptimizedBlending(resolutionScale);
        material.needsUpdate = true;
        
        console.log(`[StarfieldOptimizer] Updated material for scale ${resolutionScale}`);
    }
    
    getParticleDensityMultiplier(resolutionScale: number): number {
        if (resolutionScale <= 1.0) {
            return 1.0;
        } else if (resolutionScale <= 2.0) {
            return 1.0;
        } else {
            return 0.8;
        }
    }
    
    optimizeBackgroundGalaxyMaterial(
        material: THREE.PointsMaterial,
        layerDistance: number,
        resolutionScale: number
    ): void {
        const distanceFactor = Math.min(1.0, layerDistance / 10000);
        const baseAlphaTest = this.getOptimizedAlphaTest(resolutionScale);
        
        material.alphaTest = baseAlphaTest * (1.0 + distanceFactor * 0.5);
        
        if (resolutionScale > 2.0 && layerDistance > 5000) {
            material.sizeAttenuation = false;
        }
        
        material.needsUpdate = true;
    }
}

export const starfieldOptimizer = StarfieldOptimizer.getInstance();