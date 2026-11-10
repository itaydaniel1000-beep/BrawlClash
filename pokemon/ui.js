/* ===== תצוגה =====
   לובי, חדר המתנה והשולחן. כל טלפון מצייר את אותו מצב שהמארח שולח,
   מנקודת המבט של השחקן שמחזיק אותו: הוא יושב למטה, ופועל רק בתור שלו. */

const NAME_KEY = "pokemon-table-name";
const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

let S = null;                 // המצב האחרון שהגיע מהמארח
const ui = {
  screen: "home",             // home | mode | randomCount | roomMenu | createCount | joinCode | connecting | game
  name: "",
  carousel: 0,
  attackOpen: false,
  deadline: 0,
  total: 0,
  note: "",
  status: "",
  busy: false
};

const me = () => S && S.players.find(p => p.pid === Net.myPid);
const currentPid = () => S && S.order && S.order[S.pos];
const isMyTurn = () => currentPid() === Net.myPid;
const playerName = pid => (S.players.find(p => p.pid === pid) || {}).name || "";

/* ---------- רכיבים ---------- */

const DIE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function typeBadges(types) {
  return types.map(t => `<span class="type" style="background:${TYPES[t].color}">${TYPES[t].icon} ${TYPES[t].he}</span>`).join("");
}

function hpBar(m) {
  const pct = Math.round(100 * m.hp / m.maxHp);
  const cls = pct > 50 ? "good" : pct > 20 ? "mid" : "low";
  return `<div class="hp"><div class="hp-fill ${cls}" style="width:${pct}%"></div></div>
          <div class="hp-text">❤️ ${m.hp}/${m.maxHp}</div>`;
}

function cardHTML(m, extra = "") {
  const d = POKEMON[m.id];
  const t1 = TYPES[d.types[0]], t2 = TYPES[d.types[1] || d.types[0]];
  const dead = m.hp <= 0 ? " fainted" : "";
  return `<div class="card${dead}" style="--c1:${t1.color};--c2:${t2.color}">
    <div class="card-art"><img src="${ART_URL(d.dex)}" alt="${d.he}" onerror="this.replaceWith(document.createTextNode('${t1.icon}'))"></div>
    <div class="card-name">${d.he}</div>
    <div class="card-types">${typeBadges(d.types)}</div>
    ${hpBar(m)}
    <div class="card-power">⚔️ חוזק ${d.power}</div>
    ${extra}
  </div>`;
}

function seatPos(i, n) {
  const a = (90 + i * 360 / n) * Math.PI / 180;
  return {x: 50 + 42 * Math.cos(a), y: 50 + 41 * Math.sin(a)};
}

/* ---------- השולחן ---------- */

function renderTable() {
  const t = $("#table");
  if (!S || ui.screen !== "game") {
    t.innerHTML = `<div class="felt"><div class="center"><div class="logo">פוקימון<br><small>שולחן ההרפתקה</small></div></div></div>`;
    return;
  }
  const n = S.players.length;
  const myIndex = Math.max(0, S.players.findIndex(p => p.pid === Net.myPid));
  const cur = ["turn", "starterPick", "anim", "wheel"].includes(S.phase) ? currentPid() : null;
  const rolling = S.phase === "starterRoll" || S.phase === "roundRoll";
  const seats = S.players.map((p, i) => {
    const {x, y} = seatPos((i - myIndex + n) % n, n);
    const dots = p.team.map(m => `<i class="dot${m.hp <= 0 ? " dead" : ""}" style="background:${TYPES[POKEMON[m.id].types[0]].color}"></i>`).join("");
    let die = "";
    if (p.roll) die = `<span class="die">${DIE[p.roll]}</span>`;
    else if (rolling) die = `<span class="die waiting">🎲</span>`;
    const mine = p.pid === Net.myPid;
    return `<button class="seat${p.pid === cur ? " active" : ""}${mine ? " mine" : ""}" style="left:${x}%;top:${y}%" onclick="showTeam('${p.pid}')">
      <div class="seat-name">${esc(p.name)}${mine ? " (אתה)" : ""} ${die}</div>
      <div class="seat-team">${dots || (S.phase === "waiting" ? "<span class='muted'>מוכן</span>" : "<span class='muted'>אין עדיין</span>")}</div>
    </button>`;
  }).join("");

  let center;
  if (S.wild) {
    const chance = S.wild.boss ? "" : `<div class="chance">🎯 תפיסה ${Math.round(catchChance(S.wild) * 100)}%</div>`;
    center = `<div class="wild-card${S.wild.boss ? " boss" : ""}">${cardHTML(S.wild, chance)}</div>`;
  } else if (S.phase === "waiting") {
    center = `<div class="logo">${S.players.length}/${S.N}<br><small>מחכים לשחקנים</small></div>`;
  } else {
    center = `<div class="logo">פוקימון<br><small>שולחן ההרפתקה</small></div>`;
  }
  const deck = S.deck ? `<div class="deck" title="חבילה"><div class="deck-back">🎴</div><div>${S.deck.length}</div></div>` : "";
  const clinic = S.deck ? `<div class="clinic" title="מרפאה">🏥 בעוד ${CONFIG.clinicEvery - (S.resolved % CONFIG.clinicEvery)}</div>` : "";
  t.innerHTML = `<div class="felt"><div class="center">${center}</div>${deck}${clinic}</div>${seats}`;
}

/* ---------- לוח הפעולות ---------- */

function countBtns(fn) {
  return `<div class="row counts">${[2, 3, 4, 5].map(k => `<button class="btn" onclick="${fn}(${k})">${k}</button>`).join("")}</div>`;
}

function renderPanel() {
  const el = $("#panel");
  const note = ui.note ? `<p class="note">${esc(ui.note)}</p>` : "";
  switch (ui.screen) {
    case "home":
      el.innerHTML = ui.name
        ? `<h2>שלום ${esc(ui.name)}!</h2>${note}
           <button class="btn primary big" onclick="go('mode')">משחק</button>
           <button class="btn small linkish" onclick="editName()">שינוי שם</button>`
        : `<h2>איך קוראים לך?</h2>${note}
           <input class="name" id="nameInput" maxlength="12" placeholder="השם שלך" autocomplete="off">
           <button class="btn primary big" onclick="saveName()">המשך</button>`;
      break;
    case "mode":
      el.innerHTML = `<h2>איך משחקים?</h2>
        <div class="row">
          <button class="btn primary big" onclick="go('randomCount')">🎲 אקראי</button>
          <button class="btn primary big" onclick="go('roomMenu')">🚪 חדר</button>
        </div>
        <button class="btn" onclick="go('home')">↩ חזור</button>`;
      break;
    case "randomCount":
      el.innerHTML = `<h2>משחק אקראי</h2><p>כמה שחקנים? נתאים לך שחקנים שבחרו אותו מספר.</p>
        ${countBtns("startRandom")}<button class="btn" onclick="go('mode')">↩ חזור</button>`;
      break;
    case "roomMenu":
      el.innerHTML = `<h2>חדר</h2>
        <div class="row">
          <button class="btn primary big" onclick="go('createCount')">יצירת חדר</button>
          <button class="btn primary big" onclick="go('joinCode')">כניסה לחדר</button>
        </div>
        <button class="btn" onclick="go('mode')">↩ חזור</button>`;
      break;
    case "createCount":
      el.innerHTML = `<h2>יצירת חדר</h2><p>כמה שחקנים יהיו בחדר? המשחק יתחיל ברגע שכולם ייכנסו.</p>
        ${countBtns("startCreate")}<button class="btn" onclick="go('roomMenu')">↩ חזור</button>`;
      break;
    case "joinCode":
      el.innerHTML = `<h2>מה הקוד של החדר?</h2>${note}
        <input class="name code" id="codeInput" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="קוד" autocomplete="off">
        <div class="row">
          <button class="btn" onclick="go('roomMenu')">↩ חזור</button>
          <button class="btn primary" onclick="startJoin()">כניסה</button>
        </div>`;
      break;
    case "connecting":
      el.innerHTML = `<h2>${esc(ui.connectingText || "מתחברים...")}</h2><div class="spinner"></div>
        <button class="btn" onclick="leaveGame()">ביטול</button>`;
      break;
    case "game":
      el.innerHTML = gamePanel();
      break;
  }
  const status = ui.status ? `<div class="status">${esc(ui.status)}</div>` : "";
  el.insertAdjacentHTML("afterbegin", status);
  $("#leaveBtn").hidden = ui.screen !== "game";
}

function timerBar() {
  if (!ui.total) return "";
  return `<div class="timer"><div class="timer-fill" id="timerFill"></div><span id="timerText"></span></div>`;
}

function gamePanel() {
  const curName = esc(playerName(currentPid()));
  const wildName = S.wild ? POKEMON[S.wild.id].he : "";
  const my = me();
  let html = "";
  switch (S.phase) {
    case "waiting":
      html = S.mode === "room"
        ? `<h2>החדר שלך</h2><div class="room-code">${esc(S.code)}</div>
           <p>תן את הקוד לחברים. המשחק יתחיל כשייכנסו ${S.N} שחקנים (${S.players.length}/${S.N}).</p>`
        : `<h2>מחפשים שחקנים...</h2><div class="spinner"></div>
           <p>${S.players.length} מתוך ${S.N} שחקנים. המשחק יתחיל כשכולם יגיעו.</p>`;
      html += `<ul class="who">${S.players.map(p => `<li>${esc(p.name)}${p.pid === Net.myPid ? " (אתה)" : ""}</li>`).join("")}</ul>`;
      break;
    case "starterRoll":
    case "roundRoll": {
      const title = S.phase === "starterRoll" ? "מי בוחר ראשון?" : `מי ראשון מול ${wildName}?`;
      const waitingFor = S.players.filter(p => p.roll === null).map(p => esc(p.name));
      html = `<h2>${title}</h2>${timerBar()}` + (my && my.roll === null
        ? `<p>כל שחקן מטיל את הקובייה שלו. הגבוה ראשון.</p>
           <button class="btn primary big" onclick="Net.act({t:'roll'})">🎲 הטל את הקובייה שלי</button>`
        : `<p>הטלת ${DIE[my ? my.roll : 0] || ""}. מחכים ל: ${waitingFor.join(", ")}</p>`);
      break;
    }
    case "starterPick":
      html = isMyTurn()
        ? `<h2>בחר פוקימון התחלתי</h2>${timerBar()}` + carouselHTML(S.starterPool.map(makeMon), "pickStarterAt", false)
        : `<h2>${curName} בוחר פוקימון התחלתי</h2>${timerBar()}<p>נשארו: ${S.starterPool.map(id => POKEMON[id].he).join(", ")}</p>`;
      break;
    case "turn":
      if (!isMyTurn()) {
        html = `<h2>התור של ${curName}</h2>${timerBar()}<p>מחכים שיחליט: לתקוף או לתפוס.</p>`;
      } else if (ui.attackOpen) {
        html = `<h2>עם מי לתקוף?</h2>${timerBar()}` + carouselHTML(my.team, "attackAt", true);
      } else {
        html = `<h2>התור שלך!</h2>${timerBar()}
          <p>מה תעשה מול ${wildName}?</p>
          <div class="row">
            <button class="btn attack" onclick="openAttack()">⚔️ תקוף</button>
            ${S.wild.boss ? "" : `<button class="btn catch" onclick="openCatch()">🔴 תפוס</button>`}
          </div>`;
      }
      break;
    case "anim":
    case "wheel":
      html = `<h2>${esc(S.action || "")}</h2>`;
      break;
    case "message":
      html = `<h2>${esc(S.message.title)}</h2><p class="pre">${esc(S.message.text)}</p>${timerBar()}`;
      break;
    case "end":
      html = `<h2>${S.win ? "🏆 ניצחתם את ההרפתקה!" : "💫 הפסדתם את ההרפתקה"}</h2>
        <p>${S.win ? `כל הכבוד! ${POKEMON[CONFIG.boss.id].he} הובס.` : "לאף שחקן לא נשאר פוקימון חי."} הרפתקה חדשה מתחילה בעוד רגע.</p>
        ${timerBar()}
        <button class="btn" onclick="leaveGame()">יציאה ללובי</button>`;
      break;
  }
  if (S.log && S.log.length && S.phase !== "waiting") {
    html += `<details class="log"><summary>מה קרה עד עכשיו</summary><ul>${S.log.map(l => `<li>${esc(l)}</li>`).join("")}</ul></details>`;
  }
  return html;
}

/* קרוסלה: פוקימון אחד בכל פעם, חצים ימינה ושמאלה, חזור */
function carouselHTML(mons, onPick, withBack) {
  if (!mons.length) return "";
  ui.carousel = ((ui.carousel % mons.length) + mons.length) % mons.length;
  const m = mons[ui.carousel];
  let vs = "";
  if (S.wild && withBack) {
    const {mult, dmg} = damageOf(m.id, S.wild.id);
    vs = `<div class="vs ${mult > 1 ? "up" : mult < 1 ? "down" : ""}">מוריד ${dmg} • ${multText(mult)}</div>`;
  }
  return `<div class="carousel">
      <button class="arrow" onclick="moveCarousel(-1)" aria-label="הקודם">▶</button>
      <div class="carousel-card">${cardHTML(m, vs)}<div class="count">${ui.carousel + 1} מתוך ${mons.length}</div></div>
      <button class="arrow" onclick="moveCarousel(1)" aria-label="הבא">◀</button>
    </div>
    <div class="row">
      ${withBack ? `<button class="btn" onclick="backToTurn()">↩ חזור</button>` : ""}
      <button class="btn primary" ${m.hp <= 0 ? "disabled" : ""} onclick="${onPick}(${ui.carousel})">${m.hp <= 0 ? "התעלף" : "בחר"}</button>
    </div>`;
}

function moveCarousel(d) { ui.carousel += d; renderPanel(); tickTimer(); }
function pickStarterAt(i) { Net.act({t: "pick", id: S.starterPool[i]}); }
function attackAt(i) { ui.attackOpen = false; Net.act({t: "attack", index: i}); }
function openAttack() { ui.attackOpen = true; ui.carousel = 0; renderPanel(); tickTimer(); }
function backToTurn() { ui.attackOpen = false; renderPanel(); tickTimer(); }

/* תפיסה: "בטוח?" עם הסיכויים מעל */
function openCatch() {
  const pct = Math.round(catchChance(S.wild) * 100);
  modal(`<div class="odds">סיכויי תפיסה: <b>${pct}%</b></div>
    <h2>בטוח?</h2>
    <p>לתפוס את ${POKEMON[S.wild.id].he}?</p>
    <div class="row">
      <button class="btn" onclick="closeModal()">לא</button>
      <button class="btn primary" onclick="closeModal(); Net.act({t:'catch'})">כן</button>
    </div>`, "catch");
}

/* גלגל המזל - כולם רואים אותו מסתובב בדיוק לאותה נקודה */
function playWheel() {
  const w = S.wheel;
  if (!w) return;
  const who = w.pid === Net.myPid ? "אתה מנסה" : `${esc(playerName(w.pid))} מנסה`;
  modal(`<h2>גלגל המזל</h2><p>${who} לתפוס את ${POKEMON[S.wild.id].he}</p>
    <div class="wheel-wrap"><div class="pointer">▼</div><canvas id="wheel" width="520" height="520"></canvas></div>
    <div id="wheelResult" class="wheel-result">&nbsp;</div>`, "wheel");
  drawWheel($("#wheel"), w.chance);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const c = $("#wheel");
    if (c) c.style.transform = `rotate(${w.turn}deg)`;
  }));
  setTimeout(() => {
    const r = $("#wheelResult");
    if (r) r.innerHTML = w.success ? `<b class="ok">נתפס! 🎉</b>` : `<b class="bad">ברח! 💨</b>`;
  }, 3500);
}

function drawWheel(c, chance) {
  const ctx = c.getContext("2d"), r = c.width / 2;
  const segs = [[chance, "#2fbf71", "נתפס"], [1 - chance, "#e0464e", "ברח"]];
  let a = -Math.PI / 2;
  for (const [frac, color, label] of segs) {
    if (frac <= 0) continue;
    const b = a + frac * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(r, r); ctx.arc(r, r, r - 6, a, b); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.stroke();
    if (frac > 0.08) {
      const mid = (a + b) / 2;
      ctx.save(); ctx.translate(r + Math.cos(mid) * r * .6, r + Math.sin(mid) * r * .6);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = "#fff"; ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0); ctx.restore();
    }
    a = b;
  }
  ctx.beginPath(); ctx.arc(r, r, 40, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = "#222"; ctx.stroke();
}

function flashDamage(dmg, mult) {
  const el = $(".wild-card");
  if (!el) return;
  el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit");
  const f = document.createElement("div");
  f.className = "float" + (mult > 1 ? " up" : mult < 1 ? " down" : "");
  f.textContent = mult === 0 ? "אין השפעה" : `‎-${dmg}`;
  el.appendChild(f);
}

function showTeam(pid) {
  const p = S && S.players.find(x => x.pid === pid);
  if (!p || ui.modalKind === "wheel") return;
  modal(`<h2>הפוקימונים של ${esc(p.name)}</h2>
    <div class="team-grid">${p.team.map(m => cardHTML(m)).join("") || "<p>אין עדיין פוקימונים</p>"}</div>
    <button class="btn primary" onclick="closeModal()">סגור</button>`, "team");
}

function modal(html, kind) {
  ui.modalKind = kind;
  $("#modal").innerHTML = `<div class="modal-box">${html}</div>`;
  $("#modal").hidden = false;
}
function closeModal() {
  ui.modalKind = null;
  $("#modal").hidden = true;
  $("#modal").innerHTML = "";
}

/* ---------- טיימר ---------- */

function tickTimer() {
  const fill = $("#timerFill"), text = $("#timerText");
  if (!fill || !ui.total) return;
  const left = Math.max(0, ui.deadline - Date.now());
  fill.style.width = `${100 * left / ui.total}%`;
  fill.classList.toggle("low", left < 5000);
  text.textContent = Math.ceil(left / 1000);
}
setInterval(tickTimer, 200);

/* ---------- הגעת מצב מהמארח ---------- */

function onState(msg) {
  const prevPhase = S && S.phase;
  const prevTurn = S && currentPid();
  S = msg.S;
  ui.deadline = Date.now() + (msg.remaining || 0);
  ui.total = msg.remaining ? msg.total : 0;
  if (ui.screen !== "game") { ui.screen = "game"; ui.note = ""; }

  // התור עבר - סוגרים חלונות שנשארו פתוחים
  if (S.phase !== "turn" || currentPid() !== prevTurn || !isMyTurn()) ui.attackOpen = false;
  if (ui.modalKind === "catch" && (S.phase !== "turn" || !isMyTurn())) closeModal();
  if (ui.modalKind === "wheel" && S.phase !== "wheel") closeModal();
  if (S.phase !== prevPhase && S.phase === "starterPick") ui.carousel = 0;
  if (S.phase === "starterPick" && currentPid() !== prevTurn) ui.carousel = 0;

  renderTable();
  renderPanel();
  tickTimer();
  if (msg.fx && msg.fx.kind === "damage") flashDamage(msg.fx.dmg, msg.fx.mult);
  if (msg.fx && msg.fx.kind === "wheel") playWheel();
}

/* ---------- ניווט בלובי ---------- */

function go(screen) { ui.screen = screen; ui.note = ""; render(); }

function saveName() {
  const v = ($("#nameInput").value || "").trim();
  if (!v) { ui.note = "צריך להקליד שם"; return render(); }
  ui.name = v;
  Net.setName(v);
  try { localStorage.setItem(NAME_KEY, v); } catch (e) {}
  ui.note = "";
  render();
}
function editName() { ui.name = ""; render(); }

async function connecting(text, job) {
  ui.screen = "connecting";
  ui.connectingText = text;
  render();
  try {
    await job();
  } catch (e) {
    console.error(e);
    Net.leave(true);
    ui.screen = "home";
    ui.note = "אין חיבור לשרת המשחק. בדוק את האינטרנט ונסה שוב.";
    render();
  }
}

function startRandom(n) {
  connecting(`מחפשים משחק ל-${n} שחקנים...`, () => Net.randomMatch(n));
}

function startCreate(n) {
  connecting("פותחים חדר...", () => Net.createRoom(n));
}

function startJoin() {
  const code = ($("#codeInput").value || "").replace(/\D/g, "");
  if (!code) { ui.note = "צריך להקליד קוד"; return render(); }
  connecting(`נכנסים לחדר ${code}...`, async () => {
    const r = await Net.joinRoom(code);
    if (r === "ok") return;
    Net.leave(true);
    ui.screen = "joinCode";
    ui.note = r === "full" ? "החדר מלא, או שהמשחק בו כבר התחיל." : `לא נמצא חדר עם הקוד ${code}.`;
    render();
  });
}

function confirmLeave() {
  modal(`<h2>לצאת מהמשחק?</h2><p>הפוקימונים שלך יחזרו לחבילה, והמשחק ימשיך בלעדיך.</p>
    <div class="row"><button class="btn" onclick="closeModal()">לא</button>
    <button class="btn primary" onclick="closeModal(); leaveGame()">כן</button></div>`, "leave");
}

function leaveGame() {
  Net.leave();
  S = null;
  ui.screen = "home";
  ui.status = "";
  ui.attackOpen = false;
  closeModal();
  render();
}

function render() {
  renderTable();
  renderPanel();
  tickTimer();
}

Net.setUI({
  onState,
  onStatus: text => { ui.status = text; renderPanel(); tickTimer(); },
  onLeft: text => {
    S = null;
    ui.screen = "home";
    ui.status = "";
    ui.note = text;
    closeModal();
    render();
  }
});

try { ui.name = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
Net.setName(ui.name);
render();
