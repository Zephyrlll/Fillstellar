/**
 * Daily Challenge System
 * デイリーチャレンジシステム
 */

import { gameStateManager } from '../state.js';

export interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'production' | 'creation' | 'research' | 'special';
  objectives: ChallengeObjective[];
  rewards: ChallengeReward[];
  startTime: number;
  endTime: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface ChallengeObjective {
  type: 'collect_resource' | 'create_celestial' | 'complete_research' | 'reach_production' | 'special';
  target: string;
  amount: number;
  current: number;
}

export interface ChallengeReward {
  type: 'resource' | 'prestige_points' | 'paragon_exp' | 'unlock' | 'multiplier';
  target?: string;
  amount: number;
  duration?: number; // 一時的な報酬の場合
}

export class DailyChallengeSystem {
  private static instance: DailyChallengeSystem;
  private challenges: Map<string, DailyChallenge> = new Map();
  private lastResetTime: number = 0;
  private challengeTemplates: ChallengeTemplate[] = [];
  
  private constructor() {
    this.initializeChallengeTemplates();
    this.checkDailyReset();
    console.log('[DAILY-CHALLENGE] System initialized');
  }
  
  static getInstance(): DailyChallengeSystem {
    if (!DailyChallengeSystem.instance) {
      DailyChallengeSystem.instance = new DailyChallengeSystem();
    }
    return DailyChallengeSystem.instance;
  }
  
  private initializeChallengeTemplates(): void {
    this.challengeTemplates = [
      {
        id: 'dust_collector',
        name: '塵収集者',
        icon: '✨',
        category: 'production',
        objectives: [
          { type: 'collect_resource', target: 'cosmicDust', baseAmount: 1000000 }
        ],
        rewards: [
          { type: 'resource', target: 'energy', amount: 10000 },
          { type: 'prestige_points', amount: 5 }
        ]
      },
      {
        id: 'star_creator',
        name: '星の創造者',
        icon: '⭐',
        category: 'creation',
        objectives: [
          { type: 'create_celestial', target: 'star', baseAmount: 3 }
        ],
        rewards: [
          { type: 'resource', target: 'darkMatter', amount: 1000 },
          { type: 'multiplier', target: 'energy', amount: 1.5, duration: 3600000 }
        ]
      },
      {
        id: 'knowledge_seeker',
        name: '知識探求者',
        icon: '🔬',
        category: 'research',
        objectives: [
          { type: 'complete_research', target: 'any', baseAmount: 5 }
        ],
        rewards: [
          { type: 'resource', target: 'thoughtPoints', amount: 5000 },
          { type: 'paragon_exp', amount: 1000 }
        ]
      },
      {
        id: 'production_master',
        name: '生産の達人',
        icon: '🏭',
        category: 'production',
        objectives: [
          { type: 'reach_production', target: 'energy', baseAmount: 10000 }
        ],
        rewards: [
          { type: 'multiplier', target: 'all', amount: 2, duration: 1800000 },
          { type: 'prestige_points', amount: 10 }
        ]
      },
      {
        id: 'life_creator',
        name: '生命の父',
        icon: '🌱',
        category: 'special',
        objectives: [
          { type: 'special', target: 'intelligent_life', baseAmount: 1 }
        ],
        rewards: [
          { type: 'resource', target: 'biomass', amount: 100000 },
          { type: 'unlock', target: 'special_research', amount: 1 }
        ]
      }
    ];
  }
  
  // デイリーリセットの確認
  private checkDailyReset(): void {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    if (this.lastResetTime < todayStart) {
      this.generateDailyChallenges();
      this.lastResetTime = now;
      this.saveData();
    }
  }
  
  // デイリーチャレンジの生成
  private generateDailyChallenges(): void {
    this.challenges.clear();
    
    // 3つのチャレンジをランダムに選択
    const selectedTemplates = this.selectRandomChallenges(3);
    const now = Date.now();
    const endTime = new Date().setHours(23, 59, 59, 999);
    
    selectedTemplates.forEach((template, index) => {
      const challenge = this.createChallengeFromTemplate(template, now, endTime);
      this.challenges.set(challenge.id, challenge);
    });
    
    console.log('[DAILY-CHALLENGE] Generated new daily challenges');
  }
  
  // ランダムにチャレンジを選択
  private selectRandomChallenges(count: number): ChallengeTemplate[] {
    const shuffled = [...this.challengeTemplates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  
  // テンプレートからチャレンジを作成
  private createChallengeFromTemplate(template: ChallengeTemplate, startTime: number, endTime: number): DailyChallenge {
    // プレイヤーの進捗に応じて難易度を調整
    const difficultyMultiplier = this.calculateDifficultyMultiplier();
    
    const objectives = template.objectives.map(obj => ({
      ...obj,
      amount: Math.floor(obj.baseAmount * difficultyMultiplier),
      current: 0
    }));
    
    const rewards = template.rewards.map(reward => ({
      ...reward,
      amount: Math.floor(reward.amount * (1 + difficultyMultiplier * 0.5))
    }));
    
    return {
      id: `daily_${template.id}_${startTime}`,
      name: template.name,
      description: this.generateDescription(template, objectives),
      icon: template.icon,
      category: template.category,
      objectives,
      rewards,
      startTime,
      endTime,
      progress: 0,
      completed: false,
      claimed: false
    };
  }
  
  // 難易度係数の計算
  private calculateDifficultyMultiplier(): number {
    const state = gameStateManager.getState();
    const prestigeLevel = (window as any).prestigeSystem?.getPrestigeLevel() || 0;
    const paragonLevel = (window as any).paragonSystem?.getData()?.level || 0;
    
    return 1 + (prestigeLevel * 0.5) + (paragonLevel * 0.1);
  }
  
  // チャレンジの説明を生成
  private generateDescription(template: ChallengeTemplate, objectives: ChallengeObjective[]): string {
    const descriptions: string[] = [];
    
    objectives.forEach(obj => {
      switch (obj.type) {
        case 'collect_resource':
          descriptions.push(`${this.formatNumber(obj.amount)}個の${this.getResourceName(obj.target)}を収集`);
          break;
        case 'create_celestial':
          descriptions.push(`${obj.amount}個の${this.getCelestialName(obj.target)}を作成`);
          break;
        case 'complete_research':
          descriptions.push(`${obj.amount}個の研究を完了`);
          break;
        case 'reach_production':
          descriptions.push(`${this.getResourceName(obj.target)}の生産量を${this.formatNumber(obj.amount)}/秒に到達`);
          break;
        case 'special':
          descriptions.push(`特別な条件を達成`);
          break;
      }
    });
    
    return descriptions.join('、');
  }
  
  // チャレンジの進捗を更新
  updateProgress(challengeId: string, objectiveIndex: number, amount: number): void {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.completed) return;
    
    const objective = challenge.objectives[objectiveIndex];
    if (!objective) return;
    
    objective.current = Math.min(objective.current + amount, objective.amount);
    
    // 全体の進捗を計算
    const totalProgress = challenge.objectives.reduce((sum, obj) => sum + (obj.current / obj.amount), 0);
    challenge.progress = totalProgress / challenge.objectives.length;
    
    // 完了チェック
    if (challenge.progress >= 1) {
      challenge.completed = true;
      this.onChallengeComplete(challenge);
    }
    
    this.saveData();
  }
  
  // チャレンジ完了時の処理
  private onChallengeComplete(challenge: DailyChallenge): void {
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showEventBanner(
        '🎆 デイリーチャレンジ完了！',
        `${challenge.name}を達成しました！報酬を受け取ってください。`,
        'success'
      );
    }
  }
  
  // 報酬を受け取る
  claimRewards(challengeId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || !challenge.completed || challenge.claimed) return false;
    
    // Coming Soon: 実際の報酬付与はバックエンド連携後
    console.log('[DAILY-CHALLENGE] Rewards would be:', challenge.rewards);
    
    challenge.claimed = true;
    this.saveData();
    
    return true;
  }
  
  // アクティブなチャレンジを取得
  getActiveChallenges(): DailyChallenge[] {
    this.checkDailyReset();
    return Array.from(this.challenges.values());
  }
  
  // 残り時間を取得
  getTimeRemaining(): number {
    const now = Date.now();
    const endOfDay = new Date().setHours(23, 59, 59, 999);
    return Math.max(0, endOfDay - now);
  }
  
  // ヘルパー関数
  private formatNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  }
  
  private getResourceName(resource: string): string {
    const names: { [key: string]: string } = {
      cosmicDust: '宇宙の塵',
      energy: 'エネルギー',
      organicMatter: '有機物',
      biomass: 'バイオマス',
      darkMatter: 'ダークマター',
      thoughtPoints: '思考ポイント'
    };
    return names[resource] || resource;
  }
  
  private getCelestialName(type: string): string {
    const names: { [key: string]: string } = {
      star: '恒星',
      planet: '惑星',
      moon: '月',
      asteroid: '小惑星',
      comet: '彗星',
      black_hole: 'ブラックホール'
    };
    return names[type] || type;
  }
  
  // データの保存/読み込み
  private saveData(): void {
    const data = {
      challenges: Array.from(this.challenges.entries()),
      lastResetTime: this.lastResetTime
    };
    localStorage.setItem('dailyChallenges', JSON.stringify(data));
  }
  
  private loadData(): void {
    const saved = localStorage.getItem('dailyChallenges');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.challenges = new Map(data.challenges);
        this.lastResetTime = data.lastResetTime;
      } catch (error) {
        console.error('[DAILY-CHALLENGE] Failed to load data:', error);
      }
    }
  }
}

interface ChallengeTemplate {
  id: string;
  name: string;
  icon: string;
  category: DailyChallenge['category'];
  objectives: Array<{
    type: ChallengeObjective['type'];
    target: string;
    baseAmount: number;
  }>;
  rewards: ChallengeReward[];
}

export const dailyChallengeSystem = DailyChallengeSystem.getInstance();