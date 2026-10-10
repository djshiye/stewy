// PLACEHOLDER written by the shell builder. The dial-serve owner replaces this file.
import { useState } from 'react';
import type { Ingredient } from '../../data/types';
import type { AppModel, DialRequest } from '../../app/types';
import type { UnitKey } from '../../lib/units';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';

export interface PourDialProps {
  request: DialRequest;
  model: AppModel;
  onUnit(u: UnitKey): void;
  onConfirm(ing: Ingredient, ml: number, mode: 'add' | 'edit'): void;
  onRemove(ing: Ingredient): void;
  onClose(): void;
}

export function PourDial(props: PourDialProps) {
  const { request, onConfirm, onRemove, onClose } = props;
  const [ml, setMl] = useState(request.ml);
  const edit = request.mode === 'edit';
  return (
    <Sheet open onClose={onClose} labelledBy="dial-title" size="dial">
      <div style={{ display: 'grid', gap: 16, padding: 24 }}>
        <h2 id="dial-title" style={{ fontSize: 18, fontWeight: 600 }}>{request.ing.name}</h2>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--tx-3)', fontSize: 12 }}>Amount in ml</span>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={ml}
            data-autofocus
            onChange={(e) => setMl(Number(e.target.value))}
            style={{ height: 40, padding: '0 12px', borderRadius: 10, background: 'rgba(7,9,13,.5)', border: '1px solid var(--line-2)' }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="lg" onClick={() => onConfirm(request.ing, ml, request.mode)} disabled={!(ml > 0)}>
            {edit ? 'Update' : 'Pour into the pot'}
          </Button>
          {edit && <Button size="lg" variant="danger-ghost" onClick={() => onRemove(request.ing)}>Remove</Button>}
          <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Sheet>
  );
}
