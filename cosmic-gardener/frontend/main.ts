
import * as THREE from 'three';
import { scene, camera, renderer, composer, controls } from './js/threeSetup.ts';
import { gameState, gameStateManager, PlanetUserData } from './js/state.ts';
import { saveGame, loadGame } from './js/saveload.ts';
import { updateUI, debouncedUpdateGalaxyMap, ui } from './js/ui.ts';
import { createCelestialBody, checkLifeSpawn, evolveLife } from './js/celestialBody.ts';
import { spatialGrid, updatePhysics } from './js/physics.ts';
import { updateStatistics } from './js/statistics.ts';
import { GALAXY_BOUNDARY } from './js/constants.ts';
import { mathCache } from './js/utils.ts';
import { setupEventListeners, keys } from './js/events.ts';
import { soundManager } from './js/sound.ts';
import { createWebSocketClient } from './js/websocket.ts';
import { conversionEngine } from './js/conversionEngine.ts';
import { resourceFlowDisplay } from './js/resourceFlowDisplay.ts';
import { initProductionUI, updateProductionUI } from './js/productionUI.ts';
import { resourceParticleSystem } from './js/resourceParticles.ts';
import { productionChainUI } from './js/productionChainUI.ts';
import { setupDeviceDetection } from './js/deviceDetection.ts';
// @ts-ignore
import { catalystManager, CatalystType } from './js/catalystSystem.ts';
// @ts-ignore
import { currencyManager } from './js/currencySystem.ts';
// Graphics system imports
import { performanceMonitor } from './js/performanceMonitor.ts';
import { graphicsEngine } from './js/graphicsEngine.ts';
import { updatePerformanceDisplay } from './js/ui.ts';
// Research Lab UI
import { initializeResearchLab } from './js/researchLab.ts';
// Physics config
import { physicsConfig } from './js/physicsConfig.ts';
// Debug physics
import './js/debugPhysics.ts';
// Orbit trails
import { orbitTrailSystem } from './js/orbitTrails.ts';
// Background galaxies
import { backgroundGalaxies } from './js/backgroundGalaxies.ts';

// Expose graphicsEngine globally for synchronous access from saveload.ts and debugging
(window as any).graphicsEngine = graphicsEngine;
console.log('🎮 Graphics engine exposed to window:', (window as any).graphicsEngine);

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
    const galaxySize = GALAXY_BOUNDARY * 2; // 全宇宙範囲をカバー
    for (let i = 0; i < 8000; i++) {
        const x = (Math.random() - 0.5) * galaxySize;
        const y = (Math.random() - 0.5) * galaxySize;
        const z = (Math.random() - 0.5) * galaxySize;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starfield = new THREE.Points(starsGeometry, starsMaterial);
    starfield.name = 'starfield'; // Add name for easy reference
    
    // 🔧 描画距離設定の影響を受けないよう最背景に設定
    starfield.renderOrder = -1000; // 最背景として描画
    starfield.frustumCulled = false; // フラスタムカリングを無効化
    
    // Store original positions for particle density control
    starfield.userData = {
        originalPositions: new Float32Array(starsVertices), // Store copy of original positions
        isStarfield: true
    };
    
    console.log('[STARFIELD] Created with', starsVertices.length / 3, 'stars');
    console.log('[STARFIELD] Original positions stored:', starfield.userData.originalPositions.length / 3, 'points');
    
    scene.add(starfield);
}

let animationCount = 0;
function animate() {
    if (animationCount < 5) {
        console.log('[ANIMATE] Animation frame:', animationCount);
        animationCount++;
    }
    requestAnimationFrame(animate);
    
    // Reset update counter at the start of each frame
    gameStateManager.resetUpdateCounter();
    
    // Update performance monitor
    performanceMonitor.update();
    
    // Check frame rate limiter - skip rendering if limited
    if (!graphicsEngine.getFrameRateLimiter().shouldRender()) {
        // Reset update counter even when skipping frame
        gameStateManager.resetUpdateCounter();
        return;
    }
    
    const now = Date.now();
    
    const rawDeltaTime = (now - gameState.lastTick) / 1000;
    if (!isFinite(rawDeltaTime) || rawDeltaTime < 0 || rawDeltaTime > 1) {
        gameStateManager.updateState(state => ({ ...state, lastTick: now }));
        gameStateManager.resetUpdateCounter();
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
    const animationDeltaTime = deltaTime;
    
    if (!isFinite(animationDeltaTime) || animationDeltaTime <= 0) {
        console.warn('[GAME] Invalid animationDeltaTime:', { rawDeltaTime, timeMultiplier, deltaTime, animationDeltaTime, currentTimeMultiplier: gameState.currentTimeMultiplier });
        gameStateManager.updateState(state => ({ ...state, lastTick: now }));
        gameStateManager.resetUpdateCounter();
        return;
    }
    
    // Prepare batch updates
    let batchUpdates: Array<(state: any) => any> = [];
    
    // Update lastTick and gameYear
    batchUpdates.push(state => ({
        ...state,
        lastTick: now,
        gameYear: state.gameYear + deltaTime / 5
    }));
    updatePhysics(animationDeltaTime);
    
    // 軌道トレイルを更新
    orbitTrailSystem.update(gameState.stars);
    
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
    
    const newCosmicActivity = movingBodies > 0
        ? (totalVelocity / movingBodies) * Math.sqrt(movingBodies) * 0.01
        : 0;
    
    // Only update cosmic activity if it changed significantly
    if (Math.abs(newCosmicActivity - gameState.cosmicActivity) > 0.001) {
        batchUpdates.push(state => ({ ...state, cosmicActivity: newCosmicActivity }));
    }

    let dustRate = 1 + gameState.dustUpgradeLevel * 0.5 + (gameState.researchEnhancedDust ? 2 : 0);
    let energyRate = 0;
    let intelligentLifeCount = 0;
    let totalPopulation = 0;

    spatialGrid.clear();
    
    gameState.stars.forEach(body => {
        spatialGrid.insert(body);
        
        body.rotation.y += 0.01 * animationDeltaTime;

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
                            const thoughtPointsToAdd = thoughtPointRate * deltaTime;
                            
                            // Only add to batch if significant amount
                            if (thoughtPointsToAdd > 0.01) {
                                batchUpdates.push(state => ({
                                    ...state,
                                    thoughtPoints: state.thoughtPoints + thoughtPointsToAdd,
                                    resources: {
                                        ...state.resources,
                                        thoughtPoints: state.resources.thoughtPoints + thoughtPointsToAdd
                                    }
                                }));
                            }
                            break;
                    }
                    const organicToAdd = organicRate * deltaTime;
                    const biomassToAdd = biomassRate * deltaTime;
                    
                    // Only add to batch if significant amounts
                    if (organicToAdd > 0.01 || biomassToAdd > 0.01) {
                        batchUpdates.push(state => ({
                            ...state,
                            organicMatter: state.organicMatter + organicToAdd,
                            biomass: state.biomass + biomassToAdd,
                            resources: {
                                ...state.resources,
                                organicMatter: state.resources.organicMatter + organicToAdd,
                                biomass: state.resources.biomass + biomassToAdd
                            }
                        }));
                    }
                    (body.userData as PlanetUserData).population = ((body.userData as PlanetUserData).population || 0) + ((body.userData as PlanetUserData).population || 0) * populationGrowthRate * deltaTime;
                }
                break;
        }
    });
    
    // Only update cached population if it changed
    if (totalPopulation !== gameState.cachedTotalPopulation) {
        batchUpdates.push(state => ({ ...state, cachedTotalPopulation: totalPopulation }));
    }

    if (gameState.researchAdvancedEnergy) energyRate *= 2;
    
    const thoughtSpeed = mathCache.getThoughtSpeed();
    batchUpdates.push(state => ({
        ...state,
        currentDustRate: dustRate,
        thoughtSpeedMps: thoughtSpeed,
        resourceAccumulators: {
            ...state.resourceAccumulators,
            cosmicDust: state.resourceAccumulators.cosmicDust + dustRate * deltaTime,
            energy: state.resourceAccumulators.energy + energyRate * deltaTime
        }
    }));

    // Handle resource accumulator overflow
    batchUpdates.push(state => {
        const newState = { ...state };
        
        if (newState.resourceAccumulators.cosmicDust >= 1) {
            const dustToAdd = Math.floor(newState.resourceAccumulators.cosmicDust);
            newState.cosmicDust += dustToAdd;
            newState.resources = {
                ...newState.resources,
                cosmicDust: newState.resources.cosmicDust + dustToAdd
            };
            newState.resourceAccumulators = {
                ...newState.resourceAccumulators,
                cosmicDust: newState.resourceAccumulators.cosmicDust - dustToAdd
            };
        }
        
        if (newState.resourceAccumulators.energy >= 1) {
            const energyToAdd = Math.floor(newState.resourceAccumulators.energy);
            newState.energy += energyToAdd;
            newState.resources = {
                ...newState.resources,
                energy: newState.resources.energy + energyToAdd
            };
            newState.resourceAccumulators = {
                ...newState.resourceAccumulators,
                energy: newState.resourceAccumulators.energy - energyToAdd
            };
        }
        
        return newState;
    });
    
    // Apply all batch updates only if there are any
    if (batchUpdates.length > 0) {
        gameStateManager.batchUpdate(batchUpdates);
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
    
    composer.render();
    
    // Debug: Check if scene has objects
    if (animationCount === 1) {
        console.log('[RENDER] Scene children count:', scene.children.length);
        console.log('[RENDER] Camera position:', camera.position);
        console.log('[RENDER] Stars count:', gameState.stars.length);
    }

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
    console.log('[INIT] Starting initialization...');
    
    // Debug: Check canvas and UI elements
    const canvas = document.getElementById('game-canvas');
    const gameInfo = document.getElementById('game-info');
    console.log('[INIT] Canvas element:', canvas);
    console.log('[INIT] Game info element:', gameInfo);
    console.log('[INIT] Canvas size:', canvas?.clientWidth, 'x', canvas?.clientHeight);
    
    // Initialize device detection FIRST - this must run before other UI initialization
    setupDeviceDetection();
    console.log('[INIT] Device detection initialized');
    
    createStarfield();
    console.log('[INIT] Starfield created');
    
    // 背景銀河を初期化（デフォルトはmixed）
    backgroundGalaxies.setDisplayMode('mixed');
    console.log('[INIT] Background galaxies created');
    
    loadGame();
    console.log('[INIT] Game loaded');
    
    // Initialize production UI
    initProductionUI();
    
    // Initialize production chain UI (create UI elements)
    productionChainUI.createUI();
    
    // Initialize catalyst system with some starter catalysts for testing
    // @ts-ignore
    if (!gameState.catalystSystemInitialized) {
        // Only add technologies if they don't already exist (preserve loaded state)
        gameStateManager.updateState(state => {
            const newDiscoveredTechnologies = new Set(state.discoveredTechnologies);
            // Only add if not already discovered
            if (!newDiscoveredTechnologies.has('advanced_processing')) {
                newDiscoveredTechnologies.add('advanced_processing');
            }
            if (!newDiscoveredTechnologies.has('quantum_manipulation')) {
                newDiscoveredTechnologies.add('quantum_manipulation');
            }
            
            return {
                ...state,
                discoveredTechnologies: newDiscoveredTechnologies,
                catalystSystemInitialized: true
            };
        });
        
        // Only add starter catalysts if this is truly a new game
        if (gameState.gameYear === 0) {
            catalystManager.addCatalyst(CatalystType.EFFICIENCY_BOOSTER, 2);
            catalystManager.addCatalyst(CatalystType.SPEED_ACCELERATOR, 1);
        }
    }
    
    // Initialize currency system
    currencyManager.initializeCurrencies();
    
    // Debug: Check UI elements
    // console.log('[UI] Checking UI elements after initialization...');
    // console.log('[UI] overlayResourceSellButton:', ui.overlayResourceSellButton);
    // console.log('[UI] All UI keys with overlay:', Object.keys(ui).filter(key => key.includes('overlay')));

    console.log('[INIT] Checking for black hole...');
    let blackHole = gameState.stars.find(star => star.userData.type === 'black_hole');
    console.log('[INIT] Black hole exists:', !!blackHole);
    if (!blackHole) {
        console.log('[INIT] Creating black hole...');
        blackHole = createCelestialBody('black_hole', {
            name: 'Galactic Center',
            mass: 1e7,  // より適度な質量
            radius: 50,  // 適切なサイズに修正
            position: new THREE.Vector3(0, 0, 0),
            velocity: new THREE.Vector3(0, 0, 0)
        });
        console.log('[INIT] Black hole created:', blackHole);
        gameStateManager.updateState(state => ({
            ...state,
            stars: [...state.stars, blackHole]
        }));
        scene.add(blackHole);
        console.log('[INIT] Black hole added to scene');
    }

    console.log('[INIT] Checking for initial star...');
    const starExists = gameState.stars.some(star => star.userData.type === 'star');
    console.log('[INIT] Star exists:', starExists);
    if (!starExists && blackHole) {
        console.log('[INIT] Creating initial star...');
        
        // Calculate proper orbital velocity using Kepler's laws
        const orbitalRadius = 10000;  // 安定した軌道距離（10000 game units = 100 AU）
        const blackHoleMass = blackHole.userData.mass || 1e7;
        const G = physicsConfig.getPhysics().G;
        
        // v = sqrt(G * M / r) for circular orbit
        const baseOrbitalSpeed = Math.sqrt(G * blackHoleMass / orbitalRadius);
        const speedMultiplier = physicsConfig.getOrbitalMechanics().orbitalSpeedMultiplier;
        const gameScaleFactor = 0.95; // 少し遅くして楕円軌道を作る
        const orbitalSpeed = baseOrbitalSpeed * speedMultiplier * gameScaleFactor;
        console.log('[INIT] Orbital speed calculation:', {
            radius: orbitalRadius,
            baseSpeed: baseOrbitalSpeed,
            adjustedSpeed: orbitalSpeed,
            multiplier: speedMultiplier,
            escapeVelocity: baseOrbitalSpeed * Math.sqrt(2)  // 脱出速度の参考値
        });
        
        // 通常の恒星作成処理を使わず、デフォルト位置で作成してから移動
        const initialStar = createCelestialBody('star', {
            name: 'Alpha Centauri',
            mass: 2000,  // ゲーム単位での恒星質量
            radius: 10,  // ゲーム内の適切なスケール
            velocity: new THREE.Vector3(0, 0, orbitalSpeed)
            // positionは意図的に指定しない
        });
        
        // 恒星作成直後に位置を設定
        initialStar.position.set(orbitalRadius, 0, 0);
        // 恒星をstars配列に追加する前に、既存の恒星をチェック
        const existingStars = gameState.stars.filter(s => s.userData.type === 'star');
        console.log('[INIT] Existing stars:', existingStars.length);
        
        gameStateManager.updateState(state => ({
            ...state,
            stars: [...state.stars, initialStar]
        }));
        
        scene.add(initialStar);
        console.log('[INIT] Initial star added to scene at position:', initialStar.position);
        
        // フォーカスを初期恒星に設定
        gameStateManager.updateState(state => ({
            ...state,
            focusedObject: initialStar
        }));
        
        // カメラを初期恒星の近くに移動
        camera.position.set(orbitalRadius + 500, 200, 200);
        camera.lookAt(initialStar.position);
    }

    // Focus on black hole if it exists
    if (blackHole) {
        gameStateManager.updateState(state => ({
            ...state,
            focusedObject: blackHole
        }));
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
            // console.log('[INIT] DOM loaded, setting up event listeners...');
            setupEventListeners();
            initializeResearchLab();
        });
    } else {
        // console.log('[INIT] DOM already loaded, setting up event listeners now...');
        setupEventListeners();
        initializeResearchLab();
    }
    
    // WebSocket接続の初期化
    wsClient = createWebSocketClient();
    
    // WebSocketイベントハンドラー
    wsClient.on('connected', () => {
        // console.log('[WEBSOCKET] Connected to backend');
        wsClient.getGameState(); // 接続後に状態を取得
        wsClient.setGameRunning(true); // ゲームループを開始
    });
    
    wsClient.on('gameState', (data: any) => {
        // console.log('[WEBSOCKET] ゲーム状態更新:', data);
        // リソースを更新
        if (data.resources) {
            gameStateManager.updateState(state => ({
                ...state,
                resources: data.resources
            }));
        }
        // 天体情報を更新（必要に応じて）
        if (data.bodies) {
            // console.log('[WEBSOCKET] 天体数:', data.bodies.length);
        }
        // UIを更新
        updateUI();
    });
    
    wsClient.on('bodyCreated', (data: any) => {
        // console.log('[WEBSOCKET] Body created:', data);
        if (data.success) {
            // console.log('[WEBSOCKET] Body creation success:', data.bodyId);
        } else {
            console.error('[WEBSOCKET] Body creation failed:', data.error);
        }
    });
    
    wsClient.on('serverError', (data: any) => {
        console.error('[WEBSOCKET] Server error:', data.message);
    });
    
    wsClient.on('disconnected', () => {
        // console.log('[WEBSOCKET] Disconnected from backend');
    });
    
    // 接続を開始
    wsClient.connect();
    
    console.log('[INIT] Starting animation loop...');
    animate();
    console.log('[INIT] Initialization complete');
    
    // Remove fade overlay after initialization
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) {
        console.log('[INIT] Removing fade overlay...');
        fadeOverlay.classList.add('fade-out');
        setTimeout(() => {
            fadeOverlay.style.display = 'none';
        }, 1500);
    }
}

console.log('[MAIN] Calling init()...');
init();
