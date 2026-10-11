import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareBrew } from './shareBrew';

const URL = 'https://stewy.test/#abc';

function setup(share: unknown, writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { share, clipboard: { writeText } });
  const push = vi.fn();
  return { push, writeText };
}

afterEach(() => vi.unstubAllGlobals());

describe('shareBrew', () => {
  it('stays quiet when the share sheet succeeds or is closed', async () => {
    const ok = setup(vi.fn().mockResolvedValue(undefined));
    await shareBrew(URL, 'Sour on Stewy', true, ok.push);
    const closed = setup(vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')));
    await shareBrew(URL, 'Sour on Stewy', true, closed.push);
    expect(ok.push).not.toHaveBeenCalled();
    expect(closed.push).not.toHaveBeenCalled();
    expect(closed.writeText).not.toHaveBeenCalled();
  });

  it('offers a Copy link action when sharing fails, and copies only from that tap', async () => {
    const { push, writeText } = setup(vi.fn().mockRejectedValue(new DOMException('not allowed', 'NotAllowedError')));
    await shareBrew(URL, 'Sour on Stewy', true, push);
    expect(writeText).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
    const action = push.mock.calls[0]?.[1];
    expect(action.label).toBe('Copy link');

    action.run();
    expect(writeText).toHaveBeenCalledWith(URL); // synchronously, still inside the tap
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('Link copied'));
  });

  it('copies at once where there is no share sheet', async () => {
    const { push, writeText } = setup(undefined);
    await shareBrew(URL, 'Sour on Stewy', true, push);
    expect(writeText).toHaveBeenCalledWith(URL);
    expect(push).toHaveBeenCalledWith('Link copied');
  });

  it('copies at once on a pointer device even when share exists', async () => {
    const share = vi.fn();
    const { push, writeText } = setup(share);
    await shareBrew(URL, 'Sour on Stewy', false, push);
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(URL);
  });
});
