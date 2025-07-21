/**
 * Infinite Resource UI
 * 無限資源tierシステムのUI実装
 */

import { infiniteResourceSystem } from './infiniteResourceSystem.js';
import { ResourceType } from '../resourceSystem.js';
import { formatLargeNumber } from '../types/infiniteResources.js';
import { gameStateManager } from '../state.js';

export class InfiniteResourceUI {
  private static instance: InfiniteResourceUI;
  private container: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private updateInterval: number | null = null;
  private selectedResource: string = ResourceType.COSMIC_DUST;
  
  private constructor() {
    console.log('[INFINITE-RESOURCE-UI] Initialized');
  }
  
  static getInstance(): InfiniteResourceUI {
    if (!InfiniteResourceUI.instance) {
      InfiniteResourceUI.instance = new InfiniteResourceUI();
    }
    return InfiniteResourceUI.instance;
  }
  
  // UI初期化
  init(): void {
    if (this.isInitialized) return;
    
    this.createUI();
    this.attachEventListeners();
    this.startUpdateLoop();
    
    this.isInitialized = true;
    console.log('[INFINITE-RESOURCE-UI] UI initialized');
  }
  
  // UI作成
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'infinite-resource-ui';
    this.container.className = 'infinite-resource-container hidden';
    this.container.innerHTML = `
      <div class="infinite-resource-header">
        <h2>無限資源システム</h2>
        <button class="close-button" id="infinite-resource-close">×</button>
      </div>
      
      <div class="infinite-resource-content">
        <!-- 資源タイプ選択 -->
        <div class="resource-selector">
          <label>資源タイプ:</label>
          <select id="resource-type-select">
            <option value="${ResourceType.COSMIC_DUST}">宇宙の塵</option>
            <option value="${ResourceType.ENERGY}">エネルギー</option>
            <option value="${ResourceType.ORGANIC_MATTER}">有機物</option>
            <option value="${ResourceType.BIOMASS}">バイオマス</option>
            <option value="${ResourceType.DARK_MATTER}">ダークマター</option>
            <option value="${ResourceType.THOUGHT_POINTS}">思考ポイント</option>
          </select>
        </div>
        
        <!-- Tier一覧 -->
        <div class="tier-list" id="tier-list">
          <!-- 動的に生成 -->
        </div>
        
        <!-- 変換セクション -->
        <div class="conversion-section">
          <h3>資源変換</h3>
          <div id="conversion-recipes">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <!-- 統計情報 -->
        <div class="statistics-section">
          <h3>統計</h3>
          <div id="tier-statistics">
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
      .infinite-resource-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 900px;
        max-width: 90vw;
        max-height: 90vh;
        background: rgba(10, 10, 30, 0.95);
        border: 2px solid #00ff88;
        border-radius: 10px;
        color: #fff;
        font-family: 'Orbitron', sans-serif;
        z-index: 2100;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .infinite-resource-container.hidden {
        display: none;
      }
      
      .infinite-resource-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: rgba(0, 255, 136, 0.2);
        border-bottom: 1px solid #00ff88;
      }
      
      .infinite-resource-header h2 {
        margin: 0;
        font-size: 24px;
        color: #00ff88;
        text-shadow: 0 0 10px #00ff88;
      }
      
      .infinite-resource-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .resource-selector {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        padding: 10px;
        background: rgba(0, 255, 136, 0.1);
        border: 1px solid #00ff88;
        border-radius: 5px;
      }
      
      .resource-selector select {
        flex: 1;
        padding: 8px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #00ff88;
        color: #fff;
        border-radius: 3px;
      }
      
      .tier-list {
        display: grid;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .tier-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: rgba(0, 255, 136, 0.1);
        border: 1px solid #00ff88;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      
      .tier-item:hover {
        background: rgba(0, 255, 136, 0.2);
        transform: translateX(5px);
      }
      
      .tier-item.locked {
        opacity: 0.5;
        border-style: dashed;
      }
      
      .tier-info {
        flex: 1;
      }
      
      .tier-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .tier-details {
        font-size: 12px;
        color: #aaa;
      }
      
      .tier-amount {
        font-size: 20px;
        font-weight: bold;
        text-align: right;
        min-width: 150px;
      }
      
      .tier-unlock-button {
        padding: 8px 16px;
        background: rgba(0, 255, 136, 0.3);
        border: 1px solid #00ff88;
        border-radius: 5px;
        color: #00ff88;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .tier-unlock-button:hover:not(:disabled) {
        background: rgba(0, 255, 136, 0.5);
        transform: scale(1.05);
      }
      
      .tier-unlock-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .conversion-section {
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(0, 255, 136, 0.05);
        border: 1px solid #00ff88;
        border-radius: 8px;
      }
      
      .conversion-section h3 {
        margin-top: 0;
        color: #00ff88;
        text-shadow: 0 0 5px #00ff88;
      }
      
      .conversion-recipe {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        margin-bottom: 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 255, 136, 0.5);
        border-radius: 5px;
      }
      
      .conversion-arrow {
        font-size: 20px;
        color: #00ff88;
      }
      
      .conversion-amount {
        min-width: 100px;
        text-align: center;
      }
      
      .conversion-button {
        margin-left: auto;
        padding: 6px 12px;
        background: rgba(0, 255, 136, 0.3);
        border: 1px solid #00ff88;
        border-radius: 3px;
        color: #00ff88;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .conversion-button:hover:not(:disabled) {
        background: rgba(0, 255, 136, 0.5);
      }
      
      .conversion-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .statistics-section {
        padding: 15px;
        background: rgba(0, 255, 136, 0.05);
        border: 1px solid #00ff88;
        border-radius: 8px;
      }
      
      .statistics-section h3 {
        margin-top: 0;
        color: #00ff88;
        text-shadow: 0 0 5px #00ff88;
      }
      
      .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid rgba(0, 255, 136, 0.3);
      }
      
      .stat-item:last-child {
        border-bottom: none;
      }
      
      .stat-value {
        color: #00ff88;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }
  
  // イベントリスナー設定
  private attachEventListeners(): void {
    // 閉じるボタン
    document.getElementById('infinite-resource-close')?.addEventListener('click', () => {
      this.close();
    });
    
    // 資源タイプ選択
    const resourceSelect = document.getElementById('resource-type-select') as HTMLSelectElement;
    resourceSelect?.addEventListener('change', (e) => {
      this.selectedResource = (e.target as HTMLSelectElement).value;
      this.updateUI();
    });
  }
  
  // 更新ループ開始
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      if (!this.container?.classList.contains('hidden')) {
        this.updateUI();
      }
    }, 100);
  }
  
  // UI更新
  private updateUI(): void {
    if (!this.isInitialized) return;
    
    this.updateTierList();
    this.updateConversionRecipes();
    this.updateStatistics();
  }
  
  // Tierリスト更新
  private updateTierList(): void {
    const container = document.getElementById('tier-list');
    if (!container) return;
    
    const tiers = infiniteResourceSystem.getTierInfo(this.selectedResource);
    const maxUnlocked = infiniteResourceSystem.getMaxUnlockedTier(this.selectedResource);
    const gameState = gameStateManager.getState();
    
    const tierHTML = tiers.map((tier, index) => {
      const isUnlocked = index <= maxUnlocked;
      const resourceKey = index === 0 ? this.selectedResource : `${this.selectedResource}_tier${index}`;
      let amount = 0;
      
      // 資源量取得
      if (index === 0) {
        amount = gameState.resources[resourceKey as keyof typeof gameState.resources] || 0;
      } else {
        amount = gameState.infiniteResources?.[resourceKey] || 0;
      }
      
      const formattedAmount = formatLargeNumber(amount);
      
      return `
        <div class="tier-item ${isUnlocked ? '' : 'locked'}">
          <div class="tier-info">
            <div class="tier-name" style="color: ${tier.color}">
              Tier ${tier.tier}: ${tier.name}
            </div>
            <div class="tier-details">
              基本乗数: ×${formatLargeNumber(tier.baseMultiplier).formatted}
              ${tier.isGenerated ? ' (自動生成)' : ''}
            </div>
          </div>
          ${isUnlocked ? `
            <div class="tier-amount">${formattedAmount.formatted}</div>
          ` : `
            <button class="tier-unlock-button" data-tier="${tier.tier}" 
              ${index === maxUnlocked + 1 ? '' : 'disabled'}>
              解放
            </button>
          `}
        </div>
      `;
    }).join('');
    
    // 次のtierのプレビューを追加
    if (maxUnlocked < 20) { // 最大20tierまで表示
      const nextTier = infiniteResourceSystem.generateNextTier(this.selectedResource, maxUnlocked);
      const unlockAmount = nextTier.unlockCondition?.value || 0;
      
      tierHTML + `
        <div class="tier-item locked">
          <div class="tier-info">
            <div class="tier-name" style="color: ${nextTier.color}">
              Tier ${nextTier.tier}: ${nextTier.name}
            </div>
            <div class="tier-details">
              解放条件: Tier ${maxUnlocked} ${formatLargeNumber(unlockAmount).formatted}
            </div>
          </div>
          <button class="tier-unlock-button" disabled>
            未解放
          </button>
        </div>
      `;
    }
    
    container.innerHTML = tierHTML;
    
    // 解放ボタンのイベント
    container.querySelectorAll('.tier-unlock-button').forEach(button => {
      button.addEventListener('click', () => {
        const tier = parseInt(button.getAttribute('data-tier') || '0');
        if (infiniteResourceSystem.unlockNextTier(this.selectedResource)) {
          this.updateUI();
        }
      });
    });
  }
  
  // 変換レシピ更新
  private updateConversionRecipes(): void {
    const container = document.getElementById('conversion-recipes');
    if (!container) return;
    
    const recipes = infiniteResourceSystem.getConversionRecipes(this.selectedResource);
    const gameState = gameStateManager.getState();
    
    container.innerHTML = recipes.map(recipe => {
      const fromKey = recipe.fromTier === 0 
        ? this.selectedResource 
        : `${this.selectedResource}_tier${recipe.fromTier}`;
      
      const fromAmount = recipe.fromTier === 0
        ? gameState.resources[fromKey as keyof typeof gameState.resources] || 0
        : gameState.infiniteResources?.[fromKey] || 0;
      
      const canConvert = fromAmount >= recipe.ratio;
      
      return `
        <div class="conversion-recipe">
          <div class="conversion-amount">
            ${recipe.ratio} Tier ${recipe.fromTier}
          </div>
          <div class="conversion-arrow">→</div>
          <div class="conversion-amount">
            1 Tier ${recipe.toTier}
          </div>
          <div class="conversion-efficiency">
            効率: ${(recipe.efficiency * 100).toFixed(0)}%
          </div>
          <button class="conversion-button" 
            data-from="${recipe.fromTier}" 
            data-to="${recipe.toTier}"
            ${canConvert ? '' : 'disabled'}>
            変換
          </button>
        </div>
      `;
    }).join('') || '<p>変換レシピがありません</p>';
    
    // 変換ボタンのイベント
    container.querySelectorAll('.conversion-button').forEach(button => {
      button.addEventListener('click', () => {
        const fromTier = parseInt(button.getAttribute('data-from') || '0');
        const toTier = parseInt(button.getAttribute('data-to') || '0');
        
        if (infiniteResourceSystem.convertResource(this.selectedResource, fromTier, toTier, 1)) {
          this.updateUI();
        }
      });
    });
  }
  
  // 統計情報更新
  private updateStatistics(): void {
    const container = document.getElementById('tier-statistics');
    if (!container) return;
    
    const maxTier = infiniteResourceSystem.getMaxUnlockedTier(this.selectedResource);
    const tiers = infiniteResourceSystem.getTierInfo(this.selectedResource);
    const gameState = gameStateManager.getState();
    
    // 総資源価値を計算（基本tier換算）
    let totalValue = 0;
    tiers.forEach((tier, index) => {
      if (index > maxTier) return;
      
      const resourceKey = index === 0 
        ? this.selectedResource 
        : `${this.selectedResource}_tier${index}`;
      
      const amount = index === 0
        ? gameState.resources[resourceKey as keyof typeof gameState.resources] || 0
        : gameState.infiniteResources?.[resourceKey] || 0;
      
      totalValue += amount * tier.baseMultiplier;
    });
    
    container.innerHTML = `
      <div class="stat-item">
        <span>最大解放Tier</span>
        <span class="stat-value">${maxTier}</span>
      </div>
      <div class="stat-item">
        <span>総資源価値（基本tier換算）</span>
        <span class="stat-value">${formatLargeNumber(totalValue).formatted}</span>
      </div>
      <div class="stat-item">
        <span>アクティブ変換レシピ</span>
        <span class="stat-value">${infiniteResourceSystem.getConversionRecipes(this.selectedResource).length}</span>
      </div>
    `;
  }
  
  // UI表示
  open(): void {
    if (this.container) {
      this.container.classList.remove('hidden');
      this.updateUI();
    }
  }
  
  // UI非表示
  close(): void {
    if (this.container) {
      this.container.classList.add('hidden');
    }
  }
  
  // UI表示切り替え
  toggle(): void {
    if (this.container?.classList.contains('hidden')) {
      this.open();
    } else {
      this.close();
    }
  }
  
  // メニューボタンを追加（メニューシステムに統合済みのため、通知のみ）
  addMenuButton(): void {
    // メニューシステムに統合されたため、個別のボタンは作成しない
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast(
        '無限資源システムが解放されました！メニューのエンドゲームから確認できます',
        'success',
        5000
      );
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

export const infiniteResourceUI = InfiniteResourceUI.getInstance();