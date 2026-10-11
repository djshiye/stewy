import { test, expect, NEGRONI, rows, toast, toastAction } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const remove = (page: import('@playwright/test').Page) => page.locator('.row__remove').first().click({ force: true });

test('removing a row offers Undo in the toast', async ({ page, open }) => {
  await open(NEGRONI);
  await remove(page);
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length - 1);
  await expect(toast(page)).toHaveText(/^Removed/);
  await toastAction(page).click();
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
});

test('Ctrl+Z restores a removed row and Ctrl+Y redoes the removal', async ({ page, open }) => {
  await open(NEGRONI);
  await remove(page);
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length - 1);
  await page.keyboard.press('Control+z');
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
  await page.keyboard.press('Control+y');
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length - 1);
  await page.keyboard.press('Control+z');
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
});

test('Clear empties the pot and Undo brings it back', async ({ page, open }) => {
  await open(NEGRONI);
  await page.getByRole('button', { name: /^Clear/ }).first().click();
  await expect(rows(page)).toHaveCount(0);
  await expect(toast(page)).toHaveText(/Cleared/);
  await toastAction(page).click();
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
});
