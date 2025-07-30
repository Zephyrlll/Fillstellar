import { PrestigeUpgrade, PrestigeEffectType } from '../types/prestige.js';

export const prestigeUpgrades: PrestigeUpgrade[] = [
  // Resource Production Upgrades
  {
    id: 'cosmic_abundance',
    name: '宇宙の豊穣',
    description: '宇宙の塵の生産量を25%増加',
    maxLevel: 10,
    baseCost: 1,
    costScaling: 1.5,
    effect: {
      type: PrestigeEffectType.RESOURCE_MULTIPLIER,
      value: 0.25,
      target: 'cosmicDust'
    },
    icon: '✨'
  },
  {
    id: 'stellar_efficiency',
    name: '恒星効率',
    description: 'エネルギー生産量を30%増加',
    maxLevel: 10,
    baseCost: 2,
    costScaling: 1.5,
    effect: {
      type: PrestigeEffectType.RESOURCE_MULTIPLIER,
      value: 0.30,
      target: 'energy'
    },
    icon: '⭐'
  },
  {
    id: 'universal_prosperity',
    name: '宇宙繁栄',
    description: 'すべての資源生産量を10%増加',
    maxLevel: 20,
    baseCost: 5,
    costScaling: 1.8,
    effect: {
      type: PrestigeEffectType.RESOURCE_MULTIPLIER,
      value: 0.10
    },
    icon: '🌌',
    prerequisite: 'cosmic_abundance'
  },
  
  // Starting Resources
  {
    id: 'dust_reserves',
    name: '塵の蓄積',
    description: '開始時の宇宙の塵を100,000増加',
    maxLevel: 10,
    baseCost: 3,
    costScaling: 1.4,
    effect: {
      type: PrestigeEffectType.STARTING_RESOURCES,
      value: 100000,
      target: 'cosmicDust'
    },
    icon: '💫'
  },
  {
    id: 'energy_boost',
    name: 'エネルギーブースト',
    description: '開始時のエネルギーを1,000増加',
    maxLevel: 5,
    baseCost: 5,
    costScaling: 1.6,
    effect: {
      type: PrestigeEffectType.STARTING_RESOURCES,
      value: 1000,
      target: 'energy'
    },
    icon: '⚡',
    prerequisite: 'stellar_efficiency'
  },
  
  // Offline Progress
  {
    id: 'temporal_efficiency',
    name: '時空効率',
    description: 'オフライン進行の効率を10%向上',
    maxLevel: 10,
    baseCost: 2,
    costScaling: 1.5,
    effect: {
      type: PrestigeEffectType.OFFLINE_EFFICIENCY,
      value: 0.1
    },
    icon: '⏰'
  },
  {
    id: 'temporal_mastery',
    name: '時空マスタリー',
    description: 'オフライン進行の最大時間を2時間延長',
    maxLevel: 6,
    baseCost: 8,
    costScaling: 2.0,
    effect: {
      type: PrestigeEffectType.OFFLINE_EFFICIENCY,
      value: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
      target: 'maxTime'
    },
    icon: '⏳',
    prerequisite: 'temporal_efficiency'
  },
  
  // Research & Development
  {
    id: 'research_acceleration',
    name: '研究加速',
    description: '研究速度を20%向上',
    maxLevel: 5,
    baseCost: 4,
    costScaling: 1.7,
    effect: {
      type: PrestigeEffectType.RESEARCH_SPEED,
      value: 0.2
    },
    icon: '🔬'
  },
  {
    id: 'conversion_mastery',
    name: '変換マスタリー',
    description: '資源変換効率を15%向上',
    maxLevel: 8,
    baseCost: 3,
    costScaling: 1.6,
    effect: {
      type: PrestigeEffectType.CONVERSION_EFFICIENCY,
      value: 0.15
    },
    icon: '🔄'
  },
  
  // Celestial Bodies
  {
    id: 'cosmic_architect',
    name: '宇宙建築家',
    description: '天体作成コストを10%削減',
    maxLevel: 10,
    baseCost: 2,
    costScaling: 1.5,
    effect: {
      type: PrestigeEffectType.CELESTIAL_COST_REDUCTION,
      value: 0.1
    },
    icon: '🪐'
  },
  {
    id: 'stellar_genesis',
    name: '恒星創世',
    description: '恒星作成時に追加ボーナス資源を獲得',
    maxLevel: 5,
    baseCost: 10,
    costScaling: 2.0,
    effect: {
      type: PrestigeEffectType.CELESTIAL_COST_REDUCTION,
      value: 0.2,
      target: 'star'
    },
    icon: '🌟',
    prerequisite: 'cosmic_architect'
  },
  
  // Achievement & Meta
  {
    id: 'achievement_hunter',
    name: '実績ハンター',
    description: '実績報酬を25%増加',
    maxLevel: 4,
    baseCost: 6,
    costScaling: 2.0,
    effect: {
      type: PrestigeEffectType.ACHIEVEMENT_BONUS,
      value: 0.25
    },
    icon: '🏆'
  },
  {
    id: 'prestige_mastery',
    name: 'プレステージマスタリー',
    description: '次回のプレステージポイントを10%増加',
    maxLevel: 10,
    baseCost: 15,
    costScaling: 2.5,
    effect: {
      type: PrestigeEffectType.ACHIEVEMENT_BONUS,
      value: 0.1,
      target: 'prestigePoints'
    },
    icon: '👑',
    prerequisite: 'achievement_hunter'
  }
];

// Helper function to get upgrade by ID
export function getPrestigeUpgradeById(id: string): PrestigeUpgrade | undefined {
  return prestigeUpgrades.find(upgrade => upgrade.id === id);
}

// Helper function to get upgrades by effect type
export function getUpgradesByEffectType(effectType: PrestigeEffectType): PrestigeUpgrade[] {
  return prestigeUpgrades.filter(upgrade => upgrade.effect.type === effectType);
}

// Helper function to get available upgrades
export function getAvailableUpgrades(purchasedUpgrades: Record<string, number>): PrestigeUpgrade[] {
  return prestigeUpgrades.filter(upgrade => {
    // Check if at max level
    const currentLevel = purchasedUpgrades[upgrade.id] || 0;
    if (currentLevel >= upgrade.maxLevel) return false;
    
    // Check prerequisites
    if (upgrade.prerequisite) {
      const prereqLevel = purchasedUpgrades[upgrade.prerequisite] || 0;
      if (prereqLevel === 0) return false;
    }
    
    return true;
  });
}