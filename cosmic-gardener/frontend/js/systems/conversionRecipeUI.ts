// Modern Conversion Recipe UI System

import { conversionEngine } from '../conversionEngine.js';
import { CONVERSION_RECIPES, getAvailableRecipes } from '../conversionRecipes.js';
import { RESOURCE_METADATA, QUALITY_MULTIPLIERS } from '../resourceSystem.js';
import { gameState } from '../state.js';
import { formatNumber } from '../utils.js';
import { showMessage } from '../ui.js';

export class ConversionRecipeUI {
    private container: HTMLElement | null = null;
    private filterCategory: string = 'all';
    private searchQuery: string = '';
    private sortBy: 'name' | 'time' | 'efficiency' = 'name';
    private updateInterval: number | null = null;
    private batchValues: Map<string, number> = new Map();
    
    constructor() {
        // Init will be called when user clicks the toggle button
    }
    
    public init(isEmbed: boolean = false): void {
        console.log('[ConversionRecipeUI] Initializing...', isEmbed ? '(embed mode)' : '(standalone mode)');
        
        // 埋め込み版か通常版かでIDを切り替える
        const containerId = isEmbed ? 'conversion-recipes-list-embed' : 'conversion-recipes-list';
        const existingContainer = document.getElementById(containerId);
        
        console.log('[ConversionRecipeUI] Looking for container:', containerId);
        console.log('[ConversionRecipeUI] Existing container:', existingContainer);
        console.log('[ConversionRecipeUI] Container display style:', existingContainer?.style.display);
        console.log('[ConversionRecipeUI] Container parent:', existingContainer?.parentElement);
        
        if (existingContainer) {
            console.log('[ConversionRecipeUI] Container found');
            this.container = existingContainer;
            
            // Get parent containers
            const parentContainer = existingContainer.parentElement; // collapsible-content
            const collapsibleSection = parentContainer?.parentElement; // collapsible-section
            const productionPanelContent = collapsibleSection?.parentElement; // production-panel-content
            const productionPanel = document.getElementById('production-panel'); // Get the main production panel
            
            console.log('[ConversionRecipeUI] DOM hierarchy:');
            console.log('  - existingContainer:', existingContainer.id);
            console.log('  - parentContainer:', parentContainer?.className);
            console.log('  - collapsibleSection:', collapsibleSection?.className);
            console.log('  - productionPanelContent:', productionPanelContent?.className);
            console.log('  - productionPanel:', productionPanel?.id);
            
            // 埋め込み版の場合は、既存のコンテナをそのまま使う
            if (isEmbed) {
                console.log('[ConversionRecipeUI] Using embed mode - directly using existing container');
                this.setupNewLayout();
                return;
            }
            
            if (productionPanel) {
                console.log('[ConversionRecipeUI] Using production panel as insertion point');
                
                // Check if modern UI wrapper already exists
                let newContainer = document.getElementById('modern-recipe-ui-wrapper');
                if (!newContainer) {
                    console.log('[ConversionRecipeUI] Creating new modern UI wrapper');
                    // Create a new container outside of the existing structure
                    newContainer = document.createElement('div');
                    newContainer.id = 'modern-recipe-ui-wrapper';
                    newContainer.style.cssText = `
                        width: 100%;
                        min-height: 600px;
                        margin: 10px 0;
                        padding: 0;
                        display: block;
                        position: relative;
                        z-index: 20000;
                        background: #ff00ff !important;
                        border: 5px solid #00ff00 !important;
                        border-radius: 20px;
                    `;
                    
                    // Try different insertion strategies
                    // Strategy: Insert after production-panel-content but still inside production-panel
                    const productionPanelContentDiv = productionPanel.querySelector('.production-panel-content');
                    if (productionPanelContentDiv && productionPanelContentDiv.parentElement) {
                        // Insert after production-panel-content
                        productionPanelContentDiv.parentElement.insertBefore(newContainer, productionPanelContentDiv.nextSibling);
                        console.log('[ConversionRecipeUI] Modern UI wrapper inserted after production-panel-content');
                    } else {
                        // Fallback: Insert at the end of production panel
                        productionPanel.appendChild(newContainer);
                        console.log('[ConversionRecipeUI] Modern UI wrapper inserted at end of production panel');
                    }
                    
                    // Log the final DOM structure
                    console.log('[ConversionRecipeUI] Final DOM structure:');
                    console.log('  - Parent of newContainer:', newContainer.parentElement?.id || newContainer.parentElement?.className);
                    console.log('  - Previous sibling:', newContainer.previousElementSibling?.className);
                    console.log('  - Next sibling:', newContainer.nextElementSibling?.className);
                    
                    // Check parent styles
                    console.log('[ConversionRecipeUI] Parent container computed styles:');
                    const parentStyles = window.getComputedStyle(parentContainer);
                    console.log('  - display:', parentStyles.display);
                    console.log('  - visibility:', parentStyles.visibility);
                    console.log('  - overflow:', parentStyles.overflow);
                    console.log('  - height:', parentStyles.height);
                    console.log('  - max-height:', parentStyles.maxHeight);
                } else {
                    console.log('[ConversionRecipeUI] Modern UI wrapper already exists');
                    newContainer.style.display = 'block';
                }
                
                // Hide the entire collapsible section instead of just the content
                if (collapsibleSection) {
                    collapsibleSection.style.display = 'none';
                    console.log('[ConversionRecipeUI] Collapsible section hidden');
                }
                
                // Scroll the production panel to show the new content
                setTimeout(() => {
                    if (productionPanel) {
                        // Scroll to the new container
                        newContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('[ConversionRecipeUI] Scrolled to modern UI');
                    }
                }, 100);
                
                // Double-check the new container is visible
                console.log('[ConversionRecipeUI] New container visibility check:');
                const newContainerStyles = window.getComputedStyle(newContainer);
                console.log('  - display:', newContainerStyles.display);
                console.log('  - visibility:', newContainerStyles.visibility);
                console.log('  - position:', newContainerStyles.position);
                console.log('  - z-index:', newContainerStyles.zIndex);
                console.log('  - width:', newContainerStyles.width);
                console.log('  - height:', newContainerStyles.height);
                console.log('  - offsetParent:', newContainer.offsetParent);
                console.log('  - getBoundingClientRect:', newContainer.getBoundingClientRect());
                
                // Use new container
                this.container = newContainer;
                console.log('[ConversionRecipeUI] Using modern UI wrapper as container');
            } else {
                console.error('[ConversionRecipeUI] Parent containers not found!');
            }
            
            this.setupNewLayout();
        } else {
            console.error('[ConversionRecipeUI] Container not found!');
        }
    }
    
    private setupNewLayout(): void {
        if (!this.container) {
            console.error('[ConversionRecipeUI] No container!');
            return;
        }
        console.log('[ConversionRecipeUI] Setting up new layout...');
        console.log('[ConversionRecipeUI] Container before setup:', this.container);
        console.log('[ConversionRecipeUI] Container ID:', this.container.id);
        
        // まず既存の内容をクリア
        this.container.innerHTML = '';
        
        // テスト用の簡単な内容を表示
        this.container.innerHTML = `
            <div style="
                background: #ff00ff !important;
                color: #ffffff !important;
                padding: 40px !important;
                font-size: 24px !important;
                text-align: center !important;
                border: 5px solid #00ff00 !important;
                margin: 20px 0 !important;
            ">
                🎉 モダンUIが読み込まれました！🎉<br>
                <span style="font-size: 16px;">これが表示されていれば、正しく動作しています。</span>
            </div>
        `;
        
        console.log('[ConversionRecipeUI] Test content inserted');
        console.log('[ConversionRecipeUI] Container innerHTML length:', this.container.innerHTML.length);
        
        return; // 一旦ここで終了してテスト
        console.log('[ConversionRecipeUI] Container computed style:', window.getComputedStyle(this.container).display);
        
        // Clear existing content and set up new structure immediately
        this.container.innerHTML = `
            <div class="recipe-ui-container" style="
                background: 
                    radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                    radial-gradient(ellipse at bottom right, rgba(236, 72, 153, 0.15) 0%, transparent 50%),
                    linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
                border: 2px solid rgba(139, 92, 246, 0.3) !important;
                border-radius: 20px !important;
                box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4), inset 0 0 40px rgba(139, 92, 246, 0.1) !important;
                min-height: 600px !important;
                padding: 0 !important;
                position: relative !important;
                overflow: hidden !important;
            ">
                <!-- Modern UI Banner -->
                <div class="modern-ui-banner" style="
                    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%) !important;
                    padding: 30px !important;
                    text-align: center !important;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
                    position: relative !important;
                    overflow: hidden !important;
                ">
                    <h2 class="modern-ui-title" style="
                        font-size: 32px !important;
                        font-weight: 700 !important;
                        color: #fff !important;
                        margin: 0 !important;
                        text-shadow: 0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(139, 92, 246, 0.5) !important;
                    ">
                        <span class="banner-icon" style="font-size: 36px !important; margin-right: 15px !important;">✨</span>
                        モダン変換レシピUI
                        <span class="banner-version" style="
                            font-size: 14px !important;
                            background: rgba(255, 255, 255, 0.2) !important;
                            padding: 2px 10px !important;
                            border-radius: 12px !important;
                            margin-left: 15px !important;
                            vertical-align: middle !important;
                        ">v2.0</span>
                    </h2>
                    <p class="modern-ui-subtitle" style="
                        font-size: 16px !important;
                        color: rgba(255, 255, 255, 0.9) !important;
                        margin: 10px 0 0 0 !important;
                    ">新しいインターフェースで効率的な資源管理を</p>
                </div>
                <!-- Header with filters and search -->
                <div class="recipe-ui-header" style="
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 20px 30px !important;
                    gap: 20px !important;
                    background: rgba(0, 0, 0, 0.2) !important;
                    border-bottom: 1px solid rgba(139, 92, 246, 0.2) !important;
                ">
                    <div class="recipe-search-bar" style="
                        position: relative !important;
                        flex: 1 !important;
                        max-width: 400px !important;
                    ">
                        <input type="text" 
                               id="recipe-search" 
                               placeholder="レシピを検索..." 
                               class="recipe-search-input"
                               style="
                                   width: 100% !important;
                                   padding: 15px 45px 15px 20px !important;
                                   background: rgba(255, 255, 255, 0.05) !important;
                                   border: 2px solid rgba(139, 92, 246, 0.5) !important;
                                   border-radius: 50px !important;
                                   color: #fff !important;
                                   font-size: 16px !important;
                                   backdrop-filter: blur(10px) !important;
                               ">
                        <span class="search-icon" style="
                            position: absolute !important;
                            right: 15px !important;
                            top: 50% !important;
                            transform: translateY(-50%) !important;
                            font-size: 20px !important;
                        ">🔍</span>
                    </div>
                    
                    <div class="recipe-filters">
                        <select id="recipe-category-filter" class="recipe-filter-select">
                            <option value="all">すべてのカテゴリ</option>
                            <option value="basic">基本資源</option>
                            <option value="advanced">高度な資源</option>
                            <option value="energy">エネルギー</option>
                            <option value="special">特殊</option>
                        </select>
                        
                        <select id="recipe-sort" class="recipe-filter-select">
                            <option value="name">名前順</option>
                            <option value="time">変換時間順</option>
                            <option value="efficiency">効率順</option>
                        </select>
                        
                        <button id="recipe-view-toggle" class="recipe-view-toggle">
                            <span class="view-icon">📋</span>
                        </button>
                    </div>
                </div>
                
                <!-- Stats bar -->
                <div class="recipe-stats-bar" style="
                    display: flex !important;
                    gap: 30px !important;
                    justify-content: center !important;
                    padding: 20px 30px !important;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%), rgba(0, 0, 0, 0.3) !important;
                    border-top: 1px solid rgba(139, 92, 246, 0.2) !important;
                    border-bottom: 1px solid rgba(139, 92, 246, 0.2) !important;
                ">
                    <div class="recipe-stat">
                        <span class="stat-label" style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 1px !important;">利用可能:</span>
                        <span class="stat-value" id="available-recipes-count" style="
                            background: linear-gradient(135deg, #8b5cf6, #ec4899) !important;
                            -webkit-background-clip: text !important;
                            -webkit-text-fill-color: transparent !important;
                            background-clip: text !important;
                            font-weight: 700 !important;
                            font-size: 24px !important;
                        ">0</span>
                    </div>
                    <div class="recipe-stat">
                        <span class="stat-label" style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 1px !important;">実行中:</span>
                        <span class="stat-value" id="active-conversions-count" style="
                            background: linear-gradient(135deg, #8b5cf6, #ec4899) !important;
                            -webkit-background-clip: text !important;
                            -webkit-text-fill-color: transparent !important;
                            background-clip: text !important;
                            font-weight: 700 !important;
                            font-size: 24px !important;
                        ">0</span>
                    </div>
                    <div class="recipe-stat">
                        <span class="stat-label" style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 1px !important;">効率平均:</span>
                        <span class="stat-value" id="avg-efficiency" style="
                            background: linear-gradient(135deg, #8b5cf6, #ec4899) !important;
                            -webkit-background-clip: text !important;
                            -webkit-text-fill-color: transparent !important;
                            background-clip: text !important;
                            font-weight: 700 !important;
                            font-size: 24px !important;
                        ">0%</span>
                    </div>
                </div>
                
                <!-- Recipe grid/list -->
                <div id="recipe-display-area" class="recipe-display-area list-view" style="
                    flex: 1 !important;
                    overflow-y: auto !important;
                    padding: 20px !important;
                    background: rgba(0, 0, 0, 0.2) !important;
                    max-height: 600px !important;
                    position: relative !important;
                ">
                    <!-- Recipes will be populated here -->
                </div>
            </div>
        `;
        
        console.log('[ConversionRecipeUI] HTML content set');
        console.log('[ConversionRecipeUI] Container innerHTML length:', this.container.innerHTML.length);
        console.log('[ConversionRecipeUI] Container children:', this.container.children.length);
        console.log('[ConversionRecipeUI] Container offsetHeight:', this.container.offsetHeight);
        console.log('[ConversionRecipeUI] Container offsetWidth:', this.container.offsetWidth);
        
        // Force browser to recalculate layout
        this.container.offsetHeight; // Trigger reflow
        
        this.setupEventListeners();
        this.startUpdateLoop();
        this.update();
        
        console.log('[ConversionRecipeUI] Setup complete');
        
        // Final visibility check
        console.log('[ConversionRecipeUI] Final container check:');
        console.log('  - Container ID:', this.container.id);
        console.log('  - Container parent:', this.container.parentElement);
        console.log('  - Container innerHTML length:', this.container.innerHTML.length);
        console.log('  - Container children:', this.container.children.length);
        console.log('  - First child:', this.container.firstElementChild);
        
        // Check if the container is in the viewport
        const rect = this.container.getBoundingClientRect();
        console.log('  - Container position:', {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            inViewport: rect.top < window.innerHeight && rect.bottom > 0
        });
    }
    
    private setupEventListeners(): void {
        console.log('[ConversionRecipeUI] Setting up event listeners...');
        
        // Search input
        const searchInput = document.getElementById('recipe-search') as HTMLInputElement;
        if (searchInput) {
            console.log('[ConversionRecipeUI] Search input found');
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
                this.update();
            });
        } else {
            console.warn('[ConversionRecipeUI] Search input not found!');
        }
        
        // Category filter
        const categoryFilter = document.getElementById('recipe-category-filter') as HTMLSelectElement;
        categoryFilter?.addEventListener('change', (e) => {
            this.filterCategory = (e.target as HTMLSelectElement).value;
            this.update();
        });
        
        // Sort filter
        const sortFilter = document.getElementById('recipe-sort') as HTMLSelectElement;
        sortFilter?.addEventListener('change', (e) => {
            this.sortBy = (e.target as HTMLSelectElement).value as 'name' | 'time' | 'efficiency';
            this.update();
        });
        
        // View toggle
        const viewToggle = document.getElementById('recipe-view-toggle');
        viewToggle?.addEventListener('click', () => {
            const displayArea = document.getElementById('recipe-display-area');
            if (displayArea) {
                displayArea.classList.toggle('grid-view');
                displayArea.classList.toggle('list-view');
            }
        });
    }
    
    private getRecipeCategory(recipe: any): string {
        // Determine category based on recipe outputs
        const outputTypes = recipe.outputs.resources.map((r: any) => r.type);
        
        if (outputTypes.some((t: string) => t.includes('ENERGY'))) return 'energy';
        if (outputTypes.some((t: string) => t.includes('ADVANCED') || t.includes('QUANTUM'))) return 'advanced';
        if (outputTypes.some((t: string) => t.includes('DARK') || t.includes('EXOTIC'))) return 'special';
        
        return 'basic';
    }
    
    private filterAndSortRecipes(recipes: any[]): any[] {
        // Filter by category
        let filtered = recipes;
        if (this.filterCategory !== 'all') {
            filtered = recipes.filter(r => this.getRecipeCategory(r) === this.filterCategory);
        }
        
        // Filter by search query
        if (this.searchQuery) {
            filtered = filtered.filter(r => {
                const searchLower = this.searchQuery.toLowerCase();
                return r.name.toLowerCase().includes(searchLower) ||
                       r.description.toLowerCase().includes(searchLower);
            });
        }
        
        // Sort
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'time':
                    return a.time - b.time;
                case 'efficiency':
                    return (b.efficiency || 1) - (a.efficiency || 1);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        
        return filtered;
    }
    
    private renderRecipeCard(recipe: any, canAfford: boolean): string {
        const maxConversions = conversionEngine.getMaxConversions(recipe.id);
        const batchValue = this.batchValues.get(recipe.id) || 1;
        const categoryClass = `category-${this.getRecipeCategory(recipe)}`;
        
        return `
            <div class="modern-recipe-card ${categoryClass} ${canAfford ? 'affordable' : 'unaffordable'}" data-recipe-id="${recipe.id}" style="
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%) !important;
                border: 2px solid rgba(139, 92, 246, 0.3) !important;
                border-radius: 16px !important;
                padding: 20px !important;
                margin-bottom: 15px !important;
                box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2) !important;
            ">
                <div class="recipe-header" style="
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 15px !important;
                    padding-bottom: 10px !important;
                    border-bottom: 1px solid rgba(139, 92, 246, 0.2) !important;
                ">
                    <h3 class="recipe-title" style="
                        margin: 0 !important;
                        font-size: 20px !important;
                        background: linear-gradient(135deg, #fff, #e0e0ff) !important;
                        -webkit-background-clip: text !important;
                        -webkit-text-fill-color: transparent !important;
                        background-clip: text !important;
                        font-weight: 600 !important;
                    ">${recipe.name}</h3>
                    <span class="recipe-time" style="
                        background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2)) !important;
                        padding: 6px 12px !important;
                        border-radius: 20px !important;
                        font-size: 14px !important;
                        color: #ec4899 !important;
                        border: 1px solid rgba(236, 72, 153, 0.3) !important;
                        font-weight: 500 !important;
                    ">${recipe.time}s</span>
                </div>
                
                <p class="recipe-desc">${recipe.description}</p>
                
                <div class="recipe-resources">
                    <div class="recipe-inputs">
                        <span class="resource-label">必要:</span>
                        <div class="resource-list">
                            ${recipe.inputs.resources.map((r: any) => {
                                const meta = RESOURCE_METADATA[r.type];
                                return `
                                    <div class="resource-item">
                                        <span class="resource-icon">${meta.icon}</span>
                                        <span class="resource-amount">${formatNumber(r.amount)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="recipe-arrow">→</div>
                    
                    <div class="recipe-outputs">
                        <span class="resource-label">生産:</span>
                        <div class="resource-list">
                            ${recipe.outputs.resources.map((r: any) => {
                                const meta = RESOURCE_METADATA[r.type];
                                const qualityColor = QUALITY_MULTIPLIERS[r.quality].color;
                                return `
                                    <div class="resource-item" style="color: ${qualityColor}">
                                        <span class="resource-icon">${meta.icon}</span>
                                        <span class="resource-amount">${formatNumber(r.amount)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
                
                ${recipe.byproducts ? `
                    <div class="recipe-byproducts">
                        <span class="byproduct-label">副産物:</span>
                        ${recipe.byproducts.map((b: any) => {
                            const meta = RESOURCE_METADATA[b.type];
                            return `<span class="byproduct-item">${meta.icon} ${b.amount} (${Math.round(b.chance * 100)}%)</span>`;
                        }).join(' ')}
                    </div>
                ` : ''}
                
                <div class="recipe-footer">
                    <div class="recipe-efficiency">
                        効率: ${Math.round((recipe.efficiency || 1) * 100)}%
                    </div>
                    
                    <div class="recipe-controls">
                        ${canAfford ? `
                            <button class="convert-btn single-convert" data-recipe-id="${recipe.id}">
                                変換
                            </button>
                            
                            <div class="batch-controls">
                                <input type="number" 
                                       class="batch-input" 
                                       data-recipe-id="${recipe.id}"
                                       min="1" 
                                       max="${maxConversions}" 
                                       value="${batchValue}">
                                <button class="convert-btn batch-convert" data-recipe-id="${recipe.id}">
                                    ⚡ 一括
                                </button>
                            </div>
                        ` : `
                            <button class="convert-btn disabled" disabled>
                                資源不足
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    private update(): void {
        const displayArea = document.getElementById('recipe-display-area');
        if (!displayArea) return;
        
        // Get available recipes
        const availableRecipes = getAvailableRecipes(
            gameState.discoveredTechnologies,
            gameState.availableFacilities
        );
        
        // Filter and sort
        const processedRecipes = this.filterAndSortRecipes(availableRecipes);
        
        // Update stats
        this.updateStats(availableRecipes);
        
        // Render recipes
        const html = processedRecipes.map(recipe => {
            const canAfford = conversionEngine.canAffordRecipe(recipe.id);
            return this.renderRecipeCard(recipe, canAfford);
        }).join('');
        
        displayArea.innerHTML = html || `
            <div class="no-recipes" style="
                text-align: center !important;
                color: rgba(255, 255, 255, 0.5) !important;
                padding: 60px !important;
                font-size: 18px !important;
                background: rgba(139, 92, 246, 0.05) !important;
                border: 2px dashed rgba(139, 92, 246, 0.2) !important;
                border-radius: 16px !important;
                margin: 20px !important;
            ">利用可能なレシピがありません</div>
        `;
        
        // Attach event listeners to new elements
        this.attachRecipeEventListeners();
    }
    
    private updateStats(recipes: any[]): void {
        // Available recipes count
        const availableCount = recipes.filter(r => conversionEngine.canAffordRecipe(r.id)).length;
        const availableElement = document.getElementById('available-recipes-count');
        if (availableElement) {
            availableElement.textContent = `${availableCount}/${recipes.length}`;
        }
        
        // Active conversions
        const activeConversions = conversionEngine.getActiveConversions();
        const activeElement = document.getElementById('active-conversions-count');
        if (activeElement) {
            activeElement.textContent = activeConversions.length.toString();
        }
        
        // Average efficiency
        const avgEfficiency = recipes.reduce((sum, r) => sum + (r.efficiency || 1), 0) / recipes.length;
        const efficiencyElement = document.getElementById('avg-efficiency');
        if (efficiencyElement) {
            efficiencyElement.textContent = `${Math.round(avgEfficiency * 100)}%`;
        }
    }
    
    private attachRecipeEventListeners(): void {
        // Single convert buttons
        document.querySelectorAll('.single-convert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeId = (e.target as HTMLElement).dataset.recipeId;
                if (recipeId) {
                    conversionEngine.startConversion(recipeId, undefined, true);
                    this.update();
                }
            });
        });
        
        // Batch convert buttons
        document.querySelectorAll('.batch-convert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeId = (e.target as HTMLElement).dataset.recipeId;
                if (!recipeId) return;
                
                const input = document.querySelector(`.batch-input[data-recipe-id="${recipeId}"]`) as HTMLInputElement;
                if (!input) return;
                
                const count = parseInt(input.value) || 1;
                const result = conversionEngine.startBatchConversion(recipeId, count);
                
                if (result.started > 0) {
                    showMessage(`${result.started}個の変換を開始しました`, 2000);
                } else if (result.reason) {
                    showMessage(result.reason, 2000);
                }
                
                this.update();
            });
        });
        
        // Batch input changes
        document.querySelectorAll('.batch-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const recipeId = target.dataset.recipeId;
                if (recipeId) {
                    const value = parseInt(target.value) || 1;
                    this.batchValues.set(recipeId, value);
                }
            });
        });
    }
    
    private startUpdateLoop(): void {
        this.updateInterval = setInterval(() => {
            this.update();
        }, 1000);
    }
    
    public destroy(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Create and export instance
export const conversionRecipeUI = new ConversionRecipeUI();