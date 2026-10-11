import { test, expect, MAI_TAI, NEGRONI, dial, pill, rows, storedPot } from './fixtures';

test.describe('measure pills', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('scrubbing changes the amount without opening the dial, and is one undo step', async ({ page, open }) => {
    await open(NEGRONI);
    const campari = pill(page, 'Campari');
    const start = await campari.getAttribute('aria-label');
    const box = (await campari.boundingBox())!;
    const x = box.x + Math.min(20, box.width / 2);
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y, { steps: 12 });
    await page.mouse.up();
    await expect(campari).not.toHaveAttribute('aria-label', start ?? '');
    const scrubbed = await campari.getAttribute('aria-label');
    await expect(dial(page)).toHaveCount(0);

    await page.keyboard.press('Control+z');
    await expect(campari).toHaveAttribute('aria-label', start ?? '');
    await page.keyboard.press('Control+Shift+z');
    await expect(campari).toHaveAttribute('aria-label', scrubbed ?? '');
  });

  test('an arrow key on a focused pill steps the amount', async ({ page, open }) => {
    await open(NEGRONI);
    const campari = pill(page, 'Campari');
    const start = await campari.getAttribute('aria-label');
    await campari.focus();
    await page.keyboard.press('ArrowRight');
    await expect(campari).not.toHaveAttribute('aria-label', start ?? '');
  });
});

test.describe('N more cue', () => {
  for (const [w, h] of [[1280, 720], [1100, 760], [1440, 900], [1024, 768]]) {
    test.describe(`${w}x${h}`, () => {
      test.use({ viewport: { width: w, height: h } });

      test('visible rows plus "N more" add up to the total', async ({ page, open }) => {
        await open(MAI_TAI);
        await expect(rows(page)).toHaveCount(MAI_TAI.brew.length);
        const r = await page.evaluate(() => {
          const el = document.querySelector<HTMLElement>('.rc__rows')!;
          const all = [...el.querySelectorAll<HTMLElement>('[data-row]')];
          const visible = all.filter((x) => x.offsetTop + x.offsetHeight <= el.scrollTop + el.clientHeight + 2).length;
          const strip = document.querySelector<HTMLElement>('.rc__more');
          const shown = strip?.dataset.show !== undefined;
          return { visible, total: all.length, more: shown ? parseInt(strip!.textContent ?? '', 10) : 0 };
        });
        expect(r.visible + r.more, `${r.visible} rows + ${r.more} more = ${r.total}`).toBe(r.total);
      });
    });
  }
});

test.describe('units', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the unit switch changes the card, and parts shows parts', async ({ page, open }) => {
    await open(NEGRONI);
    const unitButton = (u: string) => page.locator('.topbar [role=radio], .topbar button').filter({ hasText: new RegExp(`^${u}$`) }).first();
    const amount = page.locator('.pill__amt').first();
    const seen: Record<string, string> = {};
    for (const u of ['ml', 'cl', 'oz', 'parts']) {
      await unitButton(u).click();
      await expect.poll(async () => (await storedPot(page)).unit).toBe(u);
      seen[u] = (await amount.textContent()) ?? '';
    }
    expect(seen.ml).toMatch(/ml/);
    expect(seen.cl).toMatch(/cl/);
    expect(seen.oz).toMatch(/oz/);
    await expect(page.locator('.rc').first()).toContainText(/part/);
  });
});
