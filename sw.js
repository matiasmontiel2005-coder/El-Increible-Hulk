const VERSION = 'imperium-v4';
const CORE = ['./', 'index.html', 'styles.css', 'app.js', 'motion.js', 'config.js', 'manifest.webmanifest',
  'vendor/chart.umd.min.js', 'vendor/supabase.min.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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
  const isFont = url.hostname.includes('fonts.g');
  if (!sameOrigin && !isFont) return;
  // Archivos propios: red primero (para recibir actualizaciones), caché si no hay conexión.
  if (sameOrigin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    })));
  }
});
