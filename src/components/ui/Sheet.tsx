import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useIsPresent, usePresence } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useMediaQuery } from '../../app/useMediaQuery';
import { IconButton } from './IconButton';
import './ui.css';

export type SheetSize = 'dial' | 'serve' | 'grimoire' | 'cellar';

export interface SheetProps {
  open: boolean;
  onClose(): void;
  /** id of the element that titles the dialog */
  labelledBy: string;
  size: SheetSize;
  children: ReactNode;
  className?: string;
  /** Skip the built-in close button (the sheet then needs its own). */
  hideClose?: boolean;
}

const EASE = [0.2, 0.8, 0.2, 1] as const;
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* One stack for Esc (topmost sheet closes) and one counter for the page lock. */
const stack: symbol[] = [];
let locks = 0;

function lockPage() {
  if (locks++ === 0) {
    document.body.classList.add('is-locked');
    const root = document.getElementById('root');
    if (root) root.inert = true;
  }
}

function unlockPage() {
  if (--locks === 0) {
    document.body.classList.remove('is-locked');
    const root = document.getElementById('root');
    if (root) root.inert = false;
  }
}

/** The real Tab stops: rendered, and not parked out of the order (a roving radio has tabindex -1). */
const tabbables = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.tabIndex >= 0 && n.getClientRects().length > 0 && !n.closest('[inert]'));

/** Whether Tab (or Shift+Tab) from `active` would leave the list's span, so the trap must wrap it. */
function leavesDialog(list: HTMLElement[], active: Element | null, back: boolean): boolean {
  const at = active ? list.indexOf(active as HTMLElement) : -1;
  if (at >= 0) return back ? at === 0 : at === list.length - 1;
  if (!active) return true;
  // focus is on something that is not a stop (the heading, the dialog): look for a stop on the way
  const side = back ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
  return !list.some((n) => n.compareDocumentPosition(active) & side);
}

/**
 * Modal surface: a centred dialog on desktop, a bottom sheet with a grab handle and
 * drag-to-dismiss below 1000 px. Flat scrim, focus trap, Esc, focus return, scroll lock.
 * Inside an outer AnimatePresence it also defers removal until its own exit finishes.
 */
export function Sheet({ open, onClose, labelledBy, size, children, className, hideClose }: SheetProps) {
  const [isPresent, safeToRemove] = usePresence();
  const show = open && isPresent;
  return createPortal(
    <AnimatePresence onExitComplete={() => safeToRemove?.()}>
      {show && (
        <SheetLayer
          key="sheet"
          onClose={onClose}
          labelledBy={labelledBy}
          size={size}
          className={className}
          hideClose={hideClose}
        >
          {children}
        </SheetLayer>
      )}
    </AnimatePresence>,
    document.body,
  );
}

type LayerProps = Omit<SheetProps, 'open'>;

function SheetLayer({ onClose, labelledBy, size, className, hideClose, children }: LayerProps) {
  const isMobile = useMediaQuery('(max-width: 999px)');
  const present = useIsPresent();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const controls = useDragControls();

  useEffect(() => {
    closeRef.current = onClose;
  });

  // Esc, page lock and focus management live while the layer is present, so they
  // release the moment the exit animation starts.
  useEffect(() => {
    if (!present) return;
    const token = Symbol('sheet');
    stack.push(token);
    lockPage();
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dlg = dialogRef.current;
    if (dlg) {
      const auto = dlg.querySelector<HTMLElement>('[data-autofocus]');
      const first = auto ?? tabbables(dlg).find((n) => !n.classList.contains('ui-sheet__close'));
      (first ?? dlg).focus({ preventScroll: true });
    }

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === token) {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      unlockPage();
      // back to whatever opened the sheet; when that was nothing in particular (a hotkey from the
      // page itself) just let go of the sheet's element so focus settles on the body
      if (prev && prev !== document.body && prev.isConnected) prev.focus({ preventScroll: true });
      else if (dlg?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    };
  }, [present]);

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const dlg = dialogRef.current;
    if (!dlg) return;
    const list = tabbables(dlg);
    if (!list.length) {
      e.preventDefault();
      return;
    }
    if (leavesDialog(list, document.activeElement, e.shiftKey)) {
      e.preventDefault();
      (e.shiftKey ? list[list.length - 1] : list[0]).focus();
    }
  };

  const startDrag = (e: ReactPointerEvent) => controls.start(e);

  const surface = isMobile
    ? {
        initial: { y: window.innerHeight },
        animate: { y: 0, transition: { duration: 0.42, ease: EASE } },
        exit: { y: window.innerHeight, transition: { duration: 0.28, ease: EASE } },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 16 },
        animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
        exit: { opacity: 0, scale: 0.98, y: 8, transition: { duration: 0.2, ease: EASE } },
      };

  return (
    <>
      <motion.div
        className="ui-scrim"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={present ? onClose : undefined}
      />
      <div className="ui-sheet-wrap" data-size={size}>
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={['ui-sheet', `ui-sheet--${size}`, className].filter(Boolean).join(' ')}
          // an exiting sheet still holds its old handlers; a second click must hit the scrim instead
          style={{ pointerEvents: present ? undefined : 'none' }}
          onKeyDown={trapTab}
          drag={isMobile ? 'y' : false}
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose();
          }}
          {...surface}
        >
          {isMobile && (
            <div className="ui-sheet__grab" onPointerDown={startDrag} aria-hidden="true">
              <span />
            </div>
          )}
          {children}
          {!hideClose && (
            <IconButton
              label="Close"
              className="ui-sheet__close"
              icon={<X size={18} />}
              onClick={onClose}
            />
          )}
        </motion.div>
      </div>
    </>
  );
}
