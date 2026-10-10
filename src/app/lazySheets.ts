/* Code-split surfaces. First paint only needs the pot, shelf and recipe; the sheets and the
   pour dial load when the browser is idle, or sooner when the pointer or focus nears their
   trigger. Each loader runs once, so a later React.lazy resolves from the module cache. */
import { lazy, type ComponentType } from 'react';
import type { ServeSheetProps } from '../components/Serve/ServeSheet';
import type { GrimoireProps } from '../components/Grimoire/Grimoire';
import type { CellarProps } from '../components/Cellar/Cellar';
import type { PourDialProps } from '../components/Dial/PourDial';

export type LazyName = 'serve' | 'grimoire' | 'cellar' | 'dial';

const loaders = {
  serve: () => import('../components/Serve/ServeSheet').then((m) => m.ServeSheet),
  grimoire: () => import('../components/Grimoire/Grimoire').then((m) => m.Grimoire),
  cellar: () => import('../components/Cellar/Cellar').then((m) => m.Cellar),
  dial: () => import('../components/Dial/PourDial').then((m) => m.PourDial),
};

const started = new Map<LazyName, Promise<unknown>>();

/** Start fetching one surface (idempotent). A failed fetch is forgotten so a later call retries. */
export function prefetch(name: LazyName): Promise<unknown> {
  let p = started.get(name);
  if (!p) {
    p = loaders[name]();
    started.set(name, p);
    p.catch(() => started.delete(name));
  }
  return p;
}

export const prefetchAll = () => Promise.all((Object.keys(loaders) as LazyName[]).map(prefetch));

/** Run `cb` once the browser is idle (setTimeout where requestIdleCallback is missing); returns a cancel. */
export function whenIdle(cb: () => void, timeout = 2000): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(cb, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 600);
  return () => window.clearTimeout(id);
}

// A chunk that cannot load (offline, a stale tab after a deploy) renders nothing instead of
// taking the whole app down; the idle prefetch retries on the next visit.
const lazyOf = <P extends object>(name: LazyName) =>
  lazy(() =>
    (prefetch(name) as Promise<ComponentType<P>>).then(
      (component) => ({ default: component }),
      () => ({ default: (() => null) as ComponentType<P> }),
    ),
  );

export const ServeSheet = lazyOf<ServeSheetProps>('serve');
export const Grimoire = lazyOf<GrimoireProps>('grimoire');
export const Cellar = lazyOf<CellarProps>('cellar');
export const PourDial = lazyOf<PourDialProps>('dial');
