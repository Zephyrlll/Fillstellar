# 🌍 惑星探索システム

## 概要
プレイヤーが所有する惑星に降り立ち、表面を探索・開発できるシステムです。

## ディレクトリ構造
```
planetExploration/
├── core/                      # コアシステム
│   ├── PlanetExplorationManager.ts
│   ├── PlanetSurface.ts
│   ├── PlayerController.ts
│   └── CameraController.ts
├── terrain/                   # 地形関連
│   ├── TerrainGenerator.ts
│   ├── TerrainChunk.ts
│   └── Biome.ts
├── resources/                 # 資源システム
│   ├── ResourceNode.ts
│   └── ResourceSpawner.ts
├── structures/                # 建造物
│   ├── Structure.ts
│   ├── MiningFacility.ts
│   └── BuildingManager.ts
├── physics/                   # 物理演算
│   ├── SphericalMovement.ts
│   └── Gravity.ts
├── ui/                        # UI関連
│   ├── PlanetExplorationUI.ts
│   ├── BuildMenu.ts
│   └── Minimap.ts
└── utils/                     # ユーティリティ
    ├── SphericalCoordinates.ts
    └── PlanetMath.ts
```

## 開発スケジュール
- **Phase 1（Week 1）**: 基本的な惑星歩行システム
- **Phase 2（Week 2）**: 資源採取とUI
- **Phase 3（Week 3）**: 建築システム
- **Phase 4（Week 4）**: 統合と最適化

## 使用方法

### 惑星探索モードへの切り替え
```typescript
import { PlanetExplorationManager } from './planetExploration/core/PlanetExplorationManager';

const explorationManager = PlanetExplorationManager.getInstance();

// 惑星をクリックしたときの処理
function onPlanetClick(planet: CelestialBody) {
  if (planet.userData.isOwned) {
    explorationManager.enterPlanetExploration(planet);
  }
}
```

### 宇宙視点への復帰
```typescript
// Escキーまたは「宇宙に戻る」ボタン
explorationManager.exitPlanetExploration();
```

## 主要クラス

### PlanetExplorationManager
惑星探索システム全体を管理するシングルトンクラス。

### PlayerController
プレイヤーの移動と入力を処理。球面上での移動を実現。

### PlanetSurface
惑星表面の地形生成と管理。Perlinノイズを使用した地形生成。

### ResourceNode
採取可能な資源ノード。位置、種類、量を管理。

### Structure
建造物の基底クラス。採掘施設などが継承。

## 技術仕様
- **レンダリング**: Three.js（既存のrendererを再利用）
- **物理演算**: カスタム球面物理
- **地形生成**: Perlinノイズ
- **LOD**: 距離に応じた詳細度調整

## パフォーマンス目標
- 60 FPS維持（中程度のスペックPC）
- メモリ使用量: +200MB以下
- 初期ロード時間: 3秒以内

## 拡張予定
- マルチプレイヤー対応
- より複雑な地形（洞窟、山脈）
- 天候システム
- 昼夜サイクル
- 野生生物