import * as BABYLON from '@babylonjs/core';

export interface CrossGameResource {
    id: string;
    name: string;
    amount: number;
    sourceGame: string;
    convertedFrom?: string;
    conversionRate?: number;
}

export interface GameConnection {
    gameId: string;
    gameName: string;
    apiEndpoint?: string;
    isConnected: boolean;
    lastSync?: Date;
}

export interface ResourceConversionRule {
    fromGame: string;
    fromResource: string;
    toResource: string;
    rate: number;
    minimumAmount?: number;
}

export class CrossGameResourceManager {
    private connections: Map<string, GameConnection> = new Map();
    private conversionRules: ResourceConversionRule[] = [];
    private importedResources: Map<string, CrossGameResource> = new Map();
    private exportHistory: Array<{
        timestamp: Date;
        toGame: string;
        resource: string;
        amount: number;
    }> = [];
    
    constructor() {
        this.initializeDefaultRules();
        this.loadSavedData();
    }
    
    private initializeDefaultRules(): void {
        // Cosmic Gardener (Fillstellar) からのリソース変換ルール
        this.conversionRules = [
            // Cosmic Gardenerからの宇宙塵
            {
                fromGame: 'cosmic-gardener',
                fromResource: 'cosmicDust',
                toResource: 'minerals',
                rate: 10, // 10宇宙塵 = 1鉱石
                minimumAmount: 100
            },
            // Cosmic Gardenerからのエネルギー
            {
                fromGame: 'cosmic-gardener',
                fromResource: 'energy',
                toResource: 'energy',
                rate: 1, // 1:1変換
                minimumAmount: 50
            },
            // Cosmic Gardenerからのダークマター
            {
                fromGame: 'cosmic-gardener',
                fromResource: 'darkMatter',
                toResource: 'artifacts',
                rate: 0.1, // 10ダークマター = 1アーティファクト
                minimumAmount: 10
            },
            // Cosmic Gardenerからの思考ポイント
            {
                fromGame: 'cosmic-gardener',
                fromResource: 'thoughtPoints',
                toResource: 'parts',
                rate: 0.5, // 2思考ポイント = 1パーツ
                minimumAmount: 10
            },
            // 汎用的な変換（他のゲームからの基本リソース）
            {
                fromGame: 'generic',
                fromResource: 'gold',
                toResource: 'minerals',
                rate: 0.5,
                minimumAmount: 100
            },
            {
                fromGame: 'generic',
                fromResource: 'mana',
                toResource: 'energy',
                rate: 2,
                minimumAmount: 50
            }
        ];
    }
    
    private loadSavedData(): void {
        // LocalStorageから保存データを読み込む
        const savedConnections = localStorage.getItem('crossGameConnections');
        if (savedConnections) {
            try {
                const connections = JSON.parse(savedConnections);
                connections.forEach((conn: GameConnection) => {
                    this.connections.set(conn.gameId, conn);
                });
            } catch (error) {
                console.error('[CROSSGAME] Failed to load connections:', error);
            }
        }
        
        const savedResources = localStorage.getItem('crossGameImportedResources');
        if (savedResources) {
            try {
                const resources = JSON.parse(savedResources);
                resources.forEach((res: CrossGameResource) => {
                    this.importedResources.set(res.id, res);
                });
            } catch (error) {
                console.error('[CROSSGAME] Failed to load imported resources:', error);
            }
        }
    }
    
    private saveData(): void {
        // 接続情報を保存
        const connections = Array.from(this.connections.values());
        localStorage.setItem('crossGameConnections', JSON.stringify(connections));
        
        // インポートされたリソースを保存
        const resources = Array.from(this.importedResources.values());
        localStorage.setItem('crossGameImportedResources', JSON.stringify(resources));
    }
    
    public connectToGame(gameId: string, gameName: string, apiEndpoint?: string): boolean {
        console.log(`[CROSSGAME] Connecting to ${gameName}...`);
        
        const connection: GameConnection = {
            gameId,
            gameName,
            apiEndpoint,
            isConnected: true,
            lastSync: new Date()
        };
        
        this.connections.set(gameId, connection);
        this.saveData();
        
        // Cosmic Gardenerとの接続の場合、LocalStorageから直接データを読み込む
        if (gameId === 'cosmic-gardener') {
            this.importFromCosmicGardener();
        }
        
        return true;
    }
    
    private importFromCosmicGardener(): void {
        // Cosmic GardenerのセーブデータをLocalStorageから読み込む
        const cosmicSaveData = localStorage.getItem('cosmicGardenerSave');
        if (!cosmicSaveData) {
            console.log('[CROSSGAME] No Cosmic Gardener save data found');
            return;
        }
        
        try {
            const saveData = JSON.parse(cosmicSaveData);
            const resources = saveData.resources || {};
            
            // 利用可能なリソースをインポート
            Object.entries(resources).forEach(([resourceType, amount]) => {
                if (typeof amount === 'number' && amount > 0) {
                    const resource: CrossGameResource = {
                        id: `cosmic-${resourceType}-${Date.now()}`,
                        name: resourceType,
                        amount: amount as number,
                        sourceGame: 'cosmic-gardener'
                    };
                    
                    this.importedResources.set(resource.id, resource);
                }
            });
            
            this.saveData();
            console.log('[CROSSGAME] Successfully imported resources from Cosmic Gardener');
        } catch (error) {
            console.error('[CROSSGAME] Failed to import from Cosmic Gardener:', error);
        }
    }
    
    public getAvailableResources(): CrossGameResource[] {
        return Array.from(this.importedResources.values());
    }
    
    public getConnectedGames(): GameConnection[] {
        return Array.from(this.connections.values());
    }
    
    public convertResource(
        resourceId: string,
        targetResourceType: string
    ): { success: boolean; amount?: number; message: string } {
        const resource = this.importedResources.get(resourceId);
        if (!resource) {
            return { success: false, message: 'リソースが見つかりません' };
        }
        
        // 変換ルールを探す
        const rule = this.conversionRules.find(
            r => r.fromGame === resource.sourceGame && 
                 r.fromResource === resource.name && 
                 r.toResource === targetResourceType
        );
        
        if (!rule) {
            // 汎用ルールをチェック
            const genericRule = this.conversionRules.find(
                r => r.fromGame === 'generic' && 
                     r.fromResource === resource.name && 
                     r.toResource === targetResourceType
            );
            
            if (!genericRule) {
                return { success: false, message: '変換ルールが見つかりません' };
            }
        }
        
        const conversionRule = rule || this.conversionRules.find(
            r => r.fromGame === 'generic' && 
                 r.fromResource === resource.name && 
                 r.toResource === targetResourceType
        )!;
        
        // 最小量チェック
        if (conversionRule.minimumAmount && resource.amount < conversionRule.minimumAmount) {
            return { 
                success: false, 
                message: `最小${conversionRule.minimumAmount}個必要です` 
            };
        }
        
        // 変換量を計算
        const convertedAmount = Math.floor(resource.amount * conversionRule.rate);
        
        if (convertedAmount < 1) {
            return { success: false, message: '変換後の量が不足しています' };
        }
        
        // リソースを削除
        this.importedResources.delete(resourceId);
        this.saveData();
        
        return {
            success: true,
            amount: convertedAmount,
            message: `${resource.amount} ${resource.name} を ${convertedAmount} ${targetResourceType} に変換しました`
        };
    }
    
    public exportResource(
        resourceType: string,
        amount: number,
        toGame: string
    ): { success: boolean; message: string } {
        const connection = this.connections.get(toGame);
        if (!connection || !connection.isConnected) {
            return { success: false, message: 'ゲームが接続されていません' };
        }
        
        // エクスポート履歴に追加
        this.exportHistory.push({
            timestamp: new Date(),
            toGame,
            resource: resourceType,
            amount
        });
        
        // 実際のエクスポート処理（将来的にAPIを実装）
        console.log(`[CROSSGAME] Exporting ${amount} ${resourceType} to ${toGame}`);
        
        return {
            success: true,
            message: `${amount} ${resourceType} を ${connection.gameName} にエクスポートしました`
        };
    }
    
    public getExportHistory() {
        return this.exportHistory;
    }
    
    public getConversionRules(): ResourceConversionRule[] {
        return this.conversionRules;
    }
    
    public addCustomRule(rule: ResourceConversionRule): void {
        this.conversionRules.push(rule);
    }
    
    public disconnectGame(gameId: string): void {
        this.connections.delete(gameId);
        this.saveData();
    }
}