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

/**
 * One plain sentence on why the score moved, from `before` to `after` (either can be
 * null for an empty pot). `kind` says how the ingredient changed so the sentence reads
 * "More Campari" or "Adding Campari".
 */
export function explainChange(
  before: Harmony | null,
  after: Harmony | null,
  ingName: string,
  kind: ChangeKind = 'more',
): string {
  if (kind === 'same') return 'This is the amount already in the pot.';
  if (!after) return 'The pot would be empty.';
  if (!before) return firstPour(after, ingName);

  const S = lead(kind, ingName);
  const dPair = after.parts.pairing - before.parts.pairing;
  const dBal = after.parts.balance - before.parts.balance;
  const dStruct = after.parts.structure - before.parts.structure;
  const dSweetSour = after.parts.sweetSour - before.parts.sweetSour;
  const dOneNote = after.parts.oneNote - before.parts.oneNote;
  const dClash = after.parts.clash - before.parts.clash;
  const dCrowd = after.parts.crowd - before.parts.crowd;
  const lean = after.balance !== null && before.balance !== null ? after.balance - before.balance : 0;

  // the clearest reasons first: a clash, a lost or gained shape, a lopsided pour
  const candidates: { weight: number; text: string }[] = [];
  const push = (weight: number, text: string) => candidates.push({ weight: Math.abs(weight), text });

  if (dClash <= -MIN_SHIFT) push(dClash * 1.4, `${S} clashes with something already in the pot.`);
  if (dClash >= MIN_SHIFT) push(dClash * 1.4, `${S} clears a clash between flavours.`);

  const leaning = Math.abs(lean) >= MIN_LEAN && (Math.abs(dBal) >= 0.4 || Math.abs(lean) >= 0.12);
  const balanceClause = lean < 0 ? `tips the balance toward ${sharpSide(after)}` : 'pushes the balance toward sweet';

  if (dStruct >= MIN_SHIFT || dStruct <= -MIN_SHIFT) {
    if (after.archetype && after.archetype !== before.archetype) {
      push(dStruct * 1.2, `${S} gives the drink the shape of a proper ${ARCHETYPE_NAME[after.archetype]}.`);
    } else if (before.archetype && !after.archetype) {
      push(dStruct * 1.2, leaning
        ? `${S} ${balanceClause}, so the drink loses the shape of a ${ARCHETYPE_NAME[before.archetype]}.`
        : `${S} loses the shape of a ${ARCHETYPE_NAME[before.archetype]}.`);
    } else if (dStruct > 0) {
      push(dStruct, `${S} firms up the structure of the drink.`);
    } else {
      push(dStruct, `${S} blurs the shape of the drink.`);
    }
  }

  if (dSweetSour <= -MIN_SHIFT) {
    const sweetSide = (after.p.sweet ?? 0) >= (after.p.sour ?? 0) + (after.p.bitter ?? 0);
    push(dSweetSour, sweetSide
      ? `${S} makes it too sweet without a sharp side to hold it.`
      : `${S} makes it too sour without any sweetness to soften it.`);
  } else if (dSweetSour >= MIN_SHIFT) {
    push(dSweetSour, `${S} evens out a lopsided sweet and sour.`);
  }

  if (dOneNote <= -MIN_SHIFT) push(dOneNote, `${S} piles onto one flavour and makes the drink one-note.`);
  if (dOneNote >= MIN_SHIFT) push(dOneNote, `${S} adds variety, so the drink reads less one-note.`);

  const fewer = kind === 'remove' || kind === 'less';
  if (dCrowd <= -MIN_SHIFT) {
    push(dCrowd, fewer
      ? `${S} leaves a lone ingredient, which is a pour, not a drink.`
      : `${S} crowds the pot. Fewer ingredients read cleaner.`);
  }
  if (dCrowd >= MIN_SHIFT) {
    push(dCrowd, fewer
      ? `${S} clears the crowd, so the flavours read cleaner.`
      : `${S} gives the lone ingredient company, which makes it a drink.`);
  }

  // balance: the term itself, or a clear swing in the sweet to sharp lean
  if (leaning) {
    push(Math.max(Math.abs(dBal), Math.abs(lean) * 12), `${S} ${balanceClause}.`);
  } else if (dBal >= MIN_SHIFT) {
    push(dBal, `${S} brings the sweet and sharp sides closer to even.`);
  } else if (dBal <= -MIN_SHIFT) {
    push(dBal, `${S} pulls the sweet and sharp sides further apart.`);
  }

  if (dPair >= MIN_SHIFT) push(dPair, `${S} pairs well with what is already in the pot.`);
  if (dPair <= -MIN_SHIFT) push(dPair, `${S} fights with the flavours already in the pot.`);

  if (candidates.length) {
    candidates.sort((a, b) => b.weight - a.weight);
    return candidates[0].text;
  }
  if (after.score === before.score) return `${S} barely changes the balance, so the score holds.`;
  return after.score > before.score
    ? `${S} gives the score a small lift.`
    : `${S} costs a few points without changing the character of the drink.`;
}
