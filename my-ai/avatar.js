/* דמות פיקסל-ארט, מצוירת פיקסל-פיקסל בגודל אמיתי (בלי הגדלה).
   כל אישיות מקבלת עיניים ופה משלה, והצבע נבחר על ידי המשתמש. */

const S = 40;

/* מטריצת באייר 4x4 - נותנת מעברי צל מנוקדים כמו במשחקים ישנים */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.5);

function hsl(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }

export function drawAvatar(canvas, { hue = 200, persona = "fun", blink = false, talk = 0 } = {}) {
  canvas.width = S; canvas.height = S;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, S, S);
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };

  /* גוף: עיגול מוצל לפי תאורה משמאל-למעלה, בארבע רמות */
  const cx = 19.5, cy = 22, r = 14.5;
  const shades = [hsl(hue, 55, 26), hsl(hue, 60, 40), hsl(hue, 65, 54), hsl(hue, 75, 68), hsl(hue, 85, 82)];
  const inside = (x, y) => ((x + 0.5 - cx) ** 2 + ((y + 0.5 - cy) * 1.08) ** 2) <= r * r;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    if (edge) { px(x, y, shades[0]); continue; }
    const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let l = (-0.45 * nx - 0.55 * ny + 0.7 * nz) * 0.5 + 0.5;
    l += BAYER[(y % 4) * 4 + (x % 4)] * 0.22;
    const i = Math.max(1, Math.min(4, Math.round(l * 4)));
    px(x, y, shades[i]);
  }
  /* הבהק קטן */
  px(11, 13, shades[4]); px(12, 12, shades[4]); px(13, 12, "#fff");

  /* אנטנה */
  const acc = hsl((hue + 160) % 360, 80, 60), accD = hsl((hue + 160) % 360, 70, 38);
  for (let y = 4; y < 8; y++) px(19, y, shades[0]);
  px(18, 2, accD); px(19, 1, accD); px(20, 2, accD); px(19, 3, accD);
  px(19, 2, acc); px(18, 1, "#fff");

  const W = "#ffffff", K = hsl(hue, 40, 10), G = "#c9d3e0";
  const blush = hsl(350, 80, 70);

  /* עיניים */
  const eyes = (ex) => {
    if (blink) { for (let x = -2; x <= 2; x++) px(ex + x, 21, K); return; }
    if (persona === "fun") {
      for (let y = -3; y <= 2; y++) for (let x = -2; x <= 2; x++)
        if (x * x * 1.2 + y * y < 7.5) px(ex + x, 20 + y, W);
      px(ex, 20, K); px(ex + 1, 20, K); px(ex, 21, K); px(ex + 1, 21, K);
      px(ex - 1, 18, W);
    } else if (persona === "smart") {
      for (let x = -3; x <= 3; x++) { px(ex + x, 17, K); px(ex + x, 23, K); }
      for (let y = 17; y <= 23; y++) { px(ex - 3, y, K); px(ex + 3, y, K); }
      for (let y = 18; y <= 22; y++) for (let x = -2; x <= 2; x++) px(ex + x, y, G);
      px(ex, 20, K); px(ex + 1, 20, K); px(ex, 21, K); px(ex + 1, 21, K); px(ex - 1, 19, W);
    } else if (persona === "prank") {
      for (let x = -2; x <= 2; x++) px(ex + x, 21, W);
      for (let x = -2; x <= 1; x++) px(ex + x, 20, W);
      px(ex, 21, K); px(ex + 1, 21, K);
      /* גבה אחת מכווצת, השנייה מורמת */
      if (ex < 19) { px(ex - 2, 17, K); px(ex - 1, 17, K); px(ex, 18, K); px(ex + 1, 18, K); }
      else { px(ex - 1, 16, K); px(ex, 16, K); px(ex + 1, 16, K); px(ex + 2, 17, K); }
    } else { /* calm: עיניים מחייכות ^ ^ */
      px(ex - 2, 21, K); px(ex - 1, 20, K); px(ex, 19, K); px(ex + 1, 20, K); px(ex + 2, 21, K);
    }
  };
  eyes(14); eyes(25);
  if (persona === "smart") { px(18, 19, K); px(19, 19, K); px(20, 19, K); px(21, 19, K); }

  /* לחיים */
  px(10, 25, blush); px(11, 25, blush); px(28, 25, blush); px(29, 25, blush);

  /* פה */
  const M = hsl(350, 60, 30), T = hsl(350, 75, 60);
  if (talk) {
    const h = talk === 1 ? 2 : 3;
    for (let y = 0; y < h; y++) for (let x = -2 + (y === h - 1 ? 1 : 0); x <= 2 - (y === h - 1 ? 1 : 0); x++) px(19 + x, 27 + y, M);
    px(19, 27 + h - 1, T);
  } else if (persona === "fun") {
    for (let x = -3; x <= 3; x++) px(19 + x, 27, M);
    for (let x = -2; x <= 2; x++) px(19 + x, 28, M);
    px(18, 28, T); px(19, 28, T); px(20, 28, T);
    for (let x = -1; x <= 1; x++) px(19 + x, 29, M);
  } else if (persona === "smart") {
    for (let x = -2; x <= 2; x++) px(19 + x, 28, M);
  } else if (persona === "prank") {
    px(16, 28, M); px(17, 28, M); px(18, 28, M); px(19, 28, M); px(20, 27, M); px(21, 27, M); px(22, 26, M);
    px(17, 29, W);
  } else {
    px(16, 27, M); px(17, 28, M); px(18, 28, M); px(19, 28, M); px(20, 28, M); px(21, 27, M);
  }
}

/* דמות חיה: ממצמצת מדי פעם, ומזיזה את הפה כשהיא מדברת */
export function liveAvatar(canvas, opts) {
  let o = { ...opts }, blink = false, talking = false, frame = 0, timer = null;
  const draw = () => drawAvatar(canvas, { ...o, blink, talk: talking ? (frame % 3) : 0 });
  const blinkLoop = () => {
    setTimeout(() => { blink = true; draw(); setTimeout(() => { blink = false; draw(); blinkLoop(); }, 140); },
      2500 + Math.random() * 3500);
  };
  draw(); blinkLoop();
  return {
    update(n) { o = { ...o, ...n }; draw(); },
    talk(on) {
      if (on === talking) return;
      talking = on; clearInterval(timer);
      if (on) timer = setInterval(() => { frame++; draw(); }, 130);
      else draw();
    }
  };
}
