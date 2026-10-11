import { test, expect, NEGRONI, noKeyboard, bottle, dial, dialog, pill, pourButton, closeSheet, sheetReady } from './fixtures';

test.describe('edit mode', () => {
  test.skip(noKeyboard, 'the amount is stepped with an arrow key; the touch way is the dial drag, which Playwright cannot do');

  test('a measure pill opens the dial in edit mode and Update changes the amount', async ({ page, open, press }) => {
    await open(NEGRONI);
    const gin = pill(page, 'Gin');
    const before = await gin.getAttribute('aria-label');
    await press(gin);
    await expect(dial(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset to/ })).toBeVisible();
    await dial(page).focus();
    await page.keyboard.press('ArrowRight');
    await press(page.getByRole('button', { name: 'Update' }));
    await expect(dialog(page)).toHaveCount(0);
    await expect(gin).not.toHaveAttribute('aria-label', before ?? '');
  });
});

function focusTrapTest() {
  test('Tab and Shift+Tab stay inside the dial, Escape closes it', async ({ page, open, press }) => {
    await open(NEGRONI);
    await press(bottle(page, 'vodka'));
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
}

// The desktop projects walk a desktop and an emulated phone; the mobile WebKit projects walk their own device.
for (const [label, viewport, touch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
] as const) {
  test.describe(`focus trap (${label})`, { tag: '@emulated' }, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    focusTrapTest();
  });
}

test.describe('focus trap (device)', { tag: '@device' }, focusTrapTest);

test.describe('add mode', () => {
  test('Escape closes the dial without pouring', async ({ page, open, press }) => {
    await open(NEGRONI);
    await press(bottle(page, 'vodka'));
    await expect(pourButton(page)).toBeVisible();
    await closeSheet(page);
    await expect(page.locator('.rc__rows .row')).toHaveCount(4);
  });
});
