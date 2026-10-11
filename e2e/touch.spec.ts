import { test, expect, EMPTY, MAI_TAI, NEGRONI, bottle, brewNamed, closeSheet, copied, dial, dialog, settled, storedPot, stubShare, toast, toastAction } from './fixtures';
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
