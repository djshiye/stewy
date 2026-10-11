import { test, expect, NEGRONI, dialog, toast, toastAction, closeSheet } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const cellarRows = (page: Page) => page.locator('.cellar-row');

/** Saves the current pot from the Serve sheet, then opens the Cellar. */
async function saveThenOpenCellar(page: Page) {
  await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Save to the Cellar' }).click();
  await expect(toast(page)).toHaveText(/Saved/);
  await closeSheet(page);
  await page.keyboard.press('c');
  await expect(cellarRows(page)).toHaveCount(1);
}

test('a saved brew appears in the Cellar', async ({ page, open }) => {
  await open(NEGRONI);
  await saveThenOpenCellar(page);
  await expect(cellarRows(page).first()).toContainText('Negroni');
});

test('renaming commits on Enter and keeps the sheet open', async ({ page, open }) => {
  await open(NEGRONI);
  await saveThenOpenCellar(page);
  await page.getByRole('button', { name: /^Rename/ }).click();
  await page.locator('.cellar-row__input').fill('House negroni');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cellar-row__name', { hasText: 'House negroni' })).toHaveCount(1);
  await expect(cellarRows(page)).toHaveCount(1);
});

test('delete says so, Undo restores, Load puts it back in the pot and closes the sheet', async ({ page, open }) => {
  await open(NEGRONI);
  await saveThenOpenCellar(page);
  await page.getByRole('button', { name: /^Delete/ }).click();
  await expect(cellarRows(page)).toHaveCount(0);
  await expect(toast(page)).toHaveText(/Deleted/);
  await toastAction(page).click();
  await expect(cellarRows(page)).toHaveCount(1);

  // loading the brew that is already in the pot is a no-op, so change the pot first
  // (deleting the focused row dropped focus to the page, so close with the plain key rather than closeSheet)
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: /^Clear/ }).first().click();
  await expect(page.locator('.rc__rows .row')).toHaveCount(0);
  await page.keyboard.press('c');
  await page.getByRole('button', { name: /^Load/ }).click();
  await expect(page.locator('.ui-toast__msg', { hasText: /Loaded Negroni/ })).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('.rc__rows .row')).toHaveCount(NEGRONI.brew.length);
});
