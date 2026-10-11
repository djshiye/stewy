import { test, expect, EMPTY, MOJITO, NEGRONI, bottle, copied, dialog, noKeyboard, pourButton, storedCellar, storedPot, stubShare, toast, closeSheet, sheetReady } from './fixtures';

const names = (page: import('@playwright/test').Page) => page.locator('.serve__menu .serve__line:not(.serve__line--garnish) .serve__name');
const saveButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Save to the Cellar' });

test.describe('serve sheet', () => {
  test('Serve opens it; garnish stays out of the measures and into the method', async ({ page, open, openServe }) => {
    await open(NEGRONI);
    await openServe();
    await expect(saveButton(page)).toBeVisible();
    await expect(page.locator('.serve__line--garnish .serve__val').first()).toHaveText(/orange slice/i);
    await expect(names(page).filter({ hasText: /orange/i })).toHaveCount(0);
    await expect(names(page).filter({ hasText: /Gin/ })).toHaveCount(1);
    await expect(page.locator('.serve__steps')).toContainText(/orange slice/i);
  });

  test('measures list no garnish at all', async ({ page, open, openServe }) => {
    await open(NEGRONI);
    await openServe();
    await expect(saveButton(page)).toBeVisible();
    const joined = (await names(page).allTextContents()).join('|');
    expect(joined).not.toMatch(/mint|slice|cherry|olive|peel|twist/i);
  });

  test('a Mojito treats the mint as garnish', async ({ page, open, openServe }) => {
    await open(MOJITO);
    await openServe();
    await expect(page.locator('.serve__line--garnish .serve__val').first()).toHaveText(/mint/i);
    await expect(names(page).filter({ hasText: /mint/i })).toHaveCount(0);
    await expect(page.locator('.serve__steps')).toContainText(/mint/i);
  });

  test('Copy recipe puts the recipe, score and verdict on the clipboard', async ({ page, open, openServe, press }) => {
    await open(NEGRONI);
    await openServe();
    await sheetReady(page);
    await press(page.getByRole('button', { name: 'Copy recipe' }));
    await expect(toast(page)).toHaveText(/Recipe copied/);
    const text = await copied(page);
    expect(text).toMatch(/Negroni/);
    expect(text).toMatch(/Score \d+, Legendary elixir/);
    expect(text).not.toMatch(/[–—]/);
  });

  test('Share link copies a #b= link', async ({ page, open, openServe, press }) => {
    await stubShare(page, 'absent'); // touch devices share first; with no share sheet the link is copied
    await open(NEGRONI);
    await openServe();
    await sheetReady(page);
    await press(page.getByRole('button', { name: 'Share link' }));
    await expect(toast(page)).toHaveText(/Link copied/);
    expect(await copied(page)).toMatch(/#b=/);
  });

  test('Save to the Cellar saves and says so', async ({ page, open, openServe, press }) => {
    await open(NEGRONI);
    await openServe();
    await sheetReady(page);
    await press(saveButton(page));
    await expect(toast(page)).toHaveText(/Saved/);
    await expect.poll(async () => (await storedCellar(page)).length).toBe(1);
  });

  test('double-clicking Save to the Cellar saves once', async ({ page, open, openServe }) => {
    await open(NEGRONI);
    await openServe();
    await expect(saveButton(page)).toBeVisible();
    await saveButton(page).dblclick();
    await expect(toast(page)).toHaveText(/Saved/);
    expect(await storedCellar(page)).toHaveLength(1);
  });

  test('Ctrl+Z while Serve is open answers the Saved toast, then undoes the pour', async ({ page, open, openServe, press, hasTouch, viewport }) => {
    test.skip(noKeyboard({ hasTouch, viewport }), 'Ctrl+Z is a keyboard shortcut, and the top bar Undo is behind the sheet');
    await open(EMPTY);
    await press(bottle(page, 'gin'));
    await press(pourButton(page));
    await expect.poll(async () => (await storedPot(page)).brew.length).toBe(1);

    await openServe();
    await saveButton(page).dblclick();
    await expect(toast(page)).toHaveText(/Saved/);
    await expect.poll(async () => (await storedCellar(page)).length).toBe(1);

    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await storedCellar(page)).length).toBe(0);
    expect((await storedPot(page)).brew).toHaveLength(1);
    await expect(dialog(page)).toHaveCount(1);

    await closeSheet(page);
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await storedPot(page)).brew.length).toBe(0);
  });
});

test.describe('sheets are filled on first open', () => {
  const sheets = [
    { name: 'Grimoire', trigger: /Grimoire/, probe: '[role=listbox][aria-label=Classics]' },
    { name: 'Cellar', trigger: /^Cellar/, probe: '.cellar-sheet' },
    { name: 'Serve', trigger: /^Serve/, probe: '.serve-sheet .serve__title' },
  ];
  for (const cold of [false, true]) {
    for (const sheet of sheets) {
      test(`${sheet.name}, ${cold ? 'cold, straight after load' : 'after idle'}`, async ({ page, open, press }) => {
        await open(NEGRONI, { waitUntil: cold ? 'commit' : 'load' });
        if (!cold) await page.waitForTimeout(1200); // let the idle prefetch of the lazy chunks run
        await press(page.getByRole('button', { name: sheet.trigger }).first());
        await expect(page.locator(sheet.probe).first()).toBeVisible({ timeout: 8_000 });
        await expect(dialog(page)).toHaveCount(1);
        if (!cold && sheet.name === 'Serve') {
          await expect(page.locator('.serve__line--garnish .serve__val').first()).toHaveText(/orange slice/i);
        }
        await closeSheet(page);
        // the next sheet still opens after this one closed
        await press(page.getByRole('button', { name: /Grimoire/ }).first());
        await expect(dialog(page)).toHaveCount(1);
        await closeSheet(page);
      });
    }
  }
});
