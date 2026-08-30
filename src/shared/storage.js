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

export function createProfile(state, name) {
  const t = now();
  const entry = { profile: { id: newId(), name, createdAt: t, updatedAt: t }, words: [] };
  state.profiles.push(entry);
  if (!state.activeProfileId) state.activeProfileId = entry.profile.id;
  saveState(state);
  return entry;
}

export function activeProfile(state) {
  return state.profiles.find((p) => p.profile.id === state.activeProfileId) || null;
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

export function removeWord(state, wordId) {
  const p = activeProfile(state);
  p.words = p.words.filter((w) => w.id !== wordId);
  p.profile.updatedAt = now();
  saveState(state);
}

// --- Export / Import (η γέφυρα tablet ↔ κινητό) ---

export function exportJSON(state) {
  return JSON.stringify({ ...state, exportedAt: now() }, null, 2);
}

// Δέχεται v1 ή v2 αντίγραφο· επιστρέφει το νέο state ή πετάει Error.
export function importJSON(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error('Το αρχείο δεν είναι έγκυρο JSON.'); }
  if (!isKnownSchema(data)) {
    throw new Error('Το αρχείο δεν είναι αντίγραφο από αυτό το παιχνίδι.');
  }
  delete data.exportedAt;
  const m = migrate(data);
  saveState(m);
  return m;
}

// --- Ρυθμίσεις συσκευής (PIN — μένει εκτός export) ---

export function getDevice() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) || {}; }
  catch (e) { return {}; }
}

export function saveDevice(dev) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(dev));
}
