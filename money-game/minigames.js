/* ===== משחקי המסע =====
   כל שלב מריץ סוג משחק אחר, לא רק חידון. כל משחק בונה את הממשק שלו
   לתוך host, ומדווח בסוף דרך api.finish(won).

   api = { finish(won), progress(done, total, right) } */

/* ---------- כלי עזר משותפים ---------- */

function mgEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function mgCanvas(w, h, cls) {
  const c = mgEl("canvas", cls);
  c.width = w;
  c.height = h;
  return c;
}

/* כותרת המשחק: מה עושים וכמה צריך להצליח */
function mgHead(host, howto, need, total) {
  const head = mgEl("div", "mg-head");
  head.appendChild(mgEl("p", "mg-howto", howto));
  const goal = mgEl("span", "mg-goal", `צריך ${need} מתוך ${total}`);
  head.appendChild(goal);
  host.appendChild(head);
  return head;
}

/* שורת נקודות שמתמלאת: ירוק נכון, אדום טעות */
function mgDots(host, total) {
  const row = mgEl("div", "mg-dots");
  for (let i = 0; i < total; i++) row.appendChild(mgEl("span", "mg-dot"));
  host.appendChild(row);
  return {
    mark(i, right) {
      const dot = row.children[i];
      if (dot) dot.className = "mg-dot " + (right ? "right" : "wrong");
    }
  };
}

/* משוב קצר אחרי כל סיבוב */
function mgFeedback(host) {
  const box = mgEl("p", "mg-feedback");
  host.appendChild(box);
  return {
    show(right, text) {
      box.textContent = text;
      box.className = "mg-feedback " + (right ? "good" : "bad");
    },
    clear() {
      box.textContent = "";
      box.className = "mg-feedback";
    }
  };
}

/* מריץ סיבובים בזה אחר זה, עם השהיה קצרה לקריאת המשוב */
function mgRunner(items, need, api, renderRound) {
  let i = 0;
  let right = 0;
  let busy = false;

  function next() {
    if (i >= items.length || right >= need || (items.length - i) < (need - right)) {
      api.finish(right >= need);
      return;
    }
    busy = false;
    renderRound(items[i], i, answer);
  }

  function answer(ok, explain, after) {
    if (busy) return;
    busy = true;
    if (ok) right++;
    api.progress(i + 1, items.length, right, ok, explain);
    i++;
    if (after) after(ok);
    setTimeout(next, ok ? 950 : 1750);
  }

  next();
  return {get right() { return right; }};
}

/* ---------- ציורים למשחקים ---------- */

/* צנצנת עם מטבעות בפנים */
function drawJar(ctx, cx, cy, s, coins, max, tint) {
  const S = n => Math.round(n * s);
  const w = S(74);
  const h = S(92);
  const top = cy - Math.round(h / 2);

  /* זכוכית */
  roundRect(ctx, cx - Math.round(w / 2), top, w, h, S(12), "rgba(210,232,245,.55)");
  px(ctx, cx - Math.round(w / 2) - S(5), top - S(9), w + S(10), S(11), tint || "#b8c2cc");
  px(ctx, cx - Math.round(w / 2) - S(3), top - S(14), w + S(6), S(6), "#8a95a3");

  /* המטבעות מצטברים מהתחתית */
  const rows = Math.max(1, Math.ceil(max / 3));
  for (let i = 0; i < coins; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const jitter = spread(11, i) * S(4);
    const x = cx - S(23) + col * S(23) + Math.round(jitter);
    const y = cy + Math.round(h / 2) - S(14) - row * S(15);
    drawCoin(ctx, x, y, S(10), 0.82);
  }

  /* בוהק על הזכוכית */
  px(ctx, cx - Math.round(w / 2) + S(8), top + S(10), S(7), h - S(26), "rgba(255,255,255,.4)");
}

/* שלט הצעה: קלף קלף מגולגל */
function drawScroll(ctx, w, h, tone) {
  const ctxW = w;
  px(ctx, 0, 8, ctxW, h - 16, tone || "#f0e2bc");
  px(ctx, 0, 8, ctxW, 5, "#d8c79a");
  px(ctx, 0, h - 13, ctxW, 5, "#d8c79a");
  /* גלילים למעלה ולמטה */
  roundRect(ctx, -4, 0, ctxW + 8, 14, 7, "#a3763f");
  roundRect(ctx, -4, h - 14, ctxW + 8, 14, 7, "#a3763f");
  px(ctx, 0, 3, ctxW, 3, "#75542c");
  px(ctx, 0, h - 6, ctxW, 3, "#75542c");
  /* כתמי גיל */
  for (let i = 0; i < 7; i++) {
    const g = spread(29, i);
    ctx.globalAlpha = 0.18;
    circle(ctx, Math.round(g * ctxW), Math.round(20 + (g * 13 % 1) * (h - 45)),
      Math.round(4 + g * 7), "#c9a877");
  }
  ctx.globalAlpha = 1;
}

/* חוליית שרשרת - לחובות */
function drawChainLink(ctx, cx, cy, s, broken) {
  const S = n => Math.round(n * s);
  const color = broken ? "#8a95a3" : "#6f7b88";
  for (let a = 0; a < 360; a += 4) {
    const r = (a * Math.PI) / 180;
    if (broken && a > 140 && a < 220) continue;
    px(ctx, Math.round(cx + Math.cos(r) * S(15)) - S(4),
      Math.round(cy + Math.sin(r) * S(10)) - S(4), S(8), S(8), color);
  }
  px(ctx, cx - S(11), cy - S(7), S(5), S(4), "#b8c2cc");
}

/* תג מחיר */
function drawPriceTag(ctx, cx, cy, s, color) {
  const S = n => Math.round(n * s);
  ctx.fillStyle = color || "#f5c542";
  ctx.beginPath();
  ctx.moveTo(cx - S(30), cy - S(16));
  ctx.lineTo(cx + S(18), cy - S(16));
  ctx.lineTo(cx + S(32), cy);
  ctx.lineTo(cx + S(18), cy + S(16));
  ctx.lineTo(cx - S(30), cy + S(16));
  ctx.closePath();
  ctx.fill();
  circle(ctx, cx + S(18), cy, S(4), "#fff");
}

/* ---------- 1. מיון: צורך או רצון ---------- */

const MG_SORT = {
  howto: "כל פריט - צורך או רצון?",
  build(host, cfg, api) {
    const items = shuffled(cfg.items).slice(0, cfg.rounds || 8);
    mgHead(host, this.howto, cfg.need, items.length);
    const dots = mgDots(host, items.length);

    const stage = mgEl("div", "mg-item-stage");
    const canvas = mgCanvas(150, 150, "mg-item-art");
    const label = mgEl("p", "mg-item-label");
    stage.appendChild(canvas);
    stage.appendChild(label);
    host.appendChild(stage);

    const feedback = mgFeedback(host);

    const buttons = mgEl("div", "mg-choices two");
    const bNeed = mgEl("button", "mg-choice need", "צורך");
    const bWant = mgEl("button", "mg-choice want", "רצון");
    buttons.appendChild(bNeed);
    buttons.appendChild(bWant);
    host.appendChild(buttons);

    mgRunner(items, cfg.need, api, (item, index, answer) => {
      feedback.clear();
      label.textContent = item.label;
      paintItem(canvas, item.art, 1.35);
      stage.className = "mg-item-stage";
      [bNeed, bWant].forEach(b => {
        b.disabled = false;
        b.className = b.className.replace(/ (right|wrong)/g, "");
      });

      const pick = isNeed => {
        const ok = isNeed === item.need;
        bNeed.disabled = bWant.disabled = true;
        const chosen = isNeed ? bNeed : bWant;
        chosen.className += ok ? " right" : " wrong";
        stage.className = "mg-item-stage " + (ok ? "good" : "bad");
        dots.mark(index, ok);
        feedback.show(ok, item.why);
        answer(ok, item.why);
      };

      bNeed.onclick = () => pick(true);
      bWant.onclick = () => pick(false);
    });
  }
};

/* ---------- 2. השוואה: מה משתלם יותר ---------- */

const MG_COMPARE = {
  howto: "איזו אריזה משתלמת יותר?",
  build(host, cfg, api) {
    const rounds = shuffled(cfg.rounds).slice(0, cfg.count || 5);
    mgHead(host, this.howto, cfg.need, rounds.length);
    const dots = mgDots(host, rounds.length);

    const board = mgEl("div", "mg-compare");
    host.appendChild(board);
    const feedback = mgFeedback(host);

    mgRunner(rounds, cfg.need, api, (round, index, answer) => {
      feedback.clear();
      board.innerHTML = "";

      /* סדר אקראי, כדי שהזול לא יהיה תמיד באותו צד */
      const order = shuffled([0, 1]);
      const cards = order.map(which => {
        const item = round.options[which];
        const card = mgEl("button", "mg-product");
        const canvas = mgCanvas(110, 110, "mg-product-art");
        card.appendChild(canvas);
        card.appendChild(mgEl("strong", "mg-product-name", item.name));
        card.appendChild(mgEl("span", "mg-product-size", item.size));
        card.appendChild(mgEl("span", "mg-product-price", item.price));
        const unit = mgEl("span", "mg-product-unit", "");
        card.appendChild(unit);
        board.appendChild(card);
        paintItem(canvas, item.art, 1);
        card._item = item;
        card._unit = unit;
        card._which = which;
        card._right = which === round.better;
        return card;
      });

      cards.forEach(card => {
        card.onclick = () => {
          const ok = card._right;
          cards.forEach(c => {
            c.disabled = true;
            c._unit.textContent = c._item.unit;
            c.className = "mg-product " +
              (c._which === round.better ? "right" : c === card ? "wrong" : "dim");
          });
          dots.mark(index, ok);
          feedback.show(ok, round.why);
          answer(ok, round.why);
        };
      });
    });
  }
};

/* ---------- 3. תקציב: חמישים־שלושים־עשרים ---------- */

const MG_BUDGET = {
  howto: "חלקו את המטבעות לפי הכלל: חצי לצרכים, שלושים אחוז לרצונות, עשרים לחיסכון.",
  build(host, cfg, api) {
    const rounds = cfg.rounds.slice(0, cfg.count || 3);
    mgHead(host, this.howto, cfg.need, rounds.length);
    const dots = mgDots(host, rounds.length);

    const board = mgEl("div", "mg-budget");
    host.appendChild(board);
    const feedback = mgFeedback(host);

    const JARS = [
      {key: "needs", name: "צרכים", share: 0.5, tint: "#4f9e5c"},
      {key: "wants", name: "רצונות", share: 0.3, tint: "#8a5cc9"},
      {key: "save", name: "חיסכון", share: 0.2, tint: "#f5c542"}
    ];

    mgRunner(rounds, cfg.need, api, (round, index, answer) => {
      feedback.clear();
      board.innerHTML = "";

      const target = JARS.map(j => Math.round(round.coins * j.share));
      const put = [0, 0, 0];

      const total = mgEl("p", "mg-budget-total");
      board.appendChild(total);

      const row = mgEl("div", "mg-jars");
      board.appendChild(row);

      const jarViews = JARS.map((jar, ji) => {
        const cell = mgEl("div", "mg-jar");
        const canvas = mgCanvas(120, 150, "mg-jar-art");
        cell.appendChild(canvas);
        cell.appendChild(mgEl("strong", "mg-jar-name", jar.name));

        const controls = mgEl("div", "mg-jar-controls");
        const minus = mgEl("button", "mg-step", "−");
        const count = mgEl("span", "mg-jar-count", "0");
        const plus = mgEl("button", "mg-step", "+");
        controls.appendChild(plus);
        controls.appendChild(count);
        controls.appendChild(minus);
        cell.appendChild(controls);
        row.appendChild(cell);

        const view = {cell, canvas, count, plus, minus};
        plus.onclick = () => {
          if (put.reduce((a, b) => a + b, 0) >= round.coins) return;
          put[ji]++;
          refresh();
        };
        minus.onclick = () => {
          if (put[ji] <= 0) return;
          put[ji]--;
          refresh();
        };
        return view;
      });

      const submit = mgEl("button", "mg-submit", "לבדוק את החלוקה");
      board.appendChild(submit);

      function refresh() {
        const used = put.reduce((a, b) => a + b, 0);
        total.textContent = `נשארו ${round.coins - used} מטבעות מתוך ${round.coins}`;
        jarViews.forEach((v, i) => {
          v.count.textContent = put[i];
          const ctx = v.canvas.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, v.canvas.width, v.canvas.height);
          inked(ctx, c => drawJar(c, 60, 78, 1, put[i], round.coins, JARS[i].tint), 2);
        });
        submit.disabled = used !== round.coins;
      }

      submit.onclick = () => {
        const ok = put.every((n, i) => n === target[i]);
        submit.disabled = true;
        jarViews.forEach((v, i) => {
          v.plus.disabled = v.minus.disabled = true;
          v.cell.className = "mg-jar " + (put[i] === target[i] ? "right" : "wrong");
          if (put[i] !== target[i]) v.count.textContent = `${put[i]} → ${target[i]}`;
        });
        dots.mark(index, ok);
        feedback.show(ok, ok ? round.why : `החלוקה הנכונה: ${target.join(" · ")}. ${round.why}`);
        answer(ok, round.why);
      };

      refresh();
    });
  }
};

/* ---------- 4. הונאה או הצעה אמיתית ---------- */

const MG_SCAM = {
  howto: "ההצעה הזאת אמיתית, או שמישהו מנסה לרמות?",
  build(host, cfg, api) {
    const offers = shuffled(cfg.offers).slice(0, cfg.count || 6);
    mgHead(host, this.howto, cfg.need, offers.length);
    const dots = mgDots(host, offers.length);

    const stage = mgEl("div", "mg-scroll-stage");
    const canvas = mgCanvas(430, 190, "mg-scroll-art");
    const text = mgEl("p", "mg-scroll-text");
    stage.appendChild(canvas);
    stage.appendChild(text);
    host.appendChild(stage);

    const feedback = mgFeedback(host);

    const buttons = mgEl("div", "mg-choices two");
    const bSafe = mgEl("button", "mg-choice need", "נשמע אמיתי");
    const bScam = mgEl("button", "mg-choice want", "זו הונאה");
    buttons.appendChild(bSafe);
    buttons.appendChild(bScam);
    host.appendChild(buttons);

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    mgRunner(offers, cfg.need, api, (offer, index, answer) => {
      feedback.clear();
      text.textContent = offer.text;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      inked(ctx, c => {
        drawScroll(c, canvas.width, canvas.height, offer.scam ? "#f0dcc0" : "#eef0dc");
        drawPercent(c, 60, 96, 0.5, offer.scam ? "#c0392b" : "#4f9e5c");
        drawPriceTag(c, canvas.width - 62, 96, 1, offer.scam ? "#e8574a" : "#f5c542");
      }, 2);

      stage.className = "mg-scroll-stage";
      [bSafe, bScam].forEach(b => {
        b.disabled = false;
        b.className = b.className.replace(/ (right|wrong)/g, "");
      });

      const pick = saidScam => {
        const ok = saidScam === offer.scam;
        bSafe.disabled = bScam.disabled = true;
        const chosen = saidScam ? bScam : bSafe;
        chosen.className += ok ? " right" : " wrong";
        stage.className = "mg-scroll-stage " + (ok ? "good" : "bad");
        dots.mark(index, ok);
        feedback.show(ok, offer.why);
        answer(ok, offer.why);
      };

      bSafe.onclick = () => pick(false);
      bScam.onclick = () => pick(true);
    });
  }
};

/* ---------- 5. סדר החזר החובות ---------- */

const MG_ORDER = {
  howto: "לחצו על החובות לפי הסדר שבו נכון להחזיר אותם. מתחילים בזה שגדל הכי מהר.",
  build(host, cfg, api) {
    const debts = shuffled(cfg.debts).slice(0, cfg.count || 4);
    /* הסדר הנכון: ריבית גבוהה קודם */
    const correct = debts.slice().sort((a, b) => b.rate - a.rate);
    const allowed = cfg.mistakes == null ? 1 : cfg.mistakes;

    mgHead(host, this.howto, debts.length, debts.length);
    const feedback = mgFeedback(host);

    const list = mgEl("div", "mg-debts");
    host.appendChild(list);

    let step = 0;
    let mistakes = 0;
    let busy = false;

    const cards = debts.map(debt => {
      const card = mgEl("button", "mg-debt");
      const canvas = mgCanvas(70, 60, "mg-debt-art");
      card.appendChild(canvas);
      const info = mgEl("div", "mg-debt-info");
      info.appendChild(mgEl("strong", null, debt.name));
      info.appendChild(mgEl("span", "mg-debt-sum", debt.amount));
      info.appendChild(mgEl("span", "mg-debt-rate", `ריבית ${debt.rate}% בשנה`));
      card.appendChild(info);
      const rank = mgEl("span", "mg-debt-rank", "");
      card.appendChild(rank);
      list.appendChild(card);

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      inked(ctx, c => drawChainLink(c, 35, 30, 1.1, false), 2);

      card._debt = debt;
      card._rank = rank;
      card._canvas = canvas;

      card.onclick = () => {
        if (busy || card.disabled) return;
        const want = correct[step];

        if (card._debt === want) {
          step++;
          card.disabled = true;
          card.className = "mg-debt right";
          card._rank.textContent = step;
          /* השרשרת נשברת */
          const c2 = canvas.getContext("2d");
          c2.clearRect(0, 0, canvas.width, canvas.height);
          inked(c2, c => drawChainLink(c, 35, 30, 1.1, true), 2);
          feedback.show(true, `נכון - ${debt.rate}% היא הריבית הגבוהה שנותרה.`);

          if (step >= correct.length) {
            busy = true;
            setTimeout(() => api.finish(mistakes <= allowed), 1100);
          }
        } else {
          mistakes++;
          card.className = "mg-debt wrong";
          feedback.show(false,
            `לא זה. ${want.name} בריבית ${want.rate}% גדל מהר יותר, ולכן הוא קודם.`);
          setTimeout(() => {
            if (!card.disabled) card.className = "mg-debt";
          }, 900);

          if (mistakes > allowed) {
            busy = true;
            setTimeout(() => api.finish(false), 1500);
          }
        }
        api.progress(step, correct.length, step);
      };

      return card;
    });
  }
};

/* ---------- מרשם המשחקים ---------- */

const MINIGAMES = {
  sort: MG_SORT,
  compare: MG_COMPARE,
  budget: MG_BUDGET,
  scam: MG_SCAM,
  order: MG_ORDER
};
