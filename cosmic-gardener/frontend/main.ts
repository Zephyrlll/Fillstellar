
import * as THREE from 'three';
import { scene, camera, renderer, composer, controls } from './js/threeSetup.js';
import { gameState, PlanetUserData } from './js/state.js';
import { saveGame, loadGame } from './js/saveload.js';
import { updateUI, debouncedUpdateGalaxyMap, ui } from './js/ui.js';
import { createCelestialBody, checkLifeSpawn, evolveLife } from './js/celestialBody.js';
import { spatialGrid, updatePhysics } from './js/physics.js';
import { updateStatistics } from './js/statistics.js';
import { GALAXY_BOUNDARY } from './js/constants.js';
import { mathCache } from './js/utils.js';
import { setupEventListeners, keys } from './js/events.js';
import { soundManager } from './js/sound.js';
import { createWebSocketClient } from './js/websocket.js';
import { conversionEngine } from './js/conversionEngine.js';
import { resourceFlowDisplay } from './js/resourceFlowDisplay.js';
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

// Expose graphicsEngine globally for synchronous access from saveload.ts
(window as any).graphicsEngine = graphicsEngine;

const moveSpeed = 200;

let uiUpdateTimer = 0;
const uiUpdateInterval = 0.1;

let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2;

// WebSocketクライアント
let wsClient: any = null;

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.8, // Base size - will be adjusted by graphics engine
        sizeAttenuation: true, // Let distance affect size for depth perception
        transparent: true,
        alphaTest: 0.1, // Higher threshold to reduce flickering at 300% resolution
        opacity: 1.0, // Full opacity for maximum stability
        depthWrite: false, // Prevent depth conflicts
        blending: THREE.NormalBlending // More stable blending for high resolution
    });
    const starsVertices = [];
    for (let i = 0; i < 8000; i++) {
        const x = (Math.random() - 0.5) * 20000;
        const y = (Math.random() - 0.5) * 20000;
        const z = (Math.random() - 0.5) * 20000;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
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
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update performance monitor
    performanceMonitor.update();
    
    // Check frame rate limiter - skip rendering if limited
    if (!graphicsEngine.getFrameRateLimiter().shouldRender()) {
        return;
    }
    
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
            const speed = (body.userData.velocity as THREE.Vector3).length();
            if (speed > 0) {
                totalVelocity += speed;
                movingBodies++;
            }
        }
    });
    
    if (movingBodies > 0) {
        const averageVelocity = totalVelocity / movingBodies;
        gameState.cosmicActivity = averageVelocity * Math.sqrt(movingBodies) * 0.01;
    } else {
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
            if ((body.userData as PlanetUserData).hasLife) {
                totalPopulation += (body.userData as PlanetUserData).population || 0;
            }
        }

        switch (body.userData.type) {
            case 'star':
                energyRate += (body.userData.mass as number) / 1000;
                break;
            case 'asteroid':
            case 'comet':
                dustRate += 0.5;
                break;
            case 'planet':
                checkLifeSpawn(body);
                evolveLife(body);
                if ((body.userData as PlanetUserData).hasLife) {
                    let organicRate = 0, biomassRate = 0, populationGrowthRate = 0;
                    switch ((body.userData as PlanetUserData).lifeStage) {
                        case 'microbial':
                            organicRate = 0.1; populationGrowthRate = 0.01; break;
                        case 'plant':
                            organicRate = 0.5; biomassRate = 0.1; populationGrowthRate = 0.05; break;
                        case 'animal':
                            organicRate = 0.8; biomassRate = 0.3; populationGrowthRate = 0.1; break;
                        case 'intelligent':
                            organicRate = 1.0; biomassRate = 0.5; populationGrowthRate = 0.5;
                            intelligentLifeCount++;
                            let thoughtPointRate = (((body.userData as PlanetUserData).population || 0) / 1000000) * (1 + gameState.cosmicActivity / 10000);
                            gameState.thoughtPoints += thoughtPointRate * deltaTime;
                            gameState.resources.thoughtPoints += thoughtPointRate * deltaTime;
                            break;
                    }
                    gameState.organicMatter += organicRate * deltaTime;
                    gameState.resources.organicMatter += organicRate * deltaTime;
                    gameState.biomass += biomassRate * deltaTime;
                    gameState.resources.biomass += biomassRate * deltaTime;
                    (body.userData as PlanetUserData).population = ((body.userData as PlanetUserData).population || 0) + ((body.userData as PlanetUserData).population || 0) * populationGrowthRate * deltaTime;
                }
                break;
        }
    });
    
    gameState.cachedTotalPopulation = totalPopulation;

    if (gameState.researchAdvancedEnergy) energyRate *= 2;
    
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

    if (keys.w) camera.position.z -= moveSpeed * animationDeltaTime;
    if (keys.s) camera.position.z += moveSpeed * animationDeltaTime;
    if (keys.a) camera.position.x -= moveSpeed * animationDeltaTime;
    if (keys.d) camera.position.x += moveSpeed * animationDeltaTime;

    if (gameState.focusedObject) {
        const offset = camera.position.clone().sub(controls.target);
        controls.target.lerp(gameState.focusedObject.position, 0.05);
        camera.position.copy(controls.target).add(offset);
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
        gameState.focusedObject = blackHole;
    }

    // サウンドシステムの初期化（ユーザーインタラクション後）
    const initSound = async () => {
        await soundManager.init();
        // カメラ位置に基づいてリスナー位置を更新
        soundManager.updateListenerPosition(camera.position, {
            x: 0, y: 0, z: -1  // カメラの向き
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
    } else {
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
    
    wsClient.on('gameState', (data: any) => {
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
    
    wsClient.on('bodyCreated', (data: any) => {
        console.log('天体作成:', data);
        if (data.success) {
            console.log('天体作成成功:', data.bodyId);
        } else {
            console.error('天体作成失敗:', data.error);
        }
    });
    
    wsClient.on('serverError', (data: any) => {
        console.error('サーバーエラー:', data.message);
    });
    
    wsClient.on('disconnected', () => {
        console.log('バックエンドから切断されました');
    });
    
    // 接続を開始
    wsClient.connect();
    
    animate();
}

init();
