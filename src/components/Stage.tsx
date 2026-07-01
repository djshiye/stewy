import type { RefObject } from 'react';
import type { BrewState } from '../store';
import { VERDICT, type Harmony } from '../lib/harmony';
import { Cauldron, type SplashSpec } from './Cauldron';

interface Props {
  state: BrewState;
  h: Harmony | null;
  splashes: SplashSpec[];
  dragOver: boolean;
  onName: (name: string) => void;
  cauldronBoxRef: RefObject<HTMLDivElement | null>;
}

export function Stage({ state, h, splashes, dragOver, onName, cauldronBoxRef }: Props) {
  return (
    <section className="stage">
      <input
        className="cocktail-name"
        value={state.name}
        spellCheck={false}
        maxLength={40}
        aria-label="Cocktail name"
        onChange={(e) => onName(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <div className="verdict-pill" data-tier={h ? h.tier : 'none'}>
        {h ? `${VERDICT[h.tier]} · ${h.score}` : 'Awaiting reagents'}
      </div>

      <Cauldron
        brew={state.brew}
        splashes={splashes}
        dragOver={dragOver}
        boxRef={cauldronBoxRef}
      />

      <p className="stage-tip">Drag a reagent onto the cauldron — or tap it — to choose a measure.</p>
    </section>
  );
}
