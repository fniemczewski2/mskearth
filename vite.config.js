import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    exclude: ['node_modules/**', 'dist/**'],
  },
  build: {
    target: 'es2022',
    sourcemap: mode !== 'production',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        embedDonate: resolve(import.meta.dirname, 'embed/donate.html'),
        embedBelka: resolve(import.meta.dirname, 'embed/belka.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return 'react';
          if (id.includes('@supabase/supabase-js')) return 'supabase';
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
}));
