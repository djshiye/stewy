import { test, expect, NEGRONI, bottle, dial, dialog, pill, pourButton, closeSheet, sheetReady } from './fixtures';

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a measure pill opens the dial in edit mode and Update changes the amount', async ({ page, open }) => {
    await open(NEGRONI);
    const gin = pill(page, 'Gin');
    const before = await gin.getAttribute('aria-label');
    await gin.click();
    await expect(dial(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset to/ })).toBeVisible();
    await dial(page).focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(gin).not.toHaveAttribute('aria-label', before ?? '');
  });
});

for (const [label, viewport, touch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`focus trap (${label})`, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });

    test('Tab and Shift+Tab stay inside the dial, Escape closes it', async ({ page, open }) => {
      await open(NEGRONI);
      await bottle(page, 'vodka').click();
      await expect(dial(page)).toBeVisible();
      await sheetReady(page);
      const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
      for (const key of ['Shift+Tab', 'Tab']) {
        for (let i = 0; i < 25; i++) {
          await page.keyboard.press(key);
          expect(await inside(), `${key} press ${i + 1} left the dialog`).toBe(true);
        }
      }
      await page.keyboard.press('Escape');
      await expect(dial(page)).toHaveCount(0);
    });
  });
}

test.describe('add mode', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Escape closes the dial without pouring', async ({ page, open }) => {
    await open(NEGRONI);
    await bottle(page, 'vodka').click();
    await expect(pourButton(page)).toBeVisible();
    await closeSheet(page);
    await expect(page.locator('.rc__rows .row')).toHaveCount(4);
  });
});
