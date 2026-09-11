// Ήχος — παράγεται προγραμματιστικά με Web Audio (καθόλου αρχεία mp3).
// Λόγοι: μηδέν βάρος στο offline πακέτο, μηδέν θέμα αδειών, πλήρης έλεγχος.
// Οι browsers δεν επιτρέπουν ήχο πριν το πρώτο άγγιγμα — γι' αυτό unlock().

// Δύο ΑΝΕΞΑΡΤΗΤΑ κανάλια (BRANCH-SCOPE §7 / HYPER-NOTE §11):
//   music — το νυχτερινό ambience (και η μουσική, όταν μπει)
//   fx    — whoosh, τσιτσίρισμα, κουδούνισμα, χτύποι
// Όχι ένα master mute που τα κλείνει όλα μαζί. Η προτίμηση θυμάται.
let ctx = null;
let master = null;
let musicGain = null;
let fxGain = null;
let ambienceOn = false;
let crackleTimer = null;
export let muted = false;

const PREF_KEY = 'flame.audio.v1';
export let musicOn = true;
export let fxOn = true;
try {
  const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  if (typeof p.music === 'boolean') musicOn = p.music;
  if (typeof p.fx === 'boolean') fxOn = p.fx;
} catch (e) { /* απρόσιτο localStorage — μένουμε στα προεπιλεγμένα */ }

function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ music: musicOn, fx: fxOn })); }
  catch (e) { /* δεν είναι κρίσιμο */ }
}

function noiseBuffer(seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Καφέ θόρυβος: πιο «βαρύς» και φυσικός από τον λευκό
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

// Καλείται στο πρώτο άγγιγμα του χρήστη.
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = musicOn ? 1 : 0;
  musicGain.connect(master);
  fxGain = ctx.createGain();
  fxGain.gain.value = fxOn ? 1 : 0;
  fxGain.connect(master);
}

// Νυχτερινό αεράκι: φιλτραρισμένος θόρυβος με αργή αναπνοή.
function startWind() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(4);
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  lp.Q.value = 0.6;

  const gain = ctx.createGain();
  gain.gain.value = 0.05;

  // Αργή διακύμανση έντασης & συχνότητας — «ανασαίνει» ο άνεμος
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.028;
  lfo.connect(lfoGain).connect(gain.gain);

  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.037;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 140;
  lfo2.connect(lfo2Gain).connect(lp.frequency);

  src.connect(lp).connect(gain).connect(musicGain);
  src.start();
  lfo.start();
  lfo2.start();
}

// Ένα «κρακ» φωτιάς.
function crackle(volume = 1, dest = null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.25);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900 + Math.random() * 1800;
  bp.Q.value = 1.6;

  const g = ctx.createGain();
  const peak = (0.05 + Math.random() * 0.09) * volume;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + Math.random() * 0.14);

  src.connect(bp).connect(g).connect(dest || musicGain);
  src.start(t);
  src.stop(t + 0.4);
}

function scheduleCrackle() {
  crackleTimer = setTimeout(() => {
    if (ambienceOn) { crackle(); scheduleCrackle(); }
  }, 400 + Math.random() * 2200);
}

// --- Μουσική (NEXT-FIXES Ε4) --------------------------------------------
// «Χαλαρή, απειλητική.» Τρία στρώματα, όλα στο κανάλι της μουσικής:
//   1. ισοκράτης: χαμηλό Ρε + πέμπτη από ξεκούρδιστα πριόνια, πίσω από
//      φίλτρο που ανασαίνει — η νύχτα που περιμένει
//   2. μακρινό τύμπανο τάικο, αραιό, σαν καρδιά
//   3. φλάουτο σακουχάτσι: λίγες νότες της κλίμακας «ίν», με αέρα, γλίστρημα
//      και βιμπράτο, που χάνονται σε ηχώ. Η φράση κλείνει πάντα στο Ρε.
// Κανένας βρόχος που επαναλαμβάνεται: οι νότες διαλέγονται κάθε φορά, και
// ανάμεσα στις φράσεις υπάρχει σιωπή — είναι μέρος της μουσικής.
const IN_SCALE = [293.66, 311.13, 392.0, 440.0, 466.16, 587.33]; // Ρε Μι♭ Σολ Λα Σι♭ Ρε'
let musicTimers = [];
let echo = null;

function later(ms, fn) {
  const id = setTimeout(() => {
    musicTimers = musicTimers.filter((x) => x !== id);
    if (ambienceOn) fn();
  }, ms);
  musicTimers.push(id);
}

function makeEcho() {
  const d = ctx.createDelay(2);
  d.delayTime.value = 0.46;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1600;
  d.connect(lp).connect(fb).connect(d);
  const out = ctx.createGain();
  out.gain.value = 0.6;
  lp.connect(out).connect(musicGain);
  return d;
}

function startDrone() {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 240;
  lp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.value = 0.03;
  for (const [f, detune, vol] of [[73.42, -7, 1], [73.42, 7, 1], [110, 0, 0.4]]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = detune;
    const og = ctx.createGain();
    og.gain.value = vol;
    o.connect(og).connect(lp);
    o.start();
  }
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lg = ctx.createGain();
  lg.gain.value = 110;
  lfo.connect(lg).connect(lp.frequency);
  lfo.start();
  lp.connect(g).connect(musicGain);
}

function taiko(at, vol = 1) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(96, at);
  o.frequency.exponentialRampToValueAtTime(42, at + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.14 * vol, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  o.connect(g).connect(musicGain);
  o.start(at);
  o.stop(at + 1);
  // το δέρμα του τυμπάνου: σύντομος, σκοτεινός θόρυβος
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.1);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, at);
  ng.gain.exponentialRampToValueAtTime(0.05 * vol, at + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
  src.connect(lp).connect(ng).connect(musicGain);
  src.start(at);
  src.stop(at + 0.1);
}

// «μπουμ . . . μπουμ-μπουμ . . . .» — και καμιά φορά μόνο το πρώτο
function drumLoop() {
  const t = ctx.currentTime + 0.05;
  const beat = 60 / 54;
  taiko(t, 1);
  if (Math.random() < 0.7) {
    taiko(t + beat * 3, 0.7);
    taiko(t + beat * 3.5, 0.5);
  }
  later(beat * 8 * 1000, drumLoop);
}

function flute(freq, at, dur) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq * 0.97, at);                 // γλιστράει ΜΕΣΑ στη νότα
  o.frequency.exponentialRampToValueAtTime(freq, at + 0.18);
  const vib = ctx.createOscillator();
  vib.frequency.value = 5;
  const vg = ctx.createGain();
  vg.gain.setValueAtTime(0, at);
  vg.gain.linearRampToValueAtTime(freq * 0.012, at + dur * 0.6); // το βιμπράτο έρχεται αργά
  vib.connect(vg).connect(o.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = freq * 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.028, at + 0.25);
  g.gain.setValueAtTime(0.028, at + dur - 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(lp).connect(g);
  g.connect(musicGain);
  g.connect(echo);
  // ο αέρας μέσα στο καλάμι
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 2;
  bp.Q.value = 3;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, at);
  ng.gain.exponentialRampToValueAtTime(0.02, at + 0.08);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(bp).connect(ng).connect(g);
  o.start(at); vib.start(at); src.start(at);
  o.stop(at + dur + 0.05); vib.stop(at + dur + 0.05); src.stop(at + dur);
}

function phrase() {
  let at = ctx.currentTime + 0.1;
  let i = 1 + Math.floor(Math.random() * 3);         // ξεκινά κάπου στη μέση
  const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const dur = 1.2 + Math.random() * 1.6;
    flute(IN_SCALE[i], at, dur);
    at += dur + 0.15;
    const leap = [-2, -1, -1, 1, 2][Math.floor(Math.random() * 5)];
    i = Math.max(0, Math.min(IN_SCALE.length - 1, i + leap));
  }
  flute(IN_SCALE[0], at, 2.6);                         // κλείνει κάτω, στο Ρε
  const endsIn = at - ctx.currentTime + 2.6;
  later((endsIn + 5 + Math.random() * 7) * 1000, phrase);
}

function startMusic() {
  echo = makeEcho();
  startDrone();
  later(2500, drumLoop);
  later(6000, phrase);
}

export function startAmbience() {
  unlock();
  if (!ctx || ambienceOn) return;
  ambienceOn = true;
  startWind();
  scheduleCrackle();
  startMusic();
}

export function stopAmbience() {
  ambienceOn = false;
  if (crackleTimer) clearTimeout(crackleTimer);
  musicTimers.forEach(clearTimeout);
  musicTimers = [];
}

// Εκτόξευση φλόγας: θόρυβος που σαρώνει προς τα πάνω.
export function whoosh() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(1);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 2.2;
  bp.frequency.setValueAtTime(280, t);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 0.28);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

  src.connect(bp).connect(g).connect(fxGain);
  src.start(t);
  src.stop(t + 0.6);
  for (let i = 0; i < 4; i++) setTimeout(() => crackle(1.4, fxGain), 90 + i * 45);
}

// Η φλόγα δεν πιάνει: σύντομο, πνιχτό, καθόλου «ήχος αποτυχίας».
// Πέφτει σε συχνότητα και σβήνει — σαν να σβήνει κερί.
export function fizzle() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.6);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1600, t);
  lp.frequency.exponentialRampToValueAtTime(220, t + 0.34);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.10, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

  src.connect(lp).connect(g).connect(fxGain);
  src.start(t);
  src.stop(t + 0.5);
}

// Σπίθα που μαζεύεται (NEXT-FIXES Δ2). Ήταν καθαρό «κλινγκ» παιχνιδομηχανής·
// ο ιδιοκτήτης ζήτησε κάτι «πιο μαγικό». Τώρα: κρυστάλλινο τσιν από δύο
// ελαφρά ξεκούρδιστα ημίτονα (κυματίζουν σαν φως), μεταλλικό μη-αρμονικό
// τόνο καμπάνας, φύσημα σπίθας και δύο αχνές ηχούς στη νύχτα.
// Τα βήματα πατούν στην ιαπωνική κλίμακα «ίν» (Σολ-Λα-Σι♭-Ρε): οι τρεις
// σπίθες ενός χτυπήματος χτίζουν μια μικρή μυστηριακή φράση, όχι σκάλα.
export function chime(step = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [784, 880, 932, 1175];
  const f = notes[Math.min(step, notes.length - 1)];
  const cents = (c) => Math.pow(2, c / 1200);

  const tone = (freq, at, vol, tail) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + tail);
    o.connect(g).connect(fxGain);
    o.start(at);
    o.stop(at + tail + 0.05);
  };

  tone(f * cents(-6), t, 0.05, 0.9);          // η λάμψη: δύο τόνοι που κυματίζουν
  tone(f * cents(+6), t, 0.05, 0.9);
  tone(f * 2.76, t, 0.018, 0.35);             // το μέταλλο της καμπάνας, σύντομο
  tone(f * 2, t + 0.03, 0.02, 0.6);           // η οκτάβα ανοίγει τον ήχο
  tone(f * 2, t + 0.17, 0.012, 0.5);          // ηχώ
  tone(f * 2, t + 0.34, 0.006, 0.45);         // πιο μακρινή ηχώ

  // Το φύσημα της σπίθας: σύντομος, ψηλός θόρυβος
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.1);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6500;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.03, t + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(hp).connect(ng).connect(fxGain);
  src.start(t);
  src.stop(t + 0.08);
}

// Χαμηλός υπόκωφος χτύπος: ο εχθρός κάνει βήμα μπροστά.
export function thud() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.22);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
  o.connect(g).connect(fxGain);
  o.start(t);
  o.stop(t + 0.4);
}

// Ένας βαθύς, μαλακός «γδούπος» καπνού: ο Μάστερ Γου εμφανίζεται/χάνεται.
export function poof() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.5);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(160, t + 0.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(lp).connect(g).connect(fxGain);
  src.start(t);
  src.stop(t + 0.6);
}

// Καμπύλη παραμόρφωσης: δίνει «γρατζουνιά» σε καθαρές κυματομορφές. Χωρίς
// αυτήν ένα χαμηλό πριόνι με vibrato δεν ακούγεται σαν ζώο — ακούγεται σαν
// κόρνα. Ο βρυχηθμός θέλει αρμονικές ψηλά, όχι μόνο μπάσο.
let shaperCurve = null;
function grit(amount = 40) {
  if (!shaperCurve) {
    const n = 1024;
    shaperCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      shaperCurve[i] = ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x));
    }
  }
  const ws = ctx.createWaveShaper();
  ws.curve = shaperCurve;
  ws.oversample = '2x';
  return ws;
}

/**
 * Βρυχηθμός δράκου. Τρία στρώματα, γιατί ένα δεν φτάνει:
 *   1. δύο πριόνια ξεκούρδιστα μεταξύ τους → «σκίσιμο», όχι σφύριγμα
 *   2. φίλτρο formant γύρω στα 500 Hz → λαρύγγι, όχι ηχείο
 *   3. καφέ θόρυβος από πάνω → ανάσα του ζώου
 * Η συχνότητα πέφτει κατά ένα τρίτο σε όλη τη διάρκεια: το ζώο ξεφυσά.
 * @param {number} power 0..1 — μικρή προειδοποίηση ή κανονική επίθεση
 */
export function roar(power = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 0.55 + 0.5 * power;
  const vol = 0.09 + 0.13 * power;

  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(vol, t + 0.09);
  bus.gain.setValueAtTime(vol, t + dur * 0.55);
  bus.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const shape = grit(28);
  const form = ctx.createBiquadFilter();
  form.type = 'bandpass';
  form.frequency.setValueAtTime(520, t);
  form.frequency.exponentialRampToValueAtTime(300, t + dur);
  form.Q.value = 1.1;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;

  shape.connect(form).connect(lp).connect(bus).connect(fxGain);

  // Τα δύο πριόνια — το δεύτερο σκόπιμα ξεκούρδιστο κατά ένα πέμπτο
  for (const [base, det, lvl] of [[108, 0, 1], [163, 7, 0.55]]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.detune.value = det;
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.68, t + dur);
    const lfo = ctx.createOscillator();          // αργό τρέμουλο, όχι βόμβος
    lfo.frequency.value = 7.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = base * 0.05;
    lfo.connect(lfoG).connect(o.frequency);
    const og = ctx.createGain();
    og.gain.value = lvl;
    o.connect(og).connect(shape);
    o.start(t); lfo.start(t);
    o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }

  // Η ανάσα από πάνω
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(1.4);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 260;
  const ng = ctx.createGain();
  ng.gain.value = 0.5 * power;
  src.connect(hp).connect(ng).connect(bus);
  src.start(t);
  src.stop(t + dur + 0.1);
}

/**
 * Το φλογοβόλο: συνεχής ροή φωτιάς όση ώρα κρατά η δέσμη. Καφέ θόρυβος που
 * ανοίγει και ξανακλείνει, με τσιτσιρίσματα από πάνω. Χωρίς αυτό ο δράκος
 * βγάζει έναν ήχο και μετά σιωπή, ενώ η φωτιά συνεχίζει στην οθόνη.
 * @param {number} ms πόσο κρατά η δέσμη
 */
export function flamethrower(ms = 700) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = ms / 1000;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(Math.max(2, dur + 0.5));

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.exponentialRampToValueAtTime(2200, t + 0.12);
  lp.frequency.exponentialRampToValueAtTime(700, t + dur);
  lp.Q.value = 0.8;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 180;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.20, t + 0.10);
  g.gain.setValueAtTime(0.20, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);

  src.connect(hp).connect(lp).connect(g).connect(fxGain);
  src.start(t);
  src.stop(t + dur + 0.2);

  const n = Math.max(3, Math.round(dur * 14));
  for (let i = 0; i < n; i++) setTimeout(() => crackle(1.8, fxGain), (dur * 1000 * i) / n);
}

/**
 * Η εκτόξευση του νίντζα — «μαγικό», όχι σκέτο whoosh (NEXT-FIXES Γ4).
 * Τρία πράγματα μαζί: ανοδικό γλίστρημα (η ενέργεια μαζεύεται), μια καθαρή
 * καμπάνα με πέμπτη (το ξόρκι κλειδώνει) και κοντός αέρας (η φλόγα φεύγει).
 */
export function cast() {
  if (!ctx) return;
  const t = ctx.currentTime;

  // 1. Το γλίστρημα προς τα πάνω
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(320, t);
  o.frequency.exponentialRampToValueAtTime(1560, t + 0.22);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.10, t + 0.05);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  o.connect(og).connect(fxGain);
  o.start(t); o.stop(t + 0.4);

  // 2. Η καμπάνα: θεμελιώδης + πέμπτη + οκτάβα, με μεγάλη ουρά
  [[1174, 0.075, 0.9], [1760, 0.05, 1.1], [2348, 0.03, 1.3]].forEach(([f, v, tail]) => {
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = f;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t + 0.16);
    bg.gain.exponentialRampToValueAtTime(v, t + 0.19);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.19 + tail);
    b.connect(bg).connect(fxGain);
    b.start(t + 0.16); b.stop(t + 0.2 + tail);
  });

  // 3. Ο αέρας της φλόγας
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.8);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(500, t + 0.14);
  bp.frequency.exponentialRampToValueAtTime(3200, t + 0.42);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t + 0.14);
  ng.gain.exponentialRampToValueAtTime(0.13, t + 0.2);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(bp).connect(ng).connect(fxGain);
  src.start(t + 0.14);
  src.stop(t + 0.6);
  for (let i = 0; i < 3; i++) setTimeout(() => crackle(1.3, fxGain), 200 + i * 50);
}

// ------------------------------------------------ οι τρεις δυνάμεις (Ε3)
// Κάθε δύναμη έχει ΔΙΚΟ της ήχο — το παιδί πρέπει να την αναγνωρίζει και
// με κλειστά μάτια. Πριν, ο ανεμοστρόβιλος δανειζόταν το φλογοβόλο, ο
// κεραυνός το χτύπημα του Μάστερ Γου και ο πάγος το whoosh της βολής.

/** Ανεμοστρόβιλος: θόρυβος που ΣΤΡΙΦΟΓΥΡΙΖΕΙ (φίλτρο με γρήγορη ταλάντωση) και ανεβαίνει. */
export function gust() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = 1.25;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(2);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 3.2;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(1300, t + dur);
  const lfo = ctx.createOscillator();             // το στροβίλισμα
  lfo.frequency.setValueAtTime(5, t);
  lfo.frequency.linearRampToValueAtTime(11, t + dur);
  const lfoG = ctx.createGain();
  lfoG.gain.value = 260;
  lfo.connect(lfoG).connect(bp.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.26, t + 0.25);
  g.gain.setValueAtTime(0.26, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
  src.connect(bp).connect(g).connect(fxGain);
  src.start(t); lfo.start(t);
  src.stop(t + dur + 0.3); lfo.stop(t + dur + 0.3);
  for (let i = 0; i < 8; i++) setTimeout(() => crackle(1.5, fxGain), 120 + i * 120);
}

/** Κεραυνός: ξερό κρακ από πάνω και βροντή που κυλά. power < 1 για τις δευτερεύουσες αστραπές. */
export function thunder(power = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuffer(0.3);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.30 * power, t + 0.004);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  crack.connect(hp).connect(cg).connect(fxGain);
  crack.start(t); crack.stop(t + 0.2);
  if (power < 0.8) return;
  const roll = ctx.createBufferSource();
  roll.buffer = noiseBuffer(2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(520, t + 0.05);
  lp.frequency.exponentialRampToValueAtTime(90, t + 1.6);
  const rg = ctx.createGain();
  rg.gain.setValueAtTime(0.0001, t + 0.04);
  rg.gain.exponentialRampToValueAtTime(0.34, t + 0.16);
  rg.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  roll.connect(lp).connect(rg).connect(fxGain);
  roll.start(t + 0.04); roll.stop(t + 1.8);
}

/** Πάγος: γυάλινα τσιν που κατεβαίνουν (η κλίμακα «ίν» ψηλά) και παγωμένη ανάσα. */
export function frost() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [2349, 1865, 1760, 1568, 1175, 1397].forEach((f, i) => {
    const at = t + i * 0.085;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.045, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
    o.connect(g).connect(fxGain);
    o.start(at); o.stop(at + 0.75);
  });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(1.4);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(3000, t);
  hp.frequency.exponentialRampToValueAtTime(7000, t + 1.1);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  src.connect(hp).connect(ng).connect(fxGain);
  src.start(t); src.stop(t + 1.3);
}

/**
 * Ο οιωνός του Μάστερ Γου: υπόκωφο μουγκρητό που συνοδεύει την είσοδό του
 * και τις ατάκες του (μιλάει από 10/09 — πριν ήταν ο μόνος του ήχος). Δύο
 * τόνοι σε μικρό δεύτερο — το διάστημα που ο εγκέφαλος διαβάζει ως απειλή —
 * μαζί με ένα βαθύ φούσκωμα από κάτω.
 */
export function omen() {
  if (!ctx) return;
  const t = ctx.currentTime;

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(58, t);
  sub.frequency.exponentialRampToValueAtTime(38, t + 1.4);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.20, t + 0.35);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  sub.connect(sg).connect(fxGain);
  sub.start(t); sub.stop(t + 1.6);

  [233, 247].forEach((f, i) => {                 // σι♭ και σι — μικρό δεύτερο
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g).connect(fxGain);
    o.start(t + i * 0.06); o.stop(t + 1.6);
  });
}

/**
 * Το χτύπημα του Μάστερ Γου. Υπόκωφο και μεταλλικό — ΟΧΙ ήχος αποτυχίας:
 * δείχνει ότι χτύπησε ΑΥΤΟΣ, όχι ότι έφταιξε το παιδί (SPEC κεφ. 3).
 */
export function strike() {
  if (!ctx) return;
  const t = ctx.currentTime;

  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.26);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g).connect(fxGain);
  o.start(t); o.stop(t + 0.45);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.4);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2400, t);
  bp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
  bp.Q.value = 1.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  src.connect(bp).connect(ng).connect(fxGain);
  src.start(t); src.stop(t + 0.4);
}

export function setMusic(on) {
  musicOn = on;
  if (musicGain) musicGain.gain.value = on ? 1 : 0;
  savePrefs();
  return musicOn;
}

export function setFx(on) {
  fxOn = on;
  if (fxGain) fxGain.gain.value = on ? 1 : 0;
  savePrefs();
  return fxOn;
}

export function toggleMusic() { return setMusic(!musicOn); }
export function toggleFx() { return setFx(!fxOn); }

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m || held ? 0 : 1;
  return muted;
}

// Παύση του παιχνιδιού (Ζ1): σιωπή, όχι ctx.suspend(). Με παγωμένο ρολόι
// του AudioContext τα setTimeout της μουσικής συνεχίζουν και προγραμματίζουν
// όλα στην ΙΔΙΑ στιγμή — στην επιστροφή θα έσκαγαν δεκάδες τύμπανα μαζί.
let held = false;
export function hold(on) {
  held = on;
  if (!master || !ctx) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(muted || on ? 0 : 1, t + .25);
}

export function toggleMute() { return setMuted(!muted); }
