/**
 * Research Path Finder
 * 研究ツリー内で目標研究への最短パスを探索するシステム
 */

import { ResearchTreeNode, ResearchTreeEdge, ResearchNodeState } from '../types/researchTree.js';
import { researchTreeAnalyzer } from './researchTreeAnalyzer.js';
import { gameStateManager } from '../state.js';

export interface ResearchPath {
  nodeIds: string[];
  totalCost: {
    [resource: string]: number;
  };
  totalTime: number;
  requiredNodes: string[];
  isValid: boolean;
}

export interface PathFindingOptions {
  includeCompleted?: boolean;
  optimizeFor?: 'time' | 'cost' | 'balance';
  maxDepth?: number;
}

export class ResearchPathFinder {
  private static instance: ResearchPathFinder;
  
  private constructor() {}
  
  static getInstance(): ResearchPathFinder {
    if (!ResearchPathFinder.instance) {
      ResearchPathFinder.instance = new ResearchPathFinder();
    }
    return ResearchPathFinder.instance;
  }
  
  /**
   * 目標ノードへの最適パスを見つける
   */
  findPath(targetId: string, options: PathFindingOptions = {}): ResearchPath | null {
    const {
      includeCompleted = false,
      optimizeFor = 'balance',
      maxDepth = 20
    } = options;
    
    const targetNode = researchTreeAnalyzer.getNodes().get(targetId);
    if (!targetNode) {
      console.error('[PATH_FINDER] Target node not found:', targetId);
      return null;
    }
    
    // すでに完了している場合
    if (targetNode.state === ResearchNodeState.COMPLETED && !includeCompleted) {
      return {
        nodeIds: [],
        totalCost: {},
        totalTime: 0,
        requiredNodes: [],
        isValid: false
      };
    }
    
    // パス探索を実行
    const path = this.dijkstraSearch(targetId, optimizeFor, maxDepth);
    
    if (!path) {
      console.log('[PATH_FINDER] No path found to target:', targetId);
      return null;
    }
    
    // パスの詳細を計算
    return this.calculatePathDetails(path);
  }
  
  /**
   * 複数の目標への最適な研究順序を見つける
   */
  findOptimalOrder(targetIds: string[], options: PathFindingOptions = {}): ResearchPath | null {
    const allPaths: ResearchPath[] = [];
    
    // 各目標への個別パスを計算
    for (const targetId of targetIds) {
      const path = this.findPath(targetId, options);
      if (path && path.isValid) {
        allPaths.push(path);
      }
    }
    
    if (allPaths.length === 0) {
      return null;
    }
    
    // パスを統合して最適な順序を決定
    return this.mergeAndOptimizePaths(allPaths, options.optimizeFor || 'balance');
  }
  
  /**
   * 現在の状態から利用可能な最も価値の高い研究を提案
   */
  suggestNextResearch(limit: number = 5): ResearchTreeNode[] {
    const suggestions: ResearchTreeNode[] = [];
    const nodes = researchTreeAnalyzer.getNodes();
    const completedSet = gameStateManager.getState().research?.completedResearch || new Set();
    
    // 評価スコアでソート
    const scoredNodes: Array<{ node: ResearchTreeNode; score: number }> = [];
    
    nodes.forEach(node => {
      if (node.state === ResearchNodeState.AFFORDABLE || node.state === ResearchNodeState.AVAILABLE) {
        const score = this.calculateNodeValue(node, completedSet);
        scoredNodes.push({ node, score });
      }
    });
    
    // スコアの高い順にソート
    scoredNodes.sort((a, b) => b.score - a.score);
    
    // 上位limit個を返す
    return scoredNodes.slice(0, limit).map(item => item.node);
  }
  
  /**
   * ダイクストラ法による最短パス探索
   */
  private dijkstraSearch(targetId: string, optimizeFor: string, maxDepth: number): string[] | null {
    const nodes = researchTreeAnalyzer.getNodes();
    const edges = researchTreeAnalyzer.getEdges();
    const completedSet = gameStateManager.getState().research?.completedResearch || new Set();
    
    // 初期化
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue = new Set<string>();
    
    // 完了済みノードから開始
    nodes.forEach((node, id) => {
      if (node.state === ResearchNodeState.COMPLETED) {
        distances.set(id, 0);
        queue.add(id);
      } else {
        distances.set(id, Infinity);
      }
      previous.set(id, null);
    });
    
    // 完了済みノードがない場合は、利用可能なノードから開始
    if (queue.size === 0) {
      nodes.forEach((node, id) => {
        if (node.state === ResearchNodeState.AVAILABLE || node.state === ResearchNodeState.AFFORDABLE) {
          distances.set(id, this.calculateNodeCost(node, optimizeFor));
          queue.add(id);
        }
      });
    }
    
    let depth = 0;
    
    while (queue.size > 0 && depth < maxDepth) {
      // 最小距離のノードを選択
      let currentId: string | null = null;
      let minDistance = Infinity;
      
      queue.forEach(id => {
        const distance = distances.get(id)!;
        if (distance < minDistance) {
          minDistance = distance;
          currentId = id;
        }
      });
      
      if (!currentId) break;
      
      // 目標に到達
      if (currentId === targetId) {
        return this.reconstructPath(previous, targetId);
      }
      
      queue.delete(currentId);
      visited.add(currentId);
      
      // 隣接ノードを更新
      edges.forEach(edge => {
        if (edge.source === currentId && !visited.has(edge.target)) {
          const targetNode = nodes.get(edge.target);
          if (!targetNode) return;
          
          // ロックされているノードはスキップ
          if (targetNode.state === ResearchNodeState.LOCKED) {
            // 前提条件を確認
            const canUnlock = this.canUnlockNode(targetNode, visited, completedSet);
            if (!canUnlock) return;
          }
          
          const alt = distances.get(currentId!)! + this.calculateNodeCost(targetNode, optimizeFor);
          
          if (alt < distances.get(edge.target)!) {
            distances.set(edge.target, alt);
            previous.set(edge.target, currentId!);
            queue.add(edge.target);
          }
        }
      });
      
      depth++;
    }
    
    return null;
  }
  
  /**
   * パスの再構築
   */
  private reconstructPath(previous: Map<string, string | null>, targetId: string): string[] {
    const path: string[] = [];
    let current: string | null = targetId;
    
    while (current !== null) {
      const prev = previous.get(current);
      if (prev === null) {
        // このノードから開始
        break;
      }
      path.unshift(current);
      current = prev;
    }
    
    return path;
  }
  
  /**
   * ノードのロックを解除できるか確認
   */
  private canUnlockNode(node: ResearchTreeNode, visited: Set<string>, completed: Set<string>): boolean {
    return node.item.requirements.every(reqId => 
      completed.has(reqId) || visited.has(reqId)
    );
  }
  
  /**
   * ノードのコストを計算
   */
  private calculateNodeCost(node: ResearchTreeNode, optimizeFor: string): number {
    let cost = 0;
    
    switch (optimizeFor) {
      case 'time':
        // 研究時間を重視
        cost = node.item.researchTime || 60;
        break;
        
      case 'cost':
        // リソースコストを重視
        const resourceCost = node.item.cost;
        cost = (resourceCost.energy || 0) * 1 +
               (resourceCost.darkMatter || 0) * 10 +
               (resourceCost.thoughtPoints || 0) * 20;
        break;
        
      case 'balance':
      default:
        // バランス重視
        const timeCost = (node.item.researchTime || 60) / 60;
        const resCost = (node.item.cost.energy || 0) * 0.01 +
                       (node.item.cost.darkMatter || 0) * 0.1 +
                       (node.item.cost.thoughtPoints || 0) * 0.2;
        cost = timeCost + resCost;
        break;
    }
    
    return cost;
  }
  
  /**
   * パスの詳細を計算
   */
  private calculatePathDetails(nodeIds: string[]): ResearchPath {
    const nodes = researchTreeAnalyzer.getNodes();
    const completedSet = gameStateManager.getState().research?.completedResearch || new Set();
    
    let totalCost: { [resource: string]: number } = {};
    let totalTime = 0;
    const requiredNodes: string[] = [];
    
    // パス上の各ノードのコストを集計
    for (const nodeId of nodeIds) {
      const node = nodes.get(nodeId);
      if (!node) continue;
      
      // すでに完了していればスキップ
      if (completedSet.has(nodeId)) continue;
      
      requiredNodes.push(nodeId);
      
      // コストを加算
      Object.entries(node.item.cost).forEach(([resource, amount]) => {
        if (amount) {
          totalCost[resource] = (totalCost[resource] || 0) + amount;
        }
      });
      
      // 時間を加算
      totalTime += node.item.researchTime || 60;
    }
    
    return {
      nodeIds: requiredNodes,
      totalCost,
      totalTime,
      requiredNodes,
      isValid: requiredNodes.length > 0
    };
  }
  
  /**
   * ノードの価値を計算
   */
  private calculateNodeValue(node: ResearchTreeNode, completed: Set<string>): number {
    let value = 0;
    
    // 効果の価値を計算
    node.item.effects.forEach(effect => {
      switch (effect.type) {
        case 'unlock':
          value += 10;
          break;
        case 'multiply':
          value += effect.value * 5;
          break;
        case 'add':
          value += effect.value * 2;
          break;
      }
    });
    
    // このノードがアンロックする他のノードの数
    const unlockCount = researchTreeAnalyzer.getConnectedNodes(node.id).size;
    value += unlockCount * 3;
    
    // コストによる調整
    const costFactor = this.calculateNodeCost(node, 'cost');
    value = value / (1 + costFactor * 0.01);
    
    // カテゴリーによる重み付け
    switch (node.category) {
      case 'fundamental':
        value *= 1.5;
        break;
      case 'automation':
        value *= 1.3;
        break;
      case 'technology':
        value *= 1.2;
        break;
    }
    
    return value;
  }
  
  /**
   * 複数のパスを統合して最適化
   */
  private mergeAndOptimizePaths(paths: ResearchPath[], optimizeFor: string): ResearchPath {
    const allNodes = new Set<string>();
    const totalCost: { [resource: string]: number } = {};
    let totalTime = 0;
    
    // すべてのノードを収集
    paths.forEach(path => {
      path.nodeIds.forEach(nodeId => allNodes.add(nodeId));
    });
    
    // トポロジカルソート
    const sortedNodes = this.topologicalSort(Array.from(allNodes));
    
    // コストを再計算
    const nodes = researchTreeAnalyzer.getNodes();
    sortedNodes.forEach(nodeId => {
      const node = nodes.get(nodeId);
      if (!node) return;
      
      Object.entries(node.item.cost).forEach(([resource, amount]) => {
        if (amount) {
          totalCost[resource] = (totalCost[resource] || 0) + amount;
        }
      });
      
      totalTime += node.item.researchTime || 60;
    });
    
    return {
      nodeIds: sortedNodes,
      totalCost,
      totalTime,
      requiredNodes: sortedNodes,
      isValid: sortedNodes.length > 0
    };
  }
  
  /**
   * トポロジカルソート
   */
  private topologicalSort(nodeIds: string[]): string[] {
    const nodes = researchTreeAnalyzer.getNodes();
    const edges = researchTreeAnalyzer.getEdges();
    const nodeSet = new Set(nodeIds);
    
    // 入次数を計算
    const inDegree = new Map<string, number>();
    nodeIds.forEach(id => inDegree.set(id, 0));
    
    edges.forEach(edge => {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    });
    
    // 入次数0のノードから開始
    const queue: string[] = [];
    const result: string[] = [];
    
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      // 隣接ノードの入次数を減らす
      edges.forEach(edge => {
        if (edge.source === current && nodeSet.has(edge.target)) {
          const newDegree = (inDegree.get(edge.target) || 0) - 1;
          inDegree.set(edge.target, newDegree);
          
          if (newDegree === 0) {
            queue.push(edge.target);
          }
        }
      });
    }
    
    return result;
  }
}

// グローバルインスタンス
export const researchPathFinder = ResearchPathFinder.getInstance();