/* ===== סרטוני האנימציה לשאר השיעורים =====
   משתמש במנוע, בדמויות ובחפצים שמוגדרים ב-movie.js.
   כאן נוספים חפצים ייחודיים לנושאים, וכל תשעת הסרטונים. */

/* ---------- חפצים נוספים ---------- */

function drawPiggy(ctx, x, y, s) {
  const k = s || 1;
  ellipse(ctx, x, y, 46 * k, 34 * k, "#f0a0b8");
  ellipse(ctx, x + 40 * k, y - 4 * k, 20 * k, 17 * k, "#f0a0b8");
  ellipse(ctx, x + 56 * k, y - 2 * k, 8 * k, 7 * k, "#e0819c");
  circle(ctx, x + 55 * k, y - 4 * k, 2 * k, PAL.ink);
  circle(ctx, x + 58 * k, y, 2 * k, PAL.ink);
  circle(ctx, x + 34 * k, y - 10 * k, 4 * k, PAL.ink);
  /* אוזן משולשת שיושבת על הראש */
  for (var e = 0; e < 18 * k; e++) {
    var half = Math.round(9 * k * (1 - e / (18 * k)));
    px(ctx, x + 26 * k - half, y - 24 * k - e, half * 2, 1, "#e0819c");
  }
  /* רגליים */
  px(ctx, x - 26 * k, y + 28 * k, 14 * k, 16 * k, "#e0819c");
  px(ctx, x + 10 * k, y + 28 * k, 14 * k, 16 * k, "#e0819c");
  /* חריץ */
  px(ctx, x - 12 * k, y - 32 * k, 30 * k, 7 * k, PAL.ink);
  /* זנב */
  px(ctx, x - 48 * k, y - 12 * k, 10 * k, 6 * k, "#e0819c");
}

/* צנצנת עם תווית צבעונית ומילוי משתנה */
function drawJar(ctx, x, baseY, w, h, fill, color) {
  roundRect(ctx, x - w / 2, baseY - h, w, h, 10, "#dceaf5");
  const fh = Math.round(h * Math.max(0, Math.min(1, fill)));
  if (fh > 4) roundRect(ctx, x - w / 2 + 6, baseY - fh, w - 12, fh - 4, 8, color);
  px(ctx, x - w / 2 - 4, baseY - h - 10, w + 8, 12, PAL.wood);
}

function drawClock(ctx, x, y, r, t) {
  circle(ctx, x, y, r, "#f5f2e8");
  circle(ctx, x, y, r * 0.86, "#ffffff");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    px(ctx, x + Math.cos(a) * r * 0.74 - 2, y + Math.sin(a) * r * 0.74 - 2, 5, 5, PAL.ink);
  }
  const hh = (t || 0) * 0.5;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = Math.max(3, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hh - Math.PI / 2) * r * 0.45, y + Math.sin(hh - Math.PI / 2) * r * 0.45);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos((t || 0) * 2 - Math.PI / 2) * r * 0.72, y + Math.sin((t || 0) * 2 - Math.PI / 2) * r * 0.72);
  ctx.stroke();
}

/* גרף עמודות עולה */
function drawChart(ctx, x, baseY, w, h, values, grow, color) {
  px(ctx, x, baseY, w, 6, PAL.ink);
  px(ctx, x - 6, baseY - h, 6, h + 6, PAL.ink);
  const bw = Math.floor(w / values.length) - 12;
  const max = Math.max.apply(null, values);
  values.forEach((v, i) => {
    const vh = Math.round((v / max) * h * Math.max(0, Math.min(1, grow * values.length - i)));
    if (vh > 2) {
      roundRect(ctx, x + 8 + i * (bw + 12), baseY - vh, bw, vh, 5, color || PAL.green);
    }
  });
}

function drawCart(ctx, x, y, s) {
  const k = s || 1;
  px(ctx, x - 40 * k, y - 34 * k, 8 * k, 34 * k, PAL.silverDark);
  px(ctx, x - 52 * k, y - 40 * k, 20 * k, 8 * k, PAL.silverDark);
  roundRect(ctx, x - 32 * k, y - 30 * k, 76 * k, 34 * k, 6 * k, PAL.silver);
  px(ctx, x - 32 * k, y - 18 * k, 76 * k, 4 * k, PAL.silverDark);
  circle(ctx, x - 18 * k, y + 14 * k, 9 * k, PAL.ink);
  circle(ctx, x + 30 * k, y + 14 * k, 9 * k, PAL.ink);
}

/* תווית מחיר */
function drawTag(ctx, x, y, w, h, color) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 8, color || PAL.gold);
  circle(ctx, x - w / 2 + 14, y, 6, PAL.ink);
  px(ctx, x - w / 2 + 26, y - h / 4, w * 0.5, 6, PAL.ink);
  px(ctx, x - w / 2 + 26, y + h / 8, w * 0.34, 6, PAL.ink);
}

function drawBrokenPhone(ctx, x, y, w, h) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 14, PAL.ink);
  roundRect(ctx, x - w / 2 + 8, y - h / 2 + 18, w - 16, h - 36, 6, "#8fa4c0");
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - w / 3, y - h / 3);
  ctx.lineTo(x + 6, y - 6);
  ctx.lineTo(x - w / 5, y + h / 6);
  ctx.lineTo(x + w / 3, y + h / 3);
  ctx.stroke();
}

function drawBike(ctx, x, y, s) {
  const k = s || 1;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 6 * k;
  [[-38, 0], [38, 0]].forEach(w => {
    ctx.beginPath();
    ctx.arc(x + w[0] * k, y, 26 * k, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.strokeStyle = PAL.red;
  ctx.lineWidth = 7 * k;
  ctx.beginPath();
  ctx.moveTo(x - 38 * k, y);
  ctx.lineTo(x - 6 * k, y - 28 * k);
  ctx.lineTo(x + 22 * k, y - 28 * k);
  ctx.lineTo(x + 38 * k, y);
  ctx.moveTo(x - 6 * k, y - 28 * k);
  ctx.lineTo(x + 4 * k, y);
  ctx.lineTo(x + 38 * k, y);
  ctx.stroke();
  px(ctx, x - 16 * k, y - 38 * k, 22 * k, 8 * k, PAL.ink);
  px(ctx, x + 20 * k, y - 38 * k, 20 * k, 6 * k, PAL.ink);
}


/* סמל אחוזים - נותן משמעות לשלטי מבצע בלי להשתמש בטקסט */
function drawPercent(ctx, x, y, s, color) {
  var k = s || 1;
  var c = color || PAL.red;
  circle(ctx, x - 22 * k, y - 20 * k, 13 * k, c);
  circle(ctx, x - 22 * k, y - 20 * k, 6 * k, "#ffffff");
  circle(ctx, x + 22 * k, y + 20 * k, 13 * k, c);
  circle(ctx, x + 22 * k, y + 20 * k, 6 * k, "#ffffff");
  for (var i = -34 * k; i < 34 * k; i++) {
    px(ctx, x + i, y - i, Math.max(3, 7 * k), Math.max(3, 7 * k), c);
  }
}

/* שלט פרסומת גדול */
function drawSign(ctx, x, y, w, h, color) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 12, color || PAL.red);
  roundRect(ctx, x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, 8, "#ffffff");
  px(ctx, x - 12, y + h / 2, 24, 60, PAL.wood);
}

/* ביצים בסלים - להמחשת פיזור */
function drawEggBasket(ctx, x, y, s, eggs) {
  const k = s || 1;
  roundRect(ctx, x - 34 * k, y - 16 * k, 68 * k, 32 * k, 10 * k, PAL.wood);
  px(ctx, x - 34 * k, y - 4 * k, 68 * k, 5 * k, PAL.woodDark);
  for (let i = 0; i < (eggs || 3); i++) {
    ellipse(ctx, x - 20 * k + i * 20 * k, y - 22 * k, 9 * k, 12 * k, "#fdf6e8");
  }
}

/* מגן - קרן חירום */
function drawShield(ctx, x, y, s) {
  const k = s || 1;
  const w = 60 * k, h = 76 * k;
  for (let i = 0; i < h; i++) {
    const p = i / h;
    const half = Math.round(w * (p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45));
    px(ctx, x - half, y - h / 2 + i, half * 2, 1, PAL.blue);
  }
  px(ctx, x - 8 * k, y - 22 * k, 16 * k, 44 * k, "#ffffff");
  px(ctx, x - 24 * k, y - 6 * k, 48 * k, 16 * k, "#ffffff");
}

/* פס התקדמות */
function drawProgress(ctx, x, y, w, h, p, color) {
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2, "#dceaf5");
  const fw = Math.round(w * Math.max(0, Math.min(1, p)));
  if (fw > h) roundRect(ctx, x - w / 2, y - h / 2, fw, h, h / 2, color || PAL.green);
}

/* חץ מכוון */
function drawArrow(ctx, x1, y1, x2, y2, thick, color) {
  ctx.strokeStyle = color || PAL.ink;
  ctx.lineWidth = thick || 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = (thick || 8) * 2.2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.5) * s, y2 - Math.sin(a - 0.5) * s);
  ctx.lineTo(x2 - Math.cos(a + 0.5) * s, y2 - Math.sin(a + 0.5) * s);
  ctx.closePath();
  ctx.fillStyle = color || PAL.ink;
  ctx.fill();
}

/* ---------- בונה סרטון ומחשב תזמוני קריינות אוטומטית ---------- */

function buildMovie(id, scenes) {
  const shots = [];
  const cues = [];
  let clock = 0;
  let n = 0;

  scenes.forEach(scene => {
    /* אורך השוט נגזר מהקריינות עצמה, כדי שלא יישאר שקט מיותר בסוף */
    const talk = (scene.lines || []).reduce(function (sum, line) {
      return sum + line.text.length * 0.075 + 0.45;
    }, 0);
    const duration = scene.duration || Math.max(scene.min || 6, Math.round(talk + 1.4));

    shots.push({duration: duration, draw: scene.draw});

    /* הרפליקות של הסצנה מתחלקות לאורכה, עם נשימה בין אחת לשנייה */
    let lineTime = clock + 0.5;
    (scene.lines || []).forEach(line => {
      cues.push({
        id: `${id}-${String(++n).padStart(2, "0")}`,
        who: line.who || "narrator",
        t: Math.round(lineTime * 10) / 10,
        text: line.text
      });
      lineTime += line.text.length * 0.075 + 0.45;
    });

    clock += duration;
  });

  return {id: id, shots: shots, cues: cues};
}

/* ---------- רקעים חוזרים ---------- */

function homeScene(ctx, t, wallTone) {
  drawSky(ctx, wallTone || "#8fb8d8", "#cfe4f2");
}

function shopScene(ctx) {
  drawSky(ctx, "#e8d9c0", "#f7efe0");
}

/* ================= 1. צורך או רצון ================= */

const needsWantsMovie = buildMovie("needs-wants", [
  {
    lines: [
      {text: "כל יום אנחנו מחליטים על מה להוציא כסף."},
      {text: "ויש שאלה אחת שעוזרת בכל החלטה כזאת."},
      {text: "וההבדל בין שתי התשובות שווה הרבה כסף."},
      {who: "shopper", text: "רגע. אני חייב את זה, או שאני רק רוצה?"}
    ],
    draw(ctx, t) {
      homeScene(ctx, t);
      inked(ctx, c => {
        drawGround(c, 400, PAL.wood, "#c48f4e");
        drawPerson(c, 480, 520, {walk: 0, size: 1.6, shirt: PAL.blue, pants: PAL.stoneDark});
        drawApple(c, 230, 250, 3);
        drawShoe(c, 740, 250, 2.6);
        if (t > 3) drawQuestionMark(c, 480, 150, 1.1);
      });
    }
  },
  {
    lines: [
      {text: "צורך הוא משהו שאנחנו חייבים כדי לחיות."},
      {text: "אוכל, מים, בגדים וקורת גג."},
      {text: "בלי אלה פשוט אי אפשר להסתדר."},
      {who: "shopper", text: "אוקיי, את אלה אני באמת צריך."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#d4f0dc");
      inked(ctx, c => {
        drawGround(c, 420, PAL.grass, PAL.grassLight);
        drawApple(c, 200, 250, 3.4);
        drawCheese(c, 470, 260, 3);
        drawHut(c, 760, 420, 1.7);
        if (t > 4) drawYes(c, 480, 120, 1.6);
      });
    }
  },
  {
    lines: [
      {text: "רצון הוא משהו שנעים שיהיה לנו, אבל אפשר גם בלי."},
      {text: "צעצוע חדש, ממתק, או נעליים יפות יותר."},
      {text: "וזה בסדר גמור לרצות דברים כאלה."},
      {who: "shopper", text: "אבל אני ממש רוצה את האופניים האלה!"}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#c9a0e8", "#eddcf7");
      inked(ctx, c => {
        drawGround(c, 420, PAL.wood, "#c48f4e");
        drawShoe(c, 220, 270, 3);
        drawBike(c, 520, 280, 1.5);
        drawTag(c, 790, 260, 130, 80, PAL.gold);
      });
    }
  },
  {
    lines: [
      {text: "בחנות זה מתערבב. הכול נראה כמו משהו שאנחנו חייבים."},
      {text: "אז לפני שקונים, עוצרים ושואלים."},
      {text: "השלטים והמוזיקה בנויים בדיוק בשביל זה."},
      {who: "shopper", text: "פתאום הכול נראה לי חשוב."}
    ],
    draw(ctx, t) {
      shopScene(ctx);
      inked(ctx, c => {
        drawGround(c, 400, "#b8a890", "#d4c8b4");
        drawPerson(c, 260, 525, {walk: 0, size: 1.9, shirt: PAL.green, pants: PAL.dirt});
        drawCart(c, 700, 460, 2.4);
        drawTag(c, 660, 220, 150, 92, PAL.red);
        drawShoe(c, 850, 300, 2.2);
        if (t > 4) drawQuestionMark(c, 470, 180, 0.9);
      });
    }
  },
  {
    lines: [
      {text: "יש טריק פשוט: מחכים יום אחד."},
      {text: "אם למחרת עדיין רוצים את זה, כנראה באמת התכוונו."},
      {text: "רוב הפעמים מגלים שכבר לא כל כך רצינו."},
      {who: "shopper", text: "טוב. אני מחכה יום אחד ונראה."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawClock(c, 480, 240, 130, t);
        drawPerson(c, 130, 530, {walk: 0, size: 1.3, shirt: PAL.blue, pants: PAL.stoneDark, happy: t > 6});
        drawTag(c, 830, 300, 110, 70, PAL.gold);
      });
    }
  },
  {
    lines: [
      {text: "קודם מכסים את הצרכים, ורק אחר כך את הרצונות."},
      {text: "ככה אף פעם לא נשארים בלי מה שחשוב באמת."},
      {text: "והחיסכון לא נשאר אחרון בתור."},
      {who: "shopper", text: "קודם מה שחייבים, ואז הכיף."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawJar(c, 250, 430, 150, 190, Math.min(1, t / 4), PAL.green);
        drawJar(c, 480, 430, 150, 190, Math.max(0, Math.min(1, (t - 4) / 4)), PAL.purple);
        drawArrow(c, 340, 300, 400, 300, 8);
        drawPerson(c, 800, 520, {walk: 0, size: 1.4, shirt: PAL.blue, pants: PAL.stoneDark, happy: true, armUp: t > 8});
      });
    }
  },
  {
    lines: [
      {text: "שני הסוגים בסדר גמור. מותר גם ליהנות."},
      {text: "העיקר לדעת מה זה מה, לפני שמוציאים."},
      {text: "וזו כל התשובה: לא לוותר, רק לדעת."},
      {who: "shopper", text: "עכשיו אני יודע מה לשאול לפני שאני קונה!"}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 330, 95);
      inked(ctx, c => {
        drawGround(c, 400, PAL.grassDark, PAL.grass);
        drawPerson(c, 480, 520, {walk: 0, size: 1.7, shirt: PAL.blue, pants: PAL.stoneDark, happy: true, armUp: true});
        drawApple(c, 230, 250, 2.6);
        drawShoe(c, 730, 260, 2.4);
        if (t > 5) drawYes(c, 480, 130, 1.5);
      });
    }
  }
]);

/* סימן שאלה, בשימוש בכמה סרטונים */
function drawQuestionMark(ctx, x, y, s, color) {
  const k = s || 1;
  const c = color || PAL.red;
  px(ctx, x - 30 * k, y - 74 * k, 62 * k, 20 * k, c);
  px(ctx, x - 46 * k, y - 62 * k, 20 * k, 22 * k, c);
  px(ctx, x + 26 * k, y - 62 * k, 20 * k, 38 * k, c);
  px(ctx, x + 4 * k, y - 30 * k, 22 * k, 22 * k, c);
  px(ctx, x - 6 * k, y - 12 * k, 20 * k, 34 * k, c);
  px(ctx, x - 6 * k, y + 34 * k, 20 * k, 20 * k, c);
}

/* ================= 2. בונים תקציב ================= */

const budgetMovie = buildMovie("budget", [
  {
    lines: [
      {text: "תקציב זה לא משהו מסובך. זו פשוט תוכנית."},
      {text: "כמה כסף נכנס, וכמה כסף יוצא."},
      {text: "בלי התוכנית הזאת הכסף פשוט נעלם."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 420, PAL.wood, "#c48f4e");
        drawArrow(c, 120, 250, 400, 250, 10, PAL.green);
        drawPiggy(c, 520, 300, 1.5);
        drawArrow(c, 700, 250, 900, 250, 10, PAL.red);
      });
    }
  },
  {
    lines: [
      {text: "שלב ראשון: רושמים כל שקל שנכנס."},
      {text: "דמי כיס, עבודה, מתנות מיום ההולדת."},
      {text: "גם סכומים קטנים נחשבים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        const n = Math.min(6, Math.floor(t * 0.8));
        for (let i = 0; i < n; i++) {
          drawCoin(c, 180 + i * 120, 250 + Math.sin(t * 2 + i) * 14, 46, 1);
        }
      });
    }
  },
  {
    lines: [
      {text: "שלב שני: רושמים כל שקל שיוצא."},
      {text: "גם ההוצאות הקטנות. דווקא הן מצטברות."},
      {text: "קפה, ממתק, משחק. הכול נספר."}
    ],
    draw(ctx, t) {
      shopScene(ctx);
      inked(ctx, c => {
        drawGround(c, 420, "#b8a890", "#d4c8b4");
        drawCart(c, 300, 460, 2);
        drawTag(c, 600, 220, 110, 70, PAL.red);
        drawTag(c, 760, 300, 100, 64, PAL.gold);
        drawTag(c, 640, 380, 90, 58, PAL.purple);
      });
    }
  },
  {
    lines: [
      {text: "שלב שלישי, והכי חשוב: מחליטים כמה הולך לחיסכון."},
      {text: "ומעבירים אותו מיד, לפני שמוציאים על משהו אחר."},
      {text: "מה שנשאר בסוף החודש כמעט אף פעם לא מגיע לחיסכון."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawCoin(c, 220, 240, 52, 1);
        drawArrow(c, 300, 250, 470, 280, 10, PAL.green);
        drawPiggy(c, 620, 300, 1.6);
      });
    }
  },
  {
    lines: [
      {text: "מחלקים את מה שנשאר לשלוש צנצנות."},
      {text: "צרכים, רצונות, וחיסכון."},
      {text: "ככה רואים בעין אחת לאן הכול הולך."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawJar(c, 200, 440, 140, 180, Math.min(1, t / 3), PAL.green);
        drawJar(c, 480, 440, 140, 180, Math.max(0, Math.min(1, (t - 3) / 3)), PAL.purple);
        drawJar(c, 760, 440, 140, 180, Math.max(0, Math.min(1, (t - 6) / 3)), PAL.gold);
      });
    }
  },
  {
    lines: [
      {text: "פעם בשבוע בודקים אם עומדים בתוכנית."},
      {text: "לא כדי להעניש את עצמנו, אלא כדי לדעת איפה אנחנו."},
      {text: "ואם חרגתם, פשוט מתקנים בשבוע הבא."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawClock(c, 250, 250, 110, t);
        drawChart(c, 480, 400, 400, 220, [3, 5, 4, 7], Math.min(1, t / 5), PAL.blue);
        drawPerson(c, 880, 530, {walk: 0, size: 1.2, shirt: PAL.green, pants: PAL.dirt, happy: true});
      });
    }
  },
  {
    lines: [
      {text: "תקציב לא אומר להפסיק ליהנות."},
      {text: "הוא רק נותן לכל שקל תפקיד, כדי שלא ייעלם לבד."},
      {text: "וזה כל הסוד של תקציב שעובד."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 330, 90);
      inked(ctx, c => {
        drawGround(c, 410, PAL.grassDark, PAL.grass);
        drawPerson(c, 480, 520, {walk: 0, size: 1.6, shirt: PAL.blue, pants: PAL.stoneDark, happy: true, armUp: true});
        drawPiggy(c, 200, 330, 1.2);
        drawJar(c, 800, 470, 120, 150, 0.8, PAL.gold);
      });
    }
  }
]);

/* ================= 3. הכלל של 50-30-20 ================= */

const savingHabitMovie = buildMovie("saving-habit", [
  {
    lines: [
      {text: "קיבלתם מאה שקל. מה עושים איתם?"},
      {text: "יש כלל פשוט שקל מאוד לזכור."},
      {text: "קוראים לו חמישים שלושים עשרים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawBill(c, 480, 250 + Math.sin(t * 1.4) * 14, 340, 175);
        if (t > 4) drawQuestionMark(c, 800, 220, 0.9);
      });
    }
  },
  {
    lines: [
      {text: "חמישים אחוז הולכים לצרכים."},
      {text: "זה הדברים שאי אפשר בלעדיהם."},
      {text: "אוכל, תחבורה, וכל מה שחייבים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 440, PAL.grass, PAL.grassLight);
        drawJar(c, 300, 440, 190, 230, Math.min(1, t / 4), PAL.green);
        drawApple(c, 700, 230, 2.8);
        drawHut(c, 780, 440, 1.3);
      });
    }
  },
  {
    lines: [
      {text: "שלושים אחוז לרצונות."},
      {text: "כאן נמצא הכיף, וזה חלק לגיטימי מהתוכנית."},
      {text: "בלי החלק הזה שום תוכנית לא מחזיקה מעמד."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#c9a0e8", "#eddcf7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawJar(c, 300, 440, 160, 175, Math.min(1, t / 4), PAL.purple);
        drawBike(c, 700, 300, 1.5);
      });
    }
  },
  {
    lines: [
      {text: "ועשרים אחוז לחיסכון."},
      {text: "את החלק הזה מעבירים ראשון, ביום שמקבלים את הכסף."},
      {text: "לפני שמספיקים להתפתות למשהו אחר."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#e8c46a", "#f7e8c0");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawJar(c, 300, 440, 130, 130, Math.min(1, t / 4), PAL.gold);
        drawPiggy(c, 700, 340, 1.6);
        if (t > 6) drawArrow(c, 400, 350, 590, 340, 9, PAL.gold);
      });
    }
  },
  {
    lines: [
      {text: "למה דווקא לחסוך ראשון?"},
      {text: "כי מה שנשאר בסוף החודש תמיד נעלם."},
      {text: "תמיד יש משהו קטן שקורה בדרך."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawCoinStack(c, 250, 420, 7, 56, 28);
        drawArrow(c, 350, 300, 560, 300, 9, PAL.red);
        drawCoinStack(c, 700, 420, Math.max(1, 7 - Math.floor(t)), 56, 28);
      });
    }
  },
  {
    lines: [
      {text: "שלוש הצנצנות ביחד הן כל הכסף שלכם."},
      {text: "ועכשיו לכל שקל יש מקום ברור."},
      {text: "וזה הופך חיסכון מכוונה למשהו שקורה באמת."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 340, 90);
      inked(ctx, c => {
        drawGround(c, 430, PAL.grassDark, PAL.grass);
        drawJar(c, 190, 430, 180, 220, 1, PAL.green);
        drawJar(c, 470, 430, 150, 165, 1, PAL.purple);
        drawJar(c, 740, 430, 120, 120, 1, PAL.gold);
        drawPerson(c, 890, 520, {walk: 0, size: 1.2, shirt: PAL.blue, pants: PAL.stoneDark, happy: true});
      });
    }
  }
]);

/* ================= 4. קרן חירום ================= */

const emergencyMovie = buildMovie("emergency-fund", [
  {
    lines: [
      {text: "החיים אוהבים להפתיע, ולא תמיד לטובה."},
      {text: "הטלפון נשבר. האופניים התקלקלו."},
      {text: "ותמיד בדיוק כשהכי לא מתאים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#6a7a95", "#aab8cc");
      inked(ctx, c => {
        drawGround(c, 420, "#8a8a8a", "#a5a5a5");
        drawBrokenPhone(c, 480, 260, 200, 330);
        drawPerson(c, 150, 530, {walk: 0, size: 1.3, shirt: PAL.blue, pants: PAL.stoneDark, sad: true});
      });
    }
  },
  {
    lines: [
      {text: "בלי כסף בצד, הפתעה כזאת הופכת לבעיה גדולה."},
      {text: "צריך לוותר על משהו אחר, או ללוות."},
      {text: "ושתי האפשרויות האלה עולות ביוקר."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#6a7a95", "#aab8cc");
      inked(ctx, c => {
        drawGround(c, 430, "#8a8a8a", "#a5a5a5");
        drawPerson(c, 300, 530, {walk: 0, size: 1.5, shirt: PAL.blue, pants: PAL.stoneDark, sad: true});
        drawPiggy(c, 700, 330, 1.5);
        drawNo(c, 700, 200, t * 5);
      });
    }
  },
  {
    lines: [
      {text: "קרן חירום היא כסף ששמור רק להפתעות."},
      {text: "לא לחופשה, ולא לקנייה שבא לנו. רק לחירום."},
      {text: "היא קיימת רק בשביל הרגעים האלה."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        drawShield(c, 480, 260, 2.4);
        drawCoinStack(c, 200, 430, 6, 50, 26);
        drawPiggy(c, 780, 350, 1.3);
      });
    }
  },
  {
    lines: [
      {text: "כמה צריך בקרן? מבוגרים שואפים לשלושה עד שישה חודשי הוצאות."},
      {text: "זה נותן מספיק זמן להתאושש."},
      {text: "ככה אפשר למצוא פתרון בלי לחץ."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawChart(c, 240, 430, 480, 240, [1, 2, 3, 4, 5, 6], Math.min(1, t / 6), PAL.blue);
        drawShield(c, 820, 300, 1.6);
      });
    }
  },
  {
    lines: [
      {text: "ואם אתם רק מתחילים, לא צריך סכום ענק."},
      {text: "מספיק סכום שמכסה תיקון אחד או קנייה דחופה אחת."},
      {text: "העיקר שיהיה משהו, ולא כלום."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        drawPiggy(c, 300, 330, 1.8);
        drawCoin(c, 640, 250 - Math.sin(t * 2) * 18, 48, 1);
        drawArrow(c, 600, 300, 450, 320, 8, PAL.gold);
      });
    }
  },
  {
    lines: [
      {text: "קרן חירום לא הופכת אתכם לעשירים."},
      {text: "היא רק דואגת שהפתעה קטנה לא תהפוך לאסון."},
      {text: "וזה שקט נפשי ששווה הרבה מאוד."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 330, 90);
      inked(ctx, c => {
        drawGround(c, 410, PAL.grassDark, PAL.grass);
        drawShield(c, 480, 240, 2.2);
        drawPerson(c, 180, 520, {walk: 0, size: 1.3, shirt: PAL.green, pants: PAL.dirt, happy: true});
        drawPerson(c, 790, 520, {walk: 0, size: 1.3, flip: true, shirt: PAL.red, pants: PAL.stoneDark, happy: true});
      });
    }
  }
]);

/* ================= 5. ריבית דריבית ================= */

const compoundMovie = buildMovie("compound", [
  {
    lines: [
      {text: "יש כוח אחד שגורם לכסף לייצר עוד כסף."},
      {text: "קוראים לו ריבית דריבית."},
      {text: "והוא עובד לאט, אבל בלי הפסקה."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        drawCoin(c, 480, 250 + Math.sin(t * 1.6) * 18, 110, 1);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t;
          drawCoin(c, 480 + Math.cos(a) * 230, 250 + Math.sin(a) * 110, 26, 1);
        }
      });
    }
  },
  {
    lines: [
      {text: "נניח שיש לכם מאה שקל, והם גדלים בעשרה אחוז בשנה."},
      {text: "אחרי שנה יהיו מאה ועשרה."},
      {text: "עשרה שקלים שהגיעו בלי לעשות כלום."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawCoinStack(c, 250, 440, 5, 58, 28);
        drawArrow(c, 380, 300, 560, 300, 9, PAL.green);
        drawCoinStack(c, 700, 440, 5 + (t > 3 ? 1 : 0), 58, 28);
      });
    }
  },
  {
    lines: [
      {text: "ואחרי שנתיים? לא מאה ועשרים, אלא מאה עשרים ואחת."},
      {text: "כי גם העשרה שקל שהרווחתם מתחילים להרוויח."},
      {text: "זה הרגע שבו הכסף מתחיל לעבוד בשבילכם."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#e8c46a", "#f7e8c0");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawCoinStack(c, 300, 440, 6, 60, 30);
        if (t > 4) {
          drawCoin(c, 300, 240, 60, 1);
          drawArrow(c, 380, 230, 520, 250, 8, PAL.gold);
          drawCoin(c, 600, 260, 34, 1);
        }
      });
    }
  },
  {
    lines: [
      {text: "בהתחלה ההבדל נראה זעיר, שקל אחד."},
      {text: "אבל ככל שעובר הזמן, הוא גדל כמו כדור שלג."},
      {text: "בהתחלה זה משעמם. אחר כך זה מדהים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.grass, PAL.grassLight);
        drawChart(c, 140, 440, 700, 300, [1, 2, 3, 5, 8, 13, 21], Math.min(1, t / 7), PAL.green);
      });
    }
  },
  {
    lines: [
      {text: "אחרי שלושים שנה, אותם מאה שקל הופכים ליותר מפי שבע עשרה."},
      {text: "בלי לעשות כלום חוץ מלחכות."},
      {text: "רק בגלל שנתנו לזמן לעשות את שלו."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#e8c46a", "#f7e8c0");
      inked(ctx, c => {
        drawGround(c, 450, PAL.wood, "#c48f4e");
        const n = Math.min(12, Math.floor(t * 1.1));
        for (let i = 0; i < n; i++) {
          drawCoinStack(c, 120 + i * 68, 450, 1 + Math.floor(i * 0.9), 28, 18);
        }
      });
    }
  },
  {
    lines: [
      {text: "וזה הסוד: לא הסכום קובע, אלא הזמן."},
      {text: "מי שמתחיל מוקדם, נותן לכסף שלו הרבה יותר זמן לגדול."},
      {text: "ולכן הזמן הכי טוב להתחיל הוא תמיד עכשיו."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 340, 95);
      inked(ctx, c => {
        drawGround(c, 420, PAL.grassDark, PAL.grass);
        drawClock(c, 230, 250, 110, t);
        drawArrow(c, 330, 260, 470, 260, 9, PAL.gold);
        drawCoin(c, 620, 250, 95, 1);
        drawPerson(c, 870, 520, {walk: 0, size: 1.2, shirt: PAL.blue, pants: PAL.stoneDark, happy: true});
      });
    }
  }
]);

/* ================= 6. סיכון מול תשואה ================= */

const riskMovie = buildMovie("risk", [
  {
    lines: [
      {text: "ראיתם פרסומת שמבטיחה רווח ענק, בלי שום סיכון?"},
      {text: "עצרו רגע."},
      {text: "מה שנשמע מדהים מדי, בדרך כלל גם לא נכון."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#d85f5f", "#f0a8a8");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawSign(c, 480, 230, 520, 260, PAL.red);
        drawPercent(c, 480, 230, 1.5, PAL.red);
        if (t > 4) drawQuestionMark(c, 830, 240, 0.9, PAL.ink);
      });
    }
  },
  {
    lines: [
      {text: "בעולם הכסף יש חוק שכמעט אף פעם לא נשבר."},
      {text: "ככל שהרווח האפשרי גדול יותר, כך גם הסיכון."},
      {text: "אין דרך לעקוף את החוק הזה."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.grass, PAL.grassLight);
        drawChart(c, 140, 440, 340, 260, [1, 3, 6], 1, PAL.green);
        drawChart(c, 560, 440, 340, 260, [1, 3, 6], 1, PAL.red);
        drawArrow(c, 500, 250, 540, 250, 7);
      });
    }
  },
  {
    lines: [
      {text: "השקעה שמבטיחה רווח גבוה בלי סיכון פשוט לא קיימת."},
      {text: "ומי שמבטיח אותה, בדרך כלל מנסה לרמות אתכם."},
      {text: "אף אחד לא מחלק כסף בחינם."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#d85f5f", "#f0a8a8");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawSign(c, 350, 250, 380, 210, PAL.gold);
        drawPercent(c, 350, 250, 1.1, PAL.goldDark);
        drawNo(c, 350, 250, t * 5);
        drawPerson(c, 780, 530, {walk: 0, size: 1.5, shirt: PAL.blue, pants: PAL.stoneDark, sad: true});
      });
    }
  },
  {
    lines: [
      {text: "אז איך בכל זאת מקטינים סיכון?"},
      {text: "לא שמים את כל הביצים בסל אחד. זה נקרא פיזור."},
      {text: "מחלקים את הכסף בין כמה מקומות שונים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 440, PAL.grass, PAL.grassLight);
        drawEggBasket(c, 200, 380, 2, 6);
        drawNo(c, 200, 200, t * 4);
        drawEggBasket(c, 560, 400, 1.2, 2);
        drawEggBasket(c, 720, 400, 1.2, 2);
        drawEggBasket(c, 880, 400, 1.2, 2);
        if (t > 6) drawYes(c, 720, 210, 1.3);
      });
    }
  },
  {
    lines: [
      {text: "אם סל אחד נופל, נשארו לכם עוד."},
      {text: "ככה השקעה שנכשלה לא לוקחת איתה את הכול."},
      {text: "וזה ההבדל בין טעות לבין אסון."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.grass, PAL.grassLight);
        drawEggBasket(c, 230, 400 + Math.min(60, t * 14), 1.3, 2);
        drawEggBasket(c, 560, 400, 1.3, 2);
        drawEggBasket(c, 830, 400, 1.3, 2);
        if (t > 4) drawYes(c, 690, 230, 1.4);
      });
    }
  },
  {
    lines: [
      {text: "הכלל הכי שימושי הוא הפשוט ביותר."},
      {text: "אם משהו נשמע טוב מכדי להיות אמיתי, הוא כנראה באמת כזה."},
      {text: "הכלל הזה יחסוך לכם הרבה כאב ראש."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 340, 90);
      inked(ctx, c => {
        drawGround(c, 420, PAL.grassDark, PAL.grass);
        drawPerson(c, 480, 520, {walk: 0, size: 1.6, shirt: PAL.green, pants: PAL.dirt, happy: true, armUp: true});
        drawShield(c, 200, 280, 1.5);
        drawEggBasket(c, 790, 400, 1.4, 3);
      });
    }
  }
]);

/* ================= 7. אשראי והלוואות ================= */

const creditMovie = buildMovie("credit", [
  {
    lines: [
      {text: "כרטיס אשראי נראה כמו כסף, אבל הוא לא."},
      {text: "הוא כסף מושאל, שצריך להחזיר."},
      {text: "וזה ההבדל שהכי קל לשכוח."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#5f7fd8", "#a8c0f0");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawCard(c, 480, 250 + Math.sin(t * 1.5) * 14, 380, 240);
        if (t > 4) drawQuestionMark(c, 830, 230, 0.8, PAL.ink);
      });
    }
  },
  {
    lines: [
      {text: "כשקונים בכרטיס, הבנק משלם במקומכם."},
      {text: "ובסוף החודש הוא רוצה את הכסף בחזרה."},
      {text: "עד אז הכסף עדיין שלו, לא שלכם."}
    ],
    draw(ctx, t) {
      shopScene(ctx);
      inked(ctx, c => {
        drawGround(c, 420, "#b8a890", "#d4c8b4");
        drawCard(c, 220, 280, 240, 150);
        drawArrow(c, 350, 280, 560, 280, 9, PAL.blue);
        drawCart(c, 730, 470, 1.7);
      });
    }
  },
  {
    lines: [
      {text: "אם מחזירים את כל הסכום בזמן, הכול בסדר."},
      {text: "אבל אם לא, מתחילה להצטבר ריבית."},
      {text: "והריבית מחושבת גם על הריבית הקודמת."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#d85f5f", "#f0a8a8");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawChart(c, 140, 440, 700, 300, [1, 2, 4, 8, 14, 22], Math.min(1, t / 6), PAL.red);
      });
    }
  },
  {
    lines: [
      {text: "וזו ריבית דריבית שעובדת נגדכם."},
      {text: "החוב גדל מעצמו, בדיוק כמו שחיסכון גדל מעצמו."},
      {text: "וככל שמחכים יותר, קשה יותר לצאת."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#d85f5f", "#f0a8a8");
      inked(ctx, c => {
        drawGround(c, 450, PAL.wood, "#c48f4e");
        const n = Math.min(9, 2 + Math.floor(t));
        drawCoinStack(c, 480, 450, n, 62, 30);
        drawPerson(c, 170, 530, {walk: 0, size: 1.7, shirt: PAL.blue, pants: PAL.stoneDark, sad: true});
      });
    }
  },
  {
    lines: [
      {text: "לכן יש כלל אחד פשוט לאשראי."},
      {text: "לא קונים בכרטיס משהו שאין לכם כסף לשלם עליו."},
      {text: "אם אין לכם את הכסף היום, גם מחר לא יהיה."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        drawCard(c, 300, 270, 280, 175);
        drawArrow(c, 440, 280, 600, 280, 9, PAL.green);
        drawPiggy(c, 740, 320, 1.4);
        if (t > 6) drawYes(c, 480, 130, 1.4);
      });
    }
  },
  {
    lines: [
      {text: "אשראי הוא כלי, לא כסף נוסף."},
      {text: "מי שמשלם את כל החוב כל חודש, נשאר בשליטה."},
      {text: "הבעיה מתחילה רק כשמתייחסים אליו ככסף נוסף."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 340, 90);
      inked(ctx, c => {
        drawGround(c, 420, PAL.grassDark, PAL.grass);
        drawCard(c, 480, 250, 300, 190);
        drawPerson(c, 170, 520, {walk: 0, size: 1.3, shirt: PAL.green, pants: PAL.dirt, happy: true});
        drawPerson(c, 800, 520, {walk: 0, size: 1.3, flip: true, shirt: PAL.blue, pants: PAL.stoneDark, happy: true});
      });
    }
  }
]);

/* ================= 8. מבצע או מלכודת ================= */

const smartShoppingMovie = buildMovie("smart-shopping", [
  {
    lines: [
      {text: "אחד פלוס אחד חינם. נשמע כמו הזדמנות, נכון?"},
      {text: "לפעמים כן. ולפעמים ממש לא."},
      {text: "והרבה פעמים זו בכלל לא הזדמנות."}
    ],
    draw(ctx, t) {
      shopScene(ctx);
      inked(ctx, c => {
        drawGround(c, 430, "#b8a890", "#d4c8b4");
        drawSign(c, 480, 230, 500, 250, PAL.red);
        drawPercent(c, 480, 230, 1.45, PAL.red);
        if (t > 4) drawQuestionMark(c, 830, 250, 0.85, PAL.ink);
      });
    }
  },
  {
    lines: [
      {text: "השאלה היחידה שחשובה היא זו:"},
      {text: "האם הייתם קונים את המוצר גם בלי המבצע?"},
      {text: "אם התשובה כן, המבצע באמת חוסך לכם."}
    ],
    draw(ctx, t) {
      shopScene(ctx);
      inked(ctx, c => {
        drawGround(c, 430, "#b8a890", "#d4c8b4");
        drawPerson(c, 260, 530, {walk: 0, size: 1.6, shirt: PAL.blue, pants: PAL.stoneDark});
        drawTag(c, 640, 250, 150, 95, PAL.gold);
        drawQuestionMark(c, 830, 280, 0.8, PAL.ink);
      });
    }
  },
  {
    lines: [
      {text: "אם התשובה היא לא, אז לא חסכתם כלום."},
      {text: "הוצאתם כסף על משהו שלא תכננתם."},
      {text: "וגם הבאתם הביתה עוד משהו שלא צריך."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#d85f5f", "#f0a8a8");
      inked(ctx, c => {
        drawGround(c, 430, "#b8a890", "#d4c8b4");
        drawCart(c, 400, 460, 2.2);
        const n = Math.min(4, Math.floor(t * 0.5));
        for (let i = 0; i < n; i++) drawTag(c, 300 + i * 110, 250, 90, 58, PAL.purple);
        drawNo(c, 800, 250, t * 5);
      });
    }
  },
  {
    lines: [
      {text: "חנויות יודעות את זה היטב."},
      {text: "שלט גדול עם אחוזים גורם לנו לקנות בלי לחשוב."},
      {text: "וזה עובד. גם על מבוגרים."}
    ],
    draw(ctx, t) {
      shopScene(ctx);
      inked(ctx, c => {
        drawGround(c, 430, "#b8a890", "#d4c8b4");
        drawSign(c, 290, 230, 340, 200, PAL.red);
        drawPercent(c, 290, 230, 1.05, PAL.red);
        drawSign(c, 700, 250, 300, 180, PAL.gold);
        drawPercent(c, 700, 250, 0.95, PAL.goldDark);
        drawPerson(c, 490, 530, {walk: 0, size: 1.7, shirt: PAL.green, pants: PAL.dirt});
      });
    }
  },
  {
    lines: [
      {text: "הטריק הכי שימושי הוא להשוות מחיר ליחידה."},
      {text: "לפעמים האריזה הגדולה דווקא יקרה יותר."},
      {text: "מחלקים את המחיר בכמות, ומשווים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 440, "#b8a890", "#d4c8b4");
        drawTag(c, 260, 270, 200, 130, PAL.gold);
        drawTag(c, 700, 280, 130, 90, PAL.green);
        drawArrow(c, 400, 270, 580, 275, 8);
        if (t > 7) drawYes(c, 700, 150, 1.2);
      });
    }
  },
  {
    lines: [
      {text: "מבצע חוסך כסף רק כשהייתם קונים את המוצר בכל מקרה."},
      {text: "בכל מצב אחר, הוא פשוט הוצאה בתחפושת."},
      {text: "והידיעה הזאת שווה יותר מכל מבצע."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 340, 90);
      inked(ctx, c => {
        drawGround(c, 420, PAL.grassDark, PAL.grass);
        drawPerson(c, 480, 520, {walk: 0, size: 1.6, shirt: PAL.blue, pants: PAL.stoneDark, happy: true, armUp: true});
        drawCart(c, 180, 470, 1.4);
        drawPiggy(c, 800, 340, 1.3);
      });
    }
  }
]);

/* ================= 9. מציבים מטרה כספית ================= */

const goalsMovie = buildMovie("goals", [
  {
    lines: [
      {text: "יש משהו שאתם ממש רוצים, אבל הוא יקר."},
      {text: "נניח אופניים באלף ומאתיים שקל."},
      {text: "וזה מרגיש רחוק מאוד."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fa8d8", "#d4e8f7");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        drawBike(c, 520, 280, 2.4);
        drawTag(c, 160, 250, 150, 95, PAL.gold);
      });
    }
  },
  {
    lines: [
      {text: "הסכום נשמע ענק, וקל להתייאש כבר בהתחלה."},
      {text: "אבל יש דרך פשוטה להקטין אותו."},
      {text: "הבעיה היא לא הסכום, אלא איך מסתכלים עליו."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#6a7a95", "#aab8cc");
      inked(ctx, c => {
        drawGround(c, 430, PAL.wood, "#c48f4e");
        drawCoinStack(c, 480, 440, 9, 70, 32);
        drawPerson(c, 150, 530, {walk: 0, size: 1.3, shirt: PAL.blue, pants: PAL.stoneDark, sad: true});
      });
    }
  },
  {
    lines: [
      {text: "מחליטים תוך כמה זמן רוצים להגיע. נניח שנה."},
      {text: "מחלקים אלף ומאתיים בשנים עשר חודשים."},
      {text: "והתוצאה מפתיעה."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawClock(c, 220, 260, 110, t);
        drawArrow(c, 320, 270, 470, 270, 9, PAL.green);
        const n = Math.min(12, Math.floor(t * 1.2));
        for (let i = 0; i < n; i++) {
          drawCoin(c, 560 + (i % 6) * 68, 220 + Math.floor(i / 6) * 90, 28, 1);
        }
      });
    }
  },
  {
    lines: [
      {text: "מאה שקל בחודש. פתאום זה נשמע אפשרי לגמרי."},
      {text: "זה הסוד: מטרה גדולה מחולקת לצעדים קטנים."},
      {text: "וכל צעד לבד הוא קטן לגמרי."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#7fc48f", "#dcf2e4");
      inked(ctx, c => {
        drawGround(c, 430, PAL.grass, PAL.grassLight);
        drawCoin(c, 250, 270, 70, 1);
        drawArrow(c, 350, 270, 520, 270, 9, PAL.green);
        drawPiggy(c, 660, 330, 1.9);
        drawPerson(c, 870, 525, {walk: 0, size: 1.6, shirt: PAL.green, pants: PAL.dirt, happy: true});
      });
    }
  },
  {
    lines: [
      {text: "כדאי לסמן את ההתקדמות איפשהו שרואים כל יום."},
      {text: "כשרואים את הפס מתמלא, הרבה יותר קל להמשיך."},
      {text: "מסמנים על לוח, במחברת, או בטלפון."}
    ],
    draw(ctx, t) {
      drawSky(ctx, "#8fb8d8", "#dceef7");
      inked(ctx, c => {
        drawGround(c, 440, PAL.wood, "#c48f4e");
        drawProgress(c, 480, 260, 700, 60, Math.min(1, t / 9), PAL.green);
        drawPiggy(c, 250, 400, 1.1);
        drawBike(c, 760, 400, 1.2);
      });
    }
  },
  {
    lines: [
      {text: "וכשמגיעים למטרה, הכסף לא נעלם. הוא הפך למשהו שרציתם."},
      {text: "זה ההבדל בין להוציא כסף לבין לנהל אותו."},
      {text: "וזה בדיוק מה שלמדנו בכל השיעורים."}
    ],
    draw(ctx, t) {
      drawSky(ctx, PAL.skyDuskTop, PAL.skyDuskBot);
      drawSun(ctx, 480, 340, 95);
      inked(ctx, c => {
        drawGround(c, 420, PAL.grassDark, PAL.grass);
        drawBike(c, 480, 300, 2.2);
        drawPerson(c, 160, 520, {walk: 0, size: 1.3, shirt: PAL.blue, pants: PAL.stoneDark, happy: true, armUp: true});
        drawPerson(c, 810, 520, {walk: 0, size: 1.3, flip: true, shirt: PAL.red, pants: PAL.stoneDark, happy: true, armUp: true});
        if (t > 6) drawYes(c, 480, 120, 1.5);
      });
    }
  }
]);

/* ---------- מרשם הסרטונים ---------- */

const extraMovies = [
  needsWantsMovie,
  budgetMovie,
  savingHabitMovie,
  emergencyMovie,
  compoundMovie,
  riskMovie,
  creditMovie,
  smartShoppingMovie,
  goalsMovie
];
