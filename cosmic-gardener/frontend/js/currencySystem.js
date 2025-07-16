// Currency System - Game Economy Management
import { gameState } from './state.js';
console.log('🔧 currencySystem.ts loaded');
// Currency Types
export var CurrencyType;
(function (CurrencyType) {
    CurrencyType["COSMIC_DUST_CURRENCY"] = "cosmicDustCurrency";
    CurrencyType["GALACTIC_CREDITS"] = "galacticCredits";
    CurrencyType["ANCIENT_RELICS"] = "ancientRelics";
})(CurrencyType || (CurrencyType = {}));
// Currency Definitions
export const CURRENCY_DEFINITIONS = {
    [CurrencyType.COSMIC_DUST_CURRENCY]: {
        id: CurrencyType.COSMIC_DUST_CURRENCY,
        name: 'コズミック・ダスト',
        shortName: 'CD',
        description: 'ゲームの基本通貨。施設の建設やアップグレードに使用します。',
        icon: '💫',
        color: '#FFD700',
        type: 'soft',
        maxAmount: Number.MAX_SAFE_INTEGER,
        defaultAmount: 1000
    },
    [CurrencyType.GALACTIC_CREDITS]: {
        id: CurrencyType.GALACTIC_CREDITS,
        name: 'ギャラクティック・クレジット',
        shortName: 'GC',
        description: '銀河間取引で使用される貴重な通貨。特別なアイテムや時間短縮に使用します。',
        icon: '💎',
        color: '#00BFFF',
        type: 'hard',
        maxAmount: 999999,
        defaultAmount: 100
    },
    [CurrencyType.ANCIENT_RELICS]: {
        id: CurrencyType.ANCIENT_RELICS,
        name: 'エンシェント・レリック',
        shortName: 'AR',
        description: '古代文明の遺物。イベントや高難易度コンテンツで入手できる限定通貨。',
        icon: '🏺',
        color: '#9932CC',
        type: 'premium',
        maxAmount: 9999,
        defaultAmount: 0
    }
};
// Currency Manager Class
export class CurrencyManager {
    constructor() {
        this.initializeCurrencies();
    }
    // Initialize currency system
    initializeCurrencies() {
        if (!gameState.currencies) {
            gameState.currencies = {
                cosmicDustCurrency: CURRENCY_DEFINITIONS[CurrencyType.COSMIC_DUST_CURRENCY].defaultAmount,
                galacticCredits: CURRENCY_DEFINITIONS[CurrencyType.GALACTIC_CREDITS].defaultAmount,
                ancientRelics: CURRENCY_DEFINITIONS[CurrencyType.ANCIENT_RELICS].defaultAmount
            };
        }
    }
    // Get currency amount
    getCurrency(currencyType) {
        this.initializeCurrencies();
        return gameState.currencies[currencyType] || 0;
    }
    // Add currency
    addCurrency(currencyType, amount) {
        this.initializeCurrencies();
        const definition = CURRENCY_DEFINITIONS[currencyType];
        if (!definition) {
            console.error('Unknown currency type:', currencyType);
            return false;
        }
        const currentAmount = this.getCurrency(currencyType);
        const newAmount = Math.min(currentAmount + amount, definition.maxAmount);
        gameState.currencies[currencyType] = newAmount;
        // Trigger currency gain effect
        this.triggerCurrencyGainEffect(currencyType, amount);
        return true;
    }
    // Spend currency
    spendCurrency(currencyType, amount) {
        this.initializeCurrencies();
        const currentAmount = this.getCurrency(currencyType);
        if (currentAmount >= amount) {
            gameState.currencies[currencyType] = currentAmount - amount;
            this.triggerCurrencySpendEffect(currencyType, amount);
            return true;
        }
        return false;
    }
    // Check if player can afford
    canAfford(currencyType, amount) {
        return this.getCurrency(currencyType) >= amount;
    }
    // Get all currencies
    getAllCurrencies() {
        this.initializeCurrencies();
        return { ...gameState.currencies };
    }
    // Convert resources to currency (resource selling system)
    sellResource(resourceType, amount, exchangeRate = 1.0) {
        // Check if player has enough resources
        let availableAmount = 0;
        if (resourceType in gameState.resources) {
            availableAmount = gameState.resources[resourceType];
        }
        else if (gameState.advancedResources && gameState.advancedResources[resourceType]) {
            availableAmount = gameState.advancedResources[resourceType].amount;
        }
        if (availableAmount < amount) {
            return false;
        }
        // Deduct resources
        if (resourceType in gameState.resources) {
            gameState.resources[resourceType] -= amount;
        }
        else if (gameState.advancedResources && gameState.advancedResources[resourceType]) {
            gameState.advancedResources[resourceType].amount -= amount;
        }
        // Add currency (cosmic dust currency for basic resource sales)
        const currencyGained = Math.floor(amount * exchangeRate);
        this.addCurrency(CurrencyType.COSMIC_DUST_CURRENCY, currencyGained);
        return currencyGained;
    }
    // Mission reward system
    giveMissionReward(missionType, rewardData) {
        Object.entries(rewardData).forEach(([currencyType, amount]) => {
            if (CURRENCY_DEFINITIONS[currencyType]) {
                this.addCurrency(currencyType, amount);
            }
        });
    }
    // Visual effects for currency changes
    triggerCurrencyGainEffect(currencyType, amount) {
        const definition = CURRENCY_DEFINITIONS[currencyType];
        if (definition) {
            // You can add particle effects or animations here
            console.log(`💰 Gained ${amount} ${definition.name}!`);
        }
    }
    triggerCurrencySpendEffect(currencyType, amount) {
        const definition = CURRENCY_DEFINITIONS[currencyType];
        if (definition) {
            console.log(`💸 Spent ${amount} ${definition.name}`);
        }
    }
    // Save state
    saveState() {
        return {
            currencies: { ...gameState.currencies }
        };
    }
    // Load state
    loadState(state) {
        if (state.currencies) {
            gameState.currencies = {
                cosmicDustCurrency: state.currencies.cosmicDustCurrency ?? CURRENCY_DEFINITIONS[CurrencyType.COSMIC_DUST_CURRENCY].defaultAmount,
                galacticCredits: state.currencies.galacticCredits ?? CURRENCY_DEFINITIONS[CurrencyType.GALACTIC_CREDITS].defaultAmount,
                ancientRelics: state.currencies.ancientRelics ?? CURRENCY_DEFINITIONS[CurrencyType.ANCIENT_RELICS].defaultAmount
            };
        }
    }
}
// Global currency manager instance
export const currencyManager = new CurrencyManager();
// Helper functions
export function formatCurrency(amount, currencyType) {
    const definition = CURRENCY_DEFINITIONS[currencyType];
    if (!definition)
        return amount.toString();
    // Format large numbers
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    }
    else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toLocaleString();
}
export function getCurrencyIcon(currencyType) {
    const definition = CURRENCY_DEFINITIONS[currencyType];
    return definition ? definition.icon : '💰';
}
export function getCurrencyColor(currencyType) {
    const definition = CURRENCY_DEFINITIONS[currencyType];
    return definition ? definition.color : '#FFD700';
}
// Exchange rates for resource selling (can be dynamic in the future)
export const RESOURCE_EXCHANGE_RATES = {
    // Basic resources
    cosmicDust: 0.1,
    energy: 0.2,
    organicMatter: 0.5,
    biomass: 1.0,
    darkMatter: 5.0,
    thoughtPoints: 2.0,
    // Advanced resources
    processedMetal: 10.0,
    silicon: 15.0,
    stabilizedEnergy: 25.0,
    refinedMetal: 50.0,
    highPolymer: 75.0,
    quantumCrystal: 100.0,
    // Tier 3 resources
    concentratedEnergy: 200.0,
    ultraAlloy: 300.0,
    quantumPolymer: 250.0,
    exoticMatter: 500.0,
    hyperCrystal: 750.0,
    dimensionalEssence: 1000.0
};
window.currencyManager = currencyManager;
window.CurrencyType = CurrencyType;
window.RESOURCE_EXCHANGE_RATES = RESOURCE_EXCHANGE_RATES;
console.log('🔧 Currency system exported to window');
