/**
 * Exploration UI
 * 惑星探索ゲームのUI
 */

import { FirstPersonController } from '../player/FirstPersonController.js';
import { BuildingSystem, BuildingType } from '../building/BuildingSystem.js';
import { ResourceSystem, ResourceType } from '../resources/ResourceSystem.js';

export class ExplorationUI {
    private container: HTMLElement;
    private playerController: FirstPersonController;
    private buildingSystem: BuildingSystem;
    private resourceSystem: ResourceSystem;
    
    // UI要素
    private hudElement: HTMLElement;
    private inventoryElement: HTMLElement;
    private buildMenuElement: HTMLElement;
    private statsElement: HTMLElement;
    private exitButton: HTMLElement;
    
    // 状態
    private showInventory = false;
    private showBuildMenu = false;
    
    constructor(
        container: HTMLElement,
        playerController: FirstPersonController,
        buildingSystem: BuildingSystem,
        resourceSystem: ResourceSystem
    ) {
        this.container = container;
        this.playerController = playerController;
        this.buildingSystem = buildingSystem;
        this.resourceSystem = resourceSystem;
        
        this.createUI();
        this.setupEventListeners();
    }
    
    /**
     * UIを作成
     */
    private createUI(): void {
        // HUD（常時表示）
        this.hudElement = document.createElement('div');
        this.hudElement.id = 'exploration-hud';
        this.hudElement.innerHTML = `
            <div class="crosshair">+</div>
            <div class="controls-hint">
                <div>WASD - 移動 | SPACE - ジャンプ | SHIFT - 走る</div>
                <div>E - 採集 | B - 建築 | I - インベントリ | ESC - メニュー</div>
            </div>
        `;
        this.hudElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        // クロスヘアのスタイル
        const style = document.createElement('style');
        style.textContent = `
            .crosshair {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 24px;
                color: rgba(255, 255, 255, 0.8);
                text-shadow: 0 0 2px black;
            }
            
            .controls-hint {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                background: rgba(0, 0, 0, 0.5);
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
            }
            
            .inventory-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                border: 2px solid #444;
                border-radius: 10px;
                padding: 20px;
                min-width: 400px;
                pointer-events: all;
            }
            
            .build-menu {
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid #444;
                border-radius: 10px;
                padding: 20px;
                display: flex;
                gap: 10px;
                pointer-events: all;
            }
            
            .build-item {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #666;
                border-radius: 5px;
                padding: 10px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                min-width: 100px;
            }
            
            .build-item:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .stats-panel {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                border: 1px solid #444;
                border-radius: 5px;
                padding: 15px;
                min-width: 200px;
                pointer-events: none;
            }
            
            .resource-item {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
            }
            
            .exit-button {
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(200, 0, 0, 0.8);
                border: 2px solid #ff4444;
                border-radius: 5px;
                padding: 10px 20px;
                color: white;
                cursor: pointer;
                font-size: 16px;
                pointer-events: all;
                transition: all 0.2s;
            }
            
            .exit-button:hover {
                background: rgba(255, 0, 0, 0.9);
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
        
        // インベントリパネル
        this.inventoryElement = document.createElement('div');
        this.inventoryElement.className = 'inventory-panel';
        this.inventoryElement.style.display = 'none';
        this.inventoryElement.innerHTML = `
            <h2>インベントリ</h2>
            <div id="inventory-content"></div>
            <button onclick="this.parentElement.style.display='none'">閉じる (I)</button>
        `;
        
        // 建築メニュー
        this.buildMenuElement = document.createElement('div');
        this.buildMenuElement.className = 'build-menu';
        this.buildMenuElement.style.display = 'none';
        
        // 統計パネル
        this.statsElement = document.createElement('div');
        this.statsElement.className = 'stats-panel';
        
        // 終了ボタン
        this.exitButton = document.createElement('button');
        this.exitButton.className = 'exit-button';
        this.exitButton.textContent = '惑星を離れる';
        
        // コンテナに追加
        this.container.appendChild(this.hudElement);
        this.container.appendChild(this.inventoryElement);
        this.container.appendChild(this.buildMenuElement);
        this.container.appendChild(this.statsElement);
        this.container.appendChild(this.exitButton);
        
        // 建築メニューを初期化
        this.createBuildMenu();
    }
    
    /**
     * 建築メニューを作成
     */
    private createBuildMenu(): void {
        const buildingTypes = [
            BuildingType.SHELTER,
            BuildingType.STORAGE,
            BuildingType.GENERATOR,
            BuildingType.EXTRACTOR,
            BuildingType.WORKSHOP
        ];
        
        buildingTypes.forEach(type => {
            const item = document.createElement('div');
            item.className = 'build-item';
            item.innerHTML = `
                <div>${this.getBuildingName(type)}</div>
                <div style="font-size: 12px; color: #888;">コスト: 要確認</div>
            `;
            item.onclick = () => {
                this.buildingSystem.enterBuildMode(type);
                this.hideBuildMenu();
            };
            this.buildMenuElement.appendChild(item);
        });
    }
    
    /**
     * 建物名を取得
     */
    private getBuildingName(type: BuildingType): string {
        const names: Record<BuildingType, string> = {
            [BuildingType.SHELTER]: 'シェルター',
            [BuildingType.STORAGE]: '貯蔵庫',
            [BuildingType.GENERATOR]: '発電機',
            [BuildingType.EXTRACTOR]: '採掘機',
            [BuildingType.WORKSHOP]: 'ワークショップ'
        };
        return names[type] || type;
    }
    
    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        document.addEventListener('keydown', this.onKeyDown);
        
        this.exitButton.addEventListener('click', () => {
            if (confirm('惑星探索を終了しますか？')) {
                this.onExit();
            }
        });
    }
    
    /**
     * キー押下時
     */
    private onKeyDown = (event: KeyboardEvent): void => {
        switch (event.key.toLowerCase()) {
            case 'i':
                this.toggleInventory();
                break;
            case 'b':
                this.toggleBuildMenu();
                break;
            case 'e':
                this.harvestResources();
                break;
            case 'escape':
                if (this.showInventory) {
                    this.hideInventory();
                } else if (this.showBuildMenu) {
                    this.hideBuildMenu();
                }
                break;
        }
    };
    
    /**
     * インベントリの表示切替
     */
    private toggleInventory(): void {
        if (this.showInventory) {
            this.hideInventory();
        } else {
            this.showInventory();
        }
    }
    
    /**
     * インベントリを表示
     */
    private showInventory(): void {
        this.showInventory = true;
        this.inventoryElement.style.display = 'block';
        this.updateInventoryContent();
    }
    
    /**
     * インベントリを非表示
     */
    private hideInventory(): void {
        this.showInventory = false;
        this.inventoryElement.style.display = 'none';
    }
    
    /**
     * インベントリ内容を更新
     */
    private updateInventoryContent(): void {
        const content = document.getElementById('inventory-content');
        if (!content) return;
        
        const inventory = this.resourceSystem.getInventory();
        
        let html = '<div class="inventory-grid">';
        for (const [type, amount] of inventory) {
            html += `
                <div class="resource-item">
                    <span>${this.getResourceName(type)}</span>
                    <span>${amount}</span>
                </div>
            `;
        }
        html += '</div>';
        
        content.innerHTML = html;
    }
    
    /**
     * リソース名を取得
     */
    private getResourceName(type: ResourceType): string {
        const names: Record<ResourceType, string> = {
            [ResourceType.CRYSTAL]: 'クリスタル',
            [ResourceType.METAL]: '金属鉱石',
            [ResourceType.ORGANIC]: '有機物',
            [ResourceType.ENERGY]: 'エネルギー結晶',
            [ResourceType.RARE]: 'レア元素'
        };
        return names[type] || type;
    }
    
    /**
     * 建築メニューの表示切替
     */
    private toggleBuildMenu(): void {
        if (this.showBuildMenu) {
            this.hideBuildMenu();
        } else {
            this.showBuildMenu();
        }
    }
    
    /**
     * 建築メニューを表示
     */
    private showBuildMenu(): void {
        this.showBuildMenu = true;
        this.buildMenuElement.style.display = 'flex';
    }
    
    /**
     * 建築メニューを非表示
     */
    private hideBuildMenu(): void {
        this.showBuildMenu = false;
        this.buildMenuElement.style.display = 'none';
    }
    
    /**
     * リソースを採集
     */
    private harvestResources(): void {
        const playerPosition = this.playerController.getPosition();
        const harvestedCount = this.resourceSystem.harvestNearbyResources(playerPosition);
        
        if (harvestedCount > 0) {
            this.showHarvestNotification(harvestedCount);
        }
    }
    
    /**
     * 採集通知を表示
     */
    private showHarvestNotification(count: number): void {
        const notification = document.createElement('div');
        notification.textContent = `${count}個のリソースを採集しました！`;
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 18px;
            pointer-events: none;
            animation: fadeOut 2s forwards;
        `;
        
        this.container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
    
    /**
     * 統計情報を更新
     */
    private updateStats(): void {
        const position = this.playerController.getPosition();
        const coords = position ? `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}` : 'N/A';
        
        const buildings = this.buildingSystem.getAllBuildings();
        const buildingCount = buildings.length;
        
        this.statsElement.innerHTML = `
            <h3>統計情報</h3>
            <div class="resource-item">
                <span>位置:</span>
                <span style="font-size: 12px;">${coords}</span>
            </div>
            <div class="resource-item">
                <span>建物:</span>
                <span>${buildingCount}</span>
            </div>
        `;
    }
    
    /**
     * 終了時の処理
     */
    private onExit(): void {
        console.log('[UI] Exiting planet exploration');
        
        // PlanetExplorationGameのstopメソッドを呼ぶ
        import('../core/PlanetExplorationGame.js').then(module => {
            const game = module.PlanetExplorationGame.getInstance();
            game.stop();
        });
    }
    
    /**
     * 更新
     */
    update(deltaTime: number): void {
        // 統計情報を定期更新
        this.updateStats();
        
        // インベントリが開いている場合は内容を更新
        if (this.showInventory) {
            this.updateInventoryContent();
        }
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        
        // UI要素を削除
        this.hudElement.remove();
        this.inventoryElement.remove();
        this.buildMenuElement.remove();
        this.statsElement.remove();
        this.exitButton.remove();
    }
}