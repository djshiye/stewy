import { test, expect, CURDLED_TOPPED, EMPTY, NEGRONI, scoreOf, rows, toast, toastAction, storedPot, type PotState } from './fixtures';

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
    // the tip names what splits, not just "cream and citrus"
    await expect(page.locator('.ap')).toContainText('The cream splits against the lime juice. Pick one or the other.');
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

test.describe('Try adding on a split brew', () => {
  const SPLIT: PotState = {
    unit: 'ml',
    brew: [{ id: 'milk', ml: 20 }, { id: 'cognac', ml: 30 }, { id: 'creme_de_cacao', ml: 20 }, { id: 'lemon_juice', ml: 5 }],
    name: 'Untitled brew',
  };

  test('nothing is offered, and the slot says so on the card or drops out on phones', async ({ page, open }) => {
    await open(SPLIT);
    await expect(page.locator('.ap')).toContainText('The milk splits against the lemon juice. Pick one or the other.');
    await expect(page.locator('.ap .try__row, .bs__chips button')).toHaveCount(0);
    const note = page.getByText('Nothing on the shelf saves a split brew.');
    await expect(page.getByText(/adjusting the measures/)).toHaveCount(0);
    if (await page.locator('.bs').isVisible()) {
      // phones: no label with an empty strip after it, and the card's own Try adding is hidden
      await expect(page.locator('.bs__try')).toHaveCount(0);
      await expect(note).toBeHidden();
    } else {
      await expect(page.locator('.ap__try .ap__h')).toHaveText('Try adding');
      await expect(note).toBeVisible();
    }
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
