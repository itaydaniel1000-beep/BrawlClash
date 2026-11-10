/* ===== נתוני המשחק =====
   כל המספרים כאן אפשר לשנות בלי לגעת בלוגיקה.
   הסוגים וטבלת היתרונות לקוחים מסדרת המשחקים. */

const TYPES = {
  normal:   {he: "נורמלי",  icon: "⭐", color: "#a8a77a"},
  fire:     {he: "אש",      icon: "🔥", color: "#ee8130"},
  water:    {he: "מים",     icon: "💧", color: "#6390f0"},
  electric: {he: "חשמל",    icon: "⚡", color: "#e6bc12"},
  grass:    {he: "עשב",     icon: "🌿", color: "#7ac74c"},
  ice:      {he: "קרח",     icon: "❄️", color: "#6cc8c4"},
  fighting: {he: "לחימה",   icon: "👊", color: "#c22e28"},
  poison:   {he: "רעל",     icon: "☠️", color: "#a33ea1"},
  ground:   {he: "אדמה",    icon: "⛰️", color: "#c9a94a"},
  flying:   {he: "מעופף",   icon: "🪶", color: "#a98ff3"},
  psychic:  {he: "על-חושי", icon: "🔮", color: "#f95587"},
  bug:      {he: "חרק",     icon: "🐛", color: "#a6b91a"},
  rock:     {he: "סלע",     icon: "🪨", color: "#b6a136"},
  ghost:    {he: "רוח",     icon: "👻", color: "#735797"},
  dragon:   {he: "דרקון",   icon: "🐉", color: "#6f35fc"},
  dark:     {he: "אופל",    icon: "🌑", color: "#705746"},
  steel:    {he: "פלדה",    icon: "⚙️", color: "#9a9ab8"},
  fairy:    {he: "פיה",     icon: "🧚", color: "#d685ad"}
};

/* תוקף ← מגן: מכפיל. מה שלא כתוב הוא ×1 */
const TYPE_CHART = {
  normal:   {rock: .5, ghost: 0, steel: .5},
  fire:     {fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2},
  water:    {fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5},
  electric: {water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5},
  grass:    {fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5},
  ice:      {fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5},
  fighting: {normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5},
  poison:   {grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2},
  ground:   {fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2},
  flying:   {electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5},
  psychic:  {fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5},
  bug:      {fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5},
  rock:     {fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5},
  ghost:    {normal: 0, psychic: 2, ghost: 2, dark: .5},
  dragon:   {dragon: 2, steel: .5, fairy: 0},
  dark:     {fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5},
  steel:    {fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2},
  fairy:    {fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5}
};

/* dex = המספר בפוקידקס - לפיו נטענת התמונה
   hp = חיים בסיסיים (מוכפלים ב-CONFIG.hpScale)
   power = כמה חיים הוא מוריד בתקיפה רגילה (×1)
   catch = סיכוי התפיסה כשהוא בחיים מלאים */
const POKEMON = {
  // התחלתיים (catch - אם שחקן יוצא, הם חוזרים לחבילה כפראיים)
  bulbasaur:  {dex: 1, he: "בולבזאור",   types: ["grass", "poison"],   hp: 45,  power: 22, catch: .35},
  charmander: {dex: 4, he: "צ'רמנדר",    types: ["fire"],              hp: 39,  power: 20, catch: .35},
  squirtle:   {dex: 7, he: "סקווירטל",   types: ["water"],             hp: 44,  power: 17, catch: .35},
  pikachu:    {dex: 25, he: "פיקאצ'ו",    types: ["electric"],          hp: 35,  power: 18, catch: .35},
  eevee:      {dex: 133, he: "איווי",      types: ["normal"],            hp: 55,  power: 18, catch: .35},

  // פראיים בחבילה
  pidgey:     {dex: 16, he: "פידג'י",     types: ["normal", "flying"],  hp: 40,  power: 15, catch: .45},
  rattata:    {dex: 19, he: "ראטאטה",     types: ["normal"],            hp: 30,  power: 19, catch: .50},
  caterpie:   {dex: 10, he: "קטרפי",      types: ["bug"],               hp: 45,  power: 10, catch: .55},
  oddish:     {dex: 43, he: "אודיש",      types: ["grass", "poison"],   hp: 45,  power: 25, catch: .40},
  gastly:     {dex: 92, he: "גאסטלי",     types: ["ghost", "poison"],   hp: 30,  power: 33, catch: .30},
  jigglypuff: {dex: 39, he: "ג'יגליפאף",  types: ["normal", "fairy"],   hp: 115, power: 15, catch: .40},
  machop:     {dex: 66, he: "מאצ'ופ",     types: ["fighting"],          hp: 70,  power: 27, catch: .35},
  geodude:    {dex: 74, he: "ג'אודוד",    types: ["rock", "ground"],    hp: 40,  power: 27, catch: .35},
  psyduck:    {dex: 54, he: "פסיידאק",    types: ["water"],             hp: 50,  power: 22, catch: .40},
  vulpix:     {dex: 37, he: "וולפיקס",    types: ["fire"],              hp: 38,  power: 17, catch: .40},
  abra:       {dex: 63, he: "אברה",       types: ["psychic"],           hp: 25,  power: 35, catch: .30},
  magnemite:  {dex: 81, he: "מגנמייט",    types: ["electric", "steel"], hp: 25,  power: 32, catch: .35},
  dratini:    {dex: 147, he: "דרטיני",     types: ["dragon"],            hp: 41,  power: 21, catch: .25},
  snorlax:    {dex: 143, he: "סנורלקס",    types: ["normal"],            hp: 160, power: 37, catch: .15},
  lapras:     {dex: 131, he: "לאפרס",      types: ["water", "ice"],      hp: 130, power: 28, catch: .20},

  // הקרב האחרון
  mewtwo:     {dex: 150, he: "מיוטו",      types: ["psychic"],           hp: 106, power: 51}
};

const ART_URL = n => `art/${n}.png`;

const STARTERS = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee"];

const WILD_DECK = [
  "pidgey", "rattata", "caterpie", "oddish", "gastly", "jigglypuff", "machop",
  "geodude", "psyduck", "vulpix", "abra", "magnemite", "dratini", "snorlax", "lapras"
];

const CONFIG = {
  maxPlayers: 5,
  turnSeconds: 20,     // זמן לתור, להטלת קובייה ולבחירת פוקימון התחלתי
  hpScale: 2,          // כל החיים מוכפלים - שהקרבות לא ייגמרו במכה אחת
  clinicEvery: 5,      // מרפאה אחרי כל 5 פוקימונים פראיים
  catchGrowth: 0.8,    // כמה מהסיכוי החסר נוסף כשלפראי לא נשארו חיים
  catchMax: 0.95,
  boss: {
    id: "mewtwo",
    hpPerPlayer: 120,  // חיי הבוס = 120 × מספר השחקנים
    healBefore: true   // ביקור במרפאה לפני הקרב האחרון
  }
};
