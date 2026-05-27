import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(rootDir, 'client'),
  plugins: [react()],
  build: {
    outDir: path.join(rootDir, 'public/board'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/memorial.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/memorial.[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.join(rootDir, 'client/src'),
    },
  },
});
