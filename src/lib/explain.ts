/* Plain-language reasons for a score change, made by diffing the harmony breakdown.
   Pure functions, no DOM. */
import type { Archetype, Harmony } from './harmony';
import { inlineName } from './serve';

/** What the change does to the ingredient: a first pour, more, less, taken out, or nothing. */
export type ChangeKind = 'add' | 'more' | 'less' | 'remove' | 'same';

const ARCHETYPE_NAME: Record<Archetype, string> = {
  sour: 'sour',
  'spirit-forward': 'spirit-forward drink',
  highball: 'highball',
  sparkling: 'sparkling drink',
  dessert: 'dessert drink',
};

/** Which way an explanation leans: it must agree with the sign of the score change. */
export type Tone = 'positive' | 'neutral' | 'negative';

/** A change this small (in whole points) is not a verdict: only mild wording is allowed. */
const DEAD_BAND = 1;

/** Points below this are noise, not a reason. */
const MIN_SHIFT = 1.2;
/** How far the sweet to bitter lean has to move before the balance is worth a mention. */
const MIN_LEAN = 0.05;

const lead = (kind: ChangeKind, name: string) => {
  const n = inlineName(name);
  switch (kind) {
    case 'less': return `Less ${n}`;
    case 'remove': return `Taking out ${n}`;
    case 'add': return `Adding ${n}`;
    default: return `More ${n}`;
  }
};

/** Which sharp side a brew leans on: bitter, sour, or both. */
function sharpSide(h: Harmony): string {
  const bitter = h.F.bitter ?? 0;
  const sour = h.F.sour ?? 0;
  if (bitter > sour * 1.3) return 'bitter';
  if (sour > bitter * 1.3) return 'sour';
  return 'sour and bitter';
}

/** One sentence about the first thing in a brew, when there is nothing to compare to. */
function firstPour(after: Harmony, name: string): string {
  if (after.parts.crowd < -2) return `${name} alone is a pour, not yet a drink. Add something to build on.`;
  return `${name} sets the base. The next ingredient decides the balance.`;
}

interface Reason {
  weight: number;
  text: string;
  /** Which sign of score change this reason can honestly explain. `any` is a plain description. */
  fits: 'up' | 'down' | 'any';
  /** Strong language ("clashes", "fights"): only for a clearly negative change. */
  harsh?: boolean;
}

/**
 * One plain sentence on why the score moved, from `before` to `after` (either can be
 * null for an empty pot). `kind` says how the ingredient changed so the sentence reads
 * "More Campari" or "Adding Campari". The wording always agrees with the sign and size of
 * the score change: a change that rounds to zero gets a neutral line.
 */
export function explainChange(
  before: Harmony | null,
  after: Harmony | null,
  ingName: string,
  kind: ChangeKind = 'more',
): string {
  return explainChangeWithTone(before, after, ingName, kind).text;
}

/** Like `explainChange`, and also says which way the sentence leans. */
export function explainChangeWithTone(
  before: Harmony | null,
  after: Harmony | null,
  ingName: string,
  kind: ChangeKind = 'more',
): { text: string; tone: Tone } {
  const neutral = (text: string) => ({ text, tone: 'neutral' as Tone });
  if (kind === 'same') return neutral('This is the amount already in the pot.');
  if (!after) return neutral('The pot would be empty.');
  if (!before) return neutral(firstPour(after, ingName));

  const S = lead(kind, ingName);
  const delta = after.score - before.score;
  if (delta === 0) return neutral(`${S} would not move the score at this measure.`);
  const up = delta > 0;
  const clear = Math.abs(delta) > DEAD_BAND;

  const dPair = after.parts.pairing - before.parts.pairing;
  const dBal = after.parts.balance - before.parts.balance;
  const dStruct = after.parts.structure - before.parts.structure;
  const dSweetSour = after.parts.sweetSour - before.parts.sweetSour;
  const dOneNote = after.parts.oneNote - before.parts.oneNote;
  const dClash = after.parts.clash - before.parts.clash;
  const dCrowd = after.parts.crowd - before.parts.crowd;
  const lean = after.balance !== null && before.balance !== null ? after.balance - before.balance : 0;

  // the clearest reasons first: a clash, a lost or gained shape, a lopsided pour
  const candidates: Reason[] = [];
  const push = (weight: number, text: string, fits: Reason['fits'], harsh = false) =>
    candidates.push({ weight: Math.abs(weight), text, fits, harsh });

  if (dClash <= -MIN_SHIFT) push(dClash * 1.4, `${S} clashes with something already in the pot.`, 'down', true);
  if (dClash >= MIN_SHIFT) push(dClash * 1.4, `${S} clears a clash between flavours.`, 'up');

  const leaning = Math.abs(lean) >= MIN_LEAN && (Math.abs(dBal) >= 0.4 || Math.abs(lean) >= 0.12);
  const balanceClause = lean < 0 ? `tips the balance toward ${sharpSide(after)}` : 'pushes the balance toward sweet';

  if (dStruct >= MIN_SHIFT || dStruct <= -MIN_SHIFT) {
    if (after.archetype && after.archetype !== before.archetype) {
      push(dStruct * 1.2, `${S} gives the drink the shape of a proper ${ARCHETYPE_NAME[after.archetype]}.`,
        'up');
    } else if (before.archetype && !after.archetype) {
      push(dStruct * 1.2, leaning
        ? `${S} ${balanceClause}, so the drink loses the shape of a ${ARCHETYPE_NAME[before.archetype]}.`
        : `${S} loses the shape of a ${ARCHETYPE_NAME[before.archetype]}.`, 'down');
    } else if (dStruct > 0) {
      push(dStruct, `${S} firms up the structure of the drink.`, 'up');
    } else {
      push(dStruct, `${S} blurs the shape of the drink.`, 'down');
    }
  }

  if (dSweetSour <= -MIN_SHIFT) {
    const sweetSide = (after.p.sweet ?? 0) >= (after.p.sour ?? 0) + (after.p.bitter ?? 0);
    push(dSweetSour, sweetSide
      ? `${S} makes it too sweet without a sharp side to hold it.`
      : `${S} makes it too sour without any sweetness to soften it.`, 'down');
  } else if (dSweetSour >= MIN_SHIFT) {
    push(dSweetSour, `${S} evens out a lopsided sweet and sour.`, 'up');
  }

  if (dOneNote <= -MIN_SHIFT) push(dOneNote, `${S} piles onto one flavour and makes the drink one-note.`, 'down');
  if (dOneNote >= MIN_SHIFT) push(dOneNote, `${S} adds variety, so the drink reads less one-note.`, 'up');

  const fewer = kind === 'remove' || kind === 'less';
  if (dCrowd <= -MIN_SHIFT) {
    push(dCrowd, fewer
      ? `${S} leaves a lone ingredient, which is a pour, not a drink.`
      : `${S} crowds the pot. Fewer ingredients read cleaner.`, 'down');
  }
  if (dCrowd >= MIN_SHIFT) {
    push(dCrowd, fewer
      ? `${S} clears the crowd, so the flavours read cleaner.`
      : `${S} gives the lone ingredient company, which makes it a drink.`, 'up');
  }

  // balance: the term itself, or a clear swing in the sweet to sharp lean
  if (leaning) {
    push(Math.max(Math.abs(dBal), Math.abs(lean) * 12), `${S} ${balanceClause}.`, 'any');
  } else if (dBal >= MIN_SHIFT) {
    push(dBal, `${S} brings the sweet and sharp sides closer to even.`, 'up');
  } else if (dBal <= -MIN_SHIFT) {
    push(dBal, `${S} pulls the sweet and sharp sides further apart.`, 'down');
  }

  if (dPair >= MIN_SHIFT) push(dPair, `${S} pairs well with what is already in the pot.`, 'up');
  if (dPair <= -MIN_SHIFT) push(dPair, `${S} fights with the flavours already in the pot.`, 'down', true);

  // only reasons that can explain this sign of change; harsh wording needs a clear drop
  const tone: Tone = up ? 'positive' : 'negative';
  const usable = candidates
    .filter((c) => c.fits === 'any' || c.fits === (up ? 'up' : 'down'))
    .filter((c) => !c.harsh || clear);
  if (usable.length) {
    usable.sort((a, b) => b.weight - a.weight);
    return { text: usable[0].text, tone };
  }
  if (up) return { text: `${S} gives the score a small lift.`, tone };
  return {
    text: clear
      ? `${S} costs a few points without changing the character of the drink.`
      : `${S} costs a point without changing the character of the drink.`,
    tone,
  };
}
