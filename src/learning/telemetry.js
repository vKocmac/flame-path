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
    if (!w.targets.length) continue;
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
