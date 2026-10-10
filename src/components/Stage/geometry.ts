/* Shared geometry for the cauldron art. Every layer uses the same 720 x 600 viewBox, so a
   coordinate here is a coordinate in the iron, light, surface, halo and fx layers alike. */

export const VB_W = 720;
export const VB_H = 600;

/** Outer ellipse of the rolled lip. */
export const RIM = { cx: 360, cy: 190, rx: 236, ry: 66 } as const;
/** The opening: the hole in the lip ring, and the clip for everything liquid. */
export const MOUTH = { cx: 360, cy: 190, rx: 204, ry: 54 } as const;
export const FLOOR_Y = 566;
/** Centre of the celestial halo (the middle of the frame, so it can turn about 50% 50%). */
export const HALO = { cx: 360, cy: 300, r: 250 } as const;

/** The outer ellipse of the lip as a closed subpath. */
export const RIM_OUTER =
  `M${RIM.cx - RIM.rx} ${RIM.cy}a${RIM.rx} ${RIM.ry} 0 1 0 ${RIM.rx * 2} 0a${RIM.rx} ${RIM.ry} 0 1 0 ${-RIM.rx * 2} 0Z`;

/** Evenodd ring: the rolled lip with the opening cut out. */
export const RIM_PATH =
  RIM_OUTER +
  `M${MOUTH.cx - MOUTH.rx} ${MOUTH.cy}a${MOUTH.rx} ${MOUTH.ry} 0 1 0 ${MOUTH.rx * 2} 0a${MOUTH.rx} ${MOUTH.ry} 0 1 0 ${-MOUTH.rx * 2} 0Z`;

/** The bowl: rim at y 190, widest at 304, a rounded base near y 514. */
export const BODY_PATH =
  'M124 190C120 220 120 244 122 272C126 362 184 448 268 490Q312 512 360 512Q408 512 452 490C536 448 594 362 598 272C600 244 600 220 596 190Z';
/** The same outline left open at the top, for strokes that must not draw across the lip. */
export const BODY_OPEN = BODY_PATH.replace(/Z$/, '');

/** The hoop: the front arc of a band around the belly. */
export const HOOP = { cx: 360, cy: 300, rx: 240, ry: 70 } as const;
export const HOOP_PATH = `M${HOOP.cx - HOOP.rx} ${HOOP.cy}A${HOOP.rx} ${HOOP.ry} 0 0 0 ${HOOP.cx + HOOP.rx} ${HOOP.cy}`;

export const LEG_PATHS = [
  'M202 436L178 548Q174 566 192 566L236 566Q252 566 250 550L266 462Z',
  'M518 436L542 548Q546 566 528 566L484 566Q468 566 470 550L454 462Z',
  'M334 480L324 548Q322 566 340 566L380 566Q398 566 396 548L386 480Z',
] as const;
/** Where each foot touches the floor (for contact shadows and rims). */
export const FEET = [[214, 566], [506, 566], [360, 566]] as const;

/** A looped handle, drawn for the left side; the right side mirrors it about x = 360. */
export const HANDLE_PATH = 'M122 248C62 238 44 354 130 350';
export const HANDLE_BOSSES = [
  [122, 248],
  [130, 350],
] as const;

/** Small seeded PRNG so decorative geometry is stable across renders (no Math.random). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const f = (n: number, d = 1) => Number(n.toFixed(d));
