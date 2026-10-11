import { test, expect, EMPTY, MAI_TAI, noKeyboard, bottle, dial, dialog, dragBottle, pourButton, rows, shelfTab, storedPot, toast } from './fixtures';

test.describe('empty pot', () => {
  test('starts with no rows and says it is waiting', async ({ page, open }) => {
    await open(EMPTY);
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('.ap__title')).toHaveText('Waiting for ingredients');
  });

  test('Serve reads just Serve and is disabled', async ({ page, open }) => {
    await open(EMPTY);
    const serve = page.getByRole('button', { name: /^Serve/ }).first();
    await expect(serve).toHaveText(/^\s*Serve\s*$/);
    await expect(serve).toBeDisabled();
  });

  test('S does nothing', async ({ page, open, hasTouch, viewport }) => {
    test.skip(noKeyboard({ hasTouch, viewport }), 'S is a hotkey');
    await open(EMPTY);
    await page.keyboard.press('s');
    await expect(dialog(page)).toHaveCount(0);
  });
});

test.describe('pouring', () => {
  test('dragging a bottle into the pot opens the dial in add mode', async ({ page, open, hasTouch }) => {
    test.skip(hasTouch, 'a mouse drag; touch drag is off by design (it would fight scrolling): on touch a tap opens the dial');
    await open(EMPTY);
    await dragBottle(page, 'gin', 'pot', false);
    await expect(page.locator('body')).toHaveClass(/is-dragging/);
    await page.mouse.up();
    await expect(dial(page)).toBeVisible();
    await expect(pourButton(page)).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/is-dragging/);
  });

  test('arrow keys change the amount and Pour adds one row', async ({ page, open, hasTouch, viewport }) => {
    test.skip(noKeyboard({ hasTouch, viewport }), 'arrow keys need a keyboard');
    await open(EMPTY);
    await bottle(page, 'gin').click();
    const slider = dial(page);
    await slider.focus();
    const before = await slider.getAttribute('aria-valuetext');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(slider).not.toHaveAttribute('aria-valuetext', before ?? '');
    await pourButton(page).click();
    await expect(dial(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByText('Waiting for ingredients')).toHaveCount(0);
    await expect(toast(page)).toHaveCount(0);
  });

  test('Enter on a focused bottle opens the dial and Enter confirms', async ({ page, open, hasTouch, viewport }) => {
    test.skip(noKeyboard({ hasTouch, viewport }), 'Enter on a focused bottle needs a keyboard');
    await open(EMPTY);
    await shelfTab(page, 'Liqueurs');
    await bottle(page, 'campari').focus();
    await page.keyboard.press('Enter');
    await expect(dial(page)).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(rows(page)).toHaveCount(1);
  });

  test('tapping or clicking a bottle opens the dial', async ({ page, open, press }) => {
    await open(EMPTY);
    await shelfTab(page, 'Liqueurs');
    await press(bottle(page, 'sweet_vermouth'));
    await expect(dial(page)).toBeVisible();
    await press(pourButton(page));
    await expect(rows(page)).toHaveCount(1);
  });

  test('double-clicking Pour adds once, at the default amount', async ({ page, open, press }) => {
    await open(EMPTY);
    await press(bottle(page, 'gin'));
    await expect(pourButton(page)).toBeVisible();
    await pourButton(page).dblclick();
    await expect(dialog(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(1);
    const pot = await storedPot(page);
    expect(pot.brew).toHaveLength(1);
    expect(pot.brew[0]).toEqual({ id: 'gin', ml: 45 });
  });
});

test.describe('shelf', () => {
  test('the Garnish tab shows mint', async ({ page, open }) => {
    await open(EMPTY);
    await shelfTab(page, 'Garnish');
    await expect(bottle(page, 'mint')).toBeVisible();
  });

  test('"/" searches the shelf', async ({ page, open, hasTouch, viewport }) => {
    test.skip(noKeyboard({ hasTouch, viewport }), '/ is a hotkey; on touch the search button does this (touch.spec)');
    await open(EMPTY);
    await page.keyboard.press('/');
    await page.keyboard.type('rum');
    await expect.poll(() => page.locator('.bottle').count()).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('Escape');
  });

  test('a red dot marks a real clash only', async ({ page, open }) => {
    await open(MAI_TAI);
    const dots = (id: string) => page.locator(`[data-bottle="${id}"] .bottle__mark--clash`);
    const anyDot = page.locator('.bottle .bottle__mark--clash');
    for (const id of ['vodka', 'gin', 'tequila']) await expect(dots(id)).toHaveCount(0);
    await shelfTab(page, 'Extras');
    await expect(dots('heavy_cream')).toHaveCount(1);
    await expect(bottle(page, 'heavy_cream')).toContainText(/clash/i);
    expect(await anyDot.count()).toBeLessThanOrEqual(6);
    await shelfTab(page, 'Spirits');
    await expect(anyDot).toHaveCount(0);
  });
});
