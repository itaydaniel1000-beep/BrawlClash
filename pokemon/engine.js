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

/* כל הפוקימונים חוץ מההתחלתיים והבוס */
const wildPool = () => Object.keys(POKEMON).filter(id => !STARTERS.includes(id) && id !== CONFIG.boss.id);

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

/* מכונת המספרים: כל 20 חיים = עוד 5 מספרים. אחד מהם הוא הנכון, ואף אחד לא יודע מה הוא */
function slotSize(hp) {
  return Math.max(CONFIG.slotStep, Math.ceil(hp / CONFIG.slotHp) * CONFIG.slotStep);
}

function makeWild(id) {
  const w = makeMon(id);
  const n = slotSize(w.hp);
  w.nums = Array.from({length: n}, (_, i) => i + 1);
  w.secret = w.nums[rnd(n)];
  return w;
}

/* החיים ירדו - מספרים שגויים נעלמים מהמכונה */
function trimNums(w) {
  if (!w || !w.nums) return;
  const target = slotSize(w.hp);
  while (w.nums.length > target) {
    const wrong = w.nums.filter(n => n !== w.secret);
    if (!wrong.length) break;
    const x = wrong[rnd(wrong.length)];
    w.nums = w.nums.filter(n => n !== x);
  }
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
    msg: 4000 / SPEED,
    order: 3000 / SPEED,
    dice: 2800 / SPEED,
    wheel: 4400 / SPEED,
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
      players: [{pid: host.pid, name: host.name, team: [], roll: null, ready: false}],
      seq: 0,
      log: []
    };
    stopTimer();
    commit();
  }

  const canJoin = () => S && S.phase === "waiting" && S.players.length < S.N;

  function addPlayer(pid, name) {
    if (!canJoin()) return false;
    S.players.push({pid, name, team: [], roll: null, ready: false});
    if (S.players.length >= S.N) newGame();
    else commit();
    return true;
  }

  /* ---------- זרימת המשחק ---------- */

  function newGame() {
    Object.assign(S, {
      deck: shuffle(wildPool()).slice(0, CONFIG.deckSize),
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
    S.players.forEach(p => { p.team = []; p.roll = null; p.ready = false; });
    log("ההרפתקה מתחילה!");
    startRoll("starterRoll");
  }

  /* אין טיימר: מחכים שכל השחקנים ילחצו "מוכן" */
  function startRoll(phase) {
    S.phase = phase;
    S.rollKind = phase;
    S.players.forEach(p => { p.roll = null; p.rolls = []; p.ready = false; });
    stopTimer();
    commit();
  }

  function roll(p) {
    p.roll = rnd(6) + 1;
    (p.rolls = p.rolls || []).push(p.roll);
  }

  // משווים את כל ההטלות לפי הסדר: קודם הראשונה, ובתיקו - ההטלה החוזרת
  function cmpRolls(a, b) {
    const x = a.rolls || [], y = b.rolls || [];
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (y[i] || 0) - (x[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  /* שחקנים שיצא להם בדיוק אותו דבר */
  function tiedPlayers() {
    return S.players.filter(p => S.players.some(q => q !== p && cmpRolls(p, q) === 0));
  }

  /* כשכולם מוכנים - הקוביות של כולם מוטלות יחד, וכולם רואים אותן מתגלגלות */
  function checkReady() {
    if (S.players.some(p => !p.ready)) return commit();
    S.tied = null;
    S.players.forEach(roll);
    S.phase = "dice";
    schedule(MS.dice, afterDice);
    commit({kind: "dice"});
  }

  function afterDice() {
    const tied = tiedPlayers();
    if (tied.length) {
      S.tied = tied.map(p => p.pid);
      log(`תיקו בין ${tied.map(p => p.name).join(", ")} - מטילים שוב`);
      return showMessage("תיקו! 🎲", `ל${tied.map(p => p.name).join(" ול")} יצא אותו מספר. הם מטילים שוב.`, "reroll", MS.order);
    }
    S.tied = null;
    S.order = S.players.slice()
      .sort(cmpRolls)
      .map(p => p.pid);
    S.pos = 0;
    const names = S.order.map(pid => P(pid).name).join(" ← ");
    log(`סדר התורות: ${names}`);
    const next = S.rollKind === "starterRoll" ? "starterPick" : "turns";
    showMessage("סדר התורות", names, next, MS.order);
  }

  function startStarterPick() {
    S.phase = "starterPick";
    stopTimer();
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
    S.wild = makeWild(id);
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
    stopTimer();
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
    trimNums(S.wild);
    const text = `${p.name}: ${POKEMON[mon.id].he} תוקף - ${dmg} (${multText(mult)})`;
    log(text);
    S.phase = "anim";
    S.action = text;
    schedule(MS.anim, afterAnim);
    commit({kind: "damage", dmg, mult, pid: p.pid, index: monIndex, id: mon.id});
  }

  function afterAnim() {
    if (S.wild.hp <= 0) wildFainted();
    else nextTurn();
  }

  /* מושכים בידית: המספרים רצים לפי הסדר עד שהשחקן לוחץ "עצור".
     המכונה מאטה ועוצרת. מספר שגוי נמחק לתמיד.
     כשנשאר רק מספר אחד - המכונה עוצרת עליו לבד והפוקימון נתפס. */
  function startCatch() {
    const w = S.wild;
    if (!w.nums) { const fresh = makeWild(w.id); w.nums = fresh.nums; w.secret = fresh.secret; trimNums(w); }
    w.nums.sort((a, b) => a - b);
    S.wheel = {nums: w.nums.slice(), spinning: true, pid: current().pid};
    S.phase = "wheel";
    S.action = `${current().name} מנסה לתפוס את ${POKEMON[S.wild.id].he}`;
    stopTimer();
    commit({kind: "spin"});
    if (w.nums.length === 1) stopSpin(10);
  }

  /* at = המקום בגלגלת שעליו היא תיעצר (סופרים מההתחלה, בסיבובים) */
  function stopSpin(at) {
    const wh = S.wheel, w = S.wild;
    if (!wh || !wh.spinning || !w) return;
    at = Math.max(0, Math.floor(Number(at) || 0));
    const nums = wh.nums;
    const land = nums[at % nums.length];
    const success = land === w.secret;
    if (!success) w.nums = w.nums.filter(n => n !== land);
    S.wheel = {nums, spinning: false, at, land, success, auto: nums.length === 1, left: w.nums.length, pid: wh.pid};
    schedule(MS.wheel, afterWheel);
    commit({kind: "wheel"});
  }

  function afterWheel() {
    const w = S.wheel;
    S.wheel = null;
    if (w.success && P(w.pid)) return caught(P(w.pid));
    if (P(w.pid)) log(`${P(w.pid).name} עצר על ${w.land} - לא המספר הנכון`);
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

  function resolveWild(title, text, fx) {
    S.resolved++;
    if (S.resolved % CONFIG.clinicEvery === 0) {
      healAll();
      log("ביקור במרפאה - כולם מתרפאים");
      text += ` אחרי ${CONFIG.clinicEvery} פוקימונים פראיים הולכים למרפאה: כל הפוקימונים חוזרים לחיים מלאים. 🏥`;
    }
    showMessage(title, text, "drawWild", MS.msg, fx);
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
    const fxHits = [];
    for (let k = 0; k < hits && anyAlive(); k++) {
      const targets = [];
      S.players.forEach(p => p.team.forEach(m => m.hp > 0 && targets.push({p, m})));
      const {p, m} = targets[rnd(targets.length)];
      const {mult, dmg} = damageOf(S.wild.id, m.id);
      m.hp = Math.max(0, m.hp - dmg);
      fxHits.push({pid: p.pid, id: m.id, index: p.team.indexOf(m), dmg, mult, ko: m.hp === 0});
      const ko = m.hp === 0 ? " - התעלף! 💫" : "";
      lines.push(`תוקף את ${POKEMON[m.id].he} של ${p.name}: ‎-${dmg} (${multText(mult)})${ko}`);
      log(`${name} ${lines[lines.length - 1]}`);
    }
    const title = `תור של ${name}`;
    const fx = {kind: "wildAttack", hits: fxHits};
    if (!anyAlive()) return showMessage(title, lines.join("\n"), "lose", MS.msg, fx);
    // הפוקימון אף פעם לא בורח: נשאר בזירה עד שתופסים אותו או שהוא מתעלף
    return showMessage(title, lines.join("\n") + `\n\n${name} נשאר בזירה. סבב חדש מתחיל.`, "roundRoll", MS.msg, fx);
  }

  function endGame(win) {
    S.phase = "end";
    S.win = win;
    S.message = null;
    log(win ? "ניצחתם את ההרפתקה!" : "הפסדתם את ההרפתקה");
    schedule(MS.end, newGame);
    commit();
  }

  function showMessage(title, text, next, ms = MS.msg, fx) {
    S.message = {title, text, next};
    S.phase = "message";
    schedule(ms, continueMessage);
    commit(fx);
  }

  /* רק מי שהיה בתיקו מטיל שוב */
  function reroll() {
    const ids = (S.tied || []).filter(pid => P(pid));
    S.players.filter(p => ids.includes(p.pid)).forEach(roll);
    S.phase = "dice";
    schedule(MS.dice, afterDice);
    commit({kind: "dice", pids: ids});
  }

  const NEXT = {
    reroll,
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
      case "ready":
      case "roll":
        if ((S.phase === "starterRoll" || S.phase === "roundRoll") && !p.ready) {
          p.ready = true;
          checkReady();
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
      case "stop":
        if (S.phase === "wheel" && mine) stopSpin(a.at);
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
        return checkReady();
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
        if (wasCurrent && S.wheel && S.wheel.spinning) { S.wheel = null; return skipDead(); }
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
      case "roundRoll": stopTimer(); break;
      case "dice": schedule(MS.dice, afterDice); break;
      case "starterPick": startStarterPick(); return;
      case "turn": skipDead(); return;
      case "anim": schedule(MS.anim, afterAnim); break;
      case "wheel": if (S.wheel && S.wheel.spinning) stopTimer(); else schedule(MS.wheel, afterWheel); break;
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
