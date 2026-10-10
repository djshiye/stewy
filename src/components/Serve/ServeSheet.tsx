// PLACEHOLDER written by the shell builder. The dial-serve owner replaces this file.
import type { AppModel } from '../../app/types';
import { recipeText, serveCard } from '../../lib/serve';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';

export interface ServeSheetProps {
  open: boolean;
  model: AppModel;
  onClose(): void;
  onSave(): void;
  onShare(): void;
  onCopy(text: string): void;
}

export function ServeSheet(props: ServeSheetProps) {
  const { open, model, onClose, onSave, onShare, onCopy } = props;
  const card = serveCard(model.brew, model.name, model.unit);
  return (
    <Sheet open={open} onClose={onClose} labelledBy="serve-title" size="serve">
      <div style={{ display: 'grid', gap: 16, padding: 32, alignContent: 'start' }}>
        <h2 id="serve-title" className="serif" style={{ fontSize: 52, lineHeight: '54px' }}>{card.name}</h2>
        <ul>{card.lines.map((l) => <li key={l.id}>{l.amount} {l.name}</li>)}</ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={onSave}>Save to Cellar</Button>
          <Button onClick={onShare}>Share link</Button>
          <Button onClick={() => onCopy(recipeText(card))}>Copy recipe</Button>
        </div>
      </div>
    </Sheet>
  );
}
