/* ===== משחקייה =====
   חמשת המשחקים של המסע, גם כקטגוריה בפני עצמה.

   במסע כל משחק הוא מכשול: נכשלת, חזרת שלבים אחורה. כאן הוא תרגול -
   אפשר לשחק שוב ושוב, התוצאה הטובה ביותר נשמרת, ואין מה להפסיד.
   לכן גם מספר הסיבובים גדול יותר מאשר בגרסת המסע: שם זה מבחן קצר,
   כאן מתאמנים.

   המנוע הוא אותו minigames.js, עם אותו חוזה api של finish ו-progress.
   אין פה עותק של שום משחק - רק הפעלה שלו בהקשר אחר. */

const ARCADE_KEY = "kesef-hacham-arcade";

const ARCADE_GAMES = [
  {
    id: "sort",
    game: "sort",
    title: "צורך או רצון",
    blurb: "פריט אחרי פריט: בלעדיו אי אפשר לחיות, או שרק נעים שיהיה?",
    skill: "להבחין בין מה שחייבים למה שרוצים",
    config: () => ({items: SORT_ITEMS, rounds: 10, need: 7}),
    art: (ctx, W, H) => {
      drawJar(ctx, W / 2 - 34, H / 2 + 8, 0.52, 5, 6, "#16785c");
      drawJar(ctx, W / 2 + 34, H / 2 + 8, 0.52, 2, 6, "#7a5cc9");
    }
  },
  {
    id: "compare",
    game: "compare",
    title: "מה משתלם יותר",
    blurb: "שתי אריזות, שני מחירים. איזו זולה יותר לכל יחידה?",
    skill: "לחלק מחיר בכמות לפני שקונים",
    config: () => ({rounds: COMPARE_ROUNDS, count: 7, need: 5}),
    art: (ctx, W, H) => {
      drawPriceTag(ctx, W / 2 - 32, H / 2, 0.78, "#f5c542");
      drawPriceTag(ctx, W / 2 + 32, H / 2 + 10, 0.95, "#3f8fd8");
    }
  },
  {
    id: "budget",
    game: "budget",
    title: "לחלק את התקציב",
    blurb: "סכום אחד, כמה הוצאות. מה נכנס ומה מחכה לחודש הבא?",
    skill: "להחליט מראש ולא בסוף החודש",
    config: () => ({rounds: BUDGET_ROUNDS, count: 4, need: 3}),
    art: (ctx, W, H) => {
      drawJar(ctx, W / 2, H / 2 + 6, 0.72, 4, 6, "#f5c542");
      drawPercent(ctx, W / 2 - 44, H / 2 - 18, 0.34, "#16785c");
    }
  },
  {
    id: "scam",
    game: "scam",
    title: "הונאה או אמת",
    blurb: "הצעה מגיעה. היא אמיתית, או שמישהו מנסה לרמות?",
    skill: "לזהות הבטחה שטובה מכדי להיות אמיתית",
    config: () => ({offers: SCAM_OFFERS, count: 8, need: 6}),
    art: (ctx, W, H) => {
      drawScroll(ctx, W, H, "#f0e6cc");
      drawQuestionMark(ctx, W / 2, H / 2, 0.9, "#c97a1f");
    }
  },
  {
    id: "order",
    game: "order",
    title: "איזה חוב קודם",
    blurb: "כמה חובות על השולחן. באיזה סדר מחזירים אותם?",
    skill: "להתחיל מהריבית הגבוהה",
    config: () => ({debts: ORDER_DEBTS, count: 5, mistakes: 1}),
    art: (ctx, W, H) => {
      for (let i = 0; i < 3; i++) {
        drawPriceTag(ctx, W / 2 - 34 + i * 34, H / 2 - 12 + i * 14,
          0.62, ["#e8574a", "#f0a93f", "#4f9e5c"][i]);
      }
    }
  }
];

/* ---------- התוצאות ---------- */

function arcadeScores() {
  try { return JSON.parse(localStorage.getItem(ARCADE_KEY) || "{}"); }
  catch (e) { return {}; }
}

function arcadeSave(id, won, right, total) {
  const all = arcadeScores();
  const prev = all[id] || {plays: 0, wins: 0, best: 0};
  all[id] = {
    plays: prev.plays + 1,
    wins: prev.wins + (won ? 1 : 0),
    best: Math.max(prev.best, right),
    total: total
  };
  try { localStorage.setItem(ARCADE_KEY, JSON.stringify(all)); } catch (e) {}
}

/* ---------- תפריט ---------- */

function arcadeTile(def, scores) {
  const s = scores[def.id];
  const btn = document.createElement("button");
  btn.className = "arcade-tile";
  btn.type = "button";

  const cv = document.createElement("canvas");
  cv.width = 150; cv.height = 110;
  cv.className = "arcade-art";
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  inked(ctx, c => def.art(c, cv.width, cv.height), 2);
  btn.appendChild(cv);

  const body = document.createElement("div");
  body.className = "arcade-body";
  body.innerHTML =
    "<h3>" + def.title + "</h3>" +
    "<p>" + def.blurb + "</p>" +
    '<p class="arcade-skill">' + def.skill + "</p>" +
    (s
      ? '<p class="arcade-score">שיא: <strong>' + s.best + " מתוך " + s.total +
        "</strong> · שוחק " + s.plays + (s.plays === 1 ? " פעם" : " פעמים") + "</p>"
      : '<p class="arcade-score arcade-fresh">עוד לא שיחקתם</p>');
  btn.appendChild(body);

  btn.addEventListener("click", () => arcadePlay(def.id));
  return btn;
}

function arcadeMenu() {
  const grid = document.getElementById("arcadeGrid");
  const stage = document.getElementById("arcadeStage");
  if (!grid) return;

  stage.hidden = true;
  stage.innerHTML = "";
  grid.hidden = false;
  grid.innerHTML = "";

  const scores = arcadeScores();
  ARCADE_GAMES.forEach(def => grid.appendChild(arcadeTile(def, scores)));
}

/* ---------- משחק בודד ---------- */

function arcadePlay(id) {
  const def = ARCADE_GAMES.find(g => g.id === id);
  const game = def && MINIGAMES[def.game];
  const grid = document.getElementById("arcadeGrid");
  const stage = document.getElementById("arcadeStage");
  if (!def || !game || !stage) return;

  grid.hidden = true;
  stage.hidden = false;
  stage.innerHTML = "";

  const head = document.createElement("div");
  head.className = "arcade-head";
  head.innerHTML = "<h3>" + def.title + "</h3>";
  const back = document.createElement("button");
  back.className = "back-button";
  back.type = "button";
  back.textContent = "לכל המשחקים";
  back.addEventListener("click", arcadeMenu);
  head.appendChild(back);
  stage.appendChild(head);

  const host = document.createElement("div");
  host.className = "arcade-host";
  stage.appendChild(host);

  let right = 0;
  let total = 0;
  let settled = false;

  const api = {
    finish(won) {
      if (settled) return;
      settled = true;
      arcadeSave(def.id, won, right, total || right);
      arcadeResult(stage, def, won, right, total || right);
    },
    progress(done, all, correct, ok) {
      right = correct;
      total = all;
      if (ok === true) playSfx("good");
      else if (ok === false) playSfx("bad");
    }
  };

  game.build(host, def.config(), api);
}

function arcadeResult(stage, def, won, right, total) {
  const box = document.createElement("div");
  box.className = "arcade-result " + (won ? "good" : "bad");

  const scores = arcadeScores()[def.id] || {};
  const isBest = right >= (scores.best || 0) && right > 0;

  box.innerHTML =
    "<h3>" + (won ? "עברתם!" : "לא נורא") + "</h3>" +
    "<p class=\"arcade-tally\"><strong>" + right + "</strong> נכונות מתוך " + total + "</p>" +
    (isBest && scores.plays > 1 ? "<p class=\"arcade-best\">זה השיא החדש שלכם</p>" : "") +
    "<p>" + (won ? def.skill + " - בדיוק את זה עשיתם עכשיו."
                 : "אפשר לנסות שוב מיד. כאן אין מה להפסיד.") + "</p>";

  const again = document.createElement("button");
  again.className = "arcade-again";
  again.type = "button";
  again.textContent = "עוד פעם";
  again.addEventListener("click", () => arcadePlay(def.id));

  const menu = document.createElement("button");
  menu.className = "back-button";
  menu.type = "button";
  menu.textContent = "לכל המשחקים";
  menu.addEventListener("click", arcadeMenu);

  const row = document.createElement("div");
  row.className = "arcade-actions";
  row.appendChild(again);
  row.appendChild(menu);
  box.appendChild(row);

  stage.appendChild(box);
  box.scrollIntoView({block: "nearest", behavior: "smooth"});
}

function initArcade() {
  if (document.getElementById("arcadeGrid")) arcadeMenu();
}
