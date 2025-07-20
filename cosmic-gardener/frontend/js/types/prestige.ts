// Prestige system type definitions

export interface PrestigeRequirements {
  minPlayTime: number; // Minimum play time in milliseconds
  minResources: number; // Minimum total resources
  minCelestialBodies: number; // Minimum number of celestial bodies
  hasIntelligentLife: boolean; // Must have at least one intelligent life
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costScaling: number; // Multiplier per level
  effect: {
    type: PrestigeEffectType;
    value: number; // Per level
    target?: string; // Resource type or specific target
  };
  icon?: string;
  prerequisite?: string; // Another upgrade ID
}

export enum PrestigeEffectType {
  RESOURCE_MULTIPLIER = 'resource_multiplier',
  PRODUCTION_RATE = 'production_rate',
  OFFLINE_EFFICIENCY = 'offline_efficiency',
  STARTING_RESOURCES = 'starting_resources',
  RESEARCH_SPEED = 'research_speed',
  CONVERSION_EFFICIENCY = 'conversion_efficiency',
  CELESTIAL_COST_REDUCTION = 'celestial_cost_reduction',
  ACHIEVEMENT_BONUS = 'achievement_bonus'
}

export interface PrestigeCalculationResult {
  prestigePoints: number;
  breakdown: {
    basePoints: number;
    resourceBonus: number;
    celestialBonus: number;
    achievementBonus: number;
    timeBonus: number;
  };
  bonusMultiplier: number;
}

export interface PrestigeState {
  canPrestige: boolean;
  requirements: PrestigeRequirements;
  currentProgress: {
    playTime: number;
    totalResources: number;
    celestialBodies: number;
    hasIntelligentLife: boolean;
  };
  projectedPoints: number;
}

// Game phase types
export interface GamePhase {
  id: number;
  name: string;
  description: string;
  unlockRequirements: {
    resources?: Partial<Record<string, number>>;
    celestialBodies?: Partial<Record<string, number>>;
    research?: string[];
    prestigeCount?: number;
    customCheck?: () => boolean;
  };
  unlocks: {
    resources?: string[];
    celestialBodies?: string[];
    research?: string[];
    features?: string[];
  };
  tutorialSteps?: string[];
}

export interface PhaseProgress {
  phaseId: number;
  startTime: number;
  completionTime?: number;
  tutorialsCompleted: string[];
}