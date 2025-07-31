import * as BABYLON from '@babylonjs/core';

export interface OptimizationSettings {
    enableLOD: boolean;
    enableFrustumCulling: boolean;
    enableOcclusion: boolean;
    targetFPS: number;
    dynamicQuality: boolean;
    maxParticles: number;
    shadowQuality: 'low' | 'medium' | 'high' | 'off';
}

export class PerformanceOptimizer {
    private scene: BABYLON.Scene;
    private engine: BABYLON.Engine;
    private settings: OptimizationSettings;
    private fpsHistory: number[] = [];
    private lastOptimizationTime: number = 0;
    private optimizationInterval: number = 2000; // 2秒ごとに最適化
    
    constructor(scene: BABYLON.Scene, engine: BABYLON.Engine) {
        this.scene = scene;
        this.engine = engine;
        
        this.settings = {
            enableLOD: true,
            enableFrustumCulling: true,
            enableOcclusion: true,
            targetFPS: 60,
            dynamicQuality: true,
            maxParticles: 1000,
            shadowQuality: 'medium'
        };
        
        this.initializeOptimizations();
    }
    
    private initializeOptimizations(): void {
        // フラスタムカリングを有効化
        if (this.settings.enableFrustumCulling) {
            this.scene.registerBeforeRender(() => {
                this.scene.meshes.forEach(mesh => {
                    if (mesh.isVisible && mesh.isEnabled()) {
                        mesh.isInFrustum(this.scene.activeCamera!.getViewMatrix());
                    }
                });
            });
        }
        
        // オクルージョンクエリ
        if (this.settings.enableOcclusion && this.engine.getCaps().occlusionQuery) {
            this.scene.meshes.forEach(mesh => {
                mesh.occlusionType = BABYLON.AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC;
                mesh.occlusionQueryAlgorithmType = BABYLON.AbstractMesh.OCCLUSION_ALGORITHM_TYPE_CONSERVATIVE;
            });
        }
        
        // アンチエイリアシング設定
        this.scene.forceWireframe = false;
        this.scene.autoClear = true;
        this.scene.autoClearDepthAndStencil = true;
        
        // テクスチャ圧縮
        this.scene.getEngine().textureFormatInUse = "WEBGL_compressed_texture_s3tc";
    }
    
    public setupLOD(mesh: BABYLON.Mesh, distances: number[] = [20, 50, 100]): void {
        if (!this.settings.enableLOD) return;
        
        // LOD0: フル品質
        mesh.addLODLevel(distances[0], mesh);
        
        // LOD1: 中品質
        const lod1 = mesh.clone(mesh.name + "_LOD1");
        if (lod1) {
            this.simplifyMesh(lod1, 0.5);
            mesh.addLODLevel(distances[1], lod1);
        }
        
        // LOD2: 低品質
        const lod2 = mesh.clone(mesh.name + "_LOD2");
        if (lod2) {
            this.simplifyMesh(lod2, 0.2);
            mesh.addLODLevel(distances[2], lod2);
        }
        
        // LOD3: 非表示
        mesh.addLODLevel(distances[2] * 2, null);
    }
    
    private simplifyMesh(mesh: BABYLON.Mesh, quality: number): void {
        // 簡易的なメッシュ簡略化（実際にはdecimationを使用）
        if (mesh.geometry) {
            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            if (positions) {
                // 頂点数を減らす（簡易実装）
                const step = Math.ceil(1 / quality);
                const newPositions: number[] = [];
                
                for (let i = 0; i < positions.length; i += step * 3) {
                    if (i + 2 < positions.length) {
                        newPositions.push(positions[i], positions[i + 1], positions[i + 2]);
                    }
                }
                
                // 新しい頂点データを設定
                if (newPositions.length >= 9) { // 最低3頂点必要
                    mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, newPositions);
                }
            }
        }
    }
    
    public update(): void {
        const currentTime = Date.now();
        
        // FPSを記録
        const fps = this.engine.getFps();
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) {
            this.fpsHistory.shift();
        }
        
        // 定期的な最適化
        if (currentTime - this.lastOptimizationTime > this.optimizationInterval) {
            this.lastOptimizationTime = currentTime;
            
            if (this.settings.dynamicQuality) {
                this.adjustQualityBasedOnPerformance();
            }
        }
    }
    
    private adjustQualityBasedOnPerformance(): void {
        if (this.fpsHistory.length < 30) return;
        
        const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        
        if (avgFPS < this.settings.targetFPS * 0.8) {
            // パフォーマンスが低い場合
            this.decreaseQuality();
        } else if (avgFPS > this.settings.targetFPS * 0.95) {
            // パフォーマンスに余裕がある場合
            this.increaseQuality();
        }
    }
    
    private decreaseQuality(): void {
        console.log('[PERFORMANCE] Decreasing quality to improve FPS');
        
        // パーティクル数を減らす
        this.scene.particleSystems.forEach(ps => {
            ps.targetStopDuration = ps.targetStopDuration * 0.8;
            ps.emitRate = ps.emitRate * 0.8;
        });
        
        // 影の品質を下げる
        if (this.settings.shadowQuality !== 'off') {
            if (this.settings.shadowQuality === 'high') {
                this.settings.shadowQuality = 'medium';
            } else if (this.settings.shadowQuality === 'medium') {
                this.settings.shadowQuality = 'low';
            } else {
                this.settings.shadowQuality = 'off';
            }
            this.updateShadowQuality();
        }
        
        // レンダリング解像度を下げる
        this.engine.setHardwareScalingLevel(1.2);
    }
    
    private increaseQuality(): void {
        console.log('[PERFORMANCE] Increasing quality');
        
        // パーティクル数を増やす
        this.scene.particleSystems.forEach(ps => {
            ps.targetStopDuration = ps.targetStopDuration * 1.1;
            ps.emitRate = Math.min(ps.emitRate * 1.1, 200);
        });
        
        // 影の品質を上げる
        if (this.settings.shadowQuality !== 'high') {
            if (this.settings.shadowQuality === 'off') {
                this.settings.shadowQuality = 'low';
            } else if (this.settings.shadowQuality === 'low') {
                this.settings.shadowQuality = 'medium';
            } else {
                this.settings.shadowQuality = 'high';
            }
            this.updateShadowQuality();
        }
        
        // レンダリング解像度を上げる
        this.engine.setHardwareScalingLevel(1.0);
    }
    
    private updateShadowQuality(): void {
        this.scene.lights.forEach(light => {
            if (light instanceof BABYLON.DirectionalLight || 
                light instanceof BABYLON.SpotLight || 
                light instanceof BABYLON.PointLight) {
                
                const shadowGenerator = light.getShadowGenerator();
                if (shadowGenerator) {
                    switch (this.settings.shadowQuality) {
                        case 'high':
                            shadowGenerator.getShadowMap()!.renderList = this.scene.meshes;
                            shadowGenerator.usePoissonSampling = true;
                            shadowGenerator.bias = 0.00001;
                            break;
                        case 'medium':
                            shadowGenerator.getShadowMap()!.renderList = this.scene.meshes.filter(m => m.getTotalVertices() < 1000);
                            shadowGenerator.usePoissonSampling = false;
                            shadowGenerator.bias = 0.0001;
                            break;
                        case 'low':
                            shadowGenerator.getShadowMap()!.renderList = this.scene.meshes.filter(m => m.getTotalVertices() < 500);
                            shadowGenerator.usePoissonSampling = false;
                            shadowGenerator.bias = 0.001;
                            break;
                        case 'off':
                            shadowGenerator.getShadowMap()!.renderList = [];
                            break;
                    }
                }
            }
        });
    }
    
    public getFPSInfo(): { current: number; average: number; min: number; max: number } {
        const current = this.engine.getFps();
        const average = this.fpsHistory.length > 0 
            ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length 
            : current;
        const min = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : current;
        const max = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : current;
        
        return { current, average, min, max };
    }
    
    public getSettings(): OptimizationSettings {
        return { ...this.settings };
    }
    
    public updateSettings(newSettings: Partial<OptimizationSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.initializeOptimizations();
    }
    
    public createPerformanceUI(): HTMLDivElement {
        const perfUI = document.createElement('div');
        perfUI.id = 'performanceUI';
        perfUI.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 5px;
            min-width: 150px;
        `;
        
        setInterval(() => {
            const fpsInfo = this.getFPSInfo();
            const meshCount = this.scene.meshes.filter(m => m.isVisible).length;
            const triangleCount = this.scene.meshes.reduce((total, mesh) => 
                total + (mesh.isVisible ? mesh.getTotalVertices() : 0), 0
            );
            
            perfUI.innerHTML = `
                <div>FPS: ${Math.round(fpsInfo.current)}</div>
                <div>平均: ${Math.round(fpsInfo.average)}</div>
                <div>メッシュ: ${meshCount}</div>
                <div>頂点数: ${triangleCount.toLocaleString()}</div>
                <div>品質: ${this.settings.shadowQuality}</div>
            `;
        }, 100);
        
        return perfUI;
    }
}