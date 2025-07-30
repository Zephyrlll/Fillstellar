/**
 * Game Phase Definitions
 * Defines progression stages and their requirements
 */

import { GamePhase, PhaseRequirementType, PhaseRewardType } from '../types/gamePhase.js';

export const gamePhases: GamePhase[] = [
  {
    id: 0,
    name: '宇宙の始まり',
    description: '宇宙の塵から最初の天体を作成する',
    icon: '✨',
    unlockRequirements: [],  // Starting phase
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'asteroid',
        value: 1,
        description: '小惑星の作成が可能に'
      },
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'comet',
        value: 1,
        description: '彗星の作成が可能に'
      }
    ],
    features: ['小惑星作成', '彗星作成', '基本的な重力シミュレーション']
  },
  
  {
    id: 1,
    name: '天体の形成',
    description: '小さな天体から惑星を形成する',
    icon: '🪐',
    requiredPhase: 0,
    unlockRequirements: [
      {
        type: PhaseRequirementType.CELESTIAL_COUNT,
        value: 10,
        description: '天体を10個以上作成'
      },
      {
        type: PhaseRequirementType.RESOURCE_TOTAL,
        target: 'energy',
        value: 1000,
        description: 'エネルギーを1,000以上蓄積'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'moon',
        value: 1,
        description: '月の作成が可能に'
      },
      {
        type: PhaseRewardType.RESOURCE_BONUS,
        target: 'energy',
        value: 5000,
        description: 'エネルギー5,000を獲得'
      },
      {
        type: PhaseRewardType.MULTIPLIER,
        target: 'dust_generation',
        value: 1.5,
        description: '宇宙の塵生成速度1.5倍'
      }
    ],
    features: ['月作成', '軌道シミュレーション', '衝突システム']
  },
  
  {
    id: 2,
    name: '惑星系の発展',
    description: '複雑な惑星系を構築する',
    icon: '🌍',
    requiredPhase: 1,
    unlockRequirements: [
      {
        type: PhaseRequirementType.CELESTIAL_TYPE,
        target: 'moon',
        value: 3,
        description: '月を3個以上作成'
      },
      {
        type: PhaseRequirementType.RESOURCE_TOTAL,
        target: 'organicMatter',
        value: 1000,
        description: '有機物を1,000以上蓄積'
      },
      {
        type: PhaseRequirementType.PLAYTIME,
        value: 30 * 60 * 1000,  // 30 minutes
        description: 'プレイ時間30分以上'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'planet',
        value: 1,
        description: '惑星の作成が可能に'
      },
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'life_system',
        value: 1,
        description: '生命システムが解放'
      },
      {
        type: PhaseRewardType.RESOURCE_BONUS,
        target: 'organicMatter',
        value: 2000,
        description: '有機物2,000を獲得'
      }
    ],
    features: ['惑星作成', '生命の誕生', '大気システム']
  },
  
  {
    id: 3,
    name: '生命の進化',
    description: '生命を育み、進化させる',
    icon: '🌿',
    requiredPhase: 2,
    unlockRequirements: [
      {
        type: PhaseRequirementType.CELESTIAL_TYPE,
        target: 'planet',
        value: 2,
        description: '惑星を2個以上作成'
      },
      {
        type: PhaseRequirementType.LIFE_STAGE,
        target: 'microbial',
        value: 1,
        description: '微生物が誕生'
      },
      {
        type: PhaseRequirementType.RESOURCE_RATE,
        target: 'biomass',
        value: 10,
        description: 'バイオマス生成速度10/秒以上'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'evolution_boost',
        value: 1,
        description: '進化促進システムが解放'
      },
      {
        type: PhaseRewardType.MULTIPLIER,
        target: 'life_evolution',
        value: 2,
        description: '生命進化速度2倍'
      },
      {
        type: PhaseRewardType.PRESTIGE_POINTS,
        value: 5,
        description: 'プレステージポイント5を獲得'
      }
    ],
    features: ['進化促進', '生態系管理', '種の多様性']
  },
  
  {
    id: 4,
    name: '知的生命体',
    description: '知的生命体の誕生と文明の発展',
    icon: '🧠',
    requiredPhase: 3,
    unlockRequirements: [
      {
        type: PhaseRequirementType.LIFE_STAGE,
        target: 'intelligent',
        value: 1,
        description: '知的生命体が誕生'
      },
      {
        type: PhaseRequirementType.RESOURCE_TOTAL,
        target: 'thoughtPoints',
        value: 100,
        description: '思考ポイントを100以上蓄積'
      },
      {
        type: PhaseRequirementType.ACHIEVEMENT_COUNT,
        value: 20,
        description: '実績を20個以上解除'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'civilization',
        value: 1,
        description: '文明システムが解放'
      },
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'technology_tree',
        value: 1,
        description: 'テクノロジーツリーが解放'
      },
      {
        type: PhaseRewardType.MULTIPLIER,
        target: 'thought_generation',
        value: 3,
        description: '思考ポイント生成速度3倍'
      }
    ],
    features: ['文明発展', 'テクノロジー研究', '宇宙探査']
  },
  
  {
    id: 5,
    name: '恒星の創造',
    description: '恒星を作り出し、銀河系を形成する',
    icon: '⭐',
    requiredPhase: 4,
    unlockRequirements: [
      {
        type: PhaseRequirementType.RESOURCE_TOTAL,
        target: 'energy',
        value: 1000000,
        description: 'エネルギーを1,000,000以上蓄積'
      },
      {
        type: PhaseRequirementType.RESEARCH_COUNT,
        value: 15,
        description: '研究を15個以上完了'
      },
      {
        type: PhaseRequirementType.PRESTIGE_COUNT,
        value: 1,
        description: 'プレステージを1回以上実行'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'star',
        value: 1,
        description: '恒星の作成が可能に'
      },
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'stellar_engineering',
        value: 1,
        description: '恒星工学が解放'
      },
      {
        type: PhaseRewardType.PRESTIGE_POINTS,
        value: 20,
        description: 'プレステージポイント20を獲得'
      }
    ],
    features: ['恒星作成', '恒星系管理', 'ダイソン球']
  },
  
  {
    id: 6,
    name: '銀河の支配者',
    description: '複数の恒星系を管理し、銀河を支配する',
    icon: '🌌',
    requiredPhase: 5,
    unlockRequirements: [
      {
        type: PhaseRequirementType.CELESTIAL_TYPE,
        target: 'star',
        value: 3,
        description: '恒星を3個以上作成'
      },
      {
        type: PhaseRequirementType.RESOURCE_TOTAL,
        target: 'darkMatter',
        value: 10000,
        description: 'ダークマターを10,000以上蓄積'
      },
      {
        type: PhaseRequirementType.ACHIEVEMENT_COUNT,
        value: 40,
        description: '実績を40個以上解除'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'black_hole',
        value: 1,
        description: 'ブラックホールの作成が可能に'
      },
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'galactic_empire',
        value: 1,
        description: '銀河帝国システムが解放'
      },
      {
        type: PhaseRewardType.MULTIPLIER,
        target: 'all_resources',
        value: 5,
        description: '全資源生成速度5倍'
      }
    ],
    features: ['ブラックホール作成', '銀河間旅行', '次元操作']
  },
  
  {
    id: 7,
    name: '宇宙の建築家',
    description: '宇宙の法則を書き換え、新たな宇宙を創造する',
    icon: '🏗️',
    requiredPhase: 6,
    unlockRequirements: [
      {
        type: PhaseRequirementType.CELESTIAL_TYPE,
        target: 'black_hole',
        value: 1,
        description: 'ブラックホールを作成'
      },
      {
        type: PhaseRequirementType.PRESTIGE_COUNT,
        value: 5,
        description: 'プレステージを5回以上実行'
      },
      {
        type: PhaseRequirementType.PLAYTIME,
        value: 10 * 60 * 60 * 1000,  // 10 hours
        description: 'プレイ時間10時間以上'
      }
    ],
    rewards: [
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'universe_creation',
        value: 1,
        description: '宇宙創造モードが解放'
      },
      {
        type: PhaseRewardType.UNLOCK_FEATURE,
        target: 'law_manipulation',
        value: 1,
        description: '物理法則の操作が可能に'
      },
      {
        type: PhaseRewardType.ACHIEVEMENT,
        target: 'cosmic_architect',
        value: 1,
        description: '特別実績「宇宙の建築家」を獲得'
      }
    ],
    features: ['宇宙創造', '物理法則操作', '無限の可能性']
  }
];

// Get phase by ID
export function getPhaseById(id: number): GamePhase | undefined {
  return gamePhases.find(phase => phase.id === id);
}

// Get next phase
export function getNextPhase(currentPhaseId: number): GamePhase | undefined {
  return gamePhases.find(phase => phase.requiredPhase === currentPhaseId);
}

// Get all unlocked features for a phase
export function getUnlockedFeatures(phaseId: number): string[] {
  const features: string[] = [];
  
  for (const phase of gamePhases) {
    if (phase.id <= phaseId) {
      features.push(...phase.features);
    }
  }
  
  return features;
}

// Get phase progress description
export function getPhaseProgressDescription(phaseId: number): string {
  const phase = getPhaseById(phaseId);
  if (!phase) return '';
  
  const nextPhase = getNextPhase(phaseId);
  if (!nextPhase) {
    return `${phase.name} - 最終段階に到達しました！`;
  }
  
  return `${phase.name} - 次の段階: ${nextPhase.name}`;
}