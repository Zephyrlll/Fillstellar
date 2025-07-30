/**
 * Production Chain Optimizer
 * 生産チェーン自動最適化アルゴリズム
 */

import { gameState } from '../state.js';
import { ProductionChain, ProductionNode, ProductionLink } from '../types/productionChain.js';
import { ConversionRecipe } from '../conversionRecipes.js';
import { showMessage } from '../ui.js';

interface OptimizationResult {
    success: boolean;
    changes: OptimizationChange[];
    newEfficiency: number;
    oldEfficiency: number;
}

interface OptimizationChange {
    type: 'add_node' | 'remove_node' | 'add_link' | 'remove_link' | 'update_multiplier';
    description: string;
    target?: string;
    value?: any;
}

export class ProductionOptimizer {
    private static instance: ProductionOptimizer;
    
    private constructor() {}
    
    static getInstance(): ProductionOptimizer {
        if (!ProductionOptimizer.instance) {
            ProductionOptimizer.instance = new ProductionOptimizer();
        }
        return ProductionOptimizer.instance;
    }
    
    /**
     * 生産チェーンの自動最適化
     */
    optimizeChain(chain: ProductionChain): OptimizationResult {
        console.log('[OPTIMIZER] Starting optimization...');
        
        const changes: OptimizationChange[] = [];
        const oldEfficiency = this.calculateChainEfficiency(chain);
        
        // 1. ボトルネックの解消
        this.resolveBottlenecks(chain, changes);
        
        // 2. 不要なノードの削除
        this.removeUnusedNodes(chain, changes);
        
        // 3. 効率的な変換パスの追加
        this.addEfficientPaths(chain, changes);
        
        // 4. 並列処理の最適化
        this.optimizeParallelProcessing(chain, changes);
        
        // 5. リンクの最適化
        this.optimizeLinks(chain, changes);
        
        const newEfficiency = this.calculateChainEfficiency(chain);
        
        console.log(`[OPTIMIZER] Optimization complete. Efficiency: ${oldEfficiency.toFixed(2)}% -> ${newEfficiency.toFixed(2)}%`);
        
        return {
            success: changes.length > 0,
            changes,
            newEfficiency,
            oldEfficiency
        };
    }
    
    /**
     * チェーン効率の計算
     */
    private calculateChainEfficiency(chain: ProductionChain): number {
        if (chain.nodes.size === 0) return 0;
        
        let totalEfficiency = 0;
        let nodeCount = 0;
        
        chain.nodes.forEach(node => {
            if (node.type === 'converter') {
                const inputRate = this.calculateNodeInputRate(node, chain);
                const outputRate = this.calculateNodeOutputRate(node, chain);
                const maxRate = node.recipe?.baseRate || 1;
                
                const efficiency = Math.min(inputRate, outputRate) / maxRate * 100;
                totalEfficiency += efficiency;
                nodeCount++;
            }
        });
        
        return nodeCount > 0 ? totalEfficiency / nodeCount : 0;
    }
    
    /**
     * ボトルネックの解消
     */
    private resolveBottlenecks(chain: ProductionChain, changes: OptimizationChange[]): void {
        const bottlenecks = this.findBottlenecks(chain);
        
        bottlenecks.forEach(bottleneck => {
            // 入力不足の場合
            if (bottleneck.type === 'input_shortage') {
                // 新しい供給ノードを追加
                const resourceNeeded = bottleneck.resource;
                const converterNode = this.findBestConverterForResource(resourceNeeded);
                
                if (converterNode) {
                    changes.push({
                        type: 'add_node',
                        description: `${resourceNeeded}の供給ノードを追加`,
                        target: converterNode.recipe.id,
                        value: converterNode
                    });
                }
            }
            
            // 出力過剰の場合
            else if (bottleneck.type === 'output_excess') {
                // 消費ノードを追加または倍率を調整
                const excessNode = bottleneck.node;
                if (excessNode.multiplier > 1) {
                    const newMultiplier = Math.max(1, Math.floor(excessNode.multiplier * 0.8));
                    changes.push({
                        type: 'update_multiplier',
                        description: `${excessNode.id}の倍率を${excessNode.multiplier}から${newMultiplier}に削減`,
                        target: excessNode.id,
                        value: newMultiplier
                    });
                }
            }
        });
    }
    
    /**
     * 不要なノードの削除
     */
    private removeUnusedNodes(chain: ProductionChain, changes: OptimizationChange[]): void {
        const unusedNodes: ProductionNode[] = [];
        
        chain.nodes.forEach(node => {
            // 出力リンクがないノード
            const hasOutputLinks = Array.from(chain.links.values()).some(
                link => link.from === node.id
            );
            
            // 入力リンクがないノード（ソースノード以外）
            const hasInputLinks = Array.from(chain.links.values()).some(
                link => link.to === node.id
            );
            
            if (node.type === 'converter' && !hasOutputLinks) {
                unusedNodes.push(node);
            } else if (node.type === 'converter' && !hasInputLinks) {
                // 必要な入力がないコンバーター
                const recipe = node.recipe;
                if (recipe && recipe.inputs.length > 0) {
                    unusedNodes.push(node);
                }
            }
        });
        
        unusedNodes.forEach(node => {
            changes.push({
                type: 'remove_node',
                description: `未使用のノード「${node.id}」を削除`,
                target: node.id
            });
        });
    }
    
    /**
     * 効率的な変換パスの追加
     */
    private addEfficientPaths(chain: ProductionChain, changes: OptimizationChange[]): void {
        // 最終出力ノードを特定
        const outputNodes = this.findOutputNodes(chain);
        
        outputNodes.forEach(outputNode => {
            if (outputNode.type === 'converter' && outputNode.recipe) {
                // このノードが必要とする資源
                outputNode.recipe.inputs.forEach(input => {
                    const currentSupply = this.calculateResourceSupply(input.resource, chain);
                    const demand = input.amount * outputNode.multiplier;
                    
                    if (currentSupply < demand * 0.8) {
                        // 供給不足 - より効率的な変換経路を探す
                        const efficientPath = this.findEfficientPath(input.resource, demand - currentSupply);
                        
                        if (efficientPath) {
                            changes.push({
                                type: 'add_node',
                                description: `${input.resource}の効率的な生産経路を追加`,
                                value: efficientPath
                            });
                        }
                    }
                });
            }
        });
    }
    
    /**
     * 並列処理の最適化
     */
    private optimizeParallelProcessing(chain: ProductionChain, changes: OptimizationChange[]): void {
        // 同じレシピを使うノードを見つける
        const recipeGroups = new Map<string, ProductionNode[]>();
        
        chain.nodes.forEach(node => {
            if (node.type === 'converter' && node.recipe) {
                const recipeId = node.recipe.id;
                if (!recipeGroups.has(recipeId)) {
                    recipeGroups.set(recipeId, []);
                }
                recipeGroups.get(recipeId)!.push(node);
            }
        });
        
        // 並列ノードの統合または分割
        recipeGroups.forEach((nodes, recipeId) => {
            if (nodes.length > 1) {
                // 効率が低い並列ノードを統合
                const inefficientNodes = nodes.filter(node => {
                    const efficiency = this.calculateNodeEfficiency(node, chain);
                    return efficiency < 50;
                });
                
                if (inefficientNodes.length > 1) {
                    const totalMultiplier = inefficientNodes.reduce((sum, node) => sum + node.multiplier, 0);
                    changes.push({
                        type: 'remove_node',
                        description: `非効率な並列ノードを統合`,
                        target: inefficientNodes.map(n => n.id).join(',')
                    });
                }
            }
        });
    }
    
    /**
     * リンクの最適化
     */
    private optimizeLinks(chain: ProductionChain, changes: OptimizationChange[]): void {
        const underutilizedLinks: ProductionLink[] = [];
        
        chain.links.forEach(link => {
            const fromNode = chain.nodes.get(link.from);
            const toNode = chain.nodes.get(link.to);
            
            if (fromNode && toNode) {
                const capacity = this.calculateLinkCapacity(link, fromNode, toNode);
                const usage = this.calculateLinkUsage(link, chain);
                
                if (usage < capacity * 0.2) {
                    underutilizedLinks.push(link);
                }
            }
        });
        
        underutilizedLinks.forEach(link => {
            changes.push({
                type: 'remove_link',
                description: `低使用率のリンクを削除: ${link.from} -> ${link.to}`,
                target: link.id
            });
        });
    }
    
    // ヘルパーメソッド
    
    private findBottlenecks(chain: ProductionChain): any[] {
        const bottlenecks: any[] = [];
        
        chain.nodes.forEach(node => {
            if (node.type === 'converter') {
                const inputRate = this.calculateNodeInputRate(node, chain);
                const outputCapacity = this.calculateNodeOutputCapacity(node);
                
                if (inputRate < outputCapacity * 0.8) {
                    bottlenecks.push({
                        type: 'input_shortage',
                        node,
                        resource: node.recipe?.inputs[0]?.resource
                    });
                } else if (inputRate > outputCapacity * 1.2) {
                    bottlenecks.push({
                        type: 'output_excess',
                        node
                    });
                }
            }
        });
        
        return bottlenecks;
    }
    
    private calculateNodeInputRate(node: ProductionNode, chain: ProductionChain): number {
        let totalInput = 0;
        
        chain.links.forEach(link => {
            if (link.to === node.id) {
                const fromNode = chain.nodes.get(link.from);
                if (fromNode) {
                    totalInput += this.calculateLinkFlow(link, chain);
                }
            }
        });
        
        return totalInput;
    }
    
    private calculateNodeOutputRate(node: ProductionNode, chain: ProductionChain): number {
        if (node.type !== 'converter' || !node.recipe) return 0;
        
        const baseRate = node.recipe.baseRate || 1;
        return baseRate * node.multiplier;
    }
    
    private calculateNodeOutputCapacity(node: ProductionNode): number {
        if (node.type !== 'converter' || !node.recipe) return 0;
        
        const baseRate = node.recipe.baseRate || 1;
        return baseRate * node.multiplier;
    }
    
    private calculateNodeEfficiency(node: ProductionNode, chain: ProductionChain): number {
        const inputRate = this.calculateNodeInputRate(node, chain);
        const outputCapacity = this.calculateNodeOutputCapacity(node);
        
        return outputCapacity > 0 ? (inputRate / outputCapacity) * 100 : 0;
    }
    
    private calculateLinkFlow(link: ProductionLink, chain: ProductionChain): number {
        const fromNode = chain.nodes.get(link.from);
        if (!fromNode) return 0;
        
        if (fromNode.type === 'source') {
            // ソースノードは無限供給
            return 1000;
        } else if (fromNode.type === 'converter') {
            return this.calculateNodeOutputRate(fromNode, chain);
        }
        
        return 0;
    }
    
    private calculateLinkCapacity(link: ProductionLink, fromNode: ProductionNode, toNode: ProductionNode): number {
        if (fromNode.type === 'source') return 1000;
        if (fromNode.type === 'converter') {
            return this.calculateNodeOutputCapacity(fromNode);
        }
        return 0;
    }
    
    private calculateLinkUsage(link: ProductionLink, chain: ProductionChain): number {
        return this.calculateLinkFlow(link, chain);
    }
    
    private findOutputNodes(chain: ProductionChain): ProductionNode[] {
        const outputNodes: ProductionNode[] = [];
        
        chain.nodes.forEach(node => {
            const hasOutgoingLinks = Array.from(chain.links.values()).some(
                link => link.from === node.id
            );
            
            if (!hasOutgoingLinks && node.type === 'converter') {
                outputNodes.push(node);
            }
        });
        
        return outputNodes;
    }
    
    private calculateResourceSupply(resource: string, chain: ProductionChain): number {
        let totalSupply = 0;
        
        chain.nodes.forEach(node => {
            if (node.type === 'converter' && node.recipe) {
                node.recipe.outputs.forEach(output => {
                    if (output.resource === resource) {
                        totalSupply += output.amount * node.multiplier;
                    }
                });
            } else if (node.type === 'source' && node.resource === resource) {
                totalSupply += 1000; // ソースは無限供給
            }
        });
        
        return totalSupply;
    }
    
    private findBestConverterForResource(resource: string): any {
        // 利用可能なレシピから最適なものを選択
        const recipes = (window as any).conversionEngine?.getAvailableRecipes() || [];
        
        const producingRecipes = recipes.filter((recipe: ConversionRecipe) => 
            recipe.outputs.some(output => output.resource === resource)
        );
        
        if (producingRecipes.length === 0) return null;
        
        // 最も効率的なレシピを選択（効率 = 出力量 / 入力コスト）
        const bestRecipe = producingRecipes.reduce((best: ConversionRecipe, current: ConversionRecipe) => {
            const currentEfficiency = this.calculateRecipeEfficiency(current, resource);
            const bestEfficiency = this.calculateRecipeEfficiency(best, resource);
            
            return currentEfficiency > bestEfficiency ? current : best;
        });
        
        return {
            type: 'converter',
            recipe: bestRecipe,
            multiplier: 1
        };
    }
    
    private calculateRecipeEfficiency(recipe: ConversionRecipe, targetResource: string): number {
        const output = recipe.outputs.find(o => o.resource === targetResource);
        if (!output) return 0;
        
        const inputCost = recipe.inputs.reduce((total, input) => {
            // 資源の価値に基づいてコストを計算
            const resourceValue = this.getResourceValue(input.resource);
            return total + (input.amount * resourceValue);
        }, 0);
        
        const outputValue = output.amount * this.getResourceValue(targetResource);
        
        return inputCost > 0 ? outputValue / inputCost : 0;
    }
    
    private getResourceValue(resource: string): number {
        // 資源の相対的価値（ゲームバランスに基づく）
        const values: { [key: string]: number } = {
            'cosmicDust': 1,
            'energy': 10,
            'organicMatter': 50,
            'biomass': 100,
            'darkMatter': 500,
            'thoughtPoints': 1000
        };
        
        return values[resource] || 1;
    }
    
    private findEfficientPath(resource: string, amount: number): any {
        // 最も効率的な生産経路を探索
        const converter = this.findBestConverterForResource(resource);
        
        if (converter) {
            // 必要な倍率を計算
            const outputPerCycle = converter.recipe.outputs.find((o: any) => o.resource === resource)?.amount || 1;
            const requiredMultiplier = Math.ceil(amount / outputPerCycle);
            
            converter.multiplier = Math.min(requiredMultiplier, 10); // 最大倍率は10
            
            return converter;
        }
        
        return null;
    }
}

// グローバルに公開
(window as any).productionOptimizer = ProductionOptimizer.getInstance();