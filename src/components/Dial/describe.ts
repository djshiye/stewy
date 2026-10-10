import type { Ingredient } from '../../data/types';
import { trim } from '../../lib/units';

/** What to call an ingredient under its name (recipe card rows and the pour dial share this). */
const KIND_BY_ID: Record<string, string> = {
  campari: 'Bitter liqueur', aperol: 'Aperitivo', sweet_vermouth: 'Fortified wine',
  dry_vermouth: 'Fortified wine', lillet_blanc: 'Aromatised wine', amaro: 'Bitter liqueur',
  chartreuse: 'Herbal liqueur', benedictine: 'Herbal liqueur', triple_sec: 'Orange liqueur',
  grand_marnier: 'Orange liqueur', prosecco: 'Sparkling wine', champagne: 'Sparkling wine',
  egg_white: 'Egg', heavy_cream: 'Dairy', milk: 'Dairy', espresso: 'Coffee', coconut_cream: 'Coconut',
  absinthe: 'Anise spirit', passion_fruit: 'Fruit purée', agave: 'Sweetener',
};
const KIND_BY_GROUP: Record<string, string> = {
  Spirits: 'Spirit', Liqueurs: 'Liqueur', Juices: 'Juice', Mixers: 'Mixer', Syrups: 'Syrup',
  Bitters: 'Bitters', Extras: 'Extra', Garnish: 'Garnish',
};

export function describeIngredient(ing: Ingredient): string {
  const kind = KIND_BY_ID[ing.id] ?? KIND_BY_GROUP[ing.group] ?? ing.group;
  // counted items (dashes, pieces) carry no ABV line
  return ing.abv > 0 && !ing.unit ? `${kind}, ${trim(ing.abv, 1)}% ABV` : kind;
}
