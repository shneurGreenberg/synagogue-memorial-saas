import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const pagesBase = process.env.GITHUB_PAGES_BASE || '/';
const staticSite = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  root: path.join(rootDir, 'client'),
  base: pagesBase,
  define: {
    'import.meta.env.VITE_STATIC_SITE': JSON.stringify(staticSite ? 'true' : 'false'),
  },
  plugins: [react()],
  build: {
    outDir: path.join(rootDir, 'public/board'),
    emptyOutDir: true,
    // Shared lib/*.js modules are CommonJS outside the client root; include them so
    // named imports survive the production bundle.
    commonjsOptions: {
      include: [
        /node_modules/,
        /lib\/death-date\.js/,
        /lib\/memorial-qr-panel\.js/,
        /lib\/board-yahrzeit-layout\.js/,
        /lib\/daily-gates-layout\.js/,
        /lib\/community-unified-copy\.js/,
        /lib\/board-subtitle\.js/,
        /lib\/default-board-titles\.js/,
      ],
    },
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
      // hebcal depends on Node's EventEmitter; bundle the browser-compatible polyfill
      // instead of letting Vite externalize the built-in `events` module.
      events: path.join(rootDir, 'node_modules/events/events.js'),
    },
  },
});
