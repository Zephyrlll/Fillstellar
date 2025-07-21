/**
 * Endgame Progress UI
 * エンドゲーム進捗表示UI
 */

import { paragonSystem } from './paragonSystem.js';
import { gameStateManager } from '../state.js';
import { DEFAULT_ENDGAME_CONDITIONS } from '../types/paragon.js';

export class EndgameProgressUI {
  private static instance: EndgameProgressUI;
  private container: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private updateInterval: number | null = null;
  private isMinimized: boolean = false;
  
  private constructor() {
    console.log('[ENDGAME-PROGRESS-UI] Initialized');
  }
  
  static getInstance(): EndgameProgressUI {
    if (!EndgameProgressUI.instance) {
      EndgameProgressUI.instance = new EndgameProgressUI();
    }
    return EndgameProgressUI.instance;
  }
  
  // UI初期化
  init(): void {
    if (this.isInitialized) return;
    
    this.createUI();
    this.attachEventListeners();
    this.startUpdateLoop();
    
    this.isInitialized = true;
    console.log('[ENDGAME-PROGRESS-UI] UI initialized');
  }
  
  // UI作成
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'endgame-progress-ui';
    this.container.className = 'endgame-progress-container';
    this.container.style.display = 'none'; // 初期状態では非表示
    this.container.innerHTML = `
      <div class="endgame-progress-header">
        <h3>エンドゲーム進捗</h3>
        <div class="header-buttons">
          <button class="minimize-button" id="endgame-minimize">－</button>
          <button class="close-button" id="endgame-close">×</button>
        </div>
      </div>
      
      <div class="endgame-progress-content" id="endgame-content">
        <div class="progress-status" id="progress-status">
          <!-- 動的に生成 -->
        </div>
        
        <div class="progress-conditions">
          <h4>解放条件</h4>
          <div id="conditions-list">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <div class="progress-summary">
          <div class="summary-text" id="summary-text">
            <!-- 動的に生成 -->
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.applyStyles();
  }
  
  // スタイル適用
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .endgame-progress-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        background: rgba(20, 0, 40, 0.95);
        border: 2px solid #9400d3;
        border-radius: 10px;
        color: #fff;
        font-family: 'Orbitron', sans-serif;
        z-index: 1500;
        transition: all 0.3s ease;
        box-shadow: 0 0 20px rgba(148, 0, 211, 0.5);
      }
      
      .endgame-progress-container.minimized {
        width: 200px;
      }
      
      .endgame-progress-container.minimized .endgame-progress-content {
        display: none;
      }
      
      .endgame-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background: rgba(148, 0, 211, 0.3);
        border-bottom: 1px solid #9400d3;
        border-radius: 8px 8px 0 0;
      }
      
      .endgame-progress-header h3 {
        margin: 0;
        font-size: 16px;
        color: #e0b0ff;
        text-shadow: 0 0 5px #9400d3;
      }
      
      .header-buttons {
        display: flex;
        gap: 5px;
      }
      
      .minimize-button, .close-button {
        background: none;
        border: 1px solid #9400d3;
        color: #e0b0ff;
        width: 25px;
        height: 25px;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .minimize-button:hover, .close-button:hover {
        background: rgba(148, 0, 211, 0.3);
        transform: scale(1.1);
      }
      
      .endgame-progress-content {
        padding: 15px;
      }
      
      .progress-status {
        text-align: center;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(148, 0, 211, 0.2);
        border-radius: 5px;
      }
      
      .status-unlocked {
        color: #00ff00;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 0 0 10px #00ff00;
      }
      
      .status-locked {
        color: #ff6600;
        font-size: 14px;
      }
      
      .progress-conditions {
        margin-bottom: 15px;
      }
      
      .progress-conditions h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #e0b0ff;
      }
      
      .condition-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        border: 1px solid transparent;
        transition: all 0.3s ease;
      }
      
      .condition-item.completed {
        border-color: #00ff00;
        background: rgba(0, 255, 0, 0.1);
      }
      
      .condition-item.in-progress {
        border-color: #ff9900;
        background: rgba(255, 153, 0, 0.1);
      }
      
      .condition-name {
        flex: 1;
        font-size: 12px;
        color: #ccc;
      }
      
      .condition-progress {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .progress-bar {
        width: 100px;
        height: 8px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #9400d3, #e0b0ff);
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-size: 11px;
        color: #e0b0ff;
        min-width: 60px;
        text-align: right;
      }
      
      .condition-icon {
        font-size: 16px;
      }
      
      .progress-summary {
        margin-top: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        text-align: center;
      }
      
      .summary-text {
        font-size: 12px;
        color: #aaa;
      }
      
      .summary-percentage {
        font-size: 24px;
        font-weight: bold;
        color: #e0b0ff;
        text-shadow: 0 0 10px #9400d3;
      }
      
      .unlock-hint {
        margin-top: 5px;
        font-size: 11px;
        color: #ff9900;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
  
  // イベントリスナー設定
  private attachEventListeners(): void {
    // 最小化ボタン
    document.getElementById('endgame-minimize')?.addEventListener('click', () => {
      this.toggleMinimize();
    });
    
    // 閉じるボタン
    document.getElementById('endgame-close')?.addEventListener('click', () => {
      this.hide();
    });
  }
  
  // 更新ループ開始
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      this.updateUI();
    }, 1000); // 1秒ごとに更新
  }
  
  // UI更新
  private updateUI(): void {
    if (!this.isInitialized || !this.container || this.container.style.display === 'none') return;
    
    const gameState = gameStateManager.getState();
    const conditions = DEFAULT_ENDGAME_CONDITIONS;
    const isEndgame = paragonSystem.isEndgame();
    
    // ステータス更新
    this.updateStatus(isEndgame);
    
    // 条件リスト更新
    this.updateConditions(gameState, conditions);
    
    // サマリー更新
    this.updateSummary(gameState, conditions, isEndgame);
  }
  
  // ステータス更新
  private updateStatus(isEndgame: boolean): void {
    const statusElement = document.getElementById('progress-status');
    if (!statusElement) return;
    
    if (isEndgame) {
      statusElement.innerHTML = `
        <div class="status-unlocked">
          🎉 エンドゲーム解放済み！ 🎉
        </div>
      `;
    } else {
      statusElement.innerHTML = `
        <div class="status-locked">
          🔒 エンドゲーム未解放
        </div>
      `;
    }
  }
  
  // 条件リスト更新
  private updateConditions(gameState: any, conditions: any): void {
    const listElement = document.getElementById('conditions-list');
    if (!listElement) return;
    
    const conditionData = [
      {
        name: '天体作成',
        icon: '🌟',
        current: gameState.stars?.length || 0,
        required: 100, // デフォルト値をハードコード
        type: 'celestial'
      },
      {
        name: '研究完了',
        icon: '🔬',
        current: gameState.research?.completedResearch?.length || 0,
        required: conditions.requiredResearchCount || 5,
        type: 'research'
      },
      {
        name: '思考ポイント',
        icon: '🧠',
        current: gameState.resources?.thoughtPoints || 0,
        required: conditions.requiredThoughtPoints || 10000,
        type: 'thought'
      },
      {
        name: '知的生命体',
        icon: '👽',
        current: this.hasIntelligentLife(gameState) ? 1 : 0,
        required: 1,
        type: 'life'
      }
    ];
    
    listElement.innerHTML = conditionData.map(condition => {
      const progress = Math.min(100, (condition.current / condition.required) * 100);
      const isCompleted = condition.current >= condition.required;
      const className = isCompleted ? 'completed' : progress > 0 ? 'in-progress' : '';
      
      return `
        <div class="condition-item ${className}">
          <span class="condition-icon">${condition.icon}</span>
          <span class="condition-name">${condition.name}</span>
          <div class="condition-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">
              ${this.formatNumber(condition.current)} / ${this.formatNumber(condition.required)}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // サマリー更新
  private updateSummary(gameState: any, conditions: any, isEndgame: boolean): void {
    const summaryElement = document.getElementById('summary-text');
    if (!summaryElement) return;
    
    if (isEndgame) {
      const paragonData = paragonSystem.getData();
      summaryElement.innerHTML = `
        <div>パラゴンレベル: <span class="summary-percentage">${paragonData.level}</span></div>
        <div>未使用ポイント: ${paragonData.unspentPoints}</div>
      `;
    } else {
      // 進捗計算
      const progressData = [
        (gameState.stars?.length || 0) / 100,
        (gameState.research?.completedResearch?.length || 0) / (conditions.requiredResearchCount || 5),
        (gameState.resources?.thoughtPoints || 0) / (conditions.requiredThoughtPoints || 10000),
        this.hasIntelligentLife(gameState) ? 1 : 0
      ];
      
      const totalProgress = (progressData.reduce((a, b) => a + Math.min(1, b), 0) / 4) * 100;
      
      // 次の目標を特定
      const nextGoal = this.getNextGoal(gameState, conditions);
      
      summaryElement.innerHTML = `
        <div>総合進捗: <span class="summary-percentage">${totalProgress.toFixed(1)}%</span></div>
        ${nextGoal ? `<div class="unlock-hint">次の目標: ${nextGoal}</div>` : ''}
      `;
    }
  }
  
  // 知的生命体の存在チェック
  private hasIntelligentLife(gameState: any): boolean {
    return gameState.stars?.some((star: any) => 
      star.userData?.lifeStage === 'intelligent'
    ) || false;
  }
  
  // 次の目標を取得
  private getNextGoal(gameState: any, conditions: any): string | null {
    const goals = [];
    
    const celestialProgress = (gameState.stars?.length || 0) / 100;
    if (celestialProgress < 1) {
      const remaining = 100 - (gameState.stars?.length || 0);
      goals.push({ 
        progress: celestialProgress, 
        text: `あと${remaining}個の天体を作成` 
      });
    }
    
    const researchProgress = (gameState.research?.completedResearch?.length || 0) / (conditions.requiredResearchCount || 5);
    if (researchProgress < 1) {
      const remaining = (conditions.requiredResearchCount || 5) - (gameState.research?.completedResearch?.length || 0);
      goals.push({ 
        progress: researchProgress, 
        text: `あと${remaining}個の研究を完了` 
      });
    }
    
    const thoughtProgress = (gameState.resources?.thoughtPoints || 0) / (conditions.requiredThoughtPoints || 10000);
    if (thoughtProgress < 1) {
      const remaining = (conditions.requiredThoughtPoints || 10000) - (gameState.resources?.thoughtPoints || 0);
      goals.push({ 
        progress: thoughtProgress, 
        text: `あと${this.formatNumber(remaining)}思考ポイント` 
      });
    }
    
    if (!this.hasIntelligentLife(gameState)) {
      goals.push({ 
        progress: 0, 
        text: '知的生命体を発生させる' 
      });
    }
    
    // 最も進捗が高い目標を返す
    goals.sort((a, b) => b.progress - a.progress);
    return goals.length > 0 ? goals[0].text : null;
  }
  
  // 数値フォーマット
  private formatNumber(num: number): string {
    // null/undefined チェック
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
  
  // 最小化切り替え
  private toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (this.container) {
      if (this.isMinimized) {
        this.container.classList.add('minimized');
      } else {
        this.container.classList.remove('minimized');
      }
    }
    
    const minimizeButton = document.getElementById('endgame-minimize');
    if (minimizeButton) {
      minimizeButton.textContent = this.isMinimized ? '＋' : '－';
    }
  }
  
  // 表示
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }
  
  // 非表示
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  // 表示切り替え
  toggle(): void {
    if (this.container) {
      if (this.container.style.display === 'none') {
        this.show();
      } else {
        this.hide();
      }
    }
  }
  
  // クリーンアップ
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.container?.remove();
    this.container = null;
    this.isInitialized = false;
  }
}

export const endgameProgressUI = EndgameProgressUI.getInstance();