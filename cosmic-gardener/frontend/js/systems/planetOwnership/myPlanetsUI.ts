/**
 * My Planets UI
 * 所有惑星管理UI
 */

import { gameState, gameStateManager } from '../../state.js';
import { formatNumber } from '../../utils.js';
import { OwnedPlanet } from './planetShop.js';
import { PlanetPersistence } from './PlanetPersistence.js';

export class MyPlanetsUI {
  private static instance: MyPlanetsUI;
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  
  private constructor() {}
  
  static getInstance(): MyPlanetsUI {
    if (!MyPlanetsUI.instance) {
      MyPlanetsUI.instance = new MyPlanetsUI();
    }
    return MyPlanetsUI.instance;
  }
  
  /**
   * UIを開く
   */
  open(): void {
    if (this.isOpen) return;
    
    this.createUI();
    this.isOpen = true;
    this.update();
  }
  
  /**
   * UIを閉じる
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
    this.container.id = 'my-planets-ui';
    this.container.innerHTML = `
      <style>
        #my-planets-ui {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #4CAF50;
          border-radius: 15px;
          padding: 30px;
          min-width: 700px;
          max-width: 900px;
          max-height: 80vh;
          overflow-y: auto;
          z-index: 10000;
          box-shadow: 0 0 30px rgba(76, 175, 80, 0.3);
        }
        
        .my-planets-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #4CAF50;
        }
        
        .my-planets-title {
          font-size: 28px;
          color: #4CAF50;
          font-weight: bold;
        }
        
        .my-planets-close {
          background: none;
          border: 1px solid #4CAF50;
          color: #4CAF50;
          font-size: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .my-planets-close:hover {
          background: #4CAF50;
          color: #000;
        }
        
        .summary-section {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid #4CAF50;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .summary-title {
          font-size: 20px;
          color: #4CAF50;
          margin-bottom: 15px;
        }
        
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          color: #CCC;
        }
        
        .stat-value {
          color: #FFD700;
          font-weight: bold;
        }
        
        .planets-list {
          margin-top: 20px;
        }
        
        .planet-item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #444;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 15px;
          transition: all 0.3s;
        }
        
        .planet-item:hover {
          border-color: #4CAF50;
          background: rgba(76, 175, 80, 0.05);
        }
        
        .planet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .explore-button {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
          font-weight: bold;
        }
        
        .explore-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(76, 175, 80, 0.5);
        }
        
        .explore-button:active {
          transform: scale(0.95);
        }
        
        .automation-button {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 5px rgba(33, 150, 243, 0.3);
          font-weight: bold;
        }
        
        .automation-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(33, 150, 243, 0.5);
        }
        
        .automation-button:active {
          transform: scale(0.95);
        }
        
        .planet-info {
          flex: 1;
        }
        
        .planet-name {
          font-size: 20px;
          color: #FFD700;
          margin-bottom: 5px;
        }
        
        .planet-details {
          display: flex;
          gap: 20px;
          color: #888;
          font-size: 14px;
        }
        
        .planet-production {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #333;
        }
        
        .planet-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #333;
        }
        
        .stat-item-small {
          text-align: center;
          background: rgba(0, 0, 0, 0.2);
          padding: 8px;
          border-radius: 5px;
          font-size: 12px;
        }
        
        .stat-label-small {
          color: #888;
          margin-bottom: 3px;
        }
        
        .stat-value-small {
          color: #FFD700;
          font-weight: bold;
        }
        
        .production-box {
          text-align: center;
          background: rgba(0, 0, 0, 0.3);
          padding: 10px;
          border-radius: 5px;
        }
        
        .production-label {
          font-size: 12px;
          color: #888;
          margin-bottom: 5px;
        }
        
        .production-value {
          font-size: 16px;
          color: #4CAF50;
          font-weight: bold;
        }
        
        .no-planets {
          text-align: center;
          color: #888;
          padding: 60px;
          font-size: 18px;
        }
        
        .shop-button {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.3s;
        }
        
        .shop-button:hover {
          background: #45a049;
          transform: scale(1.05);
        }
        
        .ranking-button {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: none;
          color: black;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 5px rgba(255, 215, 0, 0.3);
          font-weight: bold;
        }
        
        .ranking-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(255, 215, 0, 0.5);
        }
        
        .trade-button {
          background: linear-gradient(135deg, #FF9800, #F57C00);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 5px rgba(255, 152, 0, 0.3);
          font-weight: bold;
        }
        
        .trade-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(255, 152, 0, 0.5);
        }
      </style>
      
      <div class="my-planets-header">
        <div class="my-planets-title">🌍 マイ惑星</div>
        <div style="display: flex; gap: 15px;">
          <button class="trade-button" id="open-trade">
            🚢 貿易
          </button>
          <button class="ranking-button" id="open-ranking">
            🏆 ランキング
          </button>
          <button class="my-planets-close" id="close-my-planets">×</button>
        </div>
      </div>
      
      <div class="summary-section">
        <div class="summary-title">📈 総合統計</div>
        <div class="summary-stats">
          <div class="stat-item">
            <span>所有惑星数:</span>
            <span class="stat-value" id="total-planets">0</span>
          </div>
          <div class="stat-item">
            <span>宇宙の塵生産:</span>
            <span class="stat-value" id="total-dust-production">0/s</span>
          </div>
          <div class="stat-item">
            <span>エネルギー生産:</span>
            <span class="stat-value" id="total-energy-production">0/s</span>
          </div>
          <div class="stat-item">
            <span>有機物生産:</span>
            <span class="stat-value" id="total-organic-production">0/s</span>
          </div>
        </div>
      </div>
      
      <div id="planets-list-container" class="planets-list">
        <!-- 所有惑星がここに表示される -->
      </div>
    `;
    
    document.body.appendChild(this.container);
    
    // イベントリスナー
    const closeBtn = document.getElementById('close-my-planets');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // 貿易ボタン
    const tradeBtn = document.getElementById('open-trade');
    if (tradeBtn) {
      tradeBtn.addEventListener('click', () => {
        import('./PlanetTradeUI.js').then(({ PlanetTradeUI }) => {
          PlanetTradeUI.getInstance().open();
        });
      });
    }
    
    // ランキングボタン
    const rankingBtn = document.getElementById('open-ranking');
    if (rankingBtn) {
      rankingBtn.addEventListener('click', () => {
        import('./PlanetRankingUI.js').then(({ PlanetRankingUI }) => {
          PlanetRankingUI.getInstance().open();
        });
      });
    }
  }
  
  /**
   * UIを更新
   */
  update(): void {
    if (!this.isOpen || !this.container) return;
    
    const ownedPlanets = (gameState as any).ownedPlanets || [];
    
    // 統計を計算
    let totalDust = 0;
    let totalEnergy = 0;
    let totalOrganic = 0;
    
    ownedPlanets.forEach((planet: OwnedPlanet) => {
      totalDust += planet.baseProduction.cosmicDust * planet.productionMultiplier;
      totalEnergy += planet.baseProduction.energy * planet.productionMultiplier;
      totalOrganic += planet.baseProduction.organicMatter * planet.productionMultiplier;
    });
    
    // 統計を更新
    const updateElement = (id: string, value: string) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    
    updateElement('total-planets', ownedPlanets.length.toString());
    updateElement('total-dust-production', `${formatNumber(totalDust)}/s`);
    updateElement('total-energy-production', `${formatNumber(totalEnergy)}/s`);
    updateElement('total-organic-production', `${formatNumber(totalOrganic)}/s`);
    
    // 惑星リストを更新
    const listContainer = document.getElementById('planets-list-container');
    if (!listContainer) return;
    
    if (ownedPlanets.length === 0) {
      listContainer.innerHTML = `
        <div class="no-planets">
          まだ惑星を所有していません
          <br>
          <button class="shop-button" id="open-shop-button">惑星ショップを開く</button>
        </div>
      `;
      
      const shopButton = document.getElementById('open-shop-button');
      if (shopButton) {
        shopButton.addEventListener('click', () => {
          this.close();
          import('./planetShopUI.js').then(({ PlanetShopUI }) => {
            PlanetShopUI.getInstance().open();
          });
        });
      }
      return;
    }
    
    listContainer.innerHTML = ownedPlanets.map((planet: OwnedPlanet, index: number) => {
      const purchaseDate = new Date(planet.purchaseDate);
      const daysOwned = Math.floor((Date.now() - planet.purchaseDate) / (1000 * 60 * 60 * 24));
      
      // 永続データを取得
      const persistentData = PlanetPersistence.getInstance().loadPlanetData(planet.id);
      
      return `
        <div class="planet-item">
          <div class="planet-header">
            <div class="planet-info">
              <div class="planet-name">${planet.name}</div>
              <div class="planet-details">
                <span class="planet-type-${planet.type}">${this.getTypeName(planet.type)}</span>
                <span>Lv.${planet.level}</span>
                <span>${daysOwned}日前に購入</span>
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="explore-button" data-planet-index="${index}" title="惑星を探索">
                🚀 探索する
              </button>
              <button class="automation-button" data-planet-index="${index}" title="自動化管理">
                🤖 自動化
              </button>
            </div>
          </div>
          
          <div class="planet-production">
            <div class="production-box">
              <div class="production-label">宇宙の塵</div>
              <div class="production-value">+${formatNumber(planet.baseProduction.cosmicDust * planet.productionMultiplier)}/s</div>
            </div>
            <div class="production-box">
              <div class="production-label">エネルギー</div>
              <div class="production-value">+${formatNumber(planet.baseProduction.energy * planet.productionMultiplier)}/s</div>
            </div>
            <div class="production-box">
              <div class="production-label">有機物</div>
              <div class="production-value">+${formatNumber(planet.baseProduction.organicMatter * planet.productionMultiplier)}/s</div>
            </div>
          </div>
          
          ${persistentData ? `
            <div class="planet-stats">
              <div class="stat-item-small">
                <div class="stat-label-small">訪問回数</div>
                <div class="stat-value-small">${persistentData.statistics.totalVisits}</div>
              </div>
              <div class="stat-item-small">
                <div class="stat-label-small">建物数</div>
                <div class="stat-value-small">${persistentData.buildings.length}</div>
              </div>
              <div class="stat-item-small">
                <div class="stat-label-small">総採掘量</div>
                <div class="stat-value-small">${formatNumber(persistentData.statistics.totalResourcesCollected.minerals)}</div>
              </div>
              <div class="stat-item-small">
                <div class="stat-label-small">発見エリア</div>
                <div class="stat-value-small">${persistentData.exploration.areasDiscovered.length}</div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    // 探索ボタンのイベントリスナー
    listContainer.querySelectorAll('.explore-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.planetIndex || '0');
        const planet = ownedPlanets[index];
        if (planet) {
          // まず準備ショップを開く
          import('./PlanetExplorationShop.js').then(({ PlanetExplorationShop }) => {
            console.log('[MY_PLANETS] Opening exploration shop for:', planet.name);
            const shop = PlanetExplorationShop.getInstance();
            shop.open(planet);
          });
          // 所有惑星UIを閉じる
          this.close();
        }
      });
    });
    
    // 自動化ボタンのイベントリスナー
    listContainer.querySelectorAll('.automation-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.planetIndex || '0');
        const planet = ownedPlanets[index];
        if (planet) {
          import('./PlanetAutomationUI.js').then(({ PlanetAutomationUI }) => {
            console.log('[MY_PLANETS] Opening automation UI for:', planet.name);
            const automationUI = PlanetAutomationUI.getInstance();
            automationUI.open(planet);
          });
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