import * as THREE from 'three';
import { gameState } from './state.js';
import { removeAndDispose, celestialObjectPools } from './utils.js';
import { createCelestialBody } from './celestialBody.js';
import { scene } from './threeSetup.js';
import { conversionEngine } from './conversionEngine.js';
export function saveGame() {
    const savableStars = gameState.stars.map(star => {
        const { tail, ...serializableUserData } = star.userData;
        const safeVelocity = serializableUserData.velocity && isFinite(serializableUserData.velocity.x) && isFinite(serializableUserData.velocity.y) && isFinite(serializableUserData.velocity.z)
            ? serializableUserData.velocity.toArray()
            : [0, 0, 0];
        const safeAcceleration = serializableUserData.acceleration && isFinite(serializableUserData.acceleration.x) && isFinite(serializableUserData.acceleration.y) && isFinite(serializableUserData.acceleration.z)
            ? serializableUserData.acceleration.toArray()
            : [0, 0, 0];
        return {
            position: star.position.toArray(),
            uuid: star.uuid,
            userData: {
                ...serializableUserData,
                velocity: safeVelocity,
                acceleration: safeAcceleration
            }
        };
    });
    const savableState = { ...gameState, stars: savableStars };
    if (savableState.focusedObject && savableState.focusedObject.uuid) {
        savableState.focusedObjectUUID = savableState.focusedObject.uuid;
    }
    delete savableState.focusedObject;
    // Convert Sets to Arrays for serialization
    savableState.discoveredTechnologies = Array.from(gameState.discoveredTechnologies);
    savableState.availableFacilities = Array.from(gameState.availableFacilities);
    // Save conversion engine state
    savableState.conversionEngineState = conversionEngine.saveState();
    // Update save version for new resource system and graphics settings
    savableState.saveVersion = '2.1-graphics-system';
    localStorage.setItem('cosmicGardenerState', JSON.stringify(savableState));
}
export function loadGame() {
    const savedState = localStorage.getItem('cosmicGardenerState');
    if (!savedState)
        return;
    let parsedState;
    try {
        parsedState = JSON.parse(savedState);
    }
    catch (e) {
        console.error("Failed to parse saved state:", e);
        return;
    }
    // Handle save version migration
    if (parsedState.saveVersion === '1.6-accumulator') {
        // Migrate from old version to new version with resources
        parsedState.resources = {
            cosmicDust: parsedState.cosmicDust || 0,
            energy: parsedState.energy || 0,
            organicMatter: parsedState.organicMatter || 0,
            biomass: parsedState.biomass || 0,
            darkMatter: parsedState.darkMatter || 0,
            thoughtPoints: parsedState.thoughtPoints || 0
        };
        parsedState.advancedResources = {};
        parsedState.discoveredTechnologies = [];
        parsedState.availableFacilities = ['basic_converter'];
        parsedState.saveVersion = '2.0-resource-system';
    }
    if (parsedState.saveVersion === '2.0-resource-system') {
        // Migrate to graphics system version
        // 🔧 Preserve current resolution scale to fix 1-second reset bug
        const currentResolutionScale = gameState.graphics?.resolutionScale || 1.0;
        console.log(`🔧 Migration: preserving current resolutionScale = ${currentResolutionScale}`);
        
        parsedState.graphics = {
            preset: 'custom', // 🔧 Always set to custom to prevent auto-preset overrides
            resolutionScale: currentResolutionScale,
            textureQuality: 'medium',
            shadowQuality: 'medium',
            antiAliasing: 'fxaa',
            postProcessing: 'medium',
            particleDensity: 0.5,
            viewDistance: 'medium',
            frameRateLimit: 60,
            vsync: 'adaptive',
            lightingQuality: 'medium',
            fogEffect: 'standard',
            renderPrecision: 'standard',
            objectDetail: 'medium',
            backgroundDetail: 'standard',
            uiAnimations: 'standard',
            performance: {
                fps: 0,
                frameTime: 0,
                memoryUsage: 0,
                gpuUsage: 0,
                averageFps: 60,
                history: []
            },
            deviceInfo: {
                gpu: '',
                memory: 0,
                cores: 0,
                platform: '',
                isHighEnd: false,
                recommendedPreset: 'medium',
                webglVersion: ''
            }
        };
        // Map old graphics quality to new preset
        if (parsedState.graphicsQuality === 'low') {
            parsedState.graphics.preset = 'low';
        }
        else if (parsedState.graphicsQuality === 'high') {
            parsedState.graphics.preset = 'high';
        }
        parsedState.saveVersion = '2.1-graphics-system';
    }
    if (parsedState.saveVersion !== '2.1-graphics-system') {
        console.warn(`Save version mismatch: ${parsedState.saveVersion}. Expected: 2.1-graphics-system. Discarding save.`);
        localStorage.removeItem('cosmicGardenerState');
        return;
    }
    const { stars, focusedObjectUUID, discoveredTechnologies, availableFacilities, conversionEngineState, ...restOfState } = parsedState;
    Object.assign(gameState, restOfState);
    // Restore Sets from Arrays
    gameState.discoveredTechnologies = new Set(discoveredTechnologies || []);
    gameState.availableFacilities = new Set(availableFacilities || ['basic_converter']);
    // Restore conversion engine state
    if (conversionEngineState) {
        conversionEngine.loadState(conversionEngineState);
    }
    gameState.focusedObject = null;
    gameState.stars.forEach(star => removeAndDispose(star));
    gameState.stars = stars.map((starData) => {
        const safePosition = starData.position && Array.isArray(starData.position) && starData.position.length >= 3
            ? starData.position
            : [0, 0, 0];
        const safeVelocity = starData.userData.velocity && Array.isArray(starData.userData.velocity) && starData.userData.velocity.length >= 3
            ? starData.userData.velocity
            : [0, 0, 0];
        const safeAcceleration = starData.userData.acceleration && Array.isArray(starData.userData.acceleration) && starData.userData.acceleration.length >= 3
            ? starData.userData.acceleration
            : [0, 0, 0];
        const position = new THREE.Vector3().fromArray(safePosition);
        const velocity = new THREE.Vector3().fromArray(safeVelocity);
        const acceleration = new THREE.Vector3().fromArray(safeAcceleration);
        if (!isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
            position.set(0, 0, 0);
        }
        if (!isFinite(velocity.x) || !isFinite(velocity.y) || !isFinite(velocity.z)) {
            velocity.set(0, 0, 0);
        }
        if (!isFinite(acceleration.x) || !isFinite(acceleration.y) || !isFinite(acceleration.z)) {
            acceleration.set(0, 0, 0);
        }
        const body = createCelestialBody(starData.userData.type, {
            position: position,
            velocity: velocity,
            isLoading: true,
            userData: { ...starData.userData, acceleration: acceleration }
        });
        if (starData.uuid)
            body.uuid = starData.uuid;
        if (starData.userData.type === 'planet' && starData.userData.hasLife) {
            const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
            const radius = body.userData.radius || 1;
            const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
            const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
            auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
            auraSphere.name = 'life_aura';
            auraSphere.userData.originalRadius = radius * 1.1;
            auraSphere.userData.materialType = 'lifeAura';
            body.add(auraSphere);
        }
        if (starData.userData.type === 'planet' && starData.userData.lifeStage === 'intelligent') {
            const planetMesh = body.children.find(c => c.type === 'Mesh');
            if (planetMesh && planetMesh.material && planetMesh.material.map) {
                const texture = planetMesh.material.map;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        if (brightness < 80 && Math.random() < 0.1) {
                            data[i] = 255;
                            data[i + 1] = 220;
                            data[i + 2] = 180;
                        }
                    }
                    context.putImageData(imageData, 0, 0);
                    texture.needsUpdate = true;
                }
            }
        }
        scene.add(body);
        return body;
    });
    if (focusedObjectUUID) {
        gameState.focusedObject = gameState.stars.find(s => s.uuid === focusedObjectUUID) || null;
    }
    if (gameState.statistics) {
        gameState.statistics.lastUpdate = Date.now();
        if (gameState.statistics.resources) {
            Object.keys(gameState.statistics.resources).forEach(resource => {
                const stats = gameState.statistics.resources[resource];
                if (stats) {
                    stats.previousValue = gameState[resource] || 0;
                }
            });
        }
    }
    // Apply loaded graphics settings and initialize graphics systems
    if (gameState.graphics) {
        // 🔧 Ensure preset is set to custom to prevent auto-overrides
        if (gameState.graphics.preset !== 'custom') {
            console.log(`🔧 Setting graphics preset to 'custom' to preserve loaded settings`);
            gameState.graphics.preset = 'custom';
        }
        
        // Use the global graphicsEngine (set in main.js) for synchronous application
        if (window.graphicsEngine) {
            console.log(`🎨 Using global graphicsEngine for synchronous settings application`);
            window.graphicsEngine.applyAllSettings();
        } else {
            console.warn(`⚠️ graphicsEngine not available - settings application skipped`);
        }
        
        // Initialize performance monitor (keep async as it's not critical for canvas sizing)
        import('./performanceMonitor.js').then(({ performanceMonitor }) => {
            performanceMonitor.startMonitoring();
        });
        // Update UI to reflect loaded settings (keep async as it's not critical for canvas sizing)
        import('./ui.js').then(({ updateGraphicsUI }) => {
            updateGraphicsUI();
        });
        console.log(`📊 Graphics settings loaded: ${gameState.graphics.preset} preset, resolutionScale: ${gameState.graphics.resolutionScale}`);
    }
    else {
        console.warn('⚠️ No graphics settings found in save data, using defaults');
        // 🔧 Apply default graphics settings for fresh start
        if (window.graphicsEngine) {
            console.log('🎨 Applying default graphics settings for fresh start');
            window.graphicsEngine.applyAllSettings();
        }
    }
}
