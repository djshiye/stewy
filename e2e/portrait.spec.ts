import { test, expect, MAI_TAI, NEGRONI, settled, type PotState } from './fixtures';

// From 1000 wide, a viewport taller than 6 : 5 stacks the shell: the stage spans the width and the recipe and
// analysis cards sit side by side below it (src/styles/layout.css). Squares and landscape keep three columns.
// From 1300 wide the stack is scaled with its own zoom ladder (src/styles/tokens.css), so geometry is read in CSS
// pixels (viewport pixels divided by the zoom).

/** The brew that fills the analysis card most: three suggestions, two tips, a clash and two penalty notes. */
const WORST: PotState = {
  unit: 'oz',
  brew: [{ id: 'irish_cream', ml: 35 }, { id: 'honey_syrup', ml: 10 }, { id: 'orange_slice', ml: 5 }, { id: 'lemon_lime_soda', ml: 25 }],
  name: 'Worst case',
};

/** A clamped equation ("floored at 3" adds a line to the sum): the brew that came out tightest in a sweep of every
 * bottle, classic and pair, and overflowed the 520px card by 5px before the tall body was compacted. */
const FLOORED: PotState = {
  unit: 'oz',
  brew: [{ id: 'lemon_juice', ml: 45 }, { id: 'heavy_cream', ml: 10 }],
  name: 'Floored',
};

const boxes = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const zoom = parseFloat(getComputedStyle(document.querySelector('.app')!).zoom) || 1;
    const r = (s: string) => {
      const b = document.querySelector(s)!.getBoundingClientRect();
      return { x: b.x / zoom, y: b.y / zoom, w: b.width / zoom, h: b.height / zoom };
    };
    const stage = document.querySelector('.stage')!;
    const apBody = document.querySelector('.ap__body')!;
    const rows = document.querySelector('.rc__rows')!;
    return {
      zoom,
      stage: r('.slot--stage'),
      recipe: r('.slot--recipe'),
      analysis: r('.slot--analysis'),
      pot: r('.stg-pot'),
      stageInner: { w: stage.clientWidth, h: stage.clientHeight },
      radar: document.querySelector('.radar') ? r('.radar') : null,
      apScroll: apBody.scrollHeight - apBody.clientHeight,
      rowsScroll: rows.scrollHeight - rows.clientHeight,
      overflow: document.documentElement.scrollHeight - innerHeight,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      tabs: [...document.querySelectorAll('.shelf__tabs [role=tab]')].map((t) => {
        const strip = document.querySelector('.shelf__tabs')!.getBoundingClientRect();
        const b = t.getBoundingClientRect();
        return { name: t.textContent!.trim(), visible: Math.max(0, Math.min(b.right, strip.right) - Math.max(b.left, strip.left)) / b.width };
      }),
    };
  });

// The Safari iPad viewports (tab and address bars subtracted), the fullscreen iPad and 1000 x 1200.
// The pot is never smaller than the 420px of the three-column layout it replaces (377px at 1000 x 1200).
for (const [w, h] of [[1000, 1200], [1024, 1266], [1024, 1292], [1032, 1280], [1032, 1300], [1024, 1366], [1100, 1500], [1200, 1600]]) {
  test.describe(`tall tablet ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    test('the pot spans the top and the two cards sit side by side below it', async ({ page, open }) => {
      await open(MAI_TAI);
      await settled(page);
      const m = await boxes(page);
      // 1200 wide is where the portrait ladder starts (tokens.css, the 1.1 step); every iPad viewport stays at 1
      expect(m.zoom).toBe(w === 1200 ? 1.1 : 1);
      expect(m.stage.w).toBeGreaterThan(w / m.zoom - 60);
      expect(m.recipe.y).toBeGreaterThanOrEqual(m.stage.y + m.stage.h - 1);
      expect(m.analysis.y).toBeCloseTo(m.recipe.y, 0);
      expect(m.recipe.h).toBeCloseTo(m.analysis.h, 0);
      expect(m.recipe.w).toBeGreaterThan(330);
      expect(m.analysis.w).toBeGreaterThan(m.recipe.w);
      expect(m.analysis.x).toBeGreaterThanOrEqual(m.recipe.x + m.recipe.w);
      if (w >= 1024) expect(m.pot.w).toBeGreaterThanOrEqual(420);
      else expect(m.pot.w).toBeGreaterThanOrEqual(370);
      expect(m.overflow).toBe(0);
    });

    test('the recipe card lists every row of a six ingredient brew and the radar shows', async ({ page, open }) => {
      await open(MAI_TAI);
      await settled(page);
      const m = await boxes(page);
      expect(m.radar).not.toBeNull();
      expect(m.radar!.w).toBeGreaterThan(190);
      await expect(page.locator('.rc__rows .row')).toHaveCount(6);
      await expect(page.locator('.rc__more[data-show]')).toHaveCount(0);
      expect(m.rowsScroll).toBe(0);
    });

    for (const [label, state] of [['a Mai Tai', MAI_TAI], ['the worst-case brew (three suggestions, two tips, a clash)', WORST], ['a floored equation', FLOORED]] as const) {
      test(`the whole analysis card is readable without scrolling with ${label}`, async ({ page, open }) => {
        await open(state);
        await settled(page);
        if (state === WORST) await expect(page.locator('.try__row')).toHaveCount(3);
        const m = await boxes(page);
        expect(m.apScroll, 'analysis card scrolls inside').toBeLessThanOrEqual(0);
        expect(m.rowsScroll, 'recipe rows scroll inside').toBeLessThanOrEqual(0);
      });
    }
  });
}

// Portrait monitors: the stacked layout is scaled (zoom ladder keyed on the width) so it reads about 1080 to 1250
// CSS pixels wide, and the pot is limited by its stage rather than by the 1280px cap while the stage has room.
for (const [w, h, minZoom] of [[1080, 1920, 1], [1200, 1920, 1.1], [1366, 2048, 1.2], [1300, 2311, 1.2], [1440, 2560, 1.2], [1600, 2560, 1.4], [1750, 3111, 1.6], [2160, 3840, 1.8]]) {
  test.describe(`portrait monitor ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    test('the layout is scaled to a sensible width and the pot fills its stage', async ({ page, open }) => {
      await open(MAI_TAI);
      await settled(page);
      const m = await boxes(page);
      expect(m.zoom).toBeGreaterThanOrEqual(minZoom);
      const layoutW = w / m.zoom;
      expect(layoutW).toBeGreaterThanOrEqual(1070);
      expect(layoutW).toBeLessThanOrEqual(1260);
      expect(m.stage.w).toBeGreaterThan(layoutW - 60);
      expect(m.recipe.y).toBeGreaterThanOrEqual(m.stage.y + m.stage.h - 1);
      expect(m.analysis.y).toBeCloseTo(m.recipe.y, 0);
      // the pot follows min(stage width, stage height less the hint x 1.2, 1280px) in CSS pixels, in every engine
      const expected = Math.min(m.stageInner.w, (m.stageInner.h - 46) * 1.2, 1280);
      expect(Math.abs(m.pot.w - expected), `pot ${m.pot.w} against ${expected}`).toBeLessThanOrEqual(2);
      expect(m.pot.w, 'pot is not held at the cap').toBeLessThan(1280);
      // no dead band above and below the pot beyond about 10% of the stage
      const spare = m.stageInner.h - 46 - m.pot.h;
      expect(spare / m.stageInner.h, 'spare stage height').toBeLessThanOrEqual(0.11);
      expect(m.overflow).toBe(0);
    });

    for (const state of [WORST, FLOORED]) {
      test(`the cards fit without scrolling, the radar shows (${state.name})`, async ({ page, open }) => {
        await open(state);
        await settled(page);
        const m = await boxes(page);
        expect(m.apScroll).toBeLessThanOrEqual(0);
        expect(m.rowsScroll).toBeLessThanOrEqual(0);
        expect(m.radar).not.toBeNull();
      });
    }

    test('every shelf tab sits inside the tab strip and the page cannot scroll sideways', async ({ page, open }) => {
      await open(MAI_TAI);
      await settled(page);
      const m = await boxes(page);
      expect(m.tabs.length).toBeGreaterThan(6);
      for (const t of m.tabs) expect(t.visible, `${t.name} in the tab strip`).toBeGreaterThan(0.99);
      expect(m.overflowX).toBe(0);
    });
  });
}

// The landscape ladder is untouched by the portrait one.
for (const [w, h, zoom] of [[1920, 1080, 1.2], [2560, 1440, 1.6], [3840, 2160, 2], [1280, 800, 1]]) {
  test.describe(`landscape ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    test(`zoom stays ${zoom}`, async ({ page, open }) => {
      await open(NEGRONI);
      const z = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.app')!).zoom) || 1);
      expect(z).toBe(zoom);
    });
  });
}

for (const [w, h] of [[1000, 1000], [1100, 1100], [1280, 1024], [1366, 1024], [1440, 900], [1280, 720], [1180, 820], [1920, 1080]]) {
  test.describe(`${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } });

    test('keeps three columns', async ({ page, open }) => {
      await open(NEGRONI);
      await settled(page);
      const m = await boxes(page);
      expect(m.recipe.x).toBeLessThan(m.stage.x);
      expect(m.analysis.x).toBeGreaterThan(m.stage.x);
      expect(m.recipe.y).toBeCloseTo(m.analysis.y, 0);
      expect(m.stage.y).toBeCloseTo(m.recipe.y, 0);
    });
  });
}
