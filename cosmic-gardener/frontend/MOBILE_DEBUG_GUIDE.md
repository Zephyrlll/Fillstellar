# 📱 モバイルテザリング デバッグガイド

## 🔒 セキュリティ対策付きの安全な外出先デバッグ

### 🚀 クイックスタート

#### 1. 通常の開発（ローカルのみ）
```bash
npm run dev
# → http://localhost:8000 (PCのみアクセス可能)
```

#### 2. モバイルテザリング用（外部アクセス許可）
```bash
npm run dev:mobile
# → http://0.0.0.0:8000 (外部デバイスからアクセス可能)
```

#### 3. セキュア版（HTTPS対応）
```bash
npm run dev:secure
# → https://0.0.0.0:8000 (HTTPS + 外部アクセス)
```

## 🛡️ セキュリティ機能

### ✅ 実装済みの保護
- **CORS制限**: 許可されたオリジンのみアクセス可能
- **セキュリティヘッダー**: XSS/CSRF攻撃防止
- **ソースマップ無効**: 本番環境でのコード保護
- **フレーム保護**: iframe埋め込み防止

### 🔧 追加設定

#### IPアドレス制限を追加する場合
`vite.config.mobile.ts` の `cors.origin` に追加:
```typescript
origin: [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://192.168.1.100:8000', // ← 自分のモバイルIP
]
```

## 📱 モバイルアクセス手順

### 1. PCのIPアドレスを確認
```bash
# Windows
ipconfig

# Mac/Linux  
ifconfig
```

### 2. モバイルテザリング開始
```bash
cd cosmic-gardener/frontend
npm run dev:mobile
```

### 3. スマホからアクセス
```
http://[PCのIPアドレス]:8000
例: http://192.168.43.2:8000
```

## 🔍 トラブルシューティング

### ❌ アクセスできない場合

#### ファイアウォール確認
```bash
# Windows Defender確認
netsh advfirewall firewall show rule name="Node.js"

# ポート8000を許可
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=8000
```

#### ネットワーク診断
```bash
# PCでサーバー確認
curl http://localhost:8000

# モバイルから疎通確認
ping [PCのIPアドレス]
```

### 🐛 よくある問題

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| 接続拒否 | ファイアウォール | ポート8000を開放 |
| CORS エラー | オリジン制限 | vite.config.mobile.ts で IP追加 |
| HTTPS必須エラー | ブラウザ制限 | `npm run dev:secure` を使用 |
| 遅い表示 | テザリング速度 | キャッシュ無効化を確認 |

## 🚨 セキュリティ注意事項

### ⚠️ 開発時のみ使用
- **本番環境では絶対に使用しない**
- **公衆WiFiでは使用を避ける**
- **デバッグ終了後は必ずサーバー停止**

### 🛡️ 推奨設定
1. **VPN使用**: 可能な限りVPN経由でアクセス
2. **時間制限**: 長時間の起動は避ける
3. **IP制限**: 信頼できるデバイスのみ許可
4. **ログ監視**: 不審なアクセスをチェック

## 🔧 詳細設定

### カスタムポート使用
```bash
# ポート9000で起動
npm run dev:mobile -- --port 9000
```

### デバッグログ有効化
```bash
# 詳細ログ出力
DEBUG=vite:* npm run dev:mobile
```

### HTTPS証明書設定
```bash
# 自己署名証明書生成（開発用）
npm run dev:secure
# ブラウザで証明書エラーを許可して進む
```

## 📋 チェックリスト

### 🚀 開始前
- [ ] PCとモバイルが同じネットワーク
- [ ] ファイアウォール設定確認
- [ ] VPN接続（推奨）
- [ ] 不要なアプリケーション終了

### 🔒 セキュリティ確認
- [ ] CORS設定が適切
- [ ] 信頼できるネットワークのみ使用
- [ ] デバッグ終了後にサーバー停止
- [ ] アクセスログ確認

### 🐛 デバッグ作業
- [ ] TypeScript エラー確認
- [ ] ブラウザ開発者ツール活用
- [ ] ネットワークタブでリクエスト確認
- [ ] モバイル特有のUI問題チェック

## 🎯 パフォーマンス最適化

### モバイル向け設定
```typescript
// vite.config.mobile.ts に追加
optimizeDeps: {
  include: ['three'],
  // モバイル用の軽量化
  esbuildOptions: {
    target: 'es2020',
    minify: true,
  }
}
```

これで安全にモバイルテザリングでのデバッグが可能です！🚀