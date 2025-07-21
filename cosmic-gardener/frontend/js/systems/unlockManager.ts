/**
 * Unlock Manager
 * Manages feature unlocks and notifications
 */

import { gameState, gameStateManager } from '../state.js';
import { UnlockEvent, UnlockEventType } from '../types/gamePhase.js';
import { phaseManager } from './phaseManager.js';

interface UnlockDefinition {
  id: string;
  type: UnlockEventType;
  name: string;
  description: string;
  icon: string;
  requiredPhase?: number;
  customRequirement?: () => boolean;
  onUnlock?: () => void;
}

export class UnlockManager {
  private static instance: UnlockManager;
  private unlocks: Map<string, UnlockDefinition> = new Map();
  private unlockedFeatures: Set<string> = new Set();
  private unlockQueue: UnlockEvent[] = [];
  private isProcessingQueue: boolean = false;
  
  private constructor() {
    this.initializeUnlocks();
    this.loadUnlockedFeatures();
    
    // Listen for phase unlock events
    phaseManager.onUnlock((event) => this.handlePhaseUnlock(event));
    
    console.log('[UNLOCK] Manager initialized');
  }
  
  static getInstance(): UnlockManager {
    if (!UnlockManager.instance) {
      UnlockManager.instance = new UnlockManager();
    }
    return UnlockManager.instance;
  }
  
  // Initialize unlock definitions
  private initializeUnlocks(): void {
    // Celestial body unlocks
    this.registerUnlock({
      id: 'asteroid',
      type: UnlockEventType.CELESTIAL_BODY,
      name: '小惑星',
      description: '小さな岩石質の天体を作成できます',
      icon: '🪨',
      requiredPhase: 0
    });
    
    this.registerUnlock({
      id: 'comet',
      type: UnlockEventType.CELESTIAL_BODY,
      name: '彗星',
      description: '氷と塵でできた天体を作成できます',
      icon: '☄️',
      requiredPhase: 0
    });
    
    this.registerUnlock({
      id: 'moon',
      type: UnlockEventType.CELESTIAL_BODY,
      name: '月',
      description: '惑星の衛星を作成できます',
      icon: '🌙',
      requiredPhase: 1
    });
    
    this.registerUnlock({
      id: 'planet',
      type: UnlockEventType.CELESTIAL_BODY,
      name: '惑星',
      description: '大きな天体を作成できます',
      icon: '🌍',
      requiredPhase: 2
    });
    
    this.registerUnlock({
      id: 'star',
      type: UnlockEventType.CELESTIAL_BODY,
      name: '恒星',
      description: '光り輝く恒星を作成できます',
      icon: '⭐',
      requiredPhase: 5
    });
    
    this.registerUnlock({
      id: 'black_hole',
      type: UnlockEventType.CELESTIAL_BODY,
      name: 'ブラックホール',
      description: '強力な重力を持つ天体を作成できます',
      icon: '⚫',
      requiredPhase: 6
    });
    
    // Feature unlocks
    this.registerUnlock({
      id: 'life_system',
      type: UnlockEventType.FEATURE,
      name: '生命システム',
      description: '惑星に生命が誕生する可能性があります',
      icon: '🌱',
      requiredPhase: 2
    });
    
    this.registerUnlock({
      id: 'evolution_boost',
      type: UnlockEventType.FEATURE,
      name: '進化促進',
      description: '生命の進化速度が向上します',
      icon: '🧬',
      requiredPhase: 3
    });
    
    this.registerUnlock({
      id: 'civilization',
      type: UnlockEventType.FEATURE,
      name: '文明システム',
      description: '知的生命体が文明を築きます',
      icon: '🏛️',
      requiredPhase: 4
    });
    
    this.registerUnlock({
      id: 'technology_tree',
      type: UnlockEventType.FEATURE,
      name: 'テクノロジーツリー',
      description: '高度な技術を研究できます',
      icon: '🔬',
      requiredPhase: 4
    });
    
    this.registerUnlock({
      id: 'stellar_engineering',
      type: UnlockEventType.FEATURE,
      name: '恒星工学',
      description: '恒星を制御する技術です',
      icon: '⚙️',
      requiredPhase: 5
    });
    
    this.registerUnlock({
      id: 'galactic_empire',
      type: UnlockEventType.FEATURE,
      name: '銀河帝国',
      description: '銀河全体を統治します',
      icon: '👑',
      requiredPhase: 6
    });
    
    // Automation unlocks
    this.registerUnlock({
      id: 'automation_celestial',
      type: UnlockEventType.FEATURE,
      name: '天体自動作成',
      description: '天体を自動的に作成する機能',
      icon: '🌟',
      customRequirement: () => {
        const state = gameStateManager.getState();
        return state.research?.completedResearch?.includes('auto_basics') || false;
      }
    });
    
    this.registerUnlock({
      id: 'automation_resource',
      type: UnlockEventType.FEATURE,
      name: '資源自動変換',
      description: '資源を自動的に変換する機能',
      icon: '⚖️',
      customRequirement: () => {
        const state = gameStateManager.getState();
        return state.research?.completedResearch?.includes('auto_resource_balancing') || false;
      }
    });
    
    this.registerUnlock({
      id: 'automation_research',
      type: UnlockEventType.FEATURE,
      name: '研究自動進行',
      description: '研究を自動的に進行させる機能',
      icon: '🔬',
      customRequirement: () => {
        const state = gameStateManager.getState();
        return state.research?.completedResearch?.includes('auto_research_queue') || false;
      }
    });
    
    // UI unlocks
    this.registerUnlock({
      id: 'research_lab',
      type: UnlockEventType.UI_ELEMENT,
      name: '研究ラボ',
      description: '新しい技術を研究できます',
      icon: '🔬',
      customRequirement: () => {
        const state = gameStateManager.getState();
        return state.thoughtPoints >= 10;
      },
      onUnlock: () => {
        const researchButton = document.querySelector('.research-button');
        if (researchButton) {
          researchButton.classList.remove('hidden');
        }
      }
    });
    
    this.registerUnlock({
      id: 'conversion_engine',
      type: UnlockEventType.UI_ELEMENT,
      name: '変換エンジン',
      description: '資源を相互に変換できます',
      icon: '⚗️',
      customRequirement: () => {
        const state = gameStateManager.getState();
        return state.energy >= 1000 && state.organicMatter >= 100;
      },
      onUnlock: () => {
        const conversionButton = document.getElementById('conversion-ui-button');
        if (conversionButton) {
          conversionButton.style.display = 'inline-block';
        }
      }
    });
    
    this.registerUnlock({
      id: 'prestige_system',
      type: UnlockEventType.UI_ELEMENT,
      name: 'プレステージシステム',
      description: 'ビッグバンを起こして永続的な強化を得られます',
      icon: '🌌',
      customRequirement: () => {
        const state = gameStateManager.getState();
        return state.totalPlayTime >= 10 * 60 * 1000; // 10 minutes
      }
    });
  }
  
  // Register unlock definition
  private registerUnlock(unlock: UnlockDefinition): void {
    this.unlocks.set(unlock.id, unlock);
  }
  
  // Check if feature is unlocked
  isUnlocked(featureId: string): boolean {
    return this.unlockedFeatures.has(featureId);
  }
  
  // Check and unlock features
  checkUnlocks(): void {
    for (const [id, unlock] of this.unlocks) {
      if (this.isUnlocked(id)) continue;
      
      // Check phase requirement
      if (unlock.requiredPhase !== undefined) {
        if (!phaseManager.isPhaseUnlocked(unlock.requiredPhase)) {
          continue;
        }
      }
      
      // Check custom requirement
      if (unlock.customRequirement && !unlock.customRequirement()) {
        continue;
      }
      
      // Unlock feature
      this.unlock(id);
    }
  }
  
  // Unlock a feature
  unlock(featureId: string): void {
    if (this.isUnlocked(featureId)) return;
    
    const unlock = this.unlocks.get(featureId);
    if (!unlock) return;
    
    console.log('[UNLOCK] Unlocking feature:', featureId);
    
    this.unlockedFeatures.add(featureId);
    this.saveUnlockedFeatures();
    
    // Run unlock callback
    if (unlock.onUnlock) {
      unlock.onUnlock();
    }
    
    // Create unlock event
    const event: UnlockEvent = {
      type: unlock.type,
      target: featureId,
      phaseId: phaseManager.getPhaseState().currentPhase,
      timestamp: Date.now(),
      description: unlock.description
    };
    
    // Queue notification
    this.queueUnlockNotification(event, unlock);
  }
  
  // Handle phase unlock events
  private handlePhaseUnlock(event: UnlockEvent): void {
    // Check for features that should be unlocked with this phase
    this.checkUnlocks();
  }
  
  // Queue unlock notification
  private queueUnlockNotification(event: UnlockEvent, unlock: UnlockDefinition): void {
    this.unlockQueue.push(event);
    
    if (!this.isProcessingQueue) {
      this.processUnlockQueue();
    }
  }
  
  // Process unlock queue
  private async processUnlockQueue(): Promise<void> {
    this.isProcessingQueue = true;
    
    while (this.unlockQueue.length > 0) {
      const event = this.unlockQueue.shift()!;
      const unlock = this.unlocks.get(event.target);
      
      if (unlock) {
        this.showUnlockNotification(unlock);
        
        // Wait before showing next notification
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  // Show unlock notification
  private showUnlockNotification(unlock: UnlockDefinition): void {
    const feedbackSystem = (window as any).feedbackSystem;
    if (!feedbackSystem) return;
    
    // Create detailed notification
    const message = `
      <div class="unlock-notification">
        <div class="unlock-icon">${unlock.icon}</div>
        <div class="unlock-content">
          <h3>${unlock.name}が解放されました！</h3>
          <p>${unlock.description}</p>
        </div>
      </div>
    `;
    
    feedbackSystem.showEventBanner(
      '新機能解放！',
      message,
      'unlock'
    );
    
    // Also show a toast for quick reference
    feedbackSystem.showToast({
      message: `${unlock.icon} ${unlock.name}が解放されました！`,
      type: 'success',
      duration: 3000
    });
  }
  
  // Get unlock info
  getUnlockInfo(featureId: string): UnlockDefinition | undefined {
    return this.unlocks.get(featureId);
  }
  
  // Get all unlocks of a type
  getUnlocksByType(type: UnlockEventType): UnlockDefinition[] {
    const results: UnlockDefinition[] = [];
    
    for (const unlock of this.unlocks.values()) {
      if (unlock.type === type) {
        results.push(unlock);
      }
    }
    
    return results;
  }
  
  // Get unlock progress
  getUnlockProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this.unlockedFeatures.size,
      total: this.unlocks.size
    };
  }
  
  // Save/load unlocked features
  private saveUnlockedFeatures(): void {
    localStorage.setItem('unlockedFeatures', JSON.stringify(Array.from(this.unlockedFeatures)));
  }
  
  private loadUnlockedFeatures(): void {
    try {
      const saved = localStorage.getItem('unlockedFeatures');
      if (saved) {
        const features = JSON.parse(saved);
        this.unlockedFeatures = new Set(features);
      }
    } catch (error) {
      console.error('[UNLOCK] Failed to load unlocked features:', error);
    }
  }
}

export const unlockManager = UnlockManager.getInstance();