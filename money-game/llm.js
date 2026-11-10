/* ===== ה-AI של גוגל, בתוך הדפדפן =====
   כרום החדש מגיע עם מודל של גוגל (Gemini Nano) מותקן בתוכו, וחושף
   אותו ל-JavaScript דרך LanguageModel. זה בדיוק מה שצריך לאתר הזה:
   מודל אמיתי של גוגל, בחינם, בלי מפתח, בלי חשבון ובלי שרת - ולכן
   אפשר לשים אותו באתר ציבורי בלי לחשוף שום דבר.

   מה שהיה כאן לפני: WebLLM הוריד מודל פתוח קטן לכרטיס המסך. הוא עבד,
   אבל העברית שלו נשברה - אין לו טוקנים עבריים, ולכן הוא איית מילים
   חתיכה-חתיכה. המודל של גוגל גדול ממנו בהרבה, וגם לא צריך להוריד
   ג'יגה-בייטים: הוא כבר על המחשב.

   ארבעה דברים שעושים אותו מהיר, לפי סדר ההשפעה:

   1. הוא לא צריך לדעת כלום. assistant.js מוצא את השיעור הרלוונטי
      ומגיש לו אותו כהקשר; תפקידו רק לנסח. ככה הוא גם לא ממציא, וגם
      יש לו פחות לייצר.
   2. התשובה המיידית מגיעה לפניו. המשתמש רואה תשובה מלאה תוך אפס
      זמן, והמודל מחליף אותה כשהוא מוכן. אין המתנה מורגשת.
   3. הוא נטען ברקע מהרגע שהדף נפתח, ולא כשנכנסים למסך העוזר.
   4. הרצת חימום אחת בסיום הטעינה, כי הגנרציה הראשונה תמיד איטית.

   היא גם מבחן: ראו LLM_PROBE למטה.

   בטלפון ובדפדפנים אחרים אין LanguageModel ולכן אין מודל. זה בסדר:
   התשובה המיידית היא תשובה שלמה בפני עצמה, לא מציין מקום. */

/* ---------- מבחן העברית ----------
   גוגל מתעדת תמיכה רשמית באנגלית, ספרדית ויפנית. עברית לא ברשימה,
   אבל המודל כן מנסה - ולכן אי אפשר לדעת מראש אם מה שייצא יהיה עברית
   או ג'יבריש. במקום להמר, שואלים אותו שאלה אחת בעברית בסיום הטעינה
   ומודדים את התשובה. רק אם היא עברית אמיתית הוא מקבל רשות לדבר.

   למה זה שווה את הטרחה: אם המודל ייתן ג'יבריש, הוא ייתן אותו מעל
   תשובה נכונה שהחיפוש כבר כתב בעברית תקינה - כלומר יקלקל משהו שעבד.
   השער הזה אומר שבמחשב שבו המודל לא מסתדר עם עברית, האתר פשוט
   מתנהג כמו לפני, ובלי שאף אחד יצטרך להחליט על זה ידנית. */
const LLM_PROBE = "ענה במשפט אחד קצר בעברית: מה זה חיסכון?";
const LLM_HEBREW_MIN = 0.8;   /* שיעור האותיות העבריות מכלל האותיות */

function llmHebrewShare(text) {
  const letters = String(text || "").match(/[A-Za-zא-ת]/g);
  /* פחות משמונה אותיות זה לא מדגם. "כן." היה מקבל 100% עברית בלי
     להוכיח שום דבר, ובתשובה אמיתית הוא ממילא קצר מכדי להיות שימושי. */
  if (!letters || letters.length < 8) return 0;
  const he = letters.filter(c => c >= "א" && c <= "ת").length;
  return he / letters.length;
}

/* ---------- זיכרון המבחן ----------
   המבחן עולה גנרציה מלאה - נמדד 4.25 שניות, מול 0.41 שניות שלוקח
   להעיר את המודל עצמו. כלומר רובו המוחלט של זמן ההמתנה הוא הוכחה
   חוזרת של מה שכבר הוכח במחשב הזה. לכן התוצאה נשמרת.

   היא לא נשמרת לנצח: גוגל מעדכנת את המודל, והעברית שלו יכולה
   להשתפר או להישבר. אחרי שבועיים בודקים מחדש. וכשהתשובה השמורה
   חיובית, המודל מוכרז מוכן מיד ונבדק שוב ברקע - מי שמקליד שאלה
   בשנייה הראשונה לא מחכה לאימות. */
const LLM_VERDICT_KEY = "kesef-hacham-llm-he";
const LLM_VERDICT_DAYS = 14;

function llmVerdictRead() {
  try {
    const v = JSON.parse(localStorage.getItem(LLM_VERDICT_KEY) || "null");
    if (!v || typeof v.ok !== "boolean" || typeof v.at !== "number") return null;
    return (Date.now() - v.at) / 86400000 < LLM_VERDICT_DAYS ? v : null;
  } catch (e) {
    /* גלישה פרטית, או אחסון חסום. פשוט נבחן כרגיל. */
    return null;
  }
}

function llmVerdictWrite(ok) {
  try {
    localStorage.setItem(LLM_VERDICT_KEY, JSON.stringify({ok: ok, at: Date.now()}));
  } catch (e) {}
}

/* מה שכל שאר הקוד רואה */
window.LLM = {
  state: "idle",     /* idle | loading | ready | unsupported | failed */
  progress: 0,
  label: "",
  onChange: null,
  ask: null
};

function llmSet(state, progress, label) {
  window.LLM.state = state;
  if (progress != null) window.LLM.progress = progress;
  if (label != null) window.LLM.label = label;
  if (typeof window.LLM.onChange === "function") {
    try { window.LLM.onChange(window.LLM); } catch (e) { console.error(e); }
  }
  /* הקובץ הזה הוא מודול ולכן הוא רץ אחרי DOMContentLoaded. מי שמחכה
     לו כבר ניסה לחפש את window.LLM ולא מצא, אז אירוע הוא הדרך היחידה
     שלא תלויה בסדר הטעינה. */
  window.dispatchEvent(new CustomEvent("llm-change", {detail: window.LLM}));
}

/* הוראת התפקיד בלבד. כלל ההיצמדות למידע עבר להודעה עצמה, כי יש שני
   מצבים: שאלה שהאתר מצא עליה חומר, ושאלה שלא. אותה שיחה משרתת את
   שניהם, וזה חוסך יצירת שיחה שנייה. */
const LLM_SYSTEM =
  "אתה עוזר שמסביר נושאי כסף לילדים בכיתות ג׳ עד ז׳, בעברית פשוטה.\n" +
  "ענה בעברית בלבד.\n" +
  "ענה בשתיים עד ארבע שורות, בלי כותרות ובלי רשימות.\n" +
  "אם אינך בטוח בעובדה, אל תמציא אותה.";

/* הוראת המערכת, עם מה שהאתר יודע מוטמע בתוכה. נבנית בזמן היצירה
   ולא בטעינת הקובץ, כי התוכן של האתר נטען אחרי המנוע. */
function llmSystem() {
  const guide = typeof window.asGuide === "function" ? window.asGuide() : "";
  const mem = typeof window.asSiteMemory === "function" ? window.asSiteMemory() : null;
  return [LLM_SYSTEM, guide, mem].filter(Boolean).join("\n\n");
}

let llmSession = null;
let llmArmed = false;

/* ---------- טעינה ---------- */

/* הפעלה אחרי מחווה של המשתמש.
   כשהמודל עוד לא ירד, כרום דורש שהבקשה תבוא מתוך לחיצה או הקלדה -
   אחרת create() נכשל ב-NotAllowedError. טעינה ברקע בפתיחת הדף היא
   בדיוק המצב הזה, אז במקרה כזה מחכים למחווה הראשונה. */
function llmArmGesture() {
  if (llmArmed) return;
  llmArmed = true;
  const go = () => {
    window.removeEventListener("pointerdown", go);
    window.removeEventListener("keydown", go);
    llmBoot(true);
  };
  window.addEventListener("pointerdown", go, {once: true});
  window.addEventListener("keydown", go, {once: true});
}

async function llmBoot(afterGesture) {
  if (!("LanguageModel" in self)) {
    llmSet("unsupported", 0, "הדפדפן הזה לא מגיע עם מודל של גוגל");
    return;
  }

  let avail;
  try {
    avail = await LanguageModel.availability();
  } catch (err) {
    console.error("llm availability:", err);
    llmSet("unsupported", 0, "אין גישה למודל");
    return;
  }

  if (avail === "unavailable") {
    llmSet("unsupported", 0, "המודל לא זמין במחשב הזה");
    return;
  }
  if (avail === "downloadable" && !afterGesture) {
    /* צריך מחווה כדי להתחיל להוריד. לא מציגים כלום בינתיים. */
    llmSet("unsupported", 0, "ממתין למחווה כדי להתחיל הורדה");
    llmArmGesture();
    return;
  }

  /* המודל כבר נבחן כאן ונכשל. אין טעם להעיר כמה ג'יגה-בייט לזיכרון
     רק כדי להגיע שוב לאותה מסקנה. */
  const verdict = llmVerdictRead();
  if (verdict && !verdict.ok) {
    llmSet("unsupported", 0, "המודל לא כותב עברית טובה במחשב הזה");
    return;
  }

  /* כשהמודל כבר על המחשב אין מה להודיע - הוא ייכנס תוך שבריר שנייה.
     פס התקדמות שמהבהב לרגע הוא רעש. */
  if (avail !== "available") llmSet("loading", 0, "מתחיל");

  /* ההורדה מנוהלת על ידי כרום, לא על ידינו, והיא יכולה לעמוד במקום
     ימים בלי לדווח ולו בייט אחד. פס שתקוע על 0% הוא הבטחה שאנחנו לא
     יכולים לקיים, אז אחרי 20 שניות בלי שום התקדמות מפסיקים להציג
     אותו. ההמתנה עצמה ממשיכה: אם ההורדה תתעורר, המודל עוד ידבר. */
  let sawProgress = false;
  const quiet = setTimeout(() => {
    if (!sawProgress && window.LLM.state === "loading") {
      llmSet("unsupported", 0, "ההורדה של גוגל עוד לא התקדמה");
    }
  }, 20000);

  try {
    const t0 = performance.now();
    llmSession = await LanguageModel.create({
      initialPrompts: [{role: "system", content: llmSystem()}],
      monitor(m) {
        m.addEventListener("downloadprogress", ev => {
          /* loaded מגיע כשבר בין 0 ל-1 */
          sawProgress = true;
          llmSet("loading", ev.loaded, "מוריד");
        });
      }
    });
    clearTimeout(quiet);

    /* כבר הוכח כאן שהוא יודע עברית. מכריזים מוכן מיד, והאימות רץ
       ברקע - ככה אף אחד לא מחכה 4 שניות להוכחה חוזרת. */
    if (verdict && verdict.ok) {
      console.info("llm: מוכן תוך " + Math.round(performance.now() - t0) +
                   "ms (המבחן כבר נעשה כאן, נבדק שוב ברקע)");
      llmSet("ready", 1, "מוכן");
      llmRecheck();
      return;
    }

    /* חימום ומבחן בבת אחת. הגנרציה הראשונה כוללת הקצאות שמתבצעות פעם
       אחת בלבד, אז עושים אותה כאן בזמן שאף אחד לא מחכה - ובדרך גם
       בודקים אם מה שיוצא זו בכלל עברית. */
    const probe = await llmSession.prompt(LLM_PROBE);
    const share = llmHebrewShare(probe);
    llmVerdictWrite(share >= LLM_HEBREW_MIN);
    if (share < LLM_HEBREW_MIN) {
      console.info("llm: העברית של המודל לא עברה את המבחן (" +
                   Math.round(share * 100) + "%):", probe);
      llmSession.destroy();
      llmSession = null;
      llmSet("unsupported", 0, "המודל לא כותב עברית טובה במחשב הזה");
      return;
    }

    /* נרשם גם כשהוא עובר, לא רק כשהוא נכשל. בלי זה אין שום דרך לראות
       מה המודל באמת כתב במחשב מסוים, והמבחן הופך לקופסה שחורה. */
    console.info("llm: עבר את מבחן העברית (" + Math.round(share * 100) +
                 "%) תוך " + Math.round(performance.now() - t0) + "ms:", probe.trim());
    llmSet("ready", 1, "מוכן");
  } catch (err) {
    clearTimeout(quiet);
    console.error("llm:", err);
    if (llmSession) { try { llmSession.destroy(); } catch (e) {} }
    llmSession = null;

    /* NotAllowedError פירושו שהגענו בלי מחווה. אפשר לתקן - מחכים
       ללחיצה הראשונה ומנסים שוב. */
    if (err && err.name === "NotAllowedError" && !afterGesture) {
      llmSet("unsupported", 0, "ממתין למחווה");
      llmArmGesture();
      return;
    }
    llmSet("failed", 0, "הטעינה נכשלה");
  }
}

/* אימות מאוחר, על סמך תשובה שמורה. רץ על עותק של השיחה כדי שהמבחן
   לא יישאר בהיסטוריה וידלוף לשאלה אמיתית. אם המודל התקלקל בעדכון -
   מכבים אותו ומוחקים את התשובה השמורה, והאתר חוזר להתנהג כמו קודם. */
async function llmRecheck() {
  if (!llmSession) return;
  let turn = null;
  try {
    turn = await llmSession.clone();
    const probe = await turn.prompt(LLM_PROBE);
    const share = llmHebrewShare(probe);
    if (share >= LLM_HEBREW_MIN) return;

    console.info("llm: המודל הפסיק לכתוב עברית טובה (" +
                 Math.round(share * 100) + "%), מכבים:", probe);
    llmVerdictWrite(false);
    if (llmSession) { llmSession.destroy(); llmSession = null; }
    llmSet("unsupported", 0, "המודל לא כותב עברית טובה במחשב הזה");
  } catch (err) {
    /* כישלון באימות הוא לא עילה לכבות משהו שעובד */
    console.error("llm recheck:", err);
  } finally {
    if (turn) { try { turn.destroy(); } catch (e) {} }
  }
}

/* ---------- שאלה ---------- */

/**
 * עונה על שאלה.
 *   question - שאלת המשתמש
 *   context  - הטקסט מהאתר שהחיפוש מצא, או ריק כשלא נמצא כלום
 *   onToken  - נקרא עם הטקסט המצטבר, לזרימה על המסך
 * מחזיר את התשובה המלאה, או null אם המודל לא זמין או שהתשובה נפסלה.
 *
 * כשיש הקשר הוא נצמד אליו ולא מוסיף כלום - התשובה נשענת על חומר
 * שנכתב ונבדק. כשאין, הוא עונה מהידע של עצמו: זה פחות אמין, ולכן
 * הממשק מסמן את ההבדל, אבל זה עדיף על "לא מצאתי" שמשאיר ילד בלי
 * שום תשובה.
 */
async function llmAnswer(question, context, onToken, history) {
  if (window.LLM.state !== "ready" || !llmSession) return null;

  const prompt = context
    ? "ענה אך ורק על סמך המידע הבא. אל תוסיף עובדות, מספרים או " +
      "דוגמאות שלא מופיעים בו.\n\nמידע:\n" + context + "\n\nשאלה: " + question
    : "ענה מהידע שלך, בפשטות ולעניין.\n\nשאלה: " + question;
  // כל שאלה רצה בשיחה נקייה, אז מה שנאמר קודם נכנס לתוך ההודעה עצמה
  const past = (history || []).map(m => (m.role === "user" ? "ילד: " : "עוזר: ") + m.content).join("\n");
  const full = past ? "השיחה עד עכשיו:\n" + past + "\n\n" + prompt : prompt;

  try {
    /* שיחה נפרדת לכל שאלה: ההקשר של שאלה אחת לא אמור לדלוף לשאלה
       הבאה, וגם ככה המודל מקבל את כל מה שהוא צריך בהודעה עצמה.
       clone() זול - הוא לא טוען את המודל מחדש. */
    const turn = await llmSession.clone();
    let text = "";
    try {
      for await (const chunk of turn.promptStreaming(full)) {
        /* כרום שינה את משמעות ה-chunk בדרך: בגרסאות מסוימות הוא
           הטקסט המצטבר, ובאחרות רק התוספת. ההבחנה היא אם הוא פותח
           במה שכבר יש לנו. */
        text = chunk.startsWith(text) && chunk.length >= text.length
          ? chunk
          : text + chunk;
        if (onToken) onToken(text);
      }
    } finally {
      turn.destroy();
    }

    text = text.trim();
    if (!text) return null;

    /* גם אחרי שהמבחן עבר, תשובה בודדת יכולה לצאת באנגלית - בעיקר
       כששאלו משהו שההקשר לא מכסה. מוטב לא להציג אותה בכלל. */
    if (llmHebrewShare(text) < LLM_HEBREW_MIN) {
      console.info("llm: תשובה לא בעברית, נפסלה:", text);
      return null;
    }
    return text;
  } catch (err) {
    console.error("llm answer:", err);
    return null;
  }
}

window.LLM.ask = llmAnswer;

/* נטען ברקע ברגע שהדפדפן פנוי, כדי שעד שייכנסו למסך העוזר הוא כבר
   יהיה מוכן.

   לא מחכים ל-load. הוא מגיע רק אחרי כל התמונות והקול של הדף, וזה
   מאוחר בהרבה ממה שצריך - הקובץ הזה הוא מודול ולכן ה-DOM ממילא
   מוכן כשהוא רץ. requestIdleCallback הוא מה ששומר שזה לא יתחרה
   בציור הדף, לא אירוע ה-load. */
function llmStart() {
  if (window.requestIdleCallback) {
    requestIdleCallback(() => llmBoot(false), {timeout: 2500});
  } else {
    setTimeout(() => llmBoot(false), 800);
  }
}

llmStart();
