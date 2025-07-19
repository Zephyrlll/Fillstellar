// Inventory UI System
import { gameStateManager } from './state.js';
import { ResourceType, QualityTier, RESOURCE_METADATA, QUALITY_MULTIPLIERS } from './resourceSystem.js';
import { soundManager } from './sound.js';
import { showMessage } from './ui.js';

export interface InventoryResource {
  type: ResourceType;
  amount: number;
  quality?: QualityTier;
  rate?: number;
  category: 'basic' | 'advanced' | 'processed' | 'special';
}

export class InventoryUI {
  private overlay: HTMLElement;
  private closeButton: HTMLElement;
  private toggleButton: HTMLElement;
  private categoryTabs: NodeListOf<HTMLElement>;
  private itemsGrid: HTMLElement;
  private isOpen: boolean = false;
  private currentCategory: string = 'basic';

  constructor() {
    this.overlay = document.getElementById('inventory-overlay')!;
    this.closeButton = document.getElementById('inventoryCloseButton')!;
    this.toggleButton = document.getElementById('inventoryToggleButton')!;
    this.categoryTabs = document.querySelectorAll('.inventory-tab');
    this.itemsGrid = document.getElementById('inventory-grid')!;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Toggle button
    this.toggleButton?.addEventListener('click', () => {
      this.open();
    });

    // Mobile toggle button
    const mobileToggleButton = document.getElementById('inventoryToggleButton-mobile');
    mobileToggleButton?.addEventListener('click', () => {
      this.open();
    });

    // From production panel
    const fromProductionBtn = document.getElementById('openInventoryFromProduction');
    fromProductionBtn?.addEventListener('click', () => {
      this.open();
      // Close production panel
      const productionPanel = document.getElementById('production-panel');
      if (productionPanel) {
        productionPanel.classList.remove('open');
      }
    });

    // From research lab
    const fromResearchBtn = document.getElementById('openInventoryFromResearch');
    fromResearchBtn?.addEventListener('click', () => {
      this.open();
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
    
    console.log('[INVENTORY] Opening inventory UI');
    this.isOpen = true;
    this.overlay.classList.add('active');
    
    // Update display
    this.updateDisplay();
    
    // Play sound
    soundManager.playUISound('open');
  }

  public close(): void {
    if (!this.isOpen) return;
    
    console.log('[INVENTORY] Closing inventory UI');
    this.isOpen = false;
    this.overlay.classList.remove('active');
    
    // Play sound
    soundManager.playUISound('close');
  }

  private switchCategory(category: string): void {
    this.currentCategory = category;
    
    // Update active tab
    this.categoryTabs.forEach(tab => {
      if (tab.dataset.category === category) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update displayed items
    this.displayResources();
  }

  private getResourceCategory(type: ResourceType): string {
    // Basic resources
    if ([
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ].includes(type)) {
      return 'basic';
    }
    
    // Advanced resources
    if ([
      ResourceType.CONCENTRATED_ENERGY,
      ResourceType.HYPER_CRYSTAL,
      ResourceType.DIMENSIONAL_ESSENCE,
      ResourceType.ULTRA_ALLOY,
      ResourceType.QUANTUM_POLYMER,
      ResourceType.EXOTIC_MATTER,
      ResourceType.STABILIZED_ENERGY,
      ResourceType.REFINED_METAL,
      ResourceType.RARE_ELEMENTS,
      ResourceType.HIGH_POLYMER,
      ResourceType.QUANTUM_CRYSTAL
    ].includes(type)) {
      return 'advanced';
    }
    
    // Processed resources
    if ([
      ResourceType.PROCESSED_METAL,
      ResourceType.SILICON,
      ResourceType.ALLOY,
      ResourceType.RADIOACTIVE_WASTE
    ].includes(type)) {
      return 'processed';
    }
    
    // Special resources (subtypes)
    return 'special';
  }

  private displayResources(): void {
    // Clear current items
    this.itemsGrid.innerHTML = '';

    const state = gameStateManager.getState();
    const resources: InventoryResource[] = [];

    // Add basic resources
    if (this.currentCategory === 'basic') {
      resources.push(
        { type: ResourceType.COSMIC_DUST, amount: state.resources.cosmicDust, category: 'basic' },
        { type: ResourceType.ENERGY, amount: state.resources.energy, category: 'basic' },
        { type: ResourceType.ORGANIC_MATTER, amount: state.resources.organicMatter, category: 'basic' },
        { type: ResourceType.BIOMASS, amount: state.resources.biomass, category: 'basic' },
        { type: ResourceType.DARK_MATTER, amount: state.resources.darkMatter, category: 'basic' },
        { type: ResourceType.THOUGHT_POINTS, amount: state.resources.thoughtPoints, category: 'basic' }
      );
    }

    // Add advanced resources
    if (state.advancedResources) {
      Object.entries(state.advancedResources).forEach(([type, storage]) => {
        const category = this.getResourceCategory(type as ResourceType);
        if (category === this.currentCategory && storage.amount > 0) {
          resources.push({
            type: type as ResourceType,
            amount: storage.amount,
            quality: storage.quality,
            category: category as any
          });
        }
      });
    }

    // Create resource cards
    resources.forEach(resource => {
      const card = this.createResourceCard(resource);
      this.itemsGrid.appendChild(card);
    });

    // Update statistics
    this.updateStatistics();
  }

  private createResourceCard(resource: InventoryResource): HTMLElement {
    const card = document.createElement('div');
    card.className = 'resource-card';
    
    const metadata = RESOURCE_METADATA[resource.type];
    if (!metadata) {
      console.warn('[INVENTORY] No metadata for resource:', resource.type);
      return card;
    }

    // Quality glow effect
    if (resource.quality !== undefined) {
      const qualityData = QUALITY_MULTIPLIERS[resource.quality];
      card.style.borderColor = qualityData.color;
      card.style.boxShadow = `0 0 20px ${qualityData.color}40`;
    }

    card.innerHTML = `
      <div class="resource-icon">${metadata.icon}</div>
      <div class="resource-name">${metadata.name}</div>
      <div class="resource-amount">${this.formatAmount(resource.amount)}</div>
      ${resource.quality !== undefined ? `
        <div class="resource-quality">
          ${this.createQualityStars(resource.quality)}
        </div>
      ` : ''}
      <div class="resource-rate">
        ${resource.rate ? `+${this.formatAmount(resource.rate)}/s` : '在庫のみ'}
      </div>
    `;

    // Add click handler for details
    card.addEventListener('click', () => {
      this.showResourceDetails(resource);
    });

    return card;
  }

  private createQualityStars(quality: QualityTier): string {
    const stars = [];
    for (let i = 0; i <= 4; i++) {
      stars.push(`<div class="quality-star ${i <= quality ? 'filled' : ''}"></div>`);
    }
    return stars.join('');
  }

  private formatAmount(amount: number): string {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
    return amount.toFixed(2);
  }

  private showResourceDetails(resource: InventoryResource): void {
    const metadata = RESOURCE_METADATA[resource.type];
    if (!metadata) return;

    let details = `${metadata.name}\n`;
    details += `数量: ${resource.amount.toFixed(2)}\n`;
    
    if (resource.quality !== undefined) {
      const qualityNames = ['粗悪', '標準', '高品質', '完璧', '伝説'];
      details += `品質: ${qualityNames[resource.quality]}\n`;
    }
    
    details += `\n${metadata.description}`;
    
    showMessage(details, 'info');
  }

  private updateStatistics(): void {
    const state = gameStateManager.getState();
    let totalTypes = 0;
    let totalValue = 0;
    let highestQuality = -1;

    // Count basic resources
    if (state.resources.cosmicDust > 0) totalTypes++;
    if (state.resources.energy > 0) totalTypes++;
    if (state.resources.organicMatter > 0) totalTypes++;
    if (state.resources.biomass > 0) totalTypes++;
    if (state.resources.darkMatter > 0) totalTypes++;
    if (state.resources.thoughtPoints > 0) totalTypes++;

    // Count and evaluate advanced resources
    if (state.advancedResources) {
      Object.entries(state.advancedResources).forEach(([type, storage]) => {
        if (storage.amount > 0) {
          totalTypes++;
          if (storage.quality > highestQuality) {
            highestQuality = storage.quality;
          }
        }
      });
    }

    // Update UI
    const totalTypesEl = document.getElementById('totalResourceTypes');
    if (totalTypesEl) totalTypesEl.textContent = totalTypes.toString();

    const totalValueEl = document.getElementById('totalResourceValue');
    if (totalValueEl) totalValueEl.textContent = this.formatAmount(totalValue);

    const highestQualityEl = document.getElementById('highestQuality');
    if (highestQualityEl) {
      const qualityNames = ['粗悪', '標準', '高品質', '完璧', '伝説'];
      highestQualityEl.textContent = highestQuality >= 0 ? qualityNames[highestQuality] : '-';
    }
  }

  public updateDisplay(): void {
    if (!this.isOpen) return;
    this.displayResources();
  }
}

// Initialize inventory UI
let inventoryUI: InventoryUI | null = null;

export function initializeInventory(): void {
  if (!inventoryUI) {
    inventoryUI = new InventoryUI();
    console.log('[INVENTORY] Inventory UI initialized');
  }
}

export function getInventoryUI(): InventoryUI | null {
  return inventoryUI;
}