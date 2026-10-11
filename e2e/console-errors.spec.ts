import { test, expect, NEGRONI, rows, dialog, bottle, closeSheet } from './fixtures';

// The console guard in fixtures.ts fails any test that logs an error or warning. These tests exist to
// walk the paths most likely to log: every sheet on both layouts, and damaged storage.

for (const [label, viewport, touch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844, }, true],
] as const) {
  test.describe(label, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch });

    test('every sheet opens and closes without console output', async ({ page, open }) => {
      await open(NEGRONI);
      await bottle(page, 'vodka').click();
      await expect(dialog(page)).toHaveCount(1);
      await closeSheet(page);
      for (const name of [/Grimoire/, /^Cellar/, /^Serve/]) {
        await page.getByRole('button', { name }).first().click();
        await expect(dialog(page)).toHaveCount(1);
        await closeSheet(page);
      }
    });
  });
}

test.describe('damaged storage', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const unit of ['toString', 'constructor', '__proto__']) {
    test(`a unit of "${unit}" does not white-screen`, async ({ page, open }) => {
      await open({ unit, brew: NEGRONI.brew, name: 'Negroni' });
      await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
      await expect(page.locator('.topbar')).toBeVisible();
    });
  }

  test('unparseable storage falls back to an empty pot', async ({ page, open }) => {
    await open('{not json');
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });
});
