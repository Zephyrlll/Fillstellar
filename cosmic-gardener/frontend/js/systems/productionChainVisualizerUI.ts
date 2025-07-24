// Production Chain Visualizer UI Implementation

import { productionChainVisualizer } from './productionChainVisualizer.js';
import {
  ChainNode,
  ChainLink,
  OptimizationSuggestion,
  VisualizerMode,
  LayoutAlgorithm
} from '../types/productionChain.js';
import { RESOURCE_METADATA } from '../resourceSystem.js';
import { showMessage } from '../ui.js';

export class ProductionChainVisualizerUI {
  private overlay: HTMLElement;
  private graphContainer: HTMLElement;
  private svg: SVGElement | null = null;
  private isOpen: boolean = false;
  private selectedNode: ChainNode | null = null;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private isEmbedded: boolean = false;

  constructor() {
    const overlay = document.getElementById('production-chain-overlay');
    const graphContainer = document.getElementById('production-chain-graph');
    
    if (!overlay || !graphContainer) {
      throw new Error('[PRODUCTION_CHAIN_UI] Required DOM elements not found');
    }
    
    this.overlay = overlay;
    this.graphContainer = graphContainer;
    
    this.initializeEventListeners();
    this.initializeGraph();
  }

  private initializeEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('productionChainCloseButton');
    closeBtn?.addEventListener('click', () => this.close());

    // Mode selector
    const modeSelect = document.getElementById('visualizer-mode-select') as HTMLSelectElement;
    modeSelect?.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as VisualizerMode;
      productionChainVisualizer.updateSettings({ mode });
      this.updateGraph();
    });

    // Layout selector
    const layoutSelect = document.getElementById('visualizer-layout-select') as HTMLSelectElement;
    layoutSelect?.addEventListener('change', (e) => {
      const layout = (e.target as HTMLSelectElement).value as LayoutAlgorithm;
      productionChainVisualizer.setLayout(layout);
      this.updateGraph();
    });

    // Checkboxes
    const showRatesCheckbox = document.getElementById('show-rates-checkbox') as HTMLInputElement;
    showRatesCheckbox?.addEventListener('change', (e) => {
      productionChainVisualizer.updateSettings({ showRates: e.target.checked });
      this.updateGraph();
    });

    const animateFlowCheckbox = document.getElementById('animate-flow-checkbox') as HTMLInputElement;
    animateFlowCheckbox?.addEventListener('change', (e) => {
      productionChainVisualizer.updateSettings({ animateFlow: e.target.checked });
      this.updateGraph();
    });

    const highlightBottlenecksCheckbox = document.getElementById('highlight-bottlenecks-checkbox') as HTMLInputElement;
    highlightBottlenecksCheckbox?.addEventListener('change', (e) => {
      productionChainVisualizer.updateSettings({ highlightBottlenecks: e.target.checked });
      this.updateGraph();
    });

    // Action buttons
    document.getElementById('refresh-chain-btn')?.addEventListener('click', () => {
      productionChainVisualizer.initialize();
      this.updateGraph();
      showMessage('生産チェーンを更新しました', 'success');
    });

    document.getElementById('optimize-chain-btn')?.addEventListener('click', () => {
      this.showOptimizationDialog();
    });

    document.getElementById('export-chain-btn')?.addEventListener('click', () => {
      this.exportChain();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isOpen) {
        if (e.key === 'Escape') {
          this.close();
        } else if (e.key === 'r' && !e.ctrlKey) {
          this.updateGraph();
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
      this.zoom *= delta;
      this.zoom = Math.max(0.1, Math.min(5, this.zoom));
      this.updateTransform();
    });

    // Mouse pan
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg) {
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
    const g = this.svg.querySelector('g#main-group');
    if (g) {
      g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }
  }

  public open(): void {
    if (this.isOpen) return;
    
    console.log('[PRODUCTION_CHAIN_UI] Opening visualizer');
    this.isOpen = true;
    this.overlay.classList.add('active');
    
    // Initialize visualizer if not already done
    productionChainVisualizer.initialize();
    
    // Initial render
    this.updateGraph();
    this.updateMetrics();
    this.updateSuggestions();
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }

  public close(): void {
    if (!this.isOpen) return;
    
    console.log('[PRODUCTION_CHAIN_UI] Closing visualizer');
    this.isOpen = false;
    this.overlay.classList.remove('active');
    
    // Stop periodic updates
    this.stopPeriodicUpdates();
  }

  private updateGraph(): void {
    if (!this.svg) return;

    // Clear existing content
    this.svg.innerHTML = '';

    // Create main group for transform
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.id = 'main-group';
    this.svg.appendChild(mainGroup);

    // Add defs for gradients and patterns
    const defs = this.createDefs();
    mainGroup.appendChild(defs);

    // Get chain data
    const chain = productionChainVisualizer.getChain();
    const settings = productionChainVisualizer.getSettings();

    // Create links first (so they appear behind nodes)
    const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linksGroup.id = 'links';
    mainGroup.appendChild(linksGroup);

    chain.links.forEach(link => {
      const linkElement = this.createLinkElement(link, chain.nodes, settings);
      linksGroup.appendChild(linkElement);
    });

    // Create nodes
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.id = 'nodes';
    mainGroup.appendChild(nodesGroup);

    chain.nodes.forEach(node => {
      const nodeElement = this.createNodeElement(node, settings);
      nodesGroup.appendChild(nodeElement);
    });

    // Apply transform
    this.updateTransform();
  }

  private createDefs(): SVGDefsElement {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Create gradients for different node types
    const gradients = [
      { id: 'source-gradient', colors: ['#4169e1', '#1e3a8a'] },
      { id: 'conversion-gradient', colors: ['#10b981', '#047857'] },
      { id: 'facility-gradient', colors: ['#8b5cf6', '#6d28d9'] },
      { id: 'sink-gradient', colors: ['#f59e0b', '#d97706'] }
    ];

    gradients.forEach(gradient => {
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      grad.id = gradient.id;
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', gradient.colors[0]);
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', gradient.colors[1]);
      
      grad.appendChild(stop1);
      grad.appendChild(stop2);
      defs.appendChild(grad);
    });

    // Arrow marker for links
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.id = 'arrowhead';
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrow.setAttribute('points', '0 0, 10 3, 0 6');
    arrow.setAttribute('fill', '#64ffda');
    
    marker.appendChild(arrow);
    defs.appendChild(marker);

    return defs;
  }

  private createNodeElement(node: ChainNode, settings: any): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('chain-node');
    group.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);
    
    // Node background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '-40');
    rect.setAttribute('y', '-30');
    rect.setAttribute('width', '80');
    rect.setAttribute('height', '60');
    rect.setAttribute('rx', '10');
    rect.setAttribute('fill', `url(#${node.type}-gradient)`);
    rect.setAttribute('stroke', node.status === 'bottleneck' ? '#ff6b6b' : 'rgba(255,255,255,0.2)');
    rect.setAttribute('stroke-width', '2');
    
    if (node.status === 'bottleneck' && settings.highlightBottlenecks) {
      rect.classList.add('bottleneck');
    }
    
    group.appendChild(rect);

    // Icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', '0');
    icon.setAttribute('y', '-5');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('font-size', '24');
    icon.textContent = node.icon || '📦';
    group.appendChild(icon);

    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '0');
    label.setAttribute('y', '20');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', '#fff');
    label.textContent = this.truncateLabel(node.label, 10);
    group.appendChild(label);

    // Rate display (if enabled)
    if (settings.showRates && node.data.rate) {
      const rate = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      rate.setAttribute('x', '0');
      rate.setAttribute('y', '35');
      rate.setAttribute('text-anchor', 'middle');
      rate.setAttribute('font-size', '10');
      rate.setAttribute('fill', '#64ffda');
      rate.textContent = `${node.data.rate.toFixed(1)}/min`;
      group.appendChild(rate);
    }

    // Click handler
    group.addEventListener('click', () => this.selectNode(node));
    
    // Hover effect
    group.addEventListener('mouseenter', () => {
      rect.setAttribute('filter', 'brightness(1.2)');
    });
    
    group.addEventListener('mouseleave', () => {
      rect.setAttribute('filter', '');
    });

    return group;
  }

  private createLinkElement(link: ChainLink, nodes: Map<string, ChainNode>, settings: any): SVGPathElement {
    const sourceNode = nodes.get(link.source);
    const targetNode = nodes.get(link.target);
    
    if (!sourceNode || !targetNode) return document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('chain-link');
    
    // Calculate path
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    const d = `M ${sourceNode.position.x} ${sourceNode.position.y} Q ${sourceNode.position.x + dx/2} ${sourceNode.position.y} ${targetNode.position.x} ${targetNode.position.y}`;
    
    path.setAttribute('d', d);
    path.setAttribute('stroke', this.getLinkColor(link));
    path.setAttribute('stroke-width', Math.max(2, link.data.rate / 10).toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    
    if (settings.animateFlow) {
      path.classList.add('flow-animation');
    }

    // Click handler
    path.addEventListener('click', () => this.selectLink(link));

    return path;
  }

  private getLinkColor(link: ChainLink): string {
    switch (link.status) {
      case 'optimal': return '#64ffda';
      case 'underutilized': return '#ffd93d';
      case 'bottleneck': return '#ff6b6b';
      case 'blocked': return '#6c757d';
      default: return '#64ffda';
    }
  }

  private truncateLabel(label: string, maxLength: number): string {
    return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
  }

  private selectNode(node: ChainNode): void {
    this.selectedNode = node;
    this.showNodeDetails(node);
  }

  private selectLink(link: ChainLink): void {
    // Show link details
    console.log('[PRODUCTION_CHAIN_UI] Link selected:', link);
  }

  private showNodeDetails(node: ChainNode): void {
    const detailsPanel = document.getElementById('node-details-panel');
    const detailsContent = document.getElementById('node-details-content');
    
    if (!detailsPanel || !detailsContent) return;

    detailsPanel.style.display = 'block';
    
    let html = `
      <div class="node-detail-item">
        <span class="detail-label">タイプ:</span>
        <span class="detail-value">${node.type}</span>
      </div>
      <div class="node-detail-item">
        <span class="detail-label">状態:</span>
        <span class="detail-value">${node.status || 'normal'}</span>
      </div>
    `;

    if (node.data.resourceType) {
      const metadata = RESOURCE_METADATA[node.data.resourceType];
      html += `
        <div class="node-detail-item">
          <span class="detail-label">資源:</span>
          <span class="detail-value">${metadata?.name || node.data.resourceType}</span>
        </div>
      `;
    }

    if (node.data.rate) {
      html += `
        <div class="node-detail-item">
          <span class="detail-label">レート:</span>
          <span class="detail-value">${node.data.rate.toFixed(1)}/min</span>
        </div>
      `;
    }

    if (node.data.efficiency) {
      html += `
        <div class="node-detail-item">
          <span class="detail-label">効率:</span>
          <span class="detail-value">${(node.data.efficiency * 100).toFixed(0)}%</span>
        </div>
      `;
    }

    detailsContent.innerHTML = html;
  }

  private updateMetrics(): void {
    const chain = productionChainVisualizer.getChain();
    const metrics = chain.metrics;

    // Update efficiency
    const efficiencyElement = document.getElementById('chain-efficiency');
    if (efficiencyElement) {
      efficiencyElement.textContent = `${(metrics.efficiency * 100).toFixed(0)}%`;
    }

    // Update bottleneck count
    const bottleneckElement = document.getElementById('bottleneck-count');
    if (bottleneckElement) {
      bottleneckElement.textContent = metrics.bottlenecks.length.toString();
    }

    // Update active nodes
    const activeNodesElement = document.getElementById('active-nodes');
    if (activeNodesElement) {
      const activeCount = Array.from(chain.nodes.values())
        .filter(node => node.status === 'active').length;
      activeNodesElement.textContent = activeCount.toString();
    }

    // Update last update time
    const lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) {
      const now = new Date();
      lastUpdateElement.textContent = now.toLocaleTimeString();
    }
  }

  private updateSuggestions(): void {
    const suggestionsContainer = document.getElementById('optimization-suggestions');
    if (!suggestionsContainer) return;

    const chain = productionChainVisualizer.getChain();
    const suggestions = chain.metrics.suggestions;

    suggestionsContainer.innerHTML = '';

    if (suggestions.length === 0) {
      suggestionsContainer.innerHTML = '<p class="no-suggestions">現在、最適化提案はありません。</p>';
      return;
    }

    suggestions.forEach(suggestion => {
      const item = this.createSuggestionElement(suggestion);
      suggestionsContainer.appendChild(item);
    });
  }

  private createSuggestionElement(suggestion: OptimizationSuggestion): HTMLElement {
    const div = document.createElement('div');
    div.className = `suggestion-item ${suggestion.priority}-priority`;
    
    div.innerHTML = `
      <div class="suggestion-title">${suggestion.title}</div>
      <div class="suggestion-description">${suggestion.description}</div>
      <div class="suggestion-impact">
        <span>期待効果: +${suggestion.impact.improvementPercent.toFixed(0)}%</span>
      </div>
    `;

    div.addEventListener('click', () => {
      if (confirm(`この最適化を適用しますか？\n\n${suggestion.title}`)) {
        productionChainVisualizer.applySuggestion(suggestion);
        this.updateGraph();
        this.updateMetrics();
        this.updateSuggestions();
        showMessage('最適化を適用しました', 'success');
      }
    });

    return div;
  }

  private showOptimizationDialog(): void {
    const analysis = productionChainVisualizer.analyzeChain();
    
    let message = '生産チェーン分析結果:\n\n';
    
    if (analysis.bottlenecks.length > 0) {
      message += `ボトルネック: ${analysis.bottlenecks.length}箇所\n`;
    }
    
    if (analysis.redundantNodes.length > 0) {
      message += `冗長ノード: ${analysis.redundantNodes.length}箇所\n`;
    }
    
    if (analysis.underutilizedLinks.length > 0) {
      message += `低稼働リンク: ${analysis.underutilizedLinks.length}本\n`;
    }
    
    message += '\n自動最適化を実行しますか？';
    
    if (confirm(message)) {
      // TODO: Implement auto-optimization
      showMessage('自動最適化機能は開発中です', 'info');
    }
  }

  private exportChain(): void {
    const chain = productionChainVisualizer.getChain();
    const exportData = {
      version: '1.0',
      name: '生産チェーン',
      description: 'Cosmic Gardener Production Chain',
      chain: {
        nodes: Array.from(chain.nodes.values()),
        links: Array.from(chain.links.values())
      },
      metadata: {
        created: Date.now(),
        modified: Date.now()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-chain-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('生産チェーンをエクスポートしました', 'success');
  }

  private periodicUpdateInterval: number | null = null;

  private startPeriodicUpdates(): void {
    this.periodicUpdateInterval = window.setInterval(() => {
      this.updateMetrics();
      // Only update graph if there are significant changes
      // TODO: Implement change detection
    }, 1000);
  }

  private stopPeriodicUpdates(): void {
    if (this.periodicUpdateInterval) {
      clearInterval(this.periodicUpdateInterval);
      this.periodicUpdateInterval = null;
    }
  }

  // Initialize in a container (for dual view integration)
  public initializeInContainer(container: HTMLElement): void {
    console.log('[PRODUCTION_CHAIN_UI] Initializing in container');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create structure
    const structure = `
      <div class="production-chain-container">
        <div class="chain-toolbar">
          <select id="chain-view-mode-tab" class="view-mode-selector">
            <option value="simple">シンプル</option>
            <option value="detailed">詳細</option>
            <option value="efficiency">効率性</option>
            <option value="bottleneck">ボトルネック</option>
            <option value="quality">品質フロー</option>
          </select>
          <button id="chain-auto-layout-tab" class="toolbar-btn">自動配置</button>
          <button id="chain-optimize-tab" class="toolbar-btn">最適化</button>
          <button id="chain-export-tab" class="toolbar-btn">エクスポート</button>
        </div>
        <div id="production-chain-graph-tab" class="production-graph-container"></div>
        <div class="chain-sidebar">
          <div class="metrics-panel">
            <h3>チェーン統計</h3>
            <div id="chain-stats-tab"></div>
          </div>
          <div class="selected-node-panel" id="selected-node-tab" style="display: none;">
            <h3>選択ノード</h3>
            <div id="node-details-tab"></div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = structure;
    
    // Re-initialize graph
    this.graphContainer = container.querySelector('#production-chain-graph-tab') as HTMLElement;
    this.initializeGraph();
    
    // Re-bind events
    this.initializeContainerEventListeners(container);
    
    // Update metrics
    this.updateMetrics();
    
    // Start updates
    this.startPeriodicUpdates();
  }

  private initializeContainerEventListeners(container: HTMLElement): void {
    // View mode selector
    const viewModeSelect = container.querySelector('#chain-view-mode-tab') as HTMLSelectElement;
    viewModeSelect?.addEventListener('change', (e) => {
      this.currentViewMode = (e.target as HTMLSelectElement).value as VisualizationMode;
      this.updateGraph();
    });

    // Toolbar buttons
    container.querySelector('#chain-auto-layout-tab')?.addEventListener('click', () => {
      this.autoLayout();
    });

    container.querySelector('#chain-optimize-tab')?.addEventListener('click', () => {
      this.optimizeChain();
    });

    container.querySelector('#chain-export-tab')?.addEventListener('click', () => {
      this.exportChain();
    });
  }
}

// Global instance
export const productionChainVisualizerUI = new ProductionChainVisualizerUI();