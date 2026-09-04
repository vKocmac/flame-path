// Οι εχθροί ορίζονται ως ΔΕΔΟΜΕΝΑ, όχι ως κώδικας.
//
// Κανόνας (BRANCH-SCOPE, «Πίνακας αρχετύπων»): ο επόμενος εχθρός πρέπει να
// είναι μία γραμμή σε αυτόν τον πίνακα — ποτέ νέα κλάση, ποτέ αντιγραμμένη
// συνάρτηση σχεδίασης. Ό,τι διαφοροποιεί έναν εχθρό ζει εδώ.
//
//   hp     πόσες ΣΩΣΤΕΣ απαντήσεις χρειάζεται για να πέσει
//   speed  px ανά δευτερόλεπτο προς τον νίντζα. Αργά επίτηδες: στα 18 px/δευτ.
//          ο μπροστινός θέλει ~33 δευτερόλεπτα για να φτάσει, οπότε ένα παιδί
//          που διαβάζει προσεκτικά δεν κινδυνεύει ποτέ. Η πίεση υπάρχει για
//          να δίνει ένταση, όχι για να τιμωρεί την αργή σκέψη.
//   size   κλίμακα σχεδίασης
//   draw   ποια συνάρτηση σχεδίασης της σκηνής χρησιμοποιεί

/** @typedef {{id:string,name:string,hp:number,speed:number,size:number,draw:string}} Archetype */

/** @type {Object<string, Archetype>} */
export const ARCHETYPES = {
  smoke: {
    id: 'smoke',
    name: 'Καπνοδαίμονας',
    hp: 1,
    speed: 18,
    size: 1,
    draw: 'smoke'
  },
  dragon: {
    id: 'dragon',
    name: 'Δράκος',
    hp: 3,          // τρεις ΣΩΣΤΕΣ απαντήσεις — γι' αυτό είναι αφεντικό
    speed: 11,      // αργός και βαρύς
    size: 1.05,
    draw: 'dragon'
  },
  // Γρήγορος και επιθετικός, αλλά πέφτει με μία (HYPER-NOTE §6). Δεν
  // περπατά ομοιόμορφα: μαζεύεται και ορμά — anticipation πριν την επίθεση.
  ninja: {
    id: 'ninja',
    name: 'Σκιερός Νίντζα',
    hp: 1,
    speed: 26,
    size: .92,
    draw: 'ninja'
  },
  // Αργό και βαρύ: τέσσερις σωστές απαντήσεις. Η απειλή του δεν είναι ο
  // χρόνος αλλά ότι δεν φεύγει με τίποτα.
  heavy: {
    id: 'heavy',
    name: 'Βαρύ Τέρας',
    hp: 4,
    speed: 7,
    size: 1,
    draw: 'heavy'
  },
  // Ιδιαίτερη συμπεριφορά: σβήνει και ξαναφαίνεται, και όσο είναι σβηστό
  // τρέχει. Δεν χάνεται ποτέ τελείως — αλλιώς θα ήταν άδικο.
  wraith: {
    id: 'wraith',
    name: 'Σκιά',
    hp: 2,
    speed: 16,
    size: 1,
    draw: 'wraith'
  },
  master: {
    id: 'master',
    name: 'Μάστερ Γου',
    hp: 5,          // το αφεντικό: πέντε σωστές απαντήσεις
    speed: 14,
    size: 1,
    draw: 'master'  // δεν σχεδιάζεται εδώ — είναι η μόνιμη φιγούρα της σκηνής
  }
};

// Κάθε πόσα κύματα κατεβαίνει ο ίδιος ο Μάστερ Γου αντί να στέλνει ορδές.
export const BOSS_EVERY = 3;

// Ο δράκος αλλάζει χρώμα ανά στάδιο — ΠΟΤΕ ροζ/φούξια, μόνο από την
// εγκεκριμένη παλέτα (DESIGN.md). Η φλόγα του παίρνει το ίδιο χρώμα, ώστε
// η αλλαγή σταδίου να γίνεται αντιληπτή μέσα σε ένα δευτερόλεπτο.
// Το `fire` βάφει τη δέσμη και τα μάτια. ΠΡΕΠΕΙ να είναι χρώμα φωτιάς: το
// `parchment` έβγαζε λευκή δέσμη που δεν διαβαζόταν ως φλόγα.
export const DRAGON_STAGES = [
  { name: 'πορτοκαλί', body: 'flame',     fire: 'lantern'   },
  { name: 'σμαραγδί',  body: 'spirit',    fire: 'flame'     },
  { name: 'πυρρό',     body: 'flameDeep', fire: 'lantern'   },
  { name: 'χρυσό',     body: 'lantern',   fire: 'flameDeep' }
];

/**
 * Το στάδιο του δράκου για το τρέχον κύμα (κυκλικά).
 * @param {number} wave 1-based
 */
export function dragonStage(wave) {
  return DRAGON_STAGES[(Math.max(1, wave) - 1) % DRAGON_STAGES.length];
}

// Η κλιμάκωση των κυμάτων (HYPER-NOTE §6): «λίγοι/αργοί στην αρχή →
// περισσότεροι/γρηγορότεροι/διαφορετικοί αργότερα».
//
// Ο ΑΡΙΘΜΟΣ δεν μεγαλώνει: τρεις μορφές είναι το όριο του κάδρου (με
// ENEMY_GAP 124 και SPAWN_X 880 ο τελευταίος κάθεται στο 1128 και ο δράκος
// πιάνει ~115px δεξιά του). Κλιμακώνει λοιπόν η ΣΥΝΘΕΣΗ και η ταχύτητα.
//
// Πρώτο στοιχείο = μπροστινός. Ο δράκος μπαίνει τελευταίος επίτηδες: οι
// αδύναμοι πέφτουν πρώτοι και ο δράκος είναι το φινάλε του κύματος.
const WAVES = [
  ['smoke',  'smoke',  'dragon'],   // μάθε τον μηχανισμό
  ['smoke',  'ninja',  'dragon'],   // πρώτη φορά κάτι γρήγορο
  ['ninja',  'smoke',  'wraith'],   // πρώτη φορά κάτι που σβήνει
  ['ninja',  'ninja',  'dragon'],
  ['smoke',  'wraith', 'heavy'],    // πρώτη φορά κάτι που δεν πέφτει
  ['ninja',  'wraith', 'dragon'],
  ['ninja',  'heavy',  'wraith'],
  ['wraith', 'ninja',  'heavy']     // από εδώ και πέρα μένει εδώ
];

// Πόσα κύματα ΧΩΡΙΣ αφεντικό έχουν περάσει πριν από αυτό.
function waveIndex(wave) {
  const w = Math.max(1, wave);
  return w - Math.floor(w / BOSS_EVERY) - 1;
}

/**
 * Η σύνθεση ενός κύματος.
 * @param {number} wave 1-based
 * @returns {string[]} αρχέτυπα από μπροστά προς τα πίσω
 */
export function waveComposition(wave) {
  return WAVES[Math.min(waveIndex(wave), WAVES.length - 1)];
}

/**
 * Πολλαπλασιαστής ταχύτητας του κύματος. Ανεβαίνει αργά και ΣΤΑΜΑΤΑΕΙ:
 * η πίεση υπάρχει για ένταση, όχι για να τιμωρεί την αργή σκέψη. Στο ταβάνι
 * (×1,4) ο γρηγορότερος εχθρός θέλει ακόμα ~13 δευτερόλεπτα να φτάσει.
 * @param {number} wave 1-based
 */
export function waveSpeed(wave) {
  return Math.min(1 + Math.max(0, waveIndex(wave)) * .05, 1.4);
}

/**
 * @param {string} id
 * @returns {Archetype}
 */
export function archetype(id) {
  return ARCHETYPES[id] || ARCHETYPES.smoke;
}
