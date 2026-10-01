/* ACI CareerEDGE — Service Worker
 * Cache-first app shell. Handles extensionless URLs (/team → /team.html).
 * Bump CACHE whenever you deploy new HTML/JS files.
 */
const CACHE = 'aci-shell-v4';
const PRECACHE = [
  './',
  './index.html',
  './team.html',
  './admin.html',
  './users.js',
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

  /* Never cache the Apps Script API */
  if (url.hostname.indexOf('script.google.com') >= 0) return;
  /* Cross-origin: only allow Google Fonts */
  if (url.origin !== location.origin && url.hostname.indexOf('fonts.') === -1) return;

  var path = url.pathname;

  /* Extensionless navigation (/team, /admin, /index) → map to .html */
  var isExtensionless = path !== '/' && !/\.[a-z0-9]+$/i.test(path);

  e.respondWith(
    caches.match(req).then(function(cached){
      if (cached){
        /* Serve cached + refresh in background */
        fetch(req).then(function(res){
          if (res && res.ok){
            caches.open(CACHE).then(function(c){ c.put(req, res.clone()); });
          }
        }).catch(function(){});
        return cached;
      }

      /* Try .html fallback for extensionless paths */
      if (isExtensionless){
        return caches.match(path + '.html').then(function(hc){
          if (hc){
            fetch(req).then(function(res){
              if (res && res.ok){
                caches.open(CACHE).then(function(c){ c.put(req, res.clone()); });
              }
            }).catch(function(){});
            return hc;
          }
          return networkOrFallback(req);
        });
      }

      return networkOrFallback(req);
    })
  );
});

function networkOrFallback(req){
  return fetch(req).then(function(res){
    if (res && res.ok){
      var clone = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, clone); });
    }
    return res;
  }).catch(function(){
    if (req.mode === 'navigate') return caches.match('./index.html');
  });
}
