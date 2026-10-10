// PLACEHOLDER written by the shell builder. The grimoire-cellar owner replaces this file.
import type { Recipe } from '../../data/types';
import { RECIPES } from '../../data/recipes';
import { Sheet } from '../ui/Sheet';

export interface GrimoireProps {
  open: boolean;
  currentId: string | null;
  onClose(): void;
  onLoad(recipe: Recipe): void;
}

export function Grimoire(props: GrimoireProps) {
  const { open, currentId, onClose, onLoad } = props;
  return (
    <Sheet open={open} onClose={onClose} labelledBy="grimoire-title" size="grimoire">
      <div style={{ padding: 32, overflow: 'auto' }}>
        <h2 id="grimoire-title" className="serif" style={{ fontSize: 40, marginBottom: 16 }}>Grimoire</h2>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {RECIPES.map((r) => (
            <li key={r.id}>
              <button onClick={() => onLoad(r)} style={{ textAlign: 'left', padding: 8 }}>
                {r.name}{r.id === currentId ? ' (in the pot)' : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
