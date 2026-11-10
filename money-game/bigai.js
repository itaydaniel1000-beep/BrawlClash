/* ===== העוזר שלי, בתוך האתר =====
   זה המודל הראשי שעונה כאן. "העוזר שלי" הוא פרויקט נפרד, והמנוע שלו
   לא מועתק לכאן אלא מיובא משם: שני האתרים יושבים על אותו origin
   (itaydaniel1000-beep.github.io), אז ייבוא מודול עובד, וכל תיקון
   שנעשה שם מגיע גם לכאן בלי לעשות כלום - למשל ההמרה של אותיות
   רוסיות שהמודל מחליק לאמצע מילה עברית.

   בפיתוח מקומי שני השרתים על פורטים שונים, אז הייבוא נכשל. זה בסדר:
   המצב נהיה "unsupported", המודל של גוגל תופס את מקומו, והאתר עובד.

   הוא נטען לבד מרגע שהדף נפתח. ההורדה היא בין 1 ל-4.3 ג'יגה-בייט
   פעם אחת לדפדפן, ואחריה היא שמורה והטעינה לוקחת שניות.

   החוזה כאן זהה לזה של window.LLM בכוונה, כדי ש-assistant.js יוכל
   לקחת את מי שמוכן בלי לדעת מי זה. */

const BIGAI_SRC = "/BrawlClash/my-ai/brain.js";

/* ברירת מחדל אם אין העדפה שמורה. "חכם" (4B) ולא "מהיר" (1.7B):
   הקטן מייצר עברית שבורה - הוא ענה על "מה זה מניה" בג'יבריש חוזר
   על מיני דובים. */
const BIGAI_DEFAULT = "normal";

const BIGAI_SYSTEM =
  "אתה עוזר שמסביר נושאי כסף לילדים בכיתות ג׳ עד ז׳, בעברית פשוטה.\n" +
  "ענה בעברית בלבד, בשתיים עד ארבע שורות, בלי כותרות ובלי רשימות.\n" +
  "אם אינך יודע, אמור זאת במשפט אחד במקום לנחש.";

window.BIGAI = {
  state: "idle",     /* idle | loading | ready | unsupported | failed */
  progress: 0,
  label: "",
  ask: null
};

function bigSet(state, progress, label) {
  window.BIGAI.state = state;
  if (progress != null) window.BIGAI.progress = progress;
  if (label != null) window.BIGAI.label = label;
  window.dispatchEvent(new CustomEvent("bigai-change", {detail: window.BIGAI}));
}

let mod = null;
let modTried = false;

async function bigaiModule() {
  if (mod || modTried) return mod;
  modTried = true;
  try {
    mod = await import(new URL(BIGAI_SRC, location.origin).href);
  } catch (err) {
    console.info("bigai: אין גישה למנוע של העוזר —", String(err).slice(0, 110));
    mod = null;
  }
  return mod;
}

/* איזה מוח המשתמש בחר ב"העוזר שלי". localStorage משותף לכל הנתיבים
   באותו origin, אז ההעדפה שנקבעה שם תקפה כאן - ואם כבר הורידו מוח
   מסוים, נשתמש בו ולא נוריד אחר על חינם. */
function bigaiBrainKey() {
  try {
    const s = JSON.parse(localStorage.getItem("myai.v1") || "null");
    return (s && s.settings && s.settings.brain) || BIGAI_DEFAULT;
  } catch (e) {
    return BIGAI_DEFAULT;
  }
}

/* ---------- טעינה ---------- */

async function bigaiBoot() {
  const m = await bigaiModule();
  if (!m) {
    bigSet("unsupported", 0, "המנוע של העוזר לא זמין כאן");
    return;
  }

  try {
    if (!(await m.gpuOk())) {
      bigSet("unsupported", 0, "אין כאן כרטיס מסך שתומך");
      return;
    }
  } catch (e) {
    bigSet("unsupported", 0, "אין כאן כרטיס מסך שתומך");
    return;
  }

  const key = bigaiBrainKey();
  const gb = (m.BRAINS[key] || m.BRAINS[BIGAI_DEFAULT] || {}).gb;

  /* כשהמודל כבר שמור אין מה להודיע - הוא ייכנס תוך שניות. פס
     התקדמות מופיע רק כשבאמת מורידים ג'יגה-בייטים. */
  let cached = false;
  try { cached = await m.isCached(key); } catch (e) {}
  bigSet("loading", cached ? 0.9 : 0, cached ? "מתעורר" : "מוריד" + (gb ? " " + gb + " ג׳יגה" : ""));

  const off = m.brain.on(b => {
    if (b.state === "loading") {
      bigSet("loading", b.progress || 0,
             cached ? "מתעורר" : "מוריד" + (gb ? " " + gb + " ג׳יגה" : ""));
    }
  });

  try {
    await m.loadBrain(key);
  } catch (err) {
    console.error("bigai:", err);
  } finally {
    off();
  }

  if (m.brain.state === "ready") {
    await bigaiQualityTest();
    bigSet("ready", 1, "מוכן");
  }
  else if (m.brain.state === "unsupported") bigSet("unsupported", 0, m.brain.text || "");
  else bigSet("failed", 0, "הטעינה נכשלה");
}

/* ---------- מבחן איכות ----------
   מבחן צורה לא מספיק. המודל הזה מייצר עברית תקינה לגמרי שהיא שקר:
   "חיסכון זה התחלה למכור חפצים שמכירים" עובר כל בדיקת כתיב, לולאה
   ואלפבית - והוא שטות. לכן המבחן שואל שאלה שיש לה תשובה אחת ידועה.

   נמדד: על "כסף שמשאירים בצד לשימוש בעתיד נקרא ___" הוא ענה
   "קופון", ועל "תוכנית שמחליטה כמה כסף להוציא נקראת ___" הוא ענה
   "תנאי". המודל של גוגל ענה חיסכון ותקציב. מי שלא מכיר את אוצר
   המילים הזה לא יסביר אותו לילד.

   חלש זה לא כבוי: הוא עדיין עונה כשאין אחר, פשוט לא ראשון. ואם
   יום אחד ירוץ כאן מוח גדול יותר שעובר - הוא יחזור להיות ראשון
   לבד, בלי שאף אחד יחליט את זה ביד. */
const BIGAI_EXAM = [
  {q: "השלם במילה אחת: כסף שמשאירים בצד לשימוש בעתיד נקרא ___",
   ok: ["חיסכון", "חסכון", "לחסוך"]},
  {q: "השלם במילה אחת: תוכנית שמחליטה מראש כמה כסף להוציא על כל דבר נקראת ___",
   ok: ["תקציב"]}
];

async function bigaiQualityTest() {
  window.BIGAI.poor = false;
  const m = mod;
  if (!m) return;

  const broken = window.asLooksBroken || (t => String(t || "").trim().length < 10);
  let passed = 0;
  for (const item of BIGAI_EXAM) {
    try {
      const a = await m.chat(
        [{role: "system", content: BIGAI_SYSTEM}, {role: "user", content: item.q}],
        {temperature: 0.3, maxTokens: 80});
      const t = (a || "").trim();
      const good = !broken(t) && item.ok.some(w => t.includes(w));
      if (good) passed++;
      console.info("bigai: מבחן — " + (good ? "עבר" : "נכשל") + ":", t.slice(0, 80));
    } catch (err) {
      console.error("bigai exam:", err);
      return;   /* תקלה היא לא כישלון במבחן */
    }
  }

  window.BIGAI.poor = passed < BIGAI_EXAM.length;
  console.info("bigai: " + passed + "/" + BIGAI_EXAM.length +
               (window.BIGAI.poor ? " — עונה שני" : " — עונה ראשון"));
}

/* ---------- שאלה ---------- */

/**
 * עונה על שאלה. אותה חתימה כמו window.LLM.ask בדיוק.
 *   context - הטקסט מהאתר כשנמצא, או ריק כשלא
 */
async function bigaiAnswer(question, context, onToken) {
  if (window.BIGAI.state !== "ready") return null;
  const m = mod;
  if (!m) return null;

  const prompt = context
    ? "ענה אך ורק על סמך המידע הבא. אל תוסיף עובדות, מספרים או " +
      "דוגמאות שלא מופיעים בו.\n\nמידע:\n" + context + "\n\nשאלה: " + question
    : "ענה מהידע שלך, בפשטות ולעניין.\n\nשאלה: " + question;

  try {
    const text = await m.chat(
      [{role: "system", content: BIGAI_SYSTEM}, {role: "user", content: prompt}],
      {temperature: 0.5, maxTokens: 300, onText: onToken}
    );
    return (text || "").trim() || null;
  } catch (err) {
    console.error("bigai answer:", err);
    return null;
  }
}

window.BIGAI.ask = bigaiAnswer;

/* נטען ברקע ברגע שהדפדפן פנוי. requestIdleCallback שומר שההורדה לא
   תתחרה בציור הדף עצמו. */
function bigaiStart() {
  if (window.requestIdleCallback) {
    requestIdleCallback(() => bigaiBoot(), {timeout: 3000});
  } else {
    setTimeout(bigaiBoot, 1200);
  }
}

bigaiStart();
