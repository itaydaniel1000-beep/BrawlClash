/**
 * מוציא את רשימת כל השורות המדוברות בסרטון, עם שם הקובץ שכל אחת צריכה לקבל.
 *
 * הרצה:
 *   node tools/list-lines.mjs              רשימה קריאה למסך
 *   node tools/list-lines.mjs --text       רק הטקסטים, להדבקה ב-speechgen
 *   node tools/list-lines.mjs --who farmer רק דובר מסוים
 *
 * אחרי שמפיקים קבצי MP3 באתר, שומרים אותם בתוך money-game/voice/
 * בשם המדויק שמופיע כאן (למשל d01.mp3), ומריצים:
 *   node tools/rebuild-voice-manifest.mjs
 *
 * כל שורה בלי הקלטה תמשיך להיאמר בקול הדפדפן, אז אפשר להקליט רק חלק.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const SPEAKER_LABEL = {
  narrator: "קריין",
  farmer: "האיכר",
  shepherd: "הרועה",
  shoemaker: "הסנדלר",
  crowd: "הקהל",
  shopper: "הקונה"
};

/* קורא את הרפליקות מכל הסרטונים - movie.js וגם movies.js */
function loadCues() {
  const cues = [];

  const engine = fs.readFileSync(path.join(root, "movie.js"), "utf8");
  const start = engine.indexOf("  cues: [");
  if (start !== -1) {
    const end = engine.indexOf("\n  ]", start);
    const block = engine.slice(engine.indexOf("[", start), end + 4);
    new Function(`return ${block};`)().forEach(c => cues.push(Object.assign({movie: "money-basics"}, c)));
  }

  /* שאר הסרטונים נבנים דרך buildMovie, אז שולפים את הסצנות ומריצים אותן */
  const extra = fs.readFileSync(path.join(root, "movies.js"), "utf8");
  const re = /buildMovie\("([a-z-]+)",\s*\[/g;
  let m;
  while ((m = re.exec(extra))) {
    const id = m[1];
    /* איתור סוגר המערך התואם */
    let depth = 0, i = extra.indexOf("[", m.index);
    const from = i;
    for (; i < extra.length; i++) {
      if (extra[i] === "[") depth++;
      else if (extra[i] === "]") { depth--; if (!depth) break; }
    }
    const body = extra.slice(from, i + 1);
    /* מחלצים רק את הטקסטים, לפי סדר הופעתם */
    const texts = body.match(/\{text: "([^"]+)"\}/g) || [];
    texts.forEach((t, n) => {
      cues.push({
        movie: id,
        id: `${id}-${String(n + 1).padStart(2, "0")}`,
        who: "narrator",
        text: t.match(/"([^"]+)"/)[1]
      });
    });
  }

  return cues;
}

const args = process.argv.slice(2);
const textOnly = args.includes("--text");
const whoArg = args.indexOf("--who");
const whoFilter = whoArg !== -1 ? args[whoArg + 1] : null;
const pendingOnly = args.includes("--pending");
const movieArg = args.indexOf("--movie");
const movieFilter = movieArg !== -1 ? args[movieArg + 1] : null;

let cues = loadCues();
if (whoFilter) cues = cues.filter(c => c.who === whoFilter);
if (movieFilter) cues = cues.filter(c => c.movie === movieFilter);

const voiceDir = path.join(root, "voice");
const have = new Set(
  fs.existsSync(voiceDir)
    ? fs.readdirSync(voiceDir).filter(f => f.endsWith(".mp3")).map(f => f.replace(/\.mp3$/, ""))
    : []
);

if (pendingOnly) cues = cues.filter(c => !have.has(c.id));

if (textOnly) {
  cues.forEach(c => console.log(c.text));
} else {
  const byWho = {};
  cues.forEach(c => {
    byWho[c.who] = byWho[c.who] || [];
    byWho[c.who].push(c);
  });

  console.log(`\nסך הכול ${cues.length} שורות, ${Object.keys(byWho).length} דוברים.\n`);

  Object.keys(byWho).forEach(who => {
    console.log(`── ${SPEAKER_LABEL[who] || who}  (${byWho[who].length} שורות) ──`);
    byWho[who].forEach(c => {
      const mark = have.has(c.id) ? "✔" : " ";
      console.log(`${mark} voice/${c.id}.mp3   ${c.text}`);
    });
    console.log("");
  });

  const chars = cues.reduce((n, c) => n + c.text.length, 0);
  if (pendingOnly) console.log(`חסרות הקלטה: ${cues.length} שורות  (${have.size} כבר מוקלטות)`);
  else console.log(`✔ = כבר יש הקלטה  (${have.size} מתוך ${cues.length})`);
  console.log(`סך התווים להקראה: ${chars}\n`);
}
