// Research system type definitions

export interface ResearchCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ResearchCost {
  darkMatter?: number;
  thoughtPoints?: number;
  energy?: number;
  cosmicDust?: number;
}

export interface ResearchEffect {
  type: ResearchEffectType;
  value: number | string | boolean;
}

export type ResearchEffectType = 
  // Resource multipliers
  | 'dust_generation_multiplier'
  | 'energy_conversion_multiplier'
  | 'all_resource_multiplier'
  | 'dark_matter_generation_multiplier'
  | 'bio_resource_multiplier'
  | 'dust_storage_multiplier'
  // Celestial body unlocks
  | 'unlock_celestial_body'
  // Life effects
  | 'life_spawn_chance_multiplier'
  | 'evolution_speed_multiplier'
  | 'unlock_life_stage'
  | 'enable_interstellar_expansion'
  // Technology effects
  | 'enable_automation'
  | 'unlock_time_multiplier'
  | 'research_speed_multiplier'
  | 'enable_dyson_sphere'
  // Cosmic effects
  | 'enable_teleportation'
  | 'unlock_multiverse'
  | 'enable_cosmic_consciousness'
  | 'enable_reality_manipulation'
  | 'enable_orbit_control';

export interface ResearchItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  cost: ResearchCost;
  effects: ResearchEffect[];
  requirements: string[];
  unlocks: string[];
  // Runtime state
  completed?: boolean;
  available?: boolean;
  progress?: number;
}

export interface ResearchData {
  categories: ResearchCategory[];
  items: ResearchItem[];
}

// Research state management
export interface ResearchState {
  completedResearch: Set<string>;
  activeResearch: Map<string, number>; // id -> progress
  researchSpeed: number;
  availableResearch: Set<string>;
}

// Utility functions for research validation
export function isResearchAvailable(
  item: ResearchItem, 
  state: ResearchState
): boolean {
  // Check if all requirements are met
  return item.requirements.every(req => state.completedResearch.has(req));
}

export function canAffordResearch(
  item: ResearchItem,
  resources: any // TODO: Use proper resource type
): boolean {
  if (item.cost.darkMatter && resources.darkMatter < item.cost.darkMatter) {
    return false;
  }
  if (item.cost.thoughtPoints && resources.thoughtPoints < item.cost.thoughtPoints) {
    return false;
  }
  if (item.cost.energy && resources.energy < item.cost.energy) {
    return false;
  }
  if (item.cost.cosmicDust && resources.cosmicDust < item.cost.cosmicDust) {
    return false;
  }
  return true;
}

export function getResearchProgress(
  itemId: string,
  state: ResearchState
): number {
  return state.activeResearch.get(itemId) || 0;
}

export function isResearchCompleted(
  itemId: string,
  state: ResearchState
): boolean {
  return state.completedResearch.has(itemId);
}