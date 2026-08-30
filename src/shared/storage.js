// Αποθήκευση — local-first, sync-ready (ARCHITECTURE §7).
// Όλα τα δεδομένα προόδου ζουν εδώ· κανένα άλλο module δεν αγγίζει localStorage.
// Το PIN είναι ανά συσκευή (flame.device) και ΔΕΝ μπαίνει στο export.

import { newId, now } from './ids.js';

const STATE_KEY = 'flame.state.v1';
const DEVICE_KEY = 'flame.device.v1';
export const SCHEMA_VERSION = 1;

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

export function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.schemaVersion === SCHEMA_VERSION && Array.isArray(s.profiles)) return s;
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

// Νέα λέξη με το πλήρες schema του ARCHITECTURE §5.
export function newWord({ text, gap, targetGrapheme, confusionClass, distractors }) {
  const t = now();
  return {
    id: newId(),
    text, gap, targetGrapheme, confusionClass, distractors,
    sentence: null, audioWord: null, audioSentence: null,
    addedAt: t, updatedAt: t,
    level: 0, attempts: 0, successes: 0,
    errorHistory: [], challengeTypesUsed: [],
    lastSeenAt: null, nextDueAt: null,
    introduced: false
  };
}

export function addWord(state, word) {
  const p = activeProfile(state);
  p.words.push(word);
  p.profile.updatedAt = now();
  saveState(state);
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

// Επιστρέφει το νέο state ή πετάει Error με μήνυμα για τον γονέα.
export function importJSON(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error('Το αρχείο δεν είναι έγκυρο JSON.'); }
  if (!data || data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.profiles)) {
    throw new Error('Το αρχείο δεν είναι αντίγραφο από αυτό το παιχνίδι.');
  }
  delete data.exportedAt;
  saveState(data);
  return data;
}

// --- Ρυθμίσεις συσκευής (PIN — μένει εκτός export) ---

export function getDevice() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) || {}; }
  catch (e) { return {}; }
}

export function saveDevice(dev) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(dev));
}
