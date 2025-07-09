
import * as THREE from 'three';
import { scene, camera, renderer, composer, controls } from './js/threeSetup.js';
import { gameState, PlanetUserData } from './js/state.js';
import { saveGame, loadGame } from './js/saveload.js';
import { updateUI, debouncedUpdateGalaxyMap } from './js/ui.js';
import { createCelestialBody, checkLifeSpawn, evolveLife } from './js/celestialBody.js';
import { spatialGrid, updatePhysics } from './js/physics.js';
import { updateStatistics } from './js/statistics.js';
import { GALAXY_BOUNDARY } from './js/constants.js';
import { mathCache } from './js/utils.js';
import { setupEventListeners, keys } from './js/events.js';
import { soundManager } from './js/sound.js';
import { checkAchievements } from './js/achievements.js';

const moveSpeed = 200;

let uiUpdateTimer = 0;
const uiUpdateInterval = 0.1;

let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2;

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
                            // 思考ポイント生成の段階化: 収穫逓減を実装
                            const population = (body.userData as PlanetUserData).population || 0;
                            const baseRate = population / 1000000;
                            // 収穫逓減: 人口が多いほど効率が下がる
                            const diminishingFactor = 1 / (1 + Math.log(Math.max(population / 1000000, 1)) / 10);
                            const adjustedRate = baseRate * diminishingFactor;
                            let thoughtPointRate = adjustedRate * (1 + gameState.cosmicActivity / 10000);
                            gameState.thoughtPoints += thoughtPointRate * deltaTime;
                            break;
                    }
                    let finalOrganicRate = organicRate;
                    let finalBiomassRate = biomassRate;
                    
                    // リソース倍増研究の効果
                    if (gameState.researchResourceMultiplier) {
                        finalOrganicRate *= 2;
                        finalBiomassRate *= 2;
                    }
                    
                    gameState.organicMatter += finalOrganicRate * deltaTime;
                    gameState.biomass += finalBiomassRate * deltaTime;
                    // 人口増加率の調整: 指数関数的→対数関数的に変更
                    const currentPopulation = (body.userData as PlanetUserData).population || 0;
                    const habitability = (body.userData as PlanetUserData).habitability || 50;
                    const populationCap = habitability * 1000000; // 居住可能性に基づく人口上限
                    
                    // 対数関数的な増加（人口が多いほど増加率が減少）
                    // 人口上限に近づくほど増加率が減少するロジスティック成長
                    const populationRatio = currentPopulation / populationCap;
                    const logGrowthFactor = Math.max(0.1, 1 - populationRatio); // 最低10%の増加率を保持
                    let adjustedGrowthRate = populationGrowthRate * logGrowthFactor;
                    
                    // 人口効率化研究の効果
                    if (gameState.researchPopulationEfficiency) {
                        adjustedGrowthRate *= 1.5;
                    }
                    
                    const newPopulation = currentPopulation + currentPopulation * adjustedGrowthRate * deltaTime;
                    (body.userData as PlanetUserData).population = Math.min(newPopulation, populationCap);
                }
                break;
        }
    });
    
    gameState.cachedTotalPopulation = totalPopulation;

    if (gameState.researchAdvancedEnergy) energyRate *= 2;
    
    // リソース倍増研究の効果
    if (gameState.researchResourceMultiplier) {
        dustRate *= 2;
        energyRate *= 2;
    }
    
    gameState.currentDustRate = dustRate;

    gameState.thoughtSpeedMps = mathCache.getThoughtSpeed();

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
    
    composer.render();

    uiUpdateTimer += deltaTime;
    if (uiUpdateTimer >= uiUpdateInterval) {
        updateUI();
        console.log(`[DEBUG] About to call checkAchievements from animation loop`);
        checkAchievements(); // 実績チェックをUIアップデート時に実行
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
    console.log(`[DEBUG] init() started at ${new Date().toISOString()}`);
    createStarfield();
    console.log(`[DEBUG] Setting isInitializing = true`);
    gameState.isInitializing = true;
    console.log(`[DEBUG] Loading game...`);
    loadGame();
    console.log(`[DEBUG] Game loaded. Stars count: ${gameState.stars.length}`);

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

    // 新規ゲームの場合、初期恒星を1つ付与
    const hasStars = gameState.stars.some(star => star.userData.type === 'star');
    if (!hasStars && gameState.gameYear === 0) {
        const initialStar = createCelestialBody('star', {
            name: 'Starter Star',
            mass: 100,
            radius: 10,
            position: new THREE.Vector3(1500, 0, 0), // ブラックホール(半径500)から十分離れた位置
            velocity: new THREE.Vector3(0, 0, 20)
        });
        gameState.stars.push(initialStar);
        scene.add(initialStar);
        
        // 初期恒星作成後、「最初の恒星」実績を未完了にリセット
        const firstStarAchievement = gameState.achievements.find(a => a.id === 'first_star');
        if (firstStarAchievement) {
            firstStarAchievement.isCompleted = false;
            firstStarAchievement.progress = 0;
            firstStarAchievement.unlockedAt = undefined;
        }
        
        // 恒星の研究は自動的に解除しない（研究可能なまま残す）
        // gameState.unlockedCelestialBodies.star = true;
    }

    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    if (blackHole) {
        gameState.focusedObject = blackHole;
    }

    // サウンドシステムの初期化（ユーザーインタラクション後）
    const initSound = async () => {
        console.log(`[DEBUG] Initializing sound system`);
        await soundManager.init();
        // カメラ位置に基づいてリスナー位置を更新
        soundManager.updateListenerPosition(camera.position, {
            x: 0, y: 0, z: -1  // カメラの向き
        });
    };
    
    // 最初のクリックでサウンドを初期化
    document.addEventListener('click', initSound, { once: true });
    document.addEventListener('keydown', initSound, { once: true });
    
    console.log(`[DEBUG] Sound event listeners added`);

    setupEventListeners();
    gameState.isInitializing = false;
    animate();
}

init();
