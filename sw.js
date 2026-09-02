// Service worker — offline cache. Σε κάθε αλλαγή αρχείων ανεβαίνει το VERSION,
// αλλιώς οι συσκευές κρατούν την παλιά έκδοση.
const VERSION = 'flame-v1.1.0';

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
  './src/game/enemies.js',
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

// Ο κώδικας αλλάζει, τα βαριά αρχεία όχι. Δύο στρατηγικές:
//
//   ΚΩΔΙΚΑΣ (html, js, json)  → network-first. Όταν υπάρχει δίκτυο παίρνει
//     πάντα το φρέσκο από το GitHub, αλλιώς πέφτει στην cache. Έτσι η
//     συσκευή δεν κολλάει ποτέ σε παλιά έκδοση χωρίς εκκαθάριση browser.
//   ΥΠΟΛΟΙΠΑ (γραμματοσειρές, phaser, εικόνες) → cache-first. Δεν αλλάζουν
//     ποτέ και ζυγίζουν· δεν έχει νόημα να ξανακατεβαίνουν.
const CODE = /\.(?:html|js|json)$/i;

function isCode(url) {
  return url.origin === self.location.origin &&
    (CODE.test(url.pathname) || url.pathname.endsWith('/'));
}

function put(request, res) {
  if (res.ok && new URL(request.url).origin === self.location.origin) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(request, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (isCode(url)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => put(e.request, res))
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then((hit) => hit || (e.request.mode === 'navigate'
            ? caches.match('./index.html')
            : Response.error())))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => put(e.request, res))
        .catch(() => Response.error());
    })
  );
});
