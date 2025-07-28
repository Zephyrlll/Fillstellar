/**
 * Planet Shop System
 * 惑星ショップシステム - ゲームが惑星を販売
 */

import { gameState, gameStateManager } from '../../state.js';
import { showMessage } from '../../ui.js';
import { soundManager } from '../../sound.js';
import { addTimelineLog } from '../../timeline.js';

export interface PlanetForSale {
  id: string;
  name: string;
  type: 'desert' | 'ocean' | 'forest' | 'ice' | 'volcanic' | 'gas';
  price: number;
  baseProduction: {
    cosmicDust: number;
    energy: number;
    organicMatter: number;
  };
  description: string;
  imageUrl?: string;
}

export interface OwnedPlanet extends PlanetForSale {
  purchaseDate: number;
  level: number;
  productionMultiplier: number;
}

export class PlanetShop {
  private static instance: PlanetShop;
  private availablePlanets: PlanetForSale[] = [];
  private refreshTimer: number = 0;
  private readonly REFRESH_INTERVAL = 300000; // 5分ごとに商品更新
  
  private constructor() {
    this.generateInitialPlanets();
  }
  
  static getInstance(): PlanetShop {
    if (!PlanetShop.instance) {
      PlanetShop.instance = new PlanetShop();
    }
    return PlanetShop.instance;
  }
  
  /**
   * 初期惑星を生成
   */
  private generateInitialPlanets(): void {
    this.availablePlanets = [
      {
        id: `planet_${Date.now()}_1`,
        name: '新緑の惑星',
        type: 'forest',
        price: 50000,
        baseProduction: {
          cosmicDust: 10,
          energy: 5,
          organicMatter: 15
        },
        description: '豊かな森に覆われた惑星。有機物の生産に優れる。'
      },
      {
        id: `planet_${Date.now()}_2`,
        name: '砂漠の惑星',
        type: 'desert',
        price: 30000,
        baseProduction: {
          cosmicDust: 20,
          energy: 15,
          organicMatter: 2
        },
        description: '広大な砂漠が広がる惑星。エネルギー生産に適している。'
      },
      {
        id: `planet_${Date.now()}_3`,
        name: '海洋惑星',
        type: 'ocean',
        price: 75000,
        baseProduction: {
          cosmicDust: 8,
          energy: 8,
          organicMatter: 25
        },
        description: '全体が海に覆われた惑星。バランスの取れた資源生産が可能。'
      }
    ];
  }
  
  /**
   * 商品をリフレッシュ
   */
  refreshShop(): void {
    const planetTypes: PlanetForSale['type'][] = ['desert', 'ocean', 'forest', 'ice', 'volcanic', 'gas'];
    const names = {
      desert: ['灼熱の砂漠', '黄金の大地', '乾燥の惑星'],
      ocean: ['蒼い海原', '水の惑星', '深海の世界'],
      forest: ['緑の楽園', '生命の森', '翠の惑星'],
      ice: ['凍土の世界', '氷の惑星', '極寒の大地'],
      volcanic: ['火山の惑星', '溶岩の世界', '灼熱の大地'],
      gas: ['ガスの巨人', '嵐の惑星', '雲海の世界']
    };
    
    this.availablePlanets = [];
    
    // 3-5個の惑星を生成
    const count = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
      const type = planetTypes[Math.floor(Math.random() * planetTypes.length)];
      const nameList = names[type];
      const name = nameList[Math.floor(Math.random() * nameList.length)];
      
      // 基本価格とタイプに応じた生産量を設定
      const basePrice = 30000 + Math.random() * 70000;
      const production = this.generateProductionForType(type);
      
      this.availablePlanets.push({
        id: `planet_${Date.now()}_${i}`,
        name: name,
        type: type,
        price: Math.floor(basePrice),
        baseProduction: production,
        description: this.generateDescription(type)
      });
    }
    
    console.log('[PLANET_SHOP] Shop refreshed with', this.availablePlanets.length, 'planets');
  }
  
  /**
   * タイプに応じた生産量を生成
   */
  private generateProductionForType(type: PlanetForSale['type']): PlanetForSale['baseProduction'] {
    const productions = {
      desert: { cosmicDust: 15 + Math.random() * 10, energy: 20 + Math.random() * 10, organicMatter: 1 + Math.random() * 3 },
      ocean: { cosmicDust: 5 + Math.random() * 10, energy: 5 + Math.random() * 10, organicMatter: 20 + Math.random() * 15 },
      forest: { cosmicDust: 8 + Math.random() * 8, energy: 3 + Math.random() * 7, organicMatter: 15 + Math.random() * 10 },
      ice: { cosmicDust: 10 + Math.random() * 10, energy: 2 + Math.random() * 5, organicMatter: 5 + Math.random() * 5 },
      volcanic: { cosmicDust: 5 + Math.random() * 5, energy: 25 + Math.random() * 15, organicMatter: 2 + Math.random() * 3 },
      gas: { cosmicDust: 20 + Math.random() * 20, energy: 10 + Math.random() * 10, organicMatter: 0 }
    };
    
    const prod = productions[type];
    return {
      cosmicDust: Math.floor(prod.cosmicDust),
      energy: Math.floor(prod.energy),
      organicMatter: Math.floor(prod.organicMatter)
    };
  }
  
  /**
   * 説明文を生成
   */
  private generateDescription(type: PlanetForSale['type']): string {
    const descriptions = {
      desert: '広大な砂漠と岩石に覆われた惑星。太陽エネルギーの収集に最適。',
      ocean: '美しい海が広がる水の惑星。生命の源となる有機物が豊富。',
      forest: '緑豊かな森林に覆われた惑星。多様な生態系が資源を生み出す。',
      ice: '氷に覆われた極寒の惑星。希少な鉱物資源が眠っている。',
      volcanic: '活発な火山活動を持つ惑星。莫大なエネルギーを生成する。',
      gas: '巨大なガス惑星。宇宙の塵を大量に収集できる。'
    };
    return descriptions[type];
  }
  
  /**
   * 惑星を購入
   */
  purchasePlanet(planetId: string): boolean {
    const planet = this.availablePlanets.find(p => p.id === planetId);
    if (!planet) {
      showMessage('その惑星は既に売却されました');
      return false;
    }
    
    if (gameState.resources.cosmicDust < planet.price) {
      showMessage('宇宙の塵が不足しています');
      soundManager.playUISound('error');
      return false;
    }
    
    // 支払い処理
    gameStateManager.updateResource('cosmicDust', -planet.price);
    
    // 所有惑星に追加
    const ownedPlanet: OwnedPlanet = {
      ...planet,
      purchaseDate: Date.now(),
      level: 1,
      productionMultiplier: 1.0
    };
    
    // GameStateに所有惑星を追加
    gameStateManager.updateState(state => ({
      ...state,
      ownedPlanets: [...(state.ownedPlanets || []), ownedPlanet]
    }));
    
    // 商品リストから削除
    this.availablePlanets = this.availablePlanets.filter(p => p.id !== planetId);
    
    // ログとメッセージ
    addTimelineLog(`惑星「${planet.name}」を購入しました！`, 'achievement');
    showMessage(`${planet.name}を購入しました！`);
    soundManager.playUISound('success');
    
    return true;
  }
  
  /**
   * 利用可能な惑星リストを取得
   */
  getAvailablePlanets(): PlanetForSale[] {
    return [...this.availablePlanets];
  }
  
  /**
   * 次回リフレッシュまでの時間（秒）
   */
  getTimeUntilRefresh(): number {
    return Math.max(0, Math.floor((this.REFRESH_INTERVAL - this.refreshTimer) / 1000));
  }
  
  /**
   * 更新処理
   */
  update(deltaTime: number): void {
    this.refreshTimer += deltaTime * 1000; // ミリ秒に変換
    
    if (this.refreshTimer >= this.REFRESH_INTERVAL) {
      this.refreshShop();
      this.refreshTimer = 0;
    }
  }
}