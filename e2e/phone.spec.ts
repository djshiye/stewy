import { test, expect, EMPTY, NEGRONI, bottle, dial, dialog, pourButton, rows, shelfTab, closeSheet } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

test('the dock and its hint are on screen', async ({ page, open }) => {
  await open(EMPTY);
  await expect(page.locator('.dock')).toBeVisible();
  await expect(page.getByText('Tap a bottle below to pour')).toBeVisible();
});

test('tapping a bottle opens the dial as a bottom sheet and Pour adds a row', async ({ page, open }) => {
  await open(EMPTY);
  await bottle(page, 'gin').tap();
  await expect(dial(page)).toBeVisible();
  await expect.poll(async () => {
    const box = await dialog(page).first().boundingBox();
    return box ? Math.abs(box.y + box.height - 844) : Infinity;
  }, 'the sheet settles against the bottom edge').toBeLessThan(4);
  expect((await dialog(page).first().boundingBox())!.y).toBeGreaterThan(100);
  await pourButton(page).tap();
  await expect(rows(page)).toHaveCount(1);

  await shelfTab(page, 'Liqueurs');
  await bottle(page, 'campari').tap();
  await pourButton(page).tap();
  await expect(rows(page)).toHaveCount(2);
});

test('Serve from the dock keeps its three actions on one row', async ({ page, open }) => {
  await open(NEGRONI);
  await page.locator('.dock').getByRole('button', { name: /^Serve/ }).first().tap();
  await expect(page.getByRole('button', { name: 'Save to the Cellar' })).toBeVisible();
  await expect.poll(async () => {
    const ys: number[] = [];
    for (const n of ['Save to the Cellar', 'Share link', 'Copy recipe']) {
      const b = await page.getByRole('button', { name: n }).boundingBox();
      ys.push(b ? Math.round(b.y) : -1);
    }
    return ys.every((y) => y > 0 && Math.abs(y - ys[0]) <= 4);
  }).toBe(true);
  await closeSheet(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a toast sits above the dock', async ({ page, open }) => {
  await open(NEGRONI);
  await page.locator('.row__remove').first().tap();
  const toast = page.locator('.ui-toast');
  await expect(toast).toBeVisible();
  await expect.poll(async () => {
    const t = await toast.boundingBox();
    const d = await page.locator('.dock').boundingBox();
    return t && d ? Math.round(d.y - (t.y + t.height)) : -999;
  }).toBeGreaterThanOrEqual(-2);
});

test('the unit control is reachable by touch', async ({ page, open }) => {
  await open(NEGRONI);
  await page.getByRole('radio', { name: /parts/i }).first().tap();
  await expect(page.getByRole('radio', { name: /parts/i }).first()).toBeChecked();
});
