import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NAME, HISTORY_LIMIT, initialState, LEGACY_KEY, loadState, parseStored, reducer, serialize,
  STORAGE_KEY, type BrewAction, type BrewState,
} from './store';

const run = (state: BrewState, ...actions: BrewAction[]) => actions.reduce(reducer, state);
const add = (id: string, ml: number): BrewAction => ({ type: 'add', id, ml });
const fake = (data: Record<string, string>) => ({ getItem: (k: string) => data[k] ?? null });

describe('brew actions', () => {
  it('folds merged setAmount steps (a scrub) into one undo entry', () => {
    let s = run(initialState(), add('gin', 30), { type: 'setAmount', id: 'gin', ml: 35 });
    for (const ml of [40, 45, 50]) s = reducer(s, { type: 'setAmount', id: 'gin', ml, merge: true });
    expect(s.brew).toEqual([{ id: 'gin', ml: 50 }]);
    expect(s.past).toHaveLength(2);
    expect(reducer(s, { type: 'undo' }).brew).toEqual([{ id: 'gin', ml: 30 }]);
  });

  it('adds, merges and rounds', () => {
    const s = run(initialState(), add('gin', 45), add('lime_juice', 22.46), add('gin', 15));
    expect(s.brew).toEqual([{ id: 'gin', ml: 60 }, { id: 'lime_juice', ml: 22.5 }]);
  });

  it('starts a new step when a merged setAmount follows an unrelated commit', () => {
    let s = run(initialState(), add('gin', 30), { type: 'setAmount', id: 'gin', ml: 35 }, add('campari', 30));
    s = reducer(s, { type: 'setAmount', id: 'gin', ml: 40, merge: true });
    expect(s.past).toHaveLength(4);
    expect(reducer(s, { type: 'undo' }).brew).toEqual([{ id: 'gin', ml: 35 }, { id: 'campari', ml: 30 }]);
  });

  it('ignores unknown ingredients and bad amounts', () => {
    const s = initialState();
    expect(reducer(s, add('nope', 30))).toBe(s);
    expect(reducer(s, add('__proto__', 30))).toBe(s);
    expect(reducer(s, add('gin', 0))).toBe(s);
    expect(reducer(s, add('gin', Number.NaN))).toBe(s);
  });

  it('sets an amount, and removes at zero or below', () => {
    const s = run(initialState(), add('gin', 45), add('vodka', 30));
    expect(run(s, { type: 'setAmount', id: 'gin', ml: 60 }).brew[0].ml).toBe(60);
    expect(run(s, { type: 'setAmount', id: 'gin', ml: 0 }).brew).toEqual([{ id: 'vodka', ml: 30 }]);
    expect(run(s, { type: 'setAmount', id: 'gin', ml: -5 }).brew).toHaveLength(1);
    expect(reducer(s, { type: 'setAmount', id: 'rum_missing', ml: 10 })).toBe(s);
  });

  it('nudges by the unit step, and by one piece for counted items', () => {
    const s = run(initialState(), add('gin', 45), add('angostura', 1.8));
    const up = run(s, { type: 'nudge', id: 'gin', dir: 1 });
    expect(up.brew[0].ml).toBe(52.5); // oz step 0.25 * 30
    expect(run(up, { type: 'setUnit', unit: 'ml' }, { type: 'nudge', id: 'gin', dir: -1 }).brew[0].ml).toBe(47.5);
    expect(run(s, { type: 'nudge', id: 'angostura', dir: 1 }).brew[1].ml).toBe(2.7);
    expect(run(s, { type: 'nudge', id: 'angostura', dir: -1 }).brew[1].ml).toBe(0.9);
    const gone = run(s, { type: 'nudge', id: 'angostura', dir: -1 }, { type: 'nudge', id: 'angostura', dir: -1 });
    expect(gone.brew.map((e) => e.id)).toEqual(['gin']);
  });

  it('removes and clears', () => {
    const s = run(initialState({ name: 'Mine' }), add('gin', 45), add('vodka', 30));
    expect(run(s, { type: 'remove', id: 'gin' }).brew).toEqual([{ id: 'vodka', ml: 30 }]);
    const cleared = run(s, { type: 'clear' });
    expect(cleared.brew).toEqual([]);
    expect(cleared.name).toBe(DEFAULT_NAME);
  });

  it('loads a classic recipe and its name', () => {
    const s = run(initialState(), { type: 'loadRecipe', id: 'negroni' });
    expect(s.name).toBe('Negroni');
    expect(s.brew).toEqual([{ id: 'gin', ml: 30 }, { id: 'campari', ml: 30 }, { id: 'sweet_vermouth', ml: 30 }]);
    expect(reducer(s, { type: 'loadRecipe', id: 'nope' })).toBe(s);
    expect(reducer(s, { type: 'loadRecipe', id: 'constructor' })).toBe(s);
  });

  it('loads a shared brew, dropping junk', () => {
    const s = run(initialState(), {
      type: 'loadBrew', name: '  ', brew: [{ id: 'gin', ml: 30 }, { id: 'nope', ml: 5 }, { id: 'gin', ml: 15 }, { id: 'vodka', ml: -1 }],
    });
    expect(s.brew).toEqual([{ id: 'gin', ml: 45 }]);
    expect(s.name).toBe(DEFAULT_NAME);
  });

  it('sets unit and name', () => {
    const s = run(initialState(), { type: 'setUnit', unit: 'cl' }, { type: 'setName', name: 'Hello' });
    expect(s).toMatchObject({ unit: 'cl', name: 'Hello' });
    expect(reducer(s, { type: 'setUnit', unit: 'bogus' as never })).toBe(s);
  });
});

describe('history', () => {
  it('undoes and redoes every undoable action', () => {
    const steps: BrewAction[] = [
      add('gin', 45),
      { type: 'setAmount', id: 'gin', ml: 60 },
      { type: 'nudge', id: 'gin', dir: 1 },
      add('vodka', 30),
      { type: 'remove', id: 'vodka' },
      { type: 'loadRecipe', id: 'daiquiri' },
      { type: 'loadBrew', brew: [{ id: 'rye', ml: 60 }], name: 'Shared' },
      { type: 'clear' },
    ];
    let s = initialState();
    const states = [s];
    for (const a of steps) {
      s = reducer(s, a);
      states.push(s);
    }
    expect(s.past).toHaveLength(steps.length);
    for (let i = steps.length - 1; i >= 0; i--) {
      s = reducer(s, { type: 'undo' });
      expect(s.brew).toEqual(states[i].brew);
      expect(s.name).toBe(states[i].name);
    }
    expect(s.past).toHaveLength(0);
    for (let i = 1; i <= steps.length; i++) {
      s = reducer(s, { type: 'redo' });
      expect(s.brew).toEqual(states[i].brew);
      expect(s.name).toBe(states[i].name);
    }
    expect(s.future).toHaveLength(0);
  });

  it('a new action clears the redo stack', () => {
    const s = run(initialState(), add('gin', 45), add('vodka', 30), { type: 'undo' });
    expect(s.future).toHaveLength(1);
    expect(reducer(s, add('rye', 30)).future).toHaveLength(0);
  });

  it('does nothing at the ends of history', () => {
    const s = initialState();
    expect(reducer(s, { type: 'undo' })).toBe(s);
    expect(reducer(s, { type: 'redo' })).toBe(s);
  });

  it('does not record unit changes', () => {
    const s = run(initialState(), add('gin', 45));
    const t = reducer(s, { type: 'setUnit', unit: 'ml' });
    expect(t.past).toBe(s.past);
    expect(t.future).toBe(s.future);
    // undo keeps the unit
    const u = reducer(t, { type: 'undo' });
    expect(u.unit).toBe('ml');
    expect(u.brew).toEqual([]);
  });

  it('makes a rename its own undo step, so undoing a brew change keeps the typed name', () => {
    const s = run(initialState(), add('gin', 30), add('vodka', 30), { type: 'setName', name: 'My Vodka Gin' });
    expect(s.past).toHaveLength(3);
    // the first undo reverses the rename only; the brew stays
    const u1 = reducer(s, { type: 'undo' });
    expect(u1.name).toBe(DEFAULT_NAME);
    expect(u1.brew).toHaveLength(2);
    // renaming again after the undo drops the redo branch
    const u2 = reducer(reducer(s, { type: 'undo' }), { type: 'undo' });
    expect(u2.brew).toEqual([{ id: 'gin', ml: 30 }]);
    expect(reducer(u2, { type: 'redo' }).brew).toHaveLength(2);
    // undoing a later brew change leaves the name alone
    const t = reducer(s, add('campari', 30));
    const back = reducer(t, { type: 'undo' });
    expect(back.name).toBe('My Vodka Gin');
    expect(back.brew).toHaveLength(2);
  });

  it('ignores a rename to the same name', () => {
    const s = run(initialState(), add('gin', 30));
    expect(reducer(s, { type: 'setName', name: s.name })).toBe(s);
  });

  it('records no step for a load that changes nothing', () => {
    const neg = reducer(initialState(), { type: 'loadRecipe', id: 'negroni' });
    expect(neg.brew.length).toBeGreaterThan(0);
    expect(neg.past).toHaveLength(1);
    expect(reducer(neg, { type: 'loadRecipe', id: 'negroni' })).toBe(neg);
    expect(reducer(neg, { type: 'loadBrew', brew: neg.brew.map((e) => ({ ...e })), name: neg.name })).toBe(neg);
    // the same brew under a new name is still a step
    expect(reducer(neg, { type: 'loadBrew', brew: neg.brew, name: 'Mine' }).past).toHaveLength(2);
    // a different amount is a step too
    const tweaked = neg.brew.map((e, i) => (i === 0 ? { ...e, ml: e.ml + 5 } : e));
    expect(reducer(neg, { type: 'loadBrew', brew: tweaked, name: neg.name }).past).toHaveLength(2);
  });

  it('rejects prototype keys as a unit', () => {
    const s = initialState();
    for (const unit of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      expect(reducer(s, { type: 'setUnit', unit: unit as never })).toBe(s);
    }
  });

  it('caps one ingredient at 1000 ml', () => {
    let s = run(initialState(), add('gin', 900), add('gin', 900));
    expect(s.brew).toEqual([{ id: 'gin', ml: 1000 }]);
    s = reducer(s, { type: 'setAmount', id: 'gin', ml: 5000 });
    expect(s.brew[0].ml).toBe(1000);
  });

  it('does not record no-ops', () => {
    const s = run(initialState(), add('gin', 45));
    expect(reducer(s, { type: 'remove', id: 'vodka' })).toBe(s);
    expect(reducer(s, { type: 'nudge', id: 'vodka', dir: 1 })).toBe(s);
    expect(reducer(s, { type: 'setAmount', id: 'gin', ml: 45 })).toBe(s);
    expect(reducer(initialState(), { type: 'clear' })).toEqual(initialState());
  });

  it('caps history at 60 steps', () => {
    let s = initialState();
    for (let i = 0; i < 75; i++) s = reducer(s, add('gin', 1));
    expect(s.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < 100; i++) s = reducer(s, { type: 'undo' });
    expect(s.future).toHaveLength(HISTORY_LIMIT);
    expect(s.brew[0].ml).toBe(15); // 75 - 60 steps were forgotten
  });
});

describe('persistence', () => {
  it('ignores a prototype key in the stored unit', () => {
    for (const unit of ['toString', 'constructor', '__proto__']) {
      const raw = `{"unit":"${unit}","brew":[{"id":"gin","ml":30}],"name":"x"}`;
      expect(parseStored(raw)).toMatchObject({ unit: 'oz', name: 'x', brew: [{ id: 'gin', ml: 30 }] });
    }
  });

  it('caps stored amounts at 1000 ml', () => {
    const s = parseStored(JSON.stringify({ unit: 'ml', name: 'x', brew: [{ id: 'gin', ml: 1e300 }, { id: 'vodka', ml: 600 }, { id: 'vodka', ml: 600 }] }));
    expect(s?.brew).toEqual([{ id: 'gin', ml: 1000 }, { id: 'vodka', ml: 1000 }]);
  });

  it('stores only unit, brew and name', () => {
    const s = run(initialState({ unit: 'cl' }), add('gin', 45), add('vodka', 10), { type: 'undo' });
    expect(JSON.parse(serialize(s))).toEqual({ unit: 'cl', brew: [{ id: 'gin', ml: 45 }], name: DEFAULT_NAME });
  });

  it('round-trips through storage with empty history', () => {
    const s = run(initialState({ unit: 'parts', name: 'Keep me' }), add('gin', 45));
    const back = loadState(fake({ [STORAGE_KEY]: serialize(s) }));
    expect(back).toMatchObject({ unit: 'parts', name: 'Keep me', brew: [{ id: 'gin', ml: 45 }], past: [], future: [] });
  });

  it('migrates the legacy key and prefers the new one', () => {
    const legacy = JSON.stringify({ unit: 'cl', brew: [{ id: 'rye', ml: 60 }], name: 'Old' });
    expect(loadState(fake({ [LEGACY_KEY]: legacy })).name).toBe('Old');
    const current = JSON.stringify({ unit: 'ml', brew: [], name: 'New' });
    expect(loadState(fake({ [LEGACY_KEY]: legacy, [STORAGE_KEY]: current })).name).toBe('New');
  });

  it('falls back to the legacy key when the new one is corrupt', () => {
    const legacy = JSON.stringify({ unit: 'cl', brew: [{ id: 'rye', ml: 60 }], name: 'Old' });
    expect(loadState(fake({ [STORAGE_KEY]: '{oops', [LEGACY_KEY]: legacy })).name).toBe('Old');
  });

  it('moves the old default name to the new one', () => {
    expect(DEFAULT_NAME).toBe('Untitled brew');
    expect(parseStored(JSON.stringify({ brew: [], name: 'Untitled Brew' }))?.name).toBe('Untitled brew');
    expect(parseStored(JSON.stringify({ brew: [], name: 'Untitled Brew 2' }))?.name).toBe('Untitled Brew 2');
  });

  it('survives garbage and blocked storage', () => {
    expect(loadState(fake({ [STORAGE_KEY]: 'not json' }))).toEqual(initialState());
    expect(loadState(fake({ [STORAGE_KEY]: '{"brew":5}' }))).toEqual(initialState());
    expect(loadState(fake({ [STORAGE_KEY]: 'null' }))).toEqual(initialState());
    expect(loadState(null)).toEqual(initialState());
    const throwing = { getItem: () => { throw new Error('blocked'); } };
    expect(loadState(throwing)).toEqual(initialState());
  });

  it('cleans stored entries and falls back on a bad unit or name', () => {
    const s = parseStored(JSON.stringify({
      unit: 'furlongs', name: '', brew: [{ id: 'gin', ml: '45' }, { id: 'nope', ml: 5 }, { id: 'vodka', ml: 0 }, null, 3],
    }));
    expect(s).toMatchObject({ unit: 'oz', name: DEFAULT_NAME, brew: [{ id: 'gin', ml: 45 }] });
  });
});
