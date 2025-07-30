/**
 * Seasonal Event System
 * シーズナルイベントシステム
 */

import { gameStateManager } from '../state.js';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  icon: string;
  theme: EventTheme;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  bonuses: EventBonus[];
  specialChallenges: EventChallenge[];
  exclusiveRewards: EventReward[];
}

export interface EventTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundImage?: string;
  particleEffect?: string;
}

export interface EventBonus {
  type: 'production' | 'evolution' | 'creation' | 'special';
  target?: string;
  multiplier: number;
  description: string;
}

export interface EventChallenge {
  id: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  reward: EventReward;
}

export interface EventReward {
  type: 'cosmetic' | 'title' | 'resource' | 'permanent_bonus';
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export class SeasonalEventSystem {
  private static instance: SeasonalEventSystem;
  private currentEvent: SeasonalEvent | null = null;
  private eventHistory: Map<string, EventProgress> = new Map();
  private mockEvents: SeasonalEvent[] = [];
  
  private constructor() {
    this.initializeMockEvents();
    this.checkCurrentEvent();
    console.log('[SEASONAL-EVENT] System initialized');
  }
  
  static getInstance(): SeasonalEventSystem {
    if (!SeasonalEventSystem.instance) {
      SeasonalEventSystem.instance = new SeasonalEventSystem();
    }
    return SeasonalEventSystem.instance;
  }
  
  private initializeMockEvents(): void {
    const currentYear = new Date().getFullYear();
    
    this.mockEvents = [
      {
        id: 'spring_life_festival',
        name: '🌸 生命の祭典',
        description: '生命の誕生と進化を祝う春のイベント',
        season: 'spring',
        icon: '🌸',
        theme: {
          primaryColor: '#10b981',
          secondaryColor: '#84cc16',
          particleEffect: 'petals'
        },
        startDate: new Date(currentYear, 2, 20), // 3月20日
        endDate: new Date(currentYear, 3, 20),   // 4月20日
        isActive: false,
        bonuses: [
          {
            type: 'evolution',
            multiplier: 2.0,
            description: '生命進化速度 2倍'
          },
          {
            type: 'production',
            target: 'organicMatter',
            multiplier: 1.5,
            description: '有機物生産 1.5倍'
          }
        ],
        specialChallenges: [
          {
            id: 'evolve_to_intelligent',
            name: '知的生命への進化',
            description: '10個の惑星で知的生命を誕生させる',
            progress: 0,
            maxProgress: 10,
            reward: {
              type: 'title',
              id: 'life_creator',
              name: '生命の創造者',
              description: 'プロフィールに表示される称号',
              rarity: 'epic'
            }
          }
        ],
        exclusiveRewards: [
          {
            type: 'cosmetic',
            id: 'spring_planet_skin',
            name: '春の惑星スキン',
            description: '惑星が花で覆われる',
            rarity: 'rare'
          }
        ]
      },
      {
        id: 'summer_stellar_glory',
        name: '☀️ 恒星の輝き',
        description: '恒星作成とエネルギー生産を強化する夏のイベント',
        season: 'summer',
        icon: '☀️',
        theme: {
          primaryColor: '#f59e0b',
          secondaryColor: '#ef4444',
          particleEffect: 'sunrays'
        },
        startDate: new Date(currentYear, 5, 21), // 6月21日
        endDate: new Date(currentYear, 6, 21),   // 7月21日
        isActive: false,
        bonuses: [
          {
            type: 'creation',
            target: 'star',
            multiplier: 0.5,
            description: '恒星作成コスト 50%削減'
          },
          {
            type: 'production',
            target: 'energy',
            multiplier: 2.0,
            description: 'エネルギー生産 2倍'
          }
        ],
        specialChallenges: [
          {
            id: 'create_supernova',
            name: '超新星の創造',
            description: '50個の恒星を作成する',
            progress: 0,
            maxProgress: 50,
            reward: {
              type: 'permanent_bonus',
              id: 'stellar_mastery',
              name: '恒星の支配者',
              description: '恒星からのエネルギー生産 +10%（永続）',
              rarity: 'legendary'
            }
          }
        ],
        exclusiveRewards: [
          {
            type: 'cosmetic',
            id: 'solar_corona_effect',
            name: 'ソーラーコロナエフェクト',
            description: '恒星に特別なコロナエフェクト',
            rarity: 'epic'
          }
        ]
      },
      {
        id: 'autumn_harvest',
        name: '🍂 収穫の時',
        description: '全ての資源生産が大幅に増加する秋のイベント',
        season: 'autumn',
        icon: '🍂',
        theme: {
          primaryColor: '#d97706',
          secondaryColor: '#92400e',
          particleEffect: 'leaves'
        },
        startDate: new Date(currentYear, 8, 22), // 9月22日
        endDate: new Date(currentYear, 9, 22),   // 10月22日
        isActive: false,
        bonuses: [
          {
            type: 'production',
            multiplier: 2.0,
            description: '全資源生産 2倍'
          },
          {
            type: 'special',
            multiplier: 1.5,
            description: '変換効率 1.5倍'
          }
        ],
        specialChallenges: [
          {
            id: 'resource_hoarder',
            name: '資源の大収穫',
            description: '各資源を1兆以上保持する',
            progress: 0,
            maxProgress: 6,
            reward: {
              type: 'title',
              id: 'harvest_master',
              name: '収穫の達人',
              description: '資源管理のマスター',
              rarity: 'rare'
            }
          }
        ],
        exclusiveRewards: [
          {
            type: 'resource',
            id: 'autumn_cache',
            name: '秋の宝物庫',
            description: '全資源×1Mを即座に獲得',
            rarity: 'rare'
          }
        ]
      },
      {
        id: 'winter_mystery',
        name: '❄️ 暗黒物質の神秘',
        description: 'レア資源とダークマターの出現率が上昇する冬のイベント',
        season: 'winter',
        icon: '❄️',
        theme: {
          primaryColor: '#6366f1',
          secondaryColor: '#312e81',
          particleEffect: 'snow'
        },
        startDate: new Date(currentYear, 11, 21), // 12月21日
        endDate: new Date(currentYear + 1, 0, 21), // 1月21日
        isActive: false,
        bonuses: [
          {
            type: 'special',
            target: 'rareDropRate',
            multiplier: 3.0,
            description: 'レアドロップ率 3倍'
          },
          {
            type: 'production',
            target: 'darkMatter',
            multiplier: 2.5,
            description: 'ダークマター生産 2.5倍'
          }
        ],
        specialChallenges: [
          {
            id: 'dark_matter_collector',
            name: '暗黒物質の収集家',
            description: 'ダークマターを1億集める',
            progress: 0,
            maxProgress: 100000000,
            reward: {
              type: 'cosmetic',
              id: 'void_aura',
              name: '虚空のオーラ',
              description: 'ブラックホールに特別なオーラ',
              rarity: 'legendary'
            }
          }
        ],
        exclusiveRewards: [
          {
            type: 'permanent_bonus',
            id: 'winter_blessing',
            name: '冬の祝福',
            description: '神話レアリティ確率 +0.01%（永続）',
            rarity: 'legendary'
          }
        ]
      }
    ];
  }
  
  // 現在のイベントを確認
  private checkCurrentEvent(): void {
    const now = new Date();
    
    for (const event of this.mockEvents) {
      if (now >= event.startDate && now <= event.endDate) {
        this.currentEvent = { ...event, isActive: true };
        console.log(`[SEASONAL-EVENT] Active event: ${event.name}`);
        return;
      }
    }
    
    // アクティブなイベントがない場合、次のイベントを表示
    this.currentEvent = this.getNextEvent();
  }
  
  // 次のイベントを取得
  private getNextEvent(): SeasonalEvent | null {
    const now = new Date();
    let nextEvent: SeasonalEvent | null = null;
    let minTimeDiff = Infinity;
    
    for (const event of this.mockEvents) {
      if (event.startDate > now) {
        const timeDiff = event.startDate.getTime() - now.getTime();
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nextEvent = event;
        }
      }
    }
    
    return nextEvent;
  }
  
  // 現在のイベントを取得
  getCurrentEvent(): SeasonalEvent | null {
    this.checkCurrentEvent();
    return this.currentEvent;
  }
  
  // イベントボーナスを適用
  applyEventBonuses(baseValue: number, type: string, target?: string): number {
    if (!this.currentEvent || !this.currentEvent.isActive) return baseValue;
    
    let multiplier = 1;
    
    for (const bonus of this.currentEvent.bonuses) {
      if (bonus.type === type && (!bonus.target || bonus.target === target)) {
        multiplier *= bonus.multiplier;
      }
    }
    
    return baseValue * multiplier;
  }
  
  // チャレンジの進捗を更新
  updateChallengeProgress(challengeId: string, amount: number): void {
    if (!this.currentEvent || !this.currentEvent.isActive) return;
    
    const challenge = this.currentEvent.specialChallenges.find(c => c.id === challengeId);
    if (challenge && challenge.progress < challenge.maxProgress) {
      challenge.progress = Math.min(challenge.progress + amount, challenge.maxProgress);
      
      if (challenge.progress >= challenge.maxProgress) {
        this.onChallengeComplete(challenge);
      }
    }
  }
  
  // チャレンジ完了時の処理
  private onChallengeComplete(challenge: EventChallenge): void {
    console.log(`[SEASONAL-EVENT] Challenge completed: ${challenge.name}`);
    console.log(`[SEASONAL-EVENT] Reward (Coming Soon):`, challenge.reward);
    
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showEventBanner(
        '🎆 イベントチャレンジ完了！',
        `${challenge.name}を達成しました！`,
        'seasonal'
      );
    }
  }
  
  // イベント履歴を取得
  getEventHistory(): EventProgress[] {
    return Array.from(this.eventHistory.values());
  }
  
  // 次のイベントまでの時間を取得
  getTimeUntilNextEvent(): number {
    const next = this.getNextEvent();
    if (!next) return 0;
    
    return Math.max(0, next.startDate.getTime() - Date.now());
  }
}

interface EventProgress {
  eventId: string;
  completedChallenges: string[];
  claimedRewards: string[];
  totalScore: number;
}

export const seasonalEventSystem = SeasonalEventSystem.getInstance();