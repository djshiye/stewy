// PLACEHOLDER written by the shell builder. The grimoire-cellar owner replaces this file.
import type { CellarItem } from '../../cellar';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';

export interface CellarProps {
  open: boolean;
  items: CellarItem[];
  onClose(): void;
  onLoad(item: CellarItem): void;
  onRename(id: string, name: string): void;
  onDelete(item: CellarItem): void;
  onOpenGrimoire(): void;
}

export function Cellar(props: CellarProps) {
  const { open, items, onClose, onLoad, onRename, onDelete, onOpenGrimoire } = props;
  return (
    <Sheet open={open} onClose={onClose} labelledBy="cellar-title" size="cellar">
      <div style={{ padding: 32, overflow: 'auto' }}>
        <h2 id="cellar-title" className="serif" style={{ fontSize: 32, marginBottom: 16 }}>Cellar</h2>
        {items.length === 0 ? (
          <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
            <p>Nothing saved yet. Serve a brew to keep it here.</p>
            <Button onClick={onOpenGrimoire}>Open the Grimoire</Button>
          </div>
        ) : (
          <ul style={{ display: 'grid', gap: 8 }}>
            {items.map((it) => (
              <li key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="serif"
                  aria-label="Name"
                  defaultValue={it.name}
                  onBlur={(e) => onRename(it.id, e.target.value)}
                  style={{ flex: 1, background: 'none', border: 0, fontSize: 20 }}
                />
                <Button size="sm" onClick={() => onLoad(it)}>Load</Button>
                <Button size="sm" variant="danger-ghost" onClick={() => onDelete(it)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
