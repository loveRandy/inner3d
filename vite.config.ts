import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cdnBase = env.VITE_CDN_BASE_URL || '/';
  const base = cdnBase.endsWith('/') ? cdnBase : `${cdnBase}/`;

  return {
    base,
    server: {
      port: 8888,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('node_modules/@react-three')) return 'r3f';
          },
        },
      },
    },
  };
});
