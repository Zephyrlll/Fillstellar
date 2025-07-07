import * as THREE from 'three';
import { gameState } from './state.js';
import { removeAndDispose, celestialObjectPools } from './utils.js';
import { createCelestialBody } from './celestialBody.js';
import { scene } from './threeSetup.js';

export function saveGame() {
    const savableStars = gameState.stars.map(star => {
        const { tail, velocity, acceleration, ...serializableUserData } = star.userData;

        const safeVelocity = velocity && isFinite(velocity.x) && isFinite(velocity.y) && isFinite(velocity.z) 
            ? velocity.toArray() 
            : [0, 0, 0];
        const safeAcceleration = acceleration && isFinite(acceleration.x) && isFinite(acceleration.y) && isFinite(acceleration.z)
            ? acceleration.toArray()
            : [0, 0, 0];

        return {
            position: star.position.toArray(),
            uuid: star.uuid, // Save UUID for re-linking focus
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

    localStorage.setItem('cosmicGardenerState', JSON.stringify(savableState));
}

export function loadGame() {
    const savedState = localStorage.getItem('cosmicGardenerState');
    if (!savedState) return;

    let parsedState;
    try {
        parsedState = JSON.parse(savedState);
    } catch (e) {
        console.error("Failed to parse saved state:", e);
        return;
    }

    if (parsedState.saveVersion !== gameState.saveVersion) {
        console.warn(`Save version mismatch. Discarding save.`);
        localStorage.removeItem('cosmicGardenerState');
        return;
    }

    const { stars, focusedObjectUUID, ...restOfState } = parsedState;
    Object.assign(gameState, restOfState);
    
    gameState.focusedObject = null;

    gameState.stars.forEach(star => removeAndDispose(star));
    gameState.stars = stars.map(starData => {
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

        if (body.userData.hasLife) {
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
        if (body.userData.lifeStage === 'intelligent') {
            const planetMesh = body.children.find(c => c.type === 'Mesh');
            if (planetMesh && planetMesh.material && planetMesh.material.map) {
                const texture = planetMesh.material.map;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
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
}