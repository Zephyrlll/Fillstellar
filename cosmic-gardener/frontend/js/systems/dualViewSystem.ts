// デュアルビューシステム

import * as THREE from 'three';
import { TabManager } from './tabManager.js';
import { graphicsEngine } from '../graphicsEngine.js';
import { gameStateManager } from '../state.js';
import { showMessage, updateUI } from '../ui.js';
import { soundManager } from '../sound.js';
import { celestialCreationUI } from './celestialCreationUI.js';
import { starManagementUI } from './starManagementUI.js';
import { initializeRadarUI, radarUI } from './radarUI.js';

export interface ViewConfig {
  primaryView: string;
  secondaryView: string;
  layoutRatio: '70-30' | '50-50' | '30-70';
  isDualView: boolean;
}

export class DualViewSystem {
  private container: HTMLElement;
  private primaryView: HTMLElement;
  private secondaryView: HTMLElement;
  private tabManager: TabManager;
  private config: ViewConfig;
  private miniRenderer: THREE.WebGLRenderer | null = null;
  private miniCamera: THREE.PerspectiveCamera | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    console.log('[DUAL_VIEW] DualViewSystem constructor called');
    const container = document.getElementById('dual-view-container');
    const primaryView = document.getElementById('primary-view');
    const secondaryView = document.getElementById('secondary-view');
    
    if (!container || !primaryView || !secondaryView) {
      console.error('[DUAL_VIEW] Missing elements:', { container: !!container, primaryView: !!primaryView, secondaryView: !!secondaryView });
      throw new Error('[DUAL_VIEW] Required DOM elements not found');
    }
    
    this.container = container;
    this.primaryView = primaryView;
    this.secondaryView = secondaryView;
    
    // デフォルト設定
    this.config = {
      primaryView: 'space',
      secondaryView: 'space',
      layoutRatio: '70-30',
      isDualView: false
    };
    
    // タブマネージャーの初期化
    console.log('[DUAL_VIEW] Initializing TabManager');
    this.tabManager = new TabManager('dual-view-tabs', 'primary-view');
    
    console.log('[DUAL_VIEW] Setting up event listeners');
    this.initializeEventListeners();
    
    console.log('[DUAL_VIEW] Registering default tabs');
    this.registerDefaultTabs();
    
    console.log('[DUAL_VIEW] Initializing Radar UI');
    const radarInstance = initializeRadarUI();
    // Expose to window for the main update loop
    (window as any).radarUI = radarUI;
  }

  private initializeEventListeners(): void {
    // デュアルビュー切り替えボタン
    const toggleBtn = document.getElementById('toggle-dual-view');
    toggleBtn?.addEventListener('click', () => this.toggleDualView());
    
    // ビュー入れ替えボタン
    const swapBtn = document.getElementById('swap-views');
    swapBtn?.addEventListener('click', () => this.swapViews());
    
    // レイアウト比率セレクター
    const ratioSelect = document.getElementById('layout-ratio') as HTMLSelectElement;
    ratioSelect?.addEventListener('change', (e) => {
      this.setLayoutRatio((e.target as HTMLSelectElement).value as ViewConfig['layoutRatio']);
    });
    
    // タブ変更イベント
    this.tabManager.on('tab-changed', (tabId) => {
      this.onTabChanged(tabId);
    });
    
    // ウィンドウリサイズ
    window.addEventListener('resize', () => this.handleResize());
  }

  private registerDefaultTabs(): void {
    // 宇宙タブ
    this.tabManager.registerTab({
      id: 'space',
      label: '宇宙',
      icon: '🌌',
      contentId: 'primary-view-space',
      onActivate: () => {
        console.log('[DUAL_VIEW] Space tab activated');
        this.resumeMainRenderer();
        // 天体創造UIを表示
        const celestialScroll = document.getElementById('celestial-creation-scroll');
        if (celestialScroll) {
          celestialScroll.style.display = 'flex';
        }
        // 恒星管理UIを表示
        starManagementUI.setVisible(true);
      },
      onDeactivate: () => {
        console.log('[DUAL_VIEW] Space tab deactivated');
        this.pauseMainRenderer();
        // 天体創造UIを非表示
        const celestialScroll = document.getElementById('celestial-creation-scroll');
        if (celestialScroll) {
          celestialScroll.style.display = 'none';
        }
        // 恒星管理UIを非表示
        starManagementUI.setVisible(false);
      }
    });
    
    // 生産タブ
    this.tabManager.registerTab({
      id: 'production',
      label: '生産システム',
      icon: '🏭',
      contentId: 'primary-view-production',
      onActivate: () => {
        console.log('[DUAL_VIEW] Production tab activated');
        this.loadProductionView();
      }
    });
    
    // 研究タブ
    this.tabManager.registerTab({
      id: 'research',
      label: '研究ツリー',
      icon: '🔬',
      contentId: 'primary-view-research',
      onActivate: () => {
        console.log('[DUAL_VIEW] Research tab clicked and activated');
        this.loadResearchView().then(() => {
          console.log('[DUAL_VIEW] Research view loaded successfully');
        }).catch(error => {
          console.error('[DUAL_VIEW] Failed to load research view:', error);
        });
      }
    });
    
    // 初期タブをアクティブ化
    this.tabManager.activateTab('space');
  }

  /**
   * デュアルビューの切り替え
   */
  public toggleDualView(): void {
    this.config.isDualView = !this.config.isDualView;
    
    if (this.config.isDualView) {
      this.enableDualView();
    } else {
      this.disableDualView();
    }
    
    console.log('[DUAL_VIEW] Toggled dual view:', this.config.isDualView);
  }

  /**
   * デュアルビューを有効化
   */
  private enableDualView(): void {
    this.container.classList.remove('dual-view-inactive');
    this.container.classList.add('dual-view-active');
    
    // コントロールを表示
    const swapBtn = document.getElementById('swap-views');
    const layoutSelector = document.querySelector('.layout-selector') as HTMLElement;
    if (swapBtn) swapBtn.style.display = '';
    if (layoutSelector) layoutSelector.style.display = '';
    
    // セカンダリビューを表示
    this.secondaryView.style.display = '';
    
    // レイアウト比率を適用
    this.applyLayoutRatio();
    
    // ミニマップの初期化
    this.initializeMiniView();
    
    // リサイズ処理
    this.handleResize();
  }

  /**
   * デュアルビューを無効化
   */
  private disableDualView(): void {
    this.container.classList.remove('dual-view-active');
    this.container.classList.add('dual-view-inactive');
    
    // コントロールを非表示
    const swapBtn = document.getElementById('swap-views');
    const layoutSelector = document.querySelector('.layout-selector') as HTMLElement;
    if (swapBtn) swapBtn.style.display = 'none';
    if (layoutSelector) layoutSelector.style.display = 'none';
    
    // セカンダリビューを非表示
    this.secondaryView.style.display = 'none';
    
    // ミニマップの破棄
    this.disposeMiniView();
    
    // リサイズ処理
    this.handleResize();
  }

  /**
   * ビューの入れ替え
   */
  private swapViews(): void {
    // アニメーション用のクラスを追加
    this.container.classList.add('swapping');
    
    // 現在のビューコンテンツを取得
    const primaryContent = this.primaryView.innerHTML;
    const secondaryContent = this.secondaryView.innerHTML;
    
    // フェードアウト
    this.primaryView.style.opacity = '0';
    this.secondaryView.style.opacity = '0';
    
    // アニメーション後にコンテンツを入れ替え
    setTimeout(() => {
      // コンテンツを入れ替え
      this.primaryView.innerHTML = secondaryContent;
      this.secondaryView.innerHTML = primaryContent;
      
      // タブのアクティブ状態も入れ替え
      const primaryActiveTab = this.primaryView.querySelector('.tab-active');
      const secondaryActiveTab = this.secondaryView.querySelector('.tab-active');
      
      if (primaryActiveTab && secondaryActiveTab) {
        const primaryTabId = primaryActiveTab.id;
        const secondaryTabId = secondaryActiveTab.id;
        
        // タブマネージャーの状態を更新
        this.updateTabStates(primaryTabId, secondaryTabId);
      }
      
      // キャンバスの再初期化
      this.reinitializeCanvases();
      
      // フェードイン
      this.primaryView.style.opacity = '1';
      this.secondaryView.style.opacity = '1';
      
      // アニメーション完了後にクラスを削除
      setTimeout(() => {
        this.container.classList.remove('swapping');
      }, 300);
      
      console.log('[DUAL_VIEW] Views swapped successfully');
    }, 300);
  }
  
  /**
   * タブ状態の更新
   */
  private updateTabStates(primaryTabId: string, secondaryTabId: string): void {
    // プライマリビューのタブを更新
    const primaryTabs = this.primaryView.querySelectorAll('.tab');
    primaryTabs.forEach(tab => {
      if (tab.id === secondaryTabId.replace('secondary-', '')) {
        tab.classList.add('tab-active');
      } else {
        tab.classList.remove('tab-active');
      }
    });
    
    // セカンダリビューのタブを更新
    const secondaryTabs = this.secondaryView.querySelectorAll('.tab');
    secondaryTabs.forEach(tab => {
      if (tab.id === 'secondary-' + primaryTabId) {
        tab.classList.add('tab-active');
      } else {
        tab.classList.remove('tab-active');
      }
    });
  }
  
  /**
   * キャンバスの再初期化
   */
  private reinitializeCanvases(): void {
    // メインゲームキャンバスの確認
    const mainCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const miniCanvas = document.getElementById('mini-game-canvas') as HTMLCanvasElement;
    
    if (mainCanvas && miniCanvas) {
      // メインキャンバスがセカンダリビューに移動した場合
      if (this.secondaryView.contains(mainCanvas)) {
        // ミニビューを破棄
        this.disposeMiniView();
        // メインレンダラーのサイズを調整
        if ((window as any).renderer) {
          const rect = mainCanvas.getBoundingClientRect();
          (window as any).renderer.setSize(rect.width, rect.height);
        }
      } else {
        // メインキャンバスがプライマリビューにある場合
        // ミニビューを再初期化
        this.initializeMiniView();
      }
    }
    
    // イベントの再バインド
    this.rebindEvents();
  }
  
  /**
   * イベントの再バインド
   */
  private rebindEvents(): void {
    // タブクリックイベントの再設定
    setupEventListeners();
    
    // その他のUIイベントも再設定
    const event = new CustomEvent('dualViewSwapped');
    window.dispatchEvent(event);
  }

  /**
   * レイアウト比率の設定
   */
  private setLayoutRatio(ratio: ViewConfig['layoutRatio']): void {
    this.config.layoutRatio = ratio;
    this.applyLayoutRatio();
    this.handleResize();
  }

  /**
   * レイアウト比率の適用
   */
  private applyLayoutRatio(): void {
    // 既存のratioクラスを削除
    this.container.classList.remove('ratio-70-30', 'ratio-50-50', 'ratio-30-70');
    
    // 新しいratioクラスを追加
    this.container.classList.add(`ratio-${this.config.layoutRatio}`);
  }

  /**
   * ミニビューの初期化
   */
  private initializeMiniView(): void {
    const miniCanvas = document.getElementById('mini-game-canvas') as HTMLCanvasElement;
    if (!miniCanvas) return;
    
    try {
      // ミニレンダラーの作成
      this.miniRenderer = new THREE.WebGLRenderer({
        canvas: miniCanvas,
        antialias: false,
        alpha: true
      });
      
      // カメラのクローン
      const mainCamera = graphicsEngine.getCamera();
      if (mainCamera) {
        this.miniCamera = mainCamera.clone() as THREE.PerspectiveCamera;
      }
      
      // レンダリングループの開始
      this.startMiniViewLoop();
      
      console.log('[DUAL_VIEW] Mini view initialized');
    } catch (error) {
      console.error('[DUAL_VIEW] Failed to initialize mini view:', error);
    }
  }

  /**
   * ミニビューの破棄
   */
  private disposeMiniView(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.miniRenderer) {
      this.miniRenderer.dispose();
      this.miniRenderer = null;
    }
    
    this.miniCamera = null;
    
    console.log('[DUAL_VIEW] Mini view disposed');
  }

  /**
   * ミニビューのレンダリングループ
   */
  private startMiniViewLoop(): void {
    const render = () => {
      if (!this.config.isDualView || !this.miniRenderer || !this.miniCamera) return;
      
      // シーンとカメラの同期
      const scene = graphicsEngine.getScene();
      const mainCamera = graphicsEngine.getCamera();
      
      if (scene && mainCamera) {
        // カメラ位置の同期
        this.miniCamera.position.copy(mainCamera.position);
        this.miniCamera.rotation.copy(mainCamera.rotation);
        
        // レンダリング
        this.miniRenderer.render(scene, this.miniCamera);
      }
      
      this.animationFrameId = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * タブ変更時の処理
   */
  private onTabChanged(tabId: string): void {
    this.config.primaryView = tabId;
    
    // デュアルビュー時の処理
    if (this.config.isDualView) {
      // 宇宙タブ以外が選択された場合、セカンダリビューを宇宙ビューに
      if (tabId !== 'space') {
        this.config.secondaryView = 'space';
      }
    }
  }

  /**
   * リサイズ処理
   */
  private handleResize(): void {
    // メインレンダラーのリサイズ
    const activeTab = this.tabManager.getActiveTab();
    if (activeTab === 'space') {
      graphicsEngine.handleResize();
    }
    
    // ミニレンダラーのリサイズ
    if (this.miniRenderer && this.config.isDualView) {
      const miniCanvas = document.getElementById('mini-game-canvas') as HTMLCanvasElement;
      if (miniCanvas) {
        const rect = miniCanvas.getBoundingClientRect();
        this.miniRenderer.setSize(rect.width, rect.height);
        
        if (this.miniCamera) {
          this.miniCamera.aspect = rect.width / rect.height;
          this.miniCamera.updateProjectionMatrix();
        }
      }
    }
  }

  /**
   * 生産ビューの読み込み
   */
  private async loadProductionView(): Promise<void> {
    // 生産システムのコンテンツを設定
    const productionContent = document.getElementById('primary-view-production');
    if (!productionContent) return;
    
    try {
      // サブタブ付きのコンテナ構造を作成
      productionContent.innerHTML = `
        <div class="production-view-container">
          <!-- サブタブナビゲーション -->
          <div class="production-subtabs">
            <button class="production-subtab active" data-subtab="management">
              <span class="subtab-icon">🏭</span>
              <span class="subtab-label">生産管理</span>
            </button>
            <button class="production-subtab" data-subtab="visualization">
              <span class="subtab-icon">📊</span>
              <span class="subtab-label">チェーン可視化</span>
            </button>
          </div>
          
          <!-- サブタブコンテンツ -->
          <div class="production-subtab-content">
            <div id="production-management-content" class="subtab-panel active">
              <!-- 元の生産パネルの内容がここに入る -->
            </div>
            <div id="production-visualization-content" class="subtab-panel">
              <!-- 生産チェーンビジュアライザーがここに入る -->
            </div>
          </div>
        </div>
      `;
      
      // サブタブのイベントリスナーを設定
      this.setupProductionSubtabs(productionContent);
      
      // 初期表示として生産管理を読み込む
      await this.loadProductionManagement();
      
      console.log('[DUAL_VIEW] Production view with subtabs loaded');
    } catch (error) {
      console.error('[DUAL_VIEW] Failed to load production view:', error);
      productionContent.innerHTML = '<div style="padding: 20px; color: #ff4444;">生産システムの読み込みに失敗しました</div>';
    }
  }
  
  /**
   * 生産サブタブのイベントリスナーを設定
   */
  private setupProductionSubtabs(container: HTMLElement): void {
    const subtabs = container.querySelectorAll('.production-subtab');
    const panels = container.querySelectorAll('.subtab-panel');
    
    subtabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        const targetSubtab = tab.getAttribute('data-subtab');
        
        // アクティブ状態を更新
        subtabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        
        // 対応するパネルを表示
        if (targetSubtab === 'management') {
          document.getElementById('production-management-content')?.classList.add('active');
          await this.loadProductionManagement();
        } else if (targetSubtab === 'visualization') {
          document.getElementById('production-visualization-content')?.classList.add('active');
          await this.loadProductionVisualization();
        }
      });
    });
  }
  
  /**
   * 生産管理（元の生産パネル）を読み込む
   */
  private async loadProductionManagement(): Promise<void> {
    const managementContent = document.getElementById('production-management-content');
    if (!managementContent) return;
    
    try {
      // 動的インポート
      const { initializeProductionInContainer } = await import('../productionUI.js');
      
      // コンテナに初期化
      await initializeProductionInContainer(managementContent);
      
      console.log('[DUAL_VIEW] Production management loaded');
    } catch (error) {
      console.error('[DUAL_VIEW] Failed to load production management:', error);
      managementContent.innerHTML = '<div style="padding: 20px; color: #ff4444;">生産管理の読み込みに失敗しました</div>';
    }
  }
  
  /**
   * 生産チェーン可視化を読み込む
   */
  private async loadProductionVisualization(): Promise<void> {
    const visualizationContent = document.getElementById('production-visualization-content');
    if (!visualizationContent) return;
    
    try {
      // 動的インポート
      const { productionChainVisualizerUI } = await import('../systems/productionChainVisualizerUI.js');
      
      // 埋め込みモードを設定
      (productionChainVisualizerUI as any).isEmbedded = true;
      
      // コンテナに初期化
      productionChainVisualizerUI.initializeInContainer(visualizationContent);
      
      console.log('[DUAL_VIEW] Production visualization loaded');
    } catch (error) {
      console.error('[DUAL_VIEW] Failed to load production visualization:', error);
      visualizationContent.innerHTML = '<div style="padding: 20px; color: #ff4444;">チェーン可視化の読み込みに失敗しました</div>';
    }
  }

  /**
   * 研究ビューの読み込み
   */
  private async loadResearchView(): Promise<void> {
    console.log('[DUAL_VIEW] loadResearchView called');
    
    // 研究ツリービジュアライザーのコンテンツを移動
    const researchContent = document.getElementById('primary-view-research');
    console.log('[DUAL_VIEW] Research content element:', researchContent);
    
    if (!researchContent) {
      console.error('[DUAL_VIEW] Research content element not found');
      return;
    }
    
    // ビューモードを確認（デフォルトはツリービュー）
    const useTreeView = this.getResearchViewMode();
    
    if (useTreeView) {
      try {
        console.log('[DUAL_VIEW] Attempting to load research tree visualizer');
        // 動的インポート
        const { researchTreeVisualizerUI } = await import('../systems/researchTreeVisualizerUI.js');
        console.log('[DUAL_VIEW] Import successful, visualizer:', researchTreeVisualizerUI);
        
        // コンテナに初期化
        await this.initializeResearchTreeInContainer(researchTreeVisualizerUI, researchContent);
        
        console.log('[DUAL_VIEW] Research tree visualizer loaded in tab');
      } catch (error) {
        console.error('[DUAL_VIEW] Failed to load research visualizer:', error);
        console.log('[DUAL_VIEW] Falling back to simple research list');
        this.showSimpleResearchList(researchContent);
      }
    } else {
      console.log('[DUAL_VIEW] Loading simple research list view');
      this.showSimpleResearchList(researchContent);
    }
  }
  
  /**
   * 研究ツリービジュアライザーをコンテナに初期化
   */
  private async initializeResearchTreeInContainer(visualizer: any, container: HTMLElement): Promise<void> {
    console.log('[DUAL_VIEW] Initializing research tree in container');
    
    // ビジュアライザーが利用可能な場合は初期化
    if (visualizer && typeof visualizer.initializeInContainer === 'function') {
      try {
        // コンテナを一旦クリア
        container.innerHTML = '';
        
        // ビジュアライザーを直接初期化（ビジュアライザーが独自のUIを作成）
        visualizer.initializeInContainer(container);
        
        // 切り替えボタンを追加（ビジュアライザーのツールバーに統合）
        setTimeout(() => {
          const toolbar = container.querySelector('.tree-toolbar');
          if (toolbar) {
            const switchButton = document.createElement('button');
            switchButton.textContent = '📋 リストビュー';
            switchButton.style.cssText = 'background: #22c55e; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-family: "Orbitron", sans-serif; margin-left: 10px;';
            switchButton.onclick = () => window.dualViewSystem.toggleResearchViewMode();
            toolbar.appendChild(switchButton);
          }
        }, 100);
        
        console.log('[DUAL_VIEW] Research tree visualizer initialized successfully');
      } catch (error) {
        console.error('[DUAL_VIEW] Error initializing research tree visualizer:', error);
        this.showSimpleResearchList(container);
      }
    } else {
      console.warn('[DUAL_VIEW] Research tree visualizer not available, showing simple list');
      this.showSimpleResearchList(container);
    }
  }
  
  /**
   * シンプルな研究リストを表示（フォールバック）
   */
  private showSimpleResearchList(container: HTMLElement): void {
    console.log('[DUAL_VIEW] Showing simple research list');
    
    // allResearchItemsを動的インポート
    import('../researchData.js').then(({ allResearchItems, researchCategories }) => {
      let html = `
        <div class="research-tree-wrapper" style="width: 100%; height: 100%; padding: 20px; overflow: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #64ffda; margin: 0;">研究ツリー（リスト表示）</h2>
            <button onclick="window.dualViewSystem.toggleResearchViewMode();" style="background: #8b5cf6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-family: 'Orbitron', sans-serif;">
              🌳 ツリービューに切り替え
            </button>
          </div>
      `;
      
      // カテゴリごとに研究を表示
      researchCategories.forEach(category => {
        const categoryItems = allResearchItems.filter(item => item.category === category.id);
        if (categoryItems.length === 0) return;
        
        html += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #fbbf24; margin-bottom: 15px;">${category.icon} ${category.name}</h3>
            <div style="display: grid; gap: 10px;">
        `;
        
        categoryItems.forEach(item => {
          const isCompleted = this.isResearchCompleted(item.id);
          const canAfford = this.canAffordResearch(item.cost);
          
          html += `
            <div style="background: rgba(100, 255, 218, 0.1); border: 1px solid rgba(100, 255, 218, 0.3); padding: 10px; border-radius: 4px; ${isCompleted ? 'opacity: 0.6;' : ''} position: relative;">
              ${isCompleted ? '<div style="position: absolute; top: 5px; right: 5px; color: #10b981; font-size: 20px;">✓</div>' : ''}
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${item.icon || '🔬'}</span>
                <div style="flex: 1;">
                  <h4 style="color: ${isCompleted ? '#10b981' : '#64ffda'}; margin: 0;">
                    ${item.name} ${isCompleted ? '（完了）' : ''}
                  </h4>
                  <p style="color: #ccc; margin: 5px 0; font-size: 14px;">${item.description}</p>
                  <div style="color: #fbbf24; font-size: 12px;">
                    コスト: ${this.formatResearchCost(item.cost)}
                  </div>
                </div>
                <button 
                  class="research-tree-button"
                  data-research-id="${item.id}"
                  style="
                    background: ${isCompleted ? '#4a5568' : (canAfford ? '#10b981' : '#ef4444')};
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: ${isCompleted || !canAfford ? 'not-allowed' : 'pointer'};
                    font-family: 'Orbitron', sans-serif;
                    font-size: 12px;
                    transition: all 0.3s ease;
                  "
                  ${isCompleted || !canAfford ? 'disabled' : ''}
                >
                  ${isCompleted ? '✓ 研究完了' : (canAfford ? '研究開始' : '資源不足')}
                </button>
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
      
      // イベントリスナーを追加
      const researchButtons = container.querySelectorAll('.research-tree-button');
      console.log('[DUAL_VIEW] Found research buttons:', researchButtons.length);
      
      researchButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[DUAL_VIEW] Button clicked event fired');
          
          const target = e.currentTarget as HTMLButtonElement;
          const researchId = target.dataset.researchId;
          console.log('[DUAL_VIEW] Research ID:', researchId, 'Disabled:', target.disabled);
          
          if (researchId && !target.disabled) {
            console.log('[DUAL_VIEW] Calling researchItem with ID:', researchId);
            try {
              this.researchItem(researchId);
            } catch (error) {
              console.error('[DUAL_VIEW] Error in researchItem:', error);
            }
          }
        });
      });
    }).catch(error => {
      console.error('[DUAL_VIEW] Failed to load research data:', error);
      container.innerHTML = '<div style="padding: 20px; color: #ff4444;">研究データの読み込みに失敗しました</div>';
    });
  }
  
  /**
   * 研究コストをフォーマット
   */
  private formatResearchCost(cost: any): string {
    const parts: string[] = [];
    if (cost.darkMatter) parts.push(`${cost.darkMatter} DM`);
    if (cost.thoughtPoints) parts.push(`${cost.thoughtPoints} TP`);
    if (cost.energy) parts.push(`${cost.energy} E`);
    if (cost.cosmicDust) parts.push(`${cost.cosmicDust} 塵`);
    return parts.join(', ') || '無料';
  }
  
  /**
   * 研究が完了しているかチェック
   */
  private isResearchCompleted(researchId: string): boolean {
    const state = gameStateManager.getState();
    const completedResearch = state.research?.completedResearch || [];
    return completedResearch.includes(researchId);
  }
  
  /**
   * 研究コストが支払えるかチェック
   */
  private canAffordResearch(cost: any): boolean {
    const state = gameStateManager.getState();
    const resources = state.resources;
    
    if (cost.darkMatter && resources.darkMatter < cost.darkMatter) return false;
    if (cost.thoughtPoints && resources.thoughtPoints < cost.thoughtPoints) return false;
    if (cost.energy && resources.energy < cost.energy) return false;
    if (cost.cosmicDust && resources.cosmicDust < cost.cosmicDust) return false;
    
    return true;
  }
  
  /**
   * 研究を実行
   */
  public async researchItem(researchId: string): Promise<void> {
    console.log('[DUAL_VIEW] Research item clicked:', researchId);
    
    try {
      // 研究データを取得
      const { allResearchItems } = await import('../researchData.js');
      const researchItem = allResearchItems.find(item => item.id === researchId);
      
      if (!researchItem) {
        console.error('[DUAL_VIEW] Research item not found:', researchId);
        return;
      }
      
      // すでに研究済みかチェック
      if (this.isResearchCompleted(researchId)) {
        console.log('[DUAL_VIEW] Research already completed:', researchId);
        return;
      }
      
      // コストが支払えるかチェック
      if (!this.canAffordResearch(researchItem.cost)) {
        console.log('[DUAL_VIEW] Cannot afford research:', researchId);
        showMessage('資源が不足しています', 'error');
        return;
      }
      
      // 研究を直接実行
      console.log('[DUAL_VIEW] Starting research directly');
      this.completeResearch(researchItem);
    } catch (error) {
      console.error('[DUAL_VIEW] Failed to research item:', error);
    }
  }
  
  /**
   * 研究を完了させる
   */
  private completeResearch(researchItem: any): void {
    console.log('[DUAL_VIEW] Completing research:', researchItem.id, researchItem);
    const state = gameStateManager.getState();
    
    // コストを支払う
    gameStateManager.updateState(state => {
      console.log('[DUAL_VIEW] Current state before update:', state.resources);
      const newState = { ...state };
      const newResources = { ...state.resources };
      
      // 基本資源を減らす
      if (researchItem.cost.darkMatter) {
        newResources.darkMatter = Math.max(0, newResources.darkMatter - researchItem.cost.darkMatter);
      }
      if (researchItem.cost.thoughtPoints) {
        newResources.thoughtPoints = Math.max(0, newResources.thoughtPoints - researchItem.cost.thoughtPoints);
      }
      if (researchItem.cost.energy) {
        newResources.energy = Math.max(0, newResources.energy - researchItem.cost.energy);
      }
      if (researchItem.cost.cosmicDust) {
        newResources.cosmicDust = Math.max(0, newResources.cosmicDust - researchItem.cost.cosmicDust);
      }
      
      newState.resources = newResources;
      
      // 研究を完了リストに追加
      if (!newState.research) newState.research = {};
      const completedResearch = new Set(state.research?.completedResearch || []);
      completedResearch.add(researchItem.id);
      newState.research = {
        ...state.research,
        completedResearch: Array.from(completedResearch)
      };
      
      // 効果を適用
      researchItem.effects.forEach((effect: any) => {
        switch (effect.type) {
          case 'unlock_celestial_body':
            if (!newState.unlockedCelestialBodies) {
              newState.unlockedCelestialBodies = {};
            }
            // 新しいオブジェクトを作成して読み取り専用エラーを回避
            newState.unlockedCelestialBodies = {
              ...newState.unlockedCelestialBodies,
              [effect.value as string]: true
            };
            console.log('[DUAL_VIEW] Unlocked celestial body:', effect.value);
            break;
          // 他の効果も必要に応じて追加
        }
      });
      
      console.log('[DUAL_VIEW] New state after update:', newState.resources);
      return newState;
    });
    
    // メッセージ表示
    showMessage(`研究完了: ${researchItem.name}`, 'success');
    soundManager.playUISound('success');
    
    // 天体作成ボタンの表示を更新（軌道力学で衛星をアンロックした場合など）
    const updatedState = gameStateManager.getState();
    if (updatedState.unlockedCelestialBodies?.moon) {
      const moonButton = document.getElementById('createMoonButton');
      if (moonButton) moonButton.style.display = '';
    }
    
    // UIを更新
    updateUI(updatedState);
    
    // 現在のビューモードに応じて適切な更新を行う
    const currentMode = this.getResearchViewMode();
    if (!currentMode) {
      // リストビューの場合のみ更新
      this.showSimpleResearchList(document.getElementById('primary-view-research')!);
    }
    // ツリービューの場合は researchTreeVisualizerUI が自動的に更新される
  }

  /**
   * テスト用: 軌道力学を直接研究
   */
  public async testResearch(): Promise<void> {
    console.log('[DUAL_VIEW] Test research button clicked');
    try {
      await this.researchItem('orbital_mechanics');
    } catch (error) {
      console.error('[DUAL_VIEW] Test research failed:', error);
    }
  }

  /**
   * メインレンダラーの一時停止
   */
  private pauseMainRenderer(): void {
    // graphicsEngineの描画を一時停止
    const ge = graphicsEngine as any;
    if (ge && ge.isPaused !== undefined) {
      ge.isPaused = true;
    }
  }

  /**
   * メインレンダラーの再開
   */
  private resumeMainRenderer(): void {
    // graphicsEngineの描画を再開
    const ge = graphicsEngine as any;
    if (ge && ge.isPaused !== undefined) {
      ge.isPaused = false;
    }
  }

  /**
   * 現在の設定を取得
   */
  public getConfig(): ViewConfig {
    return { ...this.config };
  }

  /**
   * デュアルビューの状態を取得
   */
  public isDualViewActive(): boolean {
    return this.config.isDualView;
  }

  /**
   * 研究ビューモードの取得
   */
  private getResearchViewMode(): boolean {
    // localStorageから設定を読み込む（デフォルトはツリービュー）
    const mode = localStorage.getItem('researchViewMode');
    return mode !== 'list';
  }
  
  /**
   * 研究ビューモードの切り替え
   */
  public toggleResearchViewMode(): void {
    const currentMode = this.getResearchViewMode();
    const newMode = currentMode ? 'list' : 'tree';
    localStorage.setItem('researchViewMode', newMode);
    
    // 現在研究タブがアクティブなら再読み込み
    if (this.tabManager.getActiveTab() === 'research') {
      this.loadResearchView();
    }
  }
}

// グローバルインスタンス
export const dualViewSystem = new DualViewSystem();

// windowオブジェクトに公開（onclickハンドラーから呼び出せるように）
(window as any).dualViewSystem = dualViewSystem;

// 初期化関数
export function initializeDualViewSystem(): void {
  // dualViewSystemはコンストラクタで初期化されるため、
  // ここでは追加の初期化処理は不要
  console.log('[DUAL_VIEW] System initialized');
  
  // 初期状態でメインレンダラーが動作するようにする
  // 宇宙タブがデフォルトでアクティブなので、レンダラーを再開
  const ge = graphicsEngine as any;
  if (ge && ge.isPaused !== undefined) {
    ge.isPaused = false;
    console.log('[DUAL_VIEW] Main renderer resumed on initialization');
  }
}