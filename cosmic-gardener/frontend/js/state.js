// --- Game State Manager ---
export class GameStateManager {
    state;
    listeners = new Set();
    history = [];
    options;
    updateCount = 0;
    MAX_UPDATES_PER_FRAME = 10; // 緊急対応: 大幅に削減
    constructor(initialState, options = {}) {
        // Selectively freeze the initial state
        this.state = this.deepFreeze(initialState);
        this.options = {
            enableLogging: false,
            maxHistorySize: 10,
            ...options
        };
    }
    getState() {
        return this.state;
    }
    updateState(updater) {
        try {
            // Prevent excessive updates
            this.updateCount++;
            if (this.updateCount > this.MAX_UPDATES_PER_FRAME) {
                // 緊急対応: 異常な更新回数を検出
                if (this.updateCount % 1000 === 0) {
                    console.error(`[STATE] CRITICAL: Excessive updates detected (${this.updateCount}). Possible infinite loop!`);
                    console.trace('Call stack trace:');
                }
                // より長いディレイでスロットリング
                setTimeout(() => this.updateState(updater), 100);
                return;
            }
            const previousState = this.state;
            const newState = updater(this.state);
            if (!newState) {
                console.error('[STATE] State updater returned null or undefined');
                return;
            }
            if (newState === previousState) {
                return; // No changes
            }
            // Validate state integrity
            if (!this.validateState(newState)) {
                console.error('[STATE] State validation failed');
                return;
            }
            // Add to history
            if (this.history.length >= (this.options.maxHistorySize || 10)) {
                this.history.shift();
            }
            this.history.push(previousState);
            // Update state with selective freezing
            this.state = this.deepFreeze(newState);
            // Log update if enabled
            if (this.options.enableLogging) {
                console.log('[STATE] State updated', {
                    updateCount: this.updateCount,
                    previousState: previousState,
                    newState: this.state
                });
            }
            // Notify listeners
            this.listeners.forEach(listener => {
                try {
                    listener(this.state, previousState);
                }
                catch (error) {
                    console.error('[STATE] Listener error:', error);
                }
            });
        }
        catch (error) {
            console.error('[STATE] Update state failed:', error);
        }
    }
    validateState(state) {
        try {
            // Basic validation
            if (!state || typeof state !== 'object') {
                return false;
            }
            // Check required properties
            const requiredProps = ['gameYear', 'resources', 'stars', 'physics'];
            for (const prop of requiredProps) {
                if (!(prop in state)) {
                    console.error(`[STATE] Missing required property: ${prop}`);
                    return false;
                }
            }
            // Validate numeric properties
            if (typeof state.gameYear !== 'number' || !isFinite(state.gameYear)) {
                console.error('[STATE] Invalid gameYear');
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('[STATE] State validation error:', error);
            return false;
        }
    }
    // Reset update counter (call this on each frame)
    resetUpdateCounter() {
        this.updateCount = 0;
    }
    batchUpdate(updaters) {
        this.updateState(state => {
            return updaters.reduce((accState, updater) => updater(accState), state);
        });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    getHistory() {
        return [...this.history];
    }
    deepFreeze(obj, visited = new WeakSet()) {
        // Skip if already frozen or not an object
        if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) {
            return obj;
        }
        // Prevent circular references
        if (visited.has(obj)) {
            return obj;
        }
        visited.add(obj);
        // Skip Three.js objects and other framework objects
        if (this.isFrameworkObject(obj)) {
            return obj;
        }
        // Handle arrays - selectively freeze
        if (Array.isArray(obj)) {
            // For stars array, don't freeze the Three.js objects but freeze the array itself
            if (this.isStarsArray(obj)) {
                return Object.freeze(obj);
            }
            return Object.freeze(obj.map(item => this.deepFreeze(item, visited)));
        }
        // Handle objects - selectively freeze properties
        const frozen = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                // Skip freezing problematic properties but keep them
                if (key === 'stars' || key === 'focusedObject' || this.isFrameworkObject(value)) {
                    frozen[key] = value;
                }
                else {
                    frozen[key] = this.deepFreeze(value, visited);
                }
            }
        }
        return Object.freeze(frozen);
    }
    isStarsArray(obj) {
        return Array.isArray(obj) && obj.length > 0 && obj[0]?.isMesh;
    }
    isFrameworkObject(obj) {
        // Skip Three.js objects
        if (obj.isVector3 || obj.isVector2 || obj.isQuaternion || obj.isMatrix4 ||
            obj.isObject3D || obj.isMesh || obj.isGeometry || obj.isMaterial ||
            obj.isTexture || obj.isBufferGeometry || obj.isBufferAttribute) {
            return true;
        }
        // Skip DOM elements
        if (typeof window !== 'undefined' && obj instanceof HTMLElement) {
            return true;
        }
        // Skip Set and Map objects
        if (obj instanceof Set || obj instanceof Map) {
            return true;
        }
        // Skip other known framework objects by constructor name
        const constructorName = obj.constructor?.name;
        if (constructorName && (constructorName.startsWith('THREE.') ||
            constructorName === 'Vector3' ||
            constructorName === 'Mesh' ||
            constructorName === 'Object3D' ||
            constructorName === 'Scene' ||
            constructorName === 'Camera' ||
            constructorName === 'Set' ||
            constructorName === 'Map')) {
            return true;
        }
        return false;
    }
}
// --- Game State Initialization ---
const initialGameState = {
    gameYear: 0,
    cosmicDust: 150000,
    energy: 0,
    stars: [],
    lastTick: Date.now(),
    dustUpgradeLevel: 0,
    dustUpgradeBaseCost: 100,
    darkMatter: 0,
    darkMatterConverterLevel: 0,
    darkMatterConverterBaseCost: 500,
    organicMatter: 0,
    biomass: 0,
    thoughtPoints: 0,
    resourceAccumulators: {
        cosmicDust: 0,
        energy: 0,
        organicMatter: 0,
        biomass: 0,
        thoughtPoints: 0
    },
    thoughtSpeedMps: 0,
    cosmicActivity: 0,
    physics: {
        G: 100,
        softeningFactor: 20,
        simulationSpeed: 1,
        timeStep: 1 / 120,
        accumulator: 0,
        dragFactor: 0.01,
        collisionDetectionEnabled: true
    },
    researchEnhancedDust: false,
    researchAdvancedEnergy: false,
    unlockedCelestialBodies: {
        asteroid: true,
        comet: true,
        moon: false,
        dwarfPlanet: false,
        planet: false,
        star: false
    },
    graphicsQuality: 'medium', // Legacy field for backward compatibility
    graphics: {
        preset: 'medium',
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
    },
    currentUnitSystem: 'astronomical',
    unlockedTimeMultipliers: { '2x': false, '5x': false, '10x': false },
    currentTimeMultiplier: '1x',
    timeMultiplierCosts: { '2x': 500, '5x': 2000, '10x': 5000 },
    isMapVisible: true,
    saveVersion: '2.1-graphics-system',
    focusedObject: null,
    timelineLog: [],
    maxLogEntries: 100,
    statistics: {
        resources: {
            cosmicDust: { total: 0, perSecond: 0, perHour: 0, history: [] },
            energy: { total: 0, perSecond: 0, perHour: 0, history: [] },
            organicMatter: { total: 0, perSecond: 0, perHour: 0, history: [] },
            biomass: { total: 0, perSecond: 0, perHour: 0, history: [] },
            darkMatter: { total: 0, perSecond: 0, perHour: 0, history: [] },
            thoughtPoints: { total: 0, perSecond: 0, perHour: 0, history: [] }
        },
        cosmic: {
            starCount: { current: 0, history: [] },
            planetCount: { current: 0, history: [] },
            asteroidCount: { current: 0, history: [] },
            cometCount: { current: 0, history: [] },
            moonCount: { current: 0, history: [] },
            cosmicActivity: { current: 0, history: [] },
            totalPopulation: { current: 0, history: [] },
            intelligentLifeCount: { current: 0, history: [] },
            averageStarAge: { current: 0, history: [] },
            totalMass: { current: 0, history: [] }
        },
        lastUpdate: Date.now(),
        maxHistoryPoints: 60
    },
    // New resource system
    resources: {
        cosmicDust: 150000,
        energy: 0,
        organicMatter: 0,
        biomass: 0,
        darkMatter: 0,
        thoughtPoints: 0
    },
    advancedResources: {},
    discoveredTechnologies: new Set(),
    availableFacilities: new Set(['basic_converter']),
    deviceInfo: {
        isMobile: false,
        isDesktop: true,
        screenWidth: 0,
        screenHeight: 0,
        userAgent: '',
        hasTouchSupport: false,
        lastDetectionTime: 0
    }
};
// --- Global State Manager Instance ---
export const gameStateManager = new GameStateManager(initialGameState);
// Make gameStateManager available globally for main.js
if (typeof window !== 'undefined') {
    window.gameStateManager = gameStateManager;
}
// --- Legacy Compatibility Layer ---
// This provides backward compatibility for existing code that accesses gameState directly
export const gameState = new Proxy({}, {
    get(target, prop) {
        const state = gameStateManager.getState();
        return state[prop];
    },
    set(target, prop, value) {
        console.warn(`[STATE] Direct mutation detected on property '${String(prop)}'. Use gameStateManager.updateState() instead.`);
        gameStateManager.updateState(state => ({
            ...state,
            [prop]: value
        }));
        return true;
    }
});
// --- Graphics Presets ---
export const GRAPHICS_PRESETS = {
    ultra: {
        resolutionScale: 1.25,
        textureQuality: 'ultra',
        shadowQuality: 'ultra',
        antiAliasing: 'msaa8x',
        postProcessing: 'ultra',
        particleDensity: 2.0,
        viewDistance: 'unlimited',
        frameRateLimit: -1,
        vsync: 'adaptive',
        lightingQuality: 'ultra',
        fogEffect: 'high',
        renderPrecision: 'high',
        objectDetail: 'ultra',
        backgroundDetail: 'high',
        uiAnimations: 'smooth'
    },
    high: {
        resolutionScale: 1.0,
        textureQuality: 'high',
        shadowQuality: 'high',
        antiAliasing: 'msaa4x',
        postProcessing: 'high',
        particleDensity: 1.0,
        viewDistance: 'far',
        frameRateLimit: 144,
        vsync: 'adaptive',
        lightingQuality: 'high',
        fogEffect: 'standard',
        renderPrecision: 'standard',
        objectDetail: 'high',
        backgroundDetail: 'standard',
        uiAnimations: 'smooth'
    },
    medium: {
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
        uiAnimations: 'standard'
    },
    low: {
        resolutionScale: 0.75,
        textureQuality: 'low',
        shadowQuality: 'low',
        antiAliasing: 'off',
        postProcessing: 'low',
        particleDensity: 0.25,
        viewDistance: 'near',
        frameRateLimit: 60,
        vsync: 'off',
        lightingQuality: 'low',
        fogEffect: 'simple',
        renderPrecision: 'performance',
        objectDetail: 'low',
        backgroundDetail: 'simple',
        uiAnimations: 'simple'
    },
    minimal: {
        resolutionScale: 0.5,
        textureQuality: 'low',
        shadowQuality: 'off',
        antiAliasing: 'off',
        postProcessing: 'off',
        particleDensity: 0.1,
        viewDistance: 'minimal',
        frameRateLimit: 30,
        vsync: 'off',
        lightingQuality: 'low',
        fogEffect: 'off',
        renderPrecision: 'performance',
        objectDetail: 'low',
        backgroundDetail: 'off',
        uiAnimations: 'off'
    }
};
// Helper function to apply preset to graphics state
export function applyGraphicsPreset(graphics, presetName) {
    const preset = GRAPHICS_PRESETS[presetName];
    graphics.preset = presetName;
    Object.assign(graphics, preset);
}
// Helper function to detect if current settings match a preset
export function detectGraphicsPreset(graphics) {
    for (const [presetName, preset] of Object.entries(GRAPHICS_PRESETS)) {
        let matches = true;
        for (const [key, value] of Object.entries(preset)) {
            if (graphics[key] !== value) {
                matches = false;
                break;
            }
        }
        if (matches) {
            return presetName;
        }
    }
    return 'custom';
}
