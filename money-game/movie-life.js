/* ===== חיים בסרטונים =====
   בכמה סצנות כל החפצים עמדו במקום ל-15 שניות ויותר. במקום לכתוב מחדש כל סצנה,
   מחיים את החפצים עצמם: חזיר החיסכון מתנדנד, מטבעות מסתובבים, חצים נמתחים,
   הדמויות נושמות, וכל חפץ "קופץ" קצת בתחילת כל משפט, בסנכרון עם הקריינות.
   בנוסף: תנועת מצלמה איטית בכל סצנה, וניצוצות בסצנות שכמעט לא זזות. הציורים עצמם לא שונו. */
(function () {
  if (typeof MOVIE_W === "undefined") return;
  const W = MOVIE_W;
  const H = MOVIE_H;
  const LOW = {"money-basics": [6, 8], "needs-wants": [1, 2, 4, 5, 6, 7], "budget": [1, 3, 4, 5, 7], "saving-habit": [2, 3, 4, 5, 6], "emergency-fund": [1, 2, 3, 5, 6], "compound": [2, 6], "risk": [1, 2, 3, 4, 5, 6], "credit": [2, 5, 6], "smart-shopping": [1, 2, 4, 5, 6], "goals": [1, 2, 4, 6]};
  const LIFE = {t: 0, beat: 0};
  const G = window;

  const phase = (x, y) => (Number(x) || 0) * 0.013 + (Number(y) || 0) * 0.009;

  /* חפצים ש"צפים": מתנדנדים למעלה ולמטה ולצדדים, וקופצים בתחילת משפט.
     בלי סיבוב ובלי שינוי גודל, כי הציורים בנויים מפסים קטנים ובסיבוב נפתחים בהם סדקים. */
  function floaty(name, bob) {
    const orig = G[name];
    if (typeof orig !== "function" || orig.__alive) return;
    const f = function (ctx, x, y) {
      const p = phase(x, y);
      const T = LIFE.t;
      const dx = Math.round(Math.sin(T * 1.1 + p) * 3);
      const dy = Math.round(Math.sin(T * 1.9 + p) * bob) - Math.round(LIFE.beat * 10);
      ctx.save();
      ctx.translate(dx, dy);
      try { return orig.apply(this, arguments); } finally { ctx.restore(); }
    };
    f.__alive = true;
    G[name] = f;
  }
  /* חפצים שעומדים על הרצפה: נדנוד אופקי קל וקפיצה בתחילת משפט */
  function grounded(name) {
    const orig = G[name];
    if (typeof orig !== "function" || orig.__alive) return;
    const f = function (ctx, x, y) {
      const p = phase(x, y);
      const dx = Math.round(Math.sin(LIFE.t * 1.5 + p) * 2);
      const dy = -Math.round(LIFE.beat * 8);
      ctx.save();
      ctx.translate(dx, dy);
      try { return orig.apply(this, arguments); } finally { ctx.restore(); }
    };
    f.__alive = true;
    G[name] = f;
  }

  ["drawPiggy", "drawCard", "drawBill", "drawPhone", "drawTag", "drawQuestionMark", "drawSign",
   "drawPercent", "drawShield", "drawThought", "drawApple", "drawBrokenPhone", "drawYes"]
    .forEach(n => floaty(n, 6));
  ["drawCart", "drawBike", "drawBasket", "drawEggBasket", "drawJar", "drawCoinStack",
   "drawShoe", "drawShell", "drawCheese", "drawFish"].forEach(n => grounded(n));

  /* מטבע: מסתובב וצף */
  (function () {
    const orig = G.drawCoin;
    if (typeof orig !== "function" || orig.__alive) return;
    const f = function (ctx, x, y, r, squash) {
      const p = phase(x, y);
      const sq = squash === undefined ? 0.3 + 0.7 * Math.abs(Math.cos(LIFE.t * 2.4 + p)) : squash;
      const dy = Math.round(Math.sin(LIFE.t * 2.1 + p) * 4) - Math.round(LIFE.beat * 8);
      return orig.call(this, ctx, x, y + dy, r, sq);
    };
    f.__alive = true;
    G.drawCoin = f;
  })();

  /* חץ: נמתח פנימה בתחילת הסצנה ואז פועם */
  (function () {
    const orig = G.drawArrow;
    if (typeof orig !== "function" || orig.__alive) return;
    const f = function (ctx, x1, y1, x2, y2, thick, color) {
      const g = Math.max(0, Math.min(1, (LIFE.t - 0.3 - (Math.abs(x1) % 7) * 0.05) / 1.1));
      const e = 1 - Math.pow(1 - g, 3);
      const L = Math.hypot(x2 - x1, y2 - y1) || 1;
      const pulse = g >= 1 ? Math.sin(LIFE.t * 3 + phase(x1, y1)) * 6 : 0;
      const tx = x1 + (x2 - x1) * e + ((x2 - x1) / L) * pulse;
      const ty = y1 + (y2 - y1) * e + ((y2 - y1) / L) * pulse;
      if (Math.hypot(tx - x1, ty - y1) < 6) return;
      return orig.call(this, ctx, x1, y1, tx, ty, thick, color);
    };
    f.__alive = true;
    G.drawArrow = f;
  })();

  /* דמות: נושמת (עולה ויורדת קצת), וקופצת קפיצה קטנה בתחילת כל משפט */
  (function () {
    const orig = G.drawPerson;
    if (typeof orig !== "function" || orig.__alive) return;
    const f = function (ctx, x, groundY, o) {
      if (o && o.walk) return orig.apply(this, arguments);
      const p = phase(x, groundY);
      const dy = Math.round(Math.sin(LIFE.t * 3.2 + p) * 1.5) - Math.round(LIFE.beat * 5);
      ctx.save();
      ctx.translate(0, dy);
      try { return orig.apply(this, arguments); } finally { ctx.restore(); }
    };
    f.__alive = true;
    G.drawPerson = f;
  })();

  function sparkles(ctx, t) {
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const speed = 16 + (i % 5) * 6;
      const x = Math.round(((i * 137 + 40) % W) + Math.sin(t * 0.8 + i) * 18);
      const y = Math.round(H - ((t * speed + i * 61) % (H + 40)) + 10);
      const s = 3 + (i % 3) * 2;
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2.2 + i * 1.7);
      ctx.fillStyle = i % 3 === 0 ? "#ffd84d" : "#ffffff";
      ctx.fillRect(x, y, s, s);
      ctx.fillRect(x - s, y + Math.floor(s / 3), s * 3, Math.max(1, Math.floor(s / 3)));
      ctx.fillRect(x + Math.floor(s / 3), y - s, Math.max(1, Math.floor(s / 3)), s * 3);
    }
    ctx.restore();
  }

  /* כתוביות: המשפט שנאמר עכשיו, בתחתית המסך, עם שם הדובר כשזו דמות */
  const WHO = {roni: "רוני", shopper: "הקונה", farmer: "האיכר", shepherd: "הרועה", shoemaker: "הסנדלר", crowd: "הקהל"};
  const CAP_FONT = 'system-ui, "Segoe UI", Arial, sans-serif';
  function drawCaption(ctx, t, cues) {
    let cur = null;
    for (let i = 0; i < cues.length; i++) if (cues[i].t <= t && t < cues[i].end) cur = cues[i];
    if (!cur) return;
    const fade = Math.min(1, (t - cur.t) / 0.18);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxW = W - 120;
    let size = 30;
    let lines;
    for (; size >= 20; size -= 2) {
      ctx.font = "800 " + size + "px " + CAP_FONT;
      const words = cur.text.split(" ");
      lines = [];
      let line = "";
      words.forEach(w => {
        const test = line ? line + " " + w : w;
        if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; } else line = test;
      });
      if (line) lines.push(line);
      if (lines.length <= 2) break;
    }
    const lh = size + 8;
    const label = WHO[cur.who] || "";
    const boxH = lines.length * lh + 20 + (label ? 22 : 0);
    const boxW = Math.min(W - 40, Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 60);
    const bx = (W - boxW) / 2;
    const by = H - 24 - boxH;
    ctx.fillStyle = "rgba(15,23,42,.82)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, 16); else ctx.rect(bx, by, boxW, boxH);
    ctx.fill();
    let y = by + 12;
    if (label) {
      ctx.font = "800 17px " + CAP_FONT;
      ctx.fillStyle = "#ffd84d";
      ctx.fillText(label, W / 2, y + 9);
      y += 22;
    }
    ctx.font = "800 " + size + "px " + CAP_FONT;
    ctx.fillStyle = "#ffffff";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + lh / 2 + i * lh));
    ctx.restore();
  }

  function addLife(movie, shot, index, start) {
    if (shot.__alive) return;
    shot.__alive = true;
    const orig = shot.draw;
    const dur = shot.duration;
    const isLow = (LOW[movie.id] || []).indexOf(index + 1) >= 0;
    const mode = index % 4;
    const cueTimes = (movie.cues || [])
      .map(c => c.t - start)
      .filter(t => t >= -0.01 && t < dur);
    const capCues = (movie.cues || [])
      .filter(c => c.t - start >= -0.01 && c.t - start < dur)
      .map(c => ({
        t: c.t - start,
        end: c.t - start + ((typeof VOICE_DURATIONS !== "undefined" && VOICE_DURATIONS[c.id]) || 3) + 0.5,
        text: c.text,
        who: c.who
      }));
    shot.draw = function (ctx, t) {
      const p = Math.max(0, Math.min(1, t / dur));
      LIFE.t = t;
      let last = -1;
      for (let i = 0; i < cueTimes.length; i++) if (cueTimes[i] <= t) last = cueTimes[i];
      LIFE.beat = last >= 0 && t - last < 1.8 ? Math.exp(-(t - last) * 3.4) : 0;
      let z, dx, dy;
      if (mode === 0) { z = 1 + 0.07 * p; dx = 0; dy = 0; }
      else if (mode === 1) { z = 1.04 + 0.04 * p; dx = -(z - 1) * (W / 2) * (1 - 2 * p); dy = 0; }
      else if (mode === 2) { z = 1.07 - 0.07 * p; dx = 0; dy = (z - 1) * (H / 2) * 0.6 * (1 - 2 * p); }
      else { z = 1.04 + 0.04 * p; dx = (z - 1) * (W / 2) * (1 - 2 * p); dy = -(z - 1) * (H / 2) * 0.3 * p; }
      ctx.save();
      ctx.translate(W / 2 + dx, H / 2 + dy);
      ctx.scale(z, z);
      ctx.translate(-W / 2, -H / 2);
      try { orig.call(this, ctx, t); } finally { ctx.restore(); }
      if (isLow) sparkles(ctx, t);
      drawCaption(ctx, t, capCues);
    };
  }

  const all = [];
  if (typeof moneyMovie !== "undefined") all.push(moneyMovie);
  if (typeof extraMovies !== "undefined") extraMovies.forEach(m => all.push(m));
  all.forEach(m => {
    let start = 0;
    (m.shots || []).forEach((s, i) => { addLife(m, s, i, start); start += s.duration; });
  });
})();
