import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, Minus } from '@phosphor-icons/react';
import type { Ingredient } from '../../data/types';
import { IngredientIcon } from '../../icons/Icons';
import { deltaWords, indicatorFor } from './shelfUtils';

export interface BottleProps {
  ing: Ingredient;
  /** Best score change from adding this ingredient; undefined when the pot is empty. */
  delta: number | undefined;
  /** Amount label when the ingredient is already in the pot. */
  amount: string | null;
  tabbable: boolean;
  /** Position in the row, drives the staggered entrance. */
  index: number;
  onPick(ing: Ingredient, anchor: DOMRect | null): void;
  onDragStart(ing: Ingredient, ev: ReactPointerEvent): void;
  onFocusBottle(ing: Ingredient): void;
  /** Tooltip hooks (desktop only); `el` is the bottle art, null hides the tip. */
  onTip?(ing: Ingredient, el: HTMLElement | null, via: 'hover' | 'focus'): void;
}

function label(ing: Ingredient, delta: number | undefined, amount: string | null): string {
  if (amount) return `${ing.name}, in the pot, ${amount}`;
  const kind = indicatorFor(delta).kind;
  const words = kind === 'none' ? null : deltaWords(delta);
  return words ? `${ing.name}, ${words.toLowerCase()}` : ing.name;
}

export const Bottle = memo(function Bottle(props: BottleProps) {
  const { ing, delta, amount, tabbable, index, onPick, onDragStart, onFocusBottle, onTip } = props;
  const inPot = amount !== null;
  const mark = inPot ? { kind: 'none' as const } : indicatorFor(delta);

  const art = (el: HTMLElement) => el.querySelector<HTMLElement>('.bottle__art') ?? el;

  return (
    <li className="bottle-cell" style={{ ['--i' as string]: Math.min(index, 14) }}>
      <button
        type="button"
        className="bottle"
        data-bottle={ing.id}
        data-icon={ing.icon}
        data-inpot={inPot || undefined}
        tabIndex={tabbable ? 0 : -1}
        aria-label={label(ing, delta, amount)}
        onClick={(e) => onPick(ing, art(e.currentTarget).getBoundingClientRect())}
        onPointerDown={(e) => {
          onTip?.(ing, null, 'hover');
          onDragStart(ing, e);
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') onTip?.(ing, art(e.currentTarget), 'hover');
        }}
        onPointerLeave={() => onTip?.(ing, null, 'hover')}
        onFocus={(e) => {
          onFocusBottle(ing);
          if (e.currentTarget.matches(':focus-visible')) onTip?.(ing, art(e.currentTarget), 'focus');
        }}
        onBlur={() => onTip?.(ing, null, 'focus')}
      >
        <span className="bottle__art">
          <IngredientIcon ing={ing} variant="shelf" />
          {mark.kind === 'raise' && (
            <span className="bottle__mark bottle__mark--raise" aria-hidden="true">+{mark.delta}</span>
          )}
          {mark.kind === 'clash' && (
            <span className="bottle__mark bottle__mark--clash" aria-hidden="true">
              <Minus size={9} weight="bold" />
            </span>
          )}
        </span>
        <span className="bottle__name">{ing.name}</span>
        <span className="bottle__amt" aria-hidden="true">
          {amount && (
            <>
              <Check size={12} weight="bold" />
              <span>{amount}</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
});
