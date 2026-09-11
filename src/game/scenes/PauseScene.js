// Παύση (NEXT-FIXES Ζ1): «αν θες να πας για κατούρημα… δεν χρειάζεται αυτό
// να πηγαίνει». Η μάχη παγώνει ΟΛΗ (scene.pause: κίνηση, χρονόμετρα, tween)
// και δεν χάνεται τίποτα — ούτε η μπάρα. Ξεχωριστή σκηνή, γιατί μια
// σταματημένη σκηνή δεν δέχεται αγγίγματα.
//
// Γραφικό, όχι λεκτικό (ιδιοκτήτης 11/09): ένα μεγάλο «▶» που ανασαίνει.
// Άγγιγμα οπουδήποτε → συνέχεια. Από κάτω τρία μικρά κουμπιά: ‹ τίτλος ·
// ♪ μουσική · ✦ εφέ (βγήκαν από τη μάχη για να χωρέσει το HUD πάνω).

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

    const cy = H / 2 - 40;
    const glow = this.add.image(W / 2, cy, 'glow-flame').setScale(1.5).setAlpha(.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    const disc = this.add.graphics({ x: W / 2, y: cy });
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

    // Τα μικρά κουμπιά: δίσκοι με σύμβολο, μια γραμμή πάνω τους όταν είναι κλειστά
    const by = cy + 170;
    const buttons = [];
    const button = (x, draw, onTap, isOn) => {
      const g = this.add.graphics({ x, y: by });
      const bar = this.add.rectangle(x, by, 44, 4, NUM.smoke).setAngle(-40).setAlpha(0);
      const paint = () => {
        g.clear();
        const on = isOn ? isOn() : true;
        g.fillStyle(NUM.night, 1);
        g.fillCircle(0, 0, 34);
        g.lineStyle(3, NUM.smoke, on ? .8 : .35);
        g.strokeCircle(0, 0, 34);
        draw(g, on ? NUM.parchment : NUM.smoke, on ? 1 : .5);
        bar.setAlpha(on ? 0 : .9);
      };
      paint();
      const zone = this.add.zone(x, by, 84, 84).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p, lx, ly, ev) => {
        if (ev) ev.stopPropagation();
        onTap();
        paint();
      });
      buttons.push(zone);
    };

    button(W / 2 - 130, (g, c, a) => {                      // ‹ — πίσω στον τίτλο
      g.lineStyle(6, c, a);
      g.strokePoints([new Phaser.Geom.Point(8, -16), new Phaser.Geom.Point(-8, 0), new Phaser.Geom.Point(8, 16)]);
    }, () => this.leave(() => {
      const b = this.scene.get('Battle');
      if (b) b.userPaused = false;
      audio.hold(false);
      this.scene.stop('Battle');
      this.scene.start('Title');
    }));

    button(W / 2, (g, c, a) => {                            // ♪ — μουσική
      g.fillStyle(c, a);
      g.fillEllipse(-6, 12, 16, 12);
      g.fillRect(0, -18, 4, 30);
      g.fillTriangle(4, -18, 16, -12, 4, -6);
    }, () => audio.toggleMusic(), () => audio.musicOn);

    button(W / 2 + 130, (g, c, a) => {                      // ✦ — εφέ (σπίθα)
      g.fillStyle(c, a);
      g.fillPoints([[0, -18], [5, -5], [18, 0], [5, 5], [0, 18], [-5, 5], [-18, 0], [-5, -5]]
        .map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
    }, () => audio.toggleFx(), () => audio.fxOn);

    // Άγγιγμα οπουδήποτε αλλού = συνέχεια (μικρό παιδί: όχι κυνήγι κουμπιού)
    this.input.on('pointerdown', (p, over) => {
      if (over && over.some((o) => buttons.includes(o))) return;
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
