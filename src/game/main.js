// Εκκίνηση παιχνιδιού. Το Phaser έρχεται από το vendor/phaser.min.js (global).

import { NUM } from '../theme/palette.js';
import * as audio from '../theme/audio.js';
import * as engine from '../learning/engine.js';
import TitleScene from './scenes/TitleScene.js';
import BattleScene from './scenes/BattleScene.js';

// Οι γραμματοσειρές πρέπει να είναι φορτωμένες ΠΡΙΝ ζωγραφίσει το Phaser
// κείμενο — αλλιώς μετράει λάθος πλάτη και τα κεντραρίσματα χαλάνε.
const fonts = [
  '700 64px Comfortaa', '500 21px Comfortaa',
  '400 32px Andika', '700 32px Andika'
];

function boot() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: NUM.night,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { antialias: true },
    scene: [TitleScene, BattleScene]
  });

  // Ο browser δεν επιτρέπει ήχο πριν το πρώτο άγγιγμα του χρήστη.
  const unlock = () => {
    audio.startAmbience();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Το κινητό κρατά μπάρα διεύθυνσης και μενού ακόμα και πλαγιαστά, οπότε η
  // ωφέλιμη οθόνη μικραίνει — και μικραίνει κι άλλο μετά από εναλλαγή
  // εφαρμογών. Ο Scale Manager μετράει μία φορά και δεν διορθώνεται μόνος του,
  // γι' αυτό τον ξαναμετράμε σε κάθε αλλαγή.
  const refresh = () => { try { game.scale.refresh(); } catch (e) { /* πριν το boot */ } };
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', () => { setTimeout(refresh, 300); syncHint(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { setTimeout(refresh, 150); wake(game); }
  });
  window.addEventListener('focus', () => wake(game));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refresh);

  setupFullscreen(game, refresh);
  guardContext(game);

  window.flameGame = game; // λαβή για ελέγχους — δεν τη χρησιμοποιεί το παιχνίδι
  return game;
}

// ------------------------------------------------------------ πλήρης οθόνη
//
// ΠΡΟΣΟΧΗ — γιατί ΔΕΝ ζητάμε πια πλήρη οθόνη μέσα σε άγγιγμα του παιχνιδιού:
// το είχαμε βάλει σε κάθε pointerdown (v1.2.1) και το παιχνίδι ΠΑΓΩΝΕ στο
// κινητό. Η μετάβαση σε πλήρη οθόνη ξαναχτίζει το καμβά μέσα στην ίδια
// χειρονομία: το pointerup δεν φτάνει ποτέ στο Phaser, η σκηνή μένει σε
// κατάσταση «απασχολημένη» και δεν δέχεται άλλο άγγιγμα.
//
// Λύση: η πλήρης οθόνη ζητιέται ΜΟΝΟ από ένα δικό της κουμπί, έξω από τον
// καμβά. Το άγγιγμα που την ανοίγει δεν είναι ποτέ άγγιγμα του παιχνιδιού.

const hint = () => document.getElementById('rotate');

function fsAvailable() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

function isFs() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

// Τι δείχνει η λωρίδα κάθε στιγμή:
//   όρθιο            → «γύρισε το κινητό» (υπόδειξη, δεν δέχεται άγγιγμα)
//   πλάγιο, όχι fs   → «πλήρης οθόνη» (κουμπί)
//   πλήρης οθόνη     → τίποτα
function syncHint() {
  const el = hint();
  if (!el) return;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const portrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;

  if (portrait) {
    el.className = 'show';
    el.querySelector('.icon').textContent = '▯';
    el.querySelector('p').textContent = 'Γύρισε το κινητό στο πλάι για τη μάχη';
    return;
  }
  if (coarse && fsAvailable() && !isFs()) {
    el.className = 'show tap';
    el.querySelector('.icon').textContent = '⛶';
    el.querySelector('p').textContent = 'Πλήρης οθόνη';
    return;
  }
  el.className = '';
}

function setupFullscreen(game, refresh) {
  const el = hint();
  if (el) {
    el.addEventListener('click', (ev) => {
      if (!el.classList.contains('tap')) return;
      ev.preventDefault();
      ev.stopPropagation();
      goFullscreen();
    });
  }
  // Η αλλαγή κατάστασης αλλάζει το μέγεθος του καμβά — ξαναμετράμε ΚΑΙ
  // ξυπνάμε τον βρόχο, γιατί κάποιοι browsers τον παγώνουν στη μετάβαση.
  const onChange = () => {
    syncHint();
    setTimeout(() => { refresh(); wake(game); }, 120);
    setTimeout(refresh, 600);
  };
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  window.addEventListener('resize', syncHint);
  syncHint();
}

function goFullscreen() {
  try {
    if (isFs()) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => { /* δεν επιτρέπεται — συνεχίζουμε κανονικά */ });
  } catch (e) { /* δεν υποστηρίζεται — συνεχίζουμε κανονικά */ }
}

// --------------------------------------------------------------- αντοχή
//
// Το παιχνίδι δεν επιτρέπεται να μείνει παγωμένο σε καμία περίπτωση: το
// παιδί δεν ξέρει να κάνει ανανέωση. Δύο δίχτυα ασφαλείας:

// 1. Ο βρόχος του Phaser σταματά όταν ο browser κρύψει τη σελίδα. Αν το
//    «ξαναφάνηκε» χαθεί (συμβαίνει στη μετάβαση σε πλήρη οθόνη), μένει
//    σταματημένος για πάντα. Τον ξυπνάμε χειροκίνητα.
function wake(game) {
  try {
    if (!game || !game.loop) return;
    if (!game.loop.running) game.loop.wake();
    if (game.scene) {
      game.scene.scenes.forEach((s) => {
        if (s.sys.isPaused && s.sys.isPaused()) s.sys.resume();
      });
    }
  } catch (e) { /* τίποτα να κάνουμε */ }
}

// 2. Χαμένο WebGL context: ο καμβάς παγώνει στο τελευταίο καρέ. Σε κινητό
//    συμβαίνει σε μεταβάσεις και σε πίεση μνήμης. Δεν προσπαθούμε να το
//    ξαναχτίσουμε — φορτώνουμε ξανά τη σελίδα, η πρόοδος είναι αποθηκευμένη.
function guardContext(game) {
  const cv = game.canvas;
  if (!cv) return;
  cv.addEventListener('webglcontextlost', (ev) => {
    ev.preventDefault();
    setTimeout(() => { if (!game.renderer || !game.renderer.contextLost) return; location.reload(); }, 1200);
  });
  cv.addEventListener('webglcontextrestored', () => location.reload());
}

// Γραμματοσειρές ΚΑΙ Learning Engine έτοιμα πριν ανοίξει η πρώτη σκηνή.
const ready = [engine.init().catch((e) => console.error('learning init', e))];
if (document.fonts && document.fonts.load) {
  ready.push(...fonts.map((f) => document.fonts.load(f, 'Ο Δρόμος αιεη')));
}
Promise.all(ready).catch(() => {}).then(boot);
