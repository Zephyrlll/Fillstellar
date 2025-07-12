// Advanced Module System - Mk2, Mk3, and Specialized Upgrades
import { gameState } from './state.js';
import { currencyManager, CurrencyType } from './currencySystem.js';

// Module Types
export const ModuleType = {
    EFFICIENCY_MODULE: 'efficiencyModule',
    SPEED_MODULE: 'speedModule',
    QUALITY_MODULE: 'qualityModule',
    WASTE_REDUCTION_MODULE: 'wasteReductionModule',
    BYPRODUCT_MODULE: 'byproductModule',
    CAPACITY_MODULE: 'capacityModule',
    ENERGY_EFFICIENCY: 'energyEfficiency',
    AUTOMATION_MODULE: 'automationModule'
};

// Module Tiers
export const ModuleTier = {
    MK1: 1,
    MK2: 2,
    MK3: 3,
    QUANTUM: 4,
    EXOTIC: 5
};

// Module Definitions
export const MODULE_DEFINITIONS = {
    // Mk2 Modules
    'efficiency_mk2': {
        id: 'efficiency_mk2',
        name: 'Mk2 効率モジュール',
        description: '施設の生産効率を75%向上させ、廃棄物を20%削減',
        type: ModuleType.EFFICIENCY_MODULE,
        tier: ModuleTier.MK2,
        effects: {
            efficiency: 1.75,
            wasteReduction: 0.2
        },
        cost: {
            currencies: [
                { type: CurrencyType.GALACTIC_CREDITS, amount: 500 }
            ],
            resources: [
                { type: 'processedMetal', amount: 200 },
                { type: 'stabilizedEnergy', amount: 100 }
            ]
        },
        requirements: {
            technology: ['advanced_modules'],
            facilityLevel: 2
        },
        slotType: 'universal',
        icon: '⚙️'
    },
    
    'speed_mk2': {
        id: 'speed_mk2',
        name: 'Mk2 速度モジュール',
        description: '生産速度を100%向上させるが、エネルギー消費が50%増加',
        type: ModuleType.SPEED_MODULE,
        tier: ModuleTier.MK2,
        effects: {
            speed: 2.0,
            energyCost: 1.5
        },
        cost: {
            currencies: [
                { type: CurrencyType.GALACTIC_CREDITS, amount: 750 }
            ],
            resources: [
                { type: 'refinedMetal', amount: 150 },
                { type: 'quantumCrystal', amount: 50 }
            ]
        },
        requirements: {
            technology: ['high_speed_processing'],
            facilityLevel: 2
        },
        slotType: 'universal',
        icon: '⚡'
    },
    
    'waste_reduction_mk2': {
        id: 'waste_reduction_mk2',
        name: 'Mk2 廃棄物削減モジュール',
        description: '廃棄物生成を60%削減し、副産物生成率を25%向上',
        type: ModuleType.WASTE_REDUCTION_MODULE,
        tier: ModuleTier.MK2,
        effects: {
            wasteReduction: 0.6,
            byproductChance: 1.25
        },
        cost: {
            currencies: [
                { type: CurrencyType.GALACTIC_CREDITS, amount: 1000 }
            ],
            resources: [
                { type: 'highPolymer', amount: 100 },
                { type: 'stabilizedEnergy', amount: 200 }
            ]
        },
        requirements: {
            technology: ['waste_management_advanced'],
            facilityLevel: 3
        },
        slotType: 'specialized',
        icon: '♻️'
    },
    
    // Mk3 Modules
    'efficiency_mk3': {
        id: 'efficiency_mk3',
        name: 'Mk3 効率モジュール',
        description: '施設の生産効率を150%向上させ、品質ボーナス+1',
        type: ModuleType.EFFICIENCY_MODULE,
        tier: ModuleTier.MK3,
        effects: {
            efficiency: 2.5,
            qualityBonus: 1,
            wasteReduction: 0.4
        },
        cost: {
            currencies: [
                { type: CurrencyType.ANCIENT_RELICS, amount: 10 }
            ],
            resources: [
                { type: 'ultraAlloy', amount: 100 },
                { type: 'exoticMatter', amount: 25 }
            ]
        },
        requirements: {
            technology: ['quantum_modules'],
            facilityLevel: 4
        },
        slotType: 'universal',
        icon: '⚙️✨'
    },
    
    'automation_mk2': {
        id: 'automation_mk2',
        name: 'Mk2 自動化モジュール',
        description: '自動レシピ切り替えと最適化を行う',
        type: ModuleType.AUTOMATION_MODULE,
        tier: ModuleTier.MK2,
        effects: {
            automation: true,
            efficiency: 1.2,
            autoOptimize: true
        },
        cost: {
            currencies: [
                { type: CurrencyType.GALACTIC_CREDITS, amount: 1500 }
            ],
            resources: [
                { type: 'quantumCrystal', amount: 200 },
                { type: 'processedMetal', amount: 300 }
            ]
        },
        requirements: {
            technology: ['ai_automation'],
            facilityLevel: 3
        },
        slotType: 'specialized',
        icon: '🤖'
    }
};

// Permanent Facility Upgrades
export const FACILITY_UPGRADES = {
    'mk2_facility_upgrade': {
        id: 'mk2_facility_upgrade',
        name: 'Mk2 施設アップグレード',
        description: '基本効率+50%、モジュールスロット+1、最大レベル+2',
        effects: {
            baseEfficiency: 1.5,
            additionalSlots: 1,
            maxLevelIncrease: 2
        },
        cost: {
            currencies: [
                { type: CurrencyType.GALACTIC_CREDITS, amount: 2000 }
            ],
            resources: [
                { type: 'ultraAlloy', amount: 500 },
                { type: 'quantumCrystal', amount: 200 }
            ]
        },
        requirements: {
            technology: ['facility_upgrades_mk2'],
            facilityLevel: 5
        },
        icon: '🏭⬆️'
    },
    
    'mk3_facility_upgrade': {
        id: 'mk3_facility_upgrade',
        name: 'Mk3 施設アップグレード',
        description: '基本効率+100%、専用スロット+1、量子効果解放',
        effects: {
            baseEfficiency: 2.0,
            specializedSlots: 1,
            quantumEffects: true
        },
        cost: {
            currencies: [
                { type: CurrencyType.ANCIENT_RELICS, amount: 25 }
            ],
            resources: [
                { type: 'exoticMatter', amount: 100 },
                { type: 'dimensionalEssence', amount: 50 }
            ]
        },
        requirements: {
            technology: ['facility_upgrades_mk3'],
            facilityLevel: 8,
            prerequisite: 'mk2_facility_upgrade'
        },
        icon: '🏭✨'
    }
};

// Module Manager Class
class ModuleManager {
    constructor() {
        this.installedModules = new Map(); // facilityId -> modules array
        this.availableModules = new Map(); // moduleId -> quantity
        this.facilityUpgrades = new Map(); // facilityId -> upgrades array
    }
    
    // Install module to facility
    installModule(facilityId, moduleId) {
        const facility = this.getFacility(facilityId);
        const module = MODULE_DEFINITIONS[moduleId];
        
        if (!facility || !module) {
            return { success: false, message: 'Invalid facility or module' };
        }
        
        // Check requirements
        if (!this.canInstallModule(facilityId, moduleId)) {
            return { success: false, message: 'Requirements not met' };
        }
        
        // Check available slots
        const currentModules = this.installedModules.get(facilityId) || [];
        const maxSlots = this.getMaxSlots(facilityId);
        
        if (currentModules.length >= maxSlots) {
            return { success: false, message: 'No available slots' };
        }
        
        // Pay costs
        if (!this.payCosts(module.cost)) {
            return { success: false, message: 'Insufficient resources' };
        }
        
        // Install module
        currentModules.push({
            id: moduleId,
            installedAt: Date.now(),
            ...module
        });
        
        this.installedModules.set(facilityId, currentModules);
        
        // Remove from available
        const available = this.availableModules.get(moduleId) || 0;
        this.availableModules.set(moduleId, Math.max(0, available - 1));
        
        console.log(`🔧 Installed ${module.name} to facility ${facilityId}`);
        return { success: true, message: `${module.name}を設置しました` };
    }
    
    // Remove module from facility
    removeModule(facilityId, moduleId) {
        const currentModules = this.installedModules.get(facilityId) || [];
        const moduleIndex = currentModules.findIndex(m => m.id === moduleId);
        
        if (moduleIndex === -1) {
            return { success: false, message: 'Module not found' };
        }
        
        // Remove module
        const removedModule = currentModules.splice(moduleIndex, 1)[0];
        this.installedModules.set(facilityId, currentModules);
        
        // Add back to available
        const available = this.availableModules.get(moduleId) || 0;
        this.availableModules.set(moduleId, available + 1);
        
        console.log(`🔧 Removed ${removedModule.name} from facility ${facilityId}`);
        return { success: true, message: `${removedModule.name}を取り外しました` };
    }
    
    // Purchase module
    purchaseModule(moduleId, quantity = 1) {
        const module = MODULE_DEFINITIONS[moduleId];
        if (!module) {
            return { success: false, message: 'Invalid module' };
        }
        
        // Check requirements
        if (!this.meetsRequirements(module.requirements)) {
            return { success: false, message: 'Requirements not met' };
        }
        
        // Calculate total cost
        const totalCost = {
            currencies: module.cost.currencies?.map(c => ({ ...c, amount: c.amount * quantity })) || [],
            resources: module.cost.resources?.map(r => ({ ...r, amount: r.amount * quantity })) || []
        };
        
        // Pay costs
        if (!this.payCosts(totalCost)) {
            return { success: false, message: 'Insufficient resources' };
        }
        
        // Add to available
        const available = this.availableModules.get(moduleId) || 0;
        this.availableModules.set(moduleId, available + quantity);
        
        console.log(`🔧 Purchased ${quantity}x ${module.name}`);
        return { success: true, message: `${module.name} x${quantity}を購入しました` };
    }
    
    // Apply facility upgrade
    applyFacilityUpgrade(facilityId, upgradeId) {
        const upgrade = FACILITY_UPGRADES[upgradeId];
        const facility = this.getFacility(facilityId);
        
        if (!facility || !upgrade) {
            return { success: false, message: 'Invalid facility or upgrade' };
        }
        
        // Check if already applied
        const currentUpgrades = this.facilityUpgrades.get(facilityId) || [];
        if (currentUpgrades.includes(upgradeId)) {
            return { success: false, message: 'Upgrade already applied' };
        }
        
        // Check requirements
        if (!this.meetsRequirements(upgrade.requirements)) {
            return { success: false, message: 'Requirements not met' };
        }
        
        // Pay costs
        if (!this.payCosts(upgrade.cost)) {
            return { success: false, message: 'Insufficient resources' };
        }
        
        // Apply upgrade
        currentUpgrades.push(upgradeId);
        this.facilityUpgrades.set(facilityId, currentUpgrades);
        
        console.log(`🔧 Applied ${upgrade.name} to facility ${facilityId}`);
        return { success: true, message: `${upgrade.name}を適用しました` };
    }
    
    // Calculate total facility effects
    getFacilityEffects(facilityId) {
        const modules = this.installedModules.get(facilityId) || [];
        const upgrades = this.facilityUpgrades.get(facilityId) || [];
        
        const effects = {
            efficiency: 1.0,
            speed: 1.0,
            qualityBonus: 0,
            wasteReduction: 0,
            byproductChance: 1.0,
            energyCost: 1.0,
            automation: false
        };
        
        // Apply module effects
        modules.forEach(module => {
            if (module.effects.efficiency) effects.efficiency *= module.effects.efficiency;
            if (module.effects.speed) effects.speed *= module.effects.speed;
            if (module.effects.qualityBonus) effects.qualityBonus += module.effects.qualityBonus;
            if (module.effects.wasteReduction) effects.wasteReduction = Math.min(0.9, effects.wasteReduction + module.effects.wasteReduction);
            if (module.effects.byproductChance) effects.byproductChance *= module.effects.byproductChance;
            if (module.effects.energyCost) effects.energyCost *= module.effects.energyCost;
            if (module.effects.automation) effects.automation = true;
        });
        
        // Apply upgrade effects
        upgrades.forEach(upgradeId => {
            const upgrade = FACILITY_UPGRADES[upgradeId];
            if (upgrade?.effects.baseEfficiency) {
                effects.efficiency *= upgrade.effects.baseEfficiency;
            }
        });
        
        return effects;
    }
    
    // Helper methods
    getFacility(facilityId) {
        // This would integrate with the existing production system
        // For now, return a mock facility
        return { id: facilityId, level: 3 };
    }
    
    getMaxSlots(facilityId) {
        const baseSlots = 2;
        const upgrades = this.facilityUpgrades.get(facilityId) || [];
        let additionalSlots = 0;
        
        upgrades.forEach(upgradeId => {
            const upgrade = FACILITY_UPGRADES[upgradeId];
            if (upgrade?.effects.additionalSlots) {
                additionalSlots += upgrade.effects.additionalSlots;
            }
        });
        
        return baseSlots + additionalSlots;
    }
    
    canInstallModule(facilityId, moduleId) {
        const module = MODULE_DEFINITIONS[moduleId];
        const facility = this.getFacility(facilityId);
        
        if (!module || !facility) return false;
        
        // Check available modules
        const available = this.availableModules.get(moduleId) || 0;
        if (available <= 0) return false;
        
        // Check requirements
        return this.meetsRequirements(module.requirements);
    }
    
    meetsRequirements(requirements) {
        if (!requirements) return true;
        
        // Check technology requirements
        if (requirements.technology) {
            for (const tech of requirements.technology) {
                if (!gameState.discoveredTechnologies?.has(tech)) {
                    return false;
                }
            }
        }
        
        // Check facility level
        if (requirements.facilityLevel) {
            // This would check the actual facility level
            return true; // Placeholder
        }
        
        return true;
    }
    
    payCosts(cost) {
        // Check if we can afford all costs
        if (cost.currencies) {
            for (const currencyCost of cost.currencies) {
                if (currencyManager.getCurrency(currencyCost.type) < currencyCost.amount) {
                    return false;
                }
            }
        }
        
        if (cost.resources) {
            for (const resourceCost of cost.resources) {
                const available = gameState.advancedResources?.[resourceCost.type]?.amount || 0;
                if (available < resourceCost.amount) {
                    return false;
                }
            }
        }
        
        // Pay costs
        if (cost.currencies) {
            for (const currencyCost of cost.currencies) {
                currencyManager.spendCurrency(currencyCost.type, currencyCost.amount);
            }
        }
        
        if (cost.resources) {
            for (const resourceCost of cost.resources) {
                if (gameState.advancedResources?.[resourceCost.type]) {
                    gameState.advancedResources[resourceCost.type].amount -= resourceCost.amount;
                }
            }
        }
        
        return true;
    }
    
    // Save/Load state
    saveState() {
        return {
            installedModules: Array.from(this.installedModules.entries()),
            availableModules: Array.from(this.availableModules.entries()),
            facilityUpgrades: Array.from(this.facilityUpgrades.entries())
        };
    }
    
    loadState(state) {
        if (state) {
            this.installedModules = new Map(state.installedModules || []);
            this.availableModules = new Map(state.availableModules || []);
            this.facilityUpgrades = new Map(state.facilityUpgrades || []);
        }
    }
}

// Export module manager instance
export const moduleManager = new ModuleManager();

// Initialize with some starter modules for testing
moduleManager.availableModules.set('efficiency_mk2', 2);
moduleManager.availableModules.set('speed_mk2', 1);
moduleManager.availableModules.set('waste_reduction_mk2', 1);

console.log('🔧 Module system loaded');