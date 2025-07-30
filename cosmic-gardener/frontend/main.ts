
import * as THREE from 'three';
import { scene, camera, renderer, composer, controls } from './js/threeSetup.ts';
import { gameState, gameStateManager, PlanetUserData } from './js/state.ts';
import { markDeprecatedElements } from './js/deprecation-warnings.ts';
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
import { paragonSystem } from './js/systems/paragonSystem.ts';
import { paragonUI } from './js/systems/paragonUI.ts';
import { infiniteResourceSystem } from './js/systems/infiniteResourceSystem.ts';
import { infiniteResourceUI } from './js/systems/infiniteResourceUI.ts';
import { mythicRaritySystem } from './js/systems/mythicRaritySystem.ts';
import { mythicRarityUI } from './js/systems/mythicRarityUI.ts';
import { multiverseSystem } from './js/systems/multiverseSystem.ts';
import { multiverseUI } from './js/systems/multiverseUI.ts';
import { endgameProgressUI } from './js/systems/endgameProgressUI.ts';
import { researchPathFinder } from './js/systems/researchPathFinder.ts';
import { researchPathFinderUI } from './js/systems/researchPathFinderUI.ts';
import { updateUI, debouncedUpdateGalaxyMap, ui } from './js/ui.ts';
import { createCelestialBody, checkLifeSpawn, evolveLife } from './js/celestialBody.ts';
import { spatialGrid, updatePhysics } from './js/physics.ts';
import { updateStatistics } from './js/statistics.ts';
import { GALAXY_BOUNDARY } from './js/constants.ts';
import { mathCache } from './js/utils.ts';
import { setupEventListeners } from './js/events.ts';
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
import { performanceOverlay } from './js/systems/performanceOverlay.ts';
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
// Production Chain Visualizer UI
import { productionChainVisualizerUI } from './js/systems/productionChainVisualizerUI.ts';
// Research Tree Visualizer UI
import { researchTreeVisualizerUI } from './js/systems/researchTreeVisualizerUI.ts';
// Batch Conversion System
import { batchConversionUI } from './js/systems/batchConversionUI.ts';
// Conversion Recipe UI
import { conversionRecipeUI } from './js/systems/conversionRecipeUI.ts';
// Dual View System
import { initializeDualViewSystem } from './js/systems/dualViewSystem.ts';
// Physics config
import { physicsConfig } from './js/physicsConfig.ts';
// Debug physics
import './js/debugPhysics.ts';
// Orbit trails
import { orbitTrailSystem } from './js/orbitTrails.ts';
// Background galaxies
import { backgroundGalaxies } from './js/backgroundGalaxies.ts';
// Celestial Creation UI
import { celestialCreationUI } from './js/systems/celestialCreationUI.ts';
// Star Management UI
import { starManagementUI } from './js/systems/starManagementUI.ts';
// LOD system
import { LODManager } from './js/systems/lodManager.ts';
// Stats Panel
import { statsPanel } from './js/systems/statsPanel.ts';
// Resource Stats UI
import './js/systems/resourceStatsUI.ts';
// Celestial Stats UI
import './js/systems/celestialStatsUI.ts';
// Graph Display UI
import './js/systems/graphDisplayUI.ts';
// Help & Controls UI
import './js/systems/helpControlsUI.ts';
// Production Optimizer
import './js/systems/productionOptimizer.ts';

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
let lodManager: LODManager;

// Expose graphicsEngine globally for synchronous access from saveload.ts and debugging
(window as any).graphicsEngine = graphicsEngine;
console.log('🎮 Graphics engine exposed to window:', (window as any).graphicsEngine);

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
    
    // Check frame rate limiter BEFORE requesting next frame
    const shouldRender = graphicsEngine.getFrameRateLimiter().shouldRender();
    
    // Always request next frame to keep the loop going
    requestAnimationFrame(animate);
    
    // But skip the actual work if we're limiting FPS
    if (!shouldRender) {
        return;
    }
    
    // Reset update counter at the start of each frame
    gameStateManager.resetUpdateCounter();
    
    // Update performance monitor only for rendered frames
    performanceMonitor.update();
    newPerformanceMonitor.update();
    performanceOverlay.update();
    
    // Update object count for performance monitoring
    newPerformanceMonitor.updateObjectCount(scene.children.length);
    
    // Perform frustum culling for better performance
    const culledCount = renderOptimizer.performFrustumCulling();
    
    // Adjust quality based on FPS
    const currentFPS = newPerformanceMonitor.getMetrics().fps;
    renderOptimizer.adjustQualityForFPS(currentFPS);
    
    // Update LOD for celestial bodies
    renderOptimizer.updateLOD(gameState.stars);
    
    // Update LOD manager for advanced LOD features
    lodManager.update(gameState.stars);
    
    // Apply LOD performance adjustments based on FPS
    lodManager.adjustForFPS(currentFPS);
    
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
    
    // レーダーUIを更新
    if (typeof window.radarUI !== 'undefined' && window.radarUI.update) {
        window.radarUI.update(animationDeltaTime);
    }
    
    // 軌道トレイルを更新
    orbitTrailSystem.update(gameState.stars);
    
    // 背景銀河を更新（カメラ位置を渡す）
    backgroundGalaxies.update(animationDeltaTime, camera.position);
    
    // ブラックホールのガス効果を更新（一時的に無効化してデバッグ）
    const blackHole = gameState.stars.find(star => star.userData.type === 'black_hole');
    // エラーデバッグのため一時的にコメントアウト
    /*
    if (blackHole && blackHoleGas.isEffectActive()) {
        blackHoleGas.update(animationDeltaTime, blackHole.position);
    } else if (!blackHole && blackHoleGas.isEffectActive()) {
        // Black hole was removed, dispose the gas effect
        blackHoleGas.dispose();
    }
    */
    
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
    
    // Debug log for dust rate calculation
    if (animationCount % 60 === 0) { // Log every 1 second
        console.log('[DUST_RATE] Debug info:', {
            baseDustRate,
            upgradeLevel: gameState.dustUpgradeLevel,
            researchEnhanced: gameState.researchEnhancedDust,
            calculatedDustRate: dustRate,
            currentDustInState: gameState.cosmicDust,
            currentDustInResources: gameState.resources?.cosmicDust,
            accumulator: gameState.resourceAccumulators?.cosmicDust
        });
    }
    
    // Apply research multipliers
    if (gameState.research?.dustGenerationMultiplier) {
        dustRate *= gameState.research.dustGenerationMultiplier;
    }
    // Apply dynamic balance multipliers
    if (gameState.balancedRates?.cosmicDust) {
        dustRate *= gameState.balancedRates.cosmicDust;
    }
    // パラゴンボーナスの適用
    if (paragonSystem.isEndgame()) {
        dustRate *= paragonSystem.getResourceProductionBonus('cosmicDust');
    }
    // Use mathCache for resource generation rates
    let energyRate = mathCache.getEnergyGenerationRate();
    let organicMatterRate = mathCache.getOrganicMatterGenerationRate();
    let biomassRate = mathCache.getBiomassGenerationRate();
    let intelligentLifeCount = 0;
    let totalPopulation = 0;
    
    // Add production from owned planets
    const ownedPlanets = (gameState as any).ownedPlanets || [];
    ownedPlanets.forEach((planet: any) => {
        dustRate += planet.baseProduction.cosmicDust * planet.productionMultiplier;
        energyRate += planet.baseProduction.energy * planet.productionMultiplier;
        organicMatterRate += planet.baseProduction.organicMatter * planet.productionMultiplier;
    });

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
                // Energy generation is now handled by mathCache.getEnergyGenerationRate()
                break;
            case 'black_hole':
                // Black holes generate dark matter based on nearby matter
                darkMatterRate += Math.log10((body.userData.mass as number) + 1) * 0.01; // Increased from 0.001 to 0.01
                break;
            case 'asteroid':
            case 'comet':
                dustRate += 0.5;
                // 天体作成イベント発火（神話級チェック用）
                window.dispatchEvent(new CustomEvent('celestialCreated', { detail: body }));
                break;
            case 'planet':
                checkLifeSpawn(body);
                evolveLife(body);
                if ((body.userData as PlanetUserData).hasLife) {
                    let populationGrowthRate = 0;
                    switch ((body.userData as PlanetUserData).lifeStage) {
                        case 'microbial':
                            populationGrowthRate = 0.01; break;
                        case 'plant':
                            populationGrowthRate = 0.05; break;
                        case 'animal':
                            populationGrowthRate = 0.1; break;
                        case 'intelligent':
                            populationGrowthRate = 0.5;
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
                    // Organic matter and biomass generation is now handled by mathCache
                    (body.userData as PlanetUserData).population = ((body.userData as PlanetUserData).population || 0) + ((body.userData as PlanetUserData).population || 0) * populationGrowthRate * deltaTime;
                }
                break;
        }
    });
    
    // Only update cached population if it changed
    if (totalPopulation !== gameState.cachedTotalPopulation) {
        batchUpdates.push(state => ({ ...state, cachedTotalPopulation: totalPopulation }));
    }

    // Research and paragon bonuses are already applied in mathCache calculations
    // Apply additional paragon bonus if needed
    if (paragonSystem.isEndgame()) {
        energyRate *= paragonSystem.getResourceProductionBonus('energy');
        organicMatterRate *= paragonSystem.getResourceProductionBonus('organicMatter');
        biomassRate *= paragonSystem.getResourceProductionBonus('biomass');
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
            organicMatter: state.resourceAccumulators.organicMatter + organicMatterRate * resourceDeltaTime,
            biomass: (state.resourceAccumulators.biomass || 0) + biomassRate * resourceDeltaTime,
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
        
        if (newState.resourceAccumulators.organicMatter >= 1) {
            const organicToAdd = Math.floor(newState.resourceAccumulators.organicMatter);
            newState.organicMatter += organicToAdd;
            newState.resources = {
                ...newState.resources,
                organicMatter: newState.resources.organicMatter + organicToAdd
            };
            newState.resourceAccumulators = {
                ...newState.resourceAccumulators,
                organicMatter: newState.resourceAccumulators.organicMatter - organicToAdd
            };
        }
        
        if (newState.resourceAccumulators.biomass && newState.resourceAccumulators.biomass >= 1) {
            const biomassToAdd = Math.floor(newState.resourceAccumulators.biomass);
            newState.biomass += biomassToAdd;
            newState.resources = {
                ...newState.resources,
                biomass: newState.resources.biomass + biomassToAdd
            };
            newState.resourceAccumulators = {
                ...newState.resourceAccumulators,
                biomass: newState.resourceAccumulators.biomass - biomassToAdd
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
    
    // Update planet shop
    import('./js/systems/planetOwnership/planetShop.js').then(({ PlanetShop }) => {
        PlanetShop.getInstance().update(deltaTime);
    });

    // WASDキーでのカメラ移動機能は削除しました
    // OrbitControlsによるマウス操作でカメラを制御してください

    if (gameState.focusedObject) {
        // デバッグログを追加（初回のみ）
        if (!gameState._debugFocusLogged) {
            console.log('[MAIN] FocusedObject detected:', gameState.focusedObject);
            console.log('[MAIN] FocusedObject name:', gameState.focusedObject.userData?.name);
            console.log('[MAIN] FocusedObject position:', gameState.focusedObject.position);
            gameState._debugFocusLogged = true;
        }
        
        const targetPosition = gameState.focusedObject.position.clone();
        
        // カメラの現在の天体からの相対位置を計算
        const currentOffset = camera.position.clone().sub(controls.target);
        
        // 新しいカメラ位置を計算（天体の位置 + 現在のオフセット）
        const newCameraPosition = targetPosition.clone().add(currentOffset);
        
        // カメラ位置と注視点を滑らかに更新
        const lerpFactor = 0.1; // 補間係数（0.1 = 10%ずつ近づく）
        camera.position.lerp(newCameraPosition, lerpFactor);
        controls.target.lerp(targetPosition, lerpFactor);
        
        // 注意: focusedObjectはnullに戻さず、ユーザーが他の天体をクリックするか
        // ESCキーを押すまでフォーカスを維持する
    } else {
        // focusedObjectがクリアされた場合、デバッグフラグもリセット
        gameState._debugFocusLogged = false;
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
    
    // レンダリングが一時停止されていない場合のみレンダリング処理を実行
    if (!graphicsEngine.isPaused) {
        // NaNエラーのデバッグ用にtry-catchを追加
        try {
            // ポストプロセッシングが有効な場合はcomposerを使用、無効な場合は直接レンダリング
            if (graphicsEngine.isPostProcessingEnabled()) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
            
            // Render to secondary view if dual view is active
            graphicsEngine.renderSecondary();
        } catch (error) {
            console.error('[RENDER] Error during rendering:', error);
            // エラーが続く場合はポストプロセッシングを無効化
            if (error instanceof TypeError && error.message.includes('uniform')) {
                console.warn('[RENDER] Disabling post-processing due to uniform errors');
                graphicsEngine.setPostProcessingEnabled(false);
                // 次のフレームから直接レンダリングを試みる
                try {
                    renderer.render(scene, camera);
                } catch (e) {
                    console.error('[RENDER] Direct rendering also failed:', e);
                }
            }
        }
    }
    
    // Debug: Check if scene has objects
    if (animationCount === 1) {
        console.log('[RENDER] Scene children count:', scene.children.length);
        console.log('[RENDER] Camera position:', camera.position);
        console.log('[RENDER] Stars count:', gameState.stars.length);
    }
    
    // マテリアルの問題をデバッグ
    if (animationCount % 300 === 0) { // 5秒ごとにチェック
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
                const material = child.material as any;
                if (material) {
                    // マテリアルの種類を確認
                    if (!material.type) {
                        console.warn('[DEBUG] Material without type found:', child.name || child.uuid);
                    }
                    // uniformsがある場合はチェック
                    if (material.uniforms) {
                        for (const key in material.uniforms) {
                            if (material.uniforms[key] === undefined || material.uniforms[key] === null) {
                                console.error('[DEBUG] Undefined uniform found:', key, 'in object:', child.name || child.uuid);
                            } else if (material.uniforms[key].value === undefined) {
                                console.error('[DEBUG] Uniform without value:', key, 'in object:', child.name || child.uuid);
                            }
                        }
                    }
                }
            }
        });
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
        
        // Update celestial creation UI
        celestialCreationUI.update();
        
        uiUpdateTimer = 0;
    }
    
    updateStatistics();
    
    galaxyMapUpdateTimer += deltaTime;
    if (galaxyMapUpdateTimer >= galaxyMapUpdateInterval) {
        debouncedUpdateGalaxyMap();
        galaxyMapUpdateTimer = 0;
    }
    
    // Update star management UI
    starManagementUI.update();
    
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
        
        // パラゴンシステムのエンドゲーム条件チェックも同時に実行
        paragonSystem.checkEndgameConditions();
        
        // 無限資源の自動解放チェック
        infiniteResourceSystem.checkAutoUnlocks();
    }
}

async function init() {
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
    
    // Initialize paragon system
    paragonUI.init();
    console.log('[INIT] Paragon system initialized');
    
    // Initialize infinite resource system
    infiniteResourceUI.init();
    console.log('[INIT] Infinite resource system initialized');
    
    // Initialize mythic rarity system
    mythicRarityUI.init();
    // メニューボタンは追加しない（メニューシステムに統合済み）
    console.log('[INIT] Mythic rarity system initialized');
    
    // Initialize multiverse system
    multiverseSystem.init();
    multiverseUI.init();
    console.log('[INIT] Multiverse system initialized');
    
    // Initialize research path finder UI
    (window as any).researchPathFinderUI = researchPathFinderUI;
    console.log('[INIT] Research path finder UI initialized');
    
    // Initialize endgame progress UI
    endgameProgressUI.init();
    console.log('[INIT] Endgame progress UI initialized');
    
    // Expose systems globally
    (window as any).prestigeUI = prestigeUI;
    (window as any).prestigeSystem = prestigeSystem;
    (window as any).phaseManager = phaseManager;
    (window as any).phaseUI = phaseUI;
    (window as any).unlockManager = unlockManager;
    (window as any).tutorialSystem = tutorialSystem;
    (window as any).paragonSystem = paragonSystem;
    (window as any).paragonUI = paragonUI;
    (window as any).infiniteResourceSystem = infiniteResourceSystem;
    (window as any).infiniteResourceUI = infiniteResourceUI;
    (window as any).mythicRaritySystem = mythicRaritySystem;
    (window as any).mythicRarityUI = mythicRarityUI;
    (window as any).tutorialUI = tutorialUI;
    (window as any).productionAnalyzer = productionAnalyzer;
    (window as any).productionAnalysisUI = productionAnalysisUI;
    (window as any).graphicsEngine = graphicsEngine;
    (window as any).multiverseUI = multiverseUI;
    (window as any).endgameProgressUI = endgameProgressUI;
    
    // Initialize menu system
    menuSystem.init();
    menuSystem.hideExistingButtons();
    console.log('[INIT] Menu system initialized');
    
    // Initialize stats panel
    statsPanel.initialize();
    console.log('[INIT] Stats panel initialized');
    
    // オプション画面をwindowに追加（プレビュー更新のため）
    const { optionsScreen } = await import('./js/systems/optionsScreen.js');
    (window as any).optionsScreen = optionsScreen;
    
    // Initialize endgame progress UI (but don't show it)
    endgameProgressUI.init();
    endgameProgressUI.hide(); // 初期状態では非表示
    console.log('[INIT] Endgame progress UI initialized (hidden)');
    
    // Initialize UI position manager
    uiPositionManager.init();
    console.log('[INIT] UI position manager initialized');
    
    // Start checking endgame conditions periodically
    setInterval(() => {
        paragonSystem.checkEndgameConditions();
    }, 5000); // Check every 5 seconds
    
    // Initialize render optimizer
    renderOptimizer = RenderOptimizer.getInstance(renderer, scene, camera);
    console.log('[INIT] Render optimizer initialized');
    
    // Initialize LOD manager
    lodManager = LODManager.getInstance(camera);
    console.log('[INIT] LOD manager initialized');
    
    // Expose LOD manager globally for event handlers
    (window as any).lodManager = lodManager;
    
    // Initialize balance debug UI (F4 to toggle)
    console.log('[INIT] Balance debug UI initialized (Press F4 to toggle)');
    
    // Force balance config to use new values if old values are detected
    const currentConfig = balanceManager.getConfig();
    if (currentConfig.resourceRates.cosmicDust.base === 1) {
        console.log('[BALANCE] Old dust rate detected, resetting to new defaults...');
        balanceManager.resetToDefaults();
    }
    
    // Test balance manager directly
    console.log('[BALANCE] Testing getResourceRate:', {
        level0: balanceManager.getResourceRate('cosmicDust', 0),
        level1: balanceManager.getResourceRate('cosmicDust', 1),
        config: balanceManager.getConfig().resourceRates.cosmicDust
    });
    
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
            mass: 1e8,  // 10倍に増加した質量
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
        const blackHoleMass = blackHole.userData.mass || 1e8;
        const G = physicsConfig.getPhysics().G;
        
        // v = sqrt(G * M / r) for circular orbit
        const baseOrbitalSpeed = Math.sqrt(G * blackHoleMass / orbitalRadius);
        const speedMultiplier = physicsConfig.getOrbitalMechanics().orbitalSpeedMultiplier;
        // 速度調整係数を削除し、speedMultiplier のみ使用
        const orbitalSpeed = baseOrbitalSpeed * speedMultiplier;
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
            velocity: new THREE.Vector3(0, 0, orbitalSpeed),
            // positionは意図的に指定しない
            // 恒星の必須プロパティを明示的に設定
            userData: {
                type: 'star',
                name: 'Alpha Centauri',
                mass: 2000,
                temperature: 5778,  // 太陽と同じ温度
                spectralType: 'yellow',
                age: '45',  // 45億年
                lifespan: 100  // 100億年の寿命
            }
        });
        
        // 恒星作成直後に位置を設定
        initialStar.position.set(orbitalRadius, 0, 0);
        
        // 速度ベクトルも正しく設定（位置に対して垂直方向）
        if (initialStar.userData.velocity) {
            initialStar.userData.velocity = new THREE.Vector3(0, 0, orbitalSpeed);
        }
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
            
            // 開発環境で廃止予定要素をマーク
            if (import.meta.env.DEV) {
                markDeprecatedElements();
                console.log('💡 ヒント: __checkDeprecated() で廃止予定要素の使用状況を確認できます');
            }
            
            // Add performance monitor toggle (F3 key)
            document.addEventListener('keydown', (e) => {
                if (e.key === 'F3') {
                    e.preventDefault();
                    newPerformanceMonitor.toggle();
                }
            });
            
            // デバッグボタンのイベントリスナーを追加
            const debugResourcesBtn = document.getElementById('debug-resources-btn');
            if (debugResourcesBtn) {
                debugResourcesBtn.addEventListener('click', () => {
                    console.log('[DEBUG] Adding 1000 resources');
                    const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
                    resources.forEach(resource => {
                        balanceAdjustments.debugSetResource(resource, 
                            (gameState.resources as any)[resource] + 1000
                        );
                    });
                    updateUI(gameState);
                });
            }
            
            const debugPanelBtn = document.getElementById('debug-panel-btn');
            if (debugPanelBtn) {
                debugPanelBtn.addEventListener('click', () => {
                    console.log('[DEBUG] Toggling debug panel');
                    balanceDebugUI.toggle();
                });
            }
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
        
        // デバッグボタンのイベントリスナーを追加
        const debugResourcesBtn = document.getElementById('debug-resources-btn');
        if (debugResourcesBtn) {
            debugResourcesBtn.addEventListener('click', () => {
                console.log('[DEBUG] Adding 1000 resources');
                const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
                resources.forEach(resource => {
                    balanceAdjustments.debugSetResource(resource, 
                        (gameState.resources as any)[resource] + 1000
                    );
                });
                updateUI(gameState);
            });
        }
        
        const debugPanelBtn = document.getElementById('debug-panel-btn');
        if (debugPanelBtn) {
            debugPanelBtn.addEventListener('click', () => {
                console.log('[DEBUG] Toggling debug panel');
                balanceDebugUI.toggle();
            });
        }
        
        initializeResearchLab();
        initializeInventory();
        
        // Initialize Dual View System
        initializeDualViewSystem();
        
        // Initialize Production Chain Visualizer buttons
        const chainButton = document.getElementById('productionChainToggleButton');
        const chainButtonMobile = document.getElementById('productionChainToggleButton-mobile');
        
        chainButton?.addEventListener('click', () => {
            productionChainVisualizerUI.open();
        });
        
        chainButtonMobile?.addEventListener('click', () => {
            productionChainVisualizerUI.open();
        });
        
        // Add batch conversion button event listeners
        const batchButton = document.getElementById('batchConversionToggleButton');
        const batchButtonMobile = document.getElementById('batchConversionToggleButton-mobile');
        
        batchButton?.addEventListener('click', () => {
            batchConversionUI.show();
        });
        
        batchButtonMobile?.addEventListener('click', () => {
            batchConversionUI.show();
        });
        
        // Make visualizers globally accessible
        (window as any).productionChainVisualizerUI = productionChainVisualizerUI;
        (window as any).researchTreeVisualizerUI = researchTreeVisualizerUI;
        (window as any).batchConversionUI = batchConversionUI;
        (window as any).conversionRecipeUI = conversionRecipeUI;
        (window as any).gameState = gameState;
        (window as any).scene = scene;
        
        // デバッグ用：恒星作成テスト関数
        (window as any).testCreateStar = () => {
            console.log('[TEST] Testing star creation...');
            
            const cost = 100000;
            // リソースを追加
            gameStateManager.updateState(state => ({
                ...state,
                cosmicDust: state.cosmicDust + cost,
                resources: {
                    ...state.resources,
                    cosmicDust: state.resources.cosmicDust + cost
                }
            }));
            console.log('[TEST] Added resources:', gameState.resources.cosmicDust);
            
            const starName = 'テスト恒星';
            
            // Import and use CelestialBodyFactory
            import('./js/celestialBodyFactory.js').then(({ CelestialBodyFactory }) => {
                import('./js/physicsConfig.js').then(({ physicsConfig }) => {
                    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
                    const radius = 7000 + Math.random() * 18000;
                    const angle = Math.random() * Math.PI * 2;
                    const position = new THREE.Vector3(
                        radius * Math.cos(angle), 
                        0,  // 高さを0に固定
                        radius * Math.sin(angle)
                    );
                    
                    let velocity = new THREE.Vector3(0, 0, 0);
                    if (blackHole) {
                        const blackHoleMass = blackHole.userData.mass || 1e8;
                        const G = physicsConfig.getPhysics().G;
                        const orbitalSpeed = Math.sqrt((G * blackHoleMass) / radius) * 1.0;
                        velocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
                    }
                    
                    const result = CelestialBodyFactory.create('star', {
                        name: starName,
                        position,
                        velocity
                    });
                    
                    console.log('[TEST] Create result:', result);
                    
                    if (result.ok) {
                        scene.add(result.value);
                        gameState.stars.push(result.value);
                        console.log('[TEST] Star created successfully!', result.value);
                        alert('恒星が作成されました！');
                    } else {
                        console.error('[TEST] Failed to create star:', result);
                        console.error('[TEST] Error details:', {
                            error: result.error,
                            message: result.error?.message,
                            details: result.error?.details
                        });
                        alert(`恒星の作成に失敗しました: ${result.error?.message || 'Unknown error'}`);
                    }
                });
            });
        };
        
        // Test function for modern UI
        (window as any).testModernUI = () => {
            console.log('[UI] testModernUI called');
            const recipeListEmbed = document.getElementById('conversion-recipes-list-embed');
            if (recipeListEmbed) {
                recipeListEmbed.innerHTML = `
                    <div style="
                        background: #ff00ff !important;
                        color: #ffffff !important;
                        padding: 40px !important;
                        font-size: 24px !important;
                        text-align: center !important;
                        border: 5px solid #00ff00 !important;
                        margin: 20px 0 !important;
                    ">
                        🎉 モダンUIが読み込まれました！🎉<br>
                        <span style="font-size: 16px;">onclickから直接呼び出されました。</span>
                    </div>
                `;
                
                // フラグを設定
                (window as any).modernRecipeUIActiveEmbed = true;
                
                // 少し遅延してからモダンUIを初期化
                setTimeout(() => {
                    console.log('[UI] Initializing modern recipe UI from testModernUI');
                    conversionRecipeUI.init(true);
                }, 100);
            } else {
                console.error('[UI] Recipe list embed not found');
            }
        };
        
        // Function to toggle modern recipe UI
        (window as any).toggleModernRecipeUI = () => {
            console.log('[UI] Toggle modern recipe UI called');
            const recipeList = document.getElementById('conversion-recipes-list');
            if (recipeList) {
                (window as any).modernRecipeUIActive = true;
                conversionRecipeUI.init();
                
                // Hide toggle button after activation
                const toggleBtn = document.getElementById('toggle-modern-recipe-ui');
                if (toggleBtn) {
                    toggleBtn.style.display = 'none';
                }
                
                // Show success message
                showMessage('✨ モダンUIが有効になりました！', 3000);
            }
        };
        
        // Modern Recipe UI toggle - delay to ensure DOM is ready
        setTimeout(() => {
            // 通常版のボタン
            const modernRecipeToggle = document.getElementById('toggle-modern-recipe-ui');
            console.log('[UI] Modern recipe toggle button:', modernRecipeToggle);
            if (modernRecipeToggle) {
                modernRecipeToggle.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent header click
                    console.log('[UI] Modern recipe toggle clicked');
                    const recipeList = document.getElementById('conversion-recipes-list');
                    if (recipeList) {
                        console.log('[UI] Initializing modern recipe UI');
                        // Set flag to prevent old UI from updating
                        (window as any).modernRecipeUIActive = true;
                        // Initialize the modern UI when first clicked
                        conversionRecipeUI.init(false);
                    }
                });
            }
            
            // 埋め込み版のボタン
            const modernRecipeToggleEmbed = document.getElementById('toggle-modern-recipe-ui-embed');
            console.log('[UI] Modern recipe toggle button (embed):', modernRecipeToggleEmbed);
            if (modernRecipeToggleEmbed) {
                modernRecipeToggleEmbed.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent header click
                    console.log('[UI] Modern recipe toggle clicked (embed)');
                    const recipeListEmbed = document.getElementById('conversion-recipes-list-embed');
                    if (recipeListEmbed) {
                        console.log('[UI] Initializing modern recipe UI (embed)');
                        // Set flag to prevent old UI from updating
                        (window as any).modernRecipeUIActiveEmbed = true;
                        // Initialize the modern UI when first clicked - embed mode
                        conversionRecipeUI.init(true);
                    }
                });
            }
        }, 1000);
        
        // 埋め込み版のボタンは後から作成されるので、定期的にチェック
        let embedCheckInterval = setInterval(() => {
            const modernRecipeToggleEmbed = document.getElementById('toggle-modern-recipe-ui-embed');
            if (modernRecipeToggleEmbed && !modernRecipeToggleEmbed.hasAttribute('data-listener-attached')) {
                console.log('[UI] Found embed button, attaching listener');
                modernRecipeToggleEmbed.setAttribute('data-listener-attached', 'true');
                
                modernRecipeToggleEmbed.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('[UI] Modern recipe toggle clicked (embed) - from interval check');
                    
                    // 直接テスト内容を表示
                    const recipeListEmbed = document.getElementById('conversion-recipes-list-embed');
                    if (recipeListEmbed) {
                        recipeListEmbed.innerHTML = `
                            <div style="
                                background: #ff00ff !important;
                                color: #ffffff !important;
                                padding: 40px !important;
                                font-size: 24px !important;
                                text-align: center !important;
                                border: 5px solid #00ff00 !important;
                                margin: 20px 0 !important;
                            ">
                                🎉 モダンUIが読み込まれました！🎉<br>
                                <span style="font-size: 16px;">ボタンクリックが正常に動作しています。</span>
                            </div>
                        `;
                        
                        // フラグを設定
                        (window as any).modernRecipeUIActiveEmbed = true;
                        
                        // 少し遅延してからモダンUIを初期化
                        setTimeout(() => {
                            console.log('[UI] Initializing modern recipe UI (embed)');
                            conversionRecipeUI.init(true);
                        }, 100);
                    }
                });
                
                // インターバルをクリア
                clearInterval(embedCheckInterval);
            }
        }, 500);
        
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

// Test notification functions for debugging
(window as any).testNotifications = {
    showToast: (message: string = 'Test notification', type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const feedbackSystem = (window as any).feedbackSystem;
        if (feedbackSystem) {
            feedbackSystem.showToast({ message, type });
            console.log('[TEST] Toast notification triggered:', message, type);
        } else {
            console.error('[TEST] FeedbackSystem not initialized');
        }
    },
    showAchievement: (name: string = 'Test Achievement', description: string = 'You unlocked a test achievement!') => {
        const feedbackSystem = (window as any).feedbackSystem;
        if (feedbackSystem) {
            feedbackSystem.showAchievementUnlocked({ name, description, icon: '🏆' });
            console.log('[TEST] Achievement notification triggered:', name);
        } else {
            console.error('[TEST] FeedbackSystem not initialized');
        }
    },
    showEventBanner: (title: string = 'Test Event', message: string = 'This is a test event banner') => {
        const feedbackSystem = (window as any).feedbackSystem;
        if (feedbackSystem) {
            feedbackSystem.showEventBanner(title, message, 'info');
            console.log('[TEST] Event banner triggered:', title);
        } else {
            console.error('[TEST] FeedbackSystem not initialized');
        }
    }
};
console.log('[TEST] Notification test functions available: testNotifications.showToast(), testNotifications.showAchievement(), testNotifications.showEventBanner()');
