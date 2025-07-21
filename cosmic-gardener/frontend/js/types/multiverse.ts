/**
 * Multiverse System Types
 * 複数宇宙管理システムの型定義
 */

import { GameState } from '../state.js';

// 宇宙の基本情報
export interface Universe {
  id: string;
  name: string;
  createdAt: number;
  lastPlayed: number;
  playTime: number;
  characteristics: UniverseCharacteristics;
  isActive: boolean;
  thumbnail?: string;
}

// 宇宙の特性（Phase 4.2.3で拡張予定）
export interface UniverseCharacteristics {
  seed: string;
  traits: UniverseTrait[];
  bonuses: { [key: string]: number };
}

// 宇宙の特性トレイト
export interface UniverseTrait {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: TraitEffect;
}

// 特性の効果
export interface TraitEffect {
  type: 'production' | 'efficiency' | 'capacity' | 'special';
  target?: string;
  value: number;
}

// マルチバースシステムデータ
export interface MultiverseData {
  universes: Universe[];
  activeUniverseId: string | null;
  maxUniverses: number;
  unlockedSlots: number;
  transferCooldown: number;
  lastTransferTime: number;
}

// 宇宙間転送データ（Phase 4.2.2で使用）
export interface UniverseTransfer {
  fromUniverseId: string;
  toUniverseId: string;
  resourceType: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

// 宇宙の作成オプション
export interface CreateUniverseOptions {
  name: string;
  seed?: string;
  traits?: string[];
}

// 宇宙の切り替えイベント
export interface UniverseSwitchEvent {
  fromUniverseId: string | null;
  toUniverseId: string;
  timestamp: number;
}

// 宇宙のサマリー情報（リスト表示用）
export interface UniverseSummary {
  id: string;
  name: string;
  level: number;
  totalResources: number;
  celestialBodies: number;
  achievements: number;
  lastPlayed: number;
  traits: string[];
}

// 宇宙スロットの状態
export interface UniverseSlot {
  index: number;
  universe: Universe | null;
  isUnlocked: boolean;
  unlockRequirement?: {
    type: 'paragon_level' | 'achievement' | 'resource';
    value: number | string;
  };
}

// デフォルト値
export const DEFAULT_MULTIVERSE_DATA: MultiverseData = {
  universes: [],
  activeUniverseId: null,
  maxUniverses: 10,
  unlockedSlots: 1,
  transferCooldown: 3600000, // 1時間
  lastTransferTime: 0
};

// 宇宙スロットのアンロック条件
export const UNIVERSE_SLOT_REQUIREMENTS = [
  { slot: 1, requirement: null }, // 最初のスロットは無料
  { slot: 2, requirement: { type: 'paragon_level', value: 10 } },
  { slot: 3, requirement: { type: 'paragon_level', value: 25 } },
  { slot: 4, requirement: { type: 'paragon_level', value: 50 } },
  { slot: 5, requirement: { type: 'achievement', value: 'multiverse_explorer' } },
  { slot: 6, requirement: { type: 'paragon_level', value: 100 } },
  { slot: 7, requirement: { type: 'paragon_level', value: 200 } },
  { slot: 8, requirement: { type: 'achievement', value: 'cosmic_architect' } },
  { slot: 9, requirement: { type: 'paragon_level', value: 500 } },
  { slot: 10, requirement: { type: 'achievement', value: 'multiverse_master' } }
];