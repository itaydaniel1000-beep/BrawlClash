/* Service Worker לפורטל — מאפשר התקנה כאפליקציה ועבודה ללא אינטרנט (shell). */
const CACHE = "portal-v24";
const ASSETS = [
  "index.html", "games.html", "videos.html", "sites.html", "notes.html", "groups.html", "calculator.html", "space-ghosts.html",
  "category.css", "access.js", "cookies.js",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // אל תיגע בסרטונים הכבדים — תמיד מהרשת (streaming)
  if (req.url.includes("/videos/")) return;

  // דפי HTML: network-first — תמיד הגרסה העדכנית כשיש רשת, נפילה למטמון כשאין.
  // כך עדכונים מופיעים מיד בלי מטמון תקוע.
  const isHTML = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // שאר הנכסים (css/js/אייקונים): cache-first עם התעלמות מ-?v=
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req))
  );
});
