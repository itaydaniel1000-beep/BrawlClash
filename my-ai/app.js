import { BRAINS, brain, loadBrain, chat, stop, isCached } from "./brain.js";
import { drawAvatar, liveAvatar } from "./avatar.js";

/* ===== מצב ושמירה ===== */
const KEY = "myai.v1";
const PERSONAS = {
  fun:   { name: "כיפי",  desc: "מצחיק ומלא אנרגיה",
           prompt: "האופי שלך: כיפי, מצחיק ומלא אנרגיה. אתה אוהב להצחיק, משתמש לפעמים באימוג'י ומדבר כמו חבר טוב." },
  smart: { name: "מדען",  desc: "סקרן ומסביר לעומק",
           prompt: "האופי שלך: מדען סקרן. אתה אוהב להסביר איך דברים עובדים, נותן דוגמאות, ולפעמים מוסיף עובדה מגניבה." },
  prank: { name: "שובב",  desc: "עוקצני ואוהב אתגרים",
           prompt: "האופי שלך: שובב ועוקצני בעדינות, אבל אף פעם לא מעליב. אתה אוהב חידות, אתגרים ותשובות שנונות." },
  calm:  { name: "רגוע",  desc: "נחמד, סבלני וקצר",
           prompt: "האופי שלך: רגוע, נחמד וסבלני. אתה עונה בקצרה ובבהירות, ומקשיב טוב." }
};
const HUES = [200, 160, 120, 45, 20, 340, 280, 250];
const CHIPS = ["ספר לי בדיחה", "בוא נשחק חידות", "תמציא לי סיפור קצר", "עזור לי ללמוד למבחן"];

let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.settings) return s; } catch {}
  return { settings: null, chats: [], current: null, memory: [] };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.error(e); }
}
const uid = () => Math.random().toString(36).slice(2, 10);
const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ===== הגדרה ראשונה ===== */
function setupFlow() {
  $("#setup").hidden = false;
  const draft = { userName: "", aiName: "", persona: "fun", hue: 200, extra: "", brain: "fast" };
  /* מי שכבר הוריד מוח גדול ממשיך איתו; חדשים מתחילים במהיר (1GB) */
  (async () => { for (const k of ["genius", "normal"]) if (await isCached(k)) { draft.brain = k; return; } })();
  const big = liveAvatar($("#setupAvatar"), { hue: draft.hue, persona: draft.persona });
  const steps = [...document.querySelectorAll(".step")];
  let i = 0;
  const show = n => { steps.forEach((s, k) => s.hidden = k !== n); steps[n].querySelector("input")?.focus(); };

  renderPersonas($("#sPersonas"), draft, () => big.update({ persona: draft.persona }));
  renderHues($("#sHues"), draft, () => { big.update({ hue: draft.hue }); applyHue(draft.hue); });

  const next = () => {
    if (i === 0) { draft.userName = $("#sUser").value.trim(); if (!draft.userName) return $("#sUser").focus(); }
    if (i === 1) $("#sAi").value = { fun: "פיקסל", smart: "נובה", prank: "זיגזג", calm: "ענן" }[draft.persona];
    if (i === 2) {
      draft.aiName = $("#sAi").value.trim(); if (!draft.aiName) return $("#sAi").focus();
      S.settings = draft; save();
      $("#setup").hidden = true; start();
      return;
    }
    show(++i);
  };
  document.querySelectorAll("[data-next]").forEach(b => b.onclick = next);
  document.querySelectorAll(".step input").forEach(inp => inp.onkeydown = e => { if (e.key === "Enter") next(); });
  show(0);
}

function renderPersonas(box, target, onPick) {
  if (onPick) box._onPick = onPick; else onPick = box._onPick;
  box.innerHTML = "";
  for (const [k, p] of Object.entries(PERSONAS)) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "persona" + (target.persona === k ? " on" : "");
    const cv = document.createElement("canvas"); cv.className = "pix";
    drawAvatar(cv, { hue: target.hue, persona: k });
    b.append(cv);
    b.insertAdjacentHTML("beforeend", `<div><b>${p.name}</b><small>${p.desc}</small></div>`);
    b.onclick = () => { target.persona = k; renderPersonas(box, target, onPick); onPick?.(); };
    box.append(b);
  }
}
function renderHues(box, target, onPick) {
  box.innerHTML = "";
  for (const h of HUES) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "hue" + (target.hue === h ? " on" : "");
    b.style.background = `hsl(${h} 70% 55%)`;
    b.onclick = () => {
      target.hue = h; renderHues(box, target, onPick);
      const pbox = box.previousElementSibling;
      if (pbox?.classList.contains("personas")) renderPersonas(pbox, target);
      onPick?.();
    };
    box.append(b);
  }
}
function applyHue(h) { document.documentElement.style.setProperty("--hue", h); }

/* ===== האפליקציה ===== */
let head, generating = false;

function start() {
  const st = S.settings;
  applyHue(st.hue);
  $("#app").hidden = false;
  head = liveAvatar($("#headAvatar"), { hue: st.hue, persona: st.persona });
  $("#aiName").textContent = st.aiName;
  document.querySelectorAll(".ai-name").forEach(e => e.textContent = st.aiName);
  if (!S.current || !S.chats.find(c => c.id === S.current)) newChat(false);
  renderChats(); renderLog(); renderMemCount();
  bindUI();
  brain.on(renderStatus);
  bootBrain();
}

async function bootBrain() {
  brain.firstTime = !(await isCached(S.settings.brain));
  loadBrain(S.settings.brain);
}

function renderStatus(b) {
  const bar = $("#loadBar"), st = $("#status");
  bar.hidden = b.state !== "loading";
  bar.firstElementChild.style.width = Math.round(b.progress * 100) + "%";
  const gb = BRAINS[S.settings.brain].gb;
  st.onclick = null; st.style.cursor = "";
  if (generating) st.textContent = "מקליד...";
  else if (b.state === "loading") st.textContent = (brain.firstTime ? `מוריד מוח (${gb}GB) ` : "מתעורר ") + Math.round(b.progress * 100) + "%";
  else if (b.state === "ready") st.textContent = "מחובר";
  else if (b.state === "unsupported") st.textContent = "צריך Chrome במחשב עם כרטיס מסך";
  else if (b.state === "failed") {
    st.textContent = "משהו נתקע — לחץ לנסות שוב"; st.style.cursor = "pointer";
    st.onclick = () => loadBrain(S.settings.brain);
  } else st.textContent = "";
}

function waitReady() {
  if (brain.state === "ready") return Promise.resolve();
  if (brain.state === "unsupported" || brain.state === "failed") return Promise.reject(new Error(brain.state));
  return new Promise((res, rej) => {
    let off = null;
    off = brain.on(b => {
      if (b.state === "ready") { off?.(); res(); }
      else if (b.state === "unsupported" || b.state === "failed") { off?.(); rej(new Error(b.state)); }
    });
  });
}

/* ---- שיחות ---- */
const cur = () => S.chats.find(c => c.id === S.current);

function newChat(render = true) {
  const existing = S.chats.find(c => c.msgs.length === 0);
  if (existing) S.current = existing.id;
  else { const c = { id: uid(), title: "שיחה חדשה", msgs: [], t: Date.now() }; S.chats.unshift(c); S.current = c.id; }
  save();
  if (render) { renderChats(); renderLog(); $("#input").focus(); }
}

function renderChats() {
  const ul = $("#chats"); ul.innerHTML = "";
  for (const c of S.chats) {
    const li = document.createElement("li");
    li.className = c.id === S.current ? "on" : "";
    li.innerHTML = `<span>${esc(c.title)}</span><button class="x" title="מחק">✕</button>`;
    li.onclick = e => {
      if (e.target.classList.contains("x")) {
        S.chats = S.chats.filter(x => x.id !== c.id);
        if (S.current === c.id) { S.current = null; newChat(false); }
        save(); renderChats(); renderLog(); return;
      }
      if (generating) return;
      S.current = c.id; save(); renderChats(); renderLog();
      $("#side").classList.remove("open");
    };
    ul.append(li);
  }
}

function renderLog() {
  const log = $("#log"), c = cur(); log.innerHTML = "";
  if (!c.msgs.length) {
    const e = document.createElement("div"); e.className = "empty";
    const cv = document.createElement("canvas"); cv.className = "pix";
    drawAvatar(cv, { hue: S.settings.hue, persona: S.settings.persona });
    e.append(cv);
    e.insertAdjacentHTML("beforeend", `<b>היי ${esc(S.settings.userName)}!</b>`);
    const chips = document.createElement("div"); chips.className = "chips";
    for (const t of CHIPS) {
      const b = document.createElement("button"); b.textContent = t;
      b.onclick = () => send(t); chips.append(b);
    }
    e.append(chips); log.append(e);
    return;
  }
  for (const m of c.msgs) addBubble(m.role, m.content, m.facts);
  log.scrollTop = log.scrollHeight;
}

function addBubble(role, text, facts) {
  const log = $("#log");
  log.querySelector(".empty")?.remove();
  const row = document.createElement("div");
  row.className = "msg " + (role === "user" ? "user" : "ai");
  if (role !== "user") {
    const cv = document.createElement("canvas"); cv.className = "pix";
    drawAvatar(cv, { hue: S.settings.hue, persona: S.settings.persona });
    row.append(cv);
  }
  const b = document.createElement("div"); b.className = "bubble";
  if (role === "user") b.textContent = text; else b.innerHTML = md(text);
  row.append(b);
  if (facts?.length) showFacts(b, facts);
  log.append(row);
  log.scrollTop = log.scrollHeight;
  return b;
}
function showFacts(bubble, facts) {
  const d = document.createElement("div"); d.className = "remembered";
  d.innerHTML = facts.map(f => `<span>🧠 ${esc(f)}</span>`).join("");
  bubble.after(d);
  d.parentElement.style.flexWrap = "wrap";
  d.style.flexBasis = "100%"; d.style.paddingInlineStart = "50px";
}

/* ---- מרקדאון פשוט ---- */
function md(src) {
  const blocks = [];
  let s = esc(src).replace(/```(\w*)\n?([\s\S]*?)(```|$)/g, (_, l, code) => {
    blocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`); return `\u0000${blocks.length - 1}\u0000`;
  });
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>")
       .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
       .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  const out = []; let list = null;
  for (const line of s.split("\n")) {
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), h = line.match(/^#{1,4}\s+(.*)/);
    const kind = ul ? "ul" : ol ? "ol" : null;
    if (list && list.kind !== kind) { out.push(`<${list.kind}>${list.items.join("")}</${list.kind}>`); list = null; }
    if (kind) { list = list || { kind, items: [] }; list.items.push(`<li>${(ul || ol)[1]}</li>`); continue; }
    if (h) out.push(`<h3>${h[1]}</h3>`);
    else if (line.trim()) out.push(`<p>${line}</p>`);
  }
  if (list) out.push(`<${list.kind}>${list.items.join("")}</${list.kind}>`);
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
}

/* ---- המוח: הנחיות, זיכרון, שליחה ---- */
function systemPrompt() {
  const st = S.settings, p = PERSONAS[st.persona];
  const mem = S.memory.slice(-40).map(m => "- " + m.text).join("\n");
  const d = new Date();
  return [
    `אתה ${st.aiName}, עוזר AI אישי וחבר של ${st.userName}. ${p.prompt}`,
    st.extra ? `עוד על האופי שלך: ${st.extra}` : "",
    "",
    "כללים:",
    `- כתוב תמיד בעברית תקינה וטבעית, באותיות עבריות בלבד, אלא אם ${st.userName} מבקש שפה אחרת. מילים באנגלית רק כשאין ברירה (שמות של תוכנות, קוד).`,
    "- אתה מדבר עם ילד או נער. שמור על תוכן שמתאים לגיל.",
    "- כברירת מחדל ענה קצר וממוקד. הרחב רק כשמבקשים או כשצריך.",
    "- אם אתה לא בטוח במשהו, אמור את זה. אל תמציא עובדות.",
    `- אתה זוכר דברים על ${st.userName} משיחות קודמות. השתמש בהם בטבעיות כשזה מתאים, בלי לדקלם אותם.`,
    "",
    `היום: ${d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`,
    "",
    mem ? `מה שאתה זוכר על ${st.userName}:\n${mem}` : `עדיין אינך יודע הרבה על ${st.userName}.`
  ].filter(x => x !== null).join("\n");
}

function history(c) {
  /* בערך 2.5 תווים לטוקן בעברית; משאירים מקום לתשובה */
  const out = []; let chars = 0;
  for (let i = c.msgs.length - 1; i >= 0; i--) {
    const m = c.msgs[i];
    if (m.err) continue;
    chars += m.content.length;
    if (chars > 9000 && out.length) break;
    out.unshift({ role: m.role, content: m.content });
  }
  return out;
}

async function send(text) {
  text = (text || "").trim();
  if (!text || generating) return;
  const c = cur();
  if (!c.msgs.length) { c.title = text.slice(0, 40); renderChats(); }
  c.msgs.push({ role: "user", content: text }); c.t = Date.now(); save();
  addBubble("user", text);
  $("#input").value = ""; autosize();

  const bubble = addBubble("assistant", "");
  bubble.classList.add("typing");
  setGenerating(true);
  let answer = "", failed = false;
  try {
    if (brain.state !== "ready") bubble.innerHTML = "<p>…</p>";
    await waitReady();
    answer = await chat([{ role: "system", content: systemPrompt() }, ...history(c)], {
      temperature: 0.5,
      onText: t => { bubble.innerHTML = md(t); $("#log").scrollTop = $("#log").scrollHeight; }
    });
    if (!answer) answer = "…";
  } catch (e) {
    console.error(e);
    failed = true;
    answer = brain.state === "unsupported" ? "אני צריך Chrome במחשב עם כרטיס מסך כדי לחשוב 😕" : "אופס, משהו נתקע אצלי. נסה שוב?";
  }
  bubble.classList.remove("typing");
  bubble.innerHTML = md(answer);
  const msg = { role: "assistant", content: answer };
  if (failed) msg.err = true;
  c.msgs.push(msg); save();
  setGenerating(false);

  if (!failed) remember(text).then(facts => {
    if (!facts.length) return;
    msg.facts = facts; save();
    if (S.current === c.id) showFacts(bubble, facts);
  });
}

function setGenerating(on) {
  generating = on;
  $("#send").hidden = on; $("#stopBtn").hidden = !on;
  head?.talk(on);
  renderStatus(brain);
}

/* אחרי כל הודעה, המוח מחפש בה דברים ששווה לזכור לאורך זמן.
   רק מההודעה של המשתמש, כדי שלא "ייזכר" בדברים שהוא עצמו המציא. */
async function remember(userText) {
  if (userText.length < 12 || brain.state !== "ready") return [];
  const name = S.settings.userName;
  const known = S.memory.map(m => "- " + m.text).join("\n") || "(כלום)";
  try {
    const out = await chat([
      { role: "system", content: "אתה כלי שמחלץ עובדות לזיכרון ארוך-טווח. אתה עונה רק ברשימה, בלי שום הסבר." },
      { role: "user", content:
        `דברים שכבר ידועים על ${name}:\n${known}\n\n` +
        `ההודעה ש${name} כתב עכשיו:\n"${userText}"\n\n` +
        `האם יש בהודעה דבר חדש וחשוב לזכור על ${name} לאורך זמן? למשל: גיל, תחביבים, דברים שהוא אוהב או לא אוהב, משפחה וחברים, פרויקטים, מטרות, או בקשה מפורשת לזכור משהו.\n` +
        `שאלות, בקשות רגעיות ודברים שכבר ידועים - לא נחשבים.\n` +
        `אם יש, כתוב כל עובדה בשורה נפרדת שמתחילה ב-"- ", בגוף שלישי וקצר (למשל "- ${name} אוהב כדורגל"). אם אין, כתוב רק: אין` }
    ], { temperature: 0.1, maxTokens: 120 });
    if (/^\s*אין/.test(out)) return [];
    const norm = s => s.replace(/[^\p{L}\p{N}]/gu, "");
    const have = new Set(S.memory.map(m => norm(m.text)));
    const facts = out.split("\n")
      .map(l => l.match(/^\s*[-•*]\s*(.+)/)?.[1]?.trim())
      .filter(f => f && !/(שואל|שאל|מבקש|ביקש|מחפש|רוצה לדעת|רוצה רעיון|מתעניין לדעת)/.test(f))
      .filter(f => f && f.length > 3 && f.length < 160 && !/^אין/.test(f) && !have.has(norm(f)))
      .slice(0, 3);
    for (const f of facts) S.memory.push({ id: uid(), text: f, t: Date.now() });
    if (S.memory.length > 80) S.memory = S.memory.slice(-80);
    save(); renderMemCount();
    return facts;
  } catch (e) { console.error("remember:", e); return []; }
}

/* ---- זיכרון ---- */
function renderMemCount() { $("#memCount").textContent = S.memory.length ? `(${S.memory.length})` : ""; }
function renderMemList() {
  const ul = $("#memList"); ul.innerHTML = "";
  if (!S.memory.length) ul.innerHTML = `<li><span style="color:var(--dim)">עדיין ריק</span></li>`;
  for (const m of [...S.memory].reverse()) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${esc(m.text)}</span><button title="שכח">✕</button>`;
    li.querySelector("button").onclick = () => {
      S.memory = S.memory.filter(x => x.id !== m.id); save(); renderMemList(); renderMemCount();
    };
    ul.append(li);
  }
}

/* ---- הגדרות ---- */
function openSettings() {
  const st = S.settings, draft = { ...st };
  $("#setUser").value = st.userName; $("#setAi").value = st.aiName; $("#setExtra").value = st.extra || "";
  renderPersonas($("#setPersonas"), draft);
  renderHues($("#setHues"), draft);
  const renderBrains = () => {
    const box = $("#setBrains"); box.innerHTML = "";
    for (const [k, b] of Object.entries(BRAINS)) {
      const btn = document.createElement("button"); btn.type = "button";
      btn.className = "brain" + (draft.brain === k ? " on" : "");
      btn.innerHTML = `<b>${b.name}</b><small>${b.gb}GB</small>`;
      btn.onclick = () => { draft.brain = k; renderBrains(); };
      box.append(btn);
    }
  };
  renderBrains();
  $("#saveSettings").onclick = () => {
    draft.userName = $("#setUser").value.trim() || st.userName;
    draft.aiName = $("#setAi").value.trim() || st.aiName;
    draft.extra = $("#setExtra").value.trim();
    const brainChanged = draft.brain !== st.brain;
    S.settings = draft; save();
    applyHue(draft.hue);
    head.update({ hue: draft.hue, persona: draft.persona });
    $("#aiName").textContent = draft.aiName;
    document.querySelectorAll(".ai-name").forEach(e => e.textContent = draft.aiName);
    renderLog();
    $("#settingsDlg").close();
    if (brainChanged) bootBrain();
  };
  $("#settingsDlg").showModal();
}

function autosize() {
  const t = $("#input"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 180) + "px";
}

function bindUI() {
  $("#composer").onsubmit = e => { e.preventDefault(); send($("#input").value); };
  $("#input").oninput = autosize;
  $("#input").onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send($("#input").value); }
  };
  $("#stopBtn").onclick = stop;
  $("#newChat").onclick = () => { if (!generating) newChat(); $("#side").classList.remove("open"); };
  $("#menuBtn").onclick = () => $("#side").classList.toggle("open");
  $("#openMemory").onclick = () => { renderMemList(); $("#memoryDlg").showModal(); };
  $("#memAdd").onsubmit = e => {
    e.preventDefault();
    const v = $("#memInput").value.trim(); if (!v) return;
    S.memory.push({ id: uid(), text: v, t: Date.now() }); save();
    $("#memInput").value = ""; renderMemList(); renderMemCount();
  };
  $("#openSettings").onclick = openSettings;
  $("#wipe").onclick = () => {
    if (!confirm("למחוק את כל השיחות, הזיכרון וההגדרות?")) return;
    localStorage.removeItem(KEY); location.reload();
  };
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
  $("#input").focus();
}

/* ===== התחלה ===== */
if (S.settings) start(); else setupFlow();
