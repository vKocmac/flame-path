// Εικονίδια της εφαρμογής (αρχική οθόνη κινητού, Play Store αργότερα).
// Ζωγραφίζονται ΑΠΟ ΚΩΔΙΚΑ, με τα χρώματα της παλέτας — χωρίς εξαρτήσεις:
// γέμισμα πολυγώνων με σάρωση γραμμών, εξομάλυνση με υπερδειγματοληψία,
// κωδικοποίηση PNG με το zlib του node.
//
//   node tools/make-icons.mjs
//
// Σχέδιο: ψηλή φλόγα (τα τρία στρώματα της φλόγας του παιχνιδιού) πίσω από
// τον νίντζα — κεφάλι, ώμοι, λευκή σχισμή ματιών, ουρές κορδέλας, φως
// φεγγαριού στο περίγραμμα. Διαβάζεται και στα 48 pixel: σκούρο κεφάλι,
// λευκή σχισμή, φωτιά γύρω.

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const HEX = {
  skyTop: '#1D2445', night: '#141A33', shadow: '#0B0E1F', dojoRoof: '#080B1C',
  lantern: '#FFC857', flame: '#FF7A1A', flameCore: '#FFE8A3', flameDeep: '#E8491D',
  parchment: '#F6EAD2', moon: '#E9E6F2'
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ramp = (stops, t) => {                      // [[θέση, χρώμα], ...]
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
      return mix(rgb(c0), rgb(c1), (t - p0) / (p1 - p0 || 1));
    }
  }
  return rgb(stops[stops.length - 1][1]);
};

// ------------------------------------------------------------ ο ζωγράφος
function canvas(S, SS) {
  const N = S * SS;
  const px = new Float32Array(N * N * 3);
  const blend = (x, y, c, a) => {
    const i = (y * N + x) * 3;
    px[i] += (c[0] - px[i]) * a;
    px[i + 1] += (c[1] - px[i + 1]) * a;
    px[i + 2] += (c[2] - px[i + 2]) * a;
  };
  return {
    N,
    // γέμισμα όλης της επιφάνειας με συνάρτηση χρώματος (u, v ∈ 0..1)
    fillAll(fn) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const [c, a] = fn((x + .5) / N, (y + .5) / N);
        if (a > 0) blend(x, y, c, a);
      }
    },
    // πολύγωνο σε μοναδιαίες συντεταγμένες, κανόνας άρτιου-περιττού
    poly(pts, colorFn, alpha = 1) {
      const P = pts.map(([x, y]) => [x * N, y * N]);
      let y0 = Infinity, y1 = -Infinity;
      for (const [, y] of P) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (let py = Math.max(0, Math.floor(y0)); py <= Math.min(N - 1, Math.ceil(y1)); py++) {
        const yc = py + .5, xs = [];
        for (let i = 0; i < P.length; i++) {
          const [xa, ya] = P[i], [xb, yb] = P[(i + 1) % P.length];
          if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) xs.push(xa + (yc - ya) * (xb - xa) / (yb - ya));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const xa = Math.max(0, Math.ceil(xs[k] - .5)), xb = Math.min(N - 1, Math.floor(xs[k + 1] - .5));
          for (let x = xa; x <= xb; x++) {
            const u = (x + .5) / N, v = yc / N;
            blend(x, py, typeof colorFn === 'function' ? colorFn(u, v) : colorFn,
              typeof alpha === 'function' ? alpha(u, v) : alpha);
          }
        }
      }
    },
    // υποδειγματοληψία σε S×S, RGBA 8-bit
    toRGBA() {
      const out = Buffer.alloc(S * S * 4);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        let r = 0, g = 0, b = 0;
        for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * N + (x * SS + sx)) * 3;
          r += px[i]; g += px[i + 1]; b += px[i + 2];
        }
        const k = SS * SS, o = (y * S + x) * 4;
        out[o] = Math.round(r / k); out[o + 1] = Math.round(g / k); out[o + 2] = Math.round(b / k); out[o + 3] = 255;
      }
      return out;
    }
  };
}

// ---------------------------------------------------------------- σχήματα
const bez = (p0, p1, p2, p3, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, s = 1 - t;
  return [s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0],
    s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1]];
});
// Η σταγόνα της φλόγας του παιχνιδιού (textures.js), με κορυφή που γέρνει
const teardrop = (cx, top, bot, spread, lean = 0) => {
  const h = bot - top, tip = [cx + lean, top];
  return [
    ...bez(tip, [cx + spread + lean * .4, top + h * .34], [cx + spread * .96, top + h * .72], [cx, bot]),
    ...bez([cx, bot], [cx - spread * .96, top + h * .72], [cx - spread + lean * .4, top + h * .34], tip).slice(1)
  ];
};
const ellipse = (cx, cy, rx, ry, n = 160) =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * rx, cy + Math.sin(i / n * Math.PI * 2) * ry]);
const stadium = (cx, cy, w, h) => {
  const r = h / 2, pts = [];
  for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; pts.push([cx + w / 2 - r + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  for (let i = 0; i <= 20; i++) { const a = Math.PI / 2 + i / 20 * Math.PI; pts.push([cx - w / 2 + r + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
};
const arcBand = (cx, cy, r, w, a0, a1, n = 60) => {
  const outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    outer.push([cx + Math.cos(a) * (r + w / 2), cy + Math.sin(a) * (r + w / 2)]);
    inner.push([cx + Math.cos(a) * (r - w / 2), cy + Math.sin(a) * (r - w / 2)]);
  }
  return [...outer, ...inner.reverse()];
};
// Λωρίδα φωτός πάνω στην κόψη ΕΛΛΕΙΨΗΣ (ο κύκλος δεν ακολουθούσε τους ώμους)
const ellipseBand = (cx, cy, rx, ry, w, a0, a1, n = 60) => {
  const outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, c = Math.cos(a), s = Math.sin(a);
    outer.push([cx + c * (rx + w / 2), cy + s * (ry + w / 2)]);
    inner.push([cx + c * (rx - w / 2), cy + s * (ry - w / 2)]);
  }
  return [...outer, ...inner.reverse()];
};
// Κορδέλα που στενεύει και κυματίζει, από (x0,y0) προς τα αριστερά
const ribbon = (x0, y0, len, rise, w0, w1, phase) => {
  const top = [], bot = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, x = x0 - len * t, y = y0 - rise * t + Math.sin(t * 3.4 + phase) * .018 * t;
    const w = w0 + (w1 - w0) * t;
    top.push([x, y - w / 2]); bot.push([x, y + w / 2]);
  }
  return [...top, ...bot.reverse()];
};

// ------------------------------------------------------------ το εικονίδιο
// k: κλίμακα του σχεδίου γύρω από το κέντρο (το maskable θέλει περιθώριο)
function drawIcon(S, SS, k = 1) {
  const c = canvas(S, SS);
  const T = (pts) => pts.map(([x, y]) => [.5 + (x - .5) * k, .5 + (y - .5) * k]);

  // νυχτερινός ουρανός + η λάμψη της φωτιάς
  // κάτω πιο ανοιχτό από τη σιλουέτα, ώστε να διαβάζονται οι ώμοι
  c.fillAll((u, v) => [mix(rgb(HEX.skyTop), rgb(HEX.night), v), 1]);
  c.fillAll((u, v) => {
    const d = Math.hypot((u - .5) / k, (v - .47) / k) / .46;
    return [rgb(HEX.flame), d < 1 ? .42 * (1 - d) * (1 - d) : 0];
  });

  // η φλόγα — τρία στρώματα, όπως στο παιχνίδι
  const top = .09, bot = .8;
  const fy = (v) => ((v - .5) / k + .5 - top) / (bot - top);
  c.poly(T(teardrop(.5, top, bot, .34, .045)),
    (u, v) => ramp([[0, HEX.lantern], [.45, HEX.flame], [1, HEX.flameDeep]], fy(v)));
  c.poly(T(teardrop(.5, .3, .78, .2, .03)),
    (u, v) => ramp([[0, HEX.flameCore], [1, HEX.lantern]], ((v - .5) / k + .5 - .3) / .48));
  c.poly(T(teardrop(.5, .47, .74, .1, .015)), rgb(HEX.flameCore), .92);

  // ο νίντζα: ώμοι, κεφάλι, ουρές κορδέλας
  const dark = rgb(HEX.dojoRoof);
  // κοντές, φαρδιές ουρές — οι μακριές και λεπτές έμοιαζαν με κεραίες
  // κοντές, φαρδιές ουρές που λεπταίνουν σε μύτη — οι μακριές και λεπτές
  // έμοιαζαν με κεραίες, οι κομμένες με ράμφος
  c.poly(T(ribbon(.38, .615, .2, .06, .08, .004, 0)), dark);
  c.poly(T(ribbon(.38, .665, .16, -.035, .065, .004, 1.9)), dark);
  c.poly(T(ellipse(.5, 1.0, .31, .21)), dark);
  c.poly(T(ellipse(.5, .66, .16, .16)), dark);
  // απαλό φως φεγγαριού στη δεξιά κόψη του κεφαλιού και του ώμου
  c.poly(T(arcBand(.5, .66, .155, .009, -1.1, .7)), rgb(HEX.moon), .24);
  c.poly(T(ellipseBand(.5, 1.0, .305, .205, .009, -1.25, -.45)), rgb(HEX.moon), .2);
  // η σχισμή των ματιών
  c.poly(T(stadium(.5, .638, .21, .05)), rgb(HEX.parchment));
  return c.toRGBA();
}

// ------------------------------------------------------------------- PNG
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
function png(S, rgba) {
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const out = new URL('../assets/img/', import.meta.url);
writeFileSync(new URL('icon-512.png', out), png(512, drawIcon(512, 4)));
writeFileSync(new URL('icon-192.png', out), png(192, drawIcon(192, 6)));
writeFileSync(new URL('icon-maskable-512.png', out), png(512, drawIcon(512, 4, .78)));
console.log('ok: icon-512.png, icon-192.png, icon-maskable-512.png');
