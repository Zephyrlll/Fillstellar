import * as BABYLON from '@babylonjs/core';
import { BuildingSystem } from '../systems/BuildingSystem';
import { ResourceGatheringSystem } from '../systems/ResourceGatheringSystem';

export class UISystem {
    private scene: BABYLON.Scene;
    private buildingSystem: BuildingSystem;
    private resourceSystem: ResourceGatheringSystem;
    
    // UI要素
    private resourceDisplay: HTMLDivElement;
    private buildingMenu: HTMLDivElement;
    private boundaryWarning: HTMLDivElement;
    
    private isMenuOpen: boolean = false;
    
    constructor(
        scene: BABYLON.Scene,
        buildingSystem: BuildingSystem,
        resourceSystem: ResourceGatheringSystem
    ) {
        this.scene = scene;
        this.buildingSystem = buildingSystem;
        this.resourceSystem = resourceSystem;
    }
    
    initialize(): void {
        console.log('[UI] Initializing UI system...');
        
        // リソース表示
        this.createResourceDisplay();
        
        // 建設メニュー
        this.createBuildingMenu();
        
        // 境界警告
        this.createBoundaryWarning();
        
        // キーボードショートカット
        this.setupKeyboardShortcuts();
        
        console.log('[UI] UI system initialized');
    }
    
    private createResourceDisplay(): void {
        this.resourceDisplay = document.createElement('div');
        this.resourceDisplay.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            min-width: 200px;
        `;
        
        document.body.appendChild(this.resourceDisplay);
        this.updateResourceDisplay();
    }
    
    private createBuildingMenu(): void {
        this.buildingMenu = document.createElement('div');
        this.buildingMenu.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            display: none;
            min-width: 300px;
        `;
        
        this.buildingMenu.innerHTML = `
            <h2 style="margin: 0 0 20px 0; text-align: center;">建設メニュー</h2>
            <div id="buildingOptions"></div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="closeMenu" style="
                    padding: 10px 20px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">閉じる (ESC)</button>
            </div>
        `;
        
        document.body.appendChild(this.buildingMenu);
        
        // 建物オプションを追加
        this.updateBuildingOptions();
        
        // 閉じるボタン
        document.getElementById('closeMenu')?.addEventListener('click', () => {
            this.closeBuildingMenu();
        });
    }
    
    private createBoundaryWarning(): void {
        this.boundaryWarning = document.createElement('div');
        this.boundaryWarning.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 20px;
            display: none;
            text-align: center;
        `;
        
        this.boundaryWarning.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">⚠️ 警告</h3>
            <p style="margin: 0;">境界に近づいています！</p>
        `;
        
        document.body.appendChild(this.boundaryWarning);
    }
    
    private setupKeyboardShortcuts(): void {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                const key = kbInfo.event.key.toLowerCase();
                
                if (key === 'b') {
                    // 建設メニューの開閉
                    if (this.isMenuOpen) {
                        this.closeBuildingMenu();
                    } else {
                        this.openBuildingMenu();
                    }
                } else if (key === 'escape' && this.isMenuOpen) {
                    // ESCでメニューを閉じる
                    this.closeBuildingMenu();
                }
            }
        });
    }
    
    private updateResourceDisplay(): void {
        const inventory = this.resourceSystem.getInventory();
        
        this.resourceDisplay.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">リソース</h3>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <span style="width: 20px; height: 20px; background: #999; display: inline-block; margin-right: 10px;"></span>
                <span>鉱石: ${Math.floor(inventory.mineral)}</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <span style="width: 20px; height: 20px; background: #ff0; display: inline-block; margin-right: 10px;"></span>
                <span>エネルギー: ${Math.floor(inventory.energy)}</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <span style="width: 20px; height: 20px; background: #0f0; display: inline-block; margin-right: 10px;"></span>
                <span>有機物: ${Math.floor(inventory.organic)}</span>
            </div>
        `;
    }
    
    private updateBuildingOptions(): void {
        const optionsContainer = document.getElementById('buildingOptions');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        const buildingTypes = this.buildingSystem.getBuildingTypes();
        const inventory = this.resourceSystem.getInventory();
        
        buildingTypes.forEach(building => {
            const canAfford = this.canAffordBuilding(building.cost, inventory);
            
            const option = document.createElement('div');
            option.style.cssText = `
                background: ${canAfford ? '#333' : '#222'};
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                opacity: ${canAfford ? '1' : '0.5'};
            `;
            
            option.innerHTML = `
                <h4 style="margin: 0 0 5px 0;">${building.name}</h4>
                <div style="font-size: 14px; color: #aaa;">
                    コスト: 鉱石 ${building.cost.mineral || 0}, 
                    エネルギー ${building.cost.energy || 0}
                </div>
            `;
            
            if (canAfford) {
                option.addEventListener('click', () => {
                    this.buildingSystem.startPlacement(building.id);
                    this.closeBuildingMenu();
                });
            }
            
            optionsContainer.appendChild(option);
        });
    }
    
    private canAffordBuilding(
        cost: { [key: string]: number },
        inventory: { [key: string]: number }
    ): boolean {
        for (const resource in cost) {
            if (inventory[resource] < cost[resource]) {
                return false;
            }
        }
        return true;
    }
    
    private openBuildingMenu(): void {
        this.isMenuOpen = true;
        this.buildingMenu.style.display = 'block';
        this.updateBuildingOptions();
    }
    
    private closeBuildingMenu(): void {
        this.isMenuOpen = false;
        this.buildingMenu.style.display = 'none';
        this.buildingSystem.cancelPlacement();
    }
    
    showBoundaryWarning(): void {
        this.boundaryWarning.style.display = 'block';
        
        // 2秒後に非表示
        setTimeout(() => {
            this.boundaryWarning.style.display = 'none';
        }, 2000);
    }
    
    update(deltaTime: number): void {
        // リソース表示を更新（毎秒）
        if (Math.floor(deltaTime * 1000) % 1000 < 16) {
            this.updateResourceDisplay();
        }
    }
    
    dispose(): void {
        if (this.resourceDisplay) {
            this.resourceDisplay.remove();
        }
        if (this.buildingMenu) {
            this.buildingMenu.remove();
        }
        if (this.boundaryWarning) {
            this.boundaryWarning.remove();
        }
        
        console.log('[UI] Disposed');
    }
}