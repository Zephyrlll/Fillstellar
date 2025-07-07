import * as THREE from 'three';
import { GALAXY_BOUNDARY } from './constants.js';
import { gameState } from './state.js';

export const starGeometry = new THREE.SphereGeometry(1, 32, 32);

// Object pool for THREE.Vector3 instances to reduce garbage collection
export const vector3Pool = {
    pool: [],
    get() {
        if (this.pool.length > 0) {
            return this.pool.pop().set(0, 0, 0);
        }
        return new THREE.Vector3();
    },
    release(vector) {
        if (vector && this.pool.length < 50) { // Limit pool size
            this.pool.push(vector);
        }
    }
};

// THREE.js resource disposal utility with object pooling
export function disposeThreeObject(object) {
    if (!object) return;
    
    // Dispose of children first
    if (object.children) {
        object.children.forEach(child => disposeThreeObject(child));
    }
    
    // Try to return geometry to pool first, then dispose
    if (object.geometry && typeof object.geometry.dispose === 'function') {
        // Check if it's a sphere geometry that can be pooled
        if (object.geometry.type === 'SphereGeometry' && object.userData.originalRadius) {
            celestialObjectPools.releaseSphereGeometry(object.geometry, object.userData.originalRadius);
        } else {
            object.geometry.dispose();
        }
    }
    
    // Try to return material to pool first, then dispose
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => {
                if (material && typeof material.dispose === 'function') {
                    // Dispose textures first
                    ['map', 'normalMap', 'bumpMap', 'emissiveMap', 'specularMap'].forEach(textureProperty => {
                        if (material[textureProperty] && typeof material[textureProperty].dispose === 'function') {
                            material[textureProperty].dispose();
                        }
                    });
                    
                    // Try to return to pool or dispose
                    if (object.userData.materialType) {
                        celestialObjectPools.releaseMaterial(material, object.userData.materialType);
                    } else {
                        material.dispose();
                    }
                }
            });
        } else {
            if (typeof object.material.dispose === 'function') {
                // Dispose textures first
                ['map', 'normalMap', 'bumpMap', 'emissiveMap', 'specularMap'].forEach(textureProperty => {
                    if (object.material[textureProperty] && typeof object.material[textureProperty].dispose === 'function') {
                        object.material[textureProperty].dispose();
                    }
                });
                
                // Try to return to pool or dispose
                if (object.userData.materialType) {
                    celestialObjectPools.releaseMaterial(object.material, object.userData.materialType);
                } else {
                    material.dispose();
                }
            }
        }
    }
}

// Safely remove and dispose THREE.js objects from scene
export function removeAndDispose(object) {
    if (object && object.parent) {
        object.parent.remove(object);
    }
    disposeThreeObject(object);
}

// Object pools for celestial body creation
export const celestialObjectPools = {
    // Geometry pools
    sphereGeometries: {
        small: [], // radius <= 5
        medium: [], // radius 5-20
        large: [] // radius > 20
    },
    
    // Material pools by type
    materials: {
        star: [],
        planet: [],
        asteroid: [],
        blackHole: [],
        atmosphere: [],
        lifeAura: []
    },
    
    // Mesh pools
    meshes: {
        celestialBody: [],
        atmosphere: [],
        ring: []
    },

    // Get pooled sphere geometry
    getSphereGeometry(radius) {
        let pool;
        if (radius <= 5) pool = this.sphereGeometries.small;
        else if (radius <= 20) pool = this.sphereGeometries.medium;
        else pool = this.sphereGeometries.large;
        
        if (pool.length > 0) {
            return pool.pop();
        }
        return starGeometry.clone(); // Fallback to cloning
    },
    
    // Release sphere geometry back to pool
    releaseSphereGeometry(geometry, radius) {
        let pool;
        if (radius <= 5) pool = this.sphereGeometries.small;
        else if (radius <= 20) pool = this.sphereGeometries.medium;
        else pool = this.sphereGeometries.large;
        
        if (pool.length < 20) { // Limit pool size
            pool.push(geometry);
        } else {
            geometry.dispose(); // Dispose if pool is full
        }
    },
    
    // Get pooled material
    getMaterial(type, properties = {}) {
        const pool = this.materials[type] || [];
        let material;
        
        if (pool.length > 0) {
            material = pool.pop();
            // Update material properties
            Object.assign(material, properties);
            return material;
        }
        
        // Create new material if pool is empty
        switch (type) {
            case 'star':
                return new THREE.MeshStandardMaterial({ 
                    emissive: new THREE.Color(0xff4444), 
                    emissiveIntensity: 0.3, 
                    ...properties 
                });
            case 'planet':
                return new THREE.MeshStandardMaterial({ 
                    roughness: 0.8, 
                    metalness: 0.2, 
                    ...properties 
                });
            case 'lifeAura':
                return new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.15,
                    blending: THREE.AdditiveBlending,
                    ...properties
                });
            default:
                return new THREE.MeshStandardMaterial(properties);
        }
    },
    
    // Release material back to pool
    releaseMaterial(material, type) {
        const pool = this.materials[type] || [];
        if (pool.length < 10) { // Limit pool size
            pool.push(material);
        } else {
            material.dispose();
        }
    },
    
    // Clean up all pools
    dispose() {
        Object.values(this.sphereGeometries).forEach(pool => {
            pool.forEach(geometry => geometry.dispose());
            pool.length = 0;
        });
        Object.values(this.materials).forEach(pool => {
            pool.forEach(material => material.dispose());
            pool.length = 0;
        });
        Object.values(this.meshes).forEach(pool => {
            pool.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            pool.length = 0;
        });
    }
};

// Cache for expensive mathematical calculations
export const mathCache = {
    // Upgrade cost cache
    dustUpgradeCost: { level: -1, cost: 0 },
    converterCost: { level: -1, cost: 0 },
    
    // Thought speed cache
    thoughtSpeed: { points: -1, speed: 0 },
    
    // Physics constants cache - will be initialized after gameState is defined
    softeningFactorSq: 0,
    halfWorldSize: (GALAXY_BOUNDARY * 2) / 2,
    
    // Initialize physics constants after gameState is available
    init() {
        this.softeningFactorSq = gameState.physics.softeningFactor * gameState.physics.softeningFactor;
    },
    
    // Clear cache when physics constants change
    updatePhysicsConstants() {
        this.softeningFactorSq = gameState.physics.softeningFactor * gameState.physics.softeningFactor;
    },
    
    // Get cached upgrade cost
    getDustUpgradeCost() {
        if (this.dustUpgradeCost.level !== gameState.dustUpgradeLevel) {
            this.dustUpgradeCost.cost = Math.floor(gameState.dustUpgradeBaseCost * Math.pow(1.5, gameState.dustUpgradeLevel));
            this.dustUpgradeCost.level = gameState.dustUpgradeLevel;
        }
        return this.dustUpgradeCost.cost;
    },
    
    // Get cached converter cost
    getConverterCost() {
        if (this.converterCost.level !== gameState.darkMatterConverterLevel) {
            this.converterCost.cost = Math.floor(gameState.darkMatterConverterBaseCost * Math.pow(2, gameState.darkMatterConverterLevel));
            this.converterCost.level = gameState.darkMatterConverterLevel;
        }
        return this.converterCost.cost;
    },
    
    // Get cached thought speed
    getThoughtSpeed() {
        if (this.thoughtSpeed.points !== gameState.thoughtPoints) {
            const baseSpeed = 1.1;
            this.thoughtSpeed.speed = Math.pow(baseSpeed, gameState.thoughtPoints) - 1;
            this.thoughtSpeed.points = gameState.thoughtPoints;
        }
        return this.thoughtSpeed.speed;
    }
};

export const UnitConverter = {
    SOLAR_MASS_KG: 1.989e30,
    EARTH_MASS_KG: 5.972e24,
    EARTH_RADIUS_M: 6.371e6,
    YEAR_SECONDS: 3.154e7,
    convertStarMass: (mass, unitSystem) => unitSystem === 'si' ? `${(mass * UnitConverter.SOLAR_MASS_KG).toExponential(2)} kg` : `${mass} M☉`,
    convertStarTemperature: (temp, unitSystem) => `${temp} K`,
    convertStarLifespan: (lifespan, unitSystem) => unitSystem === 'si' ? `${(lifespan * 1e9 * UnitConverter.YEAR_SECONDS).toExponential(2)} 秒` : `${lifespan} 億年`,
    convertPlanetMass: (mass, unitSystem) => unitSystem === 'si' ? `${(mass * UnitConverter.EARTH_MASS_KG).toExponential(2)} kg` : `${mass} M⊕`,
    convertPlanetRadius: (radius, unitSystem) => unitSystem === 'si' ? `${(radius * UnitConverter.EARTH_RADIUS_M).toExponential(2)} m` : `${radius} R⊕`,
    convertPlanetTemperature: (temp, unitSystem) => unitSystem === 'si' ? `${temp + 273.15} K` : `${temp} ℃`,
    convertPlanetAtmosphere: (atm, unitSystem) => unitSystem === 'si' ? `${atm.toFixed(2)} (0-1)` : `${(atm * 100).toFixed(0)} %`,
    convertPlanetWater: (water, unitSystem) => unitSystem === 'si' ? `${water.toFixed(2)} (0-1)` : `${(water * 100).toFixed(0)} %`,
    convertGameYear: (year, unitSystem) => unitSystem === 'si' ? `${(year * UnitConverter.YEAR_SECONDS).toExponential(2)} 秒` : `${Math.floor(year)} 年`
};