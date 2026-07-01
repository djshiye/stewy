import { useEffect, useRef, useState } from 'react';
import type { Ingredient } from '../data/types';
import { amountInfo, trim, type UnitKey } from '../lib/units';
import { describe } from '../lib/harmony';
import { IngredientIcon } from '../icons/Icons';

interface Props {
  ing: Ingredient;
  unit: UnitKey;
  onClose: () => void;
  onAdd: (ing: Ingredient, ml: number) => void;
}

export function AmountDialog({ ing, unit, onClose, onAdd }: Props) {
  const info = amountInfo(ing, unit);
  const [ml, setMl] = useState(ing.amt);
  const addRef = useRef<HTMLButtonElement>(null);

  const stepMl = info.step * info.per;
  const minMl = stepMl; // smallest pour = one step (a quarter-ounce, one dash…)
  const val = ml / info.per;

  const step = (dir: 1 | -1) =>
    setMl((m) => Math.max(minMl, Math.round((m + dir * stepMl) * 100) / 100));

  useEffect(() => {
    addRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowUp' || e.key === '+') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowDown' || e.key === '-') { e.preventDefault(); step(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  return (
    <>
      <div className="pop-backdrop" onClick={onClose} />
      <div className="popup" role="dialog" aria-modal="true" aria-label={`Choose amount of ${ing.name}`}>
        <button className="pop-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="pop-head">
          <span className="pop-icon"><IngredientIcon ing={ing} /></span>
          <div>
            <div className="pop-name">{ing.name}</div>
            <div className="pop-desc">{describe(ing)}</div>
          </div>
        </div>

        <div className="pop-amount">
          <button className="step" aria-label="Less" onClick={() => step(-1)}>−</button>
          <div className="amount-display">
            <span className="amount-value">{trim(val, info.dec)}</span>
            <span className="amount-unit">
              {info.counted ? (Math.round(val) === 1 ? info.label : `${info.label}s`) : info.label}
            </span>
          </div>
          <button className="step" aria-label="More" onClick={() => step(1)}>+</button>
        </div>

        <div className="pop-chips">
          {info.chips.map((v) => (
            <button
              key={v}
              className={`pop-chip${Math.abs(v - val) < 1e-6 ? ' active' : ''}`}
              onClick={() => setMl(v * info.per)}
            >
              {info.counted ? `${v}` : `${v} ${info.label}`}
            </button>
          ))}
        </div>

        <button ref={addRef} className="btn btn-primary btn-block" onClick={() => onAdd(ing, ml)}>
          Add to cauldron
        </button>
      </div>
    </>
  );
}
