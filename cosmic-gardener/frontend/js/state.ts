import * as THREE from 'three';
import { ResourceStorage } from './resourceSystem.js';
import { physicsConfig } from './physicsConfig.js';

// --- Type Definitions ---

export interface StarUserData {
    type: 'star';
    name: string;
    creationYear: number;
    mass: number;
    radius: number;
    velocity: THREE.Vector3;
    acceleration: THREE.Vector3;
    isStatic: boolean;
    age: string;
    temperature: number;
    spectralType: string;
    lifespan: number;
}

export interface PlanetUserData {
    type: 'planet';
    name: string;
    creationYear: number;
    mass: number;
    radius: number;
    velocity: THREE.Vector3;
    acceleration: THREE.Vector3;
    isStatic: boolean;
    planetType: string;
    subType: string;
    temperature: number;
    atmosphere: string;
    water: string;
    geologicalActivity: string;
    habitability: number;
    hasLife?: boolean;
    lifeStage?: string;
    population?: number;
}

export interface BlackHoleUserData {
    type: 'black_hole';
    name: string;
    creationYear: number;
    mass: number;
    radius: number;
    velocity: THREE.Vector3;
    acceleration: THREE.Vector3;
    isStatic: boolean;
}

export type CelestialBodyUserData = StarUserData | PlanetUserData | BlackHoleUserData | { [key: string]: any };

export interface CelestialBody extends THREE.Object3D {
    userData: CelestialBodyUserData;
}

export interface PhysicsState {
    G: number;
    softeningFactor: number;
    simulationSpeed: number;
    timeStep: number;
    accumulator: number;
    dragFactor: number;
    collisionDetectionEnabled: boolean;
}

export interface ResourceStats {
    total: number;
    perSecond: number;
    perHour: number;
    history: { time: number; value: number; rate: number }[];
    previousValue?: number;
}

export interface CosmicStats {
    current: number;
    history: { time: number; value: number }[];
}

export interface StatisticsState {
    resources: {
        cosmicDust: ResourceStats;
        energy: ResourceStats;
        organicMatter: ResourceStats;
        biomass: ResourceStats;
        darkMatter: ResourceStats;
        thoughtPoints: ResourceStats;
    };
    cosmic: {
        starCount: CosmicStats;
        planetCount: CosmicStats;
        asteroidCount: CosmicStats;
        cometCount: CosmicStats;
        moonCount: CosmicStats;
        cosmicActivity: CosmicStats;
        totalPopulation: CosmicStats;
        intelligentLifeCount: CosmicStats;
        averageStarAge: CosmicStats;
        totalMass: CosmicStats;
    };
    lastUpdate: number;
    maxHistoryPoints: number;
}

export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    gpuUsage: number;
    averageFps: number;
    history: { time: number; fps: number; frameTime: number; memory: number }[];
}

export interface DeviceInfo {
    gpu: string;
    memory: number;
    cores: number;
    platform: string;
    isHighEnd: boolean;
    recommendedPreset: string;
    webglVersion: string;
}

export interface GraphicsState {
    preset: string; // 'ultra' | 'high' | 'medium' | 'low' | 'minimal' | 'custom'
    resolutionScale: number;
    textureQuality: string; // 'ultra' | 'high' | 'medium' | 'low'
    shadowQuality: string; // 'ultra' | 'high' | 'medium' | 'low' | 'off'
    antiAliasing: string; // 'msaa8x' | 'msaa4x' | 'msaa2x' | 'fxaa' | 'off'
    postProcessing: string; // 'ultra' | 'high' | 'medium' | 'low' | 'off'
    particleDensity: number;
    viewDistance: string; // 'unlimited' | 'far' | 'medium' | 'near' | 'minimal'
    frameRateLimit: number; // -1 for unlimited
    vsync: string; // 'adaptive' | 'on' | 'off'
    lightingQuality: string; // 'ultra' | 'high' | 'medium' | 'low'
    fogEffect: string; // 'high' | 'standard' | 'simple' | 'off'
    renderPrecision: string; // 'high' | 'standard' | 'performance'
    objectDetail: string; // 'ultra' | 'high' | 'medium' | 'low'
    backgroundDetail: string; // 'high' | 'standard' | 'simple' | 'off'
    uiAnimations: string; // 'smooth' | 'standard' | 'simple' | 'off'
    
    // Performance monitoring
    performance: PerformanceMetrics;
    
    // Device information
    deviceInfo: DeviceInfo;
}

export interface GameState {
    gameYear: number;
    cosmicDust: number;
    energy: number;
    stars: CelestialBody[];
    lastTick: number;
    dustUpgradeLevel: number;
    dustUpgradeBaseCost: number;
    darkMatter: number;
    darkMatterConverterLevel: number;
    darkMatterConverterBaseCost: number;
    organicMatter: number;
    biomass: number;
    thoughtPoints: number;
    resourceAccumulators: {
        cosmicDust: number;
        energy: number;
        organicMatter: number;
        biomass: number;
        thoughtPoints: number;
        darkMatter?: number;
    };
    thoughtSpeedMps: number;
    cosmicActivity: number;
    physics: PhysicsState;
    researchEnhancedDust: boolean;
    researchAdvancedEnergy: boolean;
    research?: {
        completedResearch?: string[];
        dustGenerationMultiplier?: number;
        energyConversionMultiplier?: number;
        allResourceMultiplier?: number;
        lifeSpawnChanceMultiplier?: number;
        evolutionSpeedMultiplier?: number;
        populationGrowthMultiplier?: number;
        thoughtGenerationMultiplier?: number;
        researchSpeedMultiplier?: number;
        darkMatterGenerationMultiplier?: number;
        conversionEfficiencyMultiplier?: number;
        cosmicActivityMultiplier?: number;
    };
    unlockedCelestialBodies: { [key: string]: boolean };
    graphicsQuality: string; // Legacy field for backward compatibility
    graphics: GraphicsState; // New detailed graphics settings
    currentUnitSystem: string;
    unlockedTimeMultipliers: { [key: string]: boolean };
    currentTimeMultiplier: string;
    timeMultiplierCosts: { [key: string]: number };
    isMapVisible: boolean;
    saveVersion: string;
    focusedObject: CelestialBody | null;
    timelineLog: { id: number; year: number; message: string; type: string; timestamp: number }[];
    maxLogEntries: number;
    statistics: StatisticsState;
    cachedTotalPopulation?: number;
    currentDustRate?: number;
    // New resource system
    resources: {
        cosmicDust: number;
        energy: number;
        organicMatter: number;
        biomass: number;
        darkMatter: number;
        thoughtPoints: number;
    };
    advancedResources?: ResourceStorage;
    discoveredTechnologies: Set<string>;
    availableFacilities: Set<string>;
    conversionEngineState?: any;
    // Waste management
    wasteStorageCapacity?: number;
    productionEfficiencyModifier?: number;
    // Catalyst system
    catalystSystemInitialized?: boolean;
    // Currency system
    currencies?: {
        cosmicDustCurrency: number;       // ソフトカレンシー（基本通貨）
        galacticCredits: number;          // ハードカレンシー
        ancientRelics: number;            // プレミアム通貨
    };
    // Additional currency fields (for backward compatibility)
    cosmicCredits?: number;
    quantumCoins?: number;
    stellarShards?: number;
    voidTokens?: number;
    // Device detection
    deviceInfo?: {
        isMobile: boolean;
        isDesktop: boolean;
        screenWidth: number;
        screenHeight: number;
        userAgent: string;
        hasTouchSupport: boolean;
        lastDetectionTime: number;
    };
    // Idle game systems
    lastSaveTime?: number;
    offlineTime?: number;
    totalPlayTime?: number;
    lastActiveTime?: number;
    // Prestige system
    prestigeCount?: number;
    prestigePoints?: number;
    totalPrestigePoints?: number;
    prestigeUpgrades?: Record<string, number>;
    nextPrestigeTime?: number;
    lastPrestigeTime?: number;
    // Game phase system
    currentGamePhase?: number;
    unlockedPhases?: Set<number>;
    phaseProgress?: Record<string, number>;
}

// --- State Management Types ---

export type StateUpdater<T> = (state: Readonly<T>) => T;

export type StateListener<T> = (state: Readonly<T>, previousState: Readonly<T>) => void;

export interface StateManagerOptions {
    enableLogging?: boolean;
    maxHistorySize?: number;
}

// --- Game State Manager ---

export class GameStateManager {
    private state: GameState;
    private listeners: Set<StateListener<GameState>> = new Set();
    private history: GameState[] = [];
    private options: StateManagerOptions;
    private updateCount = 0;
    private readonly MAX_UPDATES_PER_FRAME = 10; // 緊急対応: 大幅に削減

    constructor(initialState: GameState, options: StateManagerOptions = {}) {
        // Selectively freeze the initial state
        this.state = this.deepFreeze(initialState) as GameState;
        this.options = {
            enableLogging: false,
            maxHistorySize: 10,
            ...options
        };
    }

    getState(): Readonly<GameState> {
        return this.state;
    }

    updateState(updater: StateUpdater<GameState>): void {
        try {
            // Prevent excessive updates
            this.updateCount++;
            if (this.updateCount > this.MAX_UPDATES_PER_FRAME) {
                // 緊急対応: 異常な更新回数を検出
                if (this.updateCount === this.MAX_UPDATES_PER_FRAME + 1) {
                    console.error(`[STATE] CRITICAL: Excessive updates detected (${this.updateCount}). Update skipped to prevent infinite loop!`);
                    console.trace('Call stack trace:');
                    
                    // デバッグ情報: どの更新が問題を起こしているか
                    const updaterString = updater.toString();
                    if (updaterString.length < 200) {
                        console.error('[STATE] Problem updater:', updaterString);
                    } else {
                        console.error('[STATE] Problem updater (truncated):', updaterString.substring(0, 200) + '...');
                    }
                }
                // 更新をスキップして無限ループを防ぐ
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
            this.state = this.deepFreeze(newState) as GameState;

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
                } catch (error) {
                    console.error('[STATE] Listener error:', error);
                }
            });
        } catch (error) {
            console.error('[STATE] Update state failed:', error);
        }
    }

    private validateState(state: GameState): boolean {
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
        } catch (error) {
            console.error('[STATE] State validation error:', error);
            return false;
        }
    }

    // Reset update counter (call this on each frame)
    resetUpdateCounter(): void {
        this.updateCount = 0;
    }

    batchUpdate(updaters: StateUpdater<GameState>[]): void {
        this.updateState(state => {
            return updaters.reduce((accState, updater) => updater(accState), state);
        });
    }

    subscribe(listener: StateListener<GameState>): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getHistory(): Readonly<GameState[]> {
        return [...this.history];
    }

    private deepFreeze<T>(obj: T, visited = new WeakSet()): Readonly<T> {
        // Skip if already frozen or not an object
        if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) {
            return obj;
        }

        // Prevent circular references
        if (visited.has(obj as any)) {
            return obj;
        }
        visited.add(obj as any);

        // Skip Three.js objects and other framework objects
        if (this.isFrameworkObject(obj)) {
            return obj;
        }

        // Handle arrays - selectively freeze
        if (Array.isArray(obj)) {
            // For stars array, don't freeze the Three.js objects but freeze the array itself
            if (this.isStarsArray(obj)) {
                return Object.freeze(obj) as unknown as Readonly<T>;
            }
            return Object.freeze(obj.map(item => this.deepFreeze(item, visited))) as unknown as Readonly<T>;
        }

        // Handle objects - selectively freeze properties
        const frozen: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                // Skip freezing problematic properties but keep them
                if (key === 'stars' || key === 'focusedObject' || this.isFrameworkObject(value)) {
                    frozen[key] = value;
                } else {
                    frozen[key] = this.deepFreeze(value, visited);
                }
            }
        }
        return Object.freeze(frozen);
    }

    private isStarsArray(obj: any): boolean {
        return Array.isArray(obj) && obj.length > 0 && obj[0]?.isMesh;
    }

    private isFrameworkObject(obj: any): boolean {
        // Skip null and undefined
        if (obj == null) {
            return false;
        }
        
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
        if (constructorName && (
            constructorName.startsWith('THREE.') ||
            constructorName === 'Vector3' ||
            constructorName === 'Mesh' ||
            constructorName === 'Object3D' ||
            constructorName === 'Scene' ||
            constructorName === 'Camera' ||
            constructorName === 'Set' ||
            constructorName === 'Map'
        )) {
            return true;
        }
        
        return false;
    }
}

// --- Game State Initialization ---

const initialGameState: GameState = {
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
        thoughtPoints: 0,
        darkMatter: 0
    },
    thoughtSpeedMps: 0,
    cosmicActivity: 0,
    physics: {
        ...physicsConfig.getPhysics(),
        accumulator: 0
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
    discoveredTechnologies: new Set<string>(),
    availableFacilities: new Set<string>(['basic_converter']),
    deviceInfo: {
        isMobile: false,
        isDesktop: true,
        screenWidth: 0,
        screenHeight: 0,
        userAgent: '',
        hasTouchSupport: false,
        lastDetectionTime: 0
    },
    // Prestige system
    prestigeCount: 0,
    prestigePoints: 0,
    totalPrestigePoints: 0,
    prestigeUpgrades: {},
    nextPrestigeTime: undefined,
    lastPrestigeTime: undefined,
    // Game phase system
    currentGamePhase: 0,
    unlockedPhases: new Set<number>([0]),
    phaseProgress: {}
};

// --- Global State Manager Instance ---

export const gameStateManager = new GameStateManager(initialGameState);

// Make gameStateManager available globally for main.js
if (typeof window !== 'undefined') {
    (window as any).gameStateManager = gameStateManager;
}

// --- Legacy Compatibility Layer ---
// This provides backward compatibility for existing code that accesses gameState directly
export const gameState = new Proxy({} as GameState, {
    get(target, prop) {
        const state = gameStateManager.getState();
        return state[prop as keyof GameState];
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
        resolutionScale: 2.0,
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
        resolutionScale: 1.25,
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
    },
    mobile: {
        resolutionScale: 0.75,
        textureQuality: 'medium',
        shadowQuality: 'low',
        antiAliasing: 'off',
        postProcessing: 'low',
        particleDensity: 0.5,
        viewDistance: 'medium',
        frameRateLimit: 30,
        vsync: 'off',
        lightingQuality: 'medium',
        fogEffect: 'simple',
        renderPrecision: 'performance',
        objectDetail: 'medium',
        backgroundDetail: 'simple',
        uiAnimations: 'simple'
    },
    performance: {
        resolutionScale: 0.75,
        textureQuality: 'low',
        shadowQuality: 'off',
        antiAliasing: 'off',
        postProcessing: 'off',
        particleDensity: 0.25,
        viewDistance: 'near',
        frameRateLimit: 60,
        vsync: 'off',
        lightingQuality: 'low',
        fogEffect: 'simple',
        renderPrecision: 'performance',
        objectDetail: 'low',
        backgroundDetail: 'simple',
        uiAnimations: 'off'
    }
} as const;

// Helper function to apply preset to graphics state
export function applyGraphicsPreset(graphics: GraphicsState, presetName: keyof typeof GRAPHICS_PRESETS): GraphicsState {
    const preset = GRAPHICS_PRESETS[presetName];
    // Create a new object instead of modifying the existing one
    return {
        ...graphics,
        ...preset,
        preset: presetName
    };
}

// Helper function to detect if current settings match a preset
export function detectGraphicsPreset(graphics: GraphicsState): string {
    for (const [presetName, preset] of Object.entries(GRAPHICS_PRESETS)) {
        let matches = true;
        for (const [key, value] of Object.entries(preset)) {
            if (graphics[key as keyof GraphicsState] !== value) {
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