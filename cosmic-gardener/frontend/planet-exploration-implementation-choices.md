# 🌍 惑星探索システム実装の選択肢

## 1. ページ構成の選択

### 🔷 Option A: シングルページ内でモード切替（推奨）
```typescript
// 同じページ内でcanvasの内容を切り替える
function switchToPlanetView(planet: CelestialBody) {
  gameState.currentMode = GameMode.PLANET_VIEW;
  gameState.exploringPlanet = planet;
  
  // 既存のsceneをクリア
  scene.clear();
  
  // 惑星探索用のsceneを構築
  initPlanetSurface(planet);
}
```

**メリット**:
- ✅ ゲーム状態の維持が簡単
- ✅ リソースの共有が容易
- ✅ シームレスな遷移体験
- ✅ 既存のWebSocketやsaveSystemをそのまま使える

**デメリット**:
- ❌ コードが複雑になる可能性
- ❌ メモリ管理に注意が必要

### 🔷 Option B: 別ページ（別HTML）として実装
```html
<!-- index.html (宇宙視点) -->
<a href="/planet-exploration.html?planetId=123">惑星を探索</a>

<!-- planet-exploration.html (新規作成) -->
<script>
  const planetId = new URLSearchParams(location.search).get('planetId');
  initPlanetExploration(planetId);
</script>
```

**メリット**:
- ✅ コードの分離が明確
- ✅ 独立した開発が可能
- ✅ パフォーマンス最適化しやすい

**デメリット**:
- ❌ ページ遷移でゲーム状態の受け渡しが複雑
- ❌ 音楽やWebSocketの再接続が必要
- ❌ セーブデータの同期が難しい

### 🔷 Option C: iframe内に埋め込み
```html
<div id="planet-exploration-container" style="display: none;">
  <iframe src="/planet-exploration.html"></iframe>
</div>
```

**メリット**:
- ✅ メインゲームと分離
- ✅ 段階的な実装が可能

**デメリット**:
- ❌ 通信オーバーヘッド
- ❌ レスポンシブ対応が困難

## 2. レンダリング方法の選択

### 🔷 Option A: 同じcanvasを再利用（推奨）
```typescript
// 既存のrenderer, camera, sceneを使い回す
const renderer = graphicsEngine.renderer; // 既存のものを使用
```

### 🔷 Option B: 新しいcanvasを作成
```typescript
const planetCanvas = document.createElement('canvas');
const planetRenderer = new THREE.WebGLRenderer({ canvas: planetCanvas });
```

### 🔷 Option C: 複数のビューポート
```typescript
// 画面分割して両方表示
renderer.setViewport(0, 0, width/2, height); // 宇宙視点
renderer.setViewport(width/2, 0, width/2, height); // 惑星視点
```

## 3. カメラ制御の選択

### 🔷 Option A: サードパーソンビュー（推奨）
```typescript
// キャラクターの後ろからカメラが追従
class ThirdPersonCamera {
  followTarget(player: Player, distance: number = 10) {
    const offset = player.getUpVector().multiplyScalar(distance);
    camera.position.copy(player.position).add(offset);
    camera.lookAt(player.position);
  }
}
```

### 🔷 Option B: ファーストパーソンビュー
```typescript
// プレイヤー視点
camera.position.copy(player.position);
camera.rotation.copy(player.rotation);
```

### 🔷 Option C: 切替可能
```typescript
// Vキーで視点切替
if (input.key === 'V') {
  cameraMode = cameraMode === 'first' ? 'third' : 'first';
}
```

## 4. 惑星表面の実装方法

### 🔷 Option A: 球体メッシュ + 高さマップ（推奨）
```typescript
// 球体の頂点を高さマップで変形
const geometry = new THREE.SphereGeometry(radius, 128, 128);
const heightMap = generatePerlinNoise();
// 頂点を法線方向に移動
```

### 🔷 Option B: 立方体マップ（Cube Map）
```typescript
// 6面の平面を球体に投影
const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
faces.forEach(face => generateTerrainFace(face));
```

### 🔷 Option C: LODシステム
```typescript
// 距離に応じて詳細度を変更
const lodLevels = [
  { distance: 100, segments: 32 },
  { distance: 500, segments: 16 },
  { distance: 1000, segments: 8 }
];
```

## 5. 移動システムの選択

### 🔷 Option A: 球面上の自由移動（推奨）
```typescript
// WASDで球面上を移動
class SphericalMovement {
  move(direction: Vector3) {
    // 現在位置での接平面上で移動
    const tangent = direction.cross(player.up);
    player.position.add(tangent.multiplyScalar(speed));
    // 球面に投影
    player.position.normalize().multiplyScalar(planetRadius);
  }
}
```

### 🔷 Option B: 固定パス移動
```typescript
// 決められた道に沿って移動
const paths = planet.getPaths();
player.moveAlongPath(paths[0]);
```

### 🔷 Option C: テレポート式
```typescript
// クリックした地点にテレポート
onMouseClick((point) => {
  player.position = point.projectOnSphere(planet);
});
```

## 6. データ管理の選択

### 🔷 Option A: 既存のgameStateを拡張（推奨）
```typescript
interface GameState {
  // 既存のプロパティ
  stars: CelestialBody[];
  
  // 新規追加
  planetExploration?: {
    currentPlanet: string;
    playerPosition: Vector3;
    discoveredResources: string[];
    builtStructures: Structure[];
  }
}
```

### 🔷 Option B: 別のStateを作成
```typescript
const planetState = {
  // 惑星探索専用の状態管理
};
```

### 🔷 Option C: IndexedDBで別管理
```typescript
// 大量のデータは別DBで管理
const planetDB = new PlanetDatabase();
```

## 7. 段階的実装の選択

### 🔷 Option A: MVP優先アプローチ（推奨）
```
Week 1: 基本的な球面移動
Week 2: リソース配置と採取
Week 3: 簡単な建築
Week 4: 宇宙視点との統合
```

### 🔷 Option B: 基盤優先アプローチ
```
Week 1-2: 完全な地形生成システム
Week 3-4: 物理エンジン実装
Week 5-6: ゲームメカニクス追加
```

### 🔷 Option C: プロトタイプ検証
```
Week 1: 別プロジェクトでプロトタイプ
Week 2: ユーザーテスト
Week 3-4: 本実装
```

## 8. パフォーマンス対策の選択

### 🔷 Option A: 視界カリング（推奨）
```typescript
// 見えない部分は描画しない
const frustum = new THREE.Frustum();
objects.forEach(obj => {
  if (frustum.containsPoint(obj.position)) {
    obj.visible = true;
  }
});
```

### 🔷 Option B: インスタンシング
```typescript
// 同じ建物は1つのジオメトリで描画
const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
```

### 🔷 Option C: Web Workers
```typescript
// 重い計算は別スレッドで
const worker = new Worker('terrain-generator.js');
worker.postMessage({ generate: 'terrain' });
```

## 📋 推奨される選択の組み合わせ

### 🎯 バランス重視の実装
1. **ページ構成**: シングルページ内でモード切替
2. **レンダリング**: 同じcanvasを再利用
3. **カメラ**: サードパーソンビュー（切替可能）
4. **惑星表面**: 球体メッシュ + 高さマップ
5. **移動**: 球面上の自由移動
6. **データ**: 既存gameStateを拡張
7. **実装**: MVP優先アプローチ
8. **パフォーマンス**: 視界カリング

この組み合わせなら、**既存システムとの統合が容易**で、**段階的に機能を追加**できます。