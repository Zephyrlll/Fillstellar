import { gameStateManager } from './state.js';
import { allResearchItems, researchCategories } from './researchData.js';
import { ResearchItem, ResearchState, isResearchAvailable, canAffordResearch, isResearchCompleted } from './types/research.js';
import { soundManager } from './sound.js';
import { showMessage } from './ui.js';

export class ResearchLabUI {
  private overlay: HTMLElement;
  private closeButton: HTMLElement;
  private toggleButton: HTMLElement;
  private categoryTabs: NodeListOf<HTMLElement>;
  private itemsGrid: HTMLElement;
  private isOpen: boolean = false;

  constructor() {
    const overlay = document.getElementById('research-lab-overlay');
    const closeButton = document.getElementById('researchLabCloseButton');
    const toggleButton = document.getElementById('researchLabToggleButton');
    const itemsGrid = document.getElementById('research-items-grid');
    
    if (!overlay || !closeButton || !toggleButton || !itemsGrid) {
      throw new Error('[RESEARCH_LAB] Required DOM elements not found');
    }
    
    this.overlay = overlay;
    this.closeButton = closeButton;
    this.toggleButton = toggleButton;
    this.categoryTabs = document.querySelectorAll('.research-category-tab');
    this.itemsGrid = itemsGrid;

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
    
    try {
      console.log('[RESEARCH_LAB] Opening research lab UI');
      this.isOpen = true;
      if (this.overlay) {
        this.overlay.classList.add('active');
      } else {
        console.error('[RESEARCH_LAB] Overlay element not found');
        return;
      }
      
      // Update display
      this.updateDisplay();
      
      // Ensure game continues in background
      const gameState = gameStateManager.getState();
      console.log('[RESEARCH_LAB] Game state preserved, simulation continues');
    } catch (error) {
      console.error('[RESEARCH_LAB] Failed to open research lab:', error);
      this.isOpen = false;
    }
  }

  public close(): void {
    if (!this.isOpen) return;
    
    try {
      console.log('[RESEARCH_LAB] Closing research lab UI');
      this.isOpen = false;
      if (this.overlay) {
        this.overlay.classList.remove('active');
      }
    } catch (error) {
      console.error('[RESEARCH_LAB] Failed to close research lab:', error);
    }
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
    if (!this.itemsGrid) {
      console.error('[RESEARCH_LAB] Items grid element not found');
      return;
    }
    
    // Clear current items
    this.itemsGrid.innerHTML = '';

    // Get research state
    const state = gameStateManager.getState();
    const researchState = this.getResearchState();

    // Filter items by category
    const categoryItems = allResearchItems.filter(item => item.category === category);

    if (categoryItems.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 50px;
        color: #8892b0;
        font-size: 18px;
      `;
      placeholder.textContent = 'この分野の研究はまだ発見されていません';
      this.itemsGrid.appendChild(placeholder);
      return;
    }

    // Create research item cards
    categoryItems.forEach(item => {
      const card = this.createResearchCard(item, researchState, state);
      this.itemsGrid.appendChild(card);
    });
  }

  private createResearchCard(item: ResearchItem, researchState: ResearchState, gameState: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'research-card';
    card.setAttribute('data-research-id', item.id);
    
    const isCompleted = isResearchCompleted(item.id, researchState);
    const isAvailable = isResearchAvailable(item, researchState);
    const canAfford = canAffordResearch(item, gameState.resources, gameState.advancedResources);
    
    // Apply status classes
    if (isCompleted) {
      card.classList.add('completed');
    } else if (!isAvailable) {
      card.classList.add('locked');
    } else if (!canAfford) {
      card.classList.add('unaffordable');
    }

    // Card HTML structure
    card.innerHTML = `
      <div class="research-card-header">
        <div class="research-icon">${item.icon || '🔬'}</div>
        <div class="research-info">
          <h3 class="research-title">${item.name}</h3>
          <p class="research-description">${item.description}</p>
        </div>
      </div>
      <div class="research-card-body">
        <div class="research-cost">
          ${this.formatCost(item.cost)}
        </div>
        <div class="research-effects">
          ${this.formatEffects(item.effects)}
        </div>
        ${item.requirements.length > 0 ? `
          <div class="research-requirements">
            <span class="req-label">前提条件:</span>
            ${this.formatRequirements(item.requirements, researchState)}
          </div>
        ` : ''}
      </div>
      <div class="research-card-footer">
        <button class="research-action-btn" ${isCompleted ? 'disabled' : ''}>
          ${isCompleted ? '研究完了' : (isAvailable && canAfford ? '研究開始' : '条件未達成')}
        </button>
      </div>
    `;

    // Add click handler
    const actionBtn = card.querySelector('.research-action-btn');
    if (actionBtn && !isCompleted && isAvailable && canAfford) {
      actionBtn.addEventListener('click', () => this.startResearch(item));
    }

    return card;
  }

  private formatCost(cost: any): string {
    const parts: string[] = [];
    // Basic resources
    if (cost.darkMatter) parts.push(`<span class="cost-item">🌑 ${cost.darkMatter} DM</span>`);
    if (cost.thoughtPoints) parts.push(`<span class="cost-item">💭 ${cost.thoughtPoints} TP</span>`);
    if (cost.energy) parts.push(`<span class="cost-item">⚡ ${cost.energy} E</span>`);
    if (cost.cosmicDust) parts.push(`<span class="cost-item">✨ ${cost.cosmicDust} 塵</span>`);
    
    // Advanced resources
    if (cost.refinedMetal) parts.push(`<span class="cost-item">🔧 ${cost.refinedMetal} 精錬金属</span>`);
    if (cost.quantumCrystal) parts.push(`<span class="cost-item">💎 ${cost.quantumCrystal} 量子結晶</span>`);
    if (cost.hyperCrystal) parts.push(`<span class="cost-item">🔮 ${cost.hyperCrystal} ハイパー結晶</span>`);
    if (cost.processedMetal) parts.push(`<span class="cost-item">⚙️ ${cost.processedMetal} 加工金属</span>`);
    if (cost.silicon) parts.push(`<span class="cost-item">🪨 ${cost.silicon} シリコン</span>`);
    if (cost.stabilizedEnergy) parts.push(`<span class="cost-item">⚡ ${cost.stabilizedEnergy} 安定エネルギー</span>`);
    if (cost.quantumPolymer) parts.push(`<span class="cost-item">🧬 ${cost.quantumPolymer} 量子ポリマー</span>`);
    if (cost.ultraAlloy) parts.push(`<span class="cost-item">🛡️ ${cost.ultraAlloy} ウルトラ合金</span>`);
    if (cost.concentratedEnergy) parts.push(`<span class="cost-item">💫 ${cost.concentratedEnergy} 凝縮エネルギー</span>`);
    if (cost.dimensionalEssence) parts.push(`<span class="cost-item">🌌 ${cost.dimensionalEssence} 次元エッセンス</span>`);
    if (cost.exoticMatter) parts.push(`<span class="cost-item">✨ ${cost.exoticMatter} エキゾチック物質</span>`);
    
    return parts.join(' ');
  }

  private formatEffects(effects: any[]): string {
    return '<div class="effects-list">' + effects.map(effect => {
      const value = typeof effect.value === 'number' ? 
        (effect.value >= 1 ? `×${effect.value}` : `${Math.round(effect.value * 100)}%`) : 
        effect.value;
      return `<div class="effect-item">${this.getEffectDescription(effect.type, value)}</div>`;
    }).join('') + '</div>';
  }

  private getEffectDescription(type: string, value: any): string {
    const descriptions: Record<string, string> = {
      'dust_generation_multiplier': `塵生成 ${value}`,
      'energy_conversion_multiplier': `エネルギー変換 ${value}`,
      'all_resource_multiplier': `全資源 ${value}`,
      'unlock_celestial_body': `${value}の作成をアンロック`,
      'life_spawn_chance_multiplier': `生命誕生確率 ${value}`,
      'evolution_speed_multiplier': `進化速度 ${value}`,
      'research_speed_multiplier': `研究速度 ${value}`,
      'dark_matter_generation_multiplier': `DM生成 ${value}`,
      'unlock_time_multiplier': `${value}倍速アンロック`,
    };
    return descriptions[type] || `${type}: ${value}`;
  }

  private formatRequirements(requirements: string[], researchState: ResearchState): string {
    return requirements.map(reqId => {
      const reqItem = allResearchItems.find(item => item.id === reqId);
      const isCompleted = isResearchCompleted(reqId, researchState);
      return `<span class="req-item ${isCompleted ? 'completed' : 'incomplete'}">
        ${reqItem?.name || reqId}
      </span>`;
    }).join(' ');
  }

  private startResearch(item: ResearchItem): void {
    if (!item || !item.id) {
      console.error('[RESEARCH_LAB] Invalid research item');
      return;
    }
    
    console.log('[RESEARCH_LAB] Starting research:', item.id);
    
    // Add visual feedback
    const card = this.itemsGrid?.querySelector(`[data-research-id="${item.id}"]`) as HTMLElement;
    if (card) {
      card.classList.add('researching');
      
      // Create progress bar
      const progressBar = document.createElement('div');
      progressBar.className = 'research-progress-bar';
      progressBar.innerHTML = '<div class="research-progress-fill"></div>';
      card.appendChild(progressBar);
      
      // Animate progress
      const fill = progressBar.querySelector('.research-progress-fill') as HTMLElement;
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        fill.style.width = `${progress}%`;
        if (progress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            card.classList.remove('researching');
            card.classList.add('just-completed');
            progressBar.remove();
            setTimeout(() => {
              card.classList.remove('just-completed');
            }, 1000);
          }, 200);
        }
      }, 50);
    }
    
    const state = gameStateManager.getState();
    
    try {
      // Validate affordability before deducting
      if (!canAffordResearch(item, state.resources, state.advancedResources)) {
        console.error('[RESEARCH_LAB] Cannot afford research:', item.id);
        showMessage('資源が不足しています', 'error');
        return;
      }
      
      // Deduct costs
      gameStateManager.updateState(state => {
        const newState = { ...state };
        const newResources = { ...state.resources };
        const newAdvancedResources = { ...state.advancedResources || {} };
        
        // Deduct basic resources
        if (item.cost.darkMatter) {
          newResources.darkMatter = Math.max(0, newResources.darkMatter - item.cost.darkMatter);
          newState.darkMatter = newResources.darkMatter;
        }
        if (item.cost.thoughtPoints) {
          newResources.thoughtPoints = Math.max(0, newResources.thoughtPoints - item.cost.thoughtPoints);
          newState.thoughtPoints = newResources.thoughtPoints;
        }
        if (item.cost.energy) {
          newResources.energy = Math.max(0, newResources.energy - item.cost.energy);
          newState.energy = newResources.energy;
        }
        if (item.cost.cosmicDust) {
          newResources.cosmicDust = Math.max(0, newResources.cosmicDust - item.cost.cosmicDust);
          newState.cosmicDust = newResources.cosmicDust;
        }
        
        // Deduct advanced resources
        const advancedCosts = Object.keys(item.cost).filter(key => 
          !['darkMatter', 'thoughtPoints', 'energy', 'cosmicDust'].includes(key)
        );
        
        for (const resourceType of advancedCosts) {
          const required = (item.cost as any)[resourceType];
          if (newAdvancedResources[resourceType]) {
            newAdvancedResources[resourceType].amount = Math.max(0, newAdvancedResources[resourceType].amount - required);
          }
        }
        
        newState.resources = newResources;
        newState.advancedResources = newAdvancedResources;
        
        // Mark research as completed
        if (!newState.research) newState.research = {};
        const completedResearch = new Set(state.research?.completedResearch || []);
        completedResearch.add(item.id);
        newState.research = {
          ...state.research,
          completedResearch: Array.from(completedResearch)
        };
        
        // Apply effects
        this.applyResearchEffects(item, newState);
        
        // パラゴン経験値を追加
        const paragonSystem = (window as any).paragonSystem;
        if (paragonSystem) {
            paragonSystem.addExperience('research_complete', 1);
        }
        
        return newState;
      });
    } catch (error) {
      console.error('[RESEARCH_LAB] Failed to start research:', error);
      showMessage('研究の開始に失敗しました', 'error');
    }
    
    // Play sound and show message
    soundManager.playUISound('success');
    showMessage(`研究完了: ${item.name}`, 'success');
    
    // Update display
    this.updateDisplay();
  }

  private applyResearchEffects(item: ResearchItem, state: any): void {
    try {
      // Ensure research object exists
      if (!state.research) state.research = {};
      
      item.effects.forEach(effect => {
        try {
          // Execute custom effect if available
          if (effect.customEffect && typeof effect.customEffect === 'function') {
            effect.customEffect();
          }
          
          switch (effect.type) {
        case 'unlock_celestial_body':
          if (!state.unlockedCelestialBodies) state.unlockedCelestialBodies = {};
          state.unlockedCelestialBodies[effect.value as string] = true;
          break;
        case 'unlock_time_multiplier':
          if (!state.unlockedTimeMultipliers) state.unlockedTimeMultipliers = {};
          state.unlockedTimeMultipliers[`${effect.value}x`] = true;
          break;
        case 'dust_generation_multiplier':
          state.research.dustGenerationMultiplier = (state.research.dustGenerationMultiplier || 1) * (effect.value as number);
          break;
        case 'energy_conversion_multiplier':
          state.research.energyConversionMultiplier = (state.research.energyConversionMultiplier || 1) * (effect.value as number);
          break;
        case 'all_resource_multiplier':
          state.research.allResourceMultiplier = (state.research.allResourceMultiplier || 1) * (effect.value as number);
          break;
        case 'life_spawn_chance_multiplier':
          state.research.lifeSpawnChanceMultiplier = (state.research.lifeSpawnChanceMultiplier || 1) * (effect.value as number);
          break;
        case 'evolution_speed_multiplier':
          state.research.evolutionSpeedMultiplier = (state.research.evolutionSpeedMultiplier || 1) * (effect.value as number);
          break;
        case 'population_growth_multiplier':
          state.research.populationGrowthMultiplier = (state.research.populationGrowthMultiplier || 1) * (effect.value as number);
          break;
        case 'thought_generation_multiplier':
          state.research.thoughtGenerationMultiplier = (state.research.thoughtGenerationMultiplier || 1) * (effect.value as number);
          break;
        case 'research_speed_multiplier':
          state.research.researchSpeedMultiplier = (state.research.researchSpeedMultiplier || 1) * (effect.value as number);
          break;
        case 'dark_matter_generation_multiplier':
          state.research.darkMatterGenerationMultiplier = (state.research.darkMatterGenerationMultiplier || 1) * (effect.value as number);
          break;
        case 'conversion_efficiency_multiplier':
          state.research.conversionEfficiencyMultiplier = (state.research.conversionEfficiencyMultiplier || 1) * (effect.value as number);
          break;
        case 'cosmic_activity_multiplier':
          state.research.cosmicActivityMultiplier = (state.research.cosmicActivityMultiplier || 1) * (effect.value as number);
          break;
        case 'unlock_special_conversion':
          if (!state.unlockedSpecialConversions) state.unlockedSpecialConversions = {};
          state.unlockedSpecialConversions[effect.value as string] = true;
          break;
        case 'unlock_auto_converter':
          if (!state.unlockedAutoConverters) state.unlockedAutoConverters = {};
          state.unlockedAutoConverters[effect.value as string] = true;
          break;
        case 'unlock_visualization':
          if (!state.unlockedVisualizations) state.unlockedVisualizations = {};
          state.unlockedVisualizations[effect.value as string] = true;
          break;
        case 'unlock_feature':
          if (!state.unlockedFeatures) state.unlockedFeatures = {};
          state.unlockedFeatures[effect.value as string] = true;
          
          // Handle automation unlocks through unlockManager
          const featureId = effect.value as string;
          if (featureId.startsWith('automation_')) {
            // Trigger unlock check after state update
            setTimeout(() => {
              const unlockManager = (window as any).unlockManager;
              if (unlockManager) {
                unlockManager.checkUnlocks();
              }
            }, 100);
          }
          break;
        default:
          console.warn('[RESEARCH_LAB] Unknown effect type:', effect.type);
      }
        } catch (effectError) {
          console.error('[RESEARCH_LAB] Failed to apply effect:', effect.type, effectError);
        }
      });
    } catch (error) {
      console.error('[RESEARCH_LAB] Failed to apply research effects:', error);
    }
  }

  private getResearchState(): ResearchState {
    const state = gameStateManager.getState();
    const completedSet = new Set<string>(state.research?.completedResearch || []);
    
    // Map old research flags to new IDs for backward compatibility
    if (state.researchEnhancedDust) {
      completedSet.add('enhanced_dust_generation');
      console.log('[RESEARCH_LAB] Migrated old research flag: researchEnhancedDust');
    }
    if (state.researchAdvancedEnergy) {
      completedSet.add('advanced_energy_conversion');
      console.log('[RESEARCH_LAB] Migrated old research flag: researchAdvancedEnergy');
    }
    if (state.unlockedCelestialBodies?.moon) {
      completedSet.add('orbital_mechanics');
      console.log('[RESEARCH_LAB] Migrated unlocked celestial body: moon');
    }
    if (state.unlockedCelestialBodies?.dwarfPlanet) {
      completedSet.add('dwarf_planet_science');
      console.log('[RESEARCH_LAB] Migrated unlocked celestial body: dwarfPlanet');
    }
    if (state.unlockedCelestialBodies?.planet) {
      completedSet.add('planetary_formation');
      console.log('[RESEARCH_LAB] Migrated unlocked celestial body: planet');
    }
    if (state.unlockedCelestialBodies?.star) {
      completedSet.add('stellar_genesis');
      console.log('[RESEARCH_LAB] Migrated unlocked celestial body: star');
    }
    
    // Calculate research speed multiplier
    const researchSpeed = state.research?.researchSpeedMultiplier || 1;
    
    // Build available research set
    const availableResearch = new Set<string>();
    allResearchItems.forEach(item => {
      if (!completedSet.has(item.id) && isResearchAvailable(item, { completedResearch: completedSet, activeResearch: new Map(), researchSpeed, availableResearch })) {
        availableResearch.add(item.id);
      }
    });
    
    return {
      completedResearch: completedSet,
      activeResearch: new Map(state.research?.activeResearch || []),
      researchSpeed,
      availableResearch
    };
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
      const researchState = this.getResearchState();
      completedCount.textContent = researchState.completedResearch.size.toString();
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
  try {
    if (!researchLabUI) {
      researchLabUI = new ResearchLabUI();
      console.log('[RESEARCH_LAB] Research lab UI initialized');
    }
  } catch (error) {
    console.error('[RESEARCH_LAB] Failed to initialize research lab:', error);
    researchLabUI = null;
  }
}

export function getResearchLabUI(): ResearchLabUI | null {
  if (!researchLabUI) {
    console.warn('[RESEARCH_LAB] Research lab UI not initialized');
  }
  return researchLabUI;
}