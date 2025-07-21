/**
 * Infinite Resource System
 * 無限スケールの資源tierシステムの実装
 */

import { gameStateManager } from '../state.js';
import { ResourceType } from '../resourceSystem.js';
import {
  InfiniteResourceTier,
  InfiniteResourceData,
  DEFAULT_RESOURCE_TIERS,
  PROCEDURAL_PREFIXES,
  PROCEDURAL_SUFFIXES,
  formatLargeNumber,
  generateConversionRecipe,
  ProceduralConversionRecipe
} from '../types/infiniteResources.js';

export class InfiniteResourceSystem {
  private static instance: InfiniteResourceSystem;
  private data: InfiniteResourceData;
  private proceduralRecipes: Map<string, ProceduralConversionRecipe> = new Map();
  
  private constructor() {
    this.data = this.initializeData();
    console.log('[INFINITE-RESOURCES] System initialized');
  }
  
  static getInstance(): InfiniteResourceSystem {
    if (!InfiniteResourceSystem.instance) {
      InfiniteResourceSystem.instance = new InfiniteResourceSystem();
    }
    return InfiniteResourceSystem.instance;
  }
  
  private initializeData(): InfiniteResourceData {
    const data: InfiniteResourceData = {
      currentTiers: new Map(),
      maxUnlockedTier: new Map(),
      tierGenerationSeed: Math.floor(Math.random() * 1000000),
      customPrefixes: [...PROCEDURAL_PREFIXES],
      customSuffixes: [...PROCEDURAL_SUFFIXES]
    };
    
    // 基本資源タイプごとに初期tierを設定
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    basicResources.forEach(resource => {
      data.currentTiers.set(resource, [...DEFAULT_RESOURCE_TIERS]);
      data.maxUnlockedTier.set(resource, 0); // 最初は基本tierのみ
    });
    
    return data;
  }
  
  // 新しいtierを手続き的に生成
  generateNextTier(resourceType: string, currentMaxTier: number): InfiniteResourceTier {
    const tierNumber = currentMaxTier + 1;
    const seed = this.data.tierGenerationSeed + tierNumber * 1000 + resourceType.charCodeAt(0);
    
    // シード値を使って決定的な乱数を生成
    const random = this.seededRandom(seed);
    
    // 色の生成（HSL色空間で生成）
    const hue = Math.floor(random() * 360);
    const saturation = 70 + Math.floor(random() * 30);
    const lightness = 50 + Math.floor(random() * 20);
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // プレフィックスとサフィックスの選択
    const prefixIndex = Math.floor(random() * this.data.customPrefixes.length);
    const suffixIndex = Math.floor(random() * this.data.customSuffixes.length);
    const prefix = this.data.customPrefixes[prefixIndex];
    const suffix = tierNumber > 10 ? this.data.customSuffixes[suffixIndex] : '';
    
    // 名前の生成
    const name = `${prefix}${resourceType}${suffix}`;
    
    // 乗数と変換比率の計算（指数的に増加）
    const baseMultiplier = Math.pow(10, tierNumber);
    const conversionRatio = tierNumber <= 10 ? 100 : Math.pow(10, 1 + (tierNumber - 10) * 0.1);
    
    return {
      tier: tierNumber,
      name,
      color,
      prefix,
      suffix,
      baseMultiplier,
      conversionRatio,
      isGenerated: true,
      unlockCondition: {
        type: 'amount',
        value: Math.pow(10, 6 + tierNumber * 2) // 解放に必要な前tier資源量
      }
    };
  }
  
  // シード値付き乱数生成器
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
  }
  
  // tierを解放
  unlockNextTier(resourceType: string): boolean {
    const currentTiers = this.data.currentTiers.get(resourceType);
    if (!currentTiers) return false;
    
    const maxTier = this.data.maxUnlockedTier.get(resourceType) || 0;
    const gameState = gameStateManager.getState();
    
    // 解放条件をチェック
    const currentResourceKey = this.getResourceKey(resourceType, maxTier);
    const currentAmount = this.getResourceAmount(currentResourceKey);
    
    // 次のtierの解放条件を確認
    let nextTier: InfiniteResourceTier;
    if (maxTier + 1 < currentTiers.length) {
      nextTier = currentTiers[maxTier + 1];
    } else {
      // 新しいtierを生成
      nextTier = this.generateNextTier(resourceType, maxTier);
      currentTiers.push(nextTier);
    }
    
    // 解放条件を満たしているかチェック
    if (nextTier.unlockCondition) {
      if (nextTier.unlockCondition.type === 'amount' && 
          currentAmount < nextTier.unlockCondition.value) {
        return false;
      }
    }
    
    // tier解放
    this.data.maxUnlockedTier.set(resourceType, maxTier + 1);
    
    // 変換レシピを生成
    const recipe = generateConversionRecipe(
      currentTiers[maxTier],
      nextTier,
      resourceType
    );
    this.proceduralRecipes.set(`${resourceType}_${maxTier}_to_${maxTier + 1}`, recipe);
    
    console.log(`[INFINITE-RESOURCES] Unlocked tier ${maxTier + 1} for ${resourceType}`);
    
    // UI通知
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast(
        `${resourceType}の新しいtier「${nextTier.name}」が解放されました！`,
        'success',
        5000
      );
    }
    
    return true;
  }
  
  // 資源キーを生成
  private getResourceKey(resourceType: string, tier: number): string {
    return tier === 0 ? resourceType : `${resourceType}_tier${tier}`;
  }
  
  // 資源量を取得
  private getResourceAmount(resourceKey: string): number {
    const gameState = gameStateManager.getState();
    
    // 基本資源
    if (gameState.resources[resourceKey as keyof typeof gameState.resources] !== undefined) {
      return gameState.resources[resourceKey as keyof typeof gameState.resources];
    }
    
    // 拡張資源
    if (gameState.advancedResources?.[resourceKey] !== undefined) {
      return gameState.advancedResources[resourceKey];
    }
    
    // 無限tier資源（将来の実装用）
    if (gameState.infiniteResources?.[resourceKey] !== undefined) {
      return gameState.infiniteResources[resourceKey];
    }
    
    return 0;
  }
  
  // tier間の変換を実行
  convertResource(
    resourceType: string, 
    fromTier: number, 
    toTier: number, 
    amount: number
  ): boolean {
    const recipeKey = `${resourceType}_${fromTier}_to_${toTier}`;
    const recipe = this.proceduralRecipes.get(recipeKey);
    
    if (!recipe) {
      console.warn(`[INFINITE-RESOURCES] Recipe not found: ${recipeKey}`);
      return false;
    }
    
    const fromKey = this.getResourceKey(resourceType, fromTier);
    const toKey = this.getResourceKey(resourceType, toTier);
    const currentAmount = this.getResourceAmount(fromKey);
    
    const requiredAmount = amount * recipe.ratio;
    if (currentAmount < requiredAmount) {
      return false;
    }
    
    // 実際の変換処理（簡略化）
    const producedAmount = amount * recipe.efficiency;
    
    gameStateManager.updateState(state => {
      const newState = { ...state };
      
      // 資源を減らす
      if (fromTier === 0) {
        newState.resources = {
          ...newState.resources,
          [fromKey]: Math.max(0, newState.resources[fromKey as keyof typeof newState.resources] - requiredAmount)
        };
      } else {
        newState.advancedResources = {
          ...newState.advancedResources,
          [fromKey]: Math.max(0, (newState.advancedResources?.[fromKey] || 0) - requiredAmount)
        };
      }
      
      // 資源を増やす
      if (!newState.infiniteResources) {
        newState.infiniteResources = {};
      }
      newState.infiniteResources[toKey] = (newState.infiniteResources[toKey] || 0) + producedAmount;
      
      return newState;
    });
    
    console.log(`[INFINITE-RESOURCES] Converted ${requiredAmount} ${fromKey} to ${producedAmount} ${toKey}`);
    return true;
  }
  
  // 資源の表示用フォーマット
  formatResourceAmount(resourceType: string, tier: number, amount: number): string {
    const tierData = this.data.currentTiers.get(resourceType)?.[tier];
    if (!tierData) return amount.toString();
    
    const formatted = formatLargeNumber(amount);
    return `${formatted.formatted} ${tierData.prefix}${resourceType}${tierData.suffix}`;
  }
  
  // 現在のtier情報を取得
  getTierInfo(resourceType: string): InfiniteResourceTier[] {
    return this.data.currentTiers.get(resourceType) || [];
  }
  
  // 最大解放tierを取得
  getMaxUnlockedTier(resourceType: string): number {
    return this.data.maxUnlockedTier.get(resourceType) || 0;
  }
  
  // 変換レシピを取得
  getConversionRecipes(resourceType: string): ProceduralConversionRecipe[] {
    const recipes: ProceduralConversionRecipe[] = [];
    const maxTier = this.getMaxUnlockedTier(resourceType);
    
    for (let i = 0; i < maxTier; i++) {
      const recipeKey = `${resourceType}_${i}_to_${i + 1}`;
      const recipe = this.proceduralRecipes.get(recipeKey);
      if (recipe) {
        recipes.push(recipe);
      }
    }
    
    return recipes;
  }
  
  // 自動解放チェック
  checkAutoUnlocks(): void {
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    basicResources.forEach(resource => {
      const maxTier = this.getMaxUnlockedTier(resource);
      const currentKey = this.getResourceKey(resource, maxTier);
      const currentAmount = this.getResourceAmount(currentKey);
      
      // 次のtier解放条件を確認
      const tiers = this.data.currentTiers.get(resource);
      if (!tiers) return;
      
      let nextTier: InfiniteResourceTier;
      if (maxTier + 1 < tiers.length) {
        nextTier = tiers[maxTier + 1];
      } else {
        // 仮の次tierを生成して条件を確認
        nextTier = this.generateNextTier(resource, maxTier);
      }
      
      if (nextTier.unlockCondition?.type === 'amount' &&
          currentAmount >= nextTier.unlockCondition.value) {
        this.unlockNextTier(resource);
      }
    });
  }
  
  // セーブデータ用
  saveData(): any {
    return {
      currentTiers: Array.from(this.data.currentTiers.entries()),
      maxUnlockedTier: Array.from(this.data.maxUnlockedTier.entries()),
      tierGenerationSeed: this.data.tierGenerationSeed,
      proceduralRecipes: Array.from(this.proceduralRecipes.entries())
    };
  }
  
  // セーブデータから復元
  loadData(saveData: any): void {
    if (!saveData) return;
    
    if (saveData.currentTiers) {
      this.data.currentTiers = new Map(saveData.currentTiers);
    }
    if (saveData.maxUnlockedTier) {
      this.data.maxUnlockedTier = new Map(saveData.maxUnlockedTier);
    }
    if (saveData.tierGenerationSeed) {
      this.data.tierGenerationSeed = saveData.tierGenerationSeed;
    }
    if (saveData.proceduralRecipes) {
      this.proceduralRecipes = new Map(saveData.proceduralRecipes);
    }
    
    console.log('[INFINITE-RESOURCES] Data loaded from save');
  }
}

export const infiniteResourceSystem = InfiniteResourceSystem.getInstance();