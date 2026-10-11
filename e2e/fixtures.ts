import { test as base, expect, type Locator, type Page } from '@playwright/test';

/** The persisted pot (localStorage key stewy.v2). */
export interface PotState {
  unit: string;
  brew: { id: string; ml: number }[];
  name: string;
}

export const EMPTY: PotState = { unit: 'oz', brew: [], name: 'Untitled brew' };
export const NEGRONI: PotState = {
  unit: 'oz',
  brew: [{ id: 'gin', ml: 30 }, { id: 'campari', ml: 30 }, { id: 'sweet_vermouth', ml: 30 }, { id: 'orange_slice', ml: 3 }],
  name: 'Negroni',
};
export const MAI_TAI: PotState = {
  unit: 'oz',
  brew: [
    { id: 'white_rum', ml: 40 }, { id: 'dark_rum', ml: 20 }, { id: 'triple_sec', ml: 15 },
    { id: 'orgeat', ml: 15 }, { id: 'lime_juice', ml: 20 }, { id: 'mint', ml: 8 },
  ],
  name: 'Mai Tai',
};
export const MOJITO: PotState = {
  unit: 'ml',
  brew: [
    { id: 'white_rum', ml: 45 }, { id: 'lime_juice', ml: 25 }, { id: 'simple_syrup', ml: 15 },
    { id: 'mint', ml: 8 }, { id: 'soda_water', ml: 60 },
  ],
  name: 'Mojito',
};
export const CURDLED_TOPPED: PotState = {
  unit: 'ml',
  brew: [{ id: 'heavy_cream', ml: 30 }, { id: 'lime_juice', ml: 25 }, { id: 'mezcal', ml: 30 }, { id: 'ginger_beer', ml: 120 }],
  name: 'Untitled brew',
};

export interface OpenOptions {
  /** Share-link fragment, with the leading #. */
  hash?: string;
  /** Items for the Cellar (localStorage key stewy.cellar.v1). */
  cellar?: unknown[];
}

interface Fixtures {
  /** Console messages that are expected and must not fail the test. */
  ignoreConsole: RegExp[];
  /** Fails the test when the page logs an error or warning, or throws. */
  consoleGuard: void;
  /** Seeds localStorage once per context and loads the app. */
  open: (state?: PotState | string, options?: OpenOptions) => Promise<void>;
}

declare global {
  interface Window {
    __clip?: string;
  }
}

export const test = base.extend<Fixtures>({
  ignoreConsole: [[], { option: true }],

  consoleGuard: [
    async ({ page, ignoreConsole }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error' && m.type() !== 'warning') return;
        const text = m.text();
        if (ignoreConsole.some((re) => re.test(text))) return;
        problems.push(`${m.type()}: ${text.slice(0, 300)}`);
      });
      await use();
      expect(problems, 'console errors and warnings').toEqual([]);
    },
    { auto: true },
  ],

  open: async ({ page }, use) => {
    await use(async (state = EMPTY, options = {}) => {
      // Seed once per context: a reload or a second page load must keep what the app saved since.
      const items: [string, string][] = [['stewy.v2', typeof state === 'string' ? state : JSON.stringify(state)]];
      if (options.cellar) items.push(['stewy.cellar.v1', JSON.stringify(options.cellar)]);
      await page.addInitScript((seed: [string, string][]) => {
        if (sessionStorage.getItem('__seeded')) return;
        sessionStorage.setItem('__seeded', '1');
        for (const [k, v] of seed) localStorage.setItem(k, v);
      }, items);
      // Remember what the app copies: WebKit refuses clipboard reads, Chromium also gets the real clipboard.
      await page.addInitScript(() => {
        const clip = navigator.clipboard;
        const write = clip?.writeText?.bind(clip);
        if (!clip || !write) return;
        Object.defineProperty(clip, 'writeText', {
          configurable: true,
          value: async (text: string) => {
            window.__clip = text;
            await write(text).catch(() => undefined);
          },
        });
      });
      await page.goto('/' + (options.hash ?? ''));
      await expect(page.locator('.topbar').first()).toBeVisible();
    });
  },
});

export { expect };

// ---------------------------------------------------------------- locators and helpers

/** Ingredient rows on the recipe card. */
export const rows = (page: Page) => page.locator('.rc__rows .row');
export const toast = (page: Page) => page.locator('.ui-toast__msg').first();
export const bottle = (page: Page, id: string) => page.locator(`[data-bottle="${id}"]`).first();
export const pill = (page: Page, name: string) => page.locator(`.pill[aria-label^="${name},"]`);
export const dialog = (page: Page) => page.locator('[role=dialog]');
export const dial = (page: Page) => page.locator('[role=slider]');
export const pourButton = (page: Page) => page.getByRole('button', { name: 'Pour into the pot' });
export const toastAction = (page: Page) => page.locator('.ui-toast__action');

/** Opens a shelf tab by its visible name (Spirits, Liqueurs, Extras, Garnish ...). */
export async function shelfTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name: new RegExp('^' + name) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/** The pot as the app persisted it. */
export const storedPot = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('stewy.v2') ?? 'null') as { unit: string; brew: { id: string; ml: number }[]; name: string });

/** Cellar items as the app persisted them. */
export const storedCellar = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('stewy.cellar.v1') ?? '[]') as unknown[]);

/** The last text the app copied. Chromium reads the real clipboard; WebKit reads what the app handed to it. */
export async function copied(page: Page): Promise<string> {
  const browserName = page.context().browser()?.browserType().name();
  if (browserName === 'chromium') return page.evaluate(() => navigator.clipboard.readText());
  return page.evaluate(() => window.__clip ?? '');
}

/** Number in the Score aria-label, e.g. "Score 90, Legendary elixir". */
export async function scoreOf(scope: Locator): Promise<number> {
  const label = await scope.locator('[aria-label^="Score "]').first().getAttribute('aria-label');
  return Number(label?.match(/Score (\d+)/)?.[1]);
}

/** Waits for the entrance animations to finish so geometry reads are stable. */
export async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== 'running'));
}
