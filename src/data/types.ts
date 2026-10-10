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

/** Bottle silhouette family, used by the 'bottle' icon so spirits read apart on the shelf. */
export type BottleShape =
  | 'tall'       // vodka: tall, slim, straight shoulders
  | 'gin'        // square-shouldered, faceted
  | 'rum'        // squat, round-bellied
  | 'agave'      // tequila / mezcal: flared base, short neck
  | 'whiskey'    // square decanter, short neck
  | 'cognac'     // round flask
  | 'absinthe'   // slim, long neck
  | 'liqueur'    // bulbous, short neck
  | 'cordial'    // small stubby apothecary bottle (Chartreuse, Bénédictine)
  | 'vermouth'   // wine-bottle profile
  | 'aperitivo'; // tall, ridged (Campari / Aperol)

/** Serving glass for a finished drink. */
export type GlassKind =
  | 'coupe' | 'martini' | 'rocks' | 'highball' | 'copper-mug'
  | 'wine' | 'flute' | 'hurricane' | 'julep' | 'tiki';

/** How a drink is mixed. */
export type Method = 'shake' | 'stir' | 'build' | 'blend';

export interface Ingredient {
  id: string;
  name: string;
  group: Group;
  icon: IconKind;
  /** Bottle silhouette (bottle icons only). */
  bottle?: BottleShape;
  /** Liquid colour (hex), drives cauldron colour mixing. */
  color: string;
  /** Citrus rind colour (citrus icons only). */
  rind?: string;
  /** Bottle-cap colour (bottle icons only). */
  cap?: string;
  /** 0..1, how opaque the liquid is (soda ~clear, cream ~opaque). */
  opacity: number;
  /** Alcohol % by volume. */
  abv: number;
  /** Default amount to add, in ml (pieces stored as ~ml of impact). */
  amt: number;
  /** Count-based measure for small items; volumes when omitted. */
  unit?: 'dash' | 'piece';
  /** Sparkling (soda, tonic, sparkling wine): drinks built on it are topped, not shaken. */
  carbonated?: boolean;
  /** Flavour profile, each dimension 0..3, feeds the harmony engine. */
  tags: Tags;
}

export interface BrewEntry {
  id: string;
  ml: number;
}

export interface Recipe {
  id: string;
  name: string;
  glass: GlassKind;
  method: Method;
  /** Serving garnish, plain text ("Orange peel"). */
  garnish?: string;
  /** One short line shown in the Grimoire. */
  note: string;
  /** [ingredient id, ml] pairs loaded straight into the cauldron. */
  build: [string, number][];
  /** @deprecated legacy; the UI draws the glass instead. */
  emoji?: string;
}
