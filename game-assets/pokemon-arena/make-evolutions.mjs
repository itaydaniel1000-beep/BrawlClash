// Builds pokemon/evolutions.js from PokeAPI: for each Pokémon, the next stage it evolves into.
// When a Pokémon has several possible evolutions (Eevee), all of them are kept and the game picks one.
// Run: node make-evolutions.mjs <path to pokemon folder>
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
const dexOf = url => Number(url.match(/\/(\d+)\/?$/)[1]);

const list = await (await fetch("https://pokeapi.co/api/v2/evolution-chain?limit=2000")).json();
const urls = list.results.map(r => r.url);
const next = {};

function walk(node) {
  const from = dexOf(node.species.url);
  for (const child of node.evolves_to) {
    (next[from] = next[from] || []).push(dexOf(child.species.url));
    walk(child);
  }
}

let i = 0;
async function worker() {
  while (i < urls.length) {
    const url = urls[i++];
    for (let tryNo = 0; tryNo < 3; tryNo++) {
      try {
        const c = await (await fetch(url)).json();
        walk(c.chain);
        break;
      } catch (e) {
        if (tryNo === 2) console.error("failed", url);
      }
    }
  }
}
await Promise.all(Array.from({length: 12}, worker));

const keys = Object.keys(next).map(Number).sort((a, b) => a - b);
const body = keys.map(k => `  ${k}: [${next[k].sort((a, b) => a - b).join(", ")}]`).join(",\n");
const text = `/* ===== התפתחויות =====
   נוצר אוטומטית מנתוני PokeAPI (game-assets/pokemon-arena/make-evolutions.mjs).
   מספר בפוקידקס ← השלב הבא. כשיש כמה אפשרויות (כמו איווי) המשחק בוחר אחת. */
const EVOLVES_DEX = {
${body}
};
`;
fs.writeFileSync(path.join(out, "evolutions.js"), text);
console.log("chains", urls.length, "pokemon with an evolution", keys.length, "999 ->", next[999]);
