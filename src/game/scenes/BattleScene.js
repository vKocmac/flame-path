// Η μάχη: η ορθογραφία ΕΙΝΑΙ το πολεμικό σύστημα, όχι διακοπή του.
//
// Αμετάβλητα που τηρεί αυτή η σκηνή (ARCHITECTURE §8):
//  1. Ποτέ δεν σχηματίζεται λάθος μορφή λέξης στην οθόνη. Η περγαμηνή
//     δείχνει το γράμμα ΜΟΝΟ όταν είναι το σωστό.
//  2. Νέος στόχος περνά πρώτα από την τελετή περγαμηνής (intro).
//  3. Λάθος = καπνός, προσωρινή επιτάχυνση του εχθρού, αμέσως δεύτερη
//     ευκαιρία. Ποτέ κόκκινο, ποτέ «ΛΑΘΟΣ», καμία απώλεια.
//  6. Ένα αποτέλεσμα ανά πρόκληση, από την ΠΡΩΤΗ προσπάθεια.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import * as store from '../../shared/storage.js';
import * as engine from '../../learning/engine.js';
import { buildTextures } from '../textures.js';
import { archetype, dragonStage, waveComposition, BOSS_EVERY } from '../enemies.js';
import * as world from '../world.js';

const { W, H } = world;
const LINE_Y = 640;          // η γραμμή του εδάφους όπου πατούν οι μορφές
const NINJA_X = 220;
// Και οι τρεις εχθροί πρέπει να χωρούν στην οθόνη (πλάτος 1280). Ο πίσω
// είναι ο δράκος, που πιάνει ~115px δεξιά από το κέντρο του: στο 1156
// φτάνει ως το 1271, μέσα στο κάδρο.
const SPAWN_X = 880;
const ENEMY_GAP = 124;
const RETREAT_X = NINJA_X + 190;
const SPARKS_PER_KILL = 3;

// Πίεση χρόνου (BRANCH-SCOPE §1). Οι εχθροί ΔΕΝ κάνουν βήμα στο λάθος:
// πλησιάζουν συνεχώς με βάση τον χρόνο. Η ταχύτητά τους ορίζεται ανά
// αρχέτυπο στο enemies.js· εδώ ζουν μόνο οι προσωρινές διαφοροποιήσεις.
const KNOCKBACK = 96;                          // σωστό → η γραμμή σπρώχνεται πίσω
const SLOW_FACTOR = .4, SLOW_MS = 400;         // σωστό → «ανασαίνει» το παιδί
const HASTE_FACTOR = 1.6, HASTE_MS = 800;      // λάθος → πραγματική συνέπεια

// Shadow Focus (BRANCH-SCOPE §8): το φρένο. Όταν ο εχθρός είναι κοντά ΚΑΙ η
// λέξη είναι νέα ή δύσκολη, η πίεση παγώνει για λίγο. Χωρίς αυτό, ο δράκος
// μαθαίνει στο παιδί να μαντεύει γρήγορα αντί να σκέφτεται.
const FOCUS_DIST = 190;      // πόσο κοντά πρέπει να φτάσει για να ενεργοποιηθεί
const FOCUS_MS = 1800;

const COMBO_BRIGHT = 3, COMBO_TRAIL = 6, COMBO_ZOOM = 9;

// Ελάχιστο ορατό μέγεθος φούσκας (HYPER-NOTE §16.7). Το FIT σε 1280×720
// συρρικνώνει τα πάντα σε κινητό (×0,52): οι 96px της φούσκας γίνονται 50
// πραγματικά pixels — κάτω από το όριο των 56 του DESIGN. Οι φούσκες
// μεγαλώνουν αναλογικά ώστε και το δάχτυλο να τις βρίσκει και το γράφημα
// να διαβάζεται. Σε tablet και desktop ο συντελεστής είναι 1 (καμία αλλαγή).
const ORB_HIT = 96;
const MIN_ORB_CSS = 62;
const ORB_BOOST_MAX = 1.3;

/**
 * Σκουραίνει (f < 1) ή φωτίζει (f > 1) ένα χρώμα της παλέτας. Χρησιμεύει
 * για σκιές και φωτισμένες ακμές μέσα στο ίδιο σχήμα, ώστε οι μορφές να
 * έχουν όγκο και όχι να είναι επίπεδοι λεκέδες.
 * @param {number} hex
 * @param {number} f
 */
/**
 * Περίγραμμα γύρω από μια «ραχοκοκαλιά»: για κάθε σημείο βρίσκει την κάθετη
 * στη διαδρομή και βγάζει τα δύο χείλη. Έτσι ένα σχήμα λυγίζει σαν σώμα ή
 * σαν τρίχα, αντί να είναι κολλημένα κυκλάκια.
 * @param {{cx:number,cy:number,r:number}[]} pts
 */
function ribbonOutline(pts) {
  const n = pts.length;
  const up = [], lo = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, n - 1)];
    let tx = b.cx - a.cx, ty = b.cy - a.cy;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    up.push(new Phaser.Geom.Point(p.cx - ty * p.r, p.cy + tx * p.r));
    lo.push(new Phaser.Geom.Point(p.cx + ty * p.r, p.cy - tx * p.r));
  }
  return up.concat(lo.reverse());
}

function shade(hex, f) {
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((hex >> 16) & 255) * f);
  const g = cl(((hex >> 8) & 255) * f);
  const b = cl((hex & 255) * f);
  return (r << 16) | (g << 8) | b;
}

export default class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create() {
    buildTextures(this);
    this.calm = world.isCalm();
    this.busy = false;
    this.enemies = [];
    this.orbs = [];
    this.regroupShown = false;
    this.combo = 0;
    this.focusUntil = 0;
    this.focusedFor = null;
    this.hardTargets = new Set();   // νέοι ή λαθεμένοι στόχοι αυτής της session

    this.buildBackdrop();
    this.master = this.buildMaster();
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

  // ------------------------------------------------------------ Μάστερ Γου
  //
  // Ο κακός. Αιωρείται ψηλά, δεν πατάει ΠΟΤΕ στο χώμα και ΔΕΝ ΜΙΛΑΕΙ ΠΟΤΕ.
  // Αυτός κλέβει τα γράμματα από τις λέξεις — γι' αυτό η περγαμηνή έχει κενό.
  // Σε αυτό το branch είναι παρουσία, όχι στόχος: δεν χτυπιέται ακόμα.
  buildMaster() {
    const c = this.add.container(1108, 214).setDepth(10).setAlpha(.92);
    c.baseY = 214;

    const aura = this.add.image(0, 0, 'glow-moon')
      .setScale(1.9).setAlpha(.13).setTint(NUM.spirit)
      .setBlendMode(Phaser.BlendModes.ADD);
    c.add(aura);
    c.hpGlow = aura;        // στη μάχη η αύρα του σβήνει με κάθε χτύπημα
    c.auraBase = .13;
    c.fire = NUM.spirit;

    // Ο μανδύας: τρία κρεμαστά κομμάτια που ταλαντεύονται με καθυστέρηση
    c.robe = [];
    [[-30, 1], [0, 1.18], [28, .9]].forEach(([dx, sc], i) => {
      const g = this.add.graphics();
      g.fillStyle(NUM.shadow, .96);
      g.fillPoints([
        new Phaser.Geom.Point(-20 * sc, 0),
        new Phaser.Geom.Point(20 * sc, 0),
        new Phaser.Geom.Point(10 * sc, 96 * sc),
        new Phaser.Geom.Point(-14 * sc, 88 * sc)
      ], true);
      g.setPosition(dx, 6);
      c.add(g);
      c.robe.push(g);
    });

    // Ώμοι και κεφάλι με κουκούλα
    const bodyG = this.add.graphics();
    bodyG.fillStyle(NUM.shadow, 1);
    bodyG.fillRoundedRect(-40, -34, 80, 56, 16);
    bodyG.fillPoints([                                   // κουκούλα
      new Phaser.Geom.Point(-30, -34),
      new Phaser.Geom.Point(0, -92),
      new Phaser.Geom.Point(30, -34)
    ], true);
    bodyG.fillCircle(0, -50, 24);
    // Λίγες γραμμές για όγκο: φως στην ακμή της κουκούλας, ζώνη, χέρια
    bodyG.lineStyle(2.4, shade(NUM.nightHigh, 1.5), .55);
    bodyG.lineBetween(-27, -38, -2, -86);
    bodyG.lineStyle(2, shade(NUM.nightHigh, 1.2), .4);
    bodyG.lineBetween(2, -86, 27, -38);
    bodyG.fillStyle(shade(NUM.nightHigh, .8), .9);
    bodyG.fillRoundedRect(-40, -6, 80, 9, 4);              // ζώνη
    bodyG.fillStyle(NUM.night, 1);
    bodyG.fillEllipse(0, -50, 34, 30);                     // σκοτεινό πρόσωπο
    c.add(bodyG);

    // Δύο λεπτές σχισμές αντί για μάτια — τίποτα φιλικό
    const eyes = this.add.graphics();
    eyes.fillStyle(NUM.spirit, .95);
    eyes.fillRoundedRect(-17, -56, 13, 4, 2);
    eyes.fillRoundedRect(4, -56, 13, 4, 2);
    c.add(eyes);
    c.eyes = eyes;

    // Μακρύ μούσι ΚΑΙ μακριά μουστάκια σαολίν. Δεν είναι κυκλάκια στη σειρά:
    // κάθε τρίχα είναι μία συνεχής πλεξούδα που ξαναζωγραφίζεται σε κάθε
    // καρέ (animateMaster) και κυματίζει με καθυστέρηση από τη ρίζα προς την
    // άκρη — το σώμα κινείται πρώτο, οι τρίχες ακολουθούν.
    c.hairG = this.add.graphics();
    c.add(c.hairG);
    const strand = (pts) => pts.map(([x, y, r]) => ({ x, y, r, cx: x, cy: y }));
    c.strands = [
      strand([[-13, -44, 8], [-25, -35, 8], [-35, -18, 7], [-41, 3, 6],
              [-44, 26, 5], [-45, 48, 3.6], [-45, 66, 2]]),          // μουστάκι αριστερά
      strand([[13, -44, 8], [25, -35, 8], [35, -18, 7], [41, 3, 6],
              [44, 26, 5], [45, 48, 3.6], [45, 66, 2]]),             // μουστάκι δεξιά
      strand([[0, -32, 18], [0, -8, 16], [0, 16, 14], [1, 40, 12],
              [2, 62, 10], [3, 82, 7.5], [4, 100, 5], [5, 118, 2.6]]) // μούσι
    ];

    // Το χέρι που αρπάζει
    const arm = this.add.ellipse(-44, -6, 26, 16, NUM.shadow).setAlpha(.98);
    c.add(arm);
    c.arm = arm;
    return c;
  }

  // Η κλοπή: ο Μάστερ Γου ρουφάει το γράφημα από την περγαμηνή. Αυτό, και
  // όχι μια «άσκηση», είναι ο λόγος που λείπει το γράμμα.
  stealLetter(center) {
    const m = this.master;
    if (!m || !center) return;
    audio.poof();
    this.tweens.add({ targets: m.arm, x: -62, scaleX: 1.5, duration: 280,
      yoyo: true, hold: 320, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: m.eyes, alpha: .35, duration: 200, yoyo: true, repeat: 1 });

    for (let i = 0; i < 12; i++) {
      const w = this.add.image(center.x + Phaser.Math.Between(-14, 14), center.y, 'spark')
        .setScale(.7).setTint(NUM.smoke).setAlpha(.85).setDepth(24);
      this.tweens.add({
        targets: w, x: m.x - 40, y: m.y, scale: .2, alpha: 0,
        duration: 520 + i * 26, delay: i * 18, ease: 'Quad.easeIn',
        onComplete: () => w.destroy()
      });
    }
  }

  makeEnemy(x, archId = 'smoke', sizeScale = 1) {
    const arch = archetype(archId);
    const size = arch.size * sizeScale;
    const c = this.add.container(x, LINE_Y).setDepth(11);

    // Η κατάσταση μάχης ζει πάνω στο container ώστε το update() να μη
    // χρειάζεται παράλληλο πίνακα.
    c.arch = arch;
    c.hp = arch.hp;
    c.maxHp = arch.hp;
    c.speed = arch.speed;
    c.mult = 1;        // τρέχων πολλαπλασιαστής ταχύτητας
    c.multMs = 0;      // πόσα ms του απομένουν πριν επιστρέψει στο 1
    c.size = size;

    if (arch.draw === 'dragon') this.drawDragon(c, size);
    else this.drawSmoke(c, size);
    return c;
  }

  drawSmoke(c, size) {
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
  }

  // Ο δράκος. Χτισμένος σε ΤΜΗΜΑΤΑ που κυματίζουν με καθυστέρηση το ένα από
  // το άλλο (animateEnemies) — έτσι διαβάζεται φιδίσιος και όχι σαν σακούλα
  // που αναπνέει. Το χρώμα του αλλάζει ανά στάδιο και η φλόγα του παίρνει
  // το ίδιο χρώμα.
  drawDragon(c, size) {
    const st = dragonStage(this.wave || 1);
    const body = NUM[st.body];
    c.fire = NUM[st.fire];
    c.stageName = st.name;

    const glow = this.add.image(0, -74 * size, 'glow-moon')
      .setScale(1.7 * size).setAlpha(.20).setTint(body)
      .setBlendMode(Phaser.BlendModes.ADD);
    c.add(glow);
    c.hpGlow = glow;

    c.bodyColor = body;
    c.darkColor = shade(body, .5);     // σκιά κοιλιάς & εσωτερικές γραμμές
    c.lightColor = shade(body, 1.45);  // φωτισμένη ράχη

    // Φτερά πίσω από το σώμα, με νευρώσεις μέσα στη μεμβράνη ώστε να μην
    // είναι σκέτος λεκές.
    const wing = (dir, sc, alpha) => {
      const g = this.add.graphics();
      const pts = [
        [0, 0], [26 * dir, -104], [86 * dir, -96], [74 * dir, -34], [40 * dir, -4]
      ].map(([px, py]) => new Phaser.Geom.Point(px * size, py * size));
      g.fillStyle(body, alpha);
      g.fillPoints(pts, true);
      g.lineStyle(1.8 * size, c.darkColor, alpha + .25);
      for (const [ex, ey] of [[26, -104], [86, -96], [74, -34]]) {   // νευρώσεις
        g.lineBetween(6 * dir * size, -6 * size, ex * dir * size, ey * size);
      }
      g.lineStyle(2 * size, c.lightColor, alpha * .8);
      g.strokePoints(pts, true);
      g.setPosition(0, -112 * size);
      g.setScale(sc);
      c.add(g);
      if (!this.calm) {
        this.tweens.add({
          targets: g, scaleY: sc * .45, duration: 760,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
      return g;
    };
    c.wings = [wing(1, 1, .5), wing(-1, .8, .3)];

    // Πόδια — για να πατάει στη γραμμή του εδάφους, με νύχια
    const legs = this.add.graphics();
    legs.fillStyle(c.darkColor, 1);
    legs.fillRoundedRect(-34 * size, -56 * size, 26 * size, 56 * size, 9 * size);
    legs.fillRoundedRect(26 * size, -52 * size, 26 * size, 52 * size, 9 * size);
    legs.fillStyle(NUM.parchment, .8);
    for (const lx of [-34, -25, -16, 26, 35, 44]) {
      legs.fillTriangle(lx * size, 0, (lx + 8) * size, 0, (lx + 4) * size, 7 * size);
    }
    c.add(legs);

    // ---- Το σώμα: ΜΙΑ συνεχής σιλουέτα γύρω από ραχοκοκαλιά ----
    // Δεν είναι ενωμένες ελλείψεις. Ορίζουμε τη ραχοκοκαλιά (θέση + πάχος)
    // και σε κάθε καρέ ξαναχτίζουμε το περίγραμμα γύρω της (redrawDragon).
    // Έτσι η κίνηση είναι πραγματικά φιδίσια και το σώμα ενιαίο.
    c.bodyG = this.add.graphics();
    c.add(c.bodyG);
    c.spine = [
      { x: 128, y: -26, r: 3,  amp: 14 },   // άκρη ουράς
      { x: 106, y: -38, r: 9,  amp: 12 },
      { x: 84,  y: -50, r: 17, amp: 10 },
      { x: 58,  y: -62, r: 26, amp: 7.5 },
      { x: 28,  y: -72, r: 34, amp: 5 },
      { x: -4,  y: -80, r: 38, amp: 3.5 },  // κορμός
      { x: -32, y: -94, r: 31, amp: 3 },
      { x: -48, y: -126, r: 23, amp: 2.6 }, // λαιμός
      { x: -58, y: -162, r: 18, amp: 2.2 },
      { x: -70, y: -196, r: 15, amp: 2 }
    ].map((p) => ({ x: p.x * size, y: p.y * size, r: p.r * size, amp: p.amp * size, cy: p.y * size }));

    // Το κεφάλι — ξεχωριστό, ώστε να ανασηκώνεται πριν βγάλει φωτιά.
    const head = this.add.container(-84 * size, -218 * size);
    const P = (px, py) => new Phaser.Geom.Point(px * size, py * size);
    const hg = this.add.graphics();

    hg.fillStyle(body, 1);
    hg.fillEllipse(0, 0, 68 * size, 48 * size);            // κρανίο
    hg.fillPoints([P(-24, -10), P(-78, 12), P(-22, 26)], true);   // μουσούδα
    hg.fillStyle(c.darkColor, 1);
    hg.fillPoints([P(-26, 15), P(-60, 29), P(-14, 29)], true);    // σαγόνι στη σκιά
    hg.fillStyle(body, 1);
    hg.fillPoints([P(10, -12), P(48, -46), P(24, -6)], true);     // κέρατα
    hg.fillPoints([P(4, -14), P(24, -48), P(16, -10)], true);
    hg.fillStyle(NUM.parchment, .85);                             // δόντια
    hg.fillTriangle(-52 * size, 14 * size, -44 * size, 14 * size, -48 * size, 23 * size);
    hg.fillTriangle(-40 * size, 15 * size, -32 * size, 15 * size, -36 * size, 24 * size);
    // Γραμμές στο κρανίο: φρύδι και ρουθούνι — λίγες, καθαρές
    hg.lineStyle(2.2 * size, c.darkColor, .75);
    hg.lineBetween(-30 * size, -12 * size, 6 * size, -18 * size);
    hg.lineBetween(-30 * size, 6 * size, -12 * size, 4 * size);
    hg.fillStyle(c.darkColor, .9);
    hg.fillCircle(-62 * size, 8 * size, 3.4 * size);              // ρουθούνι
    hg.lineStyle(2 * size, c.lightColor, .5);                     // φως στη ράχη του κρανίου
    hg.lineBetween(-16 * size, -20 * size, 20 * size, -14 * size);

    const eyeGlow = this.add.image(-14 * size, -4 * size, 'glow-flame')
      .setScale(.34 * size).setAlpha(.9).setTint(c.fire)
      .setBlendMode(Phaser.BlendModes.ADD);
    const eye = this.add.circle(-14 * size, -4 * size, 5 * size, c.fire);
    head.add([hg, eyeGlow, eye]);
    head.baseX = -84 * size;
    head.baseY = -218 * size;
    c.add(head);
    c.head = head;

    // Πότε θα βγάλει την πρώτη προειδοποιητική φλόγα
    c.nextBreathAt = this.time.now + Phaser.Math.Between(2600, 5200);
  }

  spawnWave() {
    this.wave = (this.wave || 0) + 1;
    // Όταν τελειώσουν οι ορδές που στέλνει, κατεβαίνει ο ίδιος.
    if (this.wave % BOSS_EVERY === 0) { this.summonMaster(); return; }
    const comp = waveComposition(this.wave);
    comp.forEach((archId, i) => {
      const e = this.makeEnemy(SPAWN_X + i * ENEMY_GAP, archId, 1.22 - i * .05);
      e.setAlpha(0);
      this.tweens.add({ targets: e, alpha: 1, duration: 500, delay: i * 160 });
      this.enemies.push(e);
    });
  }

  frontEnemy() { return this.enemies[0] || null; }

  // Ο Μάστερ Γου κατεβαίνει ο ίδιος στο πεδίο. Δεν περπατά και δεν πατάει
  // χώμα: χάνεται από τη θέση του και ξαναεμφανίζεται μέσα σε καπνό. Πέντε
  // σωστές απαντήσεις για να διωχτεί — και δεν λέει ούτε λέξη.
  summonMaster() {
    const m = this.master;
    const arch = archetype('master');
    m.arch = arch;
    m.hp = arch.hp;
    m.maxHp = arch.hp;
    m.speed = arch.speed;
    m.mult = 1;
    m.multMs = 0;
    m.size = 1;
    m.isMaster = true;
    audio.poof();
    this.smokePuff(m.x, m.y, 24);

    this.tweens.add({
      targets: m, alpha: 0, duration: 260, ease: 'Quad.easeIn',
      onComplete: () => {
        // Χαμηλά αρκετά ώστε το κεφάλι του να μη μπλέκεται με τη σειρά των
        // φουσκών, αλλά αιωρούμενος: το μούσι φτάνει ως το χώμα, τα πόδια όχι.
        m.setX(SPAWN_X + 40).setDepth(11).setScale(1.3);
        m.baseY = LINE_Y - 165;
        m.setY(m.baseY);
        audio.poof();
        this.smokePuff(m.x, m.y, 34);
        this.cameras.main.shake(240, .004);
        this.tweens.add({ targets: m, alpha: 1, duration: 320 });
        this.tweens.add({ targets: m.hpGlow, alpha: .34, duration: 400 });
      }
    });
    this.enemies.push(m);
  }

  // Διώχτηκε: επιστρέφει στο ψηλό του πόστο και ξαναρχίζει να στέλνει ορδές.
  banishMaster(m) {
    m.isMaster = false;
    audio.poof();
    this.smokePuff(m.x, m.y, 40);
    this.tweens.add({
      targets: m, alpha: 0, scale: 1.7, duration: 380, ease: 'Quad.easeOut',
      onComplete: () => {
        m.setX(1108).setDepth(10).setScale(1);
        m.baseY = 214;
        m.setY(214);
        m.hpGlow.setAlpha(m.auraBase);
        this.tweens.add({ targets: m, alpha: .92, duration: 460, delay: 500 });
      }
    });
  }

  smokePuff(x, y, n) {
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 210 }, scale: { start: 1.6, end: 0 },
      alpha: { start: .6, end: 0 }, lifespan: 850, tint: NUM.smoke, emitting: false
    }).setDepth(16);
    p.explode(n);
    this.time.delayedCall(1300, () => p.destroy());
  }

  // Προσωρινή αλλαγή ρυθμού σε ΟΛΗ τη γραμμή — κρατά τον σχηματισμό.
  pace(factor, ms) {
    this.enemies.forEach((e) => { e.mult = factor; e.multMs = ms; });
  }

  update(time, delta) {
    // Η ζωή της σκηνής τρέχει ΠΑΝΤΑ — και στα animation και στην τελετή.
    // Τίποτα δεν επιτρέπεται να μοιάζει με ακίνητη ζωγραφιά.
    this.animateEnemies(time);
    this.animateNinja(time);
    this.animateMaster(time);

    // Η πίεση του χρόνου, αντίθετα, τρέχει ΜΟΝΟ όσο το παιδί μπορεί
    // πραγματικά να απαντήσει — αλλιώς του κλέβεται χρόνος.
    if (this.busy || !this.current || !this.enemies.length) return;
    if (this.checkShadowFocus(time)) return;

    const dt = delta / 1000;
    for (const e of this.enemies) {
      if (e.multMs > 0) {
        e.multMs -= delta;
        if (e.multMs <= 0) { e.mult = 1; e.multMs = 0; }
      }
      e.x -= e.speed * e.mult * dt;
    }
    if (this.enemies[0].x <= RETREAT_X) this.regroup();
  }

  // Shadow Focus — προστατευτικό, όχι «εύκολο». Παγώνει την πίεση όταν ο
  // εχθρός είναι κοντά ΚΑΙ η λέξη είναι νέα ή δύσκολη. Μία φορά ανά
  // πρόκληση: δεν είναι ασπίδα, είναι ανάσα.
  checkShadowFocus(time) {
    if (time < this.focusUntil) return true;
    const ch = this.current;
    if (!ch || this.focusedFor === ch.challengeId) return false;
    const front = this.enemies[0];
    if (!front || front.x - this.ninja.x > FOCUS_DIST) return false;
    // «Δύσκολη» την κρίνει η ΣΚΗΝΗ από όσα είδε η ίδια σήμερα — δεν ρωτάμε
    // το Learning Engine, γιατί το συμβόλαιο των δύο κλήσεων δεν αγγίζεται.
    if (!this.hardTargets.has(ch.targetId)) return false;

    this.focusedFor = ch.challengeId;
    this.focusUntil = time + FOCUS_MS;
    if (!this.focusVeil) {
      this.focusVeil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow)
        .setDepth(18).setAlpha(0);
    }
    this.tweens.add({
      targets: this.focusVeil, alpha: .34, duration: 260,
      yoyo: true, hold: FOCUS_MS - 520, ease: 'Quad.easeOut'
    });
    return true;
  }

  // ------------------------------------------------------- η ζωή της σκηνής

  animateEnemies(time) {
    for (const e of this.enemies) {
      if (!e.spine) continue;
      this.redrawDragon(e, time);
      if (e.head && !e.breathing) {
        const n = e.spine.length;
        e.head.y = e.head.baseY + Math.sin(time * .0034 + n * .58) * 5 * e.size;
        e.head.x = e.head.baseX + Math.sin(time * .0027 + n * .42) * 3 * e.size;
      }
      if (e.nextBreathAt && time > e.nextBreathAt) this.dragonBreath(e, time);
    }
  }

  // Ξαναχτίζει το σώμα του δράκου γύρω από τη ραχοκοκαλιά του, ένα καρέ τη
  // φορά. Το κύμα ταξιδεύει από την ουρά προς τον λαιμό. Το περίγραμμα
  // υπολογίζεται κάθετα στη ραχοκοκαλιά, οπότε το σώμα είναι ΕΝΙΑΙΟ και
  // λυγίζει σαν φίδι — δεν είναι ελλείψεις κολλημένες μεταξύ τους.
  redrawDragon(e, time) {
    const sp = e.spine;
    const g = e.bodyG;
    const S = e.size;
    const n = sp.length;

    for (let i = 0; i < n; i++) {
      sp[i].cy = sp[i].y + Math.sin(time * .0032 + i * .62) * sp[i].amp;
    }

    // Περίγραμμα: πάνω ακμή από την ουρά στον λαιμό, κάτω ακμή ανάποδα
    const up = [], lo = [], inner = [];
    for (let i = 0; i < n; i++) {
      const p = sp[i];
      const a = sp[Math.max(i - 1, 0)];
      const b = sp[Math.min(i + 1, n - 1)];
      let tx = b.x - a.x, ty = b.cy - a.cy;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;
      const nx = -ty, ny = tx;
      up.push(new Phaser.Geom.Point(p.x + nx * p.r, p.cy + ny * p.r));
      lo.push(new Phaser.Geom.Point(p.x - nx * p.r, p.cy - ny * p.r));
      inner.push(new Phaser.Geom.Point(p.x - nx * p.r * .34, p.cy - ny * p.r * .34));
      p.nx = nx; p.ny = ny;
    }

    g.clear();

    // 1. Το σώμα, ένα ενιαίο σχήμα
    g.fillStyle(e.bodyColor, 1);
    g.fillPoints(up.concat(lo.slice().reverse()), true);

    // 2. Σκιά στην κοιλιά — δίνει όγκο χωρίς gradient
    g.fillStyle(e.darkColor, .55);
    g.fillPoints(lo.concat(inner.slice().reverse()), true);

    // 3. Φως στη ράχη
    g.lineStyle(2.6 * S, e.lightColor, .5);
    g.strokePoints(up, false);

    // 4. Λίγες πλάκες στην κοιλιά — μετρημένες, όχι μοτίβο
    g.lineStyle(1.9 * S, e.darkColor, .55);
    for (let i = 2; i < n - 2; i++) {
      const p = sp[i];
      g.lineBetween(
        p.x - p.nx * p.r * .92, p.cy - p.ny * p.r * .92,
        p.x - p.nx * p.r * .30, p.cy - p.ny * p.r * .30
      );
    }

    // 5. Αγκάθια στη ράχη — κάθετα στη ραχοκοκαλιά, άρα λυγίζουν μαζί της
    g.fillStyle(e.darkColor, 1);
    for (let i = 1; i < n - 1; i++) {
      const p = sp[i];
      const h = (8 + p.r * .42);
      const bx = p.x + p.nx * p.r, by = p.cy + p.ny * p.r;
      g.fillTriangle(
        bx - p.ny * 7 * S, by + p.nx * 7 * S,
        bx + p.nx * h, by + p.ny * h,
        bx + p.ny * 7 * S, by - p.nx * 7 * S
      );
    }

    // 6. Μυτερή άκρη ουράς
    const t0 = sp[0], t1 = sp[1];
    g.fillStyle(e.bodyColor, 1);
    g.fillTriangle(
      t0.x + (t0.x - t1.x) * .55, t0.cy + (t0.cy - t1.cy) * .55,
      t1.x + t1.nx * t1.r * .8, t1.cy + t1.ny * t1.r * .8,
      t1.x - t1.nx * t1.r * .8, t1.cy - t1.ny * t1.r * .8
    );
  }

  // Προειδοποίηση πριν επιτεθεί: ανασηκώνει το κεφάλι και βγάζει φωτιά.
  dragonBreath(e, time) {
    e.breathing = true;
    e.nextBreathAt = time + Phaser.Math.Between(4200, 7000);
    audio.roar();
    this.tweens.add({
      targets: e.head, y: e.head.baseY - 26 * e.size, angle: -12,
      duration: 260, ease: 'Quad.easeOut',
      onComplete: () => {
        const jet = this.add.particles(e.x + e.head.baseX - 54 * e.size,
          e.y + e.head.baseY + 8 * e.size, 'spark', {
          speed: { min: 90, max: 260 }, angle: { min: 160, max: 200 },
          scale: { start: .9, end: 0 }, alpha: { start: .95, end: 0 },
          lifespan: { min: 320, max: 620 }, blendMode: 'ADD',
          tint: [e.fire, NUM.flame], emitting: false
        }).setDepth(12);
        jet.explode(26);
        this.time.delayedCall(900, () => jet.destroy());
        this.tweens.add({
          targets: e.head, y: e.head.baseY, angle: 0,
          duration: 420, ease: 'Quad.easeIn',
          onComplete: () => { e.breathing = false; }
        });
      }
    });
  }

  // Ο νίντζα ΔΕΝ είναι ζωγραφιά: αιωρείται, το σώμα ταλαντεύεται ελάχιστα
  // και η κορδέλα ακολουθεί με καθυστέρηση (secondary motion).
  animateNinja(time) {
    if (this.calm || !this.ninja || this.ninja.frozen) return;
    const n = this.ninja;
    n.y = LINE_Y + Math.sin(time * .0016) * 3.2;
    n.scaleY = 1.3 + Math.sin(time * .0016 + 1.1) * .012;
    n.angle = Math.sin(time * .0011) * 1.1;
    if (this.hand) {
      this.hand.y = n.y - 78 + Math.sin(time * .0016 + .5) * 3.2;
    }
  }

  // Ο Μάστερ Γου αιωρείται ψηλά. Το μούσι και ο μανδύας ακολουθούν το σώμα
  // με καθυστέρηση — αυτή η καθυστέρηση είναι που τον κάνει ζωντανό.
  animateMaster(time) {
    const m = this.master;
    if (!m || this.calm) return;
    m.y = m.baseY + Math.sin(time * .0009) * 12;
    m.angle = Math.sin(time * .0007) * 2.2;
    // Οι τρίχες: κάθε σημείο κυματίζει πιο πολύ όσο απομακρύνεται από τη ρίζα
    const g = m.hairG;
    g.clear();
    m.strands.forEach((pts, s) => {
      pts.forEach((p, i) => {
        p.cx = p.x + Math.sin(time * .0013 - i * .5 + s) * (1.2 + i * 1.5);
        p.cy = p.y + Math.sin(time * .0011 - i * .42 + s) * (.6 + i * .5);
      });
      const outline = ribbonOutline(pts);
      g.fillStyle(NUM.smoke, .95);
      g.fillPoints(outline, true);
      g.lineStyle(1.6, shade(NUM.smoke, .62), .8);          // μία γραμμή μέσα στην τρίχα
      g.strokePoints(pts.map((p) => new Phaser.Geom.Point(p.cx, p.cy)), false);
    });
    m.robe.forEach((r, i) => {
      r.angle = Math.sin(time * .001 - i * .7) * (3 + i * 2);
    });
  }

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

    // Η τελετή ΔΕΝ ζητά άγγιγμα στην περγαμηνή. Κλείνει μόνη της και οι
    // φούσκες βγαίνουν αμέσως μετά — το παιδί δεν πρέπει ποτέ να μείνει
    // να κοιτάζει μια οθόνη χωρίς επιλογές. Το άγγιγμα απλώς προσπερνά.
    let sealed = false;
    const seal = () => {
      if (sealed) return;
      sealed = true;
      audio.chime(2);
      this.sealBurst(center.x, center.y);
      this.hardTargets.add(ch.targetId);   // νέα λέξη = δικαιούται Shadow Focus
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
    };

    const zone = this.add.zone(center.x, center.y, Math.max(this.gapText.width + 40, 80), 110)
      .setOrigin(.5).setDepth(23).setInteractive({ useHandCursor: true });
    this.wordParts.push(zone);
    zone.once('pointerdown', seal);
    this.time.delayedCall(1700, seal);
  }

  showGap(ch) {
    this.busy = false;
    this.label.setAlpha(0);
    this.showScroll();
    const center = this.layoutWord(ch.text, ch.gap, { revealed: false });
    this.spawnOrbs(ch.candidates);
    // Ο Μάστερ Γου μόλις άρπαξε αυτό το γράμμα — να γιατί λείπει.
    this.time.delayedCall(120, () => this.stealLetter(center));
  }

  // Τα γραφήματα αιωρούνται ΕΠΙΤΟΠΟΥ (±6px): ζωντανή σκηνή, ακίνητος
  // στόχος για το παιδικό δάχτυλο (DESIGN, απόφαση 2).
  spawnOrbs(candidates) {
    const n = candidates.length;
    const boost = this.orbBoost();
    const spread = Math.min(150, 620 / Math.max(n - 1, 1));
    const startX = W / 2 - (spread * (n - 1)) / 2;
    candidates.forEach((cand, i) => {
      const x = startX + i * spread;
      // Πιο ψηλά από την κορυφή του δράκου (~392): οι φούσκες δεν πρέπει
      // ποτέ να μπερδεύονται με τη σιλουέτα του εχθρού.
      const y = 326 + Math.sin(i * 1.1) * 20;
      const orb = this.add.container(x, y).setDepth(25);
      const glow = this.add.image(0, 0, 'glow-flame').setScale(.72).setAlpha(.6)
        .setBlendMode(Phaser.BlendModes.ADD);
      const disc = this.add.circle(0, 0, 40, NUM.flame);
      const inner = this.add.circle(0, -4, 27, NUM.lantern).setAlpha(.85);
      const txt = this.add.text(0, 0, cand, {
        fontFamily: FONT.word, fontSize: '42px', fontStyle: '700', color: HEX.ink
      }).setOrigin(.5);
      // Η ζωγραφιά μπαίνει σε δικό της container ώστε ο συντελεστής μικρής
      // οθόνης να μην μπερδεύεται με τα tween κλίμακας της φούσκας.
      const art = this.add.container(0, 0, [glow, disc, inner, txt]).setScale(boost);
      orb.add(art);
      orb.setData('grapheme', cand);
      orb.setData('glow', glow);
      orb.setSize(ORB_HIT * boost, ORB_HIT * boost).setInteractive({ useHandCursor: true });
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

  // Πόσο πρέπει να μεγαλώσουν οι φούσκες σε αυτή τη συσκευή. Υπολογίζεται
  // σε κάθε νέα πρόκληση, οπότε η αλλαγή προσανατολισμού διορθώνεται μόνη
  // της στην επόμενη λέξη.
  orbBoost() {
    const shown = (this.scale.displaySize.width || W) / W;
    return Phaser.Math.Clamp(MIN_ORB_CSS / (ORB_HIT * shown), 1, ORB_BOOST_MAX);
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

    // Combo: μόνο ΠΡΟΣΘΕΤΕΙ. Όταν σπάει, σβήνει σιωπηλά — κανένας μετρητής,
    // κανένα «έχασες το combo», κανένας ήχος. Αλλιώς είναι τιμωρητικό UI
    // από την πίσω πόρτα (SPEC κεφ. 3).
    if (correct) this.combo += 1;
    else { this.combo = 0; this.hardTargets.add(ch.targetId); }

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

  // Βάρος στην επίθεση (BRANCH-SCOPE §5): ο νίντζα τραβιέται πίσω και η
  // φλόγα φουσκώνει στη χούφτα του για ~320ms πριν φύγει. Χωρίς αυτό το
  // μάζεμα, το χτύπημα δεν «βαραίνει» — απλώς συμβαίνει.
  chargeAndFire() {
    this.ninja.frozen = true;
    const bright = this.combo >= COMBO_BRIGHT;   // 3 σωστά: πιο φωτεινή φλόγα
    this.tweens.add({
      targets: this.ninja, x: NINJA_X - 18, angle: 8,
      duration: 320, ease: 'Quad.easeOut'
    });
    this.tweens.add({
      targets: this.hand, scale: bright ? 1.55 : 1.2, alpha: bright ? 1 : .9,
      duration: 320, ease: 'Quad.easeOut',
      onComplete: () => this.fireBolt()
    });
  }

  fireBolt() {
    this.tweens.add({
      targets: this.ninja, x: NINJA_X, angle: -11, duration: 140, ease: 'Back.easeOut',
      onComplete: () => {
        this.ninja.setAngle(0);
        this.ninja.frozen = false;
      }
    });
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

    // 6 σωστά στη σειρά: ίχνος σκιάς πίσω από την επίθεση
    let shadow = null;
    if (this.combo >= COMBO_TRAIL) {
      shadow = this.add.particles(0, 0, 'spark', {
        speed: { min: 4, max: 22 }, scale: { start: 1.5, end: 0 },
        alpha: { start: .4, end: 0 }, lifespan: 620,
        tint: NUM.shadow, follow: bolt
      }).setDepth(13);
      shadow.setFrequency(26, 1);
      shadow.start();
    }
    this.tweens.add({ targets: this.hand, alpha: 0, scale: .5, duration: 200 });

    this.tweens.add({
      targets: bolt, x: tx, scale: .62, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        bolt.destroy();
        trail.stop();
        if (shadow) { shadow.stop(); this.time.delayedCall(700, () => shadow.destroy()); }
        this.time.delayedCall(500, () => trail.destroy());
        // 9 σωστά στη σειρά: η κάμερα «σκύβει» για μισό δευτερόλεπτο
        if (this.combo >= COMBO_ZOOM) {
          this.cameras.main.zoomTo(1.035, 240, 'Quad.easeOut', true);
          this.time.delayedCall(500, () => this.cameras.main.zoomTo(1, 320, 'Quad.easeInOut', true));
        }
        this.hitFrontEnemy();
      }
    });
  }

  // Ένα σωστό χτύπημα. Οι ανθεκτικοί εχθροί (αρχέτυπα με hp > 1) δεν πέφτουν
  // με τη μία — τραντάζονται και μένουν όρθιοι.
  hitFrontEnemy() {
    const e = this.enemies[0];
    if (e) {
      e.hp -= 1;
      if (e.hp > 0) this.flinchEnemy(e);
      else { this.enemies.shift(); this.killEnemy(e); }
    }
    this.pushBackLine();

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

  // Κάθε νίκη σπρώχνει ΟΛΗ τη γραμμή πίσω (ποτέ πέρα από τη θέση εκκίνησής
  // της) και την επιβραδύνει για μια ανάσα.
  pushBackLine() {
    this.enemies.forEach((en, i) => {
      const cap = SPAWN_X + i * ENEMY_GAP;
      this.tweens.add({
        targets: en, x: Math.min(en.x + KNOCKBACK, cap),
        duration: 260, ease: 'Quad.easeOut'
      });
    });
    this.pace(SLOW_FACTOR, SLOW_MS);
  }

  // Χτυπήθηκε αλλά άντεξε: τράνταγμα και σπίθες, χωρίς θάνατο.
  // Η αντοχή που απομένει φαίνεται ως ΛΑΜΨΗ ΠΟΥ ΣΒΗΝΕΙ — ποτέ ως μπάρα ζωής.
  flinchEnemy(e) {
    this.tweens.add({
      targets: e, scaleX: e.scaleX * 1.12, scaleY: e.scaleY * .9,
      duration: 110, yoyo: true, ease: 'Quad.easeOut'
    });
    if (e.hpGlow) {
      const full = e.isMaster ? .34 : .20;
      this.tweens.add({
        targets: e.hpGlow, alpha: full * (e.hp / e.maxHp),
        duration: 400, ease: 'Quad.easeOut'
      });
    }
    if (e.head) {
      this.tweens.add({ targets: e.head, angle: 14, duration: 120, yoyo: true });
    }
    const hit = this.add.particles(e.x, e.y - 44, 'spark', {
      speed: { min: 40, max: 150 }, scale: { start: .6, end: 0 },
      alpha: { start: .9, end: 0 }, lifespan: { min: 260, max: 520 },
      blendMode: 'ADD', tint: [NUM.flameCore, e.fire || NUM.flame], emitting: false
    }).setDepth(15);
    hit.explode(16);
    this.time.delayedCall(800, () => hit.destroy());
  }

  killEnemy(e) {
    const burst = this.add.particles(e.x, e.y - 44, 'spark', {
      speed: { min: 60, max: 260 }, scale: { start: .8, end: 0 },
      alpha: { start: 1, end: 0 }, lifespan: { min: 420, max: 900 },
      blendMode: 'ADD', tint: [NUM.flameCore, NUM.lantern, NUM.flame],
      emitting: false
    }).setDepth(15);
    burst.explode(e.isMaster ? 60 : 34);
    this.time.delayedCall(1200, () => burst.destroy());
    this.collectSparks(e.x, e.y - 44);

    // Ο Μάστερ Γου δεν καταστρέφεται ποτέ — υποχωρεί στο πόστο του.
    if (e.isMaster) { this.banishMaster(e); return; }

    this.tweens.killTweensOf(e);
    this.tweens.add({ targets: e, alpha: 0, scaleX: 1.4, scaleY: .6, y: e.y - 20,
      duration: 480, ease: 'Quad.easeOut', onComplete: () => e.destroy() });
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
  // ο εχθρός απλώς επιταχύνει για λίγο και το σωστό γράφημα φωτίζεται.
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

    // Μικρή υποχώρηση του νίντζα + ελαφρύ camera pulse: συνέπεια που τη
    // νιώθεις, χωρίς ούτε ένα κόκκινο pixel.
    this.ninja.frozen = true;
    this.tweens.add({
      targets: this.ninja, x: NINJA_X - 26, duration: 150, yoyo: true,
      ease: 'Quad.easeOut', onComplete: () => { this.ninja.frozen = false; }
    });
    this.cameras.main.shake(170, .0024);

    if (this.enemies.length) audio.thud();
    this.pace(HASTE_FACTOR, HASTE_MS);
    this.time.delayedCall(400, () => this.revealCorrect());
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
  //
  // ΠΡΟΣΟΧΗ (BRANCH-SCOPE §1): η ανασύνταξη ΔΕΝ αποκαλύπτει το σωστό γράφημα.
  // Πλέον μπορεί να συμβεί σκέτα από τον χρόνο, χωρίς κανένα λάθος του παιδιού
  // — και η αργή σκέψη δεν είναι λάθος. Την αποκάλυψη την κάνει μόνο το
  // flameFails(), δηλαδή μόνο ύστερα από πραγματικό ορθογραφικό λάθος.
  // Καπνογόνο. Ο νίντζα ΔΕΝ τους διώχνει και δεν τους χτυπά — κρύβεται.
  // Για μισό δευτερόλεπτο η οθόνη δεν έχει καθόλου ήρωα· αυτό είναι όλο το
  // νόημα. Οι εχθροί προχωρούν στον άδειο καπνό, σταματούν και ψάχνουν.
  regroup() {
    this.busy = true;
    this.pace(1, 0);
    this.ninja.frozen = true;
    audio.poof();

    const smokeAt = (x, y, n, life) => {
      const p = this.add.particles(x, y, 'spark', {
        speed: { min: 30, max: 170 }, scale: { start: 1.5, end: 0 },
        alpha: { start: .6, end: 0 }, lifespan: life, tint: NUM.smoke, emitting: false
      }).setDepth(16);
      p.explode(n);
      this.time.delayedCall(life + 500, () => p.destroy());
      return p;
    };

    // 1. Χτυπά το χέρι στο έδαφος και τον καταπίνει ο καπνός
    smokeAt(this.ninja.x, LINE_Y - 30, 34, 900);
    this.tweens.add({
      targets: this.ninja, alpha: 0, scaleY: 1.0, y: LINE_Y + 10,
      duration: 200, ease: 'Quad.easeIn'
    });
    this.tweens.add({ targets: this.hand, alpha: 0, duration: 160 });

    // 2. Οι εχθροί μπαίνουν στον άδειο καπνό και μετά ψάχνουν δεξιά-αριστερά
    this.time.delayedCall(280, () => {
      this.enemies.forEach((e, i) => {
        this.tweens.add({
          targets: e, x: e.x - 46, duration: 320, delay: i * 60, ease: 'Quad.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: e, angle: 9, duration: 220, yoyo: true, repeat: 1,
              ease: 'Sine.easeInOut', onComplete: () => e.setAngle(0)
            });
          }
        });
      });
    });

    // 3. Ξεπροβάλλει σκυφτός μέσα από νέο καπνό και σηκώνεται αργά
    this.time.delayedCall(1100, () => {
      audio.poof();
      smokeAt(NINJA_X, LINE_Y - 26, 26, 800);
      this.ninja.setX(NINJA_X).setY(LINE_Y + 26).setScale(1.3, .74).setAlpha(0);
      this.tweens.add({ targets: this.ninja, alpha: 1, duration: 260 });
      this.tweens.add({
        targets: this.ninja, y: LINE_Y, scaleY: 1.3,
        duration: 520, delay: 120, ease: 'Back.easeOut',
        onComplete: () => { this.ninja.frozen = false; }
      });
      // η φλόγα ξανανάβει στη χούφτα
      this.tweens.add({ targets: this.hand, alpha: .9, scale: .8, duration: 300, delay: 320,
        yoyo: true, hold: 200 });
    });

    // 4. Τον έχασαν: γυρίζουν πίσω να ψάξουν από την αρχή
    this.time.delayedCall(1500, () => {
      this.enemies.forEach((e, i) => {
        this.tweens.add({ targets: e, x: SPAWN_X + i * ENEMY_GAP, duration: 620, ease: 'Quad.easeInOut' });
      });
    });

    if (!this.regroupShown) {
      this.regroupShown = true;
      const msg = this.add.text(W / 2, 300, TXT.regroup, {
        fontFamily: FONT.ui, fontSize: '24px', color: HEX.lantern
      }).setOrigin(.5).setDepth(30).setAlpha(0);
      this.tweens.add({ targets: msg, alpha: 1, duration: 300, delay: 1200, yoyo: true, hold: 1400,
        onComplete: () => msg.destroy() });
      this.time.delayedCall(3400, () => { this.busy = false; });
    } else {
      this.time.delayedCall(2200, () => { this.busy = false; });
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
    this.enemies.forEach((e) => {
      this.tweens.killTweensOf(e);
      if (e.isMaster) this.banishMaster(e); else e.destroy();
    });
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

    // Δύο ΑΝΕΞΑΡΤΗΤΟΙ διακόπτες ήχου (BRANCH-SCOPE §7): μουσική/ambience
    // αριστερά, εφέ δεξιά. Όχι ένα master mute που κλείνει τα πάντα.
    const toggleBtn = (x, makeIcon, isOn, flip) => {
      const icon = makeIcon(x);
      icon.setDepth(46).setInteractive({ useHandCursor: true });
      const bar = this.add.rectangle(x, 34, 28, 2, NUM.smoke)
        .setAngle(-40).setAlpha(isOn() ? 0 : .7).setDepth(47);
      const paint = () => {
        const on = isOn();
        bar.setAlpha(on ? 0 : .7);
        icon.setAlpha(on ? .6 : .3);
      };
      paint();
      icon.on('pointerdown', () => { flip(); paint(); });
    };

    toggleBtn(94,
      (x) => this.add.text(x, 34, '♪', {
        fontFamily: FONT.ui, fontSize: '26px', color: HEX.smoke
      }).setOrigin(.5),
      () => audio.musicOn, () => audio.toggleMusic());

    toggleBtn(142,
      (x) => this.add.image(x, 34, 'spark').setScale(1.15).setTint(NUM.smoke),
      () => audio.fxOn, () => audio.toggleFx());

    this.sparkIcon = this.add.image(W - 96, 36, 'spark')
      .setScale(1.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(46);
    this.sparkLabel = this.add.text(W - 70, 36, String(store.getSparks(store.loadState())), {
      fontFamily: FONT.ui, fontSize: '26px', fontStyle: '700', color: HEX.lantern
    }).setOrigin(0, .5).setDepth(46);
  }
}
