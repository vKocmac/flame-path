// Service worker — offline cache. Σε κάθε αλλαγή αρχείων ανεβαίνει το VERSION,
// αλλιώς οι συσκευές κρατούν την παλιά έκδοση.
const VERSION = 'flame-v0.5.0';

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/phaser.min.js',
  './assets/fonts/fonts.css',
  './assets/fonts/andika-400-full.woff2',
  './assets/fonts/andika-700-full.woff2',
  './assets/fonts/comfortaa-500-greek.woff2',
  './assets/fonts/comfortaa-500-latin.woff2',
  './assets/fonts/comfortaa-700-greek.woff2',
  './assets/fonts/comfortaa-700-latin.woff2',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/flame.png',
  './src/shared/ids.js',
  './src/shared/graphemes.js',
  './src/shared/storage.js',
  './src/parent/parent.js',
  './src/parent/parent.css',
  './src/learning/engine.js',
  './src/learning/scheduler.js',
  './src/learning/telemetry.js',
  './config/learning.json',
  './src/theme/palette.js',
  './src/theme/strings.js',
  './src/theme/audio.js',
  './src/game/main.js',
  './src/game/textures.js',
  './src/game/world.js',
  './src/game/scenes/TitleScene.js',
  './src/game/scenes/BattleScene.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Ό,τι κατέβηκε επιτυχώς από το δικό μας origin μπαίνει στην cache.
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
