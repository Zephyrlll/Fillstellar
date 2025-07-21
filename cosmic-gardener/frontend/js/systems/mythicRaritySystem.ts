/**
 * Mythic Rarity System
 * 伝説を超えるレアリティシステムの実装
 */

import * as THREE from 'three';
import { gameStateManager } from '../state.js';
import { 
  MythicRarity, 
  MythicRarityConfig, 
  MythicObject, 
  MythicBonus,
  MYTHIC_RARITY_CONFIGS,
  calculateMythicDropChance,
  MythicBonusType
} from '../types/mythicRarity.js';
import { QualityTier } from '../resourceSystem.js';

export class MythicRaritySystem {
  private static instance: MythicRaritySystem;
  private mythicObjects: Map<string, MythicObject> = new Map();
  private dropCheckInterval: number | null = null;
  private particleSystems: Map<string, THREE.Points> = new Map();
  
  private constructor() {
    this.initializeSystem();
    console.log('[MYTHIC-RARITY] System initialized');
  }
  
  static getInstance(): MythicRaritySystem {
    if (!MythicRaritySystem.instance) {
      MythicRaritySystem.instance = new MythicRaritySystem();
    }
    return MythicRaritySystem.instance;
  }
  
  private initializeSystem(): void {
    // 定期的なドロップチェック（10秒ごと）
    this.dropCheckInterval = window.setInterval(() => {
      this.checkMythicDrops();
    }, 10000);
    
    // イベントリスナー設定
    window.addEventListener('celestialCreated', (e: any) => {
      this.checkCelestialMythicUpgrade(e.detail);
    });
    
    window.addEventListener('resourceProduced', (e: any) => {
      this.checkResourceMythicUpgrade(e.detail);
    });
  }
  
  // 神話級ドロップチェック
  private checkMythicDrops(): void {
    const gameState = gameStateManager.getState();
    const paragonLevel = gameState.paragon?.level || 0;
    const cosmicActivity = gameState.cosmicActivity || 0;
    const achievements = Object.keys(gameState.achievements || {}).length;
    
    // 各レアリティのドロップチェック
    Object.values(MYTHIC_RARITY_CONFIGS).forEach(config => {
      if (!config.unlockCondition) return;
      
      // 条件チェック
      if (!this.checkUnlockCondition(config)) return;
      
      // 確率計算
      const baseChance = config.unlockCondition.probability || 0;
      const dropChance = calculateMythicDropChance(
        baseChance,
        paragonLevel,
        cosmicActivity,
        achievements
      );
      
      // ドロップ判定
      if (Math.random() < dropChance) {
        this.createMythicDrop(config);
      }
    });
  }
  
  // 解放条件チェック
  private checkUnlockCondition(config: MythicRarityConfig): boolean {
    if (!config.unlockCondition) return true;
    
    const gameState = gameStateManager.getState();
    const condition = config.unlockCondition;
    
    switch (condition.type) {
      case 'achievement':
        return Object.keys(gameState.achievements || {}).length >= condition.value;
        
      case 'paragon_level':
        return (gameState.paragon?.level || 0) >= condition.value;
        
      case 'celestial_count':
        return (gameState.stars?.length || 0) >= condition.value;
        
      case 'resource_total':
        // 総資源価値を計算
        const totalResources = Object.values(gameState.resources).reduce(
          (sum, val) => sum + (val || 0), 0
        );
        return totalResources >= condition.value;
        
      case 'time_played':
        // プレイ時間チェック（簡略化）
        return Date.now() - (gameState.firstPlayTime || Date.now()) >= condition.value;
        
      case 'special_event':
        // 特殊イベントチェック
        return gameState.specialEvents?.[condition.value] || false;
        
      default:
        return false;
    }
  }
  
  // 神話級アイテムを生成
  private createMythicDrop(config: MythicRarityConfig): void {
    const mythicObject: MythicObject = {
      id: `mythic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.getRandomMythicType(),
      rarity: config.rarity,
      baseObject: null,
      bonuses: this.generateMythicBonuses(config),
      discoveredAt: Date.now(),
      uniqueName: this.generateUniqueName(config)
    };
    
    this.mythicObjects.set(mythicObject.id, mythicObject);
    
    // 通知
    this.notifyMythicDiscovery(mythicObject, config);
    
    // エフェクト追加
    this.addMythicEffects(mythicObject, config);
    
    // ゲーム状態に反映
    this.applyMythicBonuses(mythicObject);
    
    console.log('[MYTHIC-RARITY] Created mythic object:', mythicObject);
  }
  
  // ランダムな神話級タイプを選択
  private getRandomMythicType(): 'resource' | 'celestial' | 'artifact' | 'essence' {
    const types: Array<'resource' | 'celestial' | 'artifact' | 'essence'> = 
      ['resource', 'celestial', 'artifact', 'essence'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  // 神話級ボーナスを生成
  private generateMythicBonuses(config: MythicRarityConfig): MythicBonus[] {
    const bonuses: MythicBonus[] = [];
    const bonusCount = Math.floor(config.rarity / 2) + 1;
    
    const availableBonusTypes: MythicBonusType[] = [
      'production_multiplier',
      'conversion_efficiency',
      'research_speed',
      'celestial_limit',
      'time_acceleration',
      'dimension_access',
      'reality_manipulation',
      'cosmic_resonance',
      'eternal_persistence',
      'multiverse_sync'
    ];
    
    for (let i = 0; i < bonusCount; i++) {
      const type = availableBonusTypes[
        Math.floor(Math.random() * availableBonusTypes.length)
      ];
      
      const value = this.calculateBonusValue(type, config);
      
      bonuses.push({
        type,
        value,
        target: this.getBonusTarget(type)
      });
    }
    
    return bonuses;
  }
  
  // ボーナス値を計算
  private calculateBonusValue(type: MythicBonusType, config: MythicRarityConfig): number {
    const baseValue = config.value;
    
    switch (type) {
      case 'production_multiplier':
        return 1 + (baseValue * 0.1); // 10-100%増加
        
      case 'conversion_efficiency':
        return Math.min(0.99, 0.5 + (baseValue * 0.005)); // 最大99%
        
      case 'research_speed':
        return 1 + (baseValue * 0.05); // 5-50%増加
        
      case 'celestial_limit':
        return Math.floor(baseValue / 10); // 追加天体数
        
      case 'time_acceleration':
        return 1 + (baseValue * 0.02); // 2-20%加速
        
      case 'dimension_access':
        return Math.floor(baseValue / 20); // アクセス可能次元数
        
      case 'reality_manipulation':
        return baseValue * 0.001; // 現実改変強度
        
      case 'cosmic_resonance':
        return baseValue * 0.01; // 共鳴強度
        
      case 'eternal_persistence':
        return 1; // バイナリ値
        
      case 'multiverse_sync':
        return baseValue * 0.001; // 同期率
        
      default:
        return 1;
    }
  }
  
  // ボーナス対象を取得
  private getBonusTarget(type: MythicBonusType): string | undefined {
    switch (type) {
      case 'production_multiplier':
        const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
        return resources[Math.floor(Math.random() * resources.length)];
        
      default:
        return undefined;
    }
  }
  
  // ユニークな名前を生成
  private generateUniqueName(config: MythicRarityConfig): string {
    const prefixes = [
      '永遠の', '無限の', '超越した', '神聖な', '宇宙の',
      '次元を超えた', '時を統べる', '創世の', '終焉の', '輪廻の'
    ];
    
    const suffixes = [
      '結晶', '精髄', '核心', '源泉', '宝珠',
      '星辰', '天球', '特異点', '聖遺物', '神器'
    ];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${config.name}${suffix}`;
  }
  
  // 発見通知
  private notifyMythicDiscovery(mythicObject: MythicObject, config: MythicRarityConfig): void {
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast(
        `🌟 ${config.name}のアイテムを発見！「${mythicObject.uniqueName}」`,
        'legendary',
        10000
      );
    }
    
    // カスタムイベント発火
    const event = new CustomEvent('mythicDiscovered', {
      detail: { mythicObject, config }
    });
    window.dispatchEvent(event);
  }
  
  // 神話級エフェクトを追加
  private addMythicEffects(mythicObject: MythicObject, config: MythicRarityConfig): void {
    config.specialEffects.forEach(effect => {
      switch (effect.type) {
        case 'aura':
          this.createAuraEffect(mythicObject.id, effect, config);
          break;
          
        case 'trail':
          this.createTrailEffect(mythicObject.id, effect, config);
          break;
          
        case 'pulse':
          this.createPulseEffect(mythicObject.id, effect, config);
          break;
          
        case 'constellation':
          this.createConstellationEffect(mythicObject.id, effect, config);
          break;
          
        case 'dimension_rift':
          this.createDimensionRiftEffect(mythicObject.id, effect, config);
          break;
          
        case 'distortion':
          this.createDistortionEffect(mythicObject.id, effect, config);
          break;
      }
    });
  }
  
  // オーラエフェクト作成（簡略化）
  private createAuraEffect(id: string, effect: any, config: MythicRarityConfig): void {
    console.log(`[MYTHIC-RARITY] Creating aura effect for ${id}`);
    // Three.js実装は省略
  }
  
  // トレイルエフェクト作成（簡略化）
  private createTrailEffect(id: string, effect: any, config: MythicRarityConfig): void {
    console.log(`[MYTHIC-RARITY] Creating trail effect for ${id}`);
    // Three.js実装は省略
  }
  
  // パルスエフェクト作成（簡略化）
  private createPulseEffect(id: string, effect: any, config: MythicRarityConfig): void {
    console.log(`[MYTHIC-RARITY] Creating pulse effect for ${id}`);
    // Three.js実装は省略
  }
  
  // 星座エフェクト作成（簡略化）
  private createConstellationEffect(id: string, effect: any, config: MythicRarityConfig): void {
    console.log(`[MYTHIC-RARITY] Creating constellation effect for ${id}`);
    // Three.js実装は省略
  }
  
  // 次元の裂け目エフェクト作成（簡略化）
  private createDimensionRiftEffect(id: string, effect: any, config: MythicRarityConfig): void {
    console.log(`[MYTHIC-RARITY] Creating dimension rift effect for ${id}`);
    // Three.js実装は省略
  }
  
  // 歪みエフェクト作成（簡略化）
  private createDistortionEffect(id: string, effect: any, config: MythicRarityConfig): void {
    console.log(`[MYTHIC-RARITY] Creating distortion effect for ${id}`);
    // Three.js実装は省略
  }
  
  // 神話級ボーナスを適用
  private applyMythicBonuses(mythicObject: MythicObject): void {
    gameStateManager.updateState(state => {
      const newState = { ...state };
      
      if (!newState.mythicBonuses) {
        newState.mythicBonuses = {};
      }
      
      mythicObject.bonuses.forEach(bonus => {
        const key = bonus.target ? `${bonus.type}_${bonus.target}` : bonus.type;
        newState.mythicBonuses[key] = (newState.mythicBonuses[key] || 0) + bonus.value;
      });
      
      return newState;
    });
  }
  
  // 天体の神話級アップグレードチェック
  private checkCelestialMythicUpgrade(celestial: any): void {
    // レア度が高い天体は神話級になる可能性
    if (Math.random() < 0.00001) {
      const rarityTier = this.getRandomMythicRarity();
      this.upgradeCelestialToMythic(celestial, rarityTier);
    }
  }
  
  // 資源の神話級アップグレードチェック
  private checkResourceMythicUpgrade(resource: any): void {
    // 大量の資源生産時に神話級になる可能性
    if (resource.amount > 1e10 && Math.random() < 0.00001) {
      const rarityTier = this.getRandomMythicRarity();
      this.upgradeResourceToMythic(resource, rarityTier);
    }
  }
  
  // ランダムな神話級レアリティを取得
  private getRandomMythicRarity(): MythicRarity {
    const rarities = Object.values(MythicRarity).filter(r => typeof r === 'number') as MythicRarity[];
    const weights = rarities.map(r => 1 / Math.pow(10, r - 5)); // 高レアほど低確率
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < rarities.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return rarities[i];
      }
    }
    
    return MythicRarity.MYTHIC;
  }
  
  // 天体を神話級にアップグレード
  private upgradeCelestialToMythic(celestial: any, rarity: MythicRarity): void {
    const config = MYTHIC_RARITY_CONFIGS[rarity];
    const mythicObject: MythicObject = {
      id: `mythic_celestial_${celestial.userData.id}`,
      type: 'celestial',
      rarity,
      baseObject: celestial,
      bonuses: this.generateMythicBonuses(config),
      discoveredAt: Date.now(),
      uniqueName: this.generateUniqueName(config)
    };
    
    this.mythicObjects.set(mythicObject.id, mythicObject);
    this.notifyMythicDiscovery(mythicObject, config);
    this.applyMythicBonuses(mythicObject);
    
    // 天体のビジュアルを更新
    this.updateCelestialVisuals(celestial, config);
  }
  
  // 資源を神話級にアップグレード
  private upgradeResourceToMythic(resource: any, rarity: MythicRarity): void {
    const config = MYTHIC_RARITY_CONFIGS[rarity];
    const mythicObject: MythicObject = {
      id: `mythic_resource_${resource.type}_${Date.now()}`,
      type: 'resource',
      rarity,
      baseObject: resource,
      bonuses: this.generateMythicBonuses(config),
      discoveredAt: Date.now(),
      uniqueName: this.generateUniqueName(config)
    };
    
    this.mythicObjects.set(mythicObject.id, mythicObject);
    this.notifyMythicDiscovery(mythicObject, config);
    this.applyMythicBonuses(mythicObject);
  }
  
  // 天体のビジュアルを更新
  private updateCelestialVisuals(celestial: any, config: MythicRarityConfig): void {
    // 発光マテリアルを追加
    if (celestial.material) {
      celestial.material.emissive = new THREE.Color(config.glowColor);
      celestial.material.emissiveIntensity = config.glowIntensity;
    }
    
    // userDataに神話級情報を追加
    celestial.userData.mythicRarity = config.rarity;
    celestial.userData.mythicName = config.name;
  }
  
  // 神話級オブジェクトの総数を取得
  getMythicObjectCount(): number {
    return this.mythicObjects.size;
  }
  
  // 特定レアリティの神話級オブジェクトを取得
  getMythicObjectsByRarity(rarity: MythicRarity): MythicObject[] {
    return Array.from(this.mythicObjects.values()).filter(obj => obj.rarity === rarity);
  }
  
  // 全神話級オブジェクトを取得
  getAllMythicObjects(): MythicObject[] {
    return Array.from(this.mythicObjects.values());
  }
  
  // セーブデータ用
  saveData(): any {
    return {
      mythicObjects: Array.from(this.mythicObjects.entries())
    };
  }
  
  // セーブデータから復元
  loadData(saveData: any): void {
    if (!saveData || !saveData.mythicObjects) return;
    
    this.mythicObjects = new Map(saveData.mythicObjects);
    
    // ボーナスを再適用
    this.mythicObjects.forEach(obj => {
      this.applyMythicBonuses(obj);
    });
    
    console.log('[MYTHIC-RARITY] Loaded', this.mythicObjects.size, 'mythic objects');
  }
  
  // クリーンアップ
  destroy(): void {
    if (this.dropCheckInterval) {
      clearInterval(this.dropCheckInterval);
      this.dropCheckInterval = null;
    }
    
    // パーティクルシステムのクリーンアップ
    this.particleSystems.forEach(particles => {
      if (particles.geometry) particles.geometry.dispose();
      if (particles.material) {
        if (Array.isArray(particles.material)) {
          particles.material.forEach(m => m.dispose());
        } else {
          particles.material.dispose();
        }
      }
    });
    this.particleSystems.clear();
  }
}

export const mythicRaritySystem = MythicRaritySystem.getInstance();