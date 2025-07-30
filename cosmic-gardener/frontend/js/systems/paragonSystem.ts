/**
 * Paragon Level System
 * パラゴンレベルシステムの実装
 */

import { gameStateManager } from '../state.js';
import { 
  ParagonData, 
  ParagonUpgrade, 
  ParagonBonuses, 
  ParagonEvent,
  ParagonExperienceSource,
  EndgameConditions,
  DEFAULT_ENDGAME_CONDITIONS,
  PARAGON_UPGRADES
} from '../types/paragon.js';
import { EXTENDED_PARAGON_UPGRADES } from './paragonTree.js';

export class ParagonSystem {
  private static instance: ParagonSystem;
  private data: ParagonData;
  private isEndgameReached: boolean = false;
  private experienceSources: Map<string, ParagonExperienceSource> = new Map();
  
  private constructor() {
    this.data = this.initializeParagonData();
    this.initializeExperienceSources();
    console.log('[PARAGON] System initialized');
  }
  
  static getInstance(): ParagonSystem {
    if (!ParagonSystem.instance) {
      ParagonSystem.instance = new ParagonSystem();
    }
    return ParagonSystem.instance;
  }
  
  private initializeParagonData(): ParagonData {
    // コアアップグレードと拡張アップグレードを統合
    const allUpgrades = [...PARAGON_UPGRADES, ...EXTENDED_PARAGON_UPGRADES];
    
    return {
      level: 0,
      experience: 0,
      experienceToNext: 1000,
      points: 0,
      unspentPoints: 0,
      upgrades: allUpgrades, // 100個以上のアップグレード
      totalBonuses: this.calculateEmptyBonuses()
    };
  }
  
  private calculateEmptyBonuses(): ParagonBonuses {
    return {
      allProduction: 1,
      resourceProduction: {},
      researchSpeed: 1,
      conversionEfficiency: 1,
      celestialCapBonus: 0,
      storageCapMultiplier: 1,
      automationSpeedMultiplier: 1,
      multiverseBonus: 0,
      timeManipulation: 1,
      realityBending: 0
    };
  }
  
  private initializeExperienceSources(): void {
    // 天体作成による経験値
    this.experienceSources.set('celestial_asteroid', {
      source: 'celestial',
      baseValue: 10,
      multiplier: 1
    });
    this.experienceSources.set('celestial_planet', {
      source: 'celestial',
      baseValue: 50,
      multiplier: 1
    });
    this.experienceSources.set('celestial_star', {
      source: 'celestial',
      baseValue: 100,
      multiplier: 1
    });
    this.experienceSources.set('celestial_black_hole', {
      source: 'celestial',
      baseValue: 500,
      multiplier: 1
    });
    
    // 研究完了による経験値
    this.experienceSources.set('research_complete', {
      source: 'research',
      baseValue: 25,
      multiplier: 1
    });
    
    // 生命進化による経験値
    this.experienceSources.set('life_evolution', {
      source: 'life',
      baseValue: 75,
      multiplier: 1
    });
    
    // 生産マイルストーンによる経験値
    this.experienceSources.set('production_milestone', {
      source: 'production',
      baseValue: 50,
      multiplier: 1
    });
  }
  
  // エンドゲーム到達チェック
  checkEndgameConditions(conditions: EndgameConditions = DEFAULT_ENDGAME_CONDITIONS): boolean {
    if (this.isEndgameReached) return true;
    
    const gameState = gameStateManager.getState();
    
    // 必要な天体タイプのチェック
    const celestialTypes = new Set<string>();
    gameState.stars?.forEach(star => {
      if (star.userData?.type) {
        celestialTypes.add(star.userData.type);
      }
    });
    
    const hasAllCelestialTypes = conditions.requiredCelestialTypes.every(
      type => celestialTypes.has(type)
    );
    
    // 研究完了数のチェック
    const completedResearchCount = gameState.research?.completedResearch?.length || 0;
    const hasEnoughResearch = completedResearchCount >= conditions.requiredResearchCount;
    
    // 思考ポイントのチェック
    const thoughtPoints = gameState.resources.thoughtPoints || 0;
    const hasEnoughThoughtPoints = thoughtPoints >= conditions.requiredThoughtPoints;
    
    // 生命段階のチェック
    let hasRequiredLifeStage = !conditions.requiredLifeStage; // 条件がない場合はtrue
    if (conditions.requiredLifeStage) {
      gameState.stars?.forEach(star => {
        if (star.userData?.lifeStage === conditions.requiredLifeStage) {
          hasRequiredLifeStage = true;
        }
      });
    }
    
    // 全条件を満たしているか
    const isEndgame = hasAllCelestialTypes && hasEnoughResearch && 
                     hasEnoughThoughtPoints && hasRequiredLifeStage;
    
    if (isEndgame && !this.isEndgameReached) {
      this.activateEndgame();
    }
    
    return isEndgame;
  }
  
  // エンドゲーム開始
  private activateEndgame(): void {
    this.isEndgameReached = true;
    this.data.unlockTime = Date.now();
    
    console.log('[PARAGON] Endgame reached! Paragon system activated');
    
    // イベント発火
    this.emitEvent({
      type: 'endgame_reached',
      timestamp: Date.now(),
      data: { level: this.data.level }
    });
    
    // UI通知
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast(
        'エンドゲーム到達！パラゴンシステムが解放されました',
        'success',
        5000
      );
    }
  }
  
  // 経験値を追加
  addExperience(sourceId: string, multiplier: number = 1): void {
    if (!this.isEndgameReached) return;
    
    const source = this.experienceSources.get(sourceId);
    if (!source) {
      console.warn('[PARAGON] Unknown experience source:', sourceId);
      return;
    }
    
    const expGain = Math.floor(source.baseValue * source.multiplier * multiplier);
    this.data.experience += expGain;
    
    console.log(`[PARAGON] Gained ${expGain} experience from ${sourceId}`);
    
    // レベルアップチェック
    while (this.data.experience >= this.data.experienceToNext) {
      this.levelUp();
    }
  }
  
  // レベルアップ処理
  private levelUp(): void {
    this.data.experience -= this.data.experienceToNext;
    this.data.level++;
    this.data.points++;
    this.data.unspentPoints++;
    
    // 次レベルに必要な経験値を計算（指数的に増加）
    this.data.experienceToNext = Math.floor(1000 * Math.pow(1.15, this.data.level));
    
    console.log(`[PARAGON] Level up! Now level ${this.data.level}`);
    
    // イベント発火
    this.emitEvent({
      type: 'level_up',
      timestamp: Date.now(),
      data: {
        newLevel: this.data.level,
        totalPoints: this.data.points
      }
    });
    
    // UI通知
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast(
        `パラゴンレベル ${this.data.level} に到達！`,
        'success'
      );
    }
  }
  
  // アップグレードを購入
  purchaseUpgrade(upgradeId: string): boolean {
    const upgrade = this.data.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      console.warn('[PARAGON] Upgrade not found:', upgradeId);
      return false;
    }
    
    // 購入可能チェック
    if (upgrade.currentLevel >= upgrade.maxLevel) {
      console.log('[PARAGON] Upgrade already at max level');
      return false;
    }
    
    if (this.data.unspentPoints < upgrade.cost) {
      console.log('[PARAGON] Not enough points');
      return false;
    }
    
    // 前提条件チェック
    if (upgrade.requirements) {
      for (const reqId of upgrade.requirements) {
        const reqUpgrade = this.data.upgrades.find(u => u.id === reqId);
        if (!reqUpgrade || reqUpgrade.currentLevel === 0) {
          console.log('[PARAGON] Missing requirement:', reqId);
          return false;
        }
      }
    }
    
    // アップグレード実行
    this.data.unspentPoints -= upgrade.cost;
    upgrade.currentLevel++;
    
    // ボーナス再計算
    this.recalculateBonuses();
    
    console.log(`[PARAGON] Purchased upgrade: ${upgrade.name} (Level ${upgrade.currentLevel})`);
    
    // イベント発火
    this.emitEvent({
      type: 'upgrade_purchased',
      timestamp: Date.now(),
      data: {
        upgradeId: upgrade.id,
        newLevel: upgrade.currentLevel
      }
    });
    
    return true;
  }
  
  // ボーナスを再計算
  private recalculateBonuses(): void {
    const bonuses = this.calculateEmptyBonuses();
    
    // 各アップグレードのボーナスを適用
    this.data.upgrades.forEach(upgrade => {
      if (upgrade.currentLevel === 0) return;
      
      const totalBonus = upgrade.bonus.value * upgrade.currentLevel;
      
      switch (upgrade.bonus.type) {
        case 'all_production':
          bonuses.allProduction += totalBonus;
          break;
          
        case 'resource_production':
          if (upgrade.bonus.resource) {
            bonuses.resourceProduction[upgrade.bonus.resource] = 
              (bonuses.resourceProduction[upgrade.bonus.resource] || 1) + totalBonus;
          }
          break;
          
        case 'research_speed':
          bonuses.researchSpeed += totalBonus;
          break;
          
        case 'conversion_efficiency':
          bonuses.conversionEfficiency += totalBonus;
          break;
          
        case 'celestial_cap':
          bonuses.celestialCapBonus += totalBonus;
          break;
          
        case 'storage_cap':
          bonuses.storageCapMultiplier += totalBonus;
          break;
          
        case 'automation_speed':
          bonuses.automationSpeedMultiplier += totalBonus;
          break;
          
        case 'multiverse_bonus':
          bonuses.multiverseBonus += totalBonus;
          break;
          
        case 'time_manipulation':
          bonuses.timeManipulation += totalBonus;
          break;
          
        case 'reality_bending':
          bonuses.realityBending += totalBonus;
          break;
      }
    });
    
    this.data.totalBonuses = bonuses;
    
    // ゲーム状態に適用
    this.applyBonusesToGameState();
  }
  
  // ゲーム状態にボーナスを適用
  private applyBonusesToGameState(): void {
    const gameState = gameStateManager.getState();
    
    // パラゴンボーナスを保存
    if (!gameState.paragon) {
      gameState.paragon = this.data;
    } else {
      Object.assign(gameState.paragon, this.data);
    }
    
    console.log('[PARAGON] Bonuses applied to game state');
    
    // イベント発火
    this.emitEvent({
      type: 'bonus_applied',
      timestamp: Date.now(),
      data: { bonuses: this.data.totalBonuses }
    });
  }
  
  // イベント発火
  private emitEvent(event: ParagonEvent): void {
    const customEvent = new CustomEvent('paragonEvent', { detail: event });
    window.dispatchEvent(customEvent);
  }
  
  // 現在のデータを取得
  getData(): ParagonData {
    return { ...this.data };
  }
  
  // ボーナスを取得
  getBonuses(): ParagonBonuses {
    return { ...this.data.totalBonuses };
  }
  
  // エンドゲーム状態を取得
  isEndgame(): boolean {
    return this.isEndgameReached;
  }
  
  // 特定の資源の生産ボーナスを取得
  getResourceProductionBonus(resource: string): number {
    const allBonus = this.data.totalBonuses.allProduction;
    const resourceBonus = this.data.totalBonuses.resourceProduction[resource] || 1;
    return allBonus * resourceBonus;
  }
  
  // セーブデータから復元
  loadFromSave(saveData: ParagonData): void {
    if (!saveData) return;
    
    this.data = {
      ...this.initializeParagonData(),
      ...saveData
    };
    
    // アップグレードデータの整合性チェック
    this.data.upgrades = PARAGON_UPGRADES.map(defaultUpgrade => {
      const savedUpgrade = saveData.upgrades?.find(u => u.id === defaultUpgrade.id);
      if (savedUpgrade) {
        return { ...defaultUpgrade, currentLevel: savedUpgrade.currentLevel };
      }
      return { ...defaultUpgrade };
    });
    
    // エンドゲーム状態の復元
    if (this.data.unlockTime) {
      this.isEndgameReached = true;
    }
    
    // ボーナス再計算
    this.recalculateBonuses();
    
    console.log('[PARAGON] Loaded from save');
  }
  
  // リセット（テスト用）
  reset(): void {
    this.data = this.initializeParagonData();
    this.isEndgameReached = false;
    console.log('[PARAGON] System reset');
  }
  
  // デフォルトデータを取得
  getDefaultData(): ParagonData {
    return this.initializeParagonData();
  }
}

export const paragonSystem = ParagonSystem.getInstance();