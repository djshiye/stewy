import { test, expect, BRAMBLE, GRASSHOPPER, expectGrimoireOnWholeRow, expectGrimoireTwoWholeRows, bottle, dialog, pourButton, rows, toast, EMPTY, closeSheet } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const options = (page: import('@playwright/test').Page) => page.locator('[role=option]');
const count = (page: import('@playwright/test').Page) => page.locator('.grim__title p, .grim__head p[aria-live]').first();

test('G opens the Grimoire without typing into the search field', async ({ page, open }) => {
  await open({ unit: 'oz', brew: [{ id: 'gin', ml: 45 }], name: 'Untitled brew' });
  await page.locator('body').click({ position: { x: 700, y: 20 } });
  await page.keyboard.press('g');
  await expect(page.locator('[role=listbox][aria-label=Classics]')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Search by name/ })).toHaveValue('');
});

test('the classics count on the header matches the listed classics, and filters narrow it', async ({ page, open }) => {
  await open(EMPTY);
  await page.keyboard.press('g');
  await expect(options(page).first()).toBeVisible();
  const total = Number((await count(page).textContent())?.match(/^(\d+) classics/)?.[1]);
  expect(total).toBeGreaterThan(0);
  await expect(options(page)).toHaveCount(total);

  await page.getByRole('button', { name: /^Sours/ }).click();
  await expect(count(page)).toHaveText(new RegExp(`of ${total} classics`));
  const sours = await options(page).count();
  expect(sours).toBeGreaterThan(0);
  expect(sours).toBeLessThan(total);

  await page.getByRole('button', { name: /^All/ }).click();
  await expect(options(page)).toHaveCount(total);
});

test('selecting a classic and loading it replaces the pot, and Ctrl+Z restores it', async ({ page, open }) => {
  await open({ unit: 'oz', brew: [{ id: 'gin', ml: 45 }, { id: 'campari', ml: 30 }], name: 'Untitled brew' });
  await page.keyboard.press('g');
  await options(page).filter({ hasText: 'Negroni' }).first().click();
  await page.getByRole('button', { name: /into the pot/ }).first().click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(toast(page)).toHaveText(/Loaded Negroni/);
  await expect(page.locator('.rc h2').first()).toContainText('Negroni');

  await page.keyboard.press('Control+z');
  await expect(rows(page)).toHaveCount(2);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.rc h2').first()).toContainText('Negroni');
});

test('the dial still works after the Grimoire closed', async ({ page, open }) => {
  await open(EMPTY);
  await page.keyboard.press('g');
  await expect(options(page).first()).toBeVisible();
  await closeSheet(page);
  await bottle(page, 'gin').click();
  await pourButton(page).click();
  await expect(rows(page)).toHaveCount(1);
});

test.describe('opening with a classic in the pot', () => {
  test('a mid-list classic is in view and the first visible row is whole', async ({ page, open }) => {
    await open(BRAMBLE);
    await expectGrimoireOnWholeRow(page, true);
  });

  test('the last classic keeps its badge in view and the first visible row whole', async ({ page, open }) => {
    await open(GRASSHOPPER);
    await expectGrimoireOnWholeRow(page, false);
  });
});

test.describe('two whole rows of classics before any scrolling', () => {
  // the short-desktop sizes the header is folded for: a one-line header (title, count, search) with the chips below
  for (const [width, height] of [[1280, 720], [1366, 768], [1280, 800], [1536, 864], [1024, 768], [1440, 900]]) {
    test(`${width} x ${height}`, async ({ page, open }) => {
      await page.setViewportSize({ width, height });
      await open(EMPTY);
      await expectGrimoireTwoWholeRows(page);
      await expect(page.getByRole('textbox', { name: /Search by name/ })).toBeFocused();
    });
  }

  // a viewport a little over two rows could not scroll far enough to put the last row on a boundary
  for (const [width, height] of [[1280, 720], [1366, 768]]) {
    test(`the last classic stays in view on a whole row at ${width} x ${height}`, async ({ page, open }) => {
      await page.setViewportSize({ width, height });
      await open(GRASSHOPPER);
      await expectGrimoireOnWholeRow(page, true);
    });
  }

  test('the header is one line: title, count and search share a row, the chips sit below on one line', async ({ page, open }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(EMPTY);
    await page.keyboard.press('g');
    await expect(options(page).first()).toBeVisible();
    const mid = (selector: string, nth: 'first' | 'last' = 'first') =>
      page.locator(selector)[nth]().evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
    const [title, count, search, chip, lastChip] = await Promise.all([
      mid('.grim__title h2'),
      mid('.grim__title p'),
      mid('.grim__search'),
      mid('.grim-chip'),
      mid('.grim-chip', 'last'),
    ]);
    expect(Math.abs(title - search)).toBeLessThan(6);
    expect(Math.abs(count - title)).toBeLessThan(12);
    expect(chip).toBeGreaterThan(search + 30);
    expect(Math.abs(lastChip - chip)).toBeLessThan(2);
    await expect(page.locator('.grim__title p')).toBeVisible();
  });
});
