export class UIPositionManager {
  private rightPanelWidth: number = 0;
  private observers: MutationObserver[] = [];
  
  init(): void {
    this.detectRightPanels();
    this.setupObservers();
    this.updatePositions();
  }
  
  private detectRightPanels(): void {
    // Check for production panel
    const productionPanel = document.querySelector('.production-panel.active');
    if (productionPanel) {
      this.rightPanelWidth = 480;
      return;
    }
    
    // Check for mobile settings panel
    const mobileSettingsPanel = document.getElementById('mobile-settings-panel');
    if (mobileSettingsPanel && mobileSettingsPanel.classList.contains('open')) {
      this.rightPanelWidth = 400;
      return;
    }
    
    // Check for any other right-side panels
    const rightPanels = document.querySelectorAll('[class*="panel"][style*="right: 0"]');
    if (rightPanels.length > 0) {
      const panel = rightPanels[0] as HTMLElement;
      this.rightPanelWidth = panel.offsetWidth;
      return;
    }
    
    this.rightPanelWidth = 0;
  }
  
  private setupObservers(): void {
    // Observe production panel changes
    const productionPanel = document.querySelector('.production-panel');
    if (productionPanel) {
      const observer = new MutationObserver(() => {
        this.detectRightPanels();
        this.updatePositions();
      });
      observer.observe(productionPanel, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });
      this.observers.push(observer);
    }
    
    // Observe body for new panels
    const bodyObserver = new MutationObserver(() => {
      this.detectRightPanels();
      this.updatePositions();
    });
    bodyObserver.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    this.observers.push(bodyObserver);
  }
  
  private updatePositions(): void {
    const rightOffset = this.rightPanelWidth > 0 ? this.rightPanelWidth + 20 : 20;
    
    // Update menu toggle (top)
    const menuToggle = document.querySelector('.menu-toggle-top') as HTMLElement;
    if (menuToggle) {
      menuToggle.style.right = `${rightOffset}px`;
    }
    
    // Update achievement button
    const achievementButton = document.querySelector('.achievement-toggle-button') as HTMLElement;
    if (achievementButton) {
      achievementButton.style.right = `${rightOffset + 60}px`;
    }
    
    // Update slide menu toggle
    const slideToggle = document.getElementById('slide-menu-toggle');
    if (slideToggle) {
      slideToggle.style.right = `${rightOffset + 120}px`;
    }
  }
  
  // Manual update method for external calls
  update(): void {
    this.detectRightPanels();
    this.updatePositions();
  }
  
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}