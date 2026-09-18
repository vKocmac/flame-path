// Η δεκαπεντάδα της μέρας και το σερί (NEXT-FIXES Θ3, 18/09/2026).
//
// Ο Κοσμάς: «15 λέξεις… θα πρέπει να έχει κάπου ένα σερί. Δηλαδή ότι χτες
// έκανες σερί με σήμερα και προχωράμε. Αν τη λέξη την πιάσει και την
// κατοχυρώσει θα πρέπει να την βγάλεις από την επόμενη ημέρα. Αν όμως δεν
// την έχει κατοχυρώσει θα πρέπει να την επαναλάβεις και την επόμενη και να
// προσθέσεις κι άλλες για να κλείσει η δεκαπεντάδα.»
//
// Κάθε μέρα έχει ΕΝΑ σύνολο λέξεων (`daily_words`, 15):
//   1. όσες έχουν αρχίσει και δεν έχουν κατακτηθεί (μεταφέρονται από χτες)
//   2. νέες λέξεις της λίστας, με τη σειρά που μπήκαν, ως τις 15
// Οι κατακτημένες ΔΕΝ μπαίνουν στη δεκαπεντάδα. Για να μην ξεχαστούν,
// ξανάρχονται πού και πού ως επανάληψη (`review_per_day`, όσες έχουν
// ληξιπρόθεσμο σημείο στο Leitner).
//
// Στόχος της μέρας: κάθε λέξη της δεκαπεντάδας σωστή μία φορά. Όταν
// κλείσει, το σερί ανεβαίνει. Χαμένη μέρα ΔΕΝ αφαιρεί τίποτα (ARCHITECTURE
// §8.5): το σερί απλώς ξαναρχίζει και το «καλύτερο σερί» μένει για πάντα.
//
// Καθαρές συναρτήσεις πάνω στο profileEntry· την αποθήκευση την κάνει ο καλών.

import { isDue } from './scheduler.js';

const LOG_DAYS = 30;

export function dayKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function prevDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function isMastered(word, mastery = 2) {
  return word.targets.length > 0 && word.targets.every((t) => t.level >= mastery);
}

function started(word) { return word.targets.some((t) => t.introduced); }
const byAdded = (a, b) => (a.addedAt < b.addedAt ? -1 : a.addedAt > b.addedAt ? 1 : 0);
function earliestDue(w) {
  return w.targets.map((t) => t.nextDueAt || '').sort()[0] || '';
}

/**
 * Φτιάχνει (μία φορά τη μέρα) ή συμπληρώνει τη δεκαπεντάδα. Επιστρέφει
 * { daily, changed } — changed = πρέπει να σωθεί. null αν δεν ορίζεται
 * `daily_words` (τα παλιά tests τρέχουν χωρίς δεκαπεντάδα).
 */
export function ensureDaily(profileEntry, cfg, now) {
  const size = cfg.daily_words;
  if (!size) return null;
  const m = cfg.mastery_level ?? 2;
  const key = dayKey(now);
  const live = profileEntry.words.filter((w) => !w.archived && w.targets.length);
  const byId = new Map(live.map((w) => [w.id, w]));
  let d = profileEntry.profile.daily;
  let changed = false;

  if (!d || d.date !== key) {
    const carry = live.filter((w) => started(w) && !isMastered(w, m)).sort(byAdded);
    const review = live.filter((w) => isMastered(w, m) && w.targets.some((t) => isDue(t, now)))
      .sort((a, b) => (earliestDue(a) < earliestDue(b) ? -1 : 1))
      .slice(0, cfg.review_per_day ?? 3);
    d = {
      ...(d || {}),
      date: key,
      ids: carry.slice(0, size).map((w) => w.id),
      review: review.map((w) => w.id),
      correct: [],
      goalMet: false
    };
    changed = true;
  }

  // Ό,τι σβήστηκε ή αρχειοθετήθηκε στο μεταξύ φεύγει από τη μέρα
  const ids = d.ids.filter((id) => byId.has(id));
  const review = (d.review || []).filter((id) => byId.has(id) && !ids.includes(id));
  if (ids.length !== d.ids.length || review.length !== (d.review || []).length) changed = true;
  d.ids = ids;
  d.review = review;

  // Συμπλήρωμα με νέες ως το μέγεθος — και μέσα στη μέρα, αν ο γονιός
  // πρόσθεσε λέξεις ή φόρτωσε το βασικό πακέτο.
  if (d.ids.length < size && !d.goalMet) {
    for (const w of live.filter((x) => !started(x) && !d.ids.includes(x.id)).sort(byAdded)) {
      if (d.ids.length >= size) break;
      d.ids.push(w.id);
      changed = true;
    }
  }
  profileEntry.profile.daily = d;
  return { daily: d, changed };
}

/** Οι λέξεις που παίζονται σήμερα: η δεκαπεντάδα + οι επαναλήψεις. */
export function todayWords(profileEntry, daily) {
  const want = new Set([...daily.ids, ...(daily.review || [])]);
  return profileEntry.words.filter((w) => want.has(w.id));
}

/**
 * Μια απάντηση μετράει στη μέρα. Επιστρέφει { goalJustMet, streak } όταν ο
 * στόχος της μέρας μόλις έκλεισε. `learned` = η λέξη μόλις κατακτήθηκε.
 */
export function recordAnswer(profileEntry, wordId, correct, learned, now) {
  const d = profileEntry.profile.daily;
  if (!d) return null;
  const key = dayKey(now);
  d.log = d.log || {};
  const day = d.log[key] || (d.log[key] = { c: 0, l: 0 });
  if (correct) day.c += 1;
  if (learned) day.l += 1;
  const keys = Object.keys(d.log).sort();
  while (keys.length > LOG_DAYS) delete d.log[keys.shift()];

  if (!correct || d.date !== key) return null;
  if (d.ids.includes(wordId) && !d.correct.includes(wordId)) d.correct.push(wordId);
  if (d.goalMet || !d.ids.length || !d.ids.every((id) => d.correct.includes(id))) return null;
  d.goalMet = true;
  d.streak = d.lastGoal === prevDayKey(key) ? (d.streak || 0) + 1 : 1;
  d.lastGoal = key;
  d.best = Math.max(d.best || 0, d.streak);
  return { goalJustMet: true, streak: d.streak };
}

/** Το σερί που ΙΣΧΥΕΙ: μετράει μόνο αν ο στόχος έκλεισε σήμερα ή χτες. */
export function currentStreak(daily, now) {
  if (!daily || !daily.lastGoal) return 0;
  const key = dayKey(now);
  return daily.lastGoal === key || daily.lastGoal === prevDayKey(key) ? daily.streak || 0 : 0;
}

/** Οι τελευταίες n μέρες για το γράφημα: [{ key, c, l }] με την παλιότερη πρώτη. */
export function lastDays(daily, now, n = 7) {
  const out = [];
  let key = dayKey(now);
  for (let i = 0; i < n; i++) {
    const v = (daily && daily.log && daily.log[key]) || { c: 0, l: 0 };
    out.unshift({ key, c: v.c, l: v.l });
    key = prevDayKey(key);
  }
  return out;
}
