/**
 * סורק את תיקיית art/ ובונה מחדש את manifest.json לפי הקבצים שנמצאים בה.
 *
 * הרצה:  node tools/rebuild-art-manifest.mjs
 *
 * לשימוש כשמשיגים את התמונות מאיפשהו אחר - ג'מיני באתר, כלי אחר,
 * או ציור ידני. פשוט שומרים קבצים בשם shot-01.png … shot-15.png
 * בתוך money-game/art/ ומריצים את הסקריפט. שוט בלי תמונה ימשיך
 * להיות מצויר בקוד, אז אפשר להחליף גם רק חלק מהשוטים.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const artDir = path.join(here, "..", "art");
const TOTAL_SHOTS = 15;

if (!fs.existsSync(artDir)) {
  console.error(`\n❌ אין תיקייה ${artDir}\n`);
  process.exit(1);
}

const found = [];
const missing = [];

for (let i = 1; i <= TOTAL_SHOTS; i++) {
  const name = `shot-${String(i).padStart(2, "0")}.png`;
  const file = path.join(artDir, name);

  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    found.push(i);
  } else {
    missing.push(i);
  }
}

fs.writeFileSync(
  path.join(artDir, "manifest.json"),
  JSON.stringify({model: "manual", shots: found}, null, 2)
);

console.log(`\n✅ נמצאו תמונות ל-${found.length} מתוך ${TOTAL_SHOTS} שוטים.`);
if (found.length) console.log(`   עם תמונה: ${found.join(", ")}`);
if (missing.length) console.log(`   מצוירים בקוד: ${missing.join(", ")}`);
console.log(`\n📄 ${path.join(artDir, "manifest.json")} עודכן.`);
console.log("העלו לאוויר כדי לראות את התוצאה.\n");
