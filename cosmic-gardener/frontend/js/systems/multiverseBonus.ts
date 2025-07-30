/**
 * Multiverse Bonus System
 * 並行宇宙間でのボーナス効果を管理
 */

import { gameStateManager } from '../state.js';
import { multiverseSystem } from './multiverseSystem.js';

export interface MultiverseBonus {
  resourceMultiplier: number;
  researchSpeedBonus: number;
  celestialCostReduction: number;
  crossUniverseResourceFlow: number;
}

export class MultiverseBonusSystem {
  private static instance: MultiverseBonusSystem;
  
  private constructor() {
    console.log('[MULTIVERSE-BONUS] System initialized');
  }
  
  static getInstance(): MultiverseBonusSystem {
    if (!MultiverseBonusSystem.instance) {
      MultiverseBonusSystem.instance = new MultiverseBonusSystem();
    }
    return MultiverseBonusSystem.instance;
  }
  
  // 現在のマルチバースボーナスを計算
  calculateBonus(): MultiverseBonus {
    const universeCount = multiverseSystem.getUniverseCount();
    const totalResources = this.calculateTotalMultiverseResources();
    const totalCelestials = this.calculateTotalCelestialBodies();
    
    // 宇宙数によるボーナス（1宇宙あたり10%）
    const universeMultiplier = 1 + (universeCount - 1) * 0.1;
    
    // 総資源量によるボーナス（対数スケール）
    const resourceBonus = Math.log10(Math.max(1, totalResources)) * 0.01;
    
    // 総天体数によるボーナス
    const celestialBonus = Math.sqrt(totalCelestials) * 0.005;
    
    return {
      resourceMultiplier: universeMultiplier + resourceBonus,
      researchSpeedBonus: universeCount * 0.05, // 5% per universe
      celestialCostReduction: Math.min(0.5, universeCount * 0.05), // Max 50%
      crossUniverseResourceFlow: universeCount * 0.02 // 2% per universe
    };
  }
  
  // 全宇宙の総資源量を計算
  private calculateTotalMultiverseResources(): number {
    const summaries = multiverseSystem.getAllUniverseSummaries();
    let total = 0;
    
    for (const summary of summaries) {
      total += summary.totalResources || 0;
    }
    
    return total;
  }
  
  // 全宇宙の総天体数を計算
  private calculateTotalCelestialBodies(): number {
    const summaries = multiverseSystem.getAllUniverseSummaries();
    let total = 0;
    
    for (const summary of summaries) {
      total += summary.celestialBodyCount || 0;
    }
    
    return total;
  }
  
  // クロスユニバース資源フローを処理
  processResourceFlow(deltaTime: number): void {
    const bonus = this.calculateBonus();
    if (bonus.crossUniverseResourceFlow <= 0) return;
    
    const state = gameStateManager.getState();
    const flowRate = bonus.crossUniverseResourceFlow;
    
    // 他の宇宙から資源が流入
    const summaries = multiverseSystem.getAllUniverseSummaries();
    const otherUniverses = summaries.filter(s => s.id !== multiverseSystem.getActiveUniverseId());
    
    if (otherUniverses.length === 0) return;
    
    // 各宇宙から少しずつ資源を受け取る
    const resourcesPerUniverse = flowRate / otherUniverses.length;
    
    gameStateManager.updateState(state => ({
      ...state,
      resources: {
        ...state.resources,
        cosmicDust: state.resources.cosmicDust + 
          (otherUniverses.reduce((sum, u) => sum + (u.totalResources || 0), 0) * resourcesPerUniverse * deltaTime * 0.001),
        energy: state.resources.energy + 
          (otherUniverses.length * resourcesPerUniverse * deltaTime * 10)
      }
    }));
  }
  
  // ボーナスを適用した値を取得
  applyBonus(baseValue: number, bonusType: keyof MultiverseBonus): number {
    const bonus = this.calculateBonus();
    return baseValue * (bonusType === 'celestialCostReduction' ? (1 - bonus[bonusType]) : bonus[bonusType]);
  }
  
  // 統一実績システム
  checkUniversalAchievements(): void {
    const summaries = multiverseSystem.getAllUniverseSummaries();
    
    // 全宇宙で1000個以上の天体
    const totalCelestials = summaries.reduce((sum, s) => sum + (s.celestialBodyCount || 0), 0);
    if (totalCelestials >= 1000) {
      this.unlockUniversalAchievement('multiverse_architect');
    }
    
    // 5つ以上の宇宙を管理
    if (summaries.length >= 5) {
      this.unlockUniversalAchievement('dimension_master');
    }
    
    // 全宇宙で知的生命体
    const allHaveIntelligentLife = summaries.every(s => s.hasIntelligentLife);
    if (allHaveIntelligentLife && summaries.length >= 3) {
      this.unlockUniversalAchievement('life_spreader');
    }
  }
  
  private unlockUniversalAchievement(achievementId: string): void {
    // 実績システムと連携
    const event = new CustomEvent('universalAchievement', {
      detail: { achievementId }
    });
    window.dispatchEvent(event);
  }
}

export const multiverseBonusSystem = MultiverseBonusSystem.getInstance();