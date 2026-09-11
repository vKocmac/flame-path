// Παύση (NEXT-FIXES Ζ1): «αν θες να πας για κατούρημα… δεν χρειάζεται αυτό
// να πηγαίνει». Η μάχη παγώνει ΟΛΗ (scene.pause: κίνηση, χρονόμετρα, tween)
// και δεν χάνεται τίποτα — ούτε η μπάρα. Ξεχωριστή σκηνή, γιατί μια
// σταματημένη σκηνή δεν δέχεται αγγίγματα.
//
// Γραφικό, όχι λεκτικό (ιδιοκτήτης 11/09): ένα μεγάλο «▶» που ανασαίνει.
// Άγγιγμα οπουδήποτε → συνέχεια. Το ‹ πάνω αριστερά → τίτλος.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import * as audio from '../../theme/audio.js';

const W = 1280, H = 720;

export default class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create() {
    this.leaving = false;                       // η σκηνή ξαναχρησιμοποιείται
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setAlpha(0);
    // Σκοτεινό αρκετά ώστε οι φούσκες από κάτω να μη μοιάζουν πατήσιμες
    this.tweens.add({ targets: veil, alpha: .86, duration: 220 });

    const glow = this.add.image(W / 2, H / 2, 'glow-flame').setScale(1.5).setAlpha(.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    const disc = this.add.graphics({ x: W / 2, y: H / 2 });
    disc.fillStyle(NUM.flameDeep, .95);
    disc.fillCircle(0, 0, 84);
    disc.lineStyle(6, NUM.flameCore, 1);
    disc.strokeCircle(0, 0, 84);
    disc.fillStyle(NUM.flameCore, 1);
    disc.fillTriangle(-26, -40, -26, 40, 42, 0);           // ▶ — κέντρο βάρους στο κέντρο
    disc.setScale(.6).setAlpha(0);
    this.tweens.add({ targets: disc, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: glow, scale: 1.9, alpha: .3, duration: 1100,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const home = this.add.text(38, 34, '‹', {
      fontFamily: FONT.ui, fontSize: '40px', color: HEX.smoke
    }).setOrigin(.5).setInteractive({ useHandCursor: true });

    home.on('pointerdown', (p, lx, ly, ev) => {
      if (ev) ev.stopPropagation();
      this.leave(() => {
        const b = this.scene.get('Battle');
        if (b) b.userPaused = false;
        audio.hold(false);
        this.scene.stop('Battle');
        this.scene.start('Title');
      });
    });
    // Άγγιγμα οπουδήποτε αλλού = συνέχεια (μικρό παιδί: όχι κυνήγι κουμπιού)
    this.input.on('pointerdown', (p, over) => {
      if (over && over.includes(home)) return;
      this.leave(() => this.resumeBattle());
    });
  }

  leave(fn) {
    if (this.leaving) return;
    this.leaving = true;
    fn();
  }

  resumeBattle() {
    const b = this.scene.get('Battle');
    if (b) b.userPaused = false;
    audio.hold(false);
    this.scene.resume('Battle');
    this.scene.stop();
  }
}
