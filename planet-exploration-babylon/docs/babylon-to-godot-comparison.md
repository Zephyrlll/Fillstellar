# Babylon.js → Godot 移行対応表

## 基本概念の対応

### シーン・オブジェクト構造
| Babylon.js | Godot | 説明 |
|------------|-------|------|
| Scene | Scene (.tscn) | シーンファイル |
| Mesh | MeshInstance3D | 3Dメッシュ表示 |
| TransformNode | Node3D | 空間変換ノード |
| AbstractMesh | GeometryInstance3D | ジオメトリの基底 |
| Material | Material Resource | マテリアル |

### 数学・変換
| Babylon.js | Godot | 説明 |
|------------|-------|------|
| Vector3 | Vector3 | 3Dベクトル |
| Quaternion | Quaternion | 四元数 |
| Matrix | Transform3D | 変換行列 |
| Color3 | Color | 色表現 |

### 物理エンジン
| Babylon.js | Godot | 説明 |
|------------|-------|------|
| PhysicsImpostor | CollisionShape3D | 物理形状 |
| PhysicsEngine | PhysicsServer3D | 物理エンジン |
| PhysicsBody | RigidBody3D/CharacterBody3D | 物理ボディ |

### カメラ
| Babylon.js | Godot | 説明 |
|------------|-------|------|
| UniversalCamera | Camera3D | 基本カメラ |
| TargetCamera | Camera3D + スクリプト | ターゲット追従 |

## コード例の対応

### 球面移動の実装

**Babylon.js (TypeScript)**
```typescript
// 現在位置から中心へのベクトル
const fromCenter = currentPosition.subtract(this.planetCenter);
const normalizedPos = fromCenter.normalize();

// 接平面に投影
moveDirection = moveDirection.subtract(
    normalizedPos.scale(BABYLON.Vector3.Dot(moveDirection, normalizedPos))
);
```

**Godot (GDScript)**
```gdscript
# 現在位置から中心へのベクトル
var from_center = current_position - planet_center
var normalized_pos = from_center.normalized()

# 接平面に投影
move_direction = move_direction - normalized_pos * move_direction.dot(normalized_pos)
```

### イベントシステム

**Babylon.js**
```typescript
this.eventHandlers.get(event)?.forEach(handler => handler(data));
```

**Godot**
```gdscript
# シグナルの定義
signal moved(position, velocity)

# シグナルの発火
moved.emit(position, velocity)

# シグナルの接続
player.moved.connect(_on_player_moved)
```

### アニメーション

**Babylon.js**
```typescript
this.leftArm.rotation.x = BABYLON.Scalar.Lerp(
    this.leftArm.rotation.x, 
    targetRotation, 
    transition
);
```

**Godot**
```gdscript
# AnimationPlayerを使用
animation_player.play("walk")

# または手動補間
left_arm.rotation.x = lerp(
    left_arm.rotation.x,
    target_rotation,
    transition
)
```

### 物理処理

**Babylon.js**
```typescript
update(deltaTime: number): void {
    // 物理更新
    this.physicsEngine.step(deltaTime);
}
```

**Godot**
```gdscript
func _physics_process(delta):
    # 自動的に物理更新される
    move_and_slide()
```

## リソース管理

### Babylon.js
```typescript
// 動的ロード
BABYLON.SceneLoader.LoadAssetContainer(
    "models/", 
    "character.babylon", 
    scene, 
    (container) => { }
);
```

### Godot
```gdscript
# リソースのプリロード
@preload var character_scene = preload("res://scenes/character.tscn")

# または動的ロード
var character_scene = load("res://scenes/character.tscn")
var instance = character_scene.instantiate()
```

## パフォーマンス最適化

### Babylon.js
- LODシステム
- オクルージョンクエリ
- インスタンシング

### Godot
- LOD (Level of Detail)
- オクルージョンカリング
- MultiMeshInstance3D

## 主な利点

### Godotの利点
1. **統合エディタ**: シーン編集、スクリプト、デバッグが一体
2. **ノードシステム**: 直感的な階層構造
3. **ビルトイン物理**: 追加設定不要
4. **シグナル**: クリーンなイベントシステム

### 移行時の注意点
1. **GDScript学習**: Python風だが独自言語
2. **ノード思考**: コンポーネントではなくノードベース
3. **リソース形式**: .tscn/.tres形式への変換