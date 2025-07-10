# Cosmic Gardener - アーキテクチャ設計

## システム概要

Cosmic Gardenerは、段階的に進化する3D宇宙シミュレーション・アイドルゲームです。現在はシングルプレイヤーのフロントエンド実装が完成しており、将来的にRustバックエンドによるマルチプレイヤー対応を予定しています。

## 現行アーキテクチャ（Phase 1 - シングルプレイヤー）

### 概要図
```
Browser Environment
├── HTML/CSS（レイアウト・スタイル）
├── TypeScript Modules（ゲームロジック）
│   ├── main.ts（エントリーポイント・ゲームループ）
│   ├── state.ts（状態管理・永続化）
│   ├── physics.ts（物理エンジン）
│   ├── celestialBody.ts（天体システム）
│   ├── resourceSystem.ts（資源システム）
│   ├── ui.ts（UI管理）
│   └── sound.ts（サウンドシステム）
├── Three.js（3Dレンダリング）
└── Web APIs（Audio, Storage）
```

### 主要モジュールの責務

#### 1. main.ts - ゲームループ管理
```typescript
// 主要責務
- Three.jsシーン初期化
- アニメーションループ（requestAnimationFrame）
- モジュール間協調
- 時間管理（タイムマルチプライヤー）

// 主要関数
init(): void              // ゲーム初期化
animate(): void           // メインループ
```

#### 2. state.ts - ゲーム状態管理
```typescript
// 主要責務
- ゲーム状態の一元管理
- localStorage永続化
- 統計データ追跡
- リソース蓄積器（Accumulator）

// 状態構造
interface GameState {
  resources: Resources;           // 基本リソース
  celestialBodies: CelestialBody[]; // 天体リスト
  research: ResearchState;        // 研究進捗
  physics: PhysicsSettings;       // 物理設定
  statistics: StatisticsData;     // 統計データ
}
```

#### 3. physics.ts - 物理エンジン
```typescript
// 主要責務
- N体重力シミュレーション
- 衝突検出（空間グリッド最適化）
- 軌道計算
- オブジェクトプーリング

// 主要関数
updatePhysics(deltaTime: number): void
calculateGravity(body1: CelestialBody, body2: CelestialBody): Vector3
```

#### 4. celestialBody.ts - 天体システム
```typescript
// 主要責務
- 天体の生成・管理
- 生命進化シミュレーション
- 軌道力学
- 天体間相互作用

// 天体階層
BlackHole → Star → Planet/Moon/Asteroid/Comet
```

#### 5. resourceSystem.ts - 拡張資源システム
```typescript
// 主要責務
- 27種類の高度資源管理
- 品質システム（5段階）
- 資源変換レシピ
- 生産チェーン管理

// 資源階層
基本資源(6種) → 高度資源(21種) → 加工資源(6種)
```

#### 6. ui.ts - UI管理
```typescript
// 主要責務
- タブ型インターフェース
- リアルタイム表示更新
- ユーザー入力処理
- パフォーマンス最適化

// UI構造
Game Tab | Research Tab | Production Tab | Options Tab | Star Management Tab
```

### データフロー

#### リソース生成・消費フロー
```
天体の存在 → リソース生成レート → state.resources → UI表示
                ↓
              研究・建設 → リソース消費 → state.resources
```

#### 物理シミュレーションフロー
```
animate() → updatePhysics() → 重力計算 → 位置更新 → Three.jsレンダリング
```

#### UI更新フロー
```
ゲーム状態変更 → updateUI()（0.1秒間隔） → DOM更新（ダーティチェック）
```

## 将来アーキテクチャ（Phase 2 - マルチプレイヤー）

### システム構成図
```
Client (Browser)                    Server (Rust)
├── TypeScript Frontend             ├── Actix Web (HTTP API)
├── Three.js (Rendering)            ├── actix-ws (WebSocket)
├── WebSocket Client                ├── SQLx (Database)
└── Local State Cache               ├── PostgreSQL (Persistence)
                                    ├── Redis (Cache/Sessions)
                                    └── Physics Engine (Rust)
```

### サーバーサイド設計

#### Clean Architecture / DDD 構造
```
src/
├── domain/              # ドメインロジック
│   ├── entities/        # エンティティ
│   └── value_objects/   # 値オブジェクト
├── application/         # アプリケーション層
│   └── services/        # ユースケース
├── infrastructure/      # インフラ層
│   ├── database/        # データベース
│   ├── websocket/       # WebSocket
│   └── cache/           # キャッシュ
└── presentation/        # プレゼンテーション層
    └── routes/          # HTTPハンドラー
```

#### データベース設計
```sql
-- 主要テーブル
players              # プレイヤー情報
game_sessions        # ゲームセッション
celestial_bodies     # 天体データ（PostGIS空間インデックス）
player_resources     # プレイヤーリソース
research_progress    # 研究進捗
player_statistics    # 統計データ（時系列）
```

### マルチプレイヤー同期戦略

#### リアルタイム同期要素
- 天体位置・状態（高頻度）
- プレイヤー行動（即座）
- 相互作用イベント（即座）

#### バッチ同期要素
- リソース統計（低頻度）
- 研究進捗（低頻度）
- 長期統計（定期）

#### 同期最適化技術
```
Delta Sync       # 差分のみ送信
View Culling     # 視界外データ除外
Priority Queue   # 重要度によるデータ優先度
Compression      # WebSocketデータ圧縮
```

## パフォーマンス設計

### フロントエンド最適化
1. **レンダリング**
   - Object Pooling（THREE.Vector3等）
   - LOD（Level of Detail）
   - Frustum Culling

2. **UI更新**
   - 固定間隔更新（0.1秒）
   - Dirty Checking
   - 仮想スクロール（将来的）

3. **物理計算**
   - 空間グリッド最適化
   - 固定時間ステップ
   - アダプティブ精度

### バックエンド最適化（計画）
1. **データベース**
   - 空間インデックス（R-Tree）
   - プレイヤーベースシャーディング
   - 読み取り専用レプリカ

2. **WebSocket**
   - 接続プール管理
   - バックプレッシャー制御
   - メッセージバッファリング

## セキュリティ設計

### 現行（フロントエンドのみ）
- XSS防止（innerHTML使用回避）
- CSP（Content Security Policy）
- HTTPS必須（本番環境）

### 将来（フルスタック）
- サーバーサイド認証（JWT）
- レート制限（API・WebSocket）
- 入力検証・サニタイゼーション
- CSRF防止
- SQLインジェクション防止（SQLx型安全性）

## 監視・運用設計

### メトリクス収集
```
ゲームメトリクス:
- プレイヤー数
- リソース生成レート
- 天体数・種類分布
- 研究完了率

技術メトリクス:
- レスポンス時間
- WebSocket接続数
- データベース負荷
- メモリ使用量
```

### ログ戦略
```
Error Level:   システムエラー、クラッシュ
Warn Level:    パフォーマンス警告、異常値
Info Level:    プレイヤー行動、ゲームイベント
Debug Level:   詳細なシステム動作
```

## 拡張性設計

### 水平スケーリング（将来）
1. **ゲームサーバー** - 地域別インスタンス
2. **データベース** - 読み取り専用レプリカ
3. **キャッシュ** - Redis Cluster
4. **ロードバランサー** - Nginx/ALB

### 機能拡張ポイント
1. **新資源タイプ** - 設定ベース追加
2. **新天体種類** - プラグイン方式
3. **新物理法則** - モジュール交換
4. **AI要素** - 機械学習統合

## 技術選定根拠

### フロントエンド
- **TypeScript**: 型安全性、大規模開発適性
- **Three.js**: WebGL抽象化、豊富な機能
- **ES6 Modules**: ネイティブモジュール、パフォーマンス

### バックエンド（計画）
- **Rust**: メモリ安全性、高性能、並行性
- **Actix Web**: 高性能、安定性、WebSocket統合
- **PostgreSQL**: PostGIS空間拡張、ACID特性
- **Redis**: 高速キャッシュ、セッション管理

この設計により、シンプルな3Dアイドルゲームから大規模マルチプレイヤー宇宙シミュレーションまで段階的に進化可能なアーキテクチャを実現します。