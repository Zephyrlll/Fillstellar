// Original Conversion Recipe UI - Backup
// This file contains the original implementation of the conversion recipe UI
// Saved for reference when implementing the new modern UI

export function updateConversionRecipesList(): void {
    // Check if modern UI is active
    if ((window as any).modernRecipeUIActive || (window as any).modernRecipeUIActiveEmbed) {
        return; // Let the modern UI handle updates
    }
    
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
}