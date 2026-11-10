/* ===== עוזר הכסף =====
   עונה על שאלות כסף מתוך התוכן של האתר עצמו, ומחשב שאלות שיש בהן מספרים.

   הקובץ הזה הוא הבסיס, והוא עובד בכל דפדפן: חיפוש במה שכתוב באתר,
   ועוד חישוב לשאלות שיש בהן מספרים - ודווקא החישוב הוא מה שהופך את
   זה לשימושי, כי שאלת כסף אמיתית היא כמעט תמיד שאלה עם מספרים.

   מעליו, בכרום, llm.js מוסיף את ה-AI של גוגל: הוא מקבל את התשובה
   הזאת כהקשר וכותב אותה מחדש בשפה שלו. שתי סיבות שהסדר הוא כזה
   ולא הפוך - התשובה מופיעה מיד ולא מחכים למודל, ומי שאין לו מודל
   מקבל תשובה שלמה ולא הודעת שגיאה.

   אם יום אחד יהיה מפתח ל-API: הנקודה היחידה להחליף היא askAssistant()
   בתחתית.

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
  "בבקשה", "שאלה", "אחד", "אחת", "בין", "לבין", "הכי", "טוב", "נכון",
  /* "מזה" הוא "מה זה" שנכתב כמילה אחת, וככה ילדים מקלידים. בלעדיו
     "מזה השקעה" קיבל את השיעור על צורך ורצון, רק כי בכותרת שלו כתוב
     "מה מזה צורך?" - כל הניקוד הגיע ממילת השאלה ולא מהנושא. */
  "מזה", "מהו", "מהי", "זהו"
/* הרשימה עוברת את אותו נרמול כמו כל מילה אחרת, אחרת היא מפספסת כל
   מילה עם אות סופית: asNorm הופכת "איך" ל"איכ", והחיפוש בסט נכשל.
   שלוש־עשרה מהמילים כאן - איך, צריך, עושים, כן, אין, נכון, עם, אם,
   גם, הם ועוד - מעולם לא סיננו כלום. ככה "תגיד איך אתה פועל" קיבל
   שיעור על צורך ורצון: "איך" היתה המילה היחידה שנתנה ניקוד. */
].map(asNorm));

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

/* כמה מהשאלה המסמך הזה בכלל מכסה.
   ניקוד גבוה לא מעיד על רלוונטיות: מסמך יכול לצבור נקודות ממילה
   אחת שחוזרת בכל שאלה. לכן מודדים איזה חלק ממשקל השאלה - סכום
   ה-IDF של המילים שבה - נמצא במסמך.

   נמדד על עשרות שאלות: תשובות נכונות נעות בין 0.50 ל-1.00, ואילו
   ההתאמה השגויה שהחזירה שיעור על צורך לשאלה על השקעה קיבלה 0.00.
   0.35 יושב באמצע, עם מרווח לשני הכיוונים. */
const AS_MIN_COVER = 0.35;

function asTopicCover(question, doc) {
  const {idf} = asBuildDocs();
  const qt = asTokens(question);
  if (!qt.length) return 1;

  const own = new Set(doc.tokens);
  let total = 0, found = 0;
  qt.forEach(t => {
    const w = idf.get(t) || 1;
    total += w;
    if (own.has(t)) found += w;
    /* אותה התאמה חלקית שבניקוד, באותו משקל */
    else if (t.length >= 4 && doc.tokens.some(o => o.startsWith(t.slice(0, 4)))) {
      found += w * 0.45;
    }
  });
  return total ? found / total : 1;
}

/* ---------- שלום, תודה, ושאר דברים שהם לא שאלה ---------- */

/* "מה קורה" הוא לא שאלה על כסף, אבל "קורה" היא מילה נדירה במאגר
   הקטן הזה ולכן ה-IDF שלה גבוה - והיא לבדה גררה את השיעור על כרטיס
   אשראי. אותו דבר ב"שוב פעם" (פעם, 3.7) וב"מה נשמע" (נשמע, 4.4).
   IDF על מאגר קטן מודד נדירות, לא חשיבות, ומילה יומיומית אחת יכולה
   להיראות כמו נושא. לכן ברכות נתפסות לפני החיפוש ולא נכנסות אליו. */
const AS_HELLO =
  /^(הי+|היי+|יה|שלום|אהלן|הלו|יו|מה קורה|מה נשמע|מה שלומך|מה המצב|בוקר טוב|ערב טוב|שוב פעם|hi|hello|hey)[\s!?.,־-]*$/i;

const AS_THANKS = /^(תודה( רבה)?|אחלה|מגניב|סבבה|יופי|מעולה|אחלה אחי)[\s!?.,]*$/i;

function asSmallTalk(question) {
  const q = String(question || "").replace(/\s+/g, " ").trim();
  if (AS_HELLO.test(q)) {
    return {
      kind: "hello",
      lines: ["היי! אני עונה על שאלות כסף מתוך השיעורים של האתר, " +
              "וגם מחשב שאלות שיש בהן מספרים.",
              "אפשר לשאול משהו כמו **מה זה ריבית דריבית**, או " +
              "**איך מחלקים 300 שקל לפי 50 30 20** — או ללחוץ על אחת " +
              "ההצעות למטה."]
    };
  }
  if (AS_THANKS.test(q)) {
    return {kind: "hello", lines: ["בכיף! יש עוד משהו שבא לך לדעת על כסף?"]};
  }
  return null;
}

/* ---------- שאלות על העוזר עצמו ---------- */

/* "תגיד איך אתה פועל" היא שאלה לגיטימית שאין עליה שיעור באתר, והחיפוש
   היה מגיש לה את מה שבמקרה צבר ניקוד. עדיף שיענה על עצמו. */
function asIsAboutSelf(question) {
  const q = String(question || "").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim();
  return /(^|\s)מי אתה(\s|$)/.test(q) ||
         /(^|\s)(איך|מה) אתה (עובד|פועל|יודע|עושה|יכול|מוצא)/.test(q) ||
         /(^|\s)איך קוראים לך(\s|$)/.test(q) ||
         /(^|\s)מי (בנה|יצר|עשה|כתב) אותך(\s|$)/.test(q) ||
         /(^|\s)מה אתה(\s|$)/.test(q);
}

/* נענית ישירות ולא דרך המודל: זו עובדה על האתר, והמודל רק היה מעוות
   אותה - הוא לא יודע עליו כלום. */
function asSelfAnswer() {
  return {
    kind: "self",
    title: "ככה אני עובד",
    lines: [
      "קודם אני מחפש את השאלה שלך בתוך השיעורים, הסרטונים והמשחקים של " +
      "האתר, ומראה לך מה שכתוב שם.",
      "שאלות עם מספרים אני מחשב בעצמי — ריבית דריבית, חלוקת תקציב, " +
      "או כמה צריך לחסוך כל חודש.",
      "כשאין על הנושא שיעור באתר, **ה-AI של גוגל** שמותקן בתוך הדפדפן " +
      "עונה מעצמו. אני מסמן את זה, כי שם אפשר לטעות.",
      "אני לא זוכר שיחות קודמות, ואני לא שולח שום דבר לשום מקום — " +
      "הכול קורה אצלך במחשב."
    ]
  };
}

function asCompose(question) {
  const chat = asSmallTalk(question);
  if (chat) return chat;
  if (asIsAboutSelf(question)) return asSelfAnswer();

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

  /* מסמך שלא עוסק במה שנשאל נפסל כאן, ולא משנה כמה ניקוד צבר.
     עדיף להגיד "לא מצאתי" מאשר להגיש שיעור על נושא אחר - וזה נכון
     שבעתיים מאז שהמודל מנסח מעל התשובה: הוא נאמן להקשר שהוא קיבל,
     אז הקשר שגוי הופך לתשובה שגויה שנשמעת בטוחה בעצמה. */
  const hits = asSearch(question, ["lesson", "fact"], 3)
    .filter(h => asTopicCover(question, h.doc) >= AS_MIN_COVER);
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

  /* ההקשר שהמודל מקבל. הוא אף פעם לא עונה מהידע של עצמו - רק
     מנסח את מה שכתוב כאן - ולכן הוא לא יכול להמציא עובדות. */
  const context = hits.slice(0, 2).map(h => {
    const d = h.doc;
    return [d.title, d.body, (d.steps || []).join(" ")].filter(Boolean).join(". ");
  }).join("\n");

  return {
    kind: "answer",
    title: best.title,
    lines: lines,
    context: context,
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

const AS_LLM_TAG = '<span class="helper-llm-tag">ה-AI של גוגל</span>';

/* העוזר השני, שנבנה בנפרד: מודל גדול יותר שרץ גם הוא בדפדפן.
   לשם הולכות שאלות שגם האתר וגם ה-AI המקומי לא ידעו לענות עליהן.
   אותו מקור (github.io), אבל פרויקט אחר - ולכן כתובת מלאה. */
const AS_MY_AI = "https://itaydaniel1000-beep.github.io/BrawlClash/my-ai/";

function asMyAiLink(question) {
  return '<p class="helper-aside helper-handoff">' +
         '<a href="' + AS_MY_AI + "?q=" + encodeURIComponent(question) +
         '" target="_blank" rel="noopener">לפתוח את העוזר שלי ←</a></p>';
}

const AS_BIG_TAG = '<span class="helper-llm-tag big">העוזר שלי</span>';

const AS_BIG_NOTE =
  '<p class="helper-llm-note">נכתב על ידי העוזר שלי, שרץ אצלך במחשב, ' +
  "ויכול להכיל טעויות. התשובה מתוך האתר נמצאת למטה.</p>";

const AS_BIG_NOTE_FREE =
  '<p class="helper-llm-note">אין על זה שיעור באתר, אז העוזר שלי ענה ' +
  "מעצמו — כאן יש סיכוי גדול יותר לטעות. שווה לבדוק עם מבוגר.</p>";

/* מי עונה.
   "העוזר שלי" הוא הראשי. המודל של גוגל נשאר מאחוריו בשביל מכשירים
   שלא יכולים להריץ אותו - בלעדיו שם פשוט לא תהיה תשובה. שני החוזים
   זהים (state ו-ask), אז הבחירה היא שורה אחת והשאר לא יודע מי זה. */
function asPickAI() {
  if (window.BIGAI && window.BIGAI.state === "ready") {
    return {ask: window.BIGAI.ask, tag: AS_BIG_TAG,
            note: AS_BIG_NOTE, noteFree: AS_BIG_NOTE_FREE};
  }
  if (window.LLM && window.LLM.state === "ready") {
    return {ask: window.LLM.ask, tag: AS_LLM_TAG,
            note: AS_LLM_NOTE, noteFree: AS_LLM_NOTE_FREE};
  }
  return null;
}

/* תשובה שאינה תשובה. המודל של גוגל עונה לפעמים "אינני יודע" או
   "אנא שאל שאלה ספציפית", וזה בדיוק הרגע להעביר את השאלה הלאה
   במקום להציג לילד סירוב מנוסח יפה. */
const AS_NO_ANSWER =
  /(אינני|איני|אני לא)\s*(יודע|בטוח|מכיר)|לא יודע|לא מוגדרת|לא ברורה|אין לי (מספיק )?מידע|אנא שאל|שאל שאלה|תשאל שאלה/;

function asIsNonAnswer(text) {
  return !text || text.length < 25 || AS_NO_ANSWER.test(text);
}

/* אותיות לטיניות או קיריליות דבוקות בתוך מילה עברית. ככה נראית שבירה
   של מודל שלא אומן מספיק על עברית: הוא מאיית מילה חתיכה-חתיכה ובאמצע
   מחליק לאלפבית אחר. נמדד בפועל - "הBEDLל בין צורך לרצון הוא ש.seek
   הוא מה שחייבים" - וזו לא תשובה שמציגים לילד. */
function asLooksBroken(text) {
  return /[א-ת][A-Za-zЀ-ӿ]|[A-Za-zЀ-ӿ][א-ת]/
    .test(text || "");
}

/* המודל השני, לנפילה אחורה כשהראשון שבר את העברית */
function asOtherAI(used) {
  const big = window.BIGAI && window.BIGAI.state === "ready";
  const nano = window.LLM && window.LLM.state === "ready";
  if (used.tag === AS_BIG_TAG && nano) {
    return {ask: window.LLM.ask, tag: AS_LLM_TAG,
            note: AS_LLM_NOTE, noteFree: AS_LLM_NOTE_FREE};
  }
  if (used.tag === AS_LLM_TAG && big) {
    return {ask: window.BIGAI.ask, tag: AS_BIG_TAG,
            note: AS_BIG_NOTE, noteFree: AS_BIG_NOTE_FREE};
  }
  return null;
}


/* מי כתב את התשובה ומה המשמעות. השורה הזאת חייבת להופיע על כל תשובה
   של המודל: הוא מנסח מהר ויפה, אבל הוא גם יכול לטעות, והקורא צריך
   לדעת שמה שמעליו לא נכתב בידי אדם. */
const AS_LLM_NOTE =
  '<p class="helper-llm-note">נכתב על ידי ה-AI של גוגל ויכול להכיל ' +
  "טעויות. התשובה מתוך האתר נמצאת למטה.</p>";

/* בלי חומר מהאתר מאחוריו, המודל עונה מהידע של עצמו. זו תשובה פחות
   בטוחה מהראשונה, והשורה הזאת אומרת את זה במפורש ולא ברמז. */
const AS_LLM_NOTE_FREE =
  '<p class="helper-llm-note">אין על זה שיעור באתר, אז ה-AI של גוגל ענה ' +
  "מעצמו — כאן יש סיכוי גדול יותר לטעות. שווה לבדוק עם מבוגר.</p>";

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
    /* קצר בכוונה: ברוב המקרים תשובה של המודל כבר יושבת מעל השורה
       הזאת, והיא רק מסבירה למה אין כאן שיעור ללחוץ עליו. */
    return '<p class="helper-aside">על זה אין שיעור באתר. יש כאן תקציב, ' +
           "חיסכון, ריבית דריבית, צורך מול רצון, קניות חכמות, הונאות, " +
           "אשראי וקרן חירום — ואפשר גם לשאול שאלות עם מספרים.</p>";
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
  const bubble = asBubble("bot", "<em>רגע…</em>");
  const chat = document.getElementById("helperChat");

  let res;
  try {
    res = await askAssistant(q);
    bubble.innerHTML = asRenderAnswer(res);
  } catch (err) {
    bubble.innerHTML = "<p>משהו השתבש אצלי. נסו לנסח אחרת.</p>";
    console.error("assistant:", err);
    return;
  }
  chat.scrollTop = 1e9;

  /* ---- מי עונה ----
     תשובת מחשבון היא חישוב מדויק, ותיאור עצמי הוא עובדה על האתר.
     לשניהם אין מה להוסיף חוץ מטעויות - שם לא נוגעים.

     בשאר המקרים המודל כותב: כשיש חומר באתר הוא מנסח אותו, וכשאין
     הוא עונה מהידע של עצמו. "לא מצאתי על זה משהו באתר" היא לא
     תשובה, רק דרך מנומסת לא לענות - עדיף תשובה מסומנת ככזו, עם
     האזהרה שמתחתיה. */
  const grounded = res.kind === "answer" && !!res.context;
  if (res.kind === "math" || res.kind === "self" || res.kind === "hello") return;

  const ai = asPickAI();

  /* אין כאן שום מודל שרץ - לפחות שיהיה לאן ללכת */
  if (!ai) {
    if (!grounded) {
      bubble.insertAdjacentHTML("beforeend", asMyAiLink(q));
      chat.scrollTop = 1e9;
    }
    return;
  }

  const live = document.createElement("div");
  live.className = "helper-llm";
  live.innerHTML = ai.tag;
  bubble.insertBefore(live, bubble.firstChild);

  const near = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 60;
  const run = who => who.ask(q, grounded ? res.context : null, partial => {
    live.innerHTML = who.tag + "<p>" + asFormat(partial) + "</p>";
    if (near) chat.scrollTop = 1e9;
  });

  let used = ai;
  let text = await run(used);

  /* עברית שבורה היא לא תשובה. אם השני זמין, נותנים לו לנסות - עדיף
     תשובה קריאה ממודל אחר מאשר ג'יבריש מהמועדף. */
  if (text && asLooksBroken(text)) {
    const alt = asOtherAI(used);
    console.info("llm: עברית שבורה מ" + used.tag.replace(/<[^>]+>/g, "") +
                 (alt ? ", מנסה את השני" : ", אין חלופה") + ":", text);
    if (alt) {
      const second = await run(alt);
      if (second && !asLooksBroken(second)) { used = alt; text = second; }
      else text = null;
    } else {
      text = null;
    }
    /* שניהם שברו: מוחקים. תג בלי תשובה מתחתיו נראה כמו תקלה, וטקסט
       שבור גרוע מכלום - התשובה מהאתר עומדת בפני עצמה. */
  }

  /* בלי הקשר מהאתר, "אינני יודע" הוא לא תשובה. אין למי להעביר את
     השאלה הלאה, אז לפחות לא מציגים סירוב מנוסח יפה כאילו הוא תשובה. */
  if (!text || (!grounded && asIsNonAnswer(text))) {
    live.remove();
    if (!grounded) bubble.insertAdjacentHTML("beforeend", asMyAiLink(q));
    if (near) chat.scrollTop = 1e9;
    return;
  }

  /* האזהרה נכנסת רק בסוף, כשיש תשובה שלמה. בזמן הזרימה היא היתה
     מרקדת למטה עם כל מילה. */
  live.innerHTML = used.tag + "<p>" + asFormat(text) + "</p>" +
                   (grounded ? used.note : used.noteFree);
  if (near) chat.scrollTop = 1e9;
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

  asWatchLLM();

  asBubble("bot",
    "<p>שלום! אני עונה על שאלות כסף מתוך השיעורים של האתר, " +
    "וגם מחשב שאלות שיש בהן מספרים.</p>" +
    "<p>אפשר לנסות אחת מההצעות למטה, או פשוט לכתוב.</p>");
}

/* ---------- מצב המודלים ---------- */

/* שני מודלים נטענים ברקע: "העוזר שלי" שהוא הראשי, והמודל של גוגל
   שנשאר מאחוריו למכשירים שלא יכולים להריץ אותו. השורה מראה את מי
   שעוד עובד, ומעדיפה את הראשי - שתי שורות התקדמות במקביל זה רעש. */
function asStatus() {
  const el = document.getElementById("helperStatus");
  if (!el) return;

  const big = window.BIGAI || {state: "idle"};
  const nano = window.LLM || {state: "idle"};
  const who = big.state === "loading" ? {s: big, name: "העוזר שלי"}
            : nano.state === "loading" ? {s: nano, name: "ה-AI של גוגל"}
            : null;

  if (who) {
    const pct = Math.round((who.s.progress || 0) * 100);
    el.hidden = false;
    el.className = "helper-status loading";
    el.innerHTML =
      '<span class="helper-status-bar"><i style="width:' + pct + '%"></i></span>' +
      "<span>מכין את " + who.name + " ברקע… " + pct + "%  " +
      "<small>אפשר לשאול כבר עכשיו</small></span>";
    return;
  }

  const ready = big.state === "ready" ? "העוזר שלי"
              : nano.state === "ready" ? "ה-AI של גוגל"
              : null;

  if (ready) {
    el.hidden = false;
    el.className = "helper-status ready";
    el.textContent = ready + " מוכן. התשובות ייכתבו גם על ידו.";
    setTimeout(() => { el.hidden = true; }, 6000);
    return;
  }

  /* בטלפון אין WebGPU ואין מודל מובנה. זו לא תקלה ואין סיבה להבהיל -
     פשוט לא מציגים כלום, כי התשובה מהאתר שלמה בפני עצמה. */
  el.hidden = true;
}

function asWatchLLM() {
  window.addEventListener("llm-change", asStatus);
  window.addEventListener("bigai-change", asStatus);
  /* אם המודולים הספיקו להיטען לפנינו, לא נקבל אירוע על המצב הנוכחי */
  asStatus();
}
