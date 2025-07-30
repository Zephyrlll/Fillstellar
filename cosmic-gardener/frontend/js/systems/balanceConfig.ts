// Balance configuration for idle game mechanics

export interface ResourceRate {
  base: number;
  perLevel: number;
  maxLevel?: number;
}

export interface BodyCreationCost {
  cosmicDust?: number;
  energy?: number;
  organicMatter?: number;
  biomass?: number;
  darkMatter?: number;
  thoughtPoints?: number;
}

export interface BalanceConfig {
  // Resource generation rates
  resourceRates: {
    cosmicDust: ResourceRate;
    energy: ResourceRate;
    organicMatter: ResourceRate;
    biomass: ResourceRate;
    darkMatter: ResourceRate;
    thoughtPoints: ResourceRate;
  };
  
  // Body creation costs
  creationCosts: {
    asteroid: BodyCreationCost;
    comet: BodyCreationCost;
    planet: BodyCreationCost;
    star: BodyCreationCost;
    black_hole: BodyCreationCost;
  };
  
  // Life evolution requirements
  lifeEvolution: {
    spawnChance: number; // Base chance per second
    evolutionThresholds: {
      microbial: number; // Population needed
      plant: number;
      animal: number;
      intelligent: number;
    };
  };
  
  // Offline progress settings
  offlineProgress: {
    baseEfficiency: number; // 0-1, how much of online rate
    maxOfflineHours: number;
    catchUpSpeed: number; // Multiplier for fast-forwarding
  };
  
  // Achievement requirements
  achievementThresholds: {
    resources: {
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
      tier5: number;
    };
    bodies: {
      asteroid: number[];
      planet: number[];
      star: number[];
      blackHole: number[];
    };
    population: number[];
  };
  
  // Upgrade costs and effects
  upgrades: {
    dustProduction: {
      baseCost: number;
      costMultiplier: number;
      effectPerLevel: number;
    };
    darkMatterConverter: {
      baseCost: number;
      costMultiplier: number;
      effectPerLevel: number;
    };
  };
}

// Default balanced configuration
export const defaultBalanceConfig: BalanceConfig = {
  resourceRates: {
    cosmicDust: { base: 6, perLevel: 1.0 }, // Doubled from 3 to 6 for faster early game
    energy: { base: 0.1, perLevel: 0.002 }, // Added base generation, doubled per level
    organicMatter: { base: 0, perLevel: 0.2 }, // Doubled per life stage
    biomass: { base: 0, perLevel: 0.1 }, // Doubled
    darkMatter: { base: 0, perLevel: 0.0002 }, // Doubled
    thoughtPoints: { base: 0, perLevel: 0.000002 } // Doubled
  },
  
  creationCosts: {
    asteroid: { cosmicDust: 5 }, // Reduced from 10
    comet: { cosmicDust: 15, energy: 3 }, // Reduced from 25/5
    planet: { cosmicDust: 50, energy: 25 }, // Reduced from 100/50
    star: { cosmicDust: 500, energy: 250 }, // Reduced from 1000/500
    black_hole: { cosmicDust: 5000, energy: 2500, darkMatter: 50 } // Reduced from 10000/5000/100
  },
  
  lifeEvolution: {
    spawnChance: 0.001, // 0.1% per second for suitable planets
    evolutionThresholds: {
      microbial: 100,
      plant: 10000,
      animal: 1000000,
      intelligent: 100000000
    }
  },
  
  offlineProgress: {
    baseEfficiency: 0.5, // 50% of online rate
    maxOfflineHours: 24,
    catchUpSpeed: 10 // 10x speed for catch-up animation
  },
  
  achievementThresholds: {
    resources: {
      tier1: 100,
      tier2: 1000,
      tier3: 10000,
      tier4: 100000,
      tier5: 1000000
    },
    bodies: {
      asteroid: [1, 10, 50, 100, 500],
      planet: [1, 5, 10, 25, 50],
      star: [1, 3, 5, 10, 20],
      blackHole: [1, 2, 3, 5, 10]
    },
    population: [1000, 1000000, 1000000000, 1000000000000, 1000000000000000]
  },
  
  upgrades: {
    dustProduction: {
      baseCost: 50,
      costMultiplier: 1.5,
      effectPerLevel: 0.5 // +50% per level
    },
    darkMatterConverter: {
      baseCost: 500,  // Reduced from 1000 to 500 for better progression
      costMultiplier: 2,
      effectPerLevel: 0.001 // +0.1% conversion rate
    }
  }
};

// Singleton balance manager
export class BalanceManager {
  private static instance: BalanceManager;
  private config: BalanceConfig;
  
  private constructor() {
    this.config = defaultBalanceConfig;
    this.loadConfig();
  }
  
  static getInstance(): BalanceManager {
    if (!BalanceManager.instance) {
      BalanceManager.instance = new BalanceManager();
    }
    return BalanceManager.instance;
  }
  
  getConfig(): BalanceConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<BalanceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    console.log('[BALANCE] Configuration updated');
  }
  
  // Resource rate calculations
  getResourceRate(resource: keyof BalanceConfig['resourceRates'], level: number = 0): number {
    const rate = this.config.resourceRates[resource];
    return rate.base + (rate.perLevel * level);
  }
  
  // Creation cost calculations
  getCreationCost(bodyType: keyof BalanceConfig['creationCosts']): BodyCreationCost {
    return { ...this.config.creationCosts[bodyType] };
  }
  
  // Upgrade cost calculations
  getUpgradeCost(upgrade: keyof BalanceConfig['upgrades'], currentLevel: number): number {
    const upgradeConfig = this.config.upgrades[upgrade];
    return Math.floor(upgradeConfig.baseCost * Math.pow(upgradeConfig.costMultiplier, currentLevel));
  }
  
  // Life evolution calculations
  getEvolutionThreshold(stage: keyof BalanceConfig['lifeEvolution']['evolutionThresholds']): number {
    return this.config.lifeEvolution.evolutionThresholds[stage];
  }
  
  // Achievement threshold calculations
  getAchievementThreshold(category: keyof BalanceConfig['achievementThresholds'], tier: number): number | number[] {
    const thresholds = this.config.achievementThresholds[category];
    if (category === 'resources') {
      const tierKeys = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5'] as const;
      return thresholds[tierKeys[tier - 1]];
    }
    return thresholds;
  }
  
  // Save/load configuration
  private saveConfig(): void {
    try {
      localStorage.setItem('cosmicGardener_balanceConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('[BALANCE] Failed to save configuration:', error);
    }
  }
  
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('cosmicGardener_balanceConfig');
      if (saved) {
        this.config = { ...defaultBalanceConfig, ...JSON.parse(saved) };
        console.log('[BALANCE] Configuration loaded');
      }
    } catch (error) {
      console.error('[BALANCE] Failed to load configuration:', error);
      this.config = defaultBalanceConfig;
    }
  }
  
  // Reset to defaults
  resetToDefaults(): void {
    this.config = defaultBalanceConfig;
    this.saveConfig();
    console.log('[BALANCE] Configuration reset to defaults');
  }
}

export const balanceManager = BalanceManager.getInstance();