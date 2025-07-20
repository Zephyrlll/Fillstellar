import { Achievement, AchievementData, AchievementProgress } from '../types/achievements.js';
import { achievements, getAchievementById, getTotalAchievementCount } from './achievementDefinitions.js';
import { gameState, gameStateManager } from '../state.js';
import { FeedbackSystem } from './feedbackSystem.js';

export class AchievementSystem {
  private data: AchievementData = {
    unlockedIds: [],
    unlockedAt: {},
    newlyUnlocked: []
  };
  
  private checkInterval: number | null = null;
  private feedbackSystem: FeedbackSystem | null = null;
  
  constructor() {
    this.loadData();
  }
  
  init(feedbackSystem: FeedbackSystem): void {
    this.feedbackSystem = feedbackSystem;
    this.startChecking();
    
    // Check achievements once on init
    this.checkAchievements();
  }
  
  private loadData(): void {
    const saved = localStorage.getItem('achievementData');
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (error) {
        console.error('[ACHIEVEMENTS] Failed to load data:', error);
      }
    }
  }
  
  private saveData(): void {
    try {
      localStorage.setItem('achievementData', JSON.stringify(this.data));
    } catch (error) {
      console.error('[ACHIEVEMENTS] Failed to save data:', error);
    }
  }
  
  checkAchievements(): void {
    const previousCount = this.data.unlockedIds.length;
    this.data.newlyUnlocked = [];
    
    for (const achievement of achievements) {
      if (!this.isUnlocked(achievement.id)) {
        try {
          if (achievement.requirement(gameState)) {
            this.unlock(achievement);
          }
        } catch (error) {
          console.error(`[ACHIEVEMENTS] Error checking ${achievement.id}:`, error);
        }
      }
    }
    
    // Check perfectionist achievement if all others are unlocked
    if (this.data.unlockedIds.length === achievements.length - 1 && !this.isUnlocked('perfectionist')) {
      const perfectionist = getAchievementById('perfectionist');
      if (perfectionist) {
        this.unlock(perfectionist);
      }
    }
    
    // Save if any new achievements were unlocked
    if (this.data.unlockedIds.length > previousCount) {
      this.saveData();
    }
  }
  
  private unlock(achievement: Achievement): void {
    console.log(`[ACHIEVEMENTS] Unlocked: ${achievement.name}`);
    
    // Record unlock
    this.data.unlockedIds.push(achievement.id);
    this.data.unlockedAt[achievement.id] = Date.now();
    this.data.newlyUnlocked.push(achievement.id);
    
    // Grant rewards
    if (achievement.reward) {
      this.grantReward(achievement);
    }
    
    // Show notification
    if (this.feedbackSystem) {
      this.feedbackSystem.showAchievementUnlocked({
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon
      });
      
      // Also show a toast for the reward
      if (achievement.reward) {
        let rewardText = '報酬: ';
        const rewards = [];
        
        if (achievement.reward.resources) {
          for (const [resource, amount] of Object.entries(achievement.reward.resources)) {
            rewards.push(`${resource} +${amount}`);
          }
        }
        
        if (achievement.reward.multipliers) {
          for (const [multiplier, value] of Object.entries(achievement.reward.multipliers)) {
            rewards.push(`${multiplier} x${value}`);
          }
        }
        
        if (rewards.length > 0) {
          rewardText += rewards.join(', ');
          this.feedbackSystem.showToast({
            message: rewardText,
            type: 'success',
            duration: 5000
          });
        }
      }
    }
    
    // Update statistics
    gameStateManager.updateState(state => ({
      ...state,
      statistics: {
        ...state.statistics,
        achievementsUnlocked: this.data.unlockedIds.length,
        lastAchievementTime: Date.now()
      }
    }));
  }
  
  private grantReward(achievement: Achievement): void {
    if (!achievement.reward) return;
    
    // Combine all updates into a single state update to avoid excessive updates
    gameStateManager.updateState(state => {
      let newState = { ...state };
      
      // Grant resources
      if (achievement.reward!.resources) {
        for (const [resource, amount] of Object.entries(achievement.reward!.resources)) {
          if (resource in newState) {
            (newState as any)[resource] = (newState as any)[resource] + amount;
          }
        }
      }
      
      // Apply multipliers
      if (achievement.reward!.multipliers) {
        const achievementMultipliers = newState.achievementMultipliers ? 
          { ...newState.achievementMultipliers } : {};
        
        for (const [multiplier, value] of Object.entries(achievement.reward!.multipliers)) {
          const key = achievement.reward!.permanent ? `${multiplier}_permanent` : multiplier;
          achievementMultipliers[key] = (achievementMultipliers[key] || 1) * value;
        }
        
        newState = {
          ...newState,
          achievementMultipliers
        };
      }
      
      return newState;
    });
  }
  
  isUnlocked(achievementId: string): boolean {
    return this.data.unlockedIds.includes(achievementId);
  }
  
  getProgress(achievementId: string): AchievementProgress | null {
    const achievement = getAchievementById(achievementId);
    if (!achievement) return null;
    
    const unlocked = this.isUnlocked(achievementId);
    const unlockedAt = this.data.unlockedAt[achievementId];
    
    const progress: AchievementProgress = {
      achievement,
      unlocked,
      unlockedAt
    };
    
    if (!unlocked && achievement.progress) {
      try {
        progress.progress = achievement.progress(gameState);
      } catch (error) {
        console.error(`[ACHIEVEMENTS] Error getting progress for ${achievementId}:`, error);
      }
    }
    
    return progress;
  }
  
  getAllProgress(): AchievementProgress[] {
    return achievements.map(achievement => {
      const unlocked = this.isUnlocked(achievement.id);
      const unlockedAt = this.data.unlockedAt[achievement.id];
      
      const progress: AchievementProgress = {
        achievement,
        unlocked,
        unlockedAt
      };
      
      if (!unlocked && achievement.progress) {
        try {
          progress.progress = achievement.progress(gameState);
        } catch (error) {
          console.error(`[ACHIEVEMENTS] Error getting progress for ${achievement.id}:`, error);
        }
      }
      
      return progress;
    });
  }
  
  getCategoryProgress(category: string): { unlocked: number; total: number; percentage: number } {
    const categoryAchievements = achievements.filter(a => a.category === category);
    const unlockedCount = categoryAchievements.filter(a => this.isUnlocked(a.id)).length;
    
    return {
      unlocked: unlockedCount,
      total: categoryAchievements.length,
      percentage: categoryAchievements.length > 0 ? (unlockedCount / categoryAchievements.length) * 100 : 0
    };
  }
  
  getOverallProgress(): { unlocked: number; total: number; percentage: number } {
    return {
      unlocked: this.data.unlockedIds.length,
      total: achievements.length,
      percentage: (this.data.unlockedIds.length / achievements.length) * 100
    };
  }
  
  getNewlyUnlocked(): Achievement[] {
    return this.data.newlyUnlocked
      .map(id => getAchievementById(id))
      .filter(a => a !== undefined) as Achievement[];
  }
  
  clearNewlyUnlocked(): void {
    this.data.newlyUnlocked = [];
  }
  
  // Get effective multipliers including achievement bonuses
  getEffectiveMultipliers(): Record<string, number> {
    const multipliers: Record<string, number> = {
      dustGeneration: 1,
      energyGeneration: 1,
      organicMatter: 1,
      biomass: 1,
      darkMatter: 1,
      thoughtPoints: 1,
      offlineEfficiency: 1,
      researchSpeed: 1
    };
    
    // Apply achievement multipliers
    const achievementMultipliers = (gameState as any).achievementMultipliers || {};
    for (const [key, value] of Object.entries(achievementMultipliers)) {
      const baseKey = key.replace('_permanent', '');
      if (baseKey in multipliers) {
        multipliers[baseKey] *= value as number;
      }
    }
    
    return multipliers;
  }
  
  private startChecking(): void {
    // Check achievements every 5 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkAchievements();
    }, 5000);
  }
  
  destroy(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  // Debug methods
  unlockAll(): void {
    console.log('[ACHIEVEMENTS] Unlocking all achievements (debug)');
    for (const achievement of achievements) {
      if (!this.isUnlocked(achievement.id)) {
        this.unlock(achievement);
      }
    }
  }
  
  reset(): void {
    console.log('[ACHIEVEMENTS] Resetting all achievements (debug)');
    this.data = {
      unlockedIds: [],
      unlockedAt: {},
      newlyUnlocked: []
    };
    this.saveData();
  }
}