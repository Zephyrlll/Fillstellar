# 🌍 惑星探索システム設計書

## 1. システム概要

### 1.1 目的
プレイヤーが所有する惑星に降り立ち、惑星表面を探索・開発できるシステムを実装する。

### 1.2 コンセプト
- 宇宙視点（マクロ）から惑星探索（ミクロ）への視点切り替え
- 球体表面を自由に歩き回れる3D探索
- 資源採取と施設建設による惑星開発

## 2. 技術仕様

### 2.1 基本アーキテクチャ
```typescript
// ゲームモードの定義
enum GameMode {
  SPACE_VIEW = "space",      // 従来の宇宙俯瞰モード
  PLANET_SURFACE = "planet"  // 新規：惑星探索モード
}

// 惑星探索の状態管理
interface PlanetExplorationState {
  currentMode: GameMode;
  exploringPlanet: CelestialBody | null;
  player: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    inventory: ResourceInventory;
  };
  discoveredLocations: DiscoveredLocation[];
  builtStructures: Structure[];
}
```

### 2.2 コンポーネント構成

#### Core Components
```
planetExploration/
├── PlanetExplorationManager.ts  // メインマネージャー
├── PlanetSurface.ts            // 惑星表面の生成・管理
├── PlayerController.ts         // プレイヤーの移動制御
├── CameraController.ts         // カメラ制御
├── ResourceNode.ts             // 資源ノードの実装
├── Structure.ts                // 建造物の基底クラス
└── PlanetExplorationUI.ts     // 探索モード専用UI
```

#### Support Components
```
├── terrain/
│   ├── TerrainGenerator.ts    // 地形生成
│   ├── TerrainChunk.ts        // 地形のチャンク管理
│   └── Biome.ts               // バイオーム定義
├── physics/
│   ├── SphericalMovement.ts   // 球面上の移動物理
│   └── Gravity.ts             // 重力システム
└── utils/
    ├── SphericalCoordinates.ts // 球面座標系
    └── PlanetMath.ts          // 惑星関連の数学関数
```

## 3. 主要機能仕様

### 3.1 モード切り替え
```typescript
class PlanetExplorationManager {
  // 惑星探索モードへの切り替え
  enterPlanetExploration(planet: CelestialBody): void {
    // 1. 現在の宇宙視点の状態を保存
    this.saveSpaceViewState();
    
    // 2. シーンをクリア
    this.clearScene();
    
    // 3. 惑星表面を生成
    this.generatePlanetSurface(planet);
    
    // 4. プレイヤーを配置
    this.spawnPlayer();
    
    // 5. UIを切り替え
    this.switchToExplorationUI();
    
    // 6. モードを更新
    gameState.currentMode = GameMode.PLANET_SURFACE;
  }
  
  // 宇宙視点への復帰
  exitPlanetExploration(): void {
    // 1. 探索状態を保存
    this.saveExplorationState();
    
    // 2. 宇宙視点を復元
    this.restoreSpaceView();
    
    // 3. モードを更新
    gameState.currentMode = GameMode.SPACE_VIEW;
  }
}
```

### 3.2 惑星表面生成
```typescript
class PlanetSurface {
  private radius: number;
  private mesh: THREE.Mesh;
  private heightMap: Float32Array;
  
  generate(planet: CelestialBody): void {
    // 1. 基本球体ジオメトリ作成
    const geometry = new THREE.SphereGeometry(
      this.radius, 
      128, // セグメント数（詳細度）
      128
    );
    
    // 2. 高さマップ生成（Perlinノイズ）
    this.heightMap = this.generateHeightMap(planet.seed);
    
    // 3. 頂点を高さマップに基づいて変形
    this.applyHeightMap(geometry);
    
    // 4. テクスチャ適用
    const material = this.createPlanetMaterial(planet.type);
    
    // 5. メッシュ作成
    this.mesh = new THREE.Mesh(geometry, material);
  }
}
```

### 3.3 プレイヤー制御
```typescript
class PlayerController {
  private position: THREE.Vector3;
  private quaternion: THREE.Quaternion;
  private speed: number = 5.0; // units per second
  
  update(deltaTime: number, input: InputState): void {
    // 1. 入力を取得
    const movement = this.getMovementVector(input);
    
    // 2. 現在位置での接平面を計算
    const up = this.position.clone().normalize();
    const forward = this.getForwardVector();
    const right = forward.clone().cross(up);
    
    // 3. 移動ベクトルを計算
    const moveVector = new THREE.Vector3()
      .addScaledVector(forward, movement.z)
      .addScaledVector(right, movement.x);
    
    // 4. 位置を更新
    this.position.add(moveVector.multiplyScalar(this.speed * deltaTime));
    
    // 5. 球面に投影（重力）
    this.position.normalize().multiplyScalar(this.planetRadius);
    
    // 6. 向きを更新
    this.updateOrientation(up);
  }
}
```

### 3.4 資源ノード
```typescript
class ResourceNode {
  type: ResourceType;
  amount: number;
  quality: QualityTier;
  position: THREE.Vector3;
  respawnTime: number;
  
  // 採取処理
  harvest(player: Player): HarvestResult {
    if (this.canHarvest()) {
      const harvestedAmount = this.calculateHarvestAmount(player.tools);
      this.amount -= harvestedAmount;
      this.lastHarvestTime = Date.now();
      
      return {
        resource: this.type,
        amount: harvestedAmount,
        quality: this.quality
      };
    }
  }
}
```

### 3.5 建造物システム
```typescript
abstract class Structure {
  id: string;
  type: StructureType;
  position: THREE.Vector3;
  orientation: THREE.Quaternion;
  level: number;
  
  abstract update(deltaTime: number): void;
  abstract getProductionRate(): ProductionRate;
}

class MiningFacility extends Structure {
  private nearbyResources: ResourceNode[];
  
  update(deltaTime: number): void {
    // 周囲の資源を自動採取
    this.nearbyResources.forEach(node => {
      if (node.canHarvest()) {
        const result = node.harvest(this);
        this.storeResource(result);
      }
    });
  }
}
```

## 4. UI仕様

### 4.1 探索モードUI
```html
<!-- 探索モード専用UI -->
<div id="exploration-ui" style="display: none;">
  <!-- 上部：ステータスバー -->
  <div class="exploration-status-bar">
    <div class="planet-name">惑星: アルファ・ケンタウリb</div>
    <div class="coordinates">座標: (θ: 45°, φ: 120°)</div>
    <button class="return-to-space">宇宙に戻る</button>
  </div>
  
  <!-- 左下：ミニマップ -->
  <div class="planet-minimap">
    <canvas id="minimap-canvas"></canvas>
  </div>
  
  <!-- 右下：インベントリ -->
  <div class="exploration-inventory">
    <div class="resource-slot" data-resource="cosmicDust">
      <img src="/icon/cosmic-dust.png">
      <span class="amount">0</span>
    </div>
  </div>
  
  <!-- 中央下：アクションバー -->
  <div class="action-bar">
    <button class="action-btn" data-action="harvest">採取 [E]</button>
    <button class="action-btn" data-action="build">建設 [B]</button>
    <button class="action-btn" data-action="scan">スキャン [Q]</button>
  </div>
</div>
```

### 4.2 建設メニュー
```typescript
class BuildMenu {
  private availableStructures: StructureType[];
  
  show(): void {
    // 建設可能な施設リストを表示
    this.availableStructures.forEach(structure => {
      const canBuild = this.checkRequirements(structure);
      this.renderStructureOption(structure, canBuild);
    });
  }
}
```

## 5. データ構造

### 5.1 GameStateの拡張
```typescript
// 既存のGameStateインターフェースを拡張
interface GameState {
  // 既存のプロパティ...
  
  // 惑星探索関連の追加
  planetExploration?: {
    isActive: boolean;
    currentPlanet: string; // 惑星ID
    player: {
      position: [number, number, number]; // 座標
      rotation: [number, number, number]; // 回転
      inventory: Record<ResourceType, number>;
    };
    discoveries: {
      locations: DiscoveredLocation[];
      resources: string[]; // 発見した資源ノードID
    };
    structures: BuiltStructure[];
  };
}
```

### 5.2 セーブデータ対応
```typescript
// セーブ時
function savePlanetExploration(): PlanetExplorationSaveData {
  return {
    version: "1.0",
    planets: gameState.stars
      .filter(star => star.userData.hasExplorationData)
      .map(planet => ({
        id: planet.userData.id,
        explorationData: planet.userData.explorationData
      }))
  };
}

// ロード時
function loadPlanetExploration(data: PlanetExplorationSaveData): void {
  data.planets.forEach(planetData => {
    const planet = gameState.stars.find(s => s.userData.id === planetData.id);
    if (planet) {
      planet.userData.explorationData = planetData.explorationData;
    }
  });
}
```

## 6. パフォーマンス最適化

### 6.1 視界カリング
```typescript
class VisibilityCulling {
  update(camera: THREE.Camera, objects: THREE.Object3D[]): void {
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix, 
        camera.matrixWorldInverse
      )
    );
    
    objects.forEach(obj => {
      obj.visible = frustum.intersectsObject(obj);
    });
  }
}
```

### 6.2 LODシステム
```typescript
class PlanetLOD {
  private levels = [
    { distance: 50, segments: 128 },   // 近距離：高詳細
    { distance: 200, segments: 64 },   // 中距離：中詳細
    { distance: 500, segments: 32 }    // 遠距離：低詳細
  ];
  
  updateLOD(viewerPosition: THREE.Vector3): void {
    const distance = viewerPosition.length();
    const level = this.levels.find(l => distance < l.distance);
    if (level && level.segments !== this.currentSegments) {
      this.regenerateMesh(level.segments);
    }
  }
}
```

## 7. 拡張性の考慮

### 7.1 プラグインシステム
```typescript
interface ExplorationPlugin {
  id: string;
  onEnterPlanet?(planet: CelestialBody): void;
  onExitPlanet?(): void;
  onUpdate?(deltaTime: number): void;
  onHarvest?(node: ResourceNode): void;
  onBuild?(structure: Structure): void;
}

// 将来の機能追加用
class ExplorationPluginManager {
  plugins: ExplorationPlugin[] = [];
  
  register(plugin: ExplorationPlugin): void {
    this.plugins.push(plugin);
  }
}
```

### 7.2 イベントシステム
```typescript
// 探索イベント
enum ExplorationEvent {
  RESOURCE_DISCOVERED = "resource_discovered",
  STRUCTURE_BUILT = "structure_built",
  AREA_EXPLORED = "area_explored",
  ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
}

// イベント発火
eventBus.emit(ExplorationEvent.RESOURCE_DISCOVERED, {
  resource: ResourceType.RARE_METAL,
  location: player.position,
  amount: 1000
});
```