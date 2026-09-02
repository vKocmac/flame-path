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

export function startAmbience() {
  unlock();
  if (!ctx || ambienceOn) return;
  ambienceOn = true;
  startWind();
  scheduleCrackle();
}

export function stopAmbience() {
  ambienceOn = false;
  if (crackleTimer) clearTimeout(crackleTimer);
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

// Κουδούνισμα σπίθας — ζεστό, μικρό, χαρούμενο.
export function chime(step = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [880, 1108, 1318, 1760];
  const f = notes[Math.min(step, notes.length - 1)];
  for (const [mult, vol] of [[1, 0.09], [2, 0.035]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(fxGain);
    o.start(t);
    o.stop(t + 0.5);
  }
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

// Βρυχηθμός δράκου: χαμηλό πριόνι με αργό vibrato.
export function roar() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(78, t);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.55);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 6;
  lfo.connect(lfoG).connect(o.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 620;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(lp).connect(g).connect(fxGain);
  o.start(t); lfo.start(t);
  o.stop(t + 0.8); lfo.stop(t + 0.8);
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
  if (master) master.gain.value = m ? 0 : 1;
  return muted;
}

export function toggleMute() { return setMuted(!muted); }
