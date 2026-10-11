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

for (const [name, key] of [['Grimoire', 'g'], ['Cellar', 'c']] as const) {
  test(`a wheel over the ${name} scrim does not scroll the page behind it, and the position survives closing`, async ({ page, open }) => {
    await open(NEGRONI);
    await page.evaluate(() => window.scrollTo(0, 300));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
    await page.keyboard.press(key);
    await expect(dialog(page)).toBeVisible();
    await page.mouse.move(195, 30);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.scrollY), 'the page stays where it was').toBe(300);
    await closeSheet(page);
    expect(await page.evaluate(() => window.scrollY), 'and is still there after closing').toBe(300);
  });
}

test('the dock rides above the on-screen keyboard while the search has focus, and the Search key puts the keys away', async ({ page, open }) => {
  // headless browsers have no keyboard: stand in for the visual viewport that iOS shrinks when it opens
  await page.addInitScript(() => {
    const fake = Object.assign(new EventTarget(), { height: innerHeight, offsetTop: 0, width: innerWidth, scale: 1, offsetLeft: 0, pageTop: 0, pageLeft: 0 });
    Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true });
  });
  await open(EMPTY);
  const bottom = () => page.locator('.dock').evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
  const keyboard = (height: number, offsetTop = 0) => page.evaluate(([h, top]) => {
    const vv = window.visualViewport as unknown as EventTarget & { height: number; offsetTop: number };
    vv.height = h;
    vv.offsetTop = top;
    vv.dispatchEvent(new Event('resize'));
  }, [height, offsetTop]);
  expect(await bottom()).toBe(844);

  await page.getByRole('button', { name: 'Search ingredients' }).tap();
  const input = page.locator('.dock input[aria-label="Search ingredients"]');
  await expect(input).toBeFocused();
  await keyboard(508);
  await expect.poll(bottom, 'the dock lifts by the keyboard height').toBe(844 - 336);
  await keyboard(508, 100);
  await expect.poll(bottom, 'less when the page was scrolled to reveal the field').toBe(844 - 236);
  await keyboard(508);

  await input.fill('gin');
  await input.press('Enter');
  await expect(input).not.toBeFocused();
  await expect.poll(bottom, 'back in place once the keys are put away').toBe(844);
  await expect(page.locator('.dock [data-bottle]').first()).toBeVisible();
  await keyboard(300);
  expect(await bottom(), 'no longer tracking after blur').toBe(844);
});
