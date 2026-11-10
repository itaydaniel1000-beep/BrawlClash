/* ===== מנוע המשחק =====
   רץ רק אצל המארח. הוא מחזיק את המצב, מגריל את כל המזל (קוביות, גלגל,
   חבילה) ושולח לכולם את אותו מצב - כך כולם רואים בדיוק אותו משחק.
   שאר השחקנים רק שולחים בקשות: "הטלתי", "בחרתי", "תקפתי", "תפסתי". */

const rnd = n => Math.floor(Math.random() * n);
const shuffle = arr => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function makeMon(id) {
  const hp = POKEMON[id].hp * CONFIG.hpScale;
  return {id, hp, maxHp: hp};
}

/* לתוקף עם שני סוגים - הסוג הטוב מבין השניים */
function typeMultiplier(atkTypes, defTypes) {
  let best = 0;
  for (const a of atkTypes) {
    let m = 1;
    for (const d of defTypes) {
      const v = TYPE_CHART[a][d];
      if (v !== undefined) m *= v;
    }
    best = Math.max(best, m);
  }
  return best;
}

function damageOf(attackerId, defenderId) {
  const mult = typeMultiplier(POKEMON[attackerId].types, POKEMON[defenderId].types);
  return {mult, dmg: Math.round(POKEMON[attackerId].power * mult)};
}

function catchChance(wild) {
  const base = POKEMON[wild.id].catch || 0;
  const lost = 1 - wild.hp / wild.maxHp;
  return Math.min(CONFIG.catchMax, base + (1 - base) * lost * CONFIG.catchGrowth);
}

function multText(mult) {
  if (mult === 0) return "אין השפעה";
  if (mult >= 2) return `יעיל מאוד! פי ${mult}`;
  if (mult === 0.5) return "לא יעיל - חצי כוח";
  if (mult < 0.5) return "לא יעיל - רבע כוח";
  return "רגיל";
}

const Engine = (() => {
  let S = null;
  let onChange = () => {};
  let timer = null, deadline = 0, total = 0;
  let paused = false;

  // ?speed=10 מריץ את כל הזמנים פי 10 מהר יותר - לבדיקות בלבד
  const SPEED = Number(new URLSearchParams(location.search).get("speed")) || 1;
  const MS = {
    turn: CONFIG.turnSeconds * 1000 / SPEED,
    msg: 4000 / SPEED,
    order: 3000 / SPEED,
    wheel: 4200 / SPEED,
    anim: 1400 / SPEED,
    end: 12000 / SPEED
  };

  const P = pid => S.players.find(p => p.pid === pid);
  const alive = p => p.team.filter(m => m.hp > 0);
  const anyAlive = () => S.players.some(p => alive(p).length > 0);
  const current = () => P(S.order[S.pos]);

  function log(text) {
    S.log.unshift(text);
    S.log.length = Math.min(S.log.length, 40);
  }

  function commit(fx) {
    S.seq++;
    onChange(S, fx || null);
  }

  function schedule(ms, fn) {
    clearTimeout(timer);
    total = ms;
    deadline = Date.now() + ms;
    if (!paused) timer = setTimeout(fn, ms);
  }

  function stopTimer() {
    clearTimeout(timer);
    total = 0;
    deadline = 0;
  }

  /* ---------- חדר המתנה ---------- */

  function lobby(meta, host) {
    S = {
      ...meta,                 // roomKey, code, mode, N
      hostPid: host.pid,
      hostGen: 0,
      phase: "waiting",
      players: [{pid: host.pid, name: host.name, team: [], roll: null}],
      seq: 0,
      log: []
    };
    stopTimer();
    commit();
  }

  const canJoin = () => S && S.phase === "waiting" && S.players.length < S.N;

  function addPlayer(pid, name) {
    if (!canJoin()) return false;
    S.players.push({pid, name, team: [], roll: null});
    if (S.players.length >= S.N) newGame();
    else commit();
    return true;
  }

  /* ---------- זרימת המשחק ---------- */

  function newGame() {
    Object.assign(S, {
      deck: shuffle(WILD_DECK),
      starterPool: STARTERS.slice(),
      wild: null,
      order: [],
      pos: 0,
      resolved: 0,
      message: null,
      wheel: null,
      action: null,
      win: null,
      log: []
    });
    S.players.forEach(p => { p.team = []; p.roll = null; });
    log("ההרפתקה מתחילה!");
    startRoll("starterRoll");
  }

  function startRoll(phase) {
    S.phase = phase;
    S.players.forEach(p => (p.roll = null));
    schedule(MS.turn, autoRoll);
    commit();
  }

  function roll(p) {
    p.roll = rnd(6) + 1;
    p.tie = Math.random();
  }

  /* מי שלא הטיל תוך 20 שניות - הקובייה מוטלת בשבילו */
  function autoRoll() {
    S.players.filter(p => p.roll === null).forEach(roll);
    afterRolls();
  }

  function afterRolls() {
    if (S.players.some(p => p.roll === null)) return commit();
    S.order = S.players.slice()
      .sort((a, b) => b.roll - a.roll || b.tie - a.tie)
      .map(p => p.pid);
    S.pos = 0;
    const names = S.order.map(pid => P(pid).name).join(" ← ");
    log(`סדר התורות: ${names}`);
    const next = S.phase === "starterRoll" ? "starterPick" : "turns";
    showMessage("סדר התורות", names, next, MS.order);
  }

  function startStarterPick() {
    S.phase = "starterPick";
    schedule(MS.turn, () => {
      const id = S.starterPool[rnd(S.starterPool.length)];
      log(`${current().name} לא בחר בזמן - קיבל פוקימון אקראי`);
      pickStarter(id);
    });
    commit();
  }

  function pickStarter(id) {
    const p = current();
    p.team.push(makeMon(id));
    S.starterPool = S.starterPool.filter(x => x !== id);
    log(`${p.name} בחר ב${POKEMON[id].he}`);
    S.pos++;
    if (S.pos >= S.order.length) drawWild();
    else startStarterPick();
  }

  function drawWild() {
    if (S.deck.length === 0) return startBoss();
    const id = S.deck.shift();
    S.wild = makeMon(id);
    log(`פוקימון פראי הופיע: ${POKEMON[id].he}!`);
    showMessage("פוקימון פראי הופיע!", `${POKEMON[id].he} קופץ מהחבילה אל השולחן.`, "roundRoll");
  }

  function startBoss() {
    const b = CONFIG.boss;
    const hp = b.hpPerPlayer * S.players.length;
    S.wild = {id: b.id, hp, maxHp: hp, boss: true};
    if (b.healBefore) healAll();
    log("הקרב האחרון!");
    showMessage("הקרב האחרון!", `החבילה נגמרה. ${POKEMON[b.id].he} מופיע. אם תנצחו - כולם מנצחים את ההרפתקה. אם לאף אחד לא יישאר פוקימון חי - כולם מפסידים.${b.healBefore ? " לפני הקרב כל הפוקימונים מתרפאים." : ""}`, "roundRoll");
  }

  function startTurns() {
    S.pos = 0;
    skipDead();
  }

  /* מדלגים על שחקן שאין לו פוקימון חי */
  function skipDead() {
    while (S.pos < S.order.length && alive(current()).length === 0) {
      log(`${current().name} מדלג - אין לו פוקימון חי`);
      S.pos++;
    }
    if (S.pos >= S.order.length) return wildTurn();
    S.phase = "turn";
    S.action = null;
    schedule(MS.turn, () => {
      log(`${current().name} - נגמר הזמן`);
      nextTurn();
    });
    commit();
  }

  function nextTurn() {
    S.pos++;
    skipDead();
  }

  function attack(monIndex) {
    const p = current();
    const mon = p.team[monIndex];
    if (!mon || mon.hp <= 0) return;
    const {mult, dmg} = damageOf(mon.id, S.wild.id);
    S.wild.hp = Math.max(0, S.wild.hp - dmg);
    const text = `${p.name}: ${POKEMON[mon.id].he} תוקף - ${dmg} (${multText(mult)})`;
    log(text);
    S.phase = "anim";
    S.action = text;
    schedule(MS.anim, afterAnim);
    commit({kind: "damage", dmg, mult});
  }

  function afterAnim() {
    if (S.wild.hp <= 0) wildFainted();
    else nextTurn();
  }

  function startCatch() {
    const chance = catchChance(S.wild);
    const success = Math.random() < chance;
    const greenDeg = chance * 360;
    const margin = Math.min(8, greenDeg / 4, (360 - greenDeg) / 4);
    const land = success
      ? margin + Math.random() * (greenDeg - 2 * margin)
      : greenDeg + margin + Math.random() * (360 - greenDeg - 2 * margin);
    S.wheel = {chance, success, turn: 360 * 6 + (360 - land), pid: current().pid};
    S.phase = "wheel";
    S.action = `${current().name} מנסה לתפוס את ${POKEMON[S.wild.id].he}`;
    schedule(MS.wheel, afterWheel);
    commit({kind: "wheel"});
  }

  function afterWheel() {
    const w = S.wheel;
    S.wheel = null;
    if (w.success && P(w.pid)) return caught(P(w.pid));
    if (P(w.pid)) log(`${P(w.pid).name} ניסה לתפוס ונכשל`);
    nextTurn();
  }

  function caught(p) {
    const w = S.wild;
    p.team.push({id: w.id, hp: w.hp, maxHp: w.maxHp});
    log(`${p.name} תפס את ${POKEMON[w.id].he}!`);
    S.wild = null;
    resolveWild(`${p.name} תפס את ${POKEMON[w.id].he}!`, "הפוקימון מצטרף אליו ונשאר אצלו.");
  }

  function wildFainted() {
    const w = S.wild;
    if (w.boss) return endGame(true);
    S.deck.splice(rnd(S.deck.length + 1), 0, w.id);
    log(`${POKEMON[w.id].he} התעלף וחזר לחבילה`);
    S.wild = null;
    resolveWild(`${POKEMON[w.id].he} התעלף!`, "הוא חוזר למקום אקראי בחבילה.");
  }

  function resolveWild(title, text) {
    S.resolved++;
    if (S.resolved % CONFIG.clinicEvery === 0) {
      healAll();
      log("ביקור במרפאה - כולם מתרפאים");
      text += ` אחרי ${CONFIG.clinicEvery} פוקימונים פראיים הולכים למרפאה: כל הפוקימונים חוזרים לחיים מלאים. 🏥`;
    }
    showMessage(title, text, "drawWild");
  }

  function healAll() {
    S.players.forEach(p => p.team.forEach(m => (m.hp = m.maxHp)));
  }

  /* תור הפוקימון הפראי: תוקף פוקימון חי אקראי.
     הבוס תוקף פעם אחת לכל שחקן ונשאר. פראי רגיל חוזר אחר כך לחבילה.
     אם לאף שחקן לא נשאר פוקימון חי - כולם מפסידים. */
  function wildTurn() {
    if (!anyAlive()) return endGame(false);
    const name = POKEMON[S.wild.id].he;
    const hits = S.wild.boss ? S.players.length : 1;
    const lines = [];
    for (let k = 0; k < hits && anyAlive(); k++) {
      const targets = [];
      S.players.forEach(p => p.team.forEach(m => m.hp > 0 && targets.push({p, m})));
      const {p, m} = targets[rnd(targets.length)];
      const {mult, dmg} = damageOf(S.wild.id, m.id);
      m.hp = Math.max(0, m.hp - dmg);
      const ko = m.hp === 0 ? " - התעלף! 💫" : "";
      lines.push(`תוקף את ${POKEMON[m.id].he} של ${p.name}: ‎-${dmg} (${multText(mult)})${ko}`);
      log(`${name} ${lines[lines.length - 1]}`);
    }
    const title = `תור של ${name}`;
    if (!anyAlive()) return showMessage(title, lines.join("\n"), "lose");
    if (S.wild.boss) return showMessage(title, lines.join("\n") + "\n\nמטילים שוב קוביות לסבב הבא.", "roundRoll");
    S.deck.splice(rnd(S.deck.length + 1), 0, S.wild.id);
    S.wild = null;
    log(`${name} חזר לחבילה`);
    resolveWild(title, lines.join("\n") + `\n\nאף אחד לא תפס אותו, אז ${name} חוזר למקום אקראי בחבילה עם חיים מלאים.`);
  }

  function endGame(win) {
    S.phase = "end";
    S.win = win;
    S.message = null;
    log(win ? "ניצחתם את ההרפתקה!" : "הפסדתם את ההרפתקה");
    schedule(MS.end, newGame);
    commit();
  }

  function showMessage(title, text, next, ms = MS.msg) {
    S.message = {title, text, next};
    S.phase = "message";
    schedule(ms, continueMessage);
    commit();
  }

  const NEXT = {
    roundRoll: () => startRoll("roundRoll"),
    starterPick: startStarterPick,
    turns: startTurns,
    drawWild,
    lose: () => endGame(false)
  };

  function continueMessage() {
    const next = S.message.next;
    S.message = null;
    NEXT[next]();
  }

  /* ---------- בקשות מהשחקנים ---------- */

  function act(pid, a) {
    if (!S || !a) return;
    const p = P(pid);
    if (!p) return;
    const mine = S.order && S.order[S.pos] === pid;
    switch (a.t) {
      case "roll":
        if ((S.phase === "starterRoll" || S.phase === "roundRoll") && p.roll === null) {
          roll(p);
          afterRolls();
        }
        break;
      case "pick":
        if (S.phase === "starterPick" && mine && S.starterPool.includes(a.id)) pickStarter(a.id);
        break;
      case "attack":
        if (S.phase === "turn" && mine) attack(a.index);
        break;
      case "catch":
        if (S.phase === "turn" && mine && !S.wild.boss) startCatch();
        break;
    }
  }

  /* ---------- שחקן יצא ----------
     הפוקימונים שלו, כולל ההתחלתי, חוזרים לחבילה.
     בקרב האחרון הקלפים שלו פשוט נעלמים והקרב ממשיך בלעדיו. */
  function removePlayer(pid) {
    if (!S) return;
    const idx = S.players.findIndex(p => p.pid === pid);
    if (idx < 0) return;
    const p = S.players[idx];
    S.players.splice(idx, 1);

    if (S.phase === "waiting") return commit();
    if (!S.players.length) { stopTimer(); return; }

    const inBoss = S.wild && S.wild.boss;
    if (!inBoss && S.deck) {
      p.team.forEach(m => S.deck.splice(rnd(S.deck.length + 1), 0, m.id));
    }
    log(`${p.name} יצא מהמשחק${!inBoss && p.team.length ? " - הפוקימונים שלו חזרו לחבילה" : ""}`);

    const oi = S.order.indexOf(pid);
    const wasCurrent = oi >= 0 && oi === S.pos;
    if (oi >= 0) {
      S.order.splice(oi, 1);
      if (oi < S.pos) S.pos--;
    }

    switch (S.phase) {
      case "starterRoll":
      case "roundRoll":
        return afterRolls();
      case "starterPick":
        if (S.pos >= S.order.length) return drawWild();
        if (wasCurrent) return startStarterPick();
        break;
      case "turn":
        if (wasCurrent) return skipDead();
        break;
      case "anim":
        if (wasCurrent) S.pos--;  // afterAnim יעבור לבא בתור
        break;
      case "wheel":
        if (wasCurrent) S.pos--;
        break;
    }
    if (S.phase !== "end" && S.phase !== "message" && !anyAlive()) return endGame(false);
    commit();
  }

  /* ---------- העברת תפקיד המארח ----------
     כל שחקן מחזיק עותק של המצב. אם המארח יוצא, הבא בתור ממשיך מאותה נקודה. */
  function adopt(state, onCh) {
    S = state;
    onChange = onCh;
    paused = true;
    stopTimer();
  }

  function resume() {
    paused = false;
    switch (S.phase) {
      case "starterRoll":
      case "roundRoll": schedule(MS.turn, autoRoll); break;
      case "starterPick": startStarterPick(); return;
      case "turn": skipDead(); return;
      case "anim": schedule(MS.anim, afterAnim); break;
      case "wheel": schedule(MS.wheel, afterWheel); break;
      case "message": schedule(MS.msg, continueMessage); break;
      case "end": schedule(MS.end, newGame); break;
    }
    commit();
  }

  function init(onCh) { onChange = onCh; paused = false; }

  return {
    init, lobby, canJoin, addPlayer, act, removePlayer, adopt, resume,
    state: () => S,
    remaining: () => (deadline ? Math.max(0, deadline - Date.now()) : 0),
    total: () => total,
    stop: () => { stopTimer(); S = null; }
  };
})();
