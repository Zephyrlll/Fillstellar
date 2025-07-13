/**
 * ========================================
 * Cosmic Gardener - Graphics Engine System
 * ========================================
 * 
 * ファイル概要：
 * メインのグラフィック設定管理システム。14種類の設定項目を統合管理し、
 * 動的品質調整、フレームレート制限、LODシステムを提供。
 * 
 * 主要クラス：
 * - GraphicsEngine: メイン管理クラス
 * - FrameRateLimiter: FPS制限システム  
 * - LODSystem: 距離ベース品質調整
 * 
 * 設定項目（14種類）：
 * 1. resolutionScale: 解像度スケール（25%-300%）★最重要
 * 2. textureQuality: テクスチャ品質
 * 3. shadowQuality: 影品質
 * 4. antiAliasing: アンチエイリアシング
 * 5. postProcessing: ポストプロセッシング
 * 6. particleDensity: パーティクル密度（星場制御）
 * 7. viewDistance: 描画距離
 * 8. frameRateLimit: フレームレート制限★重要
 * 9. vsync: V-Sync設定
 * 10. lightingQuality: ライティング品質
 * 11. fogEffect: フォグエフェクト（星場保護機能付き）
 * 12. renderPrecision: レンダリング精度
 * 13. objectDetail: オブジェクト詳細度
 * 14. uiAnimations: UIアニメーション品質
 * 
 * 利用ファイル：
 * - main.js: アニメーションループでupdate()を呼び出し
 * - events.js: ユーザー操作イベント処理
 * - ui.js: UI更新とプリセット表示
 * - state.js: 設定値とプリセット定義
 * 
 * パフォーマンス影響度：
 * - 高: resolutionScale, shadowQuality
 * - 中: antiAliasing, postProcessing, viewDistance
 * - 低: fogEffect, uiAnimations
 * 
 * 今後の改善予定：
 * - TODO: GPU性能自動検出
 * - TODO: 動的品質調整の改良
 * - TODO: プリセットの自動推奨機能
 * - TODO: 詳細なパフォーマンス統計
 */

import * as THREE from 'three';
import { gameState, applyGraphicsPreset } from './state.js';
import { scene, camera, renderer, composer, ambientLight } from './threeSetup.js';
import { performanceMonitor } from './performanceMonitor.js';

/**
 * GraphicsEngine - メイングラフィック設定管理システム
 * 
 * 機能概要:
 * - 解像度スケール、影品質、ポストプロセッシングなど14種類の設定管理
 * - プリセット適用（minimal, low, medium, high, ultra, extreme）
 * - フレームレート制限システム
 * - LOD（Level of Detail）システム
 * - 動的品質調整（パフォーマンス低下時の自動設定下げ）
 * 
 * 主要メソッド:
 * - applyAllSettings(): 全設定を一括適用
 * - update(): 変更検知と差分適用
 * - applyPreset(): プリセット適用
 * 
 * 注意事項:
 * - 200%以上の解像度スケールは高負荷
 * - Anti-aliasing変更にはレンダラー再作成が必要
 * - Fogの設定変更は星場に影響しないよう調整済み
 */
export class GraphicsEngine {
    // 前回適用した設定値（変更検知用）
    previousSettings = {};
    
    // フレームレート制限システム
    frameRateLimiter;
    
    // LODシステム管理（オブジェクト距離による品質切り替え）
    lodSystems = new Map();
    
    // 動的品質調整システムの有効/無効
    dynamicQualityEnabled = false;
    
    // 動的品質調整のクールダウン（連続調整防止）
    qualityAdjustmentCooldown = 0;
    
    /**
     * コンストラクタ
     * フレームレート制限システムを初期化し、現在の設定を適用
     */
    constructor() {
        this.frameRateLimiter = new FrameRateLimiter();
        this.applyAllSettings();
    }
    /**
     * 全グラフィック設定を一括適用
     * 
     * 実行順序が重要：
     * 1. 基本レンダリング設定（解像度、AA、影）
     * 2. エフェクト設定（ポストプロセッシング、フォグ）
     * 3. パフォーマンス設定（フレームレート制限）
     * 4. 星場・UI関連設定
     * 
     * 注意：この関数は初期化時とプリセット変更時のみ呼び出すこと
     * 個別設定変更時はupdate()メソッドを使用
     */
    applyAllSettings() {
        const graphics = gameState.graphics;
        
        // === 基本レンダリング設定 ===
        this.applyResolutionScale(graphics.resolutionScale);
        this.applyAntiAliasing(graphics.antiAliasing);
        this.applyShadowQuality(graphics.shadowQuality);
        
        // === エフェクト設定 ===
        this.applyPostProcessing(graphics.postProcessing);
        this.applyViewDistance(graphics.viewDistance);
        this.applyLightingQuality(graphics.lightingQuality);
        this.applyFogEffect(graphics.fogEffect); // 星場保護機能付き
        
        // === パフォーマンス・UI設定 ===
        this.applyRenderPrecision(graphics.renderPrecision);
        this.applyUIAnimations(graphics.uiAnimations);
        this.applyParticleDensity(graphics.particleDensity); // 星場密度制御
        
        // === フレームレート制限設定 ===
        this.frameRateLimiter.setTargetFPS(graphics.frameRateLimit);
        console.log(`🎯 Frame rate limit set to: ${graphics.frameRateLimit} FPS`);
        
        // === 変更検知用に現在設定を保存 ===
        this.previousSettings = { ...graphics };
        console.log(`🎨 Graphics settings applied: ${graphics.preset} preset`);
    }
    /**
     * 設定変更を検知して差分のみ適用（パフォーマンス最適化）
     * 
     * 処理フロー：
     * 1. プリセット変更チェック（優先度最高）
     * 2. 個別設定の変更検知
     * 3. LODシステム更新
     * 4. 動的品質調整
     * 
     * このメソッドは毎フレーム呼び出されるため、軽量性が重要
     * 変更がない場合は何も実行しない
     */
    update() {
        const graphics = gameState.graphics;
        
        // === プリセット変更の優先チェック ===
        // プリセット変更時は全設定を再適用
        if (this.previousSettings.preset !== graphics.preset && graphics.preset !== 'custom') {
            this.applyPreset(graphics.preset);
            return; // 他の処理をスキップ
        }
        
        // === 個別設定の変更検知と適用 ===
        // 重要度の高い設定から順番にチェック
        
        // 解像度スケール（パフォーマンスに大きく影響）
        if (this.previousSettings.resolutionScale !== graphics.resolutionScale) {
            this.applyResolutionScale(graphics.resolutionScale);
        }
        
        // アンチエイリアシング（品質に大きく影響）
        if (this.previousSettings.antiAliasing !== graphics.antiAliasing) {
            this.applyAntiAliasing(graphics.antiAliasing);
        }
        
        // 影品質（パフォーマンスに中程度の影響）
        if (this.previousSettings.shadowQuality !== graphics.shadowQuality) {
            this.applyShadowQuality(graphics.shadowQuality);
        }
        
        // ポストプロセッシング（品質向上効果）
        if (this.previousSettings.postProcessing !== graphics.postProcessing) {
            this.applyPostProcessing(graphics.postProcessing);
        }
        
        // 描画距離（パフォーマンスに中程度の影響）
        if (this.previousSettings.viewDistance !== graphics.viewDistance) {
            this.applyViewDistance(graphics.viewDistance);
        }
        
        // ライティング品質
        if (this.previousSettings.lightingQuality !== graphics.lightingQuality) {
            this.applyLightingQuality(graphics.lightingQuality);
        }
        
        // フォグエフェクト（星場保護機能付き）
        if (this.previousSettings.fogEffect !== graphics.fogEffect) {
            this.applyFogEffect(graphics.fogEffect);
        }
        
        // フレームレート制限
        if (this.previousSettings.frameRateLimit !== graphics.frameRateLimit) {
            this.frameRateLimiter.setTargetFPS(graphics.frameRateLimit);
        }
        
        // パーティクル密度（星場密度）
        if (this.previousSettings.particleDensity !== graphics.particleDensity) {
            this.applyParticleDensity(graphics.particleDensity);
        }
        
        // === システム更新 ===
        // LODシステムの更新（距離ベース品質調整）
        this.updateLODSystems();
        
        // 動的品質調整（パフォーマンス低下時の自動調整）
        if (this.dynamicQualityEnabled) {
            this.handleDynamicQuality();
        }
        
        // === 変更検知用に現在設定を保存 ===
        this.previousSettings = { ...graphics };
    }
    // Apply a graphics preset
    applyPreset(presetName) {
        applyGraphicsPreset(gameState.graphics, presetName);
        this.applyAllSettings();
        performanceMonitor.resetHistory();
        console.log(`🎨 Applied graphics preset: ${presetName}`);
    }
    /**
     * 解像度スケール適用 - 最重要機能の一つ
     * 
     * 仕組み：
     * - 内部レンダリング解像度と表示サイズを分離
     * - 50%: 内部解像度半分 → 画面サイズに拡大表示（軽量・荒い）
     * - 100%: 標準解像度（1:1表示）
     * - 200%: 内部解像度2倍 → 画面サイズに縮小表示（高品質・重い）
     * 
     * パフォーマンス影響度：
     * - 25%: 約6.25倍軽い（0.25²）
     * - 50%: 約4倍軽い（0.5²）
     * - 200%: 約4倍重い（2²）
     * - 300%: 約9倍重い（3²）
     * 
     * 注意事項：
     * - setSize()の第3引数をfalseにしてCSS自動更新を無効化
     * - カメラのアスペクト比は表示サイズ基準で設定
     * - 2.0倍以上は高性能GPU推奨
     */
    applyResolutionScale(scale) {
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
        
        // === ログ出力 ===
        console.log(`📏 Resolution scale: ${Math.round(scale * 100)}% (${renderWidth}x${renderHeight} → ${displayWidth}x${displayHeight})`);
        
        // === パフォーマンス警告 ===
        if (scale >= 2.0) {
            console.warn(`⚠️ High resolution scale (${Math.round(scale * 100)}%) may impact performance significantly!`);
            console.log(`💡 Consider monitoring FPS and reducing other settings if needed.`);
            
            // 将来の改善案をコメントとして残す
            // TODO: 自動品質調整機能との連携
            // TODO: GPU性能検出による推奨設定表示
            // TODO: フレームレート低下時の自動スケール調整
        }
    }
    // Anti-aliasing settings
    applyAntiAliasing(type) {
        // Note: Changing antialiasing requires renderer recreation in Three.js
        // For now, we'll log the change and apply it on next reload
        console.log(`🔧 Anti-aliasing setting: ${type} (requires reload)`);
        // Store setting for renderer recreation
        renderer.__requestedAntialiasing = type;
    }
    // Shadow quality settings
    applyShadowQuality(quality) {
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
    getShadowMapSize(quality) {
        switch (quality) {
            case 'ultra': return 4096;
            case 'high': return 2048;
            case 'medium': return 1024;
            case 'low': return 512;
            default: return 1024;
        }
    }
    // Post-processing effects
    applyPostProcessing(quality) {
        if (!composer)
            return;
        // This is a simplified implementation
        // In a full implementation, you would add/remove specific passes
        const bloomPass = composer.passes.find(pass => pass.constructor.name === 'UnrealBloomPass');
        if (bloomPass && quality !== 'off') {
            bloomPass.enabled = true;
            // Adjust bloom intensity based on quality
            switch (quality) {
                case 'ultra':
                    bloomPass.strength = 2.0;
                    bloomPass.threshold = 0.1;
                    break;
                case 'high':
                    bloomPass.strength = 1.8;
                    bloomPass.threshold = 0.2;
                    break;
                case 'medium':
                    bloomPass.strength = 1.5;
                    bloomPass.threshold = 0.3;
                    break;
                case 'low':
                    bloomPass.strength = 1.0;
                    bloomPass.threshold = 0.5;
                    break;
            }
        }
        else if (bloomPass) {
            bloomPass.enabled = false;
        }
        console.log(`✨ Post-processing set to: ${quality}`);
    }
    // View distance (camera far plane)
    applyViewDistance(distance) {
        let farPlane;
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
    applyLightingQuality(quality) {
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
    // Fog effects - adjusted to not interfere with starfield
    applyFogEffect(effect) {
        switch (effect) {
            case 'off':
                scene.fog = null;
                break;
            case 'simple':
                // Fog only affects closer objects, not the distant starfield
                scene.fog = new THREE.Fog(0x000011, 1000, 8000);
                break;
            case 'standard':
                // Medium fog that doesn't reach the starfield
                scene.fog = new THREE.Fog(0x000011, 800, 12000);
                break;
            case 'high':
                // Exponential fog with very low density to not affect stars
                scene.fog = new THREE.FogExp2(0x000011, 0.00002);
                break;
        }
        
        // Update starfield material to be unaffected by fog
        this.updateStarfieldFogResistance();
        console.log(`🌫️ Fog effect set to: ${effect}`);
    }
    
    // Make starfield resistant to fog effects
    updateStarfieldFogResistance() {
        const starfield = scene.getObjectByName('starfield');
        if (!starfield) return;
        
        // Starfield should not be affected by fog since it represents distant background
        starfield.material.fog = false;
        console.log('⭐ Starfield protected from fog effects');
    }
    // Render precision
    applyRenderPrecision(precision) {
        // Note: Three.js WebGLRenderer doesn't have a direct precision property
        // This would need to be set during renderer creation via constructor options
        // For now, we'll log the change and store it for future renderer recreation
        renderer.__requestedPrecision = precision;
        console.log(`🎯 Render precision set to: ${precision}`);
    }
    // Particle density - now controls starfield density
    applyParticleDensity(density) {
        this.updateStarfieldDensity(density);
        console.log(`✨ Particle density set to: ${Math.round(density * 100)}%`);
    }
    
    // Update starfield based on particle density setting
    updateStarfieldDensity(density) {
        const starfield = scene.getObjectByName('starfield');
        if (!starfield) return;
        
        // Store original positions if not already stored
        if (!starfield.userData.originalPositions) {
            const geometry = starfield.geometry;
            starfield.userData.originalPositions = new Float32Array(geometry.attributes.position.array);
        }
        
        const geometry = starfield.geometry;
        const originalPositions = starfield.userData.originalPositions;
        const currentPositions = geometry.attributes.position.array;
        
        // Calculate how many stars to show
        const totalStars = originalPositions.length / 3;
        const visibleStars = Math.floor(totalStars * density);
        
        // Restore original positions first
        for (let i = 0; i < originalPositions.length; i++) {
            currentPositions[i] = originalPositions[i];
        }
        
        // Use drawRange to efficiently control visible stars instead of moving them
        geometry.setDrawRange(0, visibleStars);
        geometry.attributes.position.needsUpdate = true;
        
        // Also ensure fog resistance is maintained and adjust size based on density
        starfield.material.fog = false;
        
        // Adjust star size based on density for better visual balance
        const baseSizeMultiplier = density < 0.3 ? 1.2 : (density > 0.8 ? 0.8 : 1.0);
        starfield.material.size = 0.8 * baseSizeMultiplier;
        
        console.log(`🌟 Starfield density: ${visibleStars}/${totalStars} stars visible, size: ${starfield.material.size.toFixed(1)}`);
    }
    // UI animations
    applyUIAnimations(level) {
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
    updateLODSystems() {
        const objectDetail = gameState.graphics.objectDetail;
        // Update existing LOD systems
        for (const [object, lodSystem] of this.lodSystems) {
            lodSystem.update(camera, objectDetail);
        }
    }
    // Add LOD system to an object
    addLODSystem(object, highDetail, mediumDetail, lowDetail) {
        const lodSystem = new LODSystem(object, highDetail, mediumDetail, lowDetail);
        this.lodSystems.set(object, lodSystem);
    }
    // Dynamic quality adjustment
    enableDynamicQuality(enabled) {
        this.dynamicQualityEnabled = enabled;
        console.log(`🔄 Dynamic quality adjustment: ${enabled ? 'enabled' : 'disabled'}`);
    }
    handleDynamicQuality() {
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
        }
        else if (currentFPS > targetFPS * 1.2) {
            // Performance is good, can increase quality
            this.increaseQuality();
            this.qualityAdjustmentCooldown = 300;
        }
    }
    reduceQuality() {
        const graphics = gameState.graphics;
        let changed = false;
        // Reduce settings in order of performance impact
        if (graphics.resolutionScale > 0.5) {
            graphics.resolutionScale = Math.max(0.5, graphics.resolutionScale - 0.25);
            changed = true;
        }
        else if (graphics.shadowQuality !== 'off') {
            graphics.shadowQuality = 'off';
            changed = true;
        }
        else if (graphics.particleDensity > 0.1) {
            graphics.particleDensity = Math.max(0.1, graphics.particleDensity - 0.25);
            changed = true;
        }
        if (changed) {
            graphics.preset = 'custom';
            console.log('📉 Dynamic quality reduction applied');
        }
    }
    increaseQuality() {
        // Implementation for increasing quality when performance allows
        // This would be the reverse of reduceQuality
        console.log('📈 Dynamic quality could be increased');
    }
    // Get frame rate limiter
    getFrameRateLimiter() {
        return this.frameRateLimiter;
    }
}
/**
 * FrameRateLimiter - 精密なフレームレート制限システム
 * 
 * 機能：
 * - 指定したFPS値でのフレームレート制限
 * - requestAnimationFrame + setTimeout の組み合わせで精密制御
 * - フレームドリフト補正機能
 * 
 * 使用例：
 * - 30 FPS: バッテリー節約、低負荷
 * - 60 FPS: 標準、バランス重視
 * - 120 FPS: 高リフレッシュレートモニター対応
 * - -1: 制限なし（モニターのリフレッシュレートに依存）
 * 
 * 注意：
 * - main.js のアニメーションループと連携
 * - パフォーマンス測定のため実際のFPSもログ出力
 */
class FrameRateLimiter {
    // 目標FPS値（-1 = 制限なし）
    targetFPS = -1;
    
    // 最後にフレームを描画した時刻（performance.now()）
    lastFrameTime = 0;
    
    // フレーム間隔（ミリ秒）
    frameInterval = 0;
    
    // 描画フレーム数（デバッグ用カウンター）
    frameCount = 0;
    
    /**
     * 目標FPS設定
     * @param {number} fps - 目標FPS（-1で制限なし、0で停止）
     */
    setTargetFPS(fps) {
        this.targetFPS = fps;
        this.frameInterval = fps > 0 ? 1000 / fps : 0;
        this.lastFrameTime = performance.now(); // タイミングリセット
        console.log(`🎮 Frame rate limiter: Target ${fps} FPS, interval ${this.frameInterval.toFixed(1)}ms`);
    }
    
    /**
     * フレーム描画判定
     * @returns {boolean} true=描画実行, false=スキップ
     * 
     * 処理フロー：
     * 1. 制限なしの場合は常にtrue
     * 2. 経過時間が目標間隔以上ならtrue
     * 3. ドリフト補正で精度向上
     */
    shouldRender() {
        // 制限なしの場合は常に描画
        if (this.targetFPS <= 0) return true;
        
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        // 目標間隔に達したかチェック
        if (elapsed >= this.frameInterval) {
            // === ドリフト補正 ===
            // 余分な時間を次回に繰り越して精度向上
            this.lastFrameTime = now - (elapsed % this.frameInterval);
            this.frameCount++;
            
            // === パフォーマンス監視 ===
            // 1秒間隔で実際のFPSをログ出力
            if (this.frameCount % 60 === 0) {
                const actualFPS = Math.round(1000 / elapsed);
                console.log(`🎯 Frame rendered: Target ${this.targetFPS} FPS, Actual ~${actualFPS} FPS`);
                
                // 大きな乖離がある場合は警告
                if (Math.abs(actualFPS - this.targetFPS) > this.targetFPS * 0.1) {
                    console.warn(`⚠️ FPS deviation detected: Target ${this.targetFPS}, Actual ${actualFPS}`);
                }
            }
            
            return true; // 描画実行
        }
        
        return false; // 描画スキップ
    }
    
    /**
     * 次フレームまでの待機時間取得
     * @returns {number} 待機時間（ミリ秒）
     * 
     * setTimeout用の精密タイミング計算
     * main.jsでrequestAnimationFrameと組み合わせて使用
     */
    getNextFrameDelay() {
        if (this.targetFPS <= 0) return 0; // 制限なし
        
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        const remaining = Math.max(0, this.frameInterval - elapsed);
        
        return remaining;
    }
}
// LOD (Level of Detail) system
class LODSystem {
    parentObject;
    levels = [];
    currentLevel = -1;
    constructor(parentObject, highDetail, mediumDetail, lowDetail) {
        this.parentObject = parentObject;
        this.levels = [
            { distance: 0, object: highDetail },
            { distance: 500, object: mediumDetail },
            { distance: 2000, object: lowDetail }
        ];
        // Initially show high detail
        this.setLevel(0);
    }
    update(camera, qualitySetting) {
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
    setLevel(level) {
        // Hide current level
        if (this.currentLevel >= 0) {
            this.levels[this.currentLevel].object.visible = false;
        }
        // Show new level
        this.currentLevel = level;
        this.levels[level].object.visible = true;
    }
    getDistanceMultiplier(quality) {
        switch (quality) {
            case 'ultra': return 2.0;
            case 'high': return 1.5;
            case 'medium': return 1.0;
            case 'low': return 0.7;
            default: return 1.0;
        }
    }
}
// === グローバルインスタンス作成 ===
export const graphicsEngine = new GraphicsEngine();

/**
 * ========================================
 * 開発者向けガイド
 * ========================================
 * 
 * 【新しい設定項目を追加する場合】
 * 1. state.js の GraphicsState インターフェースに追加
 * 2. GRAPHICS_PRESETS の各プリセットに値を追加
 * 3. このファイルに apply[設定名]() メソッドを作成
 * 4. applyAllSettings() と update() に追加
 * 5. events.js にイベントハンドラー追加
 * 6. index.html にUI要素追加
 * 7. ui.js にUI更新ロジック追加
 * 
 * 【パフォーマンス最適化のポイント】
 * - update() は毎フレーム呼び出されるため軽量性重視
 * - 重い処理は apply[設定名]() メソッド内で実行
 * - 変更検知は厳密等価比較（===）を使用
 * - console.log は本番環境では削除を検討
 * 
 * 【デバッグ方法】
 * - ブラウザのコンソールで各種ログを確認
 * - gameState.graphics で現在設定を確認
 * - performanceMonitor.getCurrentFPS() でFPS監視
 * - graphicsEngine.enableDynamicQuality(true) で自動調整テスト
 * 
 * 【既知の制限事項】
 * - アンチエイリアシング変更にはレンダラー再作成が必要
 * - 一部設定は即座に反映されない（要ページリロード）
 * - 300%解像度は高性能GPU必須
 * - フォグ設定は星場に影響しないよう特別対応済み
 * 
 * 【テスト環境での確認項目】
 * - 各プリセットでのFPS変化
 * - 解像度スケール変更時の表示確認
 * - フレームレート制限の精度
 * - 設定変更時のUI同期
 * - 低スペック環境での動作確認
 */
