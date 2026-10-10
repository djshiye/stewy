import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastAction {
  label: string;
  run(): void;
}

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

export const TOAST_MS = 6000;

let seq = 0;

/** One toast at a time, 6 s, pausable (hover and focus). The newest replaces the last. */
export function useToasts() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const left = useRef(TOAST_MS);
  const startedAt = useRef(0);
  const active = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clear();
    active.current = false;
    setToast(null);
  }, [clear]);

  const arm = useCallback(
    (ms: number) => {
      clear();
      left.current = ms;
      startedAt.current = Date.now();
      timer.current = setTimeout(() => {
        timer.current = null;
        active.current = false;
        setToast(null);
      }, ms);
    },
    [clear],
  );

  const push = useCallback(
    (message: string, action?: ToastAction) => {
      active.current = true;
      setToast({ id: ++seq, message, action });
      arm(TOAST_MS);
    },
    [arm],
  );

  const pause = useCallback(() => {
    if (!timer.current) return;
    clear();
    left.current = Math.max(1000, left.current - (Date.now() - startedAt.current));
  }, [clear]);

  const resume = useCallback(() => {
    if (!active.current || timer.current) return;
    arm(left.current);
  }, [arm]);

  useEffect(() => clear, [clear]);

  return { toast, push, dismiss, pause, resume };
}

export type ToastsApi = ReturnType<typeof useToasts>;
