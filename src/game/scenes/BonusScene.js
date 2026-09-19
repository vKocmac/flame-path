// Η Πύλη — η πίστα μπόνους (NEXT-FIXES Λ2, 18/09/2026).
//
// Ο Σταύρος (μέσω Κοσμά): «μια μπόνους πίστα που όταν θα ξεκλειδώνει θα είναι
// σαν άλλη διάσταση με άλλα σκηνικά, με σκοπό να μαζέψει πολλές φωτιές, αλλά
// πάλι με λέξεις, αλλά να είναι πιο challenging».
//
// ΠΟΤΕ ανοίγει: όταν κλείσει η δεκαπεντάδα της μέρας, ΜΙΑ φορά τη μέρα
// (daily.bonusOpen). Είναι η ανταμοιβή της δουλειάς της μέρας — όχι τρόπος
// να την παρακάμψει. Στον τίτλο η πύλη (τόρι) ανάβει.
//
// ΤΙ είναι: 75 δευτερόλεπτα, χωρίς εχθρούς — ο αντίπαλος είναι ο χρόνος.
//   - λέξεις με κενό, όπως στη μάχη (ίδιο Learning Engine, πραγματική ανάκληση)
//   - ΦΟΡΤΙΣΗ ×1 → ×5: κάθε σωστό την ανεβάζει, κάθε λάθος τη μηδενίζει
//     (αν η μπάρα κάτω από τη λέξη άδειασε πριν απαντήσει, το σωστό δεν φορτίζει)
//   - από ×3 και πάνω οι φούσκες ΚΙΝΟΥΝΤΑΙ — πιο δύσκολο να τις πετύχεις
//   - στο ×5: «Φλογοβροχή!» — φωτιές πέφτουν από ψηλά, τις πιάνει με άγγιγμα·
//     μετά η φόρτιση ξαναρχίζει από ×1
// Ο1 (19/09): «δίνει πιο λίγα points γιατί μαζεύει υπερβολικά πολλά… να παίρνει
// πόντους μόνο από τη φλογοβολή… μέχρι να γίνει ×5 να μην του δίνεις πόντους
// αλλά να τους μαζεύει με το δάχτυλο». Η σωστή λέξη ΔΕΝ δίνει φωτιές — μόνο
// φορτίζει. Φωτιές δίνει μόνο η βροχή, 1 η καθεμία (η Στολή της Φωτιάς: πότε πότε 2).
// Το λάθος κοστίζει μόνο τη φόρτιση. Λάθος πλήρης
// μορφή λέξης δεν σχηματίζεται ποτέ (ARCHITECTURE §8.1).

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import * as store from '../../shared/storage.js';
import * as engine from '../../learning/engine.js';
import * as world from '../world.js';
import * as journey from '../journey.js';
import * as shop from '../shop.js';

const W = 1280, H = 720;
const RUN_MS = 75000;
const FULL_MS = 1500, MIN_MS = 6000, K_MIN = .25;
const MULT_MAX = 5, RAIN_MS = 6500, RAIN_DROP_MS = 210;   // Ξ1: η βροχή κρατά περισσότερο · Ο1: πιο αραιή
const VIOLET = 0x7B4FD6, TEAL = 0x3FD6C8, PINK = 0xE0679E;

export default class BonusScene extends Phaser.Scene {
  constructor() { super('Bonus'); }

  create() {
    this.calm = world.isCalm();
    this.t = 0;
    this.over = false;
    this.busy = false;
    this.mult = 1;
    this.streak = 0;
    this.got = 0;
    this.orbs = [];
    this.rain = [];
    this.current = null;
    const st = store.loadState();
    this.who = store.activeProfile(st);
    this.gear = store.getShop(st);
    this.robeK = shop.robeFx(this.gear).bonus || 1;

    this.buildWorld();
    this.buildHud();
    this.buildHero();
    this.intro();
  }

  // ---------------------------------------------------------- η άλλη διάσταση
  buildWorld() {
    const sky = this.add.graphics();
    // ομαλή μετάβαση βιολετί → βαθύ τιρκουάζ (40 λωρίδες, δεν φαίνονται)
    const A = Phaser.Display.Color.ValueToColor(0x140A2E), Z = Phaser.Display.Color.ValueToColor(0x1D3F77);
    const M = Phaser.Display.Color.ValueToColor(0x331B6E);
    for (let i = 0; i < 40; i++) {
      const f = i / 39;
      const c = f < .6 ? Phaser.Display.Color.Interpolate.ColorWithColor(A, M, 100, f / .6 * 100)
        : Phaser.Display.Color.Interpolate.ColorWithColor(M, Z, 100, (f - .6) / .4 * 100);
      sky.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      sky.fillRect(0, i * H / 40, W, H / 40 + 1);
    }
    // ένας τεράστιος δακτύλιος-πύλη στο βάθος
    const ring = this.add.graphics({ x: W / 2, y: 330 });
    for (let i = 0; i < 5; i++) {
      ring.lineStyle(10 - i * 1.5, [VIOLET, TEAL, PINK, VIOLET, TEAL][i], .18 + i * .05);
      ring.strokeEllipse(0, 0, 820 - i * 90, 560 - i * 70);
    }
    if (!this.calm) this.tweens.add({ targets: ring, angle: 360, duration: 60000, repeat: -1 });
    // αστέρια που ανεβαίνουν αντί να πέφτουν — εδώ όλα είναι ανάποδα
    for (let i = 0; i < 70; i++) {
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'spark')
        .setScale(Phaser.Math.FloatBetween(.15, .45)).setAlpha(Phaser.Math.FloatBetween(.3, .9))
        .setTint(Phaser.Utils.Array.GetRandom([TEAL, PINK, 0xFFFFFF])).setBlendMode(Phaser.BlendModes.ADD);
      if (!this.calm) {
        this.tweens.add({ targets: s, y: s.y - Phaser.Math.Between(80, 260), alpha: 0,
          duration: Phaser.Math.Between(3000, 7000), repeat: -1, delay: Phaser.Math.Between(0, 4000),
          onRepeat: () => { s.y = Phaser.Math.Between(200, H); s.setAlpha(.8); } });
      }
    }
    // αιωρούμενα νησιά
    const island = (x, y, w, c) => {
      const g = this.add.graphics({ x, y });
      g.fillStyle(c, 1);
      g.fillEllipse(0, 0, w, w * .22);
      g.fillPoints([new Phaser.Geom.Point(-w * .45, 0), new Phaser.Geom.Point(w * .45, 0),
        new Phaser.Geom.Point(w * .12, w * .42), new Phaser.Geom.Point(-w * .1, w * .5)], true);
      g.fillStyle(TEAL, .5);
      g.fillEllipse(0, -w * .04, w * .9, w * .1);
      if (!this.calm) this.tweens.add({ targets: g, y: y - 12, duration: Phaser.Math.Between(2600, 3800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return g;
    };
    island(1040, 520, 170, 0x241448);
    island(1180, 300, 90, 0x2A1756);
    island(90, 360, 110, 0x2A1756);
    this.heroIsland = island(210, 640, 260, 0x1A0F38);
  }

  buildHero() {
    const P = (x, y) => new Phaser.Geom.Point(x, y);
    const g = this.add.graphics();
    g.fillStyle(NUM.dojoRoof, 1);
    g.fillRect(-19, -14, 15, 14); g.fillRect(6, -14, 15, 14);
    g.fillRoundedRect(-26, -74, 52, 62, 15);
    g.fillCircle(0, -92, 27);
    const robe = this.add.graphics();
    world.drawRobe(robe, shop.currentRobe(this.gear));
    const eyes = this.add.graphics();
    eyes.fillStyle(NUM.parchment, .95); eyes.fillRoundedRect(-17, -99, 34, 8, 4);
    const b = journey.beltOf(this.who);
    const belt = this.add.graphics();
    const edge = journey.beltEdge(b);
    if (edge) { belt.fillStyle(edge, 1); belt.fillRect(-27, -41.5, 54, 11); }
    belt.fillStyle(journey.beltColor(b), 1);
    belt.fillRect(-26, -40, 52, 8);
    belt.fillPoints([P(16, -34), P(28, -18), P(22, -16), P(11, -32)], true);
    const rim = this.add.graphics();
    rim.lineStyle(3, TEAL, .5); rim.beginPath(); rim.arc(0, -92, 26, -1.2, .9, false); rim.strokePath();
    this.hero = this.add.container(210, 612, [g, robe, rim, eyes, belt]).setScale(1.2).setDepth(12);
    if (!this.calm) this.tweens.add({ targets: this.hero, y: 600, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.hand = this.add.image(262, 520, 'glow-spirit').setScale(.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(13);
  }

  buildHud() {
    // Ο χρόνος της πύλης: μακριά μπάρα πάνω-πάνω
    this.runG = this.add.graphics().setDepth(40);
    this.gotIcon = this.add.image(W - 150, 44, 'spark').setScale(1.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(40);
    this.gotText = this.add.text(W - 126, 44, '0', {
      fontFamily: FONT.ui, fontSize: '34px', fontStyle: '700', color: HEX.lantern
    }).setOrigin(0, .5).setDepth(40);
    this.multText = this.add.text(150, 190, '×1', {
      fontFamily: FONT.ui, fontSize: '54px', fontStyle: '700', color: '#3FD6C8'
    }).setOrigin(.5).setDepth(40);
    this.multText.setShadow(0, 0, '#7B4FD6', 18, false, true);
    this.slab = this.add.graphics().setDepth(19);
    this.slab.fillStyle(0x120A2A, .88);
    this.slab.fillRoundedRect(W / 2 - 330, 110, 660, 130, 26);
    this.slab.lineStyle(3, TEAL, .7);
    this.slab.strokeRoundedRect(W / 2 - 330, 110, 660, 130, 26);
    this.wordK = this.add.graphics().setDepth(23);
    this.wordParts = [];
  }

  intro() {
    this.busy = true;
    const t1 = this.add.text(W / 2, 300, TXT.bonusTitle, {
      fontFamily: FONT.ui, fontSize: '58px', fontStyle: '700', color: '#3FD6C8'
    }).setOrigin(.5).setDepth(50).setAlpha(0);
    t1.setShadow(0, 0, '#7B4FD6', 30, false, true);
    const t2 = this.add.text(W / 2, 372, TXT.bonusRules, {
      fontFamily: FONT.ui, fontSize: '24px', color: HEX.parchment, align: 'center', wordWrap: { width: 900 }
    }).setOrigin(.5).setDepth(50).setAlpha(0);
    audio.cast();
    this.tweens.add({ targets: t1, alpha: 1, scale: { from: .6, to: 1 }, duration: 600, ease: 'Back.easeOut', hold: 2200, yoyo: true });
    this.tweens.add({ targets: t2, alpha: 1, duration: 500, delay: 400, hold: 1800, yoyo: true,
      onComplete: () => { t1.destroy(); t2.destroy(); this.busy = false; this.nextWord(); } });
  }

  // ---------------------------------------------------------------- ρολόι
  update(time, delta) {
    if (this.over) return;
    const dt = Math.min(delta, 100);          // επιστροφή από άλλη εφαρμογή: όχι άλμα
    if (!this.busy || this.raining) this.t += dt;
    this.wordMs = (this.wordMs || 0) + (this.current && !this.busy ? dt : 0);
    this.drawRun();
    this.drawWordK();
    if (this.mult >= 3 && !this.calm) {        // από ×3 οι φούσκες κινούνται
      const amp = this.mult >= 5 ? 80 : this.mult >= 4 ? 55 : 32;
      this.orbs.forEach((o, i) => {
        if (!o.scene || !o.input || !o.input.enabled) return;
        o.x = o.getData('x0') + Math.sin(time * .0016 + i * 1.7) * amp;
      });
    }
    if (this.t >= RUN_MS) this.finish();
  }

  wordRewardK() {
    const t = this.wordMs || 0;
    if (t <= FULL_MS) return 1;
    return Math.max(K_MIN, 1 - (1 - K_MIN) * (t - FULL_MS) / (MIN_MS - FULL_MS));
  }

  drawRun() {
    const g = this.runG;
    const f = Math.max(0, 1 - this.t / RUN_MS);
    g.clear();
    g.fillStyle(0x120A2A, .9);
    g.fillRoundedRect(W / 2 - 330, 26, 660, 26, 13);
    g.fillStyle(f > .3 ? TEAL : PINK, 1);
    if (f > 0) g.fillRoundedRect(W / 2 - 326, 30, Math.max(18, 652 * f), 18, 9);
  }

  drawWordK() {
    const g = this.wordK;
    g.clear();
    if (!this.current || this.busy) return;
    const k = this.wordRewardK();
    const f = (k - K_MIN) / (1 - K_MIN);
    g.fillStyle(0x000000, .3);
    g.fillRoundedRect(W / 2 - 200, 218, 400, 8, 4);
    if (f > 0) { g.fillStyle(f > .5 ? NUM.lantern : NUM.flame, 1); g.fillRoundedRect(W / 2 - 200, 218, 400 * f, 8, 4); }
  }

  // ---------------------------------------------------------------- λέξεις
  nextWord() {
    if (this.over) return;
    this.clearOrbs();
    let ch = null;
    for (let i = 0; i < 8 && !ch; i++) {
      ch = engine.getNextChallenge(this.who.profile.id, { types: ['gap'], intro: 'never' });
      if (ch && ch.type !== 'gap') ch = null;
    }
    if (!ch) { this.finish(); return; }
    this.current = ch;
    this.reported = false;
    this.tries = 0;
    this.maxTries = ch.candidates.length >= 4 ? 2 : 1;
    this.wordMs = 0;
    this.layoutWord(ch);
    this.spawnOrbs(ch.candidates);
  }

  layoutWord(ch) {
    this.wordParts.forEach((o) => o.destroy());
    const style = { fontFamily: FONT.word, fontSize: '60px', color: '#F3EEFF' };
    const before = ch.text.slice(0, ch.gap.start), target = ch.text.substr(ch.gap.start, ch.gap.length);
    const after = ch.text.slice(ch.gap.start + ch.gap.length);
    const a = this.add.text(0, 0, before, style).setOrigin(0, .5).setDepth(22);
    const m = this.add.text(0, 0, target, { ...style, color: '#FFE08A' }).setOrigin(.5).setDepth(22).setAlpha(0);
    const b = this.add.text(0, 0, after, style).setOrigin(0, .5).setDepth(22);
    let gw = m.width;
    for (const c of ch.candidates) { const p = this.add.text(0, 0, c, style).setVisible(false); gw = Math.max(gw, p.width); p.destroy(); }
    let x = W / 2 - (a.width + gw + b.width) / 2;
    const y = 168;
    a.setPosition(x, y); x += a.width;
    m.setPosition(x + gw / 2, y);
    const line = this.add.graphics().setDepth(22);
    line.fillStyle(TEAL, 1); line.fillRoundedRect(x + 2, y + 32, Math.max(gw - 4, 18), 5, 2.5);
    x += gw; b.setPosition(x, y);
    this.gapText = m;
    this.wordParts = [a, m, b, line];
  }

  spawnOrbs(cands) {
    const n = cands.length, spread = Math.min(160, 700 / Math.max(n - 1, 1));
    const x0 = W / 2 - spread * (n - 1) / 2 + 40;
    cands.forEach((c, i) => {
      const x = x0 + i * spread, y = 380 + Math.sin(i * 1.3) * 26;
      const o = this.add.container(x, y).setDepth(25);
      const glow = this.add.image(0, 0, 'glow-spirit').setScale(.8).setAlpha(.7).setBlendMode(Phaser.BlendModes.ADD);
      const disc = this.add.circle(0, 0, 42, VIOLET);
      const inner = this.add.circle(0, -4, 29, TEAL).setAlpha(.85);
      const txt = this.add.text(0, 0, c, { fontFamily: FONT.word, fontSize: '42px', fontStyle: '700', color: '#140A2E' }).setOrigin(.5);
      o.add([glow, disc, inner, txt]);
      o.setData('g', c).setData('x0', x);
      o.setSize(100, 100).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.choose(o));
      o.setScale(0);
      this.tweens.add({ targets: o, scale: 1, duration: 260, delay: i * 60, ease: 'Back.easeOut' });
      this.orbs.push(o);
    });
  }

  clearOrbs() {
    this.orbs.forEach((o) => { if (o && o.scene) { this.tweens.killTweensOf(o); o.destroy(); } });
    this.orbs = [];
  }

  choose(o) {
    if (this.busy || this.over || !this.current) return;
    const ch = this.current;
    const got = o.getData('g');
    const right = got === ch.text.substr(ch.gap.start, ch.gap.length);
    if (!this.reported) {
      this.reported = true;
      engine.reportResult({
        challengeId: ch.challengeId, wordId: ch.wordId, targetId: ch.targetId,
        profileId: this.who.profile.id, type: ch.type, correct: right,
        chosenGrapheme: right ? null : got, revealUsed: !right, durationMs: Math.round(this.wordMs)
      });
    }
    if (right) this.hit(o);
    else this.miss(o);
  }

  hit(o) {
    this.busy = true;
    // Η σωστή λέξη ολόκληρη, ενωμένη (χωρίς το φάρδος της υποδοχής)
    this.wordParts.forEach((p) => p.destroy());
    const whole = this.add.text(W / 2, 168, this.current.text, { fontFamily: FONT.word, fontSize: '60px', color: '#FFE08A' })
      .setOrigin(.5).setDepth(22);
    whole.setShadow(0, 0, '#3FD6C8', 14, false, true);
    this.wordParts = [whole];
    this.orbs.forEach((x) => { if (x !== o && x.scene) { x.disableInteractive(); this.tweens.add({ targets: x, alpha: .2, duration: 160 }); } });
    this.tweens.add({ targets: o, scale: 1.3, alpha: 0, duration: 260, onComplete: () => o.destroy() });
    audio.chime(Math.min(this.mult - 1, 3));
    // η μπάρα κάτω από τη λέξη: αν άδειασε (αργή απάντηση) η λέξη δεν φορτίζει
    if (!this.tries && this.wordRewardK() > K_MIN) {
      this.mult = Math.min(MULT_MAX, this.mult + 1);
      this.streak += 1;
    }
    this.chargeFx(o);                       // Ο1: η λέξη φορτίζει, δεν πληρώνει
    this.showMult();
    const rain = !this.tries && this.mult >= MULT_MAX;
    this.time.delayedCall(650, () => {
      this.wordParts.forEach((p) => p.destroy()); this.wordParts = [];
      this.current = null;
      if (rain) this.fireRain(() => { this.mult = 1; this.showMult(); this.busy = false; this.nextWord(); });
      else { this.busy = false; this.nextWord(); }
    });
  }

  miss(o) {
    audio.fizzle();
    this.mult = 1;
    this.streak = 0;
    this.showMult();
    this.tries += 1;
    o.disableInteractive();
    this.tweens.add({ targets: o, alpha: .25, scale: .8, duration: 240 });
    this.cameras.main.shake(160, .004);
    if (this.tries >= this.maxTries) {
      this.busy = true;
      this.time.delayedCall(500, () => {
        this.wordParts.forEach((p) => p.destroy()); this.wordParts = [];
        this.current = null;
        this.busy = false;
        this.nextWord();
      });
    }
  }

  showMult() {
    this.multText.setText(`×${this.mult}`);
    this.tweens.add({ targets: this.multText, scale: 1.35, duration: 120, yoyo: true });
    this.multText.setColor(this.mult >= 5 ? '#FFE08A' : this.mult >= 3 ? '#E0679E' : '#3FD6C8');
  }

  // Ο1: η σωστή λέξη στέλνει σπίθες στον μετρητή φόρτισης (όχι στις φωτιές)
  chargeFx(o) {
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(o.x, o.y, 'spark').setScale(.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(45).setTint(TEAL);
      this.tweens.add({ targets: s, x: this.multText.x + Phaser.Math.Between(-20, 20), y: this.multText.y, scale: .3,
        duration: 420, delay: i * 45, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
    }
  }

  // Οι φωτιές πετούν ως τον μετρητή· κάθε μία γράφεται αμέσως (τίποτα δεν χάνεται)
  burst(x, y, n) {
    this.got += n;
    store.addSparks(store.loadState(), n);
    const shown = Math.min(n, 14);
    for (let i = 0; i < shown; i++) {
      const s = this.add.image(x, y, 'flame').setScale(.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(45);
      this.tweens.add({ targets: s, x: Phaser.Math.Between(x - 120, x + 120), y: y - Phaser.Math.Between(40, 140), duration: 260, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: s, x: this.gotIcon.x, y: this.gotIcon.y, scale: .08, duration: 420, delay: i * 40, ease: 'Quad.easeIn',
          onComplete: () => { s.destroy(); this.tweens.add({ targets: this.gotIcon, scale: 1.7, duration: 90, yoyo: true }); } }) });
    }
    this.time.delayedCall(700, () => this.gotText.setText(String(this.got)));
    const plus = this.add.text(x, y - 70, `+${n}`, { fontFamily: FONT.ui, fontSize: '36px', fontStyle: '700', color: '#FFE08A' })
      .setOrigin(.5).setDepth(46);
    this.tweens.add({ targets: plus, y: y - 130, alpha: 0, duration: 900, onComplete: () => plus.destroy() });
  }

  // Φλογοβροχή: φωτιές πέφτουν για λίγα δευτερόλεπτα, κάθε άγγιγμα = +1
  // (Ο1· με τη Στολή της Φωτιάς ×1,25 = κάθε τέταρτη περίπου +2)
  fireRain(done) {
    this.raining = true;
    this.clearOrbs();
    // Ξ1 (19/09): «να βγάζει την περγαμηνή από μπροστά για να πιάσει τη
    // φλογοβροχή» — η πλάκα της λέξης και η μπάρα της φεύγουν όσο βρέχει
    this.tweens.add({ targets: [this.slab, this.wordK, ...this.wordParts], alpha: 0, duration: 250 });
    audio.cast();
    const t = this.add.text(W / 2, 170, TXT.bonusRain, { fontFamily: FONT.ui, fontSize: '50px', fontStyle: '700', color: '#FFE08A' })
      .setOrigin(.5).setDepth(50);
    t.setShadow(0, 0, HEX.flame, 24, false, true);
    this.tweens.add({ targets: t, scale: 1.12, duration: 300, yoyo: true, repeat: 3 });
    this.tweens.add({ targets: t, alpha: 0, duration: 400, delay: 1600 });   // να μην κρύβει τις φωτιές
    const drop = () => {
      if (!this.raining) return;
      const f = this.add.container(Phaser.Math.Between(340, 1180), -40).setDepth(30);
      f.add([this.add.image(0, 0, 'glow-flame').setScale(.5).setAlpha(.7).setBlendMode(Phaser.BlendModes.ADD),
        this.add.image(0, 12, 'flame').setOrigin(.5, 1).setScale(.3)]);
      f.setSize(90, 110).setInteractive({ useHandCursor: true });
      f.on('pointerdown', () => {
        f.disableInteractive();
        this.tweens.killTweensOf(f);
        this.burst(f.x, f.y, 1 + (Math.random() < this.robeK - 1 ? 1 : 0));
        f.destroy();
      });
      this.tweens.add({ targets: f, y: H + 60, duration: Phaser.Math.Between(1700, 2600), ease: 'Quad.easeIn', onComplete: () => f.destroy() });
      this.rain.push(f);
    };
    const ev = this.time.addEvent({ delay: RAIN_DROP_MS, repeat: Math.floor(RAIN_MS / RAIN_DROP_MS), callback: drop });
    this.time.delayedCall(RAIN_MS + 400, () => {
      this.raining = false;
      ev.remove();
      t.destroy();
      this.tweens.add({ targets: [this.slab, this.wordK], alpha: 1, duration: 250 });
      done();
    });
  }

  // ---------------------------------------------------------------- τέλος
  finish() {
    if (this.over) return;
    this.over = true;
    this.clearOrbs();
    this.wordParts.forEach((p) => p.destroy());
    this.wordK.clear();
    const best = store.markBonusDone(store.loadState(), this.got);
    audio.cast();
    [0, 1, 2, 3].forEach((i) => this.time.delayedCall(i * 120, () => audio.chime(i)));
    this.add.rectangle(W / 2, H / 2, W, H, 0x0A0418).setAlpha(.8).setDepth(60);
    const c = this.add.container(W / 2, 330).setDepth(61);
    const g = this.add.graphics();
    g.fillStyle(0x1A0F38, .96); g.fillRoundedRect(-340, -170, 680, 340, 34);
    g.lineStyle(3, TEAL, .9); g.strokeRoundedRect(-340, -170, 680, 340, 34);
    const t1 = this.add.text(0, -110, TXT.bonusDone, { fontFamily: FONT.ui, fontSize: '32px', color: HEX.parchment }).setOrigin(.5);
    const t2 = this.add.text(0, -30, `${this.got}`, { fontFamily: FONT.ui, fontSize: '90px', fontStyle: '700', color: '#FFE08A' }).setOrigin(.5);
    t2.setShadow(0, 0, HEX.flame, 26, false, true);
    const ic = this.add.image(-t2.width / 2 - 50, -30, 'spark').setScale(2).setBlendMode(Phaser.BlendModes.ADD);
    const t3 = this.add.text(0, 50, this.got >= best ? TXT.bonusRecord : `${TXT.bonusBest}: ${best}`, {
      fontFamily: FONT.ui, fontSize: '24px', color: this.got >= best && this.got > 0 ? '#3FD6C8' : HEX.smoke
    }).setOrigin(.5);
    const btn = this.add.graphics();
    btn.fillStyle(VIOLET, 1); btn.fillRoundedRect(-170, 92, 340, 60, 30);
    btn.lineStyle(3, TEAL, 1); btn.strokeRoundedRect(-170, 92, 340, 60, 30);
    const bt = this.add.text(0, 122, TXT.bonusBack, { fontFamily: FONT.ui, fontSize: '24px', fontStyle: '700', color: '#F3EEFF' }).setOrigin(.5);
    c.add([g, t1, ic, t2, t3, btn, bt]);
    c.setScale(.7).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });
    this.add.zone(W / 2, 452, 340, 70).setDepth(62).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { audio.whoosh(); this.scene.start('Title'); });
  }
}
