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
  const w = Math.round(78 * k);
  const bodyH = Math.round(40 * k);
  const lidH = Math.round(22 * k);

  /* המכסה — קשת שנפתחת אחורה */
  const lidY = groundY - bodyH - (open ? Math.round(30 * k) : 0);
  for (let i = 0; i < lidH; i++) {
    const half = Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow(i / lidH, 2))));
    px(ctx, x - half, lidY - i, half * 2, 1, GPAL.wood);
  }
  px(ctx, x - w / 2, lidY - Math.round(3 * k), w, Math.round(4 * k), GPAL.woodDark);

  /* גוף התיבה */
  roundRect(ctx, x - w / 2, groundY - bodyH, w, bodyH, Math.round(4 * k), GPAL.wood);

  /* פנים התיבה כשהיא פתוחה, עם מטבעות בתוכה */
  if (open) {
    px(ctx, x - w / 2 + Math.round(5 * k), groundY - bodyH, w - Math.round(10 * k), Math.round(13 * k), "#4a3520");
    for (let i = 0; i < 5; i++) {
      circle(ctx, x - Math.round(26 * k) + i * Math.round(13 * k),
             groundY - bodyH + Math.round(6 * k), Math.round(7 * k), GPAL.gold);
    }
  }

  /* חישוקי מתכת ומנעול */
  px(ctx, x - w / 2, groundY - Math.round(24 * k), w, Math.round(5 * k), GPAL.goldDark);
  px(ctx, x - w / 2, groundY - Math.round(10 * k), w, Math.round(5 * k), GPAL.goldDark);
  px(ctx, x - Math.round(30 * k), groundY - bodyH, Math.round(5 * k), bodyH, GPAL.goldDark);
  px(ctx, x + Math.round(25 * k), groundY - bodyH, Math.round(5 * k), bodyH, GPAL.goldDark);
  roundRect(ctx, x - Math.round(8 * k), groundY - Math.round(30 * k),
            Math.round(16 * k), Math.round(18 * k), Math.round(3 * k), GPAL.gold);
  circle(ctx, x, groundY - Math.round(22 * k), Math.round(3 * k), PAL.ink);
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
  roundRect(ctx, x - w / 2, groundY - h, w, h, Math.round(20 * k), GPAL.wood);
  /* קרשים אנכיים */
  for (let i = 1; i < 6; i++) {
    px(ctx, x - w / 2 + i * Math.round(25 * k), groundY - h + Math.round(14 * k),
       Math.round(3 * k), h - Math.round(14 * k), GPAL.woodDark);
  }
  /* חישוקי ברזל */
  [0.26, 0.62].forEach(f => {
    px(ctx, x - w / 2, groundY - h * (1 - f), w, Math.round(9 * k), GPAL.stoneDark);
    circle(ctx, x - w / 2 + Math.round(12 * k), groundY - h * (1 - f) + Math.round(4 * k), Math.round(4 * k), GPAL.stone);
    circle(ctx, x + w / 2 - Math.round(12 * k), groundY - h * (1 - f) + Math.round(4 * k), Math.round(4 * k), GPAL.stone);
  });
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


/* ---------- תפאורה: שכבות עומק ואווירה ---------- */

/* פיזור יציב — אותה סצנה נראית אותו דבר בכל פריים */
function spread(seed, i) {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* רכס גבעות מתגלגל ברקע */
function farRidge(ctx, baseY, height, color, seed) {
  for (let x = 0; x < GAME_W; x++) {
    const h =
      Math.sin(x * 0.006 + seed) * height * 0.5 +
      Math.sin(x * 0.017 + seed * 2) * height * 0.3 +
      height * 0.5;
    px(ctx, x, baseY - h, 1, GAME_H - baseY + h, color);
  }
}

/* צמחייה קטנה על קו הקרקע */
function scatterGrass(ctx, y, count, color, seed) {
  for (let i = 0; i < count; i++) {
    const x = Math.round(spread(seed, i) * GAME_W);
    const h = 5 + Math.round(spread(seed + 9, i) * 9);
    px(ctx, x, y - h, 2, h, color);
    px(ctx, x - 3, y - h * 0.6, 2, h * 0.6, color);
    px(ctx, x + 3, y - h * 0.7, 2, h * 0.7, color);
  }
}

function scatterRocks(ctx, y, count, color, seed) {
  for (let i = 0; i < count; i++) {
    const x = Math.round(spread(seed, i) * GAME_W);
    const r = 3 + Math.round(spread(seed + 4, i) * 6);
    ellipse(ctx, x, y - r * 0.4, r, r * 0.7, color);
  }
}

/* לפיד קיר עם להבה מרצדת */
function torch(ctx, x, y, t, s) {
  const k = s || 1;
  px(ctx, x - 3 * k, y, 6 * k, 26 * k, GPAL.woodDark);
  const flick = Math.sin(t * 9 + x) * 2 * k;
  ellipse(ctx, x, y - 10 * k + flick, 8 * k, 13 * k, GPAL.torch);
  ellipse(ctx, x, y - 12 * k + flick, 4 * k, 8 * k, "#ffe08a");
  ellipse(ctx, x, y - 8 * k, 26 * k, 22 * k, "rgba(255,157,63,.16)");
}

/* קרן אור רכה */
function lightBeam(ctx, x, topY, spreadW, height, color) {
  for (let i = 0; i < height; i++) {
    const w = spreadW * (i / height);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.05 * (1 - i / height);
    ctx.fillRect(Math.round(x - w / 2), topY + i, Math.round(w), 1);
  }
  ctx.globalAlpha = 1;
}

/* האפלה עדינה בפינות, נותנת מסגרת לתמונה */
function vignette(ctx) {
  const g = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, GAME_H * 0.35,
                                     GAME_W / 2, GAME_H / 2, GAME_W * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(12,10,24,.34)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
}

function starField(ctx, count, seed, maxY) {
  for (let i = 0; i < count; i++) {
    const x = Math.round(spread(seed, i) * GAME_W);
    const y = Math.round(spread(seed + 3, i) * (maxY || 240));
    const s = spread(seed + 7, i) > 0.85 ? 3 : 2;
    px(ctx, x, y, s, s, i % 4 ? "#c9d4ec" : "#ffffff");
  }
}

/* ריצוף אבן */
function cobbles(ctx, y, rows, seed) {
  for (let r = 0; r < rows; r++) {
    const ry = y + r * 16;
    const off = r % 2 ? 26 : 0;
    for (let x = -off; x < GAME_W; x += 52) {
      roundRect(ctx, x + 3, ry + 3, 46, 12, 4,
        spread(seed, r * 30 + x) > 0.5 ? "#9aa5b1" : "#8b96a3");
    }
  }
}

/* אדמה סדוקה */
function crackedGround(ctx, y, seed) {
  ctx.strokeStyle = "#8a7a5f";
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const x = spread(seed, i) * GAME_W;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x + (spread(seed + 1, i) - 0.5) * 60, y + 40);
    ctx.lineTo(x + (spread(seed + 2, i) - 0.5) * 110, y + 80);
    ctx.stroke();
  }
}

/* נהר עם ריצודי אור */
function river(ctx, y, t) {
  px(ctx, 0, y, GAME_W, GAME_H - y, GPAL.waterDark);
  px(ctx, 0, y, GAME_W, 8, GPAL.water);
  for (let i = 0; i < 22; i++) {
    const x = (spread(31, i) * GAME_W + Math.sin(t * 0.7 + i) * 22) % GAME_W;
    const yy = y + 16 + spread(37, i) * (GAME_H - y - 24);
    px(ctx, x, yy, 26 + spread(41, i) * 30, 3, "rgba(190,225,255,.4)");
  }
}

/* נטיפים מהתקרה */
function stalactites(ctx, count, seed, color) {
  for (let i = 0; i < count; i++) {
    const x = Math.round(spread(seed, i) * GAME_W);
    const h = 40 + Math.round(spread(seed + 5, i) * 90);
    const w = 16 + Math.round(spread(seed + 8, i) * 18);
    for (let j = 0; j < h; j++) {
      const half = Math.round((w / 2) * (1 - j / h));
      px(ctx, x - half, j, half * 2, 1, color);
    }
  }
}

function crystal(ctx, x, y, s, color) {
  const k = s || 1;
  for (let i = 0; i < 34 * k; i++) {
    const half = Math.round(11 * k * (1 - Math.abs(i / (17 * k) - 1)));
    px(ctx, x - half, y - 34 * k + i, half * 2, 1, color);
  }
  ellipse(ctx, x, y - 17 * k, 22 * k, 22 * k, "rgba(150,120,240,.14)");
}

/* דגלוני שוק */
function bunting(ctx, x1, x2, y, sag) {
  const cols = ["#d8503f", "#f5c542", "#4f9e5c", "#3f8fd8", "#8a5cc9"];
  const n = Math.floor((x2 - x1) / 34);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const x = x1 + (x2 - x1) * p;
    const yy = y + Math.sin(p * Math.PI) * sag;
    i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
  }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n;
    const x = x1 + (x2 - x1) * p;
    const yy = y + Math.sin(p * Math.PI) * sag;
    const c = cols[i % cols.length];
    for (let j = 0; j < 20; j++) {
      const half = Math.round(9 * (1 - j / 20));
      px(ctx, x - half, yy + j, half * 2, 1, c);
    }
  }
}

function barrel(ctx, x, groundY, s) {
  const k = s || 1;
  roundRect(ctx, x - 20 * k, groundY - 46 * k, 40 * k, 46 * k, 8 * k, GPAL.wood);
  px(ctx, x - 20 * k, groundY - 36 * k, 40 * k, 5 * k, GPAL.woodDark);
  px(ctx, x - 20 * k, groundY - 18 * k, 40 * k, 5 * k, GPAL.woodDark);
  ellipse(ctx, x, groundY - 46 * k, 20 * k, 6 * k, "#b9884b");
}

function crate(ctx, x, groundY, s) {
  const k = s || 1;
  const w = 42 * k;
  px(ctx, x - w / 2, groundY - w, w, w, GPAL.wood);
  px(ctx, x - w / 2, groundY - w, w, 5 * k, GPAL.woodDark);
  ctx.strokeStyle = GPAL.woodDark;
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, groundY - w);
  ctx.lineTo(x + w / 2, groundY);
  ctx.moveTo(x + w / 2, groundY - w);
  ctx.lineTo(x - w / 2, groundY);
  ctx.stroke();
}

/* חומת מצודה לאורך הפריים */
function castleWall(ctx, groundY, height) {
  px(ctx, 0, groundY - height, GAME_W, height, GPAL.stone);
  for (let r = 0; r < Math.floor(height / 24); r++) {
    px(ctx, 0, groundY - height + r * 24, GAME_W, 3, GPAL.stoneDark);
  }
  for (let x = 0; x < GAME_W; x += 46) {
    px(ctx, x, groundY - height - 16, 28, 18, GPAL.stoneDark);
  }
}

function stormClouds(ctx, t) {
  for (let i = 0; i < 7; i++) {
    const x = (spread(53, i) * GAME_W + t * 6) % (GAME_W + 220) - 110;
    const y = 20 + spread(59, i) * 70;
    const s = 0.9 + spread(61, i) * 0.9;
    ellipse(ctx, x, y, 62 * s, 24 * s, "#3a3050");
    ellipse(ctx, x + 40 * s, y - 10 * s, 46 * s, 22 * s, "#332a48");
  }
}

function crow(ctx, x, y, t) {
  const flap = Math.sin(t * 6 + x) > 0 ? 0 : 5;
  px(ctx, x, y, 12, 3, PAL.ink);
  px(ctx, x + 12, y - flap, 10, 3, PAL.ink);
  px(ctx, x + 22, y, 12, 3, PAL.ink);
}

function moon(ctx, x, y, r) {
  circle(ctx, x, y, r, "#f0ecd8");
  circle(ctx, x - r * 0.3, y - r * 0.2, r * 0.18, "#ddd7bf");
  circle(ctx, x + r * 0.25, y + r * 0.3, r * 0.12, "#ddd7bf");
  circle(ctx, x, y, r * 1.5, "rgba(240,236,216,.1)");
}

/* ---------- השלבים ---------- */

const QUEST = [
  {
    place: "כיכר הכפר",
    intro: "בכיכר הכפר התושבים שכחו איך להחליט על מה להוציא כסף. הכול נראה להם חשוב באותה מידה.",
    pool: [
      {
        question: "מה ההבדל בין צורך לבין רצון?",
        answers: [
          "צורך הוא משהו שחייבים כדי לחיות, רצון הוא משהו שנעים שיהיה",
          "צורך הוא משהו יקר, רצון הוא משהו זול",
          "אין הבדל אמיתי, זו רק מילה אחרת",
          "רצון הוא משהו שקונים רק במבצע"
        ],
        correct: 0
      },
      {
        question: "יש לכם מאה שקלים. מה מהרשימה הוא צורך?",
        answers: [
          "אוכל לארוחת ערב",
          "משחק חדש לטלפון",
          "מדבקות לקלמר",
          "כובע בצבע שאתם אוהבים"
        ],
        correct: 0
      },
      {
        question: "חבר אומר: אני חייב את הנעליים החדשות, כולם בכיתה עם הדגם הזה. מה נכון?",
        answers: [
          "הוא צודק, בלי זה אי אפשר",
          "זה רצון שמתחפש לצורך. נעליים הן צורך, דגם מסוים הוא רצון",
          "צריך לקנות כדי לא להיות שונה",
          "זה הופך לצורך אם זה במבצע"
        ],
        correct: 1
      }
    ],
    win: "הצבע חוזר לכיכר. התושבים נזכרים מה הם באמת צריכים.",
    lose: "הקללה מתחזקת. נסו שוב.",
    lesson: "צורך הוא מה שחייבים כדי לחיות. רצון הוא מה שנעים שיהיה. ההבדל הזה הוא הבסיס לכל החלטה על כסף.",
    draw(ctx, t, curse) {
      drawSky(ctx, GPAL.sky, "#dbeef8");
      drawSun(ctx, 782, 74, 34);
      drawCloud(ctx, 90 + t * 5, 46, 0.75);
      drawCloud(ctx, 520 + t * 3, 30, 0.55);
      farRidge(ctx, 292, 46, "#8fbf86", 1.2);
      farRidge(ctx, 306, 30, "#6fae70", 3.4);

      inked(ctx, c => {
        drawGround(c, 300, GPAL.grass, "#84c95e");
        px(c, 0, 344, GAME_W, 34, GPAL.path);
        scatterRocks(c, 300, 7, "#9aa5b1", 11);
        drawCottage(c, 128, 302, 0.86);
        drawCottage(c, 300, 296, 0.66);
        drawCottage(c, 812, 302, 1);
        drawTree(c, 470, 300, 0.62);
        drawApple(c, 236, 268, 1.2);
        drawHero(c, 596, 396, 1.9, {walk: t * 3, dim: curse > 0.5});
      });

      scatterGrass(ctx, 300, 26, "#4a8535", 5);
      scatterGrass(ctx, 418, 16, "#3f7530", 8);
      vignette(ctx);
    }
  },
  {
    place: "השוק הגדול",
    intro: "בשוק תלויים שלטי מבצע ענקיים. הקללה גורמת לכולם לקנות דברים שהם לא צריכים.",
    pool: [
      {
        question: "מבצע אחד פלוס אחד על מוצר שלא תכננתם לקנות. חסכתם כסף?",
        answers: [
          "כן, חסכתם חמישים אחוז",
          "לא, הוצאתם כסף שלא תכננתם להוציא",
          "כן, תמיד כדאי לנצל מבצעים",
          "תלוי אם שילמתם במזומן"
        ],
        correct: 1
      },
      {
        question: "קרטון חלב אחד ליטר עולה שישה שקלים, וקרטון של שני ליטר עולה שלושה עשר. מה זול יותר?",
        answers: [
          "הגדול, כי הוא גדול יותר",
          "הקטן. שישה שקלים לליטר מול שישה וחצי לליטר",
          "בדיוק אותו דבר",
          "אי אפשר לדעת בלי לשאול את המוכר"
        ],
        correct: 1
      },
      {
        question: "שלט בשוק צועק: המבצע נגמר בעוד עשר דקות! למה כתבו את זה ככה?",
        answers: [
          "כדי שתחליטו מהר, לפני שתספיקו לחשוב אם אתם בכלל צריכים את זה",
          "כי המלאי באמת נגמר בדיוק אז",
          "כי החוק מחייב לכתוב זמן על כל שלט",
          "כדי לעזור לכם לחסוך זמן בשוק"
        ],
        correct: 0
      }
    ],
    win: "השלטים נושרים. הסוחרים מתחילים לכתוב מחיר ליחידה.",
    lose: "עוד תושב יוצא מהשוק עם שק מלא בדברים מיותרים.",
    lesson: "מבצע חוסך כסף רק על משהו שהייתם קונים גם בלעדיו. אחרת זו הוצאה, לא חיסכון.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#f0d49a", "#f9ecd2");
      drawSun(ctx, 140, 62, 30);
      farRidge(ctx, 288, 34, "#c9ab7c", 2.1);

      inked(ctx, c => {
        drawGround(c, 300, GPAL.path, "#dbc196");
        cobbles(c, 306, 8, 17);
        drawStall(c, 152, 312, 1.5, GPAL.roof);
        drawStall(c, 816, 312, 1.5, "#4f9e5c");
        drawStall(c, 468, 296, 1.15, "#8a5cc9");
        barrel(c, 300, 312, 1);
        crate(c, 660, 312, 1);
        crate(c, 706, 312, 0.7);
        drawHero(c, 468, 400, 1.9, {walk: t * 3, dim: curse > 0.5});
      });

      bunting(ctx, 40, 920, 34, 26);
      vignette(ctx);
    }
  },
  {
    place: "בית האוצר",
    intro: "המכשף פיזר את מטבעות הממלכה בלי סדר. צריך להחזיר לכל מטבע תפקיד.",
    pool: [
      {
        question: "לפי כלל חמישים־שלושים־עשרים, כמה מההכנסה הולך לחיסכון?",
        answers: [
          "חמישים אחוז",
          "שלושים אחוז",
          "עשרים אחוז",
          "עשרה אחוז"
        ],
        correct: 2
      },
      {
        question: "לפי אותו כלל, לאן הולך החצי הגדול?",
        answers: [
          "לצרכים: קורת גג, אוכל וחשבונות",
          "לבילויים ולקניות",
          "לחיסכון ולהשקעות",
          "להחזר הלוואות בלבד"
        ],
        correct: 0
      },
      {
        question: "קיבלתם מאתיים שקלים במתנה. לפי הכלל, כמה מהם נכנסים לחיסכון?",
        answers: [
          "ארבעים שקלים",
          "עשרים שקלים",
          "מאה שקלים",
          "הכול, אסור לגעת במתנה"
        ],
        correct: 0
      }
    ],
    win: "המטבעות מסתדרים לשלוש ערמות. לכל אחת יש תפקיד.",
    lose: "המטבעות מתגלגלים שוב לכל עבר.",
    lesson: "כלל חמישים־שלושים־עשרים: חצי מההכנסה לצרכים, שלושים אחוז לרצונות, ועשרים אחוז לחיסכון. לכל שקל יש תפקיד מראש.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#4a3f68", "#6f6390");
      inked(ctx, c => {
        castleWall(c, 300, 220);
        for (let x = 90; x < GAME_W; x += 250) {
          roundRect(c, x - 26, 120, 52, 90, 26, "#3a3350");
        }
        drawGround(c, 300, GPAL.stone, GPAL.stoneLight);
        cobbles(c, 306, 8, 23);
        drawChest(c, 214, 316, 1.15, curse < 0.4);
        drawCoinStack(c, 546, 316, 5, 30, 16);
        drawCoinStack(c, 634, 316, 3, 30, 16);
        drawCoinStack(c, 714, 316, 2, 30, 16);
        drawHero(c, 392, 402, 1.9, {walk: t * 3, dim: curse > 0.5, raise: true});
      });

      torch(ctx, 62, 150, t, 1.5);
      torch(ctx, 898, 150, t, 1.5);
      lightBeam(ctx, 480, 0, 260, 300, "#ffe3a8");
      vignette(ctx);
    }
  },
  {
    place: "הבאר היבשה",
    intro: "הבאר התייבשה, ולאף אחד בכפר אין כסף בצד ליום שכזה.",
    pool: [
      {
        question: "כמה כסף מומלץ שיהיה בקרן חירום של משק בית?",
        answers: [
          "הוצאות של שלושה עד שישה חודשים",
          "בדיוק אלף שקלים",
          "הוצאות של שנתיים",
          "לא צריך קרן חירום אם יש כרטיס אשראי"
        ],
        correct: 0
      },
      {
        question: "מתי באמת משתמשים בקרן החירום?",
        answers: [
          "כשהמקרר מתקלקל או כשמפסיקים לעבוד בלי התראה",
          "כשיש מבצע טוב שחבל לפספס",
          "כשרוצים לצאת לחופשה",
          "כשמחירי המניות עולים"
        ],
        correct: 0
      },
      {
        question: "איפה הכי נכון להחזיק את כסף החירום?",
        answers: [
          "במקום שאפשר למשוך ממנו מיד, גם אם הרווח קטן",
          "בהשקעה הכי מסוכנת, כדי שיגדל מהר",
          "אצל חבר טוב ששומר עליו",
          "לא משנה איפה, העיקר שלא רואים אותו"
        ],
        correct: 0
      }
    ],
    win: "המים חוזרים לבאר. עכשיו יש לכפר כרית ליום קשה.",
    lose: "הבאר נשארת יבשה.",
    lesson: "קרן חירום היא כסף בצד לשלושה עד שישה חודשי הוצאות. היא לא נועדה להרוויח, היא נועדה לימים שבהם משהו משתבש.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#c9b48f", "#e6dcc4");
      drawSun(ctx, 806, 66, 38);
      farRidge(ctx, 286, 40, "#b09b78", 1.7);

      inked(ctx, c => {
        drawGround(c, 300, "#c2ac86", "#d6c3a1");
        scatterRocks(c, 300, 10, "#9c8c6e", 29);
        drawTree(c, 116, 300, 0.78);
        drawWell(c, 470, 306, 1.15, curse > 0.4);
        barrel(c, 690, 306, 0.8);
        drawHero(c, 812, 398, 1.85, {walk: t * 3, dim: curse > 0.5});
      });

      crackedGround(ctx, 316, 13);
      scatterGrass(ctx, 300, 14, "#8f8256", 19);
      vignette(ctx);
    }
  },
  {
    place: "גשר הזמן",
    intro: "הגשר נבנה מחיסכון קטן שנצבר שנה אחר שנה. הקללה עצרה את הזמן.",
    pool: [
      {
        question: "מה זו ריבית דריבית?",
        answers: [
          "ריבית שמשלמים פעמיים בשנה",
          "עמלה שגובים על העברת כספים",
          "ריבית שמחושבת גם על הרווחים הקודמים, לא רק על הסכום ההתחלתי",
          "ריבית שהבנק מחזיר בסוף השנה"
        ],
        correct: 2
      },
      {
        question: "מה הכי משפיע על התוצאה של ריבית דריבית?",
        answers: [
          "כמה שנים הכסף נשאר בפנים",
          "באיזה יום בחודש מפקידים",
          "אם הפקדתם במזומן או בהעברה",
          "כמה אנשים יודעים על ההשקעה"
        ],
        correct: 0
      },
      {
        question: "הפקדתם מאה שקלים בריבית של עשרה אחוזים בשנה. כמה יהיה אחרי שנתיים?",
        answers: [
          "מאה עשרים ואחד שקלים",
          "מאה ועשרים שקלים",
          "מאה ועשרה שקלים",
          "מאתיים שקלים"
        ],
        correct: 0
      }
    ],
    win: "הזמן זורם שוב, והגשר מתארך מעצמו.",
    lose: "הגשר נעצר באמצע התהום.",
    lesson: "ריבית דריבית מחשבת רווח גם על הרווחים הקודמים. הזמן הוא המרכיב החזק בה, ולכן מי שמתחיל מוקדם מרוויח הכי הרבה.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#5f86bd", "#b6cfe6");
      drawCloud(ctx, 110 + t * 4, 40, 0.7);
      drawCloud(ctx, 620 + t * 2, 26, 0.5);
      river(ctx, 336, t);

      inked(ctx, c => {
        /* צוקים משני הצדדים */
        px(c, 0, 300, 130, GAME_H - 300, "#6b5f4e");
        px(c, GAME_W - 130, 300, 130, GAME_H - 300, "#6b5f4e");
        px(c, 0, 300, 130, 10, "#8a7c66");
        px(c, GAME_W - 130, 300, 130, 10, "#8a7c66");
        drawBridge(c, 300, 1);
        const grow = curse < 0.4 ? 1 : 0.4;
        drawChart(c, 540, 262, 320, 150, [1, 2, 3, 5, 8], grow, GPAL.gold);
        drawHero(c, 196, 300, 1.7, {walk: t * 3, dim: curse > 0.5});
      });

      scatterGrass(ctx, 300, 8, "#4a8535", 43);
      vignette(ctx);
    }
  },
  {
    place: "מערת ההבטחות",
    intro: "בקירות המערה נחרטו הבטחות לרווח ענק בלי שום סיכון.",
    pool: [
      {
        question: "מישהו מציע לכם השקעה עם שלוש מאות אחוז רווח מובטח ובלי סיכון. מה עושים?",
        answers: [
          "משקיעים מיד לפני שנגמר",
          "לוקחים הלוואה כדי להשקיע יותר",
          "משקיעים חצי מהכסף, ליתר ביטחון",
          "נמנעים. תשואה גבוהה בלי סיכון היא סימן מובהק להונאה"
        ],
        correct: 3
      },
      {
        question: "מה הקשר בין סיכון לבין תשואה?",
        answers: [
          "ככל שהרווח האפשרי גדול יותר, כך גם הסיכון להפסיד גדול יותר",
          "אין ביניהם שום קשר",
          "ההשקעות הבטוחות הן שמרוויחות הכי הרבה",
          "סיכון קיים רק למי שאין לו הרבה כסף"
        ],
        correct: 0
      },
      {
        question: "מציעים לכם עסקה ומוסיפים: תחליטו עכשיו, ואל תספרו לאף אחד. מה זה אומר?",
        answers: [
          "זה סימן אזהרה. הצעה אמיתית סובלת שאלות, זמן ובדיקה",
          "שזו הזדמנות נדירה שחבל לפספס",
          "שהמציע בוטח בכם במיוחד",
          "שכדאי להשקיע סכום קטן כדי לבדוק"
        ],
        correct: 0
      }
    ],
    win: "ההבטחות נמחקות מהקיר. נשאר רק מה שאמיתי.",
    lose: "עוד כורה נכנס פנימה ולא יוצא עם כלום.",
    lesson: "אין תשואה גבוהה בלי סיכון. הבטחה לרווח גדול ובטוח היא הסימן הכי מובהק להונאה.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#241d33", "#3d3350");
      inked(ctx, c => {
        stalactites(c, 9, 71, "#332b44");
        /* עמודי סלע ברקע */
        for (let i = 0; i < 5; i++) {
          const h = 150 + (i % 3) * 60;
          for (let j = 0; j < h; j++) {
            const half = Math.round(34 * (1 - j / h));
            px(c, 120 + i * 190 - half, 320 - j, half * 2, 1, j > h * 0.7 ? "#6a5c80" : "#544a68");
          }
        }
        drawGround(c, 320, "#463d58", "#5b5070");
        scatterRocks(c, 320, 9, "#3a3249", 53);
        drawSign(c, 470, 148, 260, 128, "#8a5cc9");
        drawPercent(c, 470, 148, 0.88, "#8a5cc9");
        drawHero(c, 470, 400, 1.9, {walk: t * 3, dim: curse > 0.5});
      });

      crystal(ctx, 96, 316, 1.1, "#a88cf0");
      crystal(ctx, 872, 320, 0.85, "#8f77d8");
      lightBeam(ctx, 470, 0, 200, 150, "#c9a8ff");
      vignette(ctx);
    }
  },
  {
    place: "שער החוב",
    intro: "שרשרת כבדה חוסמת את השער. היא נבנתה מחובות שלא הוחזרו בזמן.",
    pool: [
      {
        question: "מה קורה כשלא מחזירים את מלוא חוב כרטיס האשראי בסוף החודש?",
        answers: [
          "כלום, זה שירות חינם",
          "מצטברת ריבית, ולעיתים גם ריבית על הריבית",
          "הבנק מוחק את החוב אחרי שנה",
          "מקבלים הנחה בחודש הבא"
        ],
        correct: 1
      },
      {
        question: "מה ההבדל בין כרטיס אשראי לכרטיס עם חיוב מיידי?",
        answers: [
          "באשראי הכסף יורד מאוחר יותר, וזו למעשה הלוואה קטנה. בחיוב מיידי הוא יורד עכשיו",
          "אין הבדל אמיתי, רק הצבע של הכרטיס",
          "בחיוב מיידי אפשר להוציא יותר כסף",
          "כרטיס אשראי עובד רק בחוץ לארץ"
        ],
        correct: 0
      },
      {
        question: "יש שני חובות: אחד גדול בריבית נמוכה, ואחד קטן בריבית גבוהה. במה מתמקדים קודם?",
        answers: [
          "בחוב עם הריבית הגבוהה, כי הוא גדל הכי מהר",
          "בחוב עם הסכום הגדול יותר",
          "בחוב שנלקח אחרון",
          "לא משנה, זה יוצא אותו דבר"
        ],
        correct: 0
      }
    ],
    win: "השרשרת נשברת והשער נפתח לרווחה.",
    lose: "השרשרת מתהדקת עוד חוליה.",
    lesson: "חוב שלא מוחזר בזמן צובר ריבית, והריבית מצטרפת לחוב. אותה ריבית דריבית שעובדת בשבילכם בחיסכון עובדת נגדכם בחוב.",
    draw(ctx, t, curse) {
      drawSky(ctx, "#3f3556", "#6d5f84");
      starField(ctx, 40, 83, 200);

      inked(ctx, c => {
        castleWall(c, 320, 250);
        drawGround(c, 320, GPAL.stoneDark, GPAL.stone);
        cobbles(c, 326, 6, 89);
        drawGate(c, 480, 320, 1, curse > 0.4);
        drawHero(c, 176, 402, 1.9, {walk: t * 3, dim: curse > 0.5, raise: true});
      });

      torch(ctx, 322, 176, t, 1.4);
      torch(ctx, 638, 176, t, 1.4);
      vignette(ctx);
    }
  },
  {
    place: "מגדל המכשף",
    intro: "המכשף ממתין בראש המגדל. נשארה שאלה אחת, והיא הלב של הכול.",
    pool: [
      {
        question: "אז מה זה כסף באמת?",
        answers: [
          "נייר ומתכת ששווים משהו בפני עצמם",
          "מספר שהבנק ממציא",
          "הסכמה משותפת. כולנו מסכימים שיש לו ערך, וזה עובד כל עוד מאמינים בזה",
          "משהו שרק עשירים מבינים"
        ],
        correct: 2
      },
      {
        question: "למה מטבע של עשרה שקלים שווה יותר ממטבע של שקל, אם המתכת דומה?",
        answers: [
          "כי כולנו מסכימים על הערך שכתוב עליו, לא על שווי המתכת",
          "כי הוא כבד יותר",
          "כי הוא עשוי מזהב אמיתי",
          "כי מייצרים ממנו הרבה פחות"
        ],
        correct: 0
      },
      {
        question: "לפני שהיה כסף, איך אנשים סחרו זה עם זה?",
        answers: [
          "בחליפין. זה עבד רק כששני הצדדים רצו בדיוק את מה שיש לשני",
          "לא סחרו בכלל, כל אחד הסתדר לבד",
          "המלך חילק לכולם את מה שהם צריכים",
          "השתמשו בכרטיסי אשראי עשויים מעץ"
        ],
        correct: 0
      }
    ],
    win: "המכשף מאבד את כוחו. הצבע חוזר לכל הממלכה.",
    lose: "המכשף צוחק. הקללה מתפשטת עוד.",
    lesson: "כסף הוא הסכמה משותפת. הוא שווה משהו כי כולנו מסכימים שהוא שווה, וזה מה שמאפשר להחליף בעזרתו דברים אמיתיים.",
    draw(ctx, t, curse) {
      drawSky(ctx, curse > 0.4 ? "#1d1730" : "#5f4383", curse > 0.4 ? "#3d3358" : "#d9906b");
      starField(ctx, 46, 97, 180);
      moon(ctx, 190, 78, 34);
      stormClouds(ctx, t);
      farRidge(ctx, 312, 40, "#2f2844", 5.5);

      inked(ctx, c => {
        drawGround(c, 322, "#3a3247", "#4f4560");
        scatterRocks(c, 322, 8, "#2e2740", 101);
        drawTower(c, 792, 330, 1.35, true);
        drawWizard(c, 656, 372, 1.45, {t: t, casting: curse > 0.3});
        drawHero(c, 236, 404, 2, {walk: t * 3, raise: true, dim: false});
      });

      crow(ctx, 330, 66, t);
      crow(ctx, 470, 104, t + 1.4);
      if (curse > 0.3 && Math.sin(t * 2.2) > 0.93) {
        ctx.fillStyle = "rgba(200,180,255,.22)";
        ctx.fillRect(0, 0, GAME_W, GAME_H);
      }
      vignette(ctx);
    }
  }
];

/* ---------- מנוע המשחק ---------- */

/* ההקדמה נאמרת פעם אחת, בשלב הראשון של המסע */
const QUEST_PROLOGUE = "המכשף קילל את הממלכה וגנב ממנה את הצבע.";

/* כמה שלבים נסוגים כשנגמרים הפנסים */
const SETBACK = 3;
const TRAVEL_TIME = 0.62;

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/* בוחר שאלה אקראית מהמאגר של השלב ומערבב את סדר התשובות */
function rollQuestion(stage, poolIndex, answerOrder) {
  if (!stage.pool || !stage.pool.length) return null;

  const pick = poolIndex != null && stage.pool[poolIndex]
    ? poolIndex
    : Math.floor(Math.random() * stage.pool.length);
  const q = stage.pool[pick];
  const order = answerOrder && answerOrder.length === q.answers.length
    ? answerOrder
    : shuffled(q.answers.map((_, i) => i));

  return {
    pick: pick,
    order: order,
    question: q.question,
    answers: order.map(i => q.answers[i]),
    correct: order.indexOf(q.correct)
  };
}

/* מצלם סצנה שלמה לקנבס נפרד, לשימוש במעבר בין שלבים */
function snapshotScene(stage, t, curse) {
  const c = document.createElement("canvas");
  c.width = GAME_W;
  c.height = GAME_H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (stage && stage.draw) {
    stage.draw(ctx, t, curse);
    applyCurse(ctx, curse);
  }
  return c;
}

class Quest {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.reset();
  }

  reset() {
    this.run = buildRun();
    this.picks = this.run.map(step => rollQuestion(step.stage));
    this.pos = 0;
    this.lanterns = 3;
    this.cleared = new Array(this.run.length).fill(false);
    this.worldsDone = [];
    this.curse = 1;
    this.targetCurse = 1;
    this.travel = null;
    this.t = 0;
  }

  /* ---------- מצב נוכחי ---------- */

  get step() {
    return this.run[this.pos];
  }

  get current() {
    return this.step.stage;
  }

  get currentQuestion() {
    return this.picks[this.pos];
  }

  get world() {
    return WORLDS[this.step.world];
  }

  get isBoss() {
    return !!this.step.boss;
  }

  get isLast() {
    return this.pos === this.run.length - 1;
  }

  /* השלב האחרון בעולם הנוכחי */
  get endsWorld() {
    return !this.step.boss && this.step.indexInWorld === this.step.worldSize - 1;
  }

  get solved() {
    return this.cleared.filter(Boolean).length;
  }

  /* כמה שלבים הושלמו בעולם מסוים */
  worldProgress(worldIndex) {
    let done = 0;
    let total = 0;
    this.run.forEach((step, i) => {
      if (step.boss || step.world !== worldIndex) return;
      total++;
      if (this.cleared[i]) done++;
    });
    return {done: done, total: total};
  }

  /* ---------- התקדמות ---------- */

  clearStage() {
    this.cleared[this.pos] = true;
    this.targetCurse = 0;
  }

  missStage() {
    this.lanterns--;
    this.targetCurse = 1;
  }

  /* מגריל מחדש את השאלה בשלב, כדי שניסיון חוזר לא יהיה זהה */
  reroll() {
    this.picks[this.pos] = rollQuestion(this.current);
  }

  /* נגמרו הפנסים: נסוגים שלושה שלבים אחורה ומתחילים משם מחדש.
     מחזיר כמה שלבים באמת נסוגו. */
  setback() {
    const from = this.pos;
    const to = Math.max(0, this.pos - SETBACK);

    for (let i = to; i <= from && i < this.run.length; i++) {
      this.cleared[i] = false;
      this.picks[i] = rollQuestion(this.run[i].stage);
    }

    this.pos = to;
    this.lanterns = 3;
    this.curse = 1;
    this.targetCurse = 1;
    this.travel = null;
    return from - to;
  }

  goTo(index) {
    this.pos = Math.max(0, Math.min(this.run.length - 1, index));
    this.curse = this.cleared[this.pos] ? 0 : 1;
    this.targetCurse = this.curse;
  }

  /* מעבר מונפש: הסצנה הנוכחית יוצאת שמאלה והבאה נכנסת אחריה */
  travelTo(index) {
    const from = snapshotScene(this.current, this.t, this.curse);
    this.goTo(index);
    const to = snapshotScene(this.current, this.t, this.curse);
    this.travel = {from: from, to: to, p: 0};
  }

  /* ---------- שמירה ---------- */

  save() {
    return {
      v: 2,
      places: this.run.map(step => step.stage.place),
      picks: this.picks.map(p => (p ? {pick: p.pick, order: p.order} : null)),
      pos: this.pos,
      lanterns: this.lanterns,
      cleared: this.cleared,
      worldsDone: this.worldsDone
    };
  }

  load(save) {
    if (!save || save.v !== 2 || !Array.isArray(save.places)) return false;

    /* בונים מסע חדש ומסדרים אותו לפי השמות ששמורים */
    const fresh = buildRun();
    if (save.places.length !== fresh.length) return false;

    const byPlace = {};
    fresh.forEach(step => { byPlace[step.stage.place] = step; });

    const run = [];
    for (let i = 0; i < save.places.length; i++) {
      const step = byPlace[save.places[i]];
      if (!step) return false;
      run.push(step);
    }
    /* אותו שלב לא יכול להופיע פעמיים */
    if (new Set(save.places).size !== save.places.length) return false;

    this.run = run;
    this.picks = run.map((step, i) => {
      const saved = save.picks && save.picks[i];
      return rollQuestion(step.stage, saved ? saved.pick : null, saved ? saved.order : null);
    });
    this.pos = Math.min(run.length - 1, Math.max(0, save.pos | 0));
    this.lanterns = Math.min(3, Math.max(1, save.lanterns | 0));
    this.cleared = run.map((_, i) => !!(save.cleared && save.cleared[i]));
    this.worldsDone = Array.isArray(save.worldsDone) ? save.worldsDone.slice() : [];
    this.curse = this.cleared[this.pos] ? 0 : 1;
    this.targetCurse = this.curse;
    this.travel = null;
    this.t = 0;
    return true;
  }

  /* ---------- ציור ---------- */

  render(dt) {
    this.t += dt;
    const ctx = this.ctx;

    if (this.travel) {
      this.travel.p += dt / TRAVEL_TIME;

      if (this.travel.p < 1) {
        const p = this.travel.p;
        /* האטה בכניסה וביציאה, כדי שהצעד ירגיש כמו הליכה ולא כמו החלקה */
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const dx = Math.round(e * GAME_W);

        ctx.clearRect(0, 0, GAME_W, GAME_H);
        ctx.drawImage(this.travel.from, -dx, 0);
        ctx.drawImage(this.travel.to, GAME_W - dx, 0);

        /* החשכה שמגיעה לשיאה באמצע הדרך, כמו קטע חשוך בין שני מקומות */
        ctx.fillStyle = "rgba(18,16,32," + (0.6 * Math.sin(p * Math.PI)).toFixed(3) + ")";
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        drawMotes(ctx, this.t, this.curse);
        return;
      }

      this.travel = null;
    }

    /* מעבר רך בין מקולל לנקי */
    this.curse += (this.targetCurse - this.curse) * Math.min(1, dt * 3);

    ctx.clearRect(0, 0, GAME_W, GAME_H);
    if (this.current.draw) {
      this.current.draw(ctx, this.t, this.curse);
      applyCurse(ctx, this.curse);
      drawMotes(ctx, this.t, this.curse);
    }
  }
}
