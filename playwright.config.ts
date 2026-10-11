import { defineConfig, devices, type Project } from '@playwright/test';

// E2E_PORT and E2E_OUTDIR let several runs (or worktrees) build and serve side by side.
const PORT = Number(process.env.E2E_PORT ?? 4317);
const OUT_DIR = process.env.E2E_OUTDIR ?? 'dist-e2e';
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Specs that have a touch version: they open sheets, undo and share through visible controls, so they run on the
 * iPhone and iPad projects too. Mouse drags, hover, zoom and the desktop size sweeps stay on the desktop projects
 * (tagged @desktop in the spec, or left out of this list).
 */
const TOUCH_SPECS = [
  'phone', 'touch', 'console-errors', 'dial', 'keyboard-focus', 'share-links', 'serve', 'grimoire', 'cellar',
  'analysis', 'undo', 'recipe-card', 'reduced-motion', 'shelf-pour',
].map((name) => new RegExp(`${name}\\.spec\\.ts$`));

/** One mobile WebKit project: a device from Playwright's list, only the specs that have a touch version. */
const mobile = (name: string, device: string, extra: Partial<Project> = {}): Project => ({
  name,
  use: { ...devices[device] },
  testMatch: [...TOUCH_SPECS, ...(extra.testMatch as RegExp[] ?? [])],
  testIgnore: extra.testIgnore,
  grepInvert: /@desktop|@emulated/,
});

/** The size the desktop projects run at. Specs that need another size set it per describe. */
const DESKTOP = { width: 1440, height: 900 };

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
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP, permissions: ['clipboard-read', 'clipboard-write'] },
      grepInvert: /@device/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: DESKTOP },
      grepInvert: /@device/,
    },
    // Mobile Safari, run in the Playwright container (test:e2e:mobile). hasTouch switches on (pointer: coarse) and
    // (hover: none), isMobile gives the touch viewport.
    mobile('webkit-iphone', 'iPhone 15'),
    mobile('webkit-iphone-se', 'iPhone SE (3rd gen)'),
    mobile('webkit-iphone-landscape', 'iPhone 15 landscape'), // the phone landscape layout
    mobile('webkit-ipad', 'iPad Pro 11', { testMatch: [/portrait\.spec\.ts$/] }), // the tablet layout with the dock
    mobile('webkit-ipad-landscape', 'iPad Pro 11 landscape', { testIgnore: /phone\.spec\.ts$/ }), // the desktop layout with touch: no dock, so no phone spec
  ],
  webServer: {
    command: `npx vite build --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --host localhost --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
