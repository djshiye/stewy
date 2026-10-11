import { test, expect, CURDLED_TOPPED, EMPTY, NEGRONI, scoreOf, rows, toast, toastAction, storedPot } from './fixtures';

test.describe('start from a classic', () => {
  test('three quick picks load a classic and are undoable', async ({ page, open, press, undo }) => {
    await open(EMPTY);
    const picks = page.locator('.ap .start__row');
    await expect(picks).toHaveCount(3);
    await expect(page.locator('.ap .start__name')).toHaveText(['Negroni', 'Daiquiri', 'Old Fashioned']);
    expect(await picks.first().evaluate((el) => el.tagName)).toBe('BUTTON');

    await press(picks.first());
    await expect(rows(page)).not.toHaveCount(0);
    expect(await rows(page).count()).toBeGreaterThanOrEqual(3);
    expect(await scoreOf(page.locator('.ap'))).toBeGreaterThanOrEqual(80);
    await expect(page.locator('.ap .start__row')).toHaveCount(0);
    await expect(toast(page)).toHaveText(/Loaded Negroni/);

    await undo();
    await expect(rows(page)).toHaveCount(0);
  });
});

test.describe('verdicts', () => {
  test('a strong brew shows the finished state, not weak suggestions', async ({ page, open }) => {
    await open(NEGRONI);
    await expect(page.locator('.ap__title')).toHaveText('Legendary elixir');
    await expect(page.locator('.ap .try__row')).toHaveCount(0);
    await expect(page.locator('.ap .ap__none')).toHaveText(/Nothing on the shelf improves this by more than a point or two/);
  });

  test('a curdled brew stays curdled when topped up', async ({ page, open }) => {
    await open(CURDLED_TOPPED);
    expect(await scoreOf(page.locator('.ap'))).toBeLessThanOrEqual(55);
    await expect(page.locator('.ap')).toContainText(/curdle|clash/i);
  });
});

test.describe('Try adding', () => {
  test('suggestions are worth 3 or more, and choosing one adds it with a toast', async ({ page, open, press }) => {
    await open({ unit: 'oz', brew: [{ id: 'gin', ml: 45 }], name: 'Untitled brew' });
    // "Try adding" is a list in the analysis card on the desktop layout and a strip of chips under the pot on phones
    const tryRows = page.locator('.ap .try__row:visible, .bs__chips button:visible');
    await expect(tryRows.first()).toBeVisible();
    const deltas = (await page.locator('.ap .try__delta > [aria-hidden=true]:visible, .bs__chips .chip__delta > [aria-hidden=true]:visible').allTextContents()).map((t) => Number(t.replace('+', '')));
    expect(deltas.length).toBeGreaterThan(0);
    for (const d of deltas) expect(d).toBeGreaterThanOrEqual(3);

    const before = (await storedPot(page)).brew.length;
    await press(tryRows.first());
    await expect.poll(async () => (await storedPot(page)).brew.length).toBeGreaterThan(before);
    await expect(toast(page)).toHaveText(/Added|Removed/);
    await press(toastAction(page));
    await expect.poll(async () => (await storedPot(page)).brew.length).toBe(before);
  });
});

test.describe('copy rules', () => {
  test('the visible copy has sentence-case verdicts and house terminology', async ({ page, open }) => {
    await open(NEGRONI);
    await expect(page.locator('.ap__title')).toHaveText('Legendary elixir');
    const body = page.locator('body');
    await expect(body).not.toHaveText(/cauldron/i);
    await expect(body).not.toHaveText(/harmony/i);
    await expect(body).not.toHaveText(/[–—!]/);
  });

  test('the empty verdict is sentence case with no dashes or exclamation marks', async ({ page, open }) => {
    await open(EMPTY);
    await expect(page.locator('.ap__title')).toHaveText('Waiting for ingredients');
    await expect(page.locator('body')).not.toHaveText(/[–—!]/);
  });
});
