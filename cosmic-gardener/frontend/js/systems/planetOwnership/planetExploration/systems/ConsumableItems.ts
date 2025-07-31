export interface ConsumableItem {
    id: string;
    name: string;
    type: 'food' | 'medicine' | 'oxygen';
    effect: {
        health?: number;
        oxygen?: number;
        hunger?: number;
    };
    cost: {
        minerals?: number;
        energy?: number;
        parts?: number;
    };
    icon: string;
    description: string;
}

export const CONSUMABLE_ITEMS: ConsumableItem[] = [
    {
        id: 'energy_bar',
        name: 'エナジーバー',
        type: 'food',
        effect: { hunger: 30 },
        cost: { energy: 10 },
        icon: '🍫',
        description: '素早くエネルギーを補給できる栄養バー'
    },
    {
        id: 'meal_pack',
        name: '宇宙食パック',
        type: 'food',
        effect: { hunger: 60, health: 10 },
        cost: { minerals: 20, energy: 15 },
        icon: '🍱',
        description: 'バランスの取れた完全栄養食'
    },
    {
        id: 'medical_kit',
        name: '医療キット',
        type: 'medicine',
        effect: { health: 50 },
        cost: { minerals: 30, parts: 1 },
        icon: '🏥',
        description: '怪我を治療するための基本的な医療用品'
    },
    {
        id: 'oxygen_tank',
        name: '酸素タンク',
        type: 'oxygen',
        effect: { oxygen: 50 },
        cost: { minerals: 15, energy: 20 },
        icon: '🫧',
        description: '携帯用の圧縮酸素タンク'
    },
    {
        id: 'emergency_oxygen',
        name: '緊急酸素',
        type: 'oxygen',
        effect: { oxygen: 100 },
        cost: { minerals: 25, energy: 40, parts: 1 },
        icon: '⚡',
        description: '緊急時用の高濃度酸素カプセル'
    },
    {
        id: 'heat_pack',
        name: 'ヒートパック',
        type: 'medicine',
        effect: { health: 20 },
        cost: { energy: 25 },
        icon: '🔥',
        description: '体温を維持するための発熱パック'
    }
];

export class ConsumableManager {
    private inventory: Map<string, number> = new Map();
    
    constructor() {
        // 初期アイテム
        this.addItem('energy_bar', 3);
        this.addItem('oxygen_tank', 2);
        this.addItem('medical_kit', 1);
    }
    
    public addItem(itemId: string, quantity: number = 1): void {
        const current = this.inventory.get(itemId) || 0;
        this.inventory.set(itemId, current + quantity);
    }
    
    public useItem(itemId: string): ConsumableItem | null {
        const quantity = this.inventory.get(itemId) || 0;
        if (quantity <= 0) {
            return null;
        }
        
        const item = CONSUMABLE_ITEMS.find(i => i.id === itemId);
        if (!item) {
            return null;
        }
        
        this.inventory.set(itemId, quantity - 1);
        return item;
    }
    
    public getInventory(): Map<string, number> {
        return new Map(this.inventory);
    }
    
    public hasItem(itemId: string): boolean {
        return (this.inventory.get(itemId) || 0) > 0;
    }
    
    public getItemCount(itemId: string): number {
        return this.inventory.get(itemId) || 0;
    }
    
    public canCraft(item: ConsumableItem, resources: { minerals: number; energy: number; parts: number }): boolean {
        const cost = item.cost;
        return (
            (!cost.minerals || resources.minerals >= cost.minerals) &&
            (!cost.energy || resources.energy >= cost.energy) &&
            (!cost.parts || resources.parts >= cost.parts)
        );
    }
    
    public save(): any {
        return {
            inventory: Array.from(this.inventory.entries())
        };
    }
    
    public load(data: any): void {
        if (data && data.inventory) {
            this.inventory = new Map(data.inventory);
        }
    }
}