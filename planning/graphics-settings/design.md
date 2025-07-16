# グラフィックス設定機能 設計書

## 1. 概要

本ドキュメントは、ゲームのグラフィックス設定機能に関する設計を定義する。
この機能の主な目的は、プレイヤーが自身のPCスペックに応じてグラフィックス品質とパフォーマンスのバランスを調整できるようにし、低スペックな環境でも快適なプレイ体験を提供することである。

## 2. 設計方針

- **包括的な設定項目**: プレイヤーが細かな調整を行えるよう、多様なグラフィックス設定項目を提供する。
- **設定プリセット**: 「ultra」「high」「medium」「low」「minimal」のプリセットを用意し、専門知識がないプレイヤーでも簡単に最適な設定を選択できるようにする。
- **自動検出機能**: プレイヤーのデバイススペックを自動検出し、最適なプリセットを推奨する。
- **リアルタイム調整**: 設定変更を即座にゲームに反映し、プレイヤーが効果を確認しながら調整できるようにする。
- **パフォーマンス指標表示**: 現在のFPSやGPU使用率を表示し、プレイヤーが設定の効果を把握できるようにする。
 - **動的品質調整 (Dynamic Quality Scaling)**: フレームレート低下時に解像度やエフェクト品質を自動で調整し、快適なパフォーマンスを維持する。
 - **設定エクスポート/インポート**: カスタムプリセットをファイルや短縮URLでエクスポートとインポートし、他のプレイヤーと共有可能にする。
 - **アクセシビリティ対応**: キーボード操作やスクリーンリーダー、ハイコントラストモード等で利用しやすいUIを提供する。
 - **画面モード設定**: フルスクリーン／ウィンドウモード切替、ディスプレイ解像度プリセットをサポートし、環境に応じた最適表示を選択できるようにする。

## 3. 設定項目一覧

以下の設定項目を実装する。

| 設定項目 | 説明 | 選択肢/範囲 (UI表示) | 実装対象 |
|:---|:---|:---|:---|
| **プリセット** | ワンクリックで全体の設定を変更する。 | ウルトラ / 高 / 中 / 低 / 最小 / カスタム | UI |
| **解像度スケール** | ゲームの内部的な描画解像度を調整する。 | 25% / 50% / 75% / 100% / 125% | three.js (setSize) |
| **テクスチャ品質** | オブジェクトのテクスチャの解像度を調整する。 | ウルトラ / 高 / 中 / 低 | three.js (Material) |
| **シャドウ品質** | 影の描画品質を調整、または無効化する。 | ウルトラ / 高 / 中 / 低 / オフ | three.js (Light, Renderer) |
| **アンチエイリアシング** | 物体の輪郭を滑らかにする処理のON/OFFを切り替える。 | 8x MSAA / 4x MSAA / 2x MSAA / FXAA / オフ | three.js (Renderer) |
| **ポストプロセッシング** | ブルームなどの画面全体にかかる特殊効果のON/OFFを切り替える。 | ウルトラ / 高 / 中 / 低 / オフ | three.js (EffectComposer) |
| **パーティクル密度** | エフェクトで表示されるパーティクルの数を調整する。 | 200% / 100% / 50% / 25% / 10% | Particle System |
| **描画距離** | 遠方のオブジェクトを表示する距離を調整する。 | 無制限 / 遠距離 / 中距離 / 近距離 / 最小 | three.js (Camera) |
| **フレームレート上限** | FPSの上限値を設定し、不要な負荷を抑制する。 | 無制限 / 144 FPS / 120 FPS / 60 FPS / 30 FPS | Rendering Loop |
| **垂直同期 (V-Sync)** | 画面のティアリングを防ぐ機能のON/OFFを切り替える。 | アダプティブ / オン / オフ | three.js (Renderer) |
| **ライティング品質** | 光源計算の品質を調整する。 | ウルトラ / 高 / 中 / 低 | three.js (Lights) |
| **フォグ効果** | 距離に応じたフォグ効果の有効/無効を切り替える。 | 高 / 標準 / シンプル / オフ | three.js (Scene.fog) |
| **レンダリング精度** | 内部計算の精度を調整する。 | 高精度 / 標準 / パフォーマンス優先 | three.js (Renderer) |
| **オブジェクト詳細度 (LOD)** | カメラとの距離に応じてオブジェクトの表現を段階的に変更する技術。モデルの複雑さだけでなく、マテリアルの種類（リアルな陰影か、単純な発光かなど）も切り替える。 | ウルトラ / 高 / 中 / 低 | three.js (LOD) |
| **星雲・星座表示** | 背景の星雲や星座の表示品質を調整する。 | 高 / 標準 / シンプル / オフ | Custom Rendering |
| **UI アニメーション** | ユーザーインターフェースのアニメーション効果。 | スムーズ / 標準 / シンプル / オフ | CSS/JS Animations |

## 4. 実装計画

以下のステップで実装を進める。

1.  **[調査] 既存コードの調査 (completed)**
    -   `frontend/js/threeSetup.js` を中心とした既存のレンダリング関連コードを分析し、各設定項目を適用する箇所を特定する。

2.  **[実装] 設定状態の管理 (in-progress: `design-settings-state`)**
    -   `frontend/js/state.js` に `graphics` オブジェクトを追加し、すべての設定項目の状態とデフォルト値を管理する。

3.  **[実装] パフォーマンス測定システム (new: `implement-performance-monitor`)**
    -   FPS測定、描画時間測定、メモリ使用量監視機能を実装する。
    -   デバイススペック自動検出機能を実装する。

4.  **[実装] UIの実装 (in-progress: `implement-settings-ui`)**
    -   設定画面のUI（モーダルウィンドウ、スライダー、ドロップダウン等）をHTML、CSSで作成する。
    -   `frontend/js/ui.js` にUIイベントを処理し、`state.js` の設定値を更新するロジックを実装する。
    -   リアルタイムプレビュー機能を追加する。

5.  **[実装] 設定の適用ロジック (in-progress: `apply-settings-to-renderer`)**
    -   `state.graphics` の変更を検知し、three.jsのレンダラーやカメラ、マテリアル等にリアルタイムで反映させるロジックを実装する。
    -   LOD（Level of Detail）システムを実装する。

6.  **[実装] プリセット管理システム (new: `implement-preset-system`)**
    -   プリセット定義とカスタムプリセット保存機能を実装する。
    -   デバイススペックに基づく自動推奨プリセット機能を実装する。

7.  **[実装] 設定の永続化 (in-progress: `save-load-settings`)**
    -   `frontend/js/saveload.js` を拡張し、`graphics` 設定をブラウザの `localStorage` に保存・読み込みする機能を実装する。これにより、ゲームを再起動しても設定が維持される。

8.  **[テスト] 動作確認とパフォーマンス測定 (in-progress: `test-graphics-settings`)**
    -   すべての設定項目が意図通りにグラフィックスに反映されることを確認する。
    -   プリセット「ultra」と「minimal」で、パフォーマンス（フレームレート）に明確な差が出ることを確認する。
    -   主要なブラウザ（Chrome, Firefox, Safari, Edge）で動作確認を行う。
    -   モバイルデバイスでの動作確認を行う。

## 5. データ構造案

`state.js` に追加するデータ構造の案。

```javascript
// frontend/js/state.js

export let state = {
  // ... 既存のstate
  graphics: {
    preset: 'medium', // UI表示: 'ウルトラ', '高', '中', '低', '最小', 'カスタム'
    resolutionScale: 1.0, // UI表示: 25%, 50%, 75%, 100%, 125%
    textureQuality: 'medium', // UI表示: 'ウルトラ', '高', '中', '低'
    shadowQuality: 'medium', // UI表示: 'ウルトラ', '高', '中', '低', 'オフ'
    antiAliasing: 'fxaa', // UI表示: '8x MSAA', '4x MSAA', '2x MSAA', 'FXAA', 'オフ'
    postProcessing: 'medium', // UI表示: 'ウルトラ', '高', '中', '低', 'オフ'
    particleDensity: 1.0, // UI表示: 10%, 25%, 50%, 100%, 200%
    viewDistance: 'medium', // UI表示: '無制限', '遠距離', '中距離', '近距離', '最小'
    frameRateLimit: 60, // UI表示: 30, 60, 120, 144, 無制限 (-1)
    vsync: 'adaptive', // UI表示: 'アダプティブ', 'オン', 'オフ'
    lightingQuality: 'medium', // UI表示: 'ウルトラ', '高', '中', '低'
    fogEffect: 'standard', // UI表示: '高', '標準', 'シンプル', 'オフ'
    renderPrecision: 'standard', // UI表示: '高精度', '標準', 'パフォーマンス優先'
    objectDetail: 'medium', // UI表示: 'ウルトラ', '高', '中', '低'
    backgroundDetail: 'standard', // UI表示: '高', '標準', 'シンプル', 'オフ'
    uiAnimations: 'standard', // UI表示: 'スムーズ', '標準', 'シンプル', 'オフ'
    
    // パフォーマンス監視
    performance: {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      gpuUsage: 0,
      averageFps: 60,
      history: []
    },
    
    // デバイス情報
    deviceInfo: {
      gpu: '',
      memory: 0,
      cores: 0,
      platform: '',
      isHighEnd: false,
      recommendedPreset: 'medium'
    }
  },
  // ...
};

// プリセット定義
export const GRAPHICS_PRESETS = {
  ultra: {
    resolutionScale: 1.25,
    textureQuality: 'ultra',
    shadowQuality: 'ultra',
    antiAliasing: 'msaa8x',
    postProcessing: 'ultra',
    particleDensity: 2.0,
    viewDistance: 'unlimited',
    lightingQuality: 'ultra',
    fogEffect: 'high',
    renderPrecision: 'high',
    objectDetail: 'ultra',
    backgroundDetail: 'high',
    uiAnimations: 'smooth'
  },
  high: {
    resolutionScale: 1.0,
    textureQuality: 'high',
    shadowQuality: 'high',
    antiAliasing: 'msaa4x',
    postProcessing: 'high',
    particleDensity: 1.0,
    viewDistance: 'far',
    lightingQuality: 'high',
    fogEffect: 'standard',
    renderPrecision: 'standard',
    objectDetail: 'high',
    backgroundDetail: 'standard',
    uiAnimations: 'smooth'
  },
  medium: {
    resolutionScale: 1.0,
    textureQuality: 'medium',
    shadowQuality: 'medium',
    antiAliasing: 'fxaa',
    postProcessing: 'medium',
    particleDensity: 0.5,
    viewDistance: 'medium',
    lightingQuality: 'medium',
    fogEffect: 'standard',
    renderPrecision: 'standard',
    objectDetail: 'medium',
    backgroundDetail: 'standard',
    uiAnimations: 'standard'
  },
  low: {
    resolutionScale: 0.75,
    textureQuality: 'low',
    shadowQuality: 'low',
    antiAliasing: 'off',
    postProcessing: 'low',
    particleDensity: 0.25,
    viewDistance: 'near',
    lightingQuality: 'low',
    fogEffect: 'simple',
    renderPrecision: 'performance',
    objectDetail: 'low',
    backgroundDetail: 'simple',
    uiAnimations: 'simple'
  },
  minimal: {
    resolutionScale: 0.5,
    textureQuality: 'low',
    shadowQuality: 'off',
    antiAliasing: 'off',
    postProcessing: 'off',
    particleDensity: 0.1,
    viewDistance: 'minimal',
    lightingQuality: 'low',
    fogEffect: 'off',
    renderPrecision: 'performance',
    objectDetail: 'low',
    backgroundDetail: 'off',
    uiAnimations: 'off'
  }
};
```

## 6. ベストプラクティスと考慮事項

### 6.1 パフォーマンス最適化

- **動的品質調整**: FPSが設定値を下回った場合、自動的に設定を下げる機能
- **レベル・オブ・ディテール (LOD)**: 距離に応じてオブジェクトの詳細度を自動調整
- **カリング**: 画面外のオブジェクトを描画対象から除外
- **オクルージョンカリング**: 他のオブジェクトに隠れた部分の描画を省略

### 6.2 ユーザビリティ

- **設定変更時の警告**: 大幅な変更時にパフォーマンス影響を通知
- **リセット機能**: 設定を推奨値に戻すボタン
- **設定プロファイル**: 複数の設定セットを保存・切り替え可能
- **ツールチップ**: 各設定項目の説明と推奨値を表示

### 6.3 技術的考慮事項

- **ブラウザ互換性**: WebGLの機能検出とフォールバック
- **モバイル対応**: タッチデバイス向けの最適化設定
- **メモリ管理**: テクスチャやジオメトリの適切な破棄
- **設定の段階的適用**: 重い設定変更時の段階的な適用でフリーズ防止

### 6.4 レベル・オブ・ディテール (LOD) 設計

LODは、主に天体オブジェクトに適用し、描画負荷を距離に応じて最適化する。`THREE.LOD` オブジェクトを使用して、距離の閾値ごとに表示する `THREE.Object3D` を切り替える。

#### 天体オブジェクトのLOD階層

| LODレベル | 距離（カメラから） | 表現方法 | three.js実装案 |
|:---|:---|:---|:---|
| **LOD 0 (近距離)** | 0 - 500 | 高ポリゴンモデル + PBRマテリアル (`MeshStandardMaterial`) + 高解像度テクスチャ。惑星のリングや大気などの詳細エフェクトも表示。 | `new THREE.Mesh(highPolyGeometry, pbrMaterial)` |
| **LOD 1 (中距離)** | 500 - 5,000 | 中ポリゴンモデル + PBRマテリアル (`MeshStandardMaterial`) + 中解像度テクスチャ。 | `new THREE.Mesh(midPolyGeometry, midResMaterial)` |
| **LOD 2 (遠距離)** | 5,000 - 50,000 | 低ポリゴンモデル (単純な球体) + 計算負荷の軽い基本マテリアル (`MeshBasicMaterial`)。陰影計算を省略し、惑星の固有色のみ表示。 | `new THREE.Mesh(lowPolyGeometry, basicMaterial)` |
| **LOD 3 (超遠距離)** | 50,000以上 | 常にカメラを向く板ポリゴン（ビルボード）に発光テクスチャを適用するか、単一の `THREE.Points`。光る点として表現する。 | `new THREE.Sprite(spriteMaterial)` または `new THREE.Points(pointGeometry, pointMaterial)` |

#### 「オブジェクト詳細度」設定との連動

UIの「オブジェクト詳細度」設定は、各LODレベルの切り替え距離や、使用するLODレベルの範囲を調整するために使用する。

- **最高**: 全てのLODレベル(0-3)を使用し、最適な品質で表示。
- **高**: LOD 0 の表示距離を短くし、早めにLOD 1に切り替える。
- **中**: LOD 0 を使用せず、近距離からLOD 1で表示を開始する。
- **低**: LOD 1 も使用せず、近距離からLOD 2（単純な色付きの球体）で表示。超遠距離ではLOD 3（光点）になる。

## 7. 実装時の技術仕様

### 7.1 three.js 設定対応表

| 設定項目 | three.js実装 | コード例 |
|:---|:---|:---|
| 解像度スケール | renderer.setSize() | `renderer.setSize(width * scale, height * scale)` |
| アンチエイリアシング | WebGLRenderer antialias | `new THREE.WebGLRenderer({antialias: true})` |
| シャドウ品質 | shadowMap設定 | `renderer.shadowMap.type = THREE.PCFSoftShadowMap` |
| ポストプロセッシング | EffectComposer | `composer.addPass(bloomPass)` |
| 描画距離 | Camera far plane | `camera.far = distance` |
| **オブジェクト詳細度 (LOD)** | THREE.LOD | `const lod = new THREE.LOD(); lod.addLevel(mesh_high, 100); lod.addLevel(mesh_low, 500); scene.add(lod);` |

### 7.2 パフォーマンス測定

```javascript
// FPS測定
let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

function measureFPS() {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
    }
}

// GPU情報取得
function getGPUInfo() {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
        return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        };
    }
    return null;
}
```

### 7.3 設定適用の優先順位

1. **即座に適用**: UI アニメーション、フレームレート制限
2. **次フレームで適用**: 解像度、アンチエイリアシング
3. **シーン再構築が必要**: シャドウ品質、ライティング品質
4. **リソース再読み込みが必要**: テクスチャ品質

## 8. 将来の拡張計画

### 8.1 AI最適化
- 機械学習によるプレイヤー好みの自動学習
- プレイスタイルに応じた設定推奨

### 8.2 アクセシビリティ
- 色覚異常対応の色調整
- 視覚障害者向けの音響フィードバック強化
- 運動機能制限者向けの操作簡素化

## 9. 品質保証計画

### 9.1 テストケース
- 各プリセットでの動作確認
- 設定変更時のメモリリーク検証
- 長時間プレイでの安定性確認
- 異なるGPU・ブラウザでの互換性テスト

### 9.2 パフォーマンス基準
- minimalプリセット: 30fps以上（統合GPU環境）
- mediumプリセット: 60fps以上（ミドルレンジGPU環境）
- ultraプリセット: 60fps以上（ハイエンドGPU環境）
