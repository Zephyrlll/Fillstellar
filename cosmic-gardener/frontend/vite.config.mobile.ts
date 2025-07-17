import { defineConfig } from 'vite';
import path from 'path';

// Mobile/Tethering用の安全な設定
// 使用方法: npm run dev:mobile
export default defineConfig({
  root: '.',
  base: '/',
  publicDir: 'public',
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './js'),
      'three': 'three',
    },
    extensions: ['.ts', '.js', '.json'],
  },
  
  server: {
    port: 8000,
    // 🔒 モバイルテザリング用の設定
    host: '0.0.0.0', // 外部アクセス許可（開発時のみ）
    open: false, // 自動でブラウザを開かない
    cors: {
      // 🛡️ CORS制限を強化
      origin: [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        // 🔒 必要に応じて特定のIPを追加
        // 'http://192.168.1.100:8000', // 例: 自分のモバイルIP
      ],
      credentials: false,
      methods: ['GET', 'POST', 'OPTIONS'],
    },
    // HMR configuration
    hmr: {
      overlay: true,
      // 🔒 WebSocket接続を制限
      clientPort: 8000,
    },
    // 🛡️ セキュリティヘッダー追加
    middlewareMode: false,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 🔒 本番環境ではソースマップ無効
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  
  optimizeDeps: {
    include: ['three'],
    exclude: [],
  },
  
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        useDefineForClassFields: true,
      },
    },
  },
  
  // 🔒 開発環境での追加セキュリティ
  define: {
    __DEV_MODE__: true,
    __ALLOW_MOBILE_DEBUG__: true,
  },
});