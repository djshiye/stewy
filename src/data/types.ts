/* Shared domain types for Stewy. */

export const FLAVOR_DIMS = [
  'boozy', 'sweet', 'sour', 'bitter', 'herbal', 'fruity', 'citrus', 'smoky',
  'spicy', 'floral', 'creamy', 'aromatic', 'fresh', 'nutty', 'coffee',
] as const;

export type FlavorDim = (typeof FLAVOR_DIMS)[number];
export type Tags = Partial<Record<FlavorDim, number>>;

export type Group =
  | 'Spirits' | 'Liqueurs' | 'Juices' | 'Mixers'
  | 'Syrups' | 'Bitters' | 'Extras' | 'Garnish';

export type IconKind =
  | 'bottle' | 'syrup' | 'dropper' | 'fizz' | 'flute' | 'citrus' | 'mint'
  | 'cherry' | 'cream' | 'egg' | 'coffee' | 'sugar' | 'coconut' | 'tomato'
  | 'cucumber' | 'cranberry' | 'pineapple' | 'olive' | 'shaker';

export interface Ingredient {
  id: string;
  name: string;
  group: Group;
  icon: IconKind;
  /** Liquid colour (hex) — drives cauldron colour mixing. */
  color: string;
  /** Citrus rind colour (citrus icons only). */
  rind?: string;
  /** Bottle-cap colour (bottle icons only). */
  cap?: string;
  /** 0..1 — how opaque the liquid is (soda ~clear, cream ~opaque). */
  opacity: number;
  /** Alcohol % by volume. */
  abv: number;
  /** Default amount to add, in ml (pieces stored as ~ml of impact). */
  amt: number;
  /** Count-based measure for small items; volumes when omitted. */
  unit?: 'dash' | 'piece';
  /** Flavour profile, each dimension 0..3 — feeds the harmony engine. */
  tags: Tags;
}

export interface BrewEntry {
  id: string;
  ml: number;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  glass: string;
  note: string;
  /** [ingredient id, ml] pairs loaded straight into the cauldron. */
  build: [string, number][];
}
