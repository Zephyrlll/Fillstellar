/**
 * Research Path Finder UI
 * 研究パス検索のユーザーインターフェース
 */

import { researchPathFinder } from './researchPathFinder.js';
import { researchTreeAnalyzer } from './researchTreeAnalyzer.js';
import { researchTreeVisualizerUI } from './researchTreeVisualizerUI.js';
import { ResearchTreeNode, ResearchNodeState } from '../types/researchTree.js';
import { RESOURCE_METADATA } from '../resourceSystem.js';
import { showMessage } from '../ui.js';

export class ResearchPathFinderUI {
  private static instance: ResearchPathFinderUI;
  private overlay: HTMLElement | null = null;
  private isOpen: boolean = false;
  private selectedTarget: string | null = null;
  private selectedNodes: Set<string> = new Set();
  
  private constructor() {
    this.createOverlay();
    this.initializeEventListeners();
  }
  
  static getInstance(): ResearchPathFinderUI {
    if (!ResearchPathFinderUI.instance) {
      ResearchPathFinderUI.instance = new ResearchPathFinderUI();
    }
    return ResearchPathFinderUI.instance;
  }
  
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'path-finder-overlay';
    this.overlay.innerHTML = `
      <div class="path-finder-modal">
        <div class="path-finder-header">
          <h2>🔍 研究パス探索</h2>
          <button class="close-btn" id="pathFinderCloseBtn">✕</button>
        </div>
        
        <div class="path-finder-content">
          <div class="path-finder-options">
            <div class="option-group">
              <label>探索モード:</label>
              <select id="pathOptimizeMode">
                <option value="balance">バランス重視</option>
                <option value="time">時間優先</option>
                <option value="cost">コスト優先</option>
              </select>
            </div>
            
            <div class="option-group">
              <label>
                <input type="checkbox" id="includeCompleted" />
                完了済みも含める
              </label>
            </div>
          </div>
          
          <div class="path-finder-main">
            <div class="target-selection">
              <h3>目標研究を選択</h3>
              <input type="text" id="targetSearchInput" placeholder="研究名で検索..." />
              <div class="target-list" id="targetList"></div>
            </div>
            
            <div class="path-result">
              <h3>推奨パス</h3>
              <div class="path-summary" id="pathSummary">
                <p class="no-path">目標を選択してください</p>
              </div>
              <div class="path-steps" id="pathSteps"></div>
            </div>
          </div>
          
          <div class="suggestions-section">
            <h3>おすすめの研究</h3>
            <div class="suggestions-list" id="suggestionsList"></div>
          </div>
        </div>
        
        <div class="path-finder-footer">
          <button class="action-btn cancel-btn" id="pathFinderCancelBtn">キャンセル</button>
          <button class="action-btn apply-btn" id="pathFinderApplyBtn" disabled>パスを表示</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
  }
  
  private initializeEventListeners(): void {
    if (!this.overlay) return;
    
    // Close buttons
    this.overlay.querySelector('#pathFinderCloseBtn')?.addEventListener('click', () => this.close());
    this.overlay.querySelector('#pathFinderCancelBtn')?.addEventListener('click', () => this.close());
    
    // Apply button
    this.overlay.querySelector('#pathFinderApplyBtn')?.addEventListener('click', () => this.applyPath());
    
    // Search input
    const searchInput = this.overlay.querySelector('#targetSearchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.filterTargets((e.target as HTMLInputElement).value);
    });
    
    // Optimize mode change
    this.overlay.querySelector('#pathOptimizeMode')?.addEventListener('change', () => {
      if (this.selectedTarget) {
        this.calculatePath(this.selectedTarget);
      }
    });
    
    // Include completed checkbox
    this.overlay.querySelector('#includeCompleted')?.addEventListener('change', () => {
      this.updateTargetList();
      if (this.selectedTarget) {
        this.calculatePath(this.selectedTarget);
      }
    });
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
  
  public open(): void {
    if (this.isOpen || !this.overlay) return;
    
    this.isOpen = true;
    this.overlay.classList.add('active');
    
    // Initialize content
    this.updateTargetList();
    this.showSuggestions();
    
    // Focus search input
    const searchInput = this.overlay.querySelector('#targetSearchInput') as HTMLInputElement;
    searchInput?.focus();
  }
  
  public close(): void {
    if (!this.isOpen || !this.overlay) return;
    
    this.isOpen = false;
    this.overlay.classList.remove('active');
    
    // Reset state
    this.selectedTarget = null;
    this.selectedNodes.clear();
  }
  
  private updateTargetList(): void {
    const targetList = this.overlay?.querySelector('#targetList');
    if (!targetList) return;
    
    const includeCompleted = (this.overlay?.querySelector('#includeCompleted') as HTMLInputElement)?.checked;
    const nodes = researchTreeAnalyzer.getNodes();
    
    // Filter and sort nodes
    const targetNodes: ResearchTreeNode[] = [];
    nodes.forEach(node => {
      if (includeCompleted || node.state !== ResearchNodeState.COMPLETED) {
        targetNodes.push(node);
      }
    });
    
    // Sort by category and name
    targetNodes.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.item.name.localeCompare(b.item.name);
    });
    
    // Generate HTML
    let currentCategory = '';
    let html = '';
    
    targetNodes.forEach(node => {
      if (node.category !== currentCategory) {
        if (currentCategory) html += '</div>';
        currentCategory = node.category;
        html += `
          <div class="target-category">
            <h4>${this.getCategoryName(currentCategory)}</h4>
        `;
      }
      
      const stateClass = node.state.toLowerCase().replace('_', '-');
      html += `
        <div class="target-item ${stateClass}" data-node-id="${node.id}">
          <span class="target-icon">${node.item.icon || '🔬'}</span>
          <span class="target-name">${node.item.name}</span>
          <span class="target-state">${this.getStateLabel(node.state)}</span>
        </div>
      `;
    });
    
    if (currentCategory) html += '</div>';
    
    targetList.innerHTML = html;
    
    // Add click handlers
    targetList.querySelectorAll('.target-item').forEach(item => {
      item.addEventListener('click', () => {
        const nodeId = item.getAttribute('data-node-id');
        if (nodeId) this.selectTarget(nodeId);
      });
    });
  }
  
  private filterTargets(query: string): void {
    const targetList = this.overlay?.querySelector('#targetList');
    if (!targetList) return;
    
    const lowerQuery = query.toLowerCase();
    
    targetList.querySelectorAll('.target-item').forEach(item => {
      const name = item.querySelector('.target-name')?.textContent?.toLowerCase() || '';
      const isVisible = query === '' || name.includes(lowerQuery);
      (item as HTMLElement).style.display = isVisible ? 'flex' : 'none';
    });
    
    // Hide empty categories
    targetList.querySelectorAll('.target-category').forEach(category => {
      const hasVisibleItems = Array.from(category.querySelectorAll('.target-item'))
        .some(item => (item as HTMLElement).style.display !== 'none');
      (category as HTMLElement).style.display = hasVisibleItems ? 'block' : 'none';
    });
  }
  
  private selectTarget(nodeId: string): void {
    this.selectedTarget = nodeId;
    
    // Update UI
    const targetList = this.overlay?.querySelector('#targetList');
    targetList?.querySelectorAll('.target-item').forEach(item => {
      item.classList.toggle('selected', item.getAttribute('data-node-id') === nodeId);
    });
    
    // Calculate path
    this.calculatePath(nodeId);
  }
  
  private calculatePath(targetId: string): void {
    const optimizeMode = (this.overlay?.querySelector('#pathOptimizeMode') as HTMLSelectElement)?.value || 'balance';
    const includeCompleted = (this.overlay?.querySelector('#includeCompleted') as HTMLInputElement)?.checked;
    
    const path = researchPathFinder.findPath(targetId, {
      includeCompleted,
      optimizeFor: optimizeMode
    });
    
    this.displayPath(path);
  }
  
  private displayPath(path: any): void {
    const summaryEl = this.overlay?.querySelector('#pathSummary');
    const stepsEl = this.overlay?.querySelector('#pathSteps');
    const applyBtn = this.overlay?.querySelector('#pathFinderApplyBtn') as HTMLButtonElement;
    
    if (!summaryEl || !stepsEl) return;
    
    if (!path || !path.isValid) {
      summaryEl.innerHTML = '<p class="no-path">有効なパスが見つかりませんでした</p>';
      stepsEl.innerHTML = '';
      applyBtn.disabled = true;
      return;
    }
    
    // Update summary
    const costItems = Object.entries(path.totalCost)
      .filter(([_, amount]) => amount > 0)
      .map(([resource, amount]) => {
        const metadata = RESOURCE_METADATA[resource as any];
        return `${metadata?.icon || '📦'} ${amount}`;
      })
      .join(' / ');
    
    const timeHours = Math.ceil(path.totalTime / 3600);
    
    summaryEl.innerHTML = `
      <div class="path-stat">
        <span class="stat-label">必要ステップ:</span>
        <span class="stat-value">${path.nodeIds.length}</span>
      </div>
      <div class="path-stat">
        <span class="stat-label">総コスト:</span>
        <span class="stat-value">${costItems || 'なし'}</span>
      </div>
      <div class="path-stat">
        <span class="stat-label">推定時間:</span>
        <span class="stat-value">${timeHours}時間</span>
      </div>
    `;
    
    // Update steps
    const nodes = researchTreeAnalyzer.getNodes();
    let stepsHtml = '';
    
    path.nodeIds.forEach((nodeId: string, index: number) => {
      const node = nodes.get(nodeId);
      if (!node) return;
      
      const costItems = Object.entries(node.item.cost)
        .filter(([_, amount]) => amount > 0)
        .map(([resource, amount]) => {
          const metadata = RESOURCE_METADATA[resource as any];
          return `${metadata?.icon || '📦'} ${amount}`;
        })
        .join(', ');
      
      stepsHtml += `
        <div class="path-step">
          <div class="step-number">${index + 1}</div>
          <div class="step-content">
            <div class="step-name">
              ${node.item.icon || '🔬'} ${node.item.name}
            </div>
            <div class="step-cost">${costItems || 'コストなし'}</div>
          </div>
        </div>
      `;
    });
    
    stepsEl.innerHTML = stepsHtml;
    
    // Enable apply button
    applyBtn.disabled = false;
    this.selectedNodes = new Set(path.nodeIds);
  }
  
  private showSuggestions(): void {
    const suggestionsEl = this.overlay?.querySelector('#suggestionsList');
    if (!suggestionsEl) return;
    
    const suggestions = researchPathFinder.suggestNextResearch(5);
    
    if (suggestions.length === 0) {
      suggestionsEl.innerHTML = '<p class="no-suggestions">現在おすすめの研究はありません</p>';
      return;
    }
    
    let html = '';
    suggestions.forEach(node => {
      const costItems = Object.entries(node.item.cost)
        .filter(([_, amount]) => amount > 0)
        .map(([resource, amount]) => {
          const metadata = RESOURCE_METADATA[resource as any];
          return `${metadata?.icon || '📦'} ${amount}`;
        })
        .join(', ');
      
      html += `
        <div class="suggestion-item" data-node-id="${node.id}">
          <div class="suggestion-icon">${node.item.icon || '🔬'}</div>
          <div class="suggestion-info">
            <div class="suggestion-name">${node.item.name}</div>
            <div class="suggestion-cost">${costItems || 'コストなし'}</div>
          </div>
          <button class="suggestion-select">選択</button>
        </div>
      `;
    });
    
    suggestionsEl.innerHTML = html;
    
    // Add click handlers
    suggestionsEl.querySelectorAll('.suggestion-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const nodeId = (e.target as HTMLElement).closest('.suggestion-item')?.getAttribute('data-node-id');
        if (nodeId) this.selectTarget(nodeId);
      });
    });
  }
  
  private applyPath(): void {
    if (this.selectedNodes.size === 0) return;
    
    // Highlight path in the visualizer
    researchTreeVisualizerUI.highlightPath(Array.from(this.selectedNodes));
    
    showMessage(`${this.selectedNodes.size}個のノードを含むパスを表示しました`, 'success');
    
    this.close();
  }
  
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'fundamental': '基礎研究',
      'celestial': '天体研究',
      'life': '生命研究',
      'technology': '技術研究',
      'cosmic': '宇宙研究',
      'automation': '自動化研究'
    };
    return names[category] || category;
  }
  
  private getStateLabel(state: ResearchNodeState): string {
    const labels: Record<ResearchNodeState, string> = {
      [ResearchNodeState.LOCKED]: 'ロック',
      [ResearchNodeState.AVAILABLE]: '利用可能',
      [ResearchNodeState.AFFORDABLE]: '研究可能',
      [ResearchNodeState.UNAFFORDABLE]: 'コスト不足',
      [ResearchNodeState.IN_PROGRESS]: '研究中',
      [ResearchNodeState.COMPLETED]: '完了'
    };
    return labels[state] || state;
  }
}

// グローバルインスタンス
export const researchPathFinderUI = ResearchPathFinderUI.getInstance();

// グローバルに公開
(window as any).researchPathFinderUI = researchPathFinderUI;