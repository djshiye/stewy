import { memo, useEffect, useRef, useState } from 'react';
import type { Recipe } from '../data/types';
import { RECIPES } from '../data/recipes';
import { UNIT_ORDER, UNITS, type UnitKey } from '../lib/units';
import { BrandMark } from '../icons/Icons';

interface Props {
  unit: UnitKey;
  onUnit: (u: UnitKey) => void;
  onRecipe: (r: Recipe) => void;
  onClear: () => void;
}

export const Header = memo(function Header({ unit, onUnit, onRecipe, onClear }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><BrandMark /></span>
        <span className="brand-text">
          <h1 className="brand-name">Stewy</h1>
          <span className="brand-tag">the enchanted cocktail cauldron</span>
        </span>
      </div>

      <div className="topbar-controls">
        <div className="unit-toggle" role="group" aria-label="Measure unit">
          {UNIT_ORDER.map((u) => (
            <button
              key={u}
              className={u === unit ? 'active' : ''}
              onClick={() => onUnit(u)}
            >
              {UNITS[u].label}
            </button>
          ))}
        </div>

        <div className="menu-wrap" ref={menuWrapRef}>
          <button
            className="btn btn-primary"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="btn-ico">📜</span> Recipes
          </button>
          {menuOpen && (
            <div className="recipes-menu">
              <div className="menu-title">✦ Grimoire of Classics ✦</div>
              {RECIPES.map((r) => (
                <button
                  key={r.id}
                  className="recipe-item"
                  onClick={() => { onRecipe(r); setMenuOpen(false); }}
                >
                  <span className="r-name">{r.name}</span>
                  <span className="r-note">{r.note}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-ghost" title="Empty the cauldron" onClick={onClear}>
          <span className="btn-ico">🧹</span> <span className="btn-label">Empty</span>
        </button>
      </div>
    </header>
  );
});
