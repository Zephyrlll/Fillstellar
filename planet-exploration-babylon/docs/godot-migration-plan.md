# Godot移行計画書

## 概要
Babylon.jsの球面移動実装での継続的な不安定性問題を受け、より安定した基盤であるGodot Engineへの移行を計画する。

## 移行理由
1. **安定性**: Godotの成熟した物理エンジン（Jolt Physics）
2. **球面処理**: 3D数学ライブラリが充実
3. **パフォーマンス**: ネイティブ実行による高速化
4. **開発効率**: 統合エディタとライブデバッグ
5. **完全無料**: MITライセンス、ロイヤリティなし

## 技術スタック移行
### 現在 (Babylon.js)
- Frontend: TypeScript + Babylon.js
- Physics: Havok
- Build: Vite
- Platform: Web (WebGL)

### 移行後 (Godot)
- Language: GDScript (Python風)
- Physics: Jolt Physics (Godot 4.3)
- Editor: Godot統合エディタ
- Platform: Windows/Mac/Linux/Web (WebGPU/WebGL)

## 移行フェーズ

### Phase 1: プロトタイプ検証 (1週間)
1. Godot 4.3インストールと環境構築
2. 球面移動プロトタイプの実装
3. 物理エンジンでの安定性検証
4. パフォーマンステスト

### Phase 2: コア機能移植 (2週間)
1. 惑星地形生成システム
2. キャラクター制御システム
3. カメラシステム（三人称/一人称）
4. 基本UI実装

### Phase 3: ゲームシステム移植 (3週間)
1. 資源システム（6種類の基本資源）
2. 天体管理システム
3. 物理演算（N体問題）
4. セーブ/ロードシステム

### Phase 4: 拡張機能実装 (2週間)
1. マルチプレイヤー対応準備
2. モバイル対応
3. パフォーマンス最適化
4. エフェクトシステム

## 技術的課題と解決策

### 1. 球面移動の実装
```gdscript
# Godotでの球面移動サンプル
extends CharacterBody3D

var planet_center = Vector3.ZERO
var planet_radius = 100.0
var move_speed = 5.0

func _physics_process(delta):
    # 重力方向を計算
    var up = (global_position - planet_center).normalized()
    
    # 接平面での移動
    var input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var move_dir = transform.basis * Vector3(input.x, 0, input.y)
    
    # 球面に沿った移動
    velocity = move_dir * move_speed
    move_and_slide()
    
    # 高さを維持
    global_position = planet_center + up * planet_radius
```

### 2. マルチプレイヤー対応
- Godotの高レベルマルチプレイヤーAPI使用
- 絶対座標系維持で同期が容易

### 3. Webエクスポート
- Godot 4.3のWeb export改善により安定動作
- WebGPU対応で高パフォーマンス

## リスクと対策
1. **学習コスト**: GDScriptチュートリアル準備
2. **既存資産**: Babylon.js資産の段階的移行
3. **Web制限**: プログレッシブWebアプリ対応

## スケジュール
- Week 1: プロトタイプ完成
- Week 2-3: コア機能移植
- Week 4-6: ゲームシステム移植
- Week 7-8: 拡張機能とポリッシュ

## 成功指標
1. 球面移動の安定性（ジッター、スタックなし）
2. 60FPS維持
3. 極付近での正常動作
4. マルチプレイヤー対応可能な設計

## 次のステップ
1. Godot 4.3.2のダウンロードとインストール
2. 球面移動プロトタイプの作成
3. パフォーマンステストの実施