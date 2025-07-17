// Market System for Cosmic Gardener
// Handles trading, pricing, and market dynamics

import { gameState, gameStateManager } from '@/state';
import { ResourceType, QualityTier } from '@/resourceSystem';
import { currencyManager, CurrencyType } from '@/currencySystem';

export interface MarketItem {
    id: string;
    resourceType: ResourceType;
    quality: QualityTier;
    quantity: number;
    pricePerUnit: number;
    currency: CurrencyType;
    seller: 'system' | 'player' | string;
    timeAdded: number;
    expiresAt?: number;
}

export interface MarketTransaction {
    id: string;
    timestamp: number;
    buyerId: string;
    sellerId: string;
    itemId: string;
    resourceType: ResourceType;
    quantity: number;
    totalPrice: number;
    currency: CurrencyType;
}

export interface PriceHistory {
    resourceType: ResourceType;
    quality: QualityTier;
    currency: CurrencyType;
    timestamp: number;
    price: number;
    volume: number;
}

class MarketSystem {
    private marketItems: Map<string, MarketItem>;
    private transactionHistory: MarketTransaction[];
    private priceHistory: PriceHistory[];
    private basePrices: Map<ResourceType, number>;
    private lastUpdateTime: number;
    private priceVolatility: number = 0.1;

    constructor() {
        this.marketItems = new Map();
        this.transactionHistory = [];
        this.priceHistory = [];
        this.basePrices = new Map();
        this.lastUpdateTime = Date.now();
        this.initializeBasePrices();
    }

    private initializeBasePrices(): void {
        console.log('[MARKET] Initializing base prices...');

        // Set base prices for resources (in Cosmic Credits)
        this.basePrices.set(ResourceType.COSMIC_DUST, 1);
        this.basePrices.set(ResourceType.ENERGY, 2);
        this.basePrices.set(ResourceType.ORGANIC_MATTER, 5);
        this.basePrices.set(ResourceType.BIOMASS, 10);
        this.basePrices.set(ResourceType.DARK_MATTER, 50);
        this.basePrices.set(ResourceType.THOUGHT_POINTS, 25);

        // Dust subtypes
        this.basePrices.set(ResourceType.IRON_DUST, 3);
        this.basePrices.set(ResourceType.CARBON_DUST, 4);
        this.basePrices.set(ResourceType.SILICON_DUST, 6);
        this.basePrices.set(ResourceType.RARE_EARTH_DUST, 15);

        // Energy subtypes
        this.basePrices.set(ResourceType.THERMAL_ENERGY, 3);
        this.basePrices.set(ResourceType.ELECTRIC_ENERGY, 5);
        this.basePrices.set(ResourceType.NUCLEAR_ENERGY, 20);
        this.basePrices.set(ResourceType.QUANTUM_ENERGY, 100);

        // Organic subtypes
        this.basePrices.set(ResourceType.SIMPLE_ORGANICS, 8);
        this.basePrices.set(ResourceType.COMPLEX_ORGANICS, 15);
        this.basePrices.set(ResourceType.GENETIC_MATERIAL, 30);
        this.basePrices.set(ResourceType.ENZYMES, 25);

        // Biomass subtypes
        this.basePrices.set(ResourceType.MICROBIAL_BIOMASS, 12);
        this.basePrices.set(ResourceType.PLANT_BIOMASS, 18);
        this.basePrices.set(ResourceType.ANIMAL_BIOMASS, 35);
        this.basePrices.set(ResourceType.INTELLIGENT_BIOMASS, 100);

        // Dark matter subtypes
        this.basePrices.set(ResourceType.STABLE_DARK_MATTER, 60);
        this.basePrices.set(ResourceType.VOLATILE_DARK_MATTER, 80);
        this.basePrices.set(ResourceType.EXOTIC_DARK_MATTER, 150);
        this.basePrices.set(ResourceType.PRIMORDIAL_DARK_MATTER, 500);

        // Thought subtypes
        this.basePrices.set(ResourceType.BASIC_THOUGHTS, 30);
        this.basePrices.set(ResourceType.CREATIVE_THOUGHTS, 50);
        this.basePrices.set(ResourceType.SCIENTIFIC_THOUGHTS, 75);
        this.basePrices.set(ResourceType.PHILOSOPHICAL_THOUGHTS, 200);

        // Advanced resources
        this.basePrices.set(ResourceType.PROCESSED_METAL, 40);
        this.basePrices.set(ResourceType.SILICON, 35);
        this.basePrices.set(ResourceType.ALLOY, 80);
        this.basePrices.set(ResourceType.STABILIZED_ENERGY, 120);
        this.basePrices.set(ResourceType.REFINED_METAL, 100);
        this.basePrices.set(ResourceType.RARE_ELEMENTS, 300);
        this.basePrices.set(ResourceType.HIGH_POLYMER, 250);
        this.basePrices.set(ResourceType.QUANTUM_CRYSTAL, 800);
        this.basePrices.set(ResourceType.RADIOACTIVE_WASTE, -10); // Negative value - players pay to dispose

        // Tier 2 resources
        this.basePrices.set(ResourceType.CONCENTRATED_ENERGY, 500);
        this.basePrices.set(ResourceType.HYPER_CRYSTAL, 1200);
        this.basePrices.set(ResourceType.DIMENSIONAL_ESSENCE, 2000);
        this.basePrices.set(ResourceType.ULTRA_ALLOY, 1500);
        this.basePrices.set(ResourceType.QUANTUM_POLYMER, 1800);
        this.basePrices.set(ResourceType.EXOTIC_MATTER, 5000);

        console.log(`[MARKET] Initialized ${this.basePrices.size} base prices`);
    }

    getCurrentPrice(resourceType: ResourceType, quality: QualityTier = QualityTier.STANDARD): number {
        const basePrice = this.basePrices.get(resourceType) || 1;
        
        // Quality multipliers
        const qualityMultipliers = {
            [QualityTier.POOR]: 0.5,
            [QualityTier.STANDARD]: 1.0,
            [QualityTier.HIGH_QUALITY]: 1.5,
            [QualityTier.PERFECT]: 2.5,
            [QualityTier.LEGENDARY]: 5.0
        };

        const qualityMultiplier = qualityMultipliers[quality] || 1.0;
        
        // Market volatility
        const volatilityFactor = 1 + (Math.random() - 0.5) * this.priceVolatility;
        
        // Supply and demand factors
        const supplyDemandFactor = this.calculateSupplyDemandFactor(resourceType);
        
        return Math.max(0.1, basePrice * qualityMultiplier * volatilityFactor * supplyDemandFactor);
    }

    private calculateSupplyDemandFactor(resourceType: ResourceType): number {
        // Simple supply/demand calculation based on player resources and recent transactions
        const playerStock = gameState.resources[resourceType] || 0;
        const recentTransactions = this.transactionHistory
            .filter(t => t.resourceType === resourceType && Date.now() - t.timestamp < 300000) // Last 5 minutes
            .length;

        // More stock = lower prices, more transactions = higher prices
        const stockFactor = Math.max(0.5, 1 / (1 + playerStock * 0.001));
        const demandFactor = Math.min(2.0, 1 + recentTransactions * 0.1);
        
        return stockFactor * demandFactor;
    }

    addMarketItem(resourceType: ResourceType, quantity: number, quality: QualityTier = QualityTier.STANDARD, seller: string = 'system'): string {
        const itemId = crypto.randomUUID();
        const currentPrice = this.getCurrentPrice(resourceType, quality);
        
        const item: MarketItem = {
            id: itemId,
            resourceType,
            quality,
            quantity,
            pricePerUnit: currentPrice,
            currency: CurrencyType.COSMIC_CREDITS,
            seller,
            timeAdded: Date.now(),
            expiresAt: seller === 'system' ? undefined : Date.now() + 3600000 // Player listings expire in 1 hour
        };

        this.marketItems.set(itemId, item);
        console.log(`[MARKET] Added ${quantity} ${resourceType} (${QualityTier[quality]}) for ${currentPrice.toFixed(2)} credits each`);
        
        return itemId;
    }

    removeMarketItem(itemId: string): boolean {
        const removed = this.marketItems.delete(itemId);
        if (removed) {
            console.log(`[MARKET] Removed market item ${itemId}`);
        }
        return removed;
    }

    getMarketItems(resourceType?: ResourceType): MarketItem[] {
        const allItems = Array.from(this.marketItems.values());
        
        if (resourceType) {
            return allItems.filter(item => item.resourceType === resourceType);
        }
        
        return allItems;
    }

    buyItem(itemId: string, quantity: number, buyerId: string = 'player'): boolean {
        const item = this.marketItems.get(itemId);
        if (!item) {
            console.error('[MARKET] Item not found:', itemId);
            return false;
        }

        if (quantity > item.quantity) {
            console.warn(`[MARKET] Insufficient quantity. Requested: ${quantity}, Available: ${item.quantity}`);
            return false;
        }

        const totalCost = item.pricePerUnit * quantity;
        
        // Check if buyer has enough currency
        if (!currencyManager.spendCurrency(item.currency, totalCost)) {
            console.warn(`[MARKET] Insufficient ${item.currency} for purchase`);
            return false;
        }

        // Add resources to buyer's inventory
        gameStateManager.updateState(state => ({
            ...state,
            resources: {
                ...state.resources,
                [item.resourceType]: (state.resources[item.resourceType] || 0) + quantity
            }
        }));

        // Update item quantity or remove if fully purchased
        if (quantity === item.quantity) {
            this.marketItems.delete(itemId);
        } else {
            item.quantity -= quantity;
        }

        // Record transaction
        const transaction: MarketTransaction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            buyerId,
            sellerId: item.seller,
            itemId,
            resourceType: item.resourceType,
            quantity,
            totalPrice: totalCost,
            currency: item.currency
        };

        this.transactionHistory.push(transaction);

        // Record price history
        this.priceHistory.push({
            resourceType: item.resourceType,
            quality: item.quality,
            currency: item.currency,
            timestamp: Date.now(),
            price: item.pricePerUnit,
            volume: quantity
        });

        console.log(`[MARKET] Purchased ${quantity} ${item.resourceType} for ${totalCost.toFixed(2)} ${item.currency}`);
        return true;
    }

    sellResource(resourceType: ResourceType, quantity: number, quality: QualityTier = QualityTier.STANDARD, sellerId: string = 'player'): boolean {
        // Check if seller has enough resources
        const currentAmount = gameState.resources[resourceType] || 0;
        if (currentAmount < quantity) {
            console.warn(`[MARKET] Insufficient ${resourceType}. Required: ${quantity}, Available: ${currentAmount}`);
            return false;
        }

        // Calculate sale price (slightly lower than market price for quick sale)
        const marketPrice = this.getCurrentPrice(resourceType, quality);
        const salePrice = marketPrice * 0.9; // 10% discount for instant sale
        const totalEarnings = salePrice * quantity;

        // Remove resources from inventory
        gameStateManager.updateState(state => ({
            ...state,
            resources: {
                ...state.resources,
                [resourceType]: state.resources[resourceType] - quantity
            }
        }));

        // Add currency to player
        currencyManager.addCurrency(CurrencyType.COSMIC_CREDITS, totalEarnings);

        // Record transaction
        const transaction: MarketTransaction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            buyerId: 'system',
            sellerId,
            itemId: 'instant_sale',
            resourceType,
            quantity,
            totalPrice: totalEarnings,
            currency: CurrencyType.COSMIC_CREDITS
        };

        this.transactionHistory.push(transaction);

        // Record price history
        this.priceHistory.push({
            resourceType,
            quality,
            currency: CurrencyType.COSMIC_CREDITS,
            timestamp: Date.now(),
            price: salePrice,
            volume: quantity
        });

        console.log(`[MARKET] Sold ${quantity} ${resourceType} for ${totalEarnings.toFixed(2)} credits`);
        return true;
    }

    getTransactionHistory(): MarketTransaction[] {
        return [...this.transactionHistory];
    }

    getPriceHistory(resourceType: ResourceType, hours: number = 24): PriceHistory[] {
        const cutoffTime = Date.now() - (hours * 3600000);
        return this.priceHistory.filter(entry => 
            entry.resourceType === resourceType && entry.timestamp >= cutoffTime
        );
    }

    update(): void {
        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        
        // Update market every 30 seconds
        if (deltaTime < 30000) return;

        // Remove expired listings
        const expiredItems: string[] = [];
        this.marketItems.forEach((item, id) => {
            if (item.expiresAt && now > item.expiresAt) {
                expiredItems.push(id);
            }
        });

        expiredItems.forEach(id => this.removeMarketItem(id));

        // Update prices based on market activity
        this.updateMarketPrices();

        // Add some system listings for common resources
        this.generateSystemListings();

        this.lastUpdateTime = now;
    }

    private updateMarketPrices(): void {
        // Adjust volatility based on market activity
        const recentActivity = this.transactionHistory
            .filter(t => Date.now() - t.timestamp < 600000) // Last 10 minutes
            .length;

        this.priceVolatility = Math.min(0.3, 0.05 + recentActivity * 0.01);
    }

    private generateSystemListings(): void {
        // Add basic resources if market is low on them
        const basicResources = [
            ResourceType.COSMIC_DUST,
            ResourceType.ENERGY,
            ResourceType.IRON_DUST,
            ResourceType.THERMAL_ENERGY
        ];

        basicResources.forEach(resourceType => {
            const existingListings = this.getMarketItems(resourceType)
                .filter(item => item.seller === 'system');
            
            if (existingListings.length < 2) {
                const quantity = Math.floor(Math.random() * 100) + 50;
                this.addMarketItem(resourceType, quantity, QualityTier.STANDARD, 'system');
            }
        });
    }

    // Get market statistics
    getMarketStats(): any {
        const totalListings = this.marketItems.size;
        const totalTransactions = this.transactionHistory.length;
        const last24hTransactions = this.transactionHistory
            .filter(t => Date.now() - t.timestamp < 86400000).length;

        const resourceCounts = new Map<ResourceType, number>();
        this.marketItems.forEach(item => {
            const current = resourceCounts.get(item.resourceType) || 0;
            resourceCounts.set(item.resourceType, current + item.quantity);
        });

        return {
            totalListings,
            totalTransactions,
            last24hTransactions,
            resourceCounts: Object.fromEntries(resourceCounts),
            priceVolatility: this.priceVolatility
        };
    }

    // Format price for display
    formatPrice(price: number, currency: CurrencyType = CurrencyType.COSMIC_CREDITS): string {
        return currencyManager.formatCurrency(currency, price);
    }
}

// Export singleton instance
export const marketSystem = new MarketSystem();

// Export types for external use
export type { MarketItem, MarketTransaction, PriceHistory };