// Advanced Market System - Dynamic pricing and trading limits
import { gameState } from './state.js';
import { currencyManager, CurrencyType } from './currencySystem.js';
import { showMessage } from './ui.js';

// Market data structure
export class MarketSystem {
    constructor() {
        this.marketData = this.initializeMarketData();
        this.priceHistory = new Map(); // resourceType -> Array of historical prices
        this.lastUpdate = Date.now();
        this.updateInterval = 30000; // 30 seconds
        this.dailyLimits = new Map(); // resourceType -> { sold: number, limit: number, resetTime: number }
        
        // Market events that affect prices
        this.activeEvents = new Set();
        this.eventDuration = 0;
        
        this.initializeDailyLimits();
    }
    
    initializeMarketData() {
        return {
            // Basic resources with base prices and volatility
            cosmicDust: {
                basePrice: 0.1,
                currentPrice: 0.1,
                volatility: 0.05, // 5% volatility
                demand: 1.0,
                supply: 1.0,
                trend: 0, // -1 to 1
                volume: 0 // daily trading volume
            },
            energy: {
                basePrice: 0.2,
                currentPrice: 0.2,
                volatility: 0.08,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            organicMatter: {
                basePrice: 0.5,
                currentPrice: 0.5,
                volatility: 0.12,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            biomass: {
                basePrice: 1.0,
                currentPrice: 1.0,
                volatility: 0.15,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            darkMatter: {
                basePrice: 5.0,
                currentPrice: 5.0,
                volatility: 0.20,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            thoughtPoints: {
                basePrice: 2.0,
                currentPrice: 2.0,
                volatility: 0.10,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            
            // Advanced resources
            processedMetal: {
                basePrice: 10.0,
                currentPrice: 10.0,
                volatility: 0.18,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            silicon: {
                basePrice: 15.0,
                currentPrice: 15.0,
                volatility: 0.22,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            stabilizedEnergy: {
                basePrice: 25.0,
                currentPrice: 25.0,
                volatility: 0.25,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            },
            quantumCrystal: {
                basePrice: 100.0,
                currentPrice: 100.0,
                volatility: 0.30,
                demand: 1.0,
                supply: 1.0,
                trend: 0,
                volume: 0
            }
        };
    }
    
    initializeDailyLimits() {
        const now = Date.now();
        const resetTime = this.getNextResetTime();
        
        Object.keys(this.marketData).forEach(resourceType => {
            const baseLimit = this.calculateBaseLimit(resourceType);
            this.dailyLimits.set(resourceType, {
                sold: 0,
                limit: baseLimit,
                resetTime: resetTime
            });
        });
    }
    
    calculateBaseLimit(resourceType) {
        const basePrice = this.marketData[resourceType]?.basePrice || 1;
        
        // Higher priced items have lower limits
        if (basePrice >= 100) return 50;      // Tier 3 resources
        if (basePrice >= 10) return 200;      // Tier 2 resources  
        if (basePrice >= 1) return 1000;      // Biomass, thought points
        return 5000;                          // Basic resources
    }
    
    getNextResetTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
    
    // Update market prices based on various factors
    update() {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }
        
        this.lastUpdate = now;
        this.checkDailyReset();
        this.updatePrices();
        this.triggerRandomEvents();
        this.updateTrends();
    }
    
    checkDailyReset() {
        const now = Date.now();
        const resetTime = this.getNextResetTime();
        
        this.dailyLimits.forEach((limitData, resourceType) => {
            if (now >= limitData.resetTime) {
                limitData.sold = 0;
                limitData.limit = this.calculateBaseLimit(resourceType);
                limitData.resetTime = resetTime;
            }
        });
    }
    
    updatePrices() {
        Object.entries(this.marketData).forEach(([resourceType, data]) => {
            // Random market fluctuation
            const randomChange = (Math.random() - 0.5) * data.volatility;
            
            // Supply and demand effect
            const supplyDemandEffect = (data.demand - data.supply) * 0.1;
            
            // Trend effect
            const trendEffect = data.trend * 0.05;
            
            // Market events effect
            const eventEffect = this.getEventEffect(resourceType);
            
            // Calculate new price
            const priceChange = randomChange + supplyDemandEffect + trendEffect + eventEffect;
            data.currentPrice = Math.max(
                data.basePrice * 0.3, // Minimum 30% of base price
                Math.min(
                    data.basePrice * 3.0, // Maximum 300% of base price
                    data.currentPrice * (1 + priceChange)
                )
            );
            
            // Update price history
            this.updatePriceHistory(resourceType, data.currentPrice);
            
            // Reset daily volume
            data.volume = 0;
        });
    }
    
    updatePriceHistory(resourceType, price) {
        if (!this.priceHistory.has(resourceType)) {
            this.priceHistory.set(resourceType, []);
        }
        
        const history = this.priceHistory.get(resourceType);
        history.push({
            price: price,
            timestamp: Date.now()
        });
        
        // Keep only last 100 data points
        if (history.length > 100) {
            history.shift();
        }
    }
    
    updateTrends() {
        Object.entries(this.marketData).forEach(([resourceType, data]) => {
            const history = this.priceHistory.get(resourceType);
            if (!history || history.length < 5) return;
            
            // Calculate trend based on recent price movements
            const recent = history.slice(-5);
            const oldest = recent[0].price;
            const newest = recent[recent.length - 1].price;
            
            if (newest > oldest * 1.05) {
                data.trend = Math.min(1, data.trend + 0.1);
            } else if (newest < oldest * 0.95) {
                data.trend = Math.max(-1, data.trend - 0.1);
            } else {
                data.trend *= 0.9; // Trend decay
            }
        });
    }
    
    triggerRandomEvents() {
        // 1% chance per update to trigger a market event
        if (Math.random() < 0.01) {
            this.triggerMarketEvent();
        }
        
        // Remove expired events
        this.activeEvents.forEach(event => {
            if (Date.now() > event.endTime) {
                this.activeEvents.delete(event);
                showMessage(`市場イベント終了: ${event.description}`, 3000);
            }
        });
    }
    
    triggerMarketEvent() {
        const events = [
            {
                name: 'energyCrisis',
                description: 'エネルギー危機：エネルギー価格が急騰！',
                duration: 120000, // 2 minutes
                effects: { energy: 2.0, stabilizedEnergy: 1.8 }
            },
            {
                name: 'organicBoost',
                description: '生命の発見：有機物・バイオマスの需要が増加！',
                duration: 180000, // 3 minutes
                effects: { organicMatter: 1.5, biomass: 1.6 }
            },
            {
                name: 'techBoom',
                description: '技術革新：高度な資源の価格が上昇！',
                duration: 240000, // 4 minutes
                effects: { quantumCrystal: 2.2, stabilizedEnergy: 1.4, silicon: 1.3 }
            },
            {
                name: 'dustStorm',
                description: '宇宙嵐：宇宙の塵の価格が不安定化！',
                duration: 90000, // 1.5 minutes
                effects: { cosmicDust: 0.7 }
            },
            {
                name: 'consciousnessWave',
                description: '意識の波：思考ポイントの価値が高騰！',
                duration: 300000, // 5 minutes
                effects: { thoughtPoints: 2.5 }
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        event.endTime = Date.now() + event.duration;
        
        this.activeEvents.add(event);
        showMessage(`市場イベント発生: ${event.description}`, 5000);
    }
    
    getEventEffect(resourceType) {
        let totalEffect = 0;
        
        this.activeEvents.forEach(event => {
            if (event.effects[resourceType]) {
                totalEffect += (event.effects[resourceType] - 1) * 0.5;
            }
        });
        
        return totalEffect;
    }
    
    // Attempt to sell resources
    sellResource(resourceType, amount) {
        // Check if resource exists in market
        if (!this.marketData[resourceType]) {
            return { success: false, message: 'この資源は市場で取引されていません' };
        }
        
        // Check daily limit
        const limitData = this.dailyLimits.get(resourceType);
        if (limitData.sold + amount > limitData.limit) {
            const remaining = limitData.limit - limitData.sold;
            return { 
                success: false, 
                message: `本日の販売限界を超えます（残り${remaining}個）` 
            };
        }
        
        // Check if player has enough resources
        let availableAmount = 0;
        if (resourceType in gameState.resources) {
            availableAmount = gameState.resources[resourceType];
        } else if (gameState.advancedResources && gameState.advancedResources[resourceType]) {
            availableAmount = gameState.advancedResources[resourceType].amount;
        }
        
        if (availableAmount < amount) {
            return { success: false, message: '資源が不足しています' };
        }
        
        // Calculate price with market impact
        const marketData = this.marketData[resourceType];
        const marketImpact = this.calculateMarketImpact(resourceType, amount);
        const effectivePrice = marketData.currentPrice * (1 - marketImpact);
        const totalValue = Math.floor(amount * effectivePrice);
        
        // Process the sale
        if (resourceType in gameState.resources) {
            gameState.resources[resourceType] -= amount;
        } else if (gameState.advancedResources && gameState.advancedResources[resourceType]) {
            gameState.advancedResources[resourceType].amount -= amount;
        }
        
        // Update market data
        limitData.sold += amount;
        marketData.volume += amount;
        marketData.supply += amount * 0.001; // Large sales increase supply
        
        // Add currency
        currencyManager.addCurrency(CurrencyType.COSMIC_DUST_CURRENCY, totalValue);
        
        return {
            success: true,
            totalValue: totalValue,
            effectivePrice: effectivePrice,
            marketImpact: marketImpact,
            remaining: limitData.limit - limitData.sold
        };
    }
    
    calculateMarketImpact(resourceType, amount) {
        const marketData = this.marketData[resourceType];
        const limitData = this.dailyLimits.get(resourceType);
        
        // Impact based on percentage of daily limit
        const percentageOfLimit = amount / limitData.limit;
        
        // Large sales reduce price (market impact)
        return Math.min(0.3, percentageOfLimit * 0.5); // Max 30% price reduction
    }
    
    // Get market information for UI
    getMarketInfo(resourceType) {
        const marketData = this.marketData[resourceType];
        const limitData = this.dailyLimits.get(resourceType);
        
        if (!marketData || !limitData) return null;
        
        const priceHistory = this.priceHistory.get(resourceType) || [];
        const priceChange = this.calculatePriceChange(resourceType);
        
        return {
            currentPrice: marketData.currentPrice,
            basePrice: marketData.basePrice,
            priceChange: priceChange,
            trend: marketData.trend,
            dailyLimit: limitData.limit,
            dailySold: limitData.sold,
            remaining: limitData.limit - limitData.sold,
            volatility: marketData.volatility,
            volume: marketData.volume,
            priceHistory: priceHistory.slice(-10) // Last 10 data points
        };
    }
    
    calculatePriceChange(resourceType) {
        const history = this.priceHistory.get(resourceType);
        if (!history || history.length < 2) return 0;
        
        const current = history[history.length - 1].price;
        const previous = history[history.length - 2].price;
        
        return ((current - previous) / previous) * 100;
    }
    
    // Get all market data for overview
    getAllMarketInfo() {
        const result = {};
        Object.keys(this.marketData).forEach(resourceType => {
            result[resourceType] = this.getMarketInfo(resourceType);
        });
        return result;
    }
    
    // Save state
    saveState() {
        return {
            marketData: this.marketData,
            dailyLimits: Array.from(this.dailyLimits.entries()),
            priceHistory: Array.from(this.priceHistory.entries()),
            activeEvents: Array.from(this.activeEvents),
            lastUpdate: this.lastUpdate
        };
    }
    
    // Load state
    loadState(state) {
        if (state.marketData) {
            this.marketData = state.marketData;
        }
        if (state.dailyLimits) {
            this.dailyLimits = new Map(state.dailyLimits);
        }
        if (state.priceHistory) {
            this.priceHistory = new Map(state.priceHistory);
        }
        if (state.activeEvents) {
            this.activeEvents = new Set(state.activeEvents);
        }
        if (state.lastUpdate) {
            this.lastUpdate = state.lastUpdate;
        }
    }
}

// Global market system instance
export const marketSystem = new MarketSystem();

// Export to window for debugging
window.marketSystem = marketSystem;

console.log('📈 Advanced Market System loaded');