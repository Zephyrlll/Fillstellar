/**
 * Production Analyzer System
 * 生産効率分析システム
 */

import { gameStateManager } from '../state.js';
import { ResourceType } from '../resourceSystem.js';
import { 
  ProductionMetrics, 
  Bottleneck, 
  ResourcePrediction, 
  AnalysisReport,
  OptimizationSuggestion,
  ProductionFlow,
  TimeSeriesDataPoint,
  ProductionHistory,
  CelestialProductionStats,
  AnalysisFilter,
  AnalysisState
} from '../types/productionAnalysis.js';
import { CelestialType } from '../types/celestial.js';

// getResourceConversionsが存在しない場合のダミー関数
function getResourceConversions(): any[] {
  // TODO: 実際の変換データを取得する関数を実装
  return [];
}

export class ProductionAnalyzer {
  private static instance: ProductionAnalyzer;
  private state: AnalysisState;
  private analysisInterval: number | null = null;
  private historyBuffer: Map<ResourceType, TimeSeriesDataPoint[]> = new Map();
  private readonly MAX_HISTORY_POINTS = 1000;
  private readonly ANALYSIS_INTERVAL = 5000; // 5 seconds
  
  private constructor() {
    this.state = {
      isAnalyzing: false,
      history: new Map(),
      activeFilters: {},
      chartConfigs: [],
      updateInterval: this.ANALYSIS_INTERVAL
    };
    
    this.initializeHistory();
    console.log('[PRODUCTION-ANALYZER] Initialized');
  }
  
  static getInstance(): ProductionAnalyzer {
    if (!ProductionAnalyzer.instance) {
      ProductionAnalyzer.instance = new ProductionAnalyzer();
    }
    return ProductionAnalyzer.instance;
  }
  
  // 履歴データの初期化
  private initializeHistory(): void {
    // 基本リソースのみを追跡
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    basicResources.forEach(resource => {
      this.historyBuffer.set(resource, []);
      this.state.history.set(resource, {
        resource,
        dataPoints: [],
        aggregationType: 'minute'
      });
    });
  }
  
  // 分析開始
  start(): void {
    if (this.state.isAnalyzing) return;
    
    this.state.isAnalyzing = true;
    this.analysisInterval = window.setInterval(() => {
      this.performAnalysis();
    }, this.state.updateInterval);
    
    // 初回分析を即座に実行
    this.performAnalysis();
    console.log('[PRODUCTION-ANALYZER] Started analysis');
  }
  
  // 分析停止
  stop(): void {
    if (!this.state.isAnalyzing) return;
    
    this.state.isAnalyzing = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    console.log('[PRODUCTION-ANALYZER] Stopped analysis');
  }
  
  // 分析実行
  private performAnalysis(): void {
    try {
      const gameState = gameStateManager.getState();
      const timestamp = Date.now();
      
      // デバッグ情報
      console.log('[PRODUCTION-ANALYZER] Starting analysis, stars count:', gameState.stars?.length || 0);
      
      // 生産メトリクスの計算
      const metrics = this.calculateProductionMetrics(gameState);
      
      // デバッグ：生産量を表示
      console.log('[PRODUCTION-ANALYZER] Production metrics:', {
        totalProduction: metrics.totalProduction,
        celestialCount: gameState.stars?.length || 0
      });
      
      // ボトルネックの検出
      const bottlenecks = this.detectBottlenecks(gameState, metrics);
      
      // 資源予測
      const predictions = this.predictResources(gameState, metrics);
      
      // フロー分析
      const flowAnalysis = this.analyzeProductionFlow(gameState);
      
      // 最適化提案の生成
      const recommendations = this.generateRecommendations(bottlenecks, predictions, metrics);
      
      // レポート作成
      const report: AnalysisReport = {
        id: `report-${timestamp}`,
        timestamp,
        metrics,
        bottlenecks,
        predictions,
        flowAnalysis,
        recommendations
      };
      
      this.state.lastAnalysis = report;
      
      // 履歴更新
      this.updateHistory(gameState, timestamp);
      
      // イベント発火
      this.notifyAnalysisComplete(report);
    } catch (error) {
      console.error('[PRODUCTION-ANALYZER] Analysis failed:', error);
    }
  }
  
  // 生産メトリクスの計算
  private calculateProductionMetrics(gameState: any): ProductionMetrics {
    const metrics: ProductionMetrics = {
      totalProduction: {},
      totalConsumption: {},
      netProduction: {},
      efficiency: {},
      utilizationRate: 0,
      wastePercentage: 0
    };
    
    // 基本的な宇宙の塵生成（main.tsのロジックに基づく）
    const baseDustRate = 1; // balanceManager.getResourceRate('cosmicDust', gameState.dustUpgradeLevel) の簡略版
    let dustRate = baseDustRate + (gameState.researchEnhancedDust ? 2 : 0);
    
    // 研究による乗数適用
    if (gameState.research?.dustGenerationMultiplier) {
      dustRate *= gameState.research.dustGenerationMultiplier;
    }
    
    // 動的バランス乗数
    if (gameState.balancedRates?.cosmicDust) {
      dustRate *= gameState.balancedRates.cosmicDust;
    }
    
    metrics.totalProduction[ResourceType.COSMIC_DUST] = dustRate;
    
    // 各天体からの生産量を集計
    // gameState.starsに全ての天体が含まれている
    const celestialBodies = gameState.stars || [];
    celestialBodies.forEach((body: any) => {
      this.addCelestialProduction(body, metrics);
    });
    
    // 変換による消費と生産を計算
    const conversions = getResourceConversions();
    conversions.forEach(conversion => {
      // 変換レートから消費と生産を推定
      const conversionRate = this.estimateConversionRate(gameState, conversion);
      if (conversionRate > 0) {
        // 入力資源の消費
        conversion.inputs.forEach((input: any) => {
          const consumption = input.amount * conversionRate;
          metrics.totalConsumption[input.resource] = 
            (metrics.totalConsumption[input.resource] || 0) + consumption;
        });
        
        // 出力資源の生産
        conversion.outputs.forEach((output: any) => {
          const production = output.amount * conversionRate;
          metrics.totalProduction[output.resource] = 
            (metrics.totalProduction[output.resource] || 0) + production;
        });
      }
    });
    
    // ネット生産量と効率を計算（基本リソースのみ）
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    basicResources.forEach(resource => {
      const production = metrics.totalProduction[resource] || 0;
      const consumption = metrics.totalConsumption[resource] || 0;
      metrics.netProduction[resource] = production - consumption;
      
      if (production > 0) {
        metrics.efficiency[resource] = Math.max(0, 1 - (consumption / production));
      } else {
        metrics.efficiency[resource] = 0;
      }
    });
    
    // 全体的な利用率を計算
    const totalCapacity = this.calculateTotalCapacity(gameState);
    const totalUsage = Object.values(metrics.totalProduction).reduce((sum, val) => sum + (val || 0), 0);
    metrics.utilizationRate = totalCapacity > 0 ? Math.min(1, totalUsage / totalCapacity) : 0;
    
    // 廃棄率を計算（効率の逆数の平均）
    const efficiencyValues = Object.values(metrics.efficiency).filter(val => val !== undefined) as number[];
    if (efficiencyValues.length > 0) {
      const avgEfficiency = efficiencyValues.reduce((sum, val) => sum + val, 0) / efficiencyValues.length;
      metrics.wastePercentage = (1 - avgEfficiency) * 100;
    }
    
    return metrics;
  }
  
  // 天体からの生産を追加
  private addCelestialProduction(celestial: any, metrics: ProductionMetrics): void {
    const celestialType = celestial.userData?.type;
    
    // main.tsの実際のロジックに基づいて計算
    switch (celestialType) {
      case 'star':
        // 恒星はエネルギーを生成（質量に基づく）
        const energyRate = (celestial.userData.mass as number) / 1000;
        metrics.totalProduction[ResourceType.ENERGY] = 
          (metrics.totalProduction[ResourceType.ENERGY] || 0) + energyRate;
        break;
        
      case 'black_hole':
        // ブラックホールはダークマターを生成
        const darkMatterRate = Math.log10((celestial.userData.mass as number) + 1) * 0.001;
        metrics.totalProduction[ResourceType.DARK_MATTER] = 
          (metrics.totalProduction[ResourceType.DARK_MATTER] || 0) + darkMatterRate;
        break;
        
      case 'asteroid':
      case 'comet':
        // 小惑星と彗星は宇宙の塵を生成
        metrics.totalProduction[ResourceType.COSMIC_DUST] = 
          (metrics.totalProduction[ResourceType.COSMIC_DUST] || 0) + 0.5;
        break;
        
      case 'planet':
        // 惑星は生命がある場合、追加の資源を生成
        const planetData = celestial.userData as any;
        if (planetData.hasLife) {
          const lifeStage = planetData.lifeStage;
          const population = planetData.population || 0;
          
          switch (lifeStage) {
            case 'microbial':
              metrics.totalProduction[ResourceType.ORGANIC_MATTER] = 
                (metrics.totalProduction[ResourceType.ORGANIC_MATTER] || 0) + 0.1;
              break;
            case 'plant':
              metrics.totalProduction[ResourceType.ORGANIC_MATTER] = 
                (metrics.totalProduction[ResourceType.ORGANIC_MATTER] || 0) + 0.5;
              metrics.totalProduction[ResourceType.BIOMASS] = 
                (metrics.totalProduction[ResourceType.BIOMASS] || 0) + 0.2;
              break;
            case 'animal':
              metrics.totalProduction[ResourceType.BIOMASS] = 
                (metrics.totalProduction[ResourceType.BIOMASS] || 0) + 1.0;
              break;
            case 'intelligent':
              // 知的生命体は思考ポイントを生成
              const thoughtRate = population * 0.001;
              metrics.totalProduction[ResourceType.THOUGHT_POINTS] = 
                (metrics.totalProduction[ResourceType.THOUGHT_POINTS] || 0) + thoughtRate;
              metrics.totalProduction[ResourceType.BIOMASS] = 
                (metrics.totalProduction[ResourceType.BIOMASS] || 0) + 0.5;
              break;
          }
        }
        break;
    }
  }
  
  // 変換レートの推定
  private estimateConversionRate(gameState: any, conversion: any): number {
    // 簡略化された推定（実際にはより複雑なロジックが必要）
    let canAfford = true;
    conversion.inputs.forEach((input: any) => {
      const available = gameState.resources[input.resource] || 0;
      if (available < input.amount) {
        canAfford = false;
      }
    });
    
    return canAfford ? 1 : 0; // 1秒あたりの変換回数
  }
  
  // 総生産能力の計算
  private calculateTotalCapacity(gameState: any): number {
    // 天体数と研究レベルに基づく理論上の最大生産能力
    const celestialCount = gameState.stars?.length || 0;
    const researchMultiplier = gameState.research?.allResourceMultiplier || 1;
    
    return celestialCount * 200 * researchMultiplier; // 簡略化された計算
  }
  
  // ボトルネック検出
  private detectBottlenecks(gameState: any, metrics: ProductionMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // 基本リソースのみチェック
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    // 資源ごとのボトルネックチェック
    basicResources.forEach(resource => {
      const netProduction = metrics.netProduction[resource] || 0;
      const currentAmount = gameState.resources[resource] || 0;
      const efficiency = metrics.efficiency[resource] || 0;
      
      // 生産不足チェック
      if (netProduction < 0 && currentAmount < 1000) {
        bottlenecks.push({
          id: `bottleneck-${resource}-production`,
          type: 'input',
          resource,
          severity: currentAmount < 100 ? 'critical' : 'high',
          description: `${resource}の生産が消費に追いついていません`,
          impact: Math.min(100, Math.abs(netProduction) / 10),
          suggestions: this.generateProductionSuggestions(resource)
        });
      }
      
      // 効率低下チェック
      if (efficiency < 0.5 && efficiency > 0) {
        bottlenecks.push({
          id: `bottleneck-${resource}-efficiency`,
          type: 'conversion',
          resource,
          severity: efficiency < 0.2 ? 'high' : 'medium',
          description: `${resource}の変換効率が低下しています`,
          impact: (1 - efficiency) * 50,
          suggestions: this.generateEfficiencySuggestions(resource)
        });
      }
      
      // ストレージ上限チェック
      if (currentAmount > 90000) { // 仮の上限値
        bottlenecks.push({
          id: `bottleneck-${resource}-storage`,
          type: 'storage',
          resource,
          severity: 'medium',
          description: `${resource}がストレージ上限に近づいています`,
          impact: 30,
          suggestions: this.generateStorageSuggestions(resource)
        });
      }
    });
    
    return bottlenecks;
  }
  
  // 生産改善提案の生成
  private generateProductionSuggestions(resource: ResourceType): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // 天体作成提案
    const celestialSuggestions: { [key: string]: string } = {
      [ResourceType.ENERGY]: 'star',
      [ResourceType.COSMIC_DUST]: 'asteroid',
      [ResourceType.ORGANIC_MATTER]: 'planet'
    };
    
    const suggestedType = celestialSuggestions[resource];
    if (suggestedType) {
      suggestions.push({
        id: `suggest-create-${suggestedType}`,
        title: `${suggestedType}を作成`,
        description: `${resource}の生産を増やすため、${suggestedType}を作成することを推奨します`,
        expectedImprovement: 20,
        priority: 'high',
        actionType: 'celestial_create'
      });
    }
    
    // 研究提案
    suggestions.push({
      id: `suggest-research-${resource}`,
      title: `${resource}生産研究`,
      description: `${resource}の生産効率を向上させる研究を行いましょう`,
      expectedImprovement: 30,
      priority: 'medium',
      actionType: 'research'
    });
    
    return suggestions;
  }
  
  // 効率改善提案の生成
  private generateEfficiencySuggestions(resource: ResourceType): OptimizationSuggestion[] {
    return [
      {
        id: `suggest-optimize-${resource}`,
        title: '変換プロセスの最適化',
        description: `${resource}の変換効率を改善するため、変換設定を見直してください`,
        expectedImprovement: 15,
        priority: 'medium',
        actionType: 'conversion_adjust'
      },
      {
        id: `suggest-automate-${resource}`,
        title: '自動化の導入',
        description: `${resource}の生産を自動化して効率を向上させましょう`,
        expectedImprovement: 25,
        priority: 'high',
        actionType: 'automation'
      }
    ];
  }
  
  // ストレージ改善提案の生成
  private generateStorageSuggestions(resource: ResourceType): OptimizationSuggestion[] {
    return [
      {
        id: `suggest-convert-${resource}`,
        title: '余剰資源の変換',
        description: `余剰の${resource}を他の資源に変換しましょう`,
        expectedImprovement: 10,
        priority: 'medium',
        actionType: 'conversion_adjust'
      }
    ];
  }
  
  // 資源予測
  private predictResources(gameState: any, metrics: ProductionMetrics): ResourcePrediction[] {
    const predictions: ResourcePrediction[] = [];
    
    // 基本リソースのみ予測
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    basicResources.forEach(resource => {
      const currentAmount = gameState.resources[resource] || 0;
      const netProduction = metrics.netProduction[resource] || 0;
      const history = this.historyBuffer.get(resource) || [];
      
      // トレンド分析
      const trend = this.analyzeTrend(history);
      
      // 予測時間枠（1時間）
      const timeframe = 3600;
      const predictedAmount = Math.max(0, currentAmount + (netProduction * timeframe));
      
      // 枯渇時間の計算
      let depletionTime: number | undefined;
      if (netProduction < 0 && currentAmount > 0) {
        depletionTime = currentAmount / Math.abs(netProduction);
      }
      
      // 信頼度（履歴データの安定性に基づく）
      const confidenceLevel = this.calculateConfidence(history, trend);
      
      predictions.push({
        resource,
        currentAmount,
        predictedAmount,
        timeframe,
        trend,
        depletionTime,
        confidenceLevel
      });
    });
    
    return predictions;
  }
  
  // トレンド分析
  private analyzeTrend(history: TimeSeriesDataPoint[]): 'increasing' | 'stable' | 'decreasing' | 'depleting' {
    if (history.length < 5) return 'stable';
    
    // 最近の5ポイントの傾向を分析
    const recentPoints = history.slice(-5);
    const firstValue = recentPoints[0].value;
    const lastValue = recentPoints[recentPoints.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? (change / firstValue) * 100 : 0;
    
    if (lastValue <= 0) return 'depleting';
    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }
  
  // 予測信頼度の計算
  private calculateConfidence(history: TimeSeriesDataPoint[], trend: string): number {
    if (history.length < 10) return 0.3;
    
    // 分散を計算して安定性を評価
    const values = history.slice(-10).map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficientOfVariation = mean !== 0 ? Math.sqrt(variance) / mean : 1;
    
    // 変動係数が小さいほど信頼度が高い
    return Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));
  }
  
  // 生産フロー分析
  private analyzeProductionFlow(gameState: any): ProductionFlow[] {
    const flows: ProductionFlow[] = [];
    const conversions = getResourceConversions();
    
    conversions.forEach((conversion, index) => {
      const rate = this.estimateConversionRate(gameState, conversion);
      if (rate > 0) {
        // 各変換を個別のフローとして記録
        conversion.inputs.forEach((input: any) => {
          conversion.outputs.forEach((output: any) => {
            flows.push({
              id: `flow-${index}-${input.resource}-${output.resource}`,
              fromResource: input.resource,
              toResource: output.resource,
              rate: rate * (output.amount / input.amount),
              efficiency: conversion.efficiency || 1,
              timestamp: Date.now()
            });
          });
        });
      }
    });
    
    return flows;
  }
  
  // 最適化提案の生成
  private generateRecommendations(
    bottlenecks: Bottleneck[], 
    predictions: ResourcePrediction[], 
    metrics: ProductionMetrics
  ): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = [];
    
    // ボトルネックからの提案を収集
    bottlenecks.forEach(bottleneck => {
      recommendations.push(...bottleneck.suggestions);
    });
    
    // 予測に基づく提案
    predictions.forEach(prediction => {
      if (prediction.trend === 'depleting' && prediction.depletionTime && prediction.depletionTime < 300) {
        recommendations.push({
          id: `urgent-${prediction.resource}`,
          title: `緊急: ${prediction.resource}が枯渇します`,
          description: `${Math.floor(prediction.depletionTime)}秒以内に${prediction.resource}が枯渇します。早急な対策が必要です`,
          expectedImprovement: 50,
          priority: 'high',
          actionType: 'celestial_create'
        });
      }
    });
    
    // 全体効率に基づく提案
    if (metrics.utilizationRate < 0.5) {
      recommendations.push({
        id: 'low-utilization',
        title: '生産能力の活用',
        description: '生産能力の利用率が低いです。より多くの天体を作成することを検討してください',
        expectedImprovement: 30,
        priority: 'medium',
        actionType: 'celestial_create'
      });
    }
    
    // 重複を除去し、優先度でソート
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(r => [r.id, r])).values()
    );
    
    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  // 履歴更新
  private updateHistory(gameState: any, timestamp: number): void {
    // 基本リソースのみ更新
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    basicResources.forEach(resource => {
      const amount = gameState.resources[resource] || 0;
      const buffer = this.historyBuffer.get(resource) || [];
      
      buffer.push({ timestamp, value: amount });
      
      // バッファサイズ制限
      if (buffer.length > this.MAX_HISTORY_POINTS) {
        buffer.shift();
      }
      
      this.historyBuffer.set(resource, buffer);
      
      // 集約された履歴の更新（1分ごと）
      const history = this.state.history.get(resource);
      if (history) {
        const lastPoint = history.dataPoints[history.dataPoints.length - 1];
        if (!lastPoint || timestamp - lastPoint.timestamp >= 60000) {
          history.dataPoints.push({ timestamp, value: amount });
          
          // 履歴サイズ制限
          if (history.dataPoints.length > 100) {
            history.dataPoints.shift();
          }
        }
      }
    });
  }
  
  // 分析完了通知
  private notifyAnalysisComplete(report: AnalysisReport): void {
    // カスタムイベントを発火
    const event = new CustomEvent('productionAnalysisComplete', { 
      detail: report 
    });
    window.dispatchEvent(event);
  }
  
  // 公開メソッド
  
  // 最新の分析レポートを取得
  getLatestReport(): AnalysisReport | undefined {
    return this.state.lastAnalysis;
  }
  
  // 特定資源の履歴を取得
  getResourceHistory(resource: ResourceType): ProductionHistory | undefined {
    return this.state.history.get(resource);
  }
  
  // 天体別の生産統計を取得
  getCelestialProductionStats(): CelestialProductionStats[] {
    const gameState = gameStateManager.getState();
    const stats: CelestialProductionStats[] = [];
    
    // GameStateにcelestialBodiesが存在しない場合はstarsを使用
    const celestialBodies = (gameState as any).celestialBodies || gameState.stars || [];
    const totalProduction = this.state.lastAnalysis?.metrics.totalProduction || {};
    
    celestialBodies.forEach((body: any) => {
      const celestialType = body.userData?.type as CelestialType;
      const production = this.getCelestialProduction(celestialType);
      const totalAmount = Object.values(production).reduce((sum, val) => sum + (val || 0), 0);
      const totalSystemProduction = Object.values(totalProduction).reduce((sum, val) => sum + (val || 0), 0);
      
      stats.push({
        celestialId: body.userData?.id || 'unknown',
        celestialType,
        position: body.position,
        production,
        efficiency: 1, // 簡略化
        contribution: totalSystemProduction > 0 ? (totalAmount / totalSystemProduction) * 100 : 0
      });
    });
    
    return stats;
  }
  
  // 天体タイプごとの生産量を取得
  private getCelestialProduction(type: CelestialType): { [key in ResourceType]?: number } {
    // 平均的な生産量を返す（実際の生産は天体の属性に依存）
    const productionRates: { [key: string]: { [key in ResourceType]?: number } } = {
      'star': {
        [ResourceType.ENERGY]: 1 // 質量1000あたり1
      },
      'planet': {
        // 生命がある場合のみ生産
        [ResourceType.ORGANIC_MATTER]: 0.3,
        [ResourceType.BIOMASS]: 0.5,
        [ResourceType.THOUGHT_POINTS]: 0.001
      },
      'asteroid': {
        [ResourceType.COSMIC_DUST]: 0.5
      },
      'comet': {
        [ResourceType.COSMIC_DUST]: 0.5
      },
      'black_hole': {
        [ResourceType.DARK_MATTER]: 0.001
      }
    };
    
    return productionRates[type] || {};
  }
  
  // フィルター設定
  setFilter(filter: AnalysisFilter): void {
    this.state.activeFilters = filter;
  }
  
  // 分析間隔の設定
  setUpdateInterval(interval: number): void {
    this.state.updateInterval = Math.max(1000, interval); // 最小1秒
    
    // 実行中の場合は再起動
    if (this.state.isAnalyzing) {
      this.stop();
      this.start();
    }
  }
  
  // 状態を取得
  getState(): AnalysisState {
    return { ...this.state };
  }
}

export const productionAnalyzer = ProductionAnalyzer.getInstance();