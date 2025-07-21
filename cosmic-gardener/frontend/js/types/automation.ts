/**
 * Automation System Types
 * 自動化システムの型定義
 */

import { ResourceType } from '../resourceSystem.js';

// CelestialTypeをenumとして定義
export enum CelestialType {
  STAR = 'star',
  PLANET = 'planet',
  MOON = 'moon',
  ASTEROID = 'asteroid',
  COMET = 'comet',
  BLACK_HOLE = 'black_hole'
}

// 自動化タイプ
export enum AutomationType {
  CELESTIAL_CREATION = 'celestial_creation',
  RESOURCE_CONVERSION = 'resource_conversion',
  RESEARCH_PROGRESSION = 'research_progression'
}

// 条件タイプ
export enum ConditionType {
  RESOURCE_AMOUNT = 'resource_amount',
  CELESTIAL_COUNT = 'celestial_count',
  SPACE_DENSITY = 'space_density',
  TIME_ELAPSED = 'time_elapsed',
  RESEARCH_COMPLETED = 'research_completed'
}

// 比較演算子
export enum ComparisonOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUAL = '=',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<='
}

// 論理演算子
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR'
}

// 自動化条件
export interface AutomationCondition {
  type: ConditionType;
  target?: string; // リソースタイプやresearch IDなど
  operator: ComparisonOperator;
  value: number;
}

// 条件グループ
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: AutomationCondition[];
}

// 天体自動作成設定
export interface CelestialAutoCreateConfig {
  enabled: boolean;
  celestialType: CelestialType;
  conditions: ConditionGroup;
  interval: number; // ミリ秒
  maxPerCycle: number;
  priorityPosition?: 'random' | 'near_existing' | 'empty_space';
}

// 資源自動変換設定
export interface ResourceBalancerConfig {
  enabled: boolean;
  targetLevels: Map<ResourceType, number>;
  priorityOrder: ResourceType[];
  conversionThreshold: number; // 変換を開始する閾値（%）
  maxConversionsPerCycle: number;
}

// 研究キュー項目
export interface ResearchQueueItem {
  researchId: string;
  priority: number;
  addedAt: number;
}

// 研究自動進行設定
export interface ResearchQueueConfig {
  enabled: boolean;
  queue: ResearchQueueItem[];
  maxQueueSize: number;
  autoAddSuggestions: boolean;
}

// 自動化効率修正
export interface AutomationEfficiency {
  intervalMultiplier: number; // 実行間隔の倍率（小さいほど頻繁）
  conditionCheckSpeed: number; // 条件チェック速度倍率
  resourceEfficiency: number; // リソース消費効率
  maxParallelTasks: number; // 並列実行可能タスク数
}

// 自動化タスク実行結果
export interface AutomationResult {
  success: boolean;
  type: AutomationType;
  message?: string;
  resourcesUsed?: { [key: string]: number };
  itemsCreated?: number;
  error?: string;
}

// 自動化統計
export interface AutomationStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  resourcesSaved: { [key: string]: number };
  celestialsCreated: { [type: string]: number };
  researchCompleted: number;
  lastExecutionTime: number;
}

// 自動化システム全体の状態
export interface AutomationState {
  celestialAutoCreate: CelestialAutoCreateConfig;
  resourceBalancer: ResourceBalancerConfig;
  researchQueue: ResearchQueueConfig;
  efficiency: AutomationEfficiency;
  statistics: AutomationStatistics;
  isActive: boolean;
  isPaused: boolean;
}

// 自動化研究
export interface AutomationResearch {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: { [key: string]: number };
  duration: number;
  prerequisites: string[];
  effects: {
    unlockFeature?: AutomationType;
    efficiencyBonus?: Partial<AutomationEfficiency>;
    newConditionTypes?: ConditionType[];
    additionalOptions?: string[];
  };
}