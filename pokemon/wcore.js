/* ===== העולם: הליבה =====
   כל החשבון של מצב העולם, בלי ציור ובלי רשת: פוקימון עם רמה ומתקפות,
   קרב (נזק, מי ראשון, תפיסה), ניסיון, עליית רמה, לימוד מתקפות והתפתחות,
   ושמירה בטלפון. גם המארח של קרב בין שחקנים משתמש באותן פונקציות. */

const W_SAVE = "pokemon-world-save-v1";
const W_MAX_PARTY = 6;
const W_MAX_MOVES = 4;
const W_TUTOR_PRICE = 60;

const wrnd = n => Math.floor(Math.random() * n);
const dexKey = {};
Object.keys(POKEMON).forEach(k => { if (!dexKey[POKEMON[k].dex]) dexKey[POKEMON[k].dex] = k; });

/* ---------- סטטיסטיקות ---------- */

function wBase(id) {
  return WSTATS[POKEMON[id].dex] || [50, 50, 50, 50, 50, 50];
}

/* אותה נוסחה כמו בסדרה (בלי תכונות נסתרות) */
function wStats(mon) {
  const b = wBase(mon.id), l = mon.lvl;
  const st = b.map((v, i) => i === 0
    ? Math.floor(2 * v * l / 100) + l + 10
    : Math.floor(2 * v * l / 100) + 5);
  return {hp: st[0], atk: st[1], def: st[2], spa: st[3], spd: st[4], spe: st[5]};
}

const wMaxHp = mon => wStats(mon).hp;
const xpToNext = lvl => 12 + Math.round(lvl * lvl * 1.1);

/* ---------- מתקפות ---------- */

/* מה שהפוקימון יודע עד הרמה הזאת (לפי הסדר שבו לומדים) */
function learnable(id, lvl) {
  return (WLEARN[POKEMON[id].dex] || []).filter(([l]) => l <= lvl).map(([, m]) => m);
}

/* מתקפות שלומדים בדיוק ברמה הזאת */
function learnedAt(id, lvl) {
  return (WLEARN[POKEMON[id].dex] || []).filter(([l]) => l === lvl).map(([, m]) => m);
}

/* כל מה שהמורה יכול ללמד: מה שהיה אמור לדעת עד עכשיו, ועוד מתקפות
   מהסוגים שלו בעוצמה שמתאימה לרמה שלו */
function tutorMoves(mon) {
  const has = new Set(mon.moves);
  const own = learnable(mon.id, mon.lvl);
  const types = POKEMON[mon.id].types;
  const cap = 40 + mon.lvl * 2;
  const typed = Object.keys(WMOVES).filter(k => types.includes(WMOVES[k][1]) && WMOVES[k][2] <= cap);
  return [...new Set([...own, ...typed])].filter(k => !has.has(k))
    .sort((a, b) => WMOVES[a][2] - WMOVES[b][2]);
}

function makeWorldMon(id, lvl) {
  const moves = learnable(id, lvl).slice(-W_MAX_MOVES);
  const mon = {uid: Math.random().toString(36).slice(2, 10), id, lvl, xp: 0, moves: moves.length ? moves : ["tackle"]};
  mon.hp = wMaxHp(mon);
  return mon;
}

/* ---------- קרב ---------- */

function typeMult(moveType, defTypes) {
  let m = 1;
  for (const d of defTypes) {
    const v = TYPE_CHART[moveType][d];
    if (v !== undefined) m *= v;
  }
  return m;
}

/* נזק של מתקפה אחת. מחזיר גם אם פגע ואם זה היה יעיל */
function wDamage(att, def, moveKey) {
  const mv = WMOVES[moveKey];
  if (!mv) return {dmg: 0, hit: false, mult: 1};
  const [, type, power, acc, physical] = mv;
  if (Math.random() * 100 >= acc) return {dmg: 0, hit: false, mult: 1};
  const A = wStats(att), D = wStats(def);
  const a = physical ? A.atk : A.spa, d = physical ? D.def : D.spd;
  const stab = POKEMON[att.id].types.includes(type) ? 1.5 : 1;
  const mult = typeMult(type, POKEMON[def.id].types);
  const crit = Math.random() < 1 / 16 ? 1.5 : 1;
  const base = Math.floor((Math.floor(2 * att.lvl / 5 + 2) * power * a / d) / 50) + 2;
  const dmg = mult === 0 ? 0 : Math.max(1, Math.floor(base * stab * mult * crit * (0.85 + Math.random() * 0.15)));
  return {dmg, hit: true, mult, crit: crit > 1};
}

/* מי תוקף ראשון: עדיפות של המתקפה, אחר כך מהירות */
function firstSide(monA, moveA, monB, moveB) {
  const pa = moveA ? (WMOVES[moveA] || [])[5] || 0 : 9, pb = moveB ? (WMOVES[moveB] || [])[5] || 0 : 9;
  if (pa !== pb) return pa > pb ? "a" : "b";
  const sa = wStats(monA).spe, sb = wStats(monB).spe;
  if (sa !== sb) return sa > sb ? "a" : "b";
  return Math.random() < .5 ? "a" : "b";
}

/* תפיסה: כמה שהפראי חלש יותר, קל יותר */
function wCatchChance(wild) {
  const base = POKEMON[wild.id].catch || .2;
  const max = wMaxHp(wild);
  const k = (3 * max - 2 * wild.hp) / (3 * max);
  return Math.min(.95, base * k * 2.2 + .02);
}

/* ניסיון מנצחון */
const wXpFor = (foe, pvp) => Math.round((8 + foe.lvl * 5) * (pvp ? 1.5 : 1));

/* ---------- עליית רמה, לימוד והתפתחות ----------
   מחזיר רשימת אירועים, וה-UI מציג אותם אחד אחרי השני:
   {kind:"level", lvl} | {kind:"learn", move} | {kind:"choose", move} | {kind:"evolve", from, to} */
function evoLevel(id) {
  const e = WEVO[POKEMON[id].dex];
  if (!e) return 0;
  if (e[0]) return e[0];
  // התפתחות בלי רמה (אבן, חברות, החלפה) - בעולם זה קורה ברמה קבועה
  const isMiddle = Object.values(WEVO).some(x => x[1].includes(POKEMON[id].dex));
  return isMiddle ? 36 : 25;
}

function evoTarget(id) {
  const e = WEVO[POKEMON[id].dex];
  if (!e) return null;
  const opts = e[1].map(d => dexKey[d]).filter(Boolean);
  return opts.length ? opts[wrnd(opts.length)] : null;
}

function gainXp(mon, amount) {
  const events = [];
  mon.xp += amount;
  while (mon.lvl < 100 && mon.xp >= xpToNext(mon.lvl)) {
    mon.xp -= xpToNext(mon.lvl);
    const before = wMaxHp(mon);
    mon.lvl++;
    mon.hp = Math.min(wMaxHp(mon), mon.hp + (wMaxHp(mon) - before));
    events.push({kind: "level", lvl: mon.lvl});
    for (const m of learnedAt(mon.id, mon.lvl)) {
      if (mon.moves.includes(m)) continue;
      if (mon.moves.length < W_MAX_MOVES) { mon.moves.push(m); events.push({kind: "learn", move: m}); }
      else events.push({kind: "choose", move: m});
    }
    const lv = evoLevel(mon.id);
    if (lv && mon.lvl >= lv && !events.some(e => e.kind === "evolve")) {
      const to = evoTarget(mon.id);
      if (to) events.push({kind: "evolve", from: mon.id, to});
    }
  }
  return events;
}

function evolveMon(mon, to) {
  const ratio = mon.hp / wMaxHp(mon);
  mon.id = to;
  mon.hp = Math.max(1, Math.round(wMaxHp(mon) * ratio));
}

/* ---------- שמירה ---------- */

const WSave = (() => {
  let s = null;
  function load() {
    try { s = JSON.parse(localStorage.getItem(W_SAVE) || "null"); } catch (e) { s = null; }
    if (s && !Array.isArray(s.party)) s = null;
    return s;
  }
  function save() { try { localStorage.setItem(W_SAVE, JSON.stringify(s)); } catch (e) {} }
  function start(starterId) {
    s = {party: [makeWorldMon(starterId, 5)], box: [], coins: 100, pos: {x: 0, z: 6}, wins: 0, catches: 0};
    save();
    return s;
  }
  return {load, save, start, get: () => s};
})();

/* מי שנלחם: הראשון בצוות שעדיין עומד */
const firstAlive = party => party.findIndex(m => m.hp > 0);
const healParty = party => party.forEach(m => { m.hp = wMaxHp(m); });
