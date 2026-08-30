// Scheduler τύπου Leitner — καθαρές συναρτήσεις, χωρίς αποθήκευση/DOM.
// Μονάδα προγραμματισμού: ο ΣΤΟΧΟΣ (target) μιας λέξης (ARCHITECTURE §5).
// Όλες οι παράμετροι έρχονται από το config/learning.json.

const DAY_MS = 86400000;

export function intervalMs(cfg, level) {
  const d = cfg.intervals_days;
  return d[Math.min(level, d.length - 1)] * DAY_MS;
}

export function isDue(target, nowDate) {
  return target.introduced && (!target.nextDueAt || new Date(target.nextDueAt) <= nowDate);
}

// Όλα τα ζεύγη (λέξη, στόχος) ενός προφίλ.
export function allPairs(profileEntry) {
  const pairs = [];
  for (const word of profileEntry.words) {
    for (const target of word.targets) pairs.push({ word, target });
  }
  return pairs;
}

// «Τρέχων» στόχος: χαμηλό επίπεδο ή πρόσφατη λέξη (μίγμα 60/40, SPEC κεφ. 5).
function isCurrent(pair, cfg, nowDate) {
  const ageMs = (cfg.active_set.current_word_age_days ?? 21) * DAY_MS;
  return pair.target.level <= 1 || (nowDate - new Date(pair.word.addedAt)) < ageMs;
}

// Ενεργό σύνολο session: έως size_max στόχοι, ~60% τρέχοντες / 40% επανάληψη.
// Οι μη-εισηγμένοι (intro) μετρούν στους τρέχοντες και μπαίνουν πρώτοι.
export function buildActiveSet(pairs, cfg, nowDate) {
  const size = cfg.active_set.size_max;
  const ratio = cfg.active_set.current_ratio;

  const intro = pairs.filter((x) => !x.target.introduced)
    .sort((a, b) => (a.word.addedAt < b.word.addedAt ? -1 : 1));
  const due = pairs.filter((x) => isDue(x.target, nowDate));
  const current = [...intro, ...due.filter((x) => isCurrent(x, cfg, nowDate))];
  const review = due.filter((x) => !isCurrent(x, cfg, nowDate))
    .sort((a, b) => ((a.target.nextDueAt || '') < (b.target.nextDueAt || '') ? -1 : 1));

  const nCur = Math.round(size * ratio);
  const sel = [...current.slice(0, nCur), ...review.slice(0, size - nCur)];
  // Συμπλήρωση αν η μία δεξαμενή δεν φτάνει
  for (const x of [...current.slice(nCur), ...review.slice(size - nCur)]) {
    if (sel.length >= size) break;
    if (!sel.includes(x)) sel.push(x);
  }
  return new Set(sel.map((x) => x.target.id));
}

// Επιλογή επόμενου στόχου από το ενεργό σύνολο.
// session: { activeIds, lastWordId, serveCounts, practiceCounts }
export function selectNext(profileEntry, cfg, nowDate, session) {
  const pairs = allPairs(profileEntry);
  if (!pairs.length) return null;

  const eligible = pairs.filter((x) => !x.target.introduced || isDue(x.target, nowDate));

  if (eligible.length) {
    let pool = session.activeIds
      ? eligible.filter((x) => session.activeIds.has(x.target.id)) : [];
    if (!pool.length) {
      session.activeIds = buildActiveSet(pairs, cfg, nowDate);
      pool = eligible.filter((x) => session.activeIds.has(x.target.id));
    }
    if (!pool.length) pool = eligible; // δίχτυ ασφαλείας

    // Ποτέ δύο στόχοι της ίδιας λέξης συνεχόμενα — εκτός αν δεν γίνεται αλλιώς
    const nonSame = pool.filter((x) => x.word.id !== session.lastWordId);
    const usePool = nonSame.length ? nonSame : pool;

    usePool.sort((a, b) => {
      // intro πρώτα
      const ai = a.target.introduced ? 1 : 0, bi = b.target.introduced ? 1 : 0;
      if (ai !== bi) return ai - bi;
      // μετά ο λιγότερο σερβιρισμένος στη session (round-robin)
      const as = session.serveCounts.get(a.target.id) || 0;
      const bs = session.serveCounts.get(b.target.id) || 0;
      if (as !== bs) return as - bs;
      // μετά ο πιο «ληξιπρόθεσμος»
      return (a.target.nextDueAt || '') < (b.target.nextDueAt || '') ? -1 : 1;
    });
    return { ...usePool[0], isPractice: false };
  }

  // Τίποτα ληξιπρόθεσμο → «προπόνηση» με κατακτημένες λέξεις (DESIGN απόφ. 6):
  // παίζεται κανονικά αλλά ΔΕΝ αλλάζει επίπεδα/χρονοδιάγραμμα.
  if (!cfg.practice_after_queue_empty) return null;
  const introduced = pairs.filter((x) => x.target.introduced);
  if (!introduced.length) return null;

  const cap = cfg.practice_serve_cap_per_session ?? 2;
  let pool = introduced.filter((x) => (session.practiceCounts.get(x.target.id) || 0) < cap);
  if (!pool.length) pool = introduced;
  const nonSame = pool.filter((x) => x.word.id !== session.lastWordId);
  if (nonSame.length) pool = nonSame;

  // Προτίμηση σε ψηλότερο επίπεδο (νιώθει δυνατός), τυχαία ανάμεσα σε ίσα
  pool = pool.map((x) => ({ x, r: Math.random() }))
    .sort((a, b) => (b.x.target.level - a.x.target.level) || (a.r - b.r))
    .map((o) => o.x);
  return { ...pool[0], isPractice: true };
}
