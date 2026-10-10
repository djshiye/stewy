// PLACEHOLDER written by the shell builder. The stage owner replaces this file.
import type { Ingredient } from '../../data/types';
import type { AppModel, PourEvent } from '../../app/types';

export interface StageProps {
  model: AppModel;
  pours: PourEvent[];
  dragging: Ingredient | null;
  dragOver: boolean;
  potRef: React.RefObject<HTMLDivElement | null>;
}

export function Stage(props: StageProps) {
  const { model, dragOver, potRef } = props;
  return (
    <section
      aria-label="The cauldron"
      style={{ display: 'grid', placeItems: 'center', alignContent: 'center', gap: 16, padding: 16 }}
    >
      <div
        ref={potRef}
        style={{
          width: 'min(100%, 420px)',
          aspectRatio: '1',
          maxHeight: '100%',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            width: '78%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, var(--brew-hi), var(--brew) 55%, var(--brew-deep))',
            boxShadow: dragOver
              ? '0 0 0 3px var(--accent), 0 0 90px rgba(var(--brew-rgb), .5)'
              : '0 0 0 14px #1a1f29, 0 0 90px rgba(var(--brew-rgb), .45)',
          }}
        />
      </div>
      <p style={{ color: 'var(--tx-2)', fontSize: 13 }}>
        {dragOver
          ? 'Release to pour'
          : model.brew.length
            ? `${model.brew.length} in the pot`
            : 'Drag a bottle up into the pot, or tap one to set a measure.'}
      </p>
    </section>
  );
}
