/**
 * Planet Exploration Shop
 * 惑星探索前の準備ショップシステム
 */

import { gameState } from '../../state.js';
import { formatNumber } from '../../utils.js';
import { showMessage } from '../../ui.js';
import { OwnedPlanet } from './planetShop.js';

// 探索装備の定義
export interface ExplorationItem {
    id: string;
    name: string;
    description: string;
    category: 'equipment' | 'prefab' | 'consumable' | 'upgrade';
    cost: {
        cosmicDust?: number;
        energy?: number;
        organicMatter?: number;
        biomass?: number;
        darkMatter?: number;
        thoughtPoints?: number;
    };
    effect: {
        type: string;
        value: number | string;
        duration?: number; // 分単位
    };
    icon: string;
    maxPurchases?: number; // 最大購入数（undefinedは無制限）
}

// ショップアイテムの定義
export const EXPLORATION_ITEMS: ExplorationItem[] = [
    // 装備カテゴリ
    {
        id: 'advanced_suit',
        name: '高性能宇宙服',
        description: '酸素消費を50%削減し、移動速度を20%向上',
        category: 'equipment',
        cost: { cosmicDust: 10000, energy: 5000 },
        effect: { type: 'suit_upgrade', value: 'advanced' },
        icon: '🧑‍🚀',
        maxPurchases: 1
    },
    {
        id: 'energy_shield',
        name: 'エネルギーシールド',
        description: '受けるダメージを30%軽減',
        category: 'equipment',
        cost: { energy: 20000 },
        effect: { type: 'damage_reduction', value: 0.3 },
        icon: '🛡️',
        maxPurchases: 1
    },
    {
        id: 'speed_booster',
        name: '高速ブースター',
        description: '移動速度を100%向上（30分間）',
        category: 'equipment',
        cost: { darkMatter: 100 },
        effect: { type: 'speed_boost', value: 2.0, duration: 30 },
        icon: '🚀'
    },
    {
        id: 'resource_scanner',
        name: '高性能リソーススキャナー',
        description: 'レアリソースの発見確率を50%向上',
        category: 'equipment',
        cost: { thoughtPoints: 500 },
        effect: { type: 'rare_find_chance', value: 0.5 },
        icon: '📡',
        maxPurchases: 1
    },
    
    // プリファブカテゴリ
    {
        id: 'mining_kit',
        name: '採掘施設キット',
        description: '惑星で採掘施設を即座に建設（材料不要）',
        category: 'prefab',
        cost: { cosmicDust: 50000 },
        effect: { type: 'instant_building', value: 'miner' },
        icon: '🏭'
    },
    {
        id: 'defense_turret',
        name: '防衛タレット',
        description: '惑星に防衛施設を設置',
        category: 'prefab',
        cost: { thoughtPoints: 1000, energy: 30000 },
        effect: { type: 'instant_building', value: 'defense' },
        icon: '🔫'
    },
    {
        id: 'habitat_dome',
        name: '居住ドーム',
        description: '酸素供給施設を即座に建設',
        category: 'prefab',
        cost: { organicMatter: 10000, cosmicDust: 20000 },
        effect: { type: 'instant_building', value: 'habitat' },
        icon: '🏠'
    },
    
    // 消耗品カテゴリ
    {
        id: 'survival_pack',
        name: 'サバイバルキット',
        description: 'エナジーバー×10、医療キット×5、酸素タンク×3',
        category: 'consumable',
        cost: { organicMatter: 1000 },
        effect: { type: 'consumable_pack', value: 'survival' },
        icon: '🎒'
    },
    {
        id: 'energy_pack',
        name: 'エネルギーパック',
        description: 'エネルギーセル×20（建築用）',
        category: 'consumable',
        cost: { energy: 10000 },
        effect: { type: 'resource_pack', value: 'energy' },
        icon: '🔋'
    },
    {
        id: 'mineral_booster',
        name: '鉱物ブースター',
        description: '鉱物採取量を200%向上（60分間）',
        category: 'consumable',
        cost: { biomass: 5000 },
        effect: { type: 'gather_boost', value: 2.0, duration: 60 },
        icon: '⛏️'
    },
    
    // アップグレードカテゴリ
    {
        id: 'inventory_expansion',
        name: 'インベントリ拡張',
        description: 'アイテム所持数を+10スロット',
        category: 'upgrade',
        cost: { cosmicDust: 30000 },
        effect: { type: 'inventory_slots', value: 10 },
        icon: '📦',
        maxPurchases: 5
    },
    {
        id: 'auto_collector',
        name: '自動収集ドローン',
        description: '近くのリソースを自動で収集',
        category: 'upgrade',
        cost: { darkMatter: 200, thoughtPoints: 1000 },
        effect: { type: 'auto_collect', value: 'enabled' },
        icon: '🤖',
        maxPurchases: 1
    }
];

export class PlanetExplorationShop {
    private static instance: PlanetExplorationShop;
    private container: HTMLDivElement | null = null;
    private selectedPlanet: OwnedPlanet | null = null;
    private purchasedItems: Map<string, number> = new Map();
    private isOpen = false;
    
    private constructor() {
        this.loadPurchases();
    }
    
    static getInstance(): PlanetExplorationShop {
        if (!PlanetExplorationShop.instance) {
            PlanetExplorationShop.instance = new PlanetExplorationShop();
        }
        return PlanetExplorationShop.instance;
    }
    
    /**
     * ショップを開く
     */
    open(planet: OwnedPlanet): void {
        if (this.isOpen) return;
        
        this.selectedPlanet = planet;
        this.isOpen = true;
        this.createUI();
        this.updateUI();
    }
    
    /**
     * ショップを閉じる
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
        this.container.id = 'exploration-shop';
        this.container.innerHTML = `
            <style>
                #exploration-shop {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.95);
                    border: 2px solid #4CAF50;
                    border-radius: 15px;
                    padding: 30px;
                    min-width: 800px;
                    max-width: 1000px;
                    max-height: 80vh;
                    overflow-y: auto;
                    z-index: 10000;
                    box-shadow: 0 0 30px rgba(76, 175, 80, 0.3);
                }
                
                .shop-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #4CAF50;
                }
                
                .shop-title {
                    font-size: 28px;
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .shop-close {
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
                
                .shop-close:hover {
                    background: #4CAF50;
                    color: black;
                }
                
                .category-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .category-tab {
                    padding: 10px 20px;
                    background: rgba(76, 175, 80, 0.2);
                    border: 1px solid #4CAF50;
                    border-radius: 5px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .category-tab:hover {
                    background: rgba(76, 175, 80, 0.4);
                }
                
                .category-tab.active {
                    background: #4CAF50;
                    color: black;
                }
                
                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 15px;
                }
                
                .shop-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid #666;
                    border-radius: 10px;
                    padding: 15px;
                    transition: all 0.3s;
                    cursor: pointer;
                }
                
                .shop-item:hover {
                    border-color: #4CAF50;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
                }
                
                .shop-item.purchased {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .shop-item.affordable {
                    border-color: #4CAF50;
                }
                
                .item-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                
                .item-icon {
                    font-size: 32px;
                }
                
                .item-name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #4CAF50;
                }
                
                .item-description {
                    font-size: 12px;
                    color: #aaa;
                    margin-bottom: 10px;
                }
                
                .item-cost {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 10px;
                }
                
                .cost-item {
                    display: inline-block;
                    margin-right: 10px;
                }
                
                .cost-affordable {
                    color: #4CAF50;
                }
                
                .cost-unaffordable {
                    color: #ff4444;
                }
                
                .purchase-status {
                    font-size: 12px;
                    color: #4CAF50;
                    text-align: center;
                    margin-top: 10px;
                }
                
                .start-exploration {
                    margin-top: 20px;
                    padding: 15px 30px;
                    background: #4CAF50;
                    border: none;
                    border-radius: 5px;
                    color: black;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.3s;
                }
                
                .start-exploration:hover {
                    background: #45a049;
                    transform: scale(1.02);
                }
                
                .planet-info {
                    background: rgba(76, 175, 80, 0.1);
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    text-align: center;
                }
            </style>
            
            <div class="shop-header">
                <div class="shop-title">🛒 惑星探索準備ショップ</div>
                <button class="shop-close" id="close-shop">×</button>
            </div>
            
            <div class="planet-info">
                探索予定惑星: <strong>${this.selectedPlanet?.name || '不明'}</strong>
            </div>
            
            <div class="category-tabs" id="category-tabs">
                <div class="category-tab active" data-category="all">すべて</div>
                <div class="category-tab" data-category="equipment">装備</div>
                <div class="category-tab" data-category="prefab">プリファブ</div>
                <div class="category-tab" data-category="consumable">消耗品</div>
                <div class="category-tab" data-category="upgrade">アップグレード</div>
            </div>
            
            <div class="items-grid" id="items-grid">
                <!-- アイテムがここに表示される -->
            </div>
            
            <button class="start-exploration" id="start-exploration">
                🚀 探索を開始する
            </button>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー
        const closeBtn = document.getElementById('close-shop');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // カテゴリタブ
        const tabs = document.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = (e.target as HTMLElement).dataset.category;
                this.filterByCategory(category || 'all');
            });
        });
        
        // 探索開始ボタン
        const startBtn = document.getElementById('start-exploration');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startExploration());
        }
    }
    
    /**
     * UIを更新
     */
    private updateUI(): void {
        const grid = document.getElementById('items-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        EXPLORATION_ITEMS.forEach(item => {
            const itemElement = this.createItemElement(item);
            grid.appendChild(itemElement);
        });
    }
    
    /**
     * アイテム要素を作成
     */
    private createItemElement(item: ExplorationItem): HTMLDivElement {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.dataset.category = item.category;
        
        const purchased = this.purchasedItems.get(item.id) || 0;
        const canAfford = this.canAfford(item.cost);
        const maxReached = item.maxPurchases !== undefined && purchased >= item.maxPurchases;
        
        if (maxReached) {
            div.classList.add('purchased');
        } else if (canAfford) {
            div.classList.add('affordable');
        }
        
        div.innerHTML = `
            <div class="item-header">
                <span class="item-icon">${item.icon}</span>
                <span class="item-name">${item.name}</span>
            </div>
            <div class="item-description">${item.description}</div>
            <div class="item-cost">
                ${this.formatCost(item.cost)}
            </div>
            ${maxReached ? '<div class="purchase-status">最大購入数に達しました</div>' : ''}
            ${purchased > 0 && !maxReached ? `<div class="purchase-status">購入済み: ${purchased}個</div>` : ''}
        `;
        
        if (!maxReached) {
            div.addEventListener('click', () => this.purchaseItem(item));
        }
        
        return div;
    }
    
    /**
     * コストをフォーマット
     */
    private formatCost(cost: ExplorationItem['cost']): string {
        const parts: string[] = [];
        
        if (cost.cosmicDust) {
            const affordable = gameState.resources.cosmicDust >= cost.cosmicDust;
            parts.push(`<span class="cost-item ${affordable ? 'cost-affordable' : 'cost-unaffordable'}">
                宇宙の塵: ${formatNumber(cost.cosmicDust)}
            </span>`);
        }
        
        if (cost.energy) {
            const affordable = gameState.resources.energy >= cost.energy;
            parts.push(`<span class="cost-item ${affordable ? 'cost-affordable' : 'cost-unaffordable'}">
                エネルギー: ${formatNumber(cost.energy)}
            </span>`);
        }
        
        if (cost.organicMatter) {
            const affordable = gameState.resources.organicMatter >= cost.organicMatter;
            parts.push(`<span class="cost-item ${affordable ? 'cost-affordable' : 'cost-unaffordable'}">
                有機物: ${formatNumber(cost.organicMatter)}
            </span>`);
        }
        
        if (cost.biomass) {
            const affordable = gameState.resources.biomass >= cost.biomass;
            parts.push(`<span class="cost-item ${affordable ? 'cost-affordable' : 'cost-unaffordable'}">
                バイオマス: ${formatNumber(cost.biomass)}
            </span>`);
        }
        
        if (cost.darkMatter) {
            const affordable = gameState.resources.darkMatter >= cost.darkMatter;
            parts.push(`<span class="cost-item ${affordable ? 'cost-affordable' : 'cost-unaffordable'}">
                ダークマター: ${formatNumber(cost.darkMatter)}
            </span>`);
        }
        
        if (cost.thoughtPoints) {
            const affordable = gameState.resources.thoughtPoints >= cost.thoughtPoints;
            parts.push(`<span class="cost-item ${affordable ? 'cost-affordable' : 'cost-unaffordable'}">
                思考ポイント: ${formatNumber(cost.thoughtPoints)}
            </span>`);
        }
        
        return parts.join(' ');
    }
    
    /**
     * 購入可能かチェック
     */
    private canAfford(cost: ExplorationItem['cost']): boolean {
        if (cost.cosmicDust && gameState.resources.cosmicDust < cost.cosmicDust) return false;
        if (cost.energy && gameState.resources.energy < cost.energy) return false;
        if (cost.organicMatter && gameState.resources.organicMatter < cost.organicMatter) return false;
        if (cost.biomass && gameState.resources.biomass < cost.biomass) return false;
        if (cost.darkMatter && gameState.resources.darkMatter < cost.darkMatter) return false;
        if (cost.thoughtPoints && gameState.resources.thoughtPoints < cost.thoughtPoints) return false;
        return true;
    }
    
    /**
     * アイテムを購入
     */
    private purchaseItem(item: ExplorationItem): void {
        const purchased = this.purchasedItems.get(item.id) || 0;
        
        // 最大購入数チェック
        if (item.maxPurchases !== undefined && purchased >= item.maxPurchases) {
            showMessage('このアイテムはこれ以上購入できません', 'error');
            return;
        }
        
        // コストチェック
        if (!this.canAfford(item.cost)) {
            showMessage('リソースが不足しています', 'error');
            return;
        }
        
        // リソースを消費
        if (item.cost.cosmicDust) gameState.resources.cosmicDust -= item.cost.cosmicDust;
        if (item.cost.energy) gameState.resources.energy -= item.cost.energy;
        if (item.cost.organicMatter) gameState.resources.organicMatter -= item.cost.organicMatter;
        if (item.cost.biomass) gameState.resources.biomass -= item.cost.biomass;
        if (item.cost.darkMatter) gameState.resources.darkMatter -= item.cost.darkMatter;
        if (item.cost.thoughtPoints) gameState.resources.thoughtPoints -= item.cost.thoughtPoints;
        
        // 購入数を記録
        this.purchasedItems.set(item.id, purchased + 1);
        this.savePurchases();
        
        showMessage(`${item.name}を購入しました！`, 'success');
        this.updateUI();
    }
    
    /**
     * カテゴリでフィルター
     */
    private filterByCategory(category: string): void {
        // タブのアクティブ状態を更新
        document.querySelectorAll('.category-tab').forEach(tab => {
            if (tab.getAttribute('data-category') === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // アイテムの表示/非表示
        document.querySelectorAll('.shop-item').forEach(item => {
            const itemCategory = (item as HTMLElement).dataset.category;
            if (category === 'all' || itemCategory === category) {
                (item as HTMLElement).style.display = '';
            } else {
                (item as HTMLElement).style.display = 'none';
            }
        });
    }
    
    /**
     * 探索を開始
     */
    private startExploration(): void {
        if (!this.selectedPlanet) return;
        
        this.close();
        
        // 購入したアイテムを探索に持ち込む
        const purchasedData = Array.from(this.purchasedItems.entries()).map(([id, count]) => {
            const item = EXPLORATION_ITEMS.find(i => i.id === id);
            return { id, count, item };
        });
        
        // 探索を開始
        import('./planetExploration/PlanetExplorationBabylon.js').then(({ PlanetExplorationBabylon }) => {
            const exploration = PlanetExplorationBabylon.getInstance();
            exploration.setPurchasedItems(purchasedData);
            exploration.start(this.selectedPlanet!);
        });
        
        // 購入履歴をリセット
        this.purchasedItems.clear();
        this.savePurchases();
    }
    
    /**
     * 購入履歴を保存
     */
    private savePurchases(): void {
        localStorage.setItem('explorationPurchases', JSON.stringify(Array.from(this.purchasedItems.entries())));
    }
    
    /**
     * 購入履歴を読み込み
     */
    private loadPurchases(): void {
        const saved = localStorage.getItem('explorationPurchases');
        if (saved) {
            this.purchasedItems = new Map(JSON.parse(saved));
        }
    }
}