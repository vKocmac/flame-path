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

  window.flameGame = game; // λαβή για ελέγχους — δεν τη χρησιμοποιεί το παιχνίδι
  return game;
}

// Γραμματοσειρές ΚΑΙ Learning Engine έτοιμα πριν ανοίξει η πρώτη σκηνή.
const ready = [engine.init().catch((e) => console.error('learning init', e))];
if (document.fonts && document.fonts.load) {
  ready.push(...fonts.map((f) => document.fonts.load(f, 'Ο Δρόμος αιεη')));
}
Promise.all(ready).catch(() => {}).then(boot);
