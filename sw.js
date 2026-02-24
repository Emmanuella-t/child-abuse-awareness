/* =========================
   sw.js
   Service Worker (PWA)
   Goal: offline access to key crisis resources + core pages
   Privacy: do NOT cache POST requests or any user input
   Strategy: stale-while-revalidate for GET, cache-first for core shell
   ========================= */

   const CACHE_VERSION = "safeguard-v1";
   const CORE_CACHE = `${CACHE_VERSION}-core`;
   const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
   
   // Keep this list small for performance + reliability
   const CORE_ASSETS = [
     "/",
     "/index.html",
     "/css/styles.css",
     "/css/components.css",
     "/js/main.js",
     "/js/ai.js",
     "/js/playground.js",
     "/js/heard.js",
     "/pages/get-help.html",
     "/pages/learn.html",
     "/pages/playground.html",
     "/pages/professionals.html",
     "/pages/about.html",
     "/pages/heard.html",
     "/manifest.webmanifest",
     "/assets/icons/favicon.svg"
   ];
   
   // Install: pre-cache core shell
   self.addEventListener("install", (event) => {
     event.waitUntil(
       caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
     );
   });
   
   // Activate: clean old caches
   self.addEventListener("activate", (event) => {
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(
           keys.map((k) => {
             if (!k.startsWith(CACHE_VERSION)) return caches.delete(k);
             return Promise.resolve();
           })
         )
       ).then(() => self.clients.claim())
     );
   });
   
   // Fetch strategy
   self.addEventListener("fetch", (event) => {
    const req = event.request;
  
    // Privacy: never cache non-GET
    if (req.method !== "GET") return;
  
    // Ignore browser extensions and non-http(s) schemes
    if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) return;
  
    const url = new URL(req.url);
   
     // Avoid caching serverless function responses (AI, moderation)
     if (url.pathname.startsWith("/.netlify/functions/")) return;
   
     // Cache-first for core assets
     if (CORE_ASSETS.includes(url.pathname) || url.pathname === "/") {
       event.respondWith(cacheFirst(req));
       return;
     }
   
     // Stale-while-revalidate for other GETs (pages, images)
     event.respondWith(staleWhileRevalidate(req));
   });
   
   async function cacheFirst(req) {
     const cache = await caches.open(CORE_CACHE);
     const cached = await cache.match(req);
     if (cached) return cached;
   
     const fresh = await fetch(req);
     // Cache only successful, basic responses
     if (fresh && fresh.ok && fresh.type === "basic") cache.put(req, fresh.clone());
     return fresh;
   }
   
   async function staleWhileRevalidate(req) {
     const cache = await caches.open(RUNTIME_CACHE);
     const cached = await cache.match(req);
   
     const fetchPromise = fetch(req)
       .then((fresh) => {
         if (fresh && fresh.ok && fresh.type === "basic") cache.put(req, fresh.clone());
         return fresh;
       })
       .catch(() => cached); // If offline, fallback to cache
   
     // Serve cache immediately if available, otherwise wait for network
     return cached || fetchPromise;
   }