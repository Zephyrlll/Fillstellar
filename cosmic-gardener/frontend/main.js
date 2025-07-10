import * as THREE from 'three';
import { scene, camera, composer, controls } from './js/threeSetup.js';
import { gameState } from './js/state.js';
import { loadGame } from './js/saveload.js';
import { updateUI, debouncedUpdateGalaxyMap } from './js/ui.js';
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
const moveSpeed = 200;
let uiUpdateTimer = 0;
const uiUpdateInterval = 0.1;
let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2;
// WebSocketクライアント
let wsClient = null;
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
    const starsVertices = [];
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
    if (keys.w)
        camera.position.z -= moveSpeed * animationDeltaTime;
    if (keys.s)
        camera.position.z += moveSpeed * animationDeltaTime;
    if (keys.a)
        camera.position.x -= moveSpeed * animationDeltaTime;
    if (keys.d)
        camera.position.x += moveSpeed * animationDeltaTime;
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
    composer.render();
    uiUpdateTimer += deltaTime;
    if (uiUpdateTimer >= uiUpdateInterval) {
        updateUI();
        updateProductionUI();
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
    console.log('🎮 Game initializing...');
    createStarfield();
    loadGame();
    // Initialize production UI
    console.log('🏭 About to initialize production UI...');
    initProductionUI();
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
            x: 0, y: 0, z: -1 // カメラの向き
        });
    };
    // 最初のクリックでサウンドを初期化
    document.addEventListener('click', initSound, { once: true });
    document.addEventListener('keydown', initSound, { once: true });
    setupEventListeners();
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
    // 接続を開始
    wsClient.connect();
    animate();
}
init();
