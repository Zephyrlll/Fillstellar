/**
 * Progressive Unlock System
 * 複雑なシステムを段階的に解放してUIの複雑さを管理
 */

import { gameStateManager } from '../state.js';
import { menuSystem } from './menuSystem.js';

interface UnlockStage {
  id: string;
  name: string;
  description: string;
  condition: () => boolean;
  onUnlock: () => void;
  uiElements: string[];
  menuItems?: string[];
}

class ProgressiveUnlockSystem {
  private static instance: ProgressiveUnlockSystem;
  private unlockedStages = new Set<string>();
  private stages: UnlockStage[] = [];
  private checkInterval: number | null = null;
  
  private constructor() {
    this.initializeStages();
  }
  
  static getInstance(): ProgressiveUnlockSystem {
    if (!ProgressiveUnlockSystem.instance) {
      ProgressiveUnlockSystem.instance = new ProgressiveUnlockSystem();
    }
    return ProgressiveUnlockSystem.instance;
  }
  
  private initializeStages(): void {
    this.stages = [
      {
        id: 'basic',
        name: '基本システム',
        description: '天体作成と基本リソース',
        condition: () => true,
        onUnlock: () => {
          console.log('[UNLOCK] Basic systems unlocked');
        },
        uiElements: [
          '.create-asteroid-button',
          '.create-comet-button',
          '.resource-display'
        ],
        menuItems: []
      },
      
      {
        id: 'stars',
        name: '恒星システム',
        description: '恒星作成とエネルギー生産',
        condition: () => {
          const state = gameStateManager.getState();
          return state.resources.cosmicDust >= 500;
        },
        onUnlock: () => {
          console.log('[UNLOCK] Star systems unlocked');
          this.showNotification('恒星システム解放！', 'エネルギー生産が可能になりました');
        },
        uiElements: [
          '.create-star-button',
          '.energy-display'
        ],
        menuItems: []
      },
      
      {
        id: 'research',
        name: '研究システム',
        description: '新技術の研究',
        condition: () => {
          const state = gameStateManager.getState();
          return state.resources.energy >= 50;
        },
        onUnlock: () => {
          console.log('[UNLOCK] Research system unlocked');
          this.showNotification('研究システム解放！', '新しい技術を研究できます');
        },
        uiElements: [
          '.research-lab-button'
        ],
        menuItems: ['research']
      },
      
      {
        id: 'production',
        name: '生産システム',
        description: '資源の変換と生産',
        condition: () => {
          const state = gameStateManager.getState();
          return state.research?.completedResearch?.length >= 3;
        },
        onUnlock: () => {
          console.log('[UNLOCK] Production system unlocked');
          this.showNotification('生産システム解放！', '資源を効率的に変換できます');
        },
        uiElements: [
          '.production-button'
        ],
        menuItems: ['production', 'conversion']
      },
      
      {
        id: 'advanced',
        name: '高度なシステム',
        description: '実績、統計、自動化',
        condition: () => {
          const state = gameStateManager.getState();
          return state.currentGamePhase >= 1;
        },
        onUnlock: () => {
          console.log('[UNLOCK] Advanced systems unlocked');
          this.showNotification('高度なシステム解放！', '実績と自動化が利用可能になりました');
        },
        uiElements: [
          '.achievements-button',
          '.statistics-button',
          '.automation-button'
        ],
        menuItems: ['achievements', 'statistics', 'automation']
      },
      
      {
        id: 'prestige',
        name: 'プレステージシステム',
        description: 'リセットによる永続ボーナス',
        condition: () => {
          const state = gameStateManager.getState();
          return state.currentGamePhase >= 3;
        },
        onUnlock: () => {
          console.log('[UNLOCK] Prestige system unlocked');
          this.showNotification('プレステージシステム解放！', 'より強力な永続ボーナスが獲得可能に');
        },
        uiElements: [
          '.prestige-button'
        ],
        menuItems: ['prestige']
      }
    ];
  }
  
  init(): void {
    // 初期状態で基本システムのみ表示
    this.hideAllElements();
    this.checkUnlocks();
    
    // 定期的にアンロックをチェック
    this.checkInterval = window.setInterval(() => {
      this.checkUnlocks();
    }, 2000);
  }
  
  private hideAllElements(): void {
    // 全ての要素を初期状態で非表示に
    this.stages.forEach(stage => {
      if (stage.id !== 'basic') {
        stage.uiElements.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
            (el as HTMLElement).classList.add('locked-feature');
          });
        });
      }
    });
    
    // メニューアイテムも制御
    const allMenuItems = ['research', 'production', 'conversion', 'achievements', 
                         'statistics', 'automation', 'prestige', 'paragon', 'multiverse'];
    allMenuItems.forEach(item => {
      menuSystem.setItemVisibility(item, false);
    });
  }
  
  private checkUnlocks(): void {
    this.stages.forEach(stage => {
      if (!this.unlockedStages.has(stage.id) && stage.condition()) {
        this.unlockStage(stage);
      }
    });
  }
  
  private unlockStage(stage: UnlockStage): void {
    this.unlockedStages.add(stage.id);
    
    // UI要素を表示
    stage.uiElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).style.display = '';
        (el as HTMLElement).classList.remove('locked-feature');
        (el as HTMLElement).classList.add('newly-unlocked');
        
        // アンロックアニメーション
        setTimeout(() => {
          (el as HTMLElement).classList.remove('newly-unlocked');
        }, 2000);
      });
    });
    
    // メニューアイテムを表示
    if (stage.menuItems) {
      stage.menuItems.forEach(item => {
        menuSystem.setItemVisibility(item, true);
      });
    }
    
    // カスタムアンロック処理
    stage.onUnlock();
    
    // セーブデータに記録
    gameStateManager.updateState(state => ({
      ...state,
      unlockedStages: Array.from(this.unlockedStages)
    }));
  }
  
  private showNotification(title: string, message: string): void {
    const notification = document.createElement('div');
    notification.className = 'unlock-notification';
    notification.innerHTML = `
      <div class="unlock-icon">🔓</div>
      <div class="unlock-content">
        <div class="unlock-title">${title}</div>
        <div class="unlock-message">${message}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
  
  // セーブデータから復元
  restore(unlockedStages: string[]): void {
    unlockedStages.forEach(stageId => {
      const stage = this.stages.find(s => s.id === stageId);
      if (stage) {
        this.unlockedStages.add(stageId);
        
        // UI要素を表示（アニメーションなし）
        stage.uiElements.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            (el as HTMLElement).style.display = '';
            (el as HTMLElement).classList.remove('locked-feature');
          });
        });
        
        // メニューアイテムを表示
        if (stage.menuItems) {
          stage.menuItems.forEach(item => {
            menuSystem.setItemVisibility(item, true);
          });
        }
      }
    });
  }
  
  isUnlocked(stageId: string): boolean {
    return this.unlockedStages.has(stageId);
  }
  
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// スタイル追加
const style = document.createElement('style');
style.textContent = `
  .locked-feature {
    display: none !important;
  }
  
  .newly-unlocked {
    animation: unlockPulse 2s ease-in-out;
    position: relative;
  }
  
  @keyframes unlockPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 rgba(255, 215, 0, 0);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
    }
  }
  
  .unlock-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: linear-gradient(135deg, #2a5298, #1e3c72);
    border: 2px solid #FFD700;
    border-radius: 12px;
    padding: 15px 25px;
    color: white;
    display: flex;
    align-items: center;
    gap: 15px;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 10001;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  .unlock-notification.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  
  .unlock-icon {
    font-size: 32px;
  }
  
  .unlock-title {
    font-size: 18px;
    font-weight: bold;
    color: #FFD700;
    margin-bottom: 5px;
  }
  
  .unlock-message {
    font-size: 14px;
    color: #ddd;
  }
`;
document.head.appendChild(style);

export const progressiveUnlock = ProgressiveUnlockSystem.getInstance();