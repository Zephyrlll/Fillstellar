import * as THREE from 'three';
import { GALAXY_BOUNDARY } from './constants.js';
import { mathCache, removeAndDispose } from './utils.js';
import { blackHoleGas } from './blackHoleGas.js';
import { gameState, gameStateManager, CelestialBody } from './state.js';
import { addTimelineLog } from './timeline.js';
import { CollisionEffects } from './collisionEffects.js';
import { physicsConfig } from './physicsConfig.js';

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

export const spatialGrid = new SpatialGrid(
    physicsConfig.getBoundaries().galaxyBoundary * 2, 
    physicsConfig.getPerformance().spatialGridCellSize
);

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

    // 新しい衝突システムを使用
    const result = CollisionEffects.processCollision(body1, body2);
    
    // 統計情報を更新（破壊された質量を追跡）
    const originalTotalMass = body1.userData.mass + body2.userData.mass;
    const survivingMass = result.survivors.reduce((sum, body) => sum + body.userData.mass, 0);
    const destroyedMass = originalTotalMass - survivingMass;
    
    if (destroyedMass > 0) {
        gameStateManager.updateState(state => ({
            ...state,
            statistics: {
                ...state.statistics,
                cosmic: {
                    ...state.statistics.cosmic,
                    totalMass: {
                        ...state.statistics.cosmic.totalMass,
                        current: Math.max(0, state.statistics.cosmic.totalMass.current - destroyedMass)
                    }
                }
            }
        }));
    }
    
    return; // 以下の旧処理をスキップ
    
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

    // If the absorbed body was a black hole, dispose the gas effect
    if (absorbed.userData.type === 'black_hole') {
        blackHoleGas.dispose();
    }

    // Remove from Three.js scene and dispose properly
    removeAndDispose(absorbed);

    // Add timeline log entry
    addTimelineLog(`${survivor.userData.name} merged with ${absorbed.userData.name}`, 'collision');

    // Update cosmic statistics through state manager
    gameStateManager.updateState(state => ({
        ...state,
        statistics: {
            ...state.statistics,
            cosmic: {
                ...state.statistics.cosmic,
                totalMass: {
                    ...state.statistics.cosmic.totalMass,
                    current: state.statistics.cosmic.totalMass.current + absorbedMass
                }
            }
        }
    }));
}

export function updatePhysics(deltaTime: number) {
    if (!gameState || !gameState.stars || gameState.stars.length === 0) {
        return;
    }

    const physicsSettings = physicsConfig.getPhysics();
    const boundarySettings = physicsConfig.getBoundaries();
    const performanceSettings = physicsConfig.getPerformance();
    
    const G = physicsSettings.G;
    const softeningFactorSq = mathCache.softeningFactorSq || (physicsSettings.softeningFactor * physicsSettings.softeningFactor);
    const dragFactor = physicsSettings.dragFactor;

    // Clear spatial grid and repopulate
    spatialGrid.clear();
    gameState.stars.forEach(body => {
        if (body.userData && !body.userData.isStatic) {
            spatialGrid.insert(body);
        }
    });

    // Detect collisions before physics update (if enabled)
    if (physicsSettings.collisionDetectionEnabled) {
        const collisions = detectCollisions();
        
        // Debug logging
        if (collisions.length > 0) {
            // Debug: console.log(`🔴 Collisions detected: ${collisions.length}`);
            // collisions.forEach((collision, index) => {
            //     console.log(`  Collision ${index + 1}: ${collision.body1.userData.name} (mass: ${collision.body1.userData.mass}) vs ${collision.body2.userData.name} (mass: ${collision.body2.userData.mass})`);
            // });
        }
        
        // Handle collisions - limit to prevent excessive updates
        const maxCollisionsPerFrame = 3;
        const collisionsToProcess = collisions.slice(0, maxCollisionsPerFrame);
        
        collisionsToProcess.forEach(collision => {
            handleCollision(collision.body1, collision.body2);
        });
        
        if (collisions.length > maxCollisionsPerFrame) {
            console.log(`[PHYSICS] Processing ${maxCollisionsPerFrame} of ${collisions.length} collisions this frame`);
        }
    }

    // Update physics for remaining bodies
    gameState.stars.forEach(body => {
        if (!body.userData || body.userData.isStatic) return;

        const userData = body.userData;
        
        // velocityがVector3でない場合は変換
        if (userData.velocity && !(userData.velocity instanceof THREE.Vector3)) {
            userData.velocity = new THREE.Vector3(
                userData.velocity.x || 0,
                userData.velocity.y || 0,
                userData.velocity.z || 0
            );
        }
        
        // Debug: Log black hole and star interactions
        if (body.userData.type === 'star' && gameState.stars.some(s => s.userData.type === 'black_hole')) {
            const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
            if (blackHole) {
                const dist = body.position.distanceTo(blackHole.position);
                const speed = userData.velocity.length();
                const escapeVelocity = Math.sqrt(2 * G * blackHole.userData.mass / dist);
                const circularVelocity = Math.sqrt(G * blackHole.userData.mass / dist);
                
                if (Math.random() < 0.01) { // Log occasionally
                    console.log('[PHYSICS] Orbital analysis:', {
                        distance: dist,
                        currentSpeed: speed,
                        circularSpeed: circularVelocity,
                        escapeSpeed: escapeVelocity,
                        speedRatio: speed / circularVelocity,
                        G: G,
                        BHMass: blackHole.userData.mass,
                        StarMass: userData.mass
                    });
                }
            }
        }
        
        if (!userData.velocity) {
            userData.velocity = new THREE.Vector3(0, 0, 0);
        }
        if (!userData.acceleration) {
            userData.acceleration = new THREE.Vector3(0, 0, 0);
        }

        userData.acceleration.set(0, 0, 0);

        // 重力計算をより直接的に行う - すべての天体との相互作用を計算
        gameState.stars.forEach(other => {
            if (other === body || !other.userData) return;

            const distance = body.position.distanceTo(other.position);
            if (distance < 0.1) return;

            const force = G * (userData.mass || 1) * (other.userData.mass || 1) / (distance * distance + softeningFactorSq);
            const direction = other.position.clone().sub(body.position).normalize();
            
            const acceleration = direction.multiplyScalar(force / (userData.mass || 1));
            userData.acceleration.add(acceleration);
            
            // デバッグ: ブラックホールとの相互作用をログ
            if (body.userData.type === 'star' && other.userData.type === 'black_hole') {
                if (Math.random() < 0.05) {
                    console.log('[PHYSICS] Gravity calculation:', {
                        distance: distance,
                        force: force,
                        acceleration: acceleration.length(),
                        G: G,
                        masses: { star: userData.mass, blackHole: other.userData.mass }
                    });
                }
            }
        });

        userData.velocity.multiplyScalar(1 - dragFactor * deltaTime);

        userData.velocity.add(userData.acceleration.clone().multiplyScalar(deltaTime));

        body.position.add(userData.velocity.clone().multiplyScalar(deltaTime));

        const boundary = boundarySettings.galaxyBoundary;
        const distance = body.position.length();
        
        // Gradual boundary with soft bounce
        if (distance > boundary * boundarySettings.softBoundaryRatio) {
            const softnessZone = boundary * (1 - boundarySettings.softBoundaryRatio);
            const penetration = distance - (boundary * boundarySettings.softBoundaryRatio);
            const bounceForce = Math.min(penetration / softnessZone, 1.0);
            
            // Apply gradual velocity reduction and gentle push back
            const pushDirection = body.position.clone().normalize().multiplyScalar(-1);
            const pushForce = bounceForce * boundarySettings.bounceForce;
            
            userData.velocity.add(pushDirection.multiplyScalar(pushForce));
            // Only apply velocity damping if dragFactor > 0
            if (dragFactor > 0) {
                userData.velocity.multiplyScalar(1 - bounceForce * 0.02);
            }
            
            // Hard boundary as last resort
            if (distance > boundary) {
                body.position.normalize().multiplyScalar(boundary);
                userData.velocity.multiplyScalar(boundarySettings.boundaryDamping);
            }
        }
    });
}