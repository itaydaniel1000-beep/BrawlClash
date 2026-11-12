/* ===== הפרופיל של השחקן =====
   פוקידקס, סטטיסטיקות והגדרות. נשמר רק בטלפון הזה (אין שרת). */

const PROFILE_KEY = "pokemon-table-profile";

const Profile = (() => {
  const blank = () => ({
    caught: {},        // id -> כמה פעמים נכנס לצוות שלי
    seen: {},          // id -> true
    stats: {games: 0, wins: 0, losses: 0, attacks: 0, damage: 0, bestHit: 0, tries: 0, catches: 0, starters: {}},
    settings: {sound: true, vibrate: true}
  });
  let P = blank();
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (raw) {
      P = {...P, ...raw};
      P.stats = {...blank().stats, ...(raw.stats || {})};
      P.settings = {...blank().settings, ...(raw.settings || {})};
    }
  } catch (e) {}

  const save = () => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(P)); } catch (e) {} };

  // מה שראינו במצב הקודם (עותק, כי אצל המארח המצב הוא אותו אובייקט שמשתנה)
  let last = {phase: null, myTeam: [], wheelSeq: -1, seq: -1};

  /* כל מצב שמגיע מהמארח עובר כאן ומעדכן את ההתקדמות */
  function onState(S, myPid, fx) {
    if (S.seq === last.seq && !fx) return;
    last.seq = S.seq;
    let dirty = false;
    const mine = S.players.find(p => p.pid === myPid);

    if (S.wild && !P.seen[S.wild.id]) { P.seen[S.wild.id] = true; dirty = true; }
    S.players.forEach(p => p.team.forEach(m => { if (!P.seen[m.id]) { P.seen[m.id] = true; dirty = true; } }));

    if (S.phase === "starterRoll" && last.phase !== "starterRoll") { P.stats.games++; dirty = true; }
    if (S.phase === "end" && last.phase !== "end") {
      if (S.win) P.stats.wins++; else P.stats.losses++;
      if (S.win) P.seen[CONFIG.boss.id] = true;
      dirty = true;
    }

    // מה נוסף לצוות שלי
    if (mine) {
      const before = {};
      last.myTeam.forEach(id => (before[id] = (before[id] || 0) + 1));
      mine.team.forEach(m => {
        if (before[m.id]) before[m.id]--;
        else {
          P.caught[m.id] = (P.caught[m.id] || 0) + 1;
          if (STARTERS.includes(m.id) && mine.team.length === 1) {
            P.stats.starters[m.id] = (P.stats.starters[m.id] || 0) + 1;
          }
          dirty = true;
        }
      });
      last.myTeam = mine.team.map(m => m.id);
    }

    if (fx && fx.kind === "damage" && fx.pid === myPid) {
      P.stats.attacks++;
      P.stats.damage += fx.dmg;
      P.stats.bestHit = Math.max(P.stats.bestHit, fx.dmg);
      dirty = true;
    }
    if (fx && fx.kind === "wheel" && S.wheel && S.wheel.pid === myPid) {
      P.stats.tries++;
      if (S.wheel.success) P.stats.catches++;
      dirty = true;
    }
    last.phase = S.phase;
    if (dirty) save();
  }

  function resetGame() { last = {phase: null, myTeam: [], wheelSeq: -1, seq: -1}; }

  return {
    get: () => P,
    onState,
    resetGame,
    setSetting(k, v) { P.settings[k] = v; save(); },
    wipe() { const s = P.settings; P = blank(); P.settings = s; save(); },
    dexList: () => Object.keys(POKEMON).sort((a, b) => POKEMON[a].dex - POKEMON[b].dex),
    // מהעולם: מה שנתפס ונראה שם נכנס לאותו פוקידקס
    markSeen(id) { if (!P.seen[id]) { P.seen[id] = true; save(); } },
    markCaught(id) { P.caught[id] = (P.caught[id] || 0) + 1; P.stats.catches++; P.stats.tries++; save(); },
    markTry() { P.stats.tries++; save(); }
  };
})();

/* ===== צלילים - מסונתזים, בלי קבצים ===== */
const Sfx = (() => {
  let ctx = null;
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  document.addEventListener("pointerdown", () => ac(), {once: true});

  function tone(freq, dur, {type = "sine", vol = .18, slide = 0, delay = 0} = {}) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + .02);
  }
  function noise(dur, vol = .2, delay = 0) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 1800;
    s.buffer = buf; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination);
    s.start(t);
  }

  const SOUNDS = {
    click: () => tone(660, .06, {type: "square", vol: .06}),
    turn: () => { tone(784, .12, {type: "triangle"}); tone(1047, .18, {type: "triangle", delay: .12}); },
    appear: () => { tone(330, .25, {type: "triangle", slide: 400}); noise(.2, .08); },
    hit: () => { noise(.15, .25); tone(180, .12, {type: "square", vol: .1, slide: -80}); },
    superhit: () => { noise(.22, .32); tone(260, .2, {type: "sawtooth", vol: .12, slide: -150}); },
    miss: () => tone(200, .2, {type: "sine", vol: .1, slide: -60}),
    hurt: () => { noise(.12, .2); tone(140, .15, {type: "square", vol: .08, slide: -50}); },
    throw: () => tone(500, .3, {type: "sine", vol: .1, slide: 500}),
    absorb: () => tone(900, .35, {type: "sine", vol: .12, slide: -700}),
    wobble: () => tone(320, .07, {type: "square", vol: .07}),
    caught: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, {type: "triangle", delay: i * .1})),
    escape: () => { noise(.25, .2); tone(600, .25, {type: "sawtooth", vol: .08, slide: -400}); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .22, {type: "triangle", delay: i * .13})),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, .3, {type: "triangle", delay: i * .2}))
  };

  return {
    play(name) {
      if (!Profile.get().settings.sound || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) {}
    }
  };
})();

function buzz(ms) {
  const ua = navigator.userActivation;
  if (ua && !ua.hasBeenActive) return;
  if (Profile.get().settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}
