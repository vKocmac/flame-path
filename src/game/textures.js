// Παραγωγή textures με canvas — φως, φλόγα, σπίθες, ομίχλη, βινιέτα.
// Ό,τι χρειάζεται απαλή διαβάθμιση φτιάχνεται εδώ· ό,τι είναι σιλουέτα
// ζωγραφίζεται με Graphics μέσα στη σκηνή (θέατρο σκιών, DESIGN.md).

import { HEX, rgba } from '../theme/palette.js';

function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.context, w, h);
  tex.refresh();
}

// Απαλή σφαίρα φωτός — η βάση κάθε λάμψης στο παιχνίδι.
function glow(scene, key, size, hex) {
  canvasTexture(scene, key, size, size, (ctx) => {
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, rgba(hex, 1));
    g.addColorStop(0.22, rgba(hex, 0.55));
    g.addColorStop(0.5, rgba(hex, 0.18));
    g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

/**
 * Χαρτί περγαμηνής (NEXT-FIXES Γ9). Το καθαρό ορθογώνιο δεν έμοιαζε με
 * περγαμηνή· εδώ μπαίνει κόκκος, ίνες, λεκέδες και ακανόνιστη άκρη.
 *
 * ΟΡΙΟ: ό,τι μπαίνει εδώ πρέπει να μένει κάτω από ~6% αντίθεση. Η λέξη
 * είναι μελάνι σε περγαμηνή και η αναγνωσιμότητά της είναι αμετάβλητο
 * (DESIGN.md) — η υφή δεν επιτρέπεται να παλέψει με τα γράμματα.
 *
 * @param {Phaser.Scene} scene
 * @param {string} key
 * @param {number} w
 * @param {number} h
 * @param {number} radius γωνία των άκρων
 */
function paper(scene, key, w, h, radius) {
  canvasTexture(scene, key, w, h, (ctx) => {
    // Ντετερμινιστικός θόρυβος: ίδια υφή σε κάθε φόρτωση, ώστε να μη
    // «τρεμοπαίζει» το χαρτί όταν ξαναχτιστεί η σκηνή.
    let seed = 20260904;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Άκρη με μικρές ατέλειες — δεν είναι τελείως ίσια, όπως το κομμένο χαρτί
    ctx.beginPath();
    const edge = (x, y) => ctx.lineTo(x + (rnd() - .5) * 2.4, y + (rnd() - .5) * 2.4);
    const STEP = 9;
    ctx.moveTo(radius, 0);
    for (let x = radius; x < w - radius; x += STEP) edge(x, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    for (let y = radius; y < h - radius; y += STEP) edge(w, y);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    for (let x = w - radius; x > radius; x -= STEP) edge(x, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    for (let y = h - radius; y > radius; y -= STEP) edge(0, y);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = HEX.parchment;
    ctx.fillRect(0, 0, w, h);

    // Ελαφρύ ζέσταμα στο κέντρο και σκίαση στα άκρα: το χαρτί είναι λίγο
    // κυρτό, όχι επίπεδο σαν κάρτα.
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, rgba(HEX.ink, 0.055));
    shade.addColorStop(0.22, rgba(HEX.ink, 0));
    shade.addColorStop(0.78, rgba(HEX.ink, 0));
    shade.addColorStop(1, rgba(HEX.ink, 0.075));
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);

    // Λεκέδες — μεγάλοι, πολύ αχνοί
    for (let i = 0; i < 22; i++) {
      const bx = rnd() * w, by = rnd() * h, br = 16 + rnd() * 84;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, rgba(HEX.ink, 0.016));
      g.addColorStop(1, rgba(HEX.ink, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // Ίνες — κοντές οριζόντιες γραμμές, όπως στο χειροποίητο χαρτί
    ctx.lineWidth = 1;
    for (let i = 0; i < 130; i++) {
      const fx = rnd() * w, fy = rnd() * h, len = 6 + rnd() * 26;
      ctx.strokeStyle = rgba(HEX.ink, 0.02 + rnd() * 0.03);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + len / 2, fy + (rnd() - .5) * 3, fx + len, fy);
      ctx.stroke();
    }

    // Κόκκος
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rgba(rnd() > .5 ? HEX.ink : HEX.lantern, 0.018 + rnd() * 0.028);
      ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
    }
  });
}

export function buildTextures(scene) {
  // Δύο μεγέθη χαρτιού: η περγαμηνή της μάχης και ο πάπυρος του Μάστερ Γου
  paper(scene, 'paper-scroll', 640, 112, 18);
  paper(scene, 'paper-sheet', 460, 300, 14);

  glow(scene, 'glow-flame', 256, HEX.flame);
  glow(scene, 'glow-lantern', 256, HEX.lantern);
  glow(scene, 'glow-moon', 256, HEX.moon);
  glow(scene, 'glow-spirit', 256, HEX.spirit);

  // Σπίθα: μικρή κουκκίδα με απαλή άλω (για τα σωματίδια)
  canvasTexture(scene, 'spark', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, rgba(HEX.flameCore, 1));
    g.addColorStop(0.35, rgba(HEX.lantern, 0.75));
    g.addColorStop(1, rgba(HEX.flame, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  // Αστέρι: σταυρωτή λάμψη, πιο ενδιαφέρουσα από σκέτη κουκκίδα
  canvasTexture(scene, 'star', 24, 24, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 5);
    g.addColorStop(0, rgba(HEX.star, 1));
    g.addColorStop(1, rgba(HEX.star, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, 24);
    ctx.strokeStyle = rgba(HEX.star, 0.28);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 3); ctx.lineTo(12, 21);
    ctx.moveTo(3, 12); ctx.lineTo(21, 12);
    ctx.stroke();
  });

  // Φλόγα: τρία στρώματα, όπως η παλέτα (πυρήνας → φλόγα → βαθιά)
  canvasTexture(scene, 'flame', 160, 220, (ctx, w, h) => {
    const cx = w / 2;
    const teardrop = (topY, botY, spread) => {
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.bezierCurveTo(cx + spread, topY + (botY - topY) * 0.34,
                        cx + spread * 0.96, topY + (botY - topY) * 0.72, cx, botY);
      ctx.bezierCurveTo(cx - spread * 0.96, topY + (botY - topY) * 0.72,
                        cx - spread, topY + (botY - topY) * 0.34, cx, topY);
      ctx.closePath();
    };
    let g = ctx.createLinearGradient(0, 10, 0, h);
    g.addColorStop(0, HEX.lantern);
    g.addColorStop(0.45, HEX.flame);
    g.addColorStop(1, HEX.flameDeep);
    ctx.fillStyle = g;
    teardrop(12, h - 8, 62); ctx.fill();

    g = ctx.createLinearGradient(0, h * 0.3, 0, h);
    g.addColorStop(0, HEX.flameCore);
    g.addColorStop(1, HEX.lantern);
    ctx.fillStyle = g;
    teardrop(h * 0.34, h - 22, 34); ctx.fill();

    ctx.fillStyle = rgba(HEX.flameCore, 0.92);
    teardrop(h * 0.6, h - 34, 16); ctx.fill();
  });

  // Ομίχλη: απαλές οριζόντιες λωρίδες που σβήνουν στις άκρες (drift χωρίς ραφή)
  canvasTexture(scene, 'mist', 1280, 120, (ctx, w, h) => {
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w;
      const y = h * (0.25 + Math.random() * 0.5);
      const rx = 120 + Math.random() * 240;
      const ry = 12 + Math.random() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, rgba(HEX.ridgeFar, 0.5));
      g.addColorStop(1, rgba(HEX.ridgeFar, 0));
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Σβήσιμο αριστερά/δεξιά ώστε το loop να μη φαίνεται
    const fade = ctx.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.12, 'rgba(0,0,0,0)');
    fade.addColorStop(0.88, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
  });

  // Βινιέτα: σκοτεινιάζει τις άκρες, φέρνει το βλέμμα στο κέντρο
  canvasTexture(scene, 'vignette', 512, 288, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.98);
    g.addColorStop(0, rgba(HEX.shadow, 0));
    g.addColorStop(0.7, rgba(HEX.shadow, 0.14));
    g.addColorStop(1, rgba(HEX.shadow, 0.45));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
