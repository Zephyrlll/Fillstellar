/**
 * Paragon Tree System
 * 100個以上のアップグレードを持つパラゴンツリー
 */

import { ParagonUpgrade } from '../types/paragon.js';

export interface ParagonTreeNode {
  upgrade: ParagonUpgrade;
  x: number;
  y: number;
  tier: number;
  prerequisites: string[];
  branches: ParagonBranch;
}

export type ParagonBranch = 'cosmic' | 'temporal' | 'dimensional' | 'biological' | 'technological' | 'transcendent';

export class ParagonTreeGenerator {
  // 基本ブランチの定義
  private static branches: Record<ParagonBranch, { name: string; icon: string; color: string }> = {
    cosmic: { name: '宇宙', icon: '🌌', color: '#4a90e2' },
    temporal: { name: '時間', icon: '⏰', color: '#e24a4a' },
    dimensional: { name: '次元', icon: '🌀', color: '#9b59b6' },
    biological: { name: '生命', icon: '🧬', color: '#27ae60' },
    technological: { name: '技術', icon: '🔧', color: '#f39c12' },
    transcendent: { name: '超越', icon: '✨', color: '#e74c3c' }
  };
  
  // 100個以上のアップグレードを生成
  static generateFullTree(): ParagonUpgrade[] {
    const upgrades: ParagonUpgrade[] = [];
    
    // 各ブランチで17個ずつ（合計102個）
    Object.entries(this.branches).forEach(([branch, config]) => {
      upgrades.push(...this.generateBranchUpgrades(branch as ParagonBranch, config));
    });
    
    return upgrades;
  }
  
  private static generateBranchUpgrades(branch: ParagonBranch, config: any): ParagonUpgrade[] {
    const upgrades: ParagonUpgrade[] = [];
    
    // Tier 1: 基本アップグレード（5個）
    upgrades.push(...this.generateTierUpgrades(branch, config, 1, 5));
    
    // Tier 2: 中級アップグレード（4個）
    upgrades.push(...this.generateTierUpgrades(branch, config, 2, 4));
    
    // Tier 3: 上級アップグレード（3個）
    upgrades.push(...this.generateTierUpgrades(branch, config, 3, 3));
    
    // Tier 4: エリートアップグレード（3個）
    upgrades.push(...this.generateTierUpgrades(branch, config, 4, 3));
    
    // Tier 5: マスターアップグレード（2個）
    upgrades.push(...this.generateTierUpgrades(branch, config, 5, 2));
    
    return upgrades;
  }
  
  private static generateTierUpgrades(branch: ParagonBranch, config: any, tier: number, count: number): ParagonUpgrade[] {
    const upgrades: ParagonUpgrade[] = [];
    
    for (let i = 0; i < count; i++) {
      const upgrade = this.createUpgrade(branch, config, tier, i);
      upgrades.push(upgrade);
    }
    
    return upgrades;
  }
  
  private static createUpgrade(branch: ParagonBranch, config: any, tier: number, index: number): ParagonUpgrade {
    const effects = this.getEffectsForBranch(branch);
    const effect = effects[Math.min(index, effects.length - 1)];
    
    const baseCost = tier * tier * 2;
    const baseValue = tier * 0.001;
    
    return {
      id: `${branch}_t${tier}_${index}`,
      name: `${config.name}の${this.getTierName(tier)} ${index + 1}`,
      description: effect.description,
      icon: config.icon,
      category: this.getCategoryForBranch(branch),
      maxLevel: 20 - (tier - 1) * 3, // Tierが高いほど最大レベルが低い
      currentLevel: 0,
      cost: baseCost + index,
      bonus: {
        type: effect.type,
        value: baseValue * effect.multiplier,
        resource: effect.resource
      },
      tier,
      prerequisites: tier > 1 ? [`${branch}_t${tier - 1}_0`] : []
    };
  }
  
  private static getTierName(tier: number): string {
    const names = ['学徒', '熟練', '達人', '大師', '伝説'];
    return names[tier - 1] || '未知';
  }
  
  private static getCategoryForBranch(branch: ParagonBranch): ParagonUpgrade['category'] {
    const categoryMap: Record<ParagonBranch, ParagonUpgrade['category']> = {
      cosmic: 'production',
      temporal: 'efficiency',
      dimensional: 'special',
      biological: 'production',
      technological: 'efficiency',
      transcendent: 'special'
    };
    return categoryMap[branch];
  }
  
  private static getEffectsForBranch(branch: ParagonBranch): Array<{ type: string; description: string; multiplier: number; resource?: string }> {
    const effectsMap: Record<ParagonBranch, any[]> = {
      cosmic: [
        { type: 'all_production', description: '全資源生産+0.1%', multiplier: 1 },
        { type: 'resource_production', description: '宇宙の塵生産+0.5%', multiplier: 5, resource: 'cosmicDust' },
        { type: 'celestial_limit', description: '天体上限+1', multiplier: 0.1 },
        { type: 'celestial_speed', description: '天体作成速度+0.2%', multiplier: 2 },
        { type: 'multiverse_bonus', description: 'マルチバースボーナス+0.1%', multiplier: 1 }
      ],
      temporal: [
        { type: 'time_multiplier', description: '時間加速+0.1%', multiplier: 1 },
        { type: 'offline_efficiency', description: 'オフライン効率+0.5%', multiplier: 5 },
        { type: 'research_speed', description: '研究速度+0.2%', multiplier: 2 },
        { type: 'cooldown_reduction', description: 'クールダウン-0.1%', multiplier: 1 },
        { type: 'action_speed', description: '全アクション速度+0.1%', multiplier: 1 }
      ],
      dimensional: [
        { type: 'dimension_access', description: '次元アクセス+0.1%', multiplier: 1 },
        { type: 'reality_manipulation', description: '現実改変力+0.05%', multiplier: 0.5 },
        { type: 'portal_efficiency', description: 'ポータル効率+0.2%', multiplier: 2 },
        { type: 'dimensional_storage', description: '次元保管庫+1', multiplier: 0.1 },
        { type: 'phase_shift', description: '位相シフト確率+0.1%', multiplier: 1 }
      ],
      biological: [
        { type: 'resource_production', description: '有機物生産+0.5%', multiplier: 5, resource: 'organicMatter' },
        { type: 'resource_production', description: 'バイオマス生産+0.5%', multiplier: 5, resource: 'biomass' },
        { type: 'evolution_speed', description: '進化速度+0.2%', multiplier: 2 },
        { type: 'life_chance', description: '生命誕生確率+0.1%', multiplier: 1 },
        { type: 'biodiversity', description: '生物多様性+0.1%', multiplier: 1 }
      ],
      technological: [
        { type: 'resource_production', description: 'エネルギー生産+0.5%', multiplier: 5, resource: 'energy' },
        { type: 'conversion_efficiency', description: '変換効率+0.2%', multiplier: 2 },
        { type: 'automation_efficiency', description: '自動化効率+0.3%', multiplier: 3 },
        { type: 'tech_discovery', description: '技術発見確率+0.1%', multiplier: 1 },
        { type: 'synergy_bonus', description: 'シナジーボーナス+0.1%', multiplier: 1 }
      ],
      transcendent: [
        { type: 'resource_production', description: '思考ポイント生産+0.5%', multiplier: 5, resource: 'thoughtPoints' },
        { type: 'resource_production', description: 'ダークマター生産+0.5%', multiplier: 5, resource: 'darkMatter' },
        { type: 'transcendence', description: '超越力+0.05%', multiplier: 0.5 },
        { type: 'cosmic_awareness', description: '宇宙意識+0.1%', multiplier: 1 },
        { type: 'eternal_persistence', description: '永続性+0.1%', multiplier: 1 }
      ]
    };
    
    return effectsMap[branch] || [];
  }
}

// 100個以上のパラゴンアップグレードをエクスポート
export const EXTENDED_PARAGON_UPGRADES = ParagonTreeGenerator.generateFullTree();