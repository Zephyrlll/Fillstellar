// デュアルビューシステム

import * as THREE from 'three';
import { TabManager } from './tabManager.js';
import { graphicsEngine } from '../graphicsEngine.js';

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
    const container = document.getElementById('dual-view-container');
    const primaryView = document.getElementById('primary-view');
    const secondaryView = document.getElementById('secondary-view');
    
    if (!container || !primaryView || !secondaryView) {
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
    this.tabManager = new TabManager('dual-view-tabs', 'primary-view');
    
    this.initializeEventListeners();
    this.registerDefaultTabs();
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
      },
      onDeactivate: () => {
        console.log('[DUAL_VIEW] Space tab deactivated');
        this.pauseMainRenderer();
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
        console.log('[DUAL_VIEW] Research tab activated');
        this.loadResearchView();
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
    // 現在のアクティブタブを取得
    const currentTab = this.tabManager.getActiveTab();
    
    // TODO: プライマリとセカンダリのコンテンツを入れ替える実装
    console.log('[DUAL_VIEW] Swapping views (not implemented yet)');
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
    // 研究ツリービジュアライザーのコンテンツを移動
    const researchContent = document.getElementById('primary-view-research');
    if (!researchContent) return;
    
    try {
      // 動的インポート
      const { researchTreeVisualizerUI } = await import('../systems/researchTreeVisualizerUI.js');
      
      // コンテナに初期化
      await this.initializeResearchTreeInContainer(researchTreeVisualizerUI, researchContent);
      
      console.log('[DUAL_VIEW] Research tree visualizer loaded in tab');
    } catch (error) {
      console.error('[DUAL_VIEW] Failed to load research visualizer:', error);
      researchContent.innerHTML = '<div style="padding: 20px; color: #ff4444;">研究ツリービジュアライザーの読み込みに失敗しました</div>';
    }
  }
  
  /**
   * 研究ツリービジュアライザーをコンテナに初期化
   */
  private async initializeResearchTreeInContainer(visualizer: any, container: HTMLElement): Promise<void> {
    // 研究ツリービジュアライザー用のDOM構造を作成
    container.innerHTML = `
      <div class="research-tree-container">
        <div class="tree-toolbar">
          <select id="tree-layout-tab" class="layout-selector">
            <option value="hierarchical">階層レイアウト</option>
            <option value="radial">放射状レイアウト</option>
            <option value="category">カテゴリ別</option>
            <option value="force-directed">力学的配置</option>
          </select>
          <button id="tree-center-tab" class="toolbar-btn">中央表示</button>
          <button id="tree-path-tab" class="toolbar-btn">最適パス</button>
          <button id="tree-export-tab" class="toolbar-btn">エクスポート</button>
        </div>
        <div id="research-tree-graph-tab" class="research-graph-container"></div>
        <div class="tree-sidebar">
          <div class="tree-stats-panel">
            <h3>研究統計</h3>
            <div id="tree-stats-tab"></div>
          </div>
          <div class="selected-research-panel" id="selected-research-tab" style="display: none;">
            <h3>選択研究</h3>
            <div id="research-details-tab"></div>
          </div>
        </div>
      </div>
    `;
    
    // TODO: 研究ツリービジュアライザーの初期化メソッドを実装
    console.log('[DUAL_VIEW] Research tree container structure created');
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
}

// グローバルインスタンス
export const dualViewSystem = new DualViewSystem();

// 初期化関数
export function initializeDualViewSystem(): void {
  // dualViewSystemはコンストラクタで初期化されるため、
  // ここでは追加の初期化処理は不要
  console.log('[DUAL_VIEW] System initialized');
}