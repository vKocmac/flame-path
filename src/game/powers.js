// Οι δυνάμεις του νίντζα, το σπαθί από κοντά και η Μεγάλη Τεχνική — οι
// ΧΟΡΟΓΡΑΦΙΕΣ τους. Γύρος 5 (NEXT-FIXES Ζ5-Ζ9, 11/09 βράδυ):
//   Ζ5 «το σπαθί… όταν φτάσουν λίγο πιο κοντά… να τους χτυπάει και να
//      ξαναγυρνά στη θέση του» → swordStrike
//   Ζ6 «να τον περικυκλώνει ανεμοστρόβιλος φωτιάς και να τρέχει μαζί μ'
//      αυτόν… όχι να τον πετάει σαν ρολό απέναντι» → fxTornado
//   Ζ7 «τον κεραυνό… από το σπαθί του, να προτάσσει το σπαθί» → fxLightning
//   Ζ8 ο πάγος έφυγε· «και τα τρία τα θέλει» → fxDragon · fxClones · fxVolcano
//   Ζ9 η Μεγάλη Τεχνική «ας είναι αυτό που πετάει… πιο φαντασμαγορικό» → greatWave
//
// Mixin: οι μέθοδοι μπαίνουν στο prototype της BattleScene και τρέχουν με
// this = η σκηνή (sealRing, smokePuff, hitFlash, destroyDeep, ninja, enemies).
// Κάθε fx επιστρέφει { hitAt, endAt }: πότε χτυπά (applyPower) και πότε ο
// νίντζα έχει ξαναγυρίσει στη θέση του.

import { NUM } from '../theme/palette.js';
import * as audio from '../theme/audio.js';
import { W, LINE_Y, NINJA_X } from './world.js';

const P = (x, y) => new Phaser.Geom.Point(x, y);
const NS = 1.3;                        // η κλίμακα του νίντζα (makeNinja)
const ease = (k) => Phaser.Math.Easing.Sine.InOut(Phaser.Math.Clamp(k, 0, 1));

// Περίγραμμα γύρω από ραχοκοκαλιά (ίδιο με της BattleScene — μικρό, και
// έτσι το αρχείο δεν εξαρτάται από εσωτερικά της σκηνής).
function ribbon(pts) {
  const up = [], lo = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)];
    let tx = b.x - a.x, ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    up.push(P(p.x - ty * p.r, p.y + tx * p.r));
    lo.push(P(p.x + ty * p.r, p.y - tx * p.r));
  }
  return up.concat(lo.reverse());
}

// Τεθλασμένη γραμμή κεραυνού από (x0,y0) σε (x1,y1)
function jag(x0, y0, x1, y1, amp, step = 34) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, off = i === 0 || i === n ? 0 : (Math.random() * 2 - 1) * amp;
    pts.push(P(x0 + (x1 - x0) * f + nx / nl * off, y0 + (y1 - y0) * f + ny / nl * off));
  }
  return pts;
}

export const PowerMethods = {
  // ---------------------------------------------------------- εργαλεία

  /** Κάθε καρέ για ms: fn(t 0..1). Tween → παγώνει με την παύση. */
  frameLoop(ms, fn, done) {
    const p = { t: 0 };
    return this.tweens.add({
      targets: p, t: 1, duration: ms,
      onUpdate: () => fn(p.t),
      onComplete: () => { fn(1); if (done) done(); }
    });
  },

  // Το σπαθί στο χέρι (this.blade, παιδί του νίντζα) αντί για την πλάτη
  unsheathe(angle, x = 24, y = -60) {
    if (this.backSword) this.backSword.setVisible(false);
    if (this.blade) this.blade.setVisible(true).setPosition(x, y).setAngle(angle);
  },

  sheathe() {
    if (this.blade) this.blade.setVisible(false);
    if (this.backSword) this.backSword.setVisible(true);
  },

  /** Η άκρη του σπαθιού σε συντεταγμένες οθόνης. */
  bladeTip() {
    const n = this.ninja, b = this.blade;
    const a = Phaser.Math.DegToRad(b.angle);
    return { x: n.x + (b.x + Math.cos(a) * 80) * NS, y: n.y + (b.y + Math.sin(a) * 80) * NS };
  },

  // Σκιά ταχύτητας: η σιλουέτα του νίντζα μένει πίσω και σβήνει
  ghostAt(x, y, color = NUM.ridgeHaze, a = .4) {
    const g = this.add.graphics({ x, y }).setDepth(11).setAlpha(a);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-26 * NS, -74 * NS, 52 * NS, 62 * NS, 15 * NS);
    g.fillCircle(0, -92 * NS, 27 * NS);
    g.fillRect(-19 * NS, -14 * NS, 40 * NS, 14 * NS);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  },

  // Η κόψη του σπαθιού στον αέρα: λευκό μισοφέγγαρο που ανοίγει και σβήνει
  slashArc(x, y, r = 74, color = NUM.moon) {
    const g = this.add.graphics({ x, y }).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(12, color, .55);
    g.beginPath(); g.arc(0, 0, r, -1.35, 1.1, false); g.strokePath();
    g.lineStyle(4, NUM.flameCore, .95);
    g.beginPath(); g.arc(0, 0, r - 3, -1.25, 1.0, false); g.strokePath();
    g.setScale(.7).setAngle(-20);
    this.tweens.add({ targets: g, scale: 1.25, angle: 18, alpha: 0, duration: 230, ease: 'Quad.easeOut',
      onComplete: () => g.destroy() });
  },

  // -------------------------------------------- Ζ5: το σπαθί από κοντά

  /**
   * Σωστή απάντηση με τον εχθρό ΚΟΝΤΑ: αντί για φωτιά, ορμή με το σπαθί,
   * κόψη, και επιστροφή στη θέση του. Ο Μάστερ Γου αιωρείται — εκεί ο
   * νίντζα πηδά.
   */
  swordStrike(e) {
    const n = this.ninja;
    n.frozen = true;
    this.tweens.killTweensOf(n);
    n.setAngle(0).setScale(NS);
    this.tweens.add({ targets: this.hand, alpha: 0, scale: .5, duration: 120 });
    audio.whoosh();
    this.unsheathe(-135, 14, -66);
    const S = e.size || 1;
    const tx = Math.max(NINJA_X + 50, e.x - (e.isMaster ? 118 : 70 * S + 26));
    const ty = e.isMaster ? LINE_Y - 80 : LINE_Y - 6;
    let lastGhost = 0;
    const p = { t: 0 };
    const x0 = n.x, y0 = n.y;
    this.tweens.add({
      targets: p, t: 1, duration: 170, ease: 'Quad.easeIn',
      onUpdate: () => {
        n.x = x0 + (tx - x0) * p.t;
        n.y = y0 + (ty - y0) * p.t - Math.sin(p.t * Math.PI) * 16;
        if (p.t - lastGhost > .22) { lastGhost = p.t; this.ghostAt(n.x, n.y); }
      },
      onComplete: () => {
        audio.slash();
        this.tweens.add({ targets: this.blade, angle: 48, duration: 100, ease: 'Quad.easeOut' });
        const tier = this.swordTier || 0;
        this.slashArc(tx + 58, ty - 84, 78, tier >= 2 ? (tier === 3 ? NUM.spirit : NUM.flame) : NUM.moon);
        this.hitFrontEnemy(true);
        this.time.delayedCall(150, () => {
          this.tweens.add({
            targets: n, x: NINJA_X, y: LINE_Y, duration: 280, ease: 'Quad.easeOut',
            onUpdate: () => { if (Math.random() < .25) this.ghostAt(n.x, n.y, NUM.ridgeHaze, .25); },
            onComplete: () => { this.sheathe(); n.frozen = false; }
          });
        });
      }
    });
  },

  // --------------------------------------------------- η δίνη φωτιάς

  /**
   * Δίνη φωτιάς γύρω από κατακόρυφο άξονα, φαρδύτερη ψηλά. Ό,τι βρίσκεται
   * ΜΠΡΟΣΤΑ από τον άξονα ζωγραφίζεται πάνω από τον νίντζα, ό,τι πίσω από
   * κάτω — έτσι φαίνεται ότι τον ΠΕΡΙΚΥΚΛΩΝΕΙ, όχι ότι είναι στήλη δίπλα του.
   * Την κοινή χρησιμοποιούν ο ανεμοστρόβιλος και η Μεγάλη Τεχνική.
   */
  makeVortex(scale = 1) {
    const back = this.add.graphics().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
    const front = this.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    const flames = [];
    for (let i = 0; i < 9; i++) {
      flames.push(this.add.image(0, 0, 'flame').setOrigin(.5, .85).setAlpha(.9)
        .setBlendMode(Phaser.BlendModes.ADD));
    }
    const glow = this.add.image(0, 0, 'glow-flame').setBlendMode(Phaser.BlendModes.ADD).setDepth(10);
    const em = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 260 }, scale: { start: .7, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: 520, blendMode: 'ADD', tint: [NUM.flameCore, NUM.flame, NUM.lantern]
    }).setDepth(15);
    em.setFrequency(14, 2);
    const HGT = 250 * scale, BANDS = 11;
    const v = { x: 0, base: LINE_Y + 4, grow: 0, spin: 0 };
    v.draw = () => {
      back.clear(); front.clear();
      const gr = v.grow;
      if (gr <= 0) { flames.forEach((f) => f.setVisible(false)); glow.setAlpha(0); return; }
      for (let b = 0; b < BANDS; b++) {
        const f = b / (BANDS - 1);
        const h = f * HGT * gr;
        const rx = (26 + 96 * f) * scale * gr, ry = rx * .24;
        const col = f < .3 ? NUM.flameDeep : f < .7 ? NUM.flame : NUM.lantern;
        const lw = (7 - 3.5 * f) * scale;
        for (let k = 0; k < 3; k++) {
          const a0 = v.spin * (1.25 + f * .5) + k * 2.094 + b * .55;
          let px = v.x + Math.cos(a0) * rx, py = v.base - h + Math.sin(a0) * ry;
          for (let s = 1; s <= 6; s++) {
            const a = a0 + s * .16;
            const qx = v.x + Math.cos(a) * rx, qy = v.base - h + Math.sin(a) * ry;
            const g = Math.sin(a - .08) > 0 ? front : back;
            g.lineStyle(lw, col, .8);
            g.lineBetween(px, py, qx, qy);
            px = qx; py = qy;
          }
        }
      }
      flames.forEach((fl, i) => {
        const f = (i + .5) / flames.length;
        const a = v.spin * 1.7 + i * 2.4;
        const rx = (26 + 96 * f) * scale * gr;
        fl.setVisible(true)
          .setPosition(v.x + Math.cos(a) * rx, v.base - f * HGT * gr + Math.sin(a) * rx * .24)
          .setScale((.28 + f * .22) * scale * gr).setAngle(Math.cos(a) * 28)
          .setDepth(Math.sin(a) > 0 ? 14 : 11);
      });
      glow.setPosition(v.x, v.base - HGT * gr * .45).setScale(2.4 * scale * gr, 3.2 * scale * gr).setAlpha(.45 * gr);
      em.setPosition(v.x, v.base - HGT * gr * .5);
    };
    v.destroy = () => {
      back.destroy(); front.destroy(); glow.destroy();
      flames.forEach((f) => f.destroy());
      em.stop();
      this.time.delayedCall(600, () => em.destroy());
    };
    return v;
  },

  // ------------------------------------------------------ οι δυνάμεις

  /** Ζ6: ο νίντζα μέσα στη δίνη, περνά μέσα από τους εχθρούς και γυρίζει. */
  fxTornado() {
    audio.gust();
    const n = this.ninja;
    const v = this.makeVortex(1);
    const xs = this.enemies.map((e) => e.x);
    const far = Math.min(W - 130, Math.max(NINJA_X + 420, ...xs) + 40);
    const T = 2000;
    this.frameLoop(T, (t) => {
      const ms = t * T;
      let x, grow;
      if (ms < 360) { x = NINJA_X; grow = ms / 360; }
      else if (ms < 1180) { x = NINJA_X + (far - NINJA_X) * ease((ms - 360) / 820); grow = 1; }
      else {
        const k = (ms - 1180) / 820;
        x = far + (NINJA_X - far) * ease(k);
        grow = k > .78 ? Math.max(0, 1 - (k - .78) / .22) : 1;
      }
      v.x = x; v.grow = grow; v.spin = ms * .011; v.draw();
      n.x = x;
      n.y = LINE_Y - 22 * grow;
      n.scaleX = NS * Math.cos(ms * .028);         // στροβιλίζεται μέσα στη δίνη
    }, () => {
      v.destroy();
      n.setScale(NS).setPosition(NINJA_X, LINE_Y);
    });
    return { hitAt: 820, endAt: T };
  },

  /** Ζ7: το σπαθί μπροστά, φόρτιση στην άκρη, κεραυνοί από τη λεπίδα. */
  fxLightning() {
    const n = this.ninja;
    this.tweens.add({ targets: n, x: NINJA_X + 46, duration: 240, ease: 'Quad.easeOut' });
    this.unsheathe(-10, 26, -64);
    audio.cast();
    // Φόρτιση: σπίθες μαζεύονται στην άκρη, η άκρη φουσκώνει από φως
    const tip0 = this.bladeTip();
    const orb = this.add.image(tip0.x, tip0.y, 'glow-moon').setScale(.15).setAlpha(.9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(17);
    const gather = this.add.particles(0, 0, 'spark', {
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 110), quantity: 24 },
      moveToX: 0, moveToY: 0, lifespan: 300, scale: { start: .6, end: .1 },
      alpha: { start: 0, end: 1 }, blendMode: 'ADD', tint: [NUM.moon, NUM.spirit, NUM.star]
    }).setDepth(17);
    gather.setFrequency(20, 2);
    this.frameLoop(560, () => {
      const tip = this.bladeTip();
      orb.setPosition(tip.x, tip.y);
      gather.setPosition(tip.x, tip.y);
    });
    this.tweens.add({ targets: orb, scale: .9, duration: 540, ease: 'Quad.easeIn' });
    this.time.delayedCall(560, () => {
      gather.stop();
      this.time.delayedCall(400, () => gather.destroy());
      const tip = this.bladeTip();
      audio.thunder(1.2);
      this.cameras.main.flash(160, 201, 207, 234);
      this.cameras.main.shake(380, .008);
      this.tweens.add({ targets: n, x: n.x - 16, duration: 90, yoyo: true });   // ανάκρουση
      this.tweens.add({ targets: orb, scale: 1.6, alpha: 0, duration: 700, onComplete: () => orb.destroy() });
      const g = this.add.graphics().setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
      const targets = this.enemies.filter((e) => e.scene);
      let flick = 0;
      const drawBolts = () => {
        g.clear();
        for (const e of targets) {
          if (!e.scene) continue;
          const ex = e.x, ey = e.y - (e.isMaster ? 20 : 60 * (e.size || 1));
          const main = jag(tip.x, tip.y, ex, ey, 26);
          const layers = [[13, NUM.spirit, .3], [6, NUM.star, .7], [2.5, NUM.moon, 1]];
          for (const [w, c, a] of layers) { g.lineStyle(w, c, a); g.strokePoints(main); }
          // κλαδιά
          for (let k = 0; k < 2; k++) {
            const from = main[1 + Math.floor(Math.random() * (main.length - 2))];
            const br = jag(from.x, from.y, from.x + Phaser.Math.Between(-30, 60), from.y + Phaser.Math.Between(-70, 70), 12, 20);
            g.lineStyle(2, NUM.star, .7); g.strokePoints(br);
          }
          // σπινθήρες πάνω στον εχθρό
          for (let k = 0; k < 3; k++) {
            const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 30;
            g.lineStyle(2, NUM.moon, .9);
            g.strokePoints(jag(ex, ey, ex + Math.cos(a) * r, ey + Math.sin(a) * r, 8, 12));
          }
        }
        flick += 1;
      };
      drawBolts();
      this.time.addEvent({ delay: 70, repeat: 6, callback: drawBolts });
      targets.forEach((e) => this.sealRing(e.x, e.y - 60, NUM.spirit));
      this.tweens.add({ targets: g, alpha: 0, duration: 260, delay: 480, onComplete: () => g.destroy() });
    });
    this.time.delayedCall(1450, () => {
      this.tweens.add({ targets: n, x: NINJA_X, duration: 320, ease: 'Quad.easeInOut',
        onComplete: () => this.sheathe() });
    });
    return { hitAt: 640, endAt: 1800 };
  },

  /** Ηφαίστειο: άλμα, το σπαθί καρφώνεται στη γη, σχισμή, λάβα κάτω από τον καθένα. */
  fxVolcano() {
    const n = this.ninja;
    this.unsheathe(-100, 18, -70);
    audio.whoosh();
    this.tweens.add({ targets: n, x: NINJA_X + 30, y: LINE_Y - 80, duration: 230, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.blade, angle: 92, x: 30, y: -24, duration: 120 });
        this.tweens.add({ targets: n, y: LINE_Y + 4, duration: 140, ease: 'Quad.easeIn' });
      } });
    const x0 = NINJA_X + 30 + 44, gy = LINE_Y + 8;
    const xs = this.enemies.map((e) => e.x);
    const x1 = Math.min(W - 40, Math.max(x0 + 300, ...xs) + 60);
    const crack = jag(x0, gy, x1, gy - 2, 9, 26);
    const cg = this.add.graphics().setDepth(12);
    const cglow = this.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.time.delayedCall(380, () => {
      audio.thud();
      audio.rumble();
      this.cameras.main.shake(700, .009);
      this.smokePuff(x0, gy - 10, 26);
      this.frameLoop(480, (t) => {
        const upto = Math.max(2, Math.ceil(crack.length * t));
        const pts = crack.slice(0, upto);
        cg.clear(); cglow.clear();
        cg.lineStyle(9, NUM.shadow, 1); cg.strokePoints(pts);
        cglow.lineStyle(7, NUM.flameDeep, .8); cglow.strokePoints(pts);
        cglow.lineStyle(2.5, NUM.lantern, 1); cglow.strokePoints(pts);
      });
    });
    // Λάβα κάτω από τον καθένα, με τη σειρά που τους φτάνει η σχισμή
    const targets = [...this.enemies].sort((a, b) => a.x - b.x);
    targets.forEach((e) => {
      const at = 380 + 480 * Phaser.Math.Clamp((e.x - x0) / (x1 - x0), 0, 1) + 60;
      this.time.delayedCall(at, () => this.geyser(e));
    });
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: n, x: NINJA_X, y: LINE_Y, duration: 320, ease: 'Quad.easeInOut',
        onComplete: () => this.sheathe() });
    });
    this.time.delayedCall(1900, () => this.tweens.add({ targets: [cg, cglow], alpha: 0, duration: 700,
      onComplete: () => { cg.destroy(); cglow.destroy(); } }));
    return { hitAt: 1000, endAt: 1900 };
  },

  // Πίδακας λάβας κάτω από έναν εχθρό· ο εχθρός τινάζεται ψηλά
  geyser(e) {
    const x = e.scene ? e.x : null;
    if (x == null) return;
    audio.flamethrower(420);
    const pool = this.add.ellipse(x, LINE_Y + 6, 150, 26, NUM.flameDeep).setAlpha(.9).setDepth(12);
    const poolGlow = this.add.image(x, LINE_Y - 10, 'glow-flame').setScale(1.8, .9).setAlpha(.8)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
    const col = [];
    for (let i = 0; i < 3; i++) {
      col.push(this.add.image(x + (i - 1) * 16, LINE_Y + 8, 'flame').setOrigin(.5, 1)
        .setScale(.55, .1).setBlendMode(Phaser.BlendModes.ADD).setDepth(13)
        .setTint(i === 1 ? NUM.lantern : NUM.flame));
    }
    col.forEach((f, i) => this.tweens.add({ targets: f, scaleY: 1.9 - Math.abs(i - 1) * .5, duration: 200,
      ease: 'Quad.easeOut', yoyo: true, hold: 260 }));
    const rocks = this.add.particles(x, LINE_Y - 10, 'spark', {
      speed: { min: 200, max: 420 }, angle: { min: 245, max: 295 }, gravityY: 700,
      scale: { start: .8, end: .3 }, lifespan: 900, tint: [NUM.stone, NUM.flameDeep, NUM.lantern],
      emitting: false
    }).setDepth(13);
    rocks.explode(26);
    if (!e.isMaster && e.scene) {                 // τινάζεται στον αέρα και ξαναπέφτει
      e.airborne = true;
      this.tweens.add({ targets: e, y: LINE_Y - 95, angle: -8, duration: 240, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: e, y: LINE_Y, angle: 0, duration: 420, ease: 'Bounce.easeOut',
          onComplete: () => { e.airborne = false; } }) });
    }
    this.time.delayedCall(900, () => {
      this.tweens.add({ targets: [pool, poolGlow], alpha: 0, duration: 600 });
      this.time.delayedCall(620, () => { pool.destroy(); poolGlow.destroy(); col.forEach((f) => f.destroy()); });
      this.time.delayedCall(500, () => rocks.destroy());
    });
  },

  /** Σκιώδεις Κλώνοι: τρεις σκιές βγαίνουν από τον νίντζα, κόβουν, σβήνουν. */
  fxClones() {
    const n = this.ninja;
    audio.poof();
    this.tweens.add({ targets: n, scaleY: NS * .9, duration: 160, yoyo: true, hold: 300 });
    const targets = this.enemies.filter((e) => e.scene);
    for (let i = 0; i < 3; i++) {
      const e = targets[i % Math.max(1, targets.length)];
      const sx = NINJA_X + (i - 1) * 54, sy = LINE_Y - (i === 1 ? 0 : 6);
      const c = this.makeClone(sx, sy);
      this.time.delayedCall(i * 90, () => { this.smokePuff(sx, sy - 60, 12); this.tweens.add({ targets: c, alpha: .92, duration: 120 }); });
      if (!e) { this.time.delayedCall(700, () => this.destroyDeep(c)); continue; }
      const S = e.size || 1;
      const tx = e.x - (e.isMaster ? 110 : 64 * S + 20) + (i - 1) * 14;
      const ty = e.isMaster ? LINE_Y - 80 : LINE_Y;
      this.time.delayedCall(300 + i * 130, () => {
        audio.whoosh();
        let last = 0;
        const p = { t: 0 }, x0 = c.x, y0 = c.y;
        this.tweens.add({
          targets: p, t: 1, duration: 170, ease: 'Quad.easeIn',
          onUpdate: () => {
            c.x = x0 + (tx - x0) * p.t;
            c.y = y0 + (ty - y0) * p.t - Math.sin(p.t * Math.PI) * 26;
            if (p.t - last > .25) { last = p.t; this.ghostAt(c.x, c.y, NUM.spirit, .25); }
          },
          onComplete: () => {
            audio.slash();
            this.tweens.add({ targets: c.blade, angle: 50, duration: 100 });
            this.slashArc(tx + 56, ty - 84, 72, NUM.spirit);
            if (e.scene) this.hitFlash(e);
            this.time.delayedCall(200, () => {
              this.smokePuff(c.x, c.y - 60, 16);
              this.tweens.add({ targets: c, alpha: 0, scaleX: NS * 1.3, scaleY: NS * .7, duration: 180,
                onComplete: () => this.destroyDeep(c) });
            });
          }
        });
      });
    }
    return { hitAt: 700, endAt: 1400 };
  },

  // Ένας κλώνος: η σιλουέτα του νίντζα σε σκιά με φως πνεύματος στο περίγραμμα
  makeClone(x, y) {
    const g = this.add.graphics();
    g.fillStyle(NUM.nightHigh, 1);
    g.fillRect(-19, -14, 15, 14); g.fillRect(6, -14, 15, 14);
    g.fillRoundedRect(-26, -74, 52, 62, 15);
    g.fillCircle(0, -92, 27);
    g.lineStyle(2.5, NUM.spirit, .8);
    g.strokeRoundedRect(-26, -74, 52, 62, 15);
    g.strokeCircle(0, -92, 27);
    g.fillStyle(NUM.spirit, .95);
    g.fillRoundedRect(-17, -99, 34, 8, 4);                        // τα μάτια
    g.fillPoints([P(-20, -104), P(-60, -112), P(-54, -100), P(-20, -96)], true);   // κορδέλα
    const blade = this.add.graphics();
    blade.fillStyle(NUM.spirit, .95);
    blade.fillPoints([P(3, -3.5), P(70, -2.5), P(80, 0), P(70, 2.5), P(3, 3.5)], true);
    blade.fillStyle(NUM.nightHigh, 1); blade.fillRect(-16, -3, 14, 6);
    blade.setPosition(14, -66).setAngle(-135);
    const c = this.add.container(x, y, [g, blade]).setScale(NS).setAlpha(0).setDepth(12);
    c.blade = blade;
    return c;
  },

  /** Δράκος της Φλόγας: ξετυλίγεται από το σπαθί, κάνει κύκλο, βουτά μέσα τους. */
  fxDragon() {
    const n = this.ninja;
    this.unsheathe(-90, 18, -72);
    audio.cast();
    const tip = this.bladeTip();
    const spark = this.add.image(tip.x, tip.y, 'glow-lantern').setScale(.2).setAlpha(.95)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(17);
    this.tweens.add({ targets: spark, scale: 1.1, duration: 380, yoyo: true, hold: 200,
      onComplete: () => spark.destroy() });
    const V = (x, y) => new Phaser.Math.Vector2(x, y);
    const curve = new Phaser.Curves.Spline([
      V(tip.x, tip.y), V(tip.x + 90, 250), V(560, 130), V(930, 150), V(1150, 360),
      V(1000, 548), V(720, 588), V(460, 552), V(330, 380), V(250, 180), V(230, -160)
    ]);
    const body = this.add.graphics().setDepth(16);
    const glowG = this.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    const head = this.makeDragonHead();
    const halo = this.add.image(0, 0, 'glow-flame').setScale(1.4).setAlpha(.7)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(15);
    const fire = this.add.particles(0, 0, 'spark', {
      speed: { min: 20, max: 120 }, scale: { start: .8, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: 600, blendMode: 'ADD', tint: [NUM.flameCore, NUM.lantern, NUM.flame]
    }).setDepth(15);
    fire.setFrequency(10, 2);
    const hist = [];
    const LEN = 540, T = 2500, R = 1.45;          // μήκος σώματος · πάχος (ο δράκος πρέπει να «γεμίζει» την οθόνη)
    head.setData('k', 1.6);
    this.time.delayedCall(380, () => audio.roar(.8));
    this.frameLoop(T, (t) => {
      const u = Phaser.Math.Easing.Sine.InOut(t);
      const h = curve.getPoint(u);
      hist.push({ x: h.x, y: h.y });
      if (hist.length > 260) hist.shift();
      // το σώμα: σημεία πίσω στο ίχνος του κεφαλιού, κάθε 15px
      const pts = [];
      let acc = 0, want = 0;
      for (let i = hist.length - 1; i > 0 && want <= LEN; i--) {
        const a = hist[i], b = hist[i - 1];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        while (acc + d >= want && want <= LEN) {
          const k = d ? (want - acc) / d : 0;
          const f = want / LEN;
          pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, r: (4 + 20 * Math.pow(1 - f, .65) * Math.min(1, f * 6 + .45)) * R });
          want += 15;
        }
        acc += d;
      }
      body.clear(); glowG.clear();
      if (pts.length > 2) {
        glowG.fillStyle(NUM.flame, .35);
        glowG.fillPoints(ribbon(pts.map((q) => ({ x: q.x, y: q.y, r: q.r * 1.7 }))), true);
        body.fillStyle(NUM.flameDeep, 1);
        body.fillPoints(ribbon(pts), true);
        body.fillStyle(NUM.flame, 1);
        body.fillPoints(ribbon(pts.map((q) => ({ x: q.x, y: q.y, r: q.r * .66 }))), true);
        body.fillStyle(NUM.lantern, .9);
        body.fillPoints(ribbon(pts.map((q) => ({ x: q.x, y: q.y + q.r * .25, r: q.r * .28 }))), true);
        // αγκάθια στη ράχη
        body.fillStyle(NUM.flameDeep, 1);
        for (let i = 2; i < pts.length - 1; i += 2) {
          const a = pts[i - 1], b = pts[i + 1], q = pts[i];
          let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          const nx = ty, ny = -tx;                                  // πάντα η ίδια πλευρά
          body.fillTriangle(q.x + nx * q.r * .8 - tx * 6, q.y + ny * q.r * .8 - ty * 6,
            q.x + nx * q.r * .8 + tx * 6, q.y + ny * q.r * .8 + ty * 6,
            q.x + nx * (q.r + 12), q.y + ny * (q.r + 12));
        }
        const a = hist[Math.max(0, hist.length - 4)];
        const ang = Math.atan2(h.y - a.y, h.x - a.x);
        const hk = head.getData('k');
        head.setPosition(h.x, h.y).setRotation(ang).setScale(hk, Math.cos(ang) < 0 ? -hk : hk).setVisible(true);
        const mid = pts[Math.floor(pts.length / 2)];
        fire.setPosition(mid.x, mid.y);
      }
      halo.setPosition(h.x, h.y);
    }, () => {
      body.destroy(); glowG.destroy(); halo.destroy();
      this.destroyDeep(head);
      fire.stop();
      this.time.delayedCall(700, () => fire.destroy());
    });
    this.time.delayedCall(700, () => this.tweens.add({ targets: n, x: NINJA_X, duration: 260,
      onComplete: () => this.sheathe() }));
    // Η βουτιά μέσα από τη γραμμή των εχθρών είναι γύρω στο 60% της διαδρομής
    return { hitAt: 1700, endAt: T };
  },

  // Το κεφάλι του δράκου, κοιτά προς τα δεξιά (γωνία 0)
  makeDragonHead() {
    const g = this.add.graphics();
    g.fillStyle(NUM.flameDeep, 1);
    g.fillPoints([P(-26, -16), P(8, -18), P(40, -8), P(46, 2), P(18, 6), P(-22, 14)], true);   // κρανίο
    g.fillStyle(NUM.flame, 1);
    g.fillPoints([P(-20, 6), P(18, 8), P(40, 12), P(10, 20), P(-18, 16)], true);             // σαγόνι
    g.fillStyle(NUM.lantern, 1);
    g.fillTriangle(-14, -14, -44, -36, -4, -18);                                            // κέρατα
    g.fillTriangle(-22, -8, -52, -18, -16, -4);
    g.fillStyle(NUM.flameCore, 1);
    g.fillEllipse(10, -9, 11, 6);                                                          // μάτι
    g.fillStyle(NUM.shadow, 1);
    g.fillEllipse(12, -9, 3, 5);
    g.lineStyle(2, NUM.flameCore, .9);                                                     // μουστάκια
    g.strokePoints([P(38, 4), P(52, 16), P(46, 30)]);
    g.strokePoints([P(34, -6), P(56, -14), P(66, -4)]);
    const glow = this.add.image(20, 0, 'glow-lantern').setScale(.6).setAlpha(.6).setBlendMode(Phaser.BlendModes.ADD);
    return this.add.container(0, 0, [glow, g]).setDepth(17).setVisible(false);
  },

  // --------------------------------- Ζ10: το βασικό όπλο αλλάζει με τη ζώνη

  /** Το βλήμα της βασικής βολής για κάθε όπλο: { obj, s0, s1, tint }. */
  makeBolt(weapon, big) {
    if (weapon === 'plasma') {                   // σφαίρα πλάσματος με δαχτυλίδι που γυρίζει
      const ring = this.add.graphics();
      ring.lineStyle(3, NUM.moon, .9);
      ring.strokeEllipse(0, 0, 44, 18);
      ring.lineStyle(2, NUM.spirit, .8);
      ring.strokeEllipse(0, 0, 18, 44);
      const c = this.add.container(0, 0, [
        this.add.image(0, 0, 'glow-spirit').setScale(.9).setBlendMode(Phaser.BlendModes.ADD),
        this.add.circle(0, 0, 15, NUM.spirit), this.add.circle(-2, -2, 7, NUM.moon), ring
      ]);
      this.tweens.add({ targets: ring, angle: 360, duration: 300 });
      return { obj: c, s0: big ? 1.25 : 1, s1: big ? 1.7 : 1.3, tint: [NUM.spirit, NUM.moon] };
    }
    if (weapon === 'star') {                     // αστέρι φωτός με τέσσερις ακτίνες
      const g = this.add.graphics();
      g.fillStyle(NUM.flameCore, 1);
      g.fillPoints([P(0, -24), P(6, -6), P(24, 0), P(6, 6), P(0, 24), P(-6, 6), P(-24, 0), P(-6, -6)], true);
      g.fillStyle(NUM.moon, 1);
      g.fillCircle(0, 0, 6);
      const c = this.add.container(0, 0, [
        this.add.image(0, 0, 'glow-lantern').setScale(.8).setBlendMode(Phaser.BlendModes.ADD), g
      ]);
      this.tweens.add({ targets: g, angle: 540, duration: 300 });
      return { obj: c, s0: big ? 1.3 : 1, s1: big ? 1.8 : 1.35, tint: [NUM.lantern, NUM.moon] };
    }
    const img = this.add.image(0, 0, 'flame').setAngle(96);
    return { obj: img, s0: big ? .62 : .42, s1: big ? .95 : .62, tint: [NUM.flameCore, NUM.flame] };
  },

  /** Το χρώμα της φλόγας στο χέρι, ανάλογα με το όπλο. */
  weaponTint(weapon) {
    return { plasma: NUM.spirit, volt: NUM.star, star: NUM.lantern }[weapon] || 0xFFFFFF;
  },

  /** Ηλεκτρισμός από τα χέρια: στιγμιαίος κεραυνός ως τον μπροστινό εχθρό. */
  voltShot(target, big) {
    const hx = this.ninja.x + 56, hy = this.ninja.y - 78;
    const tx = target ? target.x : W, ty = target ? target.y - 60 * (target.size || 1) : hy;
    audio.thunder(.35);
    const g = this.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
    const draw = () => {
      g.clear();
      const pts = jag(hx, hy, tx, ty, big ? 22 : 16, 30);
      g.lineStyle(big ? 12 : 9, NUM.spirit, .35); g.strokePoints(pts);
      g.lineStyle(big ? 5 : 4, NUM.star, .8); g.strokePoints(pts);
      g.lineStyle(2, NUM.moon, 1); g.strokePoints(pts);
    };
    draw();
    this.time.addEvent({ delay: 60, repeat: 3, callback: draw });
    this.tweens.add({ targets: g, alpha: 0, duration: 160, delay: 250, onComplete: () => g.destroy() });
    const hand = this.add.image(hx, hy, 'glow-moon').setScale(.5).setAlpha(.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(15);
    this.tweens.add({ targets: hand, scale: 1, alpha: 0, duration: 300, onComplete: () => hand.destroy() });
    this.time.delayedCall(110, () => {
      if (target && target.scene) this.sealRing(tx, ty, NUM.spirit);
      if (this.combo >= 9) {                      // COMBO_ZOOM: η κάμερα σκύβει
        this.cameras.main.zoomTo(1.035, 240, 'Quad.easeOut', true);
        this.time.delayedCall(500, () => this.cameras.main.zoomTo(1, 320, 'Quad.easeInOut', true));
      }
      this.hitFrontEnemy();
    });
  },

  // ------------------------------------------ Ζ12: το τσεκούρι του Τέρατος

  /**
   * Τσεκούρι με λαβή από τη λαβή (x, y) προς την κατεύθυνση (ux, uy). Η
   * λεπίδα βγαίνει στην πλευρά v = (uy, -ux) — με το τσεκούρι σηκωμένο
   * μπροστά, αυτή κοιτά τον νίντζα.
   */
  drawAxe(g, x, y, ux, uy, S = 1) {
    const vx = uy, vy = -ux;
    const hx = x + ux * 80 * S, hy = y + uy * 80 * S;
    const Q = (a, b) => P(hx + (ux * a + vx * b) * S, hy + (uy * a + vy * b) * S);
    g.lineStyle(9 * S, 0x3A2A1E, 1);                                   // ξύλινη λαβή
    g.lineBetween(x - ux * 16 * S, y - uy * 16 * S, x + ux * 96 * S, y + uy * 96 * S);
    g.lineStyle(2.5 * S, 0x6B4E36, .9);
    g.lineBetween(x - ux * 12 * S + vx * 2 * S, y - uy * 12 * S + vy * 2 * S, x + ux * 90 * S + vx * 2 * S, y + uy * 90 * S + vy * 2 * S);
    g.fillStyle(NUM.smoke, 1);                                          // η λεπίδα
    g.fillPoints([Q(16, 4), Q(34, 26), Q(22, 44), Q(0, 50), Q(-22, 44), Q(-34, 26), Q(-16, 4)], true);
    g.fillStyle(NUM.stone, 1);
    g.fillPoints([Q(14, -6), Q(16, 8), Q(-16, 8), Q(-14, -6)], true);   // το κεφάλι στη λαβή
    g.fillPoints([Q(10, -4), Q(0, -24), Q(-10, -4)], true);              // πίσω αγκάθι
    g.lineStyle(2.5 * S, NUM.moon, .75);                                // κόψη που γυαλίζει
    g.strokePoints([Q(34, 26), Q(22, 44), Q(0, 50), Q(-22, 44), Q(-34, 26)]);
  },

  /** Το τσεκούρι γυρίζει σαν μπούμερανγκ στο χέρι του Τέρατος. */
  axeReturn(e) {
    if (!e.scene) return;
    const obj = this.makeMissile('axe');
    const x0 = NINJA_X + 14, y0 = LINE_Y - 96;
    obj.setPosition(x0, y0).setDepth(15);
    const p = { t: 0 };
    this.tweens.add({
      targets: p, t: 1, duration: 520, ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!e.scene) return;
        const tx = e.x - 60 * (e.size || 1), ty = e.y - 60;
        obj.x = x0 + (tx - x0) * p.t;
        obj.y = y0 + (ty - y0) * p.t - 110 * 4 * p.t * (1 - p.t);
        obj.angle = -900 * p.t;
      },
      onComplete: () => { obj.destroy(); if (e.scene) e.hasAxe = true; }
    });
  },

  // ------------------------------------------ Ζ9: η Μεγάλη Τεχνική

  /**
   * Τα γράμματα της λέξης που συναρμολόγησε φεύγουν από την περγαμηνή και
   * χώνονται στα χέρια του· ο νίντζα φορτίζει και εκτοξεύει ΜΕΓΑΛΗ δίνη
   * φωτιάς που κυλά σε όλο το πεδίο και αφήνει φωτιά στο χώμα. Επιστρέφει
   * σε πόσα ms περνά από κάθε εχθρό (για τα χτυπήματα).
   * @param {string[]} letters
   */
  greatWave(letters) {
    const n = this.ninja;
    const hx = n.x + 60, hy = n.y - 100;
    n.frozen = true;
    audio.cast();
    // 1. τα γράμματα
    const cx = W / 2, step = Math.min(46, 560 / Math.max(1, letters.length));
    letters.forEach((u, i) => {
      const t = this.add.text(cx + (i - (letters.length - 1) / 2) * step, 152, u, {
        fontFamily: 'Andika, "Segoe UI", sans-serif', fontSize: '52px', fontStyle: '700', color: '#FFE8A3'
      }).setOrigin(.5).setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: t, x: hx, y: hy, scale: .3, alpha: .2, duration: 420, delay: 60 + i * 55,
        ease: 'Quad.easeIn', onComplete: () => { t.destroy(); audio.chime(Math.min(i, 3)); } });
    });
    // 2. φόρτιση
    const charge = this.add.image(hx, hy, 'glow-flame').setScale(.3).setAlpha(.9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(16);
    this.tweens.add({ targets: charge, scale: 1.6, duration: 560, delay: 120, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: n, x: NINJA_X - 22, angle: 8, duration: 500, delay: 120 });
    // 3. εκτόξευση
    const REL = 700, TRAVEL = 1150, x0 = NINJA_X + 90, x1 = W + 240;
    this.time.delayedCall(REL, () => {
      audio.flamethrower(1100);
      audio.gust();
      this.cameras.main.flash(200, 255, 200, 120);
      this.cameras.main.shake(700, .007);
      this.tweens.add({ targets: n, x: NINJA_X + 10, angle: -12, duration: 120, ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({ targets: n, x: NINJA_X, angle: 0, duration: 400, delay: 500,
          onComplete: () => { n.frozen = false; } }) });
      this.tweens.add({ targets: charge, scale: 3, alpha: 0, duration: 380, onComplete: () => charge.destroy() });
      // κύμα κρούσης
      const ring = this.add.graphics({ x: x0, y: LINE_Y - 100 }).setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
      ring.lineStyle(10, NUM.flameCore, .8); ring.strokeCircle(0, 0, 60);
      ring.lineStyle(4, NUM.flame, .9); ring.strokeCircle(0, 0, 78);
      this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
      const v = this.makeVortex(1.45);
      let lastTrail = x0;
      this.frameLoop(TRAVEL, (t) => {
        v.x = x0 + (x1 - x0) * t;
        v.grow = Math.min(1, t * 6);
        v.spin = t * TRAVEL * .013;
        v.draw();
        // φωτιά που μένει στο χώμα πίσω της
        if (v.x - lastTrail > 70 && v.x < W) {
          lastTrail = v.x;
          const f = this.add.image(v.x, LINE_Y + 10, 'flame').setOrigin(.5, 1).setScale(.4, .5)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setAlpha(.85);
          this.tweens.add({ targets: f, scaleY: .05, alpha: 0, duration: 900, ease: 'Quad.easeIn',
            onComplete: () => f.destroy() });
        }
      }, () => v.destroy());
    });
    return (x) => REL + TRAVEL * Phaser.Math.Clamp((x - x0) / (x1 - x0), 0, 1);
  }
};
