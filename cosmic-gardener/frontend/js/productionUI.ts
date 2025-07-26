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
import { getResourceTier, getTierColor, RESOURCE_TIERS } from './resourceTiers.js';
import { productionChainUI } from './productionChainUI.js';
import { conversionRecipeUI } from './systems/conversionRecipeUI.js';
import { showMessage } from './ui.js';

let lastProductionUIUpdate = 0;
const PRODUCTION_UI_UPDATE_INTERVAL = 1000; // 1 second for better stability with sliders

// UI Elements
let advancedResourcesDisplay: HTMLElement | null;
let conversionRecipesList: HTMLElement | null;
let activeConversionsList: HTMLElement | null;
let productionFacilitiesList: HTMLElement | null;
let facilityConstructionList: HTMLElement | null;

// Store batch conversion input values
const batchConversionValues: Record<string, number> = {};

// 検索クエリを保存
let recipeSearchQuery: string = '';

// 検索のデバウンスタイマー
let searchDebounceTimer: number | null = null;

// IME（日本語入力）の状態を保存
let isComposing: boolean = false;

// 実行可能レシピのみ表示
let showAffordableOnly: boolean = false;

// スライダー操作中のフラグ
let isSliderDragging: boolean = false;
(window as any).isSliderDragging = false;

// プルダウンメニューのホバー状態
(window as any).isSelectHovered = false;

// カテゴリの展開状態を保存
const expandedCategories: { [key: string]: boolean } = {
    basic: false,
    energy: false,
    advanced: false,
    special: false,
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
    test6: false,
    test7: false
};

// カテゴリ判定関数
function getRecipeCategory(recipe: any): string {
    // レシピ名に基づいてカテゴリを判定
    if (recipe.name === '仮1') return 'test1';
    if (recipe.name === '仮2') return 'test2';
    if (recipe.name === '仮3') return 'test3';
    if (recipe.name === '仮4') return 'test4';
    if (recipe.name === '仮5') return 'test5';
    if (recipe.name === '仮6') return 'test6';
    if (recipe.name === '仮7') return 'test7';
    
    // 既存の判定ロジック
    const outputTypes = recipe.outputs.resources.map((r: any) => r.type);
    
    if (outputTypes.some((t: string) => t.includes('ENERGY'))) return 'energy';
    if (outputTypes.some((t: string) => t.includes('ADVANCED') || t.includes('QUANTUM'))) return 'advanced';
    if (outputTypes.some((t: string) => t.includes('DARK') || t.includes('EXOTIC'))) return 'special';
    
    return 'basic';
}

// カテゴリの展開/折りたたみを切り替える関数
(window as any).toggleRecipeCategory = function(category: string) {
    expandedCategories[category] = !expandedCategories[category];
    updateConversionRecipesList();
};

// 全カテゴリの展開/折りたたみを切り替える関数
(window as any).toggleAllRecipeCategories = function(expand: boolean) {
    Object.keys(expandedCategories).forEach(category => {
        expandedCategories[category] = expand;
    });
    updateConversionRecipesList();
};

// レシピ検索関数（デバウンス付き）
(window as any).searchRecipes = function(query: string) {
    recipeSearchQuery = query.toLowerCase();
    
    // IME入力中は更新しない
    if (isComposing) {
        return;
    }
    
    // 既存のタイマーをクリア
    if (searchDebounceTimer !== null) {
        clearTimeout(searchDebounceTimer);
    }
    
    // 300ms後に更新を実行
    searchDebounceTimer = setTimeout(() => {
        updateConversionRecipesList();
        searchDebounceTimer = null;
    }, 300) as unknown as number;
};

// IME開始時の処理
(window as any).onCompositionStart = function() {
    isComposing = true;
};

// IME終了時の処理
(window as any).onCompositionEnd = function(event: CompositionEvent) {
    isComposing = false;
    // IME確定後に検索を実行
    const target = event.target as HTMLInputElement;
    if (target && target.id === 'recipe-search-input') {
        (window as any).searchRecipes(target.value);
    }
};

// 検索をクリアする関数
(window as any).clearRecipeSearch = function() {
    recipeSearchQuery = '';
    updateConversionRecipesList();
};

// 実行可能レシピのみ表示の切り替え関数
(window as any).toggleAffordableOnly = function() {
    showAffordableOnly = !showAffordableOnly;
    updateConversionRecipesList();
};

// スライダー更新のスロットリング用
const sliderUpdateTimers: { [key: string]: number } = {};

// バッチ変換の値を更新する関数
(window as any).updateBatchValue = function(recipeId: string, value: string) {
    const numValue = parseInt(value) || 1;
    batchConversionValues[recipeId] = numValue;
    
    // 表示を即座に更新
    const valueDisplay = document.getElementById(`batch-value-${recipeId}`);
    if (valueDisplay && valueDisplay.textContent !== numValue.toString()) {
        valueDisplay.textContent = numValue.toString();
    }
    
    // 必要素材数を更新
    const requiredAmountElements = document.querySelectorAll(`.required-amount-${recipeId}`);
    requiredAmountElements.forEach(element => {
        const baseAmount = parseInt(element.getAttribute('data-base-amount') || '0');
        const totalRequired = baseAmount * numValue;
        element.textContent = formatNumber(totalRequired);
        
        // 親要素の色も更新（資源が足りているかチェック）
        const resourceType = element.closest('[data-resource-type]')?.getAttribute('data-resource-type');
        if (resourceType && gameState.resources[resourceType] !== undefined) {
            const currentAmount = gameState.resources[resourceType];
            const hasEnough = currentAmount >= totalRequired;
            const colorSpan = element.parentElement;
            if (colorSpan) {
                colorSpan.style.color = hasEnough ? '#4ade80' : '#ff4444';
            }
        }
    });
    
    // 変換ボタンのテキストも更新
    const convertButton = document.querySelector(`.batch-convert-button[data-recipe-id="${recipeId}"]`) as HTMLElement;
    if (convertButton) {
        convertButton.innerHTML = `⚡ ${numValue}個実行`;
    }
    
    // スライダーの背景更新をスロットリング
    if (sliderUpdateTimers[recipeId]) {
        clearTimeout(sliderUpdateTimers[recipeId]);
    }
    
    sliderUpdateTimers[recipeId] = window.setTimeout(() => {
        const slider = document.querySelector(`.batch-slider[data-recipe-id="${recipeId}"]`) as HTMLInputElement;
        if (slider) {
            const max = parseInt(slider.max) || 100;
            const min = parseInt(slider.min) || 1;
            const percentage = Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100));
            
            // CSSカスタムプロパティを使用して更新
            slider.style.setProperty('--slider-progress', `${percentage}%`);
        }
        delete sliderUpdateTimers[recipeId];
    }, 16); // 約60fps
};

// プリセット値を設定する関数
(window as any).setPresetValue = function(recipeId: string, value: string) {
    if (!value) return; // 空の値は無視
    
    const numValue = parseInt(value);
    
    // スライダーの値を更新
    const slider = document.querySelector(`.batch-slider[data-recipe-id="${recipeId}"]`) as HTMLInputElement;
    if (slider) {
        slider.value = numValue.toString();
        // updateBatchValue関数を呼び出して表示を更新
        (window as any).updateBatchValue(recipeId, numValue.toString());
    }
    
    // プルダウンメニューはリセットしない（選択した値を保持）
};

export function initProductionUI(): void {
    console.log('🚀 Production UI initializing...');
    
    // Get UI elements
    advancedResourcesDisplay = document.getElementById('advanced-resources-display');
    conversionRecipesList = document.getElementById('conversion-recipes-list');
    activeConversionsList = document.getElementById('active-conversions-list');
    productionFacilitiesList = document.getElementById('production-facilities-list');
    facilityConstructionList = document.getElementById('facility-construction-list');
    
    console.log('📦 Production UI elements:', {
        advancedResourcesDisplay: !!advancedResourcesDisplay,
        conversionRecipesList: !!conversionRecipesList,
        activeConversionsList: !!activeConversionsList,
        productionFacilitiesList: !!productionFacilitiesList,
        facilityConstructionList: !!facilityConstructionList
    });
    
    // Add event listeners for collapsible sections
    const headers = [
        'advancedResourcesHeader',
        'conversionRecipesHeader', 
        'activeConversionsHeader',
        'productionFacilitiesHeader',
        'facilityConstructionHeader'
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
    
    // スライダー操作中またはプルダウンメニューホバー中は更新をスキップ
    if (((window as any).isSliderDragging || (window as any).isSelectHovered) && !force) {
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
    updateFacilityConstructionList();
    updateWasteStatusDisplay();
}

function updateAdvancedResourcesDisplay(): void {
    if (!advancedResourcesDisplay || !gameState.advancedResources) return;
    
    const resources = gameState.advancedResources;
    const html: string[] = [];
    
    // Check if mobile device
    const isMobile = gameState.deviceInfo?.isMobile || false;
    
    // Group resources by category
    const categories: Record<string, ResourceType[]> = {
        dust: [],
        energy: [],
        organic: [],
        biomass: [],
        dark: [],
        thought: [],
        processed: [],
        tier2: [],
        waste: []
    };
    
    Object.keys(resources).forEach(key => {
        const type = key as ResourceType;
        const metadata = RESOURCE_METADATA[type];
        if (metadata && resources[type] && resources[type].amount > 0) {
            // Initialize category array if it doesn't exist
            if (!categories[metadata.category]) {
                categories[metadata.category] = [];
            }
            categories[metadata.category].push(type);
        }
    });
    
    // Display by category
    Object.entries(categories).forEach(([category, types]) => {
        if (types.length === 0) return;
        
        const categoryName = getCategoryDisplayName(category);
        html.push(`<div class="resource-category ${isMobile ? 'mobile' : ''}">`);
        html.push(`<h3>${categoryName}</h3>`);
        
        // モバイル版ではグリッド表示
        if (isMobile) {
            html.push(`<div class="mobile-resource-grid">`);
        }
        
        types.forEach(type => {
            const resource = resources[type];
            const metadata = RESOURCE_METADATA[type];
            const qualityColor = QUALITY_MULTIPLIERS[resource.quality].color;
            
            const qualityClass = `quality-${getQualityName(resource.quality).toLowerCase().replace(' ', '-')}`;
            const tier = getResourceTier(type);
            const tierColor = getTierColor(tier);
            
            if (isMobile) {
                // モバイル版：コンパクトな表示
                html.push(`
                    <div class="advanced-resource-item mobile ${qualityClass}" data-resource-type="${type}" data-quality="${resource.quality}">
                        <div class="resource-header">
                            <span class="resource-icon">${metadata.icon}</span>
                            <span class="resource-amount">${formatNumber(resource.amount)}</span>
                        </div>
                        <div class="resource-footer">
                            <span class="resource-name-short" style="color: ${qualityColor}">
                                ${metadata.name}
                            </span>
                            <span class="resource-tier" style="color: ${tierColor};">[T${tier}]</span>
                        </div>
                    </div>
                `);
            } else {
                // PC版：詳細表示
                html.push(`
                    <div class="advanced-resource-item ${qualityClass}" data-resource-type="${type}" data-quality="${resource.quality}">
                        <span class="resource-icon">${metadata.icon}</span>
                        <span class="resource-name" style="color: ${qualityColor}">
                            ${getResourceDisplayName(type, resource.quality)}
                            <span class="resource-tier" style="color: ${tierColor}; font-size: 10px; margin-left: 5px;">[T${tier}]</span>
                        </span>
                        <span class="resource-amount">${formatNumber(resource.amount)}</span>
                    </div>
                `);
            }
        });
        
        if (isMobile) {
            html.push(`</div>`); // Close mobile-resource-grid
        }
        
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
    // Check if modern UI is active
    if ((window as any).modernRecipeUIActive || (window as any).modernRecipeUIActiveEmbed) {
        return; // Let the modern UI handle updates
    }
    
    if (!conversionRecipesList) return;
    
    // ヘッダーが既に存在するかチェック
    const hasHeader = conversionRecipesList.querySelector('#recipe-list-header');
    
    // 現在のフォーカス要素と値を保存
    const activeElement = document.activeElement as HTMLInputElement | HTMLSelectElement;
    const isSearchFocused = activeElement?.id === 'recipe-search-input';
    const isSliderFocused = activeElement?.classList.contains('batch-slider');
    const isSelectFocused = activeElement?.tagName === 'SELECT';
    const focusedSliderRecipeId = isSliderFocused ? activeElement?.getAttribute('data-recipe-id') : null;
    const searchValue = (activeElement as HTMLInputElement)?.value;
    const selectionStart = (activeElement as HTMLInputElement)?.selectionStart;
    const selectionEnd = (activeElement as HTMLInputElement)?.selectionEnd;
    
    // スライダー操作中またはプルダウンメニュー操作中は更新をスキップ
    if (isSliderFocused || isSelectFocused) {
        return;
    }
    
    // スクロール位置を保存
    const scrollTop = conversionRecipesList.scrollTop;
    
    // 視認性を重視したプロトタイプUI
    const availableRecipes = getAvailableRecipes(
        gameState.discoveredTechnologies,
        gameState.availableFacilities
    );
    
    const html: string[] = [];
    
    // ヘッダー情報
    html.push(`
        <div style="
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        ">
            <h3 style="margin: 0 0 10px 0; color: #fff;">利用可能なレシピ: ${availableRecipes.length}個</h3>
            <div style="color: #999; font-size: 14px;">
                資源が不足しているレシピは薄く表示されます
            </div>
        </div>
    `);
    
    // レシピをカテゴリごとにグループ化
    const recipesByCategory: { [key: string]: any[] } = {
        basic: [],
        energy: [],
        advanced: [],
        special: [],
        test1: [],
        test2: [],
        test3: [],
        test4: [],
        test5: [],
        test6: [],
        test7: []
    };
    
    // カテゴリ情報
    const categoryInfo = {
        basic: { name: '基本資源', icon: '🌟', color: '#4a9eff' },
        energy: { name: 'エネルギー', icon: '⚡', color: '#ffc107' },
        advanced: { name: '高度な資源', icon: '🔬', color: '#9c27b0' },
        special: { name: '特殊資源', icon: '💎', color: '#e91e63' },
        test1: { name: '仮1', icon: '1️⃣', color: '#ff6b6b' },
        test2: { name: '仮2', icon: '2️⃣', color: '#4ecdc4' },
        test3: { name: '仮3', icon: '3️⃣', color: '#45b7d1' },
        test4: { name: '仮4', icon: '4️⃣', color: '#f9ca24' },
        test5: { name: '仮5', icon: '5️⃣', color: '#f0932b' },
        test6: { name: '仮6', icon: '6️⃣', color: '#eb4d4b' },
        test7: { name: '仮7', icon: '7️⃣', color: '#6ab04c' }
    };
    
    // レシピをカテゴリに分類（検索フィルタリング付き）
    let filteredRecipeCount = 0;
    availableRecipes.forEach(recipe => {
        // 実行可能フィルタリング
        if (showAffordableOnly && !conversionEngine.canAffordRecipe(recipe.id)) {
            return; // 実行不可能な場合はスキップ
        }
        
        // 検索フィルタリング
        if (recipeSearchQuery) {
            const searchLower = recipeSearchQuery.toLowerCase();
            const matchesName = recipe.name.toLowerCase().includes(searchLower);
            const matchesDescription = recipe.description?.toLowerCase().includes(searchLower);
            
            // 入力・出力資源名での検索
            const matchesInputs = recipe.inputs.resources.some((r: any) => {
                const metadata = RESOURCE_METADATA[r.type];
                return metadata.name.toLowerCase().includes(searchLower);
            });
            const matchesOutputs = recipe.outputs.resources.some((r: any) => {
                const metadata = RESOURCE_METADATA[r.type];
                return metadata.name.toLowerCase().includes(searchLower);
            });
            
            if (!matchesName && !matchesDescription && !matchesInputs && !matchesOutputs) {
                return; // 検索にマッチしない場合はスキップ
            }
        }
        
        const category = getRecipeCategory(recipe);
        if (recipesByCategory[category]) {
            recipesByCategory[category].push(recipe);
            filteredRecipeCount++;
        }
    });
    
    // ヘッダーのメッセージを更新
    html.pop(); // 既存のヘッダーを削除
    html.push(`
        <div id="recipe-list-header" style="
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #fff;">
                        ${(() => {
                            let message = '';
                            if (recipeSearchQuery && showAffordableOnly) {
                                message = `検索結果（実行可能のみ）: ${filteredRecipeCount}個`;
                            } else if (recipeSearchQuery) {
                                message = `検索結果: ${filteredRecipeCount}個 / ${availableRecipes.length}個`;
                            } else if (showAffordableOnly) {
                                message = `実行可能なレシピ: ${filteredRecipeCount}個 / ${availableRecipes.length}個`;
                            } else {
                                message = `利用可能なレシピ: ${availableRecipes.length}個`;
                            }
                            return message;
                        })()}
                    </h3>
                    <div style="color: #999; font-size: 14px;">
                        ${(recipeSearchQuery || showAffordableOnly) && filteredRecipeCount === 0
                            ? 'フィルター条件に一致するレシピが見つかりませんでした'
                            : 'カテゴリをクリックして展開/折りたたみ'
                        }
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="toggleAllRecipeCategories(true)" style="
                        background: rgba(74, 158, 255, 0.2);
                        border: 1px solid rgba(74, 158, 255, 0.4);
                        color: #4a9eff;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(74, 158, 255, 0.3)'" onmouseout="this.style.background='rgba(74, 158, 255, 0.2)'">
                        全て展開
                    </button>
                    <button onclick="toggleAllRecipeCategories(false)" style="
                        background: rgba(74, 158, 255, 0.2);
                        border: 1px solid rgba(74, 158, 255, 0.4);
                        color: #4a9eff;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(74, 158, 255, 0.3)'" onmouseout="this.style.background='rgba(74, 158, 255, 0.2)'">
                        全て折りたたむ
                    </button>
                </div>
            </div>
            <div style="position: relative;">
                <input type="text" 
                       id="recipe-search-input"
                       placeholder="レシピ名や資源名で検索..." 
                       value=""
                       style="
                           width: 100%;
                           padding: 10px 40px 10px 15px;
                           background: rgba(255, 255, 255, 0.05);
                           border: 1px solid rgba(74, 158, 255, 0.3);
                           border-radius: 6px;
                           color: #fff;
                           font-size: 14px;
                           transition: all 0.3s ease;
                       "
                       oninput="window.searchRecipes(this.value)"
                       onfocus="this.style.borderColor='rgba(74, 158, 255, 0.6)'; this.style.background='rgba(255, 255, 255, 0.08)'"
                       onblur="this.style.borderColor='rgba(74, 158, 255, 0.3)'; this.style.background='rgba(255, 255, 255, 0.05)'">
                <span style="
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 16px;
                    pointer-events: none;
                ">🔍</span>
                ${recipeSearchQuery ? `
                    <button onclick="window.clearRecipeSearch()" style="
                        position: absolute;
                        right: 40px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: rgba(255, 255, 255, 0.7);
                        padding: 4px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                        クリア
                    </button>
                ` : ''}
            </div>
            <div style="margin-top: 10px;">
                <button onclick="toggleAffordableOnly()" style="
                    background: ${showAffordableOnly ? 'rgba(74, 158, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
                    border: 1px solid ${showAffordableOnly ? 'rgba(74, 158, 255, 0.6)' : 'rgba(74, 158, 255, 0.3)'};
                    color: ${showAffordableOnly ? '#fff' : '#999'};
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                " onmouseover="this.style.background='${showAffordableOnly ? 'rgba(74, 158, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)'}'" onmouseout="this.style.background='${showAffordableOnly ? 'rgba(74, 158, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)'}'">
                    <span style="font-size: 16px;">${showAffordableOnly ? '✅' : '☐'}</span>
                    実行可能なレシピのみ表示
                </button>
            </div>
        </div>
    `);
    
    // カテゴリごとにグループを作成
    Object.entries(recipesByCategory).forEach(([category, recipes]) => {
        if (recipes.length === 0) return;
        
        const info = categoryInfo[category as keyof typeof categoryInfo];
        // 検索中は検索結果があるカテゴリを自動展開
        const isExpanded = recipeSearchQuery ? true : expandedCategories[category];
        
        html.push(`
            <div class="recipe-category-group" data-category="${category}" style="margin-bottom: 20px;">
                <div class="category-header" 
                     onclick="toggleRecipeCategory('${category}')"
                     style="
                         display: flex;
                         align-items: center;
                         justify-content: space-between;
                         padding: 15px 20px;
                         background: linear-gradient(135deg, ${info.color}20, ${info.color}10);
                         border: 2px solid ${info.color}40;
                         border-radius: 12px;
                         margin-bottom: ${isExpanded ? '15px' : '0'};
                         cursor: pointer;
                         transition: all 0.3s ease;
                     ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">${info.icon}</span>
                        <h3 style="
                            margin: 0;
                            color: ${info.color};
                            font-size: 18px;
                            font-weight: 600;
                        ">${info.name}</h3>
                        <span style="
                            background: ${info.color}30;
                            color: ${info.color};
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 14px;
                            font-weight: 500;
                        ">${recipes.length}</span>
                    </div>
                    <span class="expand-icon" style="
                        font-size: 20px;
                        color: ${info.color};
                        transform: rotate(${isExpanded ? '180deg' : '0deg'});
                        transition: transform 0.3s ease;
                    ">▼</span>
                </div>
                <div class="category-content" style="
                    display: ${isExpanded ? 'block' : 'none'};
                    padding: 0 10px;
                ">
        `);
        
        recipes.forEach(recipe => {
            const canAfford = conversionEngine.canAffordRecipe(recipe.id);
            const opacity = canAfford ? '1' : '0.5';
            const borderColor = canAfford ? '#4a9eff' : '#666';
            const backgroundColor = canAfford ? 'rgba(74, 158, 255, 0.05)' : 'rgba(0, 0, 0, 0.2)';
        
        html.push(`
            <div style="
                border: 2px solid ${borderColor};
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 15px;
                background: ${backgroundColor};
                opacity: ${opacity};
            ">
                <!-- レシピ名と変換時間 -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                ">
                    <h3 style="
                        margin: 0;
                        color: #fff;
                        font-size: 20px;
                    ">${recipe.name}</h3>
                    <div style="
                        background: rgba(255, 255, 255, 0.1);
                        padding: 5px 15px;
                        border-radius: 20px;
                        color: #ffa500;
                        font-weight: bold;
                    ">⏱️ ${recipe.time}秒</div>
                </div>
                
                <!-- 説明 -->
                <p style="
                    color: #ccc;
                    margin: 0 0 15px 0;
                    font-size: 14px;
                ">${recipe.description}</p>
                
                <!-- 資源の入出力 -->
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                ">
                    <!-- 必要資源 -->
                    <div style="margin-bottom: 10px;">
                        <span style="color: #ff6b6b; font-weight: bold; font-size: 16px;">▼ 必要資源</span>
                        <div style="margin-top: 8px; padding-left: 20px;">
                            ${recipe.inputs.resources.map(r => {
                                const meta = RESOURCE_METADATA[r.type];
                                const currentAmount = gameState.resources[r.type] || 0;
                                const hasEnough = currentAmount >= r.amount;
                                const textColor = hasEnough ? '#4ade80' : '#ff4444';
                                return `
                                    <div style="
                                        display: flex;
                                        justify-content: space-between;
                                        margin: 5px 0;
                                        font-size: 16px;
                                    " data-resource-type="${r.type}">
                                        <span>${meta.icon} ${meta.name}</span>
                                        <span style="color: ${textColor}; font-weight: bold;">
                                            <span class="current-amount">${formatNumber(currentAmount)}</span> / 
                                            <span class="required-amount-${recipe.id}" data-base-amount="${r.amount}">${formatNumber(r.amount)}</span>
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- 生産資源 -->
                    <div style="margin-bottom: 10px;">
                        <span style="color: #4ade80; font-weight: bold; font-size: 16px;">▲ 生産資源</span>
                        <div style="margin-top: 8px; padding-left: 20px;">
                            ${recipe.outputs.resources.map(r => {
                                const meta = RESOURCE_METADATA[r.type];
                                const qualityColor = QUALITY_MULTIPLIERS[r.quality].color;
                                return `
                                    <div style="
                                        display: flex;
                                        justify-content: space-between;
                                        margin: 5px 0;
                                        font-size: 16px;
                                    ">
                                        <span>${meta.icon} ${meta.name}</span>
                                        <span style="color: ${qualityColor}; font-weight: bold;">
                                            +${formatNumber(r.amount)}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- 副産物 -->
                    ${recipe.byproducts ? `
                        <div style="margin-bottom: 10px;">
                            <span style="color: #ffa500; font-weight: bold; font-size: 16px;">◆ 副産物</span>
                            <div style="margin-top: 8px; padding-left: 20px;">
                                ${recipe.byproducts.map(b => {
                                    const meta = RESOURCE_METADATA[b.type];
                                    return `
                                        <div style="
                                            display: flex;
                                            justify-content: space-between;
                                            margin: 5px 0;
                                            font-size: 16px;
                                        ">
                                            <span>${meta.icon} ${meta.name}</span>
                                            <span style="color: #ffa500;">
                                                +${formatNumber(b.amount)} (${Math.round(b.chance * 100)}%)
                                            </span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- 効率 -->
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin-top: 15px;
                        padding-top: 10px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    ">
                        <span style="color: #999;">効率</span>
                        <span style="color: #4a9eff; font-weight: bold;">
                            ${Math.round(recipe.efficiency * 100)}%
                        </span>
                    </div>
                </div>
                
                <!-- アクションボタン -->
                <div style="
                    display: flex;
                    gap: 15px;
                    align-items: center;
                ">
                    <button 
                        class="${canAfford ? 'convert-button' : 'convert-button disabled'}"
                        data-recipe-id="${recipe.id}"
                        style="
                            flex: 1;
                            padding: 12px 20px;
                            font-size: 16px;
                            font-weight: bold;
                            border-radius: 8px;
                            cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                            background: ${canAfford ? '#4a9eff' : '#666'};
                            color: white;
                            border: none;
                        "
                    >
                        ${canAfford ? '🚀 変換開始' : '❌ 資源不足'}
                    </button>
                    
                    ${canAfford ? `
                        <div style="
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                            padding: 15px;
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                            flex: 1;
                        ">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 5px;
                            ">
                                <span style="color: #999; font-size: 14px;">一括変換</span>
                                <span id="batch-value-${recipe.id}" style="
                                    color: #4a9eff;
                                    font-weight: bold;
                                    font-size: 18px;
                                    background: rgba(74, 158, 255, 0.1);
                                    padding: 4px 12px;
                                    border-radius: 4px;
                                    min-width: 40px;
                                    text-align: center;
                                ">${batchConversionValues[recipe.id] || 1}</span>
                            </div>
                            <div style="position: relative;">
                                <input type="range" 
                                       id="recipe-${recipe.id}-slider"
                                       class="batch-slider" 
                                       data-recipe-id="${recipe.id}"
                                       min="1" 
                                       max="${conversionEngine.getMaxConversions(recipe.id)}" 
                                       value="${batchConversionValues[recipe.id] || 1}"
                                       oninput="updateBatchValue('${recipe.id}', this.value)"
                                       onmousedown="window.isSliderDragging = true"
                                       onmouseup="window.isSliderDragging = false"
                                       onmouseleave="window.isSliderDragging = false"
                                       ontouchstart="window.isSliderDragging = true"
                                       ontouchend="window.isSliderDragging = false"
                                       style="
                                           --slider-progress: ${((batchConversionValues[recipe.id] || 1) - 1) / (conversionEngine.getMaxConversions(recipe.id) - 1) * 100}%;
                                           width: 100%;
                                           height: 8px;
                                           -webkit-appearance: none;
                                           appearance: none;
                                           background: linear-gradient(to right, 
                                               #4a9eff 0%, 
                                               #4a9eff var(--slider-progress), 
                                               rgba(255, 255, 255, 0.2) var(--slider-progress), 
                                               rgba(255, 255, 255, 0.2) 100%);
                                           border-radius: 4px;
                                           outline: none;
                                           cursor: pointer;
                                           transition: background 0.1s ease-out;
                                       ">
                                <style>
                                    #recipe-${recipe.id}-slider::-webkit-slider-thumb {
                                        -webkit-appearance: none;
                                        appearance: none;
                                        width: 20px;
                                        height: 20px;
                                        background: #4a9eff;
                                        border: 2px solid #fff;
                                        border-radius: 50%;
                                        cursor: pointer;
                                        box-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
                                        transition: all 0.2s ease;
                                    }
                                    #recipe-${recipe.id}-slider::-webkit-slider-thumb:hover {
                                        transform: scale(1.2);
                                        box-shadow: 0 0 20px rgba(74, 158, 255, 0.8);
                                    }
                                    #recipe-${recipe.id}-slider::-moz-range-thumb {
                                        width: 20px;
                                        height: 20px;
                                        background: #4a9eff;
                                        border: 2px solid #fff;
                                        border-radius: 50%;
                                        cursor: pointer;
                                        box-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
                                        transition: all 0.2s ease;
                                    }
                                    #recipe-${recipe.id}-slider::-moz-range-thumb:hover {
                                        transform: scale(1.2);
                                        box-shadow: 0 0 20px rgba(74, 158, 255, 0.8);
                                    }
                                </style>
                            </div>
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                font-size: 12px;
                                color: #666;
                                margin-top: -5px;
                            ">
                                <span>1</span>
                                <span>${conversionEngine.getMaxConversions(recipe.id)}</span>
                            </div>
                            <div style="
                                margin: 10px 0;
                            ">
                                <select id="preset-select-${recipe.id}" 
                                        onchange="setPresetValue('${recipe.id}', this.value)"
                                        onmouseenter="window.isSelectHovered = true"
                                        onmouseleave="window.isSelectHovered = false"
                                        style="
                                    width: 100%;
                                    padding: 8px 12px;
                                    background: rgba(0, 0, 0, 0.3);
                                    border: 1px solid rgba(74, 158, 255, 0.3);
                                    color: #fff;
                                    border-radius: 6px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: 500;
                                    transition: all 0.2s ease;
                                    appearance: none;
                                    background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%228%22 viewBox=%220 0 14 8%22%3e%3cpath fill=%22%234a9eff%22 d=%22M7 8L0 0h14z%22/%3e%3c/svg%3e');
                                    background-repeat: no-repeat;
                                    background-position: right 12px center;
                                    background-size: 14px;
                                    padding-right: 40px;
                                " onfocus="this.style.borderColor='rgba(74, 158, 255, 0.6)'; this.style.background='rgba(0, 0, 0, 0.4) url(data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%228%22 viewBox=%220 0 14 8%22%3e%3cpath fill=%22%234a9eff%22 d=%22M7 8L0 0h14z%22/%3e%3c/svg%3e) no-repeat right 12px center'; this.style.backgroundSize='14px'" 
                                   onblur="this.style.borderColor='rgba(74, 158, 255, 0.3)'; this.style.background='rgba(0, 0, 0, 0.3) url(data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%228%22 viewBox=%220 0 14 8%22%3e%3cpath fill=%22%234a9eff%22 d=%22M7 8L0 0h14z%22/%3e%3c/svg%3e) no-repeat right 12px center'; this.style.backgroundSize='14px'">
                                    <option value="" style="color: #999;">プリセット数量</option>
                                    ${(() => {
                                        const max = conversionEngine.getMaxConversions(recipe.id);
                                        const currentValue = batchConversionValues[recipe.id] || 1;
                                        const presets = [1, 5, 10, 25, 50, 100];
                                        return presets
                                            .filter(value => value <= max)
                                            .concat(max > 100 ? [max] : [])
                                            .map(value => `
                                                <option value="${value}" ${value === currentValue ? 'selected' : ''} style="background: #1a1a1a; color: #fff;">
                                                    ${value === max ? `MAX (${value})` : value}
                                                </option>
                                            `).join('');
                                    })()}
                                </select>
                            </div>
                            <button class="batch-convert-button" 
                                    data-recipe-id="${recipe.id}"
                                    style="
                                        padding: 10px 20px;
                                        background: linear-gradient(135deg, #ffa500, #ff8c00);
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-weight: bold;
                                        font-size: 16px;
                                        transition: all 0.3s ease;
                                        box-shadow: 0 2px 8px rgba(255, 165, 0, 0.3);
                                    "
                                    onmouseover="this.style.background='linear-gradient(135deg, #ff8c00, #ff7700)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(255, 165, 0, 0.5)'"
                                    onmouseout="this.style.background='linear-gradient(135deg, #ffa500, #ff8c00)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(255, 165, 0, 0.3)'">
                                ⚡ ${batchConversionValues[recipe.id] || 1}個実行
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `);
        });
        
        // カテゴリグループを閉じる
        html.push(`
                </div>
            </div>
        `);
    });
    
    // 検索結果が0件の場合のメッセージ
    const hasRecipes = Object.values(recipesByCategory).some(recipes => recipes.length > 0);
    if (!hasRecipes) {
        if (recipeSearchQuery) {
            html.push(`<p style="text-align: center; color: #999; padding: 40px;">
                「${recipeSearchQuery}」に一致するレシピが見つかりませんでした
            </p>`);
        } else {
            html.push('<p style="text-align: center; color: #999; padding: 40px;">利用可能なレシピがありません</p>');
        }
    }
    
    // ヘッダーが既に存在する場合は、レシピリストのみ更新
    if (hasHeader) {
        // レシピリストコンテナを探すか作成
        let recipeListContainer = conversionRecipesList.querySelector('#recipe-list-container');
        if (!recipeListContainer) {
            recipeListContainer = document.createElement('div');
            recipeListContainer.id = 'recipe-list-container';
            conversionRecipesList.appendChild(recipeListContainer);
        }
        
        // カテゴリごとのHTMLを結合（ヘッダーを除く）
        const recipesHtml = html.slice(1).join('');
        recipeListContainer.innerHTML = recipesHtml;
    } else {
        // 初回はヘッダーとレシピリストコンテナを作成
        const headerHtml = html[0] || '';
        const recipesHtml = html.slice(1).join('');
        conversionRecipesList.innerHTML = headerHtml + `<div id="recipe-list-container">${recipesHtml}</div>`;
    }
    
    // 検索入力の値を同期（初回のみ）
    if (!hasHeader) {
        const searchInput = document.getElementById('recipe-search-input') as HTMLInputElement;
        if (searchInput) {
            searchInput.value = recipeSearchQuery;
        }
    }
    
    // フォーカスとスクロール位置を復元
    if (isSearchFocused && searchInput) {
        searchInput.focus();
        if (selectionStart !== null && selectionEnd !== null) {
            searchInput.setSelectionRange(selectionStart, selectionEnd);
        }
    }
    
    // スクロール位置を復元
    conversionRecipesList.scrollTop = scrollTop;
    
    // イベントハンドラーを追加
    conversionRecipesList.querySelectorAll('.convert-button:not(.disabled)').forEach(button => {
        button.addEventListener('click', (e) => {
            const recipeId = (e.target as HTMLElement).getAttribute('data-recipe-id');
            if (recipeId) {
                conversionEngine.startConversion(recipeId, undefined, true);
                updateProductionUI(true);
            }
        });
    });
    
    // バッチ変換のハンドラー
    conversionRecipesList.querySelectorAll('.batch-convert-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const recipeId = (e.target as HTMLElement).getAttribute('data-recipe-id');
            if (!recipeId) return;
            
            // スライダーの値を使用
            const count = batchConversionValues[recipeId] || 1;
            const result = conversionEngine.startBatchConversion(recipeId, count);
            
            if (result.started > 0) {
                // 成功
                showMessage(`${count}個の変換を開始しました`, 2000);
            } else if (result.reason) {
                showMessage(result.reason, 2000);
            }
            
            updateProductionUI(true);
        });
    });
    
    // スライダーの値を復元
    conversionRecipesList.querySelectorAll('.batch-slider').forEach(slider => {
        const sliderElement = slider as HTMLInputElement;
        const recipeId = sliderElement.getAttribute('data-recipe-id');
        if (!recipeId) return;
        
        const savedValue = batchConversionValues[recipeId];
        if (savedValue) {
            sliderElement.value = savedValue.toString();
            // 背景グラデーションを更新
            (window as any).updateBatchValue(recipeId, savedValue.toString());
        }
    });
    
    return; // ここで処理を終了
    
    /* 以下は元のコード（コメントアウト）
    const availableRecipesOld = getAvailableRecipes(
        gameState.discoveredTechnologies,
        gameState.availableFacilities
    );
    
    const htmlOld: string[] = [];
    
    availableRecipesOld.forEach(recipe => {
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
                    ${recipe.byproducts ? `
                        <div class="recipe-byproducts">
                            <strong>副産物:</strong>
                            ${recipe.byproducts.map(b => {
                                const meta = RESOURCE_METADATA[b.type];
                                return `<span style="color: #FFC107">${meta.icon} ${formatNumber(b.amount)} ${meta.name} (${Math.round(b.chance * 100)}%)</span>`;
                            }).join(', ')}
                        </div>
                    ` : ''}
                    ${recipe.waste ? `
                        <div class="recipe-waste">
                            <strong>廃棄物:</strong>
                            <span style="color: #f44336">${RESOURCE_METADATA[recipe.waste.type].icon} ${formatNumber(recipe.waste.amount)} ${RESOURCE_METADATA[recipe.waste.type].name}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="recipe-stats">
                    <span>時間: ${recipe.time}秒</span>
                    <span>効率: ${Math.round(recipe.efficiency * 100)}%</span>
                </div>
                <div class="recipe-actions">
                    <button class="${buttonClass}" data-recipe-id="${recipe.id}">
                        ${canAfford ? '変換開始' : '資源不足'}
                    </button>
                    ${canAfford ? `
                        <div class="batch-conversion">
                            <input type="number" 
                                   class="batch-count" 
                                   data-recipe-id="${recipe.id}"
                                   min="1" 
                                   max="${conversionEngine.getMaxConversions(recipe.id)}" 
                                   value="${batchConversionValues[recipe.id] || 1}" 
                                   title="一括変換数">
                            <button class="batch-convert-button" data-recipe-id="${recipe.id}" title="一括変換">
                                ⚡×
                            </button>
                        </div>
                    ` : ''}
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
    
    // Add batch conversion handlers
    conversionRecipesList.querySelectorAll('.batch-convert-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const recipeId = (e.target as HTMLElement).getAttribute('data-recipe-id');
            if (!recipeId) return;
            
            // Get the count from the corresponding input
            const input = conversionRecipesList.querySelector(`.batch-count[data-recipe-id="${recipeId}"]`) as HTMLInputElement;
            if (!input) return;
            
            const count = parseInt(input.value) || 1;
            const result = conversionEngine.startBatchConversion(recipeId, count);
            
            if (result.started > 0) {
                // Keep the current value instead of resetting
                // This allows users to quickly repeat the same batch conversion
            } else if (result.reason) {
                showMessage(result.reason, 2000);
            }
            
            updateProductionUI(true);
        });
    });
    
    // Update max value when input changes
    conversionRecipesList.querySelectorAll('.batch-count').forEach(input => {
        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const recipeId = target.getAttribute('data-recipe-id');
            if (!recipeId) return;
            
            const max = conversionEngine.getMaxConversions(recipeId);
            target.max = max.toString();
            
            // Clamp value to valid range
            let value = parseInt(target.value) || 1;
            if (value > max) {
                value = max;
                target.value = max.toString();
            }
            if (value < 1) {
                value = 1;
                target.value = '1';
            }
            
            // Store the value
            batchConversionValues[recipeId] = value;
        });
        
        // Also save on change event
        input.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const recipeId = target.getAttribute('data-recipe-id');
            if (!recipeId) return;
            
            const value = parseInt(target.value) || 1;
            batchConversionValues[recipeId] = value;
        });
    });
    */
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
        processed: '加工資源',
        tier2: 'Tier 2 資源',
        waste: '廃棄物'
    };
    return names[category] || category;
}

// Update waste status display
function updateWasteStatusDisplay(): void {
    // Check if waste status element exists (both standalone and embedded)
    let wasteStatusElement = document.getElementById('waste-status-display') || 
                           document.getElementById('waste-status-display-embed');
    
    if (!wasteStatusElement) {
        // Create waste status element if it doesn't exist
        const productionPanel = document.getElementById('production-panel');
        if (!productionPanel) return;
        
        wasteStatusElement = document.createElement('div');
        wasteStatusElement.id = 'waste-status-display';
        wasteStatusElement.className = 'waste-status-display';
        productionPanel.appendChild(wasteStatusElement);
    }
    
    const wasteStatus = conversionEngine.getWasteStatus();
    const percentage = wasteStatus.percentage;
    let statusClass = 'normal';
    let statusText = '正常';
    
    if (percentage > 95) {
        statusClass = 'critical';
        statusText = '危険';
    } else if (percentage > 80) {
        statusClass = 'warning';
        statusText = '警告';
    }
    
    wasteStatusElement.innerHTML = `
        <div class="waste-status-header">☢️ 廃棄物管理</div>
        <div class="waste-status-bar">
            <div class="waste-bar-fill ${statusClass}" style="width: ${percentage}%"></div>
            <span class="waste-bar-text">${Math.round(percentage)}%</span>
        </div>
        <div class="waste-status-info">
            <span>状態: <span class="${statusClass}">${statusText}</span></span>
            <span>${formatNumber(wasteStatus.amount)} / ${formatNumber(wasteStatus.capacity)}</span>
        </div>
        ${percentage > 80 ? '<div class="waste-warning">生産効率が低下しています！廃棄物を処理してください。</div>' : ''}
    `;
}

// Update facility construction list
function updateFacilityConstructionList(): void {
    if (!facilityConstructionList) return;
    
    // Import facility data
    import('./productionFacilities.js').then(module => {
        const { PRODUCTION_FACILITIES, FACILITY_COSTS, canAffordFacility, payForFacility, addFacilityToGame } = module;
        
        const html: string[] = [];
        
        // Filter facilities not yet built
        const unbuiltFacilities = Object.entries(PRODUCTION_FACILITIES).filter(([id]) => {
            return !gameState.availableFacilities.has(id);
        });
        
        unbuiltFacilities.forEach(([id, facility]) => {
            const cost = FACILITY_COSTS[id];
            if (!cost) return;
            
            const canAfford = canAffordFacility(id);
            const buttonClass = canAfford ? 'build-button' : 'build-button disabled';
            
            html.push(`
                <div class="facility-card ${canAfford ? '' : 'unavailable'}">
                    <h4>${facility.name}</h4>
                    <p class="facility-type">タイプ: ${getFacilityTypeName(facility.type)}</p>
                    <div class="facility-cost">
                        <strong>建設コスト:</strong>
                        ${cost.resources.map(r => {
                            const resourceName = getResourceNameFromKey(r.type);
                            return `<span>${resourceName}: ${formatNumber(r.amount)}</span>`;
                        }).join(', ')}
                    </div>
                    <div class="facility-time">
                        <span>建設時間: ${cost.buildTime}秒</span>
                    </div>
                    ${id === 'waste_storage' ? '<div class="facility-effect">効果: 廃棄物貯蔵容量 +1000</div>' : ''}
                    <button class="${buttonClass}" data-facility-id="${id}">
                        ${canAfford ? '建設開始' : '資源不足'}
                    </button>
                </div>
            `);
        });
        
        if (html.length === 0) {
            html.push('<p class="no-facilities">建設可能な施設がありません</p>');
        }
        
        if (facilityConstructionList) {
            facilityConstructionList.innerHTML = html.join('');
        }
        
        // Add click handlers
        if (facilityConstructionList) {
            facilityConstructionList.querySelectorAll('.build-button:not(.disabled)').forEach(button => {
                button.addEventListener('click', (e) => {
                    const facilityId = (e.target as HTMLElement).getAttribute('data-facility-id');
                    if (facilityId && payForFacility(facilityId)) {
                        addFacilityToGame(facilityId);
                        updateProductionUI(true);
                    }
                });
            });
        }
    });
}

// Get facility type display name
function getFacilityTypeName(type: string): string {
    const typeNames: Record<string, string> = {
        'converter': '変換施設',
        'extractor': '抽出施設',
        'refinery': '精製施設',
        'synthesizer': '合成施設'
    };
    return typeNames[type] || type;
}

// Get resource name from key
function getResourceNameFromKey(key: string): string {
    const resourceNames: Record<string, string> = {
        'cosmicDust': '宇宙の塵',
        'energy': 'エネルギー',
        'organicMatter': '有機物',
        'biomass': 'バイオマス',
        'darkMatter': 'ダークマター',
        'thoughtPoints': '思考ポイント',
        'processedMetal': '加工金属',
        'silicon': 'シリコン'
    };
    return resourceNames[key] || key;
}

// Initialize production UI in a specific container (for dual view integration)  
export async function initializeProductionInContainer(container: HTMLElement): Promise<void> {
    console.log('[PRODUCTION_UI] Initializing in container');
    
    // Ensure conversionEngine is initialized
    if (!conversionEngine) {
        console.error('[PRODUCTION_UI] Conversion engine not initialized');
        container.innerHTML = '<div style="padding: 20px; color: #ff4444;">変換エンジンが初期化されていません</div>';
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create production panel structure
    const structure = `
        <div class="production-panel-embedded">
            <div class="production-panel-content">
                <!-- 高度な資源在庫 -->
                <div class="collapsible-section">
                    <div class="collapsible-header" id="advancedResourcesHeader-embed">高度な資源</div>
                    <div class="collapsible-content" id="advancedResourcesContent-embed">
                        <div id="advanced-resources-display-embed">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
                
                <!-- リソース変動リアルタイム表示 -->
                <div class="collapsible-section">
                    <div class="collapsible-header" id="resourceFlowHeader-embed">⚡ リソース変動リアルタイム</div>
                    <div class="collapsible-content" id="resourceFlowContent-embed">
                        <div id="resource-flow-display-embed">
                            <div class="flow-info">
                                <p>💡 変換中のリソースの流れをリアルタイムで表示します</p>
                            </div>
                            <div id="active-flows-container-embed">
                                <!-- 動的に変換中のリソース変動を表示 -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 変換レシピ -->
                <div class="collapsible-section">
                    <div class="collapsible-header" id="conversionRecipesHeader-embed">
                        🔄 変換レシピ
                    </div>
                    <div class="collapsible-content" id="conversionRecipesContent-embed">
                        <div id="conversion-recipes-list-embed">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
                
                <!-- アクティブな変換 -->
                <div class="collapsible-section">
                    <div class="collapsible-header" id="activeConversionsHeader-embed">⚙️ アクティブな変換</div>
                    <div class="collapsible-content" id="activeConversionsContent-embed">
                        <div id="active-conversions-list-embed">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
                
                <!-- 生産施設 -->
                <div class="collapsible-section">
                    <div class="collapsible-header" id="productionFacilitiesHeader-embed">🏭 生産施設</div>
                    <div class="collapsible-content" id="productionFacilitiesContent-embed">
                        <div id="production-facilities-list-embed">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
                
                <!-- 施設建設 -->
                <div class="collapsible-section">
                    <div class="collapsible-header" id="facilityConstructionHeader-embed">🏗️ 施設建設</div>
                    <div class="collapsible-content" id="facilityConstructionContent-embed">
                        <div id="facility-construction-list-embed">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
                
                <!-- 廃棄物管理 -->
                <div id="waste-status-display-embed" class="waste-status-display">
                    <!-- Dynamically populated -->
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = structure;
    
    // Re-initialize UI elements with embedded IDs
    advancedResourcesDisplay = document.getElementById('advanced-resources-display-embed');
    conversionRecipesList = document.getElementById('conversion-recipes-list-embed');
    activeConversionsList = document.getElementById('active-conversions-list-embed');
    productionFacilitiesList = document.getElementById('production-facilities-list-embed');
    facilityConstructionList = document.getElementById('facility-construction-list-embed');
    
    // Add event listeners for collapsible sections
    const headers = [
        'advancedResourcesHeader-embed',
        'resourceFlowHeader-embed',
        'conversionRecipesHeader-embed', 
        'activeConversionsHeader-embed',
        'productionFacilitiesHeader-embed',
        'facilityConstructionHeader-embed'
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
    
    // Initialize resource flow display for embedded mode
    try {
        const { resourceFlowDisplay } = await import('./resourceFlowDisplay.js');
        const flowContainer = document.getElementById('active-flows-container-embed');
        if (flowContainer && resourceFlowDisplay.setContainer) {
            resourceFlowDisplay.setContainer(flowContainer);
        }
    } catch (error) {
        console.warn('[PRODUCTION_UI] Could not initialize resource flow display:', error);
    }
    
    // Force update UI
    updateProductionUI(true);
    
    // Start periodic updates
    setInterval(() => {
        updateProductionUI(true);
    }, PRODUCTION_UI_UPDATE_INTERVAL);
    
    console.log('[PRODUCTION_UI] Container initialization complete');
}