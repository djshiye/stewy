import { useMemo } from 'react';
import { BookmarkSimple, Copy, ShareNetwork } from '@phosphor-icons/react';
import type { AppModel } from '../../app/types';
import { Glass } from '../../icons/Glass';
import { foamFor, garnishFor, iceFor } from '../../icons/garnish';
import { shareUrl } from '../../lib/share';
import {
  GLASS_LABEL, measureLines, METHOD_PAST, methodSteps, recipeText, serveCaption, serveCard,
} from '../../lib/serve';
import { tastingNote } from '../../lib/tasting';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { VisuallyHidden } from '../ui/VisuallyHidden';
import './ServeSheet.css';

export interface ServeSheetProps {
  open: boolean;
  model: AppModel;
  onClose(): void;
  onSave(): void;
  onShare(): void;
  onCopy(text: string): void;
}

/** Scoring tone by tier threshold (never the accent). */
const toneFor = (score: number) => (score >= 80 ? 'good' : score >= 56 ? 'warn' : 'bad');

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Size class for long names so the title keeps to two lines. */
const titleSize = (name: string) => (name.length > 26 ? 'xs' : name.length > 14 ? 'sm' : 'lg');

export function ServeSheet({ open, model, onClose, onSave, onShare, onCopy }: ServeSheetProps) {
  const { brew, name, unit, h, mix } = model;
  const card = useMemo(() => serveCard(brew, name, unit), [brew, name, unit]);
  const steps = useMemo(() => methodSteps(card), [card]);
  const lines = useMemo(() => measureLines(brew, unit), [brew, unit]);
  const note = useMemo(() => tastingNote(h), [h]);
  const foam = useMemo(() => foamFor(brew), [brew]);
  const garnish = useMemo(() => garnishFor(model.garnish ?? card.garnish), [model.garnish, card.garnish]);
  const today = useMemo(() => new Date(), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const glassLabel = GLASS_LABEL[card.glass];
  const title = card.name.trim() || 'Untitled brew';

  return (
    <Sheet open={open} onClose={onClose} labelledBy="serve-title" size="serve" className="serve-sheet">
      <div className="serve">
        <div className="serve__stage">
          <div className="serve__bar" aria-hidden="true" />
          <div className="serve__pool" aria-hidden="true" />
          <div className="serve__glass-wrap">
            <Glass
              kind={card.glass}
              color={mix?.css ?? card.color}
              ice={iceFor(card.glass, card.method)}
              garnish={garnish}
              foam={foam}
              condensation
              fit
              className="serve__glass"
              title={`${title} in a ${glassLabel}`}
            />
          </div>
          <p className="serve__caption">{serveCaption(card)}</p>
        </div>

        <div className="serve__body">
          <div className="serve__scroll">
            <h2 id="serve-title" className="serif serve__title" data-size={titleSize(title)}>{title}</h2>

            <ul className="serve__pills" aria-label="At a glance">
              <li className="serve__pill serve__pill--score">
                <span className={`serve__dot serve__dot--${toneFor(card.score)}`} aria-hidden="true" />
                <b>{card.score}</b>
                <span>{card.verdict}</span>
              </li>
              <li className="serve__pill">{glassLabel.charAt(0).toUpperCase() + glassLabel.slice(1)}</li>
              <li className="serve__pill">{METHOD_PAST[card.method]}</li>
              <li className="serve__pill" title="Alcohol by volume after dilution">
                {Math.round(card.stats.finalAbv)}% ABV
                <VisuallyHidden> after dilution</VisuallyHidden>
              </li>
            </ul>

            {note && <p className="serve__note">{note}</p>}

            <div className="serve__cols">
              <section aria-labelledby="serve-measures" className="serve__col">
                <h3 id="serve-measures" className="serve__label">Measures</h3>
                <ul className="serve__menu">
                  {lines.map((l) => (
                    <li key={l.id} className="serve__line">
                      <span className="serve__name">{l.name}</span>
                      <span className="serve__leader" aria-hidden="true" />
                      <span className="serve__amt">{l.primary}</span>
                      <span className="serve__amt2">{l.secondary}</span>
                    </li>
                  ))}
                  {card.garnish && (
                    <li className="serve__line serve__line--garnish">
                      <span className="serve__name">Garnish</span>
                      <span className="serve__leader" aria-hidden="true" />
                      <span className="serve__val">{card.garnish}</span>
                    </li>
                  )}
                </ul>
              </section>

              <section aria-labelledby="serve-method" className="serve__col">
                <h3 id="serve-method" className="serve__label">Method</h3>
                <ol className="serve__steps">
                  {steps.map((s, i) => (
                    <li key={i}>
                      <span className="serve__n" aria-hidden="true">{i + 1}</span>
                      <span>{s}.</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>

          <div className="serve__actions">
            <Button variant="primary" size="lg" className="serve__save" icon={<BookmarkSimple size={18} />} onClick={onSave}>
              Save to Cellar
            </Button>
            <Button variant="secondary" size="lg" icon={<ShareNetwork size={18} />} onClick={onShare}>
              Share link
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<Copy size={18} />}
              onClick={() => onCopy(recipeText(card, shareUrl({ brew, name })))}
            >
              Copy recipe
            </Button>
          </div>

          <p className="serve__foot">
            <span>Brewed in Stewy</span>
            <time dateTime={today.toISOString().slice(0, 10)}>{DATE.format(today)}</time>
          </p>
        </div>
      </div>
    </Sheet>
  );
}
