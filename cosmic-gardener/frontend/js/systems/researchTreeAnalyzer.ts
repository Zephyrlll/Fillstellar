// Research Tree Analyzer - Analyzes research dependencies and generates tree structure

import {
  ResearchTreeNode,
  ResearchTreeEdge,
  ResearchNodeState,
  EdgeType,
  TreePosition,
  ResearchPath,
  TreeAnalysis,
  ResearchTreeState,
  CategoryGroup
} from '../types/researchTree.js';
import { ResearchItem, ResearchState, isResearchAvailable, canAffordResearch, isResearchCompleted } from '../types/research.js';
import { allResearchItems, researchCategories } from '../researchData.js';
import { gameState, gameStateManager } from '../state.js';

export class ResearchTreeAnalyzer {
  private nodes: Map<string, ResearchTreeNode> = new Map();
  private edges: Map<string, ResearchTreeEdge> = new Map();
  private categoryGroups: Map<string, CategoryGroup> = new Map();
  private depthMap: Map<string, number> = new Map();

  constructor() {
    this.buildTree();
  }

  // Build the research tree structure
  private buildTree(): void {
    // First pass: Create all nodes
    allResearchItems.forEach(item => {
      const node: ResearchTreeNode = {
        id: item.id,
        item: item,
        position: { x: 0, y: 0, depth: 0 }, // Will be calculated later
        category: item.category,
        state: ResearchNodeState.LOCKED, // Will be updated
        children: [],
        parents: item.requirements || [],
        isVisible: true,
        isHighlighted: false
      };
      this.nodes.set(item.id, node);
    });

    // Second pass: Build parent-child relationships and edges
    let edgeId = 0;
    allResearchItems.forEach(item => {
      const node = this.nodes.get(item.id);
      if (!node) return;

      // Create edges for prerequisites
      item.requirements.forEach(reqId => {
        const parentNode = this.nodes.get(reqId);
        if (parentNode) {
          parentNode.children.push(item.id);
          
          const edge: ResearchTreeEdge = {
            id: `edge_${edgeId++}`,
            source: reqId,
            target: item.id,
            type: EdgeType.PREREQUISITE,
            isHighlighted: false
          };
          this.edges.set(edge.id, edge);
        }
      });

      // Create edges for unlocks
      item.unlocks.forEach(unlockId => {
        const edge: ResearchTreeEdge = {
          id: `edge_${edgeId++}`,
          source: item.id,
          target: unlockId,
          type: EdgeType.UNLOCK,
          isHighlighted: false
        };
        this.edges.set(edge.id, edge);
      });
    });

    // Calculate depths
    this.calculateDepths();

    // Group by categories
    this.groupByCategories();
  }

  // Calculate depth of each node using BFS
  private calculateDepths(): void {
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [];

    // Find root nodes (no prerequisites)
    this.nodes.forEach(node => {
      if (node.parents.length === 0) {
        queue.push({ id: node.id, depth: 0 });
        this.depthMap.set(node.id, 0);
      }
    });

    // BFS to calculate depths
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;

      node.position.depth = depth;

      // Process children
      node.children.forEach(childId => {
        const currentDepth = this.depthMap.get(childId) || Infinity;
        const newDepth = depth + 1;
        
        if (newDepth < currentDepth) {
          this.depthMap.set(childId, newDepth);
          queue.push({ id: childId, depth: newDepth });
        }
      });
    }
  }

  // Group nodes by categories
  private groupByCategories(): void {
    researchCategories.forEach(category => {
      const categoryNodes = Array.from(this.nodes.values())
        .filter(node => node.category === category.id)
        .map(node => node.id);

      if (categoryNodes.length > 0) {
        this.categoryGroups.set(category.id, {
          id: category.id,
          category: category,
          nodes: categoryNodes,
          bounds: { x: 0, y: 0, width: 0, height: 0 } // Will be calculated during layout
        });
      }
    });
  }

  // Update node states based on current game state
  public updateNodeStates(researchState: ResearchState): void {
    const resources = gameState.resources;
    const advancedResources = gameState.advancedResources;

    this.nodes.forEach(node => {
      const item = node.item;
      
      if (isResearchCompleted(item.id, researchState)) {
        node.state = ResearchNodeState.COMPLETED;
      } else if (researchState.activeResearch.has(item.id)) {
        node.state = ResearchNodeState.IN_PROGRESS;
      } else if (isResearchAvailable(item, researchState)) {
        if (canAffordResearch(item, resources, advancedResources)) {
          node.state = ResearchNodeState.AFFORDABLE;
        } else {
          node.state = ResearchNodeState.UNAFFORDABLE;
        }
      } else {
        node.state = ResearchNodeState.LOCKED;
      }
    });
  }

  // Find the shortest path to a target research
  public findPath(targetId: string, researchState: ResearchState): ResearchPath | null {
    const target = this.nodes.get(targetId);
    if (!target || target.state === ResearchNodeState.COMPLETED) {
      return null;
    }

    // Use Dijkstra's algorithm with research costs as weights
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set(this.nodes.keys());

    // Initialize distances
    this.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
    });
    
    // Find all available starting points
    const startNodes = Array.from(this.nodes.values()).filter(
      node => node.state === ResearchNodeState.AFFORDABLE || 
              node.state === ResearchNodeState.COMPLETED
    );
    
    startNodes.forEach(node => {
      distances.set(node.id, 0);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;
      
      unvisited.forEach(id => {
        const dist = distances.get(id)!;
        if (dist < minDistance) {
          minDistance = dist;
          current = id;
        }
      });

      if (!current || minDistance === Infinity) break;
      if (current === targetId) break;

      unvisited.delete(current);

      // Update distances to neighbors
      const node = this.nodes.get(current)!;
      node.children.forEach(childId => {
        if (!unvisited.has(childId)) return;

        const child = this.nodes.get(childId)!;
        const cost = this.calculateResearchCost(child.item);
        const alt = distances.get(current)! + cost;

        if (alt < distances.get(childId)!) {
          distances.set(childId, alt);
          previous.set(childId, current);
        }
      });
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = targetId;
    
    while (current && previous.has(current)) {
      const node = this.nodes.get(current)!;
      if (node.state !== ResearchNodeState.COMPLETED) {
        path.unshift(current);
      }
      current = previous.get(current)!;
    }

    if (path.length === 0) return null;

    // Calculate total cost
    const totalCost: { [resource: string]: number } = {};
    let estimatedTime = 0;

    path.forEach(nodeId => {
      const node = this.nodes.get(nodeId)!;
      const cost = node.item.cost;
      
      Object.entries(cost).forEach(([resource, amount]) => {
        if (amount) {
          totalCost[resource] = (totalCost[resource] || 0) + amount;
        }
      });
      
      estimatedTime += node.item.duration || 60; // Default 60 seconds
    });

    return {
      targetId,
      path,
      totalCost,
      estimatedTime,
      efficiency: this.calculatePathEfficiency(path)
    };
  }

  // Calculate a simple cost metric for pathfinding
  private calculateResearchCost(item: ResearchItem): number {
    let cost = 0;
    
    // Basic resources have different weights
    cost += (item.cost.darkMatter || 0) * 10;
    cost += (item.cost.thoughtPoints || 0) * 5;
    cost += (item.cost.energy || 0) * 1;
    cost += (item.cost.cosmicDust || 0) * 0.5;
    
    // Advanced resources are more expensive
    const advancedCosts = Object.keys(item.cost)
      .filter(key => !['darkMatter', 'thoughtPoints', 'energy', 'cosmicDust'].includes(key))
      .reduce((sum, key) => sum + (item.cost[key] || 0) * 20, 0);
    
    cost += advancedCosts;
    
    return cost + 100; // Base cost for each research
  }

  // Calculate path efficiency based on synergies and redundancies
  private calculatePathEfficiency(path: string[]): number {
    if (path.length === 0) return 1;

    let efficiency = 1.0;
    const categories = new Set<string>();
    
    path.forEach(nodeId => {
      const node = this.nodes.get(nodeId);
      if (node) {
        categories.add(node.category);
      }
    });

    // Penalty for switching between categories too often
    efficiency -= (categories.size - 1) * 0.1;

    // Bonus for staying within related categories
    if (categories.size === 1) {
      efficiency += 0.2;
    }

    return Math.max(0.1, Math.min(1.0, efficiency));
  }

  // Analyze the entire tree
  public analyzeTree(researchState: ResearchState): TreeAnalysis {
    const analysis: TreeAnalysis = {
      totalNodes: this.nodes.size,
      completedNodes: 0,
      availableNodes: 0,
      lockedNodes: 0,
      maxDepth: 0,
      criticalPaths: [],
      bottlenecks: [],
      categoryDistribution: new Map()
    };

    // Count node states and find max depth
    this.nodes.forEach(node => {
      switch (node.state) {
        case ResearchNodeState.COMPLETED:
          analysis.completedNodes++;
          break;
        case ResearchNodeState.AFFORDABLE:
        case ResearchNodeState.UNAFFORDABLE:
          analysis.availableNodes++;
          break;
        case ResearchNodeState.LOCKED:
          analysis.lockedNodes++;
          break;
      }

      analysis.maxDepth = Math.max(analysis.maxDepth, node.position.depth);

      // Update category distribution
      const count = analysis.categoryDistribution.get(node.category) || 0;
      analysis.categoryDistribution.set(node.category, count + 1);
    });

    // Find bottlenecks (nodes that block many others)
    this.nodes.forEach(node => {
      if (node.state !== ResearchNodeState.COMPLETED && node.children.length > 3) {
        analysis.bottlenecks.push(node.id);
      }
    });

    // Find critical paths to key technologies
    const keyTechnologies = [
      'stellar_genesis',
      'black_hole_theory',
      'multiverse_theory',
      'dyson_sphere',
      'cosmic_consciousness'
    ];

    keyTechnologies.forEach(techId => {
      const path = this.findPath(techId, researchState);
      if (path) {
        analysis.criticalPaths.push(path);
      }
    });

    return analysis;
  }

  // Get nodes grouped by depth for hierarchical layout
  public getNodesByDepth(): Map<number, ResearchTreeNode[]> {
    const depthGroups = new Map<number, ResearchTreeNode[]>();
    
    this.nodes.forEach(node => {
      const depth = node.position.depth;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(node);
    });

    return depthGroups;
  }

  // Find all nodes connected to a given node
  public getConnectedNodes(nodeId: string): Set<string> {
    const connected = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (connected.has(current)) continue;
      
      connected.add(current);
      
      const node = this.nodes.get(current);
      if (node) {
        // Add parents and children
        [...node.parents, ...node.children].forEach(id => {
          if (!connected.has(id)) {
            queue.push(id);
          }
        });
      }
    }

    return connected;
  }

  // Export current state
  public getTreeState(): ResearchTreeState {
    return {
      nodes: new Map(this.nodes),
      edges: new Map(this.edges),
      layout: {
        nodeWidth: 120,
        nodeHeight: 80,
        horizontalSpacing: 150,
        verticalSpacing: 100,
        categorySpacing: 50,
        layoutAlgorithm: 'hierarchical' as any
      },
      settings: {
        showCompleted: true,
        showLocked: true,
        showCosts: true,
        showEffects: false,
        showCategories: true,
        highlightPath: true,
        animateTransitions: true,
        zoomLevel: 1,
        panOffset: { x: 0, y: 0 }
      },
      filters: {},
      selectedNode: null,
      hoveredNode: null,
      highlightedPath: null
    };
  }

  // Get all nodes
  public getNodes(): Map<string, ResearchTreeNode> {
    return new Map(this.nodes);
  }

  // Get all edges
  public getEdges(): Map<string, ResearchTreeEdge> {
    return new Map(this.edges);
  }

  // Get category groups
  public getCategoryGroups(): Map<string, CategoryGroup> {
    return new Map(this.categoryGroups);
  }
}

// Global instance
export const researchTreeAnalyzer = new ResearchTreeAnalyzer();