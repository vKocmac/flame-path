// Η μάχη: η ορθογραφία ΕΙΝΑΙ το πολεμικό σύστημα, όχι διακοπή του.
//
// Αμετάβλητα που τηρεί αυτή η σκηνή (ARCHITECTURE §8):
//  1. Ποτέ δεν σχηματίζεται λάθος μορφή λέξης στην οθόνη. Η περγαμηνή
//     δείχνει το γράμμα ΜΟΝΟ όταν είναι το σωστό.
//  2. Νέος στόχος περνά πρώτα από την τελετή περγαμηνής (intro).
//  3. Λάθος = καπνός, ένα βήμα του εχθρού, αμέσως δεύτερη ευκαιρία.
//     Ποτέ κόκκινο, ποτέ «ΛΑΘΟΣ», καμία απώλεια.
//  6. Ένα αποτέλεσμα ανά πρόκληση, από την ΠΡΩΤΗ προσπάθεια.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import * as store from '../../shared/storage.js';
import * as engine from '../../learning/engine.js';
import { buildTextures } from '../textures.js';
import * as world from '../world.js';

const { W, H } = world;
const LINE_Y = 640;          // η γραμμή του εδάφους όπου πατούν οι μορφές
const NINJA_X = 220;
// Και οι τρεις εχθροί πρέπει να χωρούν στην οθόνη (πλάτος 1280): ο πίσω
// στο 1236, όχι έξω από το κάδρο.
const SPAWN_X = 1000;
const ENEMY_GAP = 118;
// Το βήμα του λάθους είναι μεγαλύτερο από την απόσταση των εχθρών, ώστε
// η πίεση να χτίζεται σιγά όταν το παιδί δυσκολεύεται: κάθε λάθος φέρνει
// τη γραμμή 170 κοντύτερα, κάθε νίκη τη σπρώχνει 118 πίσω (καθαρό -52).
const ENEMY_STEP = 170;
const RETREAT_X = NINJA_X + 190;
const SPARKS_PER_KILL = 3;

export default class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create() {
    buildTextures(this);
    this.calm = world.isCalm();
    this.busy = false;
    this.enemies = [];
    this.orbs = [];
    this.regroupShown = false;

    this.buildBackdrop();
    this.ninja = this.makeNinja(NINJA_X, LINE_Y);
    this.buildScroll();
    this.buildHUD();

    const state = store.loadState();
    this.profileId = state.activeProfileId;
    engine.resetSession();

    this.cameras.main.fadeIn(420, 0xFF, 0x7A, 0x1A);
    this.spawnWave();
    this.time.delayedCall(500, () => this.nextChallenge());
  }

  buildBackdrop() {
    const calm = this.calm;
    world.buildSky(this, 200);
    world.buildStars(this, calm);
    world.buildMoon(this, calm);
    world.ridge(this, world.RIDGE_HAZE, NUM.ridgeHaze, .55);
    world.ridge(this, world.RIDGE_FAR, NUM.ridgeFar);
    world.buildMist(this, calm);
    world.ridge(this, world.RIDGE_MID, NUM.ridgeMid);
    world.buildDojo(this, 176, H * .653, .72, calm);   // το ντότζο μένει πίσω μας
    world.ridge(this, world.RIDGE_NEAR, NUM.ridgeNear);
    world.buildBamboo(this, 60, H * .885, .8);
    world.buildBamboo(this, 1240, H * .89, .7);
    world.buildGround(this, { path: 'wide' });
    world.lantern(this, 470, 604, .7, calm);
    world.lantern(this, 1010, 600, .7, calm);
  }

  // ------------------------------------------------------------- οι μορφές

  makeNinja(x, y) {
    const c = this.add.container(x, y).setDepth(12);
    const g = this.add.graphics();
    g.fillStyle(NUM.dojoRoof, 1);
    g.fillRect(-19, -14, 15, 14);                       // πόδια
    g.fillRect(6, -14, 15, 14);
    g.fillRoundedRect(-26, -74, 52, 62, 15);            // σώμα
    g.fillCircle(0, -92, 27);                           // κεφάλι
    g.fillPoints([                                      // κορδέλα που κυματίζει
      new Phaser.Geom.Point(-24, -100), new Phaser.Geom.Point(-58, -112),
      new Phaser.Geom.Point(-52, -96), new Phaser.Geom.Point(-24, -92)
    ], true);
    g.fillStyle(NUM.lantern, 1);
    g.fillRect(-26, -40, 52, 8);                        // ζώνη
    g.fillStyle(NUM.parchment, .95);
    g.fillRoundedRect(-17, -99, 34, 8, 4);              // μάτια
    c.add(g);
    c.setScale(1.3);   // ο ήρωας πρέπει να διαβάζεται από απόσταση σε tablet

    // Το χέρι που κρατά τη φλόγα
    this.hand = this.add.image(x + 48, y - 78, 'glow-flame')
      .setScale(.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(13);
    return c;
  }

  makeEnemy(x, size = 1) {
    const c = this.add.container(x, LINE_Y).setDepth(11);
    const glow = this.add.image(0, -34 * size, 'glow-moon')
      .setScale(.7 * size).setAlpha(.10);
    const g = this.add.graphics();
    g.fillStyle(NUM.ridgeHaze, .95);
    g.fillEllipse(0, -40 * size, 62 * size, 76 * size);   // σώμα καπνού
    g.fillEllipse(-16 * size, -12 * size, 34 * size, 26 * size);
    g.fillEllipse(18 * size, -10 * size, 30 * size, 22 * size);
    g.fillPoints([                                        // δύο σουβλερά «κέρατα» καπνού
      new Phaser.Geom.Point(-22 * size, -66 * size),
      new Phaser.Geom.Point(-30 * size, -96 * size),
      new Phaser.Geom.Point(-8 * size, -70 * size)
    ], true);
    g.fillPoints([
      new Phaser.Geom.Point(22 * size, -66 * size),
      new Phaser.Geom.Point(31 * size, -94 * size),
      new Phaser.Geom.Point(9 * size, -70 * size)
    ], true);
    g.fillStyle(NUM.star, .92);                           // χλωμά μάτια
    g.fillCircle(-11 * size, -48 * size, 5.5 * size);
    g.fillCircle(11 * size, -48 * size, 5.5 * size);
    c.add([glow, g]);

    if (!this.calm) {
      this.tweens.add({
        targets: c, y: LINE_Y - 6, scaleX: 1.04, scaleY: .97,
        duration: Phaser.Math.Between(1100, 1700),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 700)
      });
    }
    return c;
  }

  spawnWave() {
    this.wave = (this.wave || 0) + 1;
    for (let i = 0; i < 3; i++) {
      const e = this.makeEnemy(SPAWN_X + i * ENEMY_GAP, 1.3 - i * .06);
      e.setAlpha(0);
      this.tweens.add({ targets: e, alpha: 1, duration: 500, delay: i * 160 });
      this.enemies.push(e);
    }
  }

  frontEnemy() { return this.enemies[0] || null; }

  // ----------------------------------------------------------- η περγαμηνή

  buildScroll() {
    this.scroll = this.add.container(W / 2, 152).setDepth(20);
    const bg = this.add.graphics();
    bg.fillStyle(NUM.parchment, 1);
    bg.fillRoundedRect(-320, -56, 640, 112, 18);
    bg.fillStyle(NUM.ink, .07);
    bg.fillRoundedRect(-320, 38, 640, 18, 9);            // σκιά στο κάτω μέρος
    // Ξύλινοι κύλινδροι δεξιά κι αριστερά
    bg.fillStyle(NUM.dojoRoof, 1);
    bg.fillRoundedRect(-338, -66, 20, 132, 10);
    bg.fillRoundedRect(318, -66, 20, 132, 10);
    this.scroll.add(bg);
    this.scroll.setScale(0, 1).setAlpha(0);

    this.label = this.add.text(W / 2, 62, '', {
      fontFamily: FONT.ui, fontSize: '22px', color: HEX.lantern
    }).setOrigin(.5).setDepth(21).setAlpha(0);
  }

  showScroll() {
    this.tweens.add({ targets: this.scroll, scaleX: 1, alpha: 1, duration: 340, ease: 'Back.easeOut' });
  }

  hideScroll(cb) {
    this.wordParts?.forEach((o) => o.destroy());
    this.wordParts = [];
    this.tweens.add({
      targets: [this.scroll], scaleX: 0, alpha: 0, duration: 240, ease: 'Quad.easeIn',
      onComplete: () => cb && cb()
    });
    this.tweens.add({ targets: this.label, alpha: 0, duration: 200 });
  }

  // Η λέξη στην περγαμηνή: τρία κομμάτια σε σειρά (πριν / κενό / μετά).
  // Το κενό κρατά ΤΟ ΣΩΣΤΟ γράφημα από την αρχή, αόρατο — έτσι το πλάτος
  // είναι ακριβές και η αποκάλυψη είναι απλό fade, χωρίς μετατόπιση.
  layoutWord(text, gap, { revealed }) {
    this.wordParts?.forEach((o) => o.destroy());
    const style = { fontFamily: FONT.word, fontSize: '58px', color: HEX.ink };
    const before = text.slice(0, gap.start);
    const target = text.substr(gap.start, gap.length);
    const after = text.slice(gap.start + gap.length);

    const tBefore = this.add.text(0, 0, before, style).setOrigin(0, .5).setDepth(22);
    const tGap = this.add.text(0, 0, target, style).setOrigin(0, .5).setDepth(22);
    const tAfter = this.add.text(0, 0, after, style).setOrigin(0, .5).setDepth(22);
    const total = tBefore.width + tGap.width + tAfter.width;
    let x = W / 2 - total / 2;
    const y = 152;
    tBefore.setPosition(x, y); x += tBefore.width;
    tGap.setPosition(x, y);
    const gapX = x, gapW = tGap.width;
    x += gapW;
    tAfter.setPosition(x, y);
    tGap.setAlpha(revealed ? 1 : 0);

    // Πύρινη υπογράμμιση στο κενό
    const line = this.add.graphics().setDepth(22);
    line.fillStyle(NUM.flame, 1);
    line.fillRoundedRect(gapX + 2, y + 30, Math.max(gapW - 4, 18), 5, 2.5);

    this.wordParts = [tBefore, tGap, tAfter, line];
    this.gapText = tGap;
    this.gapCenter = new Phaser.Math.Vector2(gapX + gapW / 2, y);
    return this.gapCenter;
  }

  // -------------------------------------------------------------- οι ροές

  nextChallenge() {
    this.clearOrbs();
    const ch = engine.getNextChallenge(this.profileId, { types: ['gap'] });
    if (!ch) { this.showNoWords(); return; }
    this.current = ch;
    this.reported = false;
    this.revealed = false;
    this.startedAt = performance.now();
    if (ch.type === 'intro') this.showIntro(ch);
    else this.showGap(ch);
  }

  // Τελετή περγαμηνής: πρώτη έκθεση, ΧΩΡΙΣ δυνατότητα λάθους.
  showIntro(ch) {
    this.busy = true;
    this.label.setText(TXT.newTechnique).setAlpha(0);
    this.showScroll();
    this.tweens.add({ targets: this.label, alpha: 1, duration: 300, delay: 120 });

    const center = this.layoutWord(ch.text, ch.gap, { revealed: true });
    this.gapText.setColor(HEX.flameDeep);
    const halo = this.add.image(center.x, center.y, 'glow-flame')
      .setScale(.75).setAlpha(.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(21);
    this.wordParts.push(halo);
    if (!this.calm) {
      this.tweens.add({ targets: halo, alpha: .85, scale: .95,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const hint = this.add.text(W / 2, 246, TXT.sealHint, {
      fontFamily: FONT.ui, fontSize: '20px', color: HEX.smoke
    }).setOrigin(.5).setDepth(21);
    this.wordParts.push(hint);

    const zone = this.add.zone(center.x, center.y, Math.max(this.gapText.width + 40, 80), 110)
      .setOrigin(.5).setDepth(23).setInteractive({ useHandCursor: true });
    this.wordParts.push(zone);
    zone.once('pointerdown', () => {
      audio.chime(2);
      this.sealBurst(center.x, center.y);
      this.tweens.add({ targets: halo, scale: 2.2, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
      engine.reportResult({
        challengeId: ch.challengeId, wordId: ch.wordId, targetId: ch.targetId,
        profileId: this.profileId, type: 'intro', correct: true,
        chosenGrapheme: null, revealUsed: false,
        durationMs: Math.round(performance.now() - this.startedAt)
      });
      this.time.delayedCall(420, () => {
        this.hideScroll(() => { this.busy = false; this.nextChallenge(); });
      });
    });
  }

  showGap(ch) {
    this.busy = false;
    this.label.setAlpha(0);
    this.showScroll();
    this.layoutWord(ch.text, ch.gap, { revealed: false });
    this.spawnOrbs(ch.candidates);
  }

  // Τα γραφήματα αιωρούνται ΕΠΙΤΟΠΟΥ (±6px): ζωντανή σκηνή, ακίνητος
  // στόχος για το παιδικό δάχτυλο (DESIGN, απόφαση 2).
  spawnOrbs(candidates) {
    const n = candidates.length;
    const spread = Math.min(150, 620 / Math.max(n - 1, 1));
    const startX = W / 2 - (spread * (n - 1)) / 2;
    candidates.forEach((cand, i) => {
      const x = startX + i * spread;
      const y = 372 + Math.sin(i * 1.1) * 22;
      const orb = this.add.container(x, y).setDepth(25);
      const glow = this.add.image(0, 0, 'glow-flame').setScale(.72).setAlpha(.6)
        .setBlendMode(Phaser.BlendModes.ADD);
      const disc = this.add.circle(0, 0, 40, NUM.flame);
      const inner = this.add.circle(0, -4, 27, NUM.lantern).setAlpha(.85);
      const txt = this.add.text(0, 0, cand, {
        fontFamily: FONT.word, fontSize: '42px', fontStyle: '700', color: HEX.ink
      }).setOrigin(.5);
      orb.add([glow, disc, inner, txt]);
      orb.setData('grapheme', cand);
      orb.setData('glow', glow);
      orb.setSize(96, 96).setInteractive({ useHandCursor: true });
      orb.on('pointerdown', () => this.chooseOrb(orb));

      orb.setScale(0);
      this.tweens.add({ targets: orb, scale: 1, duration: 320, delay: i * 70, ease: 'Back.easeOut' });
      if (!this.calm) {
        this.tweens.add({
          targets: orb, y: y - 6, duration: Phaser.Math.Between(2400, 3200),
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 180
        });
      }
      this.orbs.push(orb);
    });
  }

  clearOrbs() {
    this.orbs.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
    this.orbs = [];
  }

  chooseOrb(orb) {
    if (this.busy) return;
    const chosen = orb.getData('grapheme');
    const ch = this.current;
    const correct = chosen === ch.text.substr(ch.gap.start, ch.gap.length);
    this.busy = true;

    // Ένα αποτέλεσμα ανά πρόκληση, από την ΠΡΩΤΗ προσπάθεια. Το άγγιγμα
    // μετά την αποκάλυψη είναι αντιγραφή, όχι ανάκληση — δεν αναφέρεται.
    if (!this.reported) {
      this.reported = true;
      engine.reportResult({
        challengeId: ch.challengeId, wordId: ch.wordId, targetId: ch.targetId,
        profileId: this.profileId, type: ch.type, correct,
        chosenGrapheme: correct ? null : chosen,
        revealUsed: !correct,
        durationMs: Math.round(performance.now() - this.startedAt)
      });
    }

    if (correct) this.castFlame(orb);
    else this.flameFails(orb);
  }

  // ------------------------------------------------------------ επιτυχία

  castFlame(orb) {
    this.orbs.filter((o) => o !== orb).forEach((o) => {
      this.tweens.add({ targets: o, alpha: .25, scale: .8, duration: 180 });
      o.disableInteractive();
    });
    this.tweens.killTweensOf(orb);

    // Το γράφημα κάθεται στο κενό ως μελάνι — η σωστή λέξη, ολόκληρη
    this.gapText.setAlpha(0);
    this.tweens.add({ targets: this.gapText, alpha: 1, duration: 220, delay: 120 });
    const flash = this.add.image(this.gapCenter.x, this.gapCenter.y, 'glow-lantern')
      .setScale(.5).setAlpha(.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(21);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.4, duration: 520,
      onComplete: () => flash.destroy() });

    // Η φλόγα ρουφιέται στη χούφτα του νίντζα
    audio.whoosh();
    this.tweens.add({
      targets: orb, x: this.ninja.x + 48, y: this.ninja.y - 78, scale: .45,
      duration: 300, ease: 'Quad.easeIn',
      onComplete: () => { orb.destroy(); this.chargeAndFire(); }
    });
    this.tweens.add({ targets: this.hand, alpha: .9, scale: 1.1, duration: 300 });
  }

  chargeAndFire() {
    this.tweens.add({ targets: this.ninja, angle: -7, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
    const target = this.frontEnemy();
    const tx = target ? target.x : W + 60;

    const bolt = this.add.image(this.ninja.x + 56, this.ninja.y - 78, 'flame')
      .setScale(.42).setAngle(96).setDepth(14);
    const trail = this.add.particles(0, 0, 'spark', {
      speed: { min: 10, max: 50 }, scale: { start: .5, end: 0 },
      alpha: { start: .8, end: 0 }, lifespan: 420, blendMode: 'ADD',
      tint: [NUM.flameCore, NUM.flame], follow: bolt
    });
    trail.setFrequency(18, 1);
    trail.start();
    this.tweens.add({ targets: this.hand, alpha: 0, scale: .5, duration: 200 });

    this.tweens.add({
      targets: bolt, x: tx, scale: .62, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        bolt.destroy();
        trail.stop();
        this.time.delayedCall(500, () => trail.destroy());
        this.killFrontEnemy();
      }
    });
  }

  killFrontEnemy() {
    const e = this.enemies.shift();
    if (e) {
      const burst = this.add.particles(e.x, e.y - 44, 'spark', {
        speed: { min: 60, max: 260 }, scale: { start: .8, end: 0 },
        alpha: { start: 1, end: 0 }, lifespan: { min: 420, max: 900 },
        blendMode: 'ADD', tint: [NUM.flameCore, NUM.lantern, NUM.flame],
        emitting: false
      }).setDepth(15);
      burst.explode(34);
      this.time.delayedCall(1200, () => burst.destroy());
      this.tweens.killTweensOf(e);
      this.tweens.add({ targets: e, alpha: 0, scaleX: 1.4, scaleY: .6, y: e.y - 20,
        duration: 480, ease: 'Quad.easeOut', onComplete: () => e.destroy() });
      this.collectSparks(e.x, e.y - 44);
    }

    // Η σωστή λέξη μένει ολόκληρη για μια ανάσα, μετά επόμενη πρόκληση
    this.time.delayedCall(820, () => {
      this.hideScroll(() => {
        if (!this.enemies.length) {
          this.time.delayedCall(420, () => { this.spawnWave(); this.nextChallenge(); });
        } else {
          this.nextChallenge();
        }
      });
    });
  }

  collectSparks(x, y) {
    const state = store.loadState();
    const total = store.addSparks(state, SPARKS_PER_KILL);
    for (let i = 0; i < SPARKS_PER_KILL; i++) {
      const s = this.add.image(x, y, 'spark').setScale(.9)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(46);
      this.tweens.add({
        targets: s, x: this.sparkIcon.x, y: this.sparkIcon.y, scale: .5,
        duration: 640, delay: 120 + i * 110, ease: 'Quad.easeIn',
        onComplete: () => {
          s.destroy();
          audio.chime(i);
          this.sparkLabel.setText(String(total - (SPARKS_PER_KILL - 1 - i)));
          this.tweens.add({ targets: this.sparkIcon, scale: 1.35, duration: 110, yoyo: true });
        }
      });
    }
  }

  // --------------------------------------------------------------- λάθος

  // Η φλόγα δεν πιάνει. Καθόλου κόκκινο, καθόλου «ΛΑΘΟΣ», καμία απώλεια —
  // ο εχθρός απλώς κάνει ένα βήμα και το σωστό γράφημα φωτίζεται.
  flameFails(orb) {
    audio.fizzle();
    const glow = orb.getData('glow');
    this.tweens.add({ targets: glow, alpha: 0, duration: 240 });
    this.tweens.add({ targets: orb, alpha: .3, scale: .82, duration: 380, ease: 'Quad.easeOut' });
    orb.disableInteractive();

    const smoke = this.add.particles(orb.x, orb.y, 'spark', {
      speed: { min: 12, max: 46 }, angle: { min: 250, max: 290 },
      scale: { start: .7, end: 0 }, alpha: { start: .5, end: 0 },
      lifespan: { min: 500, max: 900 }, tint: NUM.smoke, emitting: false
    }).setDepth(26);
    smoke.explode(14);
    this.time.delayedCall(1100, () => smoke.destroy());

    this.time.delayedCall(400, () => this.enemyStepForward());
  }

  enemyStepForward() {
    const e = this.frontEnemy();
    if (!e) { this.revealCorrect(); return; }
    audio.thud();
    // Προχωράει ΟΛΗ η γραμμή, κρατώντας τον σχηματισμό της — αλλιώς κάθε
    // νίκη θα μηδένιζε την πρόοδό τους και δεν θα πλησίαζαν ποτέ.
    this.enemies.forEach((en, i) => {
      this.tweens.add({
        targets: en, x: en.x - ENEMY_STEP, duration: 340, ease: 'Quad.easeOut',
        onComplete: i === 0 ? () => {
          if (en.x <= RETREAT_X) this.regroup();
          else this.revealCorrect();
        } : undefined
      });
    });
  }

  // Το σωστό γράφημα φωτίζεται στη θέση του — πρόσκληση, όχι επίπληξη.
  revealCorrect() {
    this.revealed = true;
    const ch = this.current;
    const right = ch.text.substr(ch.gap.start, ch.gap.length);
    const orb = this.orbs.find((o) => o.getData('grapheme') === right && o.active);
    if (!orb) { this.busy = false; return; }
    orb.setAlpha(1).setScale(1);
    orb.setInteractive({ useHandCursor: true });
    const glow = orb.getData('glow');
    this.tweens.add({
      targets: glow, alpha: 1, scale: 1.05, duration: 600,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.busy = false;
  }

  // Ο νίντζα υποχωρεί σε ασφαλές σημείο και το κύμα ξαναρχίζει.
  // Δεν χάνεται τίποτα — ούτε σπίθες, ούτε πρόοδος.
  regroup() {
    this.busy = true;
    const puff = this.add.particles(this.ninja.x, this.ninja.y - 50, 'spark', {
      speed: { min: 40, max: 160 }, scale: { start: 1.1, end: 0 },
      alpha: { start: .55, end: 0 }, lifespan: 700, tint: NUM.smoke, emitting: false
    }).setDepth(16);
    puff.explode(26);
    this.time.delayedCall(1200, () => puff.destroy());

    this.tweens.add({ targets: this.ninja, x: NINJA_X - 70, alpha: .2, duration: 220, ease: 'Quad.easeIn',
      onComplete: () => {
        this.ninja.setX(NINJA_X);
        this.tweens.add({ targets: this.ninja, alpha: 1, duration: 300 });
      } });

    this.enemies.forEach((e, i) => {
      this.tweens.add({ targets: e, x: SPAWN_X + i * ENEMY_GAP, duration: 520, ease: 'Quad.easeInOut' });
    });

    if (!this.regroupShown) {
      this.regroupShown = true;
      const msg = this.add.text(W / 2, 300, TXT.regroup, {
        fontFamily: FONT.ui, fontSize: '24px', color: HEX.lantern
      }).setOrigin(.5).setDepth(30).setAlpha(0);
      this.tweens.add({ targets: msg, alpha: 1, duration: 300, yoyo: true, hold: 1500,
        onComplete: () => msg.destroy() });
      this.time.delayedCall(2400, () => this.revealCorrect());
    } else {
      this.time.delayedCall(620, () => this.revealCorrect());
    }
  }

  sealBurst(x, y) {
    const b = this.add.particles(x, y, 'spark', {
      speed: { min: 50, max: 190 }, scale: { start: .7, end: 0 },
      alpha: { start: 1, end: 0 }, lifespan: { min: 400, max: 800 },
      blendMode: 'ADD', tint: [NUM.flameCore, NUM.lantern], emitting: false
    }).setDepth(24);
    b.explode(24);
    this.time.delayedCall(1100, () => b.destroy());
  }

  // ---------------------------------------------------- καμία λέξη ακόμα

  showNoWords() {
    this.clearOrbs();
    this.hideScroll();
    this.enemies.forEach((e) => { this.tweens.killTweensOf(e); e.destroy(); });
    this.enemies = [];

    const lamp = this.add.image(W / 2, 300, 'glow-lantern')
      .setScale(1.8).setAlpha(.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(20);
    if (!this.calm) {
      this.tweens.add({ targets: lamp, alpha: .75, scale: 2,
        duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.text(W / 2, 300, TXT.noWords, {
      fontFamily: FONT.ui, fontSize: '30px', color: HEX.flameCore
    }).setOrigin(.5).setDepth(21);
    this.add.text(W / 2, 352, TXT.noWordsHint, {
      fontFamily: FONT.ui, fontSize: '20px', color: HEX.smoke
    }).setOrigin(.5).setDepth(21);
  }

  // ------------------------------------------------------------------ HUD

  buildHUD() {
    world.buildVignette(this);

    const back = this.add.text(38, 34, '‹', {
      fontFamily: FONT.ui, fontSize: '40px', color: HEX.smoke
    }).setOrigin(.5).setDepth(46).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(260, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
    });

    const icon = this.add.text(94, 34, '♪', {
      fontFamily: FONT.ui, fontSize: '26px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(audio.muted ? .35 : .55).setDepth(46)
      .setInteractive({ useHandCursor: true });
    const bar = this.add.rectangle(94, 34, 28, 2, NUM.smoke)
      .setAngle(-40).setAlpha(audio.muted ? .7 : 0).setDepth(47);
    icon.on('pointerdown', () => {
      const m = audio.toggleMute();
      bar.setAlpha(m ? .7 : 0);
      icon.setAlpha(m ? .35 : .55);
    });

    this.sparkIcon = this.add.image(W - 96, 36, 'spark')
      .setScale(1.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(46);
    this.sparkLabel = this.add.text(W - 70, 36, String(store.getSparks(store.loadState())), {
      fontFamily: FONT.ui, fontSize: '26px', fontStyle: '700', color: HEX.lantern
    }).setOrigin(0, .5).setDepth(46);
  }
}
