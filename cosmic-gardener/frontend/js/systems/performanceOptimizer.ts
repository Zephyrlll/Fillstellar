import { CacheEntry, PerformanceConfig } from '../types/idle.js';

export class PerformanceOptimizer {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private updateQueue: Map<string, () => void> = new Map();
  private batchUpdateTimer: number | null = null;
  private config: PerformanceConfig = {
    enableCaching: true,
    cacheSize: 100,
    batchUpdateInterval: 16, // ~60fps
    maxOfflineTime: 12
  };
  
  constructor(config?: Partial<PerformanceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  // Cache management
  getCached<T>(key: string, calculator: () => T, ttl: number = 1000): T {
    if (!this.config.enableCaching) {
      return calculator();
    }
    
    const now = Date.now();
    const cached = this.cache.get(key);
    
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.value;
    }
    
    const value = calculator();
    this.setCache(key, value, ttl);
    return value;
  }
  
  setCache<T>(key: string, value: T, ttl: number = 1000): void {
    if (!this.config.enableCaching) return;
    
    // Maintain cache size limit
    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.findOldestCacheEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }
  
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      console.log('[PERF] Cache cleared');
      return;
    }
    
    // Clear entries matching pattern
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[PERF] Cleared ${keysToDelete.length} cache entries matching "${pattern}"`);
  }
  
  private findOldestCacheEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }
  
  // Batch update system
  queueUpdate(id: string, updateFn: () => void): void {
    this.updateQueue.set(id, updateFn);
    
    if (!this.batchUpdateTimer) {
      this.scheduleBatchUpdate();
    }
  }
  
  private scheduleBatchUpdate(): void {
    this.batchUpdateTimer = window.setTimeout(() => {
      this.processBatchUpdates();
    }, this.config.batchUpdateInterval);
  }
  
  private processBatchUpdates(): void {
    const startTime = performance.now();
    
    // Process all queued updates
    this.updateQueue.forEach(updateFn => {
      try {
        updateFn();
      } catch (error) {
        console.error('[PERF] Batch update error:', error);
      }
    });
    
    const updateCount = this.updateQueue.size;
    this.updateQueue.clear();
    this.batchUpdateTimer = null;
    
    const elapsed = performance.now() - startTime;
    if (elapsed > 16) {
      console.warn(`[PERF] Batch update took ${elapsed.toFixed(2)}ms for ${updateCount} updates`);
    }
  }
  
  // Performance monitoring
  measurePerformance<T>(operation: string, fn: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const elapsed = performance.now() - startTime;
      
      if (elapsed > 100) {
        console.warn(`[PERF] Slow operation "${operation}" took ${elapsed.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`[PERF] Operation "${operation}" failed:`, error);
      throw error;
    }
  }
  
  // Memory management
  getMemoryUsage(): { used: number; limit: number; percentage: number } {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    
    // Fallback for browsers without memory API
    return {
      used: 0,
      limit: 0,
      percentage: 0
    };
  }
  
  checkMemoryPressure(): boolean {
    const usage = this.getMemoryUsage();
    const threshold = 85; // 85% memory usage threshold
    
    if (usage.percentage > threshold) {
      console.warn(`[PERF] High memory usage: ${usage.percentage.toFixed(1)}%`);
      this.handleMemoryPressure();
      return true;
    }
    
    return false;
  }
  
  private handleMemoryPressure(): void {
    // Clear caches
    this.clearCache();
    
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('[PERF] Forced garbage collection');
    }
  }
  
  // Throttling and debouncing utilities
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: number | null = null;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall >= delay) {
        lastCall = now;
        fn(...args);
      } else {
        // Schedule call for remaining time
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now();
          fn(...args);
          timeoutId = null;
        }, delay - timeSinceLastCall);
      }
    };
  }
  
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  }
  
  // Animation frame management
  private animationFrameCallbacks: Map<string, (time: number) => void> = new Map();
  private animationFrameId: number | null = null;
  
  registerAnimationCallback(id: string, callback: (time: number) => void): void {
    this.animationFrameCallbacks.set(id, callback);
    
    if (!this.animationFrameId) {
      this.startAnimationLoop();
    }
  }
  
  unregisterAnimationCallback(id: string): void {
    this.animationFrameCallbacks.delete(id);
    
    if (this.animationFrameCallbacks.size === 0 && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  private startAnimationLoop(): void {
    const loop = (time: number) => {
      this.animationFrameCallbacks.forEach(callback => {
        try {
          callback(time);
        } catch (error) {
          console.error('[PERF] Animation callback error:', error);
        }
      });
      
      if (this.animationFrameCallbacks.size > 0) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }
  
  // Utility to optimize heavy calculations
  async calculateAsync<T>(
    operation: string,
    calculator: () => T,
    useWorker: boolean = false
  ): Promise<T> {
    if (!useWorker) {
      // Run in next tick to avoid blocking
      return new Promise<T>(resolve => {
        setTimeout(() => {
          const result = this.measurePerformance(operation, calculator);
          resolve(result);
        }, 0);
      });
    }
    
    // Web Worker support would go here
    // For now, fall back to setTimeout
    return this.calculateAsync(operation, calculator, false);
  }
  
  // Performance configuration
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[PERF] Configuration updated:', this.config);
  }
  
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }
  
  // Cleanup
  destroy(): void {
    this.cache.clear();
    this.updateQueue.clear();
    
    if (this.batchUpdateTimer) {
      clearTimeout(this.batchUpdateTimer);
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.animationFrameCallbacks.clear();
    
    console.log('[PERF] Performance optimizer destroyed');
  }
}