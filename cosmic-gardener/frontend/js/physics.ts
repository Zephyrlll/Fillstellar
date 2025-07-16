import * as THREE from 'three';
import { GALAXY_BOUNDARY } from './constants.js';
import { mathCache } from './utils.js';
import { gameState, CelestialBody } from './state.js';
import { addTimelineLog } from './timeline.js';

export class SpatialGrid {
    worldSize: number;
    cellSize: number;
    gridSize: number;
    grid: Map<string, CelestialBody[]>;

    constructor(worldSize: number, cellSize: number) {
        this.worldSize = worldSize;
        this.cellSize = cellSize;
        this.gridSize = Math.ceil(worldSize / cellSize);
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    getKey(x: number, y: number, z: number): string {
        const halfWorld = mathCache.halfWorldSize;
        const gx = Math.floor((x + halfWorld) / this.cellSize);
        const gy = Math.floor((y + halfWorld) / this.cellSize);
        const gz = Math.floor((z + halfWorld) / this.cellSize);
        return `${gx},${gy},${gz}`;
    }

    insert(object: CelestialBody) {
        const key = this.getKey(object.position.x, object.position.y, object.position.z);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)?.push(object);
    }

    getNearbyObjects(object: CelestialBody, searchRadius = 1): CelestialBody[] {
        const nearby: CelestialBody[] = [];
        const cellRadius = Math.ceil(searchRadius / this.cellSize);
        
        const halfWorld = mathCache.halfWorldSize;
        const centerX = Math.floor((object.position.x + halfWorld) / this.cellSize);
        const centerY = Math.floor((object.position.y + halfWorld) / this.cellSize);
        const centerZ = Math.floor((object.position.z + halfWorld) / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                    const key = `${centerX + dx},${centerY + dy},${centerZ + dz}`;
                    if (this.grid.has(key)) {
                        nearby.push(...this.grid.get(key)!);
                    }
                }
            }
        }
        return nearby;
    }
}

export const spatialGrid = new SpatialGrid(GALAXY_BOUNDARY * 2, 1000);

// Collision detection structures
interface CollisionPair {
    body1: CelestialBody;
    body2: CelestialBody;
}

export function detectCollisions(): CollisionPair[] {
    const collisions: CollisionPair[] = [];
    const processedPairs = new Set<string>();

    gameState.stars.forEach(body1 => {
        if (!body1.userData || body1.userData.isStatic) return;

        const nearby = spatialGrid.getNearbyObjects(body1, body1.userData.radius * 3);
        nearby.forEach(body2 => {
            if (body2 === body1 || !body2.userData || body2.userData.isStatic) return;

            // Create a unique pair identifier
            const id1 = body1.uuid;
            const id2 = body2.uuid;
            const pairKey = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;

            if (processedPairs.has(pairKey)) return;
            processedPairs.add(pairKey);

            const distance = body1.position.distanceTo(body2.position);
            const combinedRadius = (body1.userData.radius || 1) + (body2.userData.radius || 1);

            if (distance < combinedRadius) {
                collisions.push({ body1, body2 });
            }
        });
    });

    return collisions;
}

export function handleCollision(body1: CelestialBody, body2: CelestialBody) {
    if (!body1.userData || !body2.userData) return;

    const mass1 = body1.userData.mass || 1;
    const mass2 = body2.userData.mass || 1;
    const totalMass = mass1 + mass2;
    
    // Debug: console.log(`💥 Handling collision: ${body1.userData.name} (${mass1}) + ${body2.userData.name} (${mass2}) = ${totalMass}`);

    // Determine which body survives (higher mass wins)
    const survivor = mass1 >= mass2 ? body1 : body2;
    const absorbed = mass1 >= mass2 ? body2 : body1;
    const survivorMass = Math.max(mass1, mass2);
    const absorbedMass = Math.min(mass1, mass2);

    // Initialize velocities if they don't exist
    if (!survivor.userData.velocity) {
        survivor.userData.velocity = new THREE.Vector3(0, 0, 0);
    }
    if (!absorbed.userData.velocity) {
        absorbed.userData.velocity = new THREE.Vector3(0, 0, 0);
    }

    // Conservation of momentum: p_final = p1 + p2
    const finalVelocity = survivor.userData.velocity.clone().multiplyScalar(survivorMass)
        .add(absorbed.userData.velocity.clone().multiplyScalar(absorbedMass))
        .divideScalar(totalMass);

    // Conservation of mass position (center of mass)
    const centerOfMass = survivor.position.clone().multiplyScalar(survivorMass)
        .add(absorbed.position.clone().multiplyScalar(absorbedMass))
        .divideScalar(totalMass);

    // Update survivor properties
    survivor.userData.mass = totalMass;
    survivor.userData.velocity.copy(finalVelocity);
    survivor.position.copy(centerOfMass);
    
    // Update radius based on mass (assuming density is constant)
    // V = (4/3)πr³, so r = (3V/4π)^(1/3) = (3m/4πρ)^(1/3)
    // For simplicity, we'll use r ∝ m^(1/3)
    const originalRadius = survivor.userData.radius || 1;
    const volumeRatio = totalMass / survivorMass;
    survivor.userData.radius = originalRadius * Math.pow(volumeRatio, 1/3);

    // Update visual representation
    if (survivor.scale) {
        const scaleRatio = Math.pow(volumeRatio, 1/3);
        survivor.scale.multiplyScalar(scaleRatio);
    }

    // Handle special properties for different body types
    if (survivor.userData.type === 'star' && absorbed.userData.type === 'star') {
        // Stellar merger - increase temperature and luminosity
        const survivorData = survivor.userData as any;
        const absorbedData = absorbed.userData as any;
        
        if (survivorData.temperature && absorbedData.temperature) {
            // Mass-weighted average temperature
            survivorData.temperature = (survivorData.temperature * survivorMass + 
                                     absorbedData.temperature * absorbedMass) / totalMass;
        }
    } else if (survivor.userData.type === 'planet' && absorbed.userData.type === 'planet') {
        // Planetary merger - combine populations and life stages
        const survivorData = survivor.userData as any;
        const absorbedData = absorbed.userData as any;
        
        if (survivorData.population && absorbedData.population) {
            survivorData.population += absorbedData.population;
        }
        
        // Advance life stage if both have life
        if (survivorData.hasLife && absorbedData.hasLife) {
            const stages = ['microbial', 'plant', 'animal', 'intelligent'];
            const survivorStageIndex = stages.indexOf(survivorData.lifeStage || 'microbial');
            const absorbedStageIndex = stages.indexOf(absorbedData.lifeStage || 'microbial');
            const maxStageIndex = Math.max(survivorStageIndex, absorbedStageIndex);
            
            if (maxStageIndex < stages.length - 1) {
                survivorData.lifeStage = stages[maxStageIndex + 1];
            }
        }
    }

    // Remove absorbed body from the game
    const index = gameState.stars.indexOf(absorbed);
    if (index > -1) {
        gameState.stars.splice(index, 1);
    }

    // Remove from Three.js scene
    if (absorbed.parent) {
        absorbed.parent.remove(absorbed);
    }

    // Add timeline log entry
    addTimelineLog(`${survivor.userData.name} merged with ${absorbed.userData.name}`, 'collision');

    // Update cosmic statistics
    if (gameState.statistics) {
        gameState.statistics.cosmic.totalMass.current += absorbedMass;
    }
}

export function updatePhysics(deltaTime: number) {
    if (!gameState || !gameState.stars || gameState.stars.length === 0) {
        return;
    }

    const G = gameState.physics.G;
    const softeningFactorSq = mathCache.softeningFactorSq || (gameState.physics.softeningFactor * gameState.physics.softeningFactor);
    const dragFactor = gameState.physics.dragFactor || 0.01;

    // Clear spatial grid and repopulate
    spatialGrid.clear();
    gameState.stars.forEach(body => {
        if (body.userData && !body.userData.isStatic) {
            spatialGrid.insert(body);
        }
    });

    // Detect collisions before physics update (if enabled)
    if (gameState.physics.collisionDetectionEnabled) {
        const collisions = detectCollisions();
        
        // Debug logging
        if (collisions.length > 0) {
            // Debug: console.log(`🔴 Collisions detected: ${collisions.length}`);
            // collisions.forEach((collision, index) => {
            //     console.log(`  Collision ${index + 1}: ${collision.body1.userData.name} (mass: ${collision.body1.userData.mass}) vs ${collision.body2.userData.name} (mass: ${collision.body2.userData.mass})`);
            // });
        }
        
        // Handle collisions
        collisions.forEach(collision => {
            handleCollision(collision.body1, collision.body2);
        });
    }

    // Update physics for remaining bodies
    gameState.stars.forEach(body => {
        if (!body.userData || body.userData.isStatic) return;

        const userData = body.userData;
        
        if (!userData.velocity) {
            userData.velocity = new THREE.Vector3(0, 0, 0);
        }
        if (!userData.acceleration) {
            userData.acceleration = new THREE.Vector3(0, 0, 0);
        }

        userData.acceleration.set(0, 0, 0);

        const nearby = spatialGrid.getNearbyObjects(body, 2000);
        nearby.forEach(other => {
            if (other === body || !other.userData) return;

            const distance = body.position.distanceTo(other.position);
            if (distance < 0.1) return;

            const force = G * (userData.mass || 1) * (other.userData.mass || 1) / (distance * distance + softeningFactorSq);
            const direction = other.position.clone().sub(body.position).normalize();
            
            userData.acceleration.add(direction.multiplyScalar(force / (userData.mass || 1)));
        });

        userData.velocity.multiplyScalar(1 - dragFactor * deltaTime);

        userData.velocity.add(userData.acceleration.clone().multiplyScalar(deltaTime));

        body.position.add(userData.velocity.clone().multiplyScalar(deltaTime));

        const boundary = GALAXY_BOUNDARY;
        const distance = body.position.length();
        
        // Gradual boundary with soft bounce
        if (distance > boundary * 0.9) {
            const softnessZone = boundary * 0.1;
            const penetration = distance - (boundary * 0.9);
            const bounceForce = Math.min(penetration / softnessZone, 1.0);
            
            // Apply gradual velocity reduction and gentle push back
            const pushDirection = body.position.clone().normalize().multiplyScalar(-1);
            const pushForce = bounceForce * 0.1;
            
            userData.velocity.add(pushDirection.multiplyScalar(pushForce));
            userData.velocity.multiplyScalar(1 - bounceForce * 0.02);
            
            // Hard boundary as last resort
            if (distance > boundary) {
                body.position.normalize().multiplyScalar(boundary);
                userData.velocity.multiplyScalar(0.3);
            }
        }
    });
}