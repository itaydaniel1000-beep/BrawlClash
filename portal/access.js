/* מערכת קוד גישה לפורטל.
   102 -> פותח את הסרטונים | 110 -> פותח את "האתר שלי".
   הבחירה נשמרת ב-COOKIE אמיתי (path=/, שנה) + localStorage כגיבוי,
   כך שהזכירה עובדת בכל הדפים בדומיין וגם אחרי F5 / סגירת הדפדפן. */
(function () {
  var CODES = { "102": "videos", "110": "site" };       // קוד -> אזור
  var FLAG  = { videos: "unlock_videos", site: "unlock_site" };
  var LABEL = { videos: "הסרטונים", site: "האתר שלי" };

  // ---------- אחסון משותף: cookie (ראשי) + localStorage (גיבוי) ----------
  function storeSet(k, v) {
    try { document.cookie = k + "=" + encodeURIComponent(v) + "; path=/; max-age=31536000; SameSite=Lax"; } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function storeGet(k) {
    var m = document.cookie.match("(?:^|; )" + k + "=([^;]*)");
    if (m) return decodeURIComponent(m[1]);
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function storeDel(k) {
    try { document.cookie = k + "=; path=/; max-age=0"; } catch (e) {}
    try { localStorage.removeItem(k); } catch (e) {}
  }

  function isUnlocked(area) { return storeGet(FLAG[area]) === "1"; }
  function unlock(area) { storeSet(FLAG[area], "1"); }

  // ---------- עיצוב (מוזרק פעם אחת) ----------
  var stylesAdded = false;
  function ensureStyles() {
    if (stylesAdded) return; stylesAdded = true;
    var s = document.createElement("style");
    s.textContent = `
      .gate-overlay {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(8,10,20,.78); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; padding: 20px;
        font-family: "Segoe UI","Heebo",system-ui,sans-serif;
      }
      .gate-box {
        background: #1c2238; border: 1px solid #2c3556; border-radius: 20px;
        padding: 30px 28px; width: min(380px, 92vw); text-align: center;
        box-shadow: 0 24px 60px rgba(0,0,0,.6); color: #eef1ff;
        animation: gate-pop .25s ease;
      }
      @keyframes gate-pop { from { transform: scale(.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .gate-box .lock { font-size: 2.6rem; }
      .gate-box h3 { font-size: 1.25rem; margin: 10px 0 6px; }
      .gate-box .hint { color: #9aa3c7; font-size: .9rem; margin-bottom: 18px; }
      .gate-input {
        width: 100%; text-align: center; font-size: 1.5rem; letter-spacing: .3em;
        padding: 12px; border-radius: 12px; border: 1px solid #2c3556;
        background: #11162a; color: #eef1ff; outline: none; font-family: inherit;
      }
      .gate-input:focus { border-color: #6c8cff; }
      .gate-err { color: #ff6b8a; font-size: .9rem; min-height: 20px; margin: 8px 0; }
      .gate-actions { display: flex; gap: 10px; justify-content: center; }
      .gate-actions button {
        border: none; border-radius: 999px; padding: 11px 24px; font-size: 1rem;
        font-weight: 700; cursor: pointer; font-family: inherit; transition: transform .15s, filter .15s;
      }
      .gate-actions button:hover { transform: scale(1.05); }
      .gate-ok { background: linear-gradient(90deg,#6c8cff,#b06cff); color: #fff; }
      .gate-cancel { background: rgba(255,255,255,.08); color: #9aa3c7; border: 1px solid #2c3556; }
    `;
    document.head.appendChild(s);
  }

  // ---------- חלון קוד גישה ----------
  function openModal(area, onUnlock) {
    ensureStyles();
    var overlay = document.createElement("div");
    overlay.className = "gate-overlay";
    overlay.innerHTML = `
      <div class="gate-box">
        <div class="lock">🔒</div>
        <h3>קוד גישה ל${LABEL[area]}</h3>
        <p class="hint">הכנס את הקוד כדי להמשיך</p>
        <input class="gate-input" type="password" inputmode="numeric" maxlength="6" placeholder="••••" />
        <div class="gate-err"></div>
        <div class="gate-actions">
          <button class="gate-cancel">ביטול</button>
          <button class="gate-ok">כניסה</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    var input = overlay.querySelector(".gate-input");
    var err = overlay.querySelector(".gate-err");
    input.focus();
    function close() { overlay.remove(); }
    function submit() {
      var v = input.value.trim();
      if (CODES[v] === area) { unlock(area); close(); onUnlock && onUnlock(); }
      else { err.textContent = "קוד שגוי, נסה שוב"; input.value = ""; input.focus(); }
    }
    overlay.querySelector(".gate-ok").onclick = submit;
    overlay.querySelector(".gate-cancel").onclick = close;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }

  // ---------- שמירה על תוכן בתוך הדף (דף הסרטונים) ----------
  // אם נעול: מציג כרטיס נעילה בתוך container; בהצלחה -> מריץ onUnlock.
  function guard(container, area, onUnlock) {
    if (isUnlocked(area)) { onUnlock(); return; }
    ensureStyles();
    container.innerHTML = `
      <div class="gate-box" style="margin:40px auto;">
        <div class="lock">🔒</div>
        <h3>${LABEL[area]} נעולים</h3>
        <p class="hint">הכנס קוד גישה כדי לצפות</p>
        <input class="gate-input" type="password" inputmode="numeric" maxlength="6" placeholder="••••" />
        <div class="gate-err"></div>
        <div class="gate-actions">
          <button class="gate-ok">כניסה</button>
        </div>
      </div>`;
    var input = container.querySelector(".gate-input");
    var err = container.querySelector(".gate-err");
    input.focus();
    function submit() {
      var v = input.value.trim();
      if (CODES[v] === area) { unlock(area); onUnlock(); }
      else { err.textContent = "קוד שגוי, נסה שוב"; input.value = ""; input.focus(); }
    }
    container.querySelector(".gate-ok").onclick = submit;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }

  // ---------- יירוט קישורים נעולים (data-gate="site") ----------
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-gate]");
    if (!a) return;
    var area = a.getAttribute("data-gate");
    if (isUnlocked(area)) return;          // כבר פתוח -> אפשר להמשיך
    e.preventDefault();
    openModal(area, function () { window.location.href = a.href; });
  });

  // ---------- שורת קוד הגישה בדף הבית ----------
  function submitHomeCode() {
    var inp = document.getElementById("accessCode");
    var msg = document.getElementById("accessMsg");
    var v = (inp.value || "").trim();
    var area = CODES[v];
    if (area) {
      unlock(area);
      msg.textContent = "✓ נפתחה גישה ל" + LABEL[area];
      msg.style.color = "#6cffa0";
      inp.value = "";
    } else {
      msg.textContent = "✗ קוד שגוי";
      msg.style.color = "#ff6b8a";
    }
    refreshHomeStatus();
  }

  // מציג בבירור מה כבר פתוח — כך שגם אחרי F5 רואים שהגישה נשמרה
  function refreshHomeStatus() {
    var el = document.getElementById("accessStatus");
    if (!el) return;
    function badge(area) {
      return isUnlocked(area)
        ? '<b style="color:#6cffa0">פתוח ✓</b>'
        : '<span style="color:#9aa3c7">נעול 🔒</span>';
    }
    el.innerHTML = "🎬 סרטונים: " + badge("videos") +
      " &nbsp;&nbsp;|&nbsp;&nbsp; 🏠 האתר שלי: " + badge("site");
  }

  function lockAll() {
    storeDel(FLAG.videos);
    storeDel(FLAG.site);
    var msg = document.getElementById("accessMsg");
    if (msg) { msg.textContent = "🔒 הכול ננעל מחדש"; msg.style.color = "#9aa3c7"; }
    refreshHomeStatus();
  }

  // הצג סטטוס מיד עם טעינת דף הבית
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshHomeStatus);
  } else {
    refreshHomeStatus();
  }

  window.AccessGate = {
    isUnlocked: isUnlocked, openModal: openModal, guard: guard,
    submitHomeCode: submitHomeCode, refreshHomeStatus: refreshHomeStatus, lockAll: lockAll
  };
})();
