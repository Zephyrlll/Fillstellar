/**
 * Paragon System Types
 * パラゴンレベルシステムの型定義
 */

export interface ParagonData {
  level: number;
  experience: number;
  experienceToNext: number;
  points: number;
  unspentPoints: number;
  upgrades: ParagonUpgrade[];
  totalBonuses: ParagonBonuses;
  unlockTime?: number; // エンドゲーム到達時刻
}

export interface ParagonUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ParagonCategory;
  maxLevel: number;
  currentLevel: number;
  cost: number; // パラゴンポイントコスト
  bonus: ParagonBonus;
  requirements?: string[]; // 他のアップグレードのID
}

export type ParagonCategory = 'production' | 'efficiency' | 'expansion' | 'transcendence';

export interface ParagonBonus {
  type: ParagonBonusType;
  value: number; // 各レベルごとの増加量
  resource?: string; // 特定の資源に対する場合
}

export type ParagonBonusType = 
  | 'all_production'      // 全資源生産量増加
  | 'resource_production' // 特定資源生産量増加
  | 'research_speed'      // 研究速度増加
  | 'conversion_efficiency' // 変換効率増加
  | 'celestial_cap'       // 天体上限増加
  | 'storage_cap'         // ストレージ上限増加
  | 'automation_speed'    // 自動化速度増加
  | 'multiverse_bonus'    // マルチバース関連ボーナス
  | 'time_manipulation'   // 時間操作ボーナス
  | 'reality_bending';    // 現実改変ボーナス

export interface ParagonBonuses {
  allProduction: number;      // 全資源生産量乗数
  resourceProduction: { [resource: string]: number }; // 個別資源生産量乗数
  researchSpeed: number;      // 研究速度乗数
  conversionEfficiency: number; // 変換効率乗数
  celestialCapBonus: number;  // 天体上限追加数
  storageCapMultiplier: number; // ストレージ上限乗数
  automationSpeedMultiplier: number; // 自動化速度乗数
  multiverseBonus: number;    // マルチバースボーナス
  timeManipulation: number;   // 時間操作効果
  realityBending: number;     // 現実改変効果
}

// エンドゲーム判定条件
export interface EndgameConditions {
  requiredCelestialTypes: string[]; // 必要な天体タイプ
  requiredResearchCount: number;    // 必要な研究完了数
  requiredThoughtPoints: number;    // 必要な思考ポイント
  requiredLifeStage?: string;       // 必要な生命段階
}

// パラゴン経験値計算
export interface ParagonExperienceSource {
  source: 'celestial' | 'research' | 'life' | 'production' | 'achievement';
  baseValue: number;
  multiplier: number;
}

// パラゴンシステムイベント
export interface ParagonEvent {
  type: 'level_up' | 'upgrade_purchased' | 'endgame_reached' | 'bonus_applied';
  timestamp: number;
  data: any;
}

// パラゴンアップグレード定義の例
export const PARAGON_UPGRADES: ParagonUpgrade[] = [
  {
    id: 'cosmic_mastery',
    name: '宇宙の支配',
    description: '全ての資源生産量を0.1%増加',
    icon: '🌌',
    category: 'production',
    maxLevel: 100,
    currentLevel: 0,
    cost: 1,
    bonus: {
      type: 'all_production',
      value: 0.001 // 0.1%
    }
  },
  {
    id: 'stellar_efficiency',
    name: '恒星効率',
    description: 'エネルギー生産を0.5%増加',
    icon: '⭐',
    category: 'production',
    maxLevel: 50,
    currentLevel: 0,
    cost: 2,
    bonus: {
      type: 'resource_production',
      value: 0.005,
      resource: 'energy'
    }
  },
  {
    id: 'knowledge_accumulation',
    name: '知識の蓄積',
    description: '研究速度を0.2%増加',
    icon: '📚',
    category: 'efficiency',
    maxLevel: 100,
    currentLevel: 0,
    cost: 1,
    bonus: {
      type: 'research_speed',
      value: 0.002
    }
  },
  {
    id: 'dimensional_expansion',
    name: '次元拡張',
    description: '天体作成上限を1増加',
    icon: '🔮',
    category: 'expansion',
    maxLevel: 20,
    currentLevel: 0,
    cost: 5,
    bonus: {
      type: 'celestial_cap',
      value: 1
    }
  },
  {
    id: 'temporal_mastery',
    name: '時間制御',
    description: '時間加速効果を1%増加',
    icon: '⏳',
    category: 'transcendence',
    maxLevel: 50,
    currentLevel: 0,
    cost: 3,
    bonus: {
      type: 'time_manipulation',
      value: 0.01
    },
    requirements: ['knowledge_accumulation']
  }
];

// エンドゲーム条件のデフォルト設定
export const DEFAULT_ENDGAME_CONDITIONS: EndgameConditions = {
  requiredCelestialTypes: ['star', 'planet', 'black_hole'],
  requiredResearchCount: 5, // テスト用に20から5に変更
  requiredThoughtPoints: 10000,
  requiredLifeStage: 'intelligent'
};