/**
 * מוריד קבצי הקלטה מרשימת קישורים ושומר אותם בשם המזהה הנכון.
 *
 * הרצה:
 *   node tools/fetch-voices.mjs urls.txt
 *
 * הקובץ urls.txt מכיל שורה לכל הקלטה, בפורמט:
 *   budget-01 https://speechgen.io/texttomp3/.../p_123_456.mp3
 *
 * הסקריפט מוריד, מוודא שזה באמת MP3, שומר ל-money-game/voice/,
 * ומעדכן את המניפסט בסוף. קובץ שכבר קיים מדולג.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const voiceDir = path.join(root, "voice");

const listFile = process.argv[2];
if (!listFile) {
  console.error("\n❌ חסר שם קובץ. דוגמה:  node tools/fetch-voices.mjs urls.txt\n");
  process.exit(1);
}

const force = process.argv.includes("--force");

const entries = fs
  .readFileSync(listFile, "utf8")
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith("#"))
  .map(line => {
    const [id, url] = line.split(/\s+/);
    return {id, url};
  })
  .filter(e => e.id && e.url);

if (!entries.length) {
  console.error("\n❌ לא נמצאו שורות תקינות בקובץ.\n");
  process.exit(1);
}

fs.mkdirSync(voiceDir, {recursive: true});

let saved = 0;
let skipped = 0;
const failed = [];

for (const {id, url} of entries) {
  const file = path.join(voiceDir, `${id}.mp3`);

  if (!force && fs.existsSync(file) && fs.statSync(file).size > 0) {
    skipped++;
    continue;
  }

  process.stdout.write(`⬇  ${id} … `);

  try {
    const buffer = await fetch(url, {headers: {"User-Agent": "Mozilla/5.0"}}).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });

    const bytes = Buffer.from(buffer);
    /* קובץ MP3 תקין מתחיל ב-ID3 או בסנכרון פריים */
    const looksLikeMp3 =
      bytes.slice(0, 3).toString("latin1") === "ID3" ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);

    if (!looksLikeMp3 || bytes.length < 2000) {
      failed.push(`${id} (לא נראה כמו MP3, ${bytes.length} בתים)`);
      console.log("❌ לא MP3");
      continue;
    }

    fs.writeFileSync(file, bytes);
    saved++;
    console.log(`${(bytes.length / 1024).toFixed(0)}KB`);
  } catch (error) {
    failed.push(`${id} (${error.message})`);
    console.log(`❌ ${error.message}`);
  }
}

console.log(`\n✅ נשמרו ${saved}, דולגו ${skipped}, נכשלו ${failed.length}.`);
failed.forEach(f => console.log(`   ❌ ${f}`));

/* עדכון המניפסט, כדי שהאתר יתחיל להשתמש בהקלטות מיד */
try {
  execFileSync("node", [path.join(here, "rebuild-voice-manifest.mjs")], {stdio: "inherit"});
} catch (error) {
  console.log("\n⚠️  הריצו ידנית:  node tools/rebuild-voice-manifest.mjs\n");
}
