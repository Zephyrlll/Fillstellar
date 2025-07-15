import * as THREE from 'three';
import { scene, camera, composer, controls } from './js/threeSetup.js';
import { gameState } from './js/state.js';
import { loadGame } from './js/saveload.js';
import { updateUI, debouncedUpdateGalaxyMap, ui } from './js/ui.js';
import { createCelestialBody, checkLifeSpawn, evolveLife } from './js/celestialBody.js';
import { spatialGrid, updatePhysics } from './js/physics.js';
import { updateStatistics } from './js/statistics.js';
import { mathCache } from './js/utils.js';
import { setupEventListeners, keys } from './js/events.js';
import { soundManager } from './js/sound.js';
import { createWebSocketClient } from './js/websocket.js';
import { conversionEngine } from './js/conversionEngine.js';
import { initProductionUI, updateProductionUI } from './js/productionUI.js';
import { resourceParticleSystem } from './js/resourceParticles.js';
import { productionChainUI } from './js/productionChainUI.js';
// @ts-ignore
import { catalystManager, CatalystType } from './dist/js/catalystSystem.js';
// @ts-ignore
import { currencyManager } from './dist/js/currencySystem.js';
// Graphics system imports
import { performanceMonitor } from './js/performanceMonitor.js';
import { graphicsEngine } from './js/graphicsEngine.js';
import { updatePerformanceDisplay } from './js/ui.js';
import { setupDeviceDetection, isMobileDevice, startMobileNavUpdates, startMobileGameUpdates, startMobileSettingsUpdates, startMobileStarManagementUpdates } from './js/deviceDetection.js';

// Make graphicsEngine available globally
window.graphicsEngine = graphicsEngine;
console.log('🔧 Graphics engine loaded:', graphicsEngine);
console.log('🔧 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(graphicsEngine)));

// Camera fix debugging
console.log('🚀 MAIN.JS CAMERA FIX v2024-07-13 LOADED!');
if (window.cameraFixDebug) {
    console.log('🔍 Camera fix debug mode enabled');
}

// グローバルにgraphicsEngineを公開（saveload.jsで同期実行するため）
window.graphicsEngine = graphicsEngine;
console.log('✅ graphicsEngine exposed globally for synchronous access');

// デバッグ用の解像度テスト機能を追加
let resolutionTestObject = null;
function createResolutionTestObject() {
    if (resolutionTestObject) {
        scene.remove(resolutionTestObject);
    }
    
    // 詳細なテクスチャパターンを持つテストオブジェクト
    const geometry = new THREE.PlaneGeometry(2000, 2000);
    
    // チェッカーボードパターンのcanvasテクスチャを作成
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // 高精細なパターンを描画
    for (let i = 0; i < 32; i++) {
        for (let j = 0; j < 32; j++) {
            ctx.fillStyle = ((i + j) % 2) ? '#ffffff' : '#000000';
            ctx.fillRect(i * 16, j * 16, 16, 16);
        }
    }
    
    // 解像度テスト用の細かいラインを追加（より細かく）
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
    }
    
    // 垂直ラインも追加
    for (let i = 0; i < 512; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
    }
    
    // 中央に解像度テスト用のテキストを追加
    ctx.fillStyle = '#00ff00';
    ctx.font = '24px monospace';
    ctx.fillText('RESOLUTION TEST', 150, 256);
    ctx.font = '16px monospace';
    ctx.fillText('Look for aliasing differences', 120, 280);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.8
    });
    
    resolutionTestObject = new THREE.Mesh(geometry, material);
    resolutionTestObject.position.set(0, 0, -100);
    resolutionTestObject.name = 'resolutionTest';
    scene.add(resolutionTestObject);
    
    console.log('🧪 Resolution test object created - change resolution scale to see the difference!');
}

// デバッグ機能をグローバルに公開
window.createResolutionTestObject = createResolutionTestObject;
window.removeResolutionTestObject = () => {
    if (resolutionTestObject) {
        scene.remove(resolutionTestObject);
        resolutionTestObject = null;
        console.log('🧪 Resolution test object removed');
    }
};

// 🔍 星屑サイズ確認用デバッグ機能（init後に定義）

// デバッグ: 1秒後のリセット問題テスト用
window.testInitializationBug = () => {
    console.log('🧪 Testing 1-second initialization reset bug...');
    console.log('Setting 50% scale...');
    gameState.graphics.resolutionScale = 0.5;
    graphicsEngine.applyResolutionScale(0.5);
    console.log('Wait 2 seconds to see if it gets reset by saveload...');
};
const moveSpeed = 200;
let uiUpdateTimer = 0;
const uiUpdateInterval = 0.1;
let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2;
// WebSocketクライアント
let wsClient = null;
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 3.2, // Base size for 100% scale (will be adjusted by resolution)
        sizeAttenuation: true, // 距離による自然なサイズ変化を維持
        transparent: true,
        alphaTest: 0.1, // Higher threshold to reduce flickering at 300% resolution
        opacity: 1.0, // Full opacity for maximum stability
        depthWrite: false, // Prevent depth conflicts
        blending: THREE.NormalBlending // More stable blending for high resolution
    });
    
    const starsVertices = [];
    const starColors = [];
    const starSizes = [];
    
    // Create multiple layers of stars at different distances
    const layers = [
        { count: 1000, distance: 15000, sizeMult: 1.4 },     // Few closer bright stars
        { count: 3000, distance: 30000, sizeMult: 1.0 },     // Mid-distance stars
        { count: 8000, distance: 60000, sizeMult: 0.8 },     // Far background stars (within view distance)
        { count: 15000, distance: 25000, sizeMult: 0.6 }     // Background stars (adjusted to be within view range)
    ];
    
    layers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            // Use spherical distribution instead of cubic
            const phi = Math.random() * Math.PI * 2; // Azimuth angle
            const cosTheta = Math.random() * 2 - 1;  // Uniform distribution on sphere
            const theta = Math.acos(cosTheta);       // Polar angle
            const radius = layer.distance * (0.8 + Math.random() * 0.4); // Vary distance slightly
            
            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(theta);
            
            starsVertices.push(x, y, z);
            
            // Add subtle color variation (blue to yellow-white) with more realism
            const temp = Math.random(); // Temperature factor 0-1
            let r, g, b;
            
            if (temp < 0.1) {
                // Blue giants (rare, very bright)
                r = 0.7; g = 0.8; b = 1.0;
            } else if (temp < 0.3) {
                // Blue-white stars
                r = 0.8; g = 0.9; b = 1.0;
            } else if (temp < 0.7) {
                // White/yellow-white stars (most common)
                r = 1.0; g = 0.95; b = 0.9;
            } else if (temp < 0.9) {
                // Yellow stars
                r = 1.0; g = 0.9; b = 0.7;
            } else {
                // Red stars (dim but common)
                r = 1.0; g = 0.7; b = 0.5;
            }
            
            // Adjust brightness based on distance
            const brightness = layer.distance > 80000 ? 0.6 : (layer.distance > 40000 ? 0.8 : 1.0);
            starColors.push(r * brightness, g * brightness, b * brightness);
            
            // More realistic size distribution (most stars are tiny)
            let sizeVariation;
            if (Math.random() < 0.85) {
                // 85% tiny stars
                sizeVariation = 0.3 + Math.random() * 0.4;
            } else if (Math.random() < 0.95) {
                // 10% medium stars  
                sizeVariation = 0.7 + Math.random() * 0.6;
            } else {
                // 5% bright stars
                sizeVariation = 1.2 + Math.random() * 0.8;
            }
            
            starSizes.push(layer.sizeMult * sizeVariation);
        }
    });
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    // Enable vertex colors
    starsMaterial.vertexColors = true;
    
    // Make starfield immune to fog effects (it's the background)
    starsMaterial.fog = false;
    
    const starfield = new THREE.Points(starsGeometry, starsMaterial);
    starfield.name = 'starfield'; // Add name for easy reference
    
    // 🔧 描画距離設定の影響を受けないよう最背景に設定
    starfield.renderOrder = -1000; // 最背景として描画
    starfield.frustumCulled = false; // フラスタムカリングを無効化
    
    // Store initial settings
    starfield.userData = {
        originalPositions: null, // Will be set by graphics engine
        isStarfield: true
    };
    
    scene.add(starfield);
    
    console.log(`🌟 Created starfield with ${starsVertices.length / 3} stars in spherical distribution`);
    console.log(`🌟 Initial star material size: ${starsMaterial.size}`);
    
    // デバッグ: 5秒後に星屑の状態をチェック
    setTimeout(() => {
        const starfield = scene.getObjectByName('starfield');
        if (starfield && starfield.material) {
            console.log(`🔍 Star debug after 5s: size=${starfield.material.size}, resolution=${gameState?.graphics?.resolutionScale || 'unknown'}`);
        }
    }, 5000);
}

// Update starfield scale based on camera position for better immersion
function updateStarfieldScale() {
    const starfield = scene.getObjectByName('starfield');
    if (!starfield) return;
    
    // Calculate camera distance from origin
    const cameraDistance = camera.position.length();
    
    // Adjust starfield scale to maintain consistent appearance
    // When camera moves far from center, scale up the starfield slightly
    const baseScale = 1.0;
    const scaleMultiplier = Math.max(1.0, Math.log10(cameraDistance / 1000 + 1));
    const targetScale = baseScale * scaleMultiplier;
    
    // Smoothly interpolate to new scale
    starfield.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.01);
    
    // 🔧 星屑サイズは解像度に関係なく一定に保つ
    // （解像度スケール連動機能を削除）
}
function animate() {
    // Update performance monitor first
    performanceMonitor.update();
    
    // Frame rate limiting (simplified approach)
    // Note: Advanced frame rate limiting temporarily disabled for stability
    // Will be re-enabled when FrameRateLimiter is properly integrated
    
    // Schedule the next frame
    requestAnimationFrame(animate);
    const now = Date.now();
    const rawDeltaTime = (now - gameState.lastTick) / 1000;
    if (!isFinite(rawDeltaTime) || rawDeltaTime < 0 || rawDeltaTime > 1) {
        gameState.lastTick = now;
        return;
    }
    let timeMultiplier = 1;
    if (gameState.currentTimeMultiplier && typeof gameState.currentTimeMultiplier === 'string') {
        const multiplierValue = parseInt(gameState.currentTimeMultiplier.replace('x', ''));
        if (isFinite(multiplierValue) && multiplierValue > 0 && multiplierValue <= 10) {
            timeMultiplier = multiplierValue;
        }
    }
    const deltaTime = rawDeltaTime * timeMultiplier;
    const animationDeltaTime = deltaTime * 0.05;
    if (!isFinite(animationDeltaTime) || animationDeltaTime <= 0) {
        console.warn('Invalid animationDeltaTime:', { rawDeltaTime, timeMultiplier, deltaTime, animationDeltaTime, currentTimeMultiplier: gameState.currentTimeMultiplier });
        gameState.lastTick = now;
        return;
    }
    gameState.lastTick = now;
    gameState.gameYear += deltaTime / 5;
    updatePhysics(animationDeltaTime);
    let totalVelocity = 0;
    let movingBodies = 0;
    gameState.stars.forEach(body => {
        if (body.userData && body.userData.velocity && !body.userData.isStatic) {
            const speed = body.userData.velocity.length();
            if (speed > 0) {
                totalVelocity += speed;
                movingBodies++;
            }
        }
    });
    if (movingBodies > 0) {
        const averageVelocity = totalVelocity / movingBodies;
        gameState.cosmicActivity = averageVelocity * Math.sqrt(movingBodies) * 0.01;
    }
    else {
        gameState.cosmicActivity = 0;
    }
    let dustRate = 1 + gameState.dustUpgradeLevel * 0.5 + (gameState.researchEnhancedDust ? 2 : 0);
    let energyRate = 0;
    let intelligentLifeCount = 0;
    let totalPopulation = 0;
    spatialGrid.clear();
    gameState.stars.forEach(body => {
        spatialGrid.insert(body);
        body.rotation.y += 0.3 * animationDeltaTime;
        if (body.userData.type === 'planet') {
            if (body.userData.hasLife) {
                totalPopulation += body.userData.population || 0;
            }
        }
        switch (body.userData.type) {
            case 'star':
                energyRate += body.userData.mass / 1000;
                break;
            case 'asteroid':
            case 'comet':
                dustRate += 0.5;
                break;
            case 'planet':
                checkLifeSpawn(body);
                evolveLife(body);
                if (body.userData.hasLife) {
                    let organicRate = 0, biomassRate = 0, populationGrowthRate = 0;
                    switch (body.userData.lifeStage) {
                        case 'microbial':
                            organicRate = 0.1;
                            populationGrowthRate = 0.01;
                            break;
                        case 'plant':
                            organicRate = 0.5;
                            biomassRate = 0.1;
                            populationGrowthRate = 0.05;
                            break;
                        case 'animal':
                            organicRate = 0.8;
                            biomassRate = 0.3;
                            populationGrowthRate = 0.1;
                            break;
                        case 'intelligent':
                            organicRate = 1.0;
                            biomassRate = 0.5;
                            populationGrowthRate = 0.5;
                            intelligentLifeCount++;
                            let thoughtPointRate = ((body.userData.population || 0) / 1000000) * (1 + gameState.cosmicActivity / 10000);
                            gameState.thoughtPoints += thoughtPointRate * deltaTime;
                            gameState.resources.thoughtPoints += thoughtPointRate * deltaTime;
                            break;
                    }
                    gameState.organicMatter += organicRate * deltaTime;
                    gameState.resources.organicMatter += organicRate * deltaTime;
                    gameState.biomass += biomassRate * deltaTime;
                    gameState.resources.biomass += biomassRate * deltaTime;
                    body.userData.population = (body.userData.population || 0) + (body.userData.population || 0) * populationGrowthRate * deltaTime;
                }
                break;
        }
    });
    gameState.cachedTotalPopulation = totalPopulation;
    if (gameState.researchAdvancedEnergy)
        energyRate *= 2;
    gameState.currentDustRate = dustRate;
    gameState.thoughtSpeedMps = mathCache.getThoughtSpeed();
    gameState.resourceAccumulators.cosmicDust += dustRate * deltaTime;
    gameState.resourceAccumulators.energy += energyRate * deltaTime;
    if (gameState.resourceAccumulators.cosmicDust >= 1) {
        const dustToAdd = Math.floor(gameState.resourceAccumulators.cosmicDust);
        gameState.cosmicDust += dustToAdd;
        gameState.resources.cosmicDust += dustToAdd;
        gameState.resourceAccumulators.cosmicDust -= dustToAdd;
    }
    if (gameState.resourceAccumulators.energy >= 1) {
        const energyToAdd = Math.floor(gameState.resourceAccumulators.energy);
        gameState.energy += energyToAdd;
        gameState.resources.energy += energyToAdd;
        gameState.resourceAccumulators.energy -= energyToAdd;
    }
    // Update conversion engine
    conversionEngine.update();
    // Update resource particle effects
    resourceParticleSystem.update(deltaTime);
    // WASD移動を無効化（OrbitControlsとの競合を防ぐため）
    // if (keys.w)
    //     camera.position.z -= moveSpeed * animationDeltaTime;
    // if (keys.s)
    //     camera.position.z += moveSpeed * animationDeltaTime;
    // if (keys.a)
    //     camera.position.x -= moveSpeed * animationDeltaTime;
    // if (keys.d)
    //     camera.position.x += moveSpeed * animationDeltaTime;
    if (gameState.focusedObject) {
        const targetPosition = gameState.focusedObject.position.clone();
        
        // フォーカス対象への滑らかな移動のみ（距離調整は行わない）
        controls.target.lerp(targetPosition, 0.05);
    }
    const edgeGlow = scene.getObjectByName('black_hole_edge_glow');
    if (edgeGlow) {
        edgeGlow.lookAt(camera.position);
    }
    controls.update();
    // サウンドリスナーの位置を更新
    soundManager.updateListenerPosition(camera.position, {
        x: camera.getWorldDirection(new THREE.Vector3()).x,
        y: camera.getWorldDirection(new THREE.Vector3()).y,
        z: camera.getWorldDirection(new THREE.Vector3()).z
    });
    // Update graphics engine for setting changes
    graphicsEngine.update();
    
    // Update starfield based on camera distance for better immersion
    updateStarfieldScale();
    composer.render();
    uiUpdateTimer += deltaTime;
    if (uiUpdateTimer >= uiUpdateInterval) {
        updateUI();
        updateProductionUI();
        // Update graphics performance display
        updatePerformanceDisplay();
        // Update production chain UI if visible
        if (productionChainUI) {
            productionChainUI.refresh();
        }
        uiUpdateTimer = 0;
    }
    updateStatistics();
    galaxyMapUpdateTimer += deltaTime;
    if (galaxyMapUpdateTimer >= galaxyMapUpdateInterval) {
        debouncedUpdateGalaxyMap();
        galaxyMapUpdateTimer = 0;
    }
}
function init() {
    // Setup device detection system
    setupDeviceDetection();
    
    // Start mobile navigation updates
    startMobileNavUpdates();
    
    // Start mobile game updates
    startMobileGameUpdates();
    
    // Start mobile settings updates
    startMobileSettingsUpdates();
    
    // Start mobile star management updates
    startMobileStarManagementUpdates();
    
    createStarfield();
    loadGame();
    
    // Initialize production UI
    initProductionUI();
    // Initialize production chain UI (create UI elements)
    productionChainUI.createUI();
    // Initialize catalyst system with some starter catalysts for testing
    // @ts-ignore
    if (!gameState.catalystSystemInitialized) {
        // Add required technologies for catalyst system
        gameState.discoveredTechnologies.add('advanced_processing');
        gameState.discoveredTechnologies.add('quantum_manipulation');
        catalystManager.addCatalyst(CatalystType.EFFICIENCY_BOOSTER, 2);
        catalystManager.addCatalyst(CatalystType.SPEED_ACCELERATOR, 1);
        // @ts-ignore
        gameState.catalystSystemInitialized = true;
    }
    // Initialize currency system
    currencyManager.initializeCurrencies();
    // Debug: Check UI elements
    console.log('🔧 Checking UI elements after initialization...');
    console.log('🔧 overlayResourceSellButton:', ui.overlayResourceSellButton);
    console.log('🔧 All UI keys with overlay:', Object.keys(ui).filter(key => key.includes('overlay')));
    const blackHoleExists = gameState.stars.some(star => star.userData.type === 'black_hole');
    if (!blackHoleExists) {
        const blackHole = createCelestialBody('black_hole', {
            name: 'Galactic Center',
            mass: 10000000,
            radius: 500,
            position: new THREE.Vector3(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0)
        });
        gameState.stars.push(blackHole);
        scene.add(blackHole);
    }
    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    if (blackHole) {
        // グラフィックエンジンの初期化（カメラリセットは不要、解像度スケールのみ適用）
        console.log('📹 Initializing graphics engine for black hole focus');
        
        // 解像度スケールの適用（カメラリセットの代わり）
        if (window.graphicsEngine && window.graphicsEngine.applyResolutionScale) {
            window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
        } else if (graphicsEngine && graphicsEngine.applyResolutionScale) {
            graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
        }
        
        console.log('📹 Camera positioned BEFORE setting focused object:', {
            cameraPos: camera.position.clone(),
            controlsTarget: controls.target.clone()
        });
        
        // その後でフォーカスオブジェクトを設定（animate内の処理で位置が変わらないように）
        gameState.focusedObject = blackHole;
        console.log('🎯 Camera initialized: focusing on black hole at center (camera will not move)');
        console.log('🔍 Black hole position:', blackHole.position.clone());
    }
    // サウンドシステムの初期化（ユーザーインタラクション後）
    const initSound = async () => {
        await soundManager.init();
        // カメラ位置に基づいてリスナー位置を更新
        soundManager.updateListenerPosition(camera.position, {
            x: 0, y: 0, z: -1 // カメラの向き
        });
    };
    // 最初のクリックでサウンドを初期化
    document.addEventListener('click', initSound, { once: true });
    document.addEventListener('keydown', initSound, { once: true });
    // Ensure DOM is fully loaded before setting up event listeners
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🔧 DOM loaded, setting up event listeners...');
            setupEventListeners();
        });
    }
    else {
        console.log('🔧 DOM already loaded, setting up event listeners now...');
        setupEventListeners();
    }
    // WebSocket接続の初期化
    wsClient = createWebSocketClient();
    // WebSocketイベントハンドラー
    wsClient.on('connected', () => {
        console.log('バックエンドに接続しました');
        wsClient.getGameState(); // 接続後に状態を取得
        wsClient.setGameRunning(true); // ゲームループを開始
    });
    wsClient.on('gameState', (data) => {
        console.log('ゲーム状態更新:', data);
        // リソースを更新
        if (data.resources) {
            gameState.resources = data.resources;
        }
        // 天体情報を更新（必要に応じて）
        if (data.bodies) {
            console.log('天体数:', data.bodies.length);
        }
        // UIを更新
        updateUI();
    });
    wsClient.on('bodyCreated', (data) => {
        console.log('天体作成:', data);
        if (data.success) {
            console.log('天体作成成功:', data.bodyId);
        }
        else {
            console.error('天体作成失敗:', data.error);
        }
    });
    wsClient.on('serverError', (data) => {
        console.error('サーバーエラー:', data.message);
    });
    wsClient.on('disconnected', () => {
        console.log('バックエンドから切断されました');
    });
    // 🔧 リサイズイベントリスナーを追加（解像度設定を再適用）
    window.addEventListener('resize', () => {
        if (gameState.graphics && window.graphicsEngine) {
            console.log('🔧 Window resized, re-applying resolution scale:', gameState.graphics.resolutionScale);
            window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
        }
    });
    
    // 接続を開始
    wsClient.connect();
    // 🔧 WORKAROUND: 解像度設定バグ対策（デバイス検出システム使用）
    setTimeout(() => {
        if (isMobileDevice()) {
            console.log('🔧 Mobile device detected, using gentle resize approach');
            // モバイル向けの軽量な解像度調整
            if (window.graphicsEngine && gameState.graphics) {
                window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
                setTimeout(() => {
                    if (typeof window.graphicsEngine.forceResolutionUpdate === 'function') {
                        window.graphicsEngine.forceResolutionUpdate();
                    } else if (typeof window.graphicsEngine.applyResolutionScale === 'function') {
                        window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
                    }
                }, 500);
            }
        } else {
            console.log('🔧 Desktop device detected, using moderate resize workaround');
            // デスクトップ向けの適度な解像度調整
            let resizeWorkaroundCount = 0;
            const resizeWorkaroundInterval = setInterval(() => {
                resizeWorkaroundCount++;
                
                if (window.graphicsEngine && gameState.graphics) {
                    window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
                }
                
                // 5回で停止（さらに削減）
                if (resizeWorkaroundCount >= 5) {
                    clearInterval(resizeWorkaroundInterval);
                    console.log(`🔧 Moderate resize workaround completed (${resizeWorkaroundCount} times)`);
                    
                    if (window.graphicsEngine) {
                        if (typeof window.graphicsEngine.forceResolutionUpdate === 'function') {
                            window.graphicsEngine.forceResolutionUpdate();
                        } else if (typeof window.graphicsEngine.applyResolutionScale === 'function') {
                            window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
                        }
                    }
                }
            }, 200); // 200msごと（さらに緩和）
        }
    }, 1000); // 1秒後に開始（短縮）

    animate();
    
    // 🔧 追加の解像度バグ対策：1.4-2秒の範囲で段階的に解像度を再適用
    setTimeout(() => {
        if (window.graphicsEngine && gameState.graphics) {
            console.log('🔧 1.5秒後の解像度再適用:', gameState.graphics.resolutionScale);
            window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
        }
    }, 1500);
    
    setTimeout(() => {
        if (window.graphicsEngine && gameState.graphics) {
            console.log('🔧 1.7秒後の解像度再適用:', gameState.graphics.resolutionScale);
            window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
        }
    }, 1700);
    
    setTimeout(() => {
        if (window.graphicsEngine && gameState.graphics) {
            console.log('🔧 1.9秒後の解像度再適用:', gameState.graphics.resolutionScale);
            window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
        }
    }, 1900);
    
    setTimeout(() => {
        if (window.graphicsEngine && gameState.graphics) {
            console.log('🔧 2.1秒後の最終解像度再適用:', gameState.graphics.resolutionScale);
            if (typeof window.graphicsEngine.forceResolutionUpdate === 'function') {
                window.graphicsEngine.forceResolutionUpdate();
            } else if (typeof window.graphicsEngine.applyResolutionScale === 'function') {
                window.graphicsEngine.applyResolutionScale(gameState.graphics.resolutionScale);
            }
        }
    }, 2100);
    
    // 🔧 3段階フェード処理：ロード画面 → ブラックアウト → ゲーム開始
    setTimeout(() => {
        const fadeOverlay = document.getElementById('fade-overlay');
        if (fadeOverlay) {
            console.log('🌟 Phase 1: Starting blackout transition (hiding loading content)');
            fadeOverlay.classList.add('blackout');
            
            // ブラックアウト後、1秒待ってからゲーム画面をフェードイン
            setTimeout(() => {
                console.log('🌟 Phase 2: Starting game fade-in');
                fadeOverlay.classList.add('fade-out');
                
                // フェードアウト完了後にDOM要素を削除
                setTimeout(() => {
                    if (fadeOverlay.parentNode) {
                        fadeOverlay.parentNode.removeChild(fadeOverlay);
                        console.log('🌟 Phase 3: Game fully loaded - fade overlay removed');
                    }
                }, 1500); // CSSトランジション時間と同期
            }, 1000); // 1秒間のブラックアウト
        }
    }, 3000); // 3.0秒後にブラックアウト開始
    
    // Debug timer to catch the 1-second camera bug
    if (window.cameraFixDebug) {
        let debugInterval = 0;
        const cameraDebugTimer = setInterval(() => {
            debugInterval++;
            const pos = camera.position.clone();
            const target = controls.target.clone();
            console.log(`🕐 Camera debug ${debugInterval}s:`, {
                position: { x: pos.x.toFixed(1), y: pos.y.toFixed(1), z: pos.z.toFixed(1) },
                target: { x: target.x.toFixed(1), y: target.y.toFixed(1), z: target.z.toFixed(1) },
                focusedObject: gameState.focusedObject ? gameState.focusedObject.userData.type : 'none'
            });
            
            // Stop after 5 seconds
            if (debugInterval >= 5) {
                clearInterval(cameraDebugTimer);
                console.log('🏁 Camera debug timer stopped');
            }
        }, 1000);
    }
    
    // 🔍 星屑サイズ確認用デバッグ機能
    window.checkStarfieldSize = () => {
        const starfield = scene.getObjectByName('starfield');
        if (starfield && starfield.material) {
            const currentScale = gameState?.graphics?.resolutionScale || 1.0;
            console.log(`${Math.round(currentScale * 100)}% → Size: ${starfield.material.size} (Expected: ${(currentScale * 3.2).toFixed(1)})`);
        } else {
            console.log('Starfield not found');
        }
    };
    
    console.log('🔍 Debug function ready: checkStarfieldSize()');
}
init();
