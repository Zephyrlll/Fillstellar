import { gameState, gameStateManager } from '../state.js';
import { balanceManager, BalanceConfig } from './balanceConfig.js';

export class BalanceAdjustments {
  private static instance: BalanceAdjustments;
  private appliedVersion: string = '0.0.0';
  
  private constructor() {
    console.log('[BALANCE] Balance adjustments system initialized');
  }
  
  static getInstance(): BalanceAdjustments {
    if (!BalanceAdjustments.instance) {
      BalanceAdjustments.instance = new BalanceAdjustments();
    }
    return BalanceAdjustments.instance;
  }
  
  // Apply balance adjustments based on game progression
  applyDynamicBalance(): void {
    const config = balanceManager.getConfig();
    
    // Adjust resource rates based on game progression
    this.adjustResourceRates();
    
    // Adjust creation costs based on abundance
    this.adjustCreationCosts();
    
    // Apply achievement balance
    this.checkAchievementBalance();
  }
  
  private adjustResourceRates(): void {
    // Dynamic dust rate based on number of asteroids/comets
    const asteroidCount = gameState.stars.filter(s => 
      s.userData.type === 'asteroid' || s.userData.type === 'comet'
    ).length;
    
    // Logarithmic scaling to prevent exponential growth
    const dustMultiplier = 1 + Math.log10(asteroidCount + 1) * 0.1;
    
    // Apply research multipliers
    const researchMultipliers = {
      cosmicDust: gameState.research?.dustGenerationMultiplier || 1,
      energy: gameState.research?.energyConversionMultiplier || 1,
      darkMatter: gameState.research?.darkMatterGenerationMultiplier || 1,
      thoughtPoints: gameState.research?.thoughtGenerationMultiplier || 1
    };
    
    // Update game state with balanced rates
    gameStateManager.updateState(state => ({
      ...state,
      balancedRates: {
        cosmicDust: dustMultiplier * researchMultipliers.cosmicDust,
        energy: researchMultipliers.energy,
        darkMatter: researchMultipliers.darkMatter,
        thoughtPoints: researchMultipliers.thoughtPoints
      }
    }));
  }
  
  private adjustCreationCosts(): void {
    // Increase costs based on existing body count to prevent spam
    const bodyCounts = {
      asteroid: gameState.stars.filter(s => s.userData.type === 'asteroid').length,
      comet: gameState.stars.filter(s => s.userData.type === 'comet').length,
      planet: gameState.stars.filter(s => s.userData.type === 'planet').length,
      star: gameState.stars.filter(s => s.userData.type === 'star').length,
      black_hole: gameState.stars.filter(s => s.userData.type === 'black_hole').length
    };
    
    // Apply scaling factors
    const costMultipliers: Record<string, number> = {};
    for (const [type, count] of Object.entries(bodyCounts)) {
      // Exponential cost increase: 1.1^count (10% per existing body)
      costMultipliers[type] = Math.pow(1.1, count);
    }
    
    // Store multipliers in game state
    gameStateManager.updateState(state => ({
      ...state,
      creationCostMultipliers: costMultipliers
    }));
  }
  
  private checkAchievementBalance(): void {
    // Check if achievement thresholds need adjustment
    const totalAchievements = Object.keys(gameState.unlockedAchievements || {}).length;
    const achievementRate = totalAchievements / (gameState.gameYear || 1);
    
    // If unlocking too fast (>1 per game year), suggest harder thresholds
    if (achievementRate > 1) {
      console.log('[BALANCE] High achievement rate detected:', achievementRate.toFixed(2), 'per year');
    }
  }
  
  // Apply one-time balance migrations for save compatibility
  applyBalanceMigrations(saveVersion: string): void {
    if (this.compareVersions(saveVersion, '1.0.0') < 0) {
      this.migrateToV1();
    }
    
    if (this.compareVersions(saveVersion, '1.1.0') < 0) {
      this.migrateToV1_1();
    }
    
    this.appliedVersion = '1.1.0'; // Current balance version
  }
  
  private migrateToV1(): void {
    console.log('[BALANCE] Applying v1.0.0 balance migration');
    
    // Adjust existing resources if they're too high
    gameStateManager.updateState(state => {
      const adjusted = { ...state };
      
      // Cap resources at reasonable levels
      const resourceCaps = {
        cosmicDust: 1000000,
        energy: 100000,
        organicMatter: 50000,
        biomass: 25000,
        darkMatter: 10000,
        thoughtPoints: 5000
      };
      
      for (const [resource, cap] of Object.entries(resourceCaps)) {
        if (adjusted.resources[resource] > cap) {
          console.log(`[BALANCE] Capping ${resource} from ${adjusted.resources[resource]} to ${cap}`);
          adjusted.resources[resource] = cap;
        }
      }
      
      return adjusted;
    });
  }
  
  private migrateToV1_1(): void {
    console.log('[BALANCE] Applying v1.1.0 balance migration');
    
    // Adjust upgrade costs if they were using old formula
    const currentDustLevel = gameState.dustUpgradeLevel || 0;
    const newCost = balanceManager.getUpgradeCost('dustProduction', currentDustLevel);
    
    gameStateManager.updateState(state => ({
      ...state,
      dustUpgradeCost: newCost
    }));
  }
  
  // Utility function to compare version strings
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }
  
  // Get current balance statistics
  getBalanceStats(): {
    resourceGenerationRates: Record<string, number>;
    bodyCreationAffordability: Record<string, boolean>;
    progressionSpeed: string;
  } {
    const config = balanceManager.getConfig();
    
    // Calculate actual generation rates
    const resourceGenerationRates: Record<string, number> = {
      cosmicDust: gameState.currentDustRate || 0,
      energy: gameState.stars.filter(s => s.userData.type === 'star').length * 0.001,
      organicMatter: gameState.stars.filter(s => 
        s.userData.type === 'planet' && (s.userData as any).hasLife
      ).length * 0.1,
      biomass: 0, // Calculate from life stages
      darkMatter: gameState.stars.filter(s => s.userData.type === 'black_hole').length * 0.0001,
      thoughtPoints: (gameState.cachedTotalPopulation || 0) / 1000000
    };
    
    // Check what bodies player can afford
    const bodyCreationAffordability: Record<string, boolean> = {};
    for (const [bodyType, cost] of Object.entries(config.creationCosts)) {
      let canAfford = true;
      for (const [resource, amount] of Object.entries(cost)) {
        if (gameState.resources[resource] < amount) {
          canAfford = false;
          break;
        }
      }
      bodyCreationAffordability[bodyType] = canAfford;
    }
    
    // Determine progression speed
    let progressionSpeed = 'balanced';
    const yearsPerBody = gameState.gameYear / Math.max(gameState.stars.length, 1);
    
    if (yearsPerBody < 1) {
      progressionSpeed = 'very fast';
    } else if (yearsPerBody < 5) {
      progressionSpeed = 'fast';
    } else if (yearsPerBody > 20) {
      progressionSpeed = 'slow';
    } else if (yearsPerBody > 50) {
      progressionSpeed = 'very slow';
    }
    
    return {
      resourceGenerationRates,
      bodyCreationAffordability,
      progressionSpeed
    };
  }
  
  // Debug commands for testing balance
  debugSetResource(resource: string, amount: number): void {
    if (gameState.resources.hasOwnProperty(resource)) {
      gameStateManager.updateState(state => ({
        ...state,
        resources: {
          ...state.resources,
          [resource]: amount
        }
      }));
      console.log(`[BALANCE] Set ${resource} to ${amount}`);
    }
  }
  
  debugMultiplyRates(multiplier: number): void {
    console.log(`[BALANCE] Multiplying all rates by ${multiplier}`);
    const config = balanceManager.getConfig();
    
    for (const resource of Object.keys(config.resourceRates)) {
      config.resourceRates[resource as keyof typeof config.resourceRates].base *= multiplier;
    }
    
    balanceManager.updateConfig(config);
  }
}

export const balanceAdjustments = BalanceAdjustments.getInstance();