/**
 * Planet Shop UI
 * 惑星ショップのUI
 */

import { PlanetShop } from './planetShop.js';
import { formatNumber } from '../../utils.js';
import { gameState } from '../../state.js';

export class PlanetShopUI {
  private static instance: PlanetShopUI;
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private planetShop: PlanetShop;
  
  private constructor() {
    this.planetShop = PlanetShop.getInstance();
  }
  
  static getInstance(): PlanetShopUI {
    if (!PlanetShopUI.instance) {
      PlanetShopUI.instance = new PlanetShopUI();
    }
    return PlanetShopUI.instance;
  }
  
  /**
   * ショップUIを開く
   */
  open(): void {
    if (this.isOpen) return;
    
    this.createUI();
    this.isOpen = true;
    this.update();
  }
  
  /**
   * ショップUIを閉じる
   */
  close(): void {
    if (!this.isOpen) return;
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.isOpen = false;
  }
  
  /**
   * UIを作成
   */
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'planet-shop-ui';
    this.container.innerHTML = `
      <style>
        #planet-shop-ui {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #FFD700;
          border-radius: 15px;
          padding: 30px;
          min-width: 600px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          z-index: 10000;
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
        }
        
        .shop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #FFD700;
        }
        
        .shop-title {
          font-size: 28px;
          color: #FFD700;
          font-weight: bold;
        }
        
        .shop-close {
          background: none;
          border: 1px solid #FFD700;
          color: #FFD700;
          font-size: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .shop-close:hover {
          background: #FFD700;
          color: #000;
        }
        
        .shop-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          color: #AAA;
        }
        
        .planets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .planet-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #444;
          border-radius: 10px;
          padding: 15px;
          transition: all 0.3s;
          cursor: pointer;
        }
        
        .planet-card:hover {
          border-color: #FFD700;
          background: rgba(255, 215, 0, 0.1);
          transform: translateY(-2px);
        }
        
        .planet-name {
          font-size: 20px;
          color: #FFD700;
          margin-bottom: 5px;
        }
        
        .planet-type {
          font-size: 14px;
          color: #888;
          margin-bottom: 10px;
        }
        
        .planet-production {
          margin: 10px 0;
          font-size: 14px;
        }
        
        .production-item {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
          color: #AAA;
        }
        
        .planet-description {
          font-size: 12px;
          color: #888;
          margin: 10px 0;
          line-height: 1.4;
        }
        
        .planet-price {
          font-size: 18px;
          color: #4CAF50;
          font-weight: bold;
          text-align: center;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #333;
        }
        
        .planet-type-desert { color: #F4A460; }
        .planet-type-ocean { color: #4682B4; }
        .planet-type-forest { color: #228B22; }
        .planet-type-ice { color: #87CEEB; }
        .planet-type-volcanic { color: #FF6347; }
        .planet-type-gas { color: #DDA0DD; }
        
        .no-planets {
          text-align: center;
          color: #888;
          padding: 40px;
          font-size: 18px;
        }
        
        .refresh-timer {
          color: #FFD700;
          font-size: 14px;
        }
      </style>
      
      <div class="shop-header">
        <div class="shop-title">🌍 惑星ショップ</div>
        <button class="shop-close" id="close-planet-shop">×</button>
      </div>
      
      <div class="shop-info">
        <div>所持金: <span style="color: #FFD700;">${formatNumber(gameState.resources.cosmicDust)} CP</span></div>
        <div class="refresh-timer" id="refresh-timer">次回更新まで: --:--</div>
      </div>
      
      <div id="planets-container" class="planets-grid">
        <!-- 惑星カードがここに表示される -->
      </div>
    `;
    
    document.body.appendChild(this.container);
    
    // イベントリスナー
    const closeBtn = document.getElementById('close-planet-shop');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }
  
  /**
   * UIを更新
   */
  update(): void {
    if (!this.isOpen || !this.container) return;
    
    // 所持金を更新
    const moneySpan = this.container.querySelector('.shop-info span');
    if (moneySpan) {
      moneySpan.textContent = `${formatNumber(gameState.resources.cosmicDust)} CP`;
    }
    
    // リフレッシュタイマーを更新
    const timerElement = document.getElementById('refresh-timer');
    if (timerElement) {
      const seconds = this.planetShop.getTimeUntilRefresh();
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerElement.textContent = `次回更新まで: ${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 惑星リストを更新
    const container = document.getElementById('planets-container');
    if (!container) return;
    
    const planets = this.planetShop.getAvailablePlanets();
    
    if (planets.length === 0) {
      container.innerHTML = '<div class="no-planets">現在販売中の惑星はありません<br>次回更新をお待ちください</div>';
      return;
    }
    
    container.innerHTML = planets.map(planet => `
      <div class="planet-card" data-planet-id="${planet.id}">
        <div class="planet-name">${planet.name}</div>
        <div class="planet-type planet-type-${planet.type}">${this.getTypeName(planet.type)}</div>
        
        <div class="planet-production">
          <div class="production-item">
            <span>宇宙の塵:</span>
            <span>+${planet.baseProduction.cosmicDust}/s</span>
          </div>
          <div class="production-item">
            <span>エネルギー:</span>
            <span>+${planet.baseProduction.energy}/s</span>
          </div>
          <div class="production-item">
            <span>有機物:</span>
            <span>+${planet.baseProduction.organicMatter}/s</span>
          </div>
        </div>
        
        <div class="planet-description">${planet.description}</div>
        
        <div class="planet-price">${formatNumber(planet.price)} CP</div>
      </div>
    `).join('');
    
    // クリックイベントを設定
    container.querySelectorAll('.planet-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const planetId = (e.currentTarget as HTMLElement).dataset.planetId;
        if (planetId) {
          if (this.planetShop.purchasePlanet(planetId)) {
            this.update(); // UIを更新
          }
        }
      });
    });
  }
  
  /**
   * 惑星タイプの表示名を取得
   */
  private getTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      desert: '砂漠惑星',
      ocean: '海洋惑星',
      forest: '森林惑星',
      ice: '氷惑星',
      volcanic: '火山惑星',
      gas: 'ガス惑星'
    };
    return typeNames[type] || type;
  }
  
  /**
   * トグル
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}