# Phase 0: 基礎システム実装（シングルプレイ専用）

## 概要
アイドルゲーム化の前提となる基礎システムを実装。シングルプレイに特化し、ローカルストレージベースで高速に実装。

## 0.1 ローカルセーブシステム（1週間）

### 実装内容
```typescript
// saveSystem.ts
interface SaveData {
  gameState: GameState;
  lastSaveTime: number;
  offlineTime?: number;
  version: string;
}

class SaveSystem {
  private readonly SAVE_KEY = 'cosmic_gardener_save';
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30秒
  
  // IndexedDBを使用（大量データ対応）
  async save(gameState: GameState): Promise<void> {
    const saveData: SaveData = {
      gameState,
      lastSaveTime: Date.now(),
      version: GAME_VERSION
    };
    await this.writeToIndexedDB(saveData);
  }
  
  // 自動セーブ
  startAutoSave(): void {
    setInterval(() => this.save(gameState), this.AUTO_SAVE_INTERVAL);
  }
  
  // 圧縮対応（オプション）
  async saveCompressed(gameState: GameState): Promise<void> {
    const compressed = LZString.compress(JSON.stringify(gameState));
    localStorage.setItem(this.SAVE_KEY, compressed);
  }
}
```

### チェックリスト
- [ ] IndexedDB実装（大量データ対応）
- [ ] 自動セーブ（30秒間隔）
- [ ] 手動セーブボタン
- [ ] セーブ成功通知
- [ ] データ圧縮オプション（LZ-string）
- [ ] セーブデータ破損対策（バックアップ）

## 0.2 オフライン時間計算基盤（3日）

### 実装内容
```typescript
// offlineProgress.ts
interface OfflineProgress {
  duration: number;  // オフライン時間（ミリ秒）
  resources: ResourceMap;  // 獲得資源
  events: OfflineEvent[];  // 発生イベント
}

class OfflineCalculator {
  calculateProgress(lastSaveTime: number): OfflineProgress {
    const now = Date.now();
    const duration = Math.min(now - lastSaveTime, MAX_OFFLINE_TIME);
    
    // シンプルな計算（後でPhase 1で詳細実装）
    const baseProduction = this.getBaseProduction();
    const resources = this.calculateResources(baseProduction, duration);
    
    return { duration, resources, events: [] };
  }
}
```

### チェックリスト
- [ ] タイムスタンプ管理
- [ ] 最大オフライン時間設定（初期: 12時間）
- [ ] 基本的な資源計算ロジック
- [ ] オフライン進行のON/OFF設定

## 0.3 パフォーマンス最適化（3日）

### 実装内容
```typescript
// performanceOptimizer.ts
class PerformanceOptimizer {
  // 大量オブジェクトの効率的な更新
  batchUpdate(bodies: CelestialBody[]): void {
    requestAnimationFrame(() => {
      bodies.forEach(body => this.updateBody(body));
    });
  }
  
  // 計算結果のキャッシュ
  private cache = new Map<string, any>();
  
  getCachedValue<T>(key: string, calculator: () => T): T {
    if (!this.cache.has(key)) {
      this.cache.set(key, calculator());
    }
    return this.cache.get(key);
  }
}
```

### チェックリスト
- [ ] requestAnimationFrameの適切な使用
- [ ] 計算結果のキャッシング
- [ ] 不要な再レンダリング防止
- [ ] メモリリーク対策
- [ ] Web Worker準備（将来の拡張用）

## 0.4 エラーハンドリング強化（2日）

### 実装内容
```typescript
// errorHandler.ts
class GameErrorHandler {
  handleError(error: Error, context: string): void {
    console.error(`[${context}] Error:`, error);
    
    // ユーザーへの通知
    this.showErrorNotification(error.message);
    
    // 復旧試行
    if (this.isRecoverable(error)) {
      this.attemptRecovery(context);
    }
  }
  
  // セーブデータ破損時の復旧
  recoverFromCorruptedSave(): void {
    const backup = this.loadBackupSave();
    if (backup) {
      this.restoreFromBackup(backup);
    } else {
      this.startNewGame();
    }
  }
}
```

### チェックリスト
- [ ] グローバルエラーハンドラー
- [ ] セーブデータ破損時の復旧
- [ ] ユーザーフレンドリーなエラー表示
- [ ] エラーログ収集（デバッグ用）
- [ ] 自動リトライ機能

## 実装スケジュール
- **Week 1**: セーブシステム + オフライン計算基盤
- **Week 2**: パフォーマンス最適化 + エラーハンドリング

## 技術スタック（シングルプレイ特化）
- **ストレージ**: IndexedDB（メイン）+ LocalStorage（設定）
- **圧縮**: LZ-string（オプション）
- **エラー追跡**: 簡易ログシステム
- **パフォーマンス**: requestAnimationFrame + キャッシング

## 成功基準
- [ ] 100MB以上のセーブデータでも高速動作
- [ ] オフライン12時間分の計算が1秒以内
- [ ] セーブ失敗率 < 0.1%
- [ ] 自動復旧成功率 > 95%