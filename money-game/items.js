/* ===== איורי פריטים =====
   ציורים קטנים לפריטים שמופיעים במשחקי המסע: מיון צורך־רצון,
   השוואת מחירים, קניות בשוק. כל ציור ממורכז סביב (cx, cy) בקנה מידה s.
   בלי אמוג׳י - הכול מצויר. */

const IPAL = {
  bread: "#c98a45", breadDark: "#a66b30", crumb: "#f0d8a8",
  water: "#5cb3e8", waterDark: "#3f8fd8", glass: "#dff0fb",
  pill: "#e8574a", pillLight: "#f5a49c",
  bulb: "#ffd85e", bulbDim: "#c9b25e", metal: "#b8c2cc", metalDark: "#8a95a3",
  coat: "#4a6fb5", coatDark: "#35548f",
  leather: "#8a5a35", leatherDark: "#6b4326",
  roof: "#b5533f", wall: "#e8d9bd", wallDark: "#c9b894",
  book: "#4f9e5c", bookDark: "#3a7844", page: "#f7f2e2",
  screen: "#2a2f45", screenLit: "#5ce0c8", plastic: "#3d4459",
  candy: "#e8578f", candyLight: "#f7a8c4",
  balloon: "#e8574a", string: "#8a8f9c",
  shades: "#2a2f45", lens: "#4a5570",
  cake: "#f5d8a8", frosting: "#f28ab0", cherry: "#d8374a",
  ball: "#f5a03f", ballDark: "#c97a25",
  ticket: "#f5c542", ticketDark: "#c99a1f",
  cloth: "#7a5cc9", clothDark: "#5c42a0",
  wood: "#a3763f", woodDark: "#75542c",
  milk: "#f7f7f2", milkCap: "#3f7fd8",
  rice: "#f0e6cc", bag: "#d8c9a8"
};

/* ---------- צרכים ---------- */

function itemBread(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* גוף הכיכר, מעוגל למעלה וישר למטה */
  for (let i = 0; i <= S(26); i++) {
    const half = Math.round(S(30) * Math.sin(Math.acos(1 - (i / S(26)) * 0.92)) * 0.9 + S(6));
    px(ctx, cx - half, cy - S(16) + i, half * 2, 1, i < S(6) ? IPAL.breadDark : IPAL.bread);
  }
  px(ctx, cx - S(32), cy + S(10), S(64), S(9), IPAL.breadDark);
  /* חריצים באפייה */
  for (let i = -1; i <= 1; i++) {
    px(ctx, cx + i * S(16) - S(2), cy - S(13), S(5), S(12), IPAL.crumb);
  }
}

function itemWater(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* בקבוק: צוואר, כתף וגוף */
  px(ctx, cx - S(7), cy - S(34), S(14), S(10), IPAL.glass);
  px(ctx, cx - S(9), cy - S(37), S(18), S(5), IPAL.waterDark);
  for (let i = 0; i < S(8); i++) {
    const half = S(7) + Math.round((i / S(8)) * S(11));
    px(ctx, cx - half, cy - S(24) + i, half * 2, 1, IPAL.glass);
  }
  roundRect(ctx, cx - S(18), cy - S(16), S(36), S(42), S(6), IPAL.glass);
  /* המים בפנים */
  roundRect(ctx, cx - S(14), cy - S(6), S(28), S(28), S(4), IPAL.water);
  px(ctx, cx - S(14), cy - S(6), S(28), S(3), IPAL.waterDark);
  /* נצנוץ */
  px(ctx, cx - S(11), cy - S(11), S(4), S(24), "rgba(255,255,255,.55)");
}

function itemMedicine(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* בקבוקון תרופה עם צלב */
  px(ctx, cx - S(10), cy - S(30), S(20), S(7), IPAL.metalDark);
  px(ctx, cx - S(13), cy - S(24), S(26), S(6), IPAL.metal);
  roundRect(ctx, cx - S(20), cy - S(19), S(40), S(44), S(6), IPAL.glass);
  roundRect(ctx, cx - S(16), cy - S(6), S(32), S(28), S(4), IPAL.pillLight);
  /* צלב */
  px(ctx, cx - S(4), cy - S(1), S(8), S(18), IPAL.pill);
  px(ctx, cx - S(9), cy + S(4), S(18), S(8), IPAL.pill);
}

function itemBulb(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  circle(ctx, cx, cy - S(8), S(20), IPAL.bulb);
  circle(ctx, cx - S(6), cy - S(14), S(6), "rgba(255,255,255,.6)");
  /* חוט הלהט */
  px(ctx, cx - S(1), cy - S(6), S(3), S(10), IPAL.bulbDim);
  px(ctx, cx - S(6), cy - S(2), S(13), S(3), IPAL.bulbDim);
  /* תבריג */
  px(ctx, cx - S(9), cy + S(11), S(18), S(5), IPAL.metal);
  px(ctx, cx - S(9), cy + S(17), S(18), S(4), IPAL.metalDark);
  px(ctx, cx - S(7), cy + S(22), S(14), S(5), IPAL.metal);
  /* קרני אור */
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    px(ctx, Math.round(cx + Math.cos(a) * S(28)) - 1,
      Math.round(cy - S(8) + Math.sin(a) * S(28)) - 1, S(4), S(4), IPAL.bulb);
  }
}

function itemCoat(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* מעיל: גוף, שרוולים, צווארון */
  px(ctx, cx - S(20), cy - S(20), S(40), S(46), IPAL.coat);
  px(ctx, cx - S(30), cy - S(18), S(11), S(32), IPAL.coatDark);
  px(ctx, cx + S(19), cy - S(18), S(11), S(32), IPAL.coatDark);
  /* דש */
  px(ctx, cx - S(20), cy - S(22), S(15), S(10), IPAL.coatDark);
  px(ctx, cx + S(5), cy - S(22), S(15), S(10), IPAL.coatDark);
  /* רוכסן וכפתורים */
  px(ctx, cx - S(2), cy - S(14), S(4), S(40), IPAL.coatDark);
  for (let i = 0; i < 3; i++) circle(ctx, cx + S(7), cy - S(6) + i * S(12), S(3), IPAL.metal);
}

function itemShoe(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* נעל מהצד */
  px(ctx, cx - S(30), cy + S(10), S(62), S(9), IPAL.leatherDark);
  for (let i = 0; i < S(22); i++) {
    const w = Math.round(S(30) + (i / S(22)) * S(30));
    px(ctx, cx - S(30), cy + S(10) - i, w, 1, IPAL.leather);
  }
  /* קרסול */
  px(ctx, cx - S(30), cy - S(20), S(24), S(20), IPAL.leather);
  px(ctx, cx - S(30), cy - S(22), S(24), S(5), IPAL.leatherDark);
  /* שרוכים */
  for (let i = 0; i < 3; i++) px(ctx, cx - S(26), cy - S(15) + i * S(6), S(17), S(3), IPAL.crumb);
}

function itemHouse(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* גג משופע */
  for (let i = 0; i < S(20); i++) {
    const half = Math.round((i / S(20)) * S(34));
    px(ctx, cx - half, cy - S(26) + i, half * 2, 1, IPAL.roof);
  }
  px(ctx, cx - S(36), cy - S(8), S(72), S(5), "#8f3f30");
  /* קירות */
  px(ctx, cx - S(28), cy - S(4), S(56), S(32), IPAL.wall);
  px(ctx, cx - S(28), cy + S(24), S(56), S(5), IPAL.wallDark);
  /* דלת וחלון */
  roundRect(ctx, cx - S(8), cy + S(8), S(17), S(20), S(7), IPAL.wood);
  circle(ctx, cx + S(5), cy + S(18), S(2), IPAL.metal);
  px(ctx, cx - S(22), cy + S(2), S(13), S(12), "#8fd4f0");
  px(ctx, cx - S(16), cy + S(2), S(2), S(12), IPAL.wallDark);
}

function itemBook(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  px(ctx, cx - S(24), cy - S(26), S(48), S(52), IPAL.book);
  px(ctx, cx - S(24), cy - S(26), S(8), S(52), IPAL.bookDark);
  px(ctx, cx - S(14), cy - S(21), S(34), S(42), IPAL.page);
  /* שורות טקסט */
  for (let i = 0; i < 5; i++) {
    px(ctx, cx - S(10), cy - S(15) + i * S(8), S(26) - (i === 4 ? S(11) : 0), S(3), "#c4bfae");
  }
  /* סימנייה */
  px(ctx, cx + S(13), cy - S(26), S(6), S(20), "#e8574a");
}

/* ---------- רצונות ---------- */

function itemConsole(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* בקר משחק */
  roundRect(ctx, cx - S(32), cy - S(14), S(64), S(30), S(12), IPAL.plastic);
  roundRect(ctx, cx - S(40), cy - S(8), S(20), S(26), S(9), IPAL.plastic);
  roundRect(ctx, cx + S(20), cy - S(8), S(20), S(26), S(9), IPAL.plastic);
  /* צלב כיוונים */
  px(ctx, cx - S(24), cy - S(4), S(16), S(5), IPAL.metal);
  px(ctx, cx - S(18), cy - S(10), S(5), S(17), IPAL.metal);
  /* כפתורים */
  circle(ctx, cx + S(18), cy - S(5), S(4), "#e8574a");
  circle(ctx, cx + S(26), cy + S(2), S(4), IPAL.screenLit);
  circle(ctx, cx + S(10), cy + S(2), S(4), IPAL.bulb);
  /* מסך קטן באמצע */
  px(ctx, cx - S(6), cy - S(6), S(13), S(9), IPAL.screenLit);
}

function itemCandy(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* סוכרייה עגולה עם עטיפה */
  circle(ctx, cx, cy, S(20), IPAL.candy);
  /* פס לולייני */
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    px(ctx, Math.round(cx + Math.cos(a) * S(9)) - S(3),
      Math.round(cy + Math.sin(a) * S(9)) - S(3), S(7), S(7), IPAL.candyLight);
  }
  circle(ctx, cx - S(7), cy - S(7), S(5), "rgba(255,255,255,.5)");
  /* קצוות העטיפה */
  [-1, 1].forEach(d => {
    ctx.fillStyle = IPAL.candyLight;
    ctx.beginPath();
    ctx.moveTo(cx + d * S(19), cy);
    ctx.lineTo(cx + d * S(34), cy - S(11));
    ctx.lineTo(cx + d * S(34), cy + S(11));
    ctx.closePath();
    ctx.fill();
  });
}

function itemBalloon(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  ellipse(ctx, cx, cy - S(8), S(20), S(24), IPAL.balloon);
  ellipse(ctx, cx - S(7), cy - S(15), S(6), S(8), "rgba(255,255,255,.45)");
  /* צוואר */
  ctx.fillStyle = IPAL.balloon;
  ctx.beginPath();
  ctx.moveTo(cx - S(5), cy + S(15));
  ctx.lineTo(cx + S(5), cy + S(15));
  ctx.lineTo(cx, cy + S(22));
  ctx.closePath();
  ctx.fill();
  /* חוט מתפתל */
  for (let i = 0; i < S(24); i++) {
    px(ctx, Math.round(cx + Math.sin(i * 0.34) * S(7)), cy + S(22) + i, 2, 1, IPAL.string);
  }
}

function itemShades(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  roundRect(ctx, cx - S(32), cy - S(10), S(26), S(20), S(8), IPAL.lens);
  roundRect(ctx, cx + S(6), cy - S(10), S(26), S(20), S(8), IPAL.lens);
  px(ctx, cx - S(7), cy - S(5), S(14), S(5), IPAL.shades);
  px(ctx, cx - S(38), cy - S(8), S(7), S(4), IPAL.shades);
  px(ctx, cx + S(31), cy - S(8), S(7), S(4), IPAL.shades);
  /* השתקפות */
  px(ctx, cx - S(28), cy - S(6), S(5), S(9), "rgba(255,255,255,.35)");
  px(ctx, cx + S(10), cy - S(6), S(5), S(9), "rgba(255,255,255,.35)");
}

function itemCake(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* שתי קומות */
  px(ctx, cx - S(28), cy + S(2), S(56), S(22), IPAL.cake);
  px(ctx, cx - S(28), cy + S(20), S(56), S(6), "#d8b878");
  px(ctx, cx - S(20), cy - S(14), S(40), S(18), IPAL.cake);
  /* זיגוג נוטף */
  px(ctx, cx - S(20), cy - S(18), S(40), S(8), IPAL.frosting);
  px(ctx, cx - S(28), cy - S(2), S(56), S(7), IPAL.frosting);
  for (let i = 0; i < 5; i++) px(ctx, cx - S(24) + i * S(11), cy + S(4), S(5), S(6), IPAL.frosting);
  /* דובדבן */
  circle(ctx, cx, cy - S(22), S(5), IPAL.cherry);
  px(ctx, cx - S(1), cy - S(30), S(2), S(5), "#4f9e5c");
}

function itemBall(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  circle(ctx, cx, cy, S(23), IPAL.ball);
  circle(ctx, cx - S(8), cy - S(8), S(7), "rgba(255,255,255,.35)");
  /* קווי הכדור */
  px(ctx, cx - S(23), cy - S(2), S(46), S(4), IPAL.ballDark);
  for (let i = -S(20); i <= S(20); i++) {
    const y = Math.round(Math.sin((i / S(23)) * 1.2) * S(9));
    px(ctx, cx + i, cy - S(13) + y, 2, 3, IPAL.ballDark);
    px(ctx, cx + i, cy + S(11) - y, 2, 3, IPAL.ballDark);
  }
}

function itemTicket(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  roundRect(ctx, cx - S(32), cy - S(18), S(64), S(36), S(5), IPAL.ticket);
  /* ניקוב באמצע */
  for (let i = -S(16); i < S(16); i += S(6)) {
    px(ctx, cx + S(6), cy + i, S(3), S(4), IPAL.ticketDark);
  }
  px(ctx, cx - S(26), cy - S(9), S(24), S(4), IPAL.ticketDark);
  px(ctx, cx - S(26), cy - S(1), S(17), S(4), IPAL.ticketDark);
  px(ctx, cx - S(26), cy + S(7), S(20), S(4), IPAL.ticketDark);
  /* כוכב על הגזיר */
  circle(ctx, cx + S(19), cy, S(7), IPAL.ticketDark);
}

function itemHeadphones(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* קשת */
  for (let i = -S(26); i <= S(26); i++) {
    const y = Math.round(-Math.sqrt(Math.max(0, S(26) * S(26) - i * i)) * 0.75);
    px(ctx, cx + i, cy - S(4) + y, 2, S(7), IPAL.plastic);
  }
  /* אוזניות */
  roundRect(ctx, cx - S(34), cy - S(8), S(17), S(28), S(7), IPAL.plastic);
  roundRect(ctx, cx + S(17), cy - S(8), S(17), S(28), S(7), IPAL.plastic);
  roundRect(ctx, cx - S(31), cy - S(4), S(11), S(20), S(5), IPAL.screenLit);
  roundRect(ctx, cx + S(20), cy - S(4), S(11), S(20), S(5), IPAL.screenLit);
}

/* ---------- מוצרי שוק (להשוואת מחירים) ---------- */

function itemMilk(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* קרטון עם גמלון */
  px(ctx, cx - S(20), cy - S(14), S(40), S(42), IPAL.milk);
  ctx.fillStyle = IPAL.milk;
  ctx.beginPath();
  ctx.moveTo(cx - S(20), cy - S(14));
  ctx.lineTo(cx, cy - S(32));
  ctx.lineTo(cx + S(20), cy - S(14));
  ctx.closePath();
  ctx.fill();
  px(ctx, cx - S(4), cy - S(30), S(9), S(8), IPAL.milkCap);
  px(ctx, cx - S(20), cy + S(24), S(40), S(5), "#d8dce0");
  /* תווית */
  px(ctx, cx - S(14), cy - S(6), S(28), S(16), IPAL.milkCap);
  px(ctx, cx - S(10), cy - S(1), S(20), S(5), IPAL.milk);
}

function itemRice(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  /* שק עם צוואר קמוט */
  px(ctx, cx - S(22), cy - S(10), S(44), S(38), IPAL.bag);
  px(ctx, cx - S(22), cy + S(24), S(44), S(5), "#b8a888");
  px(ctx, cx - S(14), cy - S(20), S(28), S(12), "#c9b894");
  for (let i = 0; i < 4; i++) px(ctx, cx - S(13) + i * S(7), cy - S(20), S(3), S(12), IPAL.bag);
  /* גרגרים */
  for (let i = 0; i < 9; i++) {
    const g = spread(19, i);
    px(ctx, Math.round(cx - S(16) + g * S(32)), Math.round(cy - S(4) + (g * 7 % 1) * S(24)),
      S(4), S(3), IPAL.rice);
  }
}

function itemJuice(ctx, cx, cy, s) {
  const S = n => Math.round(n * s);
  px(ctx, cx - S(6), cy - S(34), S(13), S(9), "#4f9e5c");
  roundRect(ctx, cx - S(17), cy - S(26), S(34), S(52), S(8), "#f5a03f");
  roundRect(ctx, cx - S(13), cy - S(12), S(26), S(28), S(4), "#ffc45e");
  /* פלח תפוז */
  circle(ctx, cx, cy + S(2), S(9), "#f5813f");
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    px(ctx, Math.round(cx + Math.cos(a) * S(5)) - 1, Math.round(cy + S(2) + Math.sin(a) * S(5)) - 1,
      S(3), S(3), "#ffd85e");
  }
}

/* ---------- מרשם הפריטים ---------- */

const ITEM_ART = {
  bread: itemBread,
  water: itemWater,
  medicine: itemMedicine,
  bulb: itemBulb,
  coat: itemCoat,
  shoe: itemShoe,
  house: itemHouse,
  book: itemBook,
  console: itemConsole,
  candy: itemCandy,
  balloon: itemBalloon,
  shades: itemShades,
  cake: itemCake,
  ball: itemBall,
  ticket: itemTicket,
  headphones: itemHeadphones,
  milk: itemMilk,
  rice: itemRice,
  juice: itemJuice
};

/* מצייר פריט לתוך אלמנט canvas, בקנה מידה שמתאים לגודלו */
function paintItem(canvas, name, scale) {
  const draw = ITEM_ART[name];
  if (!canvas || !draw) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = scale || canvas.width / 96;
  inked(ctx, c => draw(c, Math.round(canvas.width / 2), Math.round(canvas.height / 2), s), 2);
}
