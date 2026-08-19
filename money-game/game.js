/* ===== מסע הגיבור: לתפוס את המכשף =====
   משחק שלבים שמחליף את החידון. משתמש בכלי הציור של movie.js
   (px, ellipse, circle, roundRect, inked, PAL) ומוסיף דמויות ותפאורות משלו.

   הרעיון: המכשף קילל את הממלכה וגנב ממנה את הצבע.
   כל תשובה נכונה מחזירה צבע לאזור אחד ומקרבת את הגיבור למגדל. */

const GAME_W = 960;
const GAME_H = 420;

const GPAL = {
  heroCloak: "#2f6fb5",
  heroTunic: "#d8b45a",
  heroSkin: "#f0c090",
  heroHair: "#5a3a20",
  lantern: "#ffd85e",

  wizRobe: "#4a2f7a",
  wizRobeDark: "#331f57",
  wizHat: "#3a2560",
  wizSkin: "#c9b8a0",
  wizEye: "#e85a5a",
  curse: "#7a5cc9",

  stone: "#9aa5b1",
  stoneDark: "#6f7b88",
  stoneLight: "#bcc6d1",
  roof: "#b5533f",
  roofDark: "#8f3f30",
  wood: "#a3763f",
  woodDark: "#75542c",
  water: "#3f8fd8",
  waterDark: "#2f6ea8",
  gold: "#f5c542",
  goldDark: "#c99a1f",
  grass: "#6ab04c",
  grassDark: "#4a8535",
  path: "#c9a877",
  sky: "#7fb8e0",
  skyDeep: "#4a6a9a",
  night: "#1d1b34",
  torch: "#ff9d3f"
};

/* ---------- דמויות המשחק ---------- */

/* הגיבור: גלימה, פנס, וצעד קדימה */
function drawHero(ctx, x, groundY, s, opts) {
  const o = opts || {};
  const k = s || 1;
  const S = n => Math.round(n * k);
  const step = o.walk ? Math.sin(o.walk) : 0;
  const bob = Math.round(Math.abs(step) * 4 * k);
  const base = groundY - bob;

  /* צל */
  ellipse(ctx, x, groundY + S(2), S(24), S(6), "rgba(0,0,0,.22)");

  /* גלימה - תלויה מהכתפיים עד הברכיים, מאחורי הגוף */
  for (let i = 0; i <= S(46); i++) {
    const half = Math.round(S(17) + (i / S(46)) * S(9));
    px(ctx, x - half, base - S(62) + i, half * 2, 1, GPAL.heroCloak);
  }
  /* שוליים כהים לגלימה */
  px(ctx, x - S(26), base - S(18), S(52), S(4), "#245a94");

  /* רגליים, גלויות מתחת לגלימה */
  px(ctx, x - S(12) + Math.round(step * 6 * k), base - S(20), S(9), S(20), GPAL.woodDark);
  px(ctx, x + S(3) - Math.round(step * 6 * k), base - S(20), S(9), S(20), GPAL.woodDark);
  px(ctx, x - S(14) + Math.round(step * 6 * k), base - S(5), S(13), S(5), PAL.ink);
  px(ctx, x + S(2) - Math.round(step * 6 * k), base - S(5), S(13), S(5), PAL.ink);

  /* טוניקה */
  roundRect(ctx, x - S(14), base - S(58), S(28), S(34), S(7), GPAL.heroTunic);
  px(ctx, x - S(15), base - S(30), S(30), S(5), GPAL.woodDark);

  /* זרועות */
  const armUp = o.raise ? S(16) : 0;
  roundRect(ctx, x - S(23), base - S(56) - armUp, S(9), S(26), S(4), GPAL.heroCloak);
  roundRect(ctx, x + S(14), base - S(56), S(9), S(26), S(4), GPAL.heroCloak);

  /* פנס ביד */
  const lx = x - S(19);
  const ly = base - S(58) - armUp;
  px(ctx, lx - S(1), ly - S(9), S(3), S(9), GPAL.woodDark);
  roundRect(ctx, lx - S(7), ly, S(15), S(16), S(4), GPAL.stoneDark);
  circle(ctx, lx, ly + S(8), S(5), o.dim ? GPAL.goldDark : GPAL.lantern);
  if (!o.dim) circle(ctx, lx, ly + S(8), S(11), "rgba(255,216,94,.3)");

  /* ראש */
  circle(ctx, x, base - S(72), S(15), GPAL.heroSkin);
  /* שיער */
  for (let dy = -S(15); dy <= -S(4); dy++) {
    const dx = Math.round(Math.sqrt(Math.max(0, S(15) * S(15) - dy * dy)));
    px(ctx, x - dx, base - S(72) + dy, dx * 2, 1, GPAL.heroHair);
  }
  /* עיניים ופה */
  px(ctx, x - S(7), base - S(74), S(4), S(4), PAL.ink);
  px(ctx, x + S(3), base - S(74), S(4), S(4), PAL.ink);
  px(ctx, x - S(4), base - S(66), S(8), S(2), PAL.ink);
}

/* המכשף: גבוה, גלימה סגולה, מטה עם אבן */
function drawWizard(ctx, x, groundY, s, opts) {
  const o = opts || {};
  const k = s || 1;
  const S = n => Math.round(n * k);
  const float = Math.round(Math.sin((o.t || 0) * 1.6) * 5 * k);
  const base = groundY - float;

  ellipse(ctx, x, groundY + S(4), S(34), S(7), "rgba(0,0,0,.25)");

  /* גלימה משתפלת */
  for (let i = 0; i < S(86); i++) {
    const half = Math.round(S(12) + (i / S(86)) * S(28));
    px(ctx, x - half, base - S(86) + i, half * 2, 1,
      i > S(60) ? GPAL.wizRobeDark : GPAL.wizRobe);
  }

  /* שרוולים */
  roundRect(ctx, x - S(38), base - S(64), S(14), S(34), S(6), GPAL.wizRobe);
  roundRect(ctx, x + S(24), base - S(64), S(14), S(34), S(6), GPAL.wizRobe);

  /* פנים בצל הכובע */
  circle(ctx, x, base - S(92), S(14), GPAL.wizSkin);
  px(ctx, x - S(9), base - S(95), S(5), S(4), GPAL.wizEye);
  px(ctx, x + S(4), base - S(95), S(5), S(4), GPAL.wizEye);
  /* זקן */
  for (let i = 0; i < S(22); i++) {
    const half = Math.round(S(11) * (1 - i / S(26)));
    px(ctx, x - half, base - S(84) + i, half * 2, 1, "#d9d2c4");
  }

  /* כובע מחודד */
  for (let i = 0; i < S(46); i++) {
    const half = Math.round(S(20) * (1 - i / S(46)));
    px(ctx, x - half + Math.round(i * 0.18 * k), base - S(104) - i, half * 2, 1, GPAL.wizHat);
  }
  px(ctx, x - S(24), base - S(106), S(48), S(7), GPAL.wizRobeDark);

  /* מטה */
  const sx = x + S(40);
  px(ctx, sx, base - S(96), S(6), S(96), GPAL.woodDark);
  circle(ctx, sx + S(3), base - S(100), S(9), GPAL.curse);
  circle(ctx, sx + S(3), base - S(100), S(5), "#c9a8ff");

  /* גלי קללה */
  if (o.casting) {
    for (let i = 0; i < 3; i++) {
      const r = S(16) + ((o.t * 60 + i * 26) % S(70));
      ctx.strokeStyle = "rgba(122,92,201,.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx + S(3), base - S(100), r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/* ---------- מבנים ותפאורה ---------- */

function drawCottage(ctx, x, groundY, s) {
  const k = s || 1;
  const w = Math.round(96 * k);
  const h = Math.round(66 * k);
  roundRect(ctx, x - w / 2, groundY - h, w, h, 4, GPAL.stoneLight);
  px(ctx, x - w / 2, groundY - Math.round(16 * k), w, Math.round(16 * k), GPAL.stone);

  for (let i = 0; i < Math.round(42 * k); i++) {
    const half = Math.round((w / 2 + 12 * k) * (1 - i / Math.round(42 * k)));
    px(ctx, x - half, groundY - h - i, half * 2, 1, i > Math.round(30 * k) ? GPAL.roofDark : GPAL.roof);
  }
  roundRect(ctx, x - Math.round(13 * k), groundY - Math.round(34 * k), Math.round(26 * k), Math.round(34 * k), Math.round(10 * k), GPAL.woodDark);
  px(ctx, x + Math.round(24 * k), groundY - Math.round(50 * k), Math.round(20 * k), Math.round(18 * k), GPAL.sky);
}

function drawStall(ctx, x, groundY, s, cloth) {
  const k = s || 1;
  px(ctx, x - Math.round(48 * k), groundY - Math.round(40 * k), Math.round(8 * k), Math.round(40 * k), GPAL.wood);
  px(ctx, x + Math.round(40 * k), groundY - Math.round(40 * k), Math.round(8 * k), Math.round(40 * k), GPAL.wood);
  roundRect(ctx, x - Math.round(56 * k), groundY - Math.round(52 * k), Math.round(112 * k), Math.round(16 * k), 4, cloth || GPAL.roof);
  px(ctx, x - Math.round(52 * k), groundY - Math.round(38 * k), Math.round(104 * k), Math.round(8 * k), GPAL.woodDark);
  /* סחורה */
  circle(ctx, x - Math.round(26 * k), groundY - Math.round(46 * k), Math.round(7 * k), PAL.red);
  circle(ctx, x, groundY - Math.round(46 * k), Math.round(7 * k), GPAL.gold);
  circle(ctx, x + Math.round(26 * k), groundY - Math.round(46 * k), Math.round(7 * k), PAL.green);
}

function drawTower(ctx, x, groundY, s, lit) {
  const k = s || 1;
  const w = Math.round(104 * k);
  const h = Math.round(210 * k);
  roundRect(ctx, x - w / 2, groundY - h, w, h, 6, GPAL.stone);
  for (let row = 0; row < 8; row++) {
    px(ctx, x - w / 2, groundY - h + row * Math.round(26 * k), w, Math.round(3 * k), GPAL.stoneDark);
  }
  /* קרנוֹת */
  for (let i = 0; i < 5; i++) {
    px(ctx, x - w / 2 + i * Math.round(22 * k), groundY - h - Math.round(14 * k), Math.round(14 * k), Math.round(16 * k), GPAL.stoneDark);
  }
  /* חלון */
  roundRect(ctx, x - Math.round(16 * k), groundY - Math.round(150 * k), Math.round(32 * k), Math.round(44 * k), Math.round(16 * k),
    lit ? GPAL.torch : GPAL.night);
  /* שער */
  roundRect(ctx, x - Math.round(22 * k), groundY - Math.round(52 * k), Math.round(44 * k), Math.round(52 * k), Math.round(20 * k), GPAL.woodDark);
}

function drawWell(ctx, x, groundY, s, dry) {
  const k = s || 1;
  roundRect(ctx, x - Math.round(34 * k), groundY - Math.round(30 * k), Math.round(68 * k), Math.round(30 * k), 4, GPAL.stone);
  px(ctx, x - Math.round(34 * k), groundY - Math.round(34 * k), Math.round(68 * k), Math.round(8 * k), GPAL.stoneDark);
  ellipse(ctx, x, groundY - Math.round(32 * k), Math.round(26 * k), Math.round(7 * k), dry ? GPAL.stoneDark : GPAL.water);
  px(ctx, x - Math.round(30 * k), groundY - Math.round(84 * k), Math.round(6 * k), Math.round(52 * k), GPAL.wood);
  px(ctx, x + Math.round(24 * k), groundY - Math.round(84 * k), Math.round(6 * k), Math.round(52 * k), GPAL.wood);
  for (let i = 0; i < Math.round(20 * k); i++) {
    const half = Math.round(38 * k * (1 - i / Math.round(20 * k)));
    px(ctx, x - half, groundY - Math.round(84 * k) - i, half * 2, 1, GPAL.roofDark);
  }
}

function drawChest(ctx, x, groundY, s, open) {
  const k = s || 1;
  roundRect(ctx, x - Math.round(38 * k), groundY - Math.round(34 * k), Math.round(76 * k), Math.round(34 * k), 4, GPAL.wood);
  px(ctx, x - Math.round(38 * k), groundY - Math.round(20 * k), Math.round(76 * k), Math.round(6 * k), GPAL.goldDark);
  for (let i = 0; i < Math.round(18 * k); i++) {
    const half = Math.round(38 * k * Math.sqrt(Math.max(0, 1 - Math.pow(i / Math.round(18 * k), 2))));
    px(ctx, x - half, groundY - Math.round(34 * k) - i - (open ? Math.round(14 * k) : 0), half * 2, 1, GPAL.woodDark);
  }
  if (open) {
    for (let i = 0; i < 6; i++) {
      circle(ctx, x - Math.round(24 * k) + i * Math.round(10 * k), groundY - Math.round(30 * k), Math.round(6 * k), GPAL.gold);
    }
  }
  roundRect(ctx, x - Math.round(6 * k), groundY - Math.round(24 * k), Math.round(12 * k), Math.round(14 * k), 3, GPAL.gold);
}

function drawBridge(ctx, y, s) {
  const k = s || 1;
  px(ctx, 0, y, GAME_W, Math.round(14 * k), GPAL.wood);
  px(ctx, 0, y + Math.round(14 * k), GAME_W, Math.round(5 * k), GPAL.woodDark);
  for (let x = 40; x < GAME_W; x += Math.round(96 * k)) {
    px(ctx, x, y + Math.round(18 * k), Math.round(9 * k), Math.round(120 * k), GPAL.woodDark);
  }
  for (let x = 20; x < GAME_W; x += Math.round(64 * k)) {
    px(ctx, x, y - Math.round(34 * k), Math.round(7 * k), Math.round(34 * k), GPAL.wood);
  }
  px(ctx, 0, y - Math.round(38 * k), GAME_W, Math.round(6 * k), GPAL.wood);
}

function drawGate(ctx, x, groundY, s, chained) {
  const k = s || 1;
  const w = Math.round(150 * k), h = Math.round(190 * k);
  px(ctx, x - w / 2 - Math.round(18 * k), groundY - h, Math.round(18 * k), h, GPAL.stoneDark);
  px(ctx, x + w / 2, groundY - h, Math.round(18 * k), h, GPAL.stoneDark);
  roundRect(ctx, x - w / 2, groundY - h, w, h, Math.round(22 * k), GPAL.woodDark);
  px(ctx, x - w / 2, groundY - h + Math.round(26 * k), w, Math.round(6 * k), GPAL.wood);
  for (let i = 1; i < 5; i++) {
    px(ctx, x - w / 2 + i * Math.round(30 * k), groundY - h + Math.round(40 * k), Math.round(4 * k), h - Math.round(40 * k), GPAL.wood);
  }
  if (chained) {
    /* שרשרת מחוליות, ומנעול כבד באמצע */
    for (let i = 0; i <= 10; i++) {
      const cx2 = x - w / 2 - 8 + (i / 10) * (w + 16);
      const cy2 = groundY - h * 0.62 + (i / 10) * h * 0.16;
      circle(ctx, cx2, cy2, Math.round(9 * k), GPAL.stoneLight);
      circle(ctx, cx2, cy2, Math.round(4 * k), GPAL.stoneDark);
    }
    roundRect(ctx, x - Math.round(20 * k), groundY - h * 0.6, Math.round(40 * k), Math.round(38 * k), Math.round(8 * k), GPAL.stoneDark);
    circle(ctx, x, groundY - h * 0.6 + Math.round(16 * k), Math.round(8 * k), PAL.ink);
  }
}

/* ---------- הקללה ---------- */
/* אזור מקולל מאבד צבע ומקבל ערפל סגול. תשובה נכונה מחזירה אותו. */

function applyCurse(ctx, amount) {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = `rgba(128,128,128,${amount})`;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(58,38,92,${amount * 0.34})`;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.restore();
}

/* חלקיקי קללה מרחפים */
function drawMotes(ctx, t, amount) {
  if (amount <= 0.05) return;
  for (let i = 0; i < 26; i++) {
    const x = (i * 137 + t * 12) % GAME_W;
    const y = (i * 91) % GAME_H + Math.sin(t + i) * 12;
    const size = 2 + (i % 3);
    ctx.fillStyle = `rgba(160,130,235,${0.5 * amount})`;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
}

/* ---------- השלבים ---------- */

const QUEST = [
  {
    place: "כיכר הכפר",
    intro: "המכשף קילל את הממלכה וגנב ממנה את הצבע. התושבים שכחו איך להחליט על מה להוציא כסף.",
    question: "מה ההבדל בין צורך לבין רצון?",
    answers: [
      "צורך הוא משהו שחייבים כדי לחיות, רצון הוא משהו שנעים שיהיה",
      "צורך הוא משהו יקר, רצון הוא משהו זול",
      "אין הבדל אמיתי, זו רק מילה אחרת",
      "רצון הוא משהו שקונים רק במבצע"
    ],
    correct: 0,
    win: "הצבע חוזר לכיכר. התושבים נזכרים מה הם באמת צריכים.",
    lose: "הקללה מתחזקת. נסו שוב.",
    draw(ctx, t, curse) {
      drawSky(ctx, GPAL.sky, "#cfe6f5");
      inked(ctx, c => {
        drawGround(c, 300, GPAL.grass, "#84c95e");
        px(c, 0, 330, GAME_W, 26, GPAL.path);
        drawCottage(c, 180, 300, 1.1);
        drawCottage(c, 780, 300, 0.95);
        drawApple(c, 300, 276, 2.2);
        drawHero(c, 560, 396, 1.9, {walk: t * 3, dim: curse > 0.5});
      });
    }
  },
  {
    place: "השוק הגדול",
    intro: "בשוק תלויים שלטי מבצע ענקיים. הקללה גורמת לכולם לקנות דברים שהם לא צריכים.",
    question: "מבצע אחד פלוס אחד על מוצר שלא תכננתם לקנות. חסכתם כסף?",
    answers: [
      "כן, חסכתם חמישים אחוז",
      "לא, הוצאתם כסף שלא תכננתם להוציא",
      "כן, תמיד כדאי לנצל מבצעים",
      "תלוי אם שילמתם במזומן"
    ],
    correct: 1,
    win: "השלטים נושרים. הסוחרים מתחילים לכתוב מחיר ליחידה.",
    lose: "עוד תושב יוצא מהשוק עם שק מלא בדברים מיותרים.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#e8c98a", "#f7e6c4");
      inked(ctx, c => {
        drawGround(c, 310, GPAL.path, "#dbc196");
        drawStall(c, 170, 316, 1.7, GPAL.roof);
        drawStall(c, 790, 316, 1.7, "#4f9e5c");
        drawStall(c, 480, 300, 1.35, "#8a5cc9");
        drawHero(c, 470, 400, 1.9, {walk: t * 3, dim: curse > 0.5});
      });
    }
  },
  {
    place: "בית האוצר",
    intro: "המכשף פיזר את מטבעות הממלכה בלי סדר. צריך להחזיר לכל מטבע תפקיד.",
    question: "לפי כלל חמישים־שלושים־עשרים, כמה מההכנסה הולך לחיסכון?",
    answers: ["חמישים אחוז", "שלושים אחוז", "עשרים אחוז", "עשרה אחוז"],
    correct: 2,
    win: "המטבעות מסתדרים לשלוש ערמות. לכל אחת יש תפקיד.",
    lose: "המטבעות מתגלגלים שוב לכל עבר.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#6a5f8a", "#9a8fb5");
      inked(ctx, c => {
        drawGround(c, 320, GPAL.stone, GPAL.stoneLight);
        drawChest(c, 250, 320, 1.1, curse < 0.4);
        drawCoinStack(c, 520, 320, 5, 34, 18);
        drawCoinStack(c, 620, 320, 3, 34, 18);
        drawCoinStack(c, 710, 320, 2, 34, 18);
        drawHero(c, 380, 402, 1.9, {walk: t * 3, dim: curse > 0.5, raise: true});
      });
    }
  },
  {
    place: "הבאר היבשה",
    intro: "הבאר התייבשה, ולאף אחד בכפר אין כסף בצד ליום שכזה.",
    question: "כמה כסף מומלץ שיהיה בקרן חירום של משק בית?",
    answers: [
      "הוצאות של שלושה עד שישה חודשים",
      "בדיוק אלף שקלים",
      "הוצאות של שנתיים",
      "לא צריך קרן חירום אם יש כרטיס אשראי"
    ],
    correct: 0,
    win: "המים חוזרים לבאר. עכשיו יש לכפר כרית ליום קשה.",
    lose: "הבאר נשארת יבשה.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#8fa8c4", "#cfe0ee");
      inked(ctx, c => {
        drawGround(c, 310, "#b5a88f", "#cfc2a8");
        drawWell(c, 480, 310, 1.2, curse > 0.4);
        drawTree(c, 130, 310, 1.1);
        drawHero(c, 730, 398, 1.9, {walk: t * 3, dim: curse > 0.5});
      });
    }
  },
  {
    place: "גשר הזמן",
    intro: "הגשר נבנה מחיסכון קטן שנצבר שנה אחר שנה. הקללה עצרה את הזמן.",
    question: "מה זו ריבית דריבית?",
    answers: [
      "ריבית שמשלמים פעמיים בשנה",
      "עמלה שגובים על העברת כספים",
      "ריבית שמחושבת גם על הרווחים הקודמים, לא רק על הסכום ההתחלתי",
      "ריבית שהבנק מחזיר בסוף השנה"
    ],
    correct: 2,
    win: "הזמן זורם שוב, והגשר מתארך מעצמו.",
    lose: "הגשר נעצר באמצע התהום.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#5a7fb5", "#a8c4e0");
      inked(ctx, c => {
        px(c, 0, 330, GAME_W, GAME_H - 330, "#3a4f6a");
        drawBridge(c, 300, 1);
        const grow = curse < 0.4 ? 1 : 0.45;
        drawChart(c, 560, 258, 330, 170, [1, 2, 3, 5, 8], grow, GPAL.gold);
        drawHero(c, 190, 300, 1.7, {walk: t * 3, dim: curse > 0.5});
      });
    }
  },
  {
    place: "מערת ההבטחות",
    intro: "בקירות המערה נחרטו הבטחות לרווח ענק בלי שום סיכון.",
    question: "מישהו מציע לכם השקעה עם שלוש מאות אחוז רווח מובטח ובלי סיכון. מה עושים?",
    answers: [
      "משקיעים מיד לפני שנגמר",
      "לוקחים הלוואה כדי להשקיע יותר",
      "משקיעים חצי מהכסף, ליתר ביטחון",
      "נמנעים. תשואה גבוהה בלי סיכון היא סימן מובהק להונאה"
    ],
    correct: 3,
    win: "ההבטחות נמחקות מהקיר. נשאר רק מה שאמיתי.",
    lose: "עוד כורה נכנס פנימה ולא יוצא עם כלום.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#2a2438", "#4a3f5f");
      inked(ctx, c => {
        drawGround(c, 320, "#4a4152", "#5f5468");
        for (let i = 0; i < 5; i++) {
          const h = 150 + (i % 3) * 60;
          for (let j = 0; j < h; j++) {
            const half = Math.round(34 * (1 - j / h));
            px(c, 120 + i * 190 - half, 320 - j, half * 2, 1, j > h * 0.7 ? "#6a5c80" : "#544a68");
          }
        }
        drawSign(c, 470, 150, 260, 130, "#8a5cc9");
        drawPercent(c, 470, 150, 0.9, "#8a5cc9");
        drawHero(c, 470, 404, 1.9, {walk: t * 3, dim: curse > 0.5});
      });
    }
  },
  {
    place: "שער החוב",
    intro: "שרשרת כבדה חוסמת את השער. היא נבנתה מחובות שלא הוחזרו בזמן.",
    question: "מה קורה כשלא מחזירים את מלוא חוב כרטיס האשראי בסוף החודש?",
    answers: [
      "כלום, זה שירות חינם",
      "מצטברת ריבית, ולעיתים גם ריבית על הריבית",
      "הבנק מוחק את החוב אחרי שנה",
      "מקבלים הנחה בחודש הבא"
    ],
    correct: 1,
    win: "השרשרת נשברת. השער נפתח אל המגדל.",
    lose: "השרשרת מתהדקת עוד חוליה.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#4a3f5f", "#7a6a8f");
      inked(ctx, c => {
        drawGround(c, 320, GPAL.stoneDark, GPAL.stone);
        drawGate(c, 480, 320, 1, curse > 0.4);
        drawHero(c, 190, 404, 1.9, {walk: t * 3, dim: curse > 0.5, raise: true});
      });
    }
  },
  {
    place: "מגדל המכשף",
    intro: "המכשף ממתין בראש המגדל. נשארה שאלה אחת, והיא הלב של הכול.",
    question: "אז מה זה כסף באמת?",
    answers: [
      "נייר ומתכת ששווים משהו בפני עצמם",
      "מספר שהבנק ממציא",
      "הסכמה משותפת. כולנו מסכימים שיש לו ערך, וזה עובד כל עוד מאמינים בזה",
      "משהו שרק עשירים מבינים"
    ],
    correct: 2,
    win: "המכשף מאבד את כוחו. הצבע חוזר לכל הממלכה.",
    lose: "המכשף צוחק. הקללה מתפשטת עוד.",
    draw(ctx, t, curse) {
      drawSky(ctx, curse > 0.4 ? "#241d3a" : "#6a4a8a", curse > 0.4 ? "#4a3a6a" : "#e0a06b");
      inked(ctx, c => {
        drawGround(c, 330, "#3a3247", "#4f4560");
        drawTower(c, 790, 336, 1.35, true);
        drawWizard(c, 660, 372, 1.45, {t: t, casting: curse > 0.3});
        drawHero(c, 250, 404, 2, {walk: t * 3, raise: true, dim: false});
      });
    }
  }
];

/* ---------- מנוע המשחק ---------- */

class Quest {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.reset();
  }

  reset() {
    this.stage = 0;
    this.lanterns = 3;
    this.solved = 0;
    this.cleared = new Array(QUEST.length).fill(false);
    this.curse = 1;
    this.targetCurse = 1;
    this.t = 0;
  }

  get current() {
    return QUEST[this.stage];
  }

  /* תשובה נכונה מפוגגת את הקללה בשלב הזה */
  clearStage() {
    this.cleared[this.stage] = true;
    this.solved++;
    this.targetCurse = 0;
  }

  missStage() {
    this.lanterns--;
    this.targetCurse = 1;
  }

  goTo(index) {
    this.stage = index;
    this.curse = this.cleared[index] ? 0 : 1;
    this.targetCurse = this.curse;
  }

  render(dt) {
    this.t += dt;
    /* מעבר רך בין מקולל לנקי */
    this.curse += (this.targetCurse - this.curse) * Math.min(1, dt * 3);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    this.current.draw(ctx, this.t, this.curse);
    applyCurse(ctx, this.curse);
    drawMotes(ctx, this.t, this.curse);
  }
}
