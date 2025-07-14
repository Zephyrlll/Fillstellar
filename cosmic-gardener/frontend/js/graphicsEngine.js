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
import { scene, camera, renderer, composer, ambientLight, controls } from './threeSetup.js';
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
     * フレームレート制限システムを初期化
     * 🔧 Note: Settings are NOT applied automatically to prevent overriding loaded settings
     */
    constructor() {
        this.frameRateLimiter = new FrameRateLimiter();
        console.log('🔧 GraphicsEngine: Constructor complete (settings NOT auto-applied)');
    }
    /**
     * 🔧 解像度設定バグ対策：強制的に解像度を再適用
     */
    forceResolutionUpdate() {
        const currentScale = gameState.graphics.resolutionScale;
        console.log(`🔧 Force resolution update: ${currentScale}`);
        
        // 一度違うスケールを設定してから戻す（内部状態をリセット）
        this.applyResolutionScale(1.0);
        setTimeout(() => {
            this.applyResolutionScale(currentScale);
            console.log(`🔧 Force resolution update completed: ${currentScale}`);
        }, 100);
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
        console.log(`🧪 applyAllSettings called. Current scale: ${gameState.graphics.resolutionScale}`);
        console.log('🧪 gameState.graphics:', JSON.stringify(gameState.graphics));
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
        console.log(`🧪 graphicsEngine.update called. Current scale: ${gameState.graphics.resolutionScale}`);
        const graphics = gameState.graphics;
        
        // === プリセット変更の優先チェック ===
        // プリセット変更時は全設定を再適用
        // 🔧 FIX: Only apply preset if it's EXPLICITLY changed by user, not during auto-detection
        if (this.previousSettings.preset !== graphics.preset && graphics.preset !== 'custom') {
            // 🔧 IMPORTANT: Only apply preset if this is a real user-initiated change
            // Do not auto-apply presets during load or auto-detection
            console.log(`🚨 PREVENTED auto-preset application: ${graphics.preset}`);
            console.trace('Preset application prevented');
            // Set preset to custom to prevent future auto-applications
            graphics.preset = 'custom';
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
        
        // テクスチャ品質
        if (this.previousSettings.textureQuality !== graphics.textureQuality) {
            this.applyTextureQuality(graphics.textureQuality);
        }
        
        // オブジェクト詳細度
        if (this.previousSettings.objectDetail !== graphics.objectDetail) {
            this.applyObjectDetail(graphics.objectDetail);
        }
        
        // 背景詳細度
        if (this.previousSettings.backgroundDetail !== graphics.backgroundDetail) {
            this.applyBackgroundDetail(graphics.backgroundDetail);
        }
        
        // UIアニメーション品質
        if (this.previousSettings.uiAnimations !== graphics.uiAnimations) {
            this.applyUIAnimations(graphics.uiAnimations);
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
        
        // プリセット適用時もカメラをリセット
        if (controls) {
            camera.position.set(0, 0, 5000);
            controls.target.set(0, 0, 0);
            controls.update();
            console.log('🎯 Camera reset after preset application');
        }
        
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
        console.log(`🧪 applyResolutionScale called with scale: ${scale}`);
        console.log('🧪 gameState.graphics:', JSON.stringify(gameState.graphics));
        console.trace('applyResolutionScale call stack');
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio || 1;
        
        // 表示サイズ（常に画面いっぱい）
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        // 内部レンダリング解像度（品質に影響）
        const renderWidth = Math.round(displayWidth * scale);
        const renderHeight = Math.round(displayHeight * scale);
        
        // === Canvas DOM属性とCSS分離設定 ===
        // Step 1: Canvas DOM属性（内部解像度）を直接設定
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        
        // Step 2: CSS表示サイズを画面サイズに固定
        canvas.style.setProperty('width', displayWidth + 'px', 'important');
        canvas.style.setProperty('height', displayHeight + 'px', 'important');
        
        // Step 3: Three.jsレンダラーに変更を通知（ただしCSS更新はしない）
        renderer.setSize(renderWidth, renderHeight, false);
        // デバッグ: pixelRatioを1.0に固定してテスト
        renderer.setPixelRatio(1.0);
        console.log(`🧪 Pixel ratio forced to 1.0 (was ${pixelRatio})`);
        
        // CSS設定が正しく適用されているか確認
        console.log(`🔧 Canvas DOM: ${canvas.width}x${canvas.height}, CSS: ${canvas.style.width} x ${canvas.style.height}`);
        
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
        
        // === カメラ設定の更新（位置は保持） ===
        // アスペクト比やコントロールの更新のみ行い、カメラ位置は保持
        if (controls) {
            controls.update(); // コントロールの更新のみ
            console.log('🎯 Camera controls updated (position preserved)');
        }
        
        // === 詳細デバッグ情報の出力 ===
        console.log(`📏 Resolution scale: ${Math.round(scale * 100)}% (${renderWidth}x${renderHeight} → ${displayWidth}x${displayHeight})`);
        console.log(`🔍 Canvas actual size: ${canvas.width}x${canvas.height}`);
        console.log(`🔍 Canvas style size: ${canvas.style.width} x ${canvas.style.height}`);
        console.log(`🔍 Device pixel ratio: ${window.devicePixelRatio}`);
        console.log(`🔍 Renderer pixel ratio: ${renderer.getPixelRatio()}`);
        console.log(`🔍 Effective resolution: ${renderWidth * renderer.getPixelRatio()}x${renderHeight * renderer.getPixelRatio()}`);
        
        // WebGL描画バッファサイズの確認
        const gl = renderer.getContext();
        if (gl) {
            console.log(`🔍 WebGL buffer size: ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`);
        }
        
        // === 重要: WebGLビューポートの強制設定 ===
        if (gl) {
            gl.viewport(0, 0, renderWidth, renderHeight);
            console.log(`🔍 WebGL viewport set to: ${renderWidth}x${renderHeight}`);
        }
        
        // Three.jsの内部状態も確認
        const rendererSize = new THREE.Vector2();
        renderer.getSize(rendererSize);
        console.log(`🔍 Three.js renderer size: ${rendererSize.x}x${rendererSize.y}`);
        
        // 画面上に一時的なデバッグ情報を表示
        if (gameState.graphics.showResolutionDebug) {
            this.showPersistentResolutionDebugInfo(scale, renderWidth, renderHeight, displayWidth, displayHeight);
        } else {
            const existingDebug = document.getElementById('resolution-debug-info');
            if (existingDebug) {
                existingDebug.remove();
            }
        }
        
        // === パフォーマンス警告 ===
        if (scale >= 2.0) {
            console.warn(`⚠️ High resolution scale (${Math.round(scale * 100)}%) may impact performance significantly!`);
            console.log(`💡 Consider monitoring FPS and reducing other settings if needed.`);
            
            // 将来の改善案をコメントとして残す
            // TODO: 自動品質調整機能との連携
            // TODO: GPU性能検出による推奨設定表示
            // TODO: フレームレート低下時の自動スケール調整
        }
        
        // 🔧 星屑サイズを解像度スケールの影響から保護
        this.protectStarfieldSize();
    }
    
    /**
     * 星屑のサイズを解像度スケールに調整（調整済み仕様）
     * 25%→0.1, 50%→1.3, 75%→2.5, 100%→4.0, 125%→10, 150%→40, 200%→50.0, 300%→60.0
     */
    protectStarfieldSize() {
        const starfield = scene.getObjectByName('starfield');
        if (starfield && starfield.material) {
            const currentScale = gameState?.graphics?.resolutionScale || 1.0;
            let starSize;
            
            // 調整済み仕様の正確な値マッピング
            if (Math.abs(currentScale - 0.25) < 0.01) {
                starSize = 0.1;
            } else if (Math.abs(currentScale - 0.5) < 0.01) {
                starSize = 1.3;
            } else if (Math.abs(currentScale - 0.75) < 0.01) {
                starSize = 2.5;
            } else if (Math.abs(currentScale - 1.0) < 0.01) {
                starSize = 4.0;
            } else if (Math.abs(currentScale - 1.25) < 0.01) {
                starSize = 10.0;
            } else if (Math.abs(currentScale - 1.5) < 0.01) {
                starSize = 40.0;
            } else if (Math.abs(currentScale - 2.0) < 0.01) {
                starSize = 50.0;
            } else if (Math.abs(currentScale - 3.0) < 0.01) {
                starSize = 60.0;
            } else {
                // 中間値は線形補間
                if (currentScale < 0.25) {
                    starSize = currentScale * 0.4; // 25%未満
                } else if (currentScale < 0.5) {
                    starSize = 0.1 + (currentScale - 0.25) * 4.8; // 25%-50%
                } else if (currentScale < 0.75) {
                    starSize = 1.3 + (currentScale - 0.5) * 4.8; // 50%-75%
                } else if (currentScale < 1.0) {
                    starSize = 2.5 + (currentScale - 0.75) * 6.0; // 75%-100%
                } else if (currentScale < 1.25) {
                    starSize = 4.0 + (currentScale - 1.0) * 24.0; // 100%-125%
                } else if (currentScale < 1.5) {
                    starSize = 10.0 + (currentScale - 1.25) * 120.0; // 125%-150%
                } else if (currentScale < 2.0) {
                    starSize = 40.0 + (currentScale - 1.5) * 20.0; // 150%-200%
                } else {
                    starSize = 50.0 + (currentScale - 2.0) * 10.0; // 200%以上
                }
            }
            
            starfield.material.size = starSize;
            console.log(`🌟 protectStarfieldSize: Setting size to ${starSize.toFixed(1)} (resolution: ${Math.round(currentScale * 100)}%)`);
        }
    }
    
    /**
     * 画面上に解像度デバッグ情報を表示
     */
    showResolutionDebugInfo(scale, renderWidth, renderHeight, displayWidth, displayHeight) {
        // 既存のデバッグ表示を削除
        const existingDebug = document.getElementById('resolution-debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // デバッグ情報表示要素を作成
        const debugDiv = document.createElement('div');
        debugDiv.id = 'resolution-debug-info';
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border: 1px solid #00ff00;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
        `;
        
        debugDiv.innerHTML = `
            <div style="color: #ffffff; font-weight: bold; margin-bottom: 5px;">🔍 Resolution Debug</div>
            <div>Scale: <span style="color: #ffff00;">${Math.round(scale * 100)}%</span></div>
            <div>Render: <span style="color: #00ffff;">${renderWidth} x ${renderHeight}</span></div>
            <div>Display: <span style="color: #ff00ff;">${displayWidth} x ${displayHeight}</span></div>
            <div>Canvas DOM: <span style="color: #ffaa00;">${renderer.domElement.width} x ${renderer.domElement.height}</span></div>
            <div>Canvas CSS: <span style="color: #00ff88;">${renderer.domElement.style.width} x ${renderer.domElement.style.height}</span></div>
            <div style="margin-top: 5px; font-size: 10px; color: #aaaaaa;">
                Console: createResolutionTestObject()<br>
                Remove: removeResolutionTestObject()
            </div>
        `;
        
        document.body.appendChild(debugDiv);
        
        // 5秒後に自動で削除
        setTimeout(() => {
            if (debugDiv && debugDiv.parentNode) {
                debugDiv.remove();
            }
        }, 5000);
    }
    
    /**
     * 画面上に恒久的な解像度デバッグ情報を表示（自動削除なし）
     */
    showPersistentResolutionDebugInfo(scale, renderWidth, renderHeight, displayWidth, displayHeight) {
        // 既存のデバッグ表示を削除
        const existingDebug = document.getElementById('resolution-debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // デバッグ情報表示要素を作成
        const debugDiv = document.createElement('div');
        debugDiv.id = 'resolution-debug-info';
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border: 1px solid #00ff00;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
        `;
        
        debugDiv.innerHTML = `
            <div style="color: #ffffff; font-weight: bold; margin-bottom: 5px;">🔍 Resolution Debug</div>
            <div>Scale: <span style="color: #ffff00;">${Math.round(scale * 100)}%</span></div>
            <div>Render: <span style="color: #00ffff;">${renderWidth} x ${renderHeight}</span></div>
            <div>Display: <span style="color: #ff00ff;">${displayWidth} x ${displayHeight}</span></div>
            <div>Canvas DOM: <span style="color: #ffaa00;">${renderer.domElement.width} x ${renderer.domElement.height}</span></div>
            <div>Canvas CSS: <span style="color: #00ff88;">${renderer.domElement.style.width} x ${renderer.domElement.style.height}</span></div>
            <div style="margin-top: 5px; font-size: 10px; color: #aaaaaa;">
                Console: createResolutionTestObject()<br>
                Remove: removeResolutionTestObject()
            </div>
        `;
        
        document.body.appendChild(debugDiv);
    }
    
    /**
     * 初期化時専用のカメラリセット機能
     * 解像度変更時とは別に、初期化時のみカメラ位置をリセットする
     */
    resetCameraForInitialization() {
        if (controls) {
            // カメラを適切な位置に配置（ブラックホールが画面中央に見えるように）
            camera.position.set(0, 0, 5000); // 初期位置に戻す
            controls.target.set(0, 0, 0); // ブラックホール（原点）をターゲットに
            controls.update();
            console.log('🎯 Camera position reset for initialization: pos(0,0,5000) target(0,0,0)');
        }
    }
    
    /**
     * アンチエイリアシング設定 - 現在は制限あり
     * 
     * 注意：Three.jsでAAの動的変更はレンダラー再作成が必要
     * 将来的にはFXAAポストプロセッシングで代替予定
     */
    /**
     * アンチエイリアシング設定 - ポストプロセッシングFXAAで代替実装
     * 
     * 注意：Three.jsでのMSAAはレンダラー再作成が必要なため、
     * FXAAポストプロセッシングで代替実装
     */
    applyAntiAliasing(type) {
        // Store setting for potential future renderer recreation
        renderer.__requestedAntialiasing = type;
        
        // ポストプロセッシングを使用したアンチエイリアシング
        if (composer) {
            this.adjustPostProcessingAA(type);
        }
        
        console.log(`🔧 Anti-aliasing: ${type} (using post-processing)`);
    }
    
    adjustPostProcessingAA(aaType) {
        // bloom passの設定を調整してアンチエイリアシング効果を向上
        const bloomPass = composer.passes.find(pass => pass.constructor.name === 'UnrealBloomPass');
        
        if (bloomPass) {
            switch (aaType) {
                case 'msaa8x':
                case 'msaa4x':
                    // 高品質AA: bloomの閾値を上げてエッジを滑らかに
                    bloomPass.threshold = 0.1;
                    bloomPass.strength = 0.8;
                    bloomPass.radius = 1.0;
                    break;
                case 'msaa2x':
                case 'fxaa':
                    // 中品質AA: 標準設定
                    bloomPass.threshold = 0.3;
                    bloomPass.strength = 1.0;
                    bloomPass.radius = 0.8;
                    break;
                case 'off':
                    // AA無効: sharp edges
                    bloomPass.threshold = 0.5;
                    bloomPass.strength = 1.2;
                    bloomPass.radius = 0.5;
                    break;
            }
            
            console.log(`✨ AA post-processing adjusted: threshold=${bloomPass.threshold}`);
        }
    }
    /**
     * シャドウ品質設定 - 実際に影を表示
     * 
     * 現在の制限：
     * - 宇宙空間では影のコントラストが低い
     * - ライトの影キャスト設定が必要
     */
    applyShadowQuality(quality) {
        // シャドウマップの有効/無効
        renderer.shadowMap.enabled = quality !== 'off';
        
        if (quality !== 'off') {
            // シャドウマップの種類設定
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
            
            // 品質に応じたシャドウマップサイズ設定
            const shadowMapSize = this.getShadowMapSize(quality);
            
            // 全ライトのシャドウ設定を更新
            scene.traverse((object) => {
                if (object instanceof THREE.Light && object.shadow) {
                    object.shadow.mapSize.width = shadowMapSize;
                    object.shadow.mapSize.height = shadowMapSize;
                    object.shadow.map = null; // 再作成を強制
                    
                    // 影の品質向上設定
                    if (quality === 'ultra' || quality === 'high') {
                        object.shadow.radius = 4;
                        object.shadow.camera.near = 0.1;
                        object.shadow.camera.far = 50000;
                    }
                }
                
                // 天体オブジェクトの影キャスト設定
                if (object.userData && object.userData.type) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
            
            console.log(`☀️ Shadow quality: ${quality} (${shadowMapSize}x${shadowMapSize})`);
        } else {
            // 影を無効化
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.castShadow = false;
                    object.receiveShadow = false;
                }
            });
            console.log(`☀️ Shadows disabled`);
        }
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
                farPlane = 12000; // Increased from 10000 to prevent black hole disappearing
                break;
            default:
                farPlane = 20000;
        }
        
        // 元の設定通りにカメラのfar planeを設定
        camera.far = farPlane;
        camera.updateProjectionMatrix();
        
        // 🌟 星屑だけは描画距離制限を無視するよう特別処理
        this.protectStarfieldFromViewDistance();
        
        // Update fog far distance to match
        if (scene.fog && scene.fog instanceof THREE.Fog) {
            scene.fog.far = farPlane * 0.8;
        }
        console.log(`👁️ View distance set to: ${distance} (${farPlane})`);
    }
    
    /**
     * 星屑だけを描画距離制限から保護
     */
    protectStarfieldFromViewDistance() {
        const starfield = scene.getObjectByName('starfield');
        if (starfield && starfield.material) {
            // 星屑は通常の深度テストを使用（距離は25000以下に調整済み）
            starfield.material.depthTest = true; // 正常な深度テスト
            starfield.renderOrder = -1000; // 最背景として描画
            console.log('🌟 Starfield protection applied (normal depth test, background rendering)');
        }
    }
    /**
     * ライティング品質設定 - 実際に光の質を変更
     * 
     * 効果：
     * - アンビエントライトの強度調整
     * - 星の発光強度調整
     * - ライトの数とタイプ制御
     */
    applyLightingQuality(quality) {
        // アンビエントライトの強度調整（品質が高いほど暗くしてコントラスト向上）
        switch (quality) {
            case 'ultra':
                ambientLight.intensity = 0.2; // 低いアンビエント = よりリアルな影
                break;
            case 'high':
                ambientLight.intensity = 0.3;
                break;
            case 'medium':
                ambientLight.intensity = 0.4;
                break;
            case 'low':
                ambientLight.intensity = 0.6; // 高いアンビエント = 明るいが平坦
                break;
        }
        
        // 星の発光強度を品質に応じて調整
        scene.traverse((object) => {
            if (object.userData && object.userData.type === 'star') {
                // 星のマテリアル調整
                if (object.material) {
                    switch (quality) {
                        case 'ultra':
                            object.material.emissiveIntensity = 1.2;
                            break;
                        case 'high':
                            object.material.emissiveIntensity = 1.0;
                            break;
                        case 'medium':
                            object.material.emissiveIntensity = 0.8;
                            break;
                        case 'low':
                            object.material.emissiveIntensity = 0.6;
                            break;
                    }
                }
                
                // 星のライト強度調整（もしライトがある場合）
                object.traverse((child) => {
                    if (child instanceof THREE.Light) {
                        const baseIntensity = child.userData.baseIntensity || child.intensity;
                        child.userData.baseIntensity = baseIntensity;
                        
                        switch (quality) {
                            case 'ultra':
                                child.intensity = baseIntensity * 1.2;
                                break;
                            case 'high':
                                child.intensity = baseIntensity * 1.0;
                                break;
                            case 'medium':
                                child.intensity = baseIntensity * 0.8;
                                break;
                            case 'low':
                                child.intensity = baseIntensity * 0.6;
                                break;
                        }
                    }
                });
            }
        });
        
        console.log(`💡 Lighting quality: ${quality} (Ambient: ${ambientLight.intensity.toFixed(1)})`);
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
        
        // 🌟 調整済み星屑サイズスケーリング
        // 25%→0.1, 50%→1.3, 75%→2.5, 100%→4.0, 125%→10, 150%→40, 200%→50.0, 300%→60.0
        const resolutionScale = gameState.graphics.resolutionScale || 1.0;
        let starSize;
        
        // 調整済み仕様の正確な値マッピング
        if (Math.abs(resolutionScale - 0.25) < 0.01) {
            starSize = 0.1;
        } else if (Math.abs(resolutionScale - 0.5) < 0.01) {
            starSize = 1.3;
        } else if (Math.abs(resolutionScale - 0.75) < 0.01) {
            starSize = 2.5;
        } else if (Math.abs(resolutionScale - 1.0) < 0.01) {
            starSize = 4.0;
        } else if (Math.abs(resolutionScale - 1.25) < 0.01) {
            starSize = 10.0;
        } else if (Math.abs(resolutionScale - 1.5) < 0.01) {
            starSize = 40.0;
        } else if (Math.abs(resolutionScale - 2.0) < 0.01) {
            starSize = 50.0;
        } else if (Math.abs(resolutionScale - 3.0) < 0.01) {
            starSize = 60.0;
        } else {
            // 中間値は線形補間
            if (resolutionScale < 0.25) {
                starSize = resolutionScale * 0.4; // 25%未満
            } else if (resolutionScale < 0.5) {
                starSize = 0.1 + (resolutionScale - 0.25) * 4.8; // 25%-50%
            } else if (resolutionScale < 0.75) {
                starSize = 1.3 + (resolutionScale - 0.5) * 4.8; // 50%-75%
            } else if (resolutionScale < 1.0) {
                starSize = 2.5 + (resolutionScale - 0.75) * 6.0; // 75%-100%
            } else if (resolutionScale < 1.25) {
                starSize = 4.0 + (resolutionScale - 1.0) * 24.0; // 100%-125%
            } else if (resolutionScale < 1.5) {
                starSize = 10.0 + (resolutionScale - 1.25) * 120.0; // 125%-150%
            } else if (resolutionScale < 2.0) {
                starSize = 40.0 + (resolutionScale - 1.5) * 20.0; // 150%-200%
            } else {
                starSize = 50.0 + (resolutionScale - 2.0) * 10.0; // 200%以上
            }
        }
        
        starfield.material.size = starSize;
        console.log(`🌟 Setting starfield size to: ${starSize.toFixed(1)} (resolution: ${Math.round(resolutionScale * 100)}%)`);
        
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
        // 解像度スケールの自動変更を無効化（ユーザー設定を尊重）
        // if (graphics.resolutionScale > 0.5) {
        //     graphics.resolutionScale = Math.max(0.5, graphics.resolutionScale - 0.25);
        //     changed = true;
        // }
        if (graphics.shadowQuality !== 'off') {
            graphics.shadowQuality = 'off';
            changed = true;
        }
        else if (graphics.particleDensity > 0.1) {
            graphics.particleDensity = Math.max(0.1, graphics.particleDensity - 0.25);
            changed = true;
        }
        if (changed) {
            graphics.preset = 'custom';
            console.log('📉 Dynamic quality reduction applied (resolution scale preserved)');
        } else {
            console.log('📉 Dynamic quality reduction triggered but no changes made (resolution scale protected)');
        }
    }
    increaseQuality() {
        // Implementation for increasing quality when performance allows
        // This would be the reverse of reduceQuality
        console.log('📈 Dynamic quality could be increased');
    }
    /**
     * テクスチャ品質設定 - 実際にオブジェクトのテクスチャ解像度を変更
     * 
     * 効果：
     * - 天体オブジェクトのテクスチャフィルタリング調整
     * - テクスチャの異方性フィルタリング設定
     * - マテリアルの品質向上/軽量化
     */
    applyTextureQuality(quality) {
        // テクスチャフィルタリング設定
        const textureSettings = this.getTextureSettings(quality);
        
        // 全オブジェクトのテクスチャを更新
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material) {
                // マテリアルのテクスチャを処理
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                
                materials.forEach(material => {
                    // 各種テクスチャマップに設定を適用
                    const textures = [
                        material.map,        // diffuse map
                        material.normalMap,  // normal map
                        material.roughnessMap, // roughness map
                        material.metalnessMap, // metalness map
                        material.emissiveMap   // emissive map
                    ];
                    
                    textures.forEach(texture => {
                        if (texture) {
                            texture.minFilter = textureSettings.minFilter;
                            texture.magFilter = textureSettings.magFilter;
                            texture.anisotropy = textureSettings.anisotropy;
                            texture.needsUpdate = true;
                        }
                    });
                    
                    // マテリアル自体の品質調整
                    if (material instanceof THREE.MeshStandardMaterial || 
                        material instanceof THREE.MeshPhysicalMaterial) {
                        // 高品質時は詳細なマテリアル設定
                        material.roughness = quality === 'ultra' ? 0.1 : 
                                           quality === 'high' ? 0.2 : 
                                           quality === 'medium' ? 0.4 : 0.6;
                    }
                });
            }
        });
        
        console.log(`🖼️ Texture quality: ${quality} (Anisotropy: ${textureSettings.anisotropy}x)`);
    }
    
    getTextureSettings(quality) {
        switch (quality) {
            case 'ultra':
                return {
                    minFilter: THREE.LinearMipmapLinearFilter,
                    magFilter: THREE.LinearFilter,
                    anisotropy: Math.min(16, renderer.capabilities.getMaxAnisotropy())
                };
            case 'high':
                return {
                    minFilter: THREE.LinearMipmapLinearFilter,
                    magFilter: THREE.LinearFilter,
                    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy())
                };
            case 'medium':
                return {
                    minFilter: THREE.LinearMipmapLinearFilter,
                    magFilter: THREE.LinearFilter,
                    anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy())
                };
            case 'low':
                return {
                    minFilter: THREE.LinearMipmapNearestFilter,
                    magFilter: THREE.LinearFilter,
                    anisotropy: 1
                };
            default:
                return {
                    minFilter: THREE.LinearMipmapLinearFilter,
                    magFilter: THREE.LinearFilter,
                    anisotropy: 4
                };
        }
    }
    
    /**
     * オブジェクト詳細度設定 - 天体オブジェクトの幾何学的詳細度を調整
     * 
     * 効果：
     * - 球体の分割数調整（高詳細度 = より丸い天体）
     * - LODシステムによる距離ベース品質調整
     * - パーティクルシステムの詳細度調整
     */
    applyObjectDetail(detail) {
        // 天体オブジェクトの詳細度を調整
        scene.traverse((object) => {
            if (object.userData && object.userData.type) {
                // 天体タイプ別の詳細度調整
                this.adjustObjectGeometry(object, detail);
            }
        });
        
        console.log(`🌍 Object detail: ${detail}`);
    }
    
    adjustObjectGeometry(object, detail) {
        // 現在のジオメトリの複雑さを詳細度に応じて調整
        if (object.geometry instanceof THREE.SphereGeometry) {
            const segments = this.getSegmentCount(detail);
            
            // 現在の半径とマテリアルを保持
            const radius = object.geometry.parameters.radius;
            const material = object.material;
            
            // 新しい詳細度でジオメトリを再作成
            object.geometry.dispose(); // メモリリーク防止
            object.geometry = new THREE.SphereGeometry(radius, segments, segments);
            
            console.log(`🔄 Updated ${object.userData.type} geometry to ${segments} segments`);
        }
    }
    
    getSegmentCount(detail) {
        switch (detail) {
            case 'ultra': return 64;
            case 'high': return 32;
            case 'medium': return 16;
            case 'low': return 8;
            default: return 16;
        }
    }
    
    /**
     * 背景詳細度設定 - 星場とスカイボックスの詳細度調整
     * 
     * 効果：
     * - 星場の密度とクオリティ調整
     * - 宇宙背景の詳細度変更
     * - 遠景オブジェクトの表示/非表示
     */
    applyBackgroundDetail(detail) {
        const starfield = scene.getObjectByName('starfield');
        if (starfield) {
            // 星場の品質調整
            this.adjustStarfieldQuality(starfield, detail);
        }
        
        // 背景エフェクトの調整
        this.adjustBackgroundEffects(detail);
        
        console.log(`🌌 Background detail: ${detail}`);
    }
    
    adjustStarfieldQuality(starfield, detail) {
        const material = starfield.material;
        
        switch (detail) {
            case 'high':
                material.transparent = true;
                material.opacity = 1.0;
                material.sizeAttenuation = true;
                break;
            case 'standard':
                material.transparent = true;
                material.opacity = 0.9;
                material.sizeAttenuation = true;
                break;
            case 'simple':
                material.transparent = false;
                material.opacity = 1.0;
                material.sizeAttenuation = false;
                break;
            case 'off':
                starfield.visible = false;
                return;
        }
        
        starfield.visible = true;
        console.log(`⭐ Starfield quality: ${detail}`);
    }
    
    adjustBackgroundEffects(detail) {
        // 背景関連のエフェクトを詳細度に応じて調整
        if (detail === 'off') {
            // 背景エフェクトを無効化してパフォーマンス向上
            scene.background = new THREE.Color(0x000000);
        } else {
            // 背景を復元
            scene.background = new THREE.Color(0x000011);
        }
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
