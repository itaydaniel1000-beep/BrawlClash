/* ===== איורי האתר =====
   כרזת הפתיחה של המסך הראשי, איורי הכרטיסים, ואיור השיעור היומי.
   הכול מצויר בקוד, באותה שפה ויזואלית של המסע. */

/* ---------- דרקון מעופף ---------- */

/* צללית דרקון באוויר, לרקעים. פונה שמאלה. */
function drawFlyingDragon(ctx, x, y, s, t) {
  const S = n => Math.round(n * s);
  const flap = Math.sin(t * 3.4);
  const rise = Math.round(flap * 5 * s);
  const cy = y + rise;

  /* כנפיים - משולשים שנעים למעלה ולמטה */
  [-1, 1].forEach(dir => {
    const tipY = cy - S(30) - Math.round(flap * 22 * s) * (dir > 0 ? 1 : 0.8);
    ctx.fillStyle = dir > 0 ? "#6d2230" : "#8f2f3c";
    ctx.beginPath();
    ctx.moveTo(x, cy - S(4));
    ctx.lineTo(x + dir * S(46), tipY);
    ctx.lineTo(x + dir * S(52), tipY + S(20));
    ctx.lineTo(x + dir * S(14), cy + S(8));
    ctx.closePath();
    ctx.fill();
  });

  /* גוף */
  ellipse(ctx, x, cy, S(20), S(11), "#8f2f3c");
  /* צוואר וראש */
  taper(ctx, [[x - S(14), cy - S(2)], [x - S(34), cy - S(8)], [x - S(48), cy - S(4)]],
    S(7), S(5), "#8f2f3c");
  px(ctx, x - S(58), cy - S(8), S(14), S(8), "#b84550");
  px(ctx, x - S(50), cy - S(10), S(4), S(3), "#ffd23f");
  /* קרן */
  px(ctx, x - S(44), cy - S(15), S(3), S(6), "#ede0c4");
  /* זנב */
  taper(ctx, [[x + S(16), cy], [x + S(40), cy + S(6)], [x + S(58), cy - S(4)]],
    S(6), S(2), "#8f2f3c");
}

/* גרסת vignette שמתאימה את עצמה לגודל הקנבס, ולא ל-960x420 של המסע */
function bannerVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(12,10,24,.34)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ---------- כרזת הממלכה ---------- */

/* פנורמה של שלושת העולמות: הכפר מימין, הדרך באמצע, המצודה משמאל.
   בעברית קוראים מימין לשמאל, ולכן זה גם כיוון המסע. */
function drawKingdom(ctx, W, H, t) {
  const g = H / 300;
  const S = n => Math.round(n * g);
  const ground = H - S(52);

  ctx.clearRect(0, 0, W, H);

  /* שמיים שעוברים מבוקר בהיר מימין לסערה משמאל */
  const sky = ctx.createLinearGradient(W, 0, 0, 0);
  sky.addColorStop(0, "#7fb8e0");
  sky.addColorStop(0.45, "#9ab0d0");
  sky.addColorStop(1, "#3a3050");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawSun(ctx, W - S(90), S(52), S(26));
  drawCloud(ctx, (W * 0.62 + t * 6) % (W + 200) - 100, S(40), g * 0.7);
  drawCloud(ctx, (W * 0.38 + t * 4) % (W + 200) - 100, S(26), g * 0.5);

  /* כוכבים בצד החשוך */
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W * 0.34, H);
  ctx.clip();
  starField(ctx, 30, 17, H * 0.6);
  ctx.restore();

  /* רכסים */
  farRidge(ctx, ground - S(56), S(44), "#8fa8bd", 3.3);
  farRidge(ctx, ground - S(34), S(30), "#7d93a8", 1.2);

  /* ים קטן באמצע, בין הכפר למצודה */
  ctx.save();
  ctx.beginPath();
  ctx.rect(W * 0.36, 0, W * 0.24, H);
  ctx.clip();
  seaBand(ctx, ground - S(30), S(34), t);
  ctx.restore();

  inked(ctx, c => {
    drawGround(c, ground, "#6ab04c", "#84c95e");

    /* --- מצודת המכשף, משמאל --- */
    px(c, 0, ground - S(74), Math.round(W * 0.3), S(74), "#6f7b88");
    px(c, 0, ground - S(74), Math.round(W * 0.3), S(8), "#8a95a3");
    for (let x = S(10); x < W * 0.3; x += S(34)) {
      px(c, x, ground - S(88), S(18), S(16), "#6f7b88");
    }
    drawTower(c, S(58), ground - S(70), g * 0.62, true);
    drawGate(c, Math.round(W * 0.22), ground, g * 0.52, true);

    /* --- הדרך והנמל, באמצע --- */
    drawShip(c, Math.round(W * 0.46), ground - S(24), g * 0.34, t, 0);
    drawBridge(c, ground - S(4), g * 0.42);
    crate(c, Math.round(W * 0.6), ground, g * 0.55);
    barrel(c, Math.round(W * 0.63), ground, g * 0.5);

    /* --- הכפר, מימין --- */
    drawCottage(c, W - S(64), ground, g * 0.66);
    drawCottage(c, W - S(140), ground - S(4), g * 0.5);
    drawStall(c, W - S(214), ground, g * 0.58, "#b5533f");
    drawTree(c, W - S(280), ground, g * 0.46);
    drawWell(c, W - S(340), ground, g * 0.44, false);

    /* --- הגיבור צועד מהכפר אל המצודה --- */
    const walk = (t * 26) % (W * 0.42);
    drawHero(c, Math.round(W * 0.72 - walk), ground + S(16), g * 0.72, {walk: t * 3});
  });

  /* דרקון חג מעל המצודה */
  drawFlyingDragon(ctx, Math.round(W * 0.16 + Math.sin(t * 0.5) * W * 0.06), S(64), g * 0.72, t);

  scatterGrass(ctx, ground, 22, "#4a8535", 5);
  bannerVignette(ctx, W, H);
}

/* ---------- איורי הכרטיסים ---------- */

function cardArtVideos(ctx, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  /* מסך עם סצנה קטנה בפנים */
  roundRect(ctx, cx - 40, cy - 30, 80, 56, 7, "#2a2f45");
  px(ctx, cx - 34, cy - 24, 68, 44, "#7fb8e0");
  px(ctx, cx - 34, cy + 6, 68, 14, "#6ab04c");
  drawSun(ctx, cx + 18, cy - 14, 7);
  drawCottage(ctx, cx - 14, cy + 10, 0.3);
  drawCoin(ctx, cx + 16, cy + 12, 5, 1);
  /* רגלית */
  px(ctx, cx - 12, cy + 26, 24, 6, "#2a2f45");
  px(ctx, cx - 22, cy + 32, 44, 6, "#4a5570");
  /* חורי סרט משני הצדדים */
  for (let i = -2; i <= 2; i++) {
    px(ctx, cx - 46, cy - 6 + i * 11, 5, 6, "#4a5570");
    px(ctx, cx + 41, cy - 6 + i * 11, 5, 6, "#4a5570");
  }
}

function cardArtQuest(ctx, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  /* ראש דרקון מול פנס הגיבור */
  ctx.fillStyle = "#8f2f3c";
  roundRect(ctx, cx - 4, cy - 22, 44, 30, 11, "#8f2f3c");
  roundRect(ctx, cx - 24, cy - 14, 26, 18, 6, "#b84550");
  roundRect(ctx, cx - 22, cy + 2, 50, 11, 5, "#5f1c26");
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = "#f2e8d0";
    ctx.beginPath();
    ctx.moveTo(cx - 20 + i * 11, cy + 2);
    ctx.lineTo(cx - 16 + i * 11, cy + 10);
    ctx.lineTo(cx - 12 + i * 11, cy + 2);
    ctx.closePath();
    ctx.fill();
  }
  horn(ctx, cx + 22, cy - 20, 20, 5, 1, "#ede0c4", "#c4b28e");
  circle(ctx, cx + 2, cy - 8, 5, "#ffd23f");
  px(ctx, cx, cy - 13, 3, 10, "#1a1f2e");
  /* פנס מולו */
  px(ctx, cx - 40, cy - 12, 3, 9, "#75542c");
  roundRect(ctx, cx - 46, cy - 4, 15, 16, 4, "#6f7b88");
  circle(ctx, cx - 39, cy + 4, 5, "#ffd85e");
  circle(ctx, cx - 39, cy + 4, 11, "rgba(255,216,94,.35)");
}

function cardArtLesson(ctx, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  /* ספר פתוח */
  ctx.fillStyle = "#16785c";
  ctx.beginPath();
  ctx.moveTo(cx - 44, cy - 14);
  ctx.quadraticCurveTo(cx - 20, cy - 22, cx, cy - 12);
  ctx.lineTo(cx, cy + 20);
  ctx.quadraticCurveTo(cx - 20, cy + 10, cx - 44, cy + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d8efe6";
  ctx.beginPath();
  ctx.moveTo(cx + 44, cy - 14);
  ctx.quadraticCurveTo(cx + 20, cy - 22, cx, cy - 12);
  ctx.lineTo(cx, cy + 20);
  ctx.quadraticCurveTo(cx + 20, cy + 10, cx + 44, cy + 18);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    px(ctx, cx + 8, cy - 6 + i * 8, 26, 3, "#9ab5aa");
    px(ctx, cx - 34, cy - 6 + i * 8, 26, 3, "#4f9e7c");
  }
  /* נורה מעל */
  circle(ctx, cx, cy - 30, 11, "#f5c542");
  px(ctx, cx - 5, cy - 20, 11, 4, "#b8c2cc");
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI;
    px(ctx, Math.round(cx + Math.cos(a) * 19) - 1, Math.round(cy - 30 + Math.sin(a) * 19) - 1,
      3, 3, "#ffd85e");
  }
}

const CARD_ART = {
  videos: cardArtVideos,
  quest: cardArtQuest,
  lesson: cardArtLesson
};

function paintCardArt(canvas) {
  if (!canvas) return;
  const draw = CARD_ART[canvas.dataset.art];
  if (!draw) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  inked(ctx, c => draw(c, canvas.width, canvas.height), 3);
}

/* ---------- איור השיעור היומי ---------- */

/* שלוש צנצנות עם תוויות, כמו כלל חמישים־שלושים־עשרים */
function drawLessonArt(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const base = H - 22;

  inked(ctx, c => {
    /* שולחן */
    px(c, 0, base, W, 18, "#a3763f");
    px(c, 0, base, W, 5, "#c08f52");

    const tints = ["#4f9e5c", "#8a5cc9", "#f5c542"];
    const fills = [5, 3, 2];
    for (let i = 0; i < 3; i++) {
      drawJar(c, Math.round(W * (0.2 + i * 0.3)), base - 54, 0.92, fills[i], 6, tints[i]);
    }

    /* מטבעות מפוזרים */
    drawCoin(c, Math.round(W * 0.06), base - 8, 9, 0.9);
    drawCoin(c, Math.round(W * 0.1), base - 6, 7, 0.9);
    drawCoin(c, Math.round(W * 0.93), base - 8, 9, 0.9);
  }, 3);
}

function paintLessonArt(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawLessonArt(ctx, canvas.width, canvas.height);
}

/* ---------- לולאת הכרזה ---------- */

let bannerRaf = null;
let bannerT = 0;
let bannerLast = 0;

function paintBanner() {
  const canvas = document.getElementById("homeBanner");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawKingdom(ctx, canvas.width, canvas.height, bannerT);
}

function bannerLoop(now) {
  const canvas = document.getElementById("homeBanner");
  const home = document.getElementById("home");
  /* מצייר רק כשהמסך הראשי פתוח, כדי לא לבזבז סוללה */
  if (!canvas || !home || !home.classList.contains("active")) {
    bannerRaf = null;
    return;
  }
  bannerT += Math.min(0.1, (now - bannerLast) / 1000);
  bannerLast = now;
  paintBanner();
  bannerRaf = requestAnimationFrame(bannerLoop);
}

function startBanner() {
  if (bannerRaf) return;
  paintBanner();
  bannerLast = performance.now();
  bannerRaf = requestAnimationFrame(bannerLoop);
}

function stopBanner() {
  if (bannerRaf) cancelAnimationFrame(bannerRaf);
  bannerRaf = null;
}

/* מצייר את כל האיורים הסטטיים פעם אחת */
function paintSiteArt() {
  document.querySelectorAll("canvas[data-art]").forEach(paintCardArt);
  paintLessonArt(document.getElementById("lessonArt"));
  paintBanner();
}
