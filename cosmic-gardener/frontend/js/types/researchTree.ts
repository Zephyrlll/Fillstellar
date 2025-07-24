// Research Tree Visualizer Types

import { ResearchItem, ResearchCategory } from './research.js';

// Node position in the tree
export interface TreePosition {
  x: number;
  y: number;
  depth: number; // Distance from root nodes
}

// Tree node representing a research item
export interface ResearchTreeNode {
  id: string;
  item: ResearchItem;
  position: TreePosition;
  category: string;
  state: ResearchNodeState;
  children: string[]; // IDs of dependent research
  parents: string[]; // IDs of prerequisite research
  isVisible: boolean;
  isHighlighted: boolean;
}

// Node visual states
export enum ResearchNodeState {
  COMPLETED = 'completed',      // Research completed
  AVAILABLE = 'available',      // Can be researched now
  AFFORDABLE = 'affordable',    // Prerequisites met, resources available
  UNAFFORDABLE = 'unaffordable', // Prerequisites met, but not enough resources
  LOCKED = 'locked',           // Prerequisites not met
  IN_PROGRESS = 'in_progress'  // Currently being researched
}

// Edge between nodes
export interface ResearchTreeEdge {
  id: string;
  source: string; // Parent node ID
  target: string; // Child node ID
  type: EdgeType;
  isHighlighted: boolean;
}

export enum EdgeType {
  PREREQUISITE = 'prerequisite',  // Normal dependency
  UNLOCK = 'unlock',             // Unlocks feature/content
  SYNERGY = 'synergy'           // Bonus when combined
}

// Tree layout configuration
export interface TreeLayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  categorySpacing: number;
  layoutAlgorithm: LayoutAlgorithm;
}

export enum LayoutAlgorithm {
  HIERARCHICAL = 'hierarchical',  // Top-down tree
  RADIAL = 'radial',             // Circular layout
  FORCE = 'force',               // Force-directed
  DAGRE = 'dagre',               // Directed acyclic graph
  CATEGORY = 'category'          // Grouped by category
}

// Tree visualization settings
export interface TreeVisualizationSettings {
  showCompleted: boolean;
  showLocked: boolean;
  showCosts: boolean;
  showEffects: boolean;
  showCategories: boolean;
  highlightPath: boolean;
  animateTransitions: boolean;
  zoomLevel: number;
  panOffset: { x: number; y: number };
}

// Filter and search options
export interface TreeFilterOptions {
  categories?: string[];
  states?: ResearchNodeState[];
  searchQuery?: string;
  minDepth?: number;
  maxDepth?: number;
}

// Research path (sequence of research to reach a goal)
export interface ResearchPath {
  targetId: string;
  path: string[]; // Ordered list of research IDs
  totalCost: {
    [resource: string]: number;
  };
  estimatedTime: number; // In game time units
  efficiency: number; // 0-1, based on redundancy and synergies
}

// Tree analysis results
export interface TreeAnalysis {
  totalNodes: number;
  completedNodes: number;
  availableNodes: number;
  lockedNodes: number;
  maxDepth: number;
  criticalPaths: ResearchPath[]; // Paths to key technologies
  bottlenecks: string[]; // Research items blocking many others
  categoryDistribution: Map<string, number>;
}

// Node interaction events
export interface TreeNodeEvent {
  nodeId: string;
  type: 'click' | 'hover' | 'doubleclick' | 'rightclick';
  position: { x: number; y: number };
}

// Tree state for visualization
export interface ResearchTreeState {
  nodes: Map<string, ResearchTreeNode>;
  edges: Map<string, ResearchTreeEdge>;
  layout: TreeLayoutConfig;
  settings: TreeVisualizationSettings;
  filters: TreeFilterOptions;
  selectedNode: string | null;
  hoveredNode: string | null;
  highlightedPath: string[] | null;
}

// Category grouping for layout
export interface CategoryGroup {
  id: string;
  category: ResearchCategory;
  nodes: string[]; // Node IDs in this category
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Export format for saving/sharing tree layouts
export interface TreeExport {
  version: string;
  name: string;
  description: string;
  layout: TreeLayoutConfig;
  customPositions?: Map<string, TreePosition>; // Manual position overrides
  metadata: {
    created: number;
    modified: number;
    author?: string;
  };
}

// Animation state for smooth transitions
export interface TreeAnimation {
  nodeId: string;
  property: 'position' | 'scale' | 'opacity' | 'color';
  from: any;
  to: any;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  startTime: number;
}

// Tooltip data for nodes
export interface NodeTooltip {
  nodeId: string;
  title: string;
  description: string;
  cost: string;
  effects: string[];
  prerequisites: string[];
  unlocks: string[];
  state: ResearchNodeState;
  completionPercentage?: number;
}