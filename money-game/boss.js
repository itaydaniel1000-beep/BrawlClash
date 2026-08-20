/* ===== קרב הדרקון =====
   הדרקון שהמכשף מזמן בסוף המסע. הוא תוקף, מתעייף, ואז נפתח חלון לשאלה.
   האמנות כאן משתמשת בכלי הציור של movie.js ו-game.js. */

const DPAL = {
  scale: "#8f2f3c",
  scaleDark: "#5f1c26",
  scaleLight: "#b84550",
  belly: "#e0b060",
  bellyDark: "#bd8f42",
  wing: "#6d2230",
  wingSkin: "#c05a68",
  horn: "#ede0c4",
  hornDark: "#c4b28e",
  claw: "#f2e8d0",
  eye: "#ffd23f",
  eyeRage: "#ff6b3f",
  fire: "#ff9d3f",
  fireHot: "#ffe066",
  fireCore: "#fff6cc",
  smoke: "#6a6070"
};

/* קשת רכה בין שתי נקודות, לצוואר ולזנב */
function taper(ctx, pts, w0, w1, color) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let k = 0; k <= steps; k++) {
      const p = (i + k / steps) / (pts.length - 1);
      const w = Math.round(w0 + (w1 - w0) * p);
      const cx = Math.round(a[0] + (b[0] - a[0]) * (k / steps));
      const cy = Math.round(a[1] + (b[1] - a[1]) * (k / steps));
      px(ctx, cx - w, cy - w, w * 2, w * 2, color);
    }
  }
}

/* קרן מעוקלת */
function horn(ctx, x, y, len, thick, dir, color, dark) {
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const w = Math.max(1, Math.round(thick * (1 - p)));
    const cx = Math.round(x + dir * i * 0.55 + dir * p * p * i * 0.3);
    const cy = Math.round(y - i * 0.85);
    px(ctx, cx - w, cy - w, w * 2, w * 2, p > 0.55 ? dark : color);
  }
}

/* כנף עור עם אצבעות. open קובע כמה היא פרושה. */
function dragonWing(ctx, x, y, s, open, flap, back) {
  const S = n => Math.round(n * s);
  const spread = 0.35 + open * 0.65;
  const lift = Math.round(flap * 18 * s);

  /* שלוש אצבעות שיוצאות מאותה נקודה */
  const fingers = [
    {len: S(150) * spread, ang: -1.15},
    {len: S(170) * spread, ang: -0.78},
    {len: S(150) * spread, ang: -0.38}
  ];

  const tips = fingers.map(f => [
    Math.round(x + Math.cos(f.ang) * f.len),
    Math.round(y + Math.sin(f.ang) * f.len) - lift
  ]);

  /* קרום בין האצבעות */
  ctx.fillStyle = back ? DPAL.wing : DPAL.wingSkin;
  ctx.beginPath();
  ctx.moveTo(x, y);
  tips.forEach(t => ctx.lineTo(t[0], t[1]));
  /* השוליים התחתונים משתפלים חזרה אל הגוף */
  ctx.lineTo(Math.round(x + S(46)), Math.round(y + S(38)));
  ctx.closePath();
  ctx.fill();

  /* גידים */
  tips.forEach(t => taper(ctx, [[x, y], t], Math.max(1, S(4)), Math.max(1, S(2)), DPAL.scaleDark));
  taper(ctx, [[x, y], [Math.round(x + S(46)), Math.round(y + S(38))]],
    Math.max(1, S(5)), Math.max(1, S(2)), DPAL.scaleDark);
}

/* להבה מהפה. p הוא מ-0 עד 1. */
function dragonFire(ctx, x, y, s, p, t) {
  if (p <= 0) return;
  const S = n => Math.round(n * s);
  const reach = S(340) * Math.min(1, p * 1.6);

  for (let i = 0; i < reach; i += 2) {
    const g = i / Math.max(1, reach);
    /* הלהבה מתרחבת ככל שהיא מתרחקת מהפה */
    const w = Math.round(S(9) + g * S(46) + Math.sin(t * 22 + i * 0.09) * S(5));
    const cx = x - i;
    const cy = Math.round(y + Math.sin(t * 13 + i * 0.05) * S(6) + g * S(10));
    const color = g < 0.24 ? DPAL.fireCore : g < 0.62 ? DPAL.fireHot : DPAL.fire;
    px(ctx, cx - 1, cy - w, 3, w * 2, color);
  }

  /* גיצים */
  for (let i = 0; i < 16; i++) {
    const g = spread(71, i);
    const d = (g * 1.3 + t * 1.5) % 1;
    const sx = Math.round(x - d * reach);
    const sy = Math.round(y + Math.sin(g * 30 + t * 7) * S(40) * d);
    px(ctx, sx, sy, Math.max(2, S(3)), Math.max(2, S(3)),
      i % 2 ? DPAL.fireHot : DPAL.fireCore);
  }
}

/* ענני עשן מהנחיריים כשהוא מתנשם */
function dragonSmoke(ctx, x, y, s, t) {
  const S = n => Math.round(n * s);
  for (let i = 0; i < 7; i++) {
    const g = spread(23, i);
    const d = (g + t * 0.42) % 1;
    const r = Math.round(S(5) + d * S(17));
    ctx.globalAlpha = 0.35 * (1 - d);
    circle(ctx, Math.round(x - d * S(90) - g * S(20)),
      Math.round(y - d * S(52) + Math.sin(g * 20) * S(8)), r, DPAL.smoke);
  }
  ctx.globalAlpha = 1;
}

/* ---------- הדרקון ---------- */

/* state: idle | wind | attack | tired | hurt | dead
   פונה שמאלה, לכיוון הגיבור. */
function drawDragon(ctx, x, groundY, s, opts) {
  const o = opts || {};
  const t = o.t || 0;
  const S = n => Math.round(n * s);
  const state = o.state || "idle";

  const dead = state === "dead";
  const tired = state === "tired";
  const attacking = state === "attack";
  const winding = state === "wind";

  /* נשימה: הגוף עולה ויורד. כשהוא עייף הנשימה כבדה ואיטית. */
  const rate = tired ? 3.4 : dead ? 0 : 1.7;
  const depth = tired ? 7 : 3;
  const breath = dead ? 0 : Math.sin(t * rate) * depth;

  /* כשהוא תוקף הוא נדחף קדימה, וכשהוא צובר כוח הוא נרתע אחורה */
  const lunge = attacking ? Math.sin(Math.min(1, (o.attackP || 0)) * Math.PI) * S(70) : 0;
  const recoil = winding ? S(26) * (o.windP || 0) : 0;
  const bx = Math.round(x - lunge + recoil);

  /* קריסה כשהוא מובס */
  const fall = dead ? Math.min(1, o.deadP || 1) : 0;
  const sink = Math.round(fall * S(46));
  const base = groundY + sink;

  const bodyY = Math.round(base - S(96) + breath - (tired ? S(16) : 0));

  ctx.save();
  if (dead) {
    /* נטוי הצידה, כמו גוף שנפל */
    ctx.translate(bx, base);
    ctx.rotate(fall * 0.22);
    ctx.translate(-bx, -base);
  }

  /* צל */
  ellipse(ctx, bx, base + S(4), S(150), S(20), "rgba(0,0,0,.28)");

  /* --- כנפיים אחוריות --- */
  const flap = dead ? -0.6 : attacking ? 1 : Math.sin(t * (tired ? 1.1 : 2.3)) * (tired ? 0.15 : 0.5);
  const openness = dead ? 0.15 : tired ? 0.3 : attacking ? 1 : 0.6;
  dragonWing(ctx, bx + S(24), bodyY - S(34), s * 0.92, openness, flap, true);

  /* --- זנב --- */
  const sway = dead ? 0 : Math.sin(t * (tired ? 1.2 : 2.1)) * S(16);
  taper(ctx, [
    [bx + S(86), bodyY + S(14)],
    [bx + S(178), bodyY + S(34) + sway],
    [bx + S(252), bodyY - S(6) + sway * 1.5],
    [bx + S(292), bodyY - S(56) + sway * 2]
  ], S(30), S(4), DPAL.scale);

  /* דוקרן בקצה הזנב */
  const tipX = bx + S(292);
  const tipY = bodyY - S(56) + sway * 2;
  ctx.fillStyle = DPAL.horn;
  ctx.beginPath();
  ctx.moveTo(tipX - S(14), tipY + S(8));
  ctx.lineTo(tipX + S(26), tipY - S(16));
  ctx.lineTo(tipX - S(8), tipY - S(14));
  ctx.closePath();
  ctx.fill();

  /* --- רגליים אחוריות --- */
  px(ctx, bx + S(34), base - S(66), S(44), S(66), DPAL.scaleDark);
  roundRect(ctx, bx + S(30), base - S(78), S(52), S(56), S(20), DPAL.scale);
  px(ctx, bx + S(28), base - S(16), S(58), S(16), DPAL.scaleDark);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = DPAL.claw;
    ctx.beginPath();
    ctx.moveTo(bx + S(24) - i * S(11), base);
    ctx.lineTo(bx + S(34) - i * S(11), base - S(11));
    ctx.lineTo(bx + S(40) - i * S(11), base);
    ctx.closePath();
    ctx.fill();
  }

  /* --- גוף --- */
  ellipse(ctx, bx, bodyY, S(94), S(62), DPAL.scale);
  ellipse(ctx, bx - S(10), bodyY + S(20), S(74), S(38), DPAL.belly);
  /* פסי בטן */
  for (let i = -3; i <= 3; i++) {
    px(ctx, bx - S(10) + i * S(19) - S(6), bodyY + S(4), S(12), S(38), DPAL.bellyDark);
  }
  ellipse(ctx, bx - S(10), bodyY + S(20), S(74), S(38), "rgba(224,176,96,.55)");

  /* קשקשים על הגב */
  for (let i = 0; i < 9; i++) {
    const g = i / 8;
    const sx = Math.round(bx - S(70) + g * S(150));
    const sy = Math.round(bodyY - S(48) + Math.sin(g * Math.PI) * -S(14));
    ctx.fillStyle = DPAL.horn;
    ctx.beginPath();
    ctx.moveTo(sx - S(9), sy + S(10));
    ctx.lineTo(sx, sy - S(15));
    ctx.lineTo(sx + S(9), sy + S(10));
    ctx.closePath();
    ctx.fill();
  }

  /* --- רגליים קדמיות --- */
  const paw = attacking ? S(28) : 0;
  px(ctx, bx - S(66), base - S(54) - paw, S(30), S(54), DPAL.scaleDark);
  roundRect(ctx, bx - S(70), base - S(66) - paw, S(38), S(44), S(15), DPAL.scaleLight);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = DPAL.claw;
    ctx.beginPath();
    ctx.moveTo(bx - S(72) + i * S(11), base - paw);
    ctx.lineTo(bx - S(80) + i * S(11), base - S(12) - paw);
    ctx.lineTo(bx - S(62) + i * S(11), base - S(10) - paw);
    ctx.closePath();
    ctx.fill();
  }

  /* --- צוואר --- */
  /* כשהוא עייף הראש צונח כמעט עד הקרקע */
  const droop = tired ? S(96) : 0;
  const deadDroop = dead ? S(150) : 0;
  const rear = winding ? -S(30) * (o.windP || 0) : 0;
  const headX = Math.round(bx - S(196) - lunge * 0.35);
  const headY = Math.round(bodyY - S(120) + droop + deadDroop + rear + breath * 1.6);

  taper(ctx, [
    [bx - S(62), bodyY - S(26)],
    [bx - S(118), bodyY - S(84) + droop * 0.45 + deadDroop * 0.4],
    [bx - S(170), headY + S(40)],
    [headX + S(18), headY + S(14)]
  ], S(34), S(21), DPAL.scale);

  /* קשקשי צוואר */
  for (let i = 0; i < 5; i++) {
    const g = i / 4;
    const nx = Math.round(bx - S(66) - g * S(126));
    const ny = Math.round(bodyY - S(38) - g * S(66) + droop * g * 0.8 + deadDroop * g * 0.7);
    ctx.fillStyle = DPAL.hornDark;
    ctx.beginPath();
    ctx.moveTo(nx - S(7), ny + S(8));
    ctx.lineTo(nx + S(2), ny - S(12));
    ctx.lineTo(nx + S(9), ny + S(6));
    ctx.closePath();
    ctx.fill();
  }

  /* --- ראש --- */
  const jaw = attacking ? S(30) : winding ? S(14) : tired ? S(9) + Math.sin(t * 7) * S(4) : S(4);

  /* גולגולת */
  roundRect(ctx, headX - S(26), headY - S(28), S(84), S(50), S(18), DPAL.scale);
  /* חוטם מוארך */
  roundRect(ctx, headX - S(66), headY - S(18), S(56), S(30), S(10), DPAL.scaleLight);
  /* לסת תחתונה, נפתחת */
  roundRect(ctx, headX - S(62), headY + S(4) + jaw, S(96), S(20), S(8), DPAL.scaleDark);
  px(ctx, headX - S(58), headY + S(6) + jaw, S(84), S(9), DPAL.belly);

  /* שיניים */
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = DPAL.claw;
    ctx.beginPath();
    ctx.moveTo(headX - S(60) + i * S(19), headY + S(10));
    ctx.lineTo(headX - S(54) + i * S(19), headY + S(22));
    ctx.lineTo(headX - S(48) + i * S(19), headY + S(10));
    ctx.closePath();
    ctx.fill();
    if (jaw > S(10)) {
      ctx.beginPath();
      ctx.moveTo(headX - S(56) + i * S(19), headY + S(6) + jaw);
      ctx.lineTo(headX - S(50) + i * S(19), headY - S(5) + jaw);
      ctx.lineTo(headX - S(44) + i * S(19), headY + S(6) + jaw);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* נחיריים */
  px(ctx, headX - S(58), headY - S(10), S(10), S(7), DPAL.scaleDark);

  /* קרניים */
  horn(ctx, headX + S(30), headY - S(24), S(46), S(9), 1, DPAL.horn, DPAL.hornDark);
  horn(ctx, headX + S(14), headY - S(26), S(36), S(7), 1, DPAL.horn, DPAL.hornDark);
  /* קוצים בלחי */
  ctx.fillStyle = DPAL.hornDark;
  ctx.beginPath();
  ctx.moveTo(headX + S(6), headY + S(16));
  ctx.lineTo(headX + S(30), headY + S(34));
  ctx.lineTo(headX + S(30), headY + S(12));
  ctx.closePath();
  ctx.fill();

  /* עין */
  if (dead) {
    /* עין עצומה */
    px(ctx, headX - S(20), headY - S(8), S(24), S(5), DPAL.scaleDark);
  } else if (tired) {
    px(ctx, headX - S(20), headY - S(10), S(24), S(6), DPAL.scaleDark);
    px(ctx, headX - S(16), headY - S(4), S(12), S(6), DPAL.eye);
  } else {
    ellipse(ctx, headX - S(8), headY - S(8), S(14), S(11), DPAL.claw);
    circle(ctx, headX - S(11), headY - S(8), S(8), attacking || winding ? DPAL.eyeRage : DPAL.eye);
    px(ctx, headX - S(13), headY - S(15), S(5), S(15), PAL.ink);
    /* גבה זועמת */
    px(ctx, headX - S(26), headY - S(22), S(34), S(6), DPAL.scaleDark);
  }

  /* --- אש ועשן --- */
  const mouthX = headX - S(66);
  const mouthY = headY + S(6) + jaw * 0.5;
  if (attacking) dragonFire(ctx, mouthX, mouthY, s, o.attackP || 0, t);
  if (tired) dragonSmoke(ctx, mouthX, mouthY, s, t);

  ctx.restore();

  /* הבזק לבן כשהוא סופג פגיעה */
  if (o.flash > 0) {
    ctx.globalAlpha = Math.min(0.75, o.flash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }
}

/* ---------- זירת הקרב ---------- */

/* מגרש הקרב: פסגת ההר, שמי סערה, לבה מתחת */
function drawArena(ctx, t, shake) {
  const sx = shake ? Math.round(Math.sin(t * 60) * shake) : 0;

  ctx.save();
  ctx.translate(sx, 0);

  drawSky(ctx, "#2a1730", "#7a3a3a");
  moon(ctx, 118, 68, 34);
  starField(ctx, 46, 17, 190);
  stormClouds(ctx, t);

  /* פסגות רחוקות */
  farRidge(ctx, 268, 74, "#3a2440", 5.1);
  farRidge(ctx, 292, 52, "#4a2c48", 2.7);

  /* תהום לוהטת מאחורי הבמה */
  for (let i = 0; i < 22; i++) {
    const g = i / 21;
    px(ctx, 0, 300 + i * 2, GAME_W, 2,
      g < 0.4 ? "#ff7a3f" : g < 0.7 ? "#d8452f" : "#7a2420");
  }
  /* בועות לבה */
  for (let i = 0; i < 12; i++) {
    const g = spread(37, i);
    const bx = Math.round(g * GAME_W);
    const by = Math.round(316 + Math.sin(t * 2 + g * 20) * 5);
    circle(ctx, bx, by, 3 + Math.round(g * 4), "#ffc45e");
  }

  inked(ctx, c => {
    /* במת אבן */
    px(c, 0, 330, GAME_W, 90, "#40354f");
    px(c, 0, 330, GAME_W, 9, "#584a68");
    cobbles(c, 340, 4, 61);
    scatterRocks(c, 330, 8, "#332a42", 89);

    /* עמודים שבורים משני הצדדים */
    [58, 902].forEach((cx, i) => {
      const h = i ? 108 : 132;
      px(c, cx - 20, 330 - h, 40, h, "#584a68");
      px(c, cx - 26, 330 - h - 12, 52, 14, "#6b5a7d");
      px(c, cx - 16, 330 - h + 8, 8, h - 8, "#4a3d5a");
    });
  });

  /* גיצים באוויר */
  for (let i = 0; i < 26; i++) {
    const g = spread(53, i);
    const y = 330 - ((g * 400 + t * 60) % 340);
    ctx.globalAlpha = 0.65 * (y / 330);
    px(ctx, Math.round(g * GAME_W + Math.sin(t + g * 12) * 12), Math.round(y), 3, 3,
      i % 3 ? "#ff9d3f" : "#ffd85e");
  }
  ctx.globalAlpha = 1;

  ctx.restore();
  vignette(ctx);
}

/* ---------- בנק שאלות הקרב ---------- */

/* שאלות קצרות בכוונה: הדרקון לא ממתין לקריאה ארוכה. */
const BOSS_QUESTIONS = [
  {q: "מה מזה צורך?", a: ["תרופה", "מדבקות", "גלידה", "בלון"], c: 0},
  {q: "מה מזה רצון?", a: ["קונסולת משחקים", "חשמל", "מים", "לחם"], c: 0},
  {q: "כמה לחיסכון בכלל 50־30־20?", a: ["20 אחוז", "30 אחוז", "50 אחוז", "5 אחוז"], c: 0},
  {q: "כמה לצרכים בכלל 50־30־20?", a: ["50 אחוז", "30 אחוז", "20 אחוז", "70 אחוז"], c: 0},
  {q: "קרן חירום מכסה כמה חודשים?", a: ["3 עד 6", "יום אחד", "10 שנים", "חצי שעה"], c: 0},
  {q: "ריבית דריבית מרוויחה גם על…", a: ["הרווחים הקודמים", "מספר הכרטיסים", "גיל החוסך", "שם הבנק"], c: 0},
  {q: "רווח מובטח בלי סיכון הוא…", a: ["סימן להונאה", "עסקה מצוינת", "זכות בחוק", "מתנה"], c: 0},
  {q: "חוב אשראי שלא הוחזר צובר…", a: ["ריבית", "נקודות", "הנחה", "ביטוח"], c: 0},
  {q: "מה הופך נייר לכסף?", a: ["הסכמה משותפת", "המשקל שלו", "הצבע", "הריח"], c: 0},
  {q: "איזה חוב מחזירים קודם?", a: ["בעל הריבית הגבוהה", "הכי ישן", "הכי חדש", "הכי קטן"], c: 0},
  {q: "מבצע על משהו שלא תכננתם הוא…", a: ["הוצאה", "חיסכון", "רווח", "השקעה"], c: 0},
  {q: "מחיר ליחידה עוזר…", a: ["להשוות מוצרים", "לשלם פחות מס", "להאריך אחריות", "לקבל שקית"], c: 0},
  {q: "תשואה גבוהה מגיעה עם…", a: ["סיכון גבוה", "ביטוח מלא", "הבטחה בכתב", "פטור ממס"], c: 0},
  {q: "מה הכי עוזר לריבית דריבית?", a: ["הרבה שנים", "יום אחד", "שעה", "שבוע"], c: 0},
  {q: "איפה מחזיקים כסף חירום?", a: ["במקום שאפשר למשוך מיד", "בהשקעה מסוכנת", "אצל שכן", "מתחת לאבן"], c: 0},
  {q: "תקציב הוא…", a: ["תוכנית להוצאות", "סוג של חוב", "עמלה", "הלוואה"], c: 0},
  {q: "100 שקלים ב-10 אחוז לשנתיים הם…", a: ["121", "120", "110", "200"], c: 0},
  {q: "קריאה להחליט מיד היא…", a: ["לחץ מכירה", "שירות ללקוח", "חובה בחוק", "הנחה"], c: 0},
  {q: "כרטיס אשראי הוא בעצם…", a: ["הלוואה קצרה", "מתנה", "חיסכון", "ביטוח"], c: 0},
  {q: "פיזור השקעות מקטין…", a: ["סיכון", "רווח", "מסים", "זמן"], c: 0},
  {q: "מה עדיף לפני קנייה גדולה?", a: ["לחכות ולחשוב", "לקנות מיד", "לקחת הלוואה", "לא להשוות"], c: 0},
  {q: "אינפלציה גורמת לכסף…", a: ["לקנות פחות", "לגדול לבד", "להיעלם", "להתכפל"], c: 0},
  {q: "מי קובע כמה שווה מטבע?", a: ["ההסכמה של כולנו", "המתכת שבו", "הגודל שלו", "הצבע שלו"], c: 0},
  {q: "חיסכון קטן וקבוע לאורך שנים…", a: ["מצטבר להרבה", "לא שווה כלום", "נעלם", "עולה כסף"], c: 0}
];

/* מערבב את סדר התשובות, כמו בשאר המשחק */
function rollBossQuestion(item) {
  const order = shuffled(item.a.map((_, i) => i));
  return {
    question: item.q,
    answers: order.map(i => item.a[i]),
    correct: order.indexOf(item.c)
  };
}

/* ---------- מנוע הקרב ---------- */

/* 15 שאלות, 10 נכונות מנצחות. מכאן נגזר מספר הלבבות: אפשר לטעות חמש פעמים
   ועדיין להגיע לעשר (5+10=15), אבל הטעות השישית כבר שוללת את הניצחון -
   ולכן היא רגע התבוסה. הלבבות משמשים גם כבריאות: מכה מהדרקון עולה לב. */
const BOSS_TARGET = 10;
const BOSS_ROUNDS = 15;
const BOSS_HEARTS = 6;

/* ---------- הגיבור בזירה ---------- */

const HERO_GROUND = 412;     /* גובה הרצפה */
const HERO_MIN_X = 52;
const HERO_MAX_X = 430;      /* מעבר לזה כבר נכנסים לדרקון */
const HERO_SPEED = 275;      /* פיקסלים לשנייה */
const JUMP_V = 585;          /* מהירות ההמראה */
const GRAVITY = 1560;        /* מספיק לקפיצה של כ-110 פיקסלים ושל 0.75 שניות */
const HERO_HALF_W = 22;
const HERO_H = 150;
const INVULN = 1.35;          /* חסינות קצרה אחרי מכה, שלא ייגמרו הלבבות ברצף */

/* ---------- מתקפות ---------- */

/* לכל מתקפה יש אזהרה לפני שהיא מזיקה, כדי שתמיד אפשר להספיק להגיב */
const ATTACKS = {
  /* גל אש שזוחל על הרצפה מכיוון הדרקון. קופצים מעליו. */
  flame: {warn: 0.85, dodge: "לקפוץ", spawn(f) {
    f.hazards.push({kind: "flame", x: 525, y: 0, w: 74, h: 54, vx: -395, live: 3.2});
  }},

  /* הזנב מטאטא את כל הרצפה, מהר ונמוך. קופצים. */
  tail: {warn: 0.95, dodge: "לקפוץ", spawn(f) {
    f.hazards.push({kind: "tail", x: 620, y: 0, w: 132, h: 34, vx: -515, live: 2.6});
  }},

  /* סלעים בוערים נופלים בנתיבים. זזים הצידה.
     הנתיב הקרוב ביותר לגיבור נשאר תמיד פנוי, אחרת אין לאן לברוח. */
  rocks: {warn: 1.05, dodge: "לזוז", spawn(f) {
    const lanes = [90, 175, 260, 345, 420];
    const safe = lanes.reduce((best, x) =>
      Math.abs(x - f.hero.x) < Math.abs(best - f.hero.x) ? x : best, lanes[0]);
    const hit = shuffled(lanes.filter(x => x !== safe)).slice(0, 3);
    hit.forEach((x, i) => {
      f.hazards.push({kind: "rock", x: x, y: 470, w: 40, h: 40, vy: -560,
        delay: i * 0.26, live: 3});
    });
  }}
};

const ATTACK_KINDS = ["flame", "tail", "rocks"];

class DragonFight {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.reset();
  }

  reset() {
    this.correct = 0;
    this.wrong = 0;
    this.round = 0;
    this.hearts = BOSS_HEARTS;
    this.questions = shuffled(BOSS_QUESTIONS).slice(0, BOSS_ROUNDS).map(q => rollBossQuestion(q));

    this.t = 0;
    this.phase = "intro";   /* intro | combat | tired | strike | hit | won | lost */
    this.phaseT = 0;
    this.flash = 0;
    this.shake = 0;
    this.deadP = 0;
    this.heroHurt = 0;

    /* הגיבור */
    this.hero = {x: 150, y: 0, vy: 0, onGround: true, invuln: 0, run: 0};
    this.input = {left: false, right: false};

    /* המתקפה הנוכחית */
    this.hazards = [];
    this.queue = [];
    this.warn = null;
    this.hitsTaken = 0;
    this.combatPending = true;

    /* המנוע רק מדווח אירועי קול; הממשק הוא זה שמנגן */
    this.sfx = [];
  }

  /* מרוקן את תור הצלילים */
  drainSfx() {
    const out = this.sfx;
    this.sfx = [];
    return out;
  }

  get question() {
    return this.questions[Math.min(this.round, this.questions.length - 1)];
  }

  get done() {
    return this.phase === "won" || this.phase === "lost";
  }

  /* בשלב ההתחמקות הדרקון ער ותוקף; רק אחריו הוא מתנשם */
  get dodging() {
    return this.phase === "combat";
  }

  setPhase(name) {
    this.phase = name;
    this.phaseT = 0;
    if (name === "combat") this.startCombat();
    if (name === "tired") {
      this.hazards = [];
      this.queue = [];
      this.warn = null;
    }
  }

  /* ---------- קלט ---------- */

  press(action) {
    if (action === "jump") this.jump();
    else this.input[action] = true;
  }

  release(action) {
    if (action !== "jump") this.input[action] = false;
  }

  jump() {
    if (!this.dodging) return;
    if (!this.hero.onGround) return;
    this.hero.vy = JUMP_V;
    this.hero.onGround = false;
    this.sfx.push("jump");
  }

  /* ---------- מחזור המתקפות ---------- */

  /* ככל שמתקדמים, יותר מתקפות בסיבוב ופחות זמן אזהרה */
  startCombat() {
    const wave = this.round < 4 ? 1 : 2;
    const rush = this.round < 4 ? 1 : this.round < 9 ? 0.9 : 0.8;

    this.queue = shuffled(ATTACK_KINDS).slice(0, wave).map((kind, i) => ({
      kind: kind,
      at: i * 1.85,
      warn: ATTACKS[kind].warn * rush,
      fired: false,
      warned: false
    }));
    this.hazards = [];
    this.warn = null;
  }

  /* מריץ את התור: אזהרה, ואז המתקפה עצמה */
  updateCombat(dt) {
    let pending = false;

    this.queue.forEach(item => {
      if (item.fired) return;
      pending = true;

      if (!item.warned && this.phaseT >= item.at) {
        item.warned = true;
        this.warn = {kind: item.kind, dodge: ATTACKS[item.kind].dodge, t: 0, len: item.warn};
        this.sfx.push("warn");
      }
      if (item.warned && this.phaseT >= item.at + item.warn) {
        item.fired = true;
        ATTACKS[item.kind].spawn(this);
        this.shake = 4;
        this.sfx.push(item.kind === "rocks" ? "rumble" : item.kind === "tail" ? "sweep" : "fire");
        if (this.warn && this.warn.kind === item.kind) this.warn = null;
      }
    });

    if (this.warn) this.warn.t += dt;

    /* השלב נגמר כשכל המתקפות ירו וכל הסכנות התפוגגו */
    this.combatPending = pending || this.hazards.length > 0;
    return this.combatPending;
  }

  /* ---------- פיזיקה ---------- */

  updateHero(dt) {
    const h = this.hero;
    h.invuln = Math.max(0, h.invuln - dt);

    if (this.dodging) {
      const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      h.x = Math.max(HERO_MIN_X, Math.min(HERO_MAX_X, h.x + dir * HERO_SPEED * dt));
      h.run = dir ? h.run + dt * 9 : 0;
    } else {
      h.run = 0;
    }

    /* כבידה פועלת תמיד, כדי שקפיצה תמיד תסתיים */
    if (!h.onGround) {
      h.vy -= GRAVITY * dt;
      h.y += h.vy * dt;
      if (h.y <= 0) {
        h.y = 0;
        h.vy = 0;
        h.onGround = true;
      }
    }
  }

  updateHazards(dt) {
    this.hazards.forEach(z => {
      if (z.delay > 0) {
        z.delay -= dt;
        return;
      }
      z.live -= dt;
      if (z.vx) z.x += z.vx * dt;
      if (z.vy) {
        z.y += z.vy * dt;
        if (z.y <= 0) z.live = Math.min(z.live, 0.35);   /* התרסקות קצרה על הרצפה */
      }
    });
    this.hazards = this.hazards.filter(z => z.live > 0 && z.x > -220 && z.x < 1180);
  }

  /* מלבן הפגיעה של הגיבור */
  heroBox() {
    const h = this.hero;
    return {
      x0: h.x - HERO_HALF_W, x1: h.x + HERO_HALF_W,
      y0: h.y, y1: h.y + HERO_H
    };
  }

  checkHits() {
    if (this.hero.invuln > 0) return;
    const b = this.heroBox();

    for (const z of this.hazards) {
      if (z.delay > 0) continue;
      const zx0 = z.x - z.w / 2;
      const zx1 = z.x + z.w / 2;
      const zy0 = z.y;
      const zy1 = z.y + z.h;
      if (b.x1 > zx0 && b.x0 < zx1 && b.y0 < zy1 && b.y1 > zy0) {
        this.takeHit();
        return;
      }
    }
  }

  takeHit() {
    this.hearts--;
    this.hitsTaken++;
    this.hero.invuln = INVULN;
    this.heroHurt = 1;
    this.shake = 8;
    this.sfx.push("hurt");
    /* דחיפה אחורה, אבל לא אל מחוץ לזירה */
    this.hero.x = Math.max(HERO_MIN_X, this.hero.x - 46);
  }

  /* ---------- שאלות ---------- */

  /* השחקן ענה. מחזיר "win" / "lose" / null */
  answer(right) {
    if (right) {
      this.correct++;
      this.flash = 0.75;
      this.shake = 5;
      this.setPhase("strike");
    } else {
      this.wrong++;
      this.hearts--;
      this.heroHurt = 1;
      this.shake = 7;
      this.setPhase("hit");
    }
    this.round++;

    if (this.correct >= BOSS_TARGET) return "win";
    if (this.hearts <= 0) return "lose";
    if (this.round >= BOSS_ROUNDS) return this.correct >= BOSS_TARGET ? "win" : "lose";
    return null;
  }

  finish(won) {
    this.hazards = [];
    this.warn = null;
    this.setPhase(won ? "won" : "lost");
  }

  /* ---------- ציור ---------- */

  drawHazards(ctx) {
    this.hazards.forEach(z => {
      if (z.delay > 0) return;
      const y = HERO_GROUND - z.y;

      if (z.kind === "flame") {
        /* גל אש מתגלגל */
        for (let i = 0; i < z.w; i += 3) {
          const g = i / z.w;
          const hh = Math.round(z.h * (0.55 + 0.45 * Math.sin(g * 3.1 + this.t * 16)));
          px(ctx, Math.round(z.x - z.w / 2 + i), y - hh, 4, hh,
            g < 0.3 ? "#ff7a3f" : g < 0.7 ? "#ffb347" : "#ffe066");
        }
        for (let i = 0; i < 9; i++) {
          const g = spread(61, i);
          px(ctx, Math.round(z.x - z.w / 2 + g * z.w),
            Math.round(y - z.h - ((g * 7 + this.t * 2) % 1) * 34), 4, 4, "#ffd85e");
        }
      } else if (z.kind === "tail") {
        /* הזנב חולף נמוך */
        ellipse(ctx, z.x, y - z.h / 2, z.w / 2, z.h / 2, DPAL.scale);
        ellipse(ctx, z.x, y - z.h / 2, z.w / 2 - 8, z.h / 2 - 5, DPAL.scaleLight);
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = DPAL.horn;
          ctx.beginPath();
          ctx.moveTo(z.x + i * 26 - 7, y - z.h);
          ctx.lineTo(z.x + i * 26, y - z.h - 13);
          ctx.lineTo(z.x + i * 26 + 7, y - z.h);
          ctx.closePath();
          ctx.fill();
        }
        /* אבק מאחור */
        for (let i = 0; i < 7; i++) {
          const g = spread(43, i);
          ctx.globalAlpha = 0.4;
          circle(ctx, Math.round(z.x + z.w / 2 + g * 60), y - Math.round(g * 22), 4 + Math.round(g * 5), "#6a6070");
        }
        ctx.globalAlpha = 1;
      } else if (z.kind === "rock") {
        /* סלע בוער, עם צל שמתכווץ ככל שהוא מתקרב */
        const shadow = Math.max(6, 26 - Math.round(z.y / 20));
        ellipse(ctx, z.x, HERO_GROUND + 2, shadow, Math.round(shadow / 3), "rgba(0,0,0,.35)");
        circle(ctx, z.x, y - z.h / 2, z.h / 2, "#5a4a52");
        circle(ctx, z.x - 5, y - z.h / 2 - 4, z.h / 4, "#7a6672");
        for (let i = 0; i < 6; i++) {
          const g = spread(29, i);
          px(ctx, Math.round(z.x - 14 + g * 28),
            Math.round(y + 6 + ((g * 5 + this.t * 3) % 1) * 26), 4, 6,
            i % 2 ? "#ff9d3f" : "#ffd85e");
        }
      }
    });
  }

  /* אזהרה לפני מתקפה: אומרת גם מה לעשות */
  drawWarning(ctx) {
    const w = this.warn;
    if (!w) return;
    const p = Math.min(1, w.t / w.len);
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(w.t * 12));

    ctx.globalAlpha = pulse;
    if (w.kind === "rocks") {
      /* פס אזהרה בשמיים */
      px(ctx, 0, 40, GAME_W, 5, "#ffd23f");
    } else {
      /* פס אזהרה על הרצפה */
      px(ctx, 0, HERO_GROUND - 4, GAME_W, 5, "#ff6b3f");
    }
    ctx.globalAlpha = 1;

    /* מד זמן שמתמלא */
    const barW = 190;
    const x0 = Math.round(GAME_W / 2 - barW / 2);
    px(ctx, x0 - 3, 57, barW + 6, 20, PAL.ink);
    px(ctx, x0, 60, barW, 14, "#2a2136");
    px(ctx, x0, 60, Math.round(barW * p), 14, w.kind === "rocks" ? "#ffd23f" : "#ff6b3f");

    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = PAL.ink;
    ctx.fillText(w.dodge, GAME_W / 2 + 2, 96);
    ctx.fillStyle = "#ffe08a";
    ctx.fillText(w.dodge, GAME_W / 2, 94);
    ctx.textAlign = "start";
  }

  render(dt) {
    this.t += dt;
    this.phaseT += dt;
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shake = Math.max(0, this.shake - dt * 14);
    this.heroHurt = Math.max(0, this.heroHurt - dt * 1.6);
    if (this.phase === "won") this.deadP = Math.min(1, this.deadP + dt * 0.9);

    this.updateHero(dt);
    if (this.dodging) {
      this.updateCombat(dt);
      this.updateHazards(dt);
      this.checkHits();
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    drawArena(ctx, this.t, this.shake);

    const sx = this.shake ? Math.round(Math.sin(this.t * 60) * this.shake) : 0;
    ctx.save();
    ctx.translate(sx, 0);

    /* מצב הדרקון נגזר משלב הקרב */
    let state = "idle";
    let attackP = 0;
    let windP = 0;

    if (this.phase === "combat") {
      /* ער ותוקף: נרתע בזמן אזהרה, מסתער כשהמתקפה יוצאת */
      if (this.warn) {
        state = "wind";
        windP = Math.min(1, this.warn.t / Math.max(0.01, this.warn.len));
      } else if (this.hazards.length) {
        state = "attack";
        attackP = 0.7;
      }
    } else if (this.phase === "tired" || this.phase === "strike" || this.phase === "hit") {
      state = "tired";
    } else if (this.phase === "won") {
      state = "dead";
    }

    /* הגיבור. מהבהב כשהוא חסין אחרי מכה. */
    const h = this.hero;
    const blink = h.invuln > 0 && Math.floor(h.invuln * 14) % 2 === 0;
    if (!blink) {
      inked(ctx, c => {
        drawHero(c, Math.round(h.x), Math.round(HERO_GROUND - h.y), 2.05, {
          walk: this.phase === "intro" ? this.t * 3 : h.run,
          raise: this.phase === "strike" || !h.onGround,
          dim: this.hearts <= 2
        });
      });
    }

    drawDragon(ctx, 575, 404, 1.18, {
      t: this.t,
      state: state,
      attackP: attackP,
      windP: windP,
      deadP: this.deadP,
      flash: this.flash
    });

    if (this.dodging) {
      this.drawHazards(ctx);
      this.drawWarning(ctx);
    }

    /* חרב אור כשהתשובה נכונה */
    if (this.phase === "strike" && this.phaseT < 0.5) {
      const p = this.phaseT / 0.5;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = "#ffe9a8";
      ctx.save();
      ctx.translate(470, 210);
      ctx.rotate(-0.6 + p * 0.5);
      ctx.fillRect(-260, -9, 520, 18);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    /* מסך אדום כשסופגים מכה */
    if (this.heroHurt > 0) {
      ctx.globalAlpha = this.heroHurt * 0.4;
      ctx.fillStyle = "#c0202a";
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.globalAlpha = 1;
    }
  }
}
