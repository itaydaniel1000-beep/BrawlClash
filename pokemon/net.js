/* ===== רשת =====
   חיבור ישיר בין הטלפונים דרך PeerJS, כמו ב-BrawlClash. אין שרת משלנו:
   כל חדר הוא "כתובת" בשירות הציבורי של PeerJS, ומי שתופס אותה הוא המארח.

   - חדר עם קוד: המארח תופס את room-1, ואם תפוס את room-2 וכן הלאה
     (1-9, אחר כך 10-99, אחר כך 100-999...).
   - אקראי: rand-<מספר שחקנים>-0, ואם הוא מלא או במשחק - rand-...-1 וכן הלאה.
     מי שמוצא כתובת פנויה הופך למארח ומחכה. מי שמוצא מארח שמחכה - מצטרף. */

const Net = (() => {
  const NS = "pokemon-table-itay-v1-";
  const params = new URLSearchParams(location.search);

  const ICE = {
    iceServers: [
      {urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"]},
      {urls: "stun:global.stun.twilio.com:3478"},
      {urls: "stun:stun.cloudflare.com:3478"},
      {urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject"},
      {urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject"},
      {urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject"},
      {urls: "turns:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject"}
    ]
  };

  /* לבדיקות: ?peer=localhost:9000 מחבר לשרת PeerJS מקומי */
  function peerOpts() {
    const o = {config: ICE, debug: 0};
    const ph = params.get("peer");
    if (ph) {
      const [host, port] = ph.split(":");
      Object.assign(o, {host, port: Number(port), path: "/", secure: false, config: {iceServers: []}});
    }
    return o;
  }

  const myPid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  let myName = "";
  let role = null;            // "host" | "client" | null
  let hostPeer = null;        // אצל המארח: הכתובת של החדר
  let clientPeer = null;      // אצל אורח: כתובת אקראית לחיבור
  let hostConn = null;        // אצל אורח: החיבור למארח
  let conns = {};             // אצל המארח: pid -> חיבור
  let lastS = null;
  let lastHostMsg = 0;
  let lastSeen = {};
  let beat = null;
  let migrating = false;
  let ui = {onState() {}, onStatus() {}, onLeft() {}};

  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* מנסה לתפוס כתובת. מחזיר Peer, או null אם היא תפוסה */
  function claim(id) {
    return new Promise((resolve, reject) => {
      const p = new Peer(NS + id, peerOpts());
      const t = setTimeout(() => { p.destroy(); reject(new Error("timeout")); }, 12000);
      p.on("open", () => { clearTimeout(t); resolve(p); });
      p.on("error", e => {
        clearTimeout(t);
        p.destroy();
        if (e.type === "unavailable-id") resolve(null);
        else reject(e);
      });
    });
  }

  function ensureClientPeer() {
    if (clientPeer && !clientPeer.destroyed && clientPeer.open) return Promise.resolve(clientPeer);
    return new Promise((resolve, reject) => {
      const p = new Peer(undefined, peerOpts());
      const t = setTimeout(() => reject(new Error("timeout")), 12000);
      p.on("open", () => { clearTimeout(t); clientPeer = p; resolve(p); });
      p.on("error", e => { if (!p.open) { clearTimeout(t); reject(e); } });
    });
  }

  /* מתחבר למארח ושולח hello. מחזיר {conn, reply} או null אם אין שם אף אחד */
  async function connectTo(id, hello, ms = 8000) {
    const peer = await ensureClientPeer();
    return new Promise(resolve => {
      let done = false;
      const conn = peer.connect(NS + id, {reliable: true});
      const finish = v => {
        if (done) return;
        done = true;
        clearTimeout(t);
        peer.off("error", onErr);
        if (!v) try { conn.close(); } catch (e) {}
        resolve(v);
      };
      const onErr = e => { if (e.type === "peer-unavailable" && String(e.message).includes(NS + id)) finish(null); };
      const t = setTimeout(() => finish(null), ms);
      peer.on("error", onErr);
      conn.on("open", () => conn.send(hello));
      conn.on("data", function first(d) {
        conn.off("data", first);
        finish({conn, reply: d});
      });
    });
  }

  /* ---------- מארח ---------- */

  function becomeHost(peer) {
    role = "host";
    hostPeer = peer;
    peer.on("connection", conn => {
      conn.on("data", d => hostOnData(conn, d));
      conn.on("close", () => hostOnClose(conn));
    });
    peer.on("disconnected", () => { try { peer.reconnect(); } catch (e) {} });
    startBeat();
  }

  function broadcast(S, fx) {
    lastS = S;
    const msg = {t: "state", S, fx, remaining: Engine.remaining(), total: Engine.total()};
    for (const pid in conns) {
      try { conns[pid].send(msg); } catch (e) {}
    }
    ui.onState(msg);
  }

  function hostOnData(conn, d) {
    if (!d) return;
    if (d.pid) lastSeen[d.pid] = Date.now();
    const S = Engine.state();
    switch (d.t) {
      case "hello":
        if (Engine.canJoin()) {
          conn.pid = d.pid;
          conns[d.pid] = conn;
          lastSeen[d.pid] = Date.now();
          conn.send({t: "welcome"});
          Engine.addPlayer(d.pid, d.name);
        } else {
          conn.send({t: "full"});
          setTimeout(() => conn.close(), 500);
        }
        break;
      case "rejoin":
        if (S && S.players.some(p => p.pid === d.pid)) {
          conn.pid = d.pid;
          conns[d.pid] = conn;
          conn.send({t: "welcome"});
          conn.send({t: "state", S, fx: null, remaining: Engine.remaining(), total: Engine.total()});
        } else {
          conn.send({t: "full"});
        }
        break;
      case "act":
        if (conn.pid) Engine.act(conn.pid, d.a);
        break;
      case "leave":
        if (conn.pid) dropPlayer(conn.pid);
        break;
    }
  }

  function hostOnClose(conn) {
    if (conn.pid && conns[conn.pid] === conn) dropPlayer(conn.pid);
  }

  function dropPlayer(pid) {
    const c = conns[pid];
    delete conns[pid];
    delete lastSeen[pid];
    try { c && c.close(); } catch (e) {}
    Engine.removePlayer(pid);
  }

  /* דופק: המארח שולח כל 3 שניות. מי ששותק 15 שניות - יצא */
  function startBeat() {
    clearInterval(beat);
    beat = setInterval(() => {
      const now = Date.now();
      if (role === "host") {
        for (const pid in conns) {
          try { conns[pid].send({t: "ping"}); } catch (e) {}
          if (now - (lastSeen[pid] || now) > 15000) dropPlayer(pid);
        }
      } else if (role === "client" && !migrating) {
        if (now - lastHostMsg > 15000) hostLost();
      }
    }, 3000);
  }

  /* ---------- אורח ---------- */

  function becomeClient(conn) {
    role = "client";
    hostConn = conn;
    lastHostMsg = Date.now();
    conn.on("data", d => {
      lastHostMsg = Date.now();
      if (!d) return;
      if (d.t === "ping") return conn.send({t: "pong", pid: myPid});
      if (d.t === "state") { lastS = d.S; ui.onState(d); }
    });
    conn.on("close", () => { if (hostConn === conn) hostLost(); });
    startBeat();
  }

  /* המארח נעלם: השחקן הבא ברשימה הופך למארח וממשיך מאותה נקודה */
  async function hostLost() {
    if (migrating || role !== "client") return;
    migrating = true;
    hostConn = null;
    const S = lastS;
    if (!S) return giveUp("החיבור למארח נותק");
    const heir = S.players.find(p => p.pid !== S.hostPid);
    if (!heir) return giveUp("החיבור למארח נותק");
    const base = S.roomKey;
    ui.onStatus("המארח יצא. מעבירים את המשחק לשחקן אחר...");

    if (heir.pid === myPid) {
      let gen = S.hostGen + 1, peer = null;
      for (let tries = 0; tries < 5 && !peer; tries++, gen++) {
        try { peer = await claim(`${base}-h${gen}`); } catch (e) { await wait(1000); }
      }
      if (!peer) return giveUp("לא הצלחנו להמשיך את המשחק");
      const oldHost = S.hostPid;
      S.hostPid = myPid;
      S.hostGen = gen - 1;
      conns = {};
      lastSeen = {};
      Engine.adopt(S, broadcast);
      becomeHost(peer);
      Engine.removePlayer(oldHost);
      // מחכים שכולם יתחברו מחדש, ומי שלא - יצא
      await wait(7000);
      Engine.state().players
        .filter(p => p.pid !== myPid && !conns[p.pid])
        .forEach(p => Engine.removePlayer(p.pid));
      migrating = false;
      ui.onStatus("");
      Engine.resume();
    } else {
      const id = `${base}-h${S.hostGen + 1}`;
      const until = Date.now() + 20000;
      while (Date.now() < until) {
        const r = await connectTo(id, {t: "rejoin", pid: myPid}, 4000).catch(() => null);
        if (r && r.reply.t === "welcome") {
          migrating = false;
          ui.onStatus("");
          becomeClient(r.conn);
          return;
        }
        await wait(1500);
      }
      giveUp("החיבור למשחק נותק");
    }
  }

  function giveUp(text) {
    migrating = false;
    leave(true);
    ui.onLeft(text);
  }

  /* ---------- פעולות מהלובי ---------- */

  async function createRoom(N) {
    for (let digits = 1; digits <= 6; digits++) {
      const from = digits === 1 ? 1 : 10 ** (digits - 1);
      for (let code = from; code < 10 ** digits; code++) {
        const key = `room-${code}`;
        const peer = await claim(key);
        if (peer) {
          becomeHost(peer);
          Engine.init(broadcast);
          Engine.lobby({roomKey: key, code: String(code), mode: "room", N}, {pid: myPid, name: myName});
          return String(code);
        }
      }
    }
    throw new Error("no room");
  }

  async function joinRoom(code) {
    const r = await connectTo(`room-${code}`, {t: "hello", pid: myPid, name: myName});
    if (!r) return "notfound";
    if (r.reply.t !== "welcome") return "full";
    becomeClient(r.conn);
    return "ok";
  }

  async function randomMatch(N) {
    for (let k = 0; k < 200; k++) {
      const key = `rand-${N}-${k}`;
      const peer = await claim(key);
      if (peer) {
        becomeHost(peer);
        Engine.init(broadcast);
        Engine.lobby({roomKey: key, code: null, mode: "random", N}, {pid: myPid, name: myName});
        return;
      }
      const r = await connectTo(key, {t: "hello", pid: myPid, name: myName});
      if (r && r.reply.t === "welcome") { becomeClient(r.conn); return; }
    }
    throw new Error("no slot");
  }

  function act(a) {
    if (role === "host") Engine.act(myPid, a);
    else if (hostConn) hostConn.send({t: "act", a, pid: myPid});
  }

  function leave(silent) {
    clearInterval(beat);
    try { if (hostConn && !silent) hostConn.send({t: "leave", pid: myPid}); } catch (e) {}
    if (role === "host") Engine.stop();
    for (const pid in conns) try { conns[pid].close(); } catch (e) {}
    conns = {};
    try { hostConn && hostConn.close(); } catch (e) {}
    try { hostPeer && hostPeer.destroy(); } catch (e) {}
    try { clientPeer && clientPeer.destroy(); } catch (e) {}
    hostPeer = clientPeer = hostConn = null;
    role = null;
    lastS = null;
  }

  window.addEventListener("pagehide", () => leave());

  return {
    myPid,
    setName: n => (myName = n),
    setUI: h => Object.assign(ui, h),
    createRoom, joinRoom, randomMatch, act, leave,
    isHost: () => role === "host"
  };
})();
