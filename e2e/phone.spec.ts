import { test, expect, EMPTY, GRASSHOPPER, MOJITO, NEGRONI, bottle, expectGrimoireOnWholeRow, dial, dialog, pourButton, rows, shelfTab, closeSheet } from './fixtures';

// The phone layout (the dock, the bottom sheets), below 1000 wide. The desktop projects emulate a phone with a
// 390 x 844 touch context; the mobile WebKit projects (iPhone, iPhone SE, iPhone landscape, iPad portrait) bring
// their own device, so nothing here may assume a size: read it from the page.
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

test.describe('phone (390 x 844 emulated)', { tag: '@emulated' }, () => {
  test.use(PHONE);
  phoneTests();
});

test.describe('phone (device)', { tag: '@device' }, () => {
  phoneTests();
});

function phoneTests() {

test('the dock and its hint are on screen', async ({ page, open }) => {
  await open(EMPTY);
  await expect(page.locator('.dock')).toBeVisible();
  await expect(page.getByText('Tap a bottle below to pour')).toBeVisible();
});

// A phone's index is little more than a row tall. A classic in the pot (mid-list, where the rows above settle after
// the first aim, or the last, which needs room below it) must still open whole, with no cut row under the header.
for (const [label, state] of [['a mid-list classic', MOJITO], ['the last classic', GRASSHOPPER]] as const) {
  test(`the Grimoire opens on a whole row with ${label} in the pot`, async ({ page, open, openGrimoire }) => {
    await open(state);
    await expectGrimoireOnWholeRow(page, true, openGrimoire);
  });
}

test('tapping a bottle opens the dial as a bottom sheet and Pour adds a row', async ({ page, open }) => {
  await open(EMPTY);
  await bottle(page, 'gin').tap();
  await expect(dial(page)).toBeVisible();
  const { width, height } = page.viewportSize()!;
  if (Math.min(width, height) >= 600) {
    // the pour dial is a 480px modal on a tablet (DESIGN.md), a bottom sheet on a phone
    await expect.poll(async () => {
      const box = await dialog(page).first().boundingBox(); // settles once the entrance animation is done
      return !!box && box.width <= 500 && box.y > 0 && box.y + box.height < height;
    }, 'a modal inside the viewport').toBe(true);
  } else {
    await expect.poll(async () => {
      const box = await dialog(page).first().boundingBox();
      return box ? Math.abs(box.y + box.height - height) : Infinity;
    }, 'the sheet settles against the bottom edge').toBeLessThan(4);
    // a sheet, not a full page: some of the page stays visible above it (a landscape phone is too short for that)
    if (height > 500) expect((await dialog(page).first().boundingBox())!.y).toBeGreaterThan(height >= 800 ? 100 : height * 0.05);
  }
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

for (const name of ['Grimoire', 'Cellar'] as const) {
  test(`a wheel over the ${name} scrim does not scroll the page behind it, and the position survives closing`, async ({ page, open, browserName }) => {
    await open(NEGRONI);
    // the top bar scrolls away with the page, and a tap would scroll it back into view: click the button in the page
    const scrollable = await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight);
    test.skip(scrollable < 60, 'the page does not scroll at this size');
    const y = Math.min(300, scrollable);
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
    await page.locator('.topbar').getByRole('button', { name: new RegExp(`^${name}`) }).evaluate((el) => (el as HTMLElement).click());
    await expect(dialog(page)).toBeVisible();
    // the root itself is locked (html clips x on phones, so body alone no longer reaches the viewport)
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'the root is locked').toBe('hidden');
    if (browserName !== 'webkit') { // mobile WebKit has no mouse wheel
      await page.mouse.move(page.viewportSize()!.width / 2, 30);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(250);
    }
    expect(await page.evaluate(() => window.scrollY), 'the page stays where it was').toBe(y);
    await closeSheet(page);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'and unlocked again').toBe('visible');
    expect(await page.evaluate(() => window.scrollY), 'and is still there after closing').toBe(y);
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
  const H = page.viewportSize()!.height;
  const kb = Math.min(336, Math.round(H * 0.4)); // a landscape phone has little height to give
  const up = Math.round(kb * 0.3);
  expect(await bottom()).toBe(H);

  await page.getByRole('button', { name: 'Search ingredients' }).tap();
  const input = page.locator('.dock input[aria-label="Search ingredients"]');
  await expect(input).toBeFocused();
  await keyboard(H - kb);
  await expect.poll(bottom, 'the dock lifts by the keyboard height').toBe(H - kb);
  await keyboard(H - kb, up);
  await expect.poll(bottom, 'less when the page was scrolled to reveal the field').toBe(H - kb + up);
  await keyboard(H - kb);

  await input.fill('gin');
  await input.press('Enter');
  await expect(input).not.toBeFocused();
  await expect.poll(bottom, 'back in place once the keys are put away').toBe(H);
  await expect(page.locator('.dock [data-bottle]').first()).toBeVisible();
  await keyboard(H - kb + 40);
  expect(await bottom(), 'no longer tracking after blur').toBe(H);
});
}
