// Research Tree Layout Engine - Handles positioning and layout algorithms

import {
  ResearchTreeNode,
  ResearchTreeEdge,
  TreePosition,
  TreeLayoutConfig,
  LayoutAlgorithm,
  CategoryGroup
} from '../types/researchTree.js';

export class ResearchTreeLayout {
  private config: TreeLayoutConfig;

  constructor(config: TreeLayoutConfig) {
    this.config = config;
  }

  // Apply layout algorithm to nodes
  public layoutNodes(
    nodes: Map<string, ResearchTreeNode>,
    edges: Map<string, ResearchTreeEdge>,
    categories: Map<string, CategoryGroup>
  ): void {
    switch (this.config.layoutAlgorithm) {
      case LayoutAlgorithm.HIERARCHICAL:
        this.hierarchicalLayout(nodes, edges);
        break;
      case LayoutAlgorithm.RADIAL:
        this.radialLayout(nodes, edges);
        break;
      case LayoutAlgorithm.CATEGORY:
        this.categoryLayout(nodes, edges, categories);
        break;
      case LayoutAlgorithm.FORCE:
        this.forceDirectedLayout(nodes, edges);
        break;
      default:
        this.hierarchicalLayout(nodes, edges);
    }
  }

  // Hierarchical tree layout (top-down)
  private hierarchicalLayout(
    nodes: Map<string, ResearchTreeNode>,
    edges: Map<string, ResearchTreeEdge>
  ): void {
    // Group nodes by depth
    const depthGroups = new Map<number, ResearchTreeNode[]>();
    let maxDepth = 0;

    nodes.forEach(node => {
      const depth = node.position.depth;
      maxDepth = Math.max(maxDepth, depth);
      
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(node);
    });

    // Position nodes level by level
    for (let depth = 0; depth <= maxDepth; depth++) {
      const nodesAtDepth = depthGroups.get(depth) || [];
      
      // Sort nodes by category and parent position
      nodesAtDepth.sort((a, b) => {
        // First by category
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        
        // Then by average parent position
        const aParentX = this.getAverageParentX(a, nodes);
        const bParentX = this.getAverageParentX(b, nodes);
        return aParentX - bParentX;
      });

      // Calculate total width needed
      const totalWidth = nodesAtDepth.length * this.config.nodeWidth + 
                        (nodesAtDepth.length - 1) * this.config.horizontalSpacing;
      
      // Position nodes horizontally
      let currentX = -totalWidth / 2;
      nodesAtDepth.forEach(node => {
        node.position.x = currentX + this.config.nodeWidth / 2;
        node.position.y = depth * (this.config.nodeHeight + this.config.verticalSpacing);
        currentX += this.config.nodeWidth + this.config.horizontalSpacing;
      });
    }

    // Fine-tune positions to minimize edge crossings
    this.minimizeEdgeCrossings(nodes, edges);
  }

  // Radial layout (circular)
  private radialLayout(
    nodes: Map<string, ResearchTreeNode>,
    edges: Map<string, ResearchTreeEdge>
  ): void {
    const centerX = 0;
    const centerY = 0;
    const radiusIncrement = 200;

    // Group by depth (distance from center)
    const depthGroups = new Map<number, ResearchTreeNode[]>();
    let maxDepth = 0;

    nodes.forEach(node => {
      const depth = node.position.depth;
      maxDepth = Math.max(maxDepth, depth);
      
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(node);
    });

    // Position root nodes at center
    const rootNodes = depthGroups.get(0) || [];
    if (rootNodes.length === 1) {
      rootNodes[0].position.x = centerX;
      rootNodes[0].position.y = centerY;
    } else {
      // Arrange root nodes in a small circle
      rootNodes.forEach((node, index) => {
        const angle = (index / rootNodes.length) * 2 * Math.PI;
        node.position.x = centerX + 50 * Math.cos(angle);
        node.position.y = centerY + 50 * Math.sin(angle);
      });
    }

    // Position other nodes in concentric circles
    for (let depth = 1; depth <= maxDepth; depth++) {
      const nodesAtDepth = depthGroups.get(depth) || [];
      const radius = depth * radiusIncrement;
      
      // Group nodes by their parent sector
      const sectors = this.groupNodesBySector(nodesAtDepth, nodes);
      
      sectors.forEach(sector => {
        const angleRange = sector.angleEnd - sector.angleStart;
        const angleIncrement = angleRange / (sector.nodes.length + 1);
        
        sector.nodes.forEach((node, index) => {
          const angle = sector.angleStart + (index + 1) * angleIncrement;
          node.position.x = centerX + radius * Math.cos(angle);
          node.position.y = centerY + radius * Math.sin(angle);
        });
      });
    }
  }

  // Category-based layout
  private categoryLayout(
    nodes: Map<string, ResearchTreeNode>,
    edges: Map<string, ResearchTreeEdge>,
    categories: Map<string, CategoryGroup>
  ): void {
    const categoryWidth = 400;
    const categoryHeight = 600;
    const categoriesPerRow = 3;
    
    let categoryIndex = 0;
    
    categories.forEach((category, categoryId) => {
      const row = Math.floor(categoryIndex / categoriesPerRow);
      const col = categoryIndex % categoriesPerRow;
      
      const baseX = col * (categoryWidth + this.config.categorySpacing) - 
                    (categoriesPerRow * categoryWidth / 2);
      const baseY = row * (categoryHeight + this.config.categorySpacing);
      
      // Update category bounds
      category.bounds = {
        x: baseX,
        y: baseY,
        width: categoryWidth,
        height: categoryHeight
      };
      
      // Get nodes in this category
      const categoryNodes = category.nodes
        .map(nodeId => nodes.get(nodeId))
        .filter(node => node !== undefined) as ResearchTreeNode[];
      
      // Sort by depth
      categoryNodes.sort((a, b) => a.position.depth - b.position.depth);
      
      // Layout nodes within category
      this.layoutNodesInCategory(categoryNodes, baseX, baseY, categoryWidth, categoryHeight);
      
      categoryIndex++;
    });
  }

  // Force-directed layout
  private forceDirectedLayout(
    nodes: Map<string, ResearchTreeNode>,
    edges: Map<string, ResearchTreeEdge>
  ): void {
    // Initialize random positions
    nodes.forEach(node => {
      node.position.x = (Math.random() - 0.5) * 1000;
      node.position.y = (Math.random() - 0.5) * 1000;
    });

    // Simulation parameters
    const iterations = 100;
    const attractionStrength = 0.01;
    const repulsionStrength = 1000;
    const damping = 0.9;

    // Run simulation
    for (let i = 0; i < iterations; i++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Initialize forces
      nodes.forEach((_, id) => {
        forces.set(id, { x: 0, y: 0 });
      });

      // Repulsion between all nodes
      const nodeArray = Array.from(nodes.values());
      for (let j = 0; j < nodeArray.length; j++) {
        for (let k = j + 1; k < nodeArray.length; k++) {
          const node1 = nodeArray[j];
          const node2 = nodeArray[k];
          
          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = repulsionStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          forces.get(node1.id)!.x -= fx;
          forces.get(node1.id)!.y -= fy;
          forces.get(node2.id)!.x += fx;
          forces.get(node2.id)!.y += fy;
        }
      }

      // Attraction along edges
      edges.forEach(edge => {
        const source = nodes.get(edge.source);
        const target = nodes.get(edge.target);
        
        if (source && target) {
          const dx = target.position.x - source.position.x;
          const dy = target.position.y - source.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = distance * attractionStrength;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          forces.get(source.id)!.x += fx;
          forces.get(source.id)!.y += fy;
          forces.get(target.id)!.x -= fx;
          forces.get(target.id)!.y -= fy;
        }
      });

      // Apply forces with damping
      nodes.forEach(node => {
        const force = forces.get(node.id)!;
        node.position.x += force.x * damping;
        node.position.y += force.y * damping;
      });
    }

    // Center the graph
    this.centerGraph(nodes);
  }

  // Helper: Get average X position of parent nodes
  private getAverageParentX(node: ResearchTreeNode, allNodes: Map<string, ResearchTreeNode>): number {
    if (node.parents.length === 0) return 0;
    
    let totalX = 0;
    let count = 0;
    
    node.parents.forEach(parentId => {
      const parent = allNodes.get(parentId);
      if (parent) {
        totalX += parent.position.x;
        count++;
      }
    });
    
    return count > 0 ? totalX / count : 0;
  }

  // Helper: Group nodes by their parent sector for radial layout
  private groupNodesBySector(
    nodes: ResearchTreeNode[],
    allNodes: Map<string, ResearchTreeNode>
  ): Array<{ nodes: ResearchTreeNode[]; angleStart: number; angleEnd: number }> {
    const sectors: Map<string, ResearchTreeNode[]> = new Map();
    
    // Group by primary parent
    nodes.forEach(node => {
      const primaryParent = node.parents[0] || 'root';
      if (!sectors.has(primaryParent)) {
        sectors.set(primaryParent, []);
      }
      sectors.get(primaryParent)!.push(node);
    });

    // Convert to sector objects with angle ranges
    const sectorArray: Array<{ nodes: ResearchTreeNode[]; angleStart: number; angleEnd: number }> = [];
    const anglePerSector = (2 * Math.PI) / sectors.size;
    let currentAngle = 0;
    
    sectors.forEach((sectorNodes) => {
      sectorArray.push({
        nodes: sectorNodes,
        angleStart: currentAngle,
        angleEnd: currentAngle + anglePerSector
      });
      currentAngle += anglePerSector;
    });
    
    return sectorArray;
  }

  // Helper: Layout nodes within a category box
  private layoutNodesInCategory(
    nodes: ResearchTreeNode[],
    baseX: number,
    baseY: number,
    width: number,
    height: number
  ): void {
    if (nodes.length === 0) return;

    // Group by depth within category
    const depthGroups = new Map<number, ResearchTreeNode[]>();
    let maxDepth = 0;
    let minDepth = Infinity;
    
    nodes.forEach(node => {
      const depth = node.position.depth;
      maxDepth = Math.max(maxDepth, depth);
      minDepth = Math.min(minDepth, depth);
      
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(node);
    });

    const depthCount = maxDepth - minDepth + 1;
    const levelHeight = height / (depthCount + 1);
    
    for (let depth = minDepth; depth <= maxDepth; depth++) {
      const nodesAtDepth = depthGroups.get(depth) || [];
      const nodeCount = nodesAtDepth.length;
      const nodeSpacing = width / (nodeCount + 1);
      
      nodesAtDepth.forEach((node, index) => {
        node.position.x = baseX + (index + 1) * nodeSpacing;
        node.position.y = baseY + (depth - minDepth + 1) * levelHeight;
      });
    }
  }

  // Helper: Minimize edge crossings by reordering nodes
  private minimizeEdgeCrossings(
    nodes: Map<string, ResearchTreeNode>,
    edges: Map<string, ResearchTreeEdge>
  ): void {
    // Simple barycentric method: position nodes at average of connected nodes
    for (let iteration = 0; iteration < 3; iteration++) {
      nodes.forEach(node => {
        if (node.position.depth === 0) return; // Don't move root nodes
        
        let sumX = 0;
        let count = 0;
        
        // Average position of parents
        node.parents.forEach(parentId => {
          const parent = nodes.get(parentId);
          if (parent) {
            sumX += parent.position.x;
            count++;
          }
        });
        
        // Average position of children
        node.children.forEach(childId => {
          const child = nodes.get(childId);
          if (child) {
            sumX += child.position.x;
            count++;
          }
        });
        
        if (count > 0) {
          node.position.x = sumX / count;
        }
      });
    }
  }

  // Helper: Center the graph around origin
  private centerGraph(nodes: Map<string, ResearchTreeNode>): void {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    nodes.forEach(node => {
      node.position.x -= centerX;
      node.position.y -= centerY;
    });
  }

  // Update configuration
  public updateConfig(config: Partial<TreeLayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  public getConfig(): TreeLayoutConfig {
    return { ...this.config };
  }
}