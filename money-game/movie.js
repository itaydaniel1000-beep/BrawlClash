/* ===== מנוע סרטוני אנימציה - סצנות מצוירות =====
   סיפור שמסופר בסצנות עם דמויות שמדגימות, בלי מנחים ובלי כתוביות.
   כל ציור מקבל קו מתאר שחור עבה, צבעים שטוחים וצורות מעוגלות.
   קאטים חדים בין שוטים. */

const MOVIE_W = 960;
const MOVIE_H = 540;

const PAL = {
  ink: "#1a1f2e",

  skyDawnTop: "#e8734a",
  skyDawnBot: "#f7c98b",
  skyDayTop: "#5cb3e8",
  skyDayBot: "#bfe6f7",
  skyDuskTop: "#6a4a8a",
  skyDuskBot: "#e0896b",
  skyNightTop: "#1b2340",
  skyNightBot: "#3a4a70",
  skyWarmTop: "#c9a05a",
  skyWarmBot: "#f0d9a8",

  sun: "#ffd85e",
  cloud: "#ffffff",
  cloudShade: "#dceaf5",

  grass: "#6ab04c",
  grassDark: "#4a8535",
  grassLight: "#84c95e",
  dirt: "#a87848",
  dirtDark: "#8a5f36",
  stone: "#9aa5b1",
  stoneDark: "#71808f",
  stoneFar: "#b8c2cc",
  snow: "#f2f7fb",

  skin: "#f0c090",
  skinDark: "#d19a63",
  hair: "#40301f",
  hairLight: "#6b4f30",

  red: "#d8503f",
  redLight: "#e87868",
  green: "#4f9e5c",
  blue: "#3f7fd8",
  purple: "#8a5cc9",
  teal: "#3fa8a0",

  gold: "#f5c542",
  goldDark: "#c99a1f",
  goldLight: "#ffe08a",
  silver: "#d5dce6",
  silverDark: "#9aa6b5",

  paper: "#f5eeda",
  paperInk: "#3d6b4a",
  wood: "#a3763f",
  woodDark: "#7a5730",
  shell: "#f7e6d0",
  shellDark: "#c9a888",
  screen: "#2ad1a0",
  cheese: "#f5c542"
};

/* ---------- כלי ציור ---------- */

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  const RY = Math.round(ry);
  for (let dy = -RY; dy <= RY; dy++) {
    const k = Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)));
    const dx = Math.round(rx * k);
    if (dx > 0) ctx.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2, 1);
  }
}

function circle(ctx, cx, cy, r, color) {
  ellipse(ctx, cx, cy, r, r, color);
}

/* מלבן עם פינות מעוגלות, שורה שורה */
function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    let inset = 0;
    if (j < r) inset = Math.round(r - Math.sqrt(r * r - (r - j) * (r - j)));
    else if (j >= h - r) {
      const d = j - (h - r - 1);
      inset = Math.round(r - Math.sqrt(Math.max(0, r * r - d * d)));
    }
    ctx.fillRect(Math.round(x + inset), Math.round(y + j), Math.round(w - inset * 2), 1);
  }
}

/* ---------- מערכת קווי המתאר ---------- */
/* מציירים לקנבס נסתר, מפיקים ממנו צללית שחורה, מטביעים אותה סביב,
   ומניחים את הצבע מעליה. כך כל צורה מקבלת קו מתאר נקי. */

const _maskCanvas = document.createElement("canvas");
const _inkCanvas = document.createElement("canvas");
_maskCanvas.width = _inkCanvas.width = MOVIE_W;
_maskCanvas.height = _inkCanvas.height = MOVIE_H;

const OUTLINE_RING = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1]
];

function inked(ctx, drawFn, thickness) {
  const t = thickness || 3;
  const mask = _maskCanvas.getContext("2d");
  const ink = _inkCanvas.getContext("2d");

  mask.clearRect(0, 0, MOVIE_W, MOVIE_H);
  mask.imageSmoothingEnabled = false;
  drawFn(mask);

  ink.clearRect(0, 0, MOVIE_W, MOVIE_H);
  ink.globalCompositeOperation = "source-over";
  ink.drawImage(_maskCanvas, 0, 0);
  ink.globalCompositeOperation = "source-in";
  ink.fillStyle = PAL.ink;
  ink.fillRect(0, 0, MOVIE_W, MOVIE_H);
  ink.globalCompositeOperation = "source-over";

  OUTLINE_RING.forEach(d => ctx.drawImage(_inkCanvas, d[0] * t, d[1] * t));
  ctx.drawImage(_maskCanvas, 0, 0);
}

/* ---------- רקעים ---------- */

function drawSky(ctx, top, bottom) {
  const bands = 20;
  const a = hexToRgb(top);
  const b = hexToRgb(bottom);
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    px(ctx, 0, (MOVIE_H / bands) * i, MOVIE_W, MOVIE_H / bands + 1,
      rgbToHex(
        Math.round(a.r + (b.r - a.r) * k),
        Math.round(a.g + (b.g - a.g) * k),
        Math.round(a.b + (b.b - a.b) * k)
      ));
  }
}

function hexToRgb(h) {
  return {r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16)};
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function drawSun(ctx, x, y, r) {
  circle(ctx, x, y, r, PAL.sun);
}

/* ענן בנוי מכמה עיגולים - צורה רכה ולא מלבנית */
function drawCloud(ctx, x, y, s) {
  const k = s || 1;
  circle(ctx, x, y, 26 * k, PAL.cloud);
  circle(ctx, x + 30 * k, y - 10 * k, 32 * k, PAL.cloud);
  circle(ctx, x + 66 * k, y + 2 * k, 24 * k, PAL.cloud);
  px(ctx, x - 26 * k, y, 116 * k, 22 * k, PAL.cloud);
  px(ctx, x - 20 * k, y + 14 * k, 104 * k, 8 * k, PAL.cloudShade);
}

/* גבעה מעוגלת - שכבת עומק ברקע */
function drawHill(ctx, cx, baseY, w, h, color) {
  ellipse(ctx, cx, baseY, w / 2, h, color);
  px(ctx, cx - w / 2, baseY, w, MOVIE_H - baseY, color);
}

function drawMountain(ctx, x, baseY, w, h, color, shade, withSnow) {
  for (let i = 0; i < h; i++) {
    const half = Math.round((w / 2) * (1 - i / h));
    px(ctx, x - half, baseY - i, half * 2, 1, color);
    if (half > 8) px(ctx, x - half, baseY - i, Math.round(half * 0.45), 1, shade);
  }
  if (withSnow) {
    const cap = Math.round(h * 0.22);
    for (let i = h - cap; i < h; i++) {
      const half = Math.round((w / 2) * (1 - i / h));
      px(ctx, x - half, baseY - i, half * 2, 1, PAL.snow);
    }
  }
}

function drawGround(ctx, y, main, light) {
  px(ctx, 0, y, MOVIE_W, MOVIE_H - y, main);
  px(ctx, 0, y, MOVIE_W, 8, light);
}

/* עץ עגול עם גזע */
function drawTree(ctx, x, groundY, s) {
  const k = s || 1;
  px(ctx, x - 8 * k, groundY - 52 * k, 16 * k, 52 * k, PAL.wood);
  px(ctx, x - 8 * k, groundY - 52 * k, 6 * k, 52 * k, PAL.woodDark);
  circle(ctx, x, groundY - 82 * k, 42 * k, PAL.grass);
  circle(ctx, x - 32 * k, groundY - 62 * k, 28 * k, PAL.grass);
  circle(ctx, x + 32 * k, groundY - 62 * k, 28 * k, PAL.grass);
  circle(ctx, x - 14 * k, groundY - 98 * k, 24 * k, PAL.grassLight);
}

function drawHut(ctx, x, groundY, s) {
  const k = s || 1;
  px(ctx, x - 44 * k, groundY - 56 * k, 88 * k, 56 * k, PAL.dirt);
  px(ctx, x - 44 * k, groundY - 56 * k, 88 * k, 10 * k, PAL.dirtDark);
  for (let i = 0; i < 34 * k; i++) {
    const half = Math.round(56 * k * (1 - i / (34 * k)));
    px(ctx, x - half, groundY - 56 * k - i, half * 2, 1, PAL.wood);
  }
  roundRect(ctx, x - 13 * k, groundY - 32 * k, 26 * k, 32 * k, 10 * k, PAL.woodDark);
}

function drawBirds(ctx, t, x, y, spread) {
  for (let i = 0; i < 4; i++) {
    const bx = (x + i * spread + t * 14) % (MOVIE_W + 140) - 70;
    const by = y + Math.sin(t * 1.3 + i) * 10 + i * 18;
    px(ctx, bx, by, 10, 3, PAL.ink);
    px(ctx, bx + 10, by - 4, 8, 3, PAL.ink);
    px(ctx, bx + 18, by, 10, 3, PAL.ink);
  }
}

/* ---------- דמות ---------- */
/* גובה כ-150 פיקסלים בגודל מלא, ראש עגול, פנים מלאות הבעה */

function drawPerson(ctx, x, groundY, o) {
  const opts = o || {};
  const u = opts.size || 1;
  const S = n => Math.round(n * u);

  const shirt = opts.shirt || PAL.red;
  const pants = opts.pants || PAL.blue;
  const skin = opts.skin || PAL.skin;
  const hair = opts.hair || PAL.hair;
  const walk = opts.walk || 0;
  const dir = opts.flip ? -1 : 1;

  const swing = Math.round(Math.sin(walk) * 11 * u);
  const bob = Math.round(Math.abs(Math.sin(walk)) * 5 * u);
  const base = groundY - bob;

  const legH = S(44);
  const torsoW = S(46);
  const torsoH = S(52);
  const headR = S(25);

  const legTop = base - legH;
  const torsoTop = legTop - torsoH;
  const headCy = torsoTop - headR + S(4);

  /* רגליים */
  roundRect(ctx, x - S(19) + swing, legTop, S(17), legH, S(7), pants);
  roundRect(ctx, x + S(2) - swing, legTop, S(17), legH, S(7), pants);
  roundRect(ctx, x - S(23) + swing, base - S(11), S(24), S(11), S(5), PAL.ink);
  roundRect(ctx, x + S(1) - swing, base - S(11), S(24), S(11), S(5), PAL.ink);

  /* גוף */
  roundRect(ctx, x - torsoW / 2, torsoTop, torsoW, torsoH, S(14), shirt);

  /* זרועות */
  const armSwing = Math.round(Math.sin(walk + Math.PI) * 8 * u);
  if (opts.armUp) {
    roundRect(ctx, x - torsoW / 2 - S(13), torsoTop - S(26), S(14), S(46), S(7), shirt);
    circle(ctx, x - torsoW / 2 - S(6), torsoTop - S(30), S(9), skin);
    roundRect(ctx, x + torsoW / 2 - S(1), torsoTop + S(6), S(14), S(40), S(7), shirt);
    circle(ctx, x + torsoW / 2 + S(6), torsoTop + S(48), S(9), skin);
  } else {
    roundRect(ctx, x - torsoW / 2 - S(13), torsoTop + S(6) + armSwing, S(14), S(40), S(7), shirt);
    roundRect(ctx, x + torsoW / 2 - S(1), torsoTop + S(6) - armSwing, S(14), S(40), S(7), shirt);
    circle(ctx, x - torsoW / 2 - S(6), torsoTop + S(48) + armSwing, S(9), skin);
    circle(ctx, x + torsoW / 2 + S(6), torsoTop + S(48) - armSwing, S(9), skin);
  }

  /* צוואר */
  px(ctx, x - S(8), headCy + headR - S(6), S(16), S(12), skin);

  /* ראש */
  circle(ctx, x, headCy, headR, skin);

  /* שיער - כיפה על החלק העליון */
  for (let dy = -headR; dy <= -headR * 0.15; dy++) {
    const k = Math.sqrt(Math.max(0, 1 - (dy * dy) / (headR * headR)));
    const dx = Math.round(headR * k);
    px(ctx, x - dx, headCy + dy, dx * 2, 1, hair);
  }
  px(ctx, x - headR, headCy - S(6), S(6), S(12), hair);
  px(ctx, x + headR - S(6), headCy - S(6), S(6), S(12), hair);

  /* עיניים */
  const blink = Math.sin(walk * 0.5 + x * 0.07) > 0.95;
  const eyeY = headCy - S(1);
  [-1, 1].forEach(side => {
    const ex = x + side * S(9) + dir * S(2);
    if (blink) {
      px(ctx, ex - S(5), eyeY, S(10), S(3), PAL.ink);
    } else {
      circle(ctx, ex, eyeY, S(6), "#ffffff");
      circle(ctx, ex + dir * S(2), eyeY, S(4), PAL.ink);
    }
  });

  /* גבות */
  const browY = eyeY - S(11);
  [-1, 1].forEach((side, i) => {
    const ex = x + side * S(9) + dir * S(2);
    const tilt = opts.sad ? (side < 0 ? S(3) : -S(1)) : 0;
    px(ctx, ex - S(6), browY + tilt, S(12), S(3), hair);
  });

  /* פה */
  const mouthY = headCy + S(11);
  if (opts.sad) {
    px(ctx, x - S(7), mouthY + S(3), S(14), S(3), PAL.ink);
    px(ctx, x - S(10), mouthY, S(4), S(3), PAL.ink);
    px(ctx, x + S(6), mouthY, S(4), S(3), PAL.ink);
  } else if (opts.happy) {
    px(ctx, x - S(8), mouthY, S(16), S(4), PAL.ink);
    px(ctx, x - S(11), mouthY - S(3), S(4), S(3), PAL.ink);
    px(ctx, x + S(7), mouthY - S(3), S(4), S(3), PAL.ink);
  } else {
    px(ctx, x - S(6), mouthY, S(12), S(3), PAL.ink);
  }

  return {headTop: headCy - headR, handY: torsoTop - S(30), base: base};
}

/* ---------- חפצים ---------- */

function drawApple(ctx, x, y, s) {
  const k = s || 1;
  ellipse(ctx, x, y, 20 * k, 19 * k, PAL.red);
  ellipse(ctx, x - 7 * k, y - 6 * k, 6 * k, 5 * k, PAL.redLight);
  px(ctx, x - 2 * k, y - 28 * k, 5 * k, 12 * k, PAL.woodDark);
  ellipse(ctx, x + 13 * k, y - 25 * k, 13 * k, 6 * k, PAL.green);
}

function drawBasket(ctx, x, y, s) {
  const k = s || 1;
  drawApple(ctx, x - 15 * k, y - 26 * k, k * 0.9);
  drawApple(ctx, x + 15 * k, y - 26 * k, k * 0.9);
  drawApple(ctx, x, y - 34 * k, k * 0.9);
  roundRect(ctx, x - 32 * k, y - 22 * k, 64 * k, 30 * k, 8 * k, PAL.wood);
  px(ctx, x - 32 * k, y - 12 * k, 64 * k, 5 * k, PAL.woodDark);
  px(ctx, x - 32 * k, y - 2 * k, 64 * k, 5 * k, PAL.woodDark);
}

function drawCheese(ctx, x, y, s) {
  const k = s || 1;
  px(ctx, x - 26 * k, y - 12 * k, 52 * k, 26 * k, PAL.cheese);
  px(ctx, x - 26 * k, y - 18 * k, 52 * k, 8 * k, PAL.goldLight);
  circle(ctx, x - 12 * k, y + 2 * k, 6 * k, PAL.goldDark);
  circle(ctx, x + 9 * k, y - 3 * k, 4 * k, PAL.goldDark);
}

function drawFish(ctx, x, y, s) {
  const k = s || 1;
  ellipse(ctx, x, y, 30 * k, 17 * k, PAL.silver);
  for (let i = 0; i < 16 * k; i++) {
    const hh = Math.round(i * 1.1);
    px(ctx, x + 28 * k + i, y - hh, Math.max(1, k), hh * 2, PAL.silverDark);
  }
  ellipse(ctx, x, y - 17 * k, 12 * k, 7 * k, PAL.silverDark);
  circle(ctx, x - 15 * k, y - 4 * k, 5 * k, "#ffffff");
  circle(ctx, x - 15 * k, y - 4 * k, 3 * k, PAL.ink);
}

function drawShoe(ctx, x, y, s) {
  const k = s || 1;
  roundRect(ctx, x - 32 * k, y - 8 * k, 64 * k, 20 * k, 8 * k, PAL.wood);
  px(ctx, x - 32 * k, y + 6 * k, 64 * k, 6 * k, PAL.ink);
  roundRect(ctx, x - 14 * k, y - 30 * k, 32 * k, 24 * k, 9 * k, PAL.wood);
  px(ctx, x - 9 * k, y - 22 * k, 22 * k, 4 * k, PAL.woodDark);
}

function drawShell(ctx, x, y, s) {
  const k = s || 1;
  const h = Math.round(22 * k);
  const maxHalf = Math.round(32 * k);
  const bottom = y + Math.round(h / 2);
  const halves = [];

  for (let i = 0; i <= h; i++) halves.push(Math.round(maxHalf * Math.pow(i / h, 0.5)));
  for (let i = 0; i <= h; i++) px(ctx, x - halves[i], bottom - i, halves[i] * 2, 1, PAL.shell);

  for (let r = -3; r <= 3; r++) {
    if (!r) continue;
    for (let i = 0; i <= h; i++) {
      px(ctx, x + (halves[i] * r) / 3.4, bottom - i, Math.max(1, Math.round(k)), 1, PAL.shellDark);
    }
  }
  for (let b = 0; b <= 7; b++) {
    circle(ctx, x - maxHalf + (b * maxHalf * 2) / 7, bottom - h, Math.max(2, 2.6 * k), PAL.shell);
  }
}

function drawCoin(ctx, x, y, r, squash) {
  const w = Math.max(1, Math.round(r * (squash === undefined ? 1 : squash)));
  ellipse(ctx, x, y, w, r, PAL.gold);
  if (w > r * 0.3) {
    ellipse(ctx, x, y, w * 0.72, r * 0.72, PAL.goldDark);
    ellipse(ctx, x, y, w * 0.58, r * 0.58, PAL.goldLight);
  }
}

function drawCoinStack(ctx, x, baseY, count, halfW, step) {
  for (let i = 0; i < count; i++) {
    const cy = baseY - i * step;
    ellipse(ctx, x, cy, halfW, step * 0.6, PAL.gold);
    px(ctx, x - halfW, cy + step * 0.28, halfW * 2, 3, PAL.goldDark);
  }
}

function drawBill(ctx, x, y, w, h) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 8, PAL.paper);
  ctx.strokeStyle = PAL.paperInk;
  ctx.lineWidth = 3;
  ctx.strokeRect(Math.round(x - w / 2) + 12, Math.round(y - h / 2) + 12, w - 24, h - 24);
  circle(ctx, x, y, h * 0.24, PAL.paperInk);
  px(ctx, x - w / 2 + 24, y - 12, 14, 24, PAL.paperInk);
  px(ctx, x + w / 2 - 38, y - 12, 14, 24, PAL.paperInk);
}

function drawCard(ctx, x, y, w, h) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 14, PAL.blue);
  roundRect(ctx, x - w / 2 + 18, y - h / 2 + 24, 48, 36, 6, PAL.gold);
  px(ctx, x - w / 2 + 34, y - h / 2 + 24, 5, 36, PAL.goldDark);
  px(ctx, x - w / 2 + 18, y - h / 2 + 40, 48, 5, PAL.goldDark);
  px(ctx, x - w / 2 + 18, y + h / 2 - 38, w - 36, 12, PAL.silver);
}

function drawPhone(ctx, x, y, w, h) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 16, PAL.ink);
  roundRect(ctx, x - w / 2 + 9, y - h / 2 + 20, w - 18, h - 40, 8, PAL.screen);
  px(ctx, x - 16, y + h / 2 - 14, 32, 5, PAL.silverDark);
}

function drawNo(ctx, x, y, wobble) {
  const w = Math.round(Math.sin(wobble || 0) * 4);
  const reach = 28;
  const thick = 11;
  for (let i = -reach; i <= reach; i++) {
    px(ctx, x + w + i - thick / 2, y + i - thick / 2, thick, thick, PAL.red);
    px(ctx, x + w + i - thick / 2, y - i - thick / 2, thick, thick, PAL.red);
  }
}

function drawYes(ctx, x, y, s) {
  const k = s || 1;
  const th = Math.round(12 * k);
  for (let i = 0; i < 16 * k; i++) px(ctx, x - 20 * k + i, y + i, th, th, PAL.green);
  for (let i = 0; i < 30 * k; i++) px(ctx, x - 4 * k + i, y + 16 * k - i, th, th, PAL.green);
}

function drawIdea(ctx, x, y, glow, s) {
  const k = s || 1;
  const on = glow > 0.5;
  circle(ctx, x, y, 30 * k, on ? PAL.gold : PAL.goldDark);
  roundRect(ctx, x - 12 * k, y + 24 * k, 24 * k, 14 * k, 4 * k, PAL.silverDark);
  if (on) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      px(ctx, x + Math.cos(a) * 50 * k, y + Math.sin(a) * 50 * k, 8 * k, 8 * k, PAL.gold);
    }
  }
}

/* בועת מחשבה */
function drawThought(ctx, x, y, w, h) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 26, "#ffffff");
  circle(ctx, x - w / 2 + 18, y + h / 2 + 22, 15, "#ffffff");
  circle(ctx, x - w / 2 - 2, y + h / 2 + 52, 9, "#ffffff");
}

/* ---------- הסרטון ---------- */

const moneyMovie = {
  id: "money-basics",
  shots: [
    /* 1 - העולם העתיק, שחר */
    {
      duration: 10,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDawnTop, PAL.skyDawnBot);
        inked(ctx, c => {
          drawSun(c, 770, 140 - t * 2, 54);
          drawCloud(c, 80 + t * 8, 80, 1.1);
          drawCloud(c, 560 + t * 5, 130, 0.85);
          drawBirds(c, t, 200, 160, 48);
          drawMountain(c, 200, 350, 420, 230, PAL.stoneFar, PAL.stone, true);
          drawMountain(c, 560, 350, 340, 175, PAL.stone, PAL.stoneDark, true);
          drawHill(c, 800, 370, 520, 60, PAL.grassDark);
          drawGround(c, 350, PAL.grass, PAL.grassLight);
          drawTree(c, 90, 400, 1.5);
          drawTree(c, 900, 430, 1.7);
          drawHut(c, 690, 380, 1.4);

          const walkX = 90 + t * 50;
          drawPerson(c, walkX, 512, {walk: t * 6, size: 1.5, shirt: PAL.green, pants: PAL.dirt});
          drawBasket(c, walkX + 60, 486, 1.3);
        });
      }
    },

    /* 2 - קלוז אפ על סל התפוחים */
    {
      duration: 8,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDawnBot, "#ffeccc");
        inked(ctx, c => {
          drawGround(c, 400, PAL.grass, PAL.grassLight);
          const bounce = Math.round(Math.sin(t * 2.2) * 9);
          drawBasket(c, 480, 470 + bounce, 5);
          drawApple(c, 160, 290 + Math.sin(t * 1.8) * 18, 3.4);
          drawApple(c, 810, 240 + Math.cos(t * 2.1) * 20, 3);
        });
      }
    },

    /* 3 - שני אנשים נפגשים */
    {
      duration: 9,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDayTop, PAL.skyDayBot);
        inked(ctx, c => {
          drawCloud(c, 60, 70, 1.1);
          drawCloud(c, 660, 100, 0.9);
          drawBirds(c, t, 380, 140, 44);
          drawHill(c, 200, 360, 560, 55, PAL.grassDark);
          drawGround(c, 350, PAL.grass, PAL.grassLight);
          drawTree(c, 900, 420, 1.6);

          const approach = Math.min(1, t / 4);
          const leftX = 210 + approach * 130;
          const rightX = 750 - approach * 130;

          drawPerson(c, leftX, 512, {
            walk: t < 4 ? t * 6 : 0, size: 1.5, shirt: PAL.green, pants: PAL.dirt, happy: t > 4
          });
          drawBasket(c, leftX + 58, 470, 1.2);

          drawPerson(c, rightX, 512, {
            walk: t < 4 ? t * 6 : 0, size: 1.5, flip: true,
            shirt: PAL.purple, pants: PAL.stoneDark, happy: t > 4
          });
          drawCheese(c, rightX - 60, 452, 1.5);
        });
      }
    },

    /* 4 - ההחלפה: תפוחים תמורת גבינה */
    {
      duration: 9,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDayTop, PAL.skyDayBot);
        inked(ctx, c => {
          drawGround(c, 400, PAL.grass, PAL.grassLight);

          drawPerson(c, 145, 530, {
            walk: 0, size: 1.7, shirt: PAL.green, pants: PAL.dirt, armUp: true, happy: true
          });
          drawPerson(c, 815, 530, {
            walk: 0, size: 1.7, flip: true, shirt: PAL.purple, pants: PAL.stoneDark,
            armUp: true, happy: true
          });

          const k = Math.min(1, Math.max(0, (t - 1.5) / 4.5));
          const e = k * k * (3 - 2 * k);
          const arc = Math.sin(e * Math.PI) * 140;
          drawApple(c, 230 + e * 500, 270 - arc, 4);
          drawCheese(c, 730 - e * 500, 295 - arc, 3);

          if (e > 0.97) drawYes(c, 480, 120, 2);
        });
      }
    },

    /* 5 - שניהם מרוצים ופונים לדרכם */
    {
      duration: 8,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDayTop, PAL.skyDayBot);
        inked(ctx, c => {
          drawCloud(c, 380, 70, 1.1);
          drawBirds(c, t, 120, 150, 46);
          drawHill(c, 700, 365, 520, 50, PAL.grassDark);
          drawGround(c, 350, PAL.grass, PAL.grassLight);
          drawHut(c, 110, 380, 1.3);
          drawTree(c, 890, 425, 1.6);

          const leftX = 370 - t * 34;
          const rightX = 590 + t * 34;
          drawPerson(c, leftX, 512, {
            walk: t * 6, size: 1.5, flip: true, shirt: PAL.green, pants: PAL.dirt, happy: true
          });
          drawCheese(c, leftX - 60, 452, 1.4);
          drawPerson(c, rightX, 512, {
            walk: t * 6, size: 1.5, shirt: PAL.purple, pants: PAL.stoneDark, happy: true
          });
          drawBasket(c, rightX + 58, 470, 1.2);
        });
      }
    },

    /* 6 - מציע תפוחים לסנדלר */
    {
      duration: 9,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDayTop, PAL.skyDayBot);
        inked(ctx, c => {
          drawCloud(c, 520, 60, 0.9);
          drawGround(c, 355, PAL.dirt, "#bd8b57");
          drawHut(c, 860, 400, 1.6);

          drawPerson(c, 280, 512, {
            walk: 0, size: 1.6, shirt: PAL.green, pants: PAL.dirt, armUp: true
          });
          drawApple(c, 218, 250, 3.4);

          drawPerson(c, 580, 512, {
            walk: 0, size: 1.6, flip: true, shirt: PAL.red, pants: PAL.wood
          });
          drawShoe(c, 716, 400, 3.4);
        });
      }
    },

    /* 7 - הסנדלר מסרב, הוא רוצה דג */
    {
      duration: 9,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDayTop, PAL.skyDayBot);

        inked(ctx, c => {
          drawGround(c, 355, PAL.dirt, "#bd8b57");
          drawHut(c, 900, 405, 1.4);

          drawPerson(c, 250, 512, {
            walk: 0, size: 1.6, shirt: PAL.green, pants: PAL.dirt, armUp: true, sad: t > 3
          });
          drawApple(c, 188, 250, 3.4);

          drawPerson(c, 545, 512, {
            walk: 0, size: 1.6, flip: true, shirt: PAL.red, pants: PAL.wood, sad: true
          });
          drawNo(c, 400, 250, t * 6);

          if (t > 3.5) {
            const pop = Math.min(1, (t - 3.5) / 0.7);
            drawThought(c, 760, 150, 280, 160);
            drawFish(c, 760, 150, 2.6 * pop);
          }
        });
      }
    },

    /* 8 - אף אחד לא רוצה את מה שיש לשני */
    {
      duration: 10,
      draw(ctx, t) {
        drawSky(ctx, "#9ec9e0", PAL.skyDayBot);

        inked(ctx, c => {
          drawGround(c, 370, PAL.dirt, "#bd8b57");

          const people = [
            {x: 130, shirt: PAL.green, item: drawApple, s: 2.2, iy: 200},
            {x: 365, shirt: PAL.red, item: drawShoe, s: 1.5, iy: 210},
            {x: 600, shirt: PAL.blue, item: drawFish, s: 1.5, iy: 205},
            {x: 835, shirt: PAL.purple, item: drawCheese, s: 1.6, iy: 205}
          ];

          people.forEach((p, i) => {
            drawPerson(c, p.x, 512, {
              walk: 0, size: 1.15, shirt: p.shirt, pants: PAL.stoneDark, sad: true, armUp: true
            });
            p.item(c, p.x - 40, p.iy, p.s);
            if (i < 3 && t > 1 + i * 1.6) {
              drawNo(c, (p.x + people[i + 1].x) / 2, 320, t * 5 + i);
            }
          });
        });
      }
    },

    /* 9 - ההברקה: חפץ אחד שכולם מקבלים */
    {
      duration: 8,
      draw(ctx, t) {
        drawSky(ctx, "#cfe8f5", "#ffffff");

        inked(ctx, c => {
          drawGround(c, 400, PAL.dirt, "#bd8b57");
          drawPerson(c, 480, 522, {
            walk: 0, size: 1.8, shirt: PAL.green, pants: PAL.dirt, armUp: true, happy: true
          });
          drawIdea(c, 480, 90, Math.sin(t * 5) > -0.3 ? 1 : 0, 1.3);
          const rise = Math.min(1, t / 2);
          drawShell(c, 322, 268 - rise * 18, 2.4);
        });
      }
    },

    /* 10 - כולם מסכימים לקבל את הצדפים */
    {
      duration: 10,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDayTop, PAL.skyDayBot);
        inked(ctx, c => {
          drawCloud(c, 170, 55, 1);
          drawBirds(c, t, 500, 130, 46);
          drawHill(c, 480, 375, 900, 45, PAL.grassDark);
          drawGround(c, 360, PAL.grass, PAL.grassLight);

          [140, 375, 610, 845].forEach((x, i) => {
            const nod = Math.sin(t * 4 + i) > 0 ? 3 : 0;
            drawPerson(c, x, 512 + nod, {
              walk: 0, size: 1.2, shirt: [PAL.green, PAL.red, PAL.blue, PAL.purple][i],
              pants: PAL.stoneDark, happy: true, armUp: true
            });
            drawShell(c, x - 44, 330 - nod * 3, 1.8);
          });
        });
      }
    },

    /* 11 - הטבעת מטבעות בנפחייה */
    {
      duration: 9,
      draw(ctx, t) {
        drawSky(ctx, "#4a3520", "#8a6034");

        inked(ctx, c => {
          drawGround(c, 400, PAL.stoneDark, PAL.stone);
          roundRect(c, 330, 395, 300, 75, 12, PAL.stone);
          px(c, 390, 330, 180, 70, PAL.stoneDark);

          const strike = Math.sin(t * 2.6);
          const hammerY = 50 + Math.max(0, strike) * 190;
          roundRect(c, 395, hammerY, 170, 62, 10, PAL.silverDark);
          roundRect(c, 465, hammerY + 62, 32, 190, 10, PAL.wood);

          drawCoin(c, 480, 305, 50, 1);

          if (strike > 0.88) {
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * Math.PI * 2;
              px(c, 480 + Math.cos(a) * (65 + i * 6), 305 + Math.sin(a) * (45 + i * 4), 7, 7, PAL.goldLight);
            }
          }
        });
      }
    },

    /* 12 - מטבע ענק מסתובב */
    {
      duration: 8,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyNightTop, PAL.skyNightBot);
        for (let i = 0; i < 120; i++) {
          const x = (i * 137) % MOVIE_W;
          const y = (i * 219) % 520;
          px(ctx, x, y, 3, 3, i % 3 ? "#4a5a80" : "#ffffff");
        }
        inked(ctx, c => {
          const squash = Math.abs(Math.cos(t * 2.2));
          drawCoin(c, 480, 270 + Math.sin(t * 1.8) * 26, 155, squash);
        });
      }
    },

    /* 13 - ערימת מטבעות כבדה מול שטר קל */
    {
      duration: 9,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyWarmTop, PAL.skyWarmBot);

        inked(ctx, c => {
          drawGround(c, 440, PAL.wood, "#c48f4e");
          drawCoinStack(c, 210, 440, 9, 64, 30);

          const float = Math.sin(t * 1.5) * 22;
          drawBill(c, 720, 240 + float, 330, 170);

          if (t > 2) {
            const p = Math.min(1, (t - 2) / 2);
            px(c, 330, 300, Math.round(180 * p), 12, PAL.ink);
            if (p > 0.9) {
              px(c, 500, 282, 12, 48, PAL.ink);
              px(c, 512, 294, 12, 24, PAL.ink);
            }
          }
        });
      }
    },

    /* 14 - כסף דיגיטלי */
    {
      duration: 10,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyNightTop, "#2f4468");
        for (let i = 0; i < 140; i++) {
          const x = (i * 173) % MOVIE_W;
          const y = (i * 91 + Math.floor(t * 40)) % 540;
          px(ctx, x, y, 3, 9, i % 4 ? "#33456b" : PAL.screen);
        }

        inked(ctx, c => {
          /* גל אישור העסקה מצויר יחד עם השאר כדי שגם הוא יקבל קו מתאר */
          const pulse = (t * 1.2) % 2;
          if (pulse < 1) {
            const r = Math.round(pulse * 210);
            c.strokeStyle = PAL.screen;
            c.lineWidth = 5;
            c.strokeRect(700 - r, 270 - r, r * 2, r * 2);
          }
          drawCard(c, 300, 280 + Math.sin(t * 2) * 14, 330, 205);
          drawPhone(c, 700, 270 - Math.sin(t * 2) * 14, 200, 340);
        });
      }
    },

    /* 15 - הרעיון הגדול: כסף הוא הסכמה משותפת */
    {
      duration: 18,
      draw(ctx, t) {
        drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
        inked(ctx, c => {
          drawSun(c, 480, 330, 100);
          drawHill(c, 480, 415, 1000, 50, "#3a5f2e");
          drawGround(c, 400, PAL.grassDark, PAL.grass);

          const rise = Math.min(1, t / 2.5);
          const billY = 210 - rise * 50 + Math.sin(t * 1.3) * 10;
          drawBill(c, 480, billY, 340, 175);

          [110, 280, 680, 850].forEach((x, i) => {
            const nod = Math.sin(t * 3 + i * 1.2) > 0 ? 3 : 0;
            drawPerson(c, x, 522 + nod, {
              walk: 0, size: 1.25, shirt: [PAL.green, PAL.red, PAL.blue, PAL.purple][i],
              pants: PAL.stoneDark, happy: true, armUp: t > 5
            });
          });

          if (t > 6) {
            const p = Math.min(1, (t - 6) / 2);
            c.strokeStyle = PAL.gold;
            c.lineWidth = 5;
            [110, 280, 680, 850].forEach(x => {
              c.beginPath();
              c.moveTo(x, 380);
              c.lineTo(x + (480 - x) * p, 380 + (billY + 88 - 380) * p);
              c.stroke();
            });
          }
        });
      }
    }
  ],

  /* קריינות אחת שמספרת את הסיפור. בלי כתוביות על המסך. */
  cues: [
    {id: "n01", who: "narrator", t: 0.5, text: "לפני אלפי שנים, לא היה בעולם דבר כזה כסף."},
    {id: "n02", who: "narrator", t: 5.5, text: "כל אחד ייצר בעצמו את מה שידע לייצר."},

    {id: "n03", who: "narrator", t: 10.5, text: "לאיכר הזה היו תפוחים. הרבה מאוד תפוחים."},
    {id: "n04", who: "narrator", t: 15, text: "אבל אי אפשר לחיות רק מתפוחים."},

    {id: "n05", who: "narrator", t: 18.5, text: "אז הוא יצא לחפש מישהו שיש לו משהו אחר."},
    {id: "d01", who: "farmer", t: 23.2, text: "שלום! יש לי תפוחים. מה יש לך?"},

    {id: "d02", who: "shepherd", t: 27.5, text: "גבינה טרייה. בוא נחליף!"},
    {id: "n06", who: "narrator", t: 32, text: "זה נקרא סחר חליפין. מחליפים דבר בדבר."},

    {id: "n07", who: "narrator", t: 36.5, text: "שניהם יצאו מרוצים, ואף אחד לא שילם כלום."},
    {id: "n08", who: "narrator", t: 41, text: "אז למה בכלל היינו צריכים כסף?"},

    {id: "n09", who: "narrator", t: 44.5, text: "כי לסחר חליפין יש בעיה גדולה."},
    {id: "d03", who: "farmer", t: 48.5, text: "אני צריך נעליים חדשות. יש לי תפוחים!"},

    {id: "d04", who: "shoemaker", t: 53.5, text: "תפוחים? כבר יש לי מלא תפוחים."},
    {id: "d05", who: "shoemaker", t: 57, text: "אני רוצה דווקא דג."},
    {id: "n10", who: "narrator", t: 59.5, text: "והדייג לא רצה תפוחים בכלל."},

    {id: "n11", who: "narrator", t: 62.5, text: "כדי שעסקה תצליח, כל אחד צריך לרצות בדיוק את מה שיש לשני."},
    {id: "n12", who: "narrator", t: 68.5, text: "וזה כמעט אף פעם לא קורה."},

    {id: "n13", who: "narrator", t: 72.5, text: "ואז הגיע הרעיון ששינה את העולם."},
    {id: "d06", who: "farmer", t: 76.5, text: "רגע! מה אם נבחר משהו שכולם מסכימים לקבל?"},

    {id: "n14", who: "narrator", t: 81.8, text: "בהתחלה היו אלה צדפים, אבנים יקרות או גושי מתכת."},
    {id: "d07", who: "crowd", t: 87.9, text: "אני מקבל! גם אני!"},
    {id: "n15", who: "narrator", t: 90.3, text: "עכשיו האיכר מוכר תפוחים לכל אחד, ובכסף קונה נעליים."},

    {id: "n16", who: "narrator", t: 95.8, text: "אחר כך התחילו להטביע מטבעות ממתכת."},
    {id: "n17", who: "narrator", t: 99.1, text: "לכולם אותו גודל ואותו ערך, אז אי אפשר לרמות."},

    {id: "n18", who: "narrator", t: 103.7, text: "המתכת עצמה הייתה שווה משהו."},
    {id: "n19", who: "narrator", t: 106.2, text: "אבל מטבעות היו כבדים מאוד לסחוב."},

    {id: "n20", who: "narrator", t: 109.1, text: "אז המציאו שטרות נייר, קלים לשאת בכיס."},
    {id: "n21", who: "narrator", t: 112.3, text: "לנייר עצמו אין ערך. הוא רק הבטחה."},

    {id: "n22", who: "narrator", t: 116.5, text: "והיום רוב הכסף בעולם הוא מספרים במחשב."},
    {id: "n23", who: "narrator", t: 121, text: "מעבירים אותו בכרטיס או בטלפון, בלי לגעת בו."},

    {id: "n24", who: "narrator", t: 126.5, text: "אז מה זה בעצם כסף?"},
    {id: "n25", who: "narrator", t: 130, text: "כסף הוא לא הנייר, ולא המתכת, ולא המספר במסך."},
    {id: "n26", who: "narrator", t: 135, text: "כסף הוא הסכמה. כולנו מסכימים שיש לו ערך."},
    {id: "n27", who: "narrator", t: 140, text: "וזה הסוד הגדול שלו: הוא בנוי כולו על אמון."}
  ]
};

/* ---------- גרפיקה מיוצרת (אופציונלי) ---------- */
/* אם קיימות תמונות ב-art/ הן מוצגות במקום הציור בקוד, עם תנועת מצלמה איטית */

const movieArt = {images: {}, ready: false};

async function loadMovieArt() {
  try {
    const response = await fetch("art/manifest.json", {cache: "no-cache"});
    if (!response.ok) return;

    const manifest = await response.json();
    if (!Array.isArray(manifest.shots) || !manifest.shots.length) return;

    manifest.shots.forEach(num => {
      const img = new Image();
      img.src = `art/shot-${String(num).padStart(2, "0")}.png`;
      movieArt.images[num - 1] = img;
    });
    movieArt.ready = true;
  } catch (error) {
    /* אין גרפיקה מיוצרת - ממשיכים עם הציור בקוד */
  }
}

function artFor(index) {
  const img = movieArt.images[index];
  return img && img.complete && img.naturalWidth ? img : null;
}

function drawKenBurns(ctx, img, progress, seed) {
  const zoom = 1.06 + 0.1 * progress;
  const scale = Math.max(MOVIE_W / img.naturalWidth, MOVIE_H / img.naturalHeight) * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const dir = seed % 4;
  const ax = dir === 0 || dir === 3 ? progress : 1 - progress;
  const ay = dir === 0 || dir === 1 ? progress : 1 - progress;

  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, -(w - MOVIE_W) * ax, -(h - MOVIE_H) * ay, w, h);
  ctx.imageSmoothingEnabled = prev;
}

/* ---------- מנוע ההפעלה ---------- */

class MoviePlayer {
  constructor(canvas, movie) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", {alpha: false});
    this.movie = movie;
    this.playing = false;
    this.time = 0;
    this.lastFrame = 0;
    this.spokenCues = new Set();
    this.raf = null;

    this.ctx.imageSmoothingEnabled = false;
    this.total = movie.shots.reduce((sum, shot) => sum + shot.duration, 0);

    this.onProgress = null;
    this.onEnd = null;
  }

  shotAt(time) {
    let acc = 0;
    for (let i = 0; i < this.movie.shots.length; i++) {
      const shot = this.movie.shots[i];
      if (time < acc + shot.duration) return {shot, local: time - acc, index: i};
      acc += shot.duration;
    }
    const last = this.movie.shots[this.movie.shots.length - 1];
    return {shot: last, local: last.duration, index: this.movie.shots.length - 1};
  }

  renderAt(time) {
    const {shot, local, index} = this.shotAt(time);
    this.ctx.fillStyle = PAL.ink;
    this.ctx.fillRect(0, 0, MOVIE_W, MOVIE_H);

    const img = artFor(index);
    if (img) drawKenBurns(this.ctx, img, Math.min(1, local / shot.duration), index);
    else shot.draw(this.ctx, local, MOVIE_W, MOVIE_H);
  }

  play() {
    if (this.playing) return;
    if (this.time >= this.total) {
      this.time = 0;
      this.spokenCues.clear();
    }
    this.playing = true;
    this.lastFrame = performance.now();
    this.loop();
  }

  pause() {
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (typeof cancelSpeech === "function") cancelSpeech();
  }

  stop() {
    this.pause();
    this.time = 0;
    this.spokenCues.clear();
    this.renderAt(0);
    if (this.onProgress) this.onProgress(0, this.total);
  }

  loop() {
    if (!this.playing) return;

    const now = performance.now();
    const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.time += delta;

    if (this.time >= this.total) {
      this.time = this.total;
      this.renderAt(this.time);
      this.playing = false;
      if (this.onProgress) this.onProgress(this.time, this.total);
      if (this.onEnd) this.onEnd();
      return;
    }

    this.renderAt(this.time);
    this.speakDueCues();

    if (this.onProgress) this.onProgress(this.time, this.total);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  speakDueCues() {
    for (let i = 0; i < this.movie.cues.length; i++) {
      const cue = this.movie.cues[i];
      if (this.time < cue.t || this.spokenCues.has(i)) continue;

      const spoke = typeof narrate === "function" ? narrate(cue.text, cue.who, cue.id) : false;
      if (spoke || this.time > cue.t + 3) this.spokenCues.add(i);
    }
  }

  seek(time) {
    this.time = Math.max(0, Math.min(this.total, time));
    this.spokenCues.clear();
    this.movie.cues.forEach((cue, i) => {
      if (cue.t < this.time) this.spokenCues.add(i);
    });
    this.renderAt(this.time);
    if (this.onProgress) this.onProgress(this.time, this.total);
  }
}
