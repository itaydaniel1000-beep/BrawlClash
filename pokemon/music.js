/* ===== מוזיקה בסגנון גיים בוי - מנגינות מקוריות, מסונתזות בלי קבצים =====
   כל ערוץ הוא שורה של צעדים: תו כמו "E5", "-" ממשיך את התו הקודם, "." שקט.
   בתופים: k בס, s סנר, h מצילה. div = כמה צעדים בכל פעמה (2 = שמיניות,
   4 = שש-עשריות). intro מתנגן פעם אחת ואז הלולאה חוזרת בלעדיו.
   "jingle" = קטע קצר שקוטע את המוזיקה וחוזר אליה בסוף. */
const Music = (() => {
  // ---- כלי עזר לכתיבת ליווי לפי אקורדים ----
  const ROOT = {C: "C", Cm: "C", D: "D", Dm: "D", E: "E", Em: "E", F: "F", G: "G", A: "A", Am: "A", B: "B", Bm: "B", "F#": "F#"};
  // בס של גיים בוי: שורש למטה ולמעלה עם קפיצות של שש-עשריות
  const runBass = (chords, half) => chords.map(c => {
    const r = ROOT[c];
    const bar = `${r}2 . ${r}3 . ${r}2 ${r}2 ${r}3 . ${r}2 . ${r}3 . ${r}2 ${r}2 ${r}3 ${r}3`;
    return half ? bar.split(" ").slice(0, 8).join(" ") : bar;
  });
  const bars = list => list.join(" | ");

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
    // קרב - פתיחה מהירה שיורדת ועולה, ואז לולאה מותחת עם בס רץ
    battle: {bpm: 152, div: 4,
      intro: {
        lead: "B5 A#5 A5 G#5 G5 F#5 F5 E5 D#5 D5 C#5 C5 B4 A#4 A4 G#4 | G4 G#4 A4 A#4 B4 C5 C#5 D5 D#5 E5 F5 F#5 G5 G#5 A5 A#5 | B5 - . . B5 - . . B5 - . . A#5 - A5 - | B5 - - - - - - - . . . . . . . .",
        harm: "E5 D#5 D5 C#5 C5 B4 A#4 A4 G#4 G4 F#4 F4 E4 D#4 D4 C#4 | C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5 C#5 D5 D#5 | E5 - . . E5 - . . E5 - . . D#5 - D5 - | D#5 - - - - - - - . . . . . . . .",
        bass: "E2 - - - - - - - E2 - - - - - - - | E2 - - - - - - - E2 - - - B2 - - - | E2 - . . E2 - . . E2 - . . E2 - E2 - | B2 - - - - - - - B1 - . . B1 - B1 -",
        drum: "k . . . . . . . k . . . . . . . | k . . . . . . . k . . . s . s . | k . . . k . . . k . . . s . s . | k . . . . . . . s s s s s s s s"
      },
      ch: {
        lead: bars([
          "B4 - E5 - G5 - B5 - - - A5 - G5 - F#5 -", "G5 - - - E5 - - - C5 - E5 - G5 - C6 -",
          "B5 - A5 - - - F#5 - D5 - - - F#5 - A5 -", "B5 - - - - - - - D#5 - F#5 - A5 - B5 -",
          "E6 - - - D6 - B5 - - - G5 - A5 - B5 -", "C6 - B5 - G5 - E5 - - - G5 - C6 - E6 -",
          "D6 - - - C6 - A5 - F#5 - D5 - F#5 - A5 -", "B5 - - - - - - - - - - - . . . .",
          "A4 - C5 - E5 - A5 - - - G5 - E5 - C5 -", "B4 - - - G4 - B4 - E5 - - - G5 - B5 -",
          "C6 - - - B5 - G5 - A5 - - - F#5 - D5 -", "D#5 - F#5 - B5 - - - A5 - G5 - F#5 - D#5 -",
          "E5 - A5 - C6 - - - B5 - A5 - G5 - A5 -", "B5 - - - G5 - E5 - - - B4 - E5 - G5 -",
          "E5 - G5 - C6 - - - D6 - - - C6 - A5 -", "B5 - - - - - - - D#6 - - - F#6 - - -"]),
        harm: bars([
          "G4 - - - - - - - B4 - - - - - - -", "E4 - - - - - - - G4 - - - - - - -",
          "F#4 - - - - - - - A4 - - - - - - -", "D#4 - - - - - - - F#4 - - - - - - -",
          "G4 - - - - - - - B4 - - - - - - -", "E4 - - - - - - - G4 - - - - - - -",
          "F#4 - - - - - - - A4 - - - - - - -", "D#4 - - - - - - - F#4 - - - - - - -",
          "C5 - - - - - - - E5 - - - - - - -", "G4 - - - - - - - B4 - - - - - - -",
          "E4 - - - - - - - F#4 - - - - - - -", "D#4 - - - - - - - F#4 - - - - - - -",
          "C5 - - - - - - - E5 - - - - - - -", "G4 - - - - - - - B4 - - - - - - -",
          "G4 - - - - - - - A4 - - - - - - -", "F#4 - - - - - - - D#5 - - - - - - -"]),
        bass: bars([
          ...runBass(["Em", "C", "D", "B", "Em", "C", "D", "B", "Am", "Em"]),
          runBass(["C"], true)[0] + " " + runBass(["D"], true)[0],
          ...runBass(["B", "Am", "Em"]),
          runBass(["C"], true)[0] + " " + runBass(["D"], true)[0],
          ...runBass(["B"])]),
        drum: bars([
          ...Array(7).fill("k . h . s . h k k . h . s . h h"), "k . s . s . s s s s s s s s s s",
          ...Array(7).fill("k . h . s . h k k . h . s . h h"), "k . s . k . s . s s s s s s s s"])
      }},
    // ניצחון - פנפרה קצרה ואז לולאה רגועה שממשיכה במסך הניסיון
    victory: {bpm: 140, div: 4,
      intro: {
        lead: "C5 E5 G5 C6 - - G5 - C6 - - - E6 - - - | D6 - C6 - B5 - G5 - C6 - - - - - - -",
        harm: "G4 C5 E5 G5 - - E5 - G5 - - - C6 - - - | B5 - A5 - G5 - D5 - E5 - - - - - - -",
        bass: "C3 - - - C3 - - - C3 - - - C3 - - - | G2 - - - G2 - - - C3 - - - - - - -",
        drum: "k . . . k . . . k . . . s . s . | k . . . s . . . k . . . s s s s"
      },
      ch: {
        lead: "E5 - - - G5 - - - C6 - - - G5 - - - | A5 - - - C6 - - - E6 - - - C6 - - - | F5 - A5 - C6 - - - A5 - F5 - A5 - - - | G5 - - - B5 - - - D6 - - - B5 - - -",
        harm: "C5 - - - - - - - E5 - - - - - - - | C5 - - - - - - - E5 - - - - - - - | A4 - - - - - - - C5 - - - - - - - | B4 - - - - - - - D5 - - - - - - -",
        bass: "C3 - - - G3 - - - C3 - - - G3 - - - | A2 - - - E3 - - - A2 - - - E3 - - - | F2 - - - C3 - - - F2 - - - C3 - - - | G2 - - - D3 - - - G2 - - - D3 - - -",
        drum: "k . h . h . h . s . h . h . h . | k . h . h . h . s . h . h . h . | k . h . h . h . s . h . h . h . | k . h . h . h . s . h . s . s ."
      }},
    // קטעים קצרים
    heal: {bpm: 120, div: 4, jingle: true, ch: {
      lead: "C5 - E5 - G5 - C6 - - - G5 - C6 - E6 - | - - - - - - - - . . . . . . . .",
      harm: "G4 - C5 - E5 - G5 - - - E5 - G5 - C6 - | - - - - - - - - . . . . . . . .",
      bass: "C3 - - - - - - - G2 - - - C3 - - - | - - - - - - - - . . . . . . . .",
      drum: ". . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . ."
    }},
    levelup: {bpm: 150, div: 4, jingle: true, ch: {
      lead: "G5 A5 B5 D6 - - G6 - - - - - . . . .",
      harm: "D5 F#5 G5 B5 - - D6 - - - - - . . . .",
      bass: "G2 - - - - - G3 - - - - - . . . .",
      drum: ". . . . . . . . . . . . . . . ."
    }},
    evolve: {bpm: 130, div: 4, jingle: true, ch: {
      lead: "C5 D5 E5 G5 C6 - - - E6 - - - G6 - - - | F6 - E6 - D6 - E6 - C7 - - - - - - - | - - - - - - - - . . . . . . . .",
      harm: "G4 B4 C5 E5 G5 - - - C6 - - - E6 - - - | D6 - C6 - B5 - C6 - G6 - - - - - - - | - - - - - - - - . . . . . . . .",
      bass: "C3 - - - - - - - C3 - - - G2 - - - | F2 - - - G2 - - - C3 - - - - - - - | - - - - - - - - . . . . . . . .",
      drum: "k . . . . . . . k . . . s . s . | k . . . k . . . s s s s k . . . | . . . . . . . . . . . . . . . ."
    }}
  };

  const SEMI = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  const freq = n => {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return m ? 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12 - 69) / 12) : 0;
  };
  const split = line => line.replace(/\|/g, " ").trim().split(/\s+/);
  // הופך שורה לרשימת תווים עם אורך (בצעדים)
  function parse(steps) {
    return steps.map((s, i) => {
      if (s === "-" || s === ".") return null;
      let len = 1;
      while (steps[i + len] === "-") len++;
      return {n: s, len};
    });
  }
  const parsed = {};
  for (const [k, t] of Object.entries(TRACKS)) {
    const p = parsed[k] = {bpm: t.bpm, div: t.div || 2, once: !!t.jingle, jingle: !!t.jingle, ch: {}, loopFrom: 0};
    for (const c of Object.keys(t.ch)) {
      const steps = [...(t.intro ? split(t.intro[c]) : []), ...split(t.ch[c])];
      p.ch[c] = c === "drum" ? steps : parse(steps);
    }
    p.loopFrom = t.intro ? split(t.intro.lead).length : 0;
    p.steps = p.ch.lead.length;
    for (const c of Object.keys(p.ch)) if (p.ch[c].length !== p.steps) console.warn("music length", k, c, p.ch[c].length, p.steps);
  }

  let ctx = null, master = null, pulse25 = null, pulse50 = null, noiseBuf = null;
  let cur = null, step = 0, nextT = 0, timer = null, after = null, want = null;
  const enabled = () => Profile.get().settings.music !== false;

  function makePulse(duty) {
    const N = 40, re = new Float32Array(N), im = new Float32Array(N);
    for (let i = 1; i < N; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }
  function setup() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = .5;
    master.connect(ctx.destination);
    pulse25 = makePulse(.25);   // הערוץ הראשי - הצליל הצורם הקלאסי
    pulse50 = makePulse(.5);    // הערוץ השני - ריבוע מלא
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function note(f, t, dur, kind) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const vol = kind === "lead" ? .065 : kind === "harm" ? .035 : .12;
    if (kind === "lead") o.setPeriodicWave(pulse25);
    else if (kind === "harm") o.setPeriodicWave(pulse50);
    else o.type = "triangle";
    o.frequency.value = f;
    // ויברטו עדין בתווים ארוכים - כמו במשחקים הישנים
    if (kind === "lead" && dur > .3) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + .18);
      depth.gain.linearRampToValueAtTime(f * .012, t + .35);
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + .05);
    }
    const end = t + dur * .94;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .006);
    g.gain.setValueAtTime(vol * .8, t + Math.min(.07, dur * .4));
    g.gain.linearRampToValueAtTime(kind === "bass" ? vol * .6 : vol * .5, Math.max(t + .08, end - .03));
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
      g.gain.setValueAtTime(.2, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .14);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + .16);
      return;
    }
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = kind === "h" ? "highpass" : "bandpass";
    f.frequency.value = kind === "h" ? 7000 : 1800;
    const len = kind === "h" ? .035 : .11;
    g.gain.setValueAtTime(kind === "h" ? .045 : .12, t);
    g.gain.exponentialRampToValueAtTime(.001, t + len);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + len + .01);
  }

  function tick() {
    if (!cur || !ctx) return;
    const tr = parsed[cur], dt = 60 / tr.bpm / tr.div;
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
        if (tr.once) {
          const then = after;
          stop();
          if (then) { const wait = Math.max(0, (nextT - ctx.currentTime) * 1000) + 150; setTimeout(() => { if (!cur) play(then); }, wait); }
          return;
        }
        step = tr.loopFrom;
      }
    }
  }

  function stop() {
    cur = null;
    clearInterval(timer);
    timer = null;
  }

  function start(name) {
    if (!setup()) return;
    if (ctx.state === "suspended") ctx.resume();
    stop();
    cur = name;
    step = 0;
    nextT = ctx.currentTime + .08;
    timer = setInterval(tick, 25);
    tick();
  }

  // מנגן מסלול; אם כבר מתנגן - לא מתחיל מחדש
  function play(name, then) {
    if (!parsed[name]) return;
    // בזמן קטע קצר - בקשה למסלול שאליו נחזור לא קוטעת אותו
    if (cur && parsed[cur].jingle && name === after) return;
    want = name; after = then || null;
    if (!enabled()) { stop(); return; }
    if (cur === name) return;
    start(name);
  }

  // קטע קצר שקוטע את המוזיקה וחוזר אליה בסוף
  function jingle(name) {
    if (!enabled() || !parsed[name]) return false;
    const base = cur && parsed[cur].jingle ? after : (cur || want);
    want = base; after = base;
    start(name);
    return true;
  }

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
    jingle,
    stop,
    current: () => cur,
    toggle(on) {
      Profile.setSetting("music", on);
      if (on) { const w = want; cur = null; if (w) start(w); } else stop();
    },
    isOn: enabled
  };
})();
