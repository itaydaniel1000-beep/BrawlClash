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
  const inGame = !!S && ui.screen === "game";
  document.body.classList.toggle("in-game", inGame);
  if (!inGame) {
    if (window.Arena && Arena.ok) Arena.unmount();
    t.innerHTML = "";
    t.className = "table";
    return;
  }
  if (window.Arena && Arena.ok) return renderArena(t);
  renderFelt(t);
}

/* זירת תלת-ממד: הקנבס נשאר, ורק השכבות של HTML מתעדכנות */
function renderArena(t) {
  if (!t.querySelector(".arena-canvas")) {
    t.className = "table arena";
    t.innerHTML = `<div class="hud"></div><div class="tags"></div><div class="fx-layer"></div>`;
    Arena.mount(t);
  }
  const cur = ["turn", "starterPick", "anim", "wheel"].includes(S.phase) ? currentPid() : null;
  const rolling = S.phase === "starterRoll" || S.phase === "roundRoll";
  t.querySelector(".tags").innerHTML = S.players.map(p => {
    let die = "";
    if (rolling) die = `<span class="die${p.ready ? "" : " waiting"}">${p.ready ? "✅" : "⏳"}</span>`;
    else if (p.roll && S.phase !== "dice") die = `<span class="die">${DIE[p.roll]}</span>`;
    const mine = p.pid === Net.myPid;
    const dots = p.team.map(m => `<i class="dot${m.hp <= 0 ? " dead" : ""}" style="background:${TYPES[POKEMON[m.id].types[0]].color}"></i>`).join("");
    return `<button class="tag${p.pid === cur ? " active" : ""}${mine ? " mine" : ""}" data-pid="${p.pid}" onclick="showTeam('${p.pid}')">
      <span class="tag-name">${esc(p.name)} ${die}</span>
      <span class="seat-team">${dots}</span>
    </button>`;
  }).join("");

  let hud = "";
  if (S.wild) {
    const d = POKEMON[S.wild.id];
    const pct = Math.round(100 * S.wild.hp / S.wild.maxHp);
    const cls = pct > 50 ? "good" : pct > 20 ? "mid" : "low";
    hud += `<div class="wild-hud${S.wild.boss ? " boss" : ""}">
      <div class="wh-top"><b>${d.he}</b><span class="card-types">${typeBadges(d.types)}</span></div>
      <div class="hp"><div class="hp-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="wh-bottom"><span>❤️ ${S.wild.hp}/${S.wild.maxHp}</span>${S.wild.boss ? "" : `<span>🔢 ${numsLeft()}</span>`}</div>
    </div>`;
  } else if (S.phase === "waiting") {
    hud += `<div class="wild-hud wait"><b>${S.players.length}/${S.N}</b></div>`;
  }
  if (S.deck) {
    hud += `<div class="chips"><span class="chip" title="חבילה">🎴 ${S.deck.length}</span>
      <span class="chip" title="מרפאה">🏥 ${CONFIG.clinicEvery - (S.resolved % CONFIG.clinicEvery)}</span></div>`;
  }
  t.querySelector(".hud").innerHTML = hud;
}

/* גיבוי: אם אין תלת-ממד בטלפון, מציירים את השולחן הישן */
function renderFelt(t) {
  t.className = "table";
  const n = S.players.length;
  const myIndex = Math.max(0, S.players.findIndex(p => p.pid === Net.myPid));
  const cur = ["turn", "starterPick", "anim", "wheel"].includes(S.phase) ? currentPid() : null;
  const rolling = S.phase === "starterRoll" || S.phase === "roundRoll";
  const seats = S.players.map((p, i) => {
    const {x, y} = seatPos((i - myIndex + n) % n, n);
    const dots = p.team.map(m => `<i class="dot${m.hp <= 0 ? " dead" : ""}" style="background:${TYPES[POKEMON[m.id].types[0]].color}"></i>`).join("");
    let die = "";
    if (rolling) die = `<span class="die${p.ready ? "" : " waiting"}">${p.ready ? "✅" : "⏳"}</span>`;
    else if (p.roll) die = `<span class="die">${DIE[p.roll]}</span>`;
    const mine = p.pid === Net.myPid;
    return `<button class="seat${p.pid === cur ? " active" : ""}${mine ? " mine" : ""}" style="left:${x}%;top:${y}%" onclick="showTeam('${p.pid}')">
      <div class="seat-name">${esc(p.name)}${mine ? " (אתה)" : ""} ${die}</div>
      <div class="seat-team">${dots || (S.phase === "waiting" ? "<span class='muted'>מוכן</span>" : "<span class='muted'>אין עדיין</span>")}</div>
    </button>`;
  }).join("");

  let center;
  if (S.wild) {
    const chance = S.wild.boss ? "" : `<div class="chance">🔢 ${numsLeft()}</div>`;
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

/* ---------- מסכי הלובי ---------- */

const pct = (a, b) => b ? Math.round(100 * a / b) : 0;

function trainerCard() {
  const P = Profile.get();
  const list = Profile.dexList();
  const caught = list.filter(id => P.caught[id]).length;
  const st = P.stats;
  const fav = Object.entries(P.caught).sort((a, b) => b[1] - a[1])[0];
  const avatar = fav ? `<img src="${ART_URL(POKEMON[fav[0]].dex)}" alt="">` : `<span class="ball-icon"></span>`;
  return `<div class="trainer">
    <div class="avatar">${avatar}</div>
    <div class="t-info">
      <div class="t-name">${esc(ui.name)}</div>
      <div class="t-sub">📖 ${caught}/${list.length} · 🏆 ${st.wins} · 🎮 ${st.games}</div>
    </div>
  </div>`;
}

function dexScreen() {
  const P = Profile.get();
  const list = Profile.dexList();
  const caught = list.filter(id => P.caught[id]).length;
  const seen = list.filter(id => P.seen[id] || P.caught[id]).length;
  const cells = list.map(id => {
    const d = POKEMON[id];
    const isBoss = id === CONFIG.boss.id;
    const got = P.caught[id] || (isBoss && P.stats.wins > 0);
    const saw = got || P.seen[id];
    const no = `#${String(d.dex).padStart(3, "0")}`;
    return `<button class="dex-cell${got ? " got" : saw ? " seen" : ""}" ${saw ? `onclick="dexInfo('${id}')"` : ""}>
      <img src="${ART_URL(d.dex)}" alt="" loading="lazy">
      <span class="dex-no">${no}</span>
      <span class="dex-name">${saw ? d.he : "???"}</span>
    </button>`;
  }).join("");
  return `<div class="screen-head"><button class="btn small" onclick="go('home')">↩</button><h2>פוקידקס</h2><span class="head-count">${caught}/${list.length}</span></div>
    <div class="dex-bar"><span style="width:${pct(seen, list.length)}%" class="seen-fill"></span><span style="width:${pct(caught, list.length)}%" class="got-fill"></span></div>
    <div class="dex-legend"><span><i class="lg got"></i>נתפסו ${caught}</span><span><i class="lg seen"></i>נראו ${seen}</span></div>
    <div class="dex-grid">${cells}</div>`;
}

function dexInfo(id) {
  const P = Profile.get();
  const d = POKEMON[id];
  const got = P.caught[id] || (id === CONFIG.boss.id && P.stats.wins > 0);
  const mon = makeMon(id);
  const extra = got
    ? `<div class="chance">${id === CONFIG.boss.id ? `🏆 הובס ${P.stats.wins}` : `🔴 ${P.caught[id]}`}</div>`
    : `<div class="chance">👁️</div>`;
  modal(`<div class="dex-card${got ? "" : " silhouette"}">${cardHTML(mon, extra)}</div>
    <button class="btn primary" onclick="closeModal()">סגור</button>`, "dex");
}

function statsScreen() {
  const st = Profile.get().stats;
  const fav = Object.entries(st.starters).sort((a, b) => b[1] - a[1])[0];
  const rows = [
    ["🎮", "משחקים", st.games],
    ["🏆", "ניצחונות על מיוטו", st.wins],
    ["💫", "הפסדים", st.losses],
    ["⚔️", "תקיפות", st.attacks],
    ["💥", "נזק כולל", st.damage],
    ["🔥", "המכה הכי חזקה", st.bestHit],
    ["🔴", "תפיסות", `${st.catches}/${st.tries}`],
    ["🎯", "אחוז הצלחה בתפיסה", `${pct(st.catches, st.tries)}%`]
  ];
  return `<div class="screen-head"><button class="btn small" onclick="go('home')">↩</button><h2>סטטיסטיקות</h2><span></span></div>
    ${fav ? `<div class="fav"><img src="${ART_URL(POKEMON[fav[0]].dex)}" alt=""><div><small>ההתחלתי האהוב</small><b>${POKEMON[fav[0]].he}</b></div></div>` : ""}
    <div class="stat-grid">${rows.map(([i, l, v]) => `<div class="stat"><span class="s-icon">${i}</span><b>${v}</b><small>${l}</small></div>`).join("")}</div>`;
}

function settingsScreen() {
  const se = Profile.get().settings;
  const toggle = (k, icon, label) => `<label class="set-row"><span>${icon} ${label}</span>
      <input type="checkbox" ${se[k] ? "checked" : ""} onchange="Profile.setSetting('${k}', this.checked); if (this.checked && '${k}' === 'sound') Sfx.play('turn'); if (this.checked && '${k}' === 'vibrate') buzz(120);">
      <i class="switch"></i></label>`;
  return `<div class="screen-head"><button class="btn small" onclick="go('home')">↩</button><h2>הגדרות</h2><span></span></div>
    <div class="settings">
      ${toggle("sound", "🔊", "צלילים")}
      ${toggle("vibrate", "📳", "רטט בתור שלי")}
      <button class="set-row" onclick="editName()"><span>✏️ שינוי שם</span><span class="muted">${esc(ui.name)}</span></button>
      <button class="set-row danger" onclick="confirmWipe()"><span>🗑️ איפוס התקדמות</span></button>
    </div>`;
}

function confirmWipe() {
  modal(`<h2>לאפס הכל?</h2><p>הפוקידקס והסטטיסטיקות יימחקו.</p>
    <div class="row"><button class="btn" onclick="closeModal()">לא</button>
    <button class="btn primary" onclick="Profile.wipe(); closeModal(); render()">כן</button></div>`, "wipe");
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
        ? `${trainerCard()}${note}
           <button class="btn primary big play" onclick="go('mode')">משחק</button>
           <div class="menu-row">
             <button class="menu-btn" onclick="go('dex')"><span>📖</span>פוקידקס</button>
             <button class="menu-btn" onclick="go('stats')"><span>📊</span>סטטיסטיקות</button>
             <button class="menu-btn" onclick="go('settings')"><span>⚙️</span>הגדרות</button>
           </div>`
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
    case "dex":
      el.innerHTML = dexScreen();
      break;
    case "stats":
      el.innerHTML = statsScreen();
      break;
    case "settings":
      el.innerHTML = settingsScreen();
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
      const waitingFor = S.players.filter(p => !p.ready).map(p => esc(p.name));
      html = `<h2>${title}</h2>` + (my && !my.ready
        ? `<button class="btn primary big" onclick="Net.act({t:'ready'})">✋ אני מוכן</button>`
        : `<p>⏳ ${waitingFor.join(", ")}</p>`);
      break;
    }
    case "dice":
      html = `<h2>🎲 הקוביות מתגלגלות!</h2>` + (window.Arena && Arena.ok ? "" :
        `<ul class="who">${S.players.map(p => `<li>${esc(p.name)} ${DIE[p.roll] || ""}</li>`).join("")}</ul>`);
      break;
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
      } else if (ui.catchOpen) {
        html = `<h2>משוך בידית!</h2>${slotHTML(true)}
          <div class="row"><button class="btn" onclick="backToTurn()">↩ חזור</button></div>`;
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
      html = `<h2>${esc(S.action || "")}</h2>`;
      break;
    case "wheel":
      html = `<h2>${esc(S.action || "")}</h2>${slotHTML(false)}
        <div id="wheelResult" class="wheel-result">&nbsp;</div>`;
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
function openAttack() { ui.attackOpen = true; ui.catchOpen = false; ui.carousel = 0; renderPanel(); tickTimer(); }
function backToTurn() { ui.attackOpen = false; ui.catchOpen = false; renderPanel(); tickTimer(); }

/* ---------- מכונת המספרים ----------
   אחד המספרים הוא הנכון ואף אחד לא יודע איזה. מושכים בידית, הגלגלת מסתובבת
   מהר ועוצרת. מספר שגוי נמחק לתמיד, אז כל ניסיון מקרב את התפיסה. */
const SPIN_MS = 3100;

function numsLeft() {
  return S && S.wild && S.wild.nums ? S.wild.nums.length : "?";
}

function openCatch() { ui.catchOpen = true; ui.attackOpen = false; renderPanel(); }

function slotHTML(canPull) {
  const left = numsLeft();
  return `<div class="slot">
      <div class="slot-box">
        <div class="slot-window" id="slotWindow"><div class="slot-reel" id="slotReel">
          <div class="slot-cell dim">·</div><div class="slot-cell">?</div><div class="slot-cell dim">·</div>
        </div></div>
        <button class="slot-lever${canPull ? " can" : ""}" id="slotLever" ${canPull ? `onclick="pullLever()"` : "disabled"} aria-label="ידית"><i class="stick"></i><i class="knob"></i></button>
      </div>
      ${S.wheel ? "" : `<div class="slot-left">🔢 ${left}</div>`}
    </div>`;
}

function pullLever() {
  const lever = $("#slotLever");
  if (!lever || lever.classList.contains("pulled")) return;
  lever.classList.add("pulled");
  Sfx.play("click");
  setTimeout(() => { ui.catchOpen = false; Net.act({t: "catch"}); }, 280);
}

/* כולם רואים את הגלגלת עוצרת על אותו מספר */
function playWheel() {
  const w = S.wheel;
  if (!w) return;
  const pick = () => w.nums[Math.floor(Math.random() * w.nums.length)];
  const strip = [pick()];
  for (let i = 0; i < 38; i++) strip.push(pick());
  strip.push(w.land, pick());
  ui.wheel = {strip, land: w.land, success: w.success, auto: w.auto, left: w.left, start: Date.now()};
  paintWheel(true);
  // תקתוק שהולך ומאט
  for (let k = 0; k < 16; k++) {
    const at = SPIN_MS * (1 - Math.pow(1 - k / 16, 2.2));
    setTimeout(() => { if (ui.wheel && S && S.phase === "wheel") Sfx.play("click"); }, at);
  }
}

function paintWheel(spin) {
  const reel = $("#slotReel");
  const w = ui.wheel;
  if (!reel || !w || S.phase !== "wheel") return;
  reel.innerHTML = w.strip.map(n => `<div class="slot-cell">${n}</div>`).join("");
  const cell = reel.firstElementChild.offsetHeight || 56;
  const endY = -(w.strip.length - 3) * cell;
  const elapsed = Date.now() - w.start;
  const lever = $("#slotLever");
  if (spin && elapsed < 200) {
    if (lever) lever.classList.add("pulled");
    reel.style.transition = "none";
    reel.style.transform = "translateY(0)";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      reel.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.1,.75,.2,1)`;
      reel.style.transform = `translateY(${endY}px)`;
    }));
  } else {
    reel.style.transition = "none";
    reel.style.transform = `translateY(${endY}px)`;
  }
  const show = () => {
    const r = $("#wheelResult"), win = $("#slotWindow");
    if (!r || S.phase !== "wheel") return;
    if (win) win.classList.add(w.success ? "win" : "lose");
    r.innerHTML = w.success
      ? `<b class="ok">${w.auto ? "נשאר רק מספר אחד - נתפס! 🎉" : `${w.land} - נתפס! 🎉`}</b>`
      : `<b class="bad">${w.land} - לא הפעם ❌</b><small>🔢 ${w.left}</small>`;
  };
  if (elapsed >= SPIN_MS + 150) show();
  else setTimeout(show, SPIN_MS + 150 - elapsed);
}

function flashDamage(dmg, mult) {
  if (window.Arena && Arena.ok) return;
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
  // אצל המארח המצב הוא אותו אובייקט שמשתנה, אז זוכרים ערכים ולא את האובייקט
  const prevPhase = ui.lastPhase;
  const prevTurn = ui.lastTurn;
  S = msg.S;
  ui.lastPhase = S.phase;
  ui.lastTurn = currentPid();
  Profile.onState(S, Net.myPid, msg.fx);
  ui.deadline = Date.now() + (msg.remaining || 0);
  ui.total = msg.remaining ? msg.total : 0;
  if (ui.screen !== "game") { ui.screen = "game"; ui.note = ""; }

  // התור עבר - סוגרים חלונות שנשארו פתוחים
  if (S.phase !== "turn" || currentPid() !== prevTurn || !isMyTurn()) ui.attackOpen = false;
  if (S.phase !== "turn" || !isMyTurn()) ui.catchOpen = false;
  if (S.phase !== "wheel") ui.wheel = null;
  const myTurnNow = (S.phase === "turn" || S.phase === "starterPick") && isMyTurn();
  if (myTurnNow && (prevPhase !== S.phase || prevTurn !== currentPid())) { Sfx.play("turn"); buzz(150); }
  if (S.phase === "end" && prevPhase !== "end") Sfx.play(S.win ? "win" : "lose");
  if (S.phase !== prevPhase && S.phase === "starterPick") ui.carousel = 0;
  if (S.phase === "starterPick" && currentPid() !== prevTurn) ui.carousel = 0;

  renderTable();
  if (window.Arena && Arena.ok) Arena.sync(S, Net.myPid, ["turn", "starterPick", "anim", "wheel"].includes(S.phase) ? currentPid() : null, msg.fx);
  renderPanel();
  tickTimer();
  if (msg.fx && msg.fx.kind === "damage") flashDamage(msg.fx.dmg, msg.fx.mult);
  if (msg.fx && msg.fx.kind === "wheel") playWheel();
  else paintWheel(false);
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
  ui.screen = "home";
  render();
}
function editName() { ui.name = ""; ui.screen = "home"; render(); }

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
  ui.lastPhase = ui.lastTurn = null;
  Profile.resetGame();
  ui.screen = "home";
  ui.status = "";
  ui.attackOpen = false;
  ui.catchOpen = false;
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
    ui.lastPhase = ui.lastTurn = null;
    Profile.resetGame();
    ui.screen = "home";
    ui.status = "";
    ui.note = text;
    closeModal();
    render();
  }
});

window.addEventListener("arena-ready", () => { if (S && ui.screen === "game") onState({S, fx: null, remaining: Math.max(0, ui.deadline - Date.now()), total: ui.total}); });
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (e.target.id === "nameInput") saveName();
  if (e.target.id === "codeInput") startJoin();
});

try { ui.name = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
Net.setName(ui.name);
render();
