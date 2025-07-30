# Godotプロジェクト構造

## ディレクトリ構成
```
fillstellar-godot/
├── project.godot              # プロジェクト設定
├── scenes/                    # シーンファイル
│   ├── main.tscn             # メインシーン
│   ├── player/               # プレイヤー関連
│   │   ├── player.tscn       # プレイヤーシーン
│   │   └── player.gd         # プレイヤースクリプト
│   ├── planets/              # 惑星関連
│   │   ├── planet.tscn       # 惑星シーン
│   │   └── planet.gd         # 惑星スクリプト
│   └── ui/                   # UI関連
│       ├── hud.tscn          # HUD
│       └── menus/            # メニュー
├── scripts/                  # 共有スクリプト
│   ├── spherical_movement.gd # 球面移動システム
│   ├── gravity_controller.gd # 重力制御
│   └── resource_system.gd    # 資源システム
├── assets/                   # アセット
│   ├── models/              # 3Dモデル
│   ├── textures/            # テクスチャ
│   ├── sounds/              # サウンド
│   └── shaders/             # シェーダー
└── addons/                  # プラグイン
    └── multiplayer/         # マルチプレイヤー
```

## 主要コンポーネント

### 1. Player (player.gd)
```gdscript
extends CharacterBody3D
class_name Player

# 球面移動コンポーネント
@onready var spherical_movement = $SphericalMovement
@onready var animation_player = $AnimationPlayer
@onready var mesh = $Mesh

signal moved(position, velocity)
signal jumped()
signal landed()
```

### 2. Planet (planet.gd)
```gdscript
extends StaticBody3D
class_name Planet

@export var radius: float = 100.0
@export var gravity_strength: float = 9.81

# 地形生成
var terrain_generator: TerrainGenerator

func _ready():
    generate_terrain()
```

### 3. Resource System
```gdscript
extends Node
class_name ResourceSystem

enum ResourceType {
    COSMIC_DUST,
    ENERGY,
    ORGANIC_MATTER,
    BIOMASS,
    DARK_MATTER,
    THOUGHT_POINTS
}

var resources: Dictionary = {}
```

## シーン構成例

### Main.tscn
```
Main (Node3D)
├── Planet (StaticBody3D)
│   ├── CollisionShape3D
│   ├── MeshInstance3D
│   └── TerrainGenerator
├── Player (CharacterBody3D)
│   ├── CollisionShape3D
│   ├── MeshInstance3D
│   ├── CameraPivot
│   │   └── Camera3D
│   └── SphericalMovement
├── DirectionalLight3D
├── WorldEnvironment
└── UI (CanvasLayer)
    └── HUD
```

## 移行時の注意点

1. **ノードベース**: Godotはノードベースなので、コンポーネントシステムとは異なる
2. **シグナル**: イベントシステムはシグナルを使用
3. **リソース**: .tres/.res形式でデータを保存
4. **インポート設定**: 3Dモデルのインポート時に最適化設定