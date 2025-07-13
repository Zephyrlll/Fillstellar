// Enhanced Resource System Types and Structures
export const ResourceType = {
    // Basic Resources
    COSMIC_DUST: "cosmicDust",
    ENERGY: "energy",
    ORGANIC_MATTER: "organicMatter",
    BIOMASS: "biomass",
    DARK_MATTER: "darkMatter",
    THOUGHT_POINTS: "thoughtPoints",
    // Cosmic Dust Subtypes
    IRON_DUST: "ironDust",
    CARBON_DUST: "carbonDust",
    SILICON_DUST: "siliconDust",
    RARE_EARTH_DUST: "rareEarthDust",
    // Energy Subtypes
    THERMAL_ENERGY: "thermalEnergy",
    ELECTRIC_ENERGY: "electricEnergy",
    NUCLEAR_ENERGY: "nuclearEnergy",
    QUANTUM_ENERGY: "quantumEnergy",
    // Organic Matter Subtypes
    SIMPLE_ORGANICS: "simpleOrganics",
    COMPLEX_ORGANICS: "complexOrganics",
    GENETIC_MATERIAL: "geneticMaterial",
    ENZYMES: "enzymes",
    // Biomass Subtypes
    MICROBIAL_BIOMASS: "microbialBiomass",
    PLANT_BIOMASS: "plantBiomass",
    ANIMAL_BIOMASS: "animalBiomass",
    INTELLIGENT_BIOMASS: "intelligentBiomass",
    // Dark Matter Subtypes
    STABLE_DARK_MATTER: "stableDarkMatter",
    VOLATILE_DARK_MATTER: "volatileDarkMatter",
    EXOTIC_DARK_MATTER: "exoticDarkMatter",
    PRIMORDIAL_DARK_MATTER: "primordialDarkMatter",
    // Thought Points Subtypes
    BASIC_THOUGHTS: "basicThoughts",
    CREATIVE_THOUGHTS: "creativeThoughts",
    SCIENTIFIC_THOUGHTS: "scientificThoughts",
    PHILOSOPHICAL_THOUGHTS: "philosophicalThoughts",
    // Processed Resources
    PROCESSED_METAL: "processedMetal",
    SILICON: "silicon",
    ALLOY: "alloy",
    // Tier 2 Resources
    STABILIZED_ENERGY: "stabilizedEnergy",
    REFINED_METAL: "refinedMetal",
    RARE_ELEMENTS: "rareElements",
    HIGH_POLYMER: "highPolymer",
    QUANTUM_CRYSTAL: "quantumCrystal",
    RADIOACTIVE_WASTE: "radioactiveWaste",
    // Tier 3 Resources
    CONCENTRATED_ENERGY: "concentratedEnergy",
    HYPER_CRYSTAL: "hyperCrystal",
    DIMENSIONAL_ESSENCE: "dimensionalEssence",
    ULTRA_ALLOY: "ultraAlloy",
    QUANTUM_POLYMER: "quantumPolymer",
    EXOTIC_MATTER: "exoticMatter"
};

export const QualityTier = {
    POOR: 0,
    STANDARD: 1,
    HIGH_QUALITY: 2,
    PERFECT: 3,
    LEGENDARY: 4
};
export const QUALITY_MULTIPLIERS = {
    [QualityTier.POOR]: {
        efficiency: 0.5,
        value: 0.5,
        color: '#808080',
        particleColor: '#606060',
        glowIntensity: 0.1
    },
    [QualityTier.STANDARD]: {
        efficiency: 1.0,
        value: 1.0,
        color: '#ffffff',
        particleColor: '#cccccc',
        glowIntensity: 0.3
    },
    [QualityTier.HIGH_QUALITY]: {
        efficiency: 1.5,
        value: 1.5,
        color: '#4169e1',
        particleColor: '#6495ed',
        glowIntensity: 0.5
    },
    [QualityTier.PERFECT]: {
        efficiency: 2.0,
        value: 2.0,
        color: '#9400d3',
        particleColor: '#ba55d3',
        glowIntensity: 0.7
    },
    [QualityTier.LEGENDARY]: {
        efficiency: 3.0,
        value: 3.0,
        color: '#ffd700',
        particleColor: '#ffed4e',
        glowIntensity: 1.0
    }
};
// Resource metadata for UI and game logic
export const RESOURCE_METADATA = {
    // Basic Resources
    [ResourceType.COSMIC_DUST]: {
        name: 'Cosmic Dust',
        icon: '✨',
        category: 'basic',
        description: 'The fundamental building blocks of the universe'
    },
    [ResourceType.ENERGY]: {
        name: 'Energy',
        icon: '⚡',
        category: 'basic',
        description: 'Pure energy harvested from stars and reactions'
    },
    [ResourceType.ORGANIC_MATTER]: {
        name: 'Organic Matter',
        icon: '🌱',
        category: 'basic',
        description: 'Complex carbon-based molecules essential for life'
    },
    [ResourceType.BIOMASS]: {
        name: 'Biomass',
        icon: '🌿',
        category: 'basic',
        description: 'Living matter from evolved organisms'
    },
    [ResourceType.DARK_MATTER]: {
        name: 'Dark Matter',
        icon: '🌑',
        category: 'basic',
        description: 'Mysterious substance that shapes the cosmos'
    },
    [ResourceType.THOUGHT_POINTS]: {
        name: 'Thought Points',
        icon: '💭',
        category: 'basic',
        description: 'Consciousness crystallized from intelligent beings'
    },
    // Cosmic Dust Subtypes
    [ResourceType.IRON_DUST]: {
        name: 'Iron Dust',
        icon: '🔩',
        category: 'dust',
        baseResource: ResourceType.COSMIC_DUST,
        description: 'Metallic particles for construction'
    },
    [ResourceType.CARBON_DUST]: {
        name: 'Carbon Dust',
        icon: '◆',
        category: 'dust',
        baseResource: ResourceType.COSMIC_DUST,
        description: 'Carbon particles for organic synthesis'
    },
    [ResourceType.SILICON_DUST]: {
        name: 'Silicon Dust',
        icon: '💎',
        category: 'dust',
        baseResource: ResourceType.COSMIC_DUST,
        description: 'Crystalline particles for electronics'
    },
    [ResourceType.RARE_EARTH_DUST]: {
        name: 'Rare Earth Dust',
        icon: '✦',
        category: 'dust',
        baseResource: ResourceType.COSMIC_DUST,
        description: 'Exotic elements for advanced technology'
    },
    // Energy Subtypes
    [ResourceType.THERMAL_ENERGY]: {
        name: 'Thermal Energy',
        icon: '🔥',
        category: 'energy',
        baseResource: ResourceType.ENERGY,
        description: 'Heat energy for basic processes'
    },
    [ResourceType.ELECTRIC_ENERGY]: {
        name: 'Electric Energy',
        icon: '⚡',
        category: 'energy',
        baseResource: ResourceType.ENERGY,
        description: 'Electrical power for precision work'
    },
    [ResourceType.NUCLEAR_ENERGY]: {
        name: 'Nuclear Energy',
        icon: '☢️',
        category: 'energy',
        baseResource: ResourceType.ENERGY,
        description: 'Atomic power for massive projects'
    },
    [ResourceType.QUANTUM_ENERGY]: {
        name: 'Quantum Energy',
        icon: '🌀',
        category: 'energy',
        baseResource: ResourceType.ENERGY,
        description: 'Quantum fluctuations for exotic technology'
    },
    // Organic Matter Subtypes
    [ResourceType.SIMPLE_ORGANICS]: {
        name: 'Simple Organics',
        icon: '🧪',
        category: 'organic',
        baseResource: ResourceType.ORGANIC_MATTER,
        description: 'Basic organic molecules'
    },
    [ResourceType.COMPLEX_ORGANICS]: {
        name: 'Complex Organics',
        icon: '🧬',
        category: 'organic',
        baseResource: ResourceType.ORGANIC_MATTER,
        description: 'Advanced organic compounds'
    },
    [ResourceType.GENETIC_MATERIAL]: {
        name: 'Genetic Material',
        icon: '🧬',
        category: 'organic',
        baseResource: ResourceType.ORGANIC_MATTER,
        description: 'DNA and RNA for life manipulation'
    },
    [ResourceType.ENZYMES]: {
        name: 'Enzymes',
        icon: '⚗️',
        category: 'organic',
        baseResource: ResourceType.ORGANIC_MATTER,
        description: 'Biological catalysts'
    },
    // Biomass Subtypes
    [ResourceType.MICROBIAL_BIOMASS]: {
        name: 'Microbial Biomass',
        icon: '🦠',
        category: 'biomass',
        baseResource: ResourceType.BIOMASS,
        description: 'Microscopic life forms'
    },
    [ResourceType.PLANT_BIOMASS]: {
        name: 'Plant Biomass',
        icon: '🌳',
        category: 'biomass',
        baseResource: ResourceType.BIOMASS,
        description: 'Photosynthetic organisms'
    },
    [ResourceType.ANIMAL_BIOMASS]: {
        name: 'Animal Biomass',
        icon: '🐾',
        category: 'biomass',
        baseResource: ResourceType.BIOMASS,
        description: 'Mobile life forms'
    },
    [ResourceType.INTELLIGENT_BIOMASS]: {
        name: 'Intelligent Biomass',
        icon: '🧠',
        category: 'biomass',
        baseResource: ResourceType.BIOMASS,
        description: 'Sentient organisms'
    },
    // Dark Matter Subtypes
    [ResourceType.STABLE_DARK_MATTER]: {
        name: 'Stable Dark Matter',
        icon: '⚫',
        category: 'dark',
        baseResource: ResourceType.DARK_MATTER,
        description: 'Stable form of dark matter'
    },
    [ResourceType.VOLATILE_DARK_MATTER]: {
        name: 'Volatile Dark Matter',
        icon: '🌫️',
        category: 'dark',
        baseResource: ResourceType.DARK_MATTER,
        description: 'Unstable dark matter particles'
    },
    [ResourceType.EXOTIC_DARK_MATTER]: {
        name: 'Exotic Dark Matter',
        icon: '🌌',
        category: 'dark',
        baseResource: ResourceType.DARK_MATTER,
        description: 'Strange dark matter variants'
    },
    [ResourceType.PRIMORDIAL_DARK_MATTER]: {
        name: 'Primordial Dark Matter',
        icon: '🕳️',
        category: 'dark',
        baseResource: ResourceType.DARK_MATTER,
        description: 'Ancient dark matter from the Big Bang'
    },
    // Thought Points Subtypes
    [ResourceType.BASIC_THOUGHTS]: {
        name: 'Basic Thoughts',
        icon: '💡',
        category: 'thought',
        baseResource: ResourceType.THOUGHT_POINTS,
        description: 'Simple cognitive patterns'
    },
    [ResourceType.CREATIVE_THOUGHTS]: {
        name: 'Creative Thoughts',
        icon: '🎨',
        category: 'thought',
        baseResource: ResourceType.THOUGHT_POINTS,
        description: 'Imaginative concepts'
    },
    [ResourceType.SCIENTIFIC_THOUGHTS]: {
        name: 'Scientific Thoughts',
        icon: '🔬',
        category: 'thought',
        baseResource: ResourceType.THOUGHT_POINTS,
        description: 'Analytical reasoning'
    },
    [ResourceType.PHILOSOPHICAL_THOUGHTS]: {
        name: 'Philosophical Thoughts',
        icon: '🤔',
        category: 'thought',
        baseResource: ResourceType.THOUGHT_POINTS,
        description: 'Deep contemplation'
    },
    // Processed Resources
    [ResourceType.PROCESSED_METAL]: {
        name: 'Processed Metal',
        icon: '🔧',
        category: 'processed',
        description: 'Refined metallic materials'
    },
    [ResourceType.SILICON]: {
        name: 'Silicon',
        icon: '💾',
        category: 'processed',
        description: 'Semiconductor material'
    },
    [ResourceType.ALLOY]: {
        name: 'Alloy',
        icon: '⚙️',
        category: 'processed',
        description: 'Advanced composite materials'
    },
    // Tier 2 Resources
    [ResourceType.STABILIZED_ENERGY]: {
        name: '安定化エネルギー',
        icon: '🔋',
        category: 'tier2',
        description: '貯蔵・転送可能な高密度エネルギー'
    },
    [ResourceType.REFINED_METAL]: {
        name: '精製金属',
        icon: '🏗️',
        category: 'tier2',
        description: '高純度の金属素材'
    },
    [ResourceType.RARE_ELEMENTS]: {
        name: '希少元素',
        icon: '💠',
        category: 'tier2',
        description: '特殊な性質を持つ希少な元素'
    },
    [ResourceType.HIGH_POLYMER]: {
        name: '高分子ポリマー',
        icon: '🧬',
        category: 'tier2',
        description: '高度な有機素材'
    },
    [ResourceType.QUANTUM_CRYSTAL]: {
        name: '量子結晶',
        icon: '🔮',
        category: 'tier2',
        description: '量子状態を保持する結晶'
    },
    [ResourceType.RADIOACTIVE_WASTE]: {
        name: '放射性廃棄物',
        icon: '☢️',
        category: 'waste',
        description: 'エネルギー生産の副産物として発生する危険な廃棄物'
    },
    // Tier 3 Resources
    [ResourceType.CONCENTRATED_ENERGY]: {
        name: '濃縮エネルギー',
        icon: '💥',
        category: 'tier3',
        description: '極めて高密度に圧縮されたエネルギー'
    },
    [ResourceType.HYPER_CRYSTAL]: {
        name: 'ハイパークリスタル',
        icon: '💠',
        category: 'tier3',
        description: '超高純度で加工された結晶体'
    },
    [ResourceType.DIMENSIONAL_ESSENCE]: {
        name: '次元エッセンス',
        icon: '🌌',
        category: 'tier3',
        description: '異次元から抽出された神秘的な物質'
    },
    [ResourceType.ULTRA_ALLOY]: {
        name: '超合金',
        icon: '🛡️',
        category: 'tier3',
        description: '極限環境に耐えるように設計された特殊合金'
    },
    [ResourceType.QUANTUM_POLYMER]: {
        name: '量子ポリマー',
        icon: '🔗',
        category: 'tier3',
        description: '量子レベルで結合された高機能ポリマー'
    },
    [ResourceType.EXOTIC_MATTER]: {
        name: 'エキゾチックマター',
        icon: '⚛️',
        category: 'tier3',
        description: '宇宙の法則を歪める可能性を秘めた未知の物質'
    }
};
// Helper functions
export function getQualityName(tier) {
    const names = ['Poor', 'Standard', 'High Quality', 'Perfect', 'Legendary'];
    return names[tier] || 'Unknown';
}
export function getResourceDisplayName(type, quality) {
    const metadata = RESOURCE_METADATA[type];
    if (!metadata)
        return type;
    if (quality !== undefined && quality !== QualityTier.STANDARD) {
        return `${getQualityName(quality)} ${metadata.name}`;
    }
    return metadata.name;
}
export function calculateEffectiveAmount(amount, quality) {
    return amount * QUALITY_MULTIPLIERS[quality].efficiency;
}
