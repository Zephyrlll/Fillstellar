/**
 * Mythic Rarity UI
 * 神話級レアリティシステムのUI実装
 */

import { mythicRaritySystem } from './mythicRaritySystem.js';
import { MYTHIC_RARITY_CONFIGS, MythicRarity, MythicObject } from '../types/mythicRarity.js';

export class MythicRarityUI {
  private static instance: MythicRarityUI;
  private container: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private updateInterval: number | null = null;
  private selectedTab: 'collection' | 'bonuses' | 'effects' = 'collection';
  
  private constructor() {
    console.log('[MYTHIC-RARITY-UI] Initialized');
  }
  
  static getInstance(): MythicRarityUI {
    if (!MythicRarityUI.instance) {
      MythicRarityUI.instance = new MythicRarityUI();
    }
    return MythicRarityUI.instance;
  }
  
  // UI初期化
  init(): void {
    if (this.isInitialized) return;
    
    this.createUI();
    this.attachEventListeners();
    this.startUpdateLoop();
    
    // 神話級発見イベントリスナー
    window.addEventListener('mythicDiscovered', (e: any) => {
      this.handleMythicDiscovery(e.detail);
    });
    
    this.isInitialized = true;
    console.log('[MYTHIC-RARITY-UI] UI initialized');
  }
  
  // UI作成
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'mythic-rarity-ui';
    this.container.className = 'mythic-rarity-container hidden';
    this.container.innerHTML = `
      <div class="mythic-header">
        <h2>神話級コレクション</h2>
        <button class="close-button" id="mythic-close">×</button>
      </div>
      
      <div class="mythic-content">
        <!-- タブ -->
        <div class="mythic-tabs">
          <button class="tab-button active" data-tab="collection">
            コレクション
          </button>
          <button class="tab-button" data-tab="bonuses">
            ボーナス効果
          </button>
          <button class="tab-button" data-tab="effects">
            ビジュアル効果
          </button>
        </div>
        
        <!-- コレクションタブ -->
        <div class="tab-content" id="collection-tab">
          <div class="mythic-stats">
            <div class="stat-item">
              <span class="stat-label">総神話級アイテム:</span>
              <span class="stat-value" id="total-mythic-count">0</span>
            </div>
          </div>
          
          <div class="mythic-grid" id="mythic-collection">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <!-- ボーナスタブ -->
        <div class="tab-content hidden" id="bonuses-tab">
          <div class="bonus-list" id="mythic-bonuses">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <!-- エフェクトタブ -->
        <div class="tab-content hidden" id="effects-tab">
          <div class="effects-settings">
            <h3>ビジュアルエフェクト設定</h3>
            <div class="effect-toggles" id="effect-toggles">
              <!-- 動的に生成 -->
            </div>
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
      .mythic-rarity-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1000px;
        max-width: 90vw;
        max-height: 90vh;
        background: linear-gradient(135deg, #1a0033 0%, #330066 100%);
        border: 3px solid transparent;
        border-image: linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff0000) 1;
        border-radius: 15px;
        color: #fff;
        font-family: 'Orbitron', sans-serif;
        z-index: 2200;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(255, 0, 255, 0.5);
      }
      
      .mythic-rarity-container.hidden {
        display: none;
      }
      
      .mythic-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: rgba(255, 0, 255, 0.2);
        border-bottom: 2px solid rgba(255, 0, 255, 0.5);
      }
      
      .mythic-header h2 {
        margin: 0;
        font-size: 28px;
        background: linear-gradient(45deg, #ff00ff, #00ffff, #ffff00);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 20px rgba(255, 0, 255, 0.8);
      }
      
      .mythic-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .mythic-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .mythic-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .stat-item {
        background: rgba(255, 255, 255, 0.1);
        padding: 15px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #ff00ff;
        text-shadow: 0 0 10px #ff00ff;
      }
      
      .mythic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
      
      .mythic-item {
        background: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
        padding: 20px;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      
      .mythic-item::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, var(--rarity-color), transparent);
        border-radius: 10px;
        z-index: -1;
        animation: mythic-glow 2s ease-in-out infinite;
      }
      
      @keyframes mythic-glow {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      
      .mythic-item:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 10px 30px rgba(255, 0, 255, 0.5);
      }
      
      .mythic-rarity-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        background: var(--rarity-color);
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .mythic-item-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: var(--rarity-color);
        text-shadow: 0 0 10px var(--rarity-color);
      }
      
      .mythic-item-type {
        font-size: 14px;
        color: #aaa;
        margin-bottom: 5px;
      }
      
      .mythic-item-date {
        font-size: 12px;
        color: #888;
      }
      
      .mythic-item-bonuses {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .bonus-entry {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        font-size: 14px;
      }
      
      .bonus-value {
        color: #00ff00;
        font-weight: bold;
      }
      
      .bonus-list {
        display: grid;
        gap: 15px;
      }
      
      .bonus-category {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 20px;
      }
      
      .bonus-category h3 {
        margin-top: 0;
        color: #ff00ff;
        text-shadow: 0 0 5px #ff00ff;
      }
      
      .effect-toggles {
        display: grid;
        gap: 10px;
      }
      
      .effect-toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
      }
      
      .toggle-switch {
        position: relative;
        width: 50px;
        height: 25px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 25px;
        cursor: pointer;
        transition: background 0.3s ease;
      }
      
      .toggle-switch.active {
        background: #00ff00;
      }
      
      .toggle-switch::after {
        content: '';
        position: absolute;
        top: 2.5px;
        left: 2.5px;
        width: 20px;
        height: 20px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.3s ease;
      }
      
      .toggle-switch.active::after {
        transform: translateX(25px);
      }
      
      /* レアリティ別の色 */
      .rarity-5 { --rarity-color: #ff00ff; }
      .rarity-6 { --rarity-color: #00ffff; }
      .rarity-7 { --rarity-color: #ffffff; }
      .rarity-8 { --rarity-color: #ffff00; }
      .rarity-9 { --rarity-color: #ff0000; }
    `;
    document.head.appendChild(style);
  }
  
  // イベントリスナー設定
  private attachEventListeners(): void {
    // 閉じるボタン
    document.getElementById('mythic-close')?.addEventListener('click', () => {
      this.close();
    });
    
    // タブ切り替え
    document.querySelectorAll('.mythic-tabs .tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tab = target.getAttribute('data-tab') as 'collection' | 'bonuses' | 'effects';
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  }
  
  // タブ切り替え
  private switchTab(tab: 'collection' | 'bonuses' | 'effects'): void {
    this.selectedTab = tab;
    
    // タブボタンのアクティブ状態を更新
    document.querySelectorAll('.mythic-tabs .tab-button').forEach(button => {
      if (button.getAttribute('data-tab') === tab) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // タブコンテンツの表示/非表示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(`${tab}-tab`)?.classList.remove('hidden');
    
    // コンテンツ更新
    this.updateUI();
  }
  
  // 更新ループ開始
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => {
      if (!this.container?.classList.contains('hidden')) {
        this.updateUI();
      }
    }, 1000);
  }
  
  // UI更新
  private updateUI(): void {
    if (!this.isInitialized) return;
    
    switch (this.selectedTab) {
      case 'collection':
        this.updateCollection();
        break;
      case 'bonuses':
        this.updateBonuses();
        break;
      case 'effects':
        this.updateEffects();
        break;
    }
    
    // 統計更新
    this.updateStats();
  }
  
  // 統計更新
  private updateStats(): void {
    const totalCount = mythicRaritySystem.getMythicObjectCount();
    const countElement = document.getElementById('total-mythic-count');
    if (countElement) {
      countElement.textContent = totalCount.toString();
    }
  }
  
  // コレクション更新
  private updateCollection(): void {
    const container = document.getElementById('mythic-collection');
    if (!container) return;
    
    const mythicObjects = mythicRaritySystem.getAllMythicObjects();
    
    container.innerHTML = mythicObjects.map(obj => {
      const config = MYTHIC_RARITY_CONFIGS[obj.rarity];
      const discoveryDate = new Date(obj.discoveredAt).toLocaleDateString();
      
      return `
        <div class="mythic-item rarity-${obj.rarity}" style="--rarity-color: ${config.color}">
          <div class="mythic-rarity-badge">${config.name}</div>
          <div class="mythic-item-name">${obj.uniqueName || '無名の神話級アイテム'}</div>
          <div class="mythic-item-type">タイプ: ${this.getTypeLabel(obj.type)}</div>
          <div class="mythic-item-date">発見日: ${discoveryDate}</div>
          
          <div class="mythic-item-bonuses">
            ${obj.bonuses.map(bonus => `
              <div class="bonus-entry">
                <span>${this.getBonusLabel(bonus.type, bonus.target)}</span>
                <span class="bonus-value">+${this.formatBonusValue(bonus)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('') || '<p style="text-align: center; color: #888;">まだ神話級アイテムを発見していません</p>';
  }
  
  // ボーナス一覧更新
  private updateBonuses(): void {
    const container = document.getElementById('mythic-bonuses');
    if (!container) return;
    
    const gameState = gameStateManager.getState();
    const mythicBonuses = gameState.mythicBonuses || {};
    
    // ボーナスをカテゴリ別に整理
    const categorizedBonuses: { [key: string]: { [key: string]: number } } = {
      production: {},
      efficiency: {},
      special: {}
    };
    
    Object.entries(mythicBonuses).forEach(([key, value]) => {
      if (key.includes('production')) {
        categorizedBonuses.production[key] = value as number;
      } else if (key.includes('efficiency') || key.includes('speed')) {
        categorizedBonuses.efficiency[key] = value as number;
      } else {
        categorizedBonuses.special[key] = value as number;
      }
    });
    
    container.innerHTML = `
      <div class="bonus-category">
        <h3>生産ボーナス</h3>
        ${this.renderBonusList(categorizedBonuses.production)}
      </div>
      
      <div class="bonus-category">
        <h3>効率ボーナス</h3>
        ${this.renderBonusList(categorizedBonuses.efficiency)}
      </div>
      
      <div class="bonus-category">
        <h3>特殊ボーナス</h3>
        ${this.renderBonusList(categorizedBonuses.special)}
      </div>
    `;
  }
  
  // ボーナスリストのレンダリング
  private renderBonusList(bonuses: { [key: string]: number }): string {
    const entries = Object.entries(bonuses);
    if (entries.length === 0) {
      return '<p style="color: #888;">ボーナスなし</p>';
    }
    
    return entries.map(([key, value]) => `
      <div class="bonus-entry">
        <span>${this.formatBonusKey(key)}</span>
        <span class="bonus-value">+${this.formatBonusDisplay(value)}</span>
      </div>
    `).join('');
  }
  
  // エフェクト設定更新
  private updateEffects(): void {
    const container = document.getElementById('effect-toggles');
    if (!container) return;
    
    const effectTypes = [
      { id: 'aura', name: 'オーラエフェクト', enabled: true },
      { id: 'trail', name: 'トレイルエフェクト', enabled: true },
      { id: 'pulse', name: 'パルスエフェクト', enabled: true },
      { id: 'constellation', name: '星座エフェクト', enabled: true },
      { id: 'dimension_rift', name: '次元の裂け目', enabled: true },
      { id: 'distortion', name: '空間歪曲', enabled: true }
    ];
    
    container.innerHTML = effectTypes.map(effect => `
      <div class="effect-toggle">
        <span>${effect.name}</span>
        <div class="toggle-switch ${effect.enabled ? 'active' : ''}" 
             data-effect="${effect.id}"></div>
      </div>
    `).join('');
    
    // トグルイベント設定
    container.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        target.classList.toggle('active');
        // エフェクトの有効/無効を切り替える処理（省略）
      });
    });
  }
  
  // タイプラベル取得
  private getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      resource: '資源',
      celestial: '天体',
      artifact: 'アーティファクト',
      essence: 'エッセンス'
    };
    return labels[type] || type;
  }
  
  // ボーナスラベル取得
  private getBonusLabel(type: string, target?: string): string {
    const labels: { [key: string]: string } = {
      production_multiplier: '生産量倍率',
      conversion_efficiency: '変換効率',
      research_speed: '研究速度',
      celestial_limit: '天体上限',
      time_acceleration: '時間加速',
      dimension_access: '次元アクセス',
      reality_manipulation: '現実改変',
      cosmic_resonance: '宇宙共鳴',
      eternal_persistence: '永続性',
      multiverse_sync: 'マルチバース同期'
    };
    
    const label = labels[type] || type;
    return target ? `${target}の${label}` : label;
  }
  
  // ボーナス値のフォーマット
  private formatBonusValue(bonus: any): string {
    switch (bonus.type) {
      case 'production_multiplier':
      case 'research_speed':
      case 'time_acceleration':
        return `${((bonus.value - 1) * 100).toFixed(1)}%`;
        
      case 'conversion_efficiency':
      case 'multiverse_sync':
        return `${(bonus.value * 100).toFixed(1)}%`;
        
      case 'celestial_limit':
      case 'dimension_access':
        return bonus.value.toString();
        
      case 'eternal_persistence':
        return bonus.value > 0 ? '有効' : '無効';
        
      default:
        return bonus.value.toFixed(2);
    }
  }
  
  // ボーナスキーのフォーマット
  private formatBonusKey(key: string): string {
    return key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  // ボーナス表示値のフォーマット
  private formatBonusDisplay(value: number): string {
    if (value >= 100) {
      return `${value.toFixed(0)}%`;
    } else if (value >= 10) {
      return `${value.toFixed(1)}%`;
    } else if (value >= 1) {
      return `${((value - 1) * 100).toFixed(1)}%`;
    } else {
      return `${(value * 100).toFixed(1)}%`;
    }
  }
  
  // 神話級発見ハンドリング
  private handleMythicDiscovery(detail: any): void {
    // 発見エフェクト（将来実装）
    console.log('[MYTHIC-RARITY-UI] New mythic discovered:', detail);
    
    // UIを更新
    if (!this.container?.classList.contains('hidden')) {
      this.updateUI();
    }
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
  
  // メニューボタンを追加（メニューシステムに統合済みのため、使用しない）
  addMenuButton(): void {
    // メニューシステムに統合されたため、個別のボタンは作成しない
    // この関数は互換性のために残しておく
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

export const mythicRarityUI = MythicRarityUI.getInstance();