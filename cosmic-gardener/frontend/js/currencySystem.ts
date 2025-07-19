// Currency System for Cosmic Gardener
// Manages various currencies and exchange systems

import { gameState, gameStateManager } from './state.js';
import { ResourceType } from './resourceSystem.js';

export enum CurrencyType {
    COSMIC_CREDITS = 'cosmicCredits',
    QUANTUM_COINS = 'quantumCoins',
    STELLAR_SHARDS = 'stellarShards',
    VOID_TOKENS = 'voidTokens'
}

export interface Currency {
    type: CurrencyType;
    amount: number;
    icon: string;
    name: string;
    description: string;
    exchangeRates: Record<CurrencyType, number>;
}

export interface CurrencyTransaction {
    id: string;
    timestamp: number;
    fromCurrency: CurrencyType;
    toCurrency: CurrencyType;
    fromAmount: number;
    toAmount: number;
    exchangeRate: number;
}

class CurrencyManager {
    private currencies: Map<CurrencyType, Currency>;
    private transactionHistory: CurrencyTransaction[];
    private initialized: boolean = false;

    constructor() {
        this.currencies = new Map();
        this.transactionHistory = [];
        this.initializeCurrencies();
    }

    initializeCurrencies(): void {
        if (this.initialized) return;

        console.log('[CURRENCY] Initializing currency system...');

        const currentState = gameStateManager.getState();

        // Initialize base currencies
        this.currencies.set(CurrencyType.COSMIC_CREDITS, {
            type: CurrencyType.COSMIC_CREDITS,
            amount: currentState.cosmicCredits || 0,
            icon: '💰',
            name: 'Cosmic Credits',
            description: 'The universal currency of the cosmos',
            exchangeRates: {
                [CurrencyType.COSMIC_CREDITS]: 1,
                [CurrencyType.QUANTUM_COINS]: 0.1,
                [CurrencyType.STELLAR_SHARDS]: 0.01,
                [CurrencyType.VOID_TOKENS]: 0.001
            }
        });

        this.currencies.set(CurrencyType.QUANTUM_COINS, {
            type: CurrencyType.QUANTUM_COINS,
            amount: currentState.quantumCoins || 0,
            icon: '🪙',
            name: 'Quantum Coins',
            description: 'Currency that exists in superposition',
            exchangeRates: {
                [CurrencyType.COSMIC_CREDITS]: 10,
                [CurrencyType.QUANTUM_COINS]: 1,
                [CurrencyType.STELLAR_SHARDS]: 0.1,
                [CurrencyType.VOID_TOKENS]: 0.01
            }
        });

        this.currencies.set(CurrencyType.STELLAR_SHARDS, {
            type: CurrencyType.STELLAR_SHARDS,
            amount: currentState.stellarShards || 0,
            icon: '✨',
            name: 'Stellar Shards',
            description: 'Fragments of crystallized starlight',
            exchangeRates: {
                [CurrencyType.COSMIC_CREDITS]: 100,
                [CurrencyType.QUANTUM_COINS]: 10,
                [CurrencyType.STELLAR_SHARDS]: 1,
                [CurrencyType.VOID_TOKENS]: 0.1
            }
        });

        this.currencies.set(CurrencyType.VOID_TOKENS, {
            type: CurrencyType.VOID_TOKENS,
            amount: currentState.voidTokens || 0,
            icon: '⚫',
            name: 'Void Tokens',
            description: 'Currency from the spaces between reality',
            exchangeRates: {
                [CurrencyType.COSMIC_CREDITS]: 1000,
                [CurrencyType.QUANTUM_COINS]: 100,
                [CurrencyType.STELLAR_SHARDS]: 10,
                [CurrencyType.VOID_TOKENS]: 1
            }
        });

        this.initialized = true;
        console.log('[CURRENCY] Currency system initialized');
    }

    getCurrency(type: CurrencyType): Currency | null {
        return this.currencies.get(type) || null;
    }

    getAllCurrencies(): Currency[] {
        return Array.from(this.currencies.values());
    }

    getBalance(type: CurrencyType): number {
        const currency = this.currencies.get(type);
        return currency ? currency.amount : 0;
    }

    addCurrency(type: CurrencyType, amount: number): boolean {
        if (amount <= 0) return false;

        const currency = this.currencies.get(type);
        if (!currency) {
            console.error('[CURRENCY] Unknown currency type:', type);
            return false;
        }

        currency.amount += amount;
        this.syncToGameState();
        
        console.log(`[CURRENCY] Added ${amount} ${currency.name}. New balance: ${currency.amount}`);
        return true;
    }

    spendCurrency(type: CurrencyType, amount: number): boolean {
        if (amount <= 0) return false;

        const currency = this.currencies.get(type);
        if (!currency) {
            console.error('[CURRENCY] Unknown currency type:', type);
            return false;
        }

        if (currency.amount < amount) {
            console.warn(`[CURRENCY] Insufficient ${currency.name}. Required: ${amount}, Available: ${currency.amount}`);
            return false;
        }

        currency.amount -= amount;
        this.syncToGameState();
        
        console.log(`[CURRENCY] Spent ${amount} ${currency.name}. Remaining balance: ${currency.amount}`);
        return true;
    }

    exchangeCurrency(fromType: CurrencyType, toType: CurrencyType, fromAmount: number): boolean {
        if (fromAmount <= 0) return false;
        if (fromType === toType) return false;

        const fromCurrency = this.currencies.get(fromType);
        const toCurrency = this.currencies.get(toType);

        if (!fromCurrency || !toCurrency) {
            console.error('[CURRENCY] Invalid currency types for exchange');
            return false;
        }

        if (fromCurrency.amount < fromAmount) {
            console.warn(`[CURRENCY] Insufficient ${fromCurrency.name} for exchange`);
            return false;
        }

        const exchangeRate = fromCurrency.exchangeRates[toType];
        const toAmount = fromAmount * exchangeRate;

        // Perform the exchange
        fromCurrency.amount -= fromAmount;
        toCurrency.amount += toAmount;

        // Record transaction
        const transaction: CurrencyTransaction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            fromCurrency: fromType,
            toCurrency: toType,
            fromAmount,
            toAmount,
            exchangeRate
        };

        this.transactionHistory.push(transaction);
        this.syncToGameState();

        console.log(`[CURRENCY] Exchanged ${fromAmount} ${fromCurrency.name} for ${toAmount.toFixed(2)} ${toCurrency.name}`);
        return true;
    }

    // Sync currency data to game state
    private syncToGameState(): void {
        const updates: any = {};
        
        this.currencies.forEach((currency, type) => {
            switch (type) {
                case CurrencyType.COSMIC_CREDITS:
                    updates.cosmicCredits = currency.amount;
                    break;
                case CurrencyType.QUANTUM_COINS:
                    updates.quantumCoins = currency.amount;
                    break;
                case CurrencyType.STELLAR_SHARDS:
                    updates.stellarShards = currency.amount;
                    break;
                case CurrencyType.VOID_TOKENS:
                    updates.voidTokens = currency.amount;
                    break;
            }
        });

        gameStateManager.updateState(state => ({
            ...state,
            ...updates
        }));
    }

    // Resource to currency conversion
    convertResourceToCurrency(resourceType: ResourceType, amount: number, targetCurrency: CurrencyType): number {
        const conversionRates: Record<ResourceType, Record<CurrencyType, number>> = {
            [ResourceType.COSMIC_DUST]: {
                [CurrencyType.COSMIC_CREDITS]: 0.1,
                [CurrencyType.QUANTUM_COINS]: 0.01,
                [CurrencyType.STELLAR_SHARDS]: 0.001,
                [CurrencyType.VOID_TOKENS]: 0.0001
            },
            [ResourceType.ENERGY]: {
                [CurrencyType.COSMIC_CREDITS]: 0.2,
                [CurrencyType.QUANTUM_COINS]: 0.02,
                [CurrencyType.STELLAR_SHARDS]: 0.002,
                [CurrencyType.VOID_TOKENS]: 0.0002
            },
            [ResourceType.ORGANIC_MATTER]: {
                [CurrencyType.COSMIC_CREDITS]: 0.5,
                [CurrencyType.QUANTUM_COINS]: 0.05,
                [CurrencyType.STELLAR_SHARDS]: 0.005,
                [CurrencyType.VOID_TOKENS]: 0.0005
            },
            [ResourceType.BIOMASS]: {
                [CurrencyType.COSMIC_CREDITS]: 1.0,
                [CurrencyType.QUANTUM_COINS]: 0.1,
                [CurrencyType.STELLAR_SHARDS]: 0.01,
                [CurrencyType.VOID_TOKENS]: 0.001
            },
            [ResourceType.DARK_MATTER]: {
                [CurrencyType.COSMIC_CREDITS]: 10,
                [CurrencyType.QUANTUM_COINS]: 1,
                [CurrencyType.STELLAR_SHARDS]: 0.1,
                [CurrencyType.VOID_TOKENS]: 0.01
            },
            [ResourceType.THOUGHT_POINTS]: {
                [CurrencyType.COSMIC_CREDITS]: 5,
                [CurrencyType.QUANTUM_COINS]: 0.5,
                [CurrencyType.STELLAR_SHARDS]: 0.05,
                [CurrencyType.VOID_TOKENS]: 0.005
            }
        } as any;

        const rate = conversionRates[resourceType]?.[targetCurrency] || 0;
        return amount * rate;
    }

    sellResource(resourceType: ResourceType, amount: number, targetCurrency: CurrencyType): boolean {
        // Get current state
        const currentState = gameStateManager.getState();
        
        // Check if player has enough resources
        const currentAmount = currentState.resources[resourceType] || 0;
        
        if (currentAmount < amount) {
            console.warn(`[CURRENCY] Insufficient ${resourceType}. Required: ${amount}, Available: ${currentAmount}`);
            return false;
        }

        const currencyGained = this.convertResourceToCurrency(resourceType, amount, targetCurrency);
        if (currencyGained <= 0) {
            console.warn(`[CURRENCY] No currency gained from this conversion`);
            return false;
        }

        // Deduct resources and add currency
        gameStateManager.updateState(state => ({
            ...state,
            resources: {
                ...state.resources,
                [resourceType]: state.resources[resourceType] - amount
            }
        }));

        this.addCurrency(targetCurrency, currencyGained);

        console.log(`[CURRENCY] Sold ${amount} ${resourceType} for ${currencyGained.toFixed(2)} ${targetCurrency}`);
        return true;
    }

    getTransactionHistory(): CurrencyTransaction[] {
        return [...this.transactionHistory];
    }

    clearTransactionHistory(): void {
        this.transactionHistory = [];
        console.log('[CURRENCY] Transaction history cleared');
    }

    // Update exchange rates based on market conditions
    updateExchangeRates(): void {
        // Simple volatility simulation
        this.currencies.forEach((currency, type) => {
            Object.keys(currency.exchangeRates).forEach(targetType => {
                if (targetType !== type) {
                    const baseRate = currency.exchangeRates[targetType as CurrencyType];
                    const volatility = 0.05; // 5% volatility
                    const change = (Math.random() - 0.5) * volatility * 2;
                    currency.exchangeRates[targetType as CurrencyType] = Math.max(0.001, baseRate * (1 + change));
                }
            });
        });
    }

    // Get formatted currency display
    formatCurrency(type: CurrencyType, amount?: number): string {
        const currency = this.currencies.get(type);
        if (!currency) return '0';

        const displayAmount = amount !== undefined ? amount : currency.amount;
        return `${currency.icon} ${displayAmount.toLocaleString()}`;
    }
}

// Export singleton instance
export const currencyManager = new CurrencyManager();

// Export types for external use
export type { Currency, CurrencyTransaction };