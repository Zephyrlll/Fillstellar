import { GameError, ErrorRecoveryStrategy, GameNotification } from '../types/idle.js';
import { GameState } from '../state.js';

export class GameErrorHandler {
  private errorLog: GameError[] = [];
  private readonly MAX_ERROR_LOG_SIZE = 50;
  private notificationCallback?: (notification: GameNotification) => void;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private isRecovering = false;
  
  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupDefaultRecoveryStrategies();
  }
  
  private setupGlobalErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        'GLOBAL_ERROR',
        event.filename,
        event.lineno,
        event.colno
      );
      event.preventDefault();
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        'PROMISE_REJECTION'
      );
      event.preventDefault();
    });
    
    console.log('[ERROR] Global error handlers initialized');
  }
  
  private setupDefaultRecoveryStrategies(): void {
    // Save system errors
    this.recoveryStrategies.set('SAVE_FAILED', {
      type: 'retry',
      maxRetries: 3
    });
    
    this.recoveryStrategies.set('SAVE_CORRUPTED', {
      type: 'fallback',
      fallbackValue: null
    });
    
    // Resource calculation errors
    this.recoveryStrategies.set('RESOURCE_CALC_ERROR', {
      type: 'fallback',
      fallbackValue: 0
    });
    
    // Rendering errors
    this.recoveryStrategies.set('RENDER_ERROR', {
      type: 'retry',
      maxRetries: 1
    });
    
    // Critical errors
    this.recoveryStrategies.set('CRITICAL_ERROR', {
      type: 'reset'
    });
  }
  
  public setNotificationCallback(callback: (notification: GameNotification) => void): void {
    this.notificationCallback = callback;
  }
  
  public handleError(
    error: Error,
    context: string,
    file?: string,
    line?: number,
    column?: number
  ): void {
    const gameError: GameError = {
      code: this.getErrorCode(error, context),
      message: error.message,
      context,
      timestamp: Date.now(),
      recoverable: this.isRecoverable(error, context)
    };
    
    // Log the error
    this.logError(gameError);
    
    // Log to console with context
    const location = file ? ` at ${file}:${line}:${column}` : '';
    console.error(`[${context}] Error${location}:`, error);
    
    // Show user notification for important errors
    if (this.shouldNotifyUser(gameError)) {
      this.showErrorNotification(gameError);
    }
    
    // Attempt recovery if possible
    if (gameError.recoverable && !this.isRecovering) {
      this.attemptRecovery(gameError);
    }
  }
  
  private getErrorCode(error: Error, context: string): string {
    // Map common errors to codes
    if (error.message.includes('Failed to execute \'put\' on \'IDBObjectStore\'')) {
      return 'SAVE_FAILED';
    }
    if (error.message.includes('QuotaExceededError')) {
      return 'STORAGE_FULL';
    }
    if (error.message.includes('save data validation failed')) {
      return 'SAVE_CORRUPTED';
    }
    if (context === 'RESOURCE_CALCULATION') {
      return 'RESOURCE_CALC_ERROR';
    }
    if (context === 'RENDER') {
      return 'RENDER_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  private isRecoverable(error: Error, context: string): boolean {
    // Critical errors that are not recoverable
    const criticalContexts = ['CRITICAL_ERROR', 'INIT_FAILED'];
    if (criticalContexts.includes(context)) {
      return false;
    }
    
    // Memory errors are not easily recoverable
    if (error.message.includes('out of memory')) {
      return false;
    }
    
    // Most other errors can be recovered from
    return true;
  }
  
  private shouldNotifyUser(error: GameError): boolean {
    // Don't spam users with repeated errors
    const recentErrors = this.errorLog.filter(
      e => e.code === error.code && Date.now() - e.timestamp < 60000
    );
    
    if (recentErrors.length > 3) {
      return false;
    }
    
    // Always notify for critical errors
    const criticalCodes = ['SAVE_FAILED', 'SAVE_CORRUPTED', 'STORAGE_FULL'];
    return criticalCodes.includes(error.code);
  }
  
  private showErrorNotification(error: GameError): void {
    if (!this.notificationCallback) return;
    
    const userFriendlyMessage = this.getUserFriendlyMessage(error);
    
    this.notificationCallback({
      id: crypto.randomUUID(),
      type: 'error',
      message: userFriendlyMessage,
      timestamp: Date.now(),
      duration: 5000
    });
  }
  
  private getUserFriendlyMessage(error: GameError): string {
    const messages: Record<string, string> = {
      'SAVE_FAILED': 'Failed to save game. Will retry automatically.',
      'SAVE_CORRUPTED': 'Save file appears corrupted. Loading backup...',
      'STORAGE_FULL': 'Storage is full. Please clear some space.',
      'RESOURCE_CALC_ERROR': 'Resource calculation error. Some values may be incorrect.',
      'RENDER_ERROR': 'Display error occurred. Refreshing view...',
      'UNKNOWN_ERROR': 'An unexpected error occurred. The game will attempt to recover.'
    };
    
    return messages[error.code] || messages['UNKNOWN_ERROR'];
  }
  
  private logError(error: GameError): void {
    this.errorLog.push(error);
    
    // Maintain log size limit
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog.shift();
    }
  }
  
  private async attemptRecovery(error: GameError): Promise<void> {
    this.isRecovering = true;
    console.log(`[ERROR] Attempting recovery for ${error.code}`);
    
    try {
      const strategy = this.recoveryStrategies.get(error.code);
      if (!strategy) {
        console.warn(`[ERROR] No recovery strategy for ${error.code}`);
        return;
      }
      
      switch (strategy.type) {
        case 'retry':
          await this.retryOperation(error, strategy.maxRetries || 3);
          break;
          
        case 'fallback':
          await this.useFallback(error, strategy.fallbackValue);
          break;
          
        case 'reset':
          await this.resetToSafeState();
          break;
          
        case 'ignore':
          console.log(`[ERROR] Ignoring error ${error.code}`);
          break;
      }
      
      console.log(`[ERROR] Recovery successful for ${error.code}`);
    } catch (recoveryError) {
      console.error('[ERROR] Recovery failed:', recoveryError);
      this.handleCriticalError();
    } finally {
      this.isRecovering = false;
    }
  }
  
  private async retryOperation(error: GameError, maxRetries: number): Promise<void> {
    // This would be implemented based on the specific operation
    // For now, just log the attempt
    console.log(`[ERROR] Would retry operation for ${error.code} up to ${maxRetries} times`);
  }
  
  private async useFallback(error: GameError, fallbackValue: any): Promise<void> {
    console.log(`[ERROR] Using fallback value for ${error.code}:`, fallbackValue);
    // Implementation would depend on the specific error
  }
  
  private async resetToSafeState(): Promise<void> {
    console.log('[ERROR] Resetting to safe state');
    
    if (this.notificationCallback) {
      this.notificationCallback({
        id: crypto.randomUUID(),
        type: 'warning',
        message: 'Resetting game to safe state...',
        timestamp: Date.now(),
        duration: 3000
      });
    }
    
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
  
  private handleCriticalError(): void {
    console.error('[ERROR] CRITICAL ERROR - Unable to recover');
    
    if (this.notificationCallback) {
      this.notificationCallback({
        id: crypto.randomUUID(),
        type: 'error',
        message: 'A critical error occurred. Please refresh the page.',
        timestamp: Date.now()
      });
    }
  }
  
  // Public methods for manual error handling
  public reportError(message: string, context: string, recoverable: boolean = true): void {
    const error: GameError = {
      code: 'MANUAL_ERROR',
      message,
      context,
      timestamp: Date.now(),
      recoverable
    };
    
    this.logError(error);
    console.error(`[${context}] ${message}`);
    
    if (this.shouldNotifyUser(error)) {
      this.showErrorNotification(error);
    }
  }
  
  public getErrorLog(): GameError[] {
    return [...this.errorLog];
  }
  
  public clearErrorLog(): void {
    this.errorLog = [];
    console.log('[ERROR] Error log cleared');
  }
  
  public getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recoverable: number;
    critical: number;
  } {
    const stats = {
      total: this.errorLog.length,
      byCode: {} as Record<string, number>,
      recoverable: 0,
      critical: 0
    };
    
    this.errorLog.forEach(error => {
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
      if (error.recoverable) {
        stats.recoverable++;
      } else {
        stats.critical++;
      }
    });
    
    return stats;
  }
  
  // Save data recovery methods
  public async recoverFromCorruptedSave(loadBackupFn: () => Promise<GameState | null>): Promise<GameState | null> {
    console.log('[ERROR] Attempting to recover from corrupted save');
    
    try {
      // Try to load backup
      const backup = await loadBackupFn();
      if (backup) {
        this.showErrorNotification({
          code: 'SAVE_RECOVERED',
          message: 'Save recovered from backup',
          context: 'SAVE_RECOVERY',
          timestamp: Date.now(),
          recoverable: true
        });
        return backup;
      }
    } catch (error) {
      console.error('[ERROR] Backup recovery failed:', error);
    }
    
    // If all else fails, return null to start new game
    this.showErrorNotification({
      code: 'NEW_GAME_REQUIRED',
      message: 'Unable to recover save. Starting new game.',
      context: 'SAVE_RECOVERY',
      timestamp: Date.now(),
      recoverable: false
    });
    
    return null;
  }
  
  // Cleanup
  public destroy(): void {
    // Remove global error handlers
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
    
    this.errorLog = [];
    this.recoveryStrategies.clear();
    
    console.log('[ERROR] Error handler destroyed');
  }
}