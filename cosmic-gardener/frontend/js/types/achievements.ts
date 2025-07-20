import { GameState } from '../state.js';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: (state: GameState) => boolean;
  reward?: AchievementReward;
  category: AchievementCategory;
  icon?: string;
  hidden?: boolean; // Hidden achievements are not shown until unlocked
  progress?: (state: GameState) => { current: number; target: number };
  tier?: number; // For tiered achievements (1, 2, 3, etc.)
}

export interface AchievementReward {
  resources?: {
    cosmicDust?: number;
    energy?: number;
    organicMatter?: number;
    biomass?: number;
    darkMatter?: number;
    thoughtPoints?: number;
  };
  multipliers?: {
    dustGeneration?: number;
    energyGeneration?: number;
    offlineEfficiency?: number;
    researchSpeed?: number;
  };
  permanent?: boolean; // If true, multipliers are permanent
}

export type AchievementCategory = 'resource' | 'celestial' | 'life' | 'general' | 'special';

export interface AchievementData {
  unlockedIds: string[];
  unlockedAt: { [id: string]: number }; // Timestamp when unlocked
  newlyUnlocked: string[]; // Achievements unlocked since last check
}

export interface AchievementProgress {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: { current: number; target: number };
}