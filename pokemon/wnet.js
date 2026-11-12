/* ===== העולם: רשת =====
   כל מי שנכנס לעולם מגיע לאותו מקום: הראשון תופס את הכתובת world-0
   והופך למארח, וכל השאר מתחברים אליו. כשמתמלא (12) עוברים ל-world-1.

   המארח מעביר לכולם איפה כל אחד עומד, מעביר הזמנות לקרב, ומנהל את
   הקרבות בין שחקנים: שני השחקנים שולחים לו מה הם עושים בתור, והוא
   מחשב (עם wcore.js) ושולח לשניהם את התוצאה. ככה שניהם רואים אותו קרב.

   אם המארח יוצא, כולם מתחברים מחדש ומישהו אחר תופס את הכתובת. */

const WNet = (() => {
  const NS = "pokemon-world-itay-v1-";
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
  let tick = null, stopped = true, reconnecting = false;
  let ui = {onPlayers() {}, onChallenge() {}, onAnswer() {}, onBattle() {}, onStatus() {}};

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
      conn.on("open", () => conn.send({t: "hi", pid: myPid, name: me.name}));
      conn.on("data", function first(d) { conn.off("data", first); finish(d.t === "welcome" ? conn : (d.t === "full" ? "full" : null)); });
    });
  }

  /* ---------- כניסה ---------- */

  async function join(name) {
    me.name = name;
    stopped = false;
    for (let k = 0; k < 20 && !stopped; k++) {
      ui.onStatus("connecting");
      let peer = null;
      try { peer = await claim(`world-${k}`); } catch (e) { await wait(800); k--; continue; }
      if (peer) { becomeHost(peer, k); return; }
      const c = await connectTo(`world-${k}`);
      if (c === "full") continue;
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
    }
  }

  function clientData(d) {
    switch (d.t) {
      case "world": ui.onPlayers(d.players); break;
      case "chal": ui.onChallenge(d.from, d.name); break;
      case "ans": ui.onAnswer(d.from, d.ok, d.busy); break;
      case "bstate": ui.onBattle(d.st); break;
    }
  }

  function dropPlayer(pid) {
    delete conns[pid];
    delete players[pid];
    for (const bid in battles) if (battles[bid].a.pid === pid || battles[bid].b.pid === pid) battleQuit(pid, bid);
  }

  const busy = pid => Object.values(battles).some(b => !b.over && (b.a.pid === pid || b.b.pid === pid));

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
    s.party = (party || []).slice(0, W_MAX_PARTY).map(m => ({uid: m.uid, id: m.id, lvl: Math.min(100, m.lvl | 0), moves: (m.moves || []).filter(k => WMOVES[k]).slice(0, 4), hp: 0}))
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
      dm.hp = Math.max(0, dm.hp - r.dmg);
      fx.push({by: att.pid, move: mv, dmg: r.dmg, hit: r.hit, mult: r.mult});
      log.push(`${POKEMON[am.id].he} של ${att.name} משתמש ב${WMOVES[mv][0]}` + (r.hit ? ` - ${r.dmg}${r.mult > 1 ? " (יעיל מאוד!)" : r.mult < 1 ? " (לא יעיל)" : ""}` : " - פספס!"));
      if (dm.hp <= 0) log.push(`${POKEMON[dm.id].he} של ${def.name} התעלף!`);
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
    hostPeer = clientPeer = hostConn = null;
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
    world: () => worldNo,
    role: () => role
  };
})();
