import { balanceManager } from './balanceConfig.js';
import { balanceAdjustments } from './balanceAdjustments.js';
import { gameState, gameStateManager } from '../state.js';

export class BalanceDebugUI {
  private static instance: BalanceDebugUI;
  private container: HTMLDivElement | null = null;
  private isVisible: boolean = false;
  
  private constructor() {
    this.createUI();
    this.setupKeyBindings();
  }
  
  static getInstance(): BalanceDebugUI {
    if (!BalanceDebugUI.instance) {
      BalanceDebugUI.instance = new BalanceDebugUI();
    }
    return BalanceDebugUI.instance;
  }
  
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'balance-debug-ui';
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      width: 300px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #4a9eff;
      border-radius: 8px;
      padding: 15px;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      z-index: 100001;
      display: none;
      overflow-y: auto;
    `;
    
    document.body.appendChild(this.container);
  }
  
  private setupKeyBindings(): void {
    document.addEventListener('keydown', (e) => {
      // F4 to toggle balance debug UI
      if (e.key === 'F4') {
        e.preventDefault();
        this.toggle();
      }
    });
  }
  
  toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
      if (this.isVisible) {
        this.update();
      }
    }
  }
  
  update(): void {
    if (!this.container || !this.isVisible) return;
    
    const stats = balanceAdjustments.getBalanceStats();
    const config = balanceManager.getConfig();
    
    let html = '<h3 style="margin: 0 0 10px 0; color: #4a9eff;">Balance Debug Panel</h3>';
    
    // Current Resources
    html += '<div style="margin-bottom: 15px;">';
    html += '<h4 style="margin: 5px 0; color: #4fff4f;">Current Resources</h4>';
    html += `<div>宇宙の塵: <span style="color: #ffff4f">${Math.floor(gameState.resources.cosmicDust)}</span></div>`;
    html += `<div>エネルギー: <span style="color: #ffff4f">${Math.floor(gameState.resources.energy)}</span></div>`;
    html += `<div>有機物: <span style="color: #ffff4f">${Math.floor(gameState.resources.organicMatter)}</span></div>`;
    html += `<div>バイオマス: <span style="color: #ffff4f">${Math.floor(gameState.resources.biomass)}</span></div>`;
    html += `<div style="color: #ff69b4;">ダークマター: <span style="color: #ff1493; font-weight: bold;">${Math.floor(gameState.resources.darkMatter)}</span></div>`;
    html += `<div>思考ポイント: <span style="color: #ffff4f">${Math.floor(gameState.resources.thoughtPoints)}</span></div>`;
    html += '</div>';
    
    // Resource generation rates
    html += '<div style="margin-bottom: 15px;">';
    html += '<h4 style="margin: 5px 0; color: #4fff4f;">Resource Generation Rates</h4>';
    for (const [resource, rate] of Object.entries(stats.resourceGenerationRates)) {
      const rateStr = rate > 0 ? `+${rate.toFixed(4)}/s` : '0/s';
      html += `<div>${resource}: <span style="color: #ffff4f">${rateStr}</span></div>`;
    }
    html += '</div>';
    
    // Body creation affordability
    html += '<div style="margin-bottom: 15px;">';
    html += '<h4 style="margin: 5px 0; color: #4fff4f;">Creation Affordability</h4>';
    for (const [body, canAfford] of Object.entries(stats.bodyCreationAffordability)) {
      const color = canAfford ? '#4fff4f' : '#ff4f4f';
      const status = canAfford ? 'YES' : 'NO';
      html += `<div>${body}: <span style="color: ${color}">${status}</span></div>`;
    }
    html += '</div>';
    
    // Game progression
    html += '<div style="margin-bottom: 15px;">';
    html += '<h4 style="margin: 5px 0; color: #4fff4f;">Progression Analysis</h4>';
    html += `<div>Speed: <span style="color: #ffff4f">${stats.progressionSpeed}</span></div>`;
    html += `<div>Game Years: ${gameState.gameYear.toFixed(1)}</div>`;
    html += `<div>Total Bodies: ${gameState.stars.length}</div>`;
    html += `<div>Years/Body: ${(gameState.gameYear / Math.max(gameState.stars.length, 1)).toFixed(2)}</div>`;
    html += '</div>';
    
    // Current multipliers
    html += '<div style="margin-bottom: 15px;">';
    html += '<h4 style="margin: 5px 0; color: #4fff4f;">Active Multipliers</h4>';
    if (gameState.balancedRates) {
      for (const [resource, multiplier] of Object.entries(gameState.balancedRates)) {
        html += `<div>${resource}: ×${(multiplier as number).toFixed(2)}</div>`;
      }
    }
    html += '</div>';
    
    // Debug controls
    html += '<div style="margin-bottom: 15px;">';
    html += '<h4 style="margin: 5px 0; color: #4fff4f;">Debug Controls</h4>';
    html += '<button onclick="window.balanceDebugUI.giveResources()" style="margin: 2px;">Give 1000 Resources</button><br>';
    html += '<button onclick="window.balanceDebugUI.multiplyRates(2)" style="margin: 2px;">2x Rates</button>';
    html += '<button onclick="window.balanceDebugUI.multiplyRates(0.5)" style="margin: 2px;">0.5x Rates</button><br>';
    html += '<button onclick="window.balanceDebugUI.resetBalance()" style="margin: 2px;">Reset Balance</button>';
    html += '</div>';
    
    // Instructions
    html += '<div style="font-size: 10px; color: #888; margin-top: 10px;">';
    html += 'Press F4 to toggle this panel<br>';
    html += 'Press F3 for performance monitor';
    html += '</div>';
    
    this.container.innerHTML = html;
  }
  
  // Debug functions exposed to window
  giveResources(): void {
    const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
    resources.forEach(resource => {
      balanceAdjustments.debugSetResource(resource, 1000);
    });
    this.update();
  }
  
  multiplyRates(multiplier: number): void {
    balanceAdjustments.debugMultiplyRates(multiplier);
    this.update();
  }
  
  resetBalance(): void {
    balanceManager.resetToDefaults();
    this.update();
  }
}

// Create instance and expose to window for debug controls
export const balanceDebugUI = BalanceDebugUI.getInstance();
(window as any).balanceDebugUI = balanceDebugUI;