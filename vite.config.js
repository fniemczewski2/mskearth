import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: mode !== 'production',
    rollupOptions: {
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
      // lokalny serwer API (vercel dev --listen 3001)
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
}));
