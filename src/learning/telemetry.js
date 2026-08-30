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
