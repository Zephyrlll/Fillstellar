/**
 * Production Analysis Types
 * 生産効率分析システムの型定義
 */

import { ResourceType } from '../resourceSystem.js';
import { CelestialType } from './celestial.js';

// 生産フロー
export interface ProductionFlow {
  id: string;
  fromResource: ResourceType;
  toResource: ResourceType;
  rate: number; // per second
  efficiency: number; // 0-1
  timestamp: number;
}

// ボトルネック情報
export interface Bottleneck {
  id: string;
  type: 'input' | 'output' | 'conversion' | 'storage';
  resource: ResourceType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // 0-100
  suggestions: OptimizationSuggestion[];
}

// 最適化提案
export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  expectedImprovement: number; // percentage
  cost?: { [key: string]: number };
  priority: 'low' | 'medium' | 'high';
  actionType: 'celestial_create' | 'conversion_adjust' | 'research' | 'automation';
}

// 資源予測データ
export interface ResourcePrediction {
  resource: ResourceType;
  currentAmount: number;
  predictedAmount: number;
  timeframe: number; // seconds
  trend: 'increasing' | 'stable' | 'decreasing' | 'depleting';
  depletionTime?: number; // seconds until depletion
  confidenceLevel: number; // 0-1
}

// 生産効率メトリクス
export interface ProductionMetrics {
  totalProduction: { [key in ResourceType]?: number };
  totalConsumption: { [key in ResourceType]?: number };
  netProduction: { [key in ResourceType]?: number };
  efficiency: { [key in ResourceType]?: number };
  utilizationRate: number; // 0-1
  wastePercentage: number; // 0-100
}

// 時系列データポイント
export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

// 生産履歴
export interface ProductionHistory {
  resource: ResourceType;
  dataPoints: TimeSeriesDataPoint[];
  aggregationType: 'minute' | 'hour' | 'day';
}

// 分析レポート
export interface AnalysisReport {
  id: string;
  timestamp: number;
  metrics: ProductionMetrics;
  bottlenecks: Bottleneck[];
  predictions: ResourcePrediction[];
  flowAnalysis: ProductionFlow[];
  recommendations: OptimizationSuggestion[];
}

// 天体別生産統計
export interface CelestialProductionStats {
  celestialId: string;
  celestialType: CelestialType;
  position: { x: number; y: number; z: number };
  production: { [key in ResourceType]?: number };
  efficiency: number;
  contribution: number; // percentage of total production
}

// フィルター条件
export interface AnalysisFilter {
  resources?: ResourceType[];
  timeRange?: { start: number; end: number };
  celestialTypes?: CelestialType[];
  minEfficiency?: number;
  includeInactive?: boolean;
}

// グラフ設定
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'sankey' | 'heatmap';
  title: string;
  dataSource: 'production' | 'consumption' | 'efficiency' | 'flow';
  resources?: ResourceType[];
  timeRange?: number; // seconds to show
  updateInterval?: number; // milliseconds
}

// 分析システムの状態
export interface AnalysisState {
  isAnalyzing: boolean;
  lastAnalysis?: AnalysisReport;
  history: Map<ResourceType, ProductionHistory>;
  activeFilters: AnalysisFilter;
  chartConfigs: ChartConfig[];
  updateInterval: number; // milliseconds
}