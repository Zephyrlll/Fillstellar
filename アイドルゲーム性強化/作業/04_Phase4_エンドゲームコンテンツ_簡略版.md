# Phase 4: エンドゲームコンテンツ（シングルプレイ簡略版）

## 概要
マルチプレイ要素を除外し、シングルプレイで長期間楽しめるエンドゲームコンテンツに特化。

## 4.1 複数セーブスロット（メタ宇宙の簡略版）

### 実装内容
```typescript
// saveSlots.ts
interface SaveSlot {
  id: number; // 1-3
  name: string;
  createdAt: number;
  lastPlayed: number;
  gameState: GameState;
  statistics: {
    totalPlayTime: number;
    prestigeCount: number;
    highestResource: number;
  };
  universeModifiers?: UniverseModifier;
}

interface UniverseModifier {
  name: string;
  description: string;
  effects: {
    resourceMultiplier?: number;
    startingResources?: Partial<ResourceMap>;
    specialRules?: string[];
  };
}

class SaveSlotManager {
  private slots: SaveSlot[] = [];
  private readonly MAX_SLOTS = 3;
  
  createNewUniverse(slotId: number, modifier?: UniverseModifier): void {
    const newSlot: SaveSlot = {
      id: slotId,
      name: modifier?.name || `宇宙 #${slotId}`,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      gameState: this.createInitialState(modifier),
      statistics: {
        totalPlayTime: 0,
        prestigeCount: 0,
        highestResource: 0
      },
      universeModifiers: modifier
    };
    
    this.slots[slotId - 1] = newSlot;
    this.saveToIndexedDB();
  }
  
  // 宇宙の特性（3種類から選択）
  getAvailableModifiers(): UniverseModifier[] {
    return [
      {
        name: '豊穣の宇宙',
        description: '資源生産量2倍、ただし天体作成コスト1.5倍',
        effects: {
          resourceMultiplier: 2.0,
          specialRules: ['celestial_cost_1.5x']
        }
      },
      {
        name: '加速の宇宙',
        description: '時間の流れが3倍速、オフライン時間上限6時間',
        effects: {
          specialRules: ['time_speed_3x', 'offline_cap_6h']
        }
      },
      {
        name: '挑戦の宇宙',
        description: '初期資源なし、達成報酬3倍',
        effects: {
          startingResources: { cosmicDust: 0 },
          specialRules: ['achievement_reward_3x']
        }
      }
    ];
  }
}
```

### チェックリスト
- [ ] 3つのセーブスロット実装
- [ ] スロット選択UI
- [ ] 宇宙特性選択（新規作成時）
- [ ] スロットごとの統計表示
- [ ] スロット削除機能（確認付き）

## 4.2 無限進行要素（シンプル版）

### 実装内容
```typescript
// infiniteProgression.ts
class InfiniteProgression {
  // パラゴンレベル（プレステージ後も持ち越し）
  private paragonLevel = 0;
  private paragonPoints = 0;
  
  // パラゴンポイントの獲得
  calculateParagonPoints(gameState: GameState): number {
    // 総資源価値に基づいて計算
    const totalValue = this.calculateTotalResourceValue(gameState);
    return Math.floor(Math.log10(totalValue + 1));
  }
  
  // パラゴンアップグレード（永続的）
  paragonUpgrades = {
    baseProduction: {
      name: '基礎生産力',
      maxLevel: -1, // 無限
      cost: (level: number) => level + 1,
      effect: (level: number) => 1 + (level * 0.1) // +10%/レベル
    },
    offlineEfficiency: {
      name: 'オフライン効率',
      maxLevel: 20,
      cost: (level: number) => level * 2 + 1,
      effect: (level: number) => 1 + (level * 0.05) // +5%/レベル
    },
    prestigeBonus: {
      name: 'プレステージボーナス',
      maxLevel: -1,
      cost: (level: number) => Math.floor(Math.pow(1.5, level)),
      effect: (level: number) => 1 + (level * 0.2) // +20%/レベル
    }
  };
  
  // 資源ティアシステム
  getResourceTier(amount: number): string {
    const tiers = [
      { threshold: 1e3, name: 'K' },
      { threshold: 1e6, name: 'M' },
      { threshold: 1e9, name: 'B' },
      { threshold: 1e12, name: 'T' },
      { threshold: 1e15, name: 'Qa' },
      { threshold: 1e18, name: 'Qi' },
      { threshold: 1e21, name: 'Sx' },
      { threshold: 1e24, name: 'Sp' },
      { threshold: 1e27, name: 'Oc' },
      { threshold: 1e30, name: 'No' },
      { threshold: 1e33, name: 'Dc' },
      // ... 無限に続く
    ];
    
    const tier = tiers.reverse().find(t => amount >= t.threshold);
    return tier ? tier.name : '';
  }
}
```

### 無限進行要素
- [ ] パラゴンレベルシステム
- [ ] 永続的アップグレード
- [ ] 無限に続く資源ティア表記
- [ ] スケーリング計算の最適化
- [ ] 大数ライブラリの導入（必要時）

## 4.3 チャレンジモード（シングルプレイ版）

### 実装内容
```typescript
// challenges.ts
interface Challenge {
  id: string;
  name: string;
  description: string;
  restrictions: Restriction[];
  goals: Goal[];
  rewards: {
    paragonPoints?: number;
    permanentMultipliers?: { [key: string]: number };
    specialUnlocks?: string[];
  };
  completed: boolean;
}

class ChallengeSystem {
  challenges: Challenge[] = [
    {
      id: 'no_stars',
      name: '暗黒宇宙',
      description: '恒星を作らずに知的生命体を誕生させる',
      restrictions: [{ type: 'no_celestial_type', value: 'star' }],
      goals: [{ type: 'create_life', value: 'intelligent' }],
      rewards: {
        paragonPoints: 10,
        permanentMultipliers: { energy: 2.0 }
      },
      completed: false
    },
    {
      id: 'speed_run',
      name: 'スピードラン',
      description: '1時間以内にブラックホールを作成',
      restrictions: [{ type: 'time_limit', value: 3600 }],
      goals: [{ type: 'create_celestial', value: 'black_hole' }],
      rewards: {
        specialUnlocks: ['time_warp_ability']
      },
      completed: false
    },
    // ... 10個以上のチャレンジ
  ];
  
  startChallenge(challengeId: string): void {
    const challenge = this.challenges.find(c => c.id === challengeId);
    if (!challenge) return;
    
    // 新しいゲームを開始（制限付き）
    const restrictedState = this.createRestrictedGameState(challenge);
    gameState = restrictedState;
    
    // 制限を適用
    this.applyRestrictions(challenge.restrictions);
    
    // 目標追跡開始
    this.trackGoals(challenge.goals);
  }
}
```

### チャレンジ種類
- [ ] 制限チャレンジ（特定要素禁止）
- [ ] タイムアタック（時間制限）
- [ ] 最小資源チャレンジ
- [ ] 特殊ルールチャレンジ
- [ ] 週替わりチャレンジ（ローカル管理）

## 4.4 統計と記録（シングルプレイ版）

### 実装内容
```typescript
// statistics.ts
interface DetailedStatistics {
  // 基本統計
  totalPlayTime: number;
  totalPrestiges: number;
  totalAchievements: number;
  
  // 資源統計
  resourcesEarned: { [key: string]: number };
  highestResourceAmount: { [key: string]: number };
  
  // 天体統計
  celestialBodiesCreated: { [type: string]: number };
  largestGalaxySize: number;
  
  // 生命統計
  lifeForms: {
    totalCreated: number;
    highestEvolution: string;
    extinctions: number;
  };
  
  // 記録
  records: {
    fastestToStar: number;
    fastestToLife: number;
    fastestPrestige: number;
    highestOfflineGain: number;
  };
}

class StatisticsTracker {
  private stats: DetailedStatistics;
  
  // 個人ベスト記録
  updateRecord(recordType: string, value: number): boolean {
    const current = this.stats.records[recordType];
    if (!current || value < current) {
      this.stats.records[recordType] = value;
      this.showNewRecord(recordType, value);
      return true;
    }
    return false;
  }
  
  // 統計画面
  renderStatisticsScreen(): HTMLElement {
    return html`
      <div class="statistics-screen">
        <h2>宇宙統計</h2>
        
        <div class="stat-category">
          <h3>プレイ記録</h3>
          <p>総プレイ時間: ${this.formatTime(this.stats.totalPlayTime)}</p>
          <p>プレステージ回数: ${this.stats.totalPrestiges}</p>
        </div>
        
        <div class="stat-category">
          <h3>個人記録</h3>
          ${this.renderRecords()}
        </div>
        
        <div class="stat-category">
          <h3>累計獲得資源</h3>
          ${this.renderResourceStats()}
        </div>
      </div>
    `;
  }
}
```

### 統計要素
- [ ] 詳細なプレイ統計
- [ ] 個人ベスト記録
- [ ] グラフ表示（資源推移等）
- [ ] 統計のエクスポート機能
- [ ] 実績との連動

## 実装優先度（シングルプレイ版）

1. **高優先度**
   - 複数セーブスロット（基本的なメタプログレッション）
   - パラゴンシステム（永続的な進行要素）
   - 基本的なチャレンジ（5個程度）

2. **中優先度**
   - 詳細統計システム
   - 追加チャレンジ
   - 無限ティアシステム

3. **低優先度**
   - 高度な統計分析
   - カスタムチャレンジ作成

## 技術仕様
- **データ管理**: IndexedDBで複数スロット管理
- **大数処理**: 必要に応じてBigNumber.js導入
- **統計追跡**: 効率的なイベントシステム

## 成功基準
- [ ] 100時間以上のプレイでも新しい目標がある
- [ ] プレステージ後も成長を実感できる
- [ ] チャレンジで新しいプレイスタイルを体験
- [ ] 自分の成長が数値で確認できる