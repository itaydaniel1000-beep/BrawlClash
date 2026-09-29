/**
 * מפיק הקלטה לכל שורה שאין לה אחת, בקולות נוירוניים עבריים.
 *
 * הרצה:
 *   node tools/make-voices.mjs --list            מה חסר, בלי להפיק
 *   node tools/make-voices.mjs                   מפיק את כל מה שחסר
 *   node tools/make-voices.mjs --movie budget    רק סרטון אחד
 *   node tools/make-voices.mjs --redo            מפיק מחדש רק מה שהכלי הזה יצר
 *
 * דורש:  pip install edge-tts
 *
 * השירות הוא ההקראה של דפדפן Edge. חינם, בלי מפתח ובלי הרשמה, ולא
 * נתקלנו בו במכסה: 25 בקשות רצופות עברו ב-90 שניות.
 *
 * (ניסינו קודם את Gemini TTS. הוא נשמע טוב אבל המכסה החינמית היא עשר
 *  בקשות ליום לכל מודל, כלומר עשרה ימים ל-200 שורות. לכן לא בשימוש.)
 *
 * אחרי ההרצה:
 *   node tools/rebuild-voice-manifest.mjs     כדי שהאתר יתחיל להשתמש בהן
 *   node tools/make-scripts.mjs               כדי לעדכן את מסמך התסריטים
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const voiceDir = path.join(root, "voice");

/* ---------- הקול של כל דמות ---------- */
const VOICES = {
  narrator: "he-IL-AvriNeural",   // גבר, ידידותי
  roni: "he-IL-HilaNeural",       // אישה, ידידותית
  shopper: "he-IL-HilaNeural",
  farmer: "he-IL-AvriNeural",
  shepherd: "he-IL-AvriNeural",
  shoemaker: "he-IL-AvriNeural",
  crowd: "he-IL-HilaNeural"
};

/* רישום של מה שהכלי הזה יצר. בלעדיו --redo היה עלול לדרוס הקלטות אמיתיות
   של אנשים, וזה בדיוק מה שקרה פעם אחת. */
const ledgerPath = path.join(voiceDir, "generated.json");
const ledger = fs.existsSync(ledgerPath)
  ? new Set(JSON.parse(fs.readFileSync(ledgerPath, "utf8")))
  : new Set();

/* ---------- השורות ---------- */
function loadCues() {
  const ctx = {console, Math, JSON, Number, String, Array, Object, Date};
  const noop = () => {};
  fs.readFileSync(path.join(root, "movie.js"), "utf8")
    .match(/^function (\w+)/gm).map(s => s.slice(9))
    .forEach(n => { ctx[n] = noop; });
  ctx.PAL = new Proxy({}, {get: () => "#000000"});
  ctx.MOVIE_W = 960;
  ctx.MOVIE_H = 540;
  ctx.document = {createElement: () => ({getContext: () => new Proxy({}, {get: () => noop})})};
  vm.createContext(ctx);

  const durations = path.join(root, "voice-durations.js");
  if (fs.existsSync(durations)) vm.runInContext(fs.readFileSync(durations, "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "movies.js"), "utf8"), ctx);

  const cues = [];
  vm.runInContext("extraMovies", ctx).forEach(movie => {
    movie.cues.forEach(c => cues.push({movie: movie.id, id: c.id, who: c.who, text: c.text}));
  });

  const engine = fs.readFileSync(path.join(root, "movie.js"), "utf8");
  const start = engine.indexOf("  cues: [");
  if (start !== -1) {
    const end = engine.indexOf("\n  ]", start);
    const block = engine.slice(engine.indexOf("[", start), end + 4);
    new Function(`return ${block};`)().forEach(c =>
      cues.push({movie: "money-basics", id: c.id, who: c.who || "narrator", text: c.text}));
  }
  return cues;
}

/* ---------- הפקה ---------- */

function speak(text, voice, dest) {
  const raw = dest + ".raw.mp3";
  execFileSync("python", ["-m", "edge_tts", "--voice", voice, "--text", text,
    "--write-media", raw], {stdio: "pipe"});

  if (!fs.existsSync(raw) || fs.statSync(raw).size === 0) {
    throw new Error("לא נוצר אודיו");
  }

  /* מאזנים עוצמה לאותה רמה של ההקלטות האמיתיות, וגוזרים רק שקט דיגיטלי.
     סף גבוה יותר היה חותך את ההברה הראשונה - ב-TTS אין רעש חדר להיפטר ממנו. */
  const filter =
    "silenceremove=start_periods=1:start_silence=0.15:start_threshold=-55dB:detection=rms," +
    "areverse," +
    "silenceremove=start_periods=1:start_silence=0.20:start_threshold=-55dB:detection=rms," +
    "areverse," +
    "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000";

  execFileSync("ffmpeg", ["-v", "error", "-i", raw, "-af", filter,
    "-c:a", "libmp3lame", "-b:a", "128k", "-ac", "1", "-y", dest]);
  fs.unlinkSync(raw);
}

/* ---------- ריצה ---------- */

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const redo = args.includes("--redo");
const movieArg = args.includes("--movie") ? args[args.indexOf("--movie") + 1] : null;

fs.mkdirSync(voiceDir, {recursive: true});
const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "oga", "webm", "aac", "flac"];
const onDisk = fs.readdirSync(voiceDir);
const has = id => onDisk.some(name => {
  const dot = name.lastIndexOf(".");
  return dot > 0 && name.slice(0, dot) === id && AUDIO_EXT.includes(name.slice(dot + 1).toLowerCase());
});

let cues = loadCues();
if (movieArg) cues = cues.filter(c => c.movie === movieArg);

/* --redo נוגע רק במה שהכלי יצר. הקלטה של אדם לעולם לא נדרסת. */
const todo = cues.filter(c => !has(c.id) || (redo && ledger.has(c.id)));
const protectedCount = redo ? cues.filter(c => has(c.id) && !ledger.has(c.id)).length : 0;

const byMovie = {};
todo.forEach(c => { byMovie[c.movie] = (byMovie[c.movie] || 0) + 1; });

console.log(`\nלהפקה: ${todo.length} שורות מתוך ${cues.length}`);
Object.entries(byMovie).forEach(([m, n]) => console.log(`   ${m.padEnd(16)} ${n}`));
if (protectedCount) console.log(`\n   ${protectedCount} הקלטות של אנשים - לא ייגעו בהן`);
console.log(`\nקולות: ` + [...new Set(Object.values(VOICES))].join("  "));
console.log(`זמן משוער: כ-${Math.ceil(todo.length * 3.6 / 60)} דקות\n`);

if (listOnly || !todo.length) process.exit(0);

let done = 0;
const failed = [];

for (const cue of todo) {
  const voice = VOICES[cue.who] || VOICES.narrator;
  process.stdout.write(`${cue.id.padEnd(22)} ${voice.replace("he-IL-", "").replace("Neural", "").padEnd(6)} `);
  try {
    speak(cue.text, voice, path.join(voiceDir, cue.id + ".mp3"));
    ledger.add(cue.id);
    done++;
    console.log("✅");
  } catch (e) {
    failed.push(cue.id);
    console.log("❌ " + String(e.message).split("\n")[0].slice(0, 90));
  }
}

fs.writeFileSync(ledgerPath, JSON.stringify([...ledger].sort(), null, 2));

console.log(`\nהופקו ${done} שורות.`);
if (failed.length) console.log(`נכשלו ${failed.length}: ${failed.join(", ")}`);
console.log(`\nעכשיו: node tools/rebuild-voice-manifest.mjs && node tools/make-scripts.mjs\n`);
