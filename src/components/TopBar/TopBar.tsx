import { ArrowUUpLeft, ArrowUUpRight, BookOpen, Export, Wine } from '@phosphor-icons/react';
import { BrandMark } from '../../icons/Brand';
import { UNIT_ORDER, UNITS, type UnitKey } from '../../lib/units';
import { useIsDesktop } from '../../app/useMediaQuery';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Segmented } from '../ui/Segmented';
import './TopBar.css';

export interface TopBarProps {
  unit: UnitKey;
  onUnit(u: UnitKey): void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  cellarCount: number;
  onOpenGrimoire(): void;
  onOpenCellar(): void;
  onShare(): void;
}

const UNIT_OPTIONS = UNIT_ORDER.map((u) => ({ value: u, label: UNITS[u].label }));

/** One row at every width: sigil and wordmark, units (desktop), history, Grimoire, Cellar, share. */
export function TopBar({
  unit, onUnit, canUndo, canRedo, onUndo, onRedo, cellarCount, onOpenGrimoire, onOpenCellar, onShare,
}: TopBarProps) {
  const desktop = useIsDesktop();
  return (
    <header className="topbar">
      <h1 className="topbar__brand">
        <BrandMark className="topbar__mark" />
        <span className="topbar__word serif">Stewy</span>
      </h1>

      {desktop && (
        <div className="topbar__units">
          <Segmented options={UNIT_OPTIONS} value={unit} onChange={onUnit} aria-label="Measuring unit" />
        </div>
      )}

      <nav className="topbar__actions" aria-label="Brew actions">
        <IconButton
          label="Undo"
          tooltip={desktop ? 'Undo' : undefined}
          icon={<ArrowUUpLeft size={18} />}
          disabled={!canUndo}
          onClick={onUndo}
        />
        <IconButton
          label="Redo"
          tooltip={desktop ? 'Redo' : undefined}
          icon={<ArrowUUpRight size={18} />}
          disabled={!canRedo}
          onClick={onRedo}
        />
        {desktop ? (
          <>
            <span className="topbar__divider" aria-hidden="true" />
            <Button variant="ghost" icon={<BookOpen size={18} />} onClick={onOpenGrimoire}>
              Grimoire
            </Button>
            <Button variant="ghost" icon={<Wine size={18} />} onClick={onOpenCellar}>
              Cellar
              {cellarCount > 0 && <span className="topbar__count">{cellarCount}</span>}
            </Button>
            <IconButton
              label="Share this brew"
              tooltip="Share"
              icon={<Export size={18} />}
              onClick={onShare}
            />
          </>
        ) : (
          <>
            <IconButton label="Grimoire" icon={<BookOpen size={18} />} onClick={onOpenGrimoire} />
            <span className="topbar__cellar">
              <IconButton
                label={cellarCount > 0 ? `Cellar, ${cellarCount} saved` : 'Cellar'}
                icon={<Wine size={18} />}
                onClick={onOpenCellar}
              />
              {cellarCount > 0 && <span className="topbar__dot" aria-hidden="true">{cellarCount}</span>}
            </span>
          </>
        )}
      </nav>
    </header>
  );
}
