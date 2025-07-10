// Production Tab UI Management

import { 
    ResourceType, 
    QualityTier, 
    RESOURCE_METADATA,
    getResourceDisplayName,
    getQualityName,
    QUALITY_MULTIPLIERS
} from './resourceSystem.js';
import { CONVERSION_RECIPES, getAvailableRecipes } from './conversionRecipes.js';
import { conversionEngine } from './conversionEngine.js';
import { gameState } from './state.js';
import { formatNumber } from './utils.js';
import { resourceParticleSystem } from './resourceParticles.js';
import { isProductionPanelVisible } from './ui.js';

let lastProductionUIUpdate = 0;
const PRODUCTION_UI_UPDATE_INTERVAL = 100; // 0.1 seconds

// UI Elements
let advancedResourcesDisplay: HTMLElement | null;
let conversionRecipesList: HTMLElement | null;
let activeConversionsList: HTMLElement | null;
let productionFacilitiesList: HTMLElement | null;

export function initProductionUI(): void {
    console.log('🚀 Production UI initializing...');
    
    // Get UI elements
    advancedResourcesDisplay = document.getElementById('advanced-resources-display');
    conversionRecipesList = document.getElementById('conversion-recipes-list');
    activeConversionsList = document.getElementById('active-conversions-list');
    productionFacilitiesList = document.getElementById('production-facilities-list');
    
    console.log('📦 Production UI elements:', {
        advancedResourcesDisplay: !!advancedResourcesDisplay,
        conversionRecipesList: !!conversionRecipesList,
        activeConversionsList: !!activeConversionsList,
        productionFacilitiesList: !!productionFacilitiesList
    });
    
    // Add event listeners for collapsible sections
    const headers = [
        'advancedResourcesHeader',
        'conversionRecipesHeader', 
        'activeConversionsHeader',
        'productionFacilitiesHeader'
    ];
    
    headers.forEach(headerId => {
        const header = document.getElementById(headerId);
        if (header) {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const content = header.nextElementSibling;
                if (content) {
                    content.classList.toggle('active');
                }
            });
        }
    });
}

export function updateProductionUI(force: boolean = false): void {
    // Only update if panel is visible or force update
    if (!force && !isProductionPanelVisible()) {
        return;
    }
    
    const now = Date.now();
    if (!force && now - lastProductionUIUpdate < PRODUCTION_UI_UPDATE_INTERVAL) {
        return;
    }
    lastProductionUIUpdate = now;
    
    updateAdvancedResourcesDisplay();
    updateConversionRecipesList();
    updateActiveConversionsList();
    updateProductionFacilitiesList();
}

function updateAdvancedResourcesDisplay(): void {
    if (!advancedResourcesDisplay || !gameState.advancedResources) return;
    
    const resources = gameState.advancedResources;
    const html: string[] = [];
    
    // Group resources by category
    const categories: Record<string, ResourceType[]> = {
        dust: [],
        energy: [],
        organic: [],
        biomass: [],
        dark: [],
        thought: [],
        processed: []
    };
    
    Object.keys(resources).forEach(key => {
        const type = key as ResourceType;
        const metadata = RESOURCE_METADATA[type];
        if (metadata && resources[type] && resources[type].amount > 0) {
            categories[metadata.category].push(type);
        }
    });
    
    // Display by category
    Object.entries(categories).forEach(([category, types]) => {
        if (types.length === 0) return;
        
        const categoryName = getCategoryDisplayName(category);
        html.push(`<div class="resource-category">`);
        html.push(`<h3>${categoryName}</h3>`);
        
        types.forEach(type => {
            const resource = resources[type];
            const metadata = RESOURCE_METADATA[type];
            const qualityColor = QUALITY_MULTIPLIERS[resource.quality].color;
            
            const qualityClass = `quality-${getQualityName(resource.quality).toLowerCase().replace(' ', '-')}`;
            html.push(`
                <div class="advanced-resource-item ${qualityClass}" data-resource-type="${type}" data-quality="${resource.quality}">
                    <span class="resource-icon">${metadata.icon}</span>
                    <span class="resource-name" style="color: ${qualityColor}">
                        ${getResourceDisplayName(type, resource.quality)}
                    </span>
                    <span class="resource-amount">${formatNumber(resource.amount)}</span>
                </div>
            `);
        });
        
        html.push(`</div>`);
    });
    
    if (html.length === 0) {
        html.push('<p class="no-resources">まだ高度な資源がありません</p>');
    }
    
    advancedResourcesDisplay.innerHTML = html.join('');
    
    // Add quality glow effects to high-quality resources
    advancedResourcesDisplay.querySelectorAll('.advanced-resource-item').forEach(item => {
        const quality = parseInt(item.getAttribute('data-quality') || '1');
        if (quality >= QualityTier.HIGH_QUALITY) {
            resourceParticleSystem.addQualityGlow(item as HTMLElement, quality);
        }
    });
}

function updateConversionRecipesList(): void {
    if (!conversionRecipesList) return;
    
    const availableRecipes = getAvailableRecipes(
        gameState.discoveredTechnologies,
        gameState.availableFacilities
    );
    
    const html: string[] = [];
    
    availableRecipes.forEach(recipe => {
        const canAfford = conversionEngine.canAffordRecipe(recipe.id);
        const buttonClass = canAfford ? 'convert-button' : 'convert-button disabled';
        
        html.push(`
            <div class="conversion-recipe ${canAfford ? '' : 'unavailable'}">
                <h4>${recipe.name}</h4>
                <p class="recipe-description">${recipe.description}</p>
                <div class="recipe-io">
                    <div class="recipe-inputs">
                        <strong>必要:</strong>
                        ${recipe.inputs.resources.map(r => {
                            const meta = RESOURCE_METADATA[r.type];
                            return `<span>${meta.icon} ${formatNumber(r.amount)} ${meta.name}</span>`;
                        }).join(', ')}
                    </div>
                    <div class="recipe-outputs">
                        <strong>生産:</strong>
                        ${recipe.outputs.resources.map(r => {
                            const meta = RESOURCE_METADATA[r.type];
                            const qualityColor = QUALITY_MULTIPLIERS[r.quality].color;
                            return `<span style="color: ${qualityColor}">${meta.icon} ${formatNumber(r.amount)} ${meta.name}</span>`;
                        }).join(', ')}
                    </div>
                </div>
                <div class="recipe-stats">
                    <span>時間: ${recipe.time}秒</span>
                    <span>効率: ${Math.round(recipe.efficiency * 100)}%</span>
                </div>
                <button class="${buttonClass}" data-recipe-id="${recipe.id}">
                    ${canAfford ? '変換開始' : '資源不足'}
                </button>
            </div>
        `);
    });
    
    if (html.length === 0) {
        html.push('<p class="no-recipes">利用可能なレシピがありません</p>');
    }
    
    conversionRecipesList.innerHTML = html.join('');
    
    // Add click handlers
    conversionRecipesList.querySelectorAll('.convert-button:not(.disabled)').forEach(button => {
        button.addEventListener('click', (e) => {
            const recipeId = (e.target as HTMLElement).getAttribute('data-recipe-id');
            if (recipeId) {
                conversionEngine.startConversion(recipeId, undefined, true);
                updateProductionUI(true);
            }
        });
    });
}

function updateActiveConversionsList(): void {
    if (!activeConversionsList) return;
    
    const activeConversions = conversionEngine.getActiveConversions();
    const html: string[] = [];
    
    activeConversions.forEach(conversion => {
        const progressPercent = Math.round(conversion.progress * 100);
        const remainingTime = Math.ceil(conversion.remainingTime);
        
        html.push(`
            <div class="active-conversion">
                <h4>${conversion.recipe.name}</h4>
                <div class="conversion-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${progressPercent}% (残り ${remainingTime}秒)</span>
                </div>
                ${conversion.facility ? `<p class="facility-name">施設: ${conversion.facility.name}</p>` : ''}
            </div>
        `);
    });
    
    if (html.length === 0) {
        html.push('<p class="no-conversions">アクティブな変換はありません</p>');
    }
    
    activeConversionsList.innerHTML = html.join('');
}

function updateProductionFacilitiesList(): void {
    if (!productionFacilitiesList) return;
    
    const facilities = conversionEngine.getAllFacilities();
    const html: string[] = [];
    
    facilities.forEach(facility => {
        const isBusy = conversionEngine.isFacilityBusy(facility.id);
        const statusText = isBusy ? '稼働中' : (facility.isActive ? '待機中' : '停止中');
        const statusClass = isBusy ? 'busy' : (facility.isActive ? 'idle' : 'inactive');
        
        html.push(`
            <div class="production-facility ${statusClass}">
                <h4>${facility.name}</h4>
                <div class="facility-info">
                    <span>レベル: ${facility.level}</span>
                    <span>効率: ${Math.round(facility.efficiency * 100)}%</span>
                    <span>状態: ${statusText}</span>
                </div>
                ${facility.currentRecipe ? `
                    <div class="facility-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${facility.progress}%"></div>
                        </div>
                    </div>
                ` : ''}
                <div class="facility-controls">
                    <button class="toggle-auto ${facility.autoMode ? 'active' : ''}" 
                            data-facility-id="${facility.id}">
                        自動モード: ${facility.autoMode ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
        `);
    });
    
    if (html.length === 0) {
        html.push('<p class="no-facilities">生産施設がありません</p>');
    }
    
    productionFacilitiesList.innerHTML = html.join('');
    
    // Add click handlers for auto-mode toggle
    productionFacilitiesList.querySelectorAll('.toggle-auto').forEach(button => {
        button.addEventListener('click', (e) => {
            const facilityId = (e.target as HTMLElement).getAttribute('data-facility-id');
            if (facilityId) {
                const facility = conversionEngine.getFacility(facilityId);
                if (facility) {
                    facility.autoMode = !facility.autoMode;
                    updateProductionUI(true);
                }
            }
        });
    });
}

function getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
        dust: '宇宙塵派生',
        energy: 'エネルギー派生',
        organic: '有機物派生',
        biomass: 'バイオマス派生',
        dark: 'ダークマター派生',
        thought: '思考派生',
        processed: '加工資源'
    };
    return names[category] || category;
}