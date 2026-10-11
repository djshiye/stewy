import { test, expect, bottle, dialog, pourButton, rows, toast, EMPTY, closeSheet } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const options = (page: import('@playwright/test').Page) => page.locator('[role=option]');
const count = (page: import('@playwright/test').Page) => page.locator('.grim__title p, .grim__head p[aria-live]').first();

test('G opens the Grimoire without typing into the search field', async ({ page, open }) => {
  await open({ unit: 'oz', brew: [{ id: 'gin', ml: 45 }], name: 'Untitled brew' });
  await page.locator('body').click({ position: { x: 700, y: 20 } });
  await page.keyboard.press('g');
  await expect(page.locator('[role=listbox][aria-label=Classics]')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Search by name/ })).toHaveValue('');
});

test('the classics count on the header matches the listed classics, and filters narrow it', async ({ page, open }) => {
  await open(EMPTY);
  await page.keyboard.press('g');
  await expect(options(page).first()).toBeVisible();
  const total = Number((await count(page).textContent())?.match(/^(\d+) classics/)?.[1]);
  expect(total).toBeGreaterThan(0);
  await expect(options(page)).toHaveCount(total);

  await page.getByRole('button', { name: /^Sours/ }).click();
  await expect(count(page)).toHaveText(new RegExp(`of ${total} classics`));
  const sours = await options(page).count();
  expect(sours).toBeGreaterThan(0);
  expect(sours).toBeLessThan(total);

  await page.getByRole('button', { name: /^All/ }).click();
  await expect(options(page)).toHaveCount(total);
});

test('selecting a classic and loading it replaces the pot, and Ctrl+Z restores it', async ({ page, open }) => {
  await open({ unit: 'oz', brew: [{ id: 'gin', ml: 45 }, { id: 'campari', ml: 30 }], name: 'Untitled brew' });
  await page.keyboard.press('g');
  await options(page).filter({ hasText: 'Negroni' }).first().click();
  await page.getByRole('button', { name: /into the pot/ }).first().click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(toast(page)).toHaveText(/Loaded Negroni/);
  await expect(page.locator('.rc h2').first()).toContainText('Negroni');

  await page.keyboard.press('Control+z');
  await expect(rows(page)).toHaveCount(2);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.rc h2').first()).toContainText('Negroni');
});

test('the dial still works after the Grimoire closed', async ({ page, open }) => {
  await open(EMPTY);
  await page.keyboard.press('g');
  await expect(options(page).first()).toBeVisible();
  await closeSheet(page);
  await bottle(page, 'gin').click();
  await pourButton(page).click();
  await expect(rows(page)).toHaveCount(1);
});
