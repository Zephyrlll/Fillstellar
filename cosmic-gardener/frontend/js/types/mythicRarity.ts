/**
 * Mythic Rarity System Types
 * 伝説を超えるレアリティシステムの型定義
 */

import { QualityTier } from '../resourceSystem.js';

export enum MythicRarity {
  MYTHIC = 5,      // 神話級
  COSMIC = 6,      // 宇宙級
  ETHEREAL = 7,    // 幻影級
  DIVINE = 8,      // 神域級
  TRANSCENDENT = 9 // 超越級
}

export interface MythicRarityConfig {
  rarity: MythicRarity;
  name: string;
  color: string;
  glowColor: string;
  particleColor: string;
  efficiency: number;
  value: number;
  glowIntensity: number;
  particleCount: number;
  specialEffects: SpecialEffect[];
  unlockCondition?: MythicUnlockCondition;
}

export interface SpecialEffect {
  type: 'aura' | 'trail' | 'pulse' | 'distortion' | 'constellation' | 'dimension_rift';
  intensity: number;
  color?: string;
  frequency?: number;
  radius?: number;
}

export interface MythicUnlockCondition {
  type: 'achievement' | 'paragon_level' | 'celestial_count' | 'resource_total' | 'time_played' | 'special_event';
  value: any;
  probability?: number; // 条件を満たしても確率でしか出現しない
}

export interface MythicObject {
  id: string;
  type: 'resource' | 'celestial' | 'artifact' | 'essence';
  rarity: MythicRarity;
  baseObject: any;
  bonuses: MythicBonus[];
  discoveredAt: number;
  uniqueName?: string;
}

export interface MythicBonus {
  type: MythicBonusType;
  value: number;
  target?: string;
}

export type MythicBonusType = 
  | 'production_multiplier'    // 生産量倍率
  | 'conversion_efficiency'    // 変換効率
  | 'research_speed'          // 研究速度
  | 'celestial_limit'         // 天体上限
  | 'time_acceleration'       // 時間加速
  | 'dimension_access'        // 次元アクセス
  | 'reality_manipulation'    // 現実改変
  | 'cosmic_resonance'        // 宇宙共鳴
  | 'eternal_persistence'     // 永続性（リセット無効）
  | 'multiverse_sync';        // マルチバース同期

// 神話級レアリティの設定
export const MYTHIC_RARITY_CONFIGS: Record<MythicRarity, MythicRarityConfig> = {
  [MythicRarity.MYTHIC]: {
    rarity: MythicRarity.MYTHIC,
    name: '神話級',
    color: '#ff00ff',
    glowColor: '#ff00ff',
    particleColor: '#ff88ff',
    efficiency: 10.0, // 10倍に強化（改善計画に沿って）
    value: 10.0,
    glowIntensity: 1.5, // より強い発光
    particleCount: 100, // より多いパーティクル
    specialEffects: [
      { type: 'aura', intensity: 2.0, color: '#ff00ff', radius: 3 },
      { type: 'pulse', intensity: 1.0, frequency: 2 },
      { type: 'trail', intensity: 0.8, color: '#ff88ff' }
    ],
    unlockCondition: {
      type: 'achievement',
      value: 50,
      probability: 0.0001 // 0.01%に設定（改善計画に沿って）
    }
  },
  [MythicRarity.COSMIC]: {
    rarity: MythicRarity.COSMIC,
    name: '宇宙級',
    color: '#00ffff',
    glowColor: '#00ffff',
    particleColor: '#88ffff',
    efficiency: 5.0,
    value: 10.0,
    glowIntensity: 1.5,
    particleCount: 100,
    specialEffects: [
      { type: 'constellation', intensity: 1.0, color: '#00ffff' },
      { type: 'trail', intensity: 1.0, color: '#00ffff' },
      { type: 'distortion', intensity: 0.3, radius: 3 }
    ],
    unlockCondition: {
      type: 'paragon_level',
      value: 100,
      probability: 0.0001
    }
  },
  [MythicRarity.ETHEREAL]: {
    rarity: MythicRarity.ETHEREAL,
    name: '幻影級',
    color: '#ffffff',
    glowColor: '#ffffff',
    particleColor: '#ffffff',
    efficiency: 10.0,
    value: 50.0,
    glowIntensity: 2.0,
    particleCount: 200,
    specialEffects: [
      { type: 'dimension_rift', intensity: 1.0 },
      { type: 'aura', intensity: 2.0, color: '#ffffff', radius: 5 },
      { type: 'pulse', intensity: 1.0, frequency: 0.5 }
    ],
    unlockCondition: {
      type: 'celestial_count',
      value: 1000,
      probability: 0.00001
    }
  },
  [MythicRarity.DIVINE]: {
    rarity: MythicRarity.DIVINE,
    name: '神域級',
    color: '#ffff00',
    glowColor: '#ffff00',
    particleColor: '#ffffaa',
    efficiency: 20.0,
    value: 100.0,
    glowIntensity: 3.0,
    particleCount: 500,
    specialEffects: [
      { type: 'aura', intensity: 3.0, color: '#ffff00', radius: 10 },
      { type: 'constellation', intensity: 2.0, color: '#ffff00' },
      { type: 'dimension_rift', intensity: 2.0 },
      { type: 'pulse', intensity: 2.0, frequency: 0.25 }
    ],
    unlockCondition: {
      type: 'time_played',
      value: 365 * 24 * 60 * 60 * 1000, // 1年
      probability: 0.000001
    }
  },
  [MythicRarity.TRANSCENDENT]: {
    rarity: MythicRarity.TRANSCENDENT,
    name: '超越級',
    color: '#ff0000',
    glowColor: '#ff0000',
    particleColor: '#ff0000',
    efficiency: 100.0,
    value: 1000.0,
    glowIntensity: 5.0,
    particleCount: 1000,
    specialEffects: [
      { type: 'aura', intensity: 5.0, color: '#ff0000', radius: 20 },
      { type: 'trail', intensity: 3.0, color: '#ff0000' },
      { type: 'constellation', intensity: 5.0, color: '#ff0000' },
      { type: 'dimension_rift', intensity: 5.0 },
      { type: 'distortion', intensity: 1.0, radius: 10 },
      { type: 'pulse', intensity: 3.0, frequency: 0.1 }
    ],
    unlockCondition: {
      type: 'special_event',
      value: 'universe_reset_1000',
      probability: 0.0000001
    }
  }
};

// レアリティアップグレードパス
export interface RarityUpgradePath {
  from: QualityTier | MythicRarity;
  to: MythicRarity;
  requirements: {
    sameRarityCount: number;
    resources?: { [key: string]: number };
    paragonLevel?: number;
  };
  successRate: number;
}

// 神話級アイテムの生成確率計算
export function calculateMythicDropChance(
  baseChance: number,
  paragonLevel: number,
  cosmicActivity: number,
  achievements: number
): number {
  const paragonBonus = 1 + (paragonLevel * 0.001);
  const cosmicBonus = 1 + (cosmicActivity / 10000);
  const achievementBonus = 1 + (achievements * 0.01);
  
  return baseChance * paragonBonus * cosmicBonus * achievementBonus;
}