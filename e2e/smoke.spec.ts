import { test, expect, NEGRONI, rows } from './fixtures';

test('the app loads a saved Negroni', async ({ page, open }) => {
  await open(NEGRONI);
  await expect(rows(page)).toHaveCount(4);
});
