import { test, expect, NEGRONI, bottle, dialog, pourButton, closeSheet } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ignoreConsole: [/Reduced Motion enabled/] });

test('nothing animates under reduced motion', async ({ page, open }) => {
  await open(NEGRONI);
  await bottle(page, 'vodka').click();
  await pourButton(page).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.keyboard.press('g');
  await expect(dialog(page)).toHaveCount(1);
  await closeSheet(page);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
});
