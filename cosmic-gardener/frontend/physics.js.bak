import * as THREE from 'three';
import { GALAXY_BOUNDARY } from './constants.js';
import { mathCache, removeAndDispose } from './utils.js';
import { gameState } from './state.js';
import { addTimelineLog } from './timeline.js';

export class SpatialGrid {
    constructor(worldSize, cellSize) {
        this.worldSize = worldSize;
        this.cellSize = cellSize;
        this.gridSize = Math.ceil(worldSize / cellSize);
        this.grid = new Map();
    }
    clear() {
        this.grid.clear();
    }
    getKey(x, y, z) {
        const halfWorld = mathCache.halfWorldSize;
        const gx = Math.floor((x + halfWorld) / this.cellSize);
        const gy = Math.floor((y + halfWorld) / this.cellSize);
        const gz = Math.floor((z + halfWorld) / this.cellSize);
        return `${gx},${gy},${gz}`;
    }
    insert(object) {
        var _a;
        const key = this.getKey(object.position.x, object.position.y, object.position.z);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        (_a = this.grid.get(key)) === null || _a === void 0 ? void 0 : _a.push(object);
    }
    getNearbyObjects(object, searchRadius = 1) {
        const nearby = [];
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
                        nearby.push(...this.grid.get(key));
                    }
                }
            }
        }
        return nearby;
    }
}

export const spatialGrid = new SpatialGrid(GALAXY_BOUNDARY * 2, 1000);

export function updatePhysics(deltaTime) {
    if (!gameState || !gameState.stars || gameState.stars.length === 0 || !gameState.physics.enabled) {
        return;
    }

    const G = gameState.physics.G;
    const softeningFactorSq = mathCache.softeningFactorSq;
    const dragFactor = gameState.physics.dragFactor;
    const bodies = gameState.stars;
    const bodyCount = bodies.length;

    // 0. Clear spatial grid and repopulate
    spatialGrid.clear();
    bodies.forEach(body => {
        if (body.userData && !body.userData.isStatic) {
            spatialGrid.insert(body);
        }
    });

    // 1. Calculate acceleration
    bodies.forEach(bodyA => {
        if (bodyA.userData.isStatic) return;

        if (!bodyA.userData.acceleration) {
            bodyA.userData.acceleration = new THREE.Vector3(0, 0, 0);
        }
        bodyA.userData.acceleration.set(0, 0, 0);

        bodies.forEach(bodyB => {
            if (bodyA === bodyB) return;

            const direction = new THREE.Vector3().subVectors(bodyB.position, bodyA.position);
            const distanceSq = direction.lengthSq();

            if (distanceSq < 1e-6) return;

            const forceMagnitude = (G * bodyB.userData.mass) / (distanceSq + softeningFactorSq);
            const acceleration = direction.normalize().multiplyScalar(forceMagnitude);

            bodyA.userData.acceleration.add(acceleration);
        });
    });

    // 2. Detect collisions and record merge events
    const destroyed = new Set();
    const mergeEvents = [];
    const checkedPairs = new Set();

    if (gameState.physics.collisionDetectionEnabled) {
        for (let i = 0; i < bodyCount; i++) {
            const bodyA = bodies[i];
            if (destroyed.has(bodyA.uuid) || !bodyA.userData) continue;

            const searchRadius = (bodyA.userData.radius || 1) * 2;
            const nearbyBodies = spatialGrid.getNearbyObjects(bodyA, searchRadius);

            for (const bodyB of nearbyBodies) {
                if (bodyA === bodyB || destroyed.has(bodyB.uuid) || !bodyB.userData) continue;

                const pairId = bodyA.uuid < bodyB.uuid ? `${bodyA.uuid}-${bodyB.uuid}` : `${bodyB.uuid}-${bodyA.uuid}`;
                if (checkedPairs.has(pairId)) continue;
                checkedPairs.add(pairId);

                const distance = bodyA.position.distanceTo(bodyB.position);
                const combinedRadius = (bodyA.userData.radius || 1) + (bodyB.userData.radius || 1);

                if (distance < combinedRadius) {
                    const bigger = bodyA.userData.mass >= bodyB.userData.mass ? bodyA : bodyB;
                    const smaller = bigger === bodyA ? bodyB : bodyA;

                    if (smaller.userData.type === 'black_hole') continue;

                    mergeEvents.push({ bigger, smaller });
                    destroyed.add(smaller.uuid);
                }
            }
        }
    }


    // 3. Process merge events
    mergeEvents.forEach(event => {
        const { bigger, smaller } = event;
        if (!bigger || !smaller || !bigger.userData || !smaller.userData || !bigger.userData.velocity || !smaller.userData.velocity) {
            return;
        }

        const biggerMass = bigger.userData.mass;
        const smallerMass = smaller.userData.mass;
        const combinedMass = biggerMass + smallerMass;

        if (combinedMass <= 0) return;

        const newVelocity = new THREE.Vector3()
            .add(bigger.userData.velocity.clone().multiplyScalar(biggerMass))
            .add(smaller.userData.velocity.clone().multiplyScalar(smallerMass))
            .divideScalar(combinedMass);

        bigger.userData.velocity.copy(newVelocity);
        bigger.userData.mass = combinedMass;

        const radiusA = bigger.userData.radius || 1;
        const radiusB = smaller.userData.radius || 1;
        const newRadius = Math.cbrt(Math.pow(radiusA, 3) + Math.pow(radiusB, 3));
        bigger.userData.radius = newRadius;

        const scaleTarget = bigger.children.find(c => c.type === 'Mesh') || bigger;
        if (scaleTarget && scaleTarget.scale) {
             scaleTarget.scale.set(newRadius, newRadius, newRadius);
        }

        addTimelineLog(`${bigger.userData.name} absorbed ${smaller.userData.name}.`, 'collision');
    });

    // 4. Update position and velocity
    bodies.forEach(body => {
        if (destroyed.has(body.uuid) || body.userData.isStatic) return;

        body.userData.velocity.add(body.userData.acceleration.multiplyScalar(deltaTime));
        body.userData.velocity.multiplyScalar(1 - dragFactor * deltaTime);
        body.position.add(body.userData.velocity.clone().multiplyScalar(deltaTime));

        const boundary = GALAXY_BOUNDARY;
        if (body.position.length() > boundary) {
            body.position.normalize().multiplyScalar(boundary);
            body.userData.velocity.multiplyScalar(-0.5);
        }
    });

    // 5. Clean up destroyed bodies
    if (destroyed.size > 0) {
        const survivingStars = [];
        const destroyedStars = [];
        for (const star of gameState.stars) {
            if (destroyed.has(star.uuid)) {
                destroyedStars.push(star);
            } else {
                survivingStars.push(star);
            }
        }
        gameState.stars = survivingStars;
        
        destroyedStars.forEach(star => removeAndDispose(star));
    }
}