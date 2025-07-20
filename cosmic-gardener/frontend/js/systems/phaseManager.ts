/**
 * Phase Manager
 * Manages game progression phases and transitions
 */

import { gameState, gameStateManager } from '../state.js';
import { 
  GamePhase, 
  PhaseState, 
  PhaseProgress, 
  RequirementProgress,
  PhaseRequirementType,
  PhaseRewardType,
  UnlockEvent,
  UnlockEventType
} from '../types/gamePhase.js';
import { gamePhases, getPhaseById, getNextPhase } from './gamePhases.js';
import { SaveSystem } from './saveSystem.js';

export class PhaseManager {
  private static instance: PhaseManager;
  private saveSystem: SaveSystem;
  private updateInterval: number | null = null;
  private unlockCallbacks: ((event: UnlockEvent) => void)[] = [];
  
  private constructor() {
    this.saveSystem = new SaveSystem();
    console.log('[PHASE] Manager initialized');
  }
  
  static getInstance(): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager();
    }
    return PhaseManager.instance;
  }
  
  // Initialize phase system
  init(): void {
    // Set initial phase if not set
    const state = gameStateManager.getState();
    if (state.currentGamePhase === undefined) {
      gameStateManager.updateState(state => ({
        ...state,
        currentGamePhase: 0,
        unlockedPhases: new Set([0]),
        phaseProgress: []
      }));
    }
    
    // Start update loop
    this.startUpdateLoop();
  }
  
  // Get current phase state
  getPhaseState(): PhaseState {
    const state = gameStateManager.getState();
    const currentPhase = state.currentGamePhase || 0;
    const unlockedPhases = new Set(state.unlockedPhases || [0]);
    
    // Handle phaseProgress - it might be a plain object or array
    let phaseProgress: Map<number, PhaseProgress>;
    if (state.phaseProgress instanceof Map) {
      phaseProgress = state.phaseProgress;
    } else if (Array.isArray(state.phaseProgress)) {
      phaseProgress = new Map(state.phaseProgress);
    } else if (state.phaseProgress && typeof state.phaseProgress === 'object') {
      // Convert object to Map
      phaseProgress = new Map(Object.entries(state.phaseProgress).map(([k, v]) => [Number(k), v as PhaseProgress]));
    } else {
      phaseProgress = new Map();
    }
    
    const nextPhase = getNextPhase(currentPhase);
    const nextPhaseRequirements = nextPhase ? this.getRequirementProgress(nextPhase) : [];
    const canAdvance = nextPhase ? this.checkPhaseRequirements(nextPhase) : false;
    
    return {
      currentPhase,
      unlockedPhases,
      phaseProgress,
      nextPhaseRequirements: nextPhaseRequirements.map(rp => rp.requirement),
      canAdvance
    };
  }
  
  // Check if a phase is unlocked
  isPhaseUnlocked(phaseId: number): boolean {
    const state = gameStateManager.getState();
    return state.unlockedPhases?.has(phaseId) || false;
  }
  
  // Check phase requirements
  private checkPhaseRequirements(phase: GamePhase): boolean {
    const state = gameStateManager.getState();
    
    // Check if previous phase is completed
    if (phase.requiredPhase !== undefined && !this.isPhaseUnlocked(phase.requiredPhase)) {
      return false;
    }
    
    // Check all requirements
    for (const req of phase.unlockRequirements) {
      if (!this.checkRequirement(req, state)) {
        return false;
      }
    }
    
    return true;
  }
  
  // Check individual requirement
  private checkRequirement(req: any, state: any): boolean {
    switch (req.type) {
      case PhaseRequirementType.RESOURCE_TOTAL:
        const resourceAmount = this.getResourceAmount(req.target, state);
        return resourceAmount >= req.value;
        
      case PhaseRequirementType.RESOURCE_RATE:
        const resourceRate = this.getResourceRate(req.target, state);
        return resourceRate >= req.value;
        
      case PhaseRequirementType.CELESTIAL_COUNT:
        return state.stars.length >= req.value;
        
      case PhaseRequirementType.CELESTIAL_TYPE:
        const typeCount = state.stars.filter((body: any) => 
          body.userData.type === req.target
        ).length;
        return typeCount >= req.value;
        
      case PhaseRequirementType.LIFE_STAGE:
        return state.stars.some((body: any) => 
          body.userData.hasLife && 
          body.userData.lifeStage === req.target
        );
        
      case PhaseRequirementType.ACHIEVEMENT_COUNT:
        const achievementData = this.getAchievementCount();
        return achievementData >= req.value;
        
      case PhaseRequirementType.PRESTIGE_COUNT:
        return (state.prestigeCount || 0) >= req.value;
        
      case PhaseRequirementType.PLAYTIME:
        return (state.totalPlayTime || 0) >= req.value;
        
      case PhaseRequirementType.RESEARCH_COUNT:
        return (state.research?.completedResearch?.length || 0) >= req.value;
        
      default:
        return false;
    }
  }
  
  // Get requirement progress
  private getRequirementProgress(phase: GamePhase): RequirementProgress[] {
    const state = gameStateManager.getState();
    const progress: RequirementProgress[] = [];
    
    for (const req of phase.unlockRequirements) {
      const currentValue = this.getRequirementValue(req, state);
      const completed = currentValue >= req.value;
      const progressRatio = Math.min(1, currentValue / req.value);
      
      progress.push({
        requirement: req,
        currentValue,
        completed,
        progress: progressRatio
      });
    }
    
    return progress;
  }
  
  // Get current value for requirement
  private getRequirementValue(req: any, state: any): number {
    switch (req.type) {
      case PhaseRequirementType.RESOURCE_TOTAL:
        return this.getResourceAmount(req.target, state);
        
      case PhaseRequirementType.RESOURCE_RATE:
        return this.getResourceRate(req.target, state);
        
      case PhaseRequirementType.CELESTIAL_COUNT:
        return state.stars.length;
        
      case PhaseRequirementType.CELESTIAL_TYPE:
        return state.stars.filter((body: any) => 
          body.userData.type === req.target
        ).length;
        
      case PhaseRequirementType.LIFE_STAGE:
        return state.stars.some((body: any) => 
          body.userData.hasLife && 
          body.userData.lifeStage === req.target
        ) ? 1 : 0;
        
      case PhaseRequirementType.ACHIEVEMENT_COUNT:
        return this.getAchievementCount();
        
      case PhaseRequirementType.PRESTIGE_COUNT:
        return state.prestigeCount || 0;
        
      case PhaseRequirementType.PLAYTIME:
        return state.totalPlayTime || 0;
        
      case PhaseRequirementType.RESEARCH_COUNT:
        return state.research?.completedResearch?.length || 0;
        
      default:
        return 0;
    }
  }
  
  // Advance to next phase
  async advancePhase(): Promise<boolean> {
    const state = gameStateManager.getState();
    const currentPhase = state.currentGamePhase || 0;
    const nextPhase = getNextPhase(currentPhase);
    
    if (!nextPhase || !this.checkPhaseRequirements(nextPhase)) {
      console.warn('[PHASE] Cannot advance - requirements not met');
      return false;
    }
    
    console.log('[PHASE] Advancing to phase:', nextPhase.id, nextPhase.name);
    
    // Update phase progress - store as array for serialization
    const phaseProgressArray = Array.isArray(state.phaseProgress) ? [...state.phaseProgress] : [];
    const existingIndex = phaseProgressArray.findIndex(([id]) => id === currentPhase);
    const progressEntry: [number, PhaseProgress] = [currentPhase, {
      phaseId: currentPhase,
      startTime: Date.now(),
      completionTime: Date.now(),
      requirements: this.getRequirementProgress(nextPhase)
    }];
    
    if (existingIndex >= 0) {
      phaseProgressArray[existingIndex] = progressEntry;
    } else {
      phaseProgressArray.push(progressEntry);
    }
    
    // Update state
    gameStateManager.updateState(state => ({
      ...state,
      currentGamePhase: nextPhase.id,
      unlockedPhases: new Set([...Array.from(state.unlockedPhases || []), nextPhase.id]),
      phaseProgress: phaseProgressArray
    }));
    
    // Apply rewards
    this.applyPhaseRewards(nextPhase);
    
    // Fire unlock events
    this.firePhaseUnlockEvents(nextPhase);
    
    // Save game
    await this.saveSystem.saveGame();
    
    // Show notification
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showEventBanner(
        `新たな段階「${nextPhase.name}」に到達！`,
        nextPhase.description,
        'success'
      );
    }
    
    return true;
  }
  
  // Apply phase rewards
  private applyPhaseRewards(phase: GamePhase): void {
    const state = gameStateManager.getState();
    
    for (const reward of phase.rewards) {
      switch (reward.type) {
        case PhaseRewardType.RESOURCE_BONUS:
          this.addResource(reward.target!, reward.value);
          break;
          
        case PhaseRewardType.MULTIPLIER:
          this.applyMultiplier(reward.target!, reward.value);
          break;
          
        case PhaseRewardType.PRESTIGE_POINTS:
          gameStateManager.updateState(state => ({
            ...state,
            prestigePoints: (state.prestigePoints || 0) + reward.value
          }));
          break;
          
        case PhaseRewardType.UNLOCK_FEATURE:
          // Feature unlocks are handled by the UI
          console.log('[PHASE] Feature unlocked:', reward.target);
          break;
          
        case PhaseRewardType.ACHIEVEMENT:
          // Trigger achievement unlock
          const achievementSystem = (window as any).achievementSystem;
          if (achievementSystem) {
            achievementSystem.unlockSpecial(reward.target!);
          }
          break;
      }
    }
  }
  
  // Fire unlock events
  private firePhaseUnlockEvents(phase: GamePhase): void {
    for (const feature of phase.features) {
      const event: UnlockEvent = {
        type: UnlockEventType.FEATURE,
        target: feature,
        phaseId: phase.id,
        timestamp: Date.now(),
        description: `${feature}が解放されました！`
      };
      
      this.fireUnlockEvent(event);
    }
  }
  
  // Register unlock callback
  onUnlock(callback: (event: UnlockEvent) => void): void {
    this.unlockCallbacks.push(callback);
  }
  
  // Fire unlock event
  private fireUnlockEvent(event: UnlockEvent): void {
    for (const callback of this.unlockCallbacks) {
      callback(event);
    }
  }
  
  // Update loop
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      this.checkPhaseAdvancement();
    }, 1000);
  }
  
  // Check for phase advancement
  private checkPhaseAdvancement(): void {
    const state = gameStateManager.getState();
    const currentPhase = state.currentGamePhase || 0;
    const nextPhase = getNextPhase(currentPhase);
    
    if (nextPhase && this.checkPhaseRequirements(nextPhase)) {
      // Auto-advance is disabled - player must manually advance
      // Just show notification if not already shown
      if (!state.phaseAdvanceNotified) {
        const feedbackSystem = (window as any).feedbackSystem;
        if (feedbackSystem) {
          feedbackSystem.showToast({
            message: `新たな段階「${nextPhase.name}」への準備が整いました！`,
            type: 'success',
            duration: 5000
          });
        }
        
        gameStateManager.updateState(state => ({
          ...state,
          phaseAdvanceNotified: true
        }));
      }
    }
  }
  
  // Helper methods
  private getResourceAmount(resource: string, state: any): number {
    switch (resource) {
      case 'cosmicDust': return state.cosmicDust || 0;
      case 'energy': return state.energy || 0;
      case 'organicMatter': return state.organicMatter || 0;
      case 'biomass': return state.biomass || 0;
      case 'darkMatter': return state.darkMatter || 0;
      case 'thoughtPoints': return state.thoughtPoints || 0;
      default: return 0;
    }
  }
  
  private getResourceRate(resource: string, state: any): number {
    // Simplified rate calculation
    const multiplier = state.research?.allResourceMultiplier || 1;
    switch (resource) {
      case 'cosmicDust': return (state.currentDustRate || 0) * multiplier;
      case 'energy': return (state.stars.length * 10) * multiplier;
      case 'biomass': return (state.stars.filter((b: any) => b.userData.hasLife).length * 5) * multiplier;
      default: return 0;
    }
  }
  
  private addResource(resource: string, amount: number): void {
    gameStateManager.updateState(state => {
      const newState = { ...state };
      switch (resource) {
        case 'cosmicDust': newState.cosmicDust += amount; break;
        case 'energy': newState.energy += amount; break;
        case 'organicMatter': newState.organicMatter += amount; break;
        case 'biomass': newState.biomass += amount; break;
        case 'darkMatter': newState.darkMatter += amount; break;
        case 'thoughtPoints': newState.thoughtPoints += amount; break;
      }
      return newState;
    });
  }
  
  private applyMultiplier(target: string, value: number): void {
    gameStateManager.updateState(state => ({
      ...state,
      research: {
        ...state.research,
        [`${target}Multiplier`]: (state.research[`${target}Multiplier`] || 1) * value
      }
    }));
  }
  
  private getAchievementCount(): number {
    try {
      const achievementData = localStorage.getItem('achievementData');
      if (achievementData) {
        const data = JSON.parse(achievementData);
        return data.unlockedIds?.length || 0;
      }
    } catch (error) {
      console.error('[PHASE] Failed to get achievement count:', error);
    }
    return 0;
  }
  
  // Cleanup
  destroy(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const phaseManager = PhaseManager.getInstance();