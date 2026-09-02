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
    goFullscreen(game);
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
  window.addEventListener('orientationchange', () => setTimeout(refresh, 300));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(refresh, 150);
  });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refresh);

  window.flameGame = game; // λαβή για ελέγχους — δεν τη χρησιμοποιεί το παιχνίδι
  return game;
}

// Πλήρης οθόνη με το πρώτο άγγιγμα: είναι ο ΜΟΝΟΣ τρόπος να φύγουν η μπάρα
// διεύθυνσης και το μενού στο Android. Επιτρέπεται μόνο μέσα σε χειρονομία
// χρήστη, γι' αυτό ζει μαζί με το ξεκλείδωμα του ήχου. Σε iPhone δεν
// υποστηρίζεται — το catch το αγνοεί σιωπηλά.
function goFullscreen(game) {
  if (!window.matchMedia) return;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  // Μόνο σε συσκευή αφής ΚΑΙ μόνο πλαγιαστά: όρθιο το θέλουμε κανονικό,
  // γιατί εκεί γίνονται τα μενού και η εισαγωγή λέξεων.
  if (!coarse || !landscape) return;
  // Καλούμε απευθείας το DOM API ώστε να πιάσουμε ΚΑΙ την ασύγχρονη απόρριψη
  // (π.χ. μέσα σε iframe χωρίς άδεια) — αλλιώς πετάει σφάλμα στην κονσόλα.
  try {
    if (document.fullscreenElement) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => { /* δεν επιτρέπεται — συνεχίζουμε κανονικά */ });
  } catch (e) { /* δεν υποστηρίζεται — συνεχίζουμε κανονικά */ }
}

// Γραμματοσειρές ΚΑΙ Learning Engine έτοιμα πριν ανοίξει η πρώτη σκηνή.
const ready = [engine.init().catch((e) => console.error('learning init', e))];
if (document.fonts && document.fonts.load) {
  ready.push(...fonts.map((f) => document.fonts.load(f, 'Ο Δρόμος αιεη')));
}
Promise.all(ready).catch(() => {}).then(boot);
