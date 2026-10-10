/* What the brew does to the iron. Static (no animation, no filters, no blend modes), but every
   colour here is a live brew variable, so a pour recolours it with the rest of the scene.
   Sits above <Iron/> and below the animated surface. */
import { memo } from 'react';
import {
  BODY_OPEN, BODY_PATH, HANDLE_BOSSES, HANDLE_PATH, HOOP_PATH, LEG_PATHS, MOUTH, RIM, RIM_OUTER, RIM_PATH, VB_H, VB_W,
} from './geometry';

const hi = (o: number) => ({ stopColor: 'var(--brew-hi)', stopOpacity: o });
const mid = (o: number) => ({ stopColor: 'var(--brew)', stopOpacity: o });
const ember = (o: number, c = '#ff8a3c') => ({ stopColor: c, stopOpacity: o });

const MIRROR = `translate(${VB_W} 0) scale(-1 1)`;

/** A cast lug where a handle meets the belly: neutral iron, with the brew's light on its upper edge. */
function Boss({ x, y, mirror }: { x: number; y: number; mirror?: boolean }) {
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <ellipse cx={x + 1} cy={y + 3.4} rx="13" ry="12" fill="#020203" opacity=".5" />
      <ellipse cx={x} cy={y} rx="12" ry="11" fill="url(#stg-boss)" />
      <ellipse cx={x} cy={y} rx="12" ry="11" fill="url(#stg-boss-lit)" />
      <ellipse cx={x} cy={y} rx="12" ry="11" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1" />
    </g>
  );
}

export const Light = memo(function Light() {
  return (
    <svg className="stg-svg stg-light" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
      <defs>
        {/* the belly below the lip: the body minus the rolled lip, so light never paints over the iron rim */}
        <clipPath id="stg-l-body"><path clipRule="evenodd" d={BODY_PATH + RIM_OUTER} /></clipPath>
        <clipPath id="stg-l-legs">{LEG_PATHS.map((d, i) => <path key={i} d={d} />)}</clipPath>

        <linearGradient id="stg-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={hi(0.3)} />
          <stop offset=".16" style={hi(0.15)} />
          <stop offset=".4" style={mid(0.04)} />
          <stop offset=".7" style={mid(0)} />
        </linearGradient>
        <radialGradient id="stg-spill-pool" cx=".5" cy=".5" r=".5">
          <stop offset="0" style={hi(0.26)} />
          <stop offset=".55" style={mid(0.09)} />
          <stop offset="1" style={mid(0)} />
        </radialGradient>
        <linearGradient id="stg-rim-r" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="622" y2="0">
          <stop offset="0" style={hi(0)} />
          <stop offset=".5" style={hi(0.2)} />
          <stop offset="1" style={hi(0.85)} />
        </linearGradient>
        <linearGradient id="stg-rim-l" gradientUnits="userSpaceOnUse" x1="240" y1="0" x2="100" y2="0">
          <stop offset="0" style={hi(0)} />
          <stop offset=".7" style={hi(0.02)} />
          <stop offset="1" style={hi(0.12)} />
        </linearGradient>
        <linearGradient id="stg-rim-fade" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="470">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="stg-rim-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
          <rect width={VB_W} height={VB_H} fill="url(#stg-rim-fade)" />
        </mask>
        <radialGradient id="stg-bounce" cx=".5" cy=".5" r=".5">
          <stop offset="0" style={ember(0.4, '#ff9a4a')} />
          <stop offset=".45" style={ember(0.15)} />
          <stop offset="1" style={ember(0, '#ff6a20')} />
        </radialGradient>
        <linearGradient id="stg-bounce-rim" gradientUnits="userSpaceOnUse" x1="0" y1="420" x2="0" y2="514">
          <stop offset="0" style={ember(0, '#ffb05e')} />
          <stop offset="1" style={ember(0.5, '#ff9a4a')} />
        </linearGradient>
 <linearGradient id="stg-leg-edge" gradientUnits="userSpaceOnUse" x1="0" y1="470" x2="0" y2="560">
          <stop offset="0" style={ember(0, '#ffa352')} />
          <stop offset="1" style={ember(0.26, '#ffa352')} />
        </linearGradient>
        <linearGradient id="stg-leg-glow" gradientUnits="userSpaceOnUse" x1="0" y1="500" x2="0" y2="566">
          <stop offset="0" style={ember(0, '#ff7a30')} />
          <stop offset="1" style={ember(0.2, '#ff7a30')} />
        </linearGradient>
        <radialGradient id="stg-boss" cx=".38" cy=".32" r=".8">
          <stop offset="0" stopColor="#3b3d45" />
          <stop offset=".6" stopColor="#1b1c21" />
          <stop offset="1" stopColor="#0b0c0e" />
        </radialGradient>
        <radialGradient id="stg-boss-lit" cx=".5" cy=".12" r=".7">
          <stop offset="0" style={hi(0.5)} />
          <stop offset="1" style={hi(0)} />
        </radialGradient>
        <radialGradient id="stg-lip-glow" cx=".5" cy=".5" r=".5">
          <stop offset=".78" style={hi(0)} />
          <stop offset=".835" style={hi(0.9)} />
          <stop offset=".92" style={hi(0.34)} />
          <stop offset="1" style={hi(0.06)} />
        </radialGradient>
        <linearGradient id="stg-crest" gradientUnits="userSpaceOnUse" x1="0" y1="124" x2="0" y2="256">
          <stop offset="0" style={hi(0.2)} />
          <stop offset=".5" style={hi(0.42)} />
          <stop offset="1" style={hi(0.95)} />
        </linearGradient>
      </defs>

      {/* the spill: brew light thrown up onto the lip and the upper belly */}
      <g clipPath="url(#stg-l-body)">
        <rect x="80" y="190" width="560" height="320" fill="url(#stg-spill)" />
        <ellipse cx="360" cy="262" rx="290" ry="84" fill="url(#stg-spill-pool)" />
        {/* rim light down both flanks, strongest on the right */}
        <g mask="url(#stg-rim-mask)">
          <path d={BODY_OPEN} fill="none" stroke="url(#stg-rim-r)" strokeWidth="20" opacity=".22" />
          <path d={BODY_OPEN} fill="none" stroke="url(#stg-rim-r)" strokeWidth="10" opacity=".45" />
          <path d={BODY_OPEN} fill="none" stroke="url(#stg-rim-r)" strokeWidth="5" />
          <path d={BODY_OPEN} fill="none" stroke="url(#stg-rim-l)" strokeWidth="10" opacity=".5" />
          <path d={BODY_OPEN} fill="none" stroke="url(#stg-rim-l)" strokeWidth="4" opacity=".7" />
        </g>
        {/* ember bounce on the lower belly */}
        <ellipse cx="360" cy="536" rx="270" ry="112" fill="url(#stg-bounce)" />
        <path d={BODY_OPEN} fill="none" stroke="url(#stg-bounce-rim)" strokeWidth="26" opacity=".4" />
        <path d={BODY_OPEN} fill="none" stroke="url(#stg-bounce-rim)" strokeWidth="9" opacity=".8" />
        {/* the hoop catches the light on its top edge */}
        <path d={HOOP_PATH} fill="none" style={{ stroke: 'var(--brew-hi)' }} strokeOpacity=".22" strokeWidth="1.6" transform="translate(0 -6)" />
      </g>

      <g clipPath="url(#stg-l-legs)">
        <rect x="120" y="490" width="480" height="80" fill="url(#stg-leg-glow)" />
        {/* the ember bed lights the inner edge of each leg */}
        <path d="M266 462L250 552M454 462L470 552M334 480L324 552M386 480L396 552" fill="none" stroke="url(#stg-leg-edge)" strokeWidth="9" />
      </g>

      {/* handle lugs, over the belly */}
      {HANDLE_BOSSES.map(([x, y], i) => <Boss key={`l${i}`} x={x} y={y} />)}
      {HANDLE_BOSSES.map(([x, y], i) => <Boss key={`r${i}`} x={x} y={y} mirror />)}

      {/* handles: the pot-facing edge picks up the brew */}
      {[false, true].map((m) => (
        <path
          key={String(m)}
          d={HANDLE_PATH}
          fill="none"
          style={{ stroke: 'var(--brew-hi)' }}
          strokeWidth="2"
          strokeOpacity=".3"
          strokeLinecap="round"
          strokeDasharray="38 400"
          transform={`${m ? `${MIRROR} ` : ''}translate(5 -1)`}
        />
      ))}

      {/* the rolled lip, lit from inside */}
      <path className="stg-lip-glow" fillRule="evenodd" d={RIM_PATH} fill="url(#stg-lip-glow)" />
      <path
        d={`M${RIM.cx - 220} ${RIM.cy}A220 60 0 0 0 ${RIM.cx + 220} ${RIM.cy}`}
        fill="none" stroke="url(#stg-crest)" strokeWidth="2.4" strokeLinecap="round"
      />
      <path
        d={`M${RIM.cx - 214} ${RIM.cy - 8}A220 60 0 0 1 ${RIM.cx + 214} ${RIM.cy - 8}`}
        fill="none" style={{ stroke: 'var(--brew-hi)' }} strokeOpacity=".16" strokeWidth="1.4" strokeLinecap="round"
      />
      <path
        d={`M${RIM.cx - 206} ${RIM.cy + 14}A210 56 0 0 0 ${RIM.cx + 206} ${RIM.cy + 14}`}
        fill="none" stroke="#ffe3bd" strokeOpacity=".16" strokeWidth="1.2" strokeLinecap="round"
      />
      {/* extra glow when the pot is brimming (200 ml and up) */}
      <g className="stg-brim">
        <ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx + 7} ry={MOUTH.ry + 6} fill="none" style={{ stroke: 'var(--brew-hi)' }} strokeWidth="10" strokeOpacity=".28" />
        <ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx + 2} ry={MOUTH.ry + 2} fill="none" style={{ stroke: 'var(--brew-hi)' }} strokeWidth="3" strokeOpacity=".8" />
      </g>
      {/* a drag over the pot invites, then lights the rim in the accent */}
      <g className="stg-invite">
        <ellipse cx={RIM.cx} cy={RIM.cy} rx={RIM.rx + 4} ry={RIM.ry + 4} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="1.4" />
        <g className="stg-invite-lit">
          <ellipse cx={RIM.cx} cy={RIM.cy} rx={RIM.rx + 4} ry={RIM.ry + 4} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="9" strokeOpacity=".22" />
          <ellipse cx={RIM.cx} cy={RIM.cy} rx={RIM.rx - 14} ry={RIM.ry - 8} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.4" strokeOpacity=".9" />
        </g>
      </g>
    </svg>
  );
});
