// Marvel Türkiye — uygulama (PWA) servis çalışanı
// Sayfa, css ve js: önce internetten en yenisi, internet yoksa kayıtlı hâli.
// Resim ve sesler: bir kez indirilir, sonra hep telefondan/bilgisayardan açılır (sunucu kotası harcanmaz).
const CACHE = 'mt-v16';
const CORE = ['./', './index.html', './css/site.css', './js/app.js', './js/ekonomi.js', './manifest.webmanifest', './mt-logo-192.png', './mt-logo-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Firebase, giriş ve canlı bağlantılar asla önbelleğe alınmaz
  if (/googleapis|firebaseio|identitytoolkit|securetoken|peerjs|accounts\.google|micup/.test(url.host + url.pathname)) return;
  const same = url.origin === location.origin;
  const heavy = same && /\/(img|audio)\//.test(url.pathname);
  const lib = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|www\.gstatic\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (heavy || lib) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => put(req, res))));
  } else if (same) {
    e.respondWith(fetch(req).then(res => put(req, res)).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }
});
