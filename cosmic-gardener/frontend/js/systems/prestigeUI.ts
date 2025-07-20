import { prestigeSystem } from './prestigeSystem.js';
import { prestigeUpgrades, getAvailableUpgrades } from './prestigeUpgrades.js';
import { gameStateManager } from '../state.js';
import { formatNumber } from '../utils.js';
import { animationSystem } from './simpleAnimations.js';
import { PrestigeUpgrade } from '../types/prestige.js';

export class PrestigeUI {
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private updateInterval: number | null = null;
  
  constructor() {
    console.log('[PRESTIGE-UI] Initialized');
  }
  
  init(): void {
    this.createUI();
    this.setupEventListeners();
  }
  
  private createUI(): void {
    // Create prestige container
    this.container = document.createElement('div');
    this.container.id = 'prestige-ui';
    this.container.className = 'prestige-ui hidden';
    this.container.innerHTML = `
      <div class="prestige-header">
        <h2>プレステージシステム</h2>
        <button class="prestige-close" title="閉じる">×</button>
      </div>
      
      <div class="prestige-content">
        <div class="prestige-info">
          <div class="prestige-stats">
            <div class="stat-item">
              <span class="stat-label">プレステージ回数:</span>
              <span class="stat-value" id="prestige-count">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">プレステージポイント:</span>
              <span class="stat-value" id="prestige-points">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">累計獲得ポイント:</span>
              <span class="stat-value" id="total-prestige-points">0</span>
            </div>
          </div>
          
          <div class="prestige-requirements">
            <h3>プレステージ条件</h3>
            <div id="requirements-list"></div>
          </div>
          
          <div class="prestige-preview">
            <h3>プレステージ予測</h3>
            <div id="prestige-preview-content"></div>
            <button id="prestige-execute-btn" class="prestige-execute-btn" disabled>
              ビッグバンを実行
            </button>
          </div>
        </div>
        
        <div class="prestige-upgrades">
          <h3>永続アップグレード</h3>
          <div id="upgrades-list" class="upgrades-grid"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.addStyles();
  }
  
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .prestige-ui {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 900px;
        height: 85vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
        border: 2px solid #4a4aff;
        border-radius: 20px;
        box-shadow: 0 0 30px rgba(74, 74, 255, 0.5);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .prestige-ui.hidden {
        display: none;
      }
      
      .prestige-header {
        padding: 20px;
        background: rgba(74, 74, 255, 0.1);
        border-bottom: 1px solid #4a4aff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .prestige-header h2 {
        margin: 0;
        color: #fff;
        font-size: 24px;
      }
      
      .prestige-close {
        background: transparent;
        border: 1px solid #4a4aff;
        color: #fff;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s;
      }
      
      .prestige-close:hover {
        background: #4a4aff;
        transform: rotate(90deg);
      }
      
      .prestige-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .prestige-info {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .prestige-stats {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .stat-item:last-child {
        border-bottom: none;
      }
      
      .stat-label {
        color: #aaa;
      }
      
      .stat-value {
        color: #4a4aff;
        font-weight: bold;
        font-size: 18px;
      }
      
      .prestige-requirements,
      .prestige-preview {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .prestige-requirements h3,
      .prestige-preview h3,
      .prestige-upgrades h3 {
        margin: 0 0 15px 0;
        color: #fff;
        font-size: 18px;
      }
      
      .requirement-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        color: #ccc;
      }
      
      .requirement-met {
        color: #4caf50;
      }
      
      .requirement-not-met {
        color: #f44336;
      }
      
      .prestige-execute-btn {
        width: 100%;
        padding: 15px;
        margin-top: 20px;
        background: linear-gradient(135deg, #4a4aff 0%, #7a7aff 100%);
        border: none;
        border-radius: 10px;
        color: #fff;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .prestige-execute-btn:disabled {
        background: #333;
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      .prestige-execute-btn:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(74, 74, 255, 0.5);
      }
      
      .prestige-execute-btn.ready {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 10px rgba(74, 74, 255, 0.5); }
        50% { box-shadow: 0 0 30px rgba(74, 74, 255, 0.8); }
        100% { box-shadow: 0 0 10px rgba(74, 74, 255, 0.5); }
      }
      
      .upgrades-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        max-height: 500px;
        overflow-y: auto;
      }
      
      .upgrade-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .upgrade-card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      
      .upgrade-card.maxed {
        opacity: 0.5;
        cursor: default;
      }
      
      .upgrade-card.locked {
        opacity: 0.3;
        cursor: not-allowed;
      }
      
      .upgrade-card.affordable {
        border-color: #4caf50;
      }
      
      .upgrade-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      
      .upgrade-icon {
        font-size: 24px;
      }
      
      .upgrade-name {
        color: #fff;
        font-weight: bold;
      }
      
      .upgrade-level {
        color: #4a4aff;
        font-size: 14px;
      }
      
      .upgrade-description {
        color: #aaa;
        font-size: 14px;
        margin-bottom: 10px;
      }
      
      .upgrade-cost {
        color: #ffeb3b;
        font-weight: bold;
      }
      
      .prestige-breakdown {
        margin-top: 15px;
        padding: 15px;
        background: rgba(74, 74, 255, 0.1);
        border-radius: 8px;
        font-size: 14px;
      }
      
      .breakdown-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        color: #ccc;
      }
      
      .breakdown-total {
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        margin-top: 10px;
        padding-top: 10px;
        color: #4a4aff;
        font-weight: bold;
        font-size: 16px;
      }
      
      @media (max-width: 768px) {
        .prestige-content {
          grid-template-columns: 1fr;
        }
        
        .prestige-ui {
          width: 95%;
          height: 90vh;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container?.querySelector('.prestige-close');
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Execute button
    const executeBtn = this.container?.querySelector('#prestige-execute-btn');
    executeBtn?.addEventListener('click', () => this.handlePrestige());
    
    // Upgrade cards click handler will be added in render
  }
  
  show(): void {
    if (!this.container) return;
    
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.render();
    this.startUpdating();
    
    animationSystem.fadeIn({
      targets: this.container,
      duration: 300
    });
  }
  
  hide(): void {
    if (!this.container) return;
    
    this.isOpen = false;
    this.stopUpdating();
    
    animationSystem.fadeOut({
      targets: this.container,
      duration: 300,
      complete: () => {
        this.container?.classList.add('hidden');
      }
    });
  }
  
  private render(): void {
    if (!this.container) return;
    
    const state = gameStateManager.getState();
    const prestigeState = prestigeSystem.getPrestigeState();
    const calculation = prestigeSystem.calculatePrestigePoints();
    
    // Update stats
    this.updateElement('#prestige-count', state.prestigeCount || 0);
    this.updateElement('#prestige-points', state.prestigePoints || 0);
    this.updateElement('#total-prestige-points', state.totalPrestigePoints || 0);
    
    // Update requirements
    this.renderRequirements(prestigeState);
    
    // Update preview
    this.renderPreview(calculation, prestigeState.canPrestige);
    
    // Update upgrades
    this.renderUpgrades();
    
    // Update execute button
    const executeBtn = this.container.querySelector('#prestige-execute-btn') as HTMLButtonElement;
    if (executeBtn) {
      executeBtn.disabled = !prestigeState.canPrestige;
      if (prestigeState.canPrestige) {
        executeBtn.classList.add('ready');
      } else {
        executeBtn.classList.remove('ready');
      }
    }
  }
  
  private renderRequirements(prestigeState: any): void {
    const container = this.container?.querySelector('#requirements-list');
    if (!container) return;
    
    const requirements = [
      {
        label: 'プレイ時間',
        current: Math.floor(prestigeState.currentProgress.playTime / 60000),
        required: Math.floor(prestigeState.requirements.minPlayTime / 60000),
        unit: '分',
        met: prestigeState.currentProgress.playTime >= prestigeState.requirements.minPlayTime
      },
      {
        label: '総資源量',
        current: prestigeState.currentProgress.totalResources,
        required: prestigeState.requirements.minResources,
        unit: '',
        met: prestigeState.currentProgress.totalResources >= prestigeState.requirements.minResources
      },
      {
        label: '天体数',
        current: prestigeState.currentProgress.celestialBodies,
        required: prestigeState.requirements.minCelestialBodies,
        unit: '個',
        met: prestigeState.currentProgress.celestialBodies >= prestigeState.requirements.minCelestialBodies
      },
      {
        label: '知的生命体',
        current: prestigeState.currentProgress.hasIntelligentLife ? '存在' : '未発見',
        required: '必要',
        unit: '',
        met: prestigeState.currentProgress.hasIntelligentLife
      }
    ];
    
    container.innerHTML = requirements.map(req => `
      <div class="requirement-item ${req.met ? 'requirement-met' : 'requirement-not-met'}">
        <span>${req.label}:</span>
        <span>${typeof req.current === 'number' ? formatNumber(req.current) : req.current}${req.unit} / ${typeof req.required === 'number' ? formatNumber(req.required) : req.required}${req.unit}</span>
      </div>
    `).join('');
  }
  
  private renderPreview(calculation: any, canPrestige: boolean): void {
    const container = this.container?.querySelector('#prestige-preview-content');
    if (!container) return;
    
    if (!canPrestige) {
      container.innerHTML = '<p style="color: #f44336;">プレステージ条件を満たしていません</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="prestige-breakdown">
        <div class="breakdown-item">
          <span>基本ポイント:</span>
          <span>${formatNumber(calculation.breakdown.basePoints, 2)}</span>
        </div>
        <div class="breakdown-item">
          <span>天体ボーナス:</span>
          <span>+${formatNumber(calculation.breakdown.celestialBonus, 2)}</span>
        </div>
        <div class="breakdown-item">
          <span>実績ボーナス:</span>
          <span>+${formatNumber(calculation.breakdown.achievementBonus, 2)}</span>
        </div>
        <div class="breakdown-item">
          <span>時間ボーナス:</span>
          <span>+${formatNumber(calculation.breakdown.timeBonus, 2)}</span>
        </div>
        <div class="breakdown-item breakdown-total">
          <span>獲得予定ポイント:</span>
          <span>${formatNumber(calculation.prestigePoints)} PP</span>
        </div>
      </div>
    `;
  }
  
  private renderUpgrades(): void {
    const container = this.container?.querySelector('#upgrades-list');
    if (!container) return;
    
    const state = gameStateManager.getState();
    const availableUpgrades = getAvailableUpgrades(state.prestigeUpgrades || {});
    
    container.innerHTML = prestigeUpgrades.map(upgrade => {
      const currentLevel = prestigeSystem.getUpgradeLevel(upgrade.id);
      const isMaxed = currentLevel >= upgrade.maxLevel;
      const cost = isMaxed ? 0 : prestigeSystem.getUpgradeCost(upgrade, currentLevel);
      const canAfford = (state.prestigePoints || 0) >= cost;
      const isAvailable = availableUpgrades.includes(upgrade);
      
      let className = 'upgrade-card';
      if (isMaxed) className += ' maxed';
      else if (!isAvailable) className += ' locked';
      else if (canAfford) className += ' affordable';
      
      return `
        <div class="${className}" data-upgrade-id="${upgrade.id}">
          <div class="upgrade-header">
            <span class="upgrade-icon">${upgrade.icon}</span>
            <div>
              <div class="upgrade-name">${upgrade.name}</div>
              <div class="upgrade-level">Lv ${currentLevel}/${upgrade.maxLevel}</div>
            </div>
          </div>
          <div class="upgrade-description">${upgrade.description}</div>
          ${!isMaxed ? `<div class="upgrade-cost">コスト: ${formatNumber(cost)} PP</div>` : '<div class="upgrade-cost">最大レベル</div>'}
        </div>
      `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.upgrade-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const upgradeId = (e.currentTarget as HTMLElement).dataset.upgradeId;
        if (upgradeId) this.handleUpgradePurchase(upgradeId);
      });
    });
  }
  
  private handleUpgradePurchase(upgradeId: string): void {
    if (prestigeSystem.purchaseUpgrade(upgradeId)) {
      this.render();
      animationSystem.popup({
        targets: `.upgrade-card[data-upgrade-id="${upgradeId}"]`,
        duration: 300
      });
    }
  }
  
  private async handlePrestige(): Promise<void> {
    if (!prestigeSystem.canPrestige()) return;
    
    // Confirm dialog
    const confirmed = confirm(
      'ビッグバンを実行すると、ゲームがリセットされます。\n' +
      'プレステージポイントを獲得し、永続的なアップグレードが可能になります。\n\n' +
      '本当に実行しますか？'
    );
    
    if (confirmed) {
      await prestigeSystem.executePrestige();
    }
  }
  
  private updateElement(selector: string, value: number | string): void {
    const element = this.container?.querySelector(selector);
    if (element) {
      element.textContent = typeof value === 'number' ? formatNumber(value) : value;
    }
  }
  
  private startUpdating(): void {
    this.stopUpdating();
    
    this.updateInterval = window.setInterval(() => {
      if (this.isOpen) {
        this.render();
      }
    }, 1000);
  }
  
  private stopUpdating(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  destroy(): void {
    this.stopUpdating();
    this.container?.remove();
    this.container = null;
  }
}