/* Service Worker לפורטל — מאפשר התקנה כאפליקציה ועבודה ללא אינטרנט (shell). */
const CACHE = "portal-v2";
const ASSETS = [
  "index.html", "games.html", "videos.html", "sites.html", "notes.html",
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

  // shell: cache-first עם התעלמות מ-?v= ; אחרת רשת עם נפילה למטמון
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      return cached || fetch(req).catch(() => cached);
    })
  );
});
