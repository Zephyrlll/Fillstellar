# Phase 1: アイドルゲーム基盤システム（シングルプレイ特化版）

## 概要
Phase 0の基礎システムを前提に、アイドルゲームの核心機能を実装。UI改善要素も統合。

## 前提条件
- Phase 0完了（セーブシステム、オフライン計算基盤）
- cosmic-gardener/frontend/ での作業
- TypeScript + Three.js + Vite環境

## 1.1 オフライン進行システム（詳細実装）

### 実装内容
```typescript
// offlineProgress.ts
interface OfflineReport {
  duration: number;
  resources: {
    [key: string]: {
      amount: number;
      rate: number;
    };
  };
  events: string[];
  bonuses: number;
}

class OfflineProgressSystem {
  private readonly MAX_OFFLINE_HOURS = 12;
  
  calculateOfflineProgress(lastSaveTime: number): OfflineReport {
    const now = Date.now();
    const duration = Math.min(
      now - lastSaveTime,
      this.MAX_OFFLINE_HOURS * 3600 * 1000
    );
    
    // 各資源の生産量計算
    const resources = this.calculateResourceGains(duration);
    
    // 特別イベント（確率ベース）
    const events = this.generateOfflineEvents(duration);
    
    // 研究による効率ボーナス
    const efficiency = gameState.research.offlineEfficiency || 1.0;
    
    return {
      duration,
      resources: this.applyEfficiency(resources, efficiency),
      events,
      bonuses: efficiency
    };
  }
  
  // 復帰時のモーダル表示
  showOfflineReport(report: OfflineReport): void {
    const modal = new OfflineReportModal(report);
    modal.show();
  }
}
```

### チェックリスト
- [ ] オフライン時間計算（最大12時間）
- [ ] 資源ごとの生産量計算
- [ ] 研究による効率ボーナス適用
- [ ] 復帰時のアニメーション付きモーダル
- [ ] オフライン中のイベントログ生成

## 1.2 実績システム（シンプル版）

### 実装内容
```typescript
// achievements.ts
interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: (state: GameState) => boolean;
  reward: {
    resources?: Partial<ResourceMap>;
    multipliers?: { [key: string]: number };
  };
  category: 'resource' | 'celestial' | 'life' | 'general';
  progress?: () => { current: number; target: number };
}

class AchievementSystem {
  private achievements: Achievement[] = [
    {
      id: 'dust_collector_1',
      name: '塵も積もれば',
      description: '宇宙の塵を1,000個集める',
      requirement: (state) => state.resources.cosmicDust >= 1000,
      reward: { resources: { energy: 100 } },
      category: 'resource',
      progress: () => ({ 
        current: gameState.resources.cosmicDust, 
        target: 1000 
      })
    },
    // ... 50個以上の実績定義
  ];
  
  checkAchievements(): void {
    this.achievements.forEach(achievement => {
      if (!this.isUnlocked(achievement.id) && 
          achievement.requirement(gameState)) {
        this.unlock(achievement);
      }
    });
  }
  
  private unlock(achievement: Achievement): void {
    // 実績解除処理
    this.saveUnlockedAchievement(achievement.id);
    this.grantReward(achievement.reward);
    this.showNotification(achievement);
  }
}
```

### 実績カテゴリと例
1. **資源収集系**（15個）
   - 宇宙の塵1K/10K/100K/1M収集
   - 全資源種を保有
   - 伝説品質の資源獲得

2. **天体作成系**（15個）
   - 最初の小惑星/惑星/恒星作成
   - 10個の天体を同時に保有
   - ブラックホール作成

3. **生命進化系**（10個）
   - 微生物/植物/動物/知的生命誕生
   - 3つの惑星に生命

4. **一般系**（10個）
   - 1/10/100日プレイ
   - 初めてのプレステージ

## 1.3 統合UI改善（Phase 5から前倒し）

### 実装内容
```typescript
// dashboard.ts
class Dashboard {
  private updateInterval = 1000; // 1秒ごと
  
  render(): HTMLElement {
    return html`
      <div class="dashboard">
        <div class="resource-summary">
          <h3>資源概要</h3>
          ${this.renderResourceSummary()}
        </div>
        
        <div class="production-rates">
          <h3>生産レート</h3>
          ${this.renderProductionRates()}
        </div>
        
        <div class="next-milestone">
          <h3>次の目標</h3>
          ${this.renderNextMilestone()}
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${this.progress}%"></div>
          </div>
          <span class="eta">到達まで: ${this.calculateETA()}</span>
        </div>
        
        <div class="mini-map">
          ${this.renderMiniMap()}
        </div>
      </div>
    `;
  }
  
  private calculateETA(): string {
    const remaining = this.nextTarget - this.current;
    const rate = this.productionRate;
    const seconds = remaining / rate;
    
    if (seconds < 60) return `${Math.floor(seconds)}秒`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}分`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}時間`;
    return `${Math.floor(seconds/86400)}日`;
  }
}
```

### UI要素チェックリスト
- [ ] リソース合計と内訳表示
- [ ] リアルタイム生産レート（/秒）
- [ ] 次の目標への進捗バー
- [ ] ETA（到達予想時間）表示
- [ ] ミニマップ（天体配置の俯瞰図）
- [ ] 現在のゲームフェーズ表示

## 1.4 通知・フィードバックシステム

### 実装内容
```typescript
// feedbackSystem.ts
class FeedbackSystem {
  // 数値ポップアップ
  showResourceGain(amount: number, type: string, position: Vector3): void {
    const popup = document.createElement('div');
    popup.className = 'resource-popup';
    popup.textContent = `+${formatNumber(amount)} ${type}`;
    
    // Three.jsの3D座標を画面座標に変換
    const screenPos = this.worldToScreen(position);
    popup.style.left = `${screenPos.x}px`;
    popup.style.top = `${screenPos.y}px`;
    
    document.body.appendChild(popup);
    
    // アニメーション
    anime({
      targets: popup,
      translateY: -50,
      opacity: [1, 0],
      duration: 1500,
      easing: 'easeOutExpo',
      complete: () => popup.remove()
    });
  }
  
  // 通知トースト
  showToast(message: string, type: 'info' | 'success' | 'warning'): void {
    const toast = new Toast(message, type);
    toast.show(3000); // 3秒表示
  }
  
  // 実績解除通知
  showAchievementUnlocked(achievement: Achievement): void {
    const notification = new AchievementNotification(achievement);
    notification.showWithAnimation();
    
    // 効果音（オプション）
    if (gameSettings.soundEnabled) {
      this.playSound('achievement_unlocked');
    }
  }
}
```

### フィードバック要素
- [ ] 資源獲得時の数値ポップアップ
- [ ] 画面端のトースト通知
- [ ] 実績解除の派手なアニメーション
- [ ] 重要イベントのバナー表示
- [ ] オプションの効果音

## 実装スケジュール（3週間）

### Week 1: 基礎実装
- オフライン進行の詳細実装
- ダッシュボードUI作成
- 基本的な通知システム

### Week 2: 実績システム
- 50個の実績定義と実装
- 実績UIと進捗表示
- 報酬システム

### Week 3: 磨き上げ
- アニメーション追加
- パフォーマンス最適化
- バグ修正とバランス調整

## 技術仕様（シングルプレイ）
- **データ保存**: IndexedDB（Phase 0で実装済み）
- **時間管理**: ローカルタイムスタンプ
- **UI更新**: requestAnimationFrame + 1秒間隔
- **アニメーション**: anime.js（軽量ライブラリ）

## 成功基準
- [ ] オフライン12時間で意味のある進行
- [ ] 50個以上の実績でプレイ目標を提供
- [ ] 数値の変化が視覚的に楽しい
- [ ] 次の目標が常に明確
- [ ] 60fps維持（パフォーマンス）