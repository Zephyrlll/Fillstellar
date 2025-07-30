/**
 * Infinite Resource Tier System Types
 * 無限スケールの資源tierシステムの型定義
 */

export interface InfiniteResourceTier {
  tier: number;
  name: string;
  color: string;
  prefix: string;
  suffix: string;
  baseMultiplier: number;
  conversionRatio: number; // 前のtierからの変換比率
  unlockCondition?: ResourceUnlockCondition;
  isGenerated: boolean; // 手続き的に生成されたかどうか
  visualGrade?: 'common' | 'epic' | 'legendary' | 'mythic'; // ビジュアルグレード
  specialEffects?: string[]; // 特殊効果
  mythicChance?: number; // 神話レアリティの確率
}

export interface ResourceUnlockCondition {
  type: 'amount' | 'research' | 'celestial' | 'paragon';
  value: any;
}

export interface InfiniteResourceData {
  currentTiers: Map<string, InfiniteResourceTier[]>; // 資源タイプごとのtier配列
  maxUnlockedTier: Map<string, number>; // 資源タイプごとの最大解放tier
  tierGenerationSeed: number; // 手続き的生成のシード値
  customPrefixes: string[]; // カスタムプレフィックスリスト
  customSuffixes: string[]; // カスタムサフィックスリスト
}

// 大きな数値の表記
export interface LargeNumberFormat {
  value: number;
  mantissa: number;
  exponent: number;
  formatted: string;
  scientific: string;
  suffix: string;
}

// デフォルトの資源tier定義
export const DEFAULT_RESOURCE_TIERS: InfiniteResourceTier[] = [
  {
    tier: 0,
    name: '基本',
    color: '#ffffff',
    prefix: '',
    suffix: '',
    baseMultiplier: 1,
    conversionRatio: 1,
    isGenerated: false
  },
  {
    tier: 1,
    name: '濃縮',
    color: '#00ff00',
    prefix: '濃縮',
    suffix: '',
    baseMultiplier: 10,
    conversionRatio: 100,
    isGenerated: false
  },
  {
    tier: 2,
    name: '圧縮',
    color: '#0080ff',
    prefix: '圧縮',
    suffix: '',
    baseMultiplier: 100,
    conversionRatio: 100,
    isGenerated: false
  },
  {
    tier: 3,
    name: '超高密度',
    color: '#ff00ff',
    prefix: '超高密度',
    suffix: '',
    baseMultiplier: 1000,
    conversionRatio: 100,
    isGenerated: false
  },
  {
    tier: 4,
    name: '量子',
    color: '#ff8000',
    prefix: '量子',
    suffix: '',
    baseMultiplier: 10000,
    conversionRatio: 100,
    isGenerated: false
  }
];

// 手続き的に生成される接頭辞と接尾辞
export const PROCEDURAL_PREFIXES = [
  'メタ', 'ハイパー', 'ウルトラ', 'オメガ', 'インフィニティ',
  'トランス', 'エクストラ', 'スーパー', 'メガ', 'ギガ',
  'テラ', 'ペタ', 'エクサ', 'ゼタ', 'ヨタ'
];

export const PROCEDURAL_SUFFIXES = [
  'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ',
  'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ',
  'φ', 'χ', 'ψ', 'ω'
];

// 大きな数の接尾辞（AA, AB, AC...形式）
export function generateAlphabeticalSuffix(n: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffix = '';
  
  // n を 26進数として扱い、文字列に変換
  while (n >= 0) {
    suffix = letters[n % 26] + suffix;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  
  return suffix;
}

// 科学的記数法のカスタム表記
export function formatLargeNumber(value: number): LargeNumberFormat {
  if (value < 1e6) {
    return {
      value,
      mantissa: value,
      exponent: 0,
      formatted: value.toLocaleString(),
      scientific: value.toString(),
      suffix: ''
    };
  }
  
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);
  
  // 標準的な接尾辞
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const suffixIndex = Math.floor(exponent / 3);
  
  let suffix = '';
  if (suffixIndex < suffixes.length) {
    suffix = suffixes[suffixIndex];
  } else {
    // AA, AB, AC...形式
    suffix = generateAlphabeticalSuffix(suffixIndex - suffixes.length);
  }
  
  const adjustedMantissa = value / Math.pow(1000, suffixIndex);
  const formatted = adjustedMantissa >= 100 
    ? Math.floor(adjustedMantissa).toString() 
    : adjustedMantissa.toFixed(2 - Math.floor(Math.log10(adjustedMantissa)));
  
  return {
    value,
    mantissa,
    exponent,
    formatted: formatted + suffix,
    scientific: `${mantissa.toFixed(2)}e${exponent}`,
    suffix
  };
}

// 資源変換レシピの自動生成
export interface ProceduralConversionRecipe {
  fromTier: number;
  toTier: number;
  fromResource: string;
  toResource: string;
  ratio: number;
  efficiency: number;
  requirements?: string[];
}

export function generateConversionRecipe(
  fromTier: InfiniteResourceTier,
  toTier: InfiniteResourceTier,
  resourceType: string
): ProceduralConversionRecipe {
  return {
    fromTier: fromTier.tier,
    toTier: toTier.tier,
    fromResource: `${resourceType}_tier${fromTier.tier}`,
    toResource: `${resourceType}_tier${toTier.tier}`,
    ratio: toTier.conversionRatio,
    efficiency: 0.9 - (toTier.tier - fromTier.tier) * 0.05, // 高tierほど効率低下
    requirements: toTier.tier > 5 ? [`research_tier${toTier.tier}`] : undefined
  };
}