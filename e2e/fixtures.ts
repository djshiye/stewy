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
export const GRASSHOPPER: PotState = {
  unit: 'oz',
  brew: [{ id: 'creme_de_menthe', ml: 30 }, { id: 'creme_de_cacao', ml: 30 }, { id: 'heavy_cream', ml: 30 }],
  name: 'Grasshopper',
};
export const BRAMBLE: PotState = {
  unit: 'oz',
  brew: [{ id: 'gin', ml: 40 }, { id: 'lemon_juice', ml: 15 }, { id: 'simple_syrup', ml: 10 }, { id: 'blackberry_liqueur', ml: 15 }],
  name: 'Bramble',
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
  /** Navigation milestone to wait for; 'commit' returns as soon as the response arrives (cold-start checks). */
  waitUntil?: 'commit' | 'domcontentloaded' | 'load';
}

interface Fixtures {
  /** Console messages that are expected and must not fail the test. */
  ignoreConsole: RegExp[];
  /** Fails the test when the page logs an error or warning, or throws. */
  consoleGuard: void;
  /** Seeds localStorage once per context and loads the app. */
  open: (state?: PotState | string, options?: OpenOptions) => Promise<void>;
  /** Taps on a touch context, clicks otherwise. */
  press: (target: Locator) => Promise<void>;
  /** Opens the Grimoire: the top bar button on touch, the G key otherwise. Waits for the dialog. */
  openGrimoire: () => Promise<void>;
  /** Opens the Cellar: the top bar button on touch, the C key otherwise. Waits for the dialog. */
  openCellar: () => Promise<void>;
  /** Opens Serve: the dock or recipe card button on touch, the S key otherwise. Waits for the dialog. */
  openServe: () => Promise<void>;
  /** Undo and redo: the top bar buttons on touch, Ctrl+Z and Ctrl+Y otherwise. */
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

declare global {
  interface Window {
    __clip?: string;
  }
}

/**
 * True where there is no keyboard to speak of: a touch context in the phone or tablet layout (under 1000 wide).
 * An iPad in landscape has the desktop layout and, in practice, a keyboard case, so hotkeys still apply there.
 * Use as test.skip(noKeyboard, 'reason').
 */
export const noKeyboard = ({ hasTouch, viewport }: { hasTouch: boolean; viewport: { width: number; height: number } | null }) =>
  hasTouch && (viewport?.width ?? Infinity) < 1000;

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
        if (!location.protocol.startsWith('http') || sessionStorage.getItem('__seeded')) return;
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
      await page.goto('/' + (options.hash ?? ''), { waitUntil: options.waitUntil ?? 'load' });
      await expect(page.locator('.topbar').first()).toBeVisible();
      // let React's passive effects (hotkeys, listeners) run before a test starts typing
      await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 0))));
    });
  },

  press: async ({ hasTouch }, use) => {
    await use(async (target) => {
      if (hasTouch) await target.tap();
      else await target.click();
    });
  },

  openGrimoire: async ({ page, hasTouch }, use) => {
    await use(async () => {
      if (hasTouch) await page.locator('.topbar').getByRole('button', { name: /^Grimoire/ }).tap();
      else await page.keyboard.press('g');
      await expect(page.locator('[role=dialog]')).toHaveCount(1);
    });
  },

  openCellar: async ({ page, hasTouch }, use) => {
    await use(async () => {
      if (hasTouch) await page.locator('.topbar').getByRole('button', { name: /^Cellar/ }).tap();
      else await page.keyboard.press('c');
      await expect(page.locator('[role=dialog]')).toHaveCount(1);
    });
  },

  openServe: async ({ page, hasTouch }, use) => {
    await use(async () => {
      if (hasTouch) await page.getByRole('button', { name: /^Serve/ }).first().tap();
      else await page.keyboard.press('s');
      await expect(page.locator('[role=dialog]')).toHaveCount(1);
    });
  },

  undo: async ({ page, hasTouch }, use) => {
    await use(async () => {
      if (hasTouch) await page.locator('.topbar').getByRole('button', { name: 'Undo' }).tap();
      else await page.keyboard.press('Control+z');
    });
  },

  redo: async ({ page, hasTouch }, use) => {
    await use(async () => {
      if (hasTouch) await page.locator('.topbar').getByRole('button', { name: 'Redo' }).tap();
      else await page.keyboard.press('Control+y');
    });
  },
});

export { expect };

// ---------------------------------------------------------------- locators and helpers

/** Ingredient rows on the recipe card. */
export const rows = (page: Page) => page.locator('.rc__rows .row');
/** The brew's name as shown: the recipe card heading on desktop, the summary under the pot on phones. */
export const brewNamed = (page: Page, name: string) => page.locator('.bs__name, .rc h2').filter({ hasText: name }).first();
export const toast = (page: Page) => page.locator('.ui-toast__msg').first();
export const bottle = (page: Page, id: string) => page.locator(`[data-bottle="${id}"]`).first();
export const pill = (page: Page, name: string) => page.locator(`.pill[aria-label^="${name},"]`);
export const dialog = (page: Page) => page.locator('[role=dialog]');
export const dial = (page: Page) => page.locator('[role=slider]');
export const pourButton = (page: Page) => page.getByRole('button', { name: 'Pour into the pot' });
export const toastAction = (page: Page) => page.locator('.ui-toast__action');

/**
 * Gives the page a navigator.share that rejects with the named error ('NotAllowedError' is what Safari throws
 * when the call is not inside a tap), or removes it ('absent'), before the app loads. Call before open().
 */
export async function stubShare(page: Page, mode: 'absent' | 'NotAllowedError' | 'AbortError'): Promise<void> {
  await page.addInitScript((m) => {
    if (m === 'absent') {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
      return;
    }
    Object.defineProperty(navigator, 'share', { configurable: true, value: () => Promise.reject(new DOMException('stubbed', m)) });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  }, mode);
}

/** Opens a shelf tab by its visible name (Spirits, Liqueurs, Extras, Garnish ...). */
export async function shelfTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name: new RegExp('^' + name) });
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) await tab.tap();
  else await tab.click();
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

/**
 * Drags a shelf bottle with the real mouse. Stops short of the pot by default so the ghost can be inspected;
 * `drop` releases over the pot.
 */
export async function dragBottle(page: Page, id: string, to: 'pot' | { x: number; y: number }, drop: boolean): Promise<{ x: number; y: number }> {
  const from = bottle(page, id).locator('.bottle__art');
  await expect(from).toBeVisible();
  await settled(page);
  const b = (await from.boundingBox())!;
  let target: { x: number; y: number };
  if (to === 'pot') {
    const pot = (await page.locator('.stage [role=img]').first().boundingBox())!;
    target = { x: pot.x + pot.width / 2, y: pot.y + pot.height * 0.4 };
  } else {
    target = to;
  }
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y - 60, { steps: 6 });
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await expect(page.locator('.drag-ghost')).toHaveCount(1);
  if (drop) await page.mouse.up();
  return target;
}

/** Waits for an open sheet to take focus: its key handlers are attached in the same step. */
export const sheetReady = (page: Page) => expect(page.locator('[role=dialog]:focus-within')).toHaveCount(1);

/** Closes the topmost sheet with Escape once it is ready. */
export async function closeSheet(page: Page): Promise<void> {
  await sheetReady(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
}

/**
 * Finishes the animations that have an end (the sheet scaling in, the cells sliding up), so geometry is measured on the
 * settled layout. Headless WebKit in the container draws a frame only when something forces one, so they can sit pending.
 */
export async function finishAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const a of document.getAnimations()) if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish();
  });
}

/**
 * The Grimoire opens scrolled to the classic in the pot, on a whole row: no cell is cut by the top edge, and the
 * classic is in view (the whole cell when `wholeCell`, else at least its "In the pot" badge). The sheet re-aims
 * while it settles, so this polls. Tolerances are 2 to 3 px for sub-pixel zoom.
 */
export async function expectGrimoireOnWholeRow(page: Page, wholeCell: boolean): Promise<void> {
  await page.keyboard.press('g');
  await expect(page.locator('.grim-cell__pot')).toBeVisible();
  await expect.poll(async () =>
    page.evaluate((whole) => {
      // Headless WebKit in the container draws a frame only when something forces one, so the entrance animations
      // (a cell 8px low, the sheet at 0.96) can sit pending and skew the rects. Measure the settled layout.
      for (const a of document.getAnimations()) if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish();
      const scroller = document.querySelector('.grim__scroll')!.getBoundingClientRect();
      const badge = document.querySelector('.grim-cell__pot')!.getBoundingClientRect();
      const cell = document.querySelector('.grim-cell__pot')!.closest('.grim-cell')!.getBoundingClientRect();
      const cutAtTop = [...document.querySelectorAll('.grim-cell')].filter((c) => {
        const r = c.getBoundingClientRect();
        return r.top < scroller.top - 3 && r.bottom > scroller.top + 3;
      }).length;
      const box = whole ? cell : badge;
      return { inView: box.top >= scroller.top - 2 && box.bottom <= scroller.bottom + 2, cutAtTop };
    }, wholeCell),
  ).toEqual({ inView: true, cutAtTop: 0 });
}

/**
 * The Grimoire, opened on an empty pot, shows its first two rows whole (every cell of both rows lies inside the
 * scroller) before any scrolling. Animations finish first, as in expectGrimoireOnWholeRow. Tolerance 2 px.
 */
export async function expectGrimoireTwoWholeRows(page: Page): Promise<void> {
  await page.keyboard.press('g');
  await expect(page.locator('.grim-cell').first()).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => {
      for (const a of document.getAnimations()) if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish();
      const scroller = document.querySelector('.grim__scroll')!.getBoundingClientRect();
      const cells = [...document.querySelectorAll('.grim-cell')].slice(0, 8).map((c) => c.getBoundingClientRect());
      const columns = new Set(cells.map((r) => Math.round(r.left))).size;
      return {
        columns,
        whole: cells.map((r) => r.top >= scroller.top - 2 && r.bottom <= scroller.bottom + 2),
      };
    }),
  ).toEqual({ columns: 4, whole: Array(8).fill(true) });
}
