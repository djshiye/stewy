import { test, expect, NEGRONI, dialog } from './fixtures';

for (const [label, viewport, touch, second] of [
  ['desktop', { width: 1440, height: 900 }, false, /^oz$/],
  ['phone', { width: 390, height: 844 }, true, /Grimoire/],
] as const) {
  test.describe(`skip link (${label})`, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });

    test('the first Tab lands on the skip link, the second on the first top-bar control', async ({ page, open, browserName }) => {
      test.skip(browserName === 'webkit', 'Tab skips links and buttons in Safari unless the system setting is on; WebKit has its own check below');
      await open(NEGRONI);
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveText(/Skip to main content/);
      await page.keyboard.press('Tab');
      const second2 = await page.evaluate(() => (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim());
      expect(second2).toMatch(second);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main');
    });
  });
}

test.describe('hotkeys', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('G, C and S do not fire while typing in the shelf search', async ({ page, open }) => {
    await open(NEGRONI);
    await page.keyboard.press('Shift+/');
    await expect(page.locator('input:focus')).toBeVisible();
    await page.keyboard.type('gcsGCS');
    await expect(page.locator('input:focus')).toHaveValue('gcsGCS');
    await expect(dialog(page)).toHaveCount(0);
  });
});
