/**
 * Multiverse System
 * 複数宇宙の同時管理機能
 */

import { gameStateManager, GameState } from '../state.js';
import { 
  Universe, 
  MultiverseData, 
  CreateUniverseOptions, 
  UniverseSummary,
  UniverseSlot,
  DEFAULT_MULTIVERSE_DATA,
  UNIVERSE_SLOT_REQUIREMENTS
} from '../types/multiverse.js';
import { saveGame, loadGame } from '../saveload.js';
import { paragonSystem } from './paragonSystem.js';

export class MultiverseSystem {
  private static instance: MultiverseSystem;
  private data: MultiverseData;
  private universeStates: Map<string, GameState>;
  private isInitialized: boolean = false;
  
  private constructor() {
    this.data = { ...DEFAULT_MULTIVERSE_DATA };
    this.universeStates = new Map();
  }
  
  static getInstance(): MultiverseSystem {
    if (!MultiverseSystem.instance) {
      MultiverseSystem.instance = new MultiverseSystem();
    }
    return MultiverseSystem.instance;
  }
  
  // 初期化
  init(): void {
    if (this.isInitialized) return;
    
    this.loadData();
    
    // 現在のゲーム状態を最初の宇宙として登録
    if (this.data.universes.length === 0) {
      const currentState = gameStateManager.getState();
      const firstUniverse = this.createFirstUniverse(currentState);
      this.data.universes.push(firstUniverse);
      this.data.activeUniverseId = firstUniverse.id;
      this.universeStates.set(firstUniverse.id, currentState);
    }
    
    this.isInitialized = true;
    console.log('[MULTIVERSE] System initialized');
  }
  
  // 最初の宇宙を作成
  private createFirstUniverse(state: GameState): Universe {
    return {
      id: this.generateUniverseId(),
      name: '宇宙 #1',
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      playTime: state.statistics?.totalPlayTime || 0,
      characteristics: {
        seed: 'default',
        traits: [],
        bonuses: {}
      },
      isActive: true
    };
  }
  
  // 新しい宇宙を作成
  createUniverse(options: CreateUniverseOptions): Universe | null {
    // スロットが利用可能かチェック
    if (this.data.universes.length >= this.data.unlockedSlots) {
      console.warn('[MULTIVERSE] No available universe slots');
      return null;
    }
    
    // 新しい宇宙を作成
    const universe: Universe = {
      id: this.generateUniverseId(),
      name: options.name || `宇宙 #${this.data.universes.length + 1}`,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      playTime: 0,
      characteristics: {
        seed: options.seed || this.generateSeed(),
        traits: [], // Phase 4.2.3で実装
        bonuses: {}
      },
      isActive: false
    };
    
    // 新しいゲーム状態を作成
    const newState = this.createNewGameState();
    
    // 宇宙を追加
    this.data.universes.push(universe);
    this.universeStates.set(universe.id, newState);
    
    this.saveData();
    
    // イベント発火
    window.dispatchEvent(new CustomEvent('universeCreated', { detail: universe }));
    
    console.log('[MULTIVERSE] Created new universe:', universe.id);
    return universe;
  }
  
  // 宇宙を切り替え
  switchUniverse(universeId: string): boolean {
    const targetUniverse = this.data.universes.find(u => u.id === universeId);
    if (!targetUniverse) {
      console.error('[MULTIVERSE] Universe not found:', universeId);
      return false;
    }
    
    // 現在の宇宙の状態を保存
    if (this.data.activeUniverseId) {
      const currentState = gameStateManager.getState();
      this.universeStates.set(this.data.activeUniverseId, currentState);
      
      // 現在の宇宙の情報を更新
      const currentUniverse = this.data.universes.find(u => u.id === this.data.activeUniverseId);
      if (currentUniverse) {
        currentUniverse.isActive = false;
        currentUniverse.lastPlayed = Date.now();
        currentUniverse.playTime = currentState.statistics?.totalPlayTime || 0;
      }
    }
    
    // 新しい宇宙の状態を読み込み
    const newState = this.universeStates.get(universeId);
    if (!newState) {
      console.error('[MULTIVERSE] Universe state not found:', universeId);
      return false;
    }
    
    // ゲーム状態を切り替え
    gameStateManager.setState(newState);
    
    // アクティブな宇宙を更新
    this.data.activeUniverseId = universeId;
    targetUniverse.isActive = true;
    targetUniverse.lastPlayed = Date.now();
    
    this.saveData();
    
    // イベント発火
    window.dispatchEvent(new CustomEvent('universeSwitched', { 
      detail: { 
        fromUniverseId: this.data.activeUniverseId,
        toUniverseId: universeId 
      } 
    }));
    
    console.log('[MULTIVERSE] Switched to universe:', universeId);
    return true;
  }
  
  // 宇宙を削除
  deleteUniverse(universeId: string): boolean {
    // アクティブな宇宙は削除できない
    if (universeId === this.data.activeUniverseId) {
      console.warn('[MULTIVERSE] Cannot delete active universe');
      return false;
    }
    
    // 最後の宇宙は削除できない
    if (this.data.universes.length <= 1) {
      console.warn('[MULTIVERSE] Cannot delete last universe');
      return false;
    }
    
    // 宇宙を削除
    const index = this.data.universes.findIndex(u => u.id === universeId);
    if (index === -1) return false;
    
    this.data.universes.splice(index, 1);
    this.universeStates.delete(universeId);
    
    this.saveData();
    
    console.log('[MULTIVERSE] Deleted universe:', universeId);
    return true;
  }
  
  // 宇宙数を取得
  getUniverseCount(): number {
    return this.data.universes.length;
  }
  
  // アクティブな宇宙IDを取得
  getActiveUniverseId(): string | null {
    return this.data.activeUniverseId;
  }
  
  // 全宇宙のサマリーを取得
  getAllUniverseSummaries(): UniverseSummary[] {
    return this.data.universes.map(u => this.getUniverseSummary(u.id)).filter(s => s !== null) as UniverseSummary[];
  }
  
  // 宇宙のサマリー情報を取得
  getUniverseSummary(universeId: string): UniverseSummary | null {
    const universe = this.data.universes.find(u => u.id === universeId);
    if (!universe) return null;
    
    const state = this.universeStates.get(universeId);
    if (!state) return null;
    
    return {
      id: universe.id,
      name: universe.name,
      level: state.paragon?.level || 0,
      totalResources: this.calculateTotalResources(state),
      celestialBodies: state.stars?.length || 0,
      achievements: state.achievements?.filter(a => a.unlocked).length || 0,
      lastPlayed: universe.lastPlayed,
      traits: universe.characteristics.traits.map(t => t.name)
    };
  }
  
  // 全宇宙のサマリーを取得
  getAllUniverseSummaries(): UniverseSummary[] {
    return this.data.universes.map(u => this.getUniverseSummary(u.id)).filter(s => s !== null) as UniverseSummary[];
  }
  
  // 宇宙スロットの情報を取得
  getUniverseSlots(): UniverseSlot[] {
    const slots: UniverseSlot[] = [];
    
    for (let i = 0; i < this.data.maxUniverses; i++) {
      const universe = this.data.universes[i] || null;
      const isUnlocked = i < this.data.unlockedSlots;
      const requirement = UNIVERSE_SLOT_REQUIREMENTS[i]?.requirement || null;
      
      slots.push({
        index: i,
        universe,
        isUnlocked,
        unlockRequirement: requirement as any
      });
    }
    
    return slots;
  }
  
  // スロットをアンロック
  unlockSlot(slotIndex: number): boolean {
    if (slotIndex >= this.data.maxUniverses) return false;
    if (slotIndex < this.data.unlockedSlots) return true;
    
    const requirement = UNIVERSE_SLOT_REQUIREMENTS[slotIndex]?.requirement;
    if (!requirement) {
      this.data.unlockedSlots = Math.max(this.data.unlockedSlots, slotIndex + 1);
      this.saveData();
      return true;
    }
    
    // 条件をチェック
    if (requirement.type === 'paragon_level') {
      const paragonLevel = paragonSystem.getData().level;
      if (paragonLevel >= requirement.value) {
        this.data.unlockedSlots = Math.max(this.data.unlockedSlots, slotIndex + 1);
        this.saveData();
        return true;
      }
    } else if (requirement.type === 'achievement') {
      // 実績システムをwindowから取得
      const achievementSystem = (window as any).achievementSystem;
      if (achievementSystem) {
        const hasAchievement = achievementSystem.hasAchievement(requirement.value as string);
        if (hasAchievement) {
          this.data.unlockedSlots = Math.max(this.data.unlockedSlots, slotIndex + 1);
          this.saveData();
          return true;
        }
      }
    }
    
    return false;
  }
  
  // 総資源量を計算
  private calculateTotalResources(state: GameState): number {
    let total = 0;
    
    // 基本資源
    Object.values(state.resources).forEach(amount => {
      total += amount;
    });
    
    // 無限資源（Phase 4.1.2で追加）
    if (state.infiniteResources) {
      Object.values(state.infiniteResources).forEach(amount => {
        total += amount as number;
      });
    }
    
    return total;
  }
  
  // 新しいゲーム状態を作成
  private createNewGameState(): GameState {
    // 基本的な初期状態を作成
    const newState: GameState = {
      resources: {
        cosmicDust: 100,
        energy: 0,
        organicMatter: 0,
        biomass: 0,
        darkMatter: 0,
        thoughtPoints: 0
      },
      stars: [],
      research: {
        completedResearch: [],
        activeResearch: null,
        researchProgress: {},
        researchQueue: []
      },
      statistics: {
        totalPlayTime: 0,
        totalClicks: 0,
        celestialBodiesCreated: 0,
        resourcesCollected: {},
        achievementsUnlocked: 0,
        researchCompleted: 0,
        prestigeCount: 0,
        totalResourcesEver: {}
      },
      achievements: [],
      saveVersion: '1.0.0',
      lastSaveTime: Date.now(),
      unlockedFeatures: {},
      paragon: paragonSystem.getDefaultData(),
      infiniteResources: {},
      mythicBonuses: {}
    };
    
    return newState;
  }
  
  // 宇宙IDを生成
  private generateUniverseId(): string {
    return `universe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // シードを生成
  private generateSeed(): string {
    return Math.random().toString(36).substr(2, 16);
  }
  
  // データを保存
  private saveData(): void {
    localStorage.setItem('multiverse_data', JSON.stringify(this.data));
    
    // 各宇宙の状態も保存
    this.data.universes.forEach(universe => {
      const state = this.universeStates.get(universe.id);
      if (state) {
        localStorage.setItem(`universe_state_${universe.id}`, JSON.stringify(state));
      }
    });
  }
  
  // データを読み込み
  private loadData(): void {
    const saved = localStorage.getItem('multiverse_data');
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        
        // 各宇宙の状態も読み込み
        this.data.universes.forEach(universe => {
          const stateStr = localStorage.getItem(`universe_state_${universe.id}`);
          if (stateStr) {
            const state = JSON.parse(stateStr);
            this.universeStates.set(universe.id, state);
          }
        });
      } catch (e) {
        console.error('[MULTIVERSE] Failed to load data:', e);
        this.data = { ...DEFAULT_MULTIVERSE_DATA };
      }
    }
  }
  
  // getter
  getData(): MultiverseData {
    return { ...this.data };
  }
  
  getActiveUniverse(): Universe | null {
    if (!this.data.activeUniverseId) return null;
    return this.data.universes.find(u => u.id === this.data.activeUniverseId) || null;
  }
  
  // 宇宙間で資源を転送
  transferResources(fromUniverseId: string, toUniverseId: string, resourceType: string, amount: number): boolean {
    // クールダウンチェック
    const now = Date.now();
    if (now - this.data.lastTransferTime < this.data.transferCooldown) {
      console.warn('[MULTIVERSE] Transfer is on cooldown');
      return false;
    }
    
    // 宇宙の存在チェック
    const fromUniverse = this.data.universes.find(u => u.id === fromUniverseId);
    const toUniverse = this.data.universes.find(u => u.id === toUniverseId);
    
    if (!fromUniverse || !toUniverse) {
      console.error('[MULTIVERSE] Invalid universe IDs for transfer');
      return false;
    }
    
    // 同じ宇宙への転送は不可
    if (fromUniverseId === toUniverseId) {
      console.warn('[MULTIVERSE] Cannot transfer to the same universe');
      return false;
    }
    
    // 送信元宇宙の状態を取得
    const fromState = this.universeStates.get(fromUniverseId);
    if (!fromState) {
      console.error('[MULTIVERSE] Source universe state not found');
      return false;
    }
    
    // 資源の存在と量のチェック
    const resourceAmount = this.getResourceAmount(fromState, resourceType);
    if (resourceAmount < amount) {
      console.warn('[MULTIVERSE] Insufficient resources for transfer');
      return false;
    }
    
    // 受信先宇宙の状態を取得
    const toState = this.universeStates.get(toUniverseId);
    if (!toState) {
      console.error('[MULTIVERSE] Target universe state not found');
      return false;
    }
    
    // 転送手数料（10%）
    const transferFee = Math.floor(amount * 0.1);
    const actualAmount = amount - transferFee;
    
    // 資源を転送
    this.subtractResource(fromState, resourceType, amount);
    this.addResource(toState, resourceType, actualAmount);
    
    // 状態を更新
    this.universeStates.set(fromUniverseId, fromState);
    this.universeStates.set(toUniverseId, toState);
    
    // クールダウンを設定
    this.data.lastTransferTime = now;
    
    this.saveData();
    
    // イベント発火
    window.dispatchEvent(new CustomEvent('resourceTransferred', { 
      detail: {
        fromUniverseId,
        toUniverseId,
        resourceType,
        amount,
        actualAmount,
        transferFee
      }
    }));
    
    console.log('[MULTIVERSE] Resource transferred:', {
      from: fromUniverseId,
      to: toUniverseId,
      resource: resourceType,
      amount,
      actualAmount,
      fee: transferFee
    });
    
    return true;
  }
  
  // 資源量を取得
  private getResourceAmount(state: GameState, resourceType: string): number {
    // 基本資源
    if (resourceType in state.resources) {
      return (state.resources as any)[resourceType] || 0;
    }
    
    // 無限資源
    if (state.infiniteResources && resourceType in state.infiniteResources) {
      return state.infiniteResources[resourceType] || 0;
    }
    
    return 0;
  }
  
  // 資源を減算
  private subtractResource(state: GameState, resourceType: string, amount: number): void {
    if (resourceType in state.resources) {
      (state.resources as any)[resourceType] = Math.max(0, (state.resources as any)[resourceType] - amount);
    } else if (state.infiniteResources && resourceType in state.infiniteResources) {
      state.infiniteResources[resourceType] = Math.max(0, state.infiniteResources[resourceType] - amount);
    }
  }
  
  // 資源を加算
  private addResource(state: GameState, resourceType: string, amount: number): void {
    if (resourceType in state.resources) {
      (state.resources as any)[resourceType] += amount;
    } else if (state.infiniteResources) {
      if (!state.infiniteResources[resourceType]) {
        state.infiniteResources[resourceType] = 0;
      }
      state.infiniteResources[resourceType] += amount;
    }
  }
  
  // 転送可能な資源リストを取得
  getTransferableResources(universeId: string): Array<{type: string, amount: number, displayName: string}> {
    const state = this.universeStates.get(universeId);
    if (!state) return [];
    
    const resources: Array<{type: string, amount: number, displayName: string}> = [];
    
    // 基本資源
    const basicResourceNames: {[key: string]: string} = {
      cosmicDust: '宇宙の塵',
      energy: 'エネルギー',
      organicMatter: '有機物',
      biomass: 'バイオマス',
      darkMatter: 'ダークマター',
      thoughtPoints: '思考ポイント'
    };
    
    Object.entries(state.resources).forEach(([type, amount]) => {
      if (amount > 0 && basicResourceNames[type]) {
        resources.push({
          type,
          amount,
          displayName: basicResourceNames[type]
        });
      }
    });
    
    // 無限資源
    if (state.infiniteResources) {
      Object.entries(state.infiniteResources).forEach(([type, amount]) => {
        if (amount > 0) {
          resources.push({
            type,
            amount: amount as number,
            displayName: this.getInfiniteResourceDisplayName(type)
          });
        }
      });
    }
    
    return resources;
  }
  
  // 無限資源の表示名を取得
  private getInfiniteResourceDisplayName(type: string): string {
    // 形式: resourceType_tierN
    const match = type.match(/^(.+)_tier(\d+)$/);
    if (match) {
      const baseType = match[1];
      const tier = match[2];
      const baseNames: {[key: string]: string} = {
        cosmicDust: '宇宙の塵',
        energy: 'エネルギー',
        organicMatter: '有機物',
        biomass: 'バイオマス',
        darkMatter: 'ダークマター',
        thoughtPoints: '思考ポイント'
      };
      const baseName = baseNames[baseType] || baseType;
      return `${baseName} Tier ${tier}`;
    }
    return type;
  }
  
  // 転送クールダウンの残り時間を取得（ミリ秒）
  getTransferCooldownRemaining(): number {
    const now = Date.now();
    const timeSinceLastTransfer = now - this.data.lastTransferTime;
    return Math.max(0, this.data.transferCooldown - timeSinceLastTransfer);
  }
}

export const multiverseSystem = MultiverseSystem.getInstance();