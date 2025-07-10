import * as THREE from 'three';
import { GALAXY_BOUNDARY } from './constants.js';
import { mathCache } from './utils.js';
import { gameState } from './state.js';
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
        const key = this.getKey(object.position.x, object.position.y, object.position.z);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)?.push(object);
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
    if (!gameState || !gameState.stars || gameState.stars.length === 0) {
        return;
    }
    const G = gameState.physics.G;
    const softeningFactorSq = mathCache.softeningFactorSq || (gameState.physics.softeningFactor * gameState.physics.softeningFactor);
    const dragFactor = gameState.physics.dragFactor || 0.01;
    gameState.stars.forEach(body => {
        if (!body.userData || body.userData.isStatic)
            return;
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
            if (other === body || !other.userData)
                return;
            const distance = body.position.distanceTo(other.position);
            if (distance < 0.1)
                return;
            const force = G * (userData.mass || 1) * (other.userData.mass || 1) / (distance * distance + softeningFactorSq);
            const direction = other.position.clone().sub(body.position).normalize();
            userData.acceleration.add(direction.multiplyScalar(force / (userData.mass || 1)));
        });
        userData.velocity.multiplyScalar(1 - dragFactor * deltaTime);
        userData.velocity.add(userData.acceleration.clone().multiplyScalar(deltaTime));
        body.position.add(userData.velocity.clone().multiplyScalar(deltaTime));
        const boundary = GALAXY_BOUNDARY;
        if (body.position.length() > boundary) {
            body.position.normalize().multiplyScalar(boundary);
            userData.velocity.multiplyScalar(0.5);
        }
    });
}
