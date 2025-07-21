/**
 * Automation UI System
 * 自動化システムのUI
 */

import { automationManager } from './automationManager.js';
import { celestialAutoCreator } from './celestialAutoCreate.js';
import { resourceBalancer } from './resourceBalancer.js';
import { researchQueue } from './researchQueue.js';
import { 
  AutomationType, 
  ConditionType, 
  ComparisonOperator, 
  LogicalOperator,
  AutomationCondition,
  ConditionGroup 
} from '../types/automation.js';
import { CelestialType } from '../types/celestial.js';
import { ResourceType } from '../resourceSystem.js';
import { researchItems } from '../researchData.js';
import { unlockManager } from './unlockManager.js';

export class AutomationUI {
  private static instance: AutomationUI;
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;
  
  private constructor() {
    console.log('[AUTOMATION-UI] Initialized');
  }
  
  static getInstance(): AutomationUI {
    if (!AutomationUI.instance) {
      AutomationUI.instance = new AutomationUI();
    }
    return AutomationUI.instance;
  }
  
  // UI初期化
  init(): void {
    this.createUI();
    this.setupEventListeners();
    this.addStyles();
  }
  
  // UI作成
  private createUI(): void {
    // コンテナ作成
    this.container = document.createElement('div');
    this.container.id = 'automation-ui';
    this.container.className = 'automation-container hidden';
    this.container.innerHTML = `
      <div class="automation-header">
        <h2>自動化システム</h2>
        <button class="close-button" id="automation-close">×</button>
      </div>
      
      <div class="automation-tabs">
        <button class="tab-button active" data-tab="celestial">天体作成</button>
        <button class="tab-button" data-tab="resource">資源変換</button>
        <button class="tab-button" data-tab="research">研究進行</button>
        <button class="tab-button" data-tab="statistics">統計</button>
      </div>
      
      <div class="automation-content">
        <div class="tab-content active" id="celestial-tab">
          ${this.createCelestialTab()}
        </div>
        <div class="tab-content" id="resource-tab">
          ${this.createResourceTab()}
        </div>
        <div class="tab-content" id="research-tab">
          ${this.createResearchTab()}
        </div>
        <div class="tab-content" id="statistics-tab">
          ${this.createStatisticsTab()}
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
  }
  
  // 天体作成タブ
  private createCelestialTab(): string {
    const config = celestialAutoCreator.getConfig();
    const isUnlocked = unlockManager.isUnlocked('automation_celestial');
    
    if (!isUnlocked) {
      return '<div class="locked-message">🔒 天体自動作成は研究でアンロックする必要があります</div>';
    }
    
    return `
      <div class="automation-section">
        <div class="toggle-section">
          <label class="toggle-label">
            <input type="checkbox" id="celestial-enabled" ${config.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
            天体自動作成を有効化
          </label>
        </div>
        
        <div class="config-section ${!config.enabled ? 'disabled' : ''}">
          <div class="form-group">
            <label>作成する天体タイプ:</label>
            <select id="celestial-type">
              <option value="star" ${config.celestialType === 'star' ? 'selected' : ''}>恒星</option>
              <option value="planet" ${config.celestialType === 'planet' ? 'selected' : ''}>惑星</option>
              <option value="moon" ${config.celestialType === 'moon' ? 'selected' : ''}>衛星</option>
              <option value="asteroid" ${config.celestialType === 'asteroid' ? 'selected' : ''}>小惑星</option>
              <option value="comet" ${config.celestialType === 'comet' ? 'selected' : ''}>彗星</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>作成間隔: <span id="interval-value">${config.interval / 1000}</span>秒</label>
            <input type="range" id="celestial-interval" min="5000" max="60000" step="1000" value="${config.interval}">
          </div>
          
          <div class="form-group">
            <label>配置優先度:</label>
            <select id="celestial-position">
              <option value="random" ${config.priorityPosition === 'random' ? 'selected' : ''}>ランダム</option>
              <option value="near_existing" ${config.priorityPosition === 'near_existing' ? 'selected' : ''}>既存天体の近く</option>
              <option value="empty_space" ${config.priorityPosition === 'empty_space' ? 'selected' : ''}>空いている空間</option>
            </select>
          </div>
          
          <div class="conditions-section">
            <h3>作成条件</h3>
            <div id="celestial-conditions">
              ${this.renderConditions(config.conditions)}
            </div>
            <button class="add-condition-btn" onclick="automationUI.addCondition('celestial')">+ 条件を追加</button>
          </div>
        </div>
      </div>
    `;
  }
  
  // 資源変換タブ
  private createResourceTab(): string {
    const config = resourceBalancer.getConfig();
    const isUnlocked = unlockManager.isUnlocked('automation_resource');
    
    if (!isUnlocked) {
      return '<div class="locked-message">🔒 資源自動変換は研究でアンロックする必要があります</div>';
    }
    
    return `
      <div class="automation-section">
        <div class="toggle-section">
          <label class="toggle-label">
            <input type="checkbox" id="resource-enabled" ${config.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
            資源自動変換を有効化
          </label>
        </div>
        
        <div class="config-section ${!config.enabled ? 'disabled' : ''}">
          <div class="form-group">
            <label>変換閾値: <span id="threshold-value">${Math.round(config.conversionThreshold * 100)}</span>%</label>
            <input type="range" id="resource-threshold" min="50" max="95" step="5" value="${config.conversionThreshold * 100}">
          </div>
          
          <div class="target-levels-section">
            <h3>目標資源レベル</h3>
            <div class="resource-targets">
              ${this.renderResourceTargets(config.targetLevels)}
            </div>
          </div>
          
          <div class="priority-section">
            <h3>優先順位</h3>
            <div id="resource-priority-list">
              ${this.renderPriorityList(config.priorityOrder)}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 研究タブ
  private createResearchTab(): string {
    const config = researchQueue.getConfig();
    const isUnlocked = unlockManager.isUnlocked('automation_research');
    
    if (!isUnlocked) {
      return '<div class="locked-message">🔒 研究自動進行は研究でアンロックする必要があります</div>';
    }
    
    const queue = researchQueue.getQueue();
    
    return `
      <div class="automation-section">
        <div class="toggle-section">
          <label class="toggle-label">
            <input type="checkbox" id="research-enabled" ${config.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
            研究自動進行を有効化
          </label>
        </div>
        
        <div class="config-section ${!config.enabled ? 'disabled' : ''}">
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="research-auto-suggest" ${config.autoAddSuggestions ? 'checked' : ''}>
              AIによる自動提案を有効化
            </label>
          </div>
          
          <div class="queue-section">
            <h3>研究キュー (${queue.length}/${config.maxQueueSize})</h3>
            <div id="research-queue-list">
              ${queue.length > 0 ? queue.map((item, index) => `
                <div class="queue-item" data-index="${index}">
                  <span class="queue-number">${index + 1}</span>
                  <span class="queue-name">${item.research?.name || 'Unknown'}</span>
                  <button class="remove-btn" onclick="automationUI.removeFromQueue('${item.item.researchId}')">×</button>
                </div>
              `).join('') : '<div class="empty-queue">キューは空です</div>'}
            </div>
          </div>
          
          <div class="available-research">
            <h3>利用可能な研究</h3>
            <div class="research-list">
              ${this.renderAvailableResearch()}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 統計タブ
  private createStatisticsTab(): string {
    const state = automationManager.getState();
    const stats = state.statistics;
    
    return `
      <div class="automation-section">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>実行統計</h3>
            <div class="stat-row">
              <span>総実行回数:</span>
              <span>${stats.totalExecutions}</span>
            </div>
            <div class="stat-row">
              <span>成功:</span>
              <span>${stats.successfulExecutions}</span>
            </div>
            <div class="stat-row">
              <span>失敗:</span>
              <span>${stats.failedExecutions}</span>
            </div>
            <div class="stat-row">
              <span>成功率:</span>
              <span>${stats.totalExecutions > 0 ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100) : 0}%</span>
            </div>
          </div>
          
          <div class="stat-card">
            <h3>天体作成統計</h3>
            ${Object.entries(stats.celestialsCreated).map(([type, count]) => `
              <div class="stat-row">
                <span>${this.getTypeName(type as CelestialType)}:</span>
                <span>${count}</span>
              </div>
            `).join('') || '<div class="stat-row">まだ作成されていません</div>'}
          </div>
          
          <div class="stat-card">
            <h3>資源効率</h3>
            ${Object.entries(stats.resourcesSaved).map(([resource, amount]) => `
              <div class="stat-row">
                <span>${resource}:</span>
                <span>${amount > 0 ? '+' : ''}${Math.round(amount)}</span>
              </div>
            `).join('') || '<div class="stat-row">まだデータがありません</div>'}
          </div>
          
          <div class="stat-card">
            <h3>効率設定</h3>
            <div class="stat-row">
              <span>実行間隔倍率:</span>
              <span>×${state.efficiency.intervalMultiplier}</span>
            </div>
            <div class="stat-row">
              <span>条件チェック速度:</span>
              <span>×${state.efficiency.conditionCheckSpeed}</span>
            </div>
            <div class="stat-row">
              <span>リソース効率:</span>
              <span>×${state.efficiency.resourceEfficiency}</span>
            </div>
            <div class="stat-row">
              <span>並列タスク数:</span>
              <span>${state.efficiency.maxParallelTasks}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 条件レンダリング
  private renderConditions(group: ConditionGroup): string {
    if (group.conditions.length === 0) {
      return '<div class="no-conditions">条件が設定されていません</div>';
    }
    
    return group.conditions.map((condition, index) => `
      <div class="condition-item">
        ${index > 0 ? `<span class="operator">${group.operator}</span>` : ''}
        <select class="condition-type" data-index="${index}">
          <option value="resource_amount" ${condition.type === ConditionType.RESOURCE_AMOUNT ? 'selected' : ''}>リソース量</option>
          <option value="celestial_count" ${condition.type === ConditionType.CELESTIAL_COUNT ? 'selected' : ''}>天体数</option>
          <option value="space_density" ${condition.type === ConditionType.SPACE_DENSITY ? 'selected' : ''}>空間密度</option>
        </select>
        ${condition.type === ConditionType.RESOURCE_AMOUNT ? `
          <select class="condition-target" data-index="${index}">
            <option value="cosmicDust">宇宙の塵</option>
            <option value="energy">エネルギー</option>
            <option value="organicMatter">有機物</option>
          </select>
        ` : ''}
        <select class="condition-operator" data-index="${index}">
          <option value=">" ${condition.operator === '>' ? 'selected' : ''}>&gt;</option>
          <option value=">=" ${condition.operator === '>=' ? 'selected' : ''}>&gt;=</option>
          <option value="<" ${condition.operator === '<' ? 'selected' : ''}>&lt;</option>
          <option value="<=" ${condition.operator === '<=' ? 'selected' : ''}>&lt;=</option>
        </select>
        <input type="number" class="condition-value" data-index="${index}" value="${condition.value}">
        <button class="remove-condition" data-index="${index}">×</button>
      </div>
    `).join('');
  }
  
  // リソース目標レンダリング
  private renderResourceTargets(targetLevels: Map<ResourceType, number>): string {
    const resources = [
      { type: ResourceType.COSMIC_DUST, name: '宇宙の塵' },
      { type: ResourceType.ENERGY, name: 'エネルギー' },
      { type: ResourceType.ORGANIC_MATTER, name: '有機物' },
      { type: ResourceType.BIOMASS, name: 'バイオマス' }
    ];
    
    return resources.map(resource => {
      const target = targetLevels.get(resource.type) || 1000;
      return `
        <div class="resource-target-item">
          <label>${resource.name}:</label>
          <input type="number" class="resource-target-input" data-resource="${resource.type}" value="${target}" min="0">
        </div>
      `;
    }).join('');
  }
  
  // 優先順位リストレンダリング
  private renderPriorityList(priorityOrder: ResourceType[]): string {
    return priorityOrder.map((resource, index) => `
      <div class="priority-item" data-index="${index}">
        <span class="priority-number">${index + 1}</span>
        <span class="priority-name">${this.getResourceName(resource)}</span>
      </div>
    `).join('');
  }
  
  // 利用可能な研究レンダリング
  private renderAvailableResearch(): string {
    // 簡略化のため、最初の5つの研究のみ表示
    const available = researchItems.slice(0, 5);
    
    return available.map(research => `
      <div class="research-item">
        <span class="research-icon">${research.icon}</span>
        <span class="research-name">${research.name}</span>
        <button class="add-to-queue-btn" onclick="automationUI.addToResearchQueue('${research.id}')">+</button>
      </div>
    `).join('');
  }
  
  // イベントリスナー設定
  private setupEventListeners(): void {
    // タブ切り替え
    this.container?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('tab-button')) {
        this.switchTab(target.dataset.tab!);
      }
      
      if (target.id === 'automation-close') {
        this.close();
      }
    });
    
    // 天体作成設定
    const celestialEnabled = document.getElementById('celestial-enabled') as HTMLInputElement;
    celestialEnabled?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      celestialAutoCreator.updateConfig({ enabled });
      this.updateUI();
    });
    
    // その他の設定変更ハンドラー（簡略化）
  }
  
  // タブ切り替え
  private switchTab(tabName: string): void {
    // タブボタン
    this.container?.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // タブコンテンツ
    this.container?.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
  }
  
  // UI更新
  private updateUI(): void {
    if (!this.container) return;
    
    const content = this.container.querySelector('.automation-content');
    if (content) {
      content.innerHTML = `
        <div class="tab-content active" id="celestial-tab">
          ${this.createCelestialTab()}
        </div>
        <div class="tab-content" id="resource-tab">
          ${this.createResourceTab()}
        </div>
        <div class="tab-content" id="research-tab">
          ${this.createResearchTab()}
        </div>
        <div class="tab-content" id="statistics-tab">
          ${this.createStatisticsTab()}
        </div>
      `;
    }
  }
  
  // 開く
  open(): void {
    if (!this.container) return;
    this.container.classList.remove('hidden');
    this.isOpen = true;
    this.updateUI();
  }
  
  // 閉じる
  close(): void {
    if (!this.container) return;
    this.container.classList.add('hidden');
    this.isOpen = false;
  }
  
  // トグル
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  // ヘルパー関数
  private getTypeName(type: CelestialType): string {
    const names = {
      star: '恒星',
      planet: '惑星',
      moon: '衛星',
      asteroid: '小惑星',
      comet: '彗星',
      black_hole: 'ブラックホール'
    };
    return names[type] || type;
  }
  
  private getResourceName(type: ResourceType): string {
    const names = {
      [ResourceType.COSMIC_DUST]: '宇宙の塵',
      [ResourceType.ENERGY]: 'エネルギー',
      [ResourceType.ORGANIC_MATTER]: '有機物',
      [ResourceType.BIOMASS]: 'バイオマス'
    };
    return names[type] || type;
  }
  
  // 公開メソッド（onclick用）
  addCondition(type: string): void {
    console.log('Add condition for', type);
    // 実装省略
  }
  
  removeFromQueue(researchId: string): void {
    researchQueue.removeFromQueue(researchId);
    this.updateUI();
  }
  
  addToResearchQueue(researchId: string): void {
    researchQueue.addToQueue(researchId);
    this.updateUI();
  }
  
  // スタイル追加
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .automation-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 800px;
        max-height: 600px;
        background: rgba(10, 10, 20, 0.98);
        border: 2px solid #4a4aff;
        border-radius: 15px;
        padding: 20px;
        z-index: 1000;
        overflow-y: auto;
        box-shadow: 0 0 30px rgba(74, 74, 255, 0.8);
      }
      
      .automation-container.hidden {
        display: none;
      }
      
      .automation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .automation-header h2 {
        color: #4a4aff;
        margin: 0;
      }
      
      .close-button {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }
      
      .automation-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #333;
      }
      
      .tab-button {
        background: none;
        border: none;
        color: #aaa;
        padding: 10px 20px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .tab-button.active {
        color: #4a4aff;
        border-bottom: 2px solid #4a4aff;
      }
      
      .tab-content {
        display: none;
      }
      
      .tab-content.active {
        display: block;
      }
      
      .toggle-label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        color: #fff;
      }
      
      .toggle-slider {
        width: 50px;
        height: 25px;
        background: #333;
        border-radius: 25px;
        position: relative;
        transition: background 0.3s;
      }
      
      .toggle-label input:checked + .toggle-slider {
        background: #4a4aff;
      }
      
      .config-section.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      
      .form-group {
        margin: 15px 0;
      }
      
      .form-group label {
        display: block;
        color: #aaa;
        margin-bottom: 5px;
      }
      
      .form-group select,
      .form-group input[type="range"] {
        width: 100%;
        background: #1a1a2e;
        border: 1px solid #333;
        color: #fff;
        padding: 5px;
        border-radius: 5px;
      }
      
      .locked-message {
        text-align: center;
        color: #888;
        padding: 50px;
        font-size: 18px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }
      
      .stat-card {
        background: rgba(20, 20, 40, 0.8);
        border: 1px solid #333;
        border-radius: 10px;
        padding: 15px;
      }
      
      .stat-card h3 {
        color: #4a4aff;
        margin: 0 0 10px 0;
        font-size: 16px;
      }
      
      .stat-row {
        display: flex;
        justify-content: space-between;
        color: #aaa;
        margin: 5px 0;
      }
    `;
    document.head.appendChild(style);
  }
}

export const automationUI = AutomationUI.getInstance();

// グローバルに公開
(window as any).automationUI = automationUI;