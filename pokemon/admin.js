/* ===== כוחות מיוחדים לשני שמות שמורים =====
   השמות "איתי" ו"איתו" נעולים: אפשר לבחור בהם רק עם הקוד הסודי.
   מי שנכנס עם אחד מהם מקבל בקרב כפתור 👑: פי 2 התקפה, פי 2 הגנה,
   לקחת את הפוקימון של היריב, ליצור פוקימון ולתת פוקימון. */
const Admin = (() => {
  const NAMES = ["איתי", "איתו"];
  const HASH = "48f84ea6043f5313382811d79ec2ba3d163c943b0e33ca3fe2ba2e9a4f18e935";
  const KEY = "pokemon-admin-ok";
  const reserved = n => NAMES.includes(String(n || "").trim());
  const unlocked = () => { try { return localStorage.getItem(KEY) === HASH; } catch (e) { return false; } };

  async function sha(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function unlock(code) {
    if (await sha(String(code || "").trim()) !== HASH) return false;
    try { localStorage.setItem(KEY, HASH); } catch (e) {}
    return true;
  }

  // מבקש את הקוד כשבוחרים שם שמור. מחזיר אם מותר להשתמש בשם
  async function allowName(name) {
    if (!reserved(name) || unlocked()) return true;
    const code = prompt("🔒 קוד סודי");
    return code ? unlock(code) : false;
  }

  // מצב הכוחות - נשמר עד שסוגרים את הדף
  const boost = {atk: false, def: false};

  /* ---- בוחר פוקימון מהפוקידקס ---- */
  // lvl: אם נותנים רמה התחלתית - יש גם בחירת רמה, ומחזירים {id, lvl}
  function pick(title, lvl) {
    return new Promise(resolve => {
      let el = document.getElementById("admPick");
      if (!el) { el = document.createElement("div"); el.id = "admPick"; document.body.appendChild(el); }
      const ids = Object.keys(POKEMON).filter(id => !POKEMON[id].form).sort((a, b) => POKEMON[a].dex - POKEMON[b].dex);
      el.className = "adm-pick";
      el.innerHTML = `<div class="adm-box">
        <div class="adm-head"><b>${title}</b><button class="adm-x">✕</button></div>
        ${lvl ? `<div class="adm-lvl"><span>רמה</span><button data-d="-10">−10</button><button data-d="-1">−</button>
          <input type="number" min="1" max="100" value="${lvl}"><button data-d="1">+</button><button data-d="10">+10</button></div>` : ""}
        <input class="adm-search" placeholder="🔍" autocomplete="off">
        <div class="adm-grid"></div></div>`;
      const grid = el.querySelector(".adm-grid"), input = el.querySelector(".adm-search");
      const draw = () => {
        const q = input.value.trim().toLowerCase();
        const list = ids.filter(id => !q || POKEMON[id].he.includes(q) || id.includes(q) || String(POKEMON[id].dex) === q).slice(0, 90);
        grid.innerHTML = list.map(id => `<button data-id="${id}"><img loading="lazy" src="${ART_URL(POKEMON[id].dex)}" alt=""><span>${POKEMON[id].he}</span><small>#${POKEMON[id].dex}</small></button>`).join("");
      };
      const lv = el.querySelector(".adm-lvl input");
      const level = () => Math.max(1, Math.min(100, Math.round(Number(lv.value) || 1)));
      if (lv) {
        el.querySelectorAll(".adm-lvl button").forEach(b => { b.onclick = () => { lv.value = Math.max(1, Math.min(100, level() + Number(b.dataset.d))); }; });
        lv.onchange = () => { lv.value = level(); };
      }
      const close = v => { el.remove(); resolve(v && lv ? {id: v, lvl: level()} : v); };
      input.oninput = draw;
      el.querySelector(".adm-x").onclick = () => close(null);
      grid.onclick = e => { const b = e.target.closest("button[data-id]"); if (b) close(b.dataset.id); };
      draw();
      input.focus();
    });
  }

  /* ---- בחירת צורה: רגיל / מגה (X, Y, Z) / ג'יגנטמקס ----
     לפוקימון בלי צורות מחזיר null מיד. null = רגיל, מפתח = הצורה, undefined = ביטול */
  function pickForm(id) {
    const list = typeof formsOf === "function" ? formsOf(id) : [];
    if (!list.length) return Promise.resolve(null);
    return new Promise(resolve => {
      const el = document.createElement("div");
      el.className = "adm-pick";
      const label = k => {
        if (POKEMON[k].form === "gmax") return "🔴 ג'יגנטמקס";
        const tag = (k.match(/-mega-([xyz])$/) || [])[1];
        return "💎 מגה" + (tag ? " " + tag.toUpperCase() : "");
      };
      const cell = (k, text) => `<button data-k="${k}"><img src="${ART_URL(POKEMON[k].dex)}" alt=""><span>${text}</span><small>${POKEMON[k].he}</small></button>`;
      el.innerHTML = `<div class="adm-box">
        <div class="adm-head"><b>באיזו צורה?</b><button class="adm-x">✕</button></div>
        <div class="adm-grid adm-forms">${cell(id, "רגיל")}${list.map(k => cell(k, label(k))).join("")}</div></div>`;
      document.body.appendChild(el);
      const close = v => { el.remove(); resolve(v); };
      el.querySelector(".adm-x").onclick = () => close(undefined);
      el.querySelector(".adm-grid").onclick = e => {
        const b = e.target.closest("button[data-k]");
        if (b) close(b.dataset.k === id ? null : b.dataset.k);
      };
    });
  }

  const css = document.createElement("style");
  css.textContent = `
    .adm-pick{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px;direction:rtl}
    .adm-box{background:#fff;color:#222;border:4px solid #3b4cca;border-radius:14px;width:min(560px,100%);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;font-family:inherit}
    .adm-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#3b4cca;color:#fff;font-size:18px}
    .adm-x{background:none;border:0;color:#fff;font-size:20px;cursor:pointer}
    .adm-search{margin:10px;padding:10px;font-size:17px;border:2px solid #ccc;border-radius:10px}
    .adm-lvl{display:flex;align-items:center;justify-content:center;gap:6px;margin:10px 10px 0;font-weight:800;font-size:17px}
    .adm-lvl button{min-width:44px;padding:8px 6px;border-radius:10px;border:2px solid #3b4cca;background:#eef0ff;color:#3b4cca;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit}
    .adm-lvl input{width:70px;padding:8px;font-size:20px;font-weight:800;text-align:center;border:2px solid #ffcb05;border-radius:10px}
    .adm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;padding:0 10px 10px;overflow:auto}
    .adm-grid button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border:2px solid #ddd;border-radius:10px;background:#f7f7f7;cursor:pointer;font-family:inherit}
    .adm-grid button:hover{border-color:#ffcb05;background:#fffbe6}
    .adm-grid img{width:64px;height:64px;object-fit:contain}
    .adm-grid span{font-size:13px;font-weight:700}
    .adm-grid small{font-size:11px;color:#888}
    .adm-forms{padding-top:10px;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}
    .adm-forms img{width:96px;height:96px}
    .adm-menu{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .adm-menu button{padding:12px 6px;border-radius:12px;border:3px solid #b8860b;background:linear-gradient(#fff7cc,#ffd84a);color:#3a2a00;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit}
    .adm-menu button.on{background:linear-gradient(#b6ffb0,#3ccf4e);border-color:#1d7a28;color:#063b0c}
    .adm-menu button:disabled{opacity:.45;cursor:default}
    .adm-crown{background:linear-gradient(#fff7cc,#ffd84a)!important;border-color:#b8860b!important;color:#3a2a00!important}`;
  document.head.appendChild(css);

  return {reserved, unlocked, unlock, allowName, isMe: n => reserved(n) && unlocked(), boost, pick, pickForm};
})();
