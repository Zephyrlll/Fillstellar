import * as THREE from 'three';
import { CelestialBody } from '@/state';

export enum LODLevel {
    ULTRA_CLOSE = 0,  // < 100 units - 完全な詳細度
    CLOSE = 1,        // 100-500 units - 高詳細
    MEDIUM = 2,       // 500-2000 units - 中詳細
    FAR = 3,          // 2000-10000 units - 低詳細
    VERY_FAR = 4,     // 10000-50000 units - ビルボード/点光源
    EXTREME = 5       // > 50000 units - アイコンのみ
}

export interface LODConfig {
    level: LODLevel;
    distance: number;
    renderMode: 'full' | 'simplified' | 'billboard' | 'point' | 'icon';
    particleEffects: boolean;
    atmosphereEffects: boolean;
    surfaceDetail: boolean;
    glowEffects: boolean;
    updateFrequency: number; // フレーム間隔 (1 = 毎フレーム)
}

export interface CelestialLODConfig {
    star: LODConfig[];
    planet: LODConfig[];
    moon: LODConfig[];
    asteroid: LODConfig[];
    comet: LODConfig[];
    black_hole: LODConfig[];
}

export class LODManager {
    private static instance: LODManager;
    private camera: THREE.Camera;
    private lodConfigs: CelestialLODConfig;
    private bodiesLODState: Map<string, LODLevel> = new Map();
    private frameCounter: number = 0;
    private performanceMode: 'ultra' | 'high' | 'balanced' | 'performance' = 'balanced';
    
    // パフォーマンスメトリクス
    private metrics = {
        visibleBodies: 0,
        culledBodies: 0,
        lodChanges: 0,
        averageFPS: 60
    };

    private constructor(camera: THREE.Camera) {
        this.camera = camera;
        this.lodConfigs = this.createDefaultConfigs();
    }

    static getInstance(camera: THREE.Camera): LODManager {
        if (!LODManager.instance) {
            LODManager.instance = new LODManager(camera);
        }
        return LODManager.instance;
    }

    private createDefaultConfigs(): CelestialLODConfig {
        return {
            star: [
                { level: LODLevel.ULTRA_CLOSE, distance: 100, renderMode: 'full', particleEffects: true, atmosphereEffects: true, surfaceDetail: true, glowEffects: true, updateFrequency: 1 },
                { level: LODLevel.CLOSE, distance: 500, renderMode: 'full', particleEffects: true, atmosphereEffects: true, surfaceDetail: true, glowEffects: true, updateFrequency: 1 },
                { level: LODLevel.MEDIUM, distance: 2000, renderMode: 'simplified', particleEffects: false, atmosphereEffects: true, surfaceDetail: false, glowEffects: true, updateFrequency: 2 },
                { level: LODLevel.FAR, distance: 10000, renderMode: 'billboard', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: true, updateFrequency: 4 },
                { level: LODLevel.VERY_FAR, distance: 50000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 8 },
                { level: LODLevel.EXTREME, distance: Infinity, renderMode: 'icon', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 16 }
            ],
            planet: [
                { level: LODLevel.ULTRA_CLOSE, distance: 100, renderMode: 'full', particleEffects: true, atmosphereEffects: true, surfaceDetail: true, glowEffects: false, updateFrequency: 1 },
                { level: LODLevel.CLOSE, distance: 500, renderMode: 'full', particleEffects: false, atmosphereEffects: true, surfaceDetail: true, glowEffects: false, updateFrequency: 1 },
                { level: LODLevel.MEDIUM, distance: 2000, renderMode: 'simplified', particleEffects: false, atmosphereEffects: true, surfaceDetail: false, glowEffects: false, updateFrequency: 2 },
                { level: LODLevel.FAR, distance: 10000, renderMode: 'billboard', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 4 },
                { level: LODLevel.VERY_FAR, distance: 50000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 8 },
                { level: LODLevel.EXTREME, distance: Infinity, renderMode: 'icon', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 16 }
            ],
            moon: [
                { level: LODLevel.ULTRA_CLOSE, distance: 50, renderMode: 'full', particleEffects: false, atmosphereEffects: false, surfaceDetail: true, glowEffects: false, updateFrequency: 1 },
                { level: LODLevel.CLOSE, distance: 200, renderMode: 'full', particleEffects: false, atmosphereEffects: false, surfaceDetail: true, glowEffects: false, updateFrequency: 1 },
                { level: LODLevel.MEDIUM, distance: 1000, renderMode: 'simplified', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 2 },
                { level: LODLevel.FAR, distance: 5000, renderMode: 'billboard', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 4 },
                { level: LODLevel.VERY_FAR, distance: 25000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 8 },
                { level: LODLevel.EXTREME, distance: Infinity, renderMode: 'icon', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 16 }
            ],
            asteroid: [
                { level: LODLevel.ULTRA_CLOSE, distance: 30, renderMode: 'full', particleEffects: false, atmosphereEffects: false, surfaceDetail: true, glowEffects: false, updateFrequency: 1 },
                { level: LODLevel.CLOSE, distance: 100, renderMode: 'simplified', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 2 },
                { level: LODLevel.MEDIUM, distance: 500, renderMode: 'billboard', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 4 },
                { level: LODLevel.FAR, distance: 2000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 8 },
                { level: LODLevel.VERY_FAR, distance: 10000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 16 },
                { level: LODLevel.EXTREME, distance: Infinity, renderMode: 'icon', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 32 }
            ],
            comet: [
                { level: LODLevel.ULTRA_CLOSE, distance: 100, renderMode: 'full', particleEffects: true, atmosphereEffects: false, surfaceDetail: true, glowEffects: true, updateFrequency: 1 },
                { level: LODLevel.CLOSE, distance: 500, renderMode: 'full', particleEffects: true, atmosphereEffects: false, surfaceDetail: false, glowEffects: true, updateFrequency: 1 },
                { level: LODLevel.MEDIUM, distance: 2000, renderMode: 'simplified', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: true, updateFrequency: 2 },
                { level: LODLevel.FAR, distance: 10000, renderMode: 'billboard', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 4 },
                { level: LODLevel.VERY_FAR, distance: 50000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 8 },
                { level: LODLevel.EXTREME, distance: Infinity, renderMode: 'icon', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 16 }
            ],
            black_hole: [
                { level: LODLevel.ULTRA_CLOSE, distance: 200, renderMode: 'full', particleEffects: true, atmosphereEffects: true, surfaceDetail: true, glowEffects: true, updateFrequency: 1 },
                { level: LODLevel.CLOSE, distance: 1000, renderMode: 'full', particleEffects: true, atmosphereEffects: true, surfaceDetail: false, glowEffects: true, updateFrequency: 1 },
                { level: LODLevel.MEDIUM, distance: 5000, renderMode: 'simplified', particleEffects: false, atmosphereEffects: true, surfaceDetail: false, glowEffects: true, updateFrequency: 2 },
                { level: LODLevel.FAR, distance: 20000, renderMode: 'billboard', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: true, updateFrequency: 4 },
                { level: LODLevel.VERY_FAR, distance: 100000, renderMode: 'point', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 8 },
                { level: LODLevel.EXTREME, distance: Infinity, renderMode: 'icon', particleEffects: false, atmosphereEffects: false, surfaceDetail: false, glowEffects: false, updateFrequency: 16 }
            ]
        };
    }

    update(bodies: CelestialBody[]): void {
        this.frameCounter++;
        const cameraPosition = this.camera.position;
        
        this.metrics.visibleBodies = 0;
        this.metrics.culledBodies = 0;
        this.metrics.lodChanges = 0;

        bodies.forEach(body => {
            const distance = body.position.distanceTo(cameraPosition);
            const bodyType = body.userData.type;
            const bodyId = body.userData.name || body.uuid;
            
            // 現在のLODレベルを取得
            const currentLOD = this.bodiesLODState.get(bodyId) || LODLevel.EXTREME;
            
            // 新しいLODレベルを計算
            const newLOD = this.calculateLODLevel(distance, bodyType);
            
            // LODが変更された場合のみ更新
            if (currentLOD !== newLOD) {
                this.applyLODToBody(body, newLOD, bodyType);
                this.bodiesLODState.set(bodyId, newLOD);
                this.metrics.lodChanges++;
            }
            
            // 更新頻度の制御
            const config = this.getLODConfig(bodyType, newLOD);
            if (config && this.frameCounter % config.updateFrequency === 0) {
                this.updateBodyEffects(body, config);
            }
            
            // 可視性のカウント
            if (newLOD < LODLevel.EXTREME) {
                this.metrics.visibleBodies++;
            } else {
                this.metrics.culledBodies++;
            }
        });
    }

    private calculateLODLevel(distance: number, bodyType: string): LODLevel {
        const configs = this.lodConfigs[bodyType as keyof CelestialLODConfig];
        if (!configs) return LODLevel.EXTREME;

        // パフォーマンスモードによる距離の調整
        const distanceMultiplier = this.getDistanceMultiplier();
        const adjustedDistance = distance / distanceMultiplier;

        for (let i = 0; i < configs.length; i++) {
            if (adjustedDistance < configs[i].distance) {
                return configs[i].level;
            }
        }
        
        return LODLevel.EXTREME;
    }

    private getDistanceMultiplier(): number {
        switch (this.performanceMode) {
            case 'ultra': return 2.0;    // 2倍の距離でも高詳細を維持
            case 'high': return 1.5;
            case 'balanced': return 1.0;
            case 'performance': return 0.5; // 半分の距離で低詳細に切り替え
            default: return 1.0;
        }
    }

    private getLODConfig(bodyType: string, level: LODLevel): LODConfig | null {
        const configs = this.lodConfigs[bodyType as keyof CelestialLODConfig];
        if (!configs) return null;
        
        return configs.find(config => config.level === level) || null;
    }

    private applyLODToBody(body: CelestialBody, level: LODLevel, bodyType: string): void {
        const config = this.getLODConfig(bodyType, level);
        if (!config) return;

        // renderModeに基づいて表示を切り替え
        switch (config.renderMode) {
            case 'full':
                this.setFullDetail(body);
                break;
            case 'simplified':
                this.setSimplifiedDetail(body);
                break;
            case 'billboard':
                this.setBillboardMode(body);
                break;
            case 'point':
                this.setPointMode(body);
                break;
            case 'icon':
                this.setIconMode(body);
                break;
        }
        
        // エフェクトの有効/無効を設定
        this.toggleEffects(body, config);
    }

    private setFullDetail(body: CelestialBody): void {
        body.visible = true;
        if (body.children) {
            body.children.forEach(child => {
                child.visible = true;
            });
        }
        
        // ジオメトリを高詳細に
        if (body instanceof THREE.Mesh && body.userData.highDetailGeometry) {
            body.geometry = body.userData.highDetailGeometry;
        }
    }

    private setSimplifiedDetail(body: CelestialBody): void {
        body.visible = true;
        
        // ジオメトリを簡易版に
        if (body instanceof THREE.Mesh && body.userData.simplifiedGeometry) {
            body.geometry = body.userData.simplifiedGeometry;
        }
        
        // 子オブジェクト（詳細な装飾など）を非表示
        if (body.children) {
            body.children.forEach(child => {
                if (child.userData.isDetail) {
                    child.visible = false;
                }
            });
        }
    }

    private setBillboardMode(body: CelestialBody): void {
        // メッシュを非表示にし、ビルボードスプライトを表示
        if (body instanceof THREE.Mesh) {
            body.visible = false;
        }
        
        if (body.userData.billboardSprite) {
            body.userData.billboardSprite.visible = true;
        }
    }

    private setPointMode(body: CelestialBody): void {
        // すべて非表示にし、点光源のみ表示
        body.visible = false;
        
        if (body.userData.pointLight) {
            body.userData.pointLight.visible = true;
        }
    }

    private setIconMode(body: CelestialBody): void {
        // 完全に非表示（UIアイコンのみ表示）
        body.visible = false;
    }

    private toggleEffects(body: CelestialBody, config: LODConfig): void {
        // パーティクルエフェクト
        if (body.userData.particleSystem && typeof body.userData.particleSystem === 'object' && 'visible' in body.userData.particleSystem) {
            body.userData.particleSystem.visible = config.particleEffects;
        }
        
        // 大気エフェクト（atmosphereEffectやatmosphereMeshなど、数値のatmosphereプロパティとは別）
        if (body.userData.atmosphereEffect && typeof body.userData.atmosphereEffect === 'object' && 'visible' in body.userData.atmosphereEffect) {
            body.userData.atmosphereEffect.visible = config.atmosphereEffects;
        }
        
        // グローエフェクト
        if (body.userData.glowMesh && typeof body.userData.glowMesh === 'object' && 'visible' in body.userData.glowMesh) {
            body.userData.glowMesh.visible = config.glowEffects;
        }
    }

    private updateBodyEffects(body: CelestialBody, config: LODConfig): void {
        // 更新頻度に基づいてエフェクトを更新
        if (body.userData.updateEffects && typeof body.userData.updateEffects === 'function') {
            body.userData.updateEffects(this.frameCounter);
        }
    }

    // パフォーマンス調整
    setPerformanceMode(mode: 'ultra' | 'high' | 'balanced' | 'performance'): void {
        this.performanceMode = mode;
        console.log(`[LOD] Performance mode set to: ${mode}`);
    }

    // FPSに基づく自動調整
    adjustForFPS(currentFPS: number): void {
        if (currentFPS < 30 && this.performanceMode !== 'performance') {
            this.setPerformanceMode('performance');
        } else if (currentFPS < 45 && this.performanceMode === 'high') {
            this.setPerformanceMode('balanced');
        } else if (currentFPS > 55 && this.performanceMode === 'performance') {
            this.setPerformanceMode('balanced');
        } else if (currentFPS > 58 && this.performanceMode === 'balanced') {
            this.setPerformanceMode('high');
        }
    }

    getMetrics(): typeof this.metrics {
        return { ...this.metrics };
    }

    // カスタムLOD設定
    setCustomLODConfig(bodyType: keyof CelestialLODConfig, configs: LODConfig[]): void {
        this.lodConfigs[bodyType] = configs;
    }

    // 特定の天体のLODを強制的に設定
    forceLODLevel(body: CelestialBody, level: LODLevel): void {
        const bodyId = body.userData.name || body.uuid;
        this.bodiesLODState.set(bodyId, level);
        this.applyLODToBody(body, level, body.userData.type);
    }
}