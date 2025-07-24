// Production Chain Visualizer Types

import { ResourceType, QualityTier, ConversionRecipe } from '../resourceSystem.js';

// Node types in the production chain graph
export type ChainNodeType = 'resource' | 'conversion' | 'facility' | 'sink' | 'source';

// Production chain node
export interface ChainNode {
  id: string;
  type: ChainNodeType;
  label: string;
  icon?: string;
  position: { x: number; y: number };
  data: {
    resourceType?: ResourceType;
    recipeId?: string;
    facilityId?: string;
    amount?: number;
    rate?: number; // per minute
    quality?: QualityTier;
    efficiency?: number;
  };
  status?: 'active' | 'idle' | 'bottleneck' | 'overflow';
}

// Connection between nodes
export interface ChainLink {
  id: string;
  source: string; // node id
  target: string; // node id
  type: 'input' | 'output' | 'byproduct' | 'waste';
  data: {
    resourceType: ResourceType;
    amount: number;
    rate: number; // per minute
    quality: QualityTier;
    utilization: number; // 0-1
  };
  status?: 'optimal' | 'underutilized' | 'bottleneck' | 'blocked';
}

// Production chain graph
export interface ProductionChain {
  nodes: Map<string, ChainNode>;
  links: Map<string, ChainLink>;
  metrics: ChainMetrics;
}

// Chain performance metrics
export interface ChainMetrics {
  totalInput: Map<ResourceType, number>;
  totalOutput: Map<ResourceType, number>;
  efficiency: number; // 0-1
  bottlenecks: string[]; // node ids
  suggestions: OptimizationSuggestion[];
  lastUpdate: number;
}

// Optimization suggestions
export interface OptimizationSuggestion {
  id: string;
  type: 'add_facility' | 'upgrade_facility' | 'adjust_ratio' | 'add_storage' | 'change_recipe';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: {
    resourceType: ResourceType;
    currentRate: number;
    projectedRate: number;
    improvementPercent: number;
  };
  action?: () => void;
}

// Visualizer display modes
export enum VisualizerMode {
  SIMPLE = 'simple',        // Basic flow view
  DETAILED = 'detailed',    // All metrics visible
  EFFICIENCY = 'efficiency', // Heat map by efficiency
  BOTTLENECK = 'bottleneck', // Highlight bottlenecks
  QUALITY = 'quality'       // Quality flow visualization
}

// Visualizer settings
export interface VisualizerSettings {
  mode: VisualizerMode;
  showRates: boolean;
  showQuality: boolean;
  showEfficiency: boolean;
  autoLayout: boolean;
  animateFlow: boolean;
  highlightBottlenecks: boolean;
  updateInterval: number; // milliseconds
}

// Filter options
export interface ChainFilter {
  resourceTypes?: ResourceType[];
  recipeIds?: string[];
  facilityIds?: string[];
  minEfficiency?: number;
  showInactive?: boolean;
}

// Layout algorithms
export type LayoutAlgorithm = 'hierarchical' | 'force' | 'circular' | 'grid';

// Node group for collapsible sections
export interface NodeGroup {
  id: string;
  label: string;
  nodeIds: string[];
  collapsed: boolean;
  position: { x: number; y: number };
}

// Production chain analysis
export interface ChainAnalysis {
  criticalPath: string[]; // Node ids forming the critical path
  redundantNodes: string[]; // Nodes that can be removed
  underutilizedLinks: string[]; // Links below 50% utilization
  qualityBottlenecks: Map<string, QualityTier>; // Node id -> limiting quality
  resourceBalance: Map<ResourceType, {
    production: number;
    consumption: number;
    net: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
}

// Export/Import format for sharing chains
export interface ChainExport {
  version: string;
  name: string;
  description: string;
  chain: {
    nodes: Array<Omit<ChainNode, 'position'> & { position?: { x: number; y: number } }>;
    links: Array<Omit<ChainLink, 'id'>>;
  };
  metadata: {
    created: number;
    modified: number;
    author?: string;
    tags?: string[];
  };
}

// Events emitted by the visualizer
export interface VisualizerEvents {
  nodeClick: (node: ChainNode) => void;
  linkClick: (link: ChainLink) => void;
  nodeHover: (node: ChainNode | null) => void;
  linkHover: (link: ChainLink | null) => void;
  layoutChange: (layout: LayoutAlgorithm) => void;
  modeChange: (mode: VisualizerMode) => void;
  suggestionApply: (suggestion: OptimizationSuggestion) => void;
}