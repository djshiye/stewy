import { copyText } from './clipboard';
import type { ToastAction } from './useToasts';

type Push = (message: string, action?: ToastAction) => void;

const COULD_NOT_COPY = 'Could not copy the link. Allow clipboard access and try again.';

/** Copy the link and say how it went. */
async function copyLink(url: string, push: Push) {
  push((await copyText(url)) ? 'Link copied' : COULD_NOT_COPY);
}

/**
 * Share a brew link. On touch devices the share sheet comes first; if it fails for any reason but the user
 * closing it, the copy cannot run here: it would come after an await, outside the tap Safari needs for
 * clipboard access. So offer a Copy link action, whose own tap carries the activation.
 */
export async function shareBrew(url: string, title: string, touch: boolean, push: Push): Promise<void> {
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      push('Could not open sharing on this device', { label: 'Copy link', run: () => void copyLink(url, push) });
      return;
    }
  }
  await copyLink(url, push);
}
