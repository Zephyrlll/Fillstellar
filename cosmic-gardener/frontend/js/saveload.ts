import * as THREE from 'three';
import { gameState, GameState, CelestialBody, PlanetUserData } from './state.js';
import { removeAndDispose, celestialObjectPools } from './utils.js';
import { createCelestialBody } from './celestialBody.js';
import { scene } from './threeSetup.js';
import { conversionEngine } from './conversionEngine.js';

export function saveGame() {
    const savableStars = gameState.stars.map(star => {
        const { tail, ...serializableUserData } = star.userData as any;

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

    const savableState: any = { ...gameState, stars: savableStars };

    if (savableState.focusedObject && savableState.focusedObject.uuid) {
        savableState.focusedObjectUUID = savableState.focusedObject.uuid;
    }
    delete savableState.focusedObject;
    
    // Convert Sets to Arrays for serialization
    savableState.discoveredTechnologies = Array.from(gameState.discoveredTechnologies);
    savableState.availableFacilities = Array.from(gameState.availableFacilities);
    
    // Save conversion engine state
    savableState.conversionEngineState = conversionEngine.saveState();
    
    // Update save version for new resource system
    savableState.saveVersion = '2.0-resource-system';

    localStorage.setItem('cosmicGardenerState', JSON.stringify(savableState));
}

export function loadGame() {
    const savedState = localStorage.getItem('cosmicGardenerState');
    if (!savedState) return;

    let parsedState: any;
    try {
        parsedState = JSON.parse(savedState);
    } catch (e) {
        console.error("Failed to parse saved state:", e);
        return;
    }

    // Handle save version migration
    if (parsedState.saveVersion === '1.6-accumulator' && gameState.saveVersion === '2.0-resource-system') {
        // Migrate from old version to new version
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
    } else if (parsedState.saveVersion !== '2.0-resource-system') {
        console.warn(`Save version mismatch. Discarding save.`);
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
    gameState.stars = stars.map((starData: any) => {
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
        
        if(starData.uuid) body.uuid = starData.uuid;

        if (starData.userData.type === 'planet' && (starData.userData as PlanetUserData).hasLife) {
            const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
            const radius = body.userData.radius || 1;
            const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
            const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
            auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
            auraSphere.name = 'life_aura';
            (auraSphere.userData as any).originalRadius = radius * 1.1;
            (auraSphere.userData as any).materialType = 'lifeAura';
            body.add(auraSphere);
        }
        if (starData.userData.type === 'planet' && (starData.userData as PlanetUserData).lifeStage === 'intelligent') {
            const planetMesh = body.children.find(c => c.type === 'Mesh') as THREE.Mesh;
            if (planetMesh && planetMesh.material && (planetMesh.material as THREE.MeshStandardMaterial).map) {
                const texture = (planetMesh.material as THREE.MeshStandardMaterial).map as THREE.CanvasTexture;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
                if (context) {
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                        if (brightness < 80 && Math.random() < 0.1) {
                            data[i] = 255; data[i + 1] = 220; data[i + 2] = 180;
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
                const stats = (gameState.statistics.resources as any)[resource];
                if (stats) {
                    stats.previousValue = (gameState as any)[resource] || 0;
                }
            });
        }
    }
}