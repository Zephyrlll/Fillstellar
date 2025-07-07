
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
                            let thoughtPointRate = (((body.userData as PlanetUserData).population || 0) / 1000000) * (1 + gameState.cosmicActivity / 10000);
                            gameState.thoughtPoints += thoughtPointRate * deltaTime;
                            break;
                    }
                    gameState.organicMatter += organicRate * deltaTime;
                    gameState.biomass += biomassRate * deltaTime;
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
    composer.render();

    uiUpdateTimer += deltaTime;
    if (uiUpdateTimer >= uiUpdateInterval) {
        updateUI();
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

    setupEventListeners();
    animate();
}

init();
