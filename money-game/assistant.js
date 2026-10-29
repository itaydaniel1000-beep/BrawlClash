/* ===== עוזר הכסף =====
   עונה על שאלות כסף מתוך התוכן של האתר עצמו, ומחשב שאלות שיש בהן מספרים.

   למה לא מודל אמיתי: מודל דרך API דורש מפתח בתשלום, ומודל שרץ בדפדפן
   הוא הורדה של כמה ג'יגה־בייט שלא תעבוד בטלפון. מה שכן אפשר לעשות
   בחינם זה לחפש במה שכבר כתוב באתר ולחשב - ודווקא החישוב הוא מה שהופך
   את זה לשימושי, כי שאלת כסף אמיתית היא כמעט תמיד שאלה עם מספרים.

   אם יום אחד יהיה מפתח: הנקודה היחידה להחליף היא askAssistant() בתחתית.

   מאגר הידע נבנה בזמן ריצה מהמשתנים החיים - dailyLessons, BOSS_QUESTIONS,
   QUEST ו-videos - ולכן הוא מתעדכן לבד בכל פעם שמוסיפים תוכן לאתר. */

/* ---------- עברית: הבאת מילה לצורה שאפשר להשוות ---------- */

const AS_FINALS = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"};

/* מילים שמופיעות כמעט בכל שאלה ולכן לא מבדילות בין נושאים */
const AS_STOP = new Set([
  "מה", "זה", "זאת", "של", "את", "עם", "על", "אם", "או", "גם", "יש", "אין",
  "לא", "כן", "אני", "אתה", "הוא", "היא", "הם", "אנחנו", "איך", "למה", "מתי",
  "איפה", "כמה", "מי", "אבל", "כי", "רק", "עוד", "כל", "יותר", "פחות", "אז",
  "היה", "להיות", "אפשר", "צריך", "רוצה", "עושים", "עושה", "תסביר", "תגיד",
  "בבקשה", "שאלה", "אחד", "אחת", "בין", "לבין", "הכי", "טוב", "נכון"
]);

function asNorm(word) {
  let w = word.replace(/[֑-ׇ]/g, "");           /* ניקוד */
  w = w.replace(/[^א-ת0-9]/g, "");              /* סימני פיסוק */
  w = w.replace(/[ךםןףץ]/g, c => AS_FINALS[c]);           /* אותיות סופיות */
  return w;
}

/* הסרת אות שימוש מתחילת מילה. רק במילים ארוכות, אחרת "מה" הופך ל"ה"
   ו"של" ל"ל", וכל ההתאמה נהרסת. */
function asStem(word) {
  const w = asNorm(word);
  if (w.length >= 5 && /^[והבלמשכ]/.test(w)) return w.slice(1);
  return w;
}

function asTokens(text) {
  return String(text || "")
    .split(/\s+/)
    .map(asStem)
    .filter(t => t.length >= 2 && !AS_STOP.has(t));
}

/* ---------- מאגר הידע ---------- */

let AS_DOCS = null;

function asBuildDocs() {
  if (AS_DOCS) return AS_DOCS;
  const docs = [];

  /* השיעורים היומיים הם המקור הטוב ביותר: בהם יש פסקאות אמיתיות */
  if (typeof dailyLessons !== "undefined") {
    dailyLessons.forEach(l => docs.push({
      kind: "lesson",
      topic: l.topic,
      title: l.title,
      body: l.body,
      stepsTitle: l.stepsTitle,
      steps: l.steps,
      task: l.task,
      /* stepsTitle חייב להיכנס לכאן: בשיעור הסיכון הוא "איך מזהים הונאה?",
         וכשהוא חסר השאלה הזאת פשוט לא מוצאת את השיעור שלה. */
      text: [l.topic, l.title, l.body, l.stepsTitle,
             (l.steps || []).join(" "), l.task].join(" ")
    }));
  }

  /* שאלות הדרקון: עובדה קצרה וחדה לכל נושא */
  if (typeof BOSS_QUESTIONS !== "undefined") {
    BOSS_QUESTIONS.forEach(q => docs.push({
      kind: "fact",
      title: q.q,
      body: q.a[q.c],
      text: q.q + " " + q.a[q.c]
    }));
  }

  /* שאלות המסע: ניסוח ארוך יותר, לרוב משפט שלם */
  if (typeof QUEST !== "undefined") {
    QUEST.forEach(stage => {
      if (stage.lesson) {
        docs.push({kind: "fact", title: stage.place || "", body: stage.lesson,
                   text: (stage.place || "") + " " + stage.lesson});
      }
      (stage.pool || []).forEach(q => docs.push({
        kind: "fact",
        title: q.question,
        body: q.answers[q.correct],
        text: q.question + " " + q.answers[q.correct]
      }));
    });
  }

  /* הסרטונים: לא תשובה, אלא המלצה לאן ללכת */
  if (typeof videos !== "undefined") {
    videos.forEach(v => docs.push({
      kind: "video",
      id: v.id,
      title: v.title,
      body: v.description,
      grade: v.grade,
      text: [v.title, v.description, v.topic, v.categoryLabel].join(" ")
    }));
  }

  /* IDF: מילה שמופיעה בכל המסמכים לא מלמדת כלום, מילה נדירה מלמדת הרבה */
  const df = new Map();
  docs.forEach(d => {
    d.tokens = asTokens(d.text);
    new Set(d.tokens).forEach(t => df.set(t, (df.get(t) || 0) + 1));
  });
  const idf = new Map();
  df.forEach((n, t) => idf.set(t, Math.log(1 + docs.length / n)));

  AS_DOCS = {docs: docs, idf: idf};
  return AS_DOCS;
}

function asSearch(question, kinds, limit) {
  const {docs, idf} = asBuildDocs();
  const qt = asTokens(question);
  if (!qt.length) return [];

  const scored = docs
    .filter(d => !kinds || kinds.includes(d.kind))
    .map(d => {
      const own = new Set(d.tokens);
      let score = 0;
      qt.forEach(t => {
        if (own.has(t)) score += idf.get(t) || 1;
        /* התאמה חלקית, כדי ש"חיסכון" יתפוס גם "לחסוך" */
        else if (t.length >= 4 && d.tokens.some(o => o.startsWith(t.slice(0, 4)))) {
          score += (idf.get(t) || 1) * 0.45;
        }
      });
      /* מסמך ארוך צובר נקודות בקלות, אז מנרמלים לפי אורך. אבל בלי
         רצפה, עובדה בת שלוש מילים מנצחת כל שיעור רק בגלל שהיא קצרה -
         ולכן "מה זה ריבית דריבית" קיבל את התשובה "הרבה שנים". */
      const norm = Math.sqrt(1 + d.tokens.length / 40);
      /* שיעור הוא תשובה טובה יותר מעובדה בודדת: יש בו הסבר, צעדים
         ומשימה. כשהשניים קרובים בניקוד, השיעור עדיף. */
      const kindBoost = d.kind === "lesson" ? 1.4 : 1;
      return {doc: d, score: score * kindBoost / norm};
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit || 3);
}

/* ---------- מחשבון: שאלות הכסף שיש בהן מספרים ---------- */

function asNums(text) {
  const out = [];
  /* גם "20%" וגם "20 אחוז" וגם "1,200" */
  const re = /(\d+(?:[.,]\d+)?)/g;
  let m;
  while ((m = re.exec(text))) out.push(parseFloat(m[1].replace(/,/g, "")));
  return out;
}

function asMoney(n) {
  const r = Math.round(n * 100) / 100;
  return (Number.isInteger(r) ? r : r.toFixed(2)) + " ₪";
}

/* כל מחשבון מחזיר טקסט תשובה, או null אם השאלה לא שלו */
const AS_MATH = [

  /* ריבית דריבית: סכום, אחוז, שנים */
  function compound(q, nums) {
    if (!/ריבית|דריבית|תשואה|יגדל|יצמח|אחרי.*שנ/.test(q)) return null;
    if (nums.length < 3) return null;
    const [amount, rate, years] = nums;
    if (years > 120 || rate > 100) return null;

    let v = amount;
    const rows = [];
    for (let y = 1; y <= Math.min(years, 8); y++) {
      v = v * (1 + rate / 100);
      rows.push("שנה " + y + ": " + asMoney(v));
    }
    const final = amount * Math.pow(1 + rate / 100, years);
    const profit = final - amount;

    return {
      title: "ריבית דריבית",
      lines: [
        asMoney(amount) + " בריבית " + rate + " אחוז לשנה, במשך " + years + " שנים:",
        "**" + asMoney(final) + "**",
        "מתוכם " + asMoney(profit) + " רווח.",
        years <= 8 ? rows.join("\n") : rows.join("\n") + "\n…",
        "שים לב שכל שנה הרווח גדול יותר מהקודמת. זה בדיוק מה שריבית " +
        "דריבית עושה: היא מחשבת רווח גם על הרווחים הקודמים."
      ]
    };
  },

  /* כלל 50־30־20 */
  function split(q, nums) {
    if (!/50|חמישים/.test(q) || !/30|20|תקציב/.test(q)) {
      if (!/תקציב|לחלק|חלוקה/.test(q)) return null;
    }
    const amount = nums.find(n => n > 40);
    if (!amount) return null;
    return {
      title: "חלוקה לפי 50־30־20",
      lines: [
        "מתוך " + asMoney(amount) + ":",
        "צרכים (50%): **" + asMoney(amount * 0.5) + "**",
        "רצונות (30%): **" + asMoney(amount * 0.3) + "**",
        "חיסכון (20%): **" + asMoney(amount * 0.2) + "**",
        "את החיסכון מפרישים ראשון, לא ממה שנשאר בסוף החודש."
      ]
    };
  },

  /* כמה אחוז מתוך סכום */
  function percent(q, nums) {
    if (!/אחוז|%/.test(q)) return null;
    if (nums.length < 2) return null;
    const [pct, total] = nums;
    if (pct > 100) return null;
    return {
      title: "חישוב אחוזים",
      lines: [
        pct + " אחוז מתוך " + asMoney(total) + " זה **" + asMoney(total * pct / 100) + "**",
        "החישוב: " + total + " × " + pct + " ÷ 100"
      ]
    };
  },

  /* כמה לחסוך כדי להגיע למטרה */
  function goal(q, nums) {
    if (!/לחסוך|מטרה|לקנות|להגיע|אחסוך/.test(q)) return null;
    if (nums.length < 2) return null;
    const price = Math.max(nums[0], nums[1]);
    const period = Math.min(nums[0], nums[1]);
    if (period < 1 || period > 120) return null;

    const months = /שנ/.test(q) && period <= 10 ? period * 12 : period;
    const unit = months === period ? "חודשים" : "חודשים (" + period + " שנים)";
    return {
      title: "כמה לחסוך",
      lines: [
        "כדי לאסוף " + asMoney(price) + " תוך " + months + " " + unit + ":",
        "**" + asMoney(price / months) + " בחודש**",
        "או " + asMoney(price / months / 4.3) + " בשבוע.",
        "סכום גדול נראה בלתי אפשרי עד שמחלקים אותו."
      ]
    };
  },

  /* השוואת מחיר ליחידה */
  function unit(q, nums) {
    if (!/משתלם|זול|יקר|ליחידה|להשוות|עדיף/.test(q)) return null;
    if (nums.length < 4) return null;
    const [s1, p1, s2, p2] = nums;
    if (!s1 || !s2) return null;
    const u1 = p1 / s1, u2 = p2 / s2;
    const win = u1 <= u2 ? 1 : 2;
    return {
      title: "מחיר ליחידה",
      lines: [
        "אריזה א׳: " + s1 + " יחידות ב־" + asMoney(p1) + " ← " + asMoney(u1) + " ליחידה",
        "אריזה ב׳: " + s2 + " יחידות ב־" + asMoney(p2) + " ← " + asMoney(u2) + " ליחידה",
        "**משתלם יותר: אריזה " + (win === 1 ? "א׳" : "ב׳") + "**",
        "זה למה תמיד מחלקים את המחיר בכמות. אריזה גדולה לא תמיד זולה יותר ליחידה."
      ]
    };
  }
];

function asTryMath(question) {
  const nums = asNums(question);
  if (!nums.length) return null;
  for (const fn of AS_MATH) {
    const r = fn(question, nums);
    if (r) return r;
  }
  return null;
}

/* ---------- הרכבת התשובה ---------- */

function asCompose(question) {
  const math = asTryMath(question);
  if (math) {
    const related = asSearch(question, ["lesson"], 1)[0];
    return {
      kind: "math",
      title: math.title,
      lines: math.lines,
      lesson: related && related.score > 0.6 ? related.doc : null
    };
  }

  const hits = asSearch(question, ["lesson", "fact"], 3);
  if (!hits.length || hits[0].score < 0.55) {
    return {kind: "miss"};
  }

  const best = hits[0].doc;
  const vid = asSearch(question, ["video"], 1)[0];
  const lines = [];

  if (best.kind === "lesson") {
    lines.push(best.body);
    if (best.steps && best.steps.length) {
      lines.push("**" + (best.stepsTitle || "איך עושים את זה") + "**\n" +
                 best.steps.map(s => "• " + s).join("\n"));
    }
    if (best.task) lines.push("**לנסות בעצמך:** " + best.task);
  } else {
    lines.push(best.body);
    /* עובדה קצרה לבדה היא תשובה דלה; מוסיפים את השיעור הקרוב ביותר */
    const lesson = hits.find(h => h.doc.kind === "lesson");
    if (lesson) lines.push(lesson.doc.body);
  }

  return {
    kind: "answer",
    title: best.kind === "lesson" ? best.title : best.title,
    lines: lines,
    video: vid && vid.score > 0.8 ? vid.doc : null
  };
}

/* ---------- נקודת ההחלפה ---------- */

/* כל מה שהממשק קורא לו. היום זה חיפוש מקומי; אם יום אחד יהיה מפתח
   ל־API, מחליפים רק את הגוף של הפונקציה הזאת ושום דבר אחר לא זז. */
async function askAssistant(question) {
  return asCompose(question);
}

/* ---------- הממשק ---------- */

const AS_CHIPS = [
  "מה זה ריבית דריבית?",
  "100 שקל בריבית 10 אחוז במשך 5 שנים",
  "מה ההבדל בין צורך לרצון?",
  "איך מחלקים 300 שקל לפי 50 30 20?",
  "רוצה לקנות משהו ב-600 שקל תוך 8 חודשים",
  "איך מזהים הונאה?"
];

function asBubble(who, html) {
  const chat = document.getElementById("helperChat");
  if (!chat) return null;
  const b = document.createElement("div");
  b.className = "helper-bubble " + who;
  b.innerHTML = html;
  chat.appendChild(b);
  chat.scrollTop = chat.scrollHeight;
  return b;
}

/* טקסט מהמשתמש לעולם לא נכנס כ-HTML */
function asEscape(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
}

/* **מודגש** והורדות שורה. התוכן מגיע מהקבצים שלנו, אבל עובר escape
   בכל מקרה - ככה אי אפשר לשבור את זה בטעות בעריכת תוכן עתידית. */
function asFormat(text) {
  return asEscape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function asRenderAnswer(res) {
  if (res.kind === "miss") {
    return "<p>לא מצאתי על זה משהו באתר.</p>" +
           "<p>אני יודע לענות על תקציב, חיסכון, ריבית דריבית, צורך מול רצון, " +
           "קניות חכמות, הונאות, אשראי וקרן חירום — ולחשב שאלות עם מספרים.</p>";
  }

  let html = "";
  if (res.title) html += "<h4>" + asEscape(res.title) + "</h4>";
  res.lines.forEach(l => { html += "<p>" + asFormat(l) + "</p>"; });

  if (res.lesson) {
    html += '<p class="helper-aside">קשור לשיעור: <strong>' +
            asEscape(res.lesson.title) + "</strong></p>";
  }
  if (res.video) {
    html += '<p class="helper-aside">יש על זה סרטון: <strong>' +
            asEscape(res.video.title) + "</strong> · " +
            asEscape(res.video.grade || "") + "</p>";
  }
  return html;
}

async function asAsk(question) {
  const q = String(question || "").trim();
  if (!q) return;

  asBubble("me", asEscape(q));
  const thinking = asBubble("bot", "<em>רגע…</em>");

  try {
    const res = await askAssistant(q);
    thinking.innerHTML = asRenderAnswer(res);
  } catch (err) {
    thinking.innerHTML = "<p>משהו השתבש אצלי. נסו לנסח אחרת.</p>";
    console.error("assistant:", err);
  }
  document.getElementById("helperChat").scrollTop = 1e9;
}

function initHelper() {
  const form = document.getElementById("helperForm");
  const input = document.getElementById("helperInput");
  const chips = document.getElementById("helperChips");
  if (!form || !input || !chips) return;

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const q = input.value;
    input.value = "";
    asAsk(q);
  });

  AS_CHIPS.forEach(text => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "helper-chip";
    b.textContent = text;
    b.addEventListener("click", () => asAsk(text));
    chips.appendChild(b);
  });

  asBubble("bot",
    "<p>שלום! אני עונה על שאלות כסף מתוך השיעורים של האתר, " +
    "וגם מחשב שאלות שיש בהן מספרים.</p>" +
    "<p>אפשר לנסות אחת מההצעות למטה, או פשוט לכתוב.</p>");
}
