/* ===== מוזיקת רקע בסגנון 8-ביט - מנגינות מקוריות, מסונתזות בלי קבצים =====
   כל ערוץ הוא שורה של צעדים (שמינית כל אחד): תו כמו "E5", "-" ממשיך את
   התו הקודם, "." שקט. בתופים: k בס, s סנר, h מצילה. */
const Music = (() => {
  const TRACKS = {
    // מסך הפתיחה והלובי - פנפרה הרואית
    title: {bpm: 132, ch: {
      lead: "D5 - G5 - - - B5 A5 | A5 - F#5 - D5 - - - | E5 - G5 - B5 - - A5 | G5 - E5 - C5 - - - | D5 - G5 - B5 - D6 - | C6 - B5 - A5 - F#5 - | E5 F#5 G5 A5 B5 - C6 - | D6 - - - A5 - F#5 -",
      harm: "B4 - - - D5 - - - | F#4 - - - A4 - - - | G4 - - - B4 - - - | E4 - - - G4 - - - | B4 - - - D5 - - - | F#4 - - - A4 - - - | G4 - - - E5 - - - | F#4 - - - A4 - - -",
      bass: "G2 . G3 . G2 . G3 . | D2 . D3 . D2 . D3 . | E2 . E3 . E2 . E3 . | C2 . C3 . C2 . C3 . | G2 . G3 . G2 . G3 . | D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . | D2 . D3 . D2 D3 F#3 A3",
      drum: "k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h . | k . h . s . h . | k k h . s s s s"
    }},
    // הליכה בעולם - עליז וקופצני
    town: {bpm: 116, ch: {
      lead: "E5 - G5 - C6 - G5 - | D5 - G5 - B5 - A5 G5 | A5 - E5 - C5 - E5 A5 | G5 - F5 - E5 - D5 - | E5 - G5 - C6 - D6 - | B5 - G5 - D5 - G5 - | A5 G5 F5 A5 G5 F5 E5 D5 | C5 - - - . . . .",
      harm: "C5 - E4 - G4 - E4 - | B4 - D4 - G4 - D4 - | C5 - A4 - E4 - A4 - | A4 - F4 - C5 - F4 - | C5 - E4 - G4 - E4 - | B4 - D4 - G4 - D4 - | C5 - A4 - F4 - A4 - | E4 - - - D4 - B3 -",
      bass: "C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . A2 . | C3 . G2 . C3 . G2 .",
      drum: "k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s h s h"
    }},
    // קרב - מהיר ודוחף, במינור
    battle: {bpm: 168, ch: {
      lead: "E5 - A5 - B5 C6 B5 A5 | G5 - E5 - . E5 G5 A5 | A5 - C6 - A5 - F5 G5 | B5 - - - G5 - D5 - | E5 - A5 - B5 C6 D6 C6 | B5 - A5 - G5 - E5 - | F5 G5 A5 C6 - A5 G5 F5 | G#5 - - - B5 - E5 -",
      harm: "C5 - - - E5 - - - | C5 - - - A4 - - - | A4 - - - C5 - - - | B4 - - - D5 - - - | C5 - - - E5 - - - | C5 - - - A4 - - - | A4 - - - C5 - - - | B4 - - - G#4 - - -",
      bass: "A2 A3 A2 A3 A2 A3 A2 A3 | A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 | G2 G3 G2 G3 G2 G3 G2 G3 | A2 A3 A2 A3 A2 A3 A2 A3 | A2 A3 A2 A3 A2 A3 A2 A3 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 G#2 B2",
      drum: "k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k s s s | k h s h k k s h | k h s h k k s h | k h s h k k s h | k k s k s s s s"
    }},
    // ניצחון - קטע קצר שלא חוזר
    victory: {bpm: 150, once: true, ch: {
      lead: "G5 C6 E6 G6 - - E6 G6 | - - - - . . . .",
      harm: "E5 G5 C6 E6 - - C6 E6 | - - - - . . . .",
      bass: "C3 . C3 . C3 - G2 C3 | - - - - . . . .",
      drum: "k . s . k s s s | k . . . . . . ."
    }}
  };

  const SEMI = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  const freq = n => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return m ? 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12 - 69) / 12) : 0;
  };
  // הופך שורה לרשימת תווים עם אורך (בצעדים)
  function parse(line) {
    const steps = line.replace(/\|/g, " ").trim().split(/\s+/);
    return steps.map((s, i) => {
      if (s === "-" || s === ".") return null;
      let len = 1;
      while (steps[i + len] === "-") len++;
      return {n: s, len};
    });
  }
  const parsed = {};
  for (const [k, t] of Object.entries(TRACKS)) {
    parsed[k] = {bpm: t.bpm, once: !!t.once, ch: {}};
    for (const [c, line] of Object.entries(t.ch)) parsed[k].ch[c] = c === "drum" ? line.replace(/\|/g, " ").trim().split(/\s+/) : parse(line);
    parsed[k].steps = parsed[k].ch.lead.length;
  }

  let ctx = null, master = null, pulse = null, noiseBuf = null;
  let cur = null, step = 0, nextT = 0, timer = null, after = null;
  const enabled = () => { const s = Profile.get().settings; return s.music !== false; };

  function setup() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = .5;
    master.connect(ctx.destination);
    // גל פולס 25% - הצליל הקלאסי של קונסולות ישנות
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 1; i < N; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * .25);
    pulse = ctx.createPeriodicWave(re, im);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function note(f, t, dur, kind) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const vol = kind === "lead" ? .07 : kind === "harm" ? .035 : .11;
    if (kind === "lead") o.setPeriodicWave(pulse);
    else o.type = kind === "harm" ? "square" : "triangle";
    o.frequency.value = f;
    const end = t + dur * .92;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .008);
    g.gain.setValueAtTime(vol * .75, t + Math.min(.08, dur * .4));
    g.gain.linearRampToValueAtTime(0, end);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(end + .02);
  }
  function drum(kind, t) {
    if (kind === "k") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + .12);
      g.gain.setValueAtTime(.22, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .14);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + .16);
      return;
    }
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = kind === "h" ? "highpass" : "bandpass";
    f.frequency.value = kind === "h" ? 7000 : 1800;
    const len = kind === "h" ? .04 : .12;
    g.gain.setValueAtTime(kind === "h" ? .05 : .12, t);
    g.gain.exponentialRampToValueAtTime(.001, t + len);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + len + .01);
  }

  function tick() {
    if (!cur || !ctx) return;
    const tr = parsed[cur], dt = 60 / tr.bpm / 2;
    while (nextT < ctx.currentTime + .15) {
      for (const [c, list] of Object.entries(tr.ch)) {
        const v = list[step];
        if (!v) continue;
        if (c === "drum") { if (v !== ".") drum(v, nextT); }
        else note(freq(v.n), nextT, v.len * dt, c);
      }
      nextT += dt;
      step++;
      if (step >= tr.steps) {
        if (tr.once) { const then = after; stop(); if (then) setTimeout(() => play(then), 400); return; }
        step = 0;
      }
    }
  }

  function stop() {
    cur = null;
    clearInterval(timer);
    timer = null;
  }

  // מנגן מסלול; אם כבר מתנגן - לא מתחיל מחדש
  function play(name, then) {
    want = name; after = then || null;
    if (!enabled() || !parsed[name]) { stop(); return; }
    if (cur === name) return;
    if (!setup()) return;
    if (ctx.state === "suspended") ctx.resume();
    stop();
    cur = name;
    step = 0;
    nextT = ctx.currentTime + .08;
    timer = setInterval(tick, 25);
    tick();
  }

  let want = null;
  // דפדפנים לא מנגנים לפני נגיעה ראשונה - מתחילים ברגע שנוגעים
  document.addEventListener("pointerdown", () => {
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (want && !cur && enabled()) play(want, after);
  });
  // כשהלשונית מוסתרת - שקט
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (enabled()) ctx.resume();
  });

  return {
    play,
    stop,
    current: () => cur,
    // הדלקה/כיבוי מהגדרות
    toggle(on) {
      Profile.setSetting("music", on);
      if (on) { const w = want; want = null; cur = null; if (w) play(w); } else stop();
    },
    isOn: enabled
  };
})();
