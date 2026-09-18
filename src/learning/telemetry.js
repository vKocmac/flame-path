// Ανάλυση telemetry — «ποιο γράφημα διαλέγει όταν κάνει λάθος» (SPEC κεφ. 5).
// Καθαρές συναρτήσεις πάνω στο profileEntry· τροφοδοτούν την οθόνη προόδου (Φάση 2).

// Λάθη ανά κλάση σύγχυσης: { i: { 'η': 12, 'υ': 2 }, o: { 'ω': 4 } }
export function errorCounts(profileEntry) {
  const byClass = {};
  for (const w of profileEntry.words) {
    for (const t of w.targets) {
      if (!byClass[t.confusionClass]) byClass[t.confusionClass] = {};
      for (const e of t.errorHistory) {
        byClass[t.confusionClass][e.grapheme] = (byClass[t.confusionClass][e.grapheme] || 0) + 1;
      }
    }
  }
  return byClass;
}

const DAY_MS = 86400000;

// Η ροή της λίστας που μεγαλώνει (11/09), για το Parent Mode — ανά ΛΕΞΗ:
//   mastered — όλα τα σημεία της κατακτημένα
//   learning — έχει παρουσιαστεί, δεν έχει κατακτηθεί ακόμα
//   waiting  — δεν έχει παρουσιαστεί· περιμένει σειρά (όριο μάθησης)
//   dueToday — ΣΗΜΕΙΑ που θα ξαναρωτηθούν ως το τέλος της μέρας
//   recent / recentMastered — λέξεις που μπήκαν τις τελευταίες 7 μέρες
export function learningFlow(profileEntry, nowDate, mastery = 2) {
  const r = { mastered: 0, learning: 0, waiting: 0, dueToday: 0, recent: 0, recentMastered: 0 };
  const endOfDay = new Date(nowDate);
  endOfDay.setHours(23, 59, 59, 999);
  for (const w of profileEntry.words) {
    if (!w.targets.length || w.archived) continue;
    const done = w.targets.every((t) => t.level >= mastery);
    if (!w.targets.some((t) => t.introduced)) r.waiting++;
    else if (done) r.mastered++;
    else r.learning++;
    r.dueToday += w.targets.filter((t) => t.introduced
      && (!t.nextDueAt || new Date(t.nextDueAt) <= endOfDay)).length;
    if (nowDate - new Date(w.addedAt) < 7 * DAY_MS) {
      r.recent++;
      if (done) r.recentMastered++;
    }
  }
  return r;
}

// Κατάταξη λέξεων (Η4, 18/09) — ο Κοσμάς: «από όλες τις φορές που το είδε
// πόσες φορές πάτησε λάθος έστω και με τη μία… από την δυσκολότερη για αυτόν
// λέξη μέχρι την πιο εύκολη». Κάθε ερώτηση μετράει μία φορά, με την ΠΡΩΤΗ
// απάντηση (ARCHITECTURE §8.6), άρα λάθη = attempts − successes. Η παρουσίαση
// στον πάπυρο δεν είναι ερώτηση. Λέξη με λιγότερες από RANK_MIN_ASKED
// ερωτήσεις μένει χωριστά: αλλιώς μία σωστή απάντηση τη βγάζει «η πιο εύκολη».
export const RANK_MIN_ASKED = 3;

export function wordRanking(profileEntry, mastery = 2) {
  const rows = profileEntry.words.filter((w) => w.targets.length).map((w) => {
    let asked = 0, wrong = 0;
    const chose = {};
    for (const t of w.targets) {
      asked += t.attempts;
      wrong += t.attempts - t.successes;
      for (const e of t.errorHistory) chose[e.grapheme] = (chose[e.grapheme] || 0) + 1;
    }
    const phase = !w.targets.some((t) => t.introduced) ? 'waiting'
      : w.targets.every((t) => t.level >= mastery) ? 'mastered' : 'learning';
    return { word: w, asked, wrong, rate: asked ? wrong / asked : 0, chose, phase, archived: !!w.archived };
  });
  const live = rows.filter((r) => !r.archived);
  return {
    ranked: live.filter((r) => r.asked >= RANK_MIN_ASKED)
      .sort((a, b) => (b.rate - a.rate) || (b.wrong - a.wrong) || (b.asked - a.asked)),
    few: live.filter((r) => r.asked < RANK_MIN_ASKED),
    archived: rows.filter((r) => r.archived)
  };
}

/** Ζώνη δυσκολίας για το χρώμα της μπάρας. */
export function rankBand(rate) { return rate >= 0.4 ? 'hard' : rate >= 0.15 ? 'mid' : 'easy'; }

// Οι στόχοι που αντιστέκονται περισσότερο (ποσοστό αποτυχίας, min 2 προσπάθειες).
export function hardestTargets(profileEntry, n = 5) {
  const rows = [];
  for (const w of profileEntry.words) {
    for (const t of w.targets) {
      if (t.attempts >= 2) {
        rows.push({
          word: w.text,
          grapheme: t.grapheme,
          level: t.level,
          attempts: t.attempts,
          failRate: 1 - t.successes / t.attempts
        });
      }
    }
  }
  return rows.sort((a, b) => b.failRate - a.failRate).slice(0, n);
}
