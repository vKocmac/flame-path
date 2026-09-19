// Scheduler τύπου Leitner — καθαρές συναρτήσεις, χωρίς αποθήκευση/DOM.
// Μονάδα προγραμματισμού: ο ΣΤΟΧΟΣ (target) μιας λέξης (ARCHITECTURE §5).
// Όλες οι παράμετροι έρχονται από το config/learning.json.

const DAY_MS = 86400000;

export function intervalMs(cfg, level) {
  const d = cfg.intervals_days;
  return d[Math.min(level, d.length - 1)] * DAY_MS;
}

// Ο5 (19/09): «παίζει τόση ώρα και λέει ότι έχει κατοχυρώσει 0 λέξεις». Η
// επανάληψη ερχόταν ΑΚΡΙΒΩΣ 24 ώρες μετά: αν χτες έπαιξε στις 19:00, σήμερα
// στις 17:00 οι χθεσινές λέξεις δεν ήταν «έτοιμες» — έβγαιναν ως προπόνηση,
// που δεν ανεβάζει επίπεδο, και καμία δεν κατοχυρωνόταν. Τώρα μετρά η
// ΗΜΕΡΟΛΟΓΙΑΚΗ μέρα: ό,τι λήγει σήμερα (οποιαδήποτε ώρα) είναι έτοιμο από το πρωί.
export function isDue(target, nowDate) {
  if (!target.introduced) return false;
  if (!target.nextDueAt) return true;
  const end = new Date(nowDate);
  end.setHours(23, 59, 59, 999);
  return new Date(target.nextDueAt) <= end;
}

// Όλα τα ζεύγη (λέξη, στόχος) ενός προφίλ. Οι αρχειοθετημένες λέξεις (Η4)
// δεν ρωτιούνται πια — μετρούν όμως ακόμα στις τεχνικές (journey.masteredCount).
export function allPairs(profileEntry) {
  const pairs = [];
  for (const word of profileEntry.words) {
    if (word.archived) continue;
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

// Όριο μάθησης = ό,τι ΧΡΩΣΤΑΕΙ το παιδί ΤΩΡΑ (18/09). Ο Κοσμάς: «βγάζει 3-5
// λέξεις ξανά και ξανά ενώ του έχω βάλει μια πολύ μεγάλη λίστα και το
// βαριέται». Αιτία: το όριο μετρούσε κάθε μη κατακτημένο σημείο, και η
// κατάκτηση θέλει σωστό σε ΔΥΟ μέρες — άρα μόλις γέμιζε (~6 λέξεις), καμία
// νέα λέξη δεν έμπαινε ως αύριο και η προπόνηση ανακύκλωνε τις ίδιες.
// Τώρα μετράει μόνο όσα δεν έχουν απαντηθεί σωστά ακόμα (επίπεδο 0) ή είναι
// ληξιπρόθεσμα. Σημείο που απαντήθηκε σωστά και περιμένει την αυριανή
// επανάληψη ΔΕΝ πιάνει θέση — μπαίνει η επόμενη λέξη της λίστας.
export function learningLoad(pairs, cfg, nowDate) {
  const m = masteryLevel(cfg);
  return pairs.filter((x) => x.target.introduced && x.target.level < m
    && (x.target.level === 0 || isDue(x.target, nowDate))).length;
}

function learningCap(cfg) { return cfg.active_set.learning_cap_targets ?? 12; }

// Δεύτερο φρένο: πόσες ΝΕΕΣ λέξεις το πολύ ανά μέρα (`new_words_per_day`).
// Χωρίς αυτό, ένα μεγάλο απόγευμα θα παρουσίαζε όλη τη λίστα και την άλλη
// μέρα θα χρωστούσε δεκάδες επαναλήψεις μαζί.
function sameDay(iso, nowDate) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === nowDate.getFullYear() && d.getMonth() === nowDate.getMonth()
    && d.getDate() === nowDate.getDate();
}
export function wordsIntroducedToday(pairs, nowDate) {
  const ids = new Set();
  for (const x of pairs) if (sameDay(x.target.introducedAt, nowDate)) ids.add(x.word.id);
  return ids.size;
}
function dailyWords(cfg) { return cfg.active_set.new_words_per_day ?? Infinity; }

// Λέξη που άρχισε να παρουσιάζεται τελειώνει, ό,τι κι αν λέει το όριο —
// αλλιώς θα έμενε μισή λέξη αθέατη ως τον επόμενο πάπυρο.
function started(word) { return word.targets.some((t) => t.introduced); }

function roomForNewWord(everything, cfg, nowDate) {
  return learningLoad(everything, cfg, nowDate) < learningCap(cfg)
    && wordsIntroducedToday(everything, nowDate) < dailyWords(cfg);
}

function mayIntroduce(pair, everything, cfg, nowDate) {
  return started(pair.word) || roomForNewWord(everything, cfg, nowDate);
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
  const room = Math.max(0, Math.min(learningCap(cfg) - learningLoad(pairs, cfg, nowDate),
    dailyWords(cfg) - wordsIntroducedToday(pairs, nowDate)));
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
  const fresh = pairs.filter((x) => !x.target.introduced && mayIntroduce(x, everything, cfg, nowDate));

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
    // Ν1 (19/09): «δεν γίνεται να σου βάζει το "εκεί" κάθε μία παρά μία». Το
    // φρένο ήταν μόνο «όχι δύο συνεχόμενα» — με λίγες λέξεις και λέξεις δύο
    // σημείων (ε + ει) η ίδια λέξη γύριζε κάθε δεύτερη ερώτηση. Τώρα καμία
    // λέξη από τις RECENT τελευταίες δεν ξαναβγαίνει, αν υπάρχει άλλη.
    let nonSame = pool.filter((x) => !recentWord(session, x.word.id));
    // Το ενεργό σύνολο τελείωσε σε πρόσφατες λέξεις; Ψάξε σε ΟΛΕΣ όσες
    // χρωστάει, πριν δεχτείς εναλλαγή δύο λέξεων («τυρί μήλο τυρί μήλο»).
    if (!nonSame.length) nonSame = eligible.filter((x) => !recentWord(session, x.word.id));
    // Ο5 (19/09): αν ΟΛΕΣ όσες χρωστάει είναι στις 4 τελευταίες, πριν έβγαινε
    // ΠΡΟΠΟΝΗΣΗ — ξανά και ξανά, αφού η προπόνηση δεν ξεπληρώνει τίποτα. Με
    // λίγες λέξεις (αρχή μέρας, λεβελ με 3 λέξεις) καμία ερώτηση δεν μετρούσε
    // και καμία λέξη δεν ανέβαινε. Τώρα το παράθυρο στενεύει 3 → 2 → 1· σε
    // προπόνηση πάει μόνο αν χρωστάει ΜΟΝΟ τη λέξη που μόλις παίχτηκε.
    for (let k = RECENT - 1; !nonSame.length && k >= 1; k--) {
      nonSame = eligible.filter((x) => !recentWord(session, x.word.id, k));
    }
    if (!nonSame.length && cfg.practice_after_queue_empty) {
      const other = practicePick(pairs, cfg, session, { otherWordOnly: true, nowDate });
      if (other) return other;
    }
    const usePool = nonSame.length ? nonSame : pool.filter((x) => x.word.id !== session.lastWordId).length
      ? pool.filter((x) => x.word.id !== session.lastWordId) : pool;

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
  return practicePick(pairs, cfg, session, { nowDate });
}

// Οι λέξεις των τελευταίων ερωτήσεων (engine: session.recent, η πιο πρόσφατη πρώτη)
const RECENT = 4;
function recentWord(session, wordId, n = RECENT) {
  return (session.recent || [session.lastWordId]).slice(0, n).includes(wordId);
}

function seenToday(target, nowDate) {
  if (!target.lastSeenAt || !nowDate) return false;
  const d = new Date(target.lastSeenAt);
  return d.getFullYear() === nowDate.getFullYear() && d.getMonth() === nowDate.getMonth()
    && d.getDate() === nowDate.getDate();
}

// Προπόνηση: στόχος που έχει ήδη παρουσιαστεί. Με `otherWordOnly` αποκλείεται
// αυστηρά η λέξη που μόλις παίχτηκε (αλλιώς απλώς προτιμάται άλλη).
function practicePick(pairs, cfg, session, { otherWordOnly = false, nowDate = null } = {}) {
  let pool = pairs.filter((x) => x.target.introduced);
  if (otherWordOnly) pool = pool.filter((x) => x.word.id !== session.lastWordId);
  if (!pool.length) return null;

  const cap = cfg.practice_serve_cap_per_session ?? 2;
  const rested = pool.filter((x) => (session.practiceCounts.get(x.target.id) || 0) < cap);
  if (rested.length) pool = rested;
  const nonSame = pool.filter((x) => !recentWord(session, x.word.id));
  if (nonSame.length) pool = nonSame;
  // Ν1: πρώτα λέξεις που ΔΕΝ είδε σήμερα — η προπόνηση δεν ξαναφέρνει τις ίδιες
  const fresh = pool.filter((x) => !seenToday(x.target, nowDate));
  if (fresh.length) pool = fresh;

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
