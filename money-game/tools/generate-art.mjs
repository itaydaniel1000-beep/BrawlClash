/**
 * מייצר את הגרפיקה של הסרטון בעזרת Gemini.
 *
 * הרצה:
 *   node tools/generate-art.mjs --ref        רק גיליון הדמויות (שלב ראשון, חובה)
 *   node tools/generate-art.mjs              כל השוטים החסרים
 *   node tools/generate-art.mjs --only 3,7   שוטים מסוימים בלבד
 *   node tools/generate-art.mjs --force      הפקה מחדש של הכול
 *
 * דורש:  GEMINI_API_KEY=...   (או קובץ tools/.env עם השורה הזאת)
 *
 * הקבצים נשמרים ל-money-game/art/ ונרשמים ב-art/manifest.json.
 * הסקריפט מדלג על קבצים קיימים כדי לא לבזבז מכסה.
 *
 * שיטת העבודה: קודם מייצרים "גיליון דמויות" אחד עם הינשוף ומובי,
 * ואז כל שוט מיוצר כשהגיליון מצורף כתמונת ייחוס. זה מה שמחזיק
 * את הדמויות דומות לעצמן לאורך כל הסרטון.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const artDir = path.join(root, "art");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-image";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/* ---------- מפתח ---------- */

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();

  const envFile = path.join(here, ".env");
  if (fs.existsSync(envFile)) {
    const line = fs
      .readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .find(l => l.trim().startsWith("GEMINI_API_KEY="));
    if (line) return line.split("=").slice(1).join("=").trim();
  }

  throw new Error(
    "חסר GEMINI_API_KEY. הוסיפו אותו לקובץ money-game/tools/.env בשורה:\n" +
      "  GEMINI_API_KEY=המפתח_שלך"
  );
}

/* ---------- סגנון אחיד לכל התמונות ---------- */

const STYLE =
  "Flat vector cartoon illustration for a children's educational explainer video. " +
  "Bold thick black outlines on every shape. Flat solid colors, no gradients, no texture, no shading. " +
  "Simple clean uncluttered composition. Friendly and bright. " +
  "16:9 widescreen. No text, no letters, no numbers, no words anywhere in the image.";

const CHARACTERS =
  "The owl is a plump round teacher owl with warm tan-brown feathers, a cream belly, " +
  "two small ear tufts, very large round white eyes with big black pupils, and a small orange triangular beak. " +
  "The mouse is a small light-grey cartoon mouse with a cream belly, two very large round ears with pink inner ears, " +
  "a pink nose, black whiskers, big friendly eyes, and a long curly tail. " +
  "They are friends: the owl explains things, the mouse is curious.";

/* ---------- גיליון הדמויות ---------- */

const REFERENCE_PROMPT =
  `${STYLE} A character reference sheet showing two cartoon characters standing side by side ` +
  `on a plain white background, full body, facing the viewer. ${CHARACTERS} ` +
  `Nothing else in the image.`;

/* ---------- 15 השוטים ---------- */

const SHOTS = [
  "The owl teacher stands on the left and the curious mouse stands on the right in a simple classroom. " +
    "Between and behind them is a large presentation board showing a single big gold coin and a large red question mark. " +
    "The mouse looks puzzled and is raising one paw as if asking a question.",

  "An illustration of an ancient world long before money existed: on the left a farmer holding a basket of red apples, " +
    "on the right a shepherd holding a wheel of yellow cheese, standing on green grass under a plain sky. No coins anywhere.",

  "The owl teacher on the left and the mouse on the right in the classroom. The board behind them shows a red apple " +
    "on one side and a yellow cheese on the other, with a simple straight line connecting them. The owl has a wing raised, explaining.",

  "Two villagers trading directly with each other on green grass: the farmer hands a red apple across to the shepherd " +
    "while the shepherd hands a wheel of yellow cheese back the other way. Both are smiling. A big green checkmark floats above them.",

  "The owl teacher and the curious mouse in the classroom, both looking happy. The board behind them shows one very large " +
    "green checkmark. The mouse is jumping with excitement, both paws up.",

  "The owl teacher and the mouse in the classroom, the mood slightly more serious. The board behind them shows a red apple " +
    "on one side, a brown leather shoe on the other, and a large red X between them.",

  "A farmer on the left holds up a red apple offering it. A shoemaker on the right frowns and refuses, with a big red X between them. " +
    "Above the shoemaker's head is a white thought bubble containing a silver fish. Green grass, plain background.",

  "Four villagers standing in a row on green grass, each holding a different item above their head: apples, a leather shoe, " +
    "a silver fish, and a wheel of cheese. Between each neighbouring pair floats a large red X. Everyone looks disappointed.",

  "The owl teacher and the mouse in the classroom, both excited. The board behind them shows a glowing yellow lightbulb " +
    "with rays around it, and below it a single pretty scallop seashell.",

  "Four happy villagers standing in a row on green grass, each holding up one scallop seashell. " +
    "A green checkmark floats above each villager. Everyone is smiling and nodding.",

  "A close view of shiny round gold metal coins on a plain warm background: one very large coin in the centre " +
    "and two smaller coins floating on either side. Clean and simple.",

  "On the left a tall heavy stack of gold coins. On the right a single light paper banknote floating in the air. " +
    "A thick black arrow points from the heavy stack of coins toward the light floating banknote.",

  "Modern digital money on a dark blue background: a blue bank card on the left and a smartphone with a bright green glowing screen " +
    "on the right, with simple glowing rings radiating from the phone to show a payment being sent.",

  "The owl teacher on the left with a wing raised, concluding the lesson, and the mouse on the right listening carefully. " +
    "The board behind them shows one paper banknote in the centre.",

  "The owl teacher on the left and the mouse on the right, both pointing up at the board with a happy expression. " +
    "The board behind them shows a paper banknote in the centre with two small smiling people standing on either side of it, " +
    "and thin glowing golden lines connecting each person to the banknote."
];

/* ---------- קריאה ל-API ---------- */

async function generateImage(key, prompt, referenceB64) {
  const parts = [{text: prompt}];

  if (referenceB64) {
    parts.unshift({
      inlineData: {mimeType: "image/png", data: referenceB64}
    });
    parts.push({
      text:
        "Use the two characters from the attached reference sheet exactly as they appear there - " +
        "same shapes, same colors, same proportions - so they stay recognisable across the whole series."
    });
  }

  const response = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      contents: [{role: "user", parts}],
      generationConfig: {responseModalities: ["IMAGE", "TEXT"]}
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini החזיר ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  const imagePart =
    candidate &&
    candidate.content &&
    candidate.content.parts &&
    candidate.content.parts.find(p => p.inlineData && p.inlineData.data);

  if (!imagePart) {
    throw new Error("לא התקבלה תמונה בתשובה. ייתכן שהבקשה נחסמה או שהמודל אינו זמין למפתח הזה.");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

/* ---------- ריצה ---------- */

async function main() {
  const key = loadKey();
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const refOnly = args.includes("--ref");

  const onlyArg = args.indexOf("--only");
  const only =
    onlyArg !== -1 && args[onlyArg + 1]
      ? args[onlyArg + 1].split(",").map(n => parseInt(n, 10))
      : null;

  fs.mkdirSync(artDir, {recursive: true});
  const refPath = path.join(artDir, "characters.png");

  /* שלב 1 - גיליון הדמויות */
  if (force || !fs.existsSync(refPath)) {
    console.log("🎨 מייצר גיליון דמויות…");
    fs.writeFileSync(refPath, await generateImage(key, REFERENCE_PROMPT));
    console.log(`   נשמר: ${refPath}\n`);
  } else {
    console.log("✔ גיליון הדמויות כבר קיים\n");
  }

  if (refOnly) {
    console.log("עצרתי אחרי גיליון הדמויות. הסתכלו עליו, ואם הוא טוב הריצו שוב בלי --ref.\n");
    return;
  }

  const reference = fs.readFileSync(refPath).toString("base64");

  /* שלב 2 - השוטים */
  let made = 0;
  let skipped = 0;

  for (let i = 0; i < SHOTS.length; i++) {
    const num = i + 1;
    if (only && !only.includes(num)) continue;

    const file = path.join(artDir, `shot-${String(num).padStart(2, "0")}.png`);
    if (!force && fs.existsSync(file)) {
      skipped++;
      continue;
    }

    process.stdout.write(`🎬 שוט ${num}/${SHOTS.length} … `);
    try {
      const image = await generateImage(key, `${STYLE} ${CHARACTERS} ${SHOTS[i]}`, reference);
      fs.writeFileSync(file, image);
      made++;
      console.log(`${(image.length / 1024).toFixed(0)}KB`);
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }

    /* מרווח קטן כדי לא להיתקל בהגבלת קצב */
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  /* מניפסט - האתר קורא אותו כדי לדעת אילו תמונות קיימות */
  const available = [];
  for (let i = 1; i <= SHOTS.length; i++) {
    const name = `shot-${String(i).padStart(2, "0")}.png`;
    if (fs.existsSync(path.join(artDir, name))) available.push(i);
  }

  fs.writeFileSync(
    path.join(artDir, "manifest.json"),
    JSON.stringify({model: MODEL, shots: available}, null, 2)
  );

  console.log(`\n✅ הופקו ${made}, דולגו ${skipped}. יש תמונות ל-${available.length} מתוך ${SHOTS.length} שוטים.`);
  console.log(`📁 ${artDir}\n`);
}

main().catch(error => {
  console.error(`\n❌ ${error.message}\n`);
  process.exit(1);
});
