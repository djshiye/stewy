import { defineConfig, devices } from '@playwright/test';

// E2E_PORT and E2E_OUTDIR let several runs (or worktrees) build and serve side by side.
const PORT = Number(process.env.E2E_PORT ?? 4317);
const OUT_DIR = process.env.E2E_OUTDIR ?? 'dist-e2e';
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end suite. It builds the production bundle and serves it with `vite preview`.
 * Chromium runs on the host; WebKit runs in the official Playwright container (see `test:e2e:webkit`).
 * A server that is already listening on the port is reused outside CI.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: `npx vite build --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --host localhost --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
