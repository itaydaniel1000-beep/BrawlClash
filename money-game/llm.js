/* ===== מודל שפה אמיתי, בתוך הדפדפן =====
   WebLLM מריץ מודל על כרטיס המסך דרך WebGPU. בלי שרת, בלי מפתח,
   בלי חשבון - ולכן אפשר לשים אותו באתר ציבורי בלי לחשוף שום דבר.

   ארבעה דברים שעושים אותו מהיר, לפי סדר ההשפעה:

   1. הוא לא צריך לדעת כלום. assistant.js מוצא את השיעור הרלוונטי
      ומגיש לו אותו כהקשר; תפקידו רק לנסח. מודל קטן גרוע בלזכור
      עובדות וסביר בלנסח טקסט שנתנו לו, אז זה גם מדויק יותר וגם קצר
      יותר לייצר.
   2. התשובה המיידית מגיעה לפניו. המשתמש רואה תשובה מלאה תוך
      אפס זמן, והמודל מחליף אותה כשהוא מוכן. אין המתנה מורגשת.
   3. הוא נטען ברקע מהרגע שהדף נפתח, ולא כשנכנסים למסך העוזר.
   4. הרצת חימום אחת בסיום הטעינה, כי הגנרציה הראשונה תמיד איטית.

   בטלפון אין WebGPU ולכן אין מודל. זה בסדר: התשובה המיידית היא
   תשובה שלמה בפני עצמה, לא מציין מקום. */

const LLM_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const LLM_CDN = "https://esm.run/@mlc-ai/web-llm";

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

const LLM_SYSTEM =
  "אתה עוזר שמסביר נושאי כסף לילדים בכיתות ג׳ עד ז׳, בעברית פשוטה.\n" +
  "ענה אך ורק על סמך המידע שמופיע תחת \"מידע\". אל תמציא עובדות, " +
  "מספרים או דוגמאות שלא מופיעים שם.\n" +
  "אם המידע לא עונה על השאלה, אמור שאינך יודע.\n" +
  "ענה בשתיים עד ארבע שורות, בלי כותרות ובלי רשימות.";

let llmEngine = null;
let llmTries = 0;

/* WebGPU מוותר על המכשיר כשהטאב מוסתר, ואז הטעינה נופלת עם
   "A valid external Instance reference no longer exists". לכן לא
   מתחילים לפני שהדף גלוי, ומנסים שוב פעם אחת אם זה קרה באמצע. */
function llmWhenVisible() {
  return document.visibilityState === "visible"
    ? Promise.resolve()
    : new Promise(res => {
        const on = () => {
          if (document.visibilityState !== "visible") return;
          document.removeEventListener("visibilitychange", on);
          res();
        };
        document.addEventListener("visibilitychange", on);
      });
}

async function llmBoot() {
  await llmWhenVisible();
  if (!("gpu" in navigator)) {
    llmSet("unsupported", 0, "הדפדפן הזה לא תומך בהרצת מודל");
    return;
  }

  llmSet("loading", 0, "מתחיל");
  try {
    const webllm = await import(/* webpackIgnore: true */ LLM_CDN);

    llmEngine = await webllm.CreateMLCEngine(LLM_MODEL, {
      initProgressCallback: r => {
        /* הדיווח מגיע כשבר בין 0 ל-1, אבל לא תמיד - לפעמים רק טקסט */
        const p = typeof r.progress === "number" ? r.progress : window.LLM.progress;
        llmSet("loading", p, r.text || "");
      }
    });

    /* חימום: הגנרציה הראשונה כוללת הקצאות שמתבצעות פעם אחת בלבד.
       עושים אותה כאן, בזמן שאף אחד לא מחכה, ולא בשאלה האמיתית. */
    await llmEngine.chat.completions.create({
      messages: [{role: "user", content: "שלום"}],
      max_tokens: 1
    });

    llmSet("ready", 1, "מוכן");
  } catch (err) {
    console.error("llm:", err);
    llmEngine = null;

    /* אובדן מכשיר הוא כמעט תמיד זמני - הטאב ירד לרקע. ניסיון שני
       כשהדף חוזר להיות גלוי מצליח בדרך כלל, והמשקל כבר במטמון. */
    const lost = /Instance|device|lost|GPU/i.test(String(err && err.message));
    if (lost && llmTries < 1) {
      llmTries++;
      llmSet("loading", 0, "מנסה שוב");
      setTimeout(llmBoot, 1500);
      return;
    }
    llmSet("failed", 0, "הטעינה נכשלה");
  }
}

/**
 * מנסח תשובה מתוך הקשר נתון.
 *   question - שאלת המשתמש
 *   context  - הטקסט מהאתר שהחיפוש מצא
 *   onToken  - נקרא עם הטקסט המצטבר, לזרימה על המסך
 * מחזיר את התשובה המלאה, או null אם המודל לא זמין.
 */
async function llmAnswer(question, context, onToken) {
  if (window.LLM.state !== "ready" || !llmEngine) return null;

  const messages = [
    {role: "system", content: LLM_SYSTEM},
    {role: "user", content: "מידע:\n" + context + "\n\nשאלה: " + question}
  ];

  try {
    const stream = await llmEngine.chat.completions.create({
      messages: messages,
      stream: true,
      temperature: 0.3,   /* נמוך: רוצים ניסוח של המידע, לא יצירתיות */
      max_tokens: 220
    });

    let text = "";
    for await (const chunk of stream) {
      const piece = chunk.choices[0]?.delta?.content || "";
      if (!piece) continue;
      text += piece;
      if (onToken) onToken(text);
    }
    return text.trim() || null;
  } catch (err) {
    console.error("llm answer:", err);
    return null;
  }
}

window.LLM.ask = llmAnswer;

/* נטען ברקע ברגע שהדפדפן פנוי, כדי שעד שייכנסו למסך העוזר הוא כבר
   יהיה מוכן. requestIdleCallback שומר שזה לא יתחרה בציור הדף. */
function llmStart() {
  if (window.requestIdleCallback) {
    requestIdleCallback(() => llmBoot(), {timeout: 4000});
  } else {
    setTimeout(llmBoot, 1500);
  }
}

if (document.readyState === "complete") llmStart();
else window.addEventListener("load", llmStart);
