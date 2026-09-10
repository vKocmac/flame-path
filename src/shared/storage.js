// Αποθήκευση — local-first, sync-ready (ARCHITECTURE §7).
// Όλα τα δεδομένα προόδου ζουν εδώ· κανένα άλλο module δεν αγγίζει localStorage.
// Το PIN είναι ανά συσκευή (flame.device) και ΔΕΝ μπαίνει στο export.
//
// Schema v2: κάθε λέξη έχει ΛΙΣΤΑ στόχων (targets) — ένα ανά σημείο ελέγχου
// (π.χ. «ωδείο»: ω + ει + ο). Η μονάδα που προγραμματίζει το Leitner είναι
// ο ΣΤΟΧΟΣ, όχι η λέξη: κάθε στόχος έχει δικό του επίπεδο και ιστορικό.

import { newId, now } from './ids.js';

const STATE_KEY = 'flame.state.v1'; // το κλειδί μένει ίδιο· η έκδοση ζει στο schemaVersion
const DEVICE_KEY = 'flame.device.v1';
export const SCHEMA_VERSION = 2;

function defaultState() {
  const t = now();
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: t,
    updatedAt: t,
    activeProfileId: null,
    profiles: [] // [{ profile: {id, name, createdAt, updatedAt}, words: [] }]
  };
}

// --- Μετάβαση schema v1 → v2 (μία λέξη είχε έναν στόχο ενσωματωμένο) ---

function migrateWordV1(w) {
  return {
    id: w.id,
    text: w.text,
    targets: [{
      id: newId(),
      gap: w.gap,
      grapheme: w.targetGrapheme,
      confusionClass: w.confusionClass,
      distractors: w.distractors,
      level: w.level ?? 0,
      attempts: w.attempts ?? 0,
      successes: w.successes ?? 0,
      errorHistory: w.errorHistory ?? [],
      challengeTypesUsed: w.challengeTypesUsed ?? [],
      lastSeenAt: w.lastSeenAt ?? null,
      nextDueAt: w.nextDueAt ?? null,
      introduced: w.introduced ?? false
    }],
    sentence: w.sentence ?? null,
    audioWord: w.audioWord ?? null,
    audioSentence: w.audioSentence ?? null,
    addedAt: w.addedAt,
    updatedAt: now()
  };
}

function migrate(s) {
  if (s.schemaVersion === 1) {
    s.profiles.forEach((p) => { p.words = p.words.map(migrateWordV1); });
    s.schemaVersion = 2;
  }
  return s;
}

function isKnownSchema(s) {
  return s && (s.schemaVersion === 1 || s.schemaVersion === SCHEMA_VERSION)
    && Array.isArray(s.profiles);
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (isKnownSchema(s)) {
        const m = migrate(s);
        if (s.schemaVersion !== SCHEMA_VERSION) saveState(m);
        return m;
      }
    }
  } catch (e) { /* κατεστραμμένο ή απρόσιτο — ξεκινάμε καθαρά */ }
  return defaultState();
}

export function saveState(state) {
  state.updatedAt = now();
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// `words`: προαιρετικά, λέξεις που αντιγράφονται ΧΩΡΙΣ πρόοδο — π.χ. προφίλ
// «Δοκιμή» με τις λέξεις του Σταύρου, για να δοκιμάζεις χωρίς να τον πειράξεις.
export function createProfile(state, name, { words = [] } = {}) {
  const t = now();
  const entry = {
    profile: { id: newId(), name, createdAt: t, updatedAt: t },
    words: words.map((w) => freshWord(w, { newIds: true }))
  };
  state.profiles.push(entry);
  if (!state.activeProfileId) state.activeProfileId = entry.profile.id;
  saveState(state);
  return entry;
}

export function activeProfile(state) {
  return state.profiles.find((p) => p.profile.id === state.activeProfileId) || null;
}

// --- Προφίλ (NEXT-FIXES Ε7) ---
// Κάθε προφίλ έχει δικές του λέξεις, πρόοδο και σπίθες. Το PIN ΔΕΝ είναι
// ανά προφίλ: ένας γονιός, ένας κωδικός ανά συσκευή.

export function setActiveProfile(state, id) {
  if (!state.profiles.some((p) => p.profile.id === id)) return false;
  state.activeProfileId = id;
  saveState(state);
  return true;
}

export function renameProfile(state, id, name) {
  const p = state.profiles.find((x) => x.profile.id === id);
  if (!p) return false;
  p.profile.name = name;
  p.profile.updatedAt = now();
  saveState(state);
  return true;
}

// Το τελευταίο προφίλ δεν σβήνεται — για καθαρή συσκευή υπάρχει το eraseAll.
export function deleteProfile(state, id) {
  if (state.profiles.length <= 1) return false;
  state.profiles = state.profiles.filter((p) => p.profile.id !== id);
  if (state.activeProfileId === id) state.activeProfileId = state.profiles[0].profile.id;
  saveState(state);
  return true;
}

// Ένας στόχος χωρίς καμία ιστορία: όπως μόλις τον έγραψε ο γονιός.
function freshTarget(t) {
  return {
    ...t,
    level: 0, attempts: 0, successes: 0,
    errorHistory: [], challengeTypesUsed: [],
    lastSeenAt: null, nextDueAt: null,
    introduced: false
  };
}

// Η λέξη χωρίς την πρόοδό της. Με `newIds` παίρνει και νέα αναγνωριστικά —
// για αντιγραφή σε άλλο προφίλ, ώστε τα δύο να μη μοιράζονται ποτέ ταυτότητα.
export function freshWord(w, { newIds = false } = {}) {
  return {
    ...w,
    id: newIds ? newId() : w.id,
    targets: w.targets.map((t) => ({ ...freshTarget(t), id: newIds ? newId() : t.id })),
    updatedAt: now()
  };
}

// Μηδενισμός προόδου (Ε6): κρατά τις λέξεις, σβήνει σπίθες και
// χρονοδιάγραμμα. Ξαναπαίζει η τελετή του παπύρου από την αρχή.
export function resetProgress(state, id) {
  const p = state.profiles.find((x) => x.profile.id === id);
  if (!p) return false;
  p.words = p.words.map((w) => freshWord(w));
  p.profile.sparks = 0;
  delete p.profile.journey;                // και ο Δρόμος από τον πρώτο σταθμό
  p.profile.updatedAt = now();
  saveState(state);
  return true;
}

// Διαγραφή όλων (Ε6): καθαρή συσκευή. Το PIN μένει — είναι ρύθμιση της
// συσκευής, όχι δεδομένο του παιδιού.
export function eraseAll() {
  localStorage.removeItem(STATE_KEY);
  return loadState();
}

// Νέος στόχος (σημείο ελέγχου) με πλήρες learning state.
export function newTarget({ gap, grapheme, confusionClass, distractors }) {
  return {
    id: newId(),
    gap, grapheme, confusionClass, distractors,
    level: 0, attempts: 0, successes: 0,
    errorHistory: [], challengeTypesUsed: [],
    lastSeenAt: null, nextDueAt: null,
    introduced: false
  };
}

// Νέα λέξη: targets = [{gap, grapheme, confusionClass, distractors}, ...]
export function newWord({ text, targets }) {
  const t = now();
  return {
    id: newId(),
    text,
    targets: targets.map(newTarget),
    sentence: null, audioWord: null, audioSentence: null,
    addedAt: t, updatedAt: t
  };
}

export function addWord(state, word) {
  const p = activeProfile(state);
  p.words.push(word);
  p.profile.updatedAt = now();
  saveState(state);
}

// Σπίθες: το διακοσμητικό νόμισμα. Μένουν για πάντα — «ποτέ δεν χάνει
// όσα μάζεψε» (SPEC κεφ. 3). Δεν αγοράζουν τίποτα ουσιώδες.
export function getSparks(state) {
  return activeProfile(state)?.profile.sparks || 0;
}

export function addSparks(state, n) {
  const p = activeProfile(state);
  if (!p) return 0;
  p.profile.sparks = (p.profile.sparks || 0) + n;
  p.profile.updatedAt = now();
  saveState(state);
  return p.profile.sparks;
}

// --- Ο Δρόμος της Φλόγας (NEXT-FIXES Ε3): μόνιμη πρόοδος ιστορίας ---
// station: ο σταθμός που παίζεται τώρα (0-based) · cycle: πόσες φορές έχει
// ολοκληρωθεί ο Δρόμος (το χρώμα της ζώνης) · storySeen: είδε την ιστορία.
// Ζει στο προφίλ, όπως οι σπίθες. Είναι checkpoint: δεν χάνεται ποτέ.

export function getJourney(state) {
  const j = activeProfile(state)?.profile.journey || {};
  return { station: j.station || 0, cycle: j.cycle || 0, storySeen: !!j.storySeen };
}

// Συγχωνεύει: ό,τι άλλο ζει στο journey (π.χ. perksSeen) δεν χάνεται.
function setJourney(state, j) {
  const p = activeProfile(state);
  if (!p) return;
  p.profile.journey = { ...(p.profile.journey || {}), ...j };
  p.profile.updatedAt = now();
  saveState(state);
}

// Ποιες τεχνικές έχει ήδη δει να ωριμάζουν — για να ανακοινώνεται μόνο
// η καινούργια, μία φορά.
export function getPerksSeen(state) {
  const j = activeProfile(state)?.profile.journey;
  return j && Array.isArray(j.perksSeen) ? j.perksSeen : [];
}

export function markPerksSeen(state, ids) {
  setJourney(state, { perksSeen: [...ids] });
}

export function markStorySeen(state) {
  setJourney(state, { ...getJourney(state), storySeen: true });
}

// Εργαλείο δοκιμών του γονιού (Parent Mode): κατευθείαν σε σταθμό, για να
// δει τα τοπία χωρίς να παίξει 7 λεβελ. Κύκλος/ζώνη, λέξεις, πρόοδος μένουν.
export function jumpToStation(state, station) {
  setJourney(state, { station: Math.max(0, Math.floor(station)), storySeen: true });
}

// Νίκη στον σταθμό: ένας σταθμός μπροστά. Νίκη στον ΤΕΛΕΥΤΑΙΟ σταθμό =
// ο Δρόμος ολοκληρώθηκε: νέος κύκλος (ανώτερη ζώνη) από τον πρώτο σταθμό.
export function advanceJourney(state, stations) {
  const j = getJourney(state);
  const finished = j.station + 1 >= stations;
  const next = finished ? { ...j, station: 0, cycle: j.cycle + 1 } : { ...j, station: j.station + 1 };
  setJourney(state, next);
  return { ...next, finished, from: j.station };
}

export function removeWord(state, wordId) {
  const p = activeProfile(state);
  p.words = p.words.filter((w) => w.id !== wordId);
  p.profile.updatedAt = now();
  saveState(state);
}

// --- Export / Import (η γέφυρα tablet ↔ κινητό) ---

// Δύο είδη αντιγράφου (NEXT-FIXES Ε1):
// - `progress: false` (το συνηθισμένο) → μόνο οι λέξεις, κάθε στόχος σαν
//   καινούργιος, μηδέν σπίθες. Για δοκιμή σε καθαρή συσκευή.
// - `progress: true` → ολόκληρος ο παίκτης, για πραγματική μεταφορά.
export function exportJSON(state, { progress = true } = {}) {
  const out = JSON.parse(JSON.stringify(state));
  if (!progress) {
    out.profiles.forEach((p) => {
      p.words = p.words.map((w) => freshWord(w));
      p.profile.sparks = 0;
      delete p.profile.journey;
    });
  }
  return JSON.stringify({ ...out, kind: progress ? 'full' : 'words', exportedAt: now() }, null, 2);
}

function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error('Το αρχείο δεν είναι έγκυρο JSON.'); }
  if (!isKnownSchema(data)) {
    throw new Error('Το αρχείο δεν είναι αντίγραφο από αυτό το παιχνίδι.');
  }
  delete data.exportedAt;
  delete data.kind;
  return migrate(data);
}

// Πλήρης εισαγωγή: ΑΝΤΙΚΑΘΙΣΤΑ ό,τι υπάρχει στη συσκευή. Δέχεται v1 ή v2
// αντίγραφο· επιστρέφει το νέο state ή πετάει Error.
export function importJSON(text) {
  const m = parseBackup(text);
  if (!m.profiles.some((p) => p.profile.id === m.activeProfileId)) {
    m.activeProfileId = m.profiles[0]?.profile.id || null;
  }
  saveState(m);
  return m;
}

// Εισαγωγή ΜΟΝΟ λέξεων: ΠΡΟΣΘΕΤΕΙ στο ενεργό προφίλ τις λέξεις του αρχείου
// που δεν έχει ήδη, χωρίς πρόοδο. Δεν σβήνει τίποτα. Επιστρέφει πόσες μπήκαν.
export function importWords(state, text) {
  const data = parseBackup(text);
  const p = activeProfile(state);
  if (!p) throw new Error('Δεν υπάρχει ενεργό προφίλ.');
  const have = new Set(p.words.map((w) => w.text));
  let added = 0;
  for (const src of data.profiles) {
    for (const w of src.words) {
      if (have.has(w.text)) continue;
      p.words.push(freshWord(w, { newIds: true }));
      have.add(w.text);
      added++;
    }
  }
  p.profile.updatedAt = now();
  saveState(state);
  return added;
}

// --- Ρυθμίσεις συσκευής (PIN — μένει εκτός export) ---

export function getDevice() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) || {}; }
  catch (e) { return {}; }
}

export function saveDevice(dev) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(dev));
}
