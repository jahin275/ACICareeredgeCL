/* ACI Careeredge — Service Worker
 * Cache-first for the app shell (HTML/CSS/JS/images/fonts).
 * Network-only for Apps Script API.
 * Bump CACHE version whenever you deploy new HTML files.
 */
const CACHE = 'aci-shell-v3';
const PRECACHE = [
  './',
  './index.html',
  './team.html',
  './admin.html',
  './favicon.png',
  './LOGO.png',
  './1.png','./2.png','./3.png','./4.png',
  './5.png','./6.png','./7.png','./8.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(PRECACHE.map(function(u){
        return c.add(u).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                             .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err){ return; }

  /* Never cache the Apps Script API — always live */
  if (url.hostname.indexOf('script.google.com') >= 0) return;
  /* Cross-origin: only allow Google Fonts */
  if (url.origin !== location.origin && url.hostname.indexOf('fonts.') === -1) return;

  e.respondWith(
    caches.match(req).then(function(cached){
      if (cached){
        /* Serve from disk, refresh silently in the background */
        fetch(req).then(function(res){
          if (res && res.ok){
            caches.open(CACHE).then(function(c){ c.put(req, res.clone()); });
          }
        }).catch(function(){});
        return cached;
      }
      return fetch(req).then(function(res){
        if (res && res.ok){
          var clone = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, clone); });
        }
        return res;
      }).catch(function(){
        /* If offline and it's a page navigation, fall back to index.html */
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});