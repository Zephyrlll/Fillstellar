/**
 * Social System
 * ソーシャル機能システム
 */

import { gameStateManager } from '../state.js';

export interface SharedUniverse {
  id: string;
  ownerId: string;
  ownerName: string;
  universeName: string;
  description: string;
  visitors: VisitorInfo[];
  settings: SharingSettings;
  statistics: UniverseStatistics;
  createdAt: number;
  lastActivity: number;
}

export interface VisitorInfo {
  playerId: string;
  playerName: string;
  visitTime: number;
  contribution: number;
}

export interface SharingSettings {
  isPublic: boolean;
  allowResourceSharing: boolean;
  allowCooperativeBuilding: boolean;
  maxVisitors: number;
  inviteCode?: string;
}

export interface UniverseStatistics {
  totalResources: number;
  celestialCount: number;
  intelligentLifeCount: number;
  prestigeLevel: number;
}

export interface CooperativeEvent {
  id: string;
  name: string;
  description: string;
  type: 'construction' | 'defense' | 'race' | 'exploration';
  icon: string;
  requirements: EventRequirement[];
  rewards: EventReward[];
  progress: number;
  maxProgress: number;
  participants: ParticipantInfo[];
  startTime: number;
  endTime: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface EventRequirement {
  type: 'players' | 'resources' | 'time' | 'celestials';
  amount: number;
  current: number;
}

export interface EventReward {
  type: 'resource' | 'unlock' | 'cosmetic' | 'title';
  target: string;
  amount: number;
  distribution: 'equal' | 'contribution' | 'random';
}

export interface ParticipantInfo {
  playerId: string;
  playerName: string;
  contribution: number;
  joinTime: number;
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  icon: string;
  level: number;
  experience: number;
  members: GuildMember[];
  maxMembers: number;
  bonuses: GuildBonus[];
  treasury: GuildTreasury;
  createdAt: number;
  weeklyActivity: number;
}

export interface GuildMember {
  playerId: string;
  playerName: string;
  role: 'leader' | 'officer' | 'member';
  contribution: number;
  joinDate: number;
  lastActive: number;
}

export interface GuildBonus {
  type: 'production' | 'research' | 'celestial' | 'special';
  value: number;
  level: number;
}

export interface GuildTreasury {
  resources: { [key: string]: number };
  artifacts: string[];
}

export class SocialSystem {
  private static instance: SocialSystem;
  private sharedUniverses: Map<string, SharedUniverse> = new Map();
  private cooperativeEvents: Map<string, CooperativeEvent> = new Map();
  private guilds: Map<string, Guild> = new Map();
  private playerGuild: Guild | null = null;
  private friends: Set<string> = new Set();
  
  private constructor() {
    this.generateMockData();
    console.log('[SOCIAL] System initialized');
  }
  
  static getInstance(): SocialSystem {
    if (!SocialSystem.instance) {
      SocialSystem.instance = new SocialSystem();
    }
    return SocialSystem.instance;
  }
  
  private generateMockData(): void {
    // モック共有宇宙
    this.generateMockSharedUniverses();
    
    // モック協力イベント
    this.generateMockCooperativeEvents();
    
    // モックギルド
    this.generateMockGuilds();
  }
  
  private generateMockSharedUniverses(): void {
    const mockUniverses: SharedUniverse[] = [
      {
        id: 'universe_1',
        ownerId: 'friend_1',
        ownerName: '星の建築家',
        universeName: 'アルファ・セントーリ',
        description: '生命に満ちた豊かな宇宙',
        visitors: [
          { playerId: 'player_1', playerName: '探索者A', visitTime: Date.now() - 3600000, contribution: 1000 },
          { playerId: 'player_2', playerName: '探索者B', visitTime: Date.now() - 7200000, contribution: 500 }
        ],
        settings: {
          isPublic: true,
          allowResourceSharing: true,
          allowCooperativeBuilding: true,
          maxVisitors: 5
        },
        statistics: {
          totalResources: 1000000000,
          celestialCount: 42,
          intelligentLifeCount: 3,
          prestigeLevel: 5
        },
        createdAt: Date.now() - 86400000 * 30,
        lastActivity: Date.now() - 3600000
      }
    ];
    
    mockUniverses.forEach(u => this.sharedUniverses.set(u.id, u));
  }
  
  private generateMockCooperativeEvents(): void {
    const mockEvents: CooperativeEvent[] = [
      {
        id: 'event_galactic_construction',
        name: '銀河建設プロジェクト',
        description: '全員で巨大な銀河構造物を建設する',
        type: 'construction',
        icon: '🏭',
        requirements: [
          { type: 'players', amount: 100, current: 47 },
          { type: 'resources', amount: 1000000000, current: 450000000 }
        ],
        rewards: [
          { type: 'resource', target: 'darkMatter', amount: 100000, distribution: 'contribution' },
          { type: 'title', target: 'galactic_builder', amount: 1, distribution: 'equal' }
        ],
        progress: 45,
        maxProgress: 100,
        participants: this.generateMockParticipants(47),
        startTime: Date.now() - 86400000,
        endTime: Date.now() + 86400000 * 6,
        status: 'active'
      },
      {
        id: 'event_void_defense',
        name: '虚空侵略防衛戦',
        description: '次元の狭間からの侵略者を撃退する',
        type: 'defense',
        icon: '🛡️',
        requirements: [
          { type: 'players', amount: 50, current: 23 },
          { type: 'celestials', amount: 500, current: 267 }
        ],
        rewards: [
          { type: 'unlock', target: 'void_shield_tech', amount: 1, distribution: 'equal' },
          { type: 'resource', target: 'energy', amount: 500000, distribution: 'equal' }
        ],
        progress: 53,
        maxProgress: 100,
        participants: this.generateMockParticipants(23),
        startTime: Date.now() - 43200000,
        endTime: Date.now() + 43200000,
        status: 'active'
      }
    ];
    
    mockEvents.forEach(e => this.cooperativeEvents.set(e.id, e));
  }
  
  private generateMockGuilds(): void {
    const mockGuilds: Guild[] = [
      {
        id: 'guild_1',
        name: '宇宙の守護者',
        tag: 'GUARD',
        description: '宇宙の平和と秩序を守るギルド',
        icon: '🛡️',
        level: 15,
        experience: 75000,
        members: this.generateMockGuildMembers(25),
        maxMembers: 30,
        bonuses: [
          { type: 'production', value: 0.15, level: 5 },
          { type: 'research', value: 0.10, level: 3 },
          { type: 'celestial', value: 0.05, level: 2 }
        ],
        treasury: {
          resources: {
            cosmicDust: 10000000,
            energy: 5000000,
            darkMatter: 100000
          },
          artifacts: ['ancient_compass', 'stellar_map']
        },
        createdAt: Date.now() - 86400000 * 90,
        weeklyActivity: 8500
      },
      {
        id: 'guild_2',
        name: '星間探索隊',
        tag: 'EXPL',
        description: '未知の領域を探索する冒険者たち',
        icon: '🚀',
        level: 12,
        experience: 45000,
        members: this.generateMockGuildMembers(20),
        maxMembers: 25,
        bonuses: [
          { type: 'special', value: 0.20, level: 4 },
          { type: 'production', value: 0.10, level: 3 }
        ],
        treasury: {
          resources: {
            cosmicDust: 5000000,
            energy: 3000000
          },
          artifacts: ['void_compass']
        },
        createdAt: Date.now() - 86400000 * 60,
        weeklyActivity: 6200
      }
    ];
    
    mockGuilds.forEach(g => this.guilds.set(g.id, g));
  }
  
  private generateMockParticipants(count: number): ParticipantInfo[] {
    const participants: ParticipantInfo[] = [];
    for (let i = 0; i < count; i++) {
      participants.push({
        playerId: `player_${i}`,
        playerName: `探索者${i + 1}`,
        contribution: Math.floor(Math.random() * 10000),
        joinTime: Date.now() - Math.random() * 86400000
      });
    }
    return participants;
  }
  
  private generateMockGuildMembers(count: number): GuildMember[] {
    const members: GuildMember[] = [];
    const roles: Array<'leader' | 'officer' | 'member'> = ['leader', 'officer', 'member', 'member', 'member'];
    
    for (let i = 0; i < count; i++) {
      members.push({
        playerId: `member_${i}`,
        playerName: `メンバー${i + 1}`,
        role: i === 0 ? 'leader' : roles[Math.min(i, roles.length - 1)],
        contribution: Math.floor(Math.random() * 100000),
        joinDate: Date.now() - Math.random() * 86400000 * 30,
        lastActive: Date.now() - Math.random() * 86400000
      });
    }
    return members;
  }
  
  // 共有宇宙の作成（モック）
  createSharedUniverse(settings: SharingSettings): SharedUniverse {
    const universe: SharedUniverse = {
      id: `universe_${Date.now()}`,
      ownerId: 'current_player',
      ownerName: 'あなた',
      universeName: 'マイ・ユニバース',
      description: '私の宇宙へようこそ！',
      visitors: [],
      settings,
      statistics: this.getCurrentUniverseStats(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    if (settings.isPublic && !settings.inviteCode) {
      universe.settings.inviteCode = this.generateInviteCode();
    }
    
    this.sharedUniverses.set(universe.id, universe);
    console.log('[SOCIAL] Created shared universe:', universe);
    
    return universe;
  }
  
  // 共有宇宙への訪問（モック）
  visitUniverse(universeId: string): boolean {
    const universe = this.sharedUniverses.get(universeId);
    if (!universe) return false;
    
    console.log('[SOCIAL] Visiting universe:', universe.universeName);
    console.log('[SOCIAL] Coming Soon: 実際の宇宙訪問機能');
    
    return true;
  }
  
  // 協力イベントへの参加（モック）
  joinCooperativeEvent(eventId: string): boolean {
    const event = this.cooperativeEvents.get(eventId);
    if (!event || event.status !== 'active') return false;
    
    console.log('[SOCIAL] Joining cooperative event:', event.name);
    console.log('[SOCIAL] Coming Soon: 実際のイベント参加機能');
    
    return true;
  }
  
  // ギルドへの参加（モック）
  joinGuild(guildId: string): boolean {
    if (this.playerGuild) {
      console.log('[SOCIAL] Already in a guild');
      return false;
    }
    
    const guild = this.guilds.get(guildId);
    if (!guild || guild.members.length >= guild.maxMembers) return false;
    
    console.log('[SOCIAL] Joining guild:', guild.name);
    console.log('[SOCIAL] Coming Soon: 実際のギルド参加機能');
    
    this.playerGuild = guild;
    return true;
  }
  
  // 現在の宇宙統計を取得
  private getCurrentUniverseStats(): UniverseStatistics {
    const state = gameStateManager.getState();
    return {
      totalResources: Object.values(state.resources || {}).reduce((sum: number, val: any) => sum + (val || 0), 0),
      celestialCount: state.stars?.length || 0,
      intelligentLifeCount: state.stars?.filter((s: any) => s.userData?.lifeStage === 'intelligent').length || 0,
      prestigeLevel: (window as any).prestigeSystem?.getPrestigeLevel() || 0
    };
  }
  
  // 招待コードの生成
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  // Getterメソッド
  getSharedUniverses(): SharedUniverse[] {
    return Array.from(this.sharedUniverses.values());
  }
  
  getCooperativeEvents(): CooperativeEvent[] {
    return Array.from(this.cooperativeEvents.values());
  }
  
  getGuilds(): Guild[] {
    return Array.from(this.guilds.values());
  }
  
  getPlayerGuild(): Guild | null {
    return this.playerGuild;
  }
  
  getFriends(): string[] {
    // モックフレンドリスト
    return ['星の建築家', '銀河の守護者', '次元の開拓者'];
  }
}

export const socialSystem = SocialSystem.getInstance();