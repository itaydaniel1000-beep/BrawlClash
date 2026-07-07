/* Portal AI Agent Connector — content script (גשר בין הדף לתוסף).
   רץ בתוך דף הפורטל, מתקשר עם הדף דרך window.postMessage
   ועם ה-service worker דרך chrome.runtime. */

(function () {
  "use strict";

  function toPage(msg) {
    window.postMessage(Object.assign({ source: "portal-agent-ext" }, msg), "*");
  }

  // מכריזים על נוכחות התוסף (כמה פעמים, למקרה שהדף עדיין לא מאזין)
  function announce() { toPage({ type: "READY" }); }
  announce();
  setTimeout(announce, 300);
  setTimeout(announce, 1000);

  // בקשות מהדף
  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.source !== "portal-agent") return;

    if (d.type === "PING") {
      announce();
    } else if (d.type === "LIST_TABS") {
      try {
        chrome.runtime.sendMessage({ type: "LIST_TABS" }, function (res) {
          if (chrome.runtime.lastError) { return; }
          toPage({ type: "TABS", tabs: (res && res.tabs) || [] });
        });
      } catch (e) {}
    } else if (d.type === "RUN_TASK") {
      try { chrome.runtime.sendMessage({ type: "RUN_TASK", tabId: d.tabId, goal: d.goal }, function () {}); } catch (e) {}
    } else if (d.type === "TASK_DONE") {
      try { chrome.runtime.sendMessage({ type: "TASK_DONE" }, function () {}); } catch (e) {}
    }
  });
})();
