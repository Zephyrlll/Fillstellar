/**
 * Game Phase System Types
 * Manages game progression stages and unlocks
 */

export interface GamePhase {
  id: number;
  name: string;
  description: string;
  icon: string;
  requiredPhase?: number;  // Previous phase required
  unlockRequirements: PhaseRequirement[];
  rewards: PhaseReward[];
  features: string[];  // Features unlocked in this phase
}

export interface PhaseRequirement {
  type: PhaseRequirementType;
  target?: string;
  value: number;
  description: string;
}

export enum PhaseRequirementType {
  RESOURCE_TOTAL = 'resource_total',
  RESOURCE_RATE = 'resource_rate',
  CELESTIAL_COUNT = 'celestial_count',
  CELESTIAL_TYPE = 'celestial_type',
  LIFE_STAGE = 'life_stage',
  ACHIEVEMENT_COUNT = 'achievement_count',
  PRESTIGE_COUNT = 'prestige_count',
  PLAYTIME = 'playtime',
  RESEARCH_COUNT = 'research_count'
}

export interface PhaseReward {
  type: PhaseRewardType;
  target?: string;
  value: number;
  description: string;
}

export enum PhaseRewardType {
  RESOURCE_BONUS = 'resource_bonus',
  UNLOCK_FEATURE = 'unlock_feature',
  MULTIPLIER = 'multiplier',
  PRESTIGE_POINTS = 'prestige_points',
  ACHIEVEMENT = 'achievement'
}

export interface PhaseState {
  currentPhase: number;
  unlockedPhases: Set<number>;
  phaseProgress: Map<number, PhaseProgress>;
  nextPhaseRequirements: PhaseRequirement[];
  canAdvance: boolean;
}

export interface PhaseProgress {
  phaseId: number;
  startTime: number;
  completionTime?: number;
  requirements: RequirementProgress[];
}

export interface RequirementProgress {
  requirement: PhaseRequirement;
  currentValue: number;
  completed: boolean;
  progress: number;  // 0-1
}

export interface UnlockEvent {
  type: UnlockEventType;
  target: string;
  phaseId: number;
  timestamp: number;
  description: string;
}

export enum UnlockEventType {
  FEATURE = 'feature',
  CELESTIAL_BODY = 'celestial_body',
  RESEARCH = 'research',
  RESOURCE = 'resource',
  UI_ELEMENT = 'ui_element',
  GAME_MODE = 'game_mode'
}