// Conversion Recipes for Resource System

import { ResourceType, QualityTier, ConversionRecipe } from './resourceSystem.js';

export const CONVERSION_RECIPES: Record<string, ConversionRecipe> = {
    // Basic Metal Processing
    'processed_metal_basic': {
        id: 'processed_metal_basic',
        name: '基本金属加工',
        description: 'エネルギーを使って宇宙の塵を加工金属に精製します',
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
        name: 'シリコン抽出',
        description: '宇宙の塵からシリコンを抽出します',
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
        name: '宇宙塵分離',
        description: '宇宙の塵を特化した成分に分離します',
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
        name: '熱エネルギー生成',
        description: '生エネルギーを熱エネルギーに変換します',
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
        time: 2,  // Reduced from 5 seconds for faster conversion
        efficiency: 1.2,
        discovered: true
    },
    
    'electric_conversion': {
        id: 'electric_conversion',
        name: '電気変換',
        description: '熱エネルギーを電気に変換します',
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
        time: 3,  // Reduced from 8 seconds for faster conversion
        efficiency: 0.8,
        discovered: true
    },
    
    // Basic Dark Matter Extraction
    'dark_matter_extraction': {
        id: 'dark_matter_extraction',
        name: 'ダークマター抽出',
        description: '高エネルギーを使用してダークマターを抽出します',
        inputs: {
            resources: [
                { type: ResourceType.ENERGY, amount: 1000, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.DARK_MATTER, amount: 1, quality: QualityTier.STANDARD }
            ]
        },
        time: 30,
        efficiency: 1.0,
        discovered: true
    },
    
    // Organic Processing
    'organic_synthesis': {
        id: 'organic_synthesis',
        name: '有機合成',
        description: '単純な化合物から複合有機物を作成します',
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
        name: '酵素培養',
        description: '有機物から酵素を培養します',
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
        name: 'バイオマス培養',
        description: '有機物からバイオマスを培養します',
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
        name: 'バイオマス進化',
        description: '微生物バイオマスを植物バイオマスに進化させます',
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
        name: 'ダークマター安定化',
        description: '不安定なダークマター粒子を安定化します',
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
        name: '思考精製',
        description: '基本思考を特化した形に精製します',
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
        name: '合金鍛造',
        description: '加工金属から高度な合金を鍛造します',
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
        name: '金属品質向上',
        description: '加工金属の品質を向上させます',
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
        name: '核融合',
        description: '電気エネルギーを核エネルギーに融合します',
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
        name: '遺伝子抜出',
        description: '複合有機物から遺伝物質を抜出します',
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
    },
    
    // Tier 2 Resource Conversions
    'energy_stabilization': {
        id: 'energy_stabilization',
        name: 'エネルギー安定化',
        description: '生エネルギーを安定化エネルギーに変換します',
        inputs: {
            resources: [
                { type: ResourceType.ENERGY, amount: 300, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.STABILIZED_ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        time: 20,
        efficiency: 0.9,
        discovered: false,
        requirements: {
            technology: ['advanced_processing'],
            facilities: ['energy_stabilizer']
        },
        waste: {
            type: ResourceType.RADIOACTIVE_WASTE,
            amount: 10
        }
    },
    
    'metal_refinement': {
        id: 'metal_refinement',
        name: '金属精製',
        description: '宇宙の塵から高純度の金属を精製します',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 500, quality: QualityTier.STANDARD },
                { type: ResourceType.ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.REFINED_METAL, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        time: 30,
        efficiency: 0.85,
        discovered: false,
        requirements: {
            technology: ['advanced_processing'],
            facilities: ['electromagnetic_separator']
        },
        byproducts: [{
            type: ResourceType.RARE_ELEMENTS,
            amount: 5,
            chance: 0.1,
            quality: QualityTier.STANDARD
        }]
    },
    
    'polymer_synthesis': {
        id: 'polymer_synthesis',
        name: 'ポリマー合成',
        description: '有機物から高分子ポリマーを合成します',
        inputs: {
            resources: [
                { type: ResourceType.ORGANIC_MATTER, amount: 300, quality: QualityTier.STANDARD },
                { type: ResourceType.STABILIZED_ENERGY, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.HIGH_POLYMER, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        time: 25,
        efficiency: 0.8,
        discovered: false,
        requirements: {
            technology: ['advanced_processing', 'organic_chemistry'],
            facilities: ['high_pressure_synthesizer']
        }
    },
    
    'quantum_crystallization': {
        id: 'quantum_crystallization',
        name: '量子結晶化',
        description: 'ダークマターとエネルギーから量子結晶を生成します',
        inputs: {
            resources: [
                { type: ResourceType.DARK_MATTER, amount: 200, quality: QualityTier.STANDARD },
                { type: ResourceType.STABILIZED_ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.QUANTUM_CRYSTAL, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        time: 40,
        efficiency: 0.7,
        discovered: false,
        requirements: {
            technology: ['quantum_manipulation', 'advanced_processing'],
            facilities: ['quantum_condenser']
        }
    },
    
    // Waste processing
    'waste_recycling': {
        id: 'waste_recycling',
        name: '廃棄物リサイクル',
        description: '放射性廃棄物を無害な物質に処理します',
        inputs: {
            resources: [
                { type: ResourceType.RADIOACTIVE_WASTE, amount: 100, quality: QualityTier.POOR },
                { type: ResourceType.ENERGY, amount: 200, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 50, quality: QualityTier.POOR }
            ]
        },
        time: 60,
        efficiency: 0.5,
        discovered: false,
        requirements: {
            technology: ['waste_management'],
            facilities: ['recycling_facility']
        }
    },
    
    // 仮レシピ1-7
    'test_recipe_1': {
        id: 'test_recipe_1',
        name: '仮1',
        description: 'テスト用レシピ1',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 10, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.ENERGY, amount: 5, quality: QualityTier.STANDARD }
            ]
        },
        time: 5,
        efficiency: 1.0,
        discovered: true
    },
    
    'test_recipe_2': {
        id: 'test_recipe_2',
        name: '仮2',
        description: 'テスト用レシピ2',
        inputs: {
            resources: [
                { type: ResourceType.ENERGY, amount: 20, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.PROCESSED_METAL, amount: 3, quality: QualityTier.HIGH_QUALITY }
            ]
        },
        time: 8,
        efficiency: 1.0,
        discovered: true
    },
    
    'test_recipe_3': {
        id: 'test_recipe_3',
        name: '仮3',
        description: 'テスト用レシピ3',
        inputs: {
            resources: [
                { type: ResourceType.ORGANIC_MATTER, amount: 15, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.BIOMASS, amount: 10, quality: QualityTier.STANDARD }
            ]
        },
        time: 6,
        efficiency: 1.0,
        discovered: true
    },
    
    'test_recipe_4': {
        id: 'test_recipe_4',
        name: '仮4',
        description: 'テスト用レシピ4',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 50, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.ADVANCED_CIRCUIT, amount: 1, quality: QualityTier.STANDARD }
            ]
        },
        time: 12,
        efficiency: 1.0,
        discovered: true
    },
    
    'test_recipe_5': {
        id: 'test_recipe_5',
        name: '仮5',
        description: 'テスト用レシピ5',
        inputs: {
            resources: [
                { type: ResourceType.ENERGY, amount: 100, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.QUANTUM_PROCESSOR, amount: 1, quality: QualityTier.STANDARD }
            ]
        },
        time: 20,
        efficiency: 1.0,
        discovered: true
    },
    
    'test_recipe_6': {
        id: 'test_recipe_6',
        name: '仮6',
        description: 'テスト用レシピ6',
        inputs: {
            resources: [
                { type: ResourceType.DARK_MATTER, amount: 5, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.EXOTIC_MATTER, amount: 2, quality: QualityTier.PERFECT }
            ]
        },
        time: 30,
        efficiency: 1.0,
        discovered: true
    },
    
    'test_recipe_7': {
        id: 'test_recipe_7',
        name: '仮7',
        description: 'テスト用レシピ7',
        inputs: {
            resources: [
                { type: ResourceType.COSMIC_DUST, amount: 1000, quality: QualityTier.STANDARD },
                { type: ResourceType.ENERGY, amount: 500, quality: QualityTier.STANDARD }
            ]
        },
        outputs: {
            resources: [
                { type: ResourceType.DARK_MATTER, amount: 10, quality: QualityTier.LEGENDARY }
            ]
        },
        time: 60,
        efficiency: 1.0,
        discovered: true
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