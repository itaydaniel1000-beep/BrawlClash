/* Portal AI Agent Connector — service worker.
   שלב 1: זיהוי טאבים + מעבר. שלב 2: לולאת סוכן (Gemini) שמבצעת משימה על הטאב הנבחר. */

let activeRun = null;
const MAX_STEPS = 15;

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === "LIST_TABS") {
    chrome.tabs.query({}, function (tabs) {
      var out = (tabs || [])
        .filter(function (t) { return /^https?:\/\//i.test(t.url || ""); })
        .map(function (t) { return { id: t.id, title: t.title || "", url: t.url || "", favIconUrl: t.favIconUrl || "" }; });
      sendResponse({ ok: true, tabs: out });
    });
    return true;
  }

  if (msg.type === "RUN_TASK") {
    var portalTabId = sender.tab && sender.tab.id;
    startRun({ portalTabId: portalTabId, targetTabId: msg.tabId, goal: msg.goal, apiKey: msg.apiKey, model: msg.model });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "CONFIRM_RESULT") {
    if (activeRun && activeRun.awaitConfirm) activeRun.awaitConfirm(!!msg.approved);
    return;
  }
  if (msg.type === "CANCEL_TASK") { if (activeRun) activeRun.cancelled = true; return; }
  if (msg.type === "TASK_DONE") { sendResponse({ ok: true }); return true; }
});

function toPortal(payload) {
  if (activeRun && activeRun.portalTabId != null) {
    chrome.tabs.sendMessage(activeRun.portalTabId, Object.assign({ source: "portal-agent-ext-relay" }, payload)).catch(function () {});
  }
}
function progress(msg, kind) { toPortal({ type: "AGENT_PROGRESS", msg: msg, kind: kind || "" }); }
function askConfirm(question) {
  return new Promise(function (resolve) {
    activeRun.awaitConfirm = function (ok) { activeRun.awaitConfirm = null; resolve(ok); };
    toPortal({ type: "AGENT_CONFIRM", question: question });
  });
}
function finishRun(summary, ok) { toPortal({ type: "AGENT_DONE", summary: summary, ok: !!ok }); activeRun = null; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function startRun(cfg) {
  activeRun = Object.assign({ steps: 0, history: [], cancelled: false }, cfg);
  try {
    if (!cfg.apiKey) { progress("חסר מפתח Gemini API — הזן אותו בדף ונסה שוב.", "err"); return finishRun("לא הוגדר מפתח Gemini", false); }
    if (typeof cfg.targetTabId !== "number") { progress("אין טאב יעד תקין.", "err"); return finishRun("אין טאב יעד", false); }
    try { await chrome.tabs.update(cfg.targetTabId, { active: true }); } catch (e) {}
    progress("עברתי לטאב היעד. מתחיל לנתח…");

    while (activeRun && !activeRun.cancelled && activeRun.steps < MAX_STEPS) {
      activeRun.steps++;
      await sleep(300);
      var state = await getState(cfg.targetTabId);
      if (!state) { progress("לא הצלחתי לקרוא את הדף (אולי דף מוגן).", "err"); break; }

      var action = await decide(cfg, state);
      if (!action || !action.action) { break; }
      progress("צעד " + activeRun.steps + ": " + (action.reason || action.action));
      activeRun.history.push({ step: activeRun.steps, action: action.action, index: action.index, reason: action.reason });

      if (action.action === "finish" || action.done) { return finishRun(action.reason || "המשימה הושלמה", true); }

      if (action.action === "ask" || isSensitive(action)) {
        var q = action.reason || "לאשר פעולה רגישה?";
        progress("⏸️ ממתין לאישורך: " + q, "warn");
        var ok = await askConfirm(q);
        if (!ok) { progress("סירבת — עוצר.", "warn"); return finishRun("הופסק לפי בקשתך", false); }
        progress("אושר ✓");
        if (action.action === "ask") continue; // אחרי אישור — מתכנן מחדש
      }

      var res = await doAction(cfg.targetTabId, action);
      if (res && res.ok === false) progress("הפעולה לא הצליחה: " + (res.err || ""), "warn");
      await sleep(1300); // זמן טעינה/עדכון
    }
    if (activeRun && activeRun.cancelled) return finishRun("הופסק", false);
    if (activeRun) return finishRun("הגעתי למגבלת הצעדים (" + MAX_STEPS + ") בלי לסיים.", false);
  } catch (e) {
    progress("שגיאה: " + (e && e.message ? e.message : e), "err");
    if (activeRun) finishRun("שגיאה בזמן הריצה", false);
  }
}

/* ---- קריאת מצב הדף (מוזרק לטאב היעד) ---- */
async function getState(tabId) {
  try {
    var r = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: extractState });
    return r && r[0] && r[0].result;
  } catch (e) { progress("לא ניתן לגשת לדף: " + (e && e.message), "err"); return null; }
}
function extractState() {
  var sel = 'a[href], button, input:not([type=hidden]):not([type=submit i][disabled]), textarea, select, [role="button"], [role="link"], [onclick]';
  var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
  var items = []; var i = 0;
  for (var k = 0; k < nodes.length && i < 50; k++) {
    var el = nodes[k];
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (!(el.offsetParent || el.getClientRects().length)) continue;
    el.setAttribute("data-agent-idx", i);
    var label = (el.innerText || el.value || el.placeholder || el.getAttribute("aria-label") || el.getAttribute("title") || el.name || "").toString().replace(/\s+/g, " ").trim().slice(0, 90);
    items.push({ index: i, tag: el.tagName.toLowerCase(), type: (el.type || ""), text: label });
    i++;
  }
  var bodyText = (document.body ? document.body.innerText : "").replace(/\s+/g, " ").trim().slice(0, 1800);
  return { url: location.href, title: document.title, elements: items, text: bodyText };
}

/* ---- ביצוע פעולה (מוזרק לטאב היעד) ---- */
async function doAction(tabId, action) {
  try {
    var r = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: doActionInPage, args: [action] });
    return r && r[0] && r[0].result;
  } catch (e) { return { ok: false, err: e && e.message }; }
}
function doActionInPage(action) {
  function byIdx(i) { return document.querySelector('[data-agent-idx="' + i + '"]'); }
  try {
    if (action.action === "click") {
      var el = byIdx(action.index); if (!el) return { ok: false, err: "no element " + action.index };
      el.scrollIntoView({ block: "center" }); el.click(); return { ok: true };
    }
    if (action.action === "type") {
      var e2 = byIdx(action.index); if (!e2) return { ok: false, err: "no element " + action.index };
      e2.focus();
      if (e2.isContentEditable) { e2.textContent = action.text || ""; }
      else { e2.value = action.text || ""; }
      e2.dispatchEvent(new Event("input", { bubbles: true }));
      e2.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }
    if (action.action === "scroll") { window.scrollBy(0, action.text === "up" ? -700 : 700); return { ok: true }; }
    if (action.action === "navigate") { if (action.url) location.href = action.url; return { ok: true }; }
    if (action.action === "wait") { return { ok: true }; }
    return { ok: false, err: "unknown action" };
  } catch (e) { return { ok: false, err: String(e) }; }
}

function isSensitive(action) {
  var s = ((action.reason || "") + " " + (action.text || "")).toLowerCase();
  return /(buy|purchase|checkout|place order|pay|payment|order now|confirm order|קנה|לקנות|רכיש|תשלום|לשלם|הזמן|אישור הזמנה|מחק|delete|submit)/.test(s);
}

/* ---- Gemini: החלטה על הצעד הבא ---- */
async function decide(cfg, state) {
  var model = cfg.model || "gemini-2.0-flash";
  var sys = 'אתה סוכן אוטומציה בדפדפן שמבצע משימה עבור המשתמש.\n' +
    'המטרה: "' + cfg.goal + '".\n' +
    'בכל צעד תקבל את מצב הדף: כתובת, כותרת, טקסט, ורשימת אלמנטים אינטראקטיביים ממוספרים ([index]).\n' +
    'החזר אך ורק אובייקט JSON יחיד (בלי טקסט נוסף): ' +
    '{"action":"click|type|scroll|navigate|wait|finish|ask","index":number,"text":"string","url":"string","reason":"string","done":boolean}.\n' +
    '- click: לחיצה על אלמנט לפי index.\n' +
    '- type: הקלדה לשדה לפי index, כאשר text = מה להקליד.\n' +
    '- scroll: text="down" או "up".\n' +
    '- navigate: מעבר לכתובת url.\n' +
    '- wait: המתנה (אם הדף עדיין נטען).\n' +
    '- finish: כשהמטרה הושגה, done=true ו-reason = סיכום קצר.\n' +
    '- ask: לפני כל פעולה בלתי-הפיכה (רכישה, תשלום, שליחת טופס, מחיקה) — reason = מה לאשר. לעולם אל תבצע תשלום/רכישה בלי ask תחילה.\n' +
    'בחר צעד אחד בלבד שמקדם את המטרה. השתמש ב-index מהרשימה בלבד. reason קצר בעברית.';
  var hist = (cfg.history || []).slice(-6).map(function (h) { return "#" + h.step + " " + h.action + (h.reason ? " (" + h.reason + ")" : ""); }).join("\n");
  var elems = state.elements.map(function (e) { return "[" + e.index + "] <" + e.tag + (e.type ? " " + e.type : "") + "> " + e.text; }).join("\n");
  var user = "כתובת: " + state.url + "\nכותרת: " + state.title + "\nהיסטוריית צעדים:\n" + (hist || "(אין)") +
    "\n\nטקסט הדף (חלקי):\n" + state.text + "\n\nאלמנטים אינטראקטיביים:\n" + (elems || "(אין)");
  var body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json" }
  };
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(cfg.apiKey);
  var resp;
  try { resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch (e) { progress("שגיאת רשת אל Gemini: " + (e && e.message), "err"); return null; }
  if (!resp.ok) {
    var t = ""; try { t = await resp.text(); } catch (e) {}
    progress("Gemini החזיר שגיאה " + resp.status + ": " + t.slice(0, 160), "err");
    if (resp.status === 400 || resp.status === 403) progress("בדוק שהמפתח תקין ושה-Generative Language API מופעל.", "err");
    return null;
  }
  var data; try { data = await resp.json(); } catch (e) { progress("תשובת Gemini לא תקינה", "err"); return null; }
  var txt = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
  if (!txt) { progress("Gemini לא החזיר תוכן (אולי נחסם).", "err"); return null; }
  try { return JSON.parse(txt); }
  catch (e) {
    var m = txt.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
    progress("לא הצלחתי לפענח את תשובת Gemini.", "err"); return null;
  }
}
