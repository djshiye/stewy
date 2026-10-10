import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from '@phosphor-icons/react';
import type { Toast } from '../../app/useToasts';
import './ui.css';

export interface ToasterProps {
  toast: Toast | null;
  onDismiss(): void;
  onPause(): void;
  onResume(): void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** The one toast on screen: a plain sentence and an accent action. Pauses on hover and focus. */
export function Toaster({ toast, onDismiss, onPause, onResume }: ToasterProps) {
  return createPortal(
    <div className="ui-toaster" role="status">
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            className="ui-toast"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onMouseEnter={onPause}
            onMouseLeave={onResume}
            onFocus={onPause}
            onBlur={onResume}
          >
            <span className="ui-toast__ok" aria-hidden="true"><Check size={12} weight="bold" /></span>
            <span className="ui-toast__msg">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="ui-toast__action"
                onClick={() => {
                  const run = toast.action?.run;
                  onDismiss();
                  run?.();
                }}
              >
                {toast.action.label}
              </button>
            )}
            {toast.action?.label === 'Undo' && (
              <kbd className="ui-toast__kbd" aria-hidden="true">{isMac ? 'Cmd Z' : 'Ctrl Z'}</kbd>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
