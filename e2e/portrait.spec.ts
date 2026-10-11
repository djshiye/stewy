import { test, expect, MAI_TAI, NEGRONI, settled } from './fixtures';

// From 1000 wide, a viewport taller than 5 : 4 stacks the shell: the stage spans the width and the recipe and
// analysis cards sit side by side below it (src/styles/layout.css). Squares and landscape keep three columns.
const boxes = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const r = (s: string) => {
      const b = document.querySelector(s)!.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return {
      stage: r('.slot--stage'),
      recipe: r('.slot--recipe'),
      analysis: r('.slot--analysis'),
      pot: r('.stg-pot'),
      radar: document.querySelector('.radar') ? r('.radar') : null,
      overflow: document.documentElement.scrollHeight - innerHeight,
    };
  });

test.describe('tall desktop 1024 x 1366', () => {
  test.use({ viewport: { width: 1024, height: 1366 } });

  test('the pot spans the top and the two cards sit side by side below it', async ({ page, open }) => {
    await open(MAI_TAI);
    await settled(page);
    const m = await boxes(page);
    expect(m.stage.w).toBeGreaterThan(960);
    expect(m.recipe.y).toBeGreaterThanOrEqual(m.stage.y + m.stage.h - 1);
    expect(m.analysis.y).toBeCloseTo(m.recipe.y, 0);
    expect(m.recipe.w).toBeCloseTo(m.analysis.w, 0);
    expect(m.recipe.w).toBeGreaterThan(470);
    expect(m.analysis.x).toBeGreaterThanOrEqual(m.recipe.x + m.recipe.w);
    expect(m.pot.w).toBeGreaterThan(500);
    expect(m.pot.w).toBeLessThan(720);
    expect(m.overflow).toBe(0);
  });

  test('the analysis card shows its radar and the recipe card lists every row of a six ingredient brew', async ({ page, open }) => {
    await open(MAI_TAI);
    await settled(page);
    const m = await boxes(page);
    expect(m.radar).not.toBeNull();
    expect(m.radar!.w).toBeGreaterThan(200);
    await expect(page.locator('.rc__rows .row')).toHaveCount(6);
  });
});

for (const [w, h] of [[1000, 1000], [1000, 1200], [1100, 1100], [1280, 1024], [1366, 1024]]) {
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
