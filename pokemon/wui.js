/* ===== העולם: מסכים =====
   בחירת פוקימון ראשון, הכפתורים בעולם, קרב (נגד פראי ונגד שחקן),
   המורה למתקפות, מרכז הפוקימון והצוות. */

const $w = s => document.querySelector(s);
const escW = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const myName = (() => { try { return localStorage.getItem("pokemon-table-name") || "מאמן"; } catch (e) { return "מאמן"; } })();

let SV = null;                // השמירה
let battle = null;            // הקרב הפעיל
let place = null;             // ליד מה אני עומד
let worldPlayers = {};
let pendingChallenge = null;

/* ---------- רכיבים ---------- */

function hpBarW(hp, max) {
  const p = Math.max(0, Math.round(100 * hp / max));
  const c = p > 50 ? "good" : p > 20 ? "mid" : "low";
  return `<div class="whp"><i class="${c}" style="width:${p}%"></i></div>`;
}

function typeTag(t) { return `<span class="wtype" style="background:${TYPES[t].color}">${TYPES[t].icon} ${TYPES[t].he}</span>`; }

function monRow(m, extra = "") {
  const d = POKEMON[m.id], max = wMaxHp(m);
  return `<div class="mrow${m.hp <= 0 ? " ko" : ""}">
    <img src="${ART_URL(d.dex)}" alt="">
    <div class="mrow-info"><b>${d.he}</b> <small>רמה ${m.lvl}</small>${hpBarW(m.hp, max)}<small>${m.hp}/${max}</small></div>
    ${extra}
  </div>`;
}

function toast(text, ms = 2200) {
  const t = $w("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, ms);
}

function modal(html) { $w("#wmodal").innerHTML = `<div class="wbox">${html}</div>`; $w("#wmodal").hidden = false; }
function closeModal() { $w("#wmodal").hidden = true; $w("#wmodal").innerHTML = ""; }

/* ---------- התחלה ---------- */

function chooseStarter() {
  modal(`<h2>בחר את הפוקימון הראשון שלך</h2>
    <div class="starters">${STARTERS.map(id => `<button class="starter" onclick="pickStarter('${id}')">
      <img src="${ART_URL(POKEMON[id].dex)}" alt=""><b>${POKEMON[id].he}</b><span>${POKEMON[id].types.map(typeTag).join("")}</span></button>`).join("")}</div>`);
}

function pickStarter(id) {
  SV = WSave.start(id);
  Profile.markCaught(id);
  closeModal();
  enterWorld();
}

function enterWorld() {
  World3D.init($w("#world"), SV.pos, {onEncounter, onPlace});
  World3D.setLead(SV.party[0].id);
  renderHud();
  WNet.setUI({onPlayers, onChallenge, onAnswer, onBattle: onPvp, onStatus: s => { netStatus = s; renderHud(); }});
  WNet.join(myName);
  setInterval(() => {
    const st = World3D.state();
    SV.pos = {x: st.x, z: st.z};
    WNet.setMe({...st, name: myName, lead: SV.party[0].id, busy: !!battle});
  }, 120);
  setInterval(() => WSave.save(), 5000);
}

/* ---------- בעולם ---------- */

let netStatus = "connecting";

function renderHud() {
  const lead = SV.party[0];
  const n = Object.keys(worldPlayers).length;
  $w("#whud").innerHTML = `
    <a class="hbtn" href="index.html">↩</a>
    <button class="hbtn lead" onclick="openParty()"><img src="${ART_URL(POKEMON[lead.id].dex)}" alt=""><span>${POKEMON[lead.id].he} · ${lead.lvl}</span></button>
    <span class="hchip">🪙 ${SV.coins}</span>
    <span class="hchip">${netStatus === "online" ? `👥 ${Math.max(1, n)}` : "⏳"}</span>`;
}

function onPlace(p) {
  place = p;
  const b = $w("#actBtn");
  if (!p || battle) { b.hidden = true; return; }
  b.hidden = false;
  if (p === "center") { b.textContent = "🏥 ריפוי"; b.onclick = heal; }
  else if (p === "tutor") { b.textContent = "📖 מורה למתקפות"; b.onclick = openTutor; }
  else if (p.startsWith("player:")) {
    const pid = p.slice(7);
    const pl = worldPlayers[pid];
    b.textContent = `⚔️ קרב נגד ${pl ? pl.name : ""}`;
    b.onclick = () => { WNet.challenge(pid); toast("ההזמנה נשלחה ⏳"); };
  }
}

function heal() {
  healParty(SV.party);
  WSave.save();
  Sfx.play("caught");
  toast("כל הפוקימונים שלך בריאים! ❤️");
  renderHud();
}

function onPlayers(list) {
  worldPlayers = list;
  World3D.setPlayers(list, WNet.myPid);
  renderHud();
}

/* ---------- הצוות ---------- */

function openParty() {
  if (battle) return;
  const rows = SV.party.map((m, i) => monRow(m, `<div class="mbtns">
      ${i ? `<button class="mini" onclick="makeLead(${i})">ראשון</button>` : `<span class="lead-mark">⭐</span>`}
      <button class="mini" onclick="showMon(${i})">פרטים</button>
      ${SV.party.length > 1 ? `<button class="mini" onclick="toBox(${i})">לקופסה</button>` : ""}
    </div>`)).join("");
  const box = SV.box.length ? `<h3>קופסה (${SV.box.length})</h3>` + SV.box.map((m, i) => monRow(m,
    SV.party.length < W_MAX_PARTY ? `<button class="mini" onclick="fromBox(${i})">לצוות</button>` : "")).join("") : "";
  modal(`<h2>הצוות שלי</h2>${rows}${box}<button class="wbtn" onclick="closeModal()">סגור</button>`);
}

function makeLead(i) { const [m] = SV.party.splice(i, 1); SV.party.unshift(m); World3D.setLead(m.id); WSave.save(); renderHud(); openParty(); }
function toBox(i) { SV.box.push(...SV.party.splice(i, 1)); World3D.setLead(SV.party[0].id); WSave.save(); renderHud(); openParty(); }
function fromBox(i) { SV.party.push(...SV.box.splice(i, 1)); WSave.save(); openParty(); }

function showMon(i) {
  const m = SV.party[i], d = POKEMON[m.id], st = wStats(m);
  const evo = evoLevel(m.id);
  modal(`<div class="mon-card">
    <img src="${ART_URL(d.dex)}" alt=""><h2>${d.he} <small>רמה ${m.lvl}</small></h2>
    <div>${d.types.map(typeTag).join("")}</div>
    ${hpBarW(m.hp, st.hp)}<small>❤️ ${m.hp}/${st.hp} · ⭐ ${m.xp}/${xpToNext(m.lvl)}</small>
    <div class="stats">⚔️ ${st.atk} · 🛡️ ${st.def} · ✨ ${st.spa} · 🔰 ${st.spd} · 💨 ${st.spe}</div>
    ${evo ? `<div class="evo-note">מתפתח ברמה ${evo}</div>` : ""}
    <div class="moves">${m.moves.map(moveChip).join("")}</div>
  </div><button class="wbtn" onclick="openParty()">חזור</button>`);
}

function moveChip(k) {
  const mv = WMOVES[k];
  return `<span class="mchip" style="--c:${TYPES[mv[1]].color}">${mv[0]} <small>${TYPES[mv[1]].icon} ${mv[2]}</small></span>`;
}

/* ---------- המורה למתקפות ---------- */

function openTutor() {
  modal(`<h2>📖 המורה למתקפות</h2><p class="price">כל מתקפה: 🪙 ${W_TUTOR_PRICE} · יש לך 🪙 ${SV.coins}</p>
    ${SV.party.map((m, i) => monRow(m, `<button class="mini" onclick="tutorFor(${i})">ללמד</button>`)).join("")}
    <button class="wbtn" onclick="closeModal()">סגור</button>`);
}

function tutorFor(i) {
  const m = SV.party[i];
  const list = tutorMoves(m);
  modal(`<h2>מה ללמד את ${POKEMON[m.id].he}?</h2>
    <div class="moves now">${m.moves.map(moveChip).join("")}</div>
    <div class="tutor-list">${list.map(k => `<button class="tmove" style="--c:${TYPES[WMOVES[k][1]].color}" ${SV.coins < W_TUTOR_PRICE ? "disabled" : ""} onclick="teach(${i}, '${k}')">
      <b>${WMOVES[k][0]}</b><small>${TYPES[WMOVES[k][1]].icon} עוצמה ${WMOVES[k][2]} · דיוק ${WMOVES[k][3]}</small></button>`).join("") || "<p>אין כרגע מה ללמד. כשיעלה רמה יהיו עוד.</p>"}</div>
    <button class="wbtn" onclick="openTutor()">חזור</button>`);
}

function teach(i, k) {
  const m = SV.party[i];
  if (SV.coins < W_TUTOR_PRICE) return;
  const done = () => { SV.coins -= W_TUTOR_PRICE; WSave.save(); renderHud(); Sfx.play("caught"); toast(`${POKEMON[m.id].he} למד ${WMOVES[k][0]}!`); tutorFor(i); };
  if (m.moves.length < W_MAX_MOVES) { m.moves.push(k); return done(); }
  modal(`<h2>איזו מתקפה לשכוח?</h2><p>${POKEMON[m.id].he} לומד ${WMOVES[k][0]}</p>
    <div class="forget">${m.moves.map((old, j) => `<button class="tmove" style="--c:${TYPES[WMOVES[old][1]].color}" onclick="forget(${i}, ${j}, '${k}')"><b>${WMOVES[old][0]}</b></button>`).join("")}</div>
    <button class="wbtn" onclick="tutorFor(${i})">ביטול</button>`);
  window.forget = (ii, j, kk) => { SV.party[ii].moves[j] = kk; done(); };
}

/* ---------- קרב נגד פראי ---------- */

function onEncounter(w) {
  if (firstAlive(SV.party) < 0) { World3D.removeWild(w.uid); World3D.pause(false); toast("כל הפוקימונים שלך עייפים. לך למרכז הפוקימון 🏥"); return; }
  const foe = makeWorldMon(w.id, w.lvl);
  Profile.markSeen(w.id);
  battle = {kind: "wild", uid: w.uid, foe, me: firstAlive(SV.party), log: [`${POKEMON[w.id].he} פראי הופיע!`], busy: false, menu: "main"};
  $w("#actBtn").hidden = true;
  Sfx.play("appear");
  showBattle();
}

/* ---------- מסך הקרב ----------
   זירה עם שמיים, גבעות ושתי במות דשא: היריב רחוק למעלה, שלי קרוב למטה.
   תיבות מידע לבנות עם מד חיים, תיבת דיאלוג, ותפריט ראשי - קרב / כדור /
   פוקימונים / ברח. מדי החיים יורדים בהדרגה מהערך הקודם לחדש. */
function showBattle() {
  const b = battle;
  const el = $w("#battle");
  const first = el.hidden || !b.shown;
  el.hidden = false;
  b.shown = true;
  if (b.kind === "pvp" && !b.myMon) {
    el.innerHTML = `<div class="bscene">${sceneBack()}</div><div class="bpanel"><div class="dialog">מתכוננים לקרב...</div><div class="bactions"></div></div>`;
    return;
  }
  const mine = b.kind === "wild" ? SV.party[b.me] : b.myMon;
  const foe = b.kind === "wild" ? b.foe : b.foeMon;
  const fMax = wMaxHp(foe), mMax = wMaxHp(mine);
  const fPct = Math.max(0, 100 * foe.hp / fMax), mPct = Math.max(0, 100 * mine.hp / mMax);
  // מד החיים מתחיל מהמקום הקודם ויורד בהדרגה
  const fFrom = b.lastFoe && b.lastFoe.id === foe.id ? b.lastFoe.pct : fPct;
  const mFrom = b.lastMe && b.lastMe.uid === (mine.uid || mine.id) ? b.lastMe.pct : mPct;
  b.lastFoe = {id: foe.id, pct: fPct};
  b.lastMe = {uid: mine.uid || mine.id, pct: mPct};

  el.innerHTML = `
    <div class="bscene${first ? " intro" : ""}">
      ${sceneBack()}
      <div class="plat foe"></div><div class="plat me"></div>
      <img class="bimg foe${b.foeHit ? " hit" : ""}${b.caught ? " gone" : ""}${foe.hp <= 0 ? " faint" : ""}" src="${ART_URL(POKEMON[foe.id].dex)}" alt="">
      <img class="bimg me${b.meHit ? " hit" : ""}${mine.hp <= 0 ? " faint" : ""}" src="${ART_URL(POKEMON[mine.id].dex)}" alt="">
      ${infoBox(foe, fFrom, fPct, false)}
      ${infoBox(mine, mFrom, mPct, true)}
      ${b.ballAnim ? `<div class="ballfx ${b.ballAnim}"><i></i></div>` : ""}
      ${first ? `<div class="wipe"></div>` : ""}
    </div>
    <div class="bpanel">
      <div class="dialog">${b.log.map(escW).join("<br>")}</div>
      <div class="bactions">${battleMenu(b, mine, foe)}</div>
    </div>`;
  b.foeHit = b.meHit = false;
  setTimeout(() => el.querySelectorAll(".hpbar i[data-to]").forEach(i => {
    i.style.width = i.dataset.to + "%";
    i.className = hpClass(Number(i.dataset.to));
  }), 40);
}

const hpClass = p => p > 50 ? "good" : p > 20 ? "mid" : "low";

function sceneBack() {
  return `<div class="sky"><i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i></div>
    <div class="hills"><i class="h1"></i><i class="h2"></i></div><div class="ground"></div>`;
}

function infoBox(m, from, to, mine) {
  const d = POKEMON[m.id];
  const max = wMaxHp(m);
  const xpPct = mine && m.xp !== undefined ? Math.round(100 * (m.xp || 0) / xpToNext(m.lvl)) : null;
  return `<div class="infobox ${mine ? "me" : "foe"}">
    <div class="ib-top"><b>${d.he}</b><span class="ib-types">${d.types.map(t => `<i style="background:${TYPES[t].color}">${TYPES[t].icon}</i>`).join("")}</span><span class="ib-lv">רמה ${m.lvl}</span></div>
    <div class="ib-hp"><span class="hplabel">HP</span><div class="hpbar"><i class="${hpClass(from)}" style="width:${from}%" data-to="${to}"></i></div></div>
    ${mine ? `<div class="ib-num">${Math.max(0, m.hp)} / ${max}</div>` : ""}
    ${xpPct !== null && battle.kind === "wild" ? `<div class="ib-xp"><i style="width:${xpPct}%"></i></div>` : ""}
  </div>`;
}

function battleMenu(b, mine, foe) {
  if (b.busy) return `<div class="menu-wait"></div>`;
  if (b.menu === "switch" || b.menu === "mustSwitch") {
    const party = b.kind === "wild" ? SV.party : b.myParty;
    const cur = b.kind === "wild" ? b.me : b.myActive;
    return `<div class="switch-list">${party.map((m, i) => `<button class="sw" ${m.hp <= 0 || i === cur ? "disabled" : ""} onclick="doSwitch(${i})">
        <img src="${ART_URL(POKEMON[m.id].dex)}" alt=""><span class="sw-name">${POKEMON[m.id].he}</span><span class="sw-lv">רמה ${m.lvl}</span>
        <div class="hpbar"><i class="${hpClass(100 * m.hp / wMaxHp(m))}" style="width:${Math.max(0, 100 * m.hp / wMaxHp(m))}%"></i></div></button>`).join("")}</div>
      ${b.menu === "switch" ? `<button class="back-btn" onclick="battle.menu='main'; showBattle()">↩ חזרה</button>` : ""}`;
  }
  if (b.menu === "waiting") return `<p class="wait">⏳ מחכים ל${escW(b.foeName || "יריב")}</p>`;
  if (b.menu === "over") return `<button class="big-go" onclick="endBattle()">המשך ▶</button>`;
  if (b.menu === "fight") {
    return `<div class="move-grid">${mine.moves.map((k, i) => {
      const mv = WMOVES[k];
      const mult = typeMult(mv[1], POKEMON[foe.id].types);
      const eff = mult > 1 ? `<em class="eff up">יעיל מאוד</em>` : mult === 0 ? `<em class="eff no">אין השפעה</em>` : mult < 1 ? `<em class="eff down">לא יעיל</em>` : "";
      return `<button class="bmove" style="--c:${TYPES[mv[1]].color}" onclick="useMove(${i})">
        <span class="mv-ic">${TYPES[mv[1]].icon}</span><span class="mv-txt"><b>${mv[0]}</b><small>עוצמה ${mv[2]} · ${TYPES[mv[1]].he}</small></span>${eff}</button>`;
    }).join("")}</div>
    <button class="back-btn" onclick="battle.menu='main'; showBattle()">↩ חזרה</button>`;
  }
  const wild = b.kind === "wild";
  return `<div class="main-menu">
    <button class="mm fight" onclick="battle.menu='fight'; showBattle()"><span>⚔️</span>קרב</button>
    <button class="mm ball" ${wild ? `onclick="throwBall()"` : "disabled"}><span class="mini-ball"></span>כדור</button>
    <button class="mm team" onclick="battle.menu='switch'; showBattle()"><span>🔄</span>פוקימונים</button>
    <button class="mm run" onclick="runAway()"><span>${wild ? "🏃" : "🏳️"}</span>${wild ? "ברח" : "כניעה"}</button>
  </div>`;
}

async function say(lines, ms = 900) {
  for (const l of [].concat(lines)) {
    battle.log = [l];
    showBattle();
    await wait(ms);
  }
}

/* תקיפה אחת, עם ההודעה והאפקט */
async function strike(att, def, moveKey, attIsMe) {
  const r = wDamage(att, def, moveKey);
  def.hp = Math.max(0, def.hp - r.dmg);
  if (r.hit && r.dmg) { if (attIsMe) battle.foeHit = true; else battle.meHit = true; }
  Sfx.play(!r.hit ? "miss" : r.mult > 1 ? "superhit" : attIsMe ? "hit" : "hurt");
  const who = `${POKEMON[att.id].he}${attIsMe ? "" : " הפראי"}`;
  await say(`${who} משתמש ב${WMOVES[moveKey][0]}!` + (!r.hit ? " פספס!" : r.mult === 0 ? " אין השפעה" : r.mult > 1 ? " יעיל מאוד!" : r.mult < 1 ? " לא כל כך יעיל" : "") + (r.crit ? " מכה קריטית!" : ""));
}

const foeMove = foe => foe.moves[wrnd(foe.moves.length)];

async function useMove(i) {
  const b = battle;
  if (b.busy) return;
  b.busy = true;
  const mine = SV.party[b.me], foe = b.foe;
  const myMv = mine.moves[i], fMv = foeMove(foe);
  // מול פוקימון פראי אני תמיד תוקף ראשון
  const order = [[mine, foe, myMv, true], [foe, mine, fMv, false]];
  for (const [a, d, mv, isMe] of order) {
    if (a.hp <= 0 || d.hp <= 0) continue;
    await strike(a, d, mv, isMe);
  }
  await afterRound();
}

async function foeTurn() {
  const b = battle;
  await strike(b.foe, SV.party[b.me], foeMove(b.foe), false);
  await afterRound();
}

async function afterRound() {
  const b = battle;
  if (b.foe.hp <= 0) return winWild();
  if (SV.party[b.me].hp <= 0) {
    await say(`${POKEMON[SV.party[b.me].id].he} התעלף!`);
    if (firstAlive(SV.party) < 0) return loseWild();
    b.busy = false;
    b.menu = "mustSwitch";
    return showBattle();
  }
  b.busy = false;
  b.menu = "main";
  showBattle();
}

async function doSwitch(i) {
  const b = battle;
  // קודם "מחכים", ורק אז שולחים: אצל המארח התשובה חוזרת מיד ומעדכנת את המסך
  if (b.kind === "pvp") { b.menu = "waiting"; showBattle(); WNet.act(b.bid, {kind: "switch", i}); return; }
  const forced = b.menu === "mustSwitch";
  b.me = i;
  b.busy = true;
  await say(`קדימה ${POKEMON[SV.party[i].id].he}!`, 700);
  if (forced) { b.busy = false; b.menu = "main"; return showBattle(); }
  await foeTurn();
}

async function throwBall() {
  const b = battle;
  if (b.busy) return;
  b.busy = true;
  Sfx.play("throw");
  b.ballAnim = "fly";
  await say("זורקים כדור!", 700);
  const ok = Math.random() < wCatchChance(b.foe);
  b.caught = true;
  b.ballAnim = "shake";
  for (let k = 0; k < 3; k++) { Sfx.play("wobble"); await say(".".repeat(k + 1), 550); if (!ok && k === 1 && Math.random() < .5) break; }
  b.ballAnim = null;
  if (ok) {
    Sfx.play("caught");
    const mon = tameMon(b.foe);
    mon.xp = 0;
    const where = SV.party.length < W_MAX_PARTY ? "party" : "box";
    SV[where].push(mon);
    SV.catches++;
    Profile.markCaught(mon.id);
    WSave.save();
    await say(`תפסת את ${POKEMON[mon.id].he}!` + (where === "box" ? " הוא נשלח לקופסה." : ""), 1200);
    await xpScreen(wXpFor(mon, false), "", mon);
    WSave.save();
    b.menu = "over";
    b.busy = false;
    return showBattle();
  }
  b.caught = false;
  Profile.markTry();
  Sfx.play("escape");
  await say(`${POKEMON[b.foe.id].he} השתחרר!`);
  await foeTurn();
}

async function runAway() {
  const b = battle;
  if (b.busy) return;
  if (b.kind === "pvp") { WNet.quit(b.bid); return; }
  b.busy = true;
  if (Math.random() < .85) { await say("ברחת בשלום!", 700); return endBattle(); }
  await say("לא הצלחת לברוח!");
  await foeTurn();
}

async function winWild() {
  const b = battle;
  const mine = SV.party[b.me];
  Sfx.play("win");
  await say(`${POKEMON[b.foe.id].he} הפראי התעלף!`);
  const coins = 8 + b.foe.lvl * 2;
  SV.coins += coins;
  await xpScreen(wXpFor(b.foe, false), `🪙 +${coins}`);
  WSave.save();
  b.menu = "over";
  b.busy = false;
  showBattle();
}

async function loseWild() {
  Sfx.play("lose");
  await say("כל הפוקימונים שלך התעלפו... חוזרים למרכז הפוקימון.", 1600);
  healParty(SV.party);
  World3D.toCenter();
  WSave.save();
  endBattle();
}

/* אירועי התקדמות: רמה, מתקפה חדשה, התפתחות */
async function growth(mon, events) {
  for (const e of events) {
    if (e.kind === "level" && !e.shown) { Sfx.play("turn"); await say(`${POKEMON[mon.id].he} עלה לרמה ${e.lvl}!`, 1000); }
    if (e.kind === "learn") await say(`${POKEMON[mon.id].he} למד ${WMOVES[e.move][0]}!`, 1000);
    if (e.kind === "choose") await chooseForget(mon, e.move);
    if (e.kind === "evolve") {
      await say(`מה? ${POKEMON[e.from].he} מתפתח!`, 1300);
      evolveMon(mon, e.to);
      Profile.markCaught(e.to);
      Sfx.play("caught");
      await say(`${POKEMON[e.from].he} התפתח ל${POKEMON[e.to].he}! ✨`, 1600);
      if (SV.party[0] === mon) World3D.setLead(mon.id);
    }
  }
  renderHud();
}

/* ---------- מסך הניסיון ----------
   אחרי כל קרב ותפיסה כל הצוות מקבל ניסיון (גם מי שלא נלחם, כמו שיתוף
   ניסיון). כל פוקימון מקבל שורה עם מד שמתמלא, ואם המד מגיע לסוף -
   "רמה עלתה!" והמד מתחיל מחדש. אחרי "המשך" מגיעים המתקפות החדשות
   וההתפתחויות, אחד אחרי השני. */
async function xpScreen(amount, extra, skip) {
  const rows = SV.party.filter(m => m.hp > 0 && m !== skip).map(m => {
    const before = {lvl: m.lvl, xp: m.xp};
    const events = gainXp(m, amount);
    events.forEach(e => { if (e.kind === "level") e.shown = true; });
    return {m, before, events};
  });
  if (!rows.length) return;
  const el = document.createElement("div");
  el.className = "xpscreen";
  el.innerHTML = `<div class="xpbox"><h2>⭐ ניסיון +${amount}${extra ? ` <small>${extra}</small>` : ""}</h2>
    ${rows.map((r, i) => `<div class="xprow" data-i="${i}">
      <img src="${ART_URL(POKEMON[r.m.id].dex)}" alt="">
      <div class="xpinfo"><b>${POKEMON[r.m.id].he}</b> <span class="xplvl">רמה ${r.before.lvl}</span><span class="xpup"></span>
        <div class="xpbar"><i style="width:${Math.round(100 * r.before.xp / xpToNext(r.before.lvl))}%"></i></div></div>
      <span class="xpgain">+${amount}</span></div>`).join("")}
    <button class="bbtn primary xpgo" disabled>המשך</button></div>`;
  $w("#battle").appendChild(el);
  Sfx.play("turn");
  await wait(350);
  // כל המדים מתמלאים יחד
  await Promise.all(rows.map((r, i) => fillBar(el.querySelector(`.xprow[data-i="${i}"]`), r)));
  const go = el.querySelector(".xpgo");
  go.disabled = false;
  await new Promise(res => { go.onclick = res; });
  el.remove();
  for (const r of rows) {
    if (r.events.some(e => e.kind !== "level")) await growth(r.m, r.events);
  }
  renderHud();
}

async function fillBar(row, r) {
  const bar = row.querySelector(".xpbar i"), lvl = row.querySelector(".xplvl"), up = row.querySelector(".xpup");
  let L = r.before.lvl;
  const step = async (pct, ms) => {
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = pct + "%";
    await wait(ms + 40);
  };
  while (L < r.m.lvl) {
    await step(100, 650);
    L++;
    lvl.textContent = `רמה ${L}`;
    up.textContent = " ⬆ רמה עלתה!";
    row.classList.remove("lvlup"); void row.offsetWidth; row.classList.add("lvlup");
    Sfx.play("caught");
    bar.style.transition = "none";
    bar.style.width = "0%";
    await wait(60);
  }
  await step(Math.round(100 * r.m.xp / xpToNext(r.m.lvl)), 700);
}

function chooseForget(mon, move) {
  return new Promise(res => {
    battle.log = [`${POKEMON[mon.id].he} רוצה ללמוד ${WMOVES[move][0]}. איזו מתקפה לשכוח?`];
    showBattle();
    $w("#battle .bactions").innerHTML = `<div class="move-grid">${mon.moves.map((k, j) =>
      `<button class="bmove" style="--c:${TYPES[WMOVES[k][1]].color}" data-j="${j}"><b>${WMOVES[k][0]}</b></button>`).join("")}</div>
      <button class="back-btn" data-j="-1">לא ללמוד</button>`;
    $w("#battle .bactions").onclick = async e => {
      const btn = e.target.closest("[data-j]");
      if (!btn) return;
      $w("#battle .bactions").onclick = null;
      const j = Number(btn.dataset.j);
      if (j >= 0) { mon.moves[j] = move; await say(`${POKEMON[mon.id].he} למד ${WMOVES[move][0]}!`, 900); }
      res();
    };
  });
}

function endBattle() {
  const b = battle;
  if (!b) return;
  if (b.kind === "wild") World3D.removeWild(b.uid);
  battle = null;
  $w("#battle").hidden = true;
  World3D.pause(false);
  World3D.setLead(SV.party[0].id);
  renderHud();
  onPlace(place);
  WSave.save();
}

/* ---------- קרב נגד שחקן ---------- */

function onChallenge(from, name) {
  if (battle) { WNet.answer(from, false); return; }
  pendingChallenge = from;
  Sfx.play("turn");
  modal(`<h2>⚔️ ${escW(name)} מזמין אותך לקרב!</h2>
    <div class="row2"><button class="wbtn" onclick="answerChallenge(false)">לא עכשיו</button>
    <button class="wbtn primary" onclick="answerChallenge(true)">לקרב!</button></div>`);
}

function answerChallenge(ok) {
  closeModal();
  if (pendingChallenge) WNet.answer(pendingChallenge, ok);
  pendingChallenge = null;
}

function onAnswer(from, ok, busy) {
  const name = (worldPlayers[from] || {}).name || "השחקן";
  if (!ok) toast(busy ? `${name} באמצע קרב` : `${name} לא רוצה עכשיו`);
}

function onPvp(st) {
  if (!st) {
    if (battle && battle.kind === "pvp") { toast("החיבור נקטע"); endBattle(); }
    return;
  }
  if (st.phase === "party") {
    closeModal();
    World3D.pause(true);
    $w("#actBtn").hidden = true;
    battle = {kind: "pvp", bid: st.bid, log: ["מתכוננים לקרב..."], busy: true, menu: "main"};
    WNet.sendParty(st.bid, SV.party.map(m => ({uid: m.uid, id: m.id, lvl: m.lvl, moves: m.moves})));
    showBattle.pvpWaiting = true;
    return;
  }
  if (!battle || battle.kind !== "pvp" || battle.bid !== st.bid) return;
  const b = battle;
  const mineS = st.sides.find(s => s.pid === WNet.myPid), foeS = st.sides.find(s => s.pid !== WNet.myPid);
  if (!mineS || !foeS || !mineS.party || !foeS.party) return;
  b.myParty = mineS.party;
  b.myActive = mineS.active;
  b.myMon = mineS.party[mineS.active];
  b.foeMon = foeS.party[foeS.active];
  b.foeName = foeS.name;
  if (st.fx) st.fx.forEach(f => { if (f.hit && f.dmg) { if (f.by === WNet.myPid) b.foeHit = true; else b.meHit = true; } });
  if (st.fx && st.fx.length) Sfx.play(st.fx.some(f => f.mult > 1) ? "superhit" : "hit");
  b.log = st.log && st.log.length ? st.log : [`קרב נגד ${foeS.name}!`];
  b.busy = false;
  if (st.phase === "over") {
    const won = st.over === WNet.myPid;
    b.menu = "over";
    Sfx.play(won ? "win" : "lose");
    if (won) {
      SV.wins++;
      SV.coins += 80;
      const foeLvl = Math.round(foeS.party.reduce((s, m) => s + m.lvl, 0) / foeS.party.length);
      b.log = [...b.log, "ניצחת!"];
      showBattle();
      xpScreen(wXpFor({lvl: foeLvl}, true), "🪙 +80").then(() => { b.menu = "over"; showBattle(); WSave.save(); });
      return;
    }
  } else if (mineS.need) b.menu = "mustSwitch";
  else if (mineS.ready) b.menu = "waiting";
  else b.menu = "main";
  showBattle();
}

/* בקרב נגד שחקן הכפתורים שולחים למארח במקום לחשב כאן */
const _useMove = useMove;
useMove = async function (i) {
  if (battle && battle.kind === "pvp") { battle.menu = "waiting"; showBattle(); WNet.act(battle.bid, {kind: "move", i}); return; }
  return _useMove(i);
};

/* ---------- הפעלה ---------- */

function boot() {
  if (!window.World3D || !World3D.ok) {
    document.body.innerHTML = `<p class="nogl">העולם צריך תלת-ממד, והמכשיר הזה לא תומך בזה. <a href="index.html">חזרה</a></p>`;
    return;
  }
  SV = WSave.load();
  if (!SV) chooseStarter();
  else enterWorld();
}

if (window.World3D) boot();
else addEventListener("world3d-ready", boot, {once: true});
