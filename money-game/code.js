/* ===== הקוד של האתר =====
   מסך שמציג את כל הקוד שהאתר בנוי ממנו.

   הוא לא מחזיק עותק של הקוד. הוא מושך את הקבצים מהשרת עם fetch בזמן
   שפותחים אותו, ולכן הוא תמיד מציג בדיוק את מה שרץ כרגע - בלי שצריך
   לעדכן אותו אחרי כל שינוי. */

const CODE_FILES = [
  {name: "index.html", lang: "html", what: "שלד הדף: כל המסכים והכפתורים"},
  {name: "styles.css", lang: "css", what: "העיצוב כולו: צבעים, מסגרות, פריסה ומובייל"},
  {name: "script.js", lang: "js", what: "המוח: מעבר בין מסכים, ניהול המסע, קול וקרב הדרקון"},
  {name: "game.js", lang: "js", what: "הזירות של המסע ומנוע ההתקדמות"},
  {name: "worlds.js", lang: "js", what: "שלושת העולמות, נמל הסוחרים, ותוכן המשחקים"},
  {name: "minigames.js", lang: "js", what: "ששת סוגי המשחק: מיון, השוואה, תקציב, הונאה וחובות"},
  {name: "boss.js", lang: "js", what: "הדרקון: הציור שלו, המתקפות, וההתחמקות"},
  {name: "items.js", lang: "js", what: "19 איורי הפריטים למשחק המיון"},
  {name: "banner.js", lang: "js", what: "כרזת הממלכה ואיורי הכרטיסים"},
  {name: "movie.js", lang: "js", what: "מנוע הסרטונים וכלי הציור המשותפים"},
  {name: "movies.js", lang: "js", what: "תשעת הסרטונים הקצרים"},
  {name: "code.js", lang: "js", what: "המסך הזה עצמו"}
];

/* המצב הנטען, כדי לא למשוך קובץ פעמיים */
const codeCache = new Map();
let codeCurrent = null;

/* ---------- צביעת תחביר ---------- */

/* בורחים מתווים שיישברו כ-HTML */
function codeEscape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const JS_WORDS = new RegExp(
  "\\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue" +
  "|class|new|this|typeof|instanceof|try|catch|finally|throw|of|in|delete|void|await|async" +
  "|default|null|true|false|undefined|NaN|Infinity)\\b", "g");

/* לכל שפה: ביטוי אחד, ולידו המחלקות לפי סדר הקבוצות שבו */
const CODE_PATTERNS = {
  html: {
    re: /(&lt;!--[\s\S]*?--&gt;)|("(?:[^"\\]|\\.)*")|(&lt;\/?[a-zA-Z][\w-]*)|(\b[a-zA-Z-]+(?==))/g,
    classes: ["c-com", "c-str", "c-tag", "c-key"]
  },
  css: {
    re: /(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|vh|vw|fr|deg|ms|s|%)?\b)/g,
    classes: ["c-com", "c-str", "c-num"]
  },
  js: {
    re: /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*\b)/g,
    classes: ["c-com", "c-str", "c-num"]
  }
};

/* צובעים שורה אחת. inBlock אומר אם התחלנו בתוך הערה מרובת שורות. */
function codeLine(raw, lang, inBlock) {
  let text = codeEscape(raw);

  /* המשך הערה מרובת שורות */
  if (inBlock) {
    const end = text.indexOf("*/");
    if (end === -1) return {html: `<i class="c-com">${text}</i>`, inBlock: true};
    return {
      html: `<i class="c-com">${text.slice(0, end + 2)}</i>` +
            codeLine(raw.slice(end + 2), lang, false).html,
      inBlock: false
    };
  }

  /* פתיחת הערה מרובת שורות שלא נסגרת בשורה הזאת */
  const open = text.indexOf("/*");
  if (open !== -1 && text.indexOf("*/", open) === -1) {
    return {
      html: codeLine(raw.slice(0, open), lang, false).html +
            `<i class="c-com">${text.slice(open)}</i>`,
      inBlock: true
    };
  }

  /* מעבר אחד על השורה: הערות, מחרוזות, מספרים ותגיות.
     מעבר אחד מונע צביעה בטעות של מילות מפתח שנמצאות בתוך מחרוזת.
     לכל שפה רשימת מחלקות משלה לפי סדר הקבוצות בביטוי - אחרת הקבוצה
     השלישית של שפה אחת מקבלת בטעות את הצבע של השפה השנייה. */
  const rule = CODE_PATTERNS[lang] || CODE_PATTERNS.js;

  let html = text.replace(rule.re, function () {
    for (let i = 0; i < rule.classes.length; i++) {
      const group = arguments[i + 1];
      if (group) return `<i class="${rule.classes[i]}">${group}</i>`;
    }
    return arguments[0];
  });

  if (lang === "js") {
    /* מילות מפתח, אבל לא בתוך מה שכבר נצבע */
    html = html.replace(/(<i class="c-[a-z]+">[\s\S]*?<\/i>)|([^<]+)/g, (m, tagged, plain) =>
      tagged ? tagged : plain.replace(JS_WORDS, '<i class="c-key">$1</i>'));
  }

  return {html: html, inBlock: false};
}

/* צובעת קובץ שלם ומחזירה שורות ממוספרות */
function codeRender(source, lang) {
  const lines = source.split("\n");
  let inBlock = false;
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const res = codeLine(lines[i], lang, inBlock);
    inBlock = res.inBlock;
    out.push(`<span class="code-line" data-n="${i + 1}">${res.html || " "}</span>`);
  }
  return out.join("");
}

/* ---------- טעינה והצגה ---------- */

function codeSize(chars) {
  return chars < 1024 ? `${chars} תווים` : `${Math.round(chars / 1024)} KB`;
}

async function codeLoad(file) {
  if (codeCache.has(file.name)) return codeCache.get(file.name);

  /* מבקשים את הקובץ מאותו שרת שמגיש את האתר */
  const response = await fetch(file.name, {cache: "no-store"});
  if (!response.ok) throw new Error(`${response.status}`);

  const text = await response.text();
  const entry = {
    text: text,
    lines: text.split("\n").length,
    chars: text.length,
    modified: response.headers.get("Last-Modified")
  };
  codeCache.set(file.name, entry);
  return entry;
}

function renderCodeTabs() {
  const tabs = document.getElementById("codeTabs");
  tabs.innerHTML = CODE_FILES
    .map(f => `<button class="code-tab" data-file="${f.name}">${f.name}</button>`)
    .join("");

  tabs.querySelectorAll(".code-tab").forEach(button => {
    button.addEventListener("click", () => showCodeFile(button.dataset.file));
  });
}

async function showCodeFile(name) {
  const file = CODE_FILES.find(f => f.name === name);
  if (!file) return;
  codeCurrent = name;

  document.querySelectorAll("#codeTabs .code-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.file === name);
  });

  const body = document.getElementById("codeBody");
  const meta = document.getElementById("codeMeta");
  const what = document.getElementById("codeWhat");

  what.textContent = file.what;
  meta.textContent = "טוען…";
  body.innerHTML = "";

  try {
    const entry = await codeLoad(file);
    /* אם המשתמש עבר לקובץ אחר בינתיים, לא דורסים את מה שהוא רואה */
    if (codeCurrent !== name) return;

    meta.textContent = `${entry.lines} שורות · ${codeSize(entry.chars)}`;
    body.innerHTML = codeRender(entry.text, file.lang);
  } catch (error) {
    meta.textContent = "";
    body.innerHTML = `<span class="code-line" data-n="!">לא הצלחתי לטעון את ${name} (${error.message})</span>`;
  }
}

/* סיכום כללי: כמה קוד יש כאן בסך הכול */
async function renderCodeSummary() {
  const box = document.getElementById("codeSummary");
  box.textContent = "מודד…";

  try {
    const all = await Promise.all(CODE_FILES.map(codeLoad));
    const lines = all.reduce((sum, e) => sum + e.lines, 0);
    const chars = all.reduce((sum, e) => sum + e.chars, 0);
    box.innerHTML =
      `<strong>${CODE_FILES.length}</strong> קבצים · ` +
      `<strong>${lines.toLocaleString("he-IL")}</strong> שורות · ` +
      `<strong>${codeSize(chars)}</strong>`;
  } catch (error) {
    box.textContent = "לא הצלחתי למדוד את הקבצים.";
  }
}

/* גיבוי להעתקה: דפדפנים חוסמים את לוח הגזירים בלי לחיצה אמיתית,
   ובחלקם ה-API בכלל לא קיים. */
function copyViaTextarea(text) {
  const box = document.createElement("textarea");
  box.value = text;
  box.setAttribute("readonly", "");
  box.style.cssText = "position:fixed;top:-1000px;opacity:0";
  document.body.appendChild(box);
  box.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  box.remove();
  return ok;
}

/* מסמן את הקוד שמוצג, כדי שאפשר יהיה להעתיק ביד */
function selectShownCode() {
  const body = document.getElementById("codeBody");
  const range = document.createRange();
  range.selectNodeContents(body);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/* מעתיק את הקובץ שמוצג כרגע */
async function copyCurrentCode() {
  const button = document.getElementById("codeCopy");
  const file = CODE_FILES.find(f => f.name === codeCurrent);
  if (!file) return;

  const label = "להעתיק";
  let entry;
  try {
    entry = await codeLoad(file);
  } catch (error) {
    button.textContent = "הקובץ לא נטען";
    setTimeout(() => { button.textContent = label; }, 1800);
    return;
  }

  /* קודם הדרך המודרנית, אחריה הישנה, ולבסוף סימון ידני */
  try {
    await navigator.clipboard.writeText(entry.text);
    button.textContent = "הועתק!";
  } catch (error) {
    if (copyViaTextarea(entry.text)) {
      button.textContent = "הועתק!";
    } else {
      selectShownCode();
      button.textContent = "סומן - Ctrl+C";
    }
  }
  setTimeout(() => { button.textContent = label; }, 1800);
}

/* נקרא בכל כניסה למסך. מנקה את המטמון כדי שתמיד יוצג הקוד העדכני. */
function startCode() {
  codeCache.clear();
  if (!document.getElementById("codeTabs").children.length) renderCodeTabs();
  renderCodeSummary();
  showCodeFile(codeCurrent || CODE_FILES[0].name);
}
