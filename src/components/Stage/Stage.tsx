/* The hero: an enchanted cast-iron cauldron in a dark room that the brew lights.
   Layers, back to front (all share one 720 x 600 frame):
     stars, room light, halo + fill gauge, embers   (behind the pot)
     iron (static) > light (brew on the iron, static) > surface (animated) > pours > steam
   The frame is also the drop target, so it covers the pot from handle to handle and lip to feet. */
import { useMemo, type CSSProperties } from 'react';
import { ArrowUp, Drop } from '@phosphor-icons/react';
import type { Ingredient } from '../../data/types';
import { ING_BY_ID } from '../../data/ingredients';
import type { AppModel, PourEvent } from '../../app/types';
import { Iron } from './Iron';
import { Light } from './Light';
import { Surface } from './Surface';
import { Gauge, Halo, Stars } from './Halo';
import { Ambient, Embers, PourFx, Room } from './Fx';
import { OVERFLOW_ML, floatersIn, liquidMl, surfaceDepth } from './fill';
import './Stage.css';

export interface StageProps {
  model: AppModel;
  pours: PourEvent[];
  dragging: Ingredient | null;
  dragOver: boolean;
  potRef: React.RefObject<HTMLDivElement | null>;
}

function describe(model: AppModel, ml: number): string {
  if (!model.brew.length) return 'Cast-iron cauldron, empty';
  const names = model.brew.map((e) => ING_BY_ID[e.id]?.name).filter(Boolean).join(', ');
  return `Cast-iron cauldron holding ${Math.round(ml)} ml of brew: ${names}`;
}

export function Stage({ model, pours, dragging, dragOver, potRef }: StageProps) {
  const ml = useMemo(() => liquidMl(model.brew), [model.brew]);
  const floaters = useMemo(() => floatersIn(model.brew), [model.brew]);
  const empty = ml <= 0;
  const brimming = ml >= OVERFLOW_ML;
  const over = dragOver && !!dragging;

  const cls = [
    'stage',
    empty && 'is-empty',
    brimming && 'is-brimming',
    dragging && 'is-dragging',
    over && 'is-over',
  ].filter(Boolean).join(' ');

  return (
    <section className={cls} aria-label="The cauldron">
      <div
        className="stg-pot"
        ref={potRef}
        role="img"
        aria-label={describe(model, ml)}
        style={{ '--depth': surfaceDepth(ml) } as CSSProperties}
      >
        <div className="stg-back" aria-hidden="true">
          <Stars />
          <Room />
          <Halo />
          <Gauge ml={ml} />
          <Embers />
        </div>
        <Iron />
        <Light />
        <div className="stg-shimmer" aria-hidden="true" />
        <Surface floaters={floaters} />
        {pours.map((p) => <PourFx key={p.id} pour={p} />)}
        <Ambient />
      </div>

      <p className="stg-hint">
        <span className="stg-hint-icon" aria-hidden="true">
          <ArrowUp size={16} weight="regular" className="stg-hint-up" />
          <Drop size={16} weight="regular" className="stg-hint-drop" />
        </span>
        <span className="stg-hint-text stg-hint-text--desk">Drag a bottle up into the pot, or tap one to set a measure</span>
        <span className="stg-hint-text stg-hint-text--touch">Tap a bottle below to pour</span>
        <span className="stg-hint-text stg-hint-text--over">Release to pour</span>
      </p>
    </section>
  );
}
