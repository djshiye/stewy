import { test, expect, EMPTY, copied, rows, shelfTab, storedPot, toast, toastAction } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const NEGRONI_HASH = '#b=gin:30,campari:30,sweet_vermouth:30&n=Negroni';

test('opening a share link fills the pot, clears the hash and can be undone', async ({ page, open }) => {
  await open(EMPTY, { hash: NEGRONI_HASH });
  await expect(rows(page)).toHaveCount(3);
  await expect(toast(page)).toHaveText(/Opened a shared brew/);
  expect(await page.evaluate(() => location.hash)).toBe('');
  await toastAction(page).click();
  await expect(rows(page)).toHaveCount(0);
});

test('a share link opened in a tab that already has Stewy (hashchange)', async ({ page, open }) => {
  await open(EMPTY);
  await page.evaluate((h) => { location.hash = h; }, NEGRONI_HASH);
  await expect(rows(page)).toHaveCount(3);
  expect(await page.evaluate(() => location.hash)).toBe('');
  await expect(page.locator('.rc h2').first()).toContainText('Negroni');

  await page.evaluate(() => { location.hash = '#b=nonsense:abc'; });
  await expect(toast(page)).toHaveText(/could not be opened/);
  await expect(rows(page)).toHaveCount(3);
});

test('a 20-ingredient link round-trips through Share link', async ({ page, open }) => {
  await open(EMPTY);
  // collect real ingredient ids from the shelf tabs
  const ids: string[] = [];
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click();
    for (const id of await page.locator('[data-bottle]').evaluateAll((els) => els.map((e) => e.getAttribute('data-bottle')!))) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  await shelfTab(page, 'Spirits');
  expect(ids.length).toBeGreaterThanOrEqual(20);
  const twenty = ids.slice(0, 20);

  await page.evaluate((h) => { location.hash = h; }, `#b=${twenty.map((i) => `${i}:20`).join(',')}&n=Big%20brew`);
  await expect.poll(async () => (await storedPot(page)).brew.length).toBe(20);
  const first = await storedPot(page);
  expect(first.name).toBe('Big brew');
  await expect(toast(page)).toHaveText(/Opened a shared brew/);

  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Share link' }).click();
  const url = await copied(page);
  expect(url).toMatch(/#b=/);

  // a fresh visit with nothing stored opens the same 20
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');
  await page.goto('/' + new URL(url).hash);
  await expect(page.locator('.topbar').first()).toBeVisible();
  await expect.poll(async () => (await storedPot(page)).brew.map((e) => e.id)).toEqual(first.brew.map((e) => e.id));
});
