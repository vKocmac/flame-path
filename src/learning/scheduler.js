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

// ------------------------------------------ Η λίστα που μεγαλώνει (11/09)
// Ο γονιός προσθέτει 10-20 λέξεις την εβδομάδα. Αν τις παρουσιάζαμε όλες
// αμέσως, το παιδί θα «μάθαινε» δεκάδες σημεία μαζί και δεν θα κατακτούσε
// κανένα. Όριο μάθησης: το πολύ `learning_cap_targets` σημεία σε εκμάθηση
// (παρουσιασμένα, όχι ακόμα κατακτημένα). Οι υπόλοιπες νέες περιμένουν
// σειρά — με τη σειρά που μπήκαν — και μπαίνουν μόλις κατακτηθούν οι
// τρέχουσες. Οι κατακτημένες δεν αποσύρονται ποτέ: ξανάρχονται στα
// διαστήματα του Leitner και, ανάμεσα, στην προπόνηση (practicePick).

export function masteryLevel(cfg) { return cfg.mastery_level ?? 2; }

/** Πόσα σημεία «μαθαίνει» τώρα το παιδί: παρουσιασμένα, όχι ακόμα κατακτημένα. */
export function inProgressCount(pairs, cfg) {
  const m = masteryLevel(cfg);
  return pairs.filter((x) => x.target.introduced && x.target.level < m).length;
}

function learningCap(cfg) { return cfg.active_set.learning_cap_targets ?? 12; }

// Λέξη που άρχισε να παρουσιάζεται τελειώνει, ό,τι κι αν λέει το όριο —
// αλλιώς θα έμενε μισή λέξη αθέατη ως τον επόμενο πάπυρο.
function started(word) { return word.targets.some((t) => t.introduced); }

function mayIntroduce(pair, everything, cfg) {
  return started(pair.word) || inProgressCount(everything, cfg) < learningCap(cfg);
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

  // Νέοι ΜΟΝΟ όσοι χωράνε στο όριο μάθησης (+ τα υπόλοιπα σημεία λέξεων
  // που ήδη άρχισαν) — αλλιώς 30 νέες λέξεις γέμιζαν όλο το σύνολο.
  const room = Math.max(0, learningCap(cfg) - inProgressCount(pairs, cfg));
  const fresh = pairs.filter((x) => !x.target.introduced)
    .sort((a, b) => (a.word.addedAt < b.word.addedAt ? -1 : 1));
  const intro = [...fresh.filter((x) => started(x.word)),
    ...fresh.filter((x) => !started(x.word)).slice(0, room)];
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
// intro: πότε επιτρέπεται τελετή (ARCHITECTURE §4)
//   'gated' (προεπιλογή) — μόνο όσο οι ληξιπρόθεσμοι είναι λιγότεροι από
//            intro_when_due_below
//   'first'  — ΠΡΩΤΑ όλοι οι νέοι στόχοι, λέξη-λέξη. Για το άνοιγμα λεβελ,
//            όπου ο πάπυρος τους δείχνει όλους σε ΜΙΑ σκηνή
//   'never'  — ποτέ τελετή. Για τη μέση του λεβελ: οι νέοι περιμένουν τον
//            επόμενο πάπυρο αντί να περάσουν αθέατοι
export function selectNext(profileEntry, cfg, nowDate, session, { intro = 'gated' } = {}) {
  const skip = session.skip || new Set();
  const everything = allPairs(profileEntry);
  const pairs = everything.filter((x) => !skip.has(x.target.id));
  if (!pairs.length) return null;
  // Νέοι στόχοι που ΧΩΡΑΝΕ στο όριο μάθησης — όλα τα παρακάτω (και ο
  // πάπυρος του 'first') βλέπουν μόνο αυτούς· οι άλλοι περιμένουν σειρά.
  const fresh = pairs.filter((x) => !x.target.introduced && mayIntroduce(x, everything, cfg));

  // Άνοιγμα λεβελ: οι νέοι στόχοι βγαίνουν ΟΜΑΔΟΠΟΙΗΜΕΝΟΙ ανά λέξη, με τη
  // σειρά που μπήκαν οι λέξεις. Έτσι ο καλών μπορεί να σταματήσει σε όριο
  // ΛΕΞΕΩΝ χωρίς να μείνει μισή λέξη αθέατη. Ο κανόνας «όχι ίδια λέξη
  // συνεχόμενα» δεν ισχύει εδώ: η τελετή δεν είναι ερώτηση.
  if (intro === 'first' && fresh.length) {
    const order = (x) => profileEntry.words.indexOf(x.word);
    fresh.sort((a, b) => (order(a) - order(b)) || (a.target.gap.start - b.target.gap.start));
    return { ...fresh[0], isPractice: false };
  }

  // Νέος στόχος παρουσιάζεται μόνο όταν δεν στοιβάζονται ήδη πολλοί
  // αναπάντητοι. Αλλιώς, με 7 νέους στόχους, το παιδί θα έβλεπε 7 τελετές
  // στη σειρά πριν παίξει — και θα φορτωνόταν με άγνωστο υλικό μαζεμένο.
  const due = pairs.filter((x) => x.target.introduced && isDue(x.target, nowDate));
  const limit = cfg.active_set.intro_when_due_below ?? 3;
  const allowIntro = intro !== 'never' && due.length < limit;
  let eligible = due;
  if (allowIntro) eligible = [...fresh, ...due];
  if (!eligible.length && intro !== 'never') eligible = fresh;

  if (eligible.length) {
    let pool = session.activeIds
      ? eligible.filter((x) => session.activeIds.has(x.target.id)) : [];
    if (!pool.length) {
      session.activeIds = buildActiveSet(pairs, cfg, nowDate);
      pool = eligible.filter((x) => session.activeIds.has(x.target.id));
    }
    if (!pool.length) pool = eligible; // δίχτυ ασφαλείας

    // Ποτέ δύο στόχοι της ίδιας λέξης συνεχόμενα — εκτός αν δεν γίνεται αλλιώς.
    // Αν ληξιπρόθεσμη είναι ΜΟΝΟ η λέξη που μόλις παίχτηκε (π.χ. μόλις χάθηκε),
    // προτιμάμε προπόνηση με ΑΛΛΗ γνωστή λέξη: δεν αλλάζει κανένα επίπεδο και η
    // ληξιπρόθεσμη έρχεται αμέσως μετά. Αλλιώς το παιδί ξαναβλέπει τη λέξη που
    // μόλις έχασε, θυμάται ποιες επιλογές ήταν λάθος και βρίσκει το σωστό με
    // αποκλεισμό αντί να το θυμηθεί.
    const nonSame = pool.filter((x) => x.word.id !== session.lastWordId);
    if (!nonSame.length && cfg.practice_after_queue_empty) {
      const other = practicePick(pairs, cfg, session, { otherWordOnly: true });
      if (other) return other;
    }
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
  return practicePick(pairs, cfg, session);
}

// Προπόνηση: στόχος που έχει ήδη παρουσιαστεί. Με `otherWordOnly` αποκλείεται
// αυστηρά η λέξη που μόλις παίχτηκε (αλλιώς απλώς προτιμάται άλλη).
function practicePick(pairs, cfg, session, { otherWordOnly = false } = {}) {
  let pool = pairs.filter((x) => x.target.introduced);
  if (otherWordOnly) pool = pool.filter((x) => x.word.id !== session.lastWordId);
  if (!pool.length) return null;

  const cap = cfg.practice_serve_cap_per_session ?? 2;
  const rested = pool.filter((x) => (session.practiceCounts.get(x.target.id) || 0) < cap);
  if (rested.length) pool = rested;
  const nonSame = pool.filter((x) => x.word.id !== session.lastWordId);
  if (nonSame.length) pool = nonSame;

  // Γυρνάμε στις ΠΑΛΙΕΣ (11/09): πρώτα οι κατακτημένες (νιώθει δυνατός) και
  // ανάμεσά τους αυτή που έχει να τη δει τον περισσότερο καιρό. Κάθε
  // προπόνηση την κάνει «πρόσφατη», οπότε η σειρά περνά από όλη τη λίστα.
  const m = masteryLevel(cfg);
  const seen = (x) => x.target.lastSeenAt || '';
  pool = pool.map((x) => ({ x, r: Math.random() }))
    .sort((a, b) => ((b.x.target.level >= m) - (a.x.target.level >= m))
      || (seen(a.x) < seen(b.x) ? -1 : seen(a.x) > seen(b.x) ? 1 : 0)
      || (a.r - b.r))
    .map((o) => o.x);
  return { ...pool[0], isPractice: true };
}
