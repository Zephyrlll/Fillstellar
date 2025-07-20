import { gameState, gameStateManager } from '../state.js';
import { 
  PrestigeRequirements, 
  PrestigeState, 
  PrestigeCalculationResult,
  PrestigeUpgrade,
  PrestigeEffectType
} from '../types/prestige.js';
import { prestigeUpgrades } from './prestigeUpgrades.js';
import { SaveSystem } from './saveSystem.js';
// Feedback system will be passed as a parameter to avoid circular dependency

export class PrestigeSystem {
  private static instance: PrestigeSystem;
  private saveSystem: SaveSystem;
  private requirements: PrestigeRequirements = {
    minPlayTime: 10 * 60 * 1000, // 10 minutes
    minResources: 1000000, // 1M total resources
    minCelestialBodies: 5,
    hasIntelligentLife: true
  };
  
  private constructor() {
    this.saveSystem = new SaveSystem();
    console.log('[PRESTIGE] System initialized');
  }
  
  static getInstance(): PrestigeSystem {
    if (!PrestigeSystem.instance) {
      PrestigeSystem.instance = new PrestigeSystem();
    }
    return PrestigeSystem.instance;
  }
  
  // Check if prestige is available
  canPrestige(): boolean {
    const state = this.getPrestigeState();
    return state.canPrestige;
  }
  
  // Get current prestige state
  getPrestigeState(): PrestigeState {
    const currentState = gameStateManager.getState();
    const totalResources = this.calculateTotalResources();
    const celestialCount = currentState.stars.length;
    const hasIntelligentLife = this.checkForIntelligentLife();
    const playTime = currentState.totalPlayTime || 0;
    
    const meetsRequirements = 
      playTime >= this.requirements.minPlayTime &&
      totalResources >= this.requirements.minResources &&
      celestialCount >= this.requirements.minCelestialBodies &&
      hasIntelligentLife;
    
    return {
      canPrestige: meetsRequirements,
      requirements: this.requirements,
      currentProgress: {
        playTime,
        totalResources,
        celestialBodies: celestialCount,
        hasIntelligentLife
      },
      projectedPoints: this.calculatePrestigePoints().prestigePoints
    };
  }
  
  // Calculate prestige points
  calculatePrestigePoints(): PrestigeCalculationResult {
    const state = gameStateManager.getState();
    const totalResources = this.calculateTotalResources();
    const celestialCount = state.stars.length;
    const achievementCount = this.getAchievementCount();
    const playTime = state.totalPlayTime || 0;
    
    // Base calculation: log10 of total resources
    const basePoints = Math.max(0, Math.log10(totalResources));
    
    // Celestial bonus: sqrt of celestial body count
    const celestialBonus = Math.sqrt(celestialCount);
    
    // Achievement bonus: 1% per achievement
    const achievementBonus = achievementCount * 0.01;
    
    // Time bonus: diminishing returns on play time (hours)
    const hoursPlayed = playTime / (1000 * 60 * 60);
    const timeBonus = Math.log(1 + hoursPlayed) * 0.5;
    
    // Total multiplier
    const bonusMultiplier = 1 + achievementBonus + timeBonus;
    
    // Final calculation
    const prestigePoints = Math.floor(
      (basePoints + celestialBonus) * bonusMultiplier
    );
    
    return {
      prestigePoints,
      breakdown: {
        basePoints,
        resourceBonus: 0, // Can be expanded later
        celestialBonus,
        achievementBonus: achievementBonus * basePoints,
        timeBonus: timeBonus * basePoints
      },
      bonusMultiplier
    };
  }
  
  // Execute prestige
  async executePrestige(): Promise<void> {
    if (!this.canPrestige()) {
      console.warn('[PRESTIGE] Cannot prestige - requirements not met');
      return;
    }
    
    const state = gameStateManager.getState();
    const calculation = this.calculatePrestigePoints();
    
    console.log('[PRESTIGE] Executing prestige:', calculation);
    
    // Save current state for statistics
    const currentStats = {
      playTime: state.totalPlayTime,
      celestialBodies: state.stars.length,
      totalResources: this.calculateTotalResources()
    };
    
    // Update state with prestige data
    gameStateManager.updateState(state => ({
      ...state,
      // Increment prestige stats
      prestigeCount: (state.prestigeCount || 0) + 1,
      prestigePoints: (state.prestigePoints || 0) + calculation.prestigePoints,
      totalPrestigePoints: (state.totalPrestigePoints || 0) + calculation.prestigePoints,
      lastPrestigeTime: Date.now(),
      
      // Reset game progress
      gameYear: 0,
      cosmicDust: this.getStartingResources('cosmicDust'),
      energy: this.getStartingResources('energy'),
      organicMatter: 0,
      biomass: 0,
      darkMatter: 0,
      thoughtPoints: 0,
      stars: [],
      
      // Reset research but keep prestige upgrades
      research: {
        completedResearch: [],
        dustGenerationMultiplier: 1,
        energyConversionMultiplier: 1,
        allResourceMultiplier: 1,
        lifeSpawnChanceMultiplier: 1,
        evolutionSpeedMultiplier: 1,
        populationGrowthMultiplier: 1,
        thoughtGenerationMultiplier: 1,
        researchSpeedMultiplier: 1,
        darkMatterGenerationMultiplier: 1,
        conversionEfficiencyMultiplier: 1,
        cosmicActivityMultiplier: 1
      },
      
      // Reset unlocked celestial bodies to default
      unlockedCelestialBodies: {
        asteroid: true,
        comet: true,
        moon: false,
        dwarfPlanet: false,
        planet: false,
        star: false
      },
      
      // Reset timeline
      timelineLog: [],
      
      // Keep game phase progress
      currentGamePhase: state.currentGamePhase || 0,
      
      // Clear cached values
      cachedTotalPopulation: 0,
      currentDustRate: 0
    }));
    
    // Save immediately after prestige
    await this.saveSystem.saveGame();
    
    // Show feedback
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showEventBanner(
        'ビッグバン実行！',
        `${calculation.prestigePoints} プレステージポイントを獲得しました！`,
        'success'
      );
    }
    
    // Reload page to reset Three.js scene
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
  
  // Get purchased upgrade level
  getUpgradeLevel(upgradeId: string): number {
    const state = gameStateManager.getState();
    return state.prestigeUpgrades?.[upgradeId] || 0;
  }
  
  // Purchase upgrade
  purchaseUpgrade(upgradeId: string): boolean {
    const upgrade = prestigeUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      console.error('[PRESTIGE] Unknown upgrade:', upgradeId);
      return false;
    }
    
    const currentLevel = this.getUpgradeLevel(upgradeId);
    if (currentLevel >= upgrade.maxLevel) {
      console.warn('[PRESTIGE] Upgrade already at max level');
      return false;
    }
    
    const cost = this.getUpgradeCost(upgrade, currentLevel);
    const state = gameStateManager.getState();
    
    if ((state.prestigePoints || 0) < cost) {
      console.warn('[PRESTIGE] Not enough prestige points');
      return false;
    }
    
    // Check prerequisites
    if (upgrade.prerequisite && this.getUpgradeLevel(upgrade.prerequisite) === 0) {
      console.warn('[PRESTIGE] Prerequisite not met');
      return false;
    }
    
    // Purchase upgrade
    gameStateManager.updateState(state => ({
      ...state,
      prestigePoints: (state.prestigePoints || 0) - cost,
      prestigeUpgrades: {
        ...state.prestigeUpgrades,
        [upgradeId]: currentLevel + 1
      }
    }));
    
    console.log('[PRESTIGE] Upgrade purchased:', upgradeId, 'Level:', currentLevel + 1);
    
    return true;
  }
  
  // Get upgrade cost
  getUpgradeCost(upgrade: PrestigeUpgrade, currentLevel: number): number {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
  }
  
  // Get upgrade effect value
  getUpgradeEffect(upgradeId: string): number {
    const upgrade = prestigeUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) return 0;
    
    const level = this.getUpgradeLevel(upgradeId);
    return upgrade.effect.value * level;
  }
  
  // Get total multiplier for a resource type
  getResourceMultiplier(resourceType: string): number {
    let multiplier = 1;
    
    for (const upgrade of prestigeUpgrades) {
      if (upgrade.effect.type === PrestigeEffectType.RESOURCE_MULTIPLIER) {
        if (!upgrade.effect.target || upgrade.effect.target === resourceType) {
          multiplier += this.getUpgradeEffect(upgrade.id);
        }
      }
    }
    
    return multiplier;
  }
  
  // Get starting resources after prestige
  private getStartingResources(resourceType: string): number {
    let baseAmount = resourceType === 'cosmicDust' ? 150000 : 0;
    
    for (const upgrade of prestigeUpgrades) {
      if (upgrade.effect.type === PrestigeEffectType.STARTING_RESOURCES &&
          upgrade.effect.target === resourceType) {
        baseAmount += this.getUpgradeEffect(upgrade.id);
      }
    }
    
    return baseAmount;
  }
  
  // Calculate total resources
  private calculateTotalResources(): number {
    const state = gameStateManager.getState();
    return (
      state.cosmicDust +
      state.energy +
      state.organicMatter +
      state.biomass +
      state.darkMatter +
      state.thoughtPoints
    );
  }
  
  // Check for intelligent life
  private checkForIntelligentLife(): boolean {
    const state = gameStateManager.getState();
    return state.stars.some(body => 
      body.userData.type === 'planet' &&
      body.userData.hasLife &&
      body.userData.lifeStage === 'intelligent'
    );
  }
  
  // Get achievement count (placeholder - will integrate with achievement system)
  private getAchievementCount(): number {
    try {
      const achievementData = localStorage.getItem('achievementData');
      if (achievementData) {
        const data = JSON.parse(achievementData);
        return data.unlockedIds?.length || 0;
      }
    } catch (error) {
      console.error('[PRESTIGE] Failed to get achievement count:', error);
    }
    return 0;
  }
}

export const prestigeSystem = PrestigeSystem.getInstance();