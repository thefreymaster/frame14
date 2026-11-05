// The service worker: the page and its bundle from the cache on every launch,
// so a cold start needs the network only for the data (the API and the
// socket, which always go to the server).
//
// Vite names the bundle's files by their content (/assets/index-<hash>.js), so
// a cached one is never stale: they are served cache first, and cached as
// they are first fetched. At install the current page's files are fetched
// ahead of time. The page itself (index.html, which names the files) goes to
// the network first — a new build names new files — and comes from the cache
// only when the server can't be reached; each fresh page prunes the files of
// older builds from the cache.
const CACHE = "frame14-v4";
const ASSET = /^\/assets\/[^?]+$/;

/** The hashed files a page names. */
function assetsOf(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
    (m) => m[1],
  );
}

async function prune(cache, html) {
  const keep = new Set(assetsOf(html));
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (ASSET.test(path) && !keep.has(path)) await cache.delete(req);
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch("/", { cache: "no-cache" });
        if (res.ok) {
          const html = await res.clone().text();
          await cache.put("/", res);
          await cache.addAll(assetsOf(html));
        }
      } catch {
        // No server right now: the files are cached as they are fetched.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== "GET") return;
  // Data, the socket and the videos: always the server.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.pathname.startsWith("/videos/")
  ) {
    return;
  }

  if (e.request.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(e.request);
          if (res.ok) {
            const copy = res.clone();
            e.waitUntil(
              (async () => {
                const cache = await caches.open(CACHE);
                const html = await copy.clone().text();
                await cache.put("/", copy);
                await prune(cache, html);
              })(),
            );
          }
          return res;
        } catch {
          return (await caches.match("/")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (ASSET.test(url.pathname)) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) e.waitUntil(cache.put(e.request, res.clone()));
        return res;
      })(),
    );
    return;
  }

  // Icons, the manifest and the rest: the server, else whatever is cached.
  e.respondWith(
    fetch(e.request).catch(
      async () => (await caches.match(e.request)) ?? Response.error(),
    ),
  );
});

// Notifications (0.160.0): push.js sends { title, body, tag, url } — a Home
// Assistant automation's `frame14_notify` — to the devices that turned them
// on in Settings. A later one with the same tag replaces it. A tap opens the
// app on its page: the window already open, else a new one.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data?.json() ?? {};
  } catch {
    data = { body: e.data?.text() ?? "" };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "Frame14", {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/web-app-manifest-192x192.png",
      badge: "/favicon-96x96.png",
      data: { url: data.url || "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/home", self.location.origin);
  if (url.origin !== self.location.origin) return;
  e.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find(
        (w) => new URL(w.url).origin === self.location.origin,
      );
      if (open) {
        await open.focus();
        await open.navigate?.(url.href).catch(() => {});
        return;
      }
      await self.clients.openWindow(url.href);
    })(),
  );
});
