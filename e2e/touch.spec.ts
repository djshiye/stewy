import { test, expect, EMPTY, MAI_TAI, NEGRONI, bottle, brewNamed, closeSheet, copied, dial, dialog, finishAnimations, settled, storedPot, stubShare, toast, toastAction } from './fixtures';
import type { Page } from '@playwright/test';

// Touch-only checks, run by the mobile WebKit projects (iPhone, iPhone SE, iPhone landscape, iPad, iPad landscape):
// what the Safari and iOS fixes promise, in the context where it applies. The desktop projects skip this file.

test.describe('touch contexts', { tag: '@device' }, () => {
  test('the context is touch: a coarse pointer and no hover', async ({ page, open }) => {
    await open(EMPTY);
    expect(await page.evaluate(() => [matchMedia('(pointer: coarse)').matches, matchMedia('(hover: none)').matches])).toEqual([true, true]);
  });

  // ------------------------------------------------------------ the page behind a sheet

  for (const name of ['Grimoire', 'Cellar'] as const) {
    test(`the ${name} locks the page behind it and the scroll position survives closing`, async ({ page, open, press }) => {
      await open(NEGRONI);
      const scrollable = await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight);
      const y = Math.min(300, scrollable);
      const button = page.locator('.topbar').getByRole('button', { name: new RegExp(`^${name}`) });
      if (y > 0) {
        // the top bar scrolls away with the page and a tap would scroll it back: click the button in the page
        await page.evaluate((to) => window.scrollTo(0, to), y);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
        await button.evaluate((el) => (el as HTMLElement).click());
      } else {
        await press(button); // the desktop layout of an iPad in landscape does not scroll
      }
      await expect(dialog(page)).toBeVisible();
      // Mobile WebKit has no wheel and Playwright cannot swipe, so what can be checked is the lock itself: the root and
      // the body are held while the sheet is open, and the page is where it was
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'the root is locked').toBe('hidden');
      expect(await page.evaluate(() => document.body.classList.contains('is-locked'))).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBe(y);
      await closeSheet(page);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'and unlocked again').toBe('visible');
      expect(await page.evaluate(() => window.scrollY)).toBe(y);
    });
  }

  // ------------------------------------------------------------ the Grimoire's focus

  test('the Grimoire opens with focus on its heading, so the keyboard stays down', async ({ page, open, openGrimoire }) => {
    await open(EMPTY);
    await openGrimoire();
    await expect(page.locator('[role=option]').first()).toBeVisible();
    await expect(page.locator('#grimoire-title')).toBeFocused();
    await expect(page.getByRole('textbox', { name: /Search by name/ })).not.toBeFocused();
  });

  // ------------------------------------------------------------ a classic picked in the Grimoire stays in view

  // The first tap selects a classic and a bar names it (under the index, or beside it on a phone in landscape). The
  // picked cell must then lie whole inside the index, clear of the bar, and a second tap on it must reach it (it
  // opens the details). On an iPhone 15 in landscape the cell used to sit under the bar and the tap hit the bar.
  for (const where of ['in the first row', 'low in the index']) {
    test(`a classic picked ${where} stays whole above the bar, and a second tap reaches it`, async ({ page, open, openGrimoire, press, viewport }) => {
      test.skip(!viewport || viewport.width >= 1000, 'the desktop layout shows the details in a pane, not in a bar');
      await open(EMPTY);
      await openGrimoire();
      const cells = page.locator('[role=option]');
      await expect(cells.first()).toBeVisible();
      await finishAnimations(page);
      const rect = (selector: string, index?: number) =>
        page.evaluate(([s, i]) => {
          const el = document.querySelectorAll(s as string)[(i as number | undefined) ?? 0];
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        }, [selector, index] as const);

      // the sheet slides in with a script-driven spring that finishAnimations cannot end, and headless WebKit draws a
      // frame only on demand: ask for frames until the index has stood still for five of them
      await page.evaluate(
        () =>
          new Promise<void>((done) => {
            const el = document.querySelector('.grim__scroll')!;
            let prev = '';
            let still = 0;
            const tick = () => {
              const r = el.getBoundingClientRect();
              const now = `${r.top}|${r.left}|${r.height}`;
              still = now === prev ? still + 1 : 0;
              prev = now;
              if (still >= 5) done();
              else requestAnimationFrame(tick);
            };
            tick();
          }),
      );

      // the cell to pick: the first, or one low in the index: the last that the bottom edge cuts, else the last whose
      // bottom the bar will take (the bar under the index shortens it by the bar's height)
      let pick = 0;
      if (where === 'in the first row') {
        await press(cells.nth(pick));
      } else {
        pick = await page.evaluate(() => {
          const edge = document.querySelector('.grim__scroll')!.getBoundingClientRect().bottom;
          const rects = [...document.querySelectorAll('.grim-cell')].map((c) => c.getBoundingClientRect());
          const tappable = (r: DOMRect) => r.top < edge - 24;
          const cut = rects.map((r, i) => (tappable(r) && r.bottom > edge + 8 ? i : -1)).filter((i) => i >= 0);
          const low = rects.map((r, i) => (tappable(r) && r.bottom > edge - 100 ? i : -1)).filter((i) => i >= 0);
          return (cut.length ? cut : low).at(-1) ?? -1;
        });
        expect(pick, 'a cell low in the index').toBeGreaterThan(0);
        // tap the part of it that shows, with no scrolling first, as a finger would
        const r = (await rect('.grim-cell', pick))!;
        const view = (await rect('.grim__scroll'))!;
        await page.touchscreen.tap((r.left + r.right) / 2, (Math.max(r.top, view.top) + Math.min(r.bottom, view.bottom)) / 2);
      }
      await expect(page.locator('.grim-bar')).toBeVisible();
      await expect(cells.nth(pick)).toHaveAttribute('aria-selected', 'true');
      await expect.poll(async () => {
        await finishAnimations(page);
        const [cell, view, bar, head] = await Promise.all([
          rect('.grim-cell[aria-selected=true]'), rect('.grim__scroll'), rect('.grim-bar'), rect('.grim__chips'),
        ]);
        if (!cell || !view || !bar || !head) return 'missing';
        const inside = cell.top >= view.top - 1 && cell.bottom <= view.bottom + 1 && cell.left >= view.left - 1 && cell.right <= view.right + 1;
        const clear = cell.bottom <= bar.top + 1 || cell.right <= bar.left + 1; // above the bar, or left of it
        // and the pick lands on a row boundary: no sliver of the row above under the header
        const cutAtTop = await page.evaluate(() => {
          const top = document.querySelector('.grim__scroll')!.getBoundingClientRect().top;
          return [...document.querySelectorAll('.grim-cell')].filter((c) => {
            const r = c.getBoundingClientRect();
            return r.top < top - 3 && r.bottom > top + 3;
          }).length;
        });
        return { below: view.top >= head.bottom - 1, inside, clear, cutAtTop };
      }, 'the picked cell is whole, below the header and clear of the bar').toEqual({ below: true, inside: true, clear: true, cutAtTop: 0 });

      await press(cells.nth(pick)); // Playwright refuses a tap that lands on another element, such as the bar
      await expect(page.locator('.grim__overlay')).toBeVisible();
    });
  }

  // ------------------------------------------------------------ text fields are 16px or more (iOS zooms the page into smaller ones)

  const fontSize = (page: Page, selector: string) =>
    page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  /** The shelf search: a button opens it in the dock, the desktop layout shows it in the shelf's back bar. */
  async function openShelfSearch(page: Page, press: (l: import('@playwright/test').Locator) => Promise<void>) {
    const input = page.locator('input[aria-label="Search ingredients"]');
    if (!(await input.isVisible())) await press(page.getByRole('button', { name: 'Search ingredients' }));
    await expect(input).toBeVisible();
    return input;
  }

  test('the shelf search is at least 16px', async ({ page, open, press }) => {
    await open(EMPTY);
    await openShelfSearch(page, press);
    expect(await fontSize(page, 'input[aria-label="Search ingredients"]')).toBeGreaterThanOrEqual(16);
  });

  test('the Grimoire search is at least 16px', async ({ page, open, openGrimoire }) => {
    await open(EMPTY);
    await openGrimoire();
    await expect(page.getByRole('textbox', { name: /Search by name/ })).toBeVisible();
    expect(await fontSize(page, '.grim__search input')).toBeGreaterThanOrEqual(16);
  });

  test('the brew name field on the recipe card is at least 16px', async ({ page, open, press }) => {
    await open(NEGRONI);
    await press(page.locator('button.rc__title')); // named Rename on phones, the brew name on the desktop layout
    await expect(page.getByRole('textbox', { name: 'Brew name' })).toBeVisible();
    expect(await fontSize(page, 'input[aria-label="Brew name"]')).toBeGreaterThanOrEqual(16);
  });

  test('the Cellar rename field is at least 16px', async ({ page, open, openCellar, press }) => {
    const cellar = [{ id: 'a', name: 'Alpha', brew: NEGRONI.brew, score: 80, color: null, savedAt: new Date(Date.UTC(2026, 0, 3, 12)).toISOString() }];
    await open(NEGRONI, { cellar });
    await openCellar();
    await press(dialog(page).getByRole('button', { name: /^Rename/ }));
    await expect(page.locator('.cellar-row__input')).toBeVisible();
    expect(await fontSize(page, '.cellar-row__input')).toBeGreaterThanOrEqual(16);
  });

  // ------------------------------------------------------------ the shelf search by touch

  test('searching the shelf by touch filters the bottles', async ({ page, open, press }) => {
    await open(EMPTY);
    const input = await openShelfSearch(page, press);
    await input.fill('rum');
    await expect.poll(() => page.locator('.bottle:visible').count()).toBeGreaterThanOrEqual(3);
    await input.fill('');
  });

  // ------------------------------------------------------------ no sideways scrolling

  const overflowX = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollWidth - innerWidth);

  for (const state of [EMPTY, NEGRONI, MAI_TAI]) {
    test(`the page does not scroll sideways (${state.name})`, async ({ page, open }) => {
      await open(state);
      await settled(page);
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
    });
  }

  test('the page does not scroll sideways with a sheet open', async ({ page, open, openGrimoire, openCellar, openServe, press }) => {
    await open(MAI_TAI, { cellar: [{ id: 'a', name: 'Alpha', brew: MAI_TAI.brew, score: 80, color: null, savedAt: new Date(Date.UTC(2026, 0, 3, 12)).toISOString() }] });
    for (const openSheet of [openGrimoire, openCellar, openServe]) {
      await openSheet();
      await settled(page);
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
      await closeSheet(page);
    }
    await press(bottle(page, 'gin'));
    await expect(dial(page)).toBeVisible();
    await settled(page);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  // ------------------------------------------------------------ sharing from a touch device

  /** The share button: under the pot on phones and tablets, in the top bar on the desktop layout. */
  const shareButton = (page: Page) => page.getByRole('button', { name: 'Share this brew' }).first();

  test('when the share sheet fails, a Copy link toast appears and its action copies the link', async ({ page, open, press }) => {
    await stubShare(page, 'NotAllowedError');
    await open(NEGRONI);
    await press(shareButton(page));
    await expect(toast(page)).toHaveText(/Could not open sharing/);
    await expect(toastAction(page)).toHaveText('Copy link');
    expect(await copied(page), 'nothing is copied before the tap').toBe('');
    await press(toastAction(page));
    await expect(toast(page)).toHaveText(/Link copied/);
    expect(await copied(page)).toMatch(/#b=gin:/);
  });

  test('the Serve sheet Share link takes the same path', async ({ page, open, openServe, press }) => {
    await stubShare(page, 'NotAllowedError');
    await open(NEGRONI);
    await openServe();
    await press(page.getByRole('button', { name: 'Share link' }));
    await expect(toast(page)).toHaveText(/Could not open sharing/);
    await press(toastAction(page));
    await expect(toast(page)).toHaveText(/Link copied/);
    expect(await copied(page)).toMatch(/#b=/);
  });

  test('closing the share sheet is not an error: no toast, nothing copied', async ({ page, open, press }) => {
    await stubShare(page, 'AbortError');
    await open(NEGRONI);
    await press(shareButton(page));
    await page.waitForTimeout(400);
    await expect(toast(page)).toHaveCount(0);
    expect(await copied(page)).toBe('');
  });

  // ------------------------------------------------------------ the core flow, once per device

  test('tap a bottle, pour, and the row and the pot agree', async ({ page, open, press }) => {
    await open(EMPTY);
    await press(bottle(page, 'gin'));
    await expect(dial(page)).toBeVisible();
    await press(page.getByRole('button', { name: 'Pour into the pot' }));
    await expect.poll(async () => (await storedPot(page)).brew.map((b) => b.id)).toEqual(['gin']);
    await expect(brewNamed(page, 'Untitled brew')).toBeVisible();
  });
});
