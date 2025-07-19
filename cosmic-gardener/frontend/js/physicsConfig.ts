import physicsConfigJson from '../physics-config.json';

export interface PhysicsConfig {
    physics: {
        G: number;
        softeningFactor: number;
        simulationSpeed: number;
        timeStep: number;
        dragFactor: number;
        collisionDetectionEnabled: boolean;
    };
    orbitalMechanics: {
        enableKeplerianOrbits: boolean;
        orbitalDecayRate: number;
        tidalLockingEnabled: boolean;
    };
    boundaries: {
        galaxyBoundary: number;
        softBoundaryRatio: number;
        bounceForce: number;
        boundaryDamping: number;
    };
    performance: {
        spatialGridCellSize: number;
        nearbySearchRadius: number;
        maxPhysicsUpdatesPerFrame: number;
    };
}

class PhysicsConfigManager {
    private config: PhysicsConfig;
    private defaultConfig: PhysicsConfig;

    constructor() {
        this.defaultConfig = physicsConfigJson as PhysicsConfig;
        this.config = this.loadConfig();
    }

    private loadConfig(): PhysicsConfig {
        try {
            // Try to load custom config from localStorage first
            const customConfig = localStorage.getItem('physicsConfig');
            if (customConfig) {
                const parsed = JSON.parse(customConfig);
                console.log('[PHYSICS_CONFIG] Loaded custom physics config from localStorage');
                return this.mergeConfigs(this.defaultConfig, parsed);
            }
        } catch (error) {
            console.warn('[PHYSICS_CONFIG] Failed to load custom config, using default:', error);
        }
        
        console.log('[PHYSICS_CONFIG] Using default physics config');
        return JSON.parse(JSON.stringify(this.defaultConfig));
    }

    private mergeConfigs(defaultConfig: any, customConfig: any): PhysicsConfig {
        const merged = JSON.parse(JSON.stringify(defaultConfig));
        
        const deepMerge = (target: any, source: any) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
        };
        
        deepMerge(merged, customConfig);
        return merged;
    }

    getConfig(): PhysicsConfig {
        return this.config;
    }

    getPhysics() {
        return this.config.physics;
    }

    getOrbitalMechanics() {
        return this.config.orbitalMechanics;
    }

    getBoundaries() {
        return this.config.boundaries;
    }

    getPerformance() {
        return this.config.performance;
    }

    saveCustomConfig(customConfig: Partial<PhysicsConfig>) {
        try {
            const merged = this.mergeConfigs(this.config, customConfig);
            localStorage.setItem('physicsConfig', JSON.stringify(merged));
            this.config = merged;
            console.log('[PHYSICS_CONFIG] Saved custom physics config');
        } catch (error) {
            console.error('[PHYSICS_CONFIG] Failed to save custom config:', error);
        }
    }

    resetToDefault() {
        localStorage.removeItem('physicsConfig');
        this.config = JSON.parse(JSON.stringify(this.defaultConfig));
        console.log('[PHYSICS_CONFIG] Reset to default physics config');
    }
}

export const physicsConfig = new PhysicsConfigManager();