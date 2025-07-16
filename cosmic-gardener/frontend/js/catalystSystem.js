// Catalyst System - Time-limited boost effects for production facilities
import { ResourceType } from './resourceSystem.js';
// Catalyst Types
export var CatalystType;
(function (CatalystType) {
    // Basic Catalysts
    CatalystType["EFFICIENCY_BOOSTER"] = "efficiencyBooster";
    CatalystType["SPEED_ACCELERATOR"] = "speedAccelerator";
    CatalystType["QUALITY_ENHANCER"] = "qualityEnhancer";
    CatalystType["YIELD_MULTIPLIER"] = "yieldMultiplier";
    // Advanced Catalysts
    CatalystType["QUANTUM_STABILIZER"] = "quantumStabilizer";
    CatalystType["ENTROPY_REDUCER"] = "entropyReducer";
    CatalystType["TEMPORAL_ACCELERATOR"] = "temporalAccelerator";
    CatalystType["DIMENSIONAL_RESONATOR"] = "dimensionalResonator";
})(CatalystType || (CatalystType = {}));
// Catalyst Effects
export var CatalystEffect;
(function (CatalystEffect) {
    CatalystEffect["EFFICIENCY"] = "efficiency";
    CatalystEffect["SPEED"] = "speed";
    CatalystEffect["QUALITY"] = "quality";
    CatalystEffect["YIELD"] = "yield";
    CatalystEffect["WASTE_REDUCTION"] = "wasteReduction";
    CatalystEffect["BYPRODUCT_CHANCE"] = "byproductChance";
})(CatalystEffect || (CatalystEffect = {}));
// Catalyst Definitions
export const CATALYST_DEFINITIONS = {
    [CatalystType.EFFICIENCY_BOOSTER]: {
        id: CatalystType.EFFICIENCY_BOOSTER,
        name: '効率促進剤',
        description: '生産効率を一時的に向上させます',
        icon: '🔋',
        tier: 1,
        duration: 300, // seconds (5 minutes)
        effects: {
            [CatalystEffect.EFFICIENCY]: 1.5
        },
        cost: {
            resources: [
                { type: ResourceType.STABILIZED_ENERGY, amount: 50 },
                { type: ResourceType.RARE_ELEMENTS, amount: 10 }
            ]
        },
        requirements: {
            technology: ['advanced_processing']
        }
    },
    [CatalystType.SPEED_ACCELERATOR]: {
        id: CatalystType.SPEED_ACCELERATOR,
        name: '速度促進剤',
        description: '生産速度を一時的に向上させます',
        icon: '⚡',
        tier: 1,
        duration: 240, // seconds (4 minutes)
        effects: {
            [CatalystEffect.SPEED]: 2.0
        },
        cost: {
            resources: [
                { type: ResourceType.CONCENTRATED_ENERGY, amount: 25 },
                { type: ResourceType.QUANTUM_CRYSTAL, amount: 5 }
            ]
        },
        requirements: {
            technology: ['quantum_manipulation']
        }
    },
    [CatalystType.QUALITY_ENHANCER]: {
        id: CatalystType.QUALITY_ENHANCER,
        name: '品質向上剤',
        description: '生産物の品質を一時的に向上させます',
        icon: '💎',
        tier: 2,
        duration: 180, // seconds (3 minutes)
        effects: {
            [CatalystEffect.QUALITY]: 1.0 // +1 quality tier
        },
        cost: {
            resources: [
                { type: ResourceType.HYPER_CRYSTAL, amount: 10 },
                { type: ResourceType.DIMENSIONAL_ESSENCE, amount: 5 }
            ]
        },
        requirements: {
            technology: ['consciousness_studies', 'quantum_manipulation']
        }
    },
    [CatalystType.YIELD_MULTIPLIER]: {
        id: CatalystType.YIELD_MULTIPLIER,
        name: '収率増強剤',
        description: '生産量を一時的に増加させます',
        icon: '📈',
        tier: 2,
        duration: 360, // seconds (6 minutes)
        effects: {
            [CatalystEffect.YIELD]: 1.75
        },
        cost: {
            resources: [
                { type: ResourceType.ULTRA_ALLOY, amount: 15 },
                { type: ResourceType.QUANTUM_POLYMER, amount: 10 }
            ]
        },
        requirements: {
            technology: ['exotic_physics']
        }
    },
    [CatalystType.QUANTUM_STABILIZER]: {
        id: CatalystType.QUANTUM_STABILIZER,
        name: '量子安定化剤',
        description: '廃棄物生成を大幅に削減します',
        icon: '🌀',
        tier: 3,
        duration: 600, // seconds (10 minutes)
        effects: {
            [CatalystEffect.WASTE_REDUCTION]: 0.8, // 80% waste reduction
            [CatalystEffect.EFFICIENCY]: 1.2
        },
        cost: {
            resources: [
                { type: ResourceType.EXOTIC_MATTER, amount: 20 },
                { type: ResourceType.DIMENSIONAL_ESSENCE, amount: 15 }
            ]
        },
        requirements: {
            technology: ['dimensional_theory', 'exotic_physics']
        }
    },
    [CatalystType.ENTROPY_REDUCER]: {
        id: CatalystType.ENTROPY_REDUCER,
        name: 'エントロピー削減剤',
        description: '副産物の生成確率を大幅に向上させます',
        icon: '🔮',
        tier: 3,
        duration: 450, // seconds (7.5 minutes)
        effects: {
            [CatalystEffect.BYPRODUCT_CHANCE]: 2.5,
            [CatalystEffect.QUALITY]: 0.5
        },
        cost: {
            resources: [
                { type: ResourceType.HYPER_CRYSTAL, amount: 25 },
                { type: ResourceType.CONCENTRATED_ENERGY, amount: 50 }
            ]
        },
        requirements: {
            technology: ['consciousness_studies', 'quantum_manipulation']
        }
    },
    [CatalystType.TEMPORAL_ACCELERATOR]: {
        id: CatalystType.TEMPORAL_ACCELERATOR,
        name: '時間加速剤',
        description: '極限の速度向上を提供しますが短時間のみ',
        icon: '⏰',
        tier: 3,
        duration: 120, // seconds (2 minutes)
        effects: {
            [CatalystEffect.SPEED]: 5.0,
            [CatalystEffect.EFFICIENCY]: 0.7 // slight efficiency penalty
        },
        cost: {
            resources: [
                { type: ResourceType.DIMENSIONAL_ESSENCE, amount: 30 },
                { type: ResourceType.EXOTIC_MATTER, amount: 10 }
            ]
        },
        requirements: {
            technology: ['dimensional_theory', 'temporal_manipulation']
        }
    },
    [CatalystType.DIMENSIONAL_RESONATOR]: {
        id: CatalystType.DIMENSIONAL_RESONATOR,
        name: '次元共鳴剤',
        description: '全ての効果を総合的に向上させる究極の触媒',
        icon: '🌟',
        tier: 4,
        duration: 300, // seconds (5 minutes)
        effects: {
            [CatalystEffect.EFFICIENCY]: 2.0,
            [CatalystEffect.SPEED]: 2.0,
            [CatalystEffect.QUALITY]: 1.5,
            [CatalystEffect.YIELD]: 1.5,
            [CatalystEffect.WASTE_REDUCTION]: 0.9,
            [CatalystEffect.BYPRODUCT_CHANCE]: 2.0
        },
        cost: {
            resources: [
                { type: ResourceType.DIMENSIONAL_ESSENCE, amount: 100 },
                { type: ResourceType.EXOTIC_MATTER, amount: 50 },
                { type: ResourceType.HYPER_CRYSTAL, amount: 50 },
                { type: ResourceType.ULTRA_ALLOY, amount: 25 }
            ]
        },
        requirements: {
            technology: ['dimensional_theory', 'exotic_physics', 'consciousness_studies', 'temporal_manipulation']
        }
    }
};
// Active Catalyst Instance
export class CatalystInstance {
    catalystType;
    facilityId;
    startTime;
    definition; // TODO: Define CatalystDefinition interface
    endTime;
    constructor(catalystType, facilityId, startTime) {
        this.catalystType = catalystType;
        this.facilityId = facilityId;
        this.startTime = startTime;
        this.definition = CATALYST_DEFINITIONS[catalystType];
        this.endTime = startTime + (this.definition.duration * 1000); // Convert to milliseconds
    }
    isActive() {
        return Date.now() < this.endTime;
    }
    getRemainingTime() {
        return Math.max(0, this.endTime - Date.now());
    }
    getRemainingPercentage() {
        const totalDuration = this.definition.duration * 1000;
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, Math.min(100, (1 - elapsed / totalDuration) * 100));
    }
    getEffects() {
        if (!this.isActive()) {
            return {};
        }
        return this.definition.effects;
    }
}
// Catalyst Manager
export class CatalystManager {
    activeCatalysts; // facilityId -> CatalystInstance
    catalystInventory; // catalystType -> amount
    constructor() {
        this.activeCatalysts = new Map();
        this.catalystInventory = new Map();
    }
    // Add catalyst to inventory
    addCatalyst(catalystType, amount = 1) {
        const current = this.catalystInventory.get(catalystType) || 0;
        this.catalystInventory.set(catalystType, current + amount);
    }
    // Check if player has catalyst in inventory
    hasCatalyst(catalystType, amount = 1) {
        const current = this.catalystInventory.get(catalystType) || 0;
        return current >= amount;
    }
    // Use catalyst on facility
    useCatalyst(catalystType, facilityId) {
        if (!this.hasCatalyst(catalystType)) {
            return false;
        }
        // Remove existing catalyst from facility if any
        if (this.activeCatalysts.has(facilityId)) {
            this.activeCatalysts.delete(facilityId);
        }
        // Consume catalyst from inventory
        const current = this.catalystInventory.get(catalystType);
        if (current !== undefined) {
            this.catalystInventory.set(catalystType, current - 1);
        }
        // Apply catalyst to facility
        const instance = new CatalystInstance(catalystType, facilityId, Date.now());
        this.activeCatalysts.set(facilityId, instance);
        return true;
    }
    // Get active catalyst for facility
    getActiveCatalyst(facilityId) {
        const catalyst = this.activeCatalysts.get(facilityId);
        if (catalyst && !catalyst.isActive()) {
            this.activeCatalysts.delete(facilityId);
            return null;
        }
        return catalyst || null;
    }
    // Get all active catalysts
    getActiveCatalysts() {
        const active = [];
        for (const [facilityId, catalyst] of this.activeCatalysts.entries()) {
            if (catalyst.isActive()) {
                active.push(catalyst);
            }
            else {
                this.activeCatalysts.delete(facilityId);
            }
        }
        return active;
    }
    // Apply catalyst effects to facility
    applyCatalystEffects(facility, baseEffects) {
        const catalyst = this.getActiveCatalyst(facility.id);
        if (!catalyst) {
            return baseEffects;
        }
        const effects = catalyst.getEffects();
        const modifiedEffects = { ...baseEffects };
        // Apply efficiency multiplier
        if (effects[CatalystEffect.EFFICIENCY]) {
            modifiedEffects.efficiency = (modifiedEffects.efficiency || 1.0) * effects[CatalystEffect.EFFICIENCY];
        }
        // Apply speed multiplier
        if (effects[CatalystEffect.SPEED]) {
            modifiedEffects.speed = (modifiedEffects.speed || 1.0) * effects[CatalystEffect.SPEED];
        }
        // Apply quality bonus
        if (effects[CatalystEffect.QUALITY]) {
            modifiedEffects.qualityBonus = (modifiedEffects.qualityBonus || 0) + effects[CatalystEffect.QUALITY];
        }
        // Apply yield multiplier
        if (effects[CatalystEffect.YIELD]) {
            modifiedEffects.yield = (modifiedEffects.yield || 1.0) * effects[CatalystEffect.YIELD];
        }
        // Apply waste reduction
        if (effects[CatalystEffect.WASTE_REDUCTION]) {
            modifiedEffects.wasteReduction = effects[CatalystEffect.WASTE_REDUCTION];
        }
        // Apply byproduct chance multiplier
        if (effects[CatalystEffect.BYPRODUCT_CHANCE]) {
            modifiedEffects.byproductChance = effects[CatalystEffect.BYPRODUCT_CHANCE];
        }
        return modifiedEffects;
    }
    // Update all catalysts (cleanup expired ones)
    update() {
        for (const [facilityId, catalyst] of this.activeCatalysts.entries()) {
            if (!catalyst.isActive()) {
                this.activeCatalysts.delete(facilityId);
            }
        }
    }
    // Save state
    saveState() {
        return {
            activeCatalysts: Array.from(this.activeCatalysts.entries()).map(([facilityId, catalyst]) => ({
                facilityId,
                catalystType: catalyst.catalystType,
                startTime: catalyst.startTime,
                endTime: catalyst.endTime
            })),
            catalystInventory: Array.from(this.catalystInventory.entries())
        };
    }
    // Load state
    loadState(state) {
        if (state.activeCatalysts) {
            this.activeCatalysts.clear();
            state.activeCatalysts.forEach(catalystData => {
                const catalyst = new CatalystInstance(catalystData.catalystType, catalystData.facilityId, catalystData.startTime);
                catalyst.endTime = catalystData.endTime;
                this.activeCatalysts.set(catalystData.facilityId, catalyst);
            });
        }
        if (state.catalystInventory) {
            this.catalystInventory.clear();
            state.catalystInventory.forEach(([catalystType, amount]) => {
                this.catalystInventory.set(catalystType, amount);
            });
        }
    }
}
// Global catalyst manager instance
export const catalystManager = new CatalystManager();
// Helper functions
export function getCatalystDefinition(catalystType) {
    return CATALYST_DEFINITIONS[catalystType];
}
export function getAvailableCatalysts(discoveredTechnologies) {
    return Object.values(CATALYST_DEFINITIONS).filter(catalyst => {
        if (!catalyst.requirements?.technology) {
            return true;
        }
        return catalyst.requirements.technology.every(tech => discoveredTechnologies.has(tech));
    });
}
export function canAffordCatalyst(catalystType, gameState) {
    const catalyst = CATALYST_DEFINITIONS[catalystType];
    if (!catalyst)
        return false;
    return catalyst.cost.resources.every((cost) => {
        const available = gameState.advancedResources?.[cost.type]?.amount || 0;
        return available >= cost.amount;
    });
}
