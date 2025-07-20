import { GameState } from '../state.js';

// Save/Load System Types
export interface SaveData {
  gameState: GameState;
  lastSaveTime: number;
  offlineTime?: number;
  version: string;
  checksum?: string;
}

export interface SaveMetadata {
  id: string;
  name: string;
  timestamp: number;
  gameYear: number;
  totalPlayTime: number;
  version: string;
}

// Offline Progress Types
export interface OfflineProgress {
  duration: number;  // Offline time in milliseconds
  resources: ResourceGains;
  events: OfflineEvent[];
  summary: OfflineSummary;
}

export interface ResourceGains {
  cosmicDust: number;
  energy: number;
  organicMatter: number;
  biomass: number;
  darkMatter: number;
  thoughtPoints: number;
}

export interface OfflineEvent {
  timestamp: number;
  type: 'star_birth' | 'planet_formation' | 'life_evolution' | 'resource_bonus';
  description: string;
  gains?: Partial<ResourceGains>;
}

export interface OfflineSummary {
  totalGains: ResourceGains;
  eventsCount: number;
  effectiveTime: number;  // Actual time calculated (capped at max)
  cappedTime: boolean;    // Whether offline time was capped
}

// Error Handling Types
export interface GameError {
  code: string;
  message: string;
  context?: string;
  timestamp: number;
  recoverable: boolean;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'reset' | 'ignore';
  maxRetries?: number;
  fallbackValue?: any;
}

// Performance Types
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;  // Time to live in milliseconds
}

export interface PerformanceConfig {
  enableCaching: boolean;
  cacheSize: number;
  batchUpdateInterval: number;
  maxOfflineTime: number;  // Maximum offline time in hours
}

// Notification Types
export interface GameNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: number;
}

// Constants
export const GAME_VERSION = '0.1.0';
export const MAX_OFFLINE_TIME = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
export const SAVE_COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB