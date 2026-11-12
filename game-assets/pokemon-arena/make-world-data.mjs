// Builds the raw data for the world mode from PokeAPI:
//   stats of every Pokémon, the damaging moves it learns by level, move details, evolution levels.
// Writes game-assets/pokemon-arena/world-raw.json; make-world-js.mjs turns it into pokemon/world-data.js.
// Run: node make-world-data.mjs
import fs from "node:fs";

const API = "https://pokeapi.co/api/v2";
const OUT = new URL("./world-raw.json", import.meta.url);
const N = 1025;

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error("failed " + url);
}

async function pool(items, size, fn) {
  let i = 0;
  const out = [];
  await Promise.all(Array.from({length: size}, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const STAT = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
const species = {};
let done = 0;
await pool(Array.from({length: N}, (_, i) => i + 1), 16, async dex => {
  const p = await get(`${API}/pokemon/${dex}`);
  const stats = STAT.map(s => (p.stats.find(x => x.stat.name === s) || {}).base_stat || 50);
  // level-up moves; take the newest game that lists any
  const byGame = {};
  for (const m of p.moves) {
    for (const d of m.version_group_details) {
      if (d.move_learn_method.name !== "level-up") continue;
      (byGame[d.version_group.name] = byGame[d.version_group.name] || []).push([d.level_learned_at, m.move.name]);
    }
  }
  const order = ["scarlet-violet", "sword-shield", "sun-moon", "ultra-sun-ultra-moon", "x-y", "omega-ruby-alpha-sapphire",
    "black-2-white-2", "black-white", "heartgold-soulsilver", "platinum", "diamond-pearl", "emerald", "firered-leafgreen",
    "ruby-sapphire", "crystal", "gold-silver", "yellow", "red-blue", "brilliant-diamond-and-shining-pearl", "legends-arceus",
    "lets-go-pikachu-lets-go-eevee", "the-isle-of-armor", "the-crown-tundra"];
  const game = order.find(g => byGame[g]) || Object.keys(byGame)[0];
  species[dex] = {stats, learn: (byGame[game] || []).sort((a, b) => a[0] - b[0])};
  if (++done % 100 === 0) console.log("pokemon", done);
});

// moves
const names = new Set();
Object.values(species).forEach(s => s.learn.forEach(([, m]) => names.add(m)));
console.log("unique moves", names.size);
const moves = {};
await pool([...names], 16, async name => {
  const m = await get(`${API}/move/${name}`);
  moves[name] = {type: m.type.name, power: m.power, acc: m.accuracy, cls: m.damage_class.name, pri: m.priority};
});

// evolution levels
const chains = (await get(`${API}/evolution-chain?limit=2000`)).results.map(r => r.url);
const evo = {};
const dexOf = url => Number(url.match(/\/(\d+)\/?$/)[1]);
await pool(chains, 16, async url => {
  const c = await get(url);
  const walk = node => {
    for (const ch of node.evolves_to) {
      const d = ch.evolution_details[0] || {};
      const from = dexOf(node.species.url);
      const e = evo[from] = evo[from] || {to: [], lvl: null};
      e.to.push(dexOf(ch.species.url));
      if (d.min_level && (!e.lvl || d.min_level < e.lvl)) e.lvl = d.min_level;
      walk(ch);
    }
  };
  walk(c.chain);
});

fs.writeFileSync(OUT, JSON.stringify({species, moves, evo}));
console.log("done", Object.keys(species).length, Object.keys(moves).length, Object.keys(evo).length);
