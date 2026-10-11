import { test, expect, BRAMBLE, GRASSHOPPER, NEGRONI, EMPTY, bottle, dial, dragBottle, expectGrimoireOnWholeRow, pill, settled, shelfTab, storedPot } from './fixtures';

// At 1800 x 1000 and above the interface is scaled with CSS zoom (src/styles/layout.css). Everything that
// reads viewport pixels (tooltip, drag ghost, scrub distance, scroll offsets) has to agree with it.
for (const [w, h] of [[1920, 1080], [2560, 1440]]) {
  test.describe(`${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    test('the pot is sized from its stage in CSS pixels, not viewport pixels (container units under zoom)', async ({ page, open }) => {
      await open(NEGRONI);
      await settled(page);
      const m = await page.evaluate(() => {
        const zoom = parseFloat(getComputedStyle(document.querySelector('.app')!).zoom) || 1;
        const stage = document.querySelector('.stage')!;
        const pot = document.querySelector('.stg-pot')!.getBoundingClientRect();
        return { zoom, potCss: pot.width / zoom, stageH: stage.clientHeight };
      });
      expect(m.zoom).toBeGreaterThan(1);
      // desktop rule: min(stage width, (stage height - hint) x 1.2, 1000px)
      expect(m.potCss).toBeLessThanOrEqual((m.stageH - 46) * 1.2 + 2);
      expect(m.potCss).toBeGreaterThan((m.stageH - 46) * 1.2 * 0.8);
    });

    test('the shelf tooltip is centred over the bottle it belongs to', async ({ page, open }) => {
      await open(EMPTY);
      await shelfTab(page, 'Spirits');
      await settled(page);
      // bottles that are wholly on screen, left to right
      const onScreen = await page.locator('[data-bottle]').evaluateAll((els, width) =>
        els.map((el) => ({ id: el.getAttribute('data-bottle')!, r: el.querySelector('.bottle__art')!.getBoundingClientRect() }))
          .filter((b) => b.r.left >= 0 && b.r.right <= width)
          .sort((a, b) => a.r.left - b.r.left)
          .map((b) => b.id), w);
      expect(onScreen.length).toBeGreaterThan(4);
      for (const [label, id] of [['first', onScreen[0]], ['middle', onScreen[Math.floor(onScreen.length / 2)]]]) {
        const art = bottle(page, id).locator('.bottle__art');
        await art.hover();
        const tip = page.locator('.shelf-tip');
        await expect(tip, `${label} bottle (${id})`).toBeVisible();
        await settled(page);
        const t = (await tip.boundingBox())!;
        const a = (await art.boundingBox())!;
        expect(Math.abs(t.x + t.width / 2 - (a.x + a.width / 2)), `${label} bottle (${id}): tooltip centre vs bottle centre`).toBeLessThanOrEqual(3);
        expect(t.y + t.height, `${label} bottle (${id}): tooltip sits above the bottle`).toBeLessThanOrEqual(a.y + 1);
        await page.mouse.move(w / 2, 40);
        await expect(tip).toHaveCount(0);
      }
    });

    test('the drag ghost sits under the pointer', async ({ page, open }) => {
      await open(EMPTY);
      const to = await dragBottle(page, 'gin', 'pot', false);
      const g = (await page.locator('.drag-ghost > *').first().boundingBox())!;
      expect(to.x, 'pointer is inside the ghost horizontally').toBeGreaterThanOrEqual(g.x);
      expect(to.x).toBeLessThanOrEqual(g.x + g.width);
      expect(to.y, 'pointer is inside the ghost vertically').toBeGreaterThanOrEqual(g.y);
      expect(to.y).toBeLessThanOrEqual(g.y + g.height);
      expect(Math.abs(g.x + g.width / 2 - to.x), 'ghost is centred on the pointer').toBeLessThanOrEqual(g.width * 0.25);
      await page.mouse.up();
    });

    test('dragging a bottle into the pot opens the pour dial', async ({ page, open }) => {
      await open(EMPTY);
      await dragBottle(page, 'gin', 'pot', true);
      await expect(dial(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pour into the pot' })).toBeVisible();
    });

    test('scrubbing a measure pill moves the value by the same steps as the keyboard', async ({ page, open }) => {
      await open(NEGRONI);
      await settled(page);
      const campari = pill(page, 'Campari');
      const campariMl = async () => (await storedPot(page)).brew.find((e) => e.id === 'campari')!.ml;
      const start = await campariMl();
      // viewport pixels per CSS pixel under the pill, measured the way the app does
      const zoom = await campari.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;width:100px;height:0';
        el.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width / 100;
      });
      expect(zoom).toBeGreaterThan(1.1); // the ladder is in effect at this size

      // 55 CSS pixels: past the 6 px threshold, then three more 14 px steps = four steps
      const box = (await campari.boundingBox())!;
      const x = box.x + Math.min(20, box.width / 2);
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 55 * zoom, y, { steps: 12 });
      await page.mouse.up();
      await expect.poll(campariMl).not.toBe(start);
      const scrubbed = await campariMl();
      await expect(dial(page)).toHaveCount(0);

      await page.keyboard.press('Control+z');
      await expect.poll(campariMl).toBe(start);
      await campari.focus();
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
      await expect.poll(campariMl).toBe(scrubbed);
    });

    for (const [label, state, whole] of [['a mid-list classic', BRAMBLE, true], ['the last classic', GRASSHOPPER, false]] as const) {
      test(`the Grimoire opens on a whole row with ${label} in the pot`, async ({ page, open }) => {
        await open(state);
        await expectGrimoireOnWholeRow(page, whole);
      });
    }
  });
}
