// Learning Engine — η ΜΟΝΗ πόρτα του παιχνιδιού προς τη μάθηση.
// Υλοποιεί το συμβόλαιο του ARCHITECTURE §4: getNextChallenge / reportResult.
// Δεν γνωρίζει τίποτα για φλόγες, εχθρούς ή Phaser.

import * as store from '../shared/storage.js';
import { splitGraphemes } from '../shared/graphemes.js';
import { newId } from '../shared/ids.js';
import { selectNext, intervalMs } from './scheduler.js';

let cfg = null;
let clock = () => new Date();

// Κατάσταση session (μνήμη μόνο — χάνεται σε κλείσιμο, όπως πρέπει)
let session = null;
function freshSession() {
  return {
    served: new Map(),     // challengeId -> { wordId, targetId, type, isPractice }
    reported: new Set(),   // invariant 6: ένα αποτέλεσμα ανά challenge
    lastWordId: null,
    serveCounts: new Map(),
    practiceCounts: new Map(),
    activeIds: null
  };
}

// options: { config?, clock? } — τα tests περνούν δικά τους.
export async function init(options = {}) {
  if (options.config) cfg = options.config;
  else cfg = await fetch(new URL('../../config/learning.json', import.meta.url)).then((r) => r.json());
  if (options.clock) clock = options.clock;
  session = freshSession();
  return cfg;
}

export function resetSession() { session = freshSession(); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Τύπος πρόκλησης: ο λιγότερο πρόσφατα χρησιμοποιημένος για τον στόχο.
// gap απαιτεί distractors· χωρίς αυτά (π.χ. «ου») μένει η συναρμολόγηση.
function chooseType(target, types) {
  let allowed = types.filter((tp) =>
    tp === 'assembly' || (tp === 'gap' && target.distractors.length > 0));
  if (!allowed.length) allowed = ['assembly'];
  const hist = target.challengeTypesUsed;
  let best = allowed[0], bestIdx = Infinity;
  for (const tp of allowed) {
    const idx = hist.lastIndexOf(tp); // -1 = ποτέ → κερδίζει
    if (idx < bestIdx) { bestIdx = idx; best = tp; }
  }
  return best;
}

// Κομμάτια συναρμολόγησης: ΜΟΝΟ τα γνήσια γραφήματα της λέξης (invariant 1),
// ανακατεμένα ώστε να ΜΗΝ τύχει να εμφανιστούν στη σωστή σειρά.
function assemblyPieces(text) {
  const units = splitGraphemes(text);
  if (units.length < 2) return units;
  let p = shuffle(units);
  for (let tries = 0; p.join('') === text && tries < 10; tries++) p = shuffle(units);
  if (p.join('') === text) [p[0], p[1]] = [p[1], p[0]];
  return p;
}

export function getNextChallenge(profileId, { types = ['gap', 'assembly'] } = {}) {
  if (!cfg || !session) throw new Error('Learning engine: κάλεσε πρώτα init()');
  const state = store.loadState();
  const p = state.profiles.find((x) => x.profile.id === profileId);
  if (!p) return null;

  const pick = selectNext(p, cfg, clock(), session);
  if (!pick) return null;
  const { word, target, isPractice } = pick;

  const type = !target.introduced ? 'intro' : chooseType(target, types);
  const ch = {
    challengeId: newId(),
    wordId: word.id,
    targetId: target.id,
    type,
    text: word.text,          // ΠΑΝΤΑ η σωστή πλήρης μορφή
    gap: { ...target.gap },
    isPractice
  };
  if (type === 'gap') ch.candidates = shuffle([target.grapheme, ...target.distractors]);
  if (type === 'assembly') ch.pieces = assemblyPieces(word.text);

  session.served.set(ch.challengeId, { wordId: word.id, targetId: target.id, type, isPractice });
  session.lastWordId = word.id;
  session.serveCounts.set(target.id, (session.serveCounts.get(target.id) || 0) + 1);
  if (isPractice) {
    session.practiceCounts.set(target.id, (session.practiceCounts.get(target.id) || 0) + 1);
  }
  return ch;
}

// Ένα αποτέλεσμα ανά challenge, με το αποτέλεσμα της ΠΡΩΤΗΣ προσπάθειας.
// Η επανάληψη μετά την αποκάλυψη του σωστού είναι αντιγραφή — δεν αναφέρεται.
export function reportResult(r) {
  if (!cfg || !session) throw new Error('Learning engine: κάλεσε πρώτα init()');
  if (session.reported.has(r.challengeId)) return { ok: false, reason: 'duplicate' };
  const served = session.served.get(r.challengeId);
  if (!served) return { ok: false, reason: 'unknown-challenge' };
  session.reported.add(r.challengeId);

  const state = store.loadState();
  const p = state.profiles.find((x) => x.profile.id === r.profileId);
  const word = p?.words.find((w) => w.id === r.wordId);
  const target = word?.targets.find((t) => t.id === r.targetId);
  if (!target) return { ok: false, reason: 'unknown-target' };

  const at = r.at || clock().toISOString();
  target.lastSeenAt = at;
  target.challengeTypesUsed = [...target.challengeTypesUsed, served.type].slice(-20);

  if (served.type === 'intro') {
    // Πρώτη έκθεση χωρίς δυνατότητα λάθους — δεν είναι «προσπάθεια».
    target.introduced = true;
    target.nextDueAt = at; // διαθέσιμος αμέσως μέσα στο ίδιο session
  } else if (served.isPractice) {
    // Προπόνηση: μετράει στο telemetry, ΔΕΝ αγγίζει επίπεδο/χρονοδιάγραμμα.
    target.attempts += 1;
    if (r.correct) target.successes += 1;
    else if (r.chosenGrapheme) {
      target.errorHistory.push({ grapheme: r.chosenGrapheme, type: served.type, at, practice: true });
    }
  } else {
    target.attempts += 1;
    if (r.correct) {
      target.successes += 1;
      target.level = Math.min(cfg.intervals_days.length - 1, target.level + 1);
    } else {
      target.level = Math.max(0, target.level - 1);
      if (r.chosenGrapheme) {
        target.errorHistory.push({ grapheme: r.chosenGrapheme, type: served.type, at });
      }
    }
    target.nextDueAt = new Date(new Date(at).getTime() + intervalMs(cfg, target.level)).toISOString();
  }

  word.updatedAt = at;
  store.saveState(state);
  return { ok: true };
}
