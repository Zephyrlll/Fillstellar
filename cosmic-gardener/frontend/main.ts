
import * as THREE from 'three';
import { scene, camera, renderer, composer, controls } from './js/threeSetup.ts';
import { gameState, gameStateManager, PlanetUserData } from './js/state.ts';
import { saveGame, loadGame } from './js/saveload.ts';
import { SaveSystem } from './js/systems/saveSystem.ts';
import { OfflineCalculator } from './js/systems/offlineProgress.ts';
import { PerformanceOptimizer } from './js/systems/performanceOptimizer.ts';
import { GameErrorHandler } from './js/systems/errorHandler.ts';
import { GameNotification } from './js/types/idle.ts';
import { OfflineReportModal } from './js/systems/offlineReportModal.ts';
import { Dashboard } from './js/systems/dashboard.ts';
import { FeedbackSystem } from './js/systems/feedbackSystem.ts';
import { AchievementSystem } from './js/systems/achievements.ts';
import { AchievementUI } from './js/systems/achievementUI.ts';
import { MenuSystem } from './js/systems/menuSystem.ts';
import { UIPositionManager } from './js/systems/uiPositionManager.ts';
import { PrestigeUI } from './js/systems/prestigeUI.ts';
import { prestigeSystem } from './js/systems/prestigeSystem.ts';
import { phaseManager } from './js/systems/phaseManager.ts';
import { phaseUI } from './js/systems/phaseUI.ts';
import { unlockManager } from './js/systems/unlockManager.ts';
import { tutorialSystem } from './js/systems/tutorialSystem.ts';
import { tutorialUI } from './js/systems/tutorialUI.ts';
import { resetTutorial } from './js/resetTutorial.ts';
import { automationManager } from './js/systems/automationManager.ts';
import { automationUI } from './js/systems/automationUI.ts';
import { applyAutomationResearchEffect } from './js/systems/automationResearch.ts';
import { productionAnalyzer } from './js/systems/productionAnalyzer.ts';
import { productionAnalysisUI } from './js/systems/productionAnalysisUI.ts';
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
// @ts-ignore
import { marketSystem } from './js/marketSystem.ts';
// @ts-ignore
import { showResourceSellModal } from './js/resourceSellModal.ts';
// Graphics system imports
import { performanceMonitor } from './js/performanceMonitor.ts';
import { graphicsEngine } from './js/graphicsEngine.ts';
import { updatePerformanceDisplay } from './js/ui.ts';
// Performance optimization imports
import { performanceMonitor as newPerformanceMonitor } from './js/systems/performanceMonitor.ts';
import { uiOptimizer } from './js/systems/uiOptimizer.ts';
import { RenderOptimizer } from './js/systems/renderOptimizer.ts';
// Balance system imports
import { balanceManager } from './js/systems/balanceConfig.ts';
import { balanceAdjustments } from './js/systems/balanceAdjustments.ts';
import { balanceDebugUI } from './js/systems/balanceDebugUI.ts';
// Starfield optimization
import { starfieldOptimizer } from './js/starfieldOptimizer.ts';
// Research Lab UI
import { initializeResearchLab } from './js/researchLab.ts';
// Inventory UI
import { initializeInventory } from './js/inventory.ts';
// Physics config
import { physicsConfig } from './js/physicsConfig.ts';
// Debug physics
import './js/debugPhysics.ts';
// Orbit trails
import { orbitTrailSystem } from './js/orbitTrails.ts';
// Background galaxies
import { backgroundGalaxies } from './js/backgroundGalaxies.ts';

// Idle game initialization function
function initializeIdleGameSystems() {
    console.log('[IDLE] Initializing idle game systems...');
    
    // Set up notification callbacks
    saveSystem.setNotificationCallback(showGameNotification);
    errorHandler.setNotificationCallback(showGameNotification);
    
    // Set up error handling
    window.onerror = (message, source, lineno, colno, error) => {
        if (error) {
            errorHandler.handleError(error, 'RUNTIME_ERROR', source, lineno, colno);
        }
        return true;
    };
    
    // Load saved game if exists
    saveSystem.load().then(savedState => {
        if (savedState) {
            console.log('[IDLE] Loading saved game...');
            
            // Apply balance migrations if needed
            const saveVersion = savedState.saveVersion || '0.0.0';
            balanceAdjustments.applyBalanceMigrations(saveVersion);
            
            // Calculate offline progress if applicable
            if (savedState.lastSaveTime) {
                const offlineProgress = offlineCalculator.calculateProgress(
                    savedState,
                    savedState.lastSaveTime
                );
                
                if (offlineProgress.duration > 0) {
                    // Apply offline progress
                    offlineCalculator.applyOfflineProgress(savedState, offlineProgress);
                    
                    // Show offline report modal
                    const modal = new OfflineReportModal(offlineProgress);
                    modal.show();
                }
            }
            
            // Update game state
            Object.assign(gameState, savedState);
            gameState.lastActiveTime = Date.now();
        }
    }).catch(error => {
        errorHandler.handleError(error, 'SAVE_LOAD_ERROR');
    });
    
    console.log('[IDLE] Idle game systems initialized');
}

// Notification display function
function showGameNotification(notification: GameNotification) {
    const notificationContainer = document.getElementById('notification-container') || createNotificationContainer();
    
    const notificationEl = document.createElement('div');
    notificationEl.className = `notification notification-${notification.type}`;
    notificationEl.textContent = notification.message;
    
    notificationContainer.appendChild(notificationEl);
    
    // Auto-remove after duration
    if (notification.duration) {
        setTimeout(() => {
            notificationEl.classList.add('fade-out');
            setTimeout(() => notificationEl.remove(), 300);
        }, notification.duration);
    }
}

// Create notification container if it doesn't exist
function createNotificationContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
}

// Offline progress modal
// Removed - now using OfflineReportModal class
// function showOfflineProgressModal(report: string) {
//     const modal = document.createElement('div');
//     modal.className = 'offline-progress-modal';
//     modal.innerHTML = `
//         <div class="modal-content">
//             <h2>Offline Progress</h2>
//             <pre>${report}</pre>
//             <button onclick="this.closest('.offline-progress-modal').remove()">Continue</button>
//         </div>
//     `;
//     
//     // Add basic styles
//     modal.style.cssText = `
//         position: fixed;
//         inset: 0;
//         background: rgba(0, 0, 0, 0.8);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         z-index: 20000;
//     `;
//     
//     const content = modal.querySelector('.modal-content') as HTMLElement;
//     if (content) {
//         content.style.cssText = `
//             background: #1a1a2e;
//             padding: 30px;
//             border-radius: 10px;
//             border: 2px solid #16213e;
//             color: #eee;
//             max-width: 500px;
//             width: 90%;
//             max-height: 80vh;
//             overflow-y: auto;
//         `;
//     }
//     
//     document.body.appendChild(modal);
// }
// Black hole gas effect
import { blackHoleGas } from './js/blackHoleGas.ts';
// Derived resource generator
import { DerivedResourceGenerator } from './js/derivedResourceGenerator.ts';

// Initialize idle game systems
const saveSystem = new SaveSystem();
const offlineCalculator = new OfflineCalculator();
const performanceOptimizer = new PerformanceOptimizer();
const errorHandler = new GameErrorHandler();
const dashboard = new Dashboard();
let feedbackSystem: FeedbackSystem;
export { feedbackSystem };
const achievementSystem = new AchievementSystem();
let achievementUI: AchievementUI;
const menuSystem = new MenuSystem();
const uiPositionManager = new UIPositionManager();
const prestigeUI = new PrestigeUI();
let renderOptimizer: RenderOptimizer;

// Expose graphicsEngine globally for synchronous access from saveload.ts and debugging
(window as any).graphicsEngine = graphicsEngine;
console.log('🎮 Graphics engine exposed to window:', (window as any).graphicsEngine);

const moveSpeed = 200;

let uiUpdateTimer = 0;
const uiUpdateInterval = 0.05; // 0.1秒から0.05秒に短縮してより滑らかに

let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2;

// WebSocketクライアント
let wsClient: any = null;

// Derived resource generator instance
const derivedResourceGenerator = new DerivedResourceGenerator();

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const currentState = gameStateManager.getState();
    const resolutionScale = currentState.graphics.resolutionScale;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    const starsMaterial = starfieldOptimizer.createOptimizedStarfieldMaterial({
        resolutionScale,
        devicePixelRatio,
        baseStarSize: 0.8,
        starCount: 8000
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
        isStarfield: true,
        baseStarSize: 0.8
    };
    
    console.log('[STARFIELD] Created with', starsVertices.length / 3, 'stars');
    console.log('[STARFIELD] Original positions stored:', starfield.userData.originalPositions.length / 3, 'points');
    
    scene.add(starfield);
}

let animationCount = 0;
let balanceUpdateTimer = 0;
const balanceUpdateInterval = 5; // Update balance every 5 seconds
let unlockCheckTimer = 0;
const unlockCheckInterval = 2; // Check unlocks every 2 seconds

function animate() {
    if (animationCount < 5) {
        console.log('[ANIMATE] Animation frame:', animationCount);
        animationCount++;
    }
    requestAnimationFrame(animate);
    
    // Reset update counter at the start of each frame
    gameStateManager.resetUpdateCounter();
    
    // Check frame rate limiter - skip rendering if limited
    const shouldRender = graphicsEngine.getFrameRateLimiter().shouldRender();
    if (!shouldRender) {
        // Reset update counter even when skipping frame
        gameStateManager.resetUpdateCounter();
        return;
    }
    
    // Update performance monitor only for rendered frames
    performanceMonitor.update();
    newPerformanceMonitor.update();
    
    // Update object count for performance monitoring
    newPerformanceMonitor.updateObjectCount(scene.children.length);
    
    // Perform frustum culling for better performance
    const culledCount = renderOptimizer.performFrustumCulling();
    
    // Adjust quality based on FPS
    const currentFPS = newPerformanceMonitor.getMetrics().fps;
    renderOptimizer.adjustQualityForFPS(currentFPS);
    
    // Update LOD for celestial bodies
    renderOptimizer.updateLOD(gameState.stars);
    
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
    
    // 物理演算・アニメーション用（0.2倍でスムーズな動き）
    const animationDeltaTime = rawDeltaTime * timeMultiplier * 0.4;
    
    // リソース生成・ゲーム進行用（通常速度）
    const resourceDeltaTime = rawDeltaTime * timeMultiplier;
    
    // 互換性のため deltaTime は animationDeltaTime と同じ
    const deltaTime = animationDeltaTime;
    
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
        gameYear: state.gameYear + resourceDeltaTime / 5
    }));
    updatePhysics(animationDeltaTime);
    
    // 軌道トレイルを更新
    orbitTrailSystem.update(gameState.stars);
    
    // 背景銀河を更新（カメラ位置を渡す）
    backgroundGalaxies.update(animationDeltaTime, camera.position);
    
    // ブラックホールのガス効果を更新
    const blackHole = gameState.stars.find(star => star.userData.type === 'black_hole');
    if (blackHole) {
        blackHoleGas.update(animationDeltaTime, blackHole.position);
    }
    
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

    // Get base dust rate from balance config
    const baseDustRate = balanceManager.getResourceRate('cosmicDust', gameState.dustUpgradeLevel);
    let dustRate = baseDustRate + (gameState.researchEnhancedDust ? 2 : 0);
    // Apply research multipliers
    if (gameState.research?.dustGenerationMultiplier) {
        dustRate *= gameState.research.dustGenerationMultiplier;
    }
    // Apply dynamic balance multipliers
    if (gameState.balancedRates?.cosmicDust) {
        dustRate *= gameState.balancedRates.cosmicDust;
    }
    let energyRate = 0;
    let intelligentLifeCount = 0;
    let totalPopulation = 0;

    spatialGrid.clear();
    
    let darkMatterRate = 0;
    
    gameState.stars.forEach(body => {
        spatialGrid.insert(body);
        
        body.rotation.y -= 0.01 * animationDeltaTime; // 反時計回りに変更

        if (body.userData.type === 'planet') {
            if ((body.userData as PlanetUserData).hasLife) {
                totalPopulation += (body.userData as PlanetUserData).population || 0;
            }
        }

        switch (body.userData.type) {
            case 'star':
                energyRate += (body.userData.mass as number) / 1000;
                break;
            case 'black_hole':
                // Black holes generate dark matter based on nearby matter
                darkMatterRate += Math.log10((body.userData.mass as number) + 1) * 0.001;
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
                            // Apply research multiplier
                            if (gameState.research?.thoughtGenerationMultiplier) {
                                thoughtPointRate *= gameState.research.thoughtGenerationMultiplier;
                            }
                            const thoughtPointsToAdd = thoughtPointRate * resourceDeltaTime;
                            
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
                    const organicToAdd = organicRate * resourceDeltaTime;
                    const biomassToAdd = biomassRate * resourceDeltaTime;
                    
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
    // Apply research multipliers
    if (gameState.research?.energyConversionMultiplier) {
        energyRate *= gameState.research.energyConversionMultiplier;
    }
    
    // Apply research multiplier to dark matter generation
    if (gameState.research?.darkMatterGenerationMultiplier) {
        darkMatterRate *= gameState.research.darkMatterGenerationMultiplier;
    }
    
    const thoughtSpeed = mathCache.getThoughtSpeed();
    batchUpdates.push(state => ({
        ...state,
        currentDustRate: dustRate,
        thoughtSpeedMps: thoughtSpeed,
        resourceAccumulators: {
            ...state.resourceAccumulators,
            cosmicDust: state.resourceAccumulators.cosmicDust + dustRate * resourceDeltaTime,
            energy: state.resourceAccumulators.energy + energyRate * resourceDeltaTime,
            darkMatter: (state.resourceAccumulators.darkMatter || 0) + darkMatterRate * resourceDeltaTime
        }
    }));

    // Handle resource accumulator overflow - 滑らかな増加のため小数点以下も反映
    batchUpdates.push(state => {
        const newState = { ...state };
        
        // 塵は直接増加（アキュムレーターをリソースに即座に反映）
        if (newState.resourceAccumulators.cosmicDust > 0) {
            const dustToAdd = newState.resourceAccumulators.cosmicDust;
            newState.cosmicDust += dustToAdd;
            newState.resources = {
                ...newState.resources,
                cosmicDust: newState.resources.cosmicDust + dustToAdd
            };
            newState.resourceAccumulators = {
                ...newState.resourceAccumulators,
                cosmicDust: 0
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
        
        if (newState.resourceAccumulators.darkMatter && newState.resourceAccumulators.darkMatter >= 0.001) {
            const darkMatterToAdd = newState.resourceAccumulators.darkMatter;
            newState.darkMatter = (newState.darkMatter || 0) + darkMatterToAdd;
            newState.resources = {
                ...newState.resources,
                darkMatter: (newState.resources.darkMatter || 0) + darkMatterToAdd
            };
            newState.resourceAccumulators = {
                ...newState.resourceAccumulators,
                darkMatter: 0
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
    
    // Update derived resource generator
    derivedResourceGenerator.update(resourceDeltaTime);
    
    // Update resource particle effects
    resourceParticleSystem.update(deltaTime);

    if (keys.w) camera.position.z -= moveSpeed * animationDeltaTime;
    if (keys.s) camera.position.z += moveSpeed * animationDeltaTime;
    if (keys.a) camera.position.x -= moveSpeed * animationDeltaTime;
    if (keys.d) camera.position.x += moveSpeed * animationDeltaTime;

    if (gameState.focusedObject) {
        const targetPosition = gameState.focusedObject.position.clone();
        
        // カメラの現在の天体からの相対位置を計算
        const currentOffset = camera.position.clone().sub(controls.target);
        
        // 新しいカメラ位置を計算（天体の位置 + 現在のオフセット）
        const newCameraPosition = targetPosition.clone().add(currentOffset);
        
        // カメラ位置と注視点を即座に更新
        camera.position.copy(newCameraPosition);
        controls.target.copy(targetPosition);
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
    
    // NaNエラーのデバッグ用にtry-catchを追加
    try {
        // ポストプロセッシングが有効な場合はcomposerを使用、無効な場合は直接レンダリング
        if (graphicsEngine.isPostProcessingEnabled()) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    } catch (error) {
        console.error('[RENDER] Error during rendering:', error);
    }
    
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
    
    // Update balance adjustments periodically
    balanceUpdateTimer += deltaTime;
    if (balanceUpdateTimer >= balanceUpdateInterval) {
        balanceAdjustments.applyDynamicBalance();
        balanceUpdateTimer = 0;
    }
    
    // Check for unlocks periodically
    unlockCheckTimer += deltaTime;
    if (unlockCheckTimer >= unlockCheckInterval) {
        unlockManager.checkUnlocks();
        unlockCheckTimer = 0;
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
    
    // Initialize idle game systems
    initializeIdleGameSystems();
    
    loadGame();
    console.log('[INIT] Game loaded');
    
    // Initialize production UI
    initProductionUI();
    
    // Initialize production chain UI (create UI elements)
    productionChainUI.createUI();
    
    // Initialize dashboard
    dashboard.init();
    console.log('[INIT] Dashboard initialized');
    
    // Expose dashboard globally for menu system
    (window as any).dashboard = dashboard;
    
    // Initialize feedback system
    feedbackSystem = new FeedbackSystem(camera, renderer);
    console.log('[INIT] Feedback system initialized');
    
    // Expose feedback system globally for other modules
    (window as any).feedbackSystem = feedbackSystem;
    
    // Initialize achievement system
    achievementSystem.init(feedbackSystem);
    achievementUI = new AchievementUI(achievementSystem);
    achievementUI.init();
    console.log('[INIT] Achievement system initialized');
    
    // Expose achievement system globally for debugging
    (window as any).achievementSystem = achievementSystem;
    
    // Initialize prestige system
    prestigeUI.init();
    console.log('[INIT] Prestige system initialized');
    
    // Initialize phase system
    phaseManager.init();
    phaseUI.init();
    console.log('[INIT] Phase system initialized');
    
    // Initialize unlock system
    unlockManager.checkUnlocks();
    console.log('[INIT] Unlock system initialized');
    
    // Initialize tutorial system
    tutorialSystem.init();
    tutorialUI.init();
    console.log('[INIT] Tutorial system initialized');
    
    // Initialize automation system
    automationManager.init();
    automationUI.init();
    console.log('[INIT] Automation system initialized');
    
    // Initialize production analysis system
    productionAnalysisUI.init();
    console.log('[INIT] Production analysis system initialized');
    
    // Expose systems globally
    (window as any).prestigeUI = prestigeUI;
    (window as any).prestigeSystem = prestigeSystem;
    (window as any).phaseManager = phaseManager;
    (window as any).phaseUI = phaseUI;
    (window as any).unlockManager = unlockManager;
    (window as any).tutorialSystem = tutorialSystem;
    (window as any).tutorialUI = tutorialUI;
    (window as any).productionAnalyzer = productionAnalyzer;
    (window as any).productionAnalysisUI = productionAnalysisUI;
    
    // Initialize menu system
    menuSystem.init();
    menuSystem.hideExistingButtons();
    console.log('[INIT] Menu system initialized');
    
    // Initialize UI position manager
    uiPositionManager.init();
    console.log('[INIT] UI position manager initialized');
    
    // Initialize render optimizer
    renderOptimizer = RenderOptimizer.getInstance(renderer, scene, camera);
    console.log('[INIT] Render optimizer initialized');
    
    // Initialize balance debug UI (F4 to toggle)
    console.log('[INIT] Balance debug UI initialized (Press F4 to toggle)');
    
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
    
    // Initialize market system
    marketSystem.update();
    
    // Expose systems globally for debugging and HTML access
    (window as any).currencyManager = currencyManager;
    (window as any).marketSystem = marketSystem;
    (window as any).showResourceSellModal = showResourceSellModal;
    (window as any).dashboard = dashboard;
    (window as any).feedbackSystem = feedbackSystem;
    (window as any).achievementSystem = achievementSystem;
    (window as any).achievementUI = achievementUI;
    (window as any).menuSystem = menuSystem;
    (window as any).uiPositionManager = uiPositionManager;
    (window as any).automationManager = automationManager;
    (window as any).automationUI = automationUI;
    console.log('[INIT] Currency and market systems initialized and exposed to window');
    
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
        // ガス効果にブラックホールを設定
        blackHoleGas.setBlackHole(blackHole);
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
            
            // Add performance monitor toggle (F3 key)
            document.addEventListener('keydown', (e) => {
                if (e.key === 'F3') {
                    e.preventDefault();
                    newPerformanceMonitor.toggle();
                }
            });
            initializeResearchLab();
            
            // Start auto-save after DOM is ready
            saveSystem.startAutoSave(() => gameState);
            
            // Test feedback system (remove in production)
            setTimeout(() => {
                if (feedbackSystem) {
                    feedbackSystem.showToast({
                        message: 'アイドルゲームシステムが起動しました！',
                        type: 'success',
                        duration: 5000
                    });
                }
            }, 1000);
        });
    } else {
        // console.log('[INIT] DOM already loaded, setting up event listeners now...');
        setupEventListeners();
        
        // Add performance monitor toggle (F3 key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                newPerformanceMonitor.toggle();
            }
        });
        initializeResearchLab();
        initializeInventory();
        
        // Test feedback system (remove in production)
        setTimeout(() => {
            if (feedbackSystem) {
                feedbackSystem.showToast({
                    message: 'アイドルゲームシステムが起動しました！',
                    type: 'success',
                    duration: 5000
                });
            }
        }, 1000);
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
