import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { INGREDIENTS } from '../data/ingredients';
import { IngredientIcon } from './Icons';

const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const refs = (html: string) => [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);

describe('IngredientIcon', () => {
  for (const variant of ['tile', 'shelf'] as const) {
    it(`renders every ingredient in the ${variant} variant`, () => {
      for (const ing of INGREDIENTS) {
        const html = renderToStaticMarkup(<IngredientIcon ing={ing} variant={variant} />);
        expect(html, ing.id).toContain('<svg');
        expect(html, ing.id).toContain(variant === 'shelf' ? 'viewBox="0 0 48 104"' : 'viewBox="0 0 48 48"');
        expect(html, ing.id).not.toContain('NaN');
        expect(html, ing.id).not.toContain('undefined');
        expect(html, ing.id).not.toContain('<filter');
        // every referenced gradient or clip exists in the same icon
        const own = new Set(ids(html));
        for (const r of refs(html)) expect(own.has(r), `${ing.id} references #${r}`).toBe(true);
        // ids are unique inside one icon
        expect(new Set(ids(html)).size, ing.id).toBe(ids(html).length);
      }
    });
  }

  it('defaults to the tile variant', () => {
    const ing = INGREDIENTS[0];
    expect(renderToStaticMarkup(<IngredientIcon ing={ing} />)).toContain('viewBox="0 0 48 48"');
  });

  it('gives every instance in one document unique ids', () => {
    const html = renderToStaticMarkup(
      <>
        {INGREDIENTS.flatMap((ing) => [
          <IngredientIcon key={`${ing.id}-t`} ing={ing} />,
          <IngredientIcon key={`${ing.id}-s`} ing={ing} variant="shelf" />,
          <IngredientIcon key={`${ing.id}-s2`} ing={ing} variant="shelf" />,
        ])}
      </>,
    );
    const all = ids(html);
    expect(all.length).toBeGreaterThan(INGREDIENTS.length * 3);
    expect(new Set(all).size).toBe(all.length);
  });

  it('draws bourbon, rye and scotch differently', () => {
    const by = (id: string) => INGREDIENTS.find((i) => i.id === id)!;
    const svg = (id: string) => renderToStaticMarkup(<IngredientIcon ing={by(id)} variant="shelf" />).replace(/_r_[^"]*?_|«[^»]*»/g, '');
    expect(new Set([svg('bourbon'), svg('rye'), svg('scotch')]).size).toBe(3);
    expect(new Set([svg('white_rum'), svg('dark_rum'), svg('spiced_rum')]).size).toBe(3);
  });
});
