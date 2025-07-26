// Research Tree Visualizer UI Implementation

import { researchTreeAnalyzer } from './researchTreeAnalyzer.js';
import { ResearchTreeLayout } from './researchTreeLayout.js';
import {
  ResearchTreeNode,
  ResearchTreeEdge,
  ResearchNodeState,
  TreeVisualizationSettings,
  LayoutAlgorithm,
  TreeNodeEvent,
  NodeTooltip,
  ResearchPath
} from '../types/researchTree.js';
import { ResearchState } from '../types/research.js';
import { RESOURCE_METADATA } from '../resourceSystem.js';
import { showMessage } from '../ui.js';
import { gameState, gameStateManager } from '../state.js';
import { getResearchLabUI } from '../researchLab.js';

export class ResearchTreeVisualizerUI {
  private overlay: HTMLElement;
  private graphContainer: HTMLElement;
  private svg: SVGElement | null = null;
  private isOpen: boolean = false;
  private selectedNode: ResearchTreeNode | null = null;
  private hoveredNode: ResearchTreeNode | null = null;
  private highlightedPath: string[] = [];
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private layout: ResearchTreeLayout;
  private settings: TreeVisualizationSettings;
  private nodeElements: Map<string, SVGGElement> = new Map();
  private edgeElements: Map<string, SVGPathElement> = new Map();

  constructor() {
    const overlay = document.getElementById('research-tree-overlay');
    const graphContainer = document.getElementById('research-tree-graph');
    
    if (!overlay || !graphContainer) {
      throw new Error('[RESEARCH_TREE_UI] Required DOM elements not found');
    }
    
    this.overlay = overlay;
    this.graphContainer = graphContainer;
    
    // Initialize layout engine
    this.layout = new ResearchTreeLayout({
      nodeWidth: 120,
      nodeHeight: 80,
      horizontalSpacing: 150,
      verticalSpacing: 120,
      categorySpacing: 50,
      layoutAlgorithm: LayoutAlgorithm.HIERARCHICAL
    });

    // Initialize settings
    this.settings = {
      showCompleted: true,
      showLocked: true,
      showCosts: true,
      showEffects: false,
      showCategories: true,
      highlightPath: true,
      animateTransitions: true,
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 }
    };
    
    this.initializeEventListeners();
    this.initializeGraph();
  }

  private initializeEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('researchTreeCloseButton');
    closeBtn?.addEventListener('click', () => this.close());

    // Layout selector
    const layoutSelect = document.getElementById('tree-layout-select') as HTMLSelectElement;
    layoutSelect?.addEventListener('change', (e) => {
      const layout = (e.target as HTMLSelectElement).value as LayoutAlgorithm;
      this.layout.updateConfig({ layoutAlgorithm: layout });
      this.updateLayout();
    });

    // Filter checkboxes
    const showCompletedCheckbox = document.getElementById('show-completed-checkbox') as HTMLInputElement;
    showCompletedCheckbox?.addEventListener('change', (e) => {
      this.settings.showCompleted = e.target.checked;
      this.updateVisibility();
    });

    const showLockedCheckbox = document.getElementById('show-locked-checkbox') as HTMLInputElement;
    showLockedCheckbox?.addEventListener('change', (e) => {
      this.settings.showLocked = e.target.checked;
      this.updateVisibility();
    });

    const showCostsCheckbox = document.getElementById('show-costs-checkbox') as HTMLInputElement;
    showCostsCheckbox?.addEventListener('change', (e) => {
      this.settings.showCosts = e.target.checked;
      this.updateGraph();
    });

    // Action buttons
    document.getElementById('center-tree-btn')?.addEventListener('click', () => {
      this.centerView();
    });

    document.getElementById('find-path-btn')?.addEventListener('click', () => {
      this.showPathFinder();
    });

    document.getElementById('tree-stats-btn')?.addEventListener('click', () => {
      this.showTreeStats();
    });

    // Search input
    const searchInput = document.getElementById('tree-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchNodes((e.target as HTMLInputElement).value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isOpen) {
        if (e.key === 'Escape') {
          this.close();
        } else if (e.key === 'f' && e.ctrlKey) {
          e.preventDefault();
          searchInput?.focus();
        }
      }
    });
  }

  private initializeGraph(): void {
    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.cursor = 'grab';
    
    // Add zoom and pan capabilities
    this.setupZoomPan();
    
    this.graphContainer.appendChild(this.svg);
  }

  private setupZoomPan(): void {
    if (!this.svg) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;

    // Mouse wheel zoom
    this.graphContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const oldZoom = this.zoom;
      this.zoom *= delta;
      this.zoom = Math.max(0.3, Math.min(3, this.zoom));
      
      // Zoom towards mouse position
      const rect = this.graphContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomRatio = this.zoom / oldZoom;
      this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
      this.panY = mouseY - (mouseY - this.panY) * zoomRatio;
      
      this.updateTransform();
      this.updateZoomDisplay();
    });

    // Mouse pan
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg || (e.target as Element).classList.contains('tree-background')) {
        isPanning = true;
        startX = e.clientX - this.panX;
        startY = e.clientY - this.panY;
        this.svg!.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isPanning) {
        this.panX = e.clientX - startX;
        this.panY = e.clientY - startY;
        this.updateTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        this.svg!.style.cursor = 'grab';
      }
    });
  }

  private updateTransform(): void {
    if (!this.svg) return;
    const g = this.svg.querySelector('g#tree-main-group');
    if (g) {
      g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }
  }

  private updateZoomDisplay(): void {
    const zoomLevel = document.getElementById('tree-zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  public open(): void {
    if (this.isOpen) return;
    
    console.log('[RESEARCH_TREE_UI] Opening research tree visualizer');
    this.isOpen = true;
    this.overlay.classList.add('active');
    
    // Update node states
    const researchState = this.getResearchState();
    researchTreeAnalyzer.updateNodeStates(researchState);
    
    // Initial render
    this.updateLayout();
    this.updateStats();
    
    // Center view
    setTimeout(() => this.centerView(), 100);
  }

  public close(): void {
    if (!this.isOpen) return;
    
    console.log('[RESEARCH_TREE_UI] Closing research tree visualizer');
    this.isOpen = false;
    this.overlay.classList.remove('active');
  }

  private getResearchState(): ResearchState {
    const state = gameStateManager.getState();
    const completedSet = new Set<string>(state.research?.completedResearch || []);
    const researchSpeed = state.research?.researchSpeedMultiplier || 1;
    
    return {
      completedResearch: completedSet,
      activeResearch: new Map(state.research?.activeResearch || []),
      researchSpeed,
      availableResearch: new Set()
    };
  }

  private updateLayout(): void {
    const nodes = researchTreeAnalyzer.getNodes();
    const edges = researchTreeAnalyzer.getEdges();
    const categories = researchTreeAnalyzer.getCategoryGroups();
    
    // Apply layout algorithm
    this.layout.layoutNodes(nodes, edges, categories);
    
    // Update graph
    this.updateGraph();
  }

  private updateGraph(): void {
    if (!this.svg) return;

    // Clear existing content
    this.svg.innerHTML = '';
    this.nodeElements.clear();
    this.edgeElements.clear();

    // Create main group for transform
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.id = 'tree-main-group';
    this.svg.appendChild(mainGroup);

    // Add background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.classList.add('tree-background');
    background.setAttribute('x', '-5000');
    background.setAttribute('y', '-5000');
    background.setAttribute('width', '10000');
    background.setAttribute('height', '10000');
    background.setAttribute('fill', 'transparent');
    mainGroup.appendChild(background);

    // Add defs for gradients and filters
    const defs = this.createDefs();
    mainGroup.appendChild(defs);

    // Get data
    const nodes = researchTreeAnalyzer.getNodes();
    const edges = researchTreeAnalyzer.getEdges();

    // Create edges first (so they appear behind nodes)
    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.id = 'edges';
    mainGroup.appendChild(edgesGroup);

    edges.forEach(edge => {
      const edgeElement = this.createEdgeElement(edge, nodes);
      if (edgeElement) {
        edgesGroup.appendChild(edgeElement);
        this.edgeElements.set(edge.id, edgeElement);
      }
    });

    // Create nodes
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.id = 'nodes';
    mainGroup.appendChild(nodesGroup);

    nodes.forEach(node => {
      if (this.shouldShowNode(node)) {
        const nodeElement = this.createNodeElement(node);
        nodesGroup.appendChild(nodeElement);
        this.nodeElements.set(node.id, nodeElement);
      }
    });

    // Apply transform
    this.updateTransform();
    
    // Update node count
    const nodeCount = document.getElementById('tree-node-count');
    if (nodeCount) {
      nodeCount.textContent = nodes.size.toString();
    }
  }

  private createDefs(): SVGDefsElement {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Category gradients
    const categoryColors: Record<string, string[]> = {
      'fundamental': ['#4169e1', '#1e3a8a'],
      'celestial': ['#10b981', '#047857'],
      'life': ['#8b5cf6', '#6d28d9'],
      'technology': ['#f59e0b', '#d97706'],
      'cosmic': ['#ec4899', '#be185d'],
      'automation': ['#06b6d4', '#0e7490']
    };

    Object.entries(categoryColors).forEach(([category, colors]) => {
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.id = `${category}-gradient`;
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '100%');
      gradient.setAttribute('y2', '100%');
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', colors[0]);
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', colors[1]);
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
    });

    // Glow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = 'glow';
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '3');
    feGaussianBlur.setAttribute('result', 'coloredBlur');
    
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    return defs;
  }

  private createNodeElement(node: ResearchTreeNode): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('research-node', node.state);
    group.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);
    group.setAttribute('data-node-id', node.id);
    
    // Node background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '-60');
    rect.setAttribute('y', '-40');
    rect.setAttribute('width', '120');
    rect.setAttribute('height', '80');
    rect.setAttribute('rx', '10');
    rect.setAttribute('fill', `url(#${node.category}-gradient)`);
    rect.setAttribute('stroke', this.getNodeStrokeColor(node.state));
    rect.setAttribute('stroke-width', '2');
    
    if (node.state === ResearchNodeState.AVAILABLE || node.state === ResearchNodeState.AFFORDABLE) {
      rect.setAttribute('filter', 'url(#glow)');
    }
    
    group.appendChild(rect);

    // Icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', '0');
    icon.setAttribute('y', '-10');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('font-size', '24');
    icon.textContent = node.item.icon || '🔬';
    group.appendChild(icon);

    // Title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', '0');
    title.setAttribute('y', '15');
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('font-size', '12');
    title.setAttribute('fill', '#fff');
    
    // Truncate long titles
    const maxLength = 15;
    const titleText = node.item.name.length > maxLength ? 
      node.item.name.substring(0, maxLength) + '...' : 
      node.item.name;
    title.textContent = titleText;
    group.appendChild(title);

    // Cost display (if enabled)
    if (this.settings.showCosts && node.state !== ResearchNodeState.COMPLETED) {
      const cost = this.getSimplifiedCost(node.item.cost);
      if (cost) {
        const costText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        costText.setAttribute('x', '0');
        costText.setAttribute('y', '30');
        costText.setAttribute('text-anchor', 'middle');
        costText.setAttribute('font-size', '10');
        costText.setAttribute('fill', '#64ffda');
        costText.textContent = cost;
        group.appendChild(costText);
      }
    }

    // State indicator
    if (node.state === ResearchNodeState.COMPLETED) {
      const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      checkmark.setAttribute('x', '45');
      checkmark.setAttribute('y', '-25');
      checkmark.setAttribute('font-size', '16');
      checkmark.textContent = '✓';
      checkmark.setAttribute('fill', '#10b981');
      group.appendChild(checkmark);
    }

    // Event handlers
    group.addEventListener('click', () => this.selectNode(node));
    group.addEventListener('mouseenter', () => this.hoverNode(node));
    group.addEventListener('mouseleave', () => this.unhoverNode());

    return group;
  }

  private createEdgeElement(edge: ResearchTreeEdge, nodes: Map<string, ResearchTreeNode>): SVGPathElement | null {
    const sourceNode = nodes.get(edge.source);
    const targetNode = nodes.get(edge.target);
    
    if (!sourceNode || !targetNode) return null;
    if (!this.shouldShowNode(sourceNode) || !this.shouldShowNode(targetNode)) return null;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('research-edge', edge.type);
    
    // Calculate path using bezier curve
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    
    // Control points for smoother curves
    const cx1 = sourceNode.position.x + dx * 0.3;
    const cy1 = sourceNode.position.y + dy * 0.1;
    const cx2 = targetNode.position.x - dx * 0.3;
    const cy2 = targetNode.position.y - dy * 0.1;
    
    const d = `M ${sourceNode.position.x} ${sourceNode.position.y + 40} 
               C ${cx1} ${cy1}, ${cx2} ${cy2}, 
               ${targetNode.position.x} ${targetNode.position.y - 40}`;
    
    path.setAttribute('d', d);
    
    // Highlight if part of selected path
    if (this.highlightedPath.includes(edge.source) && this.highlightedPath.includes(edge.target)) {
      path.classList.add('highlighted');
    }

    return path;
  }

  private getNodeStrokeColor(state: ResearchNodeState): string {
    switch (state) {
      case ResearchNodeState.COMPLETED: return '#10b981';
      case ResearchNodeState.AFFORDABLE: return '#64ffda';
      case ResearchNodeState.AVAILABLE: return '#3b82f6';
      case ResearchNodeState.UNAFFORDABLE: return '#fbbf24';
      case ResearchNodeState.LOCKED: return '#4a5568';
      case ResearchNodeState.IN_PROGRESS: return '#8b5cf6';
      default: return '#4a5568';
    }
  }

  private getSimplifiedCost(cost: any): string {
    // Show only the primary cost
    if (cost.darkMatter) return `${cost.darkMatter} DM`;
    if (cost.thoughtPoints) return `${cost.thoughtPoints} TP`;
    if (cost.energy) return `${cost.energy} E`;
    return '';
  }

  private shouldShowNode(node: ResearchTreeNode): boolean {
    if (node.state === ResearchNodeState.COMPLETED && !this.settings.showCompleted) return false;
    if (node.state === ResearchNodeState.LOCKED && !this.settings.showLocked) return false;
    return node.isVisible;
  }

  private selectNode(node: ResearchTreeNode): void {
    this.selectedNode = node;
    this.showNodeDetails(node);
    
    // Highlight connected nodes
    if (this.settings.highlightPath) {
      const connected = researchTreeAnalyzer.getConnectedNodes(node.id);
      this.highlightNodes(Array.from(connected));
    }
  }

  private hoverNode(node: ResearchTreeNode): void {
    this.hoveredNode = node;
    // TODO: Show tooltip
  }

  private unhoverNode(): void {
    this.hoveredNode = null;
    // TODO: Hide tooltip
  }

  private showNodeDetails(node: ResearchTreeNode): void {
    // タブビューとオーバーレイビューの両方をサポート
    let detailsPanel = document.getElementById('tree-node-details-tab') || document.getElementById('tree-node-details');
    let detailsContent = document.getElementById('tree-node-content-tab') || document.getElementById('tree-node-content');
    
    if (!detailsPanel || !detailsContent) {
      console.warn('[RESEARCH_TREE_UI] Node details panel not found');
      return;
    }

    detailsPanel.style.display = 'block';
    
    let html = `
      <div class="node-detail-title">${node.item.name}</div>
      <div class="node-detail-description">${node.item.description}</div>
    `;

    // Cost
    const costItems = this.formatDetailedCost(node.item.cost);
    if (costItems.length > 0) {
      html += `
        <div class="node-detail-cost">
          <div class="detail-section-title">コスト</div>
          <div class="cost-list">
            ${costItems.map(item => `<div class="cost-item">${item}</div>`).join('')}
          </div>
        </div>
      `;
    }

    // Effects
    if (node.item.effects.length > 0) {
      html += `
        <div class="node-detail-effects">
          <div class="detail-section-title">効果</div>
          <div class="effect-list">
            ${node.item.effects.map(effect => 
              `<div class="effect-item">${this.formatEffect(effect)}</div>`
            ).join('')}
          </div>
        </div>
      `;
    }

    // Prerequisites
    if (node.item.requirements.length > 0) {
      html += `
        <div class="node-detail-prerequisites">
          <div class="detail-section-title">前提条件</div>
          <div class="prereq-list">
            ${node.item.requirements.map(reqId => {
              const reqNode = researchTreeAnalyzer.getNodes().get(reqId);
              const isCompleted = reqNode?.state === ResearchNodeState.COMPLETED;
              return `<div class="prereq-item ${isCompleted ? 'completed' : ''}">
                ${reqNode?.item.icon || '🔬'} ${reqNode?.item.name || reqId}
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Action button
    if (node.state === ResearchNodeState.AFFORDABLE) {
      html += `
        <button class="research-action-btn" data-node-id="${node.id}">
          研究を開始
        </button>
      `;
    } else if (node.state === ResearchNodeState.COMPLETED) {
      html += `
        <button class="research-action-btn" disabled>
          研究完了
        </button>
      `;
    } else {
      html += `
        <button class="research-action-btn" disabled>
          条件未達成
        </button>
      `;
    }

    detailsContent.innerHTML = html;
  }

  private formatDetailedCost(cost: any): string[] {
    const items: string[] = [];
    
    Object.entries(cost).forEach(([resource, amount]) => {
      if (amount) {
        const metadata = RESOURCE_METADATA[resource as any];
        const icon = metadata?.icon || '📦';
        const name = metadata?.name || resource;
        items.push(`${icon} ${amount} ${name}`);
      }
    });
    
    return items;
  }

  private formatEffect(effect: any): string {
    // Simple effect formatting
    const value = typeof effect.value === 'number' ? 
      (effect.value >= 1 ? `×${effect.value}` : `${Math.round(effect.value * 100)}%`) : 
      effect.value;
    
    return `${effect.type}: ${value}`;
  }

  private highlightNodes(nodeIds: string[]): void {
    this.highlightedPath = nodeIds;
    
    // Update edge highlighting
    this.edgeElements.forEach((element, id) => {
      const edge = researchTreeAnalyzer.getEdges().get(id);
      if (edge && nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
        element.classList.add('highlighted');
      } else {
        element.classList.remove('highlighted');
      }
    });
  }

  private updateVisibility(): void {
    this.updateGraph();
  }

  private centerView(): void {
    // Find bounds of all visible nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    researchTreeAnalyzer.getNodes().forEach(node => {
      if (this.shouldShowNode(node)) {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxY = Math.max(maxY, node.position.y);
      }
    });
    
    if (minX === Infinity) return;
    
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const rect = this.graphContainer.getBoundingClientRect();
    const scaleX = (rect.width - 100) / width;
    const scaleY = (rect.height - 100) / height;
    
    this.zoom = Math.min(1, Math.min(scaleX, scaleY));
    this.panX = rect.width / 2 - centerX * this.zoom;
    this.panY = rect.height / 2 - centerY * this.zoom;
    
    this.updateTransform();
    this.updateZoomDisplay();
  }

  private searchNodes(query: string): void {
    const lowerQuery = query.toLowerCase();
    
    researchTreeAnalyzer.getNodes().forEach(node => {
      const element = this.nodeElements.get(node.id);
      if (element) {
        if (query === '' || node.item.name.toLowerCase().includes(lowerQuery)) {
          element.style.opacity = '1';
        } else {
          element.style.opacity = '0.3';
        }
      }
    });
  }

  private showPathFinder(): void {
    // TODO: Implement path finder dialog
    showMessage('パス検索機能は開発中です', 'info');
  }

  private showTreeStats(): void {
    const analysis = researchTreeAnalyzer.analyzeTree(this.getResearchState());
    
    let message = '研究ツリー統計:\n\n';
    message += `総研究数: ${analysis.totalNodes}\n`;
    message += `完了済み: ${analysis.completedNodes}\n`;
    message += `利用可能: ${analysis.availableNodes}\n`;
    message += `ロック中: ${analysis.lockedNodes}\n`;
    message += `最大深度: ${analysis.maxDepth}\n`;
    message += `ボトルネック: ${analysis.bottlenecks.length}箇所`;
    
    alert(message);
  }

  private updateStats(): void {
    const analysis = researchTreeAnalyzer.analyzeTree(this.getResearchState());
    
    // タブビュー用の統計コンテナを探す
    const statsContainer = document.getElementById('tree-stats-tab');
    if (statsContainer) {
      // タブビュー用のHTMLを生成
      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">完了:</span>
          <span class="stat-value" style="color: #10b981;">${analysis.completedNodes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">利用可能:</span>
          <span class="stat-value" style="color: #64ffda;">${analysis.availableNodes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">ロック中:</span>
          <span class="stat-value" style="color: #ef4444;">${analysis.lockedNodes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">進捗:</span>
          <span class="stat-value" style="color: #fbbf24;">${Math.round((analysis.completedNodes / analysis.totalNodes) * 100)}%</span>
        </div>
      `;
    }
    
    // 通常のオーバーレイ用の更新（互換性のため）
    const completedCount = document.getElementById('tree-completed-count');
    if (completedCount) completedCount.textContent = analysis.completedNodes.toString();
    
    const availableCount = document.getElementById('tree-available-count');
    if (availableCount) availableCount.textContent = analysis.availableNodes.toString();
    
    const lockedCount = document.getElementById('tree-locked-count');
    if (lockedCount) lockedCount.textContent = analysis.lockedNodes.toString();
    
    const progressPercent = document.getElementById('tree-progress-percent');
    if (progressPercent) {
      const percent = Math.round((analysis.completedNodes / analysis.totalNodes) * 100);
      progressPercent.textContent = `${percent}%`;
    }
  }

  // Public method for starting research from tree
  public researchNode(nodeId: string): void {
    const node = researchTreeAnalyzer.getNodes().get(nodeId);
    if (!node || node.state !== ResearchNodeState.AFFORDABLE) return;
    
    console.log('[RESEARCH_TREE_UI] Starting research for node:', nodeId);
    
    // 研究を直接実行（dualViewSystemのresearchItemメソッドを使用）
    const dualViewSystem = (window as any).dualViewSystem;
    if (dualViewSystem && typeof dualViewSystem.researchItem === 'function') {
      dualViewSystem.researchItem(nodeId).then(() => {
        console.log('[RESEARCH_TREE_UI] Research completed:', nodeId);
        // 状態を更新
        const researchState = this.getResearchState();
        researchTreeAnalyzer.updateNodeStates(researchState);
        // グラフを更新
        this.updateGraph();
        // 選択されたノードの詳細を更新
        if (this.selectedNode && this.selectedNode.id === nodeId) {
          this.selectNode(researchTreeAnalyzer.getNodes().get(nodeId)!);
        }
      }).catch((error: any) => {
        console.error('[RESEARCH_TREE_UI] Research failed:', error);
      });
    } else {
      console.error('[RESEARCH_TREE_UI] dualViewSystem not available');
    }
  }

  // Initialize in a container (for dual view integration)
  public initializeInContainer(container: HTMLElement): void {
    console.log('[RESEARCH_TREE_UI] Initializing in container', container);
    console.log('[RESEARCH_TREE_UI] Container ID:', container.id);
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create structure
    const structure = `
      <div class="research-tree-container">
        <div class="tree-toolbar">
          <select id="tree-layout-select-tab" class="layout-selector">
            <option value="hierarchical">階層レイアウト</option>
            <option value="radial">放射状レイアウト</option>
            <option value="category">カテゴリー別</option>
            <option value="force">力学モデル</option>
          </select>
          <div class="tree-filters">
            <label>
              <input type="checkbox" id="show-completed-tab" checked>
              完了済み
            </label>
            <label>
              <input type="checkbox" id="show-locked-tab" checked>
              ロック中
            </label>
          </div>
          <input type="text" id="tree-search-tab" placeholder="研究を検索...">
        </div>
        <div id="research-tree-graph-tab" class="research-tree-graph"></div>
        <div class="tree-sidebar">
          <div class="tree-stats">
            <h3>ツリー統計</h3>
            <div id="tree-stats-tab"></div>
          </div>
          <div class="node-details-panel" id="tree-node-details-tab" style="display: none;">
            <h3>ノード詳細</h3>
            <div id="tree-node-content-tab"></div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = structure;
    
    // Re-initialize graph
    this.graphContainer = container.querySelector('#research-tree-graph-tab') as HTMLElement;
    this.svg = null; // Force re-creation
    this.initializeGraph();
    
    // Re-bind events
    this.initializeContainerEventListeners(container);
    
    // Update tree
    const researchState = this.getResearchState();
    researchTreeAnalyzer.updateNodeStates(researchState);
    this.updateLayout();
    this.updateStats();
  }

  private initializeContainerEventListeners(container: HTMLElement): void {
    // Layout selector
    const layoutSelect = container.querySelector('#tree-layout-select-tab') as HTMLSelectElement;
    layoutSelect?.addEventListener('change', (e) => {
      const layout = (e.target as HTMLSelectElement).value as LayoutAlgorithm;
      this.layout.updateConfig({ layoutAlgorithm: layout });
      this.updateLayout();
    });
    
    // ノード詳細パネルのボタンイベントをダイナミックに設定
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('research-action-btn') && !target.hasAttribute('disabled')) {
        const nodeId = target.getAttribute('data-node-id');
        if (nodeId) {
          e.preventDefault();
          console.log('[RESEARCH_TREE_UI] Research button clicked for node:', nodeId);
          this.researchNode(nodeId);
        }
      }
    });

    // Filter checkboxes
    const showCompletedCheckbox = container.querySelector('#show-completed-tab') as HTMLInputElement;
    showCompletedCheckbox?.addEventListener('change', (e) => {
      this.settings.showCompleted = (e.target as HTMLInputElement).checked;
      this.updateVisibility();
    });

    const showLockedCheckbox = container.querySelector('#show-locked-tab') as HTMLInputElement;
    showLockedCheckbox?.addEventListener('change', (e) => {
      this.settings.showLocked = (e.target as HTMLInputElement).checked;
      this.updateVisibility();
    });

    // Search input
    const searchInput = container.querySelector('#tree-search-tab') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchNodes((e.target as HTMLInputElement).value);
    });
  }
}

// Global instance
export const researchTreeVisualizerUI = new ResearchTreeVisualizerUI();

// Make it accessible from window for inline onclick
(window as any).researchTreeUI = researchTreeVisualizerUI;