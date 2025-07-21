/**
 * Celestial Auto-Creation System
 * 天体自動作成システム
 */

import { 
  CelestialAutoCreateConfig, 
  AutomationResult, 
  AutomationType,
  CelestialType 
} from '../types/automation.js';
import { gameState, gameStateManager } from '../state.js';
import { CelestialBodyFactory } from '../celestialBodyFactory.js';
import { unlockManager } from './unlockManager.js';
import * as THREE from 'three';

export class CelestialAutoCreator {
  private static instance: CelestialAutoCreator;
  private config: CelestialAutoCreateConfig;
  private creationCooldown: Map<CelestialType, number> = new Map();
  
  private constructor() {
    this.config = this.loadConfig();
    console.log('[AUTO-CREATE] Celestial auto-creator initialized');
  }
  
  static getInstance(): CelestialAutoCreator {
    if (!CelestialAutoCreator.instance) {
      CelestialAutoCreator.instance = new CelestialAutoCreator();
    }
    return CelestialAutoCreator.instance;
  }
  
  // 設定更新
  updateConfig(config: Partial<CelestialAutoCreateConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }
  
  // 自動作成実行
  execute(): AutomationResult {
    if (!this.config.enabled) {
      return {
        success: false,
        type: AutomationType.CELESTIAL_CREATION,
        message: 'Auto-creation is disabled'
      };
    }
    
    // アンロックチェック
    if (!unlockManager.isUnlocked(`celestial_${this.config.celestialType}`)) {
      return {
        success: false,
        type: AutomationType.CELESTIAL_CREATION,
        message: `${this.config.celestialType} is not unlocked yet`
      };
    }
    
    // クールダウンチェック
    const now = Date.now();
    const lastCreation = this.creationCooldown.get(this.config.celestialType) || 0;
    if (now - lastCreation < 2000) { // 2秒のクールダウン
      return {
        success: false,
        type: AutomationType.CELESTIAL_CREATION,
        message: 'Creation on cooldown'
      };
    }
    
    // リソースコストチェック
    const cost = this.getCreationCost(this.config.celestialType);
    if (!this.canAfford(cost)) {
      return {
        success: false,
        type: AutomationType.CELESTIAL_CREATION,
        message: 'Insufficient resources'
      };
    }
    
    // 位置決定
    const position = this.determinePosition();
    if (!position) {
      return {
        success: false,
        type: AutomationType.CELESTIAL_CREATION,
        message: 'No suitable position found'
      };
    }
    
    // 天体作成
    const result = this.createCelestial(this.config.celestialType, position);
    
    if (result.success) {
      // リソース消費
      this.consumeResources(cost);
      
      // クールダウン設定
      this.creationCooldown.set(this.config.celestialType, now);
      
      // 通知
      const feedbackSystem = (window as any).feedbackSystem;
      if (feedbackSystem) {
        feedbackSystem.showToast({
          message: `自動作成: ${this.getTypeName(this.config.celestialType)}`,
          type: 'info',
          duration: 2000
        });
      }
      
      return {
        success: true,
        type: AutomationType.CELESTIAL_CREATION,
        message: `Created ${this.config.celestialType}`,
        resourcesUsed: cost,
        itemsCreated: 1
      };
    }
    
    return {
      success: false,
      type: AutomationType.CELESTIAL_CREATION,
      message: result.message || 'Creation failed'
    };
  }
  
  // 作成コスト取得
  private getCreationCost(type: CelestialType): { [key: string]: number } {
    const baseCosts = {
      star: { cosmicDust: 1000, energy: 500 },
      planet: { cosmicDust: 500, energy: 200 },
      moon: { cosmicDust: 100, energy: 50 },
      asteroid: { cosmicDust: 50 },
      comet: { cosmicDust: 75, energy: 25 },
      black_hole: { cosmicDust: 10000, energy: 5000, darkMatter: 1000 }
    };
    
    const cost = baseCosts[type] || { cosmicDust: 100 };
    
    // プレステージボーナス適用
    const state = gameStateManager.getState();
    const costMultiplier = state.prestigeUpgrades?.autoCostReduction || 1.0;
    
    const adjustedCost: { [key: string]: number } = {};
    for (const [resource, amount] of Object.entries(cost)) {
      adjustedCost[resource] = Math.floor(amount * costMultiplier);
    }
    
    return adjustedCost;
  }
  
  // リソースチェック
  private canAfford(cost: { [key: string]: number }): boolean {
    const state = gameStateManager.getState();
    for (const [resource, amount] of Object.entries(cost)) {
      if ((state[resource] || 0) < amount) {
        return false;
      }
    }
    return true;
  }
  
  // リソース消費
  private consumeResources(cost: { [key: string]: number }): void {
    const updates: any = {};
    const state = gameStateManager.getState();
    
    for (const [resource, amount] of Object.entries(cost)) {
      updates[resource] = (state[resource] || 0) - amount;
    }
    
    gameStateManager.updateState(updates);
  }
  
  // 位置決定
  private determinePosition(): THREE.Vector3 | null {
    const state = gameStateManager.getState();
    
    switch (this.config.priorityPosition) {
      case 'near_existing':
        return this.findPositionNearExisting(state);
        
      case 'empty_space':
        return this.findEmptySpace(state);
        
      case 'random':
      default:
        return this.getRandomPosition();
    }
  }
  
  // 既存天体の近くに配置
  private findPositionNearExisting(state: any): THREE.Vector3 | null {
    if (state.stars.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    // ランダムな既存天体を選択
    const randomStar = state.stars[Math.floor(Math.random() * state.stars.length)];
    const basePos = randomStar.position;
    
    // 近くのランダムな位置
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
    
    return new THREE.Vector3().addVectors(basePos, offset);
  }
  
  // 空いている空間を探す
  private findEmptySpace(state: any): THREE.Vector3 | null {
    const maxAttempts = 10;
    const minDistance = 50;
    
    for (let i = 0; i < maxAttempts; i++) {
      const pos = this.getRandomPosition();
      
      // 他の天体との距離チェック
      let tooClose = false;
      for (const star of state.stars) {
        const distance = pos.distanceTo(star.position);
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        return pos;
      }
    }
    
    return null;
  }
  
  // ランダム位置
  private getRandomPosition(): THREE.Vector3 {
    const range = 300;
    return new THREE.Vector3(
      (Math.random() - 0.5) * range,
      (Math.random() - 0.5) * range,
      (Math.random() - 0.5) * range
    );
  }
  
  // 天体作成
  private createCelestial(type: CelestialType, position: THREE.Vector3): { success: boolean; message?: string } {
    try {
      const config = {
        position: position.toArray() as [number, number, number],
        velocity: [
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ] as [number, number, number],
        name: `Auto-${type}-${Date.now()}`
      };
      
      const result = CelestialBodyFactory.create(type, config);
      
      if (result.error) {
        return { success: false, message: result.error.message };
      }
      
      // シーンに追加（main.tsで処理されるはず）
      if (result.value && gameState.scene) {
        gameState.scene.add(result.value);
        gameState.stars.push(result.value);
      }
      
      return { success: true };
    } catch (error) {
      console.error('[AUTO-CREATE] Creation error:', error);
      return { success: false, message: 'Creation failed' };
    }
  }
  
  // タイプ名取得
  private getTypeName(type: CelestialType): string {
    const names = {
      star: '恒星',
      planet: '惑星',
      moon: '衛星',
      asteroid: '小惑星',
      comet: '彗星',
      black_hole: 'ブラックホール'
    };
    return names[type] || type;
  }
  
  // 設定保存
  private saveConfig(): void {
    localStorage.setItem('celestialAutoCreateConfig', JSON.stringify(this.config));
  }
  
  // 設定読み込み
  private loadConfig(): CelestialAutoCreateConfig {
    try {
      const saved = localStorage.getItem('celestialAutoCreateConfig');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[AUTO-CREATE] Failed to load config:', error);
    }
    
    return {
      enabled: false,
      celestialType: CelestialType.STAR,
      conditions: {
        operator: 'AND' as any,
        conditions: []
      },
      interval: 10000,
      maxPerCycle: 1,
      priorityPosition: 'random'
    };
  }
  
  // 設定取得
  getConfig(): CelestialAutoCreateConfig {
    return this.config;
  }
}

export const celestialAutoCreator = CelestialAutoCreator.getInstance();