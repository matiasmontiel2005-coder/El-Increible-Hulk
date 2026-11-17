const VERSION = 'imperium-v15';
const CORE = ['./', 'index.html', 'guard.js', 'vendor/fonts/cinzel-latin-500-normal.woff2', 'vendor/fonts/cinzel-latin-700-normal.woff2', 'styles.css', 'app.js', 'motion.js', 'config.js', 'manifest.webmanifest',
  'vendor/chart.umd.min.js', 'vendor/supabase.min.js', 'icons/favicon-48.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' = ignora la memoria HTTP del navegador (GitHub Pages permite guardarla 10 min).
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Datos en vivo (Supabase): siempre red, nunca caché.
  if (url.hostname.endsWith('supabase.co')) return;
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin) return; // nada de terceros pasa por la caché
  // Archivos propios: red primero (para recibir actualizaciones), caché si no hay conexión.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { // revalida siempre con el servidor
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
