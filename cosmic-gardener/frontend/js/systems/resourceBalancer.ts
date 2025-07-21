/**
 * Resource Balancer System
 * リソース自動変換システム
 */

import { 
  ResourceBalancerConfig, 
  AutomationResult, 
  AutomationType 
} from '../types/automation.js';
import { ResourceType } from '../resourceSystem.js';
import { gameStateManager } from '../state.js';
import { conversionEngine } from '../conversionEngine.js';
import { CONVERSION_RECIPES } from '../conversionRecipes.js';
import { FeedbackSystem } from './feedbackSystem.js';

export class ResourceBalancer {
  private static instance: ResourceBalancer;
  private config: ResourceBalancerConfig;
  private lastBalanceCheck: number = 0;
  
  private constructor() {
    this.config = this.loadConfig();
    console.log('[RESOURCE-BALANCER] Initialized');
  }
  
  static getInstance(): ResourceBalancer {
    if (!ResourceBalancer.instance) {
      ResourceBalancer.instance = new ResourceBalancer();
    }
    return ResourceBalancer.instance;
  }
  
  // 設定更新
  updateConfig(config: Partial<ResourceBalancerConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }
  
  // 自動変換実行
  execute(): AutomationResult {
    if (!this.config.enabled) {
      return {
        success: false,
        type: AutomationType.RESOURCE_CONVERSION,
        message: 'Resource balancer is disabled'
      };
    }
    
    const now = Date.now();
    if (now - this.lastBalanceCheck < 1000) { // 1秒のクールダウン
      return {
        success: false,
        type: AutomationType.RESOURCE_CONVERSION,
        message: 'Balance check on cooldown'
      };
    }
    
    this.lastBalanceCheck = now;
    
    // バランスが必要なリソースを特定
    const imbalancedResources = this.findImbalancedResources();
    if (imbalancedResources.length === 0) {
      return {
        success: false,
        type: AutomationType.RESOURCE_CONVERSION,
        message: 'All resources are balanced'
      };
    }
    
    // 変換実行
    let conversionsExecuted = 0;
    const resourcesUsed: { [key: string]: number } = {};
    const resourcesProduced: { [key: string]: number } = {};
    
    for (const resource of imbalancedResources) {
      if (conversionsExecuted >= this.config.maxConversionsPerCycle) break;
      
      const result = this.executeConversion(resource);
      if (result.success) {
        conversionsExecuted++;
        
        // リソース使用量を記録
        if (result.used) {
          for (const [res, amount] of Object.entries(result.used)) {
            resourcesUsed[res] = (resourcesUsed[res] || 0) + amount;
          }
        }
        
        // 生産量を記録
        if (result.produced) {
          for (const [res, amount] of Object.entries(result.produced)) {
            resourcesProduced[res] = (resourcesProduced[res] || 0) + amount;
          }
        }
      }
    }
    
    if (conversionsExecuted > 0) {
      // 通知（feedbackSystemがグローバルで利用可能な場合）
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        const message = `自動変換: ${conversionsExecuted}件の変換を実行`;
        feedbackSystem.showToast({
          message,
          type: 'info',
          duration: 2000
        });
      }
      
      return {
        success: true,
        type: AutomationType.RESOURCE_CONVERSION,
        message: `Executed ${conversionsExecuted} conversions`,
        resourcesUsed,
        itemsCreated: conversionsExecuted
      };
    }
    
    return {
      success: false,
      type: AutomationType.RESOURCE_CONVERSION,
      message: 'No conversions executed'
    };
  }
  
  // バランスが必要なリソースを特定
  private findImbalancedResources(): ResourceType[] {
    const state = gameStateManager.getState();
    const imbalanced: ResourceType[] = [];
    
    // 目標レベルとの比較
    for (const [resource, targetLevel] of this.config.targetLevels.entries()) {
      const currentLevel = state[resource] || 0;
      const ratio = currentLevel / targetLevel;
      
      if (ratio < this.config.conversionThreshold) {
        imbalanced.push(resource);
      }
    }
    
    // 優先順位でソート
    imbalanced.sort((a, b) => {
      const priorityA = this.config.priorityOrder.indexOf(a);
      const priorityB = this.config.priorityOrder.indexOf(b);
      return priorityA - priorityB;
    });
    
    return imbalanced;
  }
  
  // 変換実行
  private executeConversion(targetResource: ResourceType): { 
    success: boolean; 
    used?: { [key: string]: number }; 
    produced?: { [key: string]: number } 
  } {
    // 利用可能なレシピを探す
    const availableRecipes = this.findAvailableRecipes(targetResource);
    if (availableRecipes.length === 0) {
      return { success: false };
    }
    
    // 最も効率的なレシピを選択
    const bestRecipe = this.selectBestRecipe(availableRecipes);
    if (!bestRecipe) {
      return { success: false };
    }
    
    // 変換実行
    conversionEngine.startConversion(bestRecipe.id, true);
    
    // 使用・生産量を計算
    const used: { [key: string]: number } = {};
    const produced: { [key: string]: number } = {};
    
    for (const input of bestRecipe.inputs) {
      used[input.type] = input.amount;
    }
    
    for (const output of bestRecipe.outputs) {
      produced[output.type] = output.amount;
    }
    
    return { success: true, used, produced };
  }
  
  // 利用可能なレシピを探す
  private findAvailableRecipes(targetResource: ResourceType): any[] {
    const state = gameStateManager.getState();
    const availableRecipes = [];
    
    for (const recipeId in CONVERSION_RECIPES) {
      const recipe = CONVERSION_RECIPES[recipeId];
      // 出力にターゲットリソースが含まれているか
      const producesTarget = recipe.outputs.some(output => 
        output.type === targetResource
      );
      
      if (!producesTarget) continue;
      
      // アンロックされているか
      if (recipe.requiredResearch && !state.research?.completed?.includes(recipe.requiredResearch)) {
        continue;
      }
      
      // リソースが足りているか
      let canAfford = true;
      for (const input of recipe.inputs) {
        if ((state[input.type] || 0) < input.amount) {
          canAfford = false;
          break;
        }
      }
      
      if (canAfford) {
        availableRecipes.push(recipe);
      }
    }
    
    return availableRecipes;
  }
  
  // 最適なレシピを選択
  private selectBestRecipe(recipes: any[]): any {
    if (recipes.length === 0) return null;
    
    // 効率スコアを計算（出力/入力の比率）
    let bestRecipe = recipes[0];
    let bestScore = 0;
    
    for (const recipe of recipes) {
      const inputValue = recipe.inputs.reduce((sum: number, input: any) => 
        sum + input.amount, 0
      );
      const outputValue = recipe.outputs.reduce((sum: number, output: any) => 
        sum + output.amount, 0
      );
      
      const score = outputValue / inputValue;
      
      if (score > bestScore) {
        bestScore = score;
        bestRecipe = recipe;
      }
    }
    
    return bestRecipe;
  }
  
  // 目標レベル設定
  setTargetLevel(resource: ResourceType, level: number): void {
    this.config.targetLevels.set(resource, level);
    this.saveConfig();
  }
  
  // 優先順位設定
  setPriorityOrder(order: ResourceType[]): void {
    this.config.priorityOrder = order;
    this.saveConfig();
  }
  
  // 設定保存
  private saveConfig(): void {
    const configToSave = {
      ...this.config,
      targetLevels: Object.fromEntries(this.config.targetLevels)
    };
    localStorage.setItem('resourceBalancerConfig', JSON.stringify(configToSave));
  }
  
  // 設定読み込み
  private loadConfig(): ResourceBalancerConfig {
    try {
      const saved = localStorage.getItem('resourceBalancerConfig');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.targetLevels) {
          data.targetLevels = new Map(Object.entries(data.targetLevels));
        }
        return data;
      }
    } catch (error) {
      console.error('[RESOURCE-BALANCER] Failed to load config:', error);
    }
    
    // デフォルト設定
    const defaultTargets = new Map<ResourceType, number>();
    defaultTargets.set(ResourceType.COSMIC_DUST, 10000);
    defaultTargets.set(ResourceType.ENERGY, 5000);
    defaultTargets.set(ResourceType.ORGANIC_MATTER, 1000);
    defaultTargets.set(ResourceType.BIOMASS, 500);
    
    return {
      enabled: false,
      targetLevels: defaultTargets,
      priorityOrder: [
        ResourceType.ENERGY,
        ResourceType.COSMIC_DUST,
        ResourceType.ORGANIC_MATTER,
        ResourceType.BIOMASS
      ],
      conversionThreshold: 0.8,
      maxConversionsPerCycle: 3
    };
  }
  
  // 設定取得
  getConfig(): ResourceBalancerConfig {
    return this.config;
  }
}

export const resourceBalancer = ResourceBalancer.getInstance();