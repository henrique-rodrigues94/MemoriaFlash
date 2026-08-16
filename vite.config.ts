import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Chunks acima de 300kB atrasam o primeiro carregamento (crítico no
      // WebView Android, que costuma ter CPU/rede mais fracas que desktop).
      chunkSizeWarningLimit: 300,
      rollupOptions: {
        output: {
          // Separa dependências pesadas e estáveis (mudam raramente) em
          // chunks próprios — melhora o cache do navegador/WebView entre
          // deploys, já que o código do app muda bem mais que essas libs.
          // Cada entrada é isolada para não puxar o Firebase inteiro (734kB)
          // só porque uma tela usa auth, nem travar o carregamento inicial
          // com libs que só entram em uso depois do primeiro paint.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('firebase/firestore')) return 'vendor-firebase-firestore';
            if (id.includes('firebase/auth')) return 'vendor-firebase-auth';
            if (id.includes('firebase/messaging')) return 'vendor-firebase-messaging';
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase-core';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('motion') || id.includes('canvas-confetti')) return 'vendor-motion';
            if (id.includes('@capacitor') || id.includes('@capgo')) return 'vendor-capacitor';
            return 'vendor-misc';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
