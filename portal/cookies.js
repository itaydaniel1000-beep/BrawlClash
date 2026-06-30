/* באנר הסכמה לעוגיות — משותף לכל דפי הפורטל.
   זוכר את הבחירה ב-COOKIE אמיתי (path=/, שנה) + localStorage כגיבוי. */
(function () {
  var KEY = "portal_cookie_consent";

  function storeSet(k, v) {
    try { document.cookie = k + "=" + encodeURIComponent(v) + "; path=/; max-age=31536000; SameSite=Lax"; } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function storeGet(k) {
    var m = document.cookie.match("(?:^|; )" + k + "=([^;]*)");
    if (m) return decodeURIComponent(m[1]);
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  if (storeGet(KEY)) return; // כבר בחר — לא מציגים

  // ----- עיצוב -----
  var style = document.createElement("style");
  style.textContent = `
    .cookie-banner {
      position: fixed;
      inset-inline: 16px;
      bottom: 16px;
      z-index: 9999;
      max-width: 760px;
      margin: 0 auto;
      background: #1c2238;
      border: 1px solid #2c3556;
      border-radius: 16px;
      box-shadow: 0 18px 50px rgba(0,0,0,.5);
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      color: #eef1ff;
      font-family: "Segoe UI", "Heebo", system-ui, sans-serif;
      animation: cookie-up .35s ease;
    }
    @keyframes cookie-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .cookie-banner .txt { flex: 1 1 260px; font-size: .95rem; line-height: 1.5; }
    .cookie-banner .txt strong { font-size: 1.05rem; }
    .cookie-banner .txt p { color: #9aa3c7; margin-top: 4px; }
    .cookie-banner .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .cookie-banner button {
      border: none;
      border-radius: 999px;
      padding: 11px 22px;
      font-size: .95rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: transform .15s, filter .15s, background .15s;
    }
    .cookie-banner button:hover { transform: scale(1.05); }
    .cookie-banner .accept {
      background: linear-gradient(90deg, #6c8cff, #b06cff);
      color: #fff;
    }
    .cookie-banner .accept:hover { filter: brightness(1.1); }
    .cookie-banner .decline {
      background: rgba(255,255,255,.08);
      color: #9aa3c7;
      border: 1px solid #2c3556;
    }
    .cookie-banner .decline:hover { color: #eef1ff; }
  `;
  document.head.appendChild(style);

  // ----- הבאנר -----
  var banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <div class="txt">
      <strong>🍪 אנחנו משתמשים בעוגיות</strong>
      <p>האתר משתמש בעוגיות כדי לזכור את ההעדפות שלך ולשפר את החוויה.</p>
    </div>
    <div class="actions">
      <button class="decline">דחה</button>
      <button class="accept">אני מסכים</button>
    </div>
  `;
  document.body.appendChild(banner);

  function choose(value) {
    storeSet(KEY, value);
    banner.style.transition = "opacity .25s, transform .25s";
    banner.style.opacity = "0";
    banner.style.transform = "translateY(20px)";
    setTimeout(function () { banner.remove(); }, 260);
  }

  banner.querySelector(".accept").addEventListener("click", function () { choose("accepted"); });
  banner.querySelector(".decline").addEventListener("click", function () { choose("declined"); });
})();

/* רישום ה-Service Worker — מאפשר התקנה כאפליקציה ועבודה ללא אינטרנט */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}
