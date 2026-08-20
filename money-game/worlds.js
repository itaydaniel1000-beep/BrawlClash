/* ===== עולמות המסע =====
   נטען אחרי game.js. מוסיף זירה תשיעית (נמל הסוחרים), מחלק את השלבים
   לשלושה עולמות, ומצמיד לכל שלב את סוג המשחק שלו והתוכן שלו. */

/* ---------- זירה חדשה: נמל הסוחרים ---------- */

/* ים עם ריצודי אור שזזים */
function seaBand(ctx, y, h, t) {
  for (let i = 0; i < h; i++) {
    const g = i / h;
    px(ctx, 0, y + i, GAME_W, 1,
      g < 0.3 ? "#3f8fd8" : g < 0.65 ? "#2f6ea8" : "#245a88");
  }
  /* גלים */
  for (let row = 0; row < 7; row++) {
    const wy = Math.round(y + 8 + row * (h / 8));
    const speed = 12 + row * 5;
    for (let i = 0; i < 16; i++) {
      const g = spread(41 + row, i);
      const wx = Math.round((g * GAME_W + t * speed) % (GAME_W + 60)) - 30;
      px(ctx, wx, wy, Math.round(14 + g * 22), 2, "rgba(190,225,245,.5)");
    }
  }
}

/* ספינת מפרש שמתנדנדת על המים */
function drawShip(ctx, x, waterY, s, t, seed) {
  const S = n => Math.round(n * s);
  const bob = Math.round(Math.sin(t * 1.4 + (seed || 0)) * 4 * s);
  const tilt = Math.sin(t * 1.1 + (seed || 0)) * 0.035;
  const y = waterY + bob;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  /* גוף */
  ctx.fillStyle = PAL.wood;
  ctx.beginPath();
  ctx.moveTo(-S(62), -S(20));
  ctx.lineTo(S(62), -S(20));
  ctx.lineTo(S(44), S(14));
  ctx.lineTo(-S(44), S(14));
  ctx.closePath();
  ctx.fill();
  px(ctx, -S(60), -S(20), S(122), S(7), PAL.woodDark);
  /* חלונות */
  for (let i = -2; i <= 2; i++) circle(ctx, i * S(20), -S(8), S(4), "#ffd85e");

  /* תורן */
  px(ctx, -S(3), -S(96), S(7), S(78), PAL.woodDark);
  /* מפרש מלא רוח */
  ctx.fillStyle = "#f2ead6";
  ctx.beginPath();
  ctx.moveTo(S(4), -S(92));
  ctx.quadraticCurveTo(S(56), -S(60), S(4), -S(28));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#dcd2ba";
  ctx.beginPath();
  ctx.moveTo(-S(4), -S(86));
  ctx.quadraticCurveTo(-S(40), -S(58), -S(4), -S(32));
  ctx.closePath();
  ctx.fill();
  /* דגלון */
  ctx.fillStyle = "#d8503f";
  ctx.beginPath();
  ctx.moveTo(S(4), -S(96));
  ctx.lineTo(S(30), -S(89));
  ctx.lineTo(S(4), -S(82));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* מגדלור עם אלומה מסתובבת */
function drawLighthouse(ctx, x, groundY, s, t) {
  const S = n => Math.round(n * s);
  /* בסיס סלע */
  ellipse(ctx, x, groundY, S(52), S(14), "#6f7b88");
  /* מגדל מתחדד עם פסים */
  const h = S(150);
  for (let i = 0; i < h; i++) {
    const g = i / h;
    const half = Math.round(S(30) - g * S(12));
    const band = Math.floor(g * 7) % 2;
    px(ctx, x - half, groundY - i, half * 2, 1, band ? "#e8574a" : "#f2ead6");
  }
  /* גלריה */
  px(ctx, x - S(24), groundY - h - S(6), S(48), S(8), "#4a5570");
  /* פנס */
  roundRect(ctx, x - S(15), groundY - h - S(32), S(30), S(28), S(6), "#2a2f45");
  circle(ctx, x, groundY - h - S(18), S(9), "#ffe08a");
  /* גג */
  ctx.fillStyle = "#4a5570";
  ctx.beginPath();
  ctx.moveTo(x - S(20), groundY - h - S(32));
  ctx.lineTo(x, groundY - h - S(54));
  ctx.lineTo(x + S(20), groundY - h - S(32));
  ctx.closePath();
  ctx.fill();

  /* אלומת אור מסתובבת */
  const a = (t * 0.7) % (Math.PI * 2);
  const dir = Math.cos(a);
  if (dir < -0.1) {
    ctx.globalAlpha = 0.3 * Math.min(1, -dir);
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.moveTo(x, groundY - h - S(18));
    ctx.lineTo(x - S(300), groundY - h - S(70));
    ctx.lineTo(x - S(300), groundY - h + S(40));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* שחף */
function drawGull(ctx, x, y, t, seed) {
  const flap = Math.sin(t * 5 + (seed || 0)) * 6;
  ctx.fillStyle = "#f2f7fb";
  ctx.beginPath();
  ctx.moveTo(x - 14, y + flap);
  ctx.quadraticCurveTo(x - 6, y - 5, x, y);
  ctx.quadraticCurveTo(x + 6, y - 5, x + 14, y + flap);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fill();
  px(ctx, x - 2, y - 1, 5, 4, "#dbe6ef");
}

/* מזח עם קורות */
function drawDock(ctx, y) {
  px(ctx, 0, y, GAME_W, 26, PAL.wood);
  px(ctx, 0, y, GAME_W, 6, "#c08f52");
  for (let x = 8; x < GAME_W; x += 46) px(ctx, x, y, 4, 26, PAL.woodDark);
  /* כלונסאות שיורדים למים */
  for (let x = 40; x < GAME_W; x += 150) {
    px(ctx, x, y + 26, 16, 34, PAL.woodDark);
    px(ctx, x - 4, y + 24, 24, 6, "#5f4423");
  }
}

/* עמוד קשירה עם חבל */
function drawBollard(ctx, x, groundY, s) {
  const S = n => Math.round(n * s);
  roundRect(ctx, x - S(11), groundY - S(30), S(22), S(32), S(6), "#4a5570");
  ellipse(ctx, x, groundY - S(31), S(15), S(7), "#5f6b84");
  /* חבל מגולגל */
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, x, groundY - S(6) - i * S(5), S(20) - i * S(2), S(5), "#c9a877");
  }
}

/* ---------- השלב התשיעי ---------- */

QUEST.push({
  place: "נמל הסוחרים",
  intro: "בנמל נפרקות סחורות מכל העולם, אבל אף סוחר כבר לא זוכר איך לחלק את הרווח.",
  win: "הסוחרים מחלקים את הרווח לפי תוכנית. הנמל מתעורר.",
  lose: "המטבעות מתגלגלים למים.",
  lesson: "תקציב הוא תוכנית שנקבעת מראש. כשלכל שקל יש תפקיד לפני שהוא נכנס, לא צריך להחליט מחדש בכל פעם.",
  pool: [],
  draw(ctx, t, curse) {
    drawSky(ctx, "#5fa8d8", "#cfe8f5");
    drawSun(ctx, 130, 62, 32);
    drawCloud(ctx, 380 + t * 4, 44, 0.8);
    drawCloud(ctx, 700 + t * 2, 30, 0.6);
    farRidge(ctx, 214, 34, "#8fa8bd", 3.3);

    /* ים */
    seaBand(ctx, 214, 96, t);

    inked(ctx, c => {
      drawLighthouse(c, 852, 232, 0.72, t);
      drawShip(c, 214, 268, 0.72, t, 0);
      drawShip(c, 610, 262, 0.56, t, 2.1);
      drawDock(c, 300);
      drawGround(c, 326, "#b09b78", "#c9b490");
      drawBollard(c, 92, 326, 1);
      drawBollard(c, 872, 326, 1);
      crate(c, 236, 328, 1);
      crate(c, 288, 328, 0.72);
      barrel(c, 690, 328, 0.95);
      barrel(c, 740, 328, 0.7);
      drawHero(c, 470, 412, 1.9, {walk: t * 3, dim: curse > 0.5});
    });

    drawGull(ctx, 300 + Math.sin(t * 0.5) * 60, 96, t, 0);
    drawGull(ctx, 560 + Math.sin(t * 0.4 + 2) * 80, 68, t, 1.7);
    drawGull(ctx, 730 + Math.sin(t * 0.6 + 4) * 50, 112, t, 3.2);
    vignette(ctx);
  }
});

/* ---------- תוכן המשחקים ---------- */

const SORT_ITEMS = [
  {art: "bread", label: "לחם", need: true, why: "אוכל בסיסי הוא צורך. בלעדיו פשוט אי אפשר."},
  {art: "water", label: "מים לשתייה", need: true, why: "מים הם הצורך הבסיסי ביותר."},
  {art: "medicine", label: "תרופה", need: true, why: "תרופה שומרת על הבריאות. זה צורך."},
  {art: "bulb", label: "חשמל לבית", need: true, why: "חשמל מפעיל אור, מקרר וחימום. צורך."},
  {art: "coat", label: "מעיל לחורף", need: true, why: "ביגוד שמגן מהקור הוא צורך."},
  {art: "shoe", label: "נעליים", need: true, why: "נעליים הן צורך. דגם מסוים כבר רצון."},
  {art: "house", label: "קורת גג", need: true, why: "מקום לגור בו הוא אחד הצרכים הגדולים."},
  {art: "book", label: "ספר לימוד", need: true, why: "ספר שצריך ללימודים הוא צורך."},
  {art: "console", label: "קונסולת משחקים", need: false, why: "כיף גדול, אבל אפשר לחיות בלי. רצון."},
  {art: "candy", label: "ממתק", need: false, why: "טעים, אבל לא נחוץ לחיים. רצון."},
  {art: "balloon", label: "בלון", need: false, why: "בלון הוא הנאה קטנה. רצון."},
  {art: "shades", label: "משקפי שמש ממותגים", need: false, why: "הגנה מהשמש היא צורך, המותג הוא רצון."},
  {art: "cake", label: "עוגת יום הולדת", need: false, why: "עוגה משמחת, אבל היא רצון."},
  {art: "ball", label: "כדור", need: false, why: "משחק הוא רצון, גם אם הוא חשוב לכיף."},
  {art: "ticket", label: "כרטיס לקולנוע", need: false, why: "בילוי הוא רצון."},
  {art: "headphones", label: "אוזניות חדשות", need: false, why: "אוזניות נעימות מאוד, אבל הן רצון."}
];

/* כל סיבוב מחזיק מספרים בלבד. המחיר ליחידה והתשובה הנכונה מחושבים
   בקוד (unitPrice ב-minigames.js), כדי שלא תיתכן טעות הקלדה בתשובה.
   בכל סיבוב האריזה הגדולה עולה יותר בסך הכול - אחרת אין מה לחשב. */
const COMPARE_ROUNDS = [
  {
    art: "milk", name: "קרטון חלב", unitName: "ליטר",
    options: [
      {size: 1, price: 7},
      {size: 2, price: 12}
    ],
    why: "האריזה הגדולה עולה יותר בסך הכול, אבל כל ליטר בה זול יותר."
  },
  {
    art: "rice", name: "שק אורז", unitName: "קילו",
    options: [
      {size: 1, price: 9},
      {size: 3, price: 24}
    ],
    why: "כאן הגדול משתלם: שמונה לקילו מול תשעה."
  },
  {
    art: "juice", name: "בקבוק מיץ", unitName: "ליטר",
    options: [
      {size: 1, price: 9},
      {size: 3, price: 21}
    ],
    why: "שבעה לליטר מול תשעה. חיסכון אמיתי על מוצר שקונים ממילא."
  },
  {
    art: "rice", name: "שק אורז", unitName: "קילו",
    options: [
      {size: 2, price: 14},
      {size: 5, price: 40}
    ],
    why: "דווקא הקטן זול יותר לקילו. אריזה גדולה לא תמיד משתלמת."
  },
  {
    art: "milk", name: "קרטון חלב", unitName: "ליטר",
    options: [
      {size: 2, price: 10},
      {size: 3, price: 18}
    ],
    why: "חמישה לליטר מול שישה. הפעם הקטן עדיף."
  },
  {
    art: "juice", name: "בקבוק מיץ", unitName: "ליטר",
    options: [
      {size: 2, price: 14},
      {size: 4, price: 32}
    ],
    why: "שבעה לליטר מול שמונה. הגדול עולה יותר גם ליחידה."
  }
];

const BUDGET_ROUNDS = [
  {coins: 10, label: "10 מטבעות מהמכירה של היום", why: "5 לצרכים, 3 לרצונות, 2 לחיסכון."},
  {coins: 20, label: "20 מטבעות מהמטען שהגיע", why: "10, 6 ו-4. אותו יחס בדיוק, רק בגדול."},
  {coins: 10, label: "10 מטבעות מהשכר של השבוע", why: "היחס נשאר קבוע בלי קשר לסכום. זה הכוח של הכלל."}
];

const SCAM_OFFERS = [
  {text: "השקיעו 100 מטבעות וקבלו 1000 תוך שבוע. מובטח!", scam: true,
   why: "רווח של פי עשרה בשבוע, ועוד מובטח. אין דבר כזה."},
  {text: "פיקדון בבנק הממלכה, 3 אחוז ריבית בשנה.", scam: false,
   why: "תשואה צנועה ומוסברת. ככה נראית הצעה אמיתית."},
  {text: "שלמו דמי הצטרפות, והרוויחו מכל חבר שתביאו אחריכם.", scam: true,
   why: "רווח שמגיע מגיוס אנשים ולא ממוצר אמיתי. זו פירמידה."},
  {text: "קרן שמפזרת את הכסף בין מאות עסקים. יש סיכון להפסד.", scam: false,
   why: "היא מודה שיש סיכון. הצעה שקופה, לא הבטחה."},
  {text: "החליטו ב-5 הדקות הקרובות, אחר כך ההצעה נעלמת לנצח.", scam: true,
   why: "לחץ זמן נועד למנוע מכם לחשוב ולבדוק."},
  {text: "חיסכון חודשי קבוע. אפשר למשוך בהתראה של חודש.", scam: false,
   why: "תנאים ברורים וכתובים מראש."},
  {text: "רווח יומי בטוח, בלי שום סיכון, לכל החיים.", scam: true,
   why: "המילים בטוח ובלי סיכון יחד הן הדגל האדום הגדול."},
  {text: "מניה שיכולה לעלות או לרדת. אף אחד לא מבטיח כלום.", scam: false,
   why: "אמירה כנה על סיכון היא סימן טוב, לא רע."}
];

const ORDER_DEBTS = [
  {name: "חוב כרטיס אשראי", amount: "אלפיים מטבעות", rate: 18},
  {name: "חוב לחנות בכפר", amount: "שמונה מאות מטבעות", rate: 12},
  {name: "הלוואה מהבנק", amount: "עשרת אלפים מטבעות", rate: 7},
  {name: "הלוואה מהמשפחה", amount: "שלושת אלפים מטבעות", rate: 0}
];

/* ---------- הצמדת משחק לכל שלב ---------- */

/* לפי שם המקום, כדי שסדר המערך לא ישבור את ההצמדה */
function stageByPlace(name) {
  return QUEST.find(s => s.place === name);
}

function setGame(place, game, config) {
  const stage = stageByPlace(place);
  if (!stage) throw new Error("no stage " + place);
  stage.game = game;
  stage.config = config || null;
}

setGame("כיכר הכפר", "sort", {items: SORT_ITEMS, rounds: 8, need: 6});
setGame("השוק הגדול", "compare", {rounds: COMPARE_ROUNDS, count: 5, need: 4});
setGame("הבאר היבשה", "quiz");
setGame("נמל הסוחרים", "budget", {rounds: BUDGET_ROUNDS, count: 3, need: 2});
setGame("גשר הזמן", "quiz");
setGame("מערת ההבטחות", "scam", {offers: SCAM_OFFERS, count: 6, need: 5});
setGame("בית האוצר", "quiz");
setGame("שער החוב", "order", {debts: ORDER_DEBTS, count: 4, mistakes: 1});
setGame("מגדל המכשף", "quiz");

/* ---------- העולמות ---------- */

const WORLDS = [
  {
    name: "הכפר המקולל",
    tagline: "שם הקללה התחילה. לומדים להבחין בין מה שחייבים לבין מה שרוצים.",
    color: "#4f9e5c",
    places: ["כיכר הכפר", "השוק הגדול", "הבאר היבשה"]
  },
  {
    name: "נתיב הסוחרים",
    tagline: "הדרך אל ההר עוברת בנמל, בגשר ובמערה. כאן לומדים לתכנן ולא להתפתות.",
    color: "#3f8fd8",
    places: ["נמל הסוחרים", "גשר הזמן", "מערת ההבטחות"]
  },
  {
    name: "מצודת המכשף",
    tagline: "הלב של הקללה. חובות, אוצרות, והשאלה הגדולה מכולן.",
    color: "#8a5cc9",
    places: ["בית האוצר", "שער החוב", "מגדל המכשף"]
  }
];

/* קרב הסיום. הוא לא שלב רגיל - יש לו מסך משלו. */
const BOSS_STAGE = {
  place: "קרב הדרקון",
  intro: "המכשף שרוף מכעס ומזמן את הדרקון האחרון שלו. הוא תוקף, ואחרי כל התקפה הוא נאלץ לנשום. זה החלון שלכם.",
  win: "הדרקון קורס. הקללה נשברת, והצבע חוזר לממלכה כולה.",
  lose: "הדרקון גובר. אתם נסוגים שלושה שלבים אחורה כדי לאסוף כוח.",
  lesson: "הידע הפיננסי אינו רשימת עובדות אלא הרגל. כשהוא בפנים, אפשר להחליט נכון גם תחת לחץ.",
  boss: true
};

/* מפת המסע: כל השלבים לפי סדר העולמות, ובסוף הבוס */
function worldStages(world) {
  return world.places.map(stageByPlace);
}

/* בונה מסע חדש: סדר העולמות קבוע, הסדר בתוך כל עולם מוגרל,
   ומגדל המכשף נשאר תמיד השלב האחרון לפני הדרקון. */
function buildRun() {
  const run = [];

  WORLDS.forEach((world, wi) => {
    const stages = worldStages(world);
    const last = stages[stages.length - 1];
    const isFinalWorld = wi === WORLDS.length - 1;

    /* בעולם האחרון מגדל המכשף חייב להישאר בסוף */
    const shuffledStages = isFinalWorld
      ? shuffled(stages.filter(s => s !== last)).concat([last])
      : shuffled(stages);

    shuffledStages.forEach((stage, si) => {
      run.push({
        stage: stage,
        world: wi,
        indexInWorld: si,
        worldSize: stages.length,
        boss: false
      });
    });
  });

  run.push({stage: BOSS_STAGE, world: WORLDS.length - 1, indexInWorld: 0, worldSize: 1, boss: true});
  return run;
}

/* ---------- כרזת עולם ---------- */

/* ציור רחב שמייצג את העולם, לכרטיס הפתיחה ולכרטיס הסיום.
   freed קובע אם הוא מצויר משוחרר או עדיין תחת הקללה. */
function paintWorldBanner(canvas, worldIndex, freed) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width;
  const H = canvas.height;
  const g = H / 180;
  const S = n => Math.round(n * g);
  const groundY = H - S(26);

  ctx.clearRect(0, 0, W, H);

  if (worldIndex === 0) {
    /* הכפר: גבעות, בתים, שדה */
    drawSky(ctx, freed ? "#7fb8e0" : "#6f7f92", freed ? "#dbeef8" : "#c2c8d0");
    drawSun(ctx, W - S(64), S(38), S(22));
    drawCloud(ctx, S(70), S(30), g * 0.6);
    drawCloud(ctx, W * 0.55, S(22), g * 0.45);
    farRidge(ctx, groundY - S(30), S(28), freed ? "#8fbf86" : "#7f8f86", 1.2);
    inked(ctx, c => {
      drawGround(c, groundY, freed ? "#6ab04c" : "#7a8574", freed ? "#84c95e" : "#8d9885");
      drawCottage(c, S(70), groundY, g * 0.72);
      drawCottage(c, S(150), groundY - S(4), g * 0.55);
      drawTree(c, W * 0.52, groundY, g * 0.5);
      drawStall(c, W * 0.68, groundY, g * 0.7, "#b5533f");
      drawWell(c, W - S(70), groundY, g * 0.6, !freed);
    });
    scatterGrass(ctx, groundY, 18, freed ? "#4a8535" : "#69725f", 5);
  } else if (worldIndex === 1) {
    /* נתיב הסוחרים: ים, ספינה, גשר, מערה */
    drawSky(ctx, freed ? "#5fa8d8" : "#5f6f82", freed ? "#cfe8f5" : "#bcc4cc");
    drawSun(ctx, S(60), S(34), S(20));
    farRidge(ctx, groundY - S(46), S(30), freed ? "#8fa8bd" : "#7d8894", 3.3);
    seaBand(ctx, groundY - S(46), S(34), 1.2);
    inked(ctx, c => {
      drawShip(c, S(90), groundY - S(34), g * 0.42, 1.1, 0);
      drawGround(c, groundY, freed ? "#b09b78" : "#8d8a80", freed ? "#c9b490" : "#9d9a90");
      drawBridge(c, groundY - S(6), g * 0.5);
      crate(c, W * 0.42, groundY, g * 0.6);
      barrel(c, W * 0.5, groundY, g * 0.55);
      /* פתח מערה */
      ellipse(c, W - S(74), groundY - S(2), S(46), S(44), "#2a2340");
      drawSign(c, W - S(74), groundY - S(56), S(56), S(30), "#8a5cc9");
    });
    crystal(ctx, W - S(102), groundY - S(12), g * 0.5, "#a87cff");
    crystal(ctx, W - S(46), groundY - S(8), g * 0.4, "#7cc8ff");
  } else {
    /* מצודת המכשף: חומה, שער, מגדל, סערה */
    drawSky(ctx, freed ? "#4a4270" : "#241f38", freed ? "#8f7fb5" : "#4a4260");
    moon(ctx, S(56), S(34), S(18));
    starField(ctx, 24, 17, H * 0.6);
    if (!freed) stormClouds(ctx, 1.4);
    inked(ctx, c => {
      castleWall(c, groundY, S(70));
      drawGround(c, groundY, "#9aa5b1", "#bcc6d1");
      drawGate(c, W * 0.5, groundY, g * 0.6, !freed);
      drawChest(c, S(74), groundY, g * 0.6, freed);
      drawTower(c, W - S(80), groundY, g * 0.62, !freed);
    });
    torch(ctx, S(30), groundY - S(56), 1.1, g * 0.9);
    torch(ctx, W - S(26), groundY - S(56), 1.6, g * 0.9);
  }

  /* עדיין מקולל: הצבע מנוקז */
  if (!freed) applyCurse(ctx, 0.75);

  /* משוחרר: ניצוצות חג */
  if (freed) {
    for (let i = 0; i < 26; i++) {
      const sp = spread(83, i);
      const x = Math.round(sp * W);
      const y = Math.round(((sp * 17) % 1) * H * 0.8);
      const r = 2 + Math.round(((sp * 31) % 1) * 3);
      ctx.globalAlpha = 0.5 + ((sp * 7) % 1) * 0.5;
      circle(ctx, x, y, r, i % 3 ? "#ffe08a" : "#ffffff");
    }
    ctx.globalAlpha = 1;
  }

  vignette(ctx);
}
