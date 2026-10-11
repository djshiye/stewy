import { test, expect, BRAMBLE, GRASSHOPPER, expectGrimoireOnWholeRow, expectGrimoireTwoWholeRows, bottle, dialog, pourButton, rows, toast, EMPTY, closeSheet } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const options = (page: import('@playwright/test').Page) => page.locator('[role=option]');
/** The sheet's close button and the title share a centre line. Animations finish first: the sheet scales in from 0.96. */
async function expectCloseCentred(page: import('@playwright/test').Page) {
  const gap = await page.evaluate(() => {
    for (const a of document.getAnimations()) if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish();
    const mid = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return r.top + r.height / 2;
    };
    return Math.abs(mid('.ui-sheet__close') - mid('.grim__title h2'));
  });
  expect(gap).toBeLessThan(1.5);
}

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
  // a one-line header (title, count, search) with the chips below, at every desktop size: short windows, the
  // 1080p and 1024-tall windows (the sheet is 760px from 824 tall up, the stacked header left 1.86 rows), the
  // sizes the zoom ladder scales (2560 x 1440 reads 1600 x 900), and the portrait monitors (narrow rules, zoom)
  for (const [width, height] of [
    [1280, 720], [1366, 768], [1280, 800], [1536, 864], [1024, 768], [1440, 900], [1000, 720], [1280, 823], [1280, 824],
    [1920, 1080], [1280, 1024], [1680, 1050], [2560, 1440], [3840, 2160],
    [1024, 1366], [1024, 1266], [1000, 1200], [1440, 2560], [2160, 3840],
  ]) {
    test(`${width} x ${height}`, async ({ page, open }) => {
      await page.setViewportSize({ width, height });
      await open(EMPTY);
      await expectGrimoireTwoWholeRows(page);
      await expect(page.getByRole('textbox', { name: /Search by name/ })).toBeFocused();
    });
  }

  // a viewport a little over two rows could not scroll far enough to put the last row on a boundary
  for (const [width, height] of [[1280, 720], [1366, 768], [1920, 1080], [1280, 1024], [1024, 1366], [2560, 1440]]) {
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

  // 'After dinner' wrapped to a second line at 1024 x 1366, and in the portrait zoom ladder (media queries see the
  // physical width there, so the 1280-and-wider rules applied to a layout about 1100 CSS px wide)
  for (const [width, height] of [[1000, 800], [1024, 768], [1024, 1366], [1000, 1200], [1440, 2560], [2160, 3840], [1280, 720], [1920, 1080]]) {
    test(`the chips stay on one line at ${width} x ${height}`, async ({ page, open }) => {
      await page.setViewportSize({ width, height });
      await open(EMPTY);
      await page.keyboard.press('g');
      await expect(options(page).first()).toBeVisible();
      const tops = await page.locator('.grim-chip').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      const last = await page.locator('.grim-chip').last().evaluate((el) => el.getBoundingClientRect().right);
      const main = await page.locator('.grim__main').evaluate((el) => el.getBoundingClientRect().right);
      expect(last).toBeLessThanOrEqual(main);
    });
  }

  // the sheet's close button is centred on the header's title row
  for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080], [1024, 1366], [1000, 800]]) {
    test(`the close button is centred on the title row at ${width} x ${height}`, async ({ page, open }) => {
      await page.setViewportSize({ width, height });
      await open(EMPTY);
      await page.keyboard.press('g');
      await expect(options(page).first()).toBeVisible();
      await expectCloseCentred(page);
    });
  }

  // the count sits beside the title and changes as you type; the search must not move under the caret
  for (const [width, height] of [[1000, 800], [1024, 768], [1280, 720]]) {
    test(`the search keeps its box while the count changes at ${width} x ${height}`, async ({ page, open }) => {
      await page.setViewportSize({ width, height });
      await open(EMPTY);
      await page.keyboard.press('g');
      await expect(options(page).first()).toBeVisible();
      const box = () =>
        // layout offsets, so the sheet's opening scale does not read as a shift
        page.locator('.grim__search').evaluate((el) => [(el as HTMLElement).offsetLeft, (el as HTMLElement).offsetWidth]);
      const rest = await box();
      await page.keyboard.press('n');
      await expect(page.locator('.grim__title p')).toContainText(' of ');
      expect(await box()).toEqual(rest);
      await page.keyboard.type('eg');
      await expect(page.locator('.grim__title p')).toContainText(/^\d of /);
      expect(await box()).toEqual(rest);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Sours' }).click();
      await expect(page.locator('.grim__title p')).toContainText(' of ');
      expect(await box()).toEqual(rest);
    });
  }
});

test.describe('the detail pane on a short desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('a usual classic fits without scrolling, and a long build scrolls under a fade', async ({ page, open }) => {
    await open(EMPTY);
    await page.keyboard.press('g');
    const pane = page.locator('.grim-detail__scroll');
    await options(page).filter({ hasText: 'Margarita' }).first().click();
    await expect(pane).toBeVisible();
    const over = () => pane.evaluate((el) => el.scrollHeight - el.clientHeight);
    await expect.poll(over).toBeLessThanOrEqual(1);
    await expect(pane).not.toHaveAttribute('data-more-below', '');
    // the longest build overflows: the bottom edge fades until it is scrolled to the end
    await options(page).filter({ hasText: 'Ramos Gin Fizz' }).first().click();
    await expect.poll(over).toBeGreaterThan(8);
    await expect(pane).toHaveAttribute('data-more-below', '');
    await pane.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(pane).not.toHaveAttribute('data-more-below', '');
  });
});

test.describe('the autofocus target follows the input capability', () => {
  test.describe('a mouse', () => {
    test.use({ viewport: { width: 1280, height: 800 } });
    test('focuses the search field', async ({ page, open }) => {
      await open(EMPTY);
      await page.keyboard.press('g');
      await expect(page.getByRole('textbox', { name: /Search by name/ })).toBeFocused();
    });
  });

  // a context with hasTouch switches on (pointer: coarse) and (hover: none), like an iPad with the desktop layout
  test.describe('touch', () => {
    test.use({ hasTouch: true, viewport: { width: 1280, height: 800 } });

    test('focuses the title, so the keyboard stays down', async ({ page, open }) => {
      await open(EMPTY);
      expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
      await page.keyboard.press('g');
      await expect(options(page).first()).toBeVisible();
      await expect(page.locator('#grimoire-title')).toBeFocused();
      await expect(page.getByRole('textbox', { name: /Search by name/ })).not.toBeFocused();
    });

    test('the search field is 44px tall with 16px type, and the header still leaves two whole rows', async ({ page, open }) => {
      await open(EMPTY);
      await expectGrimoireTwoWholeRows(page);
      const search = await page.locator('.grim__search').evaluate((el) => (el as HTMLElement).offsetHeight); // layout size: the sheet may still be scaling in
      expect(search).toBeGreaterThanOrEqual(44);
      const font = await page.locator('.grim__search input').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(font).toBeGreaterThanOrEqual(16);
    });
  });

  test.describe('touch on the shortest desktop window', () => {
    test.use({ hasTouch: true, viewport: { width: 1280, height: 720 } });
    test('the 44px search still leaves two whole rows, and the close button is centred', async ({ page, open }) => {
      await open(EMPTY);
      await expectGrimoireTwoWholeRows(page);
      await expectCloseCentred(page);
    });
  });
});
