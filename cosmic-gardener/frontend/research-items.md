# 研究項目定義ファイル

このファイルを編集することで、ゲーム内の研究項目を追加・変更できます。
編集後、開発者が変更を反映させます。

## フォーマット説明

### カテゴリ定義
```yaml
category: カテゴリID
name: カテゴリ表示名
icon: 絵文字アイコン
description: カテゴリの説明
```

### 研究項目定義
```yaml
- id: 一意のID（英数字とアンダースコア）
  name: 研究項目名
  description: 研究の説明文
  category: 所属カテゴリID
  icon: 絵文字アイコン（オプション）
  cost:
    resource: コスト（数値）
  effects:
    - type: 効果タイプ
      value: 効果値
  requirements:
    - 前提条件の研究ID
  unlocks:
    - アンロックされる要素
```

---

## カテゴリ定義

### 基礎研究
```yaml
category: fundamental
name: 基礎研究
icon: ⚛️
description: 宇宙の基本法則と資源生成の研究
```

### 天体研究
```yaml
category: celestial
name: 天体研究
icon: 🌟
description: 天体の創造と進化に関する研究
```

### 生命研究
```yaml
category: life
name: 生命研究
icon: 🧬
description: 生命の誕生と進化に関する研究
```

### 技術研究
```yaml
category: technology
name: 技術研究
icon: 🔧
description: 効率化と自動化技術の研究
```

### 宇宙研究
```yaml
category: cosmic
name: 宇宙研究
icon: 🌌
description: 高度な宇宙現象と理論の研究
```

---

## 研究項目

### 基礎研究カテゴリ

```yaml
- id: enhanced_dust_generation
  name: 強化された塵生成
  description: 宇宙の塵の生成効率を2倍に向上させる
  category: fundamental
  icon: 💫
  cost:
    darkMatter: 1
  effects:
    - type: dust_generation_multiplier
      value: 2.0
  requirements: []
  unlocks: []

- id: advanced_energy_conversion
  name: 高度なエネルギー変換
  description: エネルギー変換効率を2倍に向上
  category: fundamental
  icon: ⚡
  cost:
    darkMatter: 2
  effects:
    - type: energy_conversion_multiplier
      value: 2.0
  requirements: []
  unlocks: []

- id: cosmic_dust_compression
  name: 宇宙塵圧縮技術
  description: 塵の保存効率を向上させ、最大保存量を10倍に
  category: fundamental
  icon: 🗜️
  cost:
    darkMatter: 3
  effects:
    - type: dust_storage_multiplier
      value: 10.0
  requirements:
    - enhanced_dust_generation
  unlocks: []

- id: quantum_resource_theory
  name: 量子資源理論
  description: すべての基本資源の生成量を1.5倍に
  category: fundamental
  icon: 🔬
  cost:
    darkMatter: 5
  effects:
    - type: all_resource_multiplier
      value: 1.5
  requirements:
    - enhanced_dust_generation
    - advanced_energy_conversion
  unlocks: []
```

### 天体研究カテゴリ

```yaml
- id: orbital_mechanics
  name: 軌道力学
  description: 衛星の作成をアンロック
  category: celestial
  icon: 🌙
  cost:
    darkMatter: 1
  effects:
    - type: unlock_celestial_body
      value: moon
  requirements: []
  unlocks:
    - moon

- id: dwarf_planet_science
  name: 準惑星学
  description: 準惑星の作成をアンロック
  category: celestial
  icon: 🪨
  cost:
    darkMatter: 2
  effects:
    - type: unlock_celestial_body
      value: dwarf_planet
  requirements:
    - orbital_mechanics
  unlocks:
    - dwarf_planet

- id: planetary_formation
  name: 惑星形成論
  description: 惑星の作成をアンロック
  category: celestial
  icon: 🪐
  cost:
    darkMatter: 3
  effects:
    - type: unlock_celestial_body
      value: planet
  requirements:
    - dwarf_planet_science
  unlocks:
    - planet

- id: stellar_genesis
  name: 恒星発生論
  description: 恒星の作成をアンロック
  category: celestial
  icon: ⭐
  cost:
    darkMatter: 5
  effects:
    - type: unlock_celestial_body
      value: star
  requirements:
    - planetary_formation
  unlocks:
    - star

- id: black_hole_theory
  name: ブラックホール理論
  description: ブラックホールの創造をアンロック
  category: celestial
  icon: 🕳️
  cost:
    darkMatter: 10
  effects:
    - type: unlock_celestial_body
      value: black_hole
  requirements:
    - stellar_genesis
  unlocks:
    - black_hole

- id: gravitational_mastery
  name: 重力制御
  description: 天体の軌道を自由に調整可能に
  category: celestial
  icon: 🎯
  cost:
    darkMatter: 8
  effects:
    - type: enable_orbit_control
      value: true
  requirements:
    - stellar_genesis
  unlocks: []
```

### 生命研究カテゴリ

```yaml
- id: primordial_soup
  name: 原始スープ
  description: 惑星での生命誕生確率を2倍に
  category: life
  icon: 🧪
  cost:
    darkMatter: 2
  effects:
    - type: life_spawn_chance_multiplier
      value: 2.0
  requirements: []
  unlocks: []

- id: evolutionary_acceleration
  name: 進化促進
  description: 生命の進化速度を3倍に加速
  category: life
  icon: 🧬
  cost:
    darkMatter: 3
  effects:
    - type: evolution_speed_multiplier
      value: 3.0
  requirements:
    - primordial_soup
  unlocks: []

- id: intelligent_life
  name: 知的生命体
  description: 知的生命体への進化をアンロック
  category: life
  icon: 🧠
  cost:
    darkMatter: 5
  effects:
    - type: unlock_life_stage
      value: intelligent
  requirements:
    - evolutionary_acceleration
  unlocks:
    - intelligent_life_stage

- id: galactic_civilization
  name: 銀河文明
  description: 文明が他の星系に拡張可能に
  category: life
  icon: 🚀
  cost:
    darkMatter: 10
  effects:
    - type: enable_interstellar_expansion
      value: true
  requirements:
    - intelligent_life
  unlocks: []

- id: bioengineering
  name: 生体工学
  description: 生命体から得られる資源を2倍に
  category: life
  icon: 🔬
  cost:
    darkMatter: 4
  effects:
    - type: bio_resource_multiplier
      value: 2.0
  requirements:
    - evolutionary_acceleration
  unlocks: []
```

### 技術研究カテゴリ

```yaml
- id: automation_basics
  name: 基礎自動化
  description: 資源収集の自動化を開始
  category: technology
  icon: 🤖
  cost:
    darkMatter: 3
  effects:
    - type: enable_automation
      value: basic
  requirements: []
  unlocks:
    - basic_automation

- id: time_acceleration_2x
  name: 時間加速 2x
  description: ゲーム速度を2倍に加速可能に
  category: technology
  icon: ⏩
  cost:
    thoughtPoints: 10
  effects:
    - type: unlock_time_multiplier
      value: 2
  requirements: []
  unlocks:
    - time_2x

- id: time_acceleration_5x
  name: 時間加速 5x
  description: ゲーム速度を5倍に加速可能に
  category: technology
  icon: ⏩
  cost:
    thoughtPoints: 50
  effects:
    - type: unlock_time_multiplier
      value: 5
  requirements:
    - time_acceleration_2x
  unlocks:
    - time_5x

- id: time_acceleration_10x
  name: 時間加速 10x
  description: ゲーム速度を10倍に加速可能に
  category: technology
  icon: ⏩
  cost:
    thoughtPoints: 100
  effects:
    - type: unlock_time_multiplier
      value: 10
  requirements:
    - time_acceleration_5x
  unlocks:
    - time_10x

- id: quantum_computing
  name: 量子コンピューティング
  description: 研究速度を5倍に加速
  category: technology
  icon: 💻
  cost:
    darkMatter: 7
  effects:
    - type: research_speed_multiplier
      value: 5.0
  requirements:
    - automation_basics
  unlocks: []

- id: dyson_sphere
  name: ダイソン球
  description: 恒星からエネルギーを直接収集
  category: technology
  icon: 🔆
  cost:
    darkMatter: 15
  effects:
    - type: enable_dyson_sphere
      value: true
  requirements:
    - quantum_computing
  unlocks:
    - dyson_sphere_construction
```

### 宇宙研究カテゴリ

```yaml
- id: dark_matter_manipulation
  name: ダークマター操作
  description: ダークマター生成量を3倍に
  category: cosmic
  icon: 🌑
  cost:
    darkMatter: 5
  effects:
    - type: dark_matter_generation_multiplier
      value: 3.0
  requirements: []
  unlocks: []

- id: wormhole_theory
  name: ワームホール理論
  description: 瞬間移動技術をアンロック
  category: cosmic
  icon: 🌀
  cost:
    darkMatter: 10
  effects:
    - type: enable_teleportation
      value: true
  requirements:
    - dark_matter_manipulation
  unlocks:
    - teleportation

- id: multiverse_theory
  name: 多元宇宙理論
  description: 並行宇宙へのアクセスを可能に
  category: cosmic
  icon: 🔮
  cost:
    darkMatter: 20
  effects:
    - type: unlock_multiverse
      value: true
  requirements:
    - wormhole_theory
  unlocks:
    - multiverse_access

- id: cosmic_consciousness
  name: 宇宙意識
  description: すべての知的生命体と接続
  category: cosmic
  icon: 🧘
  cost:
    thoughtPoints: 1000
  effects:
    - type: enable_cosmic_consciousness
      value: true
  requirements:
    - multiverse_theory
  unlocks: []

- id: reality_manipulation
  name: 現実操作
  description: 物理法則を部分的に書き換え可能に
  category: cosmic
  icon: ✨
  cost:
    darkMatter: 50
    thoughtPoints: 500
  effects:
    - type: enable_reality_manipulation
      value: true
  requirements:
    - cosmic_consciousness
  unlocks: []
```

---

## 編集ガイド

### 新しい研究を追加する場合

1. 適切なカテゴリセクションを見つける
2. 既存の研究項目をコピーして編集
3. 必ずユニークなIDを設定
4. コスト、効果、前提条件を適切に設定

### 効果タイプ一覧

- `dust_generation_multiplier`: 塵生成倍率
- `energy_conversion_multiplier`: エネルギー変換倍率
- `all_resource_multiplier`: 全資源倍率
- `unlock_celestial_body`: 天体アンロック
- `life_spawn_chance_multiplier`: 生命誕生確率倍率
- `evolution_speed_multiplier`: 進化速度倍率
- `unlock_life_stage`: 生命段階アンロック
- `enable_*`: 機能有効化
- `*_multiplier`: 各種倍率

### 注意事項

- IDは英数字とアンダースコアのみ使用
- コストは適切なバランスを考慮
- 前提条件は論理的な順序で設定
- 説明文は簡潔で分かりやすく