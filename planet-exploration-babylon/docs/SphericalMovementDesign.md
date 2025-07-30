# 球面移動システム設計書

## 1. 現在のシステムの問題分析

### 1.1 技術的な問題
- **複雑すぎる数学**: 球面座標、クォータニオン、接平面投影を同時に使用
- **デバッグ困難**: 多層の変換により問題の特定が困難
- **不安定な計算**: 極点や特異点での数値誤差
- **カメラとの競合**: 移動システムとカメラシステムが独立して動作

### 1.2 設計上の問題
- **責任の分散**: 移動ロジックが複数のクラスに散らばっている
- **状態管理の欠如**: 現在の向きや移動状態の追跡が不十分
- **テスト不可能**: 単体テストできない構造
- **拡張性の欠如**: 新機能（建築システム等）の追加が困難

## 2. 新システムの設計方針

### 2.1 基本原則
1. **シンプルさ優先**: 複雑な数学は最小限に
2. **責任の明確化**: 各クラスの役割を明確に分離
3. **テスト可能性**: 各機能を独立してテスト可能に
4. **拡張性**: 将来の機能追加を見越した設計
5. **デバッグ容易性**: 問題の特定と修正が簡単に

### 2.2 技術選択
- **Babylon.js物理エンジン**: 手動実装ではなく実績のあるエンジンを使用
- **重力ベース移動**: 球面移動ではなく重力方向の動的変更
- **グリッドシステム**: 建築システムを見越したタイル分割
- **状態管理**: 明確な状態遷移とデータフロー

## 3. システムアーキテクチャ

### 3.1 コンポーネント構成
```
PlanetMovementSystem
├── GravityController      # 重力方向の管理
├── PhysicsCharacter      # 物理ベースのキャラクター制御
├── CameraController      # カメラの制御
├── GridSystem           # 惑星表面のグリッド管理
└── BuildingPlacement    # 建築物配置（将来実装）
```

### 3.2 データフロー
```
Input → PhysicsCharacter → Physics Engine → Position Update
  ↓
GravityController → Update Gravity Direction
  ↓
CameraController → Update Camera Position/Rotation
```

## 4. 詳細設計

### 4.1 GravityController
**責任**: 惑星表面での重力方向を計算・管理

```typescript
class GravityController {
    private planetCenter: BABYLON.Vector3;
    private planetRadius: number;
    
    // 指定位置での重力方向を計算
    getGravityDirection(position: BABYLON.Vector3): BABYLON.Vector3
    
    // 指定位置での「上」方向を計算
    getUpDirection(position: BABYLON.Vector3): BABYLON.Vector3
    
    // 物理エンジンの重力を更新
    updatePhysicsGravity(scene: BABYLON.Scene, position: BABYLON.Vector3): void
}
```

### 4.2 PhysicsCharacter
**責任**: キャラクターの物理的な動作制御

```typescript
class PhysicsCharacter {
    private character: BABYLON.Mesh;
    private physicsImpostor: BABYLON.PhysicsImpostor;
    private gravityController: GravityController;
    
    // 移動入力を処理
    handleMovementInput(input: MovementInput): void
    
    // ジャンプを実行
    jump(): void
    
    // 地面との接触判定
    isGrounded(): boolean
    
    // キャラクターの向きを重力に合わせて調整
    alignToGravity(): void
}
```

### 4.3 CameraController
**責任**: カメラの位置と向きの制御

```typescript
class CameraController {
    private camera: BABYLON.UniversalCamera;
    private target: BABYLON.TransformNode;
    private gravityController: GravityController;
    
    // カメラ位置を更新
    updatePosition(): void
    
    // 重力に応じてカメラの上方向を調整
    updateUpVector(): void
    
    // マウス入力を処理
    handleMouseInput(deltaX: number, deltaY: number): void
}
```

### 4.4 GridSystem（将来実装）
**責任**: 惑星表面のタイル管理

```typescript
class GridSystem {
    private tiles: Map<string, PlanetTile>;
    
    // 座標からタイルIDを取得
    getTileId(position: BABYLON.Vector3): string
    
    // タイル情報を取得
    getTile(tileId: string): PlanetTile
    
    // 建築可能な位置を取得
    getBuildablePositions(tileId: string): BABYLON.Vector3[]
}
```

## 5. 実装計画

### Phase 1: 基盤システム (1-2日)
1. GravityControllerの実装
2. 既存システムからの移行準備
3. 基本的な物理設定

### Phase 2: キャラクター制御 (2-3日)
1. PhysicsCharacterの実装
2. 基本的な移動・ジャンプ機能
3. 重力との連携

### Phase 3: カメラシステム (1-2日)
1. CameraControllerの実装
2. 重力に応じた上方向調整
3. スムーズな追従

### Phase 4: テストとデバッグ (1-2日)
1. 各コンポーネントの単体テスト
2. 統合テスト
3. パフォーマンステスト

### Phase 5: グリッドシステム（将来）
1. 惑星表面のタイル分割
2. 建築システムの基盤準備

## 6. 成功指標

### 6.1 機能的指標
- [ ] 惑星の全表面を移動可能
- [ ] 赤道越えがスムーズ
- [ ] カメラが常に適切な向きを維持
- [ ] 60fps以上のパフォーマンス維持

### 6.2 技術的指標
- [ ] 各クラスが単体テスト可能
- [ ] デバッグ情報が分かりやすい
- [ ] 新機能の追加が容易
- [ ] コードの可読性が高い

## 7. リスク管理

### 7.1 技術的リスク
- **物理エンジンの制約**: Babylon.js物理エンジンの動的重力対応
  - **対策**: 事前検証とフォールバック実装
- **パフォーマンス**: 重力の頻繁な更新による負荷
  - **対策**: 更新頻度の最適化とプロファイリング

### 7.2 スケジュールリスク
- **想定以上の複雑さ**: 物理エンジンとの統合が困難
  - **対策**: 早期プロトタイプによる検証

## 8. 参考実装例

### 8.1 他ゲームでの実装方法
- **Super Mario Galaxy**: 重力方向の動的変更
- **No Man's Sky**: シームレスな惑星表面移動
- **Kerbal Space Program**: 物理ベースの宇宙移動

### 8.2 Babylon.jsでの実装例
- 物理エンジンの動的重力設定
- TransformNodeによる座標系管理
- ImpostorBaseの活用

## 9. まとめ

この設計書に従って実装することで：
- **安定性**: 実績のある技術の活用
- **保守性**: 明確な責任分離とテスト可能性
- **拡張性**: 将来の機能追加への対応
- **デバッグ性**: 問題の特定と修正の容易さ

を実現し、今回のような複雑化と不安定化を避けることができます。