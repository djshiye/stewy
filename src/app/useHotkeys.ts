import { useEffect, useRef } from 'react';

export interface Hotkeys {
  onUndo(): void;
  onRedo(): void;
  onSearch(): void;
  onGrimoire(): void;
  onCellar(): void;
  onServe(): void;
}

/** True while the key lands in something you type into (jsdom lacks isContentEditable, hence the closest). */
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
    el.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
};

/**
 * Global shortcuts (DESIGN.md section 6). Undo and redo work everywhere except text fields
 * (so the browser's own text undo survives); letter keys also stand down while a sheet is
 * open. Esc belongs to the topmost Sheet.
 */
export function useHotkeys(handlers: Hotkeys): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const h = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && !e.altKey) {
        if (isTyping(e.target)) return;
        if (key === 'z') {
          e.preventDefault();
          (e.shiftKey ? h.onRedo : h.onUndo)();
        } else if (key === 'y' && e.ctrlKey) {
          e.preventDefault();
          h.onRedo();
        }
        return;
      }

      if (e.altKey || e.shiftKey || isTyping(e.target)) return;
      if (document.body.classList.contains('is-locked')) return;

      switch (key) {
        case '/': e.preventDefault(); h.onSearch(); break;
        // preventDefault keeps the letter out of the field a sheet focuses as it opens
        case 'g': e.preventDefault(); h.onGrimoire(); break;
        case 'c': e.preventDefault(); h.onCellar(); break;
        case 's': e.preventDefault(); h.onServe(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
