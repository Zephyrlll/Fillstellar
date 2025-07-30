/**
 * Ranking System
 * ランキングシステム
 */

import { gameStateManager } from '../state.js';

export interface RankingCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  scoreCalculation: (state: any) => number;
  updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface PlayerRanking {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  previousRank?: number;
  bestRank?: number;
  avatar?: string;
  title?: string;
  lastUpdated: number;
}

export interface LeaderboardData {
  categoryId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'alltime';
  lastUpdated: number;
  rankings: PlayerRanking[];
  playerRank?: PlayerRanking;
}

export class RankingSystem {
  private static instance: RankingSystem;
  private categories: Map<string, RankingCategory> = new Map();
  private mockLeaderboards: Map<string, LeaderboardData> = new Map();
  private playerId: string;
  private playerName: string;
  
  private constructor() {
    this.playerId = this.generatePlayerId();
    this.playerName = this.generatePlayerName();
    this.initializeCategories();
    this.generateMockLeaderboards();
    console.log('[RANKING] System initialized');
  }
  
  static getInstance(): RankingSystem {
    if (!RankingSystem.instance) {
      RankingSystem.instance = new RankingSystem();
    }
    return RankingSystem.instance;
  }
  
  private initializeCategories(): void {
    const categories: RankingCategory[] = [
      {
        id: 'total_resources',
        name: '総資源量',
        description: '全資源の合計量',
        icon: '💰',
        scoreCalculation: (state) => {
          return Object.values(state.resources || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
        },
        updateFrequency: 'hourly'
      },
      {
        id: 'celestial_count',
        name: '天体数',
        description: '作成した天体の総数',
        icon: '🌌',
        scoreCalculation: (state) => {
          return state.stars?.length || 0;
        },
        updateFrequency: 'realtime'
      },
      {
        id: 'prestige_points',
        name: 'プレステージポイント',
        description: '累積プレステージポイント',
        icon: '🌟',
        scoreCalculation: (state) => {
          return (window as any).prestigeSystem?.getTotalPrestigePoints() || 0;
        },
        updateFrequency: 'daily'
      },
      {
        id: 'paragon_level',
        name: 'パラゴンレベル',
        description: '到達したパラゴンレベル',
        icon: '👑',
        scoreCalculation: (state) => {
          return (window as any).paragonSystem?.getData()?.level || 0;
        },
        updateFrequency: 'daily'
      },
      {
        id: 'energy_production',
        name: 'エネルギー生産量',
        description: '毎秒のエネルギー生産量',
        icon: '⚡',
        scoreCalculation: (state) => {
          // 仮の計算
          return state.resources?.energy || 0;
        },
        updateFrequency: 'hourly'
      },
      {
        id: 'mythic_discoveries',
        name: '神話レアリティ',
        description: '発見した神話レアリティの数',
        icon: '🎆',
        scoreCalculation: (state) => {
          return (window as any).mythicRaritySystem?.getAllMythicResources()?.length || 0;
        },
        updateFrequency: 'weekly'
      }
    ];
    
    categories.forEach(cat => this.categories.set(cat.id, cat));
  }
  
  // モックリーダーボードの生成
  private generateMockLeaderboards(): void {
    const periods: Array<'daily' | 'weekly' | 'monthly' | 'alltime'> = ['daily', 'weekly', 'monthly', 'alltime'];
    
    this.categories.forEach((category, categoryId) => {
      periods.forEach(period => {
        const key = `${categoryId}_${period}`;
        const leaderboard = this.generateMockLeaderboard(categoryId, period);
        this.mockLeaderboards.set(key, leaderboard);
      });
    });
  }
  
  private generateMockLeaderboard(categoryId: string, period: string): LeaderboardData {
    const rankings: PlayerRanking[] = [];
    const playerCount = 100;
    
    // モックプレイヤーの生成
    for (let i = 0; i < playerCount; i++) {
      rankings.push({
        playerId: `player_${i}`,
        playerName: this.generatePlayerName(),
        score: Math.floor(Math.random() * 1000000) * (playerCount - i),
        rank: i + 1,
        previousRank: i > 0 ? i + Math.floor(Math.random() * 5) - 2 : undefined,
        bestRank: Math.max(1, i - Math.floor(Math.random() * 10)),
        avatar: this.getRandomAvatar(),
        title: this.getRandomTitle(),
        lastUpdated: Date.now() - Math.random() * 3600000
      });
    }
    
    // プレイヤー自身のランキング
    const playerScore = Math.floor(Math.random() * 500000);
    const playerRankIndex = rankings.findIndex(r => r.score < playerScore);
    const playerRank = playerRankIndex === -1 ? rankings.length + 1 : playerRankIndex + 1;
    
    const playerRanking: PlayerRanking = {
      playerId: this.playerId,
      playerName: this.playerName,
      score: playerScore,
      rank: playerRank,
      previousRank: playerRank + Math.floor(Math.random() * 10) - 5,
      bestRank: Math.max(1, playerRank - Math.floor(Math.random() * 20)),
      avatar: '🚀',
      title: '宇宙探索者',
      lastUpdated: Date.now()
    };
    
    return {
      categoryId,
      period: period as any,
      lastUpdated: Date.now(),
      rankings: rankings.slice(0, 50), // トップ50件
      playerRank: playerRanking
    };
  }
  
  // リーダーボードの取得
  getLeaderboard(categoryId: string, period: 'daily' | 'weekly' | 'monthly' | 'alltime'): LeaderboardData | null {
    const key = `${categoryId}_${period}`;
    return this.mockLeaderboards.get(key) || null;
  }
  
  // プレイヤーのスコアを更新（モック）
  updatePlayerScore(categoryId: string): void {
    const state = gameStateManager.getState();
    const category = this.categories.get(categoryId);
    
    if (!category) return;
    
    const score = category.scoreCalculation(state);
    console.log(`[RANKING] Updated score for ${categoryId}: ${score}`);
    
    // Coming Soon: 実際のスコア更新はバックエンド連携後
  }
  
  // カテゴリ一覧の取得
  getCategories(): RankingCategory[] {
    return Array.from(this.categories.values());
  }
  
  // プレイヤーの総合ランキング
  getPlayerOverallRanking(): { rank: number; percentile: number } {
    // モックデータ
    const rank = Math.floor(Math.random() * 10000) + 1;
    const totalPlayers = 100000;
    const percentile = ((totalPlayers - rank) / totalPlayers) * 100;
    
    return { rank, percentile };
  }
  
  // ヘルパー関数
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generatePlayerName(): string {
    const adjectives = ['宇宙の', '銀河の', '星間の', '次元の', '永遠の', '无限の'];
    const nouns = ['探索者', '創造者', '支配者', '守護者', '開拓者', '観測者'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 9999);
    
    return `${adj}${noun}${number}`;
  }
  
  private getRandomAvatar(): string {
    const avatars = ['👽', '🤖', '👩‍🚀', '👨‍🚀', '🧿', '🌌', '⭐', '🎆'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }
  
  private getRandomTitle(): string {
    const titles = [
      '新米探索者',
      '星の開拓者',
      '銀河の守護者',
      '次元の支配者',
      '宇宙の建築家',
      '永遠の観測者'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
}

export const rankingSystem = RankingSystem.getInstance();