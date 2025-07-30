// 🌌 Fillstellar Encyclopedia - Resource & Item Database
// Complete catalog of all resources, items, and cosmic phenomena

export enum ItemRarity {
    COMMON = 0,        // 白 - 一般的
    UNCOMMON = 1,      // 緑 - 稀
    RARE = 2,          // 青 - 珍しい
    EPIC = 3,          // 紫 - 叙事詩的
    LEGENDARY = 4,     // 金 - 伝説的
    MYTHICAL = 5,      // 虹 - 神話的
    COSMIC = 6,        // 宇宙色 - 宇宙級
    TRANSCENDENT = 7   // 虚無色 - 超越
}

export enum ItemCategory {
    // 基本資源カテゴリ
    BASIC_MATTER = 'basic_matter',
    ENERGY_FORMS = 'energy_forms',
    BIOLOGICAL = 'biological',
    CONSCIOUSNESS = 'consciousness',
    EXOTIC_MATTER = 'exotic_matter',
    
    // 加工品カテゴリ
    REFINED_MATERIALS = 'refined_materials',
    COMPOSITE_ALLOYS = 'composite_alloys',
    QUANTUM_STRUCTURES = 'quantum_structures',
    DIMENSIONAL_ARTIFACTS = 'dimensional_artifacts',
    
    // 特殊アイテム
    CATALYSTS = 'catalysts',
    BLUEPRINTS = 'blueprints',
    COSMIC_RELICS = 'cosmic_relics',
    LIVING_CONSTRUCTS = 'living_constructs',
    
    // 消耗品・廃棄物
    CONSUMABLES = 'consumables',
    WASTE_PRODUCTS = 'waste_products',
    TEMPORAL_ITEMS = 'temporal_items'
}

export interface EncyclopediaEntry {
    id: string;
    name: string;
    japaneseName: string;
    description: string;
    lore: string;
    rarity: ItemRarity;
    category: ItemCategory;
    icon: string;
    discoveryConditions: string[];
    obtainMethods: string[];
    usages: string[];
    marketValue: number;
    stackSize: number;
    isDiscovered: boolean;
    effects?: {
        type: string;
        magnitude: number;
        duration?: number;
    }[];
    recipes?: {
        inputs: { itemId: string; amount: number }[];
        outputs: { itemId: string; amount: number }[];
        facility: string;
        time: number;
    }[];
}

// レアリティごとの効果倍率とカラー
export const RARITY_PROPERTIES = {
    [ItemRarity.COMMON]: {
        multiplier: 1.0,
        color: '#ffffff',
        glowColor: '#ffffff',
        particleColor: '#ffffff',
        dropRate: 100,
        name: 'Common',
        japaneseName: '一般'
    },
    [ItemRarity.UNCOMMON]: {
        multiplier: 1.25,
        color: '#00ff00',
        glowColor: '#00ff7f',
        particleColor: '#90ee90',
        dropRate: 70,
        name: 'Uncommon',
        japaneseName: '稀'
    },
    [ItemRarity.RARE]: {
        multiplier: 1.5,
        color: '#0080ff',
        glowColor: '#4da6ff',
        particleColor: '#87ceeb',
        dropRate: 40,
        name: 'Rare',
        japaneseName: '珍しい'
    },
    [ItemRarity.EPIC]: {
        multiplier: 2.0,
        color: '#8000ff',
        glowColor: '#a040ff',
        particleColor: '#dda0dd',
        dropRate: 20,
        name: 'Epic',
        japaneseName: '叙事詩的'
    },
    [ItemRarity.LEGENDARY]: {
        multiplier: 3.0,
        color: '#ffb000',
        glowColor: '#ffd700',
        particleColor: '#fff8dc',
        dropRate: 5,
        name: 'Legendary',
        japaneseName: '伝説的'
    },
    [ItemRarity.MYTHICAL]: {
        multiplier: 5.0,
        color: '#ff00ff',
        glowColor: '#ff69b4',
        particleColor: '#ffc0cb',
        dropRate: 1,
        name: 'Mythical',
        japaneseName: '神話的'
    },
    [ItemRarity.COSMIC]: {
        multiplier: 10.0,
        color: '#00ffff',
        glowColor: '#00bfff',
        particleColor: '#e0ffff',
        dropRate: 0.1,
        name: 'Cosmic',
        japaneseName: '宇宙級'
    },
    [ItemRarity.TRANSCENDENT]: {
        multiplier: 25.0,
        color: '#ffffff',
        glowColor: '#f0f0f0',
        particleColor: '#ffffff',
        dropRate: 0.01,
        name: 'Transcendent',
        japaneseName: '超越'
    }
};

// 完全なアイテムデータベース
export const ENCYCLOPEDIA_DATABASE: Record<string, EncyclopediaEntry> = {
    // === 基本物質 (Basic Matter) ===
    'stardust_motes': {
        id: 'stardust_motes',
        name: 'Stardust Motes',
        japaneseName: '星屑の粒子',
        description: 'Tiny particles of matter condensed from stellar winds',
        lore: '恒星風によって運ばれた、宇宙で最も基本的な物質。すべての創造の始まり。',
        rarity: ItemRarity.COMMON,
        category: ItemCategory.BASIC_MATTER,
        icon: '✨',
        discoveryConditions: ['Start the game'],
        obtainMethods: ['Stellar nursery collection', 'Asteroid mining'],
        usages: ['Basic construction', 'Element synthesis'],
        marketValue: 1,
        stackSize: 999999,
        isDiscovered: true
    },
    
    'nebular_essence': {
        id: 'nebular_essence',
        name: 'Nebular Essence',
        japaneseName: '星雲エッセンス',
        description: 'Concentrated gas and dust from stellar nurseries',
        lore: '星の誕生を見守ってきた星雲のエッセンス。未来への可能性を秘めている。',
        rarity: ItemRarity.UNCOMMON,
        category: ItemCategory.BASIC_MATTER,
        icon: '🌫️',
        discoveryConditions: ['Collect 1000 Stardust Motes'],
        obtainMethods: ['Nebula harvesting', 'Stellar formation byproduct'],
        usages: ['Advanced synthesis', 'Atmospheric creation'],
        marketValue: 15,
        stackSize: 50000,
        isDiscovered: false
    },
    
    'primordial_fragments': {
        id: 'primordial_fragments',
        name: 'Primordial Fragments',
        japaneseName: '原始の欠片',
        description: 'Ancient matter from the dawn of the universe',
        lore: 'ビッグバンの最初の瞬間から残された物質。時の始まりの記憶を宿す。',
        rarity: ItemRarity.RARE,
        category: ItemCategory.BASIC_MATTER,
        icon: '🗿',
        discoveryConditions: ['Build first black hole', 'Reach age 1 billion years'],
        obtainMethods: ['Deep space archaeology', 'Time dilation extraction'],
        usages: ['Temporal manipulation', 'Reality anchoring'],
        marketValue: 250,
        stackSize: 1000,
        isDiscovered: false
    },
    
    'crystallized_void': {
        id: 'crystallized_void',
        name: 'Crystallized Void',
        japaneseName: '結晶化した虚無',
        description: 'The absence of matter given form',
        lore: '何も存在しない空間が物質として結晶化した謎の存在。矛盾の具現化。',
        rarity: ItemRarity.MYTHICAL,
        category: ItemCategory.EXOTIC_MATTER,
        icon: '◇',
        discoveryConditions: ['Create 100 black holes', 'Discover vacuum decay'],
        obtainMethods: ['Void crystallization', 'Reality violation'],
        usages: ['Space-time manipulation', 'Impossibility engine fuel'],
        marketValue: 100000,
        stackSize: 10,
        isDiscovered: false
    },
    
    // === エネルギー形態 (Energy Forms) ===
    'thermal_packets': {
        id: 'thermal_packets',
        name: 'Thermal Packets',
        japaneseName: '熱素パケット',
        description: 'Quantized units of thermal energy',
        lore: '熱エネルギーが離散的なパケットとして物質化したもの。温かい感触がある。',
        rarity: ItemRarity.COMMON,
        category: ItemCategory.ENERGY_FORMS,
        icon: '🔥',
        discoveryConditions: ['Heat any object'],
        obtainMethods: ['Stellar fusion', 'Thermal extraction'],
        usages: ['Heating processes', 'Energy conversion'],
        marketValue: 2,
        stackSize: 99999,
        isDiscovered: true
    },
    
    'photonic_crystals': {
        id: 'photonic_crystals',
        name: 'Photonic Crystals',
        japaneseName: '光子結晶',
        description: 'Solidified light with crystalline structure',
        lore: '光が結晶構造を持つように凝固した奇跡の物質。永遠に輝き続ける。',
        rarity: ItemRarity.UNCOMMON,
        category: ItemCategory.ENERGY_FORMS,
        icon: '💎',
        discoveryConditions: ['Focus starlight', 'Build photon concentrator'],
        obtainMethods: ['Light crystallization', 'Stellar engineering'],
        usages: ['Advanced optics', 'Information storage'],
        marketValue: 45,
        stackSize: 10000,
        isDiscovered: false
    },
    
    'quantum_flux_cores': {
        id: 'quantum_flux_cores',
        name: 'Quantum Flux Cores',
        japaneseName: '量子流動核',
        description: 'Stable quantum energy in perpetual motion',
        lore: '量子の不確定性を永久機関として安定化させた究極のエネルギー源。',
        rarity: ItemRarity.EPIC,
        category: ItemCategory.ENERGY_FORMS,
        icon: '🌀',
        discoveryConditions: ['Master quantum mechanics', 'Build particle accelerator'],
        obtainMethods: ['Quantum stabilization', 'Zero-point extraction'],
        usages: ['Quantum technologies', 'Reality manipulation'],
        marketValue: 8000,
        stackSize: 100,
        isDiscovered: false
    },
    
    'stellar_heartbeats': {
        id: 'stellar_heartbeats',
        name: 'Stellar Heartbeats',
        japaneseName: '恒星の鼓動',
        description: 'The living pulse of a star captured in time',
        lore: '恒星の生命的な鼓動を時空に刻印したもの。星の魂が宿っている。',
        rarity: ItemRarity.LEGENDARY,
        category: ItemCategory.ENERGY_FORMS,
        icon: '💓',
        discoveryConditions: ['Bond with a living star', 'Achieve stellar consciousness'],
        obtainMethods: ['Stellar communion', 'Life force extraction'],
        usages: ['Life creation', 'Consciousness transfer'],
        marketValue: 50000,
        stackSize: 5,
        isDiscovered: false
    },
    
    // === 生物学的物質 (Biological Matter) ===
    'amino_whispers': {
        id: 'amino_whispers',
        name: 'Amino Whispers',
        japaneseName: 'アミノのささやき',
        description: 'Self-organizing amino acids with primitive awareness',
        lore: '原始的な意識を持ち始めたアミノ酸。生命の最初の言葉をささやく。',
        rarity: ItemRarity.UNCOMMON,
        category: ItemCategory.BIOLOGICAL,
        icon: '🧬',
        discoveryConditions: ['Create first microbial life'],
        obtainMethods: ['Primordial soup synthesis', 'Organic evolution'],
        usages: ['Life seeding', 'Biological programming'],
        marketValue: 25,
        stackSize: 5000,
        isDiscovered: false
    },
    
    'dna_symphonies': {
        id: 'dna_symphonies',
        name: 'DNA Symphonies',
        japaneseName: 'DNA交響曲',
        description: 'Genetic code that resonates with cosmic harmonies',
        lore: '宇宙の調和と共鳴するDNA配列。生命の楽譜として奏でられる。',
        rarity: ItemRarity.RARE,
        category: ItemCategory.BIOLOGICAL,
        icon: '🎼',
        discoveryConditions: ['Evolve complex life', 'Discover genetic harmony'],
        obtainMethods: ['Evolution guidance', 'Genetic composition'],
        usages: ['Species design', 'Biological orchestration'],
        marketValue: 1200,
        stackSize: 500,
        isDiscovered: false
    },
    
    'neural_galaxies': {
        id: 'neural_galaxies',
        name: 'Neural Galaxies',
        japaneseName: '神経銀河',
        description: 'Brain tissue organized like galactic structures',
        lore: '銀河の構造を模倣して成長した神経組織。宇宙規模の思考を可能にする。',
        rarity: ItemRarity.EPIC,
        category: ItemCategory.BIOLOGICAL,
        icon: '🧠',
        discoveryConditions: ['Create superintelligent species', 'Neural architecture breakthrough'],
        obtainMethods: ['Consciousness farming', 'Neurological engineering'],
        usages: ['Mega-intelligence creation', 'Galactic-scale thinking'],
        marketValue: 15000,
        stackSize: 25,
        isDiscovered: false
    },
    
    'living_concepts': {
        id: 'living_concepts',
        name: 'Living Concepts',
        japaneseName: '生きる概念',
        description: 'Abstract ideas given biological form',
        lore: '抽象的な概念が生物学的な形を得たもの。思考そのものが生命となった。',
        rarity: ItemRarity.COSMIC,
        category: ItemCategory.LIVING_CONSTRUCTS,
        icon: '💭',
        discoveryConditions: ['Achieve concept-life fusion', 'Transcend material existence'],
        obtainMethods: ['Idea incarnation', 'Conceptual evolution'],
        usages: ['Reality programming', 'Philosophical engineering'],
        marketValue: 500000,
        stackSize: 1,
        isDiscovered: false
    },
    
    // === 意識・思考物質 (Consciousness Matter) ===
    'thought_sparks': {
        id: 'thought_sparks',
        name: 'Thought Sparks',
        japaneseName: '思考の火花',
        description: 'The first flickers of consciousness made manifest',
        lore: '意識の最初の煌めきが物質化したもの。知性の種火として燃える。',
        rarity: ItemRarity.COMMON,
        category: ItemCategory.CONSCIOUSNESS,
        icon: '💡',
        discoveryConditions: ['Create thinking beings'],
        obtainMethods: ['Consciousness extraction', 'Mental crystallization'],
        usages: ['Intelligence enhancement', 'Awareness creation'],
        marketValue: 8,
        stackSize: 25000,
        isDiscovered: false
    },
    
    'memory_crystals': {
        id: 'memory_crystals',
        name: 'Memory Crystals',
        japaneseName: '記憶結晶',
        description: 'Crystallized experiences and memories',
        lore: '生命体の記憶と体験が結晶化したもの。触れると過去を追体験できる。',
        rarity: ItemRarity.RARE,
        category: ItemCategory.CONSCIOUSNESS,
        icon: '🔮',
        discoveryConditions: ['Preserve ancient memories', 'Master temporal archaeology'],
        obtainMethods: ['Memory fossilization', 'Experience mining'],
        usages: ['Knowledge transfer', 'Historical recreation'],
        marketValue: 2500,
        stackSize: 200,
        isDiscovered: false
    },
    
    'wisdom_nebulae': {
        id: 'wisdom_nebulae',
        name: 'Wisdom Nebulae',
        japaneseName: '知恵星雲',
        description: 'Clouds of accumulated knowledge spanning light-years',
        lore: '数光年にわたって蓄積された知識の雲。文明の集合知が星雲となった。',
        rarity: ItemRarity.LEGENDARY,
        category: ItemCategory.CONSCIOUSNESS,
        icon: '☁️',
        discoveryConditions: ['Unite galactic civilizations', 'Create knowledge nexus'],
        obtainMethods: ['Wisdom accumulation', 'Collective intelligence harvest'],
        usages: ['Galactic education', 'Civilization guidance'],
        marketValue: 75000,
        stackSize: 3,
        isDiscovered: false
    },
    
    'pure_understanding': {
        id: 'pure_understanding',
        name: 'Pure Understanding',
        japaneseName: '純粋理解',
        description: 'Perfect comprehension distilled into essence',
        lore: '完璧な理解が精髄として蒸留されたもの。あらゆる謎を解く鍵。',
        rarity: ItemRarity.TRANSCENDENT,
        category: ItemCategory.CONSCIOUSNESS,
        icon: '🌟',
        discoveryConditions: ['Achieve omniscience', 'Transcend all limitations'],
        obtainMethods: ['Perfect enlightenment', 'Ultimate realization'],
        usages: ['Reality comprehension', 'Universal mastery'],
        marketValue: 1000000,
        stackSize: 1,
        isDiscovered: false
    },
    
    // === エキゾチック物質 (Exotic Matter) ===
    'dark_matter_whiskers': {
        id: 'dark_matter_whiskers',
        name: 'Dark Matter Whiskers',
        japaneseName: 'ダークマターの触手',
        description: 'Tendrils of invisible matter made tangible',
        lore: '見えない暗黒物質が触知可能な形を取ったもの。宇宙の隠された構造を暴く。',
        rarity: ItemRarity.UNCOMMON,
        category: ItemCategory.EXOTIC_MATTER,
        icon: '🌑',
        discoveryConditions: ['Detect dark matter', 'Build matter converter'],
        obtainMethods: ['Dark matter fishing', 'Gravitational extraction'],
        usages: ['Invisible construction', 'Gravity manipulation'],
        marketValue: 120,
        stackSize: 2000,
        isDiscovered: false
    },
    
    'temporal_loops': {
        id: 'temporal_loops',
        name: 'Temporal Loops',
        japaneseName: '時間環',
        description: 'Closed timelike curves made solid',
        lore: '閉じた時間様曲線が固体化したもの。因果律を無視した存在。',
        rarity: ItemRarity.EPIC,
        category: ItemCategory.EXOTIC_MATTER,
        icon: '🔄',
        discoveryConditions: ['Master time travel', 'Create causal paradox'],
        obtainMethods: ['Time crystallization', 'Paradox resolution'],
        usages: ['Temporal manipulation', 'Causality engineering'],
        marketValue: 35000,
        stackSize: 10,
        isDiscovered: false
    },
    
    'probability_threads': {
        id: 'probability_threads',
        name: 'Probability Threads',
        japaneseName: '確率の糸',
        description: 'The fabric of chance woven into matter',
        lore: '偶然性の織物が物質として具現化したもの。運命を編み直すことができる。',
        rarity: ItemRarity.MYTHICAL,
        category: ItemCategory.EXOTIC_MATTER,
        icon: '🧵',
        discoveryConditions: ['Control quantum probability', 'Weave reality'],
        obtainMethods: ['Probability harvesting', 'Chance crystallization'],
        usages: ['Fate manipulation', 'Quantum programming'],
        marketValue: 200000,
        stackSize: 5,
        isDiscovered: false
    },
    
    // === 精製材料 (Refined Materials) ===
    'stellar_iron': {
        id: 'stellar_iron',
        name: 'Stellar Iron',
        japaneseName: '恒星鉄',
        description: 'Iron forged in the heart of a dying star',
        lore: '死にゆく恒星の心臓で鍛えられた鉄。星の最期の意志が込められている。',
        rarity: ItemRarity.COMMON,
        category: ItemCategory.REFINED_MATERIALS,
        icon: '⚙️',
        discoveryConditions: ['Witness supernova', 'Extract stellar materials'],
        obtainMethods: ['Stellar core mining', 'Supernova collection'],
        usages: ['Structural construction', 'Durable tools'],
        marketValue: 12,
        stackSize: 10000,
        isDiscovered: false
    },
    
    'crystallized_spacetime': {
        id: 'crystallized_spacetime',
        name: 'Crystallized Spacetime',
        japaneseName: '結晶化時空',
        description: 'The fabric of reality made solid',
        lore: '現実の織物が固体化したもの。触れると時空の歪みを感じることができる。',
        rarity: ItemRarity.LEGENDARY,
        category: ItemCategory.REFINED_MATERIALS,
        icon: '💠',
        discoveryConditions: ['Manipulate spacetime', 'Master general relativity'],
        obtainMethods: ['Dimensional compression', 'Reality crystallization'],
        usages: ['Warp drive construction', 'Dimensional engineering'],
        marketValue: 80000,
        stackSize: 8,
        isDiscovered: false
    },
    
    // === 触媒・消耗品 (Catalysts & Consumables) ===
    'essence_of_possibility': {
        id: 'essence_of_possibility',
        name: 'Essence of Possibility',
        japaneseName: '可能性のエッセンス',
        description: 'Liquid potential that enables impossible reactions',
        lore: '不可能を可能にする液体状の潜在力。未来の選択肢を増やす魔法の薬。',
        rarity: ItemRarity.RARE,
        category: ItemCategory.CATALYSTS,
        icon: '⚗️',
        discoveryConditions: ['Discover quantum superposition', 'Bottle uncertainty'],
        obtainMethods: ['Possibility distillation', 'Quantum extraction'],
        usages: ['Impossible reactions', 'Reality alteration'],
        marketValue: 3500,
        stackSize: 100,
        isDiscovered: false
    },
    
    'bootstrap_paradox_fuel': {
        id: 'bootstrap_paradox_fuel',
        name: 'Bootstrap Paradox Fuel',
        japaneseName: 'ブートストラップ・パラドックス燃料',
        description: 'Energy source that creates itself',
        lore: '自分自身を作り出すエネルギー源。起源も終端も持たない完璧な循環。',
        rarity: ItemRarity.COSMIC,
        category: ItemCategory.CONSUMABLES,
        icon: '🔄',
        discoveryConditions: ['Create closed timelike curve', 'Solve origin paradox'],
        obtainMethods: ['Temporal bootstrapping', 'Causal loop creation'],
        usages: ['Infinite energy', 'Self-sustaining systems'],
        marketValue: 750000,
        stackSize: 2,
        isDiscovered: false
    },
    
    // === 廃棄物・副産物 (Waste Products) ===
    'entropy_sludge': {
        id: 'entropy_sludge',
        name: 'Entropy Sludge',
        japaneseName: 'エントロピー汚泥',
        description: 'Concentrated disorder and decay',
        lore: '無秩序と腐敗が濃縮されたヘドロ。すべてを無に還そうとする意志を持つ。',
        rarity: ItemRarity.COMMON,
        category: ItemCategory.WASTE_PRODUCTS,
        icon: '🟫',
        discoveryConditions: ['Create any reaction'],
        obtainMethods: ['Thermodynamic byproduct', 'Decay acceleration'],
        usages: ['Entropy weapons', 'Decay catalysis'],
        marketValue: -5,
        stackSize: 99999,
        isDiscovered: true
    },
    
    'causality_fragments': {
        id: 'causality_fragments',
        name: 'Causality Fragments',
        japaneseName: '因果律の欠片',
        description: 'Broken pieces of cause and effect',
        lore: '因果関係が破綻して飛び散った欠片。論理の墓場から生まれる危険物。',
        rarity: ItemRarity.EPIC,
        category: ItemCategory.WASTE_PRODUCTS,
        icon: '💥',
        discoveryConditions: ['Break causality', 'Create temporal paradox'],
        obtainMethods: ['Paradox creation', 'Logic violation'],
        usages: ['Impossibility engine', 'Reality debugging'],
        marketValue: 25000,
        stackSize: 20,
        isDiscovered: false
    },
    
    // === 宇宙遺物・設計図 (Cosmic Relics & Blueprints) ===
    'precursor_memory_core': {
        id: 'precursor_memory_core',
        name: 'Precursor Memory Core',
        japaneseName: '先駆者記憶核',
        description: 'Ancient data storage from a lost civilization',
        lore: '失われた先駆文明のデータストレージ。宇宙の秘密を記録している。',
        rarity: ItemRarity.LEGENDARY,
        category: ItemCategory.COSMIC_RELICS,
        icon: '🗄️',
        discoveryConditions: ['Discover ancient ruins', 'Decode alien technology'],
        obtainMethods: ['Archaeological excavation', 'Xenoarchaeology'],
        usages: ['Technology research', 'Historical analysis'],
        marketValue: 150000,
        stackSize: 1,
        isDiscovered: false
    },
    
    'universe_seed': {
        id: 'universe_seed',
        name: 'Universe Seed',
        japaneseName: '宇宙の種',
        description: 'A potential reality waiting to be born',
        lore: '生まれることを待っている潜在的現実。新しい宇宙の始まりを宿す種。',
        rarity: ItemRarity.TRANSCENDENT,
        category: ItemCategory.COSMIC_RELICS,
        icon: '🌱',
        discoveryConditions: ['Achieve cosmic mastery', 'Transcend current reality'],
        obtainMethods: ['Reality cultivation', 'Universe gardening'],
        usages: ['New universe creation', 'Reality replacement'],
        marketValue: 10000000,
        stackSize: 1,
        isDiscovered: false
    }
};

// カテゴリ別アイテム分類
export const ITEMS_BY_CATEGORY = {
    [ItemCategory.BASIC_MATTER]: ['stardust_motes', 'nebular_essence', 'primordial_fragments'],
    [ItemCategory.ENERGY_FORMS]: ['thermal_packets', 'photonic_crystals', 'quantum_flux_cores', 'stellar_heartbeats'],
    [ItemCategory.BIOLOGICAL]: ['amino_whispers', 'dna_symphonies', 'neural_galaxies'],
    [ItemCategory.CONSCIOUSNESS]: ['thought_sparks', 'memory_crystals', 'wisdom_nebulae', 'pure_understanding'],
    [ItemCategory.EXOTIC_MATTER]: ['dark_matter_whiskers', 'temporal_loops', 'probability_threads', 'crystallized_void'],
    [ItemCategory.REFINED_MATERIALS]: ['stellar_iron', 'crystallized_spacetime'],
    [ItemCategory.CATALYSTS]: ['essence_of_possibility'],
    [ItemCategory.CONSUMABLES]: ['bootstrap_paradox_fuel'],
    [ItemCategory.WASTE_PRODUCTS]: ['entropy_sludge', 'causality_fragments'],
    [ItemCategory.COSMIC_RELICS]: ['precursor_memory_core', 'universe_seed'],
    [ItemCategory.LIVING_CONSTRUCTS]: ['living_concepts']
};

// レアリティ別アイテム分類
export const ITEMS_BY_RARITY = {
    [ItemRarity.COMMON]: ['stardust_motes', 'thermal_packets', 'thought_sparks', 'stellar_iron', 'entropy_sludge'],
    [ItemRarity.UNCOMMON]: ['nebular_essence', 'photonic_crystals', 'amino_whispers', 'dark_matter_whiskers'],
    [ItemRarity.RARE]: ['primordial_fragments', 'dna_symphonies', 'memory_crystals', 'essence_of_possibility'],
    [ItemRarity.EPIC]: ['quantum_flux_cores', 'neural_galaxies', 'temporal_loops', 'causality_fragments'],
    [ItemRarity.LEGENDARY]: ['stellar_heartbeats', 'wisdom_nebulae', 'crystallized_spacetime', 'precursor_memory_core'],
    [ItemRarity.MYTHICAL]: ['probability_threads', 'crystallized_void'],
    [ItemRarity.COSMIC]: ['living_concepts', 'bootstrap_paradox_fuel'],
    [ItemRarity.TRANSCENDENT]: ['pure_understanding', 'universe_seed']
};

// ヘルパー関数
export function getItemsByRarity(rarity: ItemRarity): EncyclopediaEntry[] {
    const itemIds = ITEMS_BY_RARITY[rarity] || [];
    return itemIds.map(id => ENCYCLOPEDIA_DATABASE[id]).filter(Boolean);
}

export function getItemsByCategory(category: ItemCategory): EncyclopediaEntry[] {
    const itemIds = ITEMS_BY_CATEGORY[category] || [];
    return itemIds.map(id => ENCYCLOPEDIA_DATABASE[id]).filter(Boolean);
}

export function getDiscoveredItems(): EncyclopediaEntry[] {
    return Object.values(ENCYCLOPEDIA_DATABASE).filter(item => item.isDiscovered);
}

export function getRarityColor(rarity: ItemRarity): string {
    return RARITY_PROPERTIES[rarity]?.color || '#ffffff';
}

export function calculateItemValue(baseValue: number, rarity: ItemRarity, quality: number = 1): number {
    const rarityMultiplier = RARITY_PROPERTIES[rarity]?.multiplier || 1;
    return Math.floor(baseValue * rarityMultiplier * quality);
}

export function checkDiscoveryConditions(itemId: string, gameState: any): boolean {
    const item = ENCYCLOPEDIA_DATABASE[itemId];
    if (!item) return false;
    
    // ここで実際のゲーム状態に基づいて発見条件をチェック
    // 現在は簡単な実装として false を返す
    return false;
}

// 検索・フィルタリング機能
export function searchItems(query: string): EncyclopediaEntry[] {
    const lowercaseQuery = query.toLowerCase();
    return Object.values(ENCYCLOPEDIA_DATABASE).filter(item =>
        item.name.toLowerCase().includes(lowercaseQuery) ||
        item.japaneseName.includes(query) ||
        item.description.toLowerCase().includes(lowercaseQuery) ||
        item.lore.toLowerCase().includes(lowercaseQuery)
    );
}

export function getRandomItemByRarity(rarity: ItemRarity): EncyclopediaEntry | null {
    const items = getItemsByRarity(rarity);
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
}

// レアリティドロップ計算
export function calculateDropRarity(luck: number = 0): ItemRarity {
    const random = Math.random() * 100;
    const luckBonus = luck * 0.1; // ラック値による補正
    
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.TRANSCENDENT].dropRate) return ItemRarity.TRANSCENDENT;
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.COSMIC].dropRate) return ItemRarity.COSMIC;
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.MYTHICAL].dropRate) return ItemRarity.MYTHICAL;
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.LEGENDARY].dropRate) return ItemRarity.LEGENDARY;
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.EPIC].dropRate) return ItemRarity.EPIC;
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.RARE].dropRate) return ItemRarity.RARE;
    if (random - luckBonus < RARITY_PROPERTIES[ItemRarity.UNCOMMON].dropRate) return ItemRarity.UNCOMMON;
    
    return ItemRarity.COMMON;
}