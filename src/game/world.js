// Ο κόσμος — κοινό υλικό για όλες τις σκηνές (τίτλος, μάχη, ντότζο).
// Θέατρο σκιών: επίπεδες σιλουέτες που σκουραίνουν όσο έρχονται μπροστά,
// φως μόνο από φωτιά και φεγγάρι (DESIGN.md).

import { NUM } from '../theme/palette.js';

export const W = 1280;
export const H = 720;

// Κορυφογραμμές ως ποσοστά — γραμμένες στο χέρι για σύνθεση, όχι τυχαίες:
// ο κόσμος πρέπει να είναι ο ίδιος τόπος κάθε φορά. Μία κυρίαρχη κορυφή
// πίσω από το ντότζο (x≈.35), μία χαμηλότερη δεξιά (x≈.72).
export const RIDGE_HAZE = [
  [0, .545], [.09, .50], [.18, .535], [.27, .445], [.36, .385], [.44, .46],
  [.53, .43], [.62, .49], [.71, .425], [.80, .485], [.89, .45], [1, .50]
];
export const RIDGE_FAR = [
  [0, .60], [.06, .565], [.13, .605], [.19, .52], [.245, .575], [.30, .455],
  [.345, .408], [.40, .478], [.445, .55], [.50, .505], [.555, .572],
  [.61, .534], [.665, .578], [.72, .478], [.775, .538], [.83, .588],
  [.885, .548], [.94, .592], [1, .562]
];
// Οροπέδιο στο x 0.22–0.40 για να κάθεται το ντότζο.
export const RIDGE_MID = [
  [0, .755], [.05, .70], [.10, .738], [.145, .686], [.185, .659], [.22, .653],
  [.40, .653], [.435, .666], [.475, .716], [.53, .664], [.585, .722],
  [.64, .676], [.70, .737], [.76, .681], [.82, .731], [.88, .690],
  [.94, .746], [1, .711]
];
export const RIDGE_NEAR = [
  [0, .885], [.08, .845], [.16, .872], [.25, .834], [.35, .868], [.45, .841],
  [.55, .876], [.64, .846], [.73, .879], [.82, .850], [.91, .883], [1, .855]
];

export const GROUND_Y = H * .878;

export function isCalm() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ------------------------------------------------------------------ ουρανός

// `mood` (προαιρετικό): η ατμόσφαιρα του σταθμού — δες STATION_MOOD.
export function buildSky(scene, glowX = 384, mood = {}) {
  const g = scene.add.graphics();
  g.fillGradientStyle(NUM.skyTop, NUM.skyTop, NUM.skyMid, NUM.skyMid, 1);
  g.fillRect(0, 0, W, H * .5);
  g.fillGradientStyle(NUM.skyMid, NUM.skyMid, NUM.skyLow, NUM.skyLow, 1);
  g.fillRect(0, H * .5 - 1, W, H * .5 + 1);
  const glow = scene.add.image(mood.glowX ?? glowX, H * .60, 'glow-lantern')
    .setScale(4.2, 2.0).setAlpha(mood.glowAlpha ?? .10).setBlendMode(Phaser.BlendModes.ADD);
  if (mood.glowTint) glow.setTint(mood.glowTint);
}

export function buildStars(scene, calm) {
  const moon = new Phaser.Math.Vector2(1078, 96);
  const n = calm ? 34 : 68;
  for (let i = 0; i < n; i++) {
    const x = Phaser.Math.Between(20, W - 20);
    const y = Phaser.Math.Between(24, 392);
    if (moon.distance(new Phaser.Math.Vector2(x, y)) < 130) continue;
    const s = Phaser.Math.FloatBetween(.18, .46);
    const a = Phaser.Math.FloatBetween(.35, .95);
    const star = scene.add.image(x, y, 'star').setScale(s).setAlpha(a);
    if (calm) continue;
    scene.tweens.add({
      targets: star, alpha: a * .35,
      duration: Phaser.Math.Between(1600, 4200),
      delay: Phaser.Math.Between(0, 3000),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }
}

// Επιστρέφει τη ζώνη του φεγγαριού, ώστε η σκηνή να δέσει πάνω της
// την κρυφή είσοδο γονέα αν τη θέλει.
export function buildMoon(scene, calm, mood = {}) {
  const x = 1078, y = 96;
  const k = mood.moonScale ?? 1;
  const halo = scene.add.image(x, y, 'glow-moon').setScale(1.5 * k).setAlpha(.30);
  scene.add.circle(x, y, 32 * k, NUM.moon);
  scene.add.circle(x + 9 * k, y - 6 * k, 27 * k, NUM.skyTop).setAlpha(.16);
  if (mood.moonTint) {                       // το κόκκινο φεγγάρι του κάστρου
    scene.add.circle(x, y, 32 * k, mood.moonTint).setAlpha(.38);
    halo.setTint(mood.moonTint);
  }
  if (!calm) {
    scene.tweens.add({ targets: halo, alpha: .40, scale: 1.62 * k,
      duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return scene.add.zone(x, y, 120, 120).setOrigin(.5);
}

// Σύννεφα: μακριές λεπτές λωρίδες που περνούν αργά — και μπροστά από το
// φεγγάρι (μπαίνουν μετά από αυτό). Ξεκινούν από τυχαίο σημείο, ώστε ο
// ουρανός να μην είναι άδειος στην αρχή.
export function buildClouds(scene, calm) {
  const shapes = [[0, 0, 190, 24], [74, -9, 150, 26], [158, 3, 170, 20], [-66, 5, 130, 16]];
  for (const [y, k, dur] of [[112, 1, 150000], [176, .7, 200000], [66, .85, 170000]]) {
    const g = scene.add.graphics({ x: W + 260, y });
    g.fillStyle(NUM.nightHigh, .55);
    for (const [dx, dy, w, h] of shapes) g.fillEllipse(dx * k, dy * k, w * k, h * k);
    g.fillStyle(NUM.moon, .05);                          // η κόψη που τη φωτίζει το φεγγάρι
    g.fillEllipse(60 * k, -15 * k, 160 * k, 9 * k);
    const startX = Phaser.Math.Between(-200, W + 200);
    g.setX(startX);
    if (calm) continue;
    const first = ((startX + 260) / (W + 520)) * dur;
    scene.tweens.add({
      targets: g, x: -260, duration: first,
      onComplete: () => {
        if (!g.scene) return;
        g.setX(W + 260);
        scene.tweens.add({ targets: g, x: -260, duration: dur, repeat: -1 });
      }
    });
  }
}

// Κοπάδι πουλιών (ή νυχτερίδες στον ναό και στο κάστρο) που διασχίζει τον
// ουρανό κάθε λίγο. Κάθε πουλί είναι ΔΙΚΟ ΤΟΥ αντικείμενο, όχι παιδί
// container: έτσι το backdrop τα καθαρίζει μαζί με τα tween τους.
export function buildBirds(scene, { bats = false } = {}) {
  const n = bats ? 4 : 5;
  const color = bats ? NUM.shadow : NUM.ridgeNear;
  const y0 = Phaser.Math.Between(120, 170);
  for (let i = 0; i < n; i++) {
    const ox = -i * 28 - (i % 2) * 6, oy = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9;
    const b = scene.add.graphics({ x: -80 + ox, y: y0 + oy });
    b.lineStyle(bats ? 3 : 2.4, color, .9);
    b.strokePoints(bats
      ? [P(-10, -1), P(-6, -4), P(-3, 1), P(0, -1), P(3, 1), P(6, -4), P(10, -1)]
      : [P(-9, -4), P(-4, 0), P(0, 2), P(4, 0), P(9, -4)]);
    scene.tweens.add({ targets: b, scaleY: -.5, duration: bats ? 110 : 230, yoyo: true, repeat: -1, delay: i * 45 });
    scene.tweens.add({ targets: b, x: W + 140 + ox, y: y0 - 40 + oy, duration: 24000, delay: 3000,
      repeat: -1, repeatDelay: 20000, ease: 'Sine.easeInOut' });
  }
}

export function buildMist(scene, calm) {
  for (let i = 0; i < 2; i++) {
    const y = H * (i === 0 ? .545 : .60);
    const speed = i === 0 ? 74000 : 108000;
    const alpha = i === 0 ? .40 : .28;
    for (const off of [0, W]) {
      const img = scene.add.image(off, y, 'mist').setOrigin(0, .5).setAlpha(alpha);
      if (calm) continue;
      scene.tweens.add({
        targets: img, x: off - W, duration: speed, repeat: -1, ease: 'Linear',
        onRepeat: (tw, tgt) => { tgt.x = off; }
      });
    }
  }
}

export function ridge(scene, points, color, alpha = 1) {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  const poly = points.map(([x, y]) => new Phaser.Geom.Point(x * W, y * H));
  poly.push(new Phaser.Geom.Point(W, H), new Phaser.Geom.Point(0, H));
  g.fillPoints(poly, true);
  return g;
}

export function buildGround(scene, { path = 'narrow' } = {}) {
  const gy = GROUND_Y;
  const g = scene.add.graphics();
  g.fillStyle(NUM.ground, 1);
  g.fillRect(0, gy, W, H - gy);
  g.fillStyle(NUM.path, 1);
  if (path === 'narrow') {
    g.fillPoints([
      new Phaser.Geom.Point(492, gy), new Phaser.Geom.Point(700, gy),
      new Phaser.Geom.Point(872, H), new Phaser.Geom.Point(330, H)
    ], true);
  } else if (path === 'wide') {
    // Ο δρόμος της μάχης: περνάει σε όλο το πλάτος μπροστά από τον θεατή
    g.fillPoints([
      new Phaser.Geom.Point(0, gy + 16), new Phaser.Geom.Point(W, gy + 4),
      new Phaser.Geom.Point(W, H), new Phaser.Geom.Point(0, H)
    ], true);
  }
  return g;
}

// Λεπτομέρειες στο χώμα: πέτρες με φεγγαρόφωτη κόψη και τούφες χόρτου που
// λυγίζουν στον αέρα — η λωρίδα του δρόμου να μη μοιάζει άδεια (φινίρισμα
// 11/09). Ανά σταθμό: φύλλα στο δάσος, χιόνι στην κορυφή, στάχτη στο κάστρο.
export function buildGroundDetail(scene, station, calm) {
  const gy = GROUND_Y;
  const stones = [[88, 26, 9], [300, 18, 7], [562, 30, 10], [764, 16, 6], [982, 24, 8], [1192, 20, 7]];
  const g = scene.add.graphics();
  g.fillStyle(NUM.ridgeNear, 1);
  for (const [x, w, h] of stones) g.fillEllipse(x, gy + 9 + h / 3, w, h);
  g.fillStyle(NUM.moon, .07);
  for (const [x, w, h] of stones) g.fillEllipse(x + 2, gy + 6 + h / 3, w * .6, h * .35);
  if (station === 1) {                                    // πεσμένα φύλλα μπαμπού
    g.fillStyle(NUM.smoke, .22);
    for (let i = 0; i < 26; i++) g.fillEllipse(Phaser.Math.Between(10, W - 10), gy + Phaser.Math.Between(12, 70), 9, 3);
  } else if (station === 5) {                             // χιόνι στις άκρες του δρόμου
    g.fillStyle(NUM.star, .13);
    for (const [x, w] of [[60, 140], [340, 90], [700, 120], [1010, 150], [1230, 90]]) g.fillEllipse(x, gy + 10, w, 7);
  } else if (station === 6) {                             // στάχτη και κάρβουνα
    g.fillStyle(NUM.flameDeep, .16);
    for (let i = 0; i < 14; i++) g.fillCircle(Phaser.Math.Between(20, W - 20), gy + Phaser.Math.Between(14, 70), 2);
  }
  for (const [x, k] of [[40, 1], [152, .8], [424, .9], [646, .7], [872, 1], [1104, .85], [1252, .9]]) {
    const t = scene.add.graphics({ x, y: gy + 9 });
    t.fillStyle(NUM.ground, 1);
    for (let i = 0; i < 5; i++) {
      const bx = (i - 2) * 3 * k, h = (13 + (i % 2) * 8) * k, lean = (i - 2) * 3.5 * k;
      t.fillTriangle(bx - 1.8 * k, 0, bx + 1.8 * k, 0, bx + lean, -h);
    }
    if (calm) continue;
    scene.tweens.add({ targets: t, angle: { from: -5, to: 5 }, duration: Phaser.Math.Between(1700, 2600),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 1200) });
  }
}

// ------------------------------------------------------------------- κτίρια

// Στέγη παγόδας: παραβολική κοιλιά με ανασηκωμένες άκρες (t⁶ = το γύρισμα).
export function sweptRoof(g, cx, apexY, halfW, sag, upturn, thick) {
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

// Σειρά ζωγραφικής: λάμψη → σιλουέτα → φωτισμένα ανοίγματα → καφασωτά.
// (Τα ανοίγματα ΠΡΕΠΕΙ να μπουν μετά τη σιλουέτα, αλλιώς τα σκεπάζει.)
export function buildDojo(scene, cx, baseY, s = 1, calm = false) {
  scene.add.image(cx, baseY - 34 * s, 'glow-lantern')
    .setScale(1.5 * s).setAlpha(.40).setBlendMode(Phaser.BlendModes.ADD);

  const g = scene.add.graphics();
  g.fillStyle(NUM.ridgeNear, 1);
  g.fillPoints([
    new Phaser.Geom.Point(cx - 122 * s, baseY + 4 * s),
    new Phaser.Geom.Point(cx + 122 * s, baseY + 4 * s),
    new Phaser.Geom.Point(cx + 96 * s, baseY + 34 * s),
    new Phaser.Geom.Point(cx - 104 * s, baseY + 30 * s)
  ], true);

  g.fillStyle(NUM.dojoBody, 1);
  g.fillRect(cx - 104 * s, baseY - 10 * s, 208 * s, 15 * s);
  g.fillRect(cx - 62 * s, baseY - 74 * s, 124 * s, 65 * s);
  g.fillRect(cx - 38 * s, baseY - 150 * s, 76 * s, 48 * s);

  g.fillStyle(NUM.dojoRoof, 1);
  sweptRoof(g, cx, baseY - 104 * s, 122 * s, 34 * s, 30 * s, 21 * s);
  sweptRoof(g, cx, baseY - 176 * s, 82 * s, 27 * s, 23 * s, 17 * s);
  g.fillRect(cx - 2.5 * s, baseY - 196 * s, 5 * s, 22 * s);
  g.fillStyle(NUM.lantern, .5);
  g.fillCircle(cx, baseY - 198 * s, 4 * s);

  const warm = scene.add.graphics();
  warm.fillStyle(NUM.lantern, .95);
  warm.fillRect(cx - 20 * s, baseY - 52 * s, 40 * s, 42 * s);
  warm.fillStyle(NUM.lantern, .8);
  warm.fillRect(cx - 52 * s, baseY - 62 * s, 20 * s, 22 * s);
  warm.fillRect(cx + 32 * s, baseY - 62 * s, 20 * s, 22 * s);
  warm.fillRect(cx - 14 * s, baseY - 140 * s, 28 * s, 26 * s);
  // Το ντότζο είναι το σπίτι: τα παράθυρά του ανασαίνουν ήρεμα, δεν τρεμοπαίζουν
  if (!calm) scene.tweens.add({ targets: warm, alpha: .82, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const bars = scene.add.graphics();
  bars.fillStyle(NUM.dojoRoof, 1);
  for (const dx of [-12, 0, 12]) bars.fillRect(cx + dx * s - 1.5 * s, baseY - 52 * s, 3 * s, 42 * s);
  for (const dx of [-42, 42]) bars.fillRect(cx + dx * s - 1.5 * s, baseY - 62 * s, 3 * s, 22 * s);
  for (const dx of [-6, 6]) bars.fillRect(cx + dx * s - 1.5 * s, baseY - 140 * s, 3 * s, 26 * s);
  for (const dx of [-92, -50, 50, 92]) bars.fillRect(cx + dx * s - 3 * s, baseY - 32 * s, 6 * s, 23 * s);

  scene.add.image(cx, baseY - 4 * s, 'glow-lantern')
    .setScale(.9 * s, .28 * s).setAlpha(.34).setBlendMode(Phaser.BlendModes.ADD);

  lantern(scene, cx - 118 * s, baseY - 96 * s, .8 * s, calm);
  lantern(scene, cx + 118 * s, baseY - 96 * s, .8 * s, calm);
}

export function buildTorii(scene, cx, baseY, calm = false) {
  const g = scene.add.graphics();
  g.fillStyle(NUM.ground, 1);
  g.fillRect(cx - 46, baseY - 96, 11, 96);
  g.fillRect(cx + 35, baseY - 96, 11, 96);
  g.fillRect(cx - 52, baseY - 68, 104, 8);
  sweptRoof(g, cx, baseY - 104, 68, 12, 14, 9);
  lantern(scene, cx, baseY - 60, .6, calm);
}

// `color`: πιο ανοιχτό για μπαμπού στο βάθος (θέατρο σκιών: ό,τι είναι
// μακριά είναι ανοιχτότερο).
// Ζωγραφίζεται ΓΥΡΩ ΑΠΟ ΤΗ ΒΑΣΗ του, ώστε να λυγίζει στον αέρα από εκεί
// (φινίρισμα 11/09: «πιο ζωντανά τα σκηνικά»). Σε ήρεμη κίνηση μένει ακίνητο.
export function buildBamboo(scene, x, baseY, scale, color = NUM.ground) {
  const g = scene.add.graphics({ x, y: baseY });
  g.fillStyle(color, 1);
  const stalks = [
    { dx: 0, h: 240, lean: 10 }, { dx: 26, h: 190, lean: -8 },
    { dx: -22, h: 205, lean: 6 }, { dx: 44, h: 150, lean: 14 }
  ];
  if (!isCalm()) {
    scene.tweens.add({ targets: g, angle: { from: -1.6, to: 1.6 }, duration: Phaser.Math.Between(2600, 4200),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 1500) });
  }
  for (const s of stalks) {
    const h = s.h * scale, w = 6 * scale;
    const x0 = s.dx * scale;
    const top = new Phaser.Geom.Point(x0 + s.lean * scale, -h);
    g.fillPoints([
      new Phaser.Geom.Point(x0 - w / 2, 0),
      new Phaser.Geom.Point(x0 + w / 2, 0),
      new Phaser.Geom.Point(top.x + w / 2.6, top.y),
      new Phaser.Geom.Point(top.x - w / 2.6, top.y)
    ], true);
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

export function lantern(scene, x, y, scale = 1, calm = false) {
  const glow = scene.add.image(x, y, 'glow-lantern')
    .setScale(.9 * scale).setAlpha(.55).setBlendMode(Phaser.BlendModes.ADD);
  const body = scene.add.graphics();
  body.fillStyle(NUM.shadow, 1);
  body.fillRect(x - 1 * scale, y - 26 * scale, 2 * scale, 12 * scale);
  body.fillStyle(NUM.lantern, 1);
  body.fillRoundedRect(x - 9 * scale, y - 14 * scale, 18 * scale, 26 * scale, 8 * scale);
  body.fillStyle(NUM.flameDeep, .35);
  body.fillRect(x - 9 * scale, y - 2 * scale, 18 * scale, 2 * scale);
  if (calm) return;
  scene.tweens.add({
    targets: glow, alpha: Phaser.Math.FloatBetween(.34, .44),
    scale: .9 * scale * Phaser.Math.FloatBetween(.9, .96),
    duration: Phaser.Math.Between(900, 1900),
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    delay: Phaser.Math.Between(0, 1200)
  });
}

// ------------------------------------------------ σκηνικά σταθμών (NEXT-FIXES Ε3)
//
// Κάθε σταθμός του Δρόμου έχει δικό του τοπίο — ίδιο θέατρο σκιών, ίδια
// παλέτα. Τρία στρώματα, ώστε να μπαίνουν ανάμεσα στις κορυφογραμμές:
//   back  — πίσω από την ομίχλη (κορυφές, κάστρο)
//   mid   — πάνω στη μεσαία κορυφογραμμή (ντότζο, γέφυρα, λίμνη, ναός)
//   front — μπροστά, πριν το χώμα (μπαμπού, καλάμια)

const P = (x, y) => new Phaser.Geom.Point(x, y);

function buildBridge(scene, calm) {
  const x0 = 360, x1 = 1210, deck = 505, rise = 46;
  // Το ποτάμι κάτω από τη γέφυρα — πριν τη γέφυρα, ώστε τα βάθρα να πατούν μέσα
  const water = scene.add.graphics();
  water.fillGradientStyle(NUM.skyMid, NUM.skyMid, NUM.skyLow, NUM.skyLow, .95);
  water.fillRect(x0 - 60, 560, x1 - x0 + 120, 44);
  const g = scene.add.graphics();
  const Y = (x) => deck - rise * Math.sin(Math.PI * (x - x0) / (x1 - x0));
  const xs = Array.from({ length: 31 }, (_, i) => x0 + (x1 - x0) * i / 30);
  g.fillStyle(NUM.ridgeNear, 1);
  g.fillPoints([...xs.map((x) => P(x, Y(x))), ...xs.slice().reverse().map((x) => P(x, Y(x) + 12))], true);
  g.lineStyle(4, NUM.ridgeNear, 1);                      // κάγκελο
  g.strokePoints(xs.map((x) => P(x, Y(x) - 26)));
  for (let i = 0; i <= 10; i++) {                        // κολονάκια
    const x = x0 + (x1 - x0) * i / 10;
    g.fillRect(x - 3, Y(x) - 30, 6, 30);
  }
  g.fillRect(x0 - 14, deck, 28, 140);                    // βάθρα
  g.fillRect(x1 - 14, deck, 28, 140);
  for (let i = 1; i < 8; i++) {                          // φανάρια στο κάγκελο
    const x = x0 + (x1 - x0) * i / 8;
    lantern(scene, x, Y(x) - 4, .5, calm);
    // …και καθρεφτίζονται στο νερό: σπασμένες πινελιές που τρεμοπαίζουν
    for (let k = 0; k < 3; k++) {
      const r = scene.add.rectangle(x + Phaser.Math.Between(-4, 4), 572 + k * 10, 18 - k * 4, 2, NUM.lantern)
        .setAlpha(.32 - k * .08);
      if (calm) continue;
      scene.tweens.add({ targets: r, alpha: .05, scaleX: .5, duration: Phaser.Math.Between(700, 1400),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: k * 150 });
    }
  }
}

function buildLake(scene, calm) {
  const g = scene.add.graphics();
  const y0 = H * .70, y1 = GROUND_Y + 2;
  g.fillGradientStyle(NUM.skyMid, NUM.skyMid, NUM.skyLow, NUM.skyLow, .95);
  g.fillRect(0, y0, W, y1 - y0);
  g.fillStyle(NUM.ridgeMid, 1);                           // η απέναντι όχθη
  g.fillEllipse(260, y0 + 2, 520, 22);
  g.fillEllipse(1000, y0 + 4, 560, 18);
  // Το φεγγάρι μέσα στο νερό: σπασμένες πινελιές που τρεμοπαίζουν
  for (let i = 0; i < 9; i++) {
    const y = y0 + 12 + i * ((y1 - y0 - 20) / 9);
    const w = 72 - i * 5 + Phaser.Math.Between(-8, 8);
    const r = scene.add.rectangle(1078 + Phaser.Math.Between(-10, 10), y, w, 3, NUM.moon)
      .setAlpha(.38 - i * .028);
    if (calm) continue;
    scene.tweens.add({ targets: r, alpha: .06, scaleX: .6, duration: Phaser.Math.Between(900, 1800),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 120 });
  }
  // Βάρκα με φανάρι που περνά αργά στο βάθος της λίμνης
  const boat = scene.add.container(200, y0 + 30);
  const hull = scene.add.graphics();
  hull.fillStyle(NUM.ridgeNear, 1);
  hull.fillPoints([P(-36, 0), P(36, 0), P(26, 9), P(-28, 9)], true);
  hull.fillRect(8, -30, 3, 30);                           // κοντάρι του φαναριού
  hull.fillCircle(-12, -9, 7);                            // ο βαρκάρης, σκυφτός
  hull.fillRect(-19, -6, 14, 7);
  const lampGlow = scene.add.image(14, -28, 'glow-lantern').setScale(.2).setAlpha(.75)
    .setBlendMode(Phaser.BlendModes.ADD);
  const lamp = scene.add.circle(14, -26, 3.5, NUM.lantern);
  const shine = scene.add.rectangle(14, 14, 14, 2, NUM.lantern).setAlpha(.3);   // η αντανάκλασή του
  boat.add([lampGlow, hull, lamp, shine]);
  if (calm) return;
  scene.tweens.add({ targets: boat, x: 960, duration: 80000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: boat, y: y0 + 27, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

function buildReeds(scene) {
  const g = scene.add.graphics();
  g.lineStyle(3, NUM.ground, 1);
  g.fillStyle(NUM.ground, 1);
  for (const [x0, n] of [[24, 9], [1182, 8]]) {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 9 + Phaser.Math.Between(-3, 3);
      const h = Phaser.Math.Between(60, 130), lean = Phaser.Math.Between(-14, 14);
      g.lineBetween(x, GROUND_Y + 6, x + lean, GROUND_Y - h);
      g.fillEllipse(x + lean, GROUND_Y - h + 10, 6, 22);
    }
  }
}

// Φως φωτιάς πίσω από παράθυρα: τρεμοπαίζει ακανόνιστα, όχι σαν ρολόι
// (φινίρισμα 11/09). Σε ήρεμη κίνηση μένει σταθερό.
function flicker(scene, obj, low) {
  if (isCalm()) return;
  scene.tweens.add({ targets: obj, alpha: { from: 1, to: low }, duration: Phaser.Math.Between(140, 320),
    yoyo: true, repeat: -1, repeatDelay: Phaser.Math.Between(400, 1800), ease: 'Sine.easeInOut' });
}

function buildTemple(scene, cx, baseY, s = 1) {
  scene.add.image(cx, baseY - 60 * s, 'glow-lantern').setScale(1.8 * s).setAlpha(.18)
    .setTint(NUM.flameDeep).setBlendMode(Phaser.BlendModes.ADD);
  const g = scene.add.graphics();
  g.fillStyle(NUM.ridgeNear, 1);
  g.fillRect(cx - 150 * s, baseY - 12 * s, 300 * s, 20 * s);
  g.fillRect(cx - 110 * s, baseY - 90 * s, 220 * s, 80 * s);
  g.fillRect(cx - 70 * s, baseY - 180 * s, 140 * s, 60 * s);
  g.fillRect(cx - 40 * s, baseY - 250 * s, 80 * s, 44 * s);
  sweptRoof(g, cx, baseY - 120 * s, 160 * s, 40 * s, 36 * s, 24 * s);
  sweptRoof(g, cx, baseY - 205 * s, 110 * s, 30 * s, 28 * s, 20 * s);
  sweptRoof(g, cx, baseY - 270 * s, 70 * s, 22 * s, 20 * s, 16 * s);
  g.fillRect(cx - 3 * s, baseY - 300 * s, 6 * s, 34 * s);
  const win = scene.add.graphics();                       // κόκκινα παράθυρα: απειλή, όχι ζεστασιά
  win.fillStyle(NUM.flameDeep, .75);
  for (const dx of [-70, -24, 24, 70]) win.fillRect(cx + (dx - 9) * s, baseY - 70 * s, 18 * s, 34 * s);
  win.fillRect(cx - 12 * s, baseY - 165 * s, 24 * s, 26 * s);
  flicker(scene, win, .72);
}

function buildPeak(scene) {
  const g = scene.add.graphics();
  g.fillStyle(NUM.ridgeHaze, 1);
  g.fillPoints([[480, 470], [600, 330], [660, 360], [760, 200], [820, 150], [880, 215],
    [960, 300], [1020, 280], [1140, 470]].map(([x, y]) => P(x, y)), true);
  g.fillStyle(NUM.moon, .2);                              // χιόνι στην κορυφή
  g.fillPoints([[760, 200], [820, 150], [880, 215], [850, 206], [822, 224], [790, 207]]
    .map(([x, y]) => P(x, y)), true);
}

function buildPines(scene) {
  const g = scene.add.graphics();
  g.fillStyle(NUM.ridgeNear, 1);
  for (const [x, y, k] of [[90, 520, 1], [180, 500, .8], [420, 495, .9], [1000, 505, 1.1], [1130, 495, .85], [1230, 510, 1]]) {
    g.fillRect(x - 3 * k, y - 10 * k, 6 * k, 30 * k);
    for (let i = 0; i < 4; i++) {
      const w = (46 - i * 9) * k, yy = y - 10 * k - i * 22 * k;
      g.fillTriangle(x - w / 2, yy, x + w / 2, yy, x, yy - 34 * k);
    }
  }
}

// Πέτρινο φανάρι (τόρο) στην άκρη του δρόμου του ναού
function buildToro(scene, x, baseY, s = 1) {
  scene.add.image(x, baseY - 66 * s, 'glow-lantern').setScale(.4 * s).setAlpha(.35)
    .setBlendMode(Phaser.BlendModes.ADD);
  const g = scene.add.graphics();
  g.fillStyle(NUM.ground, 1);
  g.fillRect(x - 17 * s, baseY - 9 * s, 34 * s, 9 * s);           // βάση
  g.fillRect(x - 5 * s, baseY - 48 * s, 10 * s, 40 * s);           // κορμός
  g.fillRect(x - 16 * s, baseY - 56 * s, 32 * s, 8 * s);           // πιάτο
  g.fillRect(x - 12 * s, baseY - 80 * s, 24 * s, 25 * s);          // θάλαμος του φωτός
  sweptRoof(g, x, baseY - 88 * s, 24 * s, 5 * s, 7 * s, 7 * s);
  g.fillRect(x - 2 * s, baseY - 100 * s, 4 * s, 9 * s);
  const win = scene.add.graphics();
  win.fillStyle(NUM.lantern, .85);
  win.fillRect(x - 6 * s, baseY - 75 * s, 12 * s, 14 * s);
}

// Σημαιάκια ανάμεσα σε δύο πεύκα της κορυφής, που τα χτυπά ο αέρας
function buildFlags(scene, calm) {
  const x0 = 90, y0 = 410, x1 = 420, y1 = 396, n = 11;
  const at = (t) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * 26 });
  const line = scene.add.graphics();
  line.lineStyle(2, NUM.ridgeNear, 1);
  line.strokePoints(Array.from({ length: 21 }, (_, i) => { const q = at(i / 20); return P(q.x, q.y); }));
  const colors = [NUM.flame, NUM.lantern, NUM.spirit, NUM.moon, NUM.flameDeep];
  for (let i = 1; i < n; i++) {
    const q = at(i / n);
    const f = scene.add.graphics({ x: q.x, y: q.y });
    f.fillStyle(colors[i % colors.length], .5);
    f.fillTriangle(-8, 0, 8, 0, 0, 18);
    if (calm) continue;
    scene.tweens.add({ targets: f, angle: { from: -10, to: 12 }, duration: Phaser.Math.Between(500, 900),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 60 });
  }
}

// Λάβαρα στους πύργους του κάστρου — κυματίζουν από το κοντάρι
function buildBanners(scene, cx, baseY, calm) {
  for (const dx of [-230, 230]) {
    const x = cx + dx, top = baseY - 240;
    const pole = scene.add.graphics();
    pole.fillStyle(NUM.ridgeNear, 1);
    pole.fillRect(x - 2, top, 4, 64);
    const b = scene.add.graphics({ x: x + 2, y: top + 4 });
    b.fillStyle(NUM.flameDeep, .85);
    b.fillPoints([P(0, 0), P(26, 0), P(26, 48), P(13, 39), P(0, 48)], true);
    b.fillStyle(NUM.shadow, .55);                                  // το σήμα του: σκοτεινός δίσκος
    b.fillCircle(13, 17, 6);
    if (calm) continue;
    scene.tweens.add({ targets: b, scaleX: .7, duration: Phaser.Math.Between(650, 950),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

function buildCastle(scene, cx, baseY, s = 1) {
  scene.add.rectangle(W / 2, H * .35, W, H * .7, NUM.flameDeep).setAlpha(.05);   // κοκκινωπός ουρανός
  scene.add.image(cx, baseY - 120 * s, 'glow-lantern').setScale(3 * s, 2 * s).setAlpha(.16)
    .setTint(NUM.flameDeep).setBlendMode(Phaser.BlendModes.ADD);
  const g = scene.add.graphics();
  g.fillStyle(NUM.ridgeNear, 1);
  g.fillRect(cx - 260 * s, baseY - 60 * s, 520 * s, 70 * s);              // τείχος
  for (let i = 0; i < 13; i++) g.fillRect(cx - 260 * s + i * 40 * s, baseY - 74 * s, 22 * s, 16 * s);
  for (const dx of [-230, 230]) {                                          // δύο πύργοι
    g.fillRect(cx + (dx - 36) * s, baseY - 170 * s, 72 * s, 180 * s);
    sweptRoof(g, cx + dx * s, baseY - 178 * s, 56 * s, 16 * s, 16 * s, 12 * s);
  }
  g.fillRect(cx - 90 * s, baseY - 160 * s, 180 * s, 110 * s);             // ο κεντρικός πύργος
  sweptRoof(g, cx, baseY - 168 * s, 130 * s, 30 * s, 30 * s, 20 * s);
  g.fillRect(cx - 60 * s, baseY - 240 * s, 120 * s, 70 * s);
  sweptRoof(g, cx, baseY - 246 * s, 92 * s, 24 * s, 24 * s, 16 * s);
  g.fillRect(cx - 34 * s, baseY - 300 * s, 68 * s, 50 * s);
  sweptRoof(g, cx, baseY - 306 * s, 58 * s, 18 * s, 18 * s, 13 * s);
  const win = scene.add.graphics();
  win.fillStyle(NUM.flameDeep, .8);
  for (const [x, y] of [[-50, -120], [0, -120], [50, -120], [-25, -205], [25, -205], [0, -278], [-230, -120], [230, -120]]) {
    win.fillRect(cx + (x - 7) * s, baseY + (y - 12) * s, 14 * s, 22 * s);
  }
  flicker(scene, win, .6);
}

// ------------------------------------------ η ζωή των τοπίων (φινίρισμα Ε3)
//
// Κάθε σταθμός έχει και κάτι που ΚΙΝΕΙΤΑΙ, αργά και στο βάθος — ίδια αρχή με
// τις μορφές: τίποτα δεν μοιάζει με ακίνητη ζωγραφιά. Χαμηλή ένταση, πίσω
// από τη μάχη: δεν πρέπει να τραβούν το μάτι από την περγαμηνή. Σε ήρεμη
// κίνηση (isCalm) δεν χτίζονται καθόλου. `advance`: η οθόνη ξεκινά ήδη
// «ζωντανή», όχι άδεια.

const zone = (x, y, w, h) => ({ type: 'random', source: new Phaser.Geom.Rectangle(x, y, w, h) });

// Πυγολαμπίδες: μικρά φώτα που ανάβουν, περιπλανιούνται και σβήνουν
function fireflies(scene, x, y, w, h, tint, every) {
  scene.add.particles(0, 0, 'spark', {
    emitZone: zone(x, y, w, h), frequency: every, lifespan: { min: 2400, max: 4200 },
    speedX: { min: -16, max: 16 }, speedY: { min: -14, max: 8 },
    scale: { start: .34, end: .08 }, alpha: { start: .85, end: 0 },
    tint, blendMode: 'ADD', advance: 4000
  });
}

// Φύλλα μπαμπού που πέφτουν στριφογυρίζοντας, φωτισμένα από το φεγγάρι
function leaves(scene) {
  scene.add.particles(0, 0, 'spark', {
    emitZone: zone(0, -20, W + 240, 10), frequency: 620, lifespan: 12000,
    speedX: { min: -48, max: -14 }, speedY: { min: 34, max: 60 },
    scaleX: { min: .5, max: .75 }, scaleY: .15,
    rotate: { onEmit: () => Phaser.Math.Between(0, 360), onUpdate: (p, k, t, v) => v + 1.4 },
    alpha: { min: .3, max: .5 }, tint: NUM.smoke, advance: 12000
  });
}

// Ουράνια φανάρια που ανεβαίνουν αργά από τη γέφυρα
function skyLanterns(scene) {
  scene.add.particles(0, 0, 'glow-lantern', {
    emitZone: zone(420, 450, 760, 30), frequency: 2400, lifespan: 17000,
    speedX: { min: -6, max: 9 }, speedY: { min: -24, max: -13 },
    scale: { start: .1, end: .045 }, alpha: { start: .85, end: 0 },
    blendMode: 'ADD', advance: 14000
  });
}

// Θυμίαμα: καπνός που ανεβαίνει από τον ναό και γέρνει με τον αέρα
function incense(scene, x, y) {
  scene.add.particles(x, y, 'puff', {
    frequency: 420, lifespan: 7000,
    speedX: { min: 4, max: 16 }, speedY: { min: -26, max: -14 },
    scale: { start: .35, end: 1.6 }, alpha: { start: .2, end: 0 },
    tint: NUM.smoke, advance: 6000
  });
}

// Χιόνι που το σπρώχνει ο αέρας της κορυφής
function snow(scene) {
  scene.add.particles(0, 0, 'spark', {
    emitZone: zone(-40, -40, 20, H * .8), frequency: 160, lifespan: 13000,
    speedX: { min: 70, max: 150 }, speedY: { min: 8, max: 34 },
    scale: { min: .1, max: .22 }, alpha: { min: .25, max: .6 },
    tint: NUM.star, advance: 13000
  });
}

// Σπίθες από το κάστρο: η φωτιά του Μάστερ Γου καίει εκεί μέσα
function embers(scene) {
  scene.add.particles(0, 0, 'spark', {
    emitZone: zone(600, 380, 520, 90), frequency: 170, lifespan: { min: 3500, max: 6000 },
    speedX: { min: -12, max: 14 }, speedY: { min: -46, max: -18 },
    scale: { start: .32, end: 0 }, alpha: { start: .9, end: 0 },
    tint: [NUM.flame, NUM.flameDeep, NUM.lantern], blendMode: 'ADD', advance: 5000
  });
}

const STATION_LAYERS = [
  { // 1. Το Ντότζο της Αυγής — το ντότζο μένει πίσω μας
    mid: (s, c) => buildDojo(s, 176, H * .653, .72, c),
    front: (s) => { buildBamboo(s, 60, H * .885, .8); buildBamboo(s, 1240, H * .89, .7); },
    life: (s) => fireflies(s, 20, 470, 460, 140, NUM.lantern, 520)
  },
  { // 2. Το Δάσος με τα Μπαμπού
    back: (s) => {
      for (const [x, k] of [[140, .9], [330, 1.1], [520, .8], [760, 1], [960, 1.2], [1150, .9]]) {
        buildBamboo(s, x, H * .70, k, NUM.ridgeMid);
      }
    },
    front: (s) => { buildBamboo(s, 40, H * .9, 1.15); buildBamboo(s, 250, H * .9, .75); buildBamboo(s, 1190, H * .9, 1.05); },
    life: (s) => leaves(s)
  },
  { // 3. Η Γέφυρα των Φαναριών
    mid: (s, c) => buildBridge(s, c),
    front: (s) => buildBamboo(s, 60, H * .885, .7),
    life: (s) => skyLanterns(s)
  },
  { // 4. Η Λίμνη του Φεγγαριού
    mid: (s, c) => buildLake(s, c),
    front: (s) => buildReeds(s),
    life: (s) => fireflies(s, 0, 470, W, 150, NUM.spirit, 300)
  },
  { // 5. Ο Ναός των Σκιών
    mid: (s, c) => { buildTemple(s, 860, H * .665, 1.05); buildTorii(s, 330, H * .74, c); },
    front: (s) => { buildToro(s, 64, GROUND_Y + 6, 1.1); buildToro(s, 1222, GROUND_Y + 4, 1); },
    life: (s) => incense(s, 860, 290)
  },
  { // 6. Η Κορυφή της Ομίχλης
    back: (s) => buildPeak(s),
    mid: (s, c) => { buildPines(s); buildFlags(s, c); },
    life: (s) => snow(s)
  },
  { // 7. Το Κάστρο του Μάστερ Γου
    back: (s, c) => { buildCastle(s, 860, H * .66, 1); buildBanners(s, 860, H * .66, c); },
    life: (s) => embers(s)
  }
];

// Η ατμόσφαιρα κάθε σταθμού: πού και τι χρώμα έχει το φως στον ορίζοντα,
// το φεγγάρι, και ένα πολύ αχνό φίλτρο χρώματος πάνω σε όλο το τοπίο
// (ΠΟΤΕ πάνω στις μορφές ή στην περγαμηνή — ζει μέσα στο backdrop).
const STATION_MOOD = [
  { glowX: 300, glowTint: NUM.flame, glowAlpha: .16 },                        // αυγή: ζεστό φως χαμηλά
  { glowAlpha: .06, wash: [NUM.spirit, .035] },                               // δάσος: πιο σκοτεινό
  { glowX: 780, glowAlpha: .15 },                                             // φως των φαναριών
  { glowX: 1078, glowTint: NUM.moon, glowAlpha: .12, moonScale: 1.35, wash: [NUM.spirit, .04] },
  { glowX: 860, glowTint: NUM.flameDeep, glowAlpha: .12, wash: [NUM.shadow, .14] },   // ναός των σκιών
  { glowTint: NUM.star, glowAlpha: .08, wash: [NUM.star, .045] },            // κρύο της κορυφής
  { glowX: 860, glowTint: NUM.flameDeep, glowAlpha: .2, moonTint: NUM.flameDeep }     // κόκκινο φεγγάρι
];

export function stationMood(station) { return STATION_MOOD[station] || {}; }

export function buildWash(scene, mood) {
  if (mood.wash) scene.add.rectangle(W / 2, H / 2, W, H, mood.wash[0]).setAlpha(mood.wash[1]);
}

// Διάττοντες αστέρες: ένας κάθε λίγα δευτερόλεπτα, πάνω από τα βουνά
export function buildShootingStars(scene) {
  scene.add.particles(0, 0, 'spark', {
    emitZone: zone(60, 20, 760, 120), frequency: 6500, lifespan: 900,
    speedX: { min: 520, max: 700 }, speedY: { min: 170, max: 230 },
    scaleX: { start: 2.6, end: .4 }, scaleY: .1, rotate: 18,
    alpha: { start: .9, end: 0 }, tint: NUM.star, blendMode: 'ADD'
  });
}

export function buildStation(scene, station, layer, calm = false) {
  const f = STATION_LAYERS[station] && STATION_LAYERS[station][layer];
  if (f) f(scene, calm);
}

/**
 * Τα εικονίδια των τριών δυνάμεων — ΣΧΗΜΑ, όχι λέξη (απαίτηση ιδιοκτήτη
 * 11/09: «γραφικό και όχι λεκτικό»). Ζωγραφίζονται γύρω από (cx, cy) με
 * μέγεθος s, ώστε το ίδιο σχήμα να μπαίνει στο HUD, στον χάρτη και στον τίτλο.
 */
export function drawPowerIcon(g, id, cx, cy, s, color, alpha = 1) {
  if (id === 'lightning') {
    g.fillStyle(color, alpha);
    g.fillPoints([[.28, -1], [-.48, .12], [-.04, .12], [-.32, 1], [.52, -.22], [.08, -.22], [.46, -1]]
      .map(([px, py]) => P(cx + px * s, cy + py * s)), true);
  } else if (id === 'ice') {
    g.lineStyle(Math.max(1.5, s * .17), color, alpha);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI / 3, dx = Math.cos(a), dy = Math.sin(a);
      g.lineBetween(cx - dx * s, cy - dy * s, cx + dx * s, cy + dy * s);
      for (const e of [-1, 1]) {
        const ex = cx + dx * s * .58 * e, ey = cy + dy * s * .58 * e;
        for (const b of [.8, -.8]) {
          g.lineBetween(ex, ey, ex + Math.cos(a + b) * s * .34 * e, ey + Math.sin(a + b) * s * .34 * e);
        }
      }
    }
  } else {                                             // πύρινος ανεμοστρόβιλος
    g.lineStyle(Math.max(1.5, s * .18), color, alpha);
    for (const [ox, oy, ew, eh] of [[0, -.68, 1.95, .44], [.14, -.2, 1.45, .38], [-.06, .24, 1, .32], [.1, .64, .5, .24]]) {
      g.strokeEllipse(cx + ox * s, cy + oy * s, ew * s, eh * s);
    }
  }
}

/** Η ζώνη ως σχήμα: λωρίδα, κόμπος, δύο ουρές — γύρω από (cx, cy), μέγεθος s. */
export function drawBelt(g, cx, cy, s, color) {
  g.fillStyle(color, 1);
  g.fillRoundedRect(cx - 24 * s, cy - 6 * s, 48 * s, 11 * s, 5 * s);
  g.fillPoints([P(cx - 2 * s, cy + 2 * s), P(cx + 4 * s, cy + 2 * s), P(cx - 6 * s, cy + 22 * s), P(cx - 12 * s, cy + 20 * s)], true);
  g.fillPoints([P(cx - 2 * s, cy + 2 * s), P(cx + 4 * s, cy + 2 * s), P(cx + 14 * s, cy + 20 * s), P(cx + 8 * s, cy + 22 * s)], true);
  g.fillStyle(NUM.shadow, .35);
  g.fillRoundedRect(cx - 7 * s, cy - 8 * s, 14 * s, 15 * s, 3 * s);
}

// Μικρή σταγόνα φλόγας (για τα εικονίδια των τεχνικών)
function flameDrop(g, cx, cy, s) {
  g.fillPoints([[0, -1], [.42, -.25], [.52, .28], [.3, .7], [0, .82], [-.3, .7], [-.52, .28], [-.42, -.25]]
    .map(([x, y]) => P(cx + x * s, cy + y * s)), true);
}

/** Οι τέσσερις τεχνικές ως σχήματα: ⟫ γρήγορη · μεγάλη φλόγα · δύο φλόγες · καρδιά. */
export function drawPerkIcon(g, id, cx, cy, s, color, alpha = 1) {
  g.fillStyle(color, alpha);
  if (id === 'swift') {
    g.lineStyle(Math.max(2, s * .24), color, alpha);
    for (const ox of [-.42, .18]) {
      g.strokePoints([P(cx + (ox - .2) * s, cy - .55 * s), P(cx + (ox + .3) * s, cy), P(cx + (ox - .2) * s, cy + .55 * s)]);
    }
  } else if (id === 'blaze') {
    flameDrop(g, cx, cy, s);
  } else if (id === 'twin') {
    flameDrop(g, cx - .38 * s, cy + .08 * s, s * .66);
    flameDrop(g, cx + .38 * s, cy - .08 * s, s * .66);
  } else {                                             // φλογερή καρδιά
    g.fillCircle(cx - .3 * s, cy - .18 * s, .36 * s);
    g.fillCircle(cx + .3 * s, cy - .18 * s, .36 * s);
    g.fillTriangle(cx - .64 * s, cy - .06 * s, cx + .64 * s, cy - .06 * s, cx, cy + .78 * s);
  }
}

/**
 * Οι επτά σταθμοί ως μικρά σύμβολα (χάρτης, τίτλος): ντότζο · μπαμπού ·
 * γέφυρα · λίμνη με φεγγάρι · πύλη ναού · κορυφή · κάστρο.
 */
export function drawStationIcon(g, station, cx, cy, s, color, alpha = 1) {
  const Q = (x, y) => P(cx + x * s, cy + y * s);
  g.fillStyle(color, alpha);
  g.lineStyle(Math.max(1.5, s * .14), color, alpha);
  switch (station) {
    case 0:                                                   // ντότζο
      g.fillPoints([Q(-.95, -.05), Q(.95, -.05), Q(.62, -.34), Q(-.62, -.34)], true);
      g.fillPoints([Q(-.6, -.5), Q(.6, -.5), Q(.36, -.78), Q(-.36, -.78)], true);
      g.fillRect(cx - .5 * s, cy - .05 * s, s, .72 * s);
      g.fillRect(cx - .3 * s, cy - .5 * s, .6 * s, .2 * s);
      break;
    case 1:                                                   // μπαμπού
      for (const [x, h] of [[-.45, .95], [0, 1.05], [.45, .8]]) {
        g.fillRect(cx + (x - .07) * s, cy - h * s * .9, .14 * s, h * s * 1.7);
        g.fillRect(cx + (x - .12) * s, cy - .1 * s, .24 * s, .07 * s);
      }
      g.fillTriangle(cx + .45 * s, cy - .5 * s, cx + .95 * s, cy - .8 * s, cx + .6 * s, cy - .42 * s);
      break;
    case 2: {                                                 // γέφυρα
      const arc = [];
      for (let i = 0; i <= 12; i++) { const t = -1 + i / 6; arc.push(Q(t * .95, .25 - .45 * (1 - t * t))); }
      g.strokePoints(arc);
      for (const x of [-.6, 0, .6]) g.lineBetween(cx + x * s, cy + (.25 - .45 * (1 - x * x)) * s, cx + x * s, cy + (.25 - .45 * (1 - x * x) - .3) * s);
      g.fillRect(cx - .95 * s, cy + .25 * s, .16 * s, .5 * s);
      g.fillRect(cx + .79 * s, cy + .25 * s, .16 * s, .5 * s);
      break;
    }
    case 3:                                                   // λίμνη με φεγγάρι
      g.fillCircle(cx, cy - .35 * s, .4 * s);
      g.lineBetween(cx - .9 * s, cy + .3 * s, cx + .9 * s, cy + .3 * s);
      g.lineBetween(cx - .55 * s, cy + .6 * s, cx + .55 * s, cy + .6 * s);
      break;
    case 4:                                                   // πύλη του ναού (τορίι)
      g.fillPoints([Q(-1, -.72), Q(1, -.72), Q(.86, -.52), Q(-.86, -.52)], true);
      g.fillRect(cx - .7 * s, cy - .3 * s, 1.4 * s, .14 * s);
      g.fillRect(cx - .6 * s, cy - .55 * s, .18 * s, 1.35 * s);
      g.fillRect(cx + .42 * s, cy - .55 * s, .18 * s, 1.35 * s);
      break;
    case 5:                                                   // κορυφή
      g.fillTriangle(cx - 1 * s, cy + .7 * s, cx + 1 * s, cy + .7 * s, cx + .05 * s, cy - .85 * s);
      g.fillStyle(color, alpha * .4);
      g.fillTriangle(cx - .5 * s, cy + .7 * s, cx + .5 * s, cy + .7 * s, cx - .4 * s, cy - .1 * s);
      break;
    default:                                                  // κάστρο
      g.fillRect(cx - .5 * s, cy - .3 * s, 1 * s, .95 * s);
      g.fillRect(cx - .92 * s, cy - .62 * s, .36 * s, 1.27 * s);
      g.fillRect(cx + .56 * s, cy - .62 * s, .36 * s, 1.27 * s);
      g.fillTriangle(cx - .98 * s, cy - .62 * s, cx - .5 * s, cy - .62 * s, cx - .74 * s, cy - 1 * s);
      g.fillTriangle(cx + .5 * s, cy - .62 * s, cx + .98 * s, cy - .62 * s, cx + .74 * s, cy - 1 * s);
      g.fillTriangle(cx - .5 * s, cy - .3 * s, cx + .5 * s, cy - .3 * s, cx, cy - .78 * s);
  }
}

export function buildVignette(scene) {
  return scene.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setDepth(40);
}
