import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Wersja z package.json (podbijana przez scripts/release.mjs) dostepna w kodzie klienta.
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Do bundla trafiaja tylko zmienne o tych prefiksach. SUPABASE_SECRET_KEY do nich nie nalezy.
  envPrefix: ['VITE_', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_'],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Testy nie zaleza od lokalnego .env: analityka i captcha sa w nich wylaczone.
    env: { VITE_GA_MEASUREMENT_ID: '', VITE_TURNSTILE_SITE_KEY: '' },
    exclude: ['node_modules/**', 'dist/**'],
  },
  build: {
    target: 'es2022',
    sourcemap: mode !== 'production',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
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
