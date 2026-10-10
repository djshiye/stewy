import { useId } from 'react';

/** The Stewy sigil: a cast-iron cauldron under a crescent moon and a star. Its brew surface
    and aura take the live accent (`--accent`), so the logo is lit by the drink in the pot.
    Fills use `style` because CSS variables do not work in SVG presentation attributes. */
export function BrandMark({ className }: { className?: string }) {
  const uid = useId();
  const brewId = `${uid}b`, auraId = `${uid}a`, fireId = `${uid}f`, moonId = `${uid}m`;
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={brewId} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" style={{ stopColor: 'var(--accent-hi)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brew-deep)' }} />
        </radialGradient>
        <radialGradient id={auraId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.4 }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={fireId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffcf7d" stopOpacity="0.8" />
          <stop offset="0.55" stopColor="#ff8a3c" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ff8a3c" stopOpacity="0" />
        </radialGradient>
        <mask id={moonId}>
          <circle cx="18" cy="14.5" r="6" fill="#fff" />
          <circle cx="20.6" cy="12.9" r="5.2" fill="#000" />
        </mask>
      </defs>
      <ellipse cx="32" cy="55.5" rx="15" ry="6.5" fill={`url(#${fireId})`} />
      <path
        d="M15.8 30.5 Q14.5 45 26 51.5 Q32 54 38 51.5 Q49.5 45 48.2 30.5 Z"
        fill="#161b24"
        stroke="rgba(190,205,230,0.4)"
        strokeWidth="1.3"
      />
      <path d="M22.5 52.3 l-2.4 4.6 q-0.7 1.6 1 1.6 h3.6 q1.4 0 1.1 -1.5 l-1 -4.9 Z" fill="#1e2430" />
      <path d="M41.5 52.3 l2.4 4.6 q0.7 1.6 -1 1.6 h-3.6 q-1.4 0 -1.1 -1.5 l1 -4.9 Z" fill="#1e2430" />
      <ellipse cx="32" cy="26" rx="11" ry="6.5" fill={`url(#${auraId})`} />
      <ellipse cx="32" cy="29.5" rx="16.4" ry="4.8" fill="#10141b" stroke="rgba(190,205,230,0.55)" strokeWidth="1.7" />
      <ellipse cx="32" cy="29.6" rx="13" ry="3.4" fill={`url(#${brewId})`} />
      <ellipse cx="30" cy="29" rx="6.5" ry="1.7" style={{ fill: 'var(--accent-hi)' }} opacity="0.55" />
      <circle cx="26.5" cy="26.3" r="1.7" style={{ fill: 'var(--accent-hi)' }} opacity="0.85" />
      <circle cx="33.8" cy="24.6" r="1.2" style={{ fill: 'var(--accent-hi)' }} opacity="0.7" />
      <circle cx="30.2" cy="22" r="0.9" style={{ fill: 'var(--accent-hi)' }} opacity="0.55" />
      <circle cx="16.5" cy="49" r="1" fill="#ffb45e" opacity="0.85" />
      <circle cx="47.5" cy="47" r="0.8" fill="#ff9a3c" opacity="0.75" />
      <circle cx="18" cy="14.5" r="6" fill="#ece3cf" mask={`url(#${moonId})`} />
      <path
        d="M47.5 9.5 l1.5 4.2 4.2 1.5 -4.2 1.5 -1.5 4.2 -1.5 -4.2 -4.2 -1.5 4.2 -1.5 Z"
        style={{ fill: 'var(--accent-hi)' }}
      />
      <circle cx="42" cy="22.5" r="1" fill="#ece3cf" opacity="0.75" />
    </svg>
  );
}
