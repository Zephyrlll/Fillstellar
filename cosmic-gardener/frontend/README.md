# Cosmic Gardener

## ユーザー向け情報

### 概要

「Cosmic Gardener」は、あなただけの宇宙を創造し、育てる放置系シミュレーションゲームです。広大な宇宙空間で、塵やエネルギーといった根源的なリソースを集め、小惑星から巨大な恒星まで、様々な天体を創造しましょう。

生命の誕生や進化、そして知的文明の発展を見守りながら、あなたの宇宙がどのように成長していくかを見届けてください。

### ゲームの目的

- **リソースの収集:** 宇宙の塵、エネルギー、ダークマターなどを集め、宇宙創造の礎とします。
- **天体の創造:** 小惑星、彗星、惑星、そして恒星を創造し、あなただけの銀河を形作ります。
- **生命の育成:** 惑星に生命を誕生させ、微生物から知的生命体へと進化させていきます。
- **研究と発展:** 新たな技術を研究し、より高度な天体の創造や、効率的なリソース収集を目指します。

### 遊び方

1. **リソースを貯める:** ゲーム開始直後は、自動的に宇宙の塵が集まっていきます。
2. **天体を創造する:** 貯めたリソースを使い、小惑星や恒星などの天体を創造します。
3. **アップグレードと研究:** エネルギーを使ってリソースの生産効率を上げたり、ダークマターを使って新たな技術をアンロックしたりできます。
4. **宇宙の進化を見守る:** あなたが創造した宇宙が、時間と共にどのように変化し、発展していくかを観察しましょう。

## 開発者向け情報

### 概要

このプロジェクトは、TypeScriptとThree.jsを使用して開発された、ブラウザで動作する宇宙シミュレーションゲームです。

### 技術スタック

- **言語:** TypeScript 5.8+
- **グラフィックス:** Three.js
- **ビルドツール:** Vite 5.0+ (高速ホットリロード対応)
- **パッケージ管理:** npm
- **コード品質:** ESLint, Prettier
- **テスト:** Vitest (ユニットテスト), Playwright (E2Eテスト)

### プロジェクト構造

```
.
├── js/                # ゲームのコアロジック (TypeScript)
│   ├── main.ts        # メインのゲームループ
│   ├── celestialBody.ts # 天体の生成と管理
│   ├── physics.ts     # 物理演算
│   ├── ui.ts          # UIの更新とイベント処理
│   ├── state.ts       # ゲームの状態管理
│   ├── saveload.ts    # セーブ・ロード機能
│   └── ...
├── index.html         # ゲームのメインページ
├── style.css          # スタイルシート
├── package.json       # プロジェクトの依存関係とスクリプト
└── tsconfig.json      # TypeScriptのコンフィグレーション
```

### セットアップと実行

#### 🚀 推奨: モダン開発環境（Vite）

1. **依存関係のインストール:**
   ```bash
   npm install
   ```

2. **開発サーバーの起動:**
   ```bash
   npm run dev
   ```
   Viteが起動し、http://localhost:8000 が自動的に開きます。
   ホットリロード対応で、コードの変更が即座に反映されます。

3. **プロダクションビルド:**
   ```bash
   npm run build
   npm run preview  # ビルド結果のプレビュー
   ```

#### 🔧 従来の方法（互換性のため維持）

1. **TypeScriptのコンパイル:**
   ```bash
   npm run build  # または npx tsc
   ```

2. **ローカルサーバーの起動:**
   ```bash
   npm run serve  # または ./start-server.bat (Windows)
   # または
   python -m http.server 8000
   ```

### 開発コマンド一覧

```bash
npm run dev        # 開発サーバー起動（ホットリロード）
npm run build      # プロダクションビルド
npm run preview    # ビルド結果のプレビュー
npm run lint       # ESLintでコード品質チェック
npm run lint:fix   # ESLintエラーの自動修正
npm run format     # Prettierでコードフォーマット
npm run test       # ユニットテスト実行
npm run test:ui    # テストUIで結果確認
npm run test:e2e   # E2Eテスト実行
npm run typecheck  # TypeScript型チェック
```

### 主要なロジック

- **ゲームループ (`main.ts`):** `animate`関数がゲームのメインループを担っており、物理演算、リソースの更新、UIの描画などを毎フレーム呼び出しています。
- **状態管理 (`js/state.ts`):** `gameState`オブジェクトが、リソースの量、天体の情報、研究の進捗など、ゲーム全体の状態を一元管理しています。
- **天体 (`js/celestialBody.ts`):** `createCelestialBody`関数が、星や惑星などの天体オブジェクトを生成します。生命の誕生や進化のロジックもここに記述されています。
- **物理演算 (`js/physics.ts`):** `updatePhysics`関数が、天体間の引力を計算し、位置と速度を更新しています。
- **UI (`js/ui.ts`):** `updateUI`関数が、`gameState`の変更を検知し、画面上の表示を更新します。各種ボタンのイベントリスナーもここで設定されています。

### 今後の展望

- 新たな天体やリソースの追加
- より複雑な研究ツリーの実装
- イベントやミッション機能の追加
- パフォーマンスの最適化

## 🔬 研究項目の編集方法

### 概要
研究室の研究項目は`research-items.md`ファイルを編集することで追加・変更できます。
編集後、開発者がファイルをパースして実装に反映します。

### 編集手順

1. **research-items.mdファイルを開く**
   ```
   cosmic-gardener/frontend/research-items.md
   ```

2. **既存の研究項目を参考に新しい研究を追加**
   ```yaml
   - id: your_research_id
     name: 研究名
     description: 研究の説明
     category: fundamental # カテゴリID
     icon: 🔬 # 絵文字アイコン
     cost:
       darkMatter: 5 # コスト
     effects:
       - type: effect_type
         value: 2.0
     requirements:
       - required_research_id # 前提条件
     unlocks:
       - unlocked_feature # アンロックされる要素
   ```

3. **編集内容を開発者に共有**
   - ファイルを保存後、開発者に変更を依頼
   - 開発者が以下のコマンドを実行して反映：
   ```bash
   node scripts/generate-research-data.js
   ```

### カテゴリ一覧
- `fundamental`: 基礎研究
- `celestial`: 天体研究
- `life`: 生命研究
- `technology`: 技術研究
- `cosmic`: 宇宙研究

### 効果タイプ一覧
- `dust_generation_multiplier`: 塵生成倍率
- `energy_conversion_multiplier`: エネルギー変換倍率
- `unlock_celestial_body`: 天体アンロック
- `life_spawn_chance_multiplier`: 生命誕生確率倍率
- その他多数（research-items.md参照）

### 注意事項
- IDは重複しないようにする
- 英数字とアンダースコアのみ使用
- コストバランスを考慮
- 前提条件は論理的な順序で設定
