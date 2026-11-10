/* ===== העוזר הגדול =====
   השלב השלישי. כשהאתר לא מצא שיעור, וגם המודל של גוגל לא ידע לענות,
   השאלה עוברת ל"העוזר שלי" - הפרויקט שנבנה בנפרד - והתשובה מוצגת
   כאן, בלי לצאת מהאתר.

   המנוע לא מועתק לכאן אלא מיובא משם. שני האתרים יושבים על אותו
   origin (itaydaniel1000-beep.github.io), אז ייבוא מודול עובד, וכל
   תיקון שנעשה שם - למשל ההמרה של אותיות רוסיות שדולפות לאמצע מילה
   עברית - מגיע גם לכאן בלי לעשות כלום. בפיתוח מקומי זה נכשל, כי שני
   השרתים על פורטים שונים; אז פשוט אין שלב שלישי, והאתר ממשיך לעבוד.

   מה שלא קורה כאן: טעינה מראש. המודל הזה שוקל בין 1 ל-4.3 ג'יגה-בייט,
   ואסור להוריד אותו למישהו שלא ביקש. הוא נטען רק כששואלים אותו ממש,
   ורק אם הוא כבר שמור בדפדפן - אחרת מוצג כפתור שאומר כמה זה שוקל. */

const BIGAI_SRC = "/BrawlClash/my-ai/brain.js";

/* ברירת מחדל אם אין העדפה שמורה. "חכם" ולא "מהיר": הקטן (1.7B) מייצר
   עברית שבורה - נבדק, והוא ענה על "מה זה מניה" בג'יבריש על מיני דובים. */
const BIGAI_DEFAULT = "normal";

const BIGAI_SYSTEM =
  "אתה עוזר שמסביר נושאי כסף לילדים בכיתות ג׳ עד ז׳, בעברית פשוטה.\n" +
  "ענה בעברית בלבד, בשתיים עד ארבע שורות, בלי כותרות ובלי רשימות.\n" +
  "אם אינך יודע, אמור זאת במשפט אחד במקום לנחש.";

let mod = null;          /* המודול המיובא */
let modTried = false;

async function bigaiModule() {
  if (mod || modTried) return mod;
  modTried = true;
  try {
    mod = await import(new URL(BIGAI_SRC, location.origin).href);
  } catch (err) {
    console.info("bigai: אין גישה למנוע של העוזר", String(err).slice(0, 120));
    mod = null;
  }
  return mod;
}

/* איזה מוח המשתמש בחר ב"העוזר שלי". localStorage משותף לכל הנתיבים
   באותו origin, אז ההעדפה שנקבעה שם תקפה גם כאן - ואם כבר הורידו
   מוח מסוים, נשתמש בו ולא נוריד אחר. */
function bigaiBrainKey() {
  try {
    const s = JSON.parse(localStorage.getItem("myai.v1") || "null");
    const k = s && s.settings && s.settings.brain;
    return k || BIGAI_DEFAULT;
  } catch (e) {
    return BIGAI_DEFAULT;
  }
}

window.BIGAI = {
  /* האם בכלל אפשר: יש מנוע, ויש כרטיס מסך שתומך */
  async available() {
    const m = await bigaiModule();
    if (!m) return false;
    try { return await m.gpuOk(); } catch (e) { return false; }
  },

  /* האם המודל כבר יושב בדפדפן. זה ההבדל בין לשאול מיד לבין לשאול
     רשות - הורדה של ג'יגה-בייט היא לא משהו שעושים בשקט. */
  async cached() {
    const m = await bigaiModule();
    if (!m) return false;
    try { return await m.isCached(bigaiBrainKey()); } catch (e) { return false; }
  },

  size() {
    const m = mod;
    if (!m) return null;
    const b = m.BRAINS[bigaiBrainKey()] || m.BRAINS[BIGAI_DEFAULT];
    return b ? b.gb : null;
  },

  /**
   * שואל ומחזיר תשובה, או null.
   *   onToken    - הטקסט המצטבר, לזרימה על המסך
   *   onProgress - שבר בין 0 ל-1 בזמן הטעינה
   */
  async ask(question, onToken, onProgress) {
    const m = await bigaiModule();
    if (!m) return null;

    try {
      if (m.brain.state !== "ready") {
        let off = null;
        if (onProgress) {
          off = m.brain.on(b => {
            if (b.state === "loading") onProgress(b.progress || 0);
          });
        }
        await m.loadBrain(bigaiBrainKey());
        if (off) off();
        if (m.brain.state !== "ready") return null;
      }

      const text = await m.chat(
        [{role: "system", content: BIGAI_SYSTEM},
         {role: "user", content: question}],
        {temperature: 0.5, maxTokens: 300, onText: onToken}
      );
      return (text || "").trim() || null;
    } catch (err) {
      console.error("bigai:", err);
      return null;
    }
  }
};
