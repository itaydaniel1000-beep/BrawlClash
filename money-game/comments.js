/* ===== הערות אנונימיות =====
   מי שנכנס לאתר יכול לכתוב מה הוא חושב עליו, בלי שם ובלי הרשמה.
   ההערה נשלחת ל-Apps Script שמוסיף אותה ללשונית "הערות" בגיליון,
   ומשם נשלח מייל אוטומטית. אין שרת, אין מסד נתונים, אין מפתח.

   שלוש נקודות שחשוב להבין בקוד הזה:

   1. השליחה היא "no-cors" ולכן אי אפשר לקרוא את התשובה. Apps Script
      לא עונה ל-preflight של CORS, אז בקשת JSON רגילה הייתה נחסמת.
      שולחים text/plain (שלא מפעיל preflight) ומניחים שזה הגיע. לכן
      גם ההודעה למשתמש היא "נשלח" ולא "התקבל" - זו האמת.

   2. אין פה הצגה של הערות אחרות. ברגע שאתר מציג טקסט שכל אדם זר
      יכול לכתוב, הוא הופך ללוח מודעות ציבורי - וזה אתר לילדים.
      ההערות הולכות לגיליון, ומי שמחליט מה לעשות איתן הוא אדם.

   3. ההערה לא נשמרת בדפדפן. היא נשלחת ונעלמת. אין פה שום דבר שאפשר
      לקשר חזרה למי שכתב, וזו הנקודה של "אנונימי". */

/* הכתובת מהפריסה של Apps Script. ריק = הטופס מציג שהוא עוד לא מחובר
   במקום להיכשל בשקט. */
const COMMENTS_ENDPOINT = "";

const COMMENT_MIN = 4;
const COMMENT_MAX = 500;

function commentsReady() {
  return typeof COMMENTS_ENDPOINT === "string" && COMMENTS_ENDPOINT.indexOf("http") === 0;
}

function commentSay(msg, kind) {
  const el = document.getElementById("commentNote");
  if (!el) return;
  el.textContent = msg;
  el.className = "comment-note " + (kind || "");
  el.hidden = false;
}

async function commentSend(text) {
  const body = JSON.stringify({text: text});
  await fetch(COMMENTS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    /* text/plain בכוונה: סוג תוכן אחר מפעיל preflight ש-Apps Script
       לא עונה עליו, והבקשה נחסמת לפני שהיא יוצאת */
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: body
  });
}

function initComments() {
  const form = document.getElementById("commentForm");
  const input = document.getElementById("commentInput");
  const count = document.getElementById("commentCount");
  const send = document.getElementById("commentSend");
  if (!form || !input) return;

  if (!commentsReady()) {
    /* אין טעם להוביל מבקרים לטופס שלא שולח. הכרטיס במסך הראשי נעלם,
       והוא יחזור לבד ברגע שתודבק הכתובת - בלי לגעת בשום דבר אחר. */
    const card = document.querySelector(".say-choice");
    if (card) card.hidden = true;

    input.disabled = true;
    send.disabled = true;
    commentSay("הטופס עוד לא מחובר. צריך לפרוס את Apps Script " +
               "ולהדביק את הכתובת בקובץ comments.js", "warn");
    return;
  }

  const refresh = () => {
    const n = input.value.trim().length;
    count.textContent = n + " / " + COMMENT_MAX;
    count.className = "comment-count" + (n > COMMENT_MAX ? " over" : "");
    send.disabled = n < COMMENT_MIN || n > COMMENT_MAX;
  };
  input.addEventListener("input", refresh);
  refresh();

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const text = input.value.trim();
    if (text.length < COMMENT_MIN || text.length > COMMENT_MAX) return;

    send.disabled = true;
    commentSay("שולח…", "");
    try {
      await commentSend(text);
      input.value = "";
      refresh();
      /* "נשלח" ולא "התקבל": במצב no-cors אי אפשר לדעת מה קרה בצד השני */
      commentSay("ההערה נשלחה. תודה שכתבתם.", "good");
    } catch (err) {
      console.error("comments:", err);
      commentSay("לא הצלחתי לשלוח. אולי אין חיבור לאינטרנט?", "warn");
      send.disabled = false;
    }
  });
}
