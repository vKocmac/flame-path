// Η οθόνη του κόσμου: νυχτερινό τοπίο με το ντότζο. Ο κοινός κόσμος
// έρχεται από world.js· εδώ μένει μόνο ό,τι είναι αποκλειστικά του τίτλου.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import { buildTextures } from '../textures.js';
import * as world from '../world.js';

const { W, H } = world;

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    buildTextures(this);
    const calm = world.isCalm();
    this.calm = calm;

    world.buildSky(this);
    world.buildStars(this, calm);
    const moonZone = world.buildMoon(this, calm);

    world.ridge(this, world.RIDGE_HAZE, NUM.ridgeHaze, .55);
    world.ridge(this, world.RIDGE_FAR, NUM.ridgeFar);
    world.buildMist(this, calm);
    world.ridge(this, world.RIDGE_MID, NUM.ridgeMid);
    world.buildDojo(this, 384, H * .653, 1.28, calm);
    world.ridge(this, world.RIDGE_NEAR, NUM.ridgeNear);
    world.buildTorii(this, 1062, H * .858, calm);
    world.buildBamboo(this, 112, H * .885, 1.0);
    world.buildBamboo(this, 1208, H * .895, 0.82);
    world.buildGround(this, { path: 'narrow' });

    world.lantern(this, 168, 646, .95, calm);
    world.lantern(this, 930, 656, .9, calm);
    world.lantern(this, 1158, 640, .8, calm);

    this.buildBrazier(640, 676);
    this.buildTitle();
    this.buildOverlay();
    this.armParentEntry(moonZone);
  }

  // Κρυφή είσοδος γονέα: 5 γρήγορα αγγίγματα στο φεγγάρι.
  armParentEntry(zone) {
    let taps = [];
    zone.setInteractive().on('pointerdown', () => {
      const t = Date.now();
      taps = taps.filter((v) => t - v < 4000);
      taps.push(t);
      if (taps.length >= 5) { taps = []; window.flameParent?.open(); }
    });
  }

  // ------------------------------------------------------- η φωτιά (κουμπί)

  buildBrazier(cx, baseY) {
    const g = this.add.graphics();
    g.fillStyle(NUM.stone, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 26, baseY), new Phaser.Geom.Point(cx + 26, baseY),
      new Phaser.Geom.Point(cx + 20, baseY - 22), new Phaser.Geom.Point(cx - 20, baseY - 22)
    ], true);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 46, baseY - 46), new Phaser.Geom.Point(cx + 46, baseY - 46),
      new Phaser.Geom.Point(cx + 26, baseY - 20), new Phaser.Geom.Point(cx - 26, baseY - 20)
    ], true);
    g.fillStyle(NUM.ridgeMid, 1);
    g.fillRect(cx - 44, baseY - 44, 88, 5);
    g.fillStyle(NUM.flame, .7);
    g.fillRect(cx - 46, baseY - 48, 92, 4);
    g.fillStyle(NUM.flameDeep, .28);
    g.fillRect(cx - 40, baseY - 39, 80, 3);

    this.add.image(cx, baseY + 6, 'glow-flame')
      .setScale(2.6, .5).setAlpha(.22).setBlendMode(Phaser.BlendModes.ADD);

    const fy = baseY - 44;
    this.fireGlow = this.add.image(cx, fy - 40, 'glow-flame')
      .setScale(1.7).setAlpha(.55).setBlendMode(Phaser.BlendModes.ADD);
    this.fire = this.add.image(cx, fy, 'flame').setOrigin(.5, 1).setScale(.82);

    this.sparks = this.add.particles(cx, fy - 30, 'spark', {
      speed: { min: 8, max: 34 },
      angle: { min: 250, max: 290 },
      scale: { start: .55, end: 0 },
      alpha: { start: .95, end: 0 },
      lifespan: { min: 1300, max: 2700 },
      blendMode: 'ADD',
      tint: [NUM.flameCore, NUM.lantern, NUM.flame],
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-20, -8, 40, 16) }
    });
    // Ρητά, μετά τη δημιουργία: το frequency μέσα στο config δεν εφαρμόζεται
    // αξιόπιστα και ο εκπομπός μένει σε λειτουργία «έκρηξης» (frequency -1).
    this.sparks.setFrequency(150, 1);
    this.sparks.start();

    if (!this.calm) {
      this.tweens.add({ targets: this.fire, scaleY: .89, scaleX: .79, angle: 1.6,
        duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.fireGlow, alpha: .70, scale: 1.82,
        duration: 1150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.hint = this.add.text(cx, 704, TXT.tapFlame, {
      fontFamily: FONT.ui, fontSize: '21px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(.75);
    if (!this.calm) {
      this.tweens.add({ targets: this.hint, alpha: .35,
        duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.add.zone(cx, fy - 46, 190, 190).setOrigin(.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.igniteFlame());
  }

  igniteFlame() {
    if (this.leaving) return;
    this.leaving = true;
    audio.whoosh();
    // emitParticle, όχι explode: το explode γυρίζει τον εκπομπό σε μία βολή
    // και θα έσβηνε τις σπίθες που καίνε συνέχεια.
    this.sparks.emitParticle(30);
    this.tweens.add({ targets: this.fire, scaleX: 1.14, scaleY: 1.28,
      duration: 170, yoyo: true, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.fireGlow, alpha: 1, scale: 2.5,
      duration: 190, yoyo: true, ease: 'Quad.easeOut' });

    // Η φωτιά φουντώνει και μας παίρνει μαζί της στον δρόμο
    const flash = this.add.rectangle(W / 2, H / 2, W, H, NUM.flame)
      .setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(50);
    this.tweens.add({
      targets: flash, alpha: .55, duration: 380, ease: 'Quad.easeIn',
      onComplete: () => this.scene.start('Battle')
    });
  }

  // ------------------------------------------------------------ τίτλος & UI

  buildTitle() {
    const t = this.add.text(W / 2, 116, TXT.title, {
      fontFamily: FONT.ui, fontSize: '64px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5);
    t.setShadow(0, 0, HEX.flame, 30, false, true);
    if (!this.calm) {
      t.setAlpha(0).setY(96);
      this.tweens.add({ targets: t, alpha: 1, y: 116, duration: 1400, ease: 'Quad.easeOut' });
    }
  }

  buildOverlay() {
    world.buildVignette(this);
    const icon = this.add.text(W - 34, 34, '♪', {
      fontFamily: FONT.ui, fontSize: '28px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(audio.muted ? .35 : .55).setDepth(45)
      .setInteractive({ useHandCursor: true });
    const bar = this.add.rectangle(W - 34, 34, 30, 2, NUM.smoke)
      .setAngle(-40).setAlpha(audio.muted ? .7 : 0).setDepth(46);
    icon.on('pointerdown', () => {
      const m = audio.toggleMute();
      bar.setAlpha(m ? .7 : 0);
      icon.setAlpha(m ? .35 : .55);
    });

    this.add.text(14, H - 20, 'v0.5', {
      fontFamily: FONT.ui, fontSize: '13px', color: HEX.smoke
    }).setAlpha(.22).setDepth(45);
  }
}
