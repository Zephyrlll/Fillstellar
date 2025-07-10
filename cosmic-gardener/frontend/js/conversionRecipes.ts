// Conversion Recipes for Resource System

import { ResourceType, QualityTier, ConversionRecipe } from './resourceSystem.js';

export const CONVERSION_RECIPES: Record<string, ConversionRecipe> = {
    // Basic Metal Processing
    'processed_metal_basic': {
        id: 'processed_metal_basic',
        name: 'Basic Metal Processing',
        description: 'Refine cosmic dust into processed metal using energy',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 100, quality: QualityTier.STANDARD },
                { type: ResourceType.ENERGY, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.PROCESSED_METAL, amount: 10, quality: QualityTier.STANDARD }
            ]
        },
        time: 10,
        efficiency: 1.0,
        discovered: true
    },
    
    // Silicon Extraction
    'silicon_extraction': {
        id: 'silicon_extraction',
        name: 'Silicon Extraction',
        description: 'Extract silicon from cosmic dust',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 150, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.SILICON, amount: 5, quality: QualityTier.STANDARD }
            ]
        },
        time: 15,
        efficiency: 0.8,
        discovered: true
    },
    
    // Dust Refinement
    'dust_separation': {
        id: 'dust_separation',
        name: 'Dust Separation',
        description: 'Separate cosmic dust into specialized components',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 1000, quality: QualityTier.STANDARD },
                { type: ResourceType.ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.IRON_DUST, amount: 400, quality: QualityTier.STANDARD },
                { type: ResourceType.CARBON_DUST, amount: 300, quality: QualityTier.STANDARD },
                { type: ResourceType.SILICON_DUST, amount: 200, quality: QualityTier.STANDARD },
                { type: ResourceType.RARE_EARTH_DUST, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        time: 30,
        efficiency: 0.95,
        discovered: false,
        requirements: {
            technology: ['advanced_separation']
        }
    },
    
    // Energy Conversion
    'thermal_generation': {
        id: 'thermal_generation',
        name: 'Thermal Generation',
        description: 'Convert raw energy into thermal energy',
        inputs: {
            resources: [
                { type: ResourceType.ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.THERMAL_ENERGY, amount: 120, quality: QualityTier.STANDARD }
            ]
        },
        time: 5,
        efficiency: 1.2,
        discovered: true
    },
    
    'electric_conversion': {
        id: 'electric_conversion',
        name: 'Electric Conversion',
        description: 'Transform thermal energy into electricity',
        inputs: {
            resources: [
                { type: ResourceType.THERMAL_ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.ELECTRIC_ENERGY, amount: 80, quality: QualityTier.STANDARD }
            ]
        },
        time: 8,
        efficiency: 0.8,
        discovered: true
    },
    
    // Organic Processing
    'organic_synthesis': {
        id: 'organic_synthesis',
        name: 'Organic Synthesis',
        description: 'Create complex organics from simple compounds',
        inputs: {
            resources: [
                { type: ResourceType.CARBON_DUST, amount: 50, quality: QualityTier.STANDARD },
                { type: ResourceType.ORGANIC_MATTER, amount: 100, quality: QualityTier.STANDARD },
                { type: ResourceType.ENERGY, amount: 25, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.COMPLEX_ORGANICS, amount: 75, quality: QualityTier.STANDARD }
            ]
        },
        time: 20,
        efficiency: 0.75,
        discovered: false
    },
    
    'enzyme_cultivation': {
        id: 'enzyme_cultivation',
        name: 'Enzyme Cultivation',
        description: 'Cultivate enzymes from organic matter',
        inputs: {
            resources: [
                { type: ResourceType.ORGANIC_MATTER, amount: 200, quality: QualityTier.STANDARD },
                { type: ResourceType.BIOMASS, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.ENZYMES, amount: 25, quality: QualityTier.STANDARD }
            ]
        },
        time: 45,
        efficiency: 0.5,
        discovered: false,
        requirements: {
            technology: ['biochemistry']
        }
    },
    
    // Biomass Conversion
    'biomass_cultivation': {
        id: 'biomass_cultivation',
        name: 'Biomass Cultivation',
        description: 'Grow biomass from organic matter',
        inputs: {
            resources: [
                { type: ResourceType.ORGANIC_MATTER, amount: 100, quality: QualityTier.STANDARD },
                { type: ResourceType.ENERGY, amount: 20, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.MICROBIAL_BIOMASS, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        time: 25,
        efficiency: 0.5,
        discovered: true
    },
    
    'biomass_evolution': {
        id: 'biomass_evolution',
        name: 'Biomass Evolution',
        description: 'Evolve microbial biomass into plant biomass',
        inputs: {
            resources: [
                { type: ResourceType.MICROBIAL_BIOMASS, amount: 100, quality: QualityTier.STANDARD },
                { type: ResourceType.GENETIC_MATERIAL, amount: 10, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.PLANT_BIOMASS, amount: 30, quality: QualityTier.STANDARD }
            ]
        },
        time: 60,
        efficiency: 0.3,
        discovered: false,
        requirements: {
            technology: ['genetic_engineering']
        }
    },
    
    // Dark Matter Processing
    'dark_matter_stabilization': {
        id: 'dark_matter_stabilization',
        name: 'Dark Matter Stabilization',
        description: 'Stabilize volatile dark matter particles',
        inputs: {
            resources: [
                { type: ResourceType.DARK_MATTER, amount: 100, quality: QualityTier.STANDARD },
                { type: ResourceType.QUANTUM_ENERGY, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.STABLE_DARK_MATTER, amount: 80, quality: QualityTier.STANDARD }
            ]
        },
        time: 40,
        efficiency: 0.8,
        discovered: false,
        requirements: {
            technology: ['quantum_manipulation']
        }
    },
    
    // Thought Processing
    'thought_refinement': {
        id: 'thought_refinement',
        name: 'Thought Refinement',
        description: 'Refine basic thoughts into specialized forms',
        inputs: {
            resources: [
                { type: ResourceType.THOUGHT_POINTS, amount: 1000, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.BASIC_THOUGHTS, amount: 400, quality: QualityTier.STANDARD },
                { type: ResourceType.CREATIVE_THOUGHTS, amount: 300, quality: QualityTier.STANDARD },
                { type: ResourceType.SCIENTIFIC_THOUGHTS, amount: 200, quality: QualityTier.STANDARD },
                { type: ResourceType.PHILOSOPHICAL_THOUGHTS, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        time: 50,
        efficiency: 1.0,
        discovered: false,
        requirements: {
            technology: ['consciousness_studies']
        }
    },
    
    // Advanced Alloy Creation
    'alloy_forging': {
        id: 'alloy_forging',
        name: 'Alloy Forging',
        description: 'Forge advanced alloys from processed metals',
        inputs: {
            resources: [
                { type: ResourceType.PROCESSED_METAL, amount: 50, quality: QualityTier.STANDARD },
                { type: ResourceType.RARE_EARTH_DUST, amount: 10, quality: QualityTier.STANDARD },
                { type: ResourceType.NUCLEAR_ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.ALLOY, amount: 20, quality: QualityTier.HIGH_QUALITY }
            ]
        },
        time: 90,
        efficiency: 0.4,
        discovered: false,
        requirements: {
            technology: ['advanced_metallurgy'],
            facilities: ['fusion_forge']
        }
    },
    
    // Quality Enhancement
    'quality_enhancement_metal': {
        id: 'quality_enhancement_metal',
        name: 'Metal Quality Enhancement',
        description: 'Enhance the quality of processed metal',
        inputs: {
            resources: [
                { type: ResourceType.PROCESSED_METAL, amount: 100, quality: QualityTier.STANDARD },
                { type: ResourceType.QUANTUM_ENERGY, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.PROCESSED_METAL, amount: 50, quality: QualityTier.HIGH_QUALITY }
            ]
        },
        time: 60,
        efficiency: 0.5,
        discovered: false,
        requirements: {
            technology: ['quality_control'],
            minQuality: QualityTier.STANDARD
        }
    },
    
    // Energy Fusion
    'nuclear_fusion': {
        id: 'nuclear_fusion',
        name: 'Nuclear Fusion',
        description: 'Fuse electric energy into nuclear energy',
        inputs: {
            resources: [
                { type: ResourceType.ELECTRIC_ENERGY, amount: 1000, quality: QualityTier.STANDARD },
                { type: ResourceType.PROCESSED_METAL, amount: 10, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.NUCLEAR_ENERGY, amount: 500, quality: QualityTier.HIGH_QUALITY }
            ]
        },
        time: 120,
        efficiency: 0.5,
        discovered: false,
        requirements: {
            technology: ['fusion_technology'],
            facilities: ['fusion_reactor']
        }
    },
    
    // Genetic Engineering
    'genetic_extraction': {
        id: 'genetic_extraction',
        name: 'Genetic Extraction',
        description: 'Extract genetic material from complex organics',
        inputs: {
            resources: [
                { type: ResourceType.COMPLEX_ORGANICS, amount: 200, quality: QualityTier.STANDARD },
                { type: ResourceType.ENZYMES, amount: 20, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.GENETIC_MATERIAL, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        time: 75,
        efficiency: 0.25,
        discovered: false,
        requirements: {
            technology: ['genetic_engineering']
        }
    }
};

// Helper function to get available recipes based on current game state
export function getAvailableRecipes(discoveredTechnologies: Set<string>, availableFacilities: Set<string>): ConversionRecipe[] {
    return Object.values(CONVERSION_RECIPES).filter(recipe => {
        // Check if recipe is discovered
        if (!recipe.discovered && recipe.requirements?.technology) {
            const hasAllTech = recipe.requirements.technology.every(tech => 
                discoveredTechnologies.has(tech)
            );
            if (!hasAllTech) return false;
        }
        
        // Check if required facilities are available
        if (recipe.requirements?.facilities) {
            const hasAllFacilities = recipe.requirements.facilities.every(facility => 
                availableFacilities.has(facility)
            );
            if (!hasAllFacilities) return false;
        }
        
        return true;
    });
}

// Calculate actual output based on efficiency and quality
export function calculateRecipeOutput(recipe: ConversionRecipe, inputQuality: QualityTier, facilityEfficiency: number = 1.0): {
    outputs: typeof recipe.outputs.resources;
    time: number;
} {
    const qualityBonus = inputQuality / QualityTier.LEGENDARY; // 0.0 to 1.0
    const totalEfficiency = recipe.efficiency * facilityEfficiency * (1 + qualityBonus * 0.5);
    
    const adjustedOutputs = recipe.outputs.resources.map(resource => ({
        ...resource,
        amount: Math.floor(resource.amount * totalEfficiency),
        quality: Math.min(resource.quality + Math.floor(qualityBonus * 2), QualityTier.LEGENDARY)
    }));
    
    const adjustedTime = recipe.time / (1 + qualityBonus * 0.3); // Higher quality inputs process faster
    
    return {
        outputs: adjustedOutputs,
        time: adjustedTime
    };
}