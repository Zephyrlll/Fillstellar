import * as BABYLON from '@babylonjs/core';

/**
 * 惑星表面のグリッドシステム
 * 将来の建築システムのための基盤
 */
export interface PlanetTile {
    id: string;
    position: BABYLON.Vector3;      // ワールド座標
    normal: BABYLON.Vector3;        // 地表の法線
    rotation: BABYLON.Quaternion;   // タイルの回転
    gridCoords: { u: number; v: number }; // グリッド座標
    isOccupied: boolean;
    buildings: string[];            // 建築物ID
}

export class PlanetGridSystem {
    private scene: BABYLON.Scene;
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    // グリッド設定
    private gridResolution: number = 32; // 球面の分割数
    private tileSize: number = 5;        // タイルのサイズ（メートル）
    
    // タイルデータ
    private tiles: Map<string, PlanetTile> = new Map();
    
    // デバッグ表示
    private debugMeshes: BABYLON.Mesh[] = [];
    private debugEnabled: boolean = false;
    
    // イベントシステム
    private eventHandlers: Map<string, Function[]> = new Map();
    
    constructor(
        scene: BABYLON.Scene,
        planetCenter: BABYLON.Vector3,
        planetRadius: number
    ) {
        this.scene = scene;
        this.planetCenter = planetCenter;
        this.planetRadius = planetRadius;
        
        this.generateGrid();
        
        console.log('[PLANET_GRID] Initialized with', this.tiles.size, 'tiles');
    }
    
    /**
     * グリッドを生成
     */
    private generateGrid(): void {
        // 球面を均等に分割（簡易実装）
        const phiSteps = this.gridResolution;
        const thetaSteps = this.gridResolution * 2;
        
        for (let phi = 0; phi < phiSteps; phi++) {
            for (let theta = 0; theta < thetaSteps; theta++) {
                // 球面座標
                const phiAngle = (phi / phiSteps) * Math.PI;
                const thetaAngle = (theta / thetaSteps) * Math.PI * 2;
                
                // ワールド座標に変換
                const x = this.planetRadius * Math.sin(phiAngle) * Math.cos(thetaAngle);
                const y = this.planetRadius * Math.cos(phiAngle);
                const z = this.planetRadius * Math.sin(phiAngle) * Math.sin(thetaAngle);
                
                const position = this.planetCenter.add(new BABYLON.Vector3(x, y, z));
                const normal = position.subtract(this.planetCenter).normalize();
                
                // タイルの回転を計算
                const up = normal;
                let forward = new BABYLON.Vector3(0, 0, 1);
                forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
                if (forward.length() < 0.001) {
                    forward = new BABYLON.Vector3(1, 0, 0);
                    forward = forward.subtract(up.scale(BABYLON.Vector3.Dot(forward, up)));
                }
                forward.normalize();
                
                const right = BABYLON.Vector3.Cross(up, forward);
                
                const rotMatrix = BABYLON.Matrix.Identity();
                rotMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
                rotMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
                rotMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
                
                const rotation = BABYLON.Quaternion.FromRotationMatrix(rotMatrix);
                
                // タイルを作成
                const tileId = `${phi}_${theta}`;
                const tile: PlanetTile = {
                    id: tileId,
                    position: position,
                    normal: normal,
                    rotation: rotation,
                    gridCoords: { u: phi, v: theta },
                    isOccupied: false,
                    buildings: []
                };
                
                this.tiles.set(tileId, tile);
            }
        }
    }
    
    /**
     * 座標から最も近いタイルを取得
     */
    getTileFromPosition(position: BABYLON.Vector3): PlanetTile | null {
        let closestTile: PlanetTile | null = null;
        let minDistance = Infinity;
        
        this.tiles.forEach(tile => {
            const distance = BABYLON.Vector3.Distance(position, tile.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestTile = tile;
            }
        });
        
        return closestTile;
    }
    
    /**
     * タイルIDからタイルを取得
     */
    getTile(tileId: string): PlanetTile | null {
        return this.tiles.get(tileId) || null;
    }
    
    /**
     * 建築可能な位置を取得
     */
    getBuildablePositions(tileId: string, buildingSize: number = 1): BABYLON.Vector3[] {
        const tile = this.getTile(tileId);
        if (!tile || tile.isOccupied) return [];
        
        // 簡易実装：タイルの中心のみ返す
        // TODO: より詳細なグリッド内配置
        return [tile.position];
    }
    
    /**
     * タイルを占有
     */
    occupyTile(tileId: string, buildingId: string): boolean {
        const tile = this.getTile(tileId);
        if (!tile || tile.isOccupied) return false;
        
        tile.isOccupied = true;
        tile.buildings.push(buildingId);
        
        this.emit('tileOccupied', { tileId, buildingId });
        
        return true;
    }
    
    /**
     * タイルを解放
     */
    releaseTile(tileId: string, buildingId: string): boolean {
        const tile = this.getTile(tileId);
        if (!tile) return false;
        
        const index = tile.buildings.indexOf(buildingId);
        if (index > -1) {
            tile.buildings.splice(index, 1);
        }
        
        if (tile.buildings.length === 0) {
            tile.isOccupied = false;
        }
        
        this.emit('tileReleased', { tileId, buildingId });
        
        return true;
    }
    
    /**
     * 範囲内のタイルを取得
     */
    getTilesInRadius(center: BABYLON.Vector3, radius: number): PlanetTile[] {
        const tiles: PlanetTile[] = [];
        
        this.tiles.forEach(tile => {
            const distance = BABYLON.Vector3.Distance(center, tile.position);
            if (distance <= radius) {
                tiles.push(tile);
            }
        });
        
        return tiles;
    }
    
    /**
     * デバッグ表示の切り替え
     */
    setDebugEnabled(enabled: boolean): void {
        this.debugEnabled = enabled;
        
        if (enabled) {
            this.createDebugMeshes();
        } else {
            this.clearDebugMeshes();
        }
    }
    
    /**
     * デバッグメッシュを作成
     */
    private createDebugMeshes(): void {
        this.clearDebugMeshes();
        
        const material = new BABYLON.StandardMaterial('gridDebugMat', this.scene);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0);
        material.wireframe = true;
        material.alpha = 0.3;
        
        this.tiles.forEach(tile => {
            const box = BABYLON.MeshBuilder.CreateBox(`gridDebug_${tile.id}`, {
                size: this.tileSize * 0.9
            }, this.scene);
            
            box.position = tile.position;
            box.rotationQuaternion = tile.rotation;
            box.material = material;
            box.isPickable = false;
            
            this.debugMeshes.push(box);
        });
    }
    
    /**
     * デバッグメッシュをクリア
     */
    private clearDebugMeshes(): void {
        this.debugMeshes.forEach(mesh => mesh.dispose());
        this.debugMeshes = [];
    }
    
    /**
     * イベントリスナーの登録
     */
    on(event: string, handler: Function): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
    }
    
    /**
     * イベントの発火
     */
    private emit(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }
    
    /**
     * グリッド設定を更新
     */
    updateGridSettings(resolution: number, tileSize: number): void {
        this.gridResolution = resolution;
        this.tileSize = tileSize;
        
        // グリッドを再生成
        this.tiles.clear();
        this.generateGrid();
        
        if (this.debugEnabled) {
            this.createDebugMeshes();
        }
        
        console.log('[PLANET_GRID] Grid regenerated with', this.tiles.size, 'tiles');
    }
    
    /**
     * 統計情報を取得
     */
    getStats(): {
        totalTiles: number;
        occupiedTiles: number;
        buildings: number;
    } {
        let occupiedTiles = 0;
        let buildings = 0;
        
        this.tiles.forEach(tile => {
            if (tile.isOccupied) occupiedTiles++;
            buildings += tile.buildings.length;
        });
        
        return {
            totalTiles: this.tiles.size,
            occupiedTiles: occupiedTiles,
            buildings: buildings
        };
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        this.clearDebugMeshes();
        this.tiles.clear();
        this.eventHandlers.clear();
        
        console.log('[PLANET_GRID] Disposed');
    }
}