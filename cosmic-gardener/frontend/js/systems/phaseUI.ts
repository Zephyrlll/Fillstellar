/**
 * Phase UI
 * UI for game phase progression
 */

import { phaseManager } from './phaseManager.js';
import { getPhaseById } from './gamePhases.js';
import { animationSystem } from './simpleAnimations.js';
import { formatNumber } from '../utils.js';

export class PhaseUI {
  private static instance: PhaseUI;
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private updateInterval: number | null = null;
  
  private constructor() {
    console.log('[PHASE-UI] Initialized');
  }
  
  static getInstance(): PhaseUI {
    if (!PhaseUI.instance) {
      PhaseUI.instance = new PhaseUI();
    }
    return PhaseUI.instance;
  }
  
  init(): void {
    this.createUI();
    this.setupEventListeners();
    this.updatePhaseIndicator();
  }
  
  private createUI(): void {
    // Create phase indicator in UI
    const uiContainer = document.getElementById('ui-container');
    if (!uiContainer) return;
    
    const phaseIndicator = document.createElement('div');
    phaseIndicator.id = 'phase-indicator';
    phaseIndicator.className = 'phase-indicator';
    phaseIndicator.innerHTML = `
      <div class="phase-icon">🌌</div>
      <div class="phase-info">
        <div class="phase-name">Loading...</div>
        <div class="phase-progress"></div>
      </div>
    `;
    
    uiContainer.appendChild(phaseIndicator);
    
    // Create phase panel
    this.container = document.createElement('div');
    this.container.id = 'phase-panel';
    this.container.className = 'phase-panel hidden';
    this.container.innerHTML = `
      <div class="phase-header">
        <h2>ゲームフェーズ</h2>
        <button class="phase-close" title="閉じる">×</button>
      </div>
      
      <div class="phase-content">
        <div class="current-phase-section">
          <h3>現在のフェーズ</h3>
          <div id="current-phase-info"></div>
        </div>
        
        <div class="next-phase-section">
          <h3>次のフェーズ</h3>
          <div id="next-phase-info"></div>
          <div id="phase-requirements"></div>
          <button id="advance-phase-btn" class="advance-phase-btn" disabled>
            次のフェーズへ進む
          </button>
        </div>
        
        <div class="phase-history-section">
          <h3>フェーズ履歴</h3>
          <div id="phase-history"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.addStyles();
  }
  
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .phase-indicator {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 20, 30, 0.9);
        border: 1px solid #4a4aff;
        border-radius: 25px;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        cursor: pointer;
        transition: all 0.3s;
        z-index: 100;
      }
      
      .phase-indicator:hover {
        background: rgba(30, 30, 40, 0.95);
        transform: translateX(-50%) translateY(2px);
        box-shadow: 0 5px 20px rgba(74, 74, 255, 0.3);
      }
      
      .phase-icon {
        font-size: 24px;
      }
      
      .phase-info {
        text-align: left;
      }
      
      .phase-name {
        color: #fff;
        font-size: 16px;
        font-weight: bold;
      }
      
      .phase-progress {
        color: #aaa;
        font-size: 12px;
        margin-top: 2px;
      }
      
      .phase-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-height: 80vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
        border: 2px solid #4a4aff;
        border-radius: 20px;
        box-shadow: 0 0 30px rgba(74, 74, 255, 0.5);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .phase-panel.hidden {
        display: none;
      }
      
      .phase-header {
        padding: 20px;
        background: rgba(74, 74, 255, 0.1);
        border-bottom: 1px solid #4a4aff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .phase-header h2 {
        margin: 0;
        color: #fff;
        font-size: 24px;
      }
      
      .phase-close {
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
      
      .phase-close:hover {
        background: #4a4aff;
        transform: rotate(90deg);
      }
      
      .phase-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .current-phase-section,
      .next-phase-section,
      .phase-history-section {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .phase-content h3 {
        margin: 0 0 15px 0;
        color: #4a4aff;
        font-size: 18px;
      }
      
      .phase-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 10px;
      }
      
      .phase-item-icon {
        font-size: 32px;
      }
      
      .phase-item-content {
        flex: 1;
      }
      
      .phase-item-name {
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .phase-item-description {
        color: #aaa;
        font-size: 14px;
      }
      
      .phase-features {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .phase-feature {
        display: inline-block;
        padding: 4px 8px;
        background: rgba(74, 74, 255, 0.2);
        border-radius: 4px;
        color: #4a4aff;
        font-size: 12px;
        margin: 2px;
      }
      
      .requirement-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .requirement-item:last-child {
        border-bottom: none;
      }
      
      .requirement-text {
        color: #ccc;
        font-size: 14px;
      }
      
      .requirement-progress {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .requirement-bar {
        width: 100px;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .requirement-fill {
        height: 100%;
        background: #4a4aff;
        transition: width 0.3s;
      }
      
      .requirement-value {
        color: #aaa;
        font-size: 12px;
        min-width: 100px;
        text-align: right;
      }
      
      .requirement-met {
        color: #4caf50;
      }
      
      .advance-phase-btn {
        width: 100%;
        padding: 15px;
        margin-top: 20px;
        background: linear-gradient(135deg, #4a4aff 0%, #7a7aff 100%);
        border: none;
        border-radius: 10px;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .advance-phase-btn:disabled {
        background: #333;
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      .advance-phase-btn:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(74, 74, 255, 0.5);
      }
      
      .advance-phase-btn.ready {
        animation: pulse 2s infinite;
      }
      
      .phase-history-item {
        display: flex;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 14px;
        color: #aaa;
      }
      
      .phase-history-icon {
        margin-right: 10px;
      }
      
      .phase-history-time {
        margin-left: auto;
        font-size: 12px;
        color: #666;
      }
    `;
    document.head.appendChild(style);
  }
  
  private setupEventListeners(): void {
    // Phase indicator click
    const indicator = document.getElementById('phase-indicator');
    indicator?.addEventListener('click', () => this.toggle());
    
    // Close button
    const closeBtn = this.container?.querySelector('.phase-close');
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Advance button
    const advanceBtn = this.container?.querySelector('#advance-phase-btn');
    advanceBtn?.addEventListener('click', () => this.handleAdvancePhase());
  }
  
  toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
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
    
    const phaseState = phaseManager.getPhaseState();
    const currentPhase = getPhaseById(phaseState.currentPhase);
    const nextPhase = getPhaseById(phaseState.currentPhase + 1);
    
    // Render current phase
    const currentPhaseInfo = this.container.querySelector('#current-phase-info');
    if (currentPhaseInfo && currentPhase) {
      currentPhaseInfo.innerHTML = `
        <div class="phase-item">
          <div class="phase-item-icon">${currentPhase.icon}</div>
          <div class="phase-item-content">
            <div class="phase-item-name">${currentPhase.name}</div>
            <div class="phase-item-description">${currentPhase.description}</div>
            <div class="phase-features">
              ${currentPhase.features.map(f => `<span class="phase-feature">${f}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    // Render next phase
    const nextPhaseInfo = this.container.querySelector('#next-phase-info');
    if (nextPhaseInfo) {
      if (nextPhase) {
        nextPhaseInfo.innerHTML = `
          <div class="phase-item">
            <div class="phase-item-icon">${nextPhase.icon}</div>
            <div class="phase-item-content">
              <div class="phase-item-name">${nextPhase.name}</div>
              <div class="phase-item-description">${nextPhase.description}</div>
            </div>
          </div>
        `;
      } else {
        nextPhaseInfo.innerHTML = `
          <div class="phase-item">
            <div class="phase-item-content">
              <div class="phase-item-name">最終段階に到達</div>
              <div class="phase-item-description">おめでとうございます！すべてのフェーズを完了しました。</div>
            </div>
          </div>
        `;
      }
    }
    
    // Render requirements
    this.renderRequirements(nextPhase);
    
    // Render history
    this.renderHistory();
    
    // Update advance button
    const advanceBtn = this.container.querySelector('#advance-phase-btn') as HTMLButtonElement;
    if (advanceBtn) {
      advanceBtn.disabled = !phaseState.canAdvance || !nextPhase;
      if (phaseState.canAdvance && nextPhase) {
        advanceBtn.classList.add('ready');
      } else {
        advanceBtn.classList.remove('ready');
      }
    }
  }
  
  private renderRequirements(nextPhase: any): void {
    const container = this.container?.querySelector('#phase-requirements');
    if (!container) return;
    
    if (!nextPhase) {
      container.innerHTML = '';
      return;
    }
    
    const phaseState = phaseManager.getPhaseState();
    const progress = phaseManager['getRequirementProgress'](nextPhase);
    
    container.innerHTML = progress.map(req => {
      const percentage = Math.round(req.progress * 100);
      const isMet = req.completed;
      
      return `
        <div class="requirement-item">
          <span class="requirement-text ${isMet ? 'requirement-met' : ''}">${req.requirement.description}</span>
          <div class="requirement-progress">
            <div class="requirement-bar">
              <div class="requirement-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="requirement-value ${isMet ? 'requirement-met' : ''}">
              ${formatNumber(req.currentValue)} / ${formatNumber(req.requirement.value)}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  private renderHistory(): void {
    const container = this.container?.querySelector('#phase-history');
    if (!container) return;
    
    const phaseState = phaseManager.getPhaseState();
    const history: string[] = [];
    
    // Add completed phases
    for (const phaseId of Array.from(phaseState.unlockedPhases).sort()) {
      const phase = getPhaseById(phaseId);
      if (phase) {
        history.push(`
          <div class="phase-history-item">
            <span class="phase-history-icon">${phase.icon}</span>
            <span>${phase.name} - 完了</span>
            <span class="phase-history-time">フェーズ ${phaseId}</span>
          </div>
        `);
      }
    }
    
    container.innerHTML = history.join('') || '<p style="color: #666; text-align: center;">まだ履歴がありません</p>';
  }
  
  private async handleAdvancePhase(): Promise<void> {
    const success = await phaseManager.advancePhase();
    
    if (success) {
      this.render();
      this.updatePhaseIndicator();
    }
  }
  
  updatePhaseIndicator(): void {
    const indicator = document.getElementById('phase-indicator');
    if (!indicator) return;
    
    const phaseState = phaseManager.getPhaseState();
    const currentPhase = getPhaseById(phaseState.currentPhase);
    
    if (currentPhase) {
      const nameElement = indicator.querySelector('.phase-name');
      const progressElement = indicator.querySelector('.phase-progress');
      const iconElement = indicator.querySelector('.phase-icon');
      
      if (nameElement) {
        nameElement.textContent = currentPhase.name;
      }
      
      if (progressElement) {
        const nextPhase = getPhaseById(phaseState.currentPhase + 1);
        if (nextPhase && phaseState.canAdvance) {
          progressElement.textContent = '次のフェーズへ進む準備完了！';
          progressElement.style.color = '#4caf50';
        } else if (nextPhase) {
          progressElement.textContent = '次のフェーズへ向けて進行中...';
          progressElement.style.color = '#aaa';
        } else {
          progressElement.textContent = '最終段階';
          progressElement.style.color = '#ffeb3b';
        }
      }
      
      if (iconElement) {
        iconElement.textContent = currentPhase.icon;
      }
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
    document.getElementById('phase-indicator')?.remove();
  }
}

export const phaseUI = PhaseUI.getInstance();