# マイ惑星3D表示システム設計書

## 概要
所有している惑星を別キャンバスで3D表示し、WASDキーで視点を移動できるシステム。

## 主要機能
1. **別キャンバスでの3D表示**
   - メインゲームとは別のThree.jsシーンを作成
   - 惑星の詳細な3Dモデルを表示
   - 地形、大気、雲などのビジュアル効果

2. **カメラ制御**
   - WASDキーで惑星表面を移動
   - マウスドラッグで視点回転
   - スクロールでズームイン/アウト

3. **惑星の特徴表示**
   - 惑星タイプに応じた地形生成
   - 資源生成ポイントの視覚化
   - 将来的な建造物配置の準備

## アーキテクチャ

### ファイル構成
```
planetOwnership/
├── planet3D/
│   ├── Planet3DViewer.ts      # メインビューアークラス
│   ├── PlanetRenderer.ts      # 惑星レンダリング
│   ├── PlanetTerrain.ts       # 地形生成
│   ├── CameraController.ts    # カメラ制御
│   └── PlanetMaterials.ts     # マテリアル定義
```

### クラス設計

#### Planet3DViewer
```typescript
class Planet3DViewer {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private planet: OwnedPlanet;
    private cameraController: CameraController;
    
    open(planet: OwnedPlanet): void;
    close(): void;
    update(): void;
}
```

#### CameraController
```typescript
class CameraController {
    private camera: THREE.Camera;
    private moveSpeed: number = 10;
    private rotateSpeed: number = 0.002;
    
    handleKeyDown(event: KeyboardEvent): void;
    handleMouseMove(event: MouseEvent): void;
    update(deltaTime: number): void;
}
```

## UI/UX設計

### ビューアーUI
- 画面全体を覆うモーダル形式
- 右上に閉じるボタン
- 左上に惑星情報パネル
- 下部に操作説明

### 操作方法
- **WASD**: カメラ移動
- **マウスドラッグ**: 視点回転
- **スクロール**: ズーム
- **ESC**: ビューアーを閉じる

## 惑星タイプ別の表現

### 砂漠惑星
- 茶色〜オレンジ色の地形
- 砂丘と岩石地帯
- 薄い大気エフェクト

### 海洋惑星
- 青い海と島々
- 波のアニメーション
- 雲の層

### 森林惑星
- 緑豊かな地形
- 森林と草原のテクスチャ
- 濃い大気

### 氷惑星
- 白〜青白い地形
- 氷河と雪原
- オーロラエフェクト

### 火山惑星
- 赤〜黒の地形
- 溶岩流のアニメーション
- 火山灰の粒子エフェクト

### ガス惑星
- 渦巻く雲の層
- 嵐のアニメーション
- 大気の厚み表現

## パフォーマンス考慮事項
- LODシステムで詳細度を調整
- 必要に応じて品質設定を提供
- メインゲームとは独立したレンダリングループ

## 実装優先順位
1. 基本的な3Dビューアーの枠組み
2. 惑星の球体表示とカメラ制御
3. 惑星タイプ別のマテリアル
4. 地形の詳細化
5. エフェクトの追加