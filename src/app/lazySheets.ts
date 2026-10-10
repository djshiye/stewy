/* Code-split surfaces. First paint only needs the pot, shelf and recipe; the sheets and the
   pour dial load when the browser is idle, or sooner when the pointer or focus nears their
   trigger. Each loader runs once, so a later React.lazy resolves from the module cache. */
import { Component, createElement, lazy, useState, type ComponentType, type ReactNode } from 'react';
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
/** Components whose chunk has landed: rendered directly, with no Suspense round trip. */
const loaded = new Map<LazyName, ComponentType<object>>();
/** The React.lazy wrapper of the current attempt. React caches a rejected lazy for good, so a failure drops it. */
const lazies = new Map<LazyName, ComponentType<object>>();

/** Start fetching one surface (idempotent). A failed fetch is forgotten so a later call retries. */
export function prefetch(name: LazyName): Promise<unknown> {
  let p = started.get(name);
  if (!p) {
    p = loaders[name]();
    started.set(name, p);
    p.then(
      (component) => void loaded.set(name, component as ComponentType<object>),
      () => {
        started.delete(name);
        lazies.delete(name);
      },
    );
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

const lazyFor = (name: LazyName): ComponentType<object> => {
  let c = lazies.get(name);
  if (!c) {
    c = lazy(() => (prefetch(name) as Promise<ComponentType<object>>).then((component) => ({ default: component })));
    lazies.set(name, c);
  }
  return c;
};

/**
 * A surface that renders as soon as its chunk is in. Once the (idle or hover) prefetch has landed it
 * mounts the real component at once; React.lazy always suspends on its first render, and Suspense then
 * holds the reveal back for a few hundred milliseconds even though the module is already there. The
 * choice is made once per mount, so a surface that is up never swaps element type under the user.
 * A chunk that fails to load throws to the nearest SurfaceBoundary, and the next mount tries afresh.
 */
const surfaceOf = <P extends object>(name: LazyName) =>
  function Surface(props: P) {
    const [Component] = useState(() => (loaded.get(name) ?? lazyFor(name)) as unknown as ComponentType<P>);
    return createElement(Component, props);
  };

export const ServeSheet = surfaceOf<ServeSheetProps>('serve');
export const Grimoire = surfaceOf<GrimoireProps>('grimoire');
export const Cellar = surfaceOf<CellarProps>('cellar');
export const PourDial = surfaceOf<PourDialProps>('dial');

interface BoundaryProps {
  /** Called once when a child throws (a chunk that would not load). */
  onError(): void;
  children?: ReactNode;
}

/**
 * Catches a surface whose chunk failed, renders nothing, and tells the app so it can close the surface
 * and say what happened. No error leaves the boundary; the app stays up.
 */
export class SurfaceBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
