/**
 * סורק את תיקיית voice/ ובונה מחדש את manifest.json לפי ההקלטות שנמצאות בה.
 *
 * הרצה:  node tools/rebuild-voice-manifest.mjs
 *
 * לשימוש אחרי שמורידים קבצי MP3 מ-speechgen.io (או מכל מקור אחר)
 * ושומרים אותם בשם המזהה של השורה, למשל d01.mp3 או n07.mp3.
 * שורה בלי הקלטה תמשיך להיאמר בקול הדפדפן.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const voiceDir = path.join(root, "voice");

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

fs.mkdirSync(voiceDir, {recursive: true});

const cues = loadCues();
const found = [];
const missing = [];

cues.forEach(cue => {
  const file = path.join(voiceDir, `${cue.id}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) found.push(cue.id);
  else missing.push(cue.id);
});

fs.writeFileSync(
  path.join(voiceDir, "manifest.json"),
  JSON.stringify({source: "speechgen", lines: found}, null, 2)
);

console.log(`\n✅ נמצאו הקלטות ל-${found.length} מתוך ${cues.length} שורות.`);
if (found.length) console.log(`   מוקלט: ${found.join(", ")}`);
if (missing.length) console.log(`   קול דפדפן: ${missing.join(", ")}`);
console.log(`\n📄 ${path.join(voiceDir, "manifest.json")} עודכן. העלו לאוויר כדי לשמוע.\n`);
