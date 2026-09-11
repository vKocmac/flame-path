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
import { archetype, dragonStage, waveComposition, waveSpeed, BOSS_EVERY } from '../enemies.js';
import * as journey from '../journey.js';
import { splitGraphemes } from '../../shared/graphemes.js';
import * as world from '../world.js';
import { PowerMethods } from '../powers.js';

const { W, H } = world;
const LINE_Y = world.LINE_Y;     // η γραμμή του εδάφους όπου πατούν οι μορφές (640)
const NINJA_X = world.NINJA_X;   // 220
// Ζ5: πιο κοντά από αυτό, η σωστή απάντηση είναι σπαθιά αντί για φωτιά.
// Οι εχθροί ξεκινούν ~660px μακριά και ανασυντάσσονται στα ~190: με 420 το
// σπαθί βγαίνει μόλις περάσουν τη μέση της οθόνης (με 330, στην αυτόματη
// δοκιμή δεν βγήκε σχεδόν ποτέ — απαντά γρήγορα και δεν πρόφταιναν να έρθουν).
const MELEE_DIST = 420;
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
const ERROR_STEP = 58;                         // λάθος → ορατό βήμα μπροστά
// Πόσες φορές μπορεί να πέσει έξω πριν του πάρουν τη λέξη. Με απεριόριστες
// προσπάθειες το παιδί απλώς πατούσε τις φούσκες μία-μία μέχρι να βρει —
// δηλαδή μάθαινε να μαντεύει, όχι να γράφει.
const MAX_TRIES = 2;
const WORDS_PER_LEVEL = 5;                     // πόσες λέξεις καίει ο πάπυρος

// Shadow Focus (BRANCH-SCOPE §8): το φρένο. Όταν ο εχθρός είναι κοντά ΚΑΙ η
// λέξη είναι νέα ή δύσκολη, η πίεση παγώνει για λίγο. Χωρίς αυτό, ο δράκος
// μαθαίνει στο παιδί να μαντεύει γρήγορα αντί να σκέφτεται.
const FOCUS_DIST = 190;      // πόσο κοντά πρέπει να φτάσει για να ενεργοποιηθεί
const FOCUS_MS = 1800;

const COMBO_BRIGHT = 3, COMBO_TRAIL = 6, COMBO_ZOOM = 9;

// Μπάρα δύναμης (HYPER-NOTE §8, §17.9): γεμίζει με τα σωστά — πιο γρήγορα
// με σερί 3+ — και πέφτει λίγο στο λάθος, ΚΑΙ όταν είναι γεμάτη (ιδιοκτήτης
// 11/09, Ζ2· ως τη v3.17 γεμάτη δεν ξάδειαζε). ~5 σωστά με σερί τη γεμίζουν.
const RAGE_MAX = 100, RAGE_HIT = 18, RAGE_COMBO = 26, RAGE_MISS = 12;
// Μεγάλη Τεχνική (Ζ3): «άσε μερικά δευτερόλεπτα να προσπαθεί… δώσ' του
// τουλάχιστον ένα hint». Πρώτη βοήθεια μετά από τόσο, μετά ξανά ανά τόσο.
const ASM_HINT_MS = 6000, ASM_HINT_EVERY = 3500;
const DAZE_MS = 4500;          // πόσο μένουν ακίνητοι από Ηφαίστειο (Κεραυνός: 60%)

// Δίχτυ ασφαλείας. Καμία σκηνή δεν κρατά νόμιμα το «απασχολημένη» πάνω από
// λίγα δευτερόλεπτα: το πιο αργό animation (ο πάπυρος) τελειώνει πολύ πριν.
// Αν το ξεπεράσει, κάτι έσπασε — και το παιδί βλέπει παγωμένη οθόνη χωρίς να
// ξέρει να κάνει ανανέωση. Ξεκολλάμε μόνοι μας.
const STUCK_MS = 9000;
const IDLE_MS = 20000;       // χωρίς πρόκληση και χωρίς «απασχολημένη» (δες update)
// Οι τρεις ζώνες της ΠΑΝΩ λωρίδας του HUD [x, y, πλάτος, ύψος] (δες buildRageBar).
// Χωρούν ανάμεσα στο ⏸ (αριστερά) και στις σπίθες (δεξιά), πάνω από τη
// λεζάντα της Μεγάλης Τεχνικής (y 70) και την περγαμηνή (από y ~88).
const HUD_POWER = [68, 6, 502, 48];
const HUD_WAVE = [580, 6, 202, 48];
const HUD_ROAD = [792, 6, 388, 48];

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

  // Το `busy` κρατά και τη στιγμή που μπήκε, ώστε το update() να μπορεί να
  // δει ότι κόλλησε. Έτσι δεν χρειάζεται να αλλάξει κανένα από τα ~20
  // σημεία που το θέτουν.
  //
  // ΠΡΟΣΟΧΗ στο ρολόι: μετράμε με το `sceneMs`, δηλαδή το ΑΘΡΟΙΣΜΑ των delta
  // που είδε η σκηνή — ΟΧΙ με τον χρόνο τοίχου. Τα tween και τα χρονόμετρα
  // του Phaser προχωρούν με delta· όταν η συσκευή χάνει καρέ (εναλλαγή
  // εφαρμογής, αργή στιγμή) ο χρόνος τοίχου τρέχει μπροστά και τα animation
  // μένουν πίσω. Με χρόνο τοίχου το δίχτυ ασφαλείας χτυπούσε ΜΕΣΑ στη σκηνή
  // του παπύρου και τη διέκοπτε.
  get busy() { return this._busy; }
  set busy(v) {
    this._busy = v;
    this._busySince = v ? (this.sceneMs || 0) : null;
  }

  create() {
    buildTextures(this);
    this.calm = world.isCalm();
    this.sceneMs = 0;          // χρόνος σκηνής σε delta — δες τον setter του busy
    this.busy = false;
    this.enemies = [];
    this.orbs = [];
    this.regroupShown = false;
    this.combo = 0;
    this.focusUntil = 0;
    this.focusedFor = null;
    this.hardTargets = new Set();   // νέοι ή λαθεμένοι στόχοι αυτής της session
    // Το Phaser ΞΑΝΑΧΡΗΣΙΜΟΠΟΙΕΙ το ίδιο αντικείμενο σκηνής σε κάθε νέα μάχη:
    // ό,τι δεν μηδενίζεται εδώ περνά από τη μία μάχη στην άλλη. Βρέθηκε 11/09:
    // με ‹ (πίσω) πάνω στη νίκη στο κάστρο, το stationWon έμενε σηκωμένο και ο
    // επόμενος Μάστερ Γου δεν έκλεινε ποτέ τον σταθμό (βρόχος χωρίς εχθρούς)·
    // και το wave συνέχιζε το μέτρημα, οπότε ο Μάστερ Γου μπορούσε να είναι
    // το ΠΡΩΤΟ κύμα της νέας μάχης.
    this.wave = 0;
    this.stationWon = false;
    this.hadChallenge = false;
    this._idleSince = null;
    this.asmWave = null;
    this.barPulse = null;
    this.glowPulse = null;
    this.auraPulse = null;
    // Φτιάχνονται «μία φορά» (if (!this.fog)) — από τη 2η μάχη έδειχναν σε
    // αντικείμενα ήδη καταστραμμένα: η ομίχλη της ανασύνταξης και το
    // σκοτείνιασμα του Shadow Focus απλώς δεν φαίνονταν πια.
    this.fog = null;
    this.focusVeil = null;
    this.userPaused = false;
    this.asmIdleMs = 0;
    this.asmHintAt = 0;
    this.asmHinted = false;
    this.nextAsmHurtAt = 0;
    this.nextSweepAt = 5000;
    this.hurlTurn = 0;
    // Παύση και μόνη της (Ζ1): το κινητό κλείδωσε ή το παιδί άλλαξε εφαρμογή
    // → στην επιστροφή βρίσκει την οθόνη παύσης, όχι εχθρούς στη μύτη του.
    const onHidden = () => this.pauseGame();
    this.game.events.on('hidden', onHidden);
    this.events.once('shutdown', () => this.game.events.off('hidden', onHidden));

    // Ο Δρόμος (NEXT-FIXES Ε3): σε ποιον σταθμό είμαστε — μόνιμο, ανά προφίλ.
    // Φορτώνεται ΠΡΙΝ τις μορφές: η ζώνη του νίντζα βάφεται από τον κύκλο.
    const state = store.loadState();
    this.profileId = state.activeProfileId;
    const jr = store.getJourney(state);
    this.station = jr.station;
    this.cycle = jr.cycle;
    this.rage = 0;              // η μπάρα δύναμης ζει μόνο μέσα στη μάχη
    this.rageReady = false;
    this.powerTurn = 0;
    // Οι τεχνικές που κέρδισαν οι ΚΑΤΑΚΤΗΜΕΝΕΣ λέξεις (BUILD_PLAN βήμα 6)
    this.perks = journey.unlockedPerks(journey.masteredCount(store.activeProfile(state)));
    this.newPerks = this.perks.filter((p) => !store.getPerksSeen(state).includes(p));
    // Η ζώνη δίνει κάτι ΚΑΙ στη μάχη, όχι μόνο χρώμα (Ε3): κάθε ζώνη ξεκινά
    // τη μπάρα λίγο πιο γεμάτη. Μαζί με τη Φλογερή Καρδιά, ποτέ γεμάτη.
    this.rage = Math.min(RAGE_MAX * .8, journey.beltRage(this.cycle)
      + (this.perks.includes('ember') ? RAGE_MAX / 2 : 0));
    engine.resetSession();

    this.buildBackdrop();
    this.master = this.buildMaster();
    this.ninja = this.makeNinja(NINJA_X, LINE_Y);
    this.hand.setTint(this.weaponTint(journey.weaponFor(this.cycle)));   // Ζ10: η φλόγα στο χέρι έχει το χρώμα του όπλου
    this.buildScroll();
    this.buildHUD();

    this.cameras.main.fadeIn(420, 0xFF, 0x7A, 0x1A);
    this.spawnWave();
    // Πριν τον πάπυρο: πού βρίσκεσαι στον Δρόμο. Την πρώτη φορά, η ιστορία.
    const begin = () => this.showStationBanner(() => this.announcePerks(() => this.startLevel()));
    if (!jr.storySeen) {
      store.markStorySeen(state);
      this.showStory(begin);
    } else {
      begin();
    }
  }

  // Το τοπίο είναι του ΣΤΑΘΜΟΥ (Ε3): ντότζο, δάσος, γέφυρα, λίμνη, ναός,
  // κορυφή, κάστρο. Κρατάμε τα αντικείμενά του για να αλλάζει όταν κερδίζεται
  // σταθμός, χωρίς να ξαναρχίσει η μάχη. Βάθος -1: πάντα πίσω απ' όλα.
  buildBackdrop() {
    const calm = this.calm;
    const st = this.station % journey.STATIONS;
    const before = new Set(this.children.list);
    const mood = world.stationMood(st);
    world.buildSky(this, 200, mood);
    world.buildStars(this, calm);
    world.buildMoon(this, calm, mood);
    if (!calm && st !== 6) world.buildShootingStars(this);   // στο κάστρο: σπίθες, όχι αστέρια
    world.buildClouds(this, calm);
    if (!calm) world.buildBirds(this, { bats: st === 4 || st === 6 });
    world.ridge(this, world.RIDGE_HAZE, NUM.ridgeHaze, .55);
    world.ridge(this, world.RIDGE_FAR, NUM.ridgeFar);
    world.buildStation(this, st, 'back', calm);
    world.buildMist(this, calm);
    if (st === 5) world.buildMist(this, calm);          // Κορυφή της Ομίχλης
    world.ridge(this, world.RIDGE_MID, NUM.ridgeMid);
    world.buildStation(this, st, 'mid', calm);
    world.ridge(this, world.RIDGE_NEAR, NUM.ridgeNear);
    world.buildStation(this, st, 'front', calm);
    if (!calm) world.buildStation(this, st, 'life', calm);   // ζωή του τοπίου (όχι σε ήρεμη κίνηση)
    world.buildGround(this, { path: 'wide' });
    world.buildGroundDetail(this, st, calm);
    world.lantern(this, 470, 604, .7, calm);
    world.lantern(this, 1010, 600, .7, calm);
    world.buildWash(this, mood);
    this.backdrop =this.children.list.filter((o) => !before.has(o));
    this.backdrop.forEach((o) => o.setDepth(-1));
  }

  rebuildBackdrop() {
    (this.backdrop || []).forEach((o) => this.destroyDeep(o));
    this.buildBackdrop();
  }

  // Καταστροφή ΜΑΖΙ με τα tween των παιδιών. Το destroy ενός container δεν
  // σταματά τα ατέρμονα tween (repeat:-1) των παιδιών του — συνέχιζαν να
  // τρέχουν πάνω σε νεκρά αντικείμενα: 49 μετά από 6 σταθμούς (11/09 —
  // φτερά δράκου, φλόγες ανεμοστρόβιλου, «άγγιξε για να συνεχίσεις»).
  destroyDeep(o) {
    if (!o || !o.scene) return;
    const kill = (x) => {
      this.tweens.killTweensOf(x);
      if (x.spin && x.spin.stop) x.spin.stop();      // tween πάνω σε απλό αντικείμενο (daze)
      if (x.timer && x.timer.remove) x.timer.remove();
      if (x.list) x.list.forEach(kill);
    };
    kill(o);
    o.destroy();
  }

  // Δίχτυ για ό,τι ξέφυγε: tween που ΟΛΟΙ οι στόχοι του είναι κατεστραμμένα
  // αντικείμενα του Phaser σβήνονται. (Απλά αντικείμενα-μεσάζοντες, όπως το
  // {t:0} των βλημάτων, δεν έχουν `type` και δεν αγγίζονται.)
  sweepTweens() {
    const dead = new Set();
    for (const t of this.tweens.getTweens()) {
      const ts = t.targets || [];
      if (ts.length && ts.every((x) => x && x.type && !x.scene)) ts.forEach((x) => dead.add(x));
    }
    dead.forEach((x) => this.tweens.killTweensOf(x));
    return dead.size;
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
    const P = (px, py) => new Phaser.Geom.Point(px, py);

    // Φινίρισμα του ήρωα (11/09): ίδια σιλουέτα, περισσότερη ζωή.
    // Το σπαθί στην πλάτη — η λαβή βγαίνει πάνω από τον ώμο, πίσω από το κεφάλι
    const sword = this.add.graphics();
    sword.fillStyle(NUM.smoke, .7);                     // φεγγαρόφωτο: να ξεχωρίζει από τον ουρανό
    sword.fillPoints([P(-12, -66), P(-6, -72), P(-42, -124), P(-48, -118)], true);
    sword.fillStyle(NUM.flameDeep, .85);                // το δέσιμο της λαβής
    for (const t of [.5, .66, .82]) sword.fillCircle(-9 - 34 * t, -69 - 48 * t, 2.6);
    sword.fillStyle(NUM.nightHigh, 1);
    sword.fillCircle(-30, -97, 6);                      // το τσούμπα
    // Φως φεγγαριού στη δεξιά άκρη: όγκος, όχι επίπεδος λεκές
    const rim = this.add.graphics();
    rim.lineStyle(2.5, NUM.moon, .26);
    rim.beginPath();
    rim.arc(0, -92, 26, -1.25, .85, false);
    rim.strokePath();
    rim.lineStyle(2, NUM.moon, .16);
    rim.lineBetween(25.5, -60, 25.5, -26);
    // Τα μάτια σε δικό τους container: ανοιγοκλείνουν (animateNinja)
    const eyeG = this.add.graphics();
    eyeG.fillStyle(NUM.parchment, .95);
    eyeG.fillRoundedRect(-17, -4, 34, 8, 4);
    this.eyes = this.add.container(0, -95, [eyeG]);
    // Οι δύο ουρές της κορδέλας κυματίζουν — ξαναζωγραφίζονται κάθε καρέ
    this.tails = this.add.graphics();
    this.drawNinjaTails(0);
    // Σκιά στο έδαφος: ο ήρωας ΠΑΤΑΕΙ στον κόσμο, δεν αιωρείται πάνω του
    this.ninjaShadow = this.add.ellipse(x, y + 3, 96, 16, NUM.shadow).setAlpha(.45).setDepth(11);

    // Η ζώνη: το χρώμα της είναι ο ΚΥΚΛΟΣ του Δρόμου — μόνιμη, ορατή
    // ενδυνάμωση (SPEC κεφ. 7). Δικό της Graphics, για να αλλάζει στη νίκη.
    this.belt = this.add.graphics();
    this.paintBelt(journey.beltColor(this.cycle));

    // Η αύρα όταν η μπάρα δύναμης είναι γεμάτη: ο νίντζα «ντοπάρεται»
    this.aura = this.add.image(0, -56, 'glow-flame').setScale(2.2)
      .setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    // Το σπαθί ΣΤΟ ΧΕΡΙ (Ζ5, δυνάμεις): κρυμμένο ώσπου να το τραβήξει. Η λαβή
    // στο (0,0), η λεπίδα προς τα δεξιά — γυρίζει γύρω από τη λαβή.
    const blade = this.add.graphics();
    blade.fillStyle(NUM.nightHigh, 1);
    blade.fillRect(-16, -3, 14, 6);                                   // λαβή
    blade.fillStyle(NUM.flameDeep, 1);
    blade.fillCircle(-2, 0, 5.5);                                     // τσούμπα
    blade.fillStyle(NUM.moon, .96);
    blade.fillPoints([P(3, -3.5), P(70, -2.5), P(80, 0), P(70, 2.5), P(3, 3.5)], true);
    blade.lineStyle(1.2, NUM.star, .9);
    blade.lineBetween(4, -1, 72, -1);
    blade.setVisible(false);
    this.blade = blade;
    this.backSword = sword;
    c.add([this.aura, sword, this.tails, g, rim, this.eyes, this.belt, blade]);
    c.setScale(1.3);   // ο ήρωας πρέπει να διαβάζεται από απόσταση σε tablet

    // Το χέρι που κρατά τη φλόγα
    this.hand = this.add.image(x + 48, y - 78, 'glow-flame')
      .setScale(.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(13);
    return c;
  }

  // Οι δύο ουρές της κορδέλας: λωρίδες που στενεύουν και κυματίζουν πίσω
  // από το κεφάλι, η καθεμιά με δική της φάση.
  drawNinjaTails(time) {
    const g = this.tails;
    g.clear();
    g.fillStyle(NUM.dojoRoof, 1);
    for (const [ph, len, base, lift] of [[0, 44, -100, 10], [1.9, 34, -94, 3]]) {
      const top = [], bot = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const x = -20 - t * len;
        const y = base - t * lift + Math.sin(time * .009 + t * 3.2 + ph) * 5.5 * t;
        const w = 4.2 - 2.6 * t;
        top.push(new Phaser.Geom.Point(x, y - w));
        bot.push(new Phaser.Geom.Point(x, y + w));
      }
      g.fillPoints([...top, ...bot.reverse()], true);
    }
  }

  // Ο νίντζα σε μικρογραφία, για τον χάρτη: ίδιο σχήμα, ίδια ζώνη.
  miniNinja(x, y) {
    const P = (px, py) => new Phaser.Geom.Point(px, py);
    const g = this.add.graphics();
    g.fillStyle(NUM.dojoRoof, 1);
    g.fillRect(-9, 18, 7, 7);
    g.fillRect(3, 18, 7, 7);
    g.fillRoundedRect(-12, -6, 24, 26, 7);
    g.fillCircle(0, -14, 12);
    g.fillPoints([P(-11, -18), P(-27, -24), P(-24, -16), P(-11, -13)], true);
    g.fillStyle(NUM.parchment, .95);
    g.fillRoundedRect(-8, -18, 16, 4, 2);
    g.fillStyle(journey.beltColor(this.cycle), 1);
    g.fillRect(-12, 7, 24, 4);
    return this.add.container(x, y, [g]).setScale(1.25);
  }

  paintBelt(color) {
    const P = (x, y) => new Phaser.Geom.Point(x, y);
    this.belt.clear();
    this.belt.fillStyle(color, 1);
    this.belt.fillRect(-26, -40, 52, 8);
    this.belt.fillStyle(color, .85);                    // οι άκρες που κρέμονται
    this.belt.fillPoints([P(16, -34), P(28, -18), P(22, -16), P(11, -32)], true);
  }

  // ------------------------------------------------------------ Μάστερ Γου
  //
  // Ο κακός. Αιωρείται ψηλά και δεν πατάει ΠΟΤΕ στο χώμα. Από 10/09/2026
  // ΜΙΛΑΕΙ, με γραπτές ατάκες (δες masterSays).
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

    // Το μανίκι ζωγραφίζεται κάθε καρέ από τον ώμο ως το χέρι (animateMaster),
    // ώστε όταν τεντώνεται το χέρι να μη μοιάζει με μαύρη μπάρα στον αέρα.
    c.sleeveG = this.add.graphics();
    c.add(c.sleeveG);

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

    // Ο πίνακας αρχετύπων λέει ΠΟΙΑ συνάρτηση· η σκηνή δεν ξέρει ονόματα
    // εχθρών. Νέος εχθρός = μία γραμμή στο enemies.js + μία draw* εδώ.
    const draw = {
      dragon: this.drawDragon, ninja: this.drawNinjaFoe,
      heavy: this.drawHeavy, wraith: this.drawWraith
    }[arch.draw] || this.drawSmoke;
    // Σκιά στο έδαφος, ΠΙΣΩ από το σώμα: οι μορφές πατούν στον κόσμο
    c.add(this.add.ellipse(0, 4, 92 * size, 15 * size, NUM.shadow).setAlpha(.38));
    draw.call(this, c, size);
    return c;
  }

  /**
   * Καπνοδαίμονας (NEXT-FIXES Δ3). Ήταν στατική ζωγραφιά πάνω σε ένα tween
   * πάνω-κάτω. Τώρα το σώμα ΞΑΝΑΖΩΓΡΑΦΙΖΕΤΑΙ κάθε καρέ, όπως του δράκου:
   * λοβοί καπνού που ανασαίνουν ο καθένας με δική του φάση, ουρά από
   * κουβάρια που ξεκολλούν από πίσω και σβήνουν, κέρατα που λικνίζονται,
   * μάτια που ανοιγοκλείνουν.
   *
   * Anticipation: πριν κερδίσει έδαφος ΦΟΥΣΚΩΝΕΙ — τα μάτια ανάβουν,
   * ανοίγει στόμα (windUp). Και κάθε λίγο μαζεύεται μόνος του, ώστε η απειλή
   * να φαίνεται και χωρίς λάθος.
   */
  drawSmoke(c, size) {
    const S = size;
    const glow = this.add.image(0, -34 * S, 'glow-moon').setScale(.7 * S).setAlpha(.10);
    const g = this.add.graphics();
    c.add([glow, g]);

    // [x, y, ακτίνα x, ακτίνα y, φάση]
    const lobes = [
      [0, -40, 31, 38, 0], [-16, -14, 17, 13, 1.7], [18, -12, 15, 11, 3.1],
      [-6, -62, 20, 18, 4.4], [10, -26, 18, 16, 2.3]
    ];
    const seed = Math.random() * 10;
    const calm = this.calm;
    // Το φούσκωμα ζει σε δικό του αντικείμενο: έτσι ένα νέο φούσκωμα σβήνει
    // το προηγούμενο χωρίς να αγγίξει τα tween θέσης του ίδιου του εχθρού.
    const sw = { v: 0 };
    c.swell = sw;             // για ελέγχους: πόσο φουσκωμένος είναι (0-1)
    c.eyeOpen = 1;            // για ελέγχους: 1 ανοιχτά, <1 ανοιγοκλείνει
    let blinkUntil = 0;
    // Οι χρόνοι ξεκινούν από το ΠΡΩΤΟ καρέ που βλέπει ο εχθρός — όχι από
    // ρολόι που μπορεί να είναι άλλο από το `time` του update().
    let nextBlinkAt = null;
    let nextGatherAt = null;

    c.windUp = () => {
      this.tweens.killTweensOf(sw);
      this.tweens.add({ targets: sw, v: 1, duration: 150, hold: 160, yoyo: true, ease: 'Quad.easeOut' });
    };

    c.behave = (time) => {
      if (nextBlinkAt === null) {
        nextBlinkAt = time + Phaser.Math.Between(1500, 4000);
        nextGatherAt = time + Phaser.Math.Between(2500, 4500);
      }
      const t = time * .001 + seed;
      const s = sw.v;
      const bob = calm ? 0 : Math.sin(t * 1.6) * 4 * S;
      const lift = bob - s * 6 * S;               // φουσκώνοντας ανασηκώνεται
      g.clear();

      // Ουρά: τρία κουβάρια ξεκολλούν από πίσω και σβήνουν ψηλά
      if (!calm) {
        for (let k = 0; k < 3; k++) {
          const p = (t * .55 + k / 3) % 1;
          g.fillStyle(NUM.ridgeHaze, (1 - p) * .55);
          g.fillCircle((22 + p * 46) * S, (-10 - p * 34) * S + bob, (13 - p * 8) * S);
        }
      }

      // Σώμα
      g.fillStyle(NUM.ridgeHaze, .95);
      for (const [x, y, rx, ry, ph] of lobes) {
        const k = 1 + (calm ? 0 : Math.sin(t * 2.2 + ph) * .07) + s * .22;
        const dx = calm ? 0 : Math.sin(t * 1.3 + ph) * 2.5;
        g.fillEllipse((x + dx) * S, y * S + lift, rx * 2 * k * S, ry * 2 * k * S);
      }
      g.fillStyle(shade(NUM.ridgeHaze, .7), .5);  // σκιά χαμηλά — όγκος χωρίς gradient
      g.fillEllipse(2 * S, -18 * S + lift, 46 * S, 20 * S);

      // Κέρατα που λικνίζονται και τεντώνονται στο φούσκωμα
      const hs = calm ? 0 : Math.sin(t * 1.9) * 3;
      g.fillStyle(NUM.ridgeHaze, .95);
      g.fillTriangle(-22 * S, -66 * S + lift, (-30 + hs) * S, (-96 - s * 10) * S + lift, -8 * S, -70 * S + lift);
      g.fillTriangle(22 * S, -66 * S + lift, (31 + hs) * S, (-94 - s * 10) * S + lift, 9 * S, -70 * S + lift);

      // Μάτια: ανοιγοκλείνουν· στο φούσκωμα μεγαλώνουν και ανάβουν
      if (time > nextBlinkAt) {
        blinkUntil = time + 130;
        nextBlinkAt = time + Phaser.Math.Between(2200, 5200);
      }
      const eh = time < blinkUntil ? .18 : 1;
      c.eyeOpen = eh;
      const er = (5.5 + s * 2.4) * S;
      g.fillStyle(s > .25 ? NUM.lantern : NUM.star, .92);
      g.fillEllipse(-11 * S, -48 * S + lift, er * 2, er * 2 * eh);
      g.fillEllipse(11 * S, -48 * S + lift, er * 2, er * 2 * eh);

      // Στόμα: σχισμή που ανοίγει μόνο όταν φουσκώνει
      if (s > .05) {
        g.fillStyle(NUM.shadow, .85 * s);
        g.fillEllipse(0, -31 * S + lift, 18 * S, 8 * s * S);
      }
      glow.setAlpha(.10 + s * .2);

      // Κάθε λίγο μαζεύεται μόνος του — μισό φούσκωμα, αργό
      if (!calm && time > nextGatherAt) {
        nextGatherAt = time + Phaser.Math.Between(3200, 5200);
        if (!this.tweens.isTweening(sw)) {
          this.tweens.add({ targets: sw, v: .45, duration: 420, yoyo: true, ease: 'Sine.easeInOut' });
        }
      }
    };
  }

  /**
   * Σκιερός Νίντζα (HYPER-NOTE §6) — γρήγορος, πέφτει με μία. ΔΕΝ είναι ο
   * ήρωάς μας: γέρνει μπροστά, κρατά λεπίδα, και το χρώμα του είναι πιο
   * ανοιχτό ώστε να μη μπερδεύεται με τη δική μας σιλουέτα.
   *
   * Anticipation: μαζεύεται και μετά ορμά. Χωρίς το μάζεμα η ορμή
   * διαβάζεται ως κόλλημα της εικόνας, όχι ως πρόθεση.
   */
  //
  // NEXT-FIXES Δ3: ήταν ζωγραφιά με μόνο το κασκόλ να κουνιέται. Τώρα είναι
  // ΑΡΘΡΩΤΟΣ και ξαναζωγραφίζεται κάθε καρέ: γοφός → γόνατα → πέλματα,
  // κορμός που γέρνει και ανασαίνει, χέρι που κρατά τη λεπίδα. Μία μεταβλητή
  // στάσης (pose.k) τα οδηγεί όλα: 0 φύλαξη · 1 μαζεμένος, λεπίδα ψηλά πίσω ·
  // αρνητικό = ορμή, λεπίδα μπροστά.
  drawNinjaFoe(c, size) {
    const S = size;
    const scarf = this.add.graphics();
    const g = this.add.graphics();
    c.add([scarf, g]);

    const calm = this.calm;
    const seed = Math.random() * 10;
    const pose = { k: 0 };
    c.pose = pose;                                        // για ελέγχους
    const lerp = (a, b, u) => a + (b - a) * u;
    // ribbonOutline σε μονάδες σχεδίου: [x, y, πάχος]
    const rib = (pts) => ribbonOutline(pts.map(([x, y, r]) => ({ cx: x * S, cy: y * S, r: r * S })));
    const pt = (x, y) => new Phaser.Geom.Point(x * S, y * S);

    const draw = (time) => {
      const t = time * .001 + seed;
      const gather = Math.max(0, pose.k);                 // μάζεμα
      const lunge = Math.max(0, -pose.k);                 // ορμή
      const br = calm ? 0 : Math.sin(t * 5.6) * 1.4;      // ανάσα
      const sway = calm ? 0 : Math.sin(t * 1.7);          // μετατόπιση βάρους

      // Γοφός: χαμηλώνει στο μάζεμα, πάει μπροστά στην ορμή
      const hx = 6 + sway * 2 - lunge * 12, hy = -56 + gather * 16;
      // Κορμός: γέρνει μπροστά (αριστερά) — περισσότερο στο μάζεμα και στην ορμή
      const lean = .2 + gather * .28 + lunge * .38 + sway * .02;
      const sx = hx - Math.sin(lean) * 78, sy = hy - Math.cos(lean) * 78 + br;
      g.clear();
      scarf.clear();

      // Πόδια: γοφός → γόνατο → πέλμα. Το μπροστινό λυγίζει, το πίσω σπρώχνει
      g.fillStyle(shade(NUM.nightHigh, .68), 1);
      g.fillPoints(rib([[hx - 4, hy, 11], [-22 - gather * 8 - lunge * 8, -30 + gather * 8, 9], [-26 - lunge * 10, -2, 7]]), true);
      g.fillPoints(rib([[hx + 8, hy, 11], [30 + gather * 6 + lunge * 8, -28 + gather * 6, 9], [46 + lunge * 14, -2, 7]]), true);

      // Κορμός: φαρδύς ώμος, σκιά στην πλάτη, φως στο στήθος
      const mx = (hx + sx) / 2, my = (hy + sy) / 2;
      g.fillStyle(NUM.nightHigh, 1);
      g.fillPoints(rib([[hx, hy + 6, 19], [mx, my, 23], [sx, sy + 6, 27]]), true);
      g.fillStyle(shade(NUM.nightHigh, .58), .95);
      g.fillPoints(rib([[hx + 10, hy + 4, 8], [mx + 12, my, 10], [sx + 14, sy + 6, 12]]), true);
      g.fillStyle(shade(NUM.nightHigh, 1.5), .35);
      g.fillPoints(rib([[hx - 10, hy + 2, 6], [mx - 12, my, 7], [sx - 14, sy + 8, 7]]), true);

      // Ζώνη: λωρίδα κάθετη στον κορμό, λίγο πάνω από τον γοφό
      const len = Math.hypot(sx - hx, sy - hy) || 1;
      const dx = (sx - hx) / len, dy = (sy - hy) / len, nx = -dy, ny = dx;
      const bx = lerp(hx, sx, .3), by = lerp(hy, sy, .3);
      g.fillStyle(NUM.flameDeep, .85);
      g.fillPoints([
        pt(bx + nx * 23 - dx * 5, by + ny * 23 - dy * 5), pt(bx + nx * 23 + dx * 5, by + ny * 23 + dy * 5),
        pt(bx - nx * 23 + dx * 5, by - ny * 23 + dy * 5), pt(bx - nx * 23 - dx * 5, by - ny * 23 - dy * 5)
      ], true);

      // Κεφάλι: κουκούλα με μύτη μπροστά. Η σχισμή ΑΝΑΒΕΙ όταν μαζεύεται
      const cx = sx - 4 - lean * 10 + sway, cy = sy - 22;
      g.fillStyle(NUM.nightHigh, 1);
      g.fillEllipse(cx * S, cy * S, 52 * S, 44 * S);
      g.fillPoints([pt(cx - 28, cy - 8), pt(cx + 2, cy - 34), pt(cx + 28, cy), pt(cx + 6, cy + 12)], true);
      g.fillStyle(shade(NUM.nightHigh, .55), 1);
      g.fillEllipse((cx - 8) * S, (cy + 8) * S, 34 * S, 26 * S);
      g.fillStyle(gather > .3 ? NUM.flame : NUM.flameDeep, .95);
      const slit = 7 + gather * 3;
      g.fillRoundedRect((cx - 24) * S, (cy - 2 - gather * 1.5) * S, 28 * S, slit * S, slit / 2 * S);

      // Χέρι και λεπίδα. Φύλαξη: χαμηλά μπροστά · μάζεμα: ψηλά πίσω ·
      // ορμή: τεντωμένο μπροστά. Η λεπίδα ακολουθεί το χέρι.
      const shx = sx - 10, shy = sy + 8;
      const hand = [
        lerp(lerp(sx - 18, sx + 14, gather), sx - 44, lunge),
        lerp(lerp(sy + 46, sy - 20, gather), sy + 18, lunge)
      ];
      const ex = (shx + hand[0]) / 2 - 8, ey = (shy + hand[1]) / 2 + 6;
      g.fillStyle(shade(NUM.nightHigh, .8), 1);
      g.fillPoints(rib([[shx, shy, 9], [ex, ey, 7], [hand[0], hand[1], 6]]), true);

      const wob = calm ? 0 : Math.sin(t * 1.3) * .06;
      let vx = lerp(lerp(-72, 40, gather), -80, lunge), vy = lerp(lerp(34, -60, gather), -5, lunge);
      const vl = Math.hypot(vx, vy) || 1;
      vx /= vl; vy /= vl;
      [vx, vy] = [vx * Math.cos(wob) - vy * Math.sin(wob), vx * Math.sin(wob) + vy * Math.cos(wob)];
      const qx = -vy, qy = vx;
      const [hx2, hy2] = hand;
      const tx = hx2 + vx * 76, ty = hy2 + vy * 76;
      g.lineStyle(5 * S, NUM.shadow, 1);                   // λαβή
      g.lineBetween((hx2 - vx * 14) * S, (hy2 - vy * 14) * S, hx2 * S, hy2 * S);
      g.fillStyle(shade(NUM.stone, 2.1), .92);             // λάμα
      g.fillPoints([pt(hx2 + qx * 3, hy2 + qy * 3), pt(tx, ty), pt(hx2 - qx * 3, hy2 - qy * 3)], true);
      g.lineStyle(1.6 * S, NUM.parchment, .5);             // ακμή φωτός
      g.lineBetween((hx2 + qx * 3) * S, (hy2 + qy * 3) * S, tx * S, ty * S);

      // Κασκόλ: δεμένο στο πίσω μέρος της κουκούλας, ανεμίζει πιο δυνατά στην ορμή
      const amp = 1 + lunge * 1.8;
      const rx = cx + 24, ry = cy + 4;
      const spine = [[0, 0, 8], [18, 8, 6.5], [34, 20, 4.5], [46, 30, 2.5]].map(([x, y, r], i) => [
        rx + x + lunge * i * 6 + (calm ? 0 : Math.sin(time * .006 - i * .7) * (1 + i * 2.2) * amp),
        ry + y - lunge * i * 4 + (calm ? 0 : Math.sin(time * .005 - i * .5) * (1.5 + i * 2.6) * amp),
        r
      ]);
      scarf.fillStyle(NUM.flameDeep, .85);
      scarf.fillPoints(rib(spine), true);
    };

    // 1. μάζεμα (λεπίδα πίσω)  2. ορμή  3. επαναφορά. Το `burst` είναι η
    // πραγματική επιτάχυνση του εχθρού· στο λάθος του παιδιού (windUp) το
    // βήμα το κάνει ήδη η σκηνή, οπότε εκεί είναι μόνο κίνηση.
    const strike = (burst) => {
      this.tweens.killTweensOf(pose);
      this.tweens.add({
        targets: pose, k: 1, duration: burst ? 220 : 140, hold: burst ? 0 : 60, ease: 'Quad.easeOut',
        onComplete: () => {
          if (burst) { c.mult = 3.4; c.multMs = 300; }
          this.tweens.add({
            targets: pose, k: -.8, duration: 140, ease: 'Quad.easeIn',
            onComplete: () => this.tweens.add({ targets: pose, k: 0, duration: 380, ease: 'Sine.easeInOut' })
          });
        }
      });
    };
    c.windUp = () => { if (!calm) strike(false); };

    let nextDashAt = null;
    c.behave = (time) => {
      if (nextDashAt === null) nextDashAt = time + Phaser.Math.Between(2200, 3600);
      draw(time);
      if (time < nextDashAt) return;
      nextDashAt = time + Phaser.Math.Between(2600, 4200);
      if (calm) { c.mult = 3.4; c.multMs = 300; return; }   // η ορμή μένει, χωρίς κίνηση
      if (!this.tweens.isTweening(pose)) strike(true);
    };
    draw(0);
  }

  /**
   * Βαρύ Τέρας (HYPER-NOTE §6) — αργό, τέσσερα χτυπήματα. Η απειλή του δεν
   * είναι ο χρόνος αλλά ότι δεν φεύγει: μένει μπροστά σου και τρώει σωστές
   * απαντήσεις. Πλατύ και χαμηλό, ώστε να διαβάζεται ως όγκος.
   */
  //
  // NEXT-FIXES Δ3: ήταν ζωγραφιά που απλώς λικνιζόταν. Τώρα ξαναζωγραφίζεται
  // κάθε καρέ: πατάει βαριά (σηκώνεται το ένα πόδι, μετά το άλλο, και το σώμα
  // πέφτει σε κάθε πάτημα), οι ώμοι κουβαλούν την κίνηση, τα χέρια
  // ταλαντεύονται σαν εκκρεμή με καθυστέρηση. Κάθε λίγο σηκώνεται και χτυπά
  // το έδαφος. pose.k: 0 βάδισμα · 1 όρθιο, χέρια πάνω από το κεφάλι ·
  // αρνητικό = το χτύπημα κάτω.
  drawHeavy(c, size) {
    const S = size;
    const g = this.add.graphics();
    c.add(g);

    const calm = this.calm;
    const seed = Math.random() * 10;
    const pose = { k: 0 };
    c.pose = pose;                                        // για ελέγχους
    const lerp = (a, b, u) => a + (b - a) * u;
    const pt = (x, y) => new Phaser.Geom.Point(x * S, y * S);

    const draw = (time) => {
      const p = calm ? 0 : time * .0022 + seed;
      const step = Math.sin(p);
      const rear = Math.max(0, pose.k), slam = Math.max(0, -pose.k);
      const walk = 1 - Math.min(1, rear + slam);         // στο χτύπημα σταματά το βάδισμα
      const drop = Math.abs(step) * 5 * walk;
      const rock = step * walk;
      const breath = calm ? 0 : Math.sin(time * .0031 + seed) * 1.5;

      // Κάθε σημείο μετακινείται ανάλογα με το ΥΨΟΣ του: οι γοφοί μένουν στη
      // θέση τους, οι ώμοι κουβαλούν όλη την κίνηση. Έτσι το σώμα λυγίζει
      // ενιαίο, δεν σπάει σε κομμάτια.
      const F = (x, y, extra = 1) => {
        const w = Math.max(0, Math.min(1, (-y - 38) / 124)) * extra;
        return [x + (rock * 4 + rear * 6 - slam * 12) * w,
                y + drop + (breath - rear * 20 + slam * 14) * w];
      };
      const T = (x, y, extra) => { const [a, b] = F(x, y, extra); return pt(a, b); };

      const arm = (sx, sy, idleDx, idleDy, phase, up, axe) => {
        const [ax, ay] = F(sx, sy);
        const swing = calm ? 0 : Math.sin(p - .9 + phase) * .14 * walk;   // καθυστερεί πίσω από το σώμα
        let th = Math.atan2(idleDx, idleDy) + swing;
        th = lerp(th, up, rear);                          // πάνω από το κεφάλι
        th = lerp(th, -.75, slam);                        // κάτω, μπροστά, στο χώμα
        const L = 104;
        const fx = ax + Math.sin(th) * L, fy = ay + Math.cos(th) * L;
        const mx = ax + Math.sin(th) * L * .5 - 4, my = ay + Math.cos(th) * L * .5;
        // Ζ12: το τσεκούρι στο μπροστινό χέρι. Στο βάδισμα η λαβή σηκώνεται
        // μπροστά-πάνω· στο σήκωμα συνεχίζει το χέρι· στο χτύπημα κοιτά κάτω.
        if (axe && c.hasAxe) {
          const dx = Math.sin(th), dy = Math.cos(th);
          const a = Phaser.Math.DegToRad(lerp(lerp(160, 12, rear), 40, slam));
          const ux = dx * Math.cos(a) - dy * Math.sin(a), uy = dx * Math.sin(a) + dy * Math.cos(a);
          this.drawAxe(g, fx * S, fy * S, ux, uy, S);
        }
        g.fillStyle(shade(NUM.ridgeNear, .85), 1);
        g.fillPoints(ribbonOutline([
          { cx: ax * S, cy: ay * S, r: 17 * S }, { cx: mx * S, cy: my * S, r: 14 * S },
          { cx: fx * S, cy: fy * S, r: 13 * S }
        ]), true);
        g.fillCircle(fx * S, fy * S, 24 * S);
        g.lineStyle(2.6 * S, shade(NUM.ridgeNear, .5), .7);                  // δάχτυλα, μία γραμμή
        g.lineBetween((fx - 18) * S, (fy + 6) * S, (fx + 18) * S, (fy + 6) * S);
      };

      g.clear();

      // Πόδια κοντά και χοντρά — σηκώνεται το ένα, μετά το άλλο
      const liftL = Math.max(0, step) * 9 * walk, liftR = Math.max(0, -step) * 9 * walk;
      g.fillStyle(shade(NUM.ridgeNear, .8), 1);
      g.fillRoundedRect(-46 * S, (-40 + drop) * S, 36 * S, (40 - drop - liftL) * S, 10 * S);
      g.fillRoundedRect(12 * S, (-40 + drop) * S, 36 * S, (40 - drop - liftR) * S, 10 * S);

      arm(61, -142, 11, 108, Math.PI, 2.7);               // το πίσω χέρι, πίσω από τον κορμό

      // Κορμός: καμπουριασμένος, ο ένας ώμος ψηλότερα — όγκος, όχι κουτί
      g.fillStyle(NUM.ridgeNear, 1);
      g.fillPoints([T(-70, -128), T(-46, -156), T(30, -162), T(72, -134), T(52, -38), T(-48, -38)], true);
      g.fillStyle(shade(NUM.ridgeNear, 1.5), .42);        // φως στον μπροστινό ώμο
      g.fillPoints([T(-70, -128), T(-46, -156), T(-24, -152), T(-40, -38), T(-48, -38)], true);
      g.fillStyle(shade(NUM.ridgeNear, .55), .5);         // σκιά στην κοιλιά
      g.fillPoints([T(-30, -70), T(46, -74), T(52, -38), T(-36, -38)], true);

      // Αγκάθια στην πλάτη
      g.fillStyle(shade(NUM.ridgeNear, .5), 1);
      for (const [bx, by, h] of [[46, -150, 26], [64, -128, 20], [72, -104, 15]]) {
        g.fillPoints([T(bx, by), T(bx + h, by + h * .4), T(bx + 4, by + h)], true);
      }

      // Δύο γραμμές θώρακα — λίγες, καθαρές
      g.lineStyle(3 * S, shade(NUM.ridgeNear, .5), .75);
      for (const [x1, y1, x2, y2] of [[-52, -112, 48, -118], [-44, -86, 46, -90]]) {
        const a = T(x1, y1), b = T(x2, y2);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }

      // Κεφάλι βυθισμένο ανάμεσα στους ώμους: γνέφει σε κάθε πάτημα,
      // στο σήκωμα βρυχάται — ανοίγει στόμα, τα μάτια φουντώνουν
      const [hx, hy0] = F(-8, -172, 1.15);
      const hy = hy0 + drop * .6;
      const H = (x, y) => pt(hx + x, hy + y);
      g.fillStyle(shade(NUM.ridgeNear, .72), 1);
      g.fillEllipse(hx * S, hy * S, 74 * S, 52 * S);
      if (rear > .05) {
        g.fillStyle(NUM.shadow, .9);
        g.fillEllipse((hx - 7) * S, (hy + 24) * S, 34 * S, (4 + rear * 16) * S);
      }
      g.fillStyle(shade(NUM.ridgeNear, .45), 1);          // βαρύ φρύδι
      g.fillPoints([H(-38, -12 - rear * 4), H(36, -18 - rear * 4), H(34, 0), H(-36, 4)], true);
      const eg = 1 + rear * .45;
      g.fillStyle(rear > .4 ? NUM.flameCore : NUM.lantern, .92);
      g.fillEllipse((hx - 16) * S, (hy + 4) * S, 13 * eg * S, 9 * eg * S);
      g.fillEllipse((hx + 12) * S, (hy + 2) * S, 13 * eg * S, 9 * eg * S);
      g.fillStyle(NUM.parchment, .8);                     // δύο χαυλιόδοντες
      g.fillPoints([H(-18, 20), H(-8, 20), H(-13, 36)], true);
      g.fillPoints([H(10, 20), H(20, 20), H(15, 34)], true);

      arm(-56, -141, -14, 105, 0, -2.7, true);            // το μπροστινό χέρι (με το τσεκούρι), μπροστά απ' όλα
    };
    c.hasAxe = true;

    // Σκόνη εκεί που χτυπούν οι γροθιές
    const dust = () => {
      for (const side of [-1, 1]) {
        const em = this.add.particles(c.x + side * 60 * S, LINE_Y - 4, 'puff', {
          speed: { min: 20, max: 90 },
          angle: side < 0 ? { min: 190, max: 250 } : { min: 290, max: 350 },
          scale: { start: .8, end: 0 }, alpha: { start: .45, end: 0 },
          lifespan: { min: 400, max: 800 }, tint: NUM.smoke, emitting: false
        }).setDepth(12);
        em.explode(10);
        this.time.delayedCall(900, () => em.destroy());
      }
    };

    // Σήκωμα → χτύπημα → σκόνη → επαναφορά. Στο λάθος του παιδιού (fast)
    // όλα πιο απότομα. Δεν αλλάζει την ταχύτητά του: η απειλή του Τέρατος
    // είναι ότι δεν φεύγει, όχι ότι τρέχει.
    const strike = (fast) => {
      this.tweens.killTweensOf(pose);
      this.tweens.add({
        targets: pose, k: fast ? 1 : .7, duration: fast ? 180 : 420,
        ease: fast ? 'Quad.easeOut' : 'Sine.easeInOut',
        onComplete: () => this.tweens.add({
          targets: pose, k: -1, duration: fast ? 120 : 160, ease: 'Quad.easeIn',
          onComplete: () => {
            dust();
            this.tweens.add({ targets: pose, k: 0, duration: 520, delay: 120, ease: 'Sine.easeInOut' });
          }
        })
      });
    };
    c.windUp = () => { if (!calm) strike(true); };

    let nextSlamAt = null;
    c.behave = (time) => {
      if (nextSlamAt === null) nextSlamAt = time + Phaser.Math.Between(3500, 6000);
      draw(time);
      if (calm || time < nextSlamAt) return;
      nextSlamAt = time + Phaser.Math.Between(4500, 7000);
      if (!this.tweens.isTweening(pose)) strike(false);
    };
    draw(0);
  }

  /**
   * Σκιά (HYPER-NOTE §6) — «ιδιαίτερη συμπεριφορά»: σβήνει και όσο είναι
   * σβηστή τρέχει. ΔΕΝ γίνεται ποτέ αόρατη (μένει στο 0,3): εχθρός που
   * χάνεται τελείως δεν είναι δύσκολος, είναι άδικος.
   */
  //
  // NEXT-FIXES Δ3: αιωρούνταν και έσβηνε, χωρίς σώμα που ζει. Τώρα
  // ξαναζωγραφίζεται κάθε καρέ: κύμα που ταξιδεύει από την κουκούλα προς τα
  // κάτω σαν πανί στον αέρα, κουρέλια που ανεμίζουν ξεχωριστά, μανίκι με
  // νύχια. Anticipation: ΠΡΙΝ σβήσει και τρέξει τεντώνεται ψηλά και
  // στενεύει, και στις άδειες κόγχες φέγγει κάτι. Στο λάθος του παιδιού
  // απλώνει το μανίκι προς τον νίντζα.
  drawWraith(c, size) {
    const S = size;
    const halo = this.add.image(0, -140 * S, 'glow-moon')
      .setScale(1.2 * S).setAlpha(.12).setTint(NUM.star)
      .setBlendMode(Phaser.BlendModes.ADD);
    const g = this.add.graphics();
    c.add([halo, g]);

    const calm = this.calm;
    const seed = Math.random() * 10;
    const pose = { k: 0 };                                // 1 = τεντωμένη, έτοιμη να σβήσει
    const arm = { r: 0 };                                 // 1 = μανίκι απλωμένο μπροστά
    c.pose = pose; c.reach = arm;                         // για ελέγχους
    const lerp = (a, b, u) => a + (b - a) * u;
    // Σώμα γύρω από ραχοκοκαλιά που στενεύει προς τα κάτω — δεν έχει πόδια
    const base = [[0, -172, 26], [2, -136, 33], [0, -96, 31], [-2, -56, 24], [0, -22, 13]];

    const draw = (time) => {
      const t = time * .001 + seed;
      const k = pose.k, r = arm.r;
      const bob = calm ? 0 : Math.sin(time * .0013 + seed) * 7;      // αιωρείται
      const stretch = 1 + k * .12, thin = 1 - k * .22;
      const spine = base.map(([x, y, rad], i) => ({
        cx: (x + (calm ? 0 : Math.sin(t * 2.2 - i * .8) * i * 2.2) - r * (4 - i) * 5) * S,
        cy: (y * stretch + bob) * S,
        r: rad * thin * (1 + (calm ? 0 : Math.sin(t * 1.6 + i) * .04)) * S
      }));
      g.clear();

      // Κουρέλια του ποδόγυρου: το καθένα ανεμίζει μόνο του, σέρνονται πίσω
      g.fillStyle(NUM.shadow, .88);
      const top = -44 * stretch + bob;
      for (let j = 0; j < 6; j++) {
        const bx = (-24 + j * 9.6) * thin;
        const sw = calm ? 0 : Math.sin(t * 3 + j * 1.3);
        const len = 30 + (calm ? 0 : Math.sin(t * 1.1 + j * 2.1) * 6);
        g.fillPoints(ribbonOutline([
          { cx: bx * S, cy: top * S, r: 5 * S },
          { cx: (bx + sw * 3 + 4) * S, cy: (top + len * .55) * S, r: 3.2 * S },
          { cx: (bx + sw * 7 + 9) * S, cy: (top + len) * S, r: 1 * S }
        ]), true);
      }
      g.fillPoints(ribbonOutline(spine), true);

      // Μανίκι: κρέμεται μπροστά· στο άπλωμα τεντώνεται προς τον νίντζα
      const shx = spine[1].cx / S - 20, shy = spine[1].cy / S + 6;
      const ang = (calm ? 0 : Math.sin(t * 1.4) * .12) + lerp(.35, 1.45, r);
      const L = 62 + r * 30;
      const ex = shx - Math.sin(ang) * L, ey = shy + Math.cos(ang) * L;
      const mx = shx - Math.sin(ang) * L * .5 + 4, my = shy + Math.cos(ang) * L * .5 + 3;
      g.fillStyle(NUM.shadow, .82);
      g.fillPoints(ribbonOutline([
        { cx: shx * S, cy: shy * S, r: 9 * S }, { cx: mx * S, cy: my * S, r: 7 * S },
        { cx: ex * S, cy: ey * S, r: 3 * S }
      ]), true);
      g.lineStyle(2 * S, shade(NUM.nightHigh, 1.4), .35 + r * .4);   // νύχια: ανοίγουν στο άπλωμα
      for (let f = -1; f <= 1; f++) {
        const fa = ang + f * (.18 + r * .25);
        g.lineBetween(ex * S, ey * S, (ex - Math.sin(fa) * 14) * S, (ey + Math.cos(fa) * 14) * S);
      }

      // Κουκούλα και δύο άδεια μάτια — «άδεια» σημαίνει σκοτεινά, όχι φωτεινά.
      // Μόνο όταν ετοιμάζεται φέγγει κάτι μέσα τους.
      const hx = spine[0].cx / S, hy = spine[0].cy / S + 4;
      g.fillStyle(shade(NUM.nightHigh, .8), 1);
      g.fillEllipse(hx * S, hy * S, 46 * S, 40 * S);
      g.fillStyle(NUM.shadow, 1);
      g.fillEllipse((hx - 11) * S, (hy - 2) * S, 13 * S, 17 * S);
      g.fillEllipse((hx + 11) * S, (hy - 2) * S, 13 * S, 17 * S);
      const glint = Math.max(k, r);
      if (glint > .05) {
        g.fillStyle(NUM.star, .9 * glint);
        g.fillCircle((hx - 12) * S, (hy - 1) * S, 2.2 * S);
        g.fillCircle((hx + 10) * S, (hy - 1) * S, 2.2 * S);
      }
      g.lineStyle(2.4 * S, shade(NUM.nightHigh, 1.6), .5);   // μία ακμή φωτός
      g.lineBetween((hx - 22) * S, (hy - 8) * S, hx * S, (hy - 22) * S);
      halo.setY((-140 * stretch + bob) * S).setAlpha(.12 + glint * .1);
    };

    // 1. τεντώνεται, οι κόγχες φέγγουν  2. σβήνει (ποτέ κάτω από 0,3) και
    // τρέχει  3. ξαναφαίνεται και μαζεύεται
    const fade = () => {
      c.mult = 2.1; c.multMs = 900;
      this.tweens.add({ targets: c, alpha: .3, duration: 260, ease: 'Quad.easeOut', yoyo: true, hold: 640 });
    };
    const vanish = () => {
      this.tweens.killTweensOf(pose);
      this.tweens.add({
        targets: pose, k: 1, duration: 320, ease: 'Sine.easeOut',
        onComplete: () => {
          fade();
          this.tweens.add({ targets: pose, k: 0, duration: 700, ease: 'Sine.easeInOut' });
        }
      });
    };
    c.windUp = () => {
      if (calm) return;
      this.tweens.killTweensOf(arm);
      this.tweens.add({ targets: arm, r: 1, duration: 160, hold: 180, yoyo: true, ease: 'Quad.easeOut' });
    };

    let nextFadeAt = null;
    c.behave = (time) => {
      if (nextFadeAt === null) nextFadeAt = time + Phaser.Math.Between(2400, 4000);
      draw(time);
      if (time < nextFadeAt) return;
      nextFadeAt = time + Phaser.Math.Between(3400, 5200);
      if (calm) fade();                                   // το σβήσιμο μένει (παιχνίδι), χωρίς κίνηση
      else vanish();
    };
    draw(0);
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
    ].map((p) => ({
      x: p.x * size, y: p.y * size, r: p.r * size, amp: p.amp * size,
      cx: p.x * size, cy: p.y * size
    }));

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

    // Κατάσταση αναπνοής: -1 εισπνοή · 0 ηρεμία · +1 εκπνοή. Το redrawDragon
    // τη διαβάζει και λυγίζει τον λαιμό ανάλογα.
    c.breath = 0;
    c.big = false;          // η επόμενη είναι μικρό «παφ»· εναλλάσσεται
    c.beam = null;
    // Πότε θα βγάλει την πρώτη προειδοποιητική φλόγα
    c.nextBreathAt = this.time.now + Phaser.Math.Between(2600, 5200);
  }

  /**
   * @param {() => void} [done] καλείται όταν το κύμα είναι έτοιμο. Η είσοδος
   *   του Μάστερ Γου είναι σκηνή δύο δευτερολέπτων — η επόμενη λέξη δεν
   *   επιτρέπεται να εμφανιστεί από πάνω της.
   */
  spawnWave(done) {
    this.wave = (this.wave || 0) + 1;
    // Όταν τελειώσουν οι ορδές που στέλνει, κατεβαίνει ο ίδιος.
    if (this.wave % BOSS_EVERY === 0) { this.summonMaster(done); return; }
    // Η δυσκολία προχωρά με τον ΣΤΑΘΜΟ του Δρόμου, όχι μόνο μέσα στη μάχη
    const dw = journey.difficultyWave(this.station, this.cycle, ((this.wave - 1) % BOSS_EVERY) + 1);
    const comp = waveComposition(dw);
    const rush = waveSpeed(dw);
    comp.forEach((archId, i) => {
      const e = this.makeEnemy(SPAWN_X + i * ENEMY_GAP, archId, 1.22 - i * .05);
      e.speed *= rush;                 // κλιμάκωση κύματος (HYPER-NOTE §6)
      e.setAlpha(0);
      this.tweens.add({ targets: e, alpha: 1, duration: 500, delay: i * 160 });
      // Εμφανίζονται μέσα σε καπνό, σαν νίντζα με καπνογόνο (φινίρισμα 11/09)
      this.time.delayedCall(i * 160, () => { if (e.scene) this.smokePuff(e.x, LINE_Y - 50 * (e.size || 1), 16); });
      this.enemies.push(e);
    });
    this.waveHp = this.enemies.reduce((n, e) => n + (e.hp || 0), 0);   // για τη μπάρα κυμάτων
    if (done) done();
  }

  frontEnemy() { return this.enemies[0] || null; }

  // Ο Μάστερ Γου κατεβαίνει ο ίδιος στο πεδίο. Δεν περπατά και δεν πατάει
  // χώμα: χάνεται από τη θέση του και ξαναεμφανίζεται μέσα σε καπνό. Πέντε
  // σωστές απαντήσεις για να διωχτεί (οκτώ στο κάστρο του).
  /**
   * Η είσοδος του Μάστερ Γου (NEXT-FIXES Γ7). Χτίστηκε όταν δεν μιλούσε, οπότε η
   * κορύφωση γίνεται με κίνηση: εξαφανίζεται από το πόστο του, υλοποιείται
   * ψηλά μέσα σε καπνό, ΚΑΤΕΒΑΙΝΕΙ αργά, και ανοίγει το χέρι — από την
   * παλάμη του φεύγουν δύο δαχτυλίδια ενέργειας.
   * @param {() => void} [done]
   */
  summonMaster(done) {
    const m = this.master;
    const arch = archetype('master');
    m.arch = arch;
    m.hp = journey.bossHp(this.station);       // στο κάστρο του αντέχει περισσότερο
    m.maxHp = m.hp;
    this.waveHp = m.hp;
    m.speed = arch.speed;
    m.mult = 1;
    m.multMs = 0;
    m.size = 1;
    m.isMaster = true;
    this.enemies.push(m);

    // Όσο κρατά η σκηνή δεν τρέχει πίεση χρόνου και δεν μετράει άγγιγμα.
    this.busy = true;
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow)
      .setDepth(9).setAlpha(0);
    this.tweens.add({ targets: veil, alpha: .45, duration: 420 });

    // 1. Φεύγει από το ψηλό του πόστο
    audio.poof();
    audio.omen();
    this.smokePuff(m.x, m.y, 26);
    this.tweens.add({ targets: m, alpha: 0, duration: 300, ease: 'Quad.easeIn' });

    // 2. Υλοποιείται ψηλά, μεγάλος, μέσα σε πυκνό καπνό
    const groundY = LINE_Y - 165;
    this.time.delayedCall(420, () => {
      m.setX(SPAWN_X + 40).setDepth(33).setScale(1.62);
      m.baseY = groundY - 190;
      m.setY(m.baseY);
      this.smokePuff(m.x, m.y + 60, 46);
      this.tweens.add({ targets: m, alpha: 1, duration: 380 });
      // Χαμηλά: πιο πάνω η άλως καταπίνει τη σιλουέτα και γίνεται φάντασμα
      this.tweens.add({ targets: m.hpGlow, alpha: .24, duration: 600 });
      // 3. Η κάθοδος — αργή, με το μούσι και τον μανδύα να ακολουθούν
      this.tweens.add({
        targets: m, baseY: groundY, scale: 1.3,
        duration: 1150, ease: 'Sine.easeInOut'
      });
    });

    // Μιλάει καθώς κατεβαίνει (Ε5) — ο οιωνός έχει ήδη ακουστεί, χωρίς ήχο
    this.time.delayedCall(700, () => {
      const lines = TXT.masterDescends;
      this.masterSays(lines[this.station % lines.length], 2400, null, false);
    });

    // 4. Η χειρονομία: ανοίγει την παλάμη και δύο δαχτυλίδια φεύγουν από μέσα
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: m.arm, x: -82, y: -26, scaleX: 1.5, scaleY: 1.15,
        duration: 380, ease: 'Quad.easeOut' });
      // ΜΟΝΟ alpha: το Graphics των ματιών ζωγραφίζει γύρω από το (0,0) του
      // container, οπότε κλίμακα θα τα μετακινούσε από το πρόσωπο.
      this.tweens.add({ targets: m.eyes, alpha: .35,
        duration: 220, yoyo: true, repeat: 2 });
      this.cameras.main.shake(420, .005);
      audio.poof();
      for (let i = 0; i < 2; i++) {
        this.time.delayedCall(i * 190, () => this.sealRing(m.x - 78, m.y - 30, m.fire));
      }
    });

    // 5. Κατεβάζει το χέρι, φεύγει το σκοτάδι, αρχίζει η μάχη
    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: m.arm, x: -44, y: -6, scaleX: 1, scaleY: 1,
        duration: 420, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: veil, alpha: 0, duration: 460 });
    });

    // Ίδιος κανόνας με τον πάπυρο: η συνέχεια είναι χρονόμετρο, όχι tween.
    this.time.delayedCall(2660, () => {
      veil.destroy();
      m.setDepth(11);
      this.busy = false;
      if (done) done();
    });
  }

  // Δαχτυλίδι ενέργειας που ανοίγει από ένα σημείο και σβήνει. Το ίδιο σχήμα
  // χρησιμοποιείται στην είσοδο και στο χτύπημά του — μία γλώσσα, δική του.
  sealRing(x, y, color) {
    const g = this.add.graphics().setDepth(34)
      .setBlendMode(Phaser.BlendModes.ADD);
    const st = { r: 8, a: .95 };
    this.tweens.add({
      targets: st, r: 190, a: 0, duration: 720, ease: 'Quad.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(5 * (1 - st.r / 260), color, st.a);
        g.strokeEllipse(x, y, st.r * 2, st.r * 1.35);
      },
      onComplete: () => g.destroy()
    });
  }

  /**
   * Το χτύπημά του στο λάθος (NEXT-FIXES Γ7). Δεν αφαιρεί τίποτα: ο νίντζα
   * τραντάζεται και επανέρχεται. Είναι δήλωση ΔΙΚΗΣ ΤΟΥ δύναμης, όχι ποινή
   * — καμία απώλεια προόδου, κανένα κόκκινο (SPEC κεφ. 3).
   */
  // Στο λάθος ο Μάστερ Γου ΧΤΥΠΑ — και κάθε φορά με άλλο όπλο (Ζ13: «να
  // μην πετάει μόνο μια μπλε μπάλα»). Επιστρέφει σε πόσα ms βρίσκει τον νίντζα.
  masterStrike(m) {
    this.tweens.add({ targets: m.arm, x: -80, scaleX: 1.5,
      duration: 200, ease: 'Quad.easeOut', yoyo: true, hold: 240 });
    this.tweens.add({ targets: m.eyes, alpha: 1, duration: 160, yoyo: true, repeat: 1 });
    this.sealRing(m.x - 76, m.y - 28, m.fire);
    const kinds = ['spirit', 'kunai', 'seal', 'serpent'];
    const kind = kinds[this.hurlTurn++ % kinds.length];
    return this.hurlAt(m.x - 76, m.y - 28, kind, 220, 1.3);
  }

  // Ο μπροστινός εχθρός απαντά στο λάθος με ΤΟ ΔΙΚΟ ΤΟΥ όπλο (Ζ2: «όπως σου
  // χτυπάει ο μάγος κάτι… να έχει αντίκτυπο πάνω σου»).
  foeStrike(e) {
    const S = e.size || 1;
    let kind = { ninja: 'shuriken', heavy: 'rock', wraith: 'wisp', dragon: 'fireball' }[e.arch.draw] || 'smoke';
    const from = e.spine && e.head ? this.muzzle(e) : { x: e.x - 34 * S, y: e.y - 70 * S };
    // Ζ12: το Τέρας πετά το ΤΣΕΚΟΥΡΙ του — φεύγει από το χέρι και γυρίζει
    // σαν μπούμερανγκ μετά το χτύπημα. Αν είναι ακόμα στον αέρα, βράχο.
    if (kind === 'rock' && e.hasAxe) {
      kind = 'axe';
      e.hasAxe = false;
      const ms = this.hurlAt(e.x - 70 * S, e.y - 150 * S, kind, 260, 1.3);
      this.time.delayedCall(ms + 180, () => this.axeReturn(e));
      return ms;
    }
    return this.hurlAt(from.x, from.y, kind, 200, 1, e.fire);
  }

  /**
   * Βλήμα προς το στήθος του νίντζα. Κάθε είδος έχει δικό του σχήμα, τροχιά
   * και περιστροφή. Στο χτύπημα: ninjaHurt. Επιστρέφει ms ως την πρόσκρουση.
   * @param {string} kind
   * @param {number} delay
   * @param {number} power πόσο δυνατά τινάζεται ο νίντζα
   * @param {number} [tint]
   */
  hurlAt(x, y, kind, delay, power, tint) {
    const tx = NINJA_X + 14, ty = LINE_Y - 96;
    const spec = {
      spirit:   { fly: 380, arc: 0,   spin: 0,    n: 1 },
      kunai:    { fly: 300, arc: 0,   spin: 0,    n: 3 },
      seal:     { fly: 520, arc: 30,  spin: 720,  n: 1 },
      serpent:  { fly: 560, arc: 0,   spin: 0,    n: 5, wave: 46 },
      shuriken: { fly: 340, arc: 18,  spin: 1080, n: 1 },
      rock:     { fly: 520, arc: 120, spin: 360,  n: 1 },
      axe:      { fly: 480, arc: 70,  spin: -1080, n: 1 },
      wisp:     { fly: 460, arc: 0,   spin: 0,    n: 1, wave: 30 },
      fireball: { fly: 360, arc: 10,  spin: 0,    n: 1 },
      smoke:    { fly: 420, arc: 50,  spin: 180,  n: 1 }
    }[kind];
    for (let i = 0; i < spec.n; i++) {
      const obj = this.makeMissile(kind, tint);
      obj.setPosition(x, y).setDepth(15).setAlpha(0);
      // Τα κουνάι ανοίγουν σε βεντάλια· το φίδι είναι σώμα που ακολουθεί
      const spread = kind === 'kunai' ? (i - 1) * 26 : 0;
      const lag = kind === 'serpent' ? i * 45 : kind === 'kunai' ? i * 40 : 0;
      const p = { t: 0 };
      const aim = Math.atan2(ty - y, tx - x) * 180 / Math.PI;
      let trail = null;
      this.tweens.add({
        targets: p, t: 1, duration: spec.fly, delay: delay + lag, ease: 'Quad.easeIn',
        onStart: () => { obj.setAlpha(1); if (i === 0 || kind !== 'serpent') trail = this.missileTrail(obj, kind, tint); },
        onUpdate: () => {
          const t = p.t;
          const dy = spread * (1 - t);
          const wob = spec.wave ? Math.sin(t * Math.PI * 3) * spec.wave * (1 - t) : 0;
          obj.x = x + (tx - x) * t;
          obj.y = y + (ty - y) * t - spec.arc * 4 * t * (1 - t) + dy + wob;
          obj.angle = spec.spin ? spec.spin * t : aim;
        },
        onComplete: () => {
          if (trail) { trail.stop(); this.time.delayedCall(500, () => trail.destroy()); }
          obj.destroy();
          if (i === 0) this.ninjaHurt(power, kind);
        }
      });
    }
    return delay + spec.fly;
  }

  // Τα σχήματα των βλημάτων. Όλα στραμμένα προς τα ΔΕΞΙΑ (γωνία 0): το
  // hurlAt τα γυρίζει προς τον νίντζα.
  makeMissile(kind, tint) {
    const P = (px, py) => new Phaser.Geom.Point(px, py);
    const c = this.add.container(0, 0);
    const glow = (key, s, a = .8) => c.add(this.add.image(0, 0, key).setScale(s).setAlpha(a)
      .setBlendMode(Phaser.BlendModes.ADD));
    const g = this.add.graphics();
    if (kind === 'spirit') {
      glow('glow-spirit', .7, .9);
      g.fillStyle(NUM.spirit, .9); g.fillCircle(0, 0, 13);
    } else if (kind === 'kunai') {                   // σκιερή λεπίδα με δαχτυλίδι
      glow('glow-spirit', .35, .6);
      g.fillStyle(NUM.moon, .95);
      g.fillPoints([P(22, 0), P(4, -6), P(-6, 0), P(4, 6)], true);
      g.fillStyle(NUM.shadow, 1); g.fillRect(-18, -2.5, 13, 5);
      g.lineStyle(2, NUM.spirit, .9); g.strokeCircle(-21, 0, 4);
    } else if (kind === 'seal') {                    // δίσκος σφραγίδας που γυρίζει
      glow('glow-spirit', .9, .7);
      g.lineStyle(4, NUM.spirit, 1); g.strokeCircle(0, 0, 20);
      g.lineStyle(2, NUM.moon, .8); g.strokeCircle(0, 0, 12);
      g.fillStyle(NUM.spirit, 1);
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        g.fillTriangle(Math.cos(a) * 20, Math.sin(a) * 20,
          Math.cos(a + .25) * 29, Math.sin(a + .25) * 29, Math.cos(a + .5) * 20, Math.sin(a + .5) * 20);
      }
    } else if (kind === 'serpent') {                 // κομμάτι του φιδιού από φάντασμα-φωτιά
      glow('glow-spirit', .5, .8);
      g.fillStyle(NUM.spirit, .85); g.fillCircle(0, 0, 9);
      g.fillStyle(NUM.moon, .9); g.fillCircle(3, -2, 3);
    } else if (kind === 'shuriken') {                // αστέρι με τέσσερις μύτες
      g.fillStyle(NUM.smoke, 1);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        g.fillTriangle(Math.cos(a) * 20, Math.sin(a) * 20,
          Math.cos(a + 1.1) * 7, Math.sin(a + 1.1) * 7, Math.cos(a - 1.1) * 7, Math.sin(a - 1.1) * 7);
      }
      g.fillStyle(NUM.moon, .7); g.fillCircle(0, 0, 6);
      g.fillStyle(NUM.shadow, 1); g.fillCircle(0, 0, 3);
    } else if (kind === 'rock') {                    // βράχος με φεγγαρόφωτη κόψη
      g.fillStyle(NUM.stone, 1);
      g.fillPoints([P(-18, -8), P(-6, -19), P(12, -16), P(20, -2), P(14, 15), P(-4, 18), P(-19, 8)], true);
      g.fillStyle(shade(NUM.stone, 1.6), 1);
      g.fillPoints([P(-6, -19), P(12, -16), P(8, -10), P(-4, -12)], true);
      g.fillStyle(shade(NUM.stone, .6), 1);
      g.fillPoints([P(14, 15), P(-4, 18), P(0, 9), P(10, 8)], true);
    } else if (kind === 'axe') {                     // το τσεκούρι του Τέρατος (Ζ12)
      this.drawAxe(g, -44, 0, 1, 0, .62);
    } else if (kind === 'wisp') {                    // σκιά με ουρά
      glow('glow-moon', .45, .25);
      g.fillStyle(NUM.shadow, .95);
      g.fillEllipse(0, 0, 34, 20);
      g.fillTriangle(-10, -8, -40, 0, -10, 8);
      g.fillStyle(NUM.star, .9);
      g.fillEllipse(6, -3, 5, 3); g.fillEllipse(12, -3, 5, 3);
    } else if (kind === 'fireball') {
      glow('glow-flame', .7, .9);
      c.add(this.add.image(0, 0, 'flame').setScale(.42).setAngle(-90)
        .setTint(tint || NUM.flame).setBlendMode(Phaser.BlendModes.ADD));
    } else {                                         // καπνοβόμβα με φυτίλι που σπινθηρίζει
      glow('glow-lantern', .32, .45);
      g.fillStyle(NUM.ridgeHaze, .95); g.fillCircle(0, 0, 15);
      g.fillStyle(shade(NUM.ridgeHaze, .7), 1); g.fillCircle(3, 4, 9);
      g.lineStyle(2, NUM.moon, .45); g.strokeCircle(0, 0, 15);
      g.fillStyle(NUM.lantern, .9); g.fillCircle(-4, -4, 2.5); g.fillCircle(4, -4, 2.5);
      g.fillStyle(NUM.flameCore, 1); g.fillCircle(0, -19, 3.5);
    }
    c.add(g);
    // Μεγάλα, να διαβάζονται στον σκοτεινό ουρανό και σε κινητό
    c.setScale(kind === 'serpent' ? 1.3 : kind === 'axe' ? 1.2 : 1.55);
    return c;
  }

  // Το ίχνος πίσω από κάθε βλήμα, στο χρώμα του — φαίνεται η ΔΙΑΔΡΟΜΗ, άρα
  // και ποιος το έριξε.
  missileTrail(obj, kind, tint) {
    const col = { rock: NUM.stone, axe: NUM.smoke, shuriken: NUM.moon, wisp: NUM.shadow, fireball: tint || NUM.flame,
      smoke: NUM.ridgeHaze }[kind] || NUM.spirit;
    const dark = kind === 'wisp' || kind === 'smoke' || kind === 'rock' || kind === 'axe';
    const em = this.add.particles(0, 0, dark ? 'puff' : 'spark', {
      speed: { min: 4, max: 24 }, scale: { start: dark ? .55 : .5, end: 0 },
      alpha: { start: dark ? .5 : .8, end: 0 }, lifespan: 360,
      blendMode: dark ? 'NORMAL' : 'ADD', tint: col, follow: obj
    }).setDepth(14);
    em.setFrequency(22, 1);
    return em;
  }

  // Ο νίντζα ΝΙΩΘΕΙ το χτύπημα (Ζ2: «να υπάρχει μια κίνηση που να νιώθεις
  // ότι έγιναν… είναι λες και δεν κατάλαβες καν αν έκανες λάθος»): τινάζεται
  // πίσω και ψηλά, αναβοσβήνει, σκόνη στα πόδια, η φλόγα του χεριού σβήνει,
  // και μετά ξαναστέκεται. ΤΙΠΟΤΑ δεν χάνεται — ούτε κόκκινο, ούτε «ΛΑΘΟΣ».
  ninjaHurt(power = 1, kind = 'spirit') {
    const n = this.ninja;
    if (!n || !n.scene) return;
    audio.strike();
    this.cameras.main.shake(200 + 90 * power, .004 + .002 * power);
    const col = { rock: NUM.stone, axe: NUM.moon, shuriken: NUM.moon, wisp: NUM.star, fireball: NUM.lantern, smoke: NUM.smoke }[kind] || NUM.spirit;
    this.sealRing(NINJA_X + 14, LINE_Y - 96, col);
    const bits = this.add.particles(NINJA_X + 14, LINE_Y - 96, 'spark', {
      speed: { min: 60, max: 200 }, angle: { min: 120, max: 240 },
      scale: { start: .55, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 420,
      blendMode: 'ADD', tint: [col, NUM.moon], emitting: false
    }).setDepth(16);
    bits.explode(18);
    this.time.delayedCall(700, () => bits.destroy());
    this.smokePuff(NINJA_X - 30, LINE_Y - 6, 10);

    n.frozen = true;
    this.tweens.killTweensOf(n);
    n.setAngle(0).setAlpha(1);
    this.tweens.add({ targets: this.hand, alpha: 0, duration: 120 });
    this.tweens.add({
      targets: n, x: NINJA_X - 42 * power, y: LINE_Y - 16 * power, angle: -17,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({
        targets: n, x: NINJA_X, y: LINE_Y, angle: 0, duration: 340, delay: 150, ease: 'Back.easeOut',
        onComplete: () => { n.frozen = false; }
      })
    });
    this.tweens.add({ targets: n, alpha: .35, duration: 70, yoyo: true, repeat: 2,
      onComplete: () => n.setAlpha(1) });
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
    const p = this.add.particles(x, y, 'puff', {
      speed: { min: 40, max: 210 }, scale: { start: 1.6, end: 0 },
      alpha: { start: .6, end: 0 }, lifespan: 850, tint: NUM.smoke, emitting: false
    }).setDepth(35);
    p.explode(n);
    this.time.delayedCall(1300, () => p.destroy());
  }

  // Προσωρινή αλλαγή ρυθμού σε ΟΛΗ τη γραμμή — κρατά τον σχηματισμό.
  pace(factor, ms) {
    this.enemies.forEach((e) => { e.mult = factor; e.multMs = ms; });
  }

  update(time, delta) {
    this.sceneMs += delta;
    this.refreshHud();
    if (this.sceneMs >= this.nextSweepAt) { this.nextSweepAt = this.sceneMs + 5000; this.sweepTweens(); }

    // Η ζωή της σκηνής τρέχει ΠΑΝΤΑ — και στα animation και στην τελετή.
    // Τίποτα δεν επιτρέπεται να μοιάζει με ακίνητη ζωγραφιά.
    this.animateEnemies(time);
    this.animateNinja(time);
    this.animateMaster(time);

    if (this._busy && this._busySince !== null
      && this.sceneMs - this._busySince > STUCK_MS) this.unstick();

    // Δεύτερο δίχτυ: ούτε «απασχολημένη» ούτε πρόκληση, με εχθρούς στο πεδίο,
    // για πολλή ώρα = νεκρή οθόνη (μια συνέχεια που χάθηκε). Μόνο αφού έχει
    // παιχτεί πρόκληση σε αυτό το λεβελ: η ιστορία, οι πινακίδες και η ατάκα
    // της αρχής κρατούν νόμιμα έως ~15 δευτ.
    if (!this._busy && !this.current && this.enemies.length && this.hadChallenge) {
      if (this._idleSince == null) this._idleSince = this.sceneMs;
      else if (this.sceneMs - this._idleSince > IDLE_MS) { this._idleSince = null; this.nextChallenge(); }
    } else {
      this._idleSince = null;
    }

    // Βοήθεια στη Μεγάλη Τεχνική (Ζ3): αν περάσει λίγη ώρα χωρίς σωστό
    // πλακίδιο, το επόμενο τρεμοπαίζει. Με χρόνο σκηνής: η παύση το σταματά.
    if (this.assembling && !this._busy) {
      this.asmIdleMs += delta;
      if (this.asmIdleMs >= this.asmHintAt) {
        this.asmHintAt += ASM_HINT_EVERY;
        this.hintTile();
      }
    }

    // Η πίεση του χρόνου, αντίθετα, τρέχει ΜΟΝΟ όσο το παιδί μπορεί
    // πραγματικά να απαντήσει — αλλιώς του κλέβεται χρόνος.
    if (this.busy || !this.current || !this.enemies.length) return;
    if (this.checkShadowFocus(time)) return;

    const dt = delta / 1000;
    for (const e of this.enemies) {
      if (e.frozenUntil) {                       // Πάγος: ακίνητος ώσπου να λιώσει
        if (this.sceneMs < e.frozenUntil) continue;
        this.thaw(e);
      }
      if (e.multMs > 0) {
        e.multMs -= delta;
        if (e.multMs <= 0) { e.mult = 1; e.multMs = 0; }
      }
      // Η Μεγάλη Τεχνική θέλει περισσότερο χρόνο: η πίεση πέφτει στο μισό
      e.x -= e.speed * e.mult * dt * (this.assembling ? .45 : 1);
    }
    if (this.enemies[0].x <= RETREAT_X) {
      // Μέσα στη συναρμολόγηση ο εχθρός σταματά στη γραμμή — η ανασύνταξη
      // θα έσβηνε τα μισοτοποθετημένα πλακίδια.
      if (this.assembling) this.enemies[0].x = RETREAT_X + 1;
      else this.regroup();
    }
  }

  // Ξεκόλλημα: αν οι φούσκες είναι ακόμα στην οθόνη αρκεί να ξαναδεχτούμε
  // άγγιγμα· αλλιώς προχωράμε στην επόμενη λέξη. Ποτέ οθόνη σφάλματος —
  // το παιδί δεν πρέπει καν να καταλάβει ότι κάτι πήγε στραβά.
  //
  // ΠΡΕΠΕΙ να καταλήγει πάντα σε παιχνίδι. Πριν, όταν δεν υπήρχε τρέχουσα
  // πρόκληση (π.χ. στην πρώτη σκηνή του παπύρου), γύριζε χωρίς να κάνει
  // τίποτα και το παιχνίδι έμενε νεκρό για πάντα.
  unstick() {
    this.busy = false;
    if (this.orbs.length) return;
    this.nextChallenge();
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
      if (e.spine) {
        this.redrawDragon(e, time);
        if (e.beam) this.drawBeam(e, time);
        if (e.nextBreathAt && time > e.nextBreathAt) this.dragonBreath(e, time);
      } else if (e.behave && e.active) {
        e.behave(time);
      }
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

    // Η αναπνοή δεν σηκώνει το κεφάλι — λυγίζει τον ΛΑΙΜΟ, και το κεφάλι
    // ακολουθεί επειδή κρέμεται από την κορυφή της ραχοκοκαλιάς. Έτσι δεν
    // ξεκολλάει ποτέ οπτικά από το σώμα (NEXT-FIXES Γ2).
    const b = e.breath || 0;
    for (let i = 0; i < n; i++) {
      sp[i].cy = sp[i].y + Math.sin(time * .0032 + i * .62) * sp[i].amp;
      sp[i].cx = sp[i].x;
      const w = Math.max(0, (i - (n - 4)) / 3);      // 0 στον κορμό, 1 στην κορυφή
      if (!w) continue;
      if (b < 0) {                                    // εισπνοή: μαζεύεται πίσω
        sp[i].cx += 16 * -b * w * S;
        sp[i].cy -= 12 * -b * w * S;
      } else if (b > 0) {                             // εκπνοή: τεντώνεται μπροστά
        sp[i].cx -= 20 * b * w * S;
        sp[i].cy += 8 * b * w * S;
      }
    }

    // Το κεφάλι κάθεται πάνω στην κορυφή του λαιμού, πάντα.
    const tip = sp[n - 1];
    if (e.head) {
      e.head.x = tip.cx - 14 * S;
      e.head.y = tip.cy - 22 * S;
      e.head.angle = b * 9;
    }

    // Περίγραμμα: πάνω ακμή από την ουρά στον λαιμό, κάτω ακμή ανάποδα
    const up = [], lo = [], inner = [];
    for (let i = 0; i < n; i++) {
      const p = sp[i];
      const a = sp[Math.max(i - 1, 0)];
      const c = sp[Math.min(i + 1, n - 1)];
      let tx = c.cx - a.cx, ty = c.cy - a.cy;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;
      const nx = -ty, ny = tx;
      up.push(new Phaser.Geom.Point(p.cx + nx * p.r, p.cy + ny * p.r));
      lo.push(new Phaser.Geom.Point(p.cx - nx * p.r, p.cy - ny * p.r));
      inner.push(new Phaser.Geom.Point(p.cx - nx * p.r * .34, p.cy - ny * p.r * .34));
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
        p.cx - p.nx * p.r * .92, p.cy - p.ny * p.r * .92,
        p.cx - p.nx * p.r * .30, p.cy - p.ny * p.r * .30
      );
    }

    // 5. Αγκάθια στη ράχη — κάθετα στη ραχοκοκαλιά, άρα λυγίζουν μαζί της
    g.fillStyle(e.darkColor, 1);
    for (let i = 1; i < n - 1; i++) {
      const p = sp[i];
      const h = (8 + p.r * .42);
      const bx = p.cx + p.nx * p.r, by = p.cy + p.ny * p.r;
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
      t0.cx + (t0.cx - t1.cx) * .55, t0.cy + (t0.cy - t1.cy) * .55,
      t1.cx + t1.nx * t1.r * .8, t1.cy + t1.ny * t1.r * .8,
      t1.cx - t1.nx * t1.r * .8, t1.cy - t1.ny * t1.r * .8
    );
  }

  // Το στόμα του δράκου σε συντεταγμένες κόσμου — από εκεί βγαίνει η φωτιά.
  // Ακολουθεί το κεφάλι, που με τη σειρά του ακολουθεί τη ραχοκοκαλιά.
  muzzle(e) {
    const S = e.size;
    return { x: e.x + e.head.x - 78 * S, y: e.y + e.head.y + 12 * S };
  }

  /**
   * Η ανάσα του δράκου, ΕΝΑΛΛΑΞ (NEXT-FIXES Γ3):
   *   μικρό «παφ»   — καθώς προχωράει, μια μπουκιά καπνού και σπίθες
   *   ευθεία δέσμη  — μάζεμα, βρυχηθμός, και φωτιά που πετάγεται μπροστά
   * Και στις δύο περιπτώσεις κινείται ο ΛΑΙΜΟΣ, όχι το κεφάλι χωριστά.
   */
  dragonBreath(e, time) {
    e.breathing = true;
    e.big = !e.big;
    const big = e.big;
    e.nextBreathAt = time + (big
      ? Phaser.Math.Between(5400, 7800)
      : Phaser.Math.Between(2800, 4400));

    // 1. Εισπνοή — ο λαιμός μαζεύεται πίσω. Η μεγάλη διαρκεί περισσότερο:
    //    το μάζεμα ΕΙΝΑΙ η προειδοποίηση.
    this.tweens.add({
      targets: e, breath: -1, duration: big ? 440 : 200, ease: 'Quad.easeOut',
      onComplete: () => {
        if (!e.active) return;
        audio.roar(big ? 1 : .35);
        if (big) this.dragonBeam(e); else this.dragonPuff(e);
        // 2. Εκπνοή — τεντώνεται μπροστά, μετά επιστρέφει αργά
        this.tweens.add({
          targets: e, breath: 1, duration: 150, ease: 'Back.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: e, breath: 0, duration: big ? 760 : 420,
              ease: 'Sine.easeInOut',
              onComplete: () => { e.breathing = false; }
            });
          }
        });
      }
    });
  }

  // Το μικρό «παφ»: μια μπουκιά, τίποτα παραπάνω.
  dragonPuff(e) {
    const m = this.muzzle(e);
    const jet = this.add.particles(m.x, m.y, 'spark', {
      speed: { min: 70, max: 200 }, angle: { min: 158, max: 202 },
      scale: { start: .8, end: 0 }, alpha: { start: .9, end: 0 },
      lifespan: { min: 280, max: 520 }, blendMode: 'ADD',
      tint: [e.fire, NUM.flame], emitting: false
    }).setDepth(12);
    jet.explode(14);
    this.time.delayedCall(800, () => jet.destroy());
  }

  // Η ευθεία δέσμη: ζωγραφίζεται καρέ-καρέ στο drawBeam, γιατί πρέπει να
  // ξεκινά ΠΑΝΤΑ από το στόμα — και το στόμα κουνιέται.
  dragonBeam(e) {
    const S = e.size;
    const m = this.muzzle(e);
    const dur = 760;
    audio.flamethrower(dur);
    const em = this.add.particles(m.x, m.y, 'spark', {
      speed: { min: 300, max: 720 }, angle: { min: 171, max: 189 },
      scale: { start: .85, end: 0 }, alpha: { start: .95, end: 0 },
      lifespan: { min: 240, max: 560 }, blendMode: 'ADD',
      tint: [e.fire, NUM.flame, NUM.flameCore],
      frequency: 16, quantity: 2
    }).setDepth(13);
    const g = this.add.graphics().setDepth(12)
      .setBlendMode(Phaser.BlendModes.ADD);
    e.beam = { g, em, t0: this.time.now, dur, len: 320 * S };
  }

  // Η δέσμη είναι μια κορδέλα που ανοίγει προς τα εμπρός: στενή στο στόμα,
  // φαρδιά στην άκρη, με πυρήνα πιο φωτεινό μέσα της. Το τρέμουλο είναι
  // ημιτονοειδές και όχι τυχαίο — η τυχαιότητα ανά καρέ κάνει «χιόνι».
  drawBeam(e, time) {
    const b = e.beam;
    const p = (time - b.t0) / b.dur;
    if (p >= 1 || !e.active) {
      b.g.destroy();
      b.em.stop();
      this.time.delayedCall(700, () => b.em.destroy());
      e.beam = null;
      return;
    }
    const env = p < .14 ? p / .14 : (p > .76 ? (1 - p) / .24 : 1);
    const S = e.size;
    const m = this.muzzle(e);
    const L = b.len * env;
    const SEG = 9;
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG;
      // Δύο ημίτονα σε ασύμβατες συχνότητες: η άκρη σπαρταράει χωρίς να
      // γίνεται «χιόνι», όπως θα γινόταν με τυχαιότητα ανά καρέ.
      const flick = 1 + (.16 * Math.sin(time * .021 + i * 1.7)
                       + .12 * Math.sin(time * .037 + i * 2.9)) * (.3 + f);
      pts.push({
        cx: m.x - L * f,
        cy: m.y + Math.sin(time * .012 + f * 3.4) * 7 * S * f,
        r: (4 + 34 * f * f * .6 + 20 * f) * S * flick
      });
    }
    // Μια μυτερή γλώσσα στην άκρη: χωρίς αυτήν η κορδέλα κλείνει με ίσιο
    // κόψιμο και η φλόγα μοιάζει με χωνί.
    pts.push({
      cx: m.x - L * 1.12,
      cy: m.y + Math.sin(time * .012 + 3.8) * 9 * S,
      r: 6 * S
    });

    const g = b.g;
    g.clear();
    // Τρία στρώματα, καθένα ΚΟΝΤΟΤΕΡΟ από το προηγούμενο. Έτσι η φωτιά είναι
    // λευκή στο στόμα, πορτοκαλί στη μέση και σκούρη στην άκρη — όπως η
    // αληθινή. Ένα ενιαίο ανοιχτόχρωμο στρώμα έβγαζε προβολέα, όχι φλόγα.
    const layer = (n, rf, color, a) => {
      g.fillStyle(color, a * env);
      g.fillPoints(ribbonOutline(pts.slice(0, n).map(
        (q) => ({ cx: q.cx, cy: q.cy, r: q.r * rf }))), true);
    };
    layer(pts.length, 1, NUM.flameDeep, .34);
    layer(SEG,     .70, NUM.flame,     .55);
    layer(6,       .42, e.fire,        .60);
    layer(4,       .26, NUM.flameCore, .85);
    b.em.setPosition(m.x, m.y);
  }

  // Ο νίντζα ΔΕΝ είναι ζωγραφιά: αιωρείται, το σώμα ταλαντεύεται ελάχιστα
  // και η κορδέλα ακολουθεί με καθυστέρηση (secondary motion).
  animateNinja(time) {
    const n = this.ninja;
    if (!n) return;
    // Η σκιά ακολουθεί ΠΑΝΤΑ (και στο άλμα της δύναμης, και στην ανασύνταξη):
    // μικραίνει όσο ψηλώνει ο νίντζα, σβήνει όταν κρύβεται.
    if (this.ninjaShadow) {
      const lift = Math.max(0, LINE_Y - n.y);
      this.ninjaShadow.setPosition(n.x, LINE_Y + 3).setAlpha(.45 * n.alpha)
        .setScale(Math.max(.4, 1 - lift / 160));
    }
    if (this.calm) return;
    this.drawNinjaTails(time);
    if (this.eyes) this.eyes.scaleY = (time % 4300) < 110 ? .12 : 1;
    if (n.frozen) return;
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

    // Το μανίκι ακολουθεί το χέρι, με μια καμπύλη στον αγκώνα
    const a = m.arm;
    const sg = m.sleeveG;
    sg.clear();
    const sx = -24, sy = -16;                       // ώμος
    const ex = a.x + 6, ey = a.y;                   // καρπός
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const f = i / 4;
      pts.push({
        cx: sx + (ex - sx) * f,
        cy: sy + (ey - sy) * f + Math.sin(f * Math.PI) * 12,   // πέφτει ο αγκώνας
        r: 15 - 5 * f
      });
    }
    sg.fillStyle(NUM.shadow, .98);
    sg.fillPoints(ribbonOutline(pts), true);
  }

  // ----------------------------------------------------------- η περγαμηνή

  buildScroll() {
    this.scroll = this.add.container(W / 2, 152).setDepth(20);
    // Το χαρτί είναι ψημένο texture (κόκκος, ίνες, ακανόνιστη άκρη) και όχι
    // σκέτο ορθογώνιο — έμοιαζε με κάρτα, όχι με περγαμηνή (NEXT-FIXES Γ9).
    const sheet = this.add.image(0, 0, 'paper-scroll');
    // Ξύλινοι κύλινδροι δεξιά κι αριστερά, με φως και σκιά στον άξονα
    const bg = this.add.graphics();
    bg.fillStyle(NUM.dojoRoof, 1);
    bg.fillRoundedRect(-338, -66, 20, 132, 10);
    bg.fillRoundedRect(318, -66, 20, 132, 10);
    bg.fillStyle(NUM.stone, .8);
    bg.fillRoundedRect(-334, -60, 6, 120, 3);
    bg.fillRoundedRect(322, -60, 6, 120, 3);
    // Το χαρτί τυλίγεται γύρω από τους κυλίνδρους: σκιά στις δύο άκρες του
    bg.fillStyle(NUM.ink, .16);
    bg.fillRect(-320, -56, 12, 112);
    bg.fillRect(308, -56, 12, 112);
    this.scroll.add([sheet, bg]);
    this.scroll.setScale(0, 1).setAlpha(0);

    this.label = this.add.text(W / 2, 70, '', {
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
  /**
   * Ζωγραφίζει τη λέξη με το κενό της.
   *
   * ΚΡΙΣΙΜΟ: το πλάτος του κενού βγαίνει από το ΦΑΡΔΥΤΕΡΟ υποψήφιο, όχι από
   * τον στόχο. Αλλιώς το ίδιο το κενό δίνει την απάντηση — ένα στενό κενό
   * αποκλείει το «ει», ένα φαρδύ αποκλείει το «ι», και για τα διπλά σύμφωνα
   * (ν / νν) η ερώτηση δεν θα μπορούσε καν να τεθεί (NEXT-FIXES Β3).
   *
   * @param {string} text
   * @param {{start:number,length:number}} gap
   * @param {{revealed:boolean, candidates?:string[]}} opts
   */
  layoutWord(text, gap, { revealed, candidates }) {
    this.wordParts?.forEach((o) => o.destroy());
    const style = { fontFamily: FONT.word, fontSize: '58px', color: HEX.ink };
    const before = text.slice(0, gap.start);
    const target = text.substr(gap.start, gap.length);
    const after = text.slice(gap.start + gap.length);

    const tBefore = this.add.text(0, 0, before, style).setOrigin(0, .5).setDepth(22);
    const tGap = this.add.text(0, 0, target, style).setOrigin(.5, .5).setDepth(22);
    const tAfter = this.add.text(0, 0, after, style).setOrigin(0, .5).setDepth(22);

    // Το φαρδύτερο υποψήφιο ορίζει την υποδοχή. Μετριέται με προσωρινό
    // κείμενο ίδιου στυλ — το Phaser δεν δίνει πλάτος χωρίς αντικείμενο.
    let gapW = tGap.width;
    for (const c of (candidates || [])) {
      const probe = this.add.text(0, 0, c, style).setVisible(false);
      gapW = Math.max(gapW, probe.width);
      probe.destroy();
    }

    const total = tBefore.width + gapW + tAfter.width;
    let x = W / 2 - total / 2;
    const y = 152;
    tBefore.setPosition(x, y); x += tBefore.width;
    const gapX = x;
    tGap.setPosition(gapX + gapW / 2, y);     // κεντραρισμένο μέσα στην υποδοχή
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

  // Έναρξη συνεδρίας: ΟΛΕΣ οι νέες λέξεις μαζεύονται μία φορά και τις καίει
  // ο Μάστερ Γου σε μία σκηνή. Δεν περνούν πια μία-μία μπροστά από το παιδί
  // — αυτό έμοιαζε με λέξεις που «κάηκαν» χωρίς λόγο, και πρόδιδε την
  // ορθογραφία τους χωρίς να τη ζητήσει κανείς.
  // Ένα ΛΕΒΕΛ = τα κύματα μέχρι να κατέβει ο ίδιος ο Μάστερ Γου. Ο πάπυρος
  // στην αρχή του λεβελ δείχνει μόνο τις λέξεις ΑΥΤΟΥ του λεβελ — όχι όλες.
  // Όταν τον νικήσεις, ανοίγει νέο λεβελ με νέο πάπυρο.
  //
  // ΟΛΕΣ οι νέες λέξεις του λεβελ (NEXT-FIXES Δ1). Πριν, το όριο των τριών
  // τελετών του scheduler μετρούσε ΣΤΟΧΟΥΣ: με 3 λέξεις των 2 σημείων
  // έκλεινε η πόρτα μετά τη δεύτερη λέξη, και η τρίτη περνούσε αργότερα
  // αθέατη. Τώρα ζητάμε 'first' — όλοι οι νέοι στόχοι, λέξη-λέξη — και
  // σταματάμε σε όριο ΛΕΞΕΩΝ. Όσες περισσέψουν περιμένουν τον επόμενο πάπυρο.
  openLevel() {
    this.clearOrbs();
    this.current = null;
    const words = [];
    let held = null;
    for (let i = 0; i < 60; i++) {
      // Και συναρμολόγηση: έτσι παρουσιάζονται στον πάπυρο και οι λέξεις
      // που ΔΕΝ ρωτιούνται με κενό (το «ου») — θα τις ζητήσει η Μεγάλη Τεχνική.
      const ch = engine.getNextChallenge(this.profileId, { types: ['gap', 'assembly'], intro: 'first' });
      if (!ch) break;
      if (ch.type !== 'intro') { held = ch; break; }
      if (!words.includes(ch.text)) {
        if (words.length >= WORDS_PER_LEVEL) break;   // για τον επόμενο πάπυρο
        words.push(ch.text);
      }
      this.consumeIntro(ch);
    }
    if (words.length) this.burnScroll(words, () => this.startChallenge(held));
    else this.startChallenge(held);
  }

  // Η τελετή γίνεται στη σκηνή του παπύρου, όχι στη μάχη: εδώ απλώς
  // δηλώνουμε στο Learning Engine ότι ο στόχος παρουσιάστηκε.
  consumeIntro(ch) {
    this.hardTargets.add(ch.targetId);
    engine.reportResult({
      challengeId: ch.challengeId, wordId: ch.wordId, targetId: ch.targetId,
      profileId: this.profileId, type: 'intro', correct: true,
      chosenGrapheme: null, revealUsed: false, durationMs: 0
    });
  }

  startChallenge(ch) {
    if (!ch) { this.nextChallenge(); return; }
    // Φρουρά: η σκηνή ξέρει να δείχνει ΜΟΝΟ προκλήσεις με κενό και υποψήφια.
    // Μια τελετή (intro) δεν έχει ούτε τα δύο· αν έφτανε ως εδώ, το
    // layoutWord έσκαγε και το παιχνίδι κολλούσε με άδεια περγαμηνή.
    const playable = ch.type === 'assembly'
      ? ch.pieces && ch.pieces.length > 1
      : ch.gap && ch.candidates && ch.candidates.length;
    if (!playable) {
      if (ch.type === 'intro') this.consumeIntro(ch);
      this.nextChallenge();
      return;
    }
    this.current = ch;
    this.hadChallenge = true;
    this.reported = false;
    this.revealed = false;
    this.tries = 0;
    // Δεύτερη ευκαιρία ΜΟΝΟ όταν μετά το πρώτο λάθος μένουν τουλάχιστον
    // τρεις επιλογές. Σε ο/ω (ή ε/αι, ν/νν, αυ/αϋ) το πρώτο λάθος αφήνει
    // μία — η «δεύτερη προσπάθεια» θα ήταν σίγουρη νίκη. Με τρεις, μένουν
    // δύο: κορώνα-γράμματα. Και στις δύο περιπτώσεις το παιδί θα έπαιζε
    // στην τύχη αντί να θυμηθεί (απαίτηση ιδιοκτήτη 10/09).
    this.maxTries = ch.type === 'assembly' ? 1 : (ch.candidates.length >= 4 ? MAX_TRIES : 1);
    this.assembling = false;
    this.assemblyMiss = null;
    this.lostWord = false;
    this.startedAt = performance.now();
    if (ch.type === 'assembly') this.showAssembly(ch);
    else this.showGap(ch);
  }

  // Η Μεγάλη Τεχνική ζητείται μόνο απέναντι σε ΜΕΓΑΛΟ εχθρό (BUILD_PLAN
  // βήμα 5, DESIGN). Το αν θα δοθεί το αποφασίζει το Learning Engine, που
  // εναλλάσσει τους τύπους ανά στόχο.
  // ΜΙΑ ανά κύμα: στη μεγάλη δοκιμή (7 σταθμοί) έβγαινε σχεδόν κάθε δεύτερη
  // πρόκληση, γιατί ο δράκος ήταν συχνά μπροστά — και η «μεγάλη» τεχνική
  // γινόταν ρουτίνα με πολύ πάτημα πλακιδίων.
  challengeTypes() {
    const f = this.enemies[0];
    const big = f && (f.isMaster || ['dragon', 'heavy'].includes(f.arch && f.arch.id));
    return big && this.asmWave !== this.wave ? ['gap', 'assembly'] : ['gap'];
  }

  // ---------------------------------------- Μεγάλη Τεχνική (συναρμολόγηση)
  //
  // Όλα τα γραφήματα της λέξης πέφτουν ανακατεμένα ως πυρωμένα πλακίδια· το
  // παιδί τα αγγίζει ΜΕ ΤΗ ΣΕΙΡΑ. Η δεξαμενή έχει ΜΟΝΟ τα γνήσια γραφήματα
  // (invariant 1) και ένα πλακίδιο μπαίνει στην περγαμηνή ΜΟΝΟ αν είναι το
  // σωστό επόμενο — άρα η λάθος μορφή δεν σχηματίζεται ποτέ.
  // Το άγγιγμα αντικαθιστά το σύρσιμο του DESIGN: ίδιο μάθημα, πιο σίγουρο
  // για παιδικό δάχτυλο σε κινητό.

  showAssembly(ch) {
    this.clearOrbs();
    this.busy = false;
    this.assembling = true;
    this.asmWave = this.wave;
    this.placed = 0;
    this.asmIdleMs = 0;
    this.asmHintAt = ASM_HINT_MS;
    this.asmHinted = false;
    this.units = splitGraphemes(ch.text);
    this.label.setText(TXT.bigTechnique).setAlpha(1);
    this.showScroll();
    this.layoutSlots(this.units);
    this.spawnTiles(ch.pieces);
    audio.cast();
  }

  // Κουτάκια ΙΣΟΥ πλάτους: αν το κουτάκι του «ει» ήταν φαρδύτερο από του
  // «ι», το ίδιο το κουτάκι θα έλεγε πού πάει κάθε πλακίδιο.
  layoutSlots(units) {
    this.wordParts?.forEach((o) => o.destroy());
    const style = { fontFamily: FONT.word, fontSize: '58px', color: HEX.ink };
    const texts = units.map((u) => this.add.text(0, 0, u, style).setOrigin(.5).setDepth(22).setAlpha(0));
    const slotW = Math.max(46, ...texts.map((t) => t.width)) + 12;
    const k = Math.min(1, 620 / (slotW * units.length));
    const w = slotW * k;
    const y = 152;
    let x = W / 2 - (w * units.length) / 2;
    const line = this.add.graphics().setDepth(22);
    line.fillStyle(NUM.flame, .9);
    texts.forEach((t) => {
      t.setScale(k).setPosition(x + w / 2, y);
      line.fillRoundedRect(x + 5, y + 30, w - 10, 5, 2.5);
      x += w;
    });
    this.wordParts = [...texts, line];
    this.slotTexts = texts;
  }

  spawnTiles(pieces) {
    const n = pieces.length;
    const boost = this.orbBoost();
    const rows = n > 6 ? [pieces.slice(0, Math.ceil(n / 2)), pieces.slice(Math.ceil(n / 2))] : [pieces];
    let idx = 0;
    rows.forEach((row, r) => {
      const spread = Math.min(122, 700 / Math.max(row.length - 1, 1));
      const startX = W / 2 - (spread * (row.length - 1)) / 2;
      row.forEach((p, i) => {
        const x = startX + i * spread + (rows.length > 1 && r ? spread / 2 - spread / 2 : 0);
        const y = rows.length > 1 ? (r ? 382 : 292) : 330 + (i % 2 ? 16 : -8);
        const tile = this.add.container(x, y).setDepth(25);
        const glow = this.add.image(0, 0, 'glow-flame').setScale(.7).setAlpha(.5)
          .setBlendMode(Phaser.BlendModes.ADD);
        const g = this.add.graphics();
        g.fillStyle(NUM.flameDeep, 1);
        g.fillRoundedRect(-38, -38, 76, 76, 14);
        g.fillStyle(NUM.lantern, .92);
        g.fillRoundedRect(-32, -34, 64, 64, 11);
        const txt = this.add.text(0, 0, p, {
          fontFamily: FONT.word, fontSize: '40px', fontStyle: '700', color: HEX.ink
        }).setOrigin(.5);
        tile.add(this.add.container(0, 0, [glow, g, txt]).setScale(boost));
        tile.setData('grapheme', p);
        tile.setSize(ORB_HIT * boost, ORB_HIT * boost).setInteractive({ useHandCursor: true });
        tile.on('pointerdown', () => this.chooseTile(tile));
        tile.setScale(0);
        this.tweens.add({ targets: tile, scale: 1, duration: 320, delay: idx * 70, ease: 'Back.easeOut' });
        this.orbs.push(tile);
        idx += 1;
      });
    });
  }

  chooseTile(tile) {
    if (this.busy || !this.assembling || !tile.input || !tile.input.enabled) return;
    const want = this.units[this.placed];
    const got = tile.getData('grapheme');
    if (got === want) {
      tile.disableInteractive();
      this.tweens.killTweensOf(tile);
      const slot = this.slotTexts[this.placed];
      audio.chime(Math.min(this.placed, 3));
      this.placed += 1;
      this.asmIdleMs = 0;                        // το ρολόι της βοήθειας ξαναρχίζει
      this.asmHintAt = ASM_HINT_MS;
      this.tweens.add({
        targets: tile, x: slot.x, y: slot.y, scale: .45, alpha: 0, duration: 260, ease: 'Quad.easeIn',
        onComplete: () => {
          tile.destroy();
          slot.setAlpha(1);
          const flash = this.add.image(slot.x, slot.y, 'glow-lantern').setScale(.35).setAlpha(.9)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(21);
          this.tweens.add({ targets: flash, alpha: 0, scale: 1, duration: 420, onComplete: () => flash.destroy() });
        }
      });
      if (this.placed >= this.units.length) {
        this.assembling = false;
        this.busy = true;
        this.time.delayedCall(360, () => this.assemblyDone());
      }
      return;
    }
    // Λάθος σειρά: το πλακίδιο τινάζεται και σβήνει για λίγο. Κανένα
    // κόκκινο, και ΔΕΝ μπαίνει στην περγαμηνή — η λάθος μορφή δεν φαίνεται.
    this.assemblyMiss = got;
    this.combo = 0;
    this.addRage(-RAGE_MISS);
    this.hardTargets.add(this.current.targetId);
    audio.fizzle();
    this.pace(HASTE_FACTOR, HASTE_MS);
    // Και εδώ το λάθος το νιώθει ο νίντζα (Ζ2) — αλλά ένα χτύπημα τη φορά,
    // όσα πλακίδια κι αν πατηθούν στη σειρά.
    if (this.sceneMs >= this.nextAsmHurtAt) {
      this.nextAsmHurtAt = this.sceneMs + 1400;
      const boss = this.enemies.find((e) => e.isMaster);
      const foe = boss || this.enemies.find((e) => !e.frozenUntil);
      if (foe) { if (boss) this.masterStrike(boss); else this.foeStrike(foe); }
    }
    this.tweens.add({ targets: tile, angle: 9, duration: 55, yoyo: true, repeat: 3,
      onComplete: () => tile.setAngle(0) });
    this.tweens.add({ targets: tile, alpha: .45, duration: 120, hold: 260, yoyo: true });
  }

  // Το επόμενο σωστό πλακίδιο τρέμει και φέγγει για μια στιγμή (Ζ3). Ένα
  // ΓΝΗΣΙΟ γράφημα της λέξης — η βοήθεια δεν σχηματίζει ποτέ λάθος μορφή.
  // Βοήθεια όμως δεν είναι ανάκληση: η λέξη δεν μετρά ως σωστή (assemblyDone).
  hintTile() {
    const want = this.units && this.units[this.placed];
    const tile = this.orbs.find((t) => t && t.scene && t.input && t.input.enabled
      && t.getData('grapheme') === want);
    if (!tile) return;
    this.asmHinted = true;
    this.tweens.add({ targets: tile, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 5,
      onComplete: () => tile.setAngle(0) });
    this.tweens.add({ targets: tile, scale: 1.16, duration: 200, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
      onComplete: () => tile.setScale(1) });
    const f = this.add.image(tile.x, tile.y, 'glow-lantern').setScale(.6).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(24);
    this.tweens.add({ targets: f, alpha: .9, scale: .9, duration: 220, yoyo: true, repeat: 1,
      onComplete: () => f.destroy() });
  }

  // Κλείδωσε και το τελευταίο: η λέξη φαίνεται ολόκληρη σε κανονική γραφή
  // και ένα κύμα φωτιάς σαρώνει το πεδίο (DESIGN «Μεγάλη Τεχνική»).
  assemblyDone() {
    const ch = this.current;
    // Με βοήθεια (Ζ3) η λέξη ΔΕΝ μετρά ως σωστή — όπως και στις φούσκες η
    // προσπάθεια μετά το λάθος: είναι αντιγραφή, όχι ανάκληση.
    const correct = !this.assemblyMiss && !this.asmHinted;
    if (!this.reported) {
      this.reported = true;
      engine.reportResult({
        challengeId: ch.challengeId, wordId: ch.wordId, targetId: ch.targetId,
        profileId: this.profileId, type: ch.type, correct,
        // Ένα γνήσιο γράφημα σε λάθος θέση ΔΕΝ είναι σύγχυση γραφήματος —
        // δεν μπαίνει στο ιστορικό λαθών της κλάσης.
        chosenGrapheme: null,
        revealUsed: !!this.asmHinted,
        durationMs: Math.round(performance.now() - this.startedAt)
      });
    }
    if (correct) { this.combo += 1; this.addRage(RAGE_COMBO); }
    this.layoutWord(ch.text, ch.gap, { revealed: true, candidates: [] });
    this.label.setAlpha(0);
    this.fireWave();
  }

  // Ζ9: τα γράμματα της λέξης μπαίνουν στα χέρια του και φεύγει ΜΕΓΑΛΗ δίνη
  // φωτιάς (powers.js → greatWave) που χτυπά τον καθένα τη στιγμή που τον
  // περνά. Ο μπροστινός (ο μεγάλος) τρώει διπλό, οι υπόλοιποι ένα.
  fireWave() {
    const ch = this.current;
    const hitTime = this.greatWave(ch ? splitGraphemes(ch.text) : []);
    const targets = [...this.enemies];
    targets.forEach((e, i) => this.time.delayedCall(hitTime(e.x), () => {
      if (!e.scene || !this.enemies.includes(e)) return;
      e.hp -= i === 0 ? 2 : 1;
      if (e.hp > 0) this.flinchEnemy(e);
      else { this.enemies = this.enemies.filter((x) => x !== e); this.killEnemy(e); }
    }));
    const lastHit = Math.max(900, ...targets.map((e) => hitTime(e.x)));
    this.time.delayedCall(lastHit + 120, () => this.pushBackLine());
    this.time.delayedCall(hitTime(W) + 300, () => this.hideScroll(() => this.advanceIfCleared(() => this.nextChallenge())));
  }

  nextChallenge() {
    this.clearOrbs();
    let ch = null;
    // Στη μέση του λεβελ ΠΟΤΕ τελετή ('never'): οι νέες λέξεις περιμένουν
    // τον επόμενο πάπυρο. Πριν, μια τελετή εδώ «καταναλωνόταν» σιωπηλά — η
    // λέξη περνούσε αθέατη ΚΑΙ μετρούσε ως τελευταία λέξη, οπότε μετά από
    // χαμένη λέξη ξαναερχόταν η ίδια. Ο βρόχος μένει μόνο ως δίχτυ.
    for (let i = 0; i < 12; i++) {
      ch = engine.getNextChallenge(this.profileId, { types: this.challengeTypes(), intro: 'never' });
      if (!ch) break;
      if (ch.type !== 'intro') break;
      this.consumeIntro(ch);
      ch = null;
    }
    if (!ch) { this.showNoWords(); return; }
    this.startChallenge(ch);
  }

  // ------------------------------------------- η σκηνή του καμένου παπύρου

  // Ο Μάστερ Γου ξεδιπλώνει τον πάπυρο με τις λέξεις της ημέρας, τον
  // πυρπολεί και τα γράμματα γίνονται καπνός. Αυτός τις έκλεψε — γι' αυτό
  // λείπουν γράμματα μέσα στη μάχη.
  burnScroll(words, done) {
    this.busy = true;
    const shown = words.slice(0, 8);
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setDepth(30).setAlpha(0);
    const cx = W / 2 - 90, cy = 330;                 // αριστερά, ο μάγος δεξιά
    const w2 = 230, h2 = 46 + shown.length * 25;

    // Ο πάπυρος: φύλλο με δύο ξύλινους κυλίνδρους, κόκκινα λακαρισμένα
    // πόμολα και τη σφραγίδα-φλόγα του ντότζο στη γωνία (φινίρισμα 11/09 —
    // ήταν σκέτο ορθογώνιο χαρτί). Όλα σε ένα container: ανοίγουν και
    // καίγονται μαζί.
    const sheet = this.add.image(0, 0, 'paper-sheet').setDisplaySize(w2 * 2, h2 * 2);
    const deco = this.add.graphics();
    for (const yy of [-h2 - 7, h2 + 7]) {
      deco.fillStyle(NUM.ink, 1);
      deco.fillRoundedRect(-w2 - 24, yy - 9, w2 * 2 + 48, 18, 9);
      deco.fillStyle(NUM.parchment, .12);                      // γυαλάδα του ξύλου
      deco.fillRoundedRect(-w2 - 20, yy - 7, w2 * 2 + 40, 5, 2.5);
      deco.fillStyle(NUM.flameDeep, .95);
      deco.fillCircle(-w2 - 24, yy, 11);
      deco.fillCircle(w2 + 24, yy, 11);
    }
    deco.fillStyle(NUM.flameDeep, .85);                          // η σφραγίδα
    deco.fillRoundedRect(w2 - 60, h2 - 60, 42, 42, 7);
    world.drawPerkIcon(deco, 'blaze', w2 - 39, h2 - 39, 14, NUM.parchment, .95);
    const halo = this.add.image(0, 0, 'glow-lantern').setScale(2.6, 1.7).setAlpha(.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    const paper = this.add.container(cx, cy, [halo, sheet, deco]).setDepth(31).setScale(.2).setAlpha(0);

    const lines = shown.map((w, i) => this.add.text(
      cx, cy - (shown.length - 1) * 25 + i * 50, w,
      { fontFamily: FONT.word, fontSize: '34px', color: HEX.ink }
    ).setOrigin(.5).setDepth(32).setAlpha(0));

    const m = this.master;
    const home = { x: m.x, baseY: m.baseY, depth: m.depth, scale: m.scale };

    this.tweens.add({ targets: veil, alpha: .72, duration: 420 });
    this.tweens.add({ targets: paper, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 520, ease: 'Back.easeOut' });
    lines.forEach((t, i) => this.tweens.add({ targets: t, alpha: 1, duration: 300, delay: 520 + i * 150 }));

    // 1. Ο μάγος έρχεται στην ΑΚΡΗ του παπύρου, όχι από πάνω του.
    //    Οι λέξεις φαίνονται λίγο — ελάχιστα παραπάνω από μια ματιά.
    const enterAt = 900 + shown.length * 150;
    this.time.delayedCall(enterAt, () => {
      audio.poof();
      this.smokePuff(m.x, m.y, 22);
      m.setDepth(33).setScale(1.15);
      m.x = cx + 420;
      m.baseY = cy + 10;
      this.tweens.add({ targets: m, x: cx + 330, duration: 620, ease: 'Quad.easeOut' });
    });

    // 2. Σηκώνει το χέρι και πυρπολεί τον πάπυρο
    this.time.delayedCall(enterAt + 780, () => {
      this.tweens.add({ targets: m.arm, x: -78, scaleX: 2.1, duration: 420, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: m.eyes, alpha: .3, duration: 220, yoyo: true, repeat: 3 });
    });

    this.time.delayedCall(enterAt + 1200, () => {
      audio.whoosh();
      audio.flamethrower(520);
      this.cameras.main.shake(300, .004);
      const jet = this.add.particles(cx + 285, cy, 'spark', {
        speed: { min: 160, max: 420 }, angle: { min: 168, max: 192 },
        scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 },
        lifespan: { min: 420, max: 760 }, blendMode: 'ADD',
        tint: [NUM.flameCore, NUM.flame, NUM.flameDeep], emitting: false
      }).setDepth(34);
      jet.explode(70);
      this.time.delayedCall(1400, () => jet.destroy());

      // 3. Τα γράμματα καίγονται και γίνονται καπνός
      lines.forEach((t, i) => {
        this.time.delayedCall(120 + i * 130, () => {
          const burn = this.add.particles(t.x, t.y, 'spark', {
            speed: { min: 30, max: 130 }, angle: { min: 250, max: 290 },
            scale: { start: 1, end: 0 }, alpha: { start: .8, end: 0 },
            lifespan: { min: 500, max: 950 }, tint: [NUM.flame, NUM.smoke], emitting: false
          }).setDepth(34);
          burn.explode(22);
          this.time.delayedCall(1200, () => burn.destroy());
          this.tweens.add({ targets: t, alpha: 0, y: t.y - 26, duration: 620, ease: 'Quad.easeOut' });
        });
      });
      this.tweens.add({
        targets: paper, alpha: 0, scaleY: .06, y: cy + 40,
        duration: 900, delay: 300 + shown.length * 130, ease: 'Quad.easeIn'
      });
    });

    // 4. Σβήνει και επιστρέφει στο πόστο του· αρχίζει η μάχη
    const endAt = enterAt + 2400 + shown.length * 130;
    this.time.delayedCall(endAt, () => {
      audio.poof();
      this.smokePuff(m.x, m.y, 26);
      this.tweens.add({
        targets: m, alpha: 0, duration: 340,
        onComplete: () => {
          m.setDepth(home.depth).setScale(home.scale);
          m.x = home.x;
          m.baseY = home.baseY;
          m.arm.setPosition(-44, -6).setScale(1);
          this.tweens.add({ targets: m, alpha: .92, duration: 420 });
        }
      });
      this.tweens.add({ targets: veil, alpha: 0, duration: 520 });
    });

    // Η ΣΥΝΕΧΕΙΑ ΤΟΥ ΠΑΙΧΝΙΔΙΟΥ ΔΕΝ ΚΡΕΜΕΤΑΙ ΑΠΟ TWEEN. Ήταν στο onComplete
    // του σκοταδιού: αν χανόταν εκείνο το tween (χαμένα καρέ, στόχος που
    // καταστράφηκε, εναλλαγή εφαρμογής στη μέση), το done() δεν καλούνταν
    // ποτέ και το παιχνίδι έμενε στον καμένο πάπυρο. Τώρα είναι χρονόμετρο:
    // τα χρονόμετρα δεν εξαρτώνται από στόχους που μπορεί να μην υπάρχουν.
    this.time.delayedCall(endAt + 560, () => {
      veil.destroy();
      paper.destroy();
      lines.forEach((t) => t.destroy());
      this.busy = false;
      done();
    });
  }

  showGap(ch) {
    // ΠΑΝΤΑ από καθαρή οθόνη. Υπάρχουν διαδρομές που φτάνουν εδώ χωρίς να
    // έχουν περάσει από nextChallenge() — π.χ. το τέλος του λεβελ μετά τη
    // νίκη επί του Μάστερ Γου. Χωρίς αυτό, οι φούσκες της προηγούμενης
    // λέξης έμεναν στον πίνακα, μισοκατεστραμμένες, και το πρώτο άγγιγμα
    // στη νέα λέξη έσκαγε πάνω τους.
    this.clearOrbs();
    this.busy = false;
    this.label.setAlpha(0);
    this.showScroll();
    const center = this.layoutWord(ch.text, ch.gap,
      { revealed: false, candidates: ch.candidates });
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
    this.orbs.forEach((o) => {
      if (!o || !o.scene) return;              // το είχε ήδη πάρει κάποιο tween
      this.tweens.killTweensOf(o);
      o.destroy();
    });
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
    if (correct) {
      this.combo += 1;
      this.addRage(this.combo >= COMBO_BRIGHT ? RAGE_COMBO : RAGE_HIT);
    } else {
      this.addRage(-RAGE_MISS);
      this.combo = 0;
      this.hardTargets.add(ch.targetId);
      this.tries = (this.tries || 0) + 1;
      this.lostWord = this.tries >= this.maxTries;
    }

    if (correct) this.castFlame(orb);
    else this.flameFails(orb);
  }

  // ------------------------------------------------------------ επιτυχία

  castFlame(orb) {
    this.orbs.filter((o) => o !== orb && o && o.scene).forEach((o) => {
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
    // Ζ5: η φωτιά είναι για τους μακρινούς· όποιος πλησίασε τρώει σπαθιά
    const front = this.frontEnemy();
    if (front && front.x - NINJA_X < MELEE_DIST) { this.swordStrike(front); return; }
    // Ο μαγικός ήχος ξεκινά ΕΔΩ, όχι στην αρπαγή: το ανοδικό γλίστρημα
    // καλύπτει το μάζεμα και η καμπάνα χτυπά ακριβώς στην εκτόξευση.
    audio.cast();
    this.ninja.frozen = true;
    const bright = this.combo >= COMBO_BRIGHT;   // 3 σωστά: πιο φωτεινή φλόγα
    // Γρήγορη Φόρτιση (τεχνική): το μάζεμα σχεδόν στο μισό
    const charge = this.perks.includes('swift') ? 170 : 320;
    this.tweens.add({
      targets: this.ninja, x: NINJA_X - 18, angle: 8,
      duration: charge, ease: 'Quad.easeOut'
    });
    this.tweens.add({
      targets: this.hand, scale: bright ? 1.55 : 1.2, alpha: bright ? 1 : .9,
      duration: charge, ease: 'Quad.easeOut',
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

    const big = this.perks.includes('blaze');            // Μεγάλη Φλόγα (τεχνική)
    // Ζ10: το όπλο είναι της ΖΩΝΗΣ — φλόγα · πλάσμα · ηλεκτρισμός · αστέρι
    const weapon = journey.weaponFor(this.cycle);
    if (weapon === 'volt') { this.tweens.add({ targets: this.hand, alpha: 0, scale: .5, duration: 200 }); this.voltShot(target, big); return; }
    const { obj: bolt, s0, s1, tint } = this.makeBolt(weapon, big);
    bolt.setPosition(this.ninja.x + 56, this.ninja.y - 78).setScale(s0).setDepth(14);
    const trail = this.add.particles(0, 0, 'spark', {
      speed: { min: 10, max: 50 }, scale: { start: .5, end: 0 },
      alpha: { start: .8, end: 0 }, lifespan: 420, blendMode: 'ADD',
      tint, follow: bolt
    });
    trail.setFrequency(big ? 9 : 18, big ? 2 : 1);
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
      targets: bolt, x: tx, scale: s1, duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        if (weapon !== 'fire' && target && target.scene) this.sealRing(tx, target.y - 60, tint[0]);
        this.destroyDeep(bolt);
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
    // Δίδυμη Φλόγα (τεχνική): δεύτερη, μικρότερη βολή στον επόμενο της γραμμής
    if (this.perks.includes('twin')) {
      const e2 = this.enemies.find((x) => x !== e);
      if (e2) this.twinStrike(e2);
    }
    this.pushBackLine();

    // Η σωστή λέξη μένει ολόκληρη για μια ανάσα, μετά επόμενη πρόκληση
    this.time.delayedCall(820, () => {
      this.hideScroll(() => this.advanceIfCleared(() => this.nextChallenge()));
    });
  }

  // Άδειασε το πεδίο; → νέο κύμα. Αν ήταν ο Μάστερ Γου, ο ΣΤΑΘΜΟΣ κερδήθηκε:
  // χάρτης του Δρόμου (ή σκηνή νίκης στο κάστρο), νέο λεβελ, νέος πάπυρος.
  // Αλλιώς η μάχη συνεχίζει με ό,τι ορίσει ο καλών.
  advanceIfCleared(onContinue) {
    if (this.enemies.length) { onContinue(); return; }
    const bossCleared = this.wave % BOSS_EVERY === 0;
    // Μία νίκη = ΕΝΑΣ σταθμός, όσοι δρόμοι κι αν φτάσουν εδώ (δύναμη, βολή,
    // κύμα φωτιάς). Το δίχτυ λύνεται μόνο όταν αρχίσει το νέο λεβελ.
    if (bossCleared) {
      if (this.stationWon) return;
      this.stationWon = true;
    }
    this.time.delayedCall(420, () => {
      if (bossCleared) {
        // Αν τον Μάστερ Γου τον έριξε ΔΥΝΑΜΗ, η περγαμηνή με την τρέχουσα
        // λέξη είναι ακόμα ανοιχτή — δεν πρέπει να φαίνεται πίσω από τον χάρτη.
        this.clearOrbs();
        this.hideScroll();
        this.current = null;
        this.assembling = false;
        this.completeStation(() => {
          this.stationWon = false;
          this.spawnWave(() => this.startLevel());
        });
      } else {
        this.spawnWave(onContinue);
      }
    });
  }

  twinStrike(e) {
    e.hp -= 1;
    if (e.hp > 0) this.flinchEnemy(e);
    else { this.enemies = this.enemies.filter((x) => x !== e); this.killEnemy(e); }
    const b = this.add.image(this.ninja.x + 56, this.ninja.y - 60, 'flame')
      .setScale(.3).setAngle(96).setDepth(14).setTint(NUM.lantern);
    this.tweens.add({ targets: b, x: e.x, y: e.y - 60, duration: 260, ease: 'Quad.easeIn',
      onComplete: () => b.destroy() });
  }

  // ΜΟΝΟ ο μπροστινός υποχωρεί (ποτέ πάνω στον επόμενο), και η γραμμή
  // επιβραδύνει για μια ανάσα. Πριν, μία σωστή απάντηση έσπρωχνε ολόκληρη
  // τη γραμμή και το κύμα έχανε κάθε απειλή: χτυπούσες έναν και πήγαιναν
  // πίσω πέντε. Τώρα οι πίσω συνεχίζουν να έρχονται.
  pushBackLine() {
    const front = this.enemies[0];
    if (front) {
      const behind = this.enemies[1];
      const cap = behind ? behind.x - ENEMY_GAP * .7 : SPAWN_X;
      const to = Math.max(front.x, Math.min(front.x + KNOCKBACK, cap));
      this.tweens.add({ targets: front, x: to, duration: 260, ease: 'Quad.easeOut' });
    }
    this.pace(SLOW_FACTOR, SLOW_MS);
  }

  // Χτυπήθηκε αλλά άντεξε: τράνταγμα και σπίθες, χωρίς θάνατο.
  // Η αντοχή που απομένει φαίνεται ως ΛΑΜΨΗ ΠΟΥ ΣΒΗΝΕΙ — ποτέ ως μπάρα ζωής.
  // Ζ2: «χτυπάς το τέρας και απλά είναι ακίνητο» — τώρα λάμπει λευκό τη
  // στιγμή του χτυπήματος, ζουλιέται, γέρνει προς τα πίσω και αναπηδά.
  flinchEnemy(e) {
    this.hitFlash(e);
    // Από τη ΒΑΣΙΚΗ κλίμακα, όχι την τρέχουσα: δύο χτυπήματα στη σειρά
    // αλλιώς φούσκωναν τον εχθρό μόνιμα.
    const b = e.isMaster ? { x: e.scaleX, y: e.scaleY } : (e._base || (e._base = { x: e.scaleX, y: e.scaleY }));
    this.tweens.add({
      targets: e, scaleX: b.x * 1.18, scaleY: b.y * .84,
      duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => e.setScale(b.x, b.y)
    });
    if (!e.isMaster && !e.airborne) {      // του Μάστερ Γου τη γωνία την ορίζει το animateMaster·
                                           // όποιον πέταξε η λάβα, τον κατεβάζει το δικό της tween
      this.tweens.add({ targets: e, angle: 12, duration: 90, hold: 60, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => e.setAngle(0) });
      this.tweens.add({ targets: e, y: LINE_Y - 14, duration: 110, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => e.setY(LINE_Y) });
    }
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

  // Λευκή λάμψη πάνω στο σώμα τη στιγμή του χτυπήματος: το μάτι τη διαβάζει
  // ως «τον βρήκα» πριν καν δει τις σπίθες.
  hitFlash(e) {
    const S = e.size || 1;
    const f = this.add.image(e.x, e.y - (e.isMaster ? 20 : 50 * S), 'glow-moon')
      .setScale(1.2 * S).setAlpha(.95).setBlendMode(Phaser.BlendModes.ADD).setDepth(14);
    this.tweens.add({ targets: f, alpha: 0, scale: 1.7 * S, duration: 240, ease: 'Quad.easeOut',
      onComplete: () => f.destroy() });
  }

  killEnemy(e) {
    if (e.dazeFx) this.thaw(e);            // ο Μάστερ Γου δεν καταστρέφεται — θα κρατούσε τα αστεράκια
    this.hitFlash(e);
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
    // Η δέσμη ζει έξω από το σώμα του — αν πεθάνει μέσα στη φωτιά, θα έμενε
    // μια φλόγα κρεμασμένη στον αέρα.
    if (e.beam) {
      const { g, em } = e.beam;
      e.beam = null;
      g.destroy();
      em.stop();
      this.time.delayedCall(700, () => em.destroy());
    }
    e.nextBreathAt = 0;
    // Πετιέται πίσω και ψηλά, γέρνει, και διαλύεται — όχι απλό ξεθώριασμα
    this.tweens.add({ targets: e, alpha: 0, scaleX: 1.3, scaleY: .7, x: e.x + 70, y: e.y - 38, angle: 26,
      duration: 520, ease: 'Quad.easeOut', onComplete: () => this.destroyDeep(e) });
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
    if (!orb || !orb.scene) { this.busy = false; return; }
    audio.fizzle();
    const glow = orb.getData('glow');
    this.tweens.add({ targets: glow, alpha: 0, duration: 240 });
    this.tweens.add({ targets: orb, alpha: .3, scale: .82, duration: 380, ease: 'Quad.easeOut' });
    orb.disableInteractive();

    const smoke = this.add.particles(orb.x, orb.y, 'puff', {
      speed: { min: 12, max: 46 }, angle: { min: 250, max: 290 },
      scale: { start: .7, end: 0 }, alpha: { start: .5, end: 0 },
      lifespan: { min: 500, max: 900 }, tint: NUM.smoke, emitting: false
    }).setDepth(26);
    smoke.explode(14);
    this.time.delayedCall(1100, () => smoke.destroy());

    // Η ΠΡΟΣΠΑΘΕΙΑ φαίνεται: ο νίντζα αρπάζει και το λάθος γράμμα, μαζεύεται
    // και το εκτοξεύει — αλλά η βολή είναι τζούφια. Ξεφουσκώνει στη μέση του
    // δρόμου και γίνεται καπνός. Αποτυχημένη εκτόξευση, όχι τιμωρία.
    this.tweens.add({
      targets: orb, x: this.ninja.x + 48, y: this.ninja.y - 78, scale: .4,
      duration: 260, ease: 'Quad.easeIn', onComplete: () => this.dudShot()
    });
    this.tweens.add({ targets: this.hand, alpha: .45, scale: .75, duration: 260 });
  }

  // Η τζούφια βολή: μικρό μάζεμα, αδύναμη γκρίζα βολή που ξεφουσκώνει.
  dudShot() {
    this.ninja.frozen = true;
    const target = this.frontEnemy();
    const reach = this.ninja.x + ((target ? target.x : W) - this.ninja.x) * .34;

    this.tweens.add({
      targets: this.ninja, x: NINJA_X - 10, angle: 5, duration: 170, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.ninja, x: NINJA_X, angle: -5, duration: 110 });
        this.tweens.add({ targets: this.hand, alpha: 0, scale: .5, duration: 160 });

        const bolt = this.add.image(this.ninja.x + 56, this.ninja.y - 78, 'flame')
          .setScale(.34).setAngle(96).setDepth(14).setTint(NUM.smoke);
        this.tweens.add({
          targets: bolt, x: reach, y: bolt.y + 36, scale: .12, alpha: 0,
          duration: 330, ease: 'Quad.easeOut',
          onComplete: () => {
            const puff = this.add.particles(bolt.x, bolt.y, 'puff', {
              speed: { min: 15, max: 60 }, angle: { min: 240, max: 300 },
              scale: { start: .9, end: 0 }, alpha: { start: .5, end: 0 },
              lifespan: { min: 400, max: 800 }, tint: NUM.smoke, emitting: false
            }).setDepth(15);
            puff.explode(14);
            this.time.delayedCall(1000, () => puff.destroy());
            bolt.destroy();
            this.ninja.setAngle(0);
            this.ninja.frozen = false;
            this.enemyGainsGround();
          }
        });
      }
    });
  }

  // Ο αντίπαλος κερδίζει έδαφος: ΟΡΑΤΟ επιθετικό βήμα μπροστά, όχι μόνο
  // αόρατη επιτάχυνση. Το βήμα φαίνεται· η επιτάχυνση το συνοδεύει.
  enemyGainsGround() {
    let hitIn = 0;
    if (this.enemies.length) {
      audio.thud();
      // Στη δεύτερη αστοχία η γραμμή ορμάει: διπλό βήμα, όχι το ίδιο.
      const step = this.lostWord ? ERROR_STEP * 1.9 : ERROR_STEP;
      this.enemies.forEach((e, i) => {
        if (e.frozenUntil) return;     // παγωμένος: δεν κάνει βήμα
        if (e.windUp) e.windUp();      // η δική του προειδοποίηση (Δ3)
        this.tweens.add({
          targets: e, x: e.x - step, duration: 260, delay: i * 40, ease: 'Back.easeOut'
        });
        // Ο δράκος γρυλίζει: μαζεύει τον λαιμό και τον ξανατεντώνει. (Το
        // παλιό tween στη γωνία του κεφαλιού δεν έχει πια νόημα — το κεφάλι
        // το ορίζει η ραχοκοκαλιά σε κάθε καρέ.)
        if (e.spine && !e.breathing) {
          this.tweens.add({ targets: e, breath: -.55, duration: 150,
            delay: i * 40, yoyo: true, ease: 'Quad.easeOut' });
        }
      });
      // Και ΧΤΥΠΑ (Ζ2). Όταν είναι ο ίδιος στο πεδίο, ο Μάστερ Γου· αλλιώς ο
      // πρώτος που δεν είναι παγωμένος, με το δικό του όπλο.
      const boss = this.enemies.find((e) => e.isMaster);
      const foe = boss || this.enemies.find((e) => !e.frozenUntil);
      if (foe) hitIn = boss ? this.masterStrike(boss) : this.foeStrike(foe);
    }
    this.cameras.main.shake(this.lostWord ? 340 : 190, this.lostWord ? .005 : .0028);
    this.pace(HASTE_FACTOR, HASTE_MS);
    // Η επόμενη προσπάθεια ΜΕΤΑ το χτύπημα: αλλιώς το παιδί πατά φούσκα
    // ενώ ο νίντζα ακόμα τινάζεται.
    this.time.delayedCall(Math.max(340, hitIn + 420),
      () => (this.lostWord ? this.wordLost() : this.revealCorrect()));
  }

  /**
   * Δεύτερη αστοχία: ο Μάστερ Γου αρπάζει ΟΛΗ τη λέξη και η μάχη συνεχίζει
   * με άλλη. Καμία οθόνη σφάλματος, κανένα κόκκινο, καμία απώλεια σπίθας —
   * η λέξη απλώς φεύγει, όπως έφυγε και το γράμμα (SPEC κεφ. 3).
   *
   * Η λέξη ΑΛΛΑΖΕΙ επίτηδες: αν έμενε η ίδια με λιγότερες επιλογές, το
   * παιδί θα τη μάντευε με αποκλεισμό αντί να τη θυμηθεί.
   */
  wordLost() {
    this.busy = true;
    this.clearOrbs();
    audio.poof();
    audio.roar(.55);
    const m = this.master;
    if (m) {
      this.tweens.add({ targets: m.arm, x: -92, scaleX: 2.2,
        duration: 240, ease: 'Quad.easeOut', yoyo: true, hold: 220 });
      this.tweens.add({ targets: m.eyes, alpha: .3, duration: 180, yoyo: true, repeat: 2 });
    }
    this.smokePuff(W / 2, 152, 34);
    this.hideScroll(() => this.time.delayedCall(260, () => this.nextChallenge()));
  }

  // Μετά το ΠΡΩΤΟ λάθος το παιδί ξαναπροσπαθεί — ΧΩΡΙΣ να του δείξουμε ποιο είναι
  // το σωστό. Η φούσκα που πάλλεται πρόδιδε την ορθογραφία· δεν ήταν
  // βοήθεια, ήταν απάντηση. Οι υπόλοιπες φούσκες μένουν ενεργές όπως ήταν.
  revealCorrect() {
    this.revealed = true;
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
      const p = this.add.particles(x, y, 'puff', {
        speed: { min: 30, max: 170 }, scale: { start: 1.5, end: 0 },
        alpha: { start: .6, end: 0 }, lifespan: life, tint: NUM.smoke, emitting: false
      }).setDepth(16);
      p.explode(n);
      this.time.delayedCall(life + 500, () => p.destroy());
      return p;
    };

    // 1. Χτυπά το χέρι στο έδαφος. Πυκνή ομίχλη σκεπάζει ΟΛΟ το πεδίο — δεν
    //    βλέπει τίποτα ούτε ο παίκτης. Η περγαμηνή μένει καθαρή από πάνω.
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 90, () => smokeAt(NINJA_X + i * 130, LINE_Y - 40, 30, 1600));
    }
    if (!this.fog) {
      this.fog = this.add.rectangle(W / 2, H / 2, W, H, NUM.smoke).setDepth(17).setAlpha(0);
    }
    this.fog.setAlpha(0);
    this.tweens.add({ targets: this.fog, alpha: .92, duration: 420, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.ninja, alpha: 0, y: LINE_Y + 10, duration: 260, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.hand, alpha: 0, duration: 200 });

    // 2. ΜΕΣΑ στην ομίχλη, κρυμμένοι, οι κακοί υποχωρούν — τον έχασαν.
    this.time.delayedCall(560, () => {
      this.enemies.forEach((e, i) => {
        e.setAngle(0);
        this.tweens.add({
          targets: e, x: SPAWN_X + i * ENEMY_GAP, duration: 700, ease: 'Quad.easeInOut'
        });
      });
      // ο νίντζα ξαναπαίρνει θέση αθέατος, σκυφτός
      this.ninja.setX(NINJA_X).setY(LINE_Y + 24).setScale(1.3, .76).setAlpha(1);
    });

    // 3. Η ομίχλη σπάει και ο νίντζα φαίνεται καθαρά, σηκώνεται αργά.
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: this.fog, alpha: 0, duration: 620, ease: 'Quad.easeIn' });
      this.tweens.add({
        targets: this.ninja, y: LINE_Y, scaleY: 1.3,
        duration: 620, delay: 200, ease: 'Back.easeOut',
        onComplete: () => { this.ninja.frozen = false; }
      });
      this.tweens.add({ targets: this.hand, alpha: .9, scale: .8, duration: 320, delay: 520,
        yoyo: true, hold: 220 });
    });

    if (!this.regroupShown) {
      this.regroupShown = true;
      const msg = this.add.text(W / 2, 300, TXT.regroup, {
        fontFamily: FONT.ui, fontSize: '24px', color: HEX.lantern
      }).setOrigin(.5).setDepth(30).setAlpha(0);
      this.tweens.add({ targets: msg, alpha: 1, duration: 300, delay: 2200, yoyo: true, hold: 1300,
        onComplete: () => msg.destroy() });
      this.time.delayedCall(4200, () => { this.busy = false; });
    } else {
      this.time.delayedCall(2500, () => { this.busy = false; });
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
      if (e.isMaster) this.banishMaster(e); else this.destroyDeep(e);
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

    // Πάνω αριστερά ΜΟΝΟ η παύση (Ζ1/Ζ4, 11/09 βράδυ). Το ‹ (πίσω) και οι
    // διακόπτες ήχου μπήκαν ΜΕΣΑ στην οθόνη παύσης: έτσι χωρά η λωρίδα του
    // HUD, και το παιδί δεν πατά κατά λάθος «πίσω» στη μέση της μάχης.
    const pz = this.add.graphics({ x: 34, y: 30 }).setDepth(46);
    pz.fillStyle(NUM.night, .8);
    pz.fillCircle(0, 0, 23);
    pz.lineStyle(2, NUM.smoke, .6);
    pz.strokeCircle(0, 0, 23);
    pz.fillStyle(NUM.parchment, .9);
    pz.fillRoundedRect(-9, -11, 6, 22, 2);
    pz.fillRoundedRect(3, -11, 6, 22, 2);
    this.add.zone(34, 30, 64, 60).setDepth(47).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.pauseGame());

    this.sparkIcon = this.add.image(W - 70, 30, 'spark')
      .setScale(1.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(46);
    this.sparkLabel = this.add.text(W - 52, 30, String(store.getSparks(store.loadState())), {
      fontFamily: FONT.ui, fontSize: '26px', fontStyle: '700', color: HEX.lantern
    }).setOrigin(0, .5).setDepth(46);

    this.buildRageBar();
  }

  // Παύση (Ζ1). Η σκηνή σταματά ΟΛΗ: update (άρα και η πίεση του χρόνου),
  // tween, χρονόμετρα. Η μπάρα, η λέξη, το κύμα μένουν όπως ήταν. Η οθόνη
  // παύσης είναι δική της σκηνή — η σταματημένη δεν δέχεται αγγίγματα.
  pauseGame() {
    if (this.userPaused || !this.sys.isActive()) return;
    this.userPaused = true;
    audio.hold(true);
    this.scene.launch('Pause');
    this.scene.pause();
  }

  // ======================================== Ο ΔΡΟΜΟΣ ΤΗΣ ΦΛΟΓΑΣ (NEXT-FIXES Ε3)

  stationText() {
    return `${TXT.station} ${this.station + 1}/${journey.STATIONS} · ${TXT.stations[this.station]}`;
  }

  // Αρχή λεβελ: ο Μάστερ Γου στέλνει τις ορδές του — και το λέει (Ε5).
  startLevel() {
    this.hadChallenge = false;             // το δεύτερο δίχτυ περιμένει την πρώτη λέξη
    const lines = TXT.masterHorde;
    this.masterSays(lines[this.station % lines.length], 2600, () => this.openLevel());
  }

  /**
   * Ο Μάστερ Γου ΜΙΛΑΕΙ (απόφαση ιδιοκτήτη 10/09/2026 — ανατρέπει το «δεν
   * μιλάει ποτέ» της 02/09). Γραπτή ατάκα σε σκοτεινή λωρίδα δίπλα του, που
   * τον ακολουθεί όσο κινείται, με υπόκωφο μουγκρητό.
   * ΠΟΤΕ για τα λάθη του παιδιού: είναι κακός του παραμυθιού, όχι δάσκαλος
   * που μαλώνει (SPEC κεφ. 3).
   * @param {string} text
   * @param {number} ms πόσο μένει στην οθόνη
   * @param {() => void} [done]
   * @param {boolean} [sound]
   */
  masterSays(text, ms = 2400, done, sound = true) {
    const m = this.master;
    const t = this.add.text(0, 0, text, {
      fontFamily: FONT.ui, fontSize: '26px', fontStyle: '700', color: HEX.parchment,
      align: 'center', wordWrap: { width: 400 }
    }).setOrigin(.5);
    const w = t.width + 44, h = t.height + 28;
    const g = this.add.graphics();
    g.fillStyle(NUM.shadow, .9);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(2, NUM.flameDeep, .85);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(NUM.shadow, .9);
    g.fillTriangle(w / 2 - 2, -10, w / 2 - 2, 10, w / 2 + 18, 4);   // ουρά προς αυτόν
    const box = this.add.container(0, 0, [g, t]).setDepth(42).setAlpha(0).setScale(.85);
    this.masterLine = box;                                         // για ελέγχους
    const place = () => {
      if (!box.scene) return;
      const x = Math.max(w / 2 + 12, m.x - 70 * m.scaleX - w / 2);
      box.setPosition(x, Math.max(h / 2 + 64, m.y - 40 * m.scaleY));   // κάτω από τη λωρίδα του HUD
    };
    place();
    this.events.on('update', place);
    // Αν η σκηνή κλείσει ΠΡΙΝ τελειώσει η ατάκα (‹ πάνω της), το χρονόμετρο
    // που αφαιρεί τον listener ακυρώνεται — και ο listener θα έμενε για πάντα
    // στα events της σκηνής (το Phaser τα κρατά από μάχη σε μάχη).
    this.events.once('shutdown', () => this.events.off('update', place));
    if (sound) audio.omen();
    audio.speak(text);                       // Ζ14: και φωνή — βαθιά, αργή
    this.tweens.add({ targets: box, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.time.delayedCall(ms - 300, () => this.tweens.add({ targets: box, alpha: 0, duration: 300 }));
    this.time.delayedCall(ms, () => {
      this.events.off('update', place);
      box.destroy();
      if (this.masterLine === box) this.masterLine = null;
      if (done) done();
    });
  }

  // --------------------------------------------------------- μπάρα δύναμης

  // Τα Graphics του Phaser ξαναχτίζονται σε ΚΑΘΕ καρέ. Για το HUD, που
  // αλλάζει σπάνια, κόστιζαν ~2 ms/καρέ (μετρημένο 11/09) — σε κινητό,
  // χαμένα καρέ. Ζωγραφίζουμε σε Graphics ΕΚΤΟΣ σκηνής και «ψήνουμε» εικόνα
  // μόνο όταν αλλάξει κάτι (bakeHud).
  // Κάθε στρώμα έχει ΔΙΚΟ του ορθογώνιο στην οθόνη και ζωγραφίζει σε τοπικές
  // συντεταγμένες (0,0 = πάνω αριστερά του ορθογωνίου).
  hudLayer(name, [x, y, w, h]) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.hudKey = `hud-${name}`;
    g.hudW = w;
    g.hudH = h;
    g.hudImg = this.add.image(x, y, '__DEFAULT').setOrigin(0).setDepth(46);
    g.hudImg.baseX = x;
    return g;
  }

  bakeHud(g) {
    if (!g || !g.hudImg) return;
    if (this.textures.exists(g.hudKey)) {            // ο καμβάς ξαναχρησιμοποιείται: πρώτα καθαρίζει
      const tex = this.textures.get(g.hudKey);
      tex.context.clearRect(0, 0, tex.width, tex.height);
    }
    g.generateTexture(g.hudKey, g.hudW, g.hudH);
    g.hudImg.setTexture(g.hudKey);
  }

  /**
   * Το HUD (Ζ4, 11/09 βράδυ): «πιο μεγάλα… μερικά αριστερά, μερικά δεξιά…
   * όχι ένα πάνω στο άλλο, δίπλα-δίπλα… ίσως κάποια μπάρα κάτω». Μία λωρίδα
   * στο χώμα, κάτω από τα πόδια των μορφών, με ΤΡΕΙΣ ζώνες:
   *   ΔΥΝΑΜΗ   (αριστερά, κάτω από τον αντίχειρα): μπάρα + οι τρεις δυνάμεις
   *   ΚΥΜΑΤΑ   (μέση): πόσο απέχει ο Μάστερ Γου μέσα στο λεβελ
   *   ΔΡΟΜΟΣ   (δεξιά): η ζώνη και οι 7 σταθμοί ως μετάλλια με το σύμβολό τους
   * Πάνω μένουν μόνο τα κουμπιά (‹ ♪ ✦ ⏸) και οι σπίθες.
   */
  buildRageBar() {
    const [px, py, , ph] = HUD_POWER;
    this.rageBox = { x: px + 20, y: py + ph / 2 - 11, w: 240, h: 22 };
    const bg = this.make.graphics({ x: 0, y: 0 }, false);
    bg.hudKey = 'hud-panels';
    bg.hudW = W;
    bg.hudH = ph + 8;
    bg.hudImg = this.add.image(0, py - 4, '__DEFAULT').setOrigin(0).setDepth(45);
    for (const [x, , w, h] of [HUD_POWER, HUD_WAVE, HUD_ROAD]) {
      bg.fillStyle(NUM.night, .8);
      bg.fillRoundedRect(x, 4, w, h, h / 2);
      bg.lineStyle(2, NUM.smoke, .32);
      bg.strokeRoundedRect(x, 4, w, h, h / 2);
    }
    this.bakeHud(bg);

    this.rageG = this.hudLayer('rage', HUD_POWER);
    this.powerGlow = this.add.image(0, 0, 'glow-lantern').setScale(.55).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(45);
    this.powerG = this.hudLayer('power', HUD_POWER);
    this.waveG = this.hudLayer('wave', HUD_WAVE);
    this.pathGlow = this.add.image(0, 0, 'glow-flame').setScale(.28).setAlpha(.7)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(45);
    if (!this.calm) {
      this.tweens.add({ targets: this.pathGlow, alpha: .25, scale: .38, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.pathG = this.hudLayer('path', HUD_ROAD);
    this.hudKey = '';
    this.drawMiniPath();
    // Δύο μεγάλοι στόχοι αφής για την απελευθέρωση: η ζώνη της δύναμης ΚΑΙ ο νίντζα
    const [zx, zy, zw, zh] = HUD_POWER;
    this.add.zone(zx - 6, 0, zw + 12, zy + zh + 10).setOrigin(0).setDepth(47)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.unleash());
    this.add.zone(NINJA_X, LINE_Y - 70, 150, 170).setOrigin(.5).setDepth(47)
      .setInteractive().on('pointerdown', () => this.unleash());
    this.drawRage();
  }

  nextPower() {
    const list = journey.unlockedPowers(this.station, this.cycle);
    return list[this.powerTurn % list.length];
  }

  drawRage() {
    const { w, h } = this.rageBox;
    const x = this.rageBox.x - HUD_POWER[0], y = this.rageBox.y - HUD_POWER[1];   // τοπικά
    const g = this.rageG;
    const f = Math.max(0, Math.min(1, this.rage / RAGE_MAX));
    g.clear();
    g.fillStyle(NUM.shadow, .9);
    g.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, (h + 8) / 2);
    if (f > 0) {
      g.fillStyle(this.rageReady ? NUM.lantern : NUM.flame, 1);
      g.fillRoundedRect(x, y, Math.max(h, w * f), h, h / 2);
      g.fillStyle(NUM.flameCore, .45);                  // φως στην πάνω μεριά
      g.fillRoundedRect(x + 5, y + 4, Math.max(h - 10, w * f - 10), h / 3, h / 6);
    }
    // Εγκοπές ανά ~ένα σωστό: το παιδί βλέπει «πόσα ακόμα» χωρίς αριθμό
    g.fillStyle(NUM.shadow, .55);
    for (let k = 1; k < 5; k++) g.fillRect(x + w * k / 5 - 1, y + 3, 2, h - 6);
    g.lineStyle(2.5, this.rageReady ? NUM.flameCore : NUM.smoke, this.rageReady ? .95 : .55);
    g.strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, (h + 8) / 2);
    this.bakeHud(g);
    this.drawPowers();
  }

  // Οι τρεις δυνάμεις με τη σειρά του Δρόμου. Η ΕΠΟΜΕΝΗ είναι μεγάλη με
  // φωτεινό δαχτυλίδι· όταν η μπάρα γεμίσει, λάμπει και πάλλεται. Όσες δεν
  // έχουν ξεκλειδωθεί φαίνονται σβηστές — ξέρει ότι υπάρχουν και τον περιμένουν.
  drawPowers() {
    const { w, h } = this.rageBox;
    const x = this.rageBox.x - HUD_POWER[0], y = this.rageBox.y - HUD_POWER[1];
    const g = this.powerG;
    g.clear();
    const unlocked = journey.unlockedPowers(this.station, this.cycle);
    const next = this.nextPower();
    const cy = y + h / 2;
    let left = x + w + 18;
    for (const { id } of journey.POWERS) {
      const has = unlocked.includes(id), main = id === next;
      const r = main ? 21 : 15;
      const cx = left + r;
      left = cx + r + 8;
      g.fillStyle(main && this.rageReady ? NUM.flameDeep : NUM.shadow, has ? .85 : .4);
      g.fillCircle(cx, cy, r);
      g.lineStyle(main ? 2.5 : 1.5, main ? (this.rageReady ? NUM.flameCore : NUM.flame) : NUM.smoke,
        has ? (main ? 1 : .55) : .25);
      g.strokeCircle(cx, cy, r);
      const col = main ? (this.rageReady ? NUM.flameCore : NUM.lantern) : NUM.smoke;
      world.drawPowerIcon(g, id, cx, cy, r * .6, has ? col : NUM.nightHigh, has ? (main ? 1 : .6) : .5);
      if (main) this.powerGlow.setPosition(HUD_POWER[0] + cx, HUD_POWER[1] + cy);
    }
    if (!this.barPulse) this.powerGlow.setAlpha(this.rageReady ? .8 : 0);
    this.bakeHud(g);
  }

  // Κύματα μέχρι να κατέβει ο Μάστερ Γου: ένα κομμάτι ανά κύμα, το τελευταίο
  // είναι το δικό του (κόκκινο). Το τρέχον γεμίζει όσο πέφτουν οι εχθροί.
  waveProgress() {
    if (!this.waveHp) return 0;
    const left = this.enemies.reduce((n, e) => n + Math.max(0, e.hp || 0), 0);
    return Phaser.Math.Clamp(1 - left / this.waveHp, 0, 1);
  }

  drawWaves() {
    const x = 18, w = 130;                    // τοπικά, μέσα στη ζώνη HUD_WAVE
    const g = this.waveG;
    g.clear();
    const hh = 14, top = HUD_WAVE[3] / 2 - hh / 2, gap = 8;
    const segW = (w - gap * (BOSS_EVERY - 1)) / BOSS_EVERY;
    const cur = (Math.max(1, this.wave || 1) - 1) % BOSS_EVERY;
    const prog = this.waveProgress();
    for (let i = 0; i < BOSS_EVERY; i++) {
      const sx = x + i * (segW + gap);
      const boss = i === BOSS_EVERY - 1;
      g.fillStyle(NUM.shadow, .65);
      g.fillRoundedRect(sx - 2, top - 2, segW + 4, hh + 4, (hh + 4) / 2);
      const f = i < cur ? 1 : i > cur ? 0 : prog;
      if (f > 0) {
        g.fillStyle(boss ? NUM.flameDeep : NUM.moon, boss ? .95 : .75);
        g.fillRoundedRect(sx, top, Math.max(hh, segW * f), hh, hh / 2);
      }
      g.lineStyle(1.5, i === cur ? NUM.parchment : NUM.smoke, i === cur ? .75 : .3);
      g.strokeRoundedRect(sx - 2, top - 2, segW + 4, hh + 4, (hh + 4) / 2);
    }
    // Ο Μάστερ Γου στο τέλος της μπάρας: κουκούλα με δύο μάτια που ανάβουν
    // όταν έρθει η σειρά του.
    const mx = x + w + 24, my = top + hh / 2, k = 1.4;
    const his = cur === BOSS_EVERY - 1;
    g.fillStyle(his ? NUM.nightHigh : NUM.shadow, 1);
    g.fillTriangle(mx - 10 * k, my + 9 * k, mx + 10 * k, my + 9 * k, mx, my - 11 * k);
    g.fillCircle(mx, my - 1 * k, 7 * k);
    g.lineStyle(1.5, NUM.smoke, his ? .8 : .45);
    g.strokeCircle(mx, my - 1 * k, 7 * k);
    g.fillStyle(his ? NUM.flameDeep : NUM.smoke, his ? 1 : .6);
    g.fillRect(mx - 5 * k, my - 2 * k, 3.5 * k, 2.5 * k);
    g.fillRect(mx + 1.5 * k, my - 2 * k, 3.5 * k, 2.5 * k);
    this.bakeHud(g);
  }

  // Ο μικρός Δρόμος: η ζώνη (ο κύκλος) στην αρχή, 7 σταθμοί, το κάστρο στο
  // τέλος. Οι περασμένοι αναμμένοι, ο τρέχων φλόγα που πάλλεται.
  // Ζ4: οι κουκκίδες (6px) δεν διαβάζονταν σε κινητό. Τώρα μετάλλια με το
  // ΣΥΜΒΟΛΟ κάθε σταθμού (τα ίδια του χάρτη και του τίτλου): οι περασμένοι
  // χρυσοί, ο τρέχων μεγάλος σε φλόγα, οι επόμενοι σβηστοί. Η ζώνη μπροστά.
  drawMiniPath() {
    const g = this.pathG;
    g.clear();
    const y = HUD_ROAD[3] / 2, x0 = 78, step = 47, n = journey.STATIONS;
    world.drawBelt(g, 36, y - 5, .7, journey.beltColor(this.cycle));
    g.lineStyle(4, NUM.nightHigh, .95);
    g.lineBetween(x0, y, x0 + step * (n - 1), y);
    if (this.station > 0) {
      g.lineStyle(4, NUM.flame, .95);
      g.lineBetween(x0, y, x0 + step * this.station, y);
    }
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * step;
      const here = i === this.station, past = i < this.station;
      const r = here ? 17 : 12.5;
      g.fillStyle(here ? NUM.flame : past ? NUM.lantern : NUM.shadow, 1);
      g.fillCircle(cx, y, r);
      g.lineStyle(here ? 3 : 2, here ? NUM.flameCore : past ? NUM.flameCore : NUM.smoke, here ? 1 : past ? .7 : .45);
      g.strokeCircle(cx, y, r);
      world.drawStationIcon(g, i, cx, y + 1, r * .56,
        here ? NUM.parchment : past ? NUM.ink : NUM.smoke, here ? 1 : past ? .85 : .55);
      if (here) this.pathGlow.setPosition(HUD_ROAD[0] + cx, HUD_ROAD[1] + y);
    }
    this.bakeHud(g);
  }

  // Το HUD ζωγραφίζεται ξανά μόνο όταν αλλάξει κάτι που δείχνει
  refreshHud() {
    if (!this.waveG) return;
    const key = `${this.wave}:${Math.round(this.waveProgress() * 40)}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.drawWaves();
  }

  addRage(n) {
    const k = n > 0 && this.perks.includes('ember') ? 1.25 : 1;   // Φλογερή Καρδιά
    const before = this.rage;
    this.rage = Math.max(0, Math.min(RAGE_MAX, this.rage + n * k));
    // Το λάθος «τρώει ξύλο» ΚΑΙ από τη γεμάτη μπάρα (ιδιοκτήτης 11/09 —
    // ανατρέπει το «γεμάτη δεν ξαδειάζει» της v3.0.0: «έκανα μερικά λάθη
    // και δεν έπεφτε πίσω»). Και φαίνεται: το κομμάτι που χάθηκε ξεκολλά και
    // πέφτει σαν κάρβουνο.
    if (n < 0 && before > this.rage) {
      if (this.rageReady) this.rageCools();
      this.rageChip(before, this.rage);
    }
    if (this.rage >= RAGE_MAX && !this.rageReady) {
      this.rageReady = true;
      audio.cast();
      this.tweens.add({ targets: this.aura, alpha: .8, scale: 2.7, duration: 380, ease: 'Quad.easeOut' });
      if (!this.calm) {
        this.auraPulse = this.tweens.add({ targets: this.aura, alpha: .45, scale: 2.2,
          duration: 700, delay: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.barPulse = this.tweens.add({ targets: this.rageG.hudImg, alpha: .5,
          duration: 480, yoyo: true, repeat: -1 });
        this.powerGlow.setAlpha(.8);
        this.glowPulse = this.tweens.add({ targets: this.powerGlow, alpha: .3, scale: .72,
          duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    this.drawRage();
  }

  // Η γεμάτη μπάρα έπεσε από λάθος: σβήνουν η αύρα και οι παλμοί.
  rageCools() {
    this.rageReady = false;
    if (this.auraPulse) { this.auraPulse.stop(); this.auraPulse = null; }
    if (this.barPulse) { this.barPulse.stop(); this.barPulse = null; }
    if (this.glowPulse) { this.glowPulse.stop(); this.glowPulse = null; }
    this.powerGlow.setAlpha(0).setScale(.55);
    this.rageG.hudImg.setAlpha(1);
    this.tweens.add({ targets: this.aura, alpha: 0, scale: 2.2, duration: 300 });
  }

  // Το κομμάτι της μπάρας που χάθηκε: ξεκολλά, γέρνει και πέφτει σβήνοντας,
  // και η μπάρα τινάζεται. Γκρίζο-πορτοκαλί κάρβουνο — ποτέ κόκκινο.
  rageChip(from, to) {
    const { x, y, w, h } = this.rageBox;
    const x0 = x + w * (to / RAGE_MAX), x1 = x + w * (from / RAGE_MAX);
    const chip = this.add.rectangle((x0 + x1) / 2, y + h / 2, Math.max(8, x1 - x0), h, NUM.flame)
      .setDepth(47);
    this.tweens.add({ targets: chip, y: chip.y + 46, angle: 24, alpha: 0, scaleX: .6,
      duration: 620, ease: 'Quad.easeIn', onComplete: () => chip.destroy() });
    this.time.delayedCall(140, () => chip.scene && chip.setFillStyle(NUM.smoke));
    const ash = this.add.particles(x1, y + h / 2, 'spark', {
      speed: { min: 20, max: 90 }, angle: { min: 40, max: 140 }, gravityY: 160,
      scale: { start: .45, end: 0 }, alpha: { start: .9, end: 0 }, lifespan: 600,
      tint: [NUM.flame, NUM.smoke], emitting: false
    }).setDepth(47);
    ash.explode(10);
    this.time.delayedCall(800, () => ash.destroy());
    const img = this.rageG.hudImg;
    this.tweens.killTweensOf(img);
    img.setX(img.baseX);
    this.tweens.add({ targets: img, x: img.baseX + 6, duration: 45, yoyo: true, repeat: 3,
      onComplete: () => img.setX(img.baseX) });
  }

  /**
   * Απελευθέρωση της δύναμης (HYPER-NOTE §17.9): όλα παγώνουν, ο νίντζας
   * πηδά στο κέντρο, η δύναμη χτυπά ΟΛΟΥΣ, και η μάχη συνεχίζει με την
   * ΙΔΙΑ λέξη — η δύναμη δεν απαντά ποτέ στη θέση του παιδιού.
   */
  unleash() {
    if (!this.rageReady || this.busy || !this.current || !this.enemies.length) return;
    const power = this.nextPower();
    this.powerTurn += 1;
    this.rageReady = false;
    this.rage = 0;
    if (this.auraPulse) { this.auraPulse.stop(); this.auraPulse = null; }
    if (this.barPulse) { this.barPulse.stop(); this.barPulse = null; }
    if (this.glowPulse) { this.glowPulse.stop(); this.glowPulse = null; }
    this.powerGlow.setAlpha(0).setScale(.55);
    this.rageG.hudImg.setAlpha(1);
    this.drawRage();
    this.tweens.add({ targets: this.aura, alpha: 0, scale: 2.2, duration: 600, delay: 1400 });

    this.busy = true;
    this.ninja.frozen = true;
    this.tweens.killTweensOf(this.ninja);
    this.ninja.setAngle(0).setScale(1.3).setPosition(NINJA_X, LINE_Y);
    this.cameras.main.shake(300, .004);
    this.sealRing(NINJA_X, LINE_Y - 120, NUM.flame);

    // Κάθε δύναμη έχει ΔΙΚΗ της χορογραφία (powers.js) και λέει πότε
    // χτυπά και πότε ο νίντζα είναι πάλι στη θέση του.
    const fx = {
      tornado: () => this.fxTornado(), clones: () => this.fxClones(), volcano: () => this.fxVolcano(),
      dragon: () => this.fxDragon(), lightning: () => this.fxLightning()
    }[power] || (() => this.fxTornado());
    const START = 360;
    const plan = { hitAt: 1200, endAt: 2000 };
    const hold = () => Math.max(900, plan.endAt - 260);

    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setDepth(9).setAlpha(0);
    const name = this.add.text(W / 2, 250, TXT.powers[power] || '', {
      fontFamily: FONT.ui, fontSize: '46px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    name.setShadow(0, 0, HEX.flame, 24, false, true);
    // Το σύμβολο της δύναμης, μεγάλο — το παιδί την αναγνωρίζει από το σχήμα
    const badge = this.add.graphics({ x: W / 2, y: 148 }).setDepth(40).setAlpha(0).setScale(.6);
    badge.fillStyle(NUM.flameDeep, .95);
    badge.fillCircle(0, 0, 46);
    badge.lineStyle(4, NUM.flameCore, 1);
    badge.strokeCircle(0, 0, 46);
    world.drawPowerIcon(badge, power, 0, 0, 28, NUM.flameCore, 1);

    this.time.delayedCall(START, () => {
      Object.assign(plan, fx());
      this.tweens.add({ targets: veil, alpha: .5, duration: 260, hold: hold(), yoyo: true });
      this.tweens.add({ targets: name, alpha: 1, y: 230, duration: 300, hold: Math.min(1100, hold()), yoyo: true });
      this.tweens.add({ targets: badge, alpha: 1, scale: 1, duration: 320, hold: Math.min(1080, hold()), yoyo: true, ease: 'Back.easeOut' });
      this.time.delayedCall(plan.hitAt, () => this.applyPower(power));
      this.time.delayedCall(plan.endAt + 200, () => { veil.destroy(); name.destroy(); badge.destroy(); });
      // Η συνέχεια είναι χρονόμετρο, όχι tween (ο κανόνας των κολλημάτων).
      // Αν η δύναμη άδειασε το πεδίο, η σκηνή μένει «απασχολημένη» ώσπου να
      // έρθει το νέο κύμα. Πριν, για ~0,4 δευτ. οι φούσκες δέχονταν άγγιγμα
      // με άδειο πεδίο — και ένα σωστό άγγιγμα ξαναμετρούσε τη νίκη: στη
      // μεγάλη δοκιμή το κάστρο «κερδήθηκε» χωρίς μάχη, 2 δευτ. μετά τον 6ο σταθμό.
      this.time.delayedCall(plan.endAt + 400, () => {
        this.sheathe();
        this.ninja.setX(NINJA_X).setY(LINE_Y).setScale(1.3).setAngle(0);
        this.ninja.frozen = false;
        if (this.enemies.length) { this.busy = false; return; }
        this.advanceIfCleared(() => { this.busy = false; });
      });
    });
  }

  // Το ΑΠΟΤΕΛΕΣΜΑ κάθε δύναμης είναι διαφορετικό (HYPER-NOTE §8, journey.POWERS)
  applyPower(power) {
    const dmg = power === 'lightning' || power === 'dragon' ? 2 : 1;
    [...this.enemies].forEach((e) => {
      e.hp -= dmg;
      if (e.hp > 0) this.flinchEnemy(e);
      else { this.enemies = this.enemies.filter((x) => x !== e); this.killEnemy(e); }
    });
    if (power === 'tornado') {                         // παρασύρει: όλοι πίσω
      this.enemies.forEach((e, i) => this.tweens.add({
        targets: e, x: Math.max(e.x, SPAWN_X + i * ENEMY_GAP), duration: 520, ease: 'Quad.easeOut'
      }));
    }
    if (power === 'clones') {                          // οι κόψεις τους σπρώχνουν λίγο πίσω
      this.enemies.forEach((e) => this.tweens.add({ targets: e, x: e.x + KNOCKBACK * .7, duration: 260, ease: 'Quad.easeOut' }));
    }
    if (power === 'volcano') this.enemies.forEach((e) => this.daze(e, DAZE_MS, 'stars'));
    if (power === 'lightning') this.enemies.forEach((e) => this.daze(e, DAZE_MS * .6, 'volts'));
    // Έπεσε ο Μάστερ Γου: οι φούσκες/τα πλακίδια φεύγουν ΤΩΡΑ, όχι μετά τη
    // σκηνή της δύναμης (έμεναν ~0,4 δευτ. πάνω από τον χάρτη). ΜΟΝΟ τότε:
    // σε απλό κύμα η ίδια λέξη συνεχίζει με το νέο κύμα.
    if (!this.enemies.length && this.wave % BOSS_EVERY === 0) this.clearOrbs();
  }

  // Ακινητοποίηση από δύναμη (Ηφαίστειο: ζαλάδα με αστεράκια · Κεραυνός:
  // ηλεκτρισμένος). Το update() δεν τον κινεί ώσπου να συνέλθει (thaw).
  // Πήρε τη θέση του πάγου (Ζ8) — ίδιος μηχανισμός, frozenUntil.
  daze(e, ms, kind = 'stars') {
    e.frozenUntil = this.sceneMs + ms;
    if (e.dazeFx) return;
    const S = e.size || 1;
    const top = e.isMaster ? -120 : -150 * S;
    const c = this.add.container(0, top);
    if (kind === 'volts') {
      const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      c.add(g);
      const draw = () => {
        g.clear();
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * Math.PI * 2;
          const x0 = Math.cos(a) * 30 * S, y0 = -top * .55 + Math.sin(a) * 50 * S;
          g.lineStyle(2, NUM.moon, .9);
          g.strokePoints([new Phaser.Geom.Point(x0, y0),
            new Phaser.Geom.Point(x0 + Phaser.Math.Between(-14, 14), y0 + Phaser.Math.Between(-18, 18)),
            new Phaser.Geom.Point(x0 + Phaser.Math.Between(-24, 24), y0 + Phaser.Math.Between(-26, 26))]);
        }
      };
      draw();
      c.timer = this.time.addEvent({ delay: 90, loop: true, callback: draw });
    } else {
      // Τρία αστεράκια σε έλλειψη πάνω από το κεφάλι — η ζαλάδα των κινουμένων σχεδίων
      const stars = [0, 1, 2].map(() => this.add.image(0, 0, 'spark')
        .setScale(1.5).setTint(NUM.lantern).setBlendMode(Phaser.BlendModes.ADD));
      c.add(stars);
      const p = { a: 0 };
      c.spin = this.tweens.add({ targets: p, a: Math.PI * 2, duration: 1300, repeat: -1,
        onUpdate: () => stars.forEach((s, k) => {
          const a = p.a + k * 2.094;
          s.setPosition(Math.cos(a) * 32 * S, Math.sin(a) * 9 * S).setAlpha(Math.sin(a) > -.3 ? 1 : .45);
        }) });
    }
    e.add(c);
    e.dazeFx = c;
  }

  thaw(e) {
    e.frozenUntil = 0;
    if (!e.dazeFx) return;
    const c = e.dazeFx;
    e.dazeFx = null;
    if (c.timer) c.timer.remove();
    if (c.spin) c.spin.stop();              // ο στόχος του είναι απλό αντικείμενο — δεν τον πιάνει το destroyDeep
    this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => this.destroyDeep(c) });
  }

  // ------------------------------------------- ιστορία, σταθμοί, χάρτης, νίκη

  // Την πρώτη φορά: ποιος, τι έκλεψε, πού πάμε. Την ιστορία τη λέει το
  // παιχνίδι, όχι ο Μάστερ Γου — αυτός μιλά μόνο μέσα στη μάχη.
  showStory(done) {
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setDepth(38).setAlpha(0);
    this.tweens.add({ targets: veil, alpha: .82, duration: 500 });
    const lines = TXT.story.map((line, i) => this.add.text(W / 2, 300 + i * 60, line, {
      fontFamily: FONT.ui, fontSize: i ? '26px' : '32px', fontStyle: i ? '400' : '700',
      color: i ? HEX.parchment : HEX.flameCore, align: 'center', wordWrap: { width: 1000 }
    }).setOrigin(.5).setDepth(39).setAlpha(0));
    lines.forEach((l, i) => this.tweens.add({ targets: l, alpha: 1, duration: 600, delay: 400 + i * 1300 }));
    this.time.delayedCall(5600, () => this.tweens.add({ targets: [veil, ...lines], alpha: 0, duration: 500 }));
    this.time.delayedCall(6150, () => {
      veil.destroy();
      lines.forEach((l) => l.destroy());
      done();
    });
  }

  // «Η τεχνική σου ωρίμασε» (DESIGN «Ξεκλείδωμα»): μία φορά ανά τεχνική, στην
  // πρώτη μάχη αφού κατακτηθούν αρκετές λέξεις.
  announcePerks(done) {
    if (!this.newPerks.length) { done(); return; }
    const st = store.loadState();
    store.markPerksSeen(st, [...store.getPerksSeen(st), ...this.newPerks]);
    audio.cast();
    this.sealRing(this.ninja.x, this.ninja.y - 60, NUM.lantern);
    this.tweens.add({ targets: this.aura, alpha: .8, scale: 2.7, duration: 400, yoyo: true, hold: 1600 });
    const t1 = this.add.text(W / 2, 290, TXT.perkMatured, {
      fontFamily: FONT.ui, fontSize: '24px', color: HEX.parchment
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    const t2 = this.add.text(W / 2, 338, this.newPerks.map((p) => TXT.perks[p]).join(' · '), {
      fontFamily: FONT.ui, fontSize: '40px', fontStyle: '700', color: HEX.lantern
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    t2.setShadow(0, 0, HEX.flame, 22, false, true);
    const t3 = this.add.text(W / 2, 386, TXT.perkDesc[this.newPerks[this.newPerks.length - 1]], {
      fontFamily: FONT.ui, fontSize: '20px', color: HEX.smoke
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    // Το σύμβολο κάθε νέας τεχνικής, μεγάλο, πάνω από το όνομά της
    const icons = this.add.graphics().setDepth(40).setAlpha(0);
    this.newPerks.forEach((id, i) => {
      const cx = W / 2 + (i - (this.newPerks.length - 1) / 2) * 84;
      icons.fillStyle(NUM.flameDeep, .95);
      icons.fillCircle(cx, 224, 32);
      icons.lineStyle(3, NUM.lantern, 1);
      icons.strokeCircle(cx, 224, 32);
      world.drawPerkIcon(icons, id, cx, 224, 19, NUM.flameCore, 1);
    });
    this.tweens.add({ targets: [t1, t2, t3, icons], alpha: 1, duration: 420, hold: 1900, yoyo: true });
    this.time.delayedCall(2800, () => { t1.destroy(); t2.destroy(); t3.destroy(); icons.destroy(); done(); });
  }

  showStationBanner(done) {
    const final = journey.isFinal(this.station);
    // «Σταθμός 3 από 7» ως ΣΧΗΜΑ (ιδιοκτήτης 11/09): ο Δρόμος με τα 7
    // μετάλλια, οι περασμένοι αναμμένοι, ο τρέχων μεγάλος.
    const t1 = this.add.graphics().setDepth(40).setAlpha(0);
    const n = journey.STATIONS, step = 62, ry = 282, x0 = W / 2 - step * (n - 1) / 2;
    t1.lineStyle(4, NUM.nightHigh, .95);
    t1.lineBetween(x0, ry, x0 + step * (n - 1), ry);
    if (this.station > 0) {
      t1.lineStyle(4, NUM.flame, .95);
      t1.lineBetween(x0, ry, x0 + step * this.station, ry);
    }
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * step, here = i === this.station, done = i < this.station;
      const r = here ? 27 : 17;
      t1.fillStyle(here ? NUM.flameDeep : done ? NUM.flame : NUM.shadow, here ? 1 : .9);
      t1.fillCircle(cx, ry, r);
      t1.lineStyle(here ? 3 : 2, here ? NUM.flameCore : done ? NUM.lantern : NUM.smoke, here || done ? 1 : .45);
      t1.strokeCircle(cx, ry, r);
      world.drawStationIcon(t1, i, cx, ry, r * .58, here || done ? NUM.parchment : NUM.smoke, here || done ? 1 : .55);
    }
    const t2 = this.add.text(W / 2, 348,
      final ? `${TXT.stations[this.station]} — ${TXT.finalBattle}` : TXT.stations[this.station], {
        fontFamily: FONT.ui, fontSize: '40px', fontStyle: '700', color: HEX.flameCore
      }).setOrigin(.5).setDepth(40).setAlpha(0);
    t2.setShadow(0, 0, HEX.flame, 20, false, true);
    this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 420, hold: 1300, yoyo: true });
    this.time.delayedCall(2300, () => { t1.destroy(); t2.destroy(); done(); });
  }

  // Ο Μάστερ Γου διώχτηκε από τον σταθμό: μόνιμη πρόοδος, και μετά ο χάρτης
  // (ή, στο κάστρο, η νίκη και νέα ζώνη).
  completeStation(done) {
    this.busy = true;
    const res = store.advanceJourney(store.loadState(), journey.STATIONS);
    const from = this.station;
    this.station = res.station;
    this.cycle = res.cycle;
    this.drawMiniPath();
    this.time.delayedCall(520, () => this.rebuildBackdrop());
    this.drawRage();
    const cont = () => { this.busy = false; done(); };
    if (res.finished) this.showVictory(cont);
    else this.showPath(from, res.station, journey.powerUnlockedAt(res.station, res.cycle), cont);
  }

  // Ο χάρτης, ζωγραφισμένος σε ΠΑΠΥΡΟ (Ε3): επτά σταθμοί ως το κάστρο, ο
  // νίντζας περπατά ένα βήμα. Όταν τελειώσει το βήμα, ένα άγγιγμα συνεχίζει
  // — ο χάρτης είναι του παιδιού να τον κοιτάξει. Αν δεν αγγίξει, συνεχίζει
  // μόνος του (μένει κάτω από το δίχτυ ασφαλείας STUCK_MS).
  showPath(from, to, newPower, done) {
    const objs = [];
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setDepth(38).setAlpha(0);
    this.tweens.add({ targets: veil, alpha: .72, duration: 400 });
    objs.push(veil);

    // Το φύλλο: πάπυρος με δύο κυλίνδρους και παλιωμένες άκρες
    const px = 130, py = 96, pw = W - 260, ph = 530;
    const sheet = this.add.graphics();
    sheet.fillStyle(shade(NUM.parchment, .7), 1);
    sheet.fillRoundedRect(px - 6, py - 6, pw + 12, ph + 12, 18);
    sheet.fillStyle(NUM.parchment, 1);
    sheet.fillRoundedRect(px, py, pw, ph, 14);
    sheet.fillStyle(shade(NUM.parchment, .9), 1);
    sheet.fillRect(px + 8, py + 6, pw - 16, 12);
    sheet.fillRect(px + 8, py + ph - 18, pw - 16, 12);
    sheet.fillStyle(shade(NUM.parchment, .58), 1);
    sheet.fillRoundedRect(px - 24, py - 16, 28, ph + 32, 13);
    sheet.fillRoundedRect(px + pw - 4, py - 16, 28, ph + 32, 13);
    const map = this.add.container(0, 0, [sheet]).setDepth(39).setAlpha(0);
    this.tweens.add({ targets: map, alpha: 1, duration: 420 });
    objs.push(map);

    const title = this.add.text(W / 2, py + 62, TXT.pathTitle, {
      fontFamily: FONT.ui, fontSize: '38px', fontStyle: '700', color: HEX.ink
    }).setOrigin(.5);
    map.add(title);

    const n = journey.STATIONS;
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: 240 + i * (800 / (n - 1)), y: 360 + Math.sin(i * 1.1) * 60 });
    const P = (q) => new Phaser.Geom.Point(q.x, q.y);

    const g = this.add.graphics();
    map.add(g);
    g.lineStyle(5, NUM.ink, .28);
    g.strokePoints(pts.map(P));
    if (from > 0) {
      g.lineStyle(6, NUM.flameDeep, .95);
      g.strokePoints(pts.slice(0, from + 1).map(P));
    }
    // Κάθε σταθμός είναι μετάλλιο με το σύμβολό του (ντότζο, μπαμπού, γέφυρα…)
    const medal = (gr, i, lit) => {
      const q = pts[i], r = i === n - 1 ? 27 : 21;
      gr.fillStyle(lit ? NUM.flame : NUM.parchment, 1);
      gr.fillCircle(q.x, q.y, r);
      gr.lineStyle(3, NUM.ink, lit ? .8 : .45);
      gr.strokeCircle(q.x, q.y, r);
      world.drawStationIcon(gr, i, q.x, q.y, r * .6, lit ? NUM.parchment : NUM.ink, lit ? 1 : .5);
    };
    pts.forEach((q, i) => medal(g, i, i <= from));
    const lit = this.add.graphics();                       // ο νέος σταθμός ανάβει όταν φτάσει
    map.add(lit);

    // Το βήμα: η φωτιά του δρόμου απλώνεται από τον έναν σταθμό στον άλλον
    const walk = this.add.graphics();
    map.add(walk);
    const a = pts[from], b = pts[to];
    const step = { u: 0 };
    this.tweens.add({
      targets: step, u: 1, duration: 1000, delay: 700, ease: 'Sine.easeInOut',
      onUpdate: () => {
        walk.clear();
        walk.lineStyle(6, NUM.flameDeep, .95);
        walk.lineBetween(a.x, a.y, a.x + (b.x - a.x) * step.u, a.y + (b.y - a.y) * step.u);
      }
    });
    // Ο ίδιος ο νίντζα περπατά το βήμα — με τη ζώνη του κύκλου του
    const marker = this.miniNinja(a.x, a.y - 40);
    map.add(marker);
    this.tweens.add({ targets: marker, x: b.x, y: b.y - 40, duration: 1000, delay: 700, ease: 'Sine.easeInOut' });
    if (!this.calm) {
      this.tweens.add({ targets: marker, angle: { from: -7, to: 7 }, duration: 160, delay: 700,
        yoyo: true, repeat: 2, onComplete: () => marker.setAngle(0) });
    }
    this.time.delayedCall(1750, () => {
      audio.cast();
      medal(lit, to, true);
      this.sealRing(b.x, b.y, NUM.flame);
    });

    const label = this.add.text(b.x, b.y + 56, TXT.stations[to], {
      fontFamily: FONT.ui, fontSize: '22px', fontStyle: '700', color: HEX.ink
    }).setOrigin(.5).setAlpha(0);
    map.add(label);
    this.tweens.add({ targets: label, alpha: 1, duration: 400, delay: 1700 });

    let canGo = 2300, end = 6000;
    if (newPower) {
      canGo = 3300;
      end = 7000;
      const pwr = this.add.text(W / 2, py + ph - 96, `${TXT.newPower}: ${TXT.powers[newPower]}`, {
        fontFamily: FONT.ui, fontSize: '34px', fontStyle: '700', color: HEX.flameDeep
      }).setOrigin(.5).setAlpha(0);
      map.add(pwr);
      this.tweens.add({ targets: pwr, alpha: 1, scale: { from: .7, to: 1 }, duration: 500, delay: 2500, ease: 'Back.easeOut' });
      this.time.delayedCall(2500, () => { audio.cast(); this.sealRing(W / 2, py + ph - 96, NUM.flame); });
    }

    // Πάνω από ΟΛΑ τα κουμπιά (και την μπάρα δύναμης, βάθος 47)
    const tap = this.add.zone(0, 0, W, H).setOrigin(0).setDepth(48);
    objs.push(tap);
    const hint = this.add.text(W / 2, py + ph - 40, TXT.tapToGo, {
      fontFamily: FONT.ui, fontSize: '20px', color: HEX.ink
    }).setOrigin(.5).setAlpha(0);
    map.add(hint);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      this.tweens.add({ targets: objs, alpha: 0, duration: 450 });
      this.time.delayedCall(480, () => { objs.forEach((o) => this.destroyDeep(o)); done(); });
    };
    this.time.delayedCall(canGo, () => {
      if (closed) return;
      tap.setInteractive().on('pointerdown', close);
      this.tweens.add({ targets: hint, alpha: .6, duration: 400 });
      if (!this.calm) this.tweens.add({ targets: hint, alpha: .3, duration: 900, delay: 400, yoyo: true, repeat: -1 });
    });
    this.time.delayedCall(end, close);
  }

  // Το κάστρο έπεσε: ο Δρόμος ολοκληρώθηκε. Πυροτεχνήματα, νέα ζώνη που
  // φαίνεται ΑΜΕΣΩΣ πάνω στον νίντζα, και ο Δρόμος ξαναρχίζει πιο δύσκολος.
  showVictory(done) {
    const objs = [];
    const veil = this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setDepth(38).setAlpha(0);
    this.tweens.add({ targets: veil, alpha: .85, duration: 500 });
    objs.push(veil);
    this.ninja.setDepth(41);
    audio.cast();

    this.time.addEvent({
      delay: 380, repeat: 10,
      callback: () => {
        const p = this.add.particles(Phaser.Math.Between(200, 1080), Phaser.Math.Between(120, 360), 'spark', {
          speed: { min: 80, max: 260 }, scale: { start: .9, end: 0 }, alpha: { start: 1, end: 0 },
          lifespan: 900, blendMode: 'ADD', tint: [NUM.flameCore, NUM.lantern, NUM.flame, NUM.spirit],
          emitting: false
        }).setDepth(40);
        p.explode(40);
        audio.chime(Phaser.Math.Between(0, 3));
        this.time.delayedCall(1100, () => p.destroy());
      }
    });

    const big = this.add.text(W / 2, 230, TXT.victory, {
      fontFamily: FONT.ui, fontSize: '56px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    big.setShadow(0, 0, HEX.flame, 30, false, true);
    const sub = this.add.text(W / 2, 300, TXT.victorySub, {
      fontFamily: FONT.ui, fontSize: '28px', color: HEX.parchment
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    const beltHex = '#' + journey.beltColor(this.cycle).toString(16).padStart(6, '0');
    // Η νέα ζώνη ως ΣΧΗΜΑ, μεγάλη, πριν κάτσει πάνω στον νίντζα
    const beltG = this.add.graphics({ x: W / 2, y: 378 }).setDepth(40).setAlpha(0);
    world.drawBelt(beltG, 0, 0, 2.6, journey.beltColor(this.cycle));
    const belt = this.add.text(W / 2, 450, `${TXT.newBelt}: ${TXT.belts[journey.beltIndex(this.cycle)]}`, {
      fontFamily: FONT.ui, fontSize: '28px', fontStyle: '700', color: beltHex
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    // Ζ10: με τη νέα ζώνη έρχεται και ΝΕΟ ΟΠΛΟ — το λέει και το δείχνει
    const weapon = journey.weaponFor(this.cycle);
    const newWeapon = weapon !== journey.weaponFor(this.cycle - 1);
    const gift = this.add.text(W / 2, 490, newWeapon ? `${TXT.newWeapon}: ${TXT.weapons[weapon]}` : TXT.beltGift, {
      fontFamily: FONT.ui, fontSize: newWeapon ? '26px' : '20px', fontStyle: newWeapon ? '700' : '400', color: HEX.lantern
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    if (newWeapon) {
      this.time.delayedCall(3400, () => {
        if (this.hand) this.hand.setTint(this.weaponTint(weapon));
        if (weapon === 'volt') { audio.thunder(.35); return; }
        const { obj, s0, s1 } = this.makeBolt(weapon, true);
        obj.setPosition(this.ninja.x + 56, this.ninja.y - 78).setScale(s0).setDepth(41);
        audio.cast();
        this.tweens.add({ targets: obj, x: W + 80, scale: s1, duration: 700, ease: 'Quad.easeIn',
          onComplete: () => this.destroyDeep(obj) });
      });
    }
    const again = this.add.text(W / 2, 534, TXT.againHarder, {
      fontFamily: FONT.ui, fontSize: '22px', color: HEX.smoke
    }).setOrigin(.5).setDepth(40).setAlpha(0);
    objs.push(big, sub, beltG, belt, gift, again);
    this.tweens.add({ targets: gift, alpha: .9, duration: 500, delay: 3200 });

    this.tweens.add({ targets: big, alpha: 1, scale: { from: .6, to: 1 }, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 500, delay: 900 });
    this.time.delayedCall(2400, () => {
      this.paintBelt(journey.beltColor(this.cycle));
      this.sealRing(this.ninja.x, this.ninja.y - 50, journey.beltColor(this.cycle));
      audio.cast();
      this.tweens.add({ targets: [belt, beltG], alpha: 1, scale: { from: .5, to: 1 }, duration: 500, ease: 'Back.easeOut' });
    });
    this.tweens.add({ targets: again, alpha: 1, duration: 500, delay: 4200 });
    this.time.delayedCall(6300, () => this.tweens.add({ targets: objs, alpha: 0, duration: 500 }));
    this.time.delayedCall(6850, () => {
      objs.forEach((o) => o.destroy());
      this.ninja.setDepth(12);
      done();
    });
  }
}

// Οι χορογραφίες των δυνάμεων, του σπαθιού και της Μεγάλης Τεχνικής (powers.js)
Object.assign(BattleScene.prototype, PowerMethods);
