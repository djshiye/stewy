import { useCallback, useSyncExternalStore } from 'react';

/** Live `matchMedia` result. Reads synchronously on first render, so layout never flashes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop layout (three columns and the back bar). Same breakpoint as layout.css. */
export const DESKTOP_QUERY = '(min-width: 1000px)';
export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
