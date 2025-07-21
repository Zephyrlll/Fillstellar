/**
 * Research Queue System
 * 研究キューシステム
 */

import { 
  ResearchQueueConfig, 
  ResearchQueueItem,
  AutomationResult, 
  AutomationType 
} from '../types/automation.js';
import { gameStateManager } from '../state.js';
import { researchItems } from '../researchData.js';
import { isResearchAvailable, canAffordResearch } from '../types/research.js';
import { showMessage } from '../ui.js';
import { applyAutomationResearchEffect } from './automationResearch.js';

export class ResearchQueue {
  private static instance: ResearchQueue;
  private config: ResearchQueueConfig;
  private currentResearch: string | null = null;
  
  private constructor() {
    this.config = this.loadConfig();
    console.log('[RESEARCH-QUEUE] Initialized');
  }
  
  static getInstance(): ResearchQueue {
    if (!ResearchQueue.instance) {
      ResearchQueue.instance = new ResearchQueue();
    }
    return ResearchQueue.instance;
  }
  
  // 設定更新
  updateConfig(config: Partial<ResearchQueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }
  
  // キューに追加
  addToQueue(researchId: string): boolean {
    const feedbackSystem = (window as any).feedbackSystem;
    
    if (this.config.queue.length >= this.config.maxQueueSize) {
      if (feedbackSystem) {
        feedbackSystem.showToast({
          message: `研究キューが満杯です（最大${this.config.maxQueueSize}個）`,
          type: 'error',
          duration: 3000
        });
      }
      return false;
    }
    
    // 既にキューにあるかチェック
    if (this.config.queue.some(item => item.researchId === researchId)) {
      if (feedbackSystem) {
        feedbackSystem.showToast({
          message: 'この研究は既にキューに入っています',
          type: 'warning',
          duration: 2000
        });
      }
      return false;
    }
    
    // 研究が有効かチェック
    const research = researchItems.find(r => r.id === researchId);
    if (!research) {
      return false;
    }
    
    const state = gameStateManager.getState();
    if (!isResearchAvailable(research, state.research || {})) {
      feedbackSystem.showToast({
        message: 'この研究はまだ利用できません',
        type: 'error',
        duration: 2000
      });
      return false;
    }
    
    // キューに追加
    const queueItem: ResearchQueueItem = {
      researchId,
      priority: this.config.queue.length,
      addedAt: Date.now()
    };
    
    this.config.queue.push(queueItem);
    this.saveConfig();
    
    feedbackSystem.showToast({
      message: `${research.name}を研究キューに追加しました`,
      type: 'success',
      duration: 2000
    });
    
    return true;
  }
  
  // キューから削除
  removeFromQueue(researchId: string): void {
    const index = this.config.queue.findIndex(item => item.researchId === researchId);
    if (index !== -1) {
      this.config.queue.splice(index, 1);
      // 優先度を再調整
      this.config.queue.forEach((item, i) => {
        item.priority = i;
      });
      this.saveConfig();
    }
  }
  
  // キューの順序変更
  reorderQueue(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.config.queue.length ||
        toIndex < 0 || toIndex >= this.config.queue.length) {
      return;
    }
    
    const [item] = this.config.queue.splice(fromIndex, 1);
    this.config.queue.splice(toIndex, 0, item);
    
    // 優先度を再調整
    this.config.queue.forEach((item, i) => {
      item.priority = i;
    });
    
    this.saveConfig();
  }
  
  // 自動研究実行
  execute(): AutomationResult {
    if (!this.config.enabled) {
      return {
        success: false,
        type: AutomationType.RESEARCH_PROGRESSION,
        message: 'Research queue is disabled'
      };
    }
    
    const state = gameStateManager.getState();
    const researchState = state.research || {
      completedResearch: [],
      activeResearch: new Map(),
      researchSpeed: 1,
      availableResearch: [],
      currentResearch: null,
      currentProgress: 0
    };
    
    // 現在進行中の研究をチェック
    if (researchState.currentResearch) {
      // 完了チェック
      const current = researchItems.find(r => r.id === researchState.currentResearch);
      if (current && researchState.currentProgress >= current.duration) {
        this.completeResearch(current, state);
        this.currentResearch = null;
        
        feedbackSystem.showToast({
          message: `研究完了: ${current.name}`,
          type: 'success',
          duration: 3000
        });
      } else {
        // まだ進行中
        return {
          success: false,
          type: AutomationType.RESEARCH_PROGRESSION,
          message: 'Research in progress'
        };
      }
    }
    
    // キューから次の研究を取得
    if (this.config.queue.length === 0) {
      // 自動提案が有効な場合
      if (this.config.autoAddSuggestions) {
        this.addSuggestedResearch();
      }
      
      if (this.config.queue.length === 0) {
        return {
          success: false,
          type: AutomationType.RESEARCH_PROGRESSION,
          message: 'Queue is empty'
        };
      }
    }
    
    // 次の研究を開始
    const nextItem = this.config.queue[0];
    const nextResearch = researchItems.find(r => r.id === nextItem.researchId);
    
    if (!nextResearch) {
      // 無効な研究を削除
      this.removeFromQueue(nextItem.researchId);
      return {
        success: false,
        type: AutomationType.RESEARCH_PROGRESSION,
        message: 'Invalid research in queue'
      };
    }
    
    // 利用可能性チェック
    if (!isResearchAvailable(nextResearch, researchState)) {
      return {
        success: false,
        type: AutomationType.RESEARCH_PROGRESSION,
        message: 'Next research not available'
      };
    }
    
    // コストチェック
    if (!canAffordResearch(nextResearch, state)) {
      return {
        success: false,
        type: AutomationType.RESEARCH_PROGRESSION,
        message: 'Cannot afford next research'
      };
    }
    
    // 研究開始
    this.startResearch(nextResearch, state);
    this.currentResearch = nextResearch.id;
    this.removeFromQueue(nextResearch.id);
    
    showMessage(`自動研究開始: ${nextResearch.name}`);
    
    return {
      success: true,
      type: AutomationType.RESEARCH_PROGRESSION,
      message: `Started research: ${nextResearch.name}`,
      resourcesUsed: nextResearch.cost,
      itemsCreated: 1
    };
  }
  
  // 提案された研究を追加
  private addSuggestedResearch(): void {
    const state = gameStateManager.getState();
    const researchState = state.research || {
      completedResearch: [],
      completed: []
    };
    
    // 利用可能で未完了の研究を探す
    const available = researchItems.filter(research => 
      isResearchAvailable(research, researchState) &&
      !researchState.completed?.includes(research.id) &&
      !this.config.queue.some(item => item.researchId === research.id)
    );
    
    if (available.length === 0) return;
    
    // コストが安い順にソート
    available.sort((a, b) => {
      const costA = Object.values(a.cost).reduce((sum, val) => sum + val, 0);
      const costB = Object.values(b.cost).reduce((sum, val) => sum + val, 0);
      return costA - costB;
    });
    
    // 最も安い研究を追加
    const cheapest = available[0];
    this.addToQueue(cheapest.id);
  }
  
  // 現在の進行状況取得
  getCurrentProgress(): { research: any; progress: number } | null {
    if (!this.currentResearch) return null;
    
    const state = gameStateManager.getState();
    const research = researchItems.find(r => r.id === this.currentResearch);
    const progress = state.research?.currentProgress || 0;
    
    if (!research) return null;
    
    return { research, progress };
  }
  
  // キュー取得
  getQueue(): { item: ResearchQueueItem; research: any }[] {
    return this.config.queue.map(item => {
      const research = researchItems.find(r => r.id === item.researchId);
      return { item, research };
    }).filter(entry => entry.research);
  }
  
  // 設定保存
  private saveConfig(): void {
    localStorage.setItem('researchQueueConfig', JSON.stringify(this.config));
  }
  
  // 設定読み込み
  private loadConfig(): ResearchQueueConfig {
    try {
      const saved = localStorage.getItem('researchQueueConfig');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[RESEARCH-QUEUE] Failed to load config:', error);
    }
    
    return {
      enabled: false,
      queue: [],
      maxQueueSize: 5,
      autoAddSuggestions: false
    };
  }
  
  // 設定取得
  getConfig(): ResearchQueueConfig {
    return this.config;
  }
  
  // 研究開始
  private startResearch(research: any, state: any): void {
    // コスト支払い
    const updates: any = {};
    for (const [resource, cost] of Object.entries(research.cost)) {
      updates[resource] = (state[resource] || 0) - cost;
    }
    
    // 研究状態更新
    updates.research = {
      ...(state.research || {}),
      currentResearch: research.id,
      currentProgress: 0
    };
    
    gameStateManager.updateState(updates);
  }
  
  // 研究完了
  private completeResearch(research: any, state: any): void {
    const researchState = state.research || {};
    
    // 完了リストに追加
    const completed = new Set(researchState.completed || []);
    completed.add(research.id);
    
    // 研究状態更新
    const updates: any = {
      research: {
        ...researchState,
        completed: Array.from(completed),
        currentResearch: null,
        currentProgress: 0
      }
    };
    
    gameStateManager.updateState(updates);
    
    // 効果適用
    if (research.effects) {
      // 通常の研究効果
      // TODO: 実装
    }
    
    // 自動化研究の場合、特別な効果を適用
    if (research.category === 'automation') {
      applyAutomationResearchEffect(research.id);
    }
  }
}

export const researchQueue = ResearchQueue.getInstance();