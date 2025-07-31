/**
 * Planet Exploration - Babylon.js統合ラッパー
 * cosmic-gardenerとplanetプロジェクトの橋渡し
 */

import { OwnedPlanet } from '../planetShop.js';
import { gameState } from '../../../state.js';
import { showMessage } from '../../../ui.js';
import { addTimelineLog } from '../../../timeline.js';
import { SimplePlanetGame } from './SimplePlanetGame.js';
import { PlanetExplorationRewards, ExplorationResult } from '../PlanetExplorationRewards.js';
import { PlanetPersistence, PlanetPersistentData } from '../PlanetPersistence.js';
import { BuildingPersistenceHooks } from './BuildingPersistenceHooks.js';

export class PlanetExplorationBabylon {
    private static instance: PlanetExplorationBabylon | null = null;
    private game: SimplePlanetGame | null = null;
    private container: HTMLDivElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private currentPlanet: OwnedPlanet | null = null;
    private hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];
    private purchasedItems: Array<{ id: string; count: number; item: any }> = [];
    private explorationStartTime: number = 0;
    private explorationData: Partial<ExplorationResult> = {};
    private persistenceHooks: BuildingPersistenceHooks | null = null;
    
    private constructor() {}
    
    static getInstance(): PlanetExplorationBabylon {
        if (!PlanetExplorationBabylon.instance) {
            PlanetExplorationBabylon.instance = new PlanetExplorationBabylon();
        }
        return PlanetExplorationBabylon.instance;
    }
    
    /**
     * 購入したアイテムを設定
     */
    setPurchasedItems(items: Array<{ id: string; count: number; item: any }>): void {
        this.purchasedItems = items;
        console.log('[BABYLON_INTEGRATION] Set purchased items:', items);
    }
    
    async start(planet: OwnedPlanet): Promise<void> {
        console.log('[BABYLON_INTEGRATION] Starting planet exploration for:', planet.name);
        
        this.currentPlanet = planet;
        this.explorationStartTime = Date.now();
        this.explorationData = {
            coinsEarned: 0,
            buildingsPlaced: 0,
            objectivesCompleted: 0,
            bonusReasons: []
        };
        
        // cosmic-gardenerのUIを隠す
        this.hideCosmicGardenerUI();
        
        // コンテナとキャンバスを作成
        this.createContainer();
        
        // SimplePlanetGameを開始
        this.game = new SimplePlanetGame(this.canvas!);
        
        // 永続性フックを設定
        this.persistenceHooks = new BuildingPersistenceHooks(planet.id);
        this.persistenceHooks.applyHooks(this.game);
        
        // 保存データを読み込み
        this.loadPlanetData();
        
        // 購入したアイテムを適用
        this.applyPurchasedItems();
        
        // データ収集フックを設定
        this.setupDataCollection();
        
        // 訪問統計を更新
        PlanetPersistence.getInstance().updateStatistics(planet.id, { visit: true });
        
        await this.game.start();
        
        // UI要素が作成されるまで少し待つ
        setTimeout(() => {
            console.log('[BABYLON_INTEGRATION] Checking for UI elements...');
            
            // 全てのUI要素を列挙してデバッグ
            const allElements = document.querySelectorAll('div[id], canvas[id]');
            console.log('[BABYLON_INTEGRATION] Found elements with IDs:', Array.from(allElements).map(el => el.id));
            
            // SimplePlanetGameのUI要素をコンテナ内に移動
            const gameUIElements = [
                '#resourceUI',
                '#controls', 
                '#soundControl',
                '#menu',
                '#buildingMenu',
                '#consumableQuickSlots',
                '#survivalUI',
                '#craftingMenu',
                '#weatherDisplay',
                '#tutorialUI',
                '#minimapCanvas',
                '#inventoryUI',
                '#scanner',
                '#notification-container'
            ];
            
            gameUIElements.forEach(selector => {
                const element = document.querySelector(selector) as HTMLElement;
                if (element) {
                    if (element.parentElement === document.body) {
                        // document.bodyからコンテナに移動
                        this.container?.appendChild(element);
                        element.style.zIndex = '100001';
                        console.log(`[BABYLON_INTEGRATION] Moved UI element to container: ${selector}`);
                    } else {
                        // すでに別の親要素にある場合も移動
                        console.log(`[BABYLON_INTEGRATION] Element ${selector} is in: ${element.parentElement?.tagName || 'unknown'}`);
                        this.container?.appendChild(element);
                        element.style.zIndex = '100001';
                    }
                } else {
                    console.warn(`[BABYLON_INTEGRATION] UI element not found: ${selector}`);
                }
            });
            
            // チュートリアルが開始されているか確認
            const tutorialUI = document.querySelector('#tutorialUI');
            if (!tutorialUI) {
                console.warn('[BABYLON_INTEGRATION] Tutorial UI not found - tutorial may not have started');
            }
        }, 2000); // 2秒待つ
        
        // 退出ボタンを追加
        this.addExitButton();
        
        // ESCキーで退出
        this.setupExitHandler();
    }
    
    private createContainer(): void {
        // 既存のコンテナがあれば削除
        if (this.container) {
            this.container.remove();
        }
        
        this.container = document.createElement('div');
        this.container.id = 'babylon-planet-exploration';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            background: #000;
        `;
        
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'renderCanvas';
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            touch-action: none;
            display: block;
        `;
        
        this.container.appendChild(this.canvas);
        document.body.appendChild(this.container);
    }
    
    private addExitButton(): void {
        const exitButton = document.createElement('button');
        exitButton.innerHTML = '🚀 宇宙に戻る';
        exitButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            z-index: 100002;
            font-family: Arial, sans-serif;
        `;
        
        exitButton.onclick = () => this.exit();
        this.container?.appendChild(exitButton);
    }
    
    private setupExitHandler(): void {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.exit();
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }
    
    private exit(): void {
        console.log('[BABYLON_INTEGRATION] Exiting to space');
        
        // 探索結果を収集
        this.collectFinalData();
        
        // 惑星データを保存
        this.savePlanetData();
        
        // ゲームを停止
        if (this.game) {
            // フックを削除
            if (this.persistenceHooks) {
                this.persistenceHooks.removeHooks(this.game);
            }
            
            // @ts-ignore
            if (this.game.engine) {
                // @ts-ignore
                this.game.engine.stopRenderLoop();
                // @ts-ignore
                this.game.engine.dispose();
            }
        }
        
        // コンテナを削除
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        // cosmic-gardenerのUIを復元
        this.restoreCosmicGardenerUI();
        
        // 報酬画面を表示
        const explorationTime = Math.floor((Date.now() - this.explorationStartTime) / 1000);
        const result: ExplorationResult = {
            duration: explorationTime,
            coinsEarned: this.explorationData.coinsEarned || 0,
            buildingsPlaced: this.explorationData.buildingsPlaced || 0,
            objectivesCompleted: this.explorationData.objectivesCompleted || 0,
            bonusReasons: this.explorationData.bonusReasons || []
        };
        
        // 報酬画面を表示
        PlanetExplorationRewards.getInstance().show(result);
        
        // インスタンスをリセット
        this.game = null;
        this.canvas = null;
        this.purchasedItems = [];
        PlanetExplorationBabylon.instance = null;
    }
    
    private hideCosmicGardenerUI(): void {
        // cosmic-gardenerの主要なUI要素を隠す
        const elementsToHide = [
            '#ui-container',
            '#three-container',
            '#stats',
            '#resource-display',
            '#message-container',
            '#timeline-container',
            '#menu-icon',
            '#menu-container',
            '.tab-container',
            '.floating-ui',
            'canvas:not(#renderCanvas)',  // Babylon.js以外のキャンバス
            // その他のUI要素
            '#production-chain-visualizer',
            '#research-visualizer',
            '#automation-ui',
            '#achievement-notification',
            '#daily-challenge-ui',
            '#multiverse-ui',
            '#prestige-ui',
            '#paragon-ui',
            '#phase-ui',
            '#stats-panel',
            '#performance-overlay'
        ];
        
        this.hiddenElements = [];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element instanceof HTMLElement) {
                    this.hiddenElements.push({
                        element,
                        originalDisplay: element.style.display
                    });
                    element.style.display = 'none';
                }
            });
        });
        
        // Three.jsのレンダリングループを一時停止
        // @ts-ignore
        if (window.gameRenderer) {
            // @ts-ignore
            window.gameRenderer.pause();
        }
    }
    
    private restoreCosmicGardenerUI(): void {
        // 隠した要素を復元
        this.hiddenElements.forEach(({ element, originalDisplay }) => {
            element.style.display = originalDisplay || '';
        });
        this.hiddenElements = [];
        
        // Three.jsのレンダリングループを再開
        // @ts-ignore
        if (window.gameRenderer) {
            // @ts-ignore
            window.gameRenderer.resume();
        }
    }
    
    /**
     * 購入したアイテムを適用
     */
    private applyPurchasedItems(): void {
        if (!this.game || this.purchasedItems.length === 0) return;
        
        console.log('[BABYLON_INTEGRATION] Applying purchased items...');
        
        // @ts-ignore - SimplePlanetGameのメンバーにアクセス
        const gameInstance = this.game;
        
        this.purchasedItems.forEach(({ id, count, item }) => {
            if (!item || !item.item) return;
            
            const itemData = item.item;
            console.log(`[BABYLON_INTEGRATION] Applying ${itemData.name} x${count}`);
            
            switch (itemData.effect.type) {
                // 装備効果
                case 'suit_upgrade':
                    // @ts-ignore
                    if (gameInstance.survivalSystem) {
                        // @ts-ignore
                        gameInstance.survivalSystem.oxygenDepletionRate *= 0.5; // 酸素消費50%削減
                        // @ts-ignore
                        if (gameInstance.player && gameInstance.player.moveSpeed) {
                            // @ts-ignore
                            gameInstance.player.moveSpeed *= 1.2; // 移動速度20%向上
                        }
                    }
                    break;
                    
                case 'damage_reduction':
                    // @ts-ignore
                    if (gameInstance.damageReduction !== undefined) {
                        // @ts-ignore
                        gameInstance.damageReduction = (gameInstance.damageReduction || 0) + itemData.effect.value;
                    }
                    break;
                    
                case 'speed_boost':
                    // @ts-ignore
                    if (gameInstance.player && gameInstance.player.moveSpeed) {
                        // @ts-ignore
                        gameInstance.player.moveSpeed *= itemData.effect.value;
                        // 時限効果の場合はタイマーを設定
                        if (itemData.effect.duration) {
                            setTimeout(() => {
                                // @ts-ignore
                                if (gameInstance.player && gameInstance.player.moveSpeed) {
                                    // @ts-ignore
                                    gameInstance.player.moveSpeed /= itemData.effect.value;
                                }
                            }, itemData.effect.duration * 60 * 1000);
                        }
                    }
                    break;
                    
                case 'rare_find_chance':
                    // @ts-ignore
                    gameInstance.rareFindChance = (gameInstance.rareFindChance || 0) + itemData.effect.value;
                    break;
                    
                // プリファブ
                case 'instant_building':
                    // ゲーム開始後に建物を配置する処理を追加
                    setTimeout(() => {
                        for (let i = 0; i < count; i++) {
                            this.placeInstantBuilding(itemData.effect.value);
                        }
                    }, 5000); // ゲーム開始5秒後に配置
                    break;
                    
                // 消耗品パック
                case 'consumable_pack':
                    if (itemData.effect.value === 'survival') {
                        // @ts-ignore
                        if (gameInstance.consumableManager) {
                            // @ts-ignore
                            gameInstance.consumableManager.addItem('energy_bar', 10 * count);
                            // @ts-ignore
                            gameInstance.consumableManager.addItem('medical_kit', 5 * count);
                            // @ts-ignore
                            gameInstance.consumableManager.addItem('oxygen_tank', 3 * count);
                        }
                    }
                    break;
                    
                case 'resource_pack':
                    // @ts-ignore
                    if (gameInstance.resources) {
                        // @ts-ignore
                        gameInstance.resources.energy += 20 * count;
                    }
                    break;
                    
                case 'gather_boost':
                    // @ts-ignore
                    gameInstance.gatherBoost = (gameInstance.gatherBoost || 1) * itemData.effect.value;
                    if (itemData.effect.duration) {
                        setTimeout(() => {
                            // @ts-ignore
                            gameInstance.gatherBoost /= itemData.effect.value;
                        }, itemData.effect.duration * 60 * 1000);
                    }
                    break;
                    
                // アップグレード
                case 'inventory_slots':
                    // @ts-ignore
                    if (gameInstance.inventorySlots !== undefined) {
                        // @ts-ignore
                        gameInstance.inventorySlots = (gameInstance.inventorySlots || 20) + (itemData.effect.value * count);
                    }
                    break;
                    
                case 'auto_collect':
                    // @ts-ignore
                    gameInstance.autoCollectEnabled = true;
                    break;
            }
        });
        
        // 適用完了メッセージ
        if (this.purchasedItems.length > 0) {
            showMessage(`${this.purchasedItems.length}個のアイテムを適用しました`, 'success');
        }
    }
    
    /**
     * 即座に建物を配置
     */
    private placeInstantBuilding(buildingType: string): void {
        if (!this.game) return;
        
        // @ts-ignore
        const gameInstance = this.game;
        
        // 建物タイプに応じて配置処理を実行
        console.log(`[BABYLON_INTEGRATION] Placing instant building: ${buildingType}`);
        
        // ここで実際の建物配置処理を呼び出す
        // SimplePlanetGameの建物配置APIに依存
    }
    
    /**
     * データ収集フックを設定
     */
    private setupDataCollection(): void {
        if (!this.game) return;
        
        // 建物配置をモニタリング
        const originalPlaceBuilding = (this.game as any).placeBuilding;
        if (originalPlaceBuilding) {
            (this.game as any).placeBuilding = (...args: any[]) => {
                const result = originalPlaceBuilding.apply(this.game, args);
                
                // 建物配置数を記録
                if (this.explorationData) {
                    this.explorationData.buildingsPlaced++;
                }
                
                return result;
            };
        }
        
        // 目標達成をモニタリング  
        const originalCompleteObjective = (this.game as any).completeObjective;
        if (originalCompleteObjective) {
            (this.game as any).completeObjective = (...args: any[]) => {
                const result = originalCompleteObjective.apply(this.game, args);
                
                // 目標達成数を記録
                if (this.explorationData) {
                    this.explorationData.objectivesCompleted++;
                }
                
                return result;
            };
        }
    }
    
    /**
     * 最終データを収集
     */
    private collectFinalData(): void {
        if (!this.game || !this.explorationData) return;
        
        // @ts-ignore
        const gameInstance = this.game;
        
        // 獲得したコインを計算
        let totalCoins = 0;
        const bonusReasons = [];
        
        // 基本コイン（現在のコイン数）
        // @ts-ignore
        if (gameInstance.coins) {
            // @ts-ignore
            const baseCoins = gameInstance.coins - 1000; // 初期コインを引く
            if (baseCoins > 0) {
                totalCoins += baseCoins;
                bonusReasons.push({
                    reason: '探索で獲得',
                    amount: baseCoins
                });
            }
        }
        
        // 建物ボーナス
        if (this.explorationData.buildingsPlaced > 0) {
            const buildingBonus = this.explorationData.buildingsPlaced * 100;
            totalCoins += buildingBonus;
            bonusReasons.push({
                reason: `建物 ${this.explorationData.buildingsPlaced}個 配置`,
                amount: buildingBonus
            });
        }
        
        // 目標達成ボーナス
        if (this.explorationData.objectivesCompleted > 0) {
            const objectiveBonus = this.explorationData.objectivesCompleted * 500;
            totalCoins += objectiveBonus;
            bonusReasons.push({
                reason: `目標 ${this.explorationData.objectivesCompleted}個 達成`,
                amount: objectiveBonus
            });
        }
        
        // 探索時間ボーナス（5分以上で追加ボーナス）
        const explorationMinutes = Math.floor((Date.now() - this.explorationStartTime) / 60000);
        if (explorationMinutes >= 5) {
            const timeBonus = explorationMinutes * 50;
            totalCoins += timeBonus;
            bonusReasons.push({
                reason: `${explorationMinutes}分間 探索`,
                amount: timeBonus
            });
        }
        
        this.explorationData.coinsEarned = totalCoins;
        this.explorationData.bonusReasons = bonusReasons;
    }
    
    /**
     * 惑星データを読み込み
     */
    private loadPlanetData(): void {
        if (!this.currentPlanet || !this.game) return;
        
        const persistence = PlanetPersistence.getInstance();
        const savedData = persistence.loadPlanetData(this.currentPlanet.id);
        
        if (!savedData) {
            console.log('[BABYLON_INTEGRATION] No saved data found for planet:', this.currentPlanet.id);
            return;
        }
        
        console.log('[BABYLON_INTEGRATION] Loading saved planet data:', savedData);
        
        // @ts-ignore
        const gameInstance = this.game;
        
        // 建物を復元
        if (savedData.buildings.length > 0 && this.persistenceHooks) {
            console.log('[BABYLON_INTEGRATION] Restoring buildings:', savedData.buildings.length);
            setTimeout(() => {
                this.persistenceHooks!.restoreBuildings(gameInstance, savedData.buildings);
            }, 3000);
        }
        
        // 地形変更を復元
        if (savedData.terrainModifications.length > 0 && this.persistenceHooks) {
            console.log('[BABYLON_INTEGRATION] Restoring terrain modifications:', savedData.terrainModifications.length);
            setTimeout(() => {
                this.persistenceHooks!.restoreTerrainModifications(gameInstance, savedData.terrainModifications);
            }, 4000);
        }
        
        // インベントリを復元
        if (savedData.inventory.resources) {
            // @ts-ignore
            if (gameInstance.resources) {
                // @ts-ignore
                gameInstance.resources.minerals = savedData.inventory.resources.minerals;
                // @ts-ignore
                gameInstance.resources.energy = savedData.inventory.resources.energy;
                // @ts-ignore
                gameInstance.resources.parts = savedData.inventory.resources.parts;
            }
        }
        
        // 探索進捗を復元
        if (this.explorationData.exploration) {
            this.explorationData.exploration.areasDiscovered = savedData.exploration.areasDiscovered.length;
            this.explorationData.exploration.secretsFound = savedData.exploration.secretsFound.length;
            this.explorationData.exploration.distanceTraveled = savedData.exploration.totalDistanceTraveled;
        }
        
        showMessage(`${savedData.buildings.length}個の建物を復元しました`, 'info');
    }
    
    /**
     * 惑星データを保存
     */
    private savePlanetData(): void {
        if (!this.currentPlanet || !this.game || !this.explorationData) return;
        
        const persistence = PlanetPersistence.getInstance();
        
        // @ts-ignore
        const gameInstance = this.game;
        
        // 建物データを収集（仮のデータ - 実際のAPIに置き換える必要あり）
        const buildings = this.explorationData.buildingsConstructed.map((building, index) => ({
            id: `building_${Date.now()}_${index}`,
            type: building.type,
            position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
            rotation: 0,
            level: 1,
            health: 100,
            constructedAt: Date.now()
        }));
        
        // 現在のリソース
        const resources = {
            // @ts-ignore
            minerals: gameInstance.resources?.minerals || 0,
            // @ts-ignore
            energy: gameInstance.resources?.energy || 0,
            // @ts-ignore
            parts: gameInstance.resources?.parts || 0
        };
        
        // 探索時間を更新
        const explorationTime = Math.floor((Date.now() - this.explorationStartTime) / 1000);
        
        // データを保存
        persistence.savePlanetData(this.currentPlanet.id, {
            buildings,
            inventory: {
                items: [],
                resources
            }
        });
        
        // 探索進捗を更新
        persistence.updateExplorationProgress(this.currentPlanet.id, {
            totalTimeSpent: explorationTime,
            totalDistanceTraveled: this.explorationData.exploration?.distanceTraveled || 0
        });
        
        // 収集したリソースの統計を更新
        if (this.explorationData.resourcesCollected) {
            persistence.updateStatistics(this.currentPlanet.id, {
                resourcesCollected: {
                    minerals: this.explorationData.resourcesCollected.minerals,
                    energy: this.explorationData.resourcesCollected.energy,
                    parts: this.explorationData.resourcesCollected.parts
                }
            });
        }
        
        console.log('[BABYLON_INTEGRATION] Planet data saved');
    }
}