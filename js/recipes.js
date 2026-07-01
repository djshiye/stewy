/* Stewy — classic cocktail templates
   Each recipe lists ingredient ids with amounts in ml (internal unit).
   `glass` and `note` are informational; `build` is loaded straight into the
   cauldron when a template is picked from the top bar. */
window.RECIPES = [
  { id: 'margarita', name: 'Margarita', emoji: '🍸', glass: 'Coupe',
    note: 'Tequila, orange, lime — salt the rim.',
    build: [['tequila', 50], ['triple_sec', 20], ['lime_juice', 25], ['salt', 1]] },

  { id: 'mojito', name: 'Mojito', emoji: '🌿', glass: 'Highball',
    note: 'Rum, lime, mint, a little fizz.',
    build: [['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15], ['mint', 8], ['soda_water', 60]] },

  { id: 'old_fashioned', name: 'Old Fashioned', emoji: '🥃', glass: 'Rocks',
    note: 'Whiskey, sugar, bitters — nothing hidden.',
    build: [['bourbon', 60], ['simple_syrup', 10], ['angostura', 2], ['orange_slice', 3]] },

  { id: 'negroni', name: 'Negroni', emoji: '🟥', glass: 'Rocks',
    note: 'Equal parts gin, Campari, sweet vermouth.',
    build: [['gin', 30], ['campari', 30], ['sweet_vermouth', 30]] },

  { id: 'daiquiri', name: 'Daiquiri', emoji: '🍈', glass: 'Coupe',
    note: 'The three-part rum sour benchmark.',
    build: [['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]] },

  { id: 'cosmopolitan', name: 'Cosmopolitan', emoji: '💗', glass: 'Coupe',
    note: 'Vodka, orange, cranberry, lime.',
    build: [['vodka', 40], ['triple_sec', 15], ['cranberry_juice', 30], ['lime_juice', 15]] },

  { id: 'martini', name: 'Dry Martini', emoji: '🫒', glass: 'Martini',
    note: 'Gin, a whisper of vermouth, an olive.',
    build: [['gin', 60], ['dry_vermouth', 10], ['olive', 3]] },

  { id: 'whiskey_sour', name: 'Whiskey Sour', emoji: '🍋', glass: 'Rocks',
    note: 'Bourbon, lemon, sugar, silky egg foam.',
    build: [['bourbon', 45], ['lemon_juice', 25], ['simple_syrup', 15], ['egg_white', 20]] },

  { id: 'mai_tai', name: 'Mai Tai', emoji: '🏝️', glass: 'Rocks',
    note: 'Two rums, orgeat, orange, lime.',
    build: [['white_rum', 40], ['dark_rum', 20], ['triple_sec', 15], ['orgeat', 15], ['lime_juice', 20]] },

  { id: 'moscow_mule', name: 'Moscow Mule', emoji: '🫙', glass: 'Copper Mug',
    note: 'Vodka, lime, a flood of ginger beer.',
    build: [['vodka', 45], ['lime_juice', 15], ['ginger_beer', 120]] },

  { id: 'aperol_spritz', name: 'Aperol Spritz', emoji: '🍊', glass: 'Wine',
    note: '3-2-1: prosecco, Aperol, soda.',
    build: [['aperol', 60], ['prosecco', 90], ['soda_water', 30]] },

  { id: 'pina_colada', name: 'Piña Colada', emoji: '🥥', glass: 'Hurricane',
    note: 'Rum, coconut cream, pineapple.',
    build: [['white_rum', 50], ['coconut_cream', 30], ['pineapple_juice', 90]] },

  { id: 'espresso_martini', name: 'Espresso Martini', emoji: '☕', glass: 'Coupe',
    note: 'Vodka, coffee liqueur, fresh espresso.',
    build: [['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['simple_syrup', 5]] },

  { id: 'manhattan', name: 'Manhattan', emoji: '🍒', glass: 'Coupe',
    note: 'Rye, sweet vermouth, bitters, cherry.',
    build: [['rye', 60], ['sweet_vermouth', 30], ['angostura', 2], ['cherry', 3]] },

  { id: 'gin_tonic', name: 'Gin & Tonic', emoji: '🫧', glass: 'Highball',
    note: 'Gin, cold tonic, a lime wedge.',
    build: [['gin', 50], ['tonic_water', 150], ['lime_juice', 5]] },

  { id: 'bloody_mary', name: 'Bloody Mary', emoji: '🍅', glass: 'Highball',
    note: 'Vodka, tomato, lemon, spice.',
    build: [['vodka', 45], ['tomato_juice', 90], ['lemon_juice', 15]] },

  { id: 'cuba_libre', name: 'Cuba Libre', emoji: '🥤', glass: 'Highball',
    note: 'Rum, cola, a squeeze of lime.',
    build: [['white_rum', 50], ['cola', 120], ['lime_juice', 10]] },

  { id: 'french_martini', name: 'French Martini', emoji: '💜', glass: 'Coupe',
    note: 'Vodka, raspberry-sweet, pineapple foam.',
    build: [['vodka', 45], ['peach_schnapps', 15], ['pineapple_juice', 45]] },
];

window.RECIPE_BY_ID = window.RECIPES.reduce((m, r) => { m[r.id] = r; return m; }, {});
