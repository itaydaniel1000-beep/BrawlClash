/**
 * בונה את מסמך תסריטי ההקלטה מתוך הסרטונים עצמם.
 *
 * הרצה:  node tools/make-scripts.mjs
 *
 * המסמך נוצר מהנתונים החיים - השורות, הדמויות והזמן שהוקצה לכל שורה -
 * ולכן הוא לא יכול להיות לא מסונכרן עם הסרטון. מריצים אותו אחרי כל
 * שינוי בטקסטים, ואחרי rebuild-voice-manifest.mjs כדי שיסמן מה כבר הוקלט.
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

/* מריצים את קבצי הסרטונים בארגז חול, עם פונקציות ציור מדומות.
   ככה הטקסטים והתזמונים מגיעים מהמקור ולא מפיענוח טקסטואלי. */
function loadMovies() {
  const ctx = {console, Math, JSON, Number, String, Array, Object, Date};
  const noop = () => {};
  const names = fs.readFileSync(path.join(root, "movie.js"), "utf8")
    .match(/^function (\w+)/gm).map(s => s.slice(9));
  names.forEach(n => { ctx[n] = noop; });
  ctx.PAL = new Proxy({}, {get: () => "#000000"});
  ctx.MOVIE_W = 960;
  ctx.MOVIE_H = 540;
  ctx.document = {createElement: () => ({getContext: () => new Proxy({}, {get: () => noop})})};

  vm.createContext(ctx);
  const durationsFile = path.join(root, "voice-durations.js");
  if (fs.existsSync(durationsFile)) {
    vm.runInContext(fs.readFileSync(durationsFile, "utf8"), ctx);
  }
  vm.runInContext(fs.readFileSync(path.join(root, "movies.js"), "utf8"), ctx);
  return vm.runInContext("extraMovies", ctx);
}

const TITLES = {
  "needs-wants": "צורך או רצון?",
  "budget": "בונים תקציב ראשון",
  "saving-habit": "הכלל של 50־30־20",
  "emergency-fund": "קרן חירום",
  "compound": "ריבית דריבית",
  "risk": "סיכון מול תשואה",
  "credit": "אשראי והלוואות",
  "smart-shopping": "מבצע או מלכודת?",
  "goals": "מציבים מטרה כספית"
};

const WHO = {narrator: "קריין", shopper: "הקונה", roni: "רוני"};

const movies = loadMovies();
const manifestPath = path.join(root, "voice", "manifest.json");
const recorded = fs.existsSync(manifestPath)
  ? new Set(JSON.parse(fs.readFileSync(manifestPath, "utf8")).lines)
  : new Set();

function clock(sec) {
  return Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");
}

const out = [];
out.push("# תסריטי ההקלטה — כסף חכם");
out.push("");
out.push("נוצר אוטומטית מ-`tools/make-scripts.mjs`. אל תערכו ביד — הריצו את הכלי מחדש.");
out.push("");

/* --- סיכום --- */
let totalLines = 0;
let totalDone = 0;
out.push("| סרטון | שורות | הוקלט | אורך |");
out.push("|---|---|---|---|");
movies.forEach(movie => {
  const done = movie.cues.filter(c => recorded.has(c.id)).length;
  const length = movie.shots.reduce((a, s) => a + s.duration, 0);
  totalLines += movie.cues.length;
  totalDone += done;
  out.push(`| ${TITLES[movie.id] || movie.id} | ${movie.cues.length} | ${done === movie.cues.length ? "✅ הכול" : done ? done + " מתוך " + movie.cues.length : "—"} | ${clock(length)} |`);
});
out.push(`| **סה״כ** | **${totalLines}** | **${totalDone}** | |`);
out.push("");

/* --- איך מקליטים --- */
out.push("## איך מקליטים");
out.push("");
out.push("- **קובץ נפרד לכל שורה**, בשם המזהה שבטבלה: `budget-01`, `budget-02` וכן הלאה.");
out.push("- כל פורמט שהדפדפן יודע לנגן מתקבל — mp3, m4a, wav, webm. ההמרה עליי.");
out.push("- שומרים ב-`money-game/voice/`.");
out.push("- חדר שקט, אותו מרחק מהמיקרופון בכל השורות, בלי מוזיקה ברקע.");
out.push("- **לא צריך לדייק באורך.** הסרטון מתתזמן לפי ההקלטה, לא להפך.");
out.push("- שורה בלי הקלטה פשוט ממשיכה בקול הדפדפן, אז אפשר להקליט בקצב שלכם.");
out.push("");
out.push("**אם יש שתי דמויות בסרטון** — עדיף ששני אנשים שונים יקליטו אותן, כדי");
out.push("שיישמע כמו שיחה. אפשר גם אחד, פשוט בקול אחר.");
out.push("");

/* --- תסריט לכל סרטון --- */
movies.forEach(movie => {
  const length = movie.shots.reduce((a, s) => a + s.duration, 0);
  const cast = [...new Set(movie.cues.map(c => c.who))].map(w => WHO[w] || w);

  out.push("---");
  out.push("");
  out.push(`## ${TITLES[movie.id] || movie.id}`);
  out.push("");
  out.push(`\`${movie.id}\` · ${movie.cues.length} שורות · ${clock(length)} · ${movie.shots.length} סצנות · ${cast.join(" + ")}`);
  out.push("");
  out.push("| קובץ | דמות | מה אומרים | פנוי |");
  out.push("|---|---|---|---|");

  movie.cues.forEach((cue, i) => {
    const next = movie.cues[i + 1] ? movie.cues[i + 1].t : length;
    const room = Math.round((next - cue.t) * 10) / 10;
    const mark = recorded.has(cue.id) ? " ✅" : "";
    out.push(`| \`${cue.id}\`${mark} | ${WHO[cue.who] || cue.who} | ${cue.text} | ${room.toFixed(1)} שנ׳ |`);
  });
  out.push("");
});

const dest = path.join(root, "voice", "תסריטי-הקלטה.md");
fs.writeFileSync(dest, out.join("\n") + "\n");

console.log(`\n📄 ${dest}`);
console.log(`   ${movies.length} סרטונים · ${totalLines} שורות · ${totalDone} כבר מוקלטות\n`);
