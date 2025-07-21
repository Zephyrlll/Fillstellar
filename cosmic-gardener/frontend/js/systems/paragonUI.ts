/**
 * Paragon UI System
 * パラゴンレベルシステムのUI実装
 */

import { paragonSystem } from './paragonSystem.js';
import { ParagonUpgrade, ParagonCategory } from '../types/paragon.js';

export class ParagonUI {
  private static instance: ParagonUI;
  private container: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private updateInterval: number | null = null;
  
  private constructor() {
    console.log('[PARAGON-UI] Initialized');
  }
  
  static getInstance(): ParagonUI {
    if (!ParagonUI.instance) {
      ParagonUI.instance = new ParagonUI();
    }
    return ParagonUI.instance;
  }
  
  // UI初期化
  init(): void {
    if (this.isInitialized) return;
    
    this.createUI();
    this.attachEventListeners();
    this.startUpdateLoop();
    
    this.isInitialized = true;
    console.log('[PARAGON-UI] UI initialized');
  }
  
  // UI作成
  private createUI(): void {
    // メインコンテナ
    this.container = document.createElement('div');
    this.container.id = 'paragon-ui';
    this.container.className = 'paragon-container hidden';
    this.container.innerHTML = `
      <div class="paragon-header">
        <h2>パラゴンシステム</h2>
        <button class="close-button" id="paragon-close">×</button>
      </div>
      
      <div class="paragon-content">
        <!-- レベル情報 -->
        <div class="paragon-info">
          <div class="level-display">
            <span class="label">パラゴンレベル:</span>
            <span class="value" id="paragon-level">0</span>
          </div>
          <div class="exp-bar">
            <div class="exp-fill" id="paragon-exp-fill"></div>
            <div class="exp-text" id="paragon-exp-text">0 / 1000</div>
          </div>
          <div class="points-display">
            <span class="label">未使用ポイント:</span>
            <span class="value" id="paragon-points">0</span>
          </div>
        </div>
        
        <!-- カテゴリータブ -->
        <div class="paragon-tabs">
          <button class="tab-button active" data-category="production">
            生産強化
          </button>
          <button class="tab-button" data-category="efficiency">
            効率向上
          </button>
          <button class="tab-button" data-category="expansion">
            拡張
          </button>
          <button class="tab-button" data-category="transcendence">
            超越
          </button>
        </div>
        
        <!-- アップグレードリスト -->
        <div class="paragon-upgrades" id="paragon-upgrades">
          <!-- 動的に生成 -->
        </div>
        
        <!-- ボーナス概要 -->
        <div class="paragon-summary">
          <h3>現在のボーナス</h3>
          <div id="paragon-bonuses" class="bonus-list">
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
      .paragon-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 800px;
        max-width: 90vw;
        max-height: 90vh;
        background: rgba(10, 10, 30, 0.95);
        border: 2px solid #4a0080;
        border-radius: 10px;
        color: #fff;
        font-family: 'Orbitron', sans-serif;
        z-index: 2000;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .paragon-container.hidden {
        display: none;
      }
      
      .paragon-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: rgba(74, 0, 128, 0.3);
        border-bottom: 1px solid #4a0080;
      }
      
      .paragon-header h2 {
        margin: 0;
        font-size: 24px;
        color: #ff00ff;
        text-shadow: 0 0 10px #ff00ff;
      }
      
      .close-button {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        padding: 0 5px;
      }
      
      .close-button:hover {
        color: #ff00ff;
      }
      
      .paragon-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .paragon-info {
        background: rgba(74, 0, 128, 0.2);
        border: 1px solid #4a0080;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }
      
      .level-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 20px;
      }
      
      .level-display .value {
        color: #ff00ff;
        font-weight: bold;
        text-shadow: 0 0 5px #ff00ff;
      }
      
      .exp-bar {
        position: relative;
        height: 20px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #4a0080;
        border-radius: 10px;
        margin-bottom: 10px;
        overflow: hidden;
      }
      
      .exp-fill {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        background: linear-gradient(90deg, #4a0080, #ff00ff);
        transition: width 0.3s ease;
      }
      
      .exp-text {
        position: absolute;
        width: 100%;
        text-align: center;
        line-height: 20px;
        font-size: 12px;
        color: #fff;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      
      .points-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 16px;
      }
      
      .points-display .value {
        color: #00ff00;
        font-weight: bold;
      }
      
      .paragon-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .tab-button {
        flex: 1;
        padding: 10px;
        background: rgba(74, 0, 128, 0.3);
        border: 1px solid #4a0080;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .tab-button:hover {
        background: rgba(74, 0, 128, 0.5);
      }
      
      .tab-button.active {
        background: rgba(255, 0, 255, 0.3);
        border-color: #ff00ff;
        color: #ff00ff;
      }
      
      .paragon-upgrades {
        display: grid;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .upgrade-item {
        background: rgba(74, 0, 128, 0.2);
        border: 1px solid #4a0080;
        border-radius: 8px;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s ease;
      }
      
      .upgrade-item:hover {
        background: rgba(74, 0, 128, 0.3);
        border-color: #ff00ff;
      }
      
      .upgrade-item.maxed {
        opacity: 0.5;
      }
      
      .upgrade-item.locked {
        opacity: 0.3;
        cursor: not-allowed;
      }
      
      .upgrade-info {
        flex: 1;
      }
      
      .upgrade-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .upgrade-icon {
        font-size: 20px;
      }
      
      .upgrade-description {
        font-size: 12px;
        color: #aaa;
        margin-bottom: 5px;
      }
      
      .upgrade-level {
        font-size: 12px;
        color: #00ff00;
      }
      
      .upgrade-button {
        padding: 8px 16px;
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #00ff00;
        border-radius: 5px;
        color: #00ff00;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .upgrade-button:hover:not(:disabled) {
        background: rgba(0, 255, 0, 0.3);
        transform: scale(1.05);
      }
      
      .upgrade-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .paragon-summary {
        background: rgba(74, 0, 128, 0.2);
        border: 1px solid #4a0080;
        border-radius: 8px;
        padding: 15px;
      }
      
      .paragon-summary h3 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #ff00ff;
      }
      
      .bonus-list {
        display: grid;
        gap: 5px;
        font-size: 14px;
      }
      
      .bonus-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid rgba(74, 0, 128, 0.3);
      }
      
      .bonus-item:last-child {
        border-bottom: none;
      }
      
      .bonus-value {
        color: #00ff00;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }
  
  // イベントリスナー設定
  private attachEventListeners(): void {
    // 閉じるボタン
    document.getElementById('paragon-close')?.addEventListener('click', () => {
      this.close();
    });
    
    // タブ切り替え
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const category = target.getAttribute('data-category');
        if (category) {
          this.switchCategory(category as ParagonCategory);
        }
      });
    });
    
    // パラゴンイベントリスナー
    window.addEventListener('paragonEvent', (e: any) => {
      this.handleParagonEvent(e.detail);
    });
  }
  
  // カテゴリー切り替え
  private switchCategory(category: ParagonCategory): void {
    // タブのアクティブ状態を更新
    document.querySelectorAll('.tab-button').forEach(button => {
      if (button.getAttribute('data-category') === category) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // アップグレードリストを更新
    this.updateUpgradesList(category);
  }
  
  // アップグレードリスト更新
  private updateUpgradesList(category?: ParagonCategory): void {
    const container = document.getElementById('paragon-upgrades');
    if (!container) return;
    
    const data = paragonSystem.getData();
    const activeCategory = category || this.getActiveCategory();
    
    // フィルタリング
    const upgrades = data.upgrades.filter(u => u.category === activeCategory);
    
    // HTML生成
    container.innerHTML = upgrades.map(upgrade => {
      const isMaxed = upgrade.currentLevel >= upgrade.maxLevel;
      const canAfford = data.unspentPoints >= upgrade.cost;
      const isLocked = this.isUpgradeLocked(upgrade);
      
      return `
        <div class="upgrade-item ${isMaxed ? 'maxed' : ''} ${isLocked ? 'locked' : ''}">
          <div class="upgrade-info">
            <div class="upgrade-name">
              <span class="upgrade-icon">${upgrade.icon}</span>
              <span>${upgrade.name}</span>
            </div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-level">
              レベル: ${upgrade.currentLevel} / ${upgrade.maxLevel}
            </div>
          </div>
          <button 
            class="upgrade-button" 
            data-upgrade-id="${upgrade.id}"
            ${!canAfford || isMaxed || isLocked ? 'disabled' : ''}
          >
            ${isMaxed ? 'MAX' : `コスト: ${upgrade.cost}`}
          </button>
        </div>
      `;
    }).join('');
    
    // ボタンイベント設定
    container.querySelectorAll('.upgrade-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const upgradeId = (e.target as HTMLElement).getAttribute('data-upgrade-id');
        if (upgradeId) {
          this.purchaseUpgrade(upgradeId);
        }
      });
    });
  }
  
  // アップグレードがロックされているかチェック
  private isUpgradeLocked(upgrade: ParagonUpgrade): boolean {
    if (!upgrade.requirements) return false;
    
    const data = paragonSystem.getData();
    return upgrade.requirements.some(reqId => {
      const reqUpgrade = data.upgrades.find(u => u.id === reqId);
      return !reqUpgrade || reqUpgrade.currentLevel === 0;
    });
  }
  
  // アクティブなカテゴリーを取得
  private getActiveCategory(): ParagonCategory {
    const activeButton = document.querySelector('.tab-button.active');
    return (activeButton?.getAttribute('data-category') as ParagonCategory) || 'production';
  }
  
  // アップグレード購入
  private purchaseUpgrade(upgradeId: string): void {
    const success = paragonSystem.purchaseUpgrade(upgradeId);
    if (success) {
      this.updateUI();
      
      // フィードバック
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast('アップグレード購入完了！', 'success');
      }
    }
  }
  
  // パラゴンイベントハンドリング
  private handleParagonEvent(event: any): void {
    switch (event.type) {
      case 'endgame_reached':
        // エンドゲーム到達時にUIを表示可能にする
        this.enableUI();
        break;
        
      case 'level_up':
      case 'upgrade_purchased':
      case 'bonus_applied':
        this.updateUI();
        break;
    }
  }
  
  // UI有効化
  private enableUI(): void {
    // メニューシステムに統合されたため、個別のボタンは作成しない
    // 代わりにメニューから開けることを通知
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast(
        'パラゴンシステムが解放されました！メニューのエンドゲームから確認できます',
        'success',
        5000
      );
    }
  }
  
  // 更新ループ開始
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      if (!this.container?.classList.contains('hidden')) {
        this.updateUI();
      }
    }, 100); // 100ms間隔で更新
  }
  
  // UI更新
  private updateUI(): void {
    if (!this.isInitialized) return;
    
    const data = paragonSystem.getData();
    
    // レベル情報更新
    const levelElement = document.getElementById('paragon-level');
    if (levelElement) levelElement.textContent = data.level.toString();
    
    // 経験値バー更新
    const expFill = document.getElementById('paragon-exp-fill') as HTMLElement;
    const expText = document.getElementById('paragon-exp-text');
    if (expFill && expText) {
      const expPercent = (data.experience / data.experienceToNext) * 100;
      expFill.style.width = `${expPercent}%`;
      expText.textContent = `${data.experience} / ${data.experienceToNext}`;
    }
    
    // ポイント表示更新
    const pointsElement = document.getElementById('paragon-points');
    if (pointsElement) pointsElement.textContent = data.unspentPoints.toString();
    
    // アップグレードリスト更新
    this.updateUpgradesList();
    
    // ボーナス概要更新
    this.updateBonusSummary();
  }
  
  // ボーナス概要更新
  private updateBonusSummary(): void {
    const container = document.getElementById('paragon-bonuses');
    if (!container) return;
    
    const bonuses = paragonSystem.getBonuses();
    const bonusItems: string[] = [];
    
    // 全資源生産ボーナス
    if (bonuses.allProduction > 1) {
      const percent = ((bonuses.allProduction - 1) * 100).toFixed(1);
      bonusItems.push(`
        <div class="bonus-item">
          <span>全資源生産量</span>
          <span class="bonus-value">+${percent}%</span>
        </div>
      `);
    }
    
    // 個別資源生産ボーナス
    Object.entries(bonuses.resourceProduction).forEach(([resource, multiplier]) => {
      if (multiplier > 1) {
        const percent = ((multiplier - 1) * 100).toFixed(1);
        bonusItems.push(`
          <div class="bonus-item">
            <span>${resource}生産量</span>
            <span class="bonus-value">+${percent}%</span>
          </div>
        `);
      }
    });
    
    // 研究速度ボーナス
    if (bonuses.researchSpeed > 1) {
      const percent = ((bonuses.researchSpeed - 1) * 100).toFixed(1);
      bonusItems.push(`
        <div class="bonus-item">
          <span>研究速度</span>
          <span class="bonus-value">+${percent}%</span>
        </div>
      `);
    }
    
    // 天体上限ボーナス
    if (bonuses.celestialCapBonus > 0) {
      bonusItems.push(`
        <div class="bonus-item">
          <span>天体作成上限</span>
          <span class="bonus-value">+${bonuses.celestialCapBonus}</span>
        </div>
      `);
    }
    
    // 時間操作ボーナス
    if (bonuses.timeManipulation > 1) {
      const percent = ((bonuses.timeManipulation - 1) * 100).toFixed(1);
      bonusItems.push(`
        <div class="bonus-item">
          <span>時間加速効果</span>
          <span class="bonus-value">+${percent}%</span>
        </div>
      `);
    }
    
    container.innerHTML = bonusItems.length > 0 
      ? bonusItems.join('') 
      : '<div class="bonus-item">ボーナスなし</div>';
  }
  
  // UI表示
  open(): void {
    if (!paragonSystem.isEndgame()) {
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast(
          'パラゴンシステムはエンドゲーム到達後に解放されます',
          'warning'
        );
      }
      return;
    }
    
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

export const paragonUI = ParagonUI.getInstance();