import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
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
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
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
