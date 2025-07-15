// Resource Conversion Engine
import { ResourceType, QualityTier, RESOURCE_METADATA } from './resourceSystem.js';
import { CONVERSION_RECIPES, calculateRecipeOutput } from './conversionRecipes.js';
import { gameState } from './state.js';
import { showMessage } from './ui.js';
import { addTimelineLog } from './timeline.js';
import { resourceFlowDisplay } from './resourceFlowDisplay.js';
export class ConversionEngine {
    constructor() {
        this.activeConversions = new Map();
        this.facilities = new Map();
        this.lastUpdate = Date.now();
        // Initialize with basic facilities
        this.addFacility({
            id: 'basic_converter',
            name: '基本資源コンバーター',
            type: 'converter',
            recipes: ['processed_metal_basic', 'silicon_extraction', 'thermal_generation', 'electric_conversion', 'biomass_cultivation'],
            level: 1,
            efficiency: 1.0,
            isActive: true,
            progress: 0,
            autoMode: false
        });
    }
    addFacility(facility) {
        this.facilities.set(facility.id, facility);
    }
    getFacility(id) {
        return this.facilities.get(id);
    }
    getAllFacilities() {
        return Array.from(this.facilities.values());
    }
    // Check if we have enough resources for a recipe
    canAffordRecipe(recipeId) {
        const recipe = CONVERSION_RECIPES[recipeId];
        if (!recipe)
            return false;
        return recipe.inputs.resources.every(input => {
            const available = this.getResourceAmount(input.type, input.quality);
            return available >= input.amount;
        });
    }
    // Get the amount of a specific resource with quality consideration
    getResourceAmount(type, minQuality = QualityTier.POOR) {
        // For basic resources, use the standard gameState
        const basicResources = [
            ResourceType.COSMIC_DUST,
            ResourceType.ENERGY,
            ResourceType.ORGANIC_MATTER,
            ResourceType.BIOMASS,
            ResourceType.DARK_MATTER,
            ResourceType.THOUGHT_POINTS
        ];
        if (basicResources.includes(type)) {
            // Map to gameState properties
            switch (type) {
                case ResourceType.COSMIC_DUST:
                    return gameState.resources.cosmicDust;
                case ResourceType.ENERGY:
                    return gameState.resources.energy;
                case ResourceType.ORGANIC_MATTER:
                    return gameState.resources.organicMatter;
                case ResourceType.BIOMASS:
                    return gameState.resources.biomass;
                case ResourceType.DARK_MATTER:
                    return gameState.resources.darkMatter;
                case ResourceType.THOUGHT_POINTS:
                    return gameState.resources.thoughtPoints;
            }
        }
        // For advanced resources, check the storage
        const storage = gameState.advancedResources?.[type];
        if (storage && storage.quality >= minQuality) {
            return storage.amount;
        }
        return 0;
    }
    // Consume resources for a recipe
    consumeResources(recipe) {
        // First check if we can afford it
        if (!this.canAffordRecipe(recipe.id)) {
            return false;
        }
        // Consume the resources
        recipe.inputs.resources.forEach(input => {
            this.modifyResource(input.type, -input.amount, input.quality);
        });
        return true;
    }
    // Produce resources from a recipe
    produceResources(recipe, inputQuality, facilityEfficiency) {
        const { outputs } = calculateRecipeOutput(recipe, inputQuality, facilityEfficiency);
        // Produce main outputs
        outputs.forEach(output => {
            this.modifyResource(output.type, output.amount, output.quality);
        });
        // Handle byproducts
        if (recipe.byproducts) {
            recipe.byproducts.forEach(byproduct => {
                // Check if byproduct is produced (based on chance)
                if (Math.random() < byproduct.chance) {
                    const byproductAmount = Math.floor(byproduct.amount * facilityEfficiency);
                    this.modifyResource(byproduct.type, byproductAmount, byproduct.quality);
                    // Log byproduct generation
                    const resourceInfo = RESOURCE_METADATA[byproduct.type];
                    if (resourceInfo) {
                        addTimelineLog(`副産物: ${resourceInfo.name} x${byproductAmount}を獲得しました！`);
                    }
                }
            });
        }
        // Handle waste generation
        if (recipe.waste) {
            const wasteAmount = Math.floor(recipe.waste.amount * facilityEfficiency);
            this.modifyResource(recipe.waste.type, wasteAmount, QualityTier.POOR);
            // Check waste storage capacity and apply penalties
            this.checkWasteCapacity();
        }
    }
    // Modify resource amount (add or subtract)
    modifyResource(type, amount, quality) {
        // Initialize advanced resources if needed
        if (!gameState.advancedResources) {
            gameState.advancedResources = {};
        }
        // Handle basic resources
        const basicResourceMap = {
            [ResourceType.COSMIC_DUST]: 'cosmicDust',
            [ResourceType.ENERGY]: 'energy',
            [ResourceType.ORGANIC_MATTER]: 'organicMatter',
            [ResourceType.BIOMASS]: 'biomass',
            [ResourceType.DARK_MATTER]: 'darkMatter',
            [ResourceType.THOUGHT_POINTS]: 'thoughtPoints'
        };
        if (type in basicResourceMap) {
            const resourceKey = basicResourceMap[type];
            if (resourceKey) {
                gameState.resources[resourceKey] = Math.max(0, gameState.resources[resourceKey] + amount);
                return;
            }
        }
        // Handle advanced resources
        if (!gameState.advancedResources[type]) {
            gameState.advancedResources[type] = {
                amount: 0,
                quality: quality,
                accumulator: 0
            };
        }
        const storage = gameState.advancedResources[type];
        if (amount > 0) {
            // When adding resources, calculate weighted average quality
            const totalAmount = storage.amount + amount;
            const weightedQuality = (storage.amount * storage.quality + amount * quality) / totalAmount;
            storage.quality = Math.round(weightedQuality);
        }
        storage.amount = Math.max(0, storage.amount + amount);
    }
    // Check waste capacity and apply penalties
    checkWasteCapacity() {
        const wasteType = ResourceType.RADIOACTIVE_WASTE;
        const wasteStorage = gameState.advancedResources?.[wasteType];
        if (!wasteStorage)
            return;
        // Default waste storage capacity (will be increased by waste storage facilities)
        const baseCapacity = 1000;
        const wasteCapacity = gameState.wasteStorageCapacity || baseCapacity;
        // Calculate waste percentage
        const wastePercentage = wasteStorage.amount / wasteCapacity;
        // Apply production penalties based on waste levels
        if (wastePercentage > 0.8) {
            // Above 80% capacity: apply production penalty
            const penaltyFactor = wastePercentage > 0.95 ? 0.5 : 0.9; // 50% penalty above 95%, 10% above 80%
            // Apply penalty to all facilities
            this.facilities.forEach(facility => {
                facility.efficiency = facility.efficiency * penaltyFactor;
            });
            // Warning message
            if (wastePercentage > 0.95) {
                showMessage('⚠️ 廃棄物貯蔵庫が満杯に近づいています！生産効率が大幅に低下しています。', 3000);
                addTimelineLog('廃棄物危機: 貯蔵庫が95%を超えました。生産効率-50%');
            }
            else if (wastePercentage > 0.8) {
                showMessage('廃棄物レベルが高くなっています。生産効率が低下しています。', 2500);
            }
        }
    }
    // Get waste storage status
    getWasteStatus() {
        const wasteType = ResourceType.RADIOACTIVE_WASTE;
        const wasteStorage = gameState.advancedResources?.[wasteType];
        const amount = wasteStorage?.amount || 0;
        const capacity = gameState.wasteStorageCapacity || 1000;
        return {
            amount,
            capacity,
            percentage: (amount / capacity) * 100
        };
    }
    // Start a conversion process
    startConversion(recipeId, facilityId, manual = false) {
        const recipe = CONVERSION_RECIPES[recipeId];
        if (!recipe) {
            showMessage('無効なレシピです！', 2000);
            return false;
        }
        // Check if facility is already busy
        if (facilityId && this.isFacilityBusy(facilityId)) {
            showMessage('施設は既に稼働中です！', 2000);
            return false;
        }
        // Check and consume resources
        if (!this.consumeResources(recipe)) {
            showMessage('資源が不足しています！', 2000);
            return false;
        }
        // Calculate duration based on facility efficiency
        let duration = recipe.time * 1000; // Convert to milliseconds
        let efficiency = 1.0;
        if (facilityId) {
            const facility = this.facilities.get(facilityId);
            if (facility) {
                efficiency = facility.efficiency * (1 + facility.level * 0.1);
                duration = duration / efficiency;
                // Update facility state
                facility.currentRecipe = recipeId;
                facility.progress = 0;
            }
        }
        // Add to active conversions
        const conversionId = facilityId || `manual_${Date.now()}`;
        this.activeConversions.set(conversionId, {
            recipeId,
            startTime: Date.now(),
            duration,
            facilityId,
            manualConversion: manual
        });
        // Add timeline log
        addTimelineLog(`${recipe.name}の変換を開始しました`);
        showMessage(`${recipe.name}を開始しました！`, 1500);
        // Add to resource flow display
        resourceFlowDisplay.addConversion(conversionId, recipeId, duration);
        return true;
    }
    // Check if a facility is currently processing
    isFacilityBusy(facilityId) {
        return this.activeConversions.has(facilityId);
    }
    // Update all active conversions
    update() {
        const now = Date.now();
        const completed = [];
        // Update all active conversions
        this.activeConversions.forEach((conversion, id) => {
            const elapsed = now - conversion.startTime;
            const progress = Math.min(elapsed / conversion.duration, 1.0);
            // Update facility progress
            if (conversion.facilityId) {
                const facility = this.facilities.get(conversion.facilityId);
                if (facility) {
                    facility.progress = progress * 100;
                }
            }
            // Check if completed
            if (progress >= 1.0) {
                completed.push(id);
            }
        });
        // Process completed conversions
        completed.forEach(id => {
            const conversion = this.activeConversions.get(id);
            if (!conversion)
                return;
            const recipe = CONVERSION_RECIPES[conversion.recipeId];
            if (!recipe)
                return;
            // Calculate average input quality (simplified - using standard for now)
            const inputQuality = QualityTier.STANDARD;
            // Get facility efficiency
            let facilityEfficiency = 1.0;
            if (conversion.facilityId) {
                const facility = this.facilities.get(conversion.facilityId);
                if (facility) {
                    facilityEfficiency = facility.efficiency * (1 + facility.level * 0.1);
                    facility.currentRecipe = undefined;
                    facility.progress = 0;
                    // Check auto-mode
                    if (facility.autoMode && this.canAffordRecipe(conversion.recipeId)) {
                        // Restart the same recipe
                        setTimeout(() => {
                            this.startConversion(conversion.recipeId, conversion.facilityId, false);
                        }, 100);
                    }
                }
            }
            // Produce outputs
            this.produceResources(recipe, inputQuality, facilityEfficiency);
            // Remove from active conversions
            this.activeConversions.delete(id);
            // Remove from resource flow display
            resourceFlowDisplay.removeConversion(id);
            // Add completion log
            addTimelineLog(`${recipe.name}の変換が完了しました`);
            showMessage(`${recipe.name}が完了しました！`, 1500);
        });
        this.lastUpdate = now;
    }
    // Get all active conversions
    getActiveConversions() {
        const now = Date.now();
        const results = [];
        this.activeConversions.forEach((conversion, id) => {
            const recipe = CONVERSION_RECIPES[conversion.recipeId];
            if (!recipe)
                return;
            const elapsed = now - conversion.startTime;
            const progress = Math.min(elapsed / conversion.duration, 1.0);
            const remainingTime = Math.max(0, conversion.duration - elapsed) / 1000;
            const facility = conversion.facilityId ?
                this.facilities.get(conversion.facilityId) : undefined;
            results.push({
                id,
                recipe,
                progress,
                remainingTime,
                facility
            });
        });
        return results;
    }
    // Save state
    saveState() {
        return {
            facilities: Array.from(this.facilities.values()),
            activeConversions: Array.from(this.activeConversions.entries()).map(([id, conv]) => ({
                id,
                ...conv
            }))
        };
    }
    // Load state
    loadState(state) {
        if (state.facilities) {
            this.facilities.clear();
            state.facilities.forEach((facility) => {
                this.facilities.set(facility.id, facility);
            });
        }
        if (state.activeConversions) {
            this.activeConversions.clear();
            state.activeConversions.forEach((conv) => {
                const { id, ...conversion } = conv;
                // Adjust start time based on elapsed time
                const elapsed = Date.now() - conversion.startTime;
                if (elapsed < conversion.duration) {
                    this.activeConversions.set(id, conversion);
                }
            });
        }
    }
}
// Global conversion engine instance
export const conversionEngine = new ConversionEngine();
