// タブ管理システム

export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  contentId: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export class TabManager {
  private tabs: Map<string, TabConfig> = new Map();
  private activeTabId: string | null = null;
  private tabContainer: HTMLElement;
  private contentContainer: HTMLElement;
  private listeners: Map<string, Set<(tabId: string) => void>> = new Map();

  constructor(tabContainerId: string, contentContainerId: string) {
    const tabContainer = document.getElementById(tabContainerId);
    const contentContainer = document.getElementById(contentContainerId);
    
    if (!tabContainer || !contentContainer) {
      throw new Error('[TAB_MANAGER] Required DOM elements not found');
    }
    
    this.tabContainer = tabContainer;
    this.contentContainer = contentContainer;
    
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // タブクリックイベントの委譲
    this.tabContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabButton = target.closest('.dual-view-tab') as HTMLElement;
      
      if (tabButton && tabButton.dataset.tab) {
        this.activateTab(tabButton.dataset.tab);
      }
    });
  }

  /**
   * タブを登録
   */
  public registerTab(config: TabConfig): void {
    this.tabs.set(config.id, config);
    console.log(`[TAB_MANAGER] Registered tab: ${config.id}`);
  }

  /**
   * タブをアクティブ化
   */
  public activateTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      console.error(`[TAB_MANAGER] Tab not found: ${tabId}`);
      return;
    }

    // 現在のタブを非アクティブ化
    if (this.activeTabId && this.activeTabId !== tabId) {
      this.deactivateTab(this.activeTabId);
    }

    // タブボタンのアクティブ状態を更新
    const tabButtons = this.tabContainer.querySelectorAll('.dual-view-tab');
    tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === tabId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // コンテンツの表示切り替え
    const allContents = this.contentContainer.querySelectorAll('.view-content');
    allContents.forEach(content => {
      content.classList.remove('active');
    });

    const targetContent = document.getElementById(tab.contentId);
    if (targetContent) {
      targetContent.classList.add('active');
    }

    // コールバック実行
    if (tab.onActivate) {
      tab.onActivate();
    }

    this.activeTabId = tabId;

    // イベント発火
    this.emit('tab-changed', tabId);
    
    console.log(`[TAB_MANAGER] Activated tab: ${tabId}`);
  }

  /**
   * タブを非アクティブ化
   */
  private deactivateTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    if (tab.onDeactivate) {
      tab.onDeactivate();
    }

    console.log(`[TAB_MANAGER] Deactivated tab: ${tabId}`);
  }

  /**
   * 現在のアクティブタブを取得
   */
  public getActiveTab(): string | null {
    return this.activeTabId;
  }

  /**
   * タブ切り替えイベントのリスナー登録
   */
  public on(event: 'tab-changed', callback: (tabId: string) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * タブ切り替えイベントのリスナー解除
   */
  public off(event: 'tab-changed', callback: (tabId: string) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * イベント発火
   */
  private emit(event: string, data: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * タブを動的に追加
   */
  public addTab(config: TabConfig): void {
    // タブを登録
    this.registerTab(config);

    // タブボタンを作成
    const tabButton = document.createElement('button');
    tabButton.className = 'dual-view-tab';
    tabButton.setAttribute('data-tab', config.id);
    tabButton.innerHTML = `
      <span class="tab-icon">${config.icon}</span>
      <span class="tab-label">${config.label}</span>
    `;

    // コントロール要素の前に挿入
    const controls = this.tabContainer.querySelector('.dual-view-controls');
    if (controls) {
      this.tabContainer.insertBefore(tabButton, controls);
    } else {
      this.tabContainer.appendChild(tabButton);
    }

    console.log(`[TAB_MANAGER] Added tab: ${config.id}`);
  }

  /**
   * タブを削除
   */
  public removeTab(tabId: string): void {
    if (this.activeTabId === tabId) {
      // 別のタブをアクティブ化
      const tabIds = Array.from(this.tabs.keys());
      const nextTabId = tabIds.find(id => id !== tabId);
      if (nextTabId) {
        this.activateTab(nextTabId);
      }
    }

    // タブを削除
    this.tabs.delete(tabId);

    // タブボタンを削除
    const tabButton = this.tabContainer.querySelector(`[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.remove();
    }

    console.log(`[TAB_MANAGER] Removed tab: ${tabId}`);
  }

  /**
   * すべてのタブを取得
   */
  public getTabs(): TabConfig[] {
    return Array.from(this.tabs.values());
  }

  /**
   * タブの存在確認
   */
  public hasTab(tabId: string): boolean {
    return this.tabs.has(tabId);
  }

  /**
   * タブのアニメーション効果
   */
  public pulseTab(tabId: string): void {
    const tabButton = this.tabContainer.querySelector(`[data-tab="${tabId}"]`);
    if (tabButton) {
      tabButton.classList.add('pulse');
      setTimeout(() => {
        tabButton.classList.remove('pulse');
      }, 300);
    }
  }
}