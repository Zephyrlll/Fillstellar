/**
 * Short Term Goals System
 * 5-10分で達成できる短期目標を提供してプレイヤーの関与を維持
 */

import { gameStateManager } from '../state.js';
import { showMessage } from '../ui.js';

export interface ShortTermGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  checkCondition: () => boolean;
  getProgress: () => { current: number; target: number };
  reward: () => void;
  rewardDescription: string;
  timeEstimate: string;
  completed: boolean;
}

class ShortTermGoalsSystem {
  private static instance: ShortTermGoalsSystem;
  public currentGoals: ShortTermGoal[] = []; // publicに変更してgameInfoUIからアクセス可能に
  private completedGoals = new Set<string>();
  private updateInterval: number | null = null;
  
  private constructor() {
    console.log('[GOALS] Short term goals system initialized');
  }
  
  static getInstance(): ShortTermGoalsSystem {
    if (!ShortTermGoalsSystem.instance) {
      ShortTermGoalsSystem.instance = new ShortTermGoalsSystem();
    }
    return ShortTermGoalsSystem.instance;
  }
  
  init(): void {
    console.log('[GOALS] Initializing short term goals system...');
    this.generateInitialGoals();
    console.log('[GOALS] Initial goals generated:', this.currentGoals.length);
    this.startUpdateLoop();
    console.log('[GOALS] Update loop started');
    this.createUI();
    console.log('[GOALS] UI created');
    
    // 初期表示を更新
    this.updateUI();
    console.log('[GOALS] Initial UI update completed');
  }
  
  private generateInitialGoals(): void {
    const state = gameStateManager.getState();
    
    // 最初の5分間の目標
    if (state.celestialBodies.length === 0) {
      this.currentGoals.push({
        id: 'first_asteroid',
        title: '最初の小惑星を作成',
        description: '宇宙の塵100を使って小惑星を作成しましょう',
        icon: '☄️',
        checkCondition: () => {
          const state = gameStateManager.getState();
          return state.celestialBodies.some(body => body.userData.type === 'asteroid');
        },
        getProgress: () => {
          const state = gameStateManager.getState();
          return { current: state.resources.cosmicDust, target: 100 };
        },
        reward: () => {
          gameStateManager.updateState(state => ({
            ...state,
            resources: {
              ...state.resources,
              cosmicDust: state.resources.cosmicDust + 200
            }
          }));
          showMessage('ボーナス: 宇宙の塵 +200', 'success');
        },
        rewardDescription: '宇宙の塵 +200',
        timeEstimate: '即座',
        completed: false
      });
    }
    
    // 5-10分の目標
    if (state.celestialBodies.filter(body => body.userData.type === 'asteroid').length < 3) {
      this.currentGoals.push({
        id: 'three_asteroids',
        title: '小惑星を3個作成',
        description: '宇宙に小惑星を3個配置しましょう',
        icon: '🌌',
        checkCondition: () => {
          const state = gameStateManager.getState();
          return state.celestialBodies.filter(body => body.userData.type === 'asteroid').length >= 3;
        },
        getProgress: () => {
          const state = gameStateManager.getState();
          const count = state.celestialBodies.filter(body => body.userData.type === 'asteroid').length;
          return { current: count, target: 3 };
        },
        reward: () => {
          gameStateManager.updateState(state => ({
            ...state,
            resources: {
              ...state.resources,
              cosmicDust: state.resources.cosmicDust + 500,
              energy: state.resources.energy + 100
            }
          }));
          showMessage('ボーナス: 宇宙の塵 +500, エネルギー +100', 'success');
        },
        rewardDescription: '宇宙の塵 +500, エネルギー +100',
        timeEstimate: '2-3分',
        completed: false
      });
    }
    
    // 最初の恒星目標
    if (!state.celestialBodies.some(body => body.userData.type === 'star')) {
      this.currentGoals.push({
        id: 'first_star',
        title: '最初の恒星を作成',
        description: 'エネルギー生産のため恒星を作成しましょう',
        icon: '⭐',
        checkCondition: () => {
          const state = gameStateManager.getState();
          return state.celestialBodies.some(body => body.userData.type === 'star');
        },
        getProgress: () => {
          const state = gameStateManager.getState();
          return { current: state.resources.cosmicDust, target: 1000 };
        },
        reward: () => {
          gameStateManager.updateState(state => ({
            ...state,
            resources: {
              ...state.resources,
              energy: state.resources.energy + 500
            }
          }));
          showMessage('ボーナス: エネルギー +500', 'success');
        },
        rewardDescription: 'エネルギー +500',
        timeEstimate: '5分',
        completed: false
      });
    }
    
    // エネルギー蓄積目標
    this.currentGoals.push({
      id: 'energy_100',
      title: 'エネルギー100を蓄積',
      description: 'エネルギーを100まで増やしましょう',
      icon: '⚡',
      checkCondition: () => {
        const state = gameStateManager.getState();
        return state.resources.energy >= 100;
      },
      getProgress: () => {
        const state = gameStateManager.getState();
        return { current: Math.floor(state.resources.energy), target: 100 };
      },
      reward: () => {
        gameStateManager.updateState(state => ({
          ...state,
          resources: {
            ...state.resources,
            cosmicDust: state.resources.cosmicDust + 1000
          }
        }));
        showMessage('ボーナス: 宇宙の塵 +1000', 'success');
      },
      rewardDescription: '宇宙の塵 +1000',
      timeEstimate: '8-10分',
      completed: false
    });
  }
  
  private checkGoals(): void {
    this.currentGoals.forEach(goal => {
      if (!goal.completed && !this.completedGoals.has(goal.id) && goal.checkCondition()) {
        goal.completed = true;
        this.completedGoals.add(goal.id);
        goal.reward();
        this.onGoalCompleted(goal);
      }
    });
    
    // 全ての目標が完了したら新しい目標を生成
    if (this.currentGoals.every(g => g.completed)) {
      this.generateNewGoals();
    }
    
    this.updateUI();
  }
  
  private onGoalCompleted(goal: ShortTermGoal): void {
    // 達成エフェクト
    const notification = document.createElement('div');
    notification.className = 'goal-completed-notification';
    notification.innerHTML = `
      <div class="goal-completed-icon">${goal.icon}</div>
      <div class="goal-completed-text">
        <div class="goal-completed-title">目標達成！</div>
        <div class="goal-completed-name">${goal.title}</div>
        <div class="goal-completed-reward">${goal.rewardDescription}</div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  private generateNewGoals(): void {
    const state = gameStateManager.getState();
    this.currentGoals = [];
    
    // フェーズに応じた新しい目標を生成
    const starCount = state.celestialBodies.filter(b => b.userData.type === 'star').length;
    const planetCount = state.celestialBodies.filter(b => b.userData.type === 'planet').length;
    
    // 恒星系構築目標
    if (starCount < 3) {
      this.currentGoals.push({
        id: `star_system_${starCount + 1}`,
        title: `恒星系を${starCount + 1}個に拡張`,
        description: '新しい恒星を作成して恒星系を拡張しましょう',
        icon: '🌟',
        checkCondition: () => {
          const state = gameStateManager.getState();
          return state.celestialBodies.filter(b => b.userData.type === 'star').length > starCount;
        },
        getProgress: () => {
          const state = gameStateManager.getState();
          return { 
            current: state.celestialBodies.filter(b => b.userData.type === 'star').length, 
            target: starCount + 1 
          };
        },
        reward: () => {
          gameStateManager.updateState(state => ({
            ...state,
            resources: {
              ...state.resources,
              energy: state.resources.energy + 1000 * (starCount + 1)
            }
          }));
          showMessage(`ボーナス: エネルギー +${1000 * (starCount + 1)}`, 'success');
        },
        rewardDescription: `エネルギー +${1000 * (starCount + 1)}`,
        timeEstimate: '5-7分',
        completed: false
      });
    }
    
    // エネルギー目標を段階的に
    const energyTargets = [500, 1000, 5000, 10000];
    const currentEnergy = state.resources.energy;
    const nextTarget = energyTargets.find(t => t > currentEnergy);
    
    if (nextTarget) {
      this.currentGoals.push({
        id: `energy_${nextTarget}`,
        title: `エネルギー${nextTarget}を蓄積`,
        description: `エネルギーを${nextTarget}まで増やしましょう`,
        icon: '⚡',
        checkCondition: () => {
          const state = gameStateManager.getState();
          return state.resources.energy >= nextTarget;
        },
        getProgress: () => {
          const state = gameStateManager.getState();
          return { current: Math.floor(state.resources.energy), target: nextTarget };
        },
        reward: () => {
          const rewardDust = nextTarget * 2;
          gameStateManager.updateState(state => ({
            ...state,
            resources: {
              ...state.resources,
              cosmicDust: state.resources.cosmicDust + rewardDust
            }
          }));
          showMessage(`ボーナス: 宇宙の塵 +${rewardDust}`, 'success');
        },
        rewardDescription: `宇宙の塵 +${nextTarget * 2}`,
        timeEstimate: '10分',
        completed: false
      });
    }
  }
  
  private createUI(): void {
    // 既存の独立したUIコンテナを削除
    const existingContainer = document.getElementById('short-term-goals');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // gameInfoUIに統合されたので、独立したUIは作成しない
    console.log('[GOALS] UI will be integrated into gameInfoUI');
    
    // 目標完了通知用のスタイル追加
    const style = document.createElement('style');
    style.textContent = `
      .goal-completed-notification {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        border: 2px solid #FFD700;
        border-radius: 12px;
        padding: 20px;
        color: white;
        text-align: center;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 10000;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
      }
      
      .goal-completed-notification.show {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      
      .goal-completed-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
      
      .goal-completed-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #FFD700;
      }
      
      .goal-completed-name {
        font-size: 18px;
        margin-bottom: 10px;
      }
      
      .goal-completed-reward {
        font-size: 16px;
        color: #FFD700;
      }
      
      @media (max-width: 768px) {
        .short-term-goals-container {
          width: 250px;
          right: 10px;
          top: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  private updateUI(): void {
    // gameInfoUIが更新を処理するので、ここでは何もしない
    // gameInfoUIのupdateGoalsPanel()メソッドが直接currentGoalsを参照する
  }
  
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      this.checkGoals();
    }, 1000);
  }
  
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    document.getElementById('short-term-goals')?.remove();
  }
}

export const shortTermGoals = ShortTermGoalsSystem.getInstance();