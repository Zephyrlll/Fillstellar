import * as THREE from 'three';
import { gameState, gameStateManager } from './state.js';
import { removeAndDispose, celestialObjectPools } from './utils.js';
import { createCelestialBody } from './celestialBody.js';
import { scene } from './threeSetup.js';
import { conversionEngine } from './conversionEngine.js';
export function saveGame() {
    try {
        const savableStars = gameState.stars.map(star => {
            if (!star || !star.userData) {
                console.warn('[SAVELOAD] Skipping invalid star');
                return null;
            }
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
        }).filter(star => star !== null);
        const savableState = {
            ...gameState,
            stars: savableStars,
            discoveredTechnologies: [],
            availableFacilities: [],
            saveVersion: '2.2-device-detection'
        };
        if (gameState.focusedObject && gameState.focusedObject.uuid) {
            savableState.focusedObjectUUID = gameState.focusedObject.uuid;
        }
        // Convert Sets to Arrays for serialization
        savableState.discoveredTechnologies = Array.from(gameState.discoveredTechnologies);
        savableState.availableFacilities = Array.from(gameState.availableFacilities);
        // Save conversion engine state
        savableState.conversionEngineState = conversionEngine.saveState();
        localStorage.setItem('cosmicGardenerState', JSON.stringify(savableState));
        console.log('[SAVELOAD] Game saved successfully');
    }
    catch (error) {
        console.error('[SAVELOAD] Failed to save game:', error);
    }
}
export function loadGame() {
    const savedState = localStorage.getItem('cosmicGardenerState');
    if (!savedState) {
        console.log('[SAVELOAD] No saved game found');
        return;
    }
    let parsedState;
    try {
        parsedState = JSON.parse(savedState);
    }
    catch (e) {
        console.error('[SAVELOAD] Failed to parse saved state:', e);
        return;
    }
    if (!parsedState) {
        console.error('[SAVELOAD] Parsed state is null');
        return;
    }
    try {
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
            parsedState.graphics = {
                preset: parsedState.graphicsQuality || 'medium',
                resolutionScale: 1.0,
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
        if (parsedState.saveVersion === '2.1-graphics-system') {
            // Migrate to device detection version
            parsedState.deviceInfo = {
                isMobile: false,
                isDesktop: true,
                screenWidth: 0,
                screenHeight: 0,
                userAgent: '',
                hasTouchSupport: false,
                lastDetectionTime: 0
            };
            parsedState.saveVersion = '2.2-device-detection';
        }
        if (parsedState.saveVersion !== '2.2-device-detection') {
            console.warn('[SAVELOAD] Save version mismatch:', parsedState.saveVersion, 'Expected: 2.2-device-detection. Discarding save.');
            localStorage.removeItem('cosmicGardenerState');
            return;
        }
        const { stars, focusedObjectUUID, discoveredTechnologies, availableFacilities, conversionEngineState, ...restOfState } = parsedState;
        // Use gameStateManager to update state
        gameStateManager.updateState(state => ({
            ...state,
            ...restOfState,
            discoveredTechnologies: new Set(discoveredTechnologies || []),
            availableFacilities: new Set(availableFacilities || ['basic_converter']),
            focusedObject: null
        }));
        // Restore conversion engine state
        if (conversionEngineState) {
            conversionEngine.loadState(conversionEngineState);
        }
        // Clear existing stars
        gameState.stars.forEach(star => {
            if (star)
                removeAndDispose(star);
        });
        const newStars = stars.map((starData) => {
            if (!starData || !starData.userData) {
                console.warn('[SAVELOAD] Skipping invalid star data');
                return null;
            }
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
            if (!body) {
                console.error('[SAVELOAD] Failed to create celestial body');
                return null;
            }
            if (starData.uuid)
                body.uuid = starData.uuid;
            if (starData.userData.type === 'planet' && starData.userData.hasLife) {
                const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
                const radius = body.userData.radius || 1;
                const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
                const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
                auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
                auraSphere.name = 'life_aura';
                if (!auraSphere.userData)
                    auraSphere.userData = {};
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
                        try {
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
                        catch (error) {
                            console.error('[SAVELOAD] Failed to update planet texture:', error);
                        }
                    }
                }
            }
            scene.add(body);
            return body;
        }).filter(body => body !== null);
        // Update stars in state manager
        gameStateManager.updateState(state => ({
            ...state,
            stars: newStars
        }));
        if (focusedObjectUUID) {
            const focusedObject = gameState.stars.find(s => s.uuid === focusedObjectUUID) || null;
            gameStateManager.updateState(state => ({
                ...state,
                focusedObject
            }));
        }
        if (gameState.statistics) {
            const now = Date.now();
            const currentStatistics = { ...gameState.statistics };
            currentStatistics.lastUpdate = now;
            if (currentStatistics.resources) {
                const updatedResources = { ...currentStatistics.resources };
                Object.keys(updatedResources).forEach(resource => {
                    const stats = updatedResources[resource];
                    if (stats && 'previousValue' in stats) {
                        updatedResources[resource] = {
                            ...stats,
                            previousValue: gameState[resource] || 0
                        };
                    }
                });
                currentStatistics.resources = updatedResources;
            }
            gameStateManager.updateState(state => ({
                ...state,
                statistics: currentStatistics
            }));
        }
        // Apply loaded graphics settings and initialize graphics systems
        if (gameState.graphics) {
            // Check if graphicsEngine is already available (synchronous path)
            if (window.graphicsEngine) {
                console.log('[SAVELOAD] Using existing graphicsEngine for settings application');
                window.graphicsEngine.applyAllSettings();
            }
            else {
                // Fallback to dynamic import (asynchronous path)
                console.log('[SAVELOAD] Loading graphicsEngine via dynamic import');
                import('./graphicsEngine.js').then(({ graphicsEngine }) => {
                    graphicsEngine.applyAllSettings();
                }).catch(error => {
                    console.error('[SAVELOAD] Failed to load graphics engine:', error);
                });
            }
            // Initialize performance monitor
            import('./performanceMonitor.js').then(({ performanceMonitor }) => {
                performanceMonitor.startMonitoring();
            }).catch(error => {
                console.error('[SAVELOAD] Failed to load performance monitor:', error);
            });
            // Update UI to reflect loaded settings
            import('./ui.js').then(({ updateGraphicsUI }) => {
                updateGraphicsUI();
            }).catch(error => {
                console.error('[SAVELOAD] Failed to update graphics UI:', error);
            });
            console.log('[SAVELOAD] Graphics settings loaded:', gameState.graphics.preset, 'preset');
        }
        else {
            console.warn('[SAVELOAD] No graphics settings found in save data, using defaults');
        }
        console.log('[SAVELOAD] Game loaded successfully');
    }
    catch (error) {
        console.error('[SAVELOAD] Failed to load game:', error);
    }
}
