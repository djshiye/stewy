import { test, expect, NEGRONI, rows, toast, toastAction } from './fixtures';

// The remove button shows on hover with a mouse (force skips that wait) and always on touch.
const remove = (page: import('@playwright/test').Page, hasTouch: boolean) => {
  const button = page.locator('.row__remove').first();
  return hasTouch ? button.tap() : button.click({ force: true });
};

test('removing a row offers Undo in the toast', async ({ page, open, hasTouch, press }) => {
  await open(NEGRONI);
  await remove(page, hasTouch);
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length - 1);
  await expect(toast(page)).toHaveText(/^Removed/);
  await press(toastAction(page));
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
});

// Ctrl+Z and Ctrl+Y on desktop, the Undo and Redo buttons in the top bar on touch
test('Undo restores a removed row and Redo redoes the removal', async ({ page, open, hasTouch, undo, redo }) => {
  await open(NEGRONI);
  await remove(page, hasTouch);
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length - 1);
  await undo();
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
  await redo();
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length - 1);
  await undo();
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
});

test('Clear empties the pot and Undo brings it back', async ({ page, open, press }) => {
  await open(NEGRONI);
  await press(page.getByRole('button', { name: /^Clear/ }).first());
  await expect(rows(page)).toHaveCount(0);
  await expect(toast(page)).toHaveText(/Cleared/);
  await press(toastAction(page));
  await expect(rows(page)).toHaveCount(NEGRONI.brew.length);
});
