/* Portal AI Agent Connector — service worker.
   מקבל בקשות מהדף (דרך content.js) ומבצע פעולות ברמת הדפדפן. */

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === "LIST_TABS") {
    // כל הטאבים בכל החלונות (מלבד טאבים פנימיים של הדפדפן)
    chrome.tabs.query({}, function (tabs) {
      var out = (tabs || [])
        .filter(function (t) {
          var u = t.url || "";
          return /^https?:\/\//i.test(u); // דפי אינטרנט בלבד
        })
        .map(function (t) {
          return { id: t.id, title: t.title || "", url: t.url || "", favIconUrl: t.favIconUrl || "" };
        });
      sendResponse({ ok: true, tabs: out });
    });
    return true; // תגובה אסינכרונית
  }

  if (msg.type === "RUN_TASK") {
    // שלב 1: מעבר לטאב הנבחר (וממקד את החלון שלו).
    // שלב 2 (בהמשך): הזרקת סקריפט אוטומציה + לולאת Gemini.
    if (typeof msg.tabId === "number") {
      chrome.tabs.update(msg.tabId, { active: true }, function (tab) {
        if (tab && tab.windowId != null) chrome.windows.update(tab.windowId, { focused: true });
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "TASK_DONE") {
    // בעתיד: להחזיר מיקוד לפורטל / לסגור את טאב היעד לפי הצורך.
    sendResponse({ ok: true });
    return true;
  }
});
