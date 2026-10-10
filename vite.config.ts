/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // keep the hand-written public/site.webmanifest + its <link> in index.html
      manifest: false,
      workbox: {
        // Precache the app shell and only the latin font subsets; the other subsets
        // (latin-ext, cyrillic, vietnamese) are fetched on demand by unicode-range.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-{wght,opsz}-normal-*.woff2'],
        // social card and large logo are only fetched by crawlers
        globIgnores: ['og.png', 'logo.png'],
        navigateFallback: 'index.html',
      },
      // dev server stays untouched (no SW in dev)
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
