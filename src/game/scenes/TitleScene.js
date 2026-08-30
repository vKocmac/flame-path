// Η οθόνη του κόσμου: νυχτερινό τοπίο με το ντότζο, σε τελική ποιότητα.
// Θέατρο σκιών από «κομμένο χαρτί»: επίπεδες σιλουέτες που σκουραίνουν όσο
// έρχονται μπροστά· φως μόνο από φωτιά και φεγγάρι (DESIGN.md).

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import { buildTextures } from '../textures.js';

const W = 1280;
const H = 720;

// Κορυφογραμμές ως ποσοστά της οθόνης — γραμμένες στο χέρι για σύνθεση,
// όχι τυχαίες: ο κόσμος πρέπει να είναι ο ίδιος τόπος κάθε φορά.
// Κανόνας σύνθεσης: μία κυρίαρχη κορυφή πίσω από το ντότζο (x≈.35) και
// μία δεύτερη, χαμηλότερη, δεξιά (x≈.72) — όχι ομοιόμορφα «δόντια».
const RIDGE_HAZE = [
  [0, .545], [.09, .50], [.18, .535], [.27, .445], [.36, .385], [.44, .46],
  [.53, .43], [.62, .49], [.71, .425], [.80, .485], [.89, .45], [1, .50]
];
const RIDGE_FAR = [
  [0, .60], [.06, .565], [.13, .605], [.19, .52], [.245, .575], [.30, .455],
  [.345, .408], [.40, .478], [.445, .55], [.50, .505], [.555, .572],
  [.61, .534], [.665, .578], [.72, .478], [.775, .538], [.83, .588],
  [.885, .548], [.94, .592], [1, .562]
];
// Η μεσαία έχει επίτηδες οροπέδιο (x 0.22–0.40) για να κάθεται το ντότζο.
const RIDGE_MID = [
  [0, .755], [.05, .70], [.10, .738], [.145, .686], [.185, .659], [.22, .653],
  [.40, .653], [.435, .666], [.475, .716], [.53, .664], [.585, .722],
  [.64, .676], [.70, .737], [.76, .681], [.82, .731], [.88, .690],
  [.94, .746], [1, .711]
];
const RIDGE_NEAR = [
  [0, .885], [.08, .845], [.16, .872], [.25, .834], [.35, .868], [.45, .841],
  [.55, .876], [.64, .846], [.73, .879], [.82, .850], [.91, .883], [1, .855]
];

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    buildTextures(this);
    this.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.buildSky();
    this.buildStars();
    this.buildMoon();

    this.ridge(RIDGE_HAZE, NUM.ridgeHaze, .55);
    this.ridge(RIDGE_FAR, NUM.ridgeFar);
    this.buildMist();
    this.ridge(RIDGE_MID, NUM.ridgeMid);
    this.buildDojo(384, H * .653, 1.28);
    this.ridge(RIDGE_NEAR, NUM.ridgeNear);
    this.buildTorii(1062, H * .858);
    this.buildBamboo(112, H * .885, 1.0);
    this.buildBamboo(1208, H * .895, 0.82);
    this.buildGround();

    this.buildPathLanterns();
    this.buildBrazier(640, 676);

    this.buildTitle();
    this.buildOverlay();
  }

  // ---------------------------------------------------------------- ουρανός

  buildSky() {
    const g = this.add.graphics();
    g.fillGradientStyle(NUM.skyTop, NUM.skyTop, NUM.skyMid, NUM.skyMid, 1);
    g.fillRect(0, 0, W, H * .5);
    g.fillGradientStyle(NUM.skyMid, NUM.skyMid, NUM.skyLow, NUM.skyLow, 1);
    g.fillRect(0, H * .5 - 1, W, H * .5 + 1);

    // Ζεστή λάμψη στον ορίζοντα πίσω από το ντότζο — ζωή στο βάθος
    this.add.image(384, H * .60, 'glow-lantern')
      .setScale(4.2, 2.0).setAlpha(.10).setBlendMode(Phaser.BlendModes.ADD);
  }

  buildStars() {
    const moon = new Phaser.Math.Vector2(1078, 96);
    const n = this.calm ? 34 : 68;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(24, 392);
      if (moon.distance(new Phaser.Math.Vector2(x, y)) < 130) continue;
      const s = Phaser.Math.FloatBetween(.18, .46);
      const a = Phaser.Math.FloatBetween(.35, .95);
      const star = this.add.image(x, y, 'star').setScale(s).setAlpha(a);
      if (this.calm) continue;
      this.tweens.add({
        targets: star, alpha: a * .35,
        duration: Phaser.Math.Between(1600, 4200),
        delay: Phaser.Math.Between(0, 3000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  }

  buildMoon() {
    const x = 1078, y = 96;
    const halo = this.add.image(x, y, 'glow-moon').setScale(1.5).setAlpha(.30);
    this.add.circle(x, y, 32, NUM.moon);
    // Λεπτή σκιά μέσα στον δίσκο: δίνει όγκο χωρίς να γίνεται εικονογράφηση
    this.add.circle(x + 9, y - 6, 27, NUM.skyTop).setAlpha(.16);
    if (!this.calm) {
      this.tweens.add({ targets: halo, alpha: .40, scale: 1.62,
        duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Κρυφή είσοδος γονέα: 5 γρήγορα αγγίγματα στο φεγγάρι
    let taps = [];
    this.add.zone(x, y, 120, 120).setOrigin(.5).setInteractive()
      .on('pointerdown', () => {
        const t = Date.now();
        taps = taps.filter((v) => t - v < 4000);
        taps.push(t);
        if (taps.length >= 5) { taps = []; window.flameParent?.open(); }
      });
  }

  buildMist() {
    for (let i = 0; i < 2; i++) {
      const y = H * (i === 0 ? .545 : .60);
      const speed = i === 0 ? 74000 : 108000;
      const alpha = i === 0 ? .40 : .28;
      for (const off of [0, W]) {
        const img = this.add.image(off, y, 'mist').setOrigin(0, .5).setAlpha(alpha);
        if (this.calm) continue;
        this.tweens.add({
          targets: img, x: off - W, duration: speed,
          repeat: -1, ease: 'Linear',
          onRepeat: (tw, tgt) => { tgt.x = off; }
        });
      }
    }
  }

  ridge(points, color, alpha = 1) {
    const g = this.add.graphics();
    g.fillStyle(color, alpha);
    const poly = points.map(([x, y]) => new Phaser.Geom.Point(x * W, y * H));
    poly.push(new Phaser.Geom.Point(W, H), new Phaser.Geom.Point(0, H));
    g.fillPoints(poly, true);
    return g;
  }

  buildGround() {
    const gy = H * .878;
    const g = this.add.graphics();
    g.fillStyle(NUM.ground, 1);
    g.fillRect(0, gy, W, H - gy);
    // Το μονοπάτι: ανοίγει προς τον θεατή και δένει τη φωτιά με το ντότζο
    g.fillStyle(NUM.path, 1);
    g.fillPoints([
      new Phaser.Geom.Point(492, gy), new Phaser.Geom.Point(700, gy),
      new Phaser.Geom.Point(872, H), new Phaser.Geom.Point(330, H)
    ], true);
  }

  // ----------------------------------------------------------------- ντότζο

  // Στέγη παγόδας: παραβολική κοιλιά με ανασηκωμένες άκρες (t⁶ = το γύρισμα).
  sweptRoof(g, cx, apexY, halfW, sag, upturn, thick) {
    const N = 40, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = -1 + (2 * i) / N;
      const y = apexY + sag * t * t - upturn * Math.pow(Math.abs(t), 6);
      const x = cx + t * halfW;
      top.push(new Phaser.Geom.Point(x, y));
      bot.push(new Phaser.Geom.Point(x, y + thick + 7 * t * t));
    }
    g.fillPoints([...top, ...bot.reverse()], true);
  }

  // Σειρά ζωγραφικής: λάμψη → σιλουέτα → φωτισμένα ανοίγματα → κολόνες.
  // (Τα ανοίγματα ΠΡΕΠΕΙ να μπουν μετά τη σιλουέτα, αλλιώς τα σκεπάζει.)
  buildDojo(cx, baseY, s = 1) {
    this.add.image(cx, baseY - 34 * s, 'glow-lantern')
      .setScale(1.5 * s).setAlpha(.40).setBlendMode(Phaser.BlendModes.ADD);

    const g = this.add.graphics();
    // Βράχος-πεζούλι κάτω από το κτίριο: το «κολλάει» στο βουνό
    g.fillStyle(NUM.ridgeNear, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 122 * s, baseY + 4 * s),
      new Phaser.Geom.Point(cx + 122 * s, baseY + 4 * s),
      new Phaser.Geom.Point(cx + 96 * s, baseY + 34 * s),
      new Phaser.Geom.Point(cx - 104 * s, baseY + 30 * s)
    ], true);

    g.fillStyle(NUM.dojoBody, 1);
    g.fillRect(cx - 104 * s, baseY - 10 * s, 208 * s, 15 * s);   // βεράντα
    g.fillRect(cx - 62 * s, baseY - 74 * s, 124 * s, 65 * s);    // ισόγειο
    g.fillRect(cx - 38 * s, baseY - 150 * s, 76 * s, 48 * s);    // όροφος

    g.fillStyle(NUM.dojoRoof, 1);
    this.sweptRoof(g, cx, baseY - 104 * s, 122 * s, 34 * s, 30 * s, 21 * s);
    this.sweptRoof(g, cx, baseY - 176 * s, 82 * s, 27 * s, 23 * s, 17 * s);
    g.fillRect(cx - 2.5 * s, baseY - 196 * s, 5 * s, 22 * s);    // κορυφή
    g.fillStyle(NUM.lantern, .5);
    g.fillCircle(cx, baseY - 198 * s, 4 * s);

    // Φωτισμένα ανοίγματα — ΠΑΝΩ από τη σιλουέτα
    const warm = this.add.graphics();
    warm.fillStyle(NUM.lantern, .95);
    warm.fillRect(cx - 20 * s, baseY - 52 * s, 40 * s, 42 * s);  // πόρτα
    warm.fillStyle(NUM.lantern, .8);
    warm.fillRect(cx - 52 * s, baseY - 62 * s, 20 * s, 22 * s);  // παράθυρα
    warm.fillRect(cx + 32 * s, baseY - 62 * s, 20 * s, 22 * s);
    warm.fillRect(cx - 14 * s, baseY - 140 * s, 28 * s, 26 * s); // όροφος

    // Κάθετα καφασωτά & κολόνες: κόβουν το φως σε λωρίδες — αμέσως «ξύλινο»
    const bars = this.add.graphics();
    bars.fillStyle(NUM.dojoRoof, 1);
    for (const dx of [-12, 0, 12]) bars.fillRect(cx + dx * s - 1.5 * s, baseY - 52 * s, 3 * s, 42 * s);
    for (const dx of [-42, 42]) bars.fillRect(cx + dx * s - 1.5 * s, baseY - 62 * s, 3 * s, 22 * s);
    for (const dx of [-6, 6]) bars.fillRect(cx + dx * s - 1.5 * s, baseY - 140 * s, 3 * s, 26 * s);
    for (const dx of [-92, -50, 50, 92]) bars.fillRect(cx + dx * s - 3 * s, baseY - 32 * s, 6 * s, 23 * s);

    // Φως που πέφτει στη βεράντα μπροστά από την πόρτα
    this.add.image(cx, baseY - 4 * s, 'glow-lantern')
      .setScale(.9 * s, .28 * s).setAlpha(.34).setBlendMode(Phaser.BlendModes.ADD);

    this.lantern(cx - 118 * s, baseY - 96 * s, .8);
    this.lantern(cx + 118 * s, baseY - 96 * s, .8);
  }

  buildTorii(cx, baseY) {
    const g = this.add.graphics();
    g.fillStyle(NUM.ground, 1);
    g.fillRect(cx - 46, baseY - 96, 11, 96);             // στύλοι
    g.fillRect(cx + 35, baseY - 96, 11, 96);
    g.fillRect(cx - 52, baseY - 68, 104, 8);             // κάτω δοκός
    this.sweptRoof(g, cx, baseY - 104, 68, 12, 14, 9);   // πάνω δοκός
    this.lantern(cx, baseY - 60, .6);
  }

  buildBamboo(x, baseY, scale) {
    const g = this.add.graphics();
    g.fillStyle(NUM.ground, 1);
    const stalks = [
      { dx: 0, h: 240, lean: 10 }, { dx: 26, h: 190, lean: -8 },
      { dx: -22, h: 205, lean: 6 }, { dx: 44, h: 150, lean: 14 }
    ];
    for (const s of stalks) {
      const h = s.h * scale, w = 6 * scale;
      const x0 = x + s.dx * scale;
      const top = new Phaser.Geom.Point(x0 + s.lean * scale, baseY - h);
      g.fillPoints([
        new Phaser.Geom.Point(x0 - w / 2, baseY),
        new Phaser.Geom.Point(x0 + w / 2, baseY),
        new Phaser.Geom.Point(top.x + w / 2.6, top.y),
        new Phaser.Geom.Point(top.x - w / 2.6, top.y)
      ], true);
      // Φύλλα στην κορυφή
      for (const a of [-0.9, -0.35, 0.3, 0.85]) {
        const len = (34 + Math.abs(a) * 16) * scale;
        const px = top.x, py = top.y + 6 * scale;
        g.fillPoints([
          new Phaser.Geom.Point(px, py),
          new Phaser.Geom.Point(px + Math.cos(a - 1.5) * len, py + Math.sin(a - 1.5) * len),
          new Phaser.Geom.Point(px + Math.cos(a - 1.2) * len * .8, py + Math.sin(a - 1.2) * len * .8 + 7 * scale)
        ], true);
      }
    }
  }

  // --------------------------------------------------------------- φανάρια

  lantern(x, y, scale = 1) {
    const glow = this.add.image(x, y, 'glow-lantern')
      .setScale(.9 * scale).setAlpha(.55).setBlendMode(Phaser.BlendModes.ADD);
    const body = this.add.graphics();
    body.fillStyle(NUM.shadow, 1);
    body.fillRect(x - 1 * scale, y - 26 * scale, 2 * scale, 12 * scale);   // κορδόνι
    body.fillStyle(NUM.lantern, 1);
    body.fillRoundedRect(x - 9 * scale, y - 14 * scale, 18 * scale, 26 * scale, 8 * scale);
    body.fillStyle(NUM.flameDeep, .35);
    body.fillRect(x - 9 * scale, y - 2 * scale, 18 * scale, 2 * scale);    // δαχτυλίδι
    if (this.calm) return;
    this.tweens.add({
      targets: glow, alpha: Phaser.Math.FloatBetween(.34, .44),
      scale: .9 * scale * Phaser.Math.FloatBetween(.9, .96),
      duration: Phaser.Math.Between(900, 1900),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 1200)
    });
  }

  buildPathLanterns() {
    this.lantern(168, 646, .95);
    this.lantern(930, 656, .9);
    this.lantern(1158, 640, .8);
  }

  // ------------------------------------------------------- η φωτιά (κουμπί)

  buildBrazier(cx, baseY) {
    const g = this.add.graphics();
    g.fillStyle(NUM.stone, 1);
    g.fillPoints([                                        // βάση
      new Phaser.Geom.Point(cx - 26, baseY),
      new Phaser.Geom.Point(cx + 26, baseY),
      new Phaser.Geom.Point(cx + 20, baseY - 22),
      new Phaser.Geom.Point(cx - 20, baseY - 22)
    ], true);
    g.fillPoints([                                        // κούπα
      new Phaser.Geom.Point(cx - 46, baseY - 46),
      new Phaser.Geom.Point(cx + 46, baseY - 46),
      new Phaser.Geom.Point(cx + 26, baseY - 20),
      new Phaser.Geom.Point(cx - 26, baseY - 20)
    ], true);
    g.fillStyle(NUM.ridgeMid, 1);                         // φωτισμένη όψη κούπας
    g.fillRect(cx - 44, baseY - 44, 88, 5);
    g.fillStyle(NUM.flame, .7);                           // πυρωμένο χείλος
    g.fillRect(cx - 46, baseY - 48, 92, 4);
    g.fillStyle(NUM.flameDeep, .28);                      // θράκα μέσα στην κούπα
    g.fillRect(cx - 40, baseY - 39, 80, 3);

    // Φως που πέφτει στο μονοπάτι γύρω από τη φωτιά
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

    this.add.zone(cx, fy - 46, 190, 190).setOrigin(.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.igniteFlame());
  }

  igniteFlame() {
    audio.whoosh();
    // emitParticle, όχι explode: το explode γυρίζει τον εκπομπό σε μία βολή
    // και θα έσβηνε τις σπίθες που καίνε συνέχεια.
    this.sparks.emitParticle(30);
    this.tweens.add({ targets: this.fire, scaleX: 1.14, scaleY: 1.28,
      duration: 170, yoyo: true, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.fireGlow, alpha: 1, scale: 2.5,
      duration: 190, yoyo: true, ease: 'Quad.easeOut' });

    const flash = this.add.rectangle(W / 2, H / 2, W, H, NUM.flame)
      .setAlpha(.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, duration: 420,
      ease: 'Quad.easeOut', onComplete: () => flash.destroy() });

    // Το Βήμα 4 δένει εδώ τη μάχη: this.scene.start('Battle')
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
    this.add.image(W / 2, H / 2, 'vignette')
      .setDisplaySize(W, H).setDepth(40);

    // Σίγαση: διακριτικό, στη γωνία, μακριά από το φεγγάρι
    const icon = this.add.text(W - 34, 34, '♪', {
      fontFamily: FONT.ui, fontSize: '28px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(.55).setDepth(45).setInteractive({ useHandCursor: true });
    const bar = this.add.rectangle(W - 34, 34, 30, 2, NUM.smoke)
      .setAngle(-40).setAlpha(0).setDepth(46);
    icon.on('pointerdown', () => {
      const m = audio.toggleMute();
      bar.setAlpha(m ? .7 : 0);
      icon.setAlpha(m ? .35 : .55);
    });

    this.add.text(14, H - 20, 'v0.4', {
      fontFamily: FONT.ui, fontSize: '13px', color: HEX.smoke
    }).setAlpha(.22).setDepth(45);
  }
}
