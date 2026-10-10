/* Stewy: classic cocktail templates. Amounts in ml (internal unit). */
import type { Recipe } from './types';

export const RECIPES: Recipe[] = [
  // ---------------- Sours & shaken classics ----------------
  { id: 'margarita', name: 'Margarita', glass: 'coupe', method: 'shake', garnish: 'Salt rim, lime wheel',
    note: 'Tequila, orange liqueur and lime. Salt the rim.',
    build: [['tequila', 50], ['triple_sec', 20], ['lime_juice', 25], ['salt', 1]] },

  { id: 'daiquiri', name: 'Daiquiri', glass: 'coupe', method: 'shake', garnish: 'Lime wheel',
    note: 'The three-part rum sour benchmark.',
    build: [['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]] },

  { id: 'whiskey_sour', name: 'Whiskey Sour', glass: 'rocks', method: 'shake', garnish: 'Bitters on the foam',
    note: 'Bourbon, lemon, sugar and a silky egg foam.',
    build: [['bourbon', 45], ['lemon_juice', 25], ['simple_syrup', 15], ['egg_white', 20]] },

  { id: 'cosmopolitan', name: 'Cosmopolitan', glass: 'coupe', method: 'shake', garnish: 'Orange twist',
    note: 'Vodka, orange, cranberry and lime.',
    build: [['vodka', 40], ['triple_sec', 15], ['cranberry_juice', 30], ['lime_juice', 15]] },

  { id: 'sidecar', name: 'Sidecar', glass: 'coupe', method: 'shake', garnish: 'Orange twist',
    note: 'Cognac, orange liqueur and lemon, the Paris original.',
    build: [['cognac', 50], ['triple_sec', 20], ['lemon_juice', 20]] },

  { id: 'gimlet', name: 'Gimlet', glass: 'coupe', method: 'shake', garnish: 'Lime wheel',
    note: 'Gin and lime, sharp and clean.',
    build: [['gin', 50], ['lime_juice', 20], ['simple_syrup', 15]] },

  { id: 'bees_knees', name: "Bee's Knees", glass: 'coupe', method: 'shake', garnish: 'Lemon twist',
    note: 'Gin, lemon and honey from the Prohibition era.',
    build: [['gin', 50], ['lemon_juice', 25], ['honey_syrup', 20]] },

  { id: 'gold_rush', name: 'Gold Rush', glass: 'rocks', method: 'shake', garnish: 'Lemon twist',
    note: 'A bourbon sour sweetened with honey.',
    build: [['bourbon', 60], ['lemon_juice', 22], ['honey_syrup', 22]] },

  { id: 'penicillin', name: 'Penicillin', glass: 'rocks', method: 'shake', garnish: 'Candied ginger',
    note: 'Smoky scotch, lemon, honey and ginger.',
    build: [['scotch', 60], ['lemon_juice', 22], ['honey_syrup', 11], ['ginger_syrup', 11]] },

  { id: 'paper_plane', name: 'Paper Plane', glass: 'coupe', method: 'shake',
    note: 'Equal parts bourbon, Aperol, amaro and lemon.',
    build: [['bourbon', 22], ['aperol', 22], ['amaro', 22], ['lemon_juice', 22]] },

  { id: 'last_word', name: 'Last Word', glass: 'coupe', method: 'shake', garnish: 'Brandied cherry',
    note: 'Gin, Chartreuse, maraschino and lime in equal parts.',
    build: [['gin', 22], ['chartreuse', 22], ['maraschino', 22], ['lime_juice', 22]] },

  { id: 'aviation', name: 'Aviation', glass: 'coupe', method: 'shake', garnish: 'Brandied cherry',
    note: 'Floral gin sour with a violet haze.',
    build: [['gin', 45], ['maraschino', 15], ['creme_de_violette', 7], ['lemon_juice', 15]] },

  { id: 'corpse_reviver_2', name: 'Corpse Reviver No. 2', glass: 'coupe', method: 'shake', garnish: 'Orange twist',
    note: 'Four equal parts and an absinthe rinse.',
    build: [['gin', 22], ['triple_sec', 22], ['lillet_blanc', 22], ['lemon_juice', 22], ['absinthe', 2]] },

  { id: 'pisco_sour', name: 'Pisco Sour', glass: 'coupe', method: 'shake', garnish: 'Bitters on the foam',
    note: 'Peruvian pisco sour with a frothy crown.',
    build: [['pisco', 45], ['lime_juice', 30], ['simple_syrup', 20], ['egg_white', 20], ['angostura', 2]] },

  { id: 'amaretto_sour', name: 'Amaretto Sour', glass: 'rocks', method: 'shake', garnish: 'Cherry, orange slice',
    note: 'Almond sweetness cut with lemon and foam.',
    build: [['amaretto', 45], ['lemon_juice', 30], ['simple_syrup', 10], ['egg_white', 20]] },

  { id: 'southside', name: 'Southside', glass: 'coupe', method: 'shake', garnish: 'Mint sprig',
    note: 'A minty gin sour from the Chicago speakeasies.',
    build: [['gin', 60], ['lemon_juice', 30], ['simple_syrup', 15], ['mint', 8]] },

  { id: 'hemingway_daiquiri', name: 'Hemingway Daiquiri', glass: 'coupe', method: 'shake', garnish: 'Lime wheel',
    note: 'Dry rum sour with grapefruit and maraschino.',
    build: [['white_rum', 60], ['lime_juice', 30], ['grapefruit_juice', 40], ['maraschino', 15]] },

  // ---------------- Stirred & spirit-forward ----------------
  { id: 'old_fashioned', name: 'Old Fashioned', glass: 'rocks', method: 'stir', garnish: 'Orange peel',
    note: 'Whiskey, sugar and bitters, nothing hidden.',
    build: [['bourbon', 60], ['simple_syrup', 10], ['angostura', 2], ['orange_slice', 3]] },

  { id: 'manhattan', name: 'Manhattan', glass: 'coupe', method: 'stir', garnish: 'Brandied cherry',
    note: 'Rye, sweet vermouth, bitters and a cherry.',
    build: [['rye', 60], ['sweet_vermouth', 30], ['angostura', 2], ['cherry', 3]] },

  { id: 'negroni', name: 'Negroni', glass: 'rocks', method: 'stir', garnish: 'Orange peel',
    note: 'Equal parts gin, Campari and sweet vermouth.',
    build: [['gin', 30], ['campari', 30], ['sweet_vermouth', 30]] },

  { id: 'boulevardier', name: 'Boulevardier', glass: 'rocks', method: 'stir', garnish: 'Orange peel',
    note: 'The Negroni with bourbon in the gin chair.',
    build: [['bourbon', 45], ['campari', 30], ['sweet_vermouth', 30]] },

  { id: 'martini', name: 'Dry Martini', glass: 'martini', method: 'stir', garnish: 'Olive or lemon twist',
    note: 'Gin, a whisper of vermouth and an olive.',
    build: [['gin', 60], ['dry_vermouth', 10], ['olive', 3]] },

  { id: 'vesper', name: 'Vesper', glass: 'martini', method: 'shake', garnish: 'Lemon peel',
    note: 'Gin, vodka and Lillet, as ordered by Bond.',
    build: [['gin', 60], ['vodka', 15], ['lillet_blanc', 8]] },

  { id: 'sazerac', name: 'Sazerac', glass: 'rocks', method: 'stir', garnish: 'Lemon peel',
    note: 'New Orleans rye with an absinthe rinse.',
    build: [['rye', 50], ['sugar_cube', 4], ['peychauds', 3], ['absinthe', 2]] },

  { id: 'vieux_carre', name: 'Vieux Carré', glass: 'rocks', method: 'stir', garnish: 'Lemon peel, cherry',
    note: 'Rye, cognac and vermouth with a herbal Bénédictine hum.',
    build: [['rye', 30], ['cognac', 30], ['sweet_vermouth', 30], ['benedictine', 8], ['angostura', 2], ['peychauds', 2]] },

  // ---------------- Highballs, fizzes & built drinks ----------------
  { id: 'mojito', name: 'Mojito', glass: 'highball', method: 'build', garnish: 'Mint sprig',
    note: 'Rum, lime, mint and a little fizz.',
    build: [['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15], ['mint', 8], ['soda_water', 60]] },

  { id: 'moscow_mule', name: 'Moscow Mule', glass: 'copper-mug', method: 'build', garnish: 'Lime wedge',
    note: 'Vodka, lime and a flood of ginger beer.',
    build: [['vodka', 45], ['lime_juice', 15], ['ginger_beer', 120]] },

  { id: 'gin_tonic', name: 'Gin & Tonic', glass: 'highball', method: 'build', garnish: 'Lime wedge',
    note: 'Gin, cold tonic and a lime wedge.',
    build: [['gin', 50], ['tonic_water', 150], ['lime_juice', 5]] },

  { id: 'cuba_libre', name: 'Cuba Libre', glass: 'highball', method: 'build', garnish: 'Lime wedge',
    note: 'Rum, cola and a squeeze of lime.',
    build: [['white_rum', 50], ['cola', 120], ['lime_juice', 10]] },

  { id: 'tom_collins', name: 'Tom Collins', glass: 'highball', method: 'build', garnish: 'Lemon slice, cherry',
    note: 'Tall, bubbly gin lemonade.',
    build: [['gin', 45], ['lemon_juice', 30], ['simple_syrup', 15], ['soda_water', 60]] },

  { id: 'paloma', name: 'Paloma', glass: 'highball', method: 'build', garnish: 'Salt rim, grapefruit wedge',
    note: "Tequila and grapefruit soda, Mexico's favourite.",
    build: [['tequila', 50], ['lime_juice', 15], ['grapefruit_soda', 100], ['salt', 1]] },

  { id: 'dark_n_stormy', name: "Dark 'n' Stormy", glass: 'highball', method: 'build', garnish: 'Lime wedge',
    note: 'Dark rum floated over spicy ginger beer.',
    build: [['dark_rum', 60], ['ginger_beer', 100], ['lime_juice', 10]] },

  { id: 'el_diablo', name: 'El Diablo', glass: 'highball', method: 'build', garnish: 'Lime wedge',
    note: 'Tequila, cassis, lime and ginger beer.',
    build: [['tequila', 50], ['creme_de_cassis', 15], ['lime_juice', 15], ['ginger_beer', 100]] },

  { id: 'caipirinha', name: 'Caipirinha', glass: 'rocks', method: 'build', garnish: 'Lime wedge',
    note: "Brazil's cachaça, muddled with lime and sugar.",
    build: [['cachaca', 50], ['lime_juice', 20], ['simple_syrup', 15]] },

  { id: 'mint_julep', name: 'Mint Julep', glass: 'julep', method: 'build', garnish: 'Mint sprig',
    note: 'Bourbon over crushed ice and fresh mint.',
    build: [['bourbon', 60], ['simple_syrup', 15], ['mint', 15]] },

  { id: 'bramble', name: 'Bramble', glass: 'rocks', method: 'build', garnish: 'Blackberry, lemon slice',
    note: 'Gin sour with a blackberry liqueur drizzle.',
    build: [['gin', 40], ['lemon_juice', 15], ['simple_syrup', 10], ['blackberry_liqueur', 15]] },

  { id: 'pimms_cup', name: "Pimm's Cup", glass: 'highball', method: 'build', garnish: 'Cucumber, mint, orange',
    note: 'The English summer, tall and fruity.',
    build: [['pimms', 50], ['lemon_lime_soda', 100], ['cucumber', 4], ['mint', 4], ['orange_slice', 3]] },

  { id: 'americano', name: 'Americano', glass: 'highball', method: 'build', garnish: 'Orange slice',
    note: 'Campari and vermouth lengthened with soda.',
    build: [['campari', 30], ['sweet_vermouth', 30], ['soda_water', 60]] },

  { id: 'aperol_spritz', name: 'Aperol Spritz', glass: 'wine', method: 'build', garnish: 'Orange slice',
    note: 'The 3-2-1 pour: prosecco, Aperol, soda.',
    build: [['aperol', 60], ['prosecco', 90], ['soda_water', 30]] },

  { id: 'tequila_sunrise', name: 'Tequila Sunrise', glass: 'highball', method: 'build', garnish: 'Orange slice, cherry',
    note: 'Grenadine sinks to make the sunrise.',
    build: [['tequila', 45], ['orange_juice', 90], ['grenadine', 15]] },

  { id: 'sex_on_the_beach', name: 'Sex on the Beach', glass: 'highball', method: 'shake', garnish: 'Orange slice',
    note: 'Vodka, peach, orange and cranberry.',
    build: [['vodka', 40], ['peach_schnapps', 20], ['orange_juice', 40], ['cranberry_juice', 40]] },

  { id: 'bloody_mary', name: 'Bloody Mary', glass: 'highball', method: 'build', garnish: 'Celery stalk',
    note: 'Vodka, tomato, lemon and spice.',
    build: [['vodka', 45], ['tomato_juice', 90], ['lemon_juice', 15]] },

  // ---------------- Sparkling ----------------
  { id: 'french_75', name: 'French 75', glass: 'flute', method: 'shake', garnish: 'Lemon twist',
    note: 'Gin sour lifted with Champagne.',
    build: [['gin', 30], ['lemon_juice', 15], ['simple_syrup', 10], ['champagne', 60]] },

  { id: 'kir_royale', name: 'Kir Royale', glass: 'flute', method: 'build',
    note: 'Champagne with a splash of cassis.',
    build: [['champagne', 90], ['creme_de_cassis', 10]] },

  { id: 'mimosa', name: 'Mimosa', glass: 'flute', method: 'build', garnish: 'Orange slice',
    note: 'Champagne and orange juice, half and half.',
    build: [['champagne', 75], ['orange_juice', 75]] },

  // ---------------- Tiki & tropical ----------------
  { id: 'mai_tai', name: 'Mai Tai', glass: 'tiki', method: 'shake', garnish: 'Mint sprig, lime shell',
    note: 'Two rums, orgeat, orange and lime.',
    build: [['white_rum', 40], ['dark_rum', 20], ['triple_sec', 15], ['orgeat', 15], ['lime_juice', 20]] },

  { id: 'pina_colada', name: 'Piña Colada', glass: 'hurricane', method: 'blend', garnish: 'Pineapple wedge, cherry',
    note: 'Rum, coconut cream and pineapple.',
    build: [['white_rum', 50], ['coconut_cream', 30], ['pineapple_juice', 90]] },

  { id: 'jungle_bird', name: 'Jungle Bird', glass: 'tiki', method: 'shake', garnish: 'Pineapple wedge',
    note: 'Bitter Campari meets rum and pineapple.',
    build: [['dark_rum', 45], ['campari', 22], ['pineapple_juice', 45], ['lime_juice', 15], ['demerara_syrup', 10]] },

  { id: 'painkiller', name: 'Painkiller', glass: 'tiki', method: 'shake', garnish: 'Grated nutmeg',
    note: 'Rum, pineapple, orange and coconut.',
    build: [['dark_rum', 60], ['pineapple_juice', 90], ['orange_juice', 30], ['coconut_cream', 30]] },

  { id: 'pornstar_martini', name: 'Pornstar Martini', glass: 'martini', method: 'shake', garnish: 'Passion fruit half',
    note: 'Vodka and passion fruit with a prosecco side.',
    build: [['vodka', 40], ['passion_fruit', 30], ['simple_syrup', 10], ['prosecco', 30]] },

  // ---------------- Creamy & dessert ----------------
  { id: 'espresso_martini', name: 'Espresso Martini', glass: 'coupe', method: 'shake', garnish: 'Three coffee beans',
    note: 'Vodka, coffee liqueur and fresh espresso.',
    build: [['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['simple_syrup', 5]] },

  { id: 'french_martini', name: 'French Martini', glass: 'coupe', method: 'shake', garnish: 'Raspberry',
    note: 'Vodka, raspberry liqueur and pineapple foam.',
    build: [['vodka', 45], ['raspberry_liqueur', 15], ['pineapple_juice', 45]] },

  { id: 'white_russian', name: 'White Russian', glass: 'rocks', method: 'build',
    note: 'Vodka, coffee liqueur and cream over ice.',
    build: [['vodka', 50], ['coffee_liqueur', 20], ['heavy_cream', 30]] },

  { id: 'brandy_alexander', name: 'Brandy Alexander', glass: 'coupe', method: 'shake', garnish: 'Grated nutmeg',
    note: 'Cognac, chocolate and cream, a silky dessert.',
    build: [['cognac', 30], ['creme_de_cacao', 30], ['heavy_cream', 30]] },

  { id: 'grasshopper', name: 'Grasshopper', glass: 'coupe', method: 'shake', garnish: 'Mint leaf',
    note: 'Mint and chocolate cream in a green glass.',
    build: [['creme_de_menthe', 30], ['creme_de_cacao', 30], ['heavy_cream', 30]] },
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);
