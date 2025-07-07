import * as THREE from 'three';
import { scene, camera, renderer, composer, controls } from './js/threeSetup.js';
import { gameState } from './js/state.js';
import { saveGame, loadGame } from './js/saveload.js';
import { ui, updateUI, switchTab, showMessage, debouncedUpdateGalaxyMap } from './js/ui.js';
import { createCelestialBody, checkLifeSpawn, evolveLife } from './js/celestialBody.js';
import { spatialGrid, updatePhysics } from './js/physics.js';
import { updateStatistics, switchChart } from './js/statistics.js';
import { addTimelineLog, clearTimelineLog } from './js/timeline.js';
import { GALAXY_BOUNDARY } from './js/constants.js';
import { mathCache, starGeometry } from './js/utils.js';
import { setupEventListeners, keys, focusedStar } from './js/events.js';

// --- グローバル変数 & 物理定数 ------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


const moveSpeed = 200; // 移動速度を調整
const RESTORING_FORCE_FACTOR = 0.001; // 復元力の係数

let uiUpdateTimer = 0; // UI更新用タイマー
const uiUpdateInterval = 0.1; // 0.1秒ごとにUIを更新

// Galaxy map debouncing
let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2; // Update galaxy map every 0.2 seconds (slower than UI)

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
    const starsVertices = [];
    // 密度を減らし（20000→8000）、範囲を拡大（8000→20000）
    for (let i = 0; i < 8000; i++) {
        const x = (Math.random() - 0.5) * 20000;
        const y = (Math.random() - 0.5) * 20000;
        const z = (Math.random() - 0.5) * 20000;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starfield = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starfield);
}

function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    
    // 安全なtimeStep計算
    const rawDeltaTime = (now - gameState.lastTick) / 1000;
    if (!isFinite(rawDeltaTime) || rawDeltaTime < 0 || rawDeltaTime > 1) {
        gameState.lastTick = now;
        return; // 異常な値の場合はこのフレームをスキップ
    }
    
    // 時間倍率の安全な取得
    let timeMultiplier = 1;
    if (gameState.currentTimeMultiplier && typeof gameState.currentTimeMultiplier === 'string') {
        const multiplierValue = parseInt(gameState.currentTimeMultiplier.replace('x', ''));
        if (isFinite(multiplierValue) && multiplierValue > 0 && multiplierValue <= 10) {
            timeMultiplier = multiplierValue;
        }
    }
    
    const deltaTime = rawDeltaTime * timeMultiplier;
    const animationDeltaTime = deltaTime * 0.05; // アニメーション用の時間
    
    // デバッグ用ログ（一時的）
    if (!isFinite(animationDeltaTime) || animationDeltaTime <= 0) {
        console.warn('Invalid animationDeltaTime:', {
            rawDeltaTime,
            timeMultiplier,
            deltaTime,
            animationDeltaTime,
            currentTimeMultiplier: gameState.currentTimeMultiplier
        });
        gameState.lastTick = now;
        return;
    }
    
    gameState.lastTick = now;

    gameState.gameYear += deltaTime / 5; // ゲーム内時間は元の速度
    updatePhysics(animationDeltaTime); // 物理演算はアニメーション速度に合わせる
    
    // 宇���活発度を計算（天体の平均速度から）
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
    } else {
        gameState.cosmicActivity = 0;
    }

    let dustRate = 1 + gameState.dustUpgradeLevel * 0.5 + (gameState.researchEnhancedDust ? 2 : 0);
    let energyRate = 0;
    let intelligentLifeCount = 0;
    let totalPopulation = 0; // Add population tracking to eliminate UI loop

    // Clear spatial grid once before the combined loop
    spatialGrid.clear();
    
    // Combined optimized loop - consolidates multiple forEach iterations
    gameState.stars.forEach(body => {
        // Spatial grid insertion (previously separate forEach in updatePhysics)
        spatialGrid.insert(body);
        
        // Rotation update
        body.rotation.y += 0.3 * animationDeltaTime;

        // Population tracking for UI (eliminates separate UI forEach)
        if (body.userData.hasLife) {
            totalPopulation += body.userData.population;
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
                // updateGeology(body, deltaTime);
                // updateClimate(body, deltaTime);
                if (body.userData.hasLife) {
                    let organicRate = 0, biomassRate = 0, populationGrowthRate = 0;
                    switch (body.userData.lifeStage) {
                        case 'microbial':
                            organicRate = 0.1; populationGrowthRate = 0.01; break;
                        case 'plant':
                            organicRate = 0.5; biomassRate = 0.1; populationGrowthRate = 0.05; break;
                        case 'animal':
                            organicRate = 0.8; biomassRate = 0.3; populationGrowthRate = 0.1; break;
                        case 'intelligent':
                            organicRate = 1.0; biomassRate = 0.5; populationGrowthRate = 0.5;
                            intelligentLifeCount++;
                            let thoughtPointRate = (body.userData.population / 1000000) * (1 + gameState.cosmicActivity / 10000);
                            gameState.thoughtPoints += thoughtPointRate * deltaTime;
                            break;
                    }
                    gameState.organicMatter += organicRate * deltaTime;
                    gameState.biomass += biomassRate * deltaTime;
                    body.userData.population += body.userData.population * populationGrowthRate * deltaTime;
                }
                break;
        }
    });
    
    // Store population for UI (eliminates UI forEach loop)
    gameState.cachedTotalPopulation = totalPopulation;

    if (gameState.researchAdvancedEnergy) energyRate *= 2;
    
    // 塵の生成レートを保存（UI表示用）
    gameState.currentDustRate = dustRate;

    // 思考速度の計算 (思考ポイントに基づいて指数関数的に増加) - use cached calculation
    gameState.thoughtSpeedMps = mathCache.getThoughtSpeed();

    // リソースの蓄積と加算
    gameState.resourceAccumulators.cosmicDust += dustRate * deltaTime;
    gameState.resourceAccumulators.energy += energyRate * deltaTime;

    if (gameState.resourceAccumulators.cosmicDust >= 1) {
        const dustToAdd = Math.floor(gameState.resourceAccumulators.cosmicDust);
        gameState.cosmicDust += dustToAdd;
        gameState.resourceAccumulators.cosmicDust -= dustToAdd;
    }
    if (gameState.resourceAccumulators.energy >= 1) {
        const energyToAdd = Math.floor(gameState.resourceAccumulators.energy);
        gameState.energy += energyToAdd;
        gameState.resourceAccumulators.energy -= energyToAdd;
    }

    // WASDによるカメラ移動
    if (keys.w) camera.position.z -= moveSpeed * animationDeltaTime;
    if (keys.s) camera.position.z += moveSpeed * animationDeltaTime;
    if (keys.a) camera.position.x -= moveSpeed * animationDeltaTime;
    if (keys.d) camera.position.x += moveSpeed * animationDeltaTime;

    // カメラの滑らかな追従
    if (gameState.focusedObject) {
        const offset = camera.position.clone().sub(controls.target);
        controls.target.lerp(gameState.focusedObject.position, 0.05);
        camera.position.copy(controls.target).add(offset);
    }

    // ブラックホールのエッジグローをカメラに向ける
    const edgeGlow = scene.getObjectByName('black_hole_edge_glow');
    if (edgeGlow) {
        edgeGlow.lookAt(camera.position);
    }

    controls.update();
    composer.render();

    uiUpdateTimer += deltaTime;
    if (uiUpdateTimer >= uiUpdateInterval) {
        updateUI();
        uiUpdateTimer = 0;
    }
    
    // 統計更新（1秒間隔）
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

    // Check if black hole exists, if not, create it (for new games)
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

    // Always focus on the black hole at startup
    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    if (blackHole) {
        gameState.focusedObject = blackHole;
    }

    setupEventListeners();
    animate();
}

init();
