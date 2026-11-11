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

/* כל 1025 הפוקימונים נמצאים ב-pokedex.js (נוצר מנתוני PokeAPI).
   תמונות של ההתחלתיים, הבוס והחבילה הישנה שמורות בתיקייה art.
   את השאר טוענים מהמאגר הפתוח של PokeAPI. */
const LOCAL_ART = new Set([1, 4, 7, 10, 16, 19, 25, 37, 39, 43, 54, 63, 66, 74, 81, 92, 131, 133, 143, 147, 150]);
const ART_URL = n => LOCAL_ART.has(n)
  ? `art/${n}.png`
  : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${n}.png`;

const STARTERS = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee"];

const CONFIG = {
  maxPlayers: 5,
  slotHp: 20,          // מכונת התפיסה: כל 20 חיים של הפראי...
  slotStep: 5,         // ...מוסיפים 5 מספרים
  hpScale: 2,          // כל החיים מוכפלים - שהקרבות לא ייגמרו במכה אחת
  deckSize: 15,        // כמה פוקימונים פראיים נשלפים באקראי לחבילה בכל משחק
  clinicEvery: 5,      // מרפאה אחרי כל 5 פוקימונים פראיים
  catchGrowth: 0.8,    // כמה מהסיכוי החסר נוסף כשלפראי לא נשארו חיים
  catchMax: 0.95,
  boss: {
    id: "mewtwo",
    hpPerPlayer: 120,  // חיי הבוס = 120 × מספר השחקנים
    healBefore: true   // ביקור במרפאה לפני הקרב האחרון
  }
};
