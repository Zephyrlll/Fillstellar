
import * as THREE from 'three';

// 天体オブジェクトの型定義。userDataプロパティを持つように拡張します。
// まずはany型で定義し、段階的に型を厳密にしていきます。
export interface CelestialBody extends THREE.Object3D {
    userData: any;
}

// ゲーム全体の型定義
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
    physics: any;
    researchEnhancedDust: boolean;
    researchAdvancedEnergy: boolean;
    unlockedCelestialBodies: any;
    graphicsQuality: string;
    currentUnitSystem: string;
    unlockedTimeMultipliers: any;
    currentTimeMultiplier: string;
    timeMultiplierCosts: any;
    isMapVisible: boolean;
    saveVersion: string;
    focusedObject: CelestialBody | null;
    timelineLog: any[];
    maxLogEntries: number;
    statistics: any;
    cachedTotalPopulation?: number; // main.tsで追加されるプロパティ
    currentDustRate?: number;      // main.tsで追加されるプロパティ
}

// --- ゲーム状態管理 -----------------------------------------------------------
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
