import { ConsumableManager, CONSUMABLE_ITEMS, ConsumableItem } from '../systems/ConsumableItems';
import { SurvivalSystem } from '../systems/SurvivalSystem';

export class ConsumablesUI {
    private container: HTMLDivElement;
    private quickSlots: HTMLDivElement;
    private craftingMenu: HTMLDivElement;
    private manager: ConsumableManager;
    private survivalSystem: SurvivalSystem;
    private onCraft: (item: ConsumableItem) => boolean;
    private selectedSlots: Map<number, string> = new Map();
    
    constructor(
        manager: ConsumableManager,
        survivalSystem: SurvivalSystem,
        onCraft: (item: ConsumableItem) => boolean
    ) {
        this.manager = manager;
        this.survivalSystem = survivalSystem;
        this.onCraft = onCraft;
        this.createUI();
        this.setupKeyBindings();
    }
    
    private createUI(): void {
        // クイックスロット
        this.createQuickSlots();
        
        // クラフトメニュー
        this.createCraftingMenu();
    }
    
    private createQuickSlots(): void {
        this.quickSlots = document.createElement('div');
        this.quickSlots.id = 'consumableQuickSlots';
        this.quickSlots.style.cssText = `
            position: absolute;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            border-radius: 10px;
            z-index: 500;
        `;
        
        // 5つのクイックスロット
        for (let i = 1; i <= 5; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 60px;
                height: 60px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 5px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            slot.innerHTML = `
                <div style="font-size: 24px; height: 30px;"></div>
                <div style="font-size: 14px; color: #888;">${i}</div>
                <div class="item-count" style="
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-size: 12px;
                    display: none;
                "></div>
            `;
            
            slot.dataset.slot = i.toString();
            slot.addEventListener('click', () => this.toggleCraftingMenu());
            
            this.quickSlots.appendChild(slot);
        }
        
        document.body.appendChild(this.quickSlots);
        
        // デフォルトのアイテムを割り当て
        this.selectedSlots.set(1, 'energy_bar');
        this.selectedSlots.set(2, 'oxygen_tank');
        this.selectedSlots.set(3, 'medical_kit');
        
        this.updateQuickSlots();
    }
    
    private createCraftingMenu(): void {
        this.craftingMenu = document.createElement('div');
        this.craftingMenu.id = 'consumableCraftingMenu';
        this.craftingMenu.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-height: 70vh;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid rgba(100, 200, 255, 0.5);
            border-radius: 10px;
            color: white;
            font-family: Arial;
            display: none;
            overflow: hidden;
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            background: rgba(100, 200, 255, 0.2);
            padding: 15px 20px;
            border-bottom: 1px solid rgba(100, 200, 255, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h2 style="margin: 0;">消耗品クラフト</h2>
            <button onclick="window.toggleConsumableCrafting()" style="
                background: transparent;
                border: 1px solid white;
                color: white;
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">✕</button>
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            max-height: calc(70vh - 80px);
            overflow-y: auto;
        `;
        
        this.craftingMenu.appendChild(header);
        this.craftingMenu.appendChild(content);
        document.body.appendChild(this.craftingMenu);
        
        // グローバル関数
        (window as any).toggleConsumableCrafting = () => this.toggleCraftingMenu();
        
        this.updateCraftingMenu();
    }
    
    private updateQuickSlots(): void {
        const slots = this.quickSlots.querySelectorAll('[data-slot]');
        
        slots.forEach((slot, index) => {
            const slotNum = index + 1;
            const itemId = this.selectedSlots.get(slotNum);
            const iconDiv = slot.querySelector('div:first-child') as HTMLDivElement;
            const countDiv = slot.querySelector('.item-count') as HTMLDivElement;
            
            if (itemId) {
                const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
                const count = this.manager.getItemCount(itemId);
                
                if (item && count > 0) {
                    iconDiv.textContent = item.icon;
                    countDiv.textContent = count.toString();
                    countDiv.style.display = 'block';
                    (slot as HTMLDivElement).style.opacity = '1';
                } else {
                    iconDiv.textContent = '';
                    countDiv.style.display = 'none';
                    (slot as HTMLDivElement).style.opacity = '0.5';
                }
            } else {
                iconDiv.textContent = '';
                countDiv.style.display = 'none';
                (slot as HTMLDivElement).style.opacity = '0.5';
            }
        });
    }
    
    private updateCraftingMenu(): void {
        const content = this.craftingMenu.querySelector('div:last-child');
        if (!content) return;
        
        let html = '';
        
        CONSUMABLE_ITEMS.forEach(item => {
            const owned = this.manager.getItemCount(item.id);
            const canCraft = this.onCraft(item);
            
            html += `
                <div style="
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    opacity: ${canCraft ? '1' : '0.6'};
                ">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">${item.icon}</span>
                            <div>
                                <h3 style="margin: 0 0 5px 0;">${item.name}</h3>
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #ccc;">
                                    ${item.description}
                                </p>
                                <div style="font-size: 12px; color: #888;">
                                    効果: ${this.getEffectText(item)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="margin-bottom: 10px;">
                            所持数: <strong>${owned}</strong>
                        </div>
                        <div style="font-size: 12px; color: #888; margin-bottom: 10px;">
                            ${this.getCostText(item)}
                        </div>
                        <button 
                            onclick="window.craftConsumable('${item.id}')"
                            style="
                                background: ${canCraft ? 'rgba(100, 200, 100, 0.3)' : 'rgba(100, 100, 100, 0.3)'};
                                border: 1px solid ${canCraft ? 'rgba(100, 200, 100, 0.5)' : 'rgba(100, 100, 100, 0.5)'};
                                color: white;
                                padding: 8px 16px;
                                border-radius: 5px;
                                cursor: ${canCraft ? 'pointer' : 'not-allowed'};
                                transition: all 0.3s ease;
                            "
                            ${canCraft ? '' : 'disabled'}
                        >クラフト</button>
                    </div>
                </div>
            `;
        });
        
        content.innerHTML = html;
        
        // クラフト関数
        (window as any).craftConsumable = (itemId: string) => {
            const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
            if (item && this.onCraft(item)) {
                this.manager.addItem(itemId, 1);
                this.updateQuickSlots();
                this.updateCraftingMenu();
            }
        };
    }
    
    private getEffectText(item: ConsumableItem): string {
        const effects: string[] = [];
        if (item.effect.health) effects.push(`HP +${item.effect.health}`);
        if (item.effect.oxygen) effects.push(`酸素 +${item.effect.oxygen}`);
        if (item.effect.hunger) effects.push(`満腹度 +${item.effect.hunger}`);
        return effects.join(', ');
    }
    
    private getCostText(item: ConsumableItem): string {
        const costs: string[] = [];
        if (item.cost.minerals) costs.push(`鉱石 ${item.cost.minerals}`);
        if (item.cost.energy) costs.push(`エネルギー ${item.cost.energy}`);
        if (item.cost.parts) costs.push(`パーツ ${item.cost.parts}`);
        return 'コスト: ' + costs.join(', ');
    }
    
    private setupKeyBindings(): void {
        window.addEventListener('keydown', (e) => {
            const key = parseInt(e.key);
            if (!isNaN(key) && key >= 1 && key <= 5) {
                this.useQuickSlot(key);
            } else if (e.key.toLowerCase() === 'c') {
                this.toggleCraftingMenu();
            }
        });
    }
    
    private useQuickSlot(slot: number): void {
        const itemId = this.selectedSlots.get(slot);
        if (!itemId) return;
        
        const item = this.manager.useItem(itemId);
        if (item) {
            // 効果を適用
            if (item.effect.health) {
                this.survivalSystem.heal(item.effect.health);
            }
            if (item.effect.oxygen) {
                this.survivalSystem.restoreOxygen(item.effect.oxygen);
            }
            if (item.effect.hunger) {
                this.survivalSystem.eat(item.effect.hunger);
            }
            
            // アニメーション効果
            this.showUseEffect(slot);
            
            // UI更新
            this.updateQuickSlots();
        }
    }
    
    private showUseEffect(slot: number): void {
        const slotElement = this.quickSlots.querySelector(`[data-slot="${slot}"]`) as HTMLDivElement;
        if (!slotElement) return;
        
        slotElement.style.transform = 'scale(1.2)';
        slotElement.style.borderColor = 'rgba(100, 255, 100, 0.8)';
        
        setTimeout(() => {
            slotElement.style.transform = '';
            slotElement.style.borderColor = '';
        }, 200);
    }
    
    private toggleCraftingMenu(): void {
        if (this.craftingMenu.style.display === 'none') {
            this.craftingMenu.style.display = 'block';
            this.updateCraftingMenu();
        } else {
            this.craftingMenu.style.display = 'none';
        }
    }
    
    public dispose(): void {
        if (this.quickSlots && this.quickSlots.parentNode) {
            this.quickSlots.parentNode.removeChild(this.quickSlots);
        }
        if (this.craftingMenu && this.craftingMenu.parentNode) {
            this.craftingMenu.parentNode.removeChild(this.craftingMenu);
        }
    }
}