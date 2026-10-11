import { test, expect, NEGRONI, dialog, noKeyboard } from './fixtures';

function skipLinkTest(second: RegExp) {
  test('the first Tab lands on the skip link, the second on the first top-bar control', async ({ page, open }) => {
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
}

// The desktop projects walk a desktop and an emulated phone; the mobile WebKit projects walk their own device.
// Undo and Redo are disabled on a fresh pot, so the second stop is the unit control (the desktop top bar, which
// the desktop layout of an iPad shares) or the Grimoire (the phone top bar).
for (const [label, viewport, touch, second] of [
  ['desktop', { width: 1440, height: 900 }, false, /^oz$/],
  ['phone', { width: 390, height: 844 }, true, /Grimoire/],
] as const) {
  test.describe(`skip link (${label})`, { tag: '@emulated' }, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    skipLinkTest(second);
  });
}

test.describe('skip link (device)', { tag: '@device' }, () => {
  test.describe('phone and tablet layout', () => {
    test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1000, 'the desktop layout has its own order');
    skipLinkTest(/Grimoire/);
  });
  test.describe('desktop layout (iPad landscape)', () => {
    test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'the phone layout has its own order');
    skipLinkTest(/^oz$/);
  });
});

test.describe('hotkeys', () => {
  test.skip(noKeyboard, 'hotkeys need a keyboard; an iPad in landscape keeps them');

  test('G, C and S do not fire while typing in the shelf search', async ({ page, open }) => {
    await open(NEGRONI);
    await page.keyboard.press('Shift+/');
    await expect(page.locator('input:focus')).toBeVisible();
    await page.keyboard.type('gcsGCS');
    await expect(page.locator('input:focus')).toHaveValue('gcsGCS');
    await expect(dialog(page)).toHaveCount(0);
  });
});
