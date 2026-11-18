/* ===== העולם: רשת =====
   כל מי שנכנס לעולם מגיע לאותו מקום: הראשון תופס את הכתובת world-0
   והופך למארח, וכל השאר מתחברים אליו. כשמתמלא (12) עוברים ל-world-1.

   המארח מעביר לכולם איפה כל אחד עומד, מעביר הזמנות לקרב, ומנהל את
   הקרבות בין שחקנים: שני השחקנים שולחים לו מה הם עושים בתור, והוא
   מחשב (עם wcore.js) ושולח לשניהם את התוצאה. ככה שניהם רואים אותו קרב.

   אם המארח יוצא, כולם מתחברים מחדש ומישהו אחר תופס את הכתובת. */

const WNet = (() => {
  // ?w=שם פותח עולם נפרד (לבדיקות או לחברים בלבד)
  const NS = "pokemon-world-itay-v1-" + ((new URLSearchParams(location.search).get("w") || "").replace(/[^a-z0-9]/gi, "").slice(0, 16) + (new URLSearchParams(location.search).get("w") ? "-" : ""));
  const MAX = 12;
  const ICE = {
    iceServers: [
      {urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]},
      {urls: "stun:stun.cloudflare.com:3478"},
      {urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject"},
      {urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject"},
      {urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject"}
    ]
  };
  const opts = () => ({config: ICE, debug: 0});

  const myPid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  let me = {name: "", x: 0, z: 0, r: 0, mv: 0, lead: null, busy: false};
  let role = null, hostPeer = null, clientPeer = null, hostConn = null, worldNo = 0;
  let conns = {};             // אצל המארח: pid -> חיבור
  let players = {};           // אצל המארח: כל השחקנים, כולל עצמו
  let battles = {};           // אצל המארח: הקרבות בין שחקנים
  let trades = {};            // אצל המארח: הטריידים שפתוחים עכשיו
  let tick = null, stopped = true, reconnecting = false;
  let ui = {onTradeReq() {}, onTradeAns() {}, onTrade() {}, onTradeDone() {}, onTradeEnd() {}, onPlayers() {}, onChallenge() {}, onAnswer() {}, onBattle() {}, onStatus() {}, onLost() {}, onGot() {}, onGave() {}, onGotCoins() {}};
  const toastCoins = (n, to) => ui.onGaveCoins && ui.onGaveCoins(n, to);

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function claim(id) {
    return new Promise((resolve, reject) => {
      const p = new Peer(NS + id, opts());
      const t = setTimeout(() => { p.destroy(); reject(new Error("timeout")); }, 12000);
      p.on("open", () => { clearTimeout(t); resolve(p); });
      p.on("error", e => { clearTimeout(t); p.destroy(); if (e.type === "unavailable-id") resolve(null); else reject(e); });
    });
  }

  function clientPeerReady() {
    if (clientPeer && clientPeer.open && !clientPeer.destroyed) return Promise.resolve(clientPeer);
    return new Promise((resolve, reject) => {
      const p = new Peer(undefined, opts());
      const t = setTimeout(() => reject(new Error("timeout")), 12000);
      p.on("open", () => { clearTimeout(t); clientPeer = p; resolve(p); });
      p.on("error", e => { if (!p.open) { clearTimeout(t); reject(e); } });
    });
  }

  async function connectTo(id) {
    const peer = await clientPeerReady();
    return new Promise(resolve => {
      let done = false;
      const conn = peer.connect(NS + id, {reliable: true});
      const finish = v => { if (done) return; done = true; clearTimeout(t); peer.off("error", onErr); if (!v) try { conn.close(); } catch (e) {} resolve(v); };
      const onErr = e => { if (e.type === "peer-unavailable" && String(e.message).includes(NS + id)) finish(null); };
      const t = setTimeout(() => finish(null), 8000);
      peer.on("error", onErr);
      conn.on("open", () => conn.send({t: "hi", pid: myPid, name: me.name, adm: Admin.unlocked()}));
      conn.on("data", function first(d) { conn.off("data", first); finish(d.t === "welcome" ? conn : (d.t === "full" || d.t === "nametaken" ? d.t : null)); });
    });
  }

  /* ---------- כניסה ---------- */

  async function join(name) {
    me.name = name;
    stopped = false;
    claimName();   // הכתובת האישית - כדי ששחקנים משרתים אחרים ימצאו אותי לטרייד
    for (let k = 0; k < 20 && !stopped; k++) {
      ui.onStatus("connecting");
      let peer = null;
      try { peer = await claim(`world-${k}`); } catch (e) { await wait(800); k--; continue; }
      if (peer) { becomeHost(peer, k); return; }
      const c = await connectTo(`world-${k}`);
      if (c === "full") continue;
      if (c === "nametaken") { stopped = true; ui.onStatus("nametaken"); return; }
      if (c) { becomeClient(c, k); return; }
      // הכתובת תפוסה אבל אף אחד לא עונה (מארח שנעלם) - מנסים שוב רגע אחר כך
      await wait(1500);
      k--;
    }
  }

  function becomeHost(peer, k) {
    role = "host";
    hostPeer = peer;
    worldNo = k;
    players = {[myPid]: {...me, pid: myPid}};
    peer.on("connection", conn => {
      conn.on("data", d => hostData(conn, d));
      conn.on("close", () => { if (conn.pid) dropPlayer(conn.pid); });
    });
    peer.on("disconnected", () => { try { peer.reconnect(); } catch (e) {} });
    startTick();
    ui.onStatus("online");
  }

  function becomeClient(conn, k) {
    role = "client";
    hostConn = conn;
    worldNo = k;
    conn.on("data", d => clientData(d));
    conn.on("close", () => { if (!stopped) rejoin(); });
    startTick();
    ui.onStatus("online");
  }

  async function rejoin() {
    if (reconnecting) return;
    reconnecting = true;
    role = null;
    hostConn = null;
    ui.onStatus("reconnecting");
    ui.onBattle(null);
    clearInterval(tick);
    await wait(500 + Math.random() * 1500);
    reconnecting = false;
    if (!stopped) join(me.name);
  }

  /* ---------- מיקום ---------- */

  function startTick() {
    clearInterval(tick);
    tick = setInterval(() => {
      if (role === "host") {
        players[myPid] = {...me, pid: myPid};
        const msg = {t: "world", players};
        for (const pid in conns) try { conns[pid].send(msg); } catch (e) {}
        ui.onPlayers(players);
      } else if (role === "client" && hostConn) {
        try { hostConn.send({t: "pos", p: me}); } catch (e) {}
      }
    }, 120);
  }

  function setMe(p) { Object.assign(me, p); }

  /* ---------- הודעות ---------- */

  function send(msg) {
    if (role === "host") hostHandle(myPid, msg);
    else if (hostConn) try { hostConn.send(msg); } catch (e) {}
  }

  function toPid(pid, msg) {
    if (pid === myPid) return clientData(msg);
    const c = conns[pid];
    if (c) try { c.send(msg); } catch (e) {}
  }

  function hostData(conn, d) {
    if (d.t === "hi") {
      if (Object.keys(players).length >= MAX) { conn.send({t: "full"}); return; }
      // שם שכבר יש בעולם, או שם שמור בלי הקוד
      if (Object.values(players).some(p => p.pid !== d.pid && p.name === d.name) || (Admin.reserved(d.name) && !d.adm)) { conn.send({t: "nametaken"}); return; }
      conn.pid = d.pid;
      conns[d.pid] = conn;
      players[d.pid] = {pid: d.pid, name: d.name, x: 0, z: 6, r: 0, mv: 0, lead: null, busy: false};
      conn.send({t: "welcome"});
      return;
    }
    if (conn.pid) hostHandle(conn.pid, d);
  }

  function hostHandle(pid, d) {
    switch (d.t) {
      case "pos":
        if (players[pid]) Object.assign(players[pid], d.p, {pid});
        break;
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
      case "tstate": ui.onTrade(d.st); break;
      case "tdone": delete tradeRoutes[d.tid]; ui.onTradeDone(d); break;
      case "tend": delete tradeRoutes[d.tid]; ui.onTradeEnd(d.tid, d.by); break;
    }
  }

  function dropPlayer(pid) {
    delete conns[pid];
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
     כל שחקן תופס גם כתובת אישית לפי השם שלו. כשמחפשים שם שלא נמצא בשרת
     שלך, מתחברים ישר לכתובת הזו - לא משנה באיזה שרת הוא. מי שמקבל את
     הבקשה מנהל את הטרייד, עם אותם כללים בדיוק. */
  let myPeer = null, xConns = {}, tradeRoutes = {};
  const nameKey = n => "u-" + [...new TextEncoder().encode(String(n).trim())].map(b => b.toString(16).padStart(2, "0")).join("");
  const routeOf = tid => tradeRoutes[tid] || send;

  async function claimName() {
    if (myPeer && !myPeer.destroyed) return;
    let p = null;
    try { p = await claim(nameKey(me.name)); } catch (e) { p = null; }
    if (!p) return;   // השם כבר מחובר ממקום אחר
    myPeer = p;
    p.on("connection", conn => {
      conn.on("data", d => xData(conn, d));
      conn.on("close", () => xClosed(conn));
    });
    p.on("disconnected", () => { try { p.reconnect(); } catch (e) {} });
  }

  const xOut = (pid, msg) => {
    if (pid === myPid) return clientData(msg);
    const c = xConns[pid];
    if (c) try { c.send(msg); } catch (e) {}
    if (c && (msg.t === "tdone" || msg.t === "tend")) setTimeout(() => { try { c.close(); } catch (e) {} delete xConns[pid]; }, 1500);
  };

  function xData(conn, d) {
    if (!d) return;
    if (d.t === "xtreq" && !conn.xid) {
      conn.xid = "x:" + Math.random().toString(36).slice(2, 10);
      conn.xname = String(d.name || "שחקן").slice(0, 20);
      xConns[conn.xid] = conn;
      ui.onTradeReq(conn.xid, conn.xname);
      return;
    }
    if (conn.xid && ["toffer", "tready", "tok", "tcancel"].includes(d.t)) tradeHandle(conn.xid, d);
  }

  function xClosed(conn) {
    if (!conn.xid) return;
    for (const tid in trades) if (trades[tid].a.pid === conn.xid || trades[tid].b.pid === conn.xid) tradeEnd(tid, "החיבור");
    delete xConns[conn.xid];
  }

  function tradeAnswer(to, ok) {
    if (!String(to).startsWith("x:")) return send({t: "tans", to, ok});
    const c = xConns[to];
    if (!c) return;
    if (!ok) {
      try { c.send({t: "tans", ok: false, name: me.name}); } catch (e) {}
      setTimeout(() => { try { c.close(); } catch (e) {} }, 800);
      delete xConns[to];
      return;
    }
    const tid = startTrade(to, myPid, xOut, {[to]: c.xname, [myPid]: me.name});
    tradeRoutes[tid] = m => tradeHandle(myPid, m);
  }

  /* מחפשים שחקן לפי שם מדויק בכל השרתים ושולחים לו בקשה */
  async function tradeByName(name) {
    name = String(name || "").trim();
    if (!name) return "notfound";
    if (name === me.name) return "self";
    let peer;
    try { peer = await clientPeerReady(); } catch (e) { return "error"; }
    const id = NS + nameKey(name);
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (done) return; done = true; clearTimeout(t); peer.off("error", onErr); resolve(v); };
      const conn = peer.connect(id, {reliable: true});
      const onErr = e => { if (e.type === "peer-unavailable" && String(e.message).includes(id)) { try { conn.close(); } catch (x) {} finish("notfound"); } };
      const t = setTimeout(() => { try { conn.close(); } catch (x) {} finish("notfound"); }, 8000);
      peer.on("error", onErr);
      conn.on("open", () => { conn.send({t: "xtreq", name: me.name}); finish("sent"); });
      conn.on("data", d => {
        if (!d) return;
        if (d.t === "tstate") { conn.tid = d.st.tid; tradeRoutes[d.st.tid] = m => { try { conn.send(m); } catch (e) {} }; }
        if (d.t === "tdone" || d.t === "tend") conn.tid = null;
        if (["tstate", "tdone", "tend", "tans"].includes(d.t)) clientData(d);
        if (d.t === "tans") setTimeout(() => { try { conn.close(); } catch (e) {} }, 500);
      });
      conn.on("close", () => { if (conn.tid) { const tid = conn.tid; conn.tid = null; delete tradeRoutes[tid]; ui.onTradeEnd(tid, "החיבור"); } });
    });
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
    clearInterval(tick);
    for (const pid in conns) try { conns[pid].close(); } catch (e) {}
    conns = {};
    try { hostConn && hostConn.close(); } catch (e) {}
    try { hostPeer && hostPeer.destroy(); } catch (e) {}
    try { clientPeer && clientPeer.destroy(); } catch (e) {}
    try { myPeer && myPeer.destroy(); } catch (e) {}
    hostPeer = clientPeer = hostConn = myPeer = null;
    role = null;
  }

  window.addEventListener("pagehide", leave);

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
    tradeByName,
    tradeOffer: (tid, mons, coins, total) => routeOf(tid)({t: "toffer", tid, mons, coins, total}),
    tradeReady: (tid, on) => routeOf(tid)({t: "tready", tid, on}),
    tradeOk: tid => routeOf(tid)({t: "tok", tid}),
    tradeCancel: tid => routeOf(tid)({t: "tcancel", tid}),
    world: () => worldNo,
    role: () => role
  };
})();
