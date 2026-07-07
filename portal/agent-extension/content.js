/* Portal AI Agent Connector — content script (גשר דו-כיווני בין הדף לתוסף).
   דף → תוסף: window.postMessage({source:'portal-agent',...})
   תוסף → דף: window.postMessage({source:'portal-agent-ext',...}) */

(function () {
  "use strict";

  function toPage(msg) { window.postMessage(Object.assign({ source: "portal-agent-ext" }, msg), "*"); }
  function announce() { toPage({ type: "READY" }); }
  announce(); setTimeout(announce, 300); setTimeout(announce, 1000);

  // דף → תוסף
  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.source !== "portal-agent") return;

    if (d.type === "PING") { announce(); return; }

    if (d.type === "LIST_TABS") {
      try {
        chrome.runtime.sendMessage({ type: "LIST_TABS" }, function (res) {
          if (chrome.runtime.lastError) return;
          toPage({ type: "TABS", tabs: (res && res.tabs) || [] });
        });
      } catch (e) {}
      return;
    }

    // שאר ההודעות (RUN_TASK, CONFIRM_RESULT, CANCEL_TASK, TASK_DONE) — מעבירים ל-service worker
    try {
      var m = Object.assign({}, d); delete m.source;
      chrome.runtime.sendMessage(m, function () { void chrome.runtime.lastError; });
    } catch (e) {}
  });

  // תוסף → דף (התקדמות, בקשות אישור, סיום)
  try {
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg && msg.source === "portal-agent-ext-relay") {
        var m = Object.assign({}, msg); delete m.source;
        toPage(m);
      }
    });
  } catch (e) {}
})();
