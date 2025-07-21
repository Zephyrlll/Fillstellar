import { MenuItem, RadialMenuConfig, SlideMenuConfig, MenuSection } from '../types/menu.js';
import { animationSystem } from './simpleAnimations.js';

export class MenuSystem {
  private radialMenu: RadialMenu;
  private slideMenu: SlideMenu;
  private isInitialized: boolean = false;
  
  constructor() {
    this.radialMenu = new RadialMenu();
    this.slideMenu = new SlideMenu();
  }
  
  init(): void {
    if (this.isInitialized) return;
    
    this.setupRadialMenu();
    this.setupSlideMenu();
    this.createMenuToggle();
    
    this.isInitialized = true;
    console.log('[MENU] Menu system initialized');
  }
  
  private setupRadialMenu(): void {
    const config: RadialMenuConfig = {
      centerIcon: '×',
      centerLabel: '閉じる',
      radius: 180,
      itemRadius: 80,
      startAngle: -90,
      items: this.getRadialMenuItems()
    };
    
    this.radialMenu.init(config);
  }
  
  private setupSlideMenu(): void {
    const config: SlideMenuConfig = {
      position: 'right',
      width: 300,
      sections: this.getSlideMenuSections()
    };
    
    this.slideMenu.init(config);
  }
  
  private getRadialMenuItems(): MenuItem[] {
    return [
      {
        id: 'dashboard',
        label: 'ダッシュボード',
        icon: '<img src="/icon/menu/dashboard-svgrepo-com.svg" class="menu-icon-svg" alt="ダッシュボード">',
        action: () => this.toggleDashboard()
      },
      {
        id: 'achievements',
        label: '実績',
        icon: '<img src="/icon/menu/achievement-award-trophy-svgrepo-com.svg" class="menu-icon-svg" alt="実績">',
        action: () => this.openAchievements()
      },
      {
        id: 'save',
        label: 'セーブ/ロード',
        icon: '<img src="/icon/menu/save-alt-svgrepo-com.svg" class="menu-icon-svg" alt="セーブ">',
        submenu: [
          {
            id: 'save-game',
            label: 'セーブ',
            icon: '<img src="/icon/menu/save-alt-svgrepo-com.svg" class="menu-icon-svg" alt="セーブ">',
            action: () => this.saveGame()
          },
          {
            id: 'load-game',
            label: 'ロード',
            icon: '<img src="/icon/menu/load-list-svgrepo-com.svg" class="menu-icon-svg" alt="ロード">',
            action: () => this.loadGame()
          },
          {
            id: 'auto-save',
            label: '自動セーブ設定',
            icon: '<img src="/icon/menu/auto-renewal-circle-svgrepo-com.svg" class="menu-icon-svg" alt="自動セーブ">',
            action: () => this.openAutoSaveSettings()
          }
        ]
      },
      {
        id: 'research',
        label: '研究ラボ',
        icon: '<img src="/icon/menu/laboratory-microscope-science-chemistry-education-learning-svgrepo-com.svg" class="menu-icon-svg" alt="研究">',
        action: () => this.openResearchLab()
      },
      {
        id: 'prestige',
        label: 'プレステージ',
        icon: '<img src="/icon/menu/prestige.svg" class="menu-icon-svg" alt="プレステージ">',
        action: () => this.openPrestige()
      },
      {
        id: 'production',
        label: '生産管理',
        icon: '<img src="/icon/menu/production-plant-svgrepo-com.svg" class="menu-icon-svg" alt="生産管理">',
        submenu: [
          {
            id: 'energy-distribution',
            label: 'エネルギー分配',
            icon: '<img src="/icon/menu/energy-svgrepo-com.svg" class="menu-icon-svg" alt="エネルギー">',
            action: () => this.openEnergyDistribution()
          },
          {
            id: 'conversion-engine',
            label: '変換エンジン',
            icon: '<img src="/icon/menu/auto-renewal-circle-svgrepo-com.svg" class="menu-icon-svg" alt="変換">',
            action: () => this.openConversionEngine()
          },
          {
            id: 'production-chain',
            label: '生産チェーン',
            icon: '<img src="/icon/menu/chain-svgrepo-com.svg" class="menu-icon-svg" alt="生産チェーン">',
            action: () => this.openProductionChain()
          },
          {
            id: 'production-analysis',
            label: '生産効率分析',
            icon: '<img src="/icon/menu/graph-up-svgrepo-com.svg" class="menu-icon-svg" alt="生産分析">',
            action: () => this.openProductionAnalysis()
          },
          {
            id: 'catalyst-system',
            label: '触媒システム',
            icon: '<img src="/icon/menu/catalyst-svgrepo-com.svg" class="menu-icon-svg" alt="触媒">',
            action: () => this.openCatalystSystem()
          },
          {
            id: 'automation',
            label: '自動化',
            icon: '<img src="/icon/menu/bot-svgrepo-com.svg" class="menu-icon-svg" alt="自動化">',
            action: () => this.openAutomation()
          }
        ]
      },
      {
        id: 'statistics',
        label: '統計',
        icon: '<img src="/icon/menu/statistics-graph-stats-analytics-business-data-svgrepo-com.svg" class="menu-icon-svg" alt="統計">',
        submenu: [
          {
            id: 'resource-stats',
            label: 'リソース統計',
            icon: '<img src="/icon/menu/resource-management-database-svgrepo-com.svg" class="menu-icon-svg" alt="リソース">',
            action: () => this.openResourceStats()
          },
          {
            id: 'celestial-stats',
            label: '天体統計',
            icon: '<img src="/icon/menu/planet-svgrepo-com.svg" class="menu-icon-svg" alt="天体">',
            action: () => this.openCelestialStats()
          },
          {
            id: 'graph-display',
            label: 'グラフ表示',
            icon: '<img src="/icon/menu/graph-up-svgrepo-com.svg" class="menu-icon-svg" alt="グラフ">',
            action: () => this.openGraphDisplay()
          }
        ]
      },
      {
        id: 'settings',
        label: '設定',
        icon: '<img src="/icon/menu/cog-tool-administration-control-edit-option-svgrepo-com.svg" class="menu-icon-svg" alt="設定">',
        action: () => this.openSettings()
      },
      {
        id: 'help',
        label: 'ヘルプ',
        icon: '<img src="/icon/menu/help-svgrepo-com.svg" class="menu-icon-svg" alt="ヘルプ">',
        submenu: [
          {
            id: 'tutorial',
            label: 'チュートリアル',
            icon: '<img src="/icon/menu/play-sport-sports-sound-svgrepo-com.svg" class="menu-icon-svg" alt="チュートリアル">',
            action: () => this.openTutorial()
          },
          {
            id: 'controls',
            label: '操作方法',
            icon: '<img src="/icon/menu/game-controller-svgrepo-com.svg" class="menu-icon-svg" alt="操作方法">',
            action: () => this.openControls()
          },
          {
            id: 'tips',
            label: 'ヒント',
            icon: '<img src="/icon/menu/hint-svgrepo-com.svg" class="menu-icon-svg" alt="ヒント">',
            action: () => this.openTips()
          }
        ]
      }
    ];
  }
  
  private getSlideMenuSections(): MenuSection[] {
    return [
      {
        id: 'account',
        title: 'アカウント',
        items: [
          {
            id: 'login',
            label: 'ログイン',
            icon: '👤',
            action: () => console.log('[MENU] Login not implemented'),
            enabled: false
          },
          {
            id: 'profile',
            label: 'プロフィール',
            icon: '📋',
            action: () => console.log('[MENU] Profile not implemented'),
            enabled: false
          }
        ]
      },
      {
        id: 'community',
        title: 'コミュニティ',
        items: [
          {
            id: 'feedback',
            label: 'フィードバック',
            icon: '<img src="/icon/menu/mail-svgrepo-com.svg" class="menu-icon-svg" alt="フィードバック">',
            action: () => this.openFeedback()
          },
          {
            id: 'discord',
            label: 'Discord',
            icon: '💬',
            action: () => window.open('https://discord.gg/example', '_blank')
          },
          {
            id: 'wiki',
            label: 'Wiki',
            icon: '📚',
            action: () => window.open('https://wiki.example.com', '_blank')
          }
        ]
      },
      {
        id: 'info',
        title: '情報',
        items: [
          {
            id: 'version',
            label: 'バージョン情報',
            icon: '<img src="/icon/menu/hint-i-solid-svgrepo-com.svg" class="menu-icon-svg" alt="情報">',
            action: () => this.showVersion()
          },
          {
            id: 'credits',
            label: 'クレジット',
            icon: '<img src="/icon/menu/credit-card-svgrepo-com.svg" class="menu-icon-svg" alt="クレジット">',
            action: () => this.showCredits()
          },
          {
            id: 'changelog',
            label: '更新履歴',
            icon: '<img src="/icon/menu/align-justify-svgrepo-com.svg" class="menu-icon-svg" alt="更新履歴">',
            action: () => this.showChangelog()
          }
        ]
      }
    ];
  }
  
  private createMenuToggle(): void {
    // Slide menu toggle button
    const slideToggle = document.createElement('button');
    slideToggle.id = 'slide-menu-toggle';
    slideToggle.className = 'slide-menu-toggle';
    slideToggle.innerHTML = '☰';
    slideToggle.title = 'その他のメニュー';
    slideToggle.addEventListener('click', () => this.slideMenu.toggle());
    document.body.appendChild(slideToggle);
  }
  
  // Action implementations
  private toggleDashboard(): void {
    const dashboardInstance = (window as any).dashboard;
    if (dashboardInstance) {
      const dashboard = document.getElementById('dashboard');
      if (dashboard && dashboard.classList.contains('hidden')) {
        dashboardInstance.show();
      } else {
        dashboardInstance.hide();
      }
    }
  }
  
  private openAchievements(): void {
    const achievementToggle = document.getElementById('achievement-toggle') as HTMLButtonElement;
    if (achievementToggle) {
      achievementToggle.click();
    }
  }
  
  private saveGame(): void {
    const saveButton = document.getElementById('saveGameButton') as HTMLButtonElement;
    if (saveButton) {
      saveButton.click();
    }
  }
  
  private loadGame(): void {
    const loadButton = document.getElementById('loadGameButton') as HTMLButtonElement;
    if (loadButton) {
      loadButton.click();
    }
  }
  
  private openAutoSaveSettings(): void {
    // Open settings and scroll to auto-save section
    this.openSettings();
    setTimeout(() => {
      const autoSaveSection = document.getElementById('auto-save-settings');
      if (autoSaveSection) {
        autoSaveSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  }
  
  private openResearchLab(): void {
    const researchButton = document.querySelector('.research-button') as HTMLButtonElement;
    if (researchButton) {
      researchButton.click();
    }
  }
  
  private openPrestige(): void {
    const prestigeUI = (window as any).prestigeUI;
    if (prestigeUI) {
      prestigeUI.show();
    }
  }
  
  private openEnergyDistribution(): void {
    const energyButton = document.getElementById('energy-distribution-button') as HTMLButtonElement;
    if (energyButton) {
      energyButton.click();
    }
  }
  
  private openConversionEngine(): void {
    const conversionButton = document.getElementById('conversion-ui-button') as HTMLButtonElement;
    if (conversionButton) {
      conversionButton.click();
    }
  }
  
  private openProductionChain(): void {
    const productionButton = document.getElementById('production-chain-button') as HTMLButtonElement;
    if (productionButton) {
      productionButton.click();
    }
  }
  
  private openProductionAnalysis(): void {
    const productionAnalysisUI = (window as any).productionAnalysisUI;
    if (productionAnalysisUI) {
      productionAnalysisUI.open();
    }
  }
  
  private openCatalystSystem(): void {
    const catalystButton = document.getElementById('catalyst-button') as HTMLButtonElement;
    if (catalystButton) {
      catalystButton.click();
    }
  }
  
  private openAutomation(): void {
    const automationUI = (window as any).automationUI;
    if (automationUI) {
      automationUI.open();
    }
  }
  
  private openResourceStats(): void {
    // Implementation for resource statistics
    console.log('[MENU] Resource stats not implemented');
  }
  
  private openCelestialStats(): void {
    // Implementation for celestial statistics
    console.log('[MENU] Celestial stats not implemented');
  }
  
  private openGraphDisplay(): void {
    // Implementation for graph display
    console.log('[MENU] Graph display not implemented');
  }
  
  private openSettings(): void {
    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    if (settingsButton) {
      settingsButton.click();
    }
  }
  
  private openTutorial(): void {
    const tutorialUI = (window as any).tutorialUI;
    if (tutorialUI) {
      tutorialUI.show();
    }
  }
  
  private openControls(): void {
    console.log('[MENU] Controls help not implemented');
  }
  
  private openTips(): void {
    console.log('[MENU] Tips not implemented');
  }
  
  private openFeedback(): void {
    if ((window as any).feedbackSystem) {
      (window as any).feedbackSystem.showToast({
        message: 'フィードバック機能は準備中です',
        type: 'info'
      });
    }
  }
  
  private showVersion(): void {
    if ((window as any).feedbackSystem) {
      (window as any).feedbackSystem.showToast({
        message: 'Cosmic Gardener v0.1.0 (Idle Game Update)',
        type: 'info',
        duration: 5000
      });
    }
  }
  
  private showCredits(): void {
    console.log('[MENU] Credits not implemented');
  }
  
  private showChangelog(): void {
    console.log('[MENU] Changelog not implemented');
  }
  
  // Public methods for external access
  hideExistingButtons(): void {
    // Hide buttons that will be integrated into the menu
    const buttonsToHide = [
      'settings-button',
      'energy-distribution-button',
      'conversion-ui-button',
      'production-chain-button',
      'catalyst-button',
      '.research-button'
    ];
    
    buttonsToHide.forEach(selector => {
      const elements = selector.startsWith('.') 
        ? document.querySelectorAll(selector)
        : [document.getElementById(selector)];
        
      elements.forEach(element => {
        if (element) {
          (element as HTMLElement).style.display = 'none';
        }
      });
    });
  }
  
  updateBadge(menuItemId: string, badge: string | number | null): void {
    this.radialMenu.updateBadge(menuItemId, badge);
  }
  
  enableMenuItem(menuItemId: string, enabled: boolean): void {
    this.radialMenu.enableMenuItem(menuItemId, enabled);
    this.slideMenu.enableMenuItem(menuItemId, enabled);
  }
}

// Radial Menu Implementation
class RadialMenu {
  private container: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private centerButton: HTMLButtonElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private isOpen: boolean = false;
  private config: RadialMenuConfig | null = null;
  private submenuContainer: HTMLDivElement | null = null;
  
  init(config: RadialMenuConfig): void {
    this.config = config;
    this.createOverlay();
    this.createContainer();
    this.createCenterButton();
    this.createToggleButton();
  }
  
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'radial-menu-overlay';
    this.overlay.addEventListener('click', () => this.close());
    document.body.appendChild(this.overlay);
  }
  
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'radial-menu';
    this.container.className = 'radial-menu';
    document.body.appendChild(this.container);
  }
  
  private createToggleButton(): void {
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'menu-toggle-top';
    this.toggleButton.innerHTML = '🎮';
    this.toggleButton.title = 'メニュー';
    this.toggleButton.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.toggleButton);
  }
  
  private createCenterButton(): void {
    if (!this.container || !this.config) return;
    
    this.centerButton = document.createElement('button');
    this.centerButton.className = 'radial-menu-center';
    this.centerButton.innerHTML = `
      <span class="center-icon">${this.config.centerIcon}</span>
      ${this.config.centerLabel ? `<span class="center-label">${this.config.centerLabel}</span>` : ''}
    `;
    
    this.centerButton.addEventListener('click', () => this.toggle());
    this.container.appendChild(this.centerButton);
  }
  
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open(): void {
    if (!this.container || !this.config || !this.overlay) return;
    
    this.isOpen = true;
    
    // Animate overlay
    this.overlay.style.display = 'block';
    animationSystem.fadeIn({
      targets: this.overlay,
      duration: 300
    });
    
    // Show container
    this.container.style.display = 'block';
    
    // Animate center button
    animationSystem.scale({
      targets: this.centerButton,
      scale: [0, 1],
      duration: 300,
      easing: 'easeOutBack'
    });
    
    // Clear existing items
    this.container.querySelectorAll('.radial-menu-item').forEach(item => item.remove());
    
    // Create menu items
    const visibleItems = this.config.items.filter(item => item.visible !== false);
    visibleItems.forEach((item, index) => {
      const angle = this.calculateAngle(index, visibleItems.length);
      const menuItem = this.createMenuItem(item, angle, index);
      
      // Set initial state
      menuItem.style.transform = 'translate(0, 0) scale(0)';
      menuItem.style.opacity = '0';
      
      this.container!.appendChild(menuItem);
      
      // Calculate target position
      const radians = (angle * Math.PI) / 180;
      const x = Math.cos(radians) * this.config!.radius;
      const y = Math.sin(radians) * this.config!.radius;
      
      // Animate menu item
      setTimeout(() => {
        menuItem.style.transition = 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        menuItem.style.transform = `translate(${x}px, ${y}px) scale(1)`;
        menuItem.style.opacity = '1';
      }, index * 50);
    });
    
    this.container.classList.add('open');
    this.overlay.classList.add('visible');
  }
  
  close(): void {
    if (!this.container || !this.overlay) return;
    
    this.isOpen = false;
    this.closeSubmenu();
    
    // Animate items out
    const items = this.container.querySelectorAll('.radial-menu-item');
    items.forEach((item: Element, index) => {
      const element = item as HTMLElement;
      setTimeout(() => {
        element.style.transition = 'all 300ms cubic-bezier(0.6, -0.28, 0.735, 0.045)';
        element.style.transform = 'translate(0, 0) scale(0)';
        element.style.opacity = '0';
      }, index * 30);
    });
    
    // Animate center button
    animationSystem.scale({
      targets: this.centerButton,
      scale: 0,
      duration: 300,
      delay: items.length * 30,
      easing: 'easeInBack'
    });
    
    // Fade out overlay
    animationSystem.fadeOut({
      targets: this.overlay,
      duration: 300,
      delay: items.length * 30 + 100,
      complete: () => {
        this.container.classList.remove('open');
        this.overlay.classList.remove('visible');
        this.container.style.display = 'none';
        this.overlay.style.display = 'none';
      }
    });
  }
  
  private calculateAngle(index: number, total: number): number {
    const angleStep = 360 / total;
    return this.config!.startAngle + (index * angleStep);
  }
  
  private createMenuItem(item: MenuItem, angle: number, index: number): HTMLElement {
    const button = document.createElement('button');
    button.className = `radial-menu-item ${item.enabled === false ? 'disabled' : ''}`;
    button.dataset.itemId = item.id;
    
    // Position will be set by anime.js
    // Store angle for later use
    button.dataset.angle = angle.toString();
    
    // Check if icon is HTML (contains < character)
    const iconHtml = item.icon.includes('<') 
      ? item.icon 
      : `<span class="item-icon-text">${item.icon}</span>`;
    
    button.innerHTML = `
      <span class="item-icon">${iconHtml}</span>
      <span class="item-label">${item.label}</span>
      ${item.badge ? `<span class="item-badge">${item.badge}</span>` : ''}
    `;
    
    // Animation handled by anime.js
    
    if (item.submenu) {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSubmenu(item, button);
      });
    } else if (item.action && item.enabled !== false) {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action!();
        this.close();
      });
    }
    
    return button;
  }
  
  private showSubmenu(parentItem: MenuItem, parentButton: HTMLElement): void {
    this.closeSubmenu();
    
    if (!parentItem.submenu || parentItem.submenu.length === 0) return;
    
    this.submenuContainer = document.createElement('div');
    this.submenuContainer.className = 'radial-submenu';
    
    const rect = parentButton.getBoundingClientRect();
    const centerRect = this.centerButton!.getBoundingClientRect();
    
    // Calculate submenu position
    const dx = rect.left - centerRect.left;
    const dy = rect.top - centerRect.top;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const submenuX = Math.cos(angle) * (distance + 60);
    const submenuY = Math.sin(angle) * (distance + 60);
    
    this.submenuContainer.style.transform = `translate(${submenuX}px, ${submenuY}px)`;
    
    // Create submenu items
    parentItem.submenu.forEach((item, index) => {
      const submenuItem = document.createElement('button');
      submenuItem.className = `submenu-item ${item.enabled === false ? 'disabled' : ''}`;
      
      // Check if icon is HTML (contains < character)
      const iconHtml = item.icon.includes('<') 
        ? item.icon 
        : `<span class="item-icon-text">${item.icon}</span>`;
      
      submenuItem.innerHTML = `
        <span class="item-icon">${iconHtml}</span>
        <span class="item-label">${item.label}</span>
      `;
      
      submenuItem.style.animationDelay = `${index * 50}ms`;
      
      if (item.action && item.enabled !== false) {
        submenuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action!();
          this.close();
        });
      }
      
      this.submenuContainer.appendChild(submenuItem);
    });
    
    this.container!.appendChild(this.submenuContainer);
  }
  
  private closeSubmenu(): void {
    if (this.submenuContainer) {
      this.submenuContainer.remove();
      this.submenuContainer = null;
    }
  }
  
  updateBadge(itemId: string, badge: string | number | null): void {
    const item = this.container?.querySelector(`[data-item-id="${itemId}"]`);
    if (!item) return;
    
    const badgeElement = item.querySelector('.item-badge');
    if (badge) {
      if (badgeElement) {
        badgeElement.textContent = String(badge);
      } else {
        const newBadge = document.createElement('span');
        newBadge.className = 'item-badge';
        newBadge.textContent = String(badge);
        item.appendChild(newBadge);
      }
    } else if (badgeElement) {
      badgeElement.remove();
    }
  }
  
  enableMenuItem(itemId: string, enabled: boolean): void {
    const item = this.container?.querySelector(`[data-item-id="${itemId}"]`);
    if (item) {
      if (enabled) {
        item.classList.remove('disabled');
      } else {
        item.classList.add('disabled');
      }
    }
  }
}

// Slide Menu Implementation
class SlideMenu {
  private container: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private config: SlideMenuConfig | null = null;
  
  init(config: SlideMenuConfig): void {
    this.config = config;
    this.createOverlay();
    this.createContainer();
    this.render();
  }
  
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'slide-menu-overlay';
    this.overlay.addEventListener('click', () => this.close());
    document.body.appendChild(this.overlay);
  }
  
  private createContainer(): void {
    if (!this.config) return;
    
    this.container = document.createElement('div');
    this.container.id = 'slide-menu';
    this.container.className = `slide-menu slide-menu-${this.config.position}`;
    this.container.style.width = `${this.config.width}px`;
    document.body.appendChild(this.container);
  }
  
  private render(): void {
    if (!this.container || !this.config) return;
    
    this.container.innerHTML = `
      <div class="slide-menu-header">
        <h3>その他</h3>
        <button class="slide-menu-close">×</button>
      </div>
      <div class="slide-menu-content">
        ${this.renderSections()}
      </div>
    `;
    
    // Add event listeners
    const closeBtn = this.container.querySelector('.slide-menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // Section toggle listeners
    this.container.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const section = (e.currentTarget as HTMLElement).parentElement;
        section?.classList.toggle('collapsed');
      });
    });
    
    // Menu item listeners
    this.container.querySelectorAll('.slide-menu-item').forEach(item => {
      const menuItem = this.findMenuItem((item as HTMLElement).dataset.itemId!);
      if (menuItem?.action && menuItem.enabled !== false) {
        item.addEventListener('click', () => {
          menuItem.action!();
          this.close();
        });
      }
    });
  }
  
  private renderSections(): string {
    if (!this.config) return '';
    
    return this.config.sections.map(section => `
      <div class="slide-menu-section ${section.collapsed ? 'collapsed' : ''}" data-section-id="${section.id}">
        <div class="section-header">
          <h4>${section.title}</h4>
          ${section.collapsible !== false ? '<span class="section-toggle">▼</span>' : ''}
        </div>
        <div class="section-content">
          ${this.renderItems(section.items)}
        </div>
      </div>
    `).join('');
  }
  
  private renderItems(items: MenuItem[]): string {
    return items.map(item => {
      if (item.visible === false) return '';
      
      // Check if icon is HTML (contains < character)
      const iconHtml = item.icon.includes('<') 
        ? item.icon 
        : `<span class="item-icon-text">${item.icon}</span>`;
      
      return `
        <button class="slide-menu-item ${item.enabled === false ? 'disabled' : ''}" 
                data-item-id="${item.id}"
                ${item.enabled === false ? 'disabled' : ''}>
          <span class="item-icon">${iconHtml}</span>
          <span class="item-label">${item.label}</span>
          ${item.badge ? `<span class="item-badge">${item.badge}</span>` : ''}
        </button>
      `;
    }).join('');
  }
  
  private findMenuItem(itemId: string): MenuItem | undefined {
    if (!this.config) return undefined;
    
    for (const section of this.config.sections) {
      const item = section.items.find(i => i.id === itemId);
      if (item) return item;
    }
    
    return undefined;
  }
  
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open(): void {
    if (!this.container || !this.overlay) return;
    
    this.isOpen = true;
    this.overlay.classList.add('visible');
    this.container.classList.add('open');
  }
  
  close(): void {
    if (!this.container || !this.overlay) return;
    
    this.isOpen = false;
    this.container.classList.remove('open');
    this.overlay.classList.remove('visible');
  }
  
  enableMenuItem(itemId: string, enabled: boolean): void {
    const item = this.container?.querySelector(`[data-item-id="${itemId}"]`);
    if (item) {
      if (enabled) {
        item.classList.remove('disabled');
        item.removeAttribute('disabled');
      } else {
        item.classList.add('disabled');
        item.setAttribute('disabled', 'true');
      }
    }
  }
}