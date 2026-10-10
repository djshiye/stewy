import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Ingredient } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { useDrag } from './useDrag';

const gin = ING_BY_ID.gin as Ingredient;

/** jsdom has no PointerEvent with pointerId everywhere, so build one on a MouseEvent. */
function pointer(type: string, pointerId: number, x: number, y: number) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
  Object.defineProperty(e, 'pointerId', { value: pointerId });
  return e;
}

function setup() {
  const pot = document.createElement('div');
  pot.getBoundingClientRect = () => ({ left: 100, right: 300, top: 100, bottom: 300 }) as DOMRect;
  const onDrop = vi.fn();
  const hook = renderHook(() => useDrag({ current: pot }, onDrop));
  const down = () =>
    act(() =>
      hook.result.current.start(gin, {
        pointerType: 'mouse', button: 0, clientX: 10, clientY: 10, pointerId: 1, target: document.createElement('div'),
      } as unknown as ReactPointerEvent),
    );
  const fire = (e: Event) => act(() => void window.dispatchEvent(e));
  return { hook, onDrop, down, fire };
}

afterEach(() => document.body.classList.remove('is-dragging'));

describe('useDrag', () => {
  it('drops on the pot when the starting pointer is released over it', () => {
    const { hook, onDrop, down, fire } = setup();
    down();
    fire(pointer('pointermove', 1, 150, 150));
    expect(hook.result.current.dragging).toBe(gin);
    expect(hook.result.current.dragOver).toBe(true);
    fire(pointer('pointerup', 1, 150, 150));
    expect(onDrop).toHaveBeenCalledWith(gin);
    expect(hook.result.current.dragging).toBeNull();
  });

  it('ignores moves, releases and cancels from any other pointer', () => {
    const { hook, onDrop, down, fire } = setup();
    down();
    fire(pointer('pointermove', 1, 150, 150));
    fire(pointer('pointermove', 2, 900, 900));
    expect(hook.result.current.dragOver).toBe(true);
    fire(pointer('pointerup', 2, 150, 150));
    fire(pointer('pointercancel', 2, 0, 0));
    expect(hook.result.current.dragging).toBe(gin);
    expect(onDrop).not.toHaveBeenCalled();
    fire(pointer('pointerup', 1, 150, 150));
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it('cancels with Escape and drops nothing', () => {
    const { hook, onDrop, down, fire } = setup();
    down();
    fire(pointer('pointermove', 1, 150, 150));
    expect(document.body.classList.contains('is-dragging')).toBe(true);
    fire(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(hook.result.current.dragging).toBeNull();
    expect(document.body.classList.contains('is-dragging')).toBe(false);
    fire(pointer('pointerup', 1, 150, 150));
    expect(onDrop).not.toHaveBeenCalled();
  });
});
