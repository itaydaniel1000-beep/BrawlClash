/* ===== העולם: רשת =====
   כל ההודעות עוברות דרך שרת הודעות ציבורי (MQTT), ולא בחיבור ישיר בין
   הטלפונים - חיבור ישיר נחסם הרבה פעמים ברשתות ביתיות וסלולריות.

   כל שחקן מפרסם "נוכחות" (שם, באיזה שרת, מתי נכנס). כך כולם מכירים את כל
   השחקנים בכל השרתים. בכל שרת יש עד 12 שחקנים, והמארח שלו הוא מי שנכנס
   ראשון - כולם מחשבים את זה מאותה רשימה ומסכימים. המארח מנהל את הקרבות
   והטריידים בין שחקנים בשרת, כמו קודם. המיקום של כל שחקן נשלח ישר לכל מי
   שבאותו שרת. אם המארח יוצא, הבא בתור הופך למארח. */

const WNet = (() => {
  const params = new URLSearchParams(location.search);
  // ?w=שם פותח עולם נפרד (לבדיקות או לחברים בלבד)
  const W = (params.get("w") || "").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "main";
  const ROOT = "pkmn-itay-v2/" + W;
  // שרתי הודעות ציבוריים - אם הראשון לא עונה, עוברים לבא. ?mqtt= לבדיקות
  const BROKERS = params.get("mqtt") ? [params.get("mqtt")]
    : ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt", "wss://test.mosquitto.org:8081/mqtt"];
  const MAX = 12;
  const STALE = 75000;        // נוכחות שלא התעדכנה 75 שניות - השחקן כבר לא כאן

  const myPid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  let me = {name: "", x: 0, z: 0, r: 0, mv: 0, lead: null, busy: false};
  let role = null, worldNo = 0, hostPid = null, joinedAt = 0, joined = false;
  let client = null;
  let presence = {};          // כל השחקנים בכל השרתים: pid -> {pid, name, w, joined, seen}
  let pos = {};               // מי שבשרת שלי: pid -> מיקום
  let players = {};           // מי שבשרת שלי, כולל עצמי
  let battles = {};           // אצל המארח: הקרבות בין שחקנים
  let trades = {};            // אצל המארח / אצל מי שמנהל טרייד: הטריידים הפתוחים
  let tick = null, stopped = true, lastPosSent = 0, lastPosJson = "", lastPresence = 0;
  let stage = "לא התחיל", tries = 0, brokerUrl = "";   // באיזה שלב החיבור - בשביל השורה בחלון הטרייד
  let ui = {onTradeReq() {}, onTradeAns() {}, onTrade() {}, onTradeDone() {}, onTradeEnd() {}, onPlayers() {}, onChallenge() {}, onAnswer() {}, onBattle() {}, onStatus() {}, onLost() {}, onGot() {}, onGave() {}, onGotCoins() {}};
  const toastCoins = (n, to) => ui.onGaveCoins && ui.onGaveCoins(n, to);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const T = {
    presence: pid => `${ROOT}/p/${pid}`,
    inbox: pid => `${ROOT}/u/${pid}`,
    world: k => `${ROOT}/w${k}`
  };
  function pub(topic, obj, opts) {
    if (!client || !client.connected) return;
    try { client.publish(topic, obj === null ? "" : JSON.stringify(obj), opts || {qos: 0}); } catch (e) {}
  }

  /* ---------- חיבור ---------- */

  function connectBroker(url) {
    return new Promise(resolve => {
      let c;
      try {
        c = mqtt.connect(url, {
          clientId: "pk_" + myPid, keepalive: 20, clean: true, reconnectPeriod: 3000, connectTimeout: 8000,
          will: {topic: T.presence(myPid), payload: "", retain: true, qos: 1}
        });
      } catch (e) { return resolve(null); }
      const t = setTimeout(() => { try { c.end(true); } catch (e) {} resolve(null); }, 9000);
      c.once("connect", () => { clearTimeout(t); resolve(c); });
    });
  }

  async function join(name) {
    me.name = name;
    stopped = false;
    ui.onStatus("connecting");
    while (!stopped && !client) {
      tries++;
      if (typeof mqtt === "undefined") { stage = "ספריית החיבור לא נטענה (unpkg.com חסום?)"; await wait(3000); continue; }
      for (const url of BROKERS) {
        stage = `מתחבר לשרת ההודעות (${url.split("/")[2].split(":")[0]}, ניסיון ${tries})`;
        client = await connectBroker(url);
        if (client) { brokerUrl = url; break; }
      }
      if (!client) { stage = `לא מצליח להגיע לשרתי ההודעות (ניסיון ${tries}) - אולי הרשת חוסמת`; await wait(3000); }
    }
    if (stopped) return;
    client.on("message", onMessage);
    // אחרי נפילה וחיבור מחדש: נרשמים שוב ומפרסמים נוכחות
    client.on("connect", () => { subscribe(); if (joined) announce(); });
    client.on("offline", () => ui.onStatus("reconnecting"));
    subscribe();
    stage = "מחובר לשרת ההודעות, אוסף את רשימת השחקנים";
    await wait(1800);   // אוספים את הנוכחות של כל מי שכבר בפנים
    if (stopped) return;
    prune();
    // שם שכבר מחובר (אולי מהכניסה הקודמת, שעוד לא התנקתה) - מחכים קצת ובודקים שוב
    const taken = () => Object.values(presence).some(p => p.pid !== myPid && p.name === name);
    for (let k = 0; k < 4 && taken() && !stopped; k++) { stage = "השם שלך עוד רשום מהכניסה הקודמת - מחכה שיתפנה"; await wait(12000); prune(); }
    if (stopped) return;
    if (taken() || (Admin.reserved(name) && !Admin.unlocked())) {
      stage = "השם כבר מחובר ממכשיר אחר";
      stopped = true;
      ui.onStatus("nametaken");
      return;
    }
    // השרת הראשון שיש בו מקום
    const count = {};
    Object.values(presence).forEach(p => { count[p.w] = (count[p.w] || 0) + 1; });
    let k = 0;
    while ((count[k] || 0) >= MAX) k++;
    worldNo = k;
    joinedAt = Date.now();
    joined = true;
    client.subscribe(T.world(worldNo) + "/#");
    announce();
    recompute();
    startTick();
    stage = "מחובר";
    ui.onStatus("online");
  }

  function subscribe() {
    client.subscribe([T.presence("+"), T.inbox(myPid)]);
    if (joined) client.subscribe(T.world(worldNo) + "/#");
  }

  function announce() {
    lastPresence = Date.now();
    pub(T.presence(myPid), {pid: myPid, name: me.name, w: worldNo, joined: joinedAt, seen: Date.now()}, {qos: 1, retain: true});
  }

  function onMessage(topic, buf) {
    const raw = buf && buf.toString();
    const parts = topic.slice(ROOT.length + 1).split("/");
    if (parts[0] === "p") {
      const pid = parts[1];
      if (!raw) { delete presence[pid]; delete pos[pid]; return recompute(); }
      try { const p = JSON.parse(raw); if (p && p.pid === pid) presence[pid] = p; } catch (e) {}
      return recompute();
    }
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m) return;
    if (parts[0] === "u") return deliver(m);
    if (parts[0] === "w" + worldNo && parts[1] === "pos" && m.pid && m.pid !== myPid) {
      pos[m.pid] = m.p || {};
      return;
    }
  }

  // הודעה שהגיעה אליי: למארח (h), טרייד משרת אחר (x), או רגילה
  function deliver(m) {
    const from = m.from;
    if (m.h) {
      if (role === "host") return hostHandle(from, m);
      if (hostPid && hostPid !== myPid) pub(T.inbox(hostPid), m);   // עוד לא כולם יודעים מי המארח
      return;
    }
    if (m.t === "x") return xIncoming(m.m);
    clientData(m);
  }

  // נוכחות ישנה (שחקן שנעלם בלי להיפרד)
  function prune() {
    const now = Date.now();
    for (const pid in presence) if (pid !== myPid && now - (presence[pid].seen || 0) > STALE) { delete presence[pid]; delete pos[pid]; }
  }

  /* מחשבים מחדש: מי בשרת שלי, מי המארח, ומי יצא */
  function recompute() {
    if (!joined) return;
    prune();
    presence[myPid] = {pid: myPid, name: me.name, w: worldNo, joined: joinedAt, seen: Date.now()};
    const mine = Object.values(presence).filter(p => p.w === worldNo)
      .sort((a, b) => (a.joined - b.joined) || (a.pid < b.pid ? -1 : 1));
    const before = players;
    players = {};
    mine.forEach(p => { players[p.pid] = {x: 0, z: 6, r: 0, mv: 0, lead: null, busy: false, ...(p.pid === myPid ? me : pos[p.pid]), pid: p.pid, name: p.name}; });
    // מי שיצא מהשרת
    for (const pid in before) if (!players[pid] && role === "host") dropPlayer(pid);
    // טרייד עם שחקן משרת אחר שנעלם
    for (const pid in xNames) if (!presence[pid.slice(2)]) xGone(pid.slice(2));
    const newHost = mine.length ? mine[0].pid : myPid;
    if (newHost !== hostPid) {
      const had = hostPid;
      hostPid = newHost;
      role = newHost === myPid ? "host" : "client";
      if (had) {
        // המארח התחלף: קרבות וטריידים שהוא ניהל נגמרו
        battles = {};
        ui.onBattle(null);
        for (const tid in tradeRoutes) if (tradeRoutes[tid] === send) { delete tradeRoutes[tid]; ui.onTradeEnd(tid, "המארח התחלף"); }
      }
    }
  }

  /* ---------- מיקום ---------- */

  function startTick() {
    clearInterval(tick);
    tick = setInterval(() => {
      const now = Date.now();
      // המיקום שלי: כשמשהו השתנה, ולפחות פעם בשנייה
      const j = JSON.stringify(me);
      if (j !== lastPosJson || now - lastPosSent > 1000) {
        lastPosJson = j;
        lastPosSent = now;
        pub(T.world(worldNo) + "/pos", {pid: myPid, p: me});
      }
      if (now - lastPresence > 15000) announce();
      recompute();
      ui.onPlayers(players);
    }, 150);
  }

  function setMe(p) { Object.assign(me, p); }

  /* ---------- הודעות ---------- */

  function send(msg) {
    if (role === "host") hostHandle(myPid, msg);
    else if (hostPid) pub(T.inbox(hostPid), {...msg, h: 1, from: myPid});
  }

  function toPid(pid, msg) {
    if (pid === myPid) return clientData(msg);
    pub(T.inbox(pid), {...msg, from: myPid});
  }

  function hostHandle(pid, d) {
    switch (d.t) {
      case "chal":
        if (players[d.to] && !busy(d.to) && !busy(pid)) toPid(d.to, {t: "chal", from: pid, name: (players[pid] || {}).name});
        else toPid(pid, {t: "ans", from: d.to, ok: false, busy: true});
        break;
      case "ans":
        if (!d.ok) { toPid(d.to, {t: "ans", from: pid, ok: false}); break; }
        if (busy(d.to) || busy(pid)) { toPid(d.to, {t: "ans", from: pid, ok: false, busy: true}); break; }
        startBattle(d.to, pid);
        break;
      case "party":
        battleParty(pid, d.bid, d.party);
        break;
      case "bact":
        battleAct(pid, d.bid, d.act);
        break;
      case "bquit":
        battleQuit(pid, d.bid);
        break;
      case "treq":
        if (!players[d.to] || d.to === pid) break;
        if (busy(d.to) || busy(pid)) toPid(pid, {t: "tans", ok: false, busy: true, name: players[d.to].name});
        else toPid(d.to, {t: "treq", from: pid, name: (players[pid] || {}).name});
        break;
      case "tans":
        if (!players[d.to]) break;
        if (!d.ok) { toPid(d.to, {t: "tans", ok: false, name: (players[pid] || {}).name}); break; }
        if (busy(d.to) || busy(pid)) { toPid(d.to, {t: "tans", ok: false, busy: true, name: (players[pid] || {}).name}); break; }
        startTrade(d.to, pid, toPid);
        break;
      case "toffer": case "tready": case "tok": case "tcancel": tradeHandle(pid, d); break;
      case "badm":
        battleAdmin(pid, d);
        break;
      case "coins": {
        // 👑 כסף במתנה - רק מהשמות השמורים
        const from = players[pid];
        const n = Math.max(1, Math.min(1000000, d.n | 0));
        if (!from || !Admin.reserved(from.name) || !players[d.to]) break;
        toPid(d.to, {t: "gotCoins", n, from: from.name});
        toPid(pid, {t: "gaveCoins", n, to: players[d.to].name});
        break;
      }
      case "gift": {
        // 👑 מתנה מחוץ לקרב - רק מהשמות השמורים
        const from = players[pid];
        if (!from || !Admin.reserved(from.name) || !players[d.to] || !POKEMON[d.id]) break;
        const m = makeFormMon(d.id, Math.max(1, Math.min(100, d.lvl | 0)), d.form);
        toPid(d.to, {t: "got", mon: {id: m.id, lvl: m.lvl, moves: m.moves}, from: from.name});
        toPid(pid, {t: "gave", to: players[d.to].name, id: m.id, lvl: m.lvl});
        break;
      }
    }
  }

  function clientData(d) {
    switch (d.t) {
      case "world": ui.onPlayers(d.players); break;
      case "chal": ui.onChallenge(d.from, d.name); break;
      case "ans": ui.onAnswer(d.from, d.ok, d.busy); break;
      case "bstate": ui.onBattle(d.st); break;
      case "lost": ui.onLost(d.uid); break;
      case "got": ui.onGot(d.mon, d.from); break;
      case "gave": ui.onGave(d.to, d.id, d.lvl); break;
      case "gotCoins": ui.onGotCoins(d.n, d.from); break;
      case "gaveCoins": toastCoins(d.n, d.to); break;
      case "treq": ui.onTradeReq(d.from, d.name); break;
      case "tans": ui.onTradeAns(d.ok, d.busy, d.name); break;
      case "tstate": if (!tradeRoutes[d.st.tid]) tradeRoutes[d.st.tid] = send; ui.onTrade(d.st); break;
      case "tdone": delete tradeRoutes[d.tid]; ui.onTradeDone(d); break;
      case "tend": delete tradeRoutes[d.tid]; ui.onTradeEnd(d.tid, d.by); break;
    }
  }

  function dropPlayer(pid) {
    delete players[pid];
    for (const bid in battles) if (battles[bid].a.pid === pid || battles[bid].b.pid === pid) battleQuit(pid, bid);
    for (const tid in trades) if (trades[tid].a.pid === pid || trades[tid].b.pid === pid) tradeEnd(tid, "החיבור");
  }

  const busy = pid => Object.values(battles).some(b => !b.over && (b.a.pid === pid || b.b.pid === pid))
    || Object.values(trades).some(t => t.a.pid === pid || t.b.pid === pid);

  /* ---------- טרייד (רץ אצל המארח) ----------
     כל אחד שם פוקימונים ומטבעות. כל שינוי מבטל את ה"מוכן" של שניהם.
     שניהם מוכנים ← שניהם מאשרים ← 3 שניות ← מוחלפים. */
  // out(pid, msg) שולח לשחקן: אצל המארח toPid, בטרייד ישיר - בחיבור הישיר
  function startTrade(aPid, bPid, out, names) {
    const tid = Math.random().toString(36).slice(2, 9);
    const side = pid => ({pid, name: (names && names[pid]) || (players[pid] || {}).name, mons: [], coins: 0, total: 1, ready: false, ok: false});
    trades[tid] = {tid, a: side(aPid), b: side(bPid), go: 0, timer: null, out};
    pushTrade(trades[tid]);
    return tid;
  }

  function tradeHandle(pid, d) {
    if (d.t === "toffer") tradeOffer(pid, d);
    else if (d.t === "tready") tradeReady(pid, d);
    else if (d.t === "tok") tradeOk(pid, d);
    else if (d.t === "tcancel") { const t = trades[d.tid], s = t && tSide(t, pid); if (s) tradeEnd(d.tid, s.name); }
  }

  const tSide = (t, pid) => t.a.pid === pid ? t.a : t.b.pid === pid ? t.b : null;
  const tOther = (t, s) => s === t.a ? t.b : t.a;
  function tReset(t) {
    t.a.ready = t.b.ready = t.a.ok = t.b.ok = false;
    clearTimeout(t.timer);
    t.go = 0;
  }
  // אי אפשר לתת את כל הפוקימונים שלך בלי לקבל אף אחד
  const tEmpty = (t, s) => s.mons.length >= s.total && !tOther(t, s).mons.length;

  function tradeOffer(pid, d) {
    const t = trades[d.tid], s = t && tSide(t, pid);
    if (!s) return;
    s.mons = (d.mons || []).slice(0, 12).filter(m => m && POKEMON[m.id]).map(m => ({
      uid: String(m.uid || ""), id: m.id, lvl: Math.max(1, Math.min(100, m.lvl | 0)), xp: Math.max(0, m.xp | 0),
      moves: (m.moves || []).filter(k => WMOVES[k]).slice(0, 4), hp: Math.max(0, m.hp | 0),
      ...(m.perm ? {perm: true, base: baseOf(m.id), dmax: POKEMON[m.id].form === "gmax" ? PERM_DMAX : 0} : {})
    }));
    s.coins = Math.max(0, Math.min(10000000, Math.floor(Number(d.coins) || 0)));
    s.total = Math.max(1, d.total | 0);
    tReset(t);
    pushTrade(t);
  }

  function tradeReady(pid, d) {
    const t = trades[d.tid], s = t && tSide(t, pid);
    if (!s || t.go) return;
    if (d.on && tEmpty(t, s)) return pushTrade(t);
    s.ready = !!d.on;
    if (!s.ready) t.a.ok = t.b.ok = false;
    pushTrade(t);
  }

  function tradeOk(pid, d) {
    const t = trades[d.tid], s = t && tSide(t, pid);
    if (!s || !t.a.ready || !t.b.ready || t.go) return;
    s.ok = true;
    if (t.a.ok && t.b.ok) {
      t.go = Date.now() + 3000;
      t.timer = setTimeout(() => finishTrade(t.tid), 3000);
    }
    pushTrade(t);
  }

  function finishTrade(tid) {
    const t = trades[tid];
    if (!t || !t.a.ok || !t.b.ok) return;
    delete trades[tid];
    for (const s of [t.a, t.b]) {
      const o = tOther(t, s);
      t.out(s.pid, {t: "tdone", tid, give: s.mons.map(m => m.uid), coinsOut: s.coins, get: o.mons, coinsIn: o.coins, from: o.name});
    }
  }

  function tradeEnd(tid, by) {
    const t = trades[tid];
    if (!t) return;
    clearTimeout(t.timer);
    delete trades[tid];
    [t.a, t.b].forEach(s => t.out(s.pid, {t: "tend", tid, by}));
  }

  // you = איך מי שמקבל את המצב מופיע בטרייד (בטרייד ישיר זה לא תמיד myPid שלו)
  function pushTrade(t) {
    const base = {tid: t.tid, go: t.go ? Math.max(0, t.go - Date.now()) : 0,
      sides: [t.a, t.b].map(s => ({pid: s.pid, name: s.name, mons: s.mons, coins: s.coins, ready: s.ready, ok: s.ok}))};
    t.out(t.a.pid, {t: "tstate", st: {...base, you: t.a.pid}});
    t.out(t.b.pid, {t: "tstate", st: {...base, you: t.b.pid}});
  }


  /* ---------- טרייד עם שחקן משרת אחר ----------
     שולחים לו ישר לתיבה שלו. מי שמקבל את הבקשה מנהל את הטרייד, עם אותם כללים. */
  let tradeRoutes = {}, xNames = {};
  const routeOf = tid => tradeRoutes[tid] || send;

  function relaySend(to, msg) {
    if (to === myPid) return xIncoming({...msg, from: myPid});
    pub(T.inbox(to), {t: "x", m: {...msg, from: myPid}, from: myPid});
  }

  function xIncoming(m) {
    if (!m || !m.from) return;
    const xid = "x:" + m.from;
    switch (m.t) {
      case "xtreq": xNames[xid] = String(m.name || "שחקן").slice(0, 20); ui.onTradeReq(xid, xNames[xid]); break;
      case "tans": ui.onTradeAns(false, false, m.name); break;
      case "tstate": { const r = msg => relaySend(m.from, msg); r.to = m.from; tradeRoutes[m.st.tid] = r; xNames[xid] = xNames[xid] || "שחקן"; clientData(m); break; }
      case "tdone": case "tend": clientData(m); break;
      case "toffer": case "tready": case "tok": case "tcancel": tradeHandle(xid, m); break;
    }
  }

  // שחקן משרת אחר נעלם באמצע טרייד
  function xGone(pid) {
    const xid = "x:" + pid;
    delete xNames[xid];
    for (const tid in trades) if (trades[tid].a.pid === xid || trades[tid].b.pid === xid) tradeEnd(tid, "החיבור");
    for (const tid in tradeRoutes) if (tradeRoutes[tid].to === pid) { delete tradeRoutes[tid]; ui.onTradeEnd(tid, "החיבור"); }
  }

  const xOut = (pid, msg) => pid === myPid ? clientData(msg) : relaySend(String(pid).slice(2), msg);

  function tradeAnswer(to, ok) {
    if (!String(to).startsWith("x:")) return send({t: "tans", to, ok});
    if (!ok) return relaySend(String(to).slice(2), {t: "tans", ok: false, name: me.name});
    const tid = startTrade(to, myPid, xOut, {[to]: xNames[to], [myPid]: me.name});
    tradeRoutes[tid] = m => tradeHandle(myPid, m);
  }

  /* בקשת טרייד לשחקן משרת אחר (pid מהרשימה של כל השרתים) */
  function tradeFar(pid) {
    relaySend(pid, {t: "xtreq", name: me.name});
  }

  /* ---------- קרב בין שחקנים (רץ אצל המארח) ---------- */

  function startBattle(aPid, bPid) {
    const bid = Math.random().toString(36).slice(2, 9);
    battles[bid] = {
      bid, turn: 0, over: null, log: [],
      a: {pid: aPid, name: (players[aPid] || {}).name, party: null, active: 0, act: null, need: false},
      b: {pid: bPid, name: (players[bPid] || {}).name, party: null, active: 0, act: null, need: false}
    };
    // כל אחד שולח את הצוות שלו. בקרב כולם מתחילים עם חיים מלאים
    [aPid, bPid].forEach(p => toPid(p, {t: "bstate", st: {bid, phase: "party"}}));
  }

  function sideOf(b, pid) { return b.a.pid === pid ? b.a : b.b.pid === pid ? b.b : null; }

  function battleParty(pid, bid, party) {
    const b = battles[bid];
    const s = b && sideOf(b, pid);
    if (!s || s.party) return;
    s.party = (party || []).slice(0, W_MAX_PARTY).map(m => ({uid: m.uid, id: m.id, lvl: Math.min(100, m.lvl | 0), moves: (m.moves || []).filter(k => WMOVES[k]).slice(0, 4), hp: 0,
      ...(m.perm && POKEMON[m.id] && POKEMON[m.id].form ? {perm: true, base: baseOf(m.id), dmax: POKEMON[m.id].form === "gmax" ? PERM_DMAX : 0} : {})}))
      .filter(m => POKEMON[m.id] && m.moves.length);
    s.party.forEach(m => { m.hp = wMaxHp(m); });
    if (!s.party.length) s.party = [makeWorldMon("pikachu", 5)];
    if (b.a.party && b.b.party) { b.turn = 1; pushBattle(b); }
  }

  function battleAct(pid, bid, act) {
    const b = battles[bid];
    const s = b && sideOf(b, pid);
    if (!s || b.over || !b.turn) return;
    // פעולה לא חוקית: שולחים שוב את המצב, כדי שאף אחד לא יישאר תקוע על "מחכים"
    const refuse = () => toPid(pid, {t: "bstate", st: battleState(b)});
    if (s.act) return refuse();
    if (act.kind === "switch") {
      const m = s.party[act.i];
      if (!m || m.hp <= 0 || act.i === s.active) return refuse();
    } else if (act.kind === "move") {
      if (s.need || !s.party[s.active].moves[act.i]) return refuse();
    } else return refuse();
    // אחרי התעלפות: רק החלפה, והיא קורית מיד בלי תור של היריב
    if (s.need) {
      if (act.kind !== "switch") return;
      s.active = act.i;
      s.need = false;
      b.log = [`${s.name} שולח את ${POKEMON[s.party[s.active].id].he}!`];
      pushBattle(b);
      return;
    }
    s.act = act;
    if (b.a.act && b.b.act) resolveTurn(b);
    else pushBattle(b);
  }

  function resolveTurn(b) {
    const log = [];
    const fx = [];
    // החלפות קודם
    for (const s of [b.a, b.b]) {
      if (s.act.kind === "switch") {
        wEndDmax(s.party[s.active]);   // דיינמקס נגמר כשמחליפים
        s.active = s.act.i;
        log.push(`${s.name} מחליף ל${POKEMON[s.party[s.active].id].he}`);
      }
    }
    const A = b.a, B = b.b;
    const mvA = A.act.kind === "move" ? A.party[A.active].moves[A.act.i] : null;
    const mvB = B.act.kind === "move" ? B.party[B.active].moves[B.act.i] : null;
    const order = firstSide(A.party[A.active], mvA, B.party[B.active], mvB) === "a" ? [[A, B, mvA], [B, A, mvB]] : [[B, A, mvB], [A, B, mvA]];
    for (const [att, def, mv] of order) {
      if (!mv) continue;
      const am = att.party[att.active], dm = def.party[def.active];
      if (am.hp <= 0 || dm.hp <= 0) continue;
      const r = wDamage(am, dm, mv);
      // 👑 פי 2 התקפה / פי 2 הגנה
      if (att.boost && att.boost.atk) r.dmg *= 2;
      if (def.boost && def.boost.def) r.dmg = Math.ceil(r.dmg / 2);
      dm.hp = Math.max(0, dm.hp - r.dmg);
      fx.push({by: att.pid, move: mv, dmg: r.dmg, hit: r.hit, mult: r.mult});
      const mvName = am.dmax ? maxMove(am.id, mv)[0] : WMOVES[mv][0];
      if (dm.hp <= 0) wEndDmax(dm);
      log.push(`${POKEMON[am.id].he} של ${att.name} משתמש ב${mvName}` + (r.hit ? ` - ${r.dmg}${r.mult > 1 ? " (יעיל מאוד!)" : r.mult < 1 ? " (לא יעיל)" : ""}` : " - פספס!"));
      if (dm.hp <= 0) log.push(`${POKEMON[dm.id].he} של ${def.name} התעלף!`);
    }
    // דיינמקס: עוד תור עבר
    for (const s of [A, B]) {
      const m = s.party[s.active];
      if (s.act.kind === "move" && m.dmax && !m.perm && m.hp > 0) {
        m.dmax--;
        if (!m.dmax) { const name = POKEMON[m.id].he; wEndDmax(m); log.push(`${name} של ${s.name} חזר לגודל רגיל`); }
      }
    }
    A.act = B.act = null;
    for (const s of [A, B]) {
      if (s.party[s.active].hp <= 0) {
        if (firstAlive(s.party) < 0) { b.over = (s === A ? B : A).pid; log.push(`${(s === A ? B : A).name} ניצח!`); }
        else s.need = true;
      }
    }
    b.turn++;
    b.log = log;
    pushBattle(b, fx);
  }

  /* 👑 כוחות בקרב נגד שחקן - רק לשמות השמורים */
  function battleAdmin(pid, d) {
    const b = battles[d.bid];
    const s = b && sideOf(b, pid);
    if (!s || b.over || !s.party || !Admin.reserved(s.name)) return;
    const f = s === b.a ? b.b : b.a;
    if (d.op === "boost") { s.boost = {atk: !!(d.boost || {}).atk, def: !!(d.boost || {}).def}; return; }
    const fresh = (id, lvl, moves, form) => { const m = makeFormMon(id, Math.max(1, Math.min(100, lvl | 0)), form); if (moves && moves.length) m.moves = moves.slice(0, 4); return m; };
    if (d.op === "take" && f.party) {
      const m = f.party.splice(f.active, 1)[0];
      if (!m) return;
      const mine = fresh(m.id, m.lvl, m.moves);
      s.party.push(mine);
      toPid(f.pid, {t: "lost", uid: m.uid});
      toPid(pid, {t: "got", mon: {id: m.id, lvl: m.lvl, moves: m.moves}});
      b.log = [`👑 ${s.name} לקח את ${POKEMON[m.id].he} של ${f.name}!`];
      f.act = null;
      const next = firstAlive(f.party);
      if (next < 0) { b.over = s.pid; b.log.push(`${s.name} ניצח!`); }
      else { f.active = next; f.need = false; }
      return pushBattle(b);
    }
    if ((d.op === "create" || d.op === "give") && POKEMON[d.id]) {
      const to = d.op === "give" ? f : s;
      if (!to.party) return;
      const m = fresh(d.id, d.lvl, null, d.form);
      to.party.push(m);
      toPid(to.pid, {t: "got", mon: {id: m.id, lvl: m.lvl, moves: m.moves}});
      b.log = [d.op === "give" ? `👑 ${s.name} נתן ל${f.name} את ${POKEMON[m.id].he}` : `👑 ${s.name} יצר את ${POKEMON[m.id].he}`];
      return pushBattle(b);
    }
  }

  function battleQuit(pid, bid) {
    const b = battles[bid];
    if (!b || b.over) return;
    const s = sideOf(b, pid);
    if (!s) return;
    b.over = (s === b.a ? b.b : b.a).pid;
    b.log = [`${s.name} יצא מהקרב`];
    pushBattle(b);
  }

  function battleState(b, fx) {
    return {
      bid: b.bid, phase: b.over ? "over" : "turn", turn: b.turn, over: b.over, log: b.log, fx: fx || null,
      sides: [b.a, b.b].map(s => ({pid: s.pid, name: s.name, active: s.active, need: s.need, ready: !!s.act, party: s.party}))
    };
  }

  function pushBattle(b, fx) {
    const st = battleState(b, fx);
    toPid(b.a.pid, {t: "bstate", st});
    toPid(b.b.pid, {t: "bstate", st});
    if (b.over) setTimeout(() => { delete battles[b.bid]; }, 30000);
  }

  function leave() {
    stopped = true;
    joined = false;
    clearInterval(tick);
    if (client) {
      try { client.publish(T.presence(myPid), "", {qos: 1, retain: true}); } catch (e) {}
      const c = client;
      setTimeout(() => { try { c.end(true); } catch (e) {} }, 300);
    }
    client = null;
    role = null;
  }

  window.addEventListener("pagehide", leave);

  // רשימת כל השחקנים בכל השרתים (לחיפוש בטרייד)
  const dirList = () => Object.values(presence).map(p => ({pid: p.pid, name: p.name, w: p.w, busy: !!(players[p.pid] && players[p.pid].busy)}));

  return {
    myPid, join, leave, setMe, send,
    setUI: h => Object.assign(ui, h),
    challenge: to => send({t: "chal", to}),
    answer: (to, ok) => send({t: "ans", to, ok}),
    sendParty: (bid, party) => send({t: "party", bid, party}),
    act: (bid, act) => send({t: "bact", bid, act}),
    quit: bid => send({t: "bquit", bid}),
    admin: (bid, d) => send({t: "badm", bid, ...d}),
    gift: (to, id, lvl, form) => send({t: "gift", to, id, lvl, form}),
    coins: (to, n) => send({t: "coins", to, n}),
    tradeReq: to => send({t: "treq", to}),
    tradeAns: tradeAnswer,
    tradeFar,
    dir: dirList,
    lobbyInfo: () => joined
      ? `שרת ${worldNo + 1} · ${role === "host" ? "אתה המארח" : "מחובר"} · רואים ${Object.keys(presence).length} שחקנים בכל השרתים`
      : `לא מחובר עדיין: ${stage}`,
    tradeOffer: (tid, mons, coins, total) => routeOf(tid)({t: "toffer", tid, mons, coins, total}),
    tradeReady: (tid, on) => routeOf(tid)({t: "tready", tid, on}),
    tradeOk: tid => routeOf(tid)({t: "tok", tid}),
    tradeCancel: tid => routeOf(tid)({t: "tcancel", tid}),
    world: () => worldNo,
    role: () => role
  };
})();
