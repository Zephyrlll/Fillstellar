/**
 * Automation Manager
 * 自動化システムの中核
 */

import { 
  AutomationType, 
  AutomationState, 
  AutomationResult,
  AutomationCondition,
  ConditionGroup,
  ConditionType,
  ComparisonOperator,
  LogicalOperator,
  AutomationEfficiency
} from '../types/automation.js';
import { gameState, gameStateManager } from '../state.js';
import { throttle } from '../performanceOptimizer.js';
import { celestialAutoCreator } from './celestialAutoCreate.js';
import { resourceBalancer } from './resourceBalancer.js';
import { researchQueue } from './researchQueue.js';

export class AutomationManager {
  private static instance: AutomationManager;
  private state: AutomationState;
  private intervals: Map<AutomationType, number> = new Map();
  private lastExecution: Map<AutomationType, number> = new Map();
  private isRunning: boolean = false;
  
  private constructor() {
    this.state = this.loadState();
    this.setupVisibilityHandling();
    console.log('[AUTOMATION] Manager initialized');
  }
  
  static getInstance(): AutomationManager {
    if (!AutomationManager.instance) {
      AutomationManager.instance = new AutomationManager();
    }
    return AutomationManager.instance;
  }
  
  // 初期化
  init(): void {
    console.log('[AUTOMATION] Starting automation systems');
    this.isRunning = true;
    this.startAllAutomation();
  }
  
  // 全自動化の開始
  private startAllAutomation(): void {
    if (this.state.celestialAutoCreate.enabled) {
      this.startAutomation(AutomationType.CELESTIAL_CREATION);
    }
    if (this.state.resourceBalancer.enabled) {
      this.startAutomation(AutomationType.RESOURCE_CONVERSION);
    }
    if (this.state.researchQueue.enabled) {
      this.startAutomation(AutomationType.RESEARCH_PROGRESSION);
    }
  }
  
  // 特定の自動化を開始
  startAutomation(type: AutomationType): void {
    if (this.intervals.has(type)) {
      console.warn(`[AUTOMATION] ${type} is already running`);
      return;
    }
    
    const baseInterval = this.getBaseInterval(type);
    const adjustedInterval = baseInterval * this.state.efficiency.intervalMultiplier;
    
    console.log(`[AUTOMATION] Starting ${type} with interval ${adjustedInterval}ms`);
    
    const intervalId = window.setInterval(() => {
      if (this.isRunning && !this.state.isPaused) {
        this.executeAutomation(type);
      }
    }, adjustedInterval);
    
    this.intervals.set(type, intervalId);
  }
  
  // 特定の自動化を停止
  stopAutomation(type: AutomationType): void {
    const intervalId = this.intervals.get(type);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(type);
      console.log(`[AUTOMATION] Stopped ${type}`);
    }
  }
  
  // 自動化の実行
  private executeAutomation(type: AutomationType): void {
    const now = Date.now();
    const lastRun = this.lastExecution.get(type) || 0;
    
    // スロットリング（最小実行間隔を保証）
    if (now - lastRun < 1000) return;
    
    let result: AutomationResult | null = null;
    
    switch (type) {
      case AutomationType.CELESTIAL_CREATION:
        if (this.checkConditions(this.state.celestialAutoCreate.conditions)) {
          result = this.executeCelestialCreation();
        }
        break;
        
      case AutomationType.RESOURCE_CONVERSION:
        result = this.executeResourceConversion();
        break;
        
      case AutomationType.RESEARCH_PROGRESSION:
        result = this.executeResearchProgression();
        break;
    }
    
    if (result) {
      this.updateStatistics(type, result);
      this.lastExecution.set(type, now);
    }
  }
  
  // 条件チェック
  checkConditions(group: ConditionGroup): boolean {
    const results = group.conditions.map(condition => this.checkSingleCondition(condition));
    
    if (group.operator === LogicalOperator.AND) {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }
  
  // 単一条件のチェック
  private checkSingleCondition(condition: AutomationCondition): boolean {
    let currentValue: number = 0;
    
    switch (condition.type) {
      case ConditionType.RESOURCE_AMOUNT:
        currentValue = this.getResourceAmount(condition.target || '');
        break;
        
      case ConditionType.CELESTIAL_COUNT:
        currentValue = this.getCelestialCount(condition.target || '');
        break;
        
      case ConditionType.SPACE_DENSITY:
        currentValue = this.calculateSpaceDensity();
        break;
        
      case ConditionType.TIME_ELAPSED:
        currentValue = (Date.now() - gameState.lastResetTime) / 1000;
        break;
        
      case ConditionType.RESEARCH_COMPLETED:
        const research = gameState.research?.completed || [];
        return research.includes(condition.target || '');
    }
    
    return this.compare(currentValue, condition.operator, condition.value);
  }
  
  // 比較演算
  private compare(current: number, operator: ComparisonOperator, target: number): boolean {
    switch (operator) {
      case ComparisonOperator.GREATER_THAN: return current > target;
      case ComparisonOperator.LESS_THAN: return current < target;
      case ComparisonOperator.EQUAL: return current === target;
      case ComparisonOperator.GREATER_EQUAL: return current >= target;
      case ComparisonOperator.LESS_EQUAL: return current <= target;
      default: return false;
    }
  }
  
  // リソース量取得
  private getResourceAmount(resourceType: string): number {
    const state = gameStateManager.getState();
    return state[resourceType] || 0;
  }
  
  // 天体数取得
  private getCelestialCount(type?: string): number {
    const state = gameStateManager.getState();
    if (!type) return state.stars.length;
    return state.stars.filter((body: any) => body.userData.type === type).length;
  }
  
  // 空間密度計算
  private calculateSpaceDensity(): number {
    const state = gameStateManager.getState();
    const volume = 1000 * 1000 * 1000; // 仮想空間の体積
    return state.stars.length / volume;
  }
  
  // 天体自動作成実行
  private executeCelestialCreation(): AutomationResult {
    return celestialAutoCreator.execute();
  }
  
  private executeResourceConversion(): AutomationResult {
    return resourceBalancer.execute();
  }
  
  private executeResearchProgression(): AutomationResult {
    return researchQueue.execute();
  }
  
  // 統計更新
  private updateStatistics(type: AutomationType, result: AutomationResult): void {
    this.state.statistics.totalExecutions++;
    
    if (result.success) {
      this.state.statistics.successfulExecutions++;
      
      // リソース使用量を記録
      if (result.resourcesUsed) {
        for (const [resource, amount] of Object.entries(result.resourcesUsed)) {
          this.state.statistics.resourcesSaved[resource] = 
            (this.state.statistics.resourcesSaved[resource] || 0) - amount;
        }
      }
      
      // 作成された天体を記録
      if (type === AutomationType.CELESTIAL_CREATION && result.itemsCreated) {
        const celestialType = this.state.celestialAutoCreate.celestialType;
        this.state.statistics.celestialsCreated[celestialType] = 
          (this.state.statistics.celestialsCreated[celestialType] || 0) + result.itemsCreated;
      }
      
      // 完了した研究を記録
      if (type === AutomationType.RESEARCH_PROGRESSION && result.itemsCreated) {
        this.state.statistics.researchCompleted += result.itemsCreated;
      }
    } else {
      this.state.statistics.failedExecutions++;
    }
    
    this.state.statistics.lastExecutionTime = Date.now();
    this.saveState();
  }
  
  // 効率アップグレード適用
  applyEfficiencyUpgrade(upgrade: Partial<AutomationEfficiency>): void {
    this.state.efficiency = { ...this.state.efficiency, ...upgrade };
    
    // 実行中の自動化を再起動して新しい間隔を適用
    const runningTypes = Array.from(this.intervals.keys());
    runningTypes.forEach(type => {
      this.stopAutomation(type);
      this.startAutomation(type);
    });
    
    this.saveState();
  }
  
  // 基本実行間隔取得
  private getBaseInterval(type: AutomationType): number {
    switch (type) {
      case AutomationType.CELESTIAL_CREATION:
        return this.state.celestialAutoCreate.interval;
      case AutomationType.RESOURCE_CONVERSION:
        return 5000; // 5秒
      case AutomationType.RESEARCH_PROGRESSION:
        return 10000; // 10秒
      default:
        return 10000;
    }
  }
  
  // 可視性処理
  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }
  
  // 一時停止
  pause(): void {
    this.state.isPaused = true;
    console.log('[AUTOMATION] Paused');
  }
  
  // 再開
  resume(): void {
    this.state.isPaused = false;
    console.log('[AUTOMATION] Resumed');
  }
  
  // 状態取得
  getState(): AutomationState {
    return this.state;
  }
  
  // 状態更新
  updateState(updates: Partial<AutomationState>): void {
    this.state = { ...this.state, ...updates };
    this.saveState();
  }
  
  // 状態保存
  private saveState(): void {
    try {
      localStorage.setItem('automationState', JSON.stringify({
        ...this.state,
        // Mapをオブジェクトに変換
        resourceBalancer: {
          ...this.state.resourceBalancer,
          targetLevels: Object.fromEntries(this.state.resourceBalancer.targetLevels)
        }
      }));
    } catch (error) {
      console.error('[AUTOMATION] Failed to save state:', error);
    }
  }
  
  // 状態読み込み
  private loadState(): AutomationState {
    try {
      const saved = localStorage.getItem('automationState');
      if (saved) {
        const data = JSON.parse(saved);
        // オブジェクトをMapに復元
        if (data.resourceBalancer?.targetLevels) {
          data.resourceBalancer.targetLevels = new Map(Object.entries(data.resourceBalancer.targetLevels));
        }
        return data;
      }
    } catch (error) {
      console.error('[AUTOMATION] Failed to load state:', error);
    }
    
    // デフォルト状態
    return {
      celestialAutoCreate: {
        enabled: false,
        celestialType: 'star' as any,
        conditions: {
          operator: LogicalOperator.AND,
          conditions: []
        },
        interval: 10000,
        maxPerCycle: 1,
        priorityPosition: 'random'
      },
      resourceBalancer: {
        enabled: false,
        targetLevels: new Map(),
        priorityOrder: [],
        conversionThreshold: 0.8,
        maxConversionsPerCycle: 3
      },
      researchQueue: {
        enabled: false,
        queue: [],
        maxQueueSize: 5,
        autoAddSuggestions: false
      },
      efficiency: {
        intervalMultiplier: 1.0,
        conditionCheckSpeed: 1.0,
        resourceEfficiency: 1.0,
        maxParallelTasks: 1
      },
      statistics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        resourcesSaved: {},
        celestialsCreated: {},
        researchCompleted: 0,
        lastExecutionTime: 0
      },
      isActive: false,
      isPaused: false
    };
  }
  
  // クリーンアップ
  destroy(): void {
    this.isRunning = false;
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    this.intervals.clear();
    console.log('[AUTOMATION] Manager destroyed');
  }
}

export const automationManager = AutomationManager.getInstance();