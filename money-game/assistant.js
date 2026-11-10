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

/* ===== מילים שאינן נושא =====
   IDF אמור לסנן מילים נפוצות, אבל הוא מודד נדירות בתוך המאגר הזה -
   ובמאגר של כמה עשרות מסמכים "קורה" מקבלת 3.7 ו"נשמע" 4.4, בדיוק
   כמו מונח כלכלי אמיתי. לכן מילה יומיומית אחת הצליחה לגרור שיעור
   שלם: "מה קורה" החזיר את כרטיס האשראי, "שוב פעם" את התקציב,
   "מה נשמע" את המטרות.

   הרשימה הקודמת כאן היתה 60 מילים, והיא טופלה מקרה-מקרה: כל באג
   הוסיף לה מילה. זה לא עבד כי זו לא בעיה של מילים בודדות אלא של
   לקסיקון חסר - בעברית יש כמה מאות מילות תפקוד ופעלים כלליים, וכל
   אחת מהן היא באג מחכה. אז הנה הלקסיקון, לפי קטגוריות.

   מה לא נכנס לכאן: שום מילה שהיא נושא באתר. "כסף", "חיסכון",
   "ריבית", "תקציב", "קנייה" - אלה מה שאנחנו כן רוצים להתאים.

   הרשימה עוברת asNorm כמו כל מילה אחרת, אחרת כל מילה עם אות סופית
   לא תסונן לעולם: asNorm הופכת "איך" ל"איכ", והחיפוש בסט נכשל. */
const AS_STOP = new Set([
  /* מילות שאלה ופנייה */
  "מה", "מי", "איך", "למה", "מתי", "איפה", "כמה", "האם", "מדוע", "כיצד",
  "מזה", "מהו", "מהי", "מהם", "זהו", "איזה", "איזו", "אילו", "לאן", "מניין",

  /* גופים ושייכות */
  "אני", "אתה", "את", "הוא", "היא", "אנחנו", "אתם", "אתן", "הם", "הן",
  "שלי", "שלך", "שלו", "שלה", "שלנו", "שלכם", "שלהם", "אותי", "אותך",
  "אותו", "אותה", "אותנו", "אותם", "עצמי", "עצמך", "עצמו",

  /* מילות יחס וקישור */
  "של", "עם", "על", "אל", "אם", "או", "גם", "אבל", "כי", "רק", "עוד",
  "כל", "בין", "לבין", "אז", "כך", "ככה", "כמו", "לפי", "בגלל", "בשביל",
  "בתוך", "מתוך", "לתוך", "אחרי", "לפני", "תוך", "עד", "מאז", "כדי",
  "למרות", "אלא", "אולי", "בכלל", "בעצם", "פשוט", "ממש", "כבר", "עדיין",
  "שוב", "פעם", "פעמים", "קצת", "הרבה", "מעט", "יחד", "לבד", "אפילו",

  /* הוויה, יכולת, רצון - נפוצות בכל שאלה ולא מעידות על נושא */
  "יש", "אין", "לא", "כן", "היה", "היתה", "היו", "להיות", "אפשר", "אי",
  "צריך", "צריכה", "צריכים", "רוצה", "רוצים", "יכול", "יכולה", "יכולים",
  "חייב", "חייבת", "כדאי", "מותר", "אסור", "נראה", "נשמע", "מרגיש",

  /* פעלים כלליים שאינם נושא */
  "עושה", "עושים", "עשה", "לעשות", "קורה", "קרה", "יקרה", "הולך",
  "הולכים", "ללכת", "בא", "באים", "לבוא", "נותן", "נותנים", "לתת",
  "לוקח", "לוקחים", "לקחת", "אומר", "אומרים", "לומר", "חושב", "חושבים",
  "לחשוב", "יודע", "יודעים", "לדעת", "מבין", "להבין", "רואה", "לראות",
  "שומע", "לשמוע", "מדבר", "לדבר", "עובד", "לעבוד", "משתמש", "להשתמש",

  /* בקשות ונימוס */
  "תסביר", "תגיד", "תראה", "ספר", "בבקשה", "תודה", "שאלה", "שאלות",
  "עזרה", "תעזור", "סליחה", "היי", "הי", "שלום", "אהלן", "ביי",

  /* כמת, זמן ושיפוט */
  "אחד", "אחת", "שני", "שתי", "הכי", "יותר", "פחות", "טוב", "טובה",
  "רע", "נכון", "לא־נכון", "גדול", "קטן", "חדש", "ישן", "עכשיו", "היום",
  "מחר", "אתמול", "תמיד", "אף", "שום", "דבר", "דברים", "משהו", "מישהו",
  "זה", "זאת", "אלה", "ההוא", "הזה",

  /* מקום, הצבעה, ומילות יחס עם כינוי */
  "שם", "כאן", "פה", "לכאן", "לשם", "איפשהו", "מקום",
  "לי", "לך", "לו", "לה", "לנו", "לכם", "להם", "בי", "בך", "בו", "בה",
  "ממני", "ממך", "ממנו", "ממנה", "מהם", "איתי", "איתך", "איתו", "איתה"
/* שתי הצורות, כי asTokens גוזרת לפני הבדיקה: asStem מורידה אות
   שימוש ממילה באורך 5 ומעלה, אז "מישהו" הופכת ל"ישהו" ובורחת
   מרשימה ששומרת את הצורה המלאה. אותו שורש כמו באג האותיות
   הסופיות - רשימה שמושווית מול מילים מעובדות חייבת לעבור את
   אותו עיבוד בדיוק. */
].flatMap(w => [asNorm(w), asStem(w)]));

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

/* ---------- מה שהעוזר יודע על האתר ----------
   לא הקשר שנדחף לכל שאלה - זה נוסה ונכשל, כי החיפוש תפס מילים
   ופספס כוונה והמודל ענה על נושא אחר. כאן זה ידע קבוע: נכנס פעם
   אחת להוראת המערכת שלו ונשאר שם לאורך כל השיחה, כמו שאדם זוכר
   על מה האתר שהוא עובד בו.

   משפט ראשון מכל שיעור ולא השיעור כולו: 1130 תווים מול 2900, וזה
   מספיק כדי להחזיק את המונחים עצמם - תקציב, צורך מול רצון, קרן
   חירום, ריבית דריבית. בדיוק המילים שהמודל הקטן לא ידע לנקוב בהן.

   נבנה מהמשתנים החיים, אז שיעור חדש באתר נכנס לזיכרון שלו לבד. */
let AS_MEMORY;

function asFirstSentence(text) {
  const t = String(text || "").trim();
  const m = t.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : t).trim();
}

function asSiteMemory() {
  if (AS_MEMORY !== undefined) return AS_MEMORY;
  const parts = [];
  try {
    if (typeof dailyLessons !== "undefined" && dailyLessons.length) {
      parts.push("אלה השיעורים שיש באתר הזה, ואתה מכיר אותם:");
      dailyLessons.forEach(l => {
        parts.push("• " + l.title + " — " + asFirstSentence(l.body));
      });
    }
    if (typeof videos !== "undefined" && videos.length) {
      parts.push("");
      parts.push("סרטונים באתר: " +
        videos.map(v => v.title + " (" + (v.grade || "") + ")").join(", "));
    }
  } catch (e) {
    console.error("site memory:", e);
  }
  AS_MEMORY = parts.length ? parts.join("\n") : null;
  return AS_MEMORY;
}

/* שני המנועים קוראים לה כשהם בונים את הוראת המערכת שלהם */
window.asSiteMemory = asSiteMemory;

/* ---------- איך לענות ----------
   הכללים והדוגמאות כאן באו משיחה אמיתית שבה העוזר נכשל: על "מה קורה"
   הוא ענה "אם לא אינני מוכן לענות", ועל "איזה מדד הכי פחות מסוכן אבל
   מביא הרבה אחוזים" הוא המליץ על הלוואה. מודל קטן לומד מדוגמה הרבה
   יותר טוב מאשר מהסבר, ולכן יש כאן דוגמאות של תשובות טובות.

   השקעות: לא ממליצים על מוצר מסוים - זה אתר לילדים ולא יועץ השקעות.
   כן מסבירים את הכלל האמיתי: סיכון ורווח הולכים יחד. */
const AS_GUIDE = [
  "כללים:",
  "• כתוב משפטים קצרים ופשוטים, במילים עבריות רגילות שילד מכיר. אל תמציא מילים.",
  "• אם ההודעה ממשיכה את השיחה (\"כן\", \"תסביר יותר\", \"על מה אתה ממליץ\"), ענה לפי מה שנאמר קודם.",
  "• על \"הי\", \"מה קורה\" או \"תודה\" ענה במשפט חם וקצר, ושאל על מה בא לו ללמוד.",
  "• על \"במה להשקיע\" או \"איזה מדד או מניה הכי טובים\" אל תמליץ על קרן, מדד או מניה מסוימים. הסבר במקום זה:",
  "  - אין השקעה שגם בטוחה וגם מרוויחה הרבה. ככל שאפשר להרוויח יותר, אפשר גם להפסיד יותר. מי שמבטיח רווח גבוה בלי סיכון כנראה מנסה לרמות.",
  "  - חיסכון או פיקדון בבנק: סיכון נמוך ורווח קטן.",
  "  - קרן שמחקה מדד: קונים בבת אחת חלק קטן מהרבה חברות. זה מפזר את הסיכון ומתאים לשנים רבות, אבל בשנה רעה הערך יכול לרדת.",
  "  - מניה של חברה אחת: הסיכון הכי גבוה.",
  "  - משקיעים רק כסף שלא צריך בקרוב, ומחליטים יחד עם ההורים.",
  "",
  "דוגמאות לתשובות טובות:",
  "שאלה: מה קורה?",
  "תשובה: הכל טוב, תודה ששאלת! על מה בא לך ללמוד היום - חיסכון, תקציב או השקעות?",
  "שאלה: איזה מדד הכי פחות מסוכן אבל גם מביא הרבה אחוזים?",
  "תשובה: אין דבר כזה שגם בטוח וגם מרוויח הרבה - ככל שאפשר להרוויח יותר, אפשר גם להפסיד יותר. " +
    "קרן שמחקה מדד רחב מפזרת את הכסף על הרבה חברות, ולכן היא פחות מסוכנת ממניה אחת, אבל גם היא יכולה לרדת בשנה רעה. " +
    "כדאי להחליט יחד עם ההורים ולהשקיע רק כסף שלא תצטרך בשנים הקרובות.",
  "שאלה: מה זה תקציב?",
  "תשובה: תקציב זו תוכנית שמחליטה מראש כמה כסף הולך לכל דבר. למשל: חצי לדברים שצריך, חלק לדברים שרוצים, וחלק לחיסכון."
].join("\n");

window.asGuide = () => AS_GUIDE;

/* השיחה עד עכשיו - כדי ש"כן" או "תסביר יותר" יגיעו עם הנושא */
const asHistory = [];
const AS_HISTORY_MAX = 6;

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

/* כשההודעה היא לא שאלה על כלום - "הי", "תודה" - אין עובדה לאמת,
   ואזהרה על חוסר שיעור באתר היא רעש. נשארת רק ההסתייגות הבסיסית. */
function asNotePlain(tag) {
  return '<p class="helper-llm-note">נכתב על ידי ' +
         tag.replace(/<[^>]+>/g, "") + " ויכול להכיל טעויות.</p>";
}

/* מי עונה.
   "העוזר שלי" הוא הראשי. המודל של גוגל נשאר מאחוריו בשביל מכשירים
   שלא יכולים להריץ אותו - בלעדיו שם פשוט לא תהיה תשובה. שני החוזים
   זהים (state ו-ask), אז הבחירה היא שורה אחת והשאר לא יודע מי זה. */
function asPickAI() {
  const big = window.BIGAI && window.BIGAI.state === "ready";
  const nano = window.LLM && window.LLM.state === "ready";

  /* "חלש" נקבע במבחן בטעינה. מודל שנכשל בו עדיין עונה כשאין אחר -
     הוא פשוט לא הראשון בתור. */
  if (big && !(window.BIGAI.poor && nano)) {
    return {ask: window.BIGAI.ask, tag: AS_BIG_TAG};
  }
  if (nano) return {ask: window.LLM.ask, tag: AS_LLM_TAG};
  if (big) return {ask: window.BIGAI.ask, tag: AS_BIG_TAG};
  return null;
}

/* ===== מתי תשובה היא לא תשובה =====
   שלושה סוגי כישלון שנראו בפועל מהמודל, ואף אחד מהם לא נתפס על ידי
   השניים האחרים. */

/* 1. אלפבית זר. או דבוק בתוך מילה עברית ("הBEDLל", "ש.seek"), או
      מילה שלמה שנשתלה באמצע משפט עברי ("אני לא יודע את השאלה
      completa"). השנייה בורחת מבדיקת הדבקות, כי יש סביבה רווחים. */
function asForeignMix(text) {
  const t = String(text || "");
  if (/[א-ת][A-Za-zЀ-ӿ]|[A-Za-zЀ-ӿ][א-ת]/.test(t)) return true;
  const hebrew = (t.match(/[א-ת]/g) || []).length;
  const foreign = t.match(/[A-Za-zЀ-ӿ]{3,}/g) || [];
  return hebrew >= 15 && foreign.length > 0;
}

/* 2. לולאה. "כמובן! קסם קסם, מטבע מטבע, קסם קסם, מטבע מטבע!" -
      המודל נתקע וחוזר על עצמו. העברית תקינה לגמרי, אז רק ספירה
      מגלה את זה: או אותה מילה שלוש פעמים ברצף, או אוצר מילים דל
      בצורה קיצונית ביחס לאורך. */
function asLoops(text) {
  const w = String(text || "")
    .replace(/[^א-תA-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (w.length < 6) return false;
  let run = 1;
  for (let i = 1; i < w.length; i++) {
    run = w[i] === w[i - 1] ? run + 1 : 1;
    if (run >= 3) return true;
  }
  return new Set(w).size * 3 <= w.length;
}

/* 3. סירוב. "אני לא יכול להסביר נושאי כסף לילד" הוא משפט תקין
      לחלוטין ועדיין לא תשובה. נמחק מכאן קודם בטעות, וחזר. */
const AS_REFUSAL =
  /(אינני|איני|אני לא)\s*(יודע|בטוח|מכיר|יכול|מסוגל|מוכן)|לא יודע|לא יכול לעזור|לא מוגדרת|לא ברורה|אין לי (מספיק )?מידע|אנא שאל|תן לי מה|שאל שאלה|תשאל שאלה/;

/* מילה זרה בודדת היא החשד החלש שבחבורה: "אני לא יודע את השאלה
   completa" שבורה, אבל "באנגלית קוראים לזה budget, ובעברית תקציב"
   תקינה לגמרי - ומבחוץ שתיהן מילה אחת בתוך עברית. אי אפשר להפריד
   ביניהן בספירה, אז החשד הזה שולח לנסות את המודל השני, אבל אם אין
   שני - מציגים בכל זאת. שאר הכשלים חמורים מכדי להציג. */
/* חשדות קלים: שווה לנסות את המודל השני, אבל אם אין שני - מציגים
   בכל זאת. "לא הצלחתי לענות על זה" היא התשובה הגרועה מכולן, והיא
   מה שהמשתמש קיבל שלוש פעמים ברצף.

   סירוב וקוצר עברו לכאן מהחמורים. הם נקבעו כשהעוזר ענה על שיעורי
   האתר, ושם "אני לא בטוח" פירושו שהחיפוש נכשל. בשיחה רגילה "אני
   לא בטוח שהבנתי, תוכל להסביר?" ו"כן, הבנתי" הם תורות לגיטימיים. */
const AS_MILD = "מילה זרה";
/* קוצר הוא חשד בתשובה לשאלה פתוחה, אבל לא במבחן שבו ביקשנו
   מפורשות מילה אחת. bigai.js מתעלם ממנו שם. */
const AS_TOO_SHORT = "קצר מדי";
const AS_REFUSED = "סירוב";
const AS_SOFT = [AS_MILD, AS_TOO_SHORT, AS_REFUSED];

function asBrokenReason(text) {
  const t = String(text || "").trim();
  if (!t) return AS_TOO_SHORT;
  /* שבירה נבדקת לפני אורך. אחרת "הBEDLל" מקבל "קצר מדי", והמבחן
     שמתעלם מקוצר היה מקבל אותו כתשובה תקינה. */
  if (/[א-ת][A-Za-zЀ-ӿ]|[A-Za-zЀ-ӿ][א-ת]/.test(t)) return "אלפבית בתוך מילה";
  /* אות שאינה עברית ואינה אנגלית רגילה - למשל "כốים" עם אות וייטנאמית */
  if (/[^\P{L}A-Za-z\u05D0-\u05EA]/u.test(t)) return "אלפבית זר";
  if (asLoops(t)) return "לולאה";
  if (asForeignMix(t)) return AS_MILD;
  if (AS_REFUSAL.test(t)) return AS_REFUSED;
  if (t.length < 10) return AS_TOO_SHORT;
  return null;
}

function asLooksBroken(text) {
  return asBrokenReason(text) !== null;
}

/* bigai.js משתמש בה למבחן האיכות שלו, והוא נטען לפני הקובץ הזה */
window.asLooksBroken = asLooksBroken;
window.asBrokenReason = asBrokenReason;
window.AS_TOO_SHORT = AS_TOO_SHORT;

/* המודל השני, לנפילה אחורה כשהראשון שבר את העברית */
function asOtherAI(used) {
  const big = window.BIGAI && window.BIGAI.state === "ready";
  const nano = window.LLM && window.LLM.state === "ready";
  if (used.tag === AS_BIG_TAG && nano) {
    return {ask: window.LLM.ask, tag: AS_LLM_TAG};
  }
  if (used.tag === AS_LLM_TAG && big) {
    return {ask: window.BIGAI.ask, tag: AS_BIG_TAG};
  }
  return null;
}


/* מי כתב את התשובה ומה המשמעות. השורה הזאת חייבת להופיע על כל תשובה
   של המודל: הוא מנסח מהר ויפה, אבל הוא גם יכול לטעות, והקורא צריך
   לדעת שמה שמעליו לא נכתב בידי אדם. */
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

  const ai = asPickAI();

  /* ---- בלי מודל ----
     בטלפון אין WebGPU ואין מודל מובנה, ואז מה שהאתר מצא הוא כל מה
     שיש. רק כאן החיפוש עדיין עונה. */
  if (!ai) {
    let res;
    try {
      res = await askAssistant(q);
    } catch (err) {
      bubble.innerHTML = "<p>משהו השתבש אצלי. נסו לנסח אחרת.</p>";
      console.error("assistant:", err);
      return;
    }
    bubble.innerHTML = asRenderAnswer(res) +
                       (res.kind === "miss" ? asMyAiLink(q) : "");
    chat.scrollTop = 1e9;
    return;
  }

  /* ---- חישוב ----
     מודל קטן טועה באריתמטיקה, והמחשבון לא. זו הפעולה היחידה שנשארה
     לפני המודל, והיא לא "מידע מהאתר" אלא תשובה מדויקת. */
  const math = asTryMath(q);
  if (math) {
    bubble.innerHTML = asRenderAnswer({kind: "math", title: math.title,
                                       lines: math.lines});
    chat.scrollTop = 1e9;
    return;
  }

  /* ---- שיחה ----
     מכאן זה העוזר עצמו, בלי שום דבר שהאתר דוחף לו. ניסינו להגיש לו
     את השיעורים כהקשר, וזה יצר יותר בעיות ממה שפתר: הוא ענה על
     נושא אחר, ציטט שיעור לא קשור, וההערות דיברו על שיעורים שלא
     קשורים לשאלה. שאלה נכנסת, תשובה יוצאת. */
  const live = document.createElement("div");
  live.className = "helper-llm solo";
  live.innerHTML = ai.tag + "<p><em>חושב…</em></p>";
  bubble.innerHTML = "";
  bubble.appendChild(live);
  chat.scrollTop = 1e9;

  const near = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 60;
  const past = asHistory.slice(-AS_HISTORY_MAX);
  const run = who => who.ask(q, null, partial => {
    live.innerHTML = who.tag + "<p>" + asFormat(partial) + "</p>";
    if (near) chat.scrollTop = 1e9;
  }, past);

  let used = ai;
  let text = await run(used);

  /* תשובה ריקה היא כמעט תמיד כרטיס מסך תפוס, לא חוסר ידע. my-ai
     נטען ברקע ולוקח את ה-GPU, והמודל של גוגל מחזיר מחרוזת ריקה
     במקום לזרוק שגיאה - וככה שלוש הודעות ברצף קיבלו "לא הצלחתי
     לענות". נותנים לו רגע לנשום ומנסים שוב, ואז את השני. */
  if (!text) {
    await new Promise(r => setTimeout(r, 1200));
    text = await run(used);
  }
  if (!text) {
    const first = asOtherAI(used);
    if (first) {
      const second = await run(first);
      if (second) { used = first; text = second; }
    }
  }

  /* עברית שבורה היא לא תשובה. אם השני זמין, נותנים לו לנסות. */
  const why = text ? asBrokenReason(text) : null;
  if (why) {
    const alt = asOtherAI(used);
    console.info("llm: " + why + " מ" + used.tag.replace(/<[^>]+>/g, "") +
                 (alt ? ", מנסה את השני" : ", אין חלופה") + ":", text);
    if (alt) {
      const second = await run(alt);
      if (second && !asLooksBroken(second)) { used = alt; text = second; }
      else if (!AS_SOFT.includes(why)) text = null;
      else live.innerHTML = used.tag + "<p>" + asFormat(text) + "</p>";
    } else if (!AS_SOFT.includes(why)) {
      text = null;
    }
  }

  if (!text) {
    /* אם מישהו עוד נטען, זו הסיבה - ועדיף להגיד את זה מאשר לטעון
       שלא הבנו את השאלה. */
    const warming = (window.BIGAI && window.BIGAI.state === "loading") ||
                    (window.LLM && window.LLM.state === "loading");
    live.innerHTML = ai.tag + "<p>" + (warming
      ? "אני עוד מתעורר ברקע. נסה שוב עוד כמה שניות."
      : "לא הצלחתי לענות על זה. אפשר לנסח אחרת?") + "</p>";
    chat.scrollTop = 1e9;
    return;
  }

  asHistory.push({role: "user", content: q}, {role: "assistant", content: text});
  if (asHistory.length > AS_HISTORY_MAX * 2) asHistory.splice(0, asHistory.length - AS_HISTORY_MAX * 2);
  live.innerHTML = used.tag + "<p>" + asFormat(text) + "</p>" +
                   asNotePlain(used.tag);
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
