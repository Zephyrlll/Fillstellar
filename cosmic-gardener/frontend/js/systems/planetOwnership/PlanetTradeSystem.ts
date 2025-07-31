/**
 * Planet Trade System
 * 惑星間貿易システム
 */

import { OwnedPlanet } from './planetShop.js';
import { PlanetPersistence } from './PlanetPersistence.js';
import { gameState } from '../../state.js';
import { showMessage } from '../../ui.js';
import { addTimelineLog } from '../../timeline.js';

// 貿易ルート
export interface TradeRoute {
    id: string;
    fromPlanetId: string;
    toPlanetId: string;
    resourceType: 'minerals' | 'energy' | 'parts' | 'mixed';
    tradeAmount: number;
    frequency: number; // 時間あたりの取引回数
    efficiency: number; // 0-1 の効率率
    establishedAt: number;
    active: boolean;
}

// 貿易統計
export interface TradeStatistics {
    totalRoutes: number;
    activeRoutes: number;
    totalVolume: {
        minerals: number;
        energy: number;
        parts: number;
    };
    totalProfit: number;
    bestRoute: string | null;
}

// 惑星の特産品
export const PLANET_SPECIALTIES: Record<string, { resource: string; bonus: number }> = {
    desert: { resource: 'minerals', bonus: 1.5 },
    ocean: { resource: 'energy', bonus: 1.3 },
    forest: { resource: 'parts', bonus: 1.4 },
    ice: { resource: 'energy', bonus: 1.2 },
    volcanic: { resource: 'minerals', bonus: 1.6 },
    gas: { resource: 'energy', bonus: 1.5 }
};

export class PlanetTradeSystem {
    private static instance: PlanetTradeSystem;
    private persistence: PlanetPersistence;
    private tradeRoutes: Map<string, TradeRoute> = new Map();
    private lastTradeTime: Map<string, number> = new Map();
    private readonly TRADE_INTERVAL = 60000; // 1分ごとに取引
    private readonly MAX_ROUTES_PER_PLANET = 3;
    private readonly ROUTE_ESTABLISHMENT_COST = {
        cosmicDust: 50000,
        energy: 20000,
        thoughtPoints: 500
    };
    
    private constructor() {
        this.persistence = PlanetPersistence.getInstance();
        this.loadTradeRoutes();
        this.startTradeTimer();
    }
    
    static getInstance(): PlanetTradeSystem {
        if (!PlanetTradeSystem.instance) {
            PlanetTradeSystem.instance = new PlanetTradeSystem();
        }
        return PlanetTradeSystem.instance;
    }
    
    /**
     * 貿易ルートを確立
     */
    establishRoute(fromPlanet: OwnedPlanet, toPlanet: OwnedPlanet, resourceType: TradeRoute['resourceType']): boolean {
        // 同じ惑星間のルートは不可
        if (fromPlanet.id === toPlanet.id) {
            showMessage('同じ惑星間では貿易ルートを確立できません', 'error');
            return false;
        }
        
        // 既存ルートチェック
        const existingRoute = this.findRoute(fromPlanet.id, toPlanet.id);
        if (existingRoute) {
            showMessage('この惑星間には既に貿易ルートが存在します', 'error');
            return false;
        }
        
        // ルート数制限チェック
        const fromRoutes = this.getRoutesForPlanet(fromPlanet.id);
        const toRoutes = this.getRoutesForPlanet(toPlanet.id);
        
        if (fromRoutes.length >= this.MAX_ROUTES_PER_PLANET) {
            showMessage(`${fromPlanet.name}は既に最大数の貿易ルートを持っています`, 'error');
            return false;
        }
        
        if (toRoutes.length >= this.MAX_ROUTES_PER_PLANET) {
            showMessage(`${toPlanet.name}は既に最大数の貿易ルートを持っています`, 'error');
            return false;
        }
        
        // コストチェック
        if (!this.canAffordRoute()) {
            showMessage('貿易ルート確立に必要なリソースが不足しています', 'error');
            return false;
        }
        
        // コストを消費
        this.consumeRouteCost();
        
        // ルートを作成
        const routeId = `route_${fromPlanet.id}_${toPlanet.id}_${Date.now()}`;
        const distance = this.calculateDistance(fromPlanet, toPlanet);
        const efficiency = this.calculateEfficiency(fromPlanet, toPlanet, distance);
        
        const route: TradeRoute = {
            id: routeId,
            fromPlanetId: fromPlanet.id,
            toPlanetId: toPlanet.id,
            resourceType,
            tradeAmount: this.calculateTradeAmount(fromPlanet, toPlanet, resourceType),
            frequency: this.calculateFrequency(distance),
            efficiency,
            establishedAt: Date.now(),
            active: true
        };
        
        this.tradeRoutes.set(routeId, route);
        this.saveTradeRoutes();
        
        addTimelineLog(`貿易ルート確立: ${fromPlanet.name} → ${toPlanet.name}`);
        showMessage('貿易ルートを確立しました！', 'success');
        
        return true;
    }
    
    /**
     * 貿易ルートを削除
     */
    removeRoute(routeId: string): boolean {
        const route = this.tradeRoutes.get(routeId);
        if (!route) return false;
        
        this.tradeRoutes.delete(routeId);
        this.lastTradeTime.delete(routeId);
        this.saveTradeRoutes();
        
        showMessage('貿易ルートを削除しました', 'info');
        return true;
    }
    
    /**
     * ルートの有効/無効を切り替え
     */
    toggleRoute(routeId: string): boolean {
        const route = this.tradeRoutes.get(routeId);
        if (!route) return false;
        
        route.active = !route.active;
        this.saveTradeRoutes();
        
        showMessage(`貿易ルートを${route.active ? '有効化' : '無効化'}しました`, 'info');
        return true;
    }
    
    /**
     * 貿易を実行
     */
    private executeTrade(route: TradeRoute): void {
        if (!route.active) return;
        
        const fromPlanet = this.getPlanetById(route.fromPlanetId);
        const toPlanet = this.getPlanetById(route.toPlanetId);
        
        if (!fromPlanet || !toPlanet) return;
        
        // 貿易量を計算
        const baseAmount = route.tradeAmount * route.efficiency;
        const fromSpecialty = PLANET_SPECIALTIES[fromPlanet.type];
        const toSpecialty = PLANET_SPECIALTIES[toPlanet.type];
        
        // 利益を計算
        let profit = 0;
        
        switch (route.resourceType) {
            case 'minerals':
                profit = this.tradeSingleResource('minerals', baseAmount, fromSpecialty, toSpecialty);
                break;
            case 'energy':
                profit = this.tradeSingleResource('energy', baseAmount, fromSpecialty, toSpecialty);
                break;
            case 'parts':
                profit = this.tradeSingleResource('parts', baseAmount, fromSpecialty, toSpecialty);
                break;
            case 'mixed':
                // 混合貿易は各リソースを少しずつ
                profit += this.tradeSingleResource('minerals', baseAmount * 0.33, fromSpecialty, toSpecialty);
                profit += this.tradeSingleResource('energy', baseAmount * 0.33, fromSpecialty, toSpecialty);
                profit += this.tradeSingleResource('parts', baseAmount * 0.34, fromSpecialty, toSpecialty);
                break;
        }
        
        // 統計を更新
        this.updateTradeStatistics(route, profit);
    }
    
    /**
     * 単一リソースの貿易
     */
    private tradeSingleResource(
        resource: string,
        amount: number,
        fromSpecialty: { resource: string; bonus: number },
        toSpecialty: { resource: string; bonus: number }
    ): number {
        // 輸出ボーナス
        const exportBonus = fromSpecialty.resource === resource ? fromSpecialty.bonus : 1;
        // 輸入ボーナス
        const importBonus = toSpecialty.resource !== resource ? 1.2 : 1;
        
        const totalBonus = exportBonus * importBonus;
        const finalAmount = Math.floor(amount * totalBonus);
        
        // リソースを変換（簡略化のため、すべて宇宙の塵に変換）
        const conversionRate = resource === 'minerals' ? 10 : resource === 'energy' ? 5 : 50;
        const profit = finalAmount * conversionRate;
        
        gameState.resources.cosmicDust += profit;
        
        return profit;
    }
    
    /**
     * 貿易タイマーを開始
     */
    private startTradeTimer(): void {
        setInterval(() => {
            const now = Date.now();
            
            this.tradeRoutes.forEach(route => {
                const lastTrade = this.lastTradeTime.get(route.id) || 0;
                const interval = this.TRADE_INTERVAL / route.frequency;
                
                if (now - lastTrade >= interval) {
                    this.executeTrade(route);
                    this.lastTradeTime.set(route.id, now);
                }
            });
        }, 5000); // 5秒ごとにチェック
    }
    
    /**
     * 距離を計算
     */
    private calculateDistance(planet1: OwnedPlanet, planet2: OwnedPlanet): number {
        // 簡略化のため、惑星タイプに基づく仮想距離
        const typeDistance: Record<string, number> = {
            desert: 1,
            ocean: 2,
            forest: 3,
            ice: 4,
            volcanic: 5,
            gas: 6
        };
        
        return Math.abs(typeDistance[planet1.type] - typeDistance[planet2.type]) + 1;
    }
    
    /**
     * 効率を計算
     */
    private calculateEfficiency(planet1: OwnedPlanet, planet2: OwnedPlanet, distance: number): number {
        // 基本効率
        let efficiency = 1 - (distance * 0.1);
        
        // レベルボーナス
        const avgLevel = (planet1.level + planet2.level) / 2;
        efficiency += avgLevel * 0.05;
        
        return Math.max(0.3, Math.min(1, efficiency));
    }
    
    /**
     * 貿易量を計算
     */
    private calculateTradeAmount(planet1: OwnedPlanet, planet2: OwnedPlanet, resourceType: string): number {
        const baseAmount = 100;
        const levelMultiplier = (planet1.level + planet2.level) / 2;
        
        return Math.floor(baseAmount * levelMultiplier);
    }
    
    /**
     * 頻度を計算
     */
    private calculateFrequency(distance: number): number {
        return Math.max(1, 6 - distance); // 距離が近いほど頻繁に
    }
    
    /**
     * ルートを探す
     */
    private findRoute(fromId: string, toId: string): TradeRoute | undefined {
        return Array.from(this.tradeRoutes.values()).find(
            route => (route.fromPlanetId === fromId && route.toPlanetId === toId) ||
                     (route.fromPlanetId === toId && route.toPlanetId === fromId)
        );
    }
    
    /**
     * 惑星のルートを取得
     */
    getRoutesForPlanet(planetId: string): TradeRoute[] {
        return Array.from(this.tradeRoutes.values()).filter(
            route => route.fromPlanetId === planetId || route.toPlanetId === planetId
        );
    }
    
    /**
     * すべてのルートを取得
     */
    getAllRoutes(): TradeRoute[] {
        return Array.from(this.tradeRoutes.values());
    }
    
    /**
     * 貿易統計を取得
     */
    getTradeStatistics(): TradeStatistics {
        const routes = this.getAllRoutes();
        const activeRoutes = routes.filter(r => r.active);
        
        return {
            totalRoutes: routes.length,
            activeRoutes: activeRoutes.length,
            totalVolume: {
                minerals: 0, // TODO: 実際の取引量を追跡
                energy: 0,
                parts: 0
            },
            totalProfit: 0, // TODO: 総利益を追跡
            bestRoute: null // TODO: 最も利益の高いルートを追跡
        };
    }
    
    /**
     * 惑星IDから惑星を取得
     */
    private getPlanetById(planetId: string): OwnedPlanet | undefined {
        const ownedPlanets = (gameState as any).ownedPlanets || [];
        return ownedPlanets.find((p: OwnedPlanet) => p.id === planetId);
    }
    
    /**
     * ルートコストを支払えるかチェック
     */
    private canAffordRoute(): boolean {
        return gameState.resources.cosmicDust >= this.ROUTE_ESTABLISHMENT_COST.cosmicDust &&
               gameState.resources.energy >= this.ROUTE_ESTABLISHMENT_COST.energy &&
               gameState.resources.thoughtPoints >= this.ROUTE_ESTABLISHMENT_COST.thoughtPoints;
    }
    
    /**
     * ルートコストを消費
     */
    private consumeRouteCost(): void {
        gameState.resources.cosmicDust -= this.ROUTE_ESTABLISHMENT_COST.cosmicDust;
        gameState.resources.energy -= this.ROUTE_ESTABLISHMENT_COST.energy;
        gameState.resources.thoughtPoints -= this.ROUTE_ESTABLISHMENT_COST.thoughtPoints;
    }
    
    /**
     * 貿易統計を更新
     */
    private updateTradeStatistics(route: TradeRoute, profit: number): void {
        // TODO: 詳細な統計追跡を実装
    }
    
    /**
     * 貿易ルートを保存
     */
    private saveTradeRoutes(): void {
        const data = Array.from(this.tradeRoutes.entries());
        localStorage.setItem('planetTradeRoutes', JSON.stringify(data));
    }
    
    /**
     * 貿易ルートを読み込み
     */
    private loadTradeRoutes(): void {
        const saved = localStorage.getItem('planetTradeRoutes');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.tradeRoutes = new Map(data);
            } catch (error) {
                console.error('[TRADE] Failed to load trade routes:', error);
            }
        }
    }
}