import * as BABYLON from '@babylonjs/core';

/**
 * 惑星表面での重力方向を管理するコントローラー
 * 責任:
 * - 位置に応じた重力方向の計算
 * - 物理エンジンへの重力適用
 * - デバッグ表示
 */
export class GravityController {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    private gravityStrength: number;
    private scene: BABYLON.Scene;
    
    // デバッグ用
    private debugEnabled: boolean = false;
    private debugArrow: BABYLON.Mesh | null = null;
    
    // イベントシステム（拡張性のため）
    private eventHandlers: Map<string, Function[]> = new Map();
    
    constructor(
        scene: BABYLON.Scene,
        planetCenter: BABYLON.Vector3,
        planetRadius: number,
        gravityStrength: number = 9.81
    ) {
        this.scene = scene;
        this.planetCenter = planetCenter;
        this.planetRadius = planetRadius;
        this.gravityStrength = gravityStrength;
        
        console.log('[GRAVITY] GravityController initialized:', {
            center: planetCenter,
            radius: planetRadius,
            strength: gravityStrength
        });
    }
    
    /**
     * 指定位置での重力方向を計算（単位ベクトル）
     */
    getGravityDirection(position: BABYLON.Vector3): BABYLON.Vector3 {
        // 惑星中心に向かう方向
        const toCenter = this.planetCenter.subtract(position);
        if (toCenter.length() < 0.001) {
            // 原点に近すぎる場合のフォールバック
            return BABYLON.Vector3.Down();
        }
        return toCenter.normalize();
    }
    
    /**
     * 指定位置での「上」方向を計算（重力の逆方向）
     */
    getUpDirection(position: BABYLON.Vector3): BABYLON.Vector3 {
        return this.getGravityDirection(position).scale(-1);
    }
    
    /**
     * 物理エンジンの重力を更新
     */
    updatePhysicsGravity(position: BABYLON.Vector3): void {
        const physicsEngine = this.scene.getPhysicsEngine();
        if (!physicsEngine) {
            console.warn('[GRAVITY] Physics engine not enabled');
            return;
        }
        
        // 重力ベクトルを計算
        const gravityDirection = this.getGravityDirection(position);
        const gravityVector = gravityDirection.scale(this.gravityStrength);
        
        // 物理エンジンに適用
        physicsEngine.setGravity(gravityVector);
        
        // デバッグ表示を更新
        if (this.debugEnabled) {
            this.updateDebugDisplay(position, gravityDirection);
        }
        
        // イベント発火（拡張用）
        this.emit('gravityUpdated', { position, direction: gravityDirection });
    }
    
    /**
     * 地表からの高さを計算
     */
    getAltitude(position: BABYLON.Vector3): number {
        const distance = BABYLON.Vector3.Distance(position, this.planetCenter);
        return distance - this.planetRadius;
    }
    
    /**
     * 位置を地表に投影
     */
    projectToSurface(position: BABYLON.Vector3): BABYLON.Vector3 {
        const direction = position.subtract(this.planetCenter).normalize();
        return this.planetCenter.add(direction.scale(this.planetRadius));
    }
    
    /**
     * デバッグ表示の切り替え
     */
    setDebugEnabled(enabled: boolean): void {
        this.debugEnabled = enabled;
        
        if (!enabled && this.debugArrow) {
            this.debugArrow.dispose();
            this.debugArrow = null;
        }
    }
    
    /**
     * デバッグ表示を更新
     */
    private updateDebugDisplay(position: BABYLON.Vector3, gravityDirection: BABYLON.Vector3): void {
        if (!this.debugArrow) {
            // 矢印を作成
            this.debugArrow = BABYLON.MeshBuilder.CreateCylinder('gravityArrow', {
                height: 5,
                diameterTop: 0,
                diameterBottom: 1
            }, this.scene);
            
            const material = new BABYLON.StandardMaterial('gravityArrowMat', this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
            this.debugArrow.material = material;
        }
        
        // 位置と向きを更新
        this.debugArrow.position = position.add(gravityDirection.scale(-3));
        this.debugArrow.lookAt(position.add(gravityDirection.scale(2)));
    }
    
    /**
     * イベントリスナーの登録（拡張性のため）
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
     * 惑星データの更新（動的な変更に対応）
     */
    updatePlanetData(center: BABYLON.Vector3, radius: number): void {
        this.planetCenter = center;
        this.planetRadius = radius;
        
        console.log('[GRAVITY] Planet data updated:', {
            center: center,
            radius: radius
        });
        
        this.emit('planetDataUpdated', { center, radius });
    }
    
    /**
     * 重力の強さを変更
     */
    setGravityStrength(strength: number): void {
        this.gravityStrength = strength;
        console.log('[GRAVITY] Gravity strength updated:', strength);
    }
    
    /**
     * 現在の設定を取得
     */
    getConfig(): {
        planetCenter: BABYLON.Vector3;
        planetRadius: number;
        gravityStrength: number;
    } {
        return {
            planetCenter: this.planetCenter.clone(),
            planetRadius: this.planetRadius,
            gravityStrength: this.gravityStrength
        };
    }
    
    /**
     * 惑星の半径を取得
     */
    getPlanetRadius(): number {
        return this.planetRadius;
    }
}