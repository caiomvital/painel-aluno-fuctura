// Cache only a versioned allowlist of public icons, never pages, API data or sessions.
const CACHE_NAME = 'fuctura-public-v2';
const ASSETS = ['/icon.svg','/pwa-192x192.png','/pwa-512x512.png','/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('fuctura-') && name!==CACHE_NAME).map(name=>caches.delete(name)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET' || url.origin!==self.location.origin || !ASSETS.includes(url.pathname) || url.search)return;
 event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request)));
});
