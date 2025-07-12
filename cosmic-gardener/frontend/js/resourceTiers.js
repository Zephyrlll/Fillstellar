// Resource Tier System - Defines resource hierarchy and tier mechanics
import { ResourceType } from './resourceSystem.js';
export var ResourceTier;
(function (ResourceTier) {
    ResourceTier[ResourceTier["TIER_1"] = 1] = "TIER_1";
    ResourceTier[ResourceTier["TIER_2"] = 2] = "TIER_2";
    ResourceTier[ResourceTier["TIER_3"] = 3] = "TIER_3";
})(ResourceTier || (ResourceTier = {}));
// Tier 2 Resources
export var Tier2Resources;
(function (Tier2Resources) {
    // Energy
    Tier2Resources["STABILIZED_ENERGY"] = "stabilizedEnergy";
    // Materials
    Tier2Resources["REFINED_METAL"] = "refinedMetal";
    Tier2Resources["RARE_ELEMENTS"] = "rareElements";
    // Organic
    Tier2Resources["HIGH_POLYMER"] = "highPolymer";
    // Quantum
    Tier2Resources["QUANTUM_CRYSTAL"] = "quantumCrystal";
    // Waste
    Tier2Resources["RADIOACTIVE_WASTE"] = "radioactiveWaste";
})(Tier2Resources || (Tier2Resources = {}));
// Tier 3 Resources (for future implementation)
export var Tier3Resources;
(function (Tier3Resources) {
    Tier3Resources["CONDENSED_ENERGY"] = "condensedEnergy";
    Tier3Resources["SUPER_ALLOY"] = "superAlloy";
    Tier3Resources["NANOMACHINES"] = "nanomachines";
    Tier3Resources["THOUGHT_CRYSTAL"] = "thoughtCrystal";
    Tier3Resources["SPACETIME_FIBER"] = "spacetimeFiber";
})(Tier3Resources || (Tier3Resources = {}));
export const RESOURCE_TIERS = {
    [ResourceTier.TIER_1]: {
        tier: ResourceTier.TIER_1,
        name: '基礎資源',
        description: '宇宙で自然に発生する基本的な資源',
        baseConversionRatio: 1,
        processingTime: 1,
        color: '#ffffff',
        glowColor: '#cccccc'
    },
    [ResourceTier.TIER_2]: {
        tier: ResourceTier.TIER_2,
        name: '加工資源',
        description: '基礎資源を精製・加工した高度な資源',
        baseConversionRatio: 3,
        processingTime: 2,
        requiredTechnology: ['advanced_processing'],
        color: '#4169e1',
        glowColor: '#6495ed'
    },
    [ResourceTier.TIER_3]: {
        tier: ResourceTier.TIER_3,
        name: '高度資源',
        description: '最先端技術で生成される超高度な資源',
        baseConversionRatio: 5,
        processingTime: 3,
        requiredTechnology: ['quantum_manipulation', 'exotic_physics'],
        color: '#9400d3',
        glowColor: '#ba55d3'
    }
};
// Complete resource metadata including new Tier 2 resources
export const RESOURCE_METADATA = {
    // Tier 1 Resources (existing)
    [ResourceType.COSMIC_DUST]: {
        type: ResourceType.COSMIC_DUST,
        tier: ResourceTier.TIER_1,
        category: 'material'
    },
    [ResourceType.ENERGY]: {
        type: ResourceType.ENERGY,
        tier: ResourceTier.TIER_1,
        category: 'energy'
    },
    [ResourceType.ORGANIC_MATTER]: {
        type: ResourceType.ORGANIC_MATTER,
        tier: ResourceTier.TIER_1,
        category: 'organic'
    },
    [ResourceType.BIOMASS]: {
        type: ResourceType.BIOMASS,
        tier: ResourceTier.TIER_1,
        category: 'organic'
    },
    [ResourceType.DARK_MATTER]: {
        type: ResourceType.DARK_MATTER,
        tier: ResourceTier.TIER_1,
        category: 'exotic'
    },
    [ResourceType.THOUGHT_POINTS]: {
        type: ResourceType.THOUGHT_POINTS,
        tier: ResourceTier.TIER_1,
        category: 'consciousness'
    },
    // Tier 2 Resources (new)
    [Tier2Resources.STABILIZED_ENERGY]: {
        type: Tier2Resources.STABILIZED_ENERGY,
        tier: ResourceTier.TIER_2,
        category: 'energy',
        particleEffect: 'energy_stabilized'
    },
    [Tier2Resources.REFINED_METAL]: {
        type: Tier2Resources.REFINED_METAL,
        tier: ResourceTier.TIER_2,
        category: 'material',
        particleEffect: 'metal_shine'
    },
    [Tier2Resources.RARE_ELEMENTS]: {
        type: Tier2Resources.RARE_ELEMENTS,
        tier: ResourceTier.TIER_2,
        category: 'material',
        particleEffect: 'element_glow'
    },
    [Tier2Resources.HIGH_POLYMER]: {
        type: Tier2Resources.HIGH_POLYMER,
        tier: ResourceTier.TIER_2,
        category: 'organic',
        particleEffect: 'polymer_flow'
    },
    [Tier2Resources.QUANTUM_CRYSTAL]: {
        type: Tier2Resources.QUANTUM_CRYSTAL,
        tier: ResourceTier.TIER_2,
        category: 'exotic',
        particleEffect: 'quantum_shimmer'
    },
    [Tier2Resources.RADIOACTIVE_WASTE]: {
        type: Tier2Resources.RADIOACTIVE_WASTE,
        tier: ResourceTier.TIER_2,
        category: 'waste',
        particleEffect: 'radiation_warning'
    }
};
// Helper functions for tier calculations
export function getTierConversionRatio(fromTier, toTier) {
    if (fromTier >= toTier)
        return 1;
    let ratio = 1;
    for (let t = fromTier + 1; t <= toTier; t++) {
        ratio *= RESOURCE_TIERS[t].baseConversionRatio;
    }
    return ratio;
}
export function getTierProcessingTime(tier, baseTime) {
    return baseTime * RESOURCE_TIERS[tier].processingTime;
}
export function getResourceTier(resourceType) {
    const metadata = RESOURCE_METADATA[resourceType];
    return metadata ? metadata.tier : ResourceTier.TIER_1;
}
export function getTierColor(tier) {
    return RESOURCE_TIERS[tier].color;
}
export function getTierGlowColor(tier) {
    return RESOURCE_TIERS[tier].glowColor;
}
// Check if player has unlocked a specific tier
export function isTierUnlocked(tier, discoveredTechnologies) {
    const tierDef = RESOURCE_TIERS[tier];
    if (!tierDef.requiredTechnology)
        return true;
    return tierDef.requiredTechnology.every(tech => discoveredTechnologies.has(tech));
}
