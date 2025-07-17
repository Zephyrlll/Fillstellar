import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
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
    open: true,
    cors: true,
    // HMR configuration
    hmr: {
      overlay: true,
    },
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // Split Three.js into its own chunk
          three: ['three'],
        },
        // Ensure proper file naming
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // Optimize chunk size
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
});