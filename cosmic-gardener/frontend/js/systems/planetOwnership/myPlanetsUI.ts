/**
 * My Planets UI
 * 所有惑星管理UI
 */

import { gameState, gameStateManager } from '../../state.js';
import { formatNumber } from '../../utils.js';
import { OwnedPlanet } from './planetShop.js';

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
        
        .view-3d-button {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
        }
        
        .view-3d-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(76, 175, 80, 0.5);
        }
        
        .view-3d-button:active {
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
      </style>
      
      <div class="my-planets-header">
        <div class="my-planets-title">🌍 マイ惑星</div>
        <button class="my-planets-close" id="close-my-planets">×</button>
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
            <button class="view-3d-button" data-planet-index="${index}" title="3D表示">
              🌐 3D
            </button>
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
        </div>
      `;
    }).join('');
    
    // 3D表示ボタンのイベントリスナー
    listContainer.querySelectorAll('.view-3d-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.planetIndex || '0');
        const planet = ownedPlanets[index];
        if (planet) {
          import('./planet3D/Planet3DViewer.js').then(({ Planet3DViewer }) => {
            Planet3DViewer.getInstance().open(planet);
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