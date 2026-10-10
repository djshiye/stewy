/* Share links: a brew packed into the URL hash. No server, no accounts. */
import type { BrewEntry } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { MAX_ML } from '../store';

export interface SharedBrew {
  brew: BrewEntry[];
  name: string;
}

/** Every ingredient once: duplicates are refused, so any real brew fits. */
export const MAX_SHARED_ENTRIES = Object.keys(ING_BY_ID).length;
const MAX_NAME = 40;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Hash fragment (without the '#'): `b=gin:30,lime_juice:25&n=Name`. */
export function encodeBrew({ brew, name }: SharedBrew): string {
  const b = brew.map((e) => `${e.id}:${round1(e.ml)}`).join(',');
  let n = '';
  try {
    n = encodeURIComponent(name);
  } catch {
    /* lone surrogate in the name: share the brew without it */
  }
  return `b=${b}&n=${n}`;
}

/** Parse a fragment made by encodeBrew; null for anything invalid. */
export function decodeBrew(fragment: string): SharedBrew | null {
  try {
    const params = new URLSearchParams(fragment.replace(/^#/, ''));
    const raw = params.get('b');
    if (!raw) return null;
    const parts = raw.split(',');
    if (parts.length > MAX_SHARED_ENTRIES) return null;
    const brew: BrewEntry[] = [];
    for (const part of parts) {
      const m = /^([a-z0-9_]+):(\d+(?:\.\d+)?)$/.exec(part);
      if (!m || !Object.hasOwn(ING_BY_ID, m[1]) || brew.some((e) => e.id === m[1])) return null;
      const ml = round1(Number(m[2]));
      if (!(ml > 0 && ml <= MAX_ML)) return null;
      brew.push({ id: m[1], ml });
    }
    const name = (params.get('n') ?? '').trim().slice(0, MAX_NAME).trim();
    return { brew, name };
  } catch {
    return null;
  }
}

/** True when the fragment looks like an attempt at a share link (has a `b=` part), valid or not. */
export function hasShareParam(fragment: string): boolean {
  try {
    return new URLSearchParams(fragment.replace(/^#/, '')).has('b');
  } catch {
    return false;
  }
}

const inBrowser = () => typeof location !== 'undefined';

/** Full link for a brew. */
export function shareUrl(state: SharedBrew, base?: string): string {
  const origin = base ?? (inBrowser() ? location.origin + location.pathname : '');
  return `${origin}#${encodeBrew(state)}`;
}

/** The brew in the current page hash, if any. DOM helper. */
export function readSharedBrew(): SharedBrew | null {
  return inBrowser() ? decodeBrew(location.hash) : null;
}

/** True when the page hash carries a share link, whether or not it can be read. DOM helper. */
export function hasShareHash(): boolean {
  return inBrowser() && hasShareParam(location.hash);
}

/** Drop the share hash from the address bar without a reload. DOM helper. */
export function clearShareHash(): void {
  if (!inBrowser() || !location.hash) return;
  history.replaceState(null, '', location.pathname + location.search);
}
