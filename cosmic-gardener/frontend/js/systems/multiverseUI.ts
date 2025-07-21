/**
 * Multiverse UI
 * 複数宇宙管理システムのUI実装
 */

import { multiverseSystem } from './multiverseSystem.js';
import { UniverseSlot, UniverseSummary } from '../types/multiverse.js';
import { formatLargeNumber } from '../types/infiniteResources.js';

export class MultiverseUI {
  private static instance: MultiverseUI;
  private container: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private updateInterval: number | null = null;
  
  private constructor() {
    console.log('[MULTIVERSE-UI] Initialized');
  }
  
  static getInstance(): MultiverseUI {
    if (!MultiverseUI.instance) {
      MultiverseUI.instance = new MultiverseUI();
    }
    return MultiverseUI.instance;
  }
  
  // UI初期化
  init(): void {
    if (this.isInitialized) return;
    
    this.createUI();
    this.attachEventListeners();
    this.startUpdateLoop();
    
    this.isInitialized = true;
    console.log('[MULTIVERSE-UI] UI initialized');
  }
  
  // UI作成
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'multiverse-ui';
    this.container.className = 'multiverse-container hidden';
    this.container.innerHTML = `
      <div class="multiverse-header">
        <h2>マルチバース管理</h2>
        <button class="close-button" id="multiverse-close">×</button>
      </div>
      
      <div class="multiverse-content">
        <!-- 現在の宇宙情報 -->
        <div class="current-universe-info">
          <h3>現在の宇宙</h3>
          <div id="current-universe-details">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <!-- 宇宙スロット一覧 -->
        <div class="universe-slots">
          <h3>宇宙スロット</h3>
          <div id="universe-slot-grid">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <!-- 宇宙作成ダイアログ -->
        <div class="create-universe-dialog hidden" id="create-universe-dialog">
          <h3>新しい宇宙を作成</h3>
          <input type="text" id="universe-name-input" placeholder="宇宙の名前を入力" maxlength="30">
          <div class="dialog-buttons">
            <button class="confirm-button" id="confirm-create-universe">作成</button>
            <button class="cancel-button" id="cancel-create-universe">キャンセル</button>
          </div>
        </div>
        
        <!-- 資源転送ダイアログ -->
        <div class="transfer-dialog hidden" id="transfer-dialog">
          <h3>宇宙間資源転送</h3>
          <div class="transfer-info">
            <div class="transfer-from">
              <label>送信元:</label>
              <span id="transfer-from-name">-</span>
            </div>
            <div class="transfer-to">
              <label>送信先:</label>
              <select id="transfer-to-select">
                <!-- 動的に生成 -->
              </select>
            </div>
          </div>
          
          <div class="transfer-resource">
            <label>資源:</label>
            <select id="transfer-resource-select">
              <!-- 動的に生成 -->
            </select>
          </div>
          
          <div class="transfer-amount">
            <label>量:</label>
            <input type="number" id="transfer-amount-input" min="1" value="1">
            <button class="amount-button" data-percent="25">25%</button>
            <button class="amount-button" data-percent="50">50%</button>
            <button class="amount-button" data-percent="100">MAX</button>
          </div>
          
          <div class="transfer-preview">
            <div class="preview-item">
              <span>転送量:</span>
              <span id="transfer-preview-amount">0</span>
            </div>
            <div class="preview-item">
              <span>手数料 (10%):</span>
              <span id="transfer-preview-fee">0</span>
            </div>
            <div class="preview-item">
              <span>実際の受取量:</span>
              <span id="transfer-preview-actual">0</span>
            </div>
          </div>
          
          <div class="transfer-cooldown">
            <span id="transfer-cooldown-text">転送可能</span>
          </div>
          
          <div class="dialog-buttons">
            <button class="confirm-button" id="confirm-transfer">転送</button>
            <button class="cancel-button" id="cancel-transfer">キャンセル</button>
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
      .multiverse-container {
        position: fixed;
        top: 50%; 
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1200px;
        max-width: 90vw;
        max-height: 90vh;
        background: linear-gradient(135deg, #000033 0%, #000066 100%);
        border: 3px solid #0066ff;
        border-radius: 15px;
        color: #fff;
        font-family: 'Orbitron', sans-serif;
        z-index: 2300;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(0, 102, 255, 0.5);
      }
      
      .multiverse-container.hidden {
        display: none;
      }
      
      .multiverse-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: rgba(0, 102, 255, 0.2);
        border-bottom: 2px solid #0066ff;
      }
      
      .multiverse-header h2 {
        margin: 0;
        font-size: 28px;
        color: #00ccff;
        text-shadow: 0 0 20px #00ccff;
      }
      
      .multiverse-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .current-universe-info {
        background: rgba(0, 102, 255, 0.1);
        border: 1px solid #0066ff;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
      }
      
      .current-universe-info h3 {
        margin-top: 0;
        color: #00ccff;
        text-shadow: 0 0 10px #00ccff;
      }
      
      .universe-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 15px;
      }
      
      .detail-item {
        background: rgba(0, 0, 0, 0.3);
        padding: 10px;
        border-radius: 5px;
        border: 1px solid rgba(0, 102, 255, 0.3);
      }
      
      .detail-label {
        font-size: 12px;
        color: #888;
        margin-bottom: 5px;
      }
      
      .detail-value {
        font-size: 18px;
        font-weight: bold;
        color: #00ccff;
      }
      
      .universe-slots h3 {
        color: #00ccff;
        text-shadow: 0 0 10px #00ccff;
        margin-bottom: 20px;
      }
      
      .universe-slot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
      
      .universe-slot {
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #0066ff;
        border-radius: 10px;
        padding: 20px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 200px;
        display: flex;
        flex-direction: column;
      }
      
      .universe-slot:hover:not(.locked) {
        background: rgba(0, 102, 255, 0.2);
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 102, 255, 0.5);
      }
      
      .universe-slot.active {
        border-color: #00ff00;
        background: rgba(0, 255, 0, 0.1);
      }
      
      .universe-slot.locked {
        opacity: 0.5;
        cursor: not-allowed;
        border-style: dashed;
      }
      
      .universe-slot.empty {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      }
      
      .slot-number {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 12px;
        color: #666;
      }
      
      .universe-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #00ccff;
      }
      
      .universe-stats {
        flex: 1;
        display: grid;
        gap: 8px;
        font-size: 14px;
      }
      
      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
      }
      
      .stat-label {
        color: #aaa;
      }
      
      .stat-value {
        color: #00ff88;
        font-weight: bold;
      }
      
      .universe-actions {
        margin-top: 15px;
        display: flex;
        gap: 10px;
      }
      
      .action-button {
        flex: 1;
        padding: 8px;
        background: rgba(0, 102, 255, 0.3);
        border: 1px solid #0066ff;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 12px;
      }
      
      .action-button:hover:not(:disabled) {
        background: rgba(0, 102, 255, 0.5);
      }
      
      .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .action-button.primary {
        background: rgba(0, 255, 0, 0.3);
        border-color: #00ff00;
      }
      
      .action-button.primary:hover:not(:disabled) {
        background: rgba(0, 255, 0, 0.5);
      }
      
      .action-button.danger {
        background: rgba(255, 0, 0, 0.3);
        border-color: #ff0000;
      }
      
      .action-button.danger:hover:not(:disabled) {
        background: rgba(255, 0, 0, 0.5);
      }
      
      .create-button {
        font-size: 48px;
        color: #0066ff;
        margin-bottom: 10px;
      }
      
      .create-text {
        font-size: 16px;
        color: #aaa;
      }
      
      .unlock-requirement {
        margin-top: 10px;
        font-size: 12px;
        color: #ff6600;
        text-align: center;
      }
      
      .create-universe-dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 30, 0.98);
        border: 2px solid #0066ff;
        border-radius: 10px;
        padding: 30px;
        min-width: 400px;
        box-shadow: 0 0 50px rgba(0, 102, 255, 0.8);
      }
      
      .create-universe-dialog h3 {
        margin-top: 0;
        color: #00ccff;
        text-align: center;
      }
      
      #universe-name-input {
        width: 100%;
        padding: 10px;
        margin: 20px 0;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #0066ff;
        border-radius: 5px;
        color: #fff;
        font-size: 16px;
      }
      
      .dialog-buttons {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      
      .confirm-button, .cancel-button {
        padding: 10px 20px;
        border: 1px solid #0066ff;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      }
      
      .confirm-button {
        background: rgba(0, 255, 0, 0.3);
        border-color: #00ff00;
        color: #00ff00;
      }
      
      .confirm-button:hover {
        background: rgba(0, 255, 0, 0.5);
      }
      
      .cancel-button {
        background: rgba(255, 0, 0, 0.3);
        border-color: #ff0000;
        color: #ff0000;
      }
      
      .cancel-button:hover {
        background: rgba(255, 0, 0, 0.5);
      }
      
      .universe-traits {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      
      .trait-badge {
        padding: 3px 8px;
        background: rgba(255, 102, 0, 0.3);
        border: 1px solid #ff6600;
        border-radius: 12px;
        font-size: 11px;
        color: #ff6600;
      }
      
      .transfer-button {
        margin-top: 10px;
        width: 100%;
        padding: 8px;
        background: rgba(255, 102, 0, 0.3);
        border: 1px solid #ff6600;
        border-radius: 5px;
        color: #ff6600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .transfer-button:hover:not(:disabled) {
        background: rgba(255, 102, 0, 0.5);
      }
      
      .transfer-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .transfer-dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 30, 0.98);
        border: 2px solid #ff6600;
        border-radius: 10px;
        padding: 30px;
        min-width: 500px;
        box-shadow: 0 0 50px rgba(255, 102, 0, 0.8);
        z-index: 2400;
      }
      
      .transfer-dialog h3 {
        margin-top: 0;
        color: #ff6600;
        text-align: center;
        text-shadow: 0 0 10px #ff6600;
      }
      
      .transfer-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin: 20px 0;
      }
      
      .transfer-from, .transfer-to {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .transfer-resource, .transfer-amount {
        margin: 20px 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .transfer-resource select,
      .transfer-to select,
      .transfer-amount input {
        flex: 1;
        padding: 8px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #ff6600;
        color: #fff;
        border-radius: 3px;
      }
      
      .amount-button {
        padding: 8px 12px;
        background: rgba(255, 102, 0, 0.3);
        border: 1px solid #ff6600;
        border-radius: 3px;
        color: #ff6600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .amount-button:hover {
        background: rgba(255, 102, 0, 0.5);
      }
      
      .transfer-preview {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 102, 0, 0.5);
        border-radius: 5px;
        padding: 15px;
        margin: 20px 0;
      }
      
      .preview-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
      }
      
      .preview-item span:last-child {
        color: #ff6600;
        font-weight: bold;
      }
      
      .transfer-cooldown {
        text-align: center;
        margin: 15px 0;
        font-size: 14px;
      }
      
      #transfer-cooldown-text {
        color: #00ff00;
      }
      
      #transfer-cooldown-text.on-cooldown {
        color: #ff0000;
      }
    `;
    document.head.appendChild(style);
  }
  
  // イベントリスナー設定
  private attachEventListeners(): void {
    // 閉じるボタン
    document.getElementById('multiverse-close')?.addEventListener('click', () => {
      this.close();
    });
    
    // 作成ダイアログのボタン
    document.getElementById('confirm-create-universe')?.addEventListener('click', () => {
      this.confirmCreateUniverse();
    });
    
    document.getElementById('cancel-create-universe')?.addEventListener('click', () => {
      this.hideCreateDialog();
    });
    
    // 宇宙イベント
    window.addEventListener('universeCreated', () => this.updateUI());
    window.addEventListener('universeSwitched', () => this.updateUI());
    window.addEventListener('resourceTransferred', () => this.updateUI());
    
    // 転送ダイアログのボタン
    document.getElementById('confirm-transfer')?.addEventListener('click', () => {
      this.confirmTransfer();
    });
    
    document.getElementById('cancel-transfer')?.addEventListener('click', () => {
      this.hideTransferDialog();
    });
    
    // 量ボタン
    document.querySelectorAll('.amount-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const percent = parseInt((e.target as HTMLElement).getAttribute('data-percent') || '0');
        this.setTransferAmountByPercent(percent);
      });
    });
    
    // 転送量入力の変更監視
    document.getElementById('transfer-amount-input')?.addEventListener('input', () => {
      this.updateTransferPreview();
    });
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
    
    this.updateCurrentUniverse();
    this.updateUniverseSlots();
  }
  
  // 現在の宇宙情報を更新
  private updateCurrentUniverse(): void {
    const container = document.getElementById('current-universe-details');
    if (!container) return;
    
    const activeUniverse = multiverseSystem.getActiveUniverse();
    if (!activeUniverse) {
      container.innerHTML = '<p>アクティブな宇宙がありません</p>';
      return;
    }
    
    const summary = multiverseSystem.getUniverseSummary(activeUniverse.id);
    if (!summary) return;
    
    const playTime = this.formatPlayTime(activeUniverse.playTime);
    
    container.innerHTML = `
      <div class="universe-details">
        <div class="detail-item">
          <div class="detail-label">宇宙名</div>
          <div class="detail-value">${activeUniverse.name}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">パラゴンレベル</div>
          <div class="detail-value">${summary.level}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">天体数</div>
          <div class="detail-value">${summary.celestialBodies}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">実績</div>
          <div class="detail-value">${summary.achievements}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">プレイ時間</div>
          <div class="detail-value">${playTime}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">総資源量</div>
          <div class="detail-value">${formatLargeNumber(summary.totalResources).formatted}</div>
        </div>
      </div>
      ${summary.traits.length > 0 ? `
        <div class="universe-traits">
          ${summary.traits.map(trait => `
            <span class="trait-badge">${trait}</span>
          `).join('')}
        </div>
      ` : ''}
      <button class="transfer-button" id="open-transfer-dialog">資源を転送</button>
    `;
    
    // 転送ボタンのイベント
    const transferButton = document.getElementById('open-transfer-dialog');
    if (transferButton) {
      transferButton.addEventListener('click', () => {
        this.showTransferDialog(activeUniverse.id);
      });
    }
  }
  
  // 宇宙スロット一覧を更新
  private updateUniverseSlots(): void {
    const container = document.getElementById('universe-slot-grid');
    if (!container) return;
    
    const slots = multiverseSystem.getUniverseSlots();
    const activeUniverseId = multiverseSystem.getActiveUniverse()?.id;
    
    container.className = 'universe-slot-grid';
    container.innerHTML = slots.map((slot, index) => {
      if (!slot.isUnlocked) {
        // ロックされたスロット
        return this.renderLockedSlot(slot, index);
      } else if (!slot.universe) {
        // 空のスロット
        return this.renderEmptySlot(index);
      } else {
        // 宇宙が存在するスロット
        return this.renderUniverseSlot(slot.universe, index, slot.universe.id === activeUniverseId);
      }
    }).join('');
    
    // スロットのクリックイベント
    container.querySelectorAll('.universe-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('action-button')) return;
        
        const slotElement = target.closest('.universe-slot') as HTMLElement;
        this.handleSlotClick(slotElement);
      });
    });
    
    // アクションボタンのイベント
    container.querySelectorAll('.action-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = button.getAttribute('data-action');
        const universeId = button.getAttribute('data-universe-id');
        
        if (action === 'switch' && universeId) {
          this.switchToUniverse(universeId);
        } else if (action === 'delete' && universeId) {
          this.deleteUniverse(universeId);
        }
      });
    });
  }
  
  // ロックされたスロットのレンダリング
  private renderLockedSlot(slot: UniverseSlot, index: number): string {
    const requirementText = this.getRequirementText(slot.unlockRequirement);
    
    return `
      <div class="universe-slot locked" data-slot="${index}">
        <span class="slot-number">#${index + 1}</span>
        <div class="create-button">🔒</div>
        <div class="create-text">スロットロック中</div>
        <div class="unlock-requirement">${requirementText}</div>
      </div>
    `;
  }
  
  // 空のスロットのレンダリング
  private renderEmptySlot(index: number): string {
    return `
      <div class="universe-slot empty" data-slot="${index}" data-action="create">
        <span class="slot-number">#${index + 1}</span>
        <div class="create-button">➕</div>
        <div class="create-text">新しい宇宙を作成</div>
      </div>
    `;
  }
  
  // 宇宙スロットのレンダリング
  private renderUniverseSlot(universe: any, index: number, isActive: boolean): string {
    const summary = multiverseSystem.getUniverseSummary(universe.id);
    if (!summary) return '';
    
    const lastPlayedText = this.getLastPlayedText(summary.lastPlayed);
    
    return `
      <div class="universe-slot ${isActive ? 'active' : ''}" data-slot="${index}" data-universe-id="${universe.id}">
        <span class="slot-number">#${index + 1}</span>
        <div class="universe-name">${universe.name}</div>
        <div class="universe-stats">
          <div class="stat-row">
            <span class="stat-label">レベル:</span>
            <span class="stat-value">${summary.level}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">天体:</span>
            <span class="stat-value">${summary.celestialBodies}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">実績:</span>
            <span class="stat-value">${summary.achievements}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">最終プレイ:</span>
            <span class="stat-value">${lastPlayedText}</span>
          </div>
        </div>
        <div class="universe-actions">
          ${isActive ? `
            <button class="action-button primary" disabled>プレイ中</button>
          ` : `
            <button class="action-button primary" data-action="switch" data-universe-id="${universe.id}">
              切り替え
            </button>
            <button class="action-button danger" data-action="delete" data-universe-id="${universe.id}">
              削除
            </button>
          `}
        </div>
      </div>
    `;
  }
  
  // スロットクリックハンドリング
  private handleSlotClick(slotElement: HTMLElement): void {
    const action = slotElement.getAttribute('data-action');
    
    if (action === 'create') {
      this.showCreateDialog();
    }
  }
  
  // 宇宙作成ダイアログ表示
  private showCreateDialog(): void {
    const dialog = document.getElementById('create-universe-dialog');
    const input = document.getElementById('universe-name-input') as HTMLInputElement;
    if (dialog && input) {
      dialog.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  }
  
  // 宇宙作成ダイアログ非表示
  private hideCreateDialog(): void {
    const dialog = document.getElementById('create-universe-dialog');
    if (dialog) {
      dialog.classList.add('hidden');
    }
  }
  
  // 宇宙作成確認
  private confirmCreateUniverse(): void {
    const input = document.getElementById('universe-name-input') as HTMLInputElement;
    const name = input.value.trim();
    
    if (!name) {
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast('宇宙の名前を入力してください', 'warning');
      }
      return;
    }
    
    const universe = multiverseSystem.createUniverse({ name });
    if (universe) {
      this.hideCreateDialog();
      this.updateUI();
      
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast(`新しい宇宙「${name}」を作成しました！`, 'success');
      }
    }
  }
  
  // 宇宙に切り替え
  private switchToUniverse(universeId: string): void {
    const success = multiverseSystem.switchUniverse(universeId);
    if (success) {
      // ページをリロードして新しい宇宙を読み込む
      location.reload();
    }
  }
  
  // 宇宙を削除
  private deleteUniverse(universeId: string): void {
    if (confirm('この宇宙を削除してもよろしいですか？この操作は取り消せません。')) {
      const success = multiverseSystem.deleteUniverse(universeId);
      if (success) {
        this.updateUI();
        
        const feedbackSystem = (window as any).feedbackSystem;
        if (feedbackSystem) {
          feedbackSystem.showToast('宇宙を削除しました', 'success');
        }
      }
    }
  }
  
  // 要件テキスト取得
  private getRequirementText(requirement: any): string {
    if (!requirement) return '';
    
    if (requirement.type === 'paragon_level') {
      return `パラゴンレベル ${requirement.value} 必要`;
    } else if (requirement.type === 'achievement') {
      return `実績「${requirement.value}」必要`;
    }
    
    return '条件不明';
  }
  
  // プレイ時間のフォーマット
  private formatPlayTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}日 ${hours % 24}時間`;
    } else if (hours > 0) {
      return `${hours}時間 ${minutes % 60}分`;
    } else {
      return `${minutes}分`;
    }
  }
  
  // 最終プレイ時間のテキスト
  private getLastPlayedText(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (diff < 60000) {
      return '今';
    } else if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else {
      return `${days}日前`;
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
  
  // 転送ダイアログ表示
  private showTransferDialog(fromUniverseId: string): void {
    const dialog = document.getElementById('transfer-dialog');
    if (!dialog) return;
    
    // 送信元宇宙の情報を設定
    const fromUniverse = multiverseSystem.getData().universes.find(u => u.id === fromUniverseId);
    if (!fromUniverse) return;
    
    const fromNameElement = document.getElementById('transfer-from-name');
    if (fromNameElement) {
      fromNameElement.textContent = fromUniverse.name;
    }
    
    // 送信先の選択肢を設定
    const toSelect = document.getElementById('transfer-to-select') as HTMLSelectElement;
    if (toSelect) {
      const universes = multiverseSystem.getData().universes.filter(u => u.id !== fromUniverseId);
      toSelect.innerHTML = universes.map(u => 
        `<option value="${u.id}">${u.name}</option>`
      ).join('');
    }
    
    // 転送可能な資源を設定
    const resourceSelect = document.getElementById('transfer-resource-select') as HTMLSelectElement;
    if (resourceSelect) {
      const resources = multiverseSystem.getTransferableResources(fromUniverseId);
      resourceSelect.innerHTML = resources.map(r => 
        `<option value="${r.type}" data-amount="${r.amount}">${r.displayName} (${formatLargeNumber(r.amount).formatted})</option>`
      ).join('');
    }
    
    // ダイアログデータを設定
    dialog.setAttribute('data-from-universe', fromUniverseId);
    
    // 初期プレビューを更新
    this.updateTransferPreview();
    this.updateTransferCooldown();
    
    dialog.classList.remove('hidden');
  }
  
  // 転送ダイアログ非表示
  private hideTransferDialog(): void {
    const dialog = document.getElementById('transfer-dialog');
    if (dialog) {
      dialog.classList.add('hidden');
    }
  }
  
  // 転送プレビュー更新
  private updateTransferPreview(): void {
    const amountInput = document.getElementById('transfer-amount-input') as HTMLInputElement;
    const amount = parseInt(amountInput?.value || '0');
    
    const fee = Math.floor(amount * 0.1);
    const actual = amount - fee;
    
    const amountElement = document.getElementById('transfer-preview-amount');
    const feeElement = document.getElementById('transfer-preview-fee');
    const actualElement = document.getElementById('transfer-preview-actual');
    
    if (amountElement) amountElement.textContent = formatLargeNumber(amount).formatted;
    if (feeElement) feeElement.textContent = formatLargeNumber(fee).formatted;
    if (actualElement) actualElement.textContent = formatLargeNumber(actual).formatted;
  }
  
  // パーセンテージで転送量を設定
  private setTransferAmountByPercent(percent: number): void {
    const resourceSelect = document.getElementById('transfer-resource-select') as HTMLSelectElement;
    const selectedOption = resourceSelect?.options[resourceSelect.selectedIndex];
    
    if (!selectedOption) return;
    
    const maxAmount = parseInt(selectedOption.getAttribute('data-amount') || '0');
    const amount = Math.floor(maxAmount * (percent / 100));
    
    const amountInput = document.getElementById('transfer-amount-input') as HTMLInputElement;
    if (amountInput) {
      amountInput.value = amount.toString();
      amountInput.max = maxAmount.toString();
      this.updateTransferPreview();
    }
  }
  
  // 転送クールダウン更新
  private updateTransferCooldown(): void {
    const cooldownRemaining = multiverseSystem.getTransferCooldownRemaining();
    const cooldownText = document.getElementById('transfer-cooldown-text');
    const confirmButton = document.getElementById('confirm-transfer') as HTMLButtonElement;
    
    if (!cooldownText || !confirmButton) return;
    
    if (cooldownRemaining > 0) {
      const minutes = Math.floor(cooldownRemaining / 60000);
      const seconds = Math.floor((cooldownRemaining % 60000) / 1000);
      cooldownText.textContent = `クールダウン中: ${minutes}分${seconds}秒`;
      cooldownText.classList.add('on-cooldown');
      confirmButton.disabled = true;
    } else {
      cooldownText.textContent = '転送可能';
      cooldownText.classList.remove('on-cooldown');
      confirmButton.disabled = false;
    }
  }
  
  // 転送確認
  private confirmTransfer(): void {
    const dialog = document.getElementById('transfer-dialog');
    if (!dialog) return;
    
    const fromUniverseId = dialog.getAttribute('data-from-universe');
    const toSelect = document.getElementById('transfer-to-select') as HTMLSelectElement;
    const resourceSelect = document.getElementById('transfer-resource-select') as HTMLSelectElement;
    const amountInput = document.getElementById('transfer-amount-input') as HTMLInputElement;
    
    if (!fromUniverseId || !toSelect || !resourceSelect || !amountInput) return;
    
    const toUniverseId = toSelect.value;
    const resourceType = resourceSelect.value;
    const amount = parseInt(amountInput.value || '0');
    
    if (amount <= 0) {
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast('転送量を入力してください', 'warning');
      }
      return;
    }
    
    const success = multiverseSystem.transferResources(
      fromUniverseId,
      toUniverseId,
      resourceType,
      amount
    );
    
    if (success) {
      this.hideTransferDialog();
      
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast('資源を転送しました！', 'success');
      }
    } else {
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast('転送に失敗しました', 'error');
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

export const multiverseUI = MultiverseUI.getInstance();