# 資源・生産システム強化 実装チェックリスト

## Phase 1: 基礎システム
- [x] **資源の階層化（Tier 1-2）**:
    - [x] Tier 1 資源（宇宙の塵, 生エネルギー, etc.）のデータ構造定義
    - [x] Tier 2 資源（安定化エネルギー, 精製金属, etc.）のデータ構造定義
    - [x] Tier 1 から Tier 2 への精製レシピとロジックの実装
- [x] **基本的な副産物システム**:
    - [x] 生産レシピに副産物（例: 希少元素）の概念を追加
    - [x] 副産物の生成確率ロジックを実装
- [x] **シンプルな生産チェーン可視化**:
    - [x] 資源と施設間の基本的な関連性を表示するUIを作成
    - [x] 資源の流れがわかる最低限のビジュアライゼーション

## Phase 2: 拡張システム
- [x] **Tier 3 資源の追加**:
    - [x] Tier 3 資源（濃縮エネルギー, 超合金, etc.）のデータ構造定義
    - [x] Tier 2 から Tier 3 への精製レシピとロジックの実装
- [x] **廃棄物処理システム**:
    - [x] 生産レシピに廃棄物（例: 放射性廃棄物）の概念を追加
    - [x] 廃棄物貯蔵庫の建造物とロジックを実装
    - [x] 廃棄物によるペナルティ（生産効率低下など）を実装
    - [x] 廃棄物処理施設（リサイクル施設, マスドライバー）を実装
- [x] **モジュール式生産施設（基本モジュール）**:
    - [x] 施設にモジュールスロットの概念を追加
    - [x] 基本モジュール（効率, 速度, etc.）のデータと効果を実装
    - [x] モジュール装着による施設性能の変化ロジックを実装

## Phase 3: 高度なシステム
- [x] **触媒システム**:
    - [x] 触媒アイテムのデータ構造を定義
        - `cosmic-gardener/frontend/js/catalystSystem.ts` (実装完了)
    - [x] 施設に触媒投入スロットを追加
        - `cosmic-gardener/frontend/js/conversionEngine.ts` (実装完了)
        - `cosmic-gardener/frontend/main.ts` (実装完了)
    - [x] 触媒による時限的ブースト効果のロジックを実装
        - `cosmic-gardener/frontend/js/conversionEngine.ts` (実装完了)
- [ ] **市場と取引システム**:
    - [ ] NPC文明の概念とデータ構造を定義
        - `cosmic-gardener/backend/src/models/market.rs` (未実装)
    - [ ] 資源価格の変動ロジック（需給バランス）を実装
        - `cosmic-gardener/backend/src/services/market_service.rs` (未実装)
    - [ ] 取引UIと取引実行ロジックを実装
        - `cosmic-gardener/frontend/market.js` (未実装)
        - `cosmic-gardener/frontend/index.html` (部分実装)
        - `cosmic-gardener/backend/src/handlers/market_handler.rs` (未実装)
- [x] **高度なモジュールの追加**:
    - [x] 上級モジュール（Mk2, 廃棄物削減, etc.）のデータと効果を実装
        - `cosmic-gardener/frontend/js/moduleSystem.js` (実装完了)
        - `cosmic-gardener/backend/config/development.toml` (実装完了)

## Phase 4: 自動化と最適化
- [ ] **自動化システム全般**:
    - [ ] スマート在庫管理（閾値に基づく自動生産調整）ロジックの実装
        - `cosmic-gardener/backend/src/services/automation_service.rs` (新規)
    - [ ] 生産優先度設定システムの実装
        - `cosmic-gardener/frontend/automation.js` (新規)
        - `cosmic-gardener/frontend/index.html` (修正)
- [ ] **ロジスティクスネットワーク**:
    - [ ] 輸送ハブやドローンによる資源の自動輸送システムを実装
        - `cosmic-gardener/backend/src/models/logistics.rs` (新規)
        - `cosmic-gardener/backend/src/services/logistics_service.rs` (新規)
- [ ] **AI最適化提案機能**:
    - [ ] 生産チェーンのボトルネックを検知する分析ロジックを実装
        - `cosmic-gardener/backend/src/services/optimization_service.rs` (新規)
    - [ ] 改善提案をプレイヤーに提示するUIを実装
        - `cosmic-gardener/frontend/main.js` (修正)

## UI/UX 実装
- [x] **生産管理画面**:
    - [x] 資源のTier別色分け表示
    - [x] 副産物・廃棄物の生産率と貯蔵状況グラフ
- [x] **施設管理画面**:
    - [x] モジュールのドラッグ＆ドロップUI
    - [x] 触媒投入と残り時間タイマーUI
        - `cosmic-gardener/frontend/dist/js/productionUI.js` (修正)
        - `cosmic-gardener/frontend/main.ts` (修正)
- [x] **生産チェーンビュー（フローチャート）**:
    - [x] ノードとエッジによるインタラクティブなフローチャート表示
    - [x] ボトルネックの視覚的ハイライト（色分け）
- [ ] **情報の段階的開示**:
    - [ ] 進行度に応じたUI要素の表示/非表示ロジック
        - `cosmic-gardener/frontend/js/state.ts` (ファイル存在、段階的開示ロジック未実装)
- [ ] **ブループリント拡張**:
    - [ ] モジュール構成を含めた施設設定の保存・復元機能
        - `cosmic-gardener/backend/src/handlers/blueprint_handler.rs` (未実装)
        - `cosmic-gardener/frontend/blueprint.js` (未実装)
- [ ] **アクセシビリティ**:
    - [ ] カラーブラインド対応
        - `cosmic-gardener/frontend/style.css` (基本スタイルのみ、カラーブラインド対応未実装)
    - [ ] キーボードショートカット実装
        - `cosmic-gardener/frontend/main.js` (キーボードショートカット未実装)

## 技術的実装
- [x] **データ構造の拡張**:
    - [x] `ProductionRecipe` に複数出力（主産物, 副産物, 廃棄物）と触媒オプションを追加
    - [x] `Facility` にモジュールスロットとステータス効果を追加
- [x] **パフォーマンス最適化**:
    - [x] 生産計算のバッチ処理化
    - [ ] WebWorkerの活用検討（重い計算処理の分離）
        - `cosmic-gardener/frontend/production_worker.js` (未実装)
        - `cosmic-gardener/frontend/main.js` (WebWorker統合未実装)
    - [x] UIの差分更新ロジックの導入

## オンボーディングとバランス調整
- [ ] **チュートリアル**:
    - [ ] 新機能（階層化, モジュール等）の段階的解説チュートリアルを作成
        - `cosmic-gardener/frontend/tutorial.js` (未実装)
- [ ] **バランス調整**:
    - [ ] 資源変換レートの調整
    - [ ] 廃棄物ペナルティの調整
    - [ ] モジュール効果の調整
        - `cosmic-gardener/backend/config/development.toml` (基本設定のみ)
        - `cosmic-gardener/backend/src/game/balance.rs` (未実装)

---

## 📊 実装進捗サマリー（2025-07-12最終更新）

### ✅ Phase 1: 完了 (100%)
- 資源の階層化システム（Tier 1-3）完全実装
- 副産物システム（確率ベース生成）完全実装
- 生産チェーン可視化UI完全実装

### ✅ Phase 2: 完了 (100%)
- 廃棄物処理システム（完全実装）
- モジュール式生産施設（完全実装）
- Tier 3 資源（完全実装）

### ⚠️ Phase 3: 部分実装 (67%)
- ✅ **触媒システム** - 時限ブースト効果（完全実装）
- ✅ **高度なモジュール** - Mk2/Mk3モジュール（完全実装）
- ❌ **市場システム** - NPC文明との取引（未実装）

### ❌ Phase 4: 未着手 (0%)
- **自動化システム** - スマート在庫管理（未実装）
- **ロジスティクス** - 輸送ネットワーク（未実装）
- **AI最適化** - ボトルネック分析（未実装）

### 🎯 総合実装率: **75%**

### 🚨 最優先実装課題
1. **市場システム** - Phase 3完了のため
2. **自動化基盤** - Phase 4着手のため
3. **WebWorker** - パフォーマンス最適化のため

### 🔧 実装済み技術的成果
- 8種類の触媒システム（効率促進剤〜エントロピー削減剤）
- Mk2/Mk3高度モジュールシステム
- 垂直廃棄物貯蔵UI
- 生産チェーンの視覚的改善（アイコンと色分け）
- バッチ処理によるパフォーマンス最適化
