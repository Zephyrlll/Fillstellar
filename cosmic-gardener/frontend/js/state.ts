import * as THREE from 'three';

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
    graphicsQuality: string;
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
        dragFactor: 0.01
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
    graphicsQuality: 'medium',
    currentUnitSystem: 'astronomical',
    unlockedTimeMultipliers: { '2x': false, '5x': false, '10x': false },
    currentTimeMultiplier: '1x',
    timeMultiplierCosts: { '2x': 500, '5x': 2000, '10x': 5000 },
    isMapVisible: true,
    saveVersion: '1.6-accumulator',
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
    }
};