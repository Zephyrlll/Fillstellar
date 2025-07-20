// Derived Resource Generation System
// 基本リソースから派生リソースを自動生成するシステム

import { ResourceType, QualityTier, QUALITY_MULTIPLIERS, ResourceStorage } from './resourceSystem.js';
import { gameStateManager, GameState } from './state.js';

export interface DerivedResourceRule {
    sourceResource: ResourceType;
    derivedResources: {
        type: ResourceType;
        rate: number; // 基本リソース量に対する生成率 (0.0-1.0)
        qualityBonus: number; // 品質向上ボーナス
    }[];
}

// 派生リソース生成ルール
const GENERATION_RULES: DerivedResourceRule[] = [
    // 宇宙の塵から各種塵を生成
    {
        sourceResource: ResourceType.COSMIC_DUST,
        derivedResources: [
            { type: ResourceType.IRON_DUST, rate: 0.08, qualityBonus: 0 },      // 基本
            { type: ResourceType.CARBON_DUST, rate: 0.06, qualityBonus: 0 },    // 基本
            { type: ResourceType.SILICON_DUST, rate: 0.02, qualityBonus: 0.1 }, // 少し希少
            { type: ResourceType.RARE_EARTH_DUST, rate: 0.00001, qualityBonus: 0.3 }, // 超絶レア 0.001%
        ]
    },
    // エネルギーから各種エネルギーを生成
    {
        sourceResource: ResourceType.ENERGY,
        derivedResources: [
            { type: ResourceType.THERMAL_ENERGY, rate: 0.07, qualityBonus: 0 },     // 基本
            { type: ResourceType.ELECTRIC_ENERGY, rate: 0.05, qualityBonus: 0 },    // 基本
            { type: ResourceType.NUCLEAR_ENERGY, rate: 0.015, qualityBonus: 0.1 },  // 少し希少
            { type: ResourceType.QUANTUM_ENERGY, rate: 0.00001, qualityBonus: 0.3 }, // 超絶レア 0.001%
        ]
    },
    // 有機物から各種有機物を生成
    {
        sourceResource: ResourceType.ORGANIC_MATTER,
        derivedResources: [
            { type: ResourceType.SIMPLE_ORGANICS, rate: 0.06, qualityBonus: 0 },      // 基本
            { type: ResourceType.COMPLEX_ORGANICS, rate: 0.04, qualityBonus: 0 },     // 基本
            { type: ResourceType.GENETIC_MATERIAL, rate: 0.01, qualityBonus: 0.1 },   // 少し希少
            { type: ResourceType.ENZYMES, rate: 0.00001, qualityBonus: 0.3 },         // 超絶レア 0.001%
        ]
    },
    // バイオマスから各種バイオマスを生成
    {
        sourceResource: ResourceType.BIOMASS,
        derivedResources: [
            { type: ResourceType.MICROBIAL_BIOMASS, rate: 0.05, qualityBonus: 0 },      // 基本
            { type: ResourceType.PLANT_BIOMASS, rate: 0.03, qualityBonus: 0 },          // 基本
            { type: ResourceType.ANIMAL_BIOMASS, rate: 0.01, qualityBonus: 0.1 },       // 少し希少
            { type: ResourceType.INTELLIGENT_BIOMASS, rate: 0.00001, qualityBonus: 0.3 }, // 超絶レア 0.001%
        ]
    },
    // ダークマターから各種ダークマターを生成
    {
        sourceResource: ResourceType.DARK_MATTER,
        derivedResources: [
            { type: ResourceType.STABLE_DARK_MATTER, rate: 0.05, qualityBonus: 0 },         // 基本
            { type: ResourceType.VOLATILE_DARK_MATTER, rate: 0.04, qualityBonus: 0 },       // 基本
            { type: ResourceType.EXOTIC_DARK_MATTER, rate: 0.02, qualityBonus: 0.15 },      // 少し希少
            { type: ResourceType.PRIMORDIAL_DARK_MATTER, rate: 0.00001, qualityBonus: 0.3 }, // 超絶レア 0.001%
        ]
    },
    // 思考ポイントから各種思考を生成
    {
        sourceResource: ResourceType.THOUGHT_POINTS,
        derivedResources: [
            { type: ResourceType.BASIC_THOUGHTS, rate: 0.06, qualityBonus: 0 },            // 基本
            { type: ResourceType.CREATIVE_THOUGHTS, rate: 0.05, qualityBonus: 0 },         // 基本
            { type: ResourceType.SCIENTIFIC_THOUGHTS, rate: 0.02, qualityBonus: 0.15 },    // 少し希少
            { type: ResourceType.PHILOSOPHICAL_THOUGHTS, rate: 0.00001, qualityBonus: 0.3 }, // 超絶レア 0.001%
        ]
    }
];

export class DerivedResourceGenerator {
    private lastGenerationTime: number = 0;
    private generationInterval: number = 1000; // 1秒ごとに生成
    private accumulators: Map<ResourceType, number> = new Map();

    constructor() {
        // アキュムレーター初期化
        for (const rule of GENERATION_RULES) {
            for (const derived of rule.derivedResources) {
                this.accumulators.set(derived.type, 0);
            }
        }
        console.log('[DERIVED] Derived resource generator initialized');
    }

    update(deltaTime: number): void {
        const currentTime = Date.now();
        
        // 生成インターバルチェック
        if (currentTime - this.lastGenerationTime < this.generationInterval) {
            return;
        }
        
        this.lastGenerationTime = currentTime;
        const state = gameStateManager.getState();
        
        // advancedResourcesが未初期化の場合は初期化
        if (!state.advancedResources) {
            gameStateManager.updateState(s => ({
                ...s,
                advancedResources: {}
            }));
            return;
        }

        // 生成する派生リソースを計算
        const resourcesToAdd: Map<ResourceType, { amount: number; quality: QualityTier }> = new Map();
        
        for (const rule of GENERATION_RULES) {
            // 基本リソースは state.resources の固定プロパティから取得
            let sourceAmount = 0;
            switch (rule.sourceResource) {
                case ResourceType.COSMIC_DUST:
                    sourceAmount = state.resources.cosmicDust || 0;
                    break;
                case ResourceType.ENERGY:
                    sourceAmount = state.resources.energy || 0;
                    break;
                case ResourceType.ORGANIC_MATTER:
                    sourceAmount = state.resources.organicMatter || 0;
                    break;
                case ResourceType.BIOMASS:
                    sourceAmount = state.resources.biomass || 0;
                    break;
                case ResourceType.DARK_MATTER:
                    sourceAmount = state.resources.darkMatter || 0;
                    break;
                case ResourceType.THOUGHT_POINTS:
                    sourceAmount = state.resources.thoughtPoints || 0;
                    break;
            }
            
            if (sourceAmount <= 0) continue;
            
            for (const derived of rule.derivedResources) {
                // 生成量計算
                const baseGeneration = sourceAmount * derived.rate * (deltaTime / 1000);
                
                // 研究ボーナス適用
                const researchMultiplier = this.getResearchMultiplier(state, derived.type);
                const generation = baseGeneration * researchMultiplier;
                
                // アキュムレーターに追加
                const currentAccumulator = this.accumulators.get(derived.type) || 0;
                const totalAmount = currentAccumulator + generation;
                
                // 整数部分を生成、小数部分はアキュムレーターに保持
                const wholeAmount = Math.floor(totalAmount);
                this.accumulators.set(derived.type, totalAmount - wholeAmount);
                
                if (wholeAmount > 0) {
                    // 品質決定
                    const quality = this.determineQuality(sourceAmount, derived.qualityBonus, state);
                    
                    resourcesToAdd.set(derived.type, {
                        amount: wholeAmount,
                        quality: quality
                    });
                }
            }
        }
        
        // 派生リソースを実際に追加
        if (resourcesToAdd.size > 0) {
            console.log('[DERIVED] Generating derived resources:', resourcesToAdd.size, 'types');
            this.addDerivedResources(resourcesToAdd);
        }
    }

    private getResearchMultiplier(state: Readonly<GameState>, resourceType: ResourceType): number {
        let multiplier = 1.0;
        
        // 全リソース生成ボーナス
        if (state.research?.allResourceMultiplier) {
            multiplier *= state.research.allResourceMultiplier;
        }
        
        // 特定リソースタイプのボーナス
        if (resourceType.includes('dust') && state.research?.dustGenerationMultiplier) {
            multiplier *= state.research.dustGenerationMultiplier;
        }
        if (resourceType.includes('energy') && state.research?.energyConversionMultiplier) {
            multiplier *= state.research.energyConversionMultiplier;
        }
        if (resourceType.includes('thought') && state.research?.thoughtGenerationMultiplier) {
            multiplier *= state.research.thoughtGenerationMultiplier;
        }
        if (resourceType.includes('darkMatter') && state.research?.darkMatterGenerationMultiplier) {
            multiplier *= state.research.darkMatterGenerationMultiplier;
        }
        
        return multiplier;
    }

    private determineQuality(sourceAmount: number, qualityBonus: number, state: Readonly<GameState>): QualityTier {
        // 基本品質確率
        const qualityChances = {
            [QualityTier.POOR]: 0.4,
            [QualityTier.STANDARD]: 0.35,
            [QualityTier.HIGH_QUALITY]: 0.15,
            [QualityTier.PERFECT]: 0.08,
            [QualityTier.LEGENDARY]: 0.02
        };
        
        // ソース量による品質ボーナス
        const amountBonus = Math.min(sourceAmount / 1000000, 0.2); // 最大20%ボーナス
        
        // 研究による品質ボーナス
        const researchBonus = (state.research?.conversionEfficiencyMultiplier || 1.0) - 1.0;
        
        // 総品質ボーナス
        const totalBonus = qualityBonus + amountBonus + researchBonus;
        
        // ボーナスを品質チャンスに適用
        const adjustedChances: Record<QualityTier, number> = { ...qualityChances };
        adjustedChances[QualityTier.LEGENDARY] += totalBonus * 0.1;
        adjustedChances[QualityTier.PERFECT] += totalBonus * 0.2;
        adjustedChances[QualityTier.HIGH_QUALITY] += totalBonus * 0.3;
        adjustedChances[QualityTier.STANDARD] += totalBonus * 0.2;
        adjustedChances[QualityTier.POOR] -= totalBonus * 0.8;
        
        // 負の値を防ぐ
        for (const key in adjustedChances) {
            const tier = parseInt(key) as QualityTier;
            adjustedChances[tier] = Math.max(0, adjustedChances[tier]);
        }
        
        // 正規化
        const total = Object.values(adjustedChances).reduce((sum, chance) => sum + chance, 0);
        for (const key in adjustedChances) {
            const tier = parseInt(key) as QualityTier;
            adjustedChances[tier] /= total;
        }
        
        // ランダムに品質を選択
        const random = Math.random();
        let cumulative = 0;
        
        for (const [quality, chance] of Object.entries(adjustedChances)) {
            cumulative += chance;
            if (random <= cumulative) {
                return parseInt(quality) as QualityTier;
            }
        }
        
        return QualityTier.STANDARD;
    }

    private addDerivedResources(resources: Map<ResourceType, { amount: number; quality: QualityTier }>): void {
        gameStateManager.updateState(state => {
            const newAdvancedResources = { ...state.advancedResources };
            
            for (const [type, data] of resources) {
                const currentResource = newAdvancedResources[type] || {
                    amount: 0,
                    quality: QualityTier.STANDARD,
                    accumulator: 0
                };
                
                // 品質を考慮した平均計算
                const currentEffectiveAmount = currentResource.amount * QUALITY_MULTIPLIERS[currentResource.quality].efficiency;
                const newEffectiveAmount = data.amount * QUALITY_MULTIPLIERS[data.quality].efficiency;
                const totalEffectiveAmount = currentEffectiveAmount + newEffectiveAmount;
                const totalAmount = currentResource.amount + data.amount;
                
                // 新しい平均品質を計算
                let averageQuality = QualityTier.STANDARD;
                if (totalAmount > 0) {
                    const averageEfficiency = totalEffectiveAmount / totalAmount;
                    
                    // 最も近い品質ティアを見つける
                    let minDiff = Infinity;
                    for (const [tier, multiplier] of Object.entries(QUALITY_MULTIPLIERS)) {
                        const diff = Math.abs(multiplier.efficiency - averageEfficiency);
                        if (diff < minDiff) {
                            minDiff = diff;
                            averageQuality = parseInt(tier) as QualityTier;
                        }
                    }
                }
                
                newAdvancedResources[type] = {
                    amount: totalAmount,
                    quality: averageQuality,
                    accumulator: currentResource.accumulator || 0
                };
            }
            
            return {
                ...state,
                advancedResources: newAdvancedResources
            };
        });
    }

    // デバッグ用：現在の派生リソース状態を取得
    getDerivedResourcesInfo(): { [key: string]: { amount: number; quality: string } } {
        const state = gameStateManager.getState();
        const info: { [key: string]: { amount: number; quality: string } } = {};
        
        if (state.advancedResources) {
            for (const [type, resource] of Object.entries(state.advancedResources)) {
                if (resource.amount > 0) {
                    info[type] = {
                        amount: resource.amount,
                        quality: ['Poor', 'Standard', 'High Quality', 'Perfect', 'Legendary'][resource.quality]
                    };
                }
            }
        }
        
        return info;
    }
}