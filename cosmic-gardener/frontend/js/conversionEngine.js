// Resource Conversion Engine
import { ResourceType, QualityTier } from './resourceSystem.js';
import { CONVERSION_RECIPES, calculateRecipeOutput } from './conversionRecipes.js';
import { gameState } from './state.js';
import { showMessage } from './ui.js';
import { addTimelineLog } from './timeline.js';
export class ConversionEngine {
    constructor() {
        this.activeConversions = new Map();
        this.facilities = new Map();
        this.lastUpdate = Date.now();
        // Initialize with basic facilities
        this.addFacility({
            id: 'basic_converter',
            name: 'Basic Resource Converter',
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
        outputs.forEach(output => {
            this.modifyResource(output.type, output.amount, output.quality);
        });
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
    // Start a conversion process
    startConversion(recipeId, facilityId, manual = false) {
        const recipe = CONVERSION_RECIPES[recipeId];
        if (!recipe) {
            showMessage('Invalid recipe!', 2000);
            return false;
        }
        // Check if facility is already busy
        if (facilityId && this.isFacilityBusy(facilityId)) {
            showMessage('Facility is already processing!', 2000);
            return false;
        }
        // Check and consume resources
        if (!this.consumeResources(recipe)) {
            showMessage('Not enough resources!', 2000);
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
        addTimelineLog(`Started ${recipe.name} conversion`);
        showMessage(`Started ${recipe.name}!`, 1500);
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
            // Add completion log
            addTimelineLog(`Completed ${recipe.name} conversion`);
            showMessage(`${recipe.name} complete!`, 1500);
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
