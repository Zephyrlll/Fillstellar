import { gameStateManager } from './state.js';

export class ResearchLabUI {
  private overlay: HTMLElement;
  private closeButton: HTMLElement;
  private toggleButton: HTMLElement;
  private categoryTabs: NodeListOf<HTMLElement>;
  private itemsGrid: HTMLElement;
  private isOpen: boolean = false;

  constructor() {
    this.overlay = document.getElementById('research-lab-overlay')!;
    this.closeButton = document.getElementById('researchLabCloseButton')!;
    this.toggleButton = document.getElementById('researchLabToggleButton')!;
    this.categoryTabs = document.querySelectorAll('.research-category-tab');
    this.itemsGrid = document.getElementById('research-items-grid')!;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Toggle button
    this.toggleButton?.addEventListener('click', () => {
      this.open();
    });

    // Mobile toggle button
    const mobileToggleButton = document.getElementById('researchLabToggleButton-mobile');
    mobileToggleButton?.addEventListener('click', () => {
      this.open();
    });

    // Mobile open full lab button
    const mobileOpenFullLab = document.getElementById('mobile-open-full-lab');
    mobileOpenFullLab?.addEventListener('click', () => {
      this.open();
      // Close mobile modal if open
      const mobileModal = document.querySelector('.mobile-content.active-mobile-content');
      if (mobileModal) {
        mobileModal.classList.remove('active-mobile-content');
      }
    });

    // Close button
    this.closeButton?.addEventListener('click', () => {
      this.close();
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Close on overlay click
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Category tabs
    this.categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchCategory(tab.dataset.category!);
      });
    });
  }

  public open(): void {
    if (this.isOpen) return;
    
    console.log('[RESEARCH_LAB] Opening research lab UI');
    this.isOpen = true;
    this.overlay.classList.add('active');
    
    // Update display
    this.updateDisplay();
    
    // Ensure game continues in background
    const gameState = gameStateManager.getState();
    console.log('[RESEARCH_LAB] Game state preserved, simulation continues');
  }

  public close(): void {
    if (!this.isOpen) return;
    
    console.log('[RESEARCH_LAB] Closing research lab UI');
    this.isOpen = false;
    this.overlay.classList.remove('active');
  }

  private switchCategory(category: string): void {
    // Update active tab
    this.categoryTabs.forEach(tab => {
      if (tab.dataset.category === category) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update displayed items
    this.displayResearchItems(category);
  }

  private displayResearchItems(category: string): void {
    // Clear current items
    this.itemsGrid.innerHTML = '';

    // TODO: Add actual research items based on category
    // For now, show placeholder
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      padding: 50px;
      color: #8892b0;
      font-size: 18px;
    `;
    placeholder.textContent = `${category}の研究項目 (実装予定)`;
    this.itemsGrid.appendChild(placeholder);
  }

  private updateDisplay(): void {
    const state = gameStateManager.getState();
    
    // Update research points
    const researchPointsDisplay = document.getElementById('researchPointsDisplay');
    if (researchPointsDisplay) {
      researchPointsDisplay.textContent = Math.floor(state.resources.darkMatter).toString();
    }

    // Update completed research count
    const completedCount = document.getElementById('completedResearchCount');
    if (completedCount) {
      let count = 0;
      if (state.research.enhancedDust) count++;
      if (state.research.advancedEnergy) count++;
      if (state.research.moonUnlocked) count++;
      if (state.research.dwarfPlanetUnlocked) count++;
      if (state.research.planetUnlocked) count++;
      if (state.research.starUnlocked) count++;
      completedCount.textContent = count.toString();
    }

    // Update active research count
    const activeCount = document.getElementById('activeResearchCount');
    if (activeCount) {
      activeCount.textContent = '0'; // TODO: Implement active research tracking
    }

    // Update research speed
    const researchSpeed = document.getElementById('researchSpeedDisplay');
    if (researchSpeed) {
      researchSpeed.textContent = '1.0x'; // TODO: Implement research speed modifiers
    }

    // Load initial category
    this.switchCategory('fundamental');
  }
}

// Initialize research lab UI
let researchLabUI: ResearchLabUI | null = null;

export function initializeResearchLab(): void {
  if (!researchLabUI) {
    researchLabUI = new ResearchLabUI();
    console.log('[RESEARCH_LAB] Research lab UI initialized');
  }
}

export function getResearchLabUI(): ResearchLabUI | null {
  return researchLabUI;
}