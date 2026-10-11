import { test, expect, NEGRONI, bottle, dialog, pourButton, closeSheet } from './fixtures';

test.use({ reducedMotion: 'reduce', ignoreConsole: [/Reduced Motion enabled/] });

test('nothing animates under reduced motion', async ({ page, open, press, openGrimoire }) => {
  await open(NEGRONI);
  await press(bottle(page, 'vodka'));
  await press(pourButton(page));
  await expect(dialog(page)).toHaveCount(0);
  await openGrimoire();
  await expect(dialog(page)).toHaveCount(1);
  await closeSheet(page);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
});
