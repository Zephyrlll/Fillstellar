import { Achievement } from '../types/achievements.js';
import { GameState } from '../state.js';

export const achievements: Achievement[] = [
  // ===== Resource Collection Achievements (15) =====
  {
    id: 'dust_collector_1',
    name: '塵も積もれば',
    description: '宇宙の塵を1,000個集める',
    requirement: (state) => state.cosmicDust >= 1000,
    reward: { resources: { energy: 100 } },
    category: 'resource',
    icon: '✨',
    progress: (state) => ({ current: state.cosmicDust, target: 1000 }),
    tier: 1
  },
  {
    id: 'dust_collector_2',
    name: '塵の収集家',
    description: '宇宙の塵を10,000個集める',
    requirement: (state) => state.cosmicDust >= 10000,
    reward: { resources: { energy: 1000 }, multipliers: { dustGeneration: 1.1 } },
    category: 'resource',
    icon: '✨',
    progress: (state) => ({ current: state.cosmicDust, target: 10000 }),
    tier: 2
  },
  {
    id: 'dust_collector_3',
    name: '塵の大富豪',
    description: '宇宙の塵を100,000個集める',
    requirement: (state) => state.cosmicDust >= 100000,
    reward: { resources: { darkMatter: 100 }, multipliers: { dustGeneration: 1.2 } },
    category: 'resource',
    icon: '✨',
    progress: (state) => ({ current: state.cosmicDust, target: 100000 }),
    tier: 3
  },
  {
    id: 'dust_collector_4',
    name: '塵の帝王',
    description: '宇宙の塵を1,000,000個集める',
    requirement: (state) => state.cosmicDust >= 1000000,
    reward: { resources: { thoughtPoints: 50 }, multipliers: { dustGeneration: 1.5 }, permanent: true },
    category: 'resource',
    icon: '👑',
    progress: (state) => ({ current: state.cosmicDust, target: 1000000 }),
    tier: 4
  },
  {
    id: 'energy_harvester_1',
    name: 'エネルギー採集者',
    description: 'エネルギーを1,000個集める',
    requirement: (state) => state.energy >= 1000,
    reward: { resources: { cosmicDust: 5000 } },
    category: 'resource',
    icon: '⚡',
    progress: (state) => ({ current: state.energy, target: 1000 })
  },
  {
    id: 'energy_harvester_2',
    name: 'エネルギーマスター',
    description: 'エネルギーを10,000個集める',
    requirement: (state) => state.energy >= 10000,
    reward: { multipliers: { energyGeneration: 1.2 } },
    category: 'resource',
    icon: '⚡',
    progress: (state) => ({ current: state.energy, target: 10000 })
  },
  {
    id: 'organic_farmer',
    name: '有機物農家',
    description: '有機物を500個集める',
    requirement: (state) => state.organicMatter >= 500,
    reward: { resources: { biomass: 100 } },
    category: 'resource',
    icon: '🌱',
    progress: (state) => ({ current: state.organicMatter, target: 500 })
  },
  {
    id: 'biomass_cultivator',
    name: 'バイオマス栽培者',
    description: 'バイオマスを1,000個集める',
    requirement: (state) => state.biomass >= 1000,
    reward: { resources: { thoughtPoints: 10 } },
    category: 'resource',
    icon: '🌿',
    progress: (state) => ({ current: state.biomass, target: 1000 })
  },
  {
    id: 'dark_matter_researcher',
    name: 'ダークマター研究者',
    description: 'ダークマターを100個集める',
    requirement: (state) => state.darkMatter >= 100,
    reward: { multipliers: { researchSpeed: 1.1 } },
    category: 'resource',
    icon: '🌑',
    progress: (state) => ({ current: state.darkMatter, target: 100 })
  },
  {
    id: 'thought_collector',
    name: '思考の収集者',
    description: '思考ポイントを50個集める',
    requirement: (state) => state.thoughtPoints >= 50,
    reward: { resources: { darkMatter: 200 } },
    category: 'resource',
    icon: '🧠',
    progress: (state) => ({ current: state.thoughtPoints, target: 50 })
  },
  {
    id: 'resource_diversity',
    name: '多様性の追求',
    description: 'すべての基本資源を保有する',
    requirement: (state) => 
      state.cosmicDust > 0 && 
      state.energy > 0 && 
      state.organicMatter > 0 && 
      state.biomass > 0 && 
      state.darkMatter > 0 && 
      state.thoughtPoints > 0,
    reward: { multipliers: { dustGeneration: 1.05, energyGeneration: 1.05 } },
    category: 'resource',
    icon: '🎨'
  },
  {
    id: 'resource_balance',
    name: 'バランスの達人',
    description: 'すべての基本資源を1,000個以上保有',
    requirement: (state) => 
      state.cosmicDust >= 1000 && 
      state.energy >= 1000 && 
      state.organicMatter >= 1000 && 
      state.biomass >= 1000 && 
      state.darkMatter >= 1000 && 
      state.thoughtPoints >= 1000,
    reward: { multipliers: { offlineEfficiency: 1.2 }, permanent: true },
    category: 'resource',
    icon: '⚖️'
  },
  {
    id: 'first_conversion',
    name: '初めての変換',
    description: '資源を変換する',
    requirement: (state) => (state.statistics?.totalConversions || 0) > 0,
    reward: { resources: { energy: 50 } },
    category: 'resource',
    icon: '🔄'
  },
  {
    id: 'conversion_expert',
    name: '変換の達人',
    description: '資源を100回変換する',
    requirement: (state) => (state.statistics?.totalConversions || 0) >= 100,
    reward: { multipliers: { dustGeneration: 1.1, energyGeneration: 1.1 } },
    category: 'resource',
    icon: '🔄',
    progress: (state) => ({ current: state.statistics?.totalConversions || 0, target: 100 })
  },
  {
    id: 'legendary_quality',
    name: '伝説の品質',
    description: '伝説品質の資源を獲得する',
    requirement: (state) => (state.statistics?.legendaryResourcesObtained || 0) > 0,
    reward: { resources: { thoughtPoints: 100 } },
    category: 'resource',
    icon: '💎',
    hidden: true
  },

  // ===== Celestial Body Achievements (15) =====
  {
    id: 'first_asteroid',
    name: '最初の小惑星',
    description: '小惑星を作成する',
    requirement: (state) => state.stars.some(b => b.userData.type === 'asteroid'),
    reward: { resources: { cosmicDust: 500 } },
    category: 'celestial',
    icon: '☄️'
  },
  {
    id: 'first_planet',
    name: '惑星の誕生',
    description: '惑星を作成する',
    requirement: (state) => state.stars.some(b => b.userData.type === 'planet'),
    reward: { resources: { energy: 500 } },
    category: 'celestial',
    icon: '🌍'
  },
  {
    id: 'first_star',
    name: '恒星の輝き',
    description: '恒星を作成する',
    requirement: (state) => state.stars.some(b => b.userData.type === 'star'),
    reward: { resources: { energy: 2000 }, multipliers: { energyGeneration: 1.2 } },
    category: 'celestial',
    icon: '⭐'
  },
  {
    id: 'first_moon',
    name: '衛星の軌道',
    description: '月を作成する',
    requirement: (state) => state.stars.some(b => b.userData.type === 'moon'),
    reward: { resources: { cosmicDust: 1000 } },
    category: 'celestial',
    icon: '🌙'
  },
  {
    id: 'black_hole_creator',
    name: 'ブラックホールの創造主',
    description: 'ブラックホールを作成する',
    requirement: (state) => state.stars.some(b => b.userData.type === 'black_hole'),
    reward: { resources: { darkMatter: 1000 }, multipliers: { darkMatter: 1.5 }, permanent: true },
    category: 'celestial',
    icon: '🕳️',
    hidden: true
  },
  {
    id: 'celestial_collection',
    name: '天体コレクター',
    description: '10個の天体を同時に保有',
    requirement: (state) => state.stars.length >= 10,
    reward: { resources: { energy: 1000 } },
    category: 'celestial',
    icon: '🌌',
    progress: (state) => ({ current: state.stars.length, target: 10 })
  },
  {
    id: 'celestial_empire',
    name: '天体帝国',
    description: '50個の天体を同時に保有',
    requirement: (state) => state.stars.length >= 50,
    reward: { multipliers: { offlineEfficiency: 1.3 } },
    category: 'celestial',
    icon: '👑',
    progress: (state) => ({ current: state.stars.length, target: 50 })
  },
  {
    id: 'solar_system',
    name: '太陽系の構築',
    description: '恒星と3つの惑星を持つ',
    requirement: (state) => {
      const hasStar = state.stars.some(b => b.userData.type === 'star');
      const planetCount = state.stars.filter(b => b.userData.type === 'planet').length;
      return hasStar && planetCount >= 3;
    },
    reward: { resources: { organicMatter: 500 } },
    category: 'celestial',
    icon: '🌞'
  },
  {
    id: 'binary_system',
    name: '連星系',
    description: '2つの恒星を同時に保有',
    requirement: (state) => state.stars.filter(b => b.userData.type === 'star').length >= 2,
    reward: { multipliers: { energyGeneration: 1.3 } },
    category: 'celestial',
    icon: '✨'
  },
  {
    id: 'asteroid_belt',
    name: '小惑星帯',
    description: '10個の小惑星を同時に保有',
    requirement: (state) => state.stars.filter(b => b.userData.type === 'asteroid').length >= 10,
    reward: { resources: { cosmicDust: 10000 } },
    category: 'celestial',
    icon: '☄️',
    progress: (state) => ({ 
      current: state.stars.filter(b => b.userData.type === 'asteroid').length, 
      target: 10 
    })
  },
  {
    id: 'gas_giant',
    name: 'ガス惑星',
    description: '巨大な惑星を作成する（質量10以上）',
    requirement: (state) => state.stars.some(b => 
      b.userData.type === 'planet' && b.userData.mass >= 10
    ),
    reward: { resources: { energy: 5000 } },
    category: 'celestial',
    icon: '🪐',
    hidden: true
  },
  {
    id: 'comet_watcher',
    name: '彗星観測者',
    description: '彗星を5個作成する',
    requirement: (state) => state.stars.filter(b => b.userData.type === 'comet').length >= 5,
    reward: { resources: { cosmicDust: 5000, energy: 2500 } },
    category: 'celestial',
    icon: '☄️'
  },
  {
    id: 'stable_orbit',
    name: '安定軌道',
    description: '10分間天体を失わない',
    requirement: (state) => (Date.now() - (state.lastCelestialLoss || 0)) > 600000,
    reward: { multipliers: { offlineEfficiency: 1.1 } },
    category: 'celestial',
    icon: '🔄'
  },
  {
    id: 'galactic_architect',
    name: '銀河の建築家',
    description: '100個の天体を作成する（累計）',
    requirement: (state) => (state.statistics?.totalCelestialBodies || 0) >= 100,
    reward: { resources: { thoughtPoints: 500 }, multipliers: { dustGeneration: 1.5 }, permanent: true },
    category: 'celestial',
    icon: '🏗️',
    progress: (state) => ({ current: state.statistics?.totalCelestialBodies || 0, target: 100 })
  },
  {
    id: 'celestial_diversity',
    name: '天体の多様性',
    description: 'すべての種類の天体を保有',
    requirement: (state) => {
      const types = new Set(state.stars.map(b => b.userData.type));
      return types.has('asteroid') && types.has('planet') && types.has('star') && 
             types.has('moon') && types.has('black_hole') && types.has('comet');
    },
    reward: { resources: { darkMatter: 500 }, multipliers: { researchSpeed: 1.2 } },
    category: 'celestial',
    icon: '🎭'
  },

  // ===== Life Evolution Achievements (10) =====
  {
    id: 'first_life',
    name: '生命の誕生',
    description: '惑星に生命を誕生させる',
    requirement: (state) => state.stars.some(b => b.userData.hasLife),
    reward: { resources: { organicMatter: 1000 } },
    category: 'life',
    icon: '🦠'
  },
  {
    id: 'microbial_world',
    name: '微生物の世界',
    description: '3つの惑星に微生物を持つ',
    requirement: (state) => state.stars.filter(b => 
      b.userData.hasLife && b.userData.lifeStage === 'microbial'
    ).length >= 3,
    reward: { resources: { organicMatter: 2000 } },
    category: 'life',
    icon: '🦠'
  },
  {
    id: 'plant_evolution',
    name: '植物の進化',
    description: '植物段階まで生命を進化させる',
    requirement: (state) => state.stars.some(b => 
      b.userData.hasLife && b.userData.lifeStage === 'plant'
    ),
    reward: { resources: { biomass: 500 }, multipliers: { organicMatter: 1.2 } },
    category: 'life',
    icon: '🌱'
  },
  {
    id: 'animal_kingdom',
    name: '動物の王国',
    description: '動物段階まで生命を進化させる',
    requirement: (state) => state.stars.some(b => 
      b.userData.hasLife && b.userData.lifeStage === 'animal'
    ),
    reward: { resources: { biomass: 2000 }, multipliers: { biomass: 1.3 } },
    category: 'life',
    icon: '🦁'
  },
  {
    id: 'intelligent_life',
    name: '知的生命体',
    description: '知的生命体まで生命を進化させる',
    requirement: (state) => state.stars.some(b => 
      b.userData.hasLife && b.userData.lifeStage === 'intelligent'
    ),
    reward: { resources: { thoughtPoints: 1000 }, multipliers: { thoughtPoints: 2.0 }, permanent: true },
    category: 'life',
    icon: '🧠'
  },
  {
    id: 'garden_of_life',
    name: '生命の庭',
    description: '5つの惑星に同時に生命を持つ',
    requirement: (state) => state.stars.filter(b => b.userData.hasLife).length >= 5,
    reward: { multipliers: { organicMatter: 1.5, biomass: 1.5 } },
    category: 'life',
    icon: '🌺',
    progress: (state) => ({ 
      current: state.stars.filter(b => b.userData.hasLife).length, 
      target: 5 
    })
  },
  {
    id: 'evolution_master',
    name: '進化の達人',
    description: '10回生命を進化させる',
    requirement: (state) => (state.statistics?.totalEvolutions || 0) >= 10,
    reward: { resources: { thoughtPoints: 200 } },
    category: 'life',
    icon: '🧬',
    progress: (state) => ({ current: state.statistics?.totalEvolutions || 0, target: 10 })
  },
  {
    id: 'biodiversity',
    name: '生物多様性',
    description: 'すべての生命段階を同時に保有',
    requirement: (state) => {
      const stages = new Set(
        state.stars
          .filter(b => b.userData.hasLife)
          .map(b => b.userData.lifeStage)
      );
      return stages.has('microbial') && stages.has('plant') && 
             stages.has('animal') && stages.has('intelligent');
    },
    reward: { multipliers: { offlineEfficiency: 1.5 }, permanent: true },
    category: 'life',
    icon: '🌈'
  },
  {
    id: 'terraformer',
    name: 'テラフォーマー',
    description: '荒れた惑星を生命の楽園に変える',
    requirement: (state) => (state.statistics?.terraformedPlanets || 0) >= 1,
    reward: { resources: { organicMatter: 5000, biomass: 2500 } },
    category: 'life',
    icon: '🌍',
    hidden: true
  },
  {
    id: 'galactic_civilization',
    name: '銀河文明',
    description: '3つの知的生命体を同時に保有',
    requirement: (state) => state.stars.filter(b => 
      b.userData.hasLife && b.userData.lifeStage === 'intelligent'
    ).length >= 3,
    reward: { resources: { thoughtPoints: 5000 }, multipliers: { researchSpeed: 2.0 }, permanent: true },
    category: 'life',
    icon: '🛸'
  },

  // ===== General Achievements (10) =====
  {
    id: 'first_day',
    name: '最初の一日',
    description: '1日プレイする',
    requirement: (state) => (state.totalPlayTime || 0) >= 86400000,
    reward: { resources: { cosmicDust: 10000, energy: 5000 } },
    category: 'general',
    icon: '📅'
  },
  {
    id: 'dedicated_player',
    name: '献身的なプレイヤー',
    description: '7日間プレイする',
    requirement: (state) => (state.totalPlayTime || 0) >= 604800000,
    reward: { multipliers: { dustGeneration: 1.2, energyGeneration: 1.2, offlineEfficiency: 1.2 } },
    category: 'general',
    icon: '📅',
    progress: (state) => ({ 
      current: Math.floor((state.totalPlayTime || 0) / 86400000), 
      target: 7 
    })
  },
  {
    id: 'veteran_gardener',
    name: 'ベテラン庭師',
    description: '30日間プレイする',
    requirement: (state) => (state.totalPlayTime || 0) >= 2592000000,
    reward: { multipliers: { dustGeneration: 1.5, energyGeneration: 1.5, offlineEfficiency: 1.5 }, permanent: true },
    category: 'general',
    icon: '🏅',
    progress: (state) => ({ 
      current: Math.floor((state.totalPlayTime || 0) / 86400000), 
      target: 30 
    })
  },
  {
    id: 'first_prestige',
    name: '最初のプレステージ',
    description: 'プレステージを実行する',
    requirement: (state) => (state.statistics?.prestigeCount || 0) > 0,
    reward: { resources: { darkMatter: 1000 } },
    category: 'general',
    icon: '♻️',
    hidden: true
  },
  {
    id: 'speed_runner',
    name: 'スピードランナー',
    description: '1時間以内に恒星を作成',
    requirement: (state) => {
      const starCreationTime = state.statistics?.firstStarTime || 0;
      return starCreationTime > 0 && starCreationTime < 3600000;
    },
    reward: { multipliers: { researchSpeed: 1.3 } },
    category: 'general',
    icon: '🏃',
    hidden: true
  },
  {
    id: 'patient_gardener',
    name: '忍耐強い庭師',
    description: 'オフラインで10,000資源を獲得',
    requirement: (state) => (state.statistics?.totalOfflineGains || 0) >= 10000,
    reward: { multipliers: { offlineEfficiency: 1.3 } },
    category: 'general',
    icon: '⏳',
    progress: (state) => ({ current: state.statistics?.totalOfflineGains || 0, target: 10000 })
  },
  {
    id: 'research_enthusiast',
    name: '研究熱心',
    description: '10個の研究を完了',
    requirement: (state) => Object.keys(state.research || {}).length >= 10,
    reward: { multipliers: { researchSpeed: 1.5 } },
    category: 'general',
    icon: '🔬',
    progress: (state) => ({ current: Object.keys(state.research || {}).length, target: 10 })
  },
  {
    id: 'perfectionist',
    name: '完璧主義者',
    description: 'すべての実績を解除する',
    requirement: (state) => {
      // This will be checked differently in the achievement system
      return false;
    },
    reward: { 
      resources: { thoughtPoints: 10000 }, 
      multipliers: { 
        dustGeneration: 2.0, 
        energyGeneration: 2.0, 
        offlineEfficiency: 2.0,
        researchSpeed: 2.0
      }, 
      permanent: true 
    },
    category: 'general',
    icon: '🏆',
    hidden: true
  },
  {
    id: 'lucky_seven',
    name: 'ラッキーセブン',
    description: '7個の天体を7分77秒で作成',
    requirement: (state) => {
      // Special achievement that requires specific timing
      return false;
    },
    reward: { resources: { cosmicDust: 77777, energy: 7777 } },
    category: 'general',
    icon: '7️⃣',
    hidden: true
  },
  {
    id: 'cosmic_balance',
    name: '宇宙の調和',
    description: '恒星、惑星、生命の完璧なバランスを達成',
    requirement: (state) => {
      const stars = state.stars.filter(b => b.userData.type === 'star').length;
      const planets = state.stars.filter(b => b.userData.type === 'planet').length;
      const life = state.stars.filter(b => b.userData.hasLife).length;
      return stars >= 3 && planets >= 9 && life >= 3 && planets === stars * 3 && life === stars;
    },
    reward: { multipliers: { dustGeneration: 1.5, energyGeneration: 1.5, organicMatter: 1.5, biomass: 1.5 } },
    category: 'general',
    icon: '☯️',
    hidden: true
  },

  // ===== Special/Hidden Achievements (5+) =====
  {
    id: 'easter_egg_1',
    name: '???',
    description: '隠された秘密を発見する',
    requirement: (state) => false, // Will be unlocked by special actions
    reward: { resources: { darkMatter: 9999 } },
    category: 'special',
    icon: '🥚',
    hidden: true
  },
  {
    id: 'developer_thanks',
    name: '開発者への感謝',
    description: 'ゲームを100時間プレイ',
    requirement: (state) => (state.totalPlayTime || 0) >= 360000000,
    reward: { 
      resources: { thoughtPoints: 10000 },
      multipliers: { dustGeneration: 2.0, energyGeneration: 2.0 }, 
      permanent: true 
    },
    category: 'special',
    icon: '❤️',
    hidden: true
  },
  {
    id: 'cosmic_accident',
    name: '宇宙の偶然',
    description: '偶然にも完璧な配置を作る',
    requirement: (state) => false, // Special geometric pattern detection
    reward: { resources: { cosmicDust: 50000, energy: 25000 } },
    category: 'special',
    icon: '🎲',
    hidden: true
  },
  {
    id: 'zero_to_hero',
    name: 'ゼロからヒーロー',
    description: '資源0から恒星を作成',
    requirement: (state) => (state.statistics?.zeroToStarAchieved || false),
    reward: { multipliers: { dustGeneration: 3.0 }, permanent: true },
    category: 'special',
    icon: '🦸',
    hidden: true
  },
  {
    id: 'quantum_entanglement',
    name: '量子もつれ',
    description: '2つのブラックホールを近接させる',
    requirement: (state) => {
      const blackHoles = state.stars.filter(b => b.userData.type === 'black_hole');
      if (blackHoles.length < 2) return false;
      // Check distance between black holes
      for (let i = 0; i < blackHoles.length - 1; i++) {
        for (let j = i + 1; j < blackHoles.length; j++) {
          const distance = blackHoles[i].position.distanceTo(blackHoles[j].position);
          if (distance < 50) return true;
        }
      }
      return false;
    },
    reward: { resources: { darkMatter: 10000 }, multipliers: { darkMatter: 2.0 } },
    category: 'special',
    icon: '🌀',
    hidden: true
  }
];

// Helper function to get achievement by ID
export function getAchievementById(id: string): Achievement | undefined {
  return achievements.find(a => a.id === id);
}

// Helper function to get achievements by category
export function getAchievementsByCategory(category: string): Achievement[] {
  return achievements.filter(a => a.category === category);
}

// Helper function to count total achievements
export function getTotalAchievementCount(): number {
  return achievements.length;
}