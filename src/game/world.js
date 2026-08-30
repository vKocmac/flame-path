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

export function buildSky(scene, glowX = 384) {
  const g = scene.add.graphics();
  g.fillGradientStyle(NUM.skyTop, NUM.skyTop, NUM.skyMid, NUM.skyMid, 1);
  g.fillRect(0, 0, W, H * .5);
  g.fillGradientStyle(NUM.skyMid, NUM.skyMid, NUM.skyLow, NUM.skyLow, 1);
  g.fillRect(0, H * .5 - 1, W, H * .5 + 1);
  scene.add.image(glowX, H * .60, 'glow-lantern')
    .setScale(4.2, 2.0).setAlpha(.10).setBlendMode(Phaser.BlendModes.ADD);
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
export function buildMoon(scene, calm) {
  const x = 1078, y = 96;
  const halo = scene.add.image(x, y, 'glow-moon').setScale(1.5).setAlpha(.30);
  scene.add.circle(x, y, 32, NUM.moon);
  scene.add.circle(x + 9, y - 6, 27, NUM.skyTop).setAlpha(.16);
  if (!calm) {
    scene.tweens.add({ targets: halo, alpha: .40, scale: 1.62,
      duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return scene.add.zone(x, y, 120, 120).setOrigin(.5);
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

export function buildBamboo(scene, x, baseY, scale) {
  const g = scene.add.graphics();
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

export function buildVignette(scene) {
  return scene.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setDepth(40);
}
