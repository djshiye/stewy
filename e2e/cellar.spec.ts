import { test, expect, NEGRONI, dialog, noKeyboard, toast, toastAction, closeSheet, sheetReady, type OpenOptions, type PotState } from './fixtures';
import type { Locator, Page } from '@playwright/test';

/** The fixtures the helpers below use. */
type Fx = { openServe: () => Promise<void>; openCellar: () => Promise<void>; press: (l: Locator) => Promise<void> };

const cellarRows = (page: Page) => page.locator('.cellar-row');

/** Saves the current pot from the Serve sheet, then opens the Cellar. */
async function saveThenOpenCellar(page: Page, f: Pick<Fx, 'openServe' | 'openCellar' | 'press'>) {
  await f.openServe();
  await f.press(page.getByRole('button', { name: 'Save to the Cellar' }));
  await expect(toast(page)).toHaveText(/Saved/);
  await closeSheet(page);
  await f.openCellar();
  await expect(cellarRows(page)).toHaveCount(1);
}

test('a saved brew appears in the Cellar', async ({ page, open, openServe, openCellar, press }) => {
  await open(NEGRONI);
  await saveThenOpenCellar(page, { openServe, openCellar, press });
  await expect(cellarRows(page).first()).toContainText('Negroni');
});

test('renaming commits on Enter and keeps the sheet open', async ({ page, open, openServe, openCellar, press }) => {
  await open(NEGRONI);
  await saveThenOpenCellar(page, { openServe, openCellar, press });
  await press(dialog(page).getByRole('button', { name: /^Rename/ }));
  await page.locator('.cellar-row__input').fill('House negroni');
  await page.keyboard.press('Enter');
  await expect(page.locator('.cellar-row__name', { hasText: 'House negroni' })).toHaveCount(1);
  await expect(cellarRows(page)).toHaveCount(1);
});

test('delete says so, Undo restores, Load puts it back in the pot and closes the sheet', async ({ page, open, openServe, openCellar, press }) => {
  await open(NEGRONI);
  await saveThenOpenCellar(page, { openServe, openCellar, press });
  await press(dialog(page).getByRole('button', { name: /^Delete/ }));
  await expect(cellarRows(page)).toHaveCount(0);
  await expect(toast(page)).toHaveText(/Deleted/);
  await press(toastAction(page));
  await expect(cellarRows(page)).toHaveCount(1);

  // loading the brew that is already in the pot is a no-op, so change the pot first
  await closeSheet(page);
  await press(page.getByRole('button', { name: /^Clear/ }).first());
  await expect(page.locator('.rc__rows .row')).toHaveCount(0);
  await openCellar();
  await press(dialog(page).getByRole('button', { name: /^Load/ }));
  await expect(page.locator('.ui-toast__msg', { hasText: /Loaded Negroni/ })).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('.rc__rows .row')).toHaveCount(NEGRONI.brew.length);
});

// ---------------------------------------------------------------- focus after delete and undo

/** Three saved brews, newest first: Alpha, Bravo, Charlie. */
const SEEDED = ['Alpha', 'Bravo', 'Charlie'].map((name, i) => ({
  id: name.toLowerCase(),
  name,
  brew: NEGRONI.brew,
  score: 80,
  color: null,
  savedAt: new Date(Date.UTC(2026, 0, 3 - i, 12)).toISOString(),
}));

const deleteBtn = (page: Page, name: string) => page.getByRole('button', { name: `Delete ${name}` });

async function openSeeded(page: Page, open: (s?: PotState, o?: OpenOptions) => Promise<void>, openCellar: () => Promise<void>, count: number) {
  await open(NEGRONI, { cellar: SEEDED.slice(0, count) });
  await openCellar();
  await expect(cellarRows(page)).toHaveCount(count);
  await sheetReady(page);
}

/** Focus is on the control, inside the dialog, and stays there once the row's exit has finished. */
async function expectFocusOn(page: Page, control: Locator, rowsLeft: number) {
  await expect(control).toBeFocused();
  await expect(cellarRows(page)).toHaveCount(rowsLeft);
  await expect(control).toBeFocused();
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
}

/** Keyboard delete: focus the button and press Enter. */
async function keyboardDelete(page: Page, name: string) {
  await deleteBtn(page, name).focus();
  await page.keyboard.press('Enter');
}

// The focus-order cases below are keyboard flows (Enter on a focused Delete, Ctrl+Z): they run on desktop and on an
// iPad in landscape. The pointer case at the end runs everywhere.
test.describe('focus after a keyboard delete', () => {
  test.skip(noKeyboard, 'focus order after a keyboard delete is a keyboard flow');

  test('deleting a middle brew moves focus to the next brew Delete button, and Undo returns it', async ({ page, open, openCellar }) => {
    await openSeeded(page, open, openCellar, 3);
    await keyboardDelete(page, 'Bravo');
    await expectFocusOn(page, deleteBtn(page, 'Charlie'), 2);
    // the global undo answers the visible Undo toast
    await page.keyboard.press('Control+z');
    await expectFocusOn(page, deleteBtn(page, 'Bravo'), 3);
    await closeSheet(page);
  });

  test('deleting the last brew moves focus to the previous brew', async ({ page, open, openCellar }) => {
    await openSeeded(page, open, openCellar, 3);
    await keyboardDelete(page, 'Charlie');
    await expectFocusOn(page, deleteBtn(page, 'Bravo'), 2);
    await toastAction(page).click();
    await expectFocusOn(page, deleteBtn(page, 'Charlie'), 3);
    await closeSheet(page);
  });

  test('deleting the first brew moves focus to the one that took its place', async ({ page, open, openCellar }) => {
    await openSeeded(page, open, openCellar, 3);
    await keyboardDelete(page, 'Alpha');
    await expectFocusOn(page, deleteBtn(page, 'Bravo'), 2);
    await closeSheet(page);
  });

  test('deleting the only brew moves focus to the Cellar heading, and Undo returns it to the brew', async ({ page, open, openCellar }) => {
    await openSeeded(page, open, openCellar, 1);
    await keyboardDelete(page, 'Alpha');
    await expectFocusOn(page, page.getByRole('heading', { name: 'The Cellar' }), 0);
    await expect(page.locator('.cellar-empty')).toBeVisible();
    await toastAction(page).click();
    await expectFocusOn(page, deleteBtn(page, 'Alpha'), 1);
    await closeSheet(page);
  });

  test('the empty Cellar after the last delete can be left with Escape', async ({ page, open, openCellar }) => {
    await openSeeded(page, open, openCellar, 1);
    await keyboardDelete(page, 'Alpha');
    await expect(cellarRows(page)).toHaveCount(0);
    await closeSheet(page);
  });

});

test('a pointer delete and undo leave focus in the dialog without drawing a focus ring', async ({ page, open, openCellar, press }) => {
  await openSeeded(page, open, openCellar, 3);
  await press(deleteBtn(page, 'Bravo'));
  await expect(cellarRows(page)).toHaveCount(2);
  const inDialog = () => page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
  await expect.poll(inDialog).toBe(true);
  const ring = () => page.evaluate(() => document.activeElement?.matches(':focus-visible') ?? false);
  expect(await ring()).toBe(false);
  await press(toastAction(page));
  await expect(cellarRows(page)).toHaveCount(3);
  await expect.poll(inDialog).toBe(true);
  expect(await ring()).toBe(false);
  await closeSheet(page);
});
