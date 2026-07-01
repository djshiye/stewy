/* Stewy — icon system
   Generates crisp, flat SVG icons for every ingredient from a small set of
   parametric factories. Loaded before ingredients.js / app.js as a plain
   script, so everything hangs off `window`. */

(function () {
  'use strict';

  let _uid = 0;
  const nid = (p) => `${p}${++_uid}`;

  // ---- color utilities (shared across the app) --------------------------
  window.hexToRgb = function hexToRgb(hex) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  window.rgbToCss = function rgbToCss(r, g, b, a) {
    return a == null
      ? `rgb(${r | 0}, ${g | 0}, ${b | 0})`
      : `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;
  };

  // amt in [-1,1]: negative darkens toward black, positive lightens to white
  window.shade = function shade(color, amt) {
    let r, g, b;
    if (Array.isArray(color)) [r, g, b] = color;
    else [r, g, b] = window.hexToRgb(color);
    if (amt < 0) {
      r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
    } else {
      r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
    }
    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
  };

  const svg = (inner) =>
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">${inner}</svg>`;

  const glassFill = 'rgba(255,255,255,0.10)';
  const glassStroke = 'rgba(255,255,255,0.42)';

  // ---- factories --------------------------------------------------------

  const bottlePath =
    'M20 5 L20 12 Q16 13 16 18 L16 39 Q16 42 19 42 L29 42 Q32 42 32 39 L32 18 Q32 13 28 12 L28 5 Z';

  function bottleIcon(liquid, cap, label) {
    cap = cap || '#41372b';
    label = label || 'rgba(244,239,225,0.92)';
    const cid = nid('b');
    const dark = window.shade(liquid, -0.28);
    return svg(`
      <defs><clipPath id="${cid}"><path d="${bottlePath}"/></clipPath></defs>
      <rect x="19.5" y="2.5" width="9" height="4" rx="1.3" fill="${cap}"/>
      <path d="${bottlePath}" fill="${glassFill}" stroke="${glassStroke}" stroke-width="1.2"/>
      <g clip-path="url(#${cid})">
        <rect x="14" y="22" width="20" height="22" fill="${liquid}"/>
        <rect x="14" y="22" width="20" height="3" fill="${dark}" opacity="0.5"/>
        <rect x="18.5" y="26" width="11" height="10" rx="1.6" fill="${label}"/>
        <rect x="19" y="12" width="2.4" height="30" rx="1.2" fill="rgba(255,255,255,0.4)"/>
      </g>`);
  }

  function syrupIcon(liquid) {
    // squat syrup/dram bottle
    const cid = nid('s');
    const p = 'M17 14 L17 39 Q17 43 21 43 L27 43 Q31 43 31 39 L31 14 Z';
    return svg(`
      <defs><clipPath id="${cid}"><path d="${p}"/></clipPath></defs>
      <rect x="20" y="4" width="8" height="4" rx="1" fill="#caa24a"/>
      <rect x="21" y="8" width="6" height="6" fill="rgba(255,255,255,0.12)" stroke="${glassStroke}" stroke-width="1"/>
      <path d="${p}" fill="${glassFill}" stroke="${glassStroke}" stroke-width="1.2"/>
      <g clip-path="url(#${cid})">
        <rect x="15" y="19" width="18" height="26" fill="${liquid}"/>
        <rect x="19" y="24" width="10" height="12" rx="1.4" fill="rgba(244,239,225,0.9)"/>
        <rect x="18" y="14" width="2" height="30" fill="rgba(255,255,255,0.35)"/>
      </g>`);
  }

  function dropperIcon(liquid) {
    const cid = nid('d');
    const p = 'M18 15 L30 15 L30 38 Q30 42 26 42 L22 42 Q18 42 18 38 Z';
    return svg(`
      <defs><clipPath id="${cid}"><path d="${p}"/></clipPath></defs>
      <rect x="20" y="3" width="8" height="6" rx="1.4" fill="#2c2018"/>
      <rect x="22" y="8" width="4" height="7" fill="#2c2018"/>
      <path d="${p}" fill="${glassFill}" stroke="${glassStroke}" stroke-width="1.2"/>
      <g clip-path="url(#${cid})">
        <rect x="16" y="24" width="16" height="20" fill="${liquid}"/>
        <rect x="20" y="12" width="2" height="30" fill="rgba(255,255,255,0.3)"/>
      </g>`);
  }

  function fizzIcon(liquid, fizzy) {
    const cid = nid('f');
    const p = 'M15 12 L33 12 L30.5 41 Q30.3 44 27.5 44 L20.5 44 Q17.7 44 17.5 41 Z';
    let bubbles = '';
    if (fizzy !== false) {
      bubbles =
        '<circle cx="21" cy="24" r="1.4" fill="rgba(255,255,255,0.7)"/>' +
        '<circle cx="26" cy="20" r="1.1" fill="rgba(255,255,255,0.6)"/>' +
        '<circle cx="24" cy="30" r="1.5" fill="rgba(255,255,255,0.7)"/>' +
        '<circle cx="27" cy="34" r="1" fill="rgba(255,255,255,0.55)"/>' +
        '<circle cx="20" cy="34" r="1.2" fill="rgba(255,255,255,0.6)"/>';
    }
    return svg(`
      <defs><clipPath id="${cid}"><path d="${p}"/></clipPath></defs>
      <path d="${p}" fill="${glassFill}" stroke="${glassStroke}" stroke-width="1.2"/>
      <g clip-path="url(#${cid})">
        <rect x="14" y="18" width="20" height="28" fill="${liquid}"/>
        ${bubbles}
      </g>
      <ellipse cx="24" cy="12" rx="9" ry="2.2" fill="rgba(255,255,255,0.18)" stroke="${glassStroke}" stroke-width="1"/>`);
  }

  function fluteIcon(liquid) {
    const cid = nid('fl');
    const p = 'M20 6 L28 6 L26.5 22 Q26 27 24 30 Q22 27 21.5 22 Z';
    return svg(`
      <defs><clipPath id="${cid}"><path d="${p}"/></clipPath></defs>
      <path d="${p}" fill="${glassFill}" stroke="${glassStroke}" stroke-width="1.2"/>
      <rect x="23.2" y="30" width="1.6" height="10" fill="${glassStroke}"/>
      <rect x="18" y="41" width="12" height="2.4" rx="1.2" fill="${glassStroke}"/>
      <g clip-path="url(#${cid})"><rect x="18" y="14" width="12" height="18" fill="${liquid}"/></g>
      <circle cx="23" cy="20" r="0.9" fill="rgba(255,255,255,0.7)"/>
      <circle cx="25" cy="16" r="0.7" fill="rgba(255,255,255,0.6)"/>`);
  }

  function citrusIcon(flesh, rind) {
    let spokes = '';
    for (let a = 0; a < 360; a += 45) {
      const r = 12.5;
      const x = 24 + r * Math.cos((a * Math.PI) / 180);
      const y = 24 + r * Math.sin((a * Math.PI) / 180);
      spokes += `<line x1="24" y1="24" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    }
    return svg(`
      <circle cx="24" cy="24" r="17" fill="${rind}"/>
      <circle cx="24" cy="24" r="14.5" fill="${window.shade(flesh, 0.12)}"/>
      <circle cx="24" cy="24" r="13" fill="${flesh}"/>
      <g stroke="${rind}" stroke-width="1.3" opacity="0.5">${spokes}</g>
      <circle cx="24" cy="24" r="2.3" fill="${window.shade(flesh, 0.2)}"/>
      <ellipse cx="18" cy="18" rx="4.5" ry="3" fill="rgba(255,255,255,0.28)"/>`);
  }

  function mintIcon() {
    const leaf = (cx, cy, rot, s) =>
      `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})">
        <path d="M0 -7 C6 -6 6 6 0 7 C-6 6 -6 -6 0 -7 Z" fill="#3fae6a"/>
        <path d="M0 -6 L0 6" stroke="#2c7d4c" stroke-width="0.9"/>
      </g>`;
    return svg(`
      <path d="M24 44 C24 34 21 26 24 14" stroke="#2c7d4c" stroke-width="2" fill="none"/>
      ${leaf(24, 12, 0, 1)}
      ${leaf(17, 20, -38, 1.05)}
      ${leaf(31, 20, 38, 1.05)}
      ${leaf(16, 30, -30, 1.1)}
      ${leaf(32, 30, 30, 1.1)}`);
  }

  function cherryIcon() {
    return svg(`
      <path d="M18 18 Q26 10 32 22" stroke="#5f8f38" stroke-width="1.8" fill="none"/>
      <circle cx="18" cy="32" r="7.5" fill="#c31f3c"/>
      <circle cx="31" cy="34" r="7" fill="#a3182f"/>
      <ellipse cx="15.5" cy="29.5" rx="2.4" ry="1.6" fill="rgba(255,255,255,0.5)"/>
      <ellipse cx="28.5" cy="31.5" rx="2.1" ry="1.4" fill="rgba(255,255,255,0.4)"/>
      <circle cx="32" cy="22" r="2.6" fill="#6fae3f"/>`);
  }

  function cartonIcon(liquid) {
    return svg(`
      <path d="M15 18 L24 12 L33 18 L33 42 L15 42 Z" fill="${window.shade(liquid, 0.05)}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
      <path d="M15 18 L24 12 L33 18 L24 22 Z" fill="${window.shade(liquid, -0.12)}"/>
      <rect x="19" y="26" width="10" height="11" rx="1.2" fill="rgba(70,110,150,0.85)"/>
      <path d="M20 30 h8 M20 33 h8" stroke="rgba(255,255,255,0.85)" stroke-width="1.1"/>`);
  }

  function eggIcon() {
    return svg(`
      <ellipse cx="24" cy="26" rx="12" ry="15" fill="#f6f3ea"/>
      <ellipse cx="24" cy="26" rx="12" ry="15" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
      <ellipse cx="20" cy="20" rx="4" ry="6" fill="rgba(255,255,255,0.75)" transform="rotate(-20 20 20)"/>
      <circle cx="24" cy="28" r="5.5" fill="#f4c430"/>`);
  }

  function coffeeIcon() {
    return svg(`
      <path d="M20 8 q2 3 0 6 M26 8 q2 3 0 6" stroke="rgba(255,255,255,0.5)" stroke-width="1.6" fill="none"/>
      <path d="M13 18 L33 18 L31 34 Q30.5 40 24 40 Q17.5 40 17 34 Z" fill="#f2ede0" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
      <path d="M15 22 L31 22 L29.5 33 Q29 37.5 24 37.5 Q19 37.5 18.5 33 Z" fill="#3a2314"/>
      <path d="M33 22 q6 1 5 7 q-1 5 -6 4" stroke="rgba(0,0,0,0.18)" stroke-width="2" fill="none"/>`);
  }

  function sugarIcon() {
    const cube = (x, y) =>
      `<g transform="translate(${x} ${y})">
        <path d="M0 4 L8 0 L16 4 L8 8 Z" fill="#ffffff"/>
        <path d="M0 4 L0 13 L8 17 L8 8 Z" fill="#dfe3ea"/>
        <path d="M16 4 L16 13 L8 17 L8 8 Z" fill="#eef1f6"/>
      </g>`;
    return svg(`${cube(6, 22)}${cube(18, 22)}${cube(12, 12)}`);
  }

  function coconutIcon() {
    return svg(`
      <circle cx="24" cy="26" r="15" fill="#6b4a2f"/>
      <circle cx="24" cy="26" r="15" fill="none" stroke="#4f3620" stroke-width="1.4"/>
      <path d="M24 11 A15 15 0 0 1 39 26 A11 11 0 0 0 24 15 A11 11 0 0 0 9 26 A15 15 0 0 1 24 11 Z" fill="#f6f2ea"/>
      <circle cx="24" cy="26" r="8.5" fill="#fbf8f2"/>
      <ellipse cx="24" cy="24" rx="5" ry="3.5" fill="#efe7d8"/>`);
  }

  function tomatoIcon() {
    return svg(`
      <circle cx="24" cy="27" r="14" fill="#c62b1e"/>
      <circle cx="24" cy="27" r="14" fill="none" stroke="#9e2115" stroke-width="1"/>
      <ellipse cx="19" cy="22" rx="4" ry="2.6" fill="rgba(255,255,255,0.28)"/>
      <path d="M24 13 l-4 -4 M24 13 l4 -4 M24 13 l0 -5 M24 13 l-6 -1 M24 13 l6 -1" stroke="#4f8a3a" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="13" r="2.4" fill="#4f8a3a"/>`);
  }

  function cucumberIcon() {
    return svg(`
      <g transform="rotate(35 24 24)">
        <rect x="18" y="8" width="12" height="32" rx="6" fill="#4f9d3f"/>
        <rect x="20.5" y="11" width="7" height="26" rx="3.5" fill="#cfe8a8"/>
        <g fill="#8fbf5a"><circle cx="24" cy="18" r="1.1"/><circle cx="24" cy="24" r="1.1"/><circle cx="24" cy="30" r="1.1"/></g>
      </g>`);
  }

  function cranberryIcon() {
    const berry = (x, y, r) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#a3182f"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="rgba(255,255,255,0.45)"/>`;
    return svg(`
      ${berry(18, 22, 6)}${berry(30, 20, 5.5)}${berry(24, 31, 6.5)}${berry(33, 31, 4.5)}${berry(15, 32, 4.5)}`);
  }

  function pineappleIcon() {
    return svg(`
      <path d="M24 6 l-3 8 M24 6 l3 8 M24 6 l-7 6 M24 6 l7 6" stroke="#4f9d3f" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="24" cy="30" rx="12" ry="14" fill="#f4c430"/>
      <ellipse cx="24" cy="30" rx="12" ry="14" fill="none" stroke="#d19b12" stroke-width="1"/>
      <g stroke="#c98f18" stroke-width="1.1" opacity="0.8">
        <path d="M14 24 L34 24 M14 30 L34 30 M14 36 L34 36 M18 18 L18 42 M24 16 L24 44 M30 18 L30 42"/>
      </g>`);
  }

  function oliveIcon() {
    return svg(`
      <ellipse cx="22" cy="26" rx="9" ry="12" fill="#7d8a2e"/>
      <ellipse cx="22" cy="26" rx="9" ry="12" fill="none" stroke="#5f6a22" stroke-width="1"/>
      <ellipse cx="18.5" cy="20" rx="2.6" ry="3.4" fill="rgba(255,255,255,0.28)"/>
      <circle cx="22" cy="20" r="3.4" fill="#c8102e"/>
      <line x1="30" y1="10" x2="26" y2="18" stroke="#c9b46a" stroke-width="1.6"/>`);
  }

  function shakerIcon() {
    return svg(`
      <path d="M17 20 Q17 14 24 13 Q31 14 31 20 L31 40 Q31 43 28 43 L20 43 Q17 43 17 40 Z" fill="rgba(255,255,255,0.14)" stroke="${glassStroke}" stroke-width="1.2"/>
      <path d="M18 12 L30 12 L29 18 L19 18 Z" fill="#b9bec7"/>
      <g fill="#7d828b"><circle cx="22" cy="14.5" r="0.9"/><circle cx="26" cy="14.5" r="0.9"/><circle cx="24" cy="16" r="0.9"/></g>
      <rect x="20" y="24" width="8" height="14" rx="1.4" fill="rgba(255,255,255,0.55)"/>`);
  }

  // ---- dispatcher -------------------------------------------------------
  const FACTORY = {
    bottle: (ing) => bottleIcon(ing.color, ing.cap, ing.label),
    syrup: (ing) => syrupIcon(ing.color),
    dropper: (ing) => dropperIcon(ing.color),
    fizz: (ing) => fizzIcon(ing.color, ing.fizzy),
    flute: (ing) => fluteIcon(ing.color),
    citrus: (ing) => citrusIcon(ing.color, ing.rind || window.shade(ing.color, -0.3)),
    mint: mintIcon,
    cherry: cherryIcon,
    cream: (ing) => cartonIcon(ing.color),
    egg: eggIcon,
    coffee: coffeeIcon,
    sugar: sugarIcon,
    coconut: coconutIcon,
    tomato: tomatoIcon,
    cucumber: cucumberIcon,
    cranberry: cranberryIcon,
    pineapple: pineappleIcon,
    olive: oliveIcon,
    shaker: shakerIcon,
  };

  window.iconFor = function iconFor(ing) {
    const f = FACTORY[ing.icon] || FACTORY.bottle;
    return f(ing);
  };

  // Brand mark — an enchanted cauldron with glowing brew + gilded rim
  window.brandMark = function brandMark() {
    return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <radialGradient id="bmGlow" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stop-color="#a8ffe0"/>
          <stop offset="55%" stop-color="#3ddc97"/>
          <stop offset="100%" stop-color="#5b3fd0"/>
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="41" rx="13" ry="3" fill="rgba(61,220,151,0.28)"/>
      <path d="M9 22 Q7 34 18 39 Q24 41 30 39 Q41 34 39 22 Z" fill="rgba(220,255,240,0.08)" stroke="rgba(217,178,94,0.55)" stroke-width="1.4"/>
      <path d="M12 26 Q11 34 19 37 Q24 39 29 37 Q37 34 36 26 Z" fill="url(#bmGlow)" opacity="0.94"/>
      <ellipse cx="24" cy="22" rx="16" ry="4.2" fill="rgba(220,255,240,0.12)" stroke="#d9b25e" stroke-width="1.5"/>
      <circle cx="20" cy="30" r="1.6" fill="rgba(255,255,255,0.9)"/>
      <circle cx="27" cy="27" r="1.1" fill="rgba(255,255,255,0.8)"/>
      <circle cx="24" cy="33" r="1.3" fill="rgba(255,255,255,0.75)"/>
      <path d="M18 15 q3 -5 6 -1 q3 -5 6 0" stroke="#7fe6c4" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.85"/>
      <path d="M8 18 l1.4 2.6 l2.6 1.4 l-2.6 1.4 l-1.4 2.6 l-1.4 -2.6 l-2.6 -1.4 l2.6 -1.4 Z" fill="#f2d68c" opacity="0.85" transform="scale(0.7) translate(2 4)"/>
    </svg>`;
  };

  // Rotating "summoning circle" behind the cauldron (hexagram + runic ticks)
  window.magicCircle = function magicCircle() {
    const C = 100;
    const P = (deg, rad) => [
      (C + rad * Math.cos((deg * Math.PI) / 180)).toFixed(1),
      (C + rad * Math.sin((deg * Math.PI) / 180)).toFixed(1),
    ];
    const tri = (off, rad) => {
      const a = P(off - 90, rad), b = P(off + 30, rad), c = P(off + 150, rad);
      return `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} Z`;
    };
    let ticks = '';
    for (let d = 0; d < 360; d += 15) {
      const o = P(d, 90), i = P(d, d % 45 === 0 ? 80 : 85);
      ticks += `<line x1="${o[0]}" y1="${o[1]}" x2="${i[0]}" y2="${i[1]}"/>`;
    }
    let dots = '';
    for (let d = 0; d < 360; d += 30) { const p = P(d, 71); dots += `<circle cx="${p[0]}" cy="${p[1]}" r="1.6"/>`; }
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="100" cy="100" r="94" stroke="rgba(217,178,94,0.5)" stroke-width="1"/>
      <circle cx="100" cy="100" r="90" stroke="rgba(217,178,94,0.28)" stroke-width="0.6" stroke-dasharray="2 4"/>
      <circle cx="100" cy="100" r="80" stroke="rgba(127,230,196,0.45)" stroke-width="1"/>
      <circle cx="100" cy="100" r="63" stroke="rgba(154,123,245,0.4)" stroke-width="0.8"/>
      <g stroke="rgba(217,178,94,0.5)" stroke-width="0.9">${ticks}</g>
      <g fill="rgba(127,230,196,0.6)">${dots}</g>
      <g class="mc-inner" stroke="rgba(154,123,245,0.55)" stroke-width="1.1" fill="none">
        <path d="${tri(0, 63)}"/>
        <path d="${tri(180, 63)}"/>
      </g>
    </svg>`;
  };
})();
