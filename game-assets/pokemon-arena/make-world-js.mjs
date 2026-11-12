// Turns world-raw.json + world-moves.json + moves-he.json into pokemon/world-data.js (compact).
// Run: node make-world-js.mjs
import fs from "node:fs";

const here = f => new URL("./" + f, import.meta.url);
const raw = JSON.parse(fs.readFileSync(here("world-raw.json")));
const keep = JSON.parse(fs.readFileSync(here("world-moves.json")));
const he = JSON.parse(fs.readFileSync(here("moves-he.json")));
const keepSet = new Set(keep);
const missing = keep.filter(m => !he[m]);
if (missing.length) { console.error("no hebrew for", missing); process.exit(1); }

// moves: key -> [hebrew, type, power, accuracy, physical?1:0, priority]
const moves = {};
keep.forEach(k => {
  const m = raw.moves[k];
  moves[k] = [he[k], m.type, m.power, m.acc || 100, m.cls === "physical" ? 1 : 0, m.pri || 0];
});

// cheapest move of each type, used when a Pokémon learns too few kept moves
const byType = {};
keep.forEach(k => {
  const t = moves[k][1];
  if (!byType[t] || moves[k][2] < moves[byType[t]][2]) byType[t] = k;
});

const pokedexSrc = fs.readFileSync(new URL("../../pokemon/pokedex.js", import.meta.url), "utf8");
const typesOf = {};
for (const m of pokedexSrc.matchAll(/dex: (\d+),[^\n]*?types: \[([^\]]*)\]/g)) {
  typesOf[m[1]] = m[2].replace(/"/g, "").split(",").map(s => s.trim());
}

const stats = {}, learn = {};
for (const [dex, s] of Object.entries(raw.species)) {
  stats[dex] = s.stats;
  const seen = new Set();
  let list = [];
  for (const [lvl, m] of s.learn) {
    if (!keepSet.has(m) || seen.has(m)) continue;
    seen.add(m);
    list.push([Math.max(1, lvl), m]);
  }
  if (list.length < 2) {
    const t = (typesOf[dex] || ["normal"])[0];
    if (!seen.has("tackle")) list.unshift([1, "tackle"]);
    if (byType[t] && !list.some(x => x[1] === byType[t])) list.push([5, byType[t]]);
  }
  learn[dex] = list.sort((a, b) => a[0] - b[0]);
}

const evo = {};
for (const [dex, e] of Object.entries(raw.evo)) evo[dex] = [e.lvl || 0, e.to];

const js = `/* ===== נתוני העולם =====
   נוצר אוטומטית מ-PokeAPI (game-assets/pokemon-arena/make-world-js.mjs). לא לערוך ביד.
   WMOVES:  מפתח -> [שם, סוג, עוצמה, דיוק, פיזי(1)/מיוחד(0), עדיפות]
   WSTATS:  מספר בפוקידקס -> [חיים, התקפה, הגנה, התקפה מיוחדת, הגנה מיוחדת, מהירות]
   WLEARN:  מספר בפוקידקס -> [[רמה, מתקפה], ...]
   WEVO:    מספר בפוקידקס -> [רמת התפתחות (0 = בלי רמה), [אל מי]] */
const WMOVES = ${JSON.stringify(moves)};
const WSTATS = ${JSON.stringify(stats)};
const WLEARN = ${JSON.stringify(learn)};
const WEVO = ${JSON.stringify(evo)};
`;
fs.writeFileSync(new URL("../../pokemon/world-data.js", import.meta.url), js);
console.log("bytes", js.length, "moves", keep.length);
