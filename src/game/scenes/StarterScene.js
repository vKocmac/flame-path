// Πρώτη φορά, καμία λέξη (13/09): αντί για «Δεν έχω τεχνικές να σου μάθω»,
// η φωτιά του τίτλου προτείνει το βασικό πακέτο. Ένα άγγιγμα στο «Ναι» και
// το παιδί είναι ήδη στη μάχη. Ο τίτλος από κάτω ΠΑΓΩΝΕΙ όσο είναι ανοιχτό.
//
// «Όχι» = πίσω στον τίτλο, χωρίς να ανοίξει το Parent Mode: το PIN το ορίζει
// ο γονιός, όχι το παιδί που έτυχε να πατήσει. Η προσφορά ξαναέρχεται σε
// κάθε άγγιγμα της φωτιάς όσο το προφίλ δεν έχει καμία λέξη — χωρίς λέξεις
// δεν υπάρχει παιχνίδι να παιχτεί.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import * as store from '../../shared/storage.js';
import * as world from '../world.js';
import { loadStarterPack, STARTER_COUNT } from '../../shared/starterPack.js';

const W = 1280, H = 720;
const INK = '#3B2A1A';

export default class StarterScene extends Phaser.Scene {
  constructor() { super('Starter'); }

  create() {
    this.leaving = false;                       // η σκηνή ξαναχρησιμοποιείται
    const calm = world.isCalm();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setAlpha(0).setInteractive();
    this.tweens.add({ targets: veil, alpha: .96, duration: 220 });   // όπως το κατάστημα: ο τίτλος από κάτω δεν πρέπει να διαβάζεται

    // Ο πάπυρος με τρεις λέξεις του πακέτου — πάντα η σωστή μορφή
    const sy = 176;
    const scroll = this.add.graphics({ x: W / 2, y: sy });
    scroll.fillStyle(NUM.parchment, 1);
    scroll.fillRoundedRect(-250, -62, 500, 124, 10);
    scroll.fillStyle(0x6B4E36, 1);
    scroll.fillRoundedRect(-270, -74, 20, 148, 8);
    scroll.fillRoundedRect(250, -74, 20, 148, 8);
    const sample = this.add.text(W / 2, sy, 'λιμάνι  ·  σπίτι  ·  ψωμί', {
      fontFamily: FONT.word, fontSize: '40px', fontStyle: '700', color: INK
    }).setOrigin(.5);
    const glow = this.add.image(W / 2, sy, 'glow-lantern').setScale(2.6).setAlpha(.28)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(-1);

    const title = this.add.text(W / 2, 318, TXT.starterTitle, {
      fontFamily: FONT.ui, fontSize: '42px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5);
    title.setShadow(0, 0, HEX.flame, 18, false, true);
    this.add.text(W / 2, 376, TXT.starterBody(STARTER_COUNT), {
      fontFamily: FONT.ui, fontSize: '26px', color: '#EDE9DC'
    }).setOrigin(.5);
    this.add.text(W / 2, 416, TXT.starterHint, {
      fontFamily: FONT.ui, fontSize: '20px', color: HEX.smoke
    }).setOrigin(.5);

    // «Ναι» — μεγάλο, φλογισμένο, ανασαίνει
    const yes = this.add.container(W / 2, 520);
    const yg = this.add.graphics();
    yg.fillStyle(NUM.flameDeep, .95);
    yg.fillRoundedRect(-180, -44, 360, 88, 44);
    yg.lineStyle(5, NUM.flameCore, 1);
    yg.strokeRoundedRect(-180, -44, 360, 88, 44);
    yes.add([yg, this.add.text(0, 0, TXT.starterYes, {
      fontFamily: FONT.ui, fontSize: '34px', fontStyle: '700', color: '#FFF3D6'
    }).setOrigin(.5)]);
    yes.setScale(.7).setAlpha(0);
    this.tweens.add({ targets: yes, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut',
      onComplete: () => {
        if (!calm) this.tweens.add({ targets: yes, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } });
    if (!calm) {
      this.tweens.add({ targets: glow, alpha: .45, scale: 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.zone(W / 2, 520, 380, 104).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close(true));

    // «Όχι» — μικρό, ήσυχο
    this.add.text(W / 2, 628, TXT.starterNo, {
      fontFamily: FONT.ui, fontSize: '22px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(.85);
    this.add.text(W / 2, 664, TXT.starterWhere, {
      fontFamily: FONT.ui, fontSize: '16px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(.5);
    this.add.zone(W / 2, 640, 420, 76).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close(false));

    void scroll; void sample;
  }

  close(accept) {
    if (this.leaving) return;
    this.leaving = true;
    const title = this.scene.get('Title');
    if (accept) {
      const n = loadStarterPack(store.loadState());
      audio.chime(0);
      if (n === 0 && !store.activeProfile(store.loadState())?.words.length) accept = false;
    }
    if (title) title.userPaused = false;
    this.scene.resume('Title');
    this.scene.stop();
    // Με λέξεις πια, η φωτιά ανάβει κανονικά και πάμε κατευθείαν στη μάχη
    if (accept && title) title.igniteFlame();
  }
}
