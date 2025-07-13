import * as THREE from 'three';
import { ResourceStorage } from './resourceSystem.js';

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
    };
    thoughtSpeedMps: number;
    cosmicActivity: number;
    physics: PhysicsState;
    researchEnhancedDust: boolean;
    researchAdvancedEnergy: boolean;
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
}

// --- Game State Initialization ---

export const gameState: GameState = {
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
    discoveredTechnologies: new Set<string>(),
    availableFacilities: new Set<string>(['basic_converter'])
};

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
} as const;

// Helper function to apply preset to graphics state
export function applyGraphicsPreset(graphics: GraphicsState, presetName: keyof typeof GRAPHICS_PRESETS): void {
    const preset = GRAPHICS_PRESETS[presetName];
    graphics.preset = presetName;
    Object.assign(graphics, preset);
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