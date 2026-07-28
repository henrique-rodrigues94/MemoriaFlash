// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase SDK separado (pesado)
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/analytics',
          ],
          // Bibliotecas de UI grandes
          ui: [
            'framer-motion',
            'lucide-react',
            'canvas-confetti',
          ],
          // React e core
          react: [
            'react',
            'react-dom',
            'react/jsx-runtime',
          ],
          // Outras dependências (opcional)
          vendor: [
            'zod',
            'dotenv',
          ],
        },
      },
    },
    // Aumenta o limite para chunks grandes (evita warnings)
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3000', // se o backend estiver na mesma porta
    },
  },
});