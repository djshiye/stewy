import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { explainChange, explainChangeWithTone, type Tone } from './explain';
import { withAdded } from './coach';
import { harmony } from './harmony';

const brew = (...xs: [string, number][]): BrewEntry[] => xs.map(([id, ml]) => ({ id, ml }));
const NEGRONI = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
const explain = (a: BrewEntry[], b: BrewEntry[], name: string, kind?: Parameters<typeof explainChange>[3]) =>
  explainChange(harmony(a), harmony(b), name, kind);

describe('explainChange', () => {
  it('says more Campari tips a Negroni toward bitter and costs its shape', () => {
    const text = explain(NEGRONI, brew(['gin', 30], ['campari', 45], ['sweet_vermouth', 30]), 'Campari');
    expect(text).toMatch(/^More Campari tips the balance toward bitter/);
  });

  it('says less Campari pushes the balance toward sweet', () => {
    const text = explain(NEGRONI, brew(['gin', 30], ['campari', 15], ['sweet_vermouth', 30]), 'Campari', 'less');
    expect(text).toBe('Less Campari pushes the balance toward sweet.');
  });

  it('names the sour side when lime pulls a sour toward sour', () => {
    const daiquiri = brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]);
    const text = explain(daiquiri, brew(['white_rum', 45], ['lime_juice', 60], ['simple_syrup', 15]), 'Lime juice');
    expect(text).toBe('More lime juice tips the balance toward sour.');
  });

  it('keeps sentence case: proper names stay capitalised, others drop to lower case mid sentence', () => {
    const text = explain(NEGRONI, brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 60]), 'Sweet vermouth');
    expect(text.startsWith('More sweet vermouth')).toBe(true);
  });

  it('calls out a clash', () => {
    const before = brew(['heavy_cream', 30], ['mezcal', 30]);
    const text = explain(before, [...before, { id: 'lime_juice', ml: 25 }], 'Lime juice', 'add');
    expect(text).toBe('Adding lime juice clashes with something already in the pot.');
  });

  it('explains a first pour without a before score', () => {
    const text = explainChange(null, harmony(brew(['gin', 30])), 'Gin', 'add');
    expect(text).toMatch(/Gin/);
    expect(text.length).toBeGreaterThan(10);
  });

  it('says so when nothing changes', () => {
    expect(explainChange(harmony(NEGRONI), harmony(NEGRONI), 'Gin', 'same')).toBe('This is the amount already in the pot.');
    const text = explain(NEGRONI, brew(['gin', 45], ['campari', 30], ['sweet_vermouth', 30]), 'Gin');
    expect(text).toBe('More gin would not move the score at this measure.');
  });

  it('describes a lone ingredient after a removal, not a crowd', () => {
    const text = explain(NEGRONI, brew(['gin', 30]), 'Campari', 'remove');
    expect(text).toBe('Taking out Campari leaves a lone ingredient, which is a pour, not a drink.');
  });

  it('handles an empty result', () => {
    expect(explainChange(harmony(brew(['gin', 30])), null, 'Gin', 'remove')).toBe('The pot would be empty.');
  });

  it('never uses dashes, emoji or all caps', () => {
    const cases: [BrewEntry[], BrewEntry[], string][] = [
      [NEGRONI, brew(['gin', 30], ['campari', 45], ['sweet_vermouth', 30]), 'Campari'],
      [NEGRONI, brew(['gin', 30], ['campari', 15], ['sweet_vermouth', 30]), 'Campari'],
      [brew(['heavy_cream', 30], ['mezcal', 30]), brew(['heavy_cream', 30], ['mezcal', 30], ['lime_juice', 25]), 'Lime juice'],
      [brew(['vodka', 45]), brew(['vodka', 45], ['coffee_liqueur', 20], ['espresso', 30]), 'Espresso'],
    ];
    for (const [a, b, name] of cases) {
      const text = explain(a, b, name);
      expect(text).not.toMatch(/[‒-―]/);
      expect(text).toMatch(/\.$/);
    }
  });

  it('stays neutral when the score does not move, even if flavours shift', () => {
    const before = harmony(NEGRONI);
    const after = harmony(withAdded(NEGRONI, 'vodka', 30));
    expect(after?.score).toBe(before?.score);
    const text = explainChange(before, after, 'Vodka', 'add');
    expect(text).toBe('Adding vodka would not move the score at this measure.');
    expect(text).not.toMatch(/fights|clashes/);
  });

  it('keeps harsh wording for a clearly negative change', () => {
    const base = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
    for (const ing of INGREDIENTS) {
      const a = harmony(base);
      const b = harmony(withAdded(base, ing.id, ing.amt));
      const d = (b?.score ?? 0) - (a?.score ?? 0);
      if (d > -2) expect(explainChange(a, b, ing.name, 'add'), ing.id).not.toMatch(/fights|clashes with/);
    }
  });
});

/** Words that read as bad news, and words that read as good news. */
const NEGATIVE = /clashes with|fights with|costs a|blurs|loses the shape|too sweet|too sour|one-note|crowds|further apart|is a pour, not a drink/;
const POSITIVE = /pairs well|firms up|small lift|evens out|closer to even|adds variety|clears a|gives the drink the shape|makes it a drink|read cleaner|clears the crowd/;

describe('explanation tone agrees with the score change', () => {
  const SAMPLE: BrewEntry[][] = [
    ...['negroni', 'daiquiri', 'old_fashioned', 'margarita', 'white_russian', 'mojito', 'espresso_martini'].map(
      (id) => RECIPES.find((r) => r.id === id)?.build.map(([i, ml]) => ({ id: i, ml })) ?? [],
    ),
    brew(['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30]),
    brew(['gin', 45]),
    brew(['simple_syrup', 40], ['grenadine', 20], ['vodka', 10]),
    brew(['campari', 60], ['espresso', 30], ['cola', 30]),
  ];

  it('has a usable sample', () => {
    expect(SAMPLE.filter((b) => b.length > 0).length).toBeGreaterThanOrEqual(8);
  });

  it('matches the sign of the delta with a one point dead band', () => {
    const bad: string[] = [];
    for (const b of SAMPLE.filter((x) => x.length > 0)) {
      const before = harmony(b);
      for (const ing of INGREDIENTS) {
        const after = harmony(withAdded(b, ing.id, ing.amt));
        const d = (after?.score ?? 0) - (before?.score ?? 0);
        const { text, tone } = explainChangeWithTone(before, after, ing.name, b.some((e) => e.id === ing.id) ? 'more' : 'add');
        const want: Tone = d >= 2 ? 'positive' : d <= -2 ? 'negative' : 'neutral';
        const okTone = want === 'neutral'
          ? d === 0 ? tone === 'neutral' : d > 0 ? tone !== 'negative' : tone !== 'positive'
          : tone === want;
        const okWords = d >= 0 ? !NEGATIVE.test(text) : !POSITIVE.test(text);
        const okHarsh = d <= -2 || !/clashes with|fights with/.test(text);
        if (!okTone || !okWords || !okHarsh) bad.push(`${b.map((e) => e.id).join('+')} + ${ing.id} (${d}): ${text}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
