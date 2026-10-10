import { Suspense, type ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// the Cellar chunk "fails to load": importing the module throws
vi.mock('../components/Cellar/Cellar', () => {
  throw new Error('chunk failed');
});
vi.mock('../components/Grimoire/Grimoire', () => ({
  Grimoire: ({ currentId }: { currentId: string | null }) => <p>grimoire {currentId}</p>,
}));

import { Cellar as RealCellar, Grimoire as RealGrimoire, prefetch, SurfaceBoundary } from './lazySheets';

// the surfaces take props the test does not care about
const Cellar = RealCellar as unknown as ComponentType<object>;
const Grimoire = RealGrimoire as unknown as ComponentType<{ currentId: string }>;

describe('lazy surfaces', () => {
  it('forgets a failed fetch so the next prefetch tries again', async () => {
    const first = prefetch('cellar');
    await expect(first).rejects.toThrow();
    const second = prefetch('cellar');
    expect(second).not.toBe(first);
    await expect(second).rejects.toThrow();
  });

  it('reports a failed chunk to the boundary once, and renders nothing instead of crashing', async () => {
    const onError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <Suspense fallback={null}>
        <SurfaceBoundary onError={onError}>
          <Cellar />
        </SurfaceBoundary>
      </Suspense>,
    );
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(container.textContent).toBe('');
  });

  it('shows a surface straight away once its chunk has landed, with no Suspense fallback', async () => {
    await prefetch('grimoire');
    render(
      <Suspense fallback={<p>loading</p>}>
        <Grimoire currentId="x" />
      </Suspense>,
    );
    // synchronous: a React.lazy would have suspended on this first render
    expect(screen.queryByText('loading')).toBeNull();
    expect(screen.getByText('grimoire x')).toBeTruthy();
  });
});
