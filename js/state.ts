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

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    isCompleted: boolean;
    unlockedAt?: number;
    progress?: number;
    maxProgress?: number;
    reward?: {
        type: string;
        amount: number;
    };
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
    // 新しい思考ポイント研究
    researchPopulationEfficiency: boolean;
    researchResourceMultiplier: boolean;
    researchLifeSpawnRate: boolean;
    researchEvolutionSpeed: boolean;
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
    achievements: Achievement[];
    isInitializing: boolean;
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
    // 新しい思考ポイント研究
    researchPopulationEfficiency: false,
    researchResourceMultiplier: false,
    researchLifeSpawnRate: false,
    researchEvolutionSpeed: false,
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
    },
    achievements: [
        {
            id: 'first_star',
            name: '最初の恒星',
            description: '最初の恒星を見つける',
            icon: '⭐',
            category: '天体創造',
            isCompleted: false,
            maxProgress: 1,
            progress: 0,
            reward: { type: 'cosmicDust', amount: 1000 }
        },
        {
            id: 'first_planet',
            name: '惑星工房',
            description: '初めて惑星を作成する',
            icon: '🪐',
            category: '天体創造',
            isCompleted: false,
            maxProgress: 1,
            progress: 0,
            reward: { type: 'energy', amount: 500 }
        },
        {
            id: 'population_milestone',
            name: '人口爆発',
            description: '総人口が100万を超える',
            icon: '👥',
            category: '文明',
            isCompleted: false,
            maxProgress: 1000000,
            progress: 0,
            reward: { type: 'thoughtPoints', amount: 50 }
        },
        {
            id: 'star_collector',
            name: '星コレクター',
            description: '10個の恒星を作成する',
            icon: '🌟',
            category: '天体創造',
            isCompleted: false,
            maxProgress: 10,
            progress: 0,
            reward: { type: 'darkMatter', amount: 5 }
        },
        {
            id: 'cosmic_dust_hoarder',
            name: '宇宙の塵収集家',
            description: '宇宙の塵を10万個集める',
            icon: '✨',
            category: 'リソース',
            isCompleted: false,
            maxProgress: 100000,
            progress: 0,
            reward: { type: 'cosmicDust', amount: 5000 }
        },
        {
            id: 'intelligent_life',
            name: '知的生命体の誕生',
            description: '知的生命体を持つ惑星を1つ作る',
            icon: '🧠',
            category: '文明',
            isCompleted: false,
            maxProgress: 1,
            progress: 0,
            reward: { type: 'thoughtPoints', amount: 100 }
        },
        {
            id: 'research_complete',
            name: '研究者',
            description: '思考ポイント研究を1つ完了する',
            icon: '🔬',
            category: '研究',
            isCompleted: false,
            maxProgress: 1,
            progress: 0,
            reward: { type: 'thoughtPoints', amount: 200 }
        },
        {
            id: 'time_master',
            name: '時の支配者',
            description: 'ゲーム内で100年経過させる',
            icon: '⏰',
            category: '時間',
            isCompleted: false,
            maxProgress: 100,
            progress: 0,
            reward: { type: 'energy', amount: 1000 }
        }
    ],
    isInitializing: false
};