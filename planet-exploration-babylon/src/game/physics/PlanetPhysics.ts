import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Physics/physicsEngineComponent'; // Physics拡張をインポート

/**
 * 惑星の物理メッシュと衝突判定を管理
 * 責任:
 * - 物理メッシュの生成
 * - 衝突判定の設定
 * - 地形との相互作用
 */
export class PlanetPhysics {
    private scene: BABYLON.Scene;
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    private planetMesh: BABYLON.Mesh | null = null;
    private physicsAggregate: BABYLON.PhysicsAggregate | null = null;
    private physicsBody: BABYLON.PhysicsBody | null = null;
    
    // 物理設定
    private restitution: number = 0.1; // 反発係数
    private friction: number = 0.8;     // 摩擦係数
    
    constructor(scene: BABYLON.Scene, planetCenter: BABYLON.Vector3, planetRadius: number) {
        this.scene = scene;
        this.planetCenter = planetCenter;
        this.planetRadius = planetRadius;
    }
    
    /**
     * 惑星の物理メッシュを作成（Physics V2 API使用）
     */
    createPlanetPhysics(
        planetMesh: BABYLON.Mesh,
        radius: number,
        isStatic: boolean = true
    ): void {
        this.planetMesh = planetMesh;
        
        // 物理エンジンが有効か確認
        const physicsEngine = this.scene.getPhysicsEngine();
        if (!physicsEngine) {
            console.warn('[PLANET_PHYSICS] Physics engine not initialized, skipping physics body creation');
            return;
        }
        
        try {
            // Physics V2 API: PhysicsAggregateを使用
            this.physicsAggregate = new BABYLON.PhysicsAggregate(
                planetMesh,
                BABYLON.PhysicsShapeType.SPHERE,
                {
                    mass: isStatic ? 0 : 1000000, // 静的または非常に重い
                    restitution: this.restitution,
                    friction: this.friction
                },
                this.scene
            );
            
            // PhysicsBodyを取得
            this.physicsBody = this.physicsAggregate.body;
            
            // 静的オブジェクトの場合、モーションタイプを設定
            if (isStatic) {
                this.physicsBody.setMotionType(BABYLON.PhysicsMotionType.STATIC);
            }
            
            console.log('[PLANET_PHYSICS] Planet physics body created with V2 API', {
                radius: radius,
                isStatic: isStatic,
                friction: this.friction,
                restitution: this.restitution
            });
        } catch (error) {
            console.error('[PLANET_PHYSICS] Failed to create physics body:', error);
        }
    }
    
    /**
     * 地形の起伏を考慮した衝突メッシュを生成（将来実装）
     */
    createTerrainCollisionMesh(
        terrainData: Float32Array,
        subdivisions: number
    ): BABYLON.Mesh {
        // TODO: 地形データから詳細な衝突メッシュを生成
        // 現在は球体で代用
        console.log('[PLANET_PHYSICS] Terrain collision mesh creation (future implementation)');
        return this.planetMesh!;
    }
    
    /**
     * 物理パラメータの更新
     */
    updatePhysicsParameters(friction: number, restitution: number): void {
        this.friction = friction;
        this.restitution = restitution;
        
        if (this.physicsBody) {
            // Physics V2 APIでは、パラメータは再作成が必要な場合がある
            // 現時点では設定値を保持のみ
            console.log('[PLANET_PHYSICS] Physics parameters stored (will be applied on next creation):', {
                friction: friction,
                restitution: restitution
            });
        }
    }
    
    /**
     * 衝突イベントの設定（拡張用）
     */
    setupCollisionEvents(
        onCollideCallback: (event: BABYLON.IPhysicsCollisionEvent) => void
    ): void {
        if (this.physicsBody) {
            // Physics V2 APIでの衝突イベント設定
            this.physicsBody.setCollisionCallbackEnabled(true);
            const observable = this.physicsBody.getCollisionObservable();
            if (observable) {
                observable.add(onCollideCallback);
            }
        }
    }
    
    /**
     * 指定位置での地表の法線を取得
     */
    getSurfaceNormal(position: BABYLON.Vector3): BABYLON.Vector3 {
        // 基本実装：球体なので位置ベクトルが法線
        const center = this.planetMesh?.position || BABYLON.Vector3.Zero();
        return position.subtract(center).normalize();
    }
    
    /**
     * レイキャストで地表を検出
     */
    raycastToSurface(
        origin: BABYLON.Vector3,
        direction: BABYLON.Vector3
    ): BABYLON.PickingInfo | null {
        if (!this.planetMesh) return null;
        
        const ray = new BABYLON.Ray(origin, direction, 1000);
        const pickInfo = this.scene.pickWithRay(ray, (mesh) => mesh === this.planetMesh);
        
        return pickInfo;
    }
    
    /**
     * 物理メッシュの有効/無効切り替え
     */
    setEnabled(enabled: boolean): void {
        if (this.physicsBody) {
            this.physicsBody.setEnabled(enabled);
        }
    }
    
    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.physicsAggregate) {
            this.physicsAggregate.dispose();
            this.physicsAggregate = null;
            this.physicsBody = null;
        }
        
        console.log('[PLANET_PHYSICS] Disposed');
    }
    
    /**
     * デバッグ用：物理メッシュの可視化
     */
    showPhysicsImpostor(show: boolean): void {
        if (this.scene.getPhysicsEngine()) {
            const physicsViewer = this.scene.getPhysicsEngine()!.getPhysicsPlugin();
            // TODO: 物理デバッグ表示の実装
            console.log('[PLANET_PHYSICS] Physics debug display:', show);
        }
    }
}