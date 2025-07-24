// Production Chain Visualizer Core System

import {
  ChainNode,
  ChainLink,
  ProductionChain,
  ChainMetrics,
  OptimizationSuggestion,
  ChainAnalysis,
  ChainNodeType,
  VisualizerSettings,
  VisualizerMode,
  ChainFilter,
  LayoutAlgorithm
} from '../types/productionChain.js';
import { ResourceType, QualityTier, RESOURCE_METADATA } from '../resourceSystem.js';
import { CONVERSION_RECIPES } from '../conversionRecipes.js';
import { conversionEngine } from '../conversionEngine.js';
import { gameState, gameStateManager } from '../state.js';

export class ProductionChainVisualizer {
  private chain: ProductionChain;
  private settings: VisualizerSettings;
  private updateInterval: number | null = null;
  private analysisCache: ChainAnalysis | null = null;
  private lastAnalysisTime: number = 0;
  private readonly ANALYSIS_CACHE_TIME = 5000; // 5 seconds

  constructor() {
    this.chain = {
      nodes: new Map(),
      links: new Map(),
      metrics: this.createEmptyMetrics()
    };

    this.settings = {
      mode: VisualizerMode.SIMPLE,
      showRates: true,
      showQuality: false,
      showEfficiency: true,
      autoLayout: true,
      animateFlow: true,
      highlightBottlenecks: true,
      updateInterval: 1000 // 1 second
    };
  }

  // Initialize the visualizer
  public initialize(): void {
    console.log('[PRODUCTION_CHAIN] Initializing visualizer');
    this.buildChainFromCurrentState();
    this.startRealtimeUpdates();
  }

  // Build production chain from current game state
  private buildChainFromCurrentState(): void {
    this.chain.nodes.clear();
    this.chain.links.clear();

    // Add resource source nodes
    this.addResourceSources();

    // Add active conversions
    this.addActiveConversions();

    // Add facilities
    this.addFacilities();

    // Add resource sinks (consumption)
    this.addResourceSinks();

    // Build connections
    this.buildConnections();

    // Update metrics
    this.updateMetrics();
  }

  // Add resource source nodes
  private addResourceSources(): void {
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];

    basicResources.forEach((resourceType, index) => {
      const nodeId = `source_${resourceType}`;
      const metadata = RESOURCE_METADATA[resourceType];
      
      this.chain.nodes.set(nodeId, {
        id: nodeId,
        type: 'source',
        label: `${metadata.name} Source`,
        icon: metadata.icon,
        position: { x: 100, y: 100 + index * 120 },
        data: {
          resourceType,
          rate: this.calculateResourceGeneration(resourceType),
          quality: QualityTier.STANDARD
        },
        status: 'active'
      });
    });
  }

  // Add active conversion nodes
  private addActiveConversions(): void {
    const activeConversions = conversionEngine.getActiveConversions();
    
    activeConversions.forEach((conversion, index) => {
      const nodeId = `conversion_${conversion.id}`;
      
      this.chain.nodes.set(nodeId, {
        id: nodeId,
        type: 'conversion',
        label: conversion.recipe.name,
        icon: '⚗️',
        position: { x: 400, y: 100 + index * 150 },
        data: {
          recipeId: conversion.recipe.id,
          efficiency: conversion.facility?.efficiency || 1.0
        },
        status: 'active'
      });
    });
  }

  // Add facility nodes
  private addFacilities(): void {
    const facilities = conversionEngine.getAllFacilities();
    
    facilities.forEach((facility, index) => {
      const nodeId = `facility_${facility.id}`;
      
      this.chain.nodes.set(nodeId, {
        id: nodeId,
        type: 'facility',
        label: facility.name,
        icon: '🏭',
        position: { x: 700, y: 100 + index * 120 },
        data: {
          facilityId: facility.id,
          efficiency: facility.efficiency * (1 + facility.level * 0.1)
        },
        status: facility.isActive ? 'active' : 'idle'
      });
    });
  }

  // Add resource sink nodes (consumption)
  private addResourceSinks(): void {
    // Analyze resource consumption patterns
    const consumptionPatterns = this.analyzeResourceConsumption();
    
    let index = 0;
    consumptionPatterns.forEach((consumption, resourceType) => {
      if (consumption > 0) {
        const nodeId = `sink_${resourceType}`;
        const metadata = RESOURCE_METADATA[resourceType];
        
        this.chain.nodes.set(nodeId, {
          id: nodeId,
          type: 'sink',
          label: `${metadata.name} Usage`,
          icon: '📥',
          position: { x: 1000, y: 100 + index * 120 },
          data: {
            resourceType,
            rate: consumption,
            quality: QualityTier.STANDARD
          },
          status: 'active'
        });
        index++;
      }
    });
  }

  // Build connections between nodes
  private buildConnections(): void {
    let linkId = 0;

    // Connect sources to conversions
    this.chain.nodes.forEach(node => {
      if (node.type === 'conversion' && node.data.recipeId) {
        const recipe = CONVERSION_RECIPES[node.data.recipeId];
        if (!recipe) return;

        // Input connections
        recipe.inputs.resources.forEach(input => {
          const sourceNode = this.findNodeByResourceType(input.type, 'source');
          if (sourceNode) {
            this.chain.links.set(`link_${linkId++}`, {
              id: `link_${linkId}`,
              source: sourceNode.id,
              target: node.id,
              type: 'input',
              data: {
                resourceType: input.type,
                amount: input.amount,
                rate: input.amount / recipe.time * 60, // per minute
                quality: input.quality,
                utilization: 0.8 // TODO: Calculate actual utilization
              },
              status: 'optimal'
            });
          }
        });

        // Output connections
        recipe.outputs.resources.forEach(output => {
          const sinkNode = this.findNodeByResourceType(output.type, 'sink');
          const targetId = sinkNode ? sinkNode.id : `resource_${output.type}`;
          
          this.chain.links.set(`link_${linkId++}`, {
            id: `link_${linkId}`,
            source: node.id,
            target: targetId,
            type: 'output',
            data: {
              resourceType: output.type,
              amount: output.amount,
              rate: output.amount / recipe.time * 60, // per minute
              quality: output.quality,
              utilization: 0.9
            },
            status: 'optimal'
          });
        });
      }
    });
  }

  // Find node by resource type
  private findNodeByResourceType(resourceType: ResourceType, nodeType: ChainNodeType): ChainNode | undefined {
    for (const [_, node] of this.chain.nodes) {
      if (node.type === nodeType && node.data.resourceType === resourceType) {
        return node;
      }
    }
    return undefined;
  }

  // Calculate resource generation rate
  private calculateResourceGeneration(resourceType: ResourceType): number {
    // Base generation rates (per minute)
    const baseRates: Partial<Record<ResourceType, number>> = {
      [ResourceType.COSMIC_DUST]: 60,
      [ResourceType.ENERGY]: 30,
      [ResourceType.ORGANIC_MATTER]: 20,
      [ResourceType.BIOMASS]: 10,
      [ResourceType.DARK_MATTER]: 5,
      [ResourceType.THOUGHT_POINTS]: 15
    };

    const baseRate = baseRates[resourceType] || 0;
    
    // Apply research multipliers
    const research = gameState.research || {};
    let multiplier = 1;

    switch (resourceType) {
      case ResourceType.COSMIC_DUST:
        multiplier *= research.dustGenerationMultiplier || 1;
        break;
      case ResourceType.ENERGY:
        multiplier *= research.energyConversionMultiplier || 1;
        break;
      case ResourceType.DARK_MATTER:
        multiplier *= research.darkMatterGenerationMultiplier || 1;
        break;
    }

    // Apply global multiplier
    multiplier *= research.allResourceMultiplier || 1;

    return baseRate * multiplier;
  }

  // Analyze resource consumption
  private analyzeResourceConsumption(): Map<ResourceType, number> {
    const consumption = new Map<ResourceType, number>();

    // Analyze active conversions
    const activeConversions = conversionEngine.getActiveConversions();
    activeConversions.forEach(conversion => {
      const recipe = conversion.recipe;
      recipe.inputs.resources.forEach(input => {
        const current = consumption.get(input.type) || 0;
        const rate = input.amount / recipe.time * 60; // per minute
        consumption.set(input.type, current + rate);
      });
    });

    return consumption;
  }

  // Update chain metrics
  private updateMetrics(): void {
    const metrics = this.createEmptyMetrics();

    // Calculate total input/output
    this.chain.links.forEach(link => {
      if (link.type === 'input') {
        const current = metrics.totalInput.get(link.data.resourceType) || 0;
        metrics.totalInput.set(link.data.resourceType, current + link.data.rate);
      } else if (link.type === 'output') {
        const current = metrics.totalOutput.get(link.data.resourceType) || 0;
        metrics.totalOutput.set(link.data.resourceType, current + link.data.rate);
      }
    });

    // Calculate efficiency
    let totalEfficiency = 0;
    let facilityCount = 0;
    this.chain.nodes.forEach(node => {
      if (node.type === 'facility' && node.data.efficiency) {
        totalEfficiency += node.data.efficiency;
        facilityCount++;
      }
    });
    metrics.efficiency = facilityCount > 0 ? totalEfficiency / facilityCount : 1;

    // Detect bottlenecks
    metrics.bottlenecks = this.detectBottlenecks();

    // Generate suggestions
    metrics.suggestions = this.generateOptimizationSuggestions();

    metrics.lastUpdate = Date.now();
    this.chain.metrics = metrics;
  }

  // Detect bottlenecks in the chain
  private detectBottlenecks(): string[] {
    const bottlenecks: string[] = [];

    // Check each link for low utilization or blockage
    this.chain.links.forEach(link => {
      if (link.data.utilization < 0.5) {
        // Find the source node
        const sourceNode = this.chain.nodes.get(link.source);
        if (sourceNode && !bottlenecks.includes(sourceNode.id)) {
          bottlenecks.push(sourceNode.id);
          sourceNode.status = 'bottleneck';
        }
      }
    });

    // Check resource balance
    const analysis = this.analyzeChain();
    analysis.resourceBalance.forEach((balance, resourceType) => {
      if (balance.net < 0 && Math.abs(balance.net) > balance.production * 0.1) {
        // Resource deficit
        const sourceNode = this.findNodeByResourceType(resourceType, 'source');
        if (sourceNode && !bottlenecks.includes(sourceNode.id)) {
          bottlenecks.push(sourceNode.id);
          sourceNode.status = 'bottleneck';
        }
      }
    });

    return bottlenecks;
  }

  // Generate optimization suggestions
  private generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const analysis = this.analyzeChain();

    // Check for resource deficits
    analysis.resourceBalance.forEach((balance, resourceType) => {
      if (balance.net < 0) {
        const deficit = Math.abs(balance.net);
        const metadata = RESOURCE_METADATA[resourceType];
        
        suggestions.push({
          id: `increase_${resourceType}`,
          type: 'adjust_ratio',
          priority: deficit > balance.production * 0.5 ? 'high' : 'medium',
          title: `${metadata.name}の生産不足`,
          description: `${metadata.name}が毎分${deficit.toFixed(1)}不足しています。生産を増やすか消費を減らしてください。`,
          impact: {
            resourceType,
            currentRate: balance.production,
            projectedRate: balance.production + deficit,
            improvementPercent: (deficit / balance.production) * 100
          }
        });
      }
    });

    // Check for underutilized facilities
    this.chain.nodes.forEach(node => {
      if (node.type === 'facility' && node.status === 'idle') {
        suggestions.push({
          id: `activate_${node.id}`,
          type: 'adjust_ratio',
          priority: 'low',
          title: `${node.label}が稼働していません`,
          description: '施設を稼働させて生産効率を向上させましょう。',
          impact: {
            resourceType: ResourceType.COSMIC_DUST, // TODO: Get actual resource
            currentRate: 0,
            projectedRate: 100,
            improvementPercent: 100
          }
        });
      }
    });

    // Check for quality bottlenecks
    analysis.qualityBottlenecks.forEach((quality, nodeId) => {
      const node = this.chain.nodes.get(nodeId);
      if (node && quality < QualityTier.HIGH_QUALITY) {
        suggestions.push({
          id: `upgrade_quality_${nodeId}`,
          type: 'upgrade_facility',
          priority: 'medium',
          title: `${node.label}の品質を向上`,
          description: '品質を向上させることで生産効率が改善されます。',
          impact: {
            resourceType: ResourceType.COSMIC_DUST, // TODO: Get actual resource
            currentRate: 100,
            projectedRate: 150,
            improvementPercent: 50
          }
        });
      }
    });

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  // Analyze the production chain
  public analyzeChain(): ChainAnalysis {
    // Check cache
    const now = Date.now();
    if (this.analysisCache && now - this.lastAnalysisTime < this.ANALYSIS_CACHE_TIME) {
      return this.analysisCache;
    }

    const analysis: ChainAnalysis = {
      criticalPath: this.findCriticalPath(),
      redundantNodes: this.findRedundantNodes(),
      underutilizedLinks: this.findUnderutilizedLinks(),
      qualityBottlenecks: this.findQualityBottlenecks(),
      resourceBalance: this.calculateResourceBalance()
    };

    this.analysisCache = analysis;
    this.lastAnalysisTime = now;

    return analysis;
  }

  // Find critical path in the chain
  private findCriticalPath(): string[] {
    // Simplified critical path - find longest chain from source to sink
    const path: string[] = [];
    
    // Start from a source node
    const sourceNodes = Array.from(this.chain.nodes.values())
      .filter(node => node.type === 'source');
    
    if (sourceNodes.length === 0) return path;

    // Use first source for now (TODO: Implement proper algorithm)
    let currentNode = sourceNodes[0];
    path.push(currentNode.id);

    // Follow links to sink
    let iterations = 0;
    while (currentNode && iterations < 10) {
      const outgoingLinks = Array.from(this.chain.links.values())
        .filter(link => link.source === currentNode.id);
      
      if (outgoingLinks.length === 0) break;

      // Follow first link
      const nextLink = outgoingLinks[0];
      const nextNode = this.chain.nodes.get(nextLink.target);
      
      if (nextNode) {
        path.push(nextNode.id);
        currentNode = nextNode;
      } else {
        break;
      }
      
      iterations++;
    }

    return path;
  }

  // Find redundant nodes
  private findRedundantNodes(): string[] {
    const redundant: string[] = [];

    // Find nodes with no outgoing connections
    this.chain.nodes.forEach(node => {
      if (node.type === 'conversion' || node.type === 'facility') {
        const hasOutgoing = Array.from(this.chain.links.values())
          .some(link => link.source === node.id);
        
        if (!hasOutgoing) {
          redundant.push(node.id);
        }
      }
    });

    return redundant;
  }

  // Find underutilized links
  private findUnderutilizedLinks(): string[] {
    return Array.from(this.chain.links.values())
      .filter(link => link.data.utilization < 0.5)
      .map(link => link.id);
  }

  // Find quality bottlenecks
  private findQualityBottlenecks(): Map<string, QualityTier> {
    const bottlenecks = new Map<string, QualityTier>();

    this.chain.nodes.forEach(node => {
      if (node.type === 'conversion' && node.data.quality !== undefined) {
        if (node.data.quality < QualityTier.STANDARD) {
          bottlenecks.set(node.id, node.data.quality);
        }
      }
    });

    return bottlenecks;
  }

  // Calculate resource balance
  private calculateResourceBalance(): Map<ResourceType, any> {
    const balance = new Map<ResourceType, any>();

    // Initialize all resource types
    Object.values(ResourceType).forEach(resourceType => {
      balance.set(resourceType, {
        production: 0,
        consumption: 0,
        net: 0,
        trend: 'stable' as const
      });
    });

    // Calculate production and consumption
    this.chain.links.forEach(link => {
      const resourceBalance = balance.get(link.data.resourceType);
      if (!resourceBalance) return;

      if (link.type === 'output') {
        resourceBalance.production += link.data.rate;
      } else if (link.type === 'input') {
        resourceBalance.consumption += link.data.rate;
      }
    });

    // Calculate net and trend
    balance.forEach((data, resourceType) => {
      data.net = data.production - data.consumption;
      
      // Simple trend calculation (TODO: Implement historical tracking)
      if (data.net > 0.1 * data.production) {
        data.trend = 'increasing';
      } else if (data.net < -0.1 * data.production) {
        data.trend = 'decreasing';
      } else {
        data.trend = 'stable';
      }
    });

    return balance;
  }

  // Start realtime updates
  private startRealtimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = window.setInterval(() => {
      this.updateChain();
    }, this.settings.updateInterval);
  }

  // Stop realtime updates
  private stopRealtimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Update chain with latest data
  private updateChain(): void {
    // Update node statuses and rates
    this.updateNodeStates();
    
    // Update link utilization
    this.updateLinkUtilization();
    
    // Update metrics
    this.updateMetrics();
  }

  // Update node states
  private updateNodeStates(): void {
    // Update facility nodes
    const facilities = conversionEngine.getAllFacilities();
    facilities.forEach(facility => {
      const nodeId = `facility_${facility.id}`;
      const node = this.chain.nodes.get(nodeId);
      if (node) {
        node.status = facility.isActive ? 'active' : 'idle';
        node.data.efficiency = facility.efficiency * (1 + facility.level * 0.1);
      }
    });

    // Update conversion nodes
    const activeConversions = conversionEngine.getActiveConversions();
    const activeIds = new Set(activeConversions.map(c => `conversion_${c.id}`));
    
    this.chain.nodes.forEach(node => {
      if (node.type === 'conversion') {
        node.status = activeIds.has(node.id) ? 'active' : 'idle';
      }
    });
  }

  // Update link utilization
  private updateLinkUtilization(): void {
    // Simple utilization calculation based on available resources
    this.chain.links.forEach(link => {
      if (link.type === 'input') {
        const sourceNode = this.chain.nodes.get(link.source);
        if (sourceNode && sourceNode.data.rate) {
          link.data.utilization = Math.min(1, sourceNode.data.rate / link.data.rate);
        }
      }
    });
  }

  // Create empty metrics
  private createEmptyMetrics(): ChainMetrics {
    return {
      totalInput: new Map(),
      totalOutput: new Map(),
      efficiency: 1,
      bottlenecks: [],
      suggestions: [],
      lastUpdate: Date.now()
    };
  }

  // Public API

  // Get current chain
  public getChain(): ProductionChain {
    return this.chain;
  }

  // Get current settings
  public getSettings(): VisualizerSettings {
    return { ...this.settings };
  }

  // Update settings
  public updateSettings(settings: Partial<VisualizerSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    // Handle update interval change
    if (settings.updateInterval !== undefined) {
      this.stopRealtimeUpdates();
      this.startRealtimeUpdates();
    }
  }

  // Apply filter
  public applyFilter(filter: ChainFilter): void {
    // TODO: Implement filtering logic
    console.log('[PRODUCTION_CHAIN] Applying filter:', filter);
  }

  // Change layout algorithm
  public setLayout(algorithm: LayoutAlgorithm): void {
    // TODO: Implement layout algorithms
    console.log('[PRODUCTION_CHAIN] Setting layout:', algorithm);
  }

  // Apply optimization suggestion
  public applySuggestion(suggestion: OptimizationSuggestion): void {
    console.log('[PRODUCTION_CHAIN] Applying suggestion:', suggestion.id);
    
    if (suggestion.action) {
      suggestion.action();
    }
    
    // Rebuild chain after applying suggestion
    this.buildChainFromCurrentState();
  }

  // Cleanup
  public destroy(): void {
    this.stopRealtimeUpdates();
    this.chain.nodes.clear();
    this.chain.links.clear();
  }
}

// Global instance
export const productionChainVisualizer = new ProductionChainVisualizer();